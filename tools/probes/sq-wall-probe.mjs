// tools/probes/sq-wall-probe.mjs — the wall/pane quartile probe, the day census's measurable
// verdict instrument (the square-next recorded class: «the wall band, the darkest quartile vs
// the brightest half», Rec. 709 luma). Reads ALREADY-CAPTURED stills (the census battery's PNGs
// under probes/), decodes each IN-PAGE — a fresh chromium page draws the PNG into a 2d canvas
// (the browser decodes PNG; no node decoder exists in the stdlib) — and prints one JSON row per
// file: the full-frame luma stats plus a 4×4 grid of region rows, each carrying the darkest
// quartile's mean, the brightest half's mean and their ratio. SQ_REGION="x0,y0,x1,y1" (frame
// fractions) narrows the row set to that one band — the design's own target names the band.
//
//   node tools/probes/sq-wall-probe.mjs probes/sq-census-before/dec-noon-S0.png probes/...
//   SQ_REGION=0.05,0.2,0.55,0.8 node tools/probes/sq-wall-probe.mjs probes/.../dec-noon-S0.png
//
// The law this tool implements (the recorded instrument, not a CI gate): ratio = (the mean of
// the darkest 25 % of the band's luma values) / (the mean of the brightest 50 %). A flat raw
// wall reads near 1.0; a modulated one separates (the HQ's recorded AFTER was 0.226 ≤ 0.35).
// Local-only: this tool stages nothing and publishes nothing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node tools/probes/sq-wall-probe.mjs <captured.png> [...]');
  process.exit(1);
}
for (const file of files) {
  if (!file.endsWith('.png') || !readFileSync(resolve(file)).length) {
    console.error(`not a readable png: ${file}`);
    process.exit(1);
  }
}
const regionParam = (process.env.SQ_REGION ?? '').trim();
const region =
  regionParam === ''
    ? null
    : regionParam.split(',').map((v) => {
        const f = Number(v);
        if (!Number.isFinite(f) || f < 0 || f > 1) {
          console.error(`SQ_REGION fractions must be within [0,1]: ${regionParam}`);
          process.exit(1);
        }
        return f;
      });
if (region !== null && region.length !== 4) {
  console.error(`SQ_REGION needs exactly x0,y0,x1,y1: ${regionParam}`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  for (const file of files) {
    const dataUrl = `data:image/png;base64,${readFileSync(resolve(file)).toString('base64')}`;
    const row = await page.evaluate(
      async ({ src, region }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx === null) throw new Error('no 2d context');
        ctx.drawImage(img, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = image.data;
        const w = canvas.width;
        const h = canvas.height;
        const lumaAt = (x0, y0, x1, y1) => {
          const values = [];
          for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
            for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
              const i = (y * w + x) * 4;
              values.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
            }
          }
          if (values.length === 0) return null;
          values.sort((a, b) => a - b);
          const mean = (rows) => rows.reduce((s, v) => s + v, 0) / rows.length;
          const darkQ = mean(values.slice(0, Math.max(1, Math.floor(values.length * 0.25))));
          const brightHalf = mean(values.slice(Math.floor(values.length * 0.5)));
          return {
            darkQ: Number(darkQ.toFixed(2)),
            brightHalf: Number(brightHalf.toFixed(2)),
            ratio: Number((darkQ / brightHalf).toFixed(3)),
          };
        };
        const full = lumaAt(0, 0, w, h);
        const grid = [];
        if (region === null) {
          for (let gy = 0; gy < 4; gy++) {
            for (let gx = 0; gx < 4; gx++) {
              const cell = lumaAt(
                (gx * w) / 4,
                (gy * h) / 4,
                ((gx + 1) * w) / 4,
                ((gy + 1) * h) / 4,
              );
              grid.push({ cell: `r${gy}c${gx}`, ...cell });
            }
          }
        }
        const band =
          region === null
            ? null
            : { region, ...lumaAt(region[0] * w, region[1] * h, region[2] * w, region[3] * h) };
        return { width: w, height: h, full, grid, band };
      },
      { src: dataUrl, region },
    );
    console.log(`${JSON.stringify({ file, ...row })}`);
  }
} finally {
  await browser.close();
}
