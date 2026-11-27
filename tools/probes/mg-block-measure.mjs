// tools/probes/mg-block-measure.mjs — the mg-1812-look round's block-pitch instrument.
// Measures the day-state vault/wall blockiness: per-region block pitch (px, autocorrelation
// peak over a wide lag span), tone-step counts (level runs on scanlines) and an NxM luminance
// grid — the numbers the round's brief carries (visual evidence travels as measured numbers).
//
//   node tools/probes/mg-block-measure.mjs probes/mg-look-after/m2-day.png ...
// Regions are named crops: vault (the lantern arch band), wall (the far upper band).

import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const b64 = (p) => readFileSync(p).toString('base64');

const analyzeRegions = async (regions) => {
  const out = [];
  for (const r of regions) {
    const img = new Image();
    img.src = r.src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const lum = (x, y) => {
      const i = (y * img.width + x) * 4;
      return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    };
    const region = {
      name: r.name,
      imageW: img.width,
      imageH: img.height,
      crop: r.crop,
      stats: {},
    };
    for (const stat of r.stats) {
      const { x, y, w, h } = stat;
      // 1) tone-run lengths on horizontal scanlines (the block pitch along x)
      const runs = [];
      for (let row = y; row < y + h; row += Math.max(1, Math.floor(h / 12))) {
        let run = 1;
        let prev = lum(x, row);
        for (let col = x + 1; col < x + w; col++) {
          const v = lum(col, row);
          if (Math.abs(v - prev) > 2.5) {
            runs.push(run);
            run = 1;
            prev = v;
          } else {
            run++;
            prev = 0.9 * prev + 0.1 * v;
          }
        }
      }
      runs.sort((a, b) => a - b);
      const q = (p) => runs[Math.min(runs.length - 1, Math.floor(p * runs.length))];
      // 2) autocorrelation of the row-mean profile (a wide lag span)
      const rowMeans = [];
      for (let row = y; row < y + h; row++) {
        let s = 0;
        for (let col = x; col < x + w; col += 2) s += lum(col, row);
        rowMeans.push(s / Math.ceil(w / 2));
      }
      const n = rowMeans.length;
      const mean = rowMeans.reduce((a, b) => a + b, 0) / n;
      const centered = rowMeans.map((v) => v - mean);
      const energy = centered.reduce((a, b) => a + b * b, 0) || 1;
      const ac = [];
      for (let lag = 2; lag <= 40; lag++) {
        let s = 0;
        for (let i = 0; i + lag < n; i++) s += centered[i] * centered[i + lag];
        ac.push({ lag, r: s / energy });
      }
      ac.sort((a, b) => b.r - a.r);
      // 3) the min/max/mean luminance and the p10/p90 spread
      const samples = [];
      for (let yy = y; yy < y + h; yy += 2)
        for (let xx = x; xx < x + w; xx += 2) samples.push(lum(xx, yy));
      samples.sort((a, b) => a - b);
      const s = samples.length;
      region.stats[stat.label] = {
        mean: +(samples.reduce((a, b) => a + b, 0) / s).toFixed(2),
        p10: +samples[Math.floor(0.1 * s)].toFixed(1),
        p90: +samples[Math.floor(0.9 * s)].toFixed(1),
        runP50: +q(0.5).toFixed(1),
        runP90: +q(0.9).toFixed(1),
        acTop: ac.slice(0, 3).map((e) => [e.lag, +e.r.toFixed(3)]),
      };
    }
    out.push(region);
  }
  return out;
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: node tools/probes/mg-block-measure.mjs <png> [png...]');
    process.exit(2);
  }
  // Crops tuned to the 1280x720 rig frames: the vault band around the lantern and the
  // far wall's upper band; the owner's iPhone shot gets its own crop list by aspect.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const path of args) {
    const src = `data:image/png;base64,${b64(path)}`;
    const isPhone = /IMG_|phone/i.test(path);
    const regions = isPhone
      ? [
          {
            name: 'phone-vault-left',
            crop: 'x 40..280, y 380..900',
            stats: [{ label: 'vaultLeft', x: 40, y: 380, w: 240, h: 520 }],
          },
          {
            name: 'phone-vault-right',
            crop: 'x 620..760, y 900..1050',
            stats: [{ label: 'vaultRight', x: 620, y: 900, w: 140, h: 150 }],
          },
          {
            name: 'phone-farwall-top',
            crop: 'x 360..660, y 1140..1190',
            stats: [{ label: 'farWallTop', x: 360, y: 1140, w: 300, h: 50 }],
          },
        ]
      : [
          {
            name: 'rig-vault-lantern',
            crop: 'x 480..800, y 20..120',
            stats: [
              { label: 'lanternLeft', x: 480, y: 20, w: 120, h: 100 },
              { label: 'lanternRight', x: 680, y: 20, w: 120, h: 100 },
            ],
          },
          {
            name: 'rig-vault-arc-left',
            crop: 'x 490..610, y 120..260',
            stats: [{ label: 'arcLeft', x: 490, y: 120, w: 120, h: 140 }],
          },
          {
            name: 'rig-farwall-top',
            crop: 'x 560..720, y 330..360',
            stats: [{ label: 'farWallTop', x: 560, y: 330, w: 160, h: 30 }],
          },
        ];
    const result = await page.evaluate(
      analyzeRegions,
      regions.map((r) => ({ ...r, src })),
    );
    console.log(`\n== ${path}`);
    for (const region of result) {
      console.log(` ${region.name} (${region.crop})`);
      for (const [label, s] of Object.entries(region.stats)) {
        console.log(
          `   ${label}: mean ${s.mean} p10 ${s.p10} p90 ${s.p90} | tone-runs p50 ${s.runP50}px p90 ${s.runP90}px | AC peaks(lag,r): ${JSON.stringify(s.acTop)}`,
        );
      }
    }
  }
  await browser.close();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
