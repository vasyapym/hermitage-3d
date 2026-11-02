/**
 * Zimny — Military Gallery of 1812: the portrait frame kit layout law (node side).
 * Implements design-gallery.md §2.7 (portrait-wall layout), §3.2 (generation),
 * §3.4 (the atlas) and DEC-021/DEC-022/DEC-023.
 *
 * This is the bpy builder's source of the law; the browser side is the typed
 * rooms/1812/layout.ts. A Vitest pin holds the two implementations to
 * byte-equal JSON over the committed emission below — run
 * `pnpm asset:gallery-layout` to regenerate deterministically (DEC-006).
 *
 * Pure derivation: no Math.random, no Date, no Math beyond arithmetic.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* §2.7 — the bay grid of a long wall. */
export const BAYS_PER_WALL = 11;
export const COLUMNS_PER_BAY = 3;
export const ROWS_PER_WALL = 5;
export const ALLY_BAYS_PER_WALL = 0;
export const FLANKING_FRAMES = 2;
export const ALLY_FRAMES = 2;
export const PORTAL_FRAMES = 1;
export const LONG_WALLS = 2;

/* §2.7 — metric constants, world metres (+X east, +Z south, −Z north, +Y up). */
export const WEST_WALL_X = 82.0;
export const EAST_WALL_X = 90.5;
export const WALL_Z_MIN = -39.35;
export const WALL_Z_MAX = 14.35;
export const BAY_PITCH_Z = 5.0;
export const COLUMN_PITCH_Z = 1.54;
export const ROW_BOTTOM_Y = 1.6;
export const ROW_TOP_Y = 4.4;
export const CANVAS_OFFSET = 0.04;
export const CANVAS_WIDTH = 0.35;
export const CANVAS_HEIGHT = 0.43;
export const MONARCH_SCALE = 5;
export const MONARCH_CANVAS_WIDTH = CANVAS_WIDTH * MONARCH_SCALE;
export const MONARCH_CANVAS_HEIGHT = CANVAS_HEIGHT * MONARCH_SCALE;
export const MONARCH_CANVAS_Y = 3.6;
export const ALLY_OFFSET_X = 2.25;
export const SOUTH_WALL_Z = 15.0;
export const NORTH_WALL_Z = -40.0;
export const NORTH_DOOR_CENTRE_X = (WEST_WALL_X + EAST_WALL_X) / 2;
export const FLANK_OFFSET_X = 1.45;
export const FLANK_CANVAS_Y = 2.3;

/* §3.4 — the portrait atlas. v2 (design-gallery-atlas-v2.md §3.1): every geometric
 * constant is v1 × 1.5 at the 3072² container — same 21×17 grid, same slot law, nothing
 * moves cells; the UV inset grows 5 px → 7 px (gutter 3 + inset 4). */
export const ATLAS_SIZE_PX = 3072;
export const ATLAS_COLUMNS = 21;
export const ATLAS_ROWS = 17;
export const SLOT_W_PX = 144;
export const SLOT_H_PX = 180;
export const ATLAS_GUTTER_PX = 3;
export const ATLAS_INSET_PX = 4;
export const SUPER_BLOCK_SLOTS = 2;
export const SUPER_BLOCK_COUNT = 3;
export const MISSING_SLOT = 356;

/* §3.3/§3.4 — the kit's lightmap chart grid (UV2): two strips per kit frame. */
export const LIGHTMAP_SIZE_PX = 1024;
export const LIGHTMAP_GRID = 32;
export const LIGHTMAP_PAD_PX = 2;

/* §3.7 (R4 D-11): the K8 portal's declared block on the kit chart — 4×4 cells at the
 * first spare row after the 668 kit strips, frame at cols 0–3 and canvas at cols 4–7.
 * The row is DERIVED from chartStripCount(), never a literal: the strip law can change
 * without touching this (ceil(668/32) = 21 today). */
export const PORTAL_BLOCK_CELLS = 4;
export const PORTAL_FRAME_COL = 0;
export const PORTAL_CANVAS_COL = 4;

