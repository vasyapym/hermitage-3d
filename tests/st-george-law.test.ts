/*
 * DECISION-1 P7 and brief TEST: committed byte pins, deterministic regeneration,
 * 85% census gates and independent per-face visibility certificates.
 * Node-only; never imports the writer and never writes generated files.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Face, Vec3 } from '../tools/st-george/law.mjs';
import {
  buildCensus,
  buildLaw,
  serializeCensus,
  serializeLaw,
  validateConstants,
  validateFrame,
} from '../tools/st-george/law.mjs';

const lawPath = new URL('../tools/st-george/law.json', import.meta.url);
const censusPath = new URL('../tools/st-george/census.json', import.meta.url);

/*
 * Independent frame/look fixture from the brief, deliberately not imported
 * from the builder. The cosine uses the corrected horizontal-yaw rule, and the
 * eyes sweep the H0–H4 path at the record's own density (0.25 m) with the look
 * limits interpolated between stops — the same sweep the law certifies with.
 */
const STOPS = [
  { id: 'H0', x: 93.5, up: 0.8390996311772799, down: 0.2679491924311227 },
  { id: 'H1', x: 103, up: 0.8390996311772799, down: 0.36397023426620234 },
  { id: 'H2', x: 114.5, up: 0.4663076581549986, down: 0.8390996311772799 },
  { id: 'H3', x: 124, up: 0.7002075382097097, down: 0.4663076581549986 },
  { id: 'H4', x: 130.5, up: 0.4663076581549986, down: 0.7002075382097097 },
];
const SWEEP_STEP_M = 0.25;
const eyes = STOPS.slice(0, -1).flatMap((stop, index) => {
  const next = STOPS[index + 1];
  const count = Math.ceil((next.x - stop.x) / SWEEP_STEP_M);
  const rows: Array<{ id: string; x: number; up: number; down: number }> = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    rows.push({
      id: `${stop.id}-${next.id}#${i}`,
      x: stop.x + (next.x - stop.x) * t,
      up: stop.up + (next.up - stop.up) * t,
      down: stop.down + (next.down - stop.down) * t,
    });
  }
  return rows;
});

