/**
 * Mobile-C report contract and pure assessment laws.
 *
 * Implements design §9/§10 (limits arrive injected as MobileCLimits; no threshold registry is
 * redeclared here), §18.1 (named exports, side-effect free, no imports at all), §18.5
 * (observation and assessment semantics: nearest-rank percentiles, required-window conjunction,
 * long-task honesty, settlement rules), §18.7/§18.9 (the MobileCReportV1 data contract, frozen),
 * and §21 (the report rows pinned by tests/mobile-report.test.ts).
 *
 * HOST BOUNDARY: this module computes nothing that needs a clock, a digest engine, a file system
 * or a native dialog. Actual SHA-256 digests, actual byte serialization, native save/share
 * dialogs and the user's file selection are HOST predicates performed in src/main.ts; this
 * module is the comparator/validator that receives those computed facts as injected inputs and
 * judges them. No function here hashes, serializes or opens anything.
 */

// ---------------------------------------------------------------------------
// §18.9 MobileCReportV1 data contract (frozen: identifiers, statement order and the type set are
// the ratified block; only the quote glyphs are normalized to Biome's single quotes).
// ---------------------------------------------------------------------------

export type MobileCId = string;
export type MobileCJson =
  | null
  | boolean
  | number
  | string
  | readonly MobileCJson[]
  | { readonly [key: string]: MobileCJson };
export type MobileCField<T> =
  | { state: 'known'; value: T; evidenceIds: readonly MobileCId[] }
  | { state: 'unknown'; reason: string; requiredEvidence: readonly string[] }
  | { state: 'pending'; reason: string; nextAction: string }
  | { state: 'not-applicable'; reason: string };
