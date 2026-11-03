/**
 * DEC-038 — the Alexander Column's bronze fence (Part A of «the Column's enclosure»). The pure
 * half: constants and laws only — no three, no DOM, no clock (the column/throat precedent).
 * tests/column-fence.test.ts scans it.
 *
 * SOURCED (wiki-ru «Александровская колонна»: «Характеристики», «Ограда и окружение памятника»,
 * «Ремонт ограды»): the envelope 16.5 × 16.5 × 1.5 m (COLUMN_FENCE, read from the column law);
 * a decorative bronze fence after Montferrand; 136 double-headed eagles; 12 trophy guns crowned
 * by three-headed eagles — 4 at the corners, 2 framing the double-leaf gate on each of the four
 * sides; between them alternating spears and banner-staffs crowned by the Guards' eagles;
 * installed 1834, complete 1836–1837; the 2004 replica of the same design is a «решётка».
 * READINGS (declared): the guns stand upright («венчали» puts the eagle on top); the 136 eagles
 * crown 136 staffs; each gate is centred on its side.
 * DECLARED (docs/artistic-license.md): the gun, staff and tie sizes, the tie heights, the gate's
 * cells. NOT IN THE SOURCE, SO NOT MODELLED: a base or kerb, the finish, the gun profile, the
 * eagle and pike forms, the spears' own count, the locks, the guard booth.
 */
import type { SourceKey } from '../content/facade-spec';
import { COLUMN_FENCE, COLUMN_X, COLUMN_Z } from './column';

export const COLUMN_FENCE_SOURCE: SourceKey = 'wiki-ru';

/** SOURCED: the fence's double-headed eagles — READ as one crowned staff each. */
export const COLUMN_FENCE_EAGLES = 136;

/** SOURCED: the trophy guns — one per corner, two framing the gate on each of the four sides. */
export const COLUMN_FENCE_GUNS = {
  corners: 4,
  gates: 4,
  perGate: 2,
} as const;

export const COLUMN_FENCE_GUN_COUNT =
  COLUMN_FENCE_GUNS.corners + COLUMN_FENCE_GUNS.gates * COLUMN_FENCE_GUNS.perGate; // 12

/**
 * DECLARED: a gun with its crowning eagle as one plain upright cylinder at the fence's full
 * height — no taper (which end points up is not in the source), no carriage, no eagle form.
 */
export const COLUMN_FENCE_GUN = { radiusM: 0.15, segments: 8 } as const;

/** DECLARED: a staff (spear or banner-staff) as a 4-sided prism, Ø 0.05 m, the full height. */
export const COLUMN_FENCE_STAFF = { radiusM: 0.025, segments: 4 } as const;

/** DECLARED: the grille's frame — two square ties per side; the staffs rise 0.12 m clear of it. */
export const COLUMN_FENCE_TIE = { sideM: 0.06, lowerY: 0.15, upperY: 1.35 } as const;

/** DECLARED: each gate centred on its side, two leaves of three staff cells. */
export const COLUMN_FENCE_GATE_CELLS = 6;

export const COLUMN_FENCE_HALF_SIDE_M = COLUMN_FENCE.sideM / 2; // 8.25

/** The railing's line on every side = the guns' centre line: their outer faces meet the envelope. */
export const COLUMN_FENCE_LINE_M = COLUMN_FENCE_HALF_SIDE_M - COLUMN_FENCE_GUN.radiusM; // 8.1

export const COLUMN_FENCE_STAFFS_PER_SIDE = COLUMN_FENCE_EAGLES / 4; // 34

/** DERIVED: the clear railing per side — corner line less two corner halves and two gate guns. */
export const COLUMN_FENCE_SIDE_CLEAR_M = 2 * COLUMN_FENCE_LINE_M - 6 * COLUMN_FENCE_GUN.radiusM; // 15.3

/** DERIVED: one cell per staff, the staff centred in its cell. */
export const COLUMN_FENCE_PITCH_M = COLUMN_FENCE_SIDE_CLEAR_M / COLUMN_FENCE_STAFFS_PER_SIDE; // 0.45

export const COLUMN_FENCE_GATE_M = COLUMN_FENCE_GATE_CELLS * COLUMN_FENCE_PITCH_M; // 2.7

export const COLUMN_FENCE_RUN_CELLS = (COLUMN_FENCE_STAFFS_PER_SIDE - COLUMN_FENCE_GATE_CELLS) / 2; // 14

/** A gate gun's offset from its side's midpoint: half the opening plus one gun radius. */
export const COLUMN_FENCE_GATE_GUN_S = COLUMN_FENCE_GATE_M / 2 + COLUMN_FENCE_GUN.radiusM; // 1.5

