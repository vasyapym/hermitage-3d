/*
 * Snow cap — three.js builder for the winter cornice lip.
 *
 * Implements DEC-033 (winter) and docs/design-winter.md §2; the host feeds setSnow the season
 * law's weight (snowWeight(epochMs), src/world/snow-season.ts). Same pattern as
 * night-lattice.ts; the laws and shared constants live in src/world/snow-season.ts.
 *
 * Budget: ONE merged Mesh (one stock MeshStandardMaterial, no texture, no custom GLSL) in one
 * Group — +1 draw call in season, +0 out of season (hidden outright at wSnow === 0), no lights.
 * castShadow stays off so the shadow pass gains no call. The host adds the group to the palace
 * group, so the indoors flip is inherited for free.
 *
 * Geometry: the settled-snow profile — SNOW_SEGMENTS surface segments: a convex bulge rising
 * from the wall to SNOW_THICKNESS at the crown's outer edge, then rolling over it with
 * SNOW_OVERHANG of overhang down to the drip — extruded along each of the solver's UPPER
 * cornice-run placements (9 runs: 5 section fronts + 4 risalit returns; the lower band gets no
 * cap), carried by the placement matrix composed exactly as the kit composes its instance
 * matrices. The profile is seated SNOW_SINK inside the crown so no face is coplanar with it.
 *
 * Morph law: the base `position` attribute is the profile collapsed onto one sheet SNOW_SINK
 * inside the crown's top; morph target 0 is the full lip; morphTargetInfluences[0] = wSnow.
 * Built-in, deterministic; one program variant.
 */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three';
import {
  SNOW_ALBEDO_LINEAR,
  SNOW_METALNESS,
  SNOW_ROUGHNESS,
  snowVisible,
} from '../world/snow-season';
import { HQ_SNOW_LIP, HQ_SNOW_LIP_BAND } from '../world/square-kit';
import type { Placement, SolvedFacade } from './facade-solver';
import { KIT } from './facade-solver';

export type SnowCapSource = Pick<SolvedFacade, 'placements'>;

export type SnowCap = Readonly<{
  group: Group;
  mesh: Mesh;
  material: MeshStandardMaterial;
  runCount: number;
  triangles: number;
  setSnow: (wSnow: number) => void;
}>;

/** Profile point in the run's local frame: y relative to the crown's top face, z along its depth (0 = back/wall). */
export type ProfilePoint = Readonly<{ y: number; z: number }>;

/** The solver's upper band: ids are `${prefix}/cornice-upper/${index}` (tests/facade-solver.test.ts). */
export const UPPER_CORNICE_FRAGMENT = '/cornice-upper/';

/** Segments over the crown's top (wall → outer edge). */
export const SNOW_TOP_SEGMENTS = 4;

/** Segments rolling over the outer edge (edge → drip). */
export const SNOW_ROLL_SEGMENTS = 3;

/** Design §2: 6–8 surface segments. */
export const SNOW_SEGMENTS = SNOW_TOP_SEGMENTS + SNOW_ROLL_SEGMENTS;

/** TUNING TARGET (DEC-033): bulge thickness at the crown's edge, metres. Tuned by the owner's
 * verdict (2026-10-27): the design's 0.12 m was sub-pixel from the route (0.19 m/px at S0's
 * 230 m) — raised to the cornice-drift scale (wind piles 2–3× the ground depth on cornices;
 * real meteorology, within the license register's stylization). */
export const SNOW_THICKNESS = 0.5;

/** TUNING TARGET (DEC-033): overhang beyond the crown's outer edge, metres — proportional to the drift scale. */
export const SNOW_OVERHANG = 0.1;

/** TUNING TARGET (DEC-033): how far the drip hangs below the crown's top face, metres. */
export const SNOW_DROOP = 0.08;

/** The lip tapers to nothing this far ahead of the run's back plane: no face in the wall plane. */
export const SNOW_BACK_GAP = 0.02;

/** Design §2: the seat and the collapsed base sit this far inside the crown. */
export const SNOW_SINK = 0.01;

/** DEC-033 budget: the cap's triangle ceiling (+≤1,000 against the frame cap). */
export const SNOW_CAP_TRIANGLE_CEILING = 1000;

