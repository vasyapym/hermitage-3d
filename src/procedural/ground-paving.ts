// src/procedural/ground-paving.ts
/**
 * GLSL twin of src/world/paving.ts — brief 19 §B.2 (slot Ground/paving-slot@1).
 * Emits `vec3 pavingAlbedo(vec2 xz, vec3 base)`: sett field (per-sett tone, joints), wear
 * mottle, granite band grid, footprint + surround. Every sub-pixel feature is analytic: bands and
 * joints by pixel-footprint coverage (pvCover), hashes by a Nyquist fade to the mean. Hash inputs
 * wrap mod 1024 (period 123 m) for mobile float precision. No comments inside the string: it ships.
 * First repo use of fwidth — safe: three r186's WebGL2 program pipeline compiles to ESSL3, where
 * the derivative functions are core (no extension pragma exists or is needed).
 */
import {
  PAVING_BAND_ANCHOR,
  PAVING_BAND_PERIOD_M,
  PAVING_BAND_TONE,
  PAVING_BAND_WIDTH_M,
  PAVING_BODY_TONE,
  PAVING_EDGE_SOFT_M,
  PAVING_JOINT_M,
  PAVING_JOINT_TONE,
  PAVING_MOTTLE_AMP,
  PAVING_MOTTLE_M,
  PAVING_SETT_M,
  PAVING_SETT_TONE_AMP,
  PAVING_SURROUND_TONE,
  SQUARE_FOOTPRINT,
} from '../world/paving';
export const PAVING_SLOT = 'Ground/paving-slot@1';
export const PAVING_GLSL_FN = 'pavingAlbedo';
const g = (v: number): string => {
  const s = `${Number(v.toFixed(6))}`;
  return s.includes('.') ? s : `${s}.0`;
};
export const pavingGlsl = (): string => {
  const S = g(PAVING_SETT_M);
  const P = g(PAVING_BAND_PERIOD_M);
  const band = PAVING_BAND_TONE.map(g).join(',');
  const fp = SQUARE_FOOTPRINT;
  return [
    'float pvHash(vec2 p){p=mod(p,1024.0);',
    'return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float pvNoise(vec2 p){vec2 i=floor(p);vec2 u=fract(p);u=u*u*(3.0-2.0*u);',
    'return mix(mix(pvHash(i),pvHash(i+vec2(1.0,0.0)),u.x),',
    'mix(pvHash(i+vec2(0.0,1.0)),pvHash(i+vec2(1.0,1.0)),u.x),u.y);}',
    'float pvCover(float d,float h){float w=max(fwidth(d),1e-4);',
    'return clamp((min(d+0.5*w,h)-max(d-0.5*w,0.0))/w,0.0,1.0);}',
    `float pvBand(float c){float t=c/${P};float d=abs(t-floor(t+0.5))*${P};`,
    `return pvCover(d,${g(PAVING_BAND_WIDTH_M / 2)});}`,
    `vec3 ${PAVING_GLSL_FN}(vec2 xz,vec3 base){`,
    `vec2 q=xz/${S};vec2 gq=abs(fract(q)-0.5);float e=(0.5-max(gq.x,gq.y))*${S};`,
    'float fade=1.0-smoothstep(0.35,0.7,max(fwidth(q.x),fwidth(q.y)));',
    `float tone=${g(PAVING_BODY_TONE)}*(1.0+(pvHash(floor(q))-0.5)*${g(2 * PAVING_SETT_TONE_AMP)});`,
    `float joint=pvCover(e,${g(PAVING_JOINT_M / 2)});`,
    `float near=mix(tone,${g(PAVING_JOINT_TONE * PAVING_BODY_TONE)},joint);`,
    'vec3 sett=base*mix(1.0,near,fade);',
    `vec2 m=xz/${g(PAVING_MOTTLE_M)};`,
    'float mf=1.0-smoothstep(0.35,0.7,max(fwidth(m.x),fwidth(m.y)));',
    `sett*=1.0+(pvNoise(m)-0.5)*${g(2 * PAVING_MOTTLE_AMP)}*mf;`,
    `float bd=max(pvBand(xz.x-${g(PAVING_BAND_ANCHOR[0])}),pvBand(xz.y-${g(PAVING_BAND_ANCHOR[1])}));`,
    `vec3 paved=mix(sett,base*vec3(${band}),bd);`,
    `vec2 lo=xz-vec2(${g(fp.xMin)},${g(fp.zMin)});vec2 hi=vec2(${g(fp.xMax)},${g(fp.zMax)})-xz;`,
    `float inside=smoothstep(-${g(PAVING_EDGE_SOFT_M)},${g(PAVING_EDGE_SOFT_M)},min(min(lo.x,lo.y),min(hi.x,hi.y)));`,
    `return mix(base*${g(PAVING_SURROUND_TONE)},paved,inside);}`,
  ].join('\n');
};
