// tests/ground-snow.test.ts
/**
 * R12 — the ground-snow look (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 * sq-arch-day B3 (2026-11-24): the winter drift + the june day class (the macro octave, the
 * 12/60 detail fade, the lane delta × 0.5 with the 0.35 m feather) — every day term is the
 * identity at E(h) = 0. Extends DEC-035/041/043.
 * Pins the purity fence, the laws, the bit-exact identities at wSnow = 0 and 1,
 * the GLSL/TS agreement, and the splice-and-throw discipline.
 * The lane is the square rail's XZ line (GROUND_LANE_LINE) — laneValue/trampleField take BOTH
 * coordinates; the old lane(x) row shapes survive as their (x, z) restatements.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import {
  GROUND_NOISE_GLSL,
  GROUND_NOISE_GLSL_FN,
  GROUND_SNOW_FRAGMENT_BODY,
  GROUND_SNOW_UNIFORMS,
  patchGroundSnowSlot,
} from '../src/procedural/ground-snow';
import {
  detailFade,
  driftFactor,
  driftNoise,
  GROUND_BOUNCE_LINEAR,
  GROUND_DETAIL_FADE,
  GROUND_DRIFT_MIN,
  GROUND_DRIFT_OCTAVES,
  GROUND_LANE,
  GROUND_LANE_LINE,
  GROUND_MACRO_OCTAVE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
  groundSnowAlbedo,
  gsNoise,
  LANE_DAY_CONTRAST,
  LANE_DAY_FEATHER_M,
  laneCentreX,
  laneValue,
  laneValueDay,
  macroFactor,
  snowBounceGround,
  trampleField,
  trampleFieldDay,
} from '../src/world/ground-snow';
import type { LinearRgb } from '../src/world/night-facade';
import { WINDOW_WARM_LINEAR, warmGround } from '../src/world/night-facade';
import { SNOW_ALBEDO_LINEAR } from '../src/world/snow-season';

const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

interface FakeMaterial {
  onBeforeCompile?: (shader: FakeShader) => void;
  customProgramCacheKey?: () => string;
}

interface FakeShader {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
  fragmentShader: string;
}

describe('ground-snow purity fence', () => {
  it('src/world/ground-snow.ts imports no three, DOM, clock or randomness', () => {
    const raw = readFileSync('src/world/ground-snow.ts', 'utf8');
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');

    const forbidden = [
      /from\s+['"]three/,
      /node:/,
      /document/,
      /window/,
      /localStorage/,
      /performance/,
      /Date/,
      /setTimeout/,
      /Math\.random/,
    ];
    for (const pattern of forbidden) {
      expect(code).not.toMatch(pattern);
    }
  });
});

describe('GROUND_LANE_LINE', () => {
  it('restates the square rail: S1 (near, the gate axis) → S0 (far, west)', () => {
    // S1 is the rail's last stop, S0 its first (the 2026-11-12/13 quarter-point inserts sit
    // between them; the XZ line is unchanged).
    expect(GROUND_LANE_LINE.nearX).toBe(SQUARE_RAIL.stops.at(-1)?.position[0]);
    expect(GROUND_LANE_LINE.nearZ).toBe(SQUARE_RAIL.stops.at(-1)?.position[2]);
    expect(GROUND_LANE_LINE.farX).toBe(SQUARE_RAIL.stops[0]?.position[0]);
    expect(GROUND_LANE_LINE.farZ).toBe(SQUARE_RAIL.stops[0]?.position[2]);
  });

  it('laneCentreX follows the rail line, clamped to the S1..S0 span', () => {
    expect(laneCentreX(124)).toBe(0); // S1
    expect(laneCentreX(177)).toBe(-12); // Sh: 53/106 of the span is exactly one half
    expect(laneCentreX(230)).toBe(-24); // S0
    // Outside the span the clamped end's x carries the extension:
    expect(laneCentreX(100)).toBe(0); // the courtyard stays on the axis centre
    expect(laneCentreX(260)).toBe(-24); // south of S0 stays at S0's x
  });

  it('is lane 1 under each stop, the clamped ends and the courtyard (centre 0)', () => {
    expect(laneValue(-24, 230)).toBe(1);
    expect(laneValue(-12, 177)).toBe(1);
    expect(laneValue(0, 124)).toBe(1);
    expect(laneValue(0, 100)).toBe(1);
    expect(laneValue(-24, 260)).toBe(1);
  });
});

describe('trampleField', () => {
  it('is symmetric about the rail line (not the axis)', () => {
    for (const z of [124, 177, 230]) {
      const c = laneCentreX(z);
      for (const d of [0, 5, 10, 14, 18, 22, 60]) {
        expect(trampleField(c + d, z)).toBe(trampleField(c - d, z));
      }
    }
  });

  it('is exactly 1 inside the lane core', () => {
    for (const z of [124, 177, 230, 190, 100, 260]) {
      const c = laneCentreX(z);
      for (const [x, zz] of [
        [c, z],
        [c + 1, z],
        [c + 2, z],
        [c + GROUND_LANE.coreHalfM, z],
        [c - GROUND_LANE.coreHalfM, z],
      ] as const) {
        expect(trampleField(x, zz)).toBe(1);
      }
    }
  });

  it('is exactly the base beyond the lane edge', () => {
    for (const z of [124, 177, 230, 100, 260]) {
      const c = laneCentreX(z);
      for (const [x, zz] of [
        [c + GROUND_LANE.edgeHalfM, z],
        [c + 40, z],
        [c + 300, z],
        [c - 300, z],
      ] as const) {
        expect(trampleField(x, zz)).toBe(GROUND_TRAMPLE_BASE);
      }
    }
  });

  it('is monotone non-increasing across the falloff and stays in range', () => {
    const c = laneCentreX(177);
    let previous = trampleField(c + GROUND_LANE.coreHalfM, 177);
    for (let d = 0; d <= GROUND_LANE.edgeHalfM - GROUND_LANE.coreHalfM; d += 0.25) {
      const value = trampleField(c + GROUND_LANE.coreHalfM + d, 177);
      expect(value).toBeLessThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(GROUND_TRAMPLE_BASE);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });
});

describe('groundSnowAlbedo', () => {
  const asphalt: LinearRgb = [0.0497, 0.0497, 0.0497];

  it('returns asphalt bit-exactly at wSnow = 0', () => {
    for (const [x, z] of [
      [0, 124],
      [-12, 177],
      [-24, 230],
      [15, 300],
      [300, 300],
      [0, 50],
    ] as const) {
      const out = groundSnowAlbedo(x, z, 0, asphalt);
      expect(out[0]).toBe(asphalt[0]);
      expect(out[1]).toBe(asphalt[1]);
      expect(out[2]).toBe(asphalt[2]);
    }
  });

  it('is fully trampled in the lane at wSnow = 1', () => {
    for (const [x, z] of [
      [0, 124], // the centre at S1
      [-12, 177], // the centre at Sh
      [laneCentreX(190), 190], // the centre at z 190 (the narrow path: ON the rail line)
      [-24, 230], // the centre at S0
    ] as const) {
      const out = groundSnowAlbedo(x, z, 1, asphalt);
      expect(out[0]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[0]);
      expect(out[1]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[1]);
      expect(out[2]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[2]);
    }
  });

  it('settles to mix(FRESH, TRAMPLED, BASE) beyond the lane edge at wSnow = 1', () => {
    const out = groundSnowAlbedo(laneCentreX(177) + GROUND_LANE.edgeHalfM, 177, 1, asphalt);
    for (let c = 0; c < 3; c += 1) {
      const fresh = GROUND_SNOW_FRESH_LINEAR[c] ?? Number.NaN;
      const trampled = GROUND_SNOW_TRAMPLED_LINEAR[c] ?? Number.NaN;
      expect(out[c]).toBe(lerp(fresh, trampled, GROUND_TRAMPLE_BASE));
    }
  });

  it('agrees with the TS mix chain at lane-mid points for every wSnow', () => {
    const asphaltTwin: LinearRgb = [0.0497, 0.0497, 0.0497];
    for (const [x, z] of [
      [0, 124],
      [-12, 177],
      [-24, 230],
      [laneCentreX(177) + 16, 177],
    ] as const) {
      const t = trampleField(x, z);
      const snowRgb = [
        lerp(
          GROUND_SNOW_FRESH_LINEAR[0] ?? Number.NaN,
          GROUND_SNOW_TRAMPLED_LINEAR[0] ?? Number.NaN,
          t,
        ),
        lerp(
          GROUND_SNOW_FRESH_LINEAR[1] ?? Number.NaN,
          GROUND_SNOW_TRAMPLED_LINEAR[1] ?? Number.NaN,
          t,
        ),
        lerp(
          GROUND_SNOW_FRESH_LINEAR[2] ?? Number.NaN,
          GROUND_SNOW_TRAMPLED_LINEAR[2] ?? Number.NaN,
          t,
        ),
      ] as LinearRgb;
      for (const w of [0, 0.5, 1]) {
        const out = groundSnowAlbedo(x, z, w, asphaltTwin);
        expect(out[0]).toBe(lerp(asphaltTwin[0], snowRgb[0], w));
        expect(out[1]).toBe(lerp(asphaltTwin[1], snowRgb[1], w));
        expect(out[2]).toBe(lerp(asphaltTwin[2], snowRgb[2], w));
      }
    }
  });
});

describe('snowBounceGround', () => {
  const h: LinearRgb = [0.31, 0.27, 0.42];

  it('is 0.25 * h bit-exactly at wSnow = 0', () => {
    const out = snowBounceGround(h, 0);
    expect(out[0]).toBe(0.25 * h[0]);
    expect(out[1]).toBe(0.25 * h[1]);
    expect(out[2]).toBe(0.25 * h[2]);
  });

  it('is h * GROUND_BOUNCE_LINEAR bit-exactly at wSnow = 1', () => {
    const out = snowBounceGround(h, 1);
    expect(out[0]).toBe(h[0] * GROUND_BOUNCE_LINEAR[0]);
    expect(out[1]).toBe(h[1] * GROUND_BOUNCE_LINEAR[1]);
    expect(out[2]).toBe(h[2] * GROUND_BOUNCE_LINEAR[2]);
  });

  it('is absorbed by warmGround at full night for every snow weight', () => {
    for (const w of [0, 0.5, 1]) {
      const out = warmGround(snowBounceGround(h, w), WINDOW_WARM_LINEAR, 1);
      expect(out[0]).toBe(WINDOW_WARM_LINEAR[0]);
      expect(out[1]).toBe(WINDOW_WARM_LINEAR[1]);
      expect(out[2]).toBe(WINDOW_WARM_LINEAR[2]);
    }
  });
});

describe('ground-snow constants', () => {
  it('re-exports the season law’s fresh albedo by reference', () => {
    expect(GROUND_SNOW_FRESH_LINEAR).toBe(SNOW_ALBEDO_LINEAR);
  });

  it('is darker than fresh snow on every channel', () => {
    for (let c = 0; c < 3; c += 1) {
      const fresh = GROUND_SNOW_FRESH_LINEAR[c] ?? Number.NaN;
      const trampled = GROUND_SNOW_TRAMPLED_LINEAR[c] ?? Number.NaN;
      expect(trampled).toBeLessThan(fresh);
    }
  });

  it('has a lane core inside its edge', () => {
    expect(GROUND_LANE.coreHalfM).toBeLessThan(GROUND_LANE.edgeHalfM);
  });
});

describe('GLSL / TS agreement', () => {
  const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : `${x}`);

  it('emits the lane-line, lane width, base and albedo constants into the fragment body', () => {
    for (const n of [
      GROUND_LANE_LINE.nearX,
      GROUND_LANE_LINE.nearZ,
      GROUND_LANE_LINE.farX,
      GROUND_LANE_LINE.farZ,
      GROUND_LANE.coreHalfM,
      GROUND_LANE.edgeHalfM,
      GROUND_TRAMPLE_BASE,
    ]) {
      expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(n));
    }
    for (const channel of [...GROUND_SNOW_FRESH_LINEAR, ...GROUND_SNOW_TRAMPLED_LINEAR]) {
      expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(channel));
    }
    // The DEC-037 clamped-rail shape: world Z clamped to the S1..S0 span, x measured from
    // the rail line via groundLaneX (the interpolated twin of laneCentreX).
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('clamp( vGroundXZ.y');
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('abs( vGroundXZ.x - groundLaneX )');
  });

  it('emits the B3 day-class constants and the shared noise uniforms', () => {
    // The lane's day law: the feather and the contrast, blended by uDay.
    const feather = `${glslFloat(GROUND_LANE.edgeHalfM)} + ${glslFloat(LANE_DAY_FEATHER_M)} * uDay`;
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(feather);
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(
      `* ( 1.0 + ( ${glslFloat(LANE_DAY_CONTRAST)} - 1.0 ) * uDay )`,
    );
    // The drift: the uniform-paired octaves and the uDriftMin floor, inside the uSnow mix.
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('uDriftMin + ( 1.0 - uDriftMin ) * ( uOctaveA.y');
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('groundSnowRgb *= mix( 1.0, groundDrift, uDay );');
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(
      'diffuseColor.rgb = mix( diffuseColor.rgb, groundSnowRgb, uSnow );',
    );
    // The june macro octave, blended by uDay; the detail fade inside the paving call.
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('vGroundXZ / uMacro.x');
    const macroCall = `${GROUND_NOISE_GLSL_FN}( vGroundXZ / uMacro.x ) - 0.5`;
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(`mix( 1.0, 1.0 + ( ${macroCall} )`);
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('* 2.0 * uMacro.y, uDay );');
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(
      'pavingAlbedo( vGroundXZ, diffuseColor.rgb, groundDist )',
    );
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain('float groundDist = length( vViewPosition );');
    // The uniform initial values are the laws' constants.
    expect(GROUND_SNOW_UNIFORMS.uDriftMin.value).toBe(GROUND_DRIFT_MIN);
    expect(GROUND_SNOW_UNIFORMS.uOctaveA.value).toEqual([
      GROUND_DRIFT_OCTAVES.a.scaleM,
      GROUND_DRIFT_OCTAVES.a.amp,
    ]);
    expect(GROUND_SNOW_UNIFORMS.uOctaveB.value).toEqual([
      GROUND_DRIFT_OCTAVES.b.scaleM,
      GROUND_DRIFT_OCTAVES.b.amp,
    ]);
    expect(GROUND_SNOW_UNIFORMS.uMacro.value).toEqual([
      GROUND_MACRO_OCTAVE.scaleM,
      GROUND_MACRO_OCTAVE.amp,
    ]);
    // The ONE shared hash value-noise: emitted before the paving function, which samples it.
    expect(GROUND_NOISE_GLSL).toContain('float gsNoise(vec2 p)');
    expect(GROUND_NOISE_GLSL).toContain('gsNoiseHash(vec2 p)');
    expect(GROUND_NOISE_GLSL.indexOf('gsNoiseHash')).toBeLessThan(
      GROUND_NOISE_GLSL.indexOf('float gsNoise(vec2 p)'),
    );
  });
});

describe('sq-arch-day B3 — the winter drift (the Q8 pick)', () => {
  it('modulates the snow albedo over [DRIFT_MIN, 1] — DRIFT_MIN 0.50 at the 5.5 m octave', () => {
    expect(GROUND_DRIFT_MIN).toBe(0.5);
    expect(GROUND_DRIFT_OCTAVES.a).toEqual({ scaleM: 5.5, amp: 0.8 });
    expect(GROUND_DRIFT_OCTAVES.b).toEqual({ scaleM: 1.2, amp: 0.2 });
    expect(driftFactor(0)).toBe(0.5);
    expect(driftFactor(1)).toBe(1);
  });

  it('the n2 field over a 200 m sample stays in [0, 1] and actually varies', () => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let x = -100; x <= 100; x += 7) {
      for (let z = 100; z <= 300; z += 11) {
        const n2 = driftNoise(x + 0.37, z + 0.29);
        expect(n2).toBeGreaterThanOrEqual(0);
        expect(n2).toBeLessThanOrEqual(1);
        min = Math.min(min, n2);
        max = Math.max(max, n2);
      }
    }
    expect(max - min).toBeGreaterThan(0.1); // the band is not flat
    // The albedo factor over the same sample: [0.50, 1.0].
    expect(driftFactor(min)).toBeGreaterThanOrEqual(0.5 - 1e-12);
    expect(driftFactor(max)).toBeLessThanOrEqual(1);
  });

  it('the shared noise twin is a [0, 1) bilinear value noise; the macro is its 6 m sample', () => {
    for (let x = -50; x <= 50; x += 3) {
      for (let z = 100; z <= 300; z += 7) {
        const v = gsNoise(x / 6, z / 6);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
    expect(GROUND_MACRO_OCTAVE).toEqual({ scaleM: 6, amp: 0.06 });
    // The macro factor is the ±6 % swing about 1: [0.94, 1.06].
    const swing = 2 * GROUND_MACRO_OCTAVE.amp;
    expect(macroFactor(0.37, 190.3)).toBeGreaterThanOrEqual(1 - swing - 1e-12);
    expect(macroFactor(0.37, 190.3)).toBeLessThanOrEqual(1 + swing + 1e-12);
  });
});

describe('sq-arch-day B3 — the day lane law (the Q7 pick)', () => {
  it('at E = 0 both laws are the committed lane law bit for bit', () => {
    for (const [x, z] of [
      [0, 124],
      [-12, 177],
      [-24, 230],
      [laneCentreX(177) + 5, 177],
      [laneCentreX(177) + 8, 177],
      [15, 300],
      [0, 50],
    ] as const) {
      expect(laneValueDay(x, z, 0)).toBe(laneValue(x, z));
      expect(trampleFieldDay(x, z, 0)).toBe(trampleField(x, z));
    }
  });

  it('at E = 1 the lane delta halves and the edge feathers by 0.35 m', () => {
    expect(LANE_DAY_CONTRAST).toBe(0.5);
    expect(LANE_DAY_FEATHER_M).toBe(0.35);
    for (const [x, z] of [
      [0, 124],
      [-12, 177],
      [laneCentreX(177) + 5, 177],
      [laneCentreX(177) + 8, 177],
    ] as const) {
      const day = trampleFieldDay(x, z, 1);
      // The law composes both deltas (the design's B3 + the Q7 pick): the widened edge's
      // lane value carries the halved contrast — the night lane value feeds the night
      // field only, so the expectation reads laneValueDay, not t.
      const laneDay = laneValueDay(x, z, 1);
      expect(day).toBeCloseTo(GROUND_TRAMPLE_BASE + (1 - GROUND_TRAMPLE_BASE) * laneDay * 0.5, 12);
    }
    // The feather: the old edge's skirt is now inside the lane's falloff at full day.
    const c = laneCentreX(177);
    expect(laneValue(c + GROUND_LANE.edgeHalfM, 177)).toBe(0);
    expect(laneValueDay(c + GROUND_LANE.edgeHalfM, 177, 1)).toBeGreaterThan(0);
    // Clear of the feathered edge (the exact boundary is an FP tie — the skirt's 0.01 margin).
    expect(laneValueDay(c + GROUND_LANE.edgeHalfM + LANE_DAY_FEATHER_M + 0.01, 177, 1)).toBe(0);
  });
});

describe('sq-arch-day B3 — the cobble detail fade (the june pair 12/60)', () => {
  it('is 1 near, 0 far, monotone between the constants', () => {
    expect(GROUND_DETAIL_FADE).toEqual({ nearM: 12, farM: 60 });
    expect(detailFade(0)).toBe(1);
    expect(detailFade(12)).toBe(1);
    expect(detailFade(60)).toBe(0);
    expect(detailFade(36)).toBeCloseTo(0.5, 12);
    expect(detailFade(30)).toBeGreaterThan(detailFade(40));
  });
});

describe('patchGroundSnowSlot', () => {
  const vertexWithAnchors = [
    '#include <common>',
    'void main() {',
    '#include <worldpos_vertex>',
    '}',
  ].join('\n');
  const fragmentWithAnchors = [
    '#include <common>',
    'void main() {',
    '#include <color_fragment>',
    '}',
  ].join('\n');

  const makeMaterial = (): FakeMaterial => ({});

  const makeShader = (vertexShader: string, fragmentShader: string): FakeShader => ({
    uniforms: {},
    vertexShader,
    fragmentShader,
  });

  it('installs the compile hook and the cache key', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    expect(material.onBeforeCompile).toBeTypeOf('function');
    expect(material.customProgramCacheKey).toBeTypeOf('function');
    // Brief 19 §B.2 (W4c): the paving slot composes INSIDE the snow hook, so the key compounds —
    // patched and unpatched materials still never share a cache entry.
    // sq-arch-day B3: the snow slot is @3 (the drift + macro + day-lane body), the paving @2.
    expect(material.customProgramCacheKey?.()).toBe('Ground/snow-slot@3|Ground/paving-slot@2');
  });

  it('throws when an anchor is missing', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    const hook = material.onBeforeCompile;
    expect(hook).toBeTypeOf('function');
    expect(() => hook?.(makeShader('void main() {}', fragmentWithAnchors))).toThrow();
    expect(() => hook?.(makeShader(vertexWithAnchors, 'void main() {}'))).toThrow();
  });

  it('splices the varying, the uniform and the trample law', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    const shader = makeShader(vertexWithAnchors, fragmentWithAnchors);
    material.onBeforeCompile?.(shader);
    expect(shader.vertexShader).toContain('vGroundXZ');
    expect(shader.fragmentShader).toContain('uSnow');
    expect(shader.fragmentShader).toContain('groundTrample');
    expect(shader.uniforms.uSnow).toBe(GROUND_SNOW_UNIFORMS.uSnow);
  });
});
