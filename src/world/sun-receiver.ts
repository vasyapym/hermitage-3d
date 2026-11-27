// src/world/sun-receiver.ts
/**
 * sq-t0-residue R4/R5 — the sun receiver variant (the brief 33/34 rulings).
 *
 * The 3x3 fractional-phase quadratic B-spline filter over the comparison RESULTS (R4): a moving
 * shadow edge gets a continuous transition — the map's texel staircase stops reading on screen.
 * The plane mode adds the receiver-plane depth correction per tap (the Isidoro receiver-plane
 * technique): the screen derivatives of the post-divide shadow coord give the receiver's depth
 * gradient; each tap then compares against the receiver PLANE evaluated at that texel centre —
 * the false comparisons on grazing plaster die, because the reference depth tracks the surface
 * across the kernel instead of staying at the centre's depth.
 *
 * R5 fixes the R4 filter's two shipped defects:
 * - the centring: the R4 weights sat one texel high (at a texel centre the kernel read ½,½,0 on
 *   n,n+1,n+2 instead of ⅛,¾,⅛ on n−1,n,n+1) — every t0 shadow was displaced +½ texel in u and
 *   v (≈6 cm, ≈28 cm along the grazing wall), sills read unseated. The centred form: sTexels =
 *   uv·size; base = floor(sTexels) − 1; phase = sTexels − floor(sTexels); the taps at
 *   (base + i + 0.5)/size; the offsets i − 0.5 − phase. At the phase ½ the kernel reads
 *   ⅛,¾,⅛ centred on the sample; the shadow field returns to the stock path's position.
 * - the plane cap: the R4 ±0.25 m was below the plane's own depth change across the kernel on
 *   the grazing wall (≈1.5 tex × 12.7 cm × cot13° ≈ 0.8 m) — the outer taps clamped and
 *   disagreed on the edge → ripple. The cap scales with the kernel: capMetres 0.5 default
 *   (≈2 tex × 6.3 cm × cot13° ≈ 0.55 m at 4096), armable (sc=).
 *
 * The cubic mode (the escalation arm, R5): the 4×4 cubic B-spline (16 texel-centre compares)
 * with the plane correction — a wider, flatter transition for the still-square edge case.
 *
 * The variant rides onBeforeCompile per receiving material with a distinct program cache key
 * (per mode AND cap); the stock hooks restore on leaving t0. The patch CHAINS with any
 * pre-existing hook (the ground-slot fix, 2026-11-28): the material's own onBeforeCompile —
 * the ground's snow/paving slot, the kit's uSnow + facade-surface slots — is saved per
 * material, called first on every compile, and restored verbatim on clear; the receiver's
 * replaces run after the original's splices on the same shader object, and the cache key
 * composes (original key | receiver key) so the slot programs never collide. No global
 * shader-chunk edit: the
 * `#define getShadow zimnySunGetShadow` line binds the patched directional call site only — the
 * stock getShadow definition (shadowmap_pars_fragment, PCF branch) precedes it and keeps its
 * name; the SUN cascade branch never compiles (the app's sun is a DirectionalLight,
 * NUM_SUN_LIGHT_SHADOWS 0). The hardware compare sampler (sampler2DShadow, DepthTexture +
 * LinearFilter) stays — each tap is a hardware comparison; the filter blends the comparison
 * results, not depths.
 */
import type * as THREE from 'three';
import { SUN_SHADOW_FIT } from './column';

export type SunReceiverMode = 'stock' | 'smooth' | 'plane' | 'cubic';

const PATCHED = new WeakMap<THREE.Material, string>();

/**
 * The pre-existing hooks the patch replaced, saved ONCE per patch lifetime and restored
 * verbatim on clear (the ground-slot fix): the receiver variant composes WITH the material's
 * own onBeforeCompile — never instead of it. A material saved with both hooks undefined
 * returns to the stock shader on clear, exactly as before.
 */
const ORIGINALS = new WeakMap<
  THREE.Material,
  {
    onBeforeCompile?: THREE.Material['onBeforeCompile'];
    customProgramCacheKey?: THREE.Material['customProgramCacheKey'];
  }
>();

// The plane cap along the light, normalized by the fit's linear depth range (the ortho sun's
// post-divide z is linear across [near, far] — the cap converts directly). R5: 0.5 m — the
// kernel's own plane change at 4096 on the grazing wall (≈0.55 m) fits, the R4 0.25 m did not.
let capMetres = 0.5;

