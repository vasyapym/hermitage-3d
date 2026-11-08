// B9 — the field look law (design-walkthrough-ux.md §8, supersedes R19-ux C's departure
// turn). One field row over EVERY committed segment (both headings): between two stops the
// aim is exactly the arc between their framings × the distance fraction; locked dollies hold
// their point; the look is history-free (a reversal retraces); the pacing turns with the
// travel. No camera, no DOM — pure rail law.
import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import {
  advance,
  committedTarget,
  type RailState,
  restingAt,
  sampleLimits,
  samplePose,
  stopParameter,
  WALK_BRAKE_MS,
  WALK_CRUISE_MS,
  walkPress,
  walkRelease,
} from '../src/camera/rail';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import type { Rail, Vec3 } from '../src/world/registry';

const DEG = 180 / Math.PI;
const FRAME = 16 + 2 / 3; // the walk rows' cadence — no real timers, event-split slices
const S = [1e-10, 0.05, 0.25, 0.5, 0.75, 0.95, 1 - 1e-10] as const;
const EPS_DEG = 1e-7;

const aimOf = (position: Vec3, target: Vec3): { yaw: number; pitch: number } => {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  return { yaw: Math.atan2(dx, -dz) * DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * DEG };
};
const wrapDeg = (d: number): number => {
  let x = d;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
};
const samePoint = (a: Vec3, b: Vec3): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

const midState = (rail: Rail, i: number, s: number, heading: 1 | -1): RailState => {
  const uA = stopParameter(rail, i);
  const uB = stopParameter(rail, i + 1);
  return { ...restingAt(uA + (uB - uA) * s), heading, anchor: null };
};
const framings = (
  rail: Rail,
  i: number,
): { a: { yaw: number; pitch: number }; b: { yaw: number; pitch: number } } => {
  const aPose = samplePose(rail, restingAt(stopParameter(rail, i)));
  const bPose = samplePose(rail, restingAt(stopParameter(rail, i + 1)));
  return { a: aimOf(aPose.position, aPose.target), b: aimOf(bPose.position, bPose.target) };
};

const RAILS: readonly (readonly [string, Rail])[] = [
  ['square', SQUARE_RAIL],
  ['gallery', galleryContract.rail],
  ['jordan', jordanContract.rail],
  ['military-gallery', contract1812.rail],
];

describe('B9 field: between two stops the look is the arc between their framings', () => {
  for (const [room, rail] of RAILS) {
    for (let i = 0; i < rail.stops.length - 1; i++) {
      const locked = samePoint(committedTarget(rail, i), committedTarget(rail, i + 1));
      it(`${room} ${i}→${i + 1}${locked ? ' (locked dolly)' : ''}: aim = arc × s on both headings`, () => {
        const end = framings(rail, i);
        for (const heading of [1, -1] as const) {
          for (const s of S) {
            const pose = samplePose(rail, midState(rail, i, s, heading));
            if (locked) {
              // The shared point is held bit-exactly through the whole segment.
              expect(pose.target).toEqual(committedTarget(rail, i));
              continue;
            }
            const got = aimOf(pose.position, pose.target);
            const wantYaw = end.a.yaw + wrapDeg(end.b.yaw - end.a.yaw) * s;
            const wantPitch = end.a.pitch + (end.b.pitch - end.a.pitch) * s;
            expect(Math.abs(wrapDeg(got.yaw - wantYaw)), `yaw at s ${s}`).toBeLessThanOrEqual(
              EPS_DEG,
            );
            expect(Math.abs(got.pitch - wantPitch), `pitch at s ${s}`).toBeLessThanOrEqual(EPS_DEG);
          }
        }
      });
      it(`${room} ${i}→${i + 1}: limits read the same on both headings`, () => {
        for (const s of S) {
          const plus = sampleLimits(rail, midState(rail, i, s, 1));
          const minus = sampleLimits(rail, midState(rail, i, s, -1));
          expect(plus.yaw).toBeCloseTo(minus.yaw, 9);
          expect(plus.pitchUp).toBeCloseTo(minus.pitchUp, 9);
          expect(plus.pitchDown).toBeCloseTo(minus.pitchDown, 9);
        }
      });
    }
  }
});

