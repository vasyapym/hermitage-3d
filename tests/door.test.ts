// tests/door.test.ts
// mg-1812-look DECISION-1 — the declared door heading + the runtime-hinged leaves' laws
// (src/world/door.ts; design-gallery §2.5's east seat; design-walkthrough-ux §4.1a bent).
// Pure module; node style.
import { describe, expect, it } from 'vitest';
import {
  DOOR_SWING_MAX_RAD,
  doorHeading,
  doorOpen,
  leafYaw,
  type DoorBeat,
} from '../src/world/door';

const TANGENT: [number, number, number] = [0.171, 0.0, 0.985]; // the 1812 rail's end tangent

describe('doorHeading (§4.1a bent: the declared heading leads)', () => {
  it('levels and renormalises the declared vector; the tangent is the null fallback', () => {
    expect(doorHeading({ declared: [3, 7, 0], tangent: TANGENT })).toEqual([1, 0, 0]);
    expect(doorHeading({ declared: null, tangent: TANGENT })).toEqual(TANGENT);
  });
  it('drops the declared pitch: a doorway heading is level by construction', () => {
    expect(doorHeading({ declared: [1, 5, 0], tangent: TANGENT })[1]).toBe(0);
  });
  it('throws loud on a degenerate declared vector (never a silent fallback)', () => {
    expect(() => doorHeading({ declared: [0, 0, 0], tangent: TANGENT })).toThrow(RangeError);
    expect(() => doorHeading({ declared: [0, 1, 0], tangent: TANGENT })).toThrow(RangeError);
  });
});

describe('doorOpen (the leaves answer the beat)', () => {
  const beat = (over: Partial<DoorBeat>): DoorBeat => ({
    airlockId: 'throne-airlock',
    phase: 'depart',
    transit: 'doorway',
    from: 'military-gallery',
    to: 'st-george',
    progress: 0,
    ...over,
  });
  const leaf = { airlock: 'throne-airlock', hinge: -1, room: 'military-gallery' };

  it('the FROM room: opens over the depart (smootherstep), holds through the card, closes at exit', () => {
    expect(doorOpen({ beat: beat({ progress: 0 }), leaf, room: 'military-gallery' })).toBe(0);
    expect(doorOpen({ beat: beat({ progress: 1 }), leaf, room: 'military-gallery' })).toBe(1);
    expect(doorOpen({ beat: beat({ phase: 'card' }), leaf, room: 'military-gallery' })).toBe(1);
    expect(doorOpen({ beat: beat({ phase: 'exit' }), leaf, room: 'military-gallery' })).toBe(0);
  });
  it('the TO room: holds through the card, closes over the arrive, exactly 0 at progress 1', () => {
    const toLeaf = { ...leaf, room: 'st-george' };
    const arrive = beat({ phase: 'arrive' });
    expect(doorOpen({ beat: beat({ phase: 'card' }), leaf: toLeaf, room: 'st-george' })).toBe(1);
    expect(doorOpen({ beat: arrive, leaf: toLeaf, room: 'st-george' })).toBe(1);
    expect(
      doorOpen({ beat: { ...arrive, progress: 1 }, leaf: toLeaf, room: 'st-george' }),
    ).toBe(0);
  });
  it('a cut never moves a leaf (reduced motion rides the transit kind); a foreign airlock stays shut', () => {
    expect(
      doorOpen({ beat: beat({ transit: 'cut' }), leaf, room: 'military-gallery' }),
    ).toBe(0);
    expect(
      doorOpen({ beat, leaf: { ...leaf, airlock: 'landing-airlock' }, room: 'military-gallery' }),
    ).toBe(0);
    expect(doorOpen({ beat: null, leaf, room: 'military-gallery' })).toBe(0);
  });
  it('a room outside the beat owns nothing', () => {
    expect(doorOpen({ beat, leaf, room: 'jordan' })).toBe(0);
  });
});

describe('leafYaw (the hinge sign carries the sweep; both leaves sweep −x)', () => {
  it('north −1: negative yaw swings the +z-spanning free edge toward −x', () => {
    // rotation about +Y by θ maps the free edge (0, L) to (L·sinθ, L·cosθ); θ < 0 → x < 0.
    const yaw = leafYaw({ open: 1, hinge: -1 });
    expect(yaw).toBeCloseTo(-DOOR_SWING_MAX_RAD, 12);
    const L = 0.91;
    expect(L * Math.sin(yaw)).toBeLessThan(0);
  });
  it('south +1: positive yaw swings the −z-spanning free edge toward −x', () => {
    const yaw = leafYaw({ open: 1, hinge: 1 });
    expect(yaw).toBeCloseTo(DOOR_SWING_MAX_RAD, 12);
    const L = 0.91;
    const edgeZ = -L;
    // x' = x·cosθ + z·sinθ = edgeZ·sinθ < 0 for edgeZ < 0, θ > 0
    expect(edgeZ * Math.sin(yaw)).toBeLessThan(0);
  });
  it('clamps and scales with the open amount; closed is exactly 0', () => {
    expect(leafYaw({ open: 0, hinge: 1 })).toBe(0);
    expect(leafYaw({ open: 0.5, hinge: -1 })).toBeCloseTo(-DOOR_SWING_MAX_RAD / 2, 12);
  });
});
