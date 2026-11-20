# tools/probes/rg-relief-miss.py — the junction law's B5 miss-texel probe (COMMITTED code,
# authored by the round; RUN only at the round's bake phases — never by CI). Blender-routed
# like the repo's other image tools: it loads the PRE-ENCODE bake plate (the stage's
# DENOISED linear EXR — node_modules/.cache/zimny-asset-stage/<room>/bake-<state>/lm/
# <file>.exr; the chain's reencode consumes the very same file) and counts texels with
# luminance < MISS_LUM inside LIT islands whose island-mean > LIT_MEAN.
#
#   python3 tools/probes/rg-relief-miss.py --help          # no Blender needed
#   blender -b --factory-startup -noaudio --python-exit-code 1 -P tools/probes/rg-relief-miss.py -- \
#     <bake-plate.exr> <bpy-summary.json> [--out <path>]
#
# THE ISLAND DOMAIN (the measured-fact law): the summary's lm.cells rects are the shelf's
# ALLOCATION boxes; a face's mapped area can be a strict SUBSET of its box (the arch ring
# faces' closed spandrel profile maps only the lens between the two arcs — the boxes'
# remaining texels are unwritten by design in the committed flat bake, forever black). The
# B5 gate therefore measures the MAPPED domain only: the probe exec's the room's committed
# builder (the same ZIMNY_BAKE=1 path tools/bpy/bake.py's build_room uses), reads the shell's
# 'lm' UV layer, and rasterizes each face's UV polygon (even-odd point-in-polygon at the
# texel centres; the cells' order IS the mesh polygon order — the dump_layout belt's
# correspondence the summary's cells share) into a per-face mask.
#
# THE B5 GATE (the accepted verdict): PASS = ZERO such texels on the S2A'd day/dusk plates —
# the coincident-copy design guarantees every MAPPED texel's catch ray lands on a surface
# (the ray-catch backdrop of the S2A pass), so a black texel inside a lit mapped island
# would mean a miss the design forbids. The night plate is a RECORD (it carries no S2A —
# the re-parameterization only). Exit 0 iff the verdict is 'pass'.
#
# THE PER-FACE MAP (the rg-audit batch C extension): the census's rows are per ISLAND ==
# per FACE (the cells' order IS the mesh polygon order — the same dump_layout belt the
# builder's LM_FACE_ELEMENTS roster rides), so each offending row now carries its 'face'
# index (the roster index; the S2A writable-set exclusion is keyed on it), and the payload
# adds 'offendingFaces' — the FULL untruncated per-face list (face, element, rect,
# mappedTexels, missTexels, islandMean), sorted by (-missTexels, element, face). The
# offendingIslands view stays capped at 50 rows (the printed payload's shape); the face
# map is the derivation input, not a verdict.
#
# Deterministic: fixed thresholds, numpy-only arithmetic, sorted-key JSON, no clock, no
# randomness in the payload. Blender imports are LAZY (inside the measurement path) so
# --help works without Blender, and main() runs only under the __main__ guard.
import json
import os
import shutil
import sys
import tempfile

MISS_LUM = 0.002    # a texel "misses" when its linear luminance reads below this
LIT_MEAN = 0.02     # an island is "lit" when its mean luminance reads above this

HELP_TEXT = """\
rg-relief-miss.py usage:
  python3 tools/probes/rg-relief-miss.py --help    (this text; no Blender needed)
  blender -b --factory-startup -noaudio --python-exit-code 1 -P tools/probes/rg-relief-miss.py -- \\
      <bake-plate.exr> <bpy-summary.json> [--out <path>]
Reads the PRE-encode bake plate (the stage's denoised linear EXR) + the bpy stage summary's
lm.cells ownership, rasterizes the shell's mapped lm domains from the committed builder
(the cells' rects are allocation boxes; the mapped area can be smaller), counts texels with
luminance < 0.002 inside mapped islands whose island-mean > 0.02, and prints one
deterministic JSON document (B5: pass == zero on the S2A'd plates). --out additionally
writes the same JSON (sorted keys).
"""


def fail(message):
    print(f'rg_relief_miss: {message}', file=sys.stderr, flush=True)
    raise SystemExit(f'rg_relief_miss: {message}')


