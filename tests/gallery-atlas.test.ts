/*
 * Atlas v2 — portrait atlas verification (design-gallery-atlas-v2 §5.3; DEC-024, DEC-030,
 * DEC-016): pure-law determinism against the committed mock digest pin (no toktx in CI), the
 * slot-law interplay with rooms/1812/layout.ts, the §2.3 hanging law and the §2.2 rank → cell
 * bijection, roster/lock/attribution consistency, the purity fence over the three pure
 * modules, the committed artifact (≤ ATLAS_BYTES_MAX, KTX 2.0 magic, the 3072²/12-level
 * header) and the register rows. The mock-first gate (§3.8): the lock/atlas cross-checks run
 * only when the lock exists — before the maintainer's real fetch/lock/encode pass the suite
 * is green on mock pins alone.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import * as layout from '../rooms/1812/layout';
import {
  ATLAS_BYTES_MAX,
  ATLAS_COLUMNS,
  ATLAS_GUTTER_PX,
  ATLAS_INSET_PX,
  ATLAS_LAW_VERSION,
  ATLAS_ROWS,
  ATLAS_SIZE_PX,
  encodePng,
  GUTTER_RGB,
  hash32,
  isFamilyLicense,
  MIP_LEVELS,
  MISSING_SLOT,
  mockTiles,
  paintAtlas,
  QLEVEL_LADDER,
  rosterSlots,
  SALT_1812,
  SILK_COUNT,
  SLOT_H_PX,
  SLOT_W_PX,
  SUPER_BLOCK_COUNT,
  SUPER_BLOCK_SLOTS,
  slotRoles,
  standInParams,
} from '../tools/gallery/atlas-law.mjs';
import { applyHang, smallRankToSlot, superBlockRankToSlot } from '../tools/gallery/hang-law.mjs';
import { attribBlock, canonicalJson } from '../tools/gallery/import.mjs';

const sha256 = (b: Uint8Array | Buffer) => createHash('sha256').update(b).digest('hex');
const ROOT = resolve(__dirname, '..');
const LAW_PATHS = ['atlas-law.mjs', 'resample.mjs', 'hang-law.mjs'].map((p) =>
  resolve(ROOT, 'tools/gallery', p),
);
const DIGEST_PATH = resolve(ROOT, 'tools/gallery/atlas.digest.json');
const ROSTER_PATH = resolve(ROOT, 'tools/gallery/roster.json');
const LOCK_PATH = resolve(ROOT, 'tools/gallery/atlas.lock.json');
const REGISTER_PATH = resolve(ROOT, 'docs/artistic-license.md');
const ATTRIBUTIONS_PATH = resolve(ROOT, 'ATTRIBUTIONS.md');
const ROOM_PATH = resolve(ROOT, 'public/assets/military-gallery');
const ROOM_TS_PATH = resolve(ROOT, 'rooms/1812/room.ts');
const ATLAS_REL = 'tex/military-gallery-portraits.ktx2';
/** §3.7: the KTX2 ceiling fence — imported from the law (ATLAS_BYTES_MAX), asserted here. */
const KTX2_MAGIC = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
/** §2.5: the 13 silk keys of the ratified list (design-gallery-atlas-v2 §2.5). */
const SILK_KEYS = [
  'silk-yurkovsky',
  'silk-karataev',
  'silk-aleksopol',
  'silk-balla',
  'silk-davydov-n',
  'silk-vsevolozhsky',
  'silk-guryev',
  'silk-naniy',
  'silk-potapov',
  'silk-ivanov',
  'silk-zhevakhov',
  'silk-davydov-e',
  'silk-lavrov',
];

type RosterFrame = {
  kind: 'monarch' | 'painted' | 'silk';
  rank: number;
  key: string;
  wall?: string;
  row?: number;
  col?: number;
  slot?: string;
  sitter?: string;
};
type Roster = { law: string; frames: RosterFrame[]; omitted: { key: string }[] };
type Digest = {
  law: number;
  mock: { rgbaSha256: string; pngSha256: string; pngBytes: number } | null;
  composed: { rgbaSha256: string } | null;
  artifact: { sha256: string; bytes: number } | null;
};
type Lock = {
  law: number;
  artifact: { sha256: string; bytes: number; levels: number; qlevel: number } | null;
  entries: Record<string, { license: string; sha256: string }>;
};

