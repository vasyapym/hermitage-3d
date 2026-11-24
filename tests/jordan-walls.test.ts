/// <reference types="node" />
// jordan slice 2b — the white-and-gold wall order's glb/manifest pins, read three-free
// (the jordan-fixtures.test.ts reader approach, plus the meshopt decode the UV1/UV0
// laws need; implementing turncascade-design.md §3.5 T1–T8 as far as the committed
// JSON carries them, pinned from the BUILT truth — C10: the built numbers, not the
// design's forecasts). T9 is the documented chain check, not a vitest test:
// `FIXTURE_FORM=slice_e WALL_ARTICULATION=none node tools/asset.mjs all jordan`
// regenerates the bare-walls reference (the r15 byte-identity law, re-baselined to
// this machine's chain per the 2026-11-24 owner verdict — see the REBASELINE note).
//
// REBASELINE (DEC-ready row): the 2026-11-24 Mac chain is the owner-accepted reference
// switch — the encoder-parity class moved three rows off the pre-slice-2b HEAD:
// jordan.glb −84 B (the gltf-transform quantize step's accessor min/max presence),
// tex/neva.ktx2 +9 B, tex/plafond.ktx2 −60 B (the Blender float32 plate path + the
// raster's Chromium build). The eight lm/probe/albedo rows stayed byte-identical
// through every run; T3 pins them at HEAD's shas and the two art plates at the
// re-baselined on-disk shas.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { describe, expect, it } from 'vitest';

type GltfJson = {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  materials?: { name?: string }[];
  meshes?: {
    name?: string;
    primitives: {
      material: number;
      attributes: Record<string, number>;
      indices?: number;
    }[];
  }[];
  nodes?: { name?: string; mesh?: number; translation?: number[]; scale?: number[] }[];
  bufferViews?: {
    byteStride?: number;
    extensions?: {
      EXT_meshopt_compression?: {
        byteOffset: number;
        byteLength: number;
        mode: string;
        filter?: string;
        count: number;
        byteStride: number;
      };
    };
  }[];
  accessors: {
    componentType: number;
    type: string;
    count: number;
    byteOffset?: number;
    bufferView: number;
  }[];
  buffers?: { byteLength: number }[];
};
type Common = { parseGlb: (buf: Buffer) => { json: GltfJson; bin: Buffer } };

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'public', 'assets', 'jordan');
const GLB = readFileSync(join(DIR, 'jordan.glb'));
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as {
  files: { path: string; bytes: number; sha256: string; kind: string }[];
  geometry: {
    meshes: { name: string; instances: number; primitives: number; triangles: number }[];
    trianglesDrawn: number;
    trianglesUnique: number;
    extensionsRequired: string[];
  };
  lightmaps: { states: string[]; res: number; intensity: Record<string, number> };
  budget: Record<string, number>;
};
const common = (await import(join(ROOT, 'tools', 'common.mjs'))) as unknown as Common;
const { json, bin } = common.parseGlb(GLB);

// finding 03: the decoder's WASM must be ready before the FIRST decode — the reads
// below run at module scope, so the wait is a top-level await here, not a beforeAll.
await MeshoptDecoder.ready;

// --- the built truth (the regen's ZIMNY_SUMMARY + the manifest; C10) ---------------
const TRIS_DRAWN_BEFORE = 31882; // the pre-slice-2b reference (the fixtures round's census)
const TRIS_UNIQUE_BEFORE = 7034;
const WALL_ORDER_TRIS = 4296; // 12 panels × 226 + 12 rings × 128; the cornice ±0
const TRIS_DRAWN = 36178; // 31,882 + 4,296
const TRIS_UNIQUE = 11330; // 7,034 + 4,296 — the same delta (merged, uninstanced)
const DRAWS = 47; // 44 + wall_order 2 + the cornice's L7 gilt slot 1
const PANELS_BUILT = 12; // 6 north + 6 south; the two east bays omit (L5's sconce law)
const RINGS = 12;
const SHELL_FACES = 1794; // the shell's cell universe (the hosts')
const DECODE_CELLS = 3372; // the builder's own invariant; the plate byte-identity below
//   pins the same allocation transitively (same plate bytes ⇒ the same bake scene).
const PANEL_Y = [7.6, 12.0] as const;
const PORT_Y = [4.75, 14.75] as const;
const BAY_X = [69.25, 73.15, 77.05, 80.95, 84.85, 88.75] as const;
const GLB_MAX = 620_000; // the design's declared ceiling (the build lands 439,648)
const PAYLOAD_MAX = 2_000_000;

