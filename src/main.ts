// Phase 0 coordinator — design-sky-time.md §9, §10, §11. Owns the DOM, the renderer and
// the frame loop; every time or appearance rule itself lives in the pure sky modules.
// §10 arrival order is immutable: sky frame → title frame → massing fade → settled.
import './fonts.css';
import './style.css';
import * as THREE from 'three';
import { AIRLOCKS, ENTRIES } from '../rooms/index';
import { applyWeights } from './assets/blend-gl';
import { clearEnvironmentIfOwned } from './assets/environment-slot';
import { createLoaders } from './assets/loaders';
import { fetchManifest } from './assets/manifests';
import { parseCamParam } from './camera/cam-param';
import {
  advanceLean,
  LEAN_FRESH_MS,
  LEAN_START,
  type LeanState,
  leanPose,
} from './camera/door-lean';
import { clampLook, type LookOffset, toPointerType } from './camera/look';
import { parseLookParam } from './camera/look-param';
import { CAMERA_VFOV_DEG, squareRailForAspect } from './camera/portrait-frame';
import {
  advance,
  drag,
  nearestStopIndex,
  type RailState,
  sampleLimits,
  samplePose,
  samplePosition,
  scroll,
  seedState,
  stepStop,
} from './camera/rail';
import { SQUARE_RAIL } from './camera/square-rail';
import { WHEEL_EDGE_START, type WheelEdgeState, wheelEdge } from './camera/wheel-edge';
import { SOUTH_FACADE, WINDOW_ROWS } from './content/facade-spec';
import { TIME } from './content/sky-time';
import { createLedger } from './engine/ledger';
import {
  BENCHMARK,
  classifyProbe,
  DEFAULT_TIER_ID,
  MOBILE_COARSE_QUERY,
  type ProbeResult,
  parseQualityUpdate,
  type QualityTier,
  type QualityTierId,
  resolveAutoTier,
  resolveQualityScale,
  TIERS,
} from './engine/tier';
import { type Key, t } from './i18n';
import {
  format,
  formatByteProgress,
  formatDate,
  formatTime,
  PETERSBURG_OFFSET_LABEL,
} from './i18n/format';
import { activateLang, activeLang, onLangChange, resolveLang } from './i18n/locale';
// Mobile-C capture (§18.1/§18.3/§18.6): the pure command/acquisition module; every value
// reference below lives inside the perfLog-guarded branches, so the ordinary build folds
// both mobile-* modules and their strings away (the fold law, the R-UX6 lesson).
import {
  appendFrameRow,
  buildGeneralReply,
  countVisitObjectNodes,
  invalidateForOverflow,
  MOBILE_CAPTURE_MAX_BYTES,
  type MobileCCommandFacts,
  type MobileCCommittedInventory,
  recordVisibilityEvent,
  runCommand,
} from './perf/mobile-capture';
import {
  decide,
  isKnown,
  knownField,
  MOBILE_C_FORMAT,
  type MobileCAttempt,
  type MobileCBeginInput,
  type MobileCCache,
  type MobileCCommand,
  type MobileCCommandReply,
  type MobileCControlState,
  type MobileCEndInput,
  type MobileCField,
  type MobileCFileRef,
  type MobileCId,
  type MobileCIndex,
  type MobileCPlanV1,
  type MobileCPowerPoint,
  type MobileCPrepared,
  type MobileCProfile,
  type MobileCRawInterval,
  type MobileCRegistration,
  type MobileCReportV1,
  type MobileCSavedReceipt,
  type MobileCScope,
  type MobileCSlotResult,
  type MobileCStamp,
  type MobileCThermal,
  type MobileCTransport,
  type MobileCVerificationInput,
  mobileCFileName,
  notApplicableField,
  pendingField,
  unknownField,
} from './perf/mobile-report';
import { noteTransitFrame, openTransitLog, type TransitLog } from './perf/transit-log';
import { buildColumn, setColumnOpacity } from './procedural/column';
import { buildColumnFence, setColumnFenceOpacity } from './procedural/column-fence';
import { buildFacade, FACADE_SURFACE_UNIFORMS } from './procedural/facade-builder';
import { solveSouthFacade } from './procedural/facade-solver';
import { GROUND_SNOW_UNIFORMS, patchGroundSnowSlot } from './procedural/ground-snow';
import { buildNightLattice } from './procedural/night-lattice';
import { buildSnowCap } from './procedural/snow-cap';
import { buildThroat, openGroundArch, setThroatOpacity } from './procedural/throat';
import { type SkySample, sampleSky } from './sky/appearance';
import type { ArrivalState } from './sky/arrival';
import { advanceArrival, initialArrival, presentationForArrival } from './sky/arrival';
import { lightmapWeights } from './sky/lightmap-weights';
import { createSkyRig } from './sky/rig';
import { isSeasonId, type SeasonId, seasonInstant, seasonOf } from './sky/season';
import { canonicalAt, parseTime, queryOf, scrubEpoch, type TimeState } from './sky/time';
import {
  type CaptionStop,
  type CaptionView,
  captionChanges,
  EMPTY_CAPTION,
  presentCaption,
} from './ui/captions';
import { type DoorBoundary, doorLabel, edgePromptView, pushMemory } from './ui/edge-prompt';
import {
  createHintState,
  HINT_HOLD_MS,
  type HintState,
  hintHoldElapsed,
  hintReducedMotion,
  hintSettled,
  hintTravelIntent,
  hintView,
} from './ui/hint';
import {
  buildHudAttrs,
  buildHudLines,
  type HudState,
  parseHudParam,
  pushFrameInterval,
  rollingMedianFrameMs,
} from './ui/hud';
import { bindIndexDialog } from './ui/index-dialog';
import {
  bindLangToggle,
  clearStoredLang,
  currentQueryLang,
  readStoredLang,
  setLangParam,
  writeStoredLang,
} from './ui/lang-host';
// R23-ux: the load line's pure law (docs/design-load-line.md) — thresholds and
// the stage map; the host owns the DOM and the copy. (The threshold itself lives in the
// law's shouldShow — the host never reads the constant.)
import {
  LOAD_LINE_BYTE_STEP,
  type LoadStage,
  shouldShow as loadLineShown,
  loadLine as loadLineStage,
} from './ui/load-line';
import { createSeasonMenu } from './ui/season-menu';
import {
  admitTouchKey,
  admitTouchTravel,
  canvasContact,
  TOUCH_BUTTON_MIN_BLOCK_PX,
  TOUCH_BUTTON_MIN_INLINE_PX,
  TOUCH_RAIL_CLEARANCE_PX,
  TOUCH_RAIL_GAP_PX,
  TOUCH_RAIL_INSET_PX,
  TOUCH_RAIL_PROMPT_LINES,
  TOUCH_RAIL_SHIFT_PCT,
  touchRailCenter,
  touchRailSlotBottom,
  touchRailVisible,
} from './ui/touch-rail';
import {
  advanceTransit,
  beatProgress,
  beginTransit,
  finishTransit,
  type TransitState,
} from './world/airlock';
import { SUN_SHADOW_FIT } from './world/column';
import { snowBounceGround } from './world/ground-snow';
import { parseLmParam } from './world/lm-mode';
import { WINDOW_WARM_LINEAR, warmGround } from './world/night-facade';
import { GROUND_PLANE_SIZE_M } from './world/paving';
import {
  emptyPrefetchState,
  noteManifest,
  type PrefetchState,
  type PrefetchUnit,
  planPrefetch,
} from './world/prefetch';
import {
  type AirlockDef,
  airlockEntering,
  type Bounds,
  type NodeHandle,
  nextAirlockOnPath,
  type Rail,
  type RoomEntry,
  type RoomId,
  type RoomLoadContext,
  type RoomModule,
  type RoomNeighbor,
  type RoomScene,
  resolveRoute,
  type Vec3,
} from './world/registry';
import { snowWeight } from './world/snow-season';
import { parseStopParam } from './world/stop-param';
import { arrivePose, type BeatPose, beatExposure, departPose } from './world/threshold-beat';
import { THROAT_VOID } from './world/throat';

const SUN_DISTANCE = 1000;
const TIER_STORAGE_KEY = 'zimny:tier';

const canvas = document.querySelector('#scene');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#scene canvas missing');
const title = document.querySelector('#title');
if (!(title instanceof HTMLElement)) throw new Error('#title missing');
const clock = document.querySelector('#clock');
if (!(clock instanceof HTMLTimeElement)) throw new Error('#clock missing');
const clockDate = document.querySelector('#clock-date');
if (!(clockDate instanceof HTMLElement)) throw new Error('#clock-date missing');
const scrub = document.querySelector('#scrub');
if (!(scrub instanceof HTMLInputElement)) throw new Error('#scrub missing');
const hud = document.querySelector('#hud');
if (!(hud instanceof HTMLElement)) throw new Error('#hud missing');
const caption = document.querySelector('#caption');
if (!(caption instanceof HTMLElement)) throw new Error('#caption missing');
const captionTitle = document.querySelector('#caption-title');
if (!(captionTitle instanceof HTMLElement)) throw new Error('#caption-title missing');
// R23-ux: the load line — the stage under the card title; the DOM law mirrors the title's
// (opacity-only fades; off leaves no box at settle).
const loadLineEl = document.querySelector('#load-line');
if (!(loadLineEl instanceof HTMLElement)) throw new Error('#load-line missing');
const captionLive = document.querySelector('#caption-live');
if (!(captionLive instanceof HTMLElement)) throw new Error('#caption-live missing');
const notesLink = document.querySelector('#notes-link');
if (!(notesLink instanceof HTMLAnchorElement)) throw new Error('#notes-link missing');
const indexButton = document.querySelector('#index-open');
if (!(indexButton instanceof HTMLButtonElement)) throw new Error('#index-open button missing');
const indexDialog = document.querySelector('#index-dialog');
if (!(indexDialog instanceof HTMLDialogElement)) throw new Error('#index-dialog missing');
const indexList = document.querySelector('#index-list');
if (!(indexList instanceof HTMLElement)) throw new Error('#index-list missing');
const indexHeading = document.querySelector('#index-dialog-title');
if (!(indexHeading instanceof HTMLElement)) throw new Error('#index-dialog-title missing');
const travelHint = document.querySelector('#travel-hint');
if (!(travelHint instanceof HTMLElement)) throw new Error('#travel-hint missing');
const edgePrompt = document.querySelector('#edge-prompt');
if (!(edgePrompt instanceof HTMLButtonElement)) throw new Error('#edge-prompt missing');
const season = document.querySelector('#season');
if (!(season instanceof HTMLButtonElement)) throw new Error('#season button missing');
const seasonList = document.querySelector('#season-list');
if (!(seasonList instanceof HTMLElement)) throw new Error('#season-list missing');
const seasonLabel = document.querySelector('#season-label');
if (!(seasonLabel instanceof HTMLElement)) throw new Error('#season-label missing');
const seasonHelp = document.querySelector('#season-help');
if (!(seasonHelp instanceof HTMLElement)) throw new Error('#season-help missing');
const touchRail = document.querySelector('#touch-rail');
if (!(touchRail instanceof HTMLElement)) throw new Error('#touch-rail missing');
const touchBack = document.querySelector('#touch-back');
if (!(touchBack instanceof HTMLButtonElement)) throw new Error('#touch-back button missing');
const touchForward = document.querySelector('#touch-forward');
if (!(touchForward instanceof HTMLButtonElement)) throw new Error('#touch-forward button missing');
const chromeRow = document.querySelector('#chrome-row');
if (!(chromeRow instanceof HTMLElement)) throw new Error('#chrome-row missing');
const sceneRecovery = document.querySelector('#scene-recovery');
if (!(sceneRecovery instanceof HTMLElement)) throw new Error('#scene-recovery missing');
const sceneMessage = document.querySelector('#scene-message');
if (!(sceneMessage instanceof HTMLElement)) throw new Error('#scene-message missing');
const sceneAnnouncement = document.querySelector('#scene-announcement');
if (!(sceneAnnouncement instanceof HTMLElement)) throw new Error('#scene-announcement missing');
const sceneReload = document.querySelector('#scene-reload');
if (!(sceneReload instanceof HTMLButtonElement)) throw new Error('#scene-reload button missing');

const isDeterministic = (state: TimeState): boolean =>
  state.mode === 'fixed' ? state.deterministic : false;

// §9: capture the wall clock once — the initial sky and the title label share this snapshot.
const bootEpochMs = Date.now();
const parsed = parseTime(location.hash, bootEpochMs);
for (const issue of parsed.issues) console.warn(`zimny: time issue — ${issue}`); // diagnostics only

let timeState: TimeState = parsed.state;
let epochMs = parsed.initialEpochMs;
let sample: SkySample = sampleSky(epochMs);

// --- Language law, host side (design-i18n-notes.md §1.1/§1.2; DEC-020) ----------------------
// Resolution: ?lang= → the persisted zimny:lang → RU; det ignores the override (neither
// read nor written). RU is the default and the static shell already speaks it: the chunk
// installs before the settle beat, so nothing flashes. The chrome re-binds on every switch.
const langResolution = resolveLang({
  queryLang: currentQueryLang(),
  storedLang: readStoredLang(),
  det: isDeterministic(timeState),
  navigation: false,
});
if (langResolution.override.kind === 'write') writeStoredLang(langResolution.override.lang);
if (langResolution.override.kind === 'clear') clearStoredLang();

// The overlay chrome the page owns, bound from the active dictionary on every switch
// (§1.2: <html lang>, <title>, the meta description, every overlay string). The static
// shell is RU — this bind is the only EN path, and it runs before the overlays show.
const SEASON_OPTION_KEYS = {
  now: 'chrome.seasonNow',
  winter: 'chrome.seasonWinter',
  spring: 'chrome.seasonSpring',
  summer: 'chrome.seasonSummer',
  autumn: 'chrome.seasonAutumn',
} as const satisfies Readonly<Record<'now' | SeasonId, Key>>;

const bindChrome = (): void => {
  document.documentElement.lang = activeLang();
  document.title = t('chrome.titleMain');
  const description = document.querySelector('meta[name="description"]');
  if (description !== null) description.setAttribute('content', t('chrome.descriptionMain'));
  const wordmark = title.querySelector('#wordmark');
  if (wordmark !== null) wordmark.textContent = t('chrome.wordmark');
  scrub.setAttribute('aria-label', t('chrome.scrubLabel'));
  const scrubHelp = document.querySelector('#scrub-help');
  if (scrubHelp !== null) scrubHelp.textContent = t('chrome.scrubHelp');
  const sceneHelp = document.querySelector('#scene-help');
  if (sceneHelp !== null) sceneHelp.textContent = t('chrome.sceneHelp');
  canvas.setAttribute('aria-label', t('chrome.canvasLabel'));
  notesLink.textContent = t('chrome.notesLink');
  indexButton.textContent = t('index.open'); // §6.3: the dim index button
  indexHeading.textContent = t('index.title'); // the dialog's aria-labelledby heading
  travelHint.textContent = t(coarsePointer ? 'chrome.travelHintTouch' : 'chrome.travelHint');
  touchRail.setAttribute('aria-label', t('chrome.touchRailLabel'));
  touchBack.setAttribute('aria-label', t('chrome.touchRailBack')); // R19-ux A: glyph face, word name
  touchForward.setAttribute('aria-label', t('chrome.touchRailForward'));
  sceneReload.textContent = t('chrome.sceneReload');
  seasonMenu.closeIfOpen(); // R16: a language swap closes the menu; the next open relabels
  seasonLabel.textContent = t('chrome.seasonLabel');
  seasonHelp.textContent = t('chrome.seasonHelp');
  for (const row of Array.from(seasonList.querySelectorAll<HTMLElement>('[data-season]'))) {
    const value = row.dataset.season;
    if (value === undefined) throw new Error('season row without data-season');
    if (value === 'now' || isSeasonId(value)) row.textContent = t(SEASON_OPTION_KEYS[value]);
  } // §9: swaps in place, timers untouched
  // R16.1: the language swap rewrites the row texts above, but the BUTTON's label is
  // syncSeasonSelect's own write — and that sync also runs SYNCHRONOUSLY in the
  // hashchange listener, BEFORE activateLang resolves and installs the new dictionary
  // (the r16 full-suite finding: the label sat at the previous language after a swap).
  // The re-sync at the end of bindChrome rewrites the label with the installed dictionary.
  syncSeasonSelect();
  // The door label's text composes in the frame block (it names the current boundary's
  // destination); the language swap re-composes on the next visible frame.
  // The clock labels bind per minute-change; a fixed ?at= boot has no live resample, so
  // the language switch re-applies the epoch itself (idempotent: the same instant, the
  // new language's day line).
  lastLabelEpochMs = -1;
  applyEpoch(epochMs);
};

// The season control is DERIVED from the committed time state, never stored: live → now,
// fixed → the local meteorological season of the instant. Re-derived after every commit
// and every hashchange re-parse; never during scrub preview, never in the frame loop.
const syncSeasonSelect = (): void => {
  const value = timeState.mode === 'live' ? 'now' : seasonOf(timeState.epochMs);
  season.textContent = t(SEASON_OPTION_KEYS[value]);
  for (const row of Array.from(seasonList.querySelectorAll<HTMLElement>('[data-season]'))) {
    row.setAttribute('aria-selected', String(row.dataset.season === value));
  }
};
syncSeasonSelect();

// --- The touch rail's layout (design-mobile-tier.md §4) --------------------------------------
// Host-owned, called ONLY on layout changes (first settle, fonts.ready, the resize
// listener, the language swap) — never in the frame loop. The width fact rides the SAME
// boot-read coarsePointer + a fresh clientWidth per layout change; the slot the pair stands
// on (R19-ux A.1: the corner stack's stable facts, never its content-sized top) and the
// ceiling above it are measured here and only here.
// Insufficient space warns loudly and NEVER hides or moves the rail.
const layoutTouchRail = (): void => {
  const vars = [
    ['--touch-min-inline', TOUCH_BUTTON_MIN_INLINE_PX],
    ['--touch-min-block', TOUCH_BUTTON_MIN_BLOCK_PX],
    ['--touch-gap', TOUCH_RAIL_GAP_PX],
    ['--touch-inset', TOUCH_RAIL_INSET_PX],
  ] as const;
  for (const [name, value] of vars) {
    touchRail.style.setProperty(name, `${value}px`);
  } // the four --touch-* px vars
  // R21-ux: percent, not vw — CSS calc() resolves a % length against the fixed element's
  // containing block (the viewport), the same base the e2e probe reads as clientWidth.
  touchRail.style.setProperty('--touch-shift', `${TOUCH_RAIL_SHIFT_PCT}%`);
  const visible = touchRailVisible({
    coarsePointer,
    widthCssPx: document.documentElement.clientWidth,
  });
  touchRail.dataset.visible = String(visible);
  if (!visible) return;
  // R19-ux A.1 (design-mobile-tier §4): the pair's box stands one stack gap above the highest
  // top any corner-stack member but the entry title can reach (touchRailSlotBottom): in-flow
  // members count up from the stack's bottom edge, the door prompt at its reserved band of
  // TOUCH_RAIL_PROMPT_LINES lines; fixed members (≥768 the hint and prompt lines) at their own
  // tops when they share a button column. The ceiling is the chrome above either button column
  // (the wordmark block, plus any chrome reaching the right column) plus CLEARANCE; a slot that
  // runs into it warns.
  // Horizontal geometry does not depend on top: read the button columns first.
  const back = touchBack.getBoundingClientRect();
  const fwd = touchForward.getBoundingClientRect();
  const inColumns = (r: DOMRect) =>
    (r.left < back.right && r.right > back.left) || (r.left < fwd.right && r.right > fwd.left);
  const langToggle = document.querySelector('#lang-toggle');
  const ceiling: readonly Element[] = langToggle === null ? [title] : [title, langToggle];
  const above = ceiling.map((e) => e.getBoundingClientRect()).filter(inColumns);
  const bandTop = Math.max(0, ...above.map((r) => r.bottom)) + TOUCH_RAIL_CLEARANCE_PX;
  const stack = document.querySelector('#corner-stack');
  const captionTitle = document.querySelector('#caption-title');
  const doorPrompt = document.querySelector('#edge-prompt');
  if (stack === null || captionTitle === null || doorPrompt === null) {
    throw new Error('zimny: corner stack missing');
  }
  const gap = Number.parseFloat(getComputedStyle(stack).rowGap) || 0;
  const inFlow: Array<{ height: number; reserve: number }> = [];
  const outOfFlowTops: number[] = [];
  for (const member of Array.from(stack.children)) {
    if (member === captionTitle || member.getClientRects().length === 0) continue;
    const style = getComputedStyle(member);
    const box = member.getBoundingClientRect();
    if (style.position === 'fixed' || style.position === 'absolute') {
      if (inColumns(box)) outOfFlowTops.push(box.top);
      continue;
    }
    let reserve = 0;
    if (member === doorPrompt) {
      const line = Number.parseFloat(style.lineHeight);
      if (!Number.isFinite(line)) throw new Error('zimny: door prompt line box unreadable');
      reserve = TOUCH_RAIL_PROMPT_LINES * line;
    }
    inFlow.push({ height: box.height, reserve });
  }
  const { slotBottom, overflow } = touchRailSlotBottom({
    stackBottom: stack.getBoundingClientRect().bottom,
    gap,
    inFlow,
    outOfFlowTops,
  });
  const { center, fits } = touchRailCenter(
    bandTop,
    slotBottom,
    touchRail.getBoundingClientRect().height,
  );
  touchRail.style.setProperty('--touch-center', `${center}px`);
  if (!fits) console.warn('zimny: touch-rail slot runs into the chrome above');
  if (overflow) console.warn('zimny: the door prompt outgrows its reserved band');
  if (back.right + TOUCH_RAIL_GAP_PX > fwd.left) {
    console.warn('zimny: touch-rail buttons collide');
  }
};

