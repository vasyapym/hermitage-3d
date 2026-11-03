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
  SCROLL_GLIDE_MS,
  STEP_GLIDE_MS,
  sampleLimits,
  samplePose,
  stepStop,
  stopParameter,
} from '../src/camera/rail';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import type { Rail, Vec3 } from '../src/world/registry';

const DEG = 180 / Math.PI;
const S = [1e-10, 0.05, 0.25, 0.5, 0.75, 0.95, 1 - 1e-10] as const;
const smootherstep = (x: number): number => x * x * x * (x * (x * 6 - 15) + 10);
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
  // The peak per-second pan of yaw(t) along a glide: s(τ) is smootherstep, whose slope peaks
  // 1.875 at τ = 0.5, so the pan peaks there at 1.875 × arc / duration. The share left after
  // 62% of the time is 1 − s(0.62) — exactly the distance the remaining travel covers.
  const cases: readonly (readonly [string, Rail, number])[] = [
    ['gallery G0→Gj', galleryContract.rail, 0],
    ['jordan J2b→J3', jordanContract.rail, 4],
  ];
  for (const [label, rail, i] of cases) {
    for (const T of [STEP_GLIDE_MS, SCROLL_GLIDE_MS]) {
      it(`${label} @${T} ms: peak 1.875·arc/T at mid-glide; late share = 1−s(0.62)`, () => {
        const end = framings(rail, i);
        const arc = Math.abs(wrapDeg(end.b.yaw - end.a.yaw));
        const yawAt = (tau: number): number => {
          const pose = samplePose(rail, midState(rail, i, smootherstep(tau), 1));
          return aimOf(pose.position, pose.target).yaw;
        };
        let peak = 0;
        let peakTau = 0;
        for (let ms = 0; ms < T; ms += 1) {
          const rate = Math.abs(wrapDeg(yawAt((ms + 1) / T) - yawAt(ms / T))) * 1000;
          if (rate > peak) {
            peak = rate;
            peakTau = (ms + 0.5) / T;
          }
        }
        expect(peak / ((1.875 * arc * 1000) / T)).toBeCloseTo(1, 3);
        expect(Math.abs(peakTau - 0.5)).toBeLessThan(0.01);
        expect(Math.abs(wrapDeg(yawAt(1) - yawAt(0.62))) / arc).toBeCloseTo(
          1 - smootherstep(0.62),
          6,
        );
      });
    }
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

  it('a mid-glide reversal re-anchors on the field: the Back leg retraces the Forward look', () => {
    const rail = galleryContract.rail;
    const uA = stopParameter(rail, 0);
    const uB = stopParameter(rail, 1);
    const inFlight: RailState = {
      ...restingAt(uA + (uB - uA) * 0.4),
      heading: 1,
      anchor: null,
      glide: { kind: 'step', from: uA, to: uB, durationMs: STEP_GLIDE_MS, elapsedMs: 1100 },
    };
    const reversed = stepStop(rail, inFlight, -1, false).state;
    expect(reversed.heading).toBe(-1);
    expect(reversed.anchor).not.toBeNull();
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
    const cut = stepStop(rail, restingAt(stopParameter(rail, 3)), 1, true).state;
    expect(cut.glide).toBeNull();
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

  it('advance settles the step at the committed duration (the timing law kept)', () => {
    const rail = galleryContract.rail;
    const started = stepStop(rail, restingAt(0), 1, false).state;
    const notYet = advance(rail, started, STEP_GLIDE_MS - 1);
    expect(notYet.glide).not.toBeNull();
    const done = advance(rail, notYet, 1);
    expect(done.glide).toBeNull();
    expect(done.u).toBe(stopParameter(rail, 1));
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
