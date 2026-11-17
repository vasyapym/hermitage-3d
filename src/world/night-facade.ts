/*
 * Night facade — the pure level law behind the palace window lattice.
 *
 * Implements DEC-019 (night windows) and ROADMAP Phase 2b. The driving weight is the frozen
 * §8 contract of design-sky-time.md: callers pass `lightmapWeights(elev).nightChandeliers`
 * in as `wNight`; this module never re-derives it.
 *
 * Pure by contract: no three, no DOM (regex-scanned, node Vitest). Meshes live in
 * src/procedural/night-lattice.ts; the hemisphere light stays with the host.
 *
 * Laws, stated once:
 *   levelOf(id)                   deterministic hash of a placement id into one of 3 levels
 *   paneIntensity(level, w)       === K_LEVEL[level] * w, exactly
 *   latticeVisible(w)             === w > 0 (w === 0 leaves day/dusk pixel-identical)
 *   warmGround(current, tint, w)  per-channel lerp of current toward tint by w
 */
export type PaneLevel = 'dark' | 'dim' | 'bright';
export const PANE_LEVELS = ['dark', 'dim', 'bright'] as const satisfies readonly PaneLevel[];
export const PANE_LEVEL_COUNT: number = PANE_LEVELS.length;
export type LevelSplit = Readonly<Record<PaneLevel, number>>;
/** TUNING TARGET (DEC-019): share of panes per level, split over the unit hash; sums to 1. */
export const LEVEL_SPLIT = { dark: 0.34, dim: 0.41, bright: 0.25 } as const satisfies LevelSplit;
/** TUNING TARGET (DEC-019): emissive intensity of a bright pane at wNight === 1. */
export const PEAK_EMISSIVE_INTENSITY = 2.5;
/** TUNING TARGET (DEC-019): dim panes as a fraction of the peak. */
export const DIM_GAIN = 0.35;
/** kLevel multipliers of the intensity identity. Dark is 0 by law: it never lights. */
export const K_LEVEL = {
  dark: 0,
  dim: PEAK_EMISSIVE_INTENSITY * DIM_GAIN,
  bright: PEAK_EMISSIVE_INTENSITY,
} as const satisfies Readonly<Record<PaneLevel, number>>;
export type LinearRgb = readonly [r: number, g: number, b: number];
/**
 * TUNING TARGET (DEC-019): the one warm tint shared by dim and bright panes and by the ground
 * warm-up. Linear channels, chandelier-matched by eye against the night golden.
 */
export const WINDOW_WARM_LINEAR = [1, 0.58, 0.24] as const satisfies LinearRgb;
/** TUNING TARGET (DEC-019): pane stand-off in front of the recess panel face, kit units. */
export const PANE_STANDOFF = 0.01;
/**
 * TUNING TARGET (the facade-shadow round, 2026-11-17): the dark pane's albedo. The dark
 * cards used to read the recess's near-black (RECESS_HEX) and printed as impossible
 * «shadows of lamps which don't exist» on the hemisphere's warm-lit wall band (the
 * owner's IMG_4688 sighting). The unlit window now reads as the wall's dressing at half
 * the response — NEUTRAL albedo on purpose: the warm hue comes from the light (the same
 * that warms the wall), so the card cannot out-salience the wall at equal luminance.
 * Linear channels, like WINDOW_WARM_LINEAR. Measured ratio card/wall ≈ 0.5.
 */
export const DARK_PANE_TONE: LinearRgb = [0.37, 0.36, 0.35];
export const SURROUND_PART_PREFIX = 'surround-';
export function isSurroundPartId(partId: string): boolean {
  return partId.startsWith(SURROUND_PART_PREFIX);
}
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const TWO_POW_32 = 0x100000000;
/** FNV-1a over UTF-16 code units: no Math.random, stable across runs and restarts. */
export function hashKey(key: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < key.length; i += 1) {
    h = Math.imul(h ^ key.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return h;
}
/** hashKey mapped onto [0, 1). */
export function unitHash(key: string): number {
  return hashKey(key) / TWO_POW_32;
}
export function levelOf(key: string): PaneLevel {
  const u = unitHash(key);
  if (u < LEVEL_SPLIT.dark) {
    return 'dark';
  }
  if (u < LEVEL_SPLIT.dark + LEVEL_SPLIT.dim) {
    return 'dim';
  }
  return 'bright';
}
export function paneIntensity(level: PaneLevel, wNight: number): number {
  return K_LEVEL[level] * wNight;
}
export function latticeVisible(wNight: number): boolean {
  return wNight > 0;
}
/** Endpoint-exact lerp: t === 0 returns a and t === 1 returns b, bit for bit. */
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}
export function warmGround(current: LinearRgb, tint: LinearRgb, wNight: number): LinearRgb {
  return [
    lerp(current[0], tint[0], wNight),
    lerp(current[1], tint[1], wNight),
    lerp(current[2], tint[2], wNight),
  ];
}
