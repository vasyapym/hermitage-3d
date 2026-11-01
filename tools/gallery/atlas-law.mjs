/*
 * Military Gallery portrait atlas — generator law v2 (pure).
 * Implements docs/design-gallery-atlas-v2.md §3 (constants, per-cell content law, silk tile
 * law, tone policy pointer, mock-first gate) atop the v1 structure it carries forward
 * (design-gallery.md §3.4/§3.5; DEC-016 toolchain pins, DEC-024 pure JS, DEC-030 register
 * row). Consumed by tools/gallery/import.mjs (the only producer of the committed ktx2) and
 * tests/gallery-atlas.test.ts.
 *
 * State laws:
 * - KEYING (carried from v1 unchanged): the hash key `i` is the ATLAS CELL INDEX (row-major,
 *   0 = top-left), not the roster rank. Cells without a rank (monarch blocks, spare cells,
 *   the missing slot) need a key too; one keying serves all. The roster's rank → cell step
 *   is the slot law below; no cell index is ever stored in roster.json or atlas.lock.json.
 * - TILES (§3.8 mock-first gate): paintAtlas({ tiles }) takes a tile provider —
 *   tiles(slot, rect) → { kind: 'image', rgba } | { kind: 'silk', key } | { kind: 'mock' }
 *   | null for the CELL rect (w × h px, gutter included). The default provider is mockTiles:
 *   v1-style procedural stand-ins via the hash law, the CI-pinned mode. The real composer
 *   supplies image tiles from the lock + cache; silk and the neutral spare/missing paint are
 *   identical in both modes, so the mock run exercises the whole law except the source pixels.
 * - BAND LAW (§3.2, one law for every tile kind): the content region (cell inset by
 *   SLOT_INSET_PX = gutter + inset on every side) carries the tile's pixels; the inset band
 *   (4 px) is edge replication of the nearest content pixel (mips pull content, not gutter);
 *   the gutter band (3 px) stays flat GUTTER_RGB, as in v1, widened. The never-a-cell strips
 *   (right 48 px, bottom 12 px at 3072²) are flat GUTTER.
 * - SILK (§3.4): 13 cells paint the procedural green-silk tile — the A/B weave is the 50/50
 *   blend base, a horizontal sheen ramp darkens linearly to −10/255 at the content's edges,
 *   hash noise ±3/255 is seeded with SALT_1812 + key, and a 2-px SILK_EDGE border runs
 *   inside the content rect. Identical for all 13 tiles except the noise seed.
 * - DETERMINISM (DEC-024): integer hashing (FNV-1a over the salt, murmur3 fmix32 avalanche),
 *   IEEE basic ops, Math.floor/Math.ceil/Math.min/Math.abs/Math.imul only. Math.sin/cos/
 *   tan/exp/pow/log and the exponent operator are forbidden: not bit-specified across
 *   engines, they would break the gate. The random source is never called.
 * - COLOUR: procedural values are authored as 8-bit sRGB and multiplied in encoded space
 *   (painterly, not radiometric — v1's law, kept for the stand-ins and silk). The
 *   photographic path (decode → crop → box-filter → tone) is linear-light integer law in
 *   tools/gallery/resample.mjs (§3.2/§3.5); toktx tags the texture --assign_oetf srgb.
 * - OUTPUT: paintAtlas writes RGBA (alpha 255); encodePng emits colour type 2 (RGB) so ETC1S
 *   encodes one slice, with a stored-only deflate stream written here, so PNG bytes depend
 *   on no zlib version.
 */
export const ATLAS_LAW_VERSION = 2;
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
export const SLOT_COUNT = ATLAS_COLUMNS * ATLAS_ROWS;
export const ROSTER_COUNT = 332;
/** §3.1: the full chain 3072 → 1; toktx --genmipmap writes the same 12 levels. */
export const MIP_LEVELS = 12;
/** §3.7: the declared encode ladder — step down while the measured KTX2 breaches the cap. */
export const QLEVEL_LADDER = [128, 112, 96];
/** §3.7: the atlas KTX2's ceiling fence (the test imports this — one declaration). */
export const ATLAS_BYTES_MAX = 1_900_000;
/** §3.4: 13 silk frames survive the hanging rule unconditionally (owner decision #4). */
export const SILK_COUNT = 13;
export const SALT_1812 = 'hermitage-3d/military-gallery-1812/portrait-atlas/v2';
/** §3.4: canvas aspect 0.814 against the block's 0.80 — displayed u is stretched ×1.0175. */
export const MONARCH_X_SCALE = 0.8 / 0.814;
/** §6.3 posture A: the Commons license-template FAMILY a source may carry (a missing template
 * rejects). Entries are lowercase family STEMS — Commons spells the family as a series
 * ({{PD-Art}}, {{PD-Art-old-100-expired}}, {{PD-old-70}}, {{PD-old-100}}, {{CC-PD-Mark}}, …);
 * a template name matches when it equals a stem or continues it with '-'. The lock records the
 * full template name found. */
