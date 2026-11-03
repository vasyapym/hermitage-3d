// rooms/jordan/room.ts
/**
 * Jordan Staircase room module — design-staircase.md §8.1. The glb's placeholder materials
 * ship committed; the lightmap blend (§4.1 technique A) patches them at mount under the
 * manifest's per-state intensity record (the r17c scalar law: white point × look gain lives
 * in the hub). Module-level state is safe: the coordinator serializes transits, so a room is
 * never mounted twice. The ledger (§8.3 layer 1) registers payload bytes in load and
 * releases the whole scope in unmount.
 */
import { applyTechnique, disposeTechnique } from '../../src/assets/blend-gl';
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
import { contract } from './contract';

let payload: RoomPayload | null = null;
let whitePoint: LightmapIntensity | null = null;
let object: RoomObject | null = null;
/** R24-ux: the environment handle THIS mount created (per-load; the slot may be replaced). */
let envHandle: RoomTexture | null = null;

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
    whitePoint = manifestIntensity(manifest);
  },
  async mount(ctx) {
    if (payload === null || whitePoint === null) {
      throw new Error(`${contract.id}: mount before load`);
    }
    if (object !== null) return; // idempotent
    object = await ctx.assets.mountParsed(contract.id, payload);
    const env = await ctx.assets.mountEnvironment(contract.id, payload);
    ctx.scene.setEnvironment(env); // §5/ADR-0013: the probe is mounted once, inside the hold
    envHandle = env; // R24-ux: the identity this mount owns (environment-slot.ts)
    applyTechnique(
      ctx.lmMode,
      contract.id,
      object,
      await stateTextures(ctx),
      whitePoint,
      ctx.renderer,
      ctx.ledger,
    );
    ctx.scene.add(object);
  },
  unmount(ctx) {
    if (object === null) return;
    disposeTechnique(contract.id);
    // R24-ux: clear the slot ONLY if it still holds this mount's handle (interior
    // lifetimes overlap during a transit — the destination published already); the
    // resource is disposed regardless, exactly this mount's own (never early-return).
    releaseOwnedEnvironment(ctx.scene, envHandle, () => ctx.assets.disposeEnvironment(contract.id));
    envHandle = null;
    ctx.scene.remove(object);
    ctx.assets.disposeParsed(object);
    ctx.ledger.release(contract.id);
    object = null;
  },
};

const manifestIntensity = (manifest: RoomManifest): LightmapIntensity => {
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

const stateTextures = async (ctx: RoomLoadContext): Promise<ReadonlyMap<StateId, unknown>> => {
  if (payload === null) throw new Error(`${contract.id}: no payload`);
  const decoded = await ctx.assets.decodeRoomTextures(contract.id, payload);
  const out = new Map<StateId, unknown>();
  for (const [path, texture] of decoded) {
    const state = stateOfPath(path);
    if (state !== null) out.set(state, texture);
  }
  if (out.size !== 3) {
    throw new Error(`${contract.id}: expected three baked states, got ${out.size}`);
  }
  return out;
};
