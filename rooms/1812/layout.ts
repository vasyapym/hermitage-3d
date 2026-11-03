/**
 * Zimny — Military Gallery of 1812: the portrait frame kit layout law, typed.
 * Implements design-gallery.md §2.7 (portrait-wall layout), §3.2 (generation),
 * §3.4 (the atlas) and DEC-021/DEC-022/DEC-023.
 *
 * The same arithmetic lives in tools/gallery/layout.mjs (the bpy builder's
 * source); a Vitest pin (tests/gallery-layout.test.ts) holds the two
 * implementations to byte-equal JSON over the committed emission
 * tools/gallery/layout.json. Bake-time and run-time geometry are therefore
 * identical by construction (DEC-006 assets as code).
 *
 * Pure: no three.js, no DOM, no node builtins. Constants are world metres,
 * +X east, +Z south, −Z north, +Y up.
 */

export type WallId = 'east' | 'north' | 'south' | 'west';
export type FrameKind = 'ally' | 'flanking' | 'portal' | 'standard';
export type ChartKind = 'canvas' | 'frame';

export type Vec3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type Size2 = {
  readonly height: number;
  readonly width: number;
};

export type UvRect = {
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
};

export type FrameTransform = {
  readonly bay: number | null;
  readonly canvas: Size2;
  readonly column: number | null;
  readonly facing: Vec3;
  readonly kind: FrameKind;
  readonly position: Vec3;
  readonly row: number | null;
  readonly wall: WallId;
};

export type FrameRecord = FrameTransform & {
  /** The gilt bars' strip in the kit chart; the K8 portal rides latecomer strips. */
  readonly chart: UvRect;
  /** The canvas quad's strip in the kit chart (same latecomer law for the portal). */
  readonly chartCanvas: UvRect;
  readonly index: number;
  readonly slot: number;
  readonly uv: UvRect;
};

/* §2.7 — the bay grid of a long wall. */
export const BAYS_PER_WALL = 11;
export const COLUMNS_PER_BAY = 3;
export const ROWS_PER_WALL = 5;
export const ALLY_BAYS_PER_WALL = 0;
export const FLANKING_FRAMES = 2;
export const ALLY_FRAMES = 2;
export const PORTAL_FRAMES = 1;
export const LONG_WALLS = 2;

/* §2.7 — metric constants, world metres. The gallery bounds: x 82..90.5,
 * z −40..+15; the long walls run along Z; the north end wall carries the entry. */
export const WEST_WALL_X = 82.0;
export const EAST_WALL_X = 90.5;
export const WALL_Z_MIN = -39.35;
export const WALL_Z_MAX = 14.35;
export const BAY_PITCH_Z = 5.0;
export const COLUMN_PITCH_Z = 1.54;
export const ROW_BOTTOM_Y = 1.6;
export const ROW_TOP_Y = 4.4;
/** The canvas plane stands this far off its wall face; the gilt bars sit at 0. */
export const CANVAS_OFFSET = 0.04;
export const CANVAS_WIDTH = 0.35;
export const CANVAS_HEIGHT = 0.43;
/** Monarch canvases are the standard canvas scaled (§2.7; the 2x2 super-block's aspect is 0.80). */
export const MONARCH_SCALE = 5;
export const MONARCH_CANVAS_WIDTH = CANVAS_WIDTH * MONARCH_SCALE;
export const MONARCH_CANVAS_HEIGHT = CANVAS_HEIGHT * MONARCH_SCALE;
export const MONARCH_CANVAS_Y = 3.6;
/** The allies flank the portal on the south end wall at these x offsets (§2.7). */
export const ALLY_OFFSET_X = 2.25;
export const SOUTH_WALL_Z = 15.0;
export const NORTH_WALL_Z = -40.0;
export const NORTH_DOOR_CENTRE_X = (WEST_WALL_X + EAST_WALL_X) / 2;
export const FLANK_OFFSET_X = 1.45;
/** Row 2 height: the flanking pair hangs one row above the bottom row (§2.7). */
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

