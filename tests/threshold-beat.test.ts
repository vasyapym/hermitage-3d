// tests/threshold-beat.test.ts
import { describe, expect, it } from 'vitest';
import { leanPose } from '../src/camera/door-lean';
import type { Bounds, Vec3 } from '../src/world/registry';
import type { BeatPose } from '../src/world/threshold-beat';
import {
  ARRIVE_TRAVEL_MAX_M,
  arrivePose,
  beatExposure,
  DEPART_STANDOFF_M,
  DEPART_TRAVEL_MAX_M,
  departPose,
  LEVEL_EPSILON,
  levelHeading,
  UNIT_EPSILON,
} from '../src/world/threshold-beat';

const portal: Bounds = { min: [-1, 0, -6], max: [1, 3, -4] }; // centre [0, 1.5, -5]
const stop: BeatPose = { position: [0, 1.6, 0], target: [0, 1.4, -2] };
const tangent: Vec3 = [0, 0, -1];
const entryPortal: Bounds = { min: [-1, 0, -1], max: [1, 3, 1] }; // centre [0, 1.5, 0]
const entry: BeatPose = { position: [0, 1.6, 6], target: [0, 1.5, 10] };
const steps = Array.from({ length: 11 }, (_, i) => i / 10);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const monotone = (xs: readonly number[], sign: 1 | -1) =>
  xs.every((x, i) => i === 0 || sign * (x - (xs[i - 1] ?? x)) >= 0);
const normalize = (t: Vec3): Vec3 => {
  const n = Math.hypot(t[0], t[1], t[2]);
  return [t[0] / n, t[1] / n, t[2] / n];
};

describe('departPose', () => {
  it('progress 0 returns the door stop bit-identically', () => {
    const p = departPose({ stop, tangent, portal, progress: 0 });
    expect(p.position).toBe(stop.position);
    expect(p.target).toBe(stop.target);
  });
  it('covers at most the travel cap along the tangent, monotonically, never overshooting', () => {
    const zs = steps.map((progress) => departPose({ stop, tangent, portal, progress }).position[2]);
    expect(monotone(zs, -1)).toBe(true);
    const last = zs[10] ?? 0;
    expect(last).toBeCloseTo(-DEPART_TRAVEL_MAX_M, 9);
    expect(departPose({ stop, tangent, portal, progress: 1.4 }).position[2]).toBeCloseTo(last, 9);
  });
  it('halts the standoff short of the plane when the stop is close', () => {
    const closePortal: Bounds = { min: [-1, 0, -4], max: [1, 3, -2] }; // centre [0, 1.5, -3]
    const p = departPose({ stop, tangent, portal: closePortal, progress: 1 });
    // toPlane = 3 → travel = 3 − 1.5 = 1.5 → the halt sits 1.5 m short of the plane at z −3.
    expect(p.position[2]).toBeCloseTo(-3 + DEPART_STANDOFF_M, 9);
  });
  it('the gaze glides to the portal centre', () => {
    const t = departPose({ stop, tangent, portal, progress: 1 }).target;
    expect(dist(t, [0, 1.5, -5])).toBeCloseTo(0, 9);
  });
  it('a stop facing away from its door holds the subject while the eye holds (§4.1b)', () => {
    // The stop's target [0, 1.4, -2] lies in [0, 0, 1]'s rear hemisphere (dot = -2): the gaze
    // must NOT glide to the portal centre — it holds the stop's subject at every progress
    // (the locked dolly), while the position law is unchanged (the tangent points away, no
    // travel either way).
    for (const progress of steps) {
      const p = departPose({ stop, tangent: [0, 0, 1], portal, progress });
      expect(p.position).toEqual(stop.position);
      expect(p.target).toBe(stop.target);
    }
  });
  it('fails loud on malformed input', () => {
    expect(() => departPose({ stop, tangent: [0, 0, -2], portal, progress: 0.5 })).toThrow();
    expect(() => departPose({ stop, tangent, portal, progress: Number.NaN })).toThrow();
    const bad: BeatPose = { position: [0, Number.POSITIVE_INFINITY, 0], target: stop.target };
    expect(() => departPose({ stop: bad, tangent, portal, progress: 0.5 })).toThrow();
  });
});

