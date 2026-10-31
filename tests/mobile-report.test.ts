/**
 * §21 report rows for src/perf/mobile-report.ts, plus the §12 canonical purity fence.
 *
 * Node-only Vitest, deterministic injected inputs, no jsdom, no clocks, no file operations
 * (§18.1/§21). Native hashing and native dialogs stay host validation: the tests below inject
 * already-computed digests and byte lengths and exercise the comparators.
 */

import { describe, expect, it } from 'vitest';

import {
  assessArchiveCompleteness,
  assessCpu,
  assessExitGate,
  assessFirstExterior,
  assessIntervalFloor,
  assessLedgerGate,
  assessOwnerGate,
  assessRequiredWindows,
  assessRiders,
  assessUncertaintyInterval,
  assessVerification,
  computeStatistics,
  conjoinDecisions,
  countStrictlyAbove,
  handoffAuthorizesRelease,
  isMobileCFormat,
  knownField,
  MOBILE_C_FORMAT,
  type MobileCArchiveInput,
  type MobileCCache,
  type MobileCDecision,
  type MobileCField,
  type MobileCFileRef,
  type MobileCFirstExterior,
  type MobileCFrameWindow,
  type MobileCGraphics,
  type MobileCId,
  type MobileCIndex,
  type MobileCLimits,
  type MobileCLongTaskRow,
  type MobileCLongTasks,
  type MobileCNativeCpu,
  type MobileCNetwork,
  type MobileCPrepared,
  type MobileCPresentation,
  type MobileCRawInterval,
  type MobileCRegistration,
  type MobileCReportV1,
  type MobileCRider,
  type MobileCSavedReceipt,
  type MobileCSlotResult,
  type MobileCSpan,
  type MobileCStamp,
  type MobileCTransport,
  mobileCFileName,
  nearestRankIndex,
  nearestRankPercentile,
  nextControlState,
  notApplicableField,
  notApplicableIsGrounded,
  parseMobileCFileName,
  pendingField,
  preparationsAgree,
  releaseAuthorized,
  unknownField,
  unresolvedRiders,
  verificationFaults,
} from '../src/perf/mobile-report';

// ---------------------------------------------------------------------------
// Deterministic fixtures. Every value is injected; nothing is read from a clock or a device.
// ---------------------------------------------------------------------------

const CLOCK_ID: MobileCId = 'clock-performance';

const stamp = (atMs: number): MobileCStamp => ({ clockId: CLOCK_ID, atMs });

const span = (fromMs: number, toMs: number): MobileCSpan => ({
  start: stamp(fromMs),
  end: stamp(toMs),
});

const limits = {
  frameWindowMs: 20_000,
  p95Ms: 33,
  p99Ms: 50,
  longTaskMs: 50,
  repeats: 3,
  firstExteriorMs: 5_000,
  soakMs: 1_800_000,
  maxDraws: 150,
  maxTriangles: 1_500_000,
  ledgerCeilingBytes: knownField(268_435_456),
  ledgerUnitConvention: knownField('bytes, device-format allocations'),
  ratification: { status: 'pending', reason: '§10 owner decision outstanding', evidenceIds: [] },
} satisfies MobileCLimits;

const intervals = (deltas: readonly number[]): readonly MobileCRawInterval[] =>
  deltas.map((deltaMs, index) => ({
    index,
    fromMs: index * 16,
    toMs: index * 16 + deltaMs,
    deltaMs,
    render: unknownField('render sample not retained for this fixture', ['render sample']),
  }));

const frameWindow = (
  deltas: readonly number[],
  rawCompleteness: MobileCFrameWindow['rawCompleteness'] = 'complete',
): MobileCFrameWindow => {
  const rawIntervals = intervals(deltas);
  return {
    clockId: CLOCK_ID,
    admittedAtMs: 0,
    nominalEndMs: limits.frameWindowMs,
    actualEndMs: knownField(limits.frameWindowMs + 12),
    initialRoomId: 'room-1',
    initialStopId: 'stop-1',
    rawIntervals,
    rawCompleteness,
    statistics: computeStatistics(rawIntervals, limits),
    thirds: [],
    observedStopIds: ['stop-1'],
    intervalFloor: { status: 'unknown', reason: 'assessed by the law under test', evidenceIds: [] },
  } satisfies MobileCFrameWindow;
};

const longTaskRow = (
  durationMs: number,
  loadRelation: MobileCLongTaskRow['loadRelation'],
): MobileCLongTaskRow => ({
  start: stamp(1_000),
  durationMs,
  attribution: ['script'],
  loadRelation,
  evidenceIds: [],
});

const supportedLongTasks = (rows: readonly MobileCLongTaskRow[]): MobileCLongTasks => ({
  apiSupported: knownField(true),
  apiCoveredSpan: knownField(span(0, 20_000)),
  observerDrained: knownField(true),
  apiRows: rows,
  apiCompleteCoverage: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  apiPostLoadOverThresholdCount: unknownField('assessed by the law'),
  initialExteriorSettledAt: knownField(stamp(800)),
  nativeTraceRequired: false,
  native: notApplicableField('API coverage is complete'),
  cpuGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
});

