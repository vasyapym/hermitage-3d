// src/world/registry.ts
/**
 * Room registry core — docs/design-staircase.md §1.1 (graph), §2.4 (airlock seams),
 * §8.1 (room module), §8.2 (asset service; mountParsed is hold-only).
 *
 * Pure by the house standard: no three, no DOM, no node, no clock, no randomness.
 * Laws: the phase-2 graph is a linear chain; `square` is a resident node (no manifest,
 * never unloaded); an airlock is an edge, never a destination; `to: null` is the landing
 * dead end and implies `portalTo: null`; the route key is the hash path before the first '?'.
 * Round-16a adjudication: a room entry carries its contract statically — contracts are tiny
 * data and the module stays behind the thunk — so the list is the single source of truth
 * (DEC-013) and the whole graph fences at boot.
 * R-UX5 (design-walkthrough-ux §7/§8, D6): Stop carries the required subject: Vec3 | null —
 * the authored world-space gaze; 'bad-subject' fences a non-finite subject or one coincident
 * with its stop's eye.
 */
import type { RoomLedger } from '../engine/ledger';
import type { CaptionKey, Key } from '../i18n/keys';

export type { RoomLedger } from '../engine/ledger';
export type RoomId = 'rastrelli-gallery' | 'jordan' | 'military-gallery';
export type NodeHandle = RoomId | 'square';
// 'index-square-cut' is the host-owned square jump's cut (design-gallery §6.4): the square
// is resident and no committed edge enters it, so the host constructs that def at the call
// site — it is never an AIRLOCKS entry (the graph stays the linear chain).
export type AirlockId = 'arch-portal' | 'gallery-airlock' | 'landing-airlock' | 'index-square-cut';
export type RouteKey = '/gallery' | '/jordan' | '/1812';
export type Vec3 = readonly [number, number, number];
export type Bounds = Readonly<{ min: Vec3; max: Vec3 }>;
export type StateId = 'day' | 'dusk' | 'nightChandeliers';
/** The three baked states (§4). The manifest intensity record and the look gain key on it. */
export type LightState = StateId;
/** Per-state encoding white point = per-state runtime restore scalar (one field, r17c). */
export type LightmapIntensity = Readonly<Record<LightState, number>>;
export type Stop = Readonly<{
  id: string;
  position: Vec3;
  /**
   * §7/§8 committed target (R-UX5). Non-null: the eye looks at this world point, and between
   * two subject-bearing stops the target point interpolates in world space (equal subjects
   * lock). Null: the pose law — the next stop's position; the last stop looks back.
   */
  subject: Vec3 | null;
  look: Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>;
  /** The caption's i18n key; the host resolves it to text at the dictionary boundary. */
  caption: CaptionKey;
  /**
   * R18-ux D3 (verdict-2 consequence): a corner flag splits the position spline into runs at
   * this stop, so the knot inherits no tangent from across the turn. Absent or false: the rail
   * is one run and samples bit-identically to before.
   */
  corner?: boolean;
  /**
   * R18-ux D3 (verdict-2 consequence): an optional look target held by a FORWARD glide INTO
   * this stop, lying on its committed gaze ray (Gj's passage mouth). Back glides into it and
   * its own committed pose keep the subject.
   */
  approach?: Vec3;
}>;
export type Rail = Readonly<{ stops: readonly Stop[] }>;
export type AirlockTransit = 'doorway' | 'cut';
export type AirlockDef = Readonly<{
  id: AirlockId;
  from: NodeHandle;
  to: NodeHandle | null;
  portalFrom: Bounds;
  portalTo: Bounds | null;
  transit: AirlockTransit;
  holdMs: number;
}>;
export type RoomNeighbor = Readonly<{ to: NodeHandle | null; airlock: AirlockId }>;
export type RoomBudget = Readonly<{
  trianglesMax: number;
  drawsMax: number;
  textureBytesMax: number;
  payloadBytesMax: number;
}>;
export type RoomLighting = Readonly<{
  states: readonly StateId[];
  blend: 'lightmapBlend' | 'preBlendRT';
}>;
export type RoomFileRow = Readonly<{
  path: string;
  bytes: number;
  sha256: string;
  kind: 'glb' | 'ktx2';
}>;
export type RoomManifest = Readonly<{
  id: string;
  files: readonly RoomFileRow[];
  lightmaps: Readonly<{
    states: readonly string[];
    res: number | null;
    /** All three entries required, finite, > 0 when the record exists (manifests.ts checks). */
    intensity: LightmapIntensity | null;
  }>;
  budget: RoomBudget;
  toolchain: Readonly<Record<string, string>>;
}>;
export type RoomContract = Readonly<{
  id: RoomId;
  /** The room's display title, carried as an i18n key (stored, not rendered, in phase 2). */
  title: Key;
  bounds: Bounds;
  rail: Rail;
  lighting: RoomLighting;
  neighbors: readonly RoomNeighbor[];
  budget: RoomBudget;
}>;
export type RegistryEntry =
  | Readonly<{ kind: 'resident'; id: 'square'; route: '/'; neighbors: readonly RoomNeighbor[] }>
  | Readonly<{
      kind: 'room';
      id: RoomId;
      route: RouteKey;
      contract: RoomContract;
      thunk: () => Promise<RoomModule>;
    }>;