export function setSunReceiverCap(metres: number): void {
  if (Number.isFinite(metres) && metres > 0) capMetres = metres;
}

const capNorm = (): number => capMetres / (SUN_SHADOW_FIT.far - SUN_SHADOW_FIT.near);

const wantedKey = (mode: SunReceiverMode): string => `zimny-sun-receiver-${mode}-${capMetres}`;

const glslBlock = (
  mode: 'smooth' | 'plane' | 'cubic',
  capValue: number,
  withPlane: boolean,
): string => {
  const taps = mode === 'cubic' ? 4 : 3;
  const plane =
    withPlane || mode === 'plane' || mode === 'cubic'
      ? `        // the receiver-plane gradient: the screen derivatives of the post-divide shadow coord
        vec3 scX = dFdx( shadowCoord.xyz );
        vec3 scY = dFdy( shadowCoord.xyz );
        float det = scY.y * scX.x - scX.y * scY.x;
        float dzdu = 0.0;
        float dzdv = 0.0;
        if ( abs( det ) > 1e-12 ) {
          dzdu = ( scY.y * scX.z - scX.y * scY.z ) / det;
          dzdv = ( scX.x * scY.z - scY.x * scX.z ) / det;
        }
`
      : '';
  const weightLines =
    mode === 'cubic'
      ? `        // the cubic B-spline weights (the centred 4-tap support)
        float w0 = ( 1.0 - t ) * ( 1.0 - t ) * ( 1.0 - t ) / 6.0;
        float w1 = ( 3.0 * t * t * t - 6.0 * t * t + 4.0 ) / 6.0;
        float w2 = ( - 3.0 * t * t * t + 3.0 * t * t + 3.0 * t + 1.0 ) / 6.0;
        float w3 = t * t * t / 6.0;
`
      : `        // the quadratic B-spline weights per axis (the separable, fractional phase)
        vec2 w0 = 0.5 * ( 1.0 - phase ) * ( 1.0 - phase );
        vec2 w1 = 0.5 + phase - phase * phase;
        vec2 w2 = 0.5 * phase * phase;
`;
  const loop = (n: 3 | 4): string => {
    if (n === 3) {
      return `        shadow = 0.0;
        for ( int j = 0; j < 3; j ++ ) {
          float wy = j == 0 ? w0.y : ( j == 1 ? w1.y : w2.y );
          for ( int i = 0; i < 3; i ++ ) {
            float wx = i == 0 ? w0.x : ( i == 1 ? w1.x : w2.x );
            vec2 tapUv = ( base + vec2( float( i ), float( j ) ) + 0.5 ) / shadowMapSize;
            float reference = shadowCoord.z;
            float offX = float( i ) - 0.5 - phase.x;
            float offY = float( j ) - 0.5 - phase.y;
#ifdef ZIMNY_SUN_PLANE
            float correction = dzdu * offX * texelSize.x + dzdv * offY * texelSize.y;
            reference += clamp( correction, -${capValue.toExponential(10)}, ${capValue.toExponential(10)} );
#endif
            shadow += wx * wy * texture( shadowMap, vec3( tapUv, reference ) );
          }
        }`;
    }
    return `        shadow = 0.0;
        for ( int j = 0; j < 4; j ++ ) {
          float wj = float( j );
          float wy = wj == 0.0 ? w0 : ( wj == 1.0 ? w1 : ( wj == 2.0 ? w2 : w3 ) );
          for ( int i = 0; i < 4; i ++ ) {
            float wi = float( i );
            float wx = wi == 0.0 ? w0 : ( wi == 1.0 ? w1 : ( wi == 2.0 ? w2 : w3 ) );
            vec2 tapUv = ( base + vec2( float( i ), float( j ) ) + 0.5 ) / shadowMapSize;
            float reference = shadowCoord.z;
            float offX = float( i ) - 1.0 - t;
            float offY = float( j ) - 1.0 - t;
#ifdef ZIMNY_SUN_PLANE
            float correction = dzdu * offX * texelSize.x + dzdv * offY * texelSize.y;
            reference += clamp( correction, -${capValue.toExponential(10)}, ${capValue.toExponential(10)} );
#endif
            shadow += wx * wy * texture( shadowMap, vec3( tapUv, reference ) );
          }
        }`;
  };
  const phaseLine =
    mode === 'cubic'
      ? `        // the centred 4-tap phase (R5): sTexels = uv*size; base = floor - 1; t = frac
        vec2 sT = shadowCoord.xy * shadowMapSize - 0.5;
        vec2 base = floor( sT ) - 1.0;
        vec2 t = sT - floor( sT );
        vec2 tapBase = base;
`
      : `        // the centred 3-tap phase (R5): sTexels = uv*size; base = floor - 1; phase = frac
        vec2 sTexels = shadowCoord.xy * shadowMapSize;
        vec2 base = floor( sTexels ) - 1.0;
        vec2 phase = sTexels - floor( sTexels );
        vec2 tapBase = base;
`;
  return `
    // sq-t0-residue R4/R5 — the sun receiver variant (${mode}): the ${taps}x${taps} fractional-phase
    // B-spline filter over the comparison results${withPlane ? ', with the receiver-plane depth correction per tap (the kernel-scaled cap along the light, zeroed on a singular gradient)' : ''}.
    float zimnySunGetShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

      float shadow = 1.0;

      shadowCoord.xyz /= shadowCoord.w;
      shadowCoord.z += shadowBias;

      bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
      bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

      if ( frustumTest ) {

        vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
${plane}${phaseLine}${weightLines}${loop(taps)}

      }

      return mix( 1.0, shadow, shadowIntensity );

    }
`;
};

