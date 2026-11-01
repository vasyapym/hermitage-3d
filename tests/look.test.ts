/**
 * Gates for the look response law (design-staircase.md §6.1 look offsets and limits; the r21
 * owner report; §10 row r21): damping convergence, frame-rate independence, viewport-normalized
 * sensitivity, the clamp interplay, at-rest identity, reduced-motion neutrality.
 */
import { describe, expect, it } from 'vitest';
import type { LookLimits, LookOffset } from '../src/camera/look';
import {
  clampLook,
  DRAG_SPAN_DEG,
  dampingAlpha,
  dragDegPerPx,
  dragLook,
  easeLook,
  LOOK_TAU_MS,
  lookSettled,
  NO_LOOK,
  settleLook,
  TOUCH_SPAN_FACTOR,
} from '../src/camera/look';

const LIM = { yaw: 30, pitchUp: 20, pitchDown: 15 } satisfies LookLimits;
const TARGET = { yaw: 30, pitch: -10 } satisfies LookOffset;
const FRAME_MS = 1000 / 60;
const easeFor = (from: LookOffset, to: LookOffset, dtMs: number, steps: number): LookOffset => {
  let look = from;
  for (let i = 0; i < steps; i += 1) look = easeLook(look, to, dtMs);
  return look;
};
const within = (look: LookOffset, lim: LookLimits): boolean =>
  Math.abs(look.yaw) <= lim.yaw && look.pitch <= lim.pitchUp && look.pitch >= -lim.pitchDown;

describe('damping convergence', () => {
  it('closes 1 - e^-1 of the gap per TAU and nothing at dt 0', () => {
    expect(dampingAlpha(0)).toBe(0);
    expect(dampingAlpha(LOOK_TAU_MS)).toBeCloseTo(1 - Math.exp(-1), 12);
  });
  it('rejects a negative or non-finite dt', () => {
    for (const dt of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => dampingAlpha(dt)).toThrow(RangeError);
      expect(() => easeLook(NO_LOOK, TARGET, dt)).toThrow(RangeError);
    }
  });
  it('a 60 Hz frame moves part of the way and never past the target', () => {
    const next = easeLook(NO_LOOK, TARGET, FRAME_MS);
    expect(next.yaw).toBeCloseTo(TARGET.yaw * dampingAlpha(FRAME_MS), 12);
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.yaw).toBeLessThan(TARGET.yaw);
    expect(next.pitch).toBeLessThan(0);
    expect(next.pitch).toBeGreaterThan(TARGET.pitch);
  });
  it('approaches monotonically and lands on the target exactly within two seconds', () => {
    let look: LookOffset = NO_LOOK;
    for (let i = 0; i < 120; i += 1) {
      const next = easeLook(look, TARGET, FRAME_MS);
      expect(next.yaw).toBeGreaterThanOrEqual(look.yaw);
      expect(next.pitch).toBeLessThanOrEqual(look.pitch);
      look = next;
    }
    expect(look).toEqual(TARGET);
    expect(lookSettled(look, TARGET)).toBe(true);
  });
});

describe('frame-rate independence', () => {
  it('one 100 ms step settles where ten 10 ms steps do', () => {
    const one = easeLook(NO_LOOK, TARGET, 100);
    const ten = easeFor(NO_LOOK, TARGET, 10, 10);
    expect(ten.yaw).toBeCloseTo(one.yaw, 9);
    expect(ten.pitch).toBeCloseTo(one.pitch, 9);
    expect(one.yaw).toBeCloseTo(TARGET.yaw * (1 - Math.exp(-100 / LOOK_TAU_MS)), 9);
  });
  it('a dropped frame catches up: one 48 ms step equals three 16 ms steps', () => {
    const one = easeLook(NO_LOOK, TARGET, 48);
    const three = easeFor(NO_LOOK, TARGET, 16, 3);
    expect(three.yaw).toBeCloseTo(one.yaw, 9);
    expect(three.pitch).toBeCloseTo(one.pitch, 9);
  });
});

