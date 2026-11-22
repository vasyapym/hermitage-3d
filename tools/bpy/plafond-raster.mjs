// tools/bpy/plafond-raster.mjs — the jordan-parallel plafond round's SVG rasterizer.
// Rasterizes tools/bpy/plafond-art.svg (the creative's original composition) into
// tools/bpy/plafond-art.png at 1024×1024 — the plate source Blender's write_texture
// loads for the 'plafond' material (absent PNG = the procedural sky fallback).
//
//   node tools/bpy/plafond-raster.mjs          # rasterize ×1; run twice + compare the
//                                              # sha256 pair for the determinism gate
//
// The viewport squeezes the 1367×1024 landscape viewBox to the square plate
// (preserveAspectRatio="none") — the plate's field mapping stretches u back to the
// world proportions. Chromium renders SVG filters (feTurbulence/feDisplacementMap/
// feGaussianBlur) deterministically for a pinned browser build; the ×2 sha gate
// catches any drift. The mean-linear normalization to PLATE_TARGET_MEAN_L happens in
// Blender (tools/bpy/jordan.py::_plafond_art_pixels), never here.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const svgPath = join(HERE, 'plafond-art.svg');
const outPath = join(HERE, 'plafond-art.png');
const svg = readFileSync(svgPath, 'utf8');
if (/<(?:script|image)\b/i.test(svg)) {
  console.error('plafond-raster: the SVG carries script/image elements — forbidden');
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 1024 },
  deviceScaleFactor: 1,
});
// preserveAspectRatio="none": the landscape viewBox fills the square viewport — the
// squeeze restores the plate's field mapping (the world's 1.335:1 proportions).
const staged = svg.replace(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1367 1024">',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1367 1024" preserveAspectRatio="none">',
);
if (staged === svg) {
  console.error('plafond-raster: the root svg tag drifted — the replace missed');
  process.exit(2);
}
await page.setContent(
  `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:1024px;height:1024px}</style>${staged}`,
  { waitUntil: 'load' },
);
const buf = await page.screenshot({ type: 'png' });
await browser.close();
writeFileSync(outPath, buf);
const sha = createHash('sha256').update(buf).digest('hex');
console.log(`plafond-raster: ${resolve(outPath)} ${buf.length} B sha256 ${sha}`);
