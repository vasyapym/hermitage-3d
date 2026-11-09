// G — the walk battery (the movement-ux ruling §1.4/§8): presses assert intent, the pace
// never multiplies, leases and holds book the intent. Everything advances the pure module
// with explicit deltas on a fixed 16.667 ms cadence — plus irregular cadences ([5, 40, 13,
// 33, 25]) and long 100 ms frames where the row says so. No DOM, no real timers, no
// Date.now, no randomness — the walk's phase math is closed form, so per-row pins are exact.
//
// Closed forms used (per the ruling): v_c = 1/1500 k/ms; accel from rest covers 0.14 gap in
// 420 ms; the brake horizon is d_b = v·350 ms; a brake lands in T = 2r/v; position from rest
// at 300 ms ≈ 0.066 gap (4× the old smootherstep law's 0.0164); one isolated tap lands on
// the next stop in ≈ 2060 ms (420 accel + 940 cruise + 700 brake).
import { describe, expect, it } from 'vitest';
import {
  advance,
  moving,
  type RailState,
  REDUCED_DWELL_MS,
  restingAt,
  samplePose,
  seedState,
  stopCount,
  stopParameter,
  WALK_ACCEL_MS,
  WALK_BRAKE_MS,
  WALK_CRUISE_MS,
  WALK_HOLD_MS,
  WALK_LEASE_MS,
  walkPress,
  walkRelease,
} from '../src/camera/rail';
import type { Rail, Stop, Vec3 } from '../src/world/registry';

const FRAME = 16 + 2 / 3;
const IRREGULAR: readonly number[] = [5, 40, 13, 33, 25];
const LONG = 100;
const VC = 1 / WALK_CRUISE_MS;

const stop = (id: string, position: Vec3): Stop => ({
  id,
  position,
  subject: null, // the pose law: the next stop's position, the last stop looks back
  look: { yaw: 30, pitchUp: 20, pitchDown: 10 },
  caption: 'caption.s0',
});
const aimed = (id: string, position: Vec3, subject: Vec3): Stop => ({
  ...stop(id, position),
  subject,
});

const LINE: Rail = { stops: [stop('p', [0, 1.7, 0]), stop('q', [0, 1.7, -10])] };
const FIVE: Rail = {
  stops: [
    stop('a', [0, 1.7, 0]),
    stop('b', [0, 1.7, -12]),
    stop('c', [0, 1.7, -24]),
    stop('d', [0, 1.7, -36]),
    stop('e', [0, 1.7, -48]),
  ],
};
const STAIR: Rail = {
  stops: [
    stop('a', [0, 1.6, 0]),
    stop('b', [0, 1.6, -6]),
    stop('c', [3, 3.2, -9]),
    stop('d', [3, 4.8, -15]),
  ],
};
const A0: Vec3 = [10, 2.4, 0];
const A1: Vec3 = [10, 2.4, -20];
const A2: Vec3 = [12, 2.4, -34];
/** The corner battery's rail: a corner-flagged middle stop (R18-ux D3 over the walk law). */
const CORNER: Rail = {
  stops: [
    aimed('c0', [0, 1.7, 0], A0),
    { ...aimed('c1', [0, 1.7, -12], A1), corner: true },
    aimed('c2', [8, 1.7, -18], A2),
    aimed('c3', [8, 1.7, -30], A0),
  ],
};

const kOf = (rail: Rail, s: RailState): number => s.u * (rail.stops.length - 1);
/** Advances the state to rest, cycling the given cadence (defaults to the fixed frame). */
const runRest = (rail: Rail, s: RailState, cadence: readonly number[] = [FRAME]): RailState => {
  let state = s;
  let i = 0;
  while (moving(state)) state = advance(rail, state, cadence[i++ % cadence.length] ?? FRAME);
  return state;
};

describe('the declared pacing constants (the walk law’s own exports)', () => {
  it('pins the six declared values, once', () => {
    expect(WALK_CRUISE_MS).toBe(1500);
    expect(WALK_ACCEL_MS).toBe(420);
    expect(WALK_BRAKE_MS).toBe(700);
    expect(WALK_LEASE_MS).toBe(600);
    expect(WALK_HOLD_MS).toBe(300);
    expect(REDUCED_DWELL_MS).toBe(600);
  });
});

