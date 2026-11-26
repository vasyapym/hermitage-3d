// tests/sky-appearance.test.ts
/**
 * sq-fix-improve R2 (the low-sun warm key — creative's DEC-056 proposal): the ruling's five
 * pinned lowSunMix values. The law is pure (src/sky/appearance.ts, three-free); main.ts
 * consumes it as the warm sun endpoint's elevation key. h 6.6° → 0.12, 16° → 0.75, ≥ 25°
 * exactly 1, ≤ 0° exactly 0.
 */
import { describe, expect, it } from 'vitest';
import { lowSunMix } from '../src/sky/appearance';

describe('lowSunMix (sq-fix-improve R2 — the five ruled values)', () => {
  it('is exactly 0 below the ramp (the night/twilight floor)', () => {
    expect(lowSunMix(-5)).toBe(0);
  });

  it('is ≈ 0.12 ± 0.01 at the dec 6.6° sun', () => {
    expect(lowSunMix(6.6)).toBeCloseTo(0.12, 2);
  });

  it('is ≈ 0.75 ± 0.01 at 16°', () => {
    expect(lowSunMix(16)).toBeCloseTo(0.75, 2);
  });

  it('is exactly 1 at the 25° ramp top', () => {
    expect(lowSunMix(25)).toBe(1);
  });

  it('holds exactly 1 above the ramp (51°)', () => {
    expect(lowSunMix(51)).toBe(1);
  });
});
