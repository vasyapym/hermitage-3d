// tests/portrait-frame.test.ts
/**
 * Brief 19 §A — the portrait frame law (SRC §1.1–1.2; DEC-portrait). Pins the S0 column-witness
 * derivation, the identity-by-reference behaviour above WITNESS_ASPECT, the aspect table, the
 * Sh/S1 identity and the pitch preservation, the aspect guards, and the purity/anti-copy laws.
 * Numbers are the IEEE-exact outputs of the adopted formulas (node, 64-bit).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAMERA_VFOV_DEG,
  halfHorizontalFovDeg,
  S0_YAW_DELTA_MAX_DEG,
  s0ColumnWitnessDeg,
  s0YawDeltaDeg,
  squareRailForAspect,
  WITNESS_ASPECT,
} from '../src/camera/portrait-frame';
import { SQUARE_RAIL, SQUARE_S0_GAZE } from '../src/camera/square-rail';

const s0 = SQUARE_RAIL.stops[0];
if (s0 === undefined || s0.subject === null) throw new Error('SQUARE_RAIL has no S0 subject');

describe('1 · the law constants and the committed S0 data', () => {
  it('keeps the SQUARE_RAIL boot subject as the authored gaze; the FOV law is the one source', () => {
    expect(CAMERA_VFOV_DEG).toBe(55);
    expect(S0_YAW_DELTA_MAX_DEG).toBe(12);
    expect(s0.subject).toEqual(SQUARE_S0_GAZE);
  });

  it('derives the witness yaw and the witness aspect (IEEE-exact, 64-bit)', () => {
    expect(s0ColumnWitnessDeg()).toBeCloseTo(24.2577, 3);
    expect(WITNESS_ASPECT).toBeCloseTo(0.8657, 3);
  });
});

describe('2 · identity by reference above the witness aspect', () => {
  it('returns SQUARE_RAIL ITSELF at 1280/720, 844/390, 1, 0.9 and WITNESS_ASPECT + 1e-6', () => {
    for (const aspect of [1280 / 720, 844 / 390, 1, 0.9, WITNESS_ASPECT + 1e-6]) {
      expect(s0YawDeltaDeg(aspect)).toBe(0);
      expect(s0YawDeltaDeg(aspect)).toBeCloseTo(0, 12);
      expect(squareRailForAspect(aspect)).toBe(SQUARE_RAIL);
    }
  });
});

describe('3 · the aspect table (re-aimed subjects below the witness aspect)', () => {
  it('tracks the shortfall and clamps the swing at degenerate aspects', () => {
    expect(s0YawDeltaDeg(768 / 1024)).toBeCloseTo(2.930835, 3);
    expect(halfHorizontalFovDeg(768 / 1024)).toBeCloseTo(21.326931, 3);
    expect(s0YawDeltaDeg(320 / 568)).toBeCloseTo(7.912555, 3);
    expect(halfHorizontalFovDeg(320 / 568)).toBeCloseTo(16.345211, 3);
    expect(s0YawDeltaDeg(360 / 744)).toBeCloseTo(10.119795, 3);
    expect(halfHorizontalFovDeg(360 / 744)).toBeCloseTo(14.137971, 3);
    expect(s0YawDeltaDeg(390 / 844)).toBeCloseTo(10.732436, 3);
    expect(halfHorizontalFovDeg(390 / 844)).toBeCloseTo(13.52533, 3);
    expect(halfHorizontalFovDeg(0.3)).toBeCloseTo(8.876191, 3);
    expect(s0YawDeltaDeg(0.3)).toBe(S0_YAW_DELTA_MAX_DEG);
  });

  it('re-aims only the S0 subject at 360/744; every other stop stays the committed object', () => {
    const derived = squareRailForAspect(360 / 744);
    const first = derived.stops[0];
    if (first === undefined) {
      throw new Error('derived rail is missing stops');
    }
    if (first.subject === null) throw new Error('derived S0 lost its subject');
    // The 2026-11-12/13 stops round: five stops — the tail rides the committed objects by
    // reference (S0's subject is the only re-aim).
    expect(derived.stops).toHaveLength(5);
    for (let i = 1; i < derived.stops.length; i++) {
      expect(derived.stops[i]).toBe(SQUARE_RAIL.stops[i]);
    }
    expect(first.position).toBe(s0.position);
    expect(first.id).toBe('S0');
    expect(first.subject[0]).toBeCloseTo(40.04, 2);
    expect(first.subject[1]).toBe(11);
    expect(first.subject[2]).toBeCloseTo(7.8, 2);
  });

  it('preserves the S0 pitch: horizontal range equals the gaze range, y stays the gaze height', () => {
    const derived = squareRailForAspect(360 / 744);
    const first = derived.stops[0];
    if (first === undefined || first.subject === null) throw new Error('derived S0 lost subject');
    expect(
      Math.hypot(first.subject[0] - s0.position[0], first.subject[2] - s0.position[2]),
    ).toBeCloseTo(231.2488, 3);
    expect(first.subject[1]).toBe(11);
  });
});

describe('4 · the aspect guard', () => {
  it('throws RangeError for 0, NaN, negatives and Infinity', () => {
    for (const aspect of [0, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      expect(() => halfHorizontalFovDeg(aspect)).toThrow(RangeError);
      expect(() => squareRailForAspect(aspect)).toThrow(RangeError);
    }
  });
});

describe('5 · the law stays pure; its numbers are borrowed, not copied', () => {
  const stripComments = (raw: string): string =>
    raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const stripLiterals = (raw: string): string =>
    stripComments(raw)
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  const law = readFileSync('src/camera/portrait-frame.ts', 'utf8');
  const code = stripLiterals(law);

  it('imports no three or node, touches no DOM, clock or randomness', () => {
    const imports = stripComments(law);
    expect(imports).not.toMatch(/from\s+['"]three/);
    expect(imports).not.toMatch(/import\s*\(\s*['"]three/);
    expect(imports).not.toMatch(/['"]node:/);
    for (const pattern of [/document/, /window/, /\bDate\(/, /setTimeout/, /Math\.random/]) {
      expect(code).not.toMatch(pattern);
    }
  });

  it('restates none of the committed world numbers: 190, 1.83, −24 or 230', () => {
    for (const copied of [/\b190\b/, /\b1\.83\b/, /\b24\b/, /\b230\b/]) {
      expect(code).not.toMatch(copied);
    }
  });
});