/* §3.2 — derived counts. */
export function framesPerBay(): number {
  return COLUMNS_PER_BAY * ROWS_PER_WALL;
}

export function standardBaysPerWall(): number {
  return BAYS_PER_WALL - ALLY_BAYS_PER_WALL;
}

export function framesPerWall(): number {
  return standardBaysPerWall() * framesPerBay();
}

export function standardFrameCount(): number {
  return LONG_WALLS * framesPerWall() + FLANKING_FRAMES;
}

export function totalFrameCount(): number {
  return standardFrameCount() + ALLY_FRAMES + PORTAL_FRAMES;
}

/* §2.7 — pitch arithmetic along Z. The eleven-bay run is centred on the usable
 * wall range, so a later range change moves both ends symmetrically. */
export function bayCentreZ(bay: number): number {
  const run = (BAYS_PER_WALL - 1) * BAY_PITCH_Z;
  const firstCentre = (WALL_Z_MIN + WALL_Z_MAX) / 2 - run / 2;
  return firstCentre + bay * BAY_PITCH_Z;
}

export function columnZ(bay: number, column: number): number {
  const span = (COLUMNS_PER_BAY - 1) * COLUMN_PITCH_Z;
  return bayCentreZ(bay) - span / 2 + column * COLUMN_PITCH_Z;
}

export function rowY(row: number): number {
  const step = (ROW_TOP_Y - ROW_BOTTOM_Y) / (ROWS_PER_WALL - 1);
  return ROW_BOTTOM_Y + row * step;
}

export function bayHalfSpanZ(): number {
  return ((COLUMNS_PER_BAY - 1) * COLUMN_PITCH_Z + CANVAS_WIDTH) / 2;
}

/* §2.7 — frame transforms; west canvases face east, east canvases face west. */
export function wallFacing(wall: WallId): number {
  return wall === 'west' ? 1 : -1;
}

export function wallCanvasX(wall: WallId): number {
  const face = wall === 'west' ? WEST_WALL_X : EAST_WALL_X;
  return face + wallFacing(wall) * CANVAS_OFFSET;
}

export function wallFrames(wall: WallId): readonly FrameTransform[] {
  const frames: FrameTransform[] = [];
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
        } satisfies FrameTransform);
      }
    }
  }
  return frames;
}

export function flankingFrames(): readonly FrameTransform[] {
  const sides: readonly number[] = [-1, 1];
  return sides.map(
    (side): FrameTransform => ({
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
    }),
  );
}

export function allyFrame(side: number): FrameTransform {
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
  } satisfies FrameTransform;
}

export function portalFrame(): FrameTransform {
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
  } satisfies FrameTransform;
}

export function allFrames(): readonly FrameTransform[] {
  return [
    ...wallFrames('west'),
    ...wallFrames('east'),
    ...flankingFrames(),
    allyFrame(-1),
    allyFrame(1),
    portalFrame(),
  ];
}

/** The portal is K8 — its lightmap strips live in the architecture chart. */
export function isKitFrame(kind: FrameKind): boolean {
  return kind !== 'portal';
}

type IndexedFrame = {
  readonly frame: FrameTransform;
  readonly index: number;
};

export function kitFrames(): readonly IndexedFrame[] {
  return allFrames()
    .map((frame, index) => ({ frame, index }))
    .filter((entry) => isKitFrame(entry.frame.kind));
}

/* §3.4 — the monarch super-blocks sit at the grid's top-left, rows 0–1,
 * block b across columns 2b and 2b+1 (a 21-wide grid does not tile 2x2 blocks
 * into a contiguous slot range — the design's drawing law). */
export function superBlockSlots(block: number): readonly number[] {
  const slots: number[] = [];
  for (let dy = 0; dy < SUPER_BLOCK_SLOTS; dy += 1) {
    for (let dx = 0; dx < SUPER_BLOCK_SLOTS; dx += 1) {
      slots.push(dy * ATLAS_COLUMNS + block * SUPER_BLOCK_SLOTS + dx);
    }
  }
  return slots;
}

