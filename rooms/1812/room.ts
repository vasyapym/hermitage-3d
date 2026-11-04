// rooms/1812/room.ts
/**
 * Military Gallery of 1812 room module — docs/design-gallery.md §8.1 (the room module),
 * §3.2/§3.3 (the runtime merge law: one BufferGeometry per long wall, frames + canvases as
 * two material groups, one for the north-door pair, the end-wall group with H3), §2.4
 * (CANVAS: the portrait atlas on MeshStandardMaterial with map; the lightMap slot rides
 * R4's bakes), §3.7/§4.4 (R4, DEC-027: TWO lightmap charts per state — the architecture
 * chart on the core path law, the kit chart on lm/kit-<file>.ktx2 — bound per material by
 * userData[LM_CHART_KEY]; the kit frame groups carry a runtime clone of the glb's MG_gilt so
 * the glb instance can keep dressing architecture on the arch chart), §7.2 (the ledger rows;
 * release clears the scope). The sibling shape (rooms/rastrelli-gallery/room.ts); the UNBAKED
 * gate reads the manifest's all-or-nothing lightmaps row and mounts without
 * probe/technique/lm-decode (the three service laws that would throw) — the canary branch,
 * never fake-lit.
 *
 * Module-level state is safe: the coordinator serializes transits, so a room is never
 * mounted twice. The ledger (§8.3 layer 1) registers payload bytes in load and releases
 * the whole scope in unmount.
 */

import type { WebGLRenderer } from 'three';
import {
  BufferAttribute,
  type BufferGeometry,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyChartedTechnique, disposeTechnique } from '../../src/assets/blend-gl';
import { releaseOwnedEnvironment } from '../../src/assets/environment-slot';
import { LIGHT_STATES } from '../../src/content/lightmap-look';
import { stateOfPath } from '../../src/world/blend';
import type {
  LightmapIntensity,
  RoomLoadContext,
  RoomManifest,
  RoomModule,
  RoomObject,
  RoomPayload,
  RoomTexture,
  StateId,
} from '../../src/world/registry';
import { chartOfUserData, kitStateOfPath, LM_CHART_KEY, type LmChart } from './charts';
import { contract } from './contract';
import { KIT_WALLS, type KitWall, roleOf, wallOfName } from './kit-layout';

const ATLAS_PATH = 'tex/military-gallery-portraits.ktx2';
/**
 * The floor's repeat law — the duty R1b deferred to the runtime: the 512² tile carries 8×8
 * checks (PARQUET_CHECKS = 8) of one metre each, so the tile spans 8 m and the floor sweeps
 * it 8.5 m / 8 m by 55 m / 8 m. Declared convenience; the owner re-fits by capture.
 */
const FLOOR_TILE_M = 8;

/** The tag the two kit materials carry (§3.7): the merged kit groups read the kit chart. */
const KIT_TAG = 'kit' satisfies LmChart;

type Merged = Readonly<{
  geometries: BufferGeometry[];
  canvas: MeshStandardMaterial;
  /** The kit chart's gilt — a runtime clone of the glb's MG_gilt, owned by this scope. */
  giltKit: MeshStandardMaterial;
  atlas: Texture;
}>;

let payload: RoomPayload | null = null;
let whitePoint: LightmapIntensity | null = null; // null while unbaked (the canary branch)
let object: RoomObject | null = null;
/** R24-ux: the environment handle THIS mount created (per-load; the slot may be replaced). */
let envHandle: RoomTexture | null = null;
let merged: Merged | null = null;

/** §3.7: the chart a material reads — the kit tag or the architecture default. */
const chartOfMaterial = (material: MeshStandardMaterial): LmChart =>
  chartOfUserData(material.userData);

