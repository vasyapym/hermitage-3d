// tools/probes/jordan-dark-median.mjs — the F3 dark-median loss re-measure (COMMITTED
// instrument; run at the round's read phases — never by CI). The 2c method: the loss is
// the delta between the encode's stored output (the dry row — computed from the bake EXR
// by the reencode-encode formula: stored = srgb_oetf(clip(rgb / W, 0, 1)) × 255) and the
// PUBLISHED ktx2's decoded stored texels (ETC1S — the F3 flags q255/clevel 2). Two
// statistics over the allocated-interior population (cells.json's non-excluded cells,
// the 28-px interiors at LM_RES 2048 — the scope lm-percentile samples), both sides the
// SAME statistic:
//   global   — the median over every interior texel;
//   dark     — the median over the texels of the cells whose DRY per-cell median ≤ 100
//              (the 2c's «dark-median at stored ~70» metric — the F3 gate's population).
// The round's gate: both losses ≥ −10 (the q128 baseline measured −22 on day's dark
// cells; the F3 target). Deterministic: same EXR + W → byte-identical dry rows
// (reencode.mjs:4).
//
//   node tools/probes/jordan-dark-median.mjs <stage-with-bakes> <cells.json> \
//     <day.ktx2> <dusk.ktx2> <night.ktx2>
//
// The dry side runs Blender headless (numpy foreach_get + the interior rects); the ktx2
// side decodes via the repo's committed basis transcoder (public/basis/) to cTFRGBA32 —
// the decoded bytes ARE the stored sRGB values (the OETF is assigned, never converted).
// ORIENTATION LAW (caught 2026-11-17): the transcoder's output rows are TOP-DOWN while
// the atlas is bottom-up («row 0 at v=0») — the ktx2 sample reads row (RES−1−y); a
// non-flipped read prints a phantom −34 loss (the mirror artifact).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const require = createRequire(import.meta.url);

const [stage, cellsPath, dayKtx2, duskKtx2, nightKtx2] = process.argv.slice(2);
if (!stage || !cellsPath || !dayKtx2 || !duskKtx2 || !nightKtx2) {
  console.error(
    'usage: jordan-dark-median.mjs <stage> <cells.json> <day.ktx2> <dusk.ktx2> <night.ktx2>',
  );
  process.exit(2);
}

const cells = JSON.parse(readFileSync(cellsPath, 'utf8'));
const CELLS = cells.cells;
const GRID = cells.grid;
const RES = cells.res;
const PAD = cells.pad;
const CELL = RES / GRID;
const INNER = CELL - 2 * PAD;
const EXCLUDED = ['pane', 'sconce_glow', 'chandelier_glow'];
const STATES = [
  ['day', dayKtx2, 0.45],
  ['dusk', duskKtx2, 0.35],
  ['night', nightKtx2, 4.0],
];
const DARK_DRY_THRESHOLD = 100;
const DARK_DRY_FLOOR = 10; // the ~0 black cells (the metallic gilt's diffuse) are out —
// the 2c's dark population sat AT stored ~70, not at the format's floor

// ---- the population (the same cells.json order — the pairing key) ----
const population = [];
for (const [key, row] of Object.entries(CELLS)) {
  if (EXCLUDED.includes(row['material'])) continue;
  const [cx, cy] = key.split(',').map(Number);
  population.push([
    cy * CELL + PAD,
    cy * CELL + PAD + INNER,
    cx * CELL + PAD,
    cx * CELL + PAD + INNER,
  ]);
}
// NO sort here: the population order IS the pairing key — the dry side iterates
// cells.json's own (sorted-keys) order, and the per-cell pairing pairs by index.

