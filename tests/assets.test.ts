/// <reference types="node" />
// Asset-chain fence — design-staircase.md §3.2 rule 5. Validates COMMITTED artifacts only:
// manifest contract, bytes + sha256 recompute, GLB/KTX2 markers, declared caps, payload-budget rows.
// Blender, toktx and gltf-transform never run here.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';

// The cache-law tests below run the loaders in node: the KTX2 transcoder and the meshopt
// worker pool are replaced by fakes — the law under test is the CACHE's, not basis-universal's.
// Each parse resolves a FRESH fake texture, so the single-use staging law is observable.
vi.mock('three/examples/jsm/loaders/KTX2Loader.js', () => {
  let parsed = 0;
  class FakeKTX2Loader {
    setTranscoderPath(): FakeKTX2Loader {
      return this;
    }
    setWorkerLimit(): FakeKTX2Loader {
      return this;
    }
    detectSupport(): FakeKTX2Loader {
      return this;
    }
    parse(
      _bytes: unknown,
      onLoad: (texture: unknown) => void,
      _onError?: (error: unknown) => void,
    ): void {
      parsed += 1;
      onLoad({ isTexture: true, name: `fake/${parsed}` });
    }
    dispose(): void {}
  }
  return { KTX2Loader: FakeKTX2Loader };
});
vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: { useWorkers: () => undefined },
}));

type FileRow = { path: string; bytes: number; sha256: string; kind: 'glb' | 'ktx2' | 'manifest' };
type Geometry = {
  meshes: { name: string; instances: number; primitives: number; triangles: number }[];
  trianglesUnique: number;
  trianglesDrawn: number;
  extensionsRequired: string[];
};
type Manifest = {
  id: string;
  files: FileRow[];
  geometry: Geometry;
  lightmaps: { states: string[]; res: number | null; intensity: Record<string, number> | null };
  budget: { trianglesMax: number; textureBytesMax: number; payloadBytesMax: number };
  toolchain: Record<'blender' | 'toktx' | 'gltfTransformCli' | 'three', string>;
};
type GltfJson = {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  buffers?: { uri?: string; byteLength: number }[];
  images?: { uri?: string; mimeType?: string }[];
  textures?: { source?: number; extensions?: Record<string, unknown> }[];
  meshes: { name?: string; primitives: { attributes: Record<string, number> }[] }[];
};
type PayloadRow = {
  id: string;
  row: 'room' | 'exterior' | 'shared';
  bytes: number;
  cap: number;
  ok: boolean;
  error?: string;
};
type Common = {
  PLACEHOLDER: RegExp;
  KTX2_MAGIC: Uint8Array;
  ROOM_CAP_MAX: number;
  parseGlbJson: (buf: Buffer) => GltfJson;
  geometrySummary: (json: GltfJson) => Geometry;
  collectPayloadRows: (publicDir: string) => PayloadRow[];
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHECK_DIR = join(ROOT, 'public', 'assets', '_check');
const MANIFEST = join(CHECK_DIR, 'manifest.json');
const TOOLCHAIN_KEYS = ['blender', 'toktx', 'gltfTransformCli', 'three'] as const;
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));
const walk = (dir: string, base = dir): string[] =>
  readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory()
        ? walk(p, base)
        : [
            p
              .slice(base.length + 1)
              .split('\\')
              .join('/'),
          ];
    });

// Non-literal specifier: TS types it as any, so no declaration file is needed for the .mjs.
// Top-level await (not beforeAll): describe-scope consumers below run at collection time.
const common = (await import(join(ROOT, 'tools', 'common.mjs'))) as unknown as Common;

describe('tools/toolchain.json', () => {
  const tc = readJson(join(ROOT, 'tools', 'toolchain.json')) as Record<string, unknown>;
  it('has exactly the four pins as strings', () => {
    expect(Object.keys(tc).sort()).toEqual([...TOOLCHAIN_KEYS].sort());
    for (const k of TOOLCHAIN_KEYS) expect(typeof tc[k]).toBe('string');
  });
  it('pins three to the installed dependency', () => {
    const pkg = readJson(join(ROOT, 'package.json')) as { dependencies: Record<string, string> };
    expect(tc.three).toBe(pkg.dependencies.three);
  });
  it('blender and toktx are real versions, not placeholders', () => {
    expect(common.PLACEHOLDER.test(String(tc.blender))).toBe(false);
    expect(common.PLACEHOLDER.test(String(tc.toktx))).toBe(false);
  });
});

