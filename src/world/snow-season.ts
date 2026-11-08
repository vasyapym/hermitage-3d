/*
 * Snow season — the pure calendar law behind the winter mode (wSnow).
 *
 * Implements DEC-033 (winter) and docs/design-winter.md §1. wSnow is the climatological
 * probability of persistent snow cover on the calendar date, NOT a depth: it ramps fast to a
 * plateau after the first persistent snowfall and lags the sun (the plateau centres ~6 weeks past
 * the solstice). The host feeds it the clock's instant — the same parsed epoch the sun samples
 * (`at=` / `det=`), never Date.now() — so under det the season is pinned by the URL.
 *
 * Pure by contract: no three, no DOM, no Date (the civil date is integer arithmetic; node
 * Vitest). Meshes live in src/procedural/snow-cap.ts; the kit's shader slot in
 * src/procedural/facade-builder.ts.
 *
 * Laws, stated once:
 *   seasonDay(epochMs)   days since the most recent Aug 1 on a fixed 365-day calendar, [0, 365);
 *                        Feb 29 clamps onto Feb 28 (the seams are weeks wide — immaterial)
 *   snowWeight(epochMs)  0 → 1 over Nov 10 → Dec 15 (smootherstep), exactly 1 to Mar 10,
 *                        1 → 0 to Apr 20 (smootherstep), exactly 0 otherwise
 *   snowVisible(w)       === w > 0 (the night lattice's mirror law)
 */
import { mod, smootherstep } from '../sky/easing';
import type { LinearRgb } from './night-facade';

/** A calendar date without a year: month 1–12, day 1–31. */
export type CalendarDay = Readonly<{ month: number; day: number }>;

/** The season axis origin: Aug 1 — the one day of the year farthest from any snow. */
export const SEASON_ORIGIN = { month: 8, day: 1 } as const satisfies CalendarDay;

/**
 * TUNING TARGET (DEC-033): the four calendar anchors — the owner's taste parameters, defensible
 * against the cited climatology (design-winter.md §7.6). Tune against the first dec-noon render.
 */
export const SNOW_ANCHORS = {
  accumulateStart: { month: 11, day: 10 },
  accumulateEnd: { month: 12, day: 15 },
  meltStart: { month: 3, day: 10 },
  meltEnd: { month: 4, day: 20 },
} as const satisfies Readonly<Record<string, CalendarDay>>;

/**
 * TUNING TARGET (DEC-033): the snow albedo, linear channels — near-white, slightly cool. Shared
 * by the cap's material and the kit's facade-surface slot term.
 */
export const SNOW_ALBEDO_LINEAR = [0.82, 0.86, 0.92] as const satisfies LinearRgb;

/**
 * The winter-square round's measured sky gain (the DEC-041 class-I owner grant, conditional
 * on the dec-noon P1–P4 battery: P2's all-fresh albedo still fell short of the declared
 * field/sky ≥ 0.6 target at 0.576, so the LIGHT bounded the field, not the albedo). K = the
 * smallest of the drawn {1.5, 2, 3} meeting the target — the probe under the re-declared
 * 2a constants measured BOTH far-fresh boxes passing at K = 1.5 (far-left 0.692, far-right
 * 0.640 vs the 0.3372 sky; probes/palace-snow-battery/reads.md).
 *
 * Laws, stated once:
 *   snowSkyGain(wSnow, wNight) = 1 + wSnow·(1 − wNight)·(K − 1)
 *   exactly 1.0 at wSnow = 0: the gain introduces no sky-colour change (June/October frames
 *   stay byte-identical — the ground term sits behind the zero-weight mix)
 *   exactly 1.0 at wNight = 1: the gain introduces no sky-colour change at night; the 2a
 *   ground albedo still applies at night, so dec-night re-baselines at the merge beside
 *   dec-noon (the Sol review: the (1 − wNight) gate bounds the sky contribution only)
 */
export const SNOW_SKY_GAIN_K = 1.5;

/** The hemisphere sky gain: a pure number the host multiplies the sky colour by. */
export function snowSkyGain(wSnow: number, wNight: number): number {
  return 1 + wSnow * (1 - wNight) * (SNOW_SKY_GAIN_K - 1);
}

/** TUNING TARGET (DEC-033): snow roughness — the cap's material and the slot's target. */
export const SNOW_ROUGHNESS = 0.9;

/** Snow metalness — the cap's material and the slot's target. */
export const SNOW_METALNESS = 0;

export const DAYS_PER_YEAR = 365;

const MS_PER_DAY = 86_400_000;

/* Fixed 365-day calendar: cumulative days before each month (Jan..Dec) and month lengths. */
const MONTH_START_DAY = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;

const MONTH_LENGTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Zero-based day of the fixed year; days past a month's fixed length clamp (Feb 29 → Feb 28). */
function dayOfYear(month: number, day: number): number {
  const start = MONTH_START_DAY[month - 1];
  const length = MONTH_LENGTH[month - 1];
  if (start === undefined || length === undefined) {
    throw new RangeError(`snow-season: month ${month} out of range`);
  }
  return start + Math.min(Math.max(day, 1), length) - 1;
}

/** Season day of a calendar date: whole days since Aug 1 on the fixed year, in [0, 365). */
export function seasonDayOfCalendar(date: CalendarDay): number {
  const origin = dayOfYear(SEASON_ORIGIN.month, SEASON_ORIGIN.day);
  return mod(dayOfYear(date.month, date.day) - origin, DAYS_PER_YEAR);
}

type UtcCivil = Readonly<{ month: number; day: number; dayFraction: number }>;

/** UTC month/day of an epoch instant by integer arithmetic (civil-from-days, proleptic Gregorian). */
function utcCivil(epochMs: number): UtcCivil {
  const days = Math.floor(epochMs / MS_PER_DAY);
  const dayFraction = (epochMs - days * MS_PER_DAY) / MS_PER_DAY;
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { month, day, dayFraction };
}

/** Fractional days since the most recent Aug 1 (UTC), in [0, 365). Continuous across Dec 31 → Jan 1 by construction. */
export function seasonDay(epochMs: number): number {
  if (!Number.isFinite(epochMs)) throw new RangeError('epoch must be finite');
  const { month, day, dayFraction } = utcCivil(epochMs);
  return seasonDayOfCalendar({ month, day }) + dayFraction;
}

/** The anchors on the season axis (whole days since Aug 1). */
export const SEASON_DAYS = {
  accumulateStart: seasonDayOfCalendar(SNOW_ANCHORS.accumulateStart),
  accumulateEnd: seasonDayOfCalendar(SNOW_ANCHORS.accumulateEnd),
  meltStart: seasonDayOfCalendar(SNOW_ANCHORS.meltStart),
  meltEnd: seasonDayOfCalendar(SNOW_ANCHORS.meltEnd),
} as const satisfies Readonly<Record<keyof typeof SNOW_ANCHORS, number>>;

export function snowWeight(epochMs: number): number {
  const d = seasonDay(epochMs);
  const { accumulateStart, accumulateEnd, meltStart, meltEnd } = SEASON_DAYS;
  if (d <= accumulateStart) return 0;
  if (d < accumulateEnd) {
    return smootherstep((d - accumulateStart) / (accumulateEnd - accumulateStart));
  }
  if (d <= meltStart) return 1;
  if (d < meltEnd) {
    return 1 - smootherstep((d - meltStart) / (meltEnd - meltStart));
  }
  return 0;
}

export function snowVisible(wSnow: number): boolean {
  return wSnow > 0;
}
