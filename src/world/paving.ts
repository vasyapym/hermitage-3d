// src/world/paving.ts
/**
 * Palace Square paving law — brief 19 §B.2 classes A–C; DEC-paving (number at merge).
 *
 * SOURCED (wiki-ru «Дворцовая площадь»): diabase sett paving (диабазовая брусчатка) laid in the
 * 1977 reconstruction in place of asphalt; area ≈ 5.4 ha; four lanterns at the corners (1977
 * recreations — the lantern SUCCESSOR, not modelled here).
 * READINGS (declared, aerial photographs): light granite bands divide the dark sett field into an
 * orthogonal grid aligned with the palace; the Column's enclosure sits inside one cell.
 * DECLARED: band period 20 m, width 0.6 m, anchor placing the Column axis at a cell centre;
 * sett module 0.12 m with 12 mm joints; footprint x ±110, z 92 (facade line) → 330 (220 × 238 m);
 * a flat darker surround beyond the footprint stands in for the unmodelled flanking buildings;
 * all tones relative to the committed ground colour (the one absolute).
 * NOT IN THE SOURCE, SO NOT MODELLED: kerbs, bollards, drains, the enclosure floor, the facade
 * pavement strip.
 * Pure: three-free, DOM-free. The GLSL twin (src/procedural/ground-paving.ts) interpolates these
 * constants and restates none of them.
 */

import type { SourceKey } from '../content/facade-spec';
import { COLUMN_X, COLUMN_Z } from './column';
import type { Vec3 } from './registry';
export const PAVING_SOURCE = 'wiki-ru' satisfies SourceKey;
export const PAVING_SETT_M = 0.12;
export const PAVING_JOINT_M = 0.012;
export const PAVING_JOINT_TONE = 0.7;
export const PAVING_SETT_TONE_AMP = 0.18;
export const PAVING_MOTTLE_M = 3.5;
export const PAVING_MOTTLE_AMP = 0.1;
export const PAVING_BAND_PERIOD_M = 20;
export const PAVING_BAND_WIDTH_M = 0.6;
export const PAVING_BAND_TONE: Vec3 = [3.6, 3.5, 3.3];
export const PAVING_SURROUND_TONE = 0.8;
export const PAVING_EDGE_SOFT_M = 0.6;
export const GROUND_PLANE_SIZE_M = 2000;
export const SQUARE_FOOTPRINT = { xMin: -110, xMax: 110, zMin: 92, zMax: 330 } satisfies Record<
  'xMin' | 'xMax' | 'zMin' | 'zMax',
  number
>;
/** A band centre-line passes here; the Column axis is therefore a cell centre. */
export const PAVING_BAND_ANCHOR: readonly [number, number] = [
  COLUMN_X + PAVING_BAND_PERIOD_M / 2,
  COLUMN_Z + PAVING_BAND_PERIOD_M / 2,
];
/** Joint area share of a cell and the body tone that makes the cell mean equal the base exactly. */
export const PAVING_JOINT_FRACTION = 1 - (1 - PAVING_JOINT_M / PAVING_SETT_M) ** 2;
export const PAVING_BODY_TONE = 1 / (1 - PAVING_JOINT_FRACTION * (1 - PAVING_JOINT_TONE));
export const isInsideSquareFootprint = (x: number, z: number): boolean =>
  x >= SQUARE_FOOTPRINT.xMin &&
  x <= SQUARE_FOOTPRINT.xMax &&
  z >= SQUARE_FOOTPRINT.zMin &&
  z <= SQUARE_FOOTPRINT.zMax;
/** Metres from a coordinate to the nearest band centre-line of the anchored grid. */
export const bandDistanceM = (coord: number, anchor: number): number => {
  const t = (coord - anchor) / PAVING_BAND_PERIOD_M;
  return Math.abs(t - Math.round(t)) * PAVING_BAND_PERIOD_M;
};
export const isOnBand = (x: number, z: number): boolean =>
  Math.min(bandDistanceM(x, PAVING_BAND_ANCHOR[0]), bandDistanceM(z, PAVING_BAND_ANCHOR[1])) <=
  PAVING_BAND_WIDTH_M / 2;
