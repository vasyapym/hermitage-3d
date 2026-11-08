// tools/lm-recipes.mjs
//
// R-UX4 (walkthrough-UX pass, corridor light): the declared composite recipes, consulted by
// tools/reencode.mjs before the single-input encode. Room contract rastrelli-gallery
// (design-staircase §1.4: artificial light dominates at every hour; the three bakes differ
// little) — the published day state is the night lamp field plus the day rig's daylight,
// scaled by GALLERY_LAMP_SCALE: by linearity of light transport this is the bake a single
// rig with fixtures ON at k × SCONCE_EMISSION plus the day sun/world would produce.
// A later re-bake may fold the lamp power into tools/bpy/rastrelli-gallery.py SCONCE_EMISSION
// (× k, back to k = 1) — equivalent up to denoise with the white point re-derived to hold C.
//
// RG-D1 (Rastrelli Gallery details program, iteration 1 — the lamps' light): the owner's
// verdict «too dark at autumn/winter evenings; there should be more light» is the owner call
// the R-UX4 record asked for. The lamp field is published at GALLERY_LAMP_SCALE × the rig's
// emission in ALL THREE states (night = k·L, dusk = sky + k·L, day = sun + k·L), so the
// per-texel ordering night ≤ dusk ≤ day holds by construction and needs no per-state gain
// difference (src/content/lightmap-look.ts carries one gain for the room). The scale is the
// recorded slow path («re-bake with higher lamp power») executed at encode from the surviving
// denoised EXRs — byte-deterministic, no re-bake. The daylight term stays at 1.0 (physical
// sun, strength 4.0): it is under-represented until the courtyard-side windows exist in the
// model — the next evidence item, not a tuning knob.
//
// R4 (design-gallery.md §4.6, D-3): the Military Gallery's dusk is COMPOSED, not baked at a
// third — the dusk rig bakes sky only (bake.py's DUSK_FIXTURES False for this room), and the
// published dusk is the dusk sky field plus the night candelabra field at
// DUSK_CANDELABRA_SCALE. By linearity this is the bake a 1/3-emission rig would produce, and
// "a third" becomes a recipe scalar retunable by a two-minute re-encode instead of a
// 40-minute re-bake. The compose runs PER CHART (architecture and kit alike) — recipes name
// bake-rig states; the driver resolves both charts' sources.
//
// Law: a published lightmap state either encodes its own bake-rig EXR (no recipe here) or
// encodes the linear sum  sum_i scale_i * EXR(source_i)  produced by tools/lm_compose.py.
// Sources are bake-rig STATES; the driver resolves them to staged denoised EXRs by its
// existing path convention. White points are never applied here (the manifest's
// lightmaps.intensity record stays the single source of truth).

/**
 * @typedef {'day' | 'dusk' | 'nightChandeliers'} LightState
 * @typedef {{ source: LightState, scale: number }} ComposeTerm
 */

/** D-3: the candelabra's share of the night field in the composed dusk. */
export const DUSK_CANDELABRA_SCALE = 1 / 3;

