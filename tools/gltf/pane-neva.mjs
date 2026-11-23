// Round-29 one-shot transport: bind the Neva backcloth (tex/neva.ktx2) to the jordan
// window-pane mesh. Assets are code - this script is the regeneration law for the round's
// jordan.glb + manifest change (run from the repo root: node tools/gltf/pane-neva.mjs).
//
// What it does:
// 1. Loads the committed glb with gltf-transform (meshopt decoder/encoder registered). The
//    committed file is in the pipeline's repacked shape - repackBin stripped the virtual
//    meshopt fallback buffer - so a stub def for it is re-added before the read and the
//    empty shell buffer is disposed after (writeBinary requires 0-1 buffers).
// 2. On the pane primitive, replaces TEXCOORD_0 with a float vec2 accessor carrying the
//    round-29 wall-space law: u = (x - 66) / 26, v = (y - 2) / 16 - shared with
//    tools/bpy/jordan.py's neva_wall_uv and tools/bpy/neva-art-gen.mjs's composition
//    (the plate spans x 66..92, y 2..18). The old TEXCOORD_0 stores the metre-projection
//    u = x/4, v = (4 - y)/4 (v axis down), so world (x, y) is recovered exactly per vertex
//    and every vertex is gated against the 12 pane rects in tools/jordan-windows.json.
// 3. Binds tex/neva.ktx2 (KHR_texture_basisu) as the pane material's baseColorTexture AND
//    emissiveTexture, resetting both factors to 1 so the texture speaks alone.
//    emissiveStrength stays pinned at 3.0 (the hard gate) - the script refuses to run if it
//    is not.
// 4. Writes the glb back with meshopt compression re-applied on write (the extension's
//    encoder, FILTER method - the CLI's meshopt --level high default), then re-applies the
//    pipeline's final packaging law: images back to external tex/*.ktx2 URIs, bin repacked
//    (parseGlb/repackBin/writeGlb from tools/common.mjs).
// 5. Verify-then-commit: the candidate glb re-parses and re-verifies on a temp path
//    BEFORE the tracked file is replaced; the manifest then updates (jordan.glb
//    bytes+sha256 recomputed; the tex/neva.ktx2 row REQUIRED - the ktx2 must exist
//    before the transport runs, no half-paired state).
// 6. Fails loudly (exit 1) on any gate violation, before any write where possible.
//
// ONE-SHOT: run against the round's BASE glb (git HEAD), not against its own output - the
// old-UV reconstruction law only exists in the base file, and the rect gate below refuses
// a second run for exactly that reason.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import {
  EXTMeshoptCompression,
  KHRMaterialsEmissiveStrength,
  KHRMeshQuantization,
  KHRTextureBasisu,
} from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { parseGlb, repackBin, sha256, writeGlb } from '../common.mjs';

const ROOM_ID = 'jordan';
const ROOM_DIR = join('public', 'assets', ROOM_ID);
const GLB_PATH = join(ROOM_DIR, `${ROOM_ID}.glb`);
const MANIFEST_PATH = join(ROOM_DIR, 'manifest.json');
const NEVA_URI = 'tex/neva.ktx2';
const PANE_EMISSION_STRENGTH = 3;
// Round-29 wall-space mapping constants (see the module comment; shared law).
const NEVA_U_X0 = 66;
const NEVA_U_W = 26;
const NEVA_V_Y0 = 2;
const NEVA_V_H = 16;
// Tolerances: the old metre-projection UVs are float32 (x4-scaled ULP ~7e-6); the new UVs
// round-trip float-exact through meshopt. Both sit 3+ orders below the 1.7 m bay gap, so
// neither can bridge into a neighbouring rect.
const EPS = 1e-4;
// The core's internal resource key for a GLB's BIN chunk.
const GLB_BUFFER = '@glb.bin';

function fail(message) {
  throw new Error(`[pane-neva] ${message}`);
}

