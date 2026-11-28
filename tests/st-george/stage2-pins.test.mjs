// tests/st-george/stage2-pins.test.mjs — the stage-2 pins (Appendix N) bound to the
// committed shapes: buildLaw()'s own return shape (classes carry instance objects with
// .faces; the stops live on law.rail as position/subject/look), the census row shape
// (triangles.drawn / .bakeOnly with unique == drawn, the no-instancing basis), the
// committed class ids (eagle-plate, relief-plate) and the real probe path. The S4 block
// lands with commit c (the S4 flip).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INTERIOR_EMISSIVE_SCALE } from '../../src/content/lightmap-look';
import {
  buildLaw,
  CHANDELIER,
  CHANDELIER_X0,
  chandelier,
  chandelierX,
  EYE_PLANE_Y,
  eyePlaneBackface,
  GLAZING,
  glazingBars,
  RELIEF_FIGURE_RULING,
} from '../../tools/st-george/law.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const law = buildLaw(); // the regenerate-and-compare gate makes law.json equal to it
const census = JSON.parse(read('tools/st-george/census.json'));
const cls = (id) => law.classes.find((c) => c.id === id);
const faces = (id) => cls(id).instances.flatMap((instance) => instance.faces);
const row = (id) => census.rows.find((r) => r.id === id);
const tris = (fs) => fs.reduce((n, f) => n + (f.vertices.length === 4 ? 2 : 1), 0);
const groupBy = (xs, key) => {
  const groups = {};
  for (const x of xs) {
    const k = key(x);
    if (groups[k] === undefined) groups[k] = [];
    groups[k].push(x);
  }
  return groups;
};
const EXPECT_X = [92.958333, 100.791667, 108.625, 116.458333, 124.291667];

describe('slots and plates (S1)', () => {
  it('slots 14-16 in order, slot == index', () => {
    expect(law.materialSlots.slice(14).map((r) => r.id)).toEqual([
      'eagle-plate',
      'chandelier-gilt',
      'chandelier-flame',
    ]);
    law.materialSlots.forEach((r, i) => {
      expect(r.slot).toBe(i);
    });
  });
  it('eagle/front is slot 14, the relief stays 13', () => {
    const eagle = law.classes.flatMap((c) => c.instances).flatMap((i) => i.faces);
    expect(eagle.find((f) => f.id === 'eagle/front').materialSlot).toBe(14);
    faces('relief-plate').forEach((f) => {
      expect(f.materialSlot).toBe(13);
    });
  });
  it('the figureRuling is the settled string', () => {
    expect(cls('relief-plate').figureRuling).toBe(RELIEF_FIGURE_RULING);
    expect(RELIEF_FIGURE_RULING).toMatch(
      /^SETTLED by the owner 2026-11-28: a drawn low-relief depiction is not a charter figure/,
    );
  });
});