const SURFACE_POINTS = SNOW_SEGMENTS + 1;

const Y_AXIS = new Vector3(0, 1, 0);

type CrownFrame = Readonly<{ xMin: number; xMax: number; top: number; depth: number }>;

type Arrays = {
  base: number[];
  target: number[];
  normal: number[];
  index: number[];
  vertexCount: number;
};

function at<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`snow-cap: index ${index} out of range`);
  }
  return item;
}

function toVector3(v: Placement['position']): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

/** Mirrors the kit's instance matrix composition exactly. */
function placementMatrix(placement: Placement, out: Matrix4): Matrix4 {
  return out.compose(
    toVector3(placement.position),
    new Quaternion().setFromAxisAngle(Y_AXIS, placement.rotationY),
    toVector3(placement.scale),
  );
}

/** The cornice-run's local envelope: x centred, y from 0 to the crown top, z from 0 (back) to the outer edge. */
function crownFrame(): CrownFrame {
  const { min, max } = KIT['cornice-run'].localBounds;
  return { xMin: min.x, xMax: max.x, top: max.y, depth: max.z };
}

export function upperCorniceRuns(placements: readonly Placement[]): readonly Placement[] {
  return placements.filter(
    (placement) =>
      placement.partId === 'cornice-run' && placement.id.includes(UPPER_CORNICE_FRAGMENT),
  );
}

/**
 * The settled-snow profile as a closed loop: SURFACE_POINTS snow-surface points (wall taper →
 * bulge → edge → roll → drip), then the seated outer corner. Segments SURFACE_POINTS-1 and
 * SURFACE_POINTS are the contact faces (the overhang's underside, the seat).
 */
export function snowProfile(crownDepth: number): readonly ProfilePoint[] {
  if (!(crownDepth > SNOW_BACK_GAP + SNOW_SINK)) {
    throw new Error(`snow-cap: crown depth ${crownDepth} is too shallow for the lip`);
  }
  const seat = -SNOW_SINK;
  const loop: ProfilePoint[] = [];
  for (let i = 0; i <= SNOW_TOP_SEGMENTS; i += 1) {
    const s = i / SNOW_TOP_SEGMENTS;
    const v = 1 - s;
    // Superellipse quarter: zero at the wall, level at the edge — a convex bulge, C1 into the roll.
    const bulge = SNOW_THICKNESS * Math.cbrt(1 - v * v * v);
    loop.push({ z: SNOW_BACK_GAP + (crownDepth - SNOW_BACK_GAP) * s, y: seat + bulge });
  }
  const rollHeight = SNOW_THICKNESS + SNOW_DROOP;
  for (let j = 1; j <= SNOW_ROLL_SEGMENTS; j += 1) {
    const angle = (Math.PI / 2) * (1 - j / SNOW_ROLL_SEGMENTS);
    loop.push({
      z: crownDepth + SNOW_OVERHANG * Math.cos(angle),
      y: seat - SNOW_DROOP + rollHeight * Math.sin(angle),
    });
  }
  loop.push({ z: crownDepth, y: seat });
  return loop;
}

function snowMaterial(): MeshStandardMaterial {
  const [r, g, b] = SNOW_ALBEDO_LINEAR;
  const material = new MeshStandardMaterial({
    color: new Color().setRGB(r, g, b),
    roughness: SNOW_ROUGHNESS,
    metalness: SNOW_METALNESS,
  });
  material.name = 'snow-cap';
  return material;
}

