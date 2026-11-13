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
import { fileURLToPath, pathToFileURL } from 'node:url';
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

// RG-E1 so-called stairlight paint, RG-F2 the both-patch law — the D-4/D-23 patch-paint
// law applied per PUBLISHED state at ENCODE time for rooms whose states are COMPOSED of
// rig EXRs (a bake-time paint would ink only one rig term; see tools/bpy/bake.py's
// PANE_PAINT — this table mirrors its declared published-state colours; the numbers are
// BY LAW, the verdict's three triples ride BOTH patches). Each room maps to an ARRAY of
// paints; every named part's atlas rect comes from the bpy stage summary's lm.patches
// (the builder's shelf cells for the named part) and its rect MUST be present — both
// parts fail loud when the summary block lacks the patch rect. Keyed by manifest state
// (day/dusk/nightChandeliers) + room; rooms not named here are untouched.
// RG-F3: the declared panes' RAW encode paint — one shared triple record the eleven
// pane01..pane11 patch entries are GENERATED from (named *_RAW to mirror the builder's
// own declared record and keep the no-×1.14 law legible beside the door's calibration).
const PANE_PAINT_RAW = {
  day: [0.55, 0.65, 0.74],
  dusk: [0.36, 0.4, 0.46],
  nightChandeliers: [0, 0, 0],
};
// k order = the builder's NICHE_CENTRES order (k=1 the EAST-most bay x 42.3065, k=11 the
// WEST-most x 8.4365); zero-padded so lexical = numeric.
const PANE_PARTS = Array.from({ length: 11 }, (_v, i) => `pane${String(i + 1).padStart(2, '0')}`);
//
// THE G2 GLARE LAW (the doorway-reads round; the accepted brief-2 reply §2.3): the door
// card + the lunette read as GLARE up close. Per part and per state the painted value is
//   value(u,v) = tint_s × L_s × (EDGE + (1 − EDGE) × falloff(centre→rect edge)),
// EDGE 0.55 and falloff the smooth cos² window (1 at the rect's centre texel → 0 at the
// rim; the field machine is tools/reencode-paint.py's glare_field). Per state: DAY neutral
// daylight at L_DAY; DUSK the stair's sconce tint at 0.35 of day; NIGHT the chandelier
// tint at 0.25 of day. The tints are the committed stair triples' hues, luminance-
// normalized (Rec.709), so L_s ARE luminance levels in linear bake units and the hue is
// the committed one exactly. L_DAY is the ONE dial, now turned at G2 — the old flat door
// triples (the ×1.14 measured-ratio lineage, owner-ratified 2026-11-08) are SUPERSEDED:
// the ×1.14 was the G1-distance calibration (the screen-side door read ~30 codes under
// the 180 band, +14% plate ⇒ +3.3% screen at the tonemap shoulder); the new dial is
// G2-first (the card's centre texel after the room's effective gain, eff = 0.8 × 2 = 1.6,
// must render ≥ 3× the pale end-wall texel beside it at G2; G1 stays a credible pale door
// at distance). The lunette shares the card's law (the both-patch law rides).
const GLARE_EDGE = 0.55;
const GLARE_TINTS = {
  // day: the committed day triple (0.627, 0.661, 0.707) / its luminance 0.6571.
  day: [0.954252, 1.005934, 1.076347],
  // dusk: the committed dusk triple (0.513, 0.365, 0.194) / its luminance 0.3841.
  dusk: [1.335694, 0.950534, 0.505078],
  // night: the committed night triple (0.684, 0.479, 0.251) / its luminance 0.5061.
  nightChandeliers: [1.351511, 0.946532, 0.49595],
};
// L_DAY — the dial (Rec.709 luminance, linear bake units). Landed at 1.1: the pale
// end-wall texel beside the card reads plate lum 0.3566 at G2 day (the wall panel's own
// atlas quad, probes/exr-sample-poly.py over the composed day plate; the render confirms
// it — albedo ≈0.55 × stored 0.446 × eff 1.6/π = code 100, the measured wall spot).
// The dial's floor puts the centre above the 0.8 white point on purpose: the card renders
// at the atlas's expressible ceiling. The three contrast domains, recorded apart (the
// review finding, 2026-11-13 — the pre-encode ratio alone was NOT rendered proof):
//   pre-encode paint ratio:  1.1 / 0.3566 = 3.08× (the dial's setup arithmetic);
//   encoded scene-linear:    the card's core clips at the 0.8 wp → stored 1.0, decoded
//                            0.8 against the wall's 0.3566 = 2.24× — the FORMAT's ceiling
//                            for the day card at this wall plate (raising it needs the
//                            white point, a room-wide law, not this dial);
//   display (AgX at eff 1.6, measured off the captures): day 1.77× (card 176 vs wall
//                            99 codes), dusk 1.52× (143 vs 94), night 1.39× (129 vs 93);
//   night light-domain:      0.87× (the law's 0.25 level against a sconce-lit wall) —
//                            the owner's eye pending.
// The encode clips the card's core flat at stored 1.0 (~176 rendered codes under AgX at
// eff 1.6) and the cos² fall survives in the outer band (rim stored 0.756, ~152 codes) —
// the glare pool + soft fall the atlas can express at the committed gain.
const GLARE_LEVEL_DAY = 1.1;
const GLARE_LEVELS = {
  day: GLARE_LEVEL_DAY,
  dusk: 0.35 * GLARE_LEVEL_DAY,
  nightChandeliers: 0.25 * GLARE_LEVEL_DAY,
};
// The law's paint per part: { part, law: 'glare' } — the payload row carries the state's
// tint + level + the shared EDGE (the rect comes from the bpy stage summary, as before).
const GLARE_PAINTS = [
  { part: 'stairlight', law: 'glare' },
  { part: 'doorcard', law: 'glare' },
];
const PATCH_PAINTS = {
  'rastrelli-gallery': [
    ...GLARE_PAINTS,
    // RG-F3: the eleven declared panes' RAW encode paint, generated from ONE shared
    // triple record (the ruling's constants block). NO ×1.14: that ratio is the DOOR's
    // measured screen-side calibration, not a pane value (transferring it would put the
    // day blue above the 0.8 bake-linear no-clip roof). Dusk ≤ day in every channel (the
    // X4 ordering constraint); night paints black (zero encoded pane light). One payload
    // / run per state — the thirteen rects ride the same reencode-paint run unchanged.
    ...PANE_PARTS.map((part) => ({ part, colours: PANE_PAINT_RAW })),
  ],
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

/** D1 (jordan slice 2): the per-room LM encode contract lives on the room's gltf module.
 * When tools/gltf/<room>.mjs exports LM_ENCODE with transfer 'srgb', the lm encode runs
 * the sRGB branch (stored = srgb_oetf(clip(rgb / W_s, 0, 1)); toktx assigns the sRGB
 * OETF — never converts). Rooms without LM_ENCODE keep the committed linear path
 * byte-for-byte. */
async function lmEncodeOf(room) {
  const file = join(HERE, 'gltf', `${room}.mjs`);
  const mod = await import(pathToFileURL(file).href);
  return mod.LM_ENCODE ?? null;
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

/** The named part's patch rect (chart coords, px, y-from-top) from the bpy stage summary.
 * RG-F2: now keyed by room AND part — a room paints multiple parts per state, so the old
 * room-only cache would hand the first part's rect to every later part. */
function patchRect(room, part) {
  const key = `${room}/${part}`;
  if (!patchRect.cache) patchRect.cache = new Map();
  if (!patchRect.cache.has(key)) {
    const path = join(STAGE_ROOT, room, 'summary.json');
    if (!existsSync(path)) {
      fail(`no bpy summary at ${path}`, 'regenerate the bpy stage first');
    }
    const lm = JSON.parse(readFileSync(path, 'utf8')).lm;
    patchRect.cache.set(key, lm?.patches?.[part] ?? null);
  }
  return patchRect.cache.get(key);
}

/** D1: the sRGB branch swaps the OETF ASSIGN only — encode etc1s, threads 1, no
 * --genmipmap stay exactly as pinned. */
function toktxFlagsFor(transfer) {
  if (transfer !== 'srgb') return TOKTX_FLAGS;
  const at = TOKTX_FLAGS.indexOf('--assign_oetf');
  return [...TOKTX_FLAGS.slice(0, at + 1), 'srgb', ...TOKTX_FLAGS.slice(at + 2)];
}

function reencodeChart(room, state, chart, whitePoint, manifest, work, transfer) {
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
  // RG-E1/RG-F2: the named parts' cells are painted per PUBLISHED state, after the
  // compose and before the per-state LDR encode (the composed EXR carries one published
  // state); the paint happens per chart — these are architecture-chart patches. One
  // combined payload, one reencode-paint run; every listed part's rect must exist
  // (fail loud exactly as the single-patch law did).
  const paints = chart === 'arch' ? (PATCH_PAINTS[room] ?? []) : [];
  if (paints.length > 0) {
    const rows = paints.map((paint) => {
      const rect = patchRect(room, paint.part);
      if (!Array.isArray(rect) || rect.length !== 4) {
        fail(
          `${room}: summary lm block lacks the ${paint.part} patch rect`,
          'regenerate the bpy stage',
        );
      }
      // The glare-law entries carry the state's tint + level + the shared EDGE; the flat
      // entries (the panes) keep the committed colour form.
      if (paint.law === 'glare') {
        return {
          rect,
          glare: { edge: GLARE_EDGE, tint: GLARE_TINTS[state], level: GLARE_LEVELS[state] },
        };
      }
      return { rect, colour: paint.colours[state] };
    });
    const painted = join(STAGE_ROOT, `${room}.${file}.paint.exr`);
    const payload = join(work, `paint-${file}.json`);
    writeFileSync(payload, `${JSON.stringify(rows)}\n`);
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
  console.log(
    `\n== ${room} ${state} ${chart}: whitePoint=${whitePoint}` +
      `${transfer === 'srgb' ? ' transfer=srgb' : ''}`,
  );
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
    ...(transfer === 'srgb' ? ['--transfer', 'srgb'] : []),
  ]);
  // RG-F2 the DEAD_CELL gate (verdict 2.4), pre-ETC1S: the day atlas's owned lm.cells
  // must not read dead-black. Only day + arch; the checker exits non-zero and the
  // failure propagates (all-or-nothing per the publish law). CROSS-ROOM BYTE-SAFETY
  // (the standing law): an RG-only gate — the siblings' day/arch chain must not open
  // or parse its own stage summary here. RG-F2 fail-closed (`--required`): a missing
  // cells block is a "regenerate the bpy stage" error, never a silent pass.
  // `--python-exit-code 1` (read AFTER -P, BEFORE the script) propagates ordinary
  // Python exceptions' exit codes, so an unreadable png / invalid summary JSON aborts.
  if (room === 'rastrelli-gallery' && state === 'day' && chart === 'arch') {
    run(BLENDER, [
      '-b',
      '--factory-startup',
      '-noaudio',
      '--python-exit-code',
      '1',
      '-P',
      PAINT_PY,
      '--',
      'check',
      png,
      join(STAGE_ROOT, room, 'summary.json'),
      '--required',
    ]);
  }
  run('toktx', [...toktxFlagsFor(transfer), ktx2, png]);
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

function reencodeState(room, state, manifest, work, charts, transfer) {
  const whitePoint = whitePointOf(manifest, room, state);
  for (const chart of charts) {
    reencodeChart(room, state, chart, whitePoint, manifest, work, transfer);
  }
}

const POST_ENCODE_HEADING =
  '## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)';

/** F11: the committed lm bytes' provenance joins the bake log. The log's existing
 * `## Artifacts` rows record the DRIVER's pre-reencode output (the driver's prerogative —
 * untouched); the re-encode adds its own postEncode record: {<state>: [{rel, bytes,
 * sha256}]} read from the PUBLISHED files (the same rows the manifest now carries), then
 * regenerates ONLY the .md's post-encode section (idempotent on a double run; the driver
 * does not know this section — a fresh bake rewrites the log and the next reencode run
 * regenerates the states it publishes). */
/** The pane proof carried through the post-encode merge (RG-F3): read from the staged
 * bake summary beside this tool's staged EXRs (bake-<file-state>/summary.json — the
 * ZIMNY_SUMMARY record, not a new input). STRICT acceptance (the Sol-14 hardening):
 * the summary's own `state` must BE the canonical state (a poisoned stage dir fails
 * loud, never a mis-bound proof); the pane rows must match bake.py's written schema
 * (paneApplied boolean; paneProof rows with a material, a status of 'applied' or
 * 'declared-zero-verified', and the declared/readBack rgb triples + strengths); when
 * present, the consumed PRE-PAINT identity binds to the staged denoised arch EXR (the
 * same file assertStagedExr binds to the bake log). Returns null when the staged bake
 * carries NO pane keys at all (the fresh-bootstrap / sibling default keeps the old way
 * out — a state then has its previously carried proof REMOVED by the merge, the
 * stale-poison guard). Carry limitation, recorded once (comment, not a claim): the
 * compose/paint mid-step EXRs are work-tmp payloads inside reencodeChart and are not
 * bound here; the bound identity is the bake's own denoised staged plate. The splice
 * is rastrelli-gallery-only, so siblings never enter. */
function stagedPaneProof(room, state) {
  const dirName = `bake-${FILE_BY_STATE[state]}`;
  const stagePath = join(STAGE_ROOT, room, dirName, 'summary.json');
  if (!existsSync(stagePath)) return null;
  const summary = JSON.parse(readFileSync(stagePath, 'utf8'));
  if (!('paneApplied' in summary) || !('paneProof' in summary)) return null;
  if (summary.state !== state) {
    fail(
      `staged pane proof at ${stagePath}: summary.state ${JSON.stringify(summary.state)} ` +
        `is not the canonical state ${state} — a poisoned stage dir fails loud`,
    );
  }
  const isTriple = (value) =>
    Array.isArray(value) && value.length === 3 && value.every((n) => Number.isFinite(n) && n >= 0);
  if (
    typeof summary.paneApplied !== 'boolean' ||
    !Array.isArray(summary.paneProof) ||
    summary.paneProof.length === 0 ||
    !summary.paneProof.every(
      (row) =>
        row &&
        typeof row.material === 'string' &&
        (row.status === 'applied' || row.status === 'declared-zero-verified') &&
        isTriple(row.declaredColour) &&
        Number.isFinite(row.declaredStrength) &&
        row.declaredStrength >= 0 &&
        isTriple(row.readBackColour) &&
        Number.isFinite(row.readBackStrength) &&
        row.readBackStrength >= 0,
    )
  ) {
    fail(
      `staged pane proof at ${stagePath}: malformed paneApplied/paneProof rows (the ` +
        'schema is {paneApplied boolean, paneProof: [{material, status, declaredColour, ' +
        'declaredStrength, readBackColour, readBackStrength}]}) — fail loud',
    );
  }
  const exrPath = join(STAGE_ROOT, room, dirName, 'lm', `${FILE_BY_STATE[state]}.exr`);
  const stagedExr = existsSync(exrPath)
    ? { path: `${dirName}/lm/${FILE_BY_STATE[state]}.exr`, sha256: sha256(readFileSync(exrPath)) }
    : null;
  return { paneApplied: summary.paneApplied, paneProof: summary.paneProof, stagedExr };
}

function splicePostEncodeRows(room, manifest, states) {
  const logPath = join(LOG_DIR, `${room}.json`);
  const mdPath = join(LOG_DIR, `${room}.md`);
  if (!existsSync(logPath) || !existsSync(mdPath)) {
    console.log('post-encode rows: no committed bake log — nothing spliced');
    return;
  }
  const log = JSON.parse(readFileSync(logPath, 'utf8'));
  const rowsByState = {};
  for (const state of states) {
    const rels = [`lm/${FILE_BY_STATE[state]}.ktx2`];
    const kitRel = `lm/${KIT_PREFIX}${FILE_BY_STATE[state]}.ktx2`;
    if (manifest.files.some((row) => row.path === kitRel)) rels.push(kitRel);
    const rows = rels
      .filter((rel) => manifest.files.some((row) => row.path === rel))
      .map((rel) => {
        const bytes = readFileSync(join(ASSETS_DIR, room, rel));
        return { bytes: bytes.length, rel, sha256: sha256(bytes) };
      });
    if (rows.length > 0) rowsByState[state] = rows;
  }
  if (Object.keys(rowsByState).length === 0) {
    console.log('post-encode rows: no published lm rows for this run — log untouched');
    return;
  }
  log.postEncode = { ...(log.postEncode ?? {}), ...rowsByState };
  // RG-F3: the pane proof rides the post-encode merge — the states this run published
  // carry their staged bake's paneApplied/paneProof beside the artifact hashes, so the
  // committed bake log alone exposes the pane gate. STALE-PROOF POISON GUARD: a state
  // REPUBLISHED without proof in its staged summary (or with the staged summary absent)
  // has its previously carried proof REMOVED — a carried proof must never describe an
  // artifact this run did not prove. Earlier carried states are otherwise untouched; a
  // double run is idempotent (same staged rows, same merge result).
  const paneByState = {};
  const removedPaneStates = [];
  for (const state of states) {
    const pane = stagedPaneProof(room, state);
    if (pane !== null) paneByState[state] = pane;
    else if (log.postEncode?.paneProof?.[state] !== undefined) removedPaneStates.push(state);
  }
  if (removedPaneStates.length > 0) {
    const carried = { ...(log.postEncode?.paneProof ?? {}) };
    for (const state of removedPaneStates) delete carried[state];
    log.postEncode.paneProof = carried;
  }
  if (Object.keys(paneByState).length > 0) {
    log.postEncode.paneProof = { ...(log.postEncode?.paneProof ?? {}), ...paneByState };
  }
  writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  const table = [POST_ENCODE_HEADING, '| state | file | bytes | sha256 |', '|---|---|---|---|'];
  for (const state of STATES) {
    for (const row of log.postEncode[state] ?? []) {
      table.push(`| ${state} | ${row.rel} | ${row.bytes} | ${row.sha256} |`);
    }
  }
  // The pane proof's md rows ride inside the post-encode section (only where carried).
  const paneProof = log.postEncode.paneProof ?? {};
  for (const state of STATES) {
    const pane = paneProof[state];
    if (pane === undefined) continue;
    const statuses = pane.paneProof.map((row) => row.status).join(' / ') || 'carried';
    const bound = pane.stagedExr
      ? `; pre-paint exr ${pane.stagedExr.path} ${pane.stagedExr.sha256}`
      : '';
    table.push(
      `paneApplied (${state}) = ${pane.paneApplied} — ` +
        `${pane.paneProof.length} proof row(s): ${statuses}${bound}`,
    );
  }
  const raw = readFileSync(mdPath, 'utf8');
  const body = raw.endsWith('\n') ? raw.slice(0, -1) : raw;
  const lines = body.split('\n');
  const at = lines.indexOf(POST_ENCODE_HEADING);
  let out;
  if (at !== -1) {
    // Replace the section: from its heading to the next markdown heading or EOF.
    let end = at + 1;
    while (end < lines.length && !lines[end].startsWith('#')) end++;
    out = [...lines.slice(0, at), ...table, ...lines.slice(end)];
  } else {
    out = [...lines, '', '---', ...table];
  }
  writeFileSync(mdPath, `${out.join('\n')}\n`);
  console.log(`post-encode rows: spliced ${Object.keys(rowsByState).join(', ')} into the bake log`);
}

async function main() {
  const { room, states } = parseArgs(process.argv.slice(2));
  const tc = readToolchain();
  requireTool('toktx', ['--version'], requirePinned(tc, 'toktx'), TOKTX_INSTALL);
  if (!existsSync(BLENDER)) {
    fail(`Blender not found at ${BLENDER}`, 'set ZIMNY_BLENDER to the Blender binary');
  }
  const { path, manifest } = readManifest(room);
  const lmEncode = await lmEncodeOf(room);
  const transfer = lmEncode?.transfer === 'srgb' ? 'srgb' : null;
  const charts = chartsOf(manifest, room);
  const work = mkdtempSync(join(tmpdir(), 'zimny-reencode-'));
  try {
    for (const state of states) {
      reencodeState(room, state, manifest, work, charts, transfer);
    }
    // The record is already the source of truth; rewrite it verbatim so the file is self-stating.
    manifest.lightmaps.intensity = Object.fromEntries(
      STATES.map((s) => [s, whitePointOf(manifest, room, s)]),
    );
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`\nmanifest rewritten: ${path}`);
    // F11: the published lm rows' provenance joins the committed bake log (after the
    // states loop, so every published file of the run exists on disk).
    // CROSS-ROOM BYTE-SAFETY (the standing law): the splice re-merges `postEncode` into
    // the committed bake-log JSON and rewrites the .md — RG-only; a sibling run must
    // leave its committed log bytes exactly as it wrote them.
    if (room === 'rastrelli-gallery') {
      splicePostEncodeRows(room, manifest, states);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(`reencode: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
