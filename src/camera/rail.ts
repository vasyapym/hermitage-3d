/**
 * Camera rail — pure core.
 * Implements design-staircase §6 «Cinematography — the rail», §6.1 (path, look limits, inputs,
 * reduced motion, boundary intents), the seed half of §1.2 (?stop= / ?cam= precedence) and
 * design-walkthrough-ux §8 (the movement law: authored subjects, R-UX5, D6).
 *
 * Laws:
 * - u ∈ [0, 1] spans the ACTIVE node's stop list; stop i sits at u = i / (n - 1); a single-stop
 *   node is the point u = 0. A parameter within STOP_EPS of a stop snaps to it, so stops are
 *   bit-identical to the committed data.
 * - Path: centripetal Catmull-Rom through the stop positions. The only synthesised control
 *   points are the two end phantoms (mirror of the neighbour through the end stop). The path
 *   turns only at stops: corners (the corridor junction, the mezzanine turn) and every slope
 *   break (a flight's foot or top) are knots in the stop data. R18-ux D3: a stop may flag
 *   `corner` — the stop list splits into independent RUNS there and each run is evaluated with
 *   this spline and its end rule unchanged, so a corner knot inherits no tangent from across
 *   the turn; a rail with no corner flag is one run and samples bit-identically to before.
 * - Gaze at a stop = the committed pose law: a stop with an authored SUBJECT (Stop.subject, a
 *   world-space point) looks at it; a stop without one looks at stop i + 1, the last looks back
 *   at i − 1. At t = 0 / t = 1 the target IS the committed object, so never-dragged stop poses
 *   stay bit-identical to the data (the golden fence).
 * - Gaze between stops (B9, supersedes R19-ux C's departure turn; phasing amended by B9c,
 *   2026-11-17, which supersedes B9b's lead): between two stops the base gaze travels exactly
 *   the arc between their two committed framings and nothing else — the source aim frozen at
 *   the segment's anchor (the departure stop's committed framing, or the look in force — B10),
 *   the destination aim frozen at the destination eye, yaw on the shortest arc, pitch linear,
 *   one weight: the distance fraction covered of the anchor's remaining segment, reshaped by
 *   the lag (B9c): w = smoothstep(max(0, 1 − (1 − wd) / LOOK_LAG)), LOOK_LAG 0.8 — the look
 *   HOLDS the anchor's aim across the first 1 − LOOK_LAG of the segment (the body departs
 *   under the look it left with) and plays its whole arc across the last LOOK_LAG, landing on
 *   the destination framing exactly at the stop (w = 1 at wd = 1 by construction — the
 *   fence). The look therefore trails the travel (the position starts first; the look starts
 *   at 20 % of the segment, peaks at 60 % and comes to rest with the body — never faster per
 *   unit of rail than 1.875 × the segment's own average, the smoothstep peak over the lag
 *   span) and no held point's parallax reaches the gaze. B10 rules the arc's SOURCE (where it
 *   starts — the look in force at the anchor, offset absorbed in the same frame); B9c rules
 *   its WEIGHT (when it plays); they compose, and every arrival lands on the author's frame
 *   exactly. The pass-through rate kink is closed by construction FOR THE NONLOCKED BLENDS:
 *   at every stop whose segments blend angularly the gaze-turn rate is zero on both sides (w
 *   rests at 0 across the outgoing segment's first 1 − LOOK_LAG; w arrives at 1 with zero
 *   slope on the incoming side). A locked dolly keeps its held-point parallax — the locked
 *   branch bypasses the angular blend, so a transverse eye motion still rotates the gaze
 *   direction (the gallery's corridor dollies point along their travel axis and carry none).
 *   Equal source/destination points remain a locked dolly for the whole segment (the point
 *   is held). There is no turn span, no reference widening and no near-field exemption — the
 *   former exemption's distance weight is now the rule for every segment. The law is
 *   position-only: the rotation cannot outlast the body (both rest at wd = 1); a rotation that
 *   settles AFTER the body is a clock law, deliberately not taken (B9d, docs §8).
 *   Partial intents and retargets use this same position-only law, not a separate wall clock.
 *   Reversals re-anchor at the look in force and retrace it; pass-through stops are met on
 *   their committed framings. Stops retain their exact committed targets and position objects.
 * - Departure absorbs the look (B10, the 2026-11-16 owner report; amends this bullet's anchor
 *   clause and the re-clamp sentence below): at every anchor the press path creates — a press
 *   from rest (at a stop or mid-segment) and a reversal's turnaround — the source aim freezes
 *   at the LOOK IN FORCE: the base gaze composed with the user's offset (composeAim, additive
 *   in degrees, the exact rendered direction), and the offset is ABSORBED — both look fields
 *   return to zero in the same frame, so the view does not jump. The arc then runs from where
 *   the visitor looks to the destination's committed framing, and every arrival is the
 *   author's frame exactly (the S0b monument pause lands on the pedestal whatever was
 *   dragged). A never-dragged walk is bit-identical in every sample: offset 0 ⇒ source =
 *   committed framing. Drags made while walking ride on top and are absorbed at the next
 *   anchor; pass-through stops and mid-walk presses neither anchor nor absorb. Reduced
 *   motion's cut absorbs at the same press edge: the cut lands on the destination's committed
 *   pose exactly. Within an anchor the base gaze stays a function of rail position alone; the
 *   anchor's frozen source is the one history the law carries (B9 already carried it at
 *   reversals). The realized turn is the angle between the visitor's look and the author's
 *   next frame; the head law's MAX_SWING_DEG 90 governs the DEFAULT gaze and has no
 *   absorbed-look universal bound — the census row in tests/rail-anchor.test.ts records each
 *   rail's stop-departure worst over BOTH directions of every leg (the square's 90.7° at S0's
 *   full down-left look; rooms with wider look rows reach further; turnaround anchors are a
 *   separate surface the eye probes cover).
 * - Look limits use the same distance weight from the rows in force at the segment's anchor to
 *   the destination's rows, over the whole remaining segment. Offsets are degrees: yaw > 0
 *   turns right, pitch > 0 looks up. User offsets are re-clamped on every transition — and
 *   absorbed (zeroed, their direction folded into the anchor) at every anchor the press path
 *   creates (B10); never silently reset anywhere else.
 * - Motion: a WALK — a signed motion along u at a declared cruise pace, alive while INTENT is
 *   alive, braking to the next stop in its heading when intent ends. Presses assert intent and
 *   never pick destinations (walkPress); the aggregate release ends or extends it
 *   (walkRelease). One funnel serves every source (§5: no second graph); a press edge at a
 *   settled rail end in the end's direction returns a boundary intent (the host turns it into
 *   an airlock transit); a hold never opens a door. Intent: held while an activation is down,
 *   or leaseMs > 0 (WALK_LEASE_MS refilled by every press, drained by deltaMs); a release after
 *   heldMs ≥ WALK_HOLD_MS ends intent now, a tap keeps the lease draining — taps ≤
 *   WALK_LEASE_MS apart never brake. The phase profile is closed form — speed
 *   v0 + (v1 − v0)·smoothstep(τ), position k0 + v0·t + (v1 − v0)·T·(τ³ − τ⁴/2); cruise carries
 *   v1 = v0 and never completes; a brake lands EXACTLY on its stop (T = 2r/v). advance() is
 *   pure over a finite non-negative deltaMs (RangeError otherwise) and splits the frame at its
 *   events: the lease's death, a phase completion, a brake entry (r ≤ v·WALK_BRAKE_MS/2). Rail
 *   ends and corner stops are HARD: the walk never passes them; a corner with live intent
 *   re-departs in the same frame. Every integer k crossed clears the look anchor — B9's
 *   pass-through stops are met on their committed framings. A reversal brakes to the
 *   turnaround, flips the heading THERE (the look re-anchors at the look in force at the
 *   turnaround, not at the press), then live intent departs toward the stop just left; a
 *   reversal may legally rest mid-segment when its intent dies first.
 * - Reduced motion keeps the cut law: a fresh press edge cuts to the next stop, now under a
 *   dwell (REDUCED_DWELL_MS drained by deltaMs) so repeated presses cannot storm — a press
 *   during the dwell is dropped, repeats are ignored, and a fresh edge at a settled rail end
 *   still fires the boundary (checked before the dwell).
 * - DEC-031 boundary, amended (the movement-ux ruling 2026-11-08/09): the sustained-scroll
 *   pass is RETIRED with the wheel — a room hand-over fires from a settled rail end's fresh
 *   press edge via the same boundary chain the arrows always used, or from the edge prompt
 *   (src/ui/edge-prompt.ts; the door label keys), which keeps its role and copy. The rail's
 *   ends are hard, so nothing reaches a door mid-motion.
 * - Seed precedence on node entry: ?stop= (known id) > ?cam= (finite, clamped) > entry (u = 0).
 * - r21 look response: target/current split; the sensitivity and damping laws live in look.ts
 *   (§6.1; §10 row r21). drag() accumulates the clamped TARGET, advance() eases the CURRENT
 *   every frame; settle() re-clamps both; at rest the eased look hands back the same object, so
 *   the never-dragged poses stay bit-identical.
 */

