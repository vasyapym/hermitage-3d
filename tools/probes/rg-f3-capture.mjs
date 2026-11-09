// tools/probes/rg-f3-capture.mjs — the RG-F3 21-plate capture battery (COMMITTED code,
// authored by the round; RUN only at the round's capture phases — never by CI, no runtime
// JS, no camera-control feature). Provenance: the local rg-look runner pattern
// (probes/rg-f2-after.mjs, plain `node <file>.mjs` + @playwright/test's chromium) — the
// working capability is: FRESH-PORT static serve of the built dist, SERVED-BUNDLE BYTE-
// VERIFY against the committed manifest + the dist entry/bundle BEFORE any shot (the
// 4174 stale-preview trap, covering the room assets AND the served app bundle), FRESH
// PAGE per shot (transport trap 4: a same-base goto is a fragment navigation),
// OVERLAY-HIDE, and the roomReady/ledger wait. Deterministic: the three det instants are
// constants; no wall-clock rides a URL or a filename.
//
//   node tools/probes/rg-f3-capture.mjs                    # after-battery into probes/rg-f3-after
//   RG_F3_ROUND=before node tools/probes/rg-f3-capture.mjs # before-battery into probes/rg-f3-before
//   SHOT_BASE=http://127.0.0.1:<port> node ...             # shoot an ALREADY-served dist (precedent)
//   RG_ONLY=g-g1-day,g-g1-night node ...                   # RESTRICT the battery (partial runs are
//                                                          # recorded NON-GATING in provenance)
//   RG_DIST=<dir> node ...                                 # serve that dir instead of dist/
//
// Frame storage law: frames + provenance.json land ONLY under probes/ (gitignored,
// local-only); this tool stages nothing and publishes nothing. A full run wipes ONLY its
// own OUT dir before writing; a restricted (RG_ONLY) run evicts ONLY the plates it
// rewrites (and their stale provenance rows) — the other battery's dir is never touched.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
// The battery dir: probes/rg-f3-<ROUND> (before|after are the round's real batteries;
// any throwaway name runs the same runner for smoke checks — local-only either way).
const ROUND = (process.env.RG_F3_ROUND ?? 'after').trim();
if (!/^[a-z0-9-]+$/.test(ROUND)) {
  fail(`bad RG_F3_ROUND name ${JSON.stringify(process.env.RG_F3_ROUND)} (regex ^[a-z0-9-]+$)`);
}
const OUT = join(ROOT, 'probes', `rg-f3-${ROUND}`);
const DIST = process.env.RG_DIST ? resolve(process.env.RG_DIST) : join(ROOT, 'dist');
const BASE = process.env.SHOT_BASE ?? '';
const VIEWPORT = { width: 1280, height: 720 };
const ROOM = 'rastrelli-gallery';

// The rg-f2 det instants, unchanged (goldens and the before/after reuse law ride them).
const DET_AT = {
  day: '2026-06-22T03:18:00Z',
  dusk: '2026-06-20T21:50:00Z',
  night: '2026-02-17T16:25:00Z',
};

// The canonical gating battery: exactly these 21 names; any other measured set
// (restricted RG_ONLY runs) is recorded NON-GATING alongside them.
const railCams = ['012', '055', '088'];
const BATTERY = [
  ...['G0', 'Gj', 'G1', 'G2'].map((stop) => ({
    name: `g-${stop.toLowerCase()}-day`,
    path: `#/gallery?at=${DET_AT.day}&det=1&stop=${stop}&hud=1`,
  })),
  { name: 'g-g1-dusk', path: `#/gallery?at=${DET_AT.dusk}&det=1&stop=G1&hud=1` },
  { name: 'g-g1-night', path: `#/gallery?at=${DET_AT.night}&det=1&stop=G1&hud=1` },
  { name: 'g-gj-dusk', path: `#/gallery?at=${DET_AT.dusk}&det=1&stop=Gj&hud=1` },
  { name: 'g-gj-night', path: `#/gallery?at=${DET_AT.night}&det=1&stop=Gj&hud=1` },
  { name: 'g-g0-dusk', path: `#/gallery?at=${DET_AT.dusk}&det=1&stop=G0&hud=1` },
  { name: 'g-g0-night', path: `#/gallery?at=${DET_AT.night}&det=1&stop=G0&hud=1` },
  { name: 'g-g2-dusk', path: `#/gallery?at=${DET_AT.dusk}&det=1&stop=G2&hud=1` },
  { name: 'g-g2-night', path: `#/gallery?at=${DET_AT.night}&det=1&stop=G2&hud=1` },
  ...railCams.flatMap((camID) => {
    const cam = `${camID.slice(0, 1)}.${camID.slice(1)}`;
    return [
      { name: `g-cam${camID}-day`, path: `#/gallery?at=${DET_AT.day}&det=1&cam=${cam}&hud=1` },
      { name: `g-cam${camID}-dusk`, path: `#/gallery?at=${DET_AT.dusk}&det=1&cam=${cam}&hud=1` },
      { name: `g-cam${camID}-night`, path: `#/gallery?at=${DET_AT.night}&det=1&cam=${cam}&hud=1` },
    ];
  }),
];

