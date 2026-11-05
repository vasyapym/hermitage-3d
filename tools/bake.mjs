/*
 * tools/bake.mjs — round 17a bake driver (pure node; the bake side of round 17).
 *
 * Implements docs/design-staircase.md
 *   §3.2  `pnpm asset:bake <room> <state>`: one Blender process per state (tools/bpy/bake.py),
 *         bake log at tools/bake-logs/<room>.md with time / samples / res / Blender version;
 *         a bake over ~45 min/state goes on the borrowed-hardware menu and never blocks.
 *   §3.3  committed layout: public/assets/<room>/lm/{day,dusk,night}.ktx2 + probe/dusk.ktx2,
 *         content-hashed into the room manifest like every other artifact.
 *   §4    bakes carry absolute brightness; manifest lightmaps.intensity = the room white point.
 *   §5 / ADR-0013 (amended): the dusk probe is a single equirect 512x256 ktx2.
 *
 * State law: states run in the fixed order day, dusk, nightChandeliers; file names day, dusk,
 * night. Determinism law: a fresh stage dir per state, toktx --threads 1, linear OETF, CPU
 * Cycles inside bake.py; `--verify` bakes the room twice and asserts sha256 equality of every
 * ktx2. Fence: never writes public/basis; the ROOM descriptor (tools/gltf/<room>.mjs) is read,
 * never edited; never import this from tests (Blender is absent in CI).
 */
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSETS_DIR,
  BLENDER,
  ChainError,
  ensureDir,
  KTX2_MAGIC,
  ROOT,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  sha256,
  writeManifest,
} from './common.mjs';

const ROOMS = ['rastrelli-gallery', 'jordan', 'military-gallery'];
const STATES = ['day', 'dusk', 'nightChandeliers'];
const STATE_FILE = { day: 'day', dusk: 'dusk', nightChandeliers: 'night' };
const STATE_ALIASES = { night: 'nightChandeliers' };
const BAKE_SCRIPT = path.join(ROOT, 'tools', 'bpy', 'bake.py');
const LOG_DIR = path.join(ROOT, 'tools', 'bake-logs');
const LAYOUT_JSON = path.join(ROOT, 'tools', 'gallery', 'layout.json');
const SUMMARY_PREFIX = 'ZIMNY_SUMMARY ';
const SLOW_BAKE_SECONDS = 45 * 60;
const PUBLISH_PREFIXES = ['lm/', 'probe/'];

