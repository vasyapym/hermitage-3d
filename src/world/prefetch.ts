// src/world/prefetch.ts
/**
 * Pure prefetch scheduler — docs/design-walkthrough-ux.md §4.6 (arrival-settle prefetch of every
 * non-resident neighbour, staggered one row per idle frame: the 2-core stutter guard) + §12 R-UX1.
 *
 * Laws: exactly one unit per planPrefetch call; per room the order is glb → the ktx2 rows in
 * manifest order → the decodes (lm/* rows) in manifest order; rooms are visited in the
 * neighbours' order; busy yields nothing; a neighbour with to: null is skipped; the square is a
 * resident and is never planned; the state never shrinks (no eviction in-session); malformed
 * input fails loud. This module is three-free, DOM-free and side-effect-free: it decides, the
 * host performs. The manifest and the lazy chunk resolve outside this module (the manifest
 * fetcher and the browser module cache already memoise them per session).
 */
import type { NodeHandle, RoomFileRow, RoomId, RoomNeighbor } from './registry';

export type PrefetchUnit =
  | Readonly<{ kind: 'glb'; roomId: RoomId }>
  | Readonly<{ kind: 'ktx2'; roomId: RoomId; path: string }>
  | Readonly<{ kind: 'decode'; roomId: RoomId; path: string }>;

export type Stage = 'pending' | 'fetched';
export type DecodeStage = 'pending' | 'decoded';

export type RoomStage = Readonly<{
  manifest: boolean;
  /** The single kind: 'glb' row's path — keyed on the manifest's kind, not an extension. */
  glbPath: string;
  glb: Stage;
  /** The ktx2 rows in manifest order. */
  files: ReadonlyMap<string, Stage>;
  /** The lm/* rows in manifest order; the probe row is mountEnvironment's, never staged. */
  decodes: ReadonlyMap<string, DecodeStage>;
}>;

export type PrefetchState = Readonly<{ rooms: ReadonlyMap<RoomId, RoomStage> }>;

const ROOM_IDS = [
  'rastrelli-gallery',
  'jordan',
  'military-gallery',
  'st-george',
] as const satisfies readonly RoomId[];

const isRoomId = (handle: NodeHandle): handle is RoomId =>
  (ROOM_IDS as readonly NodeHandle[]).includes(handle);

const isLightmapRow = (path: string): boolean => path.startsWith('lm/');

export const emptyPrefetchState: PrefetchState = { rooms: new Map() };

/** The host reports a fetched manifest's file rows; the room's stage grows to hold them. A room
 * may be noted exactly once (a duplicate note is a host bug, not a resumable state). */
export function noteManifest(
  state: PrefetchState,
  roomId: RoomId,
  rows: readonly RoomFileRow[],
): PrefetchState {
  if (!isRoomId(roomId)) throw new Error(`noteManifest: unknown roomId ${String(roomId)}`);
  const existing = state.rooms.get(roomId);
  if (existing?.manifest === true) throw new Error(`noteManifest: duplicate note for ${roomId}`);
  if (rows.length === 0) throw new Error(`noteManifest: ${roomId} has no rows`);
  let glbPath: string | null = null;
  const files = new Map<string, Stage>();
  const decodes = new Map<string, DecodeStage>();
  for (const row of rows) {
    if (typeof row.path !== 'string' || row.path.length === 0)
      throw new Error(`noteManifest: ${roomId} has a malformed row path`);
    if (row.kind === 'glb') {
      if (glbPath !== null) throw new Error(`noteManifest: ${roomId} has two glb rows`);
      glbPath = row.path;
    } else {
      if (files.has(row.path)) throw new Error(`noteManifest: ${roomId} repeats row ${row.path}`);
      files.set(row.path, 'pending');
      if (isLightmapRow(row.path)) decodes.set(row.path, 'pending');
    }
  }
  if (glbPath === null) throw new Error(`noteManifest: ${roomId} has no glb row`);
  const rooms = new Map(state.rooms);
  rooms.set(roomId, { manifest: true, glbPath, glb: 'pending', files, decodes });
  return { rooms };
}

const withGlb = (stage: RoomStage): RoomStage => ({ ...stage, glb: 'fetched' });
const withFile = (stage: RoomStage, path: string): RoomStage => {
  const files = new Map(stage.files);
  files.set(path, 'fetched');
  return { ...stage, files };
};
const withDecode = (stage: RoomStage, path: string): RoomStage => {
  const decodes = new Map(stage.decodes);
  decodes.set(path, 'decoded');
  return { ...stage, decodes };
};

const commit = (state: PrefetchState, roomId: RoomId, stage: RoomStage): PrefetchState => {
  const rooms = new Map(state.rooms);
  rooms.set(roomId, stage);
  return { rooms };
};

/** The next unit for one room, or null when the room is fully staged. */
const nextForRoom = (stage: RoomStage, roomId: RoomId): PrefetchUnit | null => {
  if (stage.glb === 'pending') return { kind: 'glb', roomId };
  for (const [path, status] of stage.files) {
    if (status === 'pending') return { kind: 'ktx2', roomId, path };
  }
  for (const [path, status] of stage.decodes) {
    if (status === 'pending') return { kind: 'decode', roomId, path };
  }
  return null;
};

export function planPrefetch(
  state: PrefetchState,
  input: Readonly<{ settled: NodeHandle; neighbors: readonly RoomNeighbor[]; busy: boolean }>,
): Readonly<{ state: PrefetchState; unit: PrefetchUnit | null }> {
  if (typeof input.busy !== 'boolean') throw new Error('planPrefetch: busy must be a boolean');
  if (input.busy) return { state, unit: null };
  for (const neighbor of input.neighbors) {
    const to = neighbor.to;
    if (to === null) continue; // a dead end has no room to prefetch
    if (!isRoomId(to)) continue; // the square is a resident — never prefetched
    if (to === input.settled) continue; // the settled room is already mounted
    const stage = state.rooms.get(to);
    if (stage === undefined || !stage.manifest) continue; // the host notes the manifest first
    const unit = nextForRoom(stage, to);
    if (unit === null) continue;
    const grown =
      unit.kind === 'glb'
        ? withGlb(stage)
        : unit.kind === 'ktx2'
          ? withFile(stage, unit.path)
          : withDecode(stage, unit.path);
    return { state: commit(state, to, grown), unit };
  }
  return { state, unit: null };
}