const roster = JSON.parse(readFileSync(ROSTER_PATH, 'utf8')) as Roster;
const digest = JSON.parse(readFileSync(DIGEST_PATH, 'utf8')) as Digest;
const lockExists = existsSync(LOCK_PATH);
const lock = lockExists ? (JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as Lock) : null;

const smallFrames = roster.frames.filter((f) => f.kind !== 'monarch');
const silkBySlot = new Map<number, string>(
  roster.frames
    .filter((f): f is RosterFrame & { rank: number } => f.kind === 'silk')
    .map((f) => [smallRankToSlot(f.rank), f.key]),
);

/** The §3.8 mock composition: silk by the roster's keys, everything else the stand-ins. */
const mockProvider = (slot: number) => {
  const silkKey = silkBySlot.get(slot);
  return silkKey === undefined ? mockTiles() : { kind: 'silk' as const, key: silkKey };
};

let atlas: Uint8Array | null = null;
const atlasOnce = () => {
  atlas ??= paintAtlas({ tiles: mockProvider });
  return atlas;
};

describe('atlas law ↔ layout law (§3.1, §5.3 re-pin)', () => {
  it('re-declares the committed layout constants (v2 values)', () => {
    expect([ATLAS_SIZE_PX, ATLAS_COLUMNS, ATLAS_ROWS, SLOT_W_PX, SLOT_H_PX]).toEqual([
      layout.ATLAS_SIZE_PX,
      layout.ATLAS_COLUMNS,
      layout.ATLAS_ROWS,
      layout.SLOT_W_PX,
      layout.SLOT_H_PX,
    ]);
    expect([
      ATLAS_GUTTER_PX,
      ATLAS_INSET_PX,
      SUPER_BLOCK_SLOTS,
      SUPER_BLOCK_COUNT,
      MISSING_SLOT,
    ]).toEqual([
      layout.ATLAS_GUTTER_PX,
      layout.ATLAS_INSET_PX,
      layout.SUPER_BLOCK_SLOTS,
      layout.SUPER_BLOCK_COUNT,
      layout.MISSING_SLOT,
    ]);
    // The §3.1 v2 pins themselves.
    expect([ATLAS_SIZE_PX, SLOT_W_PX, SLOT_H_PX]).toEqual([3072, 144, 180]);
    expect([ATLAS_GUTTER_PX, ATLAS_INSET_PX]).toEqual([3, 4]);
    expect(ATLAS_LAW_VERSION).toBe(2);
    expect(SILK_COUNT).toBe(13);
    expect(SALT_1812).toBe('hermitage-3d/military-gallery-1812/portrait-atlas/v2');
    expect(QLEVEL_LADDER).toEqual([128, 112, 96]);
    expect(MIP_LEVELS).toBe(12);
    expect(ATLAS_BYTES_MAX).toBe(1_900_000);
  });

  it('ranks the roster exactly as slotOfRank and marks spare/missing/block cells', () => {
    const roles = slotRoles();
    const slots = rosterSlots();
    expect(roles).toHaveLength(357);
    expect(slots).toHaveLength(332);
    slots.forEach((slot, rank) => {
      expect(slot).toBe(layout.slotOfRank(rank));
    });
    expect([slots[0], slots[331]]).toEqual([6, 343]);
    expect(roles.slice(344, 356).every((r) => r === 'spare')).toBe(true);
    expect(roles.filter((r) => r === 'spare')).toHaveLength(12);
    expect(roles[356]).toBe('missing');
    for (let b = 0; b < SUPER_BLOCK_COUNT; b += 1) {
      for (const s of layout.superBlockSlots(b)) expect(roles[s]).toBe('block');
    }
  });
});