def parse_args(argv):
    if argv and argv[0] in ('--help', '-h'):
        print(HELP_TEXT, end='')
        return None
    positional = []
    out = None
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token == '--out':
            if not rest:
                fail('--out needs a path')
            out = rest.pop(0)
        elif token.startswith('--'):
            fail(f'unrecognised argument {token!r}')
        else:
            positional.append(token)
    if len(positional) != 2:
        fail('usage: <bake-plate.exr> <bpy-summary.json> [--out <path>] | --help')
    return {'exr': positional[0], 'summary': positional[1], 'out': out}


def owned_cells(summary_path):
    """The atlas's OWNED cells + the lm block: the summary's lm.cells rows (rect
    [x, y, w, h] chart px, y from the top, the element riding each row) — returned IN FULL
    (the strip rows included, the census skips them in lockstep with the mesh polygons)."""
    with open(summary_path, 'r', encoding='utf-8') as handle:
        lm = (json.load(handle).get('lm') or {})
    cells = lm.get('cells')
    if not isinstance(cells, list) or not cells:
        fail(f'{summary_path}: the lm block carries no cells records — regenerate the bpy '
             'stage (the islands are the cells)')
    strip_px = lm.get('stripRowPx')
    if not isinstance(strip_px, (int, float)) or isinstance(strip_px, bool) or strip_px < 0:
        fail(f'{summary_path}: the lm block lacks a valid stripRowPx — regenerate the bpy stage')
    owned = sum(1 for row in cells
                if isinstance(row, dict) and isinstance(row.get('rect'), list)
                and len(row['rect']) == 4 and row['rect'][1] + row['rect'][3] > int(strip_px))
    if owned == 0:
        fail(f'{summary_path}: zero owned cells remain after the strip exclusion '
             f'({len(cells)} records, strip {int(strip_px)} px)')
    return cells, lm


def build_mapped_masks(summary_path):
    """The per-face mapped domains: exec the room's committed builder under ZIMNY_BAKE=1
    (the bake.py build_room path), take the shell's 'lm' UV layer, and rasterize each
    face's UV polygon at the texel centres inside its cell's allocation box. Returns the
    masks as a list of (polygon_uv, cell_rect) aligned with the summary's cells (the
    roster order == the mesh polygon order — the dump_layout belt)."""
    import bpy
    import numpy as np

    with open(summary_path, 'r', encoding='utf-8') as handle:
        room = json.load(handle)['room']
    script_dir = os.path.dirname(os.path.abspath(__file__))
    builder_path = os.path.join(script_dir, '..', 'bpy', f'{room}.py')
    if not os.path.exists(builder_path):
        fail(f'no committed builder at {builder_path}')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage = tempfile.mkdtemp(prefix='rg-relief-stage-')
    saved_argv = sys.argv
    saved_env = os.environ.get('ZIMNY_BAKE')
    sys.argv = [sys.argv[0], '--', '--room', room, '--out', stage]
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': os.path.abspath(builder_path)}
    try:
        code = compile(open(builder_path, encoding='utf-8').read(), builder_path, 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
        if saved_env is None:
            os.environ.pop('ZIMNY_BAKE', None)
        else:
            os.environ['ZIMNY_BAKE'] = saved_env
    shell = bpy.data.objects.get('shell')
    if shell is None:
        fail("the builder exec produced no 'shell' object (the mapped-mask source)")
    layer = shell.data.uv_layers.get('lm')
    if layer is None:
        fail("the shell mesh carries no 'lm' UV layer")
    loops = shell.data.uv_layers['lm'].data
    polys_uv = []
    for poly in shell.data.polygons:
        polys_uv.append([tuple(loops[li].uv) for li in poly.loop_indices])
    shutil.rmtree(stage, ignore_errors=True)
    return polys_uv


def measure(exr_path, summary_path):
    """The miss census over the mapped islands (LAZY Blender/numpy: plain python never
    imports them — the --help path stays import-safe)."""
    import bpy
    import numpy as np

    all_cells, lm = owned_cells(summary_path)
    polys_uv = build_mapped_masks(summary_path)
    if len(polys_uv) != len(all_cells):
        fail(f'the shell carries {len(polys_uv)} faces but the summary lists '
             f'{len(all_cells)} cells — the element map and the atlas disagree, fail loud')

    img = bpy.data.images.load(exr_path, check_existing=False)
    # Non-Color = raw float passthrough: the EXR's stored values ARE the linear irradiance
    # the bake wrote (the rg-gates load law's shape, kept byte-exact here).
    img.colorspace_settings.name = 'Non-Color'
    width, height = img.size
    channels = img.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    img.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)[:, :, :3].astype(np.float64)
    # Chart rows run from the TOP; Blender's pixel rows run from the bottom.
    lum = (0.2126 * plane[:, :, 0] + 0.7152 * plane[:, :, 1] + 0.0722 * plane[:, :, 2])[::-1]

    rows = []
    face_rows = []
    total_miss = 0
    lit_islands = 0
    mapped_texels = 0
    all_cells = lm['cells']  # the full cell list, aligned with the mesh polygons (the belt)
    for cell_index, cell in enumerate(all_cells):
        x, y, w, h = (int(v) for v in cell['rect'])
        if y + h <= int(lm['stripRowPx']):
            continue  # the reserved strip (the lockstep walk keeps the polygon alignment)
        if x + w > width or y + h > height:
            fail(f"island {cell['element']!r} rect {cell['rect']} is outside the "
                 f'{width}x{height} plate')
        # the cell's texel-centre grid in UV space (the chart's y-from-top row r maps to
        # v = 1 - (y_chart + 0.5) / height)
        xs = (np.arange(x, x + w, dtype=np.float64) + 0.5) / width
        ys_chart = np.arange(y, y + h, dtype=np.float64) + 0.5
        vv = 1.0 - ys_chart / height
        uu, vv = np.meshgrid(xs, vv)
        inside = point_in_polygon(uu, vv, polys_uv[cell_index])
        count = int(inside.sum())
        if count == 0:
            continue  # nothing mapped inside this box (not an island)
        mapped_texels += count
        area = lum[y:y + h, x:x + w][inside]
        mean = float(area.mean())
        if mean <= LIT_MEAN:
            continue
        lit_islands += 1
        miss = int((area < MISS_LUM).sum())
        total_miss += miss
        if miss:
            face = {'face': cell_index, 'element': cell['element'], 'rect': cell['rect'],
                    'mappedTexels': count, 'missTexels': miss, 'islandMean': round(mean, 6)}
            face_rows.append(face)
            rows.append({'islandMean': round(mean, 6), 'mappedTexels': count,
                         'missTexels': miss, 'element': cell['element'],
                         'rect': cell['rect'], 'face': cell_index})
    rows.sort(key=lambda row: (-row['missTexels'], row['element'], row['rect']))
    face_rows.sort(key=lambda row: (-row['missTexels'], row['element'], row['face']))
    verdict = 'pass' if total_miss == 0 else 'FAIL'
    payload = {
        'litIslands': lit_islands,
        'mappedTexels': mapped_texels,
        'missLum': MISS_LUM,
        'litMean': LIT_MEAN,
        'missTexels': total_miss,
        'offendingFaces': face_rows,
        'offendingIslands': rows[:50],
        'offendingIslandsShown': min(len(rows), 50),
        'plate': exr_path,
        'summary': summary_path,
        'totalIslands': sum(1 for row in all_cells
                            if row['rect'][1] + row['rect'][3] > int(lm['stripRowPx'])),
        'verdict': verdict,
    }
    return payload, verdict