export type MobileCDecision = {
  status: 'pass' | 'fail' | 'unknown' | 'pending' | 'not-applicable';
  reason: string;
  evidenceIds: readonly MobileCId[];
};
export type MobileCEpoch = '2026-06-21T12:00:00Z' | '2026-01-15T10:00:00Z' | '2026-01-15T18:00:00Z';
export type MobileCSelection = 'clean-profile-auto' | 'explicit-q=t0';
export type MobileCRepeat = 1 | 2 | 3;
export type MobileCStamp = { clockId: MobileCId; atMs: number };
export type MobileCSpan = { start: MobileCStamp; end: MobileCStamp };
export type MobileCSize = { width: number; height: number };
export type MobileCFileRef = {
  artifactId: MobileCId;
  fileName: string;
  byteLength: number;
  sha256: string;
};
export type MobileCEvidence = {
  id: MobileCId;
  source: 'host' | 'operator' | 'external-file';
  artifactId: MobileCId;
  locator: string;
  file: MobileCField<MobileCFileRef>;
  description: string;
};
export type MobileCClock = {
  id: MobileCId;
  kind: 'performance' | 'native' | 'external';
  timeOriginUnixMs: MobileCField<number>;
  resolutionMs: MobileCField<number>;
};
export type MobileCClockRelation = {
  id: MobileCId;
  fromClockId: MobileCId;
  toClockId: MobileCId;
  offsetMs: number;
  uncertaintyMs: number;
  evidenceIds: readonly MobileCId[];
};
export type MobileCTraceRef = {
  traceId: MobileCId;
  file: MobileCFileRef;
  platform: 'android' | 'ios';
  deviceId: MobileCId;
  scopeId: MobileCId;
  attemptIds: readonly MobileCId[];
  clockId: MobileCId;
  coverage: MobileCField<MobileCSpan>;
  locator: string;
  provenance: string;
  assessment: MobileCDecision;
};
export type MobileCBuild = {
  commit: string;
  buildId: string;
  bundleSha256: string;
  dirty: boolean;
  perfLog: true;
};
export type MobileCScope = {
  id: MobileCId;
  deviceId: MobileCId;
  selection: MobileCSelection;
  epoch: MobileCEpoch;
  entryLocation: string;
  epochMechanism: string;
  epochInputs: readonly { name: string; value: string }[];
  evidenceIds: readonly MobileCId[];
};
export type MobileCInventory = {
  commit: string;
  rooms: readonly { id: MobileCId; stopIds: readonly MobileCId[] }[];
  stops: readonly { id: MobileCId; roomId: MobileCId }[];
  directedAirlocks: readonly {
    id: MobileCId;
    airlockId: MobileCId;
    fromRoomId: MobileCId;
    toRoomId: MobileCId;
    fromStopId: MobileCId;
    toStopId: MobileCId;
  }[];
  evidenceIds: readonly MobileCId[];
};
export type MobileCItinerary = {
  id: MobileCId;
  roomId: MobileCId;
  stopIdsInOrder: readonly MobileCId[];
  legality: MobileCDecision;
};
export type MobileCScenario = {
  id: MobileCId;
  scopeId: MobileCId;
  target:
    | { kind: 'room'; roomId: MobileCId; itineraryId: MobileCId; sentinel: boolean }
    | { kind: 'directed-airlock'; directedAirlockId: MobileCId }
    | { kind: 'first-exterior'; exteriorRoomId: MobileCId };
};
export type MobileCThirdPlan = {
  third: 1 | 2 | 3;
  activity: 'resting' | 'looking' | 'stepping';
  startOffsetMs: number;
  endOffsetMs: number;
};
export type MobileCCacheIntent = {
  kind: 'room-baseline' | 'cold-unprepared-destination' | 'warm-destination' | 'cold-navigation';
  httpAssets: 'cold' | 'warm';
  decodedAssets: MobileCField<'cold' | 'warm'>;
  destinationReady: MobileCField<boolean>;
  description: string;
};
export type MobileCSlot = {
  id: MobileCId;
  scenarioId: MobileCId;
  repeat: MobileCRepeat;
  gate: 'frame-floor' | 'expected-invalidation' | 'first-exterior';
  thirds: readonly MobileCThirdPlan[];
  cacheIntent: MobileCCacheIntent;
  baselineOrientation: 'portrait' | 'landscape';
  manipulations: readonly ('landscape' | 'browser-bars' | 'visibility-interruption' | 'resume')[];
  postSoakRequired: boolean;
  precedingProbeSlotId: MobileCField<MobileCId>;
  parentFrameSlotId: MobileCField<MobileCId>;
};
export type MobileCLimits = {
  frameWindowMs: number;
  p95Ms: number;
  p99Ms: number;
  longTaskMs: number;
  repeats: 3;
  firstExteriorMs: number;
  soakMs: number;
  maxDraws: number;
  maxTriangles: number;
  ledgerCeilingBytes: MobileCField<number>;
  ledgerUnitConvention: MobileCField<string>;
  ratification: MobileCDecision;
};
export type MobileCPlanV1 = Readonly<{
  id: MobileCId;
  frozenAtUtc: string;
  build: MobileCBuild;
  devices: readonly { id: MobileCId; label: string; physicalPhone: true }[];
  scopes: readonly MobileCScope[];
  inventory: MobileCInventory;
  itineraries: readonly MobileCItinerary[];
  scenarios: readonly MobileCScenario[];
  slots: readonly MobileCSlot[];
  limits: MobileCLimits;
  evidence: readonly MobileCEvidence[];
}>;
export type MobileCDisplay = {
  cssViewportPx: MobileCSize;
  nativeDpr: MobileCField<number>;
  reportedDevicePixelRatio: number;
  coarsePointer: boolean;
  orientation: MobileCField<'portrait' | 'landscape'>;
  nominalRefreshHz: MobileCField<number>;
  adaptiveRefresh: MobileCField<boolean>;
  refreshBehaviour: MobileCField<string>;
  visualViewport: MobileCField<{
    sizeCssPx: MobileCSize;
    scale: number;
    offsetLeftCssPx: number;
    offsetTopCssPx: number;
  }>;
};
export type MobileCProfile = {
  deviceId: MobileCId;
  model: string;
  soc: MobileCField<string>;
  gpu: MobileCField<string>;
  ramGiB: MobileCField<number>;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  physicalPhone: true;
  display: MobileCDisplay;
  deviceMemoryApiGiB: MobileCField<number>;
  jsHeapApi: MobileCField<{ usedBytes: number; totalBytes: number; limitBytes: number }>;
  tier: MobileCField<string>;
  tierSource: MobileCField<string>;
  probeCount: MobileCField<number>;
  selection: MobileCSelection;
  epoch: MobileCEpoch;
  actualLocation: string;
  detUsed: false;
  cleanProfile: MobileCDecision;
  visitorOverrideBefore: MobileCField<string>;
  visitorOverrideAfter: MobileCField<string>;
  overridePreserved: MobileCDecision;
  rendererCapabilities: MobileCField<{
    webglVersion: 1 | 2;
    precision: string;
    maxTextureSize: number;
    maxTextures: number;
    maxSamples: MobileCField<number>;
  }>;
  evidenceIds: readonly MobileCId[];
};
export type MobileCPowerPoint = {
  at: MobileCStamp;
  batteryPercent: MobileCField<number>;
  unplugged: MobileCField<boolean>;
  normalPowerMode: MobileCField<boolean>;
  lowPowerMode: MobileCField<boolean>;
  ambientC: MobileCField<number>;
  externalCooling: MobileCField<boolean>;
  thermalState: MobileCField<string>;
  thermalWarnings: MobileCField<readonly string[]>;
};
export type MobileCThermalSegment = {
  span: MobileCSpan;
  activity: 'active-touring' | 'passive' | 'hidden' | 'administration';
  source: 'authorized-visit' | 'external-evidence';
  creditedActiveMs: number;
  evidenceIds: readonly MobileCId[];
};
export type MobileCThermal = {
  sessionId: MobileCId;
  creditedBeforeAdmissionMs: MobileCField<number>;
  segments: readonly MobileCThermalSegment[];
  precedingEvidenceIds: readonly MobileCId[];
  reloadOccurred: boolean;
  externalContinuity: MobileCDecision;
  soakQualification: MobileCDecision;
};
export type MobileCCache = {
  at: MobileCStamp;
  httpAssets: MobileCField<'cold' | 'warm' | 'mixed'>;
  decodedAssets: MobileCField<'cold' | 'warm' | 'mixed'>;
  destinationResident: MobileCField<boolean>;
  destinationReady: MobileCField<boolean>;
  serviceWorkerEffect: MobileCField<string>;
  restoredFromBackForwardCache: MobileCField<boolean>;
  resourceCoverage: MobileCDecision;
  evidenceIds: readonly MobileCId[];
  qualification: MobileCDecision;
};
export type MobileCActivitySegment = {
  fromMs: number;
  toMs: number;
  activity: 'resting' | 'looking' | 'stepping' | 'other';
  roomId: MobileCId;
  itineraryLegIndex: MobileCField<number>;
  evidenceIds: readonly MobileCId[];
};
export type MobileCStopEvent = {
  atMs: number;
  fromRoomId: MobileCId;
  toRoomId: MobileCId;
  fromStopId: MobileCId;
  toStopId: MobileCId;
  cause: 'intra-room-step' | 'airlock' | 'other';
  accepted: boolean;
  rejectionReason: MobileCField<string>;
  evidenceIds: readonly MobileCId[];
};
export type MobileCViewportEvent = {
  atMs: number;
  display: MobileCDisplay;
  drawingBufferPx: MobileCSize;
  browserBarsChanged: MobileCField<boolean>;
  evidenceIds: readonly MobileCId[];
};
export type MobileCVisibilityEvent = {
  atMs: number;
  state: 'visible' | 'hidden' | 'pagehide' | 'freeze' | 'resume';
  evidenceIds: readonly MobileCId[];
};
export type MobileCRenderSample = {
  draws: number;
  triangles: number;
  ledgerBytes: MobileCField<number>;
  drawingBufferPx: MobileCSize;
  msaaSamples: number;
};
export type MobileCRawInterval = {
  index: number;
  fromMs: number;
  toMs: number;
  deltaMs: number;
  render: MobileCField<MobileCRenderSample>;
};
export type MobileCStatistics = {
  method: 'nearest-rank';
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  countAbove33Ms: number;
};
export type MobileCThirdResult = {
  third: 1 | 2 | 3;
  observedSegmentIndexes: readonly number[];
  acceptedStepEventIndexes: readonly number[];
  qualification: MobileCDecision;
};
export type MobileCFrameWindow = {
  clockId: MobileCId;
  admittedAtMs: number;
  nominalEndMs: number;
  actualEndMs: MobileCField<number>;
  initialRoomId: MobileCId;
  initialStopId: MobileCId;
  rawIntervals: readonly MobileCRawInterval[];
  rawCompleteness: 'complete' | 'prefix' | 'missing';
  statistics: MobileCField<MobileCStatistics>;
  thirds: readonly MobileCThirdResult[];
  observedStopIds: readonly MobileCId[];
  intervalFloor: MobileCDecision;
};
export type MobileCGraphicsState = {
  atMs: number;
  drawingBufferPx: MobileCSize;
  msaaSamples: MobileCField<number>;
  shadowMapPx: MobileCField<MobileCSize>;
  rendererMemory: MobileCField<{ geometries: number; textures: number }>;
};
export type MobileCGraphics = {
  peakDraws: MobileCField<number>;
  peakTriangles: MobileCField<number>;
  ledgerPeakBytes: MobileCField<number>;
  peakLedgerSnapshotId: MobileCField<MobileCId>;
  states: readonly MobileCGraphicsState[];
  coverage: MobileCDecision;
  drawsGate: MobileCDecision;
  trianglesGate: MobileCDecision;
  ledgerGate: MobileCDecision;
};
export type MobileCTextureAllocation = {
  receivedDeviceFormat: MobileCField<string>;
  internalFormat: MobileCField<string>;
  width: number;
  height: number;
  depth: number;
  layers: number;
  faces: number;
  mipLevels: number;
  samples: number;
  blockGeometry: MobileCField<{ width: number; height: number; bytes: number }>;
  allocatedBytes: MobileCField<number>;
  formatEvidenceIds: readonly MobileCId[];
};
export type MobileCLedgerRow = {
  rowId: MobileCId;
  kind: 'glb' | 'ktx2' | 'texture' | 'material' | 'geometry' | 'renderTarget';
  allocationId: MobileCField<MobileCId>;
  sourceBytes: number;
  compressedPayloadBytes: MobileCField<number>;
  accountingClass: 'cpu-payload' | 'gpu-allocation' | 'metadata' | 'unresolved';
  includedInComparisonTotal: boolean;
  comparisonBytes: MobileCField<number>;
  texture: MobileCField<MobileCTextureAllocation>;
  accountingBasis: string;
  evidenceIds: readonly MobileCId[];
};
export type MobileCLedgerSnapshot = {
  id: MobileCId;
  atMs: number;
  sourceTotalBytes: number;
  rows: readonly MobileCLedgerRow[];
  comparisonTotalBytes: MobileCField<number>;
  aliasAndDoubleCountCheck: MobileCDecision;
  deviceFormatAccounting: MobileCDecision;
};
export type MobileCLongTaskRow = {
  start: MobileCStamp;
  durationMs: number;
  attribution: readonly string[];
  loadRelation: 'exempt' | 'post-load' | 'straddles-settlement' | 'unknown';
  evidenceIds: readonly MobileCId[];
};
export type MobileCNativeCpu = {
  traceIds: readonly MobileCId[];
  coveredSpan: MobileCField<MobileCSpan>;
  rows: readonly MobileCLongTaskRow[];
  postLoadOverThresholdCount: MobileCField<number>;
  completeCoverage: MobileCDecision;
  adjudication: MobileCDecision;
};
export type MobileCLongTasks = {
  apiSupported: MobileCField<boolean>;
  apiCoveredSpan: MobileCField<MobileCSpan>;
  observerDrained: MobileCField<boolean>;
  apiRows: readonly MobileCLongTaskRow[];
  apiCompleteCoverage: MobileCDecision;
  apiPostLoadOverThresholdCount: MobileCField<number>;
  initialExteriorSettledAt: MobileCField<MobileCStamp>;
  nativeTraceRequired: boolean;
  native: MobileCField<MobileCNativeCpu>;
  cpuGate: MobileCDecision;
};
export type MobileCFrameCosts = { swapCostMs: number; disposeCostMs: number };
export type MobileCTransitFrame = {
  rawIntervalIndex: number;
  atMs: number;
  phase: string;
  costs: MobileCFrameCosts;
};
export type MobileCTransit = {
  airlockId: MobileCId;
  directedAirlockId: MobileCId;
  from: MobileCId;
  to: MobileCId;
  transit: MobileCJson;
  holdMs: MobileCField<number>;
  beganAtMs: number;
  endedAtMs: MobileCField<number>;
  readyAtBegin: MobileCField<boolean>;
  leanAtFireM: MobileCField<number>;
  dataReadyMs: MobileCField<number>;
  swapMs: MobileCField<number>;
  swapCostMs: MobileCField<number>;
  postSwapDeltaMs: MobileCField<number>;
  disposeCostMs: MobileCField<number>;
  litAtMs: MobileCField<number>;
  open: MobileCJson;
  closed: readonly MobileCJson[];
  frames: MobileCJson;
  maxDeltaMs: MobileCField<number>;
  maxDeltaPhase: MobileCField<string>;
  stalled: boolean;
  frameRows: readonly MobileCTransitFrame[];
  designated: boolean;
  containmentAndCount: MobileCDecision;
};