describe('the rank → cell resolution law (§2.2, hang-law)', () => {
  it('walks the slots exactly as the layout slot law, rank for rank', () => {
    for (let rank = 0; rank <= 331; rank += 1) {
      expect(smallRankToSlot(rank)).toBe(layout.slotOfRank(rank));
    }
    expect(smallRankToSlot(330)).toBe(342); // the §2.4 ruling: Kutuzov
    expect(smallRankToSlot(331)).toBe(343); // and Barclay at the door pair
  });

  it('is a bijection onto the v1 slot set; super-block ranks anchor 0/2/4', () => {
    const seen = new Set<number>();
    for (let rank = 0; rank <= 331; rank += 1) {
      const slot = smallRankToSlot(rank);
      expect(seen.has(slot)).toBe(false);
      seen.add(slot);
    }
    expect(seen).toEqual(new Set(rosterSlots()));
    for (let b = 0; b < 3; b += 1) {
      expect(superBlockRankToSlot(b)).toBe(layout.superBlockSlots(b)[0]);
      expect(superBlockRankToSlot(b)).toBe(b * 2);
    }
  });
});

describe('hash law (DEC-024)', () => {
  it('is salted, repeatable and collision-free over the grid', () => {
    expect(SALT_1812).not.toBe('hermitage-3d/military-gallery-1812/portrait-atlas/v1');
    expect(hash32(SALT_1812, 7)).toBe(hash32(SALT_1812, 7));
    expect(hash32(SALT_1812, 7)).not.toBe(hash32(`${SALT_1812}.`, 7));
    expect(new Set(Array.from({ length: 357 }, (_v, i) => hash32(SALT_1812, i))).size).toBe(357);
  });

  it('maps every cell into the §3.5 domains', () => {
    for (let s = 0; s < 357; s += 1) {
      const p = standInParams(s);
      expect(p.silhouette).toBeLessThan(3);
      expect(p.shoulder).toBeLessThan(3);
      expect(p.uniform).toBeLessThan(6);
      expect(p.facing).toBeLessThan(4);
      expect(p.umber).toBeLessThan(3);
      expect(p.face).toBeLessThan(4);
      expect(Math.abs(p.headOffset)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.umberValue - 1)).toBeLessThanOrEqual(0.08 + 1e-9);
    }
  });
});

describe('composition law (§3.2/§3.4/§3.8, DEC-024)', () => {
  it('reruns byte-identically and matches the committed mock digest pin', () => {
    const a = atlasOnce();
    const rgbaDigest = sha256(a);
    expect(sha256(paintAtlas({ tiles: mockProvider }))).toBe(rgbaDigest);
    expect(digest.law).toBe(ATLAS_LAW_VERSION);
    expect(digest.mock).not.toBeNull();
    expect(rgbaDigest).toBe(digest.mock?.rgbaSha256);
    const png = encodePng(a, ATLAS_SIZE_PX, ATLAS_SIZE_PX);
    expect([sha256(png), png.length]).toEqual([digest.mock?.pngSha256, digest.mock?.pngBytes]);
  }, 300_000);

  it('paints gutters and the never-a-cell strips with GUTTER_RGB (widths from constants)', () => {
    const a = atlasOnce();
    const px = (x: number, y: number) =>
      Array.from(a.subarray((y * ATLAS_SIZE_PX + x) * 4, (y * ATLAS_SIZE_PX + x) * 4 + 3));
    // The gutter is the 3-px border of every painted rect: a cell's outer edge, and the
    // BLOCK's outer edge only — block interiors are one continuous equestrian field. The
    // never-a-cell strips (right 3072 − 21×144, bottom 3072 − 17×180) stay flat gutter.
    const rightStripX = ATLAS_COLUMNS * SLOT_W_PX + 4; // inside the right strip
    const bottomStripY = ATLAS_ROWS * SLOT_H_PX + 4; // inside the bottom strip
    for (const [x, y] of [
      [0, 0],
      [1, SLOT_H_PX + 1],
      [rightStripX, 1000],
      [500, bottomStripY],
    ] as const) {
      expect(px(x, y)).toEqual([...GUTTER_RGB]);
    }
    expect(px(60, 80)).not.toEqual([...GUTTER_RGB]); // block interior, sky/ground
    expect(px(145, 180)).not.toEqual([...GUTTER_RGB]); // block interior, the rider's torso
  }, 300_000);

  it('paints the 13 silk cells with the silk law in the mock mode too (§3.8)', () => {
    const a = atlasOnce();
    const cell = smallRankToSlot(roster.frames.find((f) => f.kind === 'silk')?.rank ?? -1);
    const x = (cell % ATLAS_COLUMNS) * SLOT_W_PX + ATLAS_GUTTER_PX + ATLAS_INSET_PX + 8;
    const y = Math.floor(cell / ATLAS_COLUMNS) * SLOT_H_PX + ATLAS_GUTTER_PX + ATLAS_INSET_PX + 8;
    const [r, g, b] = Array.from(
      a.subarray((y * ATLAS_SIZE_PX + x) * 4, (y * ATLAS_SIZE_PX + x) * 4 + 3),
    );
    // The green-silk palette: both weave tones and the edge are green (g channel highest).
    expect(g).toBeGreaterThan(r as number);
    expect(g).toBeGreaterThan(b as number);
  }, 300_000);

  it('encodes a stored-deflate RGB PNG', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 8, 7, 255]);
    const png = encodePng(rgba, 2, 2);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect([png[24], png[25]]).toEqual([8, 2]);
    const idatLen = new DataView(png.buffer).getUint32(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLen));
    expect(Array.from(raw)).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 9, 8, 7]);
  });
});

