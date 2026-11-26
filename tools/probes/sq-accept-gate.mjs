// tools/probes/sq-accept-gate.mjs — the sqdirt round's acceptance gate: the reviewer's
// excess-field-speckle metric (round-1/metric-proposed.md, decoded from astra-6.2's Appendix-B
// artifact) adopted as-is by the round-1 ruling (Brief 3). COMMITTED code, RUN only at the
// round's gate phases — never by CI, no runtime JS, no camera-control feature. The page-side
// sun access is DEC-054's rig (src/main.ts:817 — the URL-gated `__sqShadowDebug` = { sun, hemi,
// renderer }, registered only with sqdebug=1; the param exposes the rig and changes no render
// state). Conventions lifted from tools/probes/sq-census-capture.mjs (the fresh-port static
// serve, the SERVED-BUNDLE byte-verify — the stale-4174 trap, the FRESH PAGE per capture, the
// goldens' overlay-hide list, the #scene viewport assert, the provenance law) and
// tools/probes/sq-shadow-toggle.mjs (the sun access, the `sun.shadow.intensity` lever at
// capture); the index machinery adapts the Vault's confirm battery
// (probes/confirm/{sq-confirm-capture.mjs,speckle-index.mjs} — the browser decodes PNG, no node
// decoder exists; Rec.709 luma on the 8-bit sRGB bytes).
//
// The contract, one screen: at S0 (`#/?at=…&det=1&stop=S0` — det pins the epoch and the camera;
// the settled tier, the drawing-buffer dims and the DPR are asserted equal across each
// instant's captures) capture the four det= instants — the three owner instants (summer
// 2026-06-21T08:44Z, spring 2026-05-15T14:05Z, autumn 2026-10-17T11:48Z) and the dec-noon
// golden 2026-12-21T10:00Z. Per instant: B = shadows on (a pair of fresh captures), O = the
// same state with only `sun.shadow.intensity = 0` at capture (a pair of fresh pages), C =
// candidate shadows on = the served dist's committed state (one capture). The FROZEN MASK, the
// contract's visible-surface green-wall fields: the band of normalized pixel centres
// x ∈ [0.10, 0.37) × y ∈ [0.47, 0.55), top-left origin (the portals and the column sit outside
// the band by its own definition), minus the panes (L < 120, dilated 3 drawing-buffer px) and
// the dressings (L > 200), eroded 3 drawing-buffer px in every direction (Chebyshev). The mask
// is built ONCE per instant from the B pair-mean luma — no candidate-luma threshold — and
// reused unchanged for B/O/C; the mask PNG + the sample count land next to the plates. The
// score, on 8-bit sRGB bytes: L = 0.2126R + 0.7152G + 0.0722B and
// S(I) = mean over the mask of |L − mean5×5(L)| with a centred box. ε = the larger absolute
// within-pair score difference of the B/O pairs. VERDICT: an owner instant needs a nonempty
// mask and S(B) − S(O) > ε or it reports «not measurable», not a pass; pass iff
// S(C) ≤ S(O) + 0.30·[S(B) − S(O)] at each owner instant separately; at dec noon pass iff
// S(C) ≤ S(B) + ε. The gate gates fields only — not relief, not portals, not the sacred
// goldens. The three mechanical readings this instrument adds (the mask's reference frame, the
// dec-noon empty-mask escape, the drawing-buffer→PNG radius scale) are marked `inferred` in
// the verdict JSON.
//
//   node tools/probes/sq-accept-gate.mjs <outdir>           # the full gate run (B/O/C + verdict)
//   node tools/probes/sq-accept-gate.mjs --frames <outdir>  # one C capture per instant at S0
//                                                           # (the sitting's after-frames, the
//                                                           # same <instant>-C.png naming)
//   SQ_DIST=<dir> / SHOT_BASE=http://127.0.0.1:<port> …     # the census probe's conventions
//
// Frame storage law: the PNGs + the JSON land ONLY under probes/ (gitignored, local-only);
// this tool stages nothing and publishes nothing. A full gate run wipes ONLY its own OUT dir;
// the --frames mode evicts only the C plates it rewrites. Exit law: 0 only on an overall pass
// (a full gate) or an all-ok roster (--frames); any fail, «not measurable» or failed capture
// exits 1 — a gate fails loud.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const DIST = process.env.SQ_DIST ? resolve(process.env.SQ_DIST) : join(ROOT, 'dist');
const BASE = process.env.SHOT_BASE ?? '';
const VIEWPORT = { width: 1280, height: 720 };
const ROOM = 'square';

