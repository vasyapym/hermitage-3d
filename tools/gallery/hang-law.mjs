/*
 * Military Gallery atlas v2 — the hanging law (pure; design-gallery-atlas-v2 §2.3).
 * `applyHang(hang, worldCounts)` reduces the transcribed ru.wiki hanging scheme (345
 * half-length rows over the two long walls) to the kit's 330 wall frames by the
 * "row-tail-painted" rule; the rank → atlas-cell resolution rides the v1 slot law, re-declared
 * here so the pure module imports nothing (regex-fenced with atlas-law.mjs and resample.mjs —
 * tests/gallery-atlas.test.ts asserts the two walks agree rank for rank).
 *
 * The rule (§2.3 as the transcription pins it): for each (wall, row) take the world count w
 * (33) and the real list R (length r, ordered north → south by col); when r > w, drop the
 * SOUTHMOST PAINTED frames until w remain — silk frames are never dropped (skip over them;
 * the drop scan walks south → north); when r < w, the shortfall is filled with the dropped
 * frames of the adjacent row, southmost first, packing southward into the vacant tail — the
 * drops travel UP one row (the real per-row counts run 35·4 + 31, so the short row is the
 * top one). A row whose shortfall cannot be filled from its neighbour's drops, and a wall
 * whose arithmetic does not close, are loud errors. Dropped-and-unconsumed frames are the
 * wall's omission list; their real positions make the loss auditable (roster.json's
 * `omitted`).
 *
 * The rank → cell law: small-frame ranks 0…331 walk the atlas row-major from slot 6 to 343
 * minus the super-block footprints inside that range ({21…26}) — the v1 slot law; the
 * flanking pair lands at 342/343. Super-block ranks 0…2 anchor to slots 0/2/4 (their
 * blocks' first cells). The roster is keyed by inventory number; no cell index is stored.
 *
 * Purity: no imports, integer arithmetic only, no Math.random/Date/process — the same
 * determinism fence as the other pure gallery modules (DEC-024).
 */

/** The kit's per-wall-row world capacity (§2.3): framesPerWall 165 / ROWS_PER_WALL 5. */
export const HANG_WALLS = ['west', 'east'];
export const HANG_ROWS_PER_WALL = 5;
export const HANG_W_PER_ROW = 33;

/**
 * applyHang(hang, worldCounts) → { frames, omitted }.
 *
 * hang.frames: the transcribed rows [{ wall, row, col, silk, key, sitter, artist, year }, …]
 * (col counted from the north end; the transcription's own field names verbatim).
 * worldCounts: { w, rowsPerWall, walls } — w per wall-row (33), rows ascending = the fill
 * direction (row 0 lowest), walls in world rank order (west first).
 * Returns frames in world rank order with { kind, rank, wall, row, col, …source fields }
 * and omitted = [{ …source fields, realWall, realRow, realCol }].
 */