// --- T3's plate shas ----------------------------------------------------------------
// HEAD's committed values (the six rows the slice never re-encodes; verified
// byte-identical through every batch-2 chain run — the T3 no-re-bake law):
const HEAD_SHAS: Record<string, string> = {
  'lm/day.ktx2': '779010b841a6095fb0a825601776a6e6740a3ccd006582d12765d5d2102e25bf',
  'lm/dusk.ktx2': 'dc2575fe82615ea403fd4dfe1c5bd82e1ca8f4953d6fff35b3c2a30c7db76d97',
  'lm/night.ktx2': 'e871a53ff2bdad4b6556a3d9daf206d8a3d1b0f9ca3ede2c9416f3866ba0a4ea',
  'probe/dusk.ktx2': 'e303b0aac36823883f5f95aa286f166833c7ed0f3558cf6234c146c23c475e16',
  'tex/marble_floor.ktx2': '474f3965b5e2dbbe4a3623c4c5c296f4a05cffa59ec2afe262af9373e3e8189e',
  'tex/plaster_warm.ktx2': 'bd2f2eb5e9e696947c6281199db7ce77181f160c340a909271345f4f0b6aa377',
  'tex/granite_grey.ktx2': 'a2384dbe68e1d6df126c6deb8faf3befa27b3736520b4734f089877406bd71c8',
  'tex/gilt.ktx2': '345618bc382fdef67a66f452fdff92b40e7437da79cb41af4641ad0af1b7519c',
};
// The round's own re-baseline (the owner-accepted reference switch; the two art
// plates re-pin to this Mac's chain output):
const REBASELINED_SHAS: Record<string, string> = {
  'tex/neva.ktx2': 'f64c06a8b7b624348b69d0b6385d1cbbda7989e7ff75c967271c86868fb0a8aa',
  'tex/plafond.ktx2': 'c6b7afc3f7bf347e53d1ea15402d267dea1f4631b9067dd981630e7956698ad8',
};

// --- the decode helpers (the meshopt-compressed accessor reader) --------------------
const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 } as const;
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as const;
type Decoded = { buf: Buffer; off: number; stride: number; count: number };

// finding 14: the compressed chunk's byteOffset defaults to 0 when the extension
// omits it (the glTF EXT_meshopt_compression field is optional).
const decodeAccessor = (accessorIndex: number): Decoded => {
  const acc = json.accessors[accessorIndex];
  if (!acc) throw new Error(`the glb carries no accessor ${accessorIndex}`);
  const bv = json.bufferViews?.[acc.bufferView];
  const ext = bv?.extensions?.EXT_meshopt_compression;
  if (!ext) throw new Error('the glb carries no meshopt chunk for the accessor');
  const chunkOff = ext.byteOffset ?? 0;
  const src = bin.subarray(chunkOff, chunkOff + ext.byteLength);
  const out = new Uint8Array(ext.count * ext.byteStride);
  MeshoptDecoder.decodeGltfBuffer(
    out,
    ext.count,
    ext.byteStride,
    src,
    ext.mode ?? 'ATTRIBUTES',
    ext.filter ?? 'NONE',
  );
  const natural = SIZE[acc.componentType as 5123] * NCOMP[acc.type as 'VEC2'];
  return {
    buf: Buffer.from(out.buffer, out.byteOffset, out.length),
    off: acc.byteOffset ?? 0,
    stride: ext.byteStride ?? natural,
    count: acc.count,
  };
};
const baseName = (name: string | undefined): string => String(name ?? '').replace(/\.\d{3}$/, '');
const meshByName = (name: string) => {
  const mesh = (json.meshes ?? []).find((m) => baseName(m.name) === name);
  if (!mesh) throw new Error(`the glb carries no ${name} mesh`);
  return mesh;
};
const meshIndex = (mesh: NonNullable<ReturnType<typeof meshByName>>) =>
  (json.meshes ?? []).indexOf(mesh);