/**
 * RG-D1: the published lamp power of the gallery's sconces, as a multiple of the bake rig's
 * SCONCE_EMISSION (6.0). First setting k = 8 with the manifest white point 0.8: the encoded
 * lamp toe is C = k / wp = 10 × the R-UX4 night texel (atlas night mean 0.2324 → 0.3221; the
 * clip set moves to wall L ≥ 0.1 — 13.29 → 15.86 % of texels, measured). wp is HELD on
 * retunes: a (k, k/10) pair encodes the same atlas for every k, so the retune knob is C
 * (= k with wp fixed), never a paired law. The acceptance band: design-walkthrough-ux.md §5
 * (RG-D1 record).
 *
 * RG-F2 (2026-11-08, the bake phase): the fresh 1536 bake's pale room re-dials k to 3 by
 * THE ONE RULE: the post-encode G1-night frame mean was 91.39/255 at k = 4 (> 90/255), so
 * ONE full re-encode ran at k = 3 (wp HELD at 0.8; the compose law's per-state ordering
 * night <= dusk <= day holds by construction). The k=4 mean is recorded in the round's
 * bake log/report; the dial lives ONLY here.
 *
 * RG-E1 (round e1, the pale gallery) re-tunes k to 4. The fresh rig's plate came out far
 * dimmer than RG-D1's in the raw-plate statistics (full-atlas linear mean 0.00926 lum vs the
 * old rig's 0.2324) — RG-E1's EMITTER_EXCLUSION True empties the old bake's self-lit sconce
 * cells (the old committed night atlas decoded at fullMean 0.5043 lum, median 0.3437, ~the
 * anchor's 15.86 % saturated), so the ≥ 16 % near-white band the old anchor carried no longer
 * exists as atlas content. The light-transport check that matters is the RUNTIME look, on the
 * same decoder: the published night atlas at the committed k = 8 read (post-ETC1S decode)
 * fullMean 0.2465 lum / rgb mean (0.294, 0.240, 0.172) and rendered the G1 night still at a
 * pixel mean of 0.3505 against the ratified golden-gallery-night baseline's 0.1528 — a 2.3×
 * brighter room at the same k (the pale albedos' reflectance adds on top of what the lamp
 * field needs). Matching the ratified look scales the knob k := 8 / 2.3 ≈ 3.5 → 4 (inside
 * the RG-D1 band's re-derived class; wp HELD at 0.8; the compose law's per-state ordering
 * night ≤ dusk ≤ day holds by construction). The sweep retained for the record (composed
 * plates at wp 0.8, pre-ETC1S encode means): night k=8 lum 0.2474 (clip 1.62 %), day 0.3512
 * (clip 4.94 %), dusk 0.2691 (clip 1.62 %) — the published day/dusk still encode at k = 4
 * via the same recipe terms (day = k·night + 1·day; dusk = 1·dusk + (k−1)·night).
 */
export const GALLERY_LAMP_SCALE = 3;

/** @type {Readonly<Record<string, Readonly<Partial<Record<LightState, readonly ComposeTerm[]>>>>>} */
export const LIGHTMAP_COMPOSE_RECIPES = Object.freeze({
  'rastrelli-gallery': Object.freeze({
    day: Object.freeze([
      Object.freeze({ source: 'nightChandeliers', scale: GALLERY_LAMP_SCALE }),
      Object.freeze({ source: 'day', scale: 1 }),
    ]),
    // The dusk rig is sky + 1·L (DUSK_FIXTURES true); adding (k − 1)·L yields sky + k·L.
    dusk: Object.freeze([
      Object.freeze({ source: 'dusk', scale: 1 }),
      Object.freeze({ source: 'nightChandeliers', scale: GALLERY_LAMP_SCALE - 1 }),
    ]),
    nightChandeliers: Object.freeze([
      Object.freeze({ source: 'nightChandeliers', scale: GALLERY_LAMP_SCALE }),
    ]),
  }),
  'military-gallery': Object.freeze({
    dusk: Object.freeze([
      Object.freeze({ source: 'dusk', scale: 1 }),
      Object.freeze({ source: 'nightChandeliers', scale: DUSK_CANDELABRA_SCALE }),
    ]),
  }),
});

/**
 * Returns the compose terms for (room, state), or null when the state encodes its own bake.
 * @param {string} room
 * @param {LightState} state
 * @returns {readonly ComposeTerm[] | null}
 */
export const composeRecipeFor = (room, state) => {
  const roomRecipes = LIGHTMAP_COMPOSE_RECIPES[room];
  if (roomRecipes === undefined) return null;
  const terms = roomRecipes[state];
  return terms === undefined ? null : terms;
};

/**
 * Builds the echoed argv tail for tools/lm_compose.py from resolved source paths.
 * @param {string} outPath
 * @param {readonly { path: string, scale: number }[]} resolved
 * @returns {string[]}
 */
export const composeArgs = (outPath, resolved) => {
  const args = ['--out', outPath];
  for (const term of resolved) {
    if (!Number.isFinite(term.scale) || term.scale <= 0) {
      throw new Error(`lm-recipes: scale must be finite and > 0, got ${String(term.scale)}`);
    }
    args.push('--in', `${term.path}:${String(term.scale)}`);
  }
  return args;
};
