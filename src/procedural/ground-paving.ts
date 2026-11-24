// src/procedural/ground-paving.ts
/**
 * GLSL twin of src/world/paving.ts — brief 19 §B.2 (slot Ground/paving-slot@1; sq-arch-day B3
 * bumps the slot to @2 for the distance fade). Emits `vec3 pavingAlbedo(vec2 xz, vec3 base,
 * float dist)`: sett field (per-sett tone, joints), wear mottle, granite band grid, footprint
 * + surround. Every sub-pixel feature is analytic: bands and joints by pixel-footprint
 * coverage (pvCover), hashes by a Nyquist fade to the mean. Hash inputs wrap mod 1024 (period
 * 123 m) for mobile float precision. No comments inside the string: it ships.
 * First repo use of fwidth — safe: three r186's WebGL2 program pipeline compiles to ESSL3, where
 * the derivative functions are core (no extension pragma exists or is needed).
 *
 * sq-arch-day B3 (the Q7 pick): the cobble detail (the per-sett tone, the joints and the wear
 * mottle) fades with camera distance — full to GROUND_DETAIL_FADE.nearM, gone by farM — and
 * the whole fade blends by the uDay uniform (E(h), declared by the snow slot's common splice)
 * so at E = 0 the detail is exactly the committed program's. The band grid, the footprint edge
 * and the surround are macro structure and never fade. The june macro octave rides the shared
 * `gsNoise` (the snow slot emits it before this function); this twin only fades the detail.
 */
import {
  GROUND_DETAIL_FADE,
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
export const PAVING_SLOT = 'Ground/paving-slot@2';
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
  const detailNear = g(GROUND_DETAIL_FADE.nearM);
  const detailFar = g(GROUND_DETAIL_FADE.farM);
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
    `vec3 ${PAVING_GLSL_FN}(vec2 xz,vec3 base,float dist){`,
    `float pvDetail=1.0-smoothstep(${detailNear},${detailFar},dist);pvDetail=mix(1.0,pvDetail,uDay);`,
    `vec2 q=xz/${S};vec2 gq=abs(fract(q)-0.5);float e=(0.5-max(gq.x,gq.y))*${S};`,
    'float fade=1.0-smoothstep(0.35,0.7,max(fwidth(q.x),fwidth(q.y)));',
    `float tone=${g(PAVING_BODY_TONE)}*(1.0+(pvHash(floor(q))-0.5)*${g(2 * PAVING_SETT_TONE_AMP)});`,
    `float joint=pvCover(e,${g(PAVING_JOINT_M / 2)});`,
    `float near=mix(tone,${g(PAVING_JOINT_TONE * PAVING_BODY_TONE)},joint);`,
    'vec3 sett=base*mix(1.0,near,fade*pvDetail);',
    `vec2 m=xz/${g(PAVING_MOTTLE_M)};`,
    'float mf=1.0-smoothstep(0.35,0.7,max(fwidth(m.x),fwidth(m.y)));',
    `sett*=1.0+(pvNoise(m)-0.5)*${g(2 * PAVING_MOTTLE_AMP)}*mf*pvDetail;`,
    `float bd=max(pvBand(xz.x-${g(PAVING_BAND_ANCHOR[0])}),pvBand(xz.y-${g(PAVING_BAND_ANCHOR[1])}));`,
    `vec3 paved=mix(sett,base*vec3(${band}),bd);`,
    `vec2 lo=xz-vec2(${g(fp.xMin)},${g(fp.zMin)});vec2 hi=vec2(${g(fp.xMax)},${g(fp.zMax)})-xz;`,
    `float inside=smoothstep(-${g(PAVING_EDGE_SOFT_M)},${g(PAVING_EDGE_SOFT_M)},min(min(lo.x,lo.y),min(hi.x,hi.y)));`,
    `return mix(base*${g(PAVING_SURROUND_TONE)},paved,inside);}`,
  ].join('\n');
};