// The gate's four det= instants: the three owner instants + the dec-noon golden.
const INSTANTS = [
  { key: 'summer', at: '2026-06-21T08:44:00Z', owner: true },
  { key: 'spring', at: '2026-05-15T14:05:00Z', owner: true },
  { key: 'autumn', at: '2026-10-17T11:48:00Z', owner: true },
  { key: 'dec-noon', at: '2026-12-21T10:00:00Z', owner: false },
];
// Legs per instant: the B and O pairs (two fresh captures per control) + the single C capture.
const LEGS = ['B1', 'B2', 'O1', 'O2', 'C'];

// The frozen-mask + score constants (the contract's numbers, verbatim).
const BAND = { x0: 0.1, x1: 0.37, y0: 0.47, y1: 0.55 };
const PANE_LUMA = 120; // panes: L < 120, dilated before exclusion
const DRESSING_LUMA = 200; // dressings: L > 200 excluded
const EDGE_PX = 3; // drawing-buffer px: the pane dilation AND the mask erosion
const BOX = 5; // the centred box of mean5×5(L)
const GATE_PASS_SHARE = 0.3; // S(C) ≤ S(O) + 0.30·[S(B) − S(O)]

function fail(message, hint) {
  console.error(message + (hint === undefined ? '' : ` (${hint})`));
  process.exit(1);
}

// CLI: [outdir] | --frames <outdir>. The output dir must sit under probes/ (the frame law).
const argv = process.argv.slice(2);
const framesMode = argv[0] === '--frames';
const outArg = framesMode ? argv[1] : argv[0];
if (outArg === undefined || argv.length > (framesMode ? 2 : 1)) {
  fail(
    'usage: node tools/probes/sq-accept-gate.mjs <outdir>',
    'or: node tools/probes/sq-accept-gate.mjs --frames <outdir>',
  );
}
const OUT = resolve(outArg);
const relOut = relative(join(ROOT, 'probes'), OUT);
if (relOut === '' || relOut.startsWith('..')) {
  fail(`the output dir must sit under probes/ (gitignored, local-only): ${OUT}`);
}
const GATE_JSONL = join(OUT, 'gate.jsonl');
const VERDICT_JSON = join(OUT, 'verdict.json');
const FRAMES_JSONL = join(OUT, 'c-frames.jsonl');

// The goldens' own hide list (tests/e2e/golden.spec.ts via sq-census-capture.mjs).
const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, ' +
  '#edge-prompt, #hud, #caption, #caption-title, #load-line, #touch-rail { ' +
  'visibility: hidden !important; }';

const CONTENT_TYPES = new Map([
  ['.html', 'text/html'],
  ['.css', 'text/css'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.ktx2', 'image/ktx2'],
  ['.glb', 'model/gltf-binary'],
  ['.map', 'text/plain'],
  ['.woff2', 'font/woff2'],
  ['.png', 'image/png'],
]);

/** FRESH-PORT static serve of the build directory (the census serve law verbatim, the .css row
 * included). ASYNC: awaits 'listening'; port 0 = ephemeral, never recorded as a site address. */
async function serveDist() {
  const indexFile = join(DIST, 'index.html');
  if (!existsSync(indexFile)) fail(`no build at ${indexFile}`, 'run pnpm build first');
  const server = createServer((request, response) => {
    const pathOnly = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (pathOnly.includes('..')) {
      response.writeHead(400).end();
      return;
    }
    const target = pathOnly === '/' ? indexFile : join(DIST, pathOnly);
    let body = null;
    if (existsSync(target)) body = readFileSync(target);
    if (body === null && existsSync(indexFile)) body = readFileSync(indexFile);
    if (body === null) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': CONTENT_TYPES.get(extname(target)) ?? 'application/octet-stream',
    });
    response.end(body);
  });
  const listening = new Promise((resolvePromise, rejectPromise) => {
    server.once('listening', resolvePromise);
    server.once('error', rejectPromise);
  });
  server.listen(0, '127.0.0.1');
  await listening;
  return server;
}

