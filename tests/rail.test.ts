import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import type { RailState } from '../src/camera/rail';
import {
  advance,
  drag,
  restingAt,
  STEP_GLIDE_MS,
  sampleLimits,
  samplePose,
  samplePosition,
  scroll,
  seedState,
  stepStop,
  stopParameter,
} from '../src/camera/rail';
import {
  SQUARE_RAIL,
  SQUARE_S0_GAZE,
  SQUARE_S1_GAZE,
  SQUARE_SH_GAZE,
} from '../src/camera/square-rail';
import { t } from '../src/i18n';
import type { Rail, Stop, Vec3 } from '../src/world/registry';

const stop = (id: string, position: Vec3, yaw = 30, pitchUp = 20, pitchDown = 10): Stop => ({
  id,
  position,
  subject: null, // the pose law: the next stop's position, the last stop looks back
  look: { yaw, pitchUp, pitchDown },
  caption: 'caption.s0', // fixtures never resolve captions; the key just has to typecheck
});

// R-UX5 §8: a stop with an authored world-space subject.
const aimed = (id: string, position: Vec3, subject: Vec3): Stop => ({
  id,
  position,
  subject,
  look: { yaw: 30, pitchUp: 20, pitchDown: 10 },
  caption: 'caption.s0',
});

const A: Vec3 = [10, 2.4, 0];
const B: Vec3 = [10, 1.7, -40];
const AIMED: Rail = { stops: [aimed('a', [0, 1.7, 0], A), aimed('b', [0, 1.7, -10], B)] };

const STAIR: Rail = {
  stops: [
    stop('a', [0, 1.6, 0]),
    stop('b', [0, 1.6, -6]),
    stop('c', [3, 3.2, -9], 60, 40, 20),
    stop('d', [3, 4.8, -15]),
  ],
};
const LINE: Rail = { stops: [stop('p', [0, 0, 0]), stop('q', [0, 0, -10])] };
const POINT: Rail = { stops: [stop('only', [1, 2, 3])] };

const GALLERY: Rail = galleryContract.rail;
const GALLERY_1812: Rail = contract1812.rail;
// The unflagged rails only: the two committed rails that carry a corner flag (the gallery's
// Gj and the 1812's M3) take the D3 run path by design and re-shape their flagged segments.
const UNFLAGGED: readonly Rail[] = [SQUARE_RAIL, jordanContract.rail];

const run = (rail: Rail, s: ReturnType<typeof restingAt>): ReturnType<typeof restingAt> => {
  let state = s;
  while (state.glide !== null) state = advance(rail, state, 16);
  return state;
};

/** R18-ux verdict 2: a state overridden into a backward-heading pose (glide-free sampling). */
const back = (rail: Rail, u: number): RailState =>
  rail.stops.length < 2 ? restingAt(u) : { ...restingAt(u), heading: -1 };

