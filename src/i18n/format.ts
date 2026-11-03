// src/i18n/format.ts
/**
 * Formatting law (design-i18n-notes.md §0, §1.4, §4.E, §8; decisions D3, D6). The r25
 * merge of the specialist's draft with the r24a byte laws, which win where they clash:
 * MINUS_SIGN stays ASCII (the committed EN bytes pin it), formatInt still truncates
 * non-integers toward zero (pinned by test), and formatNumber still trims trailing
 * fraction zeros with an integer fast path (the /notes display bytes are pinned by the
 * model fixture) — the language parameter changes the DECIMAL byte only.
 *
 * - Interpolation: templates carry real {name} tokens; a variable that is not a token and
 *   a token without a variable are both loud errors, so template/variable drift fails the
 *   first render (templateTokens feeds the round-25 parity test).
 * - Numbers: thousands grouped with THIN SPACE in both languages (§0); the decimal
 *   separator is the only language-dependent byte ('.' EN, ',' RU); a NO-BREAK SPACE
 *   between a number and its unit; the byte-unit map is language-aware (EN B/kB,
 *   RU Б/кБ — D3). Metres are a display map on the host side, not here.
 * - Clock: Petersburg wall time, pure arithmetic over the epoch shifted by
 *   PETERSBURG_OFFSET_MS; no calendar object is ever constructed.
 * - Calendar line: EN prints the frozen ISO YYYY-MM-DD bytes (arithmetic, unchanged);
 *   RU asks Intl.DateTimeFormat('ru-RU') over the same shifted epoch and falls back to
 *   ISO when the formatter throws or yields a digits-only string (D6). '\bDate\b' does
 *   not match 'DateTimeFormat' — the purity fence is intact.
 *
 * Pure module: no DOM, timers, storage, randomness or clock reads.
 */

import type { Lang } from './locale';

export const THIN_SPACE = '\u2009';
export const NO_BREAK_SPACE = '\u00A0';
export const MINUS_SIGN = '-';

const DECIMAL_SEPARATOR = { en: '.', ru: ',' } satisfies Readonly<Record<Lang, string>>;

export const THOUSANDS_SEPARATOR = THIN_SPACE;
export const UNIT_SEPARATOR = NO_BREAK_SPACE;
export const MAX_FRACTION_DIGITS = 2;

export type ByteUnit = 'B' | 'kB' | 'MB';

export const BYTE_UNITS = {
  B: { en: 'B', ru: 'Б' },
  kB: { en: 'kB', ru: 'кБ' },
  MB: { en: 'MB', ru: 'МБ' },
} satisfies Record<ByteUnit, Record<Lang, string>>;

export const formatByteUnit = (unit: ByteUnit, lang: Lang): string => BYTE_UNITS[unit][lang];

/** The byte-progress law (design-load-line.md, R23-ux): a total under 1 MB reads integer KB;
 * a total from 1 MB reads one-decimal MB — the digits' width stays constant while the
 * numerals tick. Both values quantize at `resolution` bytes (the load line's write step,
 * 0.1 MB == 100_000 B) so a sub-step stream chunk lands no re-render; the RU/EN columns
 * differ only in the decimal byte and the unit's script. The received value rides the key
 * bare and the total carries the unit — the unit shows once, per the design. */
export const BYTE_PROGRESS_KB_MAX = 1_000_000;
export const BYTE_PROGRESS_STEP = 100_000;

export const formatByteProgress = (
  receivedBytes: number,
  totalBytes: number,
  lang: Lang,
  resolution: number = BYTE_PROGRESS_STEP,
): Readonly<{ received: string; total: string }> => {
  if (!Number.isFinite(receivedBytes) || !Number.isFinite(totalBytes)) {
    throw new RangeError(
      `formatByteProgress: bytes must be finite, got ${receivedBytes} / ${totalBytes}`,
    );
  }
  const received = Math.min(receivedBytes, totalBytes);
  if (totalBytes < BYTE_PROGRESS_KB_MAX) {
    return {
      received: formatInt(Math.floor(received / 1_000)),
      total: withUnit(formatInt(Math.round(totalBytes / 1_000)), formatByteUnit('kB', lang)),
    };
  }
  return {
    received: fixedOneDecimalMb(Math.floor(received / resolution) * resolution, lang),
    total: withUnit(
      fixedOneDecimalMb(Math.floor(totalBytes / resolution) * resolution, lang),
      formatByteUnit('MB', lang),
    ),
  };
};

/** One-decimal MB, always: formatNumber's fast path trims trailing zeros, which would make
 * the digits' width jump at whole megabytes — the law keeps «1,0» instead of «1». A step
 * multiple is exact in tenths (pure integer arithmetic). */
