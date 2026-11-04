# tools/bpy/lm_percentile.py
# D4 (jordan slice 2): the Blender-python stats half of lm-percentile. Loads the room's
# DENOISED linear EXR (the exact reencode-encode.py image-open pattern:
# bpy.data.images.load(check_existing=False) -> size/channels -> pixels.foreach_get) and
# the builder's OWN cells.json; samples L = 0.2126*R + 0.7152*G + 0.0722*B (float64,
# fixed Rec.709 coefficients) over the (cell - 2*pad)-square interiors of ALLOCATED cells
# whose owning material is NOT an excluded emitter chip (a cell with ANY excluded owner
# is excluded; the allocator gives every cell exactly one owner). Blender's pixel rows
# run from the bottom and the cells map is row 0 at v = 0 — no flip, the row index IS the
# pixel row. Artifacts:
#   W_raw = np.partition(L, k)[k], k = floor(percentile/100 * (n - 1))   — exact order
#   statistic.
#   W    = clamp(decimal ROUND_HALF_UP round2(W_raw), clamp lo, clamp hi)
#   gain = decimal ROUND_HALF_UP round2(kappa / W)
#   clipFraction = fraction(L > W); haloFraction = fraction(L > 4*W)  (float64 means)
# The blob is printed as ONE 'LM_PERCENTILE ' line, JSON, sorted keys, no clock, no
# network; the node driver (tools/lm-percentile.mjs) owns every write (manifest,
# reencode invocation, bake-log rows).
import argparse
import hashlib
import json
import math
import sys
from decimal import ROUND_HALF_UP, Decimal

import bpy
import numpy as np

TWO_DP = Decimal('0.01')


def fail(message):
    print(f'lm_percentile.py: {message}', file=sys.stderr, flush=True)
    sys.exit(1)


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def round2(value):
    return float(Decimal(value).quantize(TWO_DP, rounding=ROUND_HALF_UP))


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='lm_percentile.py')
    parser.add_argument('--room', required=True)
    parser.add_argument('--state', required=True)
    parser.add_argument('--exr', required=True)
    parser.add_argument('--cells', required=True)
    parser.add_argument('--percentile', type=float, required=True)
    parser.add_argument('--exclude', default='')
    parser.add_argument('--clamp', required=True, help='lo,hi in linear bake units')
    parser.add_argument('--kappa', type=float, required=True)
    args = parser.parse_args(argv)
    lo, hi = (float(v) for v in args.clamp.split(','))
    if not (lo < hi):
        fail(f'clamp {args.clamp} must be lo < hi')
    return args, lo, hi


def sample_luminance(exr_path, cells_json, excluded):
    """Returns (L float64 array, excluded-cell count per material)."""
    src = bpy.data.images.load(exr_path, check_existing=False)
    width, height = src.size
    channels = src.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    src.pixels.foreach_get(linear)
    rgb = linear.reshape(height, width, channels)[:, :, :3]
    res, grid, pad = int(cells_json['res']), int(cells_json['grid']), int(cells_json['pad'])
    if width != res or height != res:
        fail(f'the EXR is {width}x{height} but cells.json declares res {res}')
    cell = res // grid
    inner = cell - 2 * pad
    if inner <= 0:
        fail(f'cells.json pad {pad} eats the {cell} px cell')
    blocks = []
    excluded_counts = {}
    for key in sorted(cells_json['cells']):
        row = cells_json['cells'][key]
        material = row['material']
        if material in excluded:
            excluded_counts[material] = excluded_counts.get(material, 0) + 1
            continue
        col_s, row_s = key.split(',')
        col, row_index = int(col_s), int(row_s)
        x0, y0 = col * cell + pad, row_index * cell + pad
        block = rgb[y0:y0 + inner, x0:x0 + inner, :]
        r64 = block[:, :, 0].astype(np.float64)
        g64 = block[:, :, 1].astype(np.float64)
        b64 = block[:, :, 2].astype(np.float64)
        blocks.append((0.2126 * r64 + 0.7152 * g64 + 0.0722 * b64).ravel())
    bpy.data.images.remove(src)
    if not blocks:
        fail('no luminance samples: every allocated cell is excluded or the map is empty')
    return np.concatenate(blocks), excluded_counts


def main():
    args, lo, hi = parse_args()
    excluded = set(v for v in args.exclude.split(',') if v)
    with open(args.cells, 'rb') as handle:
        cells_bytes = handle.read()
    cells_json = json.loads(cells_bytes.decode('utf8'))
    L, excluded_counts = sample_luminance(args.exr, cells_json, excluded)
    n = int(L.size)
    k = math.floor(args.percentile / 100.0 * (n - 1))
    if not (0 <= k < n):
        fail(f'order statistic index {k} outside [0, {n})')
    w_raw = float(np.partition(L, k)[k])
    w = float(Decimal(w_raw).quantize(TWO_DP, rounding=ROUND_HALF_UP))
    w = min(max(w, lo), hi)
    p50, p90, p99 = (float(np.percentile(L, q)) for q in (50, 90, 99))
    gain = round2(args.kappa / w)
    clip_fraction = float(np.count_nonzero(L > w) / n)
    halo_fraction = float(np.count_nonzero(L > 4.0 * w) / n)
    blob = {
        'cellsSha256': hashlib.sha256(cells_bytes).hexdigest(),
        'clipFraction': round(clip_fraction, 6),
        'excludedCells': excluded_counts,
        'exrSha256': file_sha256(args.exr),
        'gain': gain,
        'haloFraction': round(halo_fraction, 6),
        'kappa': args.kappa,
        'n': n,
        'p50': round(p50, 6),
        'p90': round(p90, 6),
        'p99': round(p99, 6),
        'percentile': args.percentile,
        'room': args.room,
        'state': args.state,
        'w': w,
        'wRaw': round(w_raw, 6),
    }
    print('LM_PERCENTILE ' + json.dumps(blob, sort_keys=True), flush=True)
    if halo_fraction > 0.005:
        print(f'LM_PERCENTILE_WARN haloFraction {halo_fraction:.6f} > 0.005 '
              f'(state {args.state})', file=sys.stderr, flush=True)


main()