export const room: RoomModule = {
  contract,
  async load(ctx, manifest, signal) {
    payload = await ctx.assets.fetchRoom(manifest, signal);
    const glbRow = manifest.files.find((row) => row.kind === 'glb');
    if (glbRow === undefined) throw new Error(`${contract.id}: manifest has no glb row`);
    ctx.ledger.register(contract.id, 'glb', payload.glb.byteLength, glbRow.path);
    for (const [path, bytes] of payload.ktx2) {
      ctx.ledger.register(contract.id, 'ktx2', bytes.byteLength, path);
    }
    if (!payload.ktx2.has(ATLAS_PATH)) {
      throw new Error(`${contract.id}: manifest has no atlas row ${ATLAS_PATH}`);
    }
    // The all-or-nothing law (r17a): an empty lightmaps row is the canary/unbaked branch.
    whitePoint = manifest.lightmaps.states.length === 0 ? null : manifestIntensity(manifest);
  },
  async mount(ctx) {
    if (payload === null) throw new Error(`${contract.id}: mount before load`);
    if (object !== null) return; // idempotent
    object = await ctx.assets.mountParsed(contract.id, payload);
    const atlas = await ctx.assets.decodeRoomTexture(contract.id, payload, ATLAS_PATH);
    const texture = atlas as Texture;
    texture.colorSpace = SRGBColorSpace; // §2.4: the CANVAS law owns the albedo tagging
    // §5.1 (atlas v2): grazing angles down the gallery dominate — anisotropy on the atlas
    // only, capped at 8. The one src-side change of the round; zero bytes.
    texture.anisotropy = Math.min(
      8,
      (ctx.renderer as WebGLRenderer).capabilities.getMaxAnisotropy(),
    );
    merged = mergeKit(object, texture, ctx);
    if (whitePoint !== null) {
      // The baked path (R4): the sibling's, over two charts — one white point record serves
      // both (D-9: both charts of a state encode at the same white point).
      const env = await ctx.assets.mountEnvironment(contract.id, payload);
      ctx.scene.setEnvironment(env); // §5/ADR-0013: the probe is mounted once, inside the hold
      envHandle = env; // R24-ux: the identity this mount owns (environment-slot.ts)
      applyChartedTechnique(
        ctx.lmMode,
        contract.id,
        object,
        await stateTextures(ctx),
        chartOfMaterial,
        whitePoint,
        ctx.renderer,
        ctx.ledger,
      );
    }
    ctx.scene.add(object);
  },
  unmount(ctx) {
    if (object === null) return;
    if (whitePoint !== null) disposeTechnique(contract.id);
    // R24-ux: clear the slot ONLY if it still holds this mount's handle (interior
    // lifetimes overlap during a transit — the destination published already); the
    // resource is disposed regardless, exactly this mount's own (never early-return).
    // String guard (the unbaked canary branch never mounted an environment — the
    // helper's null-owned case is the same no-op), so every interior module is identical.
    releaseOwnedEnvironment(ctx.scene, envHandle, () => ctx.assets.disposeEnvironment(contract.id));
    envHandle = null;
    ctx.scene.remove(object);
    if (merged !== null) {
      for (const g of merged.geometries) g.dispose();
      merged.canvas.dispose();
      merged.giltKit.dispose();
      merged.atlas.dispose();
      merged = null;
    }
    ctx.assets.disposeParsed(object);
    ctx.ledger.release(contract.id);
    object = null;
  },
};

type Bucket = { frames: BufferGeometry[]; canvases: BufferGeometry[] };

/**
 * The merge rides DEQUANTIZED geometry. The committed glb's accessors are KHR_mesh_quantization
 * i8/i16 NORMALIZED (the chain's committed law; the node TRS carries the build's placement) —
 * the GPU normalizes them at render, but a CPU-side merge must hold floats: clone() keeps the
 * raw arrays, and applyMatrix4's setXYZ would re-encode the transformed result into the same
 * normalized Int16 (clamped garbage — the merged tree collapsed to a bubble at the origin and
 * the frustum culled the whole room). getComponent applies the denormalization; materialize
 * every attribute into a plain Float32 array first, then bake the world transform.
 */
const dequantizeGeometry = (source: BufferGeometry): BufferGeometry => {
  const geometry = source.clone();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const count = attribute.count;
    const itemSize = attribute.itemSize;
    const floats = new Float32Array(count * itemSize);
    for (let i = 0; i < count; i += 1) {
      for (let k = 0; k < itemSize; k += 1) {
        floats[i * itemSize + k] = attribute.getComponent(i, k);
      }
    }
    geometry.setAttribute(name, new BufferAttribute(floats, itemSize));
  }
  return geometry;
};

/**
 * The lighting law needs UNIT attribute normals: the GL's native normalized read delivers
 * them unit, and applyNormalMatrix composes the node's scale (27.5× here), shrinking them —
 * renormalize once per merged geometry, exactly what the unmerged render path does.
 */