describe('B9 pacing: the look turns with the travel', () => {
  // The walk replaces the glide: the aim is a LINEAR function of the travelled distance
  // (position-only), so the cruise pan rate is CONSTANT — arc · v_c — with none of the
  // old smootherstep's 1.875 spike. The share left after 62 % OF THE SEGMENT is travelled
  // is exactly 1 − 0.62 of the arc (the old 1 − s(0.62) pin, retimed to position).
  const VC = 1 / WALK_CRUISE_MS;
  const k = (rail: Rail, s: RailState): number => s.u * (rail.stops.length - 1);
  const yawOf = (pose: ReturnType<typeof samplePose>): number =>
    aimOf(pose.position, pose.target).yaw;
  const cases: readonly (readonly [string, Rail, number])[] = [
    ['gallery G0→Gj', galleryContract.rail, 0],
    ['jordan J2b→J3', jordanContract.rail, 4],
  ];
  for (const [label, rail, i] of cases) {
    it(`${label}: the walk pan never turns faster per unit of rail than the arc`, () => {
      const end = framings(rail, i);
      const arc = Math.abs(wrapDeg(end.b.yaw - end.a.yaw));
      let state = walkPress(rail, restingAt(stopParameter(rail, i)), 1, false, false).state;
      let prevPose = samplePose(rail, state);
      let prevK = k(rail, state);
      let worstPerRail = 0;
      let sawCruise = false;
      let lastCruiseRate = Number.NaN;
      let guard = 0;
      // The hold keeps the intent alive; the observation stops where the segment's
      // destination stop is met (soft on jordan, the hard corner on the gallery).
      while (state.walk !== null && k(rail, state) < i + 1 - 1e-9 && guard++ < 400) {
        state = advance(rail, state, FRAME);
        const pose = samplePose(rail, state);
        const dk = k(rail, state) - prevK;
        const dyaw = Math.abs(wrapDeg(yawOf(pose) - yawOf(prevPose)));
        if (Math.floor(prevK) === Math.floor(k(rail, state)) && dk > 1e-6) {
          worstPerRail = Math.max(worstPerRail, dyaw / dk);
          if (state.walk?.phase === 'cruise') {
            sawCruise = true;
            lastCruiseRate = dyaw / FRAME;
          }
        }
        prevPose = pose;
        prevK = k(rail, state);
      }
      expect(sawCruise, 'the walk reached its cruise').toBe(true);
      // The B9 field law at the averaged pace: never faster per unit of rail than the
      // segment's own arc (the accel ramp's slope peak stays inside the closed forms).
      expect(worstPerRail).toBeLessThanOrEqual(arc * 1.001);
      expect(lastCruiseRate, 'the cruise pan at arc·v_c per millisecond').toBeCloseTo(arc * VC, 3);
    });
    it(`${label}: 62 % of the segment's travel leaves exactly 38 % of the arc`, () => {
      const end = framings(rail, i);
      const arc = Math.abs(wrapDeg(end.b.yaw - end.a.yaw));
      let state = walkPress(rail, restingAt(stopParameter(rail, i)), 1, false, false).state;
      let guard = 0;
      while (state.walk !== null && k(rail, state) < i + 0.62 - 0.005 && guard++ < 400) {
        state = advance(rail, state, FRAME);
      }
      const at = Math.min(k(rail, state), i + 0.62 + 0.005);
      const share = Math.abs(wrapDeg(end.b.yaw - yawOf(samplePose(rail, state)))) / arc;
      expect(Math.abs(at - (i + 0.62))).toBeLessThanOrEqual(0.005); // the sampled frame's span
      expect(share, `the share left at k ${at.toFixed(4)}`).toBeCloseTo(1 - 0.62, 2);
    });
  }
});

