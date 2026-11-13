// src/world/threshold-beat.ts
/**
 * Threshold beat law — docs/design-walkthrough-ux.md §4 + §4.1 + §12 R-UX1, DEC-017.
 *
 * Pure functions of plain data: the host hands in poses, the rail's end tangent (unit), portal
 * bounds, exposures and a 0..1 progress (clamped here; a frame may overshoot).
 * Laws: depart travels the DOOR HEADING (§4.1a) — the end tangent with world-up removed and
 * renormalised (`levelHeading`); a stair's end tangent inherits the stair's slope, the visitor's
 * eye does not, so the eye keeps the door stop's height and the standoff is measured from the
 * doorway's own vertical plane (through the portal centre, normal to the heading) — covering at
 * most DEPART_TRAVEL_MAX_M (the design's «last few metres») and, when the stop is close, halting
 * DEPART_STANDOFF_M short of that plane, never on it. The gaze (§4.1b): a door stop facing its
 * door glides to the portal centre; a stop whose committed gaze faces away from its door backs
 * out as a locked dolly — target = the stop's subject at every progress. A heading already level
 * passes through `levelHeading` untouched (the SAME reference): the flat rails' departs are
 * bit-identical. Arrive starts a few metres back from the entry stop toward the destination
 * portal centre (at most ARRIVE_TRAVEL_MAX_M, clamped at the portal centre — never past the
 * doorway) and glides into the stop, gaze held on the stop's subject; an arrive never reads the
 * tangent. Depart at progress 0 and arrive at progress 1 RETURN the handed-in pose so the
 * hand-over frames are bit-identical. Exposure: depart from → 0, card exactly 0, arrive 0 → to,
 * all over smootherstep(progress). Malformed input throws.
 */
import { clamp01, mixScalar, smootherstep } from '../sky/easing';
import type { Bounds, Vec3 } from './registry';

export type BeatPhase = 'depart' | 'card' | 'arrive';
export type BeatPose = Readonly<{ position: Vec3; target: Vec3 }>;
/** Depart halts this far short of the portal plane when the stop is close: depth reads, never cut. */
export const DEPART_STANDOFF_M = 1.5;
/** Depart's travel cap — the design's «last few metres», a brisk stride over the ~700 ms beat. */
export const DEPART_TRAVEL_MAX_M = 2.5;
/** Arrive's travel cap — «a few metres back toward the destination portal», the same stride. */
export const ARRIVE_TRAVEL_MAX_M = 2.5;
/** Unit-tangent tolerance — the host derives the tangent in floating point. */
export const UNIT_EPSILON = 1e-6;
/**
 * Level-heading fence (§4.1a): an end tangent whose |t_y| is at or under this is LEVEL — a
 * spline-end or float residual, never a stair (a stair's slope reaches |t_y| ≈ 0.38). A level
 * tangent returns by the SAME reference, so every flat-rail depart keeps its bit-identical
 * arithmetic; a steeper one is flattened to the door heading. The exact eye-height guarantee
 * (end[1] === stop.position[1]) holds for a FLATTENED heading and for an exactly horizontal
 * one; a fenced near-level tangent keeps its own residual slope, so its depart drifts the eye
 * by at most LEVEL_EPSILON × DEPART_TRAVEL_MAX_M ≈ 2.5 cm (the committed rails' residuals are
 * ~1e-4 — ≈0.3 mm at the cap). Documented, intentional (the review finding, 2026-11-13).
 */
