// Node tests — design-sky-time.md §12. Pure modules only: no DOM, no WebGL,
// no current-clock dependency. The four dated solar fixtures are the only
// dated references; everything else follows the contract's property checks.
import { describe, expect, it } from 'vitest';
import { DETERMINISTIC_SEED, TIME } from '../src/content/sky-time';
import { atmosphereForElevation, sampleSky } from '../src/sky/appearance';
import { advanceArrival, initialArrival, presentationForArrival } from '../src/sky/arrival';
import { exposureForElevation } from '../src/sky/exposure';
import { lightmapWeights } from '../src/sky/lightmap-weights';
import { solarPosition } from '../src/sky/solar';
import {
  canonicalAt,
  epochAt,
  formatPetersburg,
  parseTime,
  scrubBounds,
  scrubEpoch,
} from '../src/sky/time';

const VECTOR_TOLERANCE = 0.00001;
const ROUNDING_TOLERANCE = 1e-12;

// design-sky-time.md §6 — exactly four dated reference vectors.
const SOLAR_VECTORS = [
  {
    label: 'June solstice, 13:00',
    epochMs: 1782036000000,
    elevationDeg: 53.498189,
    azimuthDeg: 179.788785,
  },
  {
    label: 'June solstice, 00:45',
    epochMs: 1781991900000,
    elevationDeg: -6.562633,
    azimuthDeg: 356.436275,
  },
  {
    label: 'December solstice, 13:00',
    epochMs: 1797847200000,
    elevationDeg: 6.620538,
    azimuthDeg: 180.744154,
  },
  {
    label: 'March equinox, 13:00',
    epochMs: 1774000800000,
    elevationDeg: 29.971841,
    azimuthDeg: 178.210866,
  },
] as const;

const circularError = (a: number, b: number): number =>
  Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

const sum3 = (w: { day: number; dusk: number; nightChandeliers: number }): number =>
  w.day + w.dusk + w.nightChandeliers;

// Seeded LCG over the supported epoch interval — deterministic, no Date.now().
const seededEpochs = (count: number, seed: number): number[] => {
  const state = { value: seed >>> 0 };
  const next = (): number => {
    state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0;
    return state.value / 2 ** 32;
  };
  const span = TIME.maxEpochMsExclusive - 1 - TIME.minEpochMs;
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(TIME.minEpochMs + Math.floor(next() * span));
  }
  return out;
};

