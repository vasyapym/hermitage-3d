// §2 door lean — the movement-ux ruling's PULSE law: LeanInput = { pulse, deltaMs,
// reducedMotion }; the target is ONE declared magnitude while the last boundary press edge
// is fresh (the host stamps its pulse clock) — no budget scaling exists anymore. A
// pulse=true input behaves EXACTLY like the old budget ≥ EDGE_BUDGET_PX full case, so the
// spring rows keep their numbers with re-pinned inputs. The EDGE_BUDGET_PX import is gone
// with the retired wheel (src/camera/wheel-edge.ts deleted).
import { describe, expect, it } from 'vitest';

import {
  advanceLean,
  LEAN_FRESH_MS,
  LEAN_MAX_M,
  LEAN_RELEASE_MS,
  LEAN_RISE_MS,
  LEAN_START,
  leanPose,
  leanTarget,
} from '../src/camera/door-lean';

const run = (pulse: boolean, frames: number, dt: number, reducedMotion = false) => {
  let state = LEAN_START;
  for (let i = 0; i < frames; i += 1) {
    state = advanceLean(state, { pulse, deltaMs: dt, reducedMotion });
  }
  return state;
};

describe('§2 door lean: a full lean while the pulse is fresh, sprung, exactly zero at rest', () => {
  it('targets the declared magnitude on a fresh pulse and nothing otherwise', () => {
    expect(leanTarget(true, false)).toBe(LEAN_MAX_M);
    expect(leanTarget(false, false)).toBe(0);
    expect(leanTarget(true, true)).toBe(0);
    expect(leanTarget(false, true)).toBe(0);
  });

  it('rises quickly toward the target and holds while the pulse is fresh', () => {
    const rising = run(true, 1, LEAN_RISE_MS);
    expect(rising.metres).toBeCloseTo(LEAN_MAX_M * (1 - Math.exp(-1)), 9);
    const held = run(true, 60, 16);
    expect(held.metres).toBe(LEAN_MAX_M);
    expect(
      advanceLean(held, {
        pulse: true,
        deltaMs: 16,
        reducedMotion: false,
      }),
    ).toBe(held);
  });

  it('springs back slower than it rose and lands on exactly zero', () => {
    const full = { metres: LEAN_MAX_M };
    const back = advanceLean(full, {
      pulse: false,
      deltaMs: LEAN_RELEASE_MS,
      reducedMotion: false,
    });
    expect(back.metres).toBeCloseTo(LEAN_MAX_M * Math.exp(-1), 9);
    expect(LEAN_RELEASE_MS).toBeGreaterThan(LEAN_RISE_MS);
    let state = full;
    for (let i = 0; i < 200; i += 1) {
      state = advanceLean(state, { pulse: false, deltaMs: 16, reducedMotion: false });
    }
    expect(state.metres).toBe(0);
  });

  it('releases when the pulse goes stale: the host stops stamping, the lean reads the age', () => {
    // The lean's own read: a fresh pulse holds the target; past LEAN_FRESH_MS without a
    // new press edge the target is 0 whatever the snapshot — the paused press springs back.
    expect(leanTarget(false, false)).toBe(0);
    const held = run(true, 60, 16);
    const stale = advanceLean(held, {
      pulse: false,
      deltaMs: LEAN_FRESH_MS + 16,
      reducedMotion: false,
    });
    expect(stale.metres).toBeLessThan(held.metres);
    let state = stale;
    for (let i = 0; i < 200; i += 1) {
      state = advanceLean(state, { pulse: false, deltaMs: 16, reducedMotion: false });
    }
    expect(state.metres).toBe(0);
  });

  it('is absent under reduced motion and at rest hands back the same state', () => {
    expect(run(true, 5, 16, true)).toBe(LEAN_START);
    expect(advanceLean(LEAN_START, { pulse: false, deltaMs: 16, reducedMotion: false })).toBe(
      LEAN_START,
    );
  });

  it('leanPose dollies position and target together and is identity at zero', () => {
    const pose = { position: [0, 1.7, 86] as const, target: [0, 1.7, 90] as const };
    expect(leanPose(pose, [0, 0, 1], 0)).toBe(pose);
    const leaned = leanPose(pose, [0, 0, 1], 0.2);
    expect(leaned.position).toEqual([0, 1.7, 86.2]);
    expect(leaned.target).toEqual([0, 1.7, 90.2]);
    expect(() => leanPose(pose, [0, 0, 2], 0.2)).toThrow(RangeError);
    expect(() => leanPose(pose, [0, 0, 1], -0.1)).toThrow(RangeError);
  });

  it('demands finite non-negative time, loud', () => {
    expect(() =>
      advanceLean(LEAN_START, { pulse: true, deltaMs: -1, reducedMotion: false }),
    ).toThrow(RangeError);
  });
});
