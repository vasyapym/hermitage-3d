// Facade solver — src/procedural/facade-solver.ts
// Pure placement solver for the south facade (docs/design-facade-grammar.md).
// No three.js, no randomness, no clock, no DOM; importable from node tests.
// Salvaged from relay round 6; orchestrator correction: sills scale to their
// opening width (round-5 rule), unit scale was wrong under large openings.
import type {
  FacadeSection,
  FacadeSpec,
  OrderTier,
  SectionKind,
  WindowModule,
  WindowRow,
  WindowRowId,
} from '../content/facade-spec';

export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };
export type Aabb = { readonly min: Vec3; readonly max: Vec3 };

export const WINDOW_ROW_IDS: readonly WindowRowId[] = ['row1', 'row2', 'row3', 'row4'];
export const WINDOW_MODULES: readonly WindowModule[] = ['small', 'medium', 'large'];
export const ORDER_TIERS: readonly OrderTier[] = ['lower', 'upper'];

export type SurroundPartId =
  | `surround-${WindowRowId}-${WindowModule}`
  | 'surround-row2-risalit'
  | 'surround-row3-segmental'
  | 'surround-row3-risalit';
export type FixedPartId =
  | 'sill'
  | 'paired-column'
  | 'corner-bunch'
  | 'portal-arch'
  | 'ground-arch'
  | 'giant-column'
  | 'pediment'
  | 'cartouche'
  | 'cornice-run'
  | 'order-junction'
  | 'balustrade'
  | 'vase'
  | 'statue';
export type PartId = SurroundPartId | FixedPartId;

export const FIXED_PART_IDS: readonly FixedPartId[] = [
  'sill',
  'paired-column',
  'corner-bunch',
  'portal-arch',
  'ground-arch',
  'giant-column',
  'pediment',
  'cartouche',
  'cornice-run',
  'order-junction',
  'balustrade',
  'vase',
  'statue',
];

function surroundPartId(rowId: WindowRowId, windowModule: WindowModule): SurroundPartId {
  return `surround-${rowId}-${windowModule}`;
}

export const PART_IDS: readonly PartId[] = [
  ...WINDOW_ROW_IDS.flatMap((rowId) =>
    WINDOW_MODULES.map((windowModule) => surroundPartId(rowId, windowModule)),
  ),
  ...FIXED_PART_IDS,
];

export type PartMeta = {
  readonly localBounds: Aabb;
  readonly triangleCeiling: number;
  readonly shaftCount: 0 | 1 | 2 | 3;
};

function box(sx: number, sy: number, sz: number): Aabb {
  return { min: { x: -sx / 2, y: 0, z: 0 }, max: { x: sx / 2, y: sy, z: sz } };
}

function part(
  sx: number,
  sy: number,
  sz: number,
  triangleCeiling: number,
  shaftCount: 0 | 1 | 2 | 3,
): PartMeta {
  return { localBounds: box(sx, sy, sz), triangleCeiling, shaftCount };
}

const SURROUND_ROW1 = part(1.7, 2.25, 0.32, 192, 0);
const SURROUND_ROW2 = part(2.1, 4.25, 0.32, 288, 0);
const SURROUND_ROW3 = part(2.1, 3.8, 0.32, 256, 0);
const SURROUND_ROW4 = part(1.7, 2.65, 0.32, 224, 0);
// The variant surround envelopes equal their row's base envelope (the dressings
// law, sq-facade): only the ceilings differ — placement bounds and
// surroundOffsetZ are untouched, and the night lattice sizes the pane from
// the same row parameters.
const SURROUND_ROW2_RISALIT = SURROUND_ROW2;
const SURROUND_ROW3_SEGMENTAL = SURROUND_ROW3;
const SURROUND_ROW3_RISALIT = SURROUND_ROW3;

export const KIT: Readonly<Record<PartId, PartMeta>> = {
  'surround-row1-small': SURROUND_ROW1,
  'surround-row1-medium': SURROUND_ROW1,
  'surround-row1-large': SURROUND_ROW1,
  'surround-row2-small': SURROUND_ROW2,
  'surround-row2-medium': SURROUND_ROW2,
  'surround-row2-large': SURROUND_ROW2,
  'surround-row3-small': SURROUND_ROW3,
  'surround-row3-medium': SURROUND_ROW3,
  'surround-row3-large': SURROUND_ROW3,
  'surround-row4-small': SURROUND_ROW4,
  'surround-row4-medium': SURROUND_ROW4,
  'surround-row4-large': SURROUND_ROW4,
  'surround-row2-risalit': SURROUND_ROW2_RISALIT,
  'surround-row3-segmental': SURROUND_ROW3_SEGMENTAL,
  'surround-row3-risalit': SURROUND_ROW3_RISALIT,
  sill: part(1.4, 0.15, 0.4, 40, 0),
  'paired-column': part(1.1, 9.6, 0.65, 480, 2),
  'corner-bunch': part(1.1, 9.6, 0.75, 720, 3),
  'portal-arch': part(5.5, 9.8, 0.6, 256, 0),
  'ground-arch': part(4.9, 9.4, 0.1, 96, 0),
  'giant-column': part(1.1, 20.4, 0.85, 320, 1),
  pediment: part(27.2, 5, 0.7, 256, 0),
  cartouche: part(2.4, 3.2, 0.45, 768, 0),
  'cornice-run': part(1, 1, 0.8, 104, 0),
  'order-junction': part(1.7, 1, 1.7, 96, 0),
  balustrade: part(3.4, 2, 0.35, 384, 0),
  vase: part(1, 2.6, 1, 192, 0),
  statue: part(1.2, 6, 1.2, 640, 0),
};

