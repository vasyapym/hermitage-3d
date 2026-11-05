/**
 * DEC-038 — the Alexander Column's bronze fence (Part A): the sourced law, the build, the wiring,
 * the rail's corrected clearance, the shadow box and the golden declarations.
 */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { samplePosition } from '../src/camera/rail';
import { SQUARE_RAIL, SQUARE_S0_GAZE, SQUARE_S1_GAZE } from '../src/camera/square-rail';
import { buildColumnFence, setColumnFenceOpacity } from '../src/procedural/column-fence';
import { sampleSky } from '../src/sky/appearance';
import {
  type ArrivalState,
  advanceArrival,
  initialArrival,
  presentationForArrival,
} from '../src/sky/arrival';
import {
  BRONZE_PATINA_LINEAR,
  COLUMN_FENCE,
  COLUMN_PLINTH,
  COLUMN_X,
  COLUMN_Z,
  SUN_SHADOW_FIT,
} from '../src/world/column';
import {
  COLUMN_FENCE_BOUNDS,
  COLUMN_FENCE_EAGLES,
  COLUMN_FENCE_GATE_CELLS,
  COLUMN_FENCE_GATE_GUN_S,
  COLUMN_FENCE_GATE_M,
  COLUMN_FENCE_GUN,
  COLUMN_FENCE_GUN_COUNT,
  COLUMN_FENCE_HALF_SIDE_M,
  COLUMN_FENCE_LINE_M,
  COLUMN_FENCE_PART_TRIANGLES,
  COLUMN_FENCE_PITCH_M,
  COLUMN_FENCE_RAIL_CLEARANCE_M,
  COLUMN_FENCE_RUN_CELLS,
  COLUMN_FENCE_SIDE_CLEAR_M,
  COLUMN_FENCE_SOURCE,
  COLUMN_FENCE_STAFF,
  COLUMN_FENCE_STAFFS_PER_SIDE,
  COLUMN_FENCE_TIE,
  COLUMN_FENCE_TRIANGLE_CEILING,
  COLUMN_FENCE_TRIANGLES,
  columnFenceGunStations,
  columnFenceSideOffsets,
  columnFenceStaffStations,
  columnFenceTies,
} from '../src/world/column-fence';
import { laneValue } from '../src/world/ground-snow';

type V3 = readonly [number, number, number];
const RAD = Math.PI / 180;
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const stopAt = (i: number) => {
  const s = SQUARE_RAIL.stops[i];
  if (!s) throw new Error(`square stop ${i} missing`);
  return s;
};
const B = COLUMN_FENCE_BOUNDS;

/** The sourced envelope's eight world corners. */
const CORNERS: readonly V3[] = [B.minX, B.maxX].flatMap((x) =>
  [0, B.topY].flatMap((y) => [B.minZ, B.maxZ].map((z): V3 => [x, y, z])),
);

describe('1 · the sourced envelope, by reference', () => {
  it('reads 16.5 × 16.5 × 1.5 from the column law and centres it on the Column axis', () => {
    expect(COLUMN_FENCE).toEqual({ sideM: 16.5, heightM: 1.5 });
    expect(COLUMN_FENCE_SOURCE).toBe('wiki-ru');
    expect(COLUMN_FENCE_HALF_SIDE_M).toBe(8.25);
    expect(B).toEqual({
      minX: -8.25,
      maxX: 8.25,
      minZ: 181.75,
      maxZ: 198.25,
      topY: 1.5,
    });
    expect(Math.hypot(COLUMN_FENCE_HALF_SIDE_M, COLUMN_FENCE_HALF_SIDE_M)).toBeCloseTo(11.67, 2);
  });

  it('stands clear of the plinth and below every stop eye (its top never meets the sky)', () => {
    expect(COLUMN_FENCE_LINE_M - COLUMN_FENCE_GUN.radiusM).toBeGreaterThan(
      COLUMN_PLINTH.footprintM / 2,
    );
    for (const stop of SQUARE_RAIL.stops) {
      expect(COLUMN_FENCE.heightM, stop.id).toBeLessThan(stop.position[1]);
    }
  });
});

