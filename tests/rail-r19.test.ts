/** R19-ux B/C: design-walkthrough-ux §8 timing, the frozen departure ray and the stop-pose
 * fence. */
import { describe, expect, it } from 'vitest';
import { contract as military } from '../rooms/1812/contract';
import { contract as jordan } from '../rooms/jordan/contract';
import { contract as gallery } from '../rooms/rastrelli-gallery/contract';
import {
  advance,
  committedTarget,
  restingAt,
  SCROLL_GLIDE_MS,
  STEP_GLIDE_MS,
  samplePose,
  stepStop,
  stopParameter,
} from '../src/camera/rail';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import type { Rail } from '../src/world/registry';

const TURN_RAIL = {
  stops: [
    {
      id: 'J0',
      position: [0, 0, 0],
      subject: [10, 0, -10],
      look: { yaw: 35, pitchUp: 45, pitchDown: 10 },
      caption: 'caption.j0',
    },
    {
      id: 'J1',
      position: [0, 0, -10],
      subject: [0, 0, -100],
      look: { yaw: 25, pitchUp: 20, pitchDown: 20 },
      caption: 'caption.j1',
    },
  ],
} satisfies Rail;

const RAILS: readonly Rail[] = [SQUARE_RAIL, gallery.rail, jordan.rail, military.rail];

describe('R19-ux B/C', () => {
  it('reduces both travel durations by exactly 15%', () => {
    expect(STEP_GLIDE_MS).toBe(2380);
    expect(SCROLL_GLIDE_MS).toBe(544);
    expect(STEP_GLIDE_MS / 2800).toBeCloseTo(0.85, 12);
    expect(SCROLL_GLIDE_MS / 640).toBeCloseTo(0.85, 12);
  });

  it('carries the framing arc at the distance weight (B9 pacing)', () => {
    // B9: the aim is the arc between the two framings × the distance fraction s(τ);
    // the limits ride the same weight. R19-ux B's smootherstep position easing is
    // unchanged, so the position row reads as before.
    const started = stepStop(TURN_RAIL, restingAt(0), 1, false).state;
    const pose = samplePose(TURN_RAIL, advance(TURN_RAIL, started, 476));
    const dx = pose.target[0] - pose.position[0];
    const dz = pose.target[2] - pose.position[2];
    expect(pose.position[2]).toBeCloseTo(-0.5792, 8);
    // framings: a = atan2(10, 10) = 45°, d = 0°; s(0.2) = 0.05792 → yaw 45·(1−s) = 42.3936°
    expect((Math.atan2(dx, -dz) * 180) / Math.PI).toBeCloseTo(42.3936, 4);
    expect(pose.limits.yaw).toBeCloseTo(34.4208, 6);
    expect(pose.limits.pitchUp).toBeCloseTo(43.552, 6);
    expect(pose.limits.pitchDown).toBeCloseTo(10.5792, 6);
    // s(0.4) = smootherstep(0.4) = 0.31744 → yaw 45·(1−s) = 30.7152°; limits
    // {35→25, 45→20, 10→20} blended: {31.8256, 37.064, 13.1744}
    const held = samplePose(TURN_RAIL, advance(TURN_RAIL, started, 952));
    expect(held.position[2]).toBeCloseTo(-3.1744, 8);
    const dx2 = held.target[0] - held.position[0];
    const dz2 = held.target[2] - held.position[2];
    expect((Math.atan2(dx2, -dz2) * 180) / Math.PI).toBeCloseTo(30.7152, 4);
    expect(held.limits.yaw).toBeCloseTo(31.8256, 6);
    // the arrival keeps the fence: the destination framing object + the destination rows
    const arrived = samplePose(TURN_RAIL, advance(TURN_RAIL, started, 2380));
    expect(arrived.target).toBe(committedTarget(TURN_RAIL, 1));
    expect(arrived.limits).toEqual({ yaw: 25, pitchUp: 20, pitchDown: 20 });
  });

  it('retains the shared-subject dolly before the nominal turn has completed', () => {
    const rail = jordan.rail;
    const started = stepStop(rail, restingAt(0), 1, false).state;
    for (const elapsed of [0, 16, 238, 476, 952, 2380]) {
      expect(samplePose(rail, advance(rail, started, elapsed)).target).toBe(
        committedTarget(rail, 0),
      );
    }
  });

  it('preserves every stop position and target object in both directions', () => {
    for (const rail of RAILS) {
      for (let i = 0; i < rail.stops.length; i++) {
        const stop = rail.stops[i];
        if (stop === undefined) throw new Error('missing committed stop');
        for (const heading of [1, -1] as const) {
          const state = { ...restingAt(stopParameter(rail, i)), heading };
          const pose = samplePose(rail, state);
          expect(pose.position).toBe(stop.position);
          expect(pose.target).toBe(committedTarget(rail, i));
          expect(pose.limits).toBe(stop.look);
          expect(advance(rail, state, 16)).toBe(state);
        }
      }
    }
  });

  it('lands local Jordan press 3 at the existing flight-top composition', () => {
    const rail = jordan.rail;
    let state = restingAt(0);
    for (let press = 0; press < 3; press++) {
      const result = stepStop(rail, state, 1, false);
      expect(result.boundary).toBeNull();
      state = advance(rail, result.state, STEP_GLIDE_MS);
      expect(state.glide).toBeNull();
    }
    expect(state.u).toBe(0.5);
    const pose = samplePose(rail, state);
    expect(pose.position).toEqual([68.6, 6.7, -83.3]);
    expect(pose.target).toBe(committedTarget(rail, 3));
    expect(pose.target).toEqual([82, 11.7, -83.6]);
    expect(pose.look).toEqual({ yaw: 0, pitch: 0 });
  });
});
