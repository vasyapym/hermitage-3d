// Throat gates — R-UX3 (docs/design-walkthrough-ux.md §3, §11, D2/D7).
// The law is pure numbers; the builder turns them into buffers; the facade fixture is the
// real frozen chain (solve → build) so openGroundArch is gated on the committed kit.
import { describe, expect, it } from 'vitest';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import { buildFacade, type FacadeBuild } from '../src/procedural/facade-builder';
import { solveSouthFacade } from '../src/procedural/facade-solver';
import { buildThroat, openGroundArch } from '../src/procedural/throat';
import {
  LAMP_REACH_M,
  LAMP_STATIONS_M,
  LIT_STATIONS_M,
  lampRadiance,
  lampSlab,
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