export type Cell =
  | { readonly kind: 'window'; readonly rowId: WindowRowId; readonly module: WindowModule }
  | { readonly kind: 'portalVoid'; readonly rowId: WindowRowId; readonly arch: 0 | 1 | 2 };

export type Axis = {
  readonly id: string;
  readonly sectionId: string;
  readonly index: number;
  readonly x: number;
  readonly frontZ: number;
  readonly cells: readonly Cell[];
};

export type Placement = {
  readonly id: string;
  readonly partId: PartId;
  readonly position: Vec3;
  readonly rotationY: number;
  readonly scale: Vec3;
};

export type PlacementsByPart = Readonly<Record<PartId, readonly Placement[]>>;

export type Counts = {
  readonly axes: number;
  readonly windowSlots: number;
  readonly windows: number;
  readonly portalVoidCells: number;
  readonly columnShafts: number;
  readonly instances: number;
  readonly activeParts: number;
  readonly triangles: number;
  readonly byPart: Readonly<Record<PartId, number>>;
};

export type Issue = {
  readonly severity: 'warning' | 'error';
  readonly code: 'spec' | 'crease' | 'bounds';
  readonly path: string;
  readonly message: string;
};

export type SolvedFacade = {
  readonly id: 'south';
  readonly pitchM: number;
  readonly derivedCreaseM: number;
  readonly axes: readonly Axis[];
  readonly placements: readonly Placement[];
  readonly byPart: PlacementsByPart;
  readonly counts: Counts;
  readonly bounds: Aabb;
};

export type SolveResult =
  | { readonly ok: true; readonly value: SolvedFacade; readonly warnings: readonly Issue[] }
  | { readonly ok: false; readonly issues: readonly Issue[] };

export type BoundsCheck = {
  readonly ok: boolean;
  readonly actual: Aabb;
  readonly outsideIds: readonly string[];
};

export type SceneAllowance = {
  readonly shadowPasses: 0 | 1;
  readonly otherFrameDrawCalls: number;
  readonly massingTriangles: number;
  readonly skyTriangles: number;
  readonly measuredJsGzipBytes: number | null;
};

export type BudgetProjection = {
  readonly facadeDrawCalls: number;
  readonly frameDrawCalls: number;
  readonly frustumTriangles: number;
  readonly submittedTriangleCeiling: number;
  readonly jsGzipBytes: number | null;
};

export const SOUTH_ENVELOPE: Aabb = {
  min: { x: -105.9, y: 0, z: 86.6 },
  max: { x: 105.9, y: 30, z: 95 },
};

const BOUNDS_TOLERANCE_M = 1e-6;

// Design decisions of the facade grammar (not spec data). Metres, absolute Y.
const RULES = {
  wallLineZ: 87.5,
  nominalPitchM: 3.4,
  pitchClosureToleranceM: 2,
  creaseToleranceM: 0.5,
  minProtrusionStepM: 0.01,
  rowSillY: { row1: 1.2, row2: 5.6, row3: 12.3, row4: 17.3 },
  rowTier: { row1: 'lower', row2: 'lower', row3: 'upper', row4: 'upper' },
  surroundOffsetZ: 0.02,
  sillDropM: 0.15,
  tierBaseY: { lower: 0.6, upper: 11.4 },
  stretchPierGaps: [2, 6, 10, 14, 18],
  risalitBunchGaps: [1, 6],
  portal: {
    giantGaps: [1, 3, 5, 7],
    giantBaseY: 0.6,
    arches: [
      { arch: 0, axes: [1, 2] },
      { arch: 1, axes: [3, 4] },
      { arch: 2, axes: [5, 6] },
    ],
    archRows: ['row1', 'row2'],
    archBaseY: 0.2,
    groundArchOffsetZ: 0.02,
    pedimentBaseY: 22,
    cartoucheBaseY: 23,
    cartoucheOffsetZ: 0.02,
  },
  bands: [
    { name: 'lower', baseY: 10.2, acrossPortal: false },
    { name: 'upper', baseY: 21, acrossPortal: true },
  ],
  bandJunctionTrimM: 0.85,
  parapet: {
    baseY: 22,
    junctionScale: { x: 0.5, y: 2, z: 0.5 },
    trimM: 0.25,
    panelsPerReturn: 2,
  },
  ornaments: { baseY: 24, slotsPerSection: [6, 18, 0, 18, 6] },
} as const;

// ---------------------------------------------------------------------------
// The dressings law (sq-facade, DEC-ready): the window type is the
// (row × section-class) cell — 10 of the spec's declared 12 window types are
// populated on the south front (the portal's rows 1–2 are the arch voids) —
// and the head variant per cell is the HEAD_LAW row. The variant ids reuse
// their row's base envelope; the stretch alternation is mirrored about the
// portal axis by the same east-half convention emitOrnaments uses.
// ---------------------------------------------------------------------------

export type SectionClass = 'risalit' | 'stretch' | 'portal';
export type HeadVariant = 'base' | 'segmental' | 'risalit';

/** One class per solved layout index: risalit, stretch, portal, stretch, risalit. */
export const SECTION_CLASS_BY_LAYOUT = [
  'risalit',
  'stretch',
  'portal',
  'stretch',
  'risalit',
] as const satisfies readonly SectionClass[];

export function sectionClassOfLayoutIndex(index: number): SectionClass {
  const sectionClass: SectionClass | undefined = SECTION_CLASS_BY_LAYOUT[index];
  if (sectionClass === undefined) throw new Error('layout index outside the section grid');
  return sectionClass;
}