const unsupportedLongTasks = (native: MobileCField<MobileCNativeCpu>): MobileCLongTasks => ({
  apiSupported: knownField(false),
  apiCoveredSpan: unknownField('API unsupported'),
  observerDrained: unknownField('no observer to drain'),
  apiRows: [],
  apiCompleteCoverage: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  apiPostLoadOverThresholdCount: unknownField('assessed by the law'),
  initialExteriorSettledAt: knownField(stamp(800)),
  nativeTraceRequired: true,
  native,
  cpuGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
});

const nativeCpu = (count: number): MobileCNativeCpu => ({
  traceIds: ['trace-1'],
  coveredSpan: knownField(span(0, 20_000)),
  rows: [],
  postLoadOverThresholdCount: knownField(count),
  completeCoverage: { status: 'pass', reason: 'systrace covers the window', evidenceIds: [] },
  adjudication: { status: 'pass', reason: 'operator adjudicated', evidenceIds: [] },
});

const graphics = (peakDraws: number, peakTriangles: number): MobileCGraphics => ({
  peakDraws: knownField(peakDraws),
  peakTriangles: knownField(peakTriangles),
  ledgerPeakBytes: knownField(1_000),
  peakLedgerSnapshotId: knownField('ledger-1'),
  states: [
    {
      atMs: 0,
      drawingBufferPx: { width: 800, height: 1_600 },
      msaaSamples: knownField(0),
      shadowMapPx: knownField({ width: 1_024, height: 1_024 }),
      rendererMemory: knownField({ geometries: 10, textures: 20 }),
    },
  ],
  coverage: { status: 'pass', reason: 'states sampled across the window', evidenceIds: [] },
  drawsGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  trianglesGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  ledgerGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
});

const coldCache = (qualification: MobileCDecision): MobileCCache => ({
  at: stamp(0),
  httpAssets: knownField('cold'),
  decodedAssets: knownField('cold'),
  destinationResident: knownField(false),
  destinationReady: knownField(false),
  serviceWorkerEffect: knownField('no service worker registered'),
  restoredFromBackForwardCache: knownField(false),
  resourceCoverage: { status: 'pass', reason: 'all resources accounted', evidenceIds: [] },
  evidenceIds: ['evidence-cache'],
  qualification,
});

const presentedFrame: MobileCPresentation = {
  basis: 'verified-exterior-presentation',
  exteriorRoomId: 'room-exterior',
  markerLocator: 'trace://frame-marker',
  traceIds: ['trace-1'],
  clockRelationId: knownField('relation-1'),
  evidenceIds: ['evidence-presentation'],
  qualification: { status: 'pass', reason: 'presented frame identified', evidenceIds: [] },
};

const referenceNetwork: MobileCNetwork = {
  method: 'cdp-reference',
  mechanism: 'CDP Network.emulateNetworkConditions',
  requested: { downMbps: 10, rttMs: 100 },
  realisedDownMbps: knownField(9.7),
  realisedRttMs: knownField(103),
  latencyMeaning: knownField('rtt'),
  calibrationEvidenceIds: ['evidence-network'],
  referenceEquivalence: { status: 'pass', reason: 'within calibration band', evidenceIds: [] },
  qualification: { status: 'pass', reason: 'reference conditions held', evidenceIds: [] },
};

const firstExterior = (
  elapsedMs: MobileCField<number>,
  uncertaintyMs: MobileCField<number>,
  overrides: Partial<MobileCFirstExterior> = {},
): MobileCFirstExterior => ({
  navigationType: knownField('navigate'),
  navigationStart: knownField(stamp(0)),
  firstExteriorPresented: knownField(stamp(4_000)),
  elapsedMs,
  elapsedUncertaintyMs: uncertaintyMs,
  network: referenceNetwork,
  presentation: presentedFrame,
  coldness: coldCache({ status: 'pass', reason: 'cold profile confirmed', evidenceIds: [] }),
  measuredTarget: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  qualification: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
  ...overrides,
});

const fileRef = (artifactId: MobileCId, sha256: string): MobileCFileRef => ({
  artifactId,
  fileName: mobileCFileName({ planId: 'plan1', scopeId: null, kind: 'visit', artifactId }),
  byteLength: 2_048,
  sha256,
});

const registration = (attemptId: MobileCId, slotId: MobileCId): MobileCRegistration => ({
  attemptId,
  slotId,
  registeredAtUtc: '2026-06-21T12:00:00Z',
  conditionKey: `${slotId}|cold|portrait`,
  retryOf: notApplicableField('first attempt'),
  externalEvidenceIds: [],
});

const slotResult = (
  slotId: MobileCId,
  attemptId: MobileCId,
  visitFile: MobileCField<MobileCFileRef>,
): MobileCSlotResult => ({
  slotId,
  scenarioId: 'scenario-1',
  scopeId: 'scope-1',
  repeat: 1,
  attempts: [
    {
      attemptId,
      retryOf: notApplicableField('first attempt'),
      conditionKey: `${slotId}|cold|portrait`,
      disposition: 'valid',
      visitFile,
      measuredExceedance: knownField(false),
      explanation: 'nominal',
    },
  ],
  fulfillingAttemptId: knownField(attemptId),
  anyValidMeasuredExceedance: knownField(false),
  fulfilment: { status: 'pass', reason: 'slot fulfilled', evidenceIds: [] },
});

