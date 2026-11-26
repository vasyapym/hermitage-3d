// Zimny phase-2 — Jordan Staircase room module.
//
// Driver contract: ROOM + optimise({roomId, stage, out}). The manifest itself
// is written by tools/asset.mjs via common.mjs writeManifest; this module
// encodes albedos and gates the room. Lightmap encoding belongs to reencode.mjs.
// KTX2 albedos live under tex/. repackBin returns the repacked Buffer directly.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLTF_TRANSFORM, parseGlb, repackBin, run, sha256, writeGlb } from '../common.mjs';

export const ROOM_ID = 'jordan';

export const LM_ENCODE = {
  mode: 'percentile',
  transfer: 'srgb',
  percentile: 99.5,
  luminance: [0.2126, 0.7152, 0.0722],
  scope: 'allocated-interior',
  excludeMaterials: ['pane', 'sconce_glow', 'chandelier_glow'],
  clamp: {
    // 2c: the hour written in the bands — day percentile-led [0.2, 0.45] (the W 0.7 draw
    // darkened the display: the sky ×4 does not reach the diffuse walls through the swap
    // glass — the wall raw stayed ≈ flat while the band's rise divided the display; the
    // capture read decided, per the reply's own risk clause — the day W returns to 0.45
    // with the world-lifted raw body, so the walls hold the committed level and the
    // sun-lit zones brighten), dusk band-forced [0.35, 0.45]
    // (the rig runs ×0.1 for real after the RIG_STATE_SCALE multiplier fix; the body is
    // bounce-bound — the world's p50 response is sublinear, 0.10→0.028 / 0.30→0.036 raw —
    // so the reply's one band trim lands the median inside its 70–90 gate; the ETC1S q128
    // dark-median loss measured −22 at this level), night band-forced [4.0, 4.5]
    // (≥ the raw p99.5 so the pools keep the lamp tint and the walls fall off).
    day: [0.2, 0.45],
    dusk: [0.35, 0.45],
    nightChandeliers: [4.0, 4.5],
  },
  displayClip: { day: 1.0, dusk: 1.0, nightChandeliers: 1.0 },
  round: 2,
};

// The jordan-fixtures round's driver rows (reported edits): under FIXTURE_FORM='slice_e'
// the sconce archetype carries gilt + sconce_glow + crystal (the opaque new material);
// the placeholder path keeps the committed rows byte-identical. The env is validated
// STRICTLY (the review HIGH-3): empty/unset = 'placeholder', 'slice_e' = 'slice_e',
// anything else fails loud at the load — no silent fallback to placeholder (a typo such
// as 'slice-e' must never masquerade as the committed form).
function fixtureFormEnv() {
  const raw = process.env.FIXTURE_FORM ?? '';
  if (raw === '' || raw === 'placeholder') return 'placeholder';
  if (raw === 'slice_e') return 'slice_e';
  return fail(`FIXTURE_FORM ${JSON.stringify(raw)} is not 'placeholder' or 'slice_e'`);
}
const FIXTURE_FORM = fixtureFormEnv();

// The slice-2b wall articulation driver row: the same strict env law as
// FIXTURE_FORM. Unset/'none' keeps the committed roster byte-identical (the r15
// law); 'slice_2b' gates the wall_order kit's rows — jordan.py builds them
// export-only (the gallery's exported-never-baked law), so the bpy and gltf steps
// must agree on the env or the gate joins fail loud.
function wallArticulationEnv() {
  const raw = process.env.WALL_ARTICULATION ?? '';
  if (raw === '' || raw === 'none') return 'none';
  if (raw === 'slice_2b') return 'slice_2b';
  return fail(`WALL_ARTICULATION ${JSON.stringify(raw)} is not 'none' or 'slice_2b'`);
}
const WALL_ARTICULATION = wallArticulationEnv();

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
  lightmaps: {
    states: ['day', 'dusk', 'nightChandeliers'],
    res: 2048,
    // lm-percentile's landed row (fresh-bake plates, 2c bands, κ=1): day wRaw 2.613 → 0.45,
    // dusk wRaw 0.252 → 0.35 (the band's lo), night wRaw 2.363 → 4.0 (tools/bake-logs/jordan.md § Encode).
    intensity: { day: 0.45, dusk: 0.35, nightChandeliers: 4 },
  },
};

