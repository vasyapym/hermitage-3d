// rooms/rastrelli-gallery/contract.ts
/**
 * Rastrelli Gallery room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1; design-walkthrough-ux.md §7 (the corridor path fix: FOUR stops — the
 * junction knot Gj where the arch passage meets the gallery axis; the G0→G1 wall-pass is gone;
 * five since the 2026-11-12/13 stops round and the owner's 2026-11-14 walk steer, which
 * retired the round's two axis inserts Gjb/G1b and added one entry-leg insert G0b)
 * and §8 (authored subjects, R-UX5). Budget rows mirror the generated manifest.
 *
 * Subjects (world metres): G0 gazes down the passage at the lit junction (the vault leads the
 * entry frame); G0b, mid-passage, turns toward the lit mouth — GALLERY_MOUTH by reference: the
 * head pre-turns toward the light before the corner (22° of the passage's 83° turn), so
 * G0→G0b pans 22° right and settles level, and G0b→Gj carries the remaining 61° onto the door,
 * flat. Gj and every stop east of it (Gjb, G1, G1b, G2) share the east door's opening centre
 * at eye height, so Gj→…→G2 is one locked dolly onto the door's light; from G1 that direction
 * is exactly (1, 0, 0) — the three G1 goldens hold. G2 stands 3 m off the door so the portal
 * frame reads as architecture. Seven stops since the 2026-11-16 walk re-choreography (the
 * creative's decision + spec, vault projects hermitage-3d-2026-11-16 brief 1): the two axis
 * rests reinstated because the per-gap walk law makes an unsplit 22.4 m leg run 14.9 m/s.
 * Every position and subject below is declared from the build constants
 * (tools/bpy/rastrelli-gallery.py) and framed by capture at integration.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

/** The east door's light: the open portal's centre (x 43..44, z 70..76) at eye height. */
const EAST_DOOR: Vec3 = [43.5, 1.7, 73];
/** The junction as seen from G0 and G0b: Gj's spot, 0.7 m over the eye so the vault leads the frame. */
const JUNCTION: Vec3 = [1.6, 2.4, 73];
/** R18-ux D3: the passage mouth's opening centre at eye height — Gj's Forward approach point. */
export const GALLERY_MOUTH: Vec3 = [4.4, 1.7, 73];

/**
 * R18-ux D3: Gj is a corner stop — the path G0→G0b→Gj is the passage chord and Gj→G1→G2 the
 * gallery axis z 73, so the second Forward is direct. Gj's approach point is the mouth
 * centre: the first Forward holds the opening through the arch instead of the door behind
 * the passage wall; from Gj the mouth and the door lie on one ray, so the stop pose is
 * unchanged.
 */
export const contract: RoomContract = {
  id: 'rastrelli-gallery',
  title: 'data.titleGallery',
  // The whole committed model (tools/bpy/rastrelli-gallery.py): the arch passage
  // (x -4..4, z 63.5..87.5, vault peak 5.0) plus the gallery proper (x 4..44, z 70..76).
  bounds: { min: [-4, 0, 63.5], max: [44, 5, 87.5] },
  rail: {
    stops: [
      {
        id: 'G0',
        position: [0, 1.7, 86],
        subject: JUNCTION,
        look: { yaw: 20, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g0',
      },
      {
        // The owner's 2026-11-14 walk steer («one added stop before the turn; minus two
        // after it») placed this rest at the G0→Gj diagonal's exact midpoint. The
        // 2026-11-16 re-choreography re-authors its subject: GALLERY_MOUTH by reference —
        // the head pre-turns toward the light before the corner. G0→G0b pans 22° right onto
        // the lit mouth and settles level (3.06° → 0°); G0b→Gj carries the remaining 61°
        // onto the door, flat. Look rows: Gj's verbatim. No corner/approach.
        id: 'G0b',
        position: [0.8, 1.7, 79.5],
        subject: GALLERY_MOUTH,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g0b',
      },
      {
        // The junction knot (§7): on the passage axis where it meets the gallery's centreline
        // z 73. The path turns here; the mouth (x 4..4.8, z 70..76) is 2.4 m east.
        // R18-ux D3: corner stop (the passage chord into the gallery axis) + the mouth centre
        // as the Forward approach point (verdict-2 consequence).
        id: 'Gj',
        position: [1.6, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        corner: true, // R18-ux D3
        approach: GALLERY_MOUTH, // R18-ux D3 (verdict-2 consequence)
        caption: 'caption.gj',
      },
      {
        // 2026-11-16 re-choreography: an axis rest on the EAST_DOOR lock at the Gj→G1
        // midpoint; no visual event is claimed — a locked dolly's rests frame the same door,
        // growing; the rest halves the leg's pace (14.9 → 7.5 m/s). Reinstates the stops
        // mini-round's id, retired by the owner's 2026-11-14 steer, whose verdict
        // («the corridor looks the same») stands accepted: under the per-gap pace law the
        // owner's 2026-11-16 report now offers a stop for speed.
        id: 'Gjb',
        position: [12.8, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.gjb',
      },
      {
        id: 'G1',
        position: [24, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g1',
      },
      {
        // 2026-11-16 re-choreography: an axis rest on the EAST_DOOR lock at the G1→G2
        // midpoint; the same law as Gjb — the rest halves the leg's pace (11.0 → 5.5 m/s).
        id: 'G1b',
        position: [32.25, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g1b',
      },
      {
        // 3 m off the opening: depart travels 1.5 m and halts 1.5 m short of the portal plane.
        id: 'G2',
        position: [40.5, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 25, pitchUp: 15, pitchDown: 10 },
        caption: 'caption.g2',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'square', airlock: 'arch-portal' },
    { to: 'jordan', airlock: 'gallery-airlock' },
  ],
  budget: {
    trianglesMax: 110_000,
    drawsMax: 25,
    textureBytesMax: 1_000_000,
    payloadBytesMax: 2_000_000,
  },
};
