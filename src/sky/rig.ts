// Sky dome rig — design-sky-time.md §7 (dome shading), DEC-009 (Phase 0: one custom material,
// one fullscreen triangle, zero textures, zero render targets).
//
// The fragment reconstructs an exact per-pixel world ray from the camera basis and mixes the §7
// palette in scene-linear space. three.js injects AgX tone mapping, output colour-space
// conversion and the DITHERING define through the material prefix (toneMapped stays true).
//
// sq-arch-day B2 (the Q5 pick + the Q4 zenith): the day dome gains a sun-side horizon term
// and an aureole, both E-gated by uDay (the SAME E(h) the fill blends by — lightmaps.day —
// so at E = 0 both terms vanish exactly and the night/dusk/white-night dome is bit-identical);
// DEC-043's winter sky gain K rides the dome LOOKUP only (uDomeK, exactly 1.0 out of season
// and at night) — removed from the fill path, shared with the pane reflection (B4).

import * as THREE from 'three';
import { PALETTE } from '../content/sky-time';
import type { SkySample } from './appearance';

export type SkyRig = Readonly<{
  mesh: THREE.Mesh;
  apply: (sample: SkySample) => void;
  updateCamera: (camera: THREE.PerspectiveCamera) => void;
  /** The winter dome gain K (DEC-043's snowSkyGain) — the host writes it per epoch. */
  setDomeK: (k: number) => void;
  dispose: () => void;
}>;

type Triple = readonly [number, number, number];

/** sq-arch-day B2 (the Q5 pick): the sun-side horizon gain — the horizon colour itself
 * brightens toward the sun by 1 + HZ_SUN_GAIN·E(h)·pow⁴(dot(dirXZ, sunXZ)) — sun-side 1.35×
 * at full day (display ≈ 198 against the 187 horizon). */
export const HZ_SUN_GAIN = 0.35;
/** Brief-5 (row 5): the dome gradient's day knee — the horizon→zenith smootherstep runs over
 * (d.y + 0.08) / knee. The committed 1.08 reaches the zenith straight up; the day 0.72
 * reaches it at ~40° elevation, so the visible sky band above the roofline deepens
 * (est. ~178 → ~163 sRGB at 17°, ~163 → ~130 at 30°) while the 0–5° horizon seam moves
 * < 1 sRGB and the fill (fillSkyColor never reads v), the HZ sun lobe and the aureole are
 * untouched. Mixed by uDay FROM the unchanged committed expression — bit-identical at E = 0. */
export const DOME_KNEE_DAY = 0.72;
/** sq-arch-day B2 (the Q5 pick): the aureole — added to the base, E-gated, pow 64 about the
 * sun direction (half-width ≈ 8°), scene-linear [0.90, 0.75, 0.50]. */
export const AUREOLE_COLOR: Triple = [0.9, 0.75, 0.5];
export const AUREOLE_POW = 64;

/** The TS twin of the fragment's horizon gain: 1 + HZ_SUN_GAIN·day·pow⁴(facing), exactly 1
 * at day = 0 — the E-gate that keeps the night dome bit-identical. */
export function horizonSunFactor(facing: number, day: number): number {
  const f = Math.max(0, facing);
  return 1 + HZ_SUN_GAIN * day * f * f * f * f;
}

/** The TS twin of the fragment's aureole term: AUREOLE_COLOR·day·pow(facing, AUREOLE_POW),
 * exactly [0, 0, 0] at day = 0. */
export function aureoleTerm(facing: number, day: number): Triple {
  const k = day * Math.max(0, facing) ** AUREOLE_POW;
  return [AUREOLE_COLOR[0] * k, AUREOLE_COLOR[1] * k, AUREOLE_COLOR[2] * k];
}

const TRIANGLE_NDC: readonly number[] = [-1, -1, 0, 3, -1, 0, -1, 3, 0];

// The two B2 laws, inlined as GLSL (the constants interpolated from the exported laws) and
// spliced into the fragment before main() — GLSL wants them declared before use.
const GLSL_TWINS = /* glsl */ `
float horizonSunFactorG( float facing, float day ) {
  float f = max( facing, 0.0 );
  return 1.0 + ${HZ_SUN_GAIN} * day * f * f * f * f;
}
vec3 aureoleTermG( float facing, float day ) {
  float k = day * pow( max( facing, 0.0 ), ${AUREOLE_POW}.0 );
  return vec3( ${AUREOLE_COLOR.join(', ')} ) * k;
}
`;

// Clip z sits on the far plane: harmless with depthTest off, still behind everything if a later
// pass depth-tests the dome. w = 1 at all three vertices, so vNdc interpolates linearly and is
// exactly the fragment's NDC position.
export const SKY_VERTEX_SHADER = /* glsl */ `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

// <common> supplies rand() for the dithering chunk. The tonemapping/colorspace pars chunks and
// toneMapping()/linearToOutputTexel() are already injected by three and are never repeated here.
export const SKY_FRAGMENT_SHADER = /* glsl */ `
#include <common>
#include <dithering_pars_fragment>

uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uWarm;
uniform float uGlow;
uniform vec3 uHorizonSun;
uniform vec3 uSunDir;
uniform float uDay;
uniform float uDomeK;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uRayTanX;
uniform float uRayTanY;

varying vec2 vNdc;
${GLSL_TWINS}
float smootherStep(float x) {
  float t = clamp(x, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec3 d = normalize(vNdc.x * uRayTanX * uCamRight + vNdc.y * uRayTanY * uCamUp + uCamForward);

  float v0 = smootherStep((d.y + 0.08) / 1.08);
  // Brief-5: v0 is the committed ramp, vDay the day knee, mixed by uDay.
  float vDay = smootherStep((d.y + 0.08) / ${DOME_KNEE_DAY});
  float v = mix(v0, vDay, uDay);
  // sq-arch-day B2: the sun-side horizon gain — the horizon colour times the E-gated lobe
  // (the flattened directions; a straight-up ray's tiny xz flattens guarded to facing 0).
  vec2 hzFlat = d.xz;
  float hzLen = max(length(hzFlat), 1e-4);
  float hzFacing = max(dot(hzFlat / hzLen, uHorizonSun.xz), 0.0);
  vec3 hz = uHorizon * horizonSunFactorG( hzFacing, uDay );
  vec3 base = mix(hz, uZenith, v);

  float band = d.y / 0.22;
  float facing = max(dot(d, uHorizonSun), 0.0);
  float facing2 = facing * facing;
  float g = exp(-band * band) * facing2 * facing2 * facing2;

  // sq-arch-day B2: the aureole, additive after the base mix, E-gated (pow 64, ≈ 8° half-width).
  float sunFacing = max(dot(d, uSunDir), 0.0);
  vec3 sky = mix(base + aureoleTermG( sunFacing, uDay ), uWarm, uGlow * g);

  // sq-arch-day B2: the winter dome gain K — the lookup only (exactly 1.0 at night/out of season).
  gl_FragColor = vec4(sky * uDomeK, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

function setRgb(target: THREE.Color, rgb: Triple): void {
  target.setRGB(rgb[0], rgb[1], rgb[2]);
}

export function createSkyRig(scene: THREE.Scene, camera: THREE.PerspectiveCamera): SkyRig {
  const uniforms = {
    uZenith: { value: new THREE.Color(0, 0, 0) },
    uHorizon: { value: new THREE.Color(0, 0, 0) },
    uWarm: { value: new THREE.Color(0, 0, 0) },
    uGlow: { value: 0 },
    uHorizonSun: { value: new THREE.Vector3(0, 0, -1) },
    uSunDir: { value: new THREE.Vector3(0, 0, -1) },
    uDay: { value: 0 },
    uDomeK: { value: 1 },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uCamForward: { value: new THREE.Vector3(0, 0, -1) },
    uRayTanX: { value: 1 },
    uRayTanY: { value: 1 },
  };
  setRgb(uniforms.uWarm.value, PALETTE.warmHorizon);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(TRIANGLE_NDC, 3));

  const material = new THREE.ShaderMaterial({
    name: 'SkyDome',
    uniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    dithering: true,
    precision: 'highp',
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SkyDome';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.raycast = () => {
    // The triangle lives in NDC, not world space; it must never answer scene picking.
  };
  scene.add(mesh);

  const apply = (sample: SkySample): void => {
    const { atmosphere, horizonSunDirection: sun } = sample;
    setRgb(uniforms.uZenith.value, atmosphere.zenithRgb);
    setRgb(uniforms.uHorizon.value, atmosphere.horizonRgb);
    uniforms.uGlow.value = atmosphere.glowStrength;
    uniforms.uHorizonSun.value.set(sun[0], sun[1], sun[2]);
    // sq-arch-day B2: the aureole's sun direction and the E(h) gate ride the same sample.
    const { sunDirection, lightmaps } = sample;
    uniforms.uSunDir.value.set(sunDirection[0], sunDirection[1], sunDirection[2]);
    uniforms.uDay.value = lightmaps.day;
  };

  const updateCamera = (cam: THREE.PerspectiveCamera): void => {
    // render() is what normally refreshes matrixWorld; without this a call made before render
    // would read last frame's pose and the dome would trail the scene by one frame.
    cam.updateWorldMatrix(true, false);
    const basis = cam.matrixWorld;
    uniforms.uCamRight.value.setFromMatrixColumn(basis, 0).normalize();
    uniforms.uCamUp.value.setFromMatrixColumn(basis, 1).normalize();
    uniforms.uCamForward.value.setFromMatrixColumn(basis, 2).normalize().negate();
    const tanHalfFov = Math.tan(0.5 * cam.fov * THREE.MathUtils.DEG2RAD) / cam.zoom;
    uniforms.uRayTanY.value = tanHalfFov;
    uniforms.uRayTanX.value = tanHalfFov * cam.aspect;
  };
  updateCamera(camera);

  const setDomeK = (k: number): void => {
    uniforms.uDomeK.value = k;
  };

  const dispose = (): void => {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
  };

  return { mesh, apply, updateCamera, setDomeK, dispose };
}
