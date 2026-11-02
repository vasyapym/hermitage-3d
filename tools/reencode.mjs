// tools/reencode.mjs
// §5 re-encode law (design-staircase §4 states, r17c): re-encode a room's surviving DENOISED
// linear EXR into the committed 8-bit ETC1S ktx2 at the manifest's white point. Never consumes
// the old PNG or the old ktx2. Deterministic: same EXR + white point → byte-identical outputs
// (toktx single-threaded, no mips, no clock, no network). Publish is all-or-nothing per state.
// The manifest's lightmaps.intensity record is the single source of truth for the white points;
// changing a white point means editing the manifest first, then re-encoding.
// R-UX4 (walkthrough-UX pass): a state carrying a compose recipe (tools/lm-recipes.mjs) first
// composes its source EXRs linearly (tools/lm_compose.py) and encodes the composed EXR.
// R4 (Slice A, D-14): a state may carry TWO charts — the architecture chart keeps the
// committed lm/<file>.* paths; the kit chart publishes lm/kit-<file>.ktx2 beside them. The
// driver resolves EVERY lm row of a state (both charts), asserts each staged denoised EXR's
// sha256 against the bake-log record (the "never the old PNG/ktx2" law, now checkable),
// composes per chart when the recipe asks, and publishes per chart.
//
//   node tools/reencode.mjs <room> <state|all>     state aliases: night → nightChandeliers
//
// Node driver only — never imported by src.
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSETS_DIR,
  BLENDER,
  ChainError,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  sha256,
} from './common.mjs';
import { composeArgs, composeRecipeFor } from './lm-recipes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENCODE_PY = join(HERE, 'reencode-encode.py');
const COMPOSE_PY = join(HERE, 'lm_compose.py');
const PAINT_PY = join(HERE, 'reencode-paint.py');
const LOG_DIR = join(HERE, 'bake-logs');
const TOKTX_INSTALL = 'install KTX-Software 4.4.2 (brew install ktx) so `toktx` is on PATH';

const STATES = ['day', 'dusk', 'nightChandeliers'];
const ALIAS = { night: 'nightChandeliers' };
const FILE_BY_STATE = { day: 'day', dusk: 'dusk', nightChandeliers: 'night' };
const KIT_PREFIX = 'kit-';

// RG-E1 so-called stairlight paint — the D-4/D-23 patch-paint law applied per PUBLISHED
// state at ENCODE time for rooms whose states are COMPOSED of rig EXRs (a bake-time paint
// would ink only one rig term; see tools/bpy/bake.py's PANE_PAINT — this table mirrors its
// declared published-state colours). The atlas rect comes from the bpy stage summary's
// lm.patches (the builder's shelf cells for the `stairlight` part). Keyed by manifest
// state (day/dusk/nightChandeliers) + room; rooms not named here are untouched.
const STAIRLIGHT_PAINT = {
  'rastrelli-gallery': {
    part: 'stairlight',
    colours: {
      day: [0.55, 0.58, 0.62], // cool daylight through the door
      dusk: [0.45, 0.32, 0.17], // the warm dim evening stair
      nightChandeliers: [0.6, 0.42, 0.22], // the lamp-lit stair (night reads strongest)
    },
  },
};

// Pinned transcode flags — the same ETC1S economics as the bake (§5: linear irradiance data).
const TOKTX_FLAGS = [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  '128',
  '--threads',
  '1',
  '--assign_oetf',
  'linear',
  '--assign_primaries',
  'bt709',
];

function fail(message, hint) {
  throw new ChainError(hint === undefined ? message : `${message} (${hint})`);
}

function parseArgs(argv) {
  const [room, stateArg] = argv;
  if (!room || !stateArg) fail('usage: node tools/reencode.mjs <room> <state|all>');
  const state = ALIAS[stateArg] ?? stateArg;
  if (state !== 'all' && !STATES.includes(state)) {
    fail(`unknown state '${stateArg}'`, `one of ${STATES.join(', ')}, night, all`);
  }
  return { room, states: state === 'all' ? STATES : [state] };
}

function readManifest(room) {
  const path = join(ASSETS_DIR, room, 'manifest.json');
  if (!existsSync(path)) fail(`no manifest at ${path}`, 'room id must match a committed room');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const intensity = manifest.lightmaps?.intensity;
  if (intensity === null || typeof intensity !== 'object') {
    fail(`${room}: lightmaps.intensity is null — nothing to re-encode (canary / unbaked room)`);
  }
  return { path, manifest };
}

