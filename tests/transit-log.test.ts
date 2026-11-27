// tests/transit-log.test.ts
/**
 * The per-phase transit timing split — docs/design-walkthrough-ux.md §9 (Threshold), §12
 * R-UX6. Drives the real FSM (src/world/airlock.ts) at a fixed frame and checks the ledger:
 * rows + exit frame sum to the frames advanced, one begin + one summary line, the data/swap/
 * lit stamps, skipped phases under 'cut' / cold entry / dead end, the once-only stall, and
 * the module's purity (the canonical fence: comments and literals stripped, then no three,
 * no node:, no DOM/storage/clock/timer/randomness/console).
 */
import { describe, expect, it } from 'vitest';
import {
  LINE_PREFIX,
  noteTransitFrame,
  openTransitLog,
  type PhaseRow,
  STALL_MS,
  type TransitLog,
} from '../src/perf/transit-log';
import type { TransitState } from '../src/world/airlock';
import { ARRIVE_MS, advanceTransit, beginTransit, DEPART_MS } from '../src/world/airlock';
import type { AirlockDef, NodeHandle } from '../src/world/registry';

const DOORWAY: AirlockDef = {
  id: 'arch-portal',
  from: 'square',
  to: 'rastrelli-gallery',
  portalFrom: { min: [-3, 0, 86.5], max: [3, 6, 88.5] },
  portalTo: { min: [-3, 0, 85.5], max: [3, 3.6, 87.5] },
  transit: 'doorway',
  holdMs: 300,
  headingFrom: null,
  headingTo: null,
};
const DEAD_END: AirlockDef = {
  id: 'landing-airlock',
  from: 'jordan',
  to: null,
  portalFrom: { min: [81, 10, -80], max: [84, 13.5, -77] },
  portalTo: null,
  transit: 'cut',
  holdMs: 600,
  headingFrom: null,
  headingTo: null,
};
const FRAME_MS = 16;
const SPIKE_MS = 120;
const T0 = 1000;
type Plan = Readonly<{
  airlock: AirlockDef;
  from: NodeHandle | null;
  reducedMotion: boolean;
  /** The frame index from which the host reports ready; 0 = ready at begin; null = never. */
  readyAtFrame: number | null;
  maxFrames: number;
  spikeAt: number | null;
}>;
type Run = Readonly<{
  log: TransitLog;
  lines: readonly string[];
  advanced: number;
  exited: boolean;
}>;
const WARM: Plan = {
  airlock: DOORWAY,
  from: 'square',
  reducedMotion: false,
  readyAtFrame: 0,
  maxFrames: 500,
  spikeAt: null,
};
function drive(plan: Plan): Run {
  const begun = beginTransit({
    airlock: plan.airlock,
    from: plan.from,
    reducedMotion: plan.reducedMotion,
    cold: false,
  });
  const opened = openTransitLog(begun, {
    nowMs: T0,
    ready: plan.readyAtFrame === 0,
    leanAtFireM: 0.35,
  });
  let log = opened.log;
  const lines: string[] = [opened.line];
  let state: TransitState = begun;
  let now = T0;
  for (let i = 1; i <= plan.maxFrames; i += 1) {
    const deltaMs = i === plan.spikeAt ? SPIKE_MS : FRAME_MS;
    now += deltaMs;
    const ready = plan.readyAtFrame !== null && i >= plan.readyAtFrame;
    const advance = advanceTransit(state, deltaMs, ready);
    state = advance.state;
    const costs = {
      swapCostMs: advance.events.includes('upload-swap') ? 12.5 : null,
      disposeCostMs: advance.events.includes('dispose-from') ? 3 : null,
    };
    const noted = noteTransitFrame(log, advance, { deltaMs, nowMs: now, ready, costs });
    log = noted.log;
    lines.push(...noted.lines);
    if (state.phase === 'exit') return { log, lines, advanced: i, exited: true };
  }
  return { log, lines, advanced: plan.maxFrames, exited: false };
}
const phases = (run: Run): readonly string[] => run.log.rows.map((r) => r.phase);
const rowOf = (run: Run, phase: string): PhaseRow | undefined =>
  run.log.rows.find((r) => r.phase === phase);