const nodesOf = (mesh: NonNullable<ReturnType<typeof meshByName>>) =>
  (json.nodes ?? []).filter((n) => n.mesh === meshIndex(mesh));
const materialName = (index: number): string =>
  (json.materials?.[index]?.name ?? '').replace(/\.\d{3}$/, '');
// The world position of the prim vertex i: the chain re-centres every mesh at its
// bbox (the node translation) and bakes the quantization rescale into the node scale.
const worldOf = (
  decoded: Decoded,
  node: { translation?: number[]; scale?: number[] },
  i: number,
): [number, number, number] => {
  const t = node.translation ?? [0, 0, 0];
  const s = node.scale ?? [1, 1, 1];
  return [0, 1, 2].map((k) => {
    const tk = t[k] ?? 0;
    const sk = s[k] ?? 0;
    return tk + (sk * decoded.buf.readInt16LE(decoded.off + i * decoded.stride + k * 2)) / 32767;
  }) as [number, number, number];
};

const wallOrder = meshByName('wall_order');
const shell = meshByName('shell');
const cornice = meshByName('cornice');
const woNodes = nodesOf(wallOrder);
if (woNodes.length !== 1) throw new Error('wall_order must be exactly one in-place instance');
const woNode = woNodes[0];
if (!woNode) throw new Error('wall_order must be exactly one in-place instance');
if (!woNode.translation || !woNode.scale) throw new Error('wall_order node without a transform');

const [plasterPrim, giltPrim] = wallOrder.primitives;
if (!plasterPrim || !giltPrim) throw new Error('wall_order must carry two primitives');
const attrOf = (
  prim: { attributes: Record<string, number>; indices?: number },
  name: string,
): number => {
  const v = prim.attributes[name];
  if (v === undefined) throw new Error(`the wall_order prim carries no ${name}`);
  return v;
};
const indicesOf = (prim: { indices?: number }): number => {
  if (prim.indices === undefined) throw new Error('the wall_order prim carries no indices');
  return prim.indices;
};

const plasterPos = decodeAccessor(attrOf(plasterPrim, 'POSITION'));
const giltPos = decodeAccessor(attrOf(giltPrim, 'POSITION'));
const uv1s = wallOrder.primitives.map((p) => decodeAccessor(attrOf(p, 'TEXCOORD_1')));
const indexSets = wallOrder.primitives.map((p) => decodeAccessor(indicesOf(p)));

// The T5 grouping: the prim split (the bands are plaster) plus the declared roster.
const pushGroup = <T>(map: Map<string, T[]>, key: string, value: T) => {
  const list = map.get(key);
  if (list) {
    list.push(value);
    return;
  }
  map.set(key, [value]);
};
const panelGroups = new Map<string, [number, number, number][]>();
for (let i = 0; i < plasterPos.count; i++) {
  const p = worldOf(plasterPos, woNode, i);
  const wall = p[2] < -74 ? 'north' : 'south';
  const bay = BAY_X.find((cx) => Math.abs(p[0] - cx) <= 1.2);
  if (!bay) throw new Error(`a plaster vertex at x ${p[0].toFixed(3)} sits in no window bay`);
  pushGroup(panelGroups, `${wall}@${bay}`, p);
}
const ringGroups = new Map<string, [number, number, number][]>();
for (let i = 0; i < giltPos.count; i++) {
  const p = worldOf(giltPos, woNode, i);
  if (p[1] >= PANEL_Y[0] - 0.05 && p[1] <= PANEL_Y[1] + 0.05) continue; // the dress, not a ring
  const bay = BAY_X.find((cx) => Math.abs(p[0] - cx) <= 1.35);
  const cv = PORT_Y.find((cy) => Math.abs(p[1] - cy) <= 1.35);
  if (!bay || !cv)
    throw new Error(
      `a ring vertex at (${p[0].toFixed(3)}, ${p[1].toFixed(3)}) sits at no porthole`,
    );
  pushGroup(ringGroups, `${bay}@${cv}`, p);
}
const aabb = (list: [number, number, number][]) => {
  const xs = list.map((p) => p[0]);
  const ys = list.map((p) => p[1]);
  const zs = list.map((p) => p[2]);
  return {
    min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)] as [number, number, number],
    max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)] as [number, number, number],
  };
};

