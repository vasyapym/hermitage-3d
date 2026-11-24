// tools/probes/sq-census-capture.mjs — the Palace Square's day-look census battery (COMMITTED
// code, authored by the round; RUN only at the round's capture phases — never by CI, no runtime
// JS, no camera-control feature). Provenance: tools/probes/rg-f3-capture.mjs (the fresh-port
// static serve, the SERVED-BUNDLE byte-verify, the FRESH PAGE per shot, the overlay hide and the
// provenance law) — the square is the resident route '/', so the shots ride `#/?at=…&det=1&stop=…`
// exactly as the square goldens seed them (tests/e2e/golden.spec.ts, no hud param).
//
//   node tools/probes/sq-census-capture.mjs                     # battery into probes/sq-census-after
//   SQ_ROUND=before node tools/probes/sq-census-capture.mjs     # before-battery into probes/sq-census-before
//   SQ_ONLY=dec-noon-S1,dec-noon-drag-s1-left node ...          # RESTRICT (recorded NON-GATING)
//   SHOT_BASE=http://127.0.0.1:<port> node ...                  # shoot an ALREADY-served dist
//   SQ_DIST=<dir> node ...                                      # serve that dir instead of dist/
//
// The roster (the recorded 13-frame day battery, square-next's exhibit class, + the portal's
// arch-read pair): five rail stops × the two instrument noons (dec 2026-12-21T10:00Z,
// june 2026-06-21T12:00Z — the committed golden instants), three look-drag vantages at the
// june noon, and two look-drag vantages at S1 for the portal's arch read (the owner's IMG_0022
// sighting). A drag plate physically drags the pointer 437 px (≈ 20° by the look law's
// 33°/viewport-height sensitivity, inside every stop's ±25..35 yaw limit) and waits out the
// ease (5 TAU) before the shot; the name records the POINTER direction (grab-the-world: the
// look swings the other way).
//
// Frame storage law: frames + provenance.json land ONLY under probes/ (gitignored, local-only);
// this tool stages nothing and publishes nothing. A full run wipes ONLY its own OUT dir before
// writing; a restricted (SQ_ONLY) run evicts ONLY the plates it rewrites.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const ROUND = (process.env.SQ_ROUND ?? 'after').trim();
if (!/^[a-z0-9-]+$/.test(ROUND)) {
  fail(`bad SQ_ROUND name ${JSON.stringify(process.env.SQ_ROUND)} (regex ^[a-z0-9-]+$)`);
}
const OUT = join(ROOT, 'probes', `sq-census-${ROUND}`);
const DIST = process.env.SQ_DIST ? resolve(process.env.SQ_DIST) : join(ROOT, 'dist');
const BASE = process.env.SHOT_BASE ?? '';
const VIEWPORT = { width: 1280, height: 720 };
const ROOM = 'square';

// The committed golden instants (tests/e2e/golden.spec.ts: noon + the S0b dec-noon row).
const DET_AT = {
  decNoon: '2026-12-21T10:00:00Z',
  juneNoon: '2026-06-21T12:00:00Z',
};
const STOPS = ['S0', 'S0b', 'Sh', 'Shb', 'S1'];
// 437 px ≈ 20.05° at 720 px (the look law's 33°/viewport sensitivity, mouse pointer).
const DRAG_PX = 437;
const shot = (name, at, stop, drag = null) => ({
  name,
  path: `#/?at=${at}&det=1&stop=${stop}`,
  drag,
});
const BATTERY = [
  ...STOPS.map((stop) => shot(`dec-noon-${stop}`, DET_AT.decNoon, stop)),
  ...STOPS.map((stop) => shot(`june-noon-${stop}`, DET_AT.juneNoon, stop)),
  shot('june-noon-drag-s0-left', DET_AT.juneNoon, 'S0', { dx: -DRAG_PX }),
  shot('june-noon-drag-s0-right', DET_AT.juneNoon, 'S0', { dx: DRAG_PX }),
  shot('june-noon-drag-s0b-right', DET_AT.juneNoon, 'S0b', { dx: DRAG_PX }),
  shot('dec-noon-drag-s1-left', DET_AT.decNoon, 'S1', { dx: -DRAG_PX }),
  shot('dec-noon-drag-s1-right', DET_AT.decNoon, 'S1', { dx: DRAG_PX }),
];

function fail(message, hint) {
  console.error(message + (hint === undefined ? '' : ` (${hint})`));
  process.exit(1);
}

