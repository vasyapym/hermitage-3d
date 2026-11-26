// src/world/shadow-depth.ts
/**
 * sq-shadow-dirt R1 — the slope-scaled CASTER bias, riding DEC-054's committed sun-shadow
 * rig (the ±130 m fit, the PCF map, the E(h) strength) without touching any of its rows.
 *
 * ONE shared MeshDepthMaterial assigned as `customDepthMaterial` on every facade-kit mesh
 * whose ONE castShadow law (facade-solver's PartMeta) ends up true — the socle's authored
 * opt-out receives neither the material nor the shadow pass. Verified against three r186:
 * `WebGLShadowMap.getDepthMaterial` reads `object.customDepthMaterial` per shadow draw and
 * copies the caster's `side` onto it per call, so a single shared instance serves every
 * FrontSide caster, InstancedMesh included — the same sharing three's own `_depthMaterial`
 * relies on.
 *
 * The polygon offset mirrors the r186 `WebGLShadowMap` `_depthMaterial` constructor options
 * (factor 1.4 / units 4, the review pass's F2 mechanics): each caster polygon is pushed
 * deeper in the sun's depth map by factor × its own per-texel depth slope — exactly the
 * error term a constant receiver bias cannot track (the coplanar wall faces' acne at
 * grazing θ). R3's receiver-bias re-pick lands in the same change-set and covers only the
 * quantisation + bilinear residual this leaves.
 *
 * World module: three is the point (a Material instance); no DOM, no clock.
 */
import * as THREE from 'three';

export const SUN_DEPTH_MATERIAL = new THREE.MeshDepthMaterial({
  polygonOffset: true,
  polygonOffsetFactor: 1.4,
  polygonOffsetUnits: 4,
});
