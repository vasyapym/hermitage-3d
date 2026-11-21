// tools/probes/rg-f4-capture.mjs — the RG-F4 13-frame capture battery (COMMITTED code,
// authored by the round; RUN only at the round's capture phases — never by CI, no runtime
// JS, no camera-control feature). The room's standing state instrument per the RG-F4
// ruling: FRESH PAGE per shot (transport trap 4 — a same-base goto is a fragment nav),
// the roomReady/ledger HUD contract, OVERLAY-HIDE, 1280×720 dpr 1 page-level clip, the
// three committed det instants, and the in-page 6×4 luminance grid (6 columns × 4 rows,
// row-major top→bottom, per-cell mean 0–255, sampled every 2nd pixel — the §2 method the
// round's record carries; the offline bars checker reads the PNGs full-sample on BOTH
// sides, so bar deltas never mix samplers).
//
//   node tools/probes/rg-f4-capture.mjs                    # serve dist/ on a fresh port, shoot all 13
//   RG_F4_ROUND=before node ...                            # out dir probes/rg-f4-before (default after)
//   RG_F4_BASE=http://127.0.0.1:4177 node ...              # shoot an ALREADY-served dist (the bench flow)
//   RG_F4_ONLY='^(day-|dusk-|night-g0$)' node ...          # restrict the battery (partial run)
//   RG_F4_GRID=24x16 node ...  |  node ... --grid 24x16    # the junction rows' 24×16 grid
//                                                          # (16 rows × 24 cols, row-major
//                                                          # top→bottom, per-cell mean 0–255;
//                                                          # the rg-audit S1 instrument; the
//                                                          # default 6×4 path is untouched)
//
// Frame storage law (the Sol-review hardening): frames + reads.md land ONLY under probes/
// (gitignored, local-only); this tool stages nothing and publishes nothing. A run EVICTS
// its selected frames' PNGs and reads rows BEFORE shooting (a failed capture can never
// leave a stale plate beside a fresh log), records one row per frame (captured/FAILED),
// and EXITS NONZERO if any selected frame failed or was skipped — a partial battery is
// never silently successful. Unselected frames' files and rows are never touched.

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ROUND = (process.env.RG_F4_ROUND ?? 'after').trim();
if (!/^[a-z0-9-]+$/.test(ROUND)) {
  console.error(`rg-f4-capture: bad RG_F4_ROUND name (regex ^[a-z0-9-]+$)`);
  process.exit(2);
}
const OUT = join(ROOT, 'probes', `rg-f4-${ROUND}`);
const ONLY = process.env.RG_F4_ONLY ? new RegExp(process.env.RG_F4_ONLY) : null;
// THE GRID LAW (the rg-audit S1 instrument): RG_F4_GRID or --grid <cols>x<rows> picks the
// in-page luminance grid; the DEFAULT 6x4 path is byte-identical to the committed tool
// (the same 6 cols × 4 rows, row-major top→bottom, the same every-2nd-pixel sampler).
// 24x16 = the junction rows' instrument (16 rows × 24 cols) — the bars derive their grids
// from the PNGs full-sample either way, so the flag only widens the recorded grid.
const GRID_ARGV = (() => {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--grid');
  return at >= 0 && argv[at + 1] ? argv[at + 1] : null;
})();
const GRID_SPEC = (GRID_ARGV ?? process.env.RG_F4_GRID ?? '6x4').trim();
if (!/^\d+x\d+$/.test(GRID_SPEC)) {
  console.error(`rg-f4-capture: bad grid ${GRID_SPEC} (expected <cols>x<rows>, e.g. 24x16)`);
  process.exit(2);
}
const [GRID_COLS, GRID_ROWS] = GRID_SPEC.split('x').map((n) => Number.parseInt(n, 10));
if (
  !Number.isInteger(GRID_COLS) ||
  !Number.isInteger(GRID_ROWS) ||
  GRID_COLS < 1 ||
  GRID_ROWS < 1 ||
  GRID_COLS > 64 ||
  GRID_ROWS > 64
) {
  console.error(`rg-f4-capture: bad grid ${GRID_SPEC} (1..64 per axis)`);
  process.exit(2);
}

