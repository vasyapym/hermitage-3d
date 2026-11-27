// tests/world-airlock.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TransitState } from '../src/world/airlock';
import {
  ARRIVE_MS,
  advanceTransit,
  beatProgress,
  beginTransit,
  DEPART_MS,
  finishTransit,
} from '../src/world/airlock';
import type { AirlockDef, Bounds } from '../src/world/registry';

const box: Bounds = { min: [0, 0, 0], max: [1, 1, 1] };
const def: AirlockDef = {
  id: 'gallery-airlock',
  from: 'rastrelli-gallery',
  to: 'jordan',
  portalFrom: box,
  portalTo: box,
  transit: 'doorway',
  holdMs: 900,
  headingFrom: null,
  headingTo: null,
};
const deadEnd: AirlockDef = { ...def, from: 'square', to: null, portalTo: null };
const begin = (from: 'rastrelli-gallery' | null = 'rastrelli-gallery', reducedMotion = false) =>
  beginTransit({ airlock: def, from, reducedMotion, cold: false });
const DT = 100;
const departFrames = DEPART_MS / DT;
const cardFrames = def.holdMs / DT;
const arriveFrames = ARRIVE_MS / DT;
/** Drives n frames; each event is tagged with the phase the frame landed in. */
const drive = (start: TransitState, n: number, ready: boolean) => {
  let state = start;
  const events: string[] = [];
  const phases: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const r = advanceTransit(state, DT, ready);
    state = r.state;
    phases.push(state.phase);
    for (const e of r.events) events.push(`${state.phase}:${e}`);
  }
  return { state, events, phases };
};
const count = (phases: readonly string[], p: string) => phases.filter((x) => x === p).length;

describe('beginTransit', () => {
  it('opens at depart with the card minimum', () => {
    expect(begin()).toMatchObject({
      phase: 'depart',
      holdMs: 900,
      phaseElapsedMs: 0,
      to: 'jordan',
    });
  });
  it('reduced motion forces a cut that opens at card and keeps the minimum dwell', () => {
    expect(begin('rastrelli-gallery', true)).toMatchObject({
      phase: 'card',
      transit: 'cut',
      holdMs: 900,
    });
  });
  it('derives the far side relative to from — one def serves both directions', () => {
    const back = beginTransit({ airlock: def, from: 'jordan', reducedMotion: false, cold: false });
    expect(back).toMatchObject({ to: 'rastrelli-gallery' });
    expect(begin(null)).toMatchObject({ phase: 'card', to: 'jordan', from: null });
  });
  it('a cold jump from a mounted room skips the depart but keeps the from (§6.4)', () => {
    // The index jump IS a deep link: the card opens over the mounted room; the from stays
    // so the exit still fires dispose-from (the specialist draft's activeNode = null would
    // leak the mounted room — the FSM's dispose law keys on from ≠ null).
    const jumped = beginTransit({
      airlock: def,
      from: 'rastrelli-gallery',
      reducedMotion: false,
      cold: true,
    });
    expect(jumped).toMatchObject({ phase: 'card', from: 'rastrelli-gallery', to: 'jordan' });
  });
  it('a cold doorway jump plays card → arrive in full and disposes at the exit (§6.4)', () => {
    const jumped = beginTransit({
      airlock: def,
      from: 'rastrelli-gallery',
      reducedMotion: false,
      cold: true,
    });
    const r = drive(jumped, cardFrames + arriveFrames + 2, true);
    expect(r.phases[0]).toBe('card');
    expect(r.phases).toContain('arrive');
    expect(r.events).toContain('exit:dispose-from');
  });
});

