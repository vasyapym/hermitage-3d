// src/content/lightmap-look.ts

/**
 * Interior lightmap look gain — design-staircase §4.4 (r17c per-state scalar law).
 * The artistic multiplier applied AFTER the manifest white point restores the ktx2 encoding:
 * eff(room, state) = whitePoint(state) × INTERIOR_LOOK_GAIN[room][state]. Runtime design
 * configuration, not a second encoding scale: the interior exposure stays 1.0 and ADR-0013's
 * probe scalars are untouched. Every entry explicit and positive. Pure; no three, no DOM.
 *
 * Jordan's sRGB container is GPU-decoded before this linear multiplier. Its kappa=1
 * pins W × gain at the uniform level, not outgoing radiance: three's stock indirect
 * diffuse BRDF still supplies its Lambert 1/pi and glTF-compatible Fresnel factors.
 */

import type { LightState, RoomId } from '../world/registry';

/** The three baked states in manifest order; the record types above are keyed by it. */
export const LIGHT_STATES: readonly LightState[] = ['day', 'dusk', 'nightChandeliers'];

export const INTERIOR_LOOK_GAIN: Readonly<Record<RoomId, Readonly<Record<LightState, number>>>> = {
  // lm-percentile's landed row (fresh-bake plates): g_s = decimal half-up round2(κ / W),
  // κ = 1 → 1/0.45, 1/1, 1/1.2. Landed alongside ROOM.lightmaps.intensity in the room
  // descriptor (tools/bake-logs/jordan.md § Encode).
  jordan: { day: 2.22, dusk: 1, nightChandeliers: 0.83 },

  // RG-D1 (details program, iteration 1 — the lamps' light; the R-UX4 band rule is retired for
  // this room by owner call, design-walkthrough-ux §5 record): the three atlases carry the
  // SAME lamp field at GALLERY_LAMP_SCALE = 8 × the rig's emission (tools/lm-recipes.mjs) and
  // encode at the manifest's shared white point 0.8, so night ≤ dusk ≤ day holds per texel BY
  // CONSTRUCTION and the room carries ONE gain: eff = 0.8 × 2 = 1.6 in every state. The
  // encoded lamp toe is C = k/wp = 10 × the R-UX4 texel (wp = k/10 would make retunes of k a
  // no-op — any (k, k/10) pair encodes the same atlas; raise C by raising k with wp held).
  // The atlas numbers and the acceptance band live in the §5 RG-D1 record.
  // RG-E1 (the pale gallery round) re-tunes the knob to 4: the published night atlas at k = 8
  // (the old committed value) rendered the G1 night still 2.3× brighter than the ratified
  // golden-gallery-night baseline (0.3505 vs 0.1528 pixel mean) — the pale albedos' reflectance
  // adds on top of the lamp field, so matching the ratified look scales the knob k := 8/2.3 ≈
  // 3.5 → 4 (wp HELD at 0.8; the derivation + the runs live in tools/lm-recipes.mjs's RG-E1
  // note). The gains STAY 2/2/2: eff = 0.8 × 2 = 1.6 in every state, one gain, one k.
  'rastrelli-gallery': { day: 2, dusk: 2, nightChandeliers: 2 },

  // R4 (design-gallery.md §4.6): the Military Gallery of 1812; the states differ by an order
  // of magnitude in the bake (§4.3). The manifest white points are encode ranges only (the
  // r17c retune law: descriptor edit + reencode, never a re-bake; 3be6e50 moved the day wp
  // 0.5 → 1.5), so the rendered light is bake × gain and this row is the room's light knob.
  // B10 (owner call, «around 15 % more light»): every state × 1.15 — one shape, so night ≤ day
  // per texel and every inter-state ratio (incl. the dusk compose's 1/3 candelabra) holds.
  // eff = wp × gain = 1.5 × 1.725 / 0.15 × 3.45 / 0.3 × 2.3 = 2.5875 / 0.5175 / 0.69.
  'military-gallery': { day: 1.725, dusk: 3.45, nightChandeliers: 2.3 },
};

export type InteriorEmissiveMaterial = 'pane' | 'sconce_glow' | 'chandelier_glow';

export type InteriorEmissiveStateScale = Readonly<Record<LightState, number>>;

export type InteriorEmissiveRoomScale = Readonly<
  Partial<Record<InteriorEmissiveMaterial, InteriorEmissiveStateScale>>
>;

/**
 * Missing room/material means no write, not a default multiplier.
 * The Jordan-only applyWeights consumer must retain each material's original
 * authored strength and multiply it by the same frame's weighted state scale.
 * Never multiply last frame's emissiveIntensity or mutate another room's material.
 */
export const INTERIOR_EMISSIVE_SCALE: Readonly<Partial<Record<RoomId, InteriorEmissiveRoomScale>>> =
  {
    jordan: {
      pane: { day: 1.0, dusk: 0.12, nightChandeliers: 0.03 },
      sconce_glow: { day: 0.0, dusk: 1.0, nightChandeliers: 1.0 },
      chandelier_glow: { day: 0.0, dusk: 1.0, nightChandeliers: 1.0 },
    },
  };