describe('2 · the sourced counts', () => {
  it('12 guns = 4 corners + 2 per gate on 4 sides; 136 staffs = the 136 eagles, 34 a side', () => {
    expect(COLUMN_FENCE_GUN_COUNT).toBe(12);
    expect(columnFenceGunStations()).toHaveLength(COLUMN_FENCE_GUN_COUNT);
    expect(COLUMN_FENCE_EAGLES).toBe(136);
    expect(COLUMN_FENCE_STAFFS_PER_SIDE).toBe(34);
    expect(columnFenceStaffStations()).toHaveLength(COLUMN_FENCE_EAGLES);
    expect(columnFenceSideOffsets()).toHaveLength(COLUMN_FENCE_STAFFS_PER_SIDE);
    expect(COLUMN_FENCE_GATE_CELLS % 2).toBe(0); // the double-leaf gate: two equal leaves
    expect(COLUMN_FENCE_RUN_CELLS).toBe(14);
    expect(2 * COLUMN_FENCE_RUN_CELLS + COLUMN_FENCE_GATE_CELLS).toBe(COLUMN_FENCE_STAFFS_PER_SIDE);
    expect(columnFenceTies()).toHaveLength(8);
  });
});

describe('3 · the derived rhythm and the stations', () => {
  const r = COLUMN_FENCE_GUN.radiusM;
  const p = COLUMN_FENCE_PITCH_M;

  it('derives the line 8.1, the clear side 15.3, the pitch 0.45, the gate 2.7, the runs 6.3', () => {
    expect(COLUMN_FENCE_LINE_M).toBeCloseTo(8.1, 12);
    expect(COLUMN_FENCE_SIDE_CLEAR_M).toBeCloseTo(15.3, 12);
    expect(p).toBeCloseTo(0.45, 12);
    expect(COLUMN_FENCE_GATE_M).toBeCloseTo(2.7, 12);
    expect(COLUMN_FENCE_RUN_CELLS * p).toBeCloseTo(6.3, 12);
    expect(COLUMN_FENCE_GATE_GUN_S).toBeCloseTo(1.5, 12);
  });

  it('spaces a side symmetric: 31 gaps of one pitch, the 2 gate guns one pitch + one gun wide', () => {
    const s = columnFenceSideOffsets();
    for (let k = 0; k < s.length; k++) {
      expect((s[k] ?? Number.NaN) + (s[s.length - 1 - k] ?? Number.NaN)).toBeCloseTo(0, 12);
    }
    const gaps = s.slice(1).map((v, k) => v - (s[k] ?? Number.NaN));
    expect(gaps.filter((g) => Math.abs(g - p) < 1e-9)).toHaveLength(31);
    expect(gaps.filter((g) => Math.abs(g - (p + 2 * r)) < 1e-9)).toHaveLength(2);
    expect((s[0] ?? Number.NaN) - (-COLUMN_FENCE_LINE_M + r)).toBeCloseTo(p / 2, 12);
  });

  it('puts the guns at the corners and 1.5 m either side of every side midpoint', () => {
    const key = ([x, z]: readonly [number, number]): string => `${x.toFixed(6)},${z.toFixed(6)}`;
    const stations = new Set(columnFenceGunStations().map(key));
    expect(stations.size).toBe(12);
    const l = COLUMN_FENCE_LINE_M;
    const g = COLUMN_FENCE_GATE_GUN_S;
    const expected: ReadonlyArray<readonly [number, number]> = [
      [-l, -l],
      [l, -l],
      [-l, l],
      [l, l],
      [-g, -l],
      [g, -l],
      [-g, l],
      [g, l],
      [-l, -g],
      [-l, g],
      [l, -g],
      [l, g],
    ];
    for (const station of expected) {
      expect(stations.has(key(station)), key(station)).toBe(true);
    }
  });

  it('keeps every staff on the railing line, clear of every gun by half a cell', () => {
    const guns = columnFenceGunStations();
    let nearest = Number.POSITIVE_INFINITY;
    for (const [x, z] of columnFenceStaffStations()) {
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeCloseTo(COLUMN_FENCE_LINE_M, 12);
      for (const [gx, gz] of guns) nearest = Math.min(nearest, Math.hypot(x - gx, z - gz));
    }
    expect(nearest).toBeCloseTo(r + p / 2, 9); // 0.375
    expect(nearest).toBeGreaterThan(r + COLUMN_FENCE_STAFF.radiusM);
  });

  it('frames each side with two ties, corner axis to corner axis, the staffs 0.12 m clear', () => {
    const ties = columnFenceTies();
    expect(ties.map((t) => t.centre[1]).sort((a, b) => a - b)).toEqual([
      0.15, 0.15, 0.15, 0.15, 1.35, 1.35, 1.35, 1.35,
    ]);
    for (const { centre, size } of ties) {
      expect(Math.max(Math.abs(centre[0]), Math.abs(centre[2]))).toBeCloseTo(
        COLUMN_FENCE_LINE_M,
        12,
      );
      expect(Math.max(size[0], size[2])).toBeCloseTo(2 * COLUMN_FENCE_LINE_M, 12);
      expect(Math.min(size[0], size[2])).toBe(COLUMN_FENCE_TIE.sideM);
      expect(size[1]).toBe(COLUMN_FENCE_TIE.sideM);
    }
    const frameTop = COLUMN_FENCE_TIE.upperY + COLUMN_FENCE_TIE.sideM / 2;
    expect(COLUMN_FENCE.heightM - frameTop).toBeCloseTo(0.12, 12);
  });
});