export const HEAD_LAW: Readonly<
  Record<WindowRowId, Readonly<Record<SectionClass, readonly HeadVariant[]>>>
> = {
  row1: { risalit: ['base'], stretch: ['base'], portal: ['base'] },
  row2: { risalit: ['base'], stretch: ['base'], portal: ['base'] },
  row3: { risalit: ['base'], stretch: ['base'], portal: ['base'] },
  row4: { risalit: ['base'], stretch: ['base'], portal: ['base'] },
};

function surroundVariantPartId(
  row: WindowRowId,
  variant: Exclude<HeadVariant, 'base'>,
): SurroundPartId {
  if (row === 'row2' && variant === 'risalit') return 'surround-row2-risalit';
  if (row === 'row3') {
    return variant === 'segmental' ? 'surround-row3-segmental' : 'surround-row3-risalit';
  }
  throw new Error(`no variant surround part for row '${row}'`);
}

export function surroundPartFor(
  row: WindowRowId,
  module: WindowModule,
  sectionClass: SectionClass,
  ordinal: number,
): SurroundPartId {
  const variants: readonly HeadVariant[] | undefined = HEAD_LAW[row][sectionClass];
  const length = variants?.length ?? 1;
  const variant: HeadVariant = variants?.[ordinal % length] ?? 'base';
  return variant === 'base' ? surroundPartId(row, module) : surroundVariantPartId(row, variant);
}

/** The populated `${row}/${sectionClass}` window-type keys of a facade spec. */
export function windowTypeGrid(spec: FacadeSpec): ReadonlySet<string> {
  const grid = new Set<string>();
  const archRows = RULES.portal.archRows as readonly WindowRowId[];
  for (const [index] of spec.sections.entries()) {
    const sectionClass = sectionClassOfLayoutIndex(index);
    for (const rowId of WINDOW_ROW_IDS) {
      if (sectionClass === 'portal' && archRows.includes(rowId)) continue;
      grid.add(`${rowId}/${sectionClass}`);
    }
  }
  return grid;
}

// Opening widths of the three sourced window modules (design §1); the sill
// scales to opening width + 0.40 (round-5 kit rule, restored by the
// orchestrator — the relay draft emitted unit-scale sills everywhere).
// Exported for the /notes elevation frieze (src/ui/notes-elevation.ts), which
// over the same declared geometry must not re-declare it.
export const OPENING_WIDTH_BY_MODULE: Readonly<Record<WindowModule, number>> = {
  small: 1,
  medium: 1.35,
  large: 1.7,
};
const SILL_JAMB_OVERHANG_M = 0.4;

// Declared sill heights per window row (the RULES design decisions); the /notes
// elevation frieze (src/ui/notes-elevation.ts) reads the same numbers instead of
// re-declaring them.
export const WINDOW_ROW_SILL_Y: Readonly<Record<WindowRowId, number>> = {
  row1: RULES.rowSillY.row1,
  row2: RULES.rowSillY.row2,
  row3: RULES.rowSillY.row3,
  row4: RULES.rowSillY.row4,
};

const EXPECTED_SECTION_KINDS: readonly SectionKind[] = [
  'cornerRisalit',
  'stretch',
  'centralPortal',
  'stretch',
  'cornerRisalit',
];

const MIN_AXES_BY_KIND: Readonly<Record<SectionKind, number>> = {
  cornerRisalit: Math.max(...RULES.risalitBunchGaps) + 1,
  stretch: Math.max(...RULES.stretchPierGaps) + 1,
  centralPortal:
    Math.max(...RULES.portal.giantGaps, ...RULES.portal.arches.map((entry) => entry.axes[1])) + 1,
};

const PIER_RULES: Readonly<
  Record<
    SectionKind,
    { readonly partId: 'paired-column' | 'corner-bunch'; readonly gaps: readonly number[] } | null
  >
> = {
  stretch: { partId: 'paired-column', gaps: RULES.stretchPierGaps },
  cornerRisalit: { partId: 'corner-bunch', gaps: RULES.risalitBunchGaps },
  centralPortal: null,
};

const EPSILON = 1e-9;
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

type Point2 = { readonly x: number; readonly z: number };

type SectionLayout = {
  readonly section: FacadeSection;
  readonly index: number;
  readonly prefixAxes: number;
  readonly startX: number;
  readonly endX: number;
  readonly frontZ: number;
};

type Frame = {
  readonly halfLengthM: number;
  readonly pitchM: number;
  readonly layouts: readonly SectionLayout[];
};

type Segment = {
  readonly kind: 'front' | 'return';
  readonly layout: SectionLayout;
  readonly a: Point2;
  readonly b: Point2;
  readonly normal: Point2;
};

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
}

