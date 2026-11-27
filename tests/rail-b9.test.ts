// B9 — the field look law (design-walkthrough-ux.md §8, supersedes R19-ux C's departure
// turn). One field row over EVERY committed segment (both headings): between two stops the
// aim is exactly the arc between their framings × the lag weight g(wd) — B9c (2026-11-17,
// the rg-move lane; supersedes B9b's lead): the look HOLDS the anchor's aim across the first
// 20 % of the anchor's remaining segment and plays its whole arc across the last 80 %,
// landing on the destination framing exactly at the stop; locked dollies hold their point;
// the look is position-, heading- and anchor-
// determined with no independent clock (a fresh opposite heading reads its own anchored
// shape — the linear law's cross-heading point-equality is retired intentionally; a
// reversal re-anchors at the look in force and retraces it under the same law); the
// pacing turns with the travel, never faster per unit
// of rail than 1.875 × the segment's average. No camera, no DOM — pure rail law.
import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import {
  advance,
  committedTarget,
  LOOK_LAG,
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
import { smoothstep } from '../src/sky/easing';
import type { Rail, Vec3 } from '../src/world/registry';

const DEG = 180 / Math.PI;
const FRAME = 16 + 2 / 3; // the walk rows' cadence — no real timers, event-split slices
const S = [1e-10, 0.05, 0.25, 0.5, 0.75, 0.95, 1 - 1e-10] as const;
const EPS_DEG = 1e-7;
// B9c (2026-11-17, the rg-move lane; supersedes B9b's lead): the one weight over the lag
// span — the base gaze (and the limits) hold the anchor's aim across the first 1 − LOOK_LAG
// of the anchor's remaining segment and play the arc across the last LOOK_LAG. The mirror
// identity holds exactly (g_new(s) = 1 − g_old(1 − s), g_old(s) = smoothstep(min(1,
// s / LOOK_LEAD))); every recomputed pin below was sanity-checked against it.
const g = (s: number): number => smoothstep(Math.max(0, 1 - (1 - s) / LOOK_LAG));

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
      it(`${room} ${i}→${i + 1}${locked ? ' (locked dolly)' : ''}: aim = arc × g(wd) on both headings`, () => {
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
            // B9c: the one weight is g of the covered fraction of the anchor's remaining
            // segment. A fresh departure anchors at its own origin stop, so the Forward
            // walk (from stop i) covers s and the Back walk (from stop i + 1) covers
            // 1 − s — the same law both ways, each over its own anchored arc (the old
            // linear weight made the two coincide point-for-point; the lead retired that,
            // and the lag keeps the per-heading arcs — the hold reads the source aim
            // exactly across the first 20 %).
            const t = heading === 1 ? g(s) : g(1 - s);
            const [from, to] = heading === 1 ? [end.a, end.b] : [end.b, end.a];
            const wantYaw = from.yaw + wrapDeg(to.yaw - from.yaw) * t;
            const wantPitch = from.pitch + (to.pitch - from.pitch) * t;
            expect(Math.abs(wrapDeg(got.yaw - wantYaw)), `yaw at s ${s}`).toBeLessThanOrEqual(
              EPS_DEG,
            );
            expect(Math.abs(got.pitch - wantPitch), `pitch at s ${s}`).toBeLessThanOrEqual(EPS_DEG);
          }
        }
      });
      it(`${room} ${i}→${i + 1}: limits read the lag blend on both headings (B9c)`, () => {
        // The limits move with the same one weight, anchored per heading (the old
        // both-headings-equal pin was a linear-weight consequence; the lead retired it —
        // the stop fences still read each stop's own rows bit-exactly, and the hold keeps
        // the anchor's rows across the first 1 − LOOK_LAG).
        const rowsA = sampleLimits(rail, restingAt(stopParameter(rail, i)));
        const rowsB = sampleLimits(rail, restingAt(stopParameter(rail, i + 1)));
        for (const s of S) {
          for (const heading of [1, -1] as const) {
            const w = heading === 1 ? g(s) : g(1 - s);
            const [from, to] = heading === 1 ? [rowsA, rowsB] : [rowsB, rowsA];
            const got = sampleLimits(rail, midState(rail, i, s, heading));
            expect(got.yaw, `yaw h ${heading} s ${s}`).toBeCloseTo(
              from.yaw + (to.yaw - from.yaw) * w,
              9,
            );
            expect(got.pitchUp, `pitchUp h ${heading} s ${s}`).toBeCloseTo(
              from.pitchUp + (to.pitchUp - from.pitchUp) * w,
              9,
            );
            expect(got.pitchDown, `pitchDown h ${heading} s ${s}`).toBeCloseTo(
              from.pitchDown + (to.pitchDown - from.pitchDown) * w,
              9,
            );
          }
        }
      });
      it(`${room} ${i}→${i + 1}: for wd ≤ 1 − LOOK_LAG the base gaze holds the source aim exactly (B9c)`, () => {
        // B9c's lag: across the first 1 − LOOK_LAG of the anchor's remaining segment the
        // look IS the anchor's source framing (w ≡ 0 — the body departs under the look it
        // left with). wd is the fraction covered from the segment's origin, so the backward
        // heading reads the pin at s = 1 − wd (wd 0 sits on the source stop itself). The
        // landing pin keeps the fence: at wd = 1 the destination framing, exact.
        for (const heading of [1, -1] as const) {
          for (const wd of [0, 0.1, 1 - LOOK_LAG]) {
            const s = heading === 1 ? wd : 1 - wd;
            const pose = samplePose(rail, midState(rail, i, s, heading));
            if (locked) {
              expect(pose.target).toEqual(committedTarget(rail, i));
              continue;
            }
            const src = heading === 1 ? i : i + 1;
            const srcPose = samplePose(rail, restingAt(stopParameter(rail, src)));
            const want = aimOf(srcPose.position, srcPose.target);
            const got = aimOf(pose.position, pose.target);
            expect(
              Math.abs(wrapDeg(got.yaw - want.yaw)),
              `yaw heading ${heading} wd ${wd}`,
            ).toBeLessThanOrEqual(EPS_DEG);
            expect(
              Math.abs(got.pitch - want.pitch),
              `pitch heading ${heading} wd ${wd}`,
            ).toBeLessThanOrEqual(EPS_DEG);
          }
          // The landing pin (kept from B9b): wd = 1 ⇒ the destination framing, exact.
          const s = heading === 1 ? 1 - 1e-10 : 1e-10;
          const pose = samplePose(rail, midState(rail, i, s, heading));
          if (locked) {
            expect(pose.target).toEqual(committedTarget(rail, i));
            continue;
          }
          const dest = heading === 1 ? i + 1 : i;
          const destPose = samplePose(rail, restingAt(stopParameter(rail, dest)));
          const want = aimOf(destPose.position, destPose.target);
          const got = aimOf(pose.position, pose.target);
          expect(
            Math.abs(wrapDeg(got.yaw - want.yaw)),
            `landing yaw heading ${heading}`,
          ).toBeLessThanOrEqual(EPS_DEG);
          expect(
            Math.abs(got.pitch - want.pitch),
            `landing pitch heading ${heading}`,
          ).toBeLessThanOrEqual(EPS_DEG);
        }
      });
    }
  }
});