describe('4 · the built envelope', () => {
  it('fills exactly the sourced box — local x, z ∈ ±8.25, y ∈ [0, 1.5] — on the axis', () => {
    const build = buildColumnFence();
    build.mesh.geometry.computeBoundingBox();
    const box = build.mesh.geometry.boundingBox;
    if (!box) throw new Error('the fence geometry has no bounding box');
    expect(box.min.x).toBeCloseTo(-COLUMN_FENCE_HALF_SIDE_M, 5);
    expect(box.max.x).toBeCloseTo(COLUMN_FENCE_HALF_SIDE_M, 5);
    expect(box.min.z).toBeCloseTo(-COLUMN_FENCE_HALF_SIDE_M, 5);
    expect(box.max.z).toBeCloseTo(COLUMN_FENCE_HALF_SIDE_M, 5);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(COLUMN_FENCE.heightM, 6);
    expect(build.mesh.position.toArray()).toEqual([COLUMN_X, 0, COLUMN_Z]);
  });
});

describe('5 · one draw, one material, the exact count', () => {
  const build = buildColumnFence();

  it('builds 1,568 triangles — 384 guns + 1,088 staffs + 96 ties — under the 2,000 ceiling', () => {
    expect(COLUMN_FENCE_PART_TRIANGLES).toEqual({ guns: 384, staffs: 1088, ties: 96 });
    expect(COLUMN_FENCE_TRIANGLES).toBe(1568);
    expect(build.triangles).toBe(1568);
    expect(build.triangles).toBeLessThanOrEqual(COLUMN_FENCE_TRIANGLE_CEILING);
    expect(build.mesh.geometry.getAttribute('position').count).toBe(1568 * 3);
  });

  it('is one mesh, one Lambert in the borrowed bronze, no vertex colours, no program key', () => {
    expect(build.mesh.children).toHaveLength(0);
    expect(build.mesh.geometry.groups).toHaveLength(0);
    expect(build.mesh.geometry.index).toBeNull();
    expect(build.mesh.geometry.hasAttribute('color')).toBe(false);
    expect(build.mesh.material).toBe(build.material);
    expect(build.material).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(build.material.vertexColors).toBe(false);
    expect(build.material.color.toArray()).toEqual([...BRONZE_PATINA_LINEAR]);
    expect(build.material.transparent).toBe(true);
    expect(build.material.opacity).toBe(0);
    expect(build.material.onBeforeCompile).toBe(THREE.Material.prototype.onBeforeCompile);
    expect(build.material.customProgramCacheKey).toBe(
      THREE.Material.prototype.customProgramCacheKey,
    );
    expect(build.mesh.castShadow).toBe(true);
    expect(build.mesh.receiveShadow).toBe(true);
    expect(build.mesh.name).toBe('AlexanderColumnFence');
    expect(build.material.name).toBe('ColumnFenceBronze');
  });
});