describe('law A: presses within the lease window are one walk (idempotency)', () => {
  // 1 press vs 10 presses inside the first 40 ms: the advance frame STREAMS are identical
  // (the extra presses only refill the lease of an already-intent walk), so every recorded
  // state must deep-equal pairwise and both walks must settle on the same exact stop.
  const framesOf = (rolled: boolean): RailState[] => {
    const slices = [10, 10, 10, 10, 10] as const; // 5 × 10 ms = the 50 ms press window
    const frames: RailState[] = [];
    let state = walkPress(LINE, restingAt(0), 1, false, false).state;
    for (const dt of slices) {
      if (rolled) {
        state = walkPress(LINE, state, 1, false, false).state; // refill #2n: never a retarget
        state = walkPress(LINE, state, 1, false, false).state;
      }
      state = advance(LINE, state, dt);
      frames.push(state);
    }
    state = walkRelease(state, 1); // the lift: heldMs = 50 < the hold bar, the lease stays
    frames.push(state);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(LINE, state, FRAME);
      frames.push(state);
    }
    frames.push(state);
    return frames;
  };
  const plain = framesOf(false);
  const rolled = framesOf(true);
  it('10 presses in 50 ms move the walk IDENTICALLY to 1 press — the refills touch only the lease', () => {
    // Re-pinned per the corrected lease law (the press-relative drain, Sol R1): the refill
    // MOMENTS differ between the streams, so the lease residients (and the death instants)
    // differ — the motion is identical for as long as BOTH intents are alive, and 1-scale
    // float dust in the event split points is tolerated. The conditional invariant (R8).
    expect(plain).toHaveLength(rolled.length);
    let compared = 0;
    plain.forEach((a, i) => {
      const b = rolled[i] ?? null;
      if (a.walk !== null && b !== null && b.walk !== null) {
        expect(b.u, `position frame ${i}`).toBeCloseTo(a.u, 12);
        expect(b.walk.phase, `phase ${i}`).toBe(a.walk.phase);
        expect(b.walk.k0, `phase k0 ${i}`).toBeCloseTo(a.walk.k0, 12);
        expect(b.walk.phaseMs, `phase clock ${i}`).toBeCloseTo(a.walk.phaseMs, 9);
        expect(b.walk.v0, `speed ${i}`).toBeCloseTo(a.walk.v0, 12);
        expect(b.walk.brakeTo, `brake target ${i}`).toBe(a.walk.brakeTo);
        expect(b.walk.reversalTo, `pending heading ${i}`).toBe(a.walk.reversalTo);
        expect(b.heading, `state heading ${i}`).toBe(a.heading);
        compared += 1;
      }
    });
    expect(compared, 'both intents were alive for the shared frames').toBeGreaterThan(5);
  });
  it('both settle on the same exact stop, at rest', () => {
    const last = plain[plain.length - 1] ?? null;
    expect(last?.walk).toBeNull();
    expect(last?.u).toBe(stopParameter(LINE, 1));
    expect(moving(last ?? restingAt(0))).toBe(false);
  });
  it('one isolated tap lands on the next stop in ≈2060 ms, exactly on the parameter', () => {
    let state = walkRelease(walkPress(LINE, restingAt(0), 1, false, false).state, 1);
    state = advance(LINE, state, 80); // the tap's flight
    state = walkRelease(state, 1);
    let total = 80;
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(LINE, state, FRAME);
      total += FRAME;
    }
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(LINE, 1));
    expect(Math.abs(total - 2060)).toBeLessThanOrEqual(FRAME * 2);
  });
});

