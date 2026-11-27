// tools/probes/mg-look-capture.mjs — the mg-1812-look round's capture battery (COMMITTED code,
// authored by the round; RUN only at the round's capture phases — never by CI, no runtime JS,
// no camera-control feature). The room's standing state instrument per the rg-f4 precedent:
// FRESH PAGE per shot, the roomReady/ledger HUD contract, OVERLAY-HIDE, 1280×720 dpr 1
// page-level clip, the committed det instants.
//
//   node tools/probes/mg-look-capture.mjs                  # serve dist/ on a fresh port, shoot all
//   MG_LOOK_ROUND=before node ...                          # out dir probes/mg-look-before (default after)
//   MG_LOOK_BASE=http://127.0.0.1:5199 node ...            # shoot an ALREADY-served dev server
//   MG_LOOK_ONLY='^(m0-|m4-)' node ...                     # restrict the battery (partial run)
//
// Frame storage law (the rg-f4 law): frames land ONLY under probes/ (gitignored, local-only);
// a run EVICTS its selected frames' PNGs before shooting and EXITS NONZERO if any failed.

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ROUND = (process.env.MG_LOOK_ROUND ?? 'after').trim();
if (!/^[a-z0-9-]+$/.test(ROUND)) {
  console.error(`mg-look-capture: bad MG_LOOK_ROUND name (regex ^[a-z0-9-]+$)`);
  process.exit(2);
}
const OUT = join(ROOT, 'probes', `mg-look-${ROUND}`);
const ONLY = process.env.MG_LOOK_ONLY ? new RegExp(process.env.MG_LOOK_ONLY) : null;

const VIEWPORT = { width: 1280, height: 720 };
const SETTLE_TIMEOUT_MS = 45_000;
const SETTLE_MARGIN_MS = 300;
const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, #edge-prompt, #hud, #caption, #caption-title, #load-line, #touch-rail { visibility: hidden !important; }';
const DET_AT = {
  day: '2026-06-22T03:18:00Z',
  dusk: '2026-06-20T21:50:00Z',
  night: '2026-02-17T16:25:00Z',
};

// The battery: (name, route, stop, state). The vault view rides the M2 rest pose (pitchUp 55
// at the lantern) — the committed equivalent of the owner's look-up sighting.
const FRAMES = [
  { name: 'm0-day', route: '1812', stop: 'M0', state: 'day' },
  { name: 'm2-day', route: '1812', stop: 'M2', state: 'day' },
  { name: 'm3-day', route: '1812', stop: 'M3', state: 'day' },
  { name: 'm4-day', route: '1812', stop: 'M4', state: 'day' },
  { name: 'm0-dusk', route: '1812', stop: 'M0', state: 'dusk' },
  { name: 'm0-night', route: '1812', stop: 'M0', state: 'night' },
];

import { dirname } from 'node:path';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ktx2': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serveDist() {
  const dist = join(ROOT, 'dist');
  return new Promise((resolveServe) => {
    const server = createServer((req, res) => {
      const url = (req.url ?? '/').split('?')[0];
      let path = join(dist, url === '/' ? 'index.html' : url);
      if (!existsSync(path) && !extname(path)) path = join(dist, 'index.html');
      try {
        const body = readFileSyncSafe(path);
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('no');
      }
    });
    server.listen(0, '127.0.0.1', () => resolveServe(server));
  });
}

import { readFileSync } from 'node:fs';

const readFileSyncSafe = (p) => readFileSync(p);

const hudLocator = (page) => page.locator('#hud');

async function shoot(page, frame, base) {
  const at = DET_AT[frame.state];
  await page.goto(`${base}/#/${frame.route}?at=${at}&det=1&stop=${frame.stop}&hud=1`);
  const hud = hudLocator(page);
  await expectAttr(hud, 'data-room', frame.route === '1812' ? 'military-gallery' : frame.route);
  await expectAttrNot(hud, 'data-ledger-bytes', '0');
  await expectAttr(hud, 'data-hold-ms', '0');
  await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  const box = await page.locator('#scene').boundingBox();
  if (!box || Math.abs(box.x) > 0.5 || Math.abs(box.width - VIEWPORT.width) > 1) {
    throw new Error(`scene box drifted: ${JSON.stringify(box)}`);
  }
  const shot = await page.screenshot({ clip: { x: 0, y: 0, ...VIEWPORT } });
  return { shot, hudData: await hudData(page) };
}

// The HUD is aria-hidden chrome (the golden rig reads its attributes, never its visibility):
// poll attributes with an expect-style retry, no visible wait.
const expectAttr = async (locator, name, value) => {
  await expect
    .poll(async () => locator.getAttribute(name), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(value);
};
const expectAttrNot = async (locator, name, value) => {
  await expect
    .poll(async () => locator.getAttribute(name), { timeout: SETTLE_TIMEOUT_MS })
    .not.toBe(value);
};
const hudData = async (page) => {
  const hud = hudLocator(page);
  const picks = ['data-draws', 'data-tris', 'data-tier', 'data-ledger-bytes'];
  const out = {};
  for (const p of picks) out[p] = await hud.getAttribute(p);
  return out;
};

const main = async () => {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const server = process.env.MG_LOOK_BASE ? null : await serveDist();
  const base = process.env.MG_LOOK_BASE ?? `http://127.0.0.1:${server.address().port}`;
  console.log(`mg-look-capture: base ${base}, out ${OUT}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const errors = [];
  let failed = 0;
  const rows = [];
  for (const frame of FRAMES) {
    if (ONLY && !ONLY.test(frame.name)) continue;
    // FRESH PAGE per shot (transport trap 4 — a same-base goto is a fragment nav: the app's
    // hashchange path re-parses but never re-seeds a room's rail; the seed rides applySwap).
    const page = await context.newPage();
    page.on('pageerror', (err) => errors.push(`${frame.name} pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${frame.name} console: ${msg.text()}`);
    });
    try {
      const { shot, hudData: data } = await shoot(page, frame, base);
      await writeFile(join(OUT, `${frame.name}.png`), shot);
      rows.push(`${frame.name} ok ${JSON.stringify(data)}`);
      console.log(`  ${frame.name} ok ${JSON.stringify(data)}`);
    } catch (err) {
      failed += 1;
      rows.push(`${frame.name} FAILED: ${err.message}`);
      console.error(`  ${frame.name} FAILED: ${err.message}`);
    }
    await page.close();
  }
  await writeFile(join(OUT, 'reads.md'), `${rows.join('\n')}\n`);
  await browser.close();
  if (server) server.close();
  if (errors.length > 0) console.error(`console/page errors:\n${errors.join('\n')}`);
  if (failed > 0) process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