/** SERVED-BUNDLE BYTE-VERIFY (the stale-preview trap, the census law): the square kit's
 * manifest, every committed artifact row, and the served entry HTML + its locally referenced
 * bundles must byte-match the dist build before any capture. */
async function verifyServed(base) {
  const committed = readFileSync(join(ROOT, 'public', 'assets', ROOM, 'manifest.json'));
  const fetched = await fetch(`${base}/assets/${ROOM}/manifest.json`);
  if (!fetched.ok) fail(`the served manifest of ${ROOM} is unreachable (${fetched.status})`);
  const servedManifest = Buffer.from(await fetched.arrayBuffer());
  if (!servedManifest.equals(committed)) {
    fail(
      `the served manifest of ${ROOM} differs from the committed one — the site on ${base} is ` +
        'STALE (the 4174 trap); shut it down and reshoot a freshly built, freshly served dist',
    );
  }
  const manifest = JSON.parse(committed.toString('utf8'));
  const results = [];
  for (const row of manifest.files) {
    const resp = await fetch(`${base}/assets/${ROOM}/${row.path}`);
    if (!resp.ok) fail(`served artifact ${row.path} unreachable (${resp.status})`);
    const bytes = Buffer.from(await resp.arrayBuffer());
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== row.sha256 || bytes.length !== row.bytes) {
      fail(
        `served ${row.path} ${bytes.length} B ${digest} !== committed ${row.bytes} B ` +
          `${row.sha256} — the site on ${base} is STALE (the 4174 trap)`,
      );
    }
    results.push({ bytes: bytes.length, path: row.path, sha256: digest });
  }
  const entry = readFileSync(join(DIST, 'index.html'));
  const servedEntry = await (await fetch(`${base}/index.html`)).arrayBuffer();
  if (!Buffer.from(servedEntry).equals(entry)) {
    fail(`the served index.html differs from ${relative(ROOT, join(DIST, 'index.html'))} — STALE`);
  }
  const refs = [...entry.toString('utf8').matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((ref) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) && !ref.startsWith('#'));
  const bundleSha = {};
  for (const ref of new Set(refs)) {
    const target = resolve(DIST, `.${ref.startsWith('/') ? ref : `/${ref}`}`);
    if (!existsSync(target)) fail(`the dist index.html references ${ref} which is missing`);
    const local = readFileSync(target);
    const served = Buffer.from(await (await fetch(`${base}${ref}`)).arrayBuffer());
    if (!served.equals(local)) fail(`the served ${ref} differs from the dist build — STALE`);
    bundleSha[ref] = createHash('sha256').update(served).digest('hex');
  }
  return {
    assets: results,
    bundles: Object.fromEntries(Object.entries(bundleSha).sort()),
    entrySha: createHash('sha256').update(entry).digest('hex'),
  };
}

/** The manifest row-set identity (the census law): sha256 over every row's sha256 in row order. */
function hashList(items) {
  const digest = createHash('sha256');
  for (const { sha256: value } of items) digest.update(value);
  return digest.digest('hex');
}

/** The tree identity provenance records: the cwd tree's git HEAD sha (read-only local call). */
function treeHeadSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (error) {
    return fail(`cannot resolve the tree's HEAD sha (read-only git rev-parse): ${error.message}`);
  }
}

