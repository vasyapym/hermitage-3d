// Node tests — design-winter.md §1 / §6, DEC-033. Pure module only: no DOM, no three,
// no current-clock dependency; every instant is a dated literal built with Date.UTC.
import { describe, expect, it } from 'vitest';
import {
  SEASON_DAYS,
  SNOW_ANCHORS,
  SNOW_SKY_GAIN_K,
  seasonDay,
  seasonDayOfCalendar,
  snowSkyGain,
  snowVisible,
  snowWeight,
} from '../src/world/snow-season';

const DAY_MS = 86_400_000;

// The brief pinned 0.02, which the law cannot satisfy: smootherstep's peak slope is 1.875 (at
// t = 0.5), and over the 35-day accumulate seam that is ≈ 1.875 / 35 ≈ 0.054 per day (the 41-day
// melt seam ≈ 0.046). Re-pinned to the analytic bound with margin.
const MAX_DAILY_JUMP = 0.06;

const utc = (year: number, month: number, day: number, hour = 0, minute = 0): number =>
  Date.UTC(year, month - 1, day, hour, minute);

const dailyFrom = (startMs: number, days: number): number[] =>
  Array.from({ length: days + 1 }, (_, i) => startMs + i * DAY_MS);

describe('snow season — the golden instants', () => {
  it('is exactly 1 at dec night (2026-12-21T18:00Z) and dec noon (2026-12-21T10:00Z)', () => {
    expect(snowWeight(utc(2026, 12, 21, 18))).toBe(1);
    expect(snowWeight(utc(2026, 12, 21, 10))).toBe(1);
  });

  it('is exactly 0 at oct night (2026-10-15T20:00Z)', () => {
    expect(snowWeight(utc(2026, 10, 15, 20))).toBe(0);
  });

  it('is exactly 0 at the June goldens (noon, white night, s1 noon)', () => {
    expect(snowWeight(utc(2026, 6, 21, 12))).toBe(0);
    expect(snowWeight(utc(2026, 6, 20, 21, 45))).toBe(0);
  });
});

