// B10 — the departure absorbs the look (design-walkthrough-ux.md §8, the 2026-11-16 owner
// report). At every anchor the press path creates — a press from rest (at a stop or
// mid-segment) and a reversal's turnaround — the arc's source aim freezes at the look in
// force (the base gaze composed with the user's offset) and the offset is absorbed: both look
// fields return to zero in the same frame, the view does not jump, and every arrival lands on
// the author's frame exactly. A never-dragged walk is bit-identical (the golden fence). No
// camera, no DOM — pure rail law.
import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import {
  advance,
  committedTarget,
  composeAim,
  type RailState,
  restingAt,
  samplePose,
  samplePosition,
  stopParameter,
  walkPress,
  walkRelease,
} from '../src/camera/rail';
import { SQUARE_RAIL, SQUARE_S1_GAZE } from '../src/camera/square-rail';
import type { Rail, Vec3 } from '../src/world/registry';

const DEG = 180 / Math.PI;
const FRAME = 16 + 2 / 3; // the walk rows' cadence — no real timers, event-split slices
// The head law's MAX_SWING_DEG 90 (§9, tests/stops.test.ts) governs the DEFAULT gaze; B10's
// absorbed look has no universal 90° bound — the census row below records each rail's worst
// corner for the owner's eye instead.

const aimOf = (position: Vec3, target: Vec3): { yaw: number; pitch: number } => {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  return { yaw: Math.atan2(dx, -dz) * DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * DEG };
};
/** The rail's own angle space (radians) — composeAim's base unit. */
const radAim = (position: Vec3, target: Vec3): { yaw: number; pitch: number } => {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
};
const wrapDeg = (d: number): number => {
  let x = d;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
};
/** A direction from angles, in degrees — the test's own trig, independent of rail.ts. */
const forwardOf = (yawDeg: number, pitchDeg: number): Vec3 => {
  const yaw = yawDeg / DEG;
  const pitch = pitchDeg / DEG;
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c];
};
/** The HOST's composition (main.ts), raw: lookAt the base target, then −look.yaw about world
 * up (yaw > 0 turns right), then +look.pitch about the camera's horizontal right. Derived
 * from the raw rotations, never assumed: the yaw rotation preserves the horizontal length,
 * and the pitch rotation about that horizontal right is the exact tangent addition — the
 * horizontal scale carries the cross-term (cos ε − (dy/h)·sin ε), the vertical gains h·sin ε. */
const renderedAim = (pose: {
  position: Vec3;
  target: Vec3;
  look: { yaw: number; pitch: number };
}): { yaw: number; pitch: number } => {
  const dx = pose.target[0] - pose.position[0];
  const dy = pose.target[1] - pose.position[1];
  const dz = pose.target[2] - pose.position[2];
  const th = (-pose.look.yaw * Math.PI) / 180;
  const cx = dx * Math.cos(th) + dz * Math.sin(th);
  const cz = -dx * Math.sin(th) + dz * Math.cos(th);
  const h = Math.hypot(cx, cz);
  const lift = (pose.look.pitch * Math.PI) / 180;
  const scale = Math.cos(lift) - (dy / h) * Math.sin(lift);
  return {
    yaw: Math.atan2(cx, -cz) * DEG,
    pitch: Math.atan2(dy * Math.cos(lift) + h * Math.sin(lift), h * scale) * DEG,
  };
};
const dragged = (rail: Rail, index: number, look: { yaw: number; pitch: number }): RailState => ({
  ...restingAt(stopParameter(rail, index)),
  look,
  lookTarget: look,
});
const stopOrThrow = (rail: Rail, index: number) => {
  const stop = rail.stops[index];
  if (stop === undefined) throw new Error(`rail has no stop ${index}`);
  return stop;
};
/** The square's committed yaw swing S0→S0b, from the data. */
const committedSwing = (rail: Rail): number =>
  wrapDeg(aimOf(stopOrThrow(rail, 1).position, committedTarget(rail, 1)).yaw) -
  wrapDeg(aimOf(stopOrThrow(rail, 0).position, committedTarget(rail, 0)).yaw);
/** The tap pattern (rail-b9.test.ts): press, a short flight, release, run the brake out. */
const tap = (rail: Rail, state: RailState, direction: 1 | -1): RailState => {
  let s = walkPress(rail, state, direction, false, false).state;
  s = advance(rail, s, 80); // the tap's flight
  s = walkRelease(s, direction);
  let guard = 0;
  while (s.walk !== null && guard++ < 400) s = advance(rail, s, FRAME);
  return s;
};

