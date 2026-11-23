// /notes view-model — src/ui/notes-view.ts
// Pure: turns the frozen facade spec plus a fresh solve into a JSON-serializable page
// model. No three.js, no DOM, no clocks, no randomness — node tests build the page as-is.
// The DOM binding beside notes.html renders this model and adds no numbers of its own.
// Round-24b: every user-facing string comes from the i18n dictionary (design-i18n-notes.md
// §1.3, the round-24 extraction) — the EN column IS the pre-refactor tree, byte for byte
// (tests/notes-model-fixture.test.ts pins it). Data keys stay raw tokens (R8): section
// kinds, arrangement tokens and the prose notes flow from the spec untouched, the
// per-language display maps render them (the EN map values equal the spec bytes, so EN
// output is unchanged). The spec-audit Issue messages stay EN (developer diagnostics, the
// literals-fence allowlist).
import {
  DECLARED_BAY_PITCH_M,
  DECOR_SYSTEM,
  type FacadeId,
  type FacadeSpec,
  ORDER_SYSTEM,
  SHELL,
  SIBLING_FACADES,
  SOUTH_FACADE,
  type SourceKey,
  WINDOW_ROWS,
  type WindowRow,
} from '../content/facade-spec';
import {
  LICENSE_LINES,
  type LicenseLine,
  type ProvenanceTree,
  REPO_DOC_URLS,
  resolveProvenance,
  SPEC_PROVENANCE,
} from '../content/provenance';
import { type Key, t } from '../i18n';
import { format, formatByteUnit, formatInt, formatNumber } from '../i18n/format';
import type { Lang } from '../i18n/locale';
import {
  type BudgetProjection,
  type Issue,
  KIT,
  PART_IDS,
  projectBudget,
  type SceneAllowance,
  type SolvedFacade,
  type SolveResult,
  solveSouthFacade,
} from '../procedural/facade-solver';
// ---------------------------------------------------------------------------
// Model types
// ---------------------------------------------------------------------------
/**
 * Provenance as it travels with a displayed number. Sourced/declared rows cite a leaf of
 * the provenance register by id; derived rows carry the arithmetic that produced them.
 */
export type RowProvenance =
  | Readonly<{ kind: 'sourced'; id: string; keys: readonly SourceKey[] }>
  | Readonly<{ kind: 'declared'; id: string; license: LicenseLine; licenseTitle: string }>
  | Readonly<{ kind: 'derived'; formula: string }>;
export type NumberRow = Readonly<{
  id: string;
  label: string;
  /** null = not available yet (e.g. gzip size before CI has measured it). */
  value: number | null;
  unit: string;
  /** Preformatted value text; never a fake number when value is null. */
  display: string;
  /** Muted suffix beside the value (§3.4: the margin, the pending-measurement note). */
  note?: string;
  provenance: RowProvenance;
}>;
export type TableRow = Readonly<{
  id: string;
  cells: readonly string[];
  /** One entry per registered or derived number the row displays. */
  provenance?: readonly RowProvenance[];
}>;
export type NotesLink = Readonly<{ href: string; label: string }>;
export type CalloutLevel = 'note' | 'warning' | 'error';
/** §3.1: the legend item — the chip carries the kind word, the text the rest of the row. */
export type LegendItem = Readonly<{
  provenance: 'sourced' | 'declared' | 'derived';
  text: string;
}>;
export type NotesBlock =
  | Readonly<{ kind: 'heading'; level: 1 | 2 | 3; text: string; id?: string }>
  | Readonly<{ kind: 'paragraph'; text: string }>
  | Readonly<{ kind: 'legend'; items: readonly LegendItem[] }>
  | Readonly<{ kind: 'list'; items: readonly string[] }>
  | Readonly<{ kind: 'numbers'; id: string; rows: readonly NumberRow[] }>
  | Readonly<{
      kind: 'table';
      id: string;
      caption?: string;
      columns: readonly string[];
      rows: readonly TableRow[];
    }>
  | Readonly<{ kind: 'callout'; id: string; level: CalloutLevel; text: string }>
  | Readonly<{ kind: 'links'; items: readonly NotesLink[] }>;