function whitePointOf(manifest, room, state) {
  const value = manifest.lightmaps.intensity[state];
  if (!Number.isFinite(value) || value <= 0) {
    fail(`${room}: lightmaps.intensity.${state} must be finite and > 0, got ${value}`);
  }
  return value;
}

/** The room's charts per its manifest rows: 'arch' always; 'kit' all-or-nothing (R4 D-14). */
function chartsOf(manifest, room) {
  const paths = new Set(manifest.files.map((row) => row.path));
  const charts = ['arch'];
  const kitPresent = STATES.some((state) =>
    paths.has(`lm/${KIT_PREFIX}${FILE_BY_STATE[state]}.ktx2`),
  );
  if (kitPresent) {
    for (const state of STATES) {
      const rel = `lm/${KIT_PREFIX}${FILE_BY_STATE[state]}.ktx2`;
      if (!paths.has(rel)) fail(`${room}: the kit rows are all-or-nothing — ${rel} missing`);
    }
    charts.push('kit');
  }
  return charts;
}

/** The bake's DENOISED linear EXR for (room, state, chart); the raw one is <file>.raw.exr. */
function chartExr(room, state, chart) {
  const file = FILE_BY_STATE[state];
  const prefix = chart === 'arch' ? '' : KIT_PREFIX;
  const path = join(STAGE_ROOT, room, `bake-${file}`, 'lm', `${prefix}${file}.exr`);
  if (!existsSync(path)) {
    fail(`missing denoised EXR ${path}`, 'run the bake first; this tool never re-bakes');
  }
  return path;
}

/** R4 D-14: a staged EXR must be the plate the bake log recorded (sha256).
 * RG-D2 forensic gate: a bake record that EXISTS but has no `charts` row (or no
 * exrSha256 in it) used to pass silently — the vacuous pass that let a stale staged
 * plate ride in unchecked (the committed rastrelli-gallery night atlas demonstrably
 * encoded from an earlier staged file at a compose scale that fits no current EXR).
 * A present bake record must prove its charts: fail loud instead; the record refreshes
 * on any tools/bake.mjs run (bake.py's summary carries the per-chart exrSha256 rows).
 * Rooms without a bake record for the state (fresh bootstrap) keep the old way out. */
function assertStagedExr(room, state, chart, exrPath) {
  const logPath = join(LOG_DIR, `${room}.json`);
  if (!existsSync(logPath)) return;
  const log = JSON.parse(readFileSync(logPath, 'utf8'));
  const rec = log.states?.[state];
  if (rec === undefined || rec === null) return;
  const chartRow = (rec.charts ?? []).find((row) => row.name === chart);
  if (chartRow === undefined || chartRow.exrSha256 === null || chartRow.exrSha256 === undefined) {
    fail(
      `bake record ${state}: no exrSha256 for chart '${chart}' — the bake-log JSON predates the chart rows`,
      're-run the bake (node tools/bake.mjs) so the record carries the chart provenance',
    );
  }
  const actual = sha256(readFileSync(exrPath));
  if (actual !== chartRow.exrSha256) {
    fail(
      `staged EXR ${exrPath} sha256 ${actual} !== the bake-log record ${chartRow.exrSha256}`,
      'never re-encode a plate the log does not record',
    );
  }
}

/** The named part's patch rect (chart coords, px, y-from-top) from the bpy stage summary. */
function patchRect(room, part) {
  if (!patchRect.cache) patchRect.cache = new Map();
  if (!patchRect.cache.has(room)) {
    const path = join(STAGE_ROOT, room, 'summary.json');
    if (!existsSync(path)) {
      fail(`no bpy summary at ${path}`, 'regenerate the bpy stage first');
    }
    const lm = JSON.parse(readFileSync(path, 'utf8')).lm;
    patchRect.cache.set(room, lm?.patches?.[part] ?? null);
  }
  return patchRect.cache.get(room);
}

