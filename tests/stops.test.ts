// tests/stops.test.ts
/**
 * R-UX5 §7/§8 fences over the COMMITTED rails (design §9 «Movement»): every stair stop's eye
 * 1.7 ± 0.3 over the tread or slab under it at every sampled frame; the corridor never passes
 * through geometry; no default-gaze swing > ~90° within one glide; G1's lock east bit-exact.
 * Source of truth for every stair constant: tools/bpy/jordan.py (flight_datum); for the
 * corridor's walkable boxes: tools/bpy/rastrelli-gallery.py. The numbers are restated, not
 * derived.
 *
 * R18-ux pinned swing metric (D4/D5): the stop-gaze swing rows measure the 3D angle between
 * the stops' committed gaze DIRECTIONS (the same angleDeg the head law and the §9 movement
 * gate use — the fence gaze never depends on a glide). Yaw-only variants are recorded in the
 * row comments where they differ; the restated §8 figures quote the yaw-quotient rounding
 * (1812's M0→M1 «0°» = 0.48° 3D here).
 */
import { describe, expect, it } from 'vitest';
import { contract as contract1812 } from '../rooms/1812/contract';
import { contract as jordanContract } from '../rooms/jordan/contract';
import { contract as galleryContract } from '../rooms/rastrelli-gallery/contract';
import { restingAt, samplePose, samplePosition, stopParameter } from '../src/camera/rail';
import {
  SQUARE_RAIL,
  SQUARE_S0_GAZE,
  SQUARE_S1_GAZE,
  SQUARE_SH_GAZE,
} from '../src/camera/square-rail';
import type { Rail, Vec3 } from '../src/world/registry';

const GALLERY: Rail = galleryContract.rail;
const JORDAN: Rail = jordanContract.rail;
const GALLERY_1812 = contract1812;

const EYE = 1.7;
const EYE_TOLERANCE = 0.3; // §9: 1.7 ± 0.3 over the surface under the eye
const MAX_SWING_DEG = 90; // §9: no default-gaze swing > ~90° in one glide
const WALL_CLEARANCE = 0.5; // the eye never nearer a modelled wall than this
const SAMPLES_PER_SEGMENT = 256;

// jordan.py: RISERS 35, TREADS 34, RISE 5/35, GOING 0.32, RUN 34 × 0.32 = 10.88 m plan run.
const RISERS = 35;
const TREADS = 34;
const RISE = 5 / RISERS;
const GOING = 0.32;
const RUN = TREADS * GOING;

interface Flight {
  readonly along: 0 | 2; // the climb axis: x (0) or z (2)
  readonly across: 0 | 2; // the band axis
  readonly band: readonly [number, number]; // the tread band across the climb
  readonly a0: number; // the first riser along the climb
  readonly d: 1 | -1; // climb direction along the axis
  readonly y: readonly [number, number]; // floor datum at the foot, slab datum at the top
}

// Flight 1 hugs the WEST wall, climbs NORTH; flight 2 runs along the NORTH wall, climbs EAST.
const FLIGHT_1: Flight = { along: 2, across: 0, band: [66, 67.6], a0: -68.12, d: -1, y: [0, 5] };
const FLIGHT_2: Flight = { along: 0, across: 2, band: [-84.4, -82.8], a0: 69.12, d: 1, y: [5, 10] };

// The port of flight_datum(f, c): the tread's nose line; capped at y[1] once the run is covered
// (the 0.143 m step at the cap is the 35th riser onto the slab, not an error).
const flightDatum = (f: Flight, c: number): number => {
  const run = Math.max(0, (c - f.a0) * f.d);
  return run >= RUN ? f.y[1] : f.y[0] + run * (RISE / GOING);
};

type Rect = readonly [number, number, number, number]; // x0, x1, z0, z1 (plan)
const within = (x: number, z: number, r: Rect): boolean =>
  x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];

const LANDING: Rect = [80, 92, -84.4, -64]; // first-floor slab, y 10
const MEZZANINE: Rect = [66, 69.12, -84.4, -79]; // the lane, slab top y 5
const HALL_FLOOR: Rect = [66, 92, -86, -62]; // y 0
const VESTIBULE: Rect = [78, 84, -68, -62]; // a 3.0 m box: closed over the eye
const HALL_WALLS: Rect = [66, 92, -86, -62];