describe('sensitivity', () => {
  it('the same viewport fraction yields the same degrees on any screen (mouse)', () => {
    for (const vh of [568, 844, 1080, 2160]) {
      expect(dragLook(NO_LOOK, 0, vh / 2, vh, 'mouse').pitch).toBeCloseTo(DRAG_SPAN_DEG / 2, 9);
      expect(dragDegPerPx(vh, 'mouse') * vh).toBeCloseTo(DRAG_SPAN_DEG, 9);
    }
  });
  it('touch runs TOUCH_SPAN_FACTOR hotter; mouse and pen are identical', () => {
    for (const vh of [568, 844, 1080]) {
      const mouse = dragLook(NO_LOOK, 0, 100, vh, 'mouse');
      expect(dragLook(NO_LOOK, 0, 100, vh, 'touch').pitch).toBeCloseTo(
        mouse.pitch * TOUCH_SPAN_FACTOR,
        12,
      );
      expect(dragLook(NO_LOOK, 0, 100, vh, 'pen').pitch).toBe(mouse.pitch);
      expect(dragDegPerPx(vh, 'touch') / dragDegPerPx(vh, 'mouse')).toBeCloseTo(
        TOUCH_SPAN_FACTOR,
        12,
      );
    }
  });
  it('pins the R19-ux span: 33° per viewport height, touch 1.15× hotter', () => {
    expect(DRAG_SPAN_DEG).toBe(33);
    expect(dragDegPerPx(744, 'mouse')).toBeCloseTo(33 / 744, 12);
    expect(dragDegPerPx(744, 'touch')).toBeCloseTo((33 * 1.15) / 744, 12);
  });
  it('is isotropic and accumulates onto the given target', () => {
    const k = dragDegPerPx(800, 'mouse');
    const diagonal = dragLook(NO_LOOK, 120, 120, 800, 'mouse');
    expect(diagonal.yaw).toBe(diagonal.pitch);
    const moved = dragLook({ yaw: 5, pitch: -2 }, 100, -50, 800, 'mouse');
    expect(moved.yaw).toBeCloseTo(5 + 100 * k, 12);
    expect(moved.pitch).toBeCloseTo(-2 - 50 * k, 12);
  });
  it('rejects a non-positive or non-finite viewport height and non-finite deltas', () => {
    for (const vh of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => dragDegPerPx(vh, 'mouse')).toThrow(RangeError);
    }
    expect(() => dragLook(NO_LOOK, Number.NaN, 0, 800, 'mouse')).toThrow(RangeError);
    expect(() => dragLook(NO_LOOK, 0, Number.POSITIVE_INFINITY, 800, 'mouse')).toThrow(RangeError);
  });
});

describe('clamp interplay', () => {
  it('an oversized drag clamps the target to the limits on both axes', () => {
    expect(clampLook(dragLook(NO_LOOK, 5000, 5000, 1000, 'mouse'), LIM)).toEqual({
      yaw: 30,
      pitch: 20,
    });
    const down = clampLook(dragLook(NO_LOOK, -5000, -5000, 1000, 'mouse'), LIM);
    expect(down).toEqual({ yaw: -30, pitch: -15 });
  });
  it('the eased current never leaves the limits and lands on the clamped target', () => {
    const target = clampLook(dragLook(NO_LOOK, 5000, -5000, 1000, 'mouse'), LIM);
    let look: LookOffset = NO_LOOK;
    for (let i = 0; i < 120; i += 1) {
      look = easeLook(look, target, FRAME_MS);
      expect(within(look, LIM)).toBe(true);
    }
    expect(look).toEqual(target);
  });
  it('a limit shrink re-clamps both the target and the current on settle', () => {
    const tight = { yaw: 10, pitchUp: 5, pitchDown: 5 } satisfies LookLimits;
    const wide = { look: { yaw: 25, pitch: -12 }, lookTarget: { yaw: 30, pitch: 20 } };
    const s = settleLook(wide, tight);
    expect(s.look).toEqual({ yaw: 10, pitch: -5 });
    expect(s.lookTarget).toEqual({ yaw: 10, pitch: 5 });
  });
  it('settle leaves in-range values as they are', () => {
    const inRange = { look: { yaw: 3, pitch: -1 }, lookTarget: { yaw: 6, pitch: 2 } };
    expect(settleLook(inRange, LIM)).toEqual(inRange);
  });
});

describe('at rest', () => {
  it('easing a settled look hands back the very same object', () => {
    expect(easeLook(NO_LOOK, NO_LOOK, FRAME_MS)).toBe(NO_LOOK);
    const held = { yaw: 3, pitch: -1 } satisfies LookOffset;
    expect(easeLook(held, { ...held }, 1000)).toBe(held);
  });
  it('settling the untouched zero look is value-identical to the committed clamp', () => {
    const s = settleLook({ look: NO_LOOK, lookTarget: NO_LOOK }, LIM);
    expect(s.look).toEqual({ yaw: 0, pitch: 0 });
    expect(s.lookTarget).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe('reduced motion', () => {
  it('takes no motion preference: every finite frame damps, none jumps', () => {
    for (const dt of [1, FRAME_MS, 100, 500]) {
      expect(dampingAlpha(dt)).toBeGreaterThan(0);
      expect(dampingAlpha(dt)).toBeLessThan(1);
      const next = easeLook(NO_LOOK, TARGET, dt);
      expect(next.yaw).toBeGreaterThan(0);
      expect(next.yaw).toBeLessThan(TARGET.yaw);
    }
  });
});
