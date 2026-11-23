// Immutable Phase 1 facade specification — src/content/facade-spec.ts
// Pure data: no three.js imports, no clock reads, no browser globals;
// importable from node tests as-is (same rules as sky-time.ts).
//
// Two kinds of numbers live here, and the type system keeps them apart:
//  - SOURCED: carries an attribution key into ATTRIBUTIONS.md ("No line, no use").
//  - DECLARED: a photo-derived working target, registered in
//    docs/artistic-license.md; checked against measured elevation drawings
//    during Phase 1 and corrected here + there if the record differs.
// Declared values are the grammar's starting data, not survey results.

/** Attribution keys — every sourced number must point at ATTRIBUTIONS.md. */
export type SourceKey =
  | 'wiki-ru'
  | 'wiki-en'
  | 'visit-petersburg'
  | 'peterburg-center'
  | 'studiomatrx'
  | 'bravoplanner';

/** Which facade of the quadrangle. Phase 1 ships `south`; the rest reuse the kit. */
export type FacadeId = 'south' | 'north' | 'west' | 'east';

/** The two vertical halves of the elevation, each spanning two window rows. */
export type OrderTier = 'lower' | 'upper';

/** The three sourced window-width modules (Alekseeva via wiki-ru). */
export type WindowModule = 'small' | 'medium' | 'large';

/**
 * One window row of the elevation, bottom to top.
 * Sourced shape: four rows in two tiers; the piano nobile (row 2) is the
 * tallest (wiki-en); ru-wiki reads the same wall as "three almost equal
 * storeys" — the declared model keeps four rows and two tiers.
 */
export type WindowRowId = 'row1' | 'row2' | 'row3' | 'row4';

export type WindowRow = Readonly<{
  id: WindowRowId;
  tier: OrderTier;
  /** Sourced module of this row's openings (Alekseeva via wiki-ru). */
  module: WindowModule;
  /** Declared rough head heights, metres — proportions only, not measured. */
  declaredHeadHeightM: number;
}>;

/**
 * One articulated run of the facade plane: a risalit (projecting) or a
 * stretch (flat). Bay axes are counted along the facade line; a "pair pier"
 * axis carries a pair of engaged columns instead of a window (photos:
 * puchki/bunches at corners, pairs at risalits — visit-petersburg, wiki-ru).
 */
export type SectionKind = 'cornerRisalit' | 'stretch' | 'centralPortal';

export type FacadeSection = Readonly<{
  id: string;
  kind: SectionKind;
  /**
   * Declared window-axis count (photo-derived, ±1 per section).
   * The central portal's 8 axes include the three arch bays.
   */
  declaredAxes: number;
  /** Declared projection from the main facade plane, metres (0 for stretches). */
  declaredProtrusionM: number;
  /** Sourced/declared role note — feeds the /notes facade viewer verbatim. */
  note: string;
}>;

export type FacadeSpec = Readonly<{
  id: FacadeId;
  /** SOURCED main-plane length along the facade line, metres. */
  mainLineLengthM: number;
  /** SOURCED length including risalit creases (wiki-en "principal facade"). */
  creaseLineLengthM: number;
  sections: readonly FacadeSection[];
}>;

// ---------------------------------------------------------------------------
// SOURCED globals
// ---------------------------------------------------------------------------

/** Global shell numbers. Every field names its source key. */
export const SHELL = {
  /** Quadrangle outer dimensions (wiki-ru, studiomatrx, bravoplanner). */
  northFacadeLengthM: 210,
  westFacadeLengthM: 175,
  /** wiki-ru/RIA numbers vs wiki-en/Hermitage numbers — both recorded. */
  windowsTotal: { conservative: 1476, generous: 1945 },
  roomsTotal: { conservative: 1084, generous: 1500 },
  staircasesTotal: 117,
  /** To the cornice (studiomatrx); total with roof band (wiki-ru). */
  corniceHeightM: 22,
  totalHeightM: 23.5,
  /** wiki-en reads the principal facade with roofline statuary at 30 m. */
  rooflineStatuaryHeightM: 30,
  /** Corner count including every raspreponka and projection (wiki-ru). */
  cornersTotal: 29,
  /** Roof statuary (peterburg-center); alternate counts run ~150+. */
  roofStatues: 176,
} as const;

