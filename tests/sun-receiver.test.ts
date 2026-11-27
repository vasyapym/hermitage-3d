import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applySunReceiver, setSunReceiverCap } from '../src/world/sun-receiver';

const FAKE_SHADER =
  '#include <shadowmap_pars_fragment>\nvoid main(){}\n#include <lights_fragment_begin>\n';

const materialOn = (
  mode: 'stock' | 'smooth' | 'plane' | 'cubic',
  force = false,
): THREE.MeshBasicMaterial => {
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  mesh.receiveShadow = true;
  const scene = new THREE.Scene();
  scene.add(mesh);
  applySunReceiver(scene, mode, force);
  return material;
};

const compiledFragment = (material: THREE.MeshBasicMaterial): string => {
  const shader = { fragmentShader: FAKE_SHADER, vertexShader: 'void main(){}\n' };
  (material.onBeforeCompile as (s: typeof shader) => void)(shader as never);
  return shader.fragmentShader;
};

describe('the sun receiver variant (R4/R5)', () => {
  it('patches receiving materials: the centred plane GLSL, the call-site rename, the distinct cache key', () => {
    const material = materialOn('plane');
    expect(material.onBeforeCompile).toBeTypeOf('function');
    expect(material.customProgramCacheKey?.()).toContain('zimny-sun-receiver-plane');
    const fragment = compiledFragment(material);
    expect(fragment).toContain('zimnySunGetShadow');
    expect(fragment).toContain('#define ZIMNY_SUN_PLANE');
    expect(fragment).toContain('#define getShadow zimnySunGetShadow');
    // R5 centring: base = floor(sTexels) - 1 — the kernel reads ⅛,¾,⅛ centred at the phase ½
    // (the shipped R4 read ½,½,0 one texel high — every t0 shadow displaced +½ texel)
    expect(fragment).toContain('vec2 base = floor( sTexels ) - 1.0;');
    expect(fragment).toContain('float offX = float( i ) - 0.5 - phase.x;');
    // the nine hardware-compares blended — the depths never blend
    expect(fragment).toContain(
      'shadow += wx * wy * texture( shadowMap, vec3( tapUv, reference ) );',
    );
  });
  it('smooth filters without the plane correction; the centring fix rides it too', () => {
    const material = materialOn('smooth');
    const fragment = compiledFragment(material);
    expect(fragment).toContain('zimnySunGetShadow');
    expect(fragment).not.toContain('#define ZIMNY_SUN_PLANE');
    expect(fragment).toContain('vec2 base = floor( sTexels ) - 1.0;');
  });
  it('cubic is the escalation arm: the 4x4 centred kernel with the plane correction', () => {
    const material = materialOn('cubic');
    expect(material.customProgramCacheKey?.()).toContain('zimny-sun-receiver-cubic');
    const fragment = compiledFragment(material);
    expect(fragment).toContain('#define ZIMNY_SUN_PLANE');
    expect(fragment).toContain('for ( int j = 0; j < 4; j ++ )');
    // the cubic B-spline weights (the ruling's exact forms)
    expect(fragment).toContain('( 3.0 * t * t * t - 6.0 * t * t + 4.0 ) / 6.0');
    expect(fragment).toContain('float offX = float( i ) - 1.0 - t;');
  });
  it('the cap is kernel-scaled and armable: setSunReceiverCap re-keys and re-patches', () => {
    setSunReceiverCap(1.0);
    const material = materialOn('plane');
    expect(material.customProgramCacheKey?.()).toContain('-1');
    expect(compiledFragment(material)).toContain('4.7619047619e-4');
    setSunReceiverCap(0.5);
    const back = materialOn('plane');
    // the cap change re-patches on the next sweep (the cache key carries the cap)
    expect(back.customProgramCacheKey?.()).toContain('-0.5');
    expect(compiledFragment(back)).toContain('2.3809523810e-4');
  });
  it("stock restores the stock hooks (three's defaults, no zimny)", () => {
    const restored = materialOn('stock');
    expect(String(restored.customProgramCacheKey?.())).not.toContain('zimny-sun-receiver');
    expect(String(restored.onBeforeCompile)).not.toContain('zimnySunGetShadow');
  });
  it('skips non-receiving meshes entirely', () => {
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    const scene = new THREE.Scene();
    scene.add(mesh);
    applySunReceiver(scene, 'plane', false);
    expect(String(material.onBeforeCompile)).not.toContain('zimnySunGetShadow');
  });
});