export type MobileCNetwork = {
  method: 'cdp-reference' | 'phone-realised' | 'uncontrolled' | 'unavailable';
  mechanism: string;
  requested: { downMbps: 10; rttMs: 100 };
  realisedDownMbps: MobileCField<number>;
  realisedRttMs: MobileCField<number>;
  latencyMeaning: MobileCField<'rtt' | 'one-way' | 'tool-specific'>;
  calibrationEvidenceIds: readonly MobileCId[];
  referenceEquivalence: MobileCDecision;
  qualification: MobileCDecision;
};
export type MobileCPresentation = {
  basis: 'verified-exterior-presentation' | 'renderer-submission' | 'dom-paint' | 'unavailable';
  exteriorRoomId: MobileCId;
  markerLocator: string;
  traceIds: readonly MobileCId[];
  clockRelationId: MobileCField<MobileCId>;
  evidenceIds: readonly MobileCId[];
  qualification: MobileCDecision;
};
export type MobileCFirstExterior = {
  navigationType: MobileCField<'navigate' | 'reload' | 'back-forward' | 'prerender'>;
  navigationStart: MobileCField<MobileCStamp>;
  firstExteriorPresented: MobileCField<MobileCStamp>;
  elapsedMs: MobileCField<number>;
  elapsedUncertaintyMs: MobileCField<number>;
  network: MobileCNetwork;
  presentation: MobileCPresentation;
  coldness: MobileCCache;
  measuredTarget: MobileCDecision;
  qualification: MobileCDecision;
};
export type MobileCInvalidation = {
  reason:
    | 'visibility-interruption'
    | 'aborted'
    | 'ended-early'
    | 'frame-overflow'
    | 'record-overflow'
    | 'byte-overflow'
    | 'clock-discontinuity'
    | 'context-loss'
    | 'protocol-incomplete';
  at: MobileCField<MobileCStamp>;
  details: string;
  evidenceIds: readonly MobileCId[];
};
export type MobileCOverflow = {
  cap: 'frames' | 'records' | 'bytes';
  targetArtifactId: MobileCId;
  limit: number;
  retained: number;
  rejectedAtLeast: number;
  firstRejectedAt: MobileCStamp;
};
export type MobileCRegistration = {
  attemptId: MobileCId;
  slotId: MobileCId;
  registeredAtUtc: string;
  conditionKey: string;
  retryOf: MobileCField<MobileCId>;
  externalEvidenceIds: readonly MobileCId[];
};
export type MobileCAttempt = {
  registration: MobileCRegistration;
  status: 'valid' | 'invalid' | 'lost';
  lossReason: MobileCField<string>;
  invalidations: readonly MobileCInvalidation[];
  overflows: readonly MobileCOverflow[];
  frame: MobileCField<MobileCFrameWindow>;
  firstExterior: MobileCField<MobileCFirstExterior>;
  activities: readonly MobileCActivitySegment[];
  stopEvents: readonly MobileCStopEvent[];
  viewportEvents: readonly MobileCViewportEvent[];
  visibilityEvents: readonly MobileCVisibilityEvent[];
  transits: readonly MobileCTransit[];
  cacheBefore: MobileCCache;
  cacheAfter: MobileCCache;
  thermal: MobileCThermal;
  powerStart: MobileCPowerPoint;
  powerEnd: MobileCPowerPoint;
  powerQualification: MobileCDecision;
  longTasks: MobileCLongTasks;
  graphics: MobileCGraphics;
  ledgerSnapshots: readonly MobileCLedgerSnapshot[];
  protocolQualification: MobileCDecision;
  measuredFloor: MobileCDecision;
};
export type MobileCAttemptLink = {
  attemptId: MobileCId;
  retryOf: MobileCField<MobileCId>;
  conditionKey: string;
  disposition: 'valid' | 'invalid' | 'lost' | 'pending';
  visitFile: MobileCField<MobileCFileRef>;
  measuredExceedance: MobileCField<boolean>;
  explanation: string;
};
export type MobileCSlotResult = {
  slotId: MobileCId;
  scenarioId: MobileCId;
  scopeId: MobileCId;
  repeat: MobileCRepeat;
  attempts: readonly MobileCAttemptLink[];
  fulfillingAttemptId: MobileCField<MobileCId>;
  anyValidMeasuredExceedance: MobileCField<boolean>;
  fulfilment: MobileCDecision;
};
export type MobileCVisit = {
  id: MobileCId;
  scopeId: MobileCId;
  clockId: MobileCId;
  openedAt: MobileCStamp;
  sealedAt: MobileCStamp;
  profile: MobileCProfile;
  attempt: MobileCAttempt;
  slotResult: MobileCSlotResult;
  clocks: readonly MobileCClock[];
  clockRelations: readonly MobileCClockRelation[];
  traces: readonly MobileCTraceRef[];
  evidence: readonly MobileCEvidence[];
};
export type MobileCScopeCoverage = {
  scopeId: MobileCId;
  observedStopIds: readonly MobileCId[];
  requiredStopIds: readonly MobileCId[];
  directedAirlockIds: readonly MobileCId[];
  stopCoverage: MobileCDecision;
  airlockCoverage: MobileCDecision;
  sentinelCoverage: MobileCDecision;
  repeatAndSoakCoverage: MobileCDecision;
};
export type MobileCOwnerDecision = {
  decisionId: MobileCId;
  subject: string;
  disposition: MobileCField<string>;
  authorityEvidenceIds: readonly MobileCId[];
};
export type MobileCRider = {
  topic: 'low-power-mode' | 'untested-device' | 'unratified-target' | 'unresolved-never' | 'other';
  description: string;
  decision: MobileCDecision;
};
export type MobileCIndex = {
  indexId: MobileCId;
  part: number;
  parts: number;
  scopeIds: readonly MobileCId[];
  registrations: readonly MobileCRegistration[];
  slots: readonly MobileCSlotResult[];
  visitFiles: readonly MobileCFileRef[];
  receipts: readonly MobileCSavedReceipt[];
  traces: readonly MobileCTraceRef[];
  evidence: readonly MobileCEvidence[];
  scopeCoverage: readonly MobileCScopeCoverage[];
  ownerDecisions: readonly MobileCOwnerDecision[];
  riders: readonly MobileCRider[];
  archiveCompleteness: MobileCDecision;
  measuredFloor: MobileCDecision;
  ownerGate: MobileCDecision;
  exitGate: MobileCDecision;
};
export type MobileCPayload =
  | { kind: 'plan'; plan: MobileCPlanV1 }
  | { kind: 'visit'; planFile: MobileCFileRef; visit: MobileCVisit }
  | { kind: 'index'; planFile: MobileCFileRef; index: MobileCIndex };