export function framesPerBay() {
  return COLUMNS_PER_BAY * ROWS_PER_WALL;
}

export function standardBaysPerWall() {
  return BAYS_PER_WALL - ALLY_BAYS_PER_WALL;
}

export function framesPerWall() {
  return standardBaysPerWall() * framesPerBay();
}

export function standardFrameCount() {
  return LONG_WALLS * framesPerWall() + FLANKING_FRAMES;
}

export function totalFrameCount() {
  return standardFrameCount() + ALLY_FRAMES + PORTAL_FRAMES;
}

export function bayCentreZ(bay) {
  const run = (BAYS_PER_WALL - 1) * BAY_PITCH_Z;
  const firstCentre = (WALL_Z_MIN + WALL_Z_MAX) / 2 - run / 2;
  return firstCentre + bay * BAY_PITCH_Z;
}

export function columnZ(bay, column) {
  const span = (COLUMNS_PER_BAY - 1) * COLUMN_PITCH_Z;
  return bayCentreZ(bay) - span / 2 + column * COLUMN_PITCH_Z;
}

export function rowY(row) {
  if (ROWS_PER_WALL === 1) {
    return ROW_BOTTOM_Y;
  }
  const step = (ROW_TOP_Y - ROW_BOTTOM_Y) / (ROWS_PER_WALL - 1);
  return ROW_BOTTOM_Y + row * step;
}

export function bayHalfSpanZ() {
  return ((COLUMNS_PER_BAY - 1) * COLUMN_PITCH_Z + CANVAS_WIDTH) / 2;
}

export function wallFacing(wall) {
  return wall === 'west' ? 1 : -1;
}

export function wallCanvasX(wall) {
  const face = wall === 'west' ? WEST_WALL_X : EAST_WALL_X;
  return face + wallFacing(wall) * CANVAS_OFFSET;
}

export function wallFrames(wall) {
  const frames = [];
  for (let bay = 0; bay < standardBaysPerWall(); bay += 1) {
    for (let row = 0; row < ROWS_PER_WALL; row += 1) {
      for (let column = 0; column < COLUMNS_PER_BAY; column += 1) {
        frames.push({
          bay,
          canvas: { height: CANVAS_HEIGHT, width: CANVAS_WIDTH },
          column,
          facing: { x: wallFacing(wall), y: 0, z: 0 },
          kind: 'standard',
          position: { x: wallCanvasX(wall), y: rowY(row), z: columnZ(bay, column) },
          row,
          wall,
        });
      }
    }
  }
  return frames;
}

export function flankingFrames() {
  const sides = [-1, 1];
  return sides.map((side) => ({
    bay: null,
    canvas: { height: CANVAS_HEIGHT, width: CANVAS_WIDTH },
    column: null,
    facing: { x: 0, y: 0, z: 1 },
    kind: 'flanking',
    position: {
      x: NORTH_DOOR_CENTRE_X + side * FLANK_OFFSET_X,
      y: FLANK_CANVAS_Y,
      z: NORTH_WALL_Z + CANVAS_OFFSET,
    },
    row: null,
    wall: 'north',
  }));
}

export function allyFrame(side) {
  return {
    bay: null,
    canvas: { height: MONARCH_CANVAS_HEIGHT, width: MONARCH_CANVAS_WIDTH },
    column: null,
    facing: { x: 0, y: 0, z: -1 },
    kind: 'ally',
    position: {
      x: NORTH_DOOR_CENTRE_X + side * ALLY_OFFSET_X,
      y: MONARCH_CANVAS_Y,
      z: SOUTH_WALL_Z - CANVAS_OFFSET,
    },
    row: null,
    wall: 'south',
  };
}

