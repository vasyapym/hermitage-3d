/**
 * R12 — the ground-snow slot (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 *
 * ONE onBeforeCompile + customProgramCacheKey on the ground MeshLambertMaterial:
 * an ALBEDO term only (Lambert has no roughness/metalness). No draws, no triangles,
 * no textures, no lights, no hash, no noise — every edge is an analytic smoothstep
 * of world position. The §4.3 `#ifdef GROUND_SNOW` fallback is NOT implemented:
 * the direct path only.
 *
 * At uSnow = 0 the fragment's mix is exactly diffuseColor.rgb in IEEE, so
 * out-of-season frames are analytically unchanged. No early-out branch, by design.
 *
 * Brief 19 §B.2: the paving slot composes INSIDE this hook — one hook, one material, the slot
 * list Ground/paving-slot@1 (the paving call runs before the snow mix; at uSnow=1 the snow mix
 * fully replaces the paved base, so every committed winter golden's field pixels are unchanged
 * by construction; the June golden re-baselines via the DEC-paving request).
 */
import type { Material } from 'three';
import {
  GROUND_LANE,
  GROUND_LANE_LINE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
} from '../world/ground-snow';
import { PAVING_SLOT, pavingGlsl } from './ground-paving';

export type GroundSnowUniforms = Readonly<{ uSnow: { value: number } }>;

/** The one uniform the host writes each frame (main.ts applyEpoch). */
export const GROUND_SNOW_UNIFORMS: GroundSnowUniforms = { uSnow: { value: 0 } };

// The winter-square round bumps the snow slot to @2 (the emitted body changed —
// the re-declared lane/tone/base constants are interpolated into the fragment).
const GROUND_SNOW_CACHE_KEY = 'Ground/snow-slot@2';

const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : `${x}`);

/** Splice discipline: a missing anchor is a build error, never a silent no-op. */
function spliceChunk(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) {
    throw new Error(`[ground-snow] anchor missing from shader: ${anchor}`);
  }
  return source.replace(anchor, replacement);
}

const FRESH_GLSL = GROUND_SNOW_FRESH_LINEAR.map(glslFloat).join(', ');
const TRAMPLED_GLSL = GROUND_SNOW_TRAMPLED_LINEAR.map(glslFloat).join(', ');
const BASE_GLSL = glslFloat(GROUND_TRAMPLE_BASE);
const NEAR_X = glslFloat(GROUND_LANE_LINE.nearX);
const NEAR_Z = glslFloat(GROUND_LANE_LINE.nearZ);
const FAR_X = glslFloat(GROUND_LANE_LINE.farX);
const FAR_Z = glslFloat(GROUND_LANE_LINE.farZ);

/**
 * Exported so the unit test can pin GLSL/TS agreement against the same constants. The lane lines
 * mirror laneCentreX / laneValue operation for operation (vGroundXZ.y is world Z).
 */
export const GROUND_SNOW_FRAGMENT_BODY = `#include <color_fragment>
diffuseColor.rgb = pavingAlbedo( vGroundXZ, diffuseColor.rgb );
{
float groundLaneZ = clamp( vGroundXZ.y, ${NEAR_Z}, ${FAR_Z} );
float groundLaneX = ${NEAR_X} + ( ${FAR_X} - ${NEAR_X} ) * ( ( groundLaneZ - ${NEAR_Z} ) / ( ${FAR_Z} - ${NEAR_Z} ) );
float groundLane = 1.0 - smoothstep( ${glslFloat(GROUND_LANE.coreHalfM)}, ${glslFloat(GROUND_LANE.edgeHalfM)}, abs( vGroundXZ.x - groundLaneX ) );
float groundTrample = ${BASE_GLSL} + ( 1.0 - ${BASE_GLSL} ) * groundLane;
vec3 groundSnowRgb = mix( vec3( ${FRESH_GLSL} ), vec3( ${TRAMPLED_GLSL} ), groundTrample );
diffuseColor.rgb = mix( diffuseColor.rgb, groundSnowRgb, uSnow );
}`;

const VERTEX_COMMON = `#include <common>
varying vec2 vGroundXZ;`;

// The ground mesh is not instanced, and three's `worldPosition` exists in the Lambert
// vertex shader only under USE_SHADOWMAP et al. — recompute from modelMatrix instead.
const VERTEX_WORLDPOS = `#include <worldpos_vertex>
vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;`;

const FRAGMENT_COMMON = `#include <common>
uniform float uSnow;
varying vec2 vGroundXZ;`;

export function patchGroundSnowSlot(
  material: Material,
  uniforms: GroundSnowUniforms = GROUND_SNOW_UNIFORMS,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = uniforms.uSnow;
    shader.vertexShader = spliceChunk(shader.vertexShader, '#include <common>', VERTEX_COMMON);
    shader.vertexShader = spliceChunk(
      shader.vertexShader,
      '#include <worldpos_vertex>',
      VERTEX_WORLDPOS,
    );
    shader.fragmentShader = spliceChunk(
      shader.fragmentShader,
      '#include <common>',
      `${FRAGMENT_COMMON}\n${pavingGlsl()}`,
    );
    shader.fragmentShader = spliceChunk(
      shader.fragmentShader,
      '#include <color_fragment>',
      GROUND_SNOW_FRAGMENT_BODY,
    );
  };
  material.customProgramCacheKey = (): string => `${GROUND_SNOW_CACHE_KEY}|${PAVING_SLOT}`;
}