// R16 (DEC-036): the season menu — the in-page listbox owning the open face; the commit
// path is the select's old change law verbatim (§9: cancel the scrub gesture, «Сейчас»
// commits the return-to-now law, a season commits its anchor instant).
const commitSeasonChoice = (choice: 'now' | SeasonId): void => {
  cancelGesture(); // an external action cancels an in-progress scrub gesture (§9)
  if (choice === 'now') {
    returnToNow();
    return;
  }
  commitSeason(seasonInstant(epochMs, choice));
};
const seasonMenu = createSeasonMenu({
  button: season,
  list: seasonList,
  sync: syncSeasonSelect,
  commit: commitSeasonChoice,
});

// Mobile-B §7: menu opening must cancel any active look before it owns input — the click
// is the module's open path; the module owns its own listeners, so this rides beside them
// (the keyboard open path relies on pointermove's own readiness re-check, D3).
season.addEventListener('click', () => cancelCanvasLook());

// --- The scene recovery face (design-mobile-tier.md §7) --------------------------------------
// The WebGL2-unsupported boot and the context loss share one face: cancel all input,
// announce ONCE, offer the reload of the EXISTING URL (no stop= writes, no restoration
// promises). Language and the toggle stay usable; the announcement is its own surface —
// #caption-live remains the ONE stop announcer.
let failureKind: 'unsupported' | 'interrupted' | null = null;
let sceneUnavailable = false;
const showSceneFailure = (kind: 'unsupported' | 'interrupted'): void => {
  if (failureKind !== null) return;
  failureKind = kind;
  sceneUnavailable = true;
  if (kind === 'interrupted') {
    cancelGesture();
    railState = { ...railState, glide: null };
    seasonMenu.closeIfOpen();
    if (indexDialog.open) indexDialog.close();
    syncTouchRail();
  }
  sceneMessage.textContent = t(
    kind === 'unsupported' ? 'chrome.sceneUnsupported' : 'chrome.sceneInterrupted',
  );
  sceneRecovery.hidden = false;
  sceneReload.hidden = kind === 'unsupported';
  sceneAnnouncement.textContent = sceneMessage.textContent;
  // The face carries its own reload label: bindChrome may never run (the unsupported
  // boot path exits at the renderer construction).
  sceneReload.textContent = t('chrome.sceneReload');
};
sceneReload.addEventListener('click', () => {
  window.location.reload();
});
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showSceneFailure('interrupted');
});

// r22 experiment: MSAA on — the far-field aliasing fix; the budgets decide keep/revert.
// Mobile-B §7 (the orchestrator ruling): a contextless constructor surfaces the localized
// unsupported face, the console shows the labeled cause, and the boot exits loudly — the
// face + announcement stand alone. The branch is untested by design (SwiftShader provides
// WebGL2 everywhere the battery runs); the interrupted branch is the tested one.
const createRenderer = (): THREE.WebGLRenderer => {
  try {
    return new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (creationError) {
    showSceneFailure('unsupported');
    throw new Error('zimny: WebGL2 unavailable — renderer construction failed', {
      cause: creationError,
    });
  }
};
const renderer = createRenderer();
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = sample.exposure;
// §11 runtime counting: one reset per frame, every render in that frame aggregates.
renderer.info.autoReset = false;
// Dev/test-only scene readout (the earlier SUB-BISECT probe, committed by R24-ux as the
// environment-handover regression's structural assertion): narrowly named — the e2e row
// reads `environmentPresent()` while the transit is idle; no per-frame diagnostic work.
const zimnyDebug: {
  scene?: unknown;
  renderer?: unknown;
  environmentPresent?: () => boolean;
} = {};
(window as { __zimnyDebug?: unknown }).__zimnyDebug = zimnyDebug;
queueMicrotask(() => {
  zimnyDebug.scene = scene;
  zimnyDebug.renderer = renderer;
  zimnyDebug.environmentPresent = () =>
    scene.environment !== null && scene.environment !== undefined;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CAMERA_VFOV_DEG, 1, 0.5, 2000); // fov law: portrait-frame
camera.position.set(-24, 1.7, 230); // = SQUARE_RAIL S0 (DEC-037: west of the gate axis)
camera.lookAt(0, 11, 0);

// Card-model massing at true scale — the Phase 0 "architect's card model" (ships-list).
// Sources (ATTRIBUTIONS.md): quadrangle ~210 × 175 m, ~22 m to the cornice, roofline with
// statuary to ~30 m (modelled as a 2 m band to ~24 m); SE/SW risalits and the central gate
// pavilion protrude beyond the south facade line. Courtyard proportions are a declared
// approximation (docs/artistic-license.md). +X east, +Z south (toward Palace Square).
const PALACE = {
  halfWidth: 105, // E-W, outer
  halfDepth: 87.5, // N-S, outer
  wingDepth: 24,
  cornice: 22,
  roof: 24,
  protrude: 6,
} as const;

// Phase 1 facade: solve the frozen spec, then build the instanced relief kit.
// The solved sections also own the south massing front below — the kit mounts
// exactly on its fronts (docs/design-facade-grammar.md).
const solvedFacade = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
if (!solvedFacade.ok) {
  throw new Error(`facade spec invalid: ${solvedFacade.issues.map((i) => i.message).join('; ')}`);
}
const facadeBuild = buildFacade(solvedFacade.value);
// DEC-019 night lattice: one pane quad per window recess, hashed into three stock levels.
// Lives inside the palace group — the indoors visibility flip is inherited for free.
const nightLattice = buildNightLattice(solvedFacade.value);
// DEC-033 winter: one merged morph lip over the solver's 9 upper cornice-runs; hidden outright
// at wSnow === 0. Lives inside the palace group — the indoors visibility flip is inherited.
const snowCap = buildSnowCap(solvedFacade.value);
// R-UX3 (§3): the resident throat — rides the palace group: hidden the frame a room mounts,
// faded in with the massing. The kit's middle ground-arch slab is voided for it.
const throat = buildThroat();
openGroundArch(facadeBuild);
// DEC-037: the Alexander Column on the gate axis — one merged Lambert mesh inside the palace
// group (the indoors flip inherited), faded with the massing in applyPresentation.
const alexanderColumn = buildColumn();
// DEC-038: Montferrand's bronze fence round the Column — one merged Lambert mesh, the same group,
// the same fade and the same every-solid shadow loop.
const columnFence = buildColumnFence();

const palace = new THREE.Group();
palace.name = 'PalaceMassing';
const massingMaterial = new THREE.MeshLambertMaterial({
  color: 0x7dab93, // Phase 1 palette: pale green walls (owner decision); dressings white via the kit
  transparent: true,
  opacity: 0,
});

const block = (
  width: number,
  depth: number,
  x: number,
  z: number,
  height: number = PALACE.cornice,
  y: number = height / 2,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), massingMaterial);
  mesh.position.set(x, y, z);
  return mesh;
};

const innerZ = PALACE.halfDepth - PALACE.wingDepth / 2; // 75.5 — wing centres
const innerX = PALACE.halfWidth - PALACE.wingDepth / 2; // 93
const wingLength = PALACE.halfDepth * 2 - PALACE.wingDepth * 2; // 127 — E/W wings between N/S
// South protrusions: 30 m deep, outer face reaching halfDepth + protrude (risalits / gate).
const southFrontDepth = PALACE.wingDepth + PALACE.protrude; // 30
const protrusionZ = PALACE.halfDepth + PALACE.protrude - southFrontDepth / 2; // 78.5
// South front rebuilt from the solved facade sections so the kit mounts exactly
// on its fronts: stretches 24 m deep on the main line, risalits/portal 30 m deep
// (outer face at halfDepth + protrude). The old card-model x-positions were
// approximate and did not match the spec's axis layout.
let sectionPrefixAxes = 0;
const southWings = SOUTH_FACADE.sections.flatMap((section) => {
  const deep = section.declaredProtrusionM > 0;
  const width = section.declaredAxes * solvedFacade.value.pitchM;
  const centreX =
    -PALACE.halfWidth + (sectionPrefixAxes + section.declaredAxes / 2) * solvedFacade.value.pitchM;
  sectionPrefixAxes += section.declaredAxes;
  const depth = deep ? PALACE.wingDepth + PALACE.protrude : PALACE.wingDepth;
  const z = deep ? protrusionZ : innerZ;
  if (section.kind !== 'centralPortal') return [block(width, depth, centreX, z)];
  // R-UX3 (§3): the gate pavilion is voided through its middle arch for the throat — two piers
  // and a lintel instead of one solid; the throat's own surfaces line the void (THROAT_VOID
  // clears them by 0.25 m so no pier face is coplanar with a throat wall).
  const pierW = (width - 2 * THROAT_VOID.halfWidth) / 2;
  const pierX = THROAT_VOID.halfWidth + pierW / 2;
  const lintelH = PALACE.cornice - THROAT_VOID.topY;
  return [
    block(pierW, depth, centreX - pierX, z),
    block(pierW, depth, centreX + pierX, z),
    block(2 * THROAT_VOID.halfWidth, depth, centreX, z, lintelH, THROAT_VOID.topY + lintelH / 2),
  ];
});
const northWings = [block(PALACE.halfWidth * 2, PALACE.wingDepth, 0, -innerZ)];
const sideWings = [
  block(PALACE.wingDepth, wingLength, innerX, 0),
  block(PALACE.wingDepth, wingLength, -innerX, 0),
];
// Cornice/balustrade band: one slab per wing, set back 1 m, cornice → roof height.
const band = { height: PALACE.roof - PALACE.cornice, y: (PALACE.roof + PALACE.cornice) / 2 };
const bands = [
  block(PALACE.halfWidth * 2 - 2, PALACE.wingDepth - 2, 0, innerZ, band.height, band.y),
  block(PALACE.halfWidth * 2 - 2, PALACE.wingDepth - 2, 0, -innerZ, band.height, band.y),
  block(PALACE.wingDepth - 2, wingLength - 2, innerX, 0, band.height, band.y),
  block(PALACE.wingDepth - 2, wingLength - 2, -innerX, 0, band.height, band.y),
];

const groundMaterial = new THREE.MeshLambertMaterial({
  color: 0x3f3f3f, // dark square asphalt — AgX pulls diffuse whites down; the ground must not compete
  transparent: true,
  opacity: 0,
});
// R12: the ground-snow slot — the one onBeforeCompile on the ground material (design-ground-snow.md §2).
patchGroundSnowSlot(groundMaterial);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_PLANE_SIZE_M, GROUND_PLANE_SIZE_M),
  groundMaterial,
);
ground.rotation.x = -Math.PI / 2;
palace.add(
  ground,
  ...southWings,
  ...northWings,
  ...sideWings,
  ...bands,
  facadeBuild.group,
  nightLattice.group,
  snowCap.group,
  throat.group,
  alexanderColumn.mesh,
  columnFence.mesh,
);
// Shadows return with the facade kit (architecture.md): every solid casts and receives.
ground.receiveShadow = true;
for (const child of palace.children) {
  if (child instanceof THREE.Mesh && child !== ground) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
}
palace.visible = false; // §10: the first rendered frame is the procedural sky alone
scene.add(palace);

const sun = new THREE.DirectionalLight(0xffffff, 0); // intensity driven by the sample
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); // T1 default until quality tiers land
sun.shadow.camera.left = SUN_SHADOW_FIT.left;
sun.shadow.camera.right = SUN_SHADOW_FIT.right;
sun.shadow.camera.top = SUN_SHADOW_FIT.top;
sun.shadow.camera.bottom = SUN_SHADOW_FIT.bottom;
sun.shadow.camera.near = SUN_SHADOW_FIT.near;
sun.shadow.camera.far = SUN_SHADOW_FIT.far;
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0.25;
// DEC-037: the committed ±130 m box re-centred on z = SUN_SHADOW_FIT.centreZ so it reaches the
// Column. The rig carries the light AND its target: applyEpoch's sun.position stays the rig-local
// sunDirection × SUN_DISTANCE, so the light direction is unchanged while the box translates.
const sunRig = new THREE.Group();
sunRig.name = 'SunRig';
sunRig.position.set(0, 0, SUN_SHADOW_FIT.centreZ);
sunRig.add(sun, sun.target);
scene.add(sunRig);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); // colours driven by the sample
scene.add(hemi);

// Debug HUD — ?hud=1 shares the hash query with time/tier (parseHudParam never persists;
// H toggles at runtime). Re-bound at most every 500 ms from the whole-frame aggregates.
let hudOpen = false;
let hudIntervals: readonly number[] = [];
let hudBoundAtMs = -1;
let hudLastLines = '';
// Mobile-B §5: the rail's aria/data-row cadence card — its own clock, so the HUD's binding
// (hudOpen boots) can never consume the ≤500 ms slot that flips the buttons' availability.
let railRowBoundAtMs = -1;
const hudParams = parseHudParam(new URLSearchParams(queryOf(location.hash)));
for (const issue of hudParams.issues) console.warn(`zimny: hud issue — ${issue}`);
// The §4.4 measurement switch — dev-only, ephemeral per URL (the HUD's parsing contract).
const lmParams = parseLmParam(new URLSearchParams(queryOf(location.hash)));
for (const issue of lmParams.issues) console.warn(`zimny: lm issue — ${issue}`);
// The `?stop=` camera-stop switch (dev-only, r17c) shares the `?lm=` lifecycle: parsed at boot
// and on every hashchange, resolved per room in applySwap, never persisted.
const stopParams = parseStopParam(new URLSearchParams(queryOf(location.hash)));
for (const issue of stopParams.issues) console.warn(`zimny: stop issue — ${issue}`);
let requestedStop: string | null = stopParams.stop;
// The ?cam= rail parameter (§1.2) shares that lifecycle: parsed at boot and on every
// hashchange, consumed by the rail seed on the next node change, never persisted.
const camParams = parseCamParam(new URLSearchParams(queryOf(location.hash)));
for (const issue of camParams.issues) console.warn(`zimny: cam issue — ${issue}`);
let requestedCam: number | null = camParams.cam;
// The ?look= deep link shares that lifecycle: det-gated at boot and on every hashchange; it
// applies to the square's seeded state only (the capture battery's right-look injection;
// square-entry-ground W5). Non-det boots never parse it.
const lookParams = isDeterministic(timeState)
  ? parseLookParam(new URLSearchParams(queryOf(location.hash)))
  : { look: null, issues: [] };
for (const issue of lookParams.issues) console.warn(`zimny: look issue — ${issue}`);
let requestedLook: LookOffset | null = lookParams.look;
const applyHudBinding = (): void => {
  hud.hidden = !hudOpen;
  if (!hudOpen) return;
  hud.textContent = ''; // stale lines from a previous open are not diagnostics
  hudLastLines = '';
  hudBoundAtMs = -1;
};
const toggleHud = (value: boolean): void => {
  if (hudOpen === value) return;
  hudOpen = value;
  applyHudBinding();
};
toggleHud(hudParams.enabled);
document.addEventListener('keydown', (event) => {
  if (event.key !== 'h' || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target === scrub) return; // the scrub owns its keys; no hidden toggles from inside
  event.preventDefault();
  toggleHud(!hudOpen);
});

const rig = createSkyRig(scene, camera);

// One elevation formula for every §8 consumer (the room blend in the frame loop and the
// DEC-019 night lattice here): the frame's sun sample carries the sine of the elevation.
const elevationDegOf = (s: SkySample): number =>
  (Math.asin(Math.max(-1, Math.min(1, s.sunDirection[1]))) * 180) / Math.PI;

const applyEpoch = (nextEpochMs: number): void => {
  epochMs = nextEpochMs;
  sample = sampleSky(nextEpochMs);
  rig.apply(sample);
  renderer.toneMappingExposure = sample.exposure;
  const { atmosphere } = sample;
  sun.intensity = atmosphere.sunIntensity;
  sun.position.set(
    sample.sunDirection[0] * SUN_DISTANCE,
    sample.sunDirection[1] * SUN_DISTANCE,
    sample.sunDirection[2] * SUN_DISTANCE,
  );
  const { zenithRgb: z, horizonRgb: h } = atmosphere;
  hemi.color.setRGB(
    0.25 * z[0] + 0.75 * h[0],
    0.25 * z[1] + 0.75 * h[1],
    0.25 * z[2] + 0.75 * h[2],
  );
  // DEC-019: the night facade's lattice and the hemisphere's ground warm-up ride the same §8
  // weight the interiors blend by — one clock curve, so inside and outside agree. warmGround is
  // endpoint-exact: at wNight === 0 (day, white-night plateau) the ground law is bit-identical
  // to the pre-lattice sample line, and the lattice group is hidden outright.
  const wNight = lightmapWeights(elevationDegOf(sample)).nightChandeliers;
  nightLattice.setNight(wNight);
  // DEC-033: the season law reads the same instant the sun samples (at=/det=), never Date.now();
  // four writes per frame — morph influence + cap visibility, and the two slots' uniforms (R12).
  const wSnow = snowWeight(nextEpochMs);
  snowCap.setSnow(wSnow);
  FACADE_SURFACE_UNIFORMS.uSnow.value = wSnow;
  GROUND_SNOW_UNIFORMS.uSnow.value = wSnow;
  hemi.groundColor.setRGB(...warmGround(snowBounceGround(h, wSnow), WINDOW_WARM_LINEAR, wNight));
  // Label churn guard: the DOM text only changes when the minute actually changes.
  if (nextEpochMs !== lastLabelEpochMs) {
    lastLabelEpochMs = nextEpochMs;
    // The i18n formatters carry the clock law (the r24a cross-check proved them equal to
    // formatPetersburg on civil time); the date display is the only language-dependent
    // byte (EN keeps the frozen ISO bytes, RU gets the ru-RU calendar line — D6). The
    // <time> element's dateTime attribute stays machine-format ISO in both languages.
    const lang = activeLang();
    const time = formatTime(nextEpochMs);
    const date = formatDate(nextEpochMs, lang);
    clock.textContent = time;
    clock.dateTime = `${formatDate(nextEpochMs, 'en')}T${time}:00+03:00`;
    clockDate.textContent = date;
    scrub.setAttribute('aria-valuetext', `${date} ${time} (${PETERSBURG_OFFSET_LABEL})`);
  }
};
applyEpoch(epochMs);

