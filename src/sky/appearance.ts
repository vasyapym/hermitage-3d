// Sky appearance — design-sky-time.md §7: palette, elevation shaping, and the
// sun-direction vectors the shader consumes. Pure; no three.js objects.

import { PALETTE } from '../content/sky-time';
import { clamp01, mixRgb, RAD, smootherstep } from './easing';
import { exposureForElevation } from './exposure';
import type { LightmapWeights } from './lightmap-weights';
import { lightmapWeights, sunLightIntensity } from './lightmap-weights';
import type { SolarPosition } from './solar';
import { assertSupportedEpoch, solarPosition } from './solar';

export type Vec3 = readonly [number, number, number];
export type LinearRgb = readonly [number, number, number];

export type Atmosphere = Readonly<{
  zenithRgb: LinearRgb;
  horizonRgb: LinearRgb;
  glowStrength: number;
  sunIntensity: number;
}>;

export type SkySample = Readonly<{
  epochMs: number;
  solar: SolarPosition;
  exposure: number;
  lightmaps: LightmapWeights;
  atmosphere: Atmosphere;
  sunDirection: Vec3;
  horizonSunDirection: Vec3;
}>;

// sq-fix-improve R2 (the low-sun warm key — creative's DEC-056 proposal): the sun's warm
// endpoint keys on elevation. Physically the sun whitens with height and golds below the
// ramp: h 6.6° → 0.12, 16° → 0.75, ≥ 25° exactly 1 (spring/summer bit-identical by
// construction), ≤ 0° exactly 0. The consumer (main.ts) lerps SUN_WARM toward SUN_LOW by
// 1 − lowSunMix(h) before the day blend; this module stays pure (three-free, DOM-free).
export const SUN_LOW_RGB = [1.12, 0.72, 0.4] as const; // linear ≈ 3200 K, Y ≈ 0.78 of neutral
export const SUN_LOW_RAMP_DEG = 25;
export const lowSunMix = (elevationDeg: number): number =>
  smootherstep(clamp01(elevationDeg / SUN_LOW_RAMP_DEG));

export function atmosphereForElevation(elevationDeg: number): Atmosphere {
  if (!Number.isFinite(elevationDeg)) throw new RangeError('elevation must be finite');

  const twilightT = smootherstep((elevationDeg + 18) / 12);
  const dayD = smootherstep((elevationDeg + 4) / 19);

  // Z = mix(N, mix(Zt, Zd, D), T)
  const zenithRgb = mixRgb(
    PALETTE.night,
    mixRgb(PALETTE.twilightZenith, PALETTE.dayZenith, dayD),
    twilightT,
  );

  // H = mix(2·N, mix(0.35·Hd, Hd, D), T)
  const nightFloor: [number, number, number] = [
    2 * PALETTE.night[0],
    2 * PALETTE.night[1],
    2 * PALETTE.night[2],
  ];
  const dayHorizonPair = mixRgb(
    [0.35 * PALETTE.dayHorizon[0], 0.35 * PALETTE.dayHorizon[1], 0.35 * PALETTE.dayHorizon[2]],
    PALETTE.dayHorizon,
    dayD,
  );
  const horizonRgb = mixRgb(nightFloor, dayHorizonPair, twilightT);

  return {
    zenithRgb,
    horizonRgb,
    glowStrength: twilightT * (1 - dayD),
    sunIntensity: sunLightIntensity(elevationDeg),
  };
}

export function sampleSky(epochMs: number): SkySample {
  assertSupportedEpoch(epochMs);
  const solar = solarPosition(epochMs);
  const elevationDeg = solar.elevationDeg;
  const hRad = elevationDeg * RAD;
  const aRad = solar.azimuthDeg * RAD;
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);

  return {
    epochMs,
    solar,
    exposure: exposureForElevation(elevationDeg),
    lightmaps: lightmapWeights(elevationDeg),
    atmosphere: atmosphereForElevation(elevationDeg),
    // s = (cos h · sin A, sin h, −cos h · cos A); +X east, −Z north.
    sunDirection: [cosH * Math.sin(aRad), sinH, -cosH * Math.cos(aRad)],
    // a = (sin A, 0, −cos A) — the flattened azimuth vector for the warm lobe.
    horizonSunDirection: [Math.sin(aRad), 0, -Math.cos(aRad)],
  };
}