export const TEXTURES = ['marble_floor', 'plaster_warm', 'granite_grey', 'gilt', 'plafond', 'neva'];
export const TEXTURE_SIZES = {
  marble_floor: 512,
  plaster_warm: 512,
  granite_grey: 256,
  gilt: 256,
  plafond: 1024,
  // The round-29 Neva backcloth: the pane's painted view plate (the square plate, the
  // v law (y − 2)/16; the mean pin lives in the rasterizer).
  neva: 1024,
};
export const ATLAS_BYTES_MAX = 2_000_000;
export const EXPECTED_INSTANCES = {
  shell: 1,
  pane: 1,
  // The jordan-parallel plafond round: the painted field + the gilt frame ring, one
  // instance each (single meshes, never templates).
  plafond: 1,
  plafond_frame: 1,
  stairs: 1,
  rail: 1,
  baluster: 151,
  column: 2,
  portal: 1,
  chandelier: 1,
  // The jordan-fixtures B2: the chandelier assembly's archetype datablocks ride the
  // slice_e build only (the placeholder path keeps the committed roster byte-identical).
  ...(FIXTURE_FORM === 'slice_e' ? { chandelier_arm: 36, chandelier_bead: 300 } : {}),
  sconce: 10,
  cornice: 1,
  // The slice-2b wall order: ONE in-place mesh (the panels + the rings), export-only
  // (the bpy/gltf steps must agree on the env — the strict validation above).
  ...(WALL_ARTICULATION === 'slice_2b' ? { wall_order: 1 } : {}),
  // The bands fix (2026-11-16): one template datablock per wall / per tier so bake.py's
  // centroid representative runs inside each group (the old single-datablock rows
  // pilaster 16 / pilaster_base 16 / window_frame 12 are gone with the split).
  // the ghost-split round (2026-11-18): the north shafts per-pier — one instance each
  pilaster_n0: 1,
  pilaster_n1: 1,
  pilaster_n2: 1,
  pilaster_n3: 1,
  pilaster_n4: 1,
  pilaster_n5: 1,
  pilaster_n6: 1,
  pilaster_s: 5,
  pilaster_e: 4,
  pilaster_base_n: 7,
  pilaster_base_s: 5,
  pilaster_base_e: 4,
  window_frame_lo: 6,
  window_frame_hi: 6,
};
export const MATERIAL_SLOTS = {
  shell: ['plaster_warm', 'marble_floor'],
  pane: ['pane'],
  // The jordan-parallel plafond round: the field's one painting slot; the frame reuses gilt.
  plafond: ['plafond'],
  plafond_frame: ['gilt'],
  stairs: ['marble_floor'],
  rail: ['gilt'],
  baluster: ['gilt'],
  column: ['granite_grey', 'gilt'],
  portal: ['plaster_warm', 'gilt'],
  // The jordan-fixtures B2: the chandelier assembly's slots — the stem's one gilt
  // primitive; the arm archetype's gilt/glow/crystal; the bead's crystal. The
  // placeholder path keeps the committed rows byte-identical and carries NO extra keys
  // (the slot/instance roster join would fail on them).
  chandelier:
    FIXTURE_FORM === 'slice_e'
      ? ['gilt'] // the stem: the assembly's one in-place gilt primitive
      : ['gilt', 'chandelier_glow'],
  ...(FIXTURE_FORM === 'slice_e'
    ? {
        chandelier_arm: ['gilt', 'chandelier_glow', 'crystal'],
        chandelier_bead: ['crystal'],
      }
    : {}),
  sconce:
    FIXTURE_FORM === 'slice_e'
      ? ['gilt', 'sconce_glow', 'crystal']
      : ['plaster_warm', 'sconce_glow'],
  // The slice-2b cornice row: L7's fascia reassignment adds the gilt slot on the
  // primary branch (the built branch rides summary.declared.wallArticulation; the
  // bead fallback would have kept the single committed slot).
  cornice: WALL_ARTICULATION === 'slice_2b' ? ['plaster_warm', 'gilt'] : ['plaster_warm'],
  // The slice-2b wall order: the kit's two slots (the export-only dress, prim 0
  // plaster_warm the bands, prim 1 gilt the fillets/cartouches/drops/rings).
  ...(WALL_ARTICULATION === 'slice_2b' ? { wall_order: ['plaster_warm', 'gilt'] } : {}),
  pilaster_n0: ['plaster_warm', 'gilt'],
  pilaster_n1: ['plaster_warm', 'gilt'],
  pilaster_n2: ['plaster_warm', 'gilt'],
  pilaster_n3: ['plaster_warm', 'gilt'],
  pilaster_n4: ['plaster_warm', 'gilt'],
  pilaster_n5: ['plaster_warm', 'gilt'],
  pilaster_n6: ['plaster_warm', 'gilt'],
  pilaster_s: ['plaster_warm', 'gilt'],
  pilaster_e: ['plaster_warm', 'gilt'],
  pilaster_base_n: ['plaster_warm'],
  pilaster_base_s: ['plaster_warm'],
  pilaster_base_e: ['plaster_warm'],
  window_frame_lo: ['plaster_warm'],
  window_frame_hi: ['plaster_warm'],
};
export const EMISSIVE_MATERIALS = { pane: 3, sconce_glow: 1, chandelier_glow: 1 }; // 2c: the chips normalize so the tint survives
export const METALLIC_MATERIALS = {
  gilt: 0.5,
  ...(FIXTURE_FORM === 'slice_e' ? { crystal: 0.6 } : {}),
};

