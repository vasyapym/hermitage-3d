// src/perf/mobile-capture.ts
/**
 * Mobile-C capture: the §18.1 pure command/acquisition laws of design-mobile-tier.md.
 *
 * Implements §18.1 (named exports, side-effect free, the §9/§10/§18.1 declared constants
 * below), §18.2 (the immutable-plan validation over the plan-carried inventory), §18.3/§18.6
 * (the pure transducer over the frozen 10-state × 7-operation table, ratified by the owner's
 * orchestrator question tool on 2026-10-31 — the §(6) authorization), §18.4 (the three storage
 * caps and the retention lifecycle) and §21 (the capture rows pinned by
 * tests/mobile-capture.test.ts).
 *
 * HOST BOUNDARY: the in-page command surface, real byte serialization, SHA-256 digests,
 * native save/share/file-selection dialogs, the frame clocks and the render samples are HOST
 * predicates performed in src/main.ts. This module never reads a clock, never serializes,
 * never hashes and never opens anything: it receives those computed facts as injected inputs
 * and judges them. The control state machine is host-owned too — the module never auto-advances
 * state (the ratified HOST-INJECTION law); `runCommand` returns the module-computed successor
 * and the host advances its own copies.
 *
 * DECLARED CONSTANTS (first declaration, orchestrator authorization): the seven §9/§10 names
 * exist in no committed source file; their first declaration lives here, beside the three
 * §18.1 caps. No other file may declare them; the plan generator imports them from here.
 *
 * THE ONE IMPORT is './mobile-report' (the §(6) import law): the transport-tail cells reuse
 * the committed `nextControlState`, and the filename/verification laws reuse the committed
 * comparators. No other dependency; no default imports; no side effects at import time.
 */

import {
  decide,
  isKnown,
  isPortableSegment,
  knownField,
  type MobileCActivitySegment,
  type MobileCAttempt,
  type MobileCAttemptLink,
  type MobileCBeginInput,
  type MobileCCache,
  type MobileCCommand,
  type MobileCCommandReply,
  type MobileCCommandValue,
  type MobileCControlState,
  type MobileCEndInput,
  type MobileCEpoch,
  type MobileCField,
  type MobileCFileRef,
  type MobileCFirstExterior,
  type MobileCFrameWindow,
  type MobileCGraphics,
  type MobileCGraphicsState,
  type MobileCId,
  type MobileCIndex,
  type MobileCInvalidation,
  type MobileCItinerary,
  type MobileCLongTasks,
  type MobileCNetwork,
  type MobileCOverflow,
  type MobileCPlanV1,
  type MobileCPowerPoint,
  type MobileCPrepared,
  type MobileCPresentation,
  type MobileCRawInterval,
  type MobileCRegistration,
  type MobileCRenderSample,
  type MobileCSavedReceipt,
  type MobileCScenario,
  type MobileCSelection,
  type MobileCSize,
  type MobileCSlot,
  type MobileCSlotResult,
  type MobileCStamp,
  type MobileCStopEvent,
  type MobileCTransit,
  type MobileCTransport,
  type MobileCVerificationInput,
  type MobileCViewportEvent,
  type MobileCVisibilityEvent,
  nextControlState,
  notApplicableField,
  parseMobileCFileName,
  pendingField,
  unknownField,
  verificationFaults,
} from './mobile-report';

// ---------------------------------------------------------------------------
// §9/§10/§18.1 — the declared constants (first declaration per the orchestrator
// authorization; names and meanings verbatim from design §9/§10, each cited).
// ---------------------------------------------------------------------------

/** §9: the capture-instrument time base — one 60,000-ms foreground frame window. */
export const MOBILE_FRAME_WINDOW_MS = 60_000;
/** §9: the window's p95 floor is 33.0 ms; unrounded comparisons (a 33.33 ms cadence fails). */
export const MOBILE_FRAME_P95_MS = 33.0;
/** §9: the window's p99 guard is 50.0 ms; unrounded comparisons. */
export const MOBILE_FRAME_P99_MS = 50.0;
/** §9: a main-thread task strictly over 50.0 ms is a long task (post-load counts). */
export const MOBILE_LONG_TASK_MS = 50.0;
/** §9/§10: every frame scenario repeats three times; repeat 3 is post-soak (§18.2). */
export const MOBILE_CAPTURE_REPEATS = 3;
/** §9: the first-exterior target — presentation within 3,000 ms at the reference conditions. */
export const MOBILE_FIRST_EXTERIOR_MS = 3_000;
/** §9/§10: at least 1,200,000 ms of evidenced active touring before the post-soak slots. */
export const MOBILE_SOAK_MS = 1_200_000;

/** §9/§10, implemented by §18: storage bounds, not performance-floor amendments. */
export const MOBILE_CAPTURE_MAX_FRAMES = 32_768;
export const MOBILE_CAPTURE_MAX_RECORDS = 4_096;
export const MOBILE_CAPTURE_MAX_BYTES = 8_388_608;

// ---------------------------------------------------------------------------
// Internal helpers.
// ---------------------------------------------------------------------------

/**
 * Freezes the accepted plan value in place (§21 row 4: accepted plan content cannot
 * subsequently mutate). Structural walk; already-frozen subtrees stop the recursion.
 */
const deepFreeze = (value: unknown): void => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const key in value as Readonly<Record<string, unknown>>) {
    deepFreeze((value as Readonly<Record<string, unknown>>)[key]);
  }
};

// ---------------------------------------------------------------------------
// §18.2 — the immutable-plan validation over the plan-carried inventory. The
// committed inventory is an injected host fact: rooms keyed by rail stop order +
// the committed AIRLOCKS pairs (index-square-cut is the host-owned cut — never an
// AIRLOCKS entry — mapped by §(4)'s pin: every room node departs its last stop and
// lands at the square's first stop S0; rooms land at their first rail stop).
// ---------------------------------------------------------------------------

export type MobileCCommittedInventory = Readonly<{
  commit: string;
  rooms: readonly { id: MobileCId; stopIds: readonly MobileCId[] }[];
  airlocks: readonly { id: MobileCId; from: MobileCId; to: MobileCId }[];
}>;

export type MobileCPlanFault = Readonly<{ code: string; detail: string }>;

const roomRowOf = (inventory: MobileCCommittedInventory, roomId: MobileCId) =>
  inventory.rooms.find((room) => room.id === roomId);

const firstStopOf = (inventory: MobileCCommittedInventory, roomId: MobileCId): MobileCId | null =>
  roomRowOf(inventory, roomId)?.stopIds[0] ?? null;

const lastStopOf = (inventory: MobileCCommittedInventory, roomId: MobileCId): MobileCId | null => {
  const row = roomRowOf(inventory, roomId);
  return row === undefined ? null : (row.stopIds[row.stopIds.length - 1] ?? null);
};

const listEqual = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const equalRegistration = (a: MobileCRegistration, b: MobileCRegistration): boolean => {
  if (
    a.attemptId !== b.attemptId ||
    a.slotId !== b.slotId ||
    a.registeredAtUtc !== b.registeredAtUtc ||
    a.conditionKey !== b.conditionKey ||
    !listEqual([...a.externalEvidenceIds], [...b.externalEvidenceIds])
  ) {
    return false;
  }
  if (a.retryOf.state !== b.retryOf.state) return false;
  return !(
    a.retryOf.state === 'known' &&
    b.retryOf.state === 'known' &&
    a.retryOf.value !== b.retryOf.value
  );
};

/**
 * The per-slot grid laws (§18.2): the composite thirds, the cache intents (cold-warm), the
 * declared baseline orientation and the manipulation overlays.
 */
type MobileCPlanFaultSink = (code: string, detail: string) => void;

const thirdsFault = (slot: MobileCSlot, fault: MobileCPlanFaultSink): void => {
  if (slot.gate === 'first-exterior') {
    if (slot.thirds.length !== 0) {
      fault(
        'malformed-schedule',
        `first-exterior slot ${slot.id} carries thirds; it is not a frame window`,
      );
    }
    return;
  }
  if (slot.thirds.length !== 3) {
    fault(
      'malformed-schedule',
      `slot ${slot.id} plans ${slot.thirds.length} third(s), not the composite three`,
    );
    return;
  }
  const activities: readonly string[] = ['resting', 'looking', 'stepping'];
  let cursor = 0;
  for (const [index, third] of slot.thirds.entries()) {
    if (third.third !== index + 1) {
      fault(
        'malformed-schedule',
        `slot ${slot.id}'s third ${index + 1} is mislabelled ${third.third}`,
      );
    }
    if (third.activity !== activities[index]) {
      fault(
        'malformed-schedule',
        `slot ${slot.id} third ${index + 1} plans ${third.activity}, not ${activities[index]}`,
      );
    }
    if (third.startOffsetMs !== cursor) {
      fault(
        'malformed-schedule',
        `slot ${slot.id} third ${index + 1} starts at ${third.startOffsetMs}, not ${cursor}`,
      );
    }
    if (third.endOffsetMs <= third.startOffsetMs) {
      fault('malformed-schedule', `slot ${slot.id} third ${index + 1} has an empty span`);
    }
    cursor = third.endOffsetMs;
  }
  if (cursor !== MOBILE_FRAME_WINDOW_MS) {
    fault(
      'malformed-schedule',
      `slot ${slot.id}'s thirds span ${cursor}, not the §9 ${MOBILE_FRAME_WINDOW_MS} ms window`,
    );
  }
};

const slotOverlayFaults = (
  plan: MobileCPlanV1,
  slot: MobileCSlot,
  fault: MobileCPlanFaultSink,
): void => {
  const scenario = plan.scenarios.find((row) => row.id === slot.scenarioId);
  if (scenario === undefined) return; // the reference fault is reported by the slot loop
  const isProbe = slot.gate === 'expected-invalidation';
  if (scenario.target.kind === 'room') {
    if (isProbe) {
      if (slot.baselineOrientation !== 'portrait') {
        fault('malformed-sentinel', `probe slot ${slot.id} must run the baseline orientation`);
      }
      if (!slot.manipulations.includes('visibility-interruption')) {
        fault(
          'malformed-sentinel',
          `probe slot ${slot.id} does not declare its visibility interruption`,
        );
      }
      if (slot.postSoakRequired !== true) {
        fault('malformed-post-soak', `probe slot ${slot.id} must run post-soak`);
      }
      if (slot.cacheIntent.kind !== 'room-baseline') {
        fault('malformed-cache', `probe slot ${slot.id} carries intent ${slot.cacheIntent.kind}`);
      }
      return;
    }
    // Floor room slots: the declared baseline is portrait; the sentinel overlays ride the
    // sentinel scenario's repeats (§18.2: overlays on the three room slots, no extra population).
    if (scenario.target.sentinel) {
      if (slot.repeat === 1) {
        if (slot.baselineOrientation !== 'landscape') {
          fault('malformed-sentinel', `sentinel slot ${slot.id} (repeat 1) must run landscape`);
        }
        if (!slot.manipulations.includes('landscape')) {
          fault(
            'malformed-sentinel',
            `sentinel slot ${slot.id} (repeat 1) does not declare the landscape overlay`,
          );
        }
      } else if (slot.repeat === 2) {
        if (!slot.manipulations.includes('browser-bars')) {
          fault(
            'malformed-sentinel',
            `sentinel slot ${slot.id} (repeat 2) does not declare the browser-bar overlay`,
          );
        }
      } else {
        if (!slot.manipulations.includes('resume')) {
          fault(
            'malformed-sentinel',
            `sentinel slot ${slot.id} (repeat 3) does not declare resume`,
          );
        }
        if (!isKnown(slot.precedingProbeSlotId)) {
          fault('malformed-sentinel', `sentinel slot ${slot.id} (repeat 3) has no preceding probe`);
        }
      }
      if (slot.manipulations.length !== 1) {
        fault('malformed-sentinel', `sentinel slot ${slot.id} carries unexpected manipulations`);
      }
    } else {
      if (slot.baselineOrientation !== 'portrait') {
        fault(
          'malformed-sentinel',
          `room slot ${slot.id} must run the declared baseline orientation`,
        );
      }
      if (slot.manipulations.length !== 0) {
        fault('malformed-sentinel', `room slot ${slot.id} carries unexpected manipulations`);
      }
    }
    if (slot.cacheIntent.kind !== 'room-baseline') {
      fault('malformed-cache', `room slot ${slot.id} carries intent ${slot.cacheIntent.kind}`);
    }
    return;
  }
  if (scenario.target.kind === 'directed-airlock') {
    if (slot.baselineOrientation !== 'portrait' || slot.manipulations.length !== 0) {
      fault(
        'malformed-sentinel',
        `airlock slot ${slot.id} must run the declared baseline with no overlays`,
      );
    }
    if (slot.repeat === 1) {
      if (
        slot.cacheIntent.kind !== 'cold-unprepared-destination' ||
        slot.cacheIntent.httpAssets !== 'cold'
      ) {
        fault(
          'malformed-cache',
          `airlock slot ${slot.id} (repeat 1) lacks its cold unprepared-destination intent`,
        );
      }
    } else if (
      slot.cacheIntent.kind !== 'warm-destination' ||
      slot.cacheIntent.httpAssets !== 'warm'
    ) {
      fault(
        'malformed-cache',
        `airlock slot ${slot.id} (repeat ${slot.repeat}) lacks its warm-destination intent`,
      );
    }
    return;
  }
  // First-exterior probe: a separate navigation scenario, never a 60-second frame window.
  if (
    slot.gate !== 'first-exterior' ||
    slot.baselineOrientation !== 'portrait' ||
    slot.manipulations.length !== 0
  ) {
    fault('malformed-schedule', `first-exterior slot ${slot.id} carries window-shaped fields`);
  }
  if (slot.cacheIntent.kind !== 'cold-navigation' || slot.cacheIntent.httpAssets !== 'cold') {
    fault('malformed-cache', `first-exterior slot ${slot.id} lacks its cold-navigation intent`);
  }
};