// Generic room fence: every committed room directory with a manifest (canary + real rooms)
// validates its contract rows, byte counts and sha256 recompute. Room-specific CONTENT assertions
// live in the canary block below.
const ROOMS_DIR = join(ROOT, 'public', 'assets');
const committedRooms = existsSync(ROOMS_DIR)
  ? readdirSync(ROOMS_DIR)
      .sort()
      .filter((n) => existsSync(join(ROOMS_DIR, n, 'manifest.json')))
  : [];

describe.each(committedRooms)('public/assets/%s (room contract)', (room) => {
  const dir = join(ROOMS_DIR, room);
  const manifest = readJson(join(dir, 'manifest.json')) as Manifest;
  it('manifest contract (§8.1): keys, id, lightmaps shape, budget shape', () => {
    expect(manifest.id).toBe(room);
    expect(Object.keys(manifest).sort()).toEqual([
      'budget',
      'files',
      'geometry',
      'id',
      'lightmaps',
      'toolchain',
    ]);
    // r17a all-or-nothing law: a lightmaps row either names exactly the three §4 states and
    // every named state's ktx2 is on disk, or (canary / not yet baked) the row is empty.
    // The empty-vs-filled check keeps both honest: no fourth state, no room with fewer.
    // r17c: `intensity` is the per-state white-point record (encode white point = runtime
    // restore scalar), one finite positive entry per state; null only in the empty branch.
    const STATES_ON_DISK = ['day', 'dusk', 'nightChandeliers'] as const;
    const FILE_BY_STATE: Record<string, string> = {
      day: 'day',
      dusk: 'dusk',
      nightChandeliers: 'night',
    };
    if (manifest.lightmaps.states.length === 0) {
      expect(manifest.lightmaps).toEqual({ states: [], res: null, intensity: null });
    } else {
      expect(manifest.lightmaps.states).toEqual(STATES_ON_DISK);
      expect(manifest.lightmaps.res).toBeGreaterThan(0);
      const intensity = manifest.lightmaps.intensity;
      expect(intensity, 'intensity record').not.toBeNull();
      expect(typeof intensity, 'intensity is an object').toBe('object');
      for (const state of STATES_ON_DISK) {
        const value = intensity?.[state] ?? Number.NaN;
        expect(Number.isFinite(value), `intensity.${state} finite`).toBe(true);
        expect(value, `intensity.${state} > 0`).toBeGreaterThan(0);
      }
      for (const state of STATES_ON_DISK) {
        expect(existsSync(join(dir, 'lm', `${FILE_BY_STATE[state]}.ktx2`)), state).toBe(true);
      }
      // R4 (design-gallery.md §4.6, D-7): the split's disk law — every lm row is the
      // architecture chart's <file>.ktx2 or the kit chart's kit-<file>.ktx2; the kit rows
      // are all-or-nothing (a state carries both charts or neither; a kit row never rides
      // alone). The kit res itself lives in tools/gallery/layout.json (D-7), not here.
      const lmRows = manifest.files.map((f) => f.path).filter((p) => p.startsWith('lm/'));
      for (const row of lmRows) {
        const base = row
          .slice('lm/'.length)
          .replace(/\.ktx2$/, '')
          .replace(/^kit-/, '');
        expect(
          ['day', 'dusk', 'night'].includes(base),
          `${row} is <file>.ktx2 or kit-<file>.ktx2`,
        ).toBe(true);
      }
      const kitRows = lmRows.filter((p) => p.includes('kit-'));
      if (kitRows.length > 0) {
        expect(
          kitRows.map((p) => p.slice('lm/kit-'.length).replace(/\.ktx2$/, '')).sort(),
          'kit rows all-or-nothing',
        ).toEqual(['day', 'dusk', 'night']);
      }
    }
    expect(manifest.budget.trianglesMax).toBeGreaterThan(0);
    expect(manifest.budget.textureBytesMax).toBeGreaterThan(0);
    expect(manifest.budget.payloadBytesMax).toBeGreaterThan(0);
    expect(manifest.budget.payloadBytesMax).toBeLessThanOrEqual(common.ROOM_CAP_MAX);
  });
  it('rows recompute to the committed bytes + sha256, sorted, no unlisted artifacts', () => {
    const onDisk = walk(dir).filter((p) => p !== 'manifest.json');
    expect(manifest.files.map((f) => f.path)).toEqual(onDisk);
    for (const f of manifest.files) {
      const buf = readFileSync(join(dir, f.path));
      expect(buf.length, f.path).toBe(f.bytes);
      expect(sha(buf), f.path).toBe(f.sha256);
    }
  });
  it('geometry summary matches the committed glb', () => {
    const glbRow = manifest.files.find((f) => f.kind === 'glb');
    const json = common.parseGlbJson(readFileSync(join(dir, glbRow?.path ?? '')));
    expect(common.geometrySummary(json)).toEqual(manifest.geometry);
  });
  it('single-buffer GLB (strict GLB rule)', () => {
    const glbRow = manifest.files.find((f) => f.kind === 'glb');
    const json = common.parseGlbJson(readFileSync(join(dir, glbRow?.path ?? '')));
    expect(json.buffers?.length).toBe(1);
    expect(json.buffers?.[0]?.uri).toBeUndefined();
  });
});