function fail(message, hint) {
  console.error(message + (hint === undefined ? '' : ` (${hint})`));
  process.exit(1);
}

// RG_ONLY (the rg-round-shots law): a comma list restricts the battery; UNKNOWN names
// fail loud (a typo must never silently measure nothing), and an EMPTY result fails too.
const onlyNames = (process.env.RG_ONLY ?? '').split(',').filter(Boolean);
const validNames = new Set(BATTERY.map((s) => s.name));
const unknown = onlyNames.filter((name) => !validNames.has(name));
if (unknown.length > 0) {
  fail(
    `RG_ONLY names unknown plates: ${unknown.join(', ')}`,
    `valid names: ${[...validNames].sort().join(', ')}`,
  );
}
const SHOTS = onlyNames.length === 0 ? BATTERY : BATTERY.filter((s) => onlyNames.includes(s.name));
if (SHOTS.length === 0) fail('RG_ONLY selected zero shots');

const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, ' +
  '#edge-prompt, #hud, #caption, #caption-title, #load-line { visibility: hidden !important; }';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The compound deterministic kick: `sha256-of-shas` over every row's sha256 in manifest
 * row order (the row-set identity that outlives any one file). */
function hashList(items) {
  const digest = createHash('sha256');
  for (const { sha256: value } of items) digest.update(value);
  return digest.digest('hex');
}

/** FRESH-PORT static serve of the build directory. ASYNC: awaits the 'listening' event
 * (port 0 = ephemeral, unpinned, never recorded as a site address), fails the run on a
 * serve error. SPA-ish fallback to index.html. The SERVER HANDLE is returned and closed
 * by the run's outer finally (finding: a live listener keeps Node alive). */
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
  // The .css row is the UNSTYLED-PLATE TRAP (found at the phase's first before-battery):
  // the map above lacking .css served every stylesheet as application/octet-stream, this
  // chromium refused it (standards-mode stylesheet MIME law), the page rendered UNSTYLED
  // (body margin 8px, #scene in the inline flow) and every plate carried the dark inset
  // frame + the (8,8) transport — 64.85 % pixels off the golden while the 3D scene itself
  // stayed correct. Byte-pinned: bad capture 6e46e6c3…, golden law e32f308d… (== the
  // rg-f2-after twin); with the row, the diag shot returned byte-identical to the golden.
  // .wasm serves as octet-stream and is fine for the basis transcoder's non-streaming
  // instantiate (three 0.186.1 falls back when streaming is refused); noted, not changed.
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

/** SERVED-BUNDLE BYTE-VERIFY (the stale-preview trap, scoped wider than the room row
 * set): the room manifest itself, every committed artifact row (glb + ktx2), AND the
 * served entry HTML + its locally referenced bundles (the hashed JS/CSS) must byte-match
 * the dist build before any shot. Fails the run BEFORE shooting when anything is stale. */
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
  // The app bundle: the served entry + every local script/stylesheet/font reference of
  // the dist index.html must byte-match the build (a stale index/stale chunk passes a
  // room-asset check while serving a different runtime — verified here, shot-blocking).
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

/** The tree identity the night-plate baseline law reads from provenance: the cwd tree's
 * git HEAD sha (a read-only local call; a battery without a resolvable HEAD is not a
 * usable baseline — fail loud). */
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

