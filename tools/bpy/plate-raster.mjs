// tools/bpy/plate-raster.mjs — the plate rasterizer, generalised at this second plate
// (the record's step-4 line: "the ornament svg → plate-raster.mjs × 2 palettes → ktx2;
// the glb materials reference them"). plafond-raster.mjs stays alone in its lane; this
// tool is its generalisation, (svg, palette, size) → raster, carrying the same mechanism
// (playwright chromium, the root-tag pin + preserveAspectRatio="none", the script/image
// ban, the ×2 sha256 determinism gate) and adding the palette substitution.
//
//   node tools/bpy/plate-raster.mjs <palette>    # palette ∈ {gilt, parquet}
//   node tools/bpy/plate-raster.mjs picture <svg> <out> <w> <h>
//     # the S1 picture plates (eagle 1024x1024, relief 2048x1024), no palette
//
// Draws tools/bpy/st-george-ornament.svg — ONE quadrant of the hall's 45.04 × 10.20 m
// ornament field — into tools/bpy/st-george-ornament-<palette>.png at the plate size
// 1024×1024. The mirror law turns the quadrant into the whole field at runtime: the glb
// maps the plate faces' albedo UVs to [0, 2]² under a MIRRORED_REPEAT sampler
// (tools/bpy/st-george.py), so the rasterizer draws the quadrant alone. The landscape
// viewBox squeezes to the square plate (preserveAspectRatio="none"); the plate faces'
// field mapping stretches it back to the world proportions.
//
// The SVG shapes carry class-only fills (.p1…​.p6, verified: no fill/stroke attributes);
// the palette rides an injected <style> block — the drawing file keeps zero colour.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const SVG_PATH = join(HERE, 'st-george-ornament.svg');
const SIZE = 1024;
// The step-4 plate size: the record's plate row (1024² each, ETC1S).

// The two palettes: the step-4 creative round's exact hexes (the vault's round-3
// harvest, ornament-palettes.txt) — one drawing read twice. The rationale lines are
// that round's own:
//   p1 field ground: warm ivory beside the plafond's #E0DCD2 / light oak; the largest
//      area, kept light so the p2 lines read at grazing angle.
//   p2 the one dark (fillets, fret strip, frames, mouldings, hearts): patinated bronze
//      / ebonised walnut; the value anchor both plates are read from.
//   p3 principal ornament (rings, cardinal leaves, paterae, medallion ring): old gold
//      / mahogany; mid value, never saturated.
//   p4 secondary (dentils, alternate leaves, corner boss, medallion dot): light gold /
//      honey oak; >= 12 L* from p3 and from p6 so the alternation survives ETC1S.
//   p5 heart accent only (medallion disc, rosette hearts): slate ties the ceiling to
//      the plafond; rosewood is the floor's sixteen-species nod.
//   p6 recessed panel ground: one step from p1 (deeper on gilt, paler on parquet) so
//      coffers read as panels behind the p2 moulding.
const PALETTES = {
  gilt: {
    p1: '#e6e0d3',
    p2: '#5a4733',
    p3: '#a98444',
    p4: '#cdac6b',
    p5: '#4e5a66',
    p6: '#d9cbab',
  },
  parquet: {
    p1: '#c4a77c',
    p2: '#3b2b22',
    p3: '#8a5a3b',
    p4: '#b98f5c',
    p5: '#7b4134',
    p6: '#d7c3a0',
  },
};

// The root tag pin: the replace must hit — a drifted drawing fails loud (exit 2), the
// plafond precedent's gate.
const ROOT_TAG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2250 512">';
const ROOT_TAG_STAGED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2250 512" preserveAspectRatio="none">';

/**
 * The generalised plate raster: (svg, palette, size) → raster. Returns the PNG bytes.
 * Deterministic for a pinned browser build; the ×2 sha256 pair is the gate.
 */
export async function rasterPlate({ svg, palette, size }) {
  if (/<(?:script|image)\b/i.test(svg)) {
    throw new Error('plate-raster: the SVG carries script/image elements — forbidden');
  }
  const style =
    '<style>' +
    Object.entries(palette)
      .map(([cls, hex]) => `.${cls}{fill:${hex}}`)
      .join('') +
    '</style>';
  const staged = svg.replace(ROOT_TAG, ROOT_TAG_STAGED + style);
  if (!staged.includes(style) || staged === svg) {
    throw new Error('plate-raster: the root svg tag drifted — the replace missed');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;` +
        `height:${size}px}</style>${staged}`,
      { waitUntil: 'load' },
    );
    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

// The picture plates (S1): ONE full drawing stretched to the canvas — the root tag is pinned by shape (a bare
// viewBox="0 0 W H" root, no preserveAspectRatio of its own), the same script/image ban, the same page/screenshot
// mechanism; no palette (the drawings carry their own colour). The face's UV mapping restores the proportions.
const PICTURE_ROOT = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+">/g;

export async function rasterPicture({ svg, width, height }) {
  if (/<(?:script|image)\b/i.test(svg)) {
    throw new Error('plate-raster: the SVG carries script/image elements — forbidden');
  }
  const roots = svg.match(PICTURE_ROOT);
  if (roots?.length !== 1 || /preserveAspectRatio/.test(svg)) {
    throw new Error(
      'plate-raster: the picture root svg tag drifted — one bare viewBox root is required',
    );
  }
  const staged = svg.replace(PICTURE_ROOT, (tag) =>
    tag.replace('>', ' preserveAspectRatio="none">'),
  );
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:${width}px;` +
        `height:${height}px}</style>${staged}`,
      { waitUntil: 'load' },
    );
    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

async function main() {
  // The picture mode first (the palette path below it is unchanged):
  // node tools/bpy/plate-raster.mjs picture <svg> <out.png> <w> <h>
  if (process.argv[2] === 'picture') {
    const [svgPath, outPath, w, h] = process.argv.slice(3);
    const width = Number(w);
    const height = Number(h);
    if (
      !svgPath ||
      !outPath ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0
    ) {
      console.error(
        'plate-raster: usage — node tools/bpy/plate-raster.mjs picture <svg> <out.png> <w> <h>',
      );
      process.exit(2);
    }
    const buf = await rasterPicture({ svg: readFileSync(svgPath, 'utf8'), width, height });
    writeFileSync(outPath, buf);
    console.log(
      `plate-raster: ${resolve(outPath)} ${buf.length} B sha256 ${createHash('sha256').update(buf).digest('hex')}`,
    );
    return;
  }
  const paletteName = process.argv[2];
  const palette = PALETTES[paletteName];
  if (!palette) {
    console.error(
      `plate-raster: usage — node tools/bpy/plate-raster.mjs <palette> ` +
        `(${Object.keys(PALETTES).join('|')})`,
    );
    process.exit(2);
  }
  const outPath = join(HERE, `st-george-ornament-${paletteName}.png`);
  const buf = await rasterPlate({ svg: readFileSync(SVG_PATH, 'utf8'), palette, size: SIZE });
  writeFileSync(outPath, buf);
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`plate-raster: ${resolve(outPath)} ${buf.length} B sha256 ${sha}`);
}

await main();
