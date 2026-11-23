// Shared helpers for the asset chain (asset.mjs, gltf/*.mjs, budget.mjs) and tests/assets.test.ts.
// Pure node: no three.js, no src/ imports. design-staircase.md §3.2 / §8.1 / §9; DEC-016.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = join(ROOT, 'public');
export const ASSETS_DIR = join(PUBLIC_DIR, 'assets');
export const BASIS_DIR = join(PUBLIC_DIR, 'basis');
// Intermediates live under node_modules/.cache: already git-ignored, wiped by a clean install.
export const STAGE_ROOT = join(ROOT, 'node_modules', '.cache', 'zimny-asset-stage');
export const TOOLCHAIN_PATH = join(ROOT, 'tools', 'toolchain.json');
export const PLACEHOLDER = /FILL-AT-INTEGRATION|placeholder/i;
export const ROOM_CAP_MAX = 8_000_000; // architecture.md per-room ceiling; manifests must declare ≤ this
export const EXTERIOR_CAP = 4_000_000;
export const BASIS_CAP = 600_000; // measured 584 862 B (wasm 527 333 + js 57 529, three 0.186.1) + headroom
export const KTX2_MAGIC = Buffer.from([
  0xab,
  0x4b,
  0x54,
  0x58,
  0x20,
  0x32,
  0x30,
  0xbb,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // «»KTX 20»\r\n\x1A\n
]);
// The CLI spawns without a shell: a bare `pnpm` never resolves the Windows .cmd shim
// (and Node >= 18.20 blocks .cmd/.bat spawns outright) - invoke the installed bin through
// node itself, which resolves on every platform.
export const GLTF_TRANSFORM = {
  cmd: process.execPath,
  args: [join(ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js')],
};
export const BLENDER =
  process.env.ZIMNY_BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';

export class ChainError extends Error {}

export function readToolchain() {
  const tc = JSON.parse(readFileSync(TOOLCHAIN_PATH, 'utf8'));
  for (const k of ['blender', 'toktx', 'gltfTransformCli', 'three']) {
    if (typeof tc[k] !== 'string') throw new ChainError(`toolchain.json: missing string "${k}"`);
  }
  return tc;
}

export function requirePinned(tc, key) {
  if (PLACEHOLDER.test(tc[key]))
    throw new ChainError(`toolchain.json: "${key}" is still a placeholder — pin it at integration`);
  return tc[key];
}

const quote = (a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a);

/** Run a subprocess from the repo root, echoing the exact invocation first (provenance). */
export function run(cmd, args, { capture = false } = {}) {
  console.log(`$ ${[cmd, ...args].map(quote).join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    // R4: bake processes print every frame of progress to stdout; the default maxBuffer
    // (1 MiB) aborts a long bake with ENOBUFS before its ZIMNY_SUMMARY line ever lands.
    maxBuffer: 1024 * 1024 * 512,
  });
  if (r.error) throw new ChainError(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) {
    if (capture && r.stdout) process.stdout.write(r.stdout);
    throw new ChainError(`${cmd} exited with status ${r.status}`);
  }
  return r.stdout ?? '';
}

/** Cheap availability + pinned-version check; `install` names what to install when missing. */
export function requireTool(cmd, args, expectVersion, install) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (r.error) throw new ChainError(`${cmd} not found — install ${install}`);
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (!out.includes(expectVersion)) {
    throw new ChainError(
      `${cmd}: want "${expectVersion}" (tools/toolchain.json), got "${(out.trim().split('\n')[0] ?? '').trim()}"`,
    );
  }
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
export const ensureDir = (d) => mkdirSync(d, { recursive: true });

export function walkFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs, base));
    else
      out.push({ rel: relative(base, abs).split('\\').join('/'), abs, bytes: statSync(abs).size });
  }
  return out;
}

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

export function parseGlbJson(buf) {
  if (buf.length < 20 || buf.toString('latin1', 0, 4) !== 'glTF') throw new ChainError('not a GLB');
  if (buf.readUInt32LE(4) !== 2) throw new ChainError('GLB version is not 2');
  if (buf.readUInt32LE(16) !== JSON_CHUNK) throw new ChainError('first GLB chunk is not JSON');
  return JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));
}

/** Both GLB chunks: { json, bin } — bin is the binary chunk (may be empty). */
export function parseGlb(buf) {
  const json = parseGlbJson(buf);
  const off = 20 + buf.readUInt32LE(12);
  let bin = Buffer.alloc(0);
  if (off + 8 <= buf.length && buf.readUInt32LE(off + 4) === BIN_CHUNK) {
    bin = buf.subarray(off + 8, off + 8 + buf.readUInt32LE(off));
  }
  return { json, bin };
}

/**
 * Single-buffer GLB repack: keep only bufferViews referenced by accessors (images were rewritten
 * to external KTX2 first), remap bufferView indices and EXT_meshopt_compression chunk offsets
 * deterministically (ascending copy, 4-byte pad between ranges). GLB allows exactly one buffer.
 */
export function repackBin(json, bin) {
  const bvs = json.bufferViews ?? [];
  const used = new Set();
  for (const a of json.accessors ?? []) if (a.bufferView !== undefined) used.add(a.bufferView);
  const keep = [...used].sort((x, y) => x - y);
  const indexMap = new Map(keep.map((old, i) => [old, i]));
  const ranges = [];
  for (const old of keep) {
    const bv = bvs[old];
    const ext = bv.extensions?.EXT_meshopt_compression;
    // A meshopt view's OUTER byteOffset/byteLength describe the DECODED data's place in the
    // dropped fallback buffer — real bytes live only in the extension's compressed range.
    // Pushing the outer range too used to advance the cursor past bytes that subarray
    // clamped away (outer offsets exceed this bin), shifting every later mapped offset and
    // leaving the tail compressed chunks beyond the written BIN (the R3 1812/canary bug).
    if (ext) {
      ranges.push({ old: ext.byteOffset ?? 0, len: ext.byteLength });
      continue;
    }
    ranges.push({ old: bv.byteOffset ?? 0, len: bv.byteLength });
  }
  ranges.sort((a, b) => a.old - b.old);
  const parts = [];
  const offsetMap = new Map(); // old offset -> new offset (aliased starts share one range)
  let cursor = 0;
  for (const r of ranges) {
    if (offsetMap.has(r.old)) continue;
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) {
      parts.push(Buffer.alloc(pad));
      cursor += pad;
    }
    offsetMap.set(r.old, cursor);
    const slice = bin.subarray(r.old, r.old + r.len);
    if (slice.length !== r.len) {
      throw new RangeError(
        `repackBin: range ${r.old}+${r.len} exceeds the source BIN (${bin.length})`,
      );
    }
    parts.push(slice);
    cursor += r.len;
  }
  const bin2 = Buffer.concat(parts);
  json.bufferViews = keep.map((old) => {
    const bv = bvs[old];
    const copy = { ...bv };
    const ext = bv.extensions?.EXT_meshopt_compression;
    // The outer byteOffset is a decoded-data coordinate (the fallback buffer), not a
    // position in the repacked BIN: copied verbatim for meshopt views, remapped otherwise.
    copy.byteOffset = ext ? (bv.byteOffset ?? 0) : (offsetMap.get(bv.byteOffset ?? 0) ?? 0);
    if (ext) {
      copy.extensions = {
        ...copy.extensions,
        EXT_meshopt_compression: {
          ...ext,
          buffer: 0,
          byteOffset: offsetMap.get(ext.byteOffset ?? 0) ?? 0,
        },
      };
    }
    return copy;
  });
  for (const a of json.accessors ?? [])
    if (a.bufferView !== undefined) a.bufferView = indexMap.get(a.bufferView);
  json.buffers = [{ byteLength: bin2.length }];
  return bin2;
}

export function writeGlb(json, bin) {
  const pad = (n) => (4 - (n % 4)) % 4;
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.alloc(pad(jsonBuf.length), 0x20);
  const binPad = Buffer.alloc(pad(bin.length), 0);
  const chunk = (type, len) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(len, 0);
    h.writeUInt32LE(type, 4);
    return h;
  };
  const total = 12 + 8 + jsonBuf.length + jsonPad.length + 8 + bin.length + binPad.length;
  const head = Buffer.alloc(12);
  head.write('glTF', 0, 'latin1');
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(total, 8);
  return Buffer.concat([
    head,
    chunk(JSON_CHUNK, jsonBuf.length + jsonPad.length),
    jsonBuf,
    jsonPad,
    chunk(BIN_CHUNK, bin.length + binPad.length),
    bin,
    binPad,
  ]);
}

/** Triangle counts straight from glTF JSON (index accessor counts) — no decoding needed. */
export function geometrySummary(json) {
  const nodes = json.nodes ?? [];
  const meshes = (json.meshes ?? []).map((m, i) => ({
    name: String(m.name ?? `mesh_${i}`).replace(/\.\d{3}$/, ''), // Blender's .001 suffixes collapse
    instances: nodes.filter((n) => n.mesh === i).length,
    primitives: m.primitives.length,
    triangles: m.primitives.reduce((t, p) => {
      if ((p.mode ?? 4) !== 4) throw new ChainError(`mesh ${m.name ?? i}: non-triangle primitive`);
      const acc = json.accessors[p.indices ?? p.attributes.POSITION];
      return t + acc.count / 3;
    }, 0),
  }));
  return {
    meshes,
    trianglesUnique: meshes.reduce((t, m) => t + m.triangles, 0),
    trianglesDrawn: meshes.reduce((t, m) => t + m.triangles * m.instances, 0),
    extensionsRequired: [...(json.extensionsRequired ?? [])].sort(),
  };
}

// Manifest — design-staircase.md §8.1. Hashes every committed artifact of the room dir.
export function buildManifest(room, roomDir, tc) {
  const files = walkFiles(roomDir)
    .filter((f) => f.rel !== 'manifest.json')
    .map((f) => {
      const kind = f.rel.endsWith('.glb') ? 'glb' : f.rel.endsWith('.ktx2') ? 'ktx2' : null;
      if (!kind) throw new ChainError(`${room.id}: unexpected artifact ${f.rel}`);
      return { path: f.rel, bytes: f.bytes, sha256: sha256(readFileSync(f.abs)), kind };
    });
  const glbs = files.filter((f) => f.kind === 'glb');
  if (glbs.length !== 1)
    throw new ChainError(`${room.id}: expected exactly one .glb, found ${glbs.length}`);
  const geometry = geometrySummary(parseGlbJson(readFileSync(join(roomDir, glbs[0].path))));
  const textureBytes = files.filter((f) => f.kind === 'ktx2').reduce((t, f) => t + f.bytes, 0);
  const payloadBytes = files.reduce((t, f) => t + f.bytes, 0);
  const b = room.budget;
  const breaches = [
    geometry.trianglesDrawn > b.trianglesMax &&
      `triangles ${geometry.trianglesDrawn} > ${b.trianglesMax}`,
    textureBytes > b.textureBytesMax && `texture bytes ${textureBytes} > ${b.textureBytesMax}`,
    payloadBytes > b.payloadBytesMax && `payload bytes ${payloadBytes} > ${b.payloadBytesMax}`,
  ].filter(Boolean);
  if (breaches.length) throw new ChainError(`${room.id}: budget breach — ${breaches.join('; ')}`);
  const toolchain = Object.fromEntries(
    ['blender', 'toktx', 'gltfTransformCli', 'three'].map((k) => [k, requirePinned(tc, k)]),
  );
  return { id: room.id, files, geometry, lightmaps: room.lightmaps, budget: b, toolchain };
}

export function writeManifest(room, roomDir, tc) {
  const manifest = buildManifest(room, roomDir, tc);
  writeFileSync(join(roomDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

// Payload budget rows — raw committed bytes, no git plumbing. Pure: never exits, never writes.
export function collectPayloadRows(publicDir = PUBLIC_DIR) {
  const assets = join(publicDir, 'assets');
  const dirBytes = (d) => walkFiles(d).reduce((t, f) => t + f.bytes, 0);
  const rows = [];
  const roomIds = existsSync(assets)
    ? readdirSync(assets)
        .sort()
        .filter((n) => n !== 'exterior' && statSync(join(assets, n)).isDirectory())
    : [];
  for (const id of roomIds) {
    const dir = join(assets, id);
    const bytes = dirBytes(dir);
    let cap;
    try {
      cap = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).budget?.payloadBytesMax;
    } catch {
      cap = undefined;
    }
    if (!existsSync(join(dir, 'manifest.json'))) {
      rows.push({
        id,
        row: 'room',
        bytes,
        cap: ROOM_CAP_MAX,
        ok: false,
        error: 'manifest.json missing',
      });
    } else if (!Number.isInteger(cap) || cap <= 0 || cap > ROOM_CAP_MAX) {
      rows.push({
        id,
        row: 'room',
        bytes,
        cap: ROOM_CAP_MAX,
        ok: false,
        error: `manifest budget.payloadBytesMax must be an integer in 1..${ROOM_CAP_MAX}`,
      });
    } else {
      rows.push({ id, row: 'room', bytes, cap, ok: bytes <= cap });
    }
  }
  const exterior = dirBytes(join(assets, 'exterior'));
  rows.push({
    id: 'exterior',
    row: 'exterior',
    bytes: exterior,
    cap: EXTERIOR_CAP,
    ok: exterior <= EXTERIOR_CAP,
  });
  const basis = dirBytes(join(publicDir, 'basis'));
  rows.push({ id: 'basis', row: 'shared', bytes: basis, cap: BASIS_CAP, ok: basis <= BASIS_CAP });
  return rows;
}