const onFlight = (f: Flight, x: number, z: number): number | null => {
  const along = f.along === 0 ? x : z;
  const across = f.across === 0 ? x : z;
  if (across < f.band[0] || across > f.band[1]) return null;
  const run = (along - f.a0) * f.d;
  if (run < 0 || run > RUN) return null;
  return flightDatum(f, along);
};

// The built surface under a plan point, or null over nothing (the open well, the vestibule's
// interior — the vestibule is checked first: the first-floor slab passes OVER its box, but an
// eye inside the 3.0 m box is closed over by the soffit, not served by the slab).
const surfaceDatum = (x: number, z: number): number | null => {
  if (within(x, z, VESTIBULE)) return null;
  if (within(x, z, LANDING)) return 10;
  if (within(x, z, MEZZANINE)) return 5;
  const f2 = onFlight(FLIGHT_2, x, z);
  if (f2 !== null) return f2;
  const f1 = onFlight(FLIGHT_1, x, z);
  if (f1 !== null) return f1;
  if (within(x, z, HALL_FLOOR)) return 0;
  return null;
};

// rastrelli-gallery.py, with WALL_CLEARANCE pre-applied to every modelled wall: the passage
// (its south end, the facade plane, is open), the straight-soffit reveal, the gallery proper
// (the east portal opening x 43..44 is open; the end wall around it is modelled).
const PASSAGE_CLEAR: Rect = [-4 + WALL_CLEARANCE, 4 - WALL_CLEARANCE, 63.5 + WALL_CLEARANCE, 87.5];
const MOUTH_CLEAR: Rect = [4 - WALL_CLEARANCE, 4.8, 70 + WALL_CLEARANCE, 76 - WALL_CLEARANCE];
const GALLERY_CLEAR: Rect = [4.8, 44 - WALL_CLEARANCE, 70 + WALL_CLEARANCE, 76 - WALL_CLEARANCE];
const corridorWalkable = (x: number, z: number): boolean =>
  within(x, z, PASSAGE_CLEAR) || within(x, z, MOUTH_CLEAR) || within(x, z, GALLERY_CLEAR);

const xyz = (v: Vec3): [number, number, number] => [
  v[0] ?? Number.NaN,
  v[1] ?? Number.NaN,
  v[2] ?? Number.NaN,
];

const gazeDirection = (rail: Rail, u: number): [number, number, number] => {
  const pose = samplePose(rail, restingAt(u));
  const [px, py, pz] = xyz(pose.position);
  const [tx, ty, tz] = xyz(pose.target);
  const len = Math.hypot(tx - px, ty - py, tz - pz);
  return [(tx - px) / len, (ty - py) / len, (tz - pz) / len];
};

const angleDeg = (a: [number, number, number], b: [number, number, number]): number => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
};

// Every (u, segment) over the rail, SAMPLES_PER_SEGMENT + 1 per segment, stops included.
const eachSample = (rail: Rail, visit: (u: number, segment: number) => void): void => {
  for (let i = 0; i + 1 < rail.stops.length; i++) {
    const u0 = stopParameter(rail, i);
    const u1 = stopParameter(rail, i + 1);
    for (let k = 0; k <= SAMPLES_PER_SEGMENT; k++) {
      visit(u0 + (u1 - u0) * (k / SAMPLES_PER_SEGMENT), i);
    }
  }
};

