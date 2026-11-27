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
 * ring and vault; the void clears the throat by 0.10 m so no pier face is coplanar with a wall.
 * sq-arch-day B5 (the Q10 pick — the CONCENTRIC arch): springY moves 7.2 → 7.25 so vault,
 * void and kit ring share one centre (0, 7.25); the void becomes the ARCH (halfWidth 2.45 =
 * radius 2.45, crown 9.70) and the massing head (src/main.ts) is ONE arch-topped piece; the
 * ring margins read vault→ring-inner 0.10, void→vault 0.10, void→ring-outer 0.30.
 * Grading (B5b): the sky-lit run's tone is the piecewise-smoothstep knot law
 * [[0, 1.0], [7, 0.2], [21, 0.3], [29.5, 1.0]] in depth from the mouth — far-end light, the
 * seam cool stone crossing into the lamp's warm run, the recession kept by the knots (the
 * hemisphere is directionless, so depth is written into the albedo); the lamp run carries the
 * slab's warmth to the seam as a toe and rises to the slab's last-metre fall. The mouth keeps
 * the kit's stone; the exposure E(h) is the eye.
 * The 2026-11-28 doorway ruling (brief 1), Decision B — the main doorway's night read: the
 * night gain (the fraction of the day radiance kept at wNight 1) is authored in the vertex
 * ALPHA of the lamp mesh — the far wall's rings (FAR_WALL_RINGS), the lamp run's linear fall
 * (LAMP_RUN_END_GAIN), the floors halved (FLOOR_NIGHT_GAIN) — and the spill's mouth fades to
 * exactly 0 (SPILL_MOUTH_FADE_M). The lamp shader multiplies the gain into its rgb at night.
 */
export type Pt = readonly [number, number];
export type Rgb = readonly [number, number, number];
export const THROAT = {
  mouthZ: 93.5,
  halfWidth: 2.35,
  springY: 7.25, // crown = springY + halfWidth = 9.60 — concentric with the void and the ring
  depthM: 29.5, // far wall at z 64.0 — the passage's north end is 63.5
  arcSegments: 10,
  floorLiftM: 0.02, // above the square's ground plane: no coplanar fight
  collarSetbackM: 0.02, // the mouth collar sits just behind the ring's back face
} as const;
/**
 * sq-arch-day B5 (the Q10 pick): the void the massing leaves open is the ARCH — concentric
 * with the vault (r 2.35) and the kit's portal-arch ring (inner r 2.25, outer 2.75, both about
 * (0, springY)): halfWidth = radius = 2.45, crown 9.70; the margins vault→ring-inner 0.10,
 * void→vault 0.10, void→ring-outer 0.30. The collar is the void − vault = the 0.10 ring
 * (the collar tone stays 0.017 — the Q12 pick). KIT_PORTAL_BOX (src/world/square-kit.ts) clears
 * the ring: ±2.75 × 10.0.
 */
export const THROAT_VOID = {
  halfWidth: 2.45,
  springY: 7.25,
  radius: 2.45,
  crownY: 9.7,
} as const satisfies Readonly<{
  halfWidth: number;
  springY: number;
  radius: number;
  crownY: number;
}>;
export const THROAT_TRIANGLE_CEILING = 500;
/** Depth stations in from the mouth: the sky-lit run, then the lamp-lit run (shared seam). */
export const LAMP_REACH_M = 20;
export const LIT_STATIONS_M: readonly number[] = [0, 0.6, 1.5, 3, 5, 8, 12, 16, LAMP_REACH_M];
export const LAMP_STATIONS_M: readonly number[] = [LAMP_REACH_M, 23, 26, 28.5, THROAT.depthM];
/**
 * The 2026-11-28 doorway ruling (brief 1) — the night laws:
 * - FAR_WALL_RINGS: the far wall is RINGS of the vault profile scaled about (0, 0) at the far
 *   depth — each entry [scale, night gain]; strips between consecutive rings, a fan inside
 *   the last. Scaling about the origin keeps the floor line; the core (scale 0.4) is 1.88 m
 *   wide with its crown at 3.84 m, standing on the floor.
 * - LAMP_RUN_END_GAIN: the lamp run's night gain is linear in t = (d − 20)/9.5 — 1.0 at the
 *   seam, 0.15 at the far end; the floor rows take the same gain × FLOOR_NIGHT_GAIN.
 * - SPILL_MOUTH_FADE_M: the spill's mouth fade — exactly 0 at the mouth, the pre-fade curve
 *   unchanged from 5 m inward (the seam's 0.04 kept).
 */
