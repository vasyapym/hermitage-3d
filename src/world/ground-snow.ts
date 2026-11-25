/**
 * R12 — the ground-snow look (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 * The winter-square round re-declares the constants (2026-11 draw, the P1–P4 battery):
 * the lane is a narrow walked PATH, the trampled tone reads packed snow, and the off-lane
 * trample floor drops to 0.1 — the tests and the GLSL twins follow the same constants.
 *
 * sq-arch-day B3 (the Q7/Q8 picks + the deltas' shared-noise path): the winter snow gains
 * the DRIFT octave (the albedo's [DRIFT_MIN, 1] modulation — DRIFT_MIN 0.50, the display-domain
 * restatement) and the june ground gains its day class — the macro octave (the winter drift's
 * shared value-noise path sampled at (6 m, ±6 %)), the cobble detail's 60→12 m distance fade,
 * and the DEC-041/043 lane's day law (the delta × LANE_DAY_CONTRAST 0.5 with a 0.35 m feather).
 * EVERY day term blends by E(h) and is the IDENTITY at E = 0 — the night/dusk/white-night
 * ground stays bit-exact today's; the drift is additionally gated by the existing uSnow mix,
 * so out-of-season frames are untouched by it exactly. Extends DEC-035/041/043.
 *
 * The pure half: constants and the TS twins of the GLSL laws. No three, no DOM,
 * no clock, no randomness — this file is regex-scanned by tests/ground-snow.test.ts.
 *
 * The laws, stated once (x, z = world metres; day = E(h) = the §8 day weight):
 *   laneCentreX(z) = the square rail's XZ line at clamp(z, S1.z, S0.z) — outside the span
 *                    (south of S0; the gate and courtyard north of S1) the clamped end's x
 *   lane(x, z)     = 1 - smoothstep(coreHalfM, edgeHalfM + LANE_DAY_FEATHER_M·day,
 *                                    |x - laneCentreX(z)|)
 *   trampleField(x, z) = BASE + (1 - BASE) * lane(x, z) · (1 + (LANE_DAY_CONTRAST−1)·day)
 *                    in [BASE, 1]; at day = 0 exactly the committed law
 *   snowRgb(x, z)  = mix(FRESH, TRAMPLED, trampleField(x, z))
 *                    · mix(1, mix(1, drift(x, z), 1 − lane(x, z)), day) — the drift gates
 *                    OFF-lane (the review's P1: it cannot refill the cleared lane)
 *   drift(x, z)    = DRIFT_MIN + (1 − DRIFT_MIN)·n2(p), n2 = A.amp·value(p/A.scale)
 *                    + B.amp·value(p/B.scale) — snow season only (inside the uSnow mix)
 *   groundSnowAlbedo(x, z, wSnow, asphalt) = mix(asphalt, snowRgb(x, z), wSnow)
 *   snowBounceGround(h, wSnow) = lerp3(0.25 * h, h * GROUND_BOUNCE_LINEAR, wSnow)
 */
import type { LinearRgb } from './night-facade';
import { SNOW_ALBEDO_LINEAR } from './snow-season';

/** Fresh snow albedo — the SAME array reference the season law publishes, never a copy. */
export const GROUND_SNOW_FRESH_LINEAR = SNOW_ALBEDO_LINEAR;

/** Aged, packed, urban snow — what the lane grinds fresh snow down to.
 * The winter-square round's re-declaration (the dec-noon P1–P4 battery): packed clean
 * snow reads well above the old slush — the path is trodden, not dirty. */
export const GROUND_SNOW_TRAMPLED_LINEAR: LinearRgb = [0.55, 0.56, 0.58];

/** 0–1: the trample floor away from the lane. Nothing on the ground is pristine,
 * but the field stays near-fresh: the old 0.3 capped every whiteness at 0.69 albedo,
 * the single largest surface in the boot frame (battery P2 proved the light, not this,
 * is the remaining bound — the DEC-041 class-I sky grant carries it). */
export const GROUND_TRAMPLE_BASE = 0.1;

/** The walked lane, in metres across its centre line: solid to coreHalfM, gone by edgeHalfM.
 * Re-declared a narrow PATH (the P1 reads: the old ±10/±22 m lane sat under the camera at
 * every stop — the whole foreground read trampled). A walked path on a snowed square is a
 * few metres wide: ±2.5 m solid, gone by 7 m (±7.1°/±19.3° at 20 m vs the frame's ±42.8°). */
export const GROUND_LANE = { coreHalfM: 2.5, edgeHalfM: 7 } satisfies Readonly<{
  coreHalfM: number;
  edgeHalfM: number;
}>;

/**
 * The lane's centre line — the square rail's XZ line (DEC-037), restated from
 * src/camera/square-rail.ts (near = S1 on the gate axis, far = S0) and pinned equal to it
 * by tests/ground-snow.test.ts.
 */
