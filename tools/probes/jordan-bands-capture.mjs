// tools/probes/jordan-bands-capture.mjs — the bands round's capture battery (COMMITTED
// code, authored by the round; RUN only at the round's capture phases — never by CI, no
// runtime JS changes). Shape: rg-f4's — FRESH PAGE per shot (transport trap 4), the
// roomReady/ledger HUD contract, OVERLAY-HIDE, page-level clip, the det instants.
//
//   node tools/probes/jordan-bands-capture.mjs                   # serve dist/ fresh, shoot all
//   JORDAN_BANDS_ROUND=before node ...                           # out dir probes/jordan-bands-before
//   JORDAN_BANDS_BASE=http://127.0.0.1:4176 node ...             # shoot an ALREADY-served dist
//   JORDAN_BANDS_ONLY='^(day-|dusk-)' node ...                   # restrict the battery
//
// Camera law: the rail stops' own poses (rooms/jordan/contract.ts) — the runtime derives
// the camera per frame from the rail, so the probe does NOT override it; the bars project
// the world regions from each shot's committed pose + the ONE vertical-FOV source
// (CAMERA_VFOV_DEG = 55, src/camera/portrait-frame.ts). The owner's phone sighting pose
// is approximated by J4's framing in BOTH a portrait and a landscape viewport.
//
// Frame storage law: frames + reads.md land ONLY under probes/ (gitignored, local-only).
// A run EVICTS its selected frames' PNGs/pose jsons/reads rows BEFORE shooting; one row
// per selected frame (captured/FAILED); EXIT NONZERO on any failure — never silently
// partial.

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ROUND = (process.env.JORDAN_BANDS_ROUND ?? 'after').trim();
if (!/^[a-z0-9-]+$/.test(ROUND)) {
  console.error(`jordan-bands-capture: bad JORDAN_BANDS_ROUND name (regex ^[a-z0-9-]+$)`);
  process.exit(2);
}
const OUT = join(ROOT, 'probes', `jordan-bands-${ROUND}`);
const ONLY = process.env.JORDAN_BANDS_ONLY ? new RegExp(process.env.JORDAN_BANDS_ONLY) : null;

// The committed golden det instants (tests/e2e/golden.spec.ts) + the owner's decisive
// June-noon test instant (docs/parking-lot.md: the sighting conditions).
const DET_AT = {
  'day-golden': '2026-06-22T03:18:00Z',
  'day-noon': '2026-06-22T12:00:00Z',
  dusk: '2026-06-20T21:50:00Z',
  night: '2026-02-17T16:25:00Z',
};
// The wall stops (rooms/jordan/contract.ts): J1b aims just off the north wall (the
// bands' primary measuring stop), J3/J4 are the landing stops (the owner's sighting
// stop + the east-wall check). Poses are the CONTRACT's committed values.
const STOPS = {
  J1b: { pos: [67.2, 6.7, -79.0], target: [75.1, 9.5, -85.5] },
  J3: { pos: [80.4, 11.7, -83.3], target: [92, 13, -74] },
  J4: { pos: [82.5, 11.7, -78.5], target: [92, 13, -74] },
};
const VIEWPORTS = {
  p: { width: 720, height: 1280 },
  l: { width: 1280, height: 720 },
};
const FRAMES = [];
for (const state of ['day-golden', 'day-noon', 'dusk', 'night']) {
  for (const stop of ['J1b', 'J3', 'J4']) {
    for (const view of ['p', 'l']) {
      FRAMES.push([state, stop, view]);
    }
  }
}
const SELECTED = FRAMES.map(([state, stop, view]) => `${state}-${stop.toLowerCase()}-${view}`)
  .filter((name) => !ONLY || ONLY.test(name));

const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, #edge-prompt, #hud, #caption, #caption-title, #load-line { visibility: hidden !important; }';

await mkdir(OUT, { recursive: true });
for (const name of SELECTED) {
  await rm(join(OUT, `${name}.png`), { force: true });
  await rm(join(OUT, `${name}.pose.json`), { force: true });
}

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
const serveBase = process.env.JORDAN_BANDS_BASE ?? (await startServe());
if (!process.env.JORDAN_BANDS_BASE) {
  console.log(`serving ${join(ROOT, 'dist')} on ${serveBase}`);
}

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
  globalThis.__jordanBandsServer = server;
  return `http://127.0.0.1:${server.address().port}`;
}

const browser = await chromium.launch();
const logPath = join(OUT, 'reads.md');
const logRows = [];
let failed = 0;

for (const [state, stop, view] of FRAMES) {
  const name = `${state}-${stop.toLowerCase()}-${view}`;
  if (ONLY && !ONLY.test(name)) continue;
  const viewport = VIEWPORTS[view];
  const pose = STOPS[stop];
  const page = await browser.newPage({ viewport });
  const messages = [];
  const failedAssets = [];
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failedAssets.push(`${r.status()} ${r.url()}`);
  });
  try {
    await page.goto(`${serveBase}/#/jordan?at=${DET_AT[state]}&det=1&stop=${stop}&hud=1`, {
      timeout: 120_000,
    });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#hud');
        if (!el) return false;
        return (
          el.getAttribute('data-room') === 'jordan' &&
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
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
      timeout: 60_000,
    });
    await writeFile(
      join(OUT, `${name}.pose.json`),
      `${JSON.stringify({
        stop,
        state,
        instant: DET_AT[state],
        viewport: [viewport.width, viewport.height],
        pos: pose.pos,
        target: pose.target,
        fovDeg: 55, // CAMERA_VFOV_DEG — the one source of the vertical FOV
      })}\n`,
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
      `| ${name} | ${hudState.draws} | ${hudState.tris} | ${hudState.tier} | captured |`,
    );
    console.log(`${name}: draws ${hudState.draws} tris ${hudState.tris} tier ${hudState.tier}`);
    if (failedAssets.length) {
      failed += 1;
      logRows.push(`| ${name} | FAILED-ASSETS (${failedAssets.slice(0, 3).join(' · ')}) | | | |`);
      console.log(`  FAILED-ASSETS: ${failedAssets.slice(0, 5).join(' | ')}`);
    }
    if (messages.length) {
      console.log(`  ${messages.slice(-3).join(' | ')}`);
      failed += 1;
      logRows.push(
        `| ${name} | FAILED-PAGEERRORS (${messages.slice(-2).join(' · ').slice(0, 100)}) | | | |`,
      );
    }
  } catch (error) {
    failed += 1;
    logRows.push(`| ${name} | FAILED (${error.message.slice(0, 120)}) | | | |`);
    console.log(`${name}: FAILED — ${error.message.slice(0, 300)}`);
    if (messages.length) console.log(`  ${messages.slice(-5).join(' | ')}`);
  }
  await page.close();
}
await browser.close();
await writeFile(
  logPath,
  `# jordan-bands captures — ${new Date().toISOString()} · ${process.env.JORDAN_BANDS_BASE ? 'external base' : 'self-served dist'}\n\n| frame | draws | tris | tier | status |\n|---|---|---|---|---|\n${logRows.join('\n')}\n`,
);
if (globalThis.__jordanBandsServer) globalThis.__jordanBandsServer.close();
if (failed > 0) {
  console.log(`DONE WITH ${failed} FAILURE(S) — exit 1 (the battery is not silently partial)`);
  process.exit(1);
}
console.log('done');
