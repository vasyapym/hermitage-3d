// src/camera/door-lean.ts
/**
 * The door lean — docs/design-walkthrough-ux.md §2 (feedback), §4.1 (the departure
 * glide it hands into), §9, §12 R-UX2. AMENDED by the movement-ux ruling: the lean
 * feeds on PRESS EDGES. Every boundary press (the arrows, the pair, the prompt's click)
 * stamps the host's pulse clock; the target is ONE declared magnitude (LEAN_MAX_M) while
 * the last stamp is younger than LEAN_FRESH_MS. The wheel's budget and EDGE_BUDGET_PX
 * feed retired with the wheel (no sustained scroll exists anymore). The camera dollies
 * toward the portal along the rail's end tangent by the full lean — a small fraction of
 * a metre, a body leaning into a door. Position and target move together, so the frame
 * translates and never pivots. The pose follows its target as a first-order spring: a
 * quick rise (LEAN_RISE_MS) answers the press inside the frame it lands; a slower
 * release (LEAN_RELEASE_MS) means a reset pulse — a release, a step away from the end,
 * or the pulse going stale — springs back rather than snaps. The freshness read is the
 * lean's OWN (the host stamps its clock; this module reads the age). Reduced motion:
 * the target is 0 whatever the pulse; the enter still fires.
 * Handover (§4.1): on the frame a transit begins, the host locks the depart's door pose as
 * leanPose(railPose, tangent, metres) and resets the lean; departPose then measures its plane
 * distance from the leaned pose, so the glide starts where the lean left the camera.
 * Pure: no three, no DOM, no clock; the host hands in deltaMs. Malformed input throws.
 */
import type { Vec3 } from '../world/registry';
import type { BeatPose } from '../world/threshold-beat';
/** The one declared pulse magnitude — felt, never a step. */
export const LEAN_MAX_M = 0.35;
/** Rise time constant: the roll is answered within a few frames. */
export const LEAN_RISE_MS = 90;
/** Release time constant: the spring-back of a reset pulse. */
export const LEAN_RELEASE_MS = 260;
/** The target lives this long past the last boundary press edge (the host's read). ms. */
export const LEAN_FRESH_MS = 220;
/** Inside this distance the lean snaps onto its target (exact zero at rest). */
export const LEAN_EPS_M = 1e-4;
/** Unit-tangent tolerance — the host derives the tangent in floating point. */
export const LEAN_UNIT_EPSILON = 1e-6;
export type LeanState = Readonly<{ metres: number }>;
export const LEAN_START: LeanState = { metres: 0 };
export type LeanInput = Readonly<{
  /** True while the last boundary press edge is younger than LEAN_FRESH_MS (the host's read). */
  pulse: boolean;
  deltaMs: number;
  reducedMotion: boolean;
}>;
/** The lean's target: the full pulse while the press edge is fresh; nothing otherwise. */
export function leanTarget(pulse: boolean, reducedMotion: boolean): number {
  return reducedMotion || !pulse ? 0 : LEAN_MAX_M;
}
export function advanceLean(state: LeanState, input: LeanInput): LeanState {
  if (!Number.isFinite(input.deltaMs) || input.deltaMs < 0) {
    throw new RangeError(`door-lean: deltaMs must be finite and ≥ 0, got ${input.deltaMs}`);
  }
  const target = leanTarget(input.pulse, input.reducedMotion);
  if (input.reducedMotion) return state.metres === 0 ? state : LEAN_START;
  const gap = target - state.metres;
  if (gap === 0) return state;
  if (Math.abs(gap) <= LEAN_EPS_M) return { metres: target };
  const tau = gap > 0 ? LEAN_RISE_MS : LEAN_RELEASE_MS;
  const metres = target - gap * Math.exp(-input.deltaMs / tau);
  return Math.abs(target - metres) <= LEAN_EPS_M ? { metres: target } : { metres };
}
/** The leaned pose: a dolly of `metres` along the unit `tangent` into the door. */
export function leanPose(pose: BeatPose, tangent: Vec3, metres: number): BeatPose {
  if (!Number.isFinite(metres) || metres < 0) {
    throw new RangeError(`door-lean: metres must be finite and ≥ 0, got ${metres}`);
  }
  if (metres === 0) return pose;
  const len = Math.hypot(tangent[0], tangent[1], tangent[2]);
  if (!Number.isFinite(len) || Math.abs(len - 1) > LEAN_UNIT_EPSILON) {
    throw new RangeError('door-lean: tangent must be unit length');
  }
  const d: Vec3 = [tangent[0] * metres, tangent[1] * metres, tangent[2] * metres];
  return {
    position: [pose.position[0] + d[0], pose.position[1] + d[1], pose.position[2] + d[2]],
    target: [pose.target[0] + d[0], pose.target[1] + d[1], pose.target[2] + d[2]],
  };
}