export type MobileCReportV1 = {
  format: 'h3d-mobile-c/v1';
  artifactId: MobileCId;
  planId: MobileCId;
  createdAtUtc: string;
  producer: MobileCBuild;
  payload: MobileCPayload;
};
export type MobileCPrepared = {
  artifactId: MobileCId;
  kind: 'plan' | 'visit' | 'index';
  suggestedFileName: string;
  mime: 'application/json';
  byteLength: number;
  sha256: string;
  rawIntervalRows: number;
  visitObjectRecords: number;
};
export type MobileCSavedReceipt = {
  artifactId: MobileCId;
  actualFileName: string;
  byteLength: number;
  sha256: string;
  verifiedAtUtc: string;
  verification: 'native-selected-file-byte-match';
};
export type MobileCTransport = {
  transport: 'native-save' | 'native-share' | 'download';
  handoff: 'not-started' | 'handed-off' | 'cancelled' | 'failed';
  reason: string;
};
export type MobileCControlState =
  | 'empty'
  | 'plan-loaded'
  | 'ready'
  | 'admission-pending'
  | 'capturing'
  | 'stopped'
  | 'sealed'
  | 'prepared'
  | 'awaiting-verification'
  | 'released';
export type MobileCBeginInput = {
  visitId: MobileCId;
  registration: MobileCRegistration;
  profile: MobileCProfile;
  thermal: MobileCThermal;
  cacheBefore: MobileCCache;
  powerStart: MobileCPowerPoint;
  initialExteriorSettledAt: MobileCField<MobileCStamp>;
  importedProbe: MobileCField<MobileCFirstExterior>;
  clocks: readonly MobileCClock[];
  clockRelations: readonly MobileCClockRelation[];
  traces: readonly MobileCTraceRef[];
  evidence: readonly MobileCEvidence[];
};
export type MobileCEndInput = {
  visitId: MobileCId;
  externalEvidence: readonly MobileCEvidence[];
  traces: readonly MobileCTraceRef[];
  clockRelations: readonly MobileCClockRelation[];
  nativeCpu: MobileCField<MobileCNativeCpu>;
};
export type MobileCCommand = { commandId: MobileCId } & (
  | { op: 'loadPlan'; plan: MobileCPlanV1 }
  | { op: 'begin'; input: MobileCBeginInput }
  | { op: 'abort'; visitId: MobileCId; reason: string }
  | { op: 'endVisit'; input: MobileCEndInput }
  | {
      op: 'prepareExport';
      artifactId: MobileCId;
      target:
        | { kind: 'plan' }
        | { kind: 'visit'; visitId: MobileCId }
        | { kind: 'index'; index: MobileCIndex };
    }
  | {
      op: 'exportPrepared';
      artifactId: MobileCId;
      transport: 'native-save' | 'native-share' | 'download';
    }
  | { op: 'verifySaved'; artifactId: MobileCId }
);
export type MobileCCommandValue =
  | { kind: 'plan-loaded'; planId: MobileCId }
  | {
      kind: 'admission';
      visitId: MobileCId;
      attemptId: MobileCId;
      admittedAt: MobileCField<MobileCStamp>;
    }
  | {
      kind: 'terminal';
      visitId: MobileCId;
      attemptId: MobileCId;
      result: MobileCSlotResult;
    }
  | { kind: 'prepared'; prepared: MobileCPrepared }
  | { kind: 'transport'; transport: MobileCTransport }
  | { kind: 'verified'; receipt: MobileCSavedReceipt };
export type MobileCCommandReply = {
  commandId: MobileCId;
  state: MobileCControlState;
  outcome: 'ok' | 'pending' | 'error';
  code: string;
  reason: string;
  value: MobileCField<MobileCCommandValue>;
};

// ---------------------------------------------------------------------------
// Absence conventions (§18.9). known / unknown / pending / not-applicable are four distinct
// states: an empty array is observed emptiness, never absence, and unsupported evidence is
// never a zero. These constructors and predicates are the only place the distinction is
// encoded, so no caller can collapse it by hand.
// ---------------------------------------------------------------------------

export const knownField = <T>(
  value: T,
  evidenceIds: readonly MobileCId[] = [],
): MobileCField<T> => ({ state: 'known', value, evidenceIds });

export const unknownField = <T>(
  reason: string,
  requiredEvidence: readonly string[] = [],
): MobileCField<T> => ({ state: 'unknown', reason, requiredEvidence });

export const pendingField = <T>(reason: string, nextAction: string): MobileCField<T> => ({
  state: 'pending',
  reason,
  nextAction,
});

export const notApplicableField = <T>(reason: string): MobileCField<T> => ({
  state: 'not-applicable',
  reason,
});

export const isKnown = <T>(
  field: MobileCField<T>,
): field is { state: 'known'; value: T; evidenceIds: readonly MobileCId[] } =>
  field.state === 'known';

export const isResolved = <T>(field: MobileCField<T>): boolean =>
  field.state === 'known' || field.state === 'not-applicable';

/** Reads a known value, or the supplied fallback for every non-known state. */
export const fieldValueOr = <T>(field: MobileCField<T>, fallback: T): T =>
  field.state === 'known' ? field.value : fallback;

/** An unsupported capability is unknown, never zero: a count must come from a known field. */
export const countFromField = (field: MobileCField<number>): MobileCField<number> =>
  field.state === 'known'
    ? field
    : unknownField<number>(field.reason, field.state === 'unknown' ? field.requiredEvidence : []);

export const decide = (
  status: MobileCDecision['status'],
  reason: string,
  evidenceIds: readonly MobileCId[] = [],
): MobileCDecision => ({ status, reason, evidenceIds });

export const isPass = (decision: MobileCDecision): boolean => decision.status === 'pass';

/** A decision is settled when it has reached pass or fail; unknown/pending/n-a are open. */
export const isSettled = (decision: MobileCDecision): boolean =>
  decision.status === 'pass' || decision.status === 'fail';

/** not-applicable is legitimate only with stated structural grounds (§18.9). */
export const notApplicableIsGrounded = (
  decision: MobileCDecision,
  structuralGrounds: boolean,
): boolean => decision.status !== 'not-applicable' || structuralGrounds;

/**
 * Conjunction over decisions, honest about absence: any fail wins, then any unknown, then any
 * pending; not-applicable members abstain; an empty set is unknown, never a vacuous pass.
 */
export const conjoinDecisions = (
  decisions: readonly MobileCDecision[],
  subject: string,
): MobileCDecision => {
  const evidenceIds = decisions.flatMap((d) => [...d.evidenceIds]);
  const failed = decisions.filter((d) => d.status === 'fail');
  if (failed.length > 0) {
    return decide('fail', `${subject}: ${failed.length} member(s) fail`, evidenceIds);
  }
  const unknowns = decisions.filter((d) => d.status === 'unknown');
  if (unknowns.length > 0) {
    return decide('unknown', `${subject}: ${unknowns.length} member(s) unknown`, evidenceIds);
  }
  const pendings = decisions.filter((d) => d.status === 'pending');
  if (pendings.length > 0) {
    return decide('pending', `${subject}: ${pendings.length} member(s) pending`, evidenceIds);
  }
  const passes = decisions.filter((d) => d.status === 'pass');
  if (passes.length === 0) {
    return decide('unknown', `${subject}: no assessed member`, evidenceIds);
  }
  return decide('pass', `${subject}: all ${passes.length} assessed member(s) pass`, evidenceIds);
};