export type RoomEntry = Extract<RegistryEntry, { kind: 'room' }>;
export type RoomPayload = Readonly<{ glb: ArrayBuffer; ktx2: ReadonlyMap<string, ArrayBuffer> }>;
export type RoomObject = unknown;
/** A decoded runtime texture (three's Texture, opaque here — the pure core never names three). */
export type RoomTexture = unknown;
/** R23-ux (design-load-line.md): per-row fetch progress — monotone cumulative byte counts
 * for the row named in the first argument, called from the loaders as chunks land. */
export type RowByteSink = (rowPath: string, loadedBytes: number) => void;
export interface RoomAssetService {
  fetchRoom(
    manifest: RoomManifest,
    signal: AbortSignal,
    onBytes?: RowByteSink,
  ): Promise<RoomPayload>;
  mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject>;
  /** §4: decode the room's lm ktx2 rows (hold-only; the caller maps paths via blend's stateOfPath). */
  decodeRoomTextures(
    roomId: RoomId,
    payload: RoomPayload,
  ): Promise<ReadonlyMap<string, RoomTexture>>;
  /**
   * R3 (design-gallery §2.4): decode ONE named non-lm row — the portrait atlas is neither an
   * lm row (decodeRoomTextures refuses those by law) nor a glb-referenced image (mountParsed
   * decodes only those). Refuses lm/ rows loudly; tags no colour space — the binder owns it.
   */
  decodeRoomTexture(roomId: RoomId, payload: RoomPayload, path: string): Promise<RoomTexture>;
  /** §5/ADR-0013: decode the dusk probe and bake PMREM once, inside the hold. Returns the env texture. */
  mountEnvironment(roomId: RoomId, payload: RoomPayload): Promise<RoomObject>;
  disposeEnvironment(roomId: RoomId): void;
  disposeParsed(object: RoomObject): void;
}
export interface RoomScene {
  add(object: RoomObject): void;
  remove(object: RoomObject): void;
  /** §5: the room's PMREM probe attaches to the host scene's environment; null clears it. */
  setEnvironment(object: RoomObject | null): void;
  /**
   * R24-ux — the ownership-checked release (docs/design-environment-handover.md): clear
   * the slot ONLY if it still holds exactly this handle (interior lifetimes overlap —
   * the destination published during the hold); returns whether the clear happened. The
   * caller owes its own resource's disposal regardless of the answer; the law lives in
   * src/assets/environment-slot.ts.
   */
  clearEnvironmentIfCurrent(object: RoomObject | null): boolean;
}
export interface RoomLoadContext {
  readonly assets: RoomAssetService;
  readonly scene: RoomScene;
  /** §8.3 layer 1: rooms register payload bytes in `load`, release in `unmount`. */
  readonly ledger: RoomLedger;
  /** §4.4 measurement switch (dev-only; the product runs 'a'). */
  readonly lmMode: LmMode;
  /** The host renderer, opaque here (B-RT's per-frame quad pass is the only consumer). */
  readonly renderer: RoomObject;
}
/** The lightmap technique — 'a' is the shipped blend; the others are the §4.4 measured alternatives. */
export type LmMode = 'a' | 'b-rt' | 'b-discrete';
export interface RoomModule {
  contract: RoomContract;
  load(ctx: RoomLoadContext, manifest: RoomManifest, signal: AbortSignal): Promise<void>;
  mount(ctx: RoomLoadContext): Promise<void>;
  unmount(ctx: RoomLoadContext): void;
}
export type RouteIssue = 'unknown-route';
export type RegistryIssue =
  | 'duplicate-route'
  | 'duplicate-id'
  | 'duplicate-airlock'
  | 'resident-count'
  | 'resident-route'
  | 'thunk-not-function'
  | 'unknown-airlock'
  | 'edge-mismatch'
  | 'endpoint-unknown'
  | 'dead-end-portal'
  | 'bad-hold'
  | 'contract-mismatch'
  | 'no-stops'
  | 'bad-look-limit'
  | 'bad-subject';