describe('the hanging law (§2.3, hang-law applyHang)', () => {
  /**
   * A synthetic 342-frame table in the transcription's real shape — per wall
   * [35, 35, 35, 35, 31]: rows 0–3 shed 2 painted each, the top row is 2 short and takes
   * row 3's drops (the drops travel up), omissions = 6 per wall = 12 total.
   */
  const ROWS: Record<'east' | 'west', number[]> = {
    west: [35, 35, 35, 35, 31],
    east: [35, 35, 35, 35, 31],
  };
  /** Silk rows sit in drop zones (col 34 of rows 0–3) and ordinary cols. */
  const SILK_AT = new Set([
    'west/0/34',
    'west/1/34',
    'west/2/34',
    'west/3/34',
    'west/4/30',
    'west/0/20',
    'west/2/20',
    'east/0/34',
    'east/1/34',
    'east/2/34',
    'east/3/34',
    'east/4/30',
    'east/1/20',
  ]);
  const hangFrame = (wall: 'east' | 'west', row: number, col: number) => {
    const key = SILK_AT.has(`${wall}/${row}/${col}`)
      ? `silk-${wall}-${row}-${col}`
      : `ge-${1000 + row * 40 + col + (wall === 'west' ? 0 : 500)}`;
    return {
      col,
      key,
      row,
      silk: key.startsWith('silk-'),
      sitter: `S/${wall}/${row}/${col}`,
      wall,
    };
  };
  const fixture = () => {
    const frames: {
      col: number;
      key: string;
      row: number;
      silk: boolean;
      sitter: string;
      wall: 'east' | 'west';
    }[] = [];
    for (const wall of ['west', 'east'] as const) {
      ROWS[wall].forEach((count, row) => {
        for (let col = 0; col < count; col += 1) frames.push(hangFrame(wall, row, col));
      });
    }
    return { frames };
  };
  const hang = () => applyHang(fixture(), { w: 33, rowsPerWall: 5, walls: ['west', 'east'] });

  it('yields 330 kept frames (33 per wall-row), 13 silk kept and exactly 12 drops', () => {
    const { frames, omitted } = hang();
    expect(frames).toHaveLength(330);
    expect(omitted).toHaveLength(12);
    expect(frames.filter((f) => f.kind === 'silk')).toHaveLength(13);
    expect(omitted.some((f) => f.key.startsWith('silk-'))).toBe(false); // silk never dropped
    for (const wall of ['west', 'east'] as const) {
      for (let row = 0; row < 5; row += 1) {
        const rowFrames = frames.filter((f) => f.wall === wall && f.row === row);
        expect(rowFrames).toHaveLength(33);
        expect(rowFrames.every((f, i) => f.col === i)).toBe(true); // packed north → south
      }
    }
  });

  it('exercises the overflow rule: silk in the drop zone survives, painted neighbours drop', () => {
    const { frames, omitted } = hang();
    const keptKeys = new Set(frames.map((f) => f.key));
    const omittedKeys = new Set(omitted.map((f) => f.key));
    // Rows 0–3 (35 real) drop their two southmost PAINTED frames; a silk at col 34 is
    // skipped over, so the drops fall on cols 33 and 32 and the silk keeps kept-order
    // index 32. The row-3 silks' row-mates travel up to row 4 — the silks themselves stay.
    for (const zone of ['west/3/34', 'east/3/34']) {
      const [wall, row, col] = zone.split('/');
      const frame = hangFrame(wall as 'east' | 'west', Number(row), Number(col));
      expect(keptKeys.has(frame.key), frame.key).toBe(true);
      expect(omittedKeys.has(frame.key), frame.key).toBe(false);
      const kept = frames.find((f) => f.key === frame.key);
      expect(kept?.col, frame.key).toBe(32); // silk is never dropped, only re-indexed
    }
    for (const f of omitted) {
      expect(f.key.startsWith('ge-')).toBe(true);
      expect(typeof f.realCol).toBe('number');
    }
    // This fixture's omissions: rows 0–2 shed 2 painted each per wall (row 3's two drops
    // travel up into row 4; row 4 is short and consumes them).
    const byWallRow = new Map<string, number>();
    for (const f of omitted) {
      const k = `${f.realWall}/${f.realRow}`;
      byWallRow.set(k, (byWallRow.get(k) ?? 0) + 1);
    }
    expect([...byWallRow.entries()].sort()).toEqual([
      ['east/0', 2],
      ['east/1', 2],
      ['east/2', 2],
      ['west/0', 2],
      ['west/1', 2],
      ['west/2', 2],
    ]);
  });

  it('fills a short top row from the row below, southmost first, packing southward', () => {
    const { frames } = hang();
    // Row 4 hangs 31 real frames; world cols 31 and 32 come from row 3's southmost drops —
    // real cols 33 then 32 (col 34 is silk, skipped by the scan).
    const filled = frames.filter((f) => f.wall === 'west' && f.row === 4 && f.col >= 31);
    expect(filled.map((f) => f.col)).toEqual([31, 32]);
    expect(filled.map((f) => f.key)).toEqual([
      hangFrame('west', 3, 33).key,
      hangFrame('west', 3, 32).key,
    ]);
  });
});