// Albedo-only arguments. Jordan lightmaps must NOT inherit --genmipmap;
// reencode.mjs assigns their sRGB DFD flag without converting encoded pixels.
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

export function gateLightmapIntensity(intensity = ROOM.lightmaps.intensity) {
  if (!intensity || typeof intensity !== 'object' || Array.isArray(intensity)) {
    fail('lightmaps.intensity must be a per-state dictionary, never a scalar');
  }
  const expected = [...ROOM.lightmaps.states].sort();
  const actual = Object.keys(intensity).sort();
  if (actual.join() !== expected.join())
    fail(`lightmaps.intensity keys [${actual}] != [${expected}]`);
  for (const state of ROOM.lightmaps.states) {
    const value = intensity[state];
    const [min, max] = LM_ENCODE.clamp[state];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      fail(`lightmaps.intensity.${state} ${value} outside [${min}, ${max}]`);
    }
  }
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
  if (
    used.includes('KHR_lights_punctual') ||
    required.includes('KHR_lights_punctual') ||
    json.extensions?.KHR_lights_punctual !== undefined ||
    (json.nodes ?? []).some((node) => node.extensions?.KHR_lights_punctual !== undefined)
  )
    fail('KHR_lights_punctual is forbidden; the Jordan lamp rig is bake-only');
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      if (prim.mode !== undefined && prim.mode !== 4) fail(`${mesh.name}: non-triangle primitive`);
      const a = prim.attributes ?? {};
      if (a.TEXCOORD_0 === undefined || a.TEXCOORD_1 === undefined) {
        fail(`${mesh.name}: TEXCOORD_0 and TEXCOORD_1 required on every primitive`);
      }
      if (a.TANGENT !== undefined) fail(`${mesh.name}: TANGENT forbidden`);
    }
  }
  const materials = json.materials ?? [];
  if (!materials.some((m) => m.extensions?.KHR_materials_emissive_strength)) {
    fail('no material carries KHR_materials_emissive_strength');
  }
  for (const [name, strength] of Object.entries(EMISSIVE_MATERIALS)) {
    const m = materials.find((mat) => baseName(mat.name ?? '') === name);
    if (!m) fail(`emissive material ${name} missing`);
    // 2c: the chips normalize to strength 1.0 — the glTF DEFAULT, which the exporter
    // legitimately omits; read the default instead of failing on the absent extension
    // (pane 3.0 still fails loud if ITS extension disappears).
    const raw = m.extensions?.KHR_materials_emissive_strength?.emissiveStrength;
    const s = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1.0;
    if (Math.abs(s - strength) > 1e-3) {
      fail(`material ${name}: emissiveStrength ${s} != ${strength}`);
    }
  }
  const slotMeshes = Object.keys(MATERIAL_SLOTS).sort();
  const instanceMeshes = Object.keys(EXPECTED_INSTANCES).sort();
  if (slotMeshes.join() !== instanceMeshes.join()) {
    fail(`MATERIAL_SLOTS [${slotMeshes}] != EXPECTED_INSTANCES [${instanceMeshes}]`);
  }
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
  for (const name of Object.keys(METALLIC_MATERIALS)) {
    if (!materials.some((m) => baseName(m.name ?? '') === name))
      fail(`metallic material ${name} missing`);
  }
  for (const [i, m] of materials.entries()) {
    const name = baseName(m.name ?? `material_${i}`);
    const expected = METALLIC_MATERIALS[name] ?? 0;
    const raw = m.pbrMetallicRoughness?.metallicFactor;
    // glTF default: an absent metallicFactor reads as 1 (and fails, unless the table
    // itself expected 1 — it never does).
    const factor = raw ?? 1;
    // The review MEDIUM-7: a nonnumeric value must FAIL the gate — the old
    // `Math.abs(factor - expected) > 1e-6` comparison is false for NaN (a nonnumeric
    // string coerces to NaN) and silently passed. Require a finite number first.
    if (typeof factor !== 'number' || !Number.isFinite(factor))
      fail(`material ${name}: metallicFactor ${String(raw)} is not a finite number`);
    // float32 transport: Blender's export round-trips the factor through f32 (the
    // slice_e crystal's 0.6 reads back 0.6000000238418579). The committed factors
    // (0, 0.5) are exact and pass STRICT equality — the ≤1e-6 tolerance is ONLY the
    // crystal's 0.6 f32 artefact (a drifted 0.5000005 gilt or a 0±ε non-metal now
    // fails, closing the tolerance hole the blanket |Δ| ≤ 1e-6 opened).
    if (factor !== expected && !(expected === 0.6 && Math.abs(factor - expected) <= 1e-6))
      fail(`material ${name}: metallicFactor ${factor} != ${expected}`);
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
    // Unique primitives match the instanced-kit draw budget. Per-node draws
    // remain informational in summary.drawsNaive.
    draws += r.primitives;
  }
  if (drawn !== summary.trianglesDrawn)
    fail(`drawn triangles ${drawn} != summary ${summary.trianglesDrawn}`);
  if (summary.budget?.trianglesMax !== ROOM.budget.trianglesMax) {
    fail(`summary trianglesMax ${summary.budget?.trianglesMax} != ${ROOM.budget.trianglesMax}`);
  }
  if (drawn > ROOM.budget.trianglesMax) fail(`drawn ${drawn} > trianglesMax`);
  if (draws > ROOM.budget.drawsMax) fail(`draws ${draws} > drawsMax`);
  return { drawn, draws };
}