import { smoothstep } from '../sky/easing';
import type { Rail, Stop, Vec3 } from '../world/registry';
import type { LookLimits, LookOffset, PointerTypeName } from './look';
import { clampLook, dragLook, easeLook, NO_LOOK, settleLook } from './look';

export type { LookLimits, LookOffset } from './look';
export type WalkPhase = 'accel' | 'cruise' | 'brake';
/** One intent-driven motion leg: a signed walk along the rail at a declared pace. Speeds are
 * k-units per ms ALONG the heading (one stop gap = 1) — SIGNED: the walk's `heading` is
 * carried as the sign of its speeds (negative while traveling backward), so `phasePos`
 * integrates along the heading by construction. The phase profile is closed form —
 * speed v0 + (v1 − v0)·smoothstep(τ), position k0 + v0·t + (v1 − v0)·T·(τ³ − τ⁴/2) — and a
 * cruise phase carries v1 = v0 (the profile degenerates to k0 + v0·t) and never completes.
 * brakeTo lands the walk exactly on that stop index; a reversal brake carries brakeTo null
 * and reversalTo (the heading the walk resumes with at the turnaround). leaseMs/held/heldMs
 * book the intent: held while an activation is down, leaseMs > 0 during a tap's grace — all
 * drained by deltaMs inside advance() (the DOM clock lives in the host; the module is pure). */
export type Walk = Readonly<{
  heading: Heading;
  phase: WalkPhase;
  v0: number;
  v1: number;
  k0: number;
  phaseMs: number;
  phaseDurationMs: number;
  brakeTo: number | null;
  reversalTo: Heading | null;
  leaseMs: number;
  held: boolean;
  heldMs: number;
}>;
/** R18-ux verdict 2: the travel direction. A glide's heading is the direction it travels. */
export type Heading = 1 | -1;
/** The reminder of a departure turn, re-anchored at a mid-segment reversal: the look in force
 * there. `u0` (the k-units coordinate), `point` (the target it holds) and `limits` are frozen. */
export interface LookAnchor {
  u0: number;
  point: Vec3;
  limits: LookLimits;
}
export type RailState = Readonly<{
  u: number;
  walk: Walk | null;
  /** R18-ux verdict 2: the travel direction in force (1 forward, −1 backward). */
  heading: Heading;
  /** The reversal's re-anchor — the look in force at a mid-segment heading flip; null means the
   * segment's origin stop. `u0` is the stop-index coordinate k = u · (n − 1): one segment = 1. */
  anchor: LookAnchor | null;
  look: LookOffset;
  lookTarget: LookOffset;
  /** The reduced-motion cut cooldown, ms (drained by deltaMs; motion walks leave it 0). */
  dwellMs: number;
}>;
export type Boundary = 'forward' | 'backward';
export type StepResult = Readonly<{ state: RailState; boundary: Boundary | null }>;
export type Pose = Readonly<{
  position: Vec3;
  target: Vec3;
  limits: LookLimits;
  look: LookOffset;
}>;
export type SeedInput = Readonly<{ stop: string | null; cam: number | null }>;
export type SeedSource = 'stop' | 'cam' | 'entry';
export type SeedResult = Readonly<{ state: RailState; source: SeedSource }>;

/** The walk law's declared pacing (the movement-ux ruling §1.4; STEP/SCROLL glides retired):
 * one typeface of motion — presses assert intent, the pace never multiplies, and every leg
 * cruise-runs the stop gaps. */
