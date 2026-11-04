# tools/reencode-encode.py
# §5 re-encode law, Blender side: ldr = clamp(linear / whitePoint, 0, 1) → 8-bit is_data PNG.
# Mirrors bake.py's encode_ldr (foreach_get → numpy → divide → clip → foreach_set → save).
# D1 (jordan slice 2): a per-room transfer switch — the default (no --transfer, every
# sibling) stores the LINEAR values exactly as before; when the driver passes
# --transfer srgb, the per-texel encode becomes stored = srgb_oetf(clip(rgb / W_s, 0, 1))
# with  srgb_oetf(v) = 12.92*v if v <= 0.0031308 else 1.055*v**(1/2.4) - 0.055  (the values
# are sRGB-ENCODED; toktx then --assign_oetf srgb — the OETF is assigned, never converted).
# No denoise, no bake, no clock, no network: the output depends only on the EXR,
# whitePoint and the transfer.
#   Blender -b --factory-startup -noaudio -P tools/reencode-encode.py -- \
#     <exr> <png> <whitePoint> [--transfer srgb]
import sys

import bpy
import numpy as np

LINEAR = 'linear'
SRGB = 'srgb'


def encode_ldr(exr_path, png_path, white_point, transfer):
    src = bpy.data.images.load(exr_path, check_existing=False)
    width, height = src.size
    channels = src.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    src.pixels.foreach_get(linear)
    rgb = linear.reshape(-1, channels)[:, :3]
    ldr = np.clip(rgb / white_point, 0.0, 1.0)
    if transfer == SRGB:
        # stored = srgb_oetf(clip(rgb / W_s, 0, 1)), per channel, exact D1 formula.
        ldr = np.where(ldr <= 0.0031308, 12.92 * ldr, 1.055 * ldr ** (1.0 / 2.4) - 0.055)
    out = bpy.data.images.new(
        'reencode_ldr', width, height, alpha=False, float_buffer=False, is_data=True
    )
    rgba = np.ones((width * height, out.channels), dtype=np.float32)
    rgba[:, :3] = ldr
    out.pixels.foreach_set(rgba.ravel())
    out.file_format = 'PNG'
    out.filepath_raw = png_path
    out.save()


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    if len(argv) not in (3, 5):
        raise SystemExit('usage: ... -- <denoised.exr> <out.png> <whitePoint> '
                         '[--transfer srgb]')
    exr_path, png_path, white_point = argv[0], argv[1], float(argv[2])
    transfer = LINEAR
    if len(argv) == 5:
        if argv[3] != '--transfer':
            raise SystemExit(f'unknown arg {argv[3]}; expected --transfer')
        if argv[4] not in (LINEAR, SRGB):
            raise SystemExit(f'unknown transfer {argv[4]}; expected {LINEAR} or {SRGB}')
        transfer = argv[4]
    if not (white_point > 0.0) or white_point == float('inf'):
        raise SystemExit(f'whitePoint must be finite and > 0: {white_point}')
    encode_ldr(exr_path, png_path, white_point, transfer)


main()