/**
 * The §18.2 validation of a loadPlan candidate: portable ids; the §19.7/§(2)/§(3) pins inside
 * MobileCLimits; inventory coverage against the injected committed inventory; scope/epoch/
 * selection wrongness; itinerary legality (each itinerary walks its room's committed stop
 * order); the scenario/slot architecture (three planned 60-second slots per frame scenario,
 * the sentinel overlays and the separately planned visibility-interruption probe, the
 * cold-warm and post-soak assignments, the third plans) and per-scope stop coverage (§18.2:
 * the union covers every committed stop for each device × selection × epoch).
 */
export const planValidationFaults = (
  plan: MobileCPlanV1,
  commit: MobileCCommittedInventory,
): readonly MobileCPlanFault[] => {
  const faults: MobileCPlanFault[] = [];
  const fault: MobileCPlanFaultSink = (code, detail) => {
    faults.push({ code, detail });
  };

  // Portable ids (§18.6: identifier components are portable ASCII letters, digits, _ or -).
  const idSubjects: readonly MobileCId[] = [
    plan.id,
    ...plan.devices.map((device) => device.id),
    ...plan.scopes.map((scope) => scope.id),
    ...plan.itineraries.map((itinerary) => itinerary.id),
    ...plan.scenarios.map((scenario) => scenario.id),
    ...plan.slots.map((slot) => slot.id),
    ...plan.inventory.directedAirlocks.map((entry) => entry.id),
  ];
  for (const id of idSubjects) {
    if (!isPortableSegment(id)) fault('non-portable-id', `plan member id "${id}" is not portable`);
  }

  // §9/§10/§19.7: the instrument's own pins — maxDraws 250 / triangles 1,000,000 are §9's
  // graphics ceilings (the 1.0-M triangle ceiling applying to T0 too); the ledger ceiling is
  // §9's «texture ledger ≤256 MB» at 256 MiB; the unit convention is the §(3) known
  // convention; the §10 ratification stays pending (a plan may never self-ratify).
  const limits = plan.limits;
  const pinnedLimits: readonly [string, number, number][] = [
    ['frameWindowMs', limits.frameWindowMs, MOBILE_FRAME_WINDOW_MS],
    ['p95Ms', limits.p95Ms, MOBILE_FRAME_P95_MS],
    ['p99Ms', limits.p99Ms, MOBILE_FRAME_P99_MS],
    ['longTaskMs', limits.longTaskMs, MOBILE_LONG_TASK_MS],
    ['firstExteriorMs', limits.firstExteriorMs, MOBILE_FIRST_EXTERIOR_MS],
    ['soakMs', limits.soakMs, MOBILE_SOAK_MS],
  ];
  for (const [name, value, wanted] of pinnedLimits) {
    if (value !== wanted) fault('malformed-limits', `${name} ${value} is not the §9/§10 ${wanted}`);
  }
  if (limits.maxDraws !== 250)
    fault('malformed-limits', `maxDraws ${limits.maxDraws} is not §9's 250`);
  if (limits.maxTriangles !== 1_000_000) {
    fault('malformed-limits', `maxTriangles ${limits.maxTriangles} is not §9's 1.0 M`);
  }
  const ledgerCeiling = limits.ledgerCeilingBytes;
  if (!isKnown(ledgerCeiling) || ledgerCeiling.value !== 268_435_456) {
    fault('malformed-limits', 'ledgerCeilingBytes is not the known 256 MiB (268,435,456 B)');
  }
  if (!isKnown(limits.ledgerUnitConvention)) {
    fault('malformed-limits', 'ledgerUnitConvention must be resolved (the §(3) known convention)');
  }
  if (limits.ratification.status !== 'pending') {
    fault('malformed-limits', 'the §10 ratification stays pending; a plan may not self-ratify');
  }

  // Inventory coverage against the injected committed inventory (§18.2: derived from the
  // actual committed room/stop/airlock inventory — invented members and gaps reject).
  if (plan.inventory.commit !== commit.commit) {
    fault(
      'commit-mismatch',
      `plan commit ${plan.inventory.commit} is not the committed ${commit.commit}`,
    );
  }
  const committedRoomIds = new Set(commit.rooms.map((room) => room.id));
  const planRoomSeen = new Set<MobileCId>();
  for (const room of plan.inventory.rooms) {
    if (planRoomSeen.has(room.id))
      fault('duplicate-inventory', `room ${room.id} is declared twice`);
    planRoomSeen.add(room.id);
    const committed = roomRowOf(commit, room.id);
    if (committed === undefined) {
      fault('unknown-inventory', `room ${room.id} is not committed`);
      continue;
    }
    if (!listEqual([...room.stopIds], [...committed.stopIds])) {
      fault('missing-inventory', `room ${room.id}'s stop rail is not the committed stop order`);
    }
  }
  for (const room of commit.rooms) {
    if (!planRoomSeen.has(room.id))
      fault('missing-inventory', `committed room ${room.id} is missing from the plan`);
  }
  const planStopSeen = new Map<MobileCId, MobileCId>();
  for (const stop of plan.inventory.stops) {
    const existing = planStopSeen.get(stop.id);
    if (existing !== undefined) {
      fault('duplicate-inventory', `stop ${stop.id} is declared twice`);
      continue;
    }
    planStopSeen.set(stop.id, stop.roomId);
    const room = roomRowOf(commit, stop.roomId);
    if (room === undefined || room.stopIds.includes(stop.id) === false) {
      fault('unknown-inventory', `stop ${stop.id} of room ${stop.roomId} is not committed`);
    }
  }
  for (const room of commit.rooms) {
    for (const stopId of room.stopIds) {
      if (!planStopSeen.has(stopId)) {
        fault(
          'missing-inventory',
          `committed stop ${stopId} of ${room.id} is missing from the plan`,
        );
      }
    }
  }

  // Directed-airlock endpoint mapping (§(4) pin): a committed airlock runs either committed
  // direction; fromStopId is the departure node's terminal stop, toStopId is the landing
  // node's entry stop (rooms land at their first rail stop, the square at S0); the
  // index-square-cut is host-owned data: every room node → the square.
  const airlockSeen = new Set<MobileCId>();
  for (const entry of plan.inventory.directedAirlocks) {
    if (airlockSeen.has(entry.id)) {
      fault('duplicate-inventory', `directed airlock ${entry.id} is declared twice`);
      continue;
    }
    airlockSeen.add(entry.id);
    if (entry.airlockId === 'index-square-cut') {
      if (entry.fromRoomId === 'square' || !committedRoomIds.has(entry.fromRoomId)) {
        fault('airlock-mapping', `index-square-cut departs a non-room node ${entry.fromRoomId}`);
      }
      if (entry.toRoomId !== 'square') {
        fault('airlock-mapping', `index-square-cut lands at ${entry.toRoomId}, not the square`);
      }
    } else {
      const def = commit.airlocks.find((airlock) => airlock.id === entry.airlockId);
      if (def === undefined) {
        fault('airlock-mapping', `airlock ${entry.airlockId} is not committed`);
        continue;
      }
      const forward = def.from === entry.fromRoomId && def.to === entry.toRoomId;
      const reverse = def.to === entry.fromRoomId && def.from === entry.toRoomId;
      if (!forward && !reverse) {
        fault(
          'airlock-mapping',
          `airlock ${entry.airlockId} does not join ${entry.fromRoomId}→${entry.toRoomId}`,
        );
      }
    }
    const fromStop = lastStopOf(commit, entry.fromRoomId);
    const toStop = firstStopOf(commit, entry.toRoomId);
    if (fromStop === null || entry.fromStopId !== fromStop) {
      fault(
        'airlock-mapping',
        `airlock ${entry.id} departs ${entry.fromStopId}, not the terminal stop`,
      );
    }
    if (toStop === null || entry.toStopId !== toStop) {
      fault(
        'airlock-mapping',
        `airlock ${entry.id} lands at ${entry.toStopId}, not the entry stop`,
      );
    }
  }

  // Scopes: exactly one per device × selection × epoch; epochs and selections exactly the
  // pinned ones (§18.2); each scope's epochInputs carry the committed 'at' key with its exact
  // instant value (§(5)); device references resolve.
  const deviceIds = new Set(plan.devices.map((device) => device.id));
  const EPOCHS: readonly MobileCEpoch[] = [
    '2026-06-21T12:00:00Z',
    '2026-01-15T10:00:00Z',
    '2026-01-15T18:00:00Z',
  ];
  const SELECTIONS: readonly MobileCSelection[] = ['clean-profile-auto', 'explicit-q=t0'];
  const scopeKeys = new Set<string>();
  const scopeIds = new Set<MobileCId>();
  for (const scope of plan.scopes) {
    if (scopeIds.has(scope.id)) fault('duplicate-scope', `scope ${scope.id} is declared twice`);
    scopeIds.add(scope.id);
    if (!deviceIds.has(scope.deviceId)) {
      fault('unknown-scope-ref', `scope ${scope.id} names device ${scope.deviceId}`);
    }
    if (!EPOCHS.includes(scope.epoch) || !SELECTIONS.includes(scope.selection)) {
      fault('wrong-scope-epoch-selection', `scope ${scope.id} carries a wrong epoch/selection`);
    }
    const atInput = scope.epochInputs.find((input) => input.name === 'at');
    if (atInput === undefined || atInput.value !== scope.epoch) {
      fault(
        'wrong-scope-epoch-selection',
        `scope ${scope.id}'s epochInputs do not carry the at= instant`,
      );
    }
    scopeKeys.add(`${scope.deviceId}|${scope.selection}|${scope.epoch}`);
  }
  for (const device of plan.devices) {
    for (const selection of SELECTIONS) {
      for (const epoch of EPOCHS) {
        if (!scopeKeys.has(`${device.id}|${selection}|${epoch}`)) {
          fault('incomplete-scope-grid', `no scope for ${device.id} × ${selection} × ${epoch}`);
        }
      }
    }
  }

  // Itineraries: each walks its room's committed stop order (§18.2: the itinerary is legalled
  // against the predeclared rail; invented orders reject).
  const itineraryIds = new Set(plan.itineraries.map((itinerary) => itinerary.id));
  for (const itinerary of plan.itineraries) {
    const committed = roomRowOf(commit, itinerary.roomId);
    if (committed === undefined) {
      fault(
        'illegal-itinerary',
        `itinerary ${itinerary.id} walks unknown room ${itinerary.roomId}`,
      );
      continue;
    }
    if (!listEqual([...itinerary.stopIdsInOrder], [...committed.stopIds])) {
      fault('illegal-itinerary', `itinerary ${itinerary.id} is not the committed stop order`);
    }
  }

  // Scenarios: references resolve; the sentinel is exactly one room scenario per scope;
  // first-exterior rooms are committed.
  const scenarioIds = new Set<MobileCId>();
  for (const scenario of plan.scenarios) {
    if (scenarioIds.has(scenario.id)) {
      fault('duplicate-schedule', `scenario ${scenario.id} is declared twice`);
      continue;
    }
    scenarioIds.add(scenario.id);
    if (!scopeIds.has(scenario.scopeId)) {
      fault(
        'unknown-scenario-ref',
        `scenario ${scenario.id} names unknown scope ${scenario.scopeId}`,
      );
    }
    if (scenario.target.kind === 'room') {
      if (!itineraryIds.has(scenario.target.itineraryId)) {
        fault(
          'illegal-itinerary',
          `scenario ${scenario.id} names unknown itinerary ${scenario.target.itineraryId}`,
        );
      }
      if (!committedRoomIds.has(scenario.target.roomId)) {
        fault(
          'unknown-scenario-ref',
          `scenario ${scenario.id} walks unknown room ${scenario.target.roomId}`,
        );
      }
    } else if (scenario.target.kind === 'directed-airlock') {
      const target = scenario.target;
      if (!plan.inventory.directedAirlocks.some((entry) => entry.id === target.directedAirlockId)) {
        fault(
          'unknown-scenario-ref',
          `scenario ${scenario.id} names unknown directed airlock ${target.directedAirlockId}`,
        );
      }
    } else if (!committedRoomIds.has(scenario.target.exteriorRoomId)) {
      fault(
        'unknown-scenario-ref',
        `scenario ${scenario.id} presents unknown room ${scenario.target.exteriorRoomId}`,
      );
    }
  }
  for (const scopeId of scopeIds) {
    const sentinels = plan.scenarios.filter(
      (scenario) =>
        scenario.scopeId === scopeId && scenario.target.kind === 'room' && scenario.target.sentinel,
    );
    if (sentinels.length !== 1) {
      fault(
        'malformed-sentinel',
        `scope ${scopeId} declares ${sentinels.length} manipulation sentinel(s)`,
      );
    }
  }

  // Slots: unique portable ids; references resolve; the per-slot grid laws.
  const slotIds = new Set<MobileCId>();
  for (const slot of plan.slots) {
    if (slotIds.has(slot.id)) fault('duplicate-schedule', `slot ${slot.id} is declared twice`);
    slotIds.add(slot.id);
    if (slot.repeat !== 1 && slot.repeat !== 2 && slot.repeat !== 3) {
      fault('malformed-schedule', `slot ${slot.id} has repeat ${slot.repeat}`);
    }
    if (!scenarioIds.has(slot.scenarioId)) {
      fault('unknown-schedule-ref', `slot ${slot.id} names unknown scenario ${slot.scenarioId}`);
      continue;
    }
    thirdsFault(slot, fault);
    slotOverlayFaults(plan, slot, fault);
  }

  // The scenario slot architecture (§18.2): exactly three planned slots per frame scenario —
  // one per repeat, gate frame-floor or first-exterior — plus at most one separately planned
  // visibility-interruption probe on the sentinel's repeat 3.
  const scenarioSlots = new Map<MobileCId, MobileCSlot[]>();
  const slotById = new Map<MobileCId, MobileCSlot>();
  for (const slot of plan.slots) {
    slotById.set(slot.id, slot);
    const bucket = scenarioSlots.get(slot.scenarioId) ?? [];
    bucket.push(slot);
    scenarioSlots.set(slot.scenarioId, bucket);
  }
  for (const [scenarioId, slots] of scenarioSlots) {
    const planned = slots.filter((slot) => slot.gate !== 'expected-invalidation');
    const repeats = new Set(planned.map((slot) => slot.repeat));
    if (planned.length !== MOBILE_CAPTURE_REPEATS || !listEqual([...repeats].sort(), [1, 2, 3])) {
      fault(
        'malformed-schedule',
        `scenario ${scenarioId} plans ${planned.length} slot(s), not three repeats`,
      );
    }
    const probes = slots.filter((slot) => slot.gate === 'expected-invalidation');
    if (probes.length > 1) {
      fault('malformed-sentinel', `scenario ${scenarioId} declares ${probes.length} probe slot(s)`);
    }
    for (const probe of probes) {
      if (probe.repeat !== 3) {
        fault(
          'malformed-sentinel',
          `probe slot ${probe.id} is repeat ${probe.repeat}, not the resumed repeat 3`,
        );
      }
      if (!isKnown(probe.parentFrameSlotId) || !slotIds.has(probe.parentFrameSlotId.value)) {
        fault('malformed-sentinel', `probe slot ${probe.id} has no parent frame slot`);
        continue;
      }
      const parent = slotById.get(probe.parentFrameSlotId.value);
      if (parent !== undefined) {
        if (parent.repeat !== 3 || parent.gate !== 'frame-floor') {
          fault(
            'malformed-sentinel',
            `probe slot ${probe.id} points at non-resume slot ${parent.id}`,
          );
        }
        if (
          !isKnown(parent.precedingProbeSlotId) ||
          parent.precedingProbeSlotId.value !== probe.id
        ) {
          fault('malformed-sentinel', `slot ${parent.id} does not link back to probe ${probe.id}`);
        }
      }
    }
  }

  // Post-soak (§18.2: repeat 3 of every scenario follows at least MOBILE_SOAK_MS): the flag
  // rides exactly repeat 3 of every slot.
  for (const slot of plan.slots) {
    if (slot.postSoakRequired !== (slot.repeat === 3)) {
      fault(
        'malformed-post-soak',
        `slot ${slot.id} repeat ${slot.repeat} postSoakRequired ${slot.postSoakRequired}`,
      );
    }
  }

  // Per-scope stop coverage (§18.2: the union of observed stops must cover every committed
  // stop for each device × selection × epoch). The plan's room itineraries plus the directed
  // airlock endpoint stops predeclare that coverage.
  const scopeScenarios = new Map<MobileCId, MobileCScenario[]>();
  for (const scenario of plan.scenarios) {
    const bucket = scopeScenarios.get(scenario.scopeId) ?? [];
    bucket.push(scenario);
    scopeScenarios.set(scenario.scopeId, bucket);
  }
  const roomItinerary = new Map<MobileCId, MobileCItinerary>(
    plan.itineraries.map((itinerary) => [itinerary.roomId, itinerary]),
  );
  for (const [scopeId, scenarios] of scopeScenarios) {
    const covered = new Set<MobileCId>();
    for (const scenario of scenarios) {
      if (scenario.target.kind === 'room') {
        const itinerary = roomItinerary.get(scenario.target.roomId);
        if (itinerary !== undefined)
          for (const stopId of itinerary.stopIdsInOrder) covered.add(stopId);
      } else if (scenario.target.kind === 'directed-airlock') {
        const target = scenario.target;
        const entry = plan.inventory.directedAirlocks.find(
          (row) => row.id === target.directedAirlockId,
        );
        if (entry !== undefined) {
          covered.add(entry.fromStopId);
          covered.add(entry.toStopId);
        }
      }
    }
    for (const room of commit.rooms) {
      for (const stopId of room.stopIds) {
        if (!covered.has(stopId)) {
          fault('stop-coverage', `scope ${scopeId} never observes ${room.id}'s stop ${stopId}`);
        }
      }
    }
  }

  return faults;
};