// SQ_ONLY (the rg-round-shots law): a comma list restricts the battery; UNKNOWN names fail
// loud (a typo must never silently measure nothing), and an EMPTY result fails too.
const onlyNames = (process.env.SQ_ONLY ?? '').split(',').filter(Boolean);
const validNames = new Set(BATTERY.map((s) => s.name));
const unknown = onlyNames.filter((name) => !validNames.has(name));
if (unknown.length > 0) {
  fail(
    `SQ_ONLY names unknown plates: ${unknown.join(', ')}`,
    `valid names: ${[...validNames].sort().join(', ')}`,
  );
}
const SHOTS = onlyNames.length === 0 ? BATTERY : BATTERY.filter((s) => onlyNames.includes(s.name));
if (SHOTS.length === 0) fail('SQ_ONLY selected zero shots');

// The goldens' own hide list (tests/e2e/golden.spec.ts) — the plates frame like the goldens.
const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, ' +
  '#edge-prompt, #hud, #caption, #caption-title, #load-line, #touch-rail { ' +
  'visibility: hidden !important; }';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The compound deterministic kick: `sha256-of-shas` over every row's sha256 in manifest row
 * order (the row-set identity that outlives any one file). */
function hashList(items) {
  const digest = createHash('sha256');
  for (const { sha256: value } of items) digest.update(value);
  return digest.digest('hex');
}

/** FRESH-PORT static serve of the build directory (the rg-f3 serve law verbatim, the .css row
 * included — the unstyled-plate trap). ASYNC: awaits the 'listening' event (port 0 = ephemeral,
 * never recorded as a site address). The SERVER HANDLE is closed by the run's outer finally. */
async function serveDist() {
  const indexFile = join(DIST, 'index.html');
  if (!existsSync(indexFile)) {
    fail(`no build at ${indexFile}`, 'run pnpm build first');
  }
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

/** SERVED-BUNDLE BYTE-VERIFY (the stale-preview trap): the square kit's manifest, every
 * committed artifact row, AND the served entry HTML + its locally referenced bundles must
 * byte-match the dist build before any shot. */
async function verifyServed(base) {
  const committed = readFileSync(join(ROOT, 'public', 'assets', ROOM, 'manifest.json'));
  const fetched = await fetch(`${base}/assets/${ROOM}/manifest.json`);
  if (!fetched.ok) fail(`the served manifest of ${ROOM} is unreachable (${fetched.status})`);
  const servedManifest = Buffer.from(await fetched.arrayBuffer());
  if (!servedManifest.equals(committed)) {
    fail(
      `the served manifest of ${ROOM} differs from the committed one — ` +
        `the site on ${base} is STALE (the 4174 trap); shut it down and reshoot a ` +
        'freshly built, freshly served dist',
    );
  }
  const manifest = JSON.parse(committed.toString('utf8'));
  const results = [];
  for (const row of manifest.files) {
    const resp = await fetch(`${base}/assets/${ROOM}/${row.path}`);
    if (!resp.ok) fail(`served artifact ${row.path} unreachable (${resp.status})`);
    const bytes = Buffer.from(await resp.arrayBuffer());
    const digest = sha256(bytes);
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
    bundleSha[ref] = sha256(served);
  }
  return {
    assets: results,
    bundles: Object.fromEntries(Object.entries(bundleSha).sort()),
    entrySha: sha256(entry),
  };
}

/** The tree identity provenance records: the cwd tree's git HEAD sha (read-only local call). */
function treeHeadSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (error) {
    return fail(`cannot resolve the tree's HEAD sha (read-only git rev-parse): ${error.message}`);
  }
}

let serveHandle = null;
let base = BASE;
if (!base) {
  serveHandle = await serveDist();
  const address = serveHandle.address();
  if (address === null || address.port === undefined) {
    fail('serveDist produced no address after listening');
  }
  base = `http://127.0.0.1:${address.port}`;
}
const treeSha = treeHeadSha();

// Wipe law: a FULL run wipes ONLY its own OUT dir; a RESTRICTED run evicts only the plates it
// rewrites. The wipe target is asserted to sit under probes/sq-census- with the exact suffix.
if (!OUT.startsWith(join(ROOT, 'probes', 'sq-census-')) || join(OUT) === join(ROOT, 'probes')) {
  fail(`refusing to operate outside the sq-census battery dirs: ${OUT}`);
}
if (onlyNames.length === 0) {
  rmSync(OUT, { recursive: true, force: true });
} else {
  for (const shotRow of SHOTS) rmSync(join(OUT, `${shotRow.name}.png`), { force: true });
}
mkdirSync(OUT, { recursive: true });

console.log(
  `battery ${ROUND}: resident ${ROOM}, ${SHOTS.length} plates -> probes/sq-census-${ROUND} via ${base}`,
);
const served = await verifyServed(base);
const glbRow = served.assets.find((row) => row.path.endsWith('.glb'));

