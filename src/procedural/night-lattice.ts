/*
 * Night lattice — three.js builder for the palace window panes.
 *
 * Implements DEC-019 (night windows) and ROADMAP Phase 2b; the host feeds setNight the frozen
 * §8 weight of design-sky-time.md (lightmapWeights(elev).nightChandeliers). Same pattern as
 * facade-builder.ts; the laws live in src/world/night-facade.ts.
 *
 * Budget: three InstancedMesh (one per level, one shared stock MeshStandardMaterial each) in one
 * Group — +3 draw calls, no lights, no custom materials, no fourth lightmap state. The host adds
 * the group to the palace group, so the indoors flip is inherited for free.
 * The square-next round: all three stock levels share the ONE unlit albedo — the HQ kit's
 * window quads bind these materials at DAY too (the kit group is never hidden), so a per-level
 * base would print a checkerboard on the sunlit HQ face. The square-next-2 round makes that
 * base hour-driven: paneBaseTone(wNight) via setNight (DAY_PANE_TONE at day, DARK_PANE_TONE
 * bit-exact at w 1); setNight(0) at build seeds the day base.
 *
 * Geometry: a unit plane facing +z, scaled to surroundOpening(partId), centred on the recess
 * panel (x = 0, y = height / 2) a hair in front of its face (z = depth + PANE_STANDOFF), then
 * carried by the placement matrix composed exactly as the kit composes its instance matrices:
 *   compose(position, setFromAxisAngle(Y_AXIS, rotationY), scale).
 */
import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  StaticDrawUsage,
  Vector3,
} from 'three';
import {
  isSurroundPartId,
  latticeVisible,
  levelOf,
  PANE_BASE_TONE,
  PANE_LEVELS,
  PANE_STANDOFF,
  type PaneLevel,
  paneBaseTone,
  paneIntensity,
  WINDOW_WARM_LINEAR,
} from '../world/night-facade';
import { type SurroundOpening, surroundOpening } from './facade-builder';
import type { Placement, SolvedFacade } from './facade-solver';