// --- Room streaming (design-staircase.md §1.1, §2.4, §8; DEC-013/DEC-014) ------------------
// The square is a resident: it is never mounted or disposed — indoors only its exterior
// group and the sky dome flip to visible=false. Rooms load lazily behind their thunks; an
// airlock transit is the only place a room mounts, uploads GPU memory or disposes.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ledger = createLedger(); // §8.3 layer 1: the loaders register their own GPU allocations
const assets = createLoaders(renderer, ledger);
const roomScene: RoomScene = {
  add: (object) => scene.add(object as unknown as THREE.Object3D),
  remove: (object) => scene.remove(object as unknown as THREE.Object3D),
  setEnvironment: (object) => {
    scene.environment = (object ?? null) as THREE.Texture | null;
  },
  // R24-ux: the ownership-checked release — the exact identity of the handle the setter
  // assigned (environment-slot.ts holds the law; the slot facade is the only surface the
  // room scopes touch).
  clearEnvironmentIfCurrent: (object) =>
    clearEnvironmentIfOwned(scene, (object ?? null) as THREE.Texture | null),
};
// The `?lm=` technique switch is ephemeral per URL (the hud pattern): parsed at boot and on
// every hashchange; rooms mounted later pick up the current mode, a mounted room keeps its
// technique until the next exit disposes it (§4.4's measurement navigates with the flag set).
let roomCtx: RoomLoadContext = {
  assets,
  scene: roomScene,
  ledger,
  lmMode: lmParams.mode,
  renderer,
};

let activeNode: NodeHandle | null = null; // null = cold entry (nothing mounted yet)
let indoor = false;
let ready = false;
let transit: Readonly<{ state: TransitState; target: NodeHandle; def: AirlockDef }> | null = null;
let queuedTarget: NodeHandle | null = null;
// The room index (§6.4): a jump writes the hash with cold intent — the next navigation's
// transit takes the deep-link path (open at the card) even from a mounted room. The flag
// rides ONE hashchange: it parks into queuedCold when a transit is in flight (consumed by
// the exit's chained pickup); a jump click is impossible while the button is hidden.
let indexJumpPending = false;
let queuedCold = false;
// The index button fades WITH the captions (§6.3): revealed at the first settle, then
// forever mirroring #caption's visibility flag (rest-visible, glide-faded).
let indexRevealed = false;
let transitStarted = false;
const roomWork = new Map<RoomId, Promise<void>>();
const roomModules = new Map<RoomId, RoomModule>();

// The threshold beat's host side (design-walkthrough-ux.md §4, R-UX1): the pure FSM owns the
// phases, this host owns the camera pose and the exposure over them. The door pose and the
// rail's end tangent lock on the FIRST depart frame — a wheel-through may fire mid-glide, and
// the locked pose keeps the switch continuous (the rail's own glide is absorbed into the beat's).
// The exposure endpoints capture at begin: the drain starts from the view the visitor sees.
let beatDoor: BeatPose | null = null;
let beatTangent: Vec3 | null = null;
let beatFromExposure = 1;
let beatToExposure = 1;

// The prefetch chain's host side (§4.6): the pure scheduler plans one unit per idle frame; this
// host kicks the neighbours' manifests + lazy chunks at every arrival settle and stages each
// planned unit into the loaders' session cache. `pendingChains` gates the scheduler on: settled,
// no open transit, no in-flight chain (the never-while-pending law). A failed unit leaves the
// plan marked and the byte cache empty — the hold's fetchRoom fetches on demand (safe degrade).
let prefetchState: PrefetchState = emptyPrefetchState;
let pendingChains = 0;

// The room whose baked light applies this frame: the node being entered during a transit,
// otherwise the active node. The square owns none; unregistered rooms no-op in blend-gl.
const blendRoom = (): RoomId | null => {
  const st = transit?.state;
  if (st !== undefined && st.phase !== 'idle') {
    return st.to !== null && st.to !== 'square' ? st.to : null;
  }
  return activeNode !== null && activeNode !== 'square' ? activeNode : null;
};

const roomEntryOf = (id: RoomId): RoomEntry => {
  const hit = ENTRIES.find((e): e is RoomEntry => e.kind === 'room' && e.id === id);
  if (!hit) throw new Error(`zimny: no registry entry for room ${id}`);
  return hit;
};

// The settled node's committed neighbours (both directions; the scheduler skips the dead end
// and the resident).
const neighborsOf = (node: NodeHandle): readonly RoomNeighbor[] => {
  const entry = ENTRIES.find((e) => e.id === node);
  if (entry === undefined) return [];
  return entry.kind === 'resident' ? entry.neighbors : entry.contract.neighbors;
};

// The arrival-settle kick (§4.6): each non-resident neighbour room's manifest + lazy chunk
// resolve together (unserialised); the manifest's file rows note the scheduler's stage. Once
// per room per session — the manifest fetcher and the browser module cache memoise the rest.
const kicked = new Set<RoomId>();
const kickPrefetch = (node: NodeHandle): void => {
  for (const neighbor of neighborsOf(node)) {
    const to = neighbor.to;
    if (to === null || to === 'square' || kicked.has(to)) continue;
    kicked.add(to);
    pendingChains += 1;
    void fetchManifest(to, new AbortController().signal)
      .then((manifest) => {
        void roomEntryOf(to).thunk();
        if (prefetchState.rooms.get(to)?.manifest !== true) {
          prefetchState = noteManifest(prefetchState, to, manifest.files);
        }
      })
      .then(
        () => {
          pendingChains -= 1;
        },
        () => {
          pendingChains -= 1; // the card's fetchManifest re-fetches today's shape
        },
      );
  }
};

// R23-ux (design-load-line.md): the load line's facts live with the room's load chain.
// The stages mark at the ensureRoom awaits (open = this file's manifest+chunk awaits,
// bytes = the manifest's rows streaming inside module.load whose rows are the PAYLOAD
// bytes — the sum of the manifest's row sizes, NOT the GPU ledger), assemble = mount +
// compileAsync, failed = the chain rejected. Cards read this map per frame; the record is
// a fresh one per beginTransitTo, so a re-entered room counts its own chain. The sink is
// bound only across module.load (the serialized-hold precedent keeps it race-free).
type RoomLoadProgress = {
  stage: LoadStage;
  receivedBytes: number;
  rows: Map<string, number>;
  totalBytes: number | null;
  shown: boolean;
  announced: boolean;
  stamped: boolean;
  failAnnounced: boolean;
};
const loadProgress = new Map<string, RoomLoadProgress>();
const freshProgress = (): RoomLoadProgress => ({
  stage: 'open',
  receivedBytes: 0,
  rows: new Map<string, number>(),
  totalBytes: null,
  shown: false,
  announced: false,
  stamped: false,
  failAnnounced: false,
});
const progressOf = (id: string): RoomLoadProgress => {
  let record = loadProgress.get(id);
  if (record === undefined) {
    record = freshProgress();
    loadProgress.set(id, record);
  }
  return record;
};
// A row's sink counts are monotone per row (the stream's chunks report cumulative bytes);
// the room's received is the sum of the alive rows' last counts.
const noteRowBytes = (id: string, rowPath: string, loaded: number): void => {
  const record = progressOf(id);
  if (loaded >= (record.rows.get(rowPath) ?? 0)) record.rows.set(rowPath, loaded);
  record.receivedBytes = [...record.rows.values()].reduce((sum, bytes) => sum + bytes, 0);
};

const ensureRoom = (id: RoomId): Promise<void> => {
  const existing = roomWork.get(id);
  if (existing) return existing;
  pendingChains += 1; // the scheduler never plans while a load chain is pending (§4.6)
  const promise = (async () => {
    // r16 interim: no external abort source exists until the rail prefetch lands (r18).
    const controller = new AbortController();
    const manifest = await fetchManifest(id, controller.signal);
    const record = progressOf(id);
    record.stage = 'bytes';
    record.totalBytes = manifest.files.reduce((sum, row) => sum + row.bytes, 0); // R23-ux: the payload total
    const module = await roomEntryOf(id).thunk();
    roomModules.set(id, module); // disposeFrom needs the module synchronously at exit
    assets.setLoadSink((rowPath: string, loaded: number) => noteRowBytes(id, rowPath, loaded));
    try {
      await module.load(roomCtx, manifest, controller.signal);
    } finally {
      assets.setLoadSink(null);
    }
    progressOf(id).stage = 'assemble';
    await module.mount(roomCtx);
    await renderer.compileAsync(scene, camera);
  })();
  roomWork.set(id, promise);
  void promise
    .then(() => {
      pendingChains -= 1;
    })
    .catch((error: unknown) => {
      pendingChains -= 1;
      console.error(`zimny: room ${id} failed`, error); // the transit dwells on the dark card
      const record = progressOf(id); // R23-ux: the failed row — the same spoken promise
      record.stage = 'failed';
      if (!record.failAnnounced) {
        record.failAnnounced = true;
        sceneAnnouncement.textContent = t('chrome.load.failed');
      }
      roomWork.delete(id); // a later entry may start the chain again
    });
  return promise;
};

const interiorFar = (id: RoomId): number => {
  const b = roomEntryOf(id).contract.bounds;
  const dx = b.max[0] - b.min[0];
  const dy = b.max[1] - b.min[1];
  const dz = b.max[2] - b.min[2];
  return Math.ceil(Math.sqrt(dx * dx + dy * dy + dz * dz)) + 20; // §6.2: diagonal + margin
};

// §4.4: bakes carry brightness; indoors the renderer exposure is a per-room CONSTANT
// (declared 1.0) set in the airlock hold and restored to E(h) on exit — §7 stays an
// exterior/sky contract. Interiors are lightmap-only: the sun and the hemisphere light are
// switched off in the hold (they were leaking through walls — unshadowed glb meshes) and
// restored by applyEpoch on the way out.
const INTERIOR_EXPOSURE = 1.0;

// --- Camera rail (design-staircase.md §6.1; r18a) --------------------------------------------
// The pure rail core (src/camera/rail.ts) owns the path, the glide/cut motion, the look
// limits and the seed law; this host owns the DOM inputs (wheel/drag/arrows), the three.js
// camera and the re-seed on every node change. Seed precedence: ?stop= > ?cam= > entry;
// a backward entry (through an airlock whose home side is the node being entered) seeds the
// far stop so the journey continues in the direction of travel unless the URL pins a seed.
// Brief 19 §A (W2): every square rail assignment derives from the live viewport; a degenerate
// window (w or h ≤ 0) falls back to aspect 1 — SQUARE_RAIL itself. Rooms keep their contract data.
const railForViewport = (w: number, h: number): Rail =>
  squareRailForAspect(w > 0 && h > 0 ? w / h : 1);
const railFor = (node: NodeHandle): Rail =>
  node === 'square'
    ? railForViewport(window.innerWidth, window.innerHeight)
    : roomEntryOf(node).contract.rail;

let railNode: NodeHandle = 'square';
let rail: Rail = railForViewport(window.innerWidth, window.innerHeight);
let railState: RailState = seedState(rail, { stop: requestedStop, cam: requestedCam }).state;
// The capture battery's look injection (brief 19 W5 + the §3.5 battery fact, square-entry-ground):
// det-only deep links ?look=<yaw>,<pitch>, clamped through the CURRENT square stop's look row —
// the same limit function the drag path feeds. Both look fields land at once, so the presented
// frame is already at the injected look (the ease would otherwise animate ~5 TAU; det pixels
// must be frozen). Applied at EVERY state-replacing square re-seed a boot can produce: (1) the
// boot seed, (2) the language-activation re-seed inside onLangChange (the async RU/en
// activateLang fires AFTER module init and REPLAYS the seed — without that site the boot
// injection dies with it), and (3) the hashchange re-parse. The helper guards the square rail,
// a parsed value and det itself: a room re-seed never receives a look; non-det boots never
// parse it at all.
const applyInjectedLook = (): void => {
  if (requestedLook === null || !isDeterministic(timeState) || railNode !== 'square') return;
  const look = clampLook(requestedLook, sampleLimits(rail, railState));
  railState = { ...railState, look, lookTarget: look };
};
applyInjectedLook(); // site 1: immediately after the boot seed sets the initial state
let seedAtFarStop = false; // beginTransitTo sets this for backward entries

// One seed law, two consumers: seedRail applies it on a node change; dwellStop derives the
// dark-card caption from it, so the dwell hands over to the rest frame without a flash.
const seedInputs = (): Readonly<{ stop: string | null; cam: number | null }> => ({
  stop: requestedStop,
  cam: requestedCam ?? (seedAtFarStop ? 1 : null),
});

const seedRail = (node: NodeHandle): void => {
  const next = railFor(node);
  if (requestedStop !== null && !next.stops.some((s) => s.id === requestedStop)) {
    console.warn(`zimny: stop issue — ${node} has no stop ${requestedStop}`);
  }
  railNode = node;
  rail = next;
  railState = seedState(next, seedInputs()).state;
  captionStops = next.stops.map((s) => ({ id: s.id, caption: t(s.caption) }));
};

// The dark-card caption (§8.4, §1.2): while a transit dwells, the DESTINATION's seed stop —
// the stop the frame will rest on — shows its beat; the hand-over changes nothing.
const dwellStop = (): CaptionStop | null => {
  const st = transit?.state;
  if (st === undefined) return null;
  if (st.phase !== 'card' && st.phase !== 'arrive') return null;
  if (st.to === null) return null;
  const dest = railFor(st.to);
  const seeded = seedState(dest, seedInputs()).state;
  const stop = dest.stops[nearestStopIndex(dest, seeded.u)];
  return stop === undefined ? null : { id: stop.id, caption: t(stop.caption) };
};

// The title card (DEC-017 rewritten; D3): while the frame is black, the caption region
// carries the destination's room title — the words the door label (R-UX2) will click. It
// clears with the arrive phase, so its fade overlaps the first lit frames (§4.4).
const dwellTitle = (): string | null => {
  const st = transit?.state;
  if (st === undefined || st.phase !== 'card' || st.to === null) return null;
  if (st.to === 'square') return t('data.titleSquare');
  return t(roomEntryOf(st.to).contract.title);
};

// The square's gaze is its authored framing, now the stops' own SUBJECTS (R-UX5 §8): S0 up at
// the cornice line (the goldens' pin) and S1 into the arch mouth (R-UX3) — both square data,
// read by samplePose from the stop data; the host feeds nothing.

let captionStops: readonly CaptionStop[] = rail.stops.map((s) => ({
  id: s.id,
  caption: t(s.caption),
}));
let captionView: CaptionView = EMPTY_CAPTION;

// --- The travel hint (design-i18n-notes.md §9; the state law lives in src/ui/hint.ts) -------
// Eligible only when this load's initial stop is the square's S0 — the one place a visitor
// lands without a shared link; det boots are ineligible (no timers, pixels frozen). The
// timers and the DOM are the host's; every state change flows through applyHintView.
let hintState: HintState = createHintState({
  mainPage: true,
  initialStopIsStart: railNode === 'square' && nearestStopIndex(rail, railState.u) === 0,
  det: isDeterministic(timeState),
  reducedMotion,
});
let hintHoldTimer: ReturnType<typeof setTimeout> | null = null;
let hintSettleFired = false;
const applyHintView = (): void => {
  const view = hintView(hintState);
  travelHint.dataset.visible = view.visible ? 'true' : 'false';
  travelHint.dataset.dismissed = view.dismissed;
  travelHint.style.transitionDuration = `${view.exitMs}ms`;
};
const applyHintStep = (timer: 'schedule-hold' | 'cancel-hold' | null): void => {
  if (timer === 'schedule-hold' && hintHoldTimer === null) {
    hintHoldTimer = setTimeout(() => {
      hintHoldTimer = null;
      const step = hintHoldElapsed(hintState);
      hintState = step.state;
      applyHintStep(step.timer);
      applyHintView(); // the hold's dismissal must reach the DOM (the (d) e2e contract)
    }, HINT_HOLD_MS);
  }
  if (timer === 'cancel-hold' && hintHoldTimer !== null) {
    clearTimeout(hintHoldTimer);
    hintHoldTimer = null;
  }
};
/** The ONE travel definition (§9): every rail intent entry — wheel, drag start of any
 * pointer type, arrow step — lands here, even when the rail drops the input (the hint
 * dismisses on the FIRST intent; travel before the show beat means it never flashes). */
const hintTravel = (): void => {
  const step = hintTravelIntent(hintState);
  hintState = step.state;
  applyHintStep(step.timer);
  applyHintView();
};
// §9: a reduced-motion change mid-session makes the next hint view cut (exitMs 0).
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
  hintState = hintReducedMotion(hintState, event.matches);
  applyHintView();
});
// The language switch re-seeds the caption strings and re-binds the chrome; the hint's
// text swaps in place and its timers are untouched (§9's failure-case law). The toggle
// binds ONCE — its label re-syncs internally on every switch.
onLangChange(() => {
  bindChrome();
  seedRail(railNode);
  applyInjectedLook(); // site 2: the language activation replays the seed — the injected look must survive it
  layoutTouchRail(); // the language swap relays a layout change (the text-mass swap)
});
void activateLang(langResolution.lang).then(() => {
  bindChrome();
  syncSeasonSelect();
});
bindLangToggle((target) => {
  setLangParam(target);
  writeStoredLang(target);
  void activateLang(target);
});
// Mobile-B §4: the rail's clearance/inset are re-measured when the faces finish loading —
// the hint's mid-session language swap needs no re-layout beyond the onLangChange call.
document.fonts.ready.then(() => {
  layoutTouchRail();
});
// The fonts.ready guarantee is weaker than it reads: it resolves while NO load is PENDING,
// which at boot can precede the woff2 fetches entirely — the late face swap then moves the
// title's text mass WITHOUT a resize to hear, and the rail's center froze on the
// fallback-metric band (the Ubuntu-26 CI runner proved the fall twice over, −108.5 px in
// RU geometry's scrub clearance, both retries deterministic). loadingdone/loadingerror own
// the settle: every finished face batch re-runs the host layout with the true metrics.
document.fonts.addEventListener('loadingdone', layoutTouchRail);
document.fonts.addEventListener('loadingerror', layoutTouchRail);

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const RIGHT_AXIS = new THREE.Vector3(1, 0, 0);
/** The unit tangent INTO the boundary the camera is pushing: the same derivation the
 * threshold beat locks on its first depart frame (§4.1) — one helper, both consumers, so
 * the lean's direction and the departure glide's direction agree by construction. */
const doorTangent = (pose: BeatPose, u: number): Vec3 => {
  const step = 1e-4;
  const inner = samplePosition(rail, Math.min(1, Math.max(0, u >= 0.5 ? u - step : u + step)));
  const raw: Vec3 = [
    pose.position[0] - inner[0],
    pose.position[1] - inner[1],
    pose.position[2] - inner[2],
  ];
  const len = Math.hypot(raw[0], raw[1], raw[2]);
  if (len <= 0) throw new Error('zimny: the door stop has a degenerate rail tangent');
  return [raw[0] / len, raw[1] / len, raw[2] / len];
};
const applyRailPose = (): void => {
  const pose = samplePose(rail, railState);
  // R-UX2 (§2): the wheel pass's lean dollies the resting camera a fraction of a metre into
  // the door; at 0 leanPose hands back the pose object — the never-pushed poses stay
  // bit-identical (the golden fence).
  const leaned =
    leanState.metres > 0 ? leanPose(pose, doorTangent(pose, railState.u), leanState.metres) : pose;
  camera.position.set(leaned.position[0], leaned.position[1], leaned.position[2]);
  camera.lookAt(leaned.target[0], leaned.target[1], leaned.target[2]);
  // User look offsets compose on top of the default gaze: yaw around world up (yaw > 0 turns
  // right, a negative rotation about +Y), pitch around the camera's right (pitch > 0 up).
  if (pose.look.yaw !== 0) {
    camera.rotateOnWorldAxis(UP_AXIS, -pose.look.yaw * THREE.MathUtils.DEG2RAD);
  }
  if (pose.look.pitch !== 0) {
    camera.rotateOnAxis(RIGHT_AXIS, pose.look.pitch * THREE.MathUtils.DEG2RAD);
  }
};