describe('snow season — the season axis', () => {
  it('starts the axis on Aug 1 and wraps the year with no gap', () => {
    expect(seasonDayOfCalendar({ month: 8, day: 1 })).toBe(0);
    expect(seasonDayOfCalendar({ month: 7, day: 31 })).toBe(364);
    expect(seasonDayOfCalendar({ month: 12, day: 31 }) + 1).toBe(
      seasonDayOfCalendar({ month: 1, day: 1 }),
    );
  });

  it('orders the anchors along the axis', () => {
    expect(SEASON_DAYS.accumulateStart).toBeLessThan(SEASON_DAYS.accumulateEnd);
    expect(SEASON_DAYS.accumulateEnd).toBeLessThan(SEASON_DAYS.meltStart);
    expect(SEASON_DAYS.meltStart).toBeLessThan(SEASON_DAYS.meltEnd);
    expect(SEASON_DAYS.accumulateStart).toBe(seasonDayOfCalendar(SNOW_ANCHORS.accumulateStart));
  });

  it('carries the time of day as a fraction', () => {
    expect(seasonDay(utc(2026, 8, 1))).toBe(0);
    expect(seasonDay(utc(2026, 8, 1, 12))).toBeCloseTo(0.5, 12);
  });

  it('rejects non-finite instants', () => {
    expect(() => snowWeight(Number.NaN)).toThrow(RangeError);
    expect(() => snowWeight(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('snow season — plateaus and seams', () => {
  it('is exactly 0 on Aug 1 and Jul 31', () => {
    expect(snowWeight(utc(2026, 8, 1))).toBe(0);
    expect(snowWeight(utc(2026, 8, 1, 12))).toBe(0);
    expect(snowWeight(utc(2026, 7, 31))).toBe(0);
    expect(snowWeight(utc(2026, 7, 31, 23, 59))).toBe(0);
  });

  it('is exactly 1 on Jan 15', () => {
    expect(snowWeight(utc(2027, 1, 15))).toBe(1);
    expect(snowWeight(utc(2027, 1, 15, 12))).toBe(1);
  });

  it('is exactly 0 at the accumulate start and exactly 1 at its end', () => {
    expect(snowWeight(utc(2026, 11, 10))).toBe(0);
    expect(snowWeight(utc(2026, 12, 15))).toBe(1);
  });

  it('is exactly 1 at the melt start and exactly 0 at its end', () => {
    expect(snowWeight(utc(2027, 3, 10))).toBe(1);
    expect(snowWeight(utc(2027, 4, 20))).toBe(0);
  });

  it('accumulates monotone non-decreasing Nov 10 → Dec 15, sampled daily', () => {
    let previous = snowWeight(utc(2026, 11, 10));
    for (const epochMs of dailyFrom(utc(2026, 11, 10), 35)) {
      const w = snowWeight(epochMs);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(w).toBeGreaterThanOrEqual(previous);
      previous = w;
    }
    expect(previous).toBe(1);
  });

  it('melts monotone non-increasing Mar 10 → Apr 20, sampled daily', () => {
    let previous = snowWeight(utc(2027, 3, 10));
    for (const epochMs of dailyFrom(utc(2027, 3, 10), 41)) {
      const w = snowWeight(epochMs);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(previous);
      previous = w;
    }
    expect(previous).toBe(0);
  });

  it('crosses its seams at exactly one half', () => {
    const accumulateMid = (utc(2026, 11, 10) + utc(2026, 12, 15)) / 2;
    const meltMid = (utc(2027, 3, 10) + utc(2027, 4, 20)) / 2;
    expect(snowWeight(accumulateMid)).toBeCloseTo(0.5, 12);
    expect(snowWeight(meltMid)).toBeCloseTo(0.5, 12);
  });
});

describe('snow season — continuity', () => {
  it('never jumps more than the daily bound anywhere in a year, Dec 31 → Jan 1 included', () => {
    let previous = snowWeight(utc(2026, 7, 1));
    let maxJump = 0;
    for (const epochMs of dailyFrom(utc(2026, 7, 1), 365)) {
      const w = snowWeight(epochMs);
      expect(Number.isFinite(w)).toBe(true);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      maxJump = Math.max(maxJump, Math.abs(w - previous));
      previous = w;
    }
    expect(maxJump).toBeLessThanOrEqual(MAX_DAILY_JUMP);
  });

  it('is continuous across the year boundary', () => {
    const dec31 = snowWeight(utc(2026, 12, 31, 23, 59));
    const jan1 = snowWeight(utc(2027, 1, 1, 0, 1));
    expect(Math.abs(jan1 - dec31)).toBeLessThanOrEqual(1e-9);
    expect(seasonDay(utc(2027, 1, 1)) - seasonDay(utc(2026, 12, 31))).toBeCloseTo(1, 9);
  });

  it('returns a finite weight in [0, 1] on a leap day (2028-02-29T12:00Z)', () => {
    const w = snowWeight(utc(2028, 2, 29, 12));
    expect(Number.isFinite(w)).toBe(true);
    expect(w).toBeGreaterThanOrEqual(0);
    expect(w).toBeLessThanOrEqual(1);
  });

  it('is pure: repeated calls agree', () => {
    const epochMs = utc(2026, 11, 27, 9, 30);
    expect(snowWeight(epochMs)).toBe(snowWeight(epochMs));
  });
});

describe('snow season — visibility law', () => {
  it('hides exactly at 0 and shows for any positive weight', () => {
    expect(snowVisible(0)).toBe(false);
    expect(snowVisible(Number.MIN_VALUE)).toBe(true);
    expect(snowVisible(1)).toBe(true);
  });
});

describe('snow sky gain — the winter-square round (the DEC-041 class-I grant, measured)', () => {
  it('is exactly 1.0 at wSnow = 0 for every wNight (the June/October IEEE identity)', () => {
    for (const wNight of [0, 0.25, 0.5, 0.75, 1]) {
      expect(snowSkyGain(0, wNight)).toBe(1);
    }
  });

  it('is exactly 1.0 at wNight = 1 for every wSnow (dec-night stays byte-identical)', () => {
    for (const wSnow of [0, 0.25, 0.5, 0.75, 1]) {
      expect(snowSkyGain(wSnow, 1)).toBe(1);
    }
  });

  it('is exactly K at wSnow = 1, wNight = 0 (the measured constant)', () => {
    expect(snowSkyGain(1, 0)).toBe(SNOW_SKY_GAIN_K);
    expect(SNOW_SKY_GAIN_K).toBe(1.5);
  });

  it('is monotone non-decreasing in wSnow at wNight = 0 and ranges over [1, K]', () => {
    let previous = snowSkyGain(0, 0);
    for (let w = 0; w <= 1; w += 0.05) {
      const gain = snowSkyGain(w, 0);
      expect(gain).toBeGreaterThanOrEqual(previous);
      expect(gain).toBeGreaterThanOrEqual(1);
      expect(gain).toBeLessThanOrEqual(SNOW_SKY_GAIN_K);
      previous = gain;
    }
  });

  it('is pure: repeated calls agree', () => {
    expect(snowSkyGain(0.75, 0.5)).toBe(snowSkyGain(0.75, 0.5));
  });
});