const renormalizeNormals = (geometry: BufferGeometry): void => {
  const normal = geometry.attributes.normal;
  if (normal === undefined) return;
  for (let i = 0; i < normal.count; i += 1) {
    const x = normal.getX(i);
    const y = normal.getY(i);
    const z = normal.getZ(i);
    const length = Math.hypot(x, y, z);
    if (length > 0) normal.setXYZ(i, x / length, y / length, z / length);
  }
  normal.needsUpdate = true;
};

/** The frame material must be a MeshStandardMaterial — the technique patches only those. */
const standardOrThrow = (material: Material | Material[], name: string): MeshStandardMaterial => {
  const first = Array.isArray(material) ? material[0] : material;
  if (first === undefined || !(first as MeshStandardMaterial).isMeshStandardMaterial) {
    throw new Error(`${contract.id}: frame ${name} carries no MeshStandardMaterial`);
  }
  return first as MeshStandardMaterial;
};

/**
 * §3.2/§3.3: one geometry per long wall (frames + canvases as two groups), one for the north
 * pair, one for the end-wall group; the 17 architecture parts collapse into ONE grouped
 * geometry — one draw per distinct material (≤ 11) — reconciling §8's declared 19 draws
 * (8 kit + ≤ 11 architecture). Every merge step fails loud; the fix is in the merge, never
 * in drawsMax. §3.7 (R4): the kit groups carry the two KIT-chart materials — CANVAS and a
 * runtime clone of the glb's MG_gilt — tagged userData[LM_CHART_KEY] = 'kit'.
 */
const mergeKit = (root: RoomObject, atlas: Texture, ctx: RoomLoadContext): Merged => {
  const scene = root as Object3D;
  scene.updateMatrixWorld(true);
  const sources: Mesh[] = [];
  scene.traverse((o: Object3D) => {
    const mesh = o as Mesh;
    if (mesh.isMesh === true) sources.push(mesh);
  });
  const walls = new Map<KitWall, Bucket>(KIT_WALLS.map((w) => [w, { frames: [], canvases: [] }]));
  const arch = new Map<Material, BufferGeometry[]>();
  let giltSource: MeshStandardMaterial | null = null;
  for (const mesh of sources) {
    const geometry = dequantizeGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
    const role = roleOf(mesh.name);
    if (role === 'architecture') {
      const material = mesh.material as Material;
      const bucket = arch.get(material);
      if (bucket === undefined) arch.set(material, [geometry]);
      else bucket.push(geometry);
      continue;
    }
    const wall = wallOfName(mesh.name);
    const bucket = wall === null ? undefined : walls.get(wall);
    if (bucket === undefined) {
      geometry.dispose();
      throw new Error(`${contract.id}: kit part ${mesh.name} classifies into no merge bucket`);
    }
    if (role === 'frame') {
      bucket.frames.push(geometry);
      giltSource ??= standardOrThrow(mesh.material, mesh.name);
    } else {
      bucket.canvases.push(geometry);
    }
  }
  if (giltSource === null) throw new Error(`${contract.id}: kit has no frame parts`);
  // §3.7: the frames read the KIT chart while the glb's MG_gilt may also dress architecture on
  // the ARCH chart — the kit groups carry a clone tagged for the kit chart. clone() shares the
  // textures by reference (they stay the parsed tree's, disposeParsed reaches them); when no
  // architecture part carries the glb instance it leaves the tree with the source meshes,
  // never rendered — nothing GPU-side to release.
  const giltKit = giltSource.clone();
  giltKit.name = `${giltSource.name}-kit`;
  giltKit.userData[LM_CHART_KEY] = KIT_TAG;
  ctx.ledger.register(contract.id, 'material', 0, giltKit.name);
  const canvas = new MeshStandardMaterial({ map: atlas, roughness: 0.9, metalness: 0 });
  canvas.name = 'CANVAS';
  canvas.userData[LM_CHART_KEY] = KIT_TAG;
  ctx.ledger.register(contract.id, 'material', 0, 'CANVAS');
  const parent = sources[0]?.parent;
  if (parent === undefined || parent === null) {
    throw new Error(`${contract.id}: kit has no parent to hang the merged meshes on`);
  }
  const geometries: BufferGeometry[] = [];
  for (const [wall, bucket] of walls) {
    const frames = mergeOrThrow(bucket.frames, `${wall} frames`);
    const canvases = mergeOrThrow(bucket.canvases, `${wall} canvases`);
    const kit = mergeOrThrow([frames, canvases], `${wall} kit`, true);
    frames.dispose();
    canvases.dispose();
    renormalizeNormals(kit);
    geometries.push(kit);
    ctx.ledger.register(contract.id, 'geometry', gpuBytes(kit), `kit/${wall}`);
    parent.add(new Mesh(kit, [giltKit, canvas]));
  }
  const materials = [...arch.keys()];
  const archGeometry = mergeOrThrow(
    materials.map((m) => {
      const bucket = arch.get(m);
      if (bucket === undefined) throw new Error(`${contract.id}: architecture bucket vanished`);
      return mergeOrThrow(bucket, 'architecture part');
    }),
    'architecture',
    true,
  );
  renormalizeNormals(archGeometry);
  geometries.push(archGeometry);
  ctx.ledger.register(contract.id, 'geometry', gpuBytes(archGeometry), 'architecture');
  parent.add(new Mesh(archGeometry, materials));
  // The floor's repeat law (R1b's deferred duty): the parquet texture sweeps the floor.
  const floor = sources.find((mesh) => mesh.name === 'floor');
  if (floor !== undefined) {
    const material = Array.isArray(floor.material) ? floor.material[0] : floor.material;
    if (material !== undefined) {
      const parquetMap = mapOf(material);
      if (parquetMap !== null) {
        parquetMap.wrapS = RepeatWrapping;
        parquetMap.wrapT = RepeatWrapping;
        const b = contract.bounds;
        parquetMap.repeat.set(
          (b.max[0] - b.min[0]) / FLOOR_TILE_M,
          (b.max[2] - b.min[2]) / FLOOR_TILE_M,
        );
      }
    }
  }
  // The source meshes leave the tree (their merged replacements hang in); the shared
  // materials stay — the merged meshes carry them and disposeParsed reaches them there.
  for (const mesh of sources) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  return { geometries, canvas, giltKit, atlas };
};