// The in-page functions (serialized by Playwright; they must stay self-contained).
const SETTLE_FN = () => {
  const scrub = document.querySelector('#scrub');
  const kit = document.documentElement.getAttribute('data-square-kit');
  return scrub !== null && kit === 'ready';
};
const QUERY = (at) => `#/?at=${at}&det=1&stop=S0&hud=1&sqdebug=1`;
const READ_RIG = () => {
  const rig = window.__sqShadowDebug;
  const hud = document.querySelector('#hud');
  return {
    hook: rig !== undefined,
    shadowIntensity: rig === undefined ? null : rig.sun.shadow.intensity,
    dprDevice: window.devicePixelRatio,
    dprRenderer: rig === undefined ? null : rig.renderer.getPixelRatio(),
    drawingBuffer:
      rig === undefined ? null : [rig.renderer.domElement.width, rig.renderer.domElement.height],
    tier: hud === null ? null : hud.getAttribute('data-tier'),
    tierSource: hud === null ? null : hud.getAttribute('data-tier-source'),
  };
};
const SET_INTENSITY_0 = () => {
  window.__sqShadowDebug.sun.shadow.intensity = 0;
};
const READ_INTENSITY = () => {
  const rig = window.__sqShadowDebug;
  return rig === undefined ? null : rig.sun.shadow.intensity;
};
const DECODE_PNG = async (src) => {
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
  return { w: canvas.width, h: canvas.height, data: image.data };
};
const MASK_TO_PNG = ({ bytes, w, h }) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  const image = ctx.createImageData(w, h);
  for (let p = 0; p < w * h; p += 1) {
    const v = bytes[p] === 1 ? 255 : 0;
    image.data[p * 4] = v;
    image.data[p * 4 + 1] = v;
    image.data[p * 4 + 2] = v;
    image.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
};

/** One capture leg = one FRESH PAGE (the no-state-bleed law): settle, assert the #scene
 * viewport, read the rig, apply the O leg's intensity=0 mutation, hide the overlays, shoot. */
async function captureLeg(browser, base, instant, leg) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const file = `${instant.key}-${leg}.png`;
  try {
    await page.goto(`${base}/${QUERY(instant.at)}`, { waitUntil: 'load' });
    const settled = await page
      .waitForFunction(SETTLE_FN, undefined, { timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    if (!settled) throw new Error('the square kit never settled (#scrub / data-square-kit)');
    const box = await page.locator('#scene').boundingBox();
    if (
      box === null ||
      box.x !== 0 ||
      box.y !== 0 ||
      box.width !== VIEWPORT.width ||
      box.height !== VIEWPORT.height
    ) {
      throw new Error('#scene does not fill the viewport exactly (the DPR crop trap)');
    }
    await page.waitForTimeout(300);
    const rig = await page.evaluate(READ_RIG);
    if (!rig.hook) throw new Error('the __sqShadowDebug rig is missing (sqdebug=1 did not land)');
    let postMutate = null;
    if (leg.startsWith('O')) {
      await page.evaluate(SET_INTENSITY_0);
      await page.waitForTimeout(500);
      postMutate = await page.evaluate(READ_INTENSITY);
      if (postMutate !== 0) {
        throw new Error(`the intensity=0 mutation did not take (read ${postMutate})`);
      }
    }
    await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(OUT, file),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    return { leg, file, ok: true, rig, postMutate };
  } catch (error) {
    return {
      leg,
      file,
      ok: false,
      rig: null,
      postMutate: null,
      error: (error instanceof Error ? error.message : String(error)).split('\n')[0],
    };
  } finally {
    await page.close();
  }
}

// --- The pixel machinery (node side; the frames arrive decoded by the browser) -------------

/** Rec.709 luma on the 8-bit sRGB bytes (the contract's L), full frame. */
function lumaOf(frame) {
  const { w, h, data } = frame;
  const L = new Float32Array(w * h);
  for (let p = 0, i = 0; p < w * h; p += 1, i += 4) {
    L[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return L;
}

/** The centred box mean via an integral image, windows clamped at the frame borders (the mask
 * is interior, so in practice every window holds the full 25 samples). */
function boxMean(L, w, h, radius) {
  const stride = w + 1;
  const prefix = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < w; x += 1) {
      rowSum += L[y * w + x];
      prefix[(y + 1) * stride + (x + 1)] = prefix[y * stride + (x + 1)] + rowSum;
    }
  }
  const mean = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        prefix[(y1 + 1) * stride + (x1 + 1)] -
        prefix[y0 * stride + (x1 + 1)] -
        prefix[(y1 + 1) * stride + x0] +
        prefix[y0 * stride + x0];
      mean[y * w + x] = sum / area;
    }
  }
  return mean;
}

/** Chebyshev (square) morphology — "in every direction". Out-of-bounds never constrains. */
function dilate(src, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let hit = 0;
      for (let dy = -r; dy <= r && hit === 0; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < w && src[yy * w + xx] === 1) {
            hit = 1;
            break;
          }
        }
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}

