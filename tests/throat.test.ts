// Throat gates — R-UX3 (docs/design-walkthrough-ux.md §3, §11, D2/D7).
// The law is pure numbers; the builder turns them into buffers; the facade fixture is the
// real frozen chain (solve → build) so openGroundArch is gated on the committed kit.

import * as THREE from 'three';
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
import {
  LAMP_REACH_M,
  LAMP_STATIONS_M,
  LIT_STATIONS_M,
  lampRadiance,
  lampSlab,
  lampSpill,
  type Rgb,
  skyLitAlbedo,
  THROAT,
  THROAT_TRIANGLE_CEILING,
  THROAT_VOID,
  throatProfile,
  throatTriangleEstimate,
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

describe('throat law (R-UX3 §3, §11, D2)', () => {
  it('profile: floor corners, springing, crown inside the void', () => {
    const p = throatProfile();
    expect(p[0]).toEqual([-THROAT.halfWidth, 0]);
    expect(p[p.length - 1]).toEqual([THROAT.halfWidth, 0]);
    const crown = Math.max(...p.map(([, y]) => y));
    expect(crown).toBeCloseTo(THROAT.springY + THROAT.halfWidth, 9);
    expect(crown).toBeLessThan(THROAT_VOID.topY);
    expect(THROAT.halfWidth).toBeLessThan(THROAT_VOID.halfWidth);
  });

  it('stations share one seam and end at the far wall', () => {
    const litLast = LIT_STATIONS_M[LIT_STATIONS_M.length - 1];
    const lampFirst = LAMP_STATIONS_M[0];
    expect(litLast).toBe(LAMP_REACH_M);
    expect(lampFirst).toBe(LAMP_REACH_M);
    const lampLast = LAMP_STATIONS_M[LAMP_STATIONS_M.length - 1];
    expect(lampLast).toBe(THROAT.depthM);
  });

  it('dark in its middle: albedo falls monotonically; the lamp rises to a warm slab', () => {
    for (let i = 1; i < LIT_STATIONS_M.length; i++) {
      const here = skyLitAlbedo(LIT_STATIONS_M[i] ?? 0);
      const before = skyLitAlbedo(LIT_STATIONS_M[i - 1] ?? 0);
      expect(lum(here)).toBeLessThan(lum(before));
    }
    const seam = LAMP_STATIONS_M[0] ?? 0;
    // The seam stone keeps a tenth of the mouth (the AO floor's intent): the multiplier at
    // d 20 is 0.83·e^(−20/9) + 0.10 ≈ 0.19 — the run's gradient, never black.
    expect(lum(skyLitAlbedo(seam))).toBeCloseTo(0.04002, 4);
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
      expect(box.max.y).toBeLessThanOrEqual(THROAT_VOID.topY + 1e-6);
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

  it('leaves the round-1 pins untouched', () => {
    expect(skyLitAlbedo(0)[0]).toBeCloseTo(0.22 * 0.93, 12);
    expect(throatTriangleEstimate()).toBe(338);
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
