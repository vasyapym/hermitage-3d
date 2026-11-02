/**
 * DEC-037 — the Alexander Column on the Palace Square (post-1834). The pure half: constants and
 * laws only — no three, no DOM, no clock (the throat precedent). tests/column.test.ts scans it.
 *
 * SOURCED (wiki-ru «Александровская колонна», «Характеристики»): total 47.5 m; plinth (цоколь)
 * 3.9 m on 6.3 × 6.3 m; pedestal 4.25 m; reliefs 5.24 × 3.1 m; shaft 25.6 m, Ø 3.66 → 3.15 m;
 * angel 4.26 m; cross 6.4 m; fence 16.5 × 16.5 × 1.5 m. On the gate axis, «в центре Дворцовой
 * площади» (wiki-ru «Дворцовая площадь»).
 * DECLARED (docs/artistic-license.md): the 96.5 m plan distance, the pedestal width, the plinth
 * step insets, the capital / angel-pedestal / figure allocation, the two tuning colours.
 */
import type { SourceKey } from '../content/facade-spec';

export type Rgb = readonly [number, number, number];

export const COLUMN_SOURCE: SourceKey = 'wiki-ru';

/** The era the exterior commits to (DEC-037); the ATTRIBUTIONS line cites it. */
export const COLUMN_ERA = 'post-1834';

/** The facade's outer face: PALACE.halfDepth 87.5 + protrude 6 (main.ts). */
export const FACADE_OUTER_FACE_Z = 87.5 + 6;
/** DECLARED: the plan distance south of the outer face, on the gate axis. */
export const COLUMN_PLAN_DISTANCE_M = 96.5;
export const COLUMN_X = 0;
export const COLUMN_Z = FACADE_OUTER_FACE_Z + COLUMN_PLAN_DISTANCE_M; // 190
export const COLUMN_TOTAL_HEIGHT_M = 47.5;

export const COLUMN_PLINTH = {
  heightM: 3.9,
  footprintM: 6.3,
  steps: 3, // the sourced three rows, plain boxes
  stepInsetM: 0.125, // DECLARED: 6.3 → 6.05 → 5.8
} as const;

/** widthM DECLARED: the 5.24 m relief plus 0.18 m granite borders. */
export const COLUMN_PEDESTAL = { heightM: 4.25, widthM: 5.6 } as const;

/** One flat bronze face per pedestal side, standing 3 cm proud: no relief geometry. */
export const COLUMN_RELIEF = { widthM: 5.24, heightM: 3.1, standoffM: 0.03 } as const;

export const COLUMN_SHAFT = {
  heightM: 25.6,
  baseRadiusM: 3.66 / 2,
  topRadiusM: 3.15 / 2, // the Характеристики pin (the history section's 3.19 is the variance)
  segments: 24,
  rings: 8,
  entasisFromT: 1 / 3, // cylindrical lower third, parabolic diminution above (unfluted)
} as const;

/** DERIVED: the band above the shaft top — capital, angel pedestal, figure, cross. 13.75 m. */
export const COLUMN_FINIAL_BAND_M =
  COLUMN_TOTAL_HEIGHT_M - COLUMN_PLINTH.heightM - COLUMN_PEDESTAL.heightM - COLUMN_SHAFT.heightM;

export const COLUMN_FIGURE_HEIGHT_M = 4.26;
export const COLUMN_CROSS_HEIGHT_M = 6.4;

/** DECLARED allocation inside the 7.35 m between the shaft top and the cross bottom. */
export const COLUMN_CAPITAL = {
  echinusM: 0.6,
  echinusTopRadiusM: 1.95,
  abacusM: 0.9,
  abacusWidthM: 4.2,
} as const;

export const COLUMN_ANGEL_PEDESTAL = {
  drumM: 2.4,
  radiusM: 1.1,
  domeM: 0.6,
  domeRings: 2,
} as const;

/** The angel as a tapering silhouette mass: no face, limbs or wings (the charter). */
export const COLUMN_FIGURE = { baseRadiusM: 0.55, topRadiusM: 0.2, segments: 8 } as const;

/** The cross: two thin boxes, the pole rising behind (north of) the figure. */
export const COLUMN_CROSS = {
  poleM: 0.2,
  barWidthM: 1.6,
  barBelowTopM: 1.5,
  behindM: 0.35,
} as const;