/**
 * The sourced window/decor system (Alekseeva via wiki-ru): openings come in
 * three width modules; 12 window types carry 22 surround types, 32 sculptural
 * decor types, five capital varieties, four cartouche kinds. The grammar
 * reproduces the MODULE system and the paired/bunched column rhythm. The
 * surround class is modelled as a law (sq-facade, 2026-11-23): the window
 * type is the (row × section-class) cell — all twelve populate on the south
 * front (the portal's six arch axes void rows 1–2; its flanking axes keep
 * them as windows) — and the head variant per cell is HEAD_LAW in
 * facade-solver (the parity alternation on the stretches, the richer risalit
 * heads, the socle course). The 32 sculptural decor types and the five
 * capital varieties remain catalogued, not one-for-one modelled.
 */
export const DECOR_SYSTEM = {
  windowWidthModules: 3,
  windowTypes: 12,
  surroundTypes: 22,
  sculpturalDecorTypes: 32,
  capitalVarieties: 5,
  cartoucheKinds: 4,
} as const;

/**
 * Sourced order/colour facts the kit must respect:
 *  - two-tier engaged colonnade on all facades (visit-petersburg, wiki-ru);
 *  - columns bunch at corners and pairs mark the portals (wiki-ru,
 *    visit-petersburg); the building corner itself stays open (wiki-ru);
 *  - Corinthian-family capitals (russpass summary; five varieties exist —
 *    DECOR_SYSTEM), modelled as one stylized capital archetype
 *    (docs/artistic-license.md);
 *  - walls in pale green/ochre range, order and dressings white — the
 *    historical Rastrelli scheme recorded by wiki-ru ("walls sandy with a
 *    fine yellow tint, ornaments white lime").
 */
export const ORDER_SYSTEM = {
  tiers: 2,
  columnArrangement: [
    'bunch-at-corners',
    'pair-at-portals',
    'pair-piers-between-window-groups',
  ] as const,
  capitalFamily: 'corinthian-composite (stylized, single archetype)',
  wallColorNote:
    'pale green walls, white order and dressings — owner palette decision (decisions.md)',
} as const;

// ---------------------------------------------------------------------------
// Window rows (declared proportions)
// ---------------------------------------------------------------------------

export const WINDOW_ROWS: readonly WindowRow[] = [
  { id: 'row1', tier: 'lower', module: 'small', declaredHeadHeightM: 1.8 },
  { id: 'row2', tier: 'lower', module: 'large', declaredHeadHeightM: 3.6 },
  { id: 'row3', tier: 'upper', module: 'large', declaredHeadHeightM: 3.2 },
  { id: 'row4', tier: 'upper', module: 'small', declaredHeadHeightM: 2.2 },
];

// ---------------------------------------------------------------------------
// South facade — the Phase 1 deliverable
// ---------------------------------------------------------------------------

/**
 * South facade (Palace Square), west → east. Sourced structure: three
 * risalits — the central one pierced by three entrance arches opening the
 * parade gateway into the courtyard (wiki-ru; Strelna precedent), the corner
 * risalits carrying their own portals (photos, visit-petersburg note on
 * paired-column accents). Declared axis counts are photo-derived working
 * targets (docs/artistic-license.md), symmetric about the portal.
 */
export const SOUTH_FACADE: FacadeSpec = {
  id: 'south',
  mainLineLengthM: 210,
  creaseLineLengthM: 215,
  sections: [
    {
      id: 'sw-risalit',
      kind: 'cornerRisalit',
      declaredAxes: 7,
      declaredProtrusionM: 6,
      note: 'SW corner mass: its own arched portal with giant columns and balcony, corner column bunches; protrudes toward the square.',
    },
    {
      id: 'west-stretch',
      kind: 'stretch',
      declaredAxes: 20,
      declaredProtrusionM: 0,
      note: 'Flat run: window axes with paired-column piers every ~4th bay.',
    },
    {
      id: 'central-portal',
      kind: 'centralPortal',
      declaredAxes: 8,
      declaredProtrusionM: 6,
      note: 'Parade gateway: three entrance arches (courtyard entrance), giant columns, pediment with clock and eagle cartouche — the Strelna device.',
    },
    {
      id: 'east-stretch',
      kind: 'stretch',
      declaredAxes: 20,
      declaredProtrusionM: 0,
      note: 'Mirror of the west stretch.',
    },
    {
      id: 'se-risalit',
      kind: 'cornerRisalit',
      declaredAxes: 7,
      declaredProtrusionM: 6,
      note: 'SE corner mass: portal with giant columns and cartouche; palace chapel dome rises behind this end.',
    },
  ],
} as const;