describe('public/assets/_check canary', () => {
  it('is committed (run pnpm asset once and commit public/assets/_check)', () => {
    expect(existsSync(MANIFEST)).toBe(true);
  });
  const manifest = existsSync(MANIFEST) ? (readJson(MANIFEST) as Manifest) : null;
  const only = describe.skipIf(manifest === null);

  only('manifest contract (§8.1)', () => {
    const m = manifest as Manifest;
    it('has id, files, geometry, lightmaps, budget, toolchain', () => {
      expect(m.id).toBe('_check');
      expect(Object.keys(m).sort()).toEqual([
        'budget',
        'files',
        'geometry',
        'id',
        'lightmaps',
        'toolchain',
      ]);
      expect(m.lightmaps).toEqual({ states: [], res: null, intensity: null });
      expect(m.budget).toEqual({
        trianglesMax: 5000,
        textureBytesMax: 500000,
        payloadBytesMax: 500000,
      });
    });
    it('rows are well-formed and sorted by path', () => {
      expect(m.files.length).toBeGreaterThanOrEqual(2);
      for (const f of m.files) {
        expect(['glb', 'ktx2']).toContain(f.kind);
        expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(Number.isInteger(f.bytes) && f.bytes > 0).toBe(true);
        expect(f.path.startsWith('/') || f.path.includes('..')).toBe(false);
      }
      expect(m.files.map((f) => f.path)).toEqual([...m.files.map((f) => f.path)].sort());
    });
    it('toolchain copies toolchain.json verbatim with no placeholders', () => {
      const tc = readJson(join(ROOT, 'tools', 'toolchain.json')) as Manifest['toolchain'];
      expect(m.toolchain).toEqual(tc);
      for (const k of TOOLCHAIN_KEYS) expect(common.PLACEHOLDER.test(m.toolchain[k])).toBe(false);
    });
  });

  only('determinism markers', () => {
    const m = manifest as Manifest;
    it('every row recomputes to the committed bytes + sha256', () => {
      for (const f of m.files) {
        const buf = readFileSync(join(CHECK_DIR, f.path));
        expect(buf.length, f.path).toBe(f.bytes);
        expect(sha(buf), f.path).toBe(f.sha256);
      }
    });
    it('no unlisted artifacts in the room directory', () => {
      const onDisk = walk(CHECK_DIR).filter((p) => p !== 'manifest.json');
      expect(onDisk).toEqual(m.files.map((f) => f.path));
    });
    it('ktx2 rows carry the KTX 2.0 magic', () => {
      for (const f of m.files.filter((r) => r.kind === 'ktx2')) {
        const head = readFileSync(join(CHECK_DIR, f.path)).subarray(0, 12);
        expect(Buffer.from(head).equals(Buffer.from(common.KTX2_MAGIC)), f.path).toBe(true);
      }
    });
  });

  only('glb conventions (rules 2-4)', () => {
    const m = manifest as Manifest;
    const glbRow = m.files.find((f) => f.kind === 'glb');
    const json = glbRow ? common.parseGlbJson(readFileSync(join(CHECK_DIR, glbRow.path))) : null;
    it('exactly one glb named <room>.glb', () => {
      expect(m.files.filter((f) => f.kind === 'glb').map((f) => f.path)).toEqual(['_check.glb']);
    });
    it('requires meshopt + basisu, never draco', () => {
      const g = json as GltfJson;
      expect(g.extensionsRequired).toContain('EXT_meshopt_compression');
      expect(g.extensionsRequired).toContain('KHR_texture_basisu');
      expect(g.extensionsUsed ?? []).not.toContain('KHR_draco_mesh_compression');
    });
    it('references the albedo as an external KTX2', () => {
      const g = json as GltfJson;
      expect(g.images).toEqual([{ uri: 'tex/albedo.ktx2', mimeType: 'image/ktx2' }]);
      expect(g.textures?.length).toBe(1);
      expect(g.textures?.[0]?.extensions?.KHR_texture_basisu).toEqual({ source: 0 });
      expect(m.files.some((f) => f.path === 'tex/albedo.ktx2')).toBe(true);
    });
    it('every primitive has uv + lm (TEXCOORD_0/1) and no tangents', () => {
      for (const mesh of (json as GltfJson).meshes)
        for (const p of mesh.primitives) {
          expect(p.attributes.TEXCOORD_0, mesh.name).toBeDefined();
          expect(p.attributes.TEXCOORD_1, mesh.name).toBeDefined();
          expect(p.attributes.TANGENT, mesh.name).toBeUndefined();
        }
    });
    it('geometry summary matches the committed glb and the canary content', () => {
      const geo = common.geometrySummary(json as GltfJson);
      expect(geo).toEqual(m.geometry);
      const names = new Set(geo.meshes.map((x) => x.name));
      for (const n of ['floor', 'arch', 'sconce', 'baluster']) expect(names.has(n), n).toBe(true);
      expect(
        geo.meshes.filter((x) => x.name === 'baluster').reduce((t, x) => t + x.instances, 0),
      ).toBe(3);
      expect(geo.meshes.find((x) => x.name === 'sconce')?.primitives).toBe(2); // iron + emissive glow
      expect(geo.meshes.find((x) => x.name === 'floor')?.triangles).toBe(8);
    });
  });

  only('declared caps hold', () => {
    const m = manifest as Manifest;
    it('triangles / texture bytes / payload bytes are within budget', () => {
      const tex = m.files.filter((f) => f.kind === 'ktx2').reduce((t, f) => t + f.bytes, 0);
      const payload = m.files.reduce((t, f) => t + f.bytes, 0);
      expect(m.geometry.trianglesDrawn).toBeLessThanOrEqual(m.budget.trianglesMax);
      expect(tex).toBeLessThanOrEqual(m.budget.textureBytesMax);
      expect(payload).toBeLessThanOrEqual(m.budget.payloadBytesMax);
      expect(m.budget.payloadBytesMax).toBeLessThanOrEqual(common.ROOM_CAP_MAX);
    });
  });
});