function erode(src, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let keep = 1;
      for (let dy = -r; dy <= r && keep === 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < w && src[yy * w + xx] === 0) {
            keep = 0;
            break;
          }
        }
      }
      out[y * w + x] = keep;
    }
  }
  return out;
}

/** The band law: normalized pixel centres x ∈ [x0, x1), y ∈ [y0, y1), top-left origin. */
function bandMask(w, h) {
  const band = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const cy = (y + 0.5) / h;
    if (cy < BAND.y0 || cy >= BAND.y1) continue;
    for (let x = 0; x < w; x += 1) {
      const cx = (x + 0.5) / w;
      if (cx >= BAND.x0 && cx < BAND.x1) band[y * w + x] = 1;
    }
  }
  return band;
}

/** The FROZEN MASK from the reference luma (the B pair-mean — inferred): band, minus the
 * dilated panes, minus the dressings, eroded. Returned with the per-step counts. */
function buildMask(Lref, w, h, r) {
  const band = bandMask(w, h);
  const pane = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) pane[p] = Lref[p] < PANE_LUMA ? 1 : 0;
  const paneDilated = dilate(pane, w, h, r);
  const base = new Uint8Array(w * h);
  let bandTotal = 0;
  let maskedPane = 0;
  let maskedDressing = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (band[p] !== 1) continue;
    bandTotal += 1;
    if (paneDilated[p] === 1) {
      maskedPane += 1;
      continue;
    }
    if (Lref[p] > DRESSING_LUMA) {
      maskedDressing += 1;
      continue;
    }
    base[p] = 1;
  }
  const mask = erode(base, w, h, r);
  let count = 0;
  for (let p = 0; p < w * h; p += 1) count += mask[p];
  return { mask, bandTotal, maskedPane, maskedDressing, count };
}

/** S(I) = mean over the mask of |L − mean5×5(L)|. */
function score(mask, L, box5) {
  let sum = 0;
  let n = 0;
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p] !== 1) continue;
    sum += Math.abs(L[p] - box5[p]);
    n += 1;
  }
  return n === 0 ? null : sum / n;
}

/** The contract fixes the mask radii in drawing-buffer px; the pixel math runs on the capture
 * (a CSS-px PNG at the harness's deviceScaleFactor 1), so the radii scale buffer→PNG
 * (inferred; exactly 3/3/2 at the designated-device T1 1280×720 / DPR 1, where they coincide). */
const radiusPng = (pngW, bufW, px) => Math.max(1, Math.round((px * pngW) / bufW));

const fmt = (v) => (v === null ? '—' : v.toFixed(3));

// --- The run --------------------------------------------------------------------------------

async function resolveBase(serveHandle) {
  let base = BASE;
  if (serveHandle !== null) {
    const address = serveHandle.address();
    if (address === null || address.port === undefined) fail('serveDist produced no address');
    base = `http://127.0.0.1:${address.port}`;
  }
  return base;
}

