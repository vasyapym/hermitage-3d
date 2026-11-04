// src/assets/loaders.ts
/**
 * Three-bound loader service — docs/design-staircase.md §8.2 (fetch/decode off the render
 * path; parse + GPU upload inside the hold), §8.3 (dispose once, in exit), §8.4 (no GPU
 * allocation in the frame loop). Implements RoomAssetService from src/world/registry.
 * Extended by docs/design-walkthrough-ux.md §4.6 + §12 R-UX1: a per-session cache keyed by room
 * id holds the prefetched bytes and the staged lm/* transcodes, never evicted in-session.
 *
 * Laws: fetchRoom never touches the renderer; mountParsed is hold-only and uploads every
 * texture before returning; blob URLs live until disposeParsed, never revoked per frame.
 * Cache laws: fetchRoom consults the cache before every fetch and fills it after every fetch;
 * a row whose bytes mismatch the manifest size is re-fetched; stageUnit performs exactly one
 * unit, never touches the ledger, never parses the glb, never allocates GPU memory and never
 * creates blob URLs; nothing is ever evicted — dispose() ends the session and clears the cache.
 * SINGLE-USE STAGING: a staged lm transcode is consumed exactly once — decodeRoomTextures
 * removes it from the cache on return, because a room's unmount disposes textures (state A
 * rides material.lightMap, disposeParsed's traverse reaches it) and a kept object would come
 * back disposed on re-entry. Revisits re-transcode from the byte cache; only the first entry
 * after a prefetch rides the staged decode. A failed stage marks the plan but leaves the byte
 * cache empty — the hold's fetchRoom fetches the row on demand (today's shape, safe degrade).
 */
