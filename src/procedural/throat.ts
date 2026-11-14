// src/procedural/throat.ts
/**
 * The throat builder — docs/design-walkthrough-ux.md §3 (resident throat), §11, §12 R-UX3; D2.
 * Two meshes in one group the host adds INTO the palace group (the indoor flip hides it the
 * frame a room mounts; the boot fade reaches it through setThroatOpacity):
 * - `lit`: vault, walls, floor and the mouth collar — Lambert + vertex albedo (src/world/throat.ts),
 *   lit by the square's sun and sky so the mouth follows the hour; receives the piers' shadows.
 * - `lamp`: the last run of vault and floor plus the far wall — unlit vertex radiance. The slab
 *   is constant light; E(h) is the eye: a faint warm spot at noon, the arch's glow at night.
 * Both are DoubleSide: the massing void encloses them so no back face is ever exposed, and the
 * winding cannot silently blank a capture-only validation. Zero textures, zero custom slots.
 * openGroundArch(): the kit's middle ground-arch instance (the dark slab that fills the opening
 * today) is collapsed to a zero matrix AFTER the build — the solver/kit law is untouched.
 */
import * as THREE from 'three';
import type { Pt, Rgb } from '../world/throat';
import {
  COLLAR_RGB,
  LAMP_STATIONS_M,
  LIT_STATIONS_M,
  lampRadiance,
  lampSlab,
  lampSpill,
  skyLitAlbedo,
  THROAT,
  THROAT_TRIANGLE_CEILING,
  THROAT_VOID,
  throatProfile,
} from '../world/throat';
import type { FacadeBuild } from './facade-builder';
import { countTriangles } from './facade-builder';
export type ThroatBuild = Readonly<{
  group: THREE.Group;
  lit: THREE.Mesh;
  lamp: THREE.Mesh;
  materials: readonly THREE.Material[];
  triangles: number;
}>;
type Vec = readonly [number, number, number];
/** Vertex colours, interleaved: rgb always; the lit run carries the lamp's forward spill as
 * the 4th component (itemSize 4) — the night gate's input under the shader patch. */
type Acc = {
  pos: number[];
  nrm: number[];
  col: number[];
  colSize: 3 | 4;
  idx: number[];
  count: number;
};
const newAcc = (colSize: 3 | 4 = 3): Acc => ({
  pos: [],
  nrm: [],
  col: [],
  colSize,
  idx: [],
  count: 0,
});
const at = <T>(xs: readonly T[], i: number): T => {
  const v = xs[i];
  if (v === undefined) throw new RangeError(`throat: no element ${i}`);
  return v;
};
function push(a: Acc, p: Vec, n: Vec, c: Rgb, alpha = 0): number {
  a.pos.push(p[0], p[1], p[2]);
  a.nrm.push(n[0], n[1], n[2]);
  a.col.push(c[0], c[1], c[2]);
  if (a.colSize === 4) a.col.push(alpha);
  return a.count++;
}
/** Inward normal of a profile point: the walls face across, the arc faces its centre. */
function inwardNormal(p: Pt): Vec {
  const [x, y] = p;
  if (y <= THROAT.springY + 1e-9) return [x < 0 ? 1 : -1, 0, 0];
  const r = Math.hypot(x, y - THROAT.springY);
  return [-x / r, -(y - THROAT.springY) / r, 0];
}
function profileRow(a: Acc, profile: readonly Pt[], depth: number, c: Rgb, alpha = 0): number {
  const base = a.count;
  const z = THROAT.mouthZ - depth;
  for (const p of profile) push(a, [p[0], p[1], z], inwardNormal(p), c, alpha);
  return base;
}
function floorRow(a: Acc, depth: number, c: Rgb, alpha = 0): number {
  const base = a.count;
  const z = THROAT.mouthZ - depth;
  push(a, [-THROAT.halfWidth, THROAT.floorLiftM, z], [0, 1, 0], c, alpha);
  push(a, [THROAT.halfWidth, THROAT.floorLiftM, z], [0, 1, 0], c, alpha);
  return base;
}
/** Strips the profile and the floor along the stations; colour is the per-station law, and the
 * optional spill law writes the lamp's forward spill into the vertex alpha (the night gate's
 * input — the material's emissive multiplies by it under the shader patch). */