function reencodeChart(room, state, chart, whitePoint, manifest, work) {
  const file = FILE_BY_STATE[state];
  const prefix = chart === 'arch' ? '' : KIT_PREFIX;
  let exr = chartExr(room, state, chart);
  assertStagedExr(room, state, chart, exr);
  // Compose law (tools/lm-recipes.mjs): a state with a recipe encodes the linear sum of
  // its declared sources (staged denoised EXRs, per chart) produced by lm_compose.py; the
  // composed EXR then feeds the UNCHANGED single-input encode/transcode/publish path.
  const recipe = composeRecipeFor(room, state);
  if (recipe !== null) {
    const resolved = recipe.map((term) => {
      const path = chartExr(room, term.source, chart);
      assertStagedExr(room, term.source, chart, path);
      return { path, scale: term.scale };
    });
    const suffix = chart === 'arch' ? '' : `.${chart}`;
    const composed = join(STAGE_ROOT, `${room}.${state}${suffix}.composite.exr`);
    const terms = recipe.map((t) => `${t.source}×${t.scale}`).join(' + ');
    console.log(`== ${room} ${state} ${chart}: compose ${terms}`);
    run(BLENDER, [
      '-b',
      '--factory-startup',
      '-noaudio',
      '-P',
      COMPOSE_PY,
      '--',
      ...composeArgs(composed, resolved),
    ]);
    exr = composed;
  }
  // RG-E1: the stairlight's cells are painted per PUBLISHED state, after the compose and
  // before the per-state LDR encode (the composed EXR carries one published state); the
  // paint happens per chart — the stairlight is an architecture-chart patch.
  const paint = chart === 'arch' ? STAIRLIGHT_PAINT[room] : undefined;
  if (paint !== undefined) {
    const rect = patchRect(room, paint.part);
    if (!Array.isArray(rect) || rect.length !== 4) {
      fail(
        `${room}: summary lm block lacks the ${paint.part} patch rect`,
        'regenerate the bpy stage',
      );
    }
    const painted = join(STAGE_ROOT, `${room}.${file}.paint.exr`);
    const payload = join(work, `paint-${file}.json`);
    writeFileSync(payload, `${JSON.stringify([{ rect, colour: paint.colours[state] }])}\n`);
    run(BLENDER, [
      '-b',
      '--factory-startup',
      '-noaudio',
      '-P',
      PAINT_PY,
      '--',
      exr,
      painted,
      payload,
    ]);
    exr = painted;
  }
  const png = join(work, `${prefix}${file}.png`);
  const ktx2 = join(work, `${prefix}${file}.ktx2`);
  console.log(`\n== ${room} ${state} ${chart}: whitePoint=${whitePoint}`);
  run(BLENDER, [
    '-b',
    '--factory-startup',
    '-noaudio',
    '-P',
    ENCODE_PY,
    '--',
    exr,
    png,
    String(whitePoint),
  ]);
  run('toktx', [...TOKTX_FLAGS, ktx2, png]);
  if (!existsSync(ktx2)) fail(`toktx produced no file at ${ktx2}`);
  // Publish only now: encode + transcode both succeeded (all-or-nothing per state).
  const rel = `lm/${prefix}${file}.ktx2`;
  const dest = join(ASSETS_DIR, room, rel);
  copyFileSync(ktx2, dest);
  const bytes = readFileSync(dest);
  const sha = sha256(bytes);
  const row = manifest.files.find((f) => f.path === rel);
  if (row === undefined) fail(`${room}: manifest has no files row for ${rel}`);
  row.bytes = bytes.length;
  row.sha256 = sha;
  console.log(`published ${dest} (${bytes.length} bytes, sha256 ${sha})`);
}

function reencodeState(room, state, manifest, work, charts) {
  const whitePoint = whitePointOf(manifest, room, state);
  for (const chart of charts) reencodeChart(room, state, chart, whitePoint, manifest, work);
}

function main() {
  const { room, states } = parseArgs(process.argv.slice(2));
  const tc = readToolchain();
  requireTool('toktx', ['--version'], requirePinned(tc, 'toktx'), TOKTX_INSTALL);
  if (!existsSync(BLENDER)) {
    fail(`Blender not found at ${BLENDER}`, 'set ZIMNY_BLENDER to the Blender binary');
  }
  const { path, manifest } = readManifest(room);
  const charts = chartsOf(manifest, room);
  const work = mkdtempSync(join(tmpdir(), 'zimny-reencode-'));
  try {
    for (const state of states) reencodeState(room, state, manifest, work, charts);
    // The record is already the source of truth; rewrite it verbatim so the file is self-stating.
    manifest.lightmaps.intensity = Object.fromEntries(
      STATES.map((s) => [s, whitePointOf(manifest, room, s)]),
    );
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`\nmanifest rewritten: ${path}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`reencode: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
