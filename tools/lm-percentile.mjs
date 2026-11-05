// tools/lm-percentile.mjs
// D4 (jordan slice 2): the percentile lightmap pipeline driver.
//
//   node tools/lm-percentile.mjs <room> <day|dusk|nightChandeliers|night|all> [--dry | --check]
//
// default: measure (tools/bpy/lm_percentile.py, Blender) -> manifest lightmaps.intensity
// rows FIRST -> node tools/reencode.mjs <room> <state> (the D1 sRGB branch, driven by the
// room module's LM_ENCODE.transfer) -> bake-log encode rows (fills the D1-e placeholders
// planted by bake.mjs; the .md mirrors) -> the two paste rows (ROOM.lightmaps.intensity
// and INTERIOR_LOOK_GAIN.<room>).
// --dry: stats + stdout only (no writes).
// --check: stats compared against the CURRENT manifest, look and bake-log rows; any
// mismatch is a hard fail with the row named.
// The tool REFUSES rooms whose tools/gltf/<room>.mjs exports no LM_ENCODE with mode
// 'percentile'. Deterministic: fixed coefficients, sorted-key JSON, decimal half-up
// rounding, no clock, no network, toktx --threads 1 (inside reencode.mjs).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSETS_DIR,
  BLENDER,
  ChainError,
  ROOT,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  sha256,
} from './common.mjs';

const HERE = join(ROOT, 'tools');
const STATS_PY = join(HERE, 'bpy', 'lm_percentile.py');
const LOG_DIR = join(HERE, 'bake-logs');
const LOOK_PATH = join(ROOT, 'src', 'content', 'lightmap-look.ts');
const MD_BLOCK_START =
  '<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->';

const STATES = ['day', 'dusk', 'nightChandeliers'];
const ALIAS = { night: 'nightChandeliers' };
const FILE_BY_STATE = { day: 'day', dusk: 'dusk', nightChandeliers: 'night' };
// D1's --dry stop band: informational, the run card owns the stop decision.
const STOP_BAND = { day: [0.35, 1.0], dusk: [0.3, 2.5], nightChandeliers: [0.3, 2.5] };

function fail(message, hint) {
  throw new ChainError(hint === undefined ? message : `${message} (${hint})`);
}

function parseArgs(argv) {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  for (const flag of flags) {
    if (flag !== '--dry' && flag !== '--check') fail(`unknown flag ${flag}`);
  }
  if (flags.includes('--dry') && flags.includes('--check')) {
    fail('--dry and --check are exclusive');
  }
  const [room, stateArg] = positional;
  if (!room || !stateArg || positional.length > 2) {
    fail(
      'usage: node tools/lm-percentile.mjs <room> <day|dusk|nightChandeliers|night|all> ' +
        '[--dry|--check]',
    );
  }
  const state = ALIAS[stateArg] ?? stateArg;
  if (state !== 'all' && !STATES.includes(state)) {
    fail(`unknown state '${stateArg}'`, `one of ${STATES.join(', ')}, night, all`);
  }
  return {
    room,
    states: state === 'all' ? STATES : [state],
    dry: flags.includes('--dry'),
    check: flags.includes('--check'),
  };
}

/** The room module's LM_ENCODE; a percentile room MUST declare it (D4 refuses otherwise). */
async function loadLmEncode(room) {
  const file = join(HERE, 'gltf', `${room}.mjs`);
  if (!existsSync(file)) fail(`no gltf module at tools/gltf/${room}.mjs`);
  const mod = await import(pathToFileURL(file).href);
  const encode = mod.LM_ENCODE;
  if (encode?.mode !== 'percentile') {
    fail(
      `tools/gltf/${room}.mjs exports no LM_ENCODE with mode 'percentile' — ` +
        'lm-percentile only serves percentile rooms',
    );
  }
  for (const state of STATES) {
    const [lo, hi] = encode.clamp[state];
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) {
      fail(`LM_ENCODE.clamp.${state} must be lo < hi, got [${lo}, ${hi}]`);
    }
  }
  return encode;
}

function chartExrPath(room, state) {
  const file = FILE_BY_STATE[state];
  return join(STAGE_ROOT, room, `bake-${file}`, 'lm', `${file}.exr`);
}