// The round-30 review F-3: fail before ANY write when the encode has not landed - the
// written glb references tex/neva.ktx2, so a missing texture would publish a half-paired
// tree (a 404ing pane texture + a manifest without the row). The toktx encode (the
// TOKTX_ARGS law in tools/gltf/jordan.mjs) runs FIRST; the transport only pairs a
// complete candidate.
if (!existsSync(join(ROOM_DIR, NEVA_URI))) {
  fail(`tex/neva.ktx2 not found - run the toktx encode first; the transport never writes a half-paired tree`);
}

function makeIO() {
  const io = new NodeIO()
    .registerExtensions([
      EXTMeshoptCompression,
      KHRMaterialsEmissiveStrength,
      KHRMeshQuantization,
      KHRTextureBasisu,
    ])
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });
  return io;
}

/**
 * Reads a jordan glb (committed repacked shape or freshly written) into a Document.
 * Re-adds the stub def for the stripped virtual meshopt fallback buffer and resolves the
 * external tex/*.ktx2 images from the room directory.
 */
async function readRoomGlb(io, path) {
  const { json, bin } = parseGlb(readFileSync(path));
  if (json.buffers.length !== 1) fail(`${path}: expected 1 buffer, found ${json.buffers.length}`);
  let fallbackEnd = 0;
  for (const v of json.bufferViews ?? []) {
    fallbackEnd = Math.max(fallbackEnd, (v.byteOffset ?? 0) + (v.byteLength ?? 0));
  }
  json.buffers.push({ byteLength: fallbackEnd }); // stub: virtual meshopt fallback buffer
  const resources = { [GLB_BUFFER]: bin };
  for (const img of json.images ?? []) {
    if (!img.uri) fail(`${path}: image without uri (expected external tex/*.ktx2)`);
    resources[img.uri] = readFileSync(join(ROOM_DIR, img.uri));
  }
  return io.readJSON({ json, resources });
}

function disposeEmptyBuffers(doc) {
  const used = new Set(
    doc
      .getRoot()
      .listAccessors()
      .map((a) => a.getBuffer()),
  );
  for (const buffer of doc.getRoot().listBuffers()) {
    if (!used.has(buffer)) buffer.dispose();
  }
}

/** Reads pane vertices' world (x, y) through the OLD metre-projection UVs. */
function worldFromOldUVs(uv) {
  const out = [];
  const el = [0, 0];
  for (let i = 0; i < uv.getCount(); i++) {
    uv.getElement(i, el);
    out.push([el[0] * 4, 4 * (1 - el[1])]);
  }
  return out;
}

/** Gates world (x, y) points against the 12 pane rects; returns the failing count. */
function countOutsideRects(points, windows) {
  let bad = 0;
  for (const [x, y] of points) {
    let hit = false;
    for (const bay of windows.bays) {
      for (const tier of windows.tiers) {
        if (
          x >= bay.x0 - EPS &&
          x <= bay.x1 + EPS &&
          y >= tier.sill - EPS &&
          y <= tier.head + EPS
        ) {
          hit = true;
        }
      }
    }
    if (!hit) bad++;
  }
  return bad;
}

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = makeIO();

const oldGlb = readFileSync(GLB_PATH);
console.log(`old glb: ${oldGlb.length} B sha256 ${sha256(oldGlb)}`);

const doc = await readRoomGlb(io, GLB_PATH);
disposeEmptyBuffers(doc);

const node = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getMesh()?.getName() === 'pane');
if (!node) fail('pane node not found');
const mesh = node.getMesh();
if (mesh.listPrimitives().length !== 1) fail(`pane mesh must carry exactly 1 primitive`);
const prim = mesh.listPrimitives()[0];
const mat = prim.getMaterial();
if (mat?.getName() !== 'pane') {
  fail(`pane primitive material missing or renamed: ${mat ? mat.getName() : 'none'}`);
}
const emissiveStrength = mat.getExtension('KHR_materials_emissive_strength')?.getEmissiveStrength();
if (emissiveStrength !== PANE_EMISSION_STRENGTH) {
  fail(`pane emissiveStrength ${emissiveStrength} != ${PANE_EMISSION_STRENGTH} (hard gate)`);
}