// ---------------------------------------------------------------------------
// Nearest-rank statistics (§18.5). Sorted ascending, one-based rank ceil(p × N); zero samples
// yield unknown, not zero; comparisons are unrounded; countAbove33Ms counts intervals STRICTLY
// above limits.p95Ms, so a sustained 33.33-ms cadence fails the literal 33.0 threshold.
// ---------------------------------------------------------------------------

export const nearestRankIndex = (sampleCount: number, p: number): number =>
  Math.min(sampleCount, Math.max(1, Math.ceil(p * sampleCount))) - 1;

const sortedAscending = (values: readonly number[]): readonly number[] =>
  [...values].sort((a, b) => a - b);

const elementAt = (sorted: readonly number[], index: number): number => {
  const value = sorted[index];
  return value === undefined ? Number.NaN : value;
};

export const nearestRankPercentile = (
  values: readonly number[],
  p: number,
): MobileCField<number> => {
  if (values.length === 0) {
    return unknownField<number>('no interval samples', ['frame-window raw intervals']);
  }
  const sorted = sortedAscending(values);
  return knownField(elementAt(sorted, nearestRankIndex(sorted.length, p)));
};

export const countStrictlyAbove = (values: readonly number[], threshold: number): number =>
  values.filter((value) => value > threshold).length;

export const computeStatistics = (
  intervals: readonly MobileCRawInterval[],
  limits: MobileCLimits,
): MobileCField<MobileCStatistics> => {
  const values = intervals.map((interval) => interval.deltaMs);
  if (values.length === 0) {
    return unknownField<MobileCStatistics>('zero samples yield unknown, not zero', [
      'frame-window raw intervals',
    ]);
  }
  const sorted = sortedAscending(values);
  const statistics: MobileCStatistics = {
    method: 'nearest-rank',
    sampleCount: sorted.length,
    p50Ms: elementAt(sorted, nearestRankIndex(sorted.length, 0.5)),
    p95Ms: elementAt(sorted, nearestRankIndex(sorted.length, 0.95)),
    p99Ms: elementAt(sorted, nearestRankIndex(sorted.length, 0.99)),
    maxMs: elementAt(sorted, sorted.length - 1),
    countAbove33Ms: countStrictlyAbove(values, limits.p95Ms),
  };
  return knownField(statistics);
};

/**
 * The interval floor for one window: p95 ≤ limits.p95Ms AND p99 ≤ limits.p99Ms, unrounded.
 * A prefix/missing rawCompleteness can never produce a qualifying floor on statistics alone.
 */
export const assessIntervalFloor = (
  intervalWindow: MobileCFrameWindow,
  limits: MobileCLimits,
): MobileCDecision => {
  if (intervalWindow.rawCompleteness !== 'complete') {
    return decide(
      'unknown',
      `raw intervals are ${intervalWindow.rawCompleteness}; statistics alone cannot qualify a floor`,
    );
  }
  const stats = intervalWindow.statistics;
  if (!isKnown(stats)) {
    return decide('unknown', 'no statistics: zero samples are unknown, not zero');
  }
  const { p95Ms, p99Ms } = stats.value;
  if (p95Ms > limits.p95Ms || p99Ms > limits.p99Ms) {
    return decide(
      'fail',
      `p95 ${p95Ms} vs ${limits.p95Ms}, p99 ${p99Ms} vs ${limits.p99Ms} (unrounded)`,
    );
  }
  return decide('pass', `p95 ${p95Ms} ≤ ${limits.p95Ms} and p99 ${p99Ms} ≤ ${limits.p99Ms}`);
};

// ---------------------------------------------------------------------------
// Long-task honesty (§18.5). Unsupported / uncertain / incomplete API coverage leaves the API
// count unknown and demands native evidence. Separately sufficient native coverage may resolve
// the CPU gate WITHOUT rewriting the API result as zero. A task straddling settlement counts;
// only the initial exterior settlement ends the load exemption.
// ---------------------------------------------------------------------------

export const longTaskCounts = (
  rows: readonly MobileCLongTaskRow[],
  limits: MobileCLimits,
): number =>
  rows.filter(
    (row) =>
      row.durationMs > limits.longTaskMs &&
      (row.loadRelation === 'post-load' || row.loadRelation === 'straddles-settlement'),
  ).length;

/** The API count is known only with support, drainage, complete coverage and a settlement. */
export const assessApiLongTaskCoverage = (tasks: MobileCLongTasks): MobileCDecision => {
  if (!isKnown(tasks.apiSupported)) {
    return decide('unknown', 'long-task API support unestablished');
  }
  if (!tasks.apiSupported.value) {
    return decide('unknown', 'long-task API unsupported: count is unknown, not zero');
  }
  if (!isKnown(tasks.observerDrained) || !tasks.observerDrained.value) {
    return decide('unknown', 'observer drainage unconfirmed: coverage incomplete');
  }
  if (!isKnown(tasks.apiCoveredSpan)) {
    return decide('unknown', 'API covered span unknown');
  }
  if (!isKnown(tasks.initialExteriorSettledAt)) {
    return decide('unknown', 'initial exterior settlement unknown: load exemption unbounded');
  }
  return decide('pass', 'API coverage supported, drained and complete');
};

export const assessNativeCpuCoverage = (
  native: MobileCField<MobileCNativeCpu>,
): MobileCDecision => {
  if (!isKnown(native)) {
    return decide('unknown', 'no native CPU evidence supplied');
  }
  const value = native.value;
  if (value.traceIds.length === 0) {
    return decide('unknown', 'native evidence declares no trace');
  }
  if (!isKnown(value.coveredSpan)) {
    return decide('unknown', 'native covered span unknown');
  }
  if (!isPass(value.completeCoverage)) {
    return decide('unknown', `native coverage incomplete: ${value.completeCoverage.reason}`);
  }
  if (!isKnown(value.postLoadOverThresholdCount)) {
    return decide('unknown', 'native post-load count unknown');
  }
  return decide('pass', 'native coverage separately sufficient');
};

export type MobileCCpuAssessment = {
  apiCompleteCoverage: MobileCDecision;
  apiPostLoadOverThresholdCount: MobileCField<number>;
  nativeTraceRequired: boolean;
  nativeAdjudication: MobileCDecision;
  cpuGate: MobileCDecision;
};

/**
 * Resolves the CPU gate. The API count stays exactly as honest as its coverage: incomplete
 * coverage leaves it unknown even when native evidence resolves the gate.
 */
export const assessCpu = (tasks: MobileCLongTasks, limits: MobileCLimits): MobileCCpuAssessment => {
  const apiCoverage = assessApiLongTaskCoverage(tasks);
  const apiComplete = isPass(apiCoverage);
  const apiCount: MobileCField<number> = apiComplete
    ? knownField(longTaskCounts(tasks.apiRows, limits))
    : unknownField<number>(apiCoverage.reason, ['native CPU trace covering the window']);
  const nativeAdjudication = assessNativeCpuCoverage(tasks.native);
  const nativeCount =
    isKnown(tasks.native) && isKnown(tasks.native.value.postLoadOverThresholdCount)
      ? tasks.native.value.postLoadOverThresholdCount.value
      : null;
  const gateFrom = (count: number, basis: string): MobileCDecision =>
    count > 0
      ? decide('fail', `${basis}: ${count} post-load task(s) over ${limits.longTaskMs} ms`)
      : decide('pass', `${basis}: no post-load task over ${limits.longTaskMs} ms`);
  if (apiComplete && isKnown(apiCount)) {
    return {
      apiCompleteCoverage: apiCoverage,
      apiPostLoadOverThresholdCount: apiCount,
      nativeTraceRequired: false,
      nativeAdjudication,
      cpuGate: gateFrom(apiCount.value, 'API coverage'),
    };
  }
  if (isPass(nativeAdjudication) && nativeCount !== null) {
    return {
      apiCompleteCoverage: apiCoverage,
      apiPostLoadOverThresholdCount: apiCount,
      nativeTraceRequired: true,
      nativeAdjudication,
      cpuGate: gateFrom(nativeCount, 'native coverage'),
    };
  }
  return {
    apiCompleteCoverage: apiCoverage,
    apiPostLoadOverThresholdCount: apiCount,
    nativeTraceRequired: true,
    nativeAdjudication,
    cpuGate: decide(
      'unknown',
      `CPU gate unresolved: ${apiCoverage.reason}; ${nativeAdjudication.reason}`,
    ),
  };
};

