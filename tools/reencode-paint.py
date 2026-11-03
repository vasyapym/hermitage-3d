# tools/reencode-paint.py — the published-state patch-paint (D-4/D-23 law, RG-E1 variant).
# Fills the named patch rect(s) of a denoised or COMPOSED linear EXR with a flat linear
# colour and writes the result, so reencode.mjs's single-input encode sees the paint as
# content. Deterministic: the output depends only on the input EXR and the payload JSON.
#
#   blender -b --factory-startup -noaudio -P tools/reencode-paint.py -- \
#     <in.exr> <out.exr> <payload.json>
#
# payload JSON: [{"rect": [x, y, w, h]}, ...] paired colour entries —
# entries: [{"rect": [x, y, w, h], "colour": [r, g, b]}, ...] in CHART coordinates
# (y runs from the top, Blender's pixel rows run from the bottom), pixels of the atlas.
import json
import sys

import bpy
import numpy as np


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    if len(argv) != 3:
        raise SystemExit('usage: ... -- <in.exr> <out.exr> <payload.json>')
    src_path, out_path, payload_path = argv
    with open(payload_path, 'r', encoding='utf-8') as handle:
        payload = json.load(handle)
    src = bpy.data.images.load(src_path, check_existing=False)
    width, height = src.size
    channels = src.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    src.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)
    for entry in payload:
        x, y, w, h = (int(v) for v in entry['rect'])
        r0 = height - (y + h)
        plane[r0 : r0 + h, x : x + w, 0:3] = np.array(entry['colour'], dtype=np.float32)
    dst = bpy.data.images.new(
        'reencode_paint', width, height, alpha=True, float_buffer=True, is_data=True
    )
    dst.pixels.foreach_set(np.ascontiguousarray(plane, dtype=np.float32).ravel())
    dst.filepath_raw = str(out_path)
    dst.file_format = 'OPEN_EXR'
    dst.save()
    print('reencode_paint: wrote ' + str(out_path))


main()
