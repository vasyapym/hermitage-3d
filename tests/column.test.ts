/**
 * DEC-037 — the Alexander Column: the nine invariants (brief 11 §2).
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { samplePosition } from '../src/camera/rail';
import {
  SQUARE_RAIL,
  SQUARE_S0_GAZE,
  SQUARE_S1_GAZE,
  SQUARE_SH_GAZE,
} from '../src/camera/square-rail';
import { buildColumn, setColumnOpacity } from '../src/procedural/column';
import { GROUND_SNOW_FRAGMENT_BODY } from '../src/procedural/ground-snow';
import { sampleSky } from '../src/sky/appearance';
import {
  type ArrivalState,
  advanceArrival,
  initialArrival,
  presentationForArrival,
} from '../src/sky/arrival';
import {
  COLUMN_CAPITAL,
  COLUMN_CROSS_HEIGHT_M,
  COLUMN_ERA,
  COLUMN_FIGURE,
  COLUMN_FIGURE_HEIGHT_M,
  COLUMN_FINIAL_BAND_M,
  COLUMN_PEDESTAL,
  COLUMN_PLINTH,
  COLUMN_RAIL_CLEARANCE_M,
  COLUMN_SHAFT,
  COLUMN_SOURCE,
  COLUMN_TOTAL_HEIGHT_M,
  COLUMN_TRIANGLE_CEILING,
  COLUMN_X,
  COLUMN_Y,
  COLUMN_Z,
  FACADE_OUTER_FACE_Z,
  SUN_SHADOW_FIT,
  shaftProfile,
} from '../src/world/column';
import {
  GROUND_LANE,
  GROUND_LANE_LINE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
  groundSnowAlbedo,
  laneValue,
} from '../src/world/ground-snow';
import type { LinearRgb } from '../src/world/night-facade';

type V3 = readonly [number, number, number];
const RAD = Math.PI / 180;

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const stopAt = (i: number) => {
  const s = SQUARE_RAIL.stops[i];
  if (!s) throw new Error(`square stop ${i} missing`);
  return s;
};

describe('1 · the sourced chain', () => {
  it('sums 3.9 + 4.25 + 25.6 + 13.75 = 47.5; the cross tops out; the figure and cross pins', () => {
    const sum =
      COLUMN_PLINTH.heightM + COLUMN_PEDESTAL.heightM + COLUMN_SHAFT.heightM + COLUMN_FINIAL_BAND_M;
    expect(sum).toBeCloseTo(COLUMN_TOTAL_HEIGHT_M, 9);
    expect(COLUMN_FINIAL_BAND_M).toBeCloseTo(13.75, 12);
    expect(COLUMN_Y.crossTop).toBe(COLUMN_TOTAL_HEIGHT_M);
    expect(COLUMN_Y.crossBottom + COLUMN_CROSS_HEIGHT_M).toBeCloseTo(47.5, 9);
    expect(COLUMN_FIGURE_HEIGHT_M).toBe(4.26);
    expect(COLUMN_CROSS_HEIGHT_M).toBe(6.4);
    expect(COLUMN_Y.shaftTop).toBeCloseTo(33.75, 9);
    expect(COLUMN_Y.crossBottom - COLUMN_Y.shaftTop).toBeCloseTo(7.35, 9);
  });

  it('allocates the capital and angel pedestal under the cross; the feet stand on the dome', () => {
    expect(COLUMN_Y.domeTop - COLUMN_Y.shaftTop).toBeLessThanOrEqual(
      COLUMN_Y.crossBottom - COLUMN_Y.shaftTop,
    );
    expect(COLUMN_Y.figureTop - COLUMN_Y.domeTop).toBeCloseTo(COLUMN_FIGURE_HEIGHT_M, 9);
    expect(COLUMN_Y.figureTop).toBeGreaterThan(COLUMN_Y.crossBottom); // the pole rises behind it
    expect(COLUMN_Y.figureTop).toBeLessThan(COLUMN_Y.crossTop);
  });

  it('resolves the shaft radii monotone non-increasing, end-exact, inside the pedestal', () => {
    const profile = shaftProfile();
    expect(profile).toHaveLength(COLUMN_SHAFT.rings + 1);
    expect(profile[0]?.[0]).toBe(1.83);
    expect(profile[COLUMN_SHAFT.rings]?.[0]).toBe(1.575);
    for (let k = 1; k < profile.length; k++) {
      expect(profile[k]?.[0] ?? Number.NaN).toBeLessThanOrEqual(profile[k - 1]?.[0] ?? Number.NaN);
    }
    const halfPlinth = COLUMN_PLINTH.footprintM / 2;
    for (const r of [
      COLUMN_SHAFT.baseRadiusM,
      COLUMN_CAPITAL.echinusTopRadiusM,
      COLUMN_CAPITAL.abacusWidthM / 2,
      COLUMN_FIGURE.baseRadiusM,
    ]) {
      expect(r).toBeLessThan(halfPlinth);
    }
    expect(COLUMN_SHAFT.baseRadiusM).toBeLessThan(COLUMN_PEDESTAL.widthM / 2);
    expect(COLUMN_PEDESTAL.widthM).toBeLessThan(COLUMN_PLINTH.footprintM);
  });
});

describe('2 · one draw, one material, the exact count', () => {
  const build = buildColumn();

  it('builds 676 triangles under the 1,500 ceiling', () => {
    expect(build.triangles).toBe(676);
    expect(build.triangles).toBeLessThanOrEqual(COLUMN_TRIANGLE_CEILING);
    expect(build.mesh.geometry.getAttribute('position').count).toBe(676 * 3);
  });

  it('is one mesh, one Lambert, vertex colours, no groups, no custom program key', () => {
    expect(build.mesh.children).toHaveLength(0);
    expect(build.mesh.geometry.groups).toHaveLength(0);
    expect(build.mesh.material).toBe(build.material);
    expect(build.material).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(build.material.vertexColors).toBe(true);
    expect(build.material.transparent).toBe(true);
    expect(build.mesh.geometry.getAttribute('color').itemSize).toBe(3);
    expect(build.material.onBeforeCompile).toBe(THREE.Material.prototype.onBeforeCompile);
    expect(build.material.customProgramCacheKey).toBe(
      THREE.Material.prototype.customProgramCacheKey,
    );
    expect(build.mesh.castShadow).toBe(true);
    expect(build.mesh.receiveShadow).toBe(true);
  });
});

describe('3 · placement', () => {
  it('stands on the throat axis, 96.5 m south of the outer face, inside the ±300 ground', () => {
    expect(COLUMN_X).toBe(0);
    expect(COLUMN_X).toBe(SQUARE_S1_GAZE[0]); // the arch mouth: the gate axis
    expect(FACADE_OUTER_FACE_Z).toBe(93.5);
    expect(COLUMN_Z).toBe(190);
    expect(COLUMN_Z).toBeGreaterThan(FACADE_OUTER_FACE_Z);
    expect(COLUMN_Z + COLUMN_PLINTH.footprintM / 2).toBeLessThan(300);
    const build = buildColumn();
    expect(build.mesh.position.toArray()).toEqual([0, 0, 190]);
  });
});

describe('4 · the rail west of the axis', () => {
  it('keeps the stops XZ-collinear; S1 and all three subjects committed', () => {
    const [a, b, c] = [stopAt(0).position, stopAt(1).position, stopAt(2).position];
    const cross = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
    expect(Math.abs(cross)).toBeLessThan(1e-9);
    expect(stopAt(2).position).toEqual([0, 1.7, 124]);
    expect(stopAt(0).subject).toEqual([0, 11, 0]);
    expect(stopAt(1).subject).toEqual([0, 8.5, 87]);
    expect(stopAt(2).subject).toEqual([0, 6.6, 92]);
    expect([SQUARE_S0_GAZE, SQUARE_SH_GAZE, SQUARE_S1_GAZE].map((g) => g[0])).toEqual([0, 0, 0]);
  });

  it('clears the Column axis by 14.57449 m (≥ COLUMN_RAIL_CLEARANCE_M) along the polyline', () => {
    const p = [COLUMN_X, COLUMN_Z] as const;
    const segment = (i: number): number => {
      const a = stopAt(i).position;
      const b = stopAt(i + 1).position;
      const [abx, abz] = [b[0] - a[0], b[2] - a[2]];
      const t = Math.min(
        1,
        Math.max(0, ((p[0] - a[0]) * abx + (p[1] - a[2]) * abz) / (abx * abx + abz * abz)),
      );
      return Math.hypot(a[0] + abx * t - p[0], a[2] + abz * t - p[1]);
    };
    const clearance = Math.min(segment(0), segment(1));
    expect(clearance).toBeCloseTo(14.57449, 4);
    expect(clearance).toBeGreaterThanOrEqual(COLUMN_RAIL_CLEARANCE_M);
    for (let k = 0; k <= 512; k++) {
      const at = samplePosition(SQUARE_RAIL, k / 512);
      const d = Math.hypot((at[0] ?? Number.NaN) - p[0], (at[2] ?? Number.NaN) - p[1]);
      expect(d).toBeGreaterThanOrEqual(COLUMN_RAIL_CLEARANCE_M);
    }
    const xAt190 = (-24 * (190 - 124)) / (230 - 124);
    expect(xAt190).toBeCloseTo(-14.94, 2);
  });
});

describe('5 · the look reward from S0', () => {
  // A camera on the S0 default gaze (bearing/elevation from S0 → its subject), pitched up by the
  // look offset; fov 55 (main.ts), the golden 1280 × 720 frame. NDC inside ⇔ |x|, |y| ≤ 1.
  const ndc = (pitchUpDeg: number, p: V3): readonly [number, number] => {
    const eye = stopAt(0).position;
    const gaze = stopAt(0).subject ?? SQUARE_S0_GAZE;
    const [dx, dy, dz] = [gaze[0] - eye[0], gaze[1] - eye[1], gaze[2] - eye[2]];
    const b = Math.atan2(dx, -dz);
    const e = Math.atan2(dy, Math.hypot(dx, dz)) + pitchUpDeg * RAD;
    const f: V3 = [Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e)];
    const r: V3 = [Math.cos(b), 0, Math.sin(b)];
    const u: V3 = [-Math.sin(b) * Math.sin(e), Math.cos(e), Math.cos(b) * Math.sin(e)];
    const q: V3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
    const tanHalf = Math.tan(27.5 * RAD);
    return [dot(q, r) / (dot(q, f) * tanHalf * (1280 / 720)), dot(q, u) / (dot(q, f) * tanHalf)];
  };
  const top: V3 = [COLUMN_X, COLUMN_TOTAL_HEIGHT_M, COLUMN_Z];

  it('the finial top (47.5 m at 46.65 m) enters the frame at pitchUp 35, not at pitch 0', () => {
    const eye = stopAt(0).position;
    const distance = Math.hypot(COLUMN_X - eye[0], COLUMN_Z - eye[2]);
    expect(distance).toBeCloseTo(46.65, 2);
    expect(stopAt(0).look.pitchUp).toBe(35);
    const [x35, y35] = ndc(stopAt(0).look.pitchUp, top);
    expect(Math.abs(x35)).toBeLessThanOrEqual(1);
    expect(Math.abs(y35)).toBeLessThanOrEqual(1);
    expect(ndc(0, top)[1]).toBeGreaterThan(1);

    // Level, the frame's top edge cuts the shaft at ≈ 26 m.
    const cut = eye[1] + distance * Math.tan(27.5 * RAD);
    expect(cut).toBeCloseTo(26, 0);
    expect(cut).toBeGreaterThan(COLUMN_Y.pedestalTop);
    expect(cut).toBeLessThan(COLUMN_Y.shaftTop);
  });
});

describe('6 · the fade and the group', () => {
  it('equals the massing opacity at every arrival sample (both presentation modes)', () => {
    const build = buildColumn();
    for (const deterministic of [false, true]) {
      let state: ArrivalState = initialArrival();
      for (let frame = 0; frame < 64; frame++) {
        const { massingOpacity } = presentationForArrival(state, deterministic);
        setColumnOpacity(build, massingOpacity);
        expect(build.material.opacity).toBe(massingOpacity);
        expect(build.material.transparent).toBe(massingOpacity < 1);
        state = advanceArrival(state, 16, true, deterministic);
      }
      expect(state.phase).toBe('settled');
    }
  });

  it('rides the throat statement in applyPresentation and is a child of PalaceMassing', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(
      /setThroatOpacity\(throat, presentation\.massingOpacity\);\s*setColumnOpacity\(alexanderColumn, presentation\.massingOpacity\);/,
    );
    expect(main).toContain("palace.name = 'PalaceMassing';");
    const adds = [...main.matchAll(/palace\.add\(([^)]*)\)/g)].map((m) => m[1] ?? '');
    expect(adds.some((args) => args.includes('alexanderColumn.mesh'))).toBe(true);
  });
});

describe('7 · the ground-snow slot under the moved rail', () => {
  const asphalt: LinearRgb = [0.0497, 0.0497, 0.0497];

  it('is the identity at uSnow = 0 and lane 1 under each stop (full twin: ground-snow.test)', () => {
    // Render-relevant samples: under each stop, the Column's plan centre, the noon finial-shadow
    // ground point, the courtyard and points off the lane on both sides.
    for (const [x, z] of [
      [-24, 230], // S0
      [-12, 177], // Sh
      [0, 124], // S1
      [0, 190], // the Column itself
      [29, 159], // the noon finial shadow's ground point
      [-30, 190], // west of S1, inside the lane's falloff
      [60, 230], // east of the axis, outside the lane
      [-60, 230], // west edge of the ground
      [0, 100], // the courtyard (north of the lane's reach)
    ] as const) {
      expect(groundSnowAlbedo(x, z, 0, asphalt), `(${x}, ${z})`).toEqual(asphalt);
    }
    expect(laneValue(-24, 230)).toBe(1);
    expect(laneValue(-12, 177)).toBe(1);
    expect(laneValue(0, 124)).toBe(1);
  });

  it('carries the law constants and the clamped-rail shape into the fragment body', () => {
    const body = GROUND_SNOW_FRAGMENT_BODY;
    const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : `${x}`);
    for (const n of [
      GROUND_LANE_LINE.nearX,
      GROUND_LANE_LINE.nearZ,
      GROUND_LANE_LINE.farX,
      GROUND_LANE_LINE.farZ,
      GROUND_LANE.coreHalfM,
      GROUND_LANE.edgeHalfM,
      GROUND_TRAMPLE_BASE,
    ]) {
      expect(body).toContain(glslFloat(n));
    }
    for (const channel of [...GROUND_SNOW_FRESH_LINEAR, ...GROUND_SNOW_TRAMPLED_LINEAR]) {
      expect(body).toContain(glslFloat(channel));
    }
    // The DEC-037 lane shape: world-Z clamped to the S1..S0 span, x measured FROM the rail line.
    expect(body).toContain('clamp( vGroundXZ.y');
    expect(body).toContain('abs( vGroundXZ.x - groundLaneX )');
  });
});

describe('8 · the shadow fit (DEC-037)', () => {
  // The math (three.js's LightShadow.updateMatrices): the ortho shadow camera sits AT the light's
  // world position and aims at sun.target's world position. The rig (main.ts) carries both, so
  // with main.ts's SUN_DISTANCE 1000 the rig-local sun.position direction × 1000 gives
  //   L = R + sunDirection · 1000, R = (0, 0, SUN_SHADOW_FIT.centreZ) = the rig origin,
  //   f = normalize(R − L) = −sunDirection, and Matrix4.lookAt(L, R, worldUp) is its basis.
  // A point P is inside the committed box iff in that basis LATERAL |x| ≤ fit.right (left −130,
  // symmetric), LATERAL |y| ≤ fit.top, and DEPTH from L along f within [fit.near, fit.far].
  // The depth: P sits beyond the target seen from L ⇒ depth = dot(f, P − L) = dot(f, P − R) −
  // dot(f, L − R) = dot(f, P − R) + 1000 = 1000 − dot(P − R, sunDirection). Transforming the
  // reduced point (P − R) by the rotation-only lookAt matrix therefore yields the laterals as-is
  // (the sunDirection part of L − R is orthogonal to both in-plane axes) and a camera z whose
  // negation needs only the constant |L − R| offset: depth = −(that z) + 1000.
  const SPEC = readFileSync('tests/e2e/golden.spec.ts', 'utf8');
  const queries = [...SPEC.matchAll(/settledPage\(page, '([^']+)'\)/g)].map((m) => m[1] ?? '');
  const names = [...SPEC.matchAll(/toHaveScreenshot\('golden-([a-z0-9-]+)\.png'/g)].map(
    (m) => m[1] ?? '',
  );
  // The six square rows the round's shadow re-fit must cover (rooms come after, via roomReady).
  expect(queries).toHaveLength(6);
  expect(names).toEqual(['noon', 'white-night', 's1-noon', 'dec-night', 'dec-noon', 'oct-night']);

  const worldUp = new THREE.Vector3(0, 1, 0);
  const rig = new THREE.Vector3(0, 0, SUN_SHADOW_FIT.centreZ);
  /** basis = lookAt(L, R, up)⁻¹ (rotation-only; applies a RIG-REDUCED world point). */
  const basis = (dir: readonly [number, number, number]): THREE.Matrix4 =>
    new THREE.Matrix4()
      .lookAt(rig.clone().addScaledVector(new THREE.Vector3(...dir), 1000), rig, worldUp)
      .invert();

  const inFootprint = (
    basis: THREE.Matrix4,
    sar: readonly [number, number, number],
    label: string,
  ): void => {
    const q = new THREE.Vector3(...sar).sub(rig).applyMatrix4(basis);
    const depth = 1000 - q.z;
    expect(Math.abs(q.x), `${label} lateral x`).toBeLessThanOrEqual(SUN_SHADOW_FIT.right);
    expect(Math.abs(q.y), `${label} lateral y`).toBeLessThanOrEqual(SUN_SHADOW_FIT.top);
    expect(depth, `${label} depth from the light`).toBeGreaterThanOrEqual(SUN_SHADOW_FIT.near);
    expect(depth, `${label} depth from the light`).toBeLessThanOrEqual(SUN_SHADOW_FIT.far);
  };

  for (const [i, name] of names.entries()) {
    const query = queries[i] ?? '';
    const at = /at=([^&']+)/.exec(query)?.[1] ?? '';
    it(`${name} (${at}): the base and the finial's ground shadow sit in the ±130 box`, () => {
      const s = sampleSky(Date.parse(at));
      const dir = s.sunDirection; // component-wise: |dir| = 1
      const m = basis(dir);
      // P1 — the Column's base: covered at EVERY instant, the three sun-below-horizon rows too.
      inFootprint(m, [0, 0, 190], 'the base');
      // P2 — where the 47.5 m finial's shadow lands: from (0, 47.5, 190) along f = −dir until
      // y = 0, i.e. t = 47.5 / dir.y. Only a sun ABOVE the horizon (dir.y > 0) makes t a real
      // downward step; at the three intensity-0 instants (white-night −6.6°, the two nights)
      // the direction lies below the horizon, the ray rises, and no ground tip exists to assert.
      const t = COLUMN_TOTAL_HEIGHT_M / (dir[1] ?? Number.NaN);
      if (Number.isFinite(t) && t > 0) {
        expect(s.atmosphere.sunIntensity, 'a sunlit instant').toBeGreaterThan(0);
        inFootprint(
          m,
          [-(dir[0] ?? 0) * t, 0, 190 - (dir[2] ?? 0) * t],
          'the finial-shadow ground point',
        );
      } else {
        // measured: the three rows' sun intensities are 0 — the skip is the physics, not a miss.
        expect(s.atmosphere.sunIntensity, 'the skipped tip row is a night instant').toBe(0);
      }
    });
  }
});

describe('9 · the era and the source key', () => {
  it('commits post-1834 and cites the wiki-ru key', () => {
    expect(COLUMN_ERA).toBe('post-1834');
    expect(COLUMN_SOURCE).toBe('wiki-ru');
  });

  it('borrows the SourceKey type from the facade-spec typing header (brief 9 §10)', () => {
    const spec = readFileSync('src/content/facade-spec.ts', 'utf8');
    expect(spec).toMatch(/export type SourceKey =\s*\|\s*'wiki-ru'/); // 'wiki-ru' IS a member
    const column = readFileSync('src/world/column.ts', 'utf8');
    expect(column).toMatch(/import type \{ SourceKey \} from '\.\.\/content\/facade-spec';/);
  });
});