export const LICENSE_STEMS = ['pd-art', 'pd-old', 'cc-pd-mark'];
/** The family law over a lowercased template name (import.mjs and the lock tests share it). */
export function isFamilyLicense(name) {
  return LICENSE_STEMS.some((stem) => name === stem || name.startsWith(`${stem}-`));
}
export const GUTTER_RGB = [14, 11, 9];
/** §3.4 silk palette (three tokens added to the atlas palette). */
export const SILK_A = [46, 74, 54]; // #2e4a36
export const SILK_B = [59, 92, 68]; // #3b5c44
export const SILK_EDGE = [31, 51, 38]; // #1f3326
export const SILK_SHEEN_STEPS = 10; // brightness −0…−10/255 from the centre line to the edges
export const SILK_NOISE = 3; // hash noise ±3/255
export const SILK_BORDER_PX = 2; // the SILK_EDGE border inside the content rect
export const PALETTE_UNIFORM = [
  { name: 'infantry green', rgb: [46, 68, 50], facing: null },
  { name: 'guards dark green', rgb: [34, 52, 40], facing: null },
  { name: 'cuirassier white', rgb: [214, 206, 190], facing: null },
  { name: 'hussar dark blue', rgb: [36, 44, 84], facing: null },
  { name: 'artillery black', rgb: [28, 28, 30], facing: null },
  { name: 'general dark green with red', rgb: [34, 56, 42], facing: [150, 30, 34] },
];
export const PALETTE_FACING = [
  [160, 32, 36],
  [220, 214, 200],
  [24, 24, 26],
  [190, 150, 60],
];
export const PALETTE_FACE = [
  [222, 184, 150],
  [206, 164, 128],
  [190, 146, 112],
  [236, 200, 170],
];
export const PALETTE_UMBER = [
  [58, 44, 32],
  [50, 40, 34],
  [44, 36, 30],
];
export const HAIR_RGB = [52, 38, 28];
export const EPAULETTE_RGB = [176, 140, 64];
export const SHOULDER_WIDTHS = [0.56, 0.64, 0.72];
export const MONARCH_FIELD = {
  skyTop: [112, 124, 140],
  skyHorizon: [168, 158, 140],
  ground: [66, 56, 40],
  horse: [
    [38, 30, 26],
    [70, 42, 30],
    [120, 116, 110],
  ],
  hat: [26, 24, 24],
  horizon: 0.56,
};
export const NOISE_OCTAVES = [
  { period: 12, amp: 0.07 },
  { period: 5, amp: 0.035 },
];
export const VIGNETTE = 0.38;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const TWO_POW_32 = 0x100000000;
export const SLOT_INSET_PX = ATLAS_GUTTER_PX + ATLAS_INSET_PX;