const fixedOneDecimalMb = (bytes: number, lang: Lang): string => {
  const tenths = Math.floor(bytes / 100_000);
  return `${groupDigits(String(Math.floor(tenths / 10)))}${DECIMAL_SEPARATOR[lang]}${String(tenths % 10)}`;
};

export const PETERSBURG_OFFSET_LABEL = 'UTC+03:00';
export const PETERSBURG_OFFSET_MS = 3 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type FormatVars = Readonly<Record<string, string>>;

const TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

export const templateTokens = (template: string): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return names;
};

export const format = (template: string, vars: FormatVars): string => {
  const expected = templateTokens(template);
  for (const name of Object.keys(vars)) {
    if (!expected.has(name)) {
      throw new Error(`format: variable "${name}" is not referenced by the template`);
    }
  }
  return template.replace(TOKEN_PATTERN, (_token: string, name: string) => {
    const value = vars[name];
    if (value === undefined) {
      throw new Error(`format: template references {${name}} but no such variable was given`);
    }
    return value;
  });
};

const groupDigits = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);

export const formatInt = (value: number): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const magnitude = Math.abs(Math.trunc(value));
  const grouped = groupDigits(String(magnitude));
  return value < 0 && magnitude !== 0 ? MINUS_SIGN + grouped : grouped;
};

export const formatNumber = (value: number, lang: Lang = 'en'): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const rounded = Number(value.toFixed(MAX_FRACTION_DIGITS));
  if (Number.isInteger(rounded)) {
    return formatInt(rounded);
  }
  const [integerPart = '0', fractionPart = ''] = String(Math.abs(rounded)).split('.');
  const body = groupDigits(integerPart) + DECIMAL_SEPARATOR[lang] + fractionPart;
  return rounded < 0 ? MINUS_SIGN + body : body;
};

/** Joins a formatted number and its unit with the no-break space (§1.4). */
export const withUnit = (value: string, unit: string): string => value + UNIT_SEPARATOR + unit;

type CivilDay = { readonly year: number; readonly month: number; readonly day: number };

// Proleptic Gregorian civil day from days since 1970-01-01 (Hinnant's algorithm); it yields
// exactly what the UTC getters yield for the same instant, without constructing a clock.
const civilFromDays = (days: number): CivilDay => {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day };
};

type PetersburgWallTime = CivilDay & { readonly hour: number; readonly minute: number };

const petersburgWallTime = (epochMs: number): PetersburgWallTime => {
  const shifted = epochMs + PETERSBURG_OFFSET_MS;
  const days = Math.floor(shifted / DAY_MS);
  const msOfDay = shifted - days * DAY_MS;
  return {
    ...civilFromDays(days),
    hour: Math.floor(msOfDay / HOUR_MS),
    minute: Math.floor((msOfDay % HOUR_MS) / MINUTE_MS),
  };
};

const pad2 = (n: number): string => String(n).padStart(2, '0');
const pad4 = (n: number): string => String(n).padStart(4, '0');

export const formatDate = (epochMs: number, lang: Lang = 'en'): string => {
  const shifted = epochMs + PETERSBURG_OFFSET_MS;
  return lang === 'en' ? isoLine(shifted) : (ruCalendarLine(shifted) ?? isoLine(shifted));
};

export const formatTime = (epochMs: number): string => {
  const { hour, minute } = petersburgWallTime(epochMs);
  return `${pad2(hour)}:${pad2(minute)}`;
};

// The RU calendar line (D6): the ru-RU formatter over the +3h-shifted epoch, formatted in
// UTC — the same offset constant governs both clocks. ISO stays the fallback when the
// formatter throws (a ru-less ICU) or yields a digits-only string.
const RU_CALENDAR_LOCALE = 'ru-RU';
const RU_CALENDAR_OPTIONS = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
} satisfies Intl.DateTimeFormatOptions;
const DIGITS_ONLY = /^[\d\s.,/\-–]*$/u;

let ruCalendar: Intl.DateTimeFormat | null = null;

const ruCalendarLine = (shiftedMs: number): string | null => {
  try {
    ruCalendar ??= new Intl.DateTimeFormat(RU_CALENDAR_LOCALE, RU_CALENDAR_OPTIONS);
    const line = ruCalendar.format(shiftedMs);
    return DIGITS_ONLY.test(line) ? null : line;
  } catch {
    return null;
  }
};

const isoLine = (shiftedMs: number): string => {
  const { year, month, day } = civilFromDays(Math.floor(shiftedMs / DAY_MS));
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
};
