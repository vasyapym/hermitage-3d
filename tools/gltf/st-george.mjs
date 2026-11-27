// Zimny — St George's Hall (the Winter Palace's Great Throne Room) gltf step.
// Modeled on tools/gltf/military-gallery.mjs (the SCALAR white-point path — not
// jordan's percentile path: no LM_ENCODE row, bake.py's WHITE_POINT table is the
// encode law). One chained end: .glb on purpose (the repackBin lesson; see the
// sibling header). This round the shell is NEUTRAL and untextured: the stage
// carries no tex/*.png, so the texture-encode section is CONDITIONAL — with no
// albedo PNGs the glb is written alone and the manifest's textureBytes covers
// only the lightmaps when they arrive (the bake registration, tools/bake.mjs).
//
// The builder's bake registration lives in tools/bpy/st-george.py: LM_RES =
// LM['shellRes'] bakes the step-4 shell layout; the step-5 final bake flips
// LM_RES to LM['finalRes'] (the metre canvas keeps the UVs
// resolution-independent, so the glb does not change).
//
// Determinism: the gltf-transform/meshopt flags are fixed; no timestamps.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
  id: 'st-george',
  budget: {
    trianglesMax: 70_000,
    drawsMax: 24,
    textureBytesMax: 2_400_000,
    payloadBytesMax: 4_000_000,
  },
  // The three states at the hall's window-lit law (the panes are the daylight
  // source; the chandeliers are absent this round, so nightChandeliers keeps the
  // lowest value that still encodes the window bounce above zero). CALM SEEDS,
  // owner re-tune data: the golden sitting grades these from the bake logs'
  // peak/clippedFraction rows — a descriptor edit + reencode, never a re-bake.
  // The dusk 0.32 rides brief 42 slice 2 (the amber key's luminance held at the
  // rastrelli-shape eff 0.5); the day 1.5 and the night 0.1 are the committed calm seeds.
  // res is the SHELL chart (law.lighting.lmChart.shellRes); the step-5 final bake
  // flips the row to finalRes 2048.
  lightmaps: {
    states: ['day', 'dusk', 'nightChandeliers'],
    res: 1024,
    intensity: { day: 1.5, dusk: 0.32, nightChandeliers: 0.1 },
  },
};

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
  throw new ChainError(`st-george-gltf: ${message}`);
}

function addExtension(json, key, name) {
  const list = json[key] ?? [];
  if (!list.includes(name)) list.push(name);
  json[key] = list;
}

// The texture step is whatever the stage's tex/*.png carries (sorted for
// determinism). This round that is the empty list — the neutral shell — and the
// albedo encode + the KHR_texture_basisu rewrite both stay out of the glb.
function stageTextures(stage) {
  const dir = join(stage, 'tex');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.png'))
    .map((name) => name.slice(0, -'.png'.length))
    .sort();
}

function encodeTextures(stage, texOut, textures) {
  const bytes = {};
  let total = 0;
  for (const name of textures) {
    const png = join(stage, 'tex', `${name}.png`);
    const ktx = join(texOut, `${name}.ktx2`);
    if (!existsSync(png)) fail(`missing bpy texture ${png}`);
    run('toktx', [...TOKTX_ARGS, ktx, png]);
    bytes[name] = statSync(ktx).size;
    total += bytes[name];
  }
  if (total > ROOM.budget.textureBytesMax) {
    fail(`albedo textures ${total} B exceed textureBytesMax ${ROOM.budget.textureBytesMax}`);
  }
  return bytes;
}

function compress(stage, raw) {
  const stageFile = (n, ext = 'glb') => join(stage, `s${n}.${ext}`);
  const gt = (args) => run(GLTF_TRANSFORM.cmd, [...GLTF_TRANSFORM.args, ...args]);
  // --materials false (the rastrelli RG-F3 lesson, Sol-17): dedup merges CONTENT-identical
  // materials and ignores names — this hall's three gilt slots and two parquet slots are
  // content-identical by the builder's law, and the bake contract needs every slot's
  // material named the slot id verbatim (the mesh AND its material). Accessors/textures/
  // meshes still dedup; materials do not.
  gt(['dedup', raw, stageFile(1), '--materials', 'false']);
  gt(['prune', stageFile(1), stageFile(2), '--keep-attributes', 'TEXCOORD_1']);
  gt(['weld', stageFile(2), stageFile(3)]);
  gt(['quantize', stageFile(3), stageFile(4)]);
  gt(['meshopt', stageFile(4), stageFile(5)]);
  return stageFile(5);
}