export const FAR_WALL_RINGS: readonly (readonly [number, number])[] = [
  [1.0, 0.05],
  [0.7, 0.2],
  [0.4, 0.7],
] as const;
export const LAMP_RUN_END_GAIN = 0.15;
export const FLOOR_NIGHT_GAIN = 0.5;
export const SPILL_MOUTH_FADE_M = 5;
const STONE_ALBEDO: Rgb = [0.22, 0.21, 0.19];
const LAMP_WARM: Rgb = [1, 0.55, 0.22];
export const COLLAR_RGB: Rgb = [0.017, 0.019, 0.024]; // the kit's recess dark, linear
export const LAMP_SLAB_RADIANCE = 1.6; // mild HDR; AgX rolls it off, E(h) scales it
const GLOW_END = 0.35; // the lamp's fall on the last metres of vault, relative to the slab
const GLOW_TOE = 0.04; // the lamp's toe at the seam, relative to the slab
const GLOW_GAMMA = 1.4; // the warmth reaches forward
const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/**
 * sq-arch-day B5b — the depth grade's knots: [depth m from the mouth, tone factor].
 * The sky-lit run's multiplier: 1.0 at the mouth, a 0.2 trough by 7 m, a 0.3 rise by 21 m and
 * 1.0 at the far end (29.5) — the recession's authored occlusion, far-end light (R-UX3).
 */
export const THROAT_TONE_KNOTS: readonly (readonly [number, number])[] = [
  [0, 1.0],
  [7, 0.2],
  [21, 0.3],
  [29.5, 1.0],
] as const;
/** The GLSL bicubic smoothstep: t²(3 − 2t) on a clamped t — the knot law's own easing. */
const smoothTone = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
/** The tone factor at depth d: piecewise-smoothstep through THROAT_TONE_KNOTS, clamped at the
 * ends, endpoint-exact at every knot. */
export function throatToneAt(d: number): number {
  if (!Number.isFinite(d)) throw new RangeError(`throat: depth must be finite, got ${d}`);
  const first = THROAT_TONE_KNOTS[0];
  const last = THROAT_TONE_KNOTS[THROAT_TONE_KNOTS.length - 1];
  if (first === undefined || last === undefined) throw new Error('throat: tone knots missing');
  if (d <= first[0]) return first[1];
  for (let i = 1; i < THROAT_TONE_KNOTS.length; i++) {
    const here = THROAT_TONE_KNOTS[i];
    const before = THROAT_TONE_KNOTS[i - 1];
    if (here === undefined || before === undefined) {
      throw new Error('throat: tone knots missing');
    }
    if (d <= here[0]) {
      const span = here[0] - before[0];
      return before[1] + (here[1] - before[1]) * smoothTone((d - before[0]) / span);
    }
  }
  return last[1];
}
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
/**
 * sq-arch-day B5: the void's outline as a point list — the arch (halfWidth = radius 2.45 about
 * (0, springY), crown 9.70) at the throat's own arcSegments discretization. The collar builds
 * from this minus the vault profile; src/main.ts's ONE Shape head uses the same arc.
 */