describe('B9 pacing: the look turns with the travel', () => {
  // B9c (2026-11-17, the rg-move lane): the aim is still a pure function of the travelled
  // distance (position-only), but the weight is the lag's smoothstep over the last 80 % of
  // the segment (the hold keeps w ≡ 0 across the first 20 %) — the per-rail pan rate still
  // peaks at 1.5/LOOK_LAG = 1.875 × the segment's own average (the same value as B9b's; the
  // peak's s moved 0.4 → 0.6), and the share left after 62 % of the segment is travelled is
  // 1 − g(0.62) of the arc (0.463 of it — the mirror identity recomputes: g_old(0.38)).
  const VC = 1 / WALK_CRUISE_MS;
  const k = (rail: Rail, s: RailState): number => s.u * (rail.stops.length - 1);
  const yawOf = (pose: ReturnType<typeof samplePose>): number =>
    aimOf(pose.position, pose.target).yaw;
  const cases: readonly (readonly [string, Rail, number])[] = [
    ['gallery G0b→Gj', galleryContract.rail, 1], // the passage pan (the 2026-11-24 split's 55° leg)
    ['jordan J2b→J3', jordanContract.rail, 4],
  ];
  for (const [label, rail, i] of cases) {
    it(`${label}: the walk pan never turns faster per unit of rail than 1.875 × the arc (B9c)`, () => {
      const end = framings(rail, i);
      const arc = Math.abs(wrapDeg(end.b.yaw - end.a.yaw));
      let state = walkPress(rail, restingAt(stopParameter(rail, i)), 1, false, false).state;
      let prevPose = samplePose(rail, state);
      let prevK = k(rail, state);
      let worstPerRail = 0;
      let peakCruiseRate = 0;
      let sawCruise = false;
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
            peakCruiseRate = Math.max(peakCruiseRate, dyaw / FRAME);
          }
        }
        prevPose = pose;
        prevK = k(rail, state);
      }
      expect(sawCruise, 'the walk reached its cruise').toBe(true);
      // The B9c field law at the averaged pace: never faster per unit of rail than the
      // smoothstep lag's peak 1.875 × the segment's own arc — the same value as B9b's (the
      // peak's s moved 0.4 → 0.6; the position-only law keeps the bound through the hold
      // and the accel ramp too).
      expect(worstPerRail).toBeLessThanOrEqual(arc * 1.875 * 1.001);
      // The cruise pan's per-ms rate: the lag shape × the constant cruise speed — never
      // past arc·1.875·v_c (the old constant arc·v_c pin retired with the linear weight).
      expect(peakCruiseRate).toBeLessThanOrEqual(arc * 1.875 * VC * 1.001);
    });
    it(`${label}: 62 % of the segment's travel leaves exactly 1 − g(0.62) of the arc`, () => {
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
      // The share is a pure function of the rail point landed on: 1 − g(wd), wd = at − i
      // (a departure from the origin stop anchors the arc there).
      expect(share, `the share left at k ${at.toFixed(4)}`).toBeCloseTo(1 - g(at - i), 2);
    });
  }
});