// The committed golden det instants (tests/e2e/golden.spec.ts).
const DET_AT = {
  day: '2026-06-22T03:18:00Z',
  dusk: '2026-06-20T21:50:00Z',
  night: '2026-02-17T16:25:00Z',
};
// All five stops at day; the four beyond-the-door-line stops + the entry at dusk/night
// (G0b skipped beyond day — the entry leg's own read).
const FRAMES = [
  ['day', 'G0'],
  ['day', 'G0b'],
  ['day', 'Gj'],
  ['day', 'G1'],
  ['day', 'G2'],
  ['dusk', 'G0'],
  ['dusk', 'Gj'],
  ['dusk', 'G1'],
  ['dusk', 'G2'],
  ['night', 'G0'],
  ['night', 'Gj'],
  ['night', 'G1'],
  ['night', 'G2'],
];
const SELECTED = FRAMES.map(([state, stop]) => `${state}-${stop.toLowerCase()}`).filter(
  (name) => !ONLY || ONLY.test(name),
);

const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, #edge-prompt, #hud, #caption, #caption-title, #load-line { visibility: hidden !important; }';

await mkdir(OUT, { recursive: true });
// The eviction law: a selected frame's stale plate must never survive into this run's
// record. Evict BEFORE shooting; the fresh reads.md below carries one row per selected
// frame whatever the outcome.
for (const name of SELECTED) {
  await rm(join(OUT, `${name}.png`), { force: true });
}

// The self-serve path (absent RG_F4_BASE): a fresh-port static serve of the built dist.
// THE SOL-REVIEW LAW: only extensionless paths get the index.html fallback — a missing
// asset path (.ktx2/.glb/...) 404s LOUDLY; the page's decode failure then surfaces as a
// capture failure, never as a silent wrong-asset serve.
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ktx2': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};
const serveBase = process.env.RG_F4_BASE ?? (await startServe());
if (!process.env.RG_F4_BASE) {
  console.log(`serving ${join(ROOT, 'dist')} on ${serveBase}`);
}
globalThis.__rgF4ServerPort = serveBase.startsWith('http://127.0.0.1:')
  ? Number(serveBase.slice('http://127.0.0.1:'.length))
  : null;