export const WALK_CRUISE_MS = 1500; // ms per stop gap at cruise — the sustained walking pace
export const WALK_ACCEL_MS = 420; // the rest → cruise ramp; covers 0.14 gap from rest
export const WALK_BRAKE_MS = 700; // the cruise → rest ramp; an early brake uses T = 2r/v (≤ this)
export const WALK_LEASE_MS = 600; // a tap's intent grace — taps ≤ this far apart never brake
export const WALK_HOLD_MS = 300; // held duration at release that a HOLD needs (intent ends now)
export const REDUCED_DWELL_MS = 600; // the reduced-motion cut cooldown (one cut ≈ 1.7/s)
/** B9c (2026-11-17, supersedes B9b's LOOK_LEAD): the gaze plays its whole arc across the LAST
 * LOOK_LAG of the anchor's remaining segment and holds the anchor's aim before it. Bounded dial,
 * 0 < LOOK_LAG ≤ 1: 1 = smoothstep over the whole segment (no hold); the trail strengthens as it
 * falls. The end beat does not move with the dial (a position law rests with the body). */
export const LOOK_LAG = 0.8;

const STOP_EPS = 1e-9;
const KNOT_EPS = 1e-6;
const TAU = Math.PI * 2;
export type Angles = Readonly<{ yaw: number; pitch: number }>;
type Place = Readonly<{ i: number; t: number }>;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, w: number): number => a + (b - a) * w;
const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [
  lerp(a[0], b[0], w),
  lerp(a[1], b[1], w),
  lerp(a[2], b[2], w),
];
const mirror = (a: Vec3, b: Vec3): Vec3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const wrapArc = (d: number): number => {
  const r = d % TAU;
  if (r > Math.PI) return r - TAU;
  if (r <= -Math.PI) return r + TAU;
  return r;
};
/** The stop-index coordinate k of a standard rail-u: one stop = one whole k. */
const kOf = (rail: Rail, u: number): number => clamp(u, 0, 1) * (stopCount(rail) - 1);
/** Direction (not position) angles: yaw by the committed atan2(dx, −dz) convention, pitch up. */
const yawPitch = (d: Vec3): Angles => ({
  yaw: Math.atan2(d[0], -d[2]),
  pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])),
});
/** B10's composition surface: the rendered direction's angles — the base aim with the look
 * offset added. The rail's own angles are RADIANS; the look offsets are DEGREES (the
 * user-facing unit main.ts feeds through DEG2RAD), so composeAim is the unit bridge. The
 * addition keeps a zero offset exact in IEEE (x + 0 === x) — that is what keeps the golden
 * fence bit-for-bit; never compose through vectors or rotations. The signs agree across the
 * codebase: look.yaw > 0 turns right (rail's atan2(dx, −dz) yaw and main.ts's −look.yaw
 * world-up rotation), pitch > 0 looks up (the host's rotateOnAxis(right, +pitch)). Pinned
 * against the host's raw rotations in tests/rail-anchor.test.ts. */
export const composeAim = (base: Angles, look: LookOffset): Angles => ({
  yaw: base.yaw + (look.yaw * Math.PI) / 180,
  pitch: base.pitch + (look.pitch * Math.PI) / 180,
});
const lerpLimits = (a: LookLimits, b: LookLimits, w: number): LookLimits => ({
  yaw: lerp(a.yaw, b.yaw, w),
  pitchUp: lerp(a.pitchUp, b.pitchUp, w),
  pitchDown: lerp(a.pitchDown, b.pitchDown, w),
});

type Run = Readonly<{ first: number; last: number }>;
/** R18-ux D3: the stop list split after each corner stop; one run when no flag is set. The
 * corner stop stays the first of the run that follows it, so the position is C0 at the turn. */
const splineRuns = (rail: Rail): readonly Run[] => {
  const n = stopCount(rail);
  const runs: Run[] = [];
  let first = 0;
  for (let i = 1; i < n - 1; i++) {
    if (stopAt(rail, i).corner === true) {
      runs.push({ first, last: i });
      first = i;
    }
  }
  runs.push({ first, last: n - 1 });
  return runs;
};
/** The run that owns the segment `segment` (its stop pair first..first+1 lies inside the run). */
const runContaining = (rail: Rail, segment: number): Run => {
  const runs = splineRuns(rail);
  const chosen = runs[0];
  if (chosen === undefined) throw new RangeError('rail has no runs');
  for (const r of runs) {
    if (r.first <= segment && segment < r.last) return r;
  }
  return chosen;
};
/** The spline's control point for the GLOBAL stop index, evaluated with the run's OWN end
 * phantoms — the committed end rule applied inside the run, so the full-rail case computes
 * exactly what the old control() computed. */
const runControl = (rail: Rail, run: Run, index: number): Vec3 => {
  if (index < run.first) {
    return mirror(stopAt(rail, run.first).position, stopAt(rail, run.first + 1).position);
  }
  if (index > run.last) {
    return mirror(stopAt(rail, run.last).position, stopAt(rail, run.last - 1).position);
  }
  return stopAt(rail, index).position;
};

/** R18-ux verdict 2 (kept by B9, reworded; B10 widened the window): a segment's source aim.
 * `anchorApplies` holds while k lies in the anchor's own leg — between u0 and dest inclusive —
 * which also lets a departure anchor frozen AT a stop serve the backward leg it starts (the
 * old floor test could not: the walk leaves the anchor's integer cell on its first step).
 * Reachable k never leaves [u0, dest] until the anchor expires — past the destination the
 * next segment's origin stop takes over, and the pass-through integer clear retires it
 * mid-leg. */
const anchorApplies = (anchor: LookAnchor | null, k: number, dest: number): boolean =>
  anchor !== null &&
  (dest >= anchor.u0 ? k >= anchor.u0 && k <= dest : k <= anchor.u0 && k >= dest);

type TurnFrame = Readonly<{
  a: LookAnchor;
  dest: number;
  D: Vec3;
  w: number;
}>;
/** B9: the segment frame at k. `a` is the departure stop's committed aim or the look in force
 * at a reversal; `D` is the destination's committed target on either heading; `w` is the
 * distance fraction of the anchor's remaining segment — the one weight for gaze and limits, so
 * the look turns with the travel — trailing it (B9c), never ahead of it; a position law rests
 * with the body, never after it. */
