/**
 * §21 capture rows for src/perf/mobile-capture.ts, plus the §12 canonical purity fence.
 *
 * Node-only Vitest, deterministic injected inputs, no jsdom, no clocks, no observers, no file
 * operations (§18.1/§21). The plan fixture is generated over the COMMITTED registry values
 * (rooms/index.ts, src/camera/square-rail.ts) so no name is invented; every §18.9 absence
 * convention carries an honest reason, never a zero.
 */

import { describe, expect, it } from 'vitest';

import { AIRLOCKS, ENTRIES } from '../rooms/index';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import {
  appendFrameRow,
  assessSlotFulfilment,
  buildGeneralReply,
  COMMAND_TABLE,
  canFulfilSlot,
  conditionKeyOf,
  countVisitObjectNodes,
  invalidateForOverflow,
  judgeProspectiveAppend,
  MOBILE_CAPTURE_MAX_BYTES,
  MOBILE_CAPTURE_MAX_FRAMES,
  MOBILE_CAPTURE_MAX_RECORDS,
  MOBILE_FRAME_WINDOW_MS,
  type MobileCArchiveFacts,
  type MobileCCommandFacts,
  type MobileCCommittedInventory,
  type MobileCProspectiveAppend,
  markAttemptLost,
  openAttempt,
  planValidationFaults,
  recordActivitySegment,
  recordStopEvent,
  recordTransit,
  recordVisibilityEvent,
  registrationFaults,
  runCommand,
} from '../src/perf/mobile-capture';
import type {
  MobileCAttempt,
  MobileCAttemptLink,
  MobileCBeginInput,
  MobileCCache,
  MobileCCommand,
  MobileCEndInput,
  MobileCEpoch,
  MobileCId,
  MobileCItinerary,
  MobileCPlanV1,
  MobileCPrepared,
  MobileCProfile,
  MobileCRawInterval,
  MobileCRegistration,
  MobileCReportV1,
  MobileCSavedReceipt,
  MobileCSelection,
  MobileCSlot,
  MobileCStamp,
  MobileCThermal,
  MobileCTransit,
  MobileCVerificationInput,
} from '../src/perf/mobile-report';
import { isKnown, knownField, notApplicableField, unknownField } from '../src/perf/mobile-report';

// ---------------------------------------------------------------------------
// Deterministic fixtures. The committed inventory and the plan derive from the
// committed registry values; nothing is read from a clock or a device.
// ---------------------------------------------------------------------------

const COMMIT_SHA = 'committed-registry-2026-10-31';

const railIds = (stops: readonly { id: string }[]): MobileCId[] => stops.map((stop) => stop.id);

const committed: MobileCCommittedInventory = Object.freeze({
  commit: COMMIT_SHA,
  rooms: Object.freeze([
    { id: 'square', stopIds: Object.freeze(railIds(SQUARE_RAIL.stops)) },
    ...ENTRIES.filter((entry) => entry.kind === 'room').map((entry) => ({
      id: entry.id,
      stopIds: Object.freeze(railIds(entry.contract.rail.stops)),
    })),
  ]),
  airlocks: Object.freeze(
    AIRLOCKS.map((def) => {
      if (def.to === null) throw new Error('fixture: a dead-end airlock is not committed');
      return { id: def.id, from: def.from, to: def.to };
    }),
  ),
});

const DEVICES = ['device-android', 'device-iphone'] as const;
const SELECTIONS = ['clean-profile-auto', 'explicit-q=t0'] as const;
const EPOCHS = ['2026-06-21T12:00:00Z', '2026-01-15T10:00:00Z', '2026-01-15T18:00:00Z'] as const;

const portable = (text: string): MobileCId => text.replace(/[^A-Za-z0-9_-]/g, '-');

const THIRDS: readonly {
  third: 1 | 2 | 3;
  activity: 'resting' | 'looking' | 'stepping';
  startOffsetMs: number;
  endOffsetMs: number;
}[] = [
  { third: 1, activity: 'resting', startOffsetMs: 0, endOffsetMs: 20_000 },
  { third: 2, activity: 'looking', startOffsetMs: 20_000, endOffsetMs: 40_000 },
  { third: 3, activity: 'stepping', startOffsetMs: 40_000, endOffsetMs: MOBILE_FRAME_WINDOW_MS },
];

const ROOM_IDS: readonly MobileCId[] = committed.rooms
  .filter((room) => room.id !== 'square')
  .map((room) => room.id);
const firstRoom = ROOM_IDS[0];
if (firstRoom === undefined) throw new Error('fixture: the committed rooms are empty');
const SENTINEL_ROOM: MobileCId = firstRoom; // the chain's first room carries the overlays

/** The directed-airlock §(4) endpoint mapping: committed forward edges + the host-owned cuts. */
const DIRECTED: readonly { airlockId: string; from: string; to: string }[] = [
  ...AIRLOCKS.map((def) => ({ airlockId: def.id, from: def.from, to: def.to ?? def.from })),
  ...ROOM_IDS.map((roomId) => ({ airlockId: 'index-square-cut', from: roomId, to: 'square' })),
];

const directedId = (entry: { airlockId: string; from: string; to: string }): string =>
  `dir-${entry.airlockId}-from-${entry.from}`;

const slotIdOf = (prefix: string, repeat: number): string => `${prefix}-slot-r${repeat}`;

/** Builds a faultless §18.2 plan over the committed registry (the same generator logic the plan tool uses). */
const buildPlan = (): MobileCPlanV1 => {
  const rooms = committed.rooms.map((room) => ({ id: room.id, stopIds: [...room.stopIds] }));
  const stops = committed.rooms.flatMap((room) =>
    room.stopIds.map((stopId) => ({ id: stopId, roomId: room.id })),
  );
  const inventory = {
    commit: COMMIT_SHA,
    rooms,
    stops,
    directedAirlocks: DIRECTED.map((entry) => ({
      id: directedId(entry),
      airlockId: entry.airlockId,
      fromRoomId: entry.from,
      toRoomId: entry.to,
      fromStopId:
        committed.rooms.find((room) => room.id === entry.from)?.stopIds.slice(-1)[0] ?? 's',
      toStopId: committed.rooms.find((room) => room.id === entry.to)?.stopIds[0] ?? 's',
    })),
    evidenceIds: [],
  };
  const itineraries: MobileCItinerary[] = ROOM_IDS.map((roomId) => {
    const room = committed.rooms.find((row) => row.id === roomId);
    return {
      id: `it-${roomId}`,
      roomId,
      stopIdsInOrder: room === undefined ? [] : [...room.stopIds],
      legality: {
        status: 'pending',
        reason:
          'the §18.2 stepping order derives from the committed rail stop order; the registry does not model intra-room legs',
        evidenceIds: [],
      },
    };
  });
  const devices = DEVICES.map((deviceId) => ({
    id: deviceId,
    label: 'adoption pending',
    physicalPhone: true as const,
  }));
  const scopes = DEVICES.flatMap((deviceId) =>
    SELECTIONS.flatMap((selection) =>
      EPOCHS.map((epoch) => ({
        id: `scope-${portable(deviceId)}-${portable(selection)}-${portable(epoch)}`,
        deviceId,
        selection,
        epoch,
        entryLocation: `/#/${selection === 'explicit-q=t0' ? '?q=t0&' : '?'}at=${epoch}`,
        epochMechanism: 'committed ?at= URL selector; det stays absent (§(5))',
        epochInputs: [{ name: 'at', value: epoch }],
        evidenceIds: [],
      })),
    ),
  );
  const scenarios: {
    id: string;
    scopeId: string;
    target:
      | { kind: 'room'; roomId: string; itineraryId: string; sentinel: boolean }
      | { kind: 'directed-airlock'; directedAirlockId: string }
      | { kind: 'first-exterior'; exteriorRoomId: string };
  }[] = [];
  const slots: MobileCSlot[] = [];
  const thirds = THIRDS.map((third) => ({ ...third }));
  for (const scope of scopes) {
    for (const roomId of ROOM_IDS) {
      const scenarioId = `sc-room-${scope.id}-${roomId}`;
      const sentinel = roomId === SENTINEL_ROOM;
      scenarios.push({
        id: scenarioId,
        scopeId: scope.id,
        target: { kind: 'room', roomId, itineraryId: `it-${roomId}`, sentinel },
      });
      for (const repeat of [1, 2, 3] as const) {
        const baseId = slotIdOf(scenarioId, repeat);
        const isProbePrecede = sentinel && repeat === 3;
        if (isProbePrecede) {
          const probe: MobileCSlot = {
            id: `${baseId}-probe`,
            scenarioId,
            repeat: 3,
            gate: 'expected-invalidation',
            thirds: thirds.map((third) => ({ ...third })),
            cacheIntent: {
              kind: 'room-baseline',
              httpAssets: 'warm',
              decodedAssets: {
                state: 'not-applicable',
                reason: 'the room-baseline probe records its state in the attempt',
              },
              destinationReady: {
                state: 'not-applicable',
                reason: 'the probe rides the baseline entry intent',
              },
              description: 'the separately planned visibility-interruption probe (§18.2)',
            },
            baselineOrientation: 'portrait',
            manipulations: ['visibility-interruption'],
            postSoakRequired: true,
            precedingProbeSlotId: {
              state: 'not-applicable',
              reason: 'the probe precedes a floor window',
            },
            parentFrameSlotId: { state: 'known', value: baseId, evidenceIds: [] },
          };
          slots.push(probe);
        }
        const manipulations: readonly (
          | 'landscape'
          | 'browser-bars'
          | 'visibility-interruption'
          | 'resume'
        )[] =
          sentinel && repeat === 1
            ? ['landscape']
            : sentinel && repeat === 2
              ? ['browser-bars']
              : sentinel && repeat === 3
                ? ['resume']
                : [];
        slots.push({
          id: baseId,
          scenarioId,
          repeat,
          gate: 'frame-floor',
          thirds: thirds.map((third) => ({ ...third })),
          cacheIntent: {
            kind: 'room-baseline',
            httpAssets: 'warm',
            decodedAssets: {
              state: 'not-applicable',
              reason: 'the room-baseline intent does not predeclare decode state',
            },
            destinationReady: {
              state: 'not-applicable',
              reason: 'readiness is recorded by the attempt',
            },
            description: '§18.2 room slot',
          },
          baselineOrientation: sentinel && repeat === 1 ? 'landscape' : 'portrait',
          manipulations,
          postSoakRequired: repeat === 3,
          precedingProbeSlotId: isProbePrecede
            ? { state: 'known', value: `${baseId}-probe`, evidenceIds: [] }
            : { state: 'not-applicable', reason: 'no probe precedes this slot' },
          parentFrameSlotId: { state: 'not-applicable', reason: 'a floor slot has no parent' },
        });
      }
    }
    for (const entry of DIRECTED) {
      const dirId = directedId(entry);
      const scenarioId = `sc-airlock-${dirId}-${scope.id}`;
      scenarios.push({
        id: scenarioId,
        scopeId: scope.id,
        target: { kind: 'directed-airlock', directedAirlockId: dirId },
      });
      for (const repeat of [1, 2, 3] as const) {
        const cold = repeat === 1;
        slots.push({
          id: slotIdOf(scenarioId, repeat),
          scenarioId,
          repeat,
          gate: 'frame-floor',
          thirds: thirds.map((third) => ({ ...third })),
          cacheIntent: {
            kind: cold ? 'cold-unprepared-destination' : 'warm-destination',
            httpAssets: cold ? 'cold' : 'warm',
            decodedAssets: cold
              ? { state: 'known', value: 'cold', evidenceIds: [] }
              : {
                  state: 'pending',
                  reason: 'decoded warmth comes from the visited preparation',
                  nextAction: 'record decode state at slot entry',
                },
            destinationReady: cold
              ? { state: 'known', value: false, evidenceIds: [] }
              : {
                  state: 'pending',
                  reason: 'warm HTTP assets do not imply a resident or ready room',
                  nextAction: 'record readiness by observation',
                },
            description: '§18.2 directed-airlock slot',
          },
          baselineOrientation: 'portrait',
          manipulations: [],
          postSoakRequired: repeat === 3,
          precedingProbeSlotId: { state: 'not-applicable', reason: 'no probe precedes this slot' },
          parentFrameSlotId: { state: 'not-applicable', reason: 'a floor slot has no parent' },
        });
      }
    }
    const exteriorId = `sc-first-exterior-${scope.id}`;
    scenarios.push({
      id: exteriorId,
      scopeId: scope.id,
      target: { kind: 'first-exterior', exteriorRoomId: 'square' },
    });
    for (const repeat of [1, 2, 3] as const) {
      slots.push({
        id: slotIdOf(exteriorId, repeat),
        scenarioId: exteriorId,
        repeat,
        gate: 'first-exterior',
        thirds: [],
        cacheIntent: {
          kind: 'cold-navigation',
          httpAssets: 'cold',
          decodedAssets: { state: 'known', value: 'cold', evidenceIds: [] },
          destinationReady: { state: 'known', value: false, evidenceIds: [] },
          description: '§18.2/§18.7 cold navigation probe',
        },
        baselineOrientation: 'portrait',
        manipulations: [],
        postSoakRequired: repeat === 3,
        precedingProbeSlotId: { state: 'not-applicable', reason: 'no probe precedes this slot' },
        parentFrameSlotId: {
          state: 'not-applicable',
          reason: 'a navigation probe has no parent frame slot',
        },
      });
    }
  }
  return {
    id: `plan-${portable('2026-11-01T09:00:00Z')}`,
    frozenAtUtc: '2026-11-01T09:00:00Z',
    build: {
      commit: COMMIT_SHA,
      buildId: `author-${COMMIT_SHA}`,
      bundleSha256: '',
      dirty: false,
      perfLog: true as const,
    },
    devices,
    scopes,
    inventory,
    itineraries,
    scenarios,
    slots,
    limits: {
      frameWindowMs: MOBILE_FRAME_WINDOW_MS,
      p95Ms: 33,
      p99Ms: 50,
      longTaskMs: 50,
      repeats: 3 as const,
      firstExteriorMs: 3_000,
      soakMs: 1_200_000,
      maxDraws: 250,
      maxTriangles: 1_000_000,
      ledgerCeilingBytes: { state: 'known', value: 268_435_456, evidenceIds: [] },
      ledgerUnitConvention: {
        state: 'known',
        value:
          'source-allocation bytes as recorded by the committed ledger rows — RoomLedger bytes/total (the report layer names its own copy sourceBytes), no device-format conversion',
        evidenceIds: [],
      },
      ratification: {
        status: 'pending',
        reason:
          'the §10 power-law exception and the Android identity/SoC adoption are pending owner decisions; §19 Phase A records both',
        evidenceIds: [],
      },
    },
    evidence: [],
  };
};

