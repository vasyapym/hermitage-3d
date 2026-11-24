// Throat gates — R-UX3 (docs/design-walkthrough-ux.md §3, §11, D2/D7).
// sq-arch-day B5 (2026-11-24): the concentric arch (springY 7.25, the void = the r 2.45 arch,
// crown 9.70), the ONE massing head, the B5b depth-knot grade — extends R-UX3's own law.
// The law is pure numbers; the builder turns them into buffers; the facade fixture is the
// real frozen chain (solve → build) so openGroundArch is gated on the committed kit.

import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import { EXPOSURE } from '../src/content/sky-time';
import { buildFacade, type FacadeBuild } from '../src/procedural/facade-builder';
import { solveSouthFacade } from '../src/procedural/facade-solver';
import {
  buildThroat,
  openGroundArch,
  patchThroatLitShader,
  setThroatNightSpill,
} from '../src/procedural/throat';
import { lightmapWeights } from '../src/sky/lightmap-weights';
import { KIT_PORTAL_BOX, SQUARE_DRAW_CAP, SQUARE_TRI_CAP } from '../src/world/square-kit';
import {
  LAMP_REACH_M,
  LAMP_STATIONS_M,
  LIT_STATIONS_M,
  headSolidAt,
  lampRadiance,
  lampSlab,
  lampSpill,
  type Rgb,
  skyLitAlbedo,
  THROAT,
  THROAT_TONE_KNOTS,
  THROAT_TRIANGLE_CEILING,
  THROAT_VOID,
  throatProfile,
  throatToneAt,
  throatTriangleEstimate,
  throatVoidOutline,
} from '../src/world/throat';