function turnFrame(rail: Rail, k: number, heading: Heading, anchor: LookAnchor | null): TurnFrame {
  const i = Math.floor(k);
  const dest = heading > 0 ? i + 1 : i;
  const orig = heading > 0 ? i : i + 1;
  const a: LookAnchor =
    anchor !== null && anchorApplies(anchor, k, dest)
      ? anchor
      : {
          u0: orig,
          point: committedTarget(rail, orig),
          limits: stopAt(rail, orig).look,
        };
  const remaining = Math.abs(dest - a.u0);
  const wd = remaining > 0 ? Math.min(1, Math.abs(k - a.u0) / remaining) : 1;
  // B9c: the lag — the look holds the anchor's aim across the first 1 − LOOK_LAG of the
  // remaining segment and plays its arc across the last LOOK_LAG. Written as 1 − (1 − wd) /
  // LOOK_LAG so wd = 1 maps to exactly 1 for ANY value of the dial (the fence); smoothstep's
  // zero end slopes keep the gaze-turn rate zero where the hold ends and at the stop, so
  // pass-through stops are met with a continuous (zero) rate.
  const w = smoothstep(Math.max(0, 1 - (1 - wd) / LOOK_LAG));
  return { a, dest, D: committedTarget(rail, dest), w };
}

function stopAt(rail: Rail, index: number): Stop {
  const stop = rail.stops[index];
  if (stop === undefined) throw new RangeError(`rail has no stop ${index}`);
  return stop;
}

export const stopCount = (rail: Rail): number => rail.stops.length;

export function stopParameter(rail: Rail, index: number): number {
  const n = stopCount(rail);
  if (!Number.isInteger(index) || index < 0 || index >= n) {
    throw new RangeError(`stop index ${index} outside 0..${n - 1}`);
  }
  return n === 1 ? 0 : index / (n - 1);
}

export function nearestStopIndex(rail: Rail, u: number): number {
  const n = stopCount(rail);
  return n === 1 ? 0 : Math.round(clamp(u, 0, 1) * (n - 1));
}

export const restingAt = (u: number): RailState => ({
  u,
  walk: null,
  heading: 1,
  anchor: null,
  look: NO_LOOK,
  lookTarget: NO_LOOK,
  dwellMs: 0,
});

function locate(rail: Rail, u: number): Place {
  const n = stopCount(rail);
  if (n < 2) return { i: 0, t: 0 };
  const k = clamp(u, 0, 1) * (n - 1);
  const near = Math.round(k);
  const snapped = Math.abs(k - near) < STOP_EPS ? near : k;
  if (snapped >= n - 1) return { i: n - 2, t: 1 };
  const i = Math.floor(snapped);
  return { i, t: snapped - i };
}

function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t0 = 0;
  const t1 = t0 + Math.max(KNOT_EPS, Math.sqrt(dist(p0, p1)));
  const t2 = t1 + Math.max(KNOT_EPS, Math.sqrt(dist(p1, p2)));
  const t3 = t2 + Math.max(KNOT_EPS, Math.sqrt(dist(p2, p3)));
  const s = lerp(t1, t2, t);
  const a1 = lerp3(p0, p1, (s - t0) / (t1 - t0));
  const a2 = lerp3(p1, p2, (s - t1) / (t2 - t1));
  const a3 = lerp3(p2, p3, (s - t2) / (t3 - t2));
  const b1 = lerp3(a1, a2, (s - t0) / (t2 - t0));
  const b2 = lerp3(a2, a3, (s - t1) / (t3 - t1));
  return lerp3(b1, b2, (s - t1) / (t2 - t1));
}

export function samplePosition(rail: Rail, u: number): Vec3 {
  const { i, t } = locate(rail, u);
  if (t === 0) return stopAt(rail, i).position;
  if (t === 1) return stopAt(rail, i + 1).position;
  // R18-ux D3: evaluate the run that owns this segment, with that run's own end phantoms.
  const run = runContaining(rail, i);
  return catmullRom(
    runControl(rail, run, i - 1),
    runControl(rail, run, i),
    runControl(rail, run, i + 1),
    runControl(rail, run, i + 2),
    t,
  );
}

/** The committed gaze target of stop `index`: its subject, else the pose law (next / back). */
export function committedTarget(rail: Rail, index: number): Vec3 {
  const stop = stopAt(rail, index);
  if (stop.subject !== null) return stop.subject;
  const n = stopCount(rail);
  const p = stop.position;
  if (n < 2) return [p[0], p[1], p[2] - 1];
  return stopAt(rail, index === n - 1 ? index - 1 : index + 1).position;
}

function forward(a: Angles): Vec3 {
  const c = Math.cos(a.pitch);
  return [Math.sin(a.yaw) * c, Math.sin(a.pitch), -Math.cos(a.yaw) * c];
}

/** B9 (on R18-ux verdict 2's anchor): the limits move from the rows in force at the segment's
 * anchor to the destination stop's rows with the gaze's distance weight, over the whole
 * remaining segment. At stops the fence holds (the stop's own rows, bit-exact). */
export function sampleLimits(rail: Rail, state: RailState): LookLimits {
  const { i, t } = locate(rail, state.u);
  const a = stopAt(rail, i).look;
  if (t === 0) return a;
  const b = stopAt(rail, i + 1).look;
  if (t === 1) return b;
  const { a: anchor, dest, w } = turnFrame(rail, kOf(rail, state.u), state.heading, state.anchor);
  return lerpLimits(anchor.limits, stopAt(rail, dest).look, w);
}

const settle = (rail: Rail, s: RailState): RailState => ({
  ...s,
  ...settleLook(s, sampleLimits(rail, s)),
});

/** The direction angles of `point` as seen from `eye`, materialized back on the same ray — the
 * anchor point is a direction carrier; this turns it into a lookAt target at the eye asked. */
const aimPoint = (eye: Vec3, point: Vec3): Vec3 => {
  const dir = forward(yawPitch([point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]]));
  const reach = dist(point, eye);
  return [eye[0] + dir[0] * reach, eye[1] + dir[1] * reach, eye[2] + dir[2] * reach];
};

/** B10: an anchor freezes the look in force — the base gaze composed with the user's offset,
 * materialized on the base target's own ray — and the caller absorbs the offset in the same
 * frame (both look fields to zero; the view does not jump). A zero offset hands the base
 * target back bit-exact, so the never-dragged arcs and the golden fence stand unchanged. */