const unitDir = (target: Vec3, position: Vec3): Vec3 => {
  const d: Vec3 = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return len === 0 ? [0, 0, -1] : [d[0] / len, d[1] / len, d[2] / len];
};
const angleDeg = (a: Vec3, b: Vec3): number =>
  (Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
/** The per-16ms aim change (degrees) between two SAMPLED poses (aim directions). */
const aimStepDeg = (
  before: { target: readonly number[]; position: readonly number[] },
  after: { target: readonly number[]; position: readonly number[] },
): number => {
  const dir = (p: { target: readonly number[]; position: readonly number[] }): Vec3 => {
    const d: Vec3 = [
      (p.target[0] ?? 0) - (p.position[0] ?? 0),
      (p.target[1] ?? 0) - (p.position[1] ?? 0),
      (p.target[2] ?? 0) - (p.position[2] ?? 0),
    ];
    const len = Math.hypot(d[0], d[1], d[2]);
    return len === 0 ? [0, 0, -1] : [d[0] / len, d[1] / len, d[2] / len];
  };
  const a = dir(after);
  const b = dir(before);
  return angleDeg(a, b);
};

describe('spline', () => {
  it('passes exactly through every stop', () => {
    STAIR.stops.forEach((s, i) => {
      expect(samplePosition(STAIR, stopParameter(STAIR, i))).toEqual(s.position);
    });
    expect(samplePosition(POINT, 0)).toEqual(POINT.stops[0]?.position);
  });
  it('is the straight segment for a two-stop rail', () => {
    const mid = samplePosition(LINE, 0.5);
    expect(mid[0]).toBeCloseTo(0);
    expect(mid[2]).toBeCloseTo(-5);
  });
  it('is continuous across a stop', () => {
    const before = samplePosition(STAIR, 1 / 3 - 1e-6);
    const at = samplePosition(STAIR, 1 / 3);
    before.forEach((v, k) => {
      expect(Math.abs(v - (at[k] ?? Number.NaN))).toBeLessThan(1e-3);
    });
  });
});

describe('committed pose law', () => {
  it('looks at the next stop and back from the last one', () => {
    const n = STAIR.stops.length;
    STAIR.stops.forEach((s, i) => {
      const pose = samplePose(STAIR, restingAt(stopParameter(STAIR, i)));
      expect(pose.position).toEqual(s.position);
      expect(pose.target).toEqual(STAIR.stops[i === n - 1 ? i - 1 : i + 1]?.position);
    });
  });
  it('holds the destination’s committed target after the departure turn (R18-ux verdict 2)', () => {
    // Mid segment b→c, past the 0.18 turn: the hold is exact — the destination's own
    // committed object (for the pose-law stop c: the NEXT stop's position).
    const pose = samplePose(STAIR, restingAt(0.5));
    expect(pose.target).toEqual(STAIR.stops[3]?.position);
  });
});

describe('authored subjects (R-UX5 §8, D6)', () => {
  it('returns the stop’s subject by reference at the stop (the golden fence)', () => {
    expect(samplePose(AIMED, restingAt(0)).target).toBe(AIMED.stops[0]?.subject);
    expect(samplePose(AIMED, restingAt(1)).target).toBe(AIMED.stops[1]?.subject);
  });
  it(
    'holds the destination subject once the turn completes (span ≤ TURN_SPAN_MAX_T); ' +
      'before that the shortest-arc blend of the two live aims',
    () => {
      // A two-stop rail: k units 0..1. The turn widens with θ (A and B straddle a wide
      // angle), so the hold is guaranteed only by the law's cap: past TURN_SPAN_MAX_T
      // the target IS the destination's subject for the rest of the travel.
      for (const k of [0.41, 0.6, 0.9]) {
        expect(samplePose(AIMED, restingAt(k)).target).toEqual(B);
      }
      // Inside the window the target travels between the live aims (never jumps).
      const early = samplePose(AIMED, restingAt(0.09)).target;
      expect(early[0] ?? Number.NaN).toBeGreaterThan(0); // already dragged toward B's +10 x
      expect(early[2] ?? Number.NaN).toBeGreaterThan(B[2]); // still short of B's z −40
    },
  );
  it('locks on a shared subject for the whole segment (a dolly with a subject)', () => {
    const A2: Vec3 = [10, 2.4, 0]; // equal by value, a distinct object
    const LOCK: Rail = { stops: [aimed('a', [0, 1.7, 0], A), aimed('b', [0, 1.7, -10], A2)] };
    for (const u of [0.1, 0.37, 0.5, 0.9]) {
      const target = samplePose(LOCK, restingAt(u)).target;
      expect(target[0] ?? Number.NaN).toBeCloseTo(A[0], 12);
      expect(target[1] ?? Number.NaN).toBeCloseTo(A[1], 12);
      expect(target[2] ?? Number.NaN).toBeCloseTo(A[2], 12); // null turn: the same point
    }
  });
  it(
    'holds the destination’s committed target after the departure turn when either end of ' +
      'a segment is subjectless',
    () => {
      const MIXED: Rail = { stops: [aimed('a', [0, 1.6, 0], A), stop('b', [0, 1.6, -10])] };
      expect(samplePose(MIXED, restingAt(0)).target).toBe(A);
      expect(samplePose(MIXED, restingAt(1)).target).toEqual(MIXED.stops[0]?.position);
      // The destination b is subjectless AND last: its committed object is the pose-law
      // look-back point (a's position), and the hold delivers exactly that.
      expect(samplePose(MIXED, restingAt(0.5)).target).toEqual(MIXED.stops[0]?.position);
    },
  );
});

describe('the departure turn (R18-ux verdict 2)', () => {
  it('a Back glide from i+1 to i holds subject i', () => {
    // Backward from b: destination a holds A once the turn is done.
    const pose = samplePose(AIMED, back(AIMED, 0.5));
    expect(pose.target).toEqual(A);
  });
  it('departure continuity: the gaze at u = k + ε turns within O(ε) of the committed gaze', () => {
    // R19-ux C: re-derived by measurement — the frozen-source law's residual is first order
    // in ε (no longer second-order flat): measured 0.00115° at ε = 1e-6, gap/ε ≈ 1151°/unit,
    // bound 0.0013.
    const atStop = samplePose(STAIR, restingAt(1 / 3));
    const just = samplePose(STAIR, restingAt(1 / 3 + 1e-6));
    expect(
      angleDeg(unitDir(just.target, just.position), unitDir(atStop.target, atStop.position)),
      'O(ε) at the departure',
    ).toBeLessThan(0.0013);
  });
  it('arrival exactness: the run lands on the destination stop’s committed object', () => {
    // The destination's held target IS the stop's committed target (continuous with the
    // fence): arriving at b, the pose looks at c's committed object.
    const done = advance(STAIR, stepStop(STAIR, restingAt(0), 1, false).state, STEP_GLIDE_MS);
    expect(done.glide).toBeNull();
    const pose = samplePose(STAIR, done);
    expect(pose.target).toEqual(STAIR.stops[2]?.position);
  });
  it('Back Gj→G0 turns from the fence at Gj; the hold lands only at G0 (near-field)', () => {
    // R19-ux C near-field: JUNCTION's ray sweeps 82.39° under the nominal 0.4 span, so this
    // pair's turn spans the whole segment. The old «capped at 0.4» row asserted the hold from
    // s = 0.401 — superseded: there the gaze is still mid-turn (measured bearing 33.28° =
    // the arc·s law 82.98°·0.401), and the hold is exact only at the destination stop.
    const just = samplePose(GALLERY, back(GALLERY, stopParameter(GALLERY, 1)));
    expect(just.target).toBe(GALLERY.stops[1]?.subject);
    const mid = samplePose(GALLERY, back(GALLERY, stopParameter(GALLERY, 1) - 0.401 / 3));
    expect(mid.target).not.toBe(GALLERY.stops[0]?.subject); // still mid-turn at the old cap spot
    const g0 = samplePose(GALLERY, back(GALLERY, 0));
    expect(g0.target).toBe(GALLERY.stops[0]?.subject);
  });
  it('a mid-glide reversal re-anchors and keeps the per-16ms gaze change ≤ 3° (the step world)', () => {
    // The widest committed turn (θ = 90° at the widened span 0.36 ≈ 1034 ms of 2800) peaks
    // ≈ 2.6°/frame — 90° · smootherstep's 1.875× peak slope / 1034 ms · 16 ms. The bound 3°
    // is the step world's catch-all; measured worst on the STAIR reversal ≈ 1.2°.
    const firstStep = stepStop(STAIR, restingAt(0), 1, false).state;
    let state = advance(STAIR, firstStep, 1200); // well into the first glide
    const reversed = stepStop(STAIR, state, -1, false).state; // the mid-glide reversal
    expect(reversed.glide).not.toBeNull();
    expect(reversed.anchor).not.toBeNull(); // the look in force at the reversal
    let guard = 0;
    let prevPose = samplePose(STAIR, state);
    state = reversed;
    while (state.glide !== null && guard++ < 400) {
      state = advance(STAIR, state, 16);
      const pose = samplePose(STAIR, state);
      expect(aimStepDeg(prevPose, pose), `frame ${guard}`).toBeLessThanOrEqual(3);
      prevPose = pose;
    }
    expect(state.glide).toBeNull();
    expect(state.u).toBe(0); // the reversal lands at a
  });
  it('bounds the 544-ms scroll approach and retains the corner barrier', () => {
    let state = scroll(GALLERY, restingAt(0), 20_000, false);
    expect(state.glide?.kind).toBe('scroll');
    expect(state.glide?.durationMs).toBe(544);
    expect(state.glide?.to).toBe(stopParameter(GALLERY, 1)); // the corner barrier clamps at Gj
    expect(state.heading).toBe(1);
    let previous = samplePose(GALLERY, state);
    let worst = 0;
    for (let frame = 0; frame < 34; frame++) {
      state = advance(GALLERY, state, 16);
      const pose = samplePose(GALLERY, state);
      const ax = previous.target[0] - previous.position[0];
      const ay = previous.target[1] - previous.position[1];
      const az = previous.target[2] - previous.position[2];
      const bx = pose.target[0] - pose.position[0];
      const by = pose.target[1] - pose.position[1];
      const bz = pose.target[2] - pose.position[2];
      const cosine =
        (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz));
      const degrees = (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
      expect(Number.isFinite(degrees)).toBe(true);
      worst = Math.max(worst, degrees);
      previous = pose;
    }
    expect(worst).toBeLessThanOrEqual(6.3);
    expect(state.glide).toBeNull();
    expect(state.u).toBe(stopParameter(GALLERY, 1));
  });
  it('near-field Back Gj→G0 has no transient: pitch climbs monotonically to 3.06°', () => {
    // R19-ux C near-field; supersedes B.16's ≈10.05° (FIXUPS 2) and the round's measured 17.39°.
    // JUNCTION's ray sweeps 82.39° under the nominal 0.4 span, so the turn spans the segment
    // with the distance fraction s as its weight: pitch = s·atan(0.7 / 13.098s) — 0.089° at
    // s = 0.001, 2.615° at s = 0.07 (the old peak's spot), 3.0505° at s = 0.5, 3.0591° at G0.
    const u0 = stopParameter(GALLERY, 1);
    const pitchDeg = (pose: ReturnType<typeof samplePose>): number => {
      const [px, py, pz] = [pose.position[0] ?? 0, pose.position[1] ?? 0, pose.position[2] ?? 0];
      const [tx, ty, tz] = [pose.target[0] ?? 0, pose.target[1] ?? 0, pose.target[2] ?? 0];
      return (Math.atan2(ty - py, Math.hypot(tx - px, tz - pz)) * 180) / Math.PI;
    };
    const settle = pitchDeg(samplePose(GALLERY, restingAt(0)));
    const pitches: number[] = [];
    for (let i = 1; i <= 1000; i++) {
      pitches.push(pitchDeg(samplePose(GALLERY, back(GALLERY, u0 - (i / 1000) * u0))));
    }
    const dips = pitches.filter((p, i) => i > 0 && p < (pitches[i - 1] ?? p) - 1e-6).length;
    const peak = Math.max(...pitches);
    expect(dips, 'the pitch never turns back down on the way to the settle').toBe(0);
    expect(peak, 'no sample rises above the settle').toBeLessThanOrEqual(settle + 1e-6);
    expect(pitches[0] ?? Number.NaN).toBeLessThan(0.1);
    expect(pitches[69] ?? Number.NaN).toBeCloseTo(2.615, 2);
    expect(pitches[499] ?? Number.NaN).toBeCloseTo(3.0505, 3);
    expect(settle).toBeCloseTo(3.0591, 3);
  });

  it('near-field Back Gj→G0 spans the whole glide: half of the 83° pan at mid-segment', () => {
    // Gj→EAST_DOOR is +x; along the straight mouth the live ray to JUNCTION keeps Gj−G0's
    // bearing, 82.98° off +x, so the gaze bearing is 82.98°·s: 33.19° at s = 0.4 (where the
    // capped turn used to land on JUNCTION) and 41.49° at s = 0.5; 82.98° only once at G0.
    const u0 = stopParameter(GALLERY, 1);
    const bearingDeg = (pose: ReturnType<typeof samplePose>): number => {
      const hx = (pose.target[0] ?? 0) - (pose.position[0] ?? 0);
      const hz = (pose.target[2] ?? 0) - (pose.position[2] ?? 0);
      return (Math.atan2(Math.abs(hz), hx) * 180) / Math.PI;
    };
    expect(bearingDeg(samplePose(GALLERY, back(GALLERY, u0 * 0.6)))).toBeCloseTo(33.19, 1);
    expect(bearingDeg(samplePose(GALLERY, back(GALLERY, u0 * 0.5)))).toBeCloseTo(41.49, 1);
    expect(bearingDeg(samplePose(GALLERY, restingAt(0)))).toBeCloseTo(82.98, 1);
  });
  it('a vertical destination aim at departure yields no NaN and the committed gaze', () => {
    // FIXUPS 2's pin, R19-ux C: re-derived by measurement — a destination aim straight above
    // the camera never produces NaN (the no-NaN pin), and at k = u0 + ε the gaze stays within
    // O(ε) of the committed one: the frozen-source law's first-order start turns w ≈ 1.6e-5
    // of the 140° source↔destination arc at ε = 1e-6 (measured 0.00224°, bound 0.0025).
    const UP: Rail = { stops: [stop('a', [0, 1.7, 0]), aimed('b', [0, 1.7, -6], [0, 6.7, 0])] };
    expect(samplePose(UP, restingAt(0)).target).toEqual(UP.stops[1]?.position); // the fence
    const pose = samplePose(UP, restingAt(1e-6)); // inside the blend, w ≈ 0
    for (const v of pose.target) expect(Number.isFinite(v), 'no NaN').toBe(true);
    const p = pose.position;
    expect(
      angleDeg(unitDir(pose.target, p), unitDir(UP.stops[1]?.position ?? p, p)),
      'the committed gaze direction at w ≈ 0',
    ).toBeLessThan(0.0025);
  });
  it('the seed sets the entry direction (backward entry = −1)', () => {
    expect(seedState(STAIR, { stop: 'd', cam: null }).state.heading).toBe(-1);
    expect(seedState(STAIR, { stop: 'a', cam: null }).state.heading).toBe(1);
    expect(seedState(STAIR, { stop: null, cam: 0.5 }).state.heading).toBe(1);
    expect(seedState(STAIR, { stop: null, cam: 7 }).state.heading).toBe(-1);
    expect(seedState(STAIR, { stop: null, cam: null }).state.heading).toBe(1);
  });
});

describe('look limits', () => {
  it('moves limits with turn phase, then holds the destination rows', () => {
    const started = stepStop(GALLERY, restingAt(0), 1, false).state;
    const halfway = advance(GALLERY, started, STEP_GLIDE_MS * 0.2);
    const limits = sampleLimits(GALLERY, halfway);
    expect(limits.yaw).toBeCloseTo(25, 7);
    expect(limits.pitchUp).toBe(15);
    expect(limits.pitchDown).toBe(15);
    const held = advance(GALLERY, started, STEP_GLIDE_MS * 0.4);
    expect(sampleLimits(GALLERY, held)).toEqual({ yaw: 30, pitchUp: 15, pitchDown: 15 });
  });
  it('clamp drag offsets', () => {
    // r21: drag accumulates the clamped TARGET; the rendered look eases in advance().
    expect(drag(STAIR, restingAt(0), 1000, -1000, 800, 'mouse').lookTarget).toEqual({
      yaw: 30,
      pitch: -10,
    });
  });
  it('re-clamp when a glide narrows them', () => {
    const wide = drag(STAIR, restingAt(2 / 3), 2000, 0, 800, 'mouse');
    expect(wide.lookTarget.yaw).toBe(60);
    const backState = run(STAIR, stepStop(STAIR, wide, -1, false).state);
    expect(backState.look.yaw).toBe(30);
  });
  it('leave the never-dragged state bit-identical at rest (the r21 golden gate)', () => {
    const s = restingAt(0);
    expect(advance(STAIR, s, 16)).toBe(s); // the eased look hands back the same reference
  });
});

describe('keyboard stepping', () => {
  it('glides stop to stop monotonically and bounds the far end', () => {
    let state = restingAt(0);
    for (let i = 1; i < STAIR.stops.length; i++) {
      const r = stepStop(STAIR, state, 1, false);
      expect(r.boundary).toBeNull();
      let prev = r.state.u;
      state = r.state;
      while (state.glide !== null) {
        state = advance(STAIR, state, 16);
        expect(state.u).toBeGreaterThanOrEqual(prev);
        prev = state.u;
      }
      expect(state.u).toBe(stopParameter(STAIR, i));
    }
    const end = stepStop(STAIR, state, 1, false);
    expect(end.boundary).toBe('forward');
    expect(end.state).toBe(state);
  });
  it('bounds the near end and both ends of a single-stop node', () => {
    expect(stepStop(STAIR, restingAt(0), -1, false).boundary).toBe('backward');
    expect(stepStop(POINT, restingAt(0), 1, false).boundary).toBe('forward');
    expect(stepStop(POINT, restingAt(0), -1, false).boundary).toBe('backward');
  });
  it('retargets a glide in flight to the following stop', () => {
    const mid = advance(STAIR, stepStop(STAIR, restingAt(0), 1, false).state, 300);
    const second = stepStop(STAIR, mid, 1, false).state;
    expect(second.glide?.to).toBeCloseTo(2 / 3);
    expect(second.glide?.from).toBe(mid.u);
  });
});

describe('advance and reduced motion', () => {
  it('cuts instead of gliding', () => {
    const r = stepStop(STAIR, restingAt(0), 1, true);
    expect(r.state.glide).toBeNull();
    expect(r.state.u).toBe(stopParameter(STAIR, 1));
  });
  it('rejects bad deltas', () => {
    for (const d of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => advance(STAIR, restingAt(0), d)).toThrow(RangeError);
    }
  });
  it('settles exactly after the R19-ux 2380-ms step duration', () => {
    expect(STEP_GLIDE_MS).toBe(2380);
    const started = stepStop(STAIR, restingAt(0), 1, false).state;
    expect(started.glide?.durationMs).toBe(2380);
    const before = advance(STAIR, started, 2379);
    expect(before.glide).not.toBeNull();
    const done = advance(STAIR, before, 1);
    expect(done.glide).toBeNull();
    expect(done.u).toBe(stopParameter(STAIR, 1));
  });
});