describe('levelHeading (§4.1a)', () => {
  it('a level tangent passes through by the SAME reference — the flat-rail fence', () => {
    const axial: Vec3 = [0, 0, 1];
    const diagonal: Vec3 = [0.6, 0, 0.8];
    expect(levelHeading(axial)).toBe(axial);
    expect(levelHeading(diagonal)).toBe(diagonal);
  });
  it('a float residual under LEVEL_EPSILON passes through by reference', () => {
    // |t_y| ≈ 5e-3 ≤ 1e-2: a spline-end residual, never a stair — nothing recomputed.
    const residual = normalize([0.6, 5e-3, 0.8]);
    expect(Math.abs(residual[1])).toBeLessThanOrEqual(LEVEL_EPSILON);
    expect(levelHeading(residual)).toBe(residual);
  });
  it('a stair slope flattens to the unit door heading, idempotently', () => {
    const stair = normalize([0, -2.4, 5.9]); // flight 1's slope: |t_y| ≈ 0.38
    const h = levelHeading(stair);
    expect(h[0]).toBeCloseTo(0, 12);
    expect(h[1]).toBe(0);
    expect(h[2]).toBeCloseTo(1, 12);
    expect(Math.abs(Math.hypot(h[0], h[1], h[2]) - 1)).toBeLessThan(UNIT_EPSILON);
    expect(levelHeading(h)).toBe(h); // idempotent: the projection is already level
  });
  it('a vertical end tangent has no door heading — it throws', () => {
    expect(() => levelHeading([0, 1, 0])).toThrow(RangeError);
  });
});