export const GROUND_LANE_LINE = {
  nearX: 0,
  nearZ: 124,
  farX: -24,
  farZ: 230,
} satisfies Readonly<{
  nearX: number;
  nearZ: number;
  farX: number;
  farZ: number;
}>;

/** The hemisphere bounce tint under full snow — snow throws light back up. */
export const GROUND_BOUNCE_LINEAR: LinearRgb = [0.5, 0.52, 0.56];

// --- sq-arch-day B3: the drift octave, the june macro octave, the day lane law ---------------

/** The winter drift floor (the Q8 pick, the display-domain restatement): the snow albedo's
 * modulation floor — band ≈ 177–204 sRGB on the AgX shoulder, r3 ≈ 0.93. */
export const GROUND_DRIFT_MIN = 0.5;
/** The drift's two octaves: n2 = a.amp·value(p/a.scaleM) + b.amp·value(p/b.scaleM) — 3–8 m
 * drifts plus scatter; the amps sum to 1 so n2 ∈ [0, 1] and the factor ∈ [DRIFT_MIN, 1]. */
export const GROUND_DRIFT_OCTAVES = {
  a: { scaleM: 5.5, amp: 0.8 },
  b: { scaleM: 1.2, amp: 0.2 },
} as const satisfies Readonly<{
  a: { scaleM: number; amp: number };
  b: { scaleM: number; amp: number };
}>;
/** The june macro octave — the SAME shared hash value-noise, sampled at (6 m, ±6 %):
 * the albedo × (1 + (value − 0.5)·2·amp). */
export const GROUND_MACRO_OCTAVE = { scaleM: 6, amp: 0.06 } as const satisfies Readonly<{
  scaleM: number;
  amp: number;
}>;
/** The cobble detail's distance fade (the Q7 pick's june pair): full detail to DETAIL_NEAR,
 * gone by DETAIL_FAR — smoothstep(nearM, farM, dist), 1 − it, × E(h). */
export const GROUND_DETAIL_FADE = { nearM: 12, farM: 60 } as const satisfies Readonly<{
  nearM: number;
  farM: number;
}>;
/** The day lane law (the Q7 pick): the lane's trample delta × 0.5 at full day. */
export const LANE_DAY_CONTRAST = 0.5;
/** The day lane law's edge feather: the falloff widens by 0.35 m at full day. */
export const LANE_DAY_FEATHER_M = 0.35;

/** The GLSL bicubic smoothstep: t*t*(3 - 2t) on a clamped t.
 * NOT the repo's quintic `smootherstep` — that is a different curve and using it
 * here would silently disagree with the compiled shader. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Endpoint-exact lerp: t === 0 returns a, t === 1 returns b, bit for bit. */
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function lerp3(a: LinearRgb, b: LinearRgb, t: number): LinearRgb {
  const [a0, a1, a2] = a;
  const [b0, b1, b2] = b;
  return [lerp(a0, b0, t), lerp(a1, b1, t), lerp(a2, b2, t)];
}

/** The rail line's x at z, clamped to the S1..S0 span — GLSL clamp order, operation for operation. */
export function laneCentreX(z: number): number {
  const { nearX, nearZ, farX, farZ } = GROUND_LANE_LINE;
  const zc = Math.min(Math.max(z, nearZ), farZ);
  return nearX + (farX - nearX) * ((zc - nearZ) / (farZ - nearZ));
}

/** lane(x, z) = 1 - smoothstep(coreHalfM, edgeHalfM, |x - laneCentreX(z)|) — 1 in the lane. */
export function laneValue(x: number, z: number): number {
  return 1 - smoothstep(GROUND_LANE.coreHalfM, GROUND_LANE.edgeHalfM, Math.abs(x - laneCentreX(z)));
}

/** trampleField(x, z) = BASE + (1 - BASE) * lane(x, z): 1 in the lane, BASE far from it. */
export function trampleField(x: number, z: number): number {
  return GROUND_TRAMPLE_BASE + (1 - GROUND_TRAMPLE_BASE) * laneValue(x, z);
}

/**
 * The TS twin of the fragment's final mix:
 *   snowRgb = mix(FRESH, TRAMPLED, trampleField(x, z))
 *   result  = mix(asphalt, snowRgb, wSnow)
 * At wSnow = 0 this returns `asphalt` bit for bit.
 */
export function groundSnowAlbedo(
  x: number,
  z: number,
  wSnow: number,
  asphalt: LinearRgb,
): LinearRgb {
  const snowRgb = lerp3(GROUND_SNOW_FRESH_LINEAR, GROUND_SNOW_TRAMPLED_LINEAR, trampleField(x, z));
  return lerp3(asphalt, snowRgb, wSnow);
}

// --- sq-arch-day B3: the shared hash value-noise and the day-class twins ---------------------

/** The GLSL fract: x − floor(x). */
const fract = (x: number): number => x - Math.floor(x);