const sumFrames = (run: Run): number => run.log.rows.reduce((s, r) => s + r.frames, 0);
const sumWall = (run: Run): number => run.log.rows.reduce((s, r) => s + r.wallMs, 0);
describe('transit-log: the warm doorway transit', () => {
  const run = drive(WARM);
  it('prints exactly one begin line and one summary line', () => {
    expect(run.exited).toBe(true);
    expect(run.lines).toHaveLength(2);
    expect(run.lines[0]).toBe(
      `${LINE_PREFIX} begin arch-portal square→rastrelli-gallery doorway · hold 300 ms · ` +
        `ready-at-begin yes · lean 0.350 m · t ${T0}`,
    );
    expect(run.lines[1]?.startsWith(`${LINE_PREFIX} arch-portal square→rastrelli-gallery `)).toBe(
      true,
    );
    expect(run.lines[1]).toContain('data at-begin');
    expect(run.lines[1]).toContain('dispose 3.0 ms');
    expect(run.lines[1]).toContain(`exit ${FRAME_MS}.0 ms`);
  });
  it('walks depart → card → arrive and the rows + exit frame sum to the frames advanced', () => {
    expect(phases(run)).toEqual(['depart', 'card', 'arrive']);
    expect(sumFrames(run) + 1).toBe(run.advanced);
    expect(sumWall(run)).toBe((run.advanced - 1) * FRAME_MS);
    expect(run.log.frames).toBe(run.advanced);
  });
  it('prints each row against its nominal: a glide row reads at most one frame short', () => {
    const depart = rowOf(run, 'depart');
    const card = rowOf(run, 'card');
    const arrive = rowOf(run, 'arrive');
    expect(depart?.wallMs).toBeLessThan(DEPART_MS);
    expect(depart?.wallMs).toBeGreaterThanOrEqual(DEPART_MS - FRAME_MS);
    expect(card?.wallMs).toBeGreaterThanOrEqual(DOORWAY.holdMs - FRAME_MS);
    // The glide always plays in full — but the crossing frame renders the NEXT phase, so the
    // arrive row's rendered-frame sum sits one frame short of ARRIVE_MS (the exit carry).
    expect(arrive?.wallMs).toBeGreaterThanOrEqual(ARRIVE_MS - FRAME_MS);
    expect(run.lines[1]).toContain(`/${DEPART_MS} ms`);
    expect(run.lines[1]).toContain(`/${DOORWAY.holdMs} ms`);
    expect(run.lines[1]).toContain(`/${ARRIVE_MS} ms`);
  });
  it('stamps data at begin, the swap with its cost and the post-swap frame, the dispose', () => {
    expect(run.log.dataReadyMs).toBe(0);
    expect(run.log.swapMs).not.toBeNull();
    expect(run.log.swapCostMs).toBe(12.5);
    expect(run.log.postSwapDeltaMs).toBe(FRAME_MS);
    expect(run.log.disposeCostMs).toBe(3);
  });
  it('stamps the first lit frame on the card→arrive frame, host clock', () => {
    const depart = rowOf(run, 'depart');
    const card = rowOf(run, 'card');
    const litIndex = (depart?.frames ?? 0) + (card?.frames ?? 0) + 1;
    expect(run.log.litAtMs).toBe(T0 + litIndex * FRAME_MS);
    expect(run.lines[1]).toContain(`lit t ${T0 + litIndex * FRAME_MS}`);
  });
});
describe('transit-log: a cold card', () => {
  const run = drive({ ...WARM, readyAtFrame: 100 });
  it('stamps data latency and the swap on the first ready card frame, FSM clock', () => {
    expect(run.log.dataReadyMs).toBe(100 * FRAME_MS);
    expect(run.log.swapMs).toBe(100 * FRAME_MS);
    expect(rowOf(run, 'card')?.wallMs).toBeGreaterThan(DOORWAY.holdMs);
    expect(run.lines).toHaveLength(2);
    expect(run.lines[1]).toContain(`data +${(100 * FRAME_MS).toFixed(1)} ms`);
  });
});
describe('transit-log: a hung card', () => {
  const run = drive({ ...WARM, readyAtFrame: null, maxFrames: 400 });
  it('emits the stall line exactly once and never a summary', () => {
    expect(run.exited).toBe(false);
    expect(run.lines).toHaveLength(2);
    expect(run.lines[1]?.startsWith(`${LINE_PREFIX} stall arch-portal `)).toBe(true);
    expect(run.lines[1]).toContain('data pending');
    expect(run.log.stalled).toBe(true);
    expect(run.log.open.wallMs).toBeGreaterThanOrEqual(STALL_MS);
  });
});
describe('transit-log: skipped phases', () => {
  it('reduced motion: a single card row, depart and arrive skipped, lit on the exit frame', () => {
    const run = drive({ ...WARM, reducedMotion: true });
    expect(phases(run)).toEqual(['card']);
    expect(run.lines[1]).toContain('depart skipped');
    expect(run.lines[1]).toContain('arrive skipped');
    expect(run.lines[1]).toContain(' cut · ');
    expect(run.log.litAtMs).toBe(T0 + run.advanced * FRAME_MS);
  });
  it('cold entry: no depart, no dispose', () => {
    const run = drive({ ...WARM, from: null });
    expect(run.lines[0]).toContain('null→rastrelli-gallery');
    expect(phases(run)).toEqual(['card', 'arrive']);
    expect(run.log.disposeCostMs).toBeNull();
    expect(run.lines[1]).toContain('dispose none');
  });
  it('dead end under cut: the card alone, held to its dwell, the from disposed', () => {
    const run = drive({ ...WARM, airlock: DEAD_END, from: 'jordan' });
    expect(phases(run)).toEqual(['card']);
    expect(rowOf(run, 'card')?.wallMs).toBeGreaterThanOrEqual(DEAD_END.holdMs - FRAME_MS);
    expect(run.lines[1]).toContain('landing-airlock jordan→null cut');
    expect(run.log.disposeCostMs).toBe(3);
  });
});
describe('transit-log: the spike', () => {
  it('attributes the max frame to the phase it rendered', () => {
    const run = drive({ ...WARM, spikeAt: 50 });
    expect(run.log.maxDeltaMs).toBe(SPIKE_MS);
    expect(run.log.maxDeltaPhase).toBe('card');
    expect(rowOf(run, 'card')?.maxDeltaMs).toBe(SPIKE_MS);
    expect(run.lines[1]).toContain(`max ${SPIKE_MS}.0 ms @card`);
  });
});
describe('transit-log: edges', () => {
  it('an idle advance is a no-op', () => {
    const { log } = openTransitLog(
      beginTransit({ airlock: DOORWAY, from: 'square', reducedMotion: false, cold: false }),
      { nowMs: T0, ready: false, leanAtFireM: 0 },
    );
    const noted = noteTransitFrame(
      log,
      { state: { phase: 'idle' }, events: [] },
      {
        deltaMs: FRAME_MS,
        nowMs: T0,
        ready: false,
        costs: { swapCostMs: null, disposeCostMs: null },
      },
    );
    expect(noted.log).toBe(log);
    expect(noted.lines).toEqual([]);
  });
  it('throws on malformed clocks', () => {
    const begun = beginTransit({
      airlock: DOORWAY,
      from: 'square',
      reducedMotion: false,
      cold: false,
    });
    expect(() =>
      openTransitLog(begun, { nowMs: Number.NaN, ready: false, leanAtFireM: 0 }),
    ).toThrow(RangeError);
    const { log } = openTransitLog(begun, { nowMs: T0, ready: false, leanAtFireM: 0 });
    const advance = advanceTransit(begun, FRAME_MS, false);
    expect(() =>
      noteTransitFrame(log, advance, {
        deltaMs: -1,
        nowMs: T0,
        ready: false,
        costs: { swapCostMs: null, disposeCostMs: null },
      }),
    ).toThrow(RangeError);
  });
});
describe('transit-log: purity (the canonical fence)', () => {
  const sources = import.meta.glob('../src/perf/transit-log.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
