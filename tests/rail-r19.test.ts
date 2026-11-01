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

  it('uses the elapsed turn phase and the frozen source ray, not live source parallax', () => {
    const started = stepStop(TURN_RAIL, restingAt(0), 1, false).state;
    const pose = samplePose(TURN_RAIL, advance(TURN_RAIL, started, 476));
    const dx = pose.target[0] - pose.position[0];
    const dz = pose.target[2] - pose.position[2];
    expect(pose.position[2]).toBeCloseTo(-0.5792, 8);
    expect((Math.atan2(dx, -dz) * 180) / Math.PI).toBeCloseTo(22.5, 6);
    expect(pose.limits.yaw).toBeCloseTo(30, 7);
    expect(pose.limits.pitchUp).toBeCloseTo(32.5, 7);
    expect(pose.limits.pitchDown).toBeCloseTo(15, 7);
    const held = samplePose(TURN_RAIL, advance(TURN_RAIL, started, 952));
    expect(held.target).toBe(committedTarget(TURN_RAIL, 1));
    expect(held.limits).toEqual({ yaw: 25, pitchUp: 20, pitchDown: 20 });
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