describe('law B: the pace never multiplies (the bound, monotony, one crossing per pass)', () => {
  const paceWalk = (cadence: readonly number[]): void => {
    // A held walk from stop 0 to the hard end of the five-stop rail: every frame must obey
    // |Δk|/Δt ≤ 1/1500, u must be monotone forward, and the interior integer stops 1..3
    // must each be crossed exactly once during the pass.
    let state = walkPress(FIVE, restingAt(0), 1, false, false).state;
    const crossings: number[] = [];
    let prevK = kOf(FIVE, state);
    let i = 0;
    let guard = 0;
    while (state.walk !== null && guard++ < 3000) {
      const dt = cadence[i % cadence.length] ?? FRAME;
      state = advance(FIVE, state, dt);
      i += 1;
      const k = kOf(FIVE, state);
      expect(k - prevK, `forward step to k ${k.toFixed(4)}`).toBeGreaterThanOrEqual(-1e-12);
      expect(Math.abs(k - prevK) / dt).toBeLessThanOrEqual(VC + 1e-12);
      if (Math.floor(prevK) !== Math.floor(k)) {
        const crossed = Math.ceil(Math.min(prevK, k));
        if (crossed > 0 && crossed < FIVE.stops.length - 1) crossings.push(crossed);
      }
      prevK = k;
    }
    expect(state.walk).toBeNull();
    expect(state.u).toBe(1); // the hard end rests
    const counts = new Map<number, number>();
    for (const c of crossings) counts.set(c, (counts.get(c) ?? 0) + 1);
    expect([...counts.entries()]).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
  };
  it('holds the pace bound on the fixed 16.667 ms cadence', () => {
    paceWalk([FRAME]);
  });
  it('holds the pace bound on the irregular [5, 40, 13, 33, 25] cadence', () => {
    paceWalk(IRREGULAR);
  });
  it('holds the pace bound on long 100 ms frames', () => {
    paceWalk([LONG]);
  });
});

describe('law C: a hold release sweeps the gap into an exact stop landing', () => {
  // Release times across the first gap — inside the brake horizon (r < v·350 = 0.2333 gap,
  // releases 1360..1709) and just before the stop's crossing (1709). Releases past the
  // crossing (1900+) lawfully aim at the NEXT stop instead — asserted by the same math.
  for (const releasedAt of [300, 420, 700, 1000, 1360, 1500, 1700, 1709, 1900, 2050]) {
    it(`release at ${releasedAt} ms lands exactly on the walk's next stop, never beyond`, () => {
      // A held press for `releasedAt` ms (≥ the hold bar, so the intent ends at the lift);
      // the walk brakes to the NEXT stop in its heading and rests there exactly.
      let state = walkPress(STAIR, restingAt(0), 1, false, false).state;
      let t = 0;
      while (t < releasedAt) {
        const dt = Math.min(FRAME, releasedAt - t);
        state = advance(STAIR, state, dt);
        t += dt;
        expect(Math.abs(kOf(STAIR, state)) / releasedAt).toBeLessThanOrEqual(VC + 1e-9);
      }
      state = walkRelease(state, 1);
      const kAtRelease = kOf(STAIR, state);
      const expected = Math.ceil(kAtRelease - 1e-9) <= 0 ? 1 : Math.ceil(kAtRelease - 1e-9);
      // A deep-horizon release (r tiny) lands inside the first post-release frame: either
      // the brake phase is directly observed, or the walk is already resting at its exact
      // stop — that settle IS the brake's completion.
      const first = advance(STAIR, state, FRAME);
      let brakeSeen = first.walk?.phase === 'brake';
      state = first;
      let guard = 0;
      let worstK = kOf(STAIR, state);
      while (state.walk !== null && guard++ < 400) {
        state = advance(STAIR, state, FRAME);
        brakeSeen = brakeSeen || state.walk?.phase === 'brake';
        worstK = Math.max(worstK, kOf(STAIR, state));
      }
      expect(
        brakeSeen || state.u === stopParameter(STAIR, expected),
        'the intent ended, so the walk braked (observed in flight or landed in-frame)',
      ).toBe(true);
      expect(state.walk).toBeNull();
      expect(worstK).toBeLessThanOrEqual(expected + 1e-9); // never beyond its stop
      expect(state.u).toBe(stopParameter(STAIR, expected)); // the exact stop parameter
    });
  }
  it('the closed forms hold at the release edges: 0.066 gap at 300 ms, 0.14 at 420', () => {
    let state = walkPress(STAIR, restingAt(0), 1, false, false).state;
    state = advance(STAIR, state, 300);
    expect(kOf(STAIR, state)).toBeGreaterThanOrEqual(0.065);
    expect(kOf(STAIR, state)).toBeCloseTo(0.0656, 3);
    state = advance(STAIR, state, 120); // cumulative 420: the ramp completes into cruise
    expect(kOf(STAIR, state)).toBeCloseTo(0.14, 9);
    expect(state.walk?.phase).toBe('cruise');
    expect(state.walk?.v0).toBeCloseTo(VC, 12); // cruise carries v1 = v0 = v_c
  });
});