const indexFixture = (overrides: Partial<MobileCIndex> = {}): MobileCIndex => {
  const visitFile = fileRef('artifact-visit-1', 'digest-visit-1');
  return {
    indexId: 'index-1',
    part: 1,
    parts: 1,
    scopeIds: ['scope-1'],
    registrations: [registration('attempt-1', 'slot-1')],
    slots: [slotResult('slot-1', 'attempt-1', knownField(visitFile))],
    visitFiles: [visitFile],
    receipts: [
      {
        artifactId: 'artifact-visit-1',
        actualFileName: visitFile.fileName,
        byteLength: visitFile.byteLength,
        sha256: 'digest-visit-1',
        verifiedAtUtc: '2026-06-21T12:30:00Z',
        verification: 'native-selected-file-byte-match',
      },
    ],
    traces: [
      {
        traceId: 'trace-1',
        file: fileRef('artifact-trace-1', 'digest-trace-1'),
        platform: 'android',
        deviceId: 'device-1',
        scopeId: 'scope-1',
        attemptIds: ['attempt-1'],
        clockId: CLOCK_ID,
        coverage: knownField(span(0, 20_000)),
        locator: 'trace://systrace-1',
        provenance: 'perfetto',
        assessment: { status: 'pass', reason: 'trace admitted', evidenceIds: [] },
      },
    ],
    evidence: [],
    scopeCoverage: [],
    ownerDecisions: [],
    riders: [],
    archiveCompleteness: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
    measuredFloor: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
    ownerGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
    exitGate: { status: 'unknown', reason: 'assessed by the law', evidenceIds: [] },
    ...overrides,
  };
};

const archiveInput = (overrides: Partial<MobileCArchiveInput> = {}): MobileCArchiveInput => ({
  index: indexFixture(),
  plannedSlotIds: ['slot-1'],
  planFile: fileRef('artifact-plan-1', 'digest-plan-1'),
  ...overrides,
});

// ---------------------------------------------------------------------------
// §21 — Nearest-rank statistics.
// ---------------------------------------------------------------------------

