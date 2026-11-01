// src/i18n/en.ts
/**
 * English dictionary. Implements the adopted i18n/notes design: "Strings live in a typed
 * dictionary with identical key sets"; the English column is the current committed tree,
 * byte for byte (round-24a extraction, verified 2026-10-20). Templates carry {name} tokens
 * resolved by format() in ./format.ts; the RU column (a later round) re-orders tokens freely.
 */

import type { Dictionary } from './keys';

export const en = {
  'chrome.titleMain': 'Winter Palace in the browser',
  'chrome.descriptionMain':
    'A stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg), lit by the ' +
    'real Petersburg sky.',
  'chrome.wordmark': 'Winter Palace',
  'chrome.notesLink': 'How it’s built →',
  // The travel hint (design §9, ruled in the r23 freeze) and the language toggle (§1.2):
  // the toggle shows the TARGET language in its own script; the accessible name is the
  // target language's name.
  // The travel hint (design-walkthrough-ux §2, D1: the verb is the gesture) and the door label
  // verbs (§2: «Enter · <room>» / «Back out · <room>», composed in src/ui/edge-prompt.ts).
  'chrome.travelHint': 'Scroll to walk · drag to look around',
  'chrome.doorEnter': 'Enter',
  'chrome.doorBack': 'Back out',
  'chrome.toggleLabel': 'RU',
  'chrome.toggleAria': 'Русский',
  'chrome.scrubLabel': 'Petersburg time, ±24 hours around the scene time',
  'chrome.scrubHelp':
    'Arrow keys step a minute; PageUp and PageDown step an hour; Home and End pick the ' +
    'window bounds; Escape cancels; N returns to now.',
  'chrome.sceneHelp':
    'Scroll, drag, or use the arrow keys to move along the rail from stop to stop.',
  'chrome.canvasLabel': 'Winter Palace walkthrough',
  'chrome.descriptionNotes':
    'How the south facade of the Winter Palace is generated: the frozen spec, sourced and ' +
    'declared numbers, the kit of parts and the budget projection.',
  'chrome.backLink': '← Palace Square',
  'chrome.noscriptNotes': 'Numbers need JavaScript: the page re-runs the facade solver at load.',
  'chrome.seasonLabel': 'Season of the scene',
  'chrome.seasonHelp':
    'Choosing a season moves the scene date and keeps the time of day; “Now” returns to the ' +
    'current moment.',
  'chrome.seasonNow': 'Now',
  'chrome.seasonWinter': 'Winter',
  'chrome.seasonSpring': 'Spring',
  'chrome.seasonSummer': 'Summer',
  'chrome.seasonAutumn': 'Autumn',
  'chrome.touchRailLabel': 'Tour navigation',
  'chrome.touchRailBack': 'Back',
  'chrome.touchRailForward': 'Forward',
  'chrome.travelHintTouch': 'Tap Back or Forward to move.',
  'chrome.sceneUnsupported': 'This tour requires a browser with WebGL2 support.',
  'chrome.sceneInterrupted': 'The scene is unavailable. Reload the page.',
  'chrome.sceneReload': 'Reload',
  'index.open': 'Rooms',
  'index.title': 'Rooms',
  'index.current': 'Current room',

  'caption.s0': 'the facade and the hour',
  'caption.s1': 'the arch opens',
  'caption.g0': 'dark; the square behind',
  'caption.gj': 'The turn east: pilaster after pilaster, forty metres to the far door.',
  'caption.g1': 'compression',
  'caption.g2': 'the door (airlock)',
  'caption.m0': 'The threshold: the long view south, to the portraits of the heroes of 1812.',
  'caption.m1': 'The west wall — a block of portraits in gilt frames.',
  'caption.m2': 'The lantern — the vault and the glazing bars above the gallery.',
  'caption.m3': 'The monarchs — the end wall, the large portraits above the small.',
  'caption.m4': 'The doors are closed; beyond them — St George\u2019s Hall.',
  'caption.j0': 'looking up into light',
  'caption.j1': 'the flight',
  'caption.j1b':
    'The upper flight\u2019s sconce shows across the well: Rastrelli lights the turn in advance.',
  'caption.j2':
    'The landing: the stair divides; the flights meet again beneath the painted ceiling.',
  'caption.j2b':
    'The upper tier of windows: the Neva light enters high and carries the last flight.',
  'caption.j3':
    'Near the top the eastern portal comes square to the eye: the doorway to the state rooms, framed in gilt between columns of grey granite.',
  'caption.j4': 'arrival; the portal (landing airlock)',

  'notes.title': 'How the south facade is built',
  'notes.intro':
    'Every number on this page is produced at load by the same pure solver the app runs over ' +
    'its frozen facade specification (decisions.md, DEC-004). It is not a survey. Three kinds ' +
    'of numbers are kept apart by the type system and labelled here:',
  // §3.1: the three-kind list renders as the chip legend — the chip carries the kind word,
  // the value holds the rest of the sentence (the leading "Sourced —" moved into the chip).
  'notes.kindSourced': 'carries an attribution key into ATTRIBUTIONS.md ("No line, no use").',
  'notes.kindDeclared':
    'a photo-derived working target registered in docs/artistic-license.md; ' +
    'checked against measured elevation drawings during Phase 1 and corrected in both places ' +
    'if the record differs.',
  'notes.kindDerived':
    'solver arithmetic over sourced and declared inputs ' +
    '(docs/design-facade-grammar.md); recomputed on every load, never registered.',

  'notes.shellHeading': 'Shell',
  'notes.shellIntro':
    'Quadrangle numbers as the sources give them. Where two sources disagree both counts are ' +
    'kept, each under its own key.',
  'notes.shellNorthLength': 'North (Neva) facade length',
  'notes.shellWestLength': 'West (Admiralty) facade length',
  'notes.shellWindowsConservative': 'Windows, conservative count',
  'notes.shellWindowsGenerous': 'Windows, generous count',
  'notes.shellRoomsConservative': 'Rooms, conservative count',
  'notes.shellRoomsGenerous': 'Rooms, generous count',
  'notes.shellStaircases': 'Staircases',
  'notes.shellCorniceHeight': 'Height to the cornice',
  'notes.shellTotalHeight': 'Total height with roof band',
  'notes.shellPrincipalFacade': 'Principal facade incl. roofline statuary',
  'notes.shellCorners': 'Corners incl. every projection',
  'notes.shellRoofStatuary': 'Roof statuary figures',

  'notes.decorHeading': 'Window, decor and order system',
  'notes.decorIntro':
    'The sourced catalogue (Alekseeva via wiki-ru) is reproduced as a module system and a ' +
    'column rhythm, not one-for-one: the counts below are catalogued, the kit models a smaller ' +
    'stylized set (artistic-license register, "Window/decor catalogue").',
  'notes.decorWidthModules': 'Window width modules',
  'notes.decorWindowTypes': 'Window types',
  'notes.decorSurroundTypes': 'Surround types',
  'notes.decorSculpturalTypes': 'Sculptural decor types',
  'notes.decorCapitalVarieties': 'Capital varieties',
  'notes.decorCartoucheKinds': 'Cartouche kinds',

  'notes.orderCaption': 'Order system',
  'notes.orderColFact': 'Fact',
  'notes.orderColValue': 'Value',
  'notes.orderColonnadeTiers': 'Engaged colonnade tiers',
  'notes.orderArrangement': 'Column arrangement',
  'notes.orderCapitalFamily': 'Capital family',
  'notes.orderWallColour': 'Wall colour',

  'notes.windowRowsCaption': 'Window rows, bottom to top',
  'notes.windowRowsColRow': 'Row',
  'notes.windowRowsColTier': 'Tier',
  'notes.windowRowsColModule': 'Module',
  'notes.windowRowsColHeadHeight': 'Declared head height',

  'notes.southHeading': 'South elevation — Palace Square, west → east',
  'notes.southMainLine': 'Main facade line',
  'notes.southCreaseLine': 'Crease line incl. risalit creases',
  'notes.southDeclaredPitch': 'Declared working bay pitch',
  'notes.southDerivedPitch': 'Derived bay pitch',
  'notes.southDerivedCrease': 'Derived crease line',

  'notes.sectionsCaption': 'Sections, west → east; notes verbatim from the frozen spec',
  'notes.sectionsColSection': 'Section',
  'notes.sectionsColKind': 'Kind',
  'notes.sectionsColAxes': 'Declared axes',
  'notes.sectionsColProtrusion': 'Declared protrusion',
  'notes.sectionsColNote': 'Note',

  'notes.countWindowAxes': 'Window axes',
  'notes.countWindowSlots': 'Window slots',
  'notes.countWindows': 'Windows',
  'notes.countPortalVoidCells': 'Portal void cells',
  'notes.countColumnShafts': 'Column shafts',

  'notes.creaseCallout':
    'Crease line: the spec carries {specCrease} m (sourced — wiki-en "principal facade", ' +
    'citing Budberg, Great Palaces: The Winter Palace, 1969; the ru tradition reads the same ' +
    'edge as 210 m); the solver derives {derivedCrease} m from the main line and the declared ' +
    'risalit protrusions. The two sourced lengths most likely measure one street edge under ' +
    'different source conventions, not a plan line against a crease line; the declared axis ' +
    'rhythm (7 + 20 + 8 + 20 + 7) and the derived figure have no digitized attestation ' +
    '(literature hunt closed 2026-10-17). Settling it takes measured drawings — РГИА ф. 485, ' +
    'an Albertina scan, or Pilyavsky via НЭБ — so this warning stays live until then, with the ' +
    'spec and the artistic-license register ("Dimension approximations") corrected if the ' +
    'record differs.',
  // The solver's crease warning, rendered: the display-map law — the view formats the key
  // from the solved numbers (the solver's own message string stays a console diagnostic).
  'notes.creaseWarning': 'derived crease length {derived} m differs from declared {declared} m',
  'notes.solverWarning': 'Solver: {message}',

  'notes.kitHeading': 'Instanced kit',
  'notes.kitIntro':
    'Parts the solver placed on the south facade; kit slots with no placements are omitted. ' +
    'Triangle ceilings are per-instance kit maxima, so part totals are ceilings, not measured ' +
    'counts.',
  'notes.kitColPart': 'Part',
  'notes.kitColInstances': 'Instances',
  'notes.kitColCeilingPerInstance': 'Triangle ceiling per instance',
  'notes.kitColPartTotal': 'Part total',
  'notes.kitTotalRow': 'Total — {activeParts} active parts',
  // §3.3: the links block is a footer section under its own heading; §3.3 the open-question
  // callout label; §3.4 the margins live on the budget rows, the callout keeps the ceilings.
  'notes.sourcesHeading': 'Sources and documents',
  'notes.openQuestion': 'Open question',

  'notes.budgetHeading': 'Budget projection',
  'notes.budgetFacadeDraws': 'Facade draw calls',
  'notes.budgetFrameDraws': 'Frame draw calls',
  'notes.budgetFrustumTriangles': 'Frustum triangles',
  'notes.budgetSubmittedCeiling': 'Submitted triangle ceiling',
  'notes.budgetJsGzip': 'JavaScript gzip',
  'notes.budgetCallout':
    'Contract ceilings enforced in CI: ≤ {frameDraws} draw calls per frame, ' +
    '≤ {frustumTriangles} frustum triangles, ≤ {gzipBytes} B JavaScript gzip. ' +
    'An overrun is removed by changing art or level of detail, never the number.',
  // §3.4: the projected numbers moved onto the budget rows as muted margin suffixes; the
  // pending measurement renders as an em-dash value with the note muted beside it.
  'notes.marginSuffix': 'margin {margin}',
  'notes.pending': 'pending CI measurement',

  'notes.allowanceIntro':
    'Scene allowance — declared working estimates of what the rest of the frame costs ' +
    '(Round 7 massing: 12 boxes + ground plane; sky dome; one shadow pass; other draw calls). ' +
    'They are inputs to the projection, not measurements.',
  'notes.allowanceCaption': 'Scene allowance',
  'notes.allowanceColAllowance': 'Allowance',
  'notes.allowanceColValue': 'Value',
  'notes.allowanceShadowPasses': 'Shadow passes',
  'notes.allowanceOtherDraws': 'Other frame draw calls',
  'notes.allowanceMassingTriangles': 'Massing triangles',
  'notes.allowanceSkyTriangles': 'Sky triangles',

  'notes.siblingsHeading': 'Sibling facades — not shipped in Phase 1',
  'notes.siblingsIntro':
    'North, west and east reuse the kit later. Their axis counts are declared only ' +
    '(artistic-license register, "Facade axis counts"), kept so the plan arithmetic closes in ' +
    'tests; main-line lengths are the shell numbers above.',
  'notes.siblingsColFacade': 'Facade',
  'notes.siblingsColSections': 'Sections — kind · declared axes',
  'notes.siblingsColAxes': 'Declared axes',
  'notes.siblingsColCharacter': 'Character',
  'notes.siblingsSectionCell': '{id} ({kind}) {axes}',
  'notes.siblingsAxesCell': '{axes} (±1 per section)',

  'notes.formulaWindowAxes': 'Σ declaredAxes over the five sections',
  'notes.formulaCreaseLine':
    'main line + inner risalit creases from the declared protrusions (solver)',
  'notes.formulaPitch': '{length} m / {axes} axes',
  'notes.formulaSlots': '{axes} axes × {rows} rows',
  'notes.formulaWindows': 'windowSlots − portalVoidCells',
  'notes.formulaVoidCells': 'slots displaced by the entrance and portal arches (solver)',
  'notes.formulaShafts': 'Σ KIT.shaftCount × instances over column parts (solver)',
  'notes.formulaFrustum': 'kit {kit} + massing {massing} + sky {sky}',
  'notes.formulaSubmitted': 'frustumTriangles × (1 + {shadowPasses} shadow pass)',
  'notes.formulaPartTotal': 'counts.byPart × KIT.triangleCeiling',
  'notes.formulaKitCeiling': 'Σ over placed parts',
  'notes.formulaInstances': 'Σ counts.byPart',
  'notes.formulaActiveParts': 'parts with ≥ 1 instance',
  'notes.formulaGzip': 'CI gzip measurement passed through allowance.measuredJsGzipBytes',
  'notes.formulaFacadeDraws': 'projectBudget: instanced draws of the active parts over all passes',
  'notes.formulaFrameDraws': 'facadeDrawCalls + {otherDraws} other draw calls',

  'notes.failUnregistered': 'unregistered: {id}',
  'notes.failNoProvenance': "displayed number '{id}' has no provenance register entry",
  // The binding's chip/title templates (the r24b flag) and the error card — new inventory
  // of the RU round; the EN short labels are the D7-flagged additions (§7.7).
  'notes.chipSourced': 'sourced · {keys}',
  'notes.chipDeclared': 'declared · {licenseTitle}',
  'notes.chipDerived': 'derived',
  // §3.1: the legend's bare kind words (the chip without its provenance payload).
  'notes.chipWordSourced': 'sourced',
  'notes.chipWordDeclared': 'declared',
  'notes.chipWordDerived': 'derived',
  'notes.chipTitleKeys': 'keys: {keys}',
  'notes.chipTitleRegister': 'register line: {licenseTitle}',
  'notes.errorTitle': 'Facade notes unavailable',
  'notes.errorIntro': 'The facade spec does not close. {issues}',

  'data.titleGallery': 'Rastrelli Gallery — the way in',
  'data.title1812': 'Military Gallery of 1812 — through the Armorial Hall',
  'data.titleJordan': 'Jordan Staircase — the ascent',
  'data.titleSquare': 'Palace Square',
  'data.kindCornerRisalit': 'cornerRisalit',
  'data.kindStretch': 'stretch',
  'data.kindCentralPortal': 'centralPortal',
  'data.arrangementBunchAtCorners': 'bunch-at-corners',
  'data.arrangementPairAtPortals': 'pair-at-portals',
  'data.arrangementPairPiers': 'pair-piers-between-window-groups',
  'data.capitalFamily': 'corinthian-composite (stylized, single archetype)',
  'data.wallColour':
    'pale green walls, white order and dressings — owner palette decision (decisions.md)',
  'data.characterSouth':
    'Palace Square front: three risalits, triple-arch gateway (wiki-ru, visit-petersburg).',
  'data.characterNorth': 'Continuous colonnade to the Neva (visit-petersburg).',
  'data.characterWest': 'Country-palace composition toward the Admiralty (visit-petersburg).',
  'data.characterEast': 'Massive flanks around the service court (visit-petersburg).',
  'data.characterShortSouth': 'ceremonial',
  'data.characterShortNorth': 'riverside',
  'data.characterShortWest': 'country',
  'data.characterShortEast': 'service',
  'data.southNoteSwCorner':
    'SW corner mass: its own arched portal with giant columns and balcony, corner column ' +
    'bunches; protrudes toward the square.',
  'data.southNoteWestStretch': 'Flat run: window axes with paired-column piers every ~4th bay.',
  'data.southNotePortal':
    'Parade gateway: three entrance arches (courtyard entrance), giant columns, pediment ' +
    'with clock and eagle cartouche — the Strelna device.',
  'data.southNoteEastStretch': 'Mirror of the west stretch.',
  'data.southNoteSeCorner':
    'SE corner mass: portal with giant columns and cartouche; palace chapel dome rises ' +
    'behind this end.',
  'data.siblingNoteNevaCorner': 'Neva-side corner mass (declared).',
  'data.siblingNoteColonnade': 'Continuous colonnade character (visit-petersburg).',
  'data.siblingNoteCentralPavilionPortals':
    'Central pavilion (declared; arched portals to the courtyard).',
  'data.siblingNoteMirrorRun': 'Mirror run (declared).',
  'data.siblingNoteMillionnaya': 'Toward Millionnaya Street; massive flanks (visit-petersburg).',
  'data.siblingNoteCentralPavilion': 'Central pavilion (declared).',
  'credits.gallery1812.canvases':
    'Canvases: public-domain reproductions of the Military Gallery portraits (George Dawe and ' +
    'studio, 1819–1828; Kruger; Krafft), via Wikimedia Commons.',
} satisfies Dictionary;
