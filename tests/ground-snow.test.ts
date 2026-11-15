// tests/ground-snow.test.ts
/**
 * R12 — the ground-snow look (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 * Pins the purity fence, the laws, the bit-exact identities at wSnow = 0 and 1,
 * the GLSL/TS agreement, and the splice-and-throw discipline.
 * The lane is the square rail's XZ line (GROUND_LANE_LINE) — laneValue/trampleField take BOTH
 * coordinates; the old lane(x) row shapes survive as their (x, z) restatements.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import {
  GROUND_SNOW_FRAGMENT_BODY,
  GROUND_SNOW_UNIFORMS,
  patchGroundSnowSlot,
} from '../src/procedural/ground-snow';
import {
  GROUND_BOUNCE_LINEAR,
  GROUND_LANE,
  GROUND_LANE_LINE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
  groundSnowAlbedo,
  laneCentreX,
  laneValue,
  snowBounceGround,
  trampleField,
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
    expect(material.customProgramCacheKey?.()).toBe('Ground/snow-slot@2|Ground/paving-slot@1');
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
