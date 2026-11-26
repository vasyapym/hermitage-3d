// Zimny phase-2 r15b - rastrelli-gallery: room module + gltf step.
// Chain shape is the r15a canary's, ending in .glb on purpose: gltf-transform's meshopt layout is
// TWO buffers (fallback + compressed chunk) and its .gltf writer keeps the compressed chunk
// uri-less — the data would be dropped. A .glb final carries one implicit buffer (fallback +
// chunks + embedded images); repackBin drops the embedded-image weight after the images move to
// external KHR_texture_basisu KTX2 references.
//
// Orchestrator adjudications vs the specialist draft (INT blocks): this module binds to the REAL
// tools/common.mjs signatures — geometrySummary(json) whose meshes are an ARRAY, writeGlb(json,
// bin) returning a Buffer, GLTF_TRANSFORM cmd/args — and its optimise(ctx) matches the driver's
// call shape ({ roomId, stage, out }). Logic unchanged.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  KHRMeshQuantization,
  KHRTextureBasisu,
} from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  ChainError,
  GLTF_TRANSFORM,
  geometrySummary,
  parseGlb,
  repackBin,
  run,
  sha256,
  writeGlb,
} from '../common.mjs';

export const ROOM = {
  id: 'rastrelli-gallery',
  // drawsMax is recorded for r16's HUD; the manifest builder enforces triangles/texture/payload.
  budget: {
    trianglesMax: 110000,
    drawsMax: 25,
    textureBytesMax: 1_000_000,
    payloadBytesMax: 2_000_000,
  },
  // r17a filled the row (three states at LM_RES 1024, baked by tools/bake.mjs); the RG-F2
  // round re-bakes at the ratified LM_RES 1536 (tools/bpy/rastrelli-gallery.py's CELL stop,
  // Sol-9 ruling) — the descriptor row rides the bake records by the lightmapsRow agreement
  // gate (the driver refuses a res mismatch), so this row now states 1536. The
  // intensity record is the manifest's per-state white point — the re-encode law's single
  // source of truth (tools/reencode.mjs): RG-D1 set 0.8 in every state and the round that
  // follows (RG-E1) keeps it; the retune knob is the compose scale k, never this table.
  lightmaps: {
    states: ['day', 'dusk', 'nightChandeliers'],
    res: 1536,
    intensity: { day: 0.8, dusk: 0.8, nightChandeliers: 0.8 },
  },
};

const TEXTURES = ['stone_flags', 'plaster_pale', 'stucco_grey', 'stone_band'];
// textureBytesMax 1.0 MB = r17 lightmaps 0.6 MB + this atlas <= 0.4 MB. Hard gate here.
const ATLAS_BYTES_MAX = 400_000;
// RG-E1 kit: the merged shell (shell geometry + 24 inline pilasters + folded doorcase + ribs
// + niches + the declared panes' 11 back faces) is ONE datablock, x1; the sconce template
// x14 (the reserved atlas strip). RG-F3 (the ruling's glTF record): two datablocks: shell
// and instanced sconce. The shell now has six primitives, including the flat non-emissive
// pane material; geometry and instance counts are unchanged.
const EXPECTED_INSTANCES = { shell: 1, sconce: 14 };
const GLOW_MATERIAL = 'sconce_glow';
const GLOW_STRENGTH = 6;
// RG-F3 Sol-17: the published-material census — names asserted; the 'pane' material must be
// present (originally with emissive strength 0 — the flat non-emissive export shape).
// RG-F5 adds the flat 'stucco_shade' row (the fillet-shade device's 7th shell slot;
// exported-never-baked, no texture). RG-F6 adds the flat 'stucco_shade_airlock' row (the
// airlock shade's 8th shell slot; the same law). D2 turns the two flat slots emissive on
// the export chain — the pane ('the hour on the glass') and the door card's 'stairlight':
// each must carry its authored emissiveFactor and NO KHR_materials_emissive_strength (the
// authored strength is exactly 1.0 = the glTF DEFAULT, which the exporter legitimately
// omits); the census fails loud on any deviation. The constants publish 10 rows:
// 8 shell + 2 sconce.
const EXPECTED_MATERIALS = [
  'iron_dark',
  'pane',
  'plaster_pale',
  'sconce_glow',
  'stone_band',
  'stone_flags',
  'stucco_grey',
  'stucco_shade',
  'stucco_shade_airlock',
  'stairlight',
];
const PANE_MATERIAL = 'pane';
const STAIRLIGHT_MATERIAL = 'stairlight';
// D2: the two flat slots' authored export emission — emissiveFactor carries the RGB, and the
// authored strength is exactly 1.0, the glTF DEFAULT, so KHR_materials_emissive_strength must
// be ABSENT (the exporter legitimately omits it; the jordan chips' precedent).
const PANE_EXPORT_EMISSION = [0.82, 0.86, 0.92];
const STAIRLIGHT_EXPORT_EMISSION = [1.0, 0.8, 0.58];
const MATERIALS_SHELL = 8;
const MATERIALS_SCONCE = 2;
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