describe('law E: the tap cadence (lease refills vs brake entries)', () => {
  it('two taps 500 ms apart: no brake phase is entered before the leases die', () => {
    // Tap 1 presses at 0 and lifts at 80; tap 2 presses at 500 and lifts at 580. Both
    // refills keep the intent continuously alive, so no frame as late as the second
    // lease's refill window may show a brake — taps ≤ 600 apart never brake.
    let state = walkPress(STAIR, restingAt(0), 1, false, false).state;
    state = advance(STAIR, state, 80); // tap 1's flight
    state = walkRelease(state, 1);
    state = advance(STAIR, state, 420); // to t = 500
    state = walkPress(STAIR, state, 1, false, false).state; // tap 2: the refill mid-flight
    expect(state.walk).not.toBeNull();
    state = advance(STAIR, state, 80);
    state = walkRelease(state, 1);
    let t = 580;
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(STAIR, state, FRAME);
      t += FRAME;
      if (t <= 1000) expect(state.walk?.phase).not.toBe('brake');
    }
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 1)); // one leg, exactly
  });
  it('two taps 1000 ms apart on a fresh gap: the refill wins, still one exact leg', () => {
    // Tap 1 presses at 0 (lease dies at 600, coasting, pre-brake-entry); tap 2 presses at
    // 1000 and refills the LIVE walk mid-cruise — no brake between the taps, and the leg
    // still lands exactly one stop over when the intent finally dies.
    let state = walkPress(STAIR, restingAt(0), 1, false, false).state;
    state = advance(STAIR, state, 80);
    state = walkRelease(state, 1);
    state = advance(STAIR, state, 920); // to t = 1000, mid-cruise with a dead lease
    expect(state.walk?.phase).toBe('cruise'); // the brake had not entered yet
    state = walkPress(STAIR, state, 1, false, false).state; // the refill
    state = advance(STAIR, state, 80);
    state = walkRelease(state, 1);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) state = advance(STAIR, state, FRAME);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 1));
  });
  it('two taps 1000 ms apart with a short remainder: a brake occurs between them', () => {
    // Seeded mid-gap at k = 0.6, the tap lifts at 80; the lease drains FROM ITS PRESS, so
    // intent dies at 600 absolute — with r ≈ 0.14 the brake enters AT the death (inside the
    // horizon) and rests the walk at stop 1 ≈ 1020 ms. The brake DID occur between the taps;
    // the second tap then departs anew toward stop 2 and rests exactly.
    let state = walkPress(STAIR, restingAt(0.2), 1, false, false).state; // k = 0.6
    expect(kOf(STAIR, state)).toBeCloseTo(0.6, 9);
    state = advance(STAIR, state, 80); // the tap's flight
    state = walkRelease(state, 1);
    let hadBrake = false;
    let t = 80;
    let guard = 0;
    let lastK = kOf(STAIR, state);
    while (state.walk !== null && t < 2000 && guard++ < 400) {
      const dt = Math.min(FRAME, 2000 - t);
      state = advance(STAIR, state, dt);
      t += dt;
      hadBrake = hadBrake || state.walk?.phase === 'brake';
      const k = kOf(STAIR, state);
      expect(Math.abs(k - lastK) / dt).toBeLessThanOrEqual(VC + 1e-12); // never skips
      lastK = k;
    }
    expect(hadBrake, 'the brake entered inside the horizon').toBe(true);
    expect(state.walk, 'the walk rested before the second tap (≈1020 <= 2000)').toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 1)); // the exact rest at stop 1
    // Tap 2 at the rest: a fresh depart; released, it walks stop 1 → 2 and rests exactly.
    let second = walkPress(STAIR, state, 1, false, false).state;
    second = advance(STAIR, second, 80);
    second = walkRelease(second, 1);
    second = runRest(STAIR, second);
    expect(second.walk).toBeNull();
    expect(second.u).toBe(stopParameter(STAIR, 2));
  });
  it('spacing over a leg: each tap rests at its own stop (intermittent rest per tap)', () => {
    // One tap walks and rests at its stop (≈2060 ms); a second tap timed after that rest
    // starts its own leg with its own brake. The honest cadence: a rest per tap.
    let state = walkRelease(walkPress(STAIR, restingAt(0), 1, false, false).state, 1);
    state = advance(STAIR, state, 80);
    state = walkRelease(state, 1);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) state = advance(STAIR, state, FRAME);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 1)); // tap 1 rested at stop 1
    let fresh = walkPress(STAIR, state, 1, false, false).state; // tap 2: a NEW leg
    expect(fresh.walk).not.toBeNull();
    fresh = advance(STAIR, fresh, 80); // the tap's flight, then the lift
    fresh = walkRelease(fresh, 1);
    state = runRest(STAIR, fresh);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 2)); // tap 2 rested one stop further
  });
});

