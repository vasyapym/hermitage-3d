/*
 * Military Gallery portrait atlas v2 — the pure resample + tone law (design-gallery-atlas-v2
 * §3.2/§3.5). Integer-only, regex-fenced like atlas-law.mjs (DEC-024): the sRGB → linear step
 * rides a frozen 256-entry table (IEC 61966-2-1 EOTF, rounded to 16-bit linear — generated
 * once offline, embedded as literals so no engine-variant math enters this file); the inverse
 * walk, the histogram and its percentiles, the tone gain and the box filter are all integer
 * counting/division. Consumed by tools/gallery/import.mjs (lock + compose) and
 * tests/gallery-atlas.test.ts.
 *
 * Laws:
 * - CROP (§3.2): cover-crop, centred, to the content rect's aspect — the rect the atlas
 *   actually fills; Dawe scans (0.86–0.89) lose width symmetrically, the frame rebate hides
 *   about that much. Integer boundaries, floor/ceil — never a float rect.
 * - BOX FILTER (§3.2): the destination pixel averages the source's linear-light values over
 *   the integer window [k·sw/dw, (k+1)·sw/dw) floored/ceiled — exact for the power-of-two
 *   mip steps, a declared conservative window otherwise. Sums ride Number (exact ≤ 2⁵³).
 * - TONE (§3.5): per source, the 1st luminance percentile maps to L 0.01 and the gain puts
 *   the 98th at L 0.80, clamped to [0.70, 1.40] — in 16-bit linear light with a Q16.16-free
 *   plain Q16 integer gain; no chroma change, no sharpening. The chosen { black, gain } are
 *   written into the lock per key, so a re-compose never recomputes statistics.
 * - PURITY: no imports, no Math.pow/log/exp, no `**`, no Math.random, no Date/process/
 *   console — tests/gallery-atlas.test.ts scans this file with the same fence as atlas-law.mjs.
 */

/** sRGB 8-bit → 16-bit linear, IEC 61966-2-1, v/255 → round(EOTF × 65535). Frozen literals. */
export const SRGB8_TO_LIN16 = new Uint16Array([
  0, 20, 40, 60, 80, 99, 119, 139, 159, 179, 199, 219, 241, 264, 288, 313, 340, 367, 396, 427, 458,
  491, 526, 562, 599, 637, 677, 718, 761, 805, 851, 898, 947, 997, 1048, 1101, 1156, 1212, 1270,
  1330, 1391, 1453, 1517, 1583, 1651, 1720, 1790, 1863, 1937, 2013, 2090, 2170, 2250, 2333, 2418,
  2504, 2592, 2681, 2773, 2866, 2961, 3058, 3157, 3258, 3360, 3464, 3570, 3678, 3788, 3900, 4014,
  4129, 4247, 4366, 4488, 4611, 4736, 4864, 4993, 5124, 5257, 5392, 5530, 5669, 5810, 5953, 6099,
  6246, 6395, 6547, 6700, 6856, 7014, 7174, 7335, 7500, 7666, 7834, 8004, 8177, 8352, 8528, 8708,
  8889, 9072, 9258, 9445, 9635, 9828, 10022, 10219, 10417, 10619, 10822, 11028, 11235, 11446, 11658,
  11873, 12090, 12309, 12530, 12754, 12980, 13209, 13440, 13673, 13909, 14146, 14387, 14629, 14874,
  15122, 15371, 15623, 15878, 16135, 16394, 16656, 16920, 17187, 17456, 17727, 18001, 18277, 18556,
  18837, 19121, 19407, 19696, 19987, 20281, 20577, 20876, 21177, 21481, 21787, 22096, 22407, 22721,
  23038, 23357, 23678, 24002, 24329, 24658, 24990, 25325, 25662, 26001, 26344, 26688, 27036, 27386,
  27739, 28094, 28452, 28813, 29176, 29542, 29911, 30282, 30656, 31033, 31412, 31794, 32179, 32567,
  32957, 33350, 33745, 34143, 34544, 34948, 35355, 35764, 36176, 36591, 37008, 37429, 37852, 38278,
  38706, 39138, 39572, 40009, 40449, 40891, 41337, 41785, 42236, 42690, 43147, 43606, 44069, 44534,
  45002, 45473, 45947, 46423, 46903, 47385, 47871, 48359, 48850, 49344, 49841, 50341, 50844, 51349,
  51858, 52369, 52884, 53401, 53921, 54445, 54971, 55500, 56032, 56567, 57105, 57646, 58190, 58737,
  59287, 59840, 60396, 60955, 61517, 62082, 62650, 63221, 63795, 64372, 64952, 65535,
]);

let srgb8FromLin16Cache = null;

/**
 * 16-bit linear → sRGB 8-bit: the inverse walk over the frozen table (smallest v with
 * SRGB8_TO_LIN16[v] ≥ lin), built once by integer stepping — the table is monotone with
 * table[0] = 0 and table[255] = 65535, so every linear value is covered.
 */
export function lin16ToSrgb8() {
  if (srgb8FromLin16Cache === null) {
    const lut = new Uint8Array(65536);
    let v = 0;
    for (let lin = 0; lin <= 65535; lin += 1) {
      while (v < 255 && SRGB8_TO_LIN16[v] < lin) v += 1;
      lut[lin] = v;
    }
    srgb8FromLin16Cache = lut;
  }
  return srgb8FromLin16Cache;
}

/** Rec. 709 luminance in 16-bit linear, ×10000 coefficients, rounded — an integer. */
export function luminanceY16(r8, g8, b8) {
  return Math.floor(
    (2126 * SRGB8_TO_LIN16[r8] + 7152 * SRGB8_TO_LIN16[g8] + 722 * SRGB8_TO_LIN16[b8] + 5000) /
      10000,
  );
}

