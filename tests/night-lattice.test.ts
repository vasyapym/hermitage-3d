/*
 * Night lattice builder (DEC-019; ROADMAP Phase 2b). Node Vitest; three core only, no DOM.
 */
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  StaticDrawUsage,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { RECESS_HEX, surroundOpening } from '../src/procedural/facade-builder';
import type { Placement } from '../src/procedural/facade-solver';
import { buildNightLattice, type LatticeSource } from '../src/procedural/night-lattice';
import {
  DARK_PANE_TONE,
  K_LEVEL,
  PANE_LEVELS,
  PANE_STANDOFF,
  PEAK_EMISSIVE_INTENSITY,
} from '../src/world/night-facade';

const SURROUND_PARTS = [
  'surround-row1-small',
  'surround-row2-large',
  'surround-row3-large',
  'surround-row4-small',
] as const;
const PER_PART = 6;
const vec = (x: number, y: number, z: number): Placement['position'] => ({ x, y, z });
/** Fixture-only: mints a part id the solver does not emit today (one deliberate cast). */
const ghostPartId = (id: string): Placement['partId'] => id as unknown as Placement['partId'];
function placement(
  partId: Placement['partId'],
  id: string,
  position: Placement['position'],
  rotationY = 0,
): Placement {
  return { id, partId, position, rotationY, scale: vec(1, 1, 1) };
}
function surroundFixture(): Placement[] {
  const out: Placement[] = [];
  for (const [row, partId] of SURROUND_PARTS.entries()) {
    for (let i = 0; i < PER_PART; i += 1) {
      out.push(placement(partId, `${partId}:${i}`, vec(i * 4, row * 5, 0)));
    }
  }
  return out;
}
const source = (placements: readonly Placement[]) => ({ placements }) satisfies LatticeSource;

const darkToneHex = new Color().setRGB(...DARK_PANE_TONE).getHex();

describe('night-lattice: structure', () => {
  it('builds one InstancedMesh per level, in level order, inside one group', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    expect(lattice.group.children).toHaveLength(PANE_LEVELS.length);
    for (const [i, level] of PANE_LEVELS.entries()) {
      const child = lattice.group.children[i];
      expect(child).toBe(lattice.meshes[level]);
      expect(child).toBeInstanceOf(InstancedMesh);
      expect(lattice.materials[level]).toBeInstanceOf(MeshStandardMaterial);
      expect(lattice.meshes[level].material).toBe(lattice.materials[level]);
    }
  });
  it('instances exactly the surround placements and ignores other parts', () => {
    const surrounds = surroundFixture();
    const ghost = placement(ghostPartId('pilaster-fixture'), 'pilaster:0', vec(99, 0, 0));
    const lattice = buildNightLattice(source([...surrounds, ghost]));
    const total = PANE_LEVELS.reduce((n, level) => n + lattice.meshes[level].count, 0);
    expect(total).toBe(surrounds.length);
    expect(lattice.levelById.size).toBe(surrounds.length);
    expect(lattice.levelById.has('pilaster:0')).toBe(false);
    for (const level of PANE_LEVELS) {
      expect(lattice.counts[level]).toBe(lattice.meshes[level].count);
      const mapped = [...lattice.levelById.values()].filter((l) => l === level).length;
      expect(lattice.counts[level]).toBe(mapped);
    }
  });
  it('is deterministic: two builds agree on every level and matrix, order-independent', () => {
    const a = buildNightLattice(source(surroundFixture()));
    const b = buildNightLattice(source(surroundFixture()));
    const reversed = buildNightLattice(source([...surroundFixture()].reverse()));
    for (const [id, level] of a.levelById) {
      expect(b.levelById.get(id)).toBe(level);
      expect(reversed.levelById.get(id)).toBe(level);
    }
    for (const level of PANE_LEVELS) {
      expect(Array.from(a.meshes[level].instanceMatrix.array)).toEqual(
        Array.from(b.meshes[level].instanceMatrix.array),
      );
    }
  });
  it('is shadow-free, static, bounded, stock material, recess base colour', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    for (const level of PANE_LEVELS) {
      const mesh = lattice.meshes[level];
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
      expect(mesh.instanceMatrix.usage).toBe(StaticDrawUsage);
      expect(mesh.boundingSphere).not.toBeNull();
      expect(lattice.materials[level].type).toBe('MeshStandardMaterial');
      // The facade-shadow round (2026-11-17): the dark pane's albedo lifted off the
      // recess's near-black — the dim tone law, not the «indistinguishable» law.
      expect(lattice.materials[level].color.getHex()).toBe(
        level === 'dark' ? darkToneHex : RECESS_HEX,
      );
    }
  });
});

