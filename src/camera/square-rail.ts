/**
 * The square's rail (design-staircase §6.1 — S0 «the facade and the hour», S1 «the arch
 * approach»; design-walkthrough-ux §3 «the gate composition», §12 R-UX3, §8 R-UX5). The square
 * is a resident without a contract, so its stop data lives here; ids follow the design's naming.
 *
 * The square's gaze is authored, not the room pose law: S0 — level with the boot camera, up at
 * the cornice line — is what the noon and white-night goldens pin. The square has three stops
 * (R18-ux D1). S0 faces the facade. Sh (R18-ux D1) stands halfway (z 177), so the first Forward
 * comes closer without arriving. S1 (R-UX3, D7) stands back so the gate pavilion composes as
 * architecture. Under the glide look law, each glide holds its destination's subject: S0→Sh
 * holds the gate pavilion on the arch plane, Sh→S1 holds the arch mouth.
 *
 * DEC-037 (the post-1834 square): the Alexander Column stands on the gate axis at z 190, so the
 * rail no longer lies ON the axis — it runs WEST of it and MEETS it at S1. The three stops stay
 * XZ-collinear (S0 24 m west, Sh 12 m west, S1 on the axis); S1's pose and all three subjects are
 * the committed values. The line's perpendicular clearance to the Column axis is 14.57449 m
 * (floor COLUMN_RAIL_CLEARANCE_M 12; the sourced fence half-diagonal 11.67 m keeps ≈2.9 m).
 * West, not east: one mirrored choice; the gaze subjects stay on x = 0 either way.
 */
import type { Rail, Vec3 } from '../world/registry';

/** The authored S0 subject (§6.1 «exists today»): the boot pose the goldens pin. */
export const SQUARE_S0_GAZE: Vec3 = [0, 11, 0];
/** The authored Sh subject (R18-ux D1): the gate pavilion on the arch plane, halfway. */
export const SQUARE_SH_GAZE: Vec3 = [0, 8.5, 87];
/** The authored S1 subject (R-UX3): inside the mouth (z 93.5), ≈ ⅔ of the 9.55 m opening.
 * From S1 this is 8.7° up: the frame's top edge meets the facade near y 24 (entablature in). */
export const SQUARE_S1_GAZE: Vec3 = [0, 6.6, 92];

export const SQUARE_RAIL = {
  stops: [
    {
      id: 'S0',
      position: [-24, 1.7, 230],
      subject: SQUARE_S0_GAZE,
      look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
      caption: 'caption.s0',
    },
    {
      // R18-ux D1: halfway (z 177), so the first Forward comes closer without arriving. DEC-037:
      // the three stops lie on one XZ line meeting x = 0 at S1; the three subjects stay on x = 0.
      // The look rows are checked at capture for set edges.
      id: 'Sh',
      position: [-12, 1.7, 177],
      subject: SQUARE_SH_GAZE,
      look: { yaw: 30, pitchUp: 25, pitchDown: 20 },
      caption: 'caption.s1', // the arch beat; no Sh caption was authored this round
    },
    {
      id: 'S1',
      position: [0, 1.7, 124],
      subject: SQUARE_S1_GAZE,
      look: { yaw: 25, pitchUp: 20, pitchDown: 10 },
      caption: 'caption.s1',
    },
  ],
} satisfies Rail;