describe('the datum port (tools/bpy/jordan.py)', () => {
  it('restates the build constants', () => {
    expect(RISE).toBeCloseTo(0.142857, 6);
    expect(RUN).toBeCloseTo(10.88, 9);
    expect(RISE / GOING).toBeCloseTo(0.44643, 5);
  });
  it('reads the nose line along both flights and caps on the slab', () => {
    expect(flightDatum(FLIGHT_1, -68.12)).toBe(0);
    expect(flightDatum(FLIGHT_1, -73.5)).toBeCloseTo(2.4018, 3);
    // At the top nose the float distance lands a hair UNDER the run (verified against the
    // build script's own float behaviour), so the datum there is the last tread's line —
    // the 0.143 m step's source; the cap fires a hair past the nose.
    expect(flightDatum(FLIGHT_1, -79)).toBeCloseTo(TREADS * RISE, 9);
    expect(flightDatum(FLIGHT_1, -79.0000001)).toBe(5);
    expect(flightDatum(FLIGHT_2, 73)).toBeCloseTo(6.732, 3);
    expect(flightDatum(FLIGHT_2, 80)).toBeCloseTo(5 + TREADS * RISE, 9);
    expect(flightDatum(FLIGHT_2, 80.0000001)).toBe(10);
    expect(flightDatum(FLIGHT_2, 90)).toBe(10);
  });
  it('steps one riser onto the slab at the cap (the 0.143 m step)', () => {
    expect(5 - flightDatum(FLIGHT_1, -79 + 1e-6)).toBeCloseTo(RISE, 3);
    expect(10 - flightDatum(FLIGHT_2, 80 - 1e-6)).toBeCloseTo(RISE, 3);
  });
  it('knows the surfaces: landing, lane, treads, floor; nothing over the well or vestibule', () => {
    expect(surfaceDatum(86, -74)).toBe(10);
    expect(surfaceDatum(68, -81)).toBe(5);
    expect(surfaceDatum(67.2, -73.5)).toBeCloseTo(2.4018, 3);
    expect(surfaceDatum(74.5, -83.3)).toBeCloseTo(7.4018, 3);
    expect(surfaceDatum(67.2, -67.6)).toBe(0);
    expect(surfaceDatum(81, -65)).toBeNull(); // inside the vestibule box
    expect(surfaceDatum(60, -70)).toBeNull(); // outside the hall
  });
});

describe('jordan stops (R-UX5 §8: feet on treads)', () => {
  it('walks J0 → J4 through the real mezzanine turn', () => {
    expect(JORDAN.stops.map((s) => s.id)).toEqual(['J0', 'J1', 'J1b', 'J2', 'J2b', 'J3', 'J4']);
  });
  it('stands every stop 1.7 over the surface datum at its (x, z)', () => {
    for (const s of JORDAN.stops) {
      const [x, y, z] = xyz(s.position);
      const datum = surfaceDatum(x, z);
      expect(datum, s.id).not.toBeNull();
      expect(y - (datum ?? Number.NaN), s.id).toBeCloseTo(EYE, 2);
    }
  });
  it('carries a subject at every stop (the gaze never chases the camera’s own path)', () => {
    for (const s of JORDAN.stops) expect(s.subject, s.id).not.toBeNull();
  });
  it('keeps the eye 1.7 ± 0.3 over a built surface at every sampled frame, clear of the walls', () => {
    eachSample(JORDAN, (u, segment) => {
      const [x, y, z] = xyz(samplePosition(JORDAN, u));
      const where = `segment ${segment} u ${u.toFixed(4)} at (${x.toFixed(2)}, ${z.toFixed(2)})`;
      const datum = surfaceDatum(x, z);
      expect(datum, where).not.toBeNull();
      expect(Math.abs(y - (datum ?? Number.NaN) - EYE), where).toBeLessThanOrEqual(EYE_TOLERANCE);
      expect(x, where).toBeGreaterThanOrEqual(HALL_WALLS[0] + WALL_CLEARANCE);
      expect(x, where).toBeLessThanOrEqual(HALL_WALLS[1] - WALL_CLEARANCE);
      expect(z, where).toBeGreaterThanOrEqual(HALL_WALLS[2] + WALL_CLEARANCE);
      expect(z, where).toBeLessThanOrEqual(HALL_WALLS[3] - WALL_CLEARANCE);
    });
  });
});

