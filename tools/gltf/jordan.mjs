// Zimny phase-2 — jordan (Jordan Staircase) room module. Part 1 = envelope.
// Part 2 / later slices append rows to EXPECTED_INSTANCES / MATERIAL_SLOTS / EMISSIVE_MATERIALS / METALLIC_MATERIALS.
//
// Orchestrator adjudications vs the specialist draft: this module binds to the REAL asset.mjs
// driver contract — exports ROOM {id:...} + optimise({roomId, stage, out}); the MANIFEST itself
// is written by tools/asset.mjs stepManifest via common.mjs writeManifest (the §8.1 shape:
// id/files/geometry/lightmaps/budget/toolchain with kind-tagged sha rows), so this module only
// ENCODES and GATES; KTX2 files live under tex/ per the §3.3 layout; GLTF_TRANSFORM and sha256
// come from common.mjs; repackBin's return (the repacked Buffer) is used directly.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLTF_TRANSFORM, parseGlb, repackBin, run, sha256, writeGlb } from '../common.mjs';

export const ROOM_ID = 'jordan';

export const ROOM = {
  id: ROOM_ID,
  title: 'Jordan Staircase',
  bounds: { x: [66, 92], y: [0, 20], z: [-86, -62] },
  budget: {
    trianglesMax: 380_000,
    drawsMax: 60,
    textureBytesMax: 4_000_000,
    payloadBytesMax: 7_000_000,
  },
  // r17a: filled by the bake (tools/bake.mjs) — three states at LM_RES 2048, the intensity
  // scalar is the bake's white point (ETC1S is 8-bit LDR; the runtime restores the level).
  lightmaps: { states: ['day', 'dusk', 'nightChandeliers'], res: 2048, intensity: 6.0 },
};

export const TEXTURES = ['marble_floor', 'plaster_warm', 'granite_grey', 'gilt'];
export const TEXTURE_SIZES = { marble_floor: 512, plaster_warm: 512, granite_grey: 256, gilt: 256 };
export const ATLAS_BYTES_MAX = 2_000_000;
export const EXPECTED_INSTANCES = {
  shell: 1,
  pane: 1,
  stairs: 1,
  rail: 1,
  baluster: 151,
  column: 2,
  portal: 1,
  chandelier: 1,
  sconce: 10,
  cornice: 1,
  pilaster: 16,
  pilaster_base: 16,
  window_frame: 12,
};
export const MATERIAL_SLOTS = {
  shell: ['plaster_warm', 'marble_floor'],
  pane: ['pane'],
  stairs: ['marble_floor'],
  rail: ['gilt'],
  baluster: ['gilt'],
  column: ['granite_grey', 'gilt'],
  portal: ['plaster_warm', 'gilt'],
  chandelier: ['gilt', 'chandelier_glow'],
  sconce: ['plaster_warm', 'sconce_glow'],
  cornice: ['plaster_warm'],
  pilaster: ['plaster_warm', 'gilt'],
  pilaster_base: ['plaster_warm'],
  window_frame: ['plaster_warm'],
};
export const EMISSIVE_MATERIALS = { pane: 6, sconce_glow: 6, chandelier_glow: 6 };
export const METALLIC_MATERIALS = { gilt: 0.5 };

const TOKTX_ARGS = [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  '128',
  '--threads',
  '1',
  '--genmipmap',
  '--assign_oetf',
  'srgb',
  '--assign_primaries',
  'bt709',
];
const TRANSFORM_STEPS = [
  ['dedup'],
  ['prune', '--keep-attributes', 'TEXCOORD_1'],
  ['weld'],
  ['quantize'],
  ['meshopt'],
];

function fail(message) {
  throw new Error(`[${ROOM_ID}] ${message}`);
}

function baseName(name) {
  return String(name)
    .replace(/\.\d{3}$/, '')
    .replace(/\.(png|jpe?g|ktx2)$/i, '');
}

function addExt(json, key, ext) {
  const list = json[key] ?? [];
  if (!list.includes(ext)) list.push(ext);
  json[key] = list;
}

function encodeTextures(stageDir, texOut) {
  const rows = [];
  for (const name of TEXTURES) {
    const png = join(stageDir, 'tex', `${name}.png`);
    if (!existsSync(png)) fail(`missing stage texture ${png}`);
    const ktx = join(texOut, `${name}.ktx2`);
    run('toktx', [...TOKTX_ARGS, ktx, png]);
    const buf = readFileSync(ktx);
    rows.push({ name, file: `tex/${name}.ktx2`, bytes: buf.length, sha256: sha256(buf) });
  }
  const bytes = rows.reduce((n, t) => n + t.bytes, 0);
  if (bytes > ATLAS_BYTES_MAX) fail(`atlas bytes ${bytes} > ${ATLAS_BYTES_MAX}`);
  return { rows, bytes };
}