describe('roster laws (§2.1/§2.2/§2.5, §5.3)', () => {
  it('carries 335 frames: 3 monarchs, 319 painted small, 13 silk', () => {
    expect(roster.frames).toHaveLength(335);
    expect(roster.frames.filter((f) => f.kind === 'monarch')).toHaveLength(3);
    expect(smallFrames.filter((f) => f.kind === 'painted')).toHaveLength(319);
    expect(roster.frames.filter((f) => f.kind === 'silk')).toHaveLength(SILK_COUNT);
  });

  it('places the three monarchs on portal/westAlly/eastAlly (super-block ranks 0/1/2)', () => {
    const monarchs = roster.frames
      .filter((f) => f.kind === 'monarch')
      .sort((a, b) => a.rank - b.rank);
    expect(monarchs.map((m) => m.slot)).toEqual(['portal', 'westAlly', 'eastAlly']);
    expect(monarchs.map((m) => m.rank)).toEqual([0, 1, 2]);
  });

  it('is keyed uniquely; small ranks bijective onto the v1 slot set; the 13 silk keys named', () => {
    const keys = roster.frames.map((f) => f.key);
    expect(new Set(keys).size).toBe(335);
    for (const key of keys) {
      expect(key.startsWith('silk-') || /^ge-\d+$/.test(key)).toBe(true);
    }
    expect([...silkBySlot.values()].sort()).toEqual([...SILK_KEYS].sort());
    const ranks = smallFrames.map((f) => f.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 332 }, (_v, i) => i));
    expect(new Set(smallFrames.map((f) => smallRankToSlot(f.rank))).size).toBe(332);
  });

  it('lists exactly 12 omitted sitters, disjoint from the frames', () => {
    expect(roster.omitted).toHaveLength(12);
    const frameKeys = new Set(roster.frames.map((f) => f.key));
    for (const o of roster.omitted) {
      expect(frameKeys.has(o.key)).toBe(false);
      expect(o.key.startsWith('ge-')).toBe(true);
    }
  });

  it('is canonical-serialised (sorted keys, 2-space, trailing newline)', () => {
    expect(canonicalJson(roster)).toBe(readFileSync(ROSTER_PATH, 'utf8'));
  });
});