// ---------------------------------------------------------------------------
// §18.4 — registrations and retry ancestry. The ledger is an injected host fact:
// attempts are registered EXTERNALLY (§18.4 «Register each attempt ID externally
// before begin.»); `runCommand` never registers. The canonical conditionKey binds
// a registration to its scope and slot; retries carry new ids and original
// conditions (§18.2: retry invalid slots only, same planned conditions).
// ---------------------------------------------------------------------------

/** The canonical condition key: <scopeId>#<slotId> (§18.2 slot conditions). */
export const conditionKeyOf = (scopeId: MobileCId, slotId: MobileCId): string =>
  `${scopeId}#${slotId}`;

export type MobileCRegistrationFault =
  | 'unknown-slot'
  | 'mismatched-condition'
  | 'duplicate-attempt'
  | 'unregistered-attempt'
  | 'mismatched-registration'
  | 'retry-ancestry'
  | 'retry-satisfied';

export type MobileCRegistrationFacts = Readonly<{
  /** The planned slot ids of the frozen plan (§18.2). */
  plannedSlotIds: readonly MobileCId[];
  /** The canonical conditionKey the plan renders for this registration's slot. */
  canonicalConditionKey: string;
  /** The externally presented ledger rows for this slot walk (§18.4). */
  registrations: readonly MobileCRegistration[];
  /** The ledger's disposition knowledge for the retry-ancestry laws (§18.2). */
  dispositions: Readonly<Record<MobileCId, MobileCAttemptLink['disposition']>>;
  /** 'register' validates a NEW row; 'begin' validates the command's claim against the ledger. */
  mode: 'register' | 'begin';
}>;

/**
 * The registration/attempt/slot ancestry and retry-link laws (§18.2/§18.4/§21 row 5):
 * mismatched attempt/scope/slot/retry ancestry rejects; a retry carries a new id and the
 * original conditions; retried predecessors must exist and must not already be satisfied.
 */
export const registrationFaults = (
  registration: MobileCRegistration,
  facts: MobileCRegistrationFacts,
): readonly MobileCRegistrationFault[] => {
  const faults: MobileCRegistrationFault[] = [];
  const inLedger = facts.registrations.find((row) => row.attemptId === registration.attemptId);
  if (facts.mode === 'register') {
    if (inLedger !== undefined) faults.push('duplicate-attempt');
  } else if (inLedger === undefined) {
    faults.push('unregistered-attempt');
  } else if (!equalRegistration(inLedger, registration)) {
    // The externally presented ledger row is authoritative; a begin can claim only exact ids,
    // slots, condition keys and retry links (§18.6: inconsistent IDs fail).
    faults.push('mismatched-registration');
  }
  if (!facts.plannedSlotIds.includes(registration.slotId)) faults.push('unknown-slot');
  if (registration.conditionKey !== facts.canonicalConditionKey)
    faults.push('mismatched-condition');
  const retryOf = registration.retryOf;
  if (isKnown(retryOf)) {
    const predecessor = facts.registrations.find((row) => row.attemptId === retryOf.value);
    if (predecessor === undefined || predecessor.conditionKey !== registration.conditionKey) {
      faults.push('retry-ancestry');
    } else {
      const disposition = facts.dispositions[predecessor.attemptId] ?? 'pending';
      if (disposition === 'valid') faults.push('retry-satisfied');
    }
  }
  return faults;
};

// ---------------------------------------------------------------------------
// §18.4/neutrals — the attempt lifecycle. openAttempt builds the §18.9 attempt
// record from the injected begin input; every fact the host has not established
// reads unknown/pending per §18.9 (absence is never a zero, never a fabrication).
// ---------------------------------------------------------------------------

export type MobileCOpenFacts = Readonly<{ initialRoomId: MobileCId; initialStopId: MobileCId }>;