describe('gallery stops (R-UX5 §7: the junction)', () => {
  it('walks G0 → Gj → G1 → G2', () => {
    expect(GALLERY.stops.map((s) => s.id)).toEqual(['G0', 'Gj', 'G1', 'G2']);
  });
  it('never passes through geometry: every sampled frame inside the passage or the gallery', () => {
    eachSample(GALLERY, (u, segment) => {
      const [x, , z] = xyz(samplePosition(GALLERY, u));
      const where = `segment ${segment} u ${u.toFixed(4)} at (${x.toFixed(2)}, ${z.toFixed(2)})`;
      expect(corridorWalkable(x, z), where).toBe(true);
    });
  });
  it('locks G1 due east bit-exactly (the three G1 goldens hold)', () => {
    const i = GALLERY.stops.findIndex((s) => s.id === 'G1');
    expect(gazeDirection(GALLERY, stopParameter(GALLERY, i))).toEqual([1, 0, 0]);
  });
  it('carries the R18-ux D3 corner flag and the passage mouth as Gj’s approach', () => {
    const gj = GALLERY.stops.find((s) => s.id === 'Gj');
    if (!gj) throw new Error('Gj missing');
    expect(gj.corner).toBe(true);
    expect(gj.approach).toEqual([4.4, 1.7, 73]);
  });
  it('keeps the approach on the committed gaze ray: aim(approach) equals aim(subject) ≤ 1e-6', () => {
    // C3 pin (B.5): from Gj the mouth [4.4,1.7,73] and EAST_DOOR [43.5,1.7,73] lie on one ray,
    // so the Forward approach's frame agrees with the committed fence at the stop.
    const i = GALLERY.stops.findIndex((s) => s.id === 'Gj');
    const gj = GALLERY.stops[i];
    if (!gj || gj.approach === undefined || gj.subject === null) throw new Error('Gj data');
    const a = gazeDirection(GALLERY, stopParameter(GALLERY, i));
    // The fence direction from Gj toward EAST_DOOR vs the approach ray.
    expect(angleDeg(a, directionTo(gj, gj.approach))).toBeLessThanOrEqual(1e-6);
  });
});

function directionTo(stop: { readonly position: Vec3 }, to: Vec3): [number, number, number] {
  const [px, py, pz] = xyz(stop.position);
  const [tx, ty, tz] = xyz(to);
  const len = Math.hypot(tx - px, ty - py, tz - pz);
  return [(tx - px) / len, (ty - py) / len, (tz - pz) / len];
}

describe('the gaze law over the committed rails (R-UX5 §8, design §9)', () => {
  for (const [name, rail] of [
    ['square', SQUARE_RAIL],
    ['gallery', GALLERY],
    ['jordan', JORDAN],
  ] as const) {
    it(`${name}: no default-gaze swing > ${MAX_SWING_DEG}° within one glide`, () => {
      let origin = gazeDirection(rail, 0);
      let current = -1;
      eachSample(rail, (u, segment) => {
        if (segment !== current) {
          current = segment;
          origin = gazeDirection(rail, stopParameter(rail, segment));
        }
        const swing = angleDeg(origin, gazeDirection(rail, u));
        expect(swing, `${name} segment ${segment} u ${u.toFixed(4)}`).toBeLessThanOrEqual(
          MAX_SWING_DEG,
        );
      });
    });
  }
});

// R18-ux D4/D5 stop-gaze swing rows (the §8 stop tables), on the pinned 3D metric above.
// The fixtures quote yaw-quotient roundings («0°», «≈52°»); the 3D restatements are the rows.
const stopGaze = (rail: Rail, id: string): [number, number, number] => {
  const i = rail.stops.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`rail has no stop ${id}`);
  return gazeDirection(rail, stopParameter(rail, i));
};
const swingRows = (
  rail: Rail,
  id0: string,
  id1: string,
  expected: number,
): Array<[string, number, number]> => [
  [`${id0}→${id1}`, angleDeg(stopGaze(rail, id0), stopGaze(rail, id1)), expected],
];