export function superBlockOfFrame(frame: FrameTransform): number | null {
  if (frame.kind === 'portal') {
    return 0;
  }
  if (frame.kind === 'ally') {
    return frame.position.x < NORTH_DOOR_CENTRE_X ? 1 : 2;
  }
  return null;
}

/** Every slot the atlas reserves: the super-block cells plus the missing slot. */
export function reservedSlotSet(): ReadonlySet<number> {
  const reserved = new Set<number>([MISSING_SLOT]);
  for (let block = 0; block < SUPER_BLOCK_COUNT; block += 1) {
    for (const slot of superBlockSlots(block)) {
      reserved.add(slot);
    }
  }
  return reserved;
}

/** The row-major atlas enumeration: slot s reads cell (floor(s / 21), s mod 21). */
export function slotCell(slot: number): { readonly column: number; readonly row: number } {
  return { column: slot % ATLAS_COLUMNS, row: Math.floor(slot / ATLAS_COLUMNS) };
}

/** The rank-th free atlas slot, row-major, skipping the reserved set. */
export function slotOfRank(rank: number): number {
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

/** Memoized slot table: one O(n) rank walk, shared by chart order and callers. */
let slotTableCache: number[] | null = null;

function slotTable(): readonly number[] {
  if (slotTableCache === null) {
    const frames = allFrames();
    const cache: number[] = [];
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
      if (isKitFrame(frame.kind)) {
        cache.push(slotOfRank(rank));
        rank += 1;
        continue;
      }
      cache.push(slotOfRank(rank));
    }
    slotTableCache = cache;
  }
  return slotTableCache;
}