describe('scroll', () => {
  it('clamps at both ends without a boundary', () => {
    expect(scroll(LINE, restingAt(1), 10_000, true).u).toBe(1);
    expect(scroll(LINE, restingAt(0), -10_000, true).u).toBe(0);
  });
  it('extends a scroll glide in flight', () => {
    // 120 px = 0.1 segment at SCROLL_PX_PER_SEGMENT 1200 over one segment (the two-stop LINE).
    const first = scroll(LINE, restingAt(0), 120, false);
    const second = scroll(LINE, advance(LINE, first, 50), 120, false);
    expect(second.glide?.to).toBeCloseTo(0.2);
    expect(second.glide?.from).toBe(0);
  });
  it('does nothing on a single-stop node', () => {
    const rest = restingAt(0);
    expect(scroll(POINT, rest, 500, false)).toBe(rest);
  });
  it('never crosses a corner stop: the target clamps at Gj and the next delta walks on', () => {
    const blocked = scroll(GALLERY, restingAt(0), 20_000, false);
    expect(blocked.glide?.to).toBe(stopParameter(GALLERY, 1));
    expect(blocked.glide?.kind).toBe('scroll');
    expect(blocked.heading).toBe(1);
    const arrived = run(GALLERY, blocked);
    expect(arrived.u).toBe(stopParameter(GALLERY, 1));
    // The next delta starts a new glide from the corner (its own barrier excludes itself).
    const onward = scroll(GALLERY, arrived, 20_000, false);
    expect(onward.glide?.to).toBe(1);
  });
  it('never crosses a corner stop going back either', () => {
    const blocked = scroll(GALLERY_1812, restingAt(1), -20_000, false);
    expect(blocked.glide?.to).toBe(stopParameter(GALLERY_1812, 3));
  });
});