const windows = JSON.parse(readFileSync('tools/jordan-windows.json', 'utf8'));
const oldUV = prim.getAttribute('TEXCOORD_0');
if (oldUV?.getType() !== 'VEC2') fail('pane TEXCOORD_0 missing or not VEC2');
const world = worldFromOldUVs(oldUV);
const outside = countOutsideRects(world, windows);
if (outside > 0) fail(`${outside}/${world.length} pane vertices outside the 12 pane rects`);
console.log(`pane vertices: ${world.length} (all inside the 12 pane rects)`);

// Replace TEXCOORD_0 with the round-29 wall-space accessor (float vec2).
const uv0 = new Float32Array(world.length * 2);
for (let i = 0; i < world.length; i++) {
  uv0[i * 2] = (world[i][0] - NEVA_U_X0) / NEVA_U_W;
  uv0[i * 2 + 1] = (world[i][1] - NEVA_V_Y0) / NEVA_V_H;
}
const newUV = doc.createAccessor().setType('VEC2').setArray(uv0);
// Drop the metre-projection accessor when this primitive is its only user.
let oldRefs = 0;
for (const m of doc.getRoot().listMeshes()) {
  for (const p of m.listPrimitives()) {
    if (p.listAttributes().includes(oldUV) || p.getIndices() === oldUV) oldRefs++;
  }
}
if (oldRefs === 1) oldUV.dispose();
prim.setAttribute('TEXCOORD_0', newUV);

// Bind the Neva view as both baseColor and emissive; reset the factors so the texture
// speaks alone. emissiveStrength is left untouched (verified 3.0 above).
const nevaTex = doc.createTexture('neva').setURI(NEVA_URI).setMimeType('image/ktx2');
mat.setBaseColorFactor([1, 1, 1, 1]);
mat.setEmissiveFactor([1, 1, 1]);
mat.setBaseColorTexture(nevaTex);
mat.setEmissiveTexture(nevaTex);
// The one-shot sampler law (the round-30 review F-5): CLAMP_TO_EDGE on both axes for
// BOTH slots - the documented jordan.py CLIP extension law, previously left at the glTF
// REPEAT default (gltf-transform consolidates the sampler into the per-slot TextureInfo).
for (const info of [mat.getBaseColorTextureInfo(), mat.getEmissiveTextureInfo()]) {
  info.setWrapS(33071).setWrapT(33071);
}

// Meshopt compression re-applied on write: the extension instance survived the read
// (required) and claims every accessor in prewrite; pin the FILTER method - the CLI's
// meshopt --level high default.
doc
  .getRoot()
  .listExtensionsUsed()
  .find((e) => e.extensionName === 'EXT_meshopt_compression')
  ?.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

// gltf-transform's GLB writer embeds images as bufferViews; the pipeline's law is external
// tex/*.ktx2 URIs, so re-apply the optimise() packaging: snapshot the URIs from the
// document, write, then strip the image bufferViews and repack the bin.
const textureURIs = doc
  .getRoot()
  .listTextures()
  .map((t) => t.getURI());
const rawGlb = Buffer.from(await io.writeBinary(doc));
const { json, bin } = parseGlb(rawGlb);
json.images.forEach((img, i) => {
  const uri = textureURIs[i];
  if (!uri) fail(`no uri for written image ${i}`);
  delete img.bufferView;
  img.uri = uri;
  if (img.mimeType !== 'image/ktx2') fail(`image ${i} mimeType ${img.mimeType} != image/ktx2`);
});
const bin2 = repackBin(json, bin);
const glb = writeGlb(json, bin2);

// Verify-then-commit (the round-30 review F-3): the candidate lands on a temp path, the
// re-parse + the invariant checks run against IT, and only a passing candidate replaces
// the tracked glb; the manifest writes after, the neva row REQUIRED (no PENDING state).
const tmpPath = `${GLB_PATH}.tmp`;
writeFileSync(tmpPath, glb);
console.log(`candidate glb: ${glb.length} B sha256 ${sha256(glb)} (verify before commit)`);

