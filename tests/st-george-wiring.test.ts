// tests/st-george-wiring.test.ts
// The DECISION-1 step-3 pins (the vault record
// 03-1_projects/hermitage-3d-2026-11-26-new-room/round-1/DECISION-1.md, PINS P1–P6, P8, P10,
// with the round-2 amendments): they PIN the committed wiring, they probe nothing. P10 is the
// lane's diff-scope fence — it retires at the merge (the integrating authority owns the tree
// afterwards). P6 is conditional on the room manifest existing: the bake lands separately (the
// all-or-nothing manifest law, step 2 part 1), so the pin skips loud until then — never faked.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contract as militaryContract } from '../rooms/1812/contract';
import { AIRLOCKS, ENTRIES } from '../rooms/index';
import { contract as georgeContract } from '../rooms/st-george/contract';
import { indexRows } from '../src/ui/room-index';
import type { Bounds, Vec3 } from '../src/world/registry';
import {
  airlockEntering,
  nextAirlockOnPath,
  resolveRoute,
  validateRegistry,
} from '../src/world/registry';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const roomEntries = ENTRIES.filter((e) => e.kind === 'room');

const inside = (p: Vec3, b: Bounds): boolean =>
  p[0] >= b.min[0] &&
  p[0] <= b.max[0] &&
  p[1] >= b.min[1] &&
  p[1] <= b.max[1] &&
  p[2] >= b.min[2] &&
  p[2] <= b.max[2];

describe('P1 — the registry fences clean; the graph is one chain', () => {
  it('validates with zero issues', () => {
    expect(validateRegistry(ENTRIES, AIRLOCKS)).toEqual([]);
  });
  it('is exactly the chain square → rastrelli-gallery → jordan → military-gallery → st-george', () => {
    expect(ENTRIES.map((e) => e.id)).toEqual([
      'square',
      'rastrelli-gallery',
      'jordan',
      'military-gallery',
      'st-george',
    ]);
    const handles = ENTRIES.map((e) => e.id);
    for (let i = 0; i + 1 < handles.length; i += 1) {
      const from = handles[i];
      const to = handles[i + 1];
      if (from === undefined || to === undefined) throw new Error('fixture: missing handle');
      const def = nextAirlockOnPath(ENTRIES, AIRLOCKS, from, to);
      expect(def, `${from} → ${to}`).not.toBeNull();
      const pair = [def?.from, def?.to];
      expect(pair).toContain(from);
      expect(pair).toContain(to);
    }
  });
});

describe('P2 — the throne-airlock joins exactly two contracts, each naming the other', () => {
  it('appears in exactly military-gallery and st-george neighbors', () => {
    const naming = roomEntries.filter(
      (e) => e.kind === 'room' && e.contract.neighbors.some((n) => n.airlock === 'throne-airlock'),
    );
    expect(naming.map((e) => e.id).sort()).toEqual(['military-gallery', 'st-george']);
    expect(militaryContract.neighbors).toContainEqual({
      to: 'st-george',
      airlock: 'throne-airlock',
    });
    expect(georgeContract.neighbors).toContainEqual({
      to: 'military-gallery',
      airlock: 'throne-airlock',
    });
  });
});

describe('P3 — five stops H0…H4 on one axis; every gaze east', () => {
  const { stops } = georgeContract.rail;
  const { bounds } = georgeContract;
  it('is exactly H0…H4 in order, x strictly increasing, one shared y and z', () => {
    expect(stops.map((s) => s.id)).toEqual(['H0', 'H1', 'H2', 'H3', 'H4']);
    const xs = stops.map((s) => s.position[0]);
    for (let i = 0; i + 1 < xs.length; i += 1) {
      const a = xs[i];
      const b = xs[i + 1];
      if (a === undefined || b === undefined) throw new Error(`fixture: missing x at ${i}`);
      expect(a < b, `x ${String(a)} < ${String(b)}`).toBe(true);
    }
    expect(new Set(stops.map((s) => s.position[1])).size).toBe(1);
    expect(new Set(stops.map((s) => s.position[2])).size).toBe(1);
  });
  it('keeps every position and subject inside bounds; every subject east of its stop', () => {
    for (const stop of stops) {
      expect(inside(stop.position, bounds), `${stop.id} position`).toBe(true);
      expect(stop.subject, `${stop.id} has an authored subject`).not.toBeNull();
      if (stop.subject === null) continue;
      expect(inside(stop.subject, bounds), `${stop.id} subject`).toBe(true);
      expect(stop.subject[0], `${stop.id} subject east`).toBeGreaterThan(stop.position[0]);
    }
  });
});