const neutralNetwork = (): MobileCNetwork => ({
  method: 'unavailable',
  mechanism: 'no network qualification reads at attempt open (§18.7)',
  requested: { downMbps: 10, rttMs: 100 },
  realisedDownMbps: unknownField('realised conditions unmeasured', [
    'network calibration evidence',
  ]),
  realisedRttMs: unknownField('realised conditions unmeasured', ['network calibration evidence']),
  latencyMeaning: unknownField('latency meaning unestablished', ['network calibration evidence']),
  calibrationEvidenceIds: [],
  referenceEquivalence: decide('unknown', 'no realised conditions observed'),
  qualification: decide('unknown', 'no realised conditions observed'),
});

const neutralPresentation = (exteriorRoomId: MobileCId): MobileCPresentation => ({
  basis: 'unavailable',
  exteriorRoomId,
  markerLocator: '',
  traceIds: [],
  clockRelationId: unknownField('no clock relation recorded yet', [
    'clock correlation observations',
  ]),
  evidenceIds: [],
  qualification: decide('unknown', 'no presentation evidence'),
});

const neutralFirstExterior = (
  exteriorRoomId: MobileCId,
  at: MobileCStamp,
): MobileCFirstExterior => ({
  navigationType: unknownField('navigation type arrives with the external probe', [
    'navigation boundary evidence',
  ]),
  navigationStart: pendingField(
    'the external probe has not returned',
    'bind the navigation start from the trace',
  ),
  firstExteriorPresented: pendingField(
    'the external probe has not returned',
    'bind the presented frame from the trace',
  ),
  elapsedMs: unknownField('elapsed unmeasured until the probe binds both stamps', [
    'presented-frame trace',
    'clock relation',
  ]),
  elapsedUncertaintyMs: unknownField('uncertainty unestablished', ['clock relation']),
  network: neutralNetwork(),
  presentation: neutralPresentation(exteriorRoomId),
  // The stamp locates the record at the attempt open; the coldness facts are external-probe
  // evidence (§18.7) and stay unknown until the probe returns.
  coldness: {
    at,
    httpAssets: unknownField('coldness is external-probe evidence', ['cold navigation probe']),
    decodedAssets: unknownField('coldness is external-probe evidence', ['cold navigation probe']),
    destinationResident: unknownField('resident state is external-probe evidence', [
      'cold navigation probe',
    ]),
    destinationReady: unknownField('readiness is external-probe evidence', [
      'cold navigation probe',
    ]),
    serviceWorkerEffect: unknownField('service-worker effects unestablished', [
      'cold navigation probe',
    ]),
    restoredFromBackForwardCache: unknownField('restoration unestablished', [
      'cold navigation probe',
    ]),
    resourceCoverage: decide('unknown', 'no cache evidence at open'),
    evidenceIds: [],
    qualification: decide('unknown', 'coldness unassessed at open'),
  },
  measuredTarget: decide('unknown', 'unmeasured at open'),
  qualification: decide('unknown', 'unassessed at open'),
});

const neutralLongTasks = (input: MobileCBeginInput): MobileCLongTasks => ({
  apiSupported: unknownField('long-task API support unestablished in-page', [
    'the Long Tasks API probe',
  ]),
  apiCoveredSpan: unknownField('API covered span unknown', ['the Long Tasks API probe']),
  observerDrained: unknownField('observer drainage unconfirmed', ['the Long Tasks API probe']),
  apiRows: [],
  apiCompleteCoverage: decide('unknown', 'no API rows recorded'),
  apiPostLoadOverThresholdCount: unknownField('the count stays unknown without complete coverage', [
    'the Long Tasks API probe',
  ]),
  initialExteriorSettledAt: input.initialExteriorSettledAt,
  nativeTraceRequired: true,
  native: unknownField('native CPU trace pending', ['native trace covering the window']),
  cpuGate: decide('unknown', 'unassessed at open; the archive boundary assesses (§18.5)'),
});

const neutralGraphics = (): MobileCGraphics => ({
  peakDraws: unknownField('no graphics sample appended yet', ['frame-row render samples']),
  peakTriangles: unknownField('no graphics sample appended yet', ['frame-row render samples']),
  ledgerPeakBytes: unknownField('no graphics sample appended yet', ['frame-row render samples']),
  peakLedgerSnapshotId: unknownField('no ledger snapshot recorded at capture', [
    'ledger snapshot evidence',
  ]),
  states: [],
  coverage: decide('unknown', 'no graphics states observed over the window'),
  drawsGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
  trianglesGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
  ledgerGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
});

const neutralPowerEnd = (at: MobileCStamp): MobileCPowerPoint => ({
  // The stamp locates the power-end read at the attempt's close; device telemetry reads stay
  // unknown per §18.9 (unavailable telemetry is never labelled a value).
  at,
  batteryPercent: unknownField('power telemetry unavailable at close', ['power/thermal evidence']),
  unplugged: unknownField('power telemetry unavailable at close', ['power/thermal evidence']),
  normalPowerMode: unknownField('power telemetry unavailable at close', ['power/thermal evidence']),
  lowPowerMode: unknownField('power telemetry unavailable at close', ['power/thermal evidence']),
  ambientC: unknownField('ambient reading unavailable at close', ['power/thermal evidence']),
  externalCooling: unknownField('ambient reading unavailable at close', ['power/thermal evidence']),
  thermalState: unknownField('thermal state unavailable at close', ['power/thermal evidence']),
  thermalWarnings: unknownField('thermal warnings unavailable at close', [
    'power/thermal evidence',
  ]),
});

const neutralCacheRead = (at: MobileCStamp): MobileCCache => ({
  // The stamp locates the cache close at the attempt's seal; the cache facts stay unknown
  // per §18.9 (their recording is the archive boundary's).
  at,
  httpAssets: unknownField('cache close unestablished at seal', ['cache qualification evidence']),
  decodedAssets: unknownField('cache close unestablished at seal', [
    'cache qualification evidence',
  ]),
  destinationResident: unknownField('resident state unestablished at seal', [
    'cache qualification evidence',
  ]),
  destinationReady: unknownField('readiness unestablished at seal', [
    'cache qualification evidence',
  ]),
  serviceWorkerEffect: unknownField('service-worker effects unestablished', [
    'cache qualification evidence',
  ]),
  restoredFromBackForwardCache: unknownField('restoration unestablished', [
    'cache qualification evidence',
  ]),
  resourceCoverage: decide('unknown', 'no cache evidence at seal'),
  evidenceIds: [],
  qualification: decide('unknown', 'cache close unassessed at seal'),
});

/**
 * Opens the attempt record (§18.3: begin authorizes one bounded capture). The frame window
 * opens at the admission stamp with the plan's 60,000-ms nominal end; observation collections
 * start empty; unmetered facts read unknown. A first-exterior attempt records its external
 * probe fields instead of a frame window (§18.2: navigation probes have no fabricated
 * interval stream).
 */
export const openAttempt = (
  input: MobileCBeginInput,
  admittedAt: MobileCStamp,
  slot: MobileCSlot,
  scenario: MobileCScenario,
  session: MobileCOpenFacts,
): MobileCAttempt => ({
  registration: input.registration,
  status: 'valid',
  lossReason: notApplicableField('a valid attempt has no loss reason'),
  invalidations: [],
  overflows: [],
  frame:
    slot.gate === 'first-exterior'
      ? notApplicableField(
          'a first-exterior probe is a navigation scenario, not a bounded frame window (§18.2)',
        )
      : knownField({
          clockId: admittedAt.clockId,
          admittedAtMs: admittedAt.atMs,
          nominalEndMs: admittedAt.atMs + MOBILE_FRAME_WINDOW_MS,
          actualEndMs: unknownField('no terminal sample yet', [
            'the window terminator interval row',
          ]),
          initialRoomId: session.initialRoomId,
          initialStopId: session.initialStopId,
          rawIntervals: [],
          rawCompleteness: 'missing',
          statistics: unknownField('zero samples yield unknown, not zero', [
            'frame-window raw intervals',
          ]),
          thirds: [],
          observedStopIds: [session.initialStopId],
          intervalFloor: decide('unknown', 'no window samples yet'),
        }),
  firstExterior:
    slot.gate === 'first-exterior' && scenario.target.kind === 'first-exterior'
      ? knownField(neutralFirstExterior(scenario.target.exteriorRoomId, admittedAt))
      : notApplicableField('a frame-window attempt records no first-exterior navigation (§18.2)'),
  activities: [],
  stopEvents: [],
  viewportEvents: [],
  visibilityEvents: [],
  transits: [],
  cacheBefore: input.cacheBefore,
  cacheAfter: neutralCacheRead(admittedAt),
  thermal: input.thermal,
  powerStart: input.powerStart,
  powerEnd: neutralPowerEnd(admittedAt),
  powerQualification: decide(
    'unknown',
    'the power law adjudicates at the archive boundary (§19 Phase C)',
  ),
  longTasks: neutralLongTasks(input),
  graphics: neutralGraphics(),
  ledgerSnapshots: [],
  protocolQualification: decide(
    'unknown',
    'the protocol qualification aggregates at the archive boundary',
  ),
  measuredFloor: decide('unknown', 'the measured floor assesses at the archive boundary (§18.5)'),
});

// ---------------------------------------------------------------------------
// §18.4 — cap accounting. The frame cap is module-computed; the record/byte caps
// judge host-supplied prospective facts (§18.4: the host serializes and counts;
// the module judges). The FIRST required append exceeding any cap invalidates the
// attempt, retains the accepted prefix, records the violated cap, the retained
// amount and at least one rejected item; prefix statistics cannot qualify a window.
// ---------------------------------------------------------------------------

export type MobileCFrameRowAppend =
  | { accepted: true; attempt: MobileCAttempt }
  | { accepted: false; code: 'attempt-closed'; attempt: MobileCAttempt }
  | { accepted: false; code: 'no-frame-window'; attempt: MobileCAttempt }
  | { accepted: false; code: 'window-closed'; attempt: MobileCAttempt }
  | {
      accepted: false;
      code: 'frame-cap-overflow';
      attempt: MobileCAttempt;
      overflow: MobileCOverflow;
    };

/**
 * Appends one raw rAF-interval row (§18.4: the frame cap bounds the rows per bounded frame
 * attempt, INCLUDING an interruption probe's rows). The window closes with its first terminal
 * sample: the overshooting interval is retained ENTIRELY from the foreground baseline (§18.2)
 * and `actualEndMs` records it. An unexplained foreground stall is retained as a sample: no
 * row is ever filtered out (§21 row 6). Statistics compute at the §18.5 assessment boundary,
 * never from a prefix.
 */
export const appendFrameRow = (
  attempt: MobileCAttempt,
  row: MobileCRawInterval,
): MobileCFrameRowAppend => {
  if (attempt.status !== 'valid') return { accepted: false, code: 'attempt-closed', attempt };
  if (!isKnown(attempt.frame)) return { accepted: false, code: 'no-frame-window', attempt };
  const frame = attempt.frame.value;
  if (frame.rawCompleteness === 'complete')
    return { accepted: false, code: 'window-closed', attempt };
  const retained = frame.rawIntervals.length;
  if (retained >= MOBILE_CAPTURE_MAX_FRAMES) {
    return {
      accepted: false,
      code: 'frame-cap-overflow',
      attempt,
      overflow: {
        cap: 'frames',
        targetArtifactId: attempt.registration.attemptId,
        limit: MOBILE_CAPTURE_MAX_FRAMES,
        retained,
        rejectedAtLeast: 1,
        firstRejectedAt: { clockId: frame.clockId, atMs: row.fromMs },
      },
    };
  }
  const closed = row.toMs >= frame.nominalEndMs;
  const nextFrame: MobileCFrameWindow = {
    ...frame,
    rawIntervals: [...frame.rawIntervals, row],
    rawCompleteness: closed ? 'complete' : 'prefix',
    actualEndMs: closed ? knownField(row.toMs) : frame.actualEndMs,
  };
  return { accepted: true, attempt: { ...attempt, frame: knownField(nextFrame) } };
};