// ---------------------------------------------------------------------------
// Graphics ceilings (§18.5). Peaks cover the observed window, not rolling-display averages; an
// unknown peak leaves its gate unknown, and an unresolved ledger unit convention or ceiling
// leaves the ledger gate pending rather than passing it.
// ---------------------------------------------------------------------------

export const assessCeiling = (
  peak: MobileCField<number>,
  ceiling: number,
  subject: string,
): MobileCDecision => {
  if (!isKnown(peak)) {
    return decide('unknown', `${subject} peak unobserved: ${peak.reason}`);
  }
  return peak.value > ceiling
    ? decide('fail', `${subject} peak ${peak.value} exceeds ${ceiling}`)
    : decide('pass', `${subject} peak ${peak.value} within ${ceiling}`);
};

export const assessLedgerGate = (
  peakBytes: MobileCField<number>,
  limits: MobileCLimits,
): MobileCDecision => {
  if (!isKnown(limits.ledgerUnitConvention)) {
    return decide('pending', 'ledger unit convention unresolved: gate stays pending');
  }
  if (!isKnown(limits.ledgerCeilingBytes)) {
    return decide('pending', 'ledger ceiling unratified: gate stays pending');
  }
  return assessCeiling(peakBytes, limits.ledgerCeilingBytes.value, 'ledger bytes');
};

export type MobileCGraphicsAssessment = {
  drawsGate: MobileCDecision;
  trianglesGate: MobileCDecision;
  ledgerGate: MobileCDecision;
  coverage: MobileCDecision;
};

export const assessGraphics = (
  graphics: MobileCGraphics,
  limits: MobileCLimits,
): MobileCGraphicsAssessment => ({
  drawsGate: assessCeiling(graphics.peakDraws, limits.maxDraws, 'draws'),
  trianglesGate: assessCeiling(graphics.peakTriangles, limits.maxTriangles, 'triangles'),
  ledgerGate: assessLedgerGate(graphics.ledgerPeakBytes, limits),
  coverage:
    graphics.states.length === 0
      ? decide('unknown', 'no graphics states observed over the window')
      : graphics.coverage,
});

// ---------------------------------------------------------------------------
// The required-window conjunction (§18.5/§21). Each required window is assessed independently
// on p95/p99, post-load long tasks and the graphics ceilings; the aggregate is the conjunction
// of the per-window decisions, so no pooled median can hide one failed room or transit.
// ---------------------------------------------------------------------------

export type MobileCWindowAssessment = {
  windowId: MobileCId;
  intervalFloor: MobileCDecision;
  cpuGate: MobileCDecision;
  drawsGate: MobileCDecision;
  trianglesGate: MobileCDecision;
  ledgerGate: MobileCDecision;
  windowFloor: MobileCDecision;
};

export type MobileCRequiredWindow = {
  windowId: MobileCId;
  frame: MobileCField<MobileCFrameWindow>;
  longTasks: MobileCLongTasks;
  graphics: MobileCGraphics;
};

export const assessRequiredWindow = (
  required: MobileCRequiredWindow,
  limits: MobileCLimits,
): MobileCWindowAssessment => {
  const intervalFloor = isKnown(required.frame)
    ? assessIntervalFloor(required.frame.value, limits)
    : decide('unknown', `no frame window: ${required.frame.reason}`);
  const cpu = assessCpu(required.longTasks, limits);
  const graphics = assessGraphics(required.graphics, limits);
  return {
    windowId: required.windowId,
    intervalFloor,
    cpuGate: cpu.cpuGate,
    drawsGate: graphics.drawsGate,
    trianglesGate: graphics.trianglesGate,
    ledgerGate: graphics.ledgerGate,
    windowFloor: conjoinDecisions(
      [intervalFloor, cpu.cpuGate, graphics.drawsGate, graphics.trianglesGate, graphics.ledgerGate],
      `window ${required.windowId}`,
    ),
  };
};

/**
 * The measured floor over every required window. No pooled statistic is computed here: the
 * aggregate sees only the per-window decisions, and one failing window fails the conjunction.
 */
export const assessRequiredWindows = (
  required: readonly MobileCRequiredWindow[],
  limits: MobileCLimits,
): { windows: readonly MobileCWindowAssessment[]; measuredFloor: MobileCDecision } => {
  const windows = required.map((entry) => assessRequiredWindow(entry, limits));
  return {
    windows,
    measuredFloor: conjoinDecisions(
      windows.map((entry) => entry.windowFloor),
      'required windows',
    ),
  };
};

// ---------------------------------------------------------------------------
// First-exterior qualification (§18.5/§21). Qualification needs a presented-frame basis,
// network equivalence and coldness; the pass rule is that the COMPLETE uncertainty interval
// [elapsed − u, elapsed + u] lies within limits.firstExteriorMs. An interval straddling the
// threshold is unknown, never rounded down. The measured miss (elapsed − u > threshold) is a
// separate decision that survives an unresolved qualification.
// ---------------------------------------------------------------------------

export const assessPresentationBasis = (presentation: MobileCPresentation): MobileCDecision => {
  if (presentation.basis === 'verified-exterior-presentation') {
    return decide('pass', 'presented-frame evidence present', presentation.evidenceIds);
  }
  if (presentation.basis === 'unavailable') {
    return decide('unknown', 'no presentation evidence', presentation.evidenceIds);
  }
  return decide(
    'unknown',
    `${presentation.basis} is not presented-frame evidence`,
    presentation.evidenceIds,
  );
};

export const assessNetworkEquivalence = (network: MobileCNetwork): MobileCDecision => {
  if (network.method === 'unavailable' || network.method === 'uncontrolled') {
    return decide(
      'unknown',
      `network method ${network.method}: reference equivalence unestablished`,
      network.calibrationEvidenceIds,
    );
  }
  if (!isKnown(network.realisedDownMbps) || !isKnown(network.realisedRttMs)) {
    return decide('unknown', 'realised network conditions unmeasured', [
      ...network.calibrationEvidenceIds,
    ]);
  }
  if (!isKnown(network.latencyMeaning)) {
    return decide('unknown', 'latency meaning unestablished: rtt and one-way are not the same');
  }
  return network.referenceEquivalence;
};

/** The complete uncertainty interval must lie within the threshold; overlap is unknown. */
export const assessUncertaintyInterval = (
  elapsedMs: MobileCField<number>,
  uncertaintyMs: MobileCField<number>,
  thresholdMs: number,
): MobileCDecision => {
  if (!isKnown(elapsedMs)) {
    return decide('unknown', `elapsed unmeasured: ${elapsedMs.reason}`);
  }
  if (!isKnown(uncertaintyMs)) {
    return decide('unknown', 'uncertainty unestablished: the interval is unbounded');
  }
  const low = elapsedMs.value - uncertaintyMs.value;
  const high = elapsedMs.value + uncertaintyMs.value;
  if (high <= thresholdMs) {
    return decide('pass', `[${low}, ${high}] within ${thresholdMs} ms`);
  }
  if (low > thresholdMs) {
    return decide('fail', `[${low}, ${high}] entirely beyond ${thresholdMs} ms`);
  }
  return decide('unknown', `[${low}, ${high}] straddles ${thresholdMs} ms: not rounded down`);
};

