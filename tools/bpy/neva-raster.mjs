// tools/bpy/neva-raster.mjs - the "Neva backcloth" plate rasterizer, the plafond-raster's
// twin. Rasterizes tools/bpy/neva-art.svg (the original composition) into
// tools/bpy/neva-art.png - the plate source for the pane material. Deterministic
// headless-Chromium raster: the script/image element gate, the sha256 print, and the
// in-pane mean luminance gate from the design brief (0.80 +/- 0.05).
//
//   node tools/bpy/neva-raster.mjs [width] [height]   # defaults 1024 1024
//
// Run twice and compare the sha256 pair for the determinism gate. No downloaded
// Playwright browsers? chromium.launch() falls back to the system Edge, then Chrome.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const width = Number(process.argv[2] ?? 1024);
const height = Number(process.argv[3] ?? 1024);
if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
  console.error('neva-raster: usage: node tools/bpy/neva-raster.mjs [width] [height]');
  process.exit(2);
}
const svgPath = join(HERE, 'neva-art.svg');
const outPath = join(HERE, 'neva-art.png');
const jsonPath = join(ROOT, 'tools', 'jordan-windows.json');
const ROOT_TAG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">';
const svg = readFileSync(svgPath, 'utf8');
if (/<(?:script|image)\b/i.test(svg)) {
  console.error('neva-raster: the SVG carries script/image elements - forbidden');
  process.exit(2);
}
if (!svg.includes(ROOT_TAG)) {
  console.error('neva-raster: the root svg tag drifted - the plate law needs 1024x1024');
  process.exit(2);
}

async function launchBrowser() {
  const attempts = [{}, { channel: 'msedge' }, { channel: 'chrome' }];
  let last = null;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (err) {
      last = err;
    }
  }
  console.error(`neva-raster: no browser to launch (chromium, msedge, chrome) - ${last}`);
  process.exit(3);
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const html = [
  '<!doctype html><style>html,body{margin:0;padding:0}',
  `svg{display:block;width:${width}px;height:${height}px}</style>`,
  svg,
].join('');
await page.setContent(html, { waitUntil: 'load' });
const buf = await page.screenshot({ type: 'png' });
await browser.close();

// The in-pane mean luminance over the union of the twelve pane rectangles (weights
// 0.2126/0.7152/0.0722 on the sRGB channels, normalized 0..1). The pane px rects come
// from the shared bay table with the plate law px_u = u * 1024, px_v = (1 - v) * 1024.
const png = PNG.sync.read(buf);
const table = JSON.parse(readFileSync(jsonPath, 'utf8'));
const scale = Math.min(width, height) / 1024;
const offX = (width - 1024 * scale) / 2;
const offY = (height - 1024 * scale) / 2;
const pxU = (x) => ((x - table.runX[0]) / (table.runX[1] - table.runX[0])) * 1024;
const pxV = (y) => (1 - (y - table.vLaw.yMin) / table.vLaw.yMax) * 1024;
let sum = 0;
let count = 0;
for (const tier of table.tiers) {
  for (const bay of table.bays) {
    const x0 = pxU(bay.x0) * scale + offX;
    const x1 = pxU(bay.x1) * scale + offX;
    const y0 = pxV(tier.head) * scale + offY;
    const y1 = pxV(tier.sill) * scale + offY;
    const cy0 = Math.max(0, Math.ceil(y0 - 0.5));
    const cy1 = Math.min(png.height - 1, Math.floor(y1 - 0.5));
    const cx0 = Math.max(0, Math.ceil(x0 - 0.5));
    const cx1 = Math.min(png.width - 1, Math.floor(x1 - 0.5));
    for (let py = cy0; py <= cy1; py++) {
      for (let px = cx0; px <= cx1; px++) {
        const idx = (py * png.width + px) * 4;
        sum += 0.2126 * png.data[idx] + 0.7152 * png.data[idx + 1] + 0.0722 * png.data[idx + 2];
        count += 1;
      }
    }
  }
}
if (count === 0) {
  console.error('neva-raster: no pane pixels sampled - check the bay table');
  process.exit(2);
}
const mean = sum / (count * 255);
// The mean pin gates the WRITE (the round-30 review F-4): an out-of-window plate never
// replaces the accepted art - fail loud, keep the accepted bytes on disk.
if (mean < 0.75 || mean > 0.85) {
  console.error(`neva-raster: in-pane mean ${mean.toFixed(4)} outside [0.75, 0.85] - png NOT written`);
  process.exit(2);
}
// The canonical plate is the square 1024 (the TEXTURE_SIZES law); other sizes rasterize
// a letterboxed preview (never written to the canonical path) - the round-30 review F-6.
if (width !== height) {
  const preview = join(HERE, `neva-art-preview-${width}x${height}.png`);
  writeFileSync(preview, buf);
  console.log(`neva-raster: in-pane mean luminance ${mean.toFixed(4)} (target 0.80 +/- 0.05)`);
  console.log(`neva-raster: preview-only size ${width}x${height} -> ${resolve(preview)}`);
  process.exit(0);
}
if (width !== 1024) {
  console.error('neva-raster: the canonical plate is exactly 1024x1024 (TEXTURE_SIZES law)');
  process.exit(2);
}
writeFileSync(outPath, buf);
const sha = createHash('sha256').update(buf).digest('hex');
console.log(`neva-raster: ${resolve(outPath)} ${buf.length} B sha256 ${sha}`);
console.log(`neva-raster: in-pane mean luminance ${mean.toFixed(4)} (target 0.80 +/- 0.05)`);
