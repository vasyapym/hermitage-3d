import { describe, expect, it } from 'vitest';
import type { QualityTierId } from '../src/engine/tier';
import {
  BENCHMARK,
  classifyProbe,
  DEFAULT_TIER_ID,
  parseQualityUpdate,
  resolveAutoTier,
  resolveQualityScale,
  TIERS,
} from '../src/engine/tier';

const TIER_IDS: readonly QualityTierId[] = ['t0', 't1', 't2'];
const expectWithin = (actual: number, expected: number, tolerance = 1e-4): void => {
  expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
};
/** Flat probe: `count` identical intervals (the first ones are the warmup drop). */
const flatProbe = (ms: number, count = 8): number[] => Array.from({ length: count }, () => ms);
describe('tier registry', () => {
  it('closes over exactly t0/t1/t2 with matching ids', () => {
    expect(Object.keys(TIERS).sort()).toEqual([...TIER_IDS]);
    for (const id of TIER_IDS) {
      expect(TIERS[id].id).toBe(id);
    }
  });
  it('T1 sits exactly on the §11 designated-device numbers and is the default', () => {
    expect(TIERS.t1.dprCap).toBe(1);
    expect(TIERS.t1.bufferPixelsCap).toBe(1048576);
    // sq-shadow-dirt R2: the map leaves the §11 verbatim set — 2048, gated by the 16.7 ms goal.
    expect(TIERS.t1.shadowMapSize).toBe(2048);
    expect(DEFAULT_TIER_ID).toBe('t1');
  });
  it('carries the R2 caster offset: t0 2.0, the Mac rows keep the dirt-round 1.4', () => {
    expect(TIERS.t0.shadowDepthOffsetFactor).toBe(2.0);
    expect(TIERS.t1.shadowDepthOffsetFactor).toBe(1.4);
    expect(TIERS.t2.shadowDepthOffsetFactor).toBe(1.4);
  });
  it('T0 tightens and T2 relaxes the §11 limits monotonically', () => {
    expect(TIERS.t0.bufferPixelsCap).toBeLessThan(TIERS.t1.bufferPixelsCap);
    expect(TIERS.t1.bufferPixelsCap).toBeLessThan(TIERS.t2.bufferPixelsCap);
    expect(TIERS.t0.dprCap).toBeLessThanOrEqual(TIERS.t1.dprCap);
    expect(TIERS.t1.dprCap).toBeLessThanOrEqual(TIERS.t2.dprCap);
    expect(TIERS.t0.shadowMapSize).toBeLessThanOrEqual(TIERS.t1.shadowMapSize);
    expect(TIERS.t1.shadowMapSize).toBeLessThanOrEqual(TIERS.t2.shadowMapSize);
  });
  it('keeps post honest: Phase 1 has no post stack in any tier', () => {
    for (const id of TIER_IDS) {
      expect(TIERS[id].postEnabled).toBe(false);
      expect(TIERS[id].shadowPasses).toBe(1);
      expect(TIERS[id].label.startsWith(id.toUpperCase())).toBe(true);
    }
  });
});
describe('resolveQualityScale', () => {
  it('pins the §11 fit: buffer bites on common viewports', () => {
    // sqrt(1048576 / 2073600) = 1024 / 1440
    expectWithin(resolveQualityScale(TIERS.t1, 1920, 1080), 0.71111);
    // sqrt(1048576 / 1296000)
    expectWithin(resolveQualityScale(TIERS.t1, 1440, 900), 0.89949);
    // sqrt(4194304 / 1296000) ≈ 1.79898 — below dprCap 2, so the buffer still bites
    expectWithin(resolveQualityScale(TIERS.t2, 1440, 900), 1.79898);
    // sqrt(4194304 / 6000000)
    expectWithin(resolveQualityScale(TIERS.t2, 3000, 2000), 0.83609);
  });
  it('T0 renders smaller than T1 at 1080p because its buffer cap is tighter', () => {
    // sqrt(786432 / 2073600)
    const t0 = resolveQualityScale(TIERS.t0, 1920, 1080);
    expectWithin(t0, 0.61584);
    expect(t0).toBeLessThan(resolveQualityScale(TIERS.t1, 1920, 1080));
  });
  it('clamps to dprCap when the buffer allows more (100×100 on T2 → exactly 2)', () => {
    expect(resolveQualityScale(TIERS.t2, 100, 100)).toBe(2);
    expect(resolveQualityScale(TIERS.t1, 100, 100)).toBe(1);
  });
  it('rejects nonfinite or nonpositive css dimensions with RangeError', () => {
    const bad = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const value of bad) {
      expect(() => resolveQualityScale(TIERS.t1, value, 900)).toThrow(RangeError);
      expect(() => resolveQualityScale(TIERS.t1, 1440, value)).toThrow(RangeError);
    }
  });
});
describe('classifyProbe', () => {
  it('grades a ~60 Hz probe as t2', () => {
    const result = classifyProbe(flatProbe(16.4));
    expect(result.tier).toBe('t2');
    expectWithin(result.medianMs, 16.4);
    expect(result.sampleCount).toBe(8 - BENCHMARK.warmupFrames);
  });
  it('uses inclusive thresholds (≤ rule) at both boundaries', () => {
    expect(classifyProbe(flatProbe(BENCHMARK.t2Ms)).tier).toBe('t2');
    expect(classifyProbe(flatProbe(17.5001)).tier).toBe('t1');
    expect(classifyProbe(flatProbe(BENCHMARK.t1Ms)).tier).toBe('t1');
    expect(classifyProbe(flatProbe(30.1)).tier).toBe('t0');
  });
  it('drops the warmup intervals so slow first rAFs never drag the median', () => {
    const result = classifyProbe([500, 80, ...flatProbe(16, 6)]);
    expect(result.tier).toBe('t2');
    expect(result.medianMs).toBe(16);
    expect(result.sampleCount).toBe(6);
  });
  it('takes the lower middle of even-length samples without averaging', () => {
    // samples after the two warmup drops: [20, 40, 30, 40, 50, 30] → sorted
    // [20, 30, 30, 40, 40, 50] → lower middle 30 → t1. The mean is 35 ms,
    // which would grade t0 — «without averaging» is exactly what this pins.
    const result = classifyProbe([16, 60, 20, 40, 30, 40, 50, 30]);
    expect(result.medianMs).toBe(30);
    expect(result.tier).toBe('t1');
  });
  it('degrades a too-short probe to the default tier with median 0', () => {
    const result = classifyProbe([16, 16, 16]);
    expect(result).toEqual({ tier: DEFAULT_TIER_ID, medianMs: 0, sampleCount: 1 });
    expect(result.sampleCount).toBeLessThan(BENCHMARK.minFrames);
  });
  it('caps at t0 on low-memory devices and leaves null memory alone', () => {
    expect(classifyProbe(flatProbe(16), { deviceMemoryGiB: 2 }).tier).toBe('t0');
    expect(classifyProbe(flatProbe(16), { deviceMemoryGiB: 4 }).tier).toBe('t2');
    expect(classifyProbe(flatProbe(16), { deviceMemoryGiB: null }).tier).toBe('t2');
    expect(classifyProbe([16, 16, 16], { deviceMemoryGiB: 2 }).tier).toBe('t0');
  });
  it('throws RangeError on nonfinite or nonpositive intervals', () => {
    expect(() => classifyProbe([16, Number.NaN, ...flatProbe(16, 6)])).toThrow(RangeError);
    expect(() => classifyProbe([16, -1, ...flatProbe(16, 6)])).toThrow(RangeError);
    expect(() => classifyProbe([0, ...flatProbe(16, 7)])).toThrow(RangeError);
    expect(() => classifyProbe([Number.POSITIVE_INFINITY, ...flatProbe(16, 7)])).toThrow(
      RangeError,
    );
  });
});
describe('parseQualityUpdate', () => {
  const parse = (query: string) => parseQualityUpdate(new URLSearchParams(query));
  it('accepts every spelling case-insensitively', () => {
    const cases: ReadonlyArray<[string, QualityTierId | 'auto']> = [
      ['q=auto', 'auto'],
      ['q=AUTO', 'auto'],
      ['q=t0', 't0'],
      ['q=0', 't0'],
      ['q=T1', 't1'],
      ['q=1', 't1'],
      ['q=t2', 't2'],
      ['q=T2', 't2'],
      ['q=2', 't2'],
      ['q=%20t2%20', 't2'],
    ];
    for (const [query, tier] of cases) {
      expect(parse(query)).toEqual({ tier, issues: [] });
    }
  });
  it('treats absent and empty q as auto with no issues', () => {
    expect(parse('')).toEqual({ tier: 'auto', issues: [] });
    expect(parse('at=2026-06-21T22:00:00Z&det=1')).toEqual({ tier: 'auto', issues: [] });
    expect(parse('q=')).toEqual({ tier: 'auto', issues: [] });
  });
  it('flags duplicates and lets the last value win', () => {
    expect(parse('q=t0&q=t2')).toEqual({ tier: 't2', issues: ['duplicate-q'] });
    expect(parse('q=t2&q=')).toEqual({ tier: 'auto', issues: ['duplicate-q'] });
    expect(parse('q=t2&q=bogus')).toEqual({ tier: 'auto', issues: ['duplicate-q', 'invalid-q'] });
  });
  it('flags garbage as invalid-q and falls back to auto', () => {
    expect(parse('q=ultra')).toEqual({ tier: 'auto', issues: ['invalid-q'] });
    expect(parse('q=3')).toEqual({ tier: 'auto', issues: ['invalid-q'] });
    expect(parse('q=constructor')).toEqual({ tier: 'auto', issues: ['invalid-q'] });
  });
  it('ignores unrelated params alongside q', () => {
    expect(parse('at=2026-06-21T22:00:00Z&q=t0&det=1')).toEqual({ tier: 't0', issues: [] });
  });
});
describe('determinism and frozen inputs', () => {
  it('returns identical outputs for identical inputs', () => {
    const intervals = [40, 16.4, 17, 16.2, 16.9, 16.5, 16.8, 16.3];
    expect(classifyProbe(intervals)).toEqual(classifyProbe(intervals));
    expect(parseQualityUpdate(new URLSearchParams('q=T2'))).toEqual(
      parseQualityUpdate(new URLSearchParams('q=T2')),
    );
    expect(resolveQualityScale(TIERS.t2, 1440, 900)).toBe(resolveQualityScale(TIERS.t2, 1440, 900));
  });
  it('leaves TIERS frozen and unchanged after a resolve/parse/classify round', () => {
    const snapshot = structuredClone(TIERS);
    resolveQualityScale(TIERS.t2, 1440, 900);
    parseQualityUpdate(new URLSearchParams('q=t0'));
    classifyProbe(flatProbe(16));
    expect(TIERS).toEqual(snapshot);
    expect(Object.isFrozen(TIERS)).toBe(true);
    for (const id of TIER_IDS) {
      expect(Object.isFrozen(TIERS[id])).toBe(true);
    }
  });
});
describe('purity', () => {
  const sources = import.meta.glob('../src/engine/tier.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (source: string): string =>
    stripComments(source)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('imports nothing from three.js or node built-ins', () => {
    const source = Object.values(sources)[0];
    expect(source).toBeDefined();
    const code = stripComments(source ?? '');
    expect(code).not.toMatch(/from\s+['"]three(?:\/[^'"]*)?['"]/);
    expect(code).not.toMatch(/import\s*\(\s*['"]three/);
    expect(code).not.toMatch(/from\s+['"]node:/);
  });
  it('touches no DOM, storage or clock surface outside comments and strings', () => {
    const source = Object.values(sources)[0];
    expect(source).toBeDefined();
    const code = stripLiterals(source ?? '');
    const forbidden: ReadonlyArray<[string, RegExp]> = [
      ['document', /\bdocument\b/],
      ['window', /\bwindow\b/],
      ['navigator', /\bnavigator\b/],
      ['localStorage', /\blocalStorage\b/],
      ['sessionStorage', /\bsessionStorage\b/],
      ['Date.now', /\bDate\.now\b/],
      ['Math.random', /\bMath\.random\b/],
      ['performance', /\bperformance\b/],
    ];
    for (const [name, pattern] of forbidden) {
      expect(code, `tier.ts must not reference ${name}`).not.toMatch(pattern);
    }
  });
});

describe('the R17-A auto policy (resolveAutoTier)', () => {
  it('coarse pointer OR memory below 4 selects T0 without a probe; else probe', () => {
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: null })).toBe('probe');
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: 3.75 })).toBe('t0');
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: 4 })).toBe('probe');
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: 8 })).toBe('probe');
    expect(resolveAutoTier({ coarsePointer: true, deviceMemoryGiB: null })).toBe('t0');
    expect(resolveAutoTier({ coarsePointer: true, deviceMemoryGiB: 8 })).toBe('t0');
    expect(resolveAutoTier({ coarsePointer: true, deviceMemoryGiB: 2 })).toBe('t0');
  });
  it('treats exactly 4.0 and null as not low, but 3.99 as low', () => {
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: 4.0 })).toBe('probe');
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: null })).toBe('probe');
    expect(resolveAutoTier({ coarsePointer: false, deviceMemoryGiB: 3.99 })).toBe('t0');
  });
  it('still caps a fast classified result independently of the policy gate', () => {
    const fast = flatProbe(10, BENCHMARK.warmupFrames + BENCHMARK.minFrames);
    expect(classifyProbe(fast, { deviceMemoryGiB: null }).tier).toBe('t2');
    expect(classifyProbe(fast, { deviceMemoryGiB: 2 }).tier).toBe('t0');
  });
});