function exactSinCos(rotationY: number): readonly [number, number] {
  const quarterTurns = rotationY / (Math.PI / 2);
  const nearest = Math.round(quarterTurns);
  if (Math.abs(quarterTurns - nearest) < EPSILON) {
    const index = ((nearest % 4) + 4) % 4;
    if (index === 0) return [0, 1];
    if (index === 1) return [1, 0];
    if (index === 2) return [0, -1];
    return [-1, 0];
  }
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

function isValidTransform(placement: Placement): boolean {
  const { position, scale, rotationY } = placement;
  return (
    isFiniteNumber(position.x) &&
    isFiniteNumber(position.y) &&
    isFiniteNumber(position.z) &&
    isFiniteNumber(rotationY) &&
    isFiniteNumber(scale.x) &&
    isFiniteNumber(scale.y) &&
    isFiniteNumber(scale.z) &&
    scale.x > 0 &&
    scale.y > 0 &&
    scale.z > 0
  );
}

function placementAabb(placement: Placement): Aabb | null {
  const meta: PartMeta | undefined = KIT[placement.partId];
  if (meta === undefined || !isValidTransform(placement)) return null;
  const [sin, cos] = exactSinCos(placement.rotationY);
  const local = meta.localBounds;
  const xs = [local.min.x * placement.scale.x, local.max.x * placement.scale.x];
  const ys = [local.min.y * placement.scale.y, local.max.y * placement.scale.y];
  const zs = [local.min.z * placement.scale.z, local.max.z * placement.scale.z];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const lx of xs) {
    for (const ly of ys) {
      for (const lz of zs) {
        const wx = placement.position.x + lx * cos + lz * sin;
        const wy = placement.position.y + ly;
        const wz = placement.position.z - lx * sin + lz * cos;
        minX = Math.min(minX, wx);
        minY = Math.min(minY, wy);
        minZ = Math.min(minZ, wz);
        maxX = Math.max(maxX, wx);
        maxY = Math.max(maxY, wy);
        maxZ = Math.max(maxZ, wz);
      }
    }
  }
  return { min: vec3(minX, minY, minZ), max: vec3(maxX, maxY, maxZ) };
}

function aabbWithin(inner: Aabb, outer: Aabb, tolerance: number): boolean {
  return (
    inner.min.x >= outer.min.x - tolerance &&
    inner.min.y >= outer.min.y - tolerance &&
    inner.min.z >= outer.min.z - tolerance &&
    inner.max.x <= outer.max.x + tolerance &&
    inner.max.y <= outer.max.y + tolerance &&
    inner.max.z <= outer.max.z + tolerance
  );
}

function derivedCreaseLengthM(spec: FacadeSpec): number {
  let crease = spec.mainLineLengthM;
  for (let index = 1; index < spec.sections.length; index += 1) {
    const previous = spec.sections[index - 1];
    const current = spec.sections[index];
    if (previous === undefined || current === undefined) continue;
    crease += Math.abs(current.declaredProtrusionM - previous.declaredProtrusionM);
  }
  return crease;
}

export function validateSouthSpec(spec: FacadeSpec, rows: readonly WindowRow[]): readonly Issue[] {
  const issues: Issue[] = [];
  const fail = (path: string, message: string): void => {
    issues.push({ severity: 'error', code: 'spec', path, message });
  };

  if (spec.id !== 'south') {
    fail('id', `expected facade id 'south', received '${String(spec.id)}'`);
  }
  if (!isFiniteNumber(spec.mainLineLengthM) || spec.mainLineLengthM <= 0) {
    fail('mainLineLengthM', 'mainLineLengthM must be a finite positive number');
  }
  if (!isFiniteNumber(spec.creaseLineLengthM) || spec.creaseLineLengthM <= 0) {
    fail('creaseLineLengthM', 'creaseLineLengthM must be a finite positive number');
  }

  const sections: readonly FacadeSection[] = Array.isArray(spec.sections) ? spec.sections : [];
  if (!Array.isArray(spec.sections)) {
    fail('sections', 'sections must be an array');
  } else if (sections.length !== EXPECTED_SECTION_KINDS.length) {
    fail(
      'sections',
      `expected ${EXPECTED_SECTION_KINDS.length} sections, received ${sections.length}`,
    );
  }

  const seenSectionIds = new Set<string>();
  let allAxesValid = sections.length === EXPECTED_SECTION_KINDS.length;
  for (const [index, section] of sections.entries()) {
    const path = `sections[${index}]`;
    const expectedKind: SectionKind | undefined = EXPECTED_SECTION_KINDS[index];
    if (expectedKind !== undefined && section.kind !== expectedKind) {
      fail(`${path}.kind`, `expected kind '${expectedKind}', received '${String(section.kind)}'`);
    }
    if (typeof section.id !== 'string' || section.id.length === 0 || section.id.includes('/')) {
      fail(`${path}.id`, 'section id must be a non-empty string without "/"');
    } else if (seenSectionIds.has(section.id)) {
      fail(`${path}.id`, `duplicate section id '${section.id}'`);
    } else {
      seenSectionIds.add(section.id);
    }
    if (!isPositiveInteger(section.declaredAxes)) {
      allAxesValid = false;
      fail(`${path}.declaredAxes`, 'declaredAxes must be a positive integer');
    } else {
      const minAxes: number | undefined = MIN_AXES_BY_KIND[section.kind];
      if (minAxes !== undefined && section.declaredAxes < minAxes) {
        fail(
          `${path}.declaredAxes`,
          `kind '${section.kind}' needs at least ${minAxes} axes for its column rhythm`,
        );
      }
    }
    if (!isFiniteNumber(section.declaredProtrusionM) || section.declaredProtrusionM < 0) {
      fail(`${path}.declaredProtrusionM`, 'declaredProtrusionM must be a finite number >= 0');
    }
  }
  for (let index = 1; index < sections.length; index += 1) {
    const previous = sections[index - 1];
    const current = sections[index];
    if (previous === undefined || current === undefined) continue;
    if (
      isFiniteNumber(previous.declaredProtrusionM) &&
      isFiniteNumber(current.declaredProtrusionM) &&
      Math.abs(previous.declaredProtrusionM - current.declaredProtrusionM) <
        RULES.minProtrusionStepM
    ) {
      fail(
        `sections[${index}].declaredProtrusionM`,
        'adjacent sections must step in plan so the wall path has a return at every boundary',
      );
    }
  }

  const rowList: readonly WindowRow[] = Array.isArray(rows) ? rows : [];
  if (!Array.isArray(rows)) {
    fail('rows', 'rows must be an array');
  } else if (rowList.length !== WINDOW_ROW_IDS.length) {
    fail('rows', `expected ${WINDOW_ROW_IDS.length} window rows, received ${rowList.length}`);
  }
  const seenRowIds = new Set<WindowRowId>();
  for (const [index, row] of rowList.entries()) {
    const path = `rows[${index}]`;
    if (!WINDOW_ROW_IDS.includes(row.id)) {
      fail(`${path}.id`, `unknown window row id '${String(row.id)}'`);
    } else if (seenRowIds.has(row.id)) {
      fail(`${path}.id`, `duplicate window row id '${row.id}'`);
    } else {
      seenRowIds.add(row.id);
      if (row.tier !== RULES.rowTier[row.id]) {
        fail(`${path}.tier`, `row '${row.id}' must belong to tier '${RULES.rowTier[row.id]}'`);
      }
    }
    if (!WINDOW_MODULES.includes(row.module)) {
      fail(`${path}.module`, `unknown window module '${String(row.module)}'`);
    }
    if (!isFiniteNumber(row.declaredHeadHeightM) || row.declaredHeadHeightM <= 0) {
      fail(`${path}.declaredHeadHeightM`, 'declaredHeadHeightM must be a finite positive number');
    }
  }
  for (const rowId of WINDOW_ROW_IDS) {
    if (!seenRowIds.has(rowId)) fail('rows', `missing window row '${rowId}'`);
  }

  if (allAxesValid && isFiniteNumber(spec.mainLineLengthM)) {
    const totalAxes = sections.reduce((sum, section) => sum + section.declaredAxes, 0);
    const nominalLength = totalAxes * RULES.nominalPitchM;
    if (Math.abs(nominalLength - spec.mainLineLengthM) > RULES.pitchClosureToleranceM) {
      fail(
        'mainLineLengthM',
        `${totalAxes} axes at the nominal ${RULES.nominalPitchM} m pitch span ${nominalLength} m, ` +
          `more than ${RULES.pitchClosureToleranceM} m away from ${spec.mainLineLengthM} m`,
      );
    }
  }

  if (issues.length === 0) {
    const derived = derivedCreaseLengthM(spec);
    if (Math.abs(derived - spec.creaseLineLengthM) > RULES.creaseToleranceM) {
      issues.push({
        severity: 'warning',
        code: 'crease',
        path: 'creaseLineLengthM',
        message: `derived crease length ${derived} m differs from declared ${spec.creaseLineLengthM} m`,
      });
    }
  }

  return issues;
}