// Same ETC1S economics as the committed albedo path, but the data is linear irradiance:
// the OETF is assigned linear so KTX2Loader hands three.js NoColorSpace data.
const TOKTX_LINEAR_FLAGS = [
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
// ORCHESTRATOR-ADJUDICATE: a mip chain bleeds across the 2 px lm cell pads below mip 1.
const TOKTX_GENMIPMAP = false;
const BLENDER_INSTALL =
  'install Blender 4.2 LTS (brew install --cask blender@lts) or point ZIMNY_BLENDER at it';
const TOKTX_INSTALL = 'install KTX-Software 4.4.2 (brew install ktx) so `toktx` is on PATH';

function usage(message) {
  console.error(`bake: ${message}`);
  console.error(
    'usage: node tools/bake.mjs <rastrelli-gallery|jordan|military-gallery> <day|dusk|night|all> [--verify]',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  for (const flag of flags) {
    if (flag !== '--verify') usage(`unknown flag ${flag}`);
  }
  const [room, stateArg] = positional;
  if (!room || !stateArg || positional.length > 2) usage('expected <room> <state|all>');
  if (!ROOMS.includes(room)) usage(`unknown room ${room}`);
  const state = STATE_ALIASES[stateArg] ?? stateArg;
  if (stateArg !== 'all' && !STATES.includes(state)) usage(`unknown state ${stateArg}`);
  const states = stateArg === 'all' ? STATES : [state];
  return { room, states, verifyMode: flags.includes('--verify') };
}

function stageDir(room, state, suffix) {
  // Never the bpy stage dir: bake-<file-state>[suffix] under the shared stage root.
  return path.join(STAGE_ROOT, room, `bake-${STATE_FILE[state]}${suffix}`);
}

function runBlenderBake(room, state, stage) {
  rmSync(stage, { recursive: true, force: true });
  ensureDir(stage);
  const args = [
    '-b',
    '--factory-startup',
    '-noaudio',
    '--python-exit-code',
    '1',
    '-P',
    BAKE_SCRIPT,
    '--',
    '--room',
    room,
    '--state',
    state,
    '--out',
    stage,
  ];
  const started = performance.now();
  const stdout = run(BLENDER, args, { capture: true });
  const seconds = Math.round((performance.now() - started) / 100) / 10;
  const line = stdout.split('\n').find((text) => text.startsWith(SUMMARY_PREFIX));
  if (!line) {
    throw new ChainError(`bake.py printed no ${SUMMARY_PREFIX.trim()} line for ${room}/${state}`);
  }
  console.log(line.trim());
  // bake.py reads no clock; the wall time is measured here around the subprocess.
  const summary = { ...JSON.parse(line.slice(SUMMARY_PREFIX.length)), seconds };
  // R4: bake.py --preview is a layout check only — its plates never reach the log or the room.
  if (summary.preview) {
    throw new ChainError('bake.py ran in preview mode — previews are never recorded or published');
  }
  writeFileSync(path.join(stage, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { summary, command: `node tools/bake.mjs ${room} ${state}` };
}

function encodeOutputs(summary, stage, percentileMode) {
  const flags = TOKTX_GENMIPMAP ? [...TOKTX_LINEAR_FLAGS, '--genmipmap'] : TOKTX_LINEAR_FLAGS;
  const magic = Buffer.from(KTX2_MAGIC);
  const artifacts = [];
  for (const file of summary.files) {
    if (!file.rel.endsWith('.png')) continue;
    // D1: a percentile room's lm charts bake EXR ONLY — their PNGs never exist, and a
    // probe PNG (the unchanged dusk-probe path) is the only bake-time ktx2 left.
    if (percentileMode && !file.rel.startsWith('probe/')) continue;
    const rel = file.rel.replace(/\.png$/, '.ktx2');
    const input = path.join(stage, file.rel);
    const output = path.join(stage, rel);
    ensureDir(path.dirname(output));
    run('toktx', [...flags, output, input]);
    const bytes = readFileSync(output);
    if (!bytes.subarray(0, magic.length).equals(magic)) {
      throw new ChainError(`${rel} is not a KTX2 container`);
    }
    artifacts.push({ rel, abs: output, bytes: bytes.length, sha256: sha256(bytes) });
  }
  // A percentile room legally emits zero artifacts for the sun-only states (day /
  // nightChandeliers): the EXR + cells.json ARE the deliverables; reencode +
  // lm-percentile own the publication.
  if (artifacts.length === 0 && !percentileMode) {
    throw new ChainError('bake.py emitted no PNG to encode');
  }
  return artifacts;
}

function publish(room, artifacts) {
  for (const artifact of artifacts) {
    if (!PUBLISH_PREFIXES.some((prefix) => artifact.rel.startsWith(prefix))) {
      throw new ChainError(
        `refusing to publish ${artifact.rel}: only lm/ and probe/ are bake outputs`,
      );
    }
    const target = path.join(ASSETS_DIR, room, artifact.rel);
    ensureDir(path.dirname(target));
    copyFileSync(artifact.abs, target);
    console.log(`wrote ${path.relative(ROOT, target)} (${artifact.bytes} B, ${artifact.sha256})`);
  }
}

async function loadRoom(room) {
  const file = path.join(ROOT, 'tools', 'gltf', `${room}.mjs`);
  const mod = await import(pathToFileURL(file).href);
  if (!mod.ROOM) throw new ChainError(`${path.relative(ROOT, file)} has no ROOM export`);
  // The module itself (NOT just ROOM): D1/D4 read mod.LM_ENCODE — the encode contract
  // bake.mjs logs for percentile rooms (mode === 'percentile') and the per-state kappa.
  return mod;
}

function logPaths(room) {
  return { json: path.join(LOG_DIR, `${room}.json`), md: path.join(LOG_DIR, `${room}.md`) };
}

function readLog(room) {
  const { json } = logPaths(room);
  if (!existsSync(json)) return { room, states: {} };
  return JSON.parse(readFileSync(json, 'utf8'));
}

/** D1-e: the per-state encode placeholders a percentile room's log carries; lm-percentile
 * fills wRaw/w/gain/clipFraction/haloFraction/artifact after its own measurement. */
function plantEncode(mod, state, summary) {
  const encode = mod.LM_ENCODE;
  return {
    artifact: null,
    cellsSha256: summary.cellsSha256 ?? null,
    clipFraction: null,
    gain: null,
    haloFraction: null,
    kappa: encode.displayClip[state] ?? null,
    mode: encode.mode,
    percentile: encode.percentile,
    scope: encode.scope,
    transfer: encode.transfer,
    w: null,
    wRaw: null,
  };
}

function record(state, result, artifacts, blenderVersion, mod) {
  const { summary, command } = result;
  const row = {
    blender: blenderVersion,
    charts: summary.charts ?? null,
    clippedFraction: summary.clippedFraction,
    command,
    denoiser: summary.denoiser,
    duskFixtures: summary.duskFixtures ?? null,
    margin: summary.margin,
    peak: summary.peak,
    probe: summary.probe ?? null,
    res: summary.res,
    samples: summary.samples,
    seconds: summary.seconds,
    state,
    whitePoint: summary.whitePoint,
    artifacts: artifacts.map(({ rel, bytes, sha256: digest }) => ({ rel, bytes, sha256: digest })),
  };
  // Sibling byte-stability: the two new provenance keys land only when a bake EMITS them
  // (jordan's rig + the builder's cells.json; absent rows on the siblings' paths).
  if (summary.rig !== null && summary.rig !== undefined) row.rig = summary.rig;
  if (summary.cellsSha256) row.cellsSha256 = summary.cellsSha256;
  if (mod.LM_ENCODE?.mode === 'percentile') {
    row.encode = plantEncode(mod, state, summary); // the D2 retired whitePoint row's +1
  }
  return row;
}

function minutes(seconds) {
  return (seconds / 60).toFixed(1);
}

function renderLog(room, log) {
  const lines = [
    `# Bake log — ${room}`,
    '',
    'Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are',
    'measured by the driver around the Blender subprocess; everything else is deterministic.',
    'The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).',
    '',
    '| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const state of STATES) {
    const row = log.states[state];
    if (!row) continue;
    const kitChart = (row.charts ?? []).find((chart) => chart.name !== 'arch');
    lines.push(
      `| ${state} | \`${row.command}\` | ${row.blender} | ${row.res}` +
        `${kitChart ? `+${kitChart.res}` : ''} | ${row.samples} | ` +
        `${row.denoiser} | ${row.whitePoint} | ${row.peak} | ${row.clippedFraction} | ` +
        `${row.seconds.toFixed(1)} |`,
    );
  }
  lines.push(
    '',
    '## Artifacts',
    '',
    '| state | file | bytes | sha256 |',
    '| --- | --- | --- | --- |',
  );
  for (const state of STATES) {
    const row = log.states[state];
    if (!row) continue;
    for (const artifact of row.artifacts) {
      lines.push(`| ${state} | ${artifact.rel} | ${artifact.bytes} | ${artifact.sha256} |`);
    }
  }
  // D1-e: the encode section mirrors the per-state encode placeholders; a room without
  // them (the siblings) renders exactly the committed md bytes.
  const encodedStates = STATES.filter((state) => log.states[state]?.encode !== undefined);
  if (encodedStates.length > 0) {
    lines.push(
      '',
      '## Encode',
      '',
      '| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const state of encodedStates) {
      const row = log.states[state].encode;
      const artifact =
        row.artifact === null || row.artifact === undefined
          ? null
          : `${row.artifact.bytes} B ${row.artifact.sha256}`;
      lines.push(
        `| ${state} | ${row.mode} | ${row.transfer} | ${row.wRaw} | ${row.w} | ` +
          `${row.gain} | ${row.kappa} | ${row.clipFraction} | ${row.haloFraction} | ` +
          `${artifact} |`,
      );
    }
  }
  lines.push('', '## Borrowed-hardware menu', '');
  const slow = STATES.filter((state) => (log.states[state]?.seconds ?? 0) > SLOW_BAKE_SECONDS);
  if (slow.length === 0) {
    lines.push(`No state exceeded the ~${SLOW_BAKE_SECONDS / 60} min/state threshold here.`);
  }
  for (const state of slow) {
    const row = log.states[state];
    const rate = ((row.res * row.res * row.samples) / row.seconds / 1e6).toFixed(2);
    lines.push(
      `- ${state}: ${minutes(row.seconds)} min wall at ${rate} Msamples/s on this CPU; the full ` +
        `room (${STATES.length} states) projects to ~${minutes(row.seconds * STATES.length)} min ` +
        'at this rate — borrowed hardware recommended (§3.2); this never blocks.',
    );
  }
  return `${lines.join('\n')}\n`;
}

function writeLog(room, log) {
  ensureDir(LOG_DIR);
  const ordered = { room, states: {} };
  for (const state of STATES) {
    if (log.states[state]) ordered.states[state] = log.states[state];
  }
  const { json, md } = logPaths(room);
  writeFileSync(json, `${JSON.stringify(ordered, null, 2)}\n`);
  writeFileSync(md, renderLog(room, ordered));
  console.log(`wrote ${path.relative(ROOT, md)}`);
}

/** The kit chart's committed resolution — tools/gallery/layout.json's lightmap.sizePx (the
 * one home the kit res already has; never duplicated into the manifest row, D-7). */
function kitRes() {
  if (!existsSync(LAYOUT_JSON)) return null;
  return JSON.parse(readFileSync(LAYOUT_JSON, 'utf8')).lightmap.sizePx;
}

function chartOf(row, name) {
  const charts = row.charts ?? [];
  return charts.find((chart) => chart.name === name) ?? null;
}

function lightmapsRow(descriptor, log, kit) {
  const committed = descriptor.lightmaps;
  // The committed row may exist as an EMPTY placeholder ({states: [], res, intensity null}) —
  // only a row that actually names states counts as filled (orchestrator adjudication).
  if (committed && Array.isArray(committed.states) && committed.states.length > 0) {
    // R4 (D-14): the filled row must agree with the bake records on the chart resolutions
    // and — when the descriptor carries a true per-state table (the values differ, 1812's
    // r17c shape) — on the white points. The siblings' scalar-era rows keep the committed
    // behaviour: their encode scalar was superseded by the re-encode law, never by a re-bake.
    for (const state of STATES) {
      const rec = log.states[state];
      if (!rec) {
        throw new ChainError(
          `lightmaps row names ${state} but no bake record exists — bake it first`,
        );
      }
      const arch = chartOf(rec, 'arch') ?? { res: rec.res };
      if (arch.res !== committed.res) {
        throw new ChainError(
          `bake record ${state}: arch res ${arch.res} !== the descriptor's ${committed.res}`,
        );
      }
      const kitRec = chartOf(rec, 'kit');
      if (kitRec !== null && kitRec.res !== kit) {
        throw new ChainError(
          `bake record ${state}: kit res ${kitRec.res} !== layout.json's ${kit}`,
        );
      }
      const values = Object.values(committed.intensity ?? {});
      const isPerStateTable = values.length > 0 && !values.every((v) => v === values[0]);
      // D1/D2: a 'percentile' bake record carries the SENTINEL, not a white point — the
      // per-state dict's numbers are owned by the manifest + lm-percentile now, so the
      // equality gate against the bake-time white point applies to scalar bake rooms only.
      const isPercentileRecord = rec.whitePoint === 'percentile';
      if (isPerStateTable && !isPercentileRecord && committed.intensity[state] !== rec.whitePoint) {
        throw new ChainError(
          `bake record ${state}: white point ${rec.whitePoint} !== the descriptor's ` +
            `${committed.intensity[state]}`,
        );
      }
    }
    return { row: committed, proposed: false };
  }
  // All-or-nothing law: the manifest may name a state only when its ktx2 is on disk (the
  // artifact fence asserts manifest.files == the walked directory, and the runtime fetches
  // EVERY manifest row). A partial bake set therefore publishes nothing and rebuilds nothing.
  const records = STATES.map((state) => log.states[state]);
  if (records.some((r) => !r)) {
    throw new ChainError(
      'lightmaps row needs every state baked — bake the remaining states first ' +
        `(have: ${
          records
            .filter(Boolean)
            .map((r) => r.state)
            .join(', ') || 'none'
        })`,
    );
  }
  const [first] = records;
  const archRes = (chartOf(first, 'arch') ?? { res: first.res }).res;
  const firstKit = chartOf(first, 'kit');
  for (const entry of records) {
    const arch = chartOf(entry, 'arch') ?? { res: entry.res };
    const kitRec = chartOf(entry, 'kit');
    if (arch.res !== archRes) {
      throw new ChainError('bake records disagree on the arch res; re-bake the room');
    }
    if ((kitRec?.res ?? null) !== (firstKit?.res ?? null)) {
      throw new ChainError('bake records disagree on the kit res; re-bake the room');
    }
  }
  return {
    row: {
      states: STATES,
      res: archRes,
      intensity: Object.fromEntries(records.map((r) => [r.state, r.whitePoint])),
    },
    proposed: true,
  };
}

function verify(room, states, percentileMode) {
  const passes = [];
  for (const suffix of ['-verify-a', '-verify-b']) {
    const artifacts = [];
    for (const state of states) {
      const stage = stageDir(room, state, suffix);
      const { summary } = runBlenderBake(room, state, stage);
      artifacts.push(...encodeOutputs(summary, stage, percentileMode));
    }
    passes.push(new Map(artifacts.map((artifact) => [artifact.rel, artifact.sha256])));
  }
  const [first, second] = passes;
  const rels = [...new Set([...first.keys(), ...second.keys()])].sort();
  let failed = false;
  for (const rel of rels) {
    const same = first.has(rel) && first.get(rel) === second.get(rel);
    failed = failed || !same;
    console.log(
      `${same ? 'PASS' : 'FAIL'} ${rel} ${first.get(rel) ?? '-'} ${second.get(rel) ?? '-'}`,
    );
  }
  console.log(failed ? 'VERIFY FAIL: bake is not byte-identical' : 'VERIFY PASS: byte-identical');
  if (failed) process.exit(1);
}

async function main() {
  const { room, states, verifyMode } = parseArgs(process.argv.slice(2));
  const tc = readToolchain();
  requireTool(BLENDER, ['--version'], requirePinned(tc, 'blender'), BLENDER_INSTALL);
  requireTool('toktx', ['--version'], requirePinned(tc, 'toktx'), TOKTX_INSTALL);
  const mod = await loadRoom(room);
  const descriptor = mod.ROOM;
  const percentileMode = mod.LM_ENCODE?.mode === 'percentile';
  if (verifyMode) {
    verify(room, states, percentileMode);
    return;
  }
  const blenderVersion = run(BLENDER, ['--version'], { capture: true }).split('\n')[0].trim();
  const log = readLog(room);
  for (const state of states) {
    const stage = stageDir(room, state, '');
    const result = runBlenderBake(room, state, stage);
    const artifacts = encodeOutputs(result.summary, stage, percentileMode);
    log.states[state] = record(state, result, artifacts, blenderVersion, mod);
    if (result.summary.seconds > SLOW_BAKE_SECONDS) {
      console.log(`bake: ${state} took ${minutes(result.summary.seconds)} min — see the menu`);
    }
  }
  writeLog(room, log);
  // All-or-nothing law (lightmapsRow): publish + manifest rebuild only when EVERY state of
  // the room has a bake record — a partial set would break the artifact fence (manifest must
  // equal the walked directory) and the runtime (it fetches every manifest row).
  const complete = STATES.every((state) => log.states[state] !== undefined);
  if (!complete) {
    console.log(
      `bake: not all states baked (${STATES.filter((s) => log.states[s]).join(', ') || 'none'} ` +
        `of ${STATES.join(', ')}) — nothing published, manifest untouched`,
    );
    return;
  }
  // Publish every state's CURRENT ktx2 from its stage dir: a state baked in an earlier run
  // keeps its stage output, so one run publishing only its own artifacts would leave the
  // other states' manifest rows pointing at nothing. The log rows carry the same sha256
  // values — each was recorded from the very bake that left the stage file in place.
  const staged = [];
  for (const state of STATES) {
    const stage = stageDir(room, state, '');
    for (const prefix of PUBLISH_PREFIXES) {
      const dir = path.join(stage, prefix);
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith('.ktx2')) continue;
        const abs = path.join(dir, name);
        const bytes = readFileSync(abs);
        if (!bytes.subarray(0, Buffer.from(KTX2_MAGIC).length).equals(Buffer.from(KTX2_MAGIC))) {
          throw new ChainError(`${prefix}${name} is not a KTX2 container`);
        }
        staged.push({
          rel: `${prefix}${name}`,
          abs,
          bytes: bytes.length,
          sha256: sha256(bytes),
        });
      }
    }
  }
  publish(room, staged);
  const { row, proposed } = lightmapsRow(descriptor, log, kitRes());
  writeManifest({ ...descriptor, lightmaps: row }, path.join(ASSETS_DIR, room), tc);
  if (proposed) {
    console.log(
      `bake: ROOM.lightmaps is empty in tools/gltf/${room}.mjs — write this row there, then run ` +
        `\`pnpm asset:manifest ${room}\`: ${JSON.stringify(row)}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof ChainError ? `bake: ${error.message}` : error);
  process.exit(1);
});