const browser = await chromium.launch();
const results = [];
let failures = 0;
try {
  for (const shotRow of SHOTS) {
    // FRESH PAGE per shot — the same-base goto is a fragment navigation (transport trap 4).
    const page = await browser.newPage({ viewport: VIEWPORT });
    try {
      await page.goto(`${base}/${shotRow.path}`, { waitUntil: 'load' });
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
      if (
        sceneBox === null ||
        sceneBox.x !== 0 ||
        sceneBox.y !== 0 ||
        sceneBox.width !== VIEWPORT.width ||
        sceneBox.height !== VIEWPORT.height
      ) {
        throw new Error('#scene does not fill the viewport exactly (the DPR crop trap)');
      }
      // The HUD's whole-frame aggregates (data-draws / data-tris) ride every provenance row —
      // the shadow-enabled cap re-derivation reads its measured values from here.
      const hudDraws = Number(await page.getAttribute('#hud', 'data-draws'));
      const hudTris = Number(await page.getAttribute('#hud', 'data-tris'));
      await page.waitForTimeout(300);
      if (shotRow.drag !== null) {
        const cx = VIEWPORT.width / 2;
        const cy = VIEWPORT.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + shotRow.drag.dx, cy, { steps: 8 });
        await page.mouse.up();
        // The ease is visually settled after ~5 TAU (100 ms each) — wait it out plus a frame.
        await page.waitForTimeout(800);
      }
      await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(OUT, `${shotRow.name}.png`),
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });
      shotRow.draws = hudDraws;
      shotRow.tris = hudTris;
      results.push({ ...shotRow, file: `${shotRow.name}.png`, ok: true });
      console.log(`shot ${shotRow.name} ok`);
    } catch (e) {
      failures += 1;
      const why = e instanceof Error ? e.message.split('\n')[0] : String(e);
      results.push({ ...shotRow, file: `${shotRow.name}.png`, ok: false, error: why });
      console.log(`shot ${shotRow.name} FAILED: ${why}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (serveHandle !== null) {
    await new Promise((resolveClose) => serveHandle.close(resolveClose));
  }
}

// Provenance (deterministic: NO endpoints, no clock — repo-relative dir identity, the manifest
// row-set compound sha, the served glb sha, the tree HEAD, and per-frame rows). A restricted run
// MERGES its rows into the existing provenance so a partial re-shoot never drops other plates.
const relDist = relative(ROOT, DIST) || 'dist';
const manifestRowsSha = hashList(served.assets);
const prior = existsSync(join(OUT, 'provenance.json'))
  ? JSON.parse(readFileSync(join(OUT, 'provenance.json'), 'utf8'))
  : null;
const priorRows =
  prior &&
  prior.round === `sq-census-${ROUND}` &&
  prior.dist?.rel === relDist &&
  prior.manifestRowsSha === manifestRowsSha &&
  Array.isArray(prior.shots) &&
  prior.shots.every(
    (row) =>
      row &&
      typeof row.name === 'string' &&
      typeof row.file === 'string' &&
      typeof row.ok === 'boolean',
  )
    ? prior.shots
    : [];
const mergedByName = new Map(priorRows.map((row) => [row.name, row]));
for (const row of results) mergedByName.set(row.name, row);
const shots = [...mergedByName.values()].sort((a, b) => a.name.localeCompare(b.name));
const measuredNames = new Set(shots.filter((row) => row.ok).map((row) => row.name));
const fullRoster = BATTERY.every((shotRow) => measuredNames.has(shotRow.name));
const gating = fullRoster && failures === 0 ? 'gating' : 'NON-GATING';
writeFileSync(
  join(OUT, 'provenance.json'),
  `${JSON.stringify(
    {
      battery: BATTERY.map((shotRow) => shotRow.name),
      dist: { glbSha: glbRow?.sha256 ?? null, rel: relDist },
      detAt: DET_AT,
      dragPx: DRAG_PX,
      gating:
        gating === 'gating'
          ? 'gating (the full 15-roster measured ok this provenance)'
          : 'NON-GATING (a partial or failed roster)',
      manifestRowsSha,
      round: `sq-census-${ROUND}`,
      served: { bundles: served.bundles, entrySha: served.entrySha, rows: served.assets },
      shots,
      treeHeadSha: treeSha,
      viewport: VIEWPORT,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `gating class: ${gating === 'gating' ? 'gating (full 15-roster)' : 'NON-GATING (partial or failed roster)'}`,
);
console.log('battery done:', SHOTS.length - failures, '/', SHOTS.length, 'stills in', OUT);
if (failures > 0 && process.exitCode === undefined) process.exitCode = 1;
