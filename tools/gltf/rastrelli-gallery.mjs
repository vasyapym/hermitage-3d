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
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
  // r17a filled the row (three states at LM_RES 1024, baked by tools/bake.mjs). The
  // intensity record is the manifest's per-state white point — the re-encode law's single
  // source of truth (tools/reencode.mjs): RG-D1 set 0.8 in every state and the round that
  // follows (RG-E1) keeps it; the retune knob is the compose scale k, never this table.
  lightmaps: {
    states: ['day', 'dusk', 'nightChandeliers'],
    res: 1024,
    intensity: { day: 0.8, dusk: 0.8, nightChandeliers: 0.8 },
  },
};

const TEXTURES = ['stone_flags', 'plaster_pale', 'stucco_grey'];
// textureBytesMax 1.0 MB = r17 lightmaps 0.6 MB + this atlas <= 0.4 MB. Hard gate here.
const ATLAS_BYTES_MAX = 400_000;
// RG-E1 kit: the merged shell (shell geometry + 24 inline pilasters + folded doorcase + ribs
// + niches) is ONE datablock, x1; the sconce template x14 (the reserved atlas strip).
const EXPECTED_INSTANCES = { shell: 1, sconce: 14 };
const GLOW_MATERIAL = 'sconce_glow';
const GLOW_STRENGTH = 6;
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
  gt(['dedup', raw, stageFile(1)]);
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

export function optimise({ roomId, stage, out }) {
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
  const byName = gateGeometry(json, summary);
  const bin2 = repackBin(json, bin);
  const glb = writeGlb(json, bin2);
  const glbPath = join(out, `${roomId}.glb`);
  writeFileSync(glbPath, glb);
  console.log(`gltf: ${glbPath} ${glb.length} B sha256 ${sha256(glb)}`);
  for (const name of TEXTURES) console.log(`gltf: tex/${name}.ktx2 ${textureBytes[name]} B`);
  console.log(
    `gltf: ${[...byName.entries()].map(([n, m]) => `${n}x${m.instances}:${m.triangles}`).join(' ')} drawn ${summary.triangles}`,
  );
}
