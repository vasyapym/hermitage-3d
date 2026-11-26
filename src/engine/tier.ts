/**
 * Quality tiers — registry, `?q=` override parsing and boot-probe classification.
 *
 * Pure module (node-testable): no three.js, no DOM, no storage, no clock. The host
 * (main.ts) owns the rAF probe window, the renderer surfaces, persistence and hashchange;
 * this file only decides.
 *
 * See docs/architecture.md → Tiers (T0 low · T1 default · T2 discrete GPU; ~1 s GPU
 * microbenchmark plus heuristics; `?q=` override, persisted) and
 * docs/design-mobile-tier.md §3 (the R17-A amendment: coarse pointer or reported memory
 * below 4 GiB settles T0 BEFORE any probe; the §11 numbers stay the ladder's law) and
 * docs/design-sky-time.md §11 (designated-device gate: no MSAA, DPR ≤ 1, drawing buffer
 * ≤ 1,048,576 px, fit larger viewports by render scale, chosen before arrival). T1 sits
 * exactly on the §11 numbers; T2 relaxes them upward, T0 tightens them downward. In
 * deterministic mode the host skips the probe (tier from `?q=`, else persisted, else T1).
 */
export type QualityTierId = 't0' | 't1' | 't2';
export type QualityTier = Readonly<{
  id: QualityTierId;
  label: string;
  /** Upper bound on the renderer pixel ratio (render scale per css pixel). */
  dprCap: number;
  /** Upper bound on drawing-buffer area in device pixels; bounds scale² · cssW · cssH. */
  bufferPixelsCap: number;
  /** Edge length of the square shadow map for the single sun light. */
  shadowMapSize: number;
  /** Phase 1 renders exactly one shadow pass; 0 is reserved for a future shadowless floor. */
  shadowPasses: 0 | 1;
  /** Phase 1 has no post stack (bloom is Phase 2 machinery); T2's "full post" is reserved. */
  postEnabled: false;
  description: string;
}>;
export const DEFAULT_TIER_ID = 't1' satisfies QualityTierId;
export const TIERS: Readonly<Record<QualityTierId, QualityTier>> = Object.freeze({
  t0: Object.freeze({
    id: 't0',
    label: 'T0 · low',
    dprCap: 1,
    bufferPixelsCap: 786432,
    // sq-shadow-dirt R2: the rows below t1 stay 1024 — R1 kills their acne either way.
    shadowMapSize: 1024,
    shadowPasses: 1,
    postEnabled: false,
    description:
      'Hard floor (≤ 33 ms). Tightens the §11 drawing buffer to 786,432 px (1024×768-' +
      'equivalent): at 1920×1080 the render scale is ≈0.616 against T1’s ≈0.711. Shadow ' +
      'stays 1 K because Phase 1 has one 1 K pass already; no post exists to disable. ' +
      'Near-LOD instancing is a kit concern, not a renderer knob here.',
  } satisfies QualityTier),
  t1: Object.freeze({
    id: 't1',
    label: 'T1 · default',
    dprCap: 1,
    bufferPixelsCap: 1048576,
    // sq-shadow-dirt R2: 2048 (12.7 cm/texel on the fit — the relief's 2-texel floor). The
    // §11 16.7 ms goal gates this row (the acceptance battery measures; revert to 1024 on
    // failure).
    shadowMapSize: 2048,
    shadowPasses: 1,
    postEnabled: false,
    description:
      'The §11 designated-device gate verbatim: no MSAA, pixel ratio ≤ 1, drawing buffer ' +
      '≤ 1,048,576 px, larger viewports fitted by render scale. Goal on the reference ' +
      'MacBook Pro 2017 (Iris Plus 640) at 16.7 ms where achievable.',
  } satisfies QualityTier),
  t2: Object.freeze({
    id: 't2',
    label: 'T2 · discrete GPU',
    dprCap: 2,
    bufferPixelsCap: 4194304,
    // sq-shadow-dirt R2: the row above t1 carries 4096 (67 MB depth texture, higher tiers only).
    shadowMapSize: 4096,
    shadowPasses: 1,
    postEnabled: false,
    description:
      'Relaxes §11 upward: pixel ratio ≤ 2, drawing buffer ≤ 4,194,304 px, 2 K sun shadow. ' +
      '“Full post” is reserved for Phase 2; postEnabled stays false until a post stack ' +
      'exists.',
  } satisfies QualityTier),
});
/**
 * §11 fit generalized to a tier: scale = min(dprCap, sqrt(bufferPixelsCap / (w · h))).
 * The host applies the result via renderer.setPixelRatio before the massing fade.
 */
export function resolveQualityScale(
  tier: QualityTier,
  cssWidth: number,
  cssHeight: number,
): number {
  assertPositiveFinite(cssWidth, 'cssWidth');
  assertPositiveFinite(cssHeight, 'cssHeight');
  const areaScale = Math.sqrt(tier.bufferPixelsCap / (cssWidth * cssHeight));
  return Math.min(tier.dprCap, areaScale);
}
/**
 * Boot microbenchmark spec. The host samples rAF frame intervals for ~windowMs while only
 * the sky renders at T2 surfaces; this module classifies the lower median of the samples.
 * Two warmup frames absorb the slow first rAF plus any first-compile jank before the
 * median window starts.
 */