/** Slot of frame `index` in the canonical frame order (also the chart anchor). */
export function slotOfFrame(index: number): number {
  const slot = slotTable()[index];
  if (slot === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  return slot;
}

/* §3.4 — atlas UV rectangles; the atlas is authored top-down, v1 at the top. */
export function slotSpanPx(): { readonly height: number; readonly width: number } {
  return { height: SLOT_H_PX, width: SLOT_W_PX };
}

export function slotInsetPx(): number {
  return ATLAS_GUTTER_PX + ATLAS_INSET_PX;
}

export function slotUvRect(slot: number): UvRect {
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
  return { u0: x0, u1: x0 + width, v0: 1 - y0, v1: 1 - (y0 + height) } satisfies UvRect;
}

export function superBlockUvRect(block: number): UvRect {
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
  return { u0: x0, u1: x0 + width, v0: 1 - y0, v1: 1 - (y0 + height) } satisfies UvRect;
}

export function frameUvRect(index: number): UvRect {
  const frame = allFrames()[index];
  if (frame === undefined) {
    throw new Error(`frame index out of range: ${index}`);
  }
  const block = superBlockOfFrame(frame);
  return block === null ? slotUvRect(slotOfFrame(index)) : superBlockUvRect(block);
}

/* §3.3 — the kit lightmap chart (UV2): two padded strips per kit frame,
 * the gilt bars and the canvas in separate strips so the bake never blends
 * them into shared texels; strips run row-major, ordered by slot. */
export function chartCellPx(): number {
  return LIGHTMAP_SIZE_PX / LIGHTMAP_GRID;
}

export function chartStripCount(): number {
  return 2 * kitFrames().length;
}

export function chartRect(chart: number, kind: ChartKind): UvRect {
  const strip = chart * 2 + (kind === 'frame' ? 0 : 1);
  const cell = chartCellPx();
  const col = strip % LIGHTMAP_GRID;
  const row = Math.floor(strip / LIGHTMAP_GRID);
  const pad = LIGHTMAP_PAD_PX;
  const x0 = (col * cell + pad) / LIGHTMAP_SIZE_PX;
  const y0 = (row * cell + pad) / LIGHTMAP_SIZE_PX;
  const span = (cell - 2 * pad) / LIGHTMAP_SIZE_PX;
  return { u0: x0, u1: x0 + span, v0: 1 - (y0 + span), v1: 1 - y0 } satisfies UvRect;
}

export function portalBlockRow(): number {
  return Math.ceil(chartStripCount() / LIGHTMAP_GRID);
}

/** The K8 block rect: PORTAL_BLOCK_CELLS² cells at (col, the derived row), pad inside —
 * the same image-px → UV convention as chartRect (v0 = 1 - (y0 + span)). */
export function portalBlockRect(col: number): UvRect {
  const cell = chartCellPx();
  const pad = LIGHTMAP_PAD_PX;
  const x0 = (col * cell + pad) / LIGHTMAP_SIZE_PX;
  const y0 = (portalBlockRow() * cell + pad) / LIGHTMAP_SIZE_PX;
  const span = (PORTAL_BLOCK_CELLS * cell - 2 * pad) / LIGHTMAP_SIZE_PX;
  return { u0: x0, u1: x0 + span, v0: 1 - (y0 + span), v1: 1 - y0 } satisfies UvRect;
}

/** Kit frame indices ordered by atlas slot; ties broken by frame index. */
export function chartOrder(): readonly number[] {
  return kitFrames()
    .slice()
    .sort((a, b) => {
      const sa = slotOfFrame(a.index);
      const sb = slotOfFrame(b.index);
      return sa === sb ? a.index - b.index : sa - sb;
    })
    .map((entry) => entry.index);
}

export function frameCharts(index: number): { readonly canvas: UvRect; readonly frame: UvRect } {
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

/* §3.2 — the law object: the shape committed to tools/gallery/layout.json. */
export type AtlasLaw = {
  readonly columns: number;
  readonly gutterPx: number;
  readonly insetPx: number;
  readonly missingSlot: number;
  readonly rows: number;
  readonly sizePx: number;
  readonly slotH: number;
  readonly slotW: number;
  readonly superBlockCount: number;
  readonly superBlockSlots: number;
};

export type CountsLaw = {
  readonly allyBaysPerWall: number;
  readonly allies: number;
  readonly baysPerWall: number;
  readonly columnsPerBay: number;
  readonly flanking: number;
  readonly framesPerBay: number;
  readonly framesPerWall: number;
  readonly kitCharts: number;
  readonly kitFrames: number;
  readonly longWalls: number;
  readonly portal: number;
  readonly rowsPerWall: number;
  readonly standard: number;
  readonly total: number;
};

export type LightmapLaw = {
  readonly grid: number;
  readonly padPx: number;
  readonly portalBlock: {
    readonly cells: number;
    readonly colCanvas: number;
    readonly colFrame: number;
    readonly row: number;
  };
  readonly sizePx: number;
  readonly stripsPerFrame: number;
};

export type MetricsLaw = {
  readonly allyOffsetX: number;
  readonly bayCentresZ: readonly number[];
  readonly bayPitchZ: number;
  readonly canvasOffset: number;
  readonly columnPitchZ: number;
  readonly eastWallX: number;
  readonly flankCanvasY: number;
  readonly flankOffsetX: number;
  readonly monarchCanvas: Size2;
  readonly monarchCanvasY: number;
  readonly northDoorCentreX: number;
  readonly northWallZ: number;
  readonly rowBottomY: number;
  readonly rowTopY: number;
  readonly southWallZ: number;
  readonly wallZMax: number;
  readonly wallZMin: number;
  readonly westWallX: number;
};

export type GalleryLayout = {
  readonly atlas: AtlasLaw;
  readonly counts: CountsLaw;
  readonly frames: readonly FrameRecord[];
  readonly lightmap: LightmapLaw;
  readonly metrics: MetricsLaw;
};

export function buildLayout(): GalleryLayout {
  const frames: FrameRecord[] = allFrames().map((frame, index): FrameRecord => {
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
  } satisfies GalleryLayout;
}

/* §3.2 — the canonical serialization shared with the emitter. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeysDeep(entry));
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

export function serializeLayout(layout: GalleryLayout): string {
  return `${JSON.stringify(sortKeysDeep(layout), null, 2)}\n`;
}