describe('corner runs and the approach field (R18-ux D3)', () => {
  it('without corner flags positionAt is bit-identical across every committed rail', () => {
    for (const rail of UNFLAGGED) {
      // The OLD committed path, computed inline: global centripetal CR with end phantoms.
      const n = rail.stops.length;
      const mirrorOf = (a: Vec3, b: Vec3): Vec3 => [
        2 * a[0] - b[0],
        2 * a[1] - b[1],
        2 * a[2] - b[2],
      ];
      const control = (index: number): Vec3 => {
        const first = rail.stops[0]?.position ?? [0, 0, 0];
        const second = rail.stops[1]?.position ?? [0, 0, 0];
        const last = rail.stops[n - 1]?.position ?? [0, 0, 0];
        const preLast = rail.stops[n - 2]?.position ?? [0, 0, 0];
        if (index < 0) return mirrorOf(first, second);
        if (index >= n) return mirrorOf(last, preLast);
        return rail.stops[index]?.position ?? [0, 0, 0];
      };
      const distOf = (a: Vec3, b: Vec3): number =>
        Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const l3 = (x: Vec3, y: Vec3, w: number): Vec3 => [
        x[0] + (y[0] - x[0]) * w,
        x[1] + (y[1] - x[1]) * w,
        x[2] + (y[2] - x[2]) * w,
      ];
      const cat = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 => {
        const t1 = Math.max(1e-6, Math.sqrt(distOf(p0, p1)));
        const t2 = t1 + Math.max(1e-6, Math.sqrt(distOf(p1, p2)));
        const t3 = t2 + Math.max(1e-6, Math.sqrt(distOf(p2, p3)));
        const s = t1 + (t2 - t1) * t;
        const a1 = l3(p0, p1, (s - 0) / t1);
        const a2 = l3(p1, p2, (s - t1) / (t2 - t1));
        const a3 = l3(p2, p3, (s - t2) / (t3 - t2));
        const b1 = l3(a1, a2, (s - 0) / (t2 - 0));
        const b2 = l3(a2, a3, (s - t1) / (t3 - t1));
        return l3(b1, b2, (s - t1) / (t2 - t1));
      };
      for (let i = 0; i + 1 < n; i++) {
        for (let k = 1; k < 32; k++) {
          const u = (i + k / 32) / (n - 1);
          const tLoc = u * (n - 1) - i; // the module's locate() reconstruction of t
          const at = samplePosition(rail, u);
          const old = cat(control(i - 1), control(i), control(i + 1), control(i + 2), tLoc);
          expect([...at], `${rail.stops[i]?.id} k ${k}`).toEqual([...old]);
        }
      }
    }
  });
  it('with corner on Gj the run Gj→G2 rides y = 1.7, z = 73 (±1e-9); the chord stays in 0..1.6', () => {
    for (let k = 0; k <= 256; k++) {
      const u = (1 + k / 256) / 3;
      const at = samplePosition(GALLERY, u);
      expect(at[1], `y at u ${u.toFixed(4)}`).toBeCloseTo(1.7, 9);
      expect(at[2], `z at u ${u.toFixed(4)}`).toBeCloseTo(73, 9);
      expect(at[0], `x at u ${u.toFixed(4)}`).toBeGreaterThanOrEqual(1.6 - 1e-9);
      expect(at[0], `x at u ${u.toFixed(4)}`).toBeLessThanOrEqual(40.5 + 1e-9);
    }
    for (let k = 0; k <= 128; k++) {
      const u = k / 128 / 3;
      const x = samplePosition(GALLERY, u)[0] ?? Number.NaN;
      expect(x, `chord x at u ${u.toFixed(4)}`).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(x, `chord x at u ${u.toFixed(4)}`).toBeLessThanOrEqual(1.6 + 1e-9);
    }
  });
  it('a Forward glide into a stop with approach holds the approach point', () => {
    // R19-ux C: re-derived from the turnFrame law for this pair — θ(JUNCTION → GALLERY_MOUTH
    // at the G0 anchor) = 12.071° ≤ 45°, so the span does not widen: TURN_SPAN_T 0.31744
    // (k units; u 0.10581). R18's probe u = 0.1 (k 0.3) sat inside it, mid-turn; the hold
    // turns exact only past the span. Counter-asserts the sharper new-law pin: just before
    // the span ends the pose is not yet held.
    const pose = samplePose(GALLERY, restingAt(0.108)); // k 0.324, past the span
    expect(pose.target).toEqual([4.4, 1.7, 73]);
    const turning = samplePose(GALLERY, restingAt(0.105)); // k 0.315, inside the span
    expect(turning.target).not.toEqual([4.4, 1.7, 73]);
  });
  it('a Back glide into the approach stop (and its own pose) keeps the subject', () => {
    const pose = samplePose(GALLERY, back(GALLERY, stopParameter(GALLERY, 1) + 0.05));
    expect(pose.target).toEqual(GALLERY.stops[1]?.subject); // EAST_DOOR on both sides
  });
  it('the 1812 corner run M3→M4 stays inside the chord’s plan box', () => {
    // Segments 0–2 ride the axis exactly (the corner decouples M4's pull; pinned next file).
    for (let k = 1; k <= 64; k++) {
      const u = (3 + k / 64) / 4;
      const at = samplePosition(GALLERY_1812, u);
      expect(at[0] ?? Number.NaN, `x at u ${u.toFixed(4)}`).toBeGreaterThanOrEqual(86.25 - 1e-9);
      expect(at[0] ?? Number.NaN, `x at u ${u.toFixed(4)}`).toBeLessThanOrEqual(88.5 + 1e-9);
      expect(at[2] ?? Number.NaN, `z at u ${u.toFixed(4)}`).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(at[2] ?? Number.NaN, `z at u ${u.toFixed(4)}`).toBeLessThanOrEqual(13 + 1e-9);
    }
  });
});

