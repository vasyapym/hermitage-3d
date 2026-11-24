// tests/sky-palette.test.ts
/**
 * sq-arch-day B2 — the day sky palette and the dome's E-gated sun terms. The palette pin is
 * the pure constant; the fill pin rides B1b's law; the hz/aureole pins are the dome law's TS
 * twins (src/sky/rig.ts) — exactly the identity at E = 0 and 1.35× at full day; the winter K
 * rides the dome lookup (uDomeK), never the fill.
 */
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../src/content/sky-time';
import { fillIntensity, fillSkyColor, fillZenithWeight } from '../src/sky/fill';
import { sampleSky } from '../src/sky/appearance';
import {
  AUREOLE_COLOR,
  AUREOLE_POW,
  aureoleTerm,
  HZ_SUN_GAIN,
  horizonSunFactor,
  SKY_FRAGMENT_SHADER,
} from '../src/sky/rig';
import { snowSkyGain } from '../src/world/snow-season';

describe('B2 — the day zenith', () => {
  it('deepens to [0.08, 0.20, 0.50]; the horizon row stays', () => {
    expect(PALETTE.dayZenith).toEqual([0.08, 0.2, 0.5]);
    expect(PALETTE.dayHorizon).toEqual([0.58, 0.7, 0.8]);
  });
});

describe('B2 — the fill the B1 stack rides on', () => {
  it('fill(june-noon) = [0.28, 0.40, 0.62] ± 0.005', () => {
    const juneNoon = sampleSky(Date.UTC(2026, 5, 21, 12));
    expect(juneNoon.lightmaps.day).toBe(1); // E(h) = 1 at june noon
    const fill = fillSkyColor(PALETTE.dayZenith, PALETTE.dayHorizon, juneNoon.lightmaps.day);
    expect(fill[0]).toBeCloseTo(0.28, 2);
    expect(fill[1]).toBeCloseTo(0.4, 2);
    expect(fill[2]).toBeCloseTo(0.62, 2);
    // The B1 numbers: intensity 11, weight 0.60.
    expect(fillIntensity(juneNoon.lightmaps.day)).toBe(11);
    expect(fillZenithWeight(juneNoon.lightmaps.day)).toBeCloseTo(0.6, 12);
  });
});

describe('B2 — the sun-side horizon gain and the aureole (the dome law\'s twins)', () => {
  it('both terms vanish exactly at E = 0 (the night dome is the committed palette)', () => {
    expect(horizonSunFactor(1, 0)).toBe(1);
    expect(horizonSunFactor(0.3, 0)).toBe(1);
    expect(aureoleTerm(1, 0)).toEqual([0, 0, 0]);
    expect(aureoleTerm(0.7, 0)).toEqual([0, 0, 0]);
  });

  it('toward the sun the horizon reads 1.35× at E = 1 (HZ_SUN_GAIN 0.35, pow 4)', () => {
    expect(HZ_SUN_GAIN).toBe(0.35);
    expect(horizonSunFactor(1, 1)).toBeCloseTo(1.35, 12);
    expect(horizonSunFactor(0, 1)).toBe(1); // away from the sun: the committed horizon
    // pow 4: the half-strength point sits at cos⁴θ = 0.5 → θ ≈ 33.6° off the sun azimuth.
    expect(horizonSunFactor(Math.pow(0.5, 0.25), 1)).toBeCloseTo(1.175, 12);
  });

  it('the aureole is [0.90, 0.75, 0.50]·E·pow(facing, 64) — ≈ 8° half-width', () => {
    expect(AUREOLE_COLOR).toEqual([0.9, 0.75, 0.5]);
    expect(AUREOLE_POW).toBe(64);
    expect(aureoleTerm(1, 1)[0]).toBeCloseTo(0.9, 12);
    expect(aureoleTerm(1, 1)[1]).toBeCloseTo(0.75, 12);
    expect(aureoleTerm(1, 1)[2]).toBeCloseTo(0.5, 12);
    expect(aureoleTerm(Math.pow(0.5, 1 / 64), 1)[0]).toBeCloseTo(0.45, 12);
  });

  it('the fragment carries both E-gates and the dome K lookup', () => {
    // The emitted GLSL twins are driven by the same constants and the uDay uniform.
    expect(SKY_FRAGMENT_SHADER).toContain('uHorizon * horizonSunFactorG( hzFacing, uDay )');
    expect(SKY_FRAGMENT_SHADER).toContain('aureoleTermG( sunFacing, uDay )');
    expect(SKY_FRAGMENT_SHADER).toContain('sky * uDomeK');
    expect(SKY_FRAGMENT_SHADER).toContain('uniform float uDay;');
    expect(SKY_FRAGMENT_SHADER).toContain('uniform float uDomeK;');
    expect(SKY_FRAGMENT_SHADER).toContain('uniform vec3 uSunDir;');
  });
});

describe('B2 — the winter K is on the dome lookup only', () => {
  it('K = 1.5 in snow season at day, exactly 1.0 at night and out of season', () => {
    expect(snowSkyGain(1, 0)).toBeCloseTo(1.5, 12);
    expect(snowSkyGain(0, 0)).toBe(1);
    expect(snowSkyGain(1, 1)).toBe(1);
    // The fill stays un-K'd (the B1 pin's structural row); the K feeds the dome + the pane.
    expect(snowSkyGain(1, 0)).not.toBe(1);
  });
});