/** World plan bounds of the sourced envelope, centred on the Column's axis. */
export const COLUMN_FENCE_BOUNDS = {
  minX: COLUMN_X - COLUMN_FENCE_HALF_SIDE_M,
  maxX: COLUMN_X + COLUMN_FENCE_HALF_SIDE_M,
  minZ: COLUMN_Z - COLUMN_FENCE_HALF_SIDE_M,
  maxZ: COLUMN_Z + COLUMN_FENCE_HALF_SIDE_M,
  topY: COLUMN_FENCE.heightM,
} as const;

export type FencePlan = readonly [number, number];

export type FenceTie = Readonly<{
  centre: readonly [number, number, number];
  size: readonly [number, number, number];
}>;

/** The four sides as [along, outward] unit pairs — north, south, west, east (+X east, +Z south). */
const SIDES: ReadonlyArray<readonly [FencePlan, FencePlan]> = [
  [
    [1, 0],
    [0, -1],
  ],
  [
    [1, 0],
    [0, 1],
  ],
  [
    [0, 1],
    [-1, 0],
  ],
  [
    [0, 1],
    [1, 0],
  ],
];

const onSide = ([along, out]: readonly [FencePlan, FencePlan], s: number): FencePlan => [
  out[0] * COLUMN_FENCE_LINE_M + along[0] * s,
  out[1] * COLUMN_FENCE_LINE_M + along[1] * s,
];

/** Local plan stations (about the axis) of the 12 guns: the four corners, then two per gate. */
export function columnFenceGunStations(): ReadonlyArray<FencePlan> {
  const l = COLUMN_FENCE_LINE_M;
  const corners: FencePlan[] = [
    [-l, -l],
    [l, -l],
    [-l, l],
    [l, l],
  ];
  const gates = SIDES.flatMap((side) => [
    onSide(side, -COLUMN_FENCE_GATE_GUN_S),
    onSide(side, COLUMN_FENCE_GATE_GUN_S),
  ]);
  return [...corners, ...gates];
}

/** Staff offsets along one side from its midpoint: run · gate · run, each centred in its cell. */
export function columnFenceSideOffsets(): readonly number[] {
  const r = COLUMN_FENCE_GUN.radiusM;
  const spans: ReadonlyArray<readonly [number, number]> = [
    [-COLUMN_FENCE_LINE_M + r, COLUMN_FENCE_RUN_CELLS], // from the corner gun's face
    [-COLUMN_FENCE_GATE_M / 2, COLUMN_FENCE_GATE_CELLS], // the closed gate's two leaves
    [COLUMN_FENCE_GATE_GUN_S + r, COLUMN_FENCE_RUN_CELLS], // from the far gate gun's face
  ];
  return spans.flatMap(([start, cells]) =>
    Array.from({ length: cells }, (_, k) => start + COLUMN_FENCE_PITCH_M * (k + 0.5)),
  );
}

/** Local plan stations of the 136 staffs, side by side. */
export function columnFenceStaffStations(): ReadonlyArray<FencePlan> {
  const offsets = columnFenceSideOffsets();
  return SIDES.flatMap((side) => offsets.map((s) => onSide(side, s)));
}

/** The 8 ties: one box per side per level, corner gun axis to corner gun axis (ends inside). */
export function columnFenceTies(): ReadonlyArray<FenceTie> {
  const t = COLUMN_FENCE_TIE.sideM;
  const length = 2 * COLUMN_FENCE_LINE_M;
  return SIDES.flatMap((side) => {
    const [x, z] = onSide(side, 0);
    const [along] = side;
    const size = [along[0] === 0 ? t : length, t, along[1] === 0 ? t : length] as const;
    return [COLUMN_FENCE_TIE.lowerY, COLUMN_FENCE_TIE.upperY].map(
      (y): FenceTie => ({ centre: [x, y, z], size }),
    );
  });
}

/** The exact built count, part by part (the builder asserts it; the test pins 1,568). */
export const COLUMN_FENCE_PART_TRIANGLES = {
  guns: COLUMN_FENCE_GUN_COUNT * COLUMN_FENCE_GUN.segments * 4, // closed: side quads + two caps
  staffs: COLUMN_FENCE_EAGLES * COLUMN_FENCE_STAFF.segments * 2, // open-ended: side quads only
  ties: SIDES.length * 2 * 12, // boxes
} as const;

export const COLUMN_FENCE_TRIANGLES = Object.values(COLUMN_FENCE_PART_TRIANGLES).reduce(
  (a, b) => a + b,
  0,
);

export const COLUMN_FENCE_TRIANGLE_CEILING = 2000;

/** The rail's floor clearance to the envelope (the straight rail clears its NW corner 4.70635 m). */
export const COLUMN_FENCE_RAIL_CLEARANCE_M = 4.5;