export type NotesModel = Readonly<{ title: string; blocks: readonly NotesBlock[] }>;
export type NotesInput = Readonly<{
  spec?: FacadeSpec;
  rows?: readonly WindowRow[];
  provenance?: ProvenanceTree;
  allowance?: SceneAllowance;
  /** Display language for numbers, units and data maps. The LABELS come from the active
   * dictionary (t()) — the caller activates the language before building (the design's
   * law: the view-model's signature grows a lang argument; §1.3). Defaults to 'en' so the
   * node tests keep their EN snapshots. */
  lang?: Lang;
}>;
export type NotesResult =
  | Readonly<{ ok: true; model: NotesModel; warnings: readonly Issue[] }>
  | Readonly<{ ok: false; issues: readonly Issue[] }>;
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const NOTES_TITLE = t('notes.title');
/** Contract ceilings enforced by CI (AGENTS.md). */
export const BUDGET_CEILINGS = {
  frameDrawCalls: 250,
  frustumTriangles: 1_000_000,
  jsGzipBytes: 350_000,
} as const;
/**
 * Default scene allowance shown on the page: Round 7 massing (12 boxes + ground plane =
 * 146 triangles), sky dome, one shadow pass, 16 other draw calls. Declared working
 * estimates registered under 'budget-allowance'; gzip is measured by CI, null until then.
 */
export const NOTES_ALLOWANCE: SceneAllowance = {
  shadowPasses: 1,
  otherFrameDrawCalls: 16,
  massingTriangles: 146,
  skyTriangles: 4096,
  measuredJsGzipBytes: null,
};
/** ±0.3 m around the declared pitch is ±1 axis per section over five sections. */
export const PITCH_TOLERANCE_M = 0.3;
export const PENDING_MEASUREMENT = t('notes.pending');
/** The facade characters' display keys (D7: the one-word RU labels arrive with the RU map). */
const FACADE_CHARACTER: Readonly<Record<FacadeId, Key>> = {
  south: 'data.characterSouth',
  north: 'data.characterNorth',
  west: 'data.characterWest',
  east: 'data.characterEast',
};
// Data display maps (the D-law: tokens stay raw in the data and the DOM, the view maps them
// per language; the EN column values equal the spec bytes, so EN output is unchanged).
const KIND_DISPLAY: Readonly<Record<string, Key>> = {
  cornerRisalit: 'data.kindCornerRisalit',
  stretch: 'data.kindStretch',
  centralPortal: 'data.kindCentralPortal',
};
const ARRANGEMENT_DISPLAY: Readonly<Record<string, Key>> = {
  'bunch-at-corners': 'data.arrangementBunchAtCorners',
  'pair-at-portals': 'data.arrangementPairAtPortals',
  'pair-piers-between-window-groups': 'data.arrangementPairPiers',
};
const SOUTH_NOTE_DISPLAY: Readonly<Record<string, Key>> = {
  'sw-risalit': 'data.southNoteSwCorner',
  'west-stretch': 'data.southNoteWestStretch',
  'central-portal': 'data.southNotePortal',
  'east-stretch': 'data.southNoteEastStretch',
  'se-risalit': 'data.southNoteSeCorner',
};
function mappedToken(map: Readonly<Record<string, Key>>, token: string): string {
  const key = map[token];
  if (key === undefined) {
    throw new Error(`unmapped display token '${token}'`);
  }
  return t(key);
}
// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const prose = (...parts: readonly string[]): string =>
  parts.filter((part) => part !== '').join(' ');
const derived = (formula: string): RowProvenance => ({ kind: 'derived', formula });
// Data-unit display map (the D-law: tokens stay raw in data, the render maps per language);
// byte units ride format.ts's language map (D3).
const UNIT_DISPLAY: Readonly<Record<string, Partial<Record<Lang, string>>>> = { m: { ru: 'м' } };
const unitLabel = (unit: string, lang: Lang): string =>
  unit === 'B' ? formatByteUnit('B', lang) : (UNIT_DISPLAY[unit]?.[lang] ?? unit);
