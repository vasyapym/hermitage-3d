// tests/i18n.test.ts
// Gates for the i18n modules (src/i18n/*): the purity fence (the hud.test.ts reference
// pattern), the byte-exact formatting law in force since the round-25 number-law flip
// (thin-space thousands in BOTH languages, the decimal byte is the only language-dependent
// one, ISO stays the EN day format), a dense cross-check of the arithmetic Petersburg clock
// against formatPetersburg (sky/time.ts), the dictionary parity (equal key sets + equal
// token sets + the typographic lints of §1.3/§1.6), and the language-resolution law
// (DEC-020, the ?q= lifecycle mirror).
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import {
  format,
  formatDate,
  formatInt,
  formatNumber,
  formatTime,
  templateTokens,
} from '../src/i18n/format';
import {
  DEFAULT_LANG,
  type LangResolutionInput,
  resolveLang,
  toggleTarget,
} from '../src/i18n/locale';
import { ru } from '../src/i18n/ru';
import { formatPetersburg } from '../src/sky/time';
import { buildSouthNotesModel } from '../src/ui/notes-view';

// ---------------------------------------------------------------------------
// Purity fence — the hud.test.ts reference pattern, applied to every i18n module.
// ---------------------------------------------------------------------------
describe('i18n purity', () => {
  const sources = import.meta.glob(['../src/i18n/*.ts'], {
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

  it('loads the module sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(3);
  });
  it('imports nothing from three or node', () => {
    for (const [file, src] of Object.entries(sources)) {
      const code = stripComments(src);
      expect(code, file).not.toMatch(/from\s+['"]three/);
      expect(code, file).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code, file).not.toMatch(/['"]node:/);
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
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const [file, src] of Object.entries(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, `${file} ${String(re)}`).not.toMatch(re);
    }
  });
});

// ---------------------------------------------------------------------------
// format() — {name} interpolation, loud on both failure kinds.
// ---------------------------------------------------------------------------
describe('format', () => {
  it('resolves named tokens', () => {
    expect(format('{axes} axes × {rows} rows', { axes: '62', rows: '4' })).toBe('62 axes × 4 rows');
  });
  it('resolves a repeated token everywhere', () => {
    expect(format('{n} + {n}', { n: '7' })).toBe('7 + 7');
  });
  it('throws loud on a missing variable', () => {
    expect(() => format('Total — {activeParts} active parts', {})).toThrow(/activeParts/);
  });
  it('throws loud on an unused variable', () => {
    expect(() => format('Shell', { extra: '1' })).toThrow(/extra/);
  });
});

// ---------------------------------------------------------------------------
// The formatting law in force today, byte-exact.
// ---------------------------------------------------------------------------
describe('formatInt', () => {
  it('groups thousands with the thin space (both languages, §0)', () => {
    expect(formatInt(0)).toBe('0');
    expect(formatInt(999)).toBe('999');
    expect(formatInt(1000)).toBe('1\u2009000');
    expect(formatInt(1234567)).toBe('1\u2009234\u2009567');
    expect(formatInt(1000000)).toBe('1\u2009000\u2009000');
  });
  it('carries the ASCII minus sign (the committed EN bytes pin it)', () => {
    expect(formatInt(-5)).toBe('-5');
    expect(formatInt(-1234567)).toBe('-1\u2009234\u2009567');
    expect(formatInt(-0)).toBe('0');
  });
  it('truncates non-integral input toward zero', () => {
    expect(formatInt(210.9)).toBe('210');
    expect(formatInt(-210.9)).toBe('-210');
  });
});

describe('formatNumber', () => {
  it('prints integers through the grouped int path', () => {
    expect(formatNumber(210)).toBe('210');
    expect(formatNumber(1234)).toBe('1\u2009234');
  });
  it('trims two-decimal rounding trailing zeros', () => {
    expect(formatNumber(3.39)).toBe('3.39');
    expect(formatNumber(3.4)).toBe('3.4');
    expect(formatNumber(2.999)).toBe('3');
    expect(formatNumber(0.005)).toBe('0.01');
  });
  it('swaps only the decimal byte for RU (thin grouping and the trim law are shared)', () => {
    expect(formatNumber(3.39, 'ru')).toBe('3,39');
    expect(formatNumber(1234.56, 'ru')).toBe('1\u2009234,56');
    expect(formatNumber(210, 'ru')).toBe('210');
    expect(formatNumber(2.999, 'ru')).toBe('3');
  });
  it('returns the string form of non-finite input (a display path never throws)', () => {
    expect(formatNumber(Number.NaN)).toBe('NaN');
  });
});

// ---------------------------------------------------------------------------
// The arithmetic Petersburg clock == formatPetersburg (sky/time.ts) on civil time.
// ---------------------------------------------------------------------------
describe('petersburg wall time cross-check', () => {
  const cross = (epochMs: number): void => {
    const law = formatPetersburg(epochMs);
    expect(formatDate(epochMs, 'en'), String(epochMs)).toBe(law.date);
    expect(formatTime(epochMs), String(epochMs)).toBe(law.time);
  };
  const walkDays = (year: number): void => {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    for (let day = start; day < end; day += 24 * 60 * 60 * 1000) cross(day);
  };
  it('matches on every day of a leap year, an early and a late epoch year', () => {
    walkDays(2000);
    walkDays(1905);
    walkDays(2095);
  });
  it('matches across the petersburg day edge (21:00Z) and a month boundary', () => {
    // 2026-02-27T18:00Z → 2026-03-01T02:00Z, hourly steps: the +3h shift rolls the day.
    for (let ms = Date.UTC(2026, 1, 27, 18); ms <= Date.UTC(2026, 2, 1, 2); ms += 60 * 60 * 1000) {
      cross(ms);
    }
  });
  it('matches on the golden det timestamps', () => {
    cross(Date.UTC(2026, 5, 22, 3, 18));
    cross(Date.UTC(2026, 5, 20, 21, 50));
    cross(Date.UTC(2026, 1, 17, 16, 25));
  });
  it('matches minute-stepped across a petersburg midnight', () => {
    const from = Date.UTC(2026, 5, 20, 20, 50);
    const to = Date.UTC(2026, 5, 20, 21, 10);
    for (let ms = from; ms <= to; ms += 60_000) {
      cross(ms);
    }
  });
});

// ---------------------------------------------------------------------------
// The English dictionary: complete, clean, and pinned where the bytes are load-bearing.
// ---------------------------------------------------------------------------
describe('en dictionary', () => {
  it('has a non-empty, untrimmed value for every key', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.length, key).toBeGreaterThan(0);
      expect(value, key).toBe(value.trim());
    }
  });
  it('keeps the U+2019 apostrophe of the committed notes link', () => {
    expect(en['chrome.notesLink']).toBe('How it’s built →');
  });
  it('pins the fourteen stop captions the e2e asserts (R-UX5: Gj, J1b, J2b new; J2, J3 re-authored; the winter-square round adds Sh)', () => {
    expect(en['caption.s0']).toBe('the facade and the hour');
    expect(en['caption.s1']).toBe('the arch opens');
    expect(en['caption.sh']).toBe('past the column');
    expect(en['caption.g0']).toBe('dark; the square behind');
    expect(en['caption.gj']).toBe(
      'The turn east: pilaster after pilaster, forty metres to the far door.',
    );
    expect(en['caption.g1']).toBe('compression');
    expect(en['caption.g2']).toBe('the door (airlock)');
    expect(en['caption.j0']).toBe('looking up into light');
    expect(en['caption.j1']).toBe('the flight');
    expect(en['caption.j1b']).toBe(
      'The upper flight\u2019s sconce shows across the well: Rastrelli lights the turn in advance.',
    );
    expect(en['caption.j2']).toBe(
      'The landing: the stair divides; the flights meet again beneath the painted ceiling.',
    );
    expect(en['caption.j2b']).toBe(
      'The upper tier of windows: the Neva light enters high and carries the last flight.',
    );
    expect(en['caption.j3']).toBe(
      'Near the top the eastern portal comes square to the eye: the doorway to the state rooms, framed in gilt between columns of grey granite.',
    );
    expect(en['caption.j4']).toBe('arrival; the portal (landing airlock)');
  });
  it('keeps the quoted id of the provenance failure string (notes-view renders it quoted)', () => {
    expect(en['notes.failNoProvenance']).toBe(
      "displayed number '{id}' has no provenance register entry",
    );
  });
});

// ---------------------------------------------------------------------------
// The literals fence (round-24 exit): the switched string-source modules hold no
// user-facing prose literals — every whitespace-bearing literal is either an allowlisted
// spec-audit Issue message (developer diagnostics, EN by D4's ruling) or a key/id fragment.
// ---------------------------------------------------------------------------
describe('literals fence', () => {
  const sources = import.meta.glob(
    [
      '../src/ui/notes-view.ts',
      '../src/camera/square-rail.ts',
      '../rooms/jordan/contract.ts',
      '../rooms/rastrelli-gallery/contract.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
  ) as Record<string, string>;
  const ALLOWED_PREFIXES = [
    'the /notes page renders', // spec-audit issues stay EN (developer diagnostics)
    'at least one window row is required',
    'duplicate section id',
    'declared axes must total more than zero',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: verbatim pin of raw source text (template holes are literal bytes), not an interpolation
    '${axes} declared axes over', // the pitch-audit prose parts
    '${formatNumber(', // number+unit cells: "N m" (format law, not keys)
    // biome-ignore lint/suspicious/noTemplateCurlyInString: verbatim pin of raw source text (template holes are literal bytes), not an interpolation
    '${section.declaredAxes} (±1)', // the axes cell: "N (±1)" (format law, not keys)
    'pitch of ',
    '(±',
    'unmapped display token', // the display-map guard (developer diagnostics)
  ];
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const literals = (src: string): readonly string[] => {
    const code = stripComments(src);
    const single = code.match(/'[^'\\\n]*'/g) ?? [];
    const backtick = code.match(/`[^`\\]*`/g) ?? [];
    return [...single, ...backtick].map((s) => s.slice(1, -1));
  };
  it('holds no user-facing prose outside the audit allowlist', () => {
    for (const [file, src] of Object.entries(sources)) {
      for (const literal of literals(src)) {
        if (!/\s/.test(literal)) continue;
        // Separators are code law, not prose: ' ' (join), ' · ' (token joins), '—'.
        if (/^[\s·—-]+$/.test(literal)) continue;
        expect(
          ALLOWED_PREFIXES.some((prefix) => literal.startsWith(prefix)),
          `${file}: '${literal.slice(0, 60)}'`,
        ).toBe(true);
      }
    }
  });
  it('sources every stop caption from the dictionary', () => {
    for (const [file, src] of Object.entries(sources)) {
      if (!file.includes('square-rail') && !file.includes('contract')) continue;
      for (const literal of literals(src)) {
        if (!literal.startsWith('caption.')) continue;
        expect(en[literal as keyof typeof en], `${file} ${literal}`).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Round-trip against the real /notes model: today's rendered display bytes must be
// reproducible by the new formatters, and the grouped non-integer branch must stay
// unreachable on the page (no rendered non-integer >= 1000).
// ---------------------------------------------------------------------------
describe('notes model number round-trip', () => {
  const result = buildSouthNotesModel();
  it('builds the default model', () => {
    expect(result.ok).toBe(true);
  });
  if (!result.ok) {
    return;
  }
  it('reformats every displayed number byte-identically', () => {
    for (const block of result.model.blocks) {
      if (block.kind !== 'numbers') {
        continue;
      }
      for (const row of block.rows) {
        if (row.value === null) {
          // §3.4: the pending measurement renders as an em-dash value, the note muted beside.
          expect(row.display, row.id).toBe('—');
          expect(row.note, row.id).toBe(en['notes.pending']);
          continue;
        }
        expect(formatNumber(row.value, 'en'), row.id).toBe(row.display);
      }
    }
  });
  it('renders no non-integer at or above 1000 (the grouped branch stays unreachable)', () => {
    for (const block of result.model.blocks) {
      if (block.kind !== 'numbers') {
        continue;
      }
      for (const row of block.rows) {
        if (row.value !== null && !Number.isInteger(row.value)) {
          expect(Math.abs(row.value), row.id).toBeLessThan(1000);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Dictionary parity (§1.3, R5): equal key sets, equal {name} token sets per key,
// non-empty untrimmed values, and the typographic lints both ways.
// ---------------------------------------------------------------------------
describe('dictionary parity', () => {
  const enKeys = Object.keys(en).sort();
  const ruKeys = Object.keys(ru).sort();
  it('keeps identical key sets in both columns', () => {
    expect(ruKeys).toEqual(enKeys);
  });
  it('keeps identical {name} token sets per key (moved points are fine, renames are not)', () => {
    for (const key of enKeys) {
      expect([...templateTokens(ru[key as keyof typeof ru])].sort(), key).toEqual(
        [...templateTokens(en[key as keyof typeof en])].sort(),
      );
    }
  });
  it('has a non-empty, untrimmed value for every key in both columns', () => {
    for (const [key, value] of Object.entries(ru)) {
      expect(value.length, `ru ${key}`).toBeGreaterThan(0);
      expect(value, `ru ${key}`).toBe(value.trim());
    }
  });
  it('keeps the RU typographic lint: no latin double quote, no spaced hyphen dash, no dots', () => {
    for (const [key, value] of Object.entries(ru)) {
      expect(value, `ru ${key}`).not.toContain('"');
      expect(value, `ru ${key}`).not.toContain(' - '); // ' - ' as a dash (the §1.6 law)
      expect(value, `ru ${key}`).not.toContain('...');
    }
  });
  it('keeps EN free of Cyrillic outside the sanctioned tokens (sources + the toggle name)', () => {
    for (const [key, value] of Object.entries(en)) {
      const cyr = value.match(/[\u0400-\u04FF]+/gu) ?? [];
      for (const token of cyr) {
        expect(
          ['РГИА', 'НЭБ'].some((allowed) => token.startsWith(allowed)) ||
            token === 'ф' || // «ф. 485» — the register's file number
            (key === 'chrome.toggleAria' && token === 'Русский'), // §1.2: the target name
          `en ${key}: ${token}`,
        ).toBe(true);
      }
    }
  });
  it('keeps RU free of latin prose (identifiers, paths and source labels are allowed)', () => {
    for (const [key, value] of Object.entries(ru)) {
      // Latin runs of 4+ letters inside RU values must be code-ish (a path, an id, a
      // source tag, a {name} token) — no latin prose words. The allowlist is a prefix
      // check per run; the toggle's accessible name is the target language's name (§1.2).
      const withoutTokens = value.replace(/\{[A-Za-z][A-Za-z0-9]*\}/gu, '');
      const latin = withoutTokens.match(/[A-Za-z][A-Za-z0-9.-]*/gu) ?? [];
      for (const token of latin) {
        expect(
          /^(wiki|visit|petersburg|Budberg|Great|Palaces|The|Winter|Palace|principal|declaredAxes|decisions|md|DEC|ATTRIBUTIONS|docs|artistic|license|design|facade|grammar|src|content|facade-spec|windowSlots|portalVoidCells|counts|byPart|KIT|triangleCeiling|instances|frustumTriangles|facadeDrawCalls|projectBudget|allowance|measuredJsGzipBytes|solver|Σ|Phase|JavaScript|gzip|PageUp|PageDown|Home|End|Escape|JS)/.test(
            token,
          ) ||
            token.length < 4 ||
            (key === 'chrome.toggleAria' && token === 'English') ||
            (key === 'chrome.sceneUnsupported' && token === 'WebGL2.'), // the API's own name
          `ru ${key}: ${token}`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The language-resolution law (DEC-020, §1.1; the ?q= lifecycle mirror).
// ---------------------------------------------------------------------------
describe('resolveLang', () => {
  const resolve = (over: Partial<LangResolutionInput>): ReturnType<typeof resolveLang> =>
    resolveLang({ queryLang: null, storedLang: null, det: false, navigation: false, ...over });
  it('a valid query lang wins and persists (the URL wins)', () => {
    expect(resolve({ queryLang: 'en' })).toEqual({
      lang: 'en',
      source: 'query',
      override: { kind: 'write', lang: 'en' },
    });
    expect(resolve({ queryLang: 'ru' }).override).toEqual({ kind: 'write', lang: 'ru' });
  });
  it('an invalid query lang is ignored without a throw (the URL is not committed data)', () => {
    const result = resolve({ queryLang: 'de', storedLang: 'en' });
    expect(result.lang).toBe('en');
    expect(result.source).toBe('override');
  });
  it('a fresh load without the query reads the persisted override', () => {
    expect(resolve({ storedLang: 'en' }).lang).toBe('en');
    expect(resolve({ storedLang: 'ru' }).lang).toBe('ru');
  });
  it('a garbage stored value is cleared; a missing one is kept alone', () => {
    expect(resolve({ storedLang: 'garbage' }).override).toEqual({ kind: 'clear' });
    expect(resolve({ storedLang: null }).override).toEqual({ kind: 'keep' });
  });
  it('det ignores the override both ways; ?lang= still works', () => {
    const det = { det: true };
    expect(resolve({ ...det, storedLang: 'en' })).toEqual({
      lang: DEFAULT_LANG,
      source: 'default',
      override: { kind: 'keep' },
    });
    expect(resolve({ ...det, queryLang: 'en' })).toEqual({
      lang: 'en',
      source: 'query',
      override: { kind: 'keep' }, // det writes nothing — the golden runs leave no storage
    });
  });
  it('a navigation without lang= resets to the default and clears (the ?q= mirror)', () => {
    const result = resolve({ storedLang: 'en', navigation: true });
    expect(result.lang).toBe(DEFAULT_LANG);
    expect(result.override).toEqual({ kind: 'clear' });
    expect(resolve({ queryLang: 'en', navigation: true }).override).toEqual({
      kind: 'write',
      lang: 'en',
    });
  });
  it('the toggle target is the other language, both ways', () => {
    expect(toggleTarget('ru')).toBe('en');
    expect(toggleTarget('en')).toBe('ru');
  });
});