export function applyHang(hang, worldCounts) {
  const walls = worldCounts.walls;
  const rowsPerWall = worldCounts.rowsPerWall;
  const w = worldCounts.w;
  const byWallRow = new Map();
  for (const frame of hang.frames) {
    if (frame.wall !== 'west' && frame.wall !== 'east') {
      throw new Error(`hang-law: frame ${frame.key} hangs on a non-long wall "${frame.wall}"`);
    }
    const key = `${frame.wall}/${frame.row}`;
    let list = byWallRow.get(key);
    if (list === undefined) {
      list = [];
      byWallRow.set(key, list);
    }
    list.push(frame);
  }
  // Pass 1 — each row's drops: the southmost painted surplus, silk skipped over.
  const drops = new Map(); // `${wall}/${row}` → [frame, …] southmost first
  for (const wall of walls) {
    for (let row = 0; row < rowsPerWall; row += 1) {
      const list = (byWallRow.get(`${wall}/${row}`) ?? []).slice().sort((a, b) => a.col - b.col); // north → south
      const drop = [];
      let toDrop = list.length - w;
      if (toDrop > 0) {
        for (let i = list.length - 1; i >= 0 && toDrop > 0; i -= 1) {
          const frame = list[i];
          if (frame.silk === true) continue; // silk is never dropped (§2.3)
          drop.push(frame);
          toDrop -= 1;
        }
        if (toDrop > 0) {
          throw new Error(
            `hang-law: ${wall} row ${row} cannot shed ${list.length - w} frames — too few painted frames`,
          );
        }
      }
      drops.set(`${wall}/${row}`, drop);
      const dropped = new Set(drop);
      list.splice(0, list.length, ...list.filter((f) => !dropped.has(f)));
      byWallRow.set(`${wall}/${row}`, list);
    }
  }
  // Pass 2 — fill shortfalls from the drops of the row below, southmost first (§2.3 as the
  // transcription pins it: the real per-row counts run 35·4 + 31, so the short row is the
  // TOP row and the drops travel UP one row to fill it — "the next row up" names the drops'
  // travel direction, not the source row's position relative to the shortfall).
  for (const wall of walls) {
    for (let row = rowsPerWall - 1; row >= 0; row -= 1) {
      const list = byWallRow.get(`${wall}/${row}`) ?? [];
      let shortfall = w - list.length;
      while (shortfall > 0) {
        const below = drops.get(`${wall}/${row - 1}`);
        if (below === undefined || below.length === 0) {
          throw new Error(
            `hang-law: ${wall} row ${row} cannot fill ${shortfall} frame(s) — no drops below; the table must close (${hang.frames.length} real frames − ${walls.length * rowsPerWall * w} kept)`,
          );
        }
        const taken = below.shift(); // southmost first (the drops array runs south → north)
        list.push(taken); // packs southward into the vacant tail
        shortfall -= 1;
      }
    }
  }
  // Emit in world rank order: wall-major (west, east), then row, then col north → south.
  // The lists are already in kept order (pass 1 sorted + spliced, pass 2 appended the fills
  // southward in consumption order) — sorting here would undo the fill's packing, so the
  // order is taken as built and only the world col index is stamped on.
  const frames = [];
  for (const wall of walls) {
    for (let row = 0; row < rowsPerWall; row += 1) {
      const list = byWallRow.get(`${wall}/${row}`) ?? [];
      if (list.length !== w) {
        throw new Error(
          `hang-law: ${wall} row ${row} holds ${list.length} frames after the rule, want ${w}`,
        );
      }
      for (let col = 0; col < list.length; col += 1) {
        const frame = list[col];
        frames.push({
          ...frame,
          col,
          kind: frame.silk === true ? 'silk' : 'painted',
          rank: frames.length,
          row,
          wall,
        });
      }
    }
  }
  const omitted = [];
  for (const [key, drop] of drops) {
    const cut = key.indexOf('/');
    const realWall = key.slice(0, cut);
    const realRow = Number(key.slice(cut + 1));
    for (const frame of drop) {
      omitted.push({
        key: frame.key,
        realCol: frame.col,
        realRow,
        realWall,
        sitter: frame.sitter,
      });
    }
  }
  omitted.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { frames, omitted };
}

/**
 * The small-frame rank → atlas cell walk (§2.2): row-major slots 6…343 minus the super-block
 * footprints inside the range. Must equal rooms/1812/layout.ts slotOfRank rank for rank
 * (asserted by tests/gallery-atlas.test.ts).
 */
export function smallRankToSlot(rank) {
  if (!Number.isInteger(rank) || rank < 0) throw new Error(`hang-law: bad rank ${rank}`);
  const blocks = new Set([21, 22, 23, 24, 25, 26]); // the footprints slots 6…343 contain
  let count = 0;
  for (let slot = 6; slot <= 343; slot += 1) {
    if (blocks.has(slot)) continue;
    if (count === rank) return slot;
    count += 1;
  }
  throw new Error(`hang-law: atlas exhausted before rank ${rank}`);
}

/** The super-block rank (0…2) → its block's first cell (slots 0/2/4). */
export function superBlockRankToSlot(rank) {
  if (!Number.isInteger(rank) || rank < 0 || rank >= 3) {
    throw new Error(`hang-law: bad super-block rank ${rank}`);
  }
  return rank * 2;
}