describe('B10: the departure absorbs the look', () => {
  it('golden fence: a never-dragged departure anchors bit-exact and reads the offset-0 arc', () => {
    const rail = SQUARE_RAIL;
    let anchored = walkPress(rail, restingAt(0), 1, false, false).state;
    // the anchor exists and carries the committed framing bit-exact (offset 0 ⇒ no composition)
    expect(anchored.anchor).not.toBeNull();
    expect(anchored.anchor?.point).toEqual(committedTarget(rail, 0));
    expect(anchored.look).toEqual({ yaw: 0, pitch: 0 });
    anchored = advance(rail, anchored, 80); // the tap's flight
    anchored = walkRelease(anchored, 1);
    let bare: RailState = { ...anchored, anchor: null };
    let guard = 0;
    while ((anchored.walk !== null || bare.walk !== null) && guard++ < 400) {
      anchored = advance(rail, anchored, FRAME);
      bare = advance(rail, bare, FRAME);
      expect(samplePose(rail, anchored).position).toEqual(samplePose(rail, bare).position);
      expect(samplePose(rail, anchored).target).toEqual(samplePose(rail, bare).target);
      expect(samplePose(rail, anchored).limits).toEqual(samplePose(rail, bare).limits);
    }
    expect(anchored.walk).toBeNull();
    expect(bare.walk).toBeNull();
    expect(anchored.u).toBe(stopParameter(rail, 1)); // both rest at S0b
  });

  it('a +20° dragged departure absorbs: no jump, look zeroed, sweep re-aimed, arrival exact', () => {
    const rail = SQUARE_RAIL;
    const beforeAim = renderedAim(samplePose(rail, dragged(rail, 0, { yaw: 20, pitch: 0 })));
    const pressed = walkPress(rail, dragged(rail, 0, { yaw: 20, pitch: 0 }), 1, false, false).state;
    expect(pressed.look).toEqual({ yaw: 0, pitch: 0 });
    expect(pressed.lookTarget).toEqual({ yaw: 0, pitch: 0 });
    const atZero = samplePose(rail, pressed);
    // no jump: the departure frame's rendered direction is the pre-press rendered direction
    expect(aimOf(atZero.position, atZero.target).yaw).toBeCloseTo(beforeAim.yaw, 6);
    expect(aimOf(atZero.position, atZero.target).pitch).toBeCloseTo(beforeAim.pitch, 6);
    // the walk lands on the author's frame exactly
    const done = tap(rail, pressed, 1);
    expect(done.walk).toBeNull();
    expect(done.u).toBe(stopParameter(rail, 1));
    expect(samplePose(rail, done).target).toEqual(committedTarget(rail, 1));
    // the realized sweep is the committed swing minus the absorbed 20°
    const donePose = samplePose(rail, done);
    const realized =
      wrapDeg(aimOf(donePose.position, committedTarget(rail, 1)).yaw) - beforeAim.yaw;
    expect(realized).toBeCloseTo(committedSwing(rail) - 20, 1);
  });

  it('a −20° dragged departure absorbs: the sweep grows over the committed swing, lands exact', () => {
    const rail = SQUARE_RAIL;
    const beforeAim = renderedAim(samplePose(rail, dragged(rail, 0, { yaw: -20, pitch: 0 })));
    const done = tap(rail, dragged(rail, 0, { yaw: -20, pitch: 0 }), 1);
    expect(done.u).toBe(stopParameter(rail, 1));
    expect(samplePose(rail, done).target).toEqual(committedTarget(rail, 1));
    const donePose = samplePose(rail, done);
    const realized =
      wrapDeg(aimOf(donePose.position, committedTarget(rail, 1)).yaw) - beforeAim.yaw;
    expect(realized).toBeCloseTo(committedSwing(rail) + 20, 1);
  });

  it('a pitch look absorbs the same way: the departure frame keeps it, the arrival is exact', () => {
    const rail = SQUARE_RAIL;
    const beforeAim = renderedAim(samplePose(rail, dragged(rail, 0, { yaw: 0, pitch: 10 })));
    const pressed = walkPress(rail, dragged(rail, 0, { yaw: 0, pitch: 10 }), 1, false, false).state;
    const atZero = samplePose(rail, pressed);
    expect(aimOf(atZero.position, atZero.target).pitch).toBeCloseTo(beforeAim.pitch, 6);
    const done = tap(rail, pressed, 1);
    expect(samplePose(rail, done).target).toEqual(committedTarget(rail, 1));
  });

  it('a mid-walk reversal absorbs at the turnaround: the back leg starts from the look in force', () => {
    const rail = SQUARE_RAIL;
    const press = walkPress(rail, restingAt(0), 1, false, false).state;
    let state = advance(rail, press, 400); // mid-walk, past the accel ramp
    state = { ...state, look: { yaw: 10, pitch: 0 }, lookTarget: { yaw: 10, pitch: 0 } };
    const reversed = walkPress(rail, state, -1, false, false).state;
    expect(reversed.walk?.phase).toBe('brake'); // the reversal brakes to the turnaround
    expect(reversed.heading).toBe(1); // the heading flips AT the turnaround, not at the press
    state = reversed; // the loop rides the REVERSAL's brake, not the forward walk
    let flipped: RailState | null = null;
    let prevPose = samplePose(rail, state);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(rail, state, FRAME);
      if (flipped === null && state.heading === -1) {
        flipped = state;
      } else if (flipped === null) {
        prevPose = samplePose(rail, state); // only PRE-flip frames feed the continuity check
      }
    }
    const turn = flipped;
    if (turn === null) throw new Error('the turnaround never fired');
    // absorbed AT the turnaround, in the same frame the heading flips
    expect(turn.look).toEqual({ yaw: 0, pitch: 0 });
    expect(turn.lookTarget).toEqual({ yaw: 0, pitch: 0 });
    expect(turn.anchor).not.toBeNull();
    // the no-jump law AT THE INSTANT: the anchor's frozen source is the base arc aim at the
    // turnaround composed with the absorbed look — read at the anchor's own u0, exactly.
    // Under B9b the field is NOT cross-heading symmetric (the lead runs each leg its own
    // way), so the expected base is the FORWARD reading in force at the turnaround: the pose
    // advance sampled there had heading +1 and the departure anchor — rebuilt literally.
    const u0 = turn.anchor?.u0 ?? 0;
    const atInstant = samplePose(rail, {
      ...turn,
      u: u0 / (rail.stops.length - 1),
      heading: 1,
      anchor: { u0: 0, point: committedTarget(rail, 0), limits: stopOrThrow(rail, 0).look },
      look: { yaw: 10, pitch: 0 },
      lookTarget: { yaw: 10, pitch: 0 },
    });
    const expectedAim = renderedAim(atInstant);
    const anchorEye = samplePosition(rail, u0 / (rail.stops.length - 1));
    const anchorPoint = turn.anchor?.point;
    if (anchorPoint === undefined) throw new Error('the turnaround anchor carries no point');
    const anchorAim = aimOf(anchorEye, anchorPoint);
    expect(anchorAim.yaw).toBeCloseTo(expectedAim.yaw, 6);
    expect(anchorAim.pitch).toBeCloseTo(expectedAim.pitch, 6);
    // continuity: the flip frame's RENDERED aim is within one frame's arc step of the last
    // pre-flip frame's rendered aim (the same ≤ 3°/frame bound the reversal rows pin). The
    // pre-flip pose's sampled target is the UNCOMPOSED base (the look rides separately), so
    // both sides go through the rendered composition.
    const turnPose = samplePose(rail, turn);
    const turnRendered = aimOf(turnPose.position, turnPose.target); // the look is absorbed (0)
    const prevRendered = renderedAim(prevPose);
    const step = Math.max(
      Math.abs(wrapDeg(turnRendered.yaw - prevRendered.yaw)),
      Math.abs(turnRendered.pitch - prevRendered.pitch),
    );
    expect(step).toBeLessThanOrEqual(3);
    // the back leg lands on S0's committed framing exactly
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(rail, 0));
    expect(samplePose(rail, state).target).toEqual(committedTarget(rail, 0));
  });

  it('reduced motion: the cut absorbs the offset and lands on the committed pose exactly', () => {
    const rail = SQUARE_RAIL;
    const cut = walkPress(rail, dragged(rail, 0, { yaw: 20, pitch: 0 }), 1, false, true).state;
    expect(cut.walk).toBeNull();
    expect(cut.u).toBe(stopParameter(rail, 1));
    expect(cut.look).toEqual({ yaw: 0, pitch: 0 });
    expect(cut.lookTarget).toEqual({ yaw: 0, pitch: 0 });
    expect(samplePose(rail, cut).target).toEqual(committedTarget(rail, 1));
  });

  it('Shb→S1: the never-dragged locked dolly holds; an absorbed look turns an arc onto S1', () => {
    const rail = SQUARE_RAIL;
    const held = walkPress(rail, restingAt(stopParameter(rail, 3)), 1, false, false).state;
    const mid = advance(rail, held, 750); // mid-leg
    expect(samplePose(rail, mid).target).toEqual(SQUARE_S1_GAZE); // the dolly holds the point
    let done = mid;
    let guard = 0;
    while (done.walk !== null && guard++ < 400) done = advance(rail, done, FRAME);
    expect(done.u).toBe(stopParameter(rail, 4));
    expect(samplePose(rail, done).target).toEqual(committedTarget(rail, 4));
    // an absorbed look at the same departure turns the leg into an arc that still lands exact
    const arc = walkPress(rail, dragged(rail, 3, { yaw: 10, pitch: 0 }), 1, false, false).state;
    let running = advance(rail, arc, 750);
    expect(samplePose(rail, running).target).not.toEqual(SQUARE_S1_GAZE); // an arc, not the hold
    while (running.walk !== null && guard++ < 800) running = advance(rail, running, FRAME);
    expect(running.u).toBe(stopParameter(rail, 4));
    expect(samplePose(rail, running).target).toEqual(committedTarget(rail, 4));
  });

  it('sign pin: composeAim agrees with the host composition (raw rotations), yaw > 0 right', () => {
    const eye: Vec3 = [-24, 1.7, 230]; // S0's eye
    const base = radAim(eye, [0, 11, 0]); // the committed framing, ≈ 6° right of north (radians)
    const composed = composeAim(base, { yaw: 10, pitch: 3 }); // radians in, radians out
    const dir = forwardOf(composed.yaw * DEG, composed.pitch * DEG);
    // the host: rotate the base direction −10° about +Y, then raise it by +3° about the
    // camera's horizontal right — the exact tangent addition with the cross-term
    const v = forwardOf(base.yaw * DEG, base.pitch * DEG);
    const th = (-10 * Math.PI) / 180;
    const cx = v[0] * Math.cos(th) + v[2] * Math.sin(th);
    const cz = -v[0] * Math.sin(th) + v[2] * Math.cos(th);
    const h = Math.hypot(cx, cz);
    const lift = (3 * Math.PI) / 180;
    const scale = Math.cos(lift) - (v[1] / h) * Math.sin(lift);
    expect(dir[0]).toBeCloseTo(cx * scale, 9);
    expect(dir[2]).toBeCloseTo(cz * scale, 9);
    expect(dir[1]).toBeCloseTo(v[1] * Math.cos(lift) + h * Math.sin(lift), 9);
  });

  it('the absorbed-look swing census: each rail records its stop-departure worst for the eye', () => {
    for (const rail of [
      SQUARE_RAIL,
      galleryContract.rail,
      jordanContract.rail,
      contract1812.rail,
    ]) {
      let worst = 0;
      let where = '';
      for (let i = 0; i + 1 < rail.stops.length; i++) {
        // BOTH departure directions of the leg: i→i+1 under stop i's rows, i+1→i under stop
        // i+1's rows — the source framing and the look rows differ per side. Turnaround
        // anchors are a separate surface (their source is the mid-leg look in force); the
        // owner's-eye probes cover them interactively — this row never claims them.
        for (const leg of [
          { fromIdx: i, toIdx: i + 1 },
          { fromIdx: i + 1, toIdx: i },
        ]) {
          const from = stopOrThrow(rail, leg.fromIdx);
          const to = stopOrThrow(rail, leg.toIdx);
          const srcAim = radAim(from.position, committedTarget(rail, leg.fromIdx));
          const dstAim = aimOf(to.position, committedTarget(rail, leg.toIdx));
          const dst = forwardOf(dstAim.yaw, dstAim.pitch);
          for (const yawOff of [-from.look.yaw, from.look.yaw]) {
            for (const pitchOff of [from.look.pitchUp, -from.look.pitchDown]) {
              const composed = composeAim(srcAim, { yaw: yawOff, pitch: pitchOff });
              const src = forwardOf(composed.yaw * DEG, composed.pitch * DEG);
              const dot = Math.max(
                -1,
                Math.min(1, src[0] * dst[0] + src[1] * dst[1] + src[2] * dst[2]),
              );
              const angle = Math.acos(dot) * DEG;
              if (angle > worst) {
                worst = angle;
                where = `stop ${leg.fromIdx}→${leg.toIdx} yaw ${yawOff} pitch ${pitchOff}`;
              }
            }
          }
        }
      }
      const label = rail.stops === SQUARE_RAIL.stops ? 'square' : 'room';
      console.info(`B10 census ${label}: stop-departure worst ${worst.toFixed(1)}° at ${where}`);
      expect(worst, `${label}'s worst absorbed swing`).toBeLessThanOrEqual(180);
    }
  });
});