def point_in_polygon(uu, vv, poly_uv):
    """Even-odd point-in-polygon at the texel centres (UV space; handles the concave
    wall-field polygons and the closed spandrel profiles alike). numpy-vectorized."""
    import numpy as np
    pts = np.asarray(poly_uv, dtype=np.float64)
    if len(pts) < 3:
        return np.zeros(uu.shape, dtype=bool)
    inside = np.zeros(uu.shape, dtype=bool)
    n = len(pts)
    for i in range(n):
        u1, v1 = pts[i]
        u2, v2 = pts[(i + 1) % n]
        crosses = (v1 > vv) != (v2 > vv)
        if not crosses.any():
            continue
        with np.errstate(divide='ignore', invalid='ignore'):
            xu = (u2 - u1) * (vv - v1) / (v2 - v1) + u1
        inside ^= crosses & (uu < xu)
    return inside


def emit(payload, out):
    text = json.dumps(payload, indent=1, sort_keys=True)
    print(text)
    if out:
        with open(out, 'w', encoding='utf-8') as handle:
            handle.write(text + '\n')
        print(f'rg_relief_miss: wrote {out}', file=sys.stderr, flush=True)


def main():
    opts = parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    if opts is None:
        return
    payload, verdict = measure(opts['exr'], opts['summary'])
    emit(payload, opts['out'])
    if verdict != 'pass':
        raise SystemExit(f"rg_relief_miss: {payload['missTexels']} miss texel(s) inside lit "
                         f"mapped islands of {opts['exr']} — B5 FAIL")


if __name__ == '__main__':
    main()