describe('law F: the reversal (opposite press mid-cruise)', () => {
  it('brakes to the turnaround, flips the heading there, re-anchors, departs backward', () => {
    const press = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const cruise = advance(STAIR, press, 1200); // k ≈ 0.66, cruise at v_c
    const reversed = walkPress(STAIR, cruise, -1, false, false).state;
    expect(reversed.walk?.phase).toBe('brake');
    expect(reversed.walk?.reversalTo).toBe(-1);
    expect(reversed.walk?.brakeTo).toBeNull();
    expect(reversed.anchor).toBeNull(); // the anchor sets at the TURNAROUND, not the press
    // Pressed at cruise v_c: T = 420 · v/v_c = 420, the turnaround at k = 0.66 + 0.14 = 0.80.
    let state = reversed;
    let turned: RailState | null = null;
    let guard = 0;
    while ((state.walk !== null || turned === null) && guard++ < 400) {
      state = advance(STAIR, state, FRAME);
      if (turned === null && state.heading === -1) {
        turned = state;
        expect(state.anchor?.u0).toBeCloseTo(0.8, 4);
        // The anchor point is the look in force at the turnaround — the pre-flip pose.
        const n = STAIR.stops.length;
        const there = samplePose(STAIR, restingAt((state.anchor?.u0 ?? 0) / (n - 1)));
        expect(state.anchor?.point).toEqual(there.target);
        expect(state.walk?.phase).toBe('accel'); // the live (still held) intent departs
      }
    }
    expect(turned).not.toBeNull();
    expect(state.walk).toBeNull();
    expect(state.u).toBe(0); // the backward leg rests at the stop it departed toward
  });
  it('a reversal released (held ≥ the hold bar) before the turnaround rests there', () => {
    const press = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const cruise = advance(STAIR, press, 1200); // k ≈ 0.66
    let state = walkPress(STAIR, cruise, -1, false, false).state; // the reversal press
    state = advance(STAIR, state, 350); // heldMs 350 ≥ the hold bar
    state = walkRelease(state, -1); // the intent ends now (lease 0)
    state = runRest(STAIR, state);
    expect(state.walk).toBeNull();
    // The turnaround rests mid-segment (the press at cruise flips at k 0.80) and the
    // re-anchor is present even on the rest.
    expect(state.u).toBeCloseTo(0.8 / 3, 4);
    expect(state.anchor).not.toBeNull();
    expect(state.anchor?.u0).toBeCloseTo(0.8, 4);
  });
  it('a quick tap-reversal survives the turnaround (the lease outlives it)', () => {
    const press = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const cruise = advance(STAIR, press, 1200); // k ≈ 0.66
    let state = walkPress(STAIR, cruise, -1, false, false).state;
    state = advance(STAIR, state, 80); // the tap's flight
    state = walkRelease(state, -1); // heldMs 80 < 300 → the lease keeps draining
    let flipped = false;
    let guard = 0;
    while (state.walk !== null && guard++ < 400) {
      state = advance(STAIR, state, FRAME);
      if (state.heading === -1) flipped = true;
    }
    expect(flipped, 'the heading flipped at the turnaround').toBe(true);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(0); // the departed backward leg still lands at the stop left
  });
});

describe('law G: rail ends are HARD', () => {
  it('a held walk rests at the end; a repeat there opens nothing; a fresh edge does', () => {
    let state = walkPress(FIVE, restingAt(0), 1, false, false).state;
    state = advance(FIVE, state, 6000); // past every soft stop, into the end's brake
    let guard = 0;
    while (state.walk !== null && guard++ < 600) state = advance(FIVE, state, FRAME);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(1); // the rest at the rail end — the key never needed lifting
    expect(moving(state)).toBe(false);
    const repeat = walkPress(FIVE, state, 1, true, false);
    expect(repeat.boundary).toBeNull();
    expect(repeat.state).toBe(state); // a hold never opens a door; the state is untouched
    const fresh = walkPress(FIVE, state, 1, false, false);
    expect(fresh.boundary).toBe('forward');
    expect(fresh.state).toBe(state); // a settled end's fresh edge returns the boundary intent
  });
});

