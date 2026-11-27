/**
 * Debug HUD — pure core: `?hud=` parsing, the rolling frame-interval buffer and its
 * median, and the human lines / machine-readable data-* attributes of the overlay.
 *
 * architecture.md — runtime diagram ("DOM overlay: … · debug HUD") and delivery rules
 * ("strict CSP, no inline scripts · no third-party scripts; the debug HUD is
 * client-only"). Budget table rows this instruments: "Draw calls ≤ 250 — HUD +
 * Playwright assertion" and "Triangles ≤ 1.0 M — same". The round-11 assertions read
 * the buildHudAttrs() keys (data-tier, data-draws, data-tris, data-frame-ms), never
 * the prose lines. Round 16b extends the contract with data-room, data-hold-ms and
 * data-ledger-bytes (design-staircase.md §8.3 layer 3, §8.4 / DEC-018, §9 gates). Round
 * 18a adds data-stop — the active rail's nearest stop id (§6.1): the e2e contract for the
 * keyboard-reachability gate and the surface the r18b captions read.
 *
 * Host contract (main.ts, not this module): renderer.info.autoReset is false and
 * info.reset() runs once per frame, so calls/triangles are whole-frame aggregates
 * including the shadow pass (§11); the overlay is re-bound at most every 500 ms.
 * No DOM, no three.js, no clock, no storage here — node-testable by construction.
 */
export type HudIssue = 'invalid-hud';
export type HudState = Readonly<{
  tierLabel: string;
  frameDrawCalls: number;
  frameTriangles: number;
  medianFrameMs: number;
  /** Nearest-rank p95 over the trailing ~60 s window (sq-t0-residue R5: the frame arm reads this). */
  p95FrameMs: number;
  /** Active registry node id ('square' or a RoomId); fed by the host, no world import. */
  room: string;
  /** The active rail's nearest stop id (§6.1); '—' while the host has no rail. */
  stop: string;
  /** Effective declared hold of the transit in progress; a reduced-motion cut is 0; idle 0. */
  holdMs: number;
  /** The disposal ledger's total registered bytes (§8.3). */
  ledgerBytes: number;
  /** Where the tier came from: override | stored | det | coarse | memory | probe. */
  tierSource: string;
  /** The probe's sample count; 0 when no probe ran (never a fabricated median). */
  probeSampleCount: number;
}>;
/** Length of the rolling frame-interval buffer (about half a second at 60 Hz). */
export const HUD_FRAME_WINDOW = 32 as const;
/** The p95 window: the trailing ~60 s at the design rate (the ruling's frame bar reads this). */
export const HUD_P95_WINDOW = 3600 as const;
const PARAM = 'hud';
/**
 * Parse `?hud=` from the hash query (the same URLSearchParams that parseTime and the
 * tier module read). Mirrors the tier module's `q` handling: absent or empty → off, no
 * issues; '1' → on; '0' → off; any other value → off plus `invalid-hud`; duplicates →
 * last value wins plus `invalid-hud`. A single issue kind keeps the union honest: the
 * host only needs "the param was malformed", not which way. Deliberately not
 * persisted — the HUD is ephemeral by design and is re-enabled per URL.
 */
export function parseHudParam(
  params: URLSearchParams,
): Readonly<{ enabled: boolean; issues: readonly HudIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: HudIssue[] = values.length > 1 ? ['invalid-hud'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '') return { enabled: false, issues };
  if (last === '1') return { enabled: true, issues };
  if (last === '0') return { enabled: false, issues };
  if (issues.length === 0) issues.push('invalid-hud');
  return { enabled: false, issues };
}
/**
 * Append one frame interval and keep only the newest HUD_FRAME_WINDOW. Deltas that are
 * not a finite positive number are ignored (the first rAF tick after a tab restore
 * reports 0 — a baseline, not an interval); the input array is then returned as is.
 * The input is never mutated.
 */
export function pushFrameInterval(
  prev: readonly number[],
  deltaMs: number,
  windowSize: number = HUD_FRAME_WINDOW,
): readonly number[] {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return prev;
  const next = [...prev, deltaMs];
  return next.length > windowSize ? next.slice(next.length - windowSize) : next;
}
/** Lower median of the buffer — no averaging of the middle pair, no rounding. Empty → 0. */
export function rollingMedianFrameMs(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}
/** Nearest-rank 95th percentile of the buffer. Empty → 0. (sq-t0-residue R5: the p95 arm.) */
export function rollingP95FrameMs(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
}
function integerText(n: number): string {
  return String(Math.trunc(n));
}
/** Two decimals, same rule for the attribute and the prose line: 16.666 → '16.67'. */
function frameMsText(ms: number): string {
  return String(Math.round(ms * 100) / 100);
}
/** Integer digit grouping with plain spaces, like the /notes view: 132264 → '132 264'. */
function grouped(n: number): string {
  const digits = String(Math.trunc(Math.abs(n)));
  const body = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `-${body}` : body;
}
/**
 * Stable machine-readable attributes — the Playwright assertions query these. The keys
 * are the contract: data-tier, data-draws, data-tris, data-frame-ms (round 11, unchanged
 * formatting) plus data-room, data-hold-ms, data-ledger-bytes (round 16b — §8.3 layer 3
 * compares the ledger row to its boot value after the smoke walk, §8.4 / DEC-018 exposes
 * the declared hold so goldens and smoke can see it) and data-stop (round 18a — §6.1's
 * keyboard-reachability gate). Numbers are plain ungrouped integers; the median keeps two
 * decimals; the room id and stop id are passed through as is.
 */
export function buildHudAttrs(state: HudState): Readonly<Record<string, string>> {
  return {
    'data-tier': state.tierLabel,
    'data-draws': integerText(state.frameDrawCalls),
    'data-tris': integerText(state.frameTriangles),
    'data-frame-ms': frameMsText(state.medianFrameMs),
    'data-frame-p95': frameMsText(state.p95FrameMs),
    'data-room': state.room,
    'data-stop': state.stop,
    'data-hold-ms': integerText(state.holdMs),
    'data-ledger-bytes': integerText(state.ledgerBytes),
    'data-tier-source': state.tierSource,
    'data-probe-count': integerText(state.probeSampleCount),
  };
}
/**
 * Exactly four human lines: tier label, grouped draws/tris, fps + median ms, and the
 * round-16b room line (active room · declared hold in ms · grouped ledger bytes; §8.3,
 * §8.4 / DEC-018). fps is derived from the median and reads '—' while no interval has
 * been measured — a frozen or hidden frame must not fake a rate.
 */
export function buildHudLines(state: HudState): readonly string[] {
  const { medianFrameMs } = state;
  const fps = medianFrameMs > 0 ? String(Math.round(1000 / medianFrameMs)) : '—';
  const ledgerLine =
    `room ${state.room} · hold ${integerText(state.holdMs)} ms` +
    ` · ledger ${grouped(state.ledgerBytes)} B`;
  return [
    'tier ' +
      state.tierLabel +
      ' · source ' +
      state.tierSource +
      ' · probe ' +
      integerText(state.probeSampleCount),
    `draws ${grouped(state.frameDrawCalls)} · tris ${grouped(state.frameTriangles)}`,
    `fps ${fps} · ${frameMsText(medianFrameMs)} ms · p95 ${frameMsText(state.p95FrameMs)} ms`,
    ledgerLine,
  ];
}
