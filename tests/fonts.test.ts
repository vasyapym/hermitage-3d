// tests/fonts.test.ts
// The cmap-coverage gate — design-i18n-notes.md §2.1 (round r24t): "a node test computes
// the code-point set of every string in both dictionaries, every caption and every data
// label, and asserts the three files' cmaps cover it (space characters excepted) — no
// tofu for «», —, ±, ≤, Σ". The stop captions and the data labels live in the same
// dictionaries (the r24a/r24b extraction keyed them), so the union over the dictionary
// values IS the string set. The round-25 brief appends the RU dictionary here.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openSync } from 'fontkit';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';

// The committed faces and their project-local (post-RFN-rename) names.
const FONTS = [
  { file: 'public/fonts/plex-sans-400.woff2', psname: 'WPSans-Regular' },
  { file: 'public/fonts/plex-sans-500.woff2', psname: 'WPSans-Medium' },
  { file: 'public/fonts/plex-serif-400.woff2', psname: 'WPSerif-Regular' },
];

// The §2.1 subset spec (keep in sync with tools/fonts/subset.py — a gate that imports
// the generator's constant could not catch the generator regressing).
const CHARSET: number[] = [];
for (let c = 0x0020; c <= 0x007e; c++) CHARSET.push(c); // Basic Latin
for (let c = 0x00a0; c <= 0x00bf; c++) CHARSET.push(c); // Latin-1 punctuation/symbols
CHARSET.push(0x00d7); // ×
for (let c = 0x0400; c <= 0x045f; c++) CHARSET.push(c); // full basic Cyrillic incl. Ё/ё
CHARSET.push(
  0x2009, // thin space
  0x2013, // en dash
  0x2014, // em dash
  0x2019, // right single quote (apostrophe)
  0x201c, // left double quote
  0x201d, // right double quote
  0x201e, // double low-9 quote (nested RU quotes)
  0x2026, // ellipsis
  0x202f, // narrow no-break space
  0x2116, // numero
  0x2190, // leftwards arrow
  0x2191, // upwards arrow (the touch rail's depth glyph, R21-ux)
  0x2192, // rightwards arrow
  0x2193, // downwards arrow (the touch rail's depth glyph, R21-ux)
  0x2212, // minus
  0x2264, // ≤
  0x2265, // ≥
  0x03a3, // Σ
);

const root = fileURLToPath(new URL('..', import.meta.url));
const fontPath = (file: string): string => `${root}${file}`;

const load = (file: string) => openSync(fontPath(file));

// Both dictionaries (the r25 RU column landed — both languages gate together now) and the
// union of their non-whitespace code points — captions and data labels ride inside.
const DICTIONARIES: readonly Record<string, string>[] = [en, ru];
const requiredCodePoints = (): Set<number> => {
  const set = new Set<number>();
  for (const dictionary of DICTIONARIES) {
    for (const value of Object.values(dictionary)) {
      for (const character of value) {
        if (/\s/u.test(character)) continue; // space characters excepted (§2.1)
        set.add(character.codePointAt(0) as number);
      }
    }
  }
  return set;
};

describe('font coverage gate (design-i18n-notes.md §2.1)', () => {
  it('commits the three faces and the OFL license beside them', () => {
    for (const { file } of FONTS) {
      expect(existsSync(fontPath(file)), file).toBe(true);
    }
    expect(existsSync(fontPath('public/fonts/OFL.txt')), 'public/fonts/OFL.txt').toBe(true);
  });

  it('renames the derivatives off the reserved font name (the OFL law)', () => {
    for (const { file, psname } of FONTS) {
      const font = load(file);
      expect(font.postscriptName, file).toBe(psname);
      expect(font.familyName.startsWith('WP '), file).toBe(true);
    }
  });

  it('covers the §2.1 charset in every face', () => {
    for (const { file } of FONTS) {
      const cmap = new Set(load(file).characterSet);
      const missing = CHARSET.filter((codePoint) => !cmap.has(codePoint));
      expect(
        missing.map((c) => c.toString(16)),
        file,
      ).toEqual([]);
    }
  });

  it('covers every dictionary string (space characters excepted)', () => {
    const union = new Set<number>();
    for (const { file } of FONTS) {
      for (const codePoint of load(file).characterSet) union.add(codePoint);
    }
    const missing: string[] = [];
    for (const codePoint of requiredCodePoints()) {
      if (!union.has(codePoint)) missing.push(`U+${codePoint.toString(16).padStart(4, '0')}`);
    }
    expect(missing).toEqual([]);
  });
});