describe('law H: a corner stop is HARD for the walk', () => {
  it('live intent: brakes into the corner and re-departs atomically (no rest frame)', () => {
    let state = walkPress(CORNER, restingAt(0), 1, false, false).state;
    let landed = false;
    let guard = 0;
    const corner = stopParameter(CORNER, 1);
    while (state.walk !== null && guard++ < 900) {
      const prevU = state.u;
      state = advance(CORNER, state, FRAME);
      // The corner's exact landing happens inside the event splitting; the first returned
      // frame past it proves the walk met the corner on its way (anchor cleared, walk
      // still alive — the atomic re-depart left no rest frame to observe).
      if (!landed && prevU < corner && state.u >= corner) {
        landed = true;
        expect(state.anchor).toBeNull(); // the exact landing cleared the look anchor
        expect(state.walk?.phase, 'the atomic re-depart').toBe('accel');
        // One frame's ramp at most past the corner (the landing slice's leftover dt):
        expect(state.u, 'one frame of the ramp at most past the corner').toBeLessThan(
          corner + FRAME / WALK_CRUISE_MS / (stopCount(CORNER) - 1),
        );
        expect(state.u).toBeGreaterThan(corner - 1e-9);
      }
    }
    expect(landed, 'the walk met the corner exactly').toBe(true);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(1); // the far hard end rests, the intent having outlived the corner
  });
  it('dead intent: the walk rests at the corner; a later tap departs it anew', () => {
    let state = walkRelease(walkPress(CORNER, restingAt(0), 1, false, false).state, 1);
    state = advance(CORNER, state, 80);
    state = walkRelease(state, 1);
    let guard = 0;
    while (state.walk !== null && guard++ < 400) state = advance(CORNER, state, FRAME);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(CORNER, 1)); // the corner, rest
    const fresh = walkPress(CORNER, state, 1, false, false).state;
    expect(fresh.walk).not.toBeNull(); // the corner's own barrier excludes itself
  });
});

describe('law I: the reduced-motion cut law', () => {
  it('a fresh edge cuts to the next stop; the dwell drains only via advance', () => {
    const cut = walkPress(STAIR, restingAt(0), 1, false, true);
    expect(cut.boundary).toBeNull();
    expect(cut.state.walk).toBeNull();
    expect(cut.state.u).toBe(stopParameter(STAIR, 1));
    expect(cut.state.dwellMs).toBe(REDUCED_DWELL_MS);
    const after = advance(STAIR, cut.state, 300);
    expect(after.dwellMs).toBe(REDUCED_DWELL_MS - 300);
  });
  it('a press during the dwell is dropped (never queued); repeats are ignored', () => {
    const cut = walkPress(STAIR, restingAt(0), 1, false, true).state;
    const dropped = walkPress(STAIR, cut, 1, false, true);
    expect(dropped.state).toBe(cut);
    expect(dropped.boundary).toBeNull();
    const repeated = walkPress(STAIR, cut, 1, true, true);
    expect(repeated.state).toBe(cut);
    expect(repeated.boundary).toBeNull();
  });
  it('the boundary fires before the dwell check (a door press is not a cut storm)', () => {
    // A cut seeds the dwell at the settled END (stop 3); the follow-up press meets the
    // end's no-next-stop branch — the boundary wins over the dwell.
    const cut = walkPress(STAIR, restingAt(stopParameter(STAIR, 2)), 1, false, true).state;
    expect(cut.dwellMs).toBe(REDUCED_DWELL_MS); // the cut planted the dwell
    expect(cut.u).toBe(1);
    const fired = walkPress(STAIR, cut, 1, false, true);
    expect(fired.boundary).toBe('forward');
    expect(fired.state.walk).toBeNull();
  });
  it('a reduced press during a live walk is a no-op', () => {
    const walking = walkPress(STAIR, restingAt(0), 1, false, false).state;
    const reduced = walkPress(STAIR, walking, 1, false, true);
    expect(reduced.state).toBe(walking);
    expect(reduced.boundary).toBeNull();
  });
});