function fail(message) {
  throw new ChainError(`[${ROOM.id}] ${message}`);
}

function addExtension(json, key, name) {
  const list = json[key] ?? [];
  if (!list.includes(name)) list.push(name);
  json[key] = list;
}

// D2: one flat slot's export emission law — emissiveFactor = the authored RGB (1e-3 float
// slack, jordan's strength tolerance) and NO KHR_materials_emissive_strength (strength 1.0
// is the glTF default; any extension row is a deviation).
function gateFlatEmission(name, material, rgb) {
  const factor = material.emissiveFactor;
  if (
    !Array.isArray(factor) ||
    factor.length !== 3 ||
    factor.some((c, i) => Math.abs(c - rgb[i]) > 1e-3)
  ) {
    fail(`the census: ${name} emissiveFactor ${JSON.stringify(factor)} !== ${JSON.stringify(rgb)}`);
  }
  if (material.extensions?.KHR_materials_emissive_strength !== undefined) {
    fail(
      `the census: ${name} must not carry KHR_materials_emissive_strength ` +
        '(the authored strength is exactly 1.0 — the glTF default)',
    );
  }
}

function encodeTextures(stage, texOut) {
  const bytes = {};
  for (const name of TEXTURES) {
    const png = join(stage, 'tex', `${name}.png`);
    const ktx = join(texOut, `${name}.ktx2`);
    if (!existsSync(png)) fail(`missing bpy texture ${png}`);
    run('toktx', [...TOKTX_ARGS, ktx, png]);
    bytes[name] = statSync(ktx).size;
  }
  const total = Object.values(bytes).reduce((sum, n) => sum + n, 0);
  if (total > ATLAS_BYTES_MAX) {
    fail(`albedo atlas ${total} B exceeds ${ATLAS_BYTES_MAX} B (r17 lightmaps need the rest)`);
  }
  return bytes;
}

function compress(stage, raw) {
  const stageFile = (n, ext = 'glb') => join(stage, `s${n}.${ext}`);
  const gt = (args) => run(GLTF_TRANSFORM.cmd, [...GLTF_TRANSFORM.args, ...args]);
  // --materials false (RG-F3, the Sol-17 census's own catch): gltf-transform's dedup
  // merges CONTENT-identical materials and ignores names, so the route-B flat 'pane'
  // (white 1,1,1, roughness 1.0, no emission) merged away into 'stairlight' and the
  // published glb lost the pane row. The builder law needs BOTH flat slots distinct
  // (X2: separate bake-only pane vs door terms ride their own material names) — this
  // room's dedup keeps accessors/textures/meshes/skins deduped, materials not.
  gt(['dedup', raw, stageFile(1), '--materials', 'false']);
  gt(['prune', stageFile(1), stageFile(2), '--keep-attributes', 'TEXCOORD_1']);
  gt(['weld', stageFile(2), stageFile(3)]);
  gt(['quantize', stageFile(3), stageFile(4)]);
  gt(['meshopt', stageFile(4), stageFile(5)]); // .glb: one implicit buffer = a valid GLB
  return stageFile(5);
}

function rewriteImages(json) {
  const images = json.images ?? [];
  if (images.length !== TEXTURES.length) {
    fail(`expected ${TEXTURES.length} images, got ${images.length}`);
  }
  // After the final .glb write the images are embedded bufferViews WITH their Blender names
  // (proven on this shell: plaster_dark / stone_flags). Name-map when possible, order fallback —
  // the byte-identity double run is the real proof that the order is stable.
  json.images = images.map((image, i) => {
    const name =
      TEXTURES.find((t) => image.name === t || (image.uri ?? '').includes(t)) ?? TEXTURES[i];
    return { uri: `tex/${name}.ktx2`, mimeType: 'image/ktx2' };
  });
  for (const texture of json.textures ?? []) {
    if (texture.source === undefined) fail('texture without source');
    texture.extensions = { ...texture.extensions, KHR_texture_basisu: { source: texture.source } };
    delete texture.source;
  }
  addExtension(json, 'extensionsUsed', 'KHR_texture_basisu');
  addExtension(json, 'extensionsRequired', 'KHR_texture_basisu');
}