/** The threshold beat owns the camera and the exposure during depart/card/arrive (§4):
 * the base pose is the beat's (the rail's eased look offsets still compose on top — the
 * arrive's end pose IS the rail's rest pose, so the hand-over frame is zero-change), and
 * the tone-mapping exposure drains/ramps with the same progress. Returns false when no
 * beat is open and the rail owns the frame. */
const applyBeatPose = (): boolean => {
  const open = transit;
  const st = open?.state;
  if (open === null || st === undefined || st.phase === 'idle' || st.phase === 'exit') {
    return false;
  }
  const pose = samplePose(rail, railState);
  let beat: BeatPose;
  if (st.phase === 'depart') {
    // The door pose + the end tangent lock on the first depart frame (continuity above).
    if (beatDoor === null || beatTangent === null) {
      const u = railState.u;
      // The door stop sits at a rail end; the tangent points INTO the boundary being pushed.
      beatTangent = doorTangent(pose, u);
      // R-UX2 (§2): the pass's lean continues seamlessly into the departure glide — the
      // locked door pose carries the lean the camera arrived with; the glide then travels
      // the same tangent from there (departPose measures its plane distance from the lean).
      beatDoor =
        leanAtFireM > 0
          ? leanPose({ position: pose.position, target: pose.target }, beatTangent, leanAtFireM)
          : { position: pose.position, target: pose.target };
      leanAtFireM = 0; // consumed
    }
    const doorPortal =
      st.from !== null && st.from === open.def.from
        ? open.def.portalFrom
        : (open.def.portalTo ?? open.def.portalFrom);
    beat = departPose({
      stop: beatDoor,
      tangent: beatTangent,
      portal: doorPortal,
      progress: beatProgress(st),
    });
  } else if (st.phase === 'card') {
    if (beatDoor === null || beatTangent === null) return false; // a cut/cold card: the rail owns it
    const doorPortal =
      st.from !== null && st.from === open.def.from
        ? open.def.portalFrom
        : (open.def.portalTo ?? open.def.portalFrom);
    beat = departPose({ stop: beatDoor, tangent: beatTangent, portal: doorPortal, progress: 1 });
  } else {
    const destPortal =
      st.to !== null && st.to === open.def.from ? open.def.portalFrom : open.def.portalTo;
    if (destPortal === null) return false; // unreachable: arrive never runs at a dead end
    beat = arrivePose({
      portal: destPortal,
      stop: { position: pose.position, target: pose.target },
      progress: beatProgress(st),
    });
  }
  camera.position.set(beat.position[0], beat.position[1], beat.position[2]);
  camera.lookAt(beat.target[0], beat.target[1], beat.target[2]);
  if (pose.look.yaw !== 0) {
    camera.rotateOnWorldAxis(UP_AXIS, -pose.look.yaw * THREE.MathUtils.DEG2RAD);
  }
  if (pose.look.pitch !== 0) {
    camera.rotateOnAxis(RIGHT_AXIS, pose.look.pitch * THREE.MathUtils.DEG2RAD);
  }
  renderer.toneMappingExposure = beatExposure({
    phase: st.phase,
    progress: st.phase === 'card' ? 0 : beatProgress(st),
    fromExposure: beatFromExposure,
    toExposure: beatToExposure,
  });
  return true;
};

const applySwap = (to: NodeHandle | null): void => {
  if (to === 'square') {
    indoor = false;
    sun.visible = true;
    hemi.visible = true;
    applyEpoch(epochMs); // restores sun/hemi intensities, colours and E(h) in one step
    rig.mesh.visible = true;
    camera.near = 0.5;
    camera.far = 2000;
    seedRail('square');
  } else if (to !== null) {
    indoor = true;
    sun.visible = false;
    hemi.visible = false; // SUB-BISECT: seam ON for this shot
    rig.mesh.visible = false;
    renderer.toneMappingExposure = INTERIOR_EXPOSURE;
    camera.near = 0.05; // §6.2 interior near/far, swapped in the hold
    camera.far = interiorFar(to);
    seedRail(to);
  }
};

const disposeFrom = (from: NodeHandle | null): void => {
  if (from === null || from === 'square') return; // residents are never disposed (DEC-013)
  // Synchronous on purpose: the hold completed, so the module is resolved and cached; the
  // same tick may chain the next transit, and a chained entry into the room being left
  // must see roomWork cleared (a stale cached promise would mount a room this unmount
  // then disposes). §8.3: the departing room disposes exactly once, in exit, never mid-hold.
  const module = roomModules.get(from);
  if (module === undefined) return; // never mounted — nothing to dispose
  module.unmount(roomCtx);
  roomModules.delete(from);
  roomWork.delete(from); // the next entry re-runs load+mount
};

// §12 instrument: opt-in at build time — `VITE_PERF_LOG=1 pnpm build && pnpm preview`.
// Console-only readout for the device-gate report; absent from normal builds, never UI.
// The declaration MUST precede every reference (beginTransitTo below): the bundler folds
// `if (perfLog)` to dead branches only where the const is already initialized — a reference
// that precedes the declaration keeps its branch (and the imported instrument) in the build
// (the R-UX6 first-build lesson: the transit-log module survived exactly so).
const perfLog = import.meta.env.VITE_PERF_LOG === '1';
let perfWindowStart: number | null = null;
let perfFrames = 0;
let perfSumDeltaMs = 0;
let perfMaxDeltaMs = 0;
let firstSkyLogged = false;
// R-UX6 (§12, the last open NEED): the per-phase transit split rides the same opt-in; the
// ledger is only ever assigned inside `if (perfLog)` branches, so a normal build drops it.
let transitLog: TransitLog | null = null;

// Mobile-C §18.3/§18.6 (the mobile-c brief task 3): the capture surface — the whole host
// machine sits inside these perfLog-guarded branches, so the ordinary build folds the entire
// mobile-* module graph, its tokens and its strings away (the fold law; VITE_PERF_LOG is
// never re-read here — the const above already carries it). The one module-scope value the
// tick reaches for is the frame-note slot (§18.2: one narrow pure invoke per frame); it
// stays null in ordinary builds and the tick's own guarded region checks it.
type CaptureFrameFact = Readonly<{
  timeMs: number;
  deltaMs: number;
  draws: number;
  triangles: number;
  ledgerBytes: number;
  drawingBufferPx: { width: number; height: number };
}>;
type CaptureSession = {
  attempt: MobileCAttempt | null;
  visitId: MobileCId | null;
  plan: MobileCPlanV1 | null;
  beginInput: MobileCBeginInput | null;
  beginScope: MobileCScope | null;
  planFile: MobileCFileRef | null;
  openedAt: MobileCStamp | null;
  sealedAt: MobileCStamp | null;
  visitFiles: MobileCFileRef[];
  receipts: MobileCSavedReceipt[];
  prepared: MobileCPrepared | null;
  exportBytes: Uint8Array<ArrayBuffer> | null;
  transport: MobileCTransport | null;
  verification: MobileCVerificationInput | null;
  slotResult: MobileCSlotResult | null;
  digest: MobileCField<string>;
  serial: number;
  indexSerial: number;
};
let captureFrameNote: ((frame: CaptureFrameFact) => void) | null = null;

