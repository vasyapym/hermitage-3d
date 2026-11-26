// tools/probes/sq-shadow-toggle.mjs — the shadow lookup's decisive plate (sq-arch-day):
// serves the built dist, settles june-noon at S0, captures the SAME frame twice with
// `sun.shadow.intensity` toggled 0 → 1 through the DEV debug hook (`__sqShadowDebug`), and
// pixel-diffs the two captures in-page (the browser decodes PNG — no node decoder exists).
// A zero diff means the receivers never sample the shadow map (the lookup is dead — chase
// the coordinates/varying); a diff region shaped like a shadow means the shadows render but
// the fill's contrast eats them (the design lever, not a bug). The third capture repeats
// intensity 0: the determinism control (the same state must be pixel-identical; the dome's
// dither is position-deterministic). Also prints the rig's readouts through the hook.
//
//   node tools/probes/sq-shadow-toggle.mjs            # serves dist/ on an ephemeral port
//   SQ_DIST=<dir> SHOT_BASE=http://127.0.0.1:<p> …   # the census probe's conventions
//
// Frame storage law: the three plates land ONLY under probes/ (gitignored, local-only); this
// tool stages nothing and publishes nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const DIST = process.env.SQ_DIST ? resolve(process.env.SQ_DIST) : join(ROOT, 'dist');
const BASE = process.env.SHOT_BASE ?? '';
const OUT = join(ROOT, 'probes', 'sq-shadow-toggle');
const VIEWPORT = { width: 1280, height: 720 };
const QUERY = '#/?at=2026-06-21T12:00:00Z&det=1&stop=S0&hud=1&sqdebug=1';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

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

async function serveDist() {
  const indexFile = join(DIST, 'index.html');
  if (!existsSync(indexFile)) fail(`no build at ${indexFile} — run pnpm build first`);
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

let serveHandle = null;
let base = BASE;
if (!base) {
  serveHandle = await serveDist();
  const address = serveHandle.address();
  if (address === null || address.port === undefined) fail('serveDist produced no address');
  base = `http://127.0.0.1:${address.port}`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
try {
  mkdirSync(OUT, { recursive: true });
  await page.goto(`${base}/${QUERY}`, { waitUntil: 'load' });
  await page
    .waitForFunction(
      () => {
        const scrub = document.querySelector('#scrub');
        const kit = document.documentElement.getAttribute('data-square-kit');
        return scrub !== null && kit === 'ready';
      },
      undefined,
      { timeout: 90_000 },
    )
    .then(() => true)
    .catch(() => false);
  const sceneBox = await page.locator('#scene').boundingBox();
  if (sceneBox === null || sceneBox.width !== VIEWPORT.width) {
    fail('#scene does not fill the viewport');
  }
  await page.waitForTimeout(300);

  // The rig's readouts through the DEV hook, before anything is toggled.
  const readouts = await page.evaluate(() => {
    const rig = window.__sqShadowDebug;
    if (rig === undefined) return { hook: false };
    const { sun, hemi, renderer } = rig;
    const cam = sun.shadow.camera;
    return {
      hook: true,
      shadowMapEnabled: renderer.shadowMap.enabled,
      shadowMapType: String(renderer.shadowMap.type),
      sunCastShadow: sun.castShadow,
      shadowIntensity: sun.shadow.intensity,
      shadowMapSize: [sun.shadow.mapSize.x, sun.shadow.mapSize.y],
      frustum: [cam.left, cam.right, cam.top, cam.bottom, cam.near, cam.far],
      projection: cam.projectionMatrix.elements.slice(0, 6).map((v) => Number(v.toFixed(3))),
      sunPosition: sun.position.toArray().map((v) => Number(v.toFixed(1))),
      groundReceiveShadow: true,
      hemiIntensity: hemi.intensity,
    };
  });
  console.log(`readouts ${JSON.stringify(readouts)}`);

  const shot = async (intensity, name) => {
    await page.evaluate((v) => {
      window.__sqShadowDebug.sun.shadow.intensity = v;
    }, intensity);
    await page.waitForTimeout(400);
    const buffer = await page.screenshot({
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    writeFileSync(join(OUT, `${name}.png`), buffer);
    return buffer.toString('base64');
  };
  const a64 = await shot(0, 'intensity-0');
  const b64 = await shot(1, 'intensity-1');
  const c64 = await shot(0, 'intensity-0-again');

  const diff = await page.evaluate(
    async ({ a, b, c }) => {
      const w = 1280;
      const load = async (dataUrl) => {
        const img = new Image();
        img.src = `data:image/png;base64,${dataUrl}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const A = await load(a);
      const B = await load(b);
      const C = await load(c);
      let changed = 0;
      let minX = w;
      let maxX = -1;
      let minY = 720;
      let maxY = -1;
      for (let i = 0; i < A.length; i += 4) {
        const d =
          Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
        if (d > 12) {
          changed += 1;
          const p = i / 4;
          const x = p % w;
          const y = Math.floor(p / w);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      let determinism = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (
          Math.abs(A[i] - C[i]) > 2 ||
          Math.abs(A[i + 1] - C[i + 1]) > 2 ||
          Math.abs(A[i + 2] - C[i + 2]) > 2
        ) {
          determinism += 1;
        }
      }
      return {
        changed,
        region: changed > 0 ? { x0: minX, x1: maxX, y0: minY, y1: maxY } : null,
        determinism,
      };
    },
    { a: a64, b: b64, c: c64 },
  );
  console.log(`diff ${JSON.stringify(diff)}`);
} finally {
  await browser.close();
  if (serveHandle !== null) await new Promise((r) => serveHandle.close(r));
}
