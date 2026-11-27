// src/procedural/throat.ts
/**
 * The throat builder — docs/design-walkthrough-ux.md §3 (resident throat), §11, §12 R-UX3; D2.
 * Two meshes in one group the host adds INTO the palace group (the indoor flip hides it the
 * frame a room mounts; the boot fade reaches it through setThroatOpacity):
 * - `lit`: vault, walls, floor and the mouth collar — Lambert + vertex albedo (src/world/throat.ts),
 *   lit by the square's sun and sky so the mouth follows the hour; receives the piers' shadows,
 *   and since sq-arch-day B1a it also CASTS (the B1a(3) honour list — the vault face joins).
 * - `lamp`: the last run of vault and floor plus the far wall — unlit vertex radiance. The slab
 *   is constant light; E(h) is the eye: a faint warm spot at noon, the arch's glow at night.
 * Both are DoubleSide: the massing void encloses them so no back face is ever exposed, and the
 * winding cannot silently blank a capture-only validation. Zero textures, zero custom slots.
 * sq-arch-day B5: the mouth collar is the ARCH outline (throatVoidOutline) minus the vault
 * profile — the 0.10 ring concentric with the void; the massing head in main.ts builds its ONE
 * Shape from the same law. openGroundArch(): the kit's middle ground-arch instance (the dark
 * slab that fills the opening today) is collapsed to a zero matrix AFTER the build — the
 * solver/kit law is untouched.
 * The 2026-11-28 doorway ruling (brief 1), Decision B — the main doorway's night read: the
 * lamp mesh takes the lit mesh's own idiom (itemSize-4 colour, the night gain in the vertex
 * alpha, ONE shader hook — patchLampNightShader below) and the far wall is RINGS of the vault
 * profile (the law's FAR_WALL_RINGS) instead of the single fan.
 */