async function startServe() {
  const { createServer } = await import('node:http');
  const { readFileSync } = await import('node:fs');
  const dist = join(ROOT, 'dist');
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      const pathname = decodeURIComponent(url.pathname);
      const file = join(dist, pathname === '/' ? 'index.html' : pathname.slice(1));
      const isAsset = extname(file) !== '' && file !== join(dist, 'index.html');
      if (isAsset && !existsSync(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const target = existsSync(file) ? file : join(dist, 'index.html');
      const body = readFileSync(target);
      res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  globalThis.__rgF4Server = server;
  return `http://127.0.0.1:${server.address().port}`;
}

const browser = await chromium.launch();
const logPath = join(OUT, 'reads.md');
const logRows = [];
let failed = 0;

for (const [state, stop] of FRAMES) {
  const name = `${state}-${stop.toLowerCase()}`;
  if (ONLY && !ONLY.test(name)) continue;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const messages = [];
  const failedAssets = [];
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failedAssets.push(`${r.status()} ${r.url()}`);
  });
  try {
    await page.goto(`${serveBase}/#/gallery?at=${DET_AT[state]}&det=1&stop=${stop}&hud=1`, {
      timeout: 120_000,
    });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#hud');
        if (!el) return false;
        return (
          el.getAttribute('data-room') === 'rastrelli-gallery' &&
          el.getAttribute('data-ledger-bytes') !== '0' &&
          el.getAttribute('data-ledger-bytes') !== null &&
          el.getAttribute('data-hold-ms') === '0'
        );
      },
      undefined,
      { timeout: 180_000 },
    );
    await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
    await page.waitForTimeout(1500);

    const shot = await page.screenshot({
      clip: { x: 0, y: 0, width: 1280, height: 720 },
      timeout: 60_000,
    });

    const stats = await page.evaluate(
      async ({ b64, cols, rows }) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        const bmp = await createImageBitmap(blob);
        const cv = document.createElement('canvas');
        cv.width = bmp.width;
        cv.height = bmp.height;
        const ctx = cv.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
        const cellW = width / cols,
          cellH = height / rows;
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        const gridN = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        let sum = 0,
          lit = 0,
          n = 0;
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4;
            const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            sum += lum;
            n += 1;
            if (lum > 10) lit += 1;
            const gr = Math.min(rows - 1, Math.floor(y / cellH));
            const gc = Math.min(cols - 1, Math.floor(x / cellW));
            grid[gr][gc] += lum;
            gridN[gr][gc] += 1;
          }
        }
        const gridOut = grid.map((row, r) => row.map((v, c) => Math.round(v / gridN[r][c])));
        return {
          cols,
          mean: +(sum / n).toFixed(1),
          grid: gridOut,
          lit: +(lit / n).toFixed(4),
          rows,
        };
      },
      { b64: shot.toString('base64'), cols: GRID_COLS, rows: GRID_ROWS },
    );

    const hudState = await page.evaluate(() => {
      const el = document.querySelector('#hud');
      return {
        draws: el?.getAttribute('data-draws'),
        tris: el?.getAttribute('data-tris'),
        tier: el?.getAttribute('data-tier'),
      };
    });

    await writeFile(join(OUT, `${name}.png`), shot);
    logRows.push(
      `| ${name} | ${stats.mean} | ${stats.lit} | ${hudState.draws} | ${hudState.tris} | ${hudState.tier} |`,
    );
    console.log(
      `${name}: mean ${stats.mean} lit ${stats.lit} draws ${hudState.draws} tris ${hudState.tris} tier ${hudState.tier}`,
    );
    console.log(
      GRID_SPEC === '6x4'
        ? `  grid: ${JSON.stringify(stats.grid)}`
        : `  grid ${GRID_SPEC}: ${JSON.stringify(stats.grid)}`,
    );
    if (failedAssets.length) {
      failed += 1;
      logRows.push(`| ${name} | FAILED-ASSETS (${failedAssets.slice(0, 3).join(' · ')}) | | | | |`);
      console.log(`  FAILED-ASSETS: ${failedAssets.slice(0, 5).join(' | ')}`);
    }
    if (messages.length) {
      console.log(`  ${messages.slice(-3).join(' | ')}`);
      failed += 1;
      logRows.push(
        `| ${name} | FAILED-PAGEERRORS (${messages.slice(-2).join(' · ').slice(0, 100)}) | | | | |`,
      );
    }
  } catch (error) {
    failed += 1;
    logRows.push(`| ${name} | FAILED (${error.message.slice(0, 120)}) | | | | |`);
    console.log(`${name}: FAILED — ${error.message.slice(0, 300)}`);
    if (messages.length) console.log(`  ${messages.slice(-5).join(' | ')}`);
  }
  await page.close();
}
await browser.close();
await writeFile(
  logPath,
  `# rg-f4 captures — ${new Date().toISOString()} · ${process.env.RG_F4_BASE ? 'external base' : 'self-served dist'}\n\n| frame | mean | lit | draws | tris | tier |\n|---|---|---|---|---|---|\n${logRows.join('\n')}\n`,
);
if (globalThis.__rgF4Server) globalThis.__rgF4Server.close();
if (failed > 0) {
  console.log(`DONE WITH ${failed} FAILURE(S) — exit 1 (the battery is not silently partial)`);
  process.exit(1);
}
console.log('done');