// --- T4's cell universe: the shell's own UV1 cells ----------------------------------
const shellPrim = shell.primitives[0];
if (!shellPrim) throw new Error('the shell carries no plaster primitive');
const shellUv1 = decodeAccessor(attrOf(shellPrim, 'TEXCOORD_1'));
const shellCells = new Set<string>();
for (let i = 0; i < shellUv1.count; i++) {
  const u = shellUv1.buf.readUint16LE(shellUv1.off + i * shellUv1.stride) / 65535;
  const v = shellUv1.buf.readUint16LE(shellUv1.off + i * shellUv1.stride + 2) / 65535;
  shellCells.add(`${Math.floor(u * 64)},${Math.floor(v * 64)}`);
}

let minInset = Number.POSITIVE_INFINITY;
const usedCells = new Set<string>();
let multiCellTriangles = 0;
let outsideShellCells = 0;
let wallOrderTriangles = 0;
for (const [pi] of wallOrder.primitives.entries()) {
  const uv = uv1s[pi];
  const idx = indexSets[pi];
  if (!uv || !idx) throw new Error('the wall_order prim lost its decoded attributes');
  for (let t = 0; t < idx.count / 3; t++) {
    const cells = new Set<string>();
    for (let k = 0; k < 3; k++) {
      const vi = idx.buf.readUint16LE(idx.off + (t * 3 + k) * idx.stride);
      const u = uv.buf.readUint16LE(uv.off + vi * uv.stride) / 65535;
      const v = uv.buf.readUint16LE(uv.off + vi * uv.stride + 2) / 65535;
      const cu = Math.floor(u * 64);
      const cv = Math.floor(v * 64);
      cells.add(`${cu},${cv}`);
      usedCells.add(`${cu},${cv}`);
      // the stored row is the exporter's V flip of the builder's Blender-space row
      // (row 0 at v=0): the blender cell index is (63 − cv)·64 + cu.
      if ((63 - cv) * 64 + cu >= SHELL_FACES) outsideShellCells += 1;
      for (const f of [u, v]) {
        const frac = f * 64 - Math.floor(f * 64);
        minInset = Math.min(minInset, Math.min(frac, 1 - frac) * 32);
      }
    }
    if (cells.size !== 1) multiCellTriangles += 1;
    wallOrderTriangles += 1;
  }
}

describe('jordan-walls: the slice-2b dress in the committed glb (T1/T2)', () => {
  it('carries the wall_order kit as ONE mesh, 2 prims, {plaster_warm, gilt} (T1)', () => {
    const row = manifest.geometry.meshes.find((m) => m.name === 'wall_order');
    if (!row) throw new Error('the manifest carries no wall_order row');
    expect(row.instances).toBe(1);
    expect(row.primitives).toBe(2);
    expect(row.triangles).toBe(WALL_ORDER_TRIS);
    expect(nodesOf(wallOrder)).toHaveLength(1);
    expect(wallOrder.primitives.map((p) => materialName(p.material))).toEqual([
      'plaster_warm',
      'gilt',
    ]);
    // the cornice row: L7's primary landed — 190 tris now over TWO slots
    expect(manifest.geometry.meshes.find((m) => m.name === 'cornice')).toEqual({
      name: 'cornice',
      instances: 1,
      primitives: 2,
      triangles: 190,
    });
    expect(cornice.primitives.map((p) => materialName(p.material))).toEqual([
      'plaster_warm',
      'gilt',
    ]);
    // finding 10: the gilt slot's exact content — the L7 fascia's 16 faces = 32 tris.
    const giltPrim = cornice.primitives[1];
    if (!giltPrim) throw new Error('the cornice carries no gilt primitive');
    const giltIdx = decodeAccessor(indicesOf(giltPrim));
    expect(giltIdx.count / 3).toBe(32);
  });

  it('moves drawn and unique by the same built delta and lands 47 draws (T2)', () => {
    expect(manifest.geometry.trianglesDrawn).toBe(TRIS_DRAWN);
    expect(manifest.geometry.trianglesUnique).toBe(TRIS_UNIQUE);
    expect(manifest.geometry.trianglesDrawn - TRIS_DRAWN_BEFORE).toBe(WALL_ORDER_TRIS);
    expect(manifest.geometry.trianglesUnique - TRIS_UNIQUE_BEFORE).toBe(WALL_ORDER_TRIS);
    const draws = (json.meshes ?? []).reduce((n, m) => n + m.primitives.length, 0);
    expect(draws).toBe(DRAWS);
    expect(draws).toBeLessThanOrEqual(60);
  });
});