// Inline metre cells ("3.45 m"); RU joins with a no-break space (§1.4) and maps the unit.
// The RU tail is a single-quoted escape constant — the literals fence's backtick matcher is
// escape-blind and would pair the templates' backticks across the ternary otherwise.
const RU_METRE_TAIL = '\u00A0м';
const metreCell = (value: number, lang: Lang): string =>
  lang === 'ru' ? formatNumber(value, lang) + RU_METRE_TAIL : `${formatNumber(value)} m`;
function derivedRow(
  ctx: Ctx,
  id: string,
  label: string,
  value: number,
  unit: string,
  formula: string,
): NumberRow {
  return {
    id,
    label,
    value,
    unit: unitLabel(unit, ctx.lang),
    display: formatNumber(value, ctx.lang),
    provenance: derived(formula),
  };
}
// ---------------------------------------------------------------------------
// Provenance resolver, audit, guarded solver calls
// ---------------------------------------------------------------------------
type Resolver = Readonly<{
  cite: (id: string) => RowProvenance;
  missing: () => readonly string[];
}>;
function createResolver(tree: ProvenanceTree): Resolver {
  const missing: string[] = [];
  const cite = (id: string): RowProvenance => {
    const entry = resolveProvenance(tree, id);
    if (entry === undefined) {
      missing.push(id);
      return { kind: 'derived', formula: format(t('notes.failUnregistered'), { id }) };
    }
    if (entry.kind === 'sourced') {
      return { kind: 'sourced', id, keys: entry.keys };
    }
    return {
      kind: 'declared',
      id,
      license: entry.license,
      licenseTitle: LICENSE_LINES[entry.license],
    };
  };
  return { cite, missing: () => missing };
}
function specError(path: string, message: string): Issue {
  return { severity: 'error', code: 'spec', path, message };
}
function thrown(path: string, error: unknown): Issue {
  return specError(path, error instanceof Error ? error.message : String(error));
}
/** View-level sanity gate: the page only renders a south spec whose arithmetic closes. */
function auditSpec(spec: FacadeSpec, rows: readonly WindowRow[]): readonly Issue[] {
  const issues: Issue[] = [];
  if (spec.id !== 'south') {
    issues.push(specError('id', `the /notes page renders the south facade; got '${spec.id}'`));
  }
  if (rows.length === 0) {
    issues.push(specError('rows', 'at least one window row is required'));
  }
  const seen = new Set<string>();
  for (const section of spec.sections) {
    if (seen.has(section.id)) {
      issues.push(specError(`sections.${section.id}`, 'duplicate section id'));
    }
    seen.add(section.id);
  }
  const axes = spec.sections.reduce((sum, section) => sum + section.declaredAxes, 0);
  if (axes <= 0) {
    issues.push(specError('sections', 'declared axes must total more than zero'));
    return issues;
  }
  const pitch = spec.mainLineLengthM / axes;
  if (Math.abs(pitch - DECLARED_BAY_PITCH_M) > PITCH_TOLERANCE_M) {
    issues.push(
      specError(
        'sections',
        prose(
          `${axes} declared axes over ${formatNumber(spec.mainLineLengthM)} m give a bay`,
          `pitch of ${pitch.toFixed(2)} m; the register declares ~${DECLARED_BAY_PITCH_M} m`,
          `(±${PITCH_TOLERANCE_M} m, i.e. ±1 axis per section).`,
        ),
      ),
    );
  }
  return issues;
}
function runSolve(spec: FacadeSpec, rows: readonly WindowRow[]): SolveResult {
  try {
    return solveSouthFacade(spec, rows);
  } catch (error) {
    return { ok: false, issues: [thrown('solve', error)] };
  }
}
type ProjectionResult =
  | Readonly<{ ok: true; value: BudgetProjection }>
  | Readonly<{ ok: false; issues: readonly Issue[] }>;
