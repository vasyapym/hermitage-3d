// rooms/st-george/contract.ts
/**
 * St George's Hall (the Large Throne Room) contract — the vault record
 * 03-1_projects/hermitage-3d-2026-11-26-new-room/round-1/DECISION-1.md (the CONTRACT block,
 * stops H0–H4 verbatim), as re-anchored by its Amendments: AXIS_Z −12.5 → 14.5 (the committed
 * doors' axis, ST_GEORGE_DOORS in rooms/1812/contract.ts), FLOOR_Y → 10 (the gallery's own
 * law, EYE = FLOOR_Y + 1.65), bounds min x → 91 (X0; the hall's west boundary — the design's
 * 90 over-covered the gallery's bounds by 1 m). One rigid translation; the stop offsets and
 * look rows are the record's. Budget rows mirror the generated manifest (the bake lands with
 * the step-2 artifacts).
 *
 * The rail never looks west (DEC-005 as a computed rule): every subject lies east of its stop;
 * the entrance wall is bake-only. Golden stop H0 — the threshold: the whole axis after the
 * narrow gallery.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

/** The seat under the canopy. */
const THRONE: Vec3 = [136.0, 12.9, 14.5];
/** The pre-turn: the canopy crown, the first lift toward the ceiling. */
const THRONE_RISE: Vec3 = [136.0, 15.2, 14.5];
/** The gilt ceiling ahead; the parquet repeats it one drag down. */
const PLAFOND: Vec3 = [130.0, 19.9, 14.5];
/** The St George plate above the throne place. */
const RELIEF: Vec3 = [137.6, 16.6, 14.5];

export const contract: RoomContract = {
  id: 'st-george',
  title: 'data.titleStGeorge',
  bounds: { min: [91, 9.5, 5], max: [139, 20.5, 24] },
  rail: {
    stops: [
      {
        // The threshold: the whole axis after the narrow gallery.
        id: 'H0',
        position: [93.5, 11.65, 14.5],
        subject: THRONE,
        look: { yaw: 35, pitchUp: 40, pitchDown: 15 },
        caption: 'caption.h0',
      },
      {
        // The colonnade and the balcony tier; the gaze starts to lift.
        id: 'H1',
        position: [103.0, 11.65, 14.5],
        subject: THRONE_RISE,
        look: { yaw: 35, pitchUp: 40, pitchDown: 20 },
        caption: 'caption.h1',
      },
      {
        // The centre: the ceiling and its twin in the floor.
        id: 'H2',
        position: [114.5, 11.65, 14.5],
        subject: PLAFOND,
        look: { yaw: 35, pitchUp: 25, pitchDown: 40 },
        caption: 'caption.h2',
      },
      {
        // The throne place.
        id: 'H3',
        position: [124.0, 11.65, 14.5],
        subject: THRONE,
        look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
        caption: 'caption.h3',
      },
      {
        // The foot of the dais; the route's end.
        id: 'H4',
        position: [130.5, 11.65, 14.5],
        subject: RELIEF,
        look: { yaw: 35, pitchUp: 25, pitchDown: 35 },
        caption: 'caption.h4',
      },
    ],
  },
  // The lightmaps states ride the record (the bake × 3 at 1024² joins the step-2 artifacts).
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [{ to: 'military-gallery', airlock: 'throne-airlock' }],
  budget: {
    trianglesMax: 70_000,
    drawsMax: 24,
    textureBytesMax: 2_400_000,
    payloadBytesMax: 4_000_000,
  },
};