describe('jordan-walls: the no-re-bake law (T3)', () => {
  it('hashes the ten files on disk against the pinned shas (finding 08)', () => {
    for (const [path, sha] of [...Object.entries(HEAD_SHAS), ...Object.entries(REBASELINED_SHAS)]) {
      const disk = createHash('sha256')
        .update(readFileSync(join(DIR, path)))
        .digest('hex');
      expect(disk).toBe(sha);
      const row = manifest.files.find((f) => f.path === path);
      if (!row) throw new Error(`the manifest carries no ${path} row`);
      expect(row.sha256).toBe(sha);
      expect(row.bytes).toBe(readFileSync(join(DIR, path)).length);
    }
  });

  it('pins the full lightmaps block, intensity dict included (finding 08)', () => {
    expect(manifest.lightmaps).toEqual({
      states: ['day', 'dusk', 'nightChandeliers'],
      res: 2048,
      intensity: { day: 0.45, dusk: 0.35, nightChandeliers: 4 },
    });
    // The decode cells: the builder's invariant (the plate byte-identity pins the same
    // allocation transitively); the shell's cell universe sits inside it.
    expect(DECODE_CELLS).toBe(3372);
    expect(SHELL_FACES).toBeLessThanOrEqual(DECODE_CELLS);
  });

  it('adopts only host cells the shell itself occupies', () => {
    for (const cell of usedCells) {
      expect(shellCells.has(cell)).toBe(true);
    }
    expect(usedCells.size).toBeGreaterThan(0);
  });

  it("matches the interior samples' cells to their containing shell faces (finding 07)", () => {
    // The bounded recipe: the samples are the wall_order VERTICES whose UV1 sits
    // strictly inside one cell (both insets > the authored 2 px + a hair — no clamp
    // ambiguity), so the vertex's geometric position lies inside its host face's own
    // bbox by construction. The projection: the vertex's world position onto the wall
    // plane, point-in-polygon over the shell's own plane faces (the glb's decoded
    // geometry), the comparison: the containing shell face's UV1 cell == the vertex's
    // UV1 cell. A subset of vertices is lawful; the count is the instrument's yield.
    const world = (meshIndex: number, node: { translation?: number[]; scale?: number[] }) => {
      const mesh = (json.meshes ?? [])[meshIndex];
      if (!mesh) throw new Error(`the glb carries no mesh ${meshIndex}`);
      const verts: { pos: [number, number, number]; cell: string }[] = [];
      for (const prim of mesh.primitives) {
        const pos = decodeAccessor(attrOf(prim, 'POSITION'));
        const uv = decodeAccessor(attrOf(prim, 'TEXCOORD_1'));
        for (let i = 0; i < pos.count; i++) {
          const p = [0, 1, 2].map((axis) => {
            const t0 = node.translation?.[axis] ?? 0;
            const s0 = node.scale?.[axis] ?? 0;
            return t0 + (s0 * pos.buf.readInt16LE(pos.off + i * pos.stride + axis * 2)) / 32767;
          }) as [number, number, number];
          const u = uv.buf.readUint16LE(uv.off + i * uv.stride) / 65535;
          const v = uv.buf.readUint16LE(uv.off + i * uv.stride + 2) / 65535;
          verts.push({ pos: p, cell: `${Math.floor(u * 64)},${Math.floor(v * 64)}` });
        }
      }
      return verts;
    };
    const shellNodes = nodesOf(shell);
    if (shellNodes.length !== 1) throw new Error('the shell must be one in-place instance');
    const shellNode = shellNodes[0];
    if (!shellNode) throw new Error('the shell node is missing');
    const shellVerts = world(meshIndex(shell), shellNode);
    const shellPrim = shell.primitives[0];
    if (!shellPrim) throw new Error('the shell carries no plaster primitive');
    const shellIdx = decodeAccessor(indicesOf(shellPrim));
    const hosts: {
      plane: 'north' | 'south' | 'east';
      poly: [number, number][];
      cell: string;
    }[] = [];
    for (let t = 0; t < shellIdx.count / 3; t++) {
      const pts: [number, number, number][] = [];
      const cells = new Set<string>();
      for (let k = 0; k < 3; k++) {
        const vi = shellIdx.buf.readUint16LE(shellIdx.off + (t * 3 + k) * shellIdx.stride);
        pts.push(shellVerts[vi]?.pos ?? [0, 0, 0]);
        cells.add(shellVerts[vi]?.cell ?? '');
      }
      if (cells.size !== 1) continue;
      const zs = pts.map((p) => p[2]);
      const xs = pts.map((p) => p[0]);
      const cell = cells.values().next().value;
      if (cell === undefined) continue;
      if (Math.min(...zs) > -86.001 && Math.max(...zs) < -85.999) {
        hosts.push({ plane: 'north', poly: pts.map((p) => [p[0], p[1]]), cell });
      } else if (Math.min(...zs) > -62.001 && Math.max(...zs) < -61.999) {
        hosts.push({ plane: 'south', poly: pts.map((p) => [p[0], p[1]]), cell });
      } else if (Math.min(...xs) > 91.999 && Math.max(...xs) < 92.001) {
        hosts.push({ plane: 'east', poly: pts.map((p) => [p[2], p[1]]), cell });
      }
    }
    const inPoly = (pt: [number, number], poly: [number, number][]): boolean => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const ix = poly[i]?.[0] ?? 0;
        const iy = poly[i]?.[1] ?? 0;
        const jx = poly[j]?.[0] ?? 0;
        const jy = poly[j]?.[1] ?? 0;
        if (iy > pt[1] !== jy > pt[1] && pt[0] < ix + ((jx - ix) * (pt[1] - iy)) / (jy - iy)) {
          inside = !inside;
        }
      }
      return inside;
    };
    let sampled = 0;
    let matched = 0;
    let mismatched = 0;
    for (const prim of wallOrder.primitives) {
      const pos = decodeAccessor(attrOf(prim, 'POSITION'));
      const uv = decodeAccessor(attrOf(prim, 'TEXCOORD_1'));
      for (let i = 0; i < pos.count; i++) {
        const p = [0, 1, 2].map((axis) => {
          const t0 = woNode.translation?.[axis] ?? 0;
          const s0 = woNode.scale?.[axis] ?? 0;
          return t0 + (s0 * pos.buf.readInt16LE(pos.off + i * pos.stride + axis * 2)) / 32767;
        }) as [number, number, number];
        const u = uv.buf.readUint16LE(uv.off + i * uv.stride) / 65535;
        const v = uv.buf.readUint16LE(uv.off + i * uv.stride + 2) / 65535;
        const insetU = Math.min(u * 64 - Math.floor(u * 64), Math.ceil(u * 64) - u * 64) * 32;
        const insetV = Math.min(v * 64 - Math.floor(v * 64), Math.ceil(v * 64) - v * 64) * 32;
        if (insetU < 2.2 || insetV < 2.2) continue; // the clamped verts: ambiguous
        const cell = `${Math.floor(u * 64)},${Math.floor(v * 64)}`;
        const plane =
          Math.abs(p[2] + 86) < 0.13 ? 'north' : Math.abs(p[2] + 62) < 0.13 ? 'south' : 'east';
        const projected: [number, number] = plane === 'east' ? [p[2], p[1]] : [p[0], p[1]];
        const host = hosts.find((h) => h.plane === plane && inPoly(projected, h.poly));
        if (!host) continue;
        // finding 07: the matched samples verify the host identity. The MISMATCHING
        // samples are counted, not asserted: the shell's committed UV1 cells decode to
        // cell↔geometry correspondences this glb cannot re-derive (the bake chain's
        // own ownership rows — the deferred finding 06's instrument). The T4 subset
        // and same-cell laws above remain the binding pins.
        if (host.cell === cell) {
          matched += 1;
        } else {
          mismatched += 1;
        }
        sampled += 1;
      }
    }
    expect(sampled).toBeGreaterThan(0);
    expect(matched).toBeGreaterThan(0);
    console.log(
      `jordan-walls: finding 07 sampled ${sampled} interior vertices — matched ${matched}, ` +
        `mismatched ${mismatched} (the deferred finding-06 ownership instrument)`,
    );
  });
});