/** The overflow invalidation reason per cap (§18.4: a cap violation invalidates the attempt). */
const overflowReason = (cap: MobileCOverflow['cap']): MobileCInvalidation['reason'] =>
  cap === 'frames' ? 'frame-overflow' : cap === 'records' ? 'record-overflow' : 'byte-overflow';

/**
 * §18.4: count every JSON object node except objects inside rawIntervals subtrees; arrays
 * themselves do not count; the record-size pass reads this count prospectively over the
 * attempt record, so a row subtree never eats the budget.
 */
export const countVisitObjectNodes = (value: unknown): number => {
  if (value === null || typeof value !== 'object') return 0;
  if (Array.isArray(value)) {
    let count = 0;
    for (const item of value) count += countVisitObjectNodes(item);
    return count;
  }
  let count = 1;
  for (const [key, item] of Object.entries(value as Readonly<Record<string, unknown>>)) {
    if (key === 'rawIntervals') continue; // §18.4: objects inside rawIntervals subtrees are exempt
    count += countVisitObjectNodes(item);
  }
  return count;
};

export type MobileCProspectiveAppend = Readonly<{
  /** Raw interval rows in the visit artefact after the append. */
  rows: number;
  /** JSON object nodes in the visit artefact after the append (rawIntervals subtrees exempt). */
  objectNodes: number;
  /** The accepted prefix's UTF-8 byte total (host serialized fact). */
  currentUtf8Bytes: number;
  /** The prospective export byte total after the append (host serialized fact). */
  prospectiveUtf8Bytes: number;
  /** The host clock stamp for the overflow's firstRejectedAt. */
  at: MobileCStamp;
}>;

/**
 * Judges a prospective acquisition append against every cap (§18.4), frames → records → bytes.
 * The boundaries are exact and inclusive — 32,768 rows, 4,096 object nodes and 8,388,608 UTF-8
 * bytes are accepted; the append past any of them rejects with the cap, the retained amount and
 * the rejected item. The returned overflow record is the reserved terminal marker: it rides the
 * invalidation, never consuming the capped budget.
 */
export type MobileCCapJudgement =
  | { accepted: true }
  | { accepted: false; overflow: MobileCOverflow };

export const judgeProspectiveAppend = (
  attempt: MobileCAttempt,
  append: MobileCProspectiveAppend,
): MobileCCapJudgement => {
  const frameRows = isKnown(attempt.frame) ? attempt.frame.value.rawIntervals.length : 0;
  if (append.rows > MOBILE_CAPTURE_MAX_FRAMES) {
    return {
      accepted: false,
      overflow: {
        cap: 'frames',
        targetArtifactId: attempt.registration.attemptId,
        limit: MOBILE_CAPTURE_MAX_FRAMES,
        retained: frameRows,
        rejectedAtLeast: 1,
        firstRejectedAt: append.at,
      },
    };
  }
  const currentNodes = countVisitObjectNodes(attempt);
  if (append.objectNodes > MOBILE_CAPTURE_MAX_RECORDS) {
    return {
      accepted: false,
      overflow: {
        cap: 'records',
        targetArtifactId: attempt.registration.attemptId,
        limit: MOBILE_CAPTURE_MAX_RECORDS,
        retained: currentNodes,
        rejectedAtLeast: 1,
        firstRejectedAt: append.at,
      },
    };
  }
  if (append.prospectiveUtf8Bytes > MOBILE_CAPTURE_MAX_BYTES) {
    return {
      accepted: false,
      overflow: {
        cap: 'bytes',
        targetArtifactId: attempt.registration.attemptId,
        limit: MOBILE_CAPTURE_MAX_BYTES,
        retained: append.currentUtf8Bytes,
        rejectedAtLeast: 1,
        firstRejectedAt: append.at,
      },
    };
  }
  return { accepted: true };
};

// ---------------------------------------------------------------------------
// §18.4/§18.2 observation recording. Visibility interruption invalidates the
// whole attempt; visible/resume rows only record (the resumed window is a new
// required floor window). A lost attempt refuses every recorder (§18.4: reconnect
// cannot revive a lost attempt). No second transit belongs in one slot (§18.2).
// ---------------------------------------------------------------------------

const assertMutable = (attempt: MobileCAttempt): void => {
  if (attempt.status === 'lost') {
    throw new Error(
      'zimny: capture — a lost attempt cannot be revived or extended (§18.4: reconnect cannot revive a lost attempt)',
    );
  }
};

export const invalidateAcquisition = (
  attempt: MobileCAttempt,
  invalidation: MobileCInvalidation,
): MobileCAttempt => {
  assertMutable(attempt);
  return {
    ...attempt,
    status: 'invalid',
    invalidations: [...attempt.invalidations, invalidation],
  };
};

/** Records the cap overflow and invalidates the attempt, retaining the accepted prefix (§18.4). */
export const invalidateForOverflow = (
  attempt: MobileCAttempt,
  overflow: MobileCOverflow,
): MobileCAttempt => {
  const invalidation: MobileCInvalidation = {
    reason: overflowReason(overflow.cap),
    at: knownField(overflow.firstRejectedAt),
    details: `cap ${overflow.cap} at ${overflow.limit} — retained ${overflow.retained}, rejected at least ${overflow.rejectedAtLeast} item (§18.4: the accepted prefix stays; the attempt invalidates)`,
    evidenceIds: [],
  };
  const invalidated = invalidateAcquisition(attempt, invalidation);
  return { ...invalidated, overflows: [...invalidated.overflows, overflow] };
};

/** Marks the attempt lost; loss is terminal and stays visible (§18.4). */
export const markAttemptLost = (attempt: MobileCAttempt, lossReason: string): MobileCAttempt => ({
  ...attempt,
  status: 'lost',
  lossReason: knownField(lossReason),
});

export type MobileCVisibilityResult = Readonly<{ attempt: MobileCAttempt; invalidated: boolean }>;

/**
 * Records the §18.2 visibility row; hidden/pagehide/freeze invalidate the WHOLE attempt
 * (§21 row 3) with the interruption stamp read in the observed window's clock when the
 * attempt carries a frame; visible/resume rows record without invalidating (the resumed
 * window is a new required floor window).
 */
export const recordVisibilityEvent = (
  attempt: MobileCAttempt,
  event: MobileCVisibilityEvent,
): MobileCVisibilityResult => {
  assertMutable(attempt);
  const appended: MobileCAttempt = {
    ...attempt,
    visibilityEvents: [...attempt.visibilityEvents, event],
  };
  const interrupts =
    event.state === 'hidden' || event.state === 'pagehide' || event.state === 'freeze';
  if (!interrupts) return { attempt: appended, invalidated: false };
  const at: MobileCField<MobileCStamp> = isKnown(attempt.frame)
    ? knownField({ clockId: attempt.frame.value.clockId, atMs: event.atMs })
    : unknownField('no frame clock at open; the stamp pairs at the archive boundary', [
        'clock relation evidence',
      ]);
  const invalidation: MobileCInvalidation = {
    reason: 'visibility-interruption',
    at,
    details: `visibility state ${event.state} interrupts the attempt (§18.2: an unexpected interruption invalidates its whole window)`,
    evidenceIds: [...event.evidenceIds],
  };
  return { attempt: invalidateAcquisition(appended, invalidation), invalidated: true };
};

/** Records an observed activity segment (§18.2: recorded, not inferred from elapsed time). */
export const recordActivitySegment = (
  attempt: MobileCAttempt,
  segment: MobileCActivitySegment,
): MobileCAttempt => {
  assertMutable(attempt);
  return { ...attempt, activities: [...attempt.activities, segment] };
};

/** Records an observed viewport event (§18.2: the manipulation overlays record their reads). */
export const recordViewportEvent = (
  attempt: MobileCAttempt,
  event: MobileCViewportEvent,
): MobileCAttempt => {
  assertMutable(attempt);
  return { ...attempt, viewportEvents: [...attempt.viewportEvents, event] };
};

/**
 * Records an observed stop change (§18.2: accepted stop changes are recorded, not inferred);
 * an ACCEPTED stop event extends the window's observedStopIds — the coverage law rides
 * observations only (§21 row 6).
 */
export const recordStopEvent = (
  attempt: MobileCAttempt,
  event: MobileCStopEvent,
): MobileCAttempt => {
  assertMutable(attempt);
  if (isKnown(attempt.frame) && event.accepted) {
    const frame = attempt.frame.value;
    const observed = new Set(frame.observedStopIds);
    observed.add(event.toStopId);
    return {
      ...attempt,
      stopEvents: [...attempt.stopEvents, event],
      frame: knownField({ ...frame, observedStopIds: [...observed] }),
    };
  }
  return { ...attempt, stopEvents: [...attempt.stopEvents, event] };
};

/** Records the slot's designated transit; a second transit does not belong in the slot (§18.2). */
export const recordTransit = (attempt: MobileCAttempt, transit: MobileCTransit): MobileCAttempt => {
  assertMutable(attempt);
  if (attempt.transits.length > 0) {
    throw new Error('zimny: capture — no second transit belongs in one slot (§18.2)');
  }
  return { ...attempt, transits: [...attempt.transits, transit] };
};

// ---------------------------------------------------------------------------
// §18.2/§18.6 — slot fulfilment and terminal results. Invalid attempts and
// expected-invalidation probes cannot fulfil floor slots; every attempt link
// stays visible so no predecessor is concealed; a valid measured exceedance is
// never removed (§18.4). The export handoff never authorizes release (§18.6).
// ---------------------------------------------------------------------------

/**
 * Escapes the §21 row-5 gate law: an expected-invalidation probe slot is fulfilled by the
 * probe's invalidation; a floor or first-exterior slot is fulfilled only by a valid attempt.
 */
export const canFulfilSlot = (
  gate: MobileCSlot['gate'],
  disposition: MobileCAttemptLink['disposition'],
): boolean =>
  gate === 'expected-invalidation' ? disposition === 'invalid' : disposition === 'valid';

/** Builds the §18.9 attempt link row for one attempt against its slot. */
export const attemptLinkOf = (slot: MobileCSlot, attempt: MobileCAttempt): MobileCAttemptLink => {
  const last = attempt.invalidations[attempt.invalidations.length - 1];
  return {
    attemptId: attempt.registration.attemptId,
    retryOf: attempt.registration.retryOf,
    conditionKey: attempt.registration.conditionKey,
    disposition: attempt.status,
    visitFile: unknownField('the visit file is archived after export and verification', [
      'the visit verified save receipt',
    ]),
    measuredExceedance: unknownField(
      'the per-window assessments run on the sealed export (§18.5); raw facts are retained',
      ['the plan MobileCLimits assessment'],
    ),
    explanation: `slot ${slot.id}: ${attempt.status} attempt${last === undefined ? '' : ` — ${last.reason} (${last.details})`}`,
  };
};

/** The §18.9 slot-result law over the ledger's attempt links (all links stay visible, §21 row 5). */
export const assessSlotFulfilment = (
  slot: MobileCSlot,
  scopeId: MobileCId,
  links: readonly MobileCAttemptLink[],
): MobileCSlotResult => {
  const fulfilling = links.find((link) => canFulfilSlot(slot.gate, link.disposition));
  const validLinks = links.filter((link) => link.disposition === 'valid');
  const knownExceedances = validLinks.map((link) => link.measuredExceedance).filter(isKnown);
  const anyTrue = knownExceedances.some((field) => field.value);
  const allFalse = knownExceedances.length === validLinks.length && !anyTrue;
  const anyValidMeasuredExceedance: MobileCField<boolean> =
    validLinks.length === 0
      ? unknownField('no valid attempt has been assessed for this slot', [
          'the plan MobileCLimits assessment',
        ])
      : anyTrue
        ? knownField(true)
        : allFalse
          ? knownField(false)
          : unknownField('a valid attempt assessment is unresolved', ['the per-window assessment']);
  const probeFulfilment = slot.gate === 'expected-invalidation';
  const fulfilment =
    links.length === 0
      ? decide('unknown', 'no attempt result links to this slot yet')
      : fulfilling === undefined
        ? decide(
            'unknown',
            `${links.length} link(s); invalid attempt(s) and expected-invalidation probe(s) cannot fulfil a ${slot.gate} slot — the retained links stay visible (§18.2)`,
          )
        : probeFulfilment
          ? decide('pass', 'the probe invalidated as planned; not a floor window (§18.2)')
          : decide('pass', 'a valid attempt at the planned conditions');
  return {
    slotId: slot.id,
    scenarioId: slot.scenarioId,
    scopeId,
    repeat: slot.repeat,
    attempts: links,
    fulfillingAttemptId:
      fulfilling === undefined
        ? unknownField('no attempt can fulfil this slot; the retained links stay visible', [
            'a same-condition retry with a new attempt id',
          ])
        : knownField(fulfilling.attemptId),
    anyValidMeasuredExceedance,
    fulfilment,
  };
};