// ---- the dry side: Blender headless returns the PER-CELL stored medians ----
const plan = JSON.stringify({
  cells: cellsPath,
  excluded: EXCLUDED,
  grid: GRID,
  res: RES,
  pad: PAD,
  states: STATES.map(([state, , w]) => ({
    state,
    exr: join(stage, `bake-${state}/lm/${state}.exr`),
    w,
  })),
});
const blenderScript = `
import json, sys
import numpy as np, bpy
plan = json.loads(sys.argv[sys.argv.index('--') + 1])
cells = json.load(open(plan['cells']))['cells']
grid, res, pad = plan['grid'], plan['res'], plan['pad']
cell = int(res / grid)
excluded = set(plan['excluded'])
out = {}
for item in plan['states']:
    img = bpy.data.images.load(item['exr'], check_existing=False)
    w, h = img.size
    buf = np.empty(w * h * img.channels, dtype=np.float32)
    img.pixels.foreach_get(buf)
    rgb = buf.reshape(h, w, img.channels)[:, :, :3]
    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    percell = []
    for key, row in cells.items():
        if row['material'] in excluded:
            continue
        cx, cy = (int(p) for p in key.split(','))
        y0, y1 = cy * cell + pad, (cy + 1) * cell - pad
        x0, x1 = cx * cell + pad, (cx + 1) * cell - pad
        patch = lum[y0:y1, x0:x1]
        stored = np.clip(patch / item['w'], 0.0, 1.0)
        stored = np.where(stored <= 0.0031308, 12.92 * stored,
                          1.055 * np.power(stored, 1 / 2.4) - 0.055) * 255.0
        percell.append(float(np.median(stored)))
    out[item['state']] = percell
    bpy.data.images.remove(img)
print('ZIMNY_DRY ' + json.dumps(out, sort_keys=True))
`;
const work = mkdtempSync(join(tmpdir(), 'jordan-dark-median-'));
const blenderScriptPath = join(work, 'dark-median-dry.py');
writeFileSync(blenderScriptPath, blenderScript);
const stdout = execFileSync(
  process.env.ZIMNY_BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender',
  ['-b', '--factory-startup', '-noaudio', '--python', blenderScriptPath, '--', plan],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 },
);
const dryLine = stdout.split('\n').find((l) => l.startsWith('ZIMNY_DRY '));
if (!dryLine) throw new Error('the Blender dry pass printed no ZIMNY_DRY line');
const dryPerCell = JSON.parse(dryLine.slice('ZIMNY_DRY '.length));
// The pairing check: the dry side and the population must carry the SAME cell sequence
// (the file's sorted-keys order — the Blender dict and Object.entries agree on it).
for (const [state] of STATES) {
  if (population.length !== dryPerCell[state].length) {
    throw new Error(
      `the population (${population.length}) does not pair with the dry rows (${dryPerCell[state].length}) for ${state}`,
    );
  }
}