/** The measured miss: only an interval entirely beyond the threshold is a measured exceedance. */
export const assessMeasuredTarget = (
  exterior: MobileCFirstExterior,
  limits: MobileCLimits,
): MobileCDecision =>
  assessUncertaintyInterval(
    exterior.elapsedMs,
    exterior.elapsedUncertaintyMs,
    limits.firstExteriorMs,
  );

export type MobileCFirstExteriorAssessment = {
  presentation: MobileCDecision;
  network: MobileCDecision;
  coldness: MobileCDecision;
  measuredTarget: MobileCDecision;
  measuredExceedance: MobileCField<boolean>;
  qualification: MobileCDecision;
};

export const assessFirstExterior = (
  exterior: MobileCFirstExterior,
  limits: MobileCLimits,
): MobileCFirstExteriorAssessment => {
  const presentation = assessPresentationBasis(exterior.presentation);
  const network = assessNetworkEquivalence(exterior.network);
  const coldness = exterior.coldness.qualification;
  const measuredTarget = assessMeasuredTarget(exterior, limits);
  const navigation = isKnown(exterior.navigationType)
    ? decide('pass', `navigation type ${exterior.navigationType.value}`)
    : decide('unknown', 'navigation type unestablished');
  return {
    presentation,
    network,
    coldness,
    measuredTarget,
    // A measured miss is preserved whatever the qualification says; absence of a settled
    // measurement is unknown, never a false.
    measuredExceedance: isSettled(measuredTarget)
      ? knownField(measuredTarget.status === 'fail')
      : unknownField<boolean>(measuredTarget.reason, ['presented-frame trace', 'clock relation']),
    qualification: conjoinDecisions(
      [presentation, network, coldness, navigation],
      'first-exterior protocol',
    ),
  };
};

// ---------------------------------------------------------------------------
// Riders, owner decisions and the exit gate (§18.9/§21). An applicable rider whose decision is
// unresolved prevents an unqualified certificate: the exit gate degrades to pending/unknown and
// never to a silent pass.
// ---------------------------------------------------------------------------

export const riderIsApplicable = (rider: MobileCRider): boolean =>
  rider.decision.status !== 'not-applicable';

export const unresolvedRiders = (riders: readonly MobileCRider[]): readonly MobileCRider[] =>
  riders.filter((rider) => riderIsApplicable(rider) && !isSettled(rider.decision));

export const assessRiders = (riders: readonly MobileCRider[]): MobileCDecision => {
  const applicable = riders.filter(riderIsApplicable);
  if (applicable.length === 0) {
    return decide('not-applicable', 'no applicable rider');
  }
  const unresolved = unresolvedRiders(riders);
  if (unresolved.length > 0) {
    return decide(
      'pending',
      `${unresolved.length} applicable rider(s) unresolved: ${unresolved
        .map((rider) => rider.topic)
        .join(', ')}`,
    );
  }
  return conjoinDecisions(
    applicable.map((rider) => rider.decision),
    'riders',
  );
};

export const assessOwnerGate = (
  decisions: readonly MobileCOwnerDecision[],
  riders: readonly MobileCRider[],
): MobileCDecision => {
  const undecided = decisions.filter((decision) => !isKnown(decision.disposition));
  const riderDecision = assessRiders(riders);
  if (undecided.length > 0) {
    return decide(
      'pending',
      `${undecided.length} owner decision(s) outstanding`,
      decisions.flatMap((decision) => [...decision.authorityEvidenceIds]),
    );
  }
  if (riderDecision.status === 'not-applicable') {
    return decide('pass', 'owner decisions settled; no applicable rider');
  }
  return riderDecision.status === 'pass'
    ? decide('pass', 'owner decisions settled and riders resolved')
    : riderDecision;
};

// ---------------------------------------------------------------------------
// Archive completeness (§18.9/§21). Every registration, retained failure, visit file, receipt,
// trace, plan reference and declared part is reconciled; a missing member stays unresolved
// instead of disappearing from required coverage, and an empty required set is unknown.
// ---------------------------------------------------------------------------

export type MobileCArchiveInput = {
  index: MobileCIndex;
  plannedSlotIds: readonly MobileCId[];
  planFile: MobileCFileRef;
};

export type MobileCArchiveGap = {
  kind:
    | 'unplanned-slot'
    | 'missing-slot'
    | 'unregistered-attempt'
    | 'missing-attempt-file'
    | 'missing-receipt'
    | 'receipt-digest-mismatch'
    | 'missing-trace'
    | 'plan-reference-mismatch'
    | 'missing-part';
  subjectId: MobileCId;
  detail: string;
};

const uniqueIds = (ids: readonly MobileCId[]): readonly MobileCId[] => [...new Set(ids)];

const missingFrom = (
  required: readonly MobileCId[],
  present: readonly MobileCId[],
): readonly MobileCId[] => {
  const have = new Set(present);
  return uniqueIds(required).filter((id) => !have.has(id));
};

export const archiveGaps = (input: MobileCArchiveInput): readonly MobileCArchiveGap[] => {
  const { index, plannedSlotIds, planFile } = input;
  const gaps: MobileCArchiveGap[] = [];
  const resultSlotIds = index.slots.map((slot) => slot.slotId);
  for (const slotId of missingFrom(plannedSlotIds, resultSlotIds)) {
    gaps.push({ kind: 'missing-slot', subjectId: slotId, detail: 'planned slot has no result' });
  }
  for (const slotId of missingFrom(resultSlotIds, plannedSlotIds)) {
    gaps.push({ kind: 'unplanned-slot', subjectId: slotId, detail: 'result for unplanned slot' });
  }
  const registeredAttemptIds = index.registrations.map((registration) => registration.attemptId);
  const linkedAttempts = index.slots.flatMap((slot) => slot.attempts);
  for (const link of linkedAttempts) {
    if (!registeredAttemptIds.includes(link.attemptId)) {
      gaps.push({
        kind: 'unregistered-attempt',
        subjectId: link.attemptId,
        detail: 'attempt linked without a registration',
      });
    }
    // Retained failures and invalidations stay required members: an invalid or lost attempt
    // still owes its visit file, so absence is unresolved, never a deletion.
    if (link.disposition !== 'pending' && !isKnown(link.visitFile)) {
      gaps.push({
        kind: 'missing-attempt-file',
        subjectId: link.attemptId,
        detail: `${link.disposition} attempt has no visit file`,
      });
    }
  }
  for (const registration of index.registrations) {
    if (!linkedAttempts.some((link) => link.attemptId === registration.attemptId)) {
      gaps.push({
        kind: 'unregistered-attempt',
        subjectId: registration.attemptId,
        detail: 'registration has no slot-result link',
      });
    }
  }
  const receiptIds = index.receipts.map((receipt) => receipt.artifactId);
  const fileArtifactIds = index.visitFiles.map((file) => file.artifactId);
  for (const artifactId of missingFrom(fileArtifactIds, receiptIds)) {
    gaps.push({
      kind: 'missing-receipt',
      subjectId: artifactId,
      detail: 'archived file has no verification receipt',
    });
  }
  for (const trace of index.traces) {
    if (!isKnown(trace.coverage)) {
      gaps.push({
        kind: 'missing-trace',
        subjectId: trace.traceId,
        detail: 'trace coverage unknown',
      });
    }
  }
  for (const id of missingFrom(
    index.slots.flatMap((slot) =>
      slot.attempts.flatMap((link) => (isKnown(link.visitFile) ? [link.attemptId] : [])),
    ),
    index.traces.flatMap((trace) => [...trace.attemptIds]),
  )) {
    gaps.push({ kind: 'missing-trace', subjectId: id, detail: 'no trace covers the attempt' });
  }
  for (const receipt of index.receipts) {
    const file = index.visitFiles.find((entry) => entry.artifactId === receipt.artifactId);
    if (file !== undefined && file.sha256 !== receipt.sha256) {
      gaps.push({
        kind: 'receipt-digest-mismatch',
        subjectId: receipt.artifactId,
        detail: 'receipt digest differs from the archived file digest',
      });
    }
  }
  if (planFile.artifactId.length === 0) {
    gaps.push({
      kind: 'plan-reference-mismatch',
      subjectId: index.indexId,
      detail: 'index carries no plan reference',
    });
  }
  if (index.part < 1 || index.parts < 1 || index.part > index.parts) {
    gaps.push({
      kind: 'missing-part',
      subjectId: index.indexId,
      detail: `part ${index.part} of ${index.parts} is not a declared member`,
    });
  }
  return gaps;
};

