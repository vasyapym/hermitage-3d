import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import type { RailState } from '../src/camera/rail';
import {
  advance,
  drag,
  moving,
  REDUCED_DWELL_MS,
  restingAt,
  sampleLimits,
  samplePose,
  samplePosition,
  seedState,
  stopParameter,
  walkPress,
  walkRelease,
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

const FRAME = 16 + 2 / 3; // the walk rows' cadence — no real timers, advance() splits the frame

const runToRest = (rail: Rail, s: RailState): RailState => {
  let state = s;
  let guard = 0;
  while (moving(state) && guard++ < 2000) state = advance(rail, state, FRAME);
  return state;
};
/** A tap: one press lifted below the hold bar — the lease keeps draining from the press. */
const tap = (rail: Rail, s: RailState, direction: 1 | -1): RailState =>
  walkRelease(walkPress(rail, s, direction, false, false).state, direction);
/** The stop-index coordinate k of a state's u (one stop gap = 1). */
const stateK = (rail: Rail, s: RailState): number => s.u * (rail.stops.length - 1);

/** R18-ux verdict 2: a state overridden into a backward-heading pose (walk-free sampling). */
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
  // (B9: the old «holds the destination's committed target after the departure turn» row is
  // superseded by tests/rail-b9.test.ts's field law — no point hold exists mid-segment.)
});

describe('authored subjects (R-UX5 §8, D6)', () => {
  it('returns the stop’s subject by reference at the stop (the golden fence)', () => {
    expect(samplePose(AIMED, restingAt(0)).target).toBe(AIMED.stops[0]?.subject);
    expect(samplePose(AIMED, restingAt(1)).target).toBe(AIMED.stops[1]?.subject);
  });
  it('travels the framing arc for the whole segment: exact framings at both ends, no point hold (B9)', () => {
    // B9: no turn span and no cap — the aim carries the arc between the two framings for
    // the WHOLE segment and meets B's framing only at the arrival.
    const aPos = AIMED.stops[0]?.position ?? [0, 0, 0];
    const bPos = AIMED.stops[1]?.position ?? [0, 0, 0];
    const aDir = unitDir(A, aPos);
    const chord = angleDeg(aDir, unitDir(B, bPos));
    for (const s of [0.41, 0.6, 0.9]) {
      const pose = samplePose(AIMED, restingAt(s));
      const share = angleDeg(aDir, unitDir(pose.target, pose.position));
      expect(share, `mid-turn arc share at s ${s}`).toBeGreaterThan(0);
      expect(share, `arc share short of the arrival at s ${s}`).toBeLessThan(chord);
      expect(pose.target === B, 'no destination object hold mid-segment').toBe(false);
    }
    expect(samplePose(AIMED, restingAt(0)).target).toBe(A);
    expect(samplePose(AIMED, restingAt(1)).target).toBe(B);
  });
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
    'meets the destination’s committed object only at the destination when either end of ' +
      'a segment is subjectless (B9 framing law)',
    () => {
      const MIXED: Rail = { stops: [aimed('a', [0, 1.6, 0], A), stop('b', [0, 1.6, -10])] };
      expect(samplePose(MIXED, restingAt(0)).target).toBe(A);
      expect(samplePose(MIXED, restingAt(1)).target).toEqual(MIXED.stops[0]?.position);
      // The destination b is subjectless AND last: its committed object is the pose-law
      // look-back point (a's position), and the arrival framing meets exactly that.
      // Mid-segment the aim travels the arc between the framings — no point hold.
      const midPose = samplePose(MIXED, restingAt(0.5));
      expect(midPose.target === A, 'no source object hold mid-segment').toBe(false);
      const aPos = MIXED.stops[0]?.position ?? [0, 0, 0];
      expect(
        angleDeg(unitDir(midPose.target, midPose.position), unitDir(A, aPos)),
        'off A mid',
      ).toBeGreaterThan(1e-6);
      expect(
        angleDeg(
          unitDir(midPose.target, midPose.position),
          unitDir(MIXED.stops[0]?.position ?? aPos, MIXED.stops[1]?.position ?? [0, 0, -10]),
        ),
        'off the arrival framing mid',
      ).toBeGreaterThan(1e-6);
    },
  );
});