function independentlySeen(face: Face): boolean {
  const centre: Vec3 = [0, 0, 0];
  for (const vertex of face.vertices) {
    centre[0] += vertex[0];
    centre[1] += vertex[1];
    centre[2] += vertex[2];
  }
  centre[0] /= face.vertices.length;
  centre[1] /= face.vertices.length;
  centre[2] /= face.vertices.length;

  // Derive a normal from geometry, not from the builder's normal or witness.
  const first = face.vertices[0];
  const second = face.vertices[1];
  const third = face.vertices[2];
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error(`Invalid test face: ${face.id}`);
  }
  const ax = second[0] - first[0];
  const ay = second[1] - first[1];
  const az = second[2] - first[2];
  const bx = third[0] - first[0];
  const by = third[1] - first[1];
  const bz = third[2] - first[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const COS_YAW = 0.8191520442889918;
  const pointInCone = (px: number, py: number, pz: number, eye: (typeof eyes)[number]): boolean => {
    const dx = px - eye.x;
    const dy = py - 11.65;
    const dz = pz - 14.5;
    const horizontal = Math.sqrt(dx * dx + dz * dz);
    if (!(horizontal > 0)) return false;
    // Corrected rule (review finding R2): yaw on the horizontal projection,
    // pitch separately limited — not a single cone about world east.
    if (dx / horizontal < COS_YAW) return false;
    const slope = dy / horizontal;
    return slope <= eye.up && slope >= -eye.down;
  };

  // Dense edge sampling: the centre, every vertex, and 32 points per edge.
  // The law decides exactly by quadratic intervals; this dense check pins the
  // regression faces and catches gross disagreements.
  const samples: Vec3[] = [centre];
  for (let i = 0; i < face.vertices.length; i += 1) {
    const a = face.vertices[i];
    const b = face.vertices[(i + 1) % face.vertices.length];
    if (a === undefined || b === undefined) throw new Error(`Invalid test face: ${face.id}`);
    samples.push(a);
    for (let k = 1; k < 32; k += 1) {
      const t = k / 32;
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }

  for (const eye of eyes) {
    const facing = nx * (eye.x - centre[0]) + ny * (11.65 - centre[1]) + nz * (14.5 - centre[2]);
    if (facing <= 0) continue;
    for (const point of samples) {
      if (pointInCone(point[0], point[1], point[2], eye)) return true;
    }
  }
  return false;
}

describe('st-george P7 byte pins', () => {
  it('regenerates law.json byte for byte', () => {
    expect(serializeLaw(buildLaw())).toBe(readFileSync(lawPath, 'utf8'));
  });

  it('regenerates census.json byte for byte', () => {
    expect(serializeCensus(buildCensus())).toBe(readFileSync(censusPath, 'utf8'));
  });

  it('is stable across independent builds and serializations', () => {
    expect(serializeLaw(buildLaw())).toBe(serializeLaw(buildLaw()));
    expect(serializeCensus(buildCensus())).toBe(serializeCensus(buildCensus()));
  });
});

describe('st-george P7 plan gates', () => {
  it('holds every cap below its 85% admission threshold', () => {
    const census = buildCensus();
    expect(census.totals.triangles).toBeGreaterThan(0);
    expect(census.totals.draws).toBeGreaterThan(0);
    expect(census.totals.triangles).toBeLessThanOrEqual(70_000 * 0.85);
    expect(census.totals.draws).toBeLessThanOrEqual(24 * 0.85);
    expect(census.totals.textureBytes).toBeLessThanOrEqual(2_400_000 * 0.85);
    expect(census.totals.payloadBytes).toBeLessThanOrEqual(4_000_000 * 0.85);
  });

  it('independently checks every exported face and its front-facing winding', () => {
    const law = buildLaw();
    let exported = 0;
    for (const group of law.classes) {
      for (const instance of group.instances) {
        for (const face of instance.faces) {
          const visible = independentlySeen(face);
          expect(face.visibility, face.id).toBe(visible ? 'exported' : 'bake-only');
          if (face.visibility === 'exported') {
            exported += 1;
            expect(face.witness, face.id).not.toBeNull();
            expect(
              eyes.some((eye) => eye.id === face.witness?.stop),
              face.id,
            ).toBe(true);
          } else {
            expect(face.witness, face.id).toBeNull();
          }
        }
      }
    }
    expect(exported).toBeGreaterThan(0);
  });

  it('computes the west wall as bake-only without a wall-name exception', () => {
    const walls = buildLaw().classes.find((group) => group.id === 'walls');
    expect(walls).toBeDefined();
    const west = walls?.instances.find((instance) => instance.id === 'west-wall');
    expect(west).toBeDefined();
    for (const face of west?.faces ?? []) {
      expect(face.visibility).toBe('bake-only');
      expect(independentlySeen(face)).toBe(false);
    }
  });

  it('keeps the unsourced chandelier count null and places no substitutes', () => {
    const law = buildLaw();
    const chandeliers = law.classes.find((group) => group.id === 'chandeliers');
    expect(chandeliers?.count).toBeNull();
    expect(chandeliers?.instances).toEqual([]);
    expect(chandeliers?.UNSOURCED).toBe(true);
    const row = buildCensus(law).rows.find((entry) => entry.id === 'chandeliers');
    expect(row?.count).toBeNull();
    expect(row?.flags.UNSOURCED).toBe(true);
    expect(row?.triangles.drawn).toBe(0);
  });

  it('has paired design columns, two window tiers and a source for every constant', () => {
    const law = buildLaw();
    expect(law.grid.bayCount).toBe(12);
    expect(law.grid.bayPitch).toBe(47 / 12);
    expect(law.classes.find((group) => group.id === 'column-shafts')?.count).toBe(48);
    expect(law.classes.find((group) => group.id === 'windows')?.count).toBe(48);
    for (const entry of Object.values(law.constants)) {
      expect(entry.value).not.toBeNull();
      expect(entry.source).not.toBeNull();
      if (entry.source === null) throw new Error('Missing source');
      expect(law.sources[entry.source]).toBeDefined();
    }
  });

  it('refuses missing source rows and an area-incompatible frame', () => {
    expect(() =>
      validateConstants({
        TEST_CONSTANT: { kind: 'historical', value: null, source: null },
      }),
    ).toThrow('st-george-law: TEST_CONSTANT has no source row');
    expect(() =>
      validateConstants({
        TEST_CONSTANT: { kind: 'historical', value: 1, source: 'missing' },
      }),
    ).toThrow('st-george-law: TEST_CONSTANT has no source row');
    expect(() => validateFrame(47, 17)).not.toThrow();
    expect(() => validateFrame(60, 17)).toThrow(
      'st-george-law: frame L×W = 1020 m² contradicts the sourced area 800 m² ± 2 %',
    );
  });

  it('keeps every placed vertex inside the admitted bounds', () => {
    const law = buildLaw();
    for (const group of law.classes) {
      for (const instance of group.instances) {
        for (const face of instance.faces) {
          for (const point of face.vertices) {
            expect(point[0]).toBeGreaterThanOrEqual(91);
            expect(point[0]).toBeLessThanOrEqual(139);
            expect(point[1]).toBeGreaterThanOrEqual(9.5);
            expect(point[1]).toBeLessThanOrEqual(20.5);
            expect(point[2]).toBeGreaterThanOrEqual(5);
            expect(point[2]).toBeLessThanOrEqual(24);
          }
        }
      }
    }
  });
});

describe('st-george review fixes (pass 1)', () => {
  it('gates every texture subcap at 85 % and labels the shell density (R1, R8)', () => {
    const census = buildCensus();
    expect(census.textureReservations.lightmaps).toBeLessThanOrEqual(1_500_000 * 0.85);
    expect(census.textureReservations.plates).toBeLessThanOrEqual(550_000 * 0.85);
    expect(census.textureReservations.probe).toBeLessThanOrEqual(8_000 * 0.85);
    expect(census.lightmap.shellAtlasSize).toBe(1024);
    expect(census.lightmap.finalAtlasSize).toBe(2048);
    expect(census.lightmap.texelsPerMetreShell).toBe(census.lightmap.texelsPerMetreFinal / 2);
  });

  it('sees the bay-3 paired capital north face from H0 (R2 regression)', () => {
    const law = buildLaw();
    const caps = law.classes.find((group) => group.id === 'column-capitals');
    const instance = caps?.instances.find((entry) => entry.id === 'column-capital--1-3');
    const face = instance?.faces.find((entry) => entry.id.endsWith('/north'));
    if (face === undefined) throw new Error('missing the bay-3 capital north face');
    expect(face.visibility).toBe('exported');
    expect(eyes.some((eye) => eye.id === face.witness?.stop)).toBe(true);
    expect(independentlySeen(face)).toBe(true);
  });

  it('joins the paired capitals without overlap (R5)', () => {
    const law = buildLaw();
    const caps = law.classes.find((group) => group.id === 'column-capitals');
    const instances = caps?.instances ?? [];
    expect(instances).toHaveLength(24);
    for (const instance of instances) {
      const width = (instance.max?.[0] ?? 0) - (instance.min?.[0] ?? 0);
      // The joined block spans the pair spacing plus two capitalRadius arms;
      // it must still be narrower than the bay pitch so adjacent pairs
      // never touch.
      const expected = 2 * (law.grid.bayPitch * (1 / 8) + (17 / 48) * 1.5);
      expect(width).toBeCloseTo(expected, 9);
      expect(width).toBeLessThan(law.grid.bayPitch);
    }
  });

  it('derives the support chain from one height (R6)', () => {
    const law = buildLaw();
    const height = law.frame.CEILING_Y - law.frame.FLOOR_Y;
    const supportTop = law.frame.FLOOR_Y + height * law.design.columnHeight;
    const deck = law.classes.find((group) => group.id === 'balconies')?.instances[0];
    expect(deck?.min?.[1]).toBe(supportTop);
    const deckTop = deck?.max?.[1] ?? 0;
    const upperWindows = (
      law.classes.find((group) => group.id === 'windows')?.instances ?? []
    ).filter((instance) => instance.id.endsWith('-1'));
    expect(upperWindows).toHaveLength(24);
    for (const window of upperWindows) {
      const bottom = Math.min(...(window.vertices ?? []).map((vertex) => vertex[1]));
      expect(bottom).toBeGreaterThanOrEqual(deckTop);
    }
  });

  it('keeps the H4→relief sightline clear of the reshaped canopy (R3)', () => {
    const law = buildLaw();
    const canopy = law.classes.find((group) => group.id === 'canopy');
    const roof = canopy?.instances.find((instance) => instance.id === 'canopy-roof');
    expect(roof?.max?.[1]).toBe(law.rail[1]?.subject[1]);
    const h4 = law.rail[4];
    const relief = law.rail[4]?.subject;
    const slope = ((relief?.[1] ?? 0) - 11.65) / ((relief?.[0] ?? 0) - (h4?.position[0] ?? 0));
    const clearX = (h4?.position[0] ?? 0) + ((roof?.max?.[1] ?? 0) + 0.1 - 11.65) / slope;
    expect(roof?.min?.[0]).toBeCloseTo(clearX, 9);
  });

  it('refuses evidence-class mismatches between constants and source rows (R4c)', () => {
    expect(() =>
      validateConstants({ TEST: { kind: 'historical', value: 1, source: 'DETAIL' } }),
    ).toThrow('st-george-law: TEST claims historical evidence from a design row DETAIL');
    expect(() => validateConstants({ TEST: { kind: 'design', value: 1, source: 'A' } })).toThrow(
      'st-george-law: TEST claims design authority from a non-design row A',
    );
  });

  it('splits the column claims by evidence and era (R4b)', () => {
    const law = buildLaw();
    expect(law.constants.COLUMN_ARRANGEMENT).toMatchObject({ kind: 'historical', source: 'B' });
    expect(law.constants.COLUMN_ORDER).toMatchObject({ kind: 'observed', source: 'L' });
    expect(law.sources.L).toBeDefined();
  });
});