if (framesMode) {
  // The --frames leg: evict only the C plates it rewrites (the census restricted-run law); the
  // roster is always the full four instants, so its own jsonl resets with it.
  const serveHandle = BASE === '' ? await serveDist() : null;
  const base = await resolveBase(serveHandle);
  mkdirSync(OUT, { recursive: true });
  console.log(`frames leg: C plates for ${INSTANTS.length} instants -> ${relOut} via ${base}`);
  const served = await verifyServed(base);
  const headSha = treeHeadSha();
  for (const instant of INSTANTS) rmSync(join(OUT, `${instant.key}-C.png`), { force: true });
  writeFileSync(FRAMES_JSONL, '');
  const browser = await chromium.launch();
  let failures = 0;
  try {
    for (const instant of INSTANTS) {
      const capture = await captureLeg(browser, base, instant, 'C');
      const row = { kind: 'capture', instant: instant.key, at: instant.at, ...capture };
      appendFileSync(FRAMES_JSONL, `${JSON.stringify(row)}\n`);
      console.log(`shot ${instant.key}-C ${capture.ok ? 'ok' : `FAILED: ${capture.error}`}`);
      if (!capture.ok) failures += 1;
    }
  } finally {
    await browser.close();
    if (serveHandle !== null) await new Promise((r) => serveHandle.close(r));
  }
  appendFileSync(
    FRAMES_JSONL,
    `${JSON.stringify({
      kind: 'provenance',
      treeHeadSha: headSha,
      detAt: Object.fromEntries(INSTANTS.map((i) => [i.key, i.at])),
      served: { bundles: served.bundles, entrySha: served.entrySha },
      viewport: VIEWPORT,
      naming: '<instant>-C.png — the gate C-plate naming',
    })}\n`,
  );
  console.log(`frames done: ${INSTANTS.length - failures}/${INSTANTS.length} C plates in ${OUT}`);
  if (failures > 0) process.exitCode = 1;
} else {
  // The full gate run: a FULL run wipes ONLY its own OUT dir before writing.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const serveHandle = BASE === '' ? await serveDist() : null;
  const base = await resolveBase(serveHandle);
  console.log(`gate: serving ${relative(ROOT, DIST)} on ${base}`);
  const served = await verifyServed(base);
  const headSha = treeHeadSha();
  const glbRow = served.assets.find((row) => row.path.endsWith('.glb'));
  writeFileSync(GATE_JSONL, '');
  const appendRow = (row) => appendFileSync(GATE_JSONL, `${JSON.stringify(row)}\n`);

  const browser = await chromium.launch();
  const decodePage = await browser.newPage();
  const instantRows = [];
  let provenance = null;
  try {
    for (const instant of INSTANTS) {
      const captures = [];
      for (const leg of LEGS) {
        const capture = await captureLeg(browser, base, instant, leg);
        appendRow({ kind: 'capture', instant: instant.key, at: instant.at, ...capture });
        captures.push(capture);
        console.log(`shot ${instant.key}-${leg} ${capture.ok ? 'ok' : `FAILED: ${capture.error}`}`);
      }
      // The comparison's fixed rig: epoch + camera ride the shared query; tier, drawing-buffer
      // dims and DPR must match across the instant's captures or the instant fails loud.
      const rigs = captures.filter((c) => c.ok).map((c) => JSON.stringify(c.rig));
      const uniform = rigs.length === LEGS.length && rigs.every((r) => r === rigs[0]);
      const firstRig = captures.find((c) => c.ok)?.rig ?? null;
      provenance = provenance ?? {
        treeHeadSha: headSha,
        detAt: Object.fromEntries(INSTANTS.map((i) => [i.key, i.at])),
        tier: firstRig?.tier ?? null,
        tierSource: firstRig?.tierSource ?? null,
        drawingBuffer: firstRig?.drawingBuffer ?? null,
        dpr:
          firstRig === null ? null : { device: firstRig.dprDevice, renderer: firstRig.dprRenderer },
        viewport: VIEWPORT,
        dist: {
          rel: relative(ROOT, DIST),
          glbSha: glbRow?.sha256 ?? null,
          manifestRowsSha: hashList(served.assets),
        },
        served: { bundles: served.bundles, entrySha: served.entrySha },
        band: BAND,
        paneLuma: PANE_LUMA,
        dressingLuma: DRESSING_LUMA,
        edgeDrawingBufferPx: EDGE_PX,
        boxPx: BOX,
        gatePassShare: GATE_PASS_SHARE,
      };
      const row = {
        kind: 'instant',
        key: instant.key,
        at: instant.at,
        owner: instant.owner,
        captures: captures.map(({ leg, file, ok, error }) => ({ leg, file, ok, error })),
        uniform,
        maskFile: `${instant.key}-mask.png`,
        maskCount: 0,
        bandTotal: 0,
        maskedPane: 0,
        maskedDressing: 0,
        radii: null,
        scores: { B1: null, B2: null, O1: null, O2: null, C: null },
        pairMeans: { B: null, O: null },
        epsilon: null,
        rule: instant.owner
          ? 'nonempty mask && S(B)−S(O) > ε && S(C) ≤ S(O) + 0.30·[S(B)−S(O)]'
          : 'nonempty mask && S(C) ≤ S(B) + ε',
        verdict: 'fail',
      };
      try {
        if (!uniform) {
          throw new Error('the rig (tier/drawing-buffer/DPR) drifted across the instant');
        }
        const bufW = firstRig.drawingBuffer[0];
        const frames = {};
        for (const capture of captures) {
          const decoded = await decodePage.evaluate(
            DECODE_PNG,
            `data:image/png;base64,${readFileSync(join(OUT, capture.file)).toString('base64')}`,
          );
          frames[capture.leg] = { w: decoded.w, h: decoded.h, L: lumaOf(decoded) };
        }
        const { w, h } = frames.C;
        if (w !== VIEWPORT.width || h !== VIEWPORT.height) {
          throw new Error(`unexpected capture dims ${w}×${h} (drawing buffer ${bufW} wide)`);
        }
        const r = radiusPng(w, bufW, EDGE_PX);
        const boxR = radiusPng(w, bufW, (BOX - 1) / 2);
        row.radii = { paneDilate: r, erode: r, box: boxR };
        // The frozen mask: the B pair-mean luma is the reference (inferred); saved once per
        // instant and reused unchanged for B/O/C — no candidate-luma threshold.
        const Lref = new Float32Array(w * h);
        for (let p = 0; p < w * h; p += 1) Lref[p] = (frames.B1.L[p] + frames.B2.L[p]) / 2;
        const built = buildMask(Lref, w, h, r);
        row.maskCount = built.count;
        row.bandTotal = built.bandTotal;
        row.maskedPane = built.maskedPane;
        row.maskedDressing = built.maskedDressing;
        const maskPng = await decodePage.evaluate(MASK_TO_PNG, { bytes: built.mask, w, h });
        writeFileSync(join(OUT, row.maskFile), Buffer.from(maskPng.split(',')[1], 'base64'));
        for (const leg of LEGS) {
          const box5 = boxMean(frames[leg].L, w, h, boxR);
          row.scores[leg] = score(built.mask, frames[leg].L, box5);
        }
        const allScored = LEGS.every((leg) => row.scores[leg] !== null);
        const { B: sb, O: so } = {
          B: (row.scores.B1 + row.scores.B2) / 2,
          O: (row.scores.O1 + row.scores.O2) / 2,
        };
        const sc = row.scores.C;
        if (row.maskCount === 0) {
          row.verdict = 'not measurable'; // the escape; extended to dec noon (inferred)
        } else if (!allScored) {
          row.verdict = 'fail';
        } else {
          row.pairMeans.B = sb;
          row.pairMeans.O = so;
          row.epsilon = Math.max(
            Math.abs(row.scores.B1 - row.scores.B2),
            Math.abs(row.scores.O1 - row.scores.O2),
          );
          if (instant.owner) {
            row.verdict = !(sb - so > row.epsilon)
              ? 'not measurable'
              : sc <= so + GATE_PASS_SHARE * (sb - so)
                ? 'pass'
                : 'fail';
          } else {
            row.verdict = sc <= sb + row.epsilon ? 'pass' : 'fail';
          }
        }
      } catch (error) {
        row.verdict = 'fail';
        row.error = (error instanceof Error ? error.message : String(error)).split('\n')[0];
      }
      appendRow(row);
      instantRows.push(row);
      console.log(
        `${instant.key.padEnd(9)} S(B) ${fmt(row.pairMeans.B)}  S(O) ${fmt(row.pairMeans.O)}  ` +
          `S(C) ${fmt(row.scores.C)}  ε ${fmt(row.epsilon)}  ${row.verdict}`,
      );
    }
  } finally {
    await browser.close();
    if (serveHandle !== null) await new Promise((r) => serveHandle.close(r));
  }
  const overall = instantRows.every((row) => row.verdict === 'pass') ? 'pass' : 'fail';
  writeFileSync(
    VERDICT_JSON,
    `${JSON.stringify(
      {
        gate: 'excess-field-speckle',
        contract:
          'vasyapym-Vault/03-1_projects/hermitage-3d-2026-11-26-sq-shadow-dirt/' +
          'round-1/metric-proposed.md',
        verdict: overall,
        instants: instantRows,
        inferred: [
          'the frozen mask builds from the B pair-mean luma ' +
            '(the contract names no reference frame)',
          'the dec-noon empty-mask case reports «not measurable» ' +
            '(the escape is worded for the owner instants)',
          'the drawing-buffer radii scale to the PNG capture (equal at T1 1280×720 / DPR 1)',
        ],
        provenance,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`overall ${overall} — ${OUT}`);
  if (overall !== 'pass') process.exitCode = 1;
}
