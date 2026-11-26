# rg-bench-trace.py — the bench referral's instrument (the graze slivers' darkness).
# DESIGN SECTIONS IMPLEMENTED: Astra 6.2 reply 9's proposed-fix (a) — «Refer 335, its mirror
# 3036 and a lit field neighbour to the bench: trace their UV footprints on the source paint
# EXRs through encoding to the checker's retained texels, distinguishing a sampling failure
# from a genuinely dark surface»; standing-protocol trap 7 (the measured brief).
# WHAT IT ANSWERS, per roster index: (1) does the face's UV2 island fill its atlas rect
# (the bake fills what the island covers — the rest of the rect is unpainted), (2) the paint
# EXR's mean over the ISLAND texels (the face's true baked light) vs over the whole RECT
# (what the checker's inner window mostly reads). island lit + rect dark = the sampling/
# pad artifact (the checker's verdict is an instrument of the rect, not the face); island
# dark = the face's bake itself is dark (a look question). Blender -b, no Cycles.
# USAGE: blender -b --factory-startup -noaudio -P tools/probes/rg-bench-trace.py -- \
#        --stage <stage root> --indices 335,3036,4,883 [--glb <glb path>] [--exr <exr path>]
import argparse, json, sys
import bpy

fail = lambda m: (_ for _ in ()).throw(SystemExit('rg-bench-trace: ' + m))

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--stage', required=True)
ap.add_argument('--indices', required=True)
ap.add_argument('--glb')
ap.add_argument('--exr')
opts = ap.parse_args(argv)
stage = opts.stage.rstrip('/\\') + '/'
glb = opts.glb or stage + 'rastrelli-gallery.raw.glb'
exr = opts.exr or stage + 'bake-day/lm/day.exr'
targets = [int(v) for v in opts.indices.split(',')]

lm = json.load(open(stage + 'summary.json', encoding='utf-8'))['lm']
cells = lm['cells']
if max(targets) >= len(cells):
    fail(f'index out of the {len(cells)}-cell roster')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
faces = []  # (island x0, x1, y0, y1) in atlas px, per imported mesh face, UV2 first
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    me = obj.data
    uvs = me.uv_layers
    layer = uvs[1] if len(uvs) > 1 else (uvs[0] if uvs else None)
    if layer is None:
        continue
    for poly in me.polygons:
        xs, ys = [], []
        for li in poly.loop_indices:
            xs.append(layer.data[li].uv[0])
            ys.append(layer.data[li].uv[1])
        faces.append((min(xs), max(xs), min(ys), max(ys)))

# the atlas px space: the layout's rects are x right / y DOWN from the chart top; the glb's
# UV2 v runs UP. A face's island belongs to the rect whose x-range contains the island's x
# and whose y-range contains (height_px - v) — the atlas side derives from the rects themselves.
max_x = max(c['rect'][0] + c['rect'][2] for c in cells)
max_y = max(c['rect'][1] + c['rect'][3] for c in cells)

def island_in_rect(fb, rect):
    rx, ry, rw, rh = rect
    x0, x1, y0, y1 = fb
    px0, px1 = x0 * max_x, x1 * max_x
    py0, py1 = (1 - y1) * max_y, (1 - y0) * max_y  # v up -> chart y down
    ix0, ix1 = max(px0, rx), min(px1, rx + rw)
    iy0, iy1 = max(py0, ry), min(py1, ry + rh)
    if ix1 <= ix0 or iy1 <= iy0:
        return None
    cov = ((ix1 - ix0) * (iy1 - iy0)) / (rw * rh)
    return (ix0, ix1, iy0, iy1, cov)

img = None
plane = None
try:
    img = bpy.data.images.load(exr)
    img.colorspace_settings.name = 'Non-Color'
    import numpy as np
    width, height = img.size
    buf = np.empty(width * height * img.channels, dtype=np.float32)
    img.pixels.foreach_get(buf)
    plane = buf.reshape(height, width, img.channels)[:, :, :3].mean(axis=2)
except Exception as exc:
    print(f'RGNEXT_BENCH: the paint EXR is absent/unreadable ({exc}) — the ISLANDS-ONLY mode')

for idx in targets:
    rect = cells[idx]['rect']
    rx, ry, rw, rh = rect
    hits = [(f, island_in_rect(f, rect)) for f in faces]
    hits = [(f, m) for f, m in hits if m]
    best = max(hits, key=lambda t: t[1][4]) if hits else None
    if not best:
        print(f'RGNEXT_BENCH idx={idx} rect={rect} ISLAND=none — no face maps into this rect')
        continue
    fb, (ix0, ix1, iy0, iy1, cov) = best
    ix0, ix1, iy0, iy1 = int(ix0), int(ix1), int(iy0), int(iy1)
    if plane is None:
        print(
            f'RGNEXT_BENCH idx={idx} element={cells[idx]["element"]} rect={rect} '
            f'island_px=[{ix0},{iy0} {ix1 - ix0}x{iy1 - iy0}] coverage={cov:.4f} '
            f'-> the ISLANDS-ONLY mode: no paint EXR on this stage'
        )
        continue
    r0 = height - (ry + rh)
    rect_px = plane[r0:r0 + rh, rx:rx + rw]
    isl_px = plane[height - iy1:height - iy0, ix0:ix1]  # numpy rows bottom-up
    inner_top, inner_left = (1 if rh > 2 else 0), (1 if rw > 2 else 0)
    checker_px = rect_px[inner_top:rh - inner_top, inner_left:rw - inner_left]
    p99 = float(np.percentile(plane, 99))
    print(
        f'RGNEXT_BENCH idx={idx} element={cells[idx]["element"]} rect={rect} '
        f'island_px=[{ix0},{iy0} {ix1 - ix0}x{iy1 - iy0}] coverage={cov:.4f} '
        f'exr_island_mean={float(isl_px.mean()):.6f} exr_rect_mean={float(rect_px.mean()):.6f} '
        f'checker_inner_mean={float(checker_px.mean()):.6f} '
        f'-> {"PAD/SAMPLING ARTIFACT" if float(isl_px.mean()) > 0.02 * p99 and float(checker_px.mean()) < 0.005 * p99 else "FACE ITSELF DARK (or encode)"}'
    )
print('RGNEXT_BENCH done')