const lookAnchor = (u0: number, pose: Pose): LookAnchor => {
  if (pose.look.yaw === 0 && pose.look.pitch === 0) {
    return { u0, point: pose.target, limits: pose.limits };
  }
  const dir = forward(
    composeAim(
      yawPitch([
        pose.target[0] - pose.position[0],
        pose.target[1] - pose.position[1],
        pose.target[2] - pose.position[2],
      ]),
      pose.look,
    ),
  );
  const reach = dist(pose.target, pose.position);
  return {
    u0,
    point: [
      pose.position[0] + dir[0] * reach,
      pose.position[1] + dir[1] * reach,
      pose.position[2] + dir[2] * reach,
    ],
    limits: pose.limits,
  };
};

export function samplePose(rail: Rail, state: RailState): Pose {
  const { i, t } = locate(rail, state.u);
  const position = samplePosition(rail, state.u);
  const limits = sampleLimits(rail, state);
  const look = clampLook(state.look, limits);
  if (t === 0 || t === 1) {
    const j = t === 0 ? i : i + 1;
    const committed = committedTarget(rail, j);
    // B10: a departure anchor that carries an absorbed look (its point off the committed
    // framing) renders that frozen direction as the base aim — the absorbed offset's view
    // does not jump. A zero-offset anchor's point IS the committed target, so the never-
    // dragged fence pose stays bit-exact.
    const a = state.anchor;
    if (
      a !== null &&
      (a.point[0] !== committed[0] || a.point[1] !== committed[1] || a.point[2] !== committed[2])
    ) {
      return { position, target: aimPoint(position, a.point), limits, look };
    }
    return { position, target: committed, limits, look };
  }
  const frame = turnFrame(rail, kOf(rail, state.u), state.heading, state.anchor);
  if (dist(frame.a.point, frame.D) === 0) {
    // A locked dolly holds its shared point: the subject stays centred while the eye travels.
    return { position, target: frame.D, limits, look };
  }

  // B9: both aims are frozen at their own eyes — the source at the anchor (a reversal's
  // synthetic target gives the look in force there), the destination at the destination stop —
  // so no held point's parallax reaches the gaze: the turn is exactly the arc between the two
  // framings.
  const n = stopCount(rail);
  const origin = samplePosition(rail, frame.a.u0 / (n - 1));
  const eye = samplePosition(rail, frame.dest / (n - 1));
  const a = yawPitch([
    frame.a.point[0] - origin[0],
    frame.a.point[1] - origin[1],
    frame.a.point[2] - origin[2],
  ]);
  const d = yawPitch([frame.D[0] - eye[0], frame.D[1] - eye[1], frame.D[2] - eye[2]]);
  const dir = forward({
    yaw: a.yaw + wrapArc(d.yaw - a.yaw) * frame.w,
    pitch: lerp(a.pitch, d.pitch, frame.w),
  });
  const reach = dist(frame.D, position);
  const target: Vec3 = [
    position[0] + dir[0] * reach,
    position[1] + dir[1] * reach,
    position[2] + dir[2] * reach,
  ];
  return { position, target, limits, look };
}

export function seedState(rail: Rail, seed: SeedInput): SeedResult {
  stopAt(rail, 0);
  // R18-ux verdict 2: the seed sets the entry direction — a deep link to the LAST stop is a
  // backward entry (the fence gaze looks back), everything else enters forward.
  const entry = (stopParameterOf: number, backward: boolean): RailState => ({
    ...restingAt(stopParameterOf),
    heading: backward ? -1 : 1,
  });
  if (seed.stop !== null) {
    const index = rail.stops.findIndex((s) => s.id === seed.stop);
    if (index >= 0) {
      return {
        state: entry(stopParameter(rail, index), index === stopCount(rail) - 1),
        source: 'stop',
      };
    }
  }
  if (seed.cam !== null && Number.isFinite(seed.cam)) {
    const u = clamp(seed.cam, 0, 1);
    return { state: entry(u, u >= 1 && stopCount(rail) > 1), source: 'cam' };
  }
  return { state: restingAt(0), source: 'entry' };
}

/** The walk's phase mathematics. v0/v1 are the speeds at the phase's ends (k/ms along the
 * heading); the profile is exact, so a brake lands ON its stop by construction and every frame
 * reproduces bit-for-bit under a fixed cadence. Cruise carries v1 = v0 and never completes. */
const vC = 1 / WALK_CRUISE_MS;
const phasePos = (w: Walk, atMs: number): number => {
  if (w.v1 === w.v0) return w.k0 + w.v0 * atMs;
  const tau = clamp(atMs / w.phaseDurationMs, 0, 1);
  return (
    w.k0 +
    w.v0 * w.phaseDurationMs * tau +
    (w.v1 - w.v0) * w.phaseDurationMs * (tau ** 3 - tau ** 4 / 2)
  );
};
const phaseSpd = (w: Walk, atMs: number): number =>
  w.v1 === w.v0 ? w.v0 : w.v0 + (w.v1 - w.v0) * smoothstep(clamp(atMs / w.phaseDurationMs, 0, 1));
const walkK = (w: Walk): number => phasePos(w, w.phaseMs);
const walkSpeed = (w: Walk): number => phaseSpd(w, w.phaseMs);
const intentAlive = (w: Walk): boolean => w.held || w.leaseMs > 0;
/** The walk's next stop in the heading (null at/past a rail end): a stop index. */
const nextStopIndex = (rail: Rail, k: number, heading: Heading): number | null => {
  const n = stopCount(rail);
  if (n < 2) return null;
  const near = Math.round(k);
  const i =
    Math.abs(k - near) < STOP_EPS ? near + heading : heading > 0 ? Math.ceil(k) : Math.floor(k);
  return i >= 0 && i <= n - 1 ? i : null;
};
/** B9 pass-throughs: the integers crossed between two k's clear the anchor — the stop's
 * committed framing is met while passing. Units: BOTH k's are stop-gap coordinates (one stop
 * = 1, k = u·(n−1)); the tiny dust around an exact landing snaps to the integer (the u-side
 * snap tolerance in locate() is the same scale by construction). An EXACT landing at a stop
 * clears the anchor in the arrival branch itself; a departure-through-integer clears here. */