// --- begin-machinery fixtures (§18.3/§18.9: honest absence, never fabricated reads) ----------

const STAMP: MobileCStamp = { clockId: 'clock-performance', atMs: 0 };

const SPAN_FIELD = (
  delay: number,
): { state: 'known'; value: MobileCStamp; evidenceIds: MobileCId[] } => ({
  state: 'known',
  value: { clockId: STAMP.clockId, atMs: delay },
  evidenceIds: [],
});

const profileFixture = (selection: MobileCSelection, epoch: MobileCEpoch): MobileCProfile => ({
  deviceId: 'device-android',
  model: 'adoption pending',
  soc: unknownField('the Android identity/SoC adoption is pending (§10)', [
    'device information evidence',
  ]),
  gpu: unknownField('the SoC/GPU identity is pending (§10)', ['device information evidence']),
  ramGiB: unknownField('the RAM identity is pending', ['device information evidence']),
  os: 'Android',
  osVersion: 'adoption pending',
  browser: 'Chrome',
  browserVersion: 'adoption pending',
  userAgent: 'the operator records the UA string at capture',
  physicalPhone: true,
  display: {
    cssViewportPx: { width: 360, height: 740 },
    nativeDpr: unknownField('the display read happens at capture', ['the device display read']),
    reportedDevicePixelRatio: 3,
    coarsePointer: true,
    orientation: unknownField('orientation reads per manipulation', ['the manipulation overlays']),
    nominalRefreshHz: unknownField('refresh identity unestablished', ['the display read']),
    adaptiveRefresh: unknownField('refresh adaptivity unestablished', ['the display read']),
    refreshBehaviour: unknownField('refresh behaviour unestablished', ['the display read']),
    visualViewport: unknownField('the visual viewport read happens per frame', [
      'the display read',
    ]),
  },
  deviceMemoryApiGiB: unknownField('the memory API read happens at the profile boundary', [
    'the device memory read',
  ]),
  jsHeapApi: unknownField('the heap API read happens at the profile boundary', [
    'the heap API read',
  ]),
  tier: unknownField('the tier resolves at the boot probe', ['the §3 classifier']),
  tierSource: unknownField('the tier source records at the settle', ['the §3 classifier']),
  probeCount: unknownField('the probe count records at the settle', ['the boot probe']),
  selection,
  epoch,
  actualLocation: 'the actual URL is recorded at capture',
  detUsed: false,
  cleanProfile: {
    status: 'pending',
    reason: 'profile cleanliness is operator-evidenced (§19 §12)',
    evidenceIds: [],
  },
  visitorOverrideBefore: unknownField('the override read happens at the profile boundary', [
    'the storage read',
  ]),
  visitorOverrideAfter: unknownField('the override read happens at the seal', ['the storage read']),
  overridePreserved: {
    status: 'pending',
    reason: 'the override-preservation decision is operator-evidenced',
    evidenceIds: [],
  },
  rendererCapabilities: unknownField('the renderer capabilities read at the §11 boundary', [
    'the renderer capability reads',
  ]),
  evidenceIds: [],
});

const thermalFixture = (): MobileCThermal => ({
  sessionId: 'thermal-fixture',
  creditedBeforeAdmissionMs: knownField(0),
  segments: [],
  precedingEvidenceIds: [],
  reloadOccurred: false,
  externalContinuity: {
    status: 'pending',
    reason: 'the external continuity decision is operator-evidenced',
    evidenceIds: [],
  },
  soakQualification: {
    status: 'pending',
    reason: 'the soak qualification assesses at the archive boundary',
    evidenceIds: [],
  },
});

const cacheFixture = (): MobileCCache => ({
  at: { ...STAMP, atMs: 0 },
  httpAssets: { state: 'known', value: 'cold', evidenceIds: [] },
  decodedAssets: { state: 'known', value: 'cold', evidenceIds: [] },
  destinationResident: { state: 'known', value: false, evidenceIds: [] },
  destinationReady: { state: 'known', value: false, evidenceIds: [] },
  serviceWorkerEffect: {
    state: 'not-applicable',
    reason: 'the product runs no service worker (§18.3)',
  },
  restoredFromBackForwardCache: { state: 'known', value: false, evidenceIds: [] },
  resourceCoverage: {
    status: 'pending',
    reason: 'cache coverage is operator-evidenced',
    evidenceIds: [],
  },
  evidenceIds: [],
  qualification: {
    status: 'pending',
    reason: 'cache qualification assesses at the archive boundary',
    evidenceIds: [],
  },
});

const beginInputFixture = (registration: MobileCRegistration): MobileCBeginInput => ({
  visitId: 'visit-1',
  registration,
  profile: profileFixture(SELECTIONS[0], EPOCHS[0]),
  thermal: thermalFixture(),
  cacheBefore: cacheFixture(),
  powerStart: {
    at: { ...STAMP, atMs: 0 },
    batteryPercent: unknownField('the power read happens at capture (mains, §19 §2)', [
      'power/thermal evidence',
    ]),
    unplugged: unknownField('the power read happens at capture', ['power/thermal evidence']),
    normalPowerMode: unknownField('the power read happens at capture', ['power/thermal evidence']),
    lowPowerMode: unknownField('the power read happens at capture', ['power/thermal evidence']),
    ambientC: unknownField('the ambient read happens at capture', ['power/thermal evidence']),
    externalCooling: unknownField('the ambient read happens at capture', [
      'power/thermal evidence',
    ]),
    thermalState: unknownField('the thermal read happens at capture', ['power/thermal evidence']),
    thermalWarnings: unknownField('the thermal read happens at capture', [
      'power/thermal evidence',
    ]),
  },
  initialExteriorSettledAt: unknownField('the initial exterior settlement is operator evidence', [
    'the settled-boot trace',
  ]),
  importedProbe: notApplicableField('a frame-window attempt imports no navigation probe (§18.7)'),
  clocks: [
    {
      id: STAMP.clockId,
      kind: 'performance',
      timeOriginUnixMs: unknownField('the host reads the time origin', ['clock evidence']),
      resolutionMs: unknownField('the clock resolution read happens at capture', [
        'clock evidence',
      ]),
    },
  ],
  clockRelations: [],
  traces: [],
  evidence: [],
});