export type LatticeSource = Pick<SolvedFacade, 'placements'>;
export type NightLattice = Readonly<{
  group: Group;
  meshes: Readonly<Record<PaneLevel, InstancedMesh>>;
  materials: Readonly<Record<PaneLevel, MeshStandardMaterial>>;
  counts: Readonly<Record<PaneLevel, number>>;
  levelById: ReadonlyMap<string, PaneLevel>;
  setNight: (wNight: number) => void;
}>;
type PartId = Placement['partId'];
type LevelBuild = Readonly<{ mesh: InstancedMesh; material: MeshStandardMaterial }>;
const Y_AXIS = new Vector3(0, 1, 0);
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
function paneLocalMatrix(opening: SurroundOpening): Matrix4 {
  const { width, height, depth } = opening;
  return new Matrix4()
    .makeTranslation(0, height / 2, depth + PANE_STANDOFF)
    .multiply(new Matrix4().makeScale(width, height, 1));
}
/** Loud failure: a surround part without an opening must consciously join the lattice. */
function openingFor(partId: PartId): SurroundOpening {
  let opening: SurroundOpening;
  try {
    opening = surroundOpening(partId);
  } catch {
    const hint = 'add its opening in facade-builder.ts before it joins the lattice';
    throw new Error(`night-lattice: surround part '${partId}' has no surroundOpening; ${hint}`);
  }
  if (!(opening.width > 0 && opening.height > 0 && opening.depth >= 0)) {
    throw new Error(`night-lattice: degenerate surroundOpening for '${partId}'`);
  }
  return opening;
}
function paneMaterial(level: PaneLevel): MeshStandardMaterial {
  const [r, g, b] = WINDOW_WARM_LINEAR;
  const emissive = level === 'dark' ? new Color(0, 0, 0) : new Color().setRGB(r, g, b);
  // Every stock level shares the ONE unlit albedo PANE_BASE_TONE (= DARK_PANE_TONE):
  // the HQ's window quads bind these same materials at DAY too (the kit group is never
  // hidden), and the dim/bright levels' old near-black RECESS_HEX base would print a
  // checkerboard on the sunlit west face (the square-next round's R1 disproof). The
  // warm hue stays the emissive's; the dark level keeps its zero-emissive law.
  const material = new MeshStandardMaterial({
    color: new Color().setRGB(...PANE_BASE_TONE),
    emissive,
    emissiveIntensity: 0,
    roughness: 1,
    metalness: 0,
  });
  material.name = `night-pane-${level}`;
  return material;
}
function buildLevel(
  level: PaneLevel,
  placements: readonly Placement[],
  localByPart: ReadonlyMap<PartId, Matrix4>,
  geometry: PlaneGeometry,
): LevelBuild {
  const material = paneMaterial(level);
  const mesh = new InstancedMesh(geometry, material, placements.length);
  mesh.name = `night-pane-${level}`;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const carrier = new Matrix4();
  const instance = new Matrix4();
  for (const [index, placement] of placements.entries()) {
    const local = localByPart.get(placement.partId);
    if (local === undefined) {
      throw new Error(`night-lattice: no pane frame for '${placement.partId}'`);
    }
    instance.multiplyMatrices(placementMatrix(placement, carrier), local);
    mesh.setMatrixAt(index, instance);
  }
  mesh.instanceMatrix.setUsage(StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.visible = placements.length > 0;
  return { mesh, material };
}
export function buildNightLattice(solved: LatticeSource): NightLattice {
  const buckets: Readonly<Record<PaneLevel, Placement[]>> = { dark: [], dim: [], bright: [] };
  const levelById = new Map<string, PaneLevel>();
  const localByPart = new Map<PartId, Matrix4>();
  for (const placement of solved.placements) {
    if (!isSurroundPartId(placement.partId)) {
      continue;
    }
    if (!localByPart.has(placement.partId)) {
      localByPart.set(placement.partId, paneLocalMatrix(openingFor(placement.partId)));
    }
    const level = levelOf(placement.id);
    buckets[level].push(placement);
    levelById.set(placement.id, level);
  }
  const geometry = new PlaneGeometry(1, 1);
  const dark = buildLevel('dark', buckets.dark, localByPart, geometry);
  const dim = buildLevel('dim', buckets.dim, localByPart, geometry);
  const bright = buildLevel('bright', buckets.bright, localByPart, geometry);
  const meshes = {
    dark: dark.mesh,
    dim: dim.mesh,
    bright: bright.mesh,
  } satisfies Readonly<Record<PaneLevel, InstancedMesh>>;
  const materials = {
    dark: dark.material,
    dim: dim.material,
    bright: bright.material,
  } satisfies Readonly<Record<PaneLevel, MeshStandardMaterial>>;
  const counts = {
    dark: dark.mesh.count,
    dim: dim.mesh.count,
    bright: bright.mesh.count,
  } satisfies Readonly<Record<PaneLevel, number>>;
  const group = new Group();
  group.name = 'night-lattice';
  for (const level of PANE_LEVELS) {
    group.add(meshes[level]);
  }
  const setNight = (wNight: number): void => {
    group.visible = latticeVisible(wNight);
    for (const level of PANE_LEVELS) {
      materials[level].emissiveIntensity = paneIntensity(level, wNight);
      // The hour law (the square-next-2 round): the ONE unlit albedo rides wNight — the day
      // glass tone at w 0 (the kit group is never hidden), DARK_PANE_TONE bit-exact at w 1.
      // All three levels take the SAME value: the no-checkerboard invariant holds at every w.
      materials[level].color.setRGB(...paneBaseTone(wNight));
    }
  };
  setNight(0);
  return { group, meshes, materials, counts, levelById, setNight };
}