describe('lock ↔ roster (§4.1/§5.3; skipped until the real lock exists)', () => {
  it.skipIf(!lockExists)('cross-checks every painted key against the allowlist', () => {
    const entries = lock?.entries ?? {};
    const paintedKeys = roster.frames.filter((f) => f.kind !== 'silk').map((f) => f.key);
    expect(Object.keys(entries).sort()).toEqual([...paintedKeys].sort());
    for (const [key, entry] of Object.entries(entries)) {
      expect(isFamilyLicense(entry.license.toLowerCase()), `${key}: ${entry.license}`).toBe(true);
    }
  });

  it.skipIf(!lockExists)('is canonical-serialised', () => {
    expect(canonicalJson(lock)).toBe(readFileSync(LOCK_PATH, 'utf8'));
  });

  it.skipIf(!lockExists)('pins the artifact at 3072², 12 levels, a ladder qlevel', () => {
    const artifact = lock?.artifact;
    expect(artifact).not.toBeNull();
    expect(artifact?.levels).toBe(MIP_LEVELS);
    expect(QLEVEL_LADDER.includes(artifact?.qlevel ?? Number.NaN)).toBe(true);
    expect(sha256(readFileSync(resolve(ROOM_PATH, ATLAS_REL)))).toBe(artifact?.sha256);
  });
});

describe('ATTRIBUTIONS block (§6.5; skipped until the real lock exists)', () => {
  it.skipIf(!lockExists)('equals the generator output, one line per lock entry', () => {
    const text = readFileSync(ATTRIBUTIONS_PATH, 'utf8');
    const begin = text.indexOf('<!-- gallery-atlas:begin -->');
    const end = text.indexOf('<!-- gallery-atlas:end -->');
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(begin);
    const block = text
      .slice(begin + '<!-- gallery-atlas:begin -->'.length, end)
      .replace(/^\n/, '')
      .replace(/\n$/, '');
    expect(block).toBe(attribBlock(lock, roster));
    // §6.5 wraps long attribution lines with a two-space continuation, so the physical line
    // count exceeds the entry count; unwrap FIRST, then the count is header + one per entry.
    expect(block.split('\n').filter((l) => !l.startsWith('  ')).length).toBe(
      Object.keys(lock?.entries ?? {}).length + 1,
    ); // + header
  });
});

describe('purity fence (DEC-024, §5.3 extended to the three pure modules)', () => {
  function stripCommentsAndStrings(text: string): string {
    const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const noLine = noBlock.replace(/\/\/[^\n]*/g, ' ');
    const noTemplate = noLine.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "''");
    const noDouble = noTemplate.replace(/"(?:\\[\s\S]|[^\\"])*"/g, "''");
    return noDouble.replace(/'(?:\\[\s\S]|[^\\'])*'/g, "''");
  }

  for (const path of LAW_PATHS) {
    describe(path.split('/').pop() ?? path, () => {
      const source = readFileSync(path, 'utf8');
      const scanned = stripCommentsAndStrings(source);

      it('imports nothing at all', () => {
        expect(source).not.toMatch(/^import\s/m);
        expect(scanned).not.toMatch(/from\s+'/);
      });

      it('uses no randomness, no engine-variant math, no process, no console, no require', () => {
        const banned = [
          'Math.random',
          'Math.sin(',
          'Math.cos(',
          'Math.tan(',
          'Math.exp(',
          'Math.pow(',
          'Math.log(',
          '**',
          'process.',
          'console.',
          'require(',
          'Date',
        ];
        for (const token of banned) {
          expect(scanned.includes(token), token).toBe(false);
        }
      });
    });
  }
});