function buildFrame(spec: FacadeSpec): Frame {
  const totalAxes = spec.sections.reduce((sum, section) => sum + section.declaredAxes, 0);
  const pitchM = spec.mainLineLengthM / totalAxes;
  const halfLengthM = spec.mainLineLengthM / 2;
  const layouts: SectionLayout[] = [];
  let prefixAxes = 0;
  for (const [index, section] of spec.sections.entries()) {
    layouts.push({
      section,
      index,
      prefixAxes,
      startX: -halfLengthM + prefixAxes * pitchM,
      endX: -halfLengthM + (prefixAxes + section.declaredAxes) * pitchM,
      frontZ: RULES.wallLineZ + section.declaredProtrusionM,
    });
    prefixAxes += section.declaredAxes;
  }
  return { halfLengthM, pitchM, layouts };
}

function gapX(frame: Frame, layout: SectionLayout, gap: number): number {
  return -frame.halfLengthM + (layout.prefixAxes + gap) * frame.pitchM;
}

function axisX(frame: Frame, layout: SectionLayout, axisIndex: number): number {
  return -frame.halfLengthM + (layout.prefixAxes + axisIndex + 0.5) * frame.pitchM;
}

function portalArchForAxis(axisIndex: number): 0 | 1 | 2 | undefined {
  for (const entry of RULES.portal.arches) {
    if (entry.axes[0] === axisIndex || entry.axes[1] === axisIndex) return entry.arch;
  }
  return undefined;
}

function expandAxes(frame: Frame, rows: readonly WindowRow[]): readonly Axis[] {
  const moduleForRow = (rowId: WindowRowId): WindowModule => {
    const row = rows.find((candidate) => candidate.id === rowId);
    if (row === undefined) throw new Error(`row '${rowId}' missing after validation`);
    return row.module;
  };
  const archRows = RULES.portal.archRows as readonly WindowRowId[];
  const axes: Axis[] = [];
  for (const layout of frame.layouts) {
    for (let index = 0; index < layout.section.declaredAxes; index += 1) {
      const arch = layout.section.kind === 'centralPortal' ? portalArchForAxis(index) : undefined;
      const cells: Cell[] = WINDOW_ROW_IDS.map((rowId) => {
        if (arch !== undefined && archRows.includes(rowId)) {
          return { kind: 'portalVoid', rowId, arch };
        }
        return { kind: 'window', rowId, module: moduleForRow(rowId) };
      });
      axes.push({
        id: `${layout.section.id}/axis/${index}`,
        sectionId: layout.section.id,
        index,
        x: axisX(frame, layout, index),
        frontZ: layout.frontZ,
        cells,
      });
    }
  }
  return axes;
}

class PlacementEmitter {
  private readonly counters = new Map<string, number>();
  readonly placements: Placement[] = [];