const snapped = (k: number): number => {
  const m = Math.round(k);
  return Math.abs(k - m) < STOP_EPS ? m : k;
};
const crossedInteger = (kA: number, kB: number): boolean =>
  Math.floor(snapped(kA)) !== Math.floor(snapped(kB));
/** The first t in [0, bound] where the walk's k reaches `kTarget` — s(t) = kTarget − k(t) is
 * monotone within one phase (k moves one way, its speed never changes sign inside a phase) —
 * or null when the target is unreachable within the bound. Deterministic fixed-iteration
 * bisection; identical frame streams reproduce bit-for-bit. */
const timeToReach = (w: Walk, kTarget: number, bound: number): number | null => {
  const s = (t: number): number => kTarget - phasePos(w, w.phaseMs + t);
  if (s(0) === 0) return 0;
  if (s(bound) === 0 || s(0) * s(bound) < 0) {
    let lo = 0;
    let hi = bound;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (s(0) * s(mid) <= 0) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }
  return null;
};
/** The first t ≤ bound where the (hard) destination enters the braking horizon
 * speed(t)·WALK_BRAKE_MS/2, SEALED AT the destination's crossing (row 4): past the target the
 * plain |distance| is no longer monotone, so the g-bisection runs only on [0, timeToReach],
 * where r(t) decreases and the horizon only grows — g is strictly decreasing. The walk can
 * never integrate past a hard destination inside one call: the brake always engages first
 * (at the crossing's horizon the distance is 0 while the speed is not — g < 0 there), so the
 * closed-form brake lands exactly ON the stop. */
const brakeEntryAt = (w: Walk, kTarget: number, bound: number): number | null => {
  const g = (t: number): number =>
    Math.abs(kTarget - phasePos(w, w.phaseMs + t)) -
    Math.abs(phaseSpd(w, w.phaseMs + t)) * (WALK_BRAKE_MS / 2);
  if (g(0) <= 0) return 0;
  const tCross = timeToReach(w, kTarget, bound);
  if (tCross === null) return null; // the target is beyond this slice: no brake entry in it
  if (g(tCross) > 0) return null; // not reachable before the crossing (defensive; cannot fire
  // in cruise/accel, where g(tCross) = −|v|·350/2 < 0)
  let lo = 0;
  let hi = tCross;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

export function advance(rail: Rail, state: RailState, deltaMs: number): RailState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`deltaMs must be finite and non-negative, got ${deltaMs}`);
  }
  // Damping runs every frame, walk or not. At rest easeLook hands back state.look itself, so
  // the never-dragged state returns unchanged by reference and the golden poses stay bit-equal.
  const look = easeLook(state.look, state.lookTarget, deltaMs);
  const w0 = state.walk;
  if (w0 === null) {
    if (state.dwellMs <= 0) return look === state.look ? state : { ...state, look };
    return { ...state, look, dwellMs: Math.max(0, state.dwellMs - deltaMs) };
  }
  const n = stopCount(rail);
  let s: RailState = { ...state, look };
  let remaining = deltaMs;
  let w = w0;
  // The frame splits exactly at its events (no intent jump): the lease's death, a phase
  // completion, a brake entry. Each slice integrates the closed form over its own span, so
  // the trajectory is identical for any frame cadence. Termination: every iteration consumes
  // time (remaining strictly decreases) or advances the phase machine once (a zero-step slice
  // only fires a phase transition — after it the next slice's step is ≥ its phase time > 0);
  // the bound below is fail-LOUD, not silent (row 5): exhausting it is an invariant breach.
  for (let guard = 0; guard < 1024 && remaining > 0; guard++) {
    const heldNow = w.held;
    const leaseDeath = heldNow || w.leaseMs <= 0 ? Infinity : w.leaseMs;
    const phaseLeft = w.phase === 'cruise' ? Infinity : w.phaseDurationMs - w.phaseMs;
    const kHere = walkK(w);
    const speed = walkSpeed(w);
    let brakeEntry = Infinity;
    let brakeIndex: number | null = null;
    if (speed !== 0 && w.phase !== 'brake') {
      const j = nextStopIndex(rail, kHere, w.heading);
      if (j !== null) {
        const hard = !intentAlive(w) || j === 0 || j === n - 1 || stopAt(rail, j).corner === true;
        if (hard) {
          const bound = Math.min(remaining, leaseDeath, phaseLeft);
          const t = brakeEntryAt(w, j, bound);
          if (t !== null) {
            brakeEntry = Math.min(bound, t);
            brakeIndex = j;
          }
        }
      }
    }
    const step = Math.min(remaining, leaseDeath, phaseLeft, brakeEntry);
    remaining -= step;
    const kEnd = phasePos(w, w.phaseMs + step);
    if (crossedInteger(kHere, kEnd)) s = { ...s, anchor: null };
    const heldMs = heldNow ? w.heldMs + step : w.heldMs;
    // The lease DRAINS FROM ITS PRESS (the ruling's tap law): while held too — held intent
    // keeps the walk alive regardless (the intent event is the release), and a release then
    // reads the REMAINING residual. Holding 250 ms of a 600 ms lease leaves 350 ms.
    const leaseMs = Math.max(0, w.leaseMs - step);

    if (step === brakeEntry && brakeIndex !== null) {
      // Brake entry at the exact threshold: speed and position continue into the brake, which
      // lands exactly on the stop (T = 2r/v).
      const vNow = phaseSpd(w, w.phaseMs + step);
      w = {
        ...w,
        phase: 'brake',
        k0: kEnd,
        phaseMs: 0,
        v0: vNow,
        v1: 0,
        phaseDurationMs: Math.max(1, (2 * Math.abs(brakeIndex - kEnd)) / Math.abs(vNow)),
        brakeTo: brakeIndex,
        reversalTo: null,
        leaseMs,
        heldMs,
      };
      s = { ...s, walk: w };
    } else if (step === phaseLeft && w.phase === 'accel') {
      // The ramp completes: cruise. Position and speed continue; the pace holds the stop gaps.
      w = {
        ...w,
        phase: 'cruise',
        k0: kEnd,
        phaseMs: 0,
        v0: w.v1,
        v1: w.v1,
        phaseDurationMs: Infinity,
        leaseMs,
        heldMs,
      };
      s = { ...s, walk: w };
    } else if (step === phaseLeft && w.phase === 'brake') {
      // A brake's completion: the closed form lands ON its destination — the code swaps to the
      // exact stop parameter, never relying on a tolerance for arrival. The completion
      // DECISIONS (and the successor's intent clocks) read this slice's DRAINED clocks — never
      // the pre-slice state (a same-frame tap must not inherit its pre-drain lease).
      if (w.brakeTo !== null) {
        const j = w.brakeTo;
        s = { ...s, u: stopParameter(rail, j), walk: null, anchor: null };
        const atEnd = j === 0 || j === n - 1;
        const aliveAfterSlice = heldNow || leaseMs > 0;
        if (atEnd || !aliveAfterSlice) {
          s = settle(rail, s); // the walk rests: at a rail end, or where the intent ended
          break;
        }
        // A hard corner with live intent re-departs in the same heading, atomically: no
        // settle-rest frame, no lost held state (the corner is where a walker breathes).
        w = {
          heading: w.heading,
          phase: 'accel',
          k0: j,
          phaseMs: 0,
          v0: 0,
          v1: w.heading * vC,
          phaseDurationMs: WALK_ACCEL_MS,
          brakeTo: null,
          reversalTo: null,
          leaseMs,
          held: w.held,
          heldMs,
        };
        s = { ...s, walk: w };
      } else {
        // The reversal turnaround: the heading flips THERE and the look re-anchors at the look
        // in force at the turnaround (B9's reversal law — the instant is the turnaround, not
        // the press). Live intent departs toward the stop just left; dead intent rests
        // mid-segment (a legal rest: a reversal may end before its leg completes). The
        // decision reads the DRAINED clocks of this slice (row 3).
        const kTurnRaw = phasePos(w, w.phaseMs + step);
        const turn = snapped(kTurnRaw);
        const pose = samplePose(rail, {
          ...s,
          u: turn / (n - 1),
          heading: w.heading,
          anchor: s.anchor,
        });
        const newHeading: Heading = w.reversalTo ?? (w.heading === 1 ? -1 : 1);
        s = {
          ...s,
          u: turn / (n - 1),
          heading: newHeading,
          // B10: the turnaround anchors at the look in force (composed) and absorbs the
          // offset — the back leg starts from where the visitor actually looks.
          anchor: lookAnchor(turn, pose),
          look: NO_LOOK,
          lookTarget: NO_LOOK,
        };
        const j = nextStopIndex(rail, turn, newHeading);
        if (j !== null && (heldNow || leaseMs > 0)) {
          w = {
            heading: newHeading,
            phase: 'accel',
            k0: turn,
            phaseMs: 0,
            v0: 0,
            v1: newHeading * vC,
            phaseDurationMs: WALK_ACCEL_MS,
            brakeTo: null,
            reversalTo: null,
            leaseMs,
            held: w.held,
            heldMs,
          };
          s = { ...s, walk: w };
        } else {
          s = settle(rail, { ...s, walk: null }); // rest at the turnaround
          break;
        }
      }
    } else {
      // A plain slice (to the frame's end or to the lease's death). The intent death, if this
      // slice is it, re-runs the brake check on the next slice — the event splitting of R2.
      w = { ...w, phaseMs: w.phaseMs + step, leaseMs, heldMs };
      s = { ...s, walk: w };
    }
  }
  const wf = s.walk;
  if (remaining > 0 && wf !== null) {
    // Row 5: never silently truncate — an exhausted event budget is a law breach, thrown.
    throw new RangeError(`walk: event budget exhausted with ${remaining} ms unconsumed`);
  }
  if (wf === null) return s; // the arrival branches above already settled
  return settle(rail, { ...s, u: clamp(walkK(wf) / (n - 1), 0, 1), walk: wf });
}

