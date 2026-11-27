// tests/gallery-arch-chart.test.ts
// R4 (design-gallery.md §4.6, D-12): CI cannot run Blender, but it can prove the committed
// JSON and the committed glb tell the same story. Three pins:
//   1. arch-chart.json: every patch in bounds (pad-respecting), pairwise non-overlapping
//      including its pad ring, and never below the chart's minimum patch size.
//   2. Every architecture primitive's TEXCOORD_1 in the committed glb lies inside the union
//      of its part's patch rects. The glb's UV2 is KHR_mesh_quantization u16 NORMALIZED
//      (raw / 65535 — the room's committed dequantize law) inside EXT_meshopt_compression
//      views; the test decodes with the real MeshoptDecoder (wasm, no workers). UV law:
//      the glb's v = image-px-from-top / res (the Blender exporter's flip + the KTX2
//      non-flipped upload cancel — the 17b kit verification's convention).
//   3. No kit primitive's UV2 leaves its own kit strips (frame/canvas) or the K8 portal
//      block (the D-11 law in layout.json).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { beforeAll, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const chartPath = resolve(repoRoot, 'tools/gallery/arch-chart.json');
const glbPath = resolve(repoRoot, 'public/assets/military-gallery/military-gallery.glb');
const layoutPath = resolve(repoRoot, 'tools/gallery/layout.json');

type Patch = { h: number; part: string; w: number; x: number; y: number };
type Chart = { minPx: number; pad: number; patches: Record<string, Patch>; res: number };
type UvRect = { u0: number; u1: number; v0: number; v1: number };
type LayoutFrame = { chart: UvRect; chartCanvas: UvRect; kind: string };
type Layout = {
  frames: LayoutFrame[];
  lightmap: { portalBlock: { cells: number; colCanvas: number; colFrame: number; row: number } };
};
type GltfJson = {
  accessors: {
    bufferView: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    normalized?: boolean;
    type: string;
  }[];
  bufferViews: {
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    extensions?: {
      EXT_meshopt_compression?: {
        byteOffset: number;
        byteLength: number;
        byteStride: number;
        count: number;
        mode: string;
      };
    };
  }[];
  meshes: { name?: string; primitives: { attributes: Record<string, number> }[] }[];
};

const chart = JSON.parse(readFileSync(chartPath, 'utf8')) as Chart;
const layout = JSON.parse(readFileSync(layoutPath, 'utf8')) as Layout;
const patches = Object.values(chart.patches);
const pad = chart.pad;
const res = chart.res;

// u16 quantization (gltf-transform's quantize step) wobbles the decoded value by up to
// ~1e-4 (measured: the floor's exact 0.41796875 reads 0.41806668 — 0.2 px at 2048, sub-texel,
// absorbed by the 2 px pad; the bake reads the builder's exact UVs, the runtime the wobbled
// ones — both inside the cell). EPS = 2e-4 stays 5× tighter than the pad ring.
const EPS = 2e-4;

const KIT_ARCH_PARTS = [
  'bench',
  'door_case_sg',
  'door_cases',
  'door_leaves',
  'door_reveal',
  'floor',
  'lantern_bars',
  'lantern_glazing',
  'leaf_sg_n',
  'leaf_sg_s',
  'pier_columns',
  'pier_gilt',
  'pier_shafts',
  'portal_gilt',
  'portal_leaves',
  'portal_step',
  'torchere_body',
  'torchere_candles',
  'vault',
  'wall_crimson',
  'wall_plaster',
] as const;

const ARCH_CHART_RES = 2048;
const KIT_CHART_RES = 1024;
const KIT_CELL_PX = KIT_CHART_RES / 32;
const KIT_PAD_PX = 2;
const PORTAL_INDEX = 334;

function parseGlb(buf: Buffer): { bin: Buffer; json: GltfJson } {
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8')) as GltfJson;
  const binStart = 20 + jsonLength;
  const binLength = buf.readUInt32LE(binStart);
  const bin = buf.subarray(binStart + 8, binStart + 8 + binLength);
  return { bin, json };
}

const glb = parseGlb(readFileSync(glbPath));