describe('committed artifact (§3.7, §5.3)', () => {
  const manifest = JSON.parse(readFileSync(resolve(ROOM_PATH, 'manifest.json'), 'utf8')) as {
    files: { path: string; bytes: number; kind: string }[];
    budget: { textureBytesMax: number };
  };

  it('lists the atlas as a ktx2 row within the fence, bytes matching disk', () => {
    const row = manifest.files.find((f) => f.path === ATLAS_REL);
    expect(row?.kind).toBe('ktx2');
    expect(row?.bytes).toBeLessThanOrEqual(ATLAS_BYTES_MAX);
    expect(statSync(resolve(ROOM_PATH, ATLAS_REL)).size).toBe(row?.bytes);
  });

  it('is a KTX 2.0 container with the 3072² 12-level header (DataView parse)', () => {
    const buf = readFileSync(resolve(ROOM_PATH, ATLAS_REL));
    expect(Array.from(buf.subarray(0, 12))).toEqual(KTX2_MAGIC);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    expect(view.getUint32(20, true)).toBe(ATLAS_SIZE_PX); // pixelWidth
    expect(view.getUint32(24, true)).toBe(ATLAS_SIZE_PX); // pixelHeight
    expect(view.getUint32(40, true)).toBe(MIP_LEVELS); // levelCount
    expect(view.getUint32(44, true)).toBe(1); // supercompressionScheme
  });

  it('pins the artifact digest in atlas.digest.json (the lock cross-check rides the lock)', () => {
    const sha = sha256(readFileSync(resolve(ROOM_PATH, ATLAS_REL)));
    expect(digest.artifact).not.toBeNull();
    expect(sha).toBe(digest.artifact?.sha256);
    expect(statSync(resolve(ROOM_PATH, ATLAS_REL)).size).toBe(digest.artifact?.bytes);
    if (lockExists) expect(sha).toBe(lock?.artifact?.sha256);
  });

  it('carries the raised room budget (third figure, atlas v2, owner ruling 2026-11-01)', () => {
    expect(manifest.budget.textureBytesMax).toBe(2_650_000);
  });
});

describe('register + runtime fences (§5.3, §6.1–6.4)', () => {
  const register = readFileSync(REGISTER_PATH, 'utf8');

  it('closes the v1 atlas row and opens the three v2 rows', () => {
    const lines = register.split('\n');
    const v1 = lines.find((l) => l.startsWith('- **Portrait atlas'));
    for (const word of ['stand-in', 'DEC-030', '332', 'v2', 'public-domain']) {
      expect(v1).toContain(word);
    }
    for (const header of [
      '- **Portrait atlas hanging order (atlas-v2-hanging-order):',
      '- **Portrait atlas license (atlas-v2-license):',
      '- **Charter distinction, painted likenesses (atlas-v2-charter-distinction):',
    ]) {
      expect(
        lines.some((l) => l.startsWith(header)),
        header,
      ).toBe(true);
    }
  });

  it('sets anisotropy on the atlas texture exactly once (§5.1)', () => {
    const source = readFileSync(ROOM_TS_PATH, 'utf8');
    const assignments = source.match(/\.anisotropy\s*=/g) ?? [];
    expect(assignments).toHaveLength(1);
    expect(
      source.match(
        /\.anisotropy\s*=\s*Math\.min\(\s*8,\s*\n?\s*\(ctx\.renderer as WebGLRenderer\)/s,
      ),
    ).not.toBeNull();
    expect(source).toContain('getMaxAnisotropy()');
  });
});
