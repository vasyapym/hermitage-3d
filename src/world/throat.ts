// src/world/throat.ts
/**
 * The throat law — docs/design-walkthrough-ux.md §3 «the gate composition» (the resident
 * throat), §9 «Approach», §11 (≤ ~500 triangles, zero textures), §12 R-UX3; D2 (warm far light).
 * Pure numbers: the vault profile, the depth stations, the vertex-colour grading (linear RGB —
 * the renderer's working space) and the void the massing leaves for it. The three.js builder
 * (src/procedural/throat.ts) only turns these into buffers.
 * Frame: world metres; the mouth on the portal front (z 93.5), inward is −z, x centred on the
 * middle arch. The profile MEETS the committed kit envelope: it sits just outside the
 * portal-arch ring's inner edge (r 2.25 at springing 7.25) so a dark reveal band reads between
 * ring and vault; the void clears the throat by 0.25 m so no pier face is coplanar with a wall.
 * Grading: the sky-lit run darkens with depth as an authored occlusion whose e-fold is the
 * passage's first third and whose floor is a tenth of the mouth (the hemisphere is
 * directionless, so depth is written into the albedo; the stone never reaches black — a
 * passage is read by its gradient); the lamp run carries the slab's warmth to the seam as a
 * toe and rises to the slab's last-metre fall — the seam is cool stone crossing into warm
 * light, never a step into black. The mouth keeps the kit's stone; the exposure E(h) is the eye.
 */
export type Pt = readonly [number, number];
export type Rgb = readonly [number, number, number];
export const THROAT = {
  mouthZ: 93.5,
  halfWidth: 2.35,
  springY: 7.2, // crown = springY + halfWidth = 9.55
  depthM: 29.5, // far wall at z 64.0 — the passage's north end is 63.5
  arcSegments: 10,
  floorLiftM: 0.02, // above the square's ground plane: no coplanar fight
  collarSetbackM: 0.02, // the mouth collar sits just behind the ring's back face
} as const;
/** The rectangle the massing leaves open (src/main.ts piers + lintel); the collar fills it. */
export const THROAT_VOID = { halfWidth: 2.6, topY: 9.75 } as const;
export const THROAT_TRIANGLE_CEILING = 500;
/** Depth stations in from the mouth: the sky-lit run, then the lamp-lit run (shared seam). */
export const LAMP_REACH_M = 20;
export const LIT_STATIONS_M: readonly number[] = [0, 0.6, 1.5, 3, 5, 8, 12, 16, LAMP_REACH_M];
export const LAMP_STATIONS_M: readonly number[] = [LAMP_REACH_M, 23, 26, 28.5, THROAT.depthM];
const STONE_ALBEDO: Rgb = [0.22, 0.21, 0.19];
const LAMP_WARM: Rgb = [1, 0.55, 0.22];
export const COLLAR_RGB: Rgb = [0.017, 0.019, 0.024]; // the kit's recess dark, linear
export const LAMP_SLAB_RADIANCE = 1.6; // mild HDR; AgX rolls it off, E(h) scales it
const AO_MOUTH = 0.83; // the mouth sum stays 0.93: the committed kit stone at d = 0
const AO_FALL_M = 9; // the e-fold is the passage's first third — the fall reads across the run
const AO_FLOOR = 0.1; // the deep stone keeps a tenth of the mouth (0.022 albedo)
const GLOW_END = 0.35; // the lamp's fall on the last metres of vault, relative to the slab
const GLOW_TOE = 0.04; // the lamp's toe at the seam, relative to the slab
const GLOW_GAMMA = 1.4; // the warmth reaches forward
const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export function throatProfile(): readonly Pt[] {
  const { halfWidth: hw, springY, arcSegments } = THROAT;
  const pts: Pt[] = [[-hw, 0]];
  for (let i = 0; i <= arcSegments; i++) {
    const a = Math.PI - (Math.PI * i) / arcSegments;
    pts.push([hw * Math.cos(a), springY + hw * Math.sin(a)]);
  }
  pts.push([hw, 0]);
  return pts;
}
/** Albedo of the sky-lit run at depth d: stone, occluded toward the middle. */
export function skyLitAlbedo(d: number): Rgb {
  if (!Number.isFinite(d) || d < 0) throw new RangeError(`throat: depth must be ≥ 0, got ${d}`);
  return scale(STONE_ALBEDO, AO_MOUTH * Math.exp(-d / AO_FALL_M) + AO_FLOOR);
}
/** Radiance of the lamp-lit run at depth d: a faint warm toe at the seam, rising to the slab. */
export function lampRadiance(d: number): Rgb {
  if (!Number.isFinite(d) || d < 0) throw new RangeError(`throat: depth must be ≥ 0, got ${d}`);
  const t = clamp01((d - LAMP_REACH_M) / (THROAT.depthM - LAMP_REACH_M));
  return scale(
    LAMP_WARM,
    LAMP_SLAB_RADIANCE * (GLOW_TOE + (GLOW_END - GLOW_TOE) * t ** GLOW_GAMMA),
  );
}
export const lampSlab = (): Rgb => scale(LAMP_WARM, LAMP_SLAB_RADIANCE);
/** The lamp's forward spill on the sky-lit run, relative to the slab: the toe carried back to
 * the mouth with the passage's own length as the e-fold. Absolute radiance — it reads at
 * E(h)→0 where the albedo×hemisphere body collapses; gated at runtime (× wNight). */
export const lampSpill = (d: number): number =>
  GLOW_TOE * Math.exp((d - LAMP_REACH_M) / THROAT.depthM);
/** Exact triangle count the builder must produce (strips + end fan + collar polygon). */
export function throatTriangleEstimate(): number {
  const n = throatProfile().length;
  const strips = (s: readonly number[]): number => (s.length - 1) * (n - 1 + 1) * 2;
  return strips(LIT_STATIONS_M) + strips(LAMP_STATIONS_M) + (n - 2) + (n + 4 - 2);
}
