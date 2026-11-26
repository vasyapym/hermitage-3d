// Asset-chain driver — design-staircase.md §3, DEC-016.
// usage: node tools/asset.mjs <bpy|gltf|manifest|basis|bake|all> [room=_check]
// One command per part, every subprocess line echoed, runs from repo root, non-zero on any failure.
// Blender/toktx/gltf-transform never run in CI; CI only hashes committed files (tests/assets.test.ts).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSETS_DIR,
  BASIS_DIR,
  BLENDER,
  ChainError,
  ensureDir,
  GLTF_TRANSFORM,
  ROOT,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  writeManifest,
} from './common.mjs';

const STEMS = { _check: '_pipeline_check' }; // room id → tools/bpy/<stem>.py + tools/gltf/<stem>.mjs
const [, , sub = 'help', roomId = '_check'] = process.argv;
const stem = STEMS[roomId] ?? roomId;
const paths = {
  bpy: join(ROOT, 'tools', 'bpy', `${stem}.py`),
  gltf: join(ROOT, 'tools', 'gltf', `${stem}.mjs`),
  stage: join(STAGE_ROOT, roomId),
  out: join(ASSETS_DIR, roomId),
};

function fail(msg) {
  console.error(`asset: ${msg}`);
  process.exit(1);
}

async function loadRoom() {
  if (!existsSync(paths.gltf)) fail(`missing ${paths.gltf}`);
  const mod = await import(pathToFileURL(paths.gltf).href);
  if (mod.ROOM?.id !== roomId || typeof mod.optimise !== 'function')
    fail(`${paths.gltf} must export ROOM {id:"${roomId}"} and optimise()`);
  return mod;
}

function stepBpy(tc) {
  if (!existsSync(paths.bpy)) fail(`missing ${paths.bpy}`);
  requireTool(
    BLENDER,
    ['--version'],
    requirePinned(tc, 'blender'),
    `Blender ${tc.blender} (or set ZIMNY_BLENDER=<binary>)`,
  );
  ensureDir(paths.stage);
  const out = run(
    BLENDER,
    [
      '-b',
      '--factory-startup',
      '-noaudio',
      '-P',
      paths.bpy,
      '--',
      '--room',
      roomId,
      '--out',
      paths.stage,
    ],
    { capture: true },
  );
  process.stdout.write(out);
  const line = out.split('\n').find((l) => l.startsWith('ZIMNY_SUMMARY '));
  if (!line) fail('bpy script printed no ZIMNY_SUMMARY line');
  writeFileSync(
    join(paths.stage, 'summary.json'),
    `${line.slice('ZIMNY_SUMMARY '.length).trim()}\n`,
  );
}

async function stepGltf(tc) {
  requireTool(
    'toktx',
    ['--version'],
    requirePinned(tc, 'toktx'),
    `KTX-Software ${tc.toktx} (toktx on PATH)`,
  );
  requireTool(
    GLTF_TRANSFORM.cmd,
    [...GLTF_TRANSFORM.args, '--version'],
    requirePinned(tc, 'gltfTransformCli'),
    `devDependency @gltf-transform/cli ${tc.gltfTransformCli} (pnpm install)`,
  );
  const mod = await loadRoom();
  ensureDir(paths.out);
  await mod.optimise({ roomId, stage: paths.stage, out: paths.out, toolchain: tc });
}

// The layout-identity law (rastrelli-next round 4, design 6.4): the shelf-law room's bake
// states. The gate is the stage summary's lm.layoutHash row — absent for every other room,
// whose manifests stay byte-stable.
const LM_LAYOUT_STATES = ['day', 'dusk', 'nightChandeliers'];
function lmLayoutProvenance() {
  const summaryPath = join(paths.stage, 'summary.json');
  if (!existsSync(summaryPath)) return null;
  const lm = JSON.parse(readFileSync(summaryPath, 'utf8')).lm ?? {};
  if (typeof lm.layoutHash !== 'string' || lm.layoutHash === '') return null;
  for (const state of LM_LAYOUT_STATES) {
    const sidecar = join(paths.stage, `bake-summary.${state}.json`);
    if (!existsSync(sidecar))
      fail(`manifest: layout identity: ${sidecar} missing — run the ${state} bake at this commit`);
    const row = JSON.parse(readFileSync(sidecar, 'utf8')).lmLayout ?? {};
    if (row.layoutHash !== lm.layoutHash)
      fail(
        `manifest: layout identity: export hash ${lm.layoutHash} vs ${state} bake ${row.layoutHash}`,
      );
  }
  console.log(
    `manifest: layout identity ok ${LM_LAYOUT_STATES.length} state(s) hash=${lm.layoutHash.slice(0, 16)}`,
  );
  return { layoutHash: lm.layoutHash };
}

async function stepManifest(tc) {
  const mod = await loadRoom();
  if (!existsSync(paths.out)) fail(`${paths.out} missing — run pnpm asset:gltf ${roomId} first`);
  const lm = lmLayoutProvenance();
  const m = writeManifest(mod.ROOM, paths.out, tc, lm ? { lm } : {});
  const bytes = m.files.reduce((t, f) => t + f.bytes, 0);
  console.log(
    `manifest: ${roomId} ${m.files.length} file(s) ${bytes} B, ${m.geometry.trianglesDrawn} tris drawn (${m.geometry.trianglesUnique} unique)`,
  );
  for (const mesh of m.geometry.meshes)
    console.log(
      `manifest:   ${mesh.name} ×${mesh.instances} ${mesh.triangles} tris ${mesh.primitives} prim(s)`,
    );
}

function stepBasis(tc) {
  const pkg = join(ROOT, 'node_modules', 'three', 'package.json');
  if (!existsSync(pkg)) fail('three not installed — pnpm install');
  const installed = JSON.parse(readFileSync(pkg, 'utf8')).version;
  if (installed !== tc.three)
    fail(`three ${installed} installed, tools/toolchain.json pins ${tc.three}`);
  const src = join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis');
  ensureDir(BASIS_DIR);
  for (const name of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
    const from = join(src, name);
    const to = join(BASIS_DIR, name);
    if (!existsSync(from)) fail(`missing ${from}`);
    if (existsSync(to) && readFileSync(from).equals(readFileSync(to))) {
      console.log(`basis: ${name} up to date`);
      continue;
    }
    console.log(`basis: copy ${from} -> ${to}`);
    copyFileSync(from, to);
  }
}

const STEPS = {
  bpy: stepBpy,
  gltf: stepGltf,
  manifest: stepManifest,
  basis: stepBasis,
  bake: () =>
    fail('bake: lightmap bakes land in r17 (tools/bpy/bake.py) — not implemented in this slice'),
  all: async (tc) => {
    stepBpy(tc);
    await stepGltf(tc);
    await stepManifest(tc);
  },
};

if (!(sub in STEPS)) fail(`usage: node tools/asset.mjs <${Object.keys(STEPS).join('|')}> [room]`);
if (!/^[a-z_][a-z0-9_-]*$/i.test(roomId)) fail(`bad room id "${roomId}"`);
console.log(`asset: ${sub} ${roomId}`);
try {
  await STEPS[sub](readToolchain());
} catch (e) {
  if (e instanceof ChainError) fail(e.message);
  throw e;
}