/** Cover-crop rect: the largest centred window of the source with the target's aspect. */
export function cropRectCover(sw, sh, dw, dh) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) throw new Error('resample: empty rect');
  // source aspect > target aspect → crop width; else crop height. All integer.
  const cropW = Math.min(sw, Math.floor((sh * dw) / dh));
  const cropH = Math.min(sh, Math.floor((sw * dh) / dw));
  const x = Math.floor((sw - cropW) / 2);
  const y = Math.floor((sh - cropH) / 2);
  return { x, y, w: cropW, h: cropH };
}

/** The 65536-bin luminance histogram of the crop region (counting only — no floats). */
export function histogramY16(rgba, w, crop) {
  const hist = new Uint32Array(65536);
  let total = 0;
  for (let y = crop.y; y < crop.y + crop.h; y += 1) {
    for (let x = crop.x; x < crop.x + crop.w; x += 1) {
      const s = (y * w + x) * 4;
      hist[luminanceY16(rgba[s], rgba[s + 1], rgba[s + 2])] += 1;
      total += 1;
    }
  }
  return { hist, total };
}

/** The smallest value v with cum(v)·100 ≥ percent·total — integer cross-multiplied. */
export function percentileY16(hist, total, percent) {
  if (total <= 0) throw new Error('resample: empty histogram');
  let cum = 0;
  for (let v = 0; v <= 65535; v += 1) {
    cum += hist[v];
    if (cum * 100 >= percent * total) return v;
  }
  return 65535;
}

/** §3.5 anchors in 16-bit linear: L 0.01 and L 0.80 of the 0…65535 range. */
export const BLACK_L16 = 655;
export const TARGET_L16 = 52428;
/** The gain clamp [0.70, 1.40] in Q16 (×65536, rounded). */
export const GAIN_Q16_MIN = 45875;
export const GAIN_Q16_MAX = 91750;

/**
 * The tone law's integers from the two percentiles: black = the 1st percentile; the Q16 gain
 * puts the 98th at TARGET_L16, clamped to [0.70, 1.40]. Recorded in the lock per key.
 */
export function toneParams(p1, p98) {
  if (p98 <= p1) throw new Error('resample: degenerate tone statistics (p98 ≤ p1)');
  const gain = Math.min(
    GAIN_Q16_MAX,
    Math.max(GAIN_Q16_MIN, Math.floor(((TARGET_L16 - BLACK_L16) * 65536) / (p98 - p1))),
  );
  return { black: p1, gain };
}

function window(k, nOut, nIn) {
  const x0 = Math.floor((k * nIn) / nOut);
  const x1 = Math.ceil(((k + 1) * nIn) / nOut);
  return { a: Math.max(0, Math.min(x0, nIn - 1)), b: Math.max(1, Math.min(x1, nIn)) };
}

/**
 * Box-filter downsample in linear light with the tone law folded in: source RGBA (sRGB 8-bit,
 * full frame), the crop region, target content size; the destination pixel averages the
 * window's linear values, applies (v − black)·gain/65536 and returns sRGB 8-bit. alpha = 255.
 */
export function resizeBoxTone({ rgba, sw, crop, dw, dh, black, gain }) {
  const out = new Uint8Array(dw * dh * 4);
  const toSrgb8 = lin16ToSrgb8();
  for (let dy = 0; dy < dh; dy += 1) {
    const wy = window(dy, dh, crop.h);
    for (let dx = 0; dx < dw; dx += 1) {
      const wx = window(dx, dw, crop.w);
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = wy.a; sy < wy.b; sy += 1) {
        for (let sx = wx.a; sx < wx.b; sx += 1) {
          const s = ((crop.y + sy) * sw + crop.x + sx) * 4;
          r += SRGB8_TO_LIN16[rgba[s]];
          g += SRGB8_TO_LIN16[rgba[s + 1]];
          b += SRGB8_TO_LIN16[rgba[s + 2]];
          n += 1;
        }
      }
      // Round-half-up division in integers, then the tone LUT chain. The tone product fits
      // Number exactly (≤ 65535 × 91750 < 2⁵³); plain division, never a 32-bit shift.
      r = Math.floor((2 * r + n) / (2 * n));
      g = Math.floor((2 * g + n) / (2 * n));
      b = Math.floor((2 * b + n) / (2 * n));
      const o = (dy * dw + dx) * 4;
      out[o] = toSrgb8[lin16Clamped(r, black, gain)];
      out[o + 1] = toSrgb8[lin16Clamped(g, black, gain)];
      out[o + 2] = toSrgb8[lin16Clamped(b, black, gain)];
      out[o + 3] = 255;
    }
  }
  return out;
}

/** The tone law on one linear value: (v − black)·gain/65536, rounded, clamped to the range. */
function lin16Clamped(v, black, gain) {
  const value = Math.max(0, v - black) * gain;
  return Math.min(65535, Math.max(0, Math.floor((value + 32768) / 65536)));
}

/**
 * The mip chain step (§3.6): one half-size box-down of a full RGBA frame in linear light,
 * neutral tone (black 0, gain 65536). Preview/verification only — the encoded chain is
 * toktx's own --genmipmap resampler at the pinned version (the proven encode path).
 */
export function boxDownHalf(rgba, w, h) {
  const dw = Math.max(1, Math.floor(w / 2));
  const dh = Math.max(1, Math.floor(h / 2));
  return resizeBoxTone({
    rgba,
    sw: w,
    sh: h,
    crop: { x: 0, y: 0, w, h },
    dw,
    dh,
    black: 0,
    gain: 65536,
  });
}