describe('B9 keeps the recorded rows', () => {
  it('the 2026-11-24 feel tune: G0→G0b 28.2° with the pitch settling 3.06° → 0°, G0b→Gj 54.7° flat, both in the g(s) shape', () => {
    // The 2026-11-24 feel tune re-splits the passage's 83° pan across the two passage
    // legs — 28.2° (7.02° → 35.29°) pre-turned past the mouth on G0→G0b, the remaining
    // 54.7° onto the door on G0b→Gj (the owner's split steer: the second click −10 %;
    // the 2026-11-16 22.0°/61.0° rows live in that round's archive) — G0b stays level: its
    // MOUTH_TURN subject sits at eye height, so the recorded 6.1009° Back settle at G0b
    // stays retired (the pitch rows are 3.06° → 0° and 0° → 0°); G0's own 3.06° fence keeps
    // its unchanged data. The mid-segment samples read the B9c lag weight g(s) — the hold
    // keeps the source aim across the first 20 % — not the old linear distance
    // fraction (the old 83.0°/6.1009° rows retire with the 2026-11-14 split).
    const rail = galleryContract.rail;
    const end0 = framings(rail, 0);
    expect(Math.abs(wrapDeg(end0.b.yaw - end0.a.yaw))).toBeCloseTo(28.27, 1);
    expect(end0.a.yaw).toBeCloseTo(7.02, 1); // from the junction arch onto the pre-turned mouth gaze
    expect(end0.b.yaw).toBeCloseTo(35.29, 1);
    expect(end0.a.pitch).toBeCloseTo(3.06, 2); // G0's fence, unchanged data
    expect(end0.b.pitch).toBeCloseTo(0, 9); // G0b level on the pre-turned gaze
    const end1 = framings(rail, 1);
    expect(Math.abs(wrapDeg(end1.b.yaw - end1.a.yaw))).toBeCloseTo(54.7, 1);
    expect(end1.a.pitch).toBeCloseTo(0, 9);
    expect(end1.b.pitch).toBeCloseTo(0, 9); // the 6.10° down-settle is gone
    // Segment 0: the pitch settles 3.06° → 0°, monotone non-increasing (the B9c hold keeps
    // the source's 3.06° across the first 20 %), every sample a + (b − a)·g(s) within EPS.
    let last = Number.POSITIVE_INFINITY;
    for (let step = 1; step <= 99; step += 1) {
      const s = step / 100; // forward: from the G0 framing (3.06°) down toward G0b's 0°
      const pose = samplePose(rail, midState(rail, 0, s, 1));
      const got = aimOf(pose.position, pose.target);
      expect(got.pitch, `monotone at s ${s}`).toBeLessThanOrEqual(last + 1e-12);
      const want = end0.a.pitch + (end0.b.pitch - end0.a.pitch) * g(s);
      expect(Math.abs(got.pitch - want)).toBeLessThan(EPS_DEG);
      last = got.pitch;
    }
    // Segment 1: flat — |pitch| < EPS at every sample.
    for (let step = 1; step <= 99; step += 1) {
      const s = step / 100;
      const pose = samplePose(rail, midState(rail, 1, s, 1));
      const got = aimOf(pose.position, pose.target);
      expect(Math.abs(got.pitch), `flat at s ${s}`).toBeLessThan(EPS_DEG);
      const want = end1.a.yaw + wrapDeg(end1.b.yaw - end1.a.yaw) * g(s);
      expect(Math.abs(wrapDeg(got.yaw - want)), `yaw shape at s ${s}`).toBeLessThan(EPS_DEG);
    }
  });

  it('the pass-through rate closes by construction: the outgoing side is the exact hold, the incoming side a zero-slope join (B9c)', () => {
    // B9c's recorded consequence — the flat side SWAPS vs B9b: the OUTGOING side of every
    // stop is the hold (w ≡ 0 across the next segment's first 1 − LOOK_LAG), so the
    // finite-difference gaze rate there is exactly the float dust; the INCOMING side is
    // the zero-slope landing (w → 1 quadratically — the mirror of B9b's flat lead tail),
    // its FD rate O(h) — ≈ 7.5·h/LOOK_LAG of the arc per unit s for step h (≈ 1.4e-3 at
    // s = 1 − 2e-4) — bounded, never a kink.
    const rail = galleryContract.rail;
    for (const segment of [0, 1]) {
      const end = framings(rail, segment);
      const arc = Math.abs(wrapDeg(end.b.yaw - end.a.yaw));
      const rateAt = (s: number): number => {
        const h = 1e-4;
        const poseA = samplePose(rail, midState(rail, segment, s, 1));
        const poseB = samplePose(rail, midState(rail, segment, s + h, 1));
        return (
          Math.abs(
            wrapDeg(
              aimOf(poseB.position, poseB.target).yaw - aimOf(poseA.position, poseA.target).yaw,
            ),
          ) /
          (h * arc)
        );
      };
      // The hold: both FD samples sit inside w ≡ 0 — the rate is the aim-comparison dust.
      // (The middle sample stays mid-hold: at the hold's edge the FD straddles the
      // quadratic onset and reads O(h) — 3.7e-4 at the old 0.1 dial's boundary — not the
      // dust, and not a kink either; the zero-slope join is asserted separately below.)
      for (const s of [1e-4, 0.05, 1 - LOOK_LAG - 1e-4]) {
        expect(rateAt(s), `segment ${segment} hold rate/arc at s ${s}`).toBeLessThanOrEqual(1e-9);
      }
      // The zero-slope landing: the FD rate is O(h), bounded well under the old 0.01 bar.
      for (const s of [1 - 2e-4]) {
        expect(rateAt(s), `segment ${segment} landing rate/arc at s ${s}`).toBeLessThanOrEqual(
          0.01,
        );
      }
    }
  });

  it('a mid-walk reversal re-anchors AT THE TURNAROUND on the field: both legs pin to their anchored arcs (B9c)', () => {
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
    // B10: the departure anchor rides from the press (G0's committed framing, bit-exact);
    // the TURNAROUND replaces it with the look in force there (asserted below).
    expect(reversed.anchor?.point).toEqual(committedTarget(rail, 0));
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
      // B9c: each heading reads its own anchored arc — the fresh Back departure from G0b
      // covers 1 − s of its remaining segment toward the framing it departs from, the
      // fresh Forward departure from G0 covers s (the hold keeps the source aim across
      // the first 20 % of each). The old cross-heading point-equality
      // was a linear-weight consequence; the lead retired it (the look is a function of
      // (u, heading, anchor)), so both headings pin to their own law here. The target
      // POINT carries the reach of its own destination (the synthetic ray's length), so
      // the aim compares, not the point.
      const retrace = samplePose(rail, midState(rail, 0, s, -1));
      const forward = samplePose(rail, midState(rail, 0, s, 1));
      const backAim = aimOf(retrace.position, retrace.target);
      const fwdAim = aimOf(forward.position, forward.target);
      const end = framings(rail, 0);
      expect(backAim.yaw, `back yaw at s ${s}`).toBeCloseTo(
        end.b.yaw + wrapDeg(end.a.yaw - end.b.yaw) * g(1 - s),
        9,
      );
      expect(backAim.pitch, `back pitch at s ${s}`).toBeCloseTo(
        end.b.pitch + (end.a.pitch - end.b.pitch) * g(1 - s),
        9,
      );
      expect(fwdAim.yaw, `forward yaw at s ${s}`).toBeCloseTo(
        end.a.yaw + wrapDeg(end.b.yaw - end.a.yaw) * g(s),
        9,
      );
      expect(fwdAim.pitch, `forward pitch at s ${s}`).toBeCloseTo(
        end.a.pitch + (end.b.pitch - end.a.pitch) * g(s),
        9,
      );
    }
  });

  it('reduced motion still cuts to the destination fence', () => {
    const rail = jordanContract.rail;
    const cut = walkPress(rail, restingAt(stopParameter(rail, 3)), 1, false, true).state;
    expect(cut.walk).toBeNull();
    expect(samplePose(rail, cut).target).toEqual(committedTarget(rail, 4));
  });

  it('the Forward G0b→Gj arrival looks due east and carries no approach hold mid-flight', () => {
    const rail = galleryContract.rail;
    const arrivedPose = samplePose(rail, restingAt(stopParameter(rail, 2)));
    expect(arrivedPose.target).toBe(committedTarget(rail, 2));
    const aim = aimOf(arrivedPose.position, arrivedPose.target);
    expect(aim.yaw).toBeCloseTo(90, 6); // EAST_DOOR lies due +x of Gj
    expect(aim.pitch).toBeCloseTo(0, 9);
    const mid = samplePose(rail, midState(rail, 1, 0.5, 1));
    expect(mid.target === committedTarget(rail, 2)).toBe(false); // no point hold mid-flight
  });

  it('the walk rests AT the arrival: release timing controls T = 2r/v (brake ≤ the cruise bar)', () => {
    // On the square rail the walk's next stop (Sh) is SOFT: a held walk coasts past the
    // horizon, and only the intent's end starts the brake. On the gallery the tap's next
    // stop is the soft G0b since the owner's 2026-11-14 steer (the corner Gj sits one leg
    // on) — the pinned T comes from the square either way.
    const rail = galleryContract.rail;
    // Tap: press, the lift inside the lease, then the settle: the intent dies, the brake
    // enters, and the walk rests at the next stop exactly.
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
  it('military M3→M4: a held east look rides the limiting blend linearly in the lag weight to the doors framing', () => {
    const rail = contract1812.rail;
    const end = framings(rail, 3); // the two endpoint base-gaze angles, from the file's helper
    // M3: south base + held yaw −90 (clamped by the ±90 row) composes to due east (90°).
    // M4: the doors base yaw clamped by the ±15 row composes to the square-on doors view.
    // (mg-1812-look DECISION-1 re-sited M4 onto the axis facing due east; the row is 15 —
    // the run is axial now, the pin's arithmetic re-derives for it.)
    // B9c: the base gaze AND the limits both move with the one lag weight g(s) (held at
    // the anchor's across the first 20 %), so the
    // composed view stays linear in that weight (the old linear-in-s read retires).
    const atDoor = end.b.yaw - 15;
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
      const expected = 90 + (atDoor - 90) * g(s);
      expect(Math.abs(composed - expected), `held look at s ${s}`).toBeLessThanOrEqual(0.5);
    }
  });
});