function run(
  a: Acc,
  profile: readonly Pt[],
  st: readonly number[],
  shade: (d: number) => Rgb,
  spill?: (d: number) => number,
) {
  const n = profile.length;
  const alphaAt = (d: number): number => (spill === undefined ? 0 : spill(d));
  let prevP = profileRow(a, profile, at(st, 0), shade(at(st, 0)), alphaAt(at(st, 0)));
  let prevF = floorRow(a, at(st, 0), shade(at(st, 0)), alphaAt(at(st, 0)));
  for (let k = 1; k < st.length; k++) {
    const d = at(st, k);
    const rowP = profileRow(a, profile, d, shade(d), alphaAt(d));
    const rowF = floorRow(a, d, shade(d), alphaAt(d));
    for (let i = 0; i < n - 1; i++) {
      // near i → far i → far i+1 → near i+1: inward for a profile walked up, over and down.
      a.idx.push(prevP + i, rowP + i, rowP + i + 1, prevP + i, rowP + i + 1, prevP + i + 1);
    }
    a.idx.push(prevF, prevF + 1, rowF + 1, prevF, rowF + 1, rowF);
    prevP = rowP;
    prevF = rowF;
  }
}
/** The warm slab: a fan over the profile at the far depth, facing the mouth. */
function endWall(a: Acc, profile: readonly Pt[], c: Rgb): void {
  const base = profileRow(a, profile, THROAT.depthM, c);
  for (let i = 1; i < profile.length - 1; i++) a.idx.push(base, base + i + 1, base + i);
}
/** The mouth collar: the void rectangle minus the vault profile — the dark reveal. */
function collar(a: Acc, profile: readonly Pt[]): void {
  const { halfWidth: vw, topY: vt } = THROAT_VOID;
  const shape = new THREE.Shape();
  shape.moveTo(-vw, 0);
  shape.lineTo(-vw, vt);
  shape.lineTo(vw, vt);
  shape.lineTo(vw, 0);
  for (let i = profile.length - 1; i >= 0; i--) shape.lineTo(at(profile, i)[0], at(profile, i)[1]);
  const g = new THREE.ShapeGeometry(shape);
  const p = g.getAttribute('position');
  const idx = g.getIndex();
  if (idx === null) throw new Error('throat: ShapeGeometry carries no index');
  const base = a.count;
  const z = THROAT.mouthZ - THROAT.collarSetbackM;
  for (let i = 0; i < p.count; i++) push(a, [p.getX(i), p.getY(i), z], [0, 0, 1], COLLAR_RGB);
  for (let i = 0; i < idx.count; i++) a.idx.push(base + idx.getX(i));
  g.dispose();
}
function toGeometry(a: Acc): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, a.colSize));
  g.setIndex(a.idx);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
/**
 * The throat lit shader's night-spill patch: the vertex alpha (the lamp's forward spill,
 * itemSize 4) gates the material's emissive, and the fragment alpha is restored to the
 * material's own opacity so the massing fade law stays bit-exact. `totalEmissiveRadiance`
 * is declared before `color_fragment` in three's Lambert shader, so one splice carries
 * both statements. Loud-fails if three renames a token (the repo's silent-noop law).
 */
export function patchThroatLitShader(shader: { fragmentShader: string }): void {
  const patched = shader.fragmentShader.replace(
    '#include <color_fragment>',
    '#include <color_fragment>\n\ttotalEmissiveRadiance *= vColor.a;\n\tdiffuseColor.a = opacity;',
  );
  if (patched === shader.fragmentShader) {
    throw new Error('throat: the lit-shader patch found no <color_fragment> token');
  }
  shader.fragmentShader = patched;
}
export function buildThroat(): ThroatBuild {
  const profile = throatProfile();
  const litAcc = newAcc(4);
  run(litAcc, profile, LIT_STATIONS_M, skyLitAlbedo, lampSpill);
  collar(litAcc, profile);
  const lampAcc = newAcc();
  run(lampAcc, profile, LAMP_STATIONS_M, lampRadiance);
  endWall(lampAcc, profile, lampSlab());
  // Opacity 0 at build: the host fades the throat in with the massing (applyPresentation).
  // The emissive carries the lamp slab at intensity 0 — the night gate (setThroatNightSpill)
  // turns the forward spill on with the lattice weight; the shader patch multiplies it by
  // the vertex alpha, so day stays bit-identical (intensity 0) and the fade law survives.
  const litMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color(lampSlab()[0], lampSlab()[1], lampSlab()[2]),
    emissiveIntensity: 0,
  });
  litMaterial.name = 'ThroatLit';
  litMaterial.onBeforeCompile = (s) => patchThroatLitShader(s);
  const lampMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  });
  lampMaterial.name = 'ThroatLamp';
  const lit = new THREE.Mesh(toGeometry(litAcc), litMaterial);
  lit.name = 'ThroatLit';
  lit.receiveShadow = true;
  const lamp = new THREE.Mesh(toGeometry(lampAcc), lampMaterial);
  lamp.name = 'ThroatLamp';
  const triangles = countTriangles(lit.geometry) + countTriangles(lamp.geometry);
  if (triangles > THROAT_TRIANGLE_CEILING) {
    throw new Error(`throat: ${triangles} triangles, ceiling is ${THROAT_TRIANGLE_CEILING}`);
  }
  const group = new THREE.Group();
  group.name = 'Throat';
  group.add(lit, lamp);
  return Object.freeze({
    group,
    lit,
    lamp,
    materials: Object.freeze([litMaterial, lampMaterial]),
    triangles,
  });
}
/** The massing fade's reach (opaque once settled, like the kit). */
export function setThroatOpacity(build: ThroatBuild, opacity: number): void {
  for (const m of build.materials) {
    m.opacity = opacity;
    m.transparent = opacity < 1;
  }
}
/** The night gate: the lamp's forward spill rides the same switch that removes the crown's
 * ground bounce (the lattice weight) — 0 all day, 1 through the night plateau. */
export function setThroatNightSpill(build: ThroatBuild, wNight: number): void {
  (build.lit.material as THREE.MeshLambertMaterial).emissiveIntensity = wNight;
}
const VOID_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
/** Collapses the ground-arch instance centred at `centreX` — the slab the throat replaces. */
export function openGroundArch(facade: FacadeBuild, centreX = 0): void {
  const mesh = facade.meshes.find((m) => m.name === 'ground-arch');
  if (mesh === undefined) throw new Error('throat: the kit carries no ground-arch mesh');
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  let voided = 0;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    if (Math.abs(p.x - centreX) < 1e-3) {
      mesh.setMatrixAt(i, VOID_MATRIX);
      voided++;
    }
  }
  if (voided !== 1) throw new Error(`throat: ${voided} ground-arches at x ${centreX}, expected 1`);
  mesh.instanceMatrix.needsUpdate = true;
}