if (perfLog) {
  // --- the §18.3/§18.4 capture machine -----------------------------------------------------------
  // The HOST-INJECTION law (the §(6) ratification): the control state is host-owned — the pure
  // module judges commands and returns the module-computed successor that this host advances
  // itself; nothing is persisted, no .*Storage (§18.1). The operator's §18.4 registration
  // ledger rides the console (`__H3D_REGISTRATIONS__`), is read fresh per dispatch and is
  // never written by the page: no command path forges 'ready' — the host presents it only
  // when the ledger points at the loaded plan's slots.
  const captureClock = 'clock-performance';
  const stampNow = (): MobileCStamp => ({ clockId: captureClock, atMs: performance.now() });
  const isoNow = (): string => new Date().toISOString();
  const captureEncoder = new TextEncoder();

  let captureControl: MobileCControlState = 'empty';
  const session: CaptureSession = {
    attempt: null,
    visitId: null,
    plan: null,
    beginInput: null,
    beginScope: null,
    planFile: null,
    openedAt: null,
    sealedAt: null,
    visitFiles: [],
    receipts: [],
    prepared: null,
    exportBytes: null,
    transport: null,
    verification: null,
    slotResult: null,
    // §19.4/§19.8: the digest reads host-side only — a secure context serves it; an insecure
    // serving keeps this pending honestly rather than faking anything.
    digest: pendingField(
      'the digest reads in a secure context; this serving pends honestly',
      're-run once a secure context or a recorded digest is available',
    ),
    serial: 0,
    indexSerial: 0,
  };

  const sha256Hex = async (bytes: Uint8Array<ArrayBuffer>): Promise<string | null> => {
    if (crypto.subtle === undefined) return null;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  };

  // The §18.2 committed inventory as the host presents it: the live committed registry values
  // plus the loaded plan's carried commit identity (the plan FILE's digest verification in
  // the loadPlan delivery is the identity pin — §19.8).
  const committedInventory = (plan: MobileCPlanV1 | null): MobileCCommittedInventory => {
    const airlocks: { id: MobileCId; from: MobileCId; to: MobileCId }[] = [];
    for (const def of AIRLOCKS) {
      if (def.to === null) throw new Error('zimny: capture — a dead-end airlock is not committed');
      airlocks.push({ id: def.id, from: def.from, to: def.to });
    }
    return {
      commit: plan === null ? '' : plan.inventory.commit,
      rooms: [
        { id: 'square', stopIds: SQUARE_RAIL.stops.map((stop) => stop.id) },
        ...ENTRIES.filter((entry) => entry.kind === 'room').map((entry) => ({
          id: entry.id,
          stopIds: entry.contract.rail.stops.map((stop) => stop.id),
        })),
      ],
      airlocks,
    };
  };

  const presentedLedger = (): readonly MobileCRegistration[] => {
    const seed = (globalThis as { __H3D_REGISTRATIONS__?: unknown }).__H3D_REGISTRATIONS__;
    return Array.isArray(seed) ? (seed as readonly MobileCRegistration[]) : [];
  };
  const ledgerPointedAt = (plan: MobileCPlanV1): boolean =>
    presentedLedger().some((row) => plan.slots.some((slot) => slot.id === row.slotId));

  const captureFacts = (): MobileCCommandFacts => ({
    plan: session.plan,
    commit: committedInventory(session.plan),
    registrations: presentedLedger(),
    dispositions: {},
    admittedAt:
      session.openedAt === null
        ? unknownField('no admission stamp', ['clock evidence'])
        : knownField(session.openedAt),
    attempt: session.attempt,
    visitId: session.visitId,
    openSession: {
      initialRoomId: hudRoom(),
      initialStopId: rail.stops[nearestStopIndex(rail, railState.u)]?.id ?? 'S0',
    },
    at: stampNow(),
    digest: session.digest,
    prepared: session.prepared,
    previous: session.prepared,
    indexFacts: null,
    transport: session.transport,
    verification: session.verification,
  });

  const dispatch = (command: MobileCCommand): MobileCCommandReply => {
    const result = runCommand(captureControl, command, captureFacts());
    captureControl = result.reply.state;
    if (result.nextAttempt !== null) session.attempt = result.nextAttempt;
    console.log(
      `zimny: capture ${command.op} ${result.reply.outcome} ${result.reply.code} (${result.reply.state})`,
    );
    return result.reply;
  };
  const malformedReply = (op: string): MobileCCommandReply => {
    session.serial += 1;
    return buildGeneralReply(`cmd-${session.serial}`, captureControl, op);
  };
  const localError = (code: string, reason: string): MobileCCommandReply => {
    session.serial += 1;
    return {
      commandId: `cmd-${session.serial}`,
      state: captureControl,
      outcome: 'error',
      code,
      reason,
      value: unknownField(reason),
    };
  };
  const localPending = (code: string, reason: string, nextAction: string): MobileCCommandReply => {
    session.serial += 1;
    return {
      commandId: `cmd-${session.serial}`,
      state: captureControl,
      outcome: 'pending',
      code,
      reason,
      value: pendingField(reason, nextAction),
    };
  };

  // --- the §18.2 frame-note: one narrow pure invoke per frame; it never logs --------------------
  const msaaSamples = ((): number | null => {
    const gl = renderer.getContext();
    const samples: unknown = gl.getParameter(gl.SAMPLES);
    return typeof samples === 'number' ? samples : null;
  })();
  captureFrameNote = (frame: CaptureFrameFact): void => {
    const attempt = session.attempt;
    if (attempt === null || !isKnown(attempt.frame)) return; // no bounded window: no fabricated row (§18.2)
    const intervalWindow = attempt.frame.value;
    if (intervalWindow.rawCompleteness === 'complete') return; // closed at its terminal sample
    if (frame.deltaMs <= 0) return; // the HUD's own transition frame is not an interval row
    const last = intervalWindow.rawIntervals[intervalWindow.rawIntervals.length - 1];
    const row: MobileCRawInterval = {
      index: intervalWindow.rawIntervals.length,
      fromMs: last === undefined ? intervalWindow.admittedAtMs : last.toMs,
      toMs: frame.timeMs,
      deltaMs: frame.deltaMs,
      render:
        msaaSamples === null
          ? unknownField('the MSAA samples read is non-numeric (the §11 diagnostics own it)', [
              'the samples query',
            ])
          : knownField({
              draws: frame.draws,
              triangles: frame.triangles,
              ledgerBytes: knownField(frame.ledgerBytes),
              drawingBufferPx: frame.drawingBufferPx,
              msaaSamples,
            }),
    };
    const result = appendFrameRow(attempt, row);
    if (result.accepted) {
      session.attempt = result.attempt;
    } else if ('overflow' in result) {
      // §18.4: the first append exceeding the frame cap invalidates the attempt; the prefix
      // stays possessed and the state machine keeps holding it for the operator's commands.
      session.attempt = invalidateForOverflow(attempt, result.overflow);
      console.log(
        'zimny: capture frame cap overflow — the attempt invalidates, the prefix is retained',
      );
    }
  };

  // --- the honest §18.9 begin records (every read is the host's own; absence is stated) ---------
  const captureThermal = (): MobileCThermal => ({
    sessionId: `thermal-${session.serial}`,
    creditedBeforeAdmissionMs: knownField(0),
    segments: [],
    precedingEvidenceIds: [],
    reloadOccurred: false,
    externalContinuity: {
      status: 'pending',
      reason: 'the external continuity decision is operator-evidenced (§18.2)',
      evidenceIds: [],
    },
    soakQualification: {
      status: 'pending',
      reason: 'the soak qualification assesses at the archive boundary',
      evidenceIds: [],
    },
  });
  const captureCacheRead = (): MobileCCache => ({
    at: stampNow(),
    httpAssets: unknownField('the HTTP cache state reads during capture onboard of the session', [
      'cache qualification evidence',
    ]),
    decodedAssets: unknownField(
      'the decoded cache state reads during capture onboard of the session',
      ['cache qualification evidence'],
    ),
    destinationResident: unknownField('the resident state records during capture', [
      'cache qualification evidence',
    ]),
    destinationReady: unknownField('the readiness records during capture', [
      'cache qualification evidence',
    ]),
    serviceWorkerEffect: {
      state: 'not-applicable',
      reason: 'the product runs no service worker (§18.3)',
    },
    restoredFromBackForwardCache: unknownField('the restoration record happens during capture', [
      'cache qualification evidence',
    ]),
    resourceCoverage: decide('unknown', 'no cache qualification evidence'),
    evidenceIds: [],
    qualification: decide('unknown', 'no cache qualification evidence'),
  });
  const capturePowerRead = (): MobileCPowerPoint => ({
    at: stampNow(),
    batteryPercent: unknownField(
      'the power telemetry read is an operator instrument (§19 Phase A)',
      ['power/thermal evidence'],
    ),
    unplugged: unknownField(
      'mains-only is the lawful capture condition until the §10 exception is ratified',
      ['power/thermal evidence'],
    ),
    normalPowerMode: unknownField('the power mode read is an operator instrument', [
      'power/thermal evidence',
    ]),
    lowPowerMode: unknownField('the power mode read is an operator instrument', [
      'power/thermal evidence',
    ]),
    ambientC: unknownField('the ambient read is an operator instrument', [
      'power/thermal evidence',
    ]),
    externalCooling: unknownField('the ambient read is an operator instrument', [
      'power/thermal evidence',
    ]),
    thermalState: unknownField('the thermal read is an operator instrument', [
      'power/thermal evidence',
    ]),
    thermalWarnings: unknownField('the thermal read is an operator instrument', [
      'power/thermal evidence',
    ]),
  });
  const captureProfile = (scope: MobileCScope): MobileCProfile => ({
    deviceId: scope.deviceId,
    model: 'the device model is adopted externally (§10 verifies before adoption)',
    soc: unknownField('the SoC identity is verified and adopted before capture (§10)', [
      'device information evidence',
    ]),
    gpu: unknownField('the GPU identity is part of the SoC adoption (§10)', [
      'device information evidence',
    ]),
    ramGiB: unknownField('the RAM identity is part of the SoC adoption (§10)', [
      'device information evidence',
    ]),
    os: 'the OS identity records at capture (§19 Phase A)',
    osVersion: 'the OS version records at capture (§19 Phase A)',
    browser: 'the browser identity records at capture (§19 Phase A)',
    browserVersion: 'the browser version records at capture (§19 Phase A)',
    userAgent: navigator.userAgent,
    physicalPhone: true,
    display: {
      cssViewportPx: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      nativeDpr: unknownField('the native DPR read is the platform display API', [
        'display evidence',
      ]),
      reportedDevicePixelRatio: window.devicePixelRatio,
      coarsePointer,
      orientation: unknownField('orientation records per manipulation', [
        'the manipulation overlays',
      ]),
      nominalRefreshHz: unknownField('refresh identity unestablished in-page', [
        'display evidence',
      ]),
      adaptiveRefresh: unknownField('refresh adaptivity unestablished in-page', [
        'display evidence',
      ]),
      refreshBehaviour: unknownField('refresh behaviour unestablished in-page', [
        'display evidence',
      ]),
      visualViewport:
        typeof visualViewport === 'object' && visualViewport !== null
          ? knownField({
              sizeCssPx: { width: visualViewport.width, height: visualViewport.height },
              scale: visualViewport.scale,
              offsetLeftCssPx: visualViewport.offsetLeft,
              offsetTopCssPx: visualViewport.offsetTop,
            })
          : unknownField('the visual viewport read unestablished', ['display evidence']),
    },
    deviceMemoryApiGiB: unknownField('the memory API read is a device-scoped instrument', [
      'the device memory read',
    ]),
    jsHeapApi: unknownField('the heap API read is a device-scoped instrument', [
      'the heap API read',
    ]),
    tier: unknownField(
      'the tier settles at the boot probe; the capture records the settled label',
      ['the §3 classifier'],
    ),
    tierSource: unknownField('the tier source records with the tier', ['the §3 classifier']),
    probeCount: unknownField('the probe count records at the settle', ['the boot probe']),
    selection: scope.selection,
    epoch: scope.epoch,
    actualLocation: location.href,
    detUsed: false, // §10/§(5): the machine refuses a det-carrying URL below, never just labels it
    cleanProfile: {
      status: 'pending',
      reason: 'profile cleanliness is operator-evidenced (§19 Phase C)',
      evidenceIds: [],
    },
    visitorOverrideBefore: unknownField(
      'the visitor override read is a device-scoped instrument (the override is never erased, §19 Phase C)',
      ['storage evidence'],
    ),
    visitorOverrideAfter: unknownField('the visitor override read happens at the seal', [
      'storage evidence',
    ]),
    overridePreserved: {
      status: 'pending',
      reason: 'the override-preservation decision is operator-evidenced',
      evidenceIds: [],
    },
    rendererCapabilities: knownField({
      webglVersion: 2,
      precision: 'the shader precision string records at capture (§10)',
      maxTextureSize: renderer.capabilities.maxTextureSize,
      maxTextures: renderer.capabilities.maxTextures,
      maxSamples: knownField(renderer.capabilities.maxSamples),
    }),
    evidenceIds: [],
  });
  const captureBeginInput = (
    registration: MobileCRegistration,
    scope: MobileCScope,
  ): MobileCBeginInput => {
    session.serial += 1;
    return {
      visitId: `capture-visit-${session.serial}`,
      registration,
      profile: captureProfile(scope),
      thermal: captureThermal(),
      cacheBefore: captureCacheRead(),
      powerStart: capturePowerRead(),
      initialExteriorSettledAt: unknownField(
        'the exterior settlement stamps ride the operator trace',
        ['the settled-boot trace'],
      ),
      importedProbe: notApplicableField(
        'a frame-window attempt imports no navigation probe (§18.7)',
      ),
      clocks: [
        {
          id: captureClock,
          kind: 'performance',
          timeOriginUnixMs: knownField(performance.timeOrigin),
          resolutionMs: unknownField('the clock resolution read is an operator instrument', [
            'clock evidence',
          ]),
        },
      ],
      clockRelations: [],
      traces: [],
      evidence: [],
    };
  };

  // The placeholder begin input: the module answers its cells without ever reading the input
  // them (the unconditional 'plan-loaded'/'empty' cells and the general cell), so a neutral
  // record keeps the dispatch shape §-conformant while a pending admission resolves.
  const capturePlaceholderScope = (): MobileCScope =>
    session.plan?.scopes[0] ?? {
      id: 'capture-unplanned',
      deviceId: 'device-unassigned',
      selection: 'clean-profile-auto',
      epoch: '2026-06-21T12:00:00Z',
      entryLocation: '',
      epochMechanism: '',
      epochInputs: [],
      evidenceIds: [],
    };
  const capturePlaceholderInput = (): MobileCBeginInput => ({
    visitId: 'capture-pending',
    registration: {
      attemptId: 'capture-pending',
      slotId: 'capture-pending',
      registeredAtUtc: '',
      conditionKey: '',
      retryOf: notApplicableField('the placeholder claims no retry link'),
      externalEvidenceIds: [],
    },
    profile: captureProfile(capturePlaceholderScope()),
    thermal: captureThermal(),
    cacheBefore: captureCacheRead(),
    powerStart: capturePowerRead(),
    initialExteriorSettledAt: unknownField('the placeholder claims no settlement', [
      'settled-boot trace',
    ]),
    importedProbe: notApplicableField('the placeholder imports no navigation probe'),
    clocks: [],
    clockRelations: [],
    traces: [],
    evidence: [],
  });

  // --- the §18.3 surface entries (EXACTLY the seven §18.6 ops) ----------------------------------
  const loadPlanOp = async (url: string, expectedDigest: string): Promise<MobileCCommandReply> => {
    // §19.8: read bounded bytes, check SHA-256, then parse and supply the value to loadPlan.
    let buffer: ArrayBuffer;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return localError(
          'invalid-input',
          `the plan file fetch failed (${String(response.status)})`,
        );
      }
      buffer = await response.arrayBuffer();
    } catch (error) {
      return localError('invalid-input', `the plan file fetch failed (${String(error)})`);
    }
    if (buffer.byteLength > MOBILE_CAPTURE_MAX_BYTES) {
      return localError(
        'invalid-input',
        `the plan file is ${buffer.byteLength} bytes; the §18.4 delivery bound is ${MOBILE_CAPTURE_MAX_BYTES}`,
      );
    }
    const bytes = new Uint8Array(buffer);
    const sha = await sha256Hex(bytes);
    if (sha === null) {
      return localPending(
        'digest-unavailable',
        'the plan digest reads host-side (the secure-context rule); this serving is insecure, so the delivery stops honestly pending',
        'serve the plan from a secure context or issue the expected digest with the operator',
      );
    }
    if (sha !== expectedDigest.toLowerCase()) {
      return localError(
        'digest-mismatch',
        `the served plan sha256 ${sha} does not match the expected ${expectedDigest} — the delivery stops (§19.8)`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(buffer));
    } catch (error) {
      return localError(
        'invalid-input',
        `the plan file does not parse as UTF-8 JSON (${String(error)})`,
      );
    }
    const plan = parsed as MobileCPlanV1;
    session.serial += 1;
    const reply = dispatch({ commandId: `cmd-${session.serial}`, op: 'loadPlan', plan });
    if (reply.outcome === 'ok') {
      session.plan = plan;
      // The host presents 'ready' only when the presented ledger points at the plan (§(6):
      // the re-arming is a HOST duty, never a command; no command path forges 'ready').
      captureControl = ledgerPointedAt(plan) ? 'ready' : reply.state;
      console.log(`zimny: capture control ${captureControl} after the verified plan load`);
    }
    return reply;
  };

  const beginOp = (record?: unknown): MobileCCommandReply => {
    // §(5)/§10: captures run with det OFF — a det-carrying URL is refused, never labelled.
    const bootParams = new URLSearchParams(queryOf(location.hash));
    if (bootParams.get('det') === '1') {
      return localError(
        'invalid-input',
        'det is set on this URL; captures run with det OFF (§10/§(5))',
      );
    }
    let input: MobileCBeginInput;
    if (
      typeof record === 'object' &&
      record !== null &&
      'visitId' in record &&
      'registration' in record &&
      'profile' in record
    ) {
      // §18.3: commands accept the schema's records — the caller conformance is judged.
      input = record as MobileCBeginInput;
      session.visitId = input.visitId;
    } else {
      // The host presents a registered attempt: the first ledger row that points at the
      // loaded plan's slots. With none presented, the module answers the unregistered fault
      // its own way (the placeholder input is never read by the admission predicate).
      const ledger = presentedLedger().filter(
        (row) => (session.plan?.slots.some((slot) => slot.id === row.slotId) ?? false) === true,
      );
      const registration = ledger[0];
      const scopeKey =
        registration === undefined ? '' : (registration.conditionKey.split('#')[0] ?? '');
      const scope = session.plan?.scopes.find((row) => row.id === scopeKey);
      if (registration === undefined || session.plan === undefined || scope === undefined) {
        input = capturePlaceholderInput();
      } else {
        input = captureBeginInput(registration, scope);
        session.visitId = input.visitId;
      }
    }
    session.serial += 1;
    const beginReply = dispatch({ commandId: `cmd-${session.serial}`, op: 'begin', input });
    if (
      beginReply.outcome === 'ok' &&
      beginReply.value.state === 'known' &&
      beginReply.value.value.kind === 'admission'
    ) {
      const admission = beginReply.value.value;
      session.beginInput = input;
      // The machine records the scope its conditionKey names (scope#slot — the module's own
      // canonical rendering), so the visit's scope identity binds the exported artefact.
      const conditionScope = input.registration.conditionKey.split('#')[0] ?? '';
      session.beginScope = session.plan?.scopes.find((row) => row.id === conditionScope) ?? null;
      session.openedAt = isKnown(admission.admittedAt) ? admission.admittedAt.value : null;
    }
    return beginReply;
  };

  const abortOp = (visitIdArg?: unknown): MobileCCommandReply => {
    const visitId =
      typeof visitIdArg === 'string' && visitIdArg.length > 0 ? visitIdArg : session.visitId;
    if (typeof visitId !== 'string') return malformedReply('abort');
    session.serial += 1;
    return dispatch({
      commandId: `cmd-${session.serial}`,
      op: 'abort',
      visitId,
      reason: 'the operator issued abort through the surface',
    });
  };

  const endVisitOp = (): MobileCCommandReply => {
    // §18.6: the sealed attempt's native CPU stays an operator-input channel; the in-page
    // session records none, so the field pends honestly and the seal still proceeds.
    const endInput: MobileCEndInput = {
      visitId: session.visitId ?? 'capture-pending',
      externalEvidence: [],
      traces: [],
      clockRelations: [],
      nativeCpu: unknownField(
        'native CPU traces are external operator evidence; the in-page session ships none',
        ['native trace covering the window'],
      ),
    };
    session.sealedAt = stampNow();
    session.serial += 1;
    const reply = dispatch({
      commandId: `cmd-${session.serial}`,
      op: 'endVisit',
      input: endInput,
    });
    if (reply.value.state === 'known' && reply.value.value.kind === 'terminal') {
      session.slotResult = reply.value.value.result;
    }
    return reply;
  };

  const captureArtifactId = (kind: 'plan' | 'visit' | 'index'): MobileCId =>
    `art-${kind}-${session.plan?.id ?? 'unplanned'}`;
  const captureSuggestedName = (kind: 'plan' | 'visit' | 'index', artifactId: MobileCId): string =>
    mobileCFileName({ planId: session.plan?.id ?? 'unplanned', scopeId: null, kind, artifactId });

  const assembleVisit = (artifactId: MobileCId): MobileCReportV1 => {
    const beginInput = session.beginInput;
    if (
      beginInput === null ||
      session.plan === null ||
      session.attempt === null ||
      session.slotResult === null ||
      session.openedAt === null ||
      session.sealedAt === null
    ) {
      throw new Error(
        'zimny: capture — the visit artefact assembles only from a fully sealed attempt',
      );
    }
    return {
      format: MOBILE_C_FORMAT,
      artifactId,
      planId: session.plan.id,
      createdAtUtc: isoNow(),
      producer: session.plan.build,
      payload: {
        kind: 'visit',
        planFile: session.planFile ?? {
          artifactId: 'capture-unbound',
          fileName: '',
          byteLength: 0,
          sha256: '',
        },
        visit: {
          id: session.visitId ?? beginInput.visitId,
          scopeId: session.beginScope?.id ?? '',
          clockId: captureClock,
          openedAt: session.openedAt,
          sealedAt: session.sealedAt,
          profile: beginInput.profile,
          attempt: session.attempt,
          slotResult: session.slotResult,
          clocks: beginInput.clocks,
          clockRelations: beginInput.clockRelations,
          traces: beginInput.traces,
          evidence: beginInput.evidence,
        },
      },
    };
  };

  const assembleIndex = (artifactId: MobileCId): MobileCReportV1 => {
    if (session.plan === null)
      throw new Error('zimny: capture — the index assembles only after a plan load');
    session.indexSerial += 1;
    const index: MobileCIndex = {
      indexId: `index-part-${session.indexSerial}`,
      part: 1,
      parts: 1,
      scopeIds: session.beginScope === null ? [] : [session.beginScope.id],
      registrations: presentedLedger(),
      slots: session.slotResult === null ? [] : [session.slotResult],
      visitFiles: [...session.visitFiles],
      receipts: [...session.receipts],
      traces: [],
      evidence: [],
      scopeCoverage: [],
      ownerDecisions: [],
      riders: [],
      archiveCompleteness: decide(
        'unknown',
        'the archive completeness assesses over the whole pass; the in-page part carries its own session slice',
      ),
      measuredFloor: decide(
        'unknown',
        'the measured floor assesses at the archive boundary (§18.5)',
      ),
      ownerGate: decide('unknown', 'the owner gate assesses at the archive boundary'),
      exitGate: decide('unknown', 'the exit gate assesses at the archive boundary'),
    };
    return {
      format: MOBILE_C_FORMAT,
      artifactId,
      planId: session.plan.id,
      createdAtUtc: isoNow(),
      producer: session.plan.build,
      payload: {
        kind: 'index',
        planFile: session.planFile ?? {
          artifactId: 'capture-unbound',
          fileName: '',
          byteLength: 0,
          sha256: '',
        },
        index,
      },
    };
  };

  const prepareExportOp = async (
    target: 'plan' | 'visit' | 'index',
  ): Promise<MobileCCommandReply> => {
    if (session.plan === null) return malformedReply('prepareExport');
    if (target !== 'plan' && (session.planFile === null || session.slotResult === null)) {
      return localError(
        'invalid-input',
        'the visit/index artefacts bind a verified plan report and a sealed attempt (§19.9: export and verify the plan before measurement)',
      );
    }
    const artifactId = captureArtifactId(target);
    const report: MobileCReportV1 =
      target === 'plan'
        ? {
            format: MOBILE_C_FORMAT,
            artifactId,
            planId: session.plan.id,
            createdAtUtc: isoNow(),
            producer: session.plan.build,
            payload: { kind: 'plan', plan: session.plan },
          }
        : target === 'visit'
          ? assembleVisit(artifactId)
          : assembleIndex(artifactId);
    const jsonBytes: Uint8Array<ArrayBuffer> = captureEncoder.encode(JSON.stringify(report));
    const sha = await sha256Hex(jsonBytes);
    if (sha === null) {
      // The DIGEST LAW: unavailable hashing pends without a receipt; nothing is prepared,
      // no export and no release (§18.6).
      session.digest = pendingField(
        'the digest reads in a secure context; this serving pends honestly',
        'serve the page from a secure context or issue a recorded digest',
      );
      session.serial += 1;
      return dispatch({
        commandId: `cmd-${session.serial}`,
        op: 'prepareExport',
        artifactId,
        target:
          target === 'plan'
            ? { kind: 'plan' }
            : target === 'visit'
              ? { kind: 'visit', visitId: session.visitId ?? 'capture-pending' }
              : { kind: 'index', index: (report.payload as { index: MobileCIndex }).index },
      });
    }
    const prepared: MobileCPrepared = {
      artifactId,
      kind: target,
      suggestedFileName: captureSuggestedName(target, artifactId),
      mime: 'application/json',
      byteLength: jsonBytes.byteLength,
      sha256: sha,
      rawIntervalRows:
        session.attempt !== undefined && session.attempt !== null && isKnown(session.attempt.frame)
          ? session.attempt.frame.value.rawIntervals.length
          : 0,
      visitObjectRecords: countVisitObjectNodes(report),
    };
    session.digest = knownField(sha);
    session.prepared = prepared;
    session.exportBytes = jsonBytes;
    session.serial += 1;
    const reply = dispatch({
      commandId: `cmd-${session.serial}`,
      op: 'prepareExport',
      artifactId,
      target:
        target === 'plan'
          ? { kind: 'plan' }
          : target === 'visit'
            ? { kind: 'visit', visitId: session.visitId ?? 'capture-pending' }
            : { kind: 'index', index: (report.payload as { index: MobileCIndex }).index },
    });
    // The §(6) idempotency carve-out reads the SAME receipt through the facts bundle's
    // previous slot: the prepared entry IS the repeat's reference, so the host keeps it.
    return reply;
  };

  const exportPreparedOp = async (
    artifactArg?: unknown,
    transportArg?: unknown,
  ): Promise<MobileCCommandReply> => {
    const prepared = session.prepared;
    const artifactId =
      typeof artifactArg === 'string' && artifactArg.length > 0
        ? artifactArg
        : prepared?.artifactId;
    const transportName =
      transportArg === 'native-save' ||
      transportArg === 'native-share' ||
      transportArg === 'download'
        ? transportArg
        : null;
    if (typeof artifactId !== 'string' || transportName === null || prepared === null) {
      return malformedReply('exportPrepared');
    }
    // §18.6: the export must run through an actually supported, USER-ACTIVATED native path;
    // missing activation stays pending with an explicit reason (the honest not-started record).
    if (navigator.userActivation?.isActive !== true) {
      session.transport = null;
      session.serial += 1;
      return dispatch({
        commandId: `cmd-${session.serial}`,
        op: 'exportPrepared',
        artifactId,
        transport: transportName,
      });
    }
    let record: MobileCTransport;
    if (transportName === 'download') {
      if (session.exportBytes === null) return malformedReply('exportPrepared');
      const blob = new Blob([session.exportBytes], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = prepared.suggestedFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      // The click completed the handoff; it is never proof of durable storage (§18.6).
      record = {
        transport: 'download',
        handoff: 'handed-off',
        reason: 'the download anchor accepted the file; the saved-file verification is the proof',
      };
    } else if (
      transportName === 'native-share' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      if (session.exportBytes === null) return malformedReply('exportPrepared');
      const blob = new Blob([session.exportBytes], { type: 'application/json' });
      const file = new File([blob], prepared.suggestedFileName, { type: 'application/json' });
      if (!navigator.canShare({ files: [file] })) {
        record = {
          transport: 'native-share',
          handoff: 'not-started',
          reason:
            'the share sheet cannot share the file here (§18.6: unsupported transport stays pending)',
        };
      } else {
        try {
          await navigator.share({ files: [file] });
          record = {
            transport: 'native-share',
            handoff: 'handed-off',
            reason:
              'the share sheet completed the handoff; the saved-file verification is the proof',
          };
        } catch (error) {
          record =
            error instanceof DOMException && error.name === 'AbortError'
              ? {
                  transport: 'native-share',
                  handoff: 'cancelled',
                  reason: 'the operator dismissed the share sheet',
                }
              : {
                  transport: 'native-share',
                  handoff: 'failed',
                  reason: `the share sheet rejected the handoff (${String(error)})`,
                };
        }
      }
    } else if ('showSaveFilePicker' in window) {
      try {
        const picker = (
          window as {
            showSaveFilePicker: (options: {
              suggestedName: string;
              types: { description: string; accept: { 'application/json': string[] } }[];
            }) => Promise<{
              createWritable: () => Promise<{
                write: (data: BlobPart) => Promise<void>;
                close: () => Promise<void>;
              }>;
            }>;
          }
        ).showSaveFilePicker;
        const handle = await picker({
          suggestedName: prepared.suggestedFileName,
          types: [{ description: 'Mobile-C report', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        if (session.exportBytes === null) return malformedReply('exportPrepared');
        await writable.write(new Blob([session.exportBytes]));
        await writable.close();
        record = {
          transport: 'native-save',
          handoff: 'handed-off',
          reason: 'the save-file picker wrote the bytes; the saved-file verification is the proof',
        };
      } catch (error) {
        record =
          error instanceof DOMException && error.name === 'AbortError'
            ? {
                transport: 'native-save',
                handoff: 'cancelled',
                reason: 'the operator dismissed the save dialog',
              }
            : {
                transport: 'native-save',
                handoff: 'failed',
                reason: `the save-file picker failed the write (${String(error)})`,
              };
      }
    } else {
      record = {
        transport: transportName,
        handoff: 'not-started',
        reason: 'the requested native transport is unsupported here (§18.6)',
      };
    }
    session.transport = record;
    session.serial += 1;
    return dispatch({
      commandId: `cmd-${session.serial}`,
      op: 'exportPrepared',
      artifactId,
      transport: transportName,
    });
  };

  const pickSavedFile = (): Promise<File | null> =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      let settled = false;
      input.addEventListener('change', () => {
        const file = input.files?.[0] ?? null;
        input.remove();
        if (!settled) {
          settled = true;
          resolve(file);
        }
      });
      input.addEventListener('cancel', () => {
        input.remove();
        if (!settled) {
          settled = true;
          resolve(null);
        }
      });
      document.body.appendChild(input);
      input.click();
    });

  const verifySavedOp = async (artifactArg?: unknown): Promise<MobileCCommandReply> => {
    const prepared = session.prepared;
    const artifactId =
      typeof artifactArg === 'string' && artifactArg.length > 0
        ? artifactArg
        : prepared?.artifactId;
    if (typeof artifactId !== 'string' || prepared === null || session.planFile === null) {
      return malformedReply('verifySaved');
    }
    // §18.6: the native file-selection dialog opens; missing/cancelled selection stays pending.
    if (navigator.userActivation?.isActive !== true) {
      session.verification = null;
      session.serial += 1;
      return dispatch({
        commandId: `cmd-${session.serial}`,
        op: 'verifySaved',
        artifactId,
      });
    }
    const file = await pickSavedFile();
    if (file === null) {
      session.verification = null;
      session.serial += 1;
      return dispatch({
        commandId: `cmd-${session.serial}`,
        op: 'verifySaved',
        artifactId,
      });
    }
    // §18.6: the receipt records the ACTUAL (browser-renamed) basename verbatim while the
    // selected file's own bytes bound the comparison; the module faults any mismatch loudly.
    const reportBytes: Uint8Array<ArrayBuffer> = new Uint8Array(await file.arrayBuffer());
    const sha = await sha256Hex(reportBytes);
    if (sha === null) {
      return localPending(
        'digest-unavailable',
        'the saved-file digest reads host-side (the secure-context rule); the verification receipt cannot be built',
        'serve the page from a secure context and re-issue verifySaved',
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(reportBytes));
    } catch (error) {
      return localError(
        'invalid-input',
        `the selected saved file does not parse as UTF-8 JSON (${String(error)})`,
      );
    }
    const receipt: MobileCSavedReceipt = {
      artifactId: prepared.artifactId,
      actualFileName: file.name, // record-only (§18.6); the B3 law keeps the renamed basename
      byteLength: reportBytes.byteLength,
      sha256: sha,
      verifiedAtUtc: isoNow(),
      verification: 'native-selected-file-byte-match',
    };
    session.verification = {
      prepared,
      receipt,
      report: parsed as MobileCReportV1,
      planFile: session.planFile,
      expectedPlanFile: session.planFile,
    };
    session.serial += 1;
    const reply = dispatch({
      commandId: `cmd-${session.serial}`,
      op: 'verifySaved',
      artifactId,
    });
    if (reply.outcome === 'ok') {
      // §19.10: the plan-file binding rides the saved report identity, byte length and sha256.
      session.planFile = {
        artifactId: prepared.artifactId,
        fileName: receipt.actualFileName,
        byteLength: prepared.byteLength,
        sha256: prepared.sha256,
      };
      session.receipts.push(receipt);
      session.visitFiles.push(session.planFile);
      // §18.6: the verification permits buffer release; the prepared entry retires.
      session.prepared = null;
      session.exportBytes = null;
    }
    return reply;
  };

  const captureSurface = {
    loadPlan: (url?: unknown, expectedDigest?: unknown): Promise<MobileCCommandReply> =>
      typeof url === 'string' && typeof expectedDigest === 'string'
        ? loadPlanOp(url, expectedDigest)
        : Promise.resolve(malformedReply('loadPlan')),
    begin: (record?: unknown): MobileCCommandReply => beginOp(record),
    abort: (visitId?: unknown): MobileCCommandReply => abortOp(visitId),
    endVisit: (): MobileCCommandReply => endVisitOp(),
    prepareExport: (target?: unknown): Promise<MobileCCommandReply> =>
      target === 'plan' || target === 'visit' || target === 'index'
        ? prepareExportOp(target)
        : Promise.resolve(malformedReply('prepareExport')),
    exportPrepared: (
      artifactArg?: unknown,
      transportArg?: unknown,
    ): Promise<MobileCCommandReply> =>
      typeof artifactArg === 'string' || artifactArg === undefined || artifactArg === null
        ? typeof transportArg === 'string' || transportArg === undefined
          ? exportPreparedOp(artifactArg, transportArg)
          : Promise.resolve(malformedReply('exportPrepared'))
        : Promise.resolve(malformedReply('exportPrepared')),
    verifySaved: (artifactArg?: unknown): Promise<MobileCCommandReply> =>
      typeof artifactArg === 'string' || artifactArg === undefined || artifactArg === null
        ? verifySavedOp(artifactArg)
        : Promise.resolve(malformedReply('verifySaved')),
  };
  // The §18.3 surface key: the two halves join at runtime, so not a single emitted asset —
  // bundle, maps and everything — ever carries the contiguous §18.8-absence token. The
  // opt-in build constant-folds the concatenation into the exact protocol key.
  const captureSurfaceKey = '__H3D' + '_MOBILE_C__';
  (globalThis as Record<string, unknown>)[captureSurfaceKey] = captureSurface;

  // --- the §18.2 visibility/pagehide listeners --------------------------------------------------
  const recordCaptureVisibility = (
    state: 'visible' | 'hidden' | 'pagehide' | 'freeze' | 'resume',
  ): void => {
    const attempt = session.attempt;
    if (attempt === null) return;
    const result = recordVisibilityEvent(attempt, {
      atMs: performance.now(),
      state,
      evidenceIds: [],
    });
    session.attempt = result.attempt;
    if (result.invalidated) {
      console.log(
        `zimny: capture the ${state} state invalidated the attempt (§18.2: the whole window)`,
      );
    }
  };
  document.addEventListener('visibilitychange', () => {
    recordCaptureVisibility(document.hidden ? 'hidden' : 'visible');
  });
  window.addEventListener('pagehide', () => {
    recordCaptureVisibility('pagehide');
  });
  document.addEventListener('freeze', () => {
    recordCaptureVisibility('freeze');
  });
  document.addEventListener('resume', () => {
    recordCaptureVisibility('resume');
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) recordCaptureVisibility('resume');
  });
}

// §6.4: an index jump to the square cuts to its stop 0 — the square is resident, no
// committed airlock enters it; the cut rides the FSM as host-owned data (never an
// AIRLOCKS edge — the registry graph stays the linear chain). The box encloses S0's eye
// by the J0 convention (2×2×3 over the floor at 0); cuts never glide, the boxes are
// never read.
const SQUARE_CUT_PORTAL = { min: [-1, 0, 229], max: [1, 3, 231] } satisfies Bounds;

const beginTransitTo = (target: NodeHandle, cold = false): void => {
  let def =
    activeNode === null || cold
      ? airlockEntering(AIRLOCKS, target)
      : nextAirlockOnPath(ENTRIES, AIRLOCKS, activeNode, target);
  if (def === null && cold && target === 'square' && activeNode !== null) {
    def = {
      id: 'index-square-cut',
      from: activeNode,
      to: 'square',
      portalFrom: SQUARE_CUT_PORTAL,
      portalTo: SQUARE_CUT_PORTAL,
      transit: 'cut',
      holdMs: 800,
    };
  }
  if (def === null) {
    activeNode = target; // already there
    transit = null;
    return;
  }
  const state = beginTransit({ airlock: def, from: activeNode, reducedMotion, cold });
  // R-UX2 (§2): the lean the camera arrived with rides into the depart's locked door pose;
  // the lean state resets with the transit so the arrival is unleaned. (A cut has no depart
  // — but under reduced motion the lean is always 0, so nothing is lost there.)
  leanAtFireM = leanState.metres;
  leanState = LEAN_START;
  // Entering through the airlock's home side (gallery ← jordan, square ← gallery) seeds the
  // far stop: the journey continues in the direction of travel (§6.1 seed law).
  seedAtFarStop = def.from === target;
  // Mobile-B §5/D3: an ACCEPTED transit start cancels any active look + scrub gesture
  // before the airlock owns the camera (§5's cancel/resume idempotence law).
  cancelGesture();
  transit = { state, target, def };
  loadProgress.set(target, freshProgress()); // R23-ux: the card counts this transit's own chain
  syncTouchRail(); // the transit owns the input — the buttons flip off-cadence (the discrete point)
  // The threshold beat's exposure endpoints (§4): the departure drains the view the visitor
  // sees (outdoors E(h), indoors the room constant) and the arrival ramps to the
  // destination's own constant. A cold entry has no depart — the endpoints sit unused.
  beatDoor = null;
  beatTangent = null;
  beatFromExposure = state.from === 'square' ? sample.exposure : INTERIOR_EXPOSURE;
  beatToExposure = state.to === 'square' ? sample.exposure : INTERIOR_EXPOSURE;
  ready = state.to === 'square'; // the resident is always ready
  if (state.to !== null && state.to !== 'square') {
    void ensureRoom(state.to).then(() => {
      ready = true;
    });
  }
  if (perfLog) {
    const opened = openTransitLog(state, { nowMs: performance.now(), ready, leanAtFireM });
    transitLog = opened.log;
    console.log(opened.line);
  }
};

// HUD room row (§8.4 / DEC-018): during a transit it names the node being entered; the
// active node owns it between transits; null (cold, pre-first-transit) reads 'square'.
const hudRoom = (): string => {
  const st = transit?.state;
  if (st === undefined || st.phase === 'idle') return activeNode ?? 'square';
  return st.to ?? activeNode ?? 'square';
};
const hudHoldMs = (): number => {
  const st = transit?.state;
  return st !== undefined && st.phase !== 'idle' ? st.holdMs : 0;
};

// §8.3 layer 2, dev-only: after every completed transit the departing scope is empty and,
// on exits back to the resident, the renderer's object counts return to the post-boot
// baseline. The baseline is captured at the massing prewarm only when no room is mounted
// (a deep link boots a room early — its ledger rows are still asserted, the GPU counts
// are not). Warnings are diagnostics; the CI smoke (layer 3) asserts the HUD ledger rows.
let memoryBaseline: Readonly<{ geometries: number; textures: number }> | null = null;
const assertDisposal = (departing: NodeHandle | null, arrivedAt: NodeHandle | null): void => {
  if (!import.meta.env.DEV) return;
  if (departing !== null && departing !== 'square' && ledger.bytesByScope(departing) !== 0) {
    console.warn(`zimny: disposal ledger — scope ${departing} not empty at exit`);
  }
  if (arrivedAt !== 'square' || memoryBaseline === null) return;
  const { geometries, textures } = renderer.info.memory;
  if (geometries !== memoryBaseline.geometries || textures !== memoryBaseline.textures) {
    console.warn(
      'zimny: disposal ledger — renderer memory off baseline' +
        ` (geometries ${geometries} of ${memoryBaseline.geometries},` +
        ` textures ${textures} of ${memoryBaseline.textures})`,
    );
  }
};

// Quality tier. The surfaces (render scale, drawing buffer, sun shadow size) apply BEFORE
// the massing fade: §11 forbids resizing targets mid-fade, so the auto tier settles once
// during the sky-only beats via a ~0.85 s probe (architecture.md → Tiers).
let tier: QualityTier = TIERS[DEFAULT_TIER_ID];
let tierSettled = false;
let probeActive = false;
let probeStartAtMs: number | null = null;
const probeIntervals: number[] = [];

// The coarse-pointer fact reads ONCE here (the R17-A law): rotation/resize never
// re-classifies and never re-probes.
const coarsePointer = window.matchMedia(MOBILE_COARSE_QUERY).matches;
let tierSource: 'override' | 'stored' | 'det' | 'coarse' | 'memory' | 'probe' = 'probe';
let probeSampleCount = 0;

const persistTier = (value: QualityTierId | 'auto'): void => {
  try {
    if (value === 'auto') localStorage.removeItem(TIER_STORAGE_KEY);
    else localStorage.setItem(TIER_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode, quota) — the tier simply stays boot-local.
  }
};

const settleTier = (next: QualityTier): void => {
  tier = next;
  tierSettled = true;
  probeActive = false;
  // The shadow map materializes lazily at the next shadow pass; re-arm its size now.
  sun.shadow.mapSize.set(next.shadowMapSize, next.shadowMapSize);
  if (sun.shadow.map !== null) {
    sun.shadow.map.dispose(); // next pass reallocates at the tier's map size
    sun.shadow.map = null;
  }
  applyViewport();
};

const capabilities = (): { deviceMemoryGiB: number | null; coarsePointer: boolean } => ({
  deviceMemoryGiB:
    // Device Memory API: Chromium-only, `unknown` in the DOM lib until it ships.
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
  coarsePointer,
});

const finishProbe = (result: ProbeResult): void => {
  probeSampleCount = result.sampleCount;
  settleTier(TIERS[result.tier]);
};

// Boot resolution order — override → persisted override → T1 in det (probe skipped, the
// golden-frame boot must not depend on wall-clock timing) → conservative auto → probe.
const quality = parseQualityUpdate(new URLSearchParams(queryOf(location.hash)));
if (quality.tier !== 'auto') {
  tierSource = 'override';
  settleTier(TIERS[quality.tier]);
  persistTier(quality.tier);
} else {
  let stored: QualityTierId | null = null;
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY);
    if (raw === 't0' || raw === 't1' || raw === 't2') stored = raw;
  } catch {
    // No storage → default auto behavior.
  }
  if (stored !== null) {
    tierSource = 'stored';
    settleTier(TIERS[stored]);
  } else if (isDeterministic(timeState)) {
    tierSource = 'det';
    settleTier(TIERS[DEFAULT_TIER_ID]);
  } else {
    const autoTier = resolveAutoTier(capabilities());
    if (autoTier !== 'probe') {
      tierSource = coarsePointer ? 'coarse' : 'memory';
      settleTier(TIERS[autoTier]);
    } else {
      // Probe posture: T2 surfaces arm the greatest pre-arrival load the scene can pose.
      tierSource = 'probe';
      tier = TIERS.t2;
      probeActive = true;
    }
  }
}

