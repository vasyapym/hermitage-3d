import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyCasterGate } from '../src/world/caster-gate';

/** A kit-style mesh: the proudness and the castShadow law ride the userData (the builder attaches them). */
const kitMesh = (castProud: number, castShadowLaw: boolean): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry());
  mesh.userData.castProud = castProud;
  mesh.userData.castShadowLaw = castShadowLaw;
  mesh.castShadow = castShadowLaw;
  return mesh;
};

const sceneWith = (...meshes: readonly THREE.Mesh[]): THREE.Scene => {
  const scene = new THREE.Scene();
  for (const mesh of meshes) scene.add(mesh);
  return scene;
};

describe('the caster gate (R5 — «cast form, not texture»)', () => {
  it("drops the sub-minimum proudness and keeps the law-respecting ones (the ruling's thresholds)", () => {
    // at the 4096 map: minProud = 2 × 260 / 4096 ≈ 0.127 — the ground-arch's 0.10 goes off,
    // the sill's 0.4 stays on; the socle's law (castShadow false) holds at any minProud.
    const arch = kitMesh(0.1, true);
    const sill = kitMesh(0.4, true);
    const socle = kitMesh(0.35, false);
    const massing = new THREE.Mesh(new THREE.BoxGeometry()); // non-kit: untouched
    massing.castShadow = true;
    const scene = sceneWith(arch, sill, socle, massing);
    applyCasterGate(scene, 0.127);
    expect(arch.castShadow).toBe(false);
    expect(sill.castShadow).toBe(true);
    expect(socle.castShadow).toBe(false);
    expect(massing.castShadow).toBe(true);
  });
  it('at the 2048 clamp the gate widens to 0.254 m (the Android path)', () => {
    const surround = kitMesh(0.32, true);
    const groundArch = kitMesh(0.1, true);
    const scene = sceneWith(surround, groundArch);
    applyCasterGate(scene, 0.254);
    expect(surround.castShadow).toBe(true);
    expect(groundArch.castShadow).toBe(false);
  });
  it('the gate off (minProud 0, the sp=0 arm) restores every law-caster', () => {
    const arch = kitMesh(0.1, true);
    const scene = sceneWith(arch);
    applyCasterGate(scene, 0.127);
    expect(arch.castShadow).toBe(false);
    applyCasterGate(scene, 0);
    expect(arch.castShadow).toBe(true);
  });
});