describe('square stop-gaze swings (R18-ux D1: the halfway rhythm)', () => {
  it('carries the three collinear stops; Sh holds the gate pavilion on the arch plane', () => {
    expect(SQUARE_RAIL.stops.map((s) => s.id)).toEqual(['S0', 'Sh', 'S1']);
    const sh = SQUARE_RAIL.stops[1];
    if (!sh) throw new Error('Sh missing');
    // DEC-037: the rail runs west of the Column axis; Sh moved off the axis with it.
    expect(sh.position).toEqual([-12, 1.7, 177]);
    expect(sh.subject).toEqual(SQUARE_SH_GAZE);
    expect(SQUARE_SH_GAZE).toEqual([0, 8.5, 87]);
    expect(sh.look).toEqual({ yaw: 30, pitchUp: 25, pitchDown: 20 });
    // The restated fences: S1 untouched; S0 moved 24 m west with the rail.
    expect(SQUARE_RAIL.stops[0]?.position).toEqual([-24, 1.7, 230]);
    expect(SQUARE_RAIL.stops[0]?.subject).toEqual(SQUARE_S0_GAZE);
    expect(SQUARE_RAIL.stops[2]?.position).toEqual([0, 1.7, 124]);
    expect(SQUARE_RAIL.stops[2]?.subject).toEqual(SQUARE_S1_GAZE);
  });
  for (const [n, measured, expected] of [
    ...swingRows(SQUARE_RAIL, 'S0', 'Sh', 2.6), // DEC-037: the west rail (was 2.0 on the axis)
    ...swingRows(SQUARE_RAIL, 'Sh', 'S1', 8.7), // DEC-037: the west rail (was 4.4 on the axis)
  ]) {
    it(`${n}: swing ≈ ${expected}° (3D ${measured.toFixed(2)}°) stays under the head law`, () => {
      expect(measured, n).toBeCloseTo(expected, 1);
    });
  }
});

describe('jordan stop-gaze swings (R18-ux D4: FLIGHT2_TOP)', () => {
  it('authors J2 to flight 2’s top (press 3 ends at the end of the stairs, 2nd floor)', () => {
    const j2 = JORDAN.stops.find((s) => s.id === 'J2');
    if (!j2 || j2.subject === null) throw new Error('J2 missing');
    expect(j2.subject).toEqual([82.0, 11.7, -83.6]);
    // P1 B.23: the new base gaze is ≈20.5° up; J2's pitchUp 35 ≥ 20 holds.
    const pose = samplePose(JORDAN, restingAt(stopParameter(JORDAN, JORDAN.stops.indexOf(j2))));
    const [px, py, pz] = xyz(pose.position);
    const [tx, ty, tz] = xyz(pose.target);
    expect((Math.atan2(ty - py, Math.hypot(tx - px, tz - pz)) * 180) / Math.PI).toBeCloseTo(
      20.46,
      1,
    );
  });
  for (const [n, measured, expected] of [
    ...swingRows(JORDAN, 'J1b', 'J2', 36.6), // the §8 quote «≈36.8°»; the 3D measure 36.60°
    ...swingRows(JORDAN, 'J2', 'J2b', 1.65), // D-J2b: locked on J2's framing (the §8-era 14.22° read at the north wall; retired)
  ]) {
    it(`${n}: swing ≈ ${expected}° stays under the ~58° head law`, () => {
      expect(measured, n).toBeCloseTo(expected, 1);
    });
  }
});

describe('1812 stop-gaze swings (R18-ux D5: the axial dolly)', () => {
  it('walks M0 → M4 with the five-stop count unchanged', () => {
    expect(GALLERY_1812.rail.stops.map((s) => s.id)).toEqual(['M0', 'M1', 'M2', 'M3', 'M4']);
  });
  for (const [n, measured, expected] of [
    ...swingRows(GALLERY_1812.rail, 'M0', 'M1', 0.5), // the §8 quote «0°» — the 3D 0.48°
    ...swingRows(GALLERY_1812.rail, 'M1', 'M2', 0.9),
    ...swingRows(GALLERY_1812.rail, 'M2', 'M3', 3.1),
    ...swingRows(GALLERY_1812.rail, 'M3', 'M4', 51.3), // the §8 quote «≈52°»
  ]) {
    it(`${n}: swing ≈ ${expected}° within one glide`, () => {
      expect(measured, n).toBeCloseTo(expected, 1);
    });
  }
  it('the axial run rides x = 86.25 (±1e-9) on segments 0–2 (the corner run decouples M4)', () => {
    for (const segment of [0, 1, 2]) {
      const u0 = stopParameter(GALLERY_1812.rail, segment);
      const u1 = stopParameter(GALLERY_1812.rail, segment + 1);
      for (let k = 0; k <= 256; k++) {
        const u = u0 + (u1 - u0) * (k / 256);
        expect(samplePosition(GALLERY_1812.rail, u)[0], `segment ${segment}`).toBeCloseTo(86.25, 9);
      }
    }
  });
});
