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
  /** Receiver lookup offset along the surface normal (three.js LightShadow.normalBias). */
  readonly shadowNormalBias: number;
  /** PCF sampling-kernel radius in shadow-map texels (three.js LightShadow.radius). */
  readonly shadowRadius: number;
  /** Caster slope offset (the shared depth material's polygonOffsetFactor) applied per settle. */
  readonly shadowDepthOffsetFactor: number;
  /** The sun receiver's sampling variant (sq-t0-residue R4): stock PCF, the B-spline comparison filter, or + the plane correction. */
  readonly sunReceiverMode: 'stock' | 'smooth' | 'plane';
  /** Phase 1 renders exactly one shadow pass; 0 = the shadowless floor (R3 shipped it on t0; R4 reverted — the shadows stay on mobile). */
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
    // sq-shadow-dirt R2/F8: the owner's iPhone settles t0 — the creative's row mandates its
    // 2048 (the relief shadows at 25 cm/texel smeared into dirt-looking collars on the phone;
    // the reference-Mac acceptance run carried the numbers).
    // iPhone-11 device-backend ruling (sq-fix-improve R1): shadowNormalBias 0.1 / shadowRadius
    // 0.5 on t0 only; t1/t2 carry 0.05/1 to keep the Mac bit-identical.
    // sq-t0-residue R2: the caster slope offset must cover the PCF kernel's reach (~2 texels at
    // radius 0.5) — the grazing beat read as wide blotches + close grain on the phone.
    shadowMapSize: 2048,
    shadowNormalBias: 0.1,
    // sq-t0-residue R4 (brief 33, the arms' verdict): the radius spends on the lookup — the
    // R2 offset ladder (1.4/2.0/2.6 at radius 0.5) measured indistinguishable on the A13, the
    // blotch dies with shadows off and the close-up edges read as the map's texel staircase;
    // the receiver variant (sunReceiverMode) takes the quality from here.
    shadowRadius: 1,
    shadowDepthOffsetFactor: 1.4,
    // sq-t0-residue R3 revert: the shadows stay on mobile (the owner: «this feels like giving
    // up») — the pass renders again and the receiver variant takes the quality from here.
    shadowPasses: 1,
    // sq-t0-residue R4: the sun receiver variant — the 3x3 B-spline comparison filter with the
    // receiver-plane depth correction per tap (capped ±0.25 m along the light).
    sunReceiverMode: 'plane',
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
    shadowNormalBias: 0.05,
    shadowRadius: 1,
    // sq-t0-residue R2: the Mac rows keep the shadow-dirt factor bit-identical (1.4).
    shadowDepthOffsetFactor: 1.4,
    sunReceiverMode: 'stock',
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
    shadowNormalBias: 0.05,
    shadowRadius: 1,
    shadowDepthOffsetFactor: 1.4,
    sunReceiverMode: 'stock',
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
