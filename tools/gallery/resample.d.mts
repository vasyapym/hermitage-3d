/** Type declarations for tools/gallery/resample.mjs (the test imports the .mjs; allowJs is off). */
export type CropRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};
export const SRGB8_TO_LIN16: Uint16Array;
export function lin16ToSrgb8(): Uint8Array;
export function luminanceY16(r8: number, g8: number, b8: number): number;
export function cropRectCover(sw: number, sh: number, dw: number, dh: number): CropRect;
export function histogramY16(
  rgba: Uint8Array,
  w: number,
  crop: CropRect,
): { hist: Uint32Array; total: number };
export function percentileY16(hist: Uint32Array, total: number, percent: number): number;
export const BLACK_L16: number;
export const TARGET_L16: number;
export const GAIN_Q16_MIN: number;
export const GAIN_Q16_MAX: number;
export function toneParams(p1: number, p98: number): { black: number; gain: number };
export function resizeBoxTone(options: {
  rgba: Uint8Array;
  sw: number;
  crop: CropRect;
  dw: number;
  dh: number;
  black: number;
  gain: number;
}): Uint8Array;
export function boxDownHalf(rgba: Uint8Array, w: number, h: number): Uint8Array;