function cellsPath(room, state) {
  const file = FILE_BY_STATE[state];
  return join(STAGE_ROOT, room, `bake-${file}`, 'lm', 'cells.json');
}

function bakeLogPath(room) {
  const path = join(LOG_DIR, `${room}.json`);
  if (!existsSync(path)) {
    fail(`no bake record at tools/bake-logs/${room}.json`, 'run the bake first');
  }
  return path;
}

/** D4's input law: the staged denoised EXR must be the plate the bake log records. */
function assertStagedExr(room, state, stats) {
  const log = JSON.parse(readFileSync(bakeLogPath(room), 'utf8'));
  const rec = log.states?.[state];
  if (rec === undefined || rec === null) {
    fail(
      `bake record tools/bake-logs/${room}.json has no state ${state}`,
      'run the bake for the state first',
    );
  }
  const chartRow = (rec.charts ?? []).find((row) => row.name === 'arch');
  if (chartRow?.exrSha256 != null && chartRow.exrSha256 !== stats.exrSha256) {
    fail(
      `staged EXR for ${state}: sha256 ${stats.exrSha256} != the bake-log record ` +
        `${chartRow.exrSha256}`,
      'never measure a plate the log does not record',
    );
  }
  if (rec.encode?.cellsSha256 != null && rec.encode.cellsSha256 !== stats.cellsSha256) {
    fail(
      `cells.json for ${state}: sha256 ${stats.cellsSha256} != the bake-log encode ` +
        `row ${rec.encode.cellsSha256}`,
    );
  }
  return rec;
}

async function measure(room, state, encode) {
  const exr = chartExrPath(room, state);
  const cells = cellsPath(room, state);
  if (!existsSync(exr)) fail(`missing denoised EXR ${exr}`, 'run the bake first');
  if (!existsSync(cells)) fail(`missing cells.json ${cells}`, 'run the bake first');
  const stdout = run(
    BLENDER,
    [
      '-b',
      '--factory-startup',
      '-noaudio',
      '-P',
      STATS_PY,
      '--',
      '--room',
      room,
      '--state',
      state,
      '--exr',
      exr,
      '--cells',
      cells,
      '--percentile',
      String(encode.percentile),
      '--exclude',
      encode.excludeMaterials.join(','),
      '--clamp',
      encode.clamp[state].join(','),
      '--kappa',
      String(encode.displayClip[state]),
    ],
    { capture: true },
  );
  const line = stdout.split('\n').find((text) => text.startsWith('LM_PERCENTILE '));
  if (!line) fail(`lm_percentile.py printed no LM_PERCENTILE line for ${room}/${state}`);
  return JSON.parse(line.slice('LM_PERCENTILE '.length));
}

function formatRow(row) {
  // The paste rows print only the keys this invocation measured ('all' prints all three).
  const keys = STATES.filter((s) => row[s] !== undefined);
  return `{ ${keys.map((s) => `${s}: ${row[s]}`).join(', ')} }`;
}

