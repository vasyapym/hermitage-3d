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
 * - Gaze between stops (R18-ux verdict 2, the glide look law): during a glide the look HOLDS
 *   THE DESTINATION stop's target (its subject, its pose-law point, or its Forward `approach`
 *   point); position stays on the spline. The only transition is the DEPARTURE TURN: over the
 *   first TURN_SPAN_T of the segment (widened to TURN_SPAN_T · θ/TURN_REF_DEG above the
 *   reference angle, capped at TURN_SPAN_MAX_T, never past the destination) the gaze turns by
 *   shortest arc (yaw shortest arc, pitch linear) from the origin's target to the
 *   destination's, smootherstep-weighted; after the turn the destination target is held
 *   exactly. A glide reversed mid-segment re-anchors the turn at the look in force at the
 *   reversal; a scroll glide passing a stop starts that stop's departure turn from its
 *   committed pose — neither jumps the gaze.
 * - Look limits blend linearly between the bounding stops; user offsets are re-clamped on every
 *   transition. Offsets are degrees: yaw > 0 turns right, pitch > 0 looks up.
 * - Motion: a glide is (from, to, durationMs, elapsedMs) eased by smootherstep; advance() is
 *   pure, takes a finite non-negative deltaMs and throws RangeError otherwise. A key step in
 *   flight retargets from the current u; a scroll in flight extends the scroll glide's `to`.
 *   The rail state also carries `heading` and the look `anchor`; advance() stays pure.
 *   Reduced motion turns every glide into a cut. Scroll clamps at the rail ends and never
 *   crosses a corner stop; only key steps past an end surface a boundary intent (the host
 *   turns it into an airlock transit).
 * - DEC-031 boundary (the owner's reachability report, 2026-10-21): the rail's clamp
 *   silence stranded trackpad visitors at every door. The INPUT law gains one deliberate
 *   gesture — a sustained, slow, sustained-scroll pass past a rail end also surfaces a
 *   boundary intent (src/camera/wheel-edge.ts: three declared thresholds; a momentum burst
 *   restarts the pass) — and the host shows a keyed chrome prompt at a settled rail end
 *   (src/ui/edge-prompt.ts; the door label keys); activating it travels through the same
 *   boundary chain the arrows use. Stop data, look limits and glide durations untouched.
 * - Seed precedence on node entry: ?stop= (known id) > ?cam= (finite, clamped) > entry (u = 0).
 * - r21 look response: target/current split; the sensitivity and damping laws live in look.ts
 *   (§6.1; §10 row r21). drag() accumulates the clamped TARGET, advance() eases the CURRENT
 *   every frame; settle() re-clamps both; at rest the eased look hands back the same object, so
 *   the never-dragged poses stay bit-identical.
 */

import type { Rail, Stop, Vec3 } from '../world/registry';
import type { LookLimits, LookOffset, PointerTypeName } from './look';
import { clampLook, dragLook, easeLook, NO_LOOK, settleLook } from './look';

export type { LookLimits, LookOffset } from './look';
export type GlideKind = 'step' | 'scroll';
export type Glide = Readonly<{
  kind: GlideKind;
  from: number;
  to: number;
  durationMs: number;
  elapsedMs: number;
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
  glide: Glide | null;
  /** R18-ux verdict 2: the travel direction in force (1 forward, −1 backward). */
  heading: Heading;
  /** The reversal's re-anchor — the look in force at a mid-segment heading flip; null means the
   * segment's origin stop. `u0` is the stop-index coordinate k = u · (n − 1): one segment = 1. */
  anchor: LookAnchor | null;
  look: LookOffset;
  lookTarget: LookOffset;
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

export const STEP_GLIDE_MS = 2800; // R18-ux D2: half the speed for button/arrow presses
export const SCROLL_GLIDE_MS = 640; // R18-ux D2: half the speed of an isolated scroll delta
/** Declared tuning target (the r26.1 owner report: «scrolling in is too fast — around 25%
 * slower»): wheel pixels per rail segment. 900 → 1200 = the same gesture travels 75% of the
 * distance it used to. */
export const SCROLL_PX_PER_SEGMENT = 1200;
/** R18-ux verdict 2's departure-turn law: the turn occupies the first TURN_SPAN_T of the
 * segment for turns up to TURN_REF_DEG, widens by θ/TURN_REF_DEG above it, caps at
 * TURN_SPAN_MAX_T and never past the destination. */
export const TURN_SPAN_T = 0.18,
  TURN_REF_DEG = 45,
  TURN_SPAN_MAX_T = 0.4;

const STOP_EPS = 1e-9;
const KNOT_EPS = 1e-6;
const TAU = Math.PI * 2;
type Angles = Readonly<{ yaw: number; pitch: number }>;
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
const smootherstep = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
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
/** Angle (degrees) between two aim directions, from their unit-space dot. A zero direction
 * compares as 0° (atan2(0, 0) = 0 keeps a vertical aim NaN-free; no NaN pin). */
const angleDeg = (a: Vec3, b: Vec3): number => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]);
  if (len === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / len))) * 180) / Math.PI;
};
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