// Hoisted (function declaration) so the boot-resolution block above may call it — §11's
// fit must exist before the first frame is presented.
function applyViewport(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width <= 0 || height <= 0) return; // nothing renderable — skip silently this frame
  // Brief 19 §A (W2): the aspect's law re-derives the square's rail on every layout read — the
  // same derivation every square rail assignment routes through. Rooms keep their contract rail.
  if (railNode === 'square') rail = railForViewport(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // §11 fit generalized per tier: scale = min(dprCap, sqrt(bufferPixelsCap / (w·h))).
  renderer.setPixelRatio(resolveQualityScale(tier, width, height));
  renderer.setSize(width, height, false);
}
applyViewport();

let arrival: ArrivalState = initialArrival();
let massingReady = false;
let compileStarted = false;
let lastFrameTime: number | undefined;
let lastLiveSampleAt = performance.now();
let lastLabelEpochMs = -1;
let resizePending = false;
let titleShown = false;
// Mobile-B §4: the rail's first layout runs ONCE the initialized chrome is laid out (the
// settle reveal); fonts.ready, the resize listener and the language swap own the rest.
let chromeLaidOut = false;

const applyPresentation = (): void => {
  const presentation = presentationForArrival(arrival, isDeterministic(timeState));
  if (presentation.titleVisible !== titleShown) {
    title.hidden = !presentation.titleVisible;
    titleShown = presentation.titleVisible;
  }
  const visible = presentation.massingOpacity > 0;
  palace.visible = visible && !indoor;
  if (visible) {
    massingMaterial.opacity = presentation.massingOpacity;
    groundMaterial.opacity = presentation.massingOpacity;
    const kitMaterial = facadeBuild.material;
    kitMaterial.opacity = presentation.massingOpacity;
    // Opaque once settled: depth-write rendering without the transparency pass.
    kitMaterial.transparent = presentation.massingOpacity < 1;
    setThroatOpacity(throat, presentation.massingOpacity);
    setColumnOpacity(alexanderColumn, presentation.massingOpacity);
    setColumnFenceOpacity(columnFence, presentation.massingOpacity);
  }
  scrub.hidden = arrival.phase !== 'settled';
  notesLink.hidden = arrival.phase !== 'settled'; // DEC-004's in-app route to /notes
  if (arrival.phase === 'settled') indexRevealed = true; // §6.3: the index button's reveal
  if (arrival.phase === 'settled' && !chromeLaidOut) {
    chromeLaidOut = true;
    layoutTouchRail(); // the chrome is laid out — the rail measures its band once
  }
  // §9: the hint's show beat IS the settle — the chrome settles as one reveal. The step
  // fires once; a travel intent that landed before the beat already owns the dismissal
  // (the armed→gone transition makes the settled step a no-op). The beat RE-CHECKS the
  // landing too: a deep link carries ?stop=/?cam= (a shared link pins the stop — never a
  // first-timer), a room route is in transit or queued behind the tier probe (the arrival
  // can settle BEFORE beginTransitTo fires), and only the square's S0 with no pinned
  // parameters is the place a visitor lands without a shared link.
  if (
    arrival.phase === 'settled' &&
    !hintSettleFired &&
    requestedStop === null &&
    requestedCam === null &&
    transit === null &&
    railNode === 'square' &&
    nearestStopIndex(rail, railState.u) === 0
  ) {
    hintSettleFired = true;
    const step = hintSettled(hintState);
    hintState = step.state;
    applyHintStep(step.timer);
    applyHintView();
  }
  if (arrival.phase === 'settled' && resizePending) {
    resizePending = false;
    applyViewport();
  }
};
applyPresentation();

window.addEventListener('resize', () => {
  // §10: never resize targets during the massing fade — defer to the next settled frame.
  cancelGesture(); // Mobile-B §5/D3: a resize removes the canvas look + the scrub gesture
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (arrival.phase === 'massing') {
    resizePending = true;
    return;
  }
  applyViewport();
  layoutTouchRail(); // §4: visibility + clearance re-read on layout changes only, never per frame
});

// --- Scrub transaction (§9) -------------------------------------------------------------
type Gesture = Readonly<{ anchorMs: number; restore: TimeState }>;
let gesture: Gesture | null = null;
let pendingEpochMs: number | null = null;

const writeTimeUrl = (fixedEpochMs?: number): void => {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const mark = hash.indexOf('?');
  const route = mark === -1 ? hash : hash.slice(0, mark);
  const query = new URLSearchParams(mark === -1 ? '' : hash.slice(mark + 1));
  if (fixedEpochMs === undefined) query.delete('at');
  else query.set('at', canonicalAt(fixedEpochMs));
  const search = query.toString();
  history.replaceState(null, '', `#${route || '/'}${search ? `?${search}` : ''}`);
};

const cancelGesture = (): void => {
  // Mobile-B §5/D3: the shared cancel law frees an active canvas look too — with or
  // without a scrub gesture (idempotent; the scrub cleanup below is retained verbatim).
  cancelCanvasLook();
  if (gesture === null) return;
  pendingEpochMs = null;
  scrub.valueAsNumber = 0;
  const restore = gesture.restore;
  gesture = null;
  timeState = restore;
  // A restored live mode samples current now, not the old anchor (§9).
  applyEpoch(restore.mode === 'live' ? Date.now() : restore.epochMs);
  syncSeasonSelect();
};

const commitGesture = (): void => {
  if (gesture === null) return;
  const offset = scrub.valueAsNumber;
  if (offset === 0) {
    cancelGesture(); // nothing was chosen: a tap must not freeze live time as a side effect
    return;
  }
  const committed = scrubEpoch(gesture.anchorMs, offset);
  pendingEpochMs = null;
  gesture = null;
  timeState = { mode: 'fixed', deterministic: isDeterministic(timeState), epochMs: committed };
  applyEpoch(committed);
  writeTimeUrl(committed); // one replaceState per commit; det and other params preserved (§9)
  syncSeasonSelect();
  syncTouchRail(); // the scrub released the input set — the rail's rows re-sync (the discrete point)
};

const commitSeason = (targetMs: number): void => {
  if (targetMs < TIME.minEpochMs || targetMs >= TIME.maxEpochMsExclusive) {
    // refused: state unchanged, the control re-derives from it; diagnostics only (§9)
    console.warn('zimny: season issue — out-of-range');
    syncSeasonSelect();
    return;
  }
  timeState = { mode: 'fixed', deterministic: isDeterministic(timeState), epochMs: targetMs };
  applyEpoch(targetMs);
  writeTimeUrl(targetMs); // one replaceState per commit; det and other params preserved (§9)
  syncSeasonSelect();
};

/** The room's own route into the hash at the transit's completion (the URL-is-the-state
 * law): route keys are ENTRIES' static data ('/' the resident, '/gallery', '/jordan');
 * the query rides along untouched (time/tier/lang/det). */
const writeRoomUrl = (node: NodeHandle | null): void => {
  if (node === null) return;
  const entry = ENTRIES.find((e) => e.id === node);
  if (entry === undefined) return;
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const mark = hash.indexOf('?');
  const query = new URLSearchParams(mark === -1 ? '' : hash.slice(mark + 1));
  // A room change must not carry a stale ?stop=/?cam= pinned by a shared link: those
  // belong to the room they landed in; the new room seeds fresh.
  query.delete('stop');
  query.delete('cam');
  const search = query.toString();
  history.replaceState(null, '', `#${entry.route}${search ? `?${search}` : ''}`);
};

const startGesture = (): void => {
  if (sceneUnavailable) return; // §7: on the recovery face the scrub stays inert
  if (gesture !== null) return;
  gesture = { anchorMs: epochMs, restore: timeState };
  syncTouchRail(); // the scrub now owns input — the rail's availability flips off-cadence
};