function appendRun(
  arrays: Arrays,
  placement: Placement,
  crown: CrownFrame,
  profile: readonly ProfilePoint[],
  capFaces: readonly (readonly number[])[],
): void {
  const matrix = placementMatrix(placement, new Matrix4());
  const normalMatrix = new Matrix3().getNormalMatrix(matrix);
  const runStart = arrays.vertexCount;
  const local: Vector3[] = [];
  const emit = (x: number, p: ProfilePoint, n: Vector3): number => {
    const target = new Vector3(x, crown.top + p.y, p.z);
    local.push(target.clone());
    // The collapsed base: the whole profile on one sheet SNOW_SINK inside the crown's top, held
    // behind its outer face — nothing coplanar, nothing outside the solid.
    const base = new Vector3(x, crown.top - SNOW_SINK, Math.min(p.z, crown.depth - SNOW_SINK));
    target.applyMatrix4(matrix);
    base.applyMatrix4(matrix);
    const normal = n.clone().applyMatrix3(normalMatrix).normalize();
    arrays.target.push(target.x, target.y, target.z);
    arrays.base.push(base.x, base.y, base.z);
    arrays.normal.push(normal.x, normal.y, normal.z);
    arrays.vertexCount += 1;
    return arrays.vertexCount - 1;
  };
  // Winding follows the face normal; the placement scale is positive, so local orientation survives the carry.
  const tri = (a: number, b: number, c: number, outward: Vector3): void => {
    const pa = at(local, a - runStart);
    const ab = new Vector3().subVectors(at(local, b - runStart), pa);
    const ac = new Vector3().subVectors(at(local, c - runStart), pa);
    const flipped = ab.cross(ac).dot(outward) < 0;
    arrays.index.push(a, flipped ? c : b, flipped ? b : c);
  };
  // Outward normal of loop segment i (profile[i] → profile[i+1]) in the profile plane: the solid
  // lies to the right of travel, so outward is the left-hand perpendicular (0, dz, -dy).
  const segmentNormal = (i: number): Vector3 => {
    const a = at(profile, i);
    const b = at(profile, (i + 1) % profile.length);
    return new Vector3(0, b.z - a.z, -(b.y - a.y)).normalize();
  };
  // The snow surface: smooth normals (adjacent surface segments averaged), one strip.
  const nearRow: number[] = [];
  const farRow: number[] = [];
  for (let i = 0; i < SURFACE_POINTS; i += 1) {
    const n = new Vector3();
    if (i > 0) n.add(segmentNormal(i - 1));
    if (i < SURFACE_POINTS - 1) n.add(segmentNormal(i));
    n.normalize();
    const p = at(profile, i);
    nearRow.push(emit(crown.xMin, p, n));
    farRow.push(emit(crown.xMax, p, n));
  }
  for (let i = 0; i < SNOW_SEGMENTS; i += 1) {
    const n = segmentNormal(i);
    tri(at(nearRow, i), at(farRow, i), at(farRow, i + 1), n);
    tri(at(nearRow, i), at(farRow, i + 1), at(nearRow, i + 1), n);
  }
  // The two contact faces (the overhang's underside, the seat): flat, hard-edged, own vertices.
  for (let i = SURFACE_POINTS - 1; i < profile.length; i += 1) {
    const n = segmentNormal(i);
    const a = at(profile, i);
    const b = at(profile, (i + 1) % profile.length);
    const na = emit(crown.xMin, a, n);
    const fa = emit(crown.xMax, a, n);
    const nb = emit(crown.xMin, b, n);
    const fb = emit(crown.xMax, b, n);
    tri(na, fa, fb, n);
    tri(na, fb, nb, n);
  }
  // End caps: the whole profile, flat ±x normals.
  for (const [x, direction] of [
    [crown.xMin, -1],
    [crown.xMax, 1],
  ] as const) {
    const n = new Vector3(direction, 0, 0);
    const first = arrays.vertexCount;
    for (const p of profile) emit(x, p, n);
    for (const face of capFaces) {
      const [a, b, c] = face;
      if (a === undefined || b === undefined || c === undefined) {
        throw new Error('snow-cap: degenerate cap triangle');
      }
      tri(first + a, first + b, first + c, n);
    }
  }
}

/**
 * The HQ cornice lip (the square-next-2 round): ONE box strip merged into the cap's morph
 * geometry — the base collapsed strictly inside the cornice band (HQ_SNOW_LIP_BAND, the seat
 * SNOW_SINK below the band's top), the target the full HQ_SNOW_LIP box — so the wSnow gate and
 * the morph ride the cap's own group/mesh: +0 draw calls, +12 tris. The palace lip's own base
 * law (a flat sheet inside the solid, nothing coplanar) is mirrored per axis.
 */
