// src/world/caster-gate.ts
/**
 * sq-t0-residue R5 — «cast form, not texture»: the t0 caster gate.
 *
 * A kit part casts only when its proudness (the PartMeta castProud — the part's projection from
 * its mounting plane, the kit's own geometry constant) reaches the effective map's drawable
 * minimum (shadowCasterMinTexels × the texel size): what the map cannot draw is noise, not
 * shadow — the architraves' and mouldings' thread shadows alias into the wide-view mess at the
 * grazing instants (the light runs ~13° along the facade, a proud part p throws a ≈4p streak).
 *
 * The gate is a cull flag per kit mesh (the proudness and the castShadow law ride the mesh's
 * userData, attached at the builder) — no recompile, one sweep per settle; it works for
 * instanced kits (the flag rides the mesh, the instance draw follows). Non-kit objects (the
 * massing, the Column, the pedestal) are untouched — they cast by their own laws. The PartMeta
 * castShadow law stays the outer bound: the socle's opt-out holds at any minProud.
 */
import type * as THREE from 'three';

const GATED = new WeakMap<THREE.Object3D, boolean>();

export function applyCasterGate(scene: THREE.Scene, minProud: number): void {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const data = mesh.userData as { castProud?: number; castShadowLaw?: boolean };
    if (typeof data.castProud !== 'number') return; // non-kit: untouched
    const gate = data.castProud >= minProud && data.castShadowLaw === true;
    if (GATED.get(mesh) === gate) return;
    mesh.castShadow = gate;
    GATED.set(mesh, gate);
  });
}
