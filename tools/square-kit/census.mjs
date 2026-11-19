// Square exterior kit — the DEC-045 chain (design §6 M2): build ×2 → sha equal → place →
// census → manifest. Pure node, no src/ imports (the common.mjs law); the law's own vitest
// gate (pnpm kit:square's second half) validates the committed artifacts (G3/G7). No toktx and
// no gltf-transform: the kit is geometry-only (G5), Blender 4.2.23 LTS is the only tool.
// usage: node tools/square-kit/census.mjs
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASSETS_DIR,
  BLENDER,
  ChainError,
  ensureDir,
  parseGlbJson,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  sha256,
} from '../common.mjs';

const KIT_DIR = join(ASSETS_DIR, 'square');
const KIT_GLB = 'kit.glb';
/** The SQUARE_KIT_BUDGET row (src/world/square-kit.ts); the vitest gate catches any drift. */
const BUDGET = {
  trianglesMax: 18_000,
  drawsMax: 6,
  textureBytesMax: 1,
  payloadBytesMax: 1_500_000,
};

const fail = (msg) => {
  throw new ChainError(`census: ${msg}`);
};

const IDENTITY_MATRIX = '1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1';

/** G6's identity law: absent transforms, or the explicit identity values. */
function isIdentityTransform(node) {
  return (
    (!node.matrix || node.matrix.join(',') === IDENTITY_MATRIX) &&
    (!node.translation || node.translation.every((v) => v === 0)) &&
    (!node.rotation || node.rotation.join(',') === '0,0,0,1') &&
    (!node.scale || node.scale.every((v) => v === 1))
  );
}

/**
 * The census: per glTF node referencing a mesh — { name, tris, aabb, materials }.
 * AABB straight from the POSITION accessor min/max (legal only under identity transforms);
 * materials per primitive in order (repeats kept — each slot is one runtime draw call).
 */
function censusNodes(json) {
  const meshes = json.meshes ?? [];
  const materials = json.materials ?? [];
  return (json.nodes ?? []).flatMap((node, nodeIndex) => {
    if (node.mesh === undefined) return [];
    if (!isIdentityTransform(node)) fail(`node ${nodeIndex}: non-identity transform (G6)`);
    const mesh = meshes[node.mesh];
    if (!mesh) fail(`node ${nodeIndex}: references a missing mesh`);
    let tris = 0;
    const nodeMaterials = [];
    for (const p of mesh.primitives) {
      if ((p.mode ?? 4) !== 4) fail(`node ${nodeIndex}: non-triangle primitive (G3)`);
      const accessor = json.accessors[p.indices ?? p.attributes?.POSITION];
      if (!accessor || !Number.isInteger(accessor.count)) {
        fail(`node ${nodeIndex}: primitive without an index/position accessor count`);
      }
      tris += accessor.count / 3;
      if (p.material === undefined) {
        fail(`node ${nodeIndex}: primitive without a material (the bind law needs named slots)`);
      }
      const name = materials[p.material]?.name;
      if (!name) fail(`node ${nodeIndex}: primitive references an unnamed material`);
      nodeMaterials.push(name);
    }
    const position = mesh.primitives[0]?.attributes?.POSITION;
    const posAccessor = position === undefined ? undefined : json.accessors[position];
    if (!posAccessor?.min || !posAccessor.max) {
      fail(`node ${nodeIndex}: the POSITION accessor carries no min/max (the AABB law)`);
    }
    return [
      {
        name: node.name ?? `node_${nodeIndex}`,
        tris,
        aabb: { min: posAccessor.min, max: posAccessor.max },
        materials: nodeMaterials,
      },
    ];
  });
}

function censusGlb(glbPath) {
  const buf = readFileSync(glbPath);
  const json = parseGlbJson(buf);
  if ((json.images ?? []).length || (json.textures ?? []).length || (json.samplers ?? []).length) {
    fail('the kit carries images/textures/samplers — the geometry-only fence (G5)');
  }
  const buffers = json.buffers ?? [];
  // The strict GLB rule with the empty-kit allowance: zero buffers while the kit ships no
  // geometry (M2), exactly one bufferless buffer once content lands (C1).
  if (buffers.length > 1 || buffers.some((b) => b.uri !== undefined)) {
    fail('the kit is not a strict single-buffer GLB (the room contract rule)');
  }
  return { bytes: buf.length, digest: sha256(buf), nodes: censusNodes(json) };
}

async function main() {
  const tc = readToolchain();
  requireTool(
    BLENDER,
    ['--version'],
    requirePinned(tc, 'blender'),
    `Blender ${tc.blender} (or set ZIMNY_BLENDER=<binary>)`,
  );
  const runDir = (name) => join(STAGE_ROOT, 'square', name);
  const runs = ['run-a', 'run-b'].map((name) => runDir(name));
  for (const stage of runs) ensureDir(stage);
  let summaryLine = null;
  for (const stage of runs) {
    const out = run(
      BLENDER,
      [
        '-b',
        '--factory-startup',
        '-noaudio',
        '-P',
        join('tools', 'square-kit', 'build_square_kit.py'),
        '--',
        '--out',
        stage,
      ],
      { capture: true },
    );
    if (stage === runs[0]) {
      summaryLine = out.split('\n').find((l) => l.startsWith('ZIMNY_SUMMARY '));
      if (!summaryLine) fail('the bpy script printed no ZIMNY_SUMMARY line');
    }
  }
  writeFileSync(
    join(runs[0], 'summary.json'),
    `${summaryLine.slice('ZIMNY_SUMMARY '.length).trim()}\n`,
  );
  const glbs = runs.map((stage) => readFileSync(join(stage, 'square.raw.glb')));
  const digests = glbs.map(sha256);
  if (digests[0] !== digests[1]) {
    fail(`G2 determinism: the two builds differ (${digests[0]} vs ${digests[1]})`);
  }
  ensureDir(KIT_DIR);
  const kitPath = join(KIT_DIR, KIT_GLB);
  copyFileSync(join(runs[0], 'square.raw.glb'), kitPath);
  const { bytes, digest, nodes } = censusGlb(kitPath);
  const manifest = {
    id: 'square',
    files: [{ path: KIT_GLB, bytes, sha256: digest, kind: 'glb' }],
    lightmaps: { states: [], res: null, intensity: null },
    budget: BUDGET,
    toolchain: { blender: requirePinned(tc, 'blender'), three: requirePinned(tc, 'three') },
    nodes,
    glbSha256: digest,
  };
  writeFileSync(join(KIT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const tris = nodes.reduce((t, n) => t + n.tris, 0);
  console.log(
    `kit:square: ${nodes.length} node(s), ${tris} tris, ${bytes} B payload, sha ${digest.slice(0, 12)}…`,
  );
}

await main();