const applyPatch = (material: THREE.Material, mode: 'smooth' | 'plane' | 'cubic'): void => {
  const block = glslBlock(mode, capNorm(), mode !== 'smooth');
  const planeDefine = mode === 'plane' || mode === 'cubic' ? '#define ZIMNY_SUN_PLANE\n' : '';
  if (!ORIGINALS.has(material)) {
    // Save the PRE-EXISTING hooks once per patch lifetime: a re-patch (a mode or cap change)
    // must chain onto the material's own hook, never onto the receiver's own last wrapper.
    ORIGINALS.set(material, {
      onBeforeCompile: material.onBeforeCompile,
      customProgramCacheKey: material.customProgramCacheKey,
    });
  }
  const saved = ORIGINALS.get(material);
  const originalHook = saved?.onBeforeCompile;
  const originalKey = saved?.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    // The slot first: the ground/kit hooks register their shared uniforms and splice their
    // chunks; the receiver's replaces then run on the same shader object (one hook, one
    // material, the slots composed inside it — the repo's own convention).
    originalHook?.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${block}`)
      .replace(
        '#include <lights_fragment_begin>',
        `${planeDefine}#define getShadow zimnySunGetShadow\n#include <lights_fragment_begin>`,
      );
  };
  // The cache key composes the same way: the slot's key distinguishes its program, the
  // receiver's suffix re-distinguishes per mode AND cap — no collision, no mismatch.
  material.customProgramCacheKey = originalKey
    ? () => `${originalKey.call(material)}|${wantedKey(mode)}`
    : () => wantedKey(mode);
  material.needsUpdate = true;
  PATCHED.set(material, wantedKey(mode));
};

const clearPatch = (material: THREE.Material): void => {
  const saved = ORIGINALS.get(material);
  if (saved === undefined) {
    // Never patched by us (a force sweep over an unpatched material): the hooks on it are
    // not ours to touch — the recompile bump alone carries the renderer-level flip.
    material.needsUpdate = true;
    PATCHED.delete(material);
    return;
  }
  if (saved.onBeforeCompile === undefined) {
    delete (material as { onBeforeCompile?: unknown }).onBeforeCompile;
  } else {
    material.onBeforeCompile = saved.onBeforeCompile;
  }
  if (saved.customProgramCacheKey === undefined) {
    delete (material as { customProgramCacheKey?: unknown }).customProgramCacheKey;
  } else {
    material.customProgramCacheKey = saved.customProgramCacheKey;
  }
  ORIGINALS.delete(material);
  material.needsUpdate = true;
  PATCHED.delete(material);
};

/**
 * Applies the receiver variant to every receiving material of the scene (one sweep per settle —
 * the programs recompile here, never per frame). `force` marks a renderer-level flip
 * (renderer.shadowMap.enabled) whose material recompile sweep this call also carries. The cap
 * (sc=) rides the cache key: a cap change re-patches on the next sweep.
 */
export function applySunReceiver(scene: THREE.Scene, mode: SunReceiverMode, force: boolean): void {
  const wanted = wantedKey(mode);
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.receiveShadow !== true) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      const current = PATCHED.get(material);
      if (mode === 'stock') {
        if (current === undefined && !force) continue;
        clearPatch(material);
        continue;
      }
      if (current === wanted && !force) continue;
      applyPatch(material, mode);
    }
  });
}
