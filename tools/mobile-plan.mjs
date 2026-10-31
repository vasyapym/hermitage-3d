// tools/mobile-plan.mjs
/**
 * The §18.2/§19.7–8 plan generator (design-mobile-tier.md §19 Phase B, steps 7–8): one
 * deterministic UTF-8 JSON file carrying the `MobileCPlanV1` VALUE, derived from the
 * COMMITTED room/stop/airlock inventory. The tool invents no room name, no market or SoC
 * name, no epoch parameter and no route path: every name comes from the committed registry
 * (rooms/index.ts + src/camera/square-rail.ts) and the pinned §(2)/§(4)/§(5) orchestrator
 * calls quoted in the mobile-c brief.
 *
 * Usage:
 *   node tools/mobile-plan.mjs --frozen-at 2026-11-01T09:00:00Z [--out <path>]
 *                              [--check] [--bundle-sha256 <hex>] [--build-id <text>]
 *
 * - `--frozen-at <ISO instant>` is REQUIRED: the plan's `frozenAtUtc` comes ONLY from the
 *   argument, so re-running with the same arguments reproduces byte-identical output. The
 *   --check mode generates TWICE and compares both serializations byte for byte; a
 *   pre-existing --out file is compared too, never rewritten.
 * - `--out <path>` defaults to dist/h3d-mobile-c_v1_<planId>_all_plan_<artifactId>.json.
 * - The device ids stay generic (`device-android`, `device-iphone`) with labels marked
 *   «adoption pending» — the generator invents NO market or SoC names (§19 Phase A: the
 *   Android identity/SoC verification is a pending owner decision).
 * - ADAPTATION (disclosed): this box runs node ≥ 24 (v24.15) with TS type-stripping
 *   default-on, but native stripping does NOT resolve extensionless imports — the committed
 *   registry's `./room/contract` / `./mobile-report` specifiers would fail. The
 *   module.registerHooks resolver below maps extensionless relative specifiers onto their
 *   .ts files in-file; no committed source file changes.
 * - The produced plan self-validates against the committed §18.2 validator
 *   (planValidationFaults) before anything is written or printed.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// The in-file resolution bootstrap (the disclosed adaptation, above).
// ---------------------------------------------------------------------------

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.')) {
        for (const suffix of ['.ts', '/index.ts']) {
          try {
            return nextResolve(specifier + suffix, context);
          } catch {
            // try the next suffix
          }
        }
      }
      throw error;
    }
  },
});

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// ---------------------------------------------------------------------------
// CLI arguments.
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const frozenAt = readArg('--frozen-at');
const outArg = readArg('--out');
const checkMode = args.includes('--check');
const bundleSha256 = readArg('--bundle-sha256') ?? '';
const buildIdArg = readArg('--build-id');

if (frozenAt === undefined || frozenAt === '') {
  console.error(
    'mobile-plan: --frozen-at <ISO instant> is required (the plan freezes its instant only from the argument)',
  );
  process.exit(1);
}
const frozenAtMs = Date.parse(frozenAt);
if (Number.isNaN(frozenAtMs)) {
  console.error(`mobile-plan: --frozen-at "${frozenAt}" is not an ISO instant`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The committed registry, imported through the type-stripping bootstrap (module-level:
// the imports are deterministic over the committed tree).
// ---------------------------------------------------------------------------

const roomsIndex = await import(pathToFileURL(join(repoRoot, 'rooms', 'index.ts')).href);
const squareRailModule = await import(
  pathToFileURL(join(repoRoot, 'src', 'camera', 'square-rail.ts')).href
);
const { AIRLOCKS, ENTRIES } = roomsIndex;
const { SQUARE_RAIL } = squareRailModule;
const {
  MOBILE_FRAME_WINDOW_MS,
  MOBILE_FRAME_P95_MS,
  MOBILE_FRAME_P99_MS,
  MOBILE_LONG_TASK_MS,
  MOBILE_CAPTURE_REPEATS,
  MOBILE_FIRST_EXTERIOR_MS,
  MOBILE_SOAK_MS,
  planValidationFaults,
} = await import(pathToFileURL(join(repoRoot, 'src', 'perf', 'mobile-capture.ts')).href);

const roomEntries = ENTRIES.filter((entry) => entry.kind === 'room');
const roomIds = roomEntries.map((entry) => entry.id);
for (const def of AIRLOCKS) {
  if (def.to === null) {
    throw new Error(
      `mobile-plan: the committed airlock ${def.id} is a dead end (the §(4) mapping expects a directed chain)`,
    );
  }
}
const firstStopOf = (nodeId) => {
  // The committed rail-derived endpoint laws (§(4) pin): fromStopId = the departure node's
  // terminal stop, toStopId = the landing node's entry stop (rooms first, the square's S0).
  const stops =
    nodeId === 'square'
      ? SQUARE_RAIL.stops
      : roomEntries.find((entry) => entry.id === nodeId)?.contract.rail.stops;
  if (stops === undefined || stops.length === 0)
    throw new Error(`mobile-plan: unknown node ${nodeId}`);
  return stops[0].id;
};
const lastStopOf = (nodeId) => {
  const stops =
    nodeId === 'square'
      ? SQUARE_RAIL.stops
      : roomEntries.find((entry) => entry.id === nodeId)?.contract.rail.stops;
  if (stops === undefined || stops.length === 0)
    throw new Error(`mobile-plan: unknown node ${nodeId}`);
  return stops[stops.length - 1].id;
};

const baselineIntent = {
  kind: 'room-baseline',
  httpAssets: 'warm',
  decodedAssets: {
    state: 'not-applicable',
    reason: 'the room-baseline intent does not predeclare decode state',
  },
  destinationReady: {
    state: 'not-applicable',
    reason: 'readiness is recorded by the attempt, never inferred',
  },
  description: '§18.2 room slot',
};
const coldIntent = (slotId) => ({
  kind: 'cold-unprepared-destination',
  httpAssets: 'cold',
  decodedAssets: { state: 'known', value: 'cold', evidenceIds: [] },
  destinationReady: { state: 'known', value: false, evidenceIds: [] },
  description: `${slotId}: the slot enters a demonstrably unprepared destination with cold destination assets (§18.2)`,
});
const warmIntent = (slotId) => ({
  kind: 'warm-destination',
  httpAssets: 'warm',
  decodedAssets: {
    state: 'pending',
    reason: 'decoded warmth comes from the visited preparation',
    nextAction: 'record decode state at slot entry',
  },
  destinationReady: {
    state: 'pending',
    reason: 'warm HTTP assets do not imply a resident or ready room',
    nextAction: 'record readiness by observation',
  },
  description: `${slotId}: the slot rides warmed destination assets (§18.2)`,
});
const coldNavigationIntent = {
  kind: 'cold-navigation',
  httpAssets: 'cold',
  decodedAssets: { state: 'known', value: 'cold', evidenceIds: [] },
  destinationReady: { state: 'known', value: false, evidenceIds: [] },
  description: '§18.2/§18.7: the cold navigation probe carries no warmed state',
};

// ---------------------------------------------------------------------------
// The generator: a pure function of the arguments over the committed tree. The
// --check mode calls it twice and demands byte-identical serializations.
// ---------------------------------------------------------------------------

const generatePlan = () => {
  let commit = '';
  let dirty = false;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim();
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot }).toString();
    dirty = status.trim().length > 0;
  } catch (error) {
    throw new Error(
      `mobile-plan: the git identity read failed — the §18.9 build block needs the committed HEAD (${error.message})`,
    );
  }

  const portable = (text) => text.replace(/[^A-Za-z0-9_-]/g, '-');
  const planId = `plan-${portable(frozenAt)}`;
  const artifactId = `art-${portable(frozenAt)}`;

  const rooms = [
    { id: 'square', stopIds: SQUARE_RAIL.stops.map((stop) => stop.id) },
    ...roomEntries.map((entry) => ({
      id: entry.id,
      stopIds: entry.contract.rail.stops.map((stop) => stop.id),
    })),
  ];
  const stops = rooms.flatMap((room) =>
    room.stopIds.map((stopId) => ({ id: stopId, roomId: room.id })),
  );
  const committed = {
    commit,
    rooms,
    airlocks: AIRLOCKS.map((def) => ({ id: def.id, from: def.from, to: def.to })),
  };

  const directedAirlocks = [
    ...committed.airlocks.map((pair) => ({
      id: `dir-${pair.id}-from-${pair.from}`,
      airlockId: pair.id,
      fromRoomId: pair.from,
      toRoomId: pair.to,
      fromStopId: lastStopOf(pair.from),
      toStopId: firstStopOf(pair.to),
    })),
    ...roomIds.map((roomId) => ({
      id: `dir-index-square-cut-from-${roomId}`,
      airlockId: 'index-square-cut',
      fromRoomId: roomId,
      toRoomId: 'square',
      fromStopId: lastStopOf(roomId),
      toStopId: firstStopOf('square'),
    })),
  ];

  const THIRDS = [
    { third: 1, activity: 'resting', startOffsetMs: 0, endOffsetMs: MOBILE_FRAME_WINDOW_MS / 3 },
    {
      third: 2,
      activity: 'looking',
      startOffsetMs: MOBILE_FRAME_WINDOW_MS / 3,
      endOffsetMs: (MOBILE_FRAME_WINDOW_MS / 3) * 2,
    },
    {
      third: 3,
      activity: 'stepping',
      startOffsetMs: (MOBILE_FRAME_WINDOW_MS / 3) * 2,
      endOffsetMs: MOBILE_FRAME_WINDOW_MS,
    },
  ];

  const devices = [
    {
      id: 'device-android',
      label: 'Android phone — identity/SoC adoption pending (§10; §19 Phase A)',
      physicalPhone: true,
    },
    {
      id: 'device-iphone',
      label: 'iPhone — owner identification pending (§10; §19 Phase A)',
      physicalPhone: true,
    },
  ];
  const selections = ['clean-profile-auto', 'explicit-q=t0'];
  const epochs = ['2026-06-21T12:00:00Z', '2026-01-15T10:00:00Z', '2026-01-15T18:00:00Z'];

  const scopes = devices.flatMap((device) =>
    selections.flatMap((selection) =>
      epochs.map((epoch) => ({
        id: `scope-${portable(device.id)}-${portable(selection)}-${portable(epoch)}`,
        deviceId: device.id,
        selection,
        epoch,
        // §(5): the exact committed ?at= values; ?q= rides the entry for the explicit tier
        // override; det stays ABSENT (§10: det OFF for captures).
        entryLocation: selection === 'explicit-q=t0' ? `#/?q=t0&at=${epoch}` : `#/?at=${epoch}`,
        epochMechanism:
          'the committed ?at= selector (URLSearchParams getAll via queryOf); det stays absent (§10)',
        epochInputs: [{ name: 'at', value: epoch }],
        evidenceIds: [],
      })),
    ),
  );

  const itineraries = roomEntries.map((entry) => ({
    id: `it-${entry.id}`,
    roomId: entry.id,
    stopIdsInOrder: entry.contract.rail.stops.map((stop) => stop.id),
    legality: {
      status: 'pending',
      reason:
        'the §18.2 legal intra-room stepping order derives from the room committed rail stop order; the registry does not model intra-room legs (the derivations are flagged, §19.7)',
      evidenceIds: [],
    },
  }));

  const sentinelRoom = roomIds[0];
  const scenarios = [];
  const slots = [];
  for (const scope of scopes) {
    for (const roomId of roomIds) {
      const scenarioId = `sc-room-${scope.id}-${roomId}`;
      const sentinel = roomId === sentinelRoom;
      scenarios.push({
        id: scenarioId,
        scopeId: scope.id,
        target: { kind: 'room', roomId, itineraryId: `it-${roomId}`, sentinel },
      });
      for (const repeat of [1, 2, 3]) {
        const baseId = `${scenarioId}-slot-r${repeat}`;
        if (sentinel && repeat === 3) {
          // §18.2: the separately planned visibility-interruption probe immediately before
          // the sentinel resume slot; its expected outcome is invalidation.
          slots.push({
            id: `${baseId}-probe`,
            scenarioId,
            repeat: 3,
            gate: 'expected-invalidation',
            thirds: THIRDS.map((third) => ({ ...third })),
            cacheIntent: {
              ...baselineIntent,
              description: 'the §18.2 visibility-interruption probe rides the baseline room intent',
            },
            baselineOrientation: 'portrait',
            manipulations: ['visibility-interruption'],
            postSoakRequired: true,
            precedingProbeSlotId: {
              state: 'not-applicable',
              reason: 'a probe precedes, never follows, a floor window',
            },
            parentFrameSlotId: { state: 'known', value: baseId, evidenceIds: [] },
          });
        }
        const manipulations =
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
          thirds: THIRDS.map((third) => ({ ...third })),
          cacheIntent: baselineIntent,
          baselineOrientation: sentinel && repeat === 1 ? 'landscape' : 'portrait',
          manipulations,
          postSoakRequired: repeat === 3,
          precedingProbeSlotId:
            sentinel && repeat === 3
              ? { state: 'known', value: `${baseId}-probe`, evidenceIds: [] }
              : { state: 'not-applicable', reason: 'no probe precedes this slot' },
          parentFrameSlotId: { state: 'not-applicable', reason: 'a floor slot has no parent' },
        });
      }
    }
    for (const entry of directedAirlocks) {
      // §18.2: one designated transit immediately after capture admission; repeat 1 is cold
      // and unprepared, repeats 2–3 ride warmed destination assets.
      const scenarioId = `sc-airlock-${entry.id}-${scope.id}`;
      scenarios.push({
        id: scenarioId,
        scopeId: scope.id,
        target: { kind: 'directed-airlock', directedAirlockId: entry.id },
      });
      for (const repeat of [1, 2, 3]) {
        slots.push({
          id: `${scenarioId}-slot-r${repeat}`,
          scenarioId,
          repeat,
          gate: 'frame-floor',
          thirds: THIRDS.map((third) => ({ ...third })),
          cacheIntent: repeat === 1 ? coldIntent(scenarioId) : warmIntent(scenarioId),
          baselineOrientation: 'portrait',
          manipulations: [],
          postSoakRequired: repeat === 3,
          precedingProbeSlotId: { state: 'not-applicable', reason: 'no probe precedes this slot' },
          parentFrameSlotId: { state: 'not-applicable', reason: 'a floor slot has no parent' },
        });
      }
    }
    const exteriorScenarioId = `sc-first-exterior-${scope.id}`;
    scenarios.push({
      id: exteriorScenarioId,
      scopeId: scope.id,
      target: { kind: 'first-exterior', exteriorRoomId: 'square' },
    });
    for (const repeat of [1, 2, 3]) {
      // §18.2: three cold navigations per device × selection × epoch, the third post-soak;
      // these are separate navigation scenarios, never 60-second frame windows.
      slots.push({
        id: `${exteriorScenarioId}-slot-r${repeat}`,
        scenarioId: exteriorScenarioId,
        repeat,
        gate: 'first-exterior',
        thirds: [],
        cacheIntent: coldNavigationIntent,
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

  // The §(2)/§(3) limits pin — the seven constants arrive from the capture module (the
  // first-declaration authorization: the plan generator imports them from there); the
  // ratification stays pending with the quoted reason and NO nextAction field.
  const limits = {
    frameWindowMs: MOBILE_FRAME_WINDOW_MS,
    p95Ms: MOBILE_FRAME_P95_MS,
    p99Ms: MOBILE_FRAME_P99_MS,
    longTaskMs: MOBILE_LONG_TASK_MS,
    repeats: MOBILE_CAPTURE_REPEATS,
    firstExteriorMs: MOBILE_FIRST_EXTERIOR_MS,
    soakMs: MOBILE_SOAK_MS,
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
  };

  const evidence = [];
  for (const cited of [
    { id: 'evidence-committed-registry', fileName: 'rooms/index.ts' },
    { id: 'evidence-committed-square-rail', fileName: 'src/camera/square-rail.ts' },
    { id: 'evidence-committed-epoch-mechanism', fileName: 'src/sky/time.ts' },
    { id: 'evidence-committed-tier-override', fileName: 'src/engine/tier.ts' },
  ]) {
    const bytes = readFileSync(join(repoRoot, cited.fileName));
    evidence.push({
      id: cited.id,
      source: 'host',
      artifactId,
      locator: `${cited.fileName} (the committed source the plan derives from; digested at plan-authoring time)`,
      file: {
        state: 'known',
        value: {
          artifactId,
          fileName: cited.fileName,
          byteLength: bytes.byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
        evidenceIds: [],
      },
      description: `the committed file the inventory/scenario derivation reads (${cited.fileName})`,
    });
  }

  const plan = {
    id: planId,
    frozenAtUtc: frozenAt,
    build: {
      commit,
      buildId: buildIdArg ?? `author-${commit}${dirty ? '-dirty' : ''}`,
      bundleSha256,
      dirty,
      perfLog: true,
    },
    devices,
    scopes,
    inventory: {
      commit,
      rooms,
      stops,
      directedAirlocks,
      evidenceIds: evidence.map((row) => row.id),
    },
    itineraries,
    scenarios,
    slots,
    limits,
    evidence,
  };

  // The §19.7 self-check: the plan validates against the committed §18.2 validator.
  const faults = planValidationFaults(plan, committed);
  if (faults.length > 0) {
    const detail = faults.map((fault) => `${fault.code}: ${fault.detail}`).join('; ');
    throw new Error(
      `mobile-plan: the generated plan fails the committed §18.2 validation — ${detail}`,
    );
  }

  const json = `${JSON.stringify(plan, null, 2)}\n`;
  const bytes = Buffer.from(json, 'utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const outPath = resolve(
    outArg ?? join(repoRoot, 'dist', `h3d-mobile-c_v1_${planId}_all_plan_${artifactId}.json`),
  );
  return {
    plan,
    bytes,
    sha256,
    outPath,
    id: planId,
    artifactId,
    scopes: scopes.length,
    scenarios: scenarios.length,
    slots: slots.length,
  };
};

try {
  const first = generatePlan();
  if (checkMode) {
    const second = generatePlan();
    if (!second.bytes.equals(first.bytes)) {
      console.error(
        'mobile-plan: the re-run generation is NOT byte-identical — determinism broken',
      );
      process.exit(1);
    }
    try {
      const existing = readFileSync(first.outPath);
      if (!existing.equals(first.bytes)) {
        console.error(
          `mobile-plan: the existing file ${first.outPath} differs from the re-run generation`,
        );
        process.exit(1);
      }
      console.log(
        `mobile-plan: check — re-run byte-identical, existing file matches (${first.bytes.length} bytes, sha256 ${first.sha256})`,
      );
    } catch {
      console.log(
        `mobile-plan: check — re-run byte-identical (${first.bytes.length} bytes, sha256 ${first.sha256}); no existing file at ${first.outPath} to compare`,
      );
    }
  } else {
    mkdirSync(dirname(first.outPath), { recursive: true });
    writeFileSync(first.outPath, first.bytes);
    console.log(
      `mobile-plan: wrote ${first.outPath} (${first.bytes.length} bytes, sha256 ${first.sha256})`,
    );
  }
  console.log(
    `mobile-plan: planId ${first.id}, artifactId ${first.artifactId}, scopes ${first.scopes}, scenarios ${first.scenarios}, slots ${first.slots}`,
  );
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
