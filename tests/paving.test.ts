// tests/paving.test.ts
/**
 * Brief 19 §B.2 — the Palace Square paving law (classes A–C; DEC-paving). Pins the declared
 * constants, the anchored band grid geometry, the square footprint, the GLSL twin's emitted
 * program (contents, literals, no comments, length), and the purity/anti-copy laws of both files.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAVING_GLSL_FN, PAVING_SLOT, pavingGlsl } from '../src/procedural/ground-paving';
import {
  bandDistanceM,
  isInsideSquareFootprint,
  isOnBand,
  PAVING_BAND_ANCHOR,
  PAVING_BODY_TONE,
  PAVING_JOINT_FRACTION,
  PAVING_SOURCE,
  SQUARE_FOOTPRINT,
} from '../src/world/paving';

describe('1 · the declared constants', () => {
  it('sources the square from wiki-ru and derives the cell-mean-exact body tone', () => {
    expect(PAVING_SOURCE).toBe('wiki-ru');
    expect(PAVING_SLOT).toBe('Ground/paving-slot@1');
    expect(PAVING_GLSL_FN).toBe('pavingAlbedo');
    expect(PAVING_JOINT_FRACTION).toBeCloseTo(0.19, 6);
    expect(PAVING_BODY_TONE).toBeCloseTo(1.060445, 5);
  });
});

describe('2 · the anchored band grid', () => {
  it('puts the Column axis on cell centres: half a period from the anchor in both axes', () => {
    const anchorX = PAVING_BAND_ANCHOR[0];
    const anchorZ = PAVING_BAND_ANCHOR[1];
    if (anchorX === undefined || anchorZ === undefined) throw new Error('anchor missing');
    expect(bandDistanceM(0, anchorX)).toBe(10);
    expect(bandDistanceM(190, anchorZ)).toBe(10);
    expect(isOnBand(-8.25, 190)).toBe(false);
    expect(isOnBand(8.25, 190)).toBe(false);
    expect(bandDistanceM(8.25, anchorX)).toBeCloseTo(1.75, 9);
  });
});

describe('3 · the square footprint', () => {
  it('covers the three stops, the Column, all four fence corners and nothing beyond', () => {
    expect(isInsideSquareFootprint(-24, 230)).toBe(true); // S0
    expect(isInsideSquareFootprint(-12, 177)).toBe(true); // Sh
    expect(isInsideSquareFootprint(0, 124)).toBe(true); // S1
    expect(isInsideSquareFootprint(0, 190)).toBe(true); // the Column
    for (const x of [-8.25, 8.25]) {
      for (const z of [181.75, 198.25]) {
        expect(isInsideSquareFootprint(x, z), `(${x}, ${z})`).toBe(true); // testimony corners
      }
    }
    expect(SQUARE_FOOTPRINT).toEqual({ xMin: -110, xMax: 110, zMin: 92, zMax: 330 });
    expect(isInsideSquareFootprint(0, 91)).toBe(false); // one metre behind the facade line
    expect(isInsideSquareFootprint(111, 200)).toBe(false); // beyond the west/east edge
    expect(isInsideSquareFootprint(-24, 331)).toBe(false); // beyond the south edge
  });
});

describe('4 · the GLSL twin', () => {
  const glsl = pavingGlsl();

  it('declares the paving function and interpolates every interpreted constant', () => {
    expect(glsl).toContain('vec3 pavingAlbedo(vec2 xz,vec3 base)');
    for (const literal of [
      '20.0',
      '0.12',
      '0.006',
      '1.060445',
      'vec3(3.6,3.5,3.3)',
      '-110.0',
      '92.0',
      '110.0',
      '330.0',
      '0.742312',
      '0.36',
      '0.2',
    ]) {
      expect(glsl).toContain(literal);
    }
    expect(glsl.split('10.0')).toHaveLength(4); // the anchor plus both lo/hi '110.0' carry-overs
  });

  it('ships without comments and stays within the budget of 1400 characters', () => {
    expect(glsl).not.toContain('//');
    expect(glsl).not.toContain('/*');
    expect(glsl.length).toBeLessThanOrEqual(1400);
  });
});

describe('5 · both files stay pure; the twin interpolates and never restates', () => {
  const stripComments = (raw: string): string =>
    raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const stripLiterals = (raw: string): string =>
    stripComments(raw)
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  const law = readFileSync('src/world/paving.ts', 'utf8');
  const twin = readFileSync('src/procedural/ground-paving.ts', 'utf8');

  it('imports no three or node, touches no DOM, clock or randomness', () => {
    for (const raw of [law, twin]) {
      const imports = stripComments(raw);
      expect(imports).not.toMatch(/from\s+['"]three/);
      expect(imports).not.toMatch(/import\s*\(\s*['"]three/);
      expect(imports).not.toMatch(/['"]node:/);
      const code = stripLiterals(raw);
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
    }
  });

  it('the twin carries none of the declared numbers outside its import list', () => {
    const code = stripLiterals(twin);
    for (const copied of [/\b20\b/, /\b0\.12\b/, /\b0\.6\b/, /\b110\b/, /\b330\b/]) {
      expect(code).not.toMatch(copied);
    }
  });
});