function transformChain(stageDir) {
  let input = join(stageDir, `${ROOM_ID}.glb`);
  if (!existsSync(input)) fail(`missing bpy export ${input}`);
  for (const [step, ...args] of TRANSFORM_STEPS) {
    const output = join(stageDir, `${ROOM_ID}.${step}.glb`);
    run(GLTF_TRANSFORM.cmd, [...GLTF_TRANSFORM.args, step, input, output, ...args]);
    input = output;
  }
  return input;
}

function rewriteImagesToKtx2(json) {
  const images = json.images ?? [];
  const taken = new Set();
  const byName = images.map((img) => {
    const n = baseName(img.name ?? '');
    if (TEXTURES.includes(n) && !taken.has(n)) {
      taken.add(n);
      return n;
    }
    return null;
  });
  let cursor = 0;
  const names = [];
  for (let i = 0; i < images.length; i += 1) {
    let name = byName[i];
    if (!name) {
      while (cursor < TEXTURES.length && taken.has(TEXTURES[cursor])) cursor += 1;
      name = TEXTURES[cursor];
      if (!name) fail(`image ${i} cannot be mapped to a locked texture by name or order`);
      taken.add(name);
    }
    images[i] = { uri: `tex/${name}.ktx2`, mimeType: 'image/ktx2' };
    names.push(name);
  }
  json.images = images;
  json.textures = (json.textures ?? []).map(({ source, extensions, ...rest }) => {
    if (source === undefined) fail('texture without source');
    return { ...rest, extensions: { ...(extensions ?? {}), KHR_texture_basisu: { source } } };
  });
  if (images.length > 0) {
    addExt(json, 'extensionsUsed', 'KHR_texture_basisu');
    addExt(json, 'extensionsRequired', 'KHR_texture_basisu');
  }
  return names;
}

function gateConventions(json) {
  const used = json.extensionsUsed ?? [];
  const required = json.extensionsRequired ?? [];
  if (!required.includes('EXT_meshopt_compression')) fail('EXT_meshopt_compression not required');
  if (
    used.includes('KHR_draco_mesh_compression') ||
    required.includes('KHR_draco_mesh_compression')
  )
    fail('KHR_draco_mesh_compression is forbidden');
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      if (prim.mode !== undefined && prim.mode !== 4) fail(`${mesh.name}: non-triangle primitive`);
      const a = prim.attributes ?? {};
      if (a.TEXCOORD_0 === undefined || a.TEXCOORD_1 === undefined)
        fail(`${mesh.name}: TEXCOORD_0 and TEXCOORD_1 required on every primitive`);
      if (a.TANGENT !== undefined) fail(`${mesh.name}: TANGENT forbidden`);
    }
  }
  const materials = json.materials ?? [];
  if (!materials.some((m) => m.extensions?.KHR_materials_emissive_strength))
    fail('no material carries KHR_materials_emissive_strength');
  for (const [name, strength] of Object.entries(EMISSIVE_MATERIALS)) {
    const m = materials.find((mat) => baseName(mat.name ?? '') === name);
    if (!m) fail(`emissive material ${name} missing`);
    const s = m.extensions?.KHR_materials_emissive_strength?.emissiveStrength;
    if (typeof s !== 'number' || Math.abs(s - strength) > 1e-3)
      fail(`material ${name}: emissiveStrength ${s} != ${strength}`);
  }
  const slotMeshes = Object.keys(MATERIAL_SLOTS).sort();
  const instanceMeshes = Object.keys(EXPECTED_INSTANCES).sort();
  if (slotMeshes.join() !== instanceMeshes.join())
    fail(`MATERIAL_SLOTS [${slotMeshes}] != EXPECTED_INSTANCES [${instanceMeshes}]`);
  for (const [i, mesh] of (json.meshes ?? []).entries()) {
    const name = baseName(mesh.name ?? `mesh_${i}`);
    const slots = MATERIAL_SLOTS[name];
    if (!slots) fail(`${name}: no MATERIAL_SLOTS row`);
    const indices = mesh.primitives.map((prim) => {
      if (prim.material === undefined) fail(`${name}: primitive without material`);
      return prim.material;
    });
    const distinct = new Set(indices).size;
    if (distinct !== indices.length)
      fail(`${name}: ${indices.length} primitives over ${distinct} distinct materials`);
    const got = indices.map((m) => baseName(materials[m]?.name ?? `material_${m}`));
    if (got.join() !== slots.join()) fail(`${name}: materials [${got}] != slots [${slots}]`);
  }
  for (const name of Object.keys(METALLIC_MATERIALS))
    if (!materials.some((m) => baseName(m.name ?? '') === name))
      fail(`metallic material ${name} missing`);
  for (const [i, m] of materials.entries()) {
    const name = baseName(m.name ?? `material_${i}`);
    const expected = METALLIC_MATERIALS[name] ?? 0;
    const factor = m.pbrMetallicRoughness?.metallicFactor ?? 1;
    if (factor !== expected) fail(`material ${name}: metallicFactor ${factor} != ${expected}`);
  }
}