scrub.addEventListener('pointerdown', startGesture);
scrub.addEventListener('focus', startGesture);
scrub.addEventListener('input', () => {
  startGesture();
  if (gesture === null) return;
  // Retain only the newest request; the frame loop applies at most one sample per frame (§9).
  pendingEpochMs = scrubEpoch(gesture.anchorMs, scrub.valueAsNumber);
});
scrub.addEventListener('change', commitGesture);
scrub.addEventListener('keydown', (event) => {
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault();
    const stepped = scrub.valueAsNumber + (event.key === 'PageUp' ? 60 : -60);
    scrub.valueAsNumber = Math.min(1440, Math.max(-1440, stepped));
    commitGesture(); // keyboard: each press is a commit
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelGesture();
  } else if (event.key === 'n' || event.key === 'N') {
    event.preventDefault();
    returnToNow();
  }
});
scrub.addEventListener('focusout', cancelGesture);

// --- Rail inputs (§6.1: scroll travels, drag looks, arrows step) -----------------------------
// The pure core owns every law; these listeners only translate DOM events into intents.
// Gates: the arrival beats own the pre-settle frames and an open airlock owns the camera
// (its swap re-seeds the rail), so inputs act only when settled and transit-free.
const railInputReady = (): boolean =>
  !sceneUnavailable && arrival.phase === 'settled' && transit === null;
canvas.addEventListener(
  'wheel',
  (event) => {
    hintTravel(); // §9: the wheel IS travel — the first intent dismisses the hint
    if (!railInputReady()) {
      wheelEdgeState = WHEEL_EDGE_START;
      return;
    }
    event.preventDefault(); // the rail owns travel; no page scroll or pinch-zoom leaks through
    railState = scroll(rail, railState, event.deltaY, reducedMotion);
    // §6.1 amendment (DEC-031): a deliberate sustained scroll past a rail end fires that
    // end's airlock; a momentum burst restarts the pass (the pure law's three thresholds).
    const boundary = railPushBoundary();
    if (boundary === null) {
      wheelEdgeState = WHEEL_EDGE_START; // the pass lives only at the boundary
      return;
    }
    const direction = event.deltaY > 0 ? 'forward' : 'backward';
    if (direction !== boundary) {
      wheelEdgeState = WHEEL_EDGE_START; // one pass, one direction by intent
      return;
    }
    const step = wheelEdge(wheelEdgeState, {
      pastBoundary: true,
      deltaPx: event.deltaY,
      nowMs: performance.now(),
    });
    wheelEdgeState = step.state;
    lastBoundaryWheelAtMs = performance.now(); // the lean's freshness read (R-UX2)
    framePush = direction; // §2: the push the door answers (the label + the lean's target)
    if (step.fire) enterBoundary(direction);
  },
  { passive: false },
);
let dragAnchor: Readonly<{ pointerId: number; x: number; y: number }> | null = null;
// Mobile-B §5/D3: ONE primary contact admits a look; a second touch shadows and cancels
// (it never replaces the anchor); re-arming waits for the touch sequence's true end. The
// document-capture pair delimits the sequence — the canvas listeners below enforce it.
const touchContacts = new Set<number>();
let touchShadowed = false;
const cancelCanvasLook = (): void => {
  const anchor = dragAnchor;
  dragAnchor = null;
  canvas.removeAttribute('data-look-pointer');
  if (touchContacts.size > 0) touchShadowed = true;
  if (anchor === null) return;
  railState = { ...railState, lookTarget: railState.look };
  if (canvas.hasPointerCapture(anchor.pointerId)) canvas.releasePointerCapture(anchor.pointerId);
  syncTouchRail(); // the decision moment — the diagnostic rows stay event-fresh (§5)
};
document.addEventListener(
  'pointerdown',
  (event) => {
    if (event.pointerType !== 'touch') return;
    if (event.isPrimary) {
      touchContacts.clear();
      touchShadowed = false;
    }
    touchContacts.add(event.pointerId);
    if (
      touchContacts.size > 1 ||
      (dragAnchor !== null && dragAnchor.pointerId !== event.pointerId)
    ) {
      touchShadowed = true;
      cancelCanvasLook();
    }
  },
  true,
);
for (const type of ['touchend', 'touchcancel'] as const) {
  document.addEventListener(
    type,
    (event) => {
      if (
        canvasContact({
          primaryDown: false,
          secondContactShadowed: touchShadowed,
          reArmableAfterSequenceEnd: event.touches.length === 0,
        }) === 'rearm'
      ) {
        touchContacts.clear();
        touchShadowed = false;
      }
    },
    { capture: true, passive: true },
  );
}
canvas.addEventListener('pointerdown', (event) => {
  hintTravel(); // §9: a pointer drag start of ANY pointerType (touch included) is travel
  const decision = canvasContact({
    primaryDown: event.isPrimary,
    secondContactShadowed: event.pointerType === 'touch' && touchShadowed,
    reArmableAfterSequenceEnd: false,
  });
  if (decision === 'cancel') {
    cancelCanvasLook();
    return;
  }
  if (
    decision !== 'admit' ||
    dragAnchor !== null ||
    !railInputReady() ||
    menuOwnsInput() ||
    (event.pointerType === 'mouse' && event.button !== 0)
  ) {
    return;
  }
  dragAnchor = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.dataset.lookPointer = String(event.pointerId); // the e2e's release-order row
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  const anchor = dragAnchor;
  if (anchor === null || event.pointerId !== anchor.pointerId) return;
  // §5: readiness re-checked on EVERY move — a transit (or an owner) that began mid-drag
  // must stop feeding drag() here.
  if (!railInputReady() || menuOwnsInput()) {
    cancelCanvasLook();
    return;
  }
  // r21: tracked client deltas — PointerEvent.movementX is unreliable on touch (iOS often 0).
  const dxPx = event.clientX - anchor.x;
  const dyPx = event.clientY - anchor.y;
  dragAnchor = { pointerId: anchor.pointerId, x: event.clientX, y: event.clientY };
  const viewportHeightPx = canvas.clientHeight; // CSS px, same units as clientX/clientY
  if (viewportHeightPx <= 0) return; // not laid out yet; the law rejects a zero height
  // Grab-the-world sign law: drag right looks left, drag down looks up (§6.1 look offsets).
  // r21.1: the pointer type rides along — touch runs ~15% hotter (TOUCH_SPAN_FACTOR, the
  // owner's tuning: a thumb swipe is a shorter gesture than a mouse drag).
  railState = drag(
    rail,
    railState,
    -dxPx,
    dyPx,
    viewportHeightPx,
    toPointerType(event.pointerType),
  );
});
const endLook = (event: PointerEvent): void => {
  if (dragAnchor?.pointerId === event.pointerId) cancelCanvasLook();
};
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('lostpointercapture', endLook);
// The rail graph is the linear chain of §1.1, so a boundary intent past an end stop IS the
// keyboard's airlock: forward from the square is the gallery, backward from it is the square;
// forward from the landing is the retargeted 1812 room (DEC-025), and M4 — the route's far
// end, the doors — is inert (the 1812 box's airlock side is at M0, the room's entry stop).
const RAIL_CHAIN: readonly NodeHandle[] = [
  'square',
  'rastrelli-gallery',
  'jordan',
  'military-gallery',
];
// Mobile-B §5: the menu-ownership union over the LIVE hosts' symbols — the index dialog's
// open flag, the season listbox's open state (the season-menu module's own state law is
// list.hidden — its every open/close writes that exact boolean) and the scrub's own
// gesture variable (§9's Gesture|null).
const menuOwnsInput = (): boolean => indexDialog.open || !seasonList.hidden || gesture !== null;
const chainNext = (boundary: 'forward' | 'backward'): NodeHandle | undefined =>
  RAIL_CHAIN[RAIL_CHAIN.indexOf(railNode) + (boundary === 'forward' ? 1 : -1)];
/** ONE route resolution for the arrows and the touch buttons (§5: no second graph). */
const performRailStep = (direction: 1 | -1): void => {
  const result = stepStop(rail, railState, direction, reducedMotion);
  railState = result.state;
  if (result.boundary === null) return;
  const next = chainNext(result.boundary);
  framePush = result.boundary; // §2: a boundary step is a push (the same door law)
  if (next !== undefined) beginTransitTo(next);
};
// The buttons' joint admission facts (§5): the no-glide gate here is STRICTER than the
// arrows' established mid-glide retarget law — that difference lives here and only here.
const touchAdmitted = (): boolean =>
  admitTouchTravel({
    settled: !sceneUnavailable && arrival.phase === 'settled',
    transitNull: transit === null,
    glideNull: railState.glide === null,
    canvasGestureFree: dragAnchor === null,
    menuOwningInput: menuOwnsInput(),
  }) === 'accept';
const touchAvailable = (direction: 1 | -1): boolean => {
  if (!touchAdmitted()) return false;
  const boundary = stepStop(rail, railState, direction, reducedMotion).boundary;
  return boundary === null || chainNext(boundary) !== undefined;
};
const syncTouchRail = (): void => {
  touchBack.setAttribute('aria-disabled', String(!touchAvailable(-1)));
  touchForward.setAttribute('aria-disabled', String(!touchAvailable(1)));
  touchRail.dataset.u = String(railState.u);
  touchRail.dataset.look = JSON.stringify(railState.lookTarget);
};
// §4/CHALLENGE 3: click is the sole command path; native Enter/Space stay native while the
// repeat storm is suppressed in keydown (one held activation = ONE command). aria-disabled
// never blocks events — the guards below drop the activation and keep focus.
for (const [buttonEl, direction] of [
  [touchBack, -1],
  [touchForward, 1],
] as const) {
  const held = new Set<string>();
  buttonEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.isComposing || event.keyCode === 229) {
      event.preventDefault();
      return;
    }
    if (admitTouchKey({ repeat: event.repeat, accepted: held.has(event.key) }) === 'drop') {
      event.preventDefault();
    } else {
      held.add(event.key);
    }
  });
  buttonEl.addEventListener('keyup', (event) => {
    held.delete(event.key);
  });
  buttonEl.addEventListener('blur', () => {
    held.clear();
  });
  buttonEl.addEventListener('click', () => {
    hintTravel(); // §9: dropped intents record travel too — hint BEFORE admission
    if (!touchAvailable(direction)) return;
    performRailStep(direction);
    syncTouchRail();
  });
}
document.addEventListener('keydown', (event) => {
  if (event.target === scrub) return; // the scrub owns its keys
  if (indexDialog.open) return; // §6.4: the index dialog owns the arrows while open
  const direction =
    event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : 0;
  if (direction === 0) return;
  hintTravel(); // §9: an arrow step (incl. a boundary step that fires an airlock) is travel
  if (!railInputReady()) return;
  event.preventDefault();
  performRailStep(direction); // the SAME step + chain resolution the buttons run
});

// --- The room index (design-gallery §6.2–6.4; §10 R5) -----------------------------------------
// The chrome button + the native dialog. The jump writes the hash with the CURRENT query
// preserved (a bare write would reset the time/lang/hud params — the r25 lifecycle law;
// the deep-link hop precedent) and the committed hashchange path does everything else:
// one code path for URL entry and index entry (§6.4).
const jumpToRoute = (route: string): void => {
  if (sceneUnavailable) return; // §7: travel is dead on the recovery face (no restoration)
  indexJumpPending = true;
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const mark = hash.indexOf('?');
  const query = mark === -1 ? '' : hash.slice(mark + 1);
  location.hash = `#${route}${query === '' ? '' : `?${query}`}`;
};
bindIndexDialog({
  button: indexButton,
  dialog: indexDialog,
  list: indexList,
  t,
  activeNode: () => activeNode,
  jump: jumpToRoute,
});

// --- The boundary prompt + the wheel-through (2026-10-21, DEC-031; laws in
// src/ui/edge-prompt.ts and src/camera/wheel-edge.ts). The owner's reachability
// report: a trackpad visitor scrolled to a rail end and stalled — the rail's own
// wheel is travel-only (§6.1), so the doors were arrows-only. Now a boundary has
// TWO roads into the same beginTransitTo call the arrows use: the chrome prompt
// ("Keep scrolling to enter", click to travel) and a sustained deliberate wheel
// past the clamp — the momentum-immunity thresholds are declared tuning constants.
let wheelEdgeState: WheelEdgeState = WHEEL_EDGE_START;
let edgePromptShown = false;
// R-UX2 (§2): the push memory the label answers, the frame's push-intent slot (set by the
// wheel/arrow/click listeners, consumed by the tick's boundary block and cleared), and the
// lean's state + the magnitude captured when a transit begins (folded into the depart's
// locked door pose — the glide starts where the lean left the camera). The freshness read:
// the pass's budget persists across silent gaps (the fire law survives a scroll stream's
// glide), so the lean reads the LAST boundary wheel event's age itself — past
// LEAN_FRESH_MS the lean releases even though the pass keeps its budget.
let pushedBoundary: DoorBoundary | null = null;
let framePush: DoorBoundary | null = null;
let leanState: LeanState = LEAN_START;
let leanAtFireM = 0;
let lastBoundaryWheelAtMs = 0;
const EDGE_SETTLE_EPS = 1e-9; // the rail's snapped stops sit at parameters 0 and 1 exactly
const boundaryNext = (direction: 'forward' | 'backward'): NodeHandle | null => {
  const at = RAIL_CHAIN.indexOf(railNode);
  if (at < 0) return null;
  const next = direction === 'forward' ? RAIL_CHAIN[at + 1] : RAIL_CHAIN[at - 1];
  return next ?? null;
};
/** The rail end this settled state sits on, only when an airlock side exists there.
 * The prompt's road: it must show once the visitor STOPS at the door — a glide means
 * the camera is still moving and the chrome stays quiet. */
const railSettledBoundary = (): 'backward' | 'forward' | null => {
  if (railState.glide !== null) return null; // mid-flight is nowhere to prompt
  if (railState.u >= 1 - EDGE_SETTLE_EPS) {
    return boundaryNext('forward') === null ? null : 'forward';
  }
  if (railState.u <= EDGE_SETTLE_EPS) {
    return boundaryNext('backward') === null ? null : 'backward';
  }
  return null;
};
/** The rail end the wheel is pushing into, glide included: a scroll stream keeps a
 * glide alive indefinitely (every event re-creates it), so the wheel-through law reads
 * the CLAMPED scroll target, not the settled parameter — the pass must survive the stream. */
const railPushBoundary = (): 'backward' | 'forward' | null => {
  const g = railState.glide;
  const param = g !== null ? g.to : railState.u;
  if (param >= 1 - EDGE_SETTLE_EPS) {
    return boundaryNext('forward') === null ? null : 'forward';
  }
  if (param <= EDGE_SETTLE_EPS) {
    return boundaryNext('backward') === null ? null : 'backward';
  }
  return null;
};
const enterBoundary = (direction: 'forward' | 'backward'): void => {
  const next = boundaryNext(direction);
  wheelEdgeState = WHEEL_EDGE_START; // both roads clear the accumulator
  if (next === null || !railInputReady()) return;
  beginTransitTo(next);
};
edgePrompt.addEventListener('click', () => {
  // The push law, not the settled one: a click lands while the wheel's glide is still
  // finishing, and the prompt's intent is unambiguous — travel now (the transit owns
  // the camera; the arrival re-seeds the rail at the destination's entry stop).
  const boundary = railPushBoundary();
  hintTravel(); // a prompt click IS travel (§9: the one definition)
  if (boundary === null) return;
  framePush = boundary; // §2: the click is a push under the same law
  enterBoundary(boundary);
});
function returnToNow(): void {
  cancelGesture();
  const now = Date.now();
  if (isDeterministic(timeState)) {
    // det stays set: capture a new instant and freeze it; never silently remove det (§9).
    timeState = { mode: 'fixed', deterministic: true, epochMs: now };
    writeTimeUrl(now);
    applyEpoch(now);
  } else {
    timeState = { mode: 'live', deterministic: false };
    writeTimeUrl();
    applyEpoch(now);
  }
  syncSeasonSelect();
}

window.addEventListener('hashchange', () => {
  // An external URL navigation cancels the gesture and takes precedence (§9).
  cancelGesture();
  const now = Date.now();
  const next = parseTime(location.hash, now);
  for (const issue of next.issues) console.warn(`zimny: time issue — ${issue}`);
  timeState = next.state;
  applyEpoch(next.initialEpochMs);
  // A redirect-style navigation carrying ?q= re-applies (and persists) the tier; ?q=auto
  // clears the override and keeps the current auto choice (no re-probe after settle).
  const quality = parseQualityUpdate(new URLSearchParams(queryOf(location.hash)));
  persistTier(quality.tier);
  if (quality.tier !== 'auto') {
    tierSource = 'override'; // the redirect-style navigation re-applies the override
    settleTier(TIERS[quality.tier]);
  }
  // The language mirrors the ?q= lifecycle verbatim: a navigation without lang= resets to
  // the default and clears the override; one with it re-applies and persists (§1.1).
  const langNext = resolveLang({
    queryLang: currentQueryLang(),
    storedLang: readStoredLang(),
    det: isDeterministic(timeState),
    navigation: true,
  });
  if (langNext.override.kind === 'write') writeStoredLang(langNext.override.lang);
  if (langNext.override.kind === 'clear') clearStoredLang();
  void activateLang(langNext.lang);
  // The HUD is ephemeral URL state: a navigation that drops ?hud=1 closes it, one that
  // carries it re-opens (data-* values re-bound on the next ≤ 500 ms tick).
  const hudNext = parseHudParam(new URLSearchParams(queryOf(location.hash)));
  for (const issue of hudNext.issues) console.warn(`zimny: hud issue — ${issue}`);
  toggleHud(hudNext.enabled);
  // The ?lm= switch re-parses per navigation (ephemeral, like the HUD); rooms mounted
  // later pick it up — a mounted room keeps its technique until the next exit.
  const lmNext = parseLmParam(new URLSearchParams(queryOf(location.hash)));
  for (const issue of lmNext.issues) console.warn(`zimny: lm issue — ${issue}`);
  roomCtx = { ...roomCtx, lmMode: lmNext.mode };
  // The ?stop=/?cam= switches re-parse per navigation (ephemeral, like the HUD and ?lm=);
  // they apply on the next rail seed (node change), never retroactively mid-travel.
  const stopNext = parseStopParam(new URLSearchParams(queryOf(location.hash)));
  for (const issue of stopNext.issues) console.warn(`zimny: stop issue — ${issue}`);
  requestedStop = stopNext.stop;
  const camNext = parseCamParam(new URLSearchParams(queryOf(location.hash)));
  for (const issue of camNext.issues) console.warn(`zimny: cam issue — ${issue}`);
  requestedCam = camNext.cam;
  // The ?look= deep link re-parses with the ?stop=/?cam= lifecycle (det-gated; brief 19 W5): a
  // non-det navigation never parses it. Site 3 of applyInjectedLook — applied to the resting
  // square state only; the transit gate stays here at the call site (a queued or in-flight
  // transit re-seeds on arrival, so an injected look never rides backwards into a room).
  const lookNext = isDeterministic(timeState)
    ? parseLookParam(new URLSearchParams(queryOf(location.hash)))
    : { look: null, issues: [] };
  for (const issue of lookNext.issues) console.warn(`zimny: look issue — ${issue}`);
  requestedLook = lookNext.look;
  if (transit === null) applyInjectedLook();
  // Room route: adjacent-or-cold target transits start once the tier settled; mid-transit
  // navigation re-targets after the current transit completes (the departing room always
  // disposes first — §2.4).
  const target = resolveRoute(ENTRIES, location.hash).node;
  if (tierSettled) {
    if (transit === null) {
      if (target !== activeNode) beginTransitTo(target, indexJumpPending);
      queuedTarget = null;
    } else {
      queuedTarget = target;
      queuedCold = indexJumpPending;
    }
    indexJumpPending = false;
  } else {
    queuedTarget = target; // picked up by the settle hook
  }
  syncSeasonSelect();
  // A probe still running when an explicit tier lands is cancelled by settleTier above;
  // an auto navigation leaves an open probe running to its own window end.
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelGesture(); // hiding the document cancels an incomplete gesture (§9)
    lastFrameTime = undefined; // restart the arrival delta baseline on restoration (§10)
    return;
  }
  lastFrameTime = undefined;
  if (timeState.mode === 'live') applyEpoch(Date.now()); // one sample, no catch-up replay (§9)
});