export function throatVoidOutline(): readonly Pt[] {
  const { halfWidth, springY, radius } = THROAT_VOID;
  const pts: Pt[] = [[-halfWidth, 0]];
  for (let i = 0; i <= THROAT.arcSegments; i++) {
    const a = Math.PI - (Math.PI * i) / THROAT.arcSegments;
    pts.push([radius * Math.cos(a), springY + radius * Math.sin(a)]);
  }
  pts.push([halfWidth, 0]);
  return pts;
}
/** Albedo of the sky-lit run at depth d: stone × the B5b knot tone (the recession's authored
 * occlusion — the trough keeps the passage read, the far end stays lit). */
export function skyLitAlbedo(d: number): Rgb {
  if (!Number.isFinite(d) || d < 0) throw new RangeError(`throat: depth must be ≥ 0, got ${d}`);
  return scale(STONE_ALBEDO, throatToneAt(d));
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
/** The lamp run's night gain (the 2026-11-28 doorway ruling, brief 1): linear in t from 1.0
 * at the seam to LAMP_RUN_END_GAIN at the far wall — the fraction of the day radiance the
 * lamp run keeps at wNight 1, riding the vertex alpha into the shader's rgb multiplier. */
export const lampRunNightGain = (d: number): number => {
  if (!Number.isFinite(d) || d < 0) throw new RangeError(`throat: depth must be ≥ 0, got ${d}`);
  const t = clamp01((d - LAMP_REACH_M) / (THROAT.depthM - LAMP_REACH_M));
  return 1 + (LAMP_RUN_END_GAIN - 1) * t;
};
/** The lamp's forward spill on the sky-lit run, relative to the slab: the toe carried back to
 * the mouth with the passage's own length as the e-fold, × the mouth fade (the 2026-11-28
 * doorway ruling): exactly 0 at the mouth, the pre-fade curve unchanged from 5 m inward (the
 * seam's 0.04 kept). Absolute radiance — it reads at E(h)→0 where the albedo×hemisphere body
 * collapses; gated at runtime (× wNight). */
export const lampSpill = (d: number): number =>
  GLOW_TOE * Math.exp((d - LAMP_REACH_M) / THROAT.depthM) * smoothTone(d / SPILL_MOUTH_FADE_M);
/**
 * sq-arch-day B5: the massing head's solid test — inside the pavilion's rectangle
 * (±massHalfWidth, 0..massTopY) minus the arch opening (THROAT_VOID): the old rectangular
 * void's shoulders are now solid, the arch above the spring is open. main.ts builds the head
 * from the same law (ONE Shape, extruded).
 */
export function headSolidAt(
  x: number,
  y: number,
  massHalfWidth: number,
  massTopY: number,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError('throat: head coordinates must be finite');
  }
  if (Math.abs(x) > massHalfWidth || y < 0 || y > massTopY) return false;
  const { halfWidth, springY, radius } = THROAT_VOID;
  if (Math.abs(x) <= halfWidth && (y <= springY || Math.hypot(x, y - springY) < radius)) {
    return false;
  }
  return true;
}
/** Exact triangle count the builder must produce (strips + the far-wall rings + the collar). */
export function throatTriangleEstimate(): number {
  const n = throatProfile().length;
  const strips = (s: readonly number[]): number => (s.length - 1) * (n - 1 + 1) * 2;
  // The far wall (the 2026-11-28 doorway ruling): RINGS of the vault profile scaled about
  // (0, 0) — a strip between each consecutive pair of rings, 2(n−1) triangles each, and a
  // fan of n − 2 inside the innermost ring.
  const ringStrips = (FAR_WALL_RINGS.length - 1) * 2 * (n - 1);
  // The collar (sq-arch-day B5): the arch outline (n points) minus the vault profile (n
  // points) — a 2n-vertex simple polygon, earcut gives 2n − 2 triangles.
  return strips(LIT_STATIONS_M) + strips(LAMP_STATIONS_M) + ringStrips + (n - 2) + (2 * n - 2);
}