/** A press edge: one of the TWO rail calls every movement source routes through (§5: no second
 * graph). The direction asserts INTENT — it never picks a destination; repeat marks OS
 * auto-repeat (a refill, never a door). */
export function walkPress(
  rail: Rail,
  state: RailState,
  direction: 1 | -1,
  repeat: boolean,
  reducedMotion: boolean,
): StepResult {
  if (reducedMotion) {
    // Reduced motion: no kinematics. The boundary is checked BEFORE the dwell (a door press is
    // not a cut storm); then the cut law: dwell drops, repeats are ignored — cuts, never walks.
    if (state.walk !== null) return { state, boundary: null };
    const j = nextStopIndex(rail, kOf(rail, state.u), direction);
    if (j === null) {
      return repeat
        ? { state, boundary: null } // a hold never opens a door
        : { state, boundary: direction > 0 ? 'forward' : 'backward' };
    }
    if (repeat || state.dwellMs > 0) return { state, boundary: null }; // dropped, not queued
    return {
      state: settle(rail, {
        ...state,
        u: stopParameter(rail, j),
        walk: null,
        heading: direction,
        anchor: null,
        dwellMs: REDUCED_DWELL_MS,
        // B10: the cut absorbs the look at the same press edge — it lands on the destination's
        // committed pose exactly (§8's promise made true for the rendered view).
        look: NO_LOOK,
        lookTarget: NO_LOOK,
      }),
      boundary: null,
    };
  }
  const w = state.walk;
  if (w !== null) {
    // A press of the STILL-TRAVELED direction during a pending reversal CANCELS the reversal
    // (R5's read): re-accelerate from the current speed toward the prior heading — no
    // turnaround pause, speed continuous (the row-8 class).
    if (w.reversalTo !== null && direction === w.heading) {
      const k = walkK(w);
      const v = walkSpeed(w);
      return {
        state: {
          ...state,
          walk: {
            heading: w.heading,
            phase: 'accel',
            k0: k,
            phaseMs: 0,
            v0: v,
            v1: w.heading * vC,
            phaseDurationMs: Math.max(1, (WALK_ACCEL_MS * (vC - Math.abs(v))) / vC),
            brakeTo: null,
            reversalTo: null,
            leaseMs: Math.max(w.leaseMs, WALK_LEASE_MS),
            held: true,
            heldMs: w.held ? w.heldMs : 0,
          },
        },
        boundary: null,
      };
    }
    const intended: Heading = w.reversalTo ?? w.heading;
    if (direction === intended) {
      // The idempotency core: a same-intent press — a key repeat or a second surface — refills
      // the lease and keeps the hold clock running; the trajectory is untouched.
      const heldMs = w.held ? w.heldMs : 0; // a continuous hold keeps its clock; a re-press restarts it
      if (w.phase === 'brake' && w.reversalTo === null && w.brakeTo !== null) {
        const j = w.brakeTo;
        const hardBrake = j === 0 || j === stopCount(rail) - 1 || stopAt(rail, j).corner === true;
        if (!hardBrake) {
          // §1.4(c): a press during an INTENT-DEATH brake (a plain stop that the dying intent
          // was braking into) re-accelerates from the current speed — no stop.
          const k = walkK(w);
          const v = walkSpeed(w);
          const walk: Walk = {
            heading: w.heading,
            phase: 'accel',
            k0: k,
            phaseMs: 0,
            v0: v,
            v1: w.heading * vC,
            phaseDurationMs: Math.max(1, (WALK_ACCEL_MS * (vC - Math.abs(v))) / vC),
            brakeTo: null,
            reversalTo: null,
            leaseMs: Math.max(w.leaseMs, WALK_LEASE_MS),
            held: true,
            heldMs,
          };
          return { state: { ...state, walk }, boundary: null };
        }
        // A press during a LIVE hard-stop brake (an end or a corner the intent never left)
        // is REDUNDANT: refills the clocks and leaves the trajectory alone (the arrival law
        // re-departs the corner; the repeats of a held key resume past the end).
      }
      return {
        state: {
          ...state,
          walk: { ...w, leaseMs: Math.max(w.leaseMs, WALK_LEASE_MS), held: true, heldMs },
        },
        boundary: null,
      };
    }
    // The REVERSAL (§1.4 d): brake to the turnaround (T scales the from-rest ramp, so the
    // deceleration never exceeds it); the heading flips AT the turnaround. A turnaround that
    // would cross a hard rail end is stolen by the end THROUGH A TIMED BRAKE (never a jump):
    // the walk decelerates into the end (T = 2r/v, the accepted early-arrest shape), rests
    // there by the arrival law, and the repeats of a still-held key resume the new heading.
    const k = walkK(w);
    const v = walkSpeed(w);
    const t = Math.max(1, (WALK_ACCEL_MS * Math.abs(v)) / vC);
    const kTurn = k + (v * t) / 2;
    const n = stopCount(rail);
    if (kTurn <= 0 || kTurn >= n - 1) {
      const end = kTurn >= n - 1 ? n - 1 : 0;
      const r = Math.abs(end - k);
      const walk: Walk = {
        heading: w.heading,
        phase: 'brake',
        k0: k,
        phaseMs: 0,
        v0: v,
        v1: 0,
        phaseDurationMs: Math.max(1, (2 * r) / Math.abs(v)),
        brakeTo: end,
        reversalTo: null,
        leaseMs: WALK_LEASE_MS,
        held: true,
        heldMs: 0,
      };
      return { state: { ...state, walk }, boundary: null };
    }
    const walk: Walk = {
      heading: w.heading,
      phase: 'brake',
      k0: k,
      phaseMs: 0,
      v0: v,
      v1: 0,
      phaseDurationMs: t,
      brakeTo: null,
      reversalTo: direction,
      leaseMs: WALK_LEASE_MS,
      held: true,
      heldMs: 0,
    };
    return { state: { ...state, walk }, boundary: null };
  }
  // At rest: a fresh edge (or the OS tail of a held key) starts the walk toward the next stop
  // in direction; a fresh edge at a settled rail end returns the boundary intent instead.
  // B10: the departure anchors at the look in force (composed with the user's offset) and
  // absorbs the offset — at a stop and mid-segment alike. The u0 snaps to the stop's integer
  // when the rest sits on one, so a never-dragged departure reads bit-exact as the anchor-less
  // fallback it replaces; a zero offset hands the committed framing back bit-exact.
  const kHere = kOf(rail, state.u);
  const near = Math.round(kHere);
  const u0 = Math.abs(kHere - near) < STOP_EPS ? near : kHere;
  const j = nextStopIndex(rail, kHere, direction);
  if (j === null) {
    return repeat
      ? { state, boundary: null } // a hold never opens a door
      : { state, boundary: direction > 0 ? 'forward' : 'backward' };
  }
  const anchor = lookAnchor(u0, samplePose(rail, { ...state, heading: direction, walk: null }));
  const walk: Walk = {
    heading: direction,
    phase: 'accel',
    k0: kHere,
    phaseMs: 0,
    v0: 0,
    v1: direction * vC,
    phaseDurationMs: WALK_ACCEL_MS,
    brakeTo: null,
    reversalTo: null,
    leaseMs: WALK_LEASE_MS,
    held: true,
    heldMs: 0,
  };
  return {
    state: settle(rail, {
      ...state,
      walk,
      heading: direction,
      anchor,
      look: NO_LOOK,
      lookTarget: NO_LOOK,
    }),
    boundary: null,
  };
}