describe('the travel law (B9 field, superseding the R18/R19 departure turns)', () => {
  it('a Back-heading state from i+1 to i holds subject i at the backward destination framing (B9)', () => {
    // The fence at the arrival: the backward destination stop's framing object. Mid-segment
    // the aim travels the arc between the framings — no point hold exists.
    const pose = samplePose(AIMED, back(AIMED, 0));
    expect(pose.target).toBe(A); // t = 0: the committed fence
    expect(samplePose(AIMED, back(AIMED, 0.5)).target).not.toBe(A);
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
  it('arrival exactness: the walk lands on the destination stop’s committed object', () => {
    // The destination's held target IS the stop's committed target (continuous with the
    // fence): arriving at b, the pose looks at c's committed object.
    const done = runToRest(STAIR, tap(STAIR, restingAt(0), 1));
    expect(done.walk).toBeNull();
    expect(done.u).toBe(stopParameter(STAIR, 1));
    const pose = samplePose(STAIR, done);
    expect(pose.target).toEqual(STAIR.stops[2]?.position);
  });
  it('Back Gj→G0 turns from the fence at Gj; the hold lands only at G0 (B9 framings)', () => {
    // B9: the framings carry the whole 83° for the whole segment (the near-field class
    // retired — its distance weight is now every pair's law). The fence holds at the exact
    // stops; east of the fence the aim is strictly between the framings.
    const just = samplePose(GALLERY, back(GALLERY, stopParameter(GALLERY, 1)));
    expect(just.target).toBe(GALLERY.stops[1]?.subject); // the Gj fence pose
    const mid = samplePose(GALLERY, back(GALLERY, stopParameter(GALLERY, 1) - 0.401 / 3));
    expect(mid.target).not.toBe(GALLERY.stops[0]?.subject); // still on the arc mid-segment
    const g0 = samplePose(GALLERY, back(GALLERY, 0));
    expect(g0.target).toBe(GALLERY.stops[0]?.subject); // the G0 fence pose
  });
  it('a mid-walk reversal re-anchors at the turnaround and keeps the per-16ms gaze change ≤ 3° (the step world)', () => {
    // The widest committed turn (θ = 90° at the widened span 0.36 ≈ 1034 ms of 2800) peaks
    // ≈ 2.6°/frame — 90° · smootherstep's 1.875× peak slope / 1034 ms · 16 ms. The bound 3°
    // is the step world's catch-all; measured worst on the STAIR reversal ≈ 1.2°. The re-anchor
    // instant is the TURNAROUND (the heading flip), not the press.
    const press = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const inFlight = advance(STAIR, press, 1200); // well into the first cruise (k ≈ 0.66)
    const reversed = walkPress(STAIR, inFlight, -1, false, false).state; // the opposite press
    expect(reversed.walk).not.toBeNull();
    expect(reversed.walk?.phase).toBe('brake');
    expect(reversed.walk?.reversalTo).toBe(-1);
    expect(reversed.heading).toBe(1); // the heading flips at the turnaround, not at the press
    expect(reversed.anchor).toBeNull();
    let guard = 0;
    let prevPose = samplePose(STAIR, inFlight);
    let state = reversed;
    let turned: RailState | null = null;
    // The reversal press stays held: the live intent departs backward at the turnaround and
    // the hard end stop 0 ends the walk there.
    while ((state.walk !== null || turned === null) && guard++ < 400) {
      state = advance(STAIR, state, FRAME);
      if (turned === null && state.heading === -1) {
        turned = state;
        expect(state.anchor).not.toBeNull(); // the look in force at the turnaround
        expect(state.anchor?.u0).toBeCloseTo(0.8, 6); // press k 0.66 + the 0.14 turnaround shift
        expect(state.walk?.phase).toBe('accel');
      }
      const pose = samplePose(STAIR, state);
      expect(aimStepDeg(prevPose, pose), `frame ${guard}`).toBeLessThanOrEqual(3);
      prevPose = pose;
    }
    expect(turned).not.toBeNull();
    expect(state.walk).toBeNull();
    expect(state.u).toBe(0); // the walk rests back at a
  });
  it('a held walk into the Gj corner never passes it and bounds the per-16ms gaze change', () => {
    // The walk replaces the retired 544-ms scroll approach into the corner: the corner stop
    // is HARD under the walk too — the brake lands ON Gj and live intent re-departs at once.
    // The wide 83° turn now rides the walk's pace law (83° over the ≥1500 ms cruise leg), so
    // the per-16ms aim step keeps the same 6.3° bound class the old 544 ms escape measured.
    let state = walkPress(GALLERY, restingAt(0), 1, false, false).state;
    let prevPose = samplePose(GALLERY, state);
    let worst = 0;
    let crossed = false;
    let guard = 0;
    const corner = stopParameter(GALLERY, 1);
    while (state.walk !== null && guard++ < 1200) {
      const prevU = state.u;
      state = advance(GALLERY, state, FRAME);
      const pose = samplePose(GALLERY, state);
      const degrees = aimStepDeg(prevPose, pose);
      expect(Number.isFinite(degrees), `frame ${guard}`).toBe(true);
      worst = Math.max(worst, degrees);
      prevPose = pose;
      // The corner's exact landing happens inside the event splitting: the first returned
      // frame past Gj proves the brake landed ON the corner — anchor cleared, walk alive
      // (the atomic re-depart: no rest frame while the intent lives), and never skipped.
      if (!crossed && prevU < corner && state.u >= corner) {
        crossed = true;
        expect(state.anchor).toBeNull(); // the exact landing cleared the look anchor
        expect(state.walk?.phase).toBe('accel'); // the re-depart, already gone from Gj
        expect(state.u).toBeLessThan(corner + 1e-6); // one frame of the ramp at most
        expect(state.u).toBeGreaterThan(corner - 1e-9);
      }
    }
    expect(crossed, 'the walk met the corner exactly').toBe(true);
    expect(worst).toBeLessThanOrEqual(6.3);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(GALLERY, 3)); // the far hard end rests
  });
  it('the Back Gj→G0 pitch climbs linearly in distance, monotonically to its 3.06° settle (B9)', () => {
    // B9: the framings carry the WHOLE segment — the blend weight IS the distance fraction
    // w = 1 − 3u, so pitch = settle·w exactly (0.07 of the settle at the 7th-percent sample,
    // half the settle at mid-distance). The old near-field curve (2.615° at its 7% spot)
    // is retired.
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
    expect(pitches[69] ?? Number.NaN).toBeCloseTo(settle * 0.07, 3);
    expect(pitches[499] ?? Number.NaN).toBeCloseTo(settle * 0.5, 3);
    expect(settle).toBeCloseTo(3.0591, 3);
  });

  it('Back Gj→G0 spans the whole heading: the framings’ 83° pan half at mid-segment (B9)', () => {
    // B9: the yaw reads the arc between the two framings — 82.98° off +x — with the same
    // distance weight: 33.19° at w = 0.4 (u0·0.6), 41.49° at w = 0.5, and the fence's
    // 82.98° only once at G0. (The recorded numbers coincide with the old row's: the old
    // near-field law and B9 agree numerically on this pair's shape.)
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
  it('moves limits with the distance weight, then holds the destination rows (B9)', () => {
    // B9: the limits blend over the WHOLE remaining segment with the travelled-distance
    // weight — walk-driven now: the walk reaches the same mid-segment positions the old
    // glide row sampled, and the weight is position-only, so the pins read the blend at
    // the actual k. G0's rows yaw 20 → Gj's yaw 30; pitch rows equal (15/15).
    const press = walkPress(GALLERY, restingAt(0), 1, false, false).state;
    const walkTo = (targetK: number): RailState => {
      let state = press;
      while (state.u * (GALLERY.stops.length - 1) < targetK) {
        state = advance(GALLERY, state, FRAME);
      }
      return state;
    };
    const fifth = walkTo(0.05792);
    const wFifth = stateK(GALLERY, fifth) - 0;
    expect(sampleLimits(GALLERY, fifth).yaw).toBeCloseTo(20 + 10 * wFifth, 6);
    const held = walkTo(0.31744);
    expect(sampleLimits(GALLERY, held).yaw).toBeCloseTo(20 + 10 * (stateK(GALLERY, held) - 0), 6);
    expect(sampleLimits(GALLERY, held).pitchUp).toBe(15);
    expect(sampleLimits(GALLERY, held).pitchDown).toBe(15);
    // the arrival holds the destination rows exactly
    const done = runToRest(GALLERY, tap(GALLERY, restingAt(0), 1));
    expect(sampleLimits(GALLERY, done)).toEqual({ yaw: 30, pitchUp: 15, pitchDown: 15 });
  });
  it('clamp drag offsets', () => {
    // r21: drag accumulates the clamped TARGET; the rendered look eases in advance().
    expect(drag(STAIR, restingAt(0), 1000, -1000, 800, 'mouse').lookTarget).toEqual({
      yaw: 30,
      pitch: -10,
    });
  });
  it('re-clamp when a walk narrows them', () => {
    // r21: the mid-segment drag is wide (2/3 of the STAIR's k range is stop c's ±60 row);
    // the backward walk re-clamps both fields at the rest stop's rows (yaw 30).
    const wide = drag(STAIR, restingAt(2 / 3), 2000, 0, 800, 'mouse');
    expect(wide.lookTarget.yaw).toBe(60);
    const backState = runToRest(STAIR, tap(STAIR, wide, -1));
    expect(backState.look.yaw).toBe(30);
  });
  it('leave the never-dragged state bit-identical at rest (the r21 golden gate)', () => {
    const s = restingAt(0);
    expect(advance(STAIR, s, 16)).toBe(s); // the eased look hands back the same reference
  });
});

describe('walk law (presses assert intent, the walk owns the pace)', () => {
  it('a tap walks one gap monotonically and lands exactly; a fresh edge at the far end is the boundary', () => {
    let state = restingAt(0);
    for (let i = 1; i < STAIR.stops.length; i++) {
      const press = walkPress(STAIR, state, 1, false, false);
      expect(press.boundary).toBeNull();
      // A tap: ~33 ms of hold (below the hold bar), then the lift — the lease keeps draining.
      state = advance(STAIR, press.state, FRAME * 2);
      expect(state.walk).not.toBeNull();
      state = walkRelease(state, 1);
      let prev = state.u;
      while (state.walk !== null) {
        state = advance(STAIR, state, FRAME);
        expect(state.u).toBeGreaterThanOrEqual(prev);
        prev = state.u;
      }
      expect(state.u).toBe(stopParameter(STAIR, i));
    }
    const end = walkPress(STAIR, state, 1, false, false);
    expect(end.boundary).toBe('forward');
    expect(end.state).toBe(state);
  });
  it('bounds the near end and both ends of a single-stop node', () => {
    expect(walkPress(STAIR, restingAt(0), -1, false, false).boundary).toBe('backward');
    expect(walkPress(POINT, restingAt(0), 1, false, false).boundary).toBe('forward');
    expect(walkPress(POINT, restingAt(0), -1, false, false).boundary).toBe('backward');
  });
  it('a repeat press rests and does nothing on a single-stop node (a hold never opens a door)', () => {
    const rest = restingAt(0);
    expect(walkPress(POINT, rest, 1, true, false)).toEqual({ state: rest, boundary: null });
    expect(walkPress(POINT, rest, 1, true, false).state).toBe(rest);
  });
  it('a press mid-walk never picks a destination: the walk keeps its heading, one leg per tap', () => {
    // The old retarget row picked the FOLLOWING stop; the walk law replaces destination
    // picking with intent. The mid-walk press refills the lease and the leg still ends at
    // the NEXT stop in the heading (one stop gap), never two.
    const press = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const mid = advance(STAIR, press, 300); // mid-accel
    expect(mid.walk).not.toBeNull();
    const again = walkPress(STAIR, mid, 1, false, false).state;
    expect(again.walk?.heading).toBe(1);
    const landed = runToRest(STAIR, walkRelease(again, 1));
    expect(landed.walk).toBeNull();
    expect(landed.u).toBe(stopParameter(STAIR, 1)); // one gap, exactly
  });
});

describe('reduced motion (the cut law)', () => {
  it('cuts instead of walking', () => {
    const r = walkPress(STAIR, restingAt(0), 1, false, true);
    expect(r.boundary).toBeNull();
    expect(r.state.walk).toBeNull();
    expect(r.state.u).toBe(stopParameter(STAIR, 1));
    expect(r.state.dwellMs).toBe(REDUCED_DWELL_MS);
  });
  it('a press during the dwell is dropped; repeats are ignored', () => {
    const cut = walkPress(STAIR, restingAt(0), 1, false, true).state;
    const during = walkPress(STAIR, cut, 1, false, true).state;
    expect(during).toBe(cut); // the dwell drops the press — not queued
    const repeat = walkPress(STAIR, cut, 1, true, true).state;
    expect(repeat).toBe(cut);
  });
  it('the boundary fires before the dwell check (a door press is not a cut storm)', () => {
    // A cut seeds the dwell at the settled END (stop 3); the follow-up press then meets the
    // end's no-next-stop branch — the boundary wins over the dwell.
    const cut = walkPress(STAIR, restingAt(stopParameter(STAIR, 2)), 1, false, true).state;
    expect(cut.dwellMs).toBe(REDUCED_DWELL_MS); // the cut planted the dwell
    expect(cut.u).toBe(1);
    const fired = walkPress(STAIR, cut, 1, false, true);
    expect(fired.boundary).toBe('forward');
    expect(fired.state.walk).toBeNull();
  });
  it('rejects bad deltas', () => {
    for (const d of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => advance(STAIR, restingAt(0), d)).toThrow(RangeError);
    }
  });
});

describe('corner barriers under the walk', () => {
  it('a tap rests AT the corner stop: the Forward walk from G0 never passes Gj', () => {
    const rested = runToRest(GALLERY, tap(GALLERY, restingAt(0), 1));
    expect(rested.walk).toBeNull();
    expect(rested.u).toBe(stopParameter(GALLERY, 1)); // the corner, never past it
    expect(rested.heading).toBe(1);
  });
  it('the next delta after the corner walks on from it (its own barrier excludes itself)', () => {
    const rested = runToRest(GALLERY, tap(GALLERY, restingAt(0), 1));
    const onward = tap(GALLERY, rested, 1);
    expect(onward.walk).not.toBeNull(); // a walk departs the corner (the corner is no wall)
    const landed = runToRest(GALLERY, onward);
    expect(landed.u).toBe(stopParameter(GALLERY, 2)); // the next stop past the corner
  });
  it('never crosses a corner stop going back either: the 1812 backward tap rests at M3', () => {
    const rested = runToRest(contract1812.rail, tap(contract1812.rail, restingAt(1), -1));
    expect(rested.walk).toBeNull();
    expect(rested.u).toBe(stopParameter(contract1812.rail, 3));
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
  it('a Forward approach into Gj reads the committed framings on both headings (B9)', () => {
    // B9: GALLERY_MOUTH stays recorded but no longer steers — the aim travels the arc
    // between G0's JUNCTION framing and Gj's EAST_DOOR framing, identical at both
    // headings on the same rail point (the field law), and the arrival meets EAST_DOOR.
    const fwd = samplePose(GALLERY, restingAt(0.108));
    const bwd = samplePose(GALLERY, back(GALLERY, 0.108));
    expect(
      angleDeg(unitDir(fwd.target, fwd.position), unitDir(bwd.target, bwd.position)),
      'the field at u 0.108 both headings',
    ).toBeLessThan(1e-6);
    const arrived = samplePose(GALLERY, restingAt(stopParameter(GALLERY, 1)));
    expect(arrived.target).toBe(GALLERY.stops[1]?.subject); // EAST_DOOR at the ex-approach stop
  });
  it('a Back approach into the approach stop (and its own pose) keeps the subject', () => {
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
    // DEC-037: the rail runs west of the Column axis — S0 24 m, Sh 12 m, S1 on the axis.
    expect(SQUARE_RAIL.stops[0]?.position).toEqual([-24, 1.7, 230]);
    expect(SQUARE_RAIL.stops[0]?.look).toEqual({ yaw: 35, pitchUp: 35, pitchDown: 35 });
    expect(t(SQUARE_RAIL.stops[0]?.caption ?? 'caption.s0')).toBe('the facade and the hour');
    // DEC-037: Sh moved off the axis with the west rail (z 177 unchanged).
    expect(SQUARE_RAIL.stops[1]?.position).toEqual([-12, 1.7, 177]);
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
    // rail + square-rail + cam-param + look + look-param (W5, the det ?look= parser) +
    // door-lean (R-UX2, the press-edge pulse) + portrait-frame (brief 19 §A). The wheel-edge
    // module is retired with the wheel (the movement-ux ruling).
    expect(Object.keys(sources)).toHaveLength(7);
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