describe('chandeliers (S2)', () => {
  // One instance per fixture; the faces carry the fixture id as their first path segment.
  const fixtures = groupBy(faces('chandeliers'), (f) => f.id.split('/')[0]);
  const verts = (fs) => fs.flatMap((f) => f.vertices);
  it('five fixtures at the derived x on the axis', () => {
    const ids = Object.keys(fixtures).sort();
    expect(ids).toEqual([0, 1, 2, 3, 4].map((k) => `chandelier-${k}`));
    ids.forEach((id, k) => {
      const vs = verts(fixtures[id]);
      const mean = (i) => vs.reduce((s, v) => s + v[i], 0) / vs.length;
      expect(Math.abs(mean(0) - EXPECT_X[k])).toBeLessThan(1e-5);
      expect(Math.abs(mean(2) - 14.5)).toBeLessThan(1e-5);
      for (const v of vs) {
        expect(Math.abs(v[2] - 14.5)).toBeLessThanOrEqual(1.15 + 1e-9);
      }
      expect(chandelierX(CHANDELIER.bays[k])).toBeCloseTo(EXPECT_X[k], 6);
    });
  });
  it("the bay module is the windows' own spacing and X0 is the frame's", () => {
    expect(CHANDELIER_X0).toBe(91);
    expect(CHANDELIER_X0).toBe(law.frame.X0);
    const panes = groupBy(faces('windows'), (w) =>
      // the plate faces carry a /front suffix; strip it, then group side-tier
      w.id.replace(/\/front$/, '').replace(/^window-(-?\d+)-\d+-(\d+)$/, '$1-$2'),
    );
    Object.values(panes).forEach((tier) => {
      const xs = tier.map((w) => w.vertices.reduce((s, v) => s + v[0], 0) / w.vertices.length);
      expect(xs.sort((a, b) => a - b)).toHaveLength(12);
      for (let i = 1; i < xs.length; i++) {
        expect(Math.abs(xs[i] - xs[i - 1] - CHANDELIER.bayModule)).toBeLessThan(1e-6);
      }
    });
  });
  it('no vertex below lowestY; the finial apex sits on it; 1,084 tris per fixture', () => {
    const ys = verts(faces('chandeliers')).map((v) => v[1]);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(CHANDELIER.lowestY - 1e-9);
    expect(Math.min(...ys)).toBeCloseTo(CHANDELIER.lowestY, 6);
    expect(tris(chandelier(0, 100))).toBe(1084);
  });
  it('ring tops are bake-only by the eye-plane rule, undersides are not', () => {
    faces('chandeliers')
      .filter((f) => /top$/.test(f.id))
      .forEach((f) => {
        expect(f.visibility).toBe('bake-only');
        expect(f.witness).toBeNull();
        expect(f.reason).toBe('eye-plane-backface');
      });
    for (const f of faces('chandeliers').filter((f) => /(bottom$|\/spoke\d+$)/.test(f.id))) {
      expect(f.reason).not.toBe('eye-plane-backface');
    }
  });
  it('eyePlaneBackface unit', () => {
    const sq = (y) => [
      [0, y, 0],
      [1, y, 0],
      [1, y, 1],
      [0, y, 1],
    ];
    expect(eyePlaneBackface([0, 1, 0], sq(18), EYE_PLANE_Y)).toBe(true);
    expect(eyePlaneBackface([0, -1, 0], sq(18), EYE_PLANE_Y)).toBe(false);
    expect(eyePlaneBackface([0, -1, 0], sq(10.5), EYE_PLANE_Y)).toBe(true);
    expect(eyePlaneBackface([1, 0, 0], sq(18), EYE_PLANE_Y)).toBe(false);
    expect(EYE_PLANE_Y).toBe(law.rail[0].position[1]); // the rail's H0 eye y (11.65)
  });
  it('relief (and eagle) clearance: every stop sightline to the top edge passes >= 0.25 m under every fixture', () => {
    const topEdge = (id) => {
      const vs = faces(id).flatMap((f) => f.vertices);
      const yTop = Math.max(...vs.map((v) => v[1]));
      return { yTop, x: vs.find((v) => v[1] === yTop)[0] };
    };
    for (const target of [topEdge('relief-plate'), topEdge('eagle-plate')]) {
      for (const stop of law.rail) {
        const [ex, ey] = stop.position;
        for (const cx of EXPECT_X) {
          if (cx <= ex || cx >= target.x) continue;
          const yRay = ey + ((target.yTop - ey) * (cx - ex)) / (target.x - ex);
          expect(CHANDELIER.lowestY - yRay).toBeGreaterThanOrEqual(0.25);
        }
      }
    }
  });
  it('census: drawn <= 9,000, 5,420 unique, slots [15, 16], provisional, licence AL-SG-2', () => {
    const r = row('chandeliers');
    expect(r.triangles.drawn).toBeLessThanOrEqual(9000);
    // The committed census basis: unique == drawn (no instancing credit); the class's
    // full unique-triangle count is drawn + bakeOnly (the eye-plane/certificate
    // bake-only faces included). 5 fixtures x 1,084.
    expect(r.triangles.drawn + r.triangles.bakeOnly).toBe(5420);
    expect(r.materialSlots).toEqual([15, 16]);
    expect(r.flags.census).toBe('provisional');
    expect(r.flags.licence).toBe('AL-SG-2');
  });
  it('the dial row deep-equals', () => {
    expect(INTERIOR_EMISSIVE_SCALE['st-george']['chandelier-flame']).toEqual({
      day: 0,
      dusk: 0.5,
      nightChandeliers: 1,
    });
  });
  it('the bake rows (text pins)', () => {
    const bake = read('tools/bpy/bake.py');
    expect(bake).toMatch(/'chandelier-flame': {'day': 0.0, 'dusk': 1.0, 'nightChandeliers': 12.0}/);
    expect(bake).toMatch(/'st-george': {'day': 2.09, 'dusk': 0.46, 'nightChandeliers': 0.93}/);
  });
});