  emit(
    prefix: string,
    rule: string,
    partId: PartId,
    position: Vec3,
    rotationY: number,
    scale: Vec3 = UNIT_SCALE,
  ): void {
    const key = `${prefix}/${rule}`;
    const index = this.counters.get(key) ?? 0;
    this.counters.set(key, index + 1);
    this.placements.push({ id: `${key}/${index}`, partId, position, rotationY, scale });
  }

  emitAlong(
    prefix: string,
    rule: string,
    partId: PartId,
    a: Point2,
    b: Point2,
    normal: Point2,
    trimA: number,
    trimB: number,
    baseY: number,
  ): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const ux = dx / length;
    const uz = dz / length;
    const startX = a.x + ux * trimA;
    const startZ = a.z + uz * trimA;
    const endX = b.x - ux * trimB;
    const endZ = b.z - uz * trimB;
    const trimmedLength = length - trimA - trimB;
    const local = KIT[partId].localBounds;
    const localWidth = local.max.x - local.min.x;
    this.emit(
      prefix,
      rule,
      partId,
      vec3((startX + endX) / 2, baseY, (startZ + endZ) / 2),
      Math.atan2(normal.x, normal.z),
      vec3(trimmedLength / localWidth, 1, 1),
    );
  }
}

function emitWindows(emitter: PlacementEmitter, frame: Frame, axes: readonly Axis[]): void {
  const layoutBySection = new Map(frame.layouts.map((layout) => [layout.section.id, layout]));
  const lastIndex = frame.layouts.length - 1;
  for (const axis of axes) {
    const layout = layoutBySection.get(axis.sectionId);
    if (layout === undefined) throw new Error(`axis '${axis.id}' has no section layout`);
    const sectionClass = sectionClassOfLayoutIndex(layout.index);
    // The east-half mirror (emitOrnaments' convention): the alternation
    // ordinal runs west→east on the west half and is mirrored on the east
    // half, so the pattern is symmetric about the portal axis.
    const eastHalf = layout.index > lastIndex - layout.index;
    for (const cell of axis.cells) {
      if (cell.kind !== 'window') continue;
      const sillY = RULES.rowSillY[cell.rowId];
      const ordinal = eastHalf ? layout.section.declaredAxes - 1 - axis.index : axis.index;
      emitter.emit(
        axis.sectionId,
        'surround',
        surroundPartFor(cell.rowId, cell.module, sectionClass, ordinal),
        vec3(axis.x, sillY, axis.frontZ + RULES.surroundOffsetZ),
        0,
      );
      const openingWidth = OPENING_WIDTH_BY_MODULE[cell.module];
      const sillScaleX =
        (openingWidth + SILL_JAMB_OVERHANG_M) /
        (KIT.sill.localBounds.max.x - KIT.sill.localBounds.min.x);
      emitter.emit(
        axis.sectionId,
        'sill',
        'sill',
        vec3(axis.x, sillY - RULES.sillDropM, axis.frontZ),
        0,
        vec3(sillScaleX, 1, 1),
      );
    }
  }
}

function emitPiers(emitter: PlacementEmitter, frame: Frame): void {
  for (const layout of frame.layouts) {
    const rule = PIER_RULES[layout.section.kind];
    if (rule === null) continue;
    for (const tier of ORDER_TIERS) {
      for (const gap of rule.gaps) {
        emitter.emit(
          layout.section.id,
          'pier',
          rule.partId,
          vec3(gapX(frame, layout, gap), RULES.tierBaseY[tier], layout.frontZ),
          0,
        );
      }
    }
  }
}

function emitPortal(emitter: PlacementEmitter, frame: Frame): void {
  for (const layout of frame.layouts) {
    if (layout.section.kind !== 'centralPortal') continue;
    const sectionId = layout.section.id;
    for (const gap of RULES.portal.giantGaps) {
      emitter.emit(
        sectionId,
        'giant-column',
        'giant-column',
        vec3(gapX(frame, layout, gap), RULES.portal.giantBaseY, layout.frontZ),
        0,
      );
    }
    for (const entry of RULES.portal.arches) {
      const centreX =
        (axisX(frame, layout, entry.axes[0]) + axisX(frame, layout, entry.axes[1])) / 2;
      emitter.emit(
        sectionId,
        'portal-arch',
        'portal-arch',
        vec3(centreX, RULES.portal.archBaseY, layout.frontZ),
        0,
      );
    }
    for (const entry of RULES.portal.arches) {
      const centreX =
        (axisX(frame, layout, entry.axes[0]) + axisX(frame, layout, entry.axes[1])) / 2;
      emitter.emit(
        sectionId,
        'ground-arch',
        'ground-arch',
        vec3(centreX, RULES.portal.archBaseY, layout.frontZ + RULES.portal.groundArchOffsetZ),
        0,
      );
    }
    const sectionCentreX = (layout.startX + layout.endX) / 2;
    emitter.emit(
      sectionId,
      'pediment',
      'pediment',
      vec3(sectionCentreX, RULES.portal.pedimentBaseY, layout.frontZ),
      0,
    );
    const pedimentDepth = KIT.pediment.localBounds.max.z;
    emitter.emit(
      sectionId,
      'cartouche',
      'cartouche',
      vec3(
        sectionCentreX,
        RULES.portal.cartoucheBaseY,
        layout.frontZ + pedimentDepth + RULES.portal.cartoucheOffsetZ,
      ),
      0,
    );
  }
}

