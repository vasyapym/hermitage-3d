// Facade builder gates — relay round 7 (tests written by the orchestrator).
// The chain is real: the frozen spec is solved, then built.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import {
  buildFacade,
  countTriangles,
  FACADE_COLORS,
  type FacadeBuild,
  getPartGeometry,
  surroundOpening,
} from '../src/procedural/facade-builder';
import type { PartId } from '../src/procedural/facade-solver';
import { KIT, PART_IDS, solveSouthFacade } from '../src/procedural/facade-solver';

function solveOk() {
  const result = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
  if (!result.ok) throw new Error(`solve failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

function buildOk(): FacadeBuild {
  return buildFacade(solveOk());
}

const build = buildOk();

describe('facade builder', () => {
  it('creates one InstancedMesh per populated part, in catalogue order', () => {
    expect(build.meshes).toHaveLength(20);
    const populated = PART_IDS.filter((partId) => build.meshes.some((m) => m.name === partId));
    expect(build.meshes.map((m) => m.name)).toEqual(populated);
    expect(build.group.name).toBe('FacadeKit');
    expect(build.group.children).toHaveLength(20);
  });

  it('matches the solver instance counts per part', () => {
    const solved = solveOk();
    for (const mesh of build.meshes) {
      const partId = mesh.name as PartId;
      expect(mesh.count).toBe(solved.byPart[partId].length);
    }
    expect(build.instanceTotal).toBe(659);
  });

  it('stays under every KIT triangle ceiling', () => {
    for (const mesh of build.meshes) {
      const partId = mesh.name as PartId;
      const tris = countTriangles(mesh.geometry);
      expect(tris).toBeLessThanOrEqual(KIT[partId].triangleCeiling);
      expect(build.trianglesByPart[partId]).toBe(tris);
    }
  });

  it('carries a kit row and a builder for every emitted part', () => {
    for (const partId of PART_IDS) expect(KIT[partId]).toBeDefined();
    const emitted = new Set(solveOk().placements.map((placement) => placement.partId));
    for (const partId of emitted) expect(() => getPartGeometry(partId)).not.toThrow();
  });

  it('decodes instance matrices back to the solver placements', () => {
    const solved = solveOk();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (const mesh of build.meshes) {
      const placements = solved.byPart[mesh.name as PartId];
      expect(placements).toHaveLength(mesh.count);
      for (let i = 0; i < mesh.count; i++) {
        const placement = placements[i];
        if (placement === undefined) throw new Error('placement missing');
        mesh.getMatrixAt(i, matrix);
        matrix.decompose(position, quaternion, scale);
        expect(position.x).toBeCloseTo(placement.position.x, 4); // float32 instance storage
        expect(position.y).toBeCloseTo(placement.position.y, 4);
        expect(position.z).toBeCloseTo(placement.position.z, 4);
        expect(scale.x).toBeCloseTo(placement.scale.x, 4);
        expect(scale.y).toBeCloseTo(placement.scale.y, 4);
        expect(scale.z).toBeCloseTo(placement.scale.z, 4);
        expect(quaternion.w).toBeGreaterThan(0);
      }
    }
  });

  it('shares exactly one material across all kit meshes', () => {
    const materials = new Set(build.meshes.map((mesh) => mesh.material));
    expect(materials.size).toBe(1);
    expect(build.material.vertexColors).toBe(true);
    expect(build.material.name).toBe('FacadeKit');
  });

  it('carries a linear colour attribute on every kit geometry', () => {
    for (const mesh of build.meshes) {
      const color = mesh.geometry.getAttribute('color');
      const position = mesh.geometry.getAttribute('position');
      expect(color?.itemSize).toBe(3);
      expect(color?.count).toBe(position.count);
      for (const value of [color.getX(0), color.getY(0), color.getZ(0)]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('marks kit meshes for shadow casting and receiving', () => {
    for (const mesh of build.meshes) {
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);
    }
  });

  it('memoizes part geometry and builds deterministically', () => {
    const partId = 'surround-row3-large' as PartId;
    expect(getPartGeometry(partId)).toBe(getPartGeometry(partId));
    const a = buildOk();
    const b = buildOk();
    expect(a.instanceTotal).toBe(b.instanceTotal);
    for (let i = 0; i < a.meshes.length; i++) {
      const meshA = a.meshes[i];
      const meshB = b.meshes[i];
      if (meshA === undefined || meshB === undefined) throw new Error('mesh missing');
      const ma = Array.from(meshA.instanceMatrix.array as Float32Array);
      const mb = Array.from(meshB.instanceMatrix.array as Float32Array);
      expect(ma).toEqual(mb);
    }
  });

  it('throws on unknown parts and empty input', () => {
    expect(() => getPartGeometry('surround-row1-medium' as PartId)).toThrow(/no geometry defined/);
    const byPart: Record<string, readonly never[]> = {};
    for (const partId of PART_IDS) byPart[partId] = [];
    expect(() =>
      buildFacade({
        ...solveOk(),
        placements: [],
        byPart: byPart as never,
      }),
    ).toThrow(/no placements/);
  });

  it('exposes the stylized palette constants', () => {
    expect(FACADE_COLORS.dressings).toBe(0xf2f0e8);
    expect(FACADE_COLORS.recess).toBe(0x23262b);
    expect(FACADE_COLORS.gold).toBe(0xc9a227);
    expect(FACADE_COLORS.paleStone).toBe(0xded9cc);
  });

  it('counts a box as 12 triangles', () => {
    expect(countTriangles(getPartGeometry('sill' as PartId))).toBe(12);
  });

  it('exposes the recess-panel rect for the populated surround parts (DEC-019 lattice)', () => {
    const ids = [
      'surround-row1-small',
      'surround-row2-large',
      'surround-row3-large',
      'surround-row4-small',
    ] as const;
    for (const id of ids) {
      const opening = surroundOpening(id);
      expect(opening.width).toBeGreaterThan(0);
      expect(opening.height).toBeGreaterThan(0);
      // the panel is a thin sheet at the back of the reveal (rd = min(0.05, sz/4))
      expect(opening.depth).toBeGreaterThan(0);
      expect(opening.depth).toBeLessThanOrEqual(0.05);
    }
  });

  it('throws on a non-surround part in surroundOpening', () => {
    expect(() => surroundOpening('sill' as PartId)).toThrow(/not a surround part/);
  });
});
