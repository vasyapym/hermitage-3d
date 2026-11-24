/**
 * R12 — the ground-snow slot (design-ground-snow.md §§1–4); DEC-037 re-centres the lane.
 *
 * ONE onBeforeCompile + customProgramCacheKey on the ground MeshLambertMaterial:
 * an ALBEDO term only (Lambert has no roughness/metalness). No draws, no triangles,
 * no textures, no lights — every edge is an analytic smoothstep of world position.
 * The §4.3 `#ifdef GROUND_SNOW` fallback is NOT implemented: the direct path only.
 *
 * At uSnow = 0 the fragment's snow mix is exactly diffuseColor.rgb in IEEE, so
 * out-of-season frames are analytically unchanged. No early-out branch, by design.
 *
 * Brief 19 §B.2: the paving slot composes INSIDE this hook — one hook, one material, the slot
 * list Ground/paving-slot@1 (the paving call runs before the snow mix; at uSnow=1 the snow mix
 * fully replaces the paved base, so every committed winter golden's field pixels are unchanged
 * by construction; the June golden re-baselines via the DEC-paving request).
 *
 * sq-arch-day B3 (the Q7/Q8 picks + the deltas' shared-noise path): ONE shared hash
 * value-noise `gsNoise` (emitted before the paving function, which samples it for the june
 * macro octave) drives three uniform-paired terms — the winter drift octaves (5.5 m @ 0.8 +
 * 1.2 m @ 0.2, floor uDriftMin 0.5, inside the uSnow mix), the june macro octave (6 m @ ±6 %,
 * the whole ground's albedo) and the day lane law (the delta × 0.5, the edge feather 0.35 m).
 * Every day term blends by uDay (E(h)) and is the IDENTITY at uDay = 0 — x·1.0 is bit-exact —
 * and the paving slot's distance fade blends the same way, so the night/dusk/white-night
 * ground is bit-exact today's. Extends DEC-035/041/043.
 */
import type { Material } from 'three';
import {
  GROUND_DETAIL_FADE,
  GROUND_DRIFT_MIN,
  GROUND_DRIFT_OCTAVES,
  GROUND_LANE,
  GROUND_LANE_LINE,
  GROUND_MACRO_OCTAVE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
  LANE_DAY_CONTRAST,
  LANE_DAY_FEATHER_M,
} from '../world/ground-snow';
import { PAVING_SLOT, pavingGlsl } from './ground-paving';

export type GroundSnowUniforms = Readonly<{
  uSnow: { value: number };
  /** sq-arch-day B3: E(h), the §8 day weight — the day-class blend factor, 0 at night. */
  uDay: { value: number };
  uDriftMin: { value: number };
  uOctaveA: { value: readonly [number, number] };
  uOctaveB: { value: readonly [number, number] };
  uMacro: { value: readonly [number, number] };
}>;

/** The uniforms the host writes per epoch (uSnow + uDay) and the static octave pairs. */
export const GROUND_SNOW_UNIFORMS: GroundSnowUniforms = {
  uSnow: { value: 0 },
  uDay: { value: 0 },
  uDriftMin: { value: GROUND_DRIFT_MIN },
  uOctaveA: { value: [GROUND_DRIFT_OCTAVES.a.scaleM, GROUND_DRIFT_OCTAVES.a.amp] },
  uOctaveB: { value: [GROUND_DRIFT_OCTAVES.b.scaleM, GROUND_DRIFT_OCTAVES.b.amp] },
  uMacro: { value: [GROUND_MACRO_OCTAVE.scaleM, GROUND_MACRO_OCTAVE.amp] },
};

// The winter-square round bumped the snow slot to @2 (the emitted body changed —
// the re-declared lane/tone/base constants are interpolated into the fragment).
// sq-arch-day B3 bumps to @3: the drift + macro + day-lane body and the noise uniforms.
const GROUND_SNOW_CACHE_KEY = 'Ground/snow-slot@3';

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
const CORE = glslFloat(GROUND_LANE.coreHalfM);
const EDGE = glslFloat(GROUND_LANE.edgeHalfM);
const FEATHER = glslFloat(LANE_DAY_FEATHER_M);
const CONTRAST = glslFloat(LANE_DAY_CONTRAST);
const DETAIL_NEAR = glslFloat(GROUND_DETAIL_FADE.nearM);
const DETAIL_FAR = glslFloat(GROUND_DETAIL_FADE.farM);