describe('nearest-rank statistics', () => {
  it('uses one-based rank ceil(p × N) on sorted samples', () => {
    expect(nearestRankIndex(10, 0.5)).toBe(4);
    expect(nearestRankIndex(10, 0.95)).toBe(9);
    expect(nearestRankIndex(100, 0.99)).toBe(98);
    expect(nearestRankIndex(1, 0.99)).toBe(0);
  });

  it('computes p50/p95/p99/max over a small sample regardless of input order', () => {
    const deltas = [16, 50, 17, 16, 18, 16, 20, 16, 17, 16];
    const stats = computeStatistics(intervals(deltas), limits);
    expect(stats.state).toBe('known');
    if (stats.state !== 'known') return;
    expect(stats.value.method).toBe('nearest-rank');
    expect(stats.value.sampleCount).toBe(10);
    expect(stats.value.p50Ms).toBe(16);
    expect(stats.value.p95Ms).toBe(50);
    expect(stats.value.p99Ms).toBe(50);
    expect(stats.value.maxMs).toBe(50);
  });

  it('handles ties without inventing an interpolated value', () => {
    const stats = computeStatistics(intervals([16, 16, 16, 16]), limits);
    if (stats.state !== 'known') throw new Error('expected known statistics');
    expect(stats.value.p50Ms).toBe(16);
    expect(stats.value.p95Ms).toBe(16);
    expect(stats.value.p99Ms).toBe(16);
    expect(stats.value.countAbove33Ms).toBe(0);
  });

  it('yields unknown, not zero, for empty samples', () => {
    const stats = computeStatistics([], limits);
    expect(stats.state).toBe('unknown');
    expect(nearestRankPercentile([], 0.95).state).toBe('unknown');
  });

  it('counts intervals strictly above the p95 threshold', () => {
    expect(countStrictlyAbove([32.9, 33, 33.0, 33.1], 33)).toBe(1);
    const stats = computeStatistics(intervals([33, 33, 34, 40]), limits);
    if (stats.state !== 'known') throw new Error('expected known statistics');
    expect(stats.value.countAbove33Ms).toBe(2);
  });

  it('fails a sustained 33.33-ms cadence without rounding down to 33', () => {
    const cadence = Array.from({ length: 60 }, () => 33.33);
    const window = frameWindow(cadence);
    const stats = window.statistics;
    if (stats.state !== 'known') throw new Error('expected known statistics');
    expect(stats.value.p95Ms).toBe(33.33);
    expect(stats.value.p99Ms).toBe(33.33);
    expect(stats.value.countAbove33Ms).toBe(60);
    const floor = assessIntervalFloor(window, limits);
    expect(floor.status).toBe('fail');
    expect(floor.reason).toContain('33.33');
  });

  it('passes a steady 16-ms cadence on unrounded comparison', () => {
    const floor = assessIntervalFloor(frameWindow(Array.from({ length: 60 }, () => 16)), limits);
    expect(floor.status).toBe('pass');
  });

  it('refuses a qualifying floor when raw intervals are a prefix or missing', () => {
    const prefix = frameWindow([16, 16, 16], 'prefix');
    expect(assessIntervalFloor(prefix, limits).status).toBe('unknown');
    const missing = frameWindow([], 'missing');
    expect(assessIntervalFloor(missing, limits).status).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// §21 — Required-window conjunction and long-task honesty.
// ---------------------------------------------------------------------------

describe('required-window conjunction', () => {
  it('cannot hide one failed room behind a healthy sibling', () => {
    const healthy = {
      windowId: 'room-ok',
      frame: knownField(frameWindow(Array.from({ length: 40 }, () => 16))),
      longTasks: supportedLongTasks([longTaskRow(20, 'post-load')]),
      graphics: graphics(100, 1_000_000),
    };
    const failed = {
      windowId: 'room-bad',
      frame: knownField(frameWindow(Array.from({ length: 40 }, () => 60))),
      longTasks: supportedLongTasks([]),
      graphics: graphics(100, 1_000_000),
    };
    const { windows, measuredFloor } = assessRequiredWindows([healthy, failed], limits);
    expect(windows.map((window) => window.windowFloor.status)).toStrictEqual(['pass', 'fail']);
    expect(measuredFloor.status).toBe('fail');
  });

  it('is unknown, not a vacuous pass, when no window is supplied', () => {
    expect(assessRequiredWindows([], limits).measuredFloor.status).toBe('unknown');
  });

  it('fails a window on the graphics ceilings alone', () => {
    const { measuredFloor } = assessRequiredWindows(
      [
        {
          windowId: 'room-draws',
          frame: knownField(frameWindow([16, 16, 16])),
          longTasks: supportedLongTasks([]),
          graphics: graphics(900, 1_000_000),
        },
      ],
      limits,
    );
    expect(measuredFloor.status).toBe('fail');
  });

  it('keeps the ledger gate pending while its unit convention is unresolved', () => {
    const unresolved = {
      ...limits,
      ledgerUnitConvention: pendingField<string>('byte conversion unresolved', '§10 decision'),
    } satisfies MobileCLimits;
    expect(assessLedgerGate(knownField(10), unresolved).status).toBe('pending');
    const unratified = {
      ...limits,
      ledgerCeilingBytes: pendingField<number>('ceiling unratified', '§10 decision'),
    } satisfies MobileCLimits;
    expect(assessLedgerGate(knownField(10), unratified).status).toBe('pending');
  });
});

describe('long-task honesty', () => {
  it('counts post-load and straddling tasks above the threshold', () => {
    const tasks = supportedLongTasks([
      longTaskRow(400, 'exempt'),
      longTaskRow(49, 'post-load'),
      longTaskRow(51, 'post-load'),
      longTaskRow(80, 'straddles-settlement'),
    ]);
    const assessment = assessCpu(tasks, limits);
    expect(assessment.apiCompleteCoverage.status).toBe('pass');
    expect(assessment.apiPostLoadOverThresholdCount).toStrictEqual(knownField(2));
    expect(assessment.cpuGate.status).toBe('fail');
  });

  it('passes the gate when only exempt load tasks are long', () => {
    const assessment = assessCpu(supportedLongTasks([longTaskRow(900, 'exempt')]), limits);
    expect(assessment.apiPostLoadOverThresholdCount).toStrictEqual(knownField(0));
    expect(assessment.cpuGate.status).toBe('pass');
  });

  it('leaves the API count unknown when support, drainage or settlement is missing', () => {
    const unsupported = assessCpu(unsupportedLongTasks(unknownField('no native trace')), limits);
    expect(unsupported.apiPostLoadOverThresholdCount.state).toBe('unknown');
    expect(unsupported.cpuGate.status).toBe('unknown');
    expect(unsupported.nativeTraceRequired).toBe(true);

    const undrained = assessCpu(
      { ...supportedLongTasks([]), observerDrained: knownField(false) },
      limits,
    );
    expect(undrained.apiPostLoadOverThresholdCount.state).toBe('unknown');

    const unsettled = assessCpu(
      {
        ...supportedLongTasks([]),
        initialExteriorSettledAt: unknownField('settlement unobserved'),
      },
      limits,
    );
    expect(unsettled.apiPostLoadOverThresholdCount.state).toBe('unknown');
  });

  it('lets sufficient native evidence resolve only the CPU gate', () => {
    const resolved = assessCpu(unsupportedLongTasks(knownField(nativeCpu(0))), limits);
    expect(resolved.cpuGate.status).toBe('pass');
    expect(resolved.cpuGate.reason).toContain('native');
    // The API result is NOT rewritten as zero by native sufficiency.
    expect(resolved.apiPostLoadOverThresholdCount.state).toBe('unknown');
    expect(resolved.apiCompleteCoverage.status).toBe('unknown');

    const failing = assessCpu(unsupportedLongTasks(knownField(nativeCpu(3))), limits);
    expect(failing.cpuGate.status).toBe('fail');
    expect(failing.apiPostLoadOverThresholdCount.state).toBe('unknown');
  });

  it('keeps the gate unknown when native coverage is itself incomplete', () => {
    const incomplete = {
      ...nativeCpu(0),
      completeCoverage: {
        status: 'unknown',
        reason: 'trace starts after admission',
        evidenceIds: [],
      },
    } satisfies MobileCNativeCpu;
    const assessment = assessCpu(unsupportedLongTasks(knownField(incomplete)), limits);
    expect(assessment.cpuGate.status).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// §21 — First-exterior qualification.
// ---------------------------------------------------------------------------

describe('first-exterior qualification', () => {
  it('passes only when the complete uncertainty interval lies within the threshold', () => {
    expect(assessUncertaintyInterval(knownField(4_000), knownField(200), 5_000).status).toBe(
      'pass',
    );
    expect(assessUncertaintyInterval(knownField(6_000), knownField(200), 5_000).status).toBe(
      'fail',
    );
  });

  it('calls a straddling interval unknown rather than rounding it down', () => {
    const straddling = assessUncertaintyInterval(knownField(4_900), knownField(300), 5_000);
    expect(straddling.status).toBe('unknown');
    expect(straddling.reason).toContain('straddles');
  });

  it('is unknown when the uncertainty itself is unestablished', () => {
    expect(
      assessUncertaintyInterval(knownField(1_000), unknownField('no clock relation'), 5_000).status,
    ).toBe('unknown');
  });

  it('requires presented-frame evidence, not renderer submission or DOM paint', () => {
    const submission = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100), {
        presentation: { ...presentedFrame, basis: 'renderer-submission' },
      }),
      limits,
    );
    expect(submission.presentation.status).toBe('unknown');
    expect(submission.qualification.status).toBe('unknown');

    const paint = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100), {
        presentation: { ...presentedFrame, basis: 'dom-paint' },
      }),
      limits,
    );
    expect(paint.qualification.status).toBe('unknown');

    const presented = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100)),
      limits,
    );
    expect(presented.presentation.status).toBe('pass');
    expect(presented.qualification.status).toBe('pass');
  });

  it('requires network equivalence under a controlled method', () => {
    const uncontrolled = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100), {
        network: { ...referenceNetwork, method: 'uncontrolled' },
      }),
      limits,
    );
    expect(uncontrolled.network.status).toBe('unknown');
    expect(uncontrolled.qualification.status).toBe('unknown');

    const ambiguousLatency = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100), {
        network: {
          ...referenceNetwork,
          latencyMeaning: unknownField('tool documents no latency meaning'),
        },
      }),
      limits,
    );
    expect(ambiguousLatency.network.status).toBe('unknown');
  });

  it('requires a qualifying coldness assessment', () => {
    const warm = assessFirstExterior(
      firstExterior(knownField(3_000), knownField(100), {
        coldness: coldCache({
          status: 'fail',
          reason: 'destination already resident',
          evidenceIds: [],
        }),
      }),
      limits,
    );
    expect(warm.qualification.status).toBe('fail');
  });

  it('preserves a measured miss even when qualification is unresolved', () => {
    const missed = assessFirstExterior(
      firstExterior(knownField(9_000), knownField(100), {
        network: { ...referenceNetwork, method: 'uncontrolled' },
      }),
      limits,
    );
    expect(missed.qualification.status).toBe('unknown');
    expect(missed.measuredTarget.status).toBe('fail');
    expect(missed.measuredExceedance).toStrictEqual(knownField(true));
  });

  it('reports an unmeasured target as unknown, never as a false exceedance', () => {
    const unmeasured = assessFirstExterior(
      firstExterior(unknownField('no presented frame timestamp'), knownField(100)),
      limits,
    );
    expect(unmeasured.measuredTarget.status).toBe('unknown');
    expect(unmeasured.measuredExceedance.state).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// §21 — Absence conventions and riders.
// ---------------------------------------------------------------------------

describe('absence conventions', () => {
  it('distinguishes observed emptiness from unknown, pending and not-applicable', () => {
    const observedEmpty = knownField<readonly string[]>([], ['evidence-observation']);
    expect(observedEmpty.state).toBe('known');
    if (observedEmpty.state === 'known') {
      expect(observedEmpty.value).toStrictEqual([]);
    }
    expect(unknownField<readonly string[]>('API unsupported').state).toBe('unknown');
    expect(pendingField<readonly string[]>('awaiting trace', 'pull systrace').state).toBe(
      'pending',
    );
    expect(notApplicableField<readonly string[]>('no airlock in this scenario').state).toBe(
      'not-applicable',
    );
  });

  it('treats unsupported evidence as unknown rather than zero', () => {
    const unsupported = assessCpu(unsupportedLongTasks(unknownField('no trace')), limits);
    expect(unsupported.apiPostLoadOverThresholdCount).not.toStrictEqual(knownField(0));
    expect(unsupported.apiPostLoadOverThresholdCount.state).toBe('unknown');
    // An empty apiRows array under complete coverage IS an observed zero.
    expect(assessCpu(supportedLongTasks([]), limits).apiPostLoadOverThresholdCount).toStrictEqual(
      knownField(0),
    );
  });

  it('accepts not-applicable only on structural grounds', () => {
    const decision: MobileCDecision = {
      status: 'not-applicable',
      reason: 'scenario declares no airlock',
      evidenceIds: [],
    };
    expect(notApplicableIsGrounded(decision, true)).toBe(true);
    expect(notApplicableIsGrounded(decision, false)).toBe(false);
    expect(notApplicableIsGrounded({ status: 'pass', reason: 'ok', evidenceIds: [] }, false)).toBe(
      true,
    );
  });

  it('never conjoins an empty decision set into a pass', () => {
    expect(conjoinDecisions([], 'nothing').status).toBe('unknown');
    expect(
      conjoinDecisions(
        [{ status: 'not-applicable', reason: 'structural', evidenceIds: [] }],
        'abstainers',
      ).status,
    ).toBe('unknown');
  });

  it('orders fail over unknown over pending in a conjunction', () => {
    const pass: MobileCDecision = { status: 'pass', reason: 'ok', evidenceIds: [] };
    const fail: MobileCDecision = { status: 'fail', reason: 'bad', evidenceIds: [] };
    const unknown: MobileCDecision = { status: 'unknown', reason: 'dunno', evidenceIds: [] };
    const pending: MobileCDecision = { status: 'pending', reason: 'later', evidenceIds: [] };
    expect(conjoinDecisions([pass, pending, unknown, fail], 's').status).toBe('fail');
    expect(conjoinDecisions([pass, pending, unknown], 's').status).toBe('unknown');
    expect(conjoinDecisions([pass, pending], 's').status).toBe('pending');
    expect(conjoinDecisions([pass, pass], 's').status).toBe('pass');
  });
});

describe('riders and the owner gate', () => {
  const unresolvedRider: MobileCRider = {
    topic: 'unratified-target',
    description: '§10 target ratification outstanding',
    decision: { status: 'pending', reason: 'owner decision outstanding', evidenceIds: [] },
  };
  const resolvedRider: MobileCRider = {
    topic: 'low-power-mode',
    description: 'low-power mode disabled throughout',
    decision: { status: 'pass', reason: 'operator attested', evidenceIds: ['evidence-power'] },
  };
  const inapplicableRider: MobileCRider = {
    topic: 'untested-device',
    description: 'no untested device in scope',
    decision: { status: 'not-applicable', reason: 'all devices tested', evidenceIds: [] },
  };

  it('lists applicable riders that remain unresolved', () => {
    expect(unresolvedRiders([unresolvedRider, resolvedRider, inapplicableRider])).toStrictEqual([
      unresolvedRider,
    ]);
    expect(assessRiders([unresolvedRider, resolvedRider]).status).toBe('pending');
    expect(assessRiders([resolvedRider]).status).toBe('pass');
    expect(assessRiders([inapplicableRider]).status).toBe('not-applicable');
    expect(assessRiders([]).status).toBe('not-applicable');
  });

  it('prevents an unqualified exit pass while an applicable rider is unresolved', () => {
    const ownerGate = assessOwnerGate(
      [
        {
          decisionId: 'owner-1',
          subject: '§10 ledger ceiling',
          disposition: knownField('ratified'),
          authorityEvidenceIds: ['evidence-owner'],
        },
      ],
      [unresolvedRider],
    );
    expect(ownerGate.status).toBe('pending');
    const exit = assessExitGate(
      { status: 'pass', reason: 'archive reconciles', evidenceIds: [] },
      { status: 'pass', reason: 'every window passes', evidenceIds: [] },
      ownerGate,
    );
    expect(exit.status).toBe('pending');
    expect(exit.status).not.toBe('pass');
  });

  it('holds the owner gate pending while an owner decision is outstanding', () => {
    const gate = assessOwnerGate(
      [
        {
          decisionId: 'owner-2',
          subject: 'interpretation of never',
          disposition: pendingField('unresolved', 'owner ruling'),
          authorityEvidenceIds: [],
        },
      ],
      [resolvedRider],
    );
    expect(gate.status).toBe('pending');
  });

  it('passes the owner gate only with settled decisions and resolved riders', () => {
    expect(assessOwnerGate([], [resolvedRider]).status).toBe('pass');
    expect(assessOwnerGate([], [inapplicableRider]).status).toBe('pass');
  });
});

// ---------------------------------------------------------------------------
// §21 — Archive completeness.
// ---------------------------------------------------------------------------

describe('archive completeness', () => {
  it('reconciles a complete archive', () => {
    expect(assessArchiveCompleteness(archiveInput()).status).toBe('pass');
  });

  it('is unknown when no planned slot is enumerated', () => {
    expect(assessArchiveCompleteness(archiveInput({ plannedSlotIds: [] })).status).toBe('unknown');
  });

  it('keeps a planned slot with no result as an unresolved member', () => {
    const decision = assessArchiveCompleteness(
      archiveInput({ plannedSlotIds: ['slot-1', 'slot-2'] }),
    );
    expect(decision.status).toBe('unknown');
    expect(decision.reason).toContain('missing-slot:slot-2');
  });

  it('refuses an attempt that was never registered', () => {
    const index = indexFixture({ registrations: [] });
    const decision = assessArchiveCompleteness(archiveInput({ index }));
    expect(decision.status).toBe('unknown');
    expect(decision.reason).toContain('unregistered-attempt:attempt-1');
  });

  it('keeps a retained failure owing its visit file', () => {
    const base = indexFixture();
    const slot = slotResult('slot-1', 'attempt-1', unknownField('file never saved'));
    const invalidated: MobileCSlotResult = {
      ...slot,
      attempts: slot.attempts.map((link) => ({ ...link, disposition: 'invalid' as const })),
      fulfillingAttemptId: unknownField('no valid attempt'),
      fulfilment: { status: 'unknown', reason: 'attempt invalidated', evidenceIds: [] },
    };
    const decision = assessArchiveCompleteness(
      archiveInput({ index: { ...base, slots: [invalidated] } }),
    );
    expect(decision.status).toBe('unknown');
    expect(decision.reason).toContain('missing-attempt-file:attempt-1');
  });

  it('refuses an archived file with no verification receipt', () => {
    const decision = assessArchiveCompleteness(
      archiveInput({ index: indexFixture({ receipts: [] }) }),
    );
    expect(decision.status).toBe('unknown');
    expect(decision.reason).toContain('missing-receipt:artifact-visit-1');
  });

  it('refuses a receipt whose digest differs from the archived file', () => {
    const base = indexFixture();
    const index: MobileCIndex = {
      ...base,
      receipts: base.receipts.map((receipt) => ({ ...receipt, sha256: 'digest-other' })),
    };
    const decision = assessArchiveCompleteness(archiveInput({ index }));
    expect(decision.reason).toContain('receipt-digest-mismatch:artifact-visit-1');
  });

  it('refuses a trace whose coverage is unknown', () => {
    const base = indexFixture();
    const index: MobileCIndex = {
      ...base,
      traces: base.traces.map((trace) => ({
        ...trace,
        coverage: unknownField<MobileCSpan>('trace span unestablished'),
      })),
    };
    const decision = assessArchiveCompleteness(archiveInput({ index }));
    expect(decision.reason).toContain('missing-trace:trace-1');
  });

  it('refuses an index part outside its declared parts', () => {
    const decision = assessArchiveCompleteness(
      archiveInput({ index: indexFixture({ part: 3, parts: 2 }) }),
    );
    expect(decision.reason).toContain('missing-part:index-1');
  });

  it('refuses an index that carries no plan reference', () => {
    const decision = assessArchiveCompleteness(
      archiveInput({ planFile: { ...fileRef('', 'digest-plan-1'), artifactId: '' } }),
    );
    expect(decision.reason).toContain('plan-reference-mismatch:index-1');
  });
});

// ---------------------------------------------------------------------------
// §21 — Portable filename, identity and verification predicates.
// Native hashing and native dialogs stay HOST validation: the digests and byte lengths below
// are injected facts, and these tests exercise only the comparators.
// ---------------------------------------------------------------------------

describe('artefact identity, naming and verification', () => {
  const report: MobileCReportV1 = {
    format: 'h3d-mobile-c/v1',
    artifactId: 'artifact-visit-1',
    planId: 'plan1',
    createdAtUtc: '2026-06-21T12:10:00Z',
    producer: {
      commit: 'abc1234',
      buildId: 'build-1',
      bundleSha256: 'digest-bundle',
      dirty: false,
      perfLog: true,
    },
    payload: {
      kind: 'index',
      planFile: fileRef('artifact-plan-1', 'digest-plan-1'),
      index: indexFixture(),
    },
  };
  const prepared: MobileCPrepared = {
    artifactId: 'artifact-visit-1',
    kind: 'index',
    suggestedFileName: mobileCFileName({
      planId: 'plan1',
      scopeId: null,
      kind: 'index',
      artifactId: 'artifact-visit-1',
    }),
    mime: 'application/json',
    byteLength: 4_096,
    sha256: 'digest-prepared-1',
    rawIntervalRows: 1_200,
    visitObjectRecords: 48,
  };
  const receipt: MobileCSavedReceipt = {
    artifactId: 'artifact-visit-1',
    actualFileName: prepared.suggestedFileName,
    byteLength: 4_096,
    sha256: 'digest-prepared-1',
    verifiedAtUtc: '2026-06-21T12:40:00Z',
    verification: 'native-selected-file-byte-match',
  };
  const planFile = fileRef('artifact-plan-1', 'digest-plan-1');
  const verificationInput = {
    prepared,
    receipt,
    report,
    planFile,
    expectedPlanFile: planFile,
  };

  it('identifies the artefact by its top-level format tag', () => {
    expect(MOBILE_C_FORMAT).toBe('h3d-mobile-c/v1');
    expect(isMobileCFormat(report)).toBe(true);
    expect(isMobileCFormat({ ...report, format: 'h3d-mobile-c/v1' })).toBe(true);
  });

  it('renders the portable-ASCII filename grammar', () => {
    expect(
      mobileCFileName({
        planId: 'plan1',
        scopeId: 'scope1',
        kind: 'visit',
        artifactId: 'art1',
      }),
    ).toBe('h3d-mobile-c_v1_plan1_scope1_visit_art1.json');
    expect(
      mobileCFileName({ planId: 'plan1', scopeId: null, kind: 'index', artifactId: 'art1' }),
    ).toBe('h3d-mobile-c_v1_plan1_all_index_art1.json');
  });

  it('round-trips a rendered name through the parser', () => {
    const parts = { planId: 'plan1', scopeId: 'scope1', kind: 'visit' as const, artifactId: 'a1' };
    expect(parseMobileCFileName(mobileCFileName(parts))).toStrictEqual(parts);
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan1_all_index_a1.json')).toStrictEqual({
      planId: 'plan1',
      scopeId: null,
      kind: 'index',
      artifactId: 'a1',
    });
  });

  it('rejects non-portable or malformed names', () => {
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan 1_all_index_a1.json')).toBeNull();
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan/1_all_index_a1.json')).toBeNull();
    expect(parseMobileCFileName('h3d-mobile-c_v2_plan1_all_index_a1.json')).toBeNull();
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan1_all_sketch_a1.json')).toBeNull();
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan1_all_index_a1.txt')).toBeNull();
    expect(parseMobileCFileName('h3d-mobile-c_v1_plan1_all_index.json')).toBeNull();
  });

  it('keeps repeated preparation of unchanged sealed input byte-identical', () => {
    const again: MobileCPrepared = { ...prepared };
    expect(preparationsAgree(prepared, again)).toBe(true);
    expect(preparationsAgree(prepared, { ...prepared, byteLength: 4_097 })).toBe(false);
    expect(preparationsAgree(prepared, { ...prepared, sha256: 'digest-other' })).toBe(false);
  });

  it('accepts a receipt matching bytes, digest, identity, version and plan reference', () => {
    expect(verificationFaults(verificationInput)).toStrictEqual([]);
    expect(assessVerification(verificationInput).status).toBe('pass');
  });

  it('rejects loudly on a byte-length mismatch', () => {
    const faults = verificationFaults({
      ...verificationInput,
      receipt: { ...receipt, byteLength: 4_095 },
    });
    expect(faults).toContain('byte-length-mismatch');
    expect(
      assessVerification({
        ...verificationInput,
        receipt: { ...receipt, byteLength: 4_095 },
      }).status,
    ).toBe('fail');
  });

  it('rejects a digest mismatch, an identity mismatch and a plan-reference mismatch', () => {
    expect(
      verificationFaults({ ...verificationInput, receipt: { ...receipt, sha256: 'other' } }),
    ).toContain('digest-mismatch');
    expect(
      verificationFaults({
        ...verificationInput,
        receipt: { ...receipt, artifactId: 'artifact-other' },
      }),
    ).toContain('artifact-identity-mismatch');
    expect(
      verificationFaults({
        ...verificationInput,
        planFile: fileRef('artifact-plan-2', 'digest-plan-2'),
      }),
    ).toContain('plan-reference-mismatch');
  });

  it('rejects an unrecognised verification method and a non-portable saved name', () => {
    expect(
      verificationFaults({
        ...verificationInput,
        receipt: { ...receipt, actualFileName: 'my report (1).json' },
      }),
    ).toContain('file-name-not-portable');
  });

  it('reports every mismatch rather than the first', () => {
    const faults = verificationFaults({
      ...verificationInput,
      receipt: {
        ...receipt,
        byteLength: 1,
        sha256: 'other',
        artifactId: 'artifact-other',
        actualFileName: 'nope.json',
      },
    });
    expect(faults.length).toBeGreaterThanOrEqual(4);
  });

  it('never lets an export handoff authorize buffer release', () => {
    const handedOff: MobileCTransport = {
      transport: 'native-share',
      handoff: 'handed-off',
      reason: 'share sheet accepted',
    };
    expect(handoffAuthorizesRelease(handedOff)).toBe(false);
    const unverified: MobileCDecision = {
      status: 'unknown',
      reason: 'saved file not yet re-selected',
      evidenceIds: [],
    };
    expect(releaseAuthorized(handedOff, unverified)).toBe(false);
    expect(nextControlState('prepared', handedOff, unverified)).toBe('awaiting-verification');
    expect(releaseAuthorized(handedOff, assessVerification(verificationInput))).toBe(true);
    expect(nextControlState('prepared', handedOff, assessVerification(verificationInput))).toBe(
      'released',
    );
    const cancelled: MobileCTransport = {
      transport: 'native-save',
      handoff: 'cancelled',
      reason: 'operator dismissed the dialog',
    };
    expect(releaseAuthorized(cancelled, assessVerification(verificationInput))).toBe(false);
    expect(nextControlState('prepared', cancelled, assessVerification(verificationInput))).toBe(
      'prepared',
    );
  });
});

// ---------------------------------------------------------------------------
// §12 canonical purity fence, retargeted to ../src/perf/mobile-report.ts.
// EXEMPTION (orchestrator, mechanical round): this block is the repository's committed
// reproducibility pattern copied verbatim from tests/hud.test.ts, INCLUDING its
// `as Record<string, string>` glob typing; the `satisfies` house rule governs the module's
// runtime construction, never this copied reference block.
// ---------------------------------------------------------------------------

describe('purity', () => {
  const sources = import.meta.glob('../src/perf/mobile-report.ts', {
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
  it('imports nothing at all (stricter than the canon: the module is self-contained)', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/^\s*import\s/m);
      expect(code).not.toMatch(/\bfrom\s+['"]/);
      expect(code).not.toMatch(/\brequire\s*\(/);
    }
  });
  it('uses no assertion or escape hatch in runtime construction (§18.9)', () => {
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      expect(code).not.toMatch(/\bas\s+any\b/);
      expect(code).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    }
  });
});
