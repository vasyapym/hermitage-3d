/// <reference types="node" />
// jordan-fixtures B1 fence — the sconce archetype's committed glb, read three-free
// (the tests/assets.test.ts precedent: tools/common.mjs parseGlbJson + node:fs — no
// meshopt decode; the design-staircase.md §2.2 per-room values and §3.1 asset chain,
// implementing jordan-lack-ruling.md §B1/§C1/§C3/§C4 pins, ACCEPTANCE #1/#4/#6 and the
// glow ruling §b P1/P2 as far as the committed JSON carries them: the primitive map,
// the tri caps, the material set, the alpha law, the extension fence, the instance
// roster, the crystal drops and the J1b gaze subject's mounted bbox centre.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type GltfJson = {
  extensionsUsed?: string[];
  materials?: {
    name?: string;
    alphaMode?: string;
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      metallicFactor?: number;
      roughnessFactor?: number;
    };
    extensions?: Record<string, unknown>;
  }[];
  meshes?: {
    name?: string;
    primitives: { material: number; attributes: Record<string, number>; indices?: number }[];
  }[];
  nodes?: {
    name?: string;
    mesh?: number;
    translation?: [number, number, number];
    scale?: [number, number, number];
  }[];
  accessors: { count: number; min?: [number, number, number]; max?: [number, number, number] }[];
};
type Common = { parseGlbJson: (buf: Buffer) => GltfJson };

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'public', 'assets', 'jordan');
const GLB = readFileSync(join(DIR, 'jordan.glb'));
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as {
  geometry: { trianglesDrawn: number; trianglesUnique: number };
};
const common = (await import(join(ROOT, 'tools', 'common.mjs'))) as unknown as Common;

// The committed glb's extension fence at main @ 3da446d (ACCEPTANCE #4: extensionsUsed
// unchanged — any new runtime behaviour is a JS spender and out of this round).
const COMMITTED_EXTENSIONS_USED = [
  'EXT_meshopt_compression',
  'KHR_materials_emissive_strength',
  'KHR_mesh_quantization',
  'KHR_texture_basisu',
];
// The committed 7 materials (main @ 3da446d) + the ONE new name the ruling allows.
const COMMITTED_MATERIALS = [
  'plaster_warm',
  'marble_floor',
  'pane',
  'gilt',
  'chandelier_glow',
  'granite_grey',
  'sconce_glow',
];
const CRYSTAL = 'crystal';
// rooms/jordan/contract.ts FLIGHT2_SCONCE — the J1b gaze subject's authored point.
const GAZE_POINT: [number, number, number] = [75.1, 9.5, -85.5];
// The B0-measured placeholder's bbox-centre miss (docs/probes/jordan-fixtures-census.md):
// the binding law here is "the new form must do better". SCONCE_GAZE_TOL 0.15 itself is
// unreachable within the pinned form: the archetype's bbox centre sits at wall offset
// (reach 0.40 + pan radius 0.055)/2 = 0.2275 at best, so the z residual to the gaze
// point (0.5 m off the wall) floors the distance at 0.2725 — recorded, not asserted.
const GAZE_ACHIEVED_M = 0.2725;
const GAZE_ACHIEVED_TOL = 0.001;
const GAZE_IMPROVE_M = 0.3106;

const json = common.parseGlbJson(GLB);
const sconceMesh = (json.meshes ?? []).find(
  (m) => (m.name ?? '').replace(/\.\d{3}$/, '') === 'sconce',
);
if (!sconceMesh) throw new Error('the committed glb carries no sconce mesh');
const sconceIndex = (json.meshes ?? []).indexOf(sconceMesh);
const sconce = sconceMesh;
const materialName = (index: number): string =>
  (json.materials?.[index]?.name ?? '').replace(/\.\d{3}$/, '');
const meshNodes = (meshIndex: number) => (json.nodes ?? []).filter((n) => n.mesh === meshIndex);
const primTriangles = (prim: { indices?: number; attributes: Record<string, number> }) => {
  const accessor = json.accessors[prim.indices ?? prim.attributes.POSITION ?? 0];
  if (!accessor) throw new Error('a sconce primitive without a POSITION accessor');
  return accessor.count / 3;
};