/**
 * The ONE shared hash value-noise (sq-arch-day B3): the drift octaves and the june macro
 * octave both sample it. Emitted before the paving function so `pavingAlbedo` can call it
 * for the macro octave — one function, one material, no second noise implementation.
 * Hash inputs wrap mod 1024 (period 123 m) for mobile float precision (the paving law's own
 * wrap). Exported so the unit test can pin the GLSL/TS agreement against the same constants.
 */
export const GROUND_NOISE_GLSL_FN = 'gsNoise';
export const GROUND_NOISE_GLSL = `float ${GROUND_NOISE_GLSL_FN}Hash(vec2 p){p=mod(p,1024.0);
return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ${GROUND_NOISE_GLSL_FN}(vec2 p){vec2 i=floor(p);vec2 u=fract(p);u=u*u*(3.0-2.0*u);
return mix(mix(${GROUND_NOISE_GLSL_FN}Hash(i),${GROUND_NOISE_GLSL_FN}Hash(i+vec2(1.0,0.0)),u.x),
mix(${GROUND_NOISE_GLSL_FN}Hash(i+vec2(0.0,1.0)),${GROUND_NOISE_GLSL_FN}Hash(i+vec2(1.0,1.0)),u.x),u.y);}`;

/**
 * Exported so the unit test can pin GLSL/TS agreement against the same constants. The lane lines
 * mirror laneCentreX / laneValueDay operation for operation (vGroundXZ.y is world Z); every
 * B3 day term blends by uDay and is the identity (×1.0) at uDay = 0.
 */
export const GROUND_SNOW_FRAGMENT_BODY = `#include <color_fragment>
float groundDist = length( vViewPosition );
diffuseColor.rgb *= mix( 1.0, 1.0 + ( ${GROUND_NOISE_GLSL_FN}( vGroundXZ / uMacro.x ) - 0.5 ) * 2.0 * uMacro.y, uDay );
diffuseColor.rgb = pavingAlbedo( vGroundXZ, diffuseColor.rgb, groundDist );
{
float groundLaneZ = clamp( vGroundXZ.y, ${NEAR_Z}, ${FAR_Z} );
float groundLaneX = ${NEAR_X} + ( ${FAR_X} - ${NEAR_X} ) * ( ( groundLaneZ - ${NEAR_Z} ) / ( ${FAR_Z} - ${NEAR_Z} ) );
float groundLane = 1.0 - smoothstep( ${CORE}, ${EDGE} + ${FEATHER} * uDay, abs( vGroundXZ.x - groundLaneX ) );
float groundTrample = ${BASE_GLSL} + ( 1.0 - ${BASE_GLSL} ) * groundLane * ( 1.0 + ( ${CONTRAST} - 1.0 ) * uDay );
vec3 groundSnowRgb = mix( vec3( ${FRESH_GLSL} ), vec3( ${TRAMPLED_GLSL} ), groundTrample );
float groundDrift = uDriftMin + ( 1.0 - uDriftMin ) * ( uOctaveA.y * ${GROUND_NOISE_GLSL_FN}( vGroundXZ / uOctaveA.x ) + uOctaveB.y * ${GROUND_NOISE_GLSL_FN}( vGroundXZ / uOctaveB.x ) );
groundSnowRgb *= mix( 1.0, groundDrift, uDay );
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
uniform float uDay;
uniform float uDriftMin;
uniform vec2 uOctaveA;
uniform vec2 uOctaveB;
uniform vec2 uMacro;
varying vec2 vGroundXZ;
${GROUND_NOISE_GLSL}`;

export function patchGroundSnowSlot(
  material: Material,
  uniforms: GroundSnowUniforms = GROUND_SNOW_UNIFORMS,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = uniforms.uSnow;
    shader.uniforms.uDay = uniforms.uDay;
    shader.uniforms.uDriftMin = uniforms.uDriftMin;
    shader.uniforms.uOctaveA = uniforms.uOctaveA;
    shader.uniforms.uOctaveB = uniforms.uOctaveB;
    shader.uniforms.uMacro = uniforms.uMacro;
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