// ---- the UV2 identity belt (D3) ---------------------------------------------------------------
// Before publishing, the new glb's TEXCOORD_1 data per primitive must decode byte-identical
// to the committed published glb's (the file at the published path, read BEFORE the
// overwrite). The floor round moves UV0 ONLY (the albedo tile) — the lm layer, the atlas
// cells and the layout hash cannot move. Both files carry repackBin's flattened buffer
// (the bufferViews name the dropped compressed buffer, the ext rows point at buffer 0), a
// shape @gltf-transform's meshopt preread cannot digest raw; each is normalised the SAME way
// (bufferView.buffer := 0) before the NodeIO — with the meshopt decoder — reads and decodes
// the real TEXCOORD_1 accessors. The digests cover count + the full decoded float payload.
function uv2BeltNormalize(glb) {
  const { json, bin } = parseGlb(glb);
  for (const view of json.bufferViews ?? []) view.buffer = 0;
  return writeGlb(json, bin);
}

async function uv2Digests(glbPath) {
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu])
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(glbPath);
  const rows = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    const prims = mesh.listPrimitives();
    for (let i = 0; i < prims.length; i++) {
      const accessor = prims[i].getAttribute('TEXCOORD_1');
      if (!accessor) {
        fail(`${mesh.getName()}#${i}: TEXCOORD_1 missing (the UV2 belt needs both layers)`);
      }
      const arr = accessor.getArray();
      if (!arr) fail(`${mesh.getName()}#${i}: TEXCOORD_1 did not decode`);
      const digest = createHash('sha256')
        .update(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength))
        .digest('hex');
      rows.push(`${mesh.getName()}#${i}:${accessor.getCount()}:${digest}`);
    }
  }
  return rows;
}

async function gateUv2Identity(glb, glbPath, out) {
  if (!existsSync(glbPath)) {
    fail(`the UV2 belt cannot run: no committed published glb at ${glbPath}`);
  }
  // both temp glbs sit in `out` so the external tex/*.ktx2 references resolve for the reader
  const committedPath = join(out, '.uv2-belt-committed.glb.tmp');
  const freshPath = join(out, '.uv2-belt-fresh.glb.tmp');
  try {
    writeFileSync(committedPath, uv2BeltNormalize(readFileSync(glbPath)));
    writeFileSync(freshPath, uv2BeltNormalize(glb));
    const [committed, fresh] = await Promise.all([
      uv2Digests(committedPath),
      uv2Digests(freshPath),
    ]);
    if (committed.join('\n') !== fresh.join('\n')) {
      const detail = committed
        .map((row, i) => (row === fresh[i] ? null : `${row} -> ${fresh[i]}`))
        .filter(Boolean)
        .join('; ');
      fail(`UV2 drift against the committed published glb (TEXCOORD_1 must hold): ${detail}`);
    }
    console.log(
      `gltf: uv2 identity belt ok ${fresh.length} primitive(s), TEXCOORD_1 byte-identical`,
    );
  } finally {
    for (const path of [committedPath, freshPath]) {
      if (existsSync(path)) unlinkSync(path);
    }
  }
}

function gateConventions(json) {
  const required = json.extensionsRequired ?? [];
  const used = json.extensionsUsed ?? [];
  if (!required.includes('EXT_meshopt_compression')) fail('meshopt is required');
  if ([...required, ...used].includes('KHR_draco_mesh_compression')) fail('draco is forbidden');
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const attributes = prim.attributes ?? {};
      if (!('TEXCOORD_0' in attributes) || !('TEXCOORD_1' in attributes)) {
        fail(`mesh ${mesh.name}: TEXCOORD_0 + TEXCOORD_1 required on every primitive`);
      }
      if ('TANGENT' in attributes) fail(`mesh ${mesh.name}: TANGENT forbidden`);
    }
  }
  const glow = (json.materials ?? []).find((m) => m.name === GLOW_MATERIAL);
  if (!glow) fail(`material ${GLOW_MATERIAL} missing`);
  const strength = glow.extensions?.KHR_materials_emissive_strength?.emissiveStrength;
  if (strength !== GLOW_STRENGTH) {
    fail(`${GLOW_MATERIAL} emissiveStrength ${strength} !== ${GLOW_STRENGTH}`);
  }
}

