// tools/bpy/neva-art-gen.mjs - the "Neva backcloth" plate authoring chain, step 1.
// Parses the window-wall constants out of tools/bpy/jordan.py (single truth), writes
// tools/jordan-windows.json (the shared bay table), then composes tools/bpy/neva-art.svg:
// a 1024x1024 painted view of the Neva - pearl-to-zenith sky with soft stratus bands, the
// far-bank silhouette band, the Peter-and-Paul fortress with the gilt spire, the Exchange
// and the two Rostral columns, the river with silver highlights, the granite parapet, and
// the painted glazing bars over each of the twelve pane rectangles.
//
//   node tools/bpy/neva-art-gen.mjs
//
// Deterministic by construction: every shape is a fixed literal or derived from the
// parsed bay table - no Date, no Math.random, no external references, and no script or
// image elements (tools/bpy/neva-raster.mjs gates on that).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PY_PATH = join(ROOT, 'tools', 'bpy', 'jordan.py');
const JSON_PATH = join(ROOT, 'tools', 'jordan-windows.json');
const SVG_PATH = join(HERE, 'neva-art.svg');

// Corrected plate law: u = (x - 66) / 26 across the wall run (west -> east on the NORTH
// wall), v = (y - 2) / 16 vertically; px_u = u * 1024, px_v = (1 - v) * 1024 (SVG y-down).
// Square plate, like the plafond's.
const PLATE = 1024;

// Palette / tuning. Spec section 2 values first; the rasterizer's in-pane mean gate
// (0.80 +/- 0.05) is the arbiter - if a run misses the window, adjust these and re-run
// (the sky dominates the upper panes, the river carries the lower tier).
const TUNE = {
  skyLow: '#EEF0F2', // pearl low (spec #D9DEE3, lifted for the mean gate)
  skyMid: '#EFF2F4', // pearl hold (lifted)
  skyMidAt: 0.8, // v of the hold stop
  skyHigh: '#B3C4D6', // cool zenith (spec #9FB3C8, lifted)
  stratus: '#F4F3EE',
  stratusOpacity: [0.55, 0.65, 0.7, 0.75], // one entry per STRATUS band
  glow: '#EDE3CF', // horizon glow (blind band only, never sampled)
  river: '#7F8B96', // lead grey (the §2 original — the mean holds via the sky lift)
  highlight: '#B9C3CC', // silver shimmer (the §2 original)
  highlightOpacity: [0.75, 0.8, 0.7, 0.8, 0.7, 0.85, 0.7, 0.8, 0.7, 0.75, 1],
};

// Fixed spec palette: silhouettes / parapet, gilt spire, glazing bars.
const SILH = '#5B6168';
const GILT = '#C9A85A';
const BAR = '#EFEAE0';
const SHADOW = '#B9B4A8';

// Soft stratus bands (metres: band foot y, band height h) - 4 across the wall run.
const STRATUS = [
  { y: 7.7, h: 1.3 },
  { y: 10.0, h: 1.5 },
  { y: 12.4, h: 1.3 },
  { y: 14.9, h: 1.2 },
];

// Long silver highlights on the river (metres: y, run x0..x1) - staggered shimmer rows.
const HIGHLIGHTS = [
  { y: 5.95, x0: 66.4, x1: 91.6 },
  { y: 5.85, x0: 66.6, x1: 90.8 },
  { y: 5.62, x0: 68.4, x1: 91.8 },
  { y: 5.4, x0: 66.9, x1: 88.2 },
  { y: 5.18, x0: 70.2, x1: 91.4 },
  { y: 4.95, x0: 67.2, x1: 86.6 },
  { y: 4.72, x0: 71.0, x1: 91.0 },
  { y: 4.5, x0: 66.7, x1: 84.2 },
  { y: 4.28, x0: 72.4, x1: 90.6 },
  { y: 4.05, x0: 68.8, x1: 85.8 },
  { y: 3.75, x0: 70.0, x1: 88.4 },
];
const HIGHLIGHT_H = 4.5; // px, one shimmer row