describe('seed precedence', () => {
  it('stop beats cam, unknown stop falls to cam, cam clamps, else entry', () => {
    expect(seedState(STAIR, { stop: 'c', cam: 0.1 })).toEqual({
      state: restingAt(stopParameter(STAIR, 2)),
      source: 'stop',
    });
    expect(seedState(STAIR, { stop: 'nope', cam: 0.1 }).source).toBe('cam');
    expect(seedState(STAIR, { stop: null, cam: 7 }).state.u).toBe(1);
    expect(seedState(STAIR, { stop: null, cam: null })).toEqual({
      state: restingAt(0),
      source: 'entry',
    });
  });
});

describe('square rail (design §6.1, declared data; R18-ux D1)', () => {
  it('pins the three declared stops', () => {
    expect(SQUARE_RAIL.stops.map((s) => s.id)).toEqual(['S0', 'Sh', 'S1']);
    expect(SQUARE_RAIL.stops[0]?.position).toEqual([0, 1.7, 230]);
    expect(SQUARE_RAIL.stops[0]?.look).toEqual({ yaw: 35, pitchUp: 35, pitchDown: 35 });
    expect(t(SQUARE_RAIL.stops[0]?.caption ?? 'caption.s0')).toBe('the facade and the hour');
    expect(SQUARE_RAIL.stops[1]?.position).toEqual([0, 1.7, 177]);
    expect(SQUARE_RAIL.stops[1]?.subject).toEqual(SQUARE_SH_GAZE);
    expect(SQUARE_RAIL.stops[1]?.look).toEqual({ yaw: 30, pitchUp: 25, pitchDown: 20 });
    expect(SQUARE_RAIL.stops[2]?.position).toEqual([0, 1.7, 124]);
    expect(SQUARE_RAIL.stops[2]?.look).toEqual({ yaw: 25, pitchUp: 20, pitchDown: 10 });
    expect(t(SQUARE_RAIL.stops[2]?.caption ?? 'caption.s1')).toBe('the arch opens');
  });
  it('carries the S0, halfway and arch-mouth gazes as the stops’ subjects (R18-ux D1)', () => {
    expect(SQUARE_RAIL.stops[0]?.subject).toEqual(SQUARE_S0_GAZE);
    expect(SQUARE_RAIL.stops[1]?.subject).toEqual(SQUARE_SH_GAZE);
    expect(SQUARE_RAIL.stops[2]?.subject).toEqual(SQUARE_S1_GAZE);
    expect(samplePose(SQUARE_RAIL, restingAt(0)).target).toEqual(SQUARE_S0_GAZE);
    expect(samplePose(SQUARE_RAIL, restingAt(0.5)).target).toEqual(SQUARE_SH_GAZE);
    expect(samplePose(SQUARE_RAIL, restingAt(1)).target).toEqual(SQUARE_S1_GAZE);
    expect(SQUARE_S1_GAZE).toEqual([0, 6.6, 92]);
  });
});

describe('purity', () => {
  const sources = import.meta.glob('../src/camera/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(6); // rail + square-rail + cam-param + look + wheel-edge (r21, DEC-031) + door-lean (R-UX2)
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
