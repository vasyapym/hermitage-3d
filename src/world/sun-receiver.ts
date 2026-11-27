// src/world/sun-receiver.ts
/**
 * sq-t0-residue R4 — the sun receiver variant (brief 33's ruling).
 *
 * The 3x3 fractional-phase quadratic B-spline filter over the comparison RESULTS: a moving
 * shadow edge gets a continuous transition — the map's texel staircase stops reading on screen.
 * The optional plane mode adds the receiver-plane depth correction per tap (the Isidoro
 * receiver-plane technique): the screen derivatives of the post-divide shadow coord give the
 * receiver's depth gradient; each tap then compares against the receiver PLANE evaluated at that
 * texel centre — the false comparisons on grazing plaster (the wide-view beat) die, because the
 * reference depth tracks the surface across the kernel instead of staying at the centre's depth.
 *
 * The correction caps at ±0.25 m along the light (normalized by the fit's depth range) and
 * zeroes on a singular gradient — correct the neighbouring lookup without pushing the whole
 * sill off the wall.
 *
 * The variant rides onBeforeCompile per receiving material with a distinct program cache key;
 * the stock hooks restore on leaving t0. No global shader-chunk edit: the `#define getShadow
 * zimnySunGetShadow` line binds the patched directional call site only — the stock getShadow
 * definition (shadowmap_pars_fragment, PCF branch) precedes it and keeps its name; the SUN
 * cascade branch never compiles (the app's sun is a DirectionalLight, NUM_SUN_LIGHT_SHADOWS 0).
 * The hardware compare sampler (sampler2DShadow, DepthTexture + LinearFilter) stays — each of
 * the nine taps is a hardware comparison at the fractional-phase texel centre; the filter blends
 * the comparison results, not depths.
 */
import type * as THREE from 'three';
import { SUN_SHADOW_FIT } from './column';

export type SunReceiverMode = 'stock' | 'smooth' | 'plane';

const PATCHED = new WeakMap<THREE.Material, SunReceiverMode>();

// ±0.25 m along the light, normalized by the fit's linear depth range (the ortho sun's
// post-divide z is linear across [near, far] — the cap converts directly).
const DEPTH_CAP = 0.25 / (SUN_SHADOW_FIT.far - SUN_SHADOW_FIT.near);

const glslBlock = (mode: 'smooth' | 'plane', capNorm: number): string => `
		// sq-t0-residue R4 — the sun receiver variant (${mode}): the 3x3 fractional-phase quadratic
		// B-spline filter over the comparison results${mode === 'plane' ? ', with the receiver-plane depth correction per tap (capped ±0.25 m along the light, zeroed on a singular gradient)' : ''}.
		float zimnySunGetShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

			float shadow = 1.0;

			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;

			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;

			if ( frustumTest ) {

				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
${
  mode === 'plane'
    ? `				// the receiver-plane gradient: the screen derivatives of the post-divide shadow coord
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
    : ''
}				vec2 sTexels = shadowCoord.xy * shadowMapSize - 0.5;
				vec2 base = floor( sTexels );
				vec2 phase = sTexels - base;
				vec2 w0 = 0.5 * ( 1.0 - phase ) * ( 1.0 - phase );
				vec2 w1 = 0.5 + phase - phase * phase;
				vec2 w2 = 0.5 * phase * phase;

				shadow = 0.0;

				for ( int j = 0; j < 3; j ++ ) {

					float wy = j == 0 ? w0.y : ( j == 1 ? w1.y : w2.y );
					float offY = float( j ) - phase.y;

					for ( int i = 0; i < 3; i ++ ) {

						float wx = i == 0 ? w0.x : ( i == 1 ? w1.x : w2.x );
						float offX = float( i ) - phase.x;
						vec2 tapUv = ( base + vec2( float( i ), float( j ) ) + 0.5 ) / shadowMapSize;
						float reference = shadowCoord.z;
#ifdef ZIMNY_SUN_PLANE
						float correction = dzdu * offX * texelSize.x + dzdv * offY * texelSize.y;
						reference += clamp( correction, -${capNorm.toExponential(10)}, ${capNorm.toExponential(10)} );
#endif
						shadow += wx * wy * texture( shadowMap, vec3( tapUv, reference ) );

					}

				}

			}

			return mix( 1.0, shadow, shadowIntensity );

		}
`;

const applyPatch = (material: THREE.Material, mode: 'smooth' | 'plane'): void => {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <shadowmap_pars_fragment>',
        `#include <shadowmap_pars_fragment>\n${glslBlock(mode, DEPTH_CAP)}`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        '#define getShadow zimnySunGetShadow\n#include <lights_fragment_begin>',
      );
  };
  material.customProgramCacheKey = () => `zimny-sun-receiver-${mode}`;
  material.needsUpdate = true;
  PATCHED.set(material, mode);
};

const clearPatch = (material: THREE.Material): void => {
  delete (material as { onBeforeCompile?: unknown }).onBeforeCompile;
  delete (material as { customProgramCacheKey?: unknown }).customProgramCacheKey;
  material.needsUpdate = true;
  PATCHED.delete(material);
};

/**
 * Applies the receiver variant to every receiving material of the scene (one sweep per settle —
 * the programs recompile here, never per frame). `force` marks a renderer-level flip
 * (renderer.shadowMap.enabled) whose material recompile sweep this call also carries.
 */
export function applySunReceiver(scene: THREE.Scene, mode: SunReceiverMode, force: boolean): void {
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
      if (current === mode && !force) continue;
      applyPatch(material, mode);
    }
  });
}