function readLookRow(room) {
  const text = readFileSync(LOOK_PATH, 'utf8');
  const match = /jordan: \{ day: ([0-9.]+), dusk: ([0-9.]+), nightChandeliers: ([0-9.]+)/.exec(
    text,
  );
  if (!match || room !== 'jordan') {
    fail(`no INTERIOR_LOOK_GAIN.${room} row in src/content/lightmap-look.ts`);
  }
  return { day: Number(match[1]), dusk: Number(match[2]), nightChandeliers: Number(match[3]) };
}

/** The D1-e structure: bake.mjs plants it with nulls; this fills w/wRaw/gain/clip/halo/artifact. */
function encodeRow(encode, stats, artifact) {
  return {
    mode: encode.mode,
    percentile: encode.percentile,
    scope: encode.scope,
    transfer: encode.transfer,
    cellsSha256: stats.cellsSha256,
    wRaw: stats.wRaw,
    w: stats.w,
    gain: stats.gain,
    kappa: encode.displayClip[stats.state],
    clipFraction: stats.clipFraction,
    haloFraction: stats.haloFraction,
    artifact,
  };
}

function mdTableRow(row) {
  return (
    `| ${row.state} | ${row.stats.wRaw} | ${row.stats.w} | ${row.stats.gain} | ` +
    `${row.kappa} | ${row.stats.clipFraction} | ${row.stats.haloFraction} | ` +
    `${row.artifact.rel} ${row.artifact.bytes} B ${row.artifact.sha256} |`
  );
}

function writeMdRows(room, perState) {
  const mdPath = join(LOG_DIR, `${room}.md`);
  const text = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
  const base =
    text.indexOf(MD_BLOCK_START) === -1 ? text : text.slice(0, text.indexOf(MD_BLOCK_START));
  const block = [
    MD_BLOCK_START,
    '',
    '## Encode — lm-percentile (D1-e)',
    '',
    '| state | wRaw | w | gain | kappa | clipped | halo | artifact |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...perState.map((row) => mdTableRow(row)),
    '',
  ].join('\n');
  writeFileSync(mdPath, `${base}${block}\n`);
  console.log(`wrote ${mdPath.replace(`${ROOT}/`, '')}`);
}

/** The manifest row write is FIRST in the pipeline (the reencode law reads it next). */
function writeManifestRows(room, perState) {
  const manifestPath = join(ASSETS_DIR, room, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const row of perState) {
    manifest.lightmaps.intensity[row.state] = row.stats.w;
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${manifestPath.replace(`${ROOT}/`, '')}`);
}

function publishedArtifact(room, state) {
  const file = FILE_BY_STATE[state];
  const rel = `lm/${file}.ktx2`;
  const abs = join(ASSETS_DIR, room, rel);
  if (!existsSync(abs)) {
    fail(`no published ktx2 at ${abs}`, 'run the reencode step first');
  }
  const bytes = readFileSync(abs);
  return { rel, bytes: bytes.length, sha256: sha256(bytes) };
}

function writeLogRows(room, perState) {
  const logPath = bakeLogPath(room);
  const log = JSON.parse(readFileSync(logPath, 'utf8'));
  for (const row of perState) {
    const rec = log.states?.[row.state];
    if (rec === undefined || rec === null) {
      fail(`bake record ${row.state} gone between measurement and write`);
    }
    if (rec.whitePoint !== 'percentile') {
      fail(
        `bake record ${row.state}: whitePoint ${JSON.stringify(rec.whitePoint)} != ` +
          `'percentile'`,
        're-run the bake so the D2 sentinel row lands',
      );
    }
    rec.encode = encodeRow(row.encode, row.stats, row.artifact);
  }
  writeFileSync(logPath, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`wrote ${logPath.replace(`${ROOT}/`, '')}`);
  writeMdRows(room, perState);
}

/** --check compares the stats against every current published row; mismatch = hard fail. */
function assertCheck(room, perState) {
  const manifestPath = join(ASSETS_DIR, room, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const look = readLookRow(room);
  const log = JSON.parse(readFileSync(bakeLogPath(room), 'utf8'));
  for (const row of perState) {
    const s = row.state;
    const got = manifest.lightmaps?.intensity?.[s];
    if (got !== row.stats.w) {
      fail(
        `--check ${room}.manifest lightmaps.intensity.${s}: got ${got}, stats say ` +
          `${row.stats.w}`,
        'run without --check to publish, or re-run the bake',
      );
    }
    if (look[s] !== row.stats.gain) {
      fail(
        `--check src/content/lightmap-look.ts INTERIOR_LOOK_GAIN.${room}.${s}: got ` +
          `${look[s]}, stats say ${row.stats.gain}`,
        'paste the row first',
      );
    }
    const rec = log.states?.[s];
    if (rec === undefined || rec === null) {
      fail(`--check: the bake log has no state ${s}`, 'run the bake first');
    }
    if (rec.whitePoint !== 'percentile') {
      fail(
        `--check bake-log ${s}: whitePoint ${JSON.stringify(rec.whitePoint)} != 'percentile'`,
        're-run the bake',
      );
    }
    const want = encodeRow(row.encode, row.stats, row.artifact);
    for (const key of [
      'mode',
      'percentile',
      'scope',
      'transfer',
      'wRaw',
      'w',
      'gain',
      'kappa',
      'clipFraction',
      'haloFraction',
      'cellsSha256',
    ]) {
      if (rec.encode?.[key] !== want[key]) {
        fail(
          `--check bake-log ${s} encode.${key}: got ` +
            `${JSON.stringify(rec.encode?.[key])}, stats say ${JSON.stringify(want[key])}`,
          're-run without --check to refresh the row',
        );
      }
    }
    const artifact = want.artifact;
    if (
      rec.encode?.artifact?.rel !== artifact.rel ||
      rec.encode?.artifact?.bytes !== artifact.bytes ||
      rec.encode?.artifact?.sha256 !== artifact.sha256
    ) {
      fail(
        `--check bake-log ${s} encode.artifact: got ` +
          `${JSON.stringify(rec.encode?.artifact ?? null)}, published ` +
          `${JSON.stringify(artifact)}`,
        're-run without --check to refresh the row',
      );
    }
    const mdPath = join(LOG_DIR, `${room}.md`);
    const md = readFileSync(mdPath, 'utf8');
    if (!md.includes(mdTableRow(row))) {
      fail(
        `--check bake-log md: the encode row for ${s} is missing or stale`,
        're-run without --check',
      );
    }
  }
}

function printBand(state, stats) {
  const [lo, hi] = STOP_BAND[state];
  const inside = stats.wRaw >= lo && stats.wRaw <= hi;
  console.log(
    `stop-band ${state}: wRaw ${stats.wRaw} in [${lo}, ${hi}] -> ` +
      `${inside ? 'in band' : 'OUT OF BAND (run-card stop)'}`,
  );
}

function printPaste(room, intensity, gain) {
  console.log('');
  console.log(`ROOM.lightmaps.intensity = ${formatRow(intensity)}`);
  console.log(`INTERIOR_LOOK_GAIN.${room} = ${formatRow(gain)}`);
}

async function main() {
  const { room, states, dry, check } = parseArgs(process.argv.slice(2));
  const tc = readToolchain();
  requireTool(
    BLENDER,
    ['--version'],
    requirePinned(tc, 'blender'),
    'install Blender 4.2 LTS (brew install --cask blender@lts) or point ZIMNY_BLENDER at it',
  );
  const encode = await loadLmEncode(room);
  if (encode.transfer !== 'srgb') {
    fail(
      `LM_ENCODE.transfer '${encode.transfer}' — the D4 pipeline drives the sRGB ` +
        "branch ('linear' is the dormant fallback and is not wired here)",
    );
  }
  // Measure EVERY state first: no write happens until all measurements have passed.
  const perState = [];
  for (const state of states) {
    const stats = await measure(room, state, encode);
    assertStagedExr(room, state, stats); // the D4 input law (EXR + cells shas vs the log)
    printBand(state, stats);
    console.log(`measured ${room}/${state}: ${JSON.stringify(stats)}`);
    perState.push({ room, state, stats, encode, kappa: encode.displayClip[state] });
  }
  const intensity = Object.fromEntries(perState.map((row) => [row.state, row.stats.w]));
  const gain = Object.fromEntries(perState.map((row) => [row.state, row.stats.gain]));
  if (dry) {
    printPaste(room, intensity, gain); // --dry: stats + print ONLY, no writes
    return;
  }
  for (const row of perState) {
    row.artifact = publishedArtifact(room, row.state);
  }
  if (check) {
    assertCheck(room, perState); // a read-only gate: fail loud on any mismatched row
    console.log('--check PASS: manifest, look and bake-log rows match the fresh stats');
    printPaste(room, intensity, gain);
    return;
  }
  // Default pipeline: manifest FIRST (the reencode law reads it), then reencode,
  // then the bake-log encode rows, then the paste rows.
  writeManifestRows(room, perState);
  for (const row of perState) {
    run(process.execPath, ['tools/reencode.mjs', room, row.state]);
    row.artifact = publishedArtifact(room, row.state);
  }
  writeLogRows(room, perState);
  printPaste(room, intensity, gain);
}

try {
  await main();
} catch (error) {
  console.error(`lm-percentile: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