export function portalFrame() {
  return {
    bay: null,
    canvas: { height: MONARCH_CANVAS_HEIGHT, width: MONARCH_CANVAS_WIDTH },
    column: null,
    facing: { x: 0, y: 0, z: -1 },
    kind: 'portal',
    position: {
      x: NORTH_DOOR_CENTRE_X,
      y: MONARCH_CANVAS_Y,
      z: SOUTH_WALL_Z - CANVAS_OFFSET,
    },
    row: null,
    wall: 'south',
  };
}

export function allFrames() {
  return [
    ...wallFrames('west'),
    ...wallFrames('east'),
    ...flankingFrames(),
    allyFrame(-1),
    allyFrame(1),
    portalFrame(),
  ];
}

export function isKitFrame(kind) {
  return kind !== 'portal';
}

export function kitFrames() {
  return allFrames()
    .map((frame, index) => ({ frame, index }))
    .filter((entry) => isKitFrame(entry.frame.kind));
}

export function superBlockSlots(block) {
  const slots = [];
  for (let dy = 0; dy < SUPER_BLOCK_SLOTS; dy += 1) {
    for (let dx = 0; dx < SUPER_BLOCK_SLOTS; dx += 1) {
      slots.push(dy * ATLAS_COLUMNS + block * SUPER_BLOCK_SLOTS + dx);
    }
  }
  return slots;
}

export function superBlockOfFrame(frame) {
  if (frame.kind === 'portal') {
    return 0;
  }
  if (frame.kind === 'ally') {
    return frame.position.x < NORTH_DOOR_CENTRE_X ? 1 : 2;
  }
  return null;
}

export function reservedSlotSet() {
  const reserved = new Set([MISSING_SLOT]);
  for (let block = 0; block < SUPER_BLOCK_COUNT; block += 1) {
    for (const slot of superBlockSlots(block)) {
      reserved.add(slot);
    }
  }
  return reserved;
}

export function slotCell(slot) {
  return { column: slot % ATLAS_COLUMNS, row: Math.floor(slot / ATLAS_COLUMNS) };
}

export function slotOfRank(rank) {
  const reserved = reservedSlotSet();
  const limit = ATLAS_COLUMNS * ATLAS_ROWS;
  let slot = 0;
  let count = 0;
  while (slot < limit) {
    if (!reserved.has(slot)) {
      if (count === rank) {
        return slot;
      }
      count += 1;
    }
    slot += 1;
  }
  throw new Error(`atlas exhausted before roster rank ${rank}`);
}

let slotTableCache = null;

function slotTable() {
  if (slotTableCache === null) {
    const frames = allFrames();
    const cache = [];
    let rank = 0;
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      if (frame === undefined) {
        throw new Error(`frame index out of range: ${index}`);
      }
      const block = superBlockOfFrame(frame);
      if (block !== null) {
        const first = superBlockSlots(block)[0];
        if (first === undefined) {
          throw new Error(`empty super-block: ${block}`);
        }
        cache.push(first);
        continue;
      }
      cache.push(slotOfRank(rank));
      rank += 1;
    }
    slotTableCache = cache;
  }
  return slotTableCache;
}

