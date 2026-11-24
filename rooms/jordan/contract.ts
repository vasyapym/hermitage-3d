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
 * Subjects: the climb's gazes pre-turn toward the chandelier's crown (the owner's
 * 2026-11-24 redistribution ask — the first two Forward clicks turn a bit more right and
 * upwards, ~13% of the angular way each, so press 3's arrival keeps less rotation to spend):
 * J0 keeps the mezzanine window light (the locked climb ends here); J1 gazes 13% of the
 * way from that light toward the crown (FLIGHT1_TURN); J1b 36% of the way from the flight-2
 * sconce (FLIGHT2_TURN — the turn-preview law grown by the 13 points; the sconce stays in
 * frame left). The click swings read 10.2 / 47.4 / 45.7° (stops.test.ts pins them). J2 is
 * RE-AUTHORED (owner
 * 2026-11-23, the plafond-arrival ask) to CHANDELIER_CROWN so press 3's gaze lands on the
 * chandelier with the painted Olimpo ceiling partly above it — the base gaze is ≈24° up, the
 * owner's own reference framing (a plafond-centred ≈41° read as too much rotation); J2b
 * keeps FLIGHT2_TOP alone (the D-J2b locked pairing with J2 is retired by the same ask —
 * press 4 turns the gaze from the ceiling down to the flight ahead); J3 and J4 share the
 * modelled east-wall portal (the landing is a locked dolly toward it). The ~58° consecutive-
 * swing design frame: the J1b→J2 leg reads 45.7° after the redistribution (the turn-preview
 * 52.8°, the pre-relaxation 63.7°), under the §9 MAX_SWING 90 head law. Every value is
 * declared and framed by capture at integration.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

/** Over the mezzanine, in front of the window wall: the upper-tier light reads above it. */
const MEZZ_LIGHT: Vec3 = [69.2, 7.5, -84];
/** Flight 1's turn anchor — the J1 gaze: 13% of the angular way from the mezzanine window
 * light toward the chandelier's crown, on the light's ray (11.2 m out). The owner's
 * 2026-11-24 redistribution ask: the first Forward click already turns right+up (the climb
 * reads as the turn's beginning), so press 3's arrival keeps less rotation to spend.
 * The mezzanine light [69.2, 7.5, −84] stays J0's subject. */
const FLIGHT1_TURN: Vec3 = [70.4, 8.1, -83.5];
/** Flight 2's turn anchor — the J1b gaze: 36% of the angular way from the flight-2 middle
 * sconce ([75.1, 9.5, −85.5], the fixtures bake rig's light anchor — jordan_fixtures.py
 * SCONCE_GAZE_POINT) toward the chandelier's crown, on the sconce's ray (10.6 m out). The
 * owner's asks: the 2026-11-23 turn-preview (23% — press 3's arrival reads as a
 * continuation, not a jump) grown by 13 points by the 2026-11-24 redistribution (~13% for
 * both of the first two Forward clicks); the sconce stays in frame left (az ≈18° off gaze
 * centre, the turn-preview's ≈11° widened). */
const FLIGHT2_TURN: Vec3 = [76.4, 10.4, -82.6];
/** Flight 2's top (x 82.0, datum 9.983 + 1.7), on flight 2's band centre line. R18-ux D4 committed
 * it at J2; J2b still holds it (D-J2b, owner 2026-11-02) — the J2 pairing retired 2026-11-23 by
 * the plafond-arrival ask; the upper-window glance (UPPER_WINDOW [84.85, 14.75, −86], the north
 * wall read) stays retired. */
const FLIGHT2_TOP: Vec3 = [82.0, 11.7, -83.6];
/** The chandelier's crown (x 86.0, ring y 15.0 + 0.5, z −74.0 — tools/bpy/jordan.py
 * CHAND_C/CHAND_RING_Y): J2's arrival gaze — the owner's reference framing (the chandelier
 * centre-frame, the painted plafond partly above, the flights in context). A plafond-centred
 * gaze (the field's centre x 80.6, y 20, z −74) was tried the same day and re-pinned: its
 * ≈41° base read as too much rotation against the owner's IMG_0019 framing. */
const CHANDELIER_CROWN: Vec3 = [86, 15.5, -74];
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
        // Mid flight 1: run 5.38 → datum 2.40 → eye 4.10. The gaze pre-turns 13% of the
        // angular way from the mezzanine light toward the chandelier's crown (the owner's
        // 2026-11-24 redistribution ask — the first Forward click turns right+up already;
        // the locked climb ends here, J0 keeps the mezzanine light).
        id: 'J1',
        position: [67.2, 4.1, -73.5],
        subject: FLIGHT1_TURN,
        look: { yaw: 35, pitchUp: 40, pitchDown: 20 },
        caption: 'caption.j1',
      },
      {
        // The top nose of flight 1 (run 10.88 → datum 5): the slope-break knot.
        // The gaze pre-turns 36% of the angular way from the flight-2 sconce toward the
        // chandelier's crown (the owner's 2026-11-23 turn-preview ask grown by the
        // 2026-11-24 redistribution): press 3's arrival reads as a continuation, not a
        // jump; the sconce stays in frame left (caption j1b unchanged).
        id: 'J1b',
        position: [67.2, 6.7, -79],
        subject: FLIGHT2_TURN,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j1b',
      },
      {
        // The real mezzanine turn, on the lane 0.5 m before flight 2's first riser (x 69.12).
        // Re-authored (owner 2026-11-23, the plafond-arrival ask + the IMG_0019 reference):
        // local press 3 (J1b→J2) lands gazing at the chandelier's crown with the painted
        // Olimpo plafond partly above it — the owner's own framing (the reference keeps the
        // ceiling PARTLY in frame; a plafond-centred ≈41° base gaze read as too much rotation
        // and was re-pinned to ≈24°; the ceiling centres one manual drag away, pitchUp 35).
        // User pitch/yaw limits are offsets around that gaze, not absolute bounds on it.
        // Retained manual offsets can change the final framing.
        id: 'J2',
        position: [68.6, 6.7, -83.3],
        subject: CHANDELIER_CROWN,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.j2',
      },
      {
        // Mid flight 2: run 5.38 → datum 7.40 → eye 9.10.
        // R19-ux C retains the authored window composition here (local press 4 from J0).
        id: 'J2b',
        position: [74.5, 9.1, -83.3],
        subject: FLIGHT2_TOP, // D-J2b (owner, 2026-11-02) locked it with J2; retired 2026-11-23 — J2 now gazes at the plafond
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