// Wipe law: a FULL run wipes ONLY its own OUT dir; a RESTRICTED run evicts only the
// plates it rewrites. The other battery's dir is never touched; the wipe target is
// asserted to sit under probes/rg-f3-* with the exact round suffix.
if (!OUT.startsWith(join(ROOT, 'probes', 'rg-f3-')) || join(OUT) === join(ROOT, 'probes')) {
  fail(`refusing to operate outside the rg-f3 battery dirs: ${OUT}`);
}
if (onlyNames.length === 0) {
  rmSync(OUT, { recursive: true, force: true });
} else {
  for (const shot of SHOTS) rmSync(join(OUT, `${shot.name}.png`), { force: true });
}
mkdirSync(OUT, { recursive: true });

console.log(
  `battery ${ROUND}: room ${ROOM}, ${SHOTS.length} plates -> probes/rg-f3-${ROUND} via ${base}`,
);
console.log(
  `served from ${relative(ROOT, DIST) || 'dist'} (repo-relative; provenance stores no endpoint)`,
);
// NOTE: BASE mode = an already-served dist, no serve handle to own.
const served = await verifyServed(base);
const glbRow = served.assets.find((row) => row.path === `${ROOM}.glb`);

const browser = await chromium.launch();
const results = [];
let failures = 0;
try {
  for (const shot of SHOTS) {
    // FRESH PAGE per shot — the same-base goto is a fragment navigation (transport trap 4).
    const page = await browser.newPage({ viewport: VIEWPORT });
    try {
      await page.goto(`${base}/${shot.path}`, { waitUntil: 'load' });
      const ready = await page
        .waitForFunction(
          () => {
            const hud = document.querySelector('#hud');
            return (
              hud !== null &&
              hud.dataset.room === 'rastrelli-gallery' &&
              (hud.dataset.ledgerBytes ?? '0') !== '0' &&
              hud.dataset.holdMs === '0'
            );
          },
          undefined,
          { timeout: 90_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (!ready) throw new Error('roomReady/ledger wait timed out (90 s)');
      await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(OUT, `${shot.name}.png`),
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });
      results.push({ ...shot, file: `${shot.name}.png`, ok: true });
      console.log(`shot ${shot.name} ok`);
    } catch (e) {
      failures += 1;
      const why = e instanceof Error ? e.message.split('\n')[0] : String(e);
      results.push({ ...shot, file: `${shot.name}.png`, ok: false, error: why });
      console.log(`shot ${shot.name} FAILED: ${why}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (serveHandle !== null) {
    // The owned server closes with the browser (a live listener would keep Node alive).
    await new Promise((resolveClose) => serveHandle.close(resolveClose));
  }
}

// Provenance (deterministic: NO endpoints, no clock — repo-relative dir identity, the
// manifest row-set compound sha, the served glb sha, the tree HEAD, and per-frame rows
// carrying the png filenames the gate instrument consumes). A restricted run MERGES its
// rows into the existing provenance so a partial re-shoot never drops the other plates.
const relDist = relative(ROOT, DIST) || 'dist';
const manifestRowsSha = hashList(served.assets);
const prior = existsSync(join(OUT, 'provenance.json'))
  ? JSON.parse(readFileSync(join(OUT, 'provenance.json'), 'utf8'))
  : null;
const priorRows =
  prior &&
  prior.round === `rg-f3-${ROUND}` &&
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
const fullRoster = BATTERY.every((shot) => measuredNames.has(shot.name));
const gating = fullRoster && failures === 0 ? 'gating' : 'NON-GATING';
writeFileSync(
  join(OUT, 'provenance.json'),
  `${JSON.stringify(
    {
      battery: BATTERY.map((shot) => shot.name),
      dist: { glbSha: glbRow?.sha256 ?? null, rel: relDist },
      detAt: DET_AT,
      gating:
        gating === 'gating'
          ? 'gating (the full 21-roster measured ok this provenance)'
          : 'NON-GATING (a partial or failed roster)',
      manifestRowsSha,
      round: `rg-f3-${ROUND}`,
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
  `gating class: ${gating === 'gating' ? 'gating (full 21-roster)' : 'NON-GATING (partial or failed roster)'}`,
);
console.log('battery done:', SHOTS.length - failures, '/', SHOTS.length, 'stills in', OUT);
if (failures > 0 && process.exitCode === undefined) process.exitCode = 1;