describe('glazing bars (S3)', () => {
  const bars = faces('glazing-bars');
  const perPane = groupBy(bars, (f) => f.id.split('/bars/')[0]);
  it('48 panes, slot 0, 50 tris each, <= 2,500 total', () => {
    expect(Object.keys(perPane)).toHaveLength(48);
    bars.forEach((f) => {
      expect(f.materialSlot).toBe(0);
    });
    Object.values(perPane).forEach((fs) => {
      expect(tris(fs)).toBe(50);
    });
    expect(row('glazing-bars').triangles.unique).toBeLessThanOrEqual(2500);
    expect(row('glazing-bars').materialSlots).toEqual([0]);
  });
  it('every vertex within pane +- 0.12 and 0..0.07 proud toward the nave', () => {
    for (const w of cls('windows').instances) {
      const xs = w.faces.flatMap((f) => f.vertices).map((v) => v[0]);
      const ys = w.faces.flatMap((f) => f.vertices).map((v) => v[1]);
      const z0 = w.faces[0].vertices[0][2];
      const inward = 14.5 > z0 ? 1 : -1;
      // the law rounds its own coordinates to 1e-6 (the byte pin) — the extent pins
      // carry that quantum as slack
      for (const v of perPane[w.id].flatMap((f) => f.vertices)) {
        expect(v[0]).toBeGreaterThanOrEqual(Math.min(...xs) - GLAZING.surround - 1e-6);
        expect(v[0]).toBeLessThanOrEqual(Math.max(...xs) + GLAZING.surround + 1e-6);
        expect(v[1]).toBeGreaterThanOrEqual(Math.min(...ys) - GLAZING.surround - 1e-6);
        expect(v[1]).toBeLessThanOrEqual(Math.max(...ys) + GLAZING.surround + 1e-6);
        const proud = (v[2] - z0) * inward;
        expect(proud).toBeGreaterThanOrEqual(-1e-6);
        expect(proud).toBeLessThanOrEqual(0.07 + 1e-6);
      }
      expect(tris(glazingBars(w.id, w.faces[0].vertices))).toBe(50);
    }
  });
});

describe('the borrowed cells (rg-f5)', () => {
  it('the classes declare the adopted mode and name their host', () => {
    expect(cls('chandeliers').lightmap).toBe('adopted');
    expect(cls('chandeliers').lightmapHost).toBe('ceiling');
    expect(cls('glazing-bars').lightmap).toBe('adopted');
    expect(cls('glazing-bars').lightmapHost).toBe('walls');
  });
  it('the census rows carry the borrowed truth: no atlas cells of their own', () => {
    for (const id of ['chandeliers', 'glazing-bars']) {
      const r = row(id);
      expect(r.lightmap.adopted).toBe(true);
      expect(r.lightmap.islandClass).toBe(
        'adopted host cells (rg-f5 pattern); no atlas cells of their own',
      );
      expect(r.lightmap.texelsPerMetreShell).toBe(0);
      expect(r.lightmap.texelsPerMetreFinal).toBe(0);
    }
    expect(row('chandeliers').lightmap.host).toBe('ceiling');
    expect(row('glazing-bars').lightmap.host).toBe('walls');
  });
  it('the chart plan carries no patches for the borrowed faces', () => {
    // The receivers' 1,043 patches alone: the canvas is the stage-1 law's own (the
    // 4,470 borrowed micro-faces never enter the demand).
    expect(law.lighting.lmChart.patchCount).toBe(1043);
    expect(law.lighting.lmChart.canvasM).toBeCloseTo(122.9342390332921, 12);
    const own = law.classes
      .filter((c) => c.lightmap !== 'adopted')
      .reduce((n, c) => n + c.instances.reduce((m, i) => m + i.faces.length, 0), 0);
    expect(own).toBe(1043);
  });
});

// lands with commit c (the S4 flip)
describe.skip('S4 flip (lands with commit c)', () => {
  it('LM_RES reads finalRes and the descriptor says 2048', async () => {
    const py = read('tools/bpy/st-george.py');
    expect(py).toContain("LM_RES = LM['finalRes']");
    expect(py).not.toContain("LM_RES = LM['shellRes']");
    const { ROOM } = await import('../../tools/gltf/st-george.mjs');
    expect(ROOM.lightmaps.res).toBe(2048);
    expect(ROOM.lightmaps.intensity).toEqual({ day: 2.3, dusk: 0.56, nightChandeliers: 0.3 });
  });
  it('the probe is <= 8,000 B', () => {
    const probe = readFileSync(new URL('public/assets/st-george/probe/dusk.ktx2', ROOT));
    expect(probe.byteLength).toBeLessThanOrEqual(8000);
  });
});