describe('budget payload rows (tools/common.mjs collectPayloadRows)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'zimny-budget-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const room = (id: string, cap: unknown, bytes: number, withManifest = true) => {
    const dir = join(tmp, 'public', 'assets', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}.glb`), Buffer.alloc(bytes, 1));
    if (withManifest)
      writeFileSync(
        join(dir, 'manifest.json'),
        JSON.stringify({ id, budget: { payloadBytesMax: cap } }),
      );
  };
  const rowOf = (rows: PayloadRow[], id: string) => rows.find((r) => r.id === id) as PayloadRow;

  it('empty tree prints exterior 0 B and basis 0 B, both ok', () => {
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rows.map((r) => r.id)).toEqual(['exterior', 'basis']);
    expect(rowOf(rows, 'exterior')).toMatchObject({
      row: 'exterior',
      bytes: 0,
      cap: 4000000,
      ok: true,
    });
    expect(rowOf(rows, 'basis')).toMatchObject({ row: 'shared', bytes: 0, cap: 600000, ok: true });
  });
  it('rooms budget against their manifest cap (manifest bytes count too)', () => {
    room('alpha', 10000, 1000);
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    const a = rowOf(rows, 'alpha');
    expect(a.row).toBe('room');
    expect(a.cap).toBe(10000);
    expect(a.bytes).toBeGreaterThan(1000);
    expect(a.ok).toBe(true);
  });
  it('flags a breach in-process without exiting', () => {
    room('beta', 500, 1000);
    expect(rowOf(common.collectPayloadRows(join(tmp, 'public')), 'beta')).toMatchObject({
      ok: false,
      cap: 500,
    });
  });
  it('rejects a missing manifest and an over-ceiling cap', () => {
    room('gamma', 1, 10, false);
    room('delta', 9000000, 10);
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rowOf(rows, 'gamma')).toMatchObject({
      ok: false,
      error: 'manifest.json missing',
      cap: 8000000,
    });
    expect(rowOf(rows, 'delta').ok).toBe(false);
    expect(rowOf(rows, 'delta').error).toMatch(/payloadBytesMax/);
  });
  it('exterior and basis rows count raw bytes and breach past their caps', () => {
    mkdirSync(join(tmp, 'public', 'assets', 'exterior'), { recursive: true });
    writeFileSync(join(tmp, 'public', 'assets', 'exterior', 'x.bin'), Buffer.alloc(4000001));
    mkdirSync(join(tmp, 'public', 'basis'), { recursive: true });
    writeFileSync(join(tmp, 'public', 'basis', 'basis_transcoder.wasm'), Buffer.alloc(1234));
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rowOf(rows, 'exterior')).toMatchObject({ bytes: 4000001, ok: false });
    expect(rowOf(rows, 'basis')).toMatchObject({ bytes: 1234, ok: true });
    expect(rows.some((r) => r.id === 'exterior' && r.row === 'room')).toBe(false);
  });
});

// --- §4.6 cache laws (R-UX1 slice 2): the loaders' per-session cache + the one-unit staging.

import { createLoaders } from '../src/assets/loaders';
import type { PrefetchUnit } from '../src/world/prefetch';
import type { RoomLedger, RoomManifest } from '../src/world/registry';

/** The ledger spy — the cache and the staging must leave it empty (§8.3 registers on load only). */
const spyLedger = (): RoomLedger => {
  const calls: string[] = [];
  return {
    register: (scope: string, kind: string, bytes: number, label: string) => {
      calls.push(`${scope}/${kind}/${bytes}/${label}`);
    },
    release: (scope: string) => {
      calls.push(`release/${scope}`);
    },
    bytesByScope: (scope: string) => (calls.some((c) => c.startsWith(`${scope}/`)) ? 1 : 0),
    snapshot: () => [],
  } as unknown as RoomLedger;
};

const fakeRenderer = () =>
  ({
    capabilities: { isWebGL2: true },
    extensions: { has: () => true },
    initTexture: () => undefined,
    getContext: () => ({}),
  }) as never;

const stagingManifest = (id: string): RoomManifest =>
  ({
    id,
    files: [
      { path: `${id}.glb`, bytes: 4, sha256: 'a', kind: 'glb' },
      { path: 'lm/steps.ktx2', bytes: 8, sha256: 'b', kind: 'ktx2' },
      { path: 'probe/dusk.ktx2', bytes: 16, sha256: 'c', kind: 'ktx2' },
    ],
    lightmaps: { states: ['day'], res: null, intensity: null },
    budget: { trianglesMax: 1, drawsMax: 1, textureBytesMax: 1, payloadBytesMax: 1 },
    toolchain: {},
  }) as unknown as RoomManifest;

const bytesOf = (n: number): ArrayBuffer => new ArrayBuffer(n);
/** A live, never-aborted signal — the fetchRoom signature requires one. */
const SIGNAL = new AbortController().signal;

/** A fetch double answering from a path → byteLength table; counts every call. */
const fetchDouble = (sizes: ReadonlyMap<string, number>) => {
  const paths: string[] = [];
  const impl = ((url: string) => {
    paths.push(String(url));
    const row = [...sizes].find(([path]) => String(url).endsWith(`/${path}`));
    if (row === undefined) return Promise.resolve({ ok: false, status: 404 } as never);
    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(bytesOf(row[1])),
    } as never);
  }) as unknown as typeof fetch;
  return { impl, paths };
};

describe('createLoaders — the session cache (§4.6)', () => {
  it('a full hit fetches nothing on the second fetchRoom', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const first = await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    expect(double.paths).toHaveLength(3);
    const second = await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    expect(double.paths).toHaveLength(3); // no further network
    expect(second.ktx2.get('lm/steps.ktx2')).toBe(first.ktx2.get('lm/steps.ktx2'));
    loaders.dispose();
  });

  it('a partial hit fetches only the missing rows', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan'));
    expect(double.paths).toHaveLength(1);
    await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    expect(double.paths).toHaveLength(3); // the glb row was not re-fetched
    loaders.dispose();
  });

  it('a staged row is a hit — the second identical unit fetches nothing', async () => {
    const double = fetchDouble(new Map([['jordan.glb', 4]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan'));
    await loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan'));
    expect(double.paths).toHaveLength(1);
    loaders.dispose();
  });
});

describe('createLoaders — stageUnit laws (§4.6)', () => {
  it('a ktx2 unit fetches exactly that row and no sibling', async () => {
    const double = fetchDouble(new Map([['lm/steps.ktx2', 8]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const unit: PrefetchUnit = { kind: 'ktx2', roomId: 'jordan', path: 'lm/steps.ktx2' };
    await loaders.stageUnit(unit, stagingManifest('jordan'));
    expect(double.paths).toEqual(['/assets/jordan/lm/steps.ktx2']);
    loaders.dispose();
  });

  it('a decode unit refuses a non-lm row — the probe is mountEnvironment\u2019s', async () => {
    const double = fetchDouble(new Map([['probe/dusk.ktx2', 16]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const fetchUnit: PrefetchUnit = { kind: 'ktx2', roomId: 'jordan', path: 'probe/dusk.ktx2' };
    await loaders.stageUnit(fetchUnit, stagingManifest('jordan'));
    await expect(
      loaders.stageUnit(
        { kind: 'decode', roomId: 'jordan', path: 'probe/dusk.ktx2' },
        stagingManifest('jordan'),
      ),
    ).rejects.toThrow(/not an lm row/);
    loaders.dispose();
  });

  it('a decode unit throws loud without cached bytes, and never fetches', async () => {
    const double = fetchDouble(new Map([['lm/steps.ktx2', 8]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.stageUnit(
        { kind: 'decode', roomId: 'jordan', path: 'lm/steps.ktx2' },
        stagingManifest('jordan'),
      ),
    ).rejects.toThrow(/no cached bytes/);
    expect(double.paths).toHaveLength(0); // decode never fetches
    loaders.dispose();
  });

  it('refuses a unit whose roomId does not match the manifest', async () => {
    const double = fetchDouble(new Map([['jordan.glb', 4]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.stageUnit({ kind: 'glb', roomId: 'rastrelli-gallery' }, stagingManifest('jordan')),
    ).rejects.toThrow(/does not match manifest/);
    expect(double.paths).toHaveLength(0);
    loaders.dispose();
  });

  it('refuses a ktx2 unit with no matching manifest row', async () => {
    const double = fetchDouble(new Map([['lm/ghost.ktx2', 8]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.stageUnit(
        { kind: 'ktx2', roomId: 'jordan', path: 'lm/ghost.ktx2' },
        stagingManifest('jordan'),
      ),
    ).rejects.toThrow(/no row for this unit/);
    loaders.dispose();
  });

  it('propagates a failed fetch loudly and caches nothing', async () => {
    const double = fetchDouble(new Map()); // every path 404s
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan')),
    ).rejects.toThrow(/404/);
    loaders.dispose();
  });

  it('rejects a row whose bytes do not match the manifest size', async () => {
    const double = fetchDouble(new Map([['jordan.glb', 99]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan')),
    ).rejects.toThrow(/size mismatch/);
    loaders.dispose();
  });

  it('writes NOTHING to the ledger — staging is off-ledger by design (§8.3)', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const ledger = spyLedger();
    const loaders = createLoaders(fakeRenderer(), ledger, double.impl);
    await loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan'));
    await loaders.stageUnit(
      { kind: 'ktx2', roomId: 'jordan', path: 'lm/steps.ktx2' },
      stagingManifest('jordan'),
    );
    await loaders.stageUnit(
      { kind: 'ktx2', roomId: 'jordan', path: 'probe/dusk.ktx2' },
      stagingManifest('jordan'),
    );
    expect(ledger.snapshot()).toHaveLength(0);
    loaders.dispose();
  });

  it('creates no blob URLs — staging holds bytes only', async () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL');
    const double = fetchDouble(new Map([['jordan.glb', 4]]));
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await loaders.stageUnit({ kind: 'glb', roomId: 'jordan' }, stagingManifest('jordan'));
    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
    loaders.dispose();
  });
});

describe('createLoaders — single-use staging (§4.6, the unmount-disposes law)', () => {
  it('a staged decode is consumed exactly once: the second decode re-transcodes', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await loaders.stageUnit(
      { kind: 'ktx2', roomId: 'jordan', path: 'lm/steps.ktx2' },
      stagingManifest('jordan'),
    );
    await loaders.stageUnit(
      { kind: 'decode', roomId: 'jordan', path: 'lm/steps.ktx2' },
      stagingManifest('jordan'),
    );
    const payload = await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    const first = await loaders.decodeRoomTextures('jordan', payload);
    const staged = first.get('lm/steps.ktx2');
    expect(staged).toBeDefined();
    expect((staged as { name: string }).name).toContain('fake/');
    const second = await loaders.decodeRoomTextures('jordan', payload);
    // The staged object was consumed; a fresh parse answers — a DIFFERENT object, so a
    // room's unmount may dispose its textures without poisoning the next hold.
    expect(second.get('lm/steps.ktx2')).not.toBe(staged);
    loaders.dispose();
  });

  it('the byte cache survives the consumption — a third decode still transcodes from bytes', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const payload = await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    expect(double.paths).toHaveLength(3);
    await loaders.decodeRoomTextures('jordan', payload);
    await loaders.decodeRoomTextures('jordan', payload);
    await loaders.decodeRoomTextures('jordan', payload);
    expect(double.paths).toHaveLength(3); // re-transcodes, never re-fetches
    loaders.dispose();
  });

  it('still throws loud when a payload carries no lm row', async () => {
    const double = fetchDouble(new Map());
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await expect(
      loaders.decodeRoomTextures('jordan', { glb: bytesOf(4), ktx2: new Map() }),
    ).rejects.toThrow(/has no lm rows/);
    loaders.dispose();
  });
});

// --- R3 (design-gallery §2.4): decodeRoomTexture — the ONE named non-lm row (the portrait
// atlas). It refuses lm rows (decodeRoomTextures owns those), refuses a row the payload
// does not carry, uploads inside the hold (initTexture, as mountParsed's images) and
// registers the honest texture row; it tags no colour space (the binder owns it) and never
// fetches (the bytes come from the payload fetchRoom already staged).

describe('createLoaders — decodeRoomTexture (the R3 atlas hook)', () => {
  const payload = {
    glb: bytesOf(4),
    ktx2: new Map([
      ['tex/military-gallery-portraits.ktx2', bytesOf(8)],
      ['lm/day.ktx2', bytesOf(8)],
    ]),
  };

  /** The ledger double that EXPOSES its rows (spyLedger\u2019s snapshot stays empty by design). */
  const rowLedger = () => {
    const rows: string[] = [];
    const ledger = {
      register: (scope: string, kind: string, bytes: number, label: string) => {
        rows.push(`${scope}/${kind}/${bytes}/${label}`);
      },
      release: () => undefined,
      bytesByScope: () => 0,
      snapshot: () => [],
    } as unknown as RoomLedger;
    return { ledger, rows };
  };

  /** The renderer double whose initTexture records every call — the upload law is observable. */
  const rendererWithUploads = () => {
    const uploads: unknown[] = [];
    const renderer = {
      capabilities: { isWebGL2: true },
      extensions: { has: () => true },
      initTexture: (texture: unknown) => {
        uploads.push(texture);
      },
      getContext: () => ({}),
    } as never;
    return { renderer, uploads };
  };

  it('refuses an lm row — decodeRoomTextures owns those', async () => {
    const loaders = createLoaders(fakeRenderer(), spyLedger(), fetchDouble(new Map()).impl);
    await expect(
      loaders.decodeRoomTexture('military-gallery', payload, 'lm/day.ktx2'),
    ).rejects.toThrow(/is an lm row/);
    loaders.dispose();
  });

  it('refuses a row the payload does not carry', async () => {
    const loaders = createLoaders(fakeRenderer(), spyLedger(), fetchDouble(new Map()).impl);
    await expect(
      loaders.decodeRoomTexture('military-gallery', payload, 'tex/missing.ktx2'),
    ).rejects.toThrow(/has no row tex\/missing\.ktx2/);
    loaders.dispose();
  });

  it('decodes a non-lm row, uploads it in the hold and registers the honest row', async () => {
    const { ledger, rows } = rowLedger();
    const { renderer, uploads } = rendererWithUploads();
    const loaders = createLoaders(renderer, ledger, fetchDouble(new Map()).impl);
    const texture = await loaders.decodeRoomTexture(
      'military-gallery',
      payload,
      'tex/military-gallery-portraits.ktx2',
    );
    expect((texture as { name: string }).name).toContain('fake/');
    expect(uploads).toContain(texture); // the GPU upload inside the hold, as mountParsed\u2019s
    // The fake texture carries no image, so the honest size reads 0 — the ROW is the law.
    expect(rows).toEqual(['military-gallery/texture/0/tex/military-gallery-portraits.ktx2']);
    loaders.dispose();
  });

  it('never fetches — the bytes come from the staged payload', async () => {
    const double = fetchDouble(new Map());
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    await loaders.decodeRoomTexture(
      'military-gallery',
      payload,
      'tex/military-gallery-portraits.ktx2',
    );
    expect(double.paths).toHaveLength(0);
    loaders.dispose();
  });

  it('tags no colour space — the binder owns it (§2.4\u2019s CANVAS law)', async () => {
    const loaders = createLoaders(fakeRenderer(), spyLedger(), fetchDouble(new Map()).impl);
    const texture = (await loaders.decodeRoomTexture(
      'military-gallery',
      payload,
      'tex/military-gallery-portraits.ktx2',
    )) as Record<string, unknown>;
    expect('colorSpace' in texture).toBe(false);
    loaders.dispose();
  });
});

// --- R23-ux (design-load-line.md): the per-row progress sink — the load line's numbers.

/** A streaming fetch double: `chunks` reads of size/chunks bytes, then done. */
const streamDouble = (sizes: ReadonlyMap<string, number>, chunks: number) => {
  const paths: string[] = [];
  const impl = ((url: string) => {
    paths.push(String(url));
    const row = [...sizes].find(([path]) => String(url).endsWith(`/${path}`));
    if (row === undefined) return Promise.resolve({ ok: false, status: 404 } as never);
    let served = 0;
    const perChunk = row[1] / chunks;
    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(bytesOf(row[1])),
      body: {
        getReader: () => ({
          read: async (): Promise<{ readonly done: boolean; readonly value?: Uint8Array }> => {
            served += 1;
            if (served > chunks) return { done: true };
            return { done: false, value: new Uint8Array(perChunk) };
          },
        }),
      },
    } as never);
  }) as unknown as typeof fetch;
  return { impl, paths };
};

describe('createLoaders — the row progress sink (R23-ux)', () => {
  it('the no-stream fallback reports the full row once at resolve', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const sinkCalls: Array<readonly [string, number]> = [];
    await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL, (rowPath, loaded) => {
      sinkCalls.push([rowPath, loaded] as const);
    });
    expect(sinkCalls).toHaveLength(3);
    expect(sinkCalls.map(([row]) => row)).toEqual(
      expect.arrayContaining(['jordan.glb', 'lm/steps.ktx2', 'probe/dusk.ktx2']),
    );
    for (const [, loaded] of sinkCalls) expect(loaded).toBeGreaterThan(0);
    loaders.dispose();
  });

  it('the streamed rows report monotone cumulative counts', async () => {
    const double = streamDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
      2,
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const sinkCalls: Array<readonly [string, number]> = [];
    await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL, (rowPath, loaded) => {
      sinkCalls.push([rowPath, loaded] as const);
    });
    for (const [, loaded] of sinkCalls) expect(loaded).toBeGreaterThan(0);
    const glbCalls = sinkCalls.filter(([row]) => row === 'jordan.glb').map(([, loaded]) => loaded);
    expect(glbCalls).toEqual([2, 4]); // cumulative, monotone, ending at the manifest size
    loaders.dispose();
  });

  it('cache hits report the row\u2019s full bytes without fetching', async () => {
    const double = fetchDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const firstCalls: Array<readonly [string, number]> = [];
    await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL, (rowPath, loaded) => {
      firstCalls.push([rowPath, loaded] as const);
    });
    expect(firstCalls).toHaveLength(3);
    expect(double.paths).toHaveLength(3); // the first run fetched, and nothing more so far
    const secondCalls: Array<readonly [string, number]> = [];
    await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL, (rowPath, loaded) => {
      secondCalls.push([rowPath, loaded] as const);
    });
    expect(double.paths).toHaveLength(3); // the second run fetched nothing
    expect(secondCalls).toHaveLength(3); // but every cached row reports its bytes at once
    loaders.dispose();
  });

  it('with no sink bound nothing reports (the stageUnit path)', async () => {
    const double = streamDouble(
      new Map([
        ['jordan.glb', 4],
        ['lm/steps.ktx2', 8],
        ['probe/dusk.ktx2', 16],
      ]),
      2,
    );
    const loaders = createLoaders(fakeRenderer(), spyLedger(), double.impl);
    const payload = await loaders.fetchRoom(stagingManifest('jordan'), SIGNAL);
    expect(payload.glb.byteLength).toBe(4);
    expect(double.paths).toHaveLength(3);
    loaders.dispose();
  });
});
