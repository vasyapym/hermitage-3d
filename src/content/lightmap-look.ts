// src/content/lightmap-look.ts
/**
 * Interior lightmap look gain — design-staircase §4.4 (r17c per-state scalar law).
 * The artistic multiplier applied AFTER the manifest white point restores the ktx2 encoding:
 * eff(room, state) = whitePoint(state) × INTERIOR_LOOK_GAIN[room][state]. Runtime design
 * configuration, not a second encoding scale: the interior exposure stays 1.0 and ADR-0013's
 * probe scalars are untouched. Every entry explicit and positive. Pure; no three, no DOM.
 */
import type { LightState, RoomId } from '../world/registry';

/** The three baked states in manifest order; the record types above are keyed by it. */
export const LIGHT_STATES: readonly LightState[] = ['day', 'dusk', 'nightChandeliers'];

export const INTERIOR_LOOK_GAIN: Readonly<Record<RoomId, Readonly<Record<LightState, number>>>> = {
  jordan: { day: 4, dusk: 3, nightChandeliers: 1 },
  // RG-D1 (details program, iteration 1 — the lamps' light; the R-UX4 band rule is retired for
  // this room by owner call, design-walkthrough-ux §5 record): the three atlases carry the
  // SAME lamp field at GALLERY_LAMP_SCALE = 8 × the rig's emission (tools/lm-recipes.mjs) and
  // encode at the manifest's shared white point 0.8, so night ≤ dusk ≤ day holds per texel BY
  // CONSTRUCTION and the room carries ONE gain: eff = 0.8 × 2 = 1.6 in every state. The
  // encoded lamp toe is C = k/wp = 10 × the R-UX4 texel (wp = k/10 would make retunes of k a
  // no-op — any (k, k/10) pair encodes the same atlas; raise C by raising k with wp held).
  // The atlas numbers and the acceptance band live in the §5 RG-D1 record.
  'rastrelli-gallery': { day: 2, dusk: 2, nightChandeliers: 2 },
  // R4 (design-gallery.md §4.6): the first-bake gains for the Military Gallery of 1812.
  // The states differ by an order of magnitude here (§4.3). The first bake's histogram
  // (the r17c retune law: the descriptor edit + reencode, never a re-bake) moved the DAY
  // split: the white point 0.25 clipped 46% of the plate (the floor + the lit vault sit
  // ~0.5 linear), so the day encodes at wp 0.5 and the look gain drops 3 → 1.5 — eff stays
  // 0.75 (the look is unchanged; the 8-bit survival is what moved). eff = 0.75 / 0.45 / 0.6
  // — under the EFF ceiling of 1.0, night < day per texel.
  'military-gallery': { day: 1.5, dusk: 3, nightChandeliers: 2 },
};
