// tools/probes/mg-stop-probe.mjs — a one-off diagnostics shot against dist with all console
// output, to find why ?stop= seeds differently in the built bundle (local-only instrument).

import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(ROOT, 'dist');
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ktx2': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  let p = join(dist, url === '/' ? 'index.html' : url);
  if (!existsSync(p) && !extname(p)) p = join(dist, 'index.html');
  try {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(p));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 200)));
  await page.goto(`${base}/#/1812?at=2026-06-22T03:18:00Z&det=1&stop=M4&hud=1`);
  await page.waitForTimeout(9000);
  const hud = await page
    .locator('#hud')
    .getAttribute('data-stop')
    .catch(() => null);
  console.log('hud data-stop =', hud);
  await page.screenshot({
    path: '/tmp/mg-stopm4-dist.png',
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  });
  await browser.close();
  server.close();
});