describe('night-lattice: pane frame', () => {
  function soloMatrix(rotationY: number): Matrix4 {
    const partId = SURROUND_PARTS[0];
    const lattice = buildNightLattice(
      source([placement(partId, 'solo', vec(10, 2, 5), rotationY)]),
    );
    const level = lattice.levelById.get('solo');
    if (level === undefined) {
      throw new Error('solo pane was not assigned a level');
    }
    const m = new Matrix4();
    lattice.meshes[level].getMatrixAt(0, m);
    return m;
  }
  it('sits centred on the recess panel, PANE_STANDOFF in front of its face', () => {
    const { width, height, depth } = surroundOpening(SURROUND_PARTS[0]);
    const pos = new Vector3();
    const scl = new Vector3();
    // instance matrices are stored float32 — 5 decimals (10 µm) already pin the frame
    soloMatrix(0).decompose(pos, new Quaternion(), scl);
    expect(pos.x).toBeCloseTo(10, 5);
    expect(pos.y).toBeCloseTo(2 + height / 2, 5);
    expect(pos.z).toBeCloseTo(5 + depth + PANE_STANDOFF, 5);
    expect(scl.x).toBeCloseTo(width, 5);
    expect(scl.y).toBeCloseTo(height, 5);
    expect(scl.z).toBeCloseTo(1, 5);
  });
  it('turns with the placement: rotationY = π/2 swings the stand-off onto +x', () => {
    const { height, depth } = surroundOpening(SURROUND_PARTS[0]);
    const pos = new Vector3();
    soloMatrix(Math.PI / 2).decompose(pos, new Quaternion(), new Vector3());
    expect(pos.x).toBeCloseTo(10 + depth + PANE_STANDOFF, 5);
    expect(pos.y).toBeCloseTo(2 + height / 2, 5);
    expect(pos.z).toBeCloseTo(5, 5);
  });
});

describe('night-lattice: setNight', () => {
  it('starts hidden and unlit, matching the day/dusk frame', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    expect(lattice.group.visible).toBe(false);
    for (const level of PANE_LEVELS) {
      expect(lattice.materials[level].emissiveIntensity).toBe(0);
    }
  });
  it('flips on for any wNight > 0 and back off at exactly 0', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    lattice.setNight(Number.MIN_VALUE);
    expect(lattice.group.visible).toBe(true);
    lattice.setNight(0);
    expect(lattice.group.visible).toBe(false);
    for (const level of PANE_LEVELS) {
      expect(lattice.materials[level].emissiveIntensity).toBe(0);
    }
  });
  it('drives emissive intensity as K_LEVEL[level] * wNight', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    for (const w of [0.25, 0.5, 1]) {
      lattice.setNight(w);
      expect(lattice.group.visible).toBe(true);
      expect(lattice.materials.dark.emissiveIntensity).toBe(0);
      expect(lattice.materials.dim.emissiveIntensity).toBe(K_LEVEL.dim * w);
      expect(lattice.materials.bright.emissiveIntensity).toBe(K_LEVEL.bright * w);
    }
    expect(lattice.materials.bright.emissiveIntensity).toBe(PEAK_EMISSIVE_INTENSITY);
  });
  it('keeps the dark level at the dim-tone law inside night frames', () => {
    const lattice = buildNightLattice(source(surroundFixture()));
    lattice.setNight(1);
    // The facade-shadow round's law: the dark pane reads the wall dressing at half the
    // response (the dim tone), never the recess's near-black — the black cards printed
    // as impossible shadows on the hemisphere's warm-lit wall band (the owner's sighting).
    expect(lattice.materials.dark.color.getHex()).toBe(darkToneHex);
    expect(lattice.materials.dark.emissive.getHex()).toBe(0);
    expect(lattice.materials.dark.emissiveIntensity).toBe(0);
  });
});

describe('night-lattice: loud failure', () => {
  it('throws when a surround part reaches the builder without a surroundOpening', () => {
    const ghost = placement(ghostPartId('surround-row9-ghost'), 'ghost:0', vec(0, 0, 0));
    expect(() => buildNightLattice(source([ghost]))).toThrow(/surroundOpening/);
  });
});
