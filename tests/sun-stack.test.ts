// tests/sun-stack.test.ts
/**
 * sq-arch-day B1a/B1b — the sun/sky stack's pins. The host wiring (the renderer's shadow
 * enable, the sun rig's shadow fit, the applyEpoch writes) is pinned by the established
 * main.ts source scan; the laws themselves are the pure modules. The night state vector is
 * a COMPUTED expectation (the current laws' values at a night instant), never a snapshot.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAYLIGHT_SUN_INTENSITY_MAX, PALETTE, SUN_COLOR } from '../src/content/sky-time';
import { TIERS } from '../src/engine/tier';
import { sampleSky } from '../src/sky/appearance';
import {
  FILL_DAY_GAIN,
  FILL_GROUND_HALF_ASPHALT,
  FILL_GROUND_HALF_ASPHALT_DAY,
  FILL_GROUND_HALF_SNOW,
  fillGroundColor,
  fillIntensity,
  fillSkyColor,
  fillZenithWeight,
  groundHalfAlbedo,
} from '../src/sky/fill';
import { sunLightIntensity } from '../src/sky/lightmap-weights';
import { SUN_SHADOW_FIT } from '../src/world/column';
import { snowBounceGround } from '../src/world/ground-snow';
import { WINDOW_WARM_LINEAR, warmGround } from '../src/world/night-facade';
import { snowSkyGain, snowWeight } from '../src/world/snow-season';

const REC709 = [0.2126, 0.7152, 0.0722] as const;
const lum = (c: readonly [number, number, number]): number =>
  REC709[0] * c[0] + REC709[1] * c[1] + REC709[2] * c[2];

describe('B1a — the renderer shadow enable (the main.ts law scan)', () => {
  const main = readFileSync('src/main.ts', 'utf8');

  it('enables the shadow map once, PCF (r186 removed PCFSoft), at renderer creation before the tier rows', () => {
    expect(main).toContain('renderer.shadowMap.enabled = true;');
    // The review's readout: PCFSoftShadowMap warned and reset to PCF on the FIRST shadow
    // pass (three r186 removed it) — the code carries the filter that actually renders.
    expect(main).toContain('renderer.shadowMap.type = THREE.PCFShadowMap;');
    expect(main).not.toContain('PCFSoftShadowMap');
    // Once at creation: the enable lines precede the tier's mapSize application site.
    const enabledAt = main.indexOf('renderer.shadowMap.enabled = true;');
    const tierAt = main.indexOf('sun.shadow.mapSize.set(next.shadowMapSize');
    expect(enabledAt).toBeGreaterThan(-1);
    expect(tierAt).toBeGreaterThan(enabledAt);
  });

  it('keeps the fit, the tier sizes and the bias; the normalBias moves to 0.05', () => {
    // sq-shadow-dirt R3: the receiver bias re-picks to −0.00003 (0.063 m along the light)
    // once R1's caster-side polygon offset carries the slope error.
    expect(main).toContain('sun.shadow.bias = -0.00003;');
    expect(main).toContain('sun.shadow.normalBias = 0.05;');
    expect(main).not.toContain('sun.shadow.normalBias = 0.25');
    expect(SUN_SHADOW_FIT.left).toBe(-130);
    expect(SUN_SHADOW_FIT.right).toBe(130);
    // sq-shadow-dirt R2/F8: the owner's iPhone settles t0 — its row carries 2048 like the rest.
    expect(TIERS.t0.shadowMapSize).toBe(2048);
    expect(TIERS.t1.shadowMapSize).toBe(2048);
    expect(TIERS.t2.shadowMapSize).toBe(4096);
  });

  it('the ground receives; the sun and only the sun casts; castShadow never toggles', () => {
    expect(main).toContain('ground.receiveShadow = true;');
    expect(main).toContain('sun.castShadow = true;');
    // The B1a(2) fade replaces the toggle: no E-driven castShadow write exists. The scan
    // extracts every assignment's RHS and asserts each one is the literal true (a
    // lookahead-after-backtrackable-\s* would match any value, so the check is positive).
    const castShadowAssigns = main.match(/sun\.castShadow\s*=\s*[^;\n]+/g) ?? [];
    expect(castShadowAssigns.length).toBeGreaterThan(0);
    for (const assign of castShadowAssigns) {
      expect(assign).toMatch(/=\s*true\b/);
    }
    // The hemisphere is the only other light and it casts nothing.
    expect(main).toContain('new THREE.HemisphereLight');
    expect(main).not.toContain('hemi.castShadow');
    // The fade site: the shadow's strength rides E(h) in applyEpoch — sq-shadow-dirt R4
    // saturates it (0 at day = 0, full from day = 0.25). sq-t0-residue R2: the sitting arm
    // si=0 multiplies the law by shadowGain — 1 in every shipped path, so the goldens read
    // the value bit-identical.
    expect(main).toContain('sun.shadow.intensity = Math.min(1, 4 * day) * shadowGain;');
    // sq-t0-residue R2: the caster slope offset rides the tier — settleTier assigns the
    // shared depth material's factor per settle (t0 2.0, t1/t2 1.4 — the rows tier.test.ts
    // pins; the singleton's units stay 4, untouched since shadow-dirt R1).
    expect(main).toContain(
      'SUN_DEPTH_MATERIAL.polygonOffsetFactor = next.shadowDepthOffsetFactor;',
    );
  });
});

describe('B1b — the sun level and temperature', () => {
  it('doubles the day peak to 6 with the SAME h-curve shape', () => {
    expect(DAYLIGHT_SUN_INTENSITY_MAX).toBe(6);
    // The shape law is smootherstep(h/10) × the peak — pinned at the curve's own stations.
    expect(sunLightIntensity(0)).toBe(0);
    expect(sunLightIntensity(5)).toBeCloseTo(6 * 0.5, 9); // smootherstep(0.5) = 0.5
    expect(sunLightIntensity(10)).toBeCloseTo(6, 9);
    const juneNoon = sampleSky(Date.UTC(2026, 5, 21, 12));
    expect(juneNoon.lightmaps.day).toBe(1); // E(h) saturates at june noon
    expect(sunLightIntensity(juneNoon.solar.elevationDeg)).toBeCloseTo(6.0, 1);
  });

  it('is the warm linear [1, 0.92, 0.78] (≈ 4600 K), day-lerped from the white legacy sun', () => {
    expect(SUN_COLOR[0]).toBe(1);
    expect(SUN_COLOR[1]).toBeCloseTo(0.92, 12);
    expect(SUN_COLOR[2]).toBeCloseTo(0.78, 12);
    expect(mainContainsSunColor()).toBe(true);
  });

  function mainContainsSunColor(): boolean {
    const main = readFileSync('src/main.ts', 'utf8');
    // The review's P1 (the night identity): applyEpoch lerps the white legacy sun toward
    // SUN_COLOR by E(h) — at day = 0 the light is the pre-round white bit for bit.
    // sq-fix-improve R2: the warm endpoint keys on elevation — the scratch is SUN_WARM
    // lerped toward SUN_LOW by 1 − lowSunMix(h) before the same day blend.
    return (
      main.includes('const SUN_WARM = new THREE.Color().setRGB(...SUN_COLOR);') &&
      main.includes(
        'sunWarmScratch.copy(SUN_WARM).lerp(SUN_LOW, 1 - lowSunMix(elevationDegOf(sample)));',
      ) &&
      main.includes('sun.color.setRGB(1, 1, 1).lerp(sunWarmScratch, day);') &&
      main.includes("import { SUN_COLOR, TIME } from './content/sky-time';")
    );
  }
});

describe('B1b — the fill (weights, intensity, ground class)', () => {
  it('weights: night 0.25/0.75 exactly, day 0.60/0.40', () => {
    expect(fillZenithWeight(0)).toBe(0.25);
    expect(fillZenithWeight(1)).toBeCloseTo(0.6, 12);
  });

  it('intensity: night 1.00, june-noon 4.5 (FILL_DAY_GAIN 4.5)', () => {
    expect(fillIntensity(0)).toBe(1);
    expect(fillIntensity(1)).toBe(4.5);
    expect(FILL_DAY_GAIN).toBe(4.5);
  });

  it('the night fill colour is the baseline law bit-exactly (0.25·z + 0.75·h)', () => {
    const night = sampleSky(Date.UTC(2026, 11, 21, 18)); // dec night: h ≈ −20°
    expect(night.lightmaps.day).toBe(0);
    const z = night.atmosphere.zenithRgb;
    const h = night.atmosphere.horizonRgb;
    const baseline = [
      0.25 * z[0] + 0.75 * h[0],
      0.25 * z[1] + 0.75 * h[1],
      0.25 * z[2] + 0.75 * h[2],
    ] as const;
    const fill = fillSkyColor(z, h, night.lightmaps.day);
    expect(fill[0]).toBe(baseline[0]);
    expect(fill[1]).toBe(baseline[1]);
    expect(fill[2]).toBe(baseline[2]);
  });

  it("the day fill is the un-K'd 0.60/0.40 blend of the §7 palette", () => {
    const fill = fillSkyColor(PALETTE.dayZenith, PALETTE.dayHorizon, 1);
    expect(fill[0]).toBeCloseTo(0.6 * 0.08 + 0.4 * 0.58, 12); // 0.28
    expect(fill[1]).toBeCloseTo(0.6 * 0.2 + 0.4 * 0.7, 12); // 0.40
    expect(fill[2]).toBeCloseTo(0.6 * 0.5 + 0.4 * 0.8, 12); // 0.62
  });

  it('the winter K never touches the fill (it rides the dome and the pane only)', () => {
    // At dec-noon wSnow = 1, wNight = 0 → K = 1.5 — and the fill law has no K input: the
    // fill equals the inline un-K'd restatement bit-exactly, while a K'd fill would not.
    expect(snowSkyGain(1, 0)).toBe(1.5);
    const decNoon = sampleSky(Date.UTC(2026, 11, 21, 10));
    const z = decNoon.atmosphere.zenithRgb;
    const h = decNoon.atmosphere.horizonRgb;
    const day = decNoon.lightmaps.day;
    const w = fillZenithWeight(day);
    const inline = [
      w * z[0] + (1 - w) * h[0],
      w * z[1] + (1 - w) * h[1],
      w * z[2] + (1 - w) * h[2],
    ] as const;
    const fill = fillSkyColor(z, h, day);
    expect(fill[0]).toBe(inline[0]);
    expect(fill[1]).toBe(inline[1]);
    expect(fill[2]).toBe(inline[2]);
    expect(snowSkyGain(1, 0)).not.toBe(1); // the K lives on the dome lookup (B2) instead
  });

  it("the ground class: today's warmGround path at night, half the season albedo at day", () => {
    // sq-shadow-dirt R6 (probe-gated): the asphalt endpoint lifts by day — night keeps the
    // committed 0.025 bit for bit, full day reaches the 0x4f4f4f half (0.040); the snow
    // endpoint and the wSnow mix are untouched.
    expect(FILL_GROUND_HALF_ASPHALT).toEqual([0.025, 0.025, 0.025]);
    expect(FILL_GROUND_HALF_ASPHALT_DAY).toEqual([0.04, 0.04, 0.04]);
    expect(FILL_GROUND_HALF_SNOW).toEqual([0.41, 0.43, 0.46]);
    expect(groundHalfAlbedo(0, 0)).toEqual(FILL_GROUND_HALF_ASPHALT);
    expect(groundHalfAlbedo(0, 1)).toEqual(FILL_GROUND_HALF_ASPHALT_DAY);
    expect(groundHalfAlbedo(1, 1)).toEqual(FILL_GROUND_HALF_SNOW);
    const night = sampleSky(Date.UTC(2026, 11, 21, 18));
    const wSnow = snowWeight(Date.UTC(2026, 11, 21, 18));
    const wNight = night.lightmaps.nightChandeliers;
    const today = warmGround(
      snowBounceGround(night.atmosphere.horizonRgb, wSnow),
      WINDOW_WARM_LINEAR,
      wNight,
    );
    const ground = fillGroundColor(
      today,
      groundHalfAlbedo(wSnow, night.lightmaps.day),
      night.lightmaps.day,
    );
    expect(ground[0]).toBe(today[0]);
    expect(ground[1]).toBe(today[1]);
    expect(ground[2]).toBe(today[2]);
  });
});

describe('B1 derived — the analytic shade:lit on a vertical white', () => {
  it("is 1/6 ± 0.03 at the design's derived geometry (south vertical, white 0.85)", () => {
    // The design's derivation: a south-facing vertical white (≈ 0.85 linear) at h = 40°,
    // sun 6·cosθ, the fill's vertical irradiance = 4.5·0.5·(fill lum + ground lum) — the
    // Brief-5 pick: the fill term scales as 4.5/11 of the Q2 pick's, the sun term unchanged.
    const cosH = Math.cos((40 * Math.PI) / 180);
    const fill = fillSkyColor(PALETTE.dayZenith, PALETTE.dayHorizon, 1);
    const fillLum = lum(fill);
    // R6's day-lifted asphalt endpoint is the day state this derivation describes.
    const groundLum = lum(groundHalfAlbedo(0, 1));
    const fillVertical = fillIntensity(1) * 0.5 * (fillLum + groundLum);
    const sunVertical = DAYLIGHT_SUN_INTENSITY_MAX * cosH * lum(SUN_COLOR);
    const ratio = fillVertical / (sunVertical + fillVertical);
    expect(Math.abs(ratio - 1 / 6)).toBeLessThanOrEqual(0.03);
  });
});
