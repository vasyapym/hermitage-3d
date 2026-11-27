import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applySunReceiver } from '../src/world/sun-receiver';

const FAKE_SHADER =
  '#include <shadowmap_pars_fragment>\nvoid main(){}\n#include <lights_fragment_begin>\n';

const materialOn = (mode: 'stock' | 'smooth' | 'plane', force = false): THREE.MeshBasicMaterial => {
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  mesh.receiveShadow = true;
  const scene = new THREE.Scene();
  scene.add(mesh);
  applySunReceiver(scene, mode, force);
  return material;
};

describe('the sun receiver variant', () => {
  it('patches receiving materials: the plane GLSL, the call-site rename, the distinct cache key', () => {
    const material = materialOn('plane');
    expect(material.onBeforeCompile).toBeTypeOf('function');
    expect(material.customProgramCacheKey?.()).toBe('zimny-sun-receiver-plane');
    const shader = { fragmentShader: FAKE_SHADER, vertexShader: 'void main(){}\n' };
    (material.onBeforeCompile as (s: typeof shader) => void)(shader as never);
    expect(shader.fragmentShader).toContain('zimnySunGetShadow');
    expect(shader.fragmentShader).toContain('ZIMNY_SUN_PLANE');
    expect(shader.fragmentShader).toContain('#define getShadow zimnySunGetShadow');
    // the B-spline comparison filter: nine taps, the results blended — the depths never blend
    expect(shader.fragmentShader).toContain(
      'shadow += wx * wy * texture( shadowMap, vec3( tapUv, reference ) );',
    );
  });
  it('smooth filters without the plane correction; stock restores the stock hooks', () => {
    const material = materialOn('smooth');
    const shader = { fragmentShader: FAKE_SHADER, vertexShader: 'void main(){}\n' };
    (material.onBeforeCompile as (s: typeof shader) => void)(shader as never);
    expect(shader.fragmentShader).toContain('zimnySunGetShadow');
    expect(shader.fragmentShader).not.toContain('#define ZIMNY_SUN_PLANE');
    applySunReceiver(new THREE.Scene(), 'stock', false);
    const restored = materialOn('stock');
    // the stock hooks: three's default cache key (the onBeforeCompile's own source) — no zimny key
    expect(String(restored.customProgramCacheKey?.())).not.toContain('zimny-sun-receiver');
    expect(String(restored.onBeforeCompile)).not.toContain('zimnySunGetShadow');
  });
  it('skips non-receiving meshes entirely', () => {
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    const scene = new THREE.Scene();
    scene.add(mesh);
    applySunReceiver(scene, 'plane', false);
    // three's default no-op hook, untouched — the patch never reached it
    expect(String(material.onBeforeCompile)).not.toContain('zimnySunGetShadow');
  });
});