export const assessArchiveCompleteness = (input: MobileCArchiveInput): MobileCDecision => {
  if (input.plannedSlotIds.length === 0) {
    return decide('unknown', 'no planned slot enumerated: completeness unassessable');
  }
  const gaps = archiveGaps(input);
  if (gaps.length === 0) {
    return decide('pass', 'all registrations, files, receipts, traces and parts reconcile');
  }
  return decide(
    'unknown',
    `${gaps.length} unreconciled member(s): ${gaps
      .map((gap) => `${gap.kind}:${gap.subjectId}`)
      .join(', ')}`,
  );
};

/** The exit gate is the conjunction of archive completeness, measured floor and the owner gate. */
export const assessExitGate = (
  archiveCompleteness: MobileCDecision,
  measuredFloor: MobileCDecision,
  ownerGate: MobileCDecision,
): MobileCDecision =>
  conjoinDecisions([archiveCompleteness, measuredFloor, ownerGate], 'exit gate');

// ---------------------------------------------------------------------------
// Artefact predicates (§18.7/§21). The format tag, the portable-ASCII filename grammar, the
// preparation receipt laws and the verification comparators.
//
// HOST BOUNDARY: the digest string and the byte length in MobileCPrepared are computed by the
// host over the serialized bytes; the digest is never part of the hashed bytes. The functions
// below compare injected facts and never compute a digest.
// ---------------------------------------------------------------------------

export const MOBILE_C_FORMAT = 'h3d-mobile-c/v1';

export const isMobileCFormat = (report: MobileCReportV1): boolean =>
  report.format === MOBILE_C_FORMAT;

export const payloadKind = (payload: MobileCPayload): 'plan' | 'visit' | 'index' => payload.kind;

/** Portable-ASCII segment: letters, digits, hyphen and dot only; no separators or spaces. */
const PORTABLE_SEGMENT = /^[A-Za-z0-9.-]+$/;

export const isPortableSegment = (segment: string): boolean =>
  segment.length > 0 && PORTABLE_SEGMENT.test(segment);

export type MobileCNameParts = {
  planId: MobileCId;
  scopeId: MobileCId | null;
  kind: 'plan' | 'visit' | 'index';
  artifactId: MobileCId;
};

/**
 * h3d-mobile-c_v1_<planId>_<scopeId-or-all>_<kind>_<artifactId>.json — a null scopeId renders
 * the literal `all`.
 */
export const mobileCFileName = (parts: MobileCNameParts): string =>
  [
    'h3d-mobile-c',
    'v1',
    parts.planId,
    parts.scopeId === null ? 'all' : parts.scopeId,
    parts.kind,
    parts.artifactId,
  ].join('_') + '.json';

export const parseMobileCFileName = (fileName: string): MobileCNameParts | null => {
  if (!fileName.endsWith('.json')) {
    return null;
  }
  const stem = fileName.slice(0, fileName.length - '.json'.length);
  const segments = stem.split('_');
  if (segments.length !== 6) {
    return null;
  }
  const [prefix, version, planId, scope, kind, artifactId] = segments;
  if (prefix !== 'h3d-mobile-c' || version !== 'v1') {
    return null;
  }
  if (planId === undefined || scope === undefined || artifactId === undefined) {
    return null;
  }
  if (kind !== 'plan' && kind !== 'visit' && kind !== 'index') {
    return null;
  }
  if (![planId, scope, artifactId].every(isPortableSegment)) {
    return null;
  }
  return { planId, scopeId: scope === 'all' ? null : scope, kind, artifactId };
};

export const fileNameMatchesParts = (fileName: string, parts: MobileCNameParts): boolean =>
  fileName === mobileCFileName(parts);

export const preparedKindMatchesPayload = (
  prepared: MobileCPrepared,
  payload: MobileCPayload,
): boolean => prepared.kind === payloadKind(payload);

/**
 * The preparation receipt laws. The digest is computed by the host over the serialized bytes and
 * is therefore NOT part of the hashed bytes: it travels beside them, so two preparations of an
 * unchanged sealed input must agree on byteLength and sha256 and on the suggested name.
 */
export const preparationsAgree = (first: MobileCPrepared, second: MobileCPrepared): boolean =>
  first.artifactId === second.artifactId &&
  first.kind === second.kind &&
  first.suggestedFileName === second.suggestedFileName &&
  first.mime === second.mime &&
  first.byteLength === second.byteLength &&
  first.sha256 === second.sha256 &&
  first.rawIntervalRows === second.rawIntervalRows &&
  first.visitObjectRecords === second.visitObjectRecords;

export type MobileCVerificationFault =
  | 'byte-length-mismatch'
  | 'digest-mismatch'
  | 'artifact-identity-mismatch'
  | 'format-version-mismatch'
  | 'plan-reference-mismatch'
  | 'file-name-not-portable'
  | 'verification-method-unrecognised';

export type MobileCVerificationInput = {
  prepared: MobileCPrepared;
  receipt: MobileCSavedReceipt;
  report: MobileCReportV1;
  planFile: MobileCFileRef;
  expectedPlanFile: MobileCFileRef;
};

/** Every mismatch is reported; a verification never passes quietly past one. */
export const verificationFaults = (
  input: MobileCVerificationInput,
): readonly MobileCVerificationFault[] => {
  const { prepared, receipt, report, planFile, expectedPlanFile } = input;
  const faults: MobileCVerificationFault[] = [];
  if (prepared.byteLength !== receipt.byteLength) {
    faults.push('byte-length-mismatch');
  }
  if (prepared.sha256 !== receipt.sha256) {
    faults.push('digest-mismatch');
  }
  if (prepared.artifactId !== receipt.artifactId || report.artifactId !== receipt.artifactId) {
    faults.push('artifact-identity-mismatch');
  }
  if (!isMobileCFormat(report)) {
    faults.push('format-version-mismatch');
  }
  if (
    planFile.artifactId !== expectedPlanFile.artifactId ||
    planFile.sha256 !== expectedPlanFile.sha256 ||
    planFile.byteLength !== expectedPlanFile.byteLength
  ) {
    faults.push('plan-reference-mismatch');
  }
  if (parseMobileCFileName(receipt.actualFileName) === null) {
    faults.push('file-name-not-portable');
  }
  if (receipt.verification !== 'native-selected-file-byte-match') {
    faults.push('verification-method-unrecognised');
  }
  return faults;
};

export const assessVerification = (input: MobileCVerificationInput): MobileCDecision => {
  const faults = verificationFaults(input);
  return faults.length === 0
    ? decide('pass', 'saved file matches the prepared bytes, identity and plan reference')
    : decide('fail', `verification rejected: ${faults.join(', ')}`);
};

/**
 * Export handoff NEVER authorizes buffer release: only a verified receipt does. A cancelled or
 * failed handoff is likewise not a release, and 'handed-off' alone is not verification.
 */
export const handoffAuthorizesRelease = (_transport: MobileCTransport): false => false;

export const releaseAuthorized = (
  transport: MobileCTransport,
  verification: MobileCDecision,
): boolean => transport.handoff === 'handed-off' && isPass(verification);

export const nextControlState = (
  current: MobileCControlState,
  transport: MobileCTransport,
  verification: MobileCDecision,
): MobileCControlState => {
  if (current !== 'prepared' && current !== 'awaiting-verification') {
    return current;
  }
  if (transport.handoff !== 'handed-off') {
    return 'prepared';
  }
  return isPass(verification) ? 'released' : 'awaiting-verification';
};
