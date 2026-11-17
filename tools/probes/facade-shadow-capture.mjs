// tools/probes/facade-shadow-capture.mjs — the facade-shadow lane's probe (COMMITTED later
// with the fix; RUN only at the lane's read phases — never by CI). One shot per run: the
// night facade at the boot framing (S0, the screenshot's pose), the phone-portrait
// viewport, the det instants. The bisect's configs ride JF_CONFIG:
//   base          — the committed tree
//   no-lattice    — nightLattice.group hidden outright (the pane cards off)
//   lit-recess    — the surround's dark recess panels painted WHITE (the panels off)
//   no-warm-ground— the hemisphere's ground tint drops the warmGround lerp
// The frames land ONLY under probes/ (gitignored, local-only).
//
//   JF_CONFIG=base node tools/probes/facade-shadow-capture.mjs
//   JF_AT='2026-11-17T19:06:00Z' JF_CONFIG=base node ...

import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CONFIG = (process.env.JF_CONFIG ?? 'base').trim();
if (!/^[a-z-]+$/.test(CONFIG)) {
  console.error(`facade-shadow-capture: bad JF_CONFIG name`);
  process.exit(2);
}
const OUT = join(ROOT, 'probes', 'facade-shadow');
const AT = process.env.JF_AT ?? '2026-11-17T19:06:00Z'; // the sighting's 22:06 MSK, autumn

await mkdir(OUT, { recursive: true });
await rm(join(OUT, `${CONFIG}.png`), { force: true });

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
const server = await (async () => {
  const { createServer } = await import('node:http');
  const { readFileSync } = await import('node:fs');
  const dist = join(ROOT, 'dist');
  const s = createServer((req, res) => {
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
      res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' });
      res.end(readFileSync(target));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  return s;
})();
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
try {
  await page.goto(`${base}/#/square?at=${AT}&det=1&hud=1`, { timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#hud');
      return (
        el && el.getAttribute('data-room') === 'square' && el.getAttribute('data-hold-ms') === '0'
      );
    },
    undefined,
    { timeout: 180_000 },
  );
  await page.addStyleTag({
    content:
      '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, #edge-prompt, #hud, #caption, #caption-title, #load-line { visibility: hidden !important; }',
  });
  await page.waitForTimeout(1500);
  const shot = await page.screenshot({
    clip: { x: 0, y: 0, width: 720, height: 1280 },
    timeout: 60_000,
  });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(OUT, `${CONFIG}.png`), shot);
  console.log(`captured ${CONFIG} at ${AT} → probes/facade-shadow/${CONFIG}.png`);
} catch (error) {
  console.error(`${CONFIG}: FAILED — ${error.message.slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await page.close();
  await browser.close();
  server.close();
}
