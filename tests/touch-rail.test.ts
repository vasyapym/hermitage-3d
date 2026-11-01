import { describe, expect, it } from 'vitest';
import * as enModule from '../src/i18n/en';
import * as ruModule from '../src/i18n/ru';
import * as law from '../src/ui/touch-rail';

const column = (module: Record<string, unknown>): Record<string, string> => {
  const value = Object.values(module).find(
    (v) => typeof v === 'object' && v !== null && 'chrome.travelHint' in v,
  );
  expect(value).toBeDefined();
  return value as Record<string, string>;
};

describe('touch rail', () => {
  it('pins the adopted geometry', () => {
    expect([
      law.TOUCH_BUTTON_MIN_INLINE_PX,
      law.TOUCH_BUTTON_MIN_BLOCK_PX,
      law.TOUCH_RAIL_GAP_PX,
      law.TOUCH_RAIL_INSET_PX,
      law.TOUCH_RAIL_CLEARANCE_PX,
      law.TOUCH_RAIL_MAX_WIDTH_PX,
    ]).toEqual([72, 44, 8, 24, 16, 767.98]);
  });

  it('pins the R18-ux D6 band fraction (0.75 measured from the band top)', () => {
    expect(law.TOUCH_RAIL_BAND_FRACTION).toBe(0.75);
  });

  it('places the centre line at the band fraction when the box fits (ideal-inside)', () => {
    // A 744-px band, a 44-px box: ideal = 0 + 0.75 × 744 = 558 — inside [22, 722].
    expect(law.touchRailCenter(0, 744, 44)).toEqual({ center: 558, fits: true });
  });

  it('clamps so the box stays inside the band (clamp-at-bottom)', () => {
    // A 60-px band, a 44-px box: ideal 45 exceeds hi 38 → the clamp's centre line.
    expect(law.touchRailCenter(0, 60, 44)).toEqual({ center: 38, fits: true });
  });

  it('centres in the band and reports fits=false on a misfit (warn, never hide)', () => {
    // A 40-px band, a 44-px box: lo 22 > hi 18 → the band's middle, fits=false.
    expect(law.touchRailCenter(0, 40, 44)).toEqual({ center: 20, fits: false });
  });

  it('exhausts coarse/narrow visibility combinations, including the boundary', () => {
    for (const coarsePointer of [false, true]) {
      for (const widthCssPx of [0, 320, 767, law.TOUCH_RAIL_MAX_WIDTH_PX, 768, 844]) {
        expect(law.touchRailVisible({ coarsePointer, widthCssPx })).toBe(
          coarsePointer || widthCssPx <= law.TOUCH_RAIL_MAX_WIDTH_PX,
        );
      }
    }
  });

  it('exhausts all 32 admission combinations without queueing', () => {
    for (let mask = 0; mask < 32; mask++) {
      const [settled, transitNull, glideNull, canvasGestureFree, menuOwningInput] = [
        0, 1, 2, 3, 4,
      ].map((bit) => Boolean(mask & (1 << bit))) as [boolean, boolean, boolean, boolean, boolean];
      expect(
        law.admitTouchTravel({
          settled,
          transitNull,
          glideNull,
          canvasGestureFree,
          menuOwningInput,
        }),
      ).toBe(
        settled && transitNull && glideNull && canvasGestureFree && !menuOwningInput
          ? 'accept'
          : 'drop',
      );
    }
  });

  it('exhausts repeat facts; one hold accepts once, a new press may accept again', () => {
    for (const repeat of [false, true]) {
      for (const accepted of [false, true]) {
        expect(law.admitTouchKey({ repeat, accepted })).toBe(
          !repeat && !accepted ? 'accept' : 'drop',
        );
      }
    }
    expect(
      [
        { repeat: false, accepted: false },
        { repeat: true, accepted: true },
        { repeat: true, accepted: true },
      ].filter((f) => law.admitTouchKey(f) === 'accept'),
    ).toHaveLength(1);
    expect(law.admitTouchKey({ repeat: false, accepted: false })).toBe('accept');
  });

  it('exhausts contact decisions; shadowed contact never replaces the anchor', () => {
    for (const primaryDown of [false, true]) {
      for (const secondContactShadowed of [false, true]) {
        for (const reArmableAfterSequenceEnd of [false, true]) {
          expect(
            law.canvasContact({ primaryDown, secondContactShadowed, reArmableAfterSequenceEnd }),
          ).toBe(
            reArmableAfterSequenceEnd
              ? 'rearm'
              : secondContactShadowed
                ? 'cancel'
                : primaryDown
                  ? 'admit'
                  : 'drop',
          );
        }
      }
    }
  });

  it('pins both columns and preserves the original travel hint byte-for-byte', () => {
    const ru = column(ruModule);
    const en = column(enModule);
    for (const key of [
      'touchRailLabel',
      'touchRailBack',
      'touchRailForward',
      'travelHintTouch',
      'sceneUnsupported',
      'sceneInterrupted',
      'sceneReload',
    ]) {
      expect(ru[`chrome.${key}`]?.trim()).toBeTruthy();
      expect(en[`chrome.${key}`]?.trim()).toBeTruthy();
    }
    expect(ru['chrome.travelHint']).toBe('Прокрутите, чтобы идти · потяните, чтобы осмотреться');
    expect(en['chrome.travelHint']).toBe('Scroll to walk · drag to look around');
  });
});

describe('purity', () => {
  const sources = import.meta.glob('../src/ui/touch-rail.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (s: string): string =>
    stripComments(s)
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
      expect(code, `touch-rail.ts must not reference ${name}`).not.toMatch(pattern);
    }
  });
});