/** The §18.2 slot facts for the sentinel room's repeat-1 floor window (fixture address helpers). */
const sentinelSlotOf = (
  plan: MobileCPlanV1,
): { registration: MobileCRegistration; slotId: MobileCId } => {
  const scenario = plan.scenarios.find((row) => row.target.kind === 'room' && row.target.sentinel);
  if (scenario === undefined || scenario.target.kind !== 'room') {
    throw new Error('fixture: the sentinel room scenario is missing');
  }
  const slot = plan.slots.find((row) => row.scenarioId === scenario.id && row.repeat === 1);
  if (slot === undefined) throw new Error('fixture: the sentinel slot is missing');
  const scope = plan.scopes.find((row) => row.id === scenario.scopeId);
  if (scope === undefined) throw new Error('fixture: the scope is missing');
  const registration: MobileCRegistration = {
    attemptId: 'attempt-1',
    slotId: slot.id,
    registeredAtUtc: '2026-11-01T10:00:00Z',
    conditionKey: conditionKeyOf(scope.id, slot.id),
    retryOf: notApplicableField('a first attempt has no retry link'),
    externalEvidenceIds: [],
  };
  return { registration, slotId: slot.id };
};

const emptyFacts = (): MobileCCommandFacts => ({
  plan: null,
  commit: committed,
  registrations: [],
  dispositions: {},
  admittedAt: unknownField('no session stamp', ['the host clock read']),
  attempt: null,
  visitId: null,
  openSession: { initialRoomId: 'square', initialStopId: 'S0' },
  at: { ...STAMP, atMs: 0 },
  digest: knownField('digest-1'),
  prepared: null,
  previous: null,
  indexFacts: null,
  transport: null,
  verification: null,
});

const endInputFixture = (withNativeCpu: boolean): MobileCEndInput => ({
  visitId: 'visit-1',
  externalEvidence: [],
  traces: [],
  clockRelations: [],
  // §18.6: supplemental external evidence may fill ABSENT fields; it never rewrites a read.
  nativeCpu: withNativeCpu
    ? {
        state: 'known',
        value: {
          traceIds: ['trace-1'],
          coveredSpan: {
            state: 'known',
            value: {
              start: { clockId: STAMP.clockId, atMs: 0 },
              end: { clockId: STAMP.clockId, atMs: MOBILE_FRAME_WINDOW_MS },
            },
            evidenceIds: [],
          },
          rows: [],
          postLoadOverThresholdCount: { state: 'known', value: 0, evidenceIds: [] },
          completeCoverage: {
            status: 'pass',
            reason: 'the trace covers the required window',
            evidenceIds: ['trace-1'],
          },
          adjudication: {
            status: 'pending',
            reason: 'the §18.5 adjudication assesses at the archive boundary',
            evidenceIds: [],
          },
        },
        evidenceIds: [],
      }
    : unknownField('native CPU trace pending', ['native trace covering the window']),
});

/** The §18.6 plan-report prepared receipt (the tool's own §19.7 product in miniature). */
const preparedPlanFixture = (): MobileCPrepared => {
  const plan = buildPlan();
  return {
    artifactId: 'artifact-plan-1',
    kind: 'plan',
    suggestedFileName: `h3d-mobile-c_v1_${plan.id}_all_plan_artifact-plan-1.json`,
    mime: 'application/json',
    byteLength: 4_096,
    sha256: 'digest-1',
    rawIntervalRows: 0,
    visitObjectRecords: 0,
  };
};

const firstOf = <T>(items: readonly T[]): T => {
  const first = items[0];
  if (first === undefined) throw new Error('fixture: empty list');
  return first;
};

const intervalRow = (index: number, fromMs: number, deltaMs: number): MobileCRawInterval => ({
  index,
  fromMs,
  toMs: fromMs + deltaMs,
  deltaMs,
  // The render samples are host facts; this fixture carries no fabricated read.
  render: unknownField('render samples are host-injected facts; this fixture carries none', [
    'render sample',
  ]),
});

/** Opens the sentinel room's repeat-1 floor attempt deterministically. */
const openSentinelAttempt = (plan: MobileCPlanV1): MobileCAttempt => {
  const { registration, slotId } = sentinelSlotOf(plan);
  const slot = plan.slots.find((row) => row.id === slotId);
  const scenario = plan.scenarios.find((row) => row.id === slot?.scenarioId);
  if (slot === undefined || scenario === undefined) throw new Error('fixture: the slot is missing');
  return openAttempt(
    beginInputFixture(registration),
    { clockId: STAMP.clockId, atMs: 0 },
    slot,
    scenario,
    {
      initialRoomId: SENTINEL_ROOM,
      initialStopId: firstOf(SQUARE_RAIL.stops).id,
    },
  );
};

// ---------------------------------------------------------------------------
// §21 row 1 — parameterized frame-cap boundary. 32,768 accepted raw rows include
// the interruption-probe attempt's rows; the next row rejects with the cap, the
// retained prefix and a non-qualifying prefix window (§18.4).
// ---------------------------------------------------------------------------

describe('the frame-cap boundary', () => {
  const cadenceRow = (index: number): MobileCRawInterval => {
    const step = MOBILE_FRAME_WINDOW_MS / MOBILE_CAPTURE_MAX_FRAMES; // 1.83 ms rows fit the window
    return intervalRow(index, Number((index * step).toFixed(3)), Number(step.toFixed(3)));
  };

  it.each(['frame-floor', 'expected-invalidation'] as const)(
    'accepts exactly %d-equivalent bounded rows of a %s attempt and rejects the next (§18.4: the cap includes an interruption probe)',
    (gate) => {
      const plan = buildPlan();
      const probeSlot = plan.slots.find(
        (row) =>
          row.scenarioId.includes(SENTINEL_ROOM) &&
          (gate === 'expected-invalidation'
            ? row.gate === gate
            : row.repeat === 1 && row.gate === gate),
      );
      if (probeSlot === undefined) throw new Error('fixture: the gated slot is missing');
      const scenario = plan.scenarios.find((row) => row.id === probeSlot.scenarioId);
      if (scenario === undefined) throw new Error('fixture: the scenario is missing');
      const { registration } = sentinelSlotOf(plan);
      const attempt = openAttempt(
        beginInputFixture({ ...registration, slotId: probeSlot.id }),
        { clockId: STAMP.clockId, atMs: 0 },
        probeSlot,
        scenario,
        { initialRoomId: SENTINEL_ROOM, initialStopId: 'S0' },
      );
      if (!isKnown(attempt.frame)) throw new Error('fixture: the frame window did not open');
      const rows: MobileCRawInterval[] = [];
      for (let index = 0; index < MOBILE_CAPTURE_MAX_FRAMES; index += 1) {
        rows.push(cadenceRow(index));
      }
      const advanced: MobileCAttempt = {
        ...attempt,
        frame: knownField({
          ...attempt.frame.value,
          rawIntervals: rows,
          rawCompleteness: 'prefix',
        }),
      };
      const advancedFrame = advanced.frame;
      if (!isKnown(advancedFrame)) throw new Error('fixture: the prefix frame was lost');
      expect(advancedFrame.value.rawIntervals).toHaveLength(MOBILE_CAPTURE_MAX_FRAMES);

      // The NEXT required append exceeds the cap (the cap counts probe rows the same way).
      const boundary = appendFrameRow(advanced, cadenceRow(MOBILE_CAPTURE_MAX_FRAMES));
      expect(boundary.accepted).toBe(false);
      if (boundary.accepted || !('overflow' in boundary)) {
        throw new Error('fixture: the boundary row was accepted');
      }
      expect(boundary.code).toBe('frame-cap-overflow');
      expect(boundary.overflow).toStrictEqual({
        cap: 'frames',
        targetArtifactId: registration.attemptId,
        limit: MOBILE_CAPTURE_MAX_FRAMES,
        retained: MOBILE_CAPTURE_MAX_FRAMES,
        rejectedAtLeast: 1,
        firstRejectedAt: {
          clockId: STAMP.clockId,
          atMs: cadenceRow(MOBILE_CAPTURE_MAX_FRAMES).fromMs,
        },
      });

      // The invalidation retains the accepted prefix and refuses qualifying statistics.
      const invalidated = invalidateForOverflow(advanced, boundary.overflow);
      expect(invalidated.status).toBe('invalid');
      expect(invalidated.invalidations[0]?.reason).toBe('frame-overflow');
      expect(isKnown(invalidated.frame) ? invalidated.frame.value.rawIntervals.length : -1).toBe(
        MOBILE_CAPTURE_MAX_FRAMES,
      );
      const frame = invalidated.frame;
      if (isKnown(frame)) {
        const statistics = frame.value.statistics;
        expect(statistics.state).toBe('unknown'); // §18.4: prefix statistics cannot qualify a window
      }
    },
  );

  it('pins the frame cap constant itself so a re-typed number cannot slip through', () => {
    expect(MOBILE_CAPTURE_MAX_FRAMES).toBe(32_768);
  });
});

// ---------------------------------------------------------------------------
// §21 row 2 — parameterized record/byte boundaries. 4,096 JSON object nodes
// exclude rawIntervals subtrees and do not count arrays; 8,388,608 exact UTF-8
// bytes is inclusive (multibyte fixtures count code-point bytes, never
// string-length); prospective overflow invalidates before accepting the excess
// and retains an exportable terminal prefix (§18.4).
// ---------------------------------------------------------------------------

