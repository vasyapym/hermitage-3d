/*
 * Night lattice — three.js builder for the palace window panes.
 *
 * Implements DEC-019 (night windows) and ROADMAP Phase 2b; the host feeds setNight the frozen
 * §8 weight of design-sky-time.md (lightmapWeights(elev).nightChandeliers). Same pattern as
 * facade-builder.ts; the laws live in src/world/night-facade.ts.
 *
 * sq-arch-day B4 (the Q6 pick): the DAY pane class rides the SAME three stock materials —
 * the albedo's day endpoint via setNight(wNight, day) = paneDayAlbedo, and the sky tint AFTER
 * lighting through one onBeforeCompile patch on the shared program: out = mix(out, uSkyFill ×
 * uDomeK, E(h)·mix(0.20, 0.40, pow(1−NdotV, 3))). uSkyFill SHARES the hemi.color instance (no
 * per-frame copy) and uDomeK is the dome's K (DEC-043's snowSkyGain: 1.5 snow season, 1 else —
 * the pane reflects the dome, not the fill). At E = 0 the tint factor is exactly 0 and the
 * albedo law is paneBaseTone bit-exact: the DEC-048 night baseline holds. The DEC-019 lattice
 * geometry is untouched. Extends DEC-019/048/053.
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
  PANE_TINT_MAX,
  PANE_TINT_MIN,
  type PaneLevel,
  paneDayAlbedo,
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
  /** The night law + the sq-arch-day day class: the albedo is paneDayAlbedo(wNight, day) —
   * at day 0 (the default) exactly the committed paneBaseTone write. */
  setNight: (wNight: number, day?: number) => void;
  /** sq-arch-day B4: binds the day tint — uSkyFill SHARES the passed colour instance (the
   * hemi's), uDomeK is the dome's K. Called every applyEpoch after the fill write. */
  setDayTint: (skyFill: Color, domeK: number) => void;
  /** The presentation fade for the stock materials (the round-2 review fix): the HQ's pane
   * quads bound by reference fade with the wall; identity at settle (opacity 1, opaque). */
  setFade: (opacity: number) => void;
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

// --- sq-arch-day B4: the day pane tint --------------------------------------------------------

/** The shared day-tint uniforms' shape: mutable values — the host writes them per epoch. */
type PaneDayUniforms = {
  uSkyFill: { value: Color };
  uDomeK: { value: number };
  uPaneDay: { value: number };
};

/** The shared day-tint uniforms: ONE object for all three stock levels — uSkyFill is bound to
 * the hemi's colour INSTANCE by setDayTint (no per-frame copy), uDomeK is the dome's K. */
const PANE_DAY_UNIFORMS: PaneDayUniforms = {
  uSkyFill: { value: new Color(0, 0, 0) },
  uDomeK: { value: 1 },
  uPaneDay: { value: 0 },
};

const PANE_TINT_CACHE_KEY = 'Pane/day-tint@1';

/**
 * The day pane tint's shader patch (sq-arch-day B4): after lighting, before the opaque write,
 * the outgoing light mixes toward the sky fill by the E-gated, view-dependent factor. `normal`,
 * `vViewPosition` and `outgoingLight` are all in scope at three's `#include <opaque_fragment>`
 * in the standard material. Loud-fails if three renames the token (the repo's silent-noop law).
 */
export function patchPaneDayTint(shader: { fragmentShader: string }): void {
  const anchor = '#include <opaque_fragment>';
  const patch = `{
	float paneNdotV = clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );
	float paneTint = uPaneDay * mix( ${PANE_TINT_MIN}, ${PANE_TINT_MAX}, pow( 1.0 - paneNdotV, 3.0 ) );
	outgoingLight = mix( outgoingLight, uSkyFill * uDomeK, paneTint );
}
${anchor}`;
  const patched = shader.fragmentShader.replace(anchor, patch);
  if (patched === shader.fragmentShader) {
    throw new Error('panes: the day-tint patch found no <opaque_fragment> token');
  }
  shader.fragmentShader = patched;
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
  // sq-arch-day B4: the day tint rides the shared program — one patch, one cache key, the
  // three levels' differences stay uniforms (emissive colour/intensity, the albedo write).
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSkyFill = PANE_DAY_UNIFORMS.uSkyFill;
    shader.uniforms.uDomeK = PANE_DAY_UNIFORMS.uDomeK;
    shader.uniforms.uPaneDay = PANE_DAY_UNIFORMS.uPaneDay;
    patchPaneDayTint(shader);
  };
  material.customProgramCacheKey = (): string => PANE_TINT_CACHE_KEY;
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
  const setNight = (wNight: number, day = 0): void => {
    group.visible = latticeVisible(wNight);
    // sq-arch-day B4: the day class blends by E(h) — clamped at the ONE write site.
    PANE_DAY_UNIFORMS.uPaneDay.value = Math.min(1, Math.max(0, day));
    for (const level of PANE_LEVELS) {
      materials[level].emissiveIntensity = paneIntensity(level, wNight);
      // The hour law (the square-next-2 round) extended by the day class (sq-arch-day B4):
      // paneDayAlbedo is paneBaseTone bit-exact at day 0, PANE_DAY_ALBEDO at full day — the
      // no-checkerboard invariant holds at every w and every day.
      materials[level].color.setRGB(...paneDayAlbedo(wNight, day));
    }
  };
  const setDayTint = (skyFill: Color, domeK: number): void => {
    // sq-arch-day B4: uSkyFill SHARES the hemi's colour instance (no per-frame copy); the
    // shader multiplies it by uDomeK — the dome's K (1.5 snow season, 1 else), the pane
    // reflects the dome, not the fill. Idempotent: the same instance is bound every epoch.
    PANE_DAY_UNIFORMS.uSkyFill.value = skyFill;
    PANE_DAY_UNIFORMS.uDomeK.value = domeK;
  };
  const setFade = (opacity: number): void => {
    // The round-2 review fix: the pane stocks ride the presentation fade — the HQ's
    // dim/bright quads bound by reference must not outshine the wall mid-fade, and the
    // dark cards had the same mismatch. At settle this is the identity (opacity 1, opaque):
    // the det=1 golden captures never see a partial state.
    for (const level of PANE_LEVELS) {
      materials[level].opacity = opacity;
      materials[level].transparent = opacity < 1;
    }
  };
  setNight(0);
  return { group, meshes, materials, counts, levelById, setNight, setDayTint, setFade };
}