export const LEVEL_EPSILON = 1e-2;
/** The door heading: the end tangent with world-up removed and renormalised (§4.1a). */
export function levelHeading(t: Vec3): Vec3 {
  if (Math.abs(t[1]) <= LEVEL_EPSILON) return t; // the SAME reference: nothing recomputed
  const n = Math.hypot(t[0], t[2]);
  if (n <= UNIT_EPSILON) {
    throw new RangeError(
      'threshold-beat: a door stop needs a level heading — the end tangent is vertical',
    );
  }
  return [t[0] / n, 0, t[2] / n];
}
const assertFinite = (name: string, v: number): void => {
  if (!Number.isFinite(v)) throw new RangeError(`threshold-beat: ${name} must be finite, got ${v}`);
};
const assertVec3 = (name: string, v: Vec3): void => {
  assertFinite(`${name}[0]`, v[0]);
  assertFinite(`${name}[1]`, v[1]);
  assertFinite(`${name}[2]`, v[2]);
};
const assertPose = (name: string, p: BeatPose): void => {
  assertVec3(`${name}.position`, p.position);
  assertVec3(`${name}.target`, p.target);
};
const assertBounds = (name: string, b: Bounds): void => {
  assertVec3(`${name}.min`, b.min);
  assertVec3(`${name}.max`, b.max);
};
const centre = (b: Bounds): Vec3 => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3): number => Math.sqrt(dot(a, a));
const mixVec = (a: Vec3, b: Vec3, k: number): Vec3 => [
  mixScalar(a[0], b[0], k),
  mixScalar(a[1], b[1], k),
  mixScalar(a[2], b[2], k),
];
export function departPose(
  input: Readonly<{ stop: BeatPose; tangent: Vec3; portal: Bounds; progress: number }>,
): BeatPose {
  const { stop, tangent, portal, progress } = input;
  assertPose('stop', stop);
  assertVec3('tangent', tangent);
  assertBounds('portal', portal);
  assertFinite('progress', progress);
  if (Math.abs(length(tangent) - 1) > UNIT_EPSILON) {
    throw new RangeError('threshold-beat: tangent must be unit length');
  }
  // §4.1a: the beat travels the door heading. The host's contract is unchanged — the unit
  // check above still reads the RAW tangent — and a malformed heading throws at every
  // progress (before the k <= 0 hand-over return).
  const h = levelHeading(tangent);
  const k = smootherstep(clamp01(progress));
  if (k <= 0) return { position: stop.position, target: stop.target };
  const c = centre(portal);
  // §4.1b, per door stop, from the data it already holds: a committed gaze in the heading's
  // rear hemisphere faces AWAY from the door (h has no y, so the gaze's pitch is ignored).
  // Facing the door: the gaze glides to the portal centre, point-lerp as today —
  // bit-identical. Facing away: target = stop.target at every progress — a locked dolly in
  // the rail's own sense (the subject stays centred while the eye travels; «back out of the
  // scene», the arrival played backward).
  const facingAway = dot(sub(stop.target, stop.position), h) < 0;
  // Signed distance from the stop to the DOORWAY'S OWN VERTICAL PLANE — through the portal
  // centre, normal to the heading. The glide covers at most DEPART_TRAVEL_MAX_M and, close
  // in, halts DEPART_STANDOFF_M short of the plane — the travel clamps at zero (a stop
  // already inside the standoff does not move). The eye keeps the door stop's height:
  // h[1] = 0 ⇒ end[1] === stop.position[1] from the first frame through the card.
  const toPlane = dot(sub(c, stop.position), h);
  const travel = Math.min(DEPART_TRAVEL_MAX_M, Math.max(0, toPlane - DEPART_STANDOFF_M));
  const end = add(stop.position, scale(h, travel));
  return {
    position: mixVec(stop.position, end, k),
    target: facingAway ? stop.target : mixVec(stop.target, c, k),
  };
}
export function arrivePose(
  input: Readonly<{ portal: Bounds; stop: BeatPose; progress: number }>,
): BeatPose {
  const { portal, stop, progress } = input;
  assertBounds('portal', portal);
  assertPose('stop', stop);
  assertFinite('progress', progress);
  const k = smootherstep(clamp01(progress));
  if (k >= 1) return { position: stop.position, target: stop.target };
  const c = centre(portal);
  const toPortal = sub(c, stop.position);
  const d = length(toPortal);
  // The start sits a few metres back from the entry stop toward the destination portal
  // (§4 «starts a few metres back toward the destination portal, inside its doorway»), at most
  // ARRIVE_TRAVEL_MAX_M and clamped at the portal centre — the glide never starts past the
  // doorway; a stop already at the portal centre holds (the vestibule-door entry today).
  const travel = Math.min(d, ARRIVE_TRAVEL_MAX_M);
  const start = d <= UNIT_EPSILON ? stop.position : add(stop.position, scale(toPortal, travel / d));
  return { position: mixVec(start, stop.position, k), target: stop.target };
}
export function beatExposure(
  input: Readonly<{ phase: BeatPhase; progress: number; fromExposure: number; toExposure: number }>,
): number {
  const { phase, progress, fromExposure, toExposure } = input;
  assertFinite('progress', progress);
  assertFinite('fromExposure', fromExposure);
  assertFinite('toExposure', toExposure);
  if (fromExposure < 0 || toExposure < 0) {
    throw new RangeError('threshold-beat: exposures must be ≥ 0');
  }
  if (phase === 'card') return 0;
  const k = smootherstep(clamp01(progress));
  return phase === 'depart' ? mixScalar(fromExposure, 0, k) : mixScalar(0, toExposure, k);
}