function geometryRows(json) {
  const meshes = json.meshes ?? [];
  const instances = meshes.map(() => 0);
  for (const node of json.nodes ?? []) if (node.mesh !== undefined) instances[node.mesh] += 1;
  const rows = {};
  for (const [i, mesh] of meshes.entries()) {
    const name = baseName(mesh.name ?? `mesh_${i}`);
    let triangles = 0;
    for (const prim of mesh.primitives) {
      const acc = json.accessors[prim.indices ?? prim.attributes.POSITION];
      triangles += Math.floor(acc.count / 3);
    }
    const row = rows[name] ?? { triangles: 0, instances: 0, primitives: 0 };
    if (row.instances > 0 && row.triangles !== triangles)
      fail(`mesh ${name}: .### datablock variants differ in triangles`);
    row.triangles = triangles;
    row.primitives = mesh.primitives.length;
    row.instances += instances[i];
    rows[name] = row;
  }
  return rows;
}

function gateDrift(rows, summary) {
  const expected = Object.keys(EXPECTED_INSTANCES).sort();
  const got = Object.keys(rows).sort();
  const declared = Object.keys(summary.meshes ?? {}).sort();
  if (got.join() !== expected.join()) fail(`glb meshes [${got}] != expected [${expected}]`);
  if (declared.join() !== expected.join())
    fail(`summary meshes [${declared}] != expected [${expected}]`);
  let drawn = 0;
  let draws = 0;
  for (const name of expected) {
    const r = rows[name];
    const s = summary.meshes[name];
    if (r.instances !== EXPECTED_INSTANCES[name])
      fail(`${name}: ${r.instances} instances, expected ${EXPECTED_INSTANCES[name]}`);
    if (s.instances !== r.instances) fail(`${name}: summary instances ${s.instances} drift`);
    if (s.triangles !== r.triangles)
      fail(`${name}: triangles glb ${r.triangles} != bpy ${s.triangles}`);
    drawn += r.triangles * r.instances;
    // draws gate counts UNIQUE PRIMITIVES (the doc's instanced-kit draw budget is a runtime
    // number after instancing; naive per-node draws are info-only, see the summary's drawsNaive).
    draws += r.primitives;
  }
  if (drawn !== summary.trianglesDrawn)
    fail(`drawn triangles ${drawn} != summary ${summary.trianglesDrawn}`);
  if (summary.budget?.trianglesMax !== ROOM.budget.trianglesMax)
    fail(`summary trianglesMax ${summary.budget?.trianglesMax} != ${ROOM.budget.trianglesMax}`);
  if (drawn > ROOM.budget.trianglesMax) fail(`drawn ${drawn} > trianglesMax`);
  if (draws > ROOM.budget.drawsMax) fail(`draws ${draws} > drawsMax`);
  return { drawn, draws };
}

export function optimise({ roomId, stage, out }) {
  // tool availability + pinned versions are checked by tools/asset.mjs stepGltf before this runs.
  const texOut = join(out, 'tex');
  mkdirSync(texOut, { recursive: true });
  const summary = JSON.parse(readFileSync(join(stage, 'summary.json'), 'utf8'));
  if (summary.room !== roomId) fail(`summary room ${summary.room} != ${roomId}`);
  if (summary.declared?.paneEmissionStrength !== EMISSIVE_MATERIALS.pane)
    fail('declared pane emission drifted from module');
  if (summary.declared?.giltMetallic !== METALLIC_MATERIALS.gilt)
    fail('declared gilt metallic drifted from module');

  const textures = encodeTextures(stage, texOut);
  const finalGlb = transformChain(stage);
  const { json, bin } = parseGlb(readFileSync(finalGlb));
  if (!json.buffers?.[0] || json.buffers[0].uri !== undefined)
    fail('meshopt GLB must carry a uri-less buffer 0 (chain must end .glb)');
  const imageNames = rewriteImagesToKtx2(json);
  for (const n of imageNames)
    if (!textures.rows.some((t) => t.name === n)) fail(`no ktx2 for ${n}`);

  const bin2 = repackBin(json, bin);
  gateConventions(json);
  const rows = geometryRows(json);
  const { drawn, draws } = gateDrift(rows, summary);

  const glbBuf = writeGlb(json, bin2);
  const glbPath = join(out, `${roomId}.glb`);
  writeFileSync(glbPath, glbBuf);
  const payloadBytes = glbBuf.length + textures.bytes;
  if (textures.bytes > ROOM.budget.textureBytesMax) fail('textureBytesMax exceeded');
  if (payloadBytes > ROOM.budget.payloadBytesMax)
    fail(`payload ${payloadBytes} > ${ROOM.budget.payloadBytesMax}`);
  console.log(`gltf: ${glbPath} ${glbBuf.length} B sha256 ${sha256(glbBuf)}`);
  for (const t of textures.rows) console.log(`gltf: ${t.file} ${t.bytes} B`);
  console.log(
    `gltf: ${Object.keys(rows)
      .map((n) => `${n}x${rows[n].instances}:${rows[n].triangles}`)
      .join(' ')} drawn ${drawn} draws ${draws}`,
  );
}