// Stylized Petrograd roofline: heights (px above the horizon) of 24 equal roof segments.
const ROOF_H = [
  18, 30, 12, 36, 22, 40, 16, 28, 34, 20, 38, 26, 14, 32, 24, 40, 18, 30, 12, 34, 22, 28, 16, 24,
];

function constLine(lines, head) {
  const line = lines.find((l) => l.startsWith(head));
  if (!line) {
    throw new Error(`neva-art-gen: '${head}' not found in jordan.py`);
  }
  return line;
}

function parseJordanPy() {
  const lines = readFileSync(PY_PATH, 'utf8').split(/\r?\n/);
  const grab = (line, re) => {
    const m = line.match(re);
    if (!m) {
      throw new Error(`neva-art-gen: cannot parse '${line.trim()}'`);
    }
    return m;
  };
  const xe = grab(constLine(lines, 'X_W, X_E'), /=\s*(-?[\d.]+),\s*(-?[\d.]+)/);
  const zn = grab(constLine(lines, 'Z_N, Z_S'), /=\s*(-?[\d.]+)/);
  const nBays = grab(constLine(lines, 'WIN_BAYS'), /=\s*(\d+)/);
  const pitch = grab(constLine(lines, 'WIN_PITCH'), /=\s*([\d.]+)/);
  const winW = grab(constLine(lines, 'WIN_W'), /=\s*([\d.]+)/);
  const recess = grab(constLine(lines, 'WIN_RECESS'), /=\s*([\d.]+)/);
  const tiers = [...constLine(lines, 'WIN_TIERS').matchAll(/\((-?[\d.]+),\s*(-?[\d.]+)\)/g)].map(
    (m) => ({ sill: Number(m[1]), head: Number(m[2]) }),
  );
  if (tiers.length !== 2) {
    throw new Error(`neva-art-gen: expected 2 window tiers, parsed ${tiers.length}`);
  }
  return {
    xw: Number(xe[1]),
    xe: Number(xe[2]),
    zn: Number(zn[1]),
    nBays: Number(nBays[1]),
    pitch: Number(pitch[1]),
    winW: Number(winW[1]),
    recess: Number(recess[1]),
    tiers,
  };
}

const r6 = (v) => Number(v.toFixed(6));

function buildTable(py) {
  const centre = (py.xw + py.xe) / 2;
  const half = r6(py.winW / 2);
  const bays = Array.from({ length: py.nBays }, (_, i) => {
    const cx = r6(centre + (i - (py.nBays - 1) / 2) * py.pitch);
    return { index: i, cx, x0: r6(cx - half), x1: r6(cx + half) };
  });
  if (bays[0].x0 < py.xw || bays[bays.length - 1].x1 > py.xe) {
    throw new Error('neva-art-gen: parsed bays fall outside the wall run');
  }
  return {
    wall: 'north',
    z: r6(py.zn - py.recess), // the glazed plane: wall face set back by WIN_RECESS
    runX: [py.xw, py.xe],
    vLaw: { yMin: 2, yMax: 16 },
    tiers: py.tiers,
    bays,
  };
}