describe('B9 keeps the recorded rows', () => {
  it('Back Gj→G0: 83.0° pan; pitch rises linearly and monotonically to its 3.06° settle', () => {
    const rail = galleryContract.rail;
    const end = framings(rail, 0);
    expect(Math.abs(wrapDeg(end.b.yaw - end.a.yaw))).toBeCloseTo(83.0, 1);
    expect(end.a.pitch).toBeCloseTo(3.06, 2);
    expect(end.b.pitch).toBeCloseTo(0, 9);
    let last = Number.POSITIVE_INFINITY;
    for (let step = 1; step <= 99; step += 1) {
      const s = step / 100; // forward: from the G0 framing (3.0591°) down toward Gj's 0°
      const pose = samplePose(rail, midState(rail, 0, s, -1));
      const got = aimOf(pose.position, pose.target);
      expect(got.pitch, `monotone at s ${s}`).toBeLessThanOrEqual(last + 1e-12);
      const want = end.a.pitch + (end.b.pitch - end.a.pitch) * s;
      expect(Math.abs(got.pitch - want)).toBeLessThan(EPS_DEG);
      last = got.pitch;
    }
  });

  it('a mid-walk reversal re-anchors AT THE TURNAROUND on the field: the Back leg retraces the Forward look', () => {
    const rail = galleryContract.rail;
    const uA = stopParameter(rail, 0);
    const uB = stopParameter(rail, 1);
    // The walk drives to k ≈ 0.4 of the first segment (accel 0.14 + 260 ms of cruise).
    const press = walkPress(rail, restingAt(uA), 1, false, false).state;
    const inFlight = advance(rail, press, 810);
    expect(inFlight.u).toBeCloseTo(uA + (uB - uA) * 0.4, 6);
    const reversed = walkPress(rail, inFlight, -1, false, false).state;
    expect(reversed.walk?.phase).toBe('brake'); // the reversal, braking to the turnaround
    expect(reversed.walk?.reversalTo).toBe(-1);
    expect(reversed.heading).toBe(1); // the heading flips AT the turnaround, not at the press
    expect(reversed.anchor).toBeNull();
    // The reversal press stays held: the intent departs at the turnaround, walks back
    // through B0's framings, and the hard rail end rests it at G0.
    let state = reversed;
    let flipped: RailState | null = null;
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(rail, state, 16);
      if (flipped === null && state.heading === -1) {
        flipped = state;
        expect(state.anchor).not.toBeNull();
        expect(state.walk?.phase).toBe('accel');
      }
    }
    expect(flipped).not.toBeNull();
    expect(state.walk).toBeNull();
    expect(state.u).toBe(uA); // G0
    for (const s of [0.39, 0.3, 0.2, 0.1, 0.01]) {
      // The field reads the same look DIRECTION at the same rail point on both headings —
      // the reversal's re-anchor lands on the field. The target POINT carries the reach of
      // its own destination (the synthetic ray's length), so the aim compares, not the point.
      const retrace = samplePose(rail, midState(rail, 0, s, -1));
      const forward = samplePose(rail, midState(rail, 0, s, 1));
      const backAim = aimOf(retrace.position, retrace.target);
      const fwdAim = aimOf(forward.position, forward.target);
      expect(backAim.yaw, `yaw at s ${s}`).toBeCloseTo(fwdAim.yaw, 9);
      expect(backAim.pitch, `pitch at s ${s}`).toBeCloseTo(fwdAim.pitch, 9);
    }
  });

  it('reduced motion still cuts to the destination fence', () => {
    const rail = jordanContract.rail;
    const cut = walkPress(rail, restingAt(stopParameter(rail, 3)), 1, false, true).state;
    expect(cut.walk).toBeNull();
    expect(samplePose(rail, cut).target).toEqual(committedTarget(rail, 4));
  });

  it('the Forward G0→Gj arrival looks due east and carries no approach hold mid-flight', () => {
    const rail = galleryContract.rail;
    const arrivedPose = samplePose(rail, restingAt(stopParameter(rail, 1)));
    expect(arrivedPose.target).toBe(committedTarget(rail, 1));
    const aim = aimOf(arrivedPose.position, arrivedPose.target);
    expect(aim.yaw).toBeCloseTo(90, 6); // EAST_DOOR lies due +x of Gj
    expect(aim.pitch).toBeCloseTo(0, 9);
    const mid = samplePose(rail, midState(rail, 0, 0.5, 1));
    expect(mid.target === committedTarget(rail, 1)).toBe(false); // no point hold mid-flight
  });

  it('the walk rests AT the arrival: release timing controls T = 2r/v (brake ≤ the cruise bar)', () => {
    // On the square rail the walk's next stop (Sh) is SOFT: a held walk coasts past the
    // horizon, and only the intent's end starts the brake. On the gallery the next stop
    // Gj is a CORNER — hard regardless of intent — so the pinned T comes from the square.
    const rail = galleryContract.rail;
    // Tap: press, the lift inside the lease, then the settle: the intent dies, the brake
    // enters, and the walk rests AT Gj exactly.
    const pressed = walkPress(rail, restingAt(0), 1, false, false).state;
    let state = advance(rail, pressed, 80); // the tap's flight
    state = walkRelease(state, 1);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) state = advance(rail, state, 16);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(rail, 1));
    // An early hold-release inside the horizon (the square rail, n = 3): the intent ends
    // at 1500 ms with r = 1 − 0.86 = 0.14, so T = 2r/v = 420 < WALK_BRAKE_MS — the walk
    // still rests AT Sh, never past it.
    const square = SQUARE_RAIL;
    const held = walkPress(square, restingAt(0), 1, false, false).state;
    let short = advance(square, held, 1500);
    short = walkRelease(short, 1);
    const kAtRelease = short.u * (square.stops.length - 1); // the closed form: 0.86, r = 0.14
    short = advance(square, short, FRAME);
    expect(short.walk?.phase).toBe('brake');
    const rAtEntry = 1 - kAtRelease; // the entry r, not the current position's
    expect(short.walk?.phaseDurationMs).toBeCloseTo((2 * rAtEntry) / (1 / WALK_CRUISE_MS), 6);
    expect(short.walk?.phaseDurationMs).toBeLessThan(WALK_BRAKE_MS);
    guard = 0;
    while (short.walk !== null && guard++ < 400) short = advance(square, short, 16);
    expect(short.walk).toBeNull();
    expect(short.u).toBe(stopParameter(square, 1));
  });
});