// ---------------------------------------------------------------------------
// §18.6 — seal and evidence reconciliation. Supplemental external evidence may
// fill absence fields, but never rewrites measured records (§18.6).
// ---------------------------------------------------------------------------

export type MobileCReconciliationFault = 'visit-id-mismatch';

/** The endVisit reconciliation: the end input's visit identity must match the sealed visit. */
export const reconciliationFaults = (
  visitId: MobileCId | null,
  input: MobileCEndInput,
): readonly MobileCReconciliationFault[] =>
  visitId === null || input.visitId !== visitId ? ['visit-id-mismatch'] : [];

/** The attempt's accepted frame rows ground the graphics block: peaks are observed facts. */
const graphicsFromRows = (attempt: MobileCAttempt): MobileCGraphics => {
  const rows = isKnown(attempt.frame) ? attempt.frame.value.rawIntervals : [];
  const samples = rows
    .map((row) => row.render)
    .filter((field): field is Extract<MobileCField<MobileCRenderSample>, { state: 'known' }> =>
      isKnown(field),
    );
  const maxOf = (values: readonly number[]): MobileCField<number> =>
    values.length === 0
      ? unknownField('no graphics sample recorded in the accepted rows', [
          'frame-row render samples',
        ])
      : knownField(values.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY));
  const ledgerSamples = samples
    .map((sample) => sample.value.ledgerBytes)
    .filter((field): field is Extract<MobileCField<number>, { state: 'known' }> => isKnown(field))
    .map((field) => field.value);
  const states: MobileCGraphicsState[] = [];
  for (const row of rows) {
    const render = row.render;
    if (!isKnown(render)) continue;
    states.push({
      atMs: row.toMs,
      drawingBufferPx: render.value.drawingBufferPx,
      msaaSamples: knownField(render.value.msaaSamples),
      shadowMapPx: unknownField<MobileCSize>(
        'the shadow-map size read happens at the §11 diagnostics',
        ['graphics state evidence'],
      ),
      rendererMemory: unknownField<{ geometries: number; textures: number }>(
        'renderer memory is layer 2, not a ledger row (§8.3)',
        ['graphics state evidence'],
      ),
    });
  }
  return {
    peakDraws: maxOf(samples.map((sample) => sample.value.draws)),
    peakTriangles: maxOf(samples.map((sample) => sample.value.triangles)),
    ledgerPeakBytes: maxOf(ledgerSamples),
    peakLedgerSnapshotId: unknownField('no ledger snapshot was recorded at capture', [
      'ledger snapshot evidence',
    ]),
    states,
    coverage: decide(
      'unknown',
      `${states.length} graphics state row(s) observed; the coverage rule assesses at the archive boundary (§18.5)`,
    ),
    drawsGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
    trianglesGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
    ledgerGate: decide('unknown', 'assessed at the archive boundary against the plan limits'),
  };
};

/**
 * Seals a stopped attempt after evidence reconciliation (§18.6). The end input's native CPU
 * fills ONLY an absent field (§18.6: supplemental external evidence may fill absence fields,
 * never rewriting a measured record); the graphics peaks aggregate the accepted frame rows;
 * the power-end and cache-close reads stamp at the seal with unknown facts (§18.9: absence is
 * never a value). The report value itself assembles at the export boundary.
 */
export const sealAttempt = (
  attempt: MobileCAttempt,
  input: MobileCEndInput,
  at: MobileCStamp,
): MobileCAttempt => ({
  ...attempt,
  longTasks: {
    ...attempt.longTasks,
    native: isKnown(attempt.longTasks.native) ? attempt.longTasks.native : input.nativeCpu,
  },
  graphics: graphicsFromRows(attempt),
  powerEnd: neutralPowerEnd(at),
  cacheAfter: neutralCacheRead(at),
});

// ---------------------------------------------------------------------------
// The frozen 10-state × 7-operation command table (§(6) ORCHESTRATOR AUTHORIZATION,
// ratified 2026-10-31). One frozen named export; each cell is a FLAT DATA record
// {outcome, code, nextState, valueKind} — no functions in the data. Where no cell
// is listed below, the GENERAL CELL governs: every (state, op) pair not listed
// fails loudly (outcome 'error', code 'illegal-state', nextState 'current', value
// kind 'none'). The five predicated cells name their injected-input predicate in
// a comment; the transport-tail cells reuse the committed `nextControlState`.
// ---------------------------------------------------------------------------

export type MobileCCell = Readonly<{
  outcome: 'ok' | 'pending' | 'error';
  code: string;
  nextState: MobileCControlState | 'current';
  valueKind: MobileCCommandValue['kind'] | 'none';
}>;

export type MobileCCommandTable = Readonly<
  Record<
    MobileCControlState,
    Readonly<
      Record<
        | 'loadPlan'
        | 'begin'
        | 'abort'
        | 'endVisit'
        | 'prepareExport'
        | 'exportPrepared'
        | 'verifySaved',
        MobileCCell
      >
    >
  >
>;

/**
 * LEGAL: 'empty' + loadPlan: predicated (planValidation — planValidationFaults over the
 * injected committed inventory): validated → ok 'plan-loaded' with {kind:'plan-loaded',
 * planId}; validation failure → error 'invalid-plan', state 'current'. §18.6: «loadPlan
 * validates and freezes the actual-inventory plan».
 */