describe('advanceTransit', () => {
  it('accrues elapsed without events', () => {
    const r = advanceTransit(begin(), 100, false);
    expect(r.state).toMatchObject({ phase: 'depart', elapsedMs: 100, phaseElapsedMs: 100 });
    expect(r.events).toEqual([]);
  });
  it('throws on non-finite or negative delta', () => {
    expect(() => advanceTransit(begin(), Number.NaN, false)).toThrow();
    expect(() => advanceTransit(begin(), -1, false)).toThrow();
  });
  it('doorway, data ready early: depart → card (swap at entry) → arrive → exit', () => {
    const r = drive(begin(), departFrames + cardFrames + arriveFrames, true);
    expect(r.state.phase).toBe('exit');
    expect(r.events).toEqual(['card:upload-swap', 'exit:dispose-from']);
    expect(count(r.phases, 'depart')).toBe(departFrames - 1);
    expect(count(r.phases, 'card')).toBe(cardFrames);
    expect(count(r.phases, 'arrive')).toBe(arriveFrames);
  });
  it('data arriving during depart never swaps there nor shortens the depart', () => {
    const early = drive(begin(), 3, true);
    expect(early.state.phase).toBe('depart');
    expect(early.events).toEqual([]);
    const rest = drive(early.state, departFrames - 3, false);
    expect(rest.state).toMatchObject({ phase: 'card', uploaded: true, phaseElapsedMs: 0 });
    expect(rest.events).toEqual(['card:upload-swap']);
  });
  it('data ready late: the card dwells past the minimum, swaps on a card frame, then arrives', () => {
    const dark = drive(begin(), departFrames + 20, false);
    expect(dark.state).toMatchObject({ phase: 'card', phaseElapsedMs: 2000 });
    expect(dark.events).toEqual([]);
    const swap = advanceTransit(dark.state, DT, true);
    expect(swap.state.phase).toBe('card');
    expect(swap.events).toEqual(['upload-swap']);
    const out = advanceTransit(swap.state, DT, true);
    expect(out.state).toMatchObject({ phase: 'arrive', phaseElapsedMs: 0 });
    expect(out.state.phase === 'arrive' && out.state.elapsedMs > def.holdMs).toBe(true);
  });
  it('data never ready: the card holds, no events', () => {
    const r = drive(begin(), departFrames + 60, false);
    expect(r.state.phase).toBe('card');
    expect(r.events).toEqual([]);
  });
  it('cut: no depart, no arrive, the card minimum still dwells', () => {
    const r = drive(begin('rastrelli-gallery', true), cardFrames, true);
    expect(r.state.phase).toBe('exit');
    expect(r.events).toEqual(['card:upload-swap', 'exit:dispose-from']);
    expect(count(r.phases, 'arrive') + count(r.phases, 'depart')).toBe(0);
  });
  it('cold entry: card → arrive → exit without dispose-from', () => {
    const r = drive(begin(null), cardFrames + arriveFrames, true);
    expect(r.state.phase).toBe('exit');
    expect(r.events).toEqual(['card:upload-swap']);
    expect(count(r.phases, 'arrive')).toBe(arriveFrames);
  });
  it('dead end (to: null): depart → card → exit, no arrive', () => {
    const start = beginTransit({
      airlock: deadEnd,
      from: 'square',
      reducedMotion: false,
      cold: false,
    });
    expect(start).toMatchObject({ phase: 'depart', to: null });
    const r = drive(start, departFrames + cardFrames, true);
    expect(r.state.phase).toBe('exit');
    expect(count(r.phases, 'arrive')).toBe(0);
    expect(r.events).toEqual(['card:upload-swap', 'exit:dispose-from']);
  });
  it('is deterministic over the same delta sequence', () => {
    const run = () => {
      const a = drive(begin(), 10, false);
      const b = drive(a.state, 20, true);
      return { phases: [...a.phases, ...b.phases], state: b.state, events: b.events };
    };
    expect(run()).toEqual(run());
  });
  it('exit is terminal in place', () => {
    const exit = drive(begin(), departFrames + cardFrames + arriveFrames, true).state;
    const again = advanceTransit(exit, 500, true);
    expect(again.state).toBe(exit);
    expect(again.events).toEqual([]);
  });
  it('beatProgress is the phase ratio', () => {
    const d = advanceTransit(begin(), DEPART_MS / 2, false).state;
    expect(d.phase === 'depart' && beatProgress(d)).toBe(0.5);
  });
});

describe('finishTransit', () => {
  it('exit → idle; every beat phase throws', () => {
    const exit = drive(begin(), departFrames + cardFrames + arriveFrames, true).state;
    expect(finishTransit(exit)).toEqual({ phase: 'idle' });
    expect(finishTransit({ phase: 'idle' })).toEqual({ phase: 'idle' });
    expect(() => finishTransit(begin())).toThrow();
    expect(() => finishTransit(begin(null))).toThrow();
    expect(() => finishTransit(drive(begin(null), cardFrames, true).state)).toThrow();
  });
});

describe('purity', () => {
  it.each(['airlock', 'threshold-beat'])(
    '%s imports no three/node, touches no host globals',
    (m) => {
      const src = readFileSync(new URL(`../src/world/${m}.ts`, import.meta.url), 'utf8');
      expect(src).not.toMatch(/from\s+['"]three/);
      expect(src).not.toMatch(/from\s+['"]node:/);
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/`(?:\\.|[^`\\])*`/g, '``');
      expect(stripped).not.toMatch(
        /\b(document|window|localStorage|performance|Date|setTimeout)\b/,
      );
      expect(stripped).not.toMatch(/Math\.random|\bfetch\b/);
    },
  );
});