function runProjection(solved: SolvedFacade, allowance: SceneAllowance): ProjectionResult {
  try {
    return { ok: true, value: projectBudget(solved, allowance) };
  } catch (error) {
    return { ok: false, issues: [thrown('projectBudget', error)] };
  }
}
// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
type Ctx = Readonly<{
  spec: FacadeSpec;
  rows: readonly WindowRow[];
  solved: SolvedFacade;
  warnings: readonly Issue[];
  projection: BudgetProjection;
  allowance: SceneAllowance;
  lang: Lang;
  cite: (id: string) => RowProvenance;
  cited: (id: string, label: string, value: number, unit: string) => NumberRow;
}>;
function introBlocks(): readonly NotesBlock[] {
  // §3.1: the three-kind list renders as the chip legend — each item opens with its chip.
  const legendItem = (provenance: LegendItem['provenance'], key: Key): LegendItem => ({
    provenance,
    text: t(key),
  });
  return [
    { kind: 'heading', level: 1, text: t('notes.title') },
    { kind: 'paragraph', text: t('notes.intro') },
    {
      kind: 'legend',
      items: [
        legendItem('sourced', 'notes.kindSourced'),
        legendItem('declared', 'notes.kindDeclared'),
        legendItem('derived', 'notes.kindDerived'),
      ],
    },
  ];
}
/** §3.3: the links block is a footer section under its own heading, last on the page. */
function sourcesBlocks(): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: t('notes.sourcesHeading'), id: 'sources' },
    {
      kind: 'links',
      items: [
        { href: REPO_DOC_URLS.attributions, label: 'ATTRIBUTIONS.md' },
        { href: REPO_DOC_URLS.artisticLicense, label: 'docs/artistic-license.md' },
        { href: REPO_DOC_URLS.facadeGrammar, label: 'docs/design-facade-grammar.md' },
        { href: REPO_DOC_URLS.decisions, label: 'docs/decisions.md' },
        { href: REPO_DOC_URLS.facadeSpec, label: 'src/content/facade-spec.ts' },
      ],
    },
  ];
}
function shellBlocks({ cited }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: t('notes.shellHeading'), id: 'shell' },
    { kind: 'paragraph', text: t('notes.shellIntro') },
    {
      kind: 'numbers',
      id: 'shell',
      rows: [
        cited(
          'shell.northFacadeLengthM',
          t('notes.shellNorthLength'),
          SHELL.northFacadeLengthM,
          'm',
        ),
        cited('shell.westFacadeLengthM', t('notes.shellWestLength'), SHELL.westFacadeLengthM, 'm'),
        cited(
          'shell.windowsTotal.conservative',
          t('notes.shellWindowsConservative'),
          SHELL.windowsTotal.conservative,
          '',
        ),
        cited(
          'shell.windowsTotal.generous',
          t('notes.shellWindowsGenerous'),
          SHELL.windowsTotal.generous,
          '',
        ),
        cited(
          'shell.roomsTotal.conservative',
          t('notes.shellRoomsConservative'),
          SHELL.roomsTotal.conservative,
          '',
        ),
        cited(
          'shell.roomsTotal.generous',
          t('notes.shellRoomsGenerous'),
          SHELL.roomsTotal.generous,
          '',
        ),
        cited('shell.staircasesTotal', t('notes.shellStaircases'), SHELL.staircasesTotal, ''),
        cited('shell.corniceHeightM', t('notes.shellCorniceHeight'), SHELL.corniceHeightM, 'm'),
        cited('shell.totalHeightM', t('notes.shellTotalHeight'), SHELL.totalHeightM, 'm'),
        cited(
          'shell.rooflineStatuaryHeightM',
          t('notes.shellPrincipalFacade'),
          SHELL.rooflineStatuaryHeightM,
          'm',
        ),
        cited('shell.cornersTotal', t('notes.shellCorners'), SHELL.cornersTotal, ''),
        cited('shell.roofStatues', t('notes.shellRoofStatuary'), SHELL.roofStatues, ''),
      ],
    },
  ];
}
function systemBlocks({ rows, cite, cited, lang }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: t('notes.decorHeading'), id: 'decor' },
    { kind: 'paragraph', text: t('notes.decorIntro') },
    {
      kind: 'numbers',
      id: 'decor',
      rows: [
        cited(
          'decor.windowWidthModules',
          t('notes.decorWidthModules'),
          DECOR_SYSTEM.windowWidthModules,
          '',
        ),
        cited('decor.windowTypes', t('notes.decorWindowTypes'), DECOR_SYSTEM.windowTypes, ''),
        cited('decor.surroundTypes', t('notes.decorSurroundTypes'), DECOR_SYSTEM.surroundTypes, ''),
        cited(
          'decor.sculpturalDecorTypes',
          t('notes.decorSculpturalTypes'),
          DECOR_SYSTEM.sculpturalDecorTypes,
          '',
        ),
        cited(
          'decor.capitalVarieties',
          t('notes.decorCapitalVarieties'),
          DECOR_SYSTEM.capitalVarieties,
          '',
        ),
        cited(
          'decor.cartoucheKinds',
          t('notes.decorCartoucheKinds'),
          DECOR_SYSTEM.cartoucheKinds,
          '',
        ),
      ],
    },
    {
      kind: 'table',
      id: 'order',
      caption: t('notes.orderCaption'),
      columns: [t('notes.orderColFact'), t('notes.orderColValue')],
      rows: [
        {
          id: 'order.tiers',
          cells: [t('notes.orderColonnadeTiers'), String(ORDER_SYSTEM.tiers)],
          provenance: [cite('order.tiers')],
        },
        {
          id: 'order.columnArrangement',
          cells: [
            t('notes.orderArrangement'),
            ORDER_SYSTEM.columnArrangement
              .map((token) => mappedToken(ARRANGEMENT_DISPLAY, token))
              .join(' · '),
          ],
          provenance: [cite('order.columnArrangement')],
        },
        {
          id: 'order.capitalFamily',
          cells: [t('notes.orderCapitalFamily'), t('data.capitalFamily')],
          provenance: [cite('order.capitalFamily')],
        },
        {
          id: 'order.wallColor',
          cells: [t('notes.orderWallColour'), t('data.wallColour')],
        },
      ],
    },
    {
      kind: 'table',
      id: 'rows',
      caption: t('notes.windowRowsCaption'),
      columns: [
        t('notes.windowRowsColRow'),
        t('notes.windowRowsColTier'),
        t('notes.windowRowsColModule'),
        t('notes.windowRowsColHeadHeight'),
      ],
      rows: rows.map((row) => ({
        id: `rows.${row.id}`,
        cells: [row.id, row.tier, row.module, metreCell(row.declaredHeadHeightM, lang)],
        provenance: [cite(`rows.${row.id}.module`), cite(`rows.${row.id}.declaredHeadHeightM`)],
      })),
    },
  ];
}
function creaseCallout({ spec, solved, warnings, lang }: Ctx): NotesBlock {
  const creaseWarnings = warnings.filter((warning) => warning.code === 'crease');
  // The rendered warning is a display map over the solved numbers (the solver's own
  // message string stays a console diagnostic); other codes keep their message text.
  const rendered = (warning: (typeof creaseWarnings)[number]): string =>
    warning.code === 'crease'
      ? format(t('notes.creaseWarning'), {
          derived: formatNumber(solved.derivedCreaseM, lang),
          declared: formatNumber(spec.creaseLineLengthM, lang),
        })
      : warning.message;
  const solverSays = creaseWarnings
    .map((warning) => format(t('notes.solverWarning'), { message: rendered(warning) }))
    .join(' ');
  return {
    kind: 'callout',
    id: 'south.crease',
    level: creaseWarnings.length > 0 ? 'warning' : 'note',
    text: prose(
      format(t('notes.creaseCallout'), {
        specCrease: formatNumber(spec.creaseLineLengthM, lang),
        derivedCrease: formatNumber(solved.derivedCreaseM, lang),
      }),
      solverSays,
    ),
  };
}
function southBlocks(ctx: Ctx): readonly NotesBlock[] {
  const { spec, rows, solved, cite, cited } = ctx;
  const { counts } = solved;
  return [
    { kind: 'heading', level: 2, text: t('notes.southHeading'), id: 'south' },
    {
      kind: 'numbers',
      id: 'south.lines',
      rows: [
        cited('south.mainLineLengthM', t('notes.southMainLine'), spec.mainLineLengthM, 'm'),
        cited('south.creaseLineLengthM', t('notes.southCreaseLine'), spec.creaseLineLengthM, 'm'),
        cited('south.declaredBayPitchM', t('notes.southDeclaredPitch'), DECLARED_BAY_PITCH_M, 'm'),
        derivedRow(
          ctx,
          'south.derivedPitchM',
          t('notes.southDerivedPitch'),
          solved.pitchM,
          'm',
          format(t('notes.formulaPitch'), {
            length: formatNumber(spec.mainLineLengthM, ctx.lang),
            axes: String(counts.axes),
          }),
        ),
        derivedRow(
          ctx,
          'south.derivedCreaseM',
          t('notes.southDerivedCrease'),
          solved.derivedCreaseM,
          'm',
          t('notes.formulaCreaseLine'),
        ),
      ],
    },
    {
      kind: 'table',
      id: 'south.sections',
      caption: t('notes.sectionsCaption'),
      columns: [
        t('notes.sectionsColSection'),
        t('notes.sectionsColKind'),
        t('notes.sectionsColAxes'),
        t('notes.sectionsColProtrusion'),
        t('notes.sectionsColNote'),
      ],
      rows: spec.sections.map((section) => ({
        id: `south.sections.${section.id}`,
        cells: [
          section.id,
          mappedToken(KIND_DISPLAY, section.kind),
          `${section.declaredAxes} (±1)`,
          metreCell(section.declaredProtrusionM, ctx.lang),
          mappedToken(SOUTH_NOTE_DISPLAY, section.id),
        ],
        provenance: [
          cite(`south.sections.${section.id}.declaredAxes`),
          cite(`south.sections.${section.id}.declaredProtrusionM`),
        ],
      })),
    },
    {
      kind: 'numbers',
      id: 'south.counts',
      rows: [
        derivedRow(
          ctx,
          'south.counts.axes',
          t('notes.countWindowAxes'),
          counts.axes,
          '',
          t('notes.formulaWindowAxes'),
        ),
        derivedRow(
          ctx,
          'south.counts.windowSlots',
          t('notes.countWindowSlots'),
          counts.windowSlots,
          '',
          format(t('notes.formulaSlots'), { axes: String(counts.axes), rows: String(rows.length) }),
        ),
        derivedRow(
          ctx,
          'south.counts.windows',
          t('notes.countWindows'),
          counts.windows,
          '',
          t('notes.formulaWindows'),
        ),
        derivedRow(
          ctx,
          'south.counts.portalVoidCells',
          t('notes.countPortalVoidCells'),
          counts.portalVoidCells,
          '',
          t('notes.formulaVoidCells'),
        ),
        derivedRow(
          ctx,
          'south.counts.columnShafts',
          t('notes.countColumnShafts'),
          counts.columnShafts,
          '',
          t('notes.formulaShafts'),
        ),
      ],
    },
    creaseCallout(ctx),
  ];
}
function kitBlocks(ctx: Ctx): readonly NotesBlock[] {
  const { solved } = ctx;
  const placed = PART_IDS.flatMap((part) => {
    const instances = solved.counts.byPart[part];
    if (instances <= 0) {
      return [];
    }
    const ceiling = KIT[part].triangleCeiling;
    return [{ part, instances, ceiling, total: instances * ceiling }];
  });
  const totalInstances = placed.reduce((sum, row) => sum + row.instances, 0);
  const totalTriangles = placed.reduce((sum, row) => sum + row.total, 0);
  return [
    { kind: 'heading', level: 2, text: t('notes.kitHeading'), id: 'kit' },
    { kind: 'paragraph', text: t('notes.kitIntro') },
    {
      kind: 'table',
      id: 'kit.parts',
      columns: [
        t('notes.kitColPart'),
        t('notes.kitColInstances'),
        t('notes.kitColCeilingPerInstance'),
        t('notes.kitColPartTotal'),
      ],
      rows: [
        ...placed.map((row) => ({
          id: `kit.${row.part}`,
          cells: [row.part, formatInt(row.instances), formatInt(row.ceiling), formatInt(row.total)],
          provenance: [derived(t('notes.formulaPartTotal'))],
        })),
        {
          id: 'kit.total',
          // §3.4: the three kit totals fold into the footer row — the label carries the
          // active-parts count, the columns name the rest; each cell keeps its formula chip.
          cells: [
            format(t('notes.kitTotalRow'), { activeParts: String(placed.length) }),
            formatInt(totalInstances),
            '—',
            formatInt(totalTriangles),
          ],
          provenance: [
            derived(t('notes.formulaActiveParts')),
            derived(t('notes.formulaInstances')),
            derived(t('notes.formulaKitCeiling')),
          ],
        },
      ],
    },
  ];
}
function budgetCallout(): NotesBlock {
  // §3.4: the projected numbers live on the budget rows as muted margin suffixes; the
  // callout keeps the three ceilings and the policy sentence.
  return {
    kind: 'callout',
    id: 'budget.contract',
    level: 'note',
    text: format(t('notes.budgetCallout'), {
      frameDraws: formatInt(BUDGET_CEILINGS.frameDrawCalls),
      frustumTriangles: formatInt(BUDGET_CEILINGS.frustumTriangles),
      gzipBytes: formatInt(BUDGET_CEILINGS.jsGzipBytes),
    }),
  };
}
function budgetBlocks(ctx: Ctx): readonly NotesBlock[] {
  const { solved, projection, allowance, cited } = ctx;
  const gzip = projection.jsGzipBytes;
  // §3.4: the margin is a muted suffix on the row; an unmeasured gzip renders as an em-dash
  // value with the pending note muted beside it — never a fake number.
  const marginNote = (ceiling: number, value: number): string =>
    format(t('notes.marginSuffix'), { margin: formatInt(ceiling - value) });
  const gzipRow: NumberRow = {
    id: 'budget.jsGzipBytes',
    label: t('notes.budgetJsGzip'),
    value: gzip,
    unit: 'B',
    display: gzip === null ? '—' : formatInt(gzip),
    note: gzip === null ? PENDING_MEASUREMENT : marginNote(BUDGET_CEILINGS.jsGzipBytes, gzip),
    provenance: derived(t('notes.formulaGzip')),
  };
  const allowanceRows: readonly { id: string; label: string; value: number }[] = [
    {
      id: 'budget.allowance.shadowPasses',
      label: t('notes.allowanceShadowPasses'),
      value: allowance.shadowPasses,
    },
    {
      id: 'budget.allowance.otherFrameDrawCalls',
      label: t('notes.allowanceOtherDraws'),
      value: allowance.otherFrameDrawCalls,
    },
    {
      id: 'budget.allowance.massingTriangles',
      label: t('notes.allowanceMassingTriangles'),
      value: allowance.massingTriangles,
    },
    {
      id: 'budget.allowance.skyTriangles',
      label: t('notes.allowanceSkyTriangles'),
      value: allowance.skyTriangles,
    },
  ];
  return [
    { kind: 'heading', level: 2, text: t('notes.budgetHeading'), id: 'budget' },
    {
      kind: 'numbers',
      id: 'budget.projection',
      rows: [
        derivedRow(
          ctx,
          'budget.facadeDrawCalls',
          t('notes.budgetFacadeDraws'),
          projection.facadeDrawCalls,
          '',
          t('notes.formulaFacadeDraws'),
        ),
        {
          ...derivedRow(
            ctx,
            'budget.frameDrawCalls',
            t('notes.budgetFrameDraws'),
            projection.frameDrawCalls,
            '',
            format(t('notes.formulaFrameDraws'), {
              otherDraws: String(allowance.otherFrameDrawCalls),
            }),
          ),
          note: marginNote(BUDGET_CEILINGS.frameDrawCalls, projection.frameDrawCalls),
        },
        {
          ...derivedRow(
            ctx,
            'budget.frustumTriangles',
            t('notes.budgetFrustumTriangles'),
            projection.frustumTriangles,
            '',
            format(t('notes.formulaFrustum'), {
              kit: formatInt(solved.counts.triangles),
              massing: formatInt(allowance.massingTriangles),
              sky: formatInt(allowance.skyTriangles),
            }),
          ),
          note: marginNote(BUDGET_CEILINGS.frustumTriangles, projection.frustumTriangles),
        },
        derivedRow(
          ctx,
          'budget.submittedTriangleCeiling',
          t('notes.budgetSubmittedCeiling'),
          projection.submittedTriangleCeiling,
          '',
          t('notes.formulaSubmitted'),
        ),
        gzipRow,
      ],
    },
    budgetCallout(),
    { kind: 'paragraph', text: t('notes.allowanceIntro') },
    {
      kind: 'table',
      id: 'budget.allowance',
      caption: t('notes.allowanceCaption'),
      columns: [t('notes.allowanceColAllowance'), t('notes.allowanceColValue')],
      rows: allowanceRows.map(({ id, label, value }) => {
        const row = cited(id, label, value, '');
        return { id: row.id, cells: [row.label, row.display], provenance: [row.provenance] };
      }),
    },
  ];
}
function siblingBlocks({ cite }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: t('notes.siblingsHeading'), id: 'siblings' },
    { kind: 'paragraph', text: t('notes.siblingsIntro') },
    {
      kind: 'table',
      id: 'siblings',
      columns: [
        t('notes.siblingsColFacade'),
        t('notes.siblingsColSections'),
        t('notes.siblingsColAxes'),
        t('notes.siblingsColCharacter'),
      ],
      rows: SIBLING_FACADES.map((facade) => {
        const axes = facade.sections.reduce((sum, section) => sum + section.declaredAxes, 0);
        return {
          id: `siblings.${facade.id}`,
          cells: [
            facade.id,
            facade.sections
              .map((section) =>
                format(t('notes.siblingsSectionCell'), {
                  id: section.id,
                  kind: mappedToken(KIND_DISPLAY, section.kind),
                  axes: String(section.declaredAxes),
                }),
              )
              .join(' · '),
            format(t('notes.siblingsAxesCell'), { axes: String(axes) }),
            t(FACADE_CHARACTER[facade.id]),
          ],
          provenance: [cite(`siblings.${facade.id}.declaredAxes`)],
        };
      }),
    },
  ];
}
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function buildSouthNotesModel(input: NotesInput = {}): NotesResult {
  const spec = input.spec ?? SOUTH_FACADE;
  const rows = input.rows ?? WINDOW_ROWS;
  const tree = input.provenance ?? SPEC_PROVENANCE;
  const allowance = input.allowance ?? NOTES_ALLOWANCE;
  const audit = auditSpec(spec, rows);
  const solve = runSolve(spec, rows);
  if (!solve.ok) {
    return { ok: false, issues: [...audit, ...solve.issues] };
  }
  if (audit.length > 0) {
    return { ok: false, issues: audit };
  }
  const projected = runProjection(solve.value, allowance);
  if (!projected.ok) {
    return projected;
  }
  const resolver = createResolver(tree);
  const lang: Lang = input.lang ?? 'en';
  const cited = (id: string, label: string, value: number, unit: string): NumberRow => ({
    id,
    label,
    value,
    unit: unitLabel(unit, lang),
    display: formatNumber(value, lang),
    provenance: resolver.cite(id),
  });
  const ctx: Ctx = {
    spec,
    rows,
    solved: solve.value,
    warnings: solve.warnings,
    projection: projected.value,
    allowance,
    lang,
    cite: resolver.cite,
    cited,
  };
  const blocks: readonly NotesBlock[] = [
    ...introBlocks(),
    ...shellBlocks(ctx),
    ...systemBlocks(ctx),
    ...southBlocks(ctx),
    ...kitBlocks(ctx),
    ...budgetBlocks(ctx),
    ...siblingBlocks(ctx),
    ...sourcesBlocks(),
  ];
  const missing = resolver.missing();
  if (missing.length > 0) {
    return {
      ok: false,
      issues: missing.map((id) =>
        specError(`provenance.${id}`, format(t('notes.failNoProvenance'), { id })),
      ),
    };
  }
  return { ok: true, model: { title: t('notes.title'), blocks }, warnings: solve.warnings };
}
/** Every provenance object carried by the model, in page order. */
export function walkProvenance(model: NotesModel): readonly RowProvenance[] {
  const out: RowProvenance[] = [];
  for (const block of model.blocks) {
    if (block.kind === 'numbers') {
      for (const row of block.rows) {
        out.push(row.provenance);
      }
    } else if (block.kind === 'table') {
      for (const row of block.rows) {
        if (row.provenance !== undefined) {
          out.push(...row.provenance);
        }
      }
    }
  }
  return out;
}