function gateMaterialsCensus(json) {
  // Sol-17: the material/export census rows beside the geometry gate.
  const materials = json.materials ?? [];
  const names = materials.map((material) => material.name ?? '').sort();
  const expected = [...EXPECTED_MATERIALS].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    fail(`published materials [${names.join(', ')}] !== the census [${expected.join(', ')}]`);
  }
  if (materials.length !== MATERIALS_SHELL + MATERIALS_SCONCE) {
    fail(
      `the material census expects ${MATERIALS_SHELL} shell + ${MATERIALS_SCONCE} sconce ` +
        `= ${MATERIALS_SHELL + MATERIALS_SCONCE} published rows, got ${materials.length}`,
    );
  }
  // D2: the two flat slots carry their export emission (the hour on the glass + the door
  // card's stairlight) — the authored emissiveFactor, and no strength extension.
  const pane = materials.find((material) => material.name === PANE_MATERIAL);
  if (!pane) fail(`the census: material ${PANE_MATERIAL} missing`);
  gateFlatEmission(PANE_MATERIAL, pane, PANE_EXPORT_EMISSION);
  const stairlight = materials.find((material) => material.name === STAIRLIGHT_MATERIAL);
  if (!stairlight) fail(`the census: material ${STAIRLIGHT_MATERIAL} missing`);
  gateFlatEmission(STAIRLIGHT_MATERIAL, stairlight, STAIRLIGHT_EXPORT_EMISSION);
  console.log(
    `gltf: material census ${materials.length} (shell ${MATERIALS_SHELL} + sconce ` +
      `${MATERIALS_SCONCE}); ${PANE_MATERIAL} emissiveFactor ${PANE_EXPORT_EMISSION} / ` +
      `${STAIRLIGHT_MATERIAL} emissiveFactor ${STAIRLIGHT_EXPORT_EMISSION}, no strength ext`,
  );
}

function gateGeometry(json, summary) {
  // common.mjs geometrySummary: meshes is an ARRAY of { name, instances, primitives, triangles };
  // same-name entries (Blender .### pattern) collapse onto the declared name with summed instances.
  const geo = geometrySummary(json);
  const byName = new Map();
  for (const m of geo.meshes) {
    const prev = byName.get(m.name);
    byName.set(m.name, {
      instances: (prev?.instances ?? 0) + m.instances,
      primitives: (prev?.primitives ?? 0) + m.primitives,
      triangles: m.triangles,
    });
  }
  const names = Object.keys(EXPECTED_INSTANCES).sort();
  const found = [...byName.keys()].sort();
  if (found.join(',') !== names.join(',')) fail(`meshes ${found} !== ${names}`);
  for (const name of names) {
    const real = byName.get(name);
    const declared = summary.meshes[name];
    if (real.instances !== EXPECTED_INSTANCES[name]) {
      fail(`${name}: ${real.instances} instances, expected ${EXPECTED_INSTANCES[name]}`);
    }
    if (real.triangles !== declared.triangles) {
      fail(`${name}: triangle drift ${real.triangles} vs bpy ${declared.triangles}`);
    }
  }
  if (geo.trianglesDrawn !== summary.triangles) {
    fail(`drawn triangle drift ${geo.trianglesDrawn} vs bpy summary ${summary.triangles}`);
  }
  if (geo.trianglesDrawn > ROOM.budget.trianglesMax)
    fail(`${geo.trianglesDrawn} triangles exceed budget`);
  return byName;
}

export async function optimise({ roomId, stage, out }) {
  // tool availability + pinned versions are checked by tools/asset.mjs stepGltf before this runs.
  const texOut = join(out, 'tex');
  mkdirSync(texOut, { recursive: true });
  const raw = join(stage, `${roomId}.raw.glb`);
  const summaryPath = join(stage, 'summary.json');
  if (!existsSync(raw)) fail(`missing ${raw}; run the bpy step first`);
  if (!existsSync(summaryPath)) fail(`missing ${summaryPath}; run the bpy step first`);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const textureBytes = encodeTextures(stage, texOut);
  const finalGlbPath = compress(stage, raw);
  // gltf-transform's GLB writer declares buffer 0 = the whole chunk (fallback regions + the
  // compressed chunks, ext offsets absolute in buffer 0) plus a trailing {fallback:true}
  // declaration for the compressed region — repackBin flattens it to the single GLB buffer.
  const { json, bin } = parseGlb(readFileSync(finalGlbPath));
  if (!json.buffers?.length || json.buffers[0].uri) {
    fail(
      `meshopt .glb must carry the implicit GLB buffer at index 0, got ${JSON.stringify(json.buffers)}`,
    );
  }
  rewriteImages(json);
  gateConventions(json);
  gateMaterialsCensus(json);
  const byName = gateGeometry(json, summary);
  const bin2 = repackBin(json, bin);
  const glb = writeGlb(json, bin2);
  const glbPath = join(out, `${roomId}.glb`);
  // the UV2 belt reads the COMMITTED file at the published path BEFORE this write overwrites
  // it (D3): TEXCOORD_1 must decode byte-identical or nothing publishes.
  await gateUv2Identity(glb, glbPath, out);
  writeFileSync(glbPath, glb);
  console.log(`gltf: ${glbPath} ${glb.length} B sha256 ${sha256(glb)}`);
  for (const name of TEXTURES) console.log(`gltf: tex/${name}.ktx2 ${textureBytes[name]} B`);
  console.log(
    `gltf: ${[...byName.entries()].map(([n, m]) => `${n}x${m.instances}:${m.triangles}`).join(' ')} drawn ${summary.triangles}`,
  );
}