describe('P4 — the portal boxes enclose their stops; the 2×2×3 convention; hold 800', () => {
  const def = AIRLOCKS.find((a) => a.id === 'throne-airlock');
  if (def === undefined) throw new Error('fixture: the throne-airlock def is missing');
  const portalTo = def.portalTo;
  if (portalTo === null) throw new Error('fixture: the throne-airlock has no far portal');
  it('portalTo encloses H0; portalFrom encloses M4 (read from the committed 1812 contract)', () => {
    const h0 = georgeContract.rail.stops[0];
    expect(h0?.id).toBe('H0');
    const m4 = militaryContract.rail.stops.find((s) => s.id === 'M4');
    expect(m4).toBeDefined();
    expect(inside(h0?.position ?? [0, 0, 0], portalTo), 'portalTo ∋ H0').toBe(true);
    expect(inside(m4?.position ?? [0, 0, 0], def.portalFrom), 'portalFrom ∋ M4').toBe(true);
  });
  it('both boxes are 2 × 2 × 3 m and the hold is 800 ms', () => {
    for (const box of [def.portalFrom, portalTo]) {
      const [dx, dy, dz] = [
        box.max[0] - box.min[0],
        box.max[1] - box.min[1],
        box.max[2] - box.min[2],
      ];
      expect([dx, dy, dz], '2 × 3 × 2 m (x, y, z)').toEqual([2, 3, 2]);
    }
    expect(def.holdMs).toBe(800);
  });
  it('ships the capture-owned transit kind: cut (the M4-departure capture verdict)', () => {
    expect(def.transit).toBe('cut');
  });
});

describe('P5 — the hall bounds intersect no other room’s bounds', () => {
  it('is disjoint from the committed rooms', () => {
    const disjoint = (a: Bounds, b: Bounds): boolean =>
      a.max[0] < b.min[0] ||
      b.max[0] < a.min[0] ||
      a.max[1] < b.min[1] ||
      b.max[1] < a.min[1] ||
      a.max[2] < b.min[2] ||
      b.max[2] < a.min[2];
    for (const entry of roomEntries) {
      if (entry.kind !== 'room' || entry.id === 'st-george') continue;
      expect(
        disjoint(georgeContract.bounds, entry.contract.bounds),
        `st-george vs ${entry.id}`,
      ).toBe(true);
    }
  });
});

describe('P6 — the manifest mirrors the contract (DEFERRED until the bake lands)', () => {
  const manifestPath = join(ROOT, 'public', 'assets', 'st-george', 'manifest.json');
  const manifestExists = existsSync(manifestPath);
  const d = manifestExists ? it : it.skip;
  d('budget equals the contract budget; sha256 rows revalidate; states, res, intensity', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files: readonly { path: string; bytes: number; sha256: string; kind: string }[];
      lightmaps: {
        states: readonly string[];
        res: number | null;
        intensity: Record<string, number> | null;
      };
      budget: Record<string, number>;
    };
    expect(manifest.budget).toEqual(georgeContract.budget);
    for (const row of manifest.files) {
      const bytes = readFileSync(join(ROOT, 'public', 'assets', 'st-george', row.path));
      expect(bytes.length, row.path).toBe(row.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), row.path).toBe(row.sha256);
    }
    expect(manifest.lightmaps.states).toEqual(['day', 'dusk', 'nightChandeliers']);
    expect(manifest.lightmaps.res).toBe(1024); // the step-3 shell; 2048 from step 5
    const intensity = manifest.lightmaps.intensity;
    expect(intensity).not.toBeNull();
    for (const state of ['day', 'dusk', 'nightChandeliers']) {
      const v = intensity?.[state];
      expect(typeof v === 'number' && Number.isFinite(v) && v > 0, `intensity.${state}`).toBe(true);
    }
  });
});

describe('P8 — the cold entry, the arriving airlock, the seed stop, the «Залы» index', () => {
  it('a cold entry at #/throne resolves to st-george with zero issues', () => {
    expect(resolveRoute(ENTRIES, '#/throne')).toEqual({
      node: 'st-george',
      route: '/throne',
      issues: [],
    });
  });
  it('the cold entry arrives through the throne-airlock and lands on the entry stop H0', () => {
    expect(airlockEntering(AIRLOCKS, 'st-george')?.id).toBe('throne-airlock');
    expect(georgeContract.rail.stops[0]?.id).toBe('H0');
  });
  it('the «Залы» index lists the room (the registry is the index)', () => {
    const rows = indexRows(ENTRIES, null);
    expect(rows.map((r) => r.route)).toContain('/throne');
    const row = rows.find((r) => r.route === '/throne');
    expect(row?.titleKey).toBe('data.titleStGeorge');
    expect(row?.node).toBe('st-george');
  });
  // The browser half of P8 (the smoke walk crossing the airlock both ways with the ledger
  // back at boot) is the committed e2e battery's contract — it rides the merge gate, not
  // this node battery.
});

