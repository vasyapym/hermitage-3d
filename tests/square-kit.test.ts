/**
 * DEC-045, batch M1 — design §4 fixture gates for the pure square-kit law.
 * Describe 6 (M2) reads the committed kit artifacts off disk: the digest and census laws.
 * S0b's committed pose rides SQUARE_RAIL (the orchestrator integration); the synthetic
 * ray keeps the arithmetic pin independent of the rail data.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SQUARE_RAIL } from '../src/camera/square-rail';
import { levelOf } from '../src/world/night-facade';
import type { Bounds, Vec3 } from '../src/world/registry';
import type { SquareKitNode, SquareManifest } from '../src/world/square-kit';
import * as kit from '../src/world/square-kit';
import { THROAT_VOID } from '../src/world/throat';

const SHA = 'a'.repeat(64);

function bounds(min: Vec3, max: Vec3): Bounds {
  return { min, max };
}

function hqNode(): SquareKitNode {
  return {
    name: 'el:hq-east',
    tris: 800,
    aabb: bounds([108.95, 0, 100], [134, 20.5, 240]),
    materials: ['hq-massing', 'dressing', 'dark-pane', 'dim-pane', 'bright-pane'],
  } satisfies SquareKitNode;
}

function manifest(nodes: readonly SquareKitNode[] = []): SquareManifest {
  return {
    id: 'square',
    files: [{ path: 'kit.glb', bytes: 120_000, sha256: SHA, kind: 'glb' }],
    lightmaps: { states: [], res: null, intensity: null },
    budget: { ...kit.SQUARE_KIT_BUDGET },
    toolchain: { blender: 'fixture', census: 'fixture' },
    nodes,
    glbSha256: SHA,
  } satisfies SquareManifest;
}

describe('1 · DEC-045 constants and bind names', () => {
  it('pins the parked allowances separately from whole-frame caps', () => {
    expect(kit.SQUARE_KIT_ALLOW).toEqual({
      meshes: 6,
      tris: 18_000,
      payloadB: 1_500_000,
      texVramB: 8_388_608,
    });
    expect(kit.SQUARE_DRAW_CAP).toBe(56);
    expect(kit.SQUARE_TRI_CAP).toBe(75_000);
    expect(kit.KIT_TEXTURES_ALLOWED).toBe(0);
    expect(kit.SQUARE_KIT_BUDGET).toEqual({
      trianglesMax: 18_000,
      drawsMax: 6,
      textureBytesMax: 1,
      payloadBytesMax: 1_500_000,
    });
  });

  it('pins the one fetch root, identity frame and mount vocabulary', () => {
    expect(kit.SQUARE_KIT_URL).toBe('/assets/square/manifest.json');
    expect(kit.SQUARE_KIT_GLB).toBe('kit.glb');
    expect(kit.KIT_NODE_PREFIX).toBe('el:');
    expect(kit.KIT_WORLD_LAW).toBe(
      'World metres: +X east, +Y up, +Z south; mount at identity under palace.',
    );
    expect(kit.KIT_MOUNT_ATTR).toBe('data-square-kit');
    expect(kit.KIT_MOUNT_STATES).toEqual(['loading', 'ready', 'failed']);
  });

  it('has exactly six unique, case-sensitive shared-material bind keys', () => {
    expect(kit.KIT_BIND_KEYS).toEqual([
      'massing',
      'hq-massing',
      'dressing',
      'dark-pane',
      'dim-pane',
      'bright-pane',
    ]);
    expect(new Set(kit.KIT_BIND_KEYS).size).toBe(kit.KIT_BIND_KEYS.length);
    for (const key of kit.KIT_BIND_KEYS) expect(kit.isKitBindKey(key)).toBe(true);
    for (const key of ['Material', 'Massing', 'pane', '', null, 1]) {
      expect(kit.isKitBindKey(key)).toBe(false);
    }
  });

  it('pins the HQ pane re-slot law: the generated lit map over the palace hash space', () => {
    expect(kit.HQ_PANE_ROWS).toBe(4);
    expect(kit.HQ_PANE_COUNT).toBe(124);
    expect(kit.HQ_PANE_SLOT).toEqual({ dark: 2, dim: 3, bright: 4 });
    const table = kit.hqPaneLevelTable();
    expect(table).toHaveLength(kit.HQ_PANE_COUNT);
    expect(table).toMatch(/^[dib]+$/);
    const counts: Record<string, number> = { d: 0, i: 0, b: 0 };
    for (const ch of table) counts[ch] = (counts[ch] ?? 0) + 1;
    const split = `dark ${counts.d ?? 0} · dim ${counts.i ?? 0} · bright ${counts.b ?? 0} of 124`;
    for (const code of ['d', 'i', 'b'] as const) {
      // every level present — the re-slot never degenerates to one stock material
      expect(counts[code] ?? 0, split).toBeGreaterThanOrEqual(1);
    }
    // one law, one place: the SAME levelOf decides, so the table matches the hash space
    expect(kit.hqPaneKey(0, 0)).toBe('el:hq-east/pane/b0/r0');
    expect(kit.hqPaneKey(30, 3)).toBe('el:hq-east/pane/b30/r3');
    expect(table[0]).toBe(kit.HQ_PANE_LEVEL_CODES[levelOf(kit.hqPaneKey(0, 0))]);
    expect(table[table.length - 1]).toBe(kit.HQ_PANE_LEVEL_CODES[levelOf(kit.hqPaneKey(30, 3))]);
  });

  it('pins the round-2 day-read laws: the surround, the PROUD pair, the lip, the tone, the rider', () => {
    expect(kit.HQ_TONE_HEX).toBe(0xc6ba64);
    expect(kit.HQ_WINDOW_WIDTH_M).toBe(2.2);
    expect(kit.HQ_SURROUND).toEqual({ sideM: 0.3, headM: 0.3, sillM: 0.3 });
    expect(kit.HQ_SURROUND_WIDTH_M).toBeCloseTo(2.8, 12);
    expect(kit.HQ_PANE_PROUD_M).toBe(0.04);
    expect(kit.HQ_SURROUND_PROUD_M).toBe(0.02);
    // the derived rows: HQ_WINDOW_ROWS_Y widened by the margins…
    expect(kit.hqSurroundRows()).toEqual([
      [1.2, 4.3],
      [4.7, 8.3],
      [10.2, 14.3],
      [14.7, 17.8],
    ]);
    // …clear of the plinth top 0.6 and of the тяга 8.85–9.15 (the py's own course).
    const plinthTop = 0.6;
    const stringCourse = { min: 8.85, max: 9.15 };
    for (const [z0, z1] of kit.hqSurroundRows()) {
      expect(z0).toBeGreaterThan(plinthTop);
      expect(z1 <= stringCourse.min || z0 >= stringCourse.max).toBe(true);
    }
    expect(kit.HQ_SURROUND_TRIS).toBe(248);
    expect(kit.HQ_NODE_TRIS).toBe(1_192);
    expect(kit.HQ_NODE_TRIS).toBeLessThanOrEqual(kit.HQ_NODE_TRI_CAP);
    expect(kit.HQ_SNOW_LIP).toEqual({ min: [109.55, 20.5, 100], max: [110.3, 20.7, 240] });
    expect(kit.GS_JUNCTION).toEqual({
      xWest: 110,
      xEast: 134,
      zNorth: 240,
      zSouth: 300,
      corniceM: 20.5,
      plinthTopM: 0.6,
    });
  });

  it('accepts only the adopted node-name grammar', () => {
    for (const name of ['el:hq-east', 'el:a', 'el:lamp-01']) {
      expect(kit.isKitNodeName(name)).toBe(true);
    }
    for (const name of ['', 'hq-east', 'el:', 'el:HQ', 'el:hq_east', 'el:a/b', null]) {
      expect(kit.isKitNodeName(name)).toBe(false);
    }
  });

  it('pins the corrected HQ declarations without requiring HQ in an empty kit', () => {
    expect(kit.HQ_FACE_X).toBe(110);
    expect(kit.HQ_DEPTH_M).toBe(24);
    expect(kit.HQ_Z).toEqual({ north: 100, south: 240 });
    expect(kit.HQ_Z.north - 92).toBe(8);
    expect(kit.HQ_CORNICE_M).toBe(20.5);
    expect(kit.HQ_FLOORS).toBe(4);
    expect(kit.HQ_RUSTICATED_FLOORS).toBe(2);
    expect(kit.HQ_STRING_COURSE_Y).toBe(9);
    expect(kit.HQ_PORTICO).toEqual({
      columns: 12,
      pitchM: 4.2,
      radiusM: 0.7,
      threeQuarter: true,
      baseY: 9,
      heightM: 10.2,
      centreZ: 170,
    });
    expect(kit.HQ_BAYS).toBe(31);
    expect(kit.HQ_WINDOW_ROWS_Y).toEqual([
      [1.5, 4],
      [5, 8],
      [10.5, 14],
      [15, 17.5],
    ]);
    expect(kit.HQ_NODE_TRI_CAP).toBe(1_500);
  });
});

describe('2 · manifest fixtures and allowances', () => {
  it('accepts both the machinery-stage empty kit and a one-node content fixture', () => {
    expect(kit.validateSquareManifest(manifest())).toBe(true);
    const fixture = manifest([hqNode()]);
    expect(kit.validateSquareManifest(fixture)).toBe(true);
    expect(fixture.nodes.every((node) => kit.isKitNodeName(node.name))).toBe(true);
    expect(fixture.nodes.every((node) => node.tris <= 1_500)).toBe(true);
    expect(fixture.nodes.reduce((sum, node) => sum + node.tris, 0)).toBeLessThanOrEqual(
      kit.SQUARE_KIT_ALLOW.tris,
    );
    expect(fixture.nodes.length).toBeLessThanOrEqual(kit.SQUARE_KIT_ALLOW.meshes);
  });

  it('narrows unknown input to the complete square manifest type', () => {
    const candidate: unknown = manifest([hqNode()]);
    if (!kit.validateSquareManifest(candidate)) throw new Error('fixture rejected');
    expect(candidate.files[0]?.sha256).toBe(candidate.glbSha256);
    expect(candidate.nodes[0]?.materials).toEqual([
      'hq-massing',
      'dressing',
      'dark-pane',
      'dim-pane',
      'bright-pane',
    ]);
  });

  it('rejects malformed top-level and RoomManifest fields', () => {
    for (const value of [null, undefined, true, 12, 'square', [], {}]) {
      expect(kit.validateSquareManifest(value)).toBe(false);
    }
    const base = manifest();
    const invalid = [
      { id: 'jordan' },
      { files: null },
      { files: [] },
      { nodes: null },
      { nodes: {} },
      { lightmaps: null },
      { lightmaps: { states: [], res: null } },
      { lightmaps: { states: [1], res: null, intensity: null } },
      { lightmaps: { states: [], res: -1, intensity: null } },
      { lightmaps: { states: [], res: 1.5, intensity: null } },
      { lightmaps: { states: [], res: null, intensity: {} } },
      { toolchain: null },
      { toolchain: [] },
      { toolchain: { blender: 4 } },
    ];
    for (const patch of invalid) {
      expect(kit.validateSquareManifest({ ...base, ...patch })).toBe(false);
    }
  });

  it('requires the kit geometry-only null lightmaps record — no baked states ride the kit', () => {
    expect(manifest().lightmaps).toEqual({ states: [], res: null, intensity: null });
    const base = manifest();
    for (const lightmaps of [
      { states: ['day'], res: null, intensity: null },
      { states: [], res: 16, intensity: null },
      { states: [], res: null, intensity: { day: 1, dusk: 1, nightChandeliers: 1 } },
    ]) {
      expect(kit.validateSquareManifest({ ...base, lightmaps })).toBe(false);
    }
  });

  it('pins every budget field, including the positive one-byte texture fence', () => {
    for (const key of Object.keys(kit.SQUARE_KIT_BUDGET)) {
      expect(
        kit.validateSquareManifest({
          ...manifest(),
          budget: { ...kit.SQUARE_KIT_BUDGET, [key]: 0 },
        }),
      ).toBe(false);
    }
    expect(
      kit.validateSquareManifest({
        ...manifest(),
        budget: { ...kit.SQUARE_KIT_BUDGET, textureBytesMax: 8_388_608 },
      }),
    ).toBe(false);
  });

  it('requires a matching lowercase SHA row, not a claim of hashing the GLB', () => {
    for (const glbSha256 of ['', 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(63), null]) {
      expect(kit.validateSquareManifest({ ...manifest(), glbSha256 })).toBe(false);
    }
    expect(kit.validateSquareManifest({ ...manifest(), glbSha256: 'b'.repeat(64) })).toBe(false);
  });

  it('allows only the relative GLB row, with positive integral bounded payload', () => {
    const file = { path: 'kit.glb', bytes: 1_500_000, sha256: SHA, kind: 'glb' };
    expect(kit.validateSquareManifest({ ...manifest(), files: [file] })).toBe(true);
    for (const bytes of [-1, 0, 1.5, NaN, Infinity, 1_500_001]) {
      expect(kit.validateSquareManifest({ ...manifest(), files: [{ ...file, bytes }] })).toBe(
        false,
      );
    }
    for (const patch of [
      { path: '/assets/square/kit.glb' },
      { path: '../kit.glb' },
      { kind: 'ktx2' },
      { sha256: 'b'.repeat(64) },
    ]) {
      expect(kit.validateSquareManifest({ ...manifest(), files: [{ ...file, ...patch }] })).toBe(
        false,
      );
    }
    expect(kit.validateSquareManifest({ ...manifest(), files: [null] })).toBe(false);
    expect(
      kit.validateSquareManifest({
        ...manifest(),
        files: [file, { path: 'albedo.ktx2', bytes: 1, sha256: SHA, kind: 'ktx2' }],
      }),
    ).toBe(false);
  });

  it('rejects unknown material names, empty slots and duplicate node names', () => {
    for (const materials of [[], ['Material.001'], ['massing', 'unknown'], null]) {
      expect(
        kit.validateSquareManifest({ ...manifest(), nodes: [{ ...hqNode(), materials }] }),
      ).toBe(false);
    }
    expect(kit.validateSquareManifest(manifest([hqNode(), hqNode()]))).toBe(false);
    expect(
      kit.validateSquareManifest({
        ...manifest(),
        nodes: [{ ...hqNode(), name: 'HQ-east' }],
      }),
    ).toBe(false);
  });

  it('enforces per-node triangles, six meshes and six material-slot draws', () => {
    for (const tris of [-1, 0.5, NaN, Infinity, 1_501, 18_001]) {
      expect(kit.validateSquareManifest({ ...manifest(), nodes: [{ ...hqNode(), tris }] })).toBe(
        false,
      );
    }
    const nodes = Array.from({ length: 6 }, (_, index) => ({
      ...hqNode(),
      name: `el:fixture-${index}`,
      tris: 1_500,
      materials: ['massing'] as const,
    }));
    expect(kit.validateSquareManifest(manifest(nodes))).toBe(true);
    expect(
      kit.validateSquareManifest(manifest([...nodes, { ...hqNode(), name: 'el:seventh' }])),
    ).toBe(false);
    const threeSlots = [0, 1, 2].map((index) => ({
      ...hqNode(),
      name: `el:three-slots-${index}`,
    }));
    expect(kit.validateSquareManifest(manifest(threeSlots))).toBe(false);
  });

  it('rejects unordered, malformed and non-finite bounds', () => {
    for (const aabb of [
      null,
      { min: [0, 0], max: [1, 1, 1] },
      bounds([134, 0, 100], [108.95, 20.5, 240]),
      bounds([110, 0, 100], [134, Infinity, 240]),
    ]) {
      expect(kit.validateSquareManifest({ ...manifest(), nodes: [{ ...hqNode(), aabb }] })).toBe(
        false,
      );
    }
  });
});

describe('3 · rail band, portal exclusion and HQ fixture envelope', () => {
  it('derives the portal dimensions and pins the committed rail segment', () => {
    expect(kit.KIT_PORTAL_BOX).toEqual({
      xHalf: THROAT_VOID.halfWidth,
      yTop: THROAT_VOID.topY,
      zSouth: 93.5,
    });
    expect(kit.KIT_RAIL_CLEARANCE_M).toBe(3);
    expect(kit.KIT_RAIL_SEGMENT).toEqual({
      start: [-24, 0, 230],
      end: [0, 0, 124],
    });
  });

  it('checks segment crossings, endpoint distance and exact three-metre clearance', () => {
    expect(kit.squareKitClearsRail(bounds([-13, 0, 176], [-11, 2, 178]))).toBe(false);
    expect(kit.squareKitClearsRail(bounds([3, 0, 123], [4, 3, 124]))).toBe(true);
    expect(kit.squareKitClearsRail(bounds([2.999, 0, 123], [4, 3, 124]))).toBe(false);
    expect(kit.squareKitClearsRail(bounds([-13, 3, 176], [-11, 4, 178]))).toBe(false);
    expect(kit.squareKitClearsRail(bounds([-13, 3.001, 176], [-11, 4, 178]))).toBe(true);
    expect(kit.squareKitClearsRail(bounds([-13, -2, 176], [-11, -0.001, 178]))).toBe(true);
    expect(kit.squareKitClearsRail(bounds([-8.3, 0, 181.7], [-8.2, 3, 181.8]))).toBe(true);
  });

  it('protects the mouth and northward passage, including boundary contact', () => {
    expect(kit.squareKitClearsPortal(bounds([-1, 0, 93], [1, 2, 94]))).toBe(false);
    expect(kit.squareKitClearsPortal(bounds([-1, 0, 60], [1, 2, 61]))).toBe(false);
    expect(kit.squareKitClearsPortal(bounds([2.6, 0, 93], [3, 2, 94]))).toBe(false);
    expect(kit.squareKitClearsPortal(bounds([2.601, 0, 93], [3, 2, 94]))).toBe(true);
    expect(kit.squareKitClearsPortal(bounds([-1, 0, 93.501], [1, 2, 94]))).toBe(true);
    expect(kit.squareKitClearsPortal(bounds([-1, 9.751, 90], [1, 10, 94]))).toBe(true);
  });

  it('rejects either geometry-law violation at the manifest boundary', () => {
    for (const aabb of [bounds([-13, 0, 176], [-11, 2, 178]), bounds([-1, 0, 93], [1, 2, 94])]) {
      expect(kit.validateSquareManifest(manifest([{ ...hqNode(), aabb }]))).toBe(false);
    }
  });

  it('pins the declared HQ envelope on a fixture, not a nonexistent committed asset', () => {
    const box = hqNode().aabb;
    expect(box.min[0]).toBeCloseTo(108.95, 6);
    expect(box.max[0]).toBe(kit.HQ_FACE_X + kit.HQ_DEPTH_M);
    expect(box.min[1]).toBe(0);
    expect(box.max[1]).toBe(kit.HQ_CORNICE_M);
    expect(box.min[2]).toBe(kit.HQ_Z.north);
    expect(box.max[2]).toBe(kit.HQ_Z.south);
    expect(kit.squareKitClearsRail(box)).toBe(true);
    expect(kit.squareKitClearsPortal(box)).toBe(true);
  });
});

describe('4 · corrected backdrop-ray pins', () => {
  it('hits z = 107.5 inside HQ_Z on an explicit synthetic S0b ray fixture', () => {
    const hit = kit.squareKitBackdropHitZ([-40, 1.6, 220], [0, 25, 190], kit.HQ_FACE_X);
    expect(hit).toBeCloseTo(107.5, 6);
    if (hit === null) throw new Error('missing backdrop hit');
    expect(hit).toBeGreaterThanOrEqual(kit.HQ_Z.north);
    expect(hit).toBeLessThanOrEqual(kit.HQ_Z.south);
  });

  it('pins the committed S0b pose from SQUARE_RAIL: the hit is exactly 107.5, in span', () => {
    const stop = SQUARE_RAIL.stops.find((candidate) => candidate.id === 'S0b');
    if (!stop?.subject) throw new Error('the committed S0b stop is missing');
    const hit = kit.squareKitBackdropHitZ(stop.position, stop.subject, kit.HQ_FACE_X);
    expect(hit).toBeCloseTo(107.5, 6);
    if (hit === null) throw new Error('missing committed S0b backdrop hit');
    expect(hit).toBeGreaterThanOrEqual(kit.HQ_Z.north);
    expect(hit).toBeLessThanOrEqual(kit.HQ_Z.south);
  });

  it('returns null for S1 and a finite out-of-span S0 hit', () => {
    expect(kit.squareKitBackdropHitZ([0, 1.6, 124], [0, 8, 0], 110)).toBeNull();
    const hit = kit.squareKitBackdropHitZ([-24, 1.6, 230], [0, 8, 0], 110);
    expect(hit).toBeCloseTo(-1054.1666667, 5);
    if (hit === null) throw new Error('missing finite S0 hit');
    expect(Number.isFinite(hit)).toBe(true);
    expect(hit).toBeLessThan(kit.HQ_Z.north);
  });

  it('handles degenerate, backward and non-finite rays without emitting NaN', () => {
    expect(kit.squareKitBackdropHitZ([0, 0, 0], [0, 0, 0], 110)).toBeNull();
    expect(kit.squareKitBackdropHitZ([0, 0, 0], [1e-12, 0, 1], 110)).toBeNull();
    expect(kit.squareKitBackdropHitZ([0, 0, 0], [-1, 0, 1], 110)).toBeNull();
    expect(kit.squareKitBackdropHitZ([0, 0, 0], [1, 0, 1], Infinity)).toBeNull();
    expect(kit.squareKitBackdropHitZ([NaN, 0, 0], [1, 0, 1], 110)).toBeNull();
  });
});

describe('5 · the law stays pure', () => {
  const source = readFileSync('src/world/square-kit.ts', 'utf8');
  const stripComments = (raw: string): string =>
    raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (raw: string): string =>
    stripComments(raw)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');

  it('imports no three or node modules, including dynamic imports', () => {
    const imports = stripComments(source);
    expect(imports).not.toMatch(/from\s+['"]three/);
    expect(imports).not.toMatch(/import\s*\(\s*['"]three/);
    expect(imports).not.toMatch(/['"]node:/);
    expect(imports).not.toMatch(/(?:from\s*|import\s*\()\s*['"](?:fs|path|crypto)['"]/);
  });

  it('touches no DOM, storage, clock, timer, network or randomness', () => {
    const code = stripLiterals(source);
    for (const pattern of [
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
    ]) {
      expect(code).not.toMatch(pattern);
    }
    expect(code).not.toMatch(/\bexport\s+default\b|\benum\b/);
  });
});

describe('6 · the committed kit (G2/G3/G7 — batch M2)', () => {
  const dir = join('public', 'assets', 'square');
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as unknown;
  const glb = readFileSync(join(dir, 'kit.glb'));

  it('passes the law validator', () => {
    if (!kit.validateSquareManifest(manifest)) {
      throw new Error('the committed manifest fails validateSquareManifest');
    }
  });

  it('the manifest digest names the committed glb (G7: the manifest law unit-pinned)', () => {
    if (!kit.validateSquareManifest(manifest)) throw new Error('invalid committed manifest');
    expect(createHash('sha256').update(glb).digest('hex')).toBe(manifest.glbSha256);
    expect(manifest.files[0]?.sha256).toBe(manifest.glbSha256);
  });

  it('carries the two committed nodes per the round-2 pins (the wall + the junction rider)', () => {
    if (!kit.validateSquareManifest(manifest)) throw new Error('invalid committed manifest');
    expect(manifest.nodes).toHaveLength(2);
    const wall = manifest.nodes[0];
    const junction = manifest.nodes[1];
    if (!wall || !junction) throw new Error('a committed node is missing');
    expect(wall.name).toBe('el:hq-east');
    expect(wall.tris).toBe(kit.HQ_NODE_TRIS); // 944 + 248 surrounds = 1,192 ≤ 1,500
    expect(wall.aabb.min[0]).toBeCloseTo(109.3, 4); // the portico's r-0.7 columns protrude
    expect(wall.aabb.max[0]).toBe(kit.HQ_FACE_X + kit.HQ_DEPTH_M);
    expect(wall.aabb.min[1]).toBe(0);
    expect(wall.aabb.max[1]).toBe(kit.HQ_CORNICE_M);
    expect(wall.aabb.min[2]).toBe(kit.HQ_Z.north);
    expect(wall.aabb.max[2]).toBe(kit.HQ_Z.south);
    expect(wall.materials).toEqual([
      'hq-massing',
      'dressing',
      'dark-pane',
      'dim-pane',
      'bright-pane',
    ]);
    expect(junction.name).toBe('el:gs-junction');
    expect(junction.tris).toBe(36); // body 12 + plinth course 12 + cornice course 12
    expect(junction.aabb.min[2]).toBe(kit.GS_JUNCTION.zNorth);
    expect(junction.aabb.max[2]).toBe(kit.GS_JUNCTION.zSouth);
    expect(junction.materials).toEqual(['hq-massing']); // the reserved 6th draw slot
    const draws = manifest.nodes.reduce((sum, node) => sum + node.materials.length, 0);
    expect(draws).toBe(6); // 5 + 1 — EXACTLY the drawsMax; no drawsMax DEC was needed
  });

  it('the committed payload sits inside the KIT allowance', () => {
    expect(glb.length).toBeGreaterThan(0);
    expect(glb.length).toBeLessThanOrEqual(kit.SQUARE_KIT_ALLOW.payloadB);
  });

  it('the manifest budget row equals the kit law', () => {
    expect(manifest).toHaveProperty('budget', { ...kit.SQUARE_KIT_BUDGET });
  });
});

describe('7 · the generated lit map (the law-twin pin — Python holds data, never a law)', () => {
  const py = readFileSync(join('tools', 'square-kit', 'build_square_kit.py'), 'utf8');

  it('the bpy HQ_LEVELS table is the law table, bit-exact', () => {
    const expected = kit.hqPaneLevelTable();
    const match = /HQ_LEVELS = '([dib]+)'/.exec(py);
    if (!match) {
      throw new Error(
        `build_square_kit.py carries no HQ_LEVELS table; paste the generated one:\n${expected}`,
      );
    }
    expect(match[1]).toBe(expected);
  });

  it('the bpy LEVEL_SLOT equals the law slot map (dark 2 · dim 3 · bright 4)', () => {
    expect(/LEVEL_SLOT = \{'d': 2, 'i': 3, 'b': 4\}/.test(py)).toBe(true);
    expect(kit.HQ_PANE_SLOT).toEqual({ dark: 2, dim: 3, bright: 4 });
  });

  it('the bpy day-read constants are the law twins (WINDOW_W · PROUD pair · SIDE)', () => {
    expect(/WINDOW_W = 2\.2\s*# HQ_WINDOW_WIDTH_M/.test(py)).toBe(true);
    expect(/PANE_PROUD = 0\.04\s*# HQ_PANE_PROUD_M/.test(py)).toBe(true);
    expect(/SURROUND_PROUD = 0\.02\s*# HQ_SURROUND_PROUD_M/.test(py)).toBe(true);
    expect(/SIDE = 0\.3\s*# HQ_SURROUND\.sideM/.test(py)).toBe(true);
  });

  it('the bpy flip law is keyed on the authored open-quad list (dressing carries open quads)', () => {
    expect(py).toContain('for f in open_quads:');
    expect(py).not.toContain('material_index >= 2');
  });

  it('the bpy window loop indexes bay-major: LEVEL_SLOT[HQ_LEVELS[bay * 4 + row]]', () => {
    expect(py).toContain('HQ_LEVELS[bay * 4 + row]');
  });
});