import * as THREE from 'three';
import type { Pt, Rgb } from '../world/throat';
import {
  COLLAR_RGB,
  FAR_WALL_RINGS,
  FLOOR_NIGHT_GAIN,
  LAMP_STATIONS_M,
  LIT_STATIONS_M,
  lampRadiance,
  lampRunNightGain,
  lampSlab,
  lampSpill,
  skyLitAlbedo,
  THROAT,
  THROAT_TRIANGLE_CEILING,
  throatProfile,
  throatVoidOutline,
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
/** Vertex colours, interleaved: rgb always; the night gain rides as the 4th component
 * (itemSize 4) on BOTH meshes (the 2026-11-28 doorway ruling) — the lit run carries the
 * lamp's forward spill, the lamp run and the far-wall rings the night gain — the night
 * gate's input under the shader patches. */
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
 * optional alpha law writes the night gain into the vertex alpha (the night gate's input —
 * the material's shader patch multiplies it into the rgb at wNight 1): profile rows get it
 * plain, floor rows × floorGain (the ruling's FLOOR_NIGHT_GAIN; the default 1 is the plain
 * spill). */
function run(
  a: Acc,
  profile: readonly Pt[],
  st: readonly number[],
  shade: (d: number) => Rgb,
  alpha?: (d: number) => number,
  floorGain = 1,
) {
  const n = profile.length;
  const alphaAt = (d: number): number => (alpha === undefined ? 0 : alpha(d));
  let prevP = profileRow(a, profile, at(st, 0), shade(at(st, 0)), alphaAt(at(st, 0)));
  let prevF = floorRow(a, at(st, 0), shade(at(st, 0)), alphaAt(at(st, 0)) * floorGain);
  for (let k = 1; k < st.length; k++) {
    const d = at(st, k);
    const rowP = profileRow(a, profile, d, shade(d), alphaAt(d));
    const rowF = floorRow(a, d, shade(d), alphaAt(d) * floorGain);
    for (let i = 0; i < n - 1; i++) {
      // near i → far i → far i+1 → near i+1: inward for a profile walked up, over and down.
      a.idx.push(prevP + i, rowP + i, rowP + i + 1, prevP + i, rowP + i + 1, prevP + i + 1);
    }
    a.idx.push(prevF, prevF + 1, rowF + 1, prevF, rowF + 1, rowF);
    prevP = rowP;
    prevF = rowF;
  }
}
/**
 * The far wall (the 2026-11-28 doorway ruling, brief 1): RINGS of the vault profile scaled
 * about (0, 0) at the far depth — strips between consecutive rings, a fan inside the last.
 * Scaling about the origin keeps the floor line (the endpoints' y stays 0) and the outer ring
 * (scale 1.0) IS the profile, so the outline and the day read are unchanged — coplanar,
 * constant lampSlab rgb. Every vertex's ALPHA is its ring's night gain (FAR_WALL_RINGS),
 * interpolated across the strips — the shader's rgb multiplier at wNight 1.
 */
function endWall(a: Acc, profile: readonly Pt[], c: Rgb): void {
  const rows: number[] = [];
  for (const [ringScale, gain] of FAR_WALL_RINGS) {
    const ring = profile.map((p): Pt => [p[0] * ringScale, p[1] * ringScale]);
    rows.push(profileRow(a, ring, THROAT.depthM, c, gain));
  }
  for (let r = 0; r < rows.length - 1; r++) {
    const outer = at(rows, r);
    const inner = at(rows, r + 1);
    for (let i = 0; i < profile.length - 1; i++) {
      // outer i → inner i → inner i+1 → outer i+1: the quad walk the station strips use.
      a.idx.push(outer + i, inner + i, inner + i + 1, outer + i, inner + i + 1, outer + i + 1);
    }
  }
  const core = at(rows, rows.length - 1);
  for (let i = 1; i < profile.length - 1; i++) a.idx.push(core, core + i + 1, core + i);
}
/**
 * The mouth collar (sq-arch-day B5): the arch outline minus the vault profile — the 0.10 ring
 * concentric with the void; the same earcut Shape pattern the rectangular void used, with the
 * outline walked forward and the vault profile reversed behind it.
 */
function collar(a: Acc, profile: readonly Pt[]): void {
  const outline = throatVoidOutline();
  const first = at(outline, 0);
  const shape = new THREE.Shape();
  shape.moveTo(first[0], first[1]);
  for (let i = 1; i < outline.length; i++) {
    const p = at(outline, i);
    shape.lineTo(p[0], p[1]);
  }
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
/** The ONE shared night uniform (the FACADE_SURFACE_UNIFORMS pattern): written by
 * setThroatNightSpill beside the lit emissive's intensity write, read by the lamp's patched
 * shader. 0 all day — the rgb multiplier is exactly 1.0 and the day read is bit-exact. */
export const THROAT_NIGHT_UNIFORM: { value: number } = { value: 0 };
/**
 * The lamp shader's night-gain patch (the 2026-11-28 doorway ruling, brief 1 — Decision B):
 * the lamp mesh's colour attribute is itemSize 4 and its vertex ALPHA is the night gain (the
 * fraction of the day radiance kept at wNight 1) — the lit patch's own idiom. In three
 * 0.186.1 the meshbasic fragment's `#include <color_fragment>` does `diffuseColor *= vColor;`
 * under USE_COLOR_ALPHA — the FULL vec4, alpha included — so the splice multiplies the RGB
 * channels only, by `1.0 + ( vColor.a - 1.0 ) * uThroatNight` (exactly 1.0 at uThroatNight 0
 * — the day read bit-exact; vColor.a at wNight 1 — the gain itself), then restores
 * `diffuseColor.a = opacity;` — the same restore the lit patch does, so the massing fade law
 * survives. The uniform is declared after <common>; the shared uniform object is wired by the
 * builder's onBeforeCompile (THROAT_NIGHT_UNIFORM). Loud-fails if three renames a token (the
 * repo's silent-noop law).
 */
export function patchLampNightShader(shader: { fragmentShader: string }): void {
  const src = shader.fragmentShader;
  const body = src.replace(
    '#include <color_fragment>',
    '#include <color_fragment>\n\tdiffuseColor.rgb *= 1.0 + ( vColor.a - 1.0 ) * uThroatNight;\n\tdiffuseColor.a = opacity;',
  );
  if (body === src) {
    throw new Error('throat: the lamp-shader patch found no <color_fragment> token');
  }
  const declared = body.replace(
    '#include <common>',
    '#include <common>\nuniform float uThroatNight;',
  );
  if (declared === body) {
    throw new Error('throat: the lamp-shader patch found no <common> token');
  }
  shader.fragmentShader = declared;
}
export function buildThroat(): ThroatBuild {
  const profile = throatProfile();
  const litAcc = newAcc(4);
  run(litAcc, profile, LIT_STATIONS_M, skyLitAlbedo, lampSpill, FLOOR_NIGHT_GAIN);
  collar(litAcc, profile);
  // The ruling (brief 1): the lamp mesh rides the same itemSize-4 attribute — the alpha is
  // the night gain (linear 1.0 → LAMP_RUN_END_GAIN, floors × FLOOR_NIGHT_GAIN), the rgb stays
  // today's lampRadiance; the far wall is the RINGS, the gain per ring in the alpha.
  const lampAcc = newAcc(4);
  run(lampAcc, profile, LAMP_STATIONS_M, lampRadiance, lampRunNightGain, FLOOR_NIGHT_GAIN);
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
  // The ruling's ONE shader hook: the shared uniform wired into the program, then the rgb
  // gain spliced after <color_fragment> (patchLampNightShader).
  lampMaterial.onBeforeCompile = (s) => {
    s.uniforms.uThroatNight = THROAT_NIGHT_UNIFORM;
    patchLampNightShader(s);
  };
  const lit = new THREE.Mesh(toGeometry(litAcc), litMaterial);
  lit.name = 'ThroatLit';
  lit.receiveShadow = true;
  // sq-arch-day B1a(3): the vault face joins the castShadow/receiveShadow honour list — the
  // sun reaching into the mouth shades the passage physically now, on top of the B5b knots.
  lit.castShadow = true;
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
/** The night gate (the 2026-11-28 doorway ruling, brief 1): the lamp's forward spill AND the
 * lamp mesh's rgb gain ride the same switch that removes the crown's ground bounce (the
 * lattice weight) — 0 all day (both multipliers exactly 1: the day read bit-exact), 1 through
 * the night plateau (the factor is the vertex gain itself). Writes BOTH gates beside each
 * other: the lit emissive's intensity and the shared uThroatNight. */
export function setThroatNightSpill(build: ThroatBuild, wNight: number): void {
  (build.lit.material as THREE.MeshLambertMaterial).emissiveIntensity = wNight;
  THROAT_NIGHT_UNIFORM.value = wNight;
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
