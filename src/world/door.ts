// src/world/door.ts
/**
 * The declared door-heading law — docs/design-gallery.md §2.5 (the east-wall door seat),
 * design-walkthrough-ux.md §4.1a as bent by the mg-1812-look round's DECISION-1 (the airlock's
 * declared heading leads the threshold beat when it declares one; the end tangent otherwise),
 * DEC-017. Pure: no three, no DOM, no clock; the host hands in the beat and the leaf tags.
 *
 * Laws:
 * - doorHeading: the declared vector when it is a finite non-degenerate unit-candidate (it is
 *   levelled and renormalised like threshold-beat's levelHeading), else the handed-in end
 *   tangent's own levelled form. A degenerate declared vector throws — a doorway that cannot
 *   state its heading is a data bug, never a silent fallback.
 * - doorOpen: the leaves' 0..1 open amount for one transit frame. The FROM room opens its
 *   doors over the depart (smootherstep) and holds them open through the card; the TO room
 *   holds them open through the card and closes them over the arrive. A 'cut' transit never
 *   moves a leaf (reduced motion's existing law); a foreign airlock's leaf never moves.
 *   Depart progress 0 and arrive progress 1 return exactly 0 — the hand-over frames stay
 *   closed, bit-identical with the pre-round rest state.
 * - leafYaw: hinge × open × DOOR_SWING_MAX_RAD on rotation.y; the hinge sign carries the
 *   sweep direction (both leaves of the throne-airlock sweep toward −x, into the gallery —
 *   confirmed by capture at the round's sitting).
 */
import { clamp01, smootherstep } from '../sky/easing';
import type { AirlockTransit, NodeHandle, Vec3 } from './registry';

/** The userData key the leaf meshes carry (rooms/1812/room.ts tags them at mount). */
export const DOOR_LEAF_KEY = 'doorLeaf';
/** The leaves' open pose: 85° off closed — ajar enough to read as held, short of a wall slam. */
export const DOOR_SWING_MAX_RAD = (85 * Math.PI) / 180;

/** The unit-tangent tolerance — the host derives headings in floating point. */
const UNIT_EPSILON = 1e-6;

export interface DoorLeaf {
  readonly airlock: string;
  readonly hinge: 1 | -1;
  /** The room whose tree the leaf mounts in — the host groups the tagged nodes by it
   * (the orchestrator's amendment: the leaves of two mounted rooms must never mix). */
  readonly room: NodeHandle;
}

export interface DoorBeat {
  readonly airlockId: string;
  readonly phase: 'depart' | 'card' | 'arrive' | 'exit';
  readonly transit: AirlockTransit;
  readonly from: NodeHandle | null;
  readonly to: NodeHandle | null;
  readonly progress: number;
}

/** The door heading INTO the boundary: the airlock's declared vector when it declares one,
 * levelled and renormalised; the rail's end tangent (levelled by the caller's own path)
 * otherwise. A degenerate declared vector throws. */
export function doorHeading(input: Readonly<{ declared: Vec3 | null; tangent: Vec3 }>): Vec3 {
  const { declared, tangent } = input;
  if (declared === null) return tangent;
  for (const component of declared) {
    if (!Number.isFinite(component)) {
      throw new RangeError(`door: declared heading must be finite, got ${String(component)}`);
    }
  }
  const level = [declared[0] ?? 0, 0, declared[2] ?? 0] as Vec3;
  const n = Math.hypot(level[0], level[2]);
  if (n <= UNIT_EPSILON) {
    throw new RangeError('door: a declared heading needs a level plane — the vector is vertical');
  }
  return [level[0] / n, 0, level[2] / n];
}

/** The 0..1 open amount of one leaf this transit frame; 0 whenever no beat owns the room. */
export function doorOpen(
  input: Readonly<{ beat: DoorBeat | null; leaf: DoorLeaf; room: NodeHandle }>,
): number {
  const { beat, leaf, room } = input;
  if (beat === null || beat.transit === 'cut' || leaf.airlock !== beat.airlockId) return 0;
  if (room === beat.from) {
    if (beat.phase === 'depart') return smootherstep(clamp01(beat.progress));
    return beat.phase === 'card' ? 1 : 0;
  }
  if (room === beat.to) {
    if (beat.phase === 'card') return 1;
    if (beat.phase === 'arrive') return 1 - smootherstep(clamp01(beat.progress));
    return 0;
  }
  return 0;
}

/** The leaf's rotation.y for its open amount: the hinge sign carries the sweep direction. */
export function leafYaw(input: Readonly<{ open: number; hinge: 1 | -1 }>): number {
  return input.hinge * clamp01(input.open) * DOOR_SWING_MAX_RAD;
}
