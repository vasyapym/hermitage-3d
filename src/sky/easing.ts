// Shared easing helpers — design-sky-time.md §7, §8: clamped quintic
// smootherstep with zero first/second derivatives at the plateau joins.

import type { Rgb3 } from '../content/sky-time';

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

export const smootherstep = (x: number): number => {
  const t = clamp01(x);
  return t * t * t * (6 * t * t - 15 * t + 10);
};

/** C¹ smoothstep (3τ² − 2τ³): zero slope at both ends — the walk ramps' speed law (rail.ts). */
export const smoothstep = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

export const mixScalar = (a: number, b: number, k: number): number => a + (b - a) * k;

export const mixRgb = (a: Rgb3, b: Rgb3, k: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

export const mod = (x: number, n: number): number => ((x % n) + n) % n;
export const sinD = (x: number): number => Math.sin(x * RAD);
export const cosD = (x: number): number => Math.cos(x * RAD);
export const tanD = (x: number): number => Math.tan(x * RAD);
export const asinD = (x: number): number => Math.asin(x) * DEG;
export const atan2D = (y: number, x: number): number => Math.atan2(y, x) * DEG;