export function routeKeyOf(
  fragment: string,
): Readonly<{ route: string; issues: readonly RouteIssue[] }> {
  const bare = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const cut = bare.indexOf('?');
  const path = cut === -1 ? bare : bare.slice(0, cut);
  return { route: path === '' ? '/' : path, issues: [] };
}
export function resolveRoute(
  list: readonly RegistryEntry[],
  fragment: string,
): Readonly<{ node: NodeHandle; route: string; issues: readonly RouteIssue[] }> {
  const { route } = routeKeyOf(fragment);
  const hit = list.find((entry) => entry.route === route);
  if (hit) return { node: hit.id, route, issues: [] };
  return { node: 'square', route, issues: ['unknown-route'] };
}
/** A subject is usable when finite and not coincident with its stop's eye (a degenerate lookAt). */
function isUsableSubject(subject: Vec3, position: Vec3): boolean {
  if (!subject.every((v) => Number.isFinite(v))) return false;
  return subject[0] !== position[0] || subject[1] !== position[1] || subject[2] !== position[2];
}
export function validateRegistry(
  list: readonly RegistryEntry[],
  airlocks: readonly AirlockDef[],
): readonly RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  const ids = new Set<string>();
  const routes = new Set<string>();
  let residents = 0;
  for (const entry of list) {
    if (ids.has(entry.id)) issues.push('duplicate-id');
    ids.add(entry.id);
    if (routes.has(entry.route)) issues.push('duplicate-route');
    routes.add(entry.route);
    if (entry.kind === 'resident') {
      residents += 1;
      if (entry.route !== '/') issues.push('resident-route');
    } else {
      if (typeof entry.thunk !== 'function') issues.push('thunk-not-function');
      if (entry.contract.id !== entry.id) issues.push('contract-mismatch');
    }
  }
  if (residents !== 1) issues.push('resident-count');
  const byId = new Map<AirlockId, AirlockDef>();
  for (const def of airlocks) {
    if (byId.has(def.id)) issues.push('duplicate-airlock');
    byId.set(def.id, def);
    if (!ids.has(def.from) || (def.to !== null && !ids.has(def.to)))
      issues.push('endpoint-unknown');
    if (def.to === null && def.portalTo !== null) issues.push('dead-end-portal');
    if (!Number.isFinite(def.holdMs) || def.holdMs <= 0) issues.push('bad-hold');
  }
  const checkNeighbors = (self: NodeHandle, neighbors: readonly RoomNeighbor[]): void => {
    for (const n of neighbors) {
      const def = byId.get(n.airlock);
      if (!def) {
        issues.push('unknown-airlock');
        continue;
      }
      const forward = def.from === self && def.to === n.to;
      const backward = def.to === self && def.from === n.to;
      if (!forward && !backward) issues.push('edge-mismatch');
    }
  };
  for (const entry of list) {
    if (entry.kind === 'resident') checkNeighbors(entry.id, entry.neighbors);
    else {
      checkNeighbors(entry.id, entry.contract.neighbors);
      if (entry.contract.rail.stops.length === 0) issues.push('no-stops');
      for (const stop of entry.contract.rail.stops) {
        const limits = [stop.look.yaw, stop.look.pitchUp, stop.look.pitchDown];
        if (!limits.every((v) => Number.isFinite(v) && v >= 0)) issues.push('bad-look-limit');
        if (stop.subject !== null && !isUsableSubject(stop.subject, stop.position))
          issues.push('bad-subject');
      }
    }
  }
  return issues;
}
/** First edge on the path from→to; breadth-first over bidirectional airlock edges. */
export function nextAirlockOnPath(
  list: readonly RegistryEntry[],
  airlocks: readonly AirlockDef[],
  from: NodeHandle,
  to: NodeHandle,
): AirlockDef | null {
  if (from === to) return null;
  const nodes = new Set<string>(list.map((entry) => entry.id));
  const edges = airlocks.filter((a) => a.to !== null && nodes.has(a.from) && nodes.has(a.to));
  const firstEdge = new Map<NodeHandle, AirlockDef>();
  const seen = new Set<NodeHandle>([from]);
  const queue: NodeHandle[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const edge of edges) {
      const next = edge.from === cur ? edge.to : edge.to === cur ? edge.from : null;
      if (next === null || seen.has(next)) continue;
      seen.add(next);
      firstEdge.set(next, cur === from ? edge : (firstEdge.get(cur) ?? edge));
      if (next === to) return firstEdge.get(to) ?? null;
      queue.push(next);
    }
  }
  return null;
}
/** The airlock a cold entry (deep link, nothing mounted) arrives through: the def leading to `to`. */
export function airlockEntering(
  airlocks: readonly AirlockDef[],
  to: NodeHandle,
): AirlockDef | null {
  return airlocks.find((def) => def.to === to) ?? null;
}