// Re-parse the CANDIDATE and re-verify the invariant from the NEW UVs by inverting the
// mapping (x = u*26 + 66, y = v*16 + 2).
const verify = await readRoomGlb(io, tmpPath);
disposeEmptyBuffers(verify);
const vNode = verify
  .getRoot()
  .listNodes()
  .find((n) => n.getMesh()?.getName() === 'pane');
if (!vNode) fail('verify: pane node not found in the written glb');
const vPrim = vNode.getMesh().listPrimitives()[0];
const vMat = vPrim.getMaterial();
if (vMat?.getName() !== 'pane') fail('verify: pane material missing or renamed');
const vUV = vPrim.getAttribute('TEXCOORD_0');
if (vUV?.getType() !== 'VEC2' || vUV.getComponentType() !== 5126) {
  fail('verify: written TEXCOORD_0 missing or not float VEC2');
}
const vEl = [0, 0];
const vPoints = [];
for (let i = 0; i < vUV.getCount(); i++) {
  vUV.getElement(i, vEl);
  vPoints.push([vEl[0] * NEVA_U_W + NEVA_U_X0, vEl[1] * NEVA_V_H + NEVA_V_Y0]);
}
const vOutside = countOutsideRects(vPoints, windows);
if (vOutside > 0) fail(`verify: ${vOutside}/${vPoints.length} vertices outside the 12 pane rects`);
if (
  vMat.getExtension('KHR_materials_emissive_strength')?.getEmissiveStrength() !==
  PANE_EMISSION_STRENGTH
) {
  fail('verify: emissiveStrength gate drifted');
}
const vBase = vMat.getBaseColorTexture();
const vEmis = vMat.getEmissiveTexture();
if (!vBase || vBase.getURI() !== NEVA_URI) fail(`verify: baseColorTexture != ${NEVA_URI}`);
if (!vEmis || vEmis.getURI() !== NEVA_URI) fail(`verify: emissiveTexture != ${NEVA_URI}`);
const vSampler = vMat.getEmissiveTextureInfo();
if (!vSampler || vSampler.getWrapS() !== 33071 || vSampler.getWrapT() !== 33071) {
  fail('verify: the neva sampler is not CLAMP_TO_EDGE on both axes');
}
const written = parseGlb(readFileSync(tmpPath));
const required = written.json.extensionsRequired ?? [];
for (const ext of ['EXT_meshopt_compression', 'KHR_mesh_quantization', 'KHR_texture_basisu']) {
  if (!required.includes(ext)) fail(`verify: extensionsRequired lost ${ext}`);
}
if (written.json.buffers[0]?.uri !== undefined) fail('verify: buffer 0 must stay uri-less');
console.log(
  `verify: re-parse OK - ${vPoints.length}/${vPoints.length} vertices in-rect, bindings + sampler + gates intact`,
);

// The candidate passed: commit it - the tracked glb replaced, the manifest rows written
// (the glb row recomputed; the neva row REQUIRED - the half-paired state is impossible).
writeFileSync(GLB_PATH, glb);
rmSync(tmpPath);
console.log(`new glb: ${glb.length} B sha256 ${sha256(glb)}`);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const glbRow = manifest.files.find((f) => f.path === `${ROOM_ID}.glb`);
if (!glbRow) fail('manifest: jordan.glb row missing');
glbRow.bytes = glb.length;
glbRow.sha256 = sha256(glb);
console.log(`manifest: updated ${ROOM_ID}.glb -> ${glb.length} B sha256 ${glbRow.sha256.slice(0, 16)}...`);
const ktx = readFileSync(join(ROOM_DIR, NEVA_URI));
const row = { path: NEVA_URI, bytes: ktx.length, sha256: sha256(ktx), kind: 'ktx2' };
const existing = manifest.files.find((f) => f.path === NEVA_URI);
if (existing) {
  existing.bytes = row.bytes;
  existing.sha256 = row.sha256;
  console.log(`manifest: updated ${NEVA_URI} -> ${row.bytes} B sha256 ${row.sha256.slice(0, 16)}...`);
} else {
  manifest.files.push(row);
  manifest.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  console.log(`manifest: added ${NEVA_URI} -> ${row.bytes} B sha256 ${row.sha256.slice(0, 16)}...`);
}
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