describe('R22-ux: the military corner-run hold', () => {
  it('military M3→M4: a held east look rides the limiting blend linearly to the doors framing', () => {
    const rail = contract1812.rail;
    const end = framings(rail, 3); // the two endpoint base-gaze angles, from the file's helper
    // M3: south base + held yaw −90 (clamped by the ±90 row) composes to due east (90°).
    // M4: the doors base yaw clamped by the ±40 row composes to the square-on doors view.
    const atDoor = end.b.yaw - 40;
    for (const s of S) {
      const base = midState(rail, 3, s, 1); // the file's helper; heading forward
      const state = {
        ...base,
        look: { yaw: -90, pitch: 0 },
        lookTarget: { yaw: -90, pitch: 0 },
      };
      const pose = samplePose(rail, state);
      // flat base-gaze direction, then the host's yaw composition about +Y:
      const vx = pose.target[0] - pose.position[0];
      const vz = pose.target[2] - pose.position[2];
      const th = (-pose.look.yaw * Math.PI) / 180;
      const cx = vx * Math.cos(th) + vz * Math.sin(th);
      const cz = -vx * Math.sin(th) + vz * Math.cos(th);
      const composed = (Math.atan2(cx, -cz) * 180) / Math.PI;
      const expected = 90 + (atDoor - 90) * s;
      expect(Math.abs(composed - expected), `held look at s ${s}`).toBeLessThanOrEqual(0.5);
    }
  });
});
