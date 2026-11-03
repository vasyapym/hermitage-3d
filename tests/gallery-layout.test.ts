/**
 * Zimny — tests for the Military Gallery of 1812 layout law.
 * Pins design-gallery.md §2.7 (portrait-wall layout), §3.2 (generation),
 * §3.4 (the atlas) and DEC-021 / DEC-022 / DEC-023. Vitest node style, no jsdom.
 *
 * The byte pin holds rooms/1812/layout.ts to tools/gallery/layout.json, which
 * tools/gallery/layout.mjs emits; bake-time and run-time geometry are identical
 * by construction because both consumers read the same committed artifact.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { UvRect } from '../rooms/1812/layout';
import {
  ALLY_FRAMES,
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  ATLAS_SIZE_PX,
  allFrames,
  BAYS_PER_WALL,
  bayCentreZ,
  bayHalfSpanZ,
  buildLayout,
  CANVAS_OFFSET,
  CANVAS_WIDTH,
  COLUMNS_PER_BAY,
  chartOrder,
  chartRect,
  chartStripCount,
  EAST_WALL_X,
  FLANK_OFFSET_X,
  FLANKING_FRAMES,
  framesPerBay,
  framesPerWall,
  isKitFrame,
  kitFrames,
  LIGHTMAP_GRID,
  LIGHTMAP_PAD_PX,
  LIGHTMAP_SIZE_PX,
  MISSING_SLOT,
  MONARCH_CANVAS_HEIGHT,
  MONARCH_CANVAS_WIDTH,
  NORTH_DOOR_CENTRE_X,
  NORTH_WALL_Z,
  PORTAL_FRAMES,
  ROW_BOTTOM_Y,
  ROW_TOP_Y,
  ROWS_PER_WALL,
  reservedSlotSet,
  SLOT_H_PX,
  SLOT_W_PX,
  SUPER_BLOCK_COUNT,
  SUPER_BLOCK_SLOTS,
  serializeLayout,
  slotInsetPx,
  slotOfFrame,
  slotOfRank,
  slotSpanPx,
  slotUvRect,
  standardBaysPerWall,
  standardFrameCount,
  superBlockSlots,
  superBlockUvRect,
  totalFrameCount,
  WALL_Z_MAX,
  WALL_Z_MIN,
  WEST_WALL_X,
} from '../rooms/1812/layout';

const EPS = 1e-9;

const repoRoot = resolve(__dirname, '..');
const layoutJsonPath = resolve(repoRoot, 'tools/gallery/layout.json');
const layoutTsPath = resolve(repoRoot, 'rooms/1812/layout.ts');

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function overlaps1d(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 - EPS && b0 < a1 - EPS;
}

function rectsOverlap(a: UvRect, b: UvRect): boolean {
  // B10: the atlas rects carry v0 > v1 by law (the hang), so the V interval normalises.
  return (
    overlaps1d(a.u0, a.u1, b.u0, b.u1) &&
    overlaps1d(
      Math.min(a.v0, a.v1),
      Math.max(a.v0, a.v1),
      Math.min(b.v0, b.v1),
      Math.max(b.v0, b.v1),
    )
  );
}

describe('§3.2 byte pin', () => {
  it('serializes the TS law to the committed JSON byte for byte', { timeout: 20_000 }, () => {
    // the heaviest pure test: the loaded 2-core box needs the margin
    expect(serializeLayout(buildLayout())).toBe(readText(layoutJsonPath));
  });

  it('is stable across two serializations', () => {
    expect(serializeLayout(buildLayout())).toBe(serializeLayout(buildLayout()));
  });
});

describe('§2.7 count invariants', () => {
  it('sums the per-wall bay grid to the committed per-wall total', () => {
    expect(framesPerBay()).toBe(COLUMNS_PER_BAY * ROWS_PER_WALL);
    expect(framesPerWall()).toBe(standardBaysPerWall() * framesPerBay());
    expect(framesPerWall()).toBe(165);
    expect(standardBaysPerWall()).toBe(BAYS_PER_WALL);
  });

  it('counts 332 standard frames and 335 frames in all', () => {
    expect(standardFrameCount()).toBe(2 * framesPerWall() + FLANKING_FRAMES);
    expect(standardFrameCount()).toBe(332);
    expect(totalFrameCount()).toBe(335);
    expect(allFrames()).toHaveLength(335);
  });

  it('counts the flanking pair, the allies and the portal', () => {
    const frames = allFrames();
    expect(FLANKING_FRAMES).toBe(2);
    expect(ALLY_FRAMES).toBe(2);
    expect(PORTAL_FRAMES).toBe(1);
    expect(frames.filter((f) => f.kind === 'flanking')).toHaveLength(2);
    expect(frames.filter((f) => f.kind === 'ally')).toHaveLength(2);
    expect(frames.filter((f) => f.kind === 'portal')).toHaveLength(1);
    expect(frames.filter((f) => f.kind === 'standard')).toHaveLength(330);
    expect(kitFrames()).toHaveLength(334);
    expect(chartStripCount()).toBe(668);
  });
});

describe('§3.4 slot invariants', () => {
  it('reserves the three super-blocks at the grid top-left and the missing slot', () => {
    const reserved = reservedSlotSet();
    const expected = new Set<number>([MISSING_SLOT]);
    for (let block = 0; block < SUPER_BLOCK_COUNT; block += 1) {
      const slots = superBlockSlots(block);
      expect(slots).toHaveLength(SUPER_BLOCK_SLOTS * SUPER_BLOCK_SLOTS);
      const first = slots[0];
      expect(first).toBeDefined();
      if (first !== undefined) {
        expect(first).toBe(block * SUPER_BLOCK_SLOTS);
        for (const slot of slots) {
          expected.add(slot);
        }
      }
    }
    expect(reserved.size).toBe(expected.size);
    expect([...expected].every((slot) => reserved.has(slot))).toBe(true);
  });

  it('assigns the roster the first free slots, skipping the reserved set', () => {
    const frames = allFrames();
    let rank = 0;
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      if (frame === undefined || superBlockAnchor(index) !== null) {
        continue;
      }
      const slot = slotOfFrame(index);
      expect(slot).toBe(slotOfRank(rank));
      expect(reservedSlotSet().has(slot)).toBe(false);
      rank += 1;
    }
    // 330 wall portraits + 2 flanking = the 332-frame roster.
    expect(rank).toBe(332);
  });

  it('anchors the monarch canvases to the first slot of their super-blocks', () => {
    expect(slotOfFrame(portalIndex())).toBe(0);
    const allies = allyIndexes();
    expect(allies).toHaveLength(2);
    const westAlly = allies.find(
      (index) => (allFrames()[index]?.position.x ?? 0) < NORTH_DOOR_CENTRE_X,
    );
    const eastAlly = allies.find(
      (index) => (allFrames()[index]?.position.x ?? 0) >= NORTH_DOOR_CENTRE_X,
    );
    expect(westAlly).toBeDefined();
    expect(eastAlly).toBeDefined();
    if (westAlly !== undefined && eastAlly !== undefined) {
      expect(slotOfFrame(westAlly)).toBe(superBlockSlots(1)[0]);
      expect(slotOfFrame(eastAlly)).toBe(superBlockSlots(2)[0]);
    }
  });

  it('leaves the missing slot unused by any frame', () => {
    const used = new Set(allFrames().map((_frame, index) => slotOfFrame(index)));
    expect(used.has(MISSING_SLOT)).toBe(false);
    expect(MISSING_SLOT).toBe(ATLAS_COLUMNS * ATLAS_ROWS - 1);
    expect(used.size).toBe(335); // every frame has its own slot or block anchor.
  });
});

describe('§3.4 UV invariants', () => {
  it('insets every slot rect inside its cell on both axes', () => {
    const span = slotSpanPx();
    const inset = slotInsetPx();
    expect(span.width).toBe(SLOT_W_PX);
    expect(span.height).toBe(SLOT_H_PX);
    for (let slot = 0; slot < ATLAS_COLUMNS * ATLAS_ROWS; slot += 1) {
      const rect = slotUvRect(slot);
      const column = slot % ATLAS_COLUMNS;
      const row = Math.floor(slot / ATLAS_COLUMNS);
      expect(rect.u0).toBeCloseTo((column * span.width + inset) / ATLAS_SIZE_PX, 9);
      expect(rect.u1).toBeCloseTo((column * span.width + span.width - inset) / ATLAS_SIZE_PX, 9);
      expect(rect.v0).toBeCloseTo(1 - (row * span.height + inset) / ATLAS_SIZE_PX, 9);
      expect(rect.v1).toBeCloseTo(1 - (row * span.height + span.height - inset) / ATLAS_SIZE_PX, 9);
      expect(rect.u1 - rect.u0).toBeGreaterThan(0);
      // B10 hang law: v0 names the image-top row, v1 the bottom — v0 > v1 by law.
      expect(rect.v0 - rect.v1).toBeGreaterThan(0);
    }
  });

  it('hang law: the canvas top edge samples the cell’s image-top row (B10)', () => {
    // The goldens baselined the mirrored hang, so they cannot witness the orientation: the
    // binding puts (u0, v0) on the basis-low-v corner, `_basis` points v world-DOWN → that
    // corner is the PHYSICAL TOP; the exporter flips v once and the KTX2 samples top-first,
    // so the physical top reads atlas row (1 − v0) × ATLAS_SIZE_PX = the cell's image top.
    for (let slot = 0; slot < ATLAS_COLUMNS * ATLAS_ROWS; slot += 1) {
      const rect = slotUvRect(slot);
      const row = Math.floor(slot / ATLAS_COLUMNS);
      const imageTopRowPx = row * slotSpanPx().height + slotInsetPx();
      expect((1 - rect.v0) * ATLAS_SIZE_PX, `slot ${slot} image-top row`).toBeCloseTo(
        imageTopRowPx,
        6,
      );
      expect(rect.v0, `slot ${slot} v0 > v1`).toBeGreaterThan(rect.v1);
    }
  });

  it('keeps no frame rect crossing a cell or a super-block', () => {
    const frames = allFrames();
    const rects: UvRect[] = frames.map((_frame, index) =>
      superBlockAnchor(index) === null
        ? slotUvRect(slotOfFrame(index))
        : superBlockUvRect(superBlockAnchor(index) ?? 0),
    );
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        if (a !== undefined && b !== undefined) {
          expect(rectsOverlap(a, b)).toBe(false);
        }
      }
    }
  });

  it('gives the monarch canvases the full super-block rects', () => {
    const portal = superBlockUvRect(0);
    const span = (2 * spanW() - 2 * slotInsetPx()) / ATLAS_SIZE_PX;
    expect(portal.u1 - portal.u0).toBeCloseTo(span, 9);
    for (const index of allyIndexes()) {
      const rect = superBlockUvRect(superBlockAnchor(index) ?? 0);
      expect(MONARCH_CANVAS_WIDTH / MONARCH_CANVAS_HEIGHT).toBeCloseTo(
        (rect.u1 - rect.u0) / (rect.v0 - rect.v1),
        1,
      );
    }
  });

  it('keeps the 668 lightmap strips disjoint, padded and inside the chart', {
    timeout: 20_000,
  }, () => {
    // the pairwise sweep is O(n²) — the loaded box needs the margin
    const order = chartOrder();
    expect(order).toHaveLength(334);
    const frames = chartRects(order);
    expect(frames).toHaveLength(668);
    const pad = LIGHTMAP_PAD_PX / LIGHTMAP_SIZE_PX;
    const cell = 1 / LIGHTMAP_GRID;
    for (const rect of frames) {
      expect(rect.u1 - rect.u0).toBeCloseTo(cell - 2 * pad, 9);
      expect(rect.v1 - rect.v0).toBeCloseTo(cell - 2 * pad, 9);
      expect(rect.u0).toBeGreaterThanOrEqual(-EPS);
      expect(rect.v0).toBeGreaterThanOrEqual(-EPS);
      expect(rect.u1).toBeLessThanOrEqual(1 + EPS);
      expect(rect.v1).toBeLessThanOrEqual(1 + EPS);
    }
    for (let i = 0; i < frames.length; i += 1) {
      for (let j = i + 1; j < frames.length; j += 1) {
        const a = frames[i];
        const b = frames[j];
        if (a !== undefined && b !== undefined) {
          expect(rectsOverlap(a, b)).toBe(false);
        }
      }
    }
    expect(chartStripCount()).toBeLessThanOrEqual(LIGHTMAP_GRID * LIGHTMAP_GRID);
  });

  it('orders the strips by atlas slot', () => {
    const order = chartOrder();
    for (let i = 1; i < order.length; i += 1) {
      const prev = order[i - 1];
      const here = order[i];
      expect(prev).toBeDefined();
      expect(here).toBeDefined();
      if (prev !== undefined && here !== undefined) {
        expect(slotOfFrame(here)).toBeGreaterThan(slotOfFrame(prev));
      }
    }
  });
});

describe('§2.7 frame transform invariants', () => {
  it('faces every canvas inward on the gallery axis at true coordinates', () => {
    for (const frame of allFrames()) {
      if (frame.wall === 'west') {
        expect(frame.facing).toEqual({ x: 1, y: 0, z: 0 });
        expect(frame.position.x).toBeCloseTo(WEST_WALL_X + CANVAS_OFFSET, 9);
      }
      if (frame.wall === 'east') {
        expect(frame.facing).toEqual({ x: -1, y: 0, z: 0 });
        expect(frame.position.x).toBeCloseTo(EAST_WALL_X - CANVAS_OFFSET, 9);
      }
      if (frame.wall === 'north') {
        expect(frame.facing).toEqual({ x: 0, y: 0, z: 1 });
      }
      if (frame.wall === 'south') {
        expect(frame.facing).toEqual({ x: 0, y: 0, z: -1 });
      }
    }
  });

  it('seats every row between the declared bottom and top centres', () => {
    for (const frame of allFrames()) {
      if (frame.kind === 'standard') {
        expect(frame.position.y).toBeGreaterThanOrEqual(ROW_BOTTOM_Y - EPS);
        expect(frame.position.y).toBeLessThanOrEqual(ROW_TOP_Y + EPS);
      }
    }
    const rows = new Set(
      allFrames()
        .filter((frame) => frame.kind === 'standard')
        .map((frame) => frame.position.y),
    );
    expect(rows.size).toBe(ROWS_PER_WALL);
  });

  it('hangs the flanking pair one row above the bottom row beside the door axis', () => {
    for (const frame of flankFrames()) {
      expect(frame.kind).toBe('flanking');
      expect(frame.position.y).toBe(2.3);
      expect(frame.position.z).toBeCloseTo(NORTH_WALL_Z + CANVAS_OFFSET, 9);
      expect(Math.abs(frame.position.x - NORTH_DOOR_CENTRE_X)).toBeCloseTo(FLANK_OFFSET_X, 9);
    }
  });

  it('keeps bays non-overlapping and inside the committed wall z-range', () => {
    const half = bayHalfSpanZ();
    expect(2 * half).toBeLessThanOrEqual(5.0 + EPS);
    for (let bay = 0; bay < BAYS_PER_WALL; bay += 1) {
      expect(bayCentreZ(bay) - half).toBeGreaterThanOrEqual(WALL_Z_MIN - EPS);
      expect(bayCentreZ(bay) + half).toBeLessThanOrEqual(WALL_Z_MAX + EPS);
      if (bay > 0) {
        expect(bayCentreZ(bay) - half).toBeGreaterThanOrEqual(bayCentreZ(bay - 1) + half - EPS);
      }
    }
    for (const frame of allFrames()) {
      if (frame.kind === 'standard') {
        expect(frame.position.z - CANVAS_WIDTH / 2).toBeGreaterThanOrEqual(WALL_Z_MIN - EPS);
        expect(frame.position.z + CANVAS_WIDTH / 2).toBeLessThanOrEqual(WALL_Z_MAX + EPS);
      }
    }
  });

  it('flanks the portal with the two allies on the south end wall', () => {
    const portal = allFrames()[portalIndex()];
    expect(portal).toBeDefined();
    if (portal !== undefined) {
      expect(portal.position.x).toBe(NORTH_DOOR_CENTRE_X);
      expect(portal.canvas.width).toBe(MONARCH_CANVAS_WIDTH);
      expect(portal.canvas.height).toBe(MONARCH_CANVAS_HEIGHT);
      for (const index of allyIndexes()) {
        const ally = allFrames()[index];
        expect(ally).toBeDefined();
        if (ally !== undefined) {
          expect(ally.wall).toBe('south');
          expect(Math.abs(ally.position.z - portal.position.z)).toBeLessThan(EPS);
          expect(Math.abs(ally.position.x - portal.position.x)).toBeGreaterThan(CANVAS_WIDTH);
          expect(ally.position.x).toBeGreaterThan(WEST_WALL_X);
          expect(ally.position.x).toBeLessThan(EAST_WALL_X);
        }
      }
    }
  });
});

describe('purity of rooms/1812/layout.ts', () => {
  const source = readText(layoutTsPath);

  function stripCommentsAndStrings(text: string): string {
    const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const noLine = noBlock.replace(/\/\/[^\n]*/g, ' ');
    const noTemplate = noLine.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "''");
    const noDouble = noTemplate.replace(/"(?:\\[\s\S]|[^\\"])*"/g, "''");
    return noDouble.replace(/'(?:\\[\s\S]|[^\\'])*'/g, "''");
  }

  const scanned = stripCommentsAndStrings(source);

  it('imports nothing at all (no three.js, no node, no DOM imports)', () => {
    expect(source).not.toMatch(/from\s+'three/);
    expect(source).not.toMatch(/from\s+'node:/);
    expect(source).not.toMatch(/require\(/);
    expect(scanned).not.toMatch(/from\s+'/);
  });

  it('touches no DOM, no clock and no randomness', () => {
    const banned = [
      'document',
      'window',
      'localStorage',
      'performance',
      'Date',
      'setTimeout',
      'Math.random',
    ];
    for (const token of banned) {
      expect(scanned.includes(token)).toBe(false);
    }
  });

  it('exports by name only and keeps the state laws in comments', () => {
    expect(scanned).not.toMatch(/export\s+default/);
    expect(source).toMatch(/export function buildLayout/);
    expect(source).not.toMatch(/Math\.random/);
  });
});

/* ---- helpers (module scope, below the suites) ---- */

function spanW(): number {
  return slotSpanPx().width;
}

function superBlockAnchor(index: number): number | null {
  const frame = allFrames()[index];
  if (frame === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  if (frame.kind === 'portal') {
    return 0;
  }
  if (frame.kind === 'ally') {
    return (frame.position.x ?? 0) < NORTH_DOOR_CENTRE_X ? 1 : 2;
  }
  return null;
}

function portalIndex(): number {
  const index = allFrames().findIndex((frame) => frame.kind === 'portal');
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

function allyIndexes(): number[] {
  const indexes: number[] = [];
  allFrames().forEach((frame, index) => {
    if (frame.kind === 'ally') {
      indexes.push(index);
    }
  });
  return indexes;
}

function chartRects(order: readonly number[]): UvRect[] {
  const rects: UvRect[] = [];
  for (const [chart, index] of order.entries()) {
    const frameStrip = chartRect(chart, 'frame');
    const canvasStrip = chartRect(chart, 'canvas');
    expect(frameStrip).toBeDefined();
    expect(canvasStrip).toBeDefined();
    if (frameStrip !== undefined && canvasStrip !== undefined) {
      rects.push(frameStrip, canvasStrip);
      expect(isKitFrame(allFrames()[index]?.kind ?? 'portal')).toBe(true);
    }
  }
  return rects;
}

function flankFrames() {
  return allFrames().filter((frame) => frame.kind === 'flanking');
}