/** The release edge: the direction's aggregate of activations lifted. A HOLD (the activation
 * held ≥ WALK_HOLD_MS at release) ends intent NOW (lease 0); a TAP lets the lease keep
 * draining from its press — taps ≤ WALK_LEASE_MS apart never brake. Releases match the intent
 * in force: the reversal's intended heading until the turnaround, then the travel heading. */
export function walkRelease(state: RailState, direction: 1 | -1): RailState {
  const w = state.walk;
  if (w === null) return state;
  const intended: Heading = w.reversalTo ?? w.heading;
  if (direction !== intended) return state;
  return {
    ...state,
    walk: {
      ...w,
      held: false,
      leaseMs: w.heldMs >= WALK_HOLD_MS ? 0 : w.leaseMs,
    },
  };
}

/** The host's one motion read (every glide read is replaced): true while a walk is alive. */
export const moving = (state: RailState): boolean => state.walk !== null;

/** Accumulates the drag onto `lookTarget`; the rendered `look` eases toward it in advance(). */
export function drag(
  rail: Rail,
  state: RailState,
  dxPx: number,
  dyPx: number,
  viewportHeightPx: number,
  pointerType: PointerTypeName,
): RailState {
  const unclamped = dragLook(state.lookTarget, dxPx, dyPx, viewportHeightPx, pointerType);
  return { ...state, lookTarget: clampLook(unclamped, sampleLimits(rail, state)) };
}