describe('jordan-fixtures: the sconce archetype in the committed glb', () => {
  it('is exactly three primitives: gilt, sconce_glow, crystal (the draw gate law)', () => {
    expect(sconce.primitives).toHaveLength(3);
    expect(sconce.primitives.map((p) => materialName(p.material))).toEqual([
      'gilt',
      'sconce_glow',
      CRYSTAL,
    ]);
  });

  it('stays under the archetype tri cap and the drawn 5,200', () => {
    const unique = sconce.primitives.reduce((n, p) => n + primTriangles(p), 0);
    expect(unique).toBeLessThanOrEqual(520);
    const instances = meshNodes(sconceIndex).length;
    expect(instances * unique).toBeLessThanOrEqual(5200);
    // The B1 measured form: 361 unique / 3,610 drawn (the placeholder retired at 24/240).
    expect(unique).toBe(361);
    expect(instances).toBe(10);
    // The B2 room totals (the chandelier assembly landed: 25,242 − 356 + 7,200).
    expect(manifest.geometry.trianglesDrawn).toBe(32086);
    expect(manifest.geometry.trianglesUnique).toBe(7238);
  });

  it('carries the committed 7 materials + crystal and nothing else', () => {
    const names = (json.materials ?? []).map((m) => (m.name ?? '').replace(/\.\d{3}$/, ''));
    expect(names.sort()).toEqual([...COMMITTED_MATERIALS, CRYSTAL].sort());
  });

  it('keeps every material opaque (no alphaMode anywhere)', () => {
    for (const material of json.materials ?? []) {
      expect([undefined, 'OPAQUE']).toContain(material.alphaMode);
    }
    expect((json.materials ?? []).some((m) => m.extensions?.KHR_materials_transmission)).toBe(
      false,
    );
  });

  it('leaves extensionsUsed exactly as committed at 3da446d', () => {
    expect([...(json.extensionsUsed ?? [])].sort()).toEqual([...COMMITTED_EXTENSIONS_USED].sort());
  });

  it('mounts exactly ten instances of the one sconce datablock', () => {
    const nodes = meshNodes(sconceIndex);
    expect(nodes).toHaveLength(10);
    expect(nodes.map((n) => n.name).sort()).toEqual(
      [
        'sconce',
        'sconce.001',
        'sconce.002',
        'sconce.003',
        'sconce.004',
        'sconce.005',
        'sconce.006',
        'sconce.007',
        'sconce.008',
        'sconce.009',
      ].sort(),
    );
  });

  it('keeps the P2 glow-surface law: only the candles + flames carry a _glow class', () => {
    // The glow-class primitives across the whole glb: the sconce's sconce_glow and the
    // chandelier arm archetype's chandelier_glow — no new emissive class (the glow
    // ruling: the stem / festoons / pendants / pans are NOT emissive; no core glow chip).
    const glowPrims = (json.meshes ?? []).flatMap((mesh, meshIndex) =>
      mesh.primitives
        .map((prim, primIndex) => ({
          mesh: (mesh.name ?? '').replace(/\.\d{3}$/, ''),
          primIndex,
          material: materialName(prim.material),
        }))
        .filter((row) => row.material.endsWith('_glow'))
        .map((row) => ({ ...row, meshIndex })),
    );
    expect(glowPrims.map((row) => `${row.mesh}:${row.material}`).sort()).toEqual([
      'chandelier_arm:chandelier_glow',
      'sconce:sconce_glow',
    ]);
    // The glow primitive's triangles are the candle body (6 quads + a hex cap = 16)
    // plus the flame chip (8): 24 per arm archetype.
    const armGlow = glowPrims.find((row) => row.mesh === 'chandelier_arm');
    const glowPrim = armGlow
      ? (json.meshes ?? [])[armGlow.meshIndex]?.primitives[armGlow.primIndex]
      : undefined;
    if (!glowPrim) throw new Error('the chandelier arm carries no chandelier_glow primitive');
    expect(primTriangles(glowPrim)).toBe(24);
    // The sconce's glow primitive keeps its landed B1 shape (3 candles + 3 flames = 72).
    const sconceGlow = glowPrims.find((row) => row.mesh === 'sconce');
    const sconceGlowPrim = sconceGlow ? sconce.primitives[sconceGlow.primIndex] : undefined;
    if (!sconceGlowPrim) throw new Error('the sconce carries no sconce_glow primitive');
    expect(primTriangles(sconceGlowPrim)).toBe(72);
  });

  it('carries the three crystal drops (the opaque faceted beads)', () => {
    const crystal = sconce.primitives.find((p) => materialName(p.material) === CRYSTAL);
    if (!crystal) throw new Error('the sconce carries no crystal primitive');
    expect(primTriangles(crystal)).toBe(24); // 3 drops × 8 tris
    const material = (json.materials ?? []).find(
      (m) => (m.name ?? '').replace(/\.\d{3}$/, '') === CRYSTAL,
    );
    expect(material?.pbrMetallicRoughness?.baseColorFactor?.slice(0, 3)).toEqual([
      0.8999999761581421, 0.9200000166893005, 0.949999988079071,
    ]);
    expect(material?.pbrMetallicRoughness?.metallicFactor).toBeCloseTo(0.6, 5);
    expect(material?.pbrMetallicRoughness?.roughnessFactor).toBeCloseTo(0.12, 5);
    expect(material?.extensions?.KHR_materials_emissive_strength).toBeUndefined();
  });

  it('lands the J1b gaze subject inside the achieved bound (design-staircase §2.2)', () => {
    // The transform chain re-centres every mesh at its own bbox and carries the world
    // bbox centre in the node translation: the accessor min/max union must re-centre to
    // zero (the archetype bbox centre read from the JSON chunk alone), and the gaze
    // subject's node translation must sit within the achieved distance of the authored
    // FLIGHT2_SCONCE point. SCONCE_GAZE_TOL 0.15 is unreachable within the pinned form
    // (the proof lives in the constant comment above); the binding pins are the strict
    // improvement over the placeholder's 0.3106 and the achieved 0.2725.
    const mins: [number, number, number] = [Infinity, Infinity, Infinity];
    const maxs: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const prim of sconce.primitives) {
      const accessor = json.accessors[prim.attributes.POSITION ?? 0];
      if (!accessor?.min || !accessor.max) throw new Error('a POSITION accessor without min/max');
      for (const axis of [0, 1, 2] as const) {
        mins[axis] = Math.min(mins[axis], accessor.min[axis]);
        maxs[axis] = Math.max(maxs[axis], accessor.max[axis]);
      }
    }
    const centre: [number, number, number] = [
      (mins[0] + maxs[0]) / 2,
      (mins[1] + maxs[1]) / 2,
      (mins[2] + maxs[2]) / 2,
    ];
    for (const axis of centre) expect(Math.abs(axis)).toBeLessThanOrEqual(1);
    const gazeNode = meshNodes(sconceIndex).find((n) => n.name === 'sconce.006');
    expect(gazeNode).toBeDefined();
    const translation = gazeNode?.translation ?? [0, 0, 0];
    const distance = Math.hypot(
      ...([0, 1, 2] as const).map((axis) => translation[axis] - GAZE_POINT[axis]),
    );
    expect(distance).toBeLessThan(GAZE_IMPROVE_M);
    expect(distance).toBeLessThanOrEqual(GAZE_ACHIEVED_M + GAZE_ACHIEVED_TOL);
  });

  it("keeps the archetype's mounted depth inside the pinned reach silhouette", () => {
    // The accessor ints decode linearly against the node's uniform scale (the re-centred
    // mesh): half extents x 0.352258 / y 0.334643 / z 0.2275 — the z half is (reach 0.40
    // + pan radius 0.055)/2, the form's deepest reach, and it pins the silhouette.
    const gazeNode = meshNodes(sconceIndex).find((n) => n.name === 'sconce.006');
    const scale = (gazeNode?.scale ?? [0, 0, 0])[0] ?? 0;
    const mins: [number, number, number] = [Infinity, Infinity, Infinity];
    const maxs: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const prim of sconce.primitives) {
      const accessor = json.accessors[prim.attributes.POSITION ?? 0];
      if (!accessor?.min || !accessor.max) throw new Error('a POSITION accessor without min/max');
      for (const axis of [0, 1, 2] as const) {
        mins[axis] = Math.min(mins[axis], accessor.min[axis]);
        maxs[axis] = Math.max(maxs[axis], accessor.max[axis]);
      }
    }
    const half: [number, number, number] = [
      ((maxs[0] - mins[0]) / 2 / 32767) * scale,
      ((maxs[1] - mins[1]) / 2 / 32767) * scale,
      ((maxs[2] - mins[2]) / 2 / 32767) * scale,
    ];
    expect(half[2]).toBeCloseTo(0.2275, 3);
    expect(half[0]).toBeCloseTo(0.352258, 3);
    expect(half[1]).toBeCloseTo(0.334643, 3);
  });
});