function median(f32) {
  const arr = Float32Array.from(f32);
  arr.sort();
  const n = arr.length;
  return n % 2 ? arr[(n - 1) / 2] : (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

// ---- the ktx2 side: the basis transcoder → cTFRGBA32 ----
// The transcoder source mixes UMD guards with a top-level await (an ESM emscripten
// build) and declares `var BASIS = ...` at module scope with no export statement — the
// repo's type=module makes require() of the .js return an empty namespace. A .cjs copy
// loads the UMD build exactly as the browser worker loads it.
const transcoderPath = join(work, 'basis-transcoder.cjs');
writeFileSync(
  transcoderPath,
  readFileSync(join(ROOT, 'public', 'basis', 'basis_transcoder.js'), 'utf8'),
);
const BASIS = require(transcoderPath);
if (typeof BASIS !== 'function') throw new Error('the basis transcoder did not expose its factory');
const wasmBinary = readFileSync(join(ROOT, 'public', 'basis', 'basis_transcoder.wasm'));
let basisResolve;
const basisReady = new Promise((ok) => {
  basisResolve = ok;
});
// BASIS(config) populates the config in place (the KTX2Loader's exact pattern: the config
// object BECOMES the module — initializeBasis() rides on it after the runtime init).
const basis = {
  wasmBinary: wasmBinary.buffer.slice(
    wasmBinary.byteOffset,
    wasmBinary.byteOffset + wasmBinary.byteLength,
  ),
  onRuntimeInitialized: basisResolve,
};
BASIS(basis);
await basisReady;
basis.initializeBasis(); // the KTX2Loader's init order: initializeBasis() before KTX2File

function decodeKtx2(path) {
  const data = new Uint8Array(readFileSync(path));
  const file = new basis.KTX2File(data);
  try {
    if (!file.isValid()) throw new Error(`invalid or unsupported ktx2: ${path}`);
    // The three loader's exact call shapes (KTX2Loader.js transcode()).
    const width = file.getWidth();
    const dstSize = file.getImageTranscodedSizeInBytes(0, 0, 0, 13); // mip 0, layer 0, face 0, cTFRGBA32
    const dst = new Uint8Array(dstSize);
    if (!file.startTranscoding()) throw new Error(`startTranscoding failed: ${path}`);
    const status = file.transcodeImage(dst, 0, 0, 0, 13, 0, -1, -1);
    if (status !== 1) throw new Error(`transcodeImage failed (${status}): ${path}`);
    return { width, rgba: dst };
  } finally {
    file.close();
    file.delete();
  }
}

console.log(`population: ${population.length} cells × ${INNER}² interiors`);
let failed = 0;
for (const [state, ktx2Path] of STATES) {
  const dryCells = dryPerCell[state];
  const decoded = decodeKtx2(ktx2Path);
  if (decoded.width !== RES) {
    console.error(`ktx2 width ${decoded.width} != ${RES} (${state})`);
    failed += 1;
    continue;
  }
  const rgba = decoded.rgba;
  const darkDry = [];
  const darkKtx2 = [];
  const globalDry = [];
  const globalKtx2 = [];
  for (const [cellIndex, [y0, y1, x0, x1]] of population.entries()) {
    const dryCell = dryCells[cellIndex];
    const cellTexels = new Float32Array((y1 - y0) * (x1 - x0));
    let o = 0;
    for (let y = y0; y < y1; y++) {
      // ORIENTATION LAW: the transcoder's rows are top-down (see the header).
      const row = (RES - 1 - y) * decoded.width;
      for (let x = x0; x < x1; x++) {
        const i = (row + x) * 4;
        cellTexels[o++] = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
      }
    }
    const ktx2Cell = Math.round(median(cellTexels));
    globalDry.push(dryCell);
    globalKtx2.push(ktx2Cell);
    if (dryCell <= DARK_DRY_THRESHOLD && dryCell > DARK_DRY_FLOOR) {
      darkDry.push(dryCell);
      darkKtx2.push(ktx2Cell);
    }
  }
  const globalLoss =
    Math.round(median(Float32Array.from(globalKtx2))) -
    Math.round(median(Float32Array.from(globalDry)));
  const darkLoss =
    Math.round(median(Float32Array.from(darkKtx2))) -
    Math.round(median(Float32Array.from(darkDry)));
  const globalVerdict = globalLoss >= -10 ? 'PASS' : 'FAIL';
  const darkVerdict = darkLoss >= -10 ? 'PASS' : 'FAIL';
  console.log(
    `${state}: global dry ${Math.round(median(Float32Array.from(globalDry)))} → ktx2 ${Math.round(median(Float32Array.from(globalKtx2)))} · loss ${globalLoss} · ${globalVerdict}`,
  );
  console.log(
    `${state}: dark   dry ${Math.round(median(Float32Array.from(darkDry)))} → ktx2 ${Math.round(median(Float32Array.from(darkKtx2)))} · loss ${darkLoss} · ${darkVerdict} (${darkDry.length} cells ≤ ${DARK_DRY_THRESHOLD})`,
  );
  if (globalLoss < -10 || darkLoss < -10) failed += 1;
}
if (failed > 0) process.exit(1);
console.log('dark-median re-measure: done');