describe('6 · the law stays pure; its numbers are borrowed, not copied', () => {
  const stripComments = (raw: string): string =>
    raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const stripLiterals = (raw: string): string =>
    stripComments(raw)
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  const law = readFileSync('src/world/column-fence.ts', 'utf8');
  const builder = readFileSync('src/procedural/column-fence.ts', 'utf8');

  it('src/world/column-fence.ts imports no three or node, touches no DOM, clock or randomness', () => {
    const imports = stripComments(law);
    expect(imports).not.toMatch(/from\s+['"]three/);
    expect(imports).not.toMatch(/import\s*\(\s*['"]three/);
    expect(imports).not.toMatch(/['"]node:/);
    const code = stripLiterals(law);
    for (const pattern of [
      /document/,
      /window/,
      /localStorage/,
      /performance/,
      /\bDate\b/,
      /setTimeout/,
      /Math\.random/,
    ]) {
      expect(code).not.toMatch(pattern);
    }
  });

  it('reads the envelope and the axis from the column law, the source key from facade-spec', () => {
    expect(law).toMatch(/import type \{ SourceKey \} from '\.\.\/content\/facade-spec';/);
    expect(law).toMatch(/import \{ COLUMN_FENCE, COLUMN_X, COLUMN_Z \} from '\.\/column';/);
    const code = stripLiterals(law);
    for (const copied of [/\b16\.5\b/, /\b8\.25\b/, /\b190\b/, /\b1\.5\b/]) {
      expect(code).not.toMatch(copied);
    }
  });

  it('the builder borrows the bronze and never reads the granite (no invented base)', () => {
    expect(builder).toContain('BRONZE_PATINA_LINEAR');
    expect(builder).not.toContain('GRANITE');
    expect(stripLiterals(builder)).not.toMatch(/\b0\.09\b|\b0\.11\b/);
  });
});

describe('7 · the fade and the group', () => {
  it('equals the massing opacity at every arrival sample (both presentation modes)', () => {
    const build = buildColumnFence();
    for (const deterministic of [false, true]) {
      let state: ArrivalState = initialArrival();
      for (let frame = 0; frame < 64; frame++) {
        const { massingOpacity } = presentationForArrival(state, deterministic);
        setColumnFenceOpacity(build, massingOpacity);
        expect(build.material.opacity).toBe(massingOpacity);
        expect(build.material.transparent).toBe(massingOpacity < 1);
        state = advanceArrival(state, 16, true, deterministic);
      }
      expect(state.phase).toBe('settled');
    }
  });

  it('rides the Column statement in applyPresentation and is a child of PalaceMassing', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(
      /setColumnOpacity\(alexanderColumn, presentation\.massingOpacity\);\s*setColumnFenceOpacity\(columnFence, presentation\.massingOpacity\);/,
    );
    expect(main).toContain('const columnFence = buildColumnFence();');
    const adds = [...main.matchAll(/palace\.add\(([^)]*)\)/g)].map((m) => m[1] ?? '');
    expect(adds.some((args) => args.includes('columnFence.mesh'))).toBe(true);
  });
});

describe('8 · the rail passes the fence (the corrected clearance read)', () => {
  const s0 = stopAt(0).position;
  const sh = stopAt(1).position;
  const s1 = stopAt(2).position;
  const [dx, dz] = [s1[0] - s0[0], s1[2] - s0[2]]; // (24, −106): the straight XZ rail
  const length = Math.hypot(dx, dz); // √11812
  const perpendicular = (x: number, z: number): number =>
    Math.abs(dx * (z - s0[2]) - dz * (x - s0[0])) / length;

  it('clears the NW corner by 4.70635 m and the SW by 8.34997 m; abeam 3.8046 m before Sh', () => {
    const nw = perpendicular(B.minX, B.minZ);
    expect(nw).toBeCloseTo(511.5 / Math.sqrt(11812), 12);
    expect(nw).toBeCloseTo(4.70635, 5);
    expect(perpendicular(B.minX, B.maxZ)).toBeCloseTo(907.5 / Math.sqrt(11812), 12);
    expect(perpendicular(B.minX, B.maxZ)).toBeCloseTo(8.34997, 5);
    expect(nw).toBeGreaterThanOrEqual(COLUMN_FENCE_RAIL_CLEARANCE_M);
    const along = (x: number, z: number): number =>
      ((x - s0[0]) * dx + (z - s0[2]) * dz) / (length * length);
    const t = along(B.minX, B.minZ);
    expect(t).toBeCloseTo(5492.5 / 11812, 12);
    expect(s0[0] + t * dx).toBeCloseTo(-12.84016, 5);
    expect(s0[2] + t * dz).toBeCloseTo(180.71072, 5);
    expect(along(sh[0], sh[2])).toBeCloseTo(0.5, 12);
    expect((along(sh[0], sh[2]) - t) * length).toBeCloseTo(3.80464, 5);
  });

  it('keeps every sampled rail point ≥ COLUMN_FENCE_RAIL_CLEARANCE_M from the envelope', () => {
    let nearest = Number.POSITIVE_INFINITY;
    for (let k = 0; k <= 512; k++) {
      const at = samplePosition(SQUARE_RAIL, k / 512);
      const x = at[0] ?? Number.NaN;
      const z = at[2] ?? Number.NaN;
      const ox = Math.max(B.minX - x, 0, x - B.maxX);
      const oz = Math.max(B.minZ - z, 0, z - B.maxZ);
      nearest = Math.min(nearest, Math.hypot(ox, oz));
    }
    expect(nearest).toBeGreaterThanOrEqual(COLUMN_FENCE_RAIL_CLEARANCE_M);
    expect(nearest).toBeCloseTo(4.706, 2);
  });
});

describe('9 · the shadow box holds the fence for every sun direction', () => {
  it('its farthest corner lies 103.59 m from the rig: inside ±130 laterally, depth in range', () => {
    // Column test 8's frame: in any orthonormal light basis the laterals obey |x|, |y| ≤ |P − R|,
    // and the depth 1000 − dot(P − R, sunDirection) stays within 1000 ± |P − R| (main.ts's
    // SUN_DISTANCE 1000) — so one distance bound covers every instant, the nights included.
    const rig: V3 = [0, 0, SUN_SHADOW_FIT.centreZ];
    const far = Math.max(
      ...CORNERS.map((c) => Math.hypot(c[0] - rig[0], c[1] - rig[1], c[2] - rig[2])),
    );
    expect(far).toBeCloseTo(103.59, 2);
    expect(far).toBeLessThan(
      Math.min(
        SUN_SHADOW_FIT.right,
        -SUN_SHADOW_FIT.left,
        SUN_SHADOW_FIT.top,
        -SUN_SHADOW_FIT.bottom,
      ),
    );
    expect(1000 - far).toBeGreaterThanOrEqual(SUN_SHADOW_FIT.near);
    expect(1000 + far).toBeLessThanOrEqual(SUN_SHADOW_FIT.far);
  });
});

describe('10 · the golden declarations', () => {
  const tanHalf = Math.tan(27.5 * RAD);
  const hfovHalf = Math.atan(tanHalf * (1280 / 720));

  it('enters the S0 frame whole — the five S0 goldens gain it and re-baseline', () => {
    // The column test's camera: S0's default gaze, fov 55, the golden 1280 × 720 frame.
    const eye = stopAt(0).position;
    const gaze = stopAt(0).subject ?? SQUARE_S0_GAZE;
    const [gx, gy, gz] = [gaze[0] - eye[0], gaze[1] - eye[1], gaze[2] - eye[2]];
    const b = Math.atan2(gx, -gz);
    const e = Math.atan2(gy, Math.hypot(gx, gz));
    const f: V3 = [Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e)];
    const r: V3 = [Math.cos(b), 0, Math.sin(b)];
    const u: V3 = [-Math.sin(b) * Math.sin(e), Math.cos(e), Math.cos(b) * Math.sin(e)];
    for (const c of CORNERS) {
      const q: V3 = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
      const depth = dot(q, f);
      expect(depth).toBeGreaterThan(0);
      expect(Math.abs(dot(q, r) / (depth * tanHalf * (1280 / 720)))).toBeLessThanOrEqual(1);
      expect(Math.abs(dot(q, u) / (depth * tanHalf))).toBeLessThanOrEqual(1);
    }
  });

  it('never enters an S1 frame inside its look limits, nor its s1-noon shadow — the HOLD', () => {
    const eye = stopAt(2).position;
    const gaze = stopAt(2).subject ?? SQUARE_S1_GAZE;
    const bearing = Math.atan2(gaze[0] - eye[0], -(gaze[2] - eye[2]));
    const dir = sampleSky(Date.parse('2026-06-21T12:00:00Z')).sunDirection;
    const up = dir[1] ?? Number.NaN;
    expect(up).toBeGreaterThan(0); // a sunlit instant: the fence casts a ground shadow
    const tips = CORNERS.filter((c) => c[1] > 0).map((c): V3 => {
      const t = c[1] / up;
      return [c[0] - (dir[0] ?? 0) * t, 0, c[2] - (dir[2] ?? 0) * t];
    });
    const reach = stopAt(2).look.yaw * RAD + hfovHalf;
    for (const p of [...CORNERS, ...tips]) {
      const off = Math.atan2(p[0] - eye[0], -(p[2] - eye[2])) - bearing;
      expect(Math.abs(Math.atan2(Math.sin(off), Math.cos(off)))).toBeGreaterThan(reach);
    }
  });
});

describe('11 · the trodden lane under the west railing (the recorded AMBI)', () => {
  it('the west side stands in the lane core, the east side outside the lane', () => {
    expect(laneValue(B.minX, COLUMN_Z)).toBe(1);
    expect(laneValue(B.maxX, COLUMN_Z)).toBe(0);
  });
});