export const BENCHMARK = {
  windowMs: 850,
  warmupFrames: 2,
  minFrames: 6,
  t2Ms: 17.5,
  t1Ms: 30,
} as const;
/**
 * Capabilities the host reads once at boot. deviceMemoryGiB comes from the
 * Device Memory API where exposed (Chromium), null elsewhere. Deliberately the only
 * heuristic this round: hardwareConcurrency would misgrade the 2-core reference device.
 */
export type ProbeCapabilities = Readonly<{ deviceMemoryGiB: number | null }>;
export type ProbeResult = Readonly<{
  tier: QualityTierId;
  medianMs: number;
  sampleCount: number;
}>;
export function classifyProbe(
  frameIntervalsMs: readonly number[],
  capabilities: ProbeCapabilities = { deviceMemoryGiB: null },
): ProbeResult {
  frameIntervalsMs.forEach((ms, index) => {
    assertPositiveFinite(ms, `frameIntervalsMs[${index}]`);
  });
  const samples = frameIntervalsMs.slice(BENCHMARK.warmupFrames);
  const lowMemory = capabilities.deviceMemoryGiB !== null && capabilities.deviceMemoryGiB < 4;
  // The memory cap is a device fact, independent of probe length, so it also guards the
  // too-short-probe path (specialist's flagged deviation, accepted).
  if (samples.length < BENCHMARK.minFrames) {
    return {
      tier: lowMemory ? 't0' : DEFAULT_TIER_ID,
      medianMs: 0,
      sampleCount: samples.length,
    };
  }
  const medianMs = lowerMedian(samples);
  const measured: QualityTierId =
    medianMs <= BENCHMARK.t2Ms ? 't2' : medianMs <= BENCHMARK.t1Ms ? 't1' : 't0';
  return { tier: lowMemory ? 't0' : measured, medianMs, sampleCount: samples.length };
}
export type QualityIssue = 'invalid-q' | 'duplicate-q';
export type QualityUpdate = Readonly<{
  tier: QualityTierId | 'auto';
  issues: readonly QualityIssue[];
}>;
const Q_ALIASES: ReadonlyMap<string, QualityTierId | 'auto'> = new Map([
  ['auto', 'auto'],
  ['t0', 't0'],
  ['0', 't0'],
  ['t1', 't1'],
  ['1', 't1'],
  ['t2', 't2'],
  ['2', 't2'],
]);
/**
 * `?q=` semantics. Accepts auto | t0 | 0 | t1 | 1 | t2 | 2 (case-insensitive). Absent or
 * empty → auto. Several `q` params → duplicate-q, the last one wins (a value appended by
 * hand should beat a stale one). Unknown text → invalid-q and auto. Persistence is the
 * host's client-only concern.
 */
export function parseQualityUpdate(params: URLSearchParams): QualityUpdate {
  const values = params.getAll('q');
  const issues: QualityIssue[] = [];
  if (values.length === 0) {
    return { tier: 'auto', issues };
  }
  if (values.length > 1) {
    issues.push('duplicate-q');
  }
  const raw = (values[values.length - 1] ?? '').trim().toLowerCase();
  if (raw === '') {
    return { tier: 'auto', issues };
  }
  const tier = Q_ALIASES.get(raw);
  if (tier === undefined) {
    issues.push('invalid-q');
    return { tier: 'auto', issues };
  }
  return { tier, issues };
}
function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number, got ${String(value)}`);
  }
}
/** Lower middle for even lengths — no averaging, no rounding. */
function lowerMedian(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  // Callers guarantee a non-empty set; the fallback only satisfies noUncheckedIndexedAccess.
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}

export const MOBILE_AUTO_TIER = 't0' satisfies QualityTierId;
export const AUTO_LOW_MEMORY_GIB = 4;
export const MOBILE_COARSE_QUERY = '(any-pointer: coarse)';

/**
 * The R17-A conservative automatic choice (docs/design-mobile-tier.md §3): a coarse
 * pointer OR reported memory below 4 GiB settles T0 BEFORE any probe; everything else
 * runs the existing T2-surface probe. Injected facts only — this module never reads
 * matchMedia (the host does, once at boot). Exactly 4.0 and null are NOT low.
 */
export function resolveAutoTier(
  capabilities: Readonly<{ deviceMemoryGiB: number | null; coarsePointer: boolean }>,
): QualityTierId | 'probe' {
  const { deviceMemoryGiB, coarsePointer } = capabilities;
  return coarsePointer || (deviceMemoryGiB !== null && deviceMemoryGiB < AUTO_LOW_MEMORY_GIB)
    ? MOBILE_AUTO_TIER
    : 'probe';
}