function rewriteImages(json, textures) {
  const images = json.images ?? [];
  if (images.length !== textures.length) {
    fail(`expected ${textures.length} images, got ${images.length}`);
  }
  json.images = images.map((image, i) => {
    const name =
      textures.find((t) => image.name === t || (image.uri ?? '').includes(t)) ?? textures[i];
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
}

/** The census-parity gate: the builder's summary (per-name
 * {faces, lmPatches, materials, triangles}) must match the glb's geometrySummary
 * rows by name and triangle count, and summary.trianglesDrawn must equal the
 * glb's drawn total. The budget gates ride the same rows (draws = the primitive
 * count across meshes). */
function gateGeometry(json, summary) {
  const geo = geometrySummary(json);
  const byName = new Map();
  for (const m of geo.meshes) byName.set(m.name, m);
  const declared = summary.meshes ?? {};
  const found = [...byName.keys()].sort();
  const names = Object.keys(declared).sort();
  if (found.join(',') !== names.join(',')) {
    fail(`glb meshes [${found.join(', ')}] != summary meshes [${names.join(', ')}]`);
  }
  for (const name of names) {
    const row = declared[name];
    const mesh = byName.get(name);
    if (mesh.triangles !== row.triangles) {
      fail(`census parity: ${name} glb ${mesh.triangles} tris vs summary ${row.triangles}`);
    }
  }
  const draws = geo.meshes.reduce((t, m) => t + m.primitives, 0);
  if (draws > ROOM.budget.drawsMax) fail(`draws ${draws} exceed ${ROOM.budget.drawsMax}`);
  // The published-material census (the rastrelli gateMaterialsCensus shape, data-driven):
  // every slot's material must survive the chain named the slot id verbatim — the glb's
  // material names are the summary's per-slot rows' materials, and nothing else exists.
  const census = [...new Set(Object.values(declared).flatMap((row) => row.materials ?? []))].sort();
  const published = (json.materials ?? []).map((m) => m.name ?? '').sort();
  if (published.join(',') !== census.join(',')) {
    fail(
      `published materials [${published.join(', ')}] != the summary census [${census.join(', ')}]`,
    );
  }
  if (geo.trianglesDrawn !== summary.trianglesDrawn) {
    fail(`drawn triangle drift ${geo.trianglesDrawn} vs summary ${summary.trianglesDrawn}`);
  }
  if (geo.trianglesDrawn > ROOM.budget.trianglesMax) {
    fail(`${geo.trianglesDrawn} triangles exceed ${ROOM.budget.trianglesMax}`);
  }
  return { byName, draws };
}

export function optimise({ roomId, stage, out }) {
  // tool availability + pinned versions are checked by tools/asset.mjs stepGltf before this runs.
  if (roomId !== ROOM.id) fail(`optimise received room ${roomId}`);
  const raw = join(stage, `${roomId}.glb`);
  const summaryPath = join(stage, 'summary.json');
  if (!existsSync(raw)) fail(`missing ${raw}; run the bpy step first`);
  if (!existsSync(summaryPath)) fail(`missing ${summaryPath}; run the bpy step first`);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  if (summary.room !== roomId) fail(`summary room ${summary.room} != ${roomId}`);
  const textures = stageTextures(stage);
  let textureBytes = {};
  if (textures.length > 0) {
    const texOut = join(out, 'tex');
    mkdirSync(texOut, { recursive: true });
    textureBytes = encodeTextures(stage, texOut, textures);
  }
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
  if (textures.length === 0 && (json.images ?? []).length > 0) {
    fail(`the stage names no tex/*.png but the glb carries ${json.images.length} image(s)`);
  }
  if (textures.length > 0) rewriteImages(json, textures);
  gateConventions(json);
  const { byName, draws } = gateGeometry(json, summary);
  const bin2 = repackBin(json, bin);
  const glb = writeGlb(json, bin2);
  const payloadBytes = glb.length + Object.values(textureBytes).reduce((t, n) => t + n, 0);
  if (payloadBytes > ROOM.budget.payloadBytesMax) {
    fail(`payload ${payloadBytes} B exceeds ${ROOM.budget.payloadBytesMax}`);
  }
  const glbPath = join(out, `${roomId}.glb`);
  writeFileSync(glbPath, glb);
  console.log(`st-george-gltf: ${glbPath} ${glb.length} B sha256 ${sha256(glb)}`);
  for (const name of textures)
    console.log(`st-george-gltf: tex/${name}.ktx2 ${textureBytes[name]} B`);
  if (textures.length === 0) {
    console.log('st-george-gltf: the stage carries no tex/*.png (the neutral shell) — glb alone');
  }
  console.log(
    `st-george-gltf: ${[...byName.entries()].map(([n, m]) => `${n}:${m.triangles}`).join(' ')} ` +
      `draws ${draws} drawn ${summary.trianglesDrawn} payload ${payloadBytes} B`,
  );
}