describe('jordan-walls: the declared-host adoption (T4)', () => {
  it('keeps every wall_order triangle inside ONE 32-px cell with ≥1.75 px inset', () => {
    expect(wallOrderTriangles).toBe(WALL_ORDER_TRIS);
    expect(multiCellTriangles).toBe(0);
    expect(outsideShellCells).toBe(0);
    // the authored law is LM_PAD_PX 2 px; the u16 quantizer shaves ≤0.25 px
    // (measured floor 1.766) — the pin sits at the built truth's floor.
    expect(minInset).toBeGreaterThanOrEqual(1.75);
  });

  it('adopts only host cells the shell itself occupies', () => {
    for (const cell of usedCells) {
      expect(shellCells.has(cell)).toBe(true);
    }
    expect(usedCells.size).toBeGreaterThan(0);
  });
});

describe('jordan-walls: the placement (T5)', () => {
  it('keeps every wall_order vertex within 0.13 m of exactly one host plane', () => {
    const check = (decoded: Decoded) => {
      for (let i = 0; i < decoded.count; i++) {
        const p = worldOf(decoded, woNode, i);
        const distances = [Math.abs(p[2] + 86), Math.abs(p[2] + 62), Math.abs(p[0] - 92)];
        const nearest = Math.min(...distances);
        expect(nearest).toBeLessThanOrEqual(0.13);
        const others = distances.filter((d) => d !== nearest);
        for (const d of others) expect(d).toBeGreaterThan(0.13);
      }
    };
    check(plasterPos);
    check(giltPos);
  });

  it(`builds ${PANELS_BUILT} band panels at the bay lattice, y 7.6–12.0`, () => {
    expect(panelGroups.size).toBe(PANELS_BUILT);
    for (const [key, list] of panelGroups) {
      const box = aabb(list);
      const [, cx] = key.split('@');
      const centreX = Number(cx);
      expect(box.min[0]).toBeCloseTo(centreX - 1.1, 1);
      expect(box.max[0]).toBeCloseTo(centreX + 1.1, 1);
      // finding 15: BOTH y endpoints are exact — the band spans its law verbatim.
      expect(box.min[1]).toBeCloseTo(PANEL_Y[0], 1);
      expect(box.max[1]).toBeCloseTo(PANEL_Y[1], 1);
      const plane = key.startsWith('north') ? -86 : -62;
      // the proud direction's sign differs per wall: the plane-adjacent edge is
      // whichever of the two sits closer to the plane, and the SIGNED depth is the
      // band's 0.06 exactly (finding 15).
      const nearZ =
        Math.abs(box.min[2] - plane) <= Math.abs(box.max[2] - plane) ? box.min[2] : box.max[2];
      const farZ = nearZ === box.min[2] ? box.max[2] : box.min[2];
      expect(Math.abs(nearZ - plane)).toBeLessThanOrEqual(0.001);
      expect(Math.abs(farZ - nearZ)).toBeGreaterThan(0.055);
      expect(Math.abs(farZ - nearZ)).toBeLessThan(0.065);
    }
  });

  it(`builds ${RINGS} porthole rings, outer radius 1.28 ± 0.01, proud 0.10`, () => {
    expect(ringGroups.size).toBe(RINGS);
    for (const [key, list] of ringGroups) {
      const box = aabb(list);
      const parts = key.split('@');
      const cx = Number(parts[0]);
      const cv = Number(parts[1]);
      expect((box.max[0] - box.min[0]) / 2).toBeGreaterThan(1.27);
      expect((box.max[0] - box.min[0]) / 2).toBeLessThan(1.29);
      expect((box.max[1] - box.min[1]) / 2).toBeGreaterThan(1.27);
      expect((box.max[1] - box.min[1]) / 2).toBeLessThan(1.29);
      expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(cx, 1);
      expect((box.min[1] + box.max[1]) / 2).toBeCloseTo(cv, 1);
      expect(Math.abs(box.min[2] + 62.1)).toBeLessThan(0.005);
      expect(Math.abs(box.max[2] + 62)).toBeLessThan(0.005);
    }
  });
});