describe('P10 — the lane’s diff-scope fence (retires at the merge)', () => {
  // The lane fence (the record's P10): nothing under src/engine/; rooms/jordan/,
  // rooms/rastrelli-gallery/, their assets, and the 1812 module and assets byte-identical;
  // registry.ts widened on the union lines only. The census misses the record's FILES list
  // named: src/world/prefetch.ts ROOM_IDS (noteManifest throws on the hall's manifest — the
  // load path), src/main.ts RAIL_CHAIN (the walk's boundary chain — M4 was inert without it),
  // and the typecheck-mandatory INTERIOR_LOOK_GAIN row (Record<RoomId, …>). All three are
  // one-line widenings of "the list's data" (DECISION-1, amendment 10); the protected rooms
  // stay byte-identical either way. The diff base is the LANE's start commit (d38cec0, the
  // branch point) — cumulative over every landed step plus the working tree, so the fence
  // holds at review time AND at the merge, where a working-tree status pin would be empty.
  const ALLOWED = [
    /^src\/world\/registry\.ts$/,
    /^src\/world\/prefetch\.ts$/,
    /^src\/content\/lightmap-look\.ts$/,
    /^src\/main\.ts$/,
    /^src\/i18n\/(keys|en|ru)\.ts$/,
    /^rooms\/index\.ts$/,
    /^rooms\/1812\/contract\.ts$/,
    /^rooms\/st-george\//,
    /^tests\/st-george-wiring\.test\.ts$/,
    /^tests\/st-george-law\.test\.ts$/,
    /^tests\/rooms-registry\.test\.ts$/,
    /^tests\/room-index\.test\.ts$/,
    /^tests\/lightmap-look\.test\.ts$/,
    // the asset chain's own lane files (the record's FILES block + amendment 7's rows)
    /^tools\/st-george\//,
    /^tools\/bake-logs\/st-george/,
    /^tools\/bpy\/st-george/,
    /^tools\/bpy\/plate-raster\.mjs$/,
    /^tools\/bpy\/bake\.py$/,
    /^tools\/bake\.mjs$/,
    /^tools\/gltf\/st-george\.mjs$/,
    /^public\/assets\/st-george\//,
    /^\.gitignore$/,
    /^biome\.json$/,
    /^package\.json$/,
    /^docs\/STATE\.md$/,
  ];
  const FORBIDDEN = [
    /^src\/engine\//,
    /^rooms\/jordan\//,
    /^rooms\/rastrelli-gallery\//,
    /^public\/assets\/jordan\//,
    /^public\/assets\/rastrelli-gallery\//,
    /^public\/assets\/military-gallery\//,
    /^rooms\/1812\/room\.ts$/,
  ];
  it('every changed or added path is inside the lane’s allowlist', () => {
    const head = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (head === 'main') {
      // retired: the merge happened, the integrating authority owns the tree (the fence's
      // own law) — the lane's cumulative diff is main's history now.
      return;
    }
    const paths = execFileSync('git', ['diff', '--name-only', 'd38cec0'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((line) => line.length > 0)
      .concat(
        execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
          cwd: ROOT,
          encoding: 'utf8',
        })
          .split('\n')
          .filter((line) => line.length > 0),
      );
    expect(paths.length, 'the lane has changes to pin').toBeGreaterThan(0);
    for (const p of paths) {
      expect(
        ALLOWED.some((re) => re.test(p)),
        `changed path ${p} is inside the step-3 scope`,
      ).toBe(true);
      expect(
        FORBIDDEN.some((re) => re.test(p)),
        `protected path ${p} is untouched`,
      ).toBe(false);
    }
  });
  it('registry.ts’s diff touches only the union lines', () => {
    const diff = execFileSync('git', ['diff', 'd38cec0', '--', 'src/world/registry.ts'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const changed = diff
      .split('\n')
      .filter(
        (l) =>
          (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'),
      )
      .map((l) => l.slice(1).trim());
    expect(changed.length, 'the unions are the only change').toBeGreaterThan(0);
    for (const line of changed) {
      expect(
        /^export type (RoomId|AirlockId|RouteKey)/.test(line) || /^\| '/.test(line) || line === ';',
        `a union line only, got: ${line.slice(0, 60)}`,
      ).toBe(true);
    }
  });
});