function composeSvg(T) {
  const pxU = (x) => ((x - T.runX[0]) / (T.runX[1] - T.runX[0])) * PLATE;
  const pxV = (y) => (1 - (y - T.vLaw.yMin) / T.vLaw.yMax) * PLATE;
  const fmt = (v) => {
    const s = v.toFixed(4).replace(/\.?0+$/, '');
    return s === '' || s === '-' ? '0' : s;
  };
  const rect = (x, y, w, h, fill, extra = '') =>
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}"${extra}/>`;

  // The sky fills the whole plate: the blind band between the tiers and above the upper
  // tier continue it (never sampled, painted for safety).
  const sky = [
    '<defs>',
    `  <linearGradient id="sky" x1="0" y1="${PLATE}" x2="0" y2="0" gradientUnits="userSpaceOnUse">`,
    `    <stop offset="0" stop-color="${TUNE.skyLow}"/>`,
    `    <stop offset="${TUNE.skyMidAt}" stop-color="${TUNE.skyMid}"/>`,
    `    <stop offset="1" stop-color="${TUNE.skyHigh}"/>`,
    '  </linearGradient>',
    '  <linearGradient id="stratus" x1="0" y1="0" x2="0" y2="1">',
    `    <stop offset="0" stop-color="${TUNE.stratus}" stop-opacity="0"/>`,
    `    <stop offset="0.5" stop-color="${TUNE.stratus}" stop-opacity="1"/>`,
    `    <stop offset="1" stop-color="${TUNE.stratus}" stop-opacity="0"/>`,
    '  </linearGradient>',
    '  <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">',
    `    <stop offset="0" stop-color="${TUNE.glow}" stop-opacity="0"/>`,
    `    <stop offset="1" stop-color="${TUNE.glow}" stop-opacity="1"/>`,
    '  </linearGradient>',
    '</defs>',
    rect(0, 0, PLATE, PLATE, 'url(#sky)'),
  ];

  const stratus = STRATUS.map((band, i) => {
    const yTop = pxV(band.y + band.h);
    return rect(
      0,
      yTop,
      PLATE,
      pxV(band.y) - yTop,
      'url(#stratus)',
      ` opacity="${TUNE.stratusOpacity[i]}"`,
    );
  });

  // Horizon glow above the far bank (y 6.6 .. 8.2), strongest at the bank's top edge.
  const glowTop = pxV(8.2);
  const glowFoot = pxV(6.6);
  const glow = [rect(0, glowTop, PLATE, glowFoot - glowTop, 'url(#glow)', ' opacity="0.9"')];

  // The far-bank silhouette band (y 6.0 .. 6.6): one continuous stylized roofline.
  const bank = (() => {
    const base = pxV(6.0);
    const step = PLATE / ROOF_H.length;
    const pts = ROOF_H.map((h, i) => `${fmt(i * step)},${fmt(base - h)}`);
    const d = `M 0,${fmt(base)} L ${pts.join(' L ')} L ${PLATE},${fmt(base)} Z`;
    return [`  <path d="${d}" fill="${SILH}"/>`];
  })();

  // The Peter-and-Paul fortress in bay 2 from the west (index 1): merlons + the thin
  // gilt spire needle INSIDE the glass-visible band. The pane cut is 6.5 - the round-30
  // review's F-1: the caption names the spire, so the needle clears the roofline but
  // stays below 6.5 (the old 7.2 tip painted behind solid wall, never on the glass).
  const fortress = (() => {
    const bay = T.bays[1];
    const base = pxV(6.0);
    const visTop = pxV(6.5);
    const merlonTop = pxV(6.44);
    const merlonFoot = pxV(6.3);
    const l = pxU(bay.x0);
    const r = pxU(bay.x1);
    const cx = pxU(bay.cx);
    const out = [rect(l, visTop, r - l, base - visTop, SILH)];
    for (let i = 0; i < 5; i++) {
      const mx = l + ((r - l) * (2 * i + 1)) / 10 - 2;
      out.push(rect(mx, merlonTop, 4, merlonFoot - merlonTop, SILH));
    }
    const needle = [
      `${fmt(cx - 2)},${fmt(pxV(6.36))}`,
      `${fmt(cx)},${fmt(pxV(6.49))}`,
      `${fmt(cx + 2)},${fmt(pxV(6.36))}`,
    ].join(' ');
    out.push(`  <polygon points="${needle}" fill="${GILT}"/>`);
    out.push(`  <circle cx="${fmt(cx)}" cy="${fmt(pxV(6.455))}" r="1.6" fill="${GILT}"/>`);
    return out;
  })();

  // The Exchange (bay index 4) and the two Rostral columns (bay index 5): smaller
  // silhouettes kept inside the bank band (y 6.0 .. 6.6).
  const strelka = (() => {
    const exchange = T.bays[4];
    const columns = T.bays[5];
    const base = pxV(6.0);
    const bandTop = pxV(6.6);
    const bodyTop = pxV(6.5);
    const l = pxU(exchange.x0) + 6;
    const r = pxU(exchange.x1) - 6;
    const cx = pxU(exchange.cx);
    const gable = [
      `${fmt(l)},${fmt(bodyTop)}`,
      `${fmt(r)},${fmt(bodyTop)}`,
      `${fmt(cx)},${fmt(bandTop)}`,
    ].join(' ');
    const out = [rect(l, bodyTop, r - l, base - bodyTop, SILH)];
    out.push(`  <polygon points="${gable}" fill="${SILH}"/>`);
    for (const dx of [-0.8, 0.8]) {
      const x = pxU(columns.cx + dx);
      out.push(rect(x - 0.9, bandTop, 1.8, base - bandTop, SILH));
      out.push(rect(x - 2.2, bandTop, 4.4, 3, SILH));
    }
    return out;
  })();

  // The river (y 3.3 .. 6.0) with long horizontal silver highlights.
  const river = (() => {
    const top = pxV(6.0);
    const foot = pxV(3.3);
    const out = [rect(0, top, PLATE, foot - top, TUNE.river)];
    for (const [i, hl] of HIGHLIGHTS.entries()) {
      const extra = ` opacity="${TUNE.highlightOpacity[i]}"`;
      out.push(
        rect(pxU(hl.x0), pxV(hl.y), pxU(hl.x1) - pxU(hl.x0), HIGHLIGHT_H, TUNE.highlight, extra),
      );
    }
    return out;
  })();

  // The granite parapet band (y 3.0 .. 3.3), continued to the plate bottom - the strip
  // below the lower tier is never sampled, painted for safety.
  const parapet = [rect(0, pxV(3.3), PLATE, PLATE - pxV(3.3), SILH)];

  // The painted glazing bars: verticals at the opening's thirds, horizontals at the
  // quarters, 0.06 m wide, each with a 0.01 m shadow line on its lower/right edge.
  const bars = (() => {
    const spanU = T.runX[1] - T.runX[0];
    const barW = (0.06 / spanU) * PLATE; // 2.3631 px horizontal
    const barH = (0.06 / T.vLaw.yMax) * PLATE; // 3.84 px vertical
    const shW = (0.01 / spanU) * PLATE; // 0.3938 px
    const shH = (0.01 / T.vLaw.yMax) * PLATE; // 0.64 px
    const out = [];
    for (const tier of T.tiers) {
      for (const bay of T.bays) {
        const x = pxU(bay.x0);
        const w = pxU(bay.x1) - x;
        const y = pxV(tier.head);
        const h = pxV(tier.sill) - y;
        for (const k of [1, 2]) {
          const vx = x + (w * k) / 3;
          out.push(rect(vx, y, barW, h, BAR));
          out.push(rect(vx + barW, y, shW, h, SHADOW));
        }
        for (const k of [1, 2, 3]) {
          const hy = y + (h * k) / 4;
          out.push(rect(x, hy, w, barH, BAR));
          out.push(rect(x, hy + barH, w, shH, SHADOW));
        }
      }
    }
    return out;
  })();

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
    ...sky,
    ...stratus,
    ...glow,
    ...bank,
    ...fortress,
    ...strelka,
    ...river,
    ...parapet,
    ...bars,
    '</svg>',
    '',
  ].join('\n');
}

const py = parseJordanPy();
const table = buildTable(py);
writeFileSync(JSON_PATH, `${JSON.stringify(table, null, 2)}\n`);
console.log(`neva-art-gen: wrote ${JSON_PATH} (${table.bays.length} bays, z ${table.z})`);

// The composition reads the written table back - the JSON is the single truth shared
// with the rasterizer's pane measurement.
const T = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
writeFileSync(SVG_PATH, composeSvg(T));
console.log(`neva-art-gen: wrote ${SVG_PATH} (${T.bays.length * T.tiers.length} panes)`);