/** TEXCOORD_1 → denormalized floats, meshopt-decoded where the view is compressed. */
function uv2Of(accessorIndex: number): Float32Array {
  const accessor = glb.json.accessors[accessorIndex];
  expect(accessor, 'the TEXCOORD_1 accessor exists').toBeDefined();
  if (accessor === undefined) throw new Error('unreachable: accessor checked above');
  expect(accessor.type, 'TEXCOORD_1 is VEC2').toBe('VEC2');
  expect(accessor.componentType, 'TEXCOORD_1 is u16').toBe(5123);
  expect(accessor.normalized, 'TEXCOORD_1 is normalized').toBe(true);
  const view = glb.json.bufferViews[accessor.bufferView];
  expect(view, 'the accessor\u2019s bufferView exists').toBeDefined();
  if (view === undefined) throw new Error('unreachable: bufferView checked above');
  const compressed = view.extensions?.EXT_meshopt_compression;
  const raw = new Uint8Array(accessor.count * 4);
  if (compressed === undefined) {
    const stride = view.byteStride ?? 8;
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let i = 0; i < accessor.count; i += 1) {
      const base = offset + i * stride;
      raw[i * 4] = glb.bin.readUInt8(base);
      raw[i * 4 + 1] = glb.bin.readUInt8(base + 1);
      raw[i * 4 + 2] = glb.bin.readUInt8(base + 2);
      raw[i * 4 + 3] = glb.bin.readUInt8(base + 3);
    }
  } else {
    const source = new Uint8Array(
      glb.bin.subarray(compressed.byteOffset, compressed.byteOffset + compressed.byteLength),
    );
    const target = new Uint8Array(compressed.count * compressed.byteStride);
    MeshoptDecoder.decodeGltfBuffer(
      target,
      compressed.count,
      compressed.byteStride,
      source,
      compressed.mode,
    );
    raw.set(target);
  }
  const pairs = new Uint16Array(raw.buffer, 0, accessor.count * 2);
  return Float32Array.from(pairs, (raw16) => raw16 / 65535);
}

/** The primitive's TEXCOORD_1 accessor index, loud when absent (the chain's own gate). */
function accessorIndexOf(prim: { attributes: Record<string, number> }): number {
  const index = prim.attributes.TEXCOORD_1;
  expect(index, 'the primitive carries TEXCOORD_1').toBeDefined();
  if (index === undefined) throw new Error('unreachable: TEXCOORD_1 checked above');
  return index;
}

/** The denormalized UV2 as (u, v) points (iteration, not indexing — strict TS). */
function uvPointsOf(prim: { attributes: Record<string, number> }): Array<{ u: number; v: number }> {
  const uv2 = uv2Of(accessorIndexOf(prim));
  const points: Array<{ u: number; v: number }> = [];
  let open: number | null = null;
  for (const value of uv2) {
    if (open === null) {
      open = value;
      continue;
    }
    points.push({ u: open, v: value });
    open = null;
  }
  return points;
}

const patchesByPart = new Map<string, Patch[]>();
for (const patch of patches) {
  const list = patchesByPart.get(patch.part) ?? [];
  list.push(patch);
  patchesByPart.set(patch.part, list);
}

/** The glTF-space v of a chart px rect: v = image-px-from-top / res (the 17b law). */
const rectV = (patch: Patch): { v0: number; v1: number } => ({
  v0: patch.y / res,
  v1: (patch.y + patch.h) / res,
});

/** layout.json's uv rects are Blender-side v; the glb carries 1 − v (the exporter's flip). */
const glbRect = (rect: UvRect): { u0: number; u1: number; v0: number; v1: number } => ({
  u0: rect.u0,
  u1: rect.u1,
  v0: 1 - rect.v1,
  v1: 1 - rect.v0,
});

describe('arch-chart.json (D-10/D-12)', () => {
  it('rides the declared resolution (Block 2: LM_ARCH_RES = 2048)', () => {
    expect(res).toBe(ARCH_CHART_RES);
  });

  it('every patch is in bounds, pad-respecting, and above the minimum size', () => {
    expect(patches.length).toBeGreaterThan(0);
    for (const patch of patches) {
      expect(patch.x, `${patch.part} x`).toBeGreaterThanOrEqual(pad);
      expect(patch.y, `${patch.part} y`).toBeGreaterThanOrEqual(pad);
      expect(patch.x + patch.w, patch.part).toBeLessThanOrEqual(res - pad);
      expect(patch.y + patch.h, patch.part).toBeLessThanOrEqual(res - pad);
      expect(patch.w, `${patch.part} min width`).toBeGreaterThanOrEqual(chart.minPx);
      expect(patch.h, `${patch.part} min height`).toBeGreaterThanOrEqual(chart.minPx);
    }
  });

  it('patches are pairwise non-overlapping including their pad rings', () => {
    const ordered = [...patches].sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < ordered.length; i += 1) {
      const a = ordered[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = ordered[j];
        if (b === undefined) continue;
        if (b.y - a.y >= a.h + 2 * pad) break; // sorted by y: the rest sits below a's ring
        const overlapsX = a.x < b.x + b.w + 2 * pad && b.x < a.x + a.w + 2 * pad;
        const overlapsY = a.y < b.y + b.h + 2 * pad && b.y < a.y + a.h + 2 * pad;
        expect(overlapsX && overlapsY, `${a.part} vs ${b.part}`).toBe(false);
      }
    }
  });

  it('carries every architecture part', () => {
    const parts = new Set(patches.map((patch) => patch.part));
    expect([...parts].sort()).toEqual([...KIT_ARCH_PARTS].sort());
  });
});