function tracePath(frame: Frame): readonly Segment[] {
  const segments: Segment[] = [];
  for (const [index, layout] of frame.layouts.entries()) {
    segments.push({
      kind: 'front',
      layout,
      a: { x: layout.startX, z: layout.frontZ },
      b: { x: layout.endX, z: layout.frontZ },
      normal: { x: 0, z: 1 },
    });
    const next = frame.layouts[index + 1];
    if (next === undefined || next.frontZ === layout.frontZ) continue;
    const westProtrudes = layout.frontZ > next.frontZ;
    segments.push({
      kind: 'return',
      layout: westProtrudes ? layout : next,
      a: { x: layout.endX, z: layout.frontZ },
      b: { x: layout.endX, z: next.frontZ },
      normal: westProtrudes ? { x: 1, z: 0 } : { x: -1, z: 0 },
    });
  }
  return segments;
}

function segmentPrefix(spec: FacadeSpec, segment: Segment): string {
  return segment.kind === 'front' ? segment.layout.section.id : spec.id;
}

function emitBands(
  emitter: PlacementEmitter,
  spec: FacadeSpec,
  segments: readonly Segment[],
): void {
  const junctionDepth = KIT['order-junction'].localBounds.max.z;
  for (const band of RULES.bands) {
    const present = segments.map(
      (segment) =>
        band.acrossPortal ||
        !(segment.kind === 'front' && segment.layout.section.kind === 'centralPortal'),
    );
    const junctionAtVertex = (vertex: number): boolean =>
      vertex >= 0 &&
      vertex < segments.length - 1 &&
      present[vertex] === true &&
      present[vertex + 1] === true;

    for (const [index, segment] of segments.entries()) {
      if (present[index] !== true) continue;
      emitter.emitAlong(
        segmentPrefix(spec, segment),
        `cornice-${band.name}`,
        'cornice-run',
        segment.a,
        segment.b,
        segment.normal,
        junctionAtVertex(index - 1) ? RULES.bandJunctionTrimM : 0,
        junctionAtVertex(index) ? RULES.bandJunctionTrimM : 0,
        band.baseY,
      );
    }
    for (let vertex = 0; vertex < segments.length - 1; vertex += 1) {
      if (!junctionAtVertex(vertex)) continue;
      const segment = segments[vertex];
      if (segment === undefined) continue;
      emitter.emit(
        spec.id,
        `junction-${band.name}`,
        'order-junction',
        vec3(segment.b.x, band.baseY, segment.b.z - junctionDepth / 2),
        0,
      );
    }
  }
}

function emitParapet(
  emitter: PlacementEmitter,
  spec: FacadeSpec,
  frame: Frame,
  segments: readonly Segment[],
): void {
  const vertexCount = segments.length - 1;
  const junctionAtVertex = (vertex: number): boolean => vertex > 0 && vertex < vertexCount - 1;
  const trim = RULES.parapet.trimM;

  for (const [index, segment] of segments.entries()) {
    if (segment.kind === 'front') {
      const layout = segment.layout;
      if (layout.section.kind === 'centralPortal') continue;
      const lastAxis = layout.section.declaredAxes - 1;
      for (let axis = 0; axis <= lastAxis; axis += 1) {
        emitter.emitAlong(
          layout.section.id,
          'balustrade',
          'balustrade',
          { x: gapX(frame, layout, axis), z: layout.frontZ },
          { x: gapX(frame, layout, axis + 1), z: layout.frontZ },
          segment.normal,
          axis === 0 && junctionAtVertex(index - 1) ? trim : 0,
          axis === lastAxis && junctionAtVertex(index) ? trim : 0,
          RULES.parapet.baseY,
        );
      }
      continue;
    }
    const panels = RULES.parapet.panelsPerReturn;
    for (let panel = 0; panel < panels; panel += 1) {
      const t0 = panel / panels;
      const t1 = (panel + 1) / panels;
      emitter.emitAlong(
        spec.id,
        'balustrade',
        'balustrade',
        {
          x: segment.a.x + (segment.b.x - segment.a.x) * t0,
          z: segment.a.z + (segment.b.z - segment.a.z) * t0,
        },
        {
          x: segment.a.x + (segment.b.x - segment.a.x) * t1,
          z: segment.a.z + (segment.b.z - segment.a.z) * t1,
        },
        segment.normal,
        panel === 0 && junctionAtVertex(index - 1) ? trim : 0,
        panel === panels - 1 && junctionAtVertex(index) ? trim : 0,
        RULES.parapet.baseY,
      );
    }
  }

  const junctionScale = RULES.parapet.junctionScale;
  const junctionDepth = KIT['order-junction'].localBounds.max.z * junctionScale.z;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    if (!junctionAtVertex(vertex)) continue;
    const segment = segments[vertex];
    if (segment === undefined) continue;
    emitter.emit(
      spec.id,
      'parapet-junction',
      'order-junction',
      vec3(segment.b.x, RULES.parapet.baseY, segment.b.z - junctionDepth / 2),
      0,
      vec3(junctionScale.x, junctionScale.y, junctionScale.z),
    );
  }
}

function emitOrnaments(emitter: PlacementEmitter, frame: Frame): void {
  const balustradeDepth = KIT.balustrade.localBounds.max.z;
  const lastIndex = frame.layouts.length - 1;
  for (const layout of frame.layouts) {
    const slots: number = RULES.ornaments.slotsPerSection[layout.index] ?? 0;
    if (slots <= 0) continue;
    const isEastHalf = layout.index > lastIndex - layout.index;
    const step = (layout.endX - layout.startX) / slots;
    for (let slot = 0; slot < slots; slot += 1) {
      const ordinal = isEastHalf ? slots - 1 - slot : slot;
      const partId: PartId = ordinal % 2 === 0 ? 'statue' : 'vase';
      const depth = KIT[partId].localBounds.max.z;
      emitter.emit(
        layout.section.id,
        'ornament',
        partId,
        vec3(
          layout.startX + (slot + 0.5) * step,
          RULES.ornaments.baseY,
          layout.frontZ + (balustradeDepth - depth) / 2,
        ),
        0,
      );
    }
  }
}

