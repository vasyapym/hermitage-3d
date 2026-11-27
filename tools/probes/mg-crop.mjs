// tools/probes/mg-crop.mjs — crop + optional nearest-neighbour upscale, save PNG (a local
// instrument for the round's visual reads; never run by CI).

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { chromium } from '@playwright/test';

const main = async () => {
  const [src, x, y, w, h, scale] = process.argv.slice(2);
  if (!src || x === undefined) {
    console.error('usage: node tools/probes/mg-crop.mjs <png> <x> <y> <w> <h> [scale=1] [out]');
    process.exit(2);
  }
  const out =
    process.argv[8] ??
    `/tmp/mg-crop-${basename(src).replace(/\.[a-z]+$/i, '')}-${x}-${y}-${w}-${h}-s${scale ?? 1}.png`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ src64, x, y, w, h, s }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w * s;
      c.height = h * s;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false; // nearest-neighbour: keep the texels honest
      ctx.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
      return c.toDataURL('image/png');
    },
    { src64: readFileSync(src).toString('base64'), x: +x, y: +y, w: +w, h: +h, s: +(scale ?? 1) },
  );
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(out);
  await browser.close();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
