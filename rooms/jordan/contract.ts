// rooms/jordan/contract.ts
/**
 * Jordan Staircase room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1; design-walkthrough-ux.md §6 (the stair arrival: J0 at the foot of the
 * first flight, out of the vestibule box), §8 (feet on treads, authored subjects, R-UX5).
 * Budget rows mirror the generated manifest.
 *
 * Feet on treads: every stop's y = flight_datum(x, z) + 1.7, the build script's datum law
 * (tools/bpy/jordan.py): flight 1 on the west band (x 66..67.6) climbs north from the first
 * riser z -68.12, datum = (−68.12 − z) · 0.446429, capped at 5 from the top nose z −79.0;
 * the mezzanine lane (x 66..69.12, z −84.4..−79) is y 5; flight 2 on the north band
 * (z −84.4..−82.8) climbs east from x 69.12, datum = 5 + (x − 69.12) · 0.446429, capped at 10
 * from x 80.0; the landing slab (x 80..92, z −84.4..−64) is y 10. The path is a C1 spline, so
 * it needs a knot wherever the slope breaks — J1b (top of flight 1) and J3 (top of flight 2)
 * exist for that reason; J0 and J2 stand 0.5 m before their first risers.
 *
 * Subjects: J0 and J1 share the window light over the mezzanine (the locked climb); J1b keeps
 * the flight-2 sconce on the window wall (the turn is anticipated); J2 is RE-AUTHORED (R18-ux
 * D4) to FLIGHT2_TOP so press 3's gaze holds the end of the stairs, 2nd floor — the old
 * shared sconce made the held gaze pitch at the wall instead of up the flight; J2b locks the
 * SAME FLIGHT2_TOP (D-J2b, owner 2026-11-02: press 4 reads a locked climb dolly — the old
 * upper-window glance read INTO the north wall); J3 and J4 share the modelled east-wall
 * portal (the landing is a locked dolly toward it). No consecutive gaze swings more than
 * ~58°. Every value is declared and framed by capture at integration.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

/** Over the mezzanine, in front of the window wall: the upper-tier light reads above it. */
const MEZZ_LIGHT: Vec3 = [69.2, 7.5, -84];
/** Flight 2's middle sconce (x 75.1, datum 7.67 + 1.8), just off the north wall. */
const FLIGHT2_SCONCE: Vec3 = [75.1, 9.5, -85.5];
/** Flight 2's top (x 82.0, datum 9.983 + 1.7), on flight 2's band centre line. R18-ux D4 committed
 * it at J2; D-J2b (owner, 2026-11-02) locks J2b onto it as well — press 4 is a locked climb dolly
 * and the upper-window glance (UPPER_WINDOW [84.85, 14.75, −86], the north wall read) is retired. */
const FLIGHT2_TOP: Vec3 = [82.0, 11.7, -83.6];
/** The gilt portal on the east wall: centred z −74, head y 16; aimed below the head. */
const EAST_PORTAL: Vec3 = [92, 13, -74];

export const contract: RoomContract = {
  id: 'jordan',
  title: 'data.titleJordan',
  bounds: { min: [66, 0, -86], max: [92, 20, -62] },
  rail: {
    stops: [
      {
        // Hall floor, 0.5 m before the first riser; the vestibule is behind-right (south-east).
        id: 'J0',
        position: [67.2, 1.7, -67.6],
        subject: MEZZ_LIGHT,
        look: { yaw: 35, pitchUp: 45, pitchDown: 10 },
        caption: 'caption.j0',
      },
      {
        // Mid flight 1: run 5.38 → datum 2.40 → eye 4.10.
        id: 'J1',
        position: [67.2, 4.1, -73.5],
        subject: MEZZ_LIGHT,
        look: { yaw: 35, pitchUp: 40, pitchDown: 20 },
        caption: 'caption.j1',
      },
      {
        // The top nose of flight 1 (run 10.88 → datum 5): the slope-break knot.
        id: 'J1b',
        position: [67.2, 6.7, -79],
        subject: FLIGHT2_SCONCE,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j1b',
      },
      {
        // The real mezzanine turn, on the lane 0.5 m before flight 2's first riser (x 69.12).
        // R18-ux D4, retained by R19-ux C: local press 3 (J1b→J2) lands on FLIGHT2_TOP.
        // The base gaze is ≈20.5° up; user pitch/yaw limits are offsets around that gaze,
        // not absolute bounds on it. Retained manual offsets can change the final framing.
        id: 'J2',
        position: [68.6, 6.7, -83.3],
        subject: FLIGHT2_TOP,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j2',
      },
      {
        // Mid flight 2: run 5.38 → datum 7.40 → eye 9.10.
        // R19-ux C retains the authored window composition here (local press 4 from J0).
        id: 'J2b',
        position: [74.5, 9.1, -83.3],
        subject: FLIGHT2_TOP, // D-J2b (owner, 2026-11-02): locked with J2; the north-wall glance retired
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j2b',
      },
      {
        // Just onto the landing slab (x ≥ 80, datum 10): the second slope-break knot.
        id: 'J3',
        position: [80.4, 11.7, -83.3],
        subject: EAST_PORTAL,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j3',
      },
      {
        // The landing stop, facing the twin columns and the gilt portal 9.5 m east.
        id: 'J4',
        position: [82.5, 11.7, -78.5],
        subject: EAST_PORTAL,
        look: { yaw: 35, pitchUp: 30, pitchDown: 30 },
        caption: 'caption.j4',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'rastrelli-gallery', airlock: 'gallery-airlock' },
    // The landing airlock retargets to the 1812 room (DEC-025; contract DATA rides §7, the
    // room module stays untouched).
    { to: 'military-gallery', airlock: 'landing-airlock' },
  ],
  budget: {
    trianglesMax: 380_000,
    drawsMax: 60,
    textureBytesMax: 4_000_000,
    payloadBytesMax: 7_000_000,
  },
};