export function optimise({ roomId, stage, out }) {
  // tools/asset.mjs stepGltf owns executable availability and pinned versions.
  if (roomId !== ROOM_ID) fail(`optimise received room ${roomId}`);
  gateLightmapIntensity();
  const texOut = join(out, 'tex');
  mkdirSync(texOut, { recursive: true });
  const summary = JSON.parse(readFileSync(join(stage, 'summary.json'), 'utf8'));
  if (summary.room !== roomId) fail(`summary room ${summary.room} != ${roomId}`);
  if (summary.declared?.paneEmissionStrength !== EMISSIVE_MATERIALS.pane) {
    fail('declared pane emission drifted from module');
  }
  if (summary.declared?.sconces?.emissionStrength !== EMISSIVE_MATERIALS.sconce_glow) {
    fail('declared sconce emission drifted from module');
  }
  if (summary.declared?.chandelier?.emissionStrength !== EMISSIVE_MATERIALS.chandelier_glow) {
    fail('declared chandelier emission drifted from module');
  }
  if (summary.declared?.giltMetallic !== METALLIC_MATERIALS.gilt) {
    fail('declared gilt metallic drifted from module');
  }
  if (WALL_ARTICULATION === 'slice_2b') {
    const wa = summary.declared?.wallArticulation;
    if (wa?.form !== 'slice_2b') {
      fail("slice_2b build without the summary's wallArticulation row");
    }
    if (wa.cornice !== 'fascia' || wa.corniceFasciaFaces !== 16) {
      fail(
        `wallArticulation cornice ${JSON.stringify(wa.cornice)} / ${JSON.stringify(wa.corniceFasciaFaces)} — the gate pins the L7 fascia primary at its 16 enumerated faces`,
      );
    }
    const panels = wa.panels ?? {};
    if (
      panels.built !== 12 ||
      panels.shrunk?.length !== 0 ||
      panels.omitted?.length !== 2 ||
      wa.rings !== 12
    ) {
      fail(
        `wallArticulation roster drifted: ${JSON.stringify({ panels, rings: wa.rings })} — the gate pins the built 12/2/12 row`,
      );
    }
  }
  const textures = encodeTextures(stage, texOut);
  const finalGlb = transformChain(stage);
  const { json, bin } = parseGlb(readFileSync(finalGlb));
  if (!json.buffers?.[0] || json.buffers[0].uri !== undefined) {
    fail('meshopt GLB must carry a uri-less buffer 0 (chain must end .glb)');
  }
  const imageNames = rewriteImagesToKtx2(json);
  for (const n of imageNames) {
    if (!textures.rows.some((t) => t.name === n)) fail(`no ktx2 for ${n}`);
  }
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