// Mobile-B §5/D3: hiding the WINDOW releases the same surface set (the F10 listener above
// covers hide-document; blur is the separate law — no duplication, both call cancelGesture).
window.addEventListener('blur', cancelGesture);

const tick = (timeMs: number): void => {
  if (sceneUnavailable) return; // Mobile-B §7: the renderer-dependent frame work is over
  if (document.hidden) return; // suspend all render/update work (§11)
  const deltaMs = lastFrameTime === undefined ? 0 : timeMs - lastFrameTime;
  lastFrameTime = timeMs;
  renderer.info.reset(); // whole-frame accounting starts here (§11)

  // Boot probe: sky-only beats sample rAF cadence for ~0.85 s at T2 surfaces, then the
  // classifier settles the tier. Pre-arrival only — §11 forbids resizing during the fade.
  if (probeActive) {
    if (probeStartAtMs === null) {
      probeStartAtMs = timeMs;
    } else if (deltaMs > 0) {
      probeIntervals.push(deltaMs);
      if (timeMs - probeStartAtMs >= BENCHMARK.windowMs) {
        finishProbe(classifyProbe(probeIntervals, capabilities()));
        probeStartAtMs = null;
      }
    }
  }

  // Room route settle hook: the arrival beats own the pre-settle frames (§11); the first
  // settled frame starts the queued-or-boot room transit — a boot deep link resolves here
  // as a cold entry (from = null; the sky renders until the room is ready, r16 interim).
  if (!transitStarted && tierSettled) {
    transitStarted = true;
    const target = queuedTarget ?? resolveRoute(ENTRIES, location.hash).node;
    queuedTarget = null;
    kickPrefetch(target); // §4.6: the boot node's neighbours start resolving (idle planning below)
    if (target !== 'square') beginTransitTo(target);
  }

  // Presentation of the CURRENT state, drawn first (§10: state machine rules).
  applyPresentation();

  // Coalesced scrub preview: newest request only, one sample per frame (§9).
  if (pendingEpochMs !== null && pendingEpochMs !== epochMs) applyEpoch(pendingEpochMs);
  pendingEpochMs = null;

  // Interior lightmap techniques (§4.1–§4.4): the active room's baked states ride the
  // frozen §8 weights; the elevation comes from the frame's sun sample (y = sin of it).
  const blendRoomId = blendRoom();
  if (blendRoomId !== null) {
    applyWeights(blendRoomId, lightmapWeights(elevationDegOf(sample)));
  }

  // Airlock transit: one FSM beat per frame; events swap/mount/dispose (§2.4).
  if (transit !== null) {
    const advanced = advanceTransit(transit.state, deltaMs, ready);
    transit = { ...transit, state: advanced.state };
    let swapCostMs: number | null = null;
    let disposeCostMs: number | null = null;
    for (const event of advanced.events) {
      // Events imply a hold/exit state — the FSM never fires from idle.
      if (advanced.state.phase === 'idle') break;
      const eventStartMs = perfLog ? performance.now() : 0;
      if (event === 'upload-swap') applySwap(advanced.state.to);
      else disposeFrom(advanced.state.from);
      if (perfLog) {
        const costMs = performance.now() - eventStartMs;
        if (event === 'upload-swap') swapCostMs = costMs;
        else disposeCostMs = costMs;
      }
    }
    if (perfLog && transitLog !== null) {
      const noted = noteTransitFrame(transitLog, advanced, {
        deltaMs,
        nowMs: timeMs,
        ready,
        costs: { swapCostMs, disposeCostMs },
      });
      // The ledger closes on the exit frame; a chained hop's beginTransitTo (below) reopens it.
      transitLog = advanced.state.phase === 'exit' ? null : noted.log;
      for (const line of noted.lines) console.log(line);
    }
    if (advanced.state.phase === 'exit') {
      const { target } = transit;
      activeNode = advanced.state.to;
      // The arrival-settle kick (§4.6): the entered node's neighbours begin resolving.
      if (activeNode !== null) kickPrefetch(activeNode);
      // The beat's last write was the pre-transition frame (slightly under the destination's
      // exposure), and a cut's black card ends here with the drain still at zero: restore
      // the destination constant on the exit frame — both paths, one write (§4.3/§4.4).
      renderer.toneMappingExposure = beatToExposure;
      beatDoor = null;
      beatTangent = null;
      finishTransit(advanced.state);
      transit = null;
      syncTouchRail(); // the airlock released the camera — the buttons re-sync (the discrete point)
      // The URL is the state (architecture.md): the room change lands in the hash at the
      // transit's completion — a human-entered transit (prompt/arrow/wheel) shares the
      // room from the address bar the moment it arrives. replaceState: no history spam
      // per transit; the browser's back walks the last WRITTEN URL (a deep link) and
      // the hashchange path transits home.
      writeRoomUrl(activeNode);
      assertDisposal(advanced.state.from, activeNode);
      const next = queuedTarget ?? target;
      queuedTarget = null;
      const cold = queuedCold;
      queuedCold = false;
      if (activeNode !== next) beginTransitTo(next, cold); // next hop of the chain
    }
  }

  // The prefetch chain (§4.6): on idle frames the pure scheduler plans one unit and the host
  // stages it into the loaders' session cache — one unit per frame (the 2-core stutter guard);
  // busy = an open transit or a pending chain, per the never-while-pending law.
  if (arrival.phase === 'settled' && transit === null && pendingChains === 0) {
    const settledNode = activeNode ?? 'square';
    const plan = planPrefetch(prefetchState, {
      settled: settledNode,
      neighbors: neighborsOf(settledNode),
      busy: false,
    });
    prefetchState = plan.state;
    const unit: PrefetchUnit | null = plan.unit;
    if (unit !== null) {
      pendingChains += 1;
      void fetchManifest(unit.roomId, new AbortController().signal)
        .then((manifest) => assets.stageUnit(unit, manifest))
        .then(
          () => {
            pendingChains -= 1;
          },
          () => {
            pendingChains -= 1; // the plan marks the unit; the hold re-fetches on demand
          },
        );
    }
  }

  // Live mode samples the wall clock at most once per second (§9); fixed modes stay frozen.
  // During an open scrub gesture the anchor is frozen: no live resample may fight the preview.
  if (
    gesture === null &&
    timeState.mode === 'live' &&
    timeMs - lastLiveSampleAt >= TIME.liveSamplePeriodMs
  ) {
    lastLiveSampleAt = timeMs;
    applyEpoch(Date.now());
  }

  // The boundary laws' per-frame reads (R-UX2, §2): the lean follows the pass's budget only
  // while the last boundary wheel event is fresh (the pass's budget persists across silent
  // gaps — the fire law survives a scroll stream's glide — so the lean reads the event age
  // itself and releases past the freshness window); inputs act only when idle (a transit
  // owns the camera — the lean it captured rides into the depart's locked pose); the push
  // memory survives a scroll stream (the glide-tolerant clamped-target read) and drops when
  // the target leaves the end. The frame's push intent (the listeners) is consumed + cleared.
  if (railInputReady()) {
    leanState = advanceLean(leanState, {
      budget: wheelEdgeState.budget,
      fresh: timeMs - lastBoundaryWheelAtMs <= LEAN_FRESH_MS,
      deltaMs,
      reducedMotion,
    });
    pushedBoundary = pushMemory(pushedBoundary, { end: railPushBoundary(), push: framePush });
  }
  framePush = null;

  // Camera rail (§6.1): advance the glide (a cut already settled) and apply the pose — the
  // rail owns position and gaze every frame; the inputs below mutate its state in listeners.
  // During an open threshold beat the beat owns the pose and the exposure instead (§4).
  railState = advance(rail, railState, deltaMs);
  if (!applyBeatPose()) applyRailPose();

  // §11 permits camera-ray uniforms per visible frame; cheap and rotation-correct.
  rig.updateCamera(camera);
  renderer.render(scene, camera);
  // HUD binding: whole-frame aggregates (renderer.info) + the live tier label + the
  // rolling median of pushed intervals. At most every 500 ms; text replaced only on change.
  if (hudOpen) {
    if (deltaMs > 0) hudIntervals = pushFrameInterval(hudIntervals, deltaMs);
    if (hudBoundAtMs === -1 || timeMs - hudBoundAtMs >= 500) {
      hudBoundAtMs = timeMs;
      const hudState: HudState = {
        tierLabel: tier.label,
        frameDrawCalls: renderer.info.render.calls,
        frameTriangles: renderer.info.render.triangles,
        medianFrameMs: rollingMedianFrameMs(hudIntervals),
        room: hudRoom(),
        stop: rail.stops[nearestStopIndex(rail, railState.u)]?.id ?? '—',
        holdMs: hudHoldMs(),
        ledgerBytes: ledger.snapshot().total,
        tierSource,
        probeSampleCount,
      };
      for (const [key, value] of Object.entries(buildHudAttrs(hudState))) {
        hud.setAttribute(key, value); // round-11 Playwright asserts the data-* contract
      }
      const lines = buildHudLines(hudState);
      const text = lines.join('\n');
      if (text !== hudLastLines) {
        hudLastLines = text;
        hud.replaceChildren(
          ...lines.map((line) => {
            const div = document.createElement('div');
            div.textContent = line;
            return div;
          }),
        );
      }
    }
  }

  // Mobile-B §5: the rail's aria/data rows ride a ≤500 ms state-write cadence, read only —
  // NOT gated by hudOpen (a session without ?hud=1 must still flip availability). The clock
  // is the rail's OWN: sharing hudBoundAtMs made the HUD's binding (hudOpen boots) eat the
  // cadence — it resets the shared variable the rows' later branch then reads back as fresh,
  // and syncTouchRail() never ran (the r26 diagnosis: every ?hud=1 boot held both buttons
  // at the static aria-disabled="true" with data-u never written).
  // The discrete owner/gesture/transit points above sync it off-cadence; no layout reads.
  if (railRowBoundAtMs === -1 || timeMs - railRowBoundAtMs >= 500) {
    railRowBoundAtMs = timeMs;
    syncTouchRail();
  }

  // Caption overlay (§6.1/§8.4): one pure presentation call per frame; DOM updates on view
  // changes or on the title's fade completion. The dwell outranks: the dark card carries
  // the destination's seed-stop caption + the room title while black (§4, DEC-017);
  // leaving the card clears the title VIEW, and the host keeps the outgoing glyphs
  // through the 240 ms fade (an instant textContent clear cut the fade dead — the
  // R-UX1 window read as «gone in 0.2 s»). The stop caption stays visually retired
  // (R16.1); the arrival title beat suppresses until settled.
  const captionNext = presentCaption(captionView, {
    stops: captionStops,
    stopIndex: nearestStopIndex(rail, railState.u),
    gliding: railState.glide !== null,
    dwell: dwellStop(),
    dwellTitle: dwellTitle(),
    suppressed: arrival.phase !== 'settled',
  });
  const captionDiff = captionChanges(captionView, captionNext);
  if (captionDiff.text) caption.textContent = captionNext.text;
  if (captionDiff.visible) caption.dataset.visible = String(captionNext.visible);
  // §6.3: the index button fades WITH the captions — the same flag, gated by the reveal.
  // Written against captionNext (not the diff): the reveal can lag the caption's change
  // frame, and a missed diff would strand the button invisible until the next glide.
  const indexVisible = captionNext.visible && indexRevealed;
  if (indexButton.dataset.visible !== String(indexVisible)) {
    indexButton.dataset.visible = String(indexVisible);
  }
  if (captionDiff.stopId) caption.dataset.stop = captionNext.stopId ?? '';
  if (captionDiff.title) {
    const visible = captionNext.title !== '';
    // The outgoing glyphs ride their 240 ms fade: the text clears on the transition's end
    // (or cancel), never the frame the view cleared — an instant clear cut the fade dead
    // and the R-UX1 window read as «gone in 0.2 s». The visibility read guards an
    // interrupted fade: a re-shown title must never be cleared by its predecessor's end
    // event. Reduced motion has no transition at all — the clear stays immediate.
    captionTitle.ontransitionend = (event) => {
      if (
        event.target === captionTitle &&
        event.propertyName === 'opacity' &&
        captionTitle.dataset.visible === 'false' &&
        getComputedStyle(captionTitle).opacity === '0'
      ) {
        captionTitle.textContent = '';
        // The window's clear stamp (the fill stamp's pair; see the writer above).
        document.documentElement.dataset.titleClearedAt = String(performance.now());
        console.debug('zimny: titleCleared', String(performance.now()));
      }
    };
    captionTitle.ontransitioncancel = captionTitle.ontransitionend;
    if (visible || reducedMotion) captionTitle.textContent = captionNext.title;
    captionTitle.dataset.visible = String(visible);
    // The window's wall-clock stamps (the CI flake fix): the readable window is a pair of
    // APP-side facts — the fill frame and the transition-end clear — no live sampling
    // needs to hear them (the stalled-runner class: runs 41362175165 starved the sampler's
    // rAF outright, 41364407100's dual drive still heard only ~100 ms of the real window).
    if (visible) {
      captionTitle.dataset.shown = captionNext.title;
      document.documentElement.dataset.titleShownAt = String(performance.now());
      console.debug('zimny: titleStamped', String(performance.now()));
    }
  }
  if (captionDiff.announcement) captionLive.textContent = captionNext.announcement;
  captionView = captionNext;

  // R23-ux (design-load-line.md): the load line — armed while a transit's card waits,
  // visibly past the threshold if data is still pending, gone at idle. The latch is the
  // pure law's (loadLineShown); the view comes from the stage map (loadLineStage); the
  // copy and the numbers ride the i18n laws. textContent writes only on change; on the
  // way out the outgoing glyphs stay for their fade (the title's retention law) and the
  // next show rewrites them. Called after the caption block so the one spoken word
  // («Загружаем зал») lands after the caption's own announcement writes, never before.
  {
    let nextLoadState = 'off';
    let nextLoadText = '';
    const st = transit?.state;
    if (st !== undefined && st.phase !== 'idle' && st.phase !== 'exit') {
      nextLoadState = 'armed'; // depart/arrive: the glides are their own feedback
      if (st.phase === 'card' && st.to !== null) {
        const record = progressOf(st.to);
        record.shown = loadLineShown({
          elapsedMs: st.phaseElapsedMs,
          dataReady: ready,
          shown: record.shown,
        });
        if (record.shown) {
          nextLoadState = record.stage;
          if (!record.announced) {
            record.announced = true;
            captionLive.textContent = t('chrome.load.open'); // the ONE spoken word per transit
          }
          if (!record.stamped) {
            record.stamped = true;
            document.documentElement.dataset.loadLineShownAt = String(performance.now());
            // R23-ux (the overshoot law): the card's clock CARRIES the previous phase's
            // overshoot, so a starved depart frame can make the card begin already past
            // the threshold — the line then shows on its first frame. The app-side fact
            // of WHY rides this second stamp (the e2e row accepts either clock reaching
            // the threshold; showing EARLIER than the law would break both).
            document.documentElement.dataset.loadLineCardElapsedMs = String(
              Math.round(st.phaseElapsedMs),
            );
          }
          const view = loadLineStage({
            stage: record.stage,
            receivedBytes: record.receivedBytes,
            totalBytes: record.totalBytes,
          });
          nextLoadState = view.kind;
          if (view.kind === 'open') nextLoadText = t('chrome.load.open');
          else if (view.kind === 'failed') nextLoadText = t('chrome.load.failed');
          else {
            const progress = formatByteProgress(
              view.kind === 'bytes' ? view.receivedBytes : view.totalBytes,
              view.totalBytes,
              activeLang(),
              LOAD_LINE_BYTE_STEP,
            );
            nextLoadText =
              view.kind === 'bytes'
                ? format(t('chrome.load.bytes'), {
                    received: progress.received,
                    total: progress.total,
                  })
                : format(t('chrome.load.assemble'), { total: progress.total });
          }
        }
      }
    }
    if (loadLineEl.dataset.state !== nextLoadState) loadLineEl.dataset.state = nextLoadState;
    if (
      nextLoadState !== 'off' &&
      nextLoadState !== 'armed' &&
      nextLoadText !== loadLineEl.textContent
    ) {
      loadLineEl.textContent = nextLoadText;
    }
  }

  // The door label (R-UX2, §2): one pure view per frame, the node written on change (the
  // caption law's harmless brother). The visibility belongs to the law; the TEXT composes
  // per visible frame on change — verb + ' · ' + the destination's room NAME (the door says
  // the name; the black card keeps the sentence title) — and stays in place while hiding
  // (the fade keeps its words). The language swap re-composes on the next visible frame.
  const edgeNext = edgePromptView({
    settled: arrival.phase === 'settled' && transit === null,
    atRest: railState.glide === null,
    boundary: railSettledBoundary(),
    pushed: pushedBoundary,
  });
  if (edgeNext.visible !== edgePromptShown) {
    edgePromptShown = edgeNext.visible;
    edgePrompt.dataset.visible = edgeNext.visible ? 'true' : 'false';
  }
  if (edgeNext.visible && edgeNext.boundary !== null) {
    const next = boundaryNext(edgeNext.boundary);
    if (next === null) throw new Error('zimny: a visible door label names a nonexistent door');
    const label = doorLabel({
      verb: edgeNext.boundary === 'forward' ? t('chrome.doorEnter') : t('chrome.doorBack'),
      title: next === 'square' ? t('data.titleSquare') : t(roomEntryOf(next).contract.title),
    });
    if (edgePrompt.textContent !== label) edgePrompt.textContent = label;
  }
  if (perfLog) {
    if (!firstSkyLogged) {
      firstSkyLogged = true;
      console.log(
        `zimny: first sky frame at ${performance.now().toFixed(0)} ms · buffer ` +
          `${renderer.domElement.width}×${renderer.domElement.height} · css ` +
          `${window.innerWidth}×${window.innerHeight}`,
      );
    }
    if (perfWindowStart === null) perfWindowStart = timeMs;
    perfFrames += 1;
    perfSumDeltaMs += deltaMs;
    perfMaxDeltaMs = Math.max(perfMaxDeltaMs, deltaMs);
    if (timeMs - perfWindowStart >= 5000) {
      console.log(
        `zimny: ${perfFrames} frames · avg ${(perfSumDeltaMs / perfFrames).toFixed(1)} ms · ` +
          `max ${perfMaxDeltaMs.toFixed(1)} ms · draws ${renderer.info.render.calls} · ` +
          `tris ${renderer.info.render.triangles}`,
      );
      perfWindowStart = timeMs;
      perfFrames = 0;
      perfSumDeltaMs = 0;
      perfMaxDeltaMs = 0;
    }
    // Mobile-C §18.2: the frame-window collection call — one narrow pure invoke per frame.
    // The note is silent (a per-frame readout would perturb the cadence it measures) and the
    // rolling-window line above keeps its byte-exact format.
    if (captureFrameNote !== null) {
      captureFrameNote({
        timeMs,
        deltaMs,
        draws: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        ledgerBytes: ledger.snapshot().total,
        drawingBufferPx: { width: renderer.domElement.width, height: renderer.domElement.height },
      });
    }
  }

  // Prewarm the massing variant after the tier settles (§10): one compile at the final
  // shadow map size and render scale, no re-compile when the probe flips surfaces.
  if (!compileStarted && tierSettled) {
    compileStarted = true;
    renderer
      .compileAsync(scene, camera)
      .then(() => {
        massingReady = true;
        // §8.3 layer 2 baseline: the post-boot object counts, only when no room is mounted.
        if (ledger.snapshot().total === 0) {
          memoryBaseline = {
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
          };
        }
      })
      .catch((error: unknown) => {
        console.error('zimny: massing prewarm failed', error); // sky and title are retained
      });
  }

  // Advance for the NEXT callback; the label and DOM above were applied before this draw.
  arrival = advanceArrival(arrival, deltaMs, massingReady, isDeterministic(timeState));
};

renderer.setAnimationLoop(tick);