export function slotOfFrame(index) {
  const slot = slotTable()[index];
  if (slot === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  return slot;
}

export function slotSpanPx() {
  return { height: SLOT_H_PX, width: SLOT_W_PX };
}

export function slotInsetPx() {
  return ATLAS_GUTTER_PX + ATLAS_INSET_PX;
}

export function slotUvRect(slot) {
  const span = slotSpanPx();
  const cell = slotCell(slot);
  const inset = slotInsetPx();
  const x0 = (cell.column * span.width + inset) / ATLAS_SIZE_PX;
  const y0 = (cell.row * span.height + inset) / ATLAS_SIZE_PX;
  const width = (span.width - 2 * inset) / ATLAS_SIZE_PX;
  const height = (span.height - 2 * inset) / ATLAS_SIZE_PX;
  // Hang law (design-gallery.md, B10): the canvas binding puts (u0, v0) on the quad's
  // basis-low-v corner, and the builder's `_basis` points v world-DOWN, so that corner is the
  // PHYSICAL TOP — v0 names the cell's image-top row (Blender-side 1 − y), v1 its bottom.
  // v0 > v1 by law; chartRect keeps v0 < v1 (the bake reads the lm chart through that
  // binding). Verified live at the M1/M3 captures (the heads hung at the frame bottoms).
  return { u0: x0, u1: x0 + width, v0: 1 - y0, v1: 1 - (y0 + height) };
}

export function superBlockUvRect(block) {
  const span = slotSpanPx();
  const edge = SUPER_BLOCK_SLOTS;
  const first = superBlockSlots(block)[0];
  if (first === undefined) {
    throw new Error(`empty super-block: ${block}`);
  }
  const cell = slotCell(first);
  const inset = slotInsetPx();
  const x0 = (cell.column * span.width + inset) / ATLAS_SIZE_PX;
  const y0 = (cell.row * span.height + inset) / ATLAS_SIZE_PX;
  const width = (edge * span.width - 2 * inset) / ATLAS_SIZE_PX;
  const height = (edge * span.height - 2 * inset) / ATLAS_SIZE_PX;
  // The same hang law as slotUvRect (B10): the super-block's image-top row lands in v0.
  return { u0: x0, u1: x0 + width, v0: 1 - y0, v1: 1 - (y0 + height) };
}

export function frameUvRect(index) {
  const frame = allFrames()[index];
  if (frame === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  const block = superBlockOfFrame(frame);
  return block === null ? slotUvRect(slotOfFrame(index)) : superBlockUvRect(block);
}

export function chartCellPx() {
  return LIGHTMAP_SIZE_PX / LIGHTMAP_GRID;
}

export function chartStripCount() {
  return 2 * kitFrames().length;
}

export function chartRect(chartIndex, kind) {
  const strip = chartIndex * 2 + (kind === 'frame' ? 0 : 1);
  const cell = chartCellPx();
  const col = strip % LIGHTMAP_GRID;
  const row = Math.floor(strip / LIGHTMAP_GRID);
  const pad = LIGHTMAP_PAD_PX;
  const x0 = (col * cell + pad) / LIGHTMAP_SIZE_PX;
  const y0 = (row * cell + pad) / LIGHTMAP_SIZE_PX;
  const span = (cell - 2 * pad) / LIGHTMAP_SIZE_PX;
  return { u0: x0, u1: x0 + span, v0: 1 - (y0 + span), v1: 1 - y0 };
}

export function portalBlockRow() {
  return Math.ceil(chartStripCount() / LIGHTMAP_GRID);
}

/** The K8 block rect: PORTAL_BLOCK_CELLS² cells at (col, the derived row), pad inside —
 * the same image-px → UV convention as chartRect (v0 = 1 - (y0 + span)). */
export function portalBlockRect(col) {
  const cell = chartCellPx();
  const pad = LIGHTMAP_PAD_PX;
  const x0 = (col * cell + pad) / LIGHTMAP_SIZE_PX;
  const y0 = (portalBlockRow() * cell + pad) / LIGHTMAP_SIZE_PX;
  const span = (PORTAL_BLOCK_CELLS * cell - 2 * pad) / LIGHTMAP_SIZE_PX;
  return { u0: x0, u1: x0 + span, v0: 1 - (y0 + span), v1: 1 - y0 };
}

export function chartOrder() {
  return kitFrames()
    .slice()
    .sort((a, b) => {
      const sa = slotOfFrame(a.index);
      const sb = slotOfFrame(b.index);
      return sa === sb ? a.index - b.index : sa - sb;
    })
    .map((entry) => entry.index);
}

export function frameCharts(index) {
  const frame = allFrames()[index];
  if (frame === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  // R4 D-11: the portal is no latecomer — its bars and canvas ride the declared block
  // (frame cols 0–3, canvas cols 4–7) at the derived first-spare row (bevel-pitch parity
  // with the architecture chart's 36 px/m, from the kit chart's spare strips).
  if (frame.kind === 'portal') {
    return {
      canvas: portalBlockRect(PORTAL_CANVAS_COL),
      frame: portalBlockRect(PORTAL_FRAME_COL),
    };
  }
  const order = chartOrder();
  const chart = order.indexOf(index);
  if (chart < 0) {
    throw new Error(`kit frame missing from chart order: ${index}`);
  }
  return { canvas: chartRect(chart, 'canvas'), frame: chartRect(chart, 'frame') };
}

export function buildLayout() {
  const frames = allFrames().map((frame, index) => {
    const strips = frameCharts(index);
    return {
      ...frame,
      chart: strips.frame,
      chartCanvas: strips.canvas,
      index,
      slot: slotOfFrame(index),
      uv: frameUvRect(index),
    };
  });
  return {
    atlas: {
      columns: ATLAS_COLUMNS,
      gutterPx: ATLAS_GUTTER_PX,
      insetPx: ATLAS_INSET_PX,
      missingSlot: MISSING_SLOT,
      rows: ATLAS_ROWS,
      sizePx: ATLAS_SIZE_PX,
      slotH: SLOT_H_PX,
      slotW: SLOT_W_PX,
      superBlockCount: SUPER_BLOCK_COUNT,
      superBlockSlots: SUPER_BLOCK_SLOTS,
    },
    counts: {
      allyBaysPerWall: ALLY_BAYS_PER_WALL,
      allies: ALLY_FRAMES,
      baysPerWall: BAYS_PER_WALL,
      columnsPerBay: COLUMNS_PER_BAY,
      flanking: FLANKING_FRAMES,
      framesPerBay: framesPerBay(),
      framesPerWall: framesPerWall(),
      kitCharts: chartStripCount(),
      kitFrames: kitFrames().length,
      longWalls: LONG_WALLS,
      portal: PORTAL_FRAMES,
      rowsPerWall: ROWS_PER_WALL,
      standard: standardFrameCount(),
      total: totalFrameCount(),
    },
    frames,
    lightmap: {
      grid: LIGHTMAP_GRID,
      padPx: LIGHTMAP_PAD_PX,
      portalBlock: {
        cells: PORTAL_BLOCK_CELLS,
        colCanvas: PORTAL_CANVAS_COL,
        colFrame: PORTAL_FRAME_COL,
        row: portalBlockRow(),
      },
      sizePx: LIGHTMAP_SIZE_PX,
      stripsPerFrame: 2,
    },
    metrics: {
      allyOffsetX: ALLY_OFFSET_X,
      bayCentresZ: Array.from({ length: BAYS_PER_WALL }, (_v, bay) => bayCentreZ(bay)),
      bayPitchZ: BAY_PITCH_Z,
      canvasOffset: CANVAS_OFFSET,
      columnPitchZ: COLUMN_PITCH_Z,
      eastWallX: EAST_WALL_X,
      flankCanvasY: FLANK_CANVAS_Y,
      flankOffsetX: FLANK_OFFSET_X,
      monarchCanvas: { height: MONARCH_CANVAS_HEIGHT, width: MONARCH_CANVAS_WIDTH },
      monarchCanvasY: MONARCH_CANVAS_Y,
      northDoorCentreX: NORTH_DOOR_CENTRE_X,
      northWallZ: NORTH_WALL_Z,
      rowBottomY: ROW_BOTTOM_Y,
      rowTopY: ROW_TOP_Y,
      southWallZ: SOUTH_WALL_Z,
      wallZMax: WALL_Z_MAX,
      wallZMin: WALL_Z_MIN,
      westWallX: WEST_WALL_X,
    },
  };
}

/** Recursively sort object keys so JSON.stringify is order-stable. */
export function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

export function serializeLayout(layout) {
  return `${JSON.stringify(sortKeysDeep(layout), null, 2)}\n`;
}

export function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = resolve(here, 'layout.json');
  writeFileSync(target, serializeLayout(buildLayout()), 'utf8');
  return target;
}

main();