describe('the committed glb (geometry ↔ chart, D-12)', () => {
  beforeAll(async () => {
    await MeshoptDecoder.ready;
  });

  it('every architecture primitive’s UV2 lies inside its part’s patch union', () => {
    let archPrims = 0;
    for (const mesh of glb.json.meshes) {
      const name = mesh.name ?? '';
      if (name.startsWith('frame_') || name.startsWith('canvas_')) continue;
      archPrims += 1;
      const own = patchesByPart.get(name);
      expect(own, `${name} has chart patches`).toBeDefined();
      if (own === undefined) continue;
      const rects = own.map((patch) => {
        const { v0, v1 } = rectV(patch);
        return { u0: patch.x / res, u1: (patch.x + patch.w) / res, v0, v1 };
      });
      for (const prim of mesh.primitives) {
        for (const point of uvPointsOf(prim)) {
          const inside = rects.some(
            (rect) =>
              point.u >= rect.u0 - EPS &&
              point.u <= rect.u1 + EPS &&
              point.v >= rect.v0 - EPS &&
              point.v <= rect.v1 + EPS,
          );
          expect(
            inside,
            `${name} uv2 (${point.u.toFixed(5)}, ${point.v.toFixed(5)}) inside its patches`,
          ).toBe(true);
        }
      }
    }
    expect(archPrims).toBe(KIT_ARCH_PARTS.length);
  });

  it('no kit primitive’s UV2 leaves its strips or the K8 portal block', () => {
    const block = layout.lightmap.portalBlock;
    expect(block.row).toBe(Math.ceil(668 / 32)); // derived, never a literal (D-11)
    const blockRect = (col: number): { u0: number; u1: number; v0: number; v1: number } => ({
      u0: (col * KIT_CELL_PX + KIT_PAD_PX) / KIT_CHART_RES,
      u1: (col * KIT_CELL_PX + block.cells * KIT_CELL_PX - KIT_PAD_PX) / KIT_CHART_RES,
      v0: (block.row * KIT_CELL_PX + KIT_PAD_PX) / KIT_CHART_RES,
      v1: (block.row * KIT_CELL_PX + block.cells * KIT_CELL_PX - KIT_PAD_PX) / KIT_CHART_RES,
    });
    let kitPrims = 0;
    for (const mesh of glb.json.meshes) {
      const name = mesh.name ?? '';
      const isFrame = name.startsWith('frame_');
      const isCanvas = name.startsWith('canvas_');
      if (!isFrame && !isCanvas) continue;
      kitPrims += 1;
      const index = Number(name.slice(name.indexOf('_') + 1));
      const frame = layout.frames[index];
      expect(frame, `${name} has a layout row`).toBeDefined();
      if (frame === undefined) continue;
      const rects =
        index === PORTAL_INDEX
          ? [blockRect(isFrame ? block.colFrame : block.colCanvas)]
          : [glbRect(isFrame ? frame.chart : frame.chartCanvas)];
      for (const prim of mesh.primitives) {
        for (const point of uvPointsOf(prim)) {
          const inside = rects.some(
            (rect) =>
              point.u >= rect.u0 - EPS &&
              point.u <= rect.u1 + EPS &&
              point.v >= rect.v0 - EPS &&
              point.v <= rect.v1 + EPS,
          );
          expect(
            inside,
            `${name} uv2 (${point.u.toFixed(5)}, ${point.v.toFixed(5)}) inside its strips`,
          ).toBe(true);
        }
      }
    }
    // mg-1812-look DECISION-1: 670 kit strips minus the four doorway-dropped frames'
    // frame+canvas pairs (the keep-clear law; the slots stay allocated by rank).
    expect(kitPrims).toBe(670 - 2 * 4);
  });
});