const mapOf = (material: Material | readonly Material[]): Texture | null => {
  const first = Array.isArray(material) ? material[0] : material;
  if (first === undefined) return null;
  const map = (first as unknown as { map?: Texture }).map;
  return map === undefined || map === null ? null : map;
};

const mergeOrThrow = (parts: BufferGeometry[], what: string, useGroups = false): BufferGeometry => {
  const out = parts.length === 0 ? null : mergeGeometries(parts, useGroups);
  if (out === null) throw new Error(`${contract.id}: cannot merge ${what} (${parts.length} parts)`);
  return out;
};

const gpuBytes = (g: BufferGeometry): number =>
  Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0) +
  (g.index?.array.byteLength ?? 0);

const manifestIntensity = (manifest: RoomManifest): LightmapIntensity => {
  // Verbatim the sibling's (r17c scalar law): the record is the single source of truth.
  const record = manifest.lightmaps.intensity;
  if (record === null) {
    throw new Error(`${contract.id}: manifest has no lightmap intensity record`);
  }
  for (const state of LIGHT_STATES) {
    const value = record[state];
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${contract.id}: lightmap intensity[${state}] must be finite and > 0`);
    }
  }
  return record;
};

/**
 * §3.7/§4.4 (D-8): the six decoded lm rows split into the two charts — arch by the core
 * stateOfPath, kit by kitStateOfPath — and each chart must carry exactly the three states.
 * State law (the integration's tightening, argued in the reply's CHALLENGES): an lm row
 * neither law names is a bake bug — it throws loud, never renders ignored.
 */
const stateTextures = async (
  ctx: RoomLoadContext,
): Promise<ReadonlyMap<LmChart, ReadonlyMap<StateId, unknown>>> => {
  if (payload === null) throw new Error(`${contract.id}: no payload`);
  const decoded = await ctx.assets.decodeRoomTextures(contract.id, payload);
  const arch = new Map<StateId, unknown>();
  const kit = new Map<StateId, unknown>();
  for (const [path, texture] of decoded) {
    const archState = stateOfPath(path);
    if (archState !== null) {
      arch.set(archState, texture);
      continue;
    }
    const kitState = kitStateOfPath(path);
    if (kitState !== null) {
      kit.set(kitState, texture);
      continue;
    }
    throw new Error(`${contract.id}: lm row ${path} names no chart law`);
  }
  if (arch.size !== 3 || kit.size !== 3) {
    throw new Error(
      `${contract.id}: expected three baked states per chart, got arch ${arch.size} + kit ${kit.size}`,
    );
  }
  return new Map<LmChart, ReadonlyMap<StateId, unknown>>([
    ['arch', arch],
    ['kit', kit],
  ]);
};