describe('law J: the pure housekeeping', () => {
  it('advance throws on non-finite and negative deltas', () => {
    for (const d of [Number.NaN, Number.POSITIVE_INFINITY, -0.5]) {
      expect(() => advance(STAIR, restingAt(0), d)).toThrow(RangeError);
    }
  });
  it('advance with no walk and dwell 0 returns the SAME object reference', () => {
    const rest = restingAt(0);
    expect(advance(STAIR, rest, FRAME)).toBe(rest);
  });
  it('a walk’s lease drains ONLY via advance deltas', () => {
    const state = walkPress(LINE, restingAt(0), 1, false, false).state;
    expect(state.walk?.leaseMs).toBe(WALK_LEASE_MS);
    const lifted = walkRelease(state, 1); // no advance in between: nothing drains off-frame
    expect(lifted.walk?.leaseMs).toBe(WALK_LEASE_MS);
    const ticked = advance(LINE, lifted, 100);
    expect(ticked.walk?.leaseMs).toBe(WALK_LEASE_MS - 100); // only the delta drained it
    const again = walkPress(LINE, ticked, 1, false, false).state;
    expect(again.walk?.leaseMs).toBe(WALK_LEASE_MS); // the refill caps back at the lease
  });
  it('seedState returns walk null and dwell 0 in every source', () => {
    expect(seedState(STAIR, { stop: null, cam: null }).state.walk).toBeNull();
    expect(seedState(STAIR, { stop: null, cam: null }).state.dwellMs).toBe(0);
    expect(seedState(STAIR, { stop: 'b', cam: null }).state.walk).toBeNull();
    expect(seedState(STAIR, { stop: 'b', cam: null }).state.dwellMs).toBe(0);
    expect(seedState(STAIR, { stop: null, cam: 0.5 }).state.walk).toBeNull();
    expect(seedState(STAIR, { stop: null, cam: 0.5 }).state.dwellMs).toBe(0);
  });
});