function appendHqLip(arrays: Arrays): void {
  const [minX, minY, minZ] = HQ_SNOW_LIP.min;
  const [maxX, maxY, maxZ] = HQ_SNOW_LIP.max;
  const seatY = minY - SNOW_SINK;
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  // Six axis-aligned faces, four flat vertices each, wound outward by construction.
  const faces: ReadonlyArray<{
    corners: ReadonlyArray<readonly [number, number, number]>;
    n: readonly [number, number, number];
  }> = [
    {
      corners: [
        [minX, minY, minZ],
        [minX, minY, maxZ],
        [minX, maxY, maxZ],
        [minX, maxY, minZ],
      ],
      n: [-1, 0, 0],
    },
    {
      corners: [
        [maxX, minY, maxZ],
        [maxX, minY, minZ],
        [maxX, maxY, minZ],
        [maxX, maxY, maxZ],
      ],
      n: [1, 0, 0],
    },
    {
      corners: [
        [minX, maxY, minZ],
        [minX, maxY, maxZ],
        [maxX, maxY, maxZ],
        [maxX, maxY, minZ],
      ],
      n: [0, 1, 0],
    },
    {
      corners: [
        [minX, minY, maxZ],
        [minX, minY, minZ],
        [maxX, minY, minZ],
        [maxX, minY, maxZ],
      ],
      n: [0, -1, 0],
    },
    {
      corners: [
        [minX, minY, maxZ],
        [maxX, minY, maxZ],
        [maxX, maxY, maxZ],
        [minX, maxY, maxZ],
      ],
      n: [0, 0, 1],
    },
    {
      corners: [
        [maxX, minY, minZ],
        [minX, minY, minZ],
        [minX, maxY, minZ],
        [maxX, maxY, minZ],
      ],
      n: [0, 0, -1],
    },
  ];
  for (const face of faces) {
    const start = arrays.vertexCount;
    for (const [x, y, z] of face.corners) {
      arrays.target.push(x, y, z);
      arrays.base.push(
        clamp(x, HQ_SNOW_LIP_BAND.xMin + SNOW_SINK, HQ_SNOW_LIP_BAND.xMax - SNOW_SINK),
        seatY,
        clamp(z, minZ + SNOW_SINK, maxZ - SNOW_SINK),
      );
      arrays.normal.push(face.n[0], face.n[1], face.n[2]);
      arrays.vertexCount += 1;
    }
    arrays.index.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

export function buildSnowCap(solved: SnowCapSource): SnowCap {
  const runs = upperCorniceRuns(solved.placements);
  if (runs.length === 0) {
    throw new Error('snow-cap: solved facade carries no upper cornice-run placements');
  }
  const crown = crownFrame();
  const profile = snowProfile(crown.depth);
  // The closed profile triangulated once in its own plane (z, y); both end caps reuse the faces.
  const capFaces = ShapeUtils.triangulateShape(
    profile.map((p) => new Vector2(p.z, p.y)),
    [],
  );
  const arrays: Arrays = { base: [], target: [], normal: [], index: [], vertexCount: 0 };
  for (const run of runs) {
    appendRun(arrays, run, crown, profile, capFaces);
  }
  // The square-next-2 round: the HQ cornice joins the ONE snow law (the merged morph strip).
  appendHqLip(arrays);
  const triangles = arrays.index.length / 3;
  if (triangles > SNOW_CAP_TRIANGLE_CEILING) {
    throw new Error(
      `snow-cap: ${triangles} triangles over the DEC-033 ceiling of ${SNOW_CAP_TRIANGLE_CEILING}`,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(arrays.base, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(arrays.normal, 3));
  geometry.setIndex(arrays.index);
  const lip = new Float32BufferAttribute(arrays.target, 3);
  lip.name = 'snow-lip';
  geometry.morphAttributes.position = [lip];
  geometry.morphTargetsRelative = false;
  // Bounds union the base and the morph target: the collapsed base lies strictly inside the lip.
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = snowMaterial();
  const mesh = new Mesh(geometry, material);
  mesh.name = 'snow-cap';
  // No shadow caster: the shadow pass gains no call, so the season costs exactly +1 draw call.
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const influences = [0];
  mesh.morphTargetInfluences = influences;
  const group = new Group();
  group.name = 'snow-cap';
  group.add(mesh);
  const setSnow = (wSnow: number): void => {
    group.visible = snowVisible(wSnow);
    influences[0] = wSnow;
  };
  setSnow(0);
  return { group, mesh, material, runCount: runs.length, triangles, setSnow };
}