/**
 * Sibling facades share the kit; Phase 1 does not ship them. Sourced
 * one-line characters (visit-petersburg): north — continuous colonnade to
 * the Neva; west — country-palace composition toward the Admiralty; east —
 * massive flanks around the service court. Declared axis counts keep the
 * plan arithmetic closed for tests.
 */
export const SIBLING_FACADES: readonly FacadeSpec[] = [
  {
    id: 'north',
    mainLineLengthM: 210,
    creaseLineLengthM: 210,
    sections: [
      {
        id: 'nw-risalit',
        kind: 'cornerRisalit',
        declaredAxes: 7,
        declaredProtrusionM: 6,
        note: 'Neva-side corner mass (declared).',
      },
      {
        id: 'north-stretch-w',
        kind: 'stretch',
        declaredAxes: 20,
        declaredProtrusionM: 0,
        note: 'Continuous colonnade character (visit-petersburg).',
      },
      {
        id: 'north-central',
        kind: 'centralPortal',
        declaredAxes: 8,
        declaredProtrusionM: 6,
        note: 'Central pavilion (declared; arched portals to the courtyard).',
      },
      {
        id: 'north-stretch-e',
        kind: 'stretch',
        declaredAxes: 20,
        declaredProtrusionM: 0,
        note: 'Mirror run (declared).',
      },
      {
        id: 'ne-risalit',
        kind: 'cornerRisalit',
        declaredAxes: 7,
        declaredProtrusionM: 6,
        note: 'Neva-side corner mass (declared).',
      },
    ],
  },
  {
    id: 'west',
    mainLineLengthM: 175,
    creaseLineLengthM: 175,
    sections: [
      {
        id: 'west-stretch-n',
        kind: 'stretch',
        declaredAxes: 22,
        declaredProtrusionM: 0,
        note: 'Toward the Admiralty; country-palace character (visit-petersburg).',
      },
      {
        id: 'west-central',
        kind: 'centralPortal',
        declaredAxes: 8,
        declaredProtrusionM: 5,
        note: 'Central pavilion with the Own Garden court (declared).',
      },
      {
        id: 'west-stretch-s',
        kind: 'stretch',
        declaredAxes: 22,
        declaredProtrusionM: 0,
        note: 'Mirror run (declared).',
      },
    ],
  },
  {
    id: 'east',
    mainLineLengthM: 175,
    creaseLineLengthM: 175,
    sections: [
      {
        id: 'east-stretch-n',
        kind: 'stretch',
        declaredAxes: 22,
        declaredProtrusionM: 0,
        note: 'Toward Millionnaya Street; massive flanks (visit-petersburg).',
      },
      {
        id: 'east-central',
        kind: 'centralPortal',
        declaredAxes: 8,
        declaredProtrusionM: 5,
        note: 'Central pavilion (declared).',
      },
      {
        id: 'east-stretch-s',
        kind: 'stretch',
        declaredAxes: 22,
        declaredProtrusionM: 0,
        note: 'Mirror run (declared).',
      },
    ],
  },
] as const;

export const FACADE_SPEC: Readonly<{ south: FacadeSpec; siblings: readonly FacadeSpec[] }> = {
  south: SOUTH_FACADE,
  siblings: SIBLING_FACADES,
};

/** Declared working bay pitch, metres — 210 m over ~62 axes (photo-derived). */
export const DECLARED_BAY_PITCH_M = 3.4;

/** South-facade window estimate implied by the declared axes (4 rows each). */
export const DECLARED_SOUTH_WINDOW_ESTIMATE =
  SOUTH_FACADE.sections.reduce((sum, s) => sum + s.declaredAxes, 0) * WINDOW_ROWS.length;