function solveOk() {
  const result = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
  if (!result.ok) throw new Error(`solve failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function buildOk(): FacadeBuild {
  return buildFacade(solveOk());
}

const lum = (c: readonly [number, number, number]): number =>
  0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

describe('throat law (R-UX3 §3, §11, D2; sq-arch-day B5 the concentric arch)', () => {
  it('profile: floor corners, springing, crown inside the void', () => {
    const p = throatProfile();
    expect(p[0]).toEqual([-THROAT.halfWidth, 0]);
    expect(p[p.length - 1]).toEqual([THROAT.halfWidth, 0]);
    const crown = Math.max(...p.map(([, y]) => y));
    expect(THROAT.springY).toBe(7.25); // the Q10 pick: concentric with void and ring
    expect(crown).toBeCloseTo(THROAT.springY + THROAT.halfWidth, 9); // 9.60
    expect(crown).toBeCloseTo(9.6, 9);
    expect(crown).toBeLessThan(THROAT_VOID.crownY); // 9.60 < 9.70
    expect(THROAT.halfWidth).toBeLessThan(THROAT_VOID.halfWidth); // 2.35 < 2.45
  });

  it('the void is the ARCH: halfWidth = radius 2.45 about (0, 7.25), crown 9.70', () => {
    expect(THROAT_VOID).toEqual({ halfWidth: 2.45, springY: 7.25, radius: 2.45, crownY: 9.7 });
    expect(THROAT_VOID.crownY).toBeCloseTo(THROAT_VOID.springY + THROAT_VOID.radius, 12);
    // The ring margins (the kit ring outer 2.75 = KIT_PORTAL_BOX.xHalf, the crown clears it):
    expect(THROAT_VOID.halfWidth - THROAT.halfWidth).toBeCloseTo(0.1, 12); // void → vault
    expect(KIT_PORTAL_BOX.xHalf - THROAT_VOID.radius).toBeCloseTo(0.3, 12); // void → ring-outer
    expect(THROAT_VOID.crownY).toBeLessThan(KIT_PORTAL_BOX.yTop); // 9.70 < 10.0
    // The outline: the same arcSegments discretization, the crown point mid-arc.
    const outline = throatVoidOutline();
    expect(outline.length).toBe(throatProfile().length);
    expect(outline[0]).toEqual([-THROAT_VOID.halfWidth, 0]);
    expect(outline[outline.length - 1]).toEqual([THROAT_VOID.halfWidth, 0]);
    const mid = outline[Math.floor(outline.length / 2)];
    if (mid === undefined) throw new Error('outline missing its crown');
    expect(mid[0]).toBeCloseTo(0, 12);
    expect(mid[1]).toBeCloseTo(THROAT_VOID.crownY, 12);
  });

  it('the massing head: the old shoulders are solid, the arch stays open', () => {
    // The central portal section: 8 declared axes × the 3.4 m pitch (the frozen spec).
    const pitch = SOUTH_FACADE.sections.find((s) => s.kind === 'centralPortal');
    if (pitch === undefined) throw new Error('no central portal section');
    const halfWidth = (pitch.declaredAxes * 3.4) / 2;
    expect(headSolidAt(2.5, 9.0, halfWidth, 22)).toBe(true); // the old shoulder: now solid
    expect(headSolidAt(0, 9.65, halfWidth, 22)).toBe(false); // inside the arch opening
    expect(headSolidAt(0, 0, halfWidth, 22)).toBe(false); // the passage mouth
    expect(headSolidAt(0, 7.25, halfWidth, 22)).toBe(false); // the spring line: the opening
    expect(headSolidAt(0, 9.68, halfWidth, 22)).toBe(false); // inside the arch, under the crown
    expect(headSolidAt(0, 9.72, halfWidth, 22)).toBe(true); // over the crown: solid again
    expect(headSolidAt(3.0, 5, halfWidth, 22)).toBe(true); // between arch and pier, solid
    expect(headSolidAt(halfWidth, 22, halfWidth, 22)).toBe(true); // the pavilion corner
    expect(headSolidAt(0, 22.01, halfWidth, 22)).toBe(false); // above the cornice
    expect(() => headSolidAt(Number.NaN, 0, halfWidth, 22)).toThrow(RangeError);
  });

  it('stations share one seam and end at the far wall', () => {
    const litLast = LIT_STATIONS_M[LIT_STATIONS_M.length - 1];
    const lampFirst = LAMP_STATIONS_M[0];
    expect(litLast).toBe(LAMP_REACH_M);
    expect(lampFirst).toBe(LAMP_REACH_M);
    const lampLast = LAMP_STATIONS_M[LAMP_STATIONS_M.length - 1];
    expect(lampLast).toBe(THROAT.depthM);
  });

  it('the depth grade: the B5b knot law replaces the exponential AO curve', () => {
    expect(THROAT_TONE_KNOTS).toEqual([
      [0, 1.0],
      [7, 0.2],
      [21, 0.3],
      [29.5, 1.0],
    ]);
    expect(throatToneAt(0)).toBe(1.0); // the mouth returns the knot's own literal
    expect(throatToneAt(7)).toBeCloseTo(0.2, 12);
    expect(throatToneAt(21)).toBeCloseTo(0.3, 12);
    expect(throatToneAt(29.5)).toBeCloseTo(1.0, 12);
    // Monotone between the knots: the fall to the trough, then the two rises.
    for (let d = 0.5; d <= 6.5; d += 0.5) {
      expect(throatToneAt(d + 0.5)).toBeLessThanOrEqual(throatToneAt(d));
    }
    for (let d = 7.5; d <= 28.5; d += 0.5) {
      expect(throatToneAt(d + 0.5)).toBeGreaterThanOrEqual(throatToneAt(d));
    }
    expect(() => throatToneAt(Number.NaN)).toThrow(RangeError);
  });

  it('the sky-lit run follows the knots; the lamp rises to a warm slab', () => {
    // The trough stone keeps the recession (the knots are what keep it at fill 11).
    const lum = (c: readonly [number, number, number]): number =>
      0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    expect(lum(skyLitAlbedo(0))).toBeCloseTo(lum([0.22, 0.21, 0.19]), 12);
    const seam = LAMP_STATIONS_M[0] ?? 0;
    // At d 20 the knot law sits at 0.2 + 0.1·smoothstep(13/14) ≈ 0.29854.
    expect(lum(skyLitAlbedo(seam))).toBeCloseTo(0.210682 * 0.2985422, 5);
    // The seam carries the lamp's toe — GLOW_TOE (0.04) × the lampSlab scale factor: the
    // cool stone crosses into warm light, never a step into absolute black.
    expect(lum(lampRadiance(seam))).toBeCloseTo(0.04 * lum(lampSlab()), 9);
    for (let i = 1; i < LAMP_STATIONS_M.length; i++) {
      const here = lampRadiance(LAMP_STATIONS_M[i] ?? 0);
      const before = lampRadiance(LAMP_STATIONS_M[i - 1] ?? 0);
      expect(lum(here)).toBeGreaterThan(lum(before));
    }
    const slab = lampSlab();
    expect(slab[0]).toBeGreaterThan(slab[1]);
    expect(slab[1]).toBeGreaterThan(slab[2]); // warm (D2)
    expect(() => skyLitAlbedo(-1)).toThrow(RangeError);
    expect(() => lampRadiance(-1)).toThrow(RangeError);
  });
});

describe('throat law purity', () => {
  const sources = import.meta.glob('../src/world/throat.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(src);
      for (const re of forbidden) expect(code).not.toMatch(re);
    }
  });
});

describe('throat build', () => {
  it('meets the ceiling exactly as the law counts, with no textures', () => {
    const b = buildThroat();
    expect(b.triangles).toBe(throatTriangleEstimate());
    expect(b.triangles).toBeLessThanOrEqual(THROAT_TRIANGLE_CEILING);
    for (const m of b.materials) expect('map' in m && m.map).toBeFalsy();
    expect(b.group.children).toHaveLength(2);
  });

  it('lies inside the void, behind the facade plane, over the pavilion depth', () => {
    const b = buildThroat();
    for (const mesh of [b.lit, b.lamp]) {
      const box = mesh.geometry.boundingBox;
      if (box === null) throw new Error('no bounds');
      expect(box.min.x).toBeGreaterThanOrEqual(-THROAT_VOID.halfWidth - 1e-6);
      expect(box.max.x).toBeLessThanOrEqual(THROAT_VOID.halfWidth + 1e-6);
      expect(box.max.y).toBeLessThanOrEqual(THROAT_VOID.crownY + 1e-6);
      expect(box.max.z).toBeLessThanOrEqual(THROAT.mouthZ + 1e-6);
      expect(box.min.z).toBeGreaterThanOrEqual(THROAT.mouthZ - THROAT.depthM - 1e-6);
    }
  });

  it('voids exactly one ground-arch, the middle one', () => {
    // The real frozen chain: the spec is solved, then built — the committed kit.
    const facade = buildOk();
    expect(() => openGroundArch(facade)).not.toThrow();
    expect(() => openGroundArch(buildOk(), 50)).toThrow(/expected 1/);
  });

  it('carries the spill on the lit mesh and casts with it (the B1a(3) honour list)', () => {
    const b = buildThroat();
    expect(b.lit.castShadow).toBe(true);
    expect(b.lit.receiveShadow).toBe(true);
    expect(b.lamp.castShadow).toBe(false);
  });
});

describe('the massing head (sq-arch-day B5, the main.ts law scan)', () => {
  const main = readFileSync('src/main.ts', 'utf8');

  it('builds ONE arch-topped Shape piece, extruded, no piers or lintel left', () => {
    expect(main).toContain('new THREE.ExtrudeGeometry(headShape, {');
    expect(main).toContain('curveSegments: 12,');
    expect(main).toContain('bevelEnabled: false,');
    expect(main).toContain('absarc(0, THROAT_VOID.springY, THROAT_VOID.radius, Math.PI, 0, true)');
    // The old pier/lintel boxes are gone.
    expect(main).not.toContain('pierW');
    expect(main).not.toContain('lintelH');
  });
});

describe('the lamp forward spill (the doorway night law, 2026-11-14)', () => {
  const slab = lampSlab();
  const spillRgb = (d: number): Rgb => {
    const s = lampSpill(d);
    return [s * slab[0], s * slab[1], s * slab[2]];
  };

  it('meets the lamp radiance at the seam per channel', () => {
    const [r0, g0, b0] = lampRadiance(LAMP_REACH_M);
    expect(lampSpill(LAMP_REACH_M) * slab[0]).toBeCloseTo(r0, 12);
    expect(lampSpill(LAMP_REACH_M) * slab[1]).toBeCloseTo(g0, 12);
    expect(lampSpill(LAMP_REACH_M) * slab[2]).toBeCloseTo(b0, 12);
  });

  it('is strictly increasing and positive across the lit stations', () => {
    let prev = 0;
    for (const d of LIT_STATIONS_M) {
      const s = lampSpill(d ?? 0);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });

  it('keeps the mouth ratio in the designed band', () => {
    const ratio = lampSpill(0) / lampSpill(LAMP_REACH_M);
    expect(ratio).toBeGreaterThanOrEqual(0.5);
    expect(ratio).toBeLessThanOrEqual(0.75);
  });

  it('reads one non-decreasing warm ramp across the whole night throat', () => {
    // The seam station is SHARED (d = LAMP_REACH_M sits in both runs' lists): the spill and
    // the radiance are equal there by design — the ramp is non-decreasing with a strict
    // end-to-end rise, flat only at that one shared seam value.
    let prev = -1;
    let first = Number.POSITIVE_INFINITY;
    for (const d of LIT_STATIONS_M) {
      const l = lum(spillRgb(d ?? 0));
      expect(l).toBeGreaterThanOrEqual(prev);
      first = Math.min(first, l);
      prev = l;
    }
    for (const d of LAMP_STATIONS_M) {
      const l = lum(lampRadiance(d ?? 0));
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
    expect(first).toBeLessThan(prev);
    expect(prev).toBeLessThan(lum(slab));
  });

  it('keeps the seam convex (the spill slope ≤ the lamp run’s opening slope)', () => {
    const s16 = lampSpill(16);
    const s20 = lampSpill(LAMP_REACH_M);
    const s23 = lampSpill(23);
    expect((s20 - s16) / 4).toBeLessThanOrEqual((s23 - s20) / 3);
  });

  it('clears the display floor at the mouth on the night exposure', () => {
    expect(lum(spillRgb(0)) * EXPOSURE.low).toBeGreaterThanOrEqual(0.01);
  });

  it('carries the sq-arch-day pins: the knot mouth, the ring collar, the census caps', () => {
    // The B5b knot law: the mouth keeps the kit's stone at factor 1.0 (the exp curve retired).
    expect(skyLitAlbedo(0)[0]).toBeCloseTo(0.22, 12);
    expect(skyLitAlbedo(0)[1]).toBeCloseTo(0.21, 12);
    expect(skyLitAlbedo(0)[2]).toBeCloseTo(0.19, 12);
    // The collar is now the arch outline minus the vault profile (2n vertices → 2n − 2 tris).
    expect(throatTriangleEstimate()).toBe(347);
    // The census caps the round rides (kit 6/6, whole-frame 56 / 75,000 — unmoved).
    expect(SQUARE_DRAW_CAP).toBe(56);
    expect(SQUARE_TRI_CAP).toBe(75_000);
  });
});

describe('the lit builder carries the spill and the night gate', () => {
  const build = buildThroat();
  const slab = lampSlab();

  it('writes the lit colour attribute as rgb + the spill alpha (itemSize 4)', () => {
    const attr = build.lit.geometry.getAttribute('color');
    expect(attr.itemSize).toBe(4);
    const firstStation = LIT_STATIONS_M[0] ?? 0;
    expect(attr.getW(0)).toBeCloseTo(lampSpill(firstStation), 8); // Float32 buffer precision
    expect(attr.getW(attr.count - 1)).toBe(0); // the collar rides the same attribute, spill 0
    const albedo = skyLitAlbedo(firstStation);
    // Float32 buffer precision: the rgb values were always stored rounded (the round-1 law
    // itself is float64) — the bitwise claim binds the LAW, the buffer carries 7 digits.
    expect(attr.getX(0)).toBeCloseTo(albedo[0], 7);
    expect(attr.getY(0)).toBeCloseTo(albedo[1], 7);
    expect(attr.getZ(0)).toBeCloseTo(albedo[2], 7);
  });

  it('constructs the emissive at the slab with intensity 0', () => {
    const mat = build.lit.material as THREE.MeshLambertMaterial;
    expect([mat.emissive.r, mat.emissive.g, mat.emissive.b]).toEqual(slab);
    expect(mat.emissiveIntensity).toBe(0);
  });

  it('patches the real Lambert shader and loud-fails without the token', () => {
    const real = { fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
    patchThroatLitShader(real);
    expect(real.fragmentShader).toContain('totalEmissiveRadiance *= vColor.a;');
    expect(real.fragmentShader).toContain('diffuseColor.a = opacity;');
    expect(() => patchThroatLitShader({ fragmentShader: 'no tokens here' })).toThrow(
      /no <color_fragment> token/,
    );
  });

  it('gates the spill on the lattice weight', () => {
    const mat = build.lit.material as THREE.MeshLambertMaterial;
    setThroatNightSpill(build, 0.5);
    expect(mat.emissiveIntensity).toBe(0.5);
    setThroatNightSpill(build, 1);
    expect(mat.emissiveIntensity).toBe(1);
    setThroatNightSpill(build, 0);
    expect(mat.emissiveIntensity).toBe(0);
    // The gate's own source row: lightmapWeights' switch at the pinned elevations.
    expect(lightmapWeights(10).nightChandeliers).toBe(0);
    expect(lightmapWeights(-6.6).nightChandeliers).toBe(0);
    expect(lightmapWeights(-7).nightChandeliers).toBe(0);
    expect(lightmapWeights(-7.5).nightChandeliers).toBe(0.5);
    expect(lightmapWeights(-8).nightChandeliers).toBe(1);
    expect(lightmapWeights(-20).nightChandeliers).toBe(1);
  });
});