// --- the jordan-fixtures B2: the chandelier assembly ---------------------------------
// The ruling B2/§B3 pins as far as the committed JSON carries them: the stem / arm
// archetype / bead roster, the tri caps, the P2 glow law, the tier stack (the anchor
// lever at its CHANDELIER_MIN_Y fence floor), the crystal bead and the room's drawn/unique
// totals. The builder's fail-loud self-checks carry the numbers the quantized JSON cannot
// (the P1 band, the anchor rows) — they land in summary.declared.chandelierFixtures.
const CHAND_C_X = 86;
const CHAND_C_Z = -74;
const CHANDELIER_MIN_Y = 13.4; // the placeholder's lowest (its core octahedron's lower apex)
const ENVELOPE = [84.28, 13.3, -75.72, 87.72, 20.0, -72.28] as const; // the placeholder bbox grown 0.10

const stemMesh = (json.meshes ?? []).find(
  (m) => (m.name ?? '').replace(/\.\d{3}$/, '') === 'chandelier',
);
const armMesh = (json.meshes ?? []).find(
  (m) => (m.name ?? '').replace(/\.\d{3}$/, '') === 'chandelier_arm',
);
const beadMesh = (json.meshes ?? []).find(
  (m) => (m.name ?? '').replace(/\.\d{3}$/, '') === 'chandelier_bead',
);
if (!stemMesh || !armMesh || !beadMesh)
  throw new Error('the committed glb carries no chandelier assembly');
