/**
 * R12 — the ground-snow look (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 *
 * The pure half: constants and the TS twins of the GLSL laws. No three, no DOM,
 * no clock, no randomness — this file is regex-scanned by tests/ground-snow.test.ts.
 *
 * The laws, stated once (x, z = world metres):
 *   laneCentreX(z) = the square rail's XZ line at clamp(z, S1.z, S0.z) — outside the span
 *                    (south of S0; the gate and courtyard north of S1) the clamped end's x
 *   lane(x, z)     = 1 - smoothstep(coreHalfM, edgeHalfM, |x - laneCentreX(z)|)
 *   trampleField(x, z) = BASE + (1 - BASE) * lane(x, z)  in [BASE, 1]
 *   snowRgb(x, z)  = mix(FRESH, TRAMPLED, trampleField(x, z))
 *   groundSnowAlbedo(x, z, wSnow, asphalt) = mix(asphalt, snowRgb(x, z), wSnow)
 *   snowBounceGround(h, wSnow) = lerp3(0.25 * h, h * GROUND_BOUNCE_LINEAR, wSnow)
 */
import type { LinearRgb } from './night-facade';
import { SNOW_ALBEDO_LINEAR } from './snow-season';

/** Fresh snow albedo — the SAME array reference the season law publishes, never a copy. */
export const GROUND_SNOW_FRESH_LINEAR = SNOW_ALBEDO_LINEAR;

/** Aged, packed, urban snow — what the lane grinds fresh snow down to. */
export const GROUND_SNOW_TRAMPLED_LINEAR: LinearRgb = [0.38, 0.39, 0.41];

/** 0–1: the trample floor away from the lane. Nothing on the ground is pristine. */
export const GROUND_TRAMPLE_BASE = 0.3;

/** The walked lane, in metres across its centre line: solid to coreHalfM, gone by edgeHalfM. */
export const GROUND_LANE = { coreHalfM: 10, edgeHalfM: 22 } satisfies Readonly<{
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

/**
 * The GLSL bicubic smoothstep: t*t*(3 - 2t) on a clamped t.
 * NOT the repo's quintic `smootherstep` — that is a different curve and using it
 * here would silently disagree with the compiled shader.
 */
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