describe('departPose — the door heading (§4.1, the stair-foot fixture)', () => {
  // The jordan J0 geometry (rooms/jordan/contract.ts): the stair foot, the REAL committed
  // subject (MEZZ_LIGHT, contract line 29 — the upper-tier light over the mezzanine), the
  // end tangent down flight 1's slope and the doorway's portal box. |t_y| ≈ 0.38 exercises
  // A1; the subject sits ahead-and-up while the portal lies behind — dot ≈ −16.4 exercises
  // A2 (the locked dolly).
  const J0: BeatPose = { position: [67.2, 1.7, -67.6], target: [69.2, 7.5, -84] };
  const stairTangent: Vec3 = normalize([0, -2.4, 5.9]);
  const jordanPortal: Bounds = { min: [66.2, 0, -64.6], max: [68.2, 3.4, -62.6] };
  const footSteps = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
  it('A1: the eye keeps the door stop height; the glide travels the level heading', () => {
    const zs = footSteps.map((progress) => {
      const p = departPose({ stop: J0, tangent: stairTangent, portal: jordanPortal, progress });
      // Exact: mixScalar is a + (b − a)·k and end[1] === stop.position[1] — zero travel in y.
      expect(p.position[1]).toBe(1.7);
      expect(p.position[0]).toBe(67.2); // h[0] = 0: no drift off the stair lane
      return p.position[2];
    });
    expect(monotone(zs, 1)).toBe(true);
    const last = departPose({ stop: J0, tangent: stairTangent, portal: jordanPortal, progress: 1 });
    // toPlane = 4.0 → travel = min(DEPART_TRAVEL_MAX_M, 4.0 − 1.5) = 2.5: the eye halts
    // DEPART_STANDOFF_M inside the doorway plane z = −63.6.
    expect(last.position[0]).toBeCloseTo(67.2, 9);
    expect(last.position[1]).toBeCloseTo(1.7, 9);
    expect(last.position[2]).toBeCloseTo(-65.1, 9);
  });
  it('A2: a committed gaze facing away holds the subject — the locked dolly', () => {
    for (const progress of footSteps) {
      const p = departPose({ stop: J0, tangent: stairTangent, portal: jordanPortal, progress });
      expect(p.target).toEqual(J0.target);
    }
    const handOver = departPose({
      stop: J0,
      tangent: stairTangent,
      portal: jordanPortal,
      progress: 0,
    });
    expect(handOver.position).toBe(J0.position);
    expect(handOver.target).toBe(J0.target);
  });
  it('A1 and A2 are independent: a facing gaze still keeps the level eye', () => {
    // Same stair geometry, the subject swapped beyond the door (dot = +7.6): the gaze glides
    // to the portal centre while the eye-height law is unchanged.
    const facing: BeatPose = { position: J0.position, target: [67.2, 1.7, -60] };
    for (const progress of footSteps) {
      const p = departPose({ stop: facing, tangent: stairTangent, portal: jordanPortal, progress });
      expect(p.position[1]).toBe(1.7);
    }
    const last = departPose({
      stop: facing,
      tangent: stairTangent,
      portal: jordanPortal,
      progress: 1,
    });
    expect(last.target[0]).toBe(67.2);
    expect(last.target[1]).toBe(1.7);
    // The portal centre's z is −63.6 to floating point (the bounds' average lands 1 ulp under).
    expect(last.target[2]).toBeCloseTo(-63.6, 12);
    expect(last.position[2]).toBeCloseTo(-65.1, 9);
  });
  it('the lean rides the same heading: the start moves, the end does not', () => {
    const h = levelHeading(stairTangent);
    const leaned = leanPose(J0, h, 0.35);
    expect(leaned.position[1]).toBe(1.7); // a body leans into a door; it does not stoop
    for (const progress of footSteps) {
      const p = departPose({ stop: leaned, tangent: stairTangent, portal: jordanPortal, progress });
      expect(p.position[1]).toBe(1.7);
    }
    // The leaned start sits 0.35 m along the heading (z −67.25); toPlane 3.65 → travel 2.15 —
    // the same end point (the standoff binds; the lean moves the start, not the end).
    const last = departPose({
      stop: leaned,
      tangent: stairTangent,
      portal: jordanPortal,
      progress: 1,
    });
    expect(last.position[0]).toBeCloseTo(67.2, 9);
    expect(last.position[1]).toBeCloseTo(1.7, 9);
    expect(last.position[2]).toBeCloseTo(-65.1, 9);
  });
  it("the backward depart's card pose is the forward arrive's first frame", () => {
    const depart = departPose({
      stop: J0,
      tangent: stairTangent,
      portal: jordanPortal,
      progress: 1,
    });
    const arrive = arrivePose({ portal: jordanPortal, stop: J0, progress: 0 });
    expect(depart.position[0]).toBeCloseTo(arrive.position[0], 9);
    expect(depart.position[1]).toBeCloseTo(arrive.position[1], 9);
    expect(depart.position[2]).toBeCloseTo(arrive.position[2], 9);
    expect(depart.target).toEqual(J0.target);
    expect(arrive.target).toEqual(J0.target);
  });
  it('arrive fence: arrivals are untouched — the level glide into J0 (§4.1b)', () => {
    for (const progress of footSteps) {
      const p = arrivePose({ portal: jordanPortal, stop: J0, progress });
      expect(p.position[1]).toBe(1.7);
      expect(p.target).toBe(J0.target); // gaze held
    }
    const start = arrivePose({ portal: jordanPortal, stop: J0, progress: 0 }).position;
    expect(start[0]).toBeCloseTo(67.2, 9);
    expect(start[1]).toBeCloseTo(1.7, 9);
    expect(start[2]).toBeCloseTo(-65.1, 9); // ARRIVE_TRAVEL_MAX_M back toward the portal
    const done = arrivePose({ portal: jordanPortal, stop: J0, progress: 1 });
    expect(done.position).toBe(J0.position);
  });
});

describe('departPose — the level fence (flat rails, §4.1a)', () => {
  // One level fixture's full PRE-amendment output as literals: a heading already level passes
  // through levelHeading by the SAME reference, so every one of these frames is bit-identical
  // to the pre-amendment law (captured before the amendment; the flat-rail golden fence).
  const frames: ReadonlyArray<readonly [number, Vec3, Vec3]> = [
    [0, [0, 1.6, 0], [0, 1.4, -2]],
    [0.25, [0, 1.6, -0.2587890625], [0, 1.4103515624999998, -2.310546875]],
    [0.5, [0, 1.6, -1.25], [0, 1.45, -3.5]],
    [0.75, [0, 1.6, -2.2412109375], [0, 1.4896484375, -4.689453125]],
    [1, [0, 1.6, -2.5], [0, 1.5, -5]],
  ];
  it('the full output is bit-identical to the pre-amendment law', () => {
    for (const [progress, position, target] of frames) {
      const p = departPose({ stop, tangent, portal, progress });
      expect(p.position).toEqual(position);
      expect(p.target).toEqual(target);
    }
  });
});