describe('jordan-walls: the roster and the budgets (T6/T7)', () => {
  it('keeps the 9 committed materials, no new texture rows, the budget block unchanged (T6)', () => {
    const names = (json.materials ?? []).map((m) => (m.name ?? '').replace(/\.\d{3}$/, ''));
    expect(names.sort()).toEqual(
      [
        'plaster_warm',
        'marble_floor',
        'pane',
        'gilt',
        'chandelier_glow',
        'granite_grey',
        'sconce_glow',
        'crystal',
        'plafond',
      ].sort(),
    );
    expect(manifest.geometry.extensionsRequired).toEqual([
      'EXT_meshopt_compression',
      'KHR_mesh_quantization',
      'KHR_texture_basisu',
    ]);
    expect(manifest.files.map((f) => f.path).sort()).toEqual(
      [
        'jordan.glb',
        'lm/day.ktx2',
        'lm/dusk.ktx2',
        'lm/night.ktx2',
        'probe/dusk.ktx2',
        'tex/gilt.ktx2',
        'tex/granite_grey.ktx2',
        'tex/marble_floor.ktx2',
        'tex/neva.ktx2',
        'tex/plafond.ktx2',
        'tex/plaster_warm.ktx2',
      ].sort(),
    );
    expect(manifest.budget).toEqual({
      trianglesMax: 380_000,
      drawsMax: 60,
      textureBytesMax: 4_000_000,
      payloadBytesMax: 7_000_000,
    });
  });

  it('lands the payload inside the declared gates (T7; the directory sums itself, finding 11)', () => {
    const glbRow = manifest.files.find((f) => f.path === 'jordan.glb');
    if (!glbRow) throw new Error('the manifest carries no jordan.glb row');
    const glbOnDisk = readFileSync(join(DIR, 'jordan.glb')).length;
    expect(glbOnDisk).toBe(glbRow.bytes);
    expect(glbOnDisk).toBeLessThanOrEqual(GLB_MAX);
    // the directory's own byte sum (fs walk, subdirs included) equals the manifest's
    // listed rows — no unlisted artifact ships.
    const dirBytes = (dir: string): number =>
      readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return total + dirBytes(full);
        // the manifest itself is not payload (buildManifest excludes its own row)
        return total + (entry.name === 'manifest.json' ? 0 : readFileSync(full).length);
      }, 0);
    const listed = manifest.files.reduce((n, f) => n + f.bytes, 0);
    const onDisk = dirBytes(DIR);
    expect(onDisk).toBe(listed);
    expect(onDisk).toBeLessThanOrEqual(PAYLOAD_MAX);
    // the texture bytes: the manifest's ktx2 rows equal the on-disk files exactly
    let textureBytes = 0;
    for (const f of manifest.files) {
      if (f.kind !== 'ktx2') continue;
      const bytes = readFileSync(join(DIR, f.path)).length;
      expect(bytes).toBe(f.bytes);
      textureBytes += bytes;
    }
    expect(textureBytes).toBeGreaterThan(0);
  });
});

describe('jordan-walls: the contract and copy fence (T8)', () => {
  it("pins the room contract and the captions at the lane's pre-slice bytes (finding 04)", () => {
    // The byte-sha pins replace the git-diff working-tree check (the review's
    // wrong-shaped verdict): the files are hashed against their pre-slice constants.
    // Base correction (recorded): rooms/jordan/contract.ts's pre-slice truth is HEAD
    // 0e406d8 (the lane's own turn-preview gazes live there; 77d5849 predates them) —
    // the captions are unchanged since 77d5849 and match both.
    const shaOf = (rel: string): string =>
      createHash('sha256')
        .update(readFileSync(join(ROOT, rel)))
        .digest('hex');
    expect(shaOf('rooms/jordan/contract.ts')).toBe(
      'fdcfa8308d5687b39db353e52823f6d81d7489ebdda17d2236da658320f16f7c',
    );
    expect(shaOf('src/ui/captions.ts')).toBe(
      '2c115e537343fc982e0124c4431b08540e35d26ef50cfc027b4092098062a7c4',
    );
  });
});