describe('the record/byte boundaries', () => {
  it('counts every JSON object node except rawIntervals subtrees; arrays never count', () => {
    const visit = {
      id: 'visit-1',
      attempt: { registration: { attemptId: 'attempt-1' }, status: 'valid' },
      rawIntervals: [
        { index: 0 }, // exempt: an object inside the rawIntervals subtree
        { index: 1, nested: { deep: true } },
        [1, 2, [3]],
      ],
      cacheBefore: { at: {} },
      terminal: [{ kind: 'overflow' }, { kind: 'record-overflow' }],
    };
    // root(1) + attempt(1) + registration(1) + cacheBefore(1) + its at(1) + terminal rows(2)
    expect(countVisitObjectNodes(visit)).toBe(7);
    expect(countVisitObjectNodes({ rawIntervals: [{}, {}, {}] })).toBe(1); // only the root counts
    expect(countVisitObjectNodes([[], [{}]])).toBe(1); // arrays do not count
    expect(countVisitObjectNodes(null)).toBe(0);
  });

  it('judges the 4,096 object-node cap inclusive; the next node rejects (§21 parameterized)', () => {
    const plan = buildPlan();
    const attempt = openSentinelAttempt(plan);
    const nodesAt = (count: number): MobileCProspectiveAppend => ({
      rows: count,
      objectNodes: count,
      currentUtf8Bytes: 0,
      prospectiveUtf8Bytes: 0,
      at: { clockId: STAMP.clockId, atMs: 0 },
    });
    expect(judgeProspectiveAppend(attempt, nodesAt(MOBILE_CAPTURE_MAX_RECORDS))).toStrictEqual({
      accepted: true,
    });
    const overflow = judgeProspectiveAppend(attempt, nodesAt(MOBILE_CAPTURE_MAX_RECORDS + 1));
    expect(overflow.accepted).toBe(false);
    if (overflow.accepted) throw new Error('fixture: the record overflow was accepted');
    expect(overflow.overflow.cap).toBe('records');
    expect(overflow.overflow.limit).toBe(4_096);
  });

  it.each([0, 1_000, 4_096] as const)(
    'judges the 8,388,608 exact UTF-8 byte cap inclusive with a %d-byte multibyte fixture piece',
    (bytes) => {
      const plan = buildPlan();
      const attempt = openSentinelAttempt(plan);
      // The host serialises JSON with TextEncoder: a multibyte payload's string length is 3
      // while its UTF-8 total is 6 — the judge answers the injected UTF-8 total only.
      const multibyte = 'ёёё';
      expect(multibyte.length).toBeLessThan(new TextEncoder().encode(multibyte).byteLength);
      const at = (next: number, current: number): MobileCProspectiveAppend => ({
        rows: 0,
        objectNodes: 0,
        currentUtf8Bytes: current,
        prospectiveUtf8Bytes: next,
        at: { clockId: STAMP.clockId, atMs: 0 },
      });
      // The accepted prefix (cap − bytes) plus the multibyte fixture piece reaches EXACTLY the
      // cap: §18.4's 8,388,608 exact UTF-8 bytes is inclusive.
      expect(
        judgeProspectiveAppend(
          attempt,
          at(MOBILE_CAPTURE_MAX_BYTES, MOBILE_CAPTURE_MAX_BYTES - bytes),
        ),
      ).toStrictEqual({ accepted: true });
      const overflow = judgeProspectiveAppend(
        attempt,
        at(MOBILE_CAPTURE_MAX_BYTES + 1, MOBILE_CAPTURE_MAX_BYTES + 1 - bytes),
      );
      expect(overflow.accepted).toBe(false);
      if (overflow.accepted) throw new Error('fixture: the byte overflow was accepted');
      expect(overflow.overflow.cap).toBe('bytes');
      // the retained amount is the accepted prefix's byte total (§18.4)
      expect(overflow.overflow.retained).toBe(MOBILE_CAPTURE_MAX_BYTES + 1 - bytes);
    },
  );

  it('invalidates prospectively before accepting the excess and retains the exportable prefix', () => {
    const plan = buildPlan();
    const attempt = openSentinelAttempt(plan);
    const accepted = appendFrameRow(attempt, intervalRow(0, 0, 16));
    if (!accepted.accepted) throw new Error('fixture: the row was refused');
    const overflow = judgeProspectiveAppend(accepted.attempt, {
      rows: 0,
      objectNodes: MOBILE_CAPTURE_MAX_RECORDS + 1,
      currentUtf8Bytes: 0,
      prospectiveUtf8Bytes: MOBILE_CAPTURE_MAX_BYTES + 1,
      at: { clockId: STAMP.clockId, atMs: 16 },
    });
    expect(overflow.accepted).toBe(false);
    if (overflow.accepted) throw new Error('fixture: accepted');
    expect(overflow.overflow.cap).toBe('records'); // frames → records → bytes (the first violated cap)
    const invalidated = invalidateForOverflow(accepted.attempt, overflow.overflow);
    expect(invalidated.status).toBe('invalid');
    expect(invalidated.invalidations[0]?.reason).toBe('record-overflow');
    expect(invalidated.overflows[0]).toStrictEqual(overflow.overflow);
    // The accepted prefix (the appended row) survives the invalidation for export.
    expect(isKnown(invalidated.frame) ? invalidated.frame.value.rawIntervals.length : -1).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §21 row 3 — the lifecycle: registered-before-begin, abort retains the invalid
// prefix, early endVisit invalidates, ordinary completion seals only through its
// legal path, visibility invalidates the whole attempt, and reconnect cannot
// revive a lost attempt (§18.3/§18.4/§18.6).
// ---------------------------------------------------------------------------

describe('the attempt lifecycle', () => {
  const beginCommand = (input: MobileCBeginInput): MobileCCommand => ({
    commandId: 'cmd-begin',
    op: 'begin',
    input,
  });
  const abortCommand = (): MobileCCommand => ({
    commandId: 'cmd-abort',
    op: 'abort',
    visitId: 'visit-1',
    reason: 'the operator stops the bounded capture',
  });
  const endVisitCommand = (atBoundary: boolean): MobileCCommand => ({
    commandId: 'cmd-endvisit',
    op: 'endVisit',
    input: endInputFixture(atBoundary),
  });

  const seedPlanRegistration = (): { plan: MobileCPlanV1; registration: MobileCRegistration } => {
    const plan = buildPlan();
    const { registration } = sentinelSlotOf(plan);
    return { plan, registration };
  };

  it('refuses begin before external registration; admits a registered attempt (§18.4/§21 row 3)', () => {
    const { plan, registration } = seedPlanRegistration();
    // 'ready' + begin with the §18.4 ledger unpresented: the validation fails loudly.
    const unregistered = runCommand('ready', beginCommand(beginInputFixture(registration)), {
      ...emptyFacts(),
      plan,
      admittedAt: SPAN_FIELD(16),
      registrations: [],
    });
    expect(unregistered.reply.outcome).toBe('error');
    expect(unregistered.reply.code).toBe('invalid-input');
    expect(unregistered.reply.reason).toContain('unregistered-attempt');
    expect(unregistered.nextAttempt).toBeNull();
    // Nothing advanced: the machine stays at the host's own state.
    expect(unregistered.reply.state).toBe('ready');

    // The externally presented ledger row admits one bounded capture (§18.6).
    const admitted = runCommand('ready', beginCommand(beginInputFixture(registration)), {
      ...emptyFacts(),
      plan,
      admittedAt: SPAN_FIELD(16),
      registrations: [registration],
    });
    expect(admitted.reply.outcome).toBe('ok');
    expect(admitted.reply.code).toBe('admission');
    expect(admitted.reply.state).toBe('capturing');
    if (admitted.reply.value.state === 'known') {
      expect(admitted.reply.value.value).toStrictEqual({
        kind: 'admission',
        visitId: 'visit-1',
        attemptId: 'attempt-1',
        admittedAt: {
          state: 'known',
          value: { clockId: STAMP.clockId, atMs: 16 },
          evidenceIds: [],
        },
      });
    }
    expect(admitted.nextAttempt !== null && isKnown(admitted.nextAttempt.frame)).toBe(true);
  });

  it('holds begin pending when the admission stamp is not yet known (§18.6)', () => {
    const { plan, registration } = seedPlanRegistration();
    const pending = runCommand('ready', beginCommand(beginInputFixture(registration)), {
      ...emptyFacts(),
      plan,
      admittedAt: unknownField('the host clock read failed this session', ['clock evidence']),
      registrations: [registration],
    });
    expect(pending.reply.outcome).toBe('pending');
    expect(pending.reply.code).toBe('awaiting-admission');
    expect(pending.reply.state).toBe('admission-pending'); // a pending admission, never 'capturing'
    expect(pending.nextAttempt).toBeNull();
    // The re-issued begin resolves only through the same admission predicate (§(6) ratification).
    const resolved = runCommand(
      'admission-pending',
      beginCommand(beginInputFixture(registration)),
      {
        ...emptyFacts(),
        plan,
        admittedAt: SPAN_FIELD(32),
        registrations: [registration],
      },
    );
    expect(resolved.reply.outcome).toBe('ok');
    expect(resolved.reply.code).toBe('admission');
    expect(resolved.reply.state).toBe('capturing');
    expect(resolved.nextAttempt !== null).toBe(true);
  });

  const admittedLifecycle = (): { plan: MobileCPlanV1; attempt: MobileCAttempt } => {
    const { plan, registration } = seedPlanRegistration();
    const admitted = runCommand('ready', beginCommand(beginInputFixture(registration)), {
      ...emptyFacts(),
      plan,
      admittedAt: SPAN_FIELD(0),
      registrations: [registration],
    });
    const attempt = admitted.nextAttempt;
    if (attempt === null) throw new Error('fixture: admission did not open an attempt');
    return { plan, attempt };
  };

  const withRows = (
    attempt: MobileCAttempt,
    rows: readonly MobileCRawInterval[],
  ): MobileCAttempt => {
    let current = attempt;
    for (const row of rows) {
      const appended = appendFrameRow(current, row);
      if (!appended.accepted)
        throw new Error(`fixture: row ${row.index} refused (${appended.code})`);
      current = appended.attempt;
    }
    return current;
  };

  it('abort retains the invalid prefix and answers the invalid terminal result (§18.6)', () => {
    const { plan, attempt } = admittedLifecycle();
    const given = withRows(attempt, [intervalRow(0, 0, 16), intervalRow(1, 16, 16)]);
    const aborted = runCommand('capturing', abortCommand(), {
      ...emptyFacts(),
      plan,
      attempt: given,
      visitId: 'visit-1',
      at: { clockId: STAMP.clockId, atMs: 40 },
    });
    expect(aborted.reply.outcome).toBe('ok');
    expect(aborted.reply.state).toBe('stopped');
    const updated = aborted.nextAttempt;
    if (updated === null) throw new Error('fixture: abort returned no attempt');
    expect(updated.status).toBe('invalid'); // the invalid terminal result
    expect(isKnown(updated.frame) ? updated.frame.value.rawIntervals.length : -1).toBe(2); // prefix retained
    expect(updated.invalidations[0]?.reason).toBe('aborted');
    if (aborted.reply.value.state === 'known' && aborted.reply.value.value.kind === 'terminal') {
      expect(aborted.reply.value.value.result.attempts[0]?.disposition).toBe('invalid');
    }
  });

  it('rejects an abort whose visit id does not answer the attempt in flight (§18.6 IDs)', () => {
    const { plan, attempt } = admittedLifecycle();
    const mismatched = runCommand('capturing', abortCommand(), {
      ...emptyFacts(),
      plan,
      attempt,
      visitId: 'visit-OTHER',
      at: { clockId: STAMP.clockId, atMs: 40 },
    });
    expect(mismatched.reply.outcome).toBe('error');
    expect(mismatched.reply.code).toBe('invalid-input');
    expect(mismatched.nextAttempt).toBeNull();
  });

  it('endVisit before the required boundary stops the attempt as ended early (§18.6)', () => {
    const { plan, attempt } = admittedLifecycle();
    const given = withRows(attempt, [intervalRow(0, 0, 16)]);
    const ended = runCommand('capturing', endVisitCommand(false), {
      ...emptyFacts(),
      plan,
      attempt: given,
      visitId: 'visit-1',
      at: { clockId: STAMP.clockId, atMs: 32 },
    });
    expect(ended.reply.outcome).toBe('ok');
    expect(ended.reply.state).toBe('stopped');
    const updated = ended.nextAttempt;
    if (updated === null) throw new Error('fixture: endVisit returned no attempt');
    expect(updated.status).toBe('invalid');
    expect(updated.invalidations[0]?.reason).toBe('ended-early');
  });

  it('ordinary completion stops valid at the boundary, then seals through the legal path (§18.6)', () => {
    const { plan, attempt } = admittedLifecycle();
    const given = withRows(attempt, [intervalRow(0, 59_900, 100)]); // the first sample overshoots the 60 s boundary
    expect(isKnown(given.frame) ? given.frame.value.rawCompleteness : 'missing').toBe('complete');
    const stopped = runCommand('capturing', endVisitCommand(false), {
      ...emptyFacts(),
      plan,
      attempt: given,
      visitId: 'visit-1',
      at: { clockId: STAMP.clockId, atMs: 60_010 },
    });
    expect(stopped.reply.state).toBe('stopped');
    const stoppedAttempt = stopped.nextAttempt;
    if (stoppedAttempt === null) throw new Error('fixture: endVisit returned no attempt');
    expect(stoppedAttempt.status).toBe('valid'); // the boundary was reached: a valid stop
    expect(stoppedAttempt.invalidations).toHaveLength(0);

    const sealed = runCommand('stopped', endVisitCommand(true), {
      ...emptyFacts(),
      plan,
      attempt: stoppedAttempt,
      visitId: 'visit-1',
      at: { clockId: STAMP.clockId, atMs: 60_050 },
    });
    expect(sealed.reply.outcome).toBe('ok');
    expect(sealed.reply.state).toBe('sealed'); // the ONLY legal path to 'sealed'
    const sealedAttempt = sealed.nextAttempt;
    if (sealedAttempt === null) throw new Error('fixture: the seal returned no attempt');
    // The supplemental native CPU evidence fills only an absent field (§18.6).
    expect(isKnown(sealedAttempt.longTasks.native)).toBe(true);
    // The graphics peaks aggregate the accepted rows' observed samples.
    expect(isKnown(sealedAttempt.graphics.peakDraws)).toBe(false); // no sample rides the fixture rows

    // The reconciliation failure keeps the state current; the seal does not go through (§18.6).
    const failed = runCommand(
      'stopped',
      { commandId: 'cmd-fail', op: 'endVisit', input: endInputFixture(false) },
      {
        ...emptyFacts(),
        plan,
        attempt: stoppedAttempt,
        visitId: 'visit-OTHER',
        at: { clockId: STAMP.clockId, atMs: 60_050 },
      },
    );
    expect(failed.reply.outcome).toBe('error');
    expect(failed.reply.code).toBe('reconciliation-failed');
  });

  it('visibility interruption invalidates the WHOLE attempt and records the event (§18.2)', () => {
    const { attempt } = admittedLifecycle();
    const given = withRows(attempt, [intervalRow(0, 0, 16)]);
    const result = recordVisibilityEvent(given, {
      atMs: 300,
      state: 'hidden',
      evidenceIds: ['evidence-hide-1'],
    });
    expect(result.invalidated).toBe(true);
    expect(result.attempt.status).toBe('invalid');
    expect(result.attempt.visibilityEvents).toHaveLength(1);
    expect(result.attempt.invalidations[0]?.reason).toBe('visibility-interruption');
    const invalidationAt = result.attempt.invalidations[0]?.at ?? {
      state: 'unknown',
      reason: '',
      requiredEvidence: [],
    };
    if (invalidationAt.state === 'known') {
      // The interruption stamp reads the observed window's own clock.
      expect(invalidationAt.value.clockId).toBe(STAMP.clockId);
      expect(invalidationAt.value.atMs).toBe(300);
    }
  });

  it('records one designated transit per slot and refuses a second (§18.2)', () => {
    const { attempt } = admittedLifecycle();
    const designatedTransit: MobileCTransit = {
      airlockId: 'arch-portal',
      directedAirlockId: 'dir-arch-portal-from-square',
      from: 'square',
      to: 'rastrelli-gallery',
      transit: 'doorway',
      holdMs: { state: 'known', value: 300, evidenceIds: [] },
      beganAtMs: 0,
      endedAtMs: { state: 'known', value: 300, evidenceIds: [] },
      readyAtBegin: { state: 'known', value: false, evidenceIds: [] },
      leanAtFireM: {
        state: 'not-applicable',
        reason: 'the doorway beat carries no lean read into the record',
      },
      dataReadyMs: { state: 'known', value: 0, evidenceIds: [] },
      swapMs: { state: 'known', value: 320, evidenceIds: [] },
      swapCostMs: { state: 'known', value: 2.5, evidenceIds: [] },
      postSwapDeltaMs: { state: 'known', value: 16, evidenceIds: [] },
      disposeCostMs: { state: 'known', value: 1.5, evidenceIds: [] },
      litAtMs: { state: 'known', value: 330, evidenceIds: [] },
      open: null,
      closed: [],
      frames: null,
      maxDeltaMs: { state: 'known', value: 16, evidenceIds: [] },
      maxDeltaPhase: { state: 'known', value: 'arrive', evidenceIds: [] },
      stalled: false,
      frameRows: [],
      designated: true,
      containmentAndCount: {
        status: 'pending',
        reason: 'the containment check assesses at the archive boundary',
        evidenceIds: [],
      },
    };
    const withTransit = recordTransit(attempt, designatedTransit);
    expect(withTransit.transits).toHaveLength(1);
    expect(() => recordTransit(withTransit, designatedTransit)).toThrow(/second transit/);
  });

  it('reconnect cannot revive a lost attempt; the record stays visibly lost (§18.4)', () => {
    const { attempt } = admittedLifecycle();
    const lost = markAttemptLost(
      attempt,
      'reload electron died before verifySaved; the registration stays visible',
    );
    expect(lost.status).toBe('lost');
    expect(() =>
      recordActivitySegment(lost, {
        fromMs: 10,
        toMs: 20,
        activity: 'resting',
        roomId: 'square',
        itineraryLegIndex: { state: 'not-applicable', reason: 'the square has no itinerary' },
        evidenceIds: [],
      }),
    ).toThrow(/lost attempt/);
    expect(() =>
      recordVisibilityEvent(lost, { atMs: 12, state: 'hidden', evidenceIds: [] }),
    ).toThrow(/lost attempt/);
    const refused = appendFrameRow(lost, intervalRow(9, 144, 16));
    expect(refused.accepted).toBe(false);
    if (refused.accepted) throw new Error('fixture: a lost attempt accepted a row');
    expect(refused.code).toBe('attempt-closed');
  });
});

// ---------------------------------------------------------------------------
// §21 row 4 — plan validation against the injected committed inventory. The plan
// fixture generates over the committed registry; mutations reject by code.
// ---------------------------------------------------------------------------

describe('the §18.2 plan validation', () => {
  it('accepts the generated plan against the committed registry without faults', () => {
    expect(planValidationFaults(buildPlan(), committed)).toStrictEqual([]);
  });

  it('rejects missing, duplicate and unknown inventory coverage (§21 row 4)', () => {
    const plan = buildPlan();
    const missing: MobileCPlanV1 = {
      ...plan,
      inventory: { ...plan.inventory, stops: plan.inventory.stops.slice(1) },
    };
    expect(planValidationFaults(missing, committed).map((fault) => fault.code)).toContain(
      'missing-inventory',
    );
    const duplicated: MobileCPlanV1 = {
      ...plan,
      inventory: {
        ...plan.inventory,
        rooms: [...plan.inventory.rooms, firstOf(plan.inventory.rooms)],
      },
    };
    expect(planValidationFaults(duplicated, committed).map((fault) => fault.code)).toContain(
      'duplicate-inventory',
    );
  });

  it('rejects illegal itineraries (each itinerary walks only the committed stop order)', () => {
    const plan = buildPlan();
    const illegal: MobileCPlanV1 = {
      ...plan,
      itineraries: plan.itineraries.map((itinerary) => ({
        ...itinerary,
        stopIdsInOrder: [...itinerary.stopIdsInOrder].reverse(),
      })),
    };
    expect(planValidationFaults(illegal, committed).map((fault) => fault.code)).toContain(
      'illegal-itinerary',
    );
  });

  it('rejects wrong epochs/selections; the runtime values re-validate (§21 row 4)', () => {
    const plan = buildPlan();
    const wrong: MobileCPlanV1 = JSON.parse(
      JSON.stringify(plan).replace(/"2026-06-21T12:00:00Z"/g, '"2030-01-01T00:00:00Z"'),
    );
    expect(planValidationFaults(wrong, committed).map((fault) => fault.code)).toContain(
      'wrong-scope-epoch-selection',
    );
  });

  it('rejects malformed sentinel, cold-warm and post-soak assignments (§21 row 4)', () => {
    const plan = buildPlan();
    const unOverlaid: MobileCPlanV1 = {
      ...plan,
      slots: plan.slots.map((slot) =>
        slot.manipulations.includes('landscape')
          ? { ...slot, baselineOrientation: 'portrait' }
          : slot,
      ),
    };
    expect(planValidationFaults(unOverlaid, committed).map((fault) => fault.code)).toContain(
      'malformed-sentinel',
    );
    const warmed: MobileCPlanV1 = {
      ...plan,
      slots: plan.slots.map((slot) =>
        slot.cacheIntent.kind === 'cold-unprepared-destination'
          ? { ...slot, cacheIntent: { ...slot.cacheIntent, httpAssets: 'warm' } }
          : slot,
      ),
    };
    expect(planValidationFaults(warmed, committed).map((fault) => fault.code)).toContain(
      'malformed-cache',
    );
    const soaked: MobileCPlanV1 = {
      ...plan,
      slots: plan.slots.map((slot) =>
        slot.repeat === 2 ? { ...slot, postSoakRequired: true } : slot,
      ),
    };
    expect(planValidationFaults(soaked, committed).map((fault) => fault.code)).toContain(
      'malformed-post-soak',
    );
  });

  it('freezes the accepted plan so its content cannot subsequently mutate (§18.2/§21 row 4)', () => {
    const plan = buildPlan();
    const loaded = runCommand(
      'empty',
      { commandId: 'cmd-load', op: 'loadPlan', plan },
      emptyFacts(),
    );
    expect(loaded.reply.outcome).toBe('ok');
    expect(loaded.reply.state).toBe('plan-loaded');
    const slot = firstOf(plan.slots);
    expect(() => {
      slot.repeat = 2; // a runtime write into frozen accepted content
    }).toThrow();
    expect(Object.isFrozen(plan.inventory)).toBe(true);
    expect(loaded.nextAttempt).toBeNull(); // loadPlan never starts collection (§18.3)
  });
});

// ---------------------------------------------------------------------------
// §21 row 5 — slot/registration validation: mismatched attempt/scope/slot/retry
// ancestry rejects; a retry has a new id and the original conditions; invalid
// attempts and expected-invalidation probes cannot fulfil floor slots or conceal
// predecessors (§18.2/§18.4/§18.6).
// ---------------------------------------------------------------------------

const scopeIdOfScenario = (plan: MobileCPlanV1, scenarioId: MobileCId): MobileCId => {
  const scenario = plan.scenarios.find((row) => row.id === scenarioId);
  if (scenario === undefined) throw new Error('fixture: the scenario is missing');
  return scenario.scopeId;
};

describe('the slot/registration validation', () => {
  it('rejects mismatched slot, condition and ledger ancestry (§18.2/§18.4)', () => {
    const plan = buildPlan();
    const { registration } = sentinelSlotOf(plan);
    const facts = {
      plannedSlotIds: plan.slots.map((row) => row.id),
      canonicalConditionKey: registration.conditionKey,
      registrations: [],
      dispositions: {},
    };
    expect(registrationFaults(registration, { ...facts, mode: 'register' })).toStrictEqual([]);
    expect(
      registrationFaults(
        { ...registration, slotId: 'slot-nowhere' },
        { ...facts, mode: 'register' },
      ),
    ).toContain('unknown-slot');
    expect(
      registrationFaults(
        { ...registration, conditionKey: 'scope-OTHER#slot-OTHER' },
        { ...facts, mode: 'register' },
      ),
    ).toContain('mismatched-condition');
    expect(
      registrationFaults(registration, {
        ...facts,
        registrations: [registration],
        mode: 'register',
      }),
    ).toContain('duplicate-attempt');
  });

  it('rejects begin-mode claims that misstate the presented ledger row (§18.6 IDs)', () => {
    const plan = buildPlan();
    const { registration } = sentinelSlotOf(plan);
    const facts = {
      plannedSlotIds: plan.slots.map((row) => row.id),
      canonicalConditionKey: registration.conditionKey,
      registrations: [registration],
      dispositions: {},
    };
    expect(registrationFaults(registration, { ...facts, mode: 'begin' })).toStrictEqual([]);
    expect(
      registrationFaults(
        { ...registration, conditionKey: 'scope-OTHER#slot-OTHER' },
        { ...facts, mode: 'begin' },
      ),
    ).toContain('mismatched-registration');
    expect(
      registrationFaults(
        { ...registration, attemptId: 'attempt-other' },
        { ...facts, mode: 'begin' },
      ),
    ).toContain('unregistered-attempt');
  });

  it('carries a retry with a new id and the original conditions; satisfied links reject (§18.2)', () => {
    const plan = buildPlan();
    const { registration } = sentinelSlotOf(plan);
    const retry: MobileCRegistration = {
      attemptId: 'attempt-2-retry',
      slotId: registration.slotId,
      registeredAtUtc: '2026-11-01T10:05:00Z',
      conditionKey: registration.conditionKey,
      retryOf: { state: 'known', value: registration.attemptId, evidenceIds: [] },
      externalEvidenceIds: [],
    };
    const facts = {
      plannedSlotIds: plan.slots.map((row) => row.id),
      canonicalConditionKey: registration.conditionKey,
      registrations: [registration],
      dispositions: {} as Record<string, 'valid' | 'invalid' | 'lost' | 'pending'>,
    };
    expect(
      registrationFaults(retry, {
        ...facts,
        dispositions: { 'attempt-1': 'pending' },
        mode: 'register',
      }),
    ).toStrictEqual([]);
    expect(
      registrationFaults(retry, {
        ...facts,
        dispositions: { 'attempt-1': 'invalid' },
        mode: 'register',
      }),
    ).toStrictEqual([]);
    expect(
      registrationFaults(retry, {
        ...facts,
        dispositions: { 'attempt-1': 'lost' },
        mode: 'register',
      }),
    ).toStrictEqual([]);
    // §18.2: retry invalid slots only — a valid predecessor is already satisfied.
    expect(
      registrationFaults(retry, {
        ...facts,
        dispositions: { 'attempt-1': 'valid' },
        mode: 'register',
      }),
    ).toContain('retry-satisfied');
    // a retry link to an attempt that never landed in the ledger rejects
    expect(registrationFaults(retry, { ...facts, registrations: [], mode: 'register' })).toContain(
      'retry-ancestry',
    );
  });

  it('invalid attempts and probes fulfil no floor slot; every predecessor stays visible (§21 row 5)', () => {
    const plan = buildPlan();
    const floorSlot = plan.slots.find((row) => row.gate === 'frame-floor');
    const probeSlot = plan.slots.find((row) => row.gate === 'expected-invalidation');
    if (floorSlot === undefined || probeSlot === undefined)
      throw new Error('fixture: the gates are missing');
    expect(canFulfilSlot(floorSlot.gate, 'valid')).toBe(true);
    expect(canFulfilSlot(floorSlot.gate, 'invalid')).toBe(false);
    expect(canFulfilSlot(floorSlot.gate, 'lost')).toBe(false);
    expect(canFulfilSlot(probeSlot.gate, 'invalid')).toBe(true); // the probe invalidates as planned
    expect(canFulfilSlot(probeSlot.gate, 'valid')).toBe(false); // a valid-looking probe is a §19 failure

    const scopeId = scopeIdOfScenario(plan, floorSlot.scenarioId);
    const key = conditionKeyOf(scopeId, floorSlot.id);
    const link = (
      attemptId: MobileCId,
      disposition: 'valid' | 'invalid',
      retryOf: MobileCRegistration['retryOf'],
    ): MobileCAttemptLink => ({
      attemptId,
      retryOf,
      conditionKey: key,
      disposition,
      visitFile: unknownField('the visit file is archived after export and verification', [
        'the visit verified save receipt',
      ]),
      measuredExceedance: unknownField(
        'the per-window assessments run on the sealed export (§18.5)',
        ['the plan MobileCLimits assessment'],
      ),
      explanation: `${disposition} attempt for slot ${floorSlot.id}`,
    });
    const assessed = assessSlotFulfilment(floorSlot, scopeId, [
      link('attempt-original', 'invalid', notApplicableField('a first attempt has no retry link')),
      link('attempt-retry', 'valid', {
        state: 'known',
        value: 'attempt-original',
        evidenceIds: [],
      }),
    ]);
    expect(assessed.attempts).toHaveLength(2); // no predecessor concealed (§18.2/§18.4)
    expect(assessed.fulfilment.status).toBe('pass');
    expect(isKnown(assessed.fulfillingAttemptId) ? assessed.fulfillingAttemptId.value : '').toBe(
      'attempt-retry',
    );
    // the failed original stays in the ledger's result rows (the record never disappears)
    expect(assessed.attempts.some((entry) => entry.attemptId === 'attempt-original')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §21 row 6 — the window boundary: the first terminal sample's entire overshooting
// interval is retained from the foreground baseline; activity/stop coverage
// requires observations; unexplained foreground stalls remain samples (§18.2/§10).
// ---------------------------------------------------------------------------

describe('the §21 window boundary', () => {
  it('retains the first terminal sample’s entire overshooting interval from the foreground baseline', () => {
    const plan = buildPlan();
    const attempt = openSentinelAttempt(plan);
    const appended = appendFrameRow(attempt, intervalRow(0, 59_988, 36));
    expect(appended.accepted).toBe(true);
    if (appended.accepted && isKnown(appended.attempt.frame)) {
      const frame = appended.attempt.frame.value;
      expect(frame.rawCompleteness).toBe('complete');
      expect(frame.actualEndMs.state).toBe('known');
      if (frame.actualEndMs.state === 'known') expect(frame.actualEndMs.value).toBe(60_024);
      expect(frame.rawIntervals).toStrictEqual([intervalRow(0, 59_988, 36)]); // the whole overshoot stays
    }
  });

  it('requires observations for stop coverage and keeps every foreground stall a sample', () => {
    const plan = buildPlan();
    const attempt = openSentinelAttempt(plan);
    if (!isKnown(attempt.frame)) throw new Error('fixture: the frame did not open');
    expect(attempt.frame.value.observedStopIds).toStrictEqual(['S0']); // the seeded observation
    // a REJECTED stop change is observed but does not extend the accepted coverage
    const rejected = recordStopEvent(attempt, {
      atMs: 10,
      fromRoomId: 'square',
      toRoomId: 'rastrelli-gallery',
      fromStopId: 'S1',
      toStopId: 'G0',
      cause: 'airlock',
      accepted: false,
      rejectionReason: { state: 'known', value: 'the transit never fired', evidenceIds: [] },
      evidenceIds: [],
    });
    expect(isKnown(rejected.frame) ? rejected.frame.value.observedStopIds : []).toStrictEqual([
      'S0',
    ]);
    // an ACCEPTED stop event extends the coverage: observations only, never inference
    const accepted = recordStopEvent(rejected, {
      atMs: 20,
      fromRoomId: 'square',
      toRoomId: 'rastrelli-gallery',
      fromStopId: 'S1',
      toStopId: 'G0',
      cause: 'airlock',
      accepted: true,
      rejectionReason: { state: 'not-applicable', reason: 'accepted' },
      evidenceIds: [],
    });
    expect(isKnown(accepted.frame) ? accepted.frame.value.observedStopIds : []).toStrictEqual([
      'S0',
      'G0',
    ]);
    // an unexplained foreground stall remains a sample: §10 — unexplained stalls count
    const stalled = appendFrameRow(accepted, intervalRow(1, 20, 10_000));
    if (!stalled.accepted) throw new Error('fixture: the stall row was refused');
    expect(
      isKnown(stalled.attempt.frame)
        ? stalled.attempt.frame.value.rawIntervals.map((row) => row.deltaMs)
        : [],
    ).toContain(10_000);
    // activity segments are recorded, never inferred from elapsed time (§18.2)
    const segmented = recordActivitySegment(stalled.attempt, {
      fromMs: 0,
      toMs: 10_000,
      activity: 'looking',
      roomId: 'square',
      itineraryLegIndex: { state: 'not-applicable', reason: 'the square has no itinerary' },
      evidenceIds: [],
    });
    expect(segmented.activities).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §21 row 7 — the frozen 10-state × 7-operation table: legal transitions succeed;
// every other combination fails loudly with command ID/state/reason/code and no
// unauthorized acquisition or release (the ratified §(6) text).
// ---------------------------------------------------------------------------

describe('the frozen command table', () => {
  const STATES = [
    'empty',
    'plan-loaded',
    'ready',
    'admission-pending',
    'capturing',
    'stopped',
    'sealed',
    'prepared',
    'awaiting-verification',
    'released',
  ] as const;
  const OPS = [
    'loadPlan',
    'begin',
    'abort',
    'endVisit',
    'prepareExport',
    'exportPrepared',
    'verifySaved',
  ] as const;
  // The §(6)-sanctioned (state, op) pairs; every other pair stays the general cell.
  const SPECIAL: ReadonlySet<string> = new Set([
    'empty|loadPlan',
    'plan-loaded|loadPlan',
    'released|loadPlan',
    'ready|loadPlan',
    'plan-loaded|begin',
    'ready|begin',
    'admission-pending|begin',
    'capturing|abort',
    'capturing|endVisit',
    'stopped|endVisit',
    'plan-loaded|prepareExport',
    'ready|prepareExport',
    'sealed|prepareExport',
    'prepared|prepareExport',
    'released|prepareExport',
    'prepared|exportPrepared',
    'awaiting-verification|exportPrepared',
    'awaiting-verification|verifySaved',
  ]);

  const commandFixture = (op: (typeof OPS)[number], plan: MobileCPlanV1): MobileCCommand => {
    switch (op) {
      case 'loadPlan':
        return { commandId: `cmd-${op}`, op, plan };
      case 'begin': {
        const { registration } = sentinelSlotOf(plan);
        return { commandId: `cmd-${op}`, op, input: beginInputFixture(registration) };
      }
      case 'abort':
        return { commandId: `cmd-${op}`, op, visitId: 'visit-1', reason: 'the operator stops it' };
      case 'endVisit':
        return { commandId: `cmd-${op}`, op, input: endInputFixture(false) };
      case 'prepareExport':
        return {
          commandId: `cmd-${op}`,
          op,
          artifactId: 'artifact-plan-1',
          target: { kind: 'plan' },
        };
      case 'exportPrepared':
        return {
          commandId: `cmd-${op}`,
          op,
          artifactId: 'artifact-plan-1',
          transport: 'native-share',
        };
      case 'verifySaved':
        return { commandId: `cmd-${op}`, op, artifactId: 'artifact-plan-1' };
    }
  };

  it('carries exactly 70 cells, each a flat data record', () => {
    let total = 0;
    for (const state of STATES) {
      for (const op of OPS) {
        total += 1;
        const cell = COMMAND_TABLE[state][op];
        expect(['ok', 'pending', 'error']).toContain(cell.outcome);
        expect(
          cell.nextState === 'current' || (STATES as readonly string[]).includes(cell.nextState),
        ).toBe(true);
        if (!SPECIAL.has(`${state}|${op}`)) {
          expect(cell).toStrictEqual({
            outcome: 'error',
            code: 'illegal-state',
            nextState: 'current',
            valueKind: 'none',
          });
        }
      }
    }
    expect(total).toBe(70);
  });

  it('answers every non-special pair with the loud general error and no attempt (§(6)/§21)', () => {
    const plan = buildPlan();
    for (const state of STATES) {
      for (const op of OPS) {
        if (SPECIAL.has(`${state}|${op}`)) continue;
        const result = runCommand(state, commandFixture(op, plan), emptyFacts());
        expect(result.reply.outcome).toBe('error');
        expect(result.reply.code).toBe('illegal-state');
        expect(result.reply.commandId).toBe(`cmd-${op}`);
        expect(result.reply.state).toBe(state);
        expect(result.reply.reason).toBe(
          `illegal state transition: ${op} from '${state}' (§18.6: "Malformed commands, illegal state transitions and inconsistent IDs fail without advancing the plan.")`,
        );
        expect(result.reply.value.state).toBe('unknown');
        expect(result.nextAttempt).toBeNull(); // no unauthorized acquisition or release
      }
    }
  });

  it('builds the same reply for the malformed-command path (§(6): fail the same way)', () => {
    expect(buildGeneralReply('cmd-bad', 'empty', 'warp')).toStrictEqual({
      commandId: 'cmd-bad',
      state: 'empty',
      outcome: 'error',
      code: 'illegal-state',
      reason:
        'illegal state transition: warp from \'empty\' (§18.6: "Malformed commands, illegal state transitions and inconsistent IDs fail without advancing the plan.")',
      value: {
        state: 'unknown',
        reason:
          'illegal state transition: warp from \'empty\' (§18.6: "Malformed commands, illegal state transitions and inconsistent IDs fail without advancing the plan.")',
        requiredEvidence: [],
      },
    });
  });

  it('loadPlan validates and freezes; validated re-freezes from plan-loaded and released succeed', () => {
    const plan = buildPlan();
    const first = runCommand('empty', { commandId: 'cmd-1', op: 'loadPlan', plan }, emptyFacts());
    expect(first.reply.outcome).toBe('ok');
    expect(first.reply.state).toBe('plan-loaded');
    if (first.reply.value.state === 'known' && first.reply.value.value.kind === 'plan-loaded') {
      expect(first.reply.value.value.planId).toBe(plan.id);
    }
    // a re-freeze of the (frozen) same plan stays legal; nothing is held
    const again = runCommand(
      'plan-loaded',
      { commandId: 'cmd-2', op: 'loadPlan', plan },
      emptyFacts(),
    );
    expect(again.reply.outcome).toBe('ok');
    // after a release a new campaign re-freezes ( ratified cells )
    const afterRelease = runCommand(
      'released',
      { commandId: 'cmd-3', op: 'loadPlan', plan: buildPlan() },
      emptyFacts(),
    );
    expect(afterRelease.reply.outcome).toBe('ok');
    // a validation failure fails without advancing (§18.6)
    const broken: MobileCPlanV1 = { ...plan, limits: { ...plan.limits, soakMs: 999 } };
    const rejected = runCommand(
      'empty',
      { commandId: 'cmd-4', op: 'loadPlan', plan: broken },
      emptyFacts(),
    );
    expect(rejected.reply.outcome).toBe('error');
    expect(rejected.reply.code).toBe('invalid-plan');
  });

  it('runs the plan-export cells from plan-loaded and ready; wrong targets stay general (§(6))', () => {
    const plan = buildPlan();
    const prepared = preparedPlanFixture();
    const facts = { ...emptyFacts(), plan, digest: knownField('digest-1'), prepared };
    for (const state of ['plan-loaded', 'ready'] as const) {
      const ok = runCommand(
        state,
        {
          commandId: 'cmd-5',
          op: 'prepareExport',
          artifactId: 'artifact-plan-1',
          target: { kind: 'plan' },
        },
        facts,
      );
      expect(ok.reply.outcome).toBe('ok');
      expect(ok.reply.state).toBe('prepared');
      expect(ok.reply.code).toBe('prepared');
    }
    // 'ready' + loadPlan → the hold conflict (§18.4)
    const conflict = runCommand(
      'ready',
      { commandId: 'cmd-6', op: 'loadPlan', plan },
      emptyFacts(),
    );
    expect(conflict.reply.outcome).toBe('error');
    expect(conflict.reply.code).toBe('hold-conflict');
    // a wrong target from the granting states stays the general loud error
    const wrong = runCommand(
      'plan-loaded',
      {
        commandId: 'cmd-7',
        op: 'prepareExport',
        artifactId: 'artifact-plan-1',
        target: { kind: 'visit', visitId: 'visit-1' },
      },
      facts,
    );
    expect(wrong.reply.outcome).toBe('error');
    expect(wrong.reply.code).toBe('illegal-state');
  });

  it('the DIGEST LAW: an unavailable digest pends without a receipt and keeps the state (§18.6)', () => {
    const plan = buildPlan();
    const pending = runCommand(
      'plan-loaded',
      {
        commandId: 'cmd-8',
        op: 'prepareExport',
        artifactId: 'artifact-plan-1',
        target: { kind: 'plan' },
      },
      {
        ...emptyFacts(),
        plan,
        digest: unknownField(
          'crypto.subtle exists only in a secure context; this serving is insecure',
          ['the plan report digest'],
        ),
        prepared: null,
      },
    );
    expect(pending.reply.outcome).toBe('pending');
    expect(pending.reply.code).toBe('digest-unavailable');
    expect(pending.reply.state).toBe('plan-loaded'); // the lifecycle state unchanged
    expect(pending.reply.value.state).toBe('pending');
    expect(pending.nextAttempt).toBeNull(); // no receipt, no export, no release
  });

  it('seals the visit and the released index; bad index parts fail loudly (§(6))', () => {
    const plan = buildPlan();
    const visitPrepared: MobileCPrepared = {
      ...preparedPlanFixture(),
      artifactId: 'art-visit-1',
      kind: 'visit',
      suggestedFileName: `h3d-mobile-c_v1_${plan.id}_scope-1_visit_art-visit-1.json`,
    };
    const sealedFacts = {
      ...emptyFacts(),
      plan,
      digest: knownField('digest-1'),
      prepared: visitPrepared,
    };
    const sealedPrepare = runCommand(
      'sealed',
      {
        commandId: 'cmd-9',
        op: 'prepareExport',
        artifactId: 'art-visit-1',
        target: { kind: 'visit', visitId: 'visit-1' },
      },
      sealedFacts,
    );
    expect(sealedPrepare.reply.outcome).toBe('ok');
    expect(sealedPrepare.reply.state).toBe('prepared');

    const indexFacts: MobileCArchiveFacts = {
      index: {
        indexId: 'index-1',
        part: 1,
        parts: 1,
        scopeIds: [],
        registrations: [],
        slots: [],
        visitFiles: [],
        receipts: [],
        traces: [],
        evidence: [],
        scopeCoverage: [],
        ownerDecisions: [],
        riders: [],
        archiveCompleteness: { status: 'unknown', reason: 'nothing archived yet', evidenceIds: [] },
        measuredFloor: { status: 'unknown', reason: 'nothing archived yet', evidenceIds: [] },
        ownerGate: { status: 'unknown', reason: 'nothing archived yet', evidenceIds: [] },
        exitGate: { status: 'unknown', reason: 'nothing archived yet', evidenceIds: [] },
      },
      planFile: {
        artifactId: 'artifact-plan-1',
        fileName: `h3d-mobile-c_v1_${plan.id}_all_plan_artifact-plan-1.json`,
        byteLength: 4_096,
        sha256: 'digest-1',
      },
      knownVisitFiles: [],
      knownReceipts: [],
      prospectiveBytes: 4_096,
    };
    const indexPrepared: MobileCPrepared = {
      ...preparedPlanFixture(),
      artifactId: 'art-index-1',
      kind: 'index',
      suggestedFileName: `h3d-mobile-c_v1_${plan.id}_all_index_art-index-1.json`,
    };
    const releasedOk = runCommand(
      'released',
      {
        commandId: 'cmd-10',
        op: 'prepareExport',
        artifactId: 'art-index-1',
        target: { kind: 'index', index: indexFacts.index },
      },
      {
        ...emptyFacts(),
        plan,
        digest: knownField('digest-1'),
        prepared: indexPrepared,
        indexFacts,
      },
    );
    expect(releasedOk.reply.outcome).toBe('ok');
    expect(releasedOk.reply.state).toBe('prepared');
    // a mis-numbered part rejects with invalid-index (§(6) indexPreparation)
    const brokenIndex = { ...indexFacts, index: { ...indexFacts.index, part: 2, parts: 1 } };
    const rejected = runCommand(
      'released',
      {
        commandId: 'cmd-11',
        op: 'prepareExport',
        artifactId: 'art-index-1',
        target: { kind: 'index', index: brokenIndex.index },
      },
      {
        ...emptyFacts(),
        plan,
        digest: knownField('digest-1'),
        prepared: indexPrepared,
        indexFacts: brokenIndex,
      },
    );
    expect(rejected.reply.outcome).toBe('error');
    expect(rejected.reply.code).toBe('invalid-index');
    // the non-index targets from 'released' stay the general loud error ( ratified cells )
    const wrongTarget = runCommand(
      'released',
      {
        commandId: 'cmd-12',
        op: 'prepareExport',
        artifactId: 'artifact-plan-1',
        target: { kind: 'plan' },
      },
      { ...emptyFacts(), plan, digest: knownField('digest-1'), prepared: preparedPlanFixture() },
    );
    expect(wrongTarget.reply.outcome).toBe('error');
    expect(wrongTarget.reply.code).toBe('illegal-state');
  });

  it('the idempotent repeat reuses identical bytes; another artefact fails without mutation (§18.6)', () => {
    const plan = buildPlan();
    const previous = preparedPlanFixture();
    const repeat = runCommand(
      'prepared',
      {
        commandId: 'cmd-13',
        op: 'prepareExport',
        artifactId: previous.artifactId,
        target: { kind: 'plan' },
      },
      {
        ...emptyFacts(),
        plan,
        digest: { state: 'known', value: previous.sha256, evidenceIds: [] },
        previous,
      },
    );
    expect(repeat.reply.outcome).toBe('ok');
    expect(repeat.reply.state).toBe('prepared');
    if (repeat.reply.value.state === 'known' && repeat.reply.value.value.kind === 'prepared') {
      expect(repeat.reply.value.value.prepared).toStrictEqual(previous);
    }
    const other = runCommand(
      'prepared',
      {
        commandId: 'cmd-14',
        op: 'prepareExport',
        artifactId: 'artifact-OTHER',
        target: { kind: 'plan' },
      },
      { ...emptyFacts(), plan, previous },
    );
    expect(other.reply.outcome).toBe('error');
    expect(other.reply.code).toBe('illegal-state');
  });

  it('the transport tail flows per the committed nextControlState (§18.6)', () => {
    const plan = buildPlan();
    const prepared = preparedPlanFixture();
    const command = {
      commandId: 'cmd-15',
      op: 'exportPrepared',
      artifactId: prepared.artifactId,
      transport: 'native-share',
    } as const;
    const handedOff = {
      transport: 'native-share',
      handoff: 'handed-off',
      reason: 'share sheet accepted',
    } as const;
    const handed = runCommand('prepared', command, {
      ...emptyFacts(),
      plan,
      previous: prepared,
      transport: handedOff,
    });
    expect(handed.reply.outcome).toBe('ok');
    expect(handed.reply.state).toBe('awaiting-verification');
    const cancelled = {
      transport: 'native-share',
      handoff: 'cancelled',
      reason: 'the operator dismissed the sheet',
    } as const;
    const kept = runCommand('prepared', command, {
      ...emptyFacts(),
      plan,
      previous: prepared,
      transport: cancelled,
    });
    expect(kept.reply.outcome).toBe('pending');
    expect(kept.reply.code).toBe('awaiting-transport');
    expect(kept.reply.state).toBe('prepared');
    const retry = runCommand('awaiting-verification', command, {
      ...emptyFacts(),
      plan,
      previous: prepared,
      transport: cancelled,
    });
    expect(retry.reply.outcome).toBe('pending');
    expect(retry.reply.state).toBe('prepared'); // a retry returns to prepared (§18.6)
    const failed = {
      transport: 'native-share',
      handoff: 'failed',
      reason: 'transport I/O error',
    } as const;
    const failure = runCommand('prepared', command, {
      ...emptyFacts(),
      plan,
      previous: prepared,
      transport: failed,
    });
    expect(failure.reply.outcome).toBe('error');
    expect(failure.reply.code).toBe('transport-io');
    expect(failure.reply.state).toBe('prepared'); // the prepared artefact is PRESERVED
    const missingActivation = { ...emptyFacts(), plan, previous: prepared, transport: null };
    const notStarted = runCommand('prepared', command, missingActivation);
    expect(notStarted.reply.outcome).toBe('pending');
    expect(notStarted.reply.code).toBe('awaiting-transport');
    // an unsanctioned export state stays general
    const unsanctioned = runCommand('sealed', command, {
      ...emptyFacts(),
      plan,
      previous: prepared,
    });
    expect(unsanctioned.reply.outcome).toBe('error');
    expect(unsanctioned.reply.code).toBe('illegal-state');
  });

  it('verifySaved releases on a matching receipt; mismatches stay loud; selection stays pending (§18.6)', () => {
    const plan = buildPlan();
    const prepared = preparedPlanFixture();
    const report: MobileCReportV1 = {
      format: 'h3d-mobile-c/v1',
      artifactId: prepared.artifactId,
      planId: plan.id,
      createdAtUtc: '2026-11-01T09:05:00Z',
      producer: plan.build,
      payload: { kind: 'plan', plan },
    };
    const planFile = {
      artifactId: 'artifact-plan-1',
      fileName: prepared.suggestedFileName,
      byteLength: prepared.byteLength,
      sha256: prepared.sha256,
    };
    const receipt: MobileCSavedReceipt = {
      artifactId: prepared.artifactId,
      actualFileName:
        'h3d-mobile-c_v1_plan-2026-11-01-T09-00-00-Z_all_plan_artifact-plan-1 (renamed by the browser).json',
      byteLength: prepared.byteLength,
      sha256: prepared.sha256,
      verifiedAtUtc: '2026-11-01T09:10:00Z',
      verification: 'native-selected-file-byte-match',
    };
    const input: MobileCVerificationInput = {
      prepared,
      receipt,
      report,
      planFile,
      expectedPlanFile: planFile,
    };
    const released = runCommand(
      'awaiting-verification',
      { commandId: 'cmd-16', op: 'verifySaved', artifactId: prepared.artifactId },
      { ...emptyFacts(), plan, previous: prepared, verification: input },
    );
    expect(released.reply.outcome).toBe('ok');
    expect(released.reply.state).toBe('released'); // the receipt records the renamed basename verbatim (§18.6/B3)
    if (released.reply.value.state === 'known' && released.reply.value.value.kind === 'verified') {
      expect(released.reply.value.value.receipt).toStrictEqual(receipt);
    }
    const mismatched = runCommand(
      'awaiting-verification',
      { commandId: 'cmd-17', op: 'verifySaved', artifactId: prepared.artifactId },
      {
        ...emptyFacts(),
        plan,
        previous: prepared,
        verification: { ...input, receipt: { ...receipt, byteLength: prepared.byteLength - 1 } },
      },
    );
    expect(mismatched.reply.outcome).toBe('error');
    expect(mismatched.reply.code).toBe('verification-mismatch');
    expect(mismatched.reply.state).toBe('awaiting-verification');
    expect(mismatched.nextAttempt).toBeNull(); // no buffer release
    const pendingSelection = runCommand(
      'awaiting-verification',
      { commandId: 'cmd-18', op: 'verifySaved', artifactId: prepared.artifactId },
      { ...emptyFacts(), plan, previous: prepared, verification: null },
    );
    expect(pendingSelection.reply.outcome).toBe('pending');
    expect(pendingSelection.reply.code).toBe('awaiting-selection');
  });

  it('stays pure over repetition: the same command and facts answer identically (the HOST-INJECTION law)', () => {
    const plan = buildPlan();
    const first = runCommand('empty', { commandId: 'cmd-19', op: 'loadPlan', plan }, emptyFacts());
    const second = runCommand('empty', { commandId: 'cmd-19', op: 'loadPlan', plan }, emptyFacts());
    expect(second.reply).toStrictEqual(first.reply);
    expect(Object.keys(COMMAND_TABLE).length).toBe(10); // the module owns no control state of its own
  });
});

// ---------------------------------------------------------------------------
// §12 canonical purity fence, retargeted to ../src/perf/mobile-capture.ts. The
// committed reproducibility pattern from tests/hud.test.ts, INCLUDING its
// `as Record<string, string>` glob typing (the canon's committed form). The ONE
// declared import './mobile-report' passes the canon; no stricter case is added.
// ---------------------------------------------------------------------------

describe('purity', () => {
  const sources = import.meta.glob('../src/perf/mobile-capture.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