/**
 * The held look target INTO stop `dest` on this glide's heading (R18-ux verdict 2 + C3): a
 * Forward glide holds the stop's authored `approach` point when it has one — the opener on the
 * committed gaze ray (Gj's passage mouth) — and every other case holds the committed target.
 */
const holdTarget = (rail: Rail, dest: number, heading: Heading): Vec3 => {
  const stop = stopAt(rail, dest);
  if (heading > 0 && stop.approach !== undefined) return stop.approach;
  return committedTarget(rail, dest);
};

/** R18-ux verdict 2: the reminder of a departure turn, re-anchored at a mid-segment reversal:
 * `anchorApplies` holds only while u lies between anchor.u0 and dest in the same segment. Past
 * the destination, the anchor is stale and the next segment's origin stop takes over. */
const anchorApplies = (anchor: LookAnchor | null, k: number, dest: number): boolean =>
  anchor !== null &&
  Math.floor(anchor.u0) === Math.floor(k) &&
  (dest >= anchor.u0 ? k >= anchor.u0 : k <= anchor.u0);

type TurnFrame = Readonly<{
  a: LookAnchor;
  dest: number;
  D: Vec3;
  w: number;
}>;
/** The departure-turn frame at k (the stop-index coordinate): the aims blend from the anchor's
 * target to the destination's held target over the widened span; w = 0 at the origin aim and
 * 1 at the hold. The span guard (w = 1 when span = 0) covers the anchor-at-destination case. */
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
  const pA = samplePosition(rail, a.u0 / (stopCount(rail) - 1));
  const D = holdTarget(rail, dest, heading);
  const theta = angleDeg(
    [a.point[0] - pA[0], a.point[1] - pA[1], a.point[2] - pA[2]],
    [D[0] - pA[0], D[1] - pA[1], D[2] - pA[2]],
  );
  const span = Math.min(
    Math.abs(dest - a.u0),
    Math.min(TURN_SPAN_MAX_T, TURN_SPAN_T * Math.max(1, theta / TURN_REF_DEG)),
  );
  const w = span > 0 ? smootherstep(Math.abs(k - a.u0) / span) : 1; // PART-1 CORRECTION: guard
  return { a, dest, D, w };
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
  glide: null,
  heading: 1,
  anchor: null,
  look: NO_LOOK,
  lookTarget: NO_LOOK,
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

/** R18-ux verdict 2: the limits move from the look in force at the turn's start to the
 * destination stop's rows over the departure turn, then hold the destination's. At stops the
 * fence holds (the stop's own rows, bit-exact). */
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

export function samplePose(rail: Rail, state: RailState): Pose {
  const { i, t } = locate(rail, state.u);
  const position = samplePosition(rail, state.u);
  const limits = sampleLimits(rail, state);
  const look = clampLook(state.look, limits);
  if (t === 0) return { position, target: committedTarget(rail, i), limits, look };
  if (t === 1) return { position, target: committedTarget(rail, i + 1), limits, look };
  const frame = turnFrame(rail, kOf(rail, state.u), state.heading, state.anchor);
  if (frame.w === 1) return { position, target: frame.D, limits, look }; // the hold: destination target exactly
  // The departure turn: shortest arc between the LIVE aims (from the current position), pitch
  // linear, smootherstep-weighted; the target reconstructs on the blended ray at the
  // destination's reach, so w = 1 lands exactly on the held target.
  const a = yawPitch([
    frame.a.point[0] - position[0],
    frame.a.point[1] - position[1],
    frame.a.point[2] - position[2],
  ]);
  const d = yawPitch([
    frame.D[0] - position[0],
    frame.D[1] - position[1],
    frame.D[2] - position[2],
  ]);
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

export function advance(rail: Rail, state: RailState, deltaMs: number): RailState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`deltaMs must be finite and non-negative, got ${deltaMs}`);
  }
  // Damping runs every frame, glide or not. At rest easeLook hands back state.look itself, so
  // the never-dragged state returns unchanged by reference and the golden poses stay bit-equal.
  const look = easeLook(state.look, state.lookTarget, deltaMs);
  const g = state.glide;
  if (g === null) return look === state.look ? state : { ...state, look };
  const { lookTarget, heading } = state;
  const elapsedMs = g.elapsedMs + deltaMs;
  if (elapsedMs >= g.durationMs) {
    // Arrival at a stop: the anchor clears; the pose is the fence either way.
    return settle(rail, { u: g.to, glide: null, heading, anchor: null, look, lookTarget });
  }
  const u = lerp(g.from, g.to, smootherstep(elapsedMs / g.durationMs));
  return settle(rail, {
    u,
    glide: { ...g, elapsedMs },
    heading,
    anchor: state.anchor,
    look,
    lookTarget,
  });
}

