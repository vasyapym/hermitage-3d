// tests/room-index.test.ts
import { describe, expect, it } from 'vitest';
import { ENTRIES } from '../rooms/index';
import { indexLabel, indexRows, nextIndex } from '../src/ui/room-index';

describe('indexRows', () => {
  it('lists the square and every built room in route order (the registry is the index)', () => {
    const rows = indexRows(ENTRIES, null);
    expect(rows.map((r) => r.route)).toEqual(['/', '/gallery', '/jordan', '/1812', '/throne']);
  });

  it('marks exactly the active node current', () => {
    const rows = indexRows(ENTRIES, 'jordan');
    expect(rows.filter((r) => r.current).map((r) => r.node)).toEqual(['jordan']);
  });

  it('marks nothing current before the first arrival', () => {
    expect(indexRows(ENTRIES, null).some((r) => r.current)).toBe(false);
  });

  it('gives the square its host-resolved title key', () => {
    expect(indexRows(ENTRIES, null)[0]?.titleKey).toBe('data.titleSquare');
  });
});

describe('indexLabel — the R-UX2 door-label law (the sentence head before the em dash)', () => {
  it('strips the sentence tail from a committed title', () => {
    expect(indexLabel('Military Gallery of 1812 — through the Armorial Hall')).toBe(
      'Military Gallery of 1812',
    );
  });

  it('trims the RU NBSP before the em dash', () => {
    expect(indexLabel('Иорданская лестница\u00A0— подъём')).toBe('Иорданская лестница');
  });

  it('passes a title with no em dash through', () => {
    expect(indexLabel('Дворцовая площадь')).toBe('Дворцовая площадь');
  });
});

describe('nextIndex', () => {
  it('wraps both ends', () => {
    expect(nextIndex(4, 3, 1)).toBe(0);
    expect(nextIndex(4, 0, -1)).toBe(3);
  });

  it('is safe on an empty list', () => {
    expect(nextIndex(0, 0, 1)).toBe(0);
  });
});

describe('purity', () => {
  // The canonical fence (tests/hud.test.ts): comments and literals stripped, then no
  // three, no node:, no DOM/storage/clock/timer/randomness/console.
  const sources = import.meta.glob('../src/ui/room-index.ts', {
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
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
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
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
