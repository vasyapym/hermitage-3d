// /notes elevation frieze gate — tests/notes-elevation.test.ts
// The pure serializer's contract: the viewBox geometry, the element census, pinned
// first-of-kind elements (3-decimal doubles), determinism, the null path, and purity.
// The DOM adaptation lives in tests/notes-dom.test.ts; the visual gate lives in the
// fixtures.
import { describe, expect, it } from 'vitest';
import type { FacadeSpec } from '../src/content/facade-spec';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import { southElevationSvg } from '../src/ui/notes-elevation';

// Raw source through Vite's ?raw glob — no node:fs import, the tsconfig ships no node
// types (the house pattern from tests/notes-view.test.ts).
const RAW_SOURCES = import.meta.glob<string>(['../src/ui/notes-elevation.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
function readSource(relative: string): string {
  const text = RAW_SOURCES[relative];
  if (typeof text !== 'string') {
    throw new Error(`raw source '${relative}' not loaded by import.meta.glob`);
  }
  return text;
}
/** Drops comments and string literals so identifier checks see code only. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const elevation = southElevationSvg();
if (elevation === null) throw new Error('the committed south spec must solve');

describe('/notes elevation frieze', () => {
  it('spans the main line, top at the parapet, viewBox only', () => {
    expect(elevation.viewBox).toBe('-105.000 0.000 210.000 24.000');
    expect(elevation.body.includes('<svg')).toBe(false);
    expect(elevation.body.includes('<text')).toBe(false);
  });

  it('census: wall ×5, slot ×236, portal ×12, shaft ×32, crease ×4, datum ×1', () => {
    const count = (name: string): number => elevation.body.split(`class="${name}"`).length - 1;
    expect(count('wall')).toBe(5);
    expect(count('slot')).toBe(236);
    expect(count('portal')).toBe(12);
    expect(count('shaft')).toBe(32);
    expect(count('crease')).toBe(4);
    expect(count('datum')).toBe(1);
  });

  it('pins the west-most elements to the millimetre', () => {
    expect(elevation.body).toContain(
      '<rect class="wall" x="-105.000" y="0.000" width="23.710" height="24.000"/>',
    );
    expect(elevation.body).toContain(
      '<rect class="slot" x="-103.806" y="21.000" width="1.000" height="1.800"/>',
    );
    expect(elevation.body).toContain(
      '<rect class="slot" x="-104.156" y="14.800" width="1.700" height="3.600"/>',
    );
    expect(elevation.body).toContain(
      '<rect class="shaft" x="-102.163" y="13.800" width="1.100" height="9.750"/>',
    );
    expect(elevation.body).toContain(
      '<rect class="portal" x="-10.161" y="21.000" width="3.387" height="1.800"/>',
    );
    expect(elevation.body).toContain(
      '<line class="crease" x1="-81.290" y1="0.000" x2="-81.290" y2="24.000"/>',
    );
    expect(elevation.body).toContain(
      '<line class="datum" x1="-105.000" y1="24.000" x2="105.000" y2="24.000"/>',
    );
  });

  it('stops the portal section at the cornice and the sides at the parapet', () => {
    // The central wall leaves the pediment's notch at the top (y = 2.000, height 22.000).
    expect(elevation.body).toContain(
      '<rect class="wall" x="-13.548" y="2.000" width="27.097" height="22.000"/>',
    );
    // The west stretch keeps the full silhouette height.
    expect(elevation.body).toContain(
      '<rect class="wall" x="-81.290" y="0.000" width="67.742" height="24.000"/>',
    );
  });

  it('every coordinate is 3-decimal fixed notation', () => {
    const numbers = elevation.body.match(/(?:x1|x2|y1|y2|x|y|width|height)="-?[0-9.]+"/g) ?? [];
    expect(numbers.length).toBeGreaterThan(280);
    for (const entry of numbers) {
      expect(entry).toMatch(/="-?\d+\.\d{3}"/);
    }
    expect(elevation.body).not.toMatch(/Infinity|NaN|e-\d|\d\.e/i);
  });

  it('two builds are byte-identical (deterministic)', () => {
    expect(JSON.stringify(southElevationSvg())).toBe(JSON.stringify(elevation));
  });

  it('returns null when the solve fails', () => {
    const broken: FacadeSpec = { ...SOUTH_FACADE, mainLineLengthM: 2100 };
    expect(southElevationSvg({ spec: broken, rows: WINDOW_ROWS })).toBeNull();
  });

  it('is a pure module (no DOM, no clocks, no randomness, no three)', () => {
    const code = codeOnly(readSource('../src/ui/notes-elevation.ts'));
    for (const forbidden of [
      /from\s+['"]three/,
      /\bdocument\b/,
      /\bwindow\b/,
      /localStorage/,
      /\bperformance\b/,
      /setTimeout/,
      /Math\.random/,
      /new Date/,
      /import\s+[^;]*\bnode:/,
    ]) {
      expect(code).not.toMatch(forbidden);
    }
  });
});