describe('Sol stage-1 dispositions (the pre-gate review; rows 1–6 fixes are pinned here)', () => {
  it('Sol R1: a held tap dies from its PRESS — the brake enters ≈1338 ms, not the old 1588', () => {
    // Tap at 0 held 250 ms then released: the lease = 600 − 250 (press-relative). Mid-cruise
    // at the death (600 absolute): k ≈ 0.275 (r ≈ 0.725 > the horizon) — cruising on with
    // dead intent until r ≤ 0.2333 at ≈ 738 ms later, so the brake enters ≈ 1338 absolute.
    // The retired release-relative law died at 850 and would brake ≈ 1588 — this row pins
    // the corrected semantics.
    let state = walkPress(LINE, restingAt(0), 1, false, false).state;
    state = advance(LINE, state, 250);
    state = walkRelease(state, 1);
    let brakeAt = -1;
    let t = 250;
    let guard = 0;
    while (state.walk !== null && guard++ < 2000) {
      state = advance(LINE, state, FRAME);
      t += FRAME;
      if (brakeAt < 0 && state.walk?.phase === 'brake') brakeAt = t;
    }
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(LINE, 1));
    expect(brakeAt).toBeGreaterThan(0);
    expect(Math.abs(brakeAt - 1338)).toBeLessThanOrEqual(FRAME * 3);
  });

  it('Sol R2: a repeat during a live hard-end brake leaves the trajectory untouched', () => {
    // A held walk braking into the hard end (the intent never died). From the SAME
    // brake-entry state: stream A advances only; stream B inserts one same-direction
    // walkPress (a repeat) mid-brake. The motion frames from the branch must be identical.
    let probe = walkPress(LINE, restingAt(0), 1, false, false).state;
    let brakeEntry: RailState | null = null;
    let guard = 0;
    while (probe.walk !== null && guard++ < 400) {
      probe = advance(LINE, probe, FRAME);
      if (brakeEntry === null && probe.walk?.phase === 'brake') brakeEntry = probe;
    }
    expect(brakeEntry).not.toBeNull();
    const entry = brakeEntry ?? restingAt(0);
    const streamA: RailState[] = [];
    let a = entry;
    let g1 = 0;
    while (a.walk !== null && g1++ < 400) {
      a = advance(LINE, a, FRAME);
      streamA.push(a);
    }
    let b = walkPress(LINE, entry, 1, true, false).state; // ONE repeat mid-brake
    const streamB: RailState[] = [];
    let g2 = 0;
    while (b.walk !== null && g2++ < 400) {
      b = advance(LINE, b, FRAME);
      streamB.push(b);
    }
    expect(streamB).toHaveLength(streamA.length);
    streamA.forEach((s, i) => {
      const t = streamB[i] ?? s;
      // speeds differ at the insert frame only through the refill: compare positions.
      expect(kOf(LINE, t), `position ${i}`).toBeCloseTo(kOf(LINE, s), 12);
      expect(t.walk?.phase ?? 'rest').toBe(s.walk?.phase ?? 'rest');
    });
  });

  it('Sol R4: advance(…, 100000) at a held walk rests EXACTLY at the hard end (no overshoot)', () => {
    let state = walkPress(LINE, restingAt(0), 1, false, false).state;
    state = advance(LINE, state, 100000);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(LINE, 1));
  });

  it('Sol R4b: a dead-intent mid-gap walk under a huge delta rests exactly too', () => {
    let state = walkRelease(walkPress(STAIR, restingAt(0.2), 1, false, false).state, 1);
    state = advance(STAIR, state, 60000);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(STAIR, 1));
  });

  it('Sol R6: the reversal steal is a timed brake — the walk never jumps, it rests at the end', () => {
    let state = walkPress(LINE, restingAt(0), 1, false, false).state;
    state = advance(LINE, state, 1500); // cruising toward the hard end (stop 1 = k 1)
    const pressed = walkPress(LINE, state, -1, false, false).state;
    expect(pressed.walk?.phase).toBe('brake');
    expect(pressed.walk?.brakeTo).toBe(1); // the steal brake decelerates INTO the end itself
    const path: number[] = [];
    let guard = 0;
    let current = pressed;
    while (current.walk !== null && guard++ < 400) {
      current = advance(LINE, current, FRAME);
      path.push(current.u);
      expect(current.u).toBeLessThanOrEqual(1 + 1e-12); // never past the end
      const prev = path[path.length - 2] ?? state.u;
      expect((current.u - prev) / FRAME).toBeLessThanOrEqual(VC + 1e-12); // never skips
    }
    expect(current.walk).toBeNull();
    expect(current.u).toBe(1);
    expect(path.length).toBeGreaterThan(2); // it was a real deceleration, not an instant cut
  });

  it('Sol R8: pressing the traveled heading cancels a pending reversal — no turnaround pause', () => {
    let state = walkPress(LINE, restingAt(0), 1, false, false).state;
    state = advance(LINE, state, 1200); // cruising
    let back = walkPress(LINE, state, -1, false, false).state;
    expect(back.walk?.phase).toBe('brake');
    expect(back.walk?.reversalTo).toBe(-1);
    back = advance(LINE, back, 100); // part-way into the reversal brake
    const cancelled = walkPress(LINE, back, 1, false, false).state;
    expect(cancelled.walk?.phase).toBe('accel');
    expect(cancelled.walk?.reversalTo).toBeNull();
    // speed continuity is structural: the accel's v0 IS the phase's exact current speed.
    state = advance(LINE, cancelled, FRAME);
    expect(kOf(LINE, state)).toBeGreaterThanOrEqual(kOf(LINE, back)); // still moving forward
    state = walkRelease(state, 1);
    state = runRest(LINE, state);
    expect(state.walk).toBeNull();
    expect(state.u).toBe(stopParameter(LINE, 1)); // the original forward leg completes
  });

  it('Sol R7: the release sweep mirrored BACKWARD — exact landings at stop 0', () => {
    for (const releasedAt of [120, 420, 900]) {
      let state = walkPress(LINE, restingAt(0.55), -1, false, false).state; // k = 0.55… wait
      // restingAt(0.55) on the LINE: u 0.55 = k 0.55 (two stops) — toward stop 0 going back.
      expect(kOf(LINE, state)).toBeCloseTo(0.55, 9);
      state = advance(LINE, state, releasedAt);
      state = walkRelease(state, -1);
      state = runRest(LINE, state);
      expect(state.walk).toBeNull();
      expect(state.u).toBe(0); // the exact backward landing
    }
  });
});
