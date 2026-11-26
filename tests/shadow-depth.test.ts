// tests/shadow-depth.test.ts
/**
 * sq-shadow-dirt R1 — the shared caster depth material's pins: the module exports ONE
 * MeshDepthMaterial carrying the polygon offset the slope-scaled caster bias rides
 * (mirrors the r186 WebGLShadowMap `_depthMaterial` options; the review pass's F2).
 */
import { MeshDepthMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { SUN_DEPTH_MATERIAL } from '../src/world/shadow-depth';

describe('sq-shadow-dirt R1 — the shared caster depth material', () => {
  it('is the one shared MeshDepthMaterial with the r186 polygon-offset options', () => {
    expect(SUN_DEPTH_MATERIAL).toBeInstanceOf(MeshDepthMaterial);
    expect(SUN_DEPTH_MATERIAL.polygonOffset).toBe(true);
    expect(SUN_DEPTH_MATERIAL.polygonOffsetFactor).toBe(1.4);
    expect(SUN_DEPTH_MATERIAL.polygonOffsetUnits).toBe(4);
  });
});