describe('solar position', () => {
  describe('contract vectors', () => {
    for (const vector of SOLAR_VECTORS) {
      it(`${vector.label} matches the contract to 1e-5°`, () => {
        const position = solarPosition(vector.epochMs);
        expect(Math.abs(position.elevationDeg - vector.elevationDeg)).toBeLessThanOrEqual(
          VECTOR_TOLERANCE,
        );
        expect(circularError(position.azimuthDeg, vector.azimuthDeg)).toBeLessThanOrEqual(
          VECTOR_TOLERANCE,
        );
      });
    }
  });

  it('is pure: repeated calls are identical', () => {
    for (const vector of SOLAR_VECTORS) {
      expect(solarPosition(vector.epochMs)).toEqual(solarPosition(vector.epochMs));
    }
  });

  it('stays finite and inside its angular ranges across a seeded sample', () => {
    for (const epochMs of seededEpochs(250, DETERMINISTIC_SEED)) {
      const position = solarPosition(epochMs);
      expect(Number.isFinite(position.elevationDeg)).toBe(true);
      expect(Number.isFinite(position.azimuthDeg)).toBe(true);
      expect(position.elevationDeg).toBeGreaterThanOrEqual(-90);
      expect(position.elevationDeg).toBeLessThanOrEqual(90);
      expect(position.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(position.azimuthDeg).toBeLessThan(360);
    }
  });

  it('exercises positive modulo with valid negative epochs', () => {
    const position = solarPosition(-100000000); // 1969-12-25T14:13:20Z
    expect(Number.isFinite(position.elevationDeg)).toBe(true);
    expect(position.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(position.azimuthDeg).toBeLessThan(360);
  });

  it('accepts its epoch bounds', () => {
    expect(() => solarPosition(TIME.minEpochMs)).not.toThrow();
    expect(() => solarPosition(TIME.maxEpochMsExclusive - 1)).not.toThrow();
  });

  it('rejects invalid epochs before trigonometric work', () => {
    for (const bad of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1.5,
      -0.5,
      2 ** 53, // integer but beyond the safe range
      TIME.minEpochMs - 1,
      TIME.maxEpochMsExclusive,
    ] as const) {
      expect(() => solarPosition(bad)).toThrow(RangeError);
    }
  });
});

describe('exposure', () => {
  it('plateaus exactly at its endpoints', () => {
    expect(exposureForElevation(-6.6)).toBe(0.55);
    expect(exposureForElevation(15)).toBe(1);
    expect(exposureForElevation(-90)).toBe(0.55);
    expect(exposureForElevation(90)).toBe(1);
  });

  it('is continuous at its joins', () => {
    expect(exposureForElevation(-6.6 - 1e-9)).toBeCloseTo(0.55, 8);
    expect(exposureForElevation(-6.6 + 1e-9)).toBeCloseTo(0.55, 8);
    expect(exposureForElevation(15 - 1e-9)).toBeCloseTo(1, 8);
  });

  it('is monotone with elevation and bounded', () => {
    let previous = exposureForElevation(-90);
    for (let h = -89; h <= 90; h += 1) {
      const value = exposureForElevation(h);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(0.55);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it('rejects non-finite elevations', () => {
    expect(() => exposureForElevation(Number.NaN)).toThrow(RangeError);
    expect(() => exposureForElevation(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => exposureForElevation(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('lightmap weights', () => {
  it('returns exactly the frozen keys', () => {
    expect(Object.keys(lightmapWeights(-6.6)).sort()).toEqual(['day', 'dusk', 'nightChandeliers']);
  });

  it('is one-hot at the state centres', () => {
    expect(lightmapWeights(-12)).toEqual({ day: 0, dusk: 0, nightChandeliers: 1 });
    expect(lightmapWeights(-6.6)).toEqual({ day: 0, dusk: 1, nightChandeliers: 0 });
    expect(lightmapWeights(15)).toEqual({ day: 1, dusk: 0, nightChandeliers: 0 });
  });

  it('respects the exact branch boundaries', () => {
    expect(lightmapWeights(-8)).toEqual({ day: 0, dusk: 0, nightChandeliers: 1 });
    expect(lightmapWeights(-7)).toEqual({ day: 0, dusk: 1, nightChandeliers: 0 });
    expect(lightmapWeights(-4)).toEqual({ day: 0, dusk: 1, nightChandeliers: 0 });
    expect(lightmapWeights(10)).toEqual({ day: 1, dusk: 0, nightChandeliers: 0 });
  });

  it('crosses smoothly: at half-join dusk is exactly one half', () => {
    expect(lightmapWeights(-7.5).dusk).toBeCloseTo(0.5, 12);
    expect(lightmapWeights(-7.5).nightChandeliers).toBeCloseTo(0.5, 12);
  });

  it('weights sum to 1, bounded, day monotone up, night monotone down', () => {
    let previousDay = lightmapWeights(-15).day;
    let previousNight = lightmapWeights(-15).nightChandeliers;
    for (let h = -15; h <= 20; h = Math.round((h + 0.05) * 100) / 100) {
      const weights = lightmapWeights(h);
      expect(sum3(weights)).toBeLessThanOrEqual(1 + ROUNDING_TOLERANCE);
      expect(weights.day).toBeGreaterThanOrEqual(0);
      expect(weights.dusk).toBeGreaterThanOrEqual(0);
      expect(weights.nightChandeliers).toBeGreaterThanOrEqual(0);
      expect(weights.day).toBeLessThanOrEqual(1);
      expect(weights.nightChandeliers).toBeLessThanOrEqual(1);
      expect(weights.day).toBeGreaterThanOrEqual(previousDay);
      expect(weights.nightChandeliers).toBeLessThanOrEqual(previousNight);
      previousDay = weights.day;
      previousNight = weights.nightChandeliers;
    }
  });

  it('rejects non-finite elevations', () => {
    expect(() => lightmapWeights(Number.NaN)).toThrow(RangeError);
    expect(() => lightmapWeights(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => lightmapWeights(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('appearance', () => {
  it('is exactly the night palette deep below the horizon', () => {
    const atmosphere = atmosphereForElevation(-20);
    expect(atmosphere.zenithRgb).toEqual([0.0015, 0.003, 0.01]);
    expect(atmosphere.horizonRgb).toEqual([0.003, 0.006, 0.02]);
    expect(atmosphere.glowStrength).toBe(0);
    expect(atmosphere.sunIntensity).toBe(0);
  });

  it('is exactly the day palette above the ramp (sq-arch-day: the B2 zenith, the B1 peak)', () => {
    const atmosphere = atmosphereForElevation(20);
    expect(atmosphere.zenithRgb).toEqual([0.08, 0.2, 0.5]);
    expect(atmosphere.horizonRgb).toEqual([0.58, 0.7, 0.8]);
    expect(atmosphere.glowStrength).toBe(0);
    expect(atmosphere.sunIntensity).toBe(6);
  });

  it('is finite, non-negative and continuous through the twilight band', () => {
    let previous: [number, number, number] | null = null;
    for (let h = -9; h <= -4; h = Math.round((h + 0.02) * 1000) / 1000) {
      const atmosphere = atmosphereForElevation(h);
      for (const component of atmosphere.zenithRgb) {
        expect(Number.isFinite(component)).toBe(true);
        expect(component).toBeGreaterThanOrEqual(0);
      }
      for (const component of atmosphere.horizonRgb) {
        expect(Number.isFinite(component)).toBe(true);
        expect(component).toBeGreaterThanOrEqual(0);
      }
      expect(Number.isFinite(atmosphere.glowStrength)).toBe(true);
      if (previous !== null) {
        const step = Math.max(
          Math.abs(atmosphere.zenithRgb[0] - previous[0]),
          Math.abs(atmosphere.zenithRgb[1] - previous[1]),
          Math.abs(atmosphere.zenithRgb[2] - previous[2]),
        );
        expect(step).toBeLessThanOrEqual(0.01);
      }
      previous = [...atmosphere.zenithRgb];
    }
  });

  it('sampleSky keeps the vectors unit and coherent with the scalar contracts', () => {
    const sample = sampleSky(1782036000000);
    const [sx, sy, sz] = sample.sunDirection;
    expect(sx * sx + sy * sy + sz * sz).toBeCloseTo(1, 9);
    // Near-noon June sun: light arrives from the south (+Z), sky side.
    expect(sz).toBeGreaterThan(0);
    const [ax, ay, az] = sample.horizonSunDirection;
    expect(ay).toBe(0);
    expect(ax * ax + az * az).toBeCloseTo(1, 9);
    expect(sample.lightmaps).toEqual(lightmapWeights(sample.solar.elevationDeg));
    expect(sample.exposure).toBe(exposureForElevation(sample.solar.elevationDeg));
  });

  it('rejects invalid epochs through the sample path', () => {
    expect(() => sampleSky(Number.NaN)).toThrow(RangeError);
    expect(() => sampleSky(TIME.maxEpochMsExclusive)).toThrow(RangeError);
  });
});

describe('time — URL parsing', () => {
  const NOW = 1782036000000;

  it('defaults to live now for an empty fragment', () => {
    const parsed = parseTime('', NOW);
    expect(parsed.state).toEqual({ mode: 'live', deterministic: false });
    expect(parsed.initialEpochMs).toBe(NOW);
    expect(parsed.issues).toEqual([]);
  });

  it('treats a route-only fragment as the query with no issues', () => {
    const parsed = parseTime('jordan', NOW);
    expect(parsed.state).toEqual({ mode: 'live', deterministic: false });
    expect(parsed.issues).toEqual([]);
  });

  it('parses the canonical vector timestamp with its offset', () => {
    const parsed = parseTime('#/?at=2026-06-21T13:00:00%2B03:00', NOW);
    expect(parsed.state).toEqual({ mode: 'fixed', deterministic: false, epochMs: 1782036000000 });
    expect(parsed.initialEpochMs).toBe(1782036000000);
    expect(parsed.issues).toEqual([]);
  });

  it('degrades a raw plus offset to invalid-at instead of a mis-read timezone', () => {
    const parsed = parseTime('?at=2026-06-21T13:00:00+03:00', NOW);
    expect(parsed.issues).toEqual(['invalid-at']);
    expect(parsed.initialEpochMs).toBe(NOW);
  });

  it('accepts the Z form and encoded offsets', () => {
    const z = parseTime('?at=2026-06-21T10:00:00.000Z', NOW);
    expect(z.initialEpochMs).toBe(1782036000000);
    const plus = parseTime('?at=2026-06-21T13:00:00%2B03:00', NOW);
    expect(plus.initialEpochMs).toBe(1782036000000);
    expect(plus.issues).toEqual([]);
  });

  it('honours det=1 with an empty at as a captured fixed now', () => {
    const parsed = parseTime('#/?det=1', NOW);
    expect(parsed.state).toEqual({ mode: 'fixed', deterministic: true, epochMs: NOW });
    expect(parsed.issues).toEqual([]);
  });

  it('rejects malformed timestamps with invalid-at', () => {
    for (const at of [
      '2026-06-21t13:00:00+03:00', // lowercase t
      '2026-06-21T13:00:00+03:00z', // lowercase z
      '2026-06-21T13:00:00', // missing offset
      '2026-06-21', // date only
      '1782036000000', // epoch shorthand
      '2026-06-21T13:00:00 +03:00', // whitespace
      '2026-06-21T13:00:00+Europe/Rome', // named zone
      '2026-02-29T12:00:00Z', // not a leap year
      '2026-02-30T12:00:00Z', // rollover attempt
      '2026-00-10T12:00:00Z', // month 00
      '2026-06-21T24:00:00Z', // hour 24
      '2026-06-21T13:00:60Z', // seconds 60
      '2026-06-21T13:00:00+15:00', // offset beyond 14:00
      '2026-06-21T13:00:00+14:01', // offset just beyond the cap
    ] as const) {
      const parsed = parseTime(`?at=${at}`, NOW);
      expect(parsed.issues).toContain('invalid-at');
      expect(parsed.initialEpochMs).toBe(NOW);
    }
  });

  it('accepts 2024-02-29 and both 14:00 offset magnitudes', () => {
    expect(parseTime('?at=2024-02-29T12:00:00Z', NOW).issues).toEqual([]);
    expect(parseTime('?at=2026-06-21T13:00:00%2B14:00', NOW).issues).toEqual([]);
    expect(parseTime('?at=2026-06-21T13:00:00-14:00', NOW).issues).toEqual([]);
  });

  it('rejects an at that is too long before calendar parsing', () => {
    const parsed = parseTime(`?at=${'x'.repeat(65)}`, NOW);
    expect(parsed.issues).toEqual(['at-too-long']);
  });

  it('invalidates duplicated keys without picking a value', () => {
    const duplicatedAt = parseTime('?at=2026-06-21T10:00:00Z&at=2026-06-22T10:00:00Z', NOW);
    expect(duplicatedAt.issues).toEqual(['duplicate-at']);
    expect(duplicatedAt.state).toEqual({ mode: 'live', deterministic: false });

    const duplicatedDet = parseTime('?det=1&det=0', NOW);
    expect(duplicatedDet.issues).toEqual(['duplicate-det']);
    expect(duplicatedDet.state).toEqual({ mode: 'live', deterministic: false });
  });

  it('applies a valid det to captured now when at is invalid', () => {
    const parsed = parseTime('?at=2026-02-30T12:00:00Z&det=1', NOW);
    expect(parsed.state).toEqual({ mode: 'fixed', deterministic: true, epochMs: NOW });
    expect(parsed.issues).toEqual(['invalid-at']);
  });

  it('treats other det values as invalid-det acting false', () => {
    expect(parseTime('?det=2', NOW).issues).toEqual(['invalid-det']);
    expect(parseTime('?det=2', NOW).state).toEqual({ mode: 'live', deterministic: false });
    expect(parseTime('?det=', NOW).issues).toEqual([]);
    expect(parseTime('?det=0', NOW).issues).toEqual([]);
  });

  it('marks out-of-range at as validation failure, not a clamp', () => {
    const beyond = parseTime('?at=2100-01-01T00:00:00Z&det=1', NOW);
    expect(beyond.issues).toEqual(['at-out-of-range']);
    expect(beyond.state).toEqual({ mode: 'fixed', deterministic: true, epochMs: NOW });
    const before = parseTime('?at=1900-12-31T23:00:00Z', NOW);
    expect(before.issues).toEqual(['at-out-of-range']);
  });

  it('defaults without parsing an oversized fragment', () => {
    const parsed = parseTime(`?det=1&pad=${'x'.repeat(4200)}`, NOW);
    expect(parsed.issues).toEqual(['fragment-too-long']);
    expect(parsed.state).toEqual({ mode: 'live', deterministic: false });
  });

  it('treats a misconfigured host clock as an integration error', () => {
    expect(() => parseTime('', TIME.maxEpochMsExclusive)).toThrow(RangeError);
    expect(() => parseTime('', TIME.minEpochMs - 1)).toThrow(RangeError);
    expect(() => epochAt({ mode: 'live', deterministic: false }, 2 ** 53)).toThrow(RangeError);
  });

  it('canonicalizes to UTC with milliseconds', () => {
    expect(canonicalAt(1782036000000)).toBe('2026-06-21T10:00:00.000Z');
    expect(canonicalAt(TIME.minEpochMs)).toBe('1901-01-01T00:00:00.000Z');
    expect(canonicalAt(TIME.maxEpochMsExclusive - 1)).toBe('2099-12-31T23:59:59.999Z');
    expect(() => canonicalAt(TIME.maxEpochMsExclusive)).toThrow(RangeError);
  });

  it('formats Petersburg time on the fixed offset with rollover', () => {
    expect(formatPetersburg(1782036000000)).toEqual({
      date: '2026-06-21',
      time: '13:00',
      offset: 'UTC+03:00',
    });
    const late = Date.UTC(2026, 11, 31, 23, 30);
    expect(formatPetersburg(late)).toEqual({
      date: '2027-01-01',
      time: '02:30',
      offset: 'UTC+03:00',
    });
    expect(formatPetersburg(TIME.minEpochMs)).toEqual({
      date: '1901-01-01',
      time: '03:00',
      offset: 'UTC+03:00',
    });
  });
});

describe('time — scrub transaction', () => {
  const ANCHOR = 1782036000000;
  const MINUTE = TIME.minuteMs;

  it('returns the full window for a mid-range anchor', () => {
    expect(scrubBounds(ANCHOR)).toEqual([ANCHOR - TIME.scrubRadiusMs, ANCHOR + TIME.scrubRadiusMs]);
  });

  it('clamps to the supported interval on whole minutes at both edges', () => {
    const low = scrubBounds(TIME.minEpochMs);
    expect(low[0]).toBe(TIME.minEpochMs);
    expect(low[1]).toBe(TIME.minEpochMs + TIME.scrubRadiusMs);
    const high = scrubBounds(TIME.maxEpochMsExclusive - 1);
    expect(high[0]).toBe(4102358400000);
    expect(high[1]).toBe(4102444740000);
    expect(high[1]).toBeLessThan(TIME.maxEpochMsExclusive);
  });

  it('produces whole-minute bounds for non-aligned anchors', () => {
    const anchor = ANCHOR + 123456;
    const [lower, upper] = scrubBounds(anchor);
    expect(lower % MINUTE).toBe(0);
    expect(upper % MINUTE).toBe(0);
    expect(lower).toBeGreaterThanOrEqual(anchor - TIME.scrubRadiusMs);
    expect(upper).toBeLessThanOrEqual(anchor + TIME.scrubRadiusMs);
  });

  it('steps one minute, clamps ±1440, rounds to nearest minute', () => {
    expect(scrubEpoch(ANCHOR, 1)).toBe(ANCHOR + MINUTE);
    expect(scrubEpoch(ANCHOR, -1)).toBe(ANCHOR - MINUTE);
    expect(scrubEpoch(ANCHOR, 2000)).toBe(ANCHOR + TIME.scrubRadiusMs);
    expect(scrubEpoch(ANCHOR, -2000)).toBe(ANCHOR - TIME.scrubRadiusMs);
    expect(scrubEpoch(ANCHOR, 1.5)).toBe(ANCHOR + 2 * MINUTE);
    // Half-minute below the anchor rounds to the nearest minute (down here).
    expect(scrubEpoch(ANCHOR, -1.5)).toBe(ANCHOR - MINUTE);
  });

  it('stays inside its gesture window for extreme finite offsets', () => {
    const [lower, upper] = scrubBounds(ANCHOR);
    for (const extreme of [Number.MIN_VALUE, 1e12, -1e12]) {
      const result = scrubEpoch(ANCHOR, extreme);
      expect(result).toBeGreaterThanOrEqual(lower);
      expect(result).toBeLessThanOrEqual(upper);
      expect(result % MINUTE).toBe(0);
    }
  });

  it('rejects non-finite offsets and invalid anchors', () => {
    expect(() => scrubEpoch(ANCHOR, Number.NaN)).toThrow(RangeError);
    expect(() => scrubEpoch(ANCHOR, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => scrubEpoch(TIME.maxEpochMsExclusive, 1)).toThrow(RangeError);
  });

  it('is pure: repeated calls with the same arguments agree', () => {
    expect(scrubBounds(ANCHOR)).toEqual(scrubBounds(ANCHOR));
    expect(scrubEpoch(ANCHOR, 77)).toBe(scrubEpoch(ANCHOR, 77));
  });
});

describe('arrival', () => {
  it('starts invisible and only beats forward', () => {
    const sky = initialArrival();
    expect(presentationForArrival(sky, false)).toEqual({ titleVisible: false, massingOpacity: 0 });
    const title = advanceArrival(sky, 1000, true, false);
    expect(title).toEqual({ phase: 'title', elapsedMs: 0 });
    expect(presentationForArrival(title, false)).toEqual({ titleVisible: true, massingOpacity: 0 });
  });

  it('holds title for 240 ms in normal mode and fades massing smoothly', () => {
    let state = advanceArrival(initialArrival(), 1000, true, false);
    state = advanceArrival(state, 100, true, false); // 100 < 240
    expect(state.phase).toBe('title');
    state = advanceArrival(state, 150, true, false); // 250 >= 240
    expect(state).toEqual({ phase: 'massing', elapsedMs: 0 });
    state = advanceArrival(state, 300, true, false);
    const presentation = presentationForArrival(state, false);
    expect(presentation.massingOpacity).toBeCloseTo(0.5, 12);
    state = advanceArrival(state, 300, true, false); // 600 ms total
    expect(state.phase).toBe('settled');
    expect(presentationForArrival(state, false)).toEqual({ titleVisible: true, massingOpacity: 1 });
  });

  it('never advances massing before it is presentation-ready', () => {
    let state = advanceArrival(initialArrival(), 1000, false, false);
    state = advanceArrival(state, 1000, false, false);
    if (state.phase !== 'title') throw new Error('beat order broken');
    expect(state.elapsedMs).toBeGreaterThanOrEqual(240);
    state = advanceArrival(state, 0, true, false);
    expect(state.phase).toBe('massing');
  });

  it('skips only the hold, never a beat, in deterministic mode', () => {
    let state = advanceArrival(initialArrival(), 1000, true, true);
    expect(state.phase).toBe('title');
    state = advanceArrival(state, 1, true, true);
    expect(state).toEqual({ phase: 'massing', elapsedMs: 0 });
    expect(presentationForArrival(state, true)).toEqual({ titleVisible: true, massingOpacity: 1 });
    state = advanceArrival(state, 600, true, true);
    expect(state.phase).toBe('settled');
  });

  it('keeps a valid scene while data is late and runs no hidden beats', () => {
    const state = advanceArrival(
      advanceArrival(initialArrival(), 16, false, false),
      16,
      false,
      false,
    );
    if (state.phase !== 'title') throw new Error('beat order broken');
    expect(state.elapsedMs).toBeGreaterThanOrEqual(0);
    // Title (and only title) is presented while massing data is late.
    expect(presentationForArrival(state, false).titleVisible).toBe(true);
    expect(presentationForArrival(state, false).massingOpacity).toBe(0);
  });

  it('validates delta and is sticky when settled', () => {
    const title = advanceArrival(initialArrival(), 1000, true, false);
    expect(() => advanceArrival(title, Number.NaN, true, false)).toThrow(RangeError);
    expect(() => advanceArrival(title, -1, true, false)).toThrow(RangeError);
    const settled = advanceArrival(advanceArrival(title, 240, true, false), 600, true, false);
    expect(settled.phase).toBe('settled');
    expect(advanceArrival(settled, 100, false, false)).toEqual(settled);
  });
});