import {
  type CompressedTexture,
  LoadingManager,
  type Material,
  type Mesh,
  type Object3D,
  PMREMGenerator,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { PrefetchUnit } from '../world/prefetch';
import type {
  RoomAssetService,
  RoomId,
  RoomLedger,
  RoomManifest,
  RoomObject,
  RoomPayload,
  RowByteSink,
} from '../world/registry';

export interface Loaders extends RoomAssetService {
  /** §4.6: stage exactly one prefetch unit — bytes or one lm transcode, nothing GPU-side. */
  stageUnit(unit: PrefetchUnit, manifest: RoomManifest): Promise<void>;
  /** R23-ux: bind the visitor-facing per-row progress sink for ONE serialized hold chain
   * (the host sets it around `module.load` and clears it after; the never-while-pending
   * law keeps idle staging out of the binding — the holds are serialized, the r16
   * rebinding precedent). */
  setLoadSink(sink: RowByteSink | null): void;
  dispose(): void;
}

type RoomCache = {
  glb: ArrayBuffer | null;
  ktx2: Map<string, ArrayBuffer>;
  decoded: Map<string, RoomObject>;
};

const materialsOf = (object: Object3D): Material[] => {
  const mesh = object as Mesh;
  if (mesh.isMesh !== true) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
};
const texturesOf = (material: Material): Texture[] =>
  Object.values(material as unknown as Record<string, unknown>).filter(
    (v): v is Texture => typeof v === 'object' && v !== null && (v as Texture).isTexture === true,
  );

/** §4.3: the honest GPU size — compressed textures carry their mip chain in image.data;
 * uncompressed textures estimate width × height × 4 B × 1.33 (the mip chain). */
const vramBytes = (texture: Texture): number => {
  const image = texture.image as
    | { width?: number; height?: number; data?: { byteLength?: number } }
    | undefined;
  const data = image?.data;
  if (data && typeof data.byteLength === 'number') return data.byteLength;
  if (image?.width === undefined || image?.height === undefined) return 0;
  return Math.ceil(image.width * image.height * 4 * (4 / 3));
};

export function createLoaders(
  renderer: WebGLRenderer,
  ledger: RoomLedger,
  fetchImpl: typeof fetch = fetch,
): Loaders {
  MeshoptDecoder.useWorkers(1);
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .setWorkerLimit(1)
    .detectSupport(renderer);
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  const blobsByRoot = new WeakMap<Object3D, string[]>();
  const envByRoom = new Map<string, WebGLRenderTarget>(); // §5/ADR-0013: one bake per mount
  const pmrem = new PMREMGenerator(renderer);
  // §4.6: the per-session cache — keyed by room id, never evicted (≈ 10 MB declared, off-ledger).
  const cache = new Map<string, RoomCache>();
  const cacheOf = (roomId: string): RoomCache => {
    const existing = cache.get(roomId);
    if (existing !== undefined) return existing;
    const fresh: RoomCache = { glb: null, ktx2: new Map(), decoded: new Map() };
    cache.set(roomId, fresh);
    return fresh;
  };
  const parseGlb = (data: ArrayBuffer, path: string): Promise<GLTF> =>
    new Promise((resolve, reject) => gltf.parse(data, path, resolve, reject));
  /** R23-ux: the module-level sink binding — cleared between chains (setLoadSink). */
  let progressSink: RowByteSink | null = null;
  /**
   * The row reader: per-chunk progress through response.body's stream (ProgressEvent-free —
   * the CDN may br-encode, so `loaded` counts DECODED bytes, which is what the manifest's
   * row size compares against), falling back to one resolve-time count when a body stream
   * is unavailable (tests, opaque environments). The byte-count law is unchanged: a row
   * whose total fails to match the manifest size still throws. The sink is whoever asked
   * for this fetch — a direct caller's param, the host's bound load sink, or nobody
   * (stageUnit passes null explicitly: prefetch is never a visitor wait).
   */
  const fetchRow = (
    roomId: string,
    row: Readonly<{ path: string; bytes: number }>,
    signal: AbortSignal | undefined,
    sink: RowByteSink | null,
  ): Promise<ArrayBuffer> => {
    const res =
      signal === undefined
        ? fetchImpl(`/assets/${roomId}/${row.path}`)
        : fetchImpl(`/assets/${roomId}/${row.path}`, { signal });
    return res.then(async (response) => {
      if (!response.ok) throw new Error(`fetchRoom: ${response.status} for ${row.path}`);
      const body = (response as Response).body;
      if (!body || sink === null) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== row.bytes) throw new Error(`fetchRoom: size mismatch ${row.path}`);
        if (sink !== null) sink(row.path, bytes.byteLength);
        return bytes;
      }
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        if (next.value !== undefined && next.value !== null) {
          chunks.push(next.value);
          total += next.value.byteLength;
          sink(row.path, total);
        }
      }
      if (total !== row.bytes) throw new Error(`fetchRoom: size mismatch ${row.path}`);
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return bytes.buffer;
    });
  };
  /** A cached row counts only when its size still matches the manifest — a mismatch re-fetches. */
  const cachedRow = (
    entry: RoomCache,
    row: Readonly<{ path: string; bytes: number; kind: 'glb' | 'ktx2' }>,
  ): ArrayBuffer | null => {
    const hit = row.kind === 'glb' ? entry.glb : (entry.ktx2.get(row.path) ?? null);
    if (hit === null) return null;
    return hit.byteLength === row.bytes ? hit : null;
  };
  const decodeRow = (bytes: ArrayBuffer): Promise<RoomObject> =>
    new Promise<RoomObject>((resolve, reject) => {
      ktx2.parse(bytes, (texture: unknown) => resolve(texture as RoomObject), reject);
    });
  return {
    async fetchRoom(manifest, signal, onBytes) {
      // The effective sink: a direct param beats the host's bound chain sink — a caller
      // that asked for progress gets progress even while a binding happens to be stale.
      const sink = onBytes ?? progressSink;
      const entry = cacheOf(manifest.id);
      const rows = await Promise.all(
        manifest.files.map(async (row) => {
          const hit = cachedRow(entry, row);
          if (hit !== null) {
            sink?.(row.path, row.bytes); // a cache hit is all of its bytes, at once
            return [row, hit] as const;
          }
          const bytes = await fetchRow(manifest.id, row, signal, sink);
          if (row.kind === 'glb') entry.glb = bytes;
          else entry.ktx2.set(row.path, bytes);
          return [row, bytes] as const;
        }),
      );
      const glbRow = rows.find(([row]) => row.kind === 'glb');
      if (!glbRow) throw new Error(`fetchRoom: manifest ${manifest.id} has no glb row`);
      const ktx2Map = new Map<string, ArrayBuffer>();
      for (const [row, bytes] of rows) if (row.kind === 'ktx2') ktx2Map.set(row.path, bytes);
      return { glb: glbRow[1], ktx2: ktx2Map };
    },
    /** §4: decode only the lm rows — the glb's own ktx2 albedos already decoded inside parse.
     * §4.6: a staged decode is consumed exactly once (removed on return — see the header law). */
    async decodeRoomTextures(roomId, payload) {
      const entry = cacheOf(roomId);
      const out = new Map<string, RoomObject>();
      await Promise.all(
        [...payload.ktx2]
          .filter(([path]) => path.startsWith('lm/'))
          .map(async ([path, bytes]) => {
            const staged = entry.decoded.get(path);
            entry.decoded.delete(path); // consumed — never handed back twice
            if (staged !== undefined) {
              out.set(path, staged);
              return;
            }
            out.set(path, await decodeRow(bytes));
          }),
      );
      if (out.size === 0) throw new Error(`decodeRoomTextures: ${roomId} has no lm rows`);
      return out;
    },
    /**
     * R3 (design-gallery §2.4): decode ONE named non-lm row — the portrait atlas. It is
     * neither an lm row (decodeRoomTextures refuses those) nor a glb-referenced image
     * (mountParsed decodes only those). The GPU upload + the honest texture row happen
     * here, inside the hold, as mountParsed's images do; no colour-space tagging — the
     * binder owns it (§2.4's CANVAS law).
     */
    async decodeRoomTexture(roomId, payload, path) {
      if (path.startsWith('lm/')) {
        throw new Error(
          `decodeRoomTexture: ${roomId} ${path} is an lm row — decodeRoomTextures owns it`,
        );
      }
      const bytes = payload.ktx2.get(path);
      if (bytes === undefined) throw new Error(`decodeRoomTexture: ${roomId} has no row ${path}`);
      const texture = await new Promise<CompressedTexture>((resolve, reject) =>
        ktx2.parse(bytes, resolve, reject),
      );
      renderer.initTexture(texture); // the GPU upload inside the hold, as mountParsed's images
      ledger.register(roomId, 'texture', vramBytes(texture), path);
      return texture;
    },
    /** §4.6: one unit, bytes-or-transcode only — no ledger, no parse, no GPU, no blob URLs. */
    async stageUnit(unit: PrefetchUnit, manifest: RoomManifest): Promise<void> {
      if (unit.roomId !== manifest.id)
        throw new Error(`stageUnit: ${unit.roomId} does not match manifest ${manifest.id}`);
      const entry = cacheOf(unit.roomId);
      if (unit.kind === 'decode') {
        if (!unit.path.startsWith('lm/'))
          throw new Error(`stageUnit: ${unit.path} is not an lm row`);
        if (entry.decoded.has(unit.path)) return;
        const bytes = entry.ktx2.get(unit.path);
        if (bytes === undefined)
          throw new Error(`stageUnit: decode of ${unit.path} has no cached bytes`);
        entry.decoded.set(unit.path, await decodeRow(bytes));
        return;
      }
      const row =
        unit.kind === 'glb'
          ? manifest.files.find((candidate) => candidate.kind === 'glb')
          : manifest.files.find((candidate) => candidate.path === unit.path);
      if (row === undefined) throw new Error(`stageUnit: ${unit.roomId} has no row for this unit`);
      if (cachedRow(entry, row) !== null) return;
      const bytes = await fetchRow(unit.roomId, row, undefined, null); // prefetch is never a visitor wait
      if (row.kind === 'glb') entry.glb = bytes;
      else entry.ktx2.set(row.path, bytes);
    },
    async mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject> {
      const blobUrls = new Map<string, string>();
      for (const [key, bytes] of payload.ktx2) {
        blobUrls.set(key, URL.createObjectURL(new Blob([bytes])));
      }
      const manager = new LoadingManager();
      manager.setURLModifier((url) => {
        for (const [key, blob] of blobUrls) {
          if (url === key || url.endsWith(`/${key}`)) return blob;
        }
        return url;
      });
      // Holds are serialized, so rebinding the shared loaders' manager per call is race-free.
      // KTX2 bytes are fetched by KTX2Loader's own FileLoader, which consults the KTX2Loader's
      // manager — both are rebound, not just GLTFLoader's.
      gltf.manager = manager;
      ktx2.manager = manager;
      const parsed = await parseGlb(payload.glb, `/assets/${roomId}/`);
      const root = parsed.scene;
      // §8.3 layer 1: every decoded asset registers its honest GPU size — textures from the
      // transcoded mip data, geometries from their attribute + index arrays.
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh === true) {
          let geometryBytes = 0;
          for (const attribute of Object.values(mesh.geometry.attributes)) {
            const array = attribute as { array: { byteLength: number } };
            geometryBytes += array.array.byteLength;
          }
          const index = mesh.geometry.index as { array: { byteLength: number } } | null;
          if (index !== null) geometryBytes += index.array.byteLength;
          ledger.register(roomId, 'geometry', geometryBytes, `geo/${mesh.uuid}`);
        }
        for (const material of materialsOf(obj)) {
          for (const texture of texturesOf(material)) {
            renderer.initTexture(texture);
            ledger.register(roomId, 'texture', vramBytes(texture), `tex/${texture.uuid}`);
          }
        }
      });
      blobsByRoot.set(root, [...blobUrls.values()]);
      return root;
    },
    /** §5/ADR-0013: decode the dusk probe, bake PMREM once — inside the hold, never per frame. */
    async mountEnvironment(roomId, payload) {
      const probe = [...payload.ktx2].find(([path]) => path.startsWith('probe/'));
      if (probe === undefined) throw new Error(`mountEnvironment: ${roomId} has no probe row`);
      const source = await new Promise<Texture>((resolve, reject) =>
        ktx2.parse(probe[1], resolve, reject),
      );
      const rt = pmrem.fromEquirectangular(source);
      source.dispose(); // baked into the RT; the equirect is never sampled again
      envByRoom.set(roomId, rt);
      const image = rt.texture.image as { width: number; height: number };
      ledger.register(roomId, 'renderTarget', image.width * image.height * 8, 'pmrem-probe');
      return rt.texture;
    },
    disposeEnvironment(roomId) {
      envByRoom.get(roomId)?.dispose();
      envByRoom.delete(roomId);
    },
    disposeParsed(object) {
      const root = object as Object3D;
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh === true) mesh.geometry.dispose();
        for (const material of materialsOf(obj)) {
          for (const texture of texturesOf(material)) texture.dispose();
          material.dispose();
        }
      });
      for (const url of blobsByRoot.get(root) ?? []) URL.revokeObjectURL(url);
      blobsByRoot.delete(root);
    },
    /** R23-ux: the module-level sink binding, cleared between chains (see setLoadSink). */
    setLoadSink(sink) {
      progressSink = sink;
    },
    dispose() {
      pmrem.dispose();
      ktx2.dispose();
      cache.clear(); // the session ends with the loaders — the only legal clear
    },
  };
}