/** A new glide's departure rules (R18-ux verdict 2): the glide sets its travel heading; a
 * same-heading retarget of a step in flight keeps the anchor; a mid-segment REVERSAL re-anchors
 * the turn at the look in force there; a departure from a stop starts a fresh fence turn. */
function glideTo(
  rail: Rail,
  state: RailState,
  to: number,
  kind: GlideKind,
  reducedMotion: boolean,
): RailState {
  if (reducedMotion || to === state.u) {
    // Reduced motion turns every glide into a cut; a cut lands on the destination's committed
    // pose. There is no departure turn — the anchor clears with the glide.
    const heading: Heading = to > state.u ? 1 : to < state.u ? -1 : state.heading;
    return settle(rail, { ...state, u: to, glide: null, heading, anchor: null });
  }
  const heading: Heading = to > state.u ? 1 : -1;
  const n = stopCount(rail);
  const k = clamp(state.u, 0, 1) * (n - 1);
  let anchor: LookAnchor | null;
  if (Math.abs(k - Math.round(k)) < STOP_EPS) {
    anchor = null; // a departure from a stop: the fence pose is the origin aim
  } else if (heading === state.heading) {
    anchor = state.anchor; // same-heading retarget (a step in flight) keeps the anchor
  } else {
    // A mid-glide reversal re-anchors the turn at the look in force at the reversal.
    const pose = samplePose(rail, state);
    anchor = { u0: k, point: pose.target, limits: pose.limits };
  }
  const durationMs = kind === 'step' ? STEP_GLIDE_MS : SCROLL_GLIDE_MS;
  return {
    ...state,
    glide: { kind, from: state.u, to, durationMs, elapsedMs: 0 },
    heading,
    anchor,
  };
}

export function stepStop(
  rail: Rail,
  state: RailState,
  direction: 1 | -1,
  reducedMotion: boolean,
): StepResult {
  const n = stopCount(rail);
  const k = (state.glide === null ? state.u : state.glide.to) * (n - 1);
  const near = Math.round(k);
  const atStop = Math.abs(k - near) < STOP_EPS;
  const index = atStop ? near + direction : direction > 0 ? Math.ceil(k) : Math.floor(k);
  if (index < 0) return { state, boundary: 'backward' };
  if (index > n - 1) return { state, boundary: 'forward' };
  const to = stopParameter(rail, index);
  return { state: glideTo(rail, state, to, 'step', reducedMotion), boundary: null };
}

/** R18-ux D3: scroll barriers — the first corner stop met between `base` and `rawTarget`
 * (traveling in the scroll's direction), or null. A corner at the START or the DESTINATION is
 * not crossed; a corner at a rail end is inert by construction. */
const firstCornerBetween = (rail: Rail, base: number, rawTarget: number): number | null => {
  const n = stopCount(rail);
  const forward = rawTarget > base;
  let backwardBarrier: number | null = null;
  for (let i = 1; i < n - 1; i++) {
    if (stopAt(rail, i).corner !== true) continue;
    const uCorner = stopParameter(rail, i);
    if (forward) {
      if (base < uCorner && uCorner < rawTarget) return i; // the first met going on
    } else if (rawTarget < uCorner && uCorner < base) {
      backwardBarrier = i; // scan on: the largest idx crossed is the first met going back
    }
  }
  return backwardBarrier;
};

export function scroll(
  rail: Rail,
  state: RailState,
  deltaPx: number,
  reducedMotion: boolean,
): RailState {
  if (!Number.isFinite(deltaPx)) throw new RangeError(`deltaPx must be finite, got ${deltaPx}`);
  const n = stopCount(rail);
  if (n < 2 || deltaPx === 0) return state;
  const g = state.glide;
  const base = g === null ? state.u : g.to;
  const raw = clamp(base + deltaPx / (SCROLL_PX_PER_SEGMENT * (n - 1)), 0, 1);
  // R18-ux D3: before committing a target, clamp it to the first corner stop between u and the
  // target — a scroll glide never crosses a corner; the next delta starts a new one from there.
  const barrier = firstCornerBetween(rail, base, raw);
  const to =
    barrier === null
      ? raw
      : raw > base
        ? Math.min(raw, stopParameter(rail, barrier))
        : Math.max(raw, stopParameter(rail, barrier));
  if (g !== null && g.kind === 'scroll' && !reducedMotion) return { ...state, glide: { ...g, to } };
  return glideTo(rail, state, to, 'scroll', reducedMotion);
}

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