describe('arrivePose', () => {
  it('progress ≥ 1 returns the entry stop bit-identically', () => {
    for (const progress of [1, 1.3]) {
      const p = arrivePose({ portal: entryPortal, stop: entry, progress });
      expect(p.position).toBe(entry.position);
      expect(p.target).toBe(entry.target);
    }
  });
  it('starts a few metres back toward the portal and glides in, gaze held', () => {
    const poses = steps.map((progress) =>
      arrivePose({ portal: entryPortal, stop: entry, progress }),
    );
    const start = poses[0]?.position ?? entry.position;
    // d ≈ 6 m > the cap → the start sits ARRIVE_TRAVEL_MAX_M back from the stop, portal side.
    expect(dist(start, entry.position)).toBeCloseTo(ARRIVE_TRAVEL_MAX_M, 9);
    expect(start[2]).toBeGreaterThan(0);
    expect(
      monotone(
        poses.map((p) => p.position[2]),
        1,
      ),
    ).toBe(true);
    for (const p of poses) expect(p.target).toBe(entry.target);
  });
  it('a stop near the portal starts at the portal centre — the glide crosses the doorway', () => {
    const near: BeatPose = { position: [0, 1.5, 1], target: entry.target };
    const poses = steps.map((progress) =>
      arrivePose({ portal: entryPortal, stop: near, progress }),
    );
    const start = poses[0]?.position ?? near.position;
    expect(dist(start, [0, 1.5, 0])).toBeCloseTo(0, 9);
    expect(
      monotone(
        poses.map((p) => p.position[2]),
        1,
      ),
    ).toBe(true);
  });
  it('a stop already at the portal centre holds', () => {
    const at: BeatPose = { position: [0, 1.5, 0], target: entry.target };
    for (const progress of steps) {
      expect(arrivePose({ portal: entryPortal, stop: at, progress }).position).toEqual(at.position);
    }
  });
  it('fails loud on malformed input', () => {
    expect(() => arrivePose({ portal: entryPortal, stop: entry, progress: Number.NaN })).toThrow();
  });
});

describe('beatExposure', () => {
  const base = { fromExposure: 0.37, toExposure: 1 } as const;
  it('card is exactly 0 at any progress', () => {
    for (const progress of [0, 0.5, 1, 7]) {
      expect(beatExposure({ ...base, phase: 'card', progress })).toBe(0);
    }
  });
  it('depart drains monotonically from fromExposure to exactly 0', () => {
    const xs = steps.map((progress) => beatExposure({ ...base, phase: 'depart', progress }));
    expect(xs[0]).toBe(base.fromExposure);
    expect(xs[10]).toBe(0);
    expect(monotone(xs, -1)).toBe(true);
  });
  it('arrive ramps monotonically from exactly 0 to toExposure', () => {
    const xs = steps.map((progress) => beatExposure({ ...base, phase: 'arrive', progress }));
    expect(xs[0]).toBe(0);
    expect(xs[10]).toBe(base.toExposure);
    expect(monotone(xs, 1)).toBe(true);
    expect(beatExposure({ ...base, phase: 'arrive', progress: 2 })).toBe(base.toExposure);
  });
  it('fails loud on malformed input', () => {
    expect(() => beatExposure({ ...base, phase: 'depart', progress: Number.NaN })).toThrow();
    expect(() =>
      beatExposure({ phase: 'arrive', progress: 0.5, fromExposure: -1, toExposure: 1 }),
    ).toThrow();
    expect(() =>
      beatExposure({ phase: 'arrive', progress: 0.5, fromExposure: 1, toExposure: Number.NaN }),
    ).toThrow();
  });
});