function fmix32(x) {
  let h = x >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * FNV-1a over the salt's UTF-16 code units (the DEC-019 night-facade precedent), then each
 * integer's four little-endian bytes, then a murmur3 avalanche so neighbouring slot indices
 * share no bit field.
 */
export function hash32(salt, ...ints) {
  let h = FNV_OFFSET;
  for (let k = 0; k < salt.length; k += 1) {
    h = Math.imul(h ^ salt.charCodeAt(k), FNV_PRIME) >>> 0;
  }
  for (const n of ints) {
    let v = n >>> 0;
    for (let b = 0; b < 4; b += 1) {
      h = Math.imul(h ^ (v & 0xff), FNV_PRIME) >>> 0;
      v >>>= 8;
    }
  }
  return fmix32(h);
}

export function bits(h, shift, count) {
  return (h >>> shift) & ((1 << count) - 1);
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

export function reservedSlotSet() {
  const reserved = new Set([MISSING_SLOT]);
  for (let block = 0; block < SUPER_BLOCK_COUNT; block += 1) {
    for (const slot of superBlockSlots(block)) reserved.add(slot);
  }
  return reserved;
}

/** §3.4 allocation, one role per cell: the first ROSTER_COUNT free cells are 'roster'. */
export function slotRoles() {
  const reserved = reservedSlotSet();
  const roles = [];
  let rank = 0;
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    if (slot === MISSING_SLOT) {
      roles.push('missing');
    } else if (reserved.has(slot)) {
      roles.push('block');
    } else {
      roles.push(rank < ROSTER_COUNT ? 'roster' : 'spare');
      rank += 1;
    }
  }
  return roles;
}

export function rosterSlots() {
  return slotRoles().flatMap((role, slot) => (role === 'roster' ? [slot] : []));
}

/** §3.5 bit fields. `h` carries the categorical fields, the second hash `t` the tone fields. */
export function standInParams(slot) {
  const h = hash32(SALT_1812, slot);
  const t = hash32(SALT_1812, slot, 1);
  return {
    silhouette: bits(h, 0, 8) % 3, // 0 frontal, 1 three-quarter-left, 2 three-quarter-right
    shoulder: bits(h, 8, 8) % 3,
    uniform: bits(h, 16, 8) % 6,
    facing: bits(h, 24, 2),
    epaulettes: bits(h, 26, 1) === 1,
    umber: bits(h, 27, 5) % 3,
    face: bits(h, 30, 2),
    umberValue: 1 + (bits(t, 0, 8) / 255 - 0.5) * 0.16, // ±8 % value
    headOffset: (bits(t, 8, 8) % 7) - 3, // ±3 px
  };
}

function lattice(slot, octave, w, h) {
  const period = NOISE_OCTAVES[octave].period;
  const nx = Math.floor(w / period) + 2;
  const ny = Math.floor(h / period) + 2;
  const nodes = new Float64Array(nx * ny);
  for (let i = 0; i < nodes.length; i += 1) {
    nodes[i] = hash32(SALT_1812, slot, 2 + octave, i) / TWO_POW_32;
  }
  return { nodes, nx, period };
}

function smooth(f) {
  return f * f * (3 - 2 * f);
}

function sample(l, x, y) {
  const gx = x / l.period;
  const gy = y / l.period;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const i = y0 * l.nx + x0;
  const top = l.nodes[i] + (l.nodes[i + 1] - l.nodes[i]) * fx;
  const bot = l.nodes[i + l.nx] + (l.nodes[i + l.nx + 1] - l.nodes[i + l.nx]) * fx;
  return top + (bot - top) * fy;
}

/** Brush texture: two octaves of value noise as a value multiplier around 1. */
function brush(lattices, x, y) {
  let m = 1;
  for (let o = 0; o < lattices.length; o += 1) {
    m += (sample(lattices[o], x, y) - 0.5) * 2 * NOISE_OCTAVES[o].amp;
  }
  return m;
}

function cellRect(slot, edge) {
  return {
    x: (slot % ATLAS_COLUMNS) * SLOT_W_PX,
    y: Math.floor(slot / ATLAS_COLUMNS) * SLOT_H_PX,
    w: edge * SLOT_W_PX,
    h: edge * SLOT_H_PX,
  };
}

function clamp8(v) {
  const r = Math.floor(v + 0.5);
  return r < 0 ? 0 : r > 255 ? 255 : r;
}

function inEllipse(dx, dy, rx, ry) {
  const a = dx / rx;
  const b = dy / ry;
  return a * a + b * b <= 1;
}

function lerp(p, q, f) {
  return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
}

/**
 * §3.4 silk tile law — integer ops only. `seed` is the roster key (real compose) or any
 * distinct string (mock); the weave reads `((x + y) & 1) ? A : B` (the 50/50 blend of the
 * two tones), the sheen ramp darkens linearly by SILK_SHEEN_STEPS/255 from the content's
 * vertical centre line to its edges (distance doubled to stay integral), hash noise walks
 * ±SILK_NOISE/255, and the SILK_EDGE border overrides the outer SILK_BORDER_PX.
 */
export function silkShade(key) {
  const seed = `${SALT_1812}/${key}`;
  return (x, y, vw, vh) => {
    if (
      x < SILK_BORDER_PX ||
      y < SILK_BORDER_PX ||
      x >= vw - SILK_BORDER_PX ||
      y >= vh - SILK_BORDER_PX
    ) {
      return [SILK_EDGE, 1];
    }
    const weave = (x + y) & 1 ? SILK_A : SILK_B;
    const dist2 = Math.abs(2 * x - (vw - 1)); // twice the distance to the centre line
    const sheen = Math.floor((SILK_SHEEN_STEPS * dist2) / (vw - 1)); // 0…SILK_SHEEN_STEPS
    const noise = (hash32(seed, x, y) % (2 * SILK_NOISE + 1)) - SILK_NOISE;
    return [
      [
        clamp8((weave[0] * (255 - sheen)) / 255 + noise),
        clamp8((weave[1] * (255 - sheen)) / 255 + noise),
        clamp8((weave[2] * (255 - sheen)) / 255 + noise),
      ],
      1,
    ];
  };
}

/**
 * shade(vx, vy, vw, vh) → [rgb, mul] in content coordinates (origin = cell + SLOT_INSET_PX);
 * `mul` folds the pre-scramble tone fields (umber value, sky tone).
 */
function paintCell(data, slot, rect, shade) {
  const vw = rect.w - 2 * SLOT_INSET_PX;
  const vh = rect.h - 2 * SLOT_INSET_PX;
  const lattices = NOISE_OCTAVES.map((_v, o) => lattice(slot, o, rect.w, rect.h));
  paintTiled(data, rect, (cx, cy) => {
    const [c, m] = shade(cx, cy, vw, vh);
    const nx = (cx - (vw - 1) / 2) / (vw / 2);
    const ny = (cy - (vh - 1) / 2) / (vh / 2);
    const q = Math.min(1, (nx * nx + ny * ny) / 2);
    return [
      c,
      m * (1 - VIGNETTE * q * q) * brush(lattices, cx + SLOT_INSET_PX, cy + SLOT_INSET_PX),
    ];
  });
}

/**
 * The band law (§3.2), shared by every tile kind: `contentAt(cx, cy, vw, vh)` returns the
 * [rgb, mul] of a content pixel; the content region is painted from it, the inset band is
 * edge-replicated (clamped sample), the gutter band stays flat GUTTER_RGB.
 */
function paintTiled(data, rect, contentAt) {
  const vw = rect.w - 2 * SLOT_INSET_PX;
  const vh = rect.h - 2 * SLOT_INSET_PX;
  for (let ly = 0; ly < rect.h; ly += 1) {
    for (let lx = 0; lx < rect.w; lx += 1) {
      const o = ((rect.y + ly) * ATLAS_SIZE_PX + rect.x + lx) * 4;
      if (
        lx < ATLAS_GUTTER_PX ||
        ly < ATLAS_GUTTER_PX ||
        lx >= rect.w - ATLAS_GUTTER_PX ||
        ly >= rect.h - ATLAS_GUTTER_PX
      ) {
        data[o] = GUTTER_RGB[0];
        data[o + 1] = GUTTER_RGB[1];
        data[o + 2] = GUTTER_RGB[2];
      } else {
        const cx = Math.min(Math.max(lx - SLOT_INSET_PX, 0), vw - 1);
        const cy = Math.min(Math.max(ly - SLOT_INSET_PX, 0), vh - 1);
        const [c, m] = contentAt(cx, cy, vw, vh);
        data[o] = clamp8(c[0] * m);
        data[o + 1] = clamp8(c[1] * m);
        data[o + 2] = clamp8(c[2] * m);
      }
      data[o + 3] = 255;
    }
  }
}

/** Blit an image tile's content rect and apply the band law (the real compose path). */
function paintImage(data, rect, rgba) {
  const vw = rect.w - 2 * SLOT_INSET_PX;
  const vh = rect.h - 2 * SLOT_INSET_PX;
  if (rgba.length !== vw * vh * 4) {
    throw new Error(
      `atlas-law: tile for cell ${rect.x / SLOT_W_PX + (rect.y / SLOT_H_PX) * ATLAS_COLUMNS} needs ${vw}×${vh} RGBA, got ${rgba.length / 4}px`,
    );
  }
  paintTiled(data, rect, (cx, cy) => {
    const s = (cy * vw + cx) * 4;
    return [[rgba[s], rgba[s + 1], rgba[s + 2]], 1];
  });
}

function neutralShade(p) {
  const ground = PALETTE_UMBER[p.umber];
  return () => [ground, p.umberValue];
}

function standardShade(p) {
  const uniform = PALETTE_UNIFORM[p.uniform];
  const facing = uniform.facing ?? PALETTE_FACING[p.facing];
  const ground = PALETTE_UMBER[p.umber];
  const face = PALETTE_FACE[p.face];
  const lean = p.silhouette === 0 ? 0 : p.silhouette === 1 ? -1 : 1;
  const half = SHOULDER_WIDTHS[p.shoulder] / 2;
  return (vx, vy, vw, vh) => {
    const px = vx + 0.5;
    const py = vy + 0.5;
    const headX = vw / 2 + lean * 0.06 * vw + p.headOffset;
    const headY = 0.34 * vh;
    const headRx = 0.13 * vw;
    const headRy = 0.15 * vh;
    const torsoTop = 0.52 * vh;
    if (inEllipse(px - headX, py - headY, headRx, headRy)) {
      const s = (px - headX) / headRx;
      return py < headY - 0.3 * headRy ? [HAIR_RGB, 1] : [face, 1 - 0.2 * s * s];
    }
    if (py > headY && py < torsoTop && Math.abs(px - headX) < 0.05 * vw) return [face, 0.85];
    if (py >= torsoTop) {
      const hw = half * vw * Math.min(1, (py - torsoTop + 4) / 16);
      const tx = px - (vw / 2 + lean * 0.03 * vw);
      const ax = Math.abs(tx);
      if (ax <= hw) {
        if (p.epaulettes && inEllipse(ax - half * vw * 0.82, py - (torsoTop + 9), 5, 3.5)) {
          return [EPAULETTE_RGB, 1];
        }
        if (py < torsoTop + 8 && ax < 0.17 * vw) return [facing, 1];
        const s = ax / (half * vw);
        return [uniform.rgb, 1 - 0.3 * s * s];
      }
    }
    return [ground, p.umberValue];
  };
}

/**
 * §3.5 monarch field: one fixed equestrian composition, hashed tone only (sky value, horse
 * tone, face tone), keyed by the block's first cell. rx are compressed by MONARCH_X_SCALE so
 * the displayed 0.814 canvas shows round masses.
 */
function monarchShade(slot) {
  const h = hash32(SALT_1812, slot);
  const tone = 1 + (bits(h, 0, 8) / 255 - 0.5) * 0.16;
  const horse = MONARCH_FIELD.horse[bits(h, 8, 8) % 3];
  const face = PALETTE_FACE[bits(h, 16, 2)];
  const general = PALETTE_UNIFORM[5];
  const xs = MONARCH_X_SCALE;
  return (vx, vy, vw, vh) => {
    const px = vx + 0.5;
    const py = vy + 0.5;
    const cx = vw / 2;
    const rx = cx - 0.03 * vw;
    if (inEllipse(px - rx, py - 0.3 * vh, 0.035 * vw * xs, 0.045 * vh)) {
      return [py < 0.285 * vh ? MONARCH_FIELD.hat : face, 1];
    }
    if (inEllipse(px - rx, py - 0.45 * vh, 0.075 * vw * xs, 0.12 * vh)) {
      return Math.abs(px - rx) < 0.012 * vw ? [general.facing, 1] : [general.rgb, 1];
    }
    if (inEllipse(px - cx, py - 0.7 * vh, 0.3 * vw * xs, 0.16 * vh)) return [horse, 1];
    if (inEllipse(px - (cx + 0.27 * vw * xs), py - 0.52 * vh, 0.075 * vw * xs, 0.16 * vh)) {
      return [horse, 1];
    }
    if (inEllipse(px - (cx + 0.36 * vw * xs), py - 0.4 * vh, 0.05 * vw * xs, 0.07 * vh)) {
      return [horse, 1];
    }
    const leg = Math.abs(Math.abs(px - cx) - 0.18 * vw * xs) < 0.03 * vw;
    if (leg && py > 0.8 * vh && py < 0.97 * vh) return [horse, 0.9];
    const hz = MONARCH_FIELD.horizon * vh;
    if (py < hz) return [lerp(MONARCH_FIELD.skyTop, MONARCH_FIELD.skyHorizon, py / hz), tone];
    return [MONARCH_FIELD.ground, tone];
  };
}

/**
 * The default tile provider (§3.8): the v1-style procedural stand-in for every cell. Silk
 * cells are NOT special here — the caller (the CI mock or the composer) overrides them with
 * { kind: 'silk', key } so the mock atlas carries the roster's 13 silk tiles.
 */
export function mockTiles() {
  return { kind: 'mock' };
}

/**
 * The whole 3072² RGBA atlas: monarch blocks, roster cells, silk cells, neutral spare and
 * missing cells; every painted rect carries the band law. `tiles` defaults to mockTiles —
 * the CI mode; the real compose passes image tiles from the lock + cache.
 */
export function paintAtlas({ tiles = mockTiles } = {}) {
  const data = new Uint8Array(ATLAS_SIZE_PX * ATLAS_SIZE_PX * 4);
  for (let o = 0; o < data.length; o += 4) {
    data[o] = GUTTER_RGB[0];
    data[o + 1] = GUTTER_RGB[1];
    data[o + 2] = GUTTER_RGB[2];
    data[o + 3] = 255;
  }
  const roles = slotRoles();
  const blockFirst = new Map();
  for (let block = 0; block < SUPER_BLOCK_COUNT; block += 1) {
    const slots = superBlockSlots(block);
    for (const s of slots) blockFirst.set(s, slots[0]);
  }
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const first = blockFirst.get(slot);
    if (first !== undefined && first !== slot) continue; // block interiors ride the first cell
    const edge = first !== undefined ? SUPER_BLOCK_SLOTS : 1;
    const rect = cellRect(slot, edge);
    const tile = tiles(slot, rect);
    if (tile === null || tile === undefined) {
      // The neutral law (v1, unchanged): hashed umber ground, vignette, brush noise, no figure.
      paintCell(data, slot, rect, neutralShade(standInParams(slot)));
      continue;
    }
    if (tile.kind === 'image') {
      paintImage(data, rect, tile.rgba);
      continue;
    }
    if (tile.kind === 'silk') {
      // §3.4: the silk tile law is complete in itself — no vignette, no brush noise, no
      // tone; it paints straight through the band law (mul 1).
      paintTiled(data, rect, silkShade(tile.key));
      continue;
    }
    // kind 'mock': the v1-style stand-in for this cell.
    if (first !== undefined) {
      paintCell(data, first, cellRect(first, SUPER_BLOCK_SLOTS), monarchShade(first));
    } else {
      const p = standInParams(slot);
      paintCell(data, slot, rect, roles[slot] === 'roster' ? standardShade(p) : neutralShade(p));
    }
  }
  return data;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = new Uint32Array(256).map((_v, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c >>> 0) ^ 0xffffffff;
}

function chunk(type, body) {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let k = 0; k < 4; k += 1) out[4 + k] = type.charCodeAt(k);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/** zlib stream of stored deflate blocks (≤ 65535 B each): deterministic without any zlib. */
function zlibStored(raw) {
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let o = 2;
  for (let i = 0; i < blocks; i += 1) {
    const start = i * 65535;
    const len = Math.min(65535, raw.length - start);
    out[o] = i === blocks - 1 ? 1 : 0;
    out[o + 1] = len & 0xff;
    out[o + 2] = len >>> 8;
    out[o + 3] = ~len & 0xff;
    out[o + 4] = (~len >>> 8) & 0xff;
    out.set(raw.subarray(start, start + len), o + 5);
    o += 5 + len;
  }
  let a = 1;
  let b = 0;
  for (let i = 0; i < raw.length; i += 1) {
    a = (a + raw[i]) % 65521;
    b = (b + a) % 65521;
  }
  new DataView(out.buffer).setUint32(o, ((b << 16) | a) >>> 0);
  return out;
}

/** RGB PNG (colour type 2, filter 0 on every scanline, stored deflate); alpha is dropped. */
export function encodePng(rgba, width, height) {
  const stride = width * 3 + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 4;
      const d = y * stride + 1 + x * 3;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const parts = [
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