function groupByPart(placements: readonly Placement[]): PlacementsByPart {
  const groups: Partial<Record<PartId, Placement[]>> = {};
  for (const partId of PART_IDS) groups[partId] = [];
  for (const placement of placements) {
    const group = groups[placement.partId];
    if (group !== undefined) group.push(placement);
  }
  return groups as PlacementsByPart;
}

function computeCounts(axes: readonly Axis[], byPart: PlacementsByPart): Counts {
  const countByPart: Partial<Record<PartId, number>> = {};
  let instances = 0;
  let activeParts = 0;
  let triangles = 0;
  let columnShafts = 0;
  for (const partId of PART_IDS) {
    const count = byPart[partId].length;
    countByPart[partId] = count;
    instances += count;
    if (count > 0) activeParts += 1;
    triangles += count * KIT[partId].triangleCeiling;
    columnShafts += count * KIT[partId].shaftCount;
  }
  let windowSlots = 0;
  let windows = 0;
  let portalVoidCells = 0;
  for (const axis of axes) {
    for (const cell of axis.cells) {
      windowSlots += 1;
      if (cell.kind === 'window') windows += 1;
      else portalVoidCells += 1;
    }
  }
  return {
    axes: axes.length,
    windowSlots,
    windows,
    portalVoidCells,
    columnShafts,
    instances,
    activeParts,
    triangles,
    byPart: countByPart as Record<PartId, number>,
  };
}

export function checkBounds(placements: readonly Placement[], allowed: Aabb): BoundsCheck {
  const outsideIds: string[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let measured = 0;
  for (const placement of placements) {
    const aabb = placementAabb(placement);
    if (aabb === null) {
      outsideIds.push(placement.id);
      continue;
    }
    measured += 1;
    minX = Math.min(minX, aabb.min.x);
    minY = Math.min(minY, aabb.min.y);
    minZ = Math.min(minZ, aabb.min.z);
    maxX = Math.max(maxX, aabb.max.x);
    maxY = Math.max(maxY, aabb.max.y);
    maxZ = Math.max(maxZ, aabb.max.z);
    if (!aabbWithin(aabb, allowed, BOUNDS_TOLERANCE_M)) outsideIds.push(placement.id);
  }
  const actual: Aabb =
    measured === 0
      ? { min: vec3(0, 0, 0), max: vec3(0, 0, 0) }
      : { min: vec3(minX, minY, minZ), max: vec3(maxX, maxY, maxZ) };
  return { ok: outsideIds.length === 0, actual, outsideIds };
}

export function solveSouthFacade(spec: FacadeSpec, rows: readonly WindowRow[]): SolveResult {
  const validation = validateSouthSpec(spec, rows);
  if (validation.some((entry) => entry.severity === 'error')) {
    return { ok: false, issues: validation };
  }
  const warnings = validation.filter((entry) => entry.severity === 'warning');

  const frame = buildFrame(spec);
  const axes = expandAxes(frame, rows);
  const emitter = new PlacementEmitter();
  emitWindows(emitter, frame, axes);
  emitPiers(emitter, frame);
  emitPortal(emitter, frame);
  const segments = tracePath(frame);
  emitBands(emitter, spec, segments);
  emitParapet(emitter, spec, frame, segments);
  emitOrnaments(emitter, frame);

  const placements: readonly Placement[] = emitter.placements;
  const boundsCheck = checkBounds(placements, SOUTH_ENVELOPE);
  if (!boundsCheck.ok) {
    const boundsIssues: Issue[] = boundsCheck.outsideIds.map((id) => {
      const placement = placements.find((candidate) => candidate.id === id);
      const invalid = placement === undefined || !isValidTransform(placement);
      return {
        severity: 'error',
        code: 'bounds',
        path: `placements/${id}`,
        message:
          placement === undefined
            ? 'placement is missing from the solved set'
            : invalid
              ? 'placement has a nonfinite transform or nonpositive scale'
              : 'placement geometry lies outside the south facade envelope',
      };
    });
    return { ok: false, issues: [...warnings, ...boundsIssues] };
  }

  const byPart = groupByPart(placements);
  const counts = computeCounts(axes, byPart);
  return {
    ok: true,
    value: {
      id: 'south',
      pitchM: frame.pitchM,
      derivedCreaseM: derivedCreaseLengthM(spec),
      axes,
      placements,
      byPart,
      counts,
      bounds: boundsCheck.actual,
    },
    warnings,
  };
}

export function projectBudget(solved: SolvedFacade, allowance: SceneAllowance): BudgetProjection {
  const passes = 1 + allowance.shadowPasses;
  const facadeDrawCalls = solved.counts.activeParts * passes;
  const frustumTriangles =
    solved.counts.triangles + allowance.massingTriangles + allowance.skyTriangles;
  return {
    facadeDrawCalls,
    frameDrawCalls: facadeDrawCalls + allowance.otherFrameDrawCalls,
    frustumTriangles,
    submittedTriangleCeiling: frustumTriangles * passes,
    jsGzipBytes: allowance.measuredJsGzipBytes,
  };
}
