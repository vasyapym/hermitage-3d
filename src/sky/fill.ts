// src/sky/fill.ts
/**
 * sq-arch-day B1b — the hemisphere fill laws (the sun:fill ratio, the fill's shape and its
 * season ground class), extending DEC-035/041/043's fill behaviour with an E(h)-blended day
 * state. The night law is BIT-EXACT today's: every day term blends by the day factor E(h) —
 * the §8 day lightmap weight (lightmapWeights(elevation).day: exactly 0 at night and dusk,
 * 1.0 from +10°, ≈ 0.9 at the dec-noon h 6.6°) — so the night state vector (sun intensity,
 * hemi colours, hemi intensity) is unchanged by construction and the dusk rows hold.
 *
 * Laws, stated once (z/h = the §7 palette zenith/horizon; day = E(h)):
 *   fillZenithWeight(day)   = 0.25 + 0.35·day — night 0.25/0.75 as committed, day 0.60/0.40
 *                             (the Q3 pick: lum 0.39, the bluish shade)
 *   fillSkyColor(z, h, day) = w·z + (1−w)·h, w = fillZenithWeight(day) — UN-K'd: the winter
 *                             sky gain (DEC-043's snowSkyGain) multiplies the dome lookup and
 *                             the pane reflection only, never the fill (the Q9 pick)
 *   fillIntensity(day)      = 1 + (FILL_DAY_GAIN − 1)·day, FILL_DAY_GAIN = 4.5 (the Brief-5
 *                             pick: the shade:lit ≈ 1/6 law on a south white at june noon)
 *   fillGroundColor(cur, albedo, day) = per-channel lerp(cur, albedo, day): the committed
 *                             warmGround path at night, 0.5·seasonAlbedo at full day
 *   groundHalfAlbedo(wSnow) = mix(FILL_GROUND_HALF_ASPHALT, FILL_GROUND_HALF_SNOW, wSnow)
 *                             — HALF the ground's own albedo (june asphalt 0x3f3f3f linear
 *                             ≈ 0.0508 → the declared [0.025] triple; DEC-033's snow × 0.5)
 *
 * Pure: no three, no DOM, no clock (the ground-snow precedent; node Vitest).
 */
import type { Rgb3 } from '../content/sky-time';
import type { LinearRgb } from '../world/night-facade';

/** The night zenith weight — the committed fill split, bit-exact at E(h) = 0. */
export const FILL_ZENITH_NIGHT = 0.25;
/** The day gain over the night weight: 0.25 + 0.35 = 0.60/0.40 at full day (the Q3 pick). */
export const FILL_ZENITH_GAIN = 0.35;
/** FILL_DAY_GAIN = 4.5 (the Brief-5 pick; was 11, the Q2 pick): the day fill intensity —
 * shade:lit ≈ 1/6 at june noon by the Q2 law's scaling. The probed ladder 11 → 7.5 → 4.5
 * measured the june facade darkQ 98–109 → 90–101 → 82–93 and the dec off-lane snow 0.92–0.94
 * at every step. */
export const FILL_DAY_GAIN = 4.5;
/** Half the june asphalt albedo (0x3f3f3f → linear ≈ 0.0508, halved, rounded as declared). */
export const FILL_GROUND_HALF_ASPHALT: LinearRgb = [0.025, 0.025, 0.025];
/** Half the season snow albedo (DEC-033's SNOW_ALBEDO_LINEAR × 0.5): the dec fill ground. */
export const FILL_GROUND_HALF_SNOW: LinearRgb = [0.41, 0.43, 0.46];

/** Endpoint-exact lerp: t === 0 returns a, t === 1 returns b, bit for bit. */
const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

/** FILL_W_ZENITH(t) = 0.25 + 0.35·E(h) — the DEC-019-era split at E = 0, bit for bit. */
export function fillZenithWeight(day: number): number {
  return FILL_ZENITH_NIGHT + FILL_ZENITH_GAIN * day;
}

/** The hemisphere's sky colour: w·zenith + (1−w)·horizon — the un-K'd fill, by law. */
export function fillSkyColor(zenith: Rgb3, horizon: Rgb3, day: number): LinearRgb {
  const w = fillZenithWeight(day);
  const k = 1 - w;
  return [
    w * zenith[0] + k * horizon[0],
    w * zenith[1] + k * horizon[1],
    w * zenith[2] + k * horizon[2],
  ];
}

/** The fill's intensity: 1 + (FILL_DAY_GAIN − 1)·E(h) — 1.00 at night, 4.5 at full day. */
export function fillIntensity(day: number): number {
  return 1 + (FILL_DAY_GAIN - 1) * day;
}

/** The season ground albedo's half: the june asphalt ↔ the dec snow, blended by wSnow. */
export function groundHalfAlbedo(wSnow: number): LinearRgb {
  return [
    lerp(FILL_GROUND_HALF_ASPHALT[0], FILL_GROUND_HALF_SNOW[0], wSnow),
    lerp(FILL_GROUND_HALF_ASPHALT[1], FILL_GROUND_HALF_SNOW[1], wSnow),
    lerp(FILL_GROUND_HALF_ASPHALT[2], FILL_GROUND_HALF_SNOW[2], wSnow),
  ];
}

/** The hemisphere's ground colour: today's warmGround result at night (E = 0, bit for bit),
 * 0.5·seasonAlbedo at full day — the per-channel endpoint-exact lerp. */
export function fillGroundColor(
  current: LinearRgb,
  seasonAlbedo: LinearRgb,
  day: number,
): LinearRgb {
  return [
    lerp(current[0], seasonAlbedo[0], day),
    lerp(current[1], seasonAlbedo[1], day),
    lerp(current[2], seasonAlbedo[2], day),
  ];
}
