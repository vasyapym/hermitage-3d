import { describe, expect, it } from 'vitest';
import type { FacadeSpec } from '../src/content/facade-spec';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import {
  flattenProvenance,
  isSourceKey,
  LICENSE_LINES,
  SPEC_PROVENANCE,
} from '../src/content/provenance';
import { activateLang } from '../src/i18n/locale';
import type { PartId } from '../src/procedural/facade-solver';
import { KIT } from '../src/procedural/facade-solver';
import type { NotesBlock, NotesModel, NotesResult, NumberRow } from '../src/ui/notes-view';
import {
  buildSouthNotesModel,
  NOTES_TITLE,
  PENDING_MEASUREMENT,
  walkProvenance,
} from '../src/ui/notes-view';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Raw sources through Vite's ?raw glob — no node:fs import, the tsconfig ships no node
// types. Exact patterns so eager loading stays two files.
const RAW_SOURCES = import.meta.glob<string>(
  ['../src/content/provenance.ts', '../src/ui/notes-view.ts'],
  { query: '?raw', import: 'default', eager: true },
);
function readSource(relative: string): string {
  const text = RAW_SOURCES[relative];
  if (typeof text !== 'string') {
    throw new Error(`raw source '${relative}' not loaded by import.meta.glob`);
  }
  return text;
}
/** Drops comments and string/template literals so identifier checks see code only. */
function codeOnly(source: string): string {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return withoutBlockComments
    .split('\n')
    .map((line) =>
      line
        .replace(/`(?:\\.|[^`\\])*`/g, '``')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/\/\/.*$/, ''),
    )
    .join('\n');
}
function expectOk(result: NotesResult): Extract<NotesResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected ok=true, got issues: ${JSON.stringify(result.issues)}`);
  }
  return result;
}
function tableBlock(model: NotesModel, id: string): Extract<NotesBlock, { kind: 'table' }> {
  for (const block of model.blocks) {
    if (block.kind === 'table' && block.id === id) {
      return block;
    }
  }
  throw new Error(`table '${id}' missing`);
}
function calloutBlock(model: NotesModel, id: string): Extract<NotesBlock, { kind: 'callout' }> {
  for (const block of model.blocks) {
    if (block.kind === 'callout' && block.id === id) {
      return block;
    }
  }
  throw new Error(`callout '${id}' missing`);
}
function numberRows(model: NotesModel): ReadonlyMap<string, NumberRow> {
  const rows = new Map<string, NumberRow>();
  for (const block of model.blocks) {
    if (block.kind === 'numbers') {
      for (const row of block.rows) {
        rows.set(row.id, row);
      }
    }
  }
  return rows;
}
function numberRow(model: NotesModel, id: string): NumberRow {
  const row = numberRows(model).get(id);
  if (row === undefined) {
    throw new Error(`number row '${id}' missing`);
  }
  return row;
}
/** '132 264' → 132264 (display grouping uses spaces). */
const cellInt = (cell: string): number => Number(cell.replace(/\s/g, ''));
const EXPECTED = {
  axes: 62,
  windowSlots: 248,
  windows: 236,
  portalVoidCells: 12,
  columnShafts: 68,
  instances: 671,
  activeParts: 21,
  triangles: 134_264,
  creaseDeclared: 215,
  creaseDerived: 234,
  facadeDrawCalls: 41,
  frameDrawCalls: 57,
  frustumTriangles: 138_506,
  submittedTriangleCeiling: 272_626,
} as const;
// ---------------------------------------------------------------------------
// 1. Purity
// ---------------------------------------------------------------------------
describe('notes view purity', () => {
  it.each(Object.keys(RAW_SOURCES))(
    '%s has no three.js, DOM, clock, random or fs access',
    (file) => {
      const raw = readSource(file);
      expect(raw).not.toMatch(/from\s+['"]three['"/]/);
      expect(raw).not.toMatch(/from\s+['"]node:/);
      expect(raw).not.toMatch(/from\s+['"]fs['"]/);
      const code = codeOnly(raw);
      for (const forbidden of [
        /\bdocument\b/,
        /\bwindow\b/,
        /\bglobalThis\b/,
        /\bDate\.now\b/,
        /\bMath\.random\b/,
        /\bperformance\.now\b/,
      ]) {
        expect(code).not.toMatch(forbidden);
      }
    },
  );
});
// ---------------------------------------------------------------------------
// 2. Determinism
// ---------------------------------------------------------------------------
describe('determinism', () => {
  it('two default builds are identical and JSON-stable', () => {
    const first = expectOk(buildSouthNotesModel());
    const second = expectOk(buildSouthNotesModel({}));
    expect(second).toEqual(first);
    const json = JSON.stringify(first.model);
    expect(JSON.stringify(second.model)).toBe(json);
    expect(JSON.parse(json)).toEqual(first.model);
  });
  it('opens with the H1 and the chip legend', () => {
    const { model } = expectOk(buildSouthNotesModel());
    expect(model.title).toBe(NOTES_TITLE);
    expect(model.blocks[0]).toEqual({ kind: 'heading', level: 1, text: NOTES_TITLE });
    const legend = model.blocks.find((block) => block.kind === 'legend');
    expect(legend?.kind).toBe('legend');
    if (legend?.kind === 'legend') {
      expect(legend.items.map((item) => item.provenance)).toEqual([
        'sourced',
        'declared',
        'derived',
      ]);
      for (const item of legend.items) {
        expect(item.text.length).toBeGreaterThan(0);
      }
    }
  });
  it('names every section with an anchor id and closes with the sources footer', () => {
    const { model } = expectOk(buildSouthNotesModel());
    const ids = model.blocks
      .filter((block) => block.kind === 'heading' && block.level === 2)
      .map((block) => (block.kind === 'heading' ? block.id : undefined));
    expect(ids).toEqual(['shell', 'decor', 'south', 'kit', 'budget', 'siblings', 'sources']);
    expect(model.blocks.at(-1)?.kind).toBe('links');
  });
});
// ---------------------------------------------------------------------------
// 3. Layout
// ---------------------------------------------------------------------------
describe('south elevation layout', () => {
  it('lists sections west → east with verbatim notes and declared axes', () => {
    const { model } = expectOk(buildSouthNotesModel());
    const table = tableBlock(model, 'south.sections');
    expect(table.rows.map((row) => row.cells[0])).toEqual([
      'sw-risalit',
      'west-stretch',
      'central-portal',
      'east-stretch',
      'se-risalit',
    ]);
    expect(table.rows.map((row) => Number(row.cells[2]?.split(' ')[0]))).toEqual([7, 20, 8, 20, 7]);
    for (const [index, section] of SOUTH_FACADE.sections.entries()) {
      const row = table.rows[index];
      expect(row?.cells).toContain(section.note);
      expect(row?.cells[1]).toBe(section.kind);
      expect(row?.provenance?.map((p) => p.kind)).toEqual(['declared', 'declared']);
    }
  });
});
// ---------------------------------------------------------------------------
// 4. Pinned derived numbers
// ---------------------------------------------------------------------------
describe('pinned derived numbers', () => {
  const built = expectOk(buildSouthNotesModel());
  const { model } = built;
  it('pitch and crease', () => {
    expect(numberRow(model, 'south.derivedPitchM').value).toBeCloseTo(
      SOUTH_FACADE.mainLineLengthM / EXPECTED.axes,
      6,
    );
    expect(numberRow(model, 'south.derivedPitchM').provenance.kind).toBe('derived');
    expect(numberRow(model, 'south.creaseLineLengthM').value).toBe(EXPECTED.creaseDeclared);
    expect(numberRow(model, 'south.creaseLineLengthM').provenance.kind).toBe('sourced');
    expect(numberRow(model, 'south.derivedCreaseM').value).toBe(EXPECTED.creaseDerived);
    const callout = calloutBlock(model, 'south.crease');
    expect(callout.level).toBe('warning');
    expect(callout.text).toContain(String(EXPECTED.creaseDeclared));
    expect(callout.text).toContain(String(EXPECTED.creaseDerived));
    expect(built.warnings.some((issue) => issue.code === 'crease')).toBe(true);
  });
  it('solver counts', () => {
    expect(numberRow(model, 'south.counts.axes').value).toBe(EXPECTED.axes);
    expect(numberRow(model, 'south.counts.windowSlots').value).toBe(EXPECTED.windowSlots);
    expect(numberRow(model, 'south.counts.windows').value).toBe(EXPECTED.windows);
    expect(numberRow(model, 'south.counts.portalVoidCells').value).toBe(EXPECTED.portalVoidCells);
    expect(numberRow(model, 'south.counts.columnShafts').value).toBe(EXPECTED.columnShafts);
    for (const id of ['south.counts.axes', 'south.counts.windowSlots', 'south.counts.windows']) {
      expect(numberRow(model, id).provenance.kind).toBe('derived');
    }
  });
  it('the kit totals fold into the table footer row (§3.4) with their formula chips', () => {
    const table = tableBlock(model, 'kit.parts');
    const totalRow = table.rows.at(-1);
    expect(totalRow?.id).toBe('kit.total');
    // The label carries the active-parts count; the columns name instances and the ceiling.
    expect(totalRow?.cells[0]).toContain(String(EXPECTED.activeParts));
    expect(cellInt(totalRow?.cells[1] ?? '')).toBe(EXPECTED.instances);
    expect(totalRow?.cells[2]).toBe('—');
    expect(cellInt(totalRow?.cells[3] ?? '')).toBe(EXPECTED.triangles);
    expect(totalRow?.provenance?.map((p) => p.kind)).toEqual(['derived', 'derived', 'derived']);
    // The separate totals numbers block is gone — no duplicated numbers on the page.
    expect(numberRows(model).has('kit.instances')).toBe(false);
    expect(numberRows(model).has('kit.triangles')).toBe(false);
  });
  it('kit table lists only placed parts and closes on 671 / 134 264', () => {
    const table = tableBlock(model, 'kit.parts');
    const partRows = table.rows.filter((row) => row.id !== 'kit.total');
    expect(partRows).toHaveLength(EXPECTED.activeParts);
    let instances = 0;
    let triangles = 0;
    for (const row of partRows) {
      const part = row.cells[0] as PartId;
      const count = cellInt(row.cells[1] ?? '');
      const ceiling = cellInt(row.cells[2] ?? '');
      const total = cellInt(row.cells[3] ?? '');
      expect(count).toBeGreaterThan(0);
      expect(ceiling).toBe(KIT[part].triangleCeiling);
      expect(total).toBe(count * ceiling);
      instances += count;
      triangles += total;
    }
    expect(instances).toBe(EXPECTED.instances);
    expect(triangles).toBe(EXPECTED.triangles);
    const totalRow = table.rows.at(-1);
    expect(totalRow?.id).toBe('kit.total');
    expect(cellInt(totalRow?.cells[1] ?? '')).toBe(EXPECTED.instances);
    expect(cellInt(totalRow?.cells[3] ?? '')).toBe(EXPECTED.triangles);
  });
  it('budget projection with the page allowance', () => {
    expect(numberRow(model, 'budget.facadeDrawCalls').value).toBe(EXPECTED.facadeDrawCalls);
    expect(numberRow(model, 'budget.frameDrawCalls').value).toBe(EXPECTED.frameDrawCalls);
    expect(numberRow(model, 'budget.frustumTriangles').value).toBe(EXPECTED.frustumTriangles);
    expect(numberRow(model, 'budget.submittedTriangleCeiling').value).toBe(
      EXPECTED.submittedTriangleCeiling,
    );
    // §3.4: the projected numbers live on the rows as muted margin suffixes.
    expect(numberRow(model, 'budget.frameDrawCalls').note).toBe('margin 193');
    expect(numberRow(model, 'budget.frustumTriangles').note).toBe('margin 861\u2009494');
    const gzip = numberRow(model, 'budget.jsGzipBytes');
    expect(gzip.value).toBeNull();
    expect(gzip.display).toBe('—'); // an em dash, never a fake number
    expect(gzip.note).toBe(PENDING_MEASUREMENT);
    const callout = calloutBlock(model, 'budget.contract');
    expect(callout.level).toBe('note');
    expect(callout.text).not.toContain(PENDING_MEASUREMENT); // the margins left the callout
    expect(callout.text).toContain('250');
    expect(callout.text).toContain('1\u2009000\u2009000');
    expect(callout.text).toContain('350\u2009000');
  });
  it('a measured gzip size replaces the pending note with its margin', () => {
    const { model: measured } = expectOk(
      buildSouthNotesModel({
        allowance: {
          shadowPasses: 1,
          otherFrameDrawCalls: 16,
          massingTriangles: 146,
          skyTriangles: 4096,
          measuredJsGzipBytes: 155_026,
        },
      }),
    );
    const gzip = numberRow(measured, 'budget.jsGzipBytes');
    expect(gzip.value).toBe(155_026);
    expect(gzip.display).toBe('155\u2009026');
    expect(gzip.note).toBe('margin 194\u2009974');
    expect(calloutBlock(measured, 'budget.contract').text).not.toContain(PENDING_MEASUREMENT);
  });
});
// ---------------------------------------------------------------------------
// 5. Provenance resolves
// ---------------------------------------------------------------------------
describe('provenance resolution', () => {
  it('every cited provenance resolves against SPEC_PROVENANCE with valid kinds and keys', () => {
    const { model } = expectOk(buildSouthNotesModel());
    const leaves = new Map(flattenProvenance(SPEC_PROVENANCE).map((leaf) => [leaf.id, leaf]));
    const cited = walkProvenance(model);
    expect(cited.length).toBeGreaterThan(0);
    for (const p of cited) {
      expect(['sourced', 'declared', 'derived']).toContain(p.kind);
      if (p.kind === 'derived') {
        expect(p.formula.length).toBeGreaterThan(0);
        expect(p.formula.startsWith('unregistered:')).toBe(false);
        continue;
      }
      const leaf = leaves.get(p.id);
      expect(leaf, `leaf for ${p.id}`).toBeDefined();
      expect(leaf?.provenance.kind).toBe(p.kind);
      if (p.kind === 'sourced') {
        expect(p.keys.length).toBeGreaterThan(0);
        for (const key of p.keys) {
          expect(isSourceKey(key)).toBe(true);
        }
      } else {
        expect(p.licenseTitle).toBe(LICENSE_LINES[p.license]);
        expect(p.licenseTitle.length).toBeGreaterThan(0);
      }
    }
  });
  it('the register itself holds only sourced and declared leaves', () => {
    for (const leaf of flattenProvenance(SPEC_PROVENANCE)) {
      if (leaf.provenance.kind === 'sourced') {
        expect(leaf.provenance.keys.length).toBeGreaterThan(0);
        for (const key of leaf.provenance.keys) {
          expect(isSourceKey(key)).toBe(true);
        }
      } else {
        expect(leaf.provenance.kind).toBe('declared');
        expect(LICENSE_LINES[leaf.provenance.license]).toBeDefined();
      }
    }
  });
});
// ---------------------------------------------------------------------------
// 6. Provenance coverage
// ---------------------------------------------------------------------------
describe('provenance coverage', () => {
  it('every SPEC_PROVENANCE leaf is displayed somewhere in the model', () => {
    const { model } = expectOk(buildSouthNotesModel());
    const displayed = new Set<string>();
    for (const p of walkProvenance(model)) {
      if (p.kind !== 'derived') {
        displayed.add(p.id);
      }
    }
    const uncited = flattenProvenance(SPEC_PROVENANCE)
      .map((leaf) => leaf.id)
      .filter((id) => !displayed.has(id));
    expect(uncited).toEqual([]);
  });
  it('a provenance tree missing a displayed id degrades to ok=false', () => {
    const { shell, ...rest } = SPEC_PROVENANCE;
    const { 'shell.corniceHeightM': _dropped, ...shellRest } = shell;
    const result = buildSouthNotesModel({ provenance: { ...rest, shell: shellRest } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === 'provenance.shell.corniceHeightM')).toBe(
        true,
      );
    }
  });
});
// ---------------------------------------------------------------------------
// 7. Failure paths
// ---------------------------------------------------------------------------
describe('failure paths', () => {
  it('a spec whose sections total 50 axes builds ok=false with explicit issues', () => {
    const spec: FacadeSpec = {
      ...SOUTH_FACADE,
      sections: SOUTH_FACADE.sections.map((section) =>
        section.kind === 'stretch' ? { ...section, declaredAxes: 14 } : section,
      ),
    };
    expect(spec.sections.reduce((sum, s) => sum + s.declaredAxes, 0)).toBe(50);
    const result = buildSouthNotesModel({ spec });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      for (const issue of result.issues) {
        expect(issue.severity).toBe('error');
        expect(issue.path.length).toBeGreaterThan(0);
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
  it('a wrong creaseLineLengthM keeps the solve ok and surfaces the crease warning', () => {
    const result = buildSouthNotesModel({
      spec: { ...SOUTH_FACADE, creaseLineLengthM: 300 },
    });
    const built = expectOk(result);
    const crease = built.warnings.filter((issue) => issue.code === 'crease');
    expect(crease.length).toBeGreaterThan(0);
    expect(crease.every((issue) => issue.severity === 'warning')).toBe(true);
    const callout = calloutBlock(built.model, 'south.crease');
    expect(callout.level).toBe('warning');
    expect(callout.text).toContain('300');
    expect(callout.text).toContain(String(EXPECTED.creaseDerived));
  });
  it('never throws on hostile input', () => {
    const hostile = { ...SOUTH_FACADE, sections: [] } as FacadeSpec;
    expect(() => buildSouthNotesModel({ spec: hostile })).not.toThrow();
    expect(buildSouthNotesModel({ spec: hostile }).ok).toBe(false);
    expect(() => buildSouthNotesModel({ rows: [] })).not.toThrow();
    expect(buildSouthNotesModel({ rows: [] }).ok).toBe(false);
  });
});
// ---------------------------------------------------------------------------
// 8. Frozen inputs
// ---------------------------------------------------------------------------
describe('frozen inputs', () => {
  it('SOUTH_FACADE, WINDOW_ROWS and SPEC_PROVENANCE are unchanged by a build', () => {
    const specBefore = structuredClone(SOUTH_FACADE);
    const rowsBefore = structuredClone(WINDOW_ROWS);
    const provenanceBefore = structuredClone(SPEC_PROVENANCE);
    expectOk(buildSouthNotesModel());
    buildSouthNotesModel({ spec: { ...SOUTH_FACADE, creaseLineLengthM: 300 } });
    expect(SOUTH_FACADE).toEqual(specBefore);
    expect(WINDOW_ROWS).toEqual(rowsBefore);
    expect(SPEC_PROVENANCE).toEqual(provenanceBefore);
  });
});

// ---------------------------------------------------------------------------
// The RU model snapshot (§1.3: "node tests snapshot both languages"). The labels come
// from the ACTIVE dictionary (the test activates ru first, en afterwards); the numbers,
// units and data maps take the lang argument. The data keys and tokens stay raw (R8).
// ---------------------------------------------------------------------------
describe('the RU model', () => {
  it('builds the localized model on the activated dictionary', async () => {
    await activateLang('ru');
    try {
      const result = buildSouthNotesModel({ lang: 'ru' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.model.title).toBe('Как устроен южный фасад');
      await expect(JSON.stringify(result.model, null, 2)).toMatchFileSnapshot(
        'fixtures/notes-model-ru.json',
      );
    } finally {
      await activateLang('en');
    }
  });
});