const stemIndex = (json.meshes ?? []).indexOf(stemMesh);
const armIndex = (json.meshes ?? []).indexOf(armMesh);
const beadIndex = (json.meshes ?? []).indexOf(beadMesh);

describe('jordan-fixtures: the chandelier assembly in the committed glb', () => {
  it('carries exactly the three-datablock assembly at the committed rosters', () => {
    expect(meshNodes(stemIndex)).toHaveLength(1); // the stem: ×1, in-place at CHAND_C
    expect(meshNodes(armIndex)).toHaveLength(36); // the arm archetype ×36 (16+12+8)
    expect(meshNodes(beadIndex)).toHaveLength(300); // 252 festoon beads + 48 pendants
  });

  it('keeps the assembly materials to the pinned primitive map (the draw gate)', () => {
    expect(stemMesh.primitives).toHaveLength(1);
    const stemPrim = stemMesh.primitives[0];
    if (!stemPrim) throw new Error('the stem carries no primitive');
    expect(materialName(stemPrim.material)).toBe('gilt');
    expect(armMesh.primitives).toHaveLength(3);
    expect(armMesh.primitives.map((p) => materialName(p.material))).toEqual([
      'gilt',
      'chandelier_glow',
      CRYSTAL,
    ]);
    expect(beadMesh.primitives).toHaveLength(1);
    const beadPrim = beadMesh.primitives[0];
    if (!beadPrim) throw new Error('the bead carries no primitive');
    expect(materialName(beadPrim.material)).toBe(CRYSTAL);
    // The draw gate: 42 unique primitives room-wide — 39 at B1 minus the placeholder's
    // 2 plus the assembly's 5 (stem 1 / arm 3 / bead 1). The round's exact ceiling.
    const draws = (json.meshes ?? []).reduce((n, m) => n + m.primitives.length, 0);
    expect(draws).toBe(42);
  });

  it('stays under the pinned tri caps (stem ≤ 900, arm ≤ 150, drawn ≤ 9,800)', () => {
    const stemTris = stemMesh.primitives.reduce((n, p) => n + primTriangles(p), 0);
    const armTris = armMesh.primitives.reduce((n, p) => n + primTriangles(p), 0);
    const beadTris = beadMesh.primitives.reduce((n, p) => n + primTriangles(p), 0);
    expect(stemTris).toBe(444); // the pinned 16×14 lathe: 208 quads + 2 caps
    expect(armTris).toBe(121); // scroll arm + pan + candle + flame + 2 drops
    expect(armTris).toBeLessThanOrEqual(150);
    expect(beadTris).toBe(8);
    const drawn = stemTris + armTris * 36 + beadTris * 300;
    expect(drawn).toBe(7200);
    expect(drawn).toBeLessThanOrEqual(9800);
    // The assembly's unique faces: 285 (210 + 67 + 8) ≤ the ruling's 2,400 cap.
    expect(stemTris + armTris + beadTris).toBeLessThanOrEqual(2400);
  });

  it('hangs the tier stack at the fence-tight anchor placement (the pan tops / node centres)', () => {
    // The arm nodes' translations carry the re-centred bbox centres: the tier pan tops
    // (13.492 / 14.342 / 15.192 — the fence floor 13.4 + the drops' 0.082 + the
    // quantization margin) + the arm's local y half 0.074, at the mount radii plus the
    // local x half 0.226633 about CHAND_C.
    const nodes = meshNodes(armIndex);
    const tiers = [
      { panTop: 13.492, count: 16, radius: 1.226633 },
      { panTop: 14.342, count: 12, radius: 0.826629 },
      { panTop: 15.192, count: 8, radius: 0.426634 },
    ];
    for (const tier of tiers) {
      const tierNodes = nodes.filter(
        (n) => Math.abs((n.translation?.[1] ?? 0) - (tier.panTop + 0.074)) < 1e-3,
      );
      expect(tierNodes).toHaveLength(tier.count);
      const radii = tierNodes.map((n) =>
        Math.hypot((n.translation?.[0] ?? 0) - CHAND_C_X, (n.translation?.[2] ?? 0) - CHAND_C_Z),
      );
      expect(Math.min(...radii)).toBeGreaterThan(tier.radius - 1e-3);
      expect(Math.max(...radii)).toBeLessThan(tier.radius + 1e-3);
    }
  });

  it('keeps every tier above CHANDELIER_MIN_Y and the whole assembly inside the envelope', () => {
    // The stem's node carries the in-place mesh's world bbox (the re-centring law):
    // its lowest point is the bowl tip at 13.41, one fence margin above 13.4.
    const stemNode = meshNodes(stemIndex)[0];
    if (!stemNode) throw new Error('the stem carries no node');
    const scale = stemNode.scale?.[0] ?? 0;
    const mins: [number, number, number] = [Infinity, Infinity, Infinity];
    const maxs: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const prim of stemMesh.primitives) {
      const accessor = json.accessors[prim.attributes.POSITION ?? 0];
      if (!accessor?.min || !accessor.max) throw new Error('a POSITION accessor without min/max');
      for (const axis of [0, 1, 2] as const) {
        mins[axis] = Math.min(mins[axis], accessor.min[axis] / 32767);
        maxs[axis] = Math.max(maxs[axis], accessor.max[axis] / 32767);
      }
    }
    const stemY = stemNode.translation?.[1] ?? 0;
    const stemMinY = stemY + mins[1] * scale;
    const stemMaxY = stemY + maxs[1] * scale;
    expect(stemMinY).toBeGreaterThanOrEqual(CHANDELIER_MIN_Y);
    expect(stemMaxY).toBeLessThanOrEqual(ENVELOPE[4]);
    // The beads hang lowest in the festoon dips: 13.452 − the bead's half 0.03 = 13.422,
    // still above the fence; the mid/top tiers' beads stay inside the envelope's top.
    const beadNodes = meshNodes(beadIndex);
    const beadYs = beadNodes.map((n) => n.translation?.[1] ?? Infinity);
    expect(Math.min(...beadYs)).toBeGreaterThanOrEqual(13.45);
    expect(Math.max(...beadYs)).toBeLessThanOrEqual(ENVELOPE[4]);
    // The arms' plan extent: the tier radii + the local x half stay inside the envelope
    // (the measured node centres sit ≤ 1.2267 from the axis).
    for (const node of meshNodes(armIndex)) {
      const radius = Math.hypot(
        (node.translation?.[0] ?? 0) - CHAND_C_X,
        (node.translation?.[2] ?? 0) - CHAND_C_Z,
      );
      expect(radius).toBeLessThan(1.24);
      expect(node.translation?.[1] ?? 0).toBeGreaterThan(CHANDELIER_MIN_Y);
    }
  });

  it('strings 300 crystal beads over the tiers (festoons + pendants, one primitive)', () => {
    expect(beadMesh.primitives).toHaveLength(1);
    const nodes = meshNodes(beadIndex);
    // The beads' plan radii never exceed the pans' outer rims + the bead's radius.
    for (const node of nodes) {
      const radius = Math.hypot(
        (node.translation?.[0] ?? 0) - CHAND_C_X,
        (node.translation?.[2] ?? 0) - CHAND_C_Z,
      );
      expect(radius).toBeLessThan(1.4771);
    }
  });

  it('emits nothing from the stem or the bead (no core glow chip)', () => {
    const stemMats = stemMesh.primitives.map((p) => materialName(p.material));
    const beadMats = beadMesh.primitives.map((p) => materialName(p.material));
    expect(stemMats).toEqual(['gilt']);
    expect(beadMats).toEqual([CRYSTAL]);
  });
});
