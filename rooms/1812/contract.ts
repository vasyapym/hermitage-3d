// rooms/1812/contract.ts
/**
 * Military Gallery of 1812 room contract — docs/design-gallery.md §2.2 (bounds, portal box),
 * §6.1 (the five M-stops, verbatim values), §6.4 (data.title1812); DEC-025 (the landing
 * airlock's cut, the compression note riding the card), DEC-029 (route /1812), DEC-024
 * (the stand-in atlas). Budget rows mirror the generated manifest.
 *
 * Readings declared (the round's open questions, R3):
 * - FLOOR_Y = 10: §2.2 "floor y equal to the committed jordan landing floor height"; the
 *   built kit's floor and the landing-airlock portalFrom box both sit at y 10
 *   (tools/bpy/military-gallery.py FLOOR_Y, rooms/index.ts portalFrom.min[1] = 10).
 * - EYE = floor + 1.65: §6.1 declares M0's eye 1.65; the uniform reading applies it to all
 *   five stops (the floor is flat; the portrait rows hang from 1.6 to 4.4 and the eye sits
 *   below the bottom row's centre).
 * - Subjects are authored from the committed stop descriptions (§6.1): M0 down the axis to
 *   the monarch end wall; M1 at the west wall's block ≥ 2.2 m off the face; M2 at the middle
 *   lantern (7 m ahead, 4.9 m up = the 35° look-up); M3 at the H3 super-block; M4 at the
 *   closed St George's doors on the east wall. Framed by capture at integration.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

const FLOOR_Y = 10;
const EYE = FLOOR_Y + 1.65;
const AXIS_X = 86.25;

/** M0: the long view down the axis to the monarch end wall (z +15). */
const AXIS_FAR: Vec3 = [AXIS_X, FLOOR_Y + 3.0, 14.9];
/** M1: the west wall's block; the eye at x 84.3 stands 2.3 m off the wall face (≥ 2.2 m, §6.1). */
const WEST_BLOCK: Vec3 = [82.0, FLOOR_Y + 2.2, -25.0];
/** M2: the middle lantern (z −5.5): 7 m ahead, 4.9 m up = the 35° look-up (§6.1). */
const LANTERN: Vec3 = [AXIS_X, EYE + 4.9, -5.5];
/** M3: the H3 super-block on the end wall (z +15). */
const MONARCHS: Vec3 = [AXIS_X, FLOOR_Y + 3.2, 14.9];
/** M4: the closed St George's doors on the east wall (x 90.5), the bay nearest the monarch end. */
const ST_GEORGE_DOORS: Vec3 = [90.4, FLOOR_Y + 2.0, 14.5];

export const contract: RoomContract = {
  id: 'military-gallery',
  title: 'data.title1812',
  bounds: { min: [82.0, FLOOR_Y, -40.0], max: [90.5, FLOOR_Y + 9.6, 15.0] },
  rail: {
    stops: [
      {
        id: 'M0',
        position: [AXIS_X, EYE, -38.0],
        subject: AXIS_FAR,
        look: { yaw: 30, pitchUp: 25, pitchDown: 10 },
        caption: 'caption.m0',
      },
      {
        id: 'M1',
        position: [84.3, EYE, -25.0],
        subject: WEST_BLOCK,
        look: { yaw: 25, pitchUp: 20, pitchDown: 20 },
        caption: 'caption.m1',
      },
      {
        id: 'M2',
        position: [AXIS_X, EYE, -12.5],
        subject: LANTERN,
        look: { yaw: 40, pitchUp: 55, pitchDown: 0 },
        caption: 'caption.m2',
      },
      {
        id: 'M3',
        position: [AXIS_X, EYE, 9.0],
        subject: MONARCHS,
        look: { yaw: 20, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.m3',
      },
      {
        id: 'M4',
        position: [88.5, EYE, 13.0],
        subject: ST_GEORGE_DOORS,
        look: { yaw: 20, pitchUp: 10, pitchDown: 10 },
        caption: 'caption.m4',
      },
    ],
  },
  // Baked in R4 (three states, the kit/arch resolution split, white points); the module reads
  // the MANIFEST's all-or-nothing row and mounts dark until then — honest, never fake-lit.
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [{ to: 'jordan', airlock: 'landing-airlock' }],
  budget: {
    trianglesMax: 60_000,
    drawsMax: 19,
    // Raised 1_000_000 -> 1_200_000 after the owner's ruling (R4) — the cap was a
    // pre-light plan estimate; the lit room measured 1,131,373 B of ktx2 (the
    // jordan-class sharp-light content: 219-264 K per 2048 lm + the atlas 419 K).
    // Raised again 1_200_000 -> 2_650_000 for atlas v2 (the 3072² portrait atlas:
    // ≤ 1.9 M fence + the measured 712,391 B of the other ktx2): third figure,
    // atlas v2, owner ruling 2026-11-01.
    textureBytesMax: 2_650_000,
    payloadBytesMax: 4_000_000,
  },
};