export const COMMAND_TABLE = {
  empty: {
    loadPlan: {
      outcome: 'ok',
      code: 'plan-loaded',
      nextState: 'plan-loaded',
      valueKind: 'plan-loaded',
    },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  'plan-loaded': {
    loadPlan: {
      // LEGAL: re-freeze (§18.6's replacement ban is only «while an attempt or unverified
      // artefact is held» — nothing is held here). predicated (planValidation): the same
      // plan-validity predicate re-checks the value before re-freezing.
      outcome: 'ok',
      code: 'plan-loaded',
      nextState: 'plan-loaded',
      valueKind: 'plan-loaded',
    },
    begin: {
      // LEGAL: begin before external registration is impossible by §18.4's registration law.
      outcome: 'error',
      code: 'unregistered',
      nextState: 'current',
      valueKind: 'none',
    },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      // LEGAL (target {kind:'plan'}; the other targets stay the general loud error).
      // predicated (prepareExportValidation — target kind, the §18.4 per-artefact byte cap,
      // the §18.6 suggested-name grammar, the DIGEST LAW: unavailable hashing → pending
      // 'digest-unavailable', lifecycle unchanged, no receipt, no export/release).
      outcome: 'ok',
      code: 'prepared',
      nextState: 'prepared',
      valueKind: 'prepared',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  ready: {
    loadPlan: {
      // LEGAL: an externally registered attempt points at the current plan (§18.4: «Register
      // each attempt ID externally before begin.»).
      outcome: 'error',
      code: 'hold-conflict',
      nextState: 'current',
      valueKind: 'none',
    },
    begin: {
      // predicated (beginAdmission — the injected §18.4 ledger + the canonical condition key
      // and the host's admission stamp): validated and admitted → ok 'capturing' with
      // {kind:'admission', visitId, attemptId, admittedAt}; validated, not admitted →
      // pending 'awaiting-admission', state 'admission-pending'; input validation failure →
      // error 'invalid-input', state 'current'. §18.6: begin «validates the registered
      // attempt, original slot, scope and same-condition retry link, then authorizes only
      // that bounded acquisition».
      outcome: 'ok',
      code: 'admission',
      nextState: 'capturing',
      valueKind: 'admission',
    },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      // LEGAL (target {kind:'plan'}). predicated (prepareExportValidation — as the
      // plan-loaded cell above).
      outcome: 'ok',
      code: 'prepared',
      nextState: 'prepared',
      valueKind: 'prepared',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  'admission-pending': {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: {
      // The same admission predicate re-checks: a pending admission resolves only through
      // this re-issue (ratified: begin from 'admission-pending' re-evaluates the predicate).
      outcome: 'ok',
      code: 'admission',
      nextState: 'capturing',
      valueKind: 'admission',
    },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  capturing: {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    abort: {
      // LEGAL: §18.6 — «abort stops acquisition, retains its prefix and returns the invalid
      // terminal result; it never means discard.»
      outcome: 'ok',
      code: 'terminal',
      nextState: 'stopped',
      valueKind: 'terminal',
    },
    endVisit: {
      // predicated (endVisitBoundary — the attempt's own frame-window fact): the result is
      // valid at the required boundary, or invalid 'ended-early' otherwise (§18.6: «Called
      // before a required boundary, it stops and invalidates the attempt as ended early.»).
      outcome: 'ok',
      code: 'terminal',
      nextState: 'stopped',
      valueKind: 'terminal',
    },
    prepareExport: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  stopped: {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    // LEGAL (ratified): a repeated abort from 'stopped' stays the general loud error, never
    // a silent no-op.
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: {
      // predicated (endVisitReconciliation — the injected end input's visit identity):
      // reconciliation failure → error 'reconciliation-failed', state 'current' (§18.6:
      // «endVisit seals a stopped attempt after evidence reconciliation.»).
      outcome: 'ok',
      code: 'terminal',
      nextState: 'sealed',
      valueKind: 'terminal',
    },
    prepareExport: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  sealed: {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      // LEGAL (target {kind:'visit'}). predicated (prepareExportValidation — as the
      // plan-loaded cell; §18.4: about 8,388,608 exact UTF-8 bytes per exported artefact).
      outcome: 'ok',
      code: 'prepared',
      nextState: 'prepared',
      valueKind: 'prepared',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  prepared: {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      // predicated (prepareRepeat — the ratified idempotency carve-out: the SAME artefact
      // ID, target and frozen content succeeds WITHOUT rebuilding bytes, §18.6: «Repeating
      // preparation for the same artefact returns identical bytes; no collection or upload
      // occurs.»; a different artefact or target fails without mutation — the general cell).
      outcome: 'ok',
      code: 'prepared',
      nextState: 'prepared',
      valueKind: 'prepared',
    },
    exportPrepared: {
      // predicated (transportRecord — the injected §18.6 transport record; the successor is
      // the committed nextControlState: handed-off → 'awaiting-verification'; not-started or
      // cancelled → pending 'awaiting-transport' staying 'prepared'; failed → error
      // 'transport-io' with the prepared artefact PRESERVED).
      outcome: 'ok',
      code: 'transport',
      nextState: 'current',
      valueKind: 'transport',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
  'awaiting-verification': {
    loadPlan: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    begin: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    exportPrepared: {
      // predicated (transportRecord — as the prepared cell; a retry from
      // 'awaiting-verification' returns to 'prepared').
      outcome: 'ok',
      code: 'transport',
      nextState: 'current',
      valueKind: 'transport',
    },
    verifySaved: {
      // predicated (verifySavedPredicate — the injected §18.6 verification input, judged by
      // the committed verificationFaults): match → ok 'released' with the receipt singing the
      // actual basename; mismatch → error 'verification-mismatch', buffer retained, state
      // 'current'; cancellation/unsupported → pending, state 'current'.
      outcome: 'ok',
      code: 'verified',
      nextState: 'released',
      valueKind: 'verified',
    },
  },
  released: {
    loadPlan: {
      // LEGAL (ratified): after release nothing is held; a new campaign re-freezes (the same
      // planValidation predicate applies — loadPlan validates in every granting state).
      outcome: 'ok',
      code: 'plan-loaded',
      nextState: 'plan-loaded',
      valueKind: 'plan-loaded',
    },
    begin: {
      // The re-arm between visits is a HOST duty, never a command: re-arming after a
      // plan-verify release happens through the host's own machine (the HOST-INJECTION law),
      // so the command path stays the general loud error.
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    abort: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    endVisit: { outcome: 'error', code: 'illegal-state', nextState: 'current', valueKind: 'none' },
    prepareExport: {
      // LEGAL (target {kind:'index'}, the §18.6 index-part entry; the other targets of this
      // cell stay the general loud error). predicated (indexPreparation — every
      // indexId/attempt/receipt/file reference resolves within the injected session archive,
      // the part/parts numbering is checked, and the per-artefact §18.4 byte cap applies);
      // validation failure → error 'invalid-index', state 'current'.
      outcome: 'ok',
      code: 'prepared',
      nextState: 'prepared',
      valueKind: 'prepared',
    },
    exportPrepared: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
    verifySaved: {
      outcome: 'error',
      code: 'illegal-state',
      nextState: 'current',
      valueKind: 'none',
    },
  },
} satisfies MobileCCommandTable;

// ---------------------------------------------------------------------------
// §18.6 — command facts and the runCommand transducer. The MODULE JUDGES COMMANDS
// ONLY (the ratified HOST-INJECTION law): the control state is an injected host
// input, the module never auto-advances it, and the result carries the
// module-computed successor plus the next attempt record — the host machine
// advances its own copies.
// ---------------------------------------------------------------------------

/** The session-archive facts an index-part preparation validates against (§18.6). */
export type MobileCArchiveFacts = Readonly<{
  index: MobileCIndex;
  /** The session's verified plan-report reference (bind attempt/index planFile per §19.10). */
  planFile: MobileCFileRef;
  knownVisitFiles: readonly MobileCFileRef[];
  knownReceipts: readonly MobileCSavedReceipt[];
  /** The host-computed byte total of the part's serialization (the §18.4 artefact cap). */
  prospectiveBytes: number;
}>;

export type MobileCCommandFacts = Readonly<{
  /** The frozen plan value; null in 'empty'. */
  plan: MobileCPlanV1 | null;
  /** The injected committed inventory the loadPlan validation freezes against. */
  commit: MobileCCommittedInventory;
  /** The externally presented §18.4 registration ledger. */
  registrations: readonly MobileCRegistration[];
  /** The ledger's disposition knowledge for the retry-ancestry laws. */
  dispositions: Readonly<Record<MobileCId, MobileCAttemptLink['disposition']>>;
  /** The host's admission stamp fact (pending admission when unavailable). */
  admittedAt: MobileCField<MobileCStamp>;
  /** The attempt record in flight (or the stopped/sealed one) for the lifecycle ops. */
  attempt: MobileCAttempt | null;
  /** The in-flight visit id for the lifecycle ID checks. */
  visitId: MobileCId | null;
  /** The host session facts an admitted begin needs (the observed initial room/stop). */
  openSession: MobileCOpenFacts;
  /** The host stamp for terminal rows (abort/seal). */
  at: MobileCStamp;
  /** The host digest fact: pending when hashing is unavailable (the DIGEST LAW). */
  digest: MobileCField<string>;
  /** The host-built prepared receipt for the CURRENT target (null while absent). */
  prepared: MobileCPrepared | null;
  /** The already-prepared receipt (the idempotent repeat's owner). */
  previous: MobileCPrepared | null;
  /** The index-part archive facts for the released-cell index target. */
  indexFacts: MobileCArchiveFacts | null;
  /** The host transport record for exportPrepared (null = no activation record). */
  transport: MobileCTransport | null;
  /** The verification input for verifySaved (null = cancellation/unsupported/missing). */
  verification: MobileCVerificationInput | null;
}>;

export type MobileCCommandResult = Readonly<{
  reply: MobileCCommandReply;
  /** The host's next attempt record for lifecycle ops; null when no attempt state changed. */
  nextAttempt: MobileCAttempt | null;
}>;

/** The §(6) GENERAL CELL's reason — verbatim, for the runner and the host's malformed path. */
export const buildGeneralReply = (
  commandId: MobileCId,
  state: MobileCControlState,
  op: string,
): MobileCCommandReply => {
  const reason = `illegal state transition: ${op} from '${state}' (§18.6: "Malformed commands, illegal state transitions and inconsistent IDs fail without advancing the plan.")`;
  return {
    commandId,
    state,
    outcome: 'error',
    code: 'illegal-state',
    reason,
    value: unknownField(reason),
  };
};

const okReply = (
  command: MobileCCommand,
  state: MobileCControlState,
  code: string,
  value: MobileCCommandValue,
  reason: string,
): MobileCCommandReply => ({
  commandId: command.commandId,
  state,
  outcome: 'ok',
  code,
  reason,
  value: knownField(value),
});

const pendingReply = (
  command: MobileCCommand,
  state: MobileCControlState,
  code: string,
  reason: string,
  nextAction: string,
): MobileCCommandReply => ({
  commandId: command.commandId,
  state,
  outcome: 'pending',
  code,
  reason,
  value: pendingField(reason, nextAction),
});

const errorReply = (
  command: MobileCCommand,
  state: MobileCControlState,
  code: string,
  reason: string,
): MobileCCommandReply => ({
  commandId: command.commandId,
  state,
  outcome: 'error',
  code,
  reason,
  value: unknownField(reason),
});

const PREPARED_CAP = MOBILE_CAPTURE_MAX_BYTES;

type PrepareCommand = Extract<MobileCCommand, { op: 'prepareExport' }>;

/**
 * The §18.6 prepareExport receipt checks: the receipt answers the commanded artefact identity
 * and target kind; the suggested name parses the §18.6 grammar (the ratified B3 law: the
 * grammar governs the SUGGESTED name); the §18.4 per-artefact byte cap applies inclusive.
 */
const preparedReceiptFaults = (command: PrepareCommand, facts: MobileCCommandFacts): string[] => {
  const faults: string[] = [];
  const prepared = facts.prepared;
  if (prepared === null) return faults; // the no-receipt case is judged before this check
  if (prepared.artifactId !== command.artifactId) faults.push('artifact-id-mismatch');
  if (prepared.kind !== command.target.kind) faults.push('target-kind-mismatch');
  if (parseMobileCFileName(prepared.suggestedFileName) === null) {
    faults.push('file-name-not-portable');
  }
  if (prepared.byteLength > PREPARED_CAP) {
    faults.push('artifact-byte-cap-exceeded');
  }
  return faults;
};

/**
 * The §(6) index-part checks for the released-cell index target: every indexId/attempt/
 * receipt/file reference resolves within the injected session archive, the part/parts
 * numbering is checked, and the per-artefact §18.4 byte cap applies (an index part is one
 * exported artefact).
 */
const indexPreparationFaults = (
  facts: MobileCCommandFacts,
  byteLength: number | null,
): string[] => {
  const faults: string[] = [];
  const archive = facts.indexFacts;
  if (archive === null) {
    faults.push('unresolved-archive');
    return faults;
  }
  const index = archive.index;
  if (index.part < 1 || index.parts < 1 || index.part > index.parts) {
    faults.push('part-numbering');
  }
  const registeredAttemptIds = new Set(index.registrations.map((row) => row.attemptId));
  for (const slot of index.slots) {
    for (const link of slot.attempts) {
      if (!registeredAttemptIds.has(link.attemptId)) faults.push('unresolved-reference');
    }
  }
  for (const file of index.visitFiles) {
    const known = archive.knownVisitFiles.find((row) => row.artifactId === file.artifactId);
    if (
      known === undefined ||
      known.byteLength !== file.byteLength ||
      known.sha256 !== file.sha256
    ) {
      faults.push('unresolved-reference');
    }
  }
  for (const receipt of index.receipts) {
    const known = archive.knownReceipts.find((row) => row.artifactId === receipt.artifactId);
    if (
      known === undefined ||
      known.sha256 !== receipt.sha256 ||
      known.byteLength !== receipt.byteLength
    ) {
      faults.push('unresolved-reference');
    }
  }
  const parsedPlanFile = parseMobileCFileName(archive.planFile.fileName);
  if (parsedPlanFile === null || parsedPlanFile.kind !== 'plan') {
    faults.push('plan-reference-unresolvable');
  }
  if (byteLength !== null && byteLength > PREPARED_CAP) faults.push('artifact-byte-cap-exceeded');
  return faults;
};

/**
 * The §18.3/§18.6 command transducer over the frozen table (the ratified §(6) text; the
 * HOST-INJECTION law: the state is an injected host input, the module judges commands only,
 * and the reply carries the module-computed successor while the host advances its copies).
 * Lifecycle ops return the next attempt record when the module built one; no reference
 * here reads a clock, a digest or a dialog.
 */
export const runCommand = (
  state: MobileCControlState,
  command: MobileCCommand,
  facts: MobileCCommandFacts,
): MobileCCommandResult => {
  const general = (): MobileCCommandResult => ({
    reply: buildGeneralReply(command.commandId, state, command.op),
    nextAttempt: null,
  });
  const noAttempt = (reply: MobileCCommandReply): MobileCCommandResult => ({
    reply,
    nextAttempt: null,
  });
  const faultReasons = (codes: readonly string[]): string =>
    `${codes.join(', ')} (§18.6: "Malformed commands, illegal state transitions and inconsistent IDs fail without advancing the plan.")`;

  if (command.op === 'loadPlan') {
    if (state === 'ready') {
      // LEGAL cell: an externally registered attempt points at the current plan (§18.4).
      return noAttempt(
        errorReply(
          command,
          state,
          'hold-conflict',
          'an externally registered attempt points at the current plan (§18.4: "Register each attempt ID externally before begin.")',
        ),
      );
    }
    if (state !== 'empty' && state !== 'plan-loaded' && state !== 'released') return general();
    const faults = planValidationFaults(command.plan, facts.commit);
    if (faults.length > 0) {
      const reasons = faults.map((entry) => `${entry.code}: ${entry.detail}`);
      const reason = `plan validation rejected: ${reasons.join('; ')} (§18.2: loadPlan validates and freezes the actual-inventory plan)`;
      return noAttempt(errorReply(command, state, 'invalid-plan', reason));
    }
    deepFreeze(command.plan);
    return noAttempt(
      okReply(
        command,
        'plan-loaded',
        'plan-loaded',
        { kind: 'plan-loaded', planId: command.plan.id },
        `plan ${command.plan.id} validated against the committed inventory and frozen (§18.2/§18.6)`,
      ),
    );
  }

  if (command.op === 'begin') {
    // 'plan-loaded' + begin → the unconditional unregistered cell (§(6)).
    if (state === 'plan-loaded') {
      return noAttempt(
        errorReply(
          command,
          state,
          'unregistered',
          'begin before external registration is impossible by §18.4: "Register each attempt ID externally before begin."',
        ),
      );
    }
    if (state !== 'ready' && state !== 'admission-pending') return general();
    if (facts.plan === null) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'no frozen plan is presented (§18.2: an immutable plan is frozen first)',
        ),
      );
    }
    const slot = facts.plan.slots.find((row) => row.id === command.input.registration.slotId);
    if (slot === undefined) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          `slot ${command.input.registration.slotId} is not planned (§18.4: begin validates the registered attempt, original slot and scope)`,
        ),
      );
    }
    const scenario = facts.plan.scenarios.find((row) => row.id === slot.scenarioId);
    if (scenario === undefined) {
      return noAttempt(
        errorReply(command, state, 'invalid-input', `scenario ${slot.scenarioId} is not planned`),
      );
    }
    const faults = registrationFaults(command.input.registration, {
      plannedSlotIds: facts.plan.slots.map((row) => row.id),
      canonicalConditionKey: conditionKeyOf(scenario.scopeId, slot.id),
      registrations: facts.registrations,
      dispositions: facts.dispositions,
      mode: 'begin',
    });
    if (faults.length > 0) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          `begin validation rejected: ${faultReasons(faults)}`,
        ),
      );
    }
    if (!isKnown(facts.admittedAt)) {
      return noAttempt(
        pendingReply(
          command,
          'admission-pending',
          'awaiting-admission',
          '§18.6: a pending admission without claiming collection has begun',
          're-issue begin when the admission stamp is available',
        ),
      );
    }
    const stamp = facts.admittedAt.value;
    const attempt = openAttempt(command.input, stamp, slot, scenario, facts.openSession);
    const reply = okReply(
      command,
      'capturing',
      'admission',
      {
        kind: 'admission',
        visitId: command.input.visitId,
        attemptId: attempt.registration.attemptId,
        admittedAt: knownField(stamp),
      },
      'the registered attempt is admitted for one bounded capture (§18.3/§18.6)',
    );
    return { reply, nextAttempt: attempt };
  }

  if (command.op === 'abort') {
    if (state !== 'capturing') return general();
    if (facts.attempt === null || facts.visitId === null || command.visitId !== facts.visitId) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'inconsistent IDs: the abort command does not answer the attempt in flight (§18.6)',
        ),
      );
    }
    const inFlight = facts.attempt;
    const plan = facts.plan;
    if (plan === null) return general();
    const slot = plan.slots.find((row) => row.id === inFlight.registration.slotId);
    if (slot === undefined) return general();
    const scenario = plan.scenarios.find((row) => row.id === slot.scenarioId);
    if (scenario === undefined) return general();
    const updated = invalidateAcquisition(inFlight, {
      reason: 'aborted',
      at: knownField(facts.at),
      details:
        command.reason.length > 0
          ? command.reason
          : 'aborted without a stated reason (§18.6: abort never means discard)',
      evidenceIds: [],
    });
    const result = assessSlotFulfilment(slot, scenario.scopeId, [attemptLinkOf(slot, updated)]);
    const reply = okReply(
      command,
      'stopped',
      'terminal',
      {
        kind: 'terminal',
        visitId: facts.visitId,
        attemptId: updated.registration.attemptId,
        result,
      },
      '§18.6: abort stops acquisition, retains its prefix and returns the invalid terminal result; it never means discard',
    );
    return { reply, nextAttempt: updated };
  }

  if (command.op === 'endVisit') {
    if (state === 'capturing') {
      if (
        facts.attempt === null ||
        facts.visitId === null ||
        command.input.visitId !== facts.visitId
      ) {
        return noAttempt(
          errorReply(
            command,
            state,
            'invalid-input',
            'inconsistent IDs: the endVisit command does not answer the attempt in flight (§18.6)',
          ),
        );
      }
      let attemptFor = facts.attempt;
      const plan = facts.plan;
      if (plan === null) return general();
      const slot = plan.slots.find((row) => row.id === attemptFor.registration.slotId);
      if (slot === undefined) return general();
      const scenario = plan.scenarios.find((row) => row.id === slot.scenarioId);
      if (scenario === undefined) return general();
      const atBoundary =
        isKnown(attemptFor.frame) && attemptFor.frame.value.rawCompleteness === 'complete';
      if (!atBoundary) {
        attemptFor = invalidateAcquisition(attemptFor, {
          reason: 'ended-early',
          at: knownField(facts.at),
          details:
            'endVisit was called before the required boundary; the attempt was ended early (§18.6)',
          evidenceIds: [],
        });
      }
      const result = assessSlotFulfilment(slot, scenario.scopeId, [
        attemptLinkOf(slot, attemptFor),
      ]);
      const reply = okReply(
        command,
        'stopped',
        'terminal',
        {
          kind: 'terminal',
          visitId: facts.visitId,
          attemptId: attemptFor.registration.attemptId,
          result,
        },
        atBoundary
          ? '§18.6: the attempt stops at its required boundary with a valid terminal result'
          : '§18.6: endVisit stops the attempt as ended early before its required boundary',
      );
      return { reply, nextAttempt: attemptFor };
    }
    if (state === 'stopped') {
      const faults = reconciliationFaults(facts.visitId, command.input);
      if (faults.length > 0) {
        return noAttempt(
          errorReply(
            command,
            state,
            'reconciliation-failed',
            `evidence reconciliation failed: ${faultReasons(faults)} (§18.6: endVisit seals a stopped attempt after evidence reconciliation)`,
          ),
        );
      }
      if (facts.attempt === null) {
        return noAttempt(
          errorReply(
            command,
            state,
            'invalid-input',
            'no attempt record survives the reconciliation (§18.4)',
          ),
        );
      }
      const inFlight = facts.attempt;
      const plan = facts.plan;
      if (plan === null) return general();
      const slot = plan.slots.find((row) => row.id === inFlight.registration.slotId);
      if (slot === undefined) return general();
      const scenario = plan.scenarios.find((row) => row.id === slot.scenarioId);
      if (scenario === undefined) return general();
      const sealed = sealAttempt(inFlight, command.input, facts.at);
      const result = assessSlotFulfilment(slot, scenario.scopeId, [attemptLinkOf(slot, sealed)]);
      const reply = okReply(
        command,
        'sealed',
        'terminal',
        {
          kind: 'terminal',
          visitId: command.input.visitId,
          attemptId: sealed.registration.attemptId,
          result,
        },
        '§18.6: endVisit seals a stopped attempt after evidence reconciliation',
      );
      return { reply, nextAttempt: sealed };
    }
    return general();
  }

  if (command.op === 'prepareExport') {
    if (state === 'prepared') {
      // predicated (prepareRepeat — the ratified idempotency carve-out): the same artefact
      // ID, target and frozen content succeeds without rebuilding bytes; everything else
      // fails without mutation (the general cell).
      const previous = facts.previous;
      const sameArtefact =
        previous !== null &&
        previous.artifactId === command.artifactId &&
        previous.kind === command.target.kind &&
        (isKnown(facts.digest) ? facts.digest.value === previous.sha256 : true);
      if (!sameArtefact || previous === null) return general();
      return noAttempt(
        okReply(
          command,
          state,
          'prepared',
          { kind: 'prepared', prepared: previous },
          '§18.6: repeating preparation for the same artefact returns identical bytes; no collection or upload occurs',
        ),
      );
    }
    const planTarget = state === 'plan-loaded' || state === 'ready';
    const visitTarget = state === 'sealed';
    const indexTarget = state === 'released';
    if (!planTarget && !visitTarget && !indexTarget) return general();
    const wantedKind = planTarget ? 'plan' : visitTarget ? 'visit' : 'index';
    if (command.target.kind !== wantedKind) return general();
    if (indexTarget) {
      // LEGAL index-part cell: the archive references, the part numbering and the §18.4 byte
      // cap (§(6) indexPreparation); failure → error 'invalid-index', state 'current'.
      const faults = indexPreparationFaults(
        facts,
        facts.prepared === null ? null : facts.prepared.byteLength,
      );
      if (faults.length > 0) {
        return noAttempt(
          errorReply(
            command,
            state,
            'invalid-index',
            `index preparation rejected: ${faultReasons(faults)}`,
          ),
        );
      }
    }
    if (!isKnown(facts.digest)) {
      // DIGEST LAW: after otherwise-successful initial validation, unavailable hashing
      // returns pending, the lifecycle state unchanged, no receipt, no export/release.
      return noAttempt(
        pendingReply(
          command,
          state,
          'digest-unavailable',
          '§18.6/§19: the digest is computed host-side (the secure-context rule); hashing is unavailable in this serving context, so nothing is prepared',
          'repeat prepareExport once a secure context or a recorded digest is available',
        ),
      );
    }
    if (facts.prepared === null) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'no prepared receipt was built for the validated target (§18.6: it returns artefact ID, suggested filename, byte length, SHA-256 and retained counts)',
        ),
      );
    }
    const receiptFaults = preparedReceiptFaults(command, facts);
    if (receiptFaults.length > 0) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-prepared',
          `prepared receipt rejected: ${faultReasons(receiptFaults)}`,
        ),
      );
    }
    return noAttempt(
      okReply(
        command,
        'prepared',
        'prepared',
        { kind: 'prepared', prepared: facts.prepared },
        `artefact ${facts.prepared.artifactId} prepared: ${facts.prepared.byteLength} bytes, ${facts.prepared.rawIntervalRows} raw interval row(s), ${facts.prepared.visitObjectRecords} visit object record(s) (§18.6)`,
      ),
    );
  }

  if (command.op === 'exportPrepared') {
    if (state !== 'prepared' && state !== 'awaiting-verification') return general();
    if (facts.previous === null || facts.previous.artifactId !== command.artifactId) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'inconsistent IDs: the export command does not answer the prepared artefact (§18.6)',
        ),
      );
    }
    if (facts.transport !== null && facts.transport.transport !== command.transport) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'inconsistent IDs: the transport record does not answer the commanded transport (§18.6)',
        ),
      );
    }
    const record: MobileCTransport = facts.transport ?? {
      transport: command.transport,
      handoff: 'not-started',
      reason: 'no user activation record exists (§18.6: missing activation stays pending)',
    };
    const pendingVerdict = decide('pending', 'verification not issued yet');
    if (record.handoff === 'handed-off') {
      return noAttempt(
        okReply(
          command,
          nextControlState(state, record, pendingVerdict),
          'transport',
          { kind: 'transport', transport: record },
          '§18.6: the handoff status returns, never proof of durable storage; only the saved-file verification permits release',
        ),
      );
    }
    if (record.handoff === 'failed') {
      return noAttempt(
        errorReply(
          command,
          nextControlState(state, record, pendingVerdict),
          'transport-io',
          '§18.6: a transport I/O failure returns an error while PRESERVING the prepared artefact',
        ),
      );
    }
    return noAttempt(
      pendingReply(
        command,
        nextControlState(state, record, pendingVerdict),
        'awaiting-transport',
        record.handoff === 'cancelled'
          ? '§18.6: cancellation stays pending with the prepared artefact held'
          : '§18.6: missing activation stays pending with an explicit reason',
        'issue exportPrepared again through a user-activated native save/share/download gesture',
      ),
    );
  }

  if (command.op === 'verifySaved') {
    if (state !== 'awaiting-verification') return general();
    if (facts.previous === null) {
      return noAttempt(
        errorReply(command, state, 'invalid-input', 'no prepared artefact survives (§18.6)'),
      );
    }
    const verificationInput = facts.verification;
    if (verificationInput === null) {
      return noAttempt(
        pendingReply(
          command,
          state,
          'awaiting-selection',
          '§18.6: cancellation/unsupported selection remains pending; the native file-selection dialog never opened',
          'open the native file-selection dialog and re-issue verifySaved',
        ),
      );
    }
    if (verificationInput.prepared.artifactId !== command.artifactId) {
      return noAttempt(
        errorReply(
          command,
          state,
          'invalid-input',
          'inconsistent IDs: the verify command does not answer the prepared artefact (§18.6)',
        ),
      );
    }
    const faults = verificationFaults(verificationInput);
    if (faults.length > 0) {
      return noAttempt(
        errorReply(
          command,
          state,
          'verification-mismatch',
          `${faults.join(', ')} — the buffer stays retained (§18.6: a mismatch is a loud error and retains the buffer)`,
        ),
      );
    }
    return noAttempt(
      okReply(
        command,
        'released',
        'verified',
        { kind: 'verified', receipt: verificationInput.receipt },
        `verified against the saved file ${verificationInput.receipt.actualFileName} (§18.6: the receipt records the actual basename, digest and verification time; buffer release is now permitted)`,
      ),
    );
  }

  return general();
};