/**
 * The TS twin of the GLSL hash `gsHash`: mod 1024 wrap (period 123 m), the sin·43758.5453
 * lattice hash. The GPU's sin is not the JS sin bit for bit — the twin pins the LAW (the
 * [0, 1) range and the cell structure), never the exact sample values.
 */
export function gsHash(x: number, y: number): number {
  const px = x - 1024 * Math.floor(x / 1024);
  const py = y - 1024 * Math.floor(y / 1024);
  return fract(Math.sin(px * 127.1 + py * 311.7) * 43758.5453);
}

/** The TS twin of the shared GLSL `gsNoise`: one bilinear hash value-noise — the ONE function
 * the drift octaves and the june macro octave both sample, at their (scale, amp) pairs. */
export function gsNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let ux = x - ix;
  let uy = y - iy;
  ux = ux * ux * (3 - 2 * ux);
  uy = uy * uy * (3 - 2 * uy);
  const a = gsHash(ix, iy);
  const b = gsHash(ix + 1, iy);
  const c = gsHash(ix, iy + 1);
  const d = gsHash(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** The winter drift's n2: 0.8·value(p/5.5 m) + 0.2·value(p/1.2 m) — the (scale, amp) pairs of
 * GROUND_DRIFT_OCTAVES. In [0, 1] by construction (the amps sum to 1). */
export function driftNoise(x: number, z: number): number {
  const { a, b } = GROUND_DRIFT_OCTAVES;
  return a.amp * gsNoise(x / a.scaleM, z / a.scaleM) + b.amp * gsNoise(x / b.scaleM, z / b.scaleM);
}

/** The drift's albedo factor: DRIFT_MIN + (1 − DRIFT_MIN)·n2 ∈ [DRIFT_MIN, 1]. */
export function driftFactor(n2: number): number {
  return GROUND_DRIFT_MIN + (1 - GROUND_DRIFT_MIN) * n2;
}

/**
 * The drift's factor as the fragment composes it: `mix(1, mix(1, drift, 1 − lane), day)` —
 * the drift gates OFF-lane (the review's P1 ordering: it cannot refill the cleared lane),
 * then blends by day. The identity (1.0) at day = 0 and exactly 1 in the lane core;
 * off-lane at day = 1 it is driftFactor(driftNoise(x, z)) bit for bit.
 */
export function driftLaneDay(x: number, z: number, day: number): number {
  const drift = driftFactor(driftNoise(x, z));
  const offLane = lerp(1, drift, 1 - laneValueDay(x, z, day));
  return lerp(1, offLane, day);
}

/** The june macro octave's factor: 1 + (value(p/6 m) − 0.5)·2·0.06 — the albedo's ±6 %. */
export function macroFactor(x: number, z: number): number {
  const { scaleM, amp } = GROUND_MACRO_OCTAVE;
  return 1 + (gsNoise(x / scaleM, z / scaleM) - 0.5) * 2 * amp;
}

/** The cobble detail's distance fade: 1 − smoothstep(12, 60, dist) — 1 near, 0 far. */
export function detailFade(dist: number): number {
  return 1 - smoothstep(GROUND_DETAIL_FADE.nearM, GROUND_DETAIL_FADE.farM, dist);
}

/** The lane at day: the falloff edge widens by LANE_DAY_FEATHER_M·day; at day = 0 the
 * committed lane law, bit for bit. */
export function laneValueDay(x: number, z: number, day: number): number {
  const edge = GROUND_LANE.edgeHalfM + LANE_DAY_FEATHER_M * day;
  return 1 - smoothstep(GROUND_LANE.coreHalfM, edge, Math.abs(x - laneCentreX(z)));
}

/** The trample field at day: the lane's excess over the base scales by
 * 1 + (LANE_DAY_CONTRAST − 1)·day (the delta × 0.5 at full day); at day = 0 the committed
 * law, bit for bit. */
export function trampleFieldDay(x: number, z: number, day: number): number {
  const lane = laneValueDay(x, z, day);
  const scale = 1 + (LANE_DAY_CONTRAST - 1) * day;
  return GROUND_TRAMPLE_BASE + (1 - GROUND_TRAMPLE_BASE) * lane * scale;
}

/**
 * The hemisphere ground bounce: 0.25 * h out of season, h * GROUND_BOUNCE_LINEAR under
 * full snow. At wSnow = 0 this returns 0.25 * h bit for bit.
 */
export function snowBounceGround(h: LinearRgb, wSnow: number): LinearRgb {
  const [h0, h1, h2] = h;
  const [b0, b1, b2] = GROUND_BOUNCE_LINEAR;
  const dry: LinearRgb = [0.25 * h0, 0.25 * h1, 0.25 * h2];
  const wet: LinearRgb = [h0 * b0, h1 * b1, h2 * b2];
  return lerp3(dry, wet, wSnow);
}