const plinthTop = COLUMN_PLINTH.heightM;
const pedestalTop = plinthTop + COLUMN_PEDESTAL.heightM;
const shaftTop = pedestalTop + COLUMN_SHAFT.heightM;
const capitalTop = shaftTop + COLUMN_CAPITAL.echinusM + COLUMN_CAPITAL.abacusM;
const drumTop = capitalTop + COLUMN_ANGEL_PEDESTAL.drumM;
const domeTop = drumTop + COLUMN_ANGEL_PEDESTAL.domeM;

/** Levels above the square (m): 3.9 / 8.15 / 33.75 / 35.25 / 37.65 / 38.25 / 42.51 / 41.1 / 47.5. */
export const COLUMN_Y = {
  plinthTop,
  pedestalTop,
  shaftTop,
  capitalTop,
  drumTop,
  domeTop, // the figure's feet stand here
  figureTop: domeTop + COLUMN_FIGURE_HEIGHT_M,
  crossBottom: COLUMN_TOTAL_HEIGHT_M - COLUMN_CROSS_HEIGHT_M,
  crossTop: COLUMN_TOTAL_HEIGHT_M,
} as const;

/** TUNING TARGET (linear): pink rapakivi granite — plinth, pedestal, shaft. */
export const GRANITE_RAPAKIVI_LINEAR: Rgb = [0.3, 0.15, 0.12];
/** TUNING TARGET (linear): patinated bronze — panels, capital, angel pedestal, figure, cross. */
export const BRONZE_PATINA_LINEAR: Rgb = [0.09, 0.11, 0.09];

/** The rail's floor clearance to the axis (the built rail clears 14.57449 m). */
export const COLUMN_RAIL_CLEARANCE_M = 12;

/** SOURCED, not modelled this round: the fence envelope (half-diagonal 11.67 m). */
export const COLUMN_FENCE = { sideM: 16.5, heightM: 1.5 } as const;

/** r(t), t = 0 at the shaft base → 1 at its top: monotone non-increasing, end-exact. */
export function shaftRadiusAt(t: number): number {
  const { baseRadiusM, topRadiusM, entasisFromT } = COLUMN_SHAFT;
  const s = Math.min(1, Math.max(0, (t - entasisFromT) / (1 - entasisFromT)));
  const e = s * s;
  return baseRadiusM * (1 - e) + topRadiusM * e;
}

/** The lathe silhouette: rings + 1 points of [radius, height above the shaft base]. */
export function shaftProfile(): ReadonlyArray<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let k = 0; k <= COLUMN_SHAFT.rings; k++) {
    const t = k / COLUMN_SHAFT.rings;
    out.push([shaftRadiusAt(t), t * COLUMN_SHAFT.heightM]);
  }
  return out;
}

/** The exact built count, part by part (the builder asserts it; the test pins 676). */
export const COLUMN_PART_TRIANGLES = {
  plinth: COLUMN_PLINTH.steps * 12,
  pedestal: 12,
  reliefs: 4 * 2,
  shaft: COLUMN_SHAFT.segments * COLUMN_SHAFT.rings * 2,
  echinus: COLUMN_SHAFT.segments * 2,
  abacus: 12,
  drum: COLUMN_SHAFT.segments * 2,
  dome: COLUMN_SHAFT.segments * (2 * COLUMN_ANGEL_PEDESTAL.domeRings - 1),
  figure: COLUMN_FIGURE.segments * 4,
  cross: 2 * 12,
} as const;

export const COLUMN_TRIANGLES = Object.values(COLUMN_PART_TRIANGLES).reduce((a, b) => a + b, 0);

export const COLUMN_TRIANGLE_CEILING = 1500;

/**
 * DEC-037 sun-shadow fit: the committed ±130 m box (mapSize 1024²) re-centred on z = 95, halfway
 * between the palace centre and the Column — the south front and the Column then sit ≤ 113 m from
 * the box centre in light space for EVERY sun direction. main.ts carries the light and its target
 * on a rig at (0, 0, centreZ), so the light direction stays sampleSky's.
 */
export const SUN_SHADOW_FIT = {
  centreZ: COLUMN_Z / 2,
  left: -130,
  right: 130,
  top: 130,
  bottom: -130,
  near: 100,
  far: 2200,
} as const;
