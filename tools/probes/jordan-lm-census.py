# tools/probes/jordan-lm-census.py — the bands round's census instrument (COMMITTED code;
# run only at the round's read phases — never by CI; Blender headless).
#
#   blender -b --factory-startup -noaudio -P tools/probes/jordan-lm-census.py -- \
#     --builder <tools/bpy/jordan.py of the checkout whose layout the plates carry> \
#     --out <census stage dir> \
#     --plates day=<...exr>,duskChandeliers=<...exr>,nightChandeliers=<...exr>[,worldonly=<...exr>] \
#     [--w day=0.45,duskChandeliers=0.35,nightChandeliers=4.0]
#
# What it does (the bands round's enumerate-first ruling): rebuilds the room's scene from
# the committed builder (ZIMNY_BAKE=1 — geometry only; the builder writes lm/cells.json
# and returns before any glb/summary work), walks every mesh face to its lm cell
# (cells.json's per-object consecutive runs: first_cell + face index), classifies every
# cell into the band surfaces (shafts / bases / frames / the north field's band bins /
# the reveals / south / east / west walls / floor / ceiling / cornice), samples each
# census plate per cell over the normalized interior rect, and prints the ruling table:
# raw mean/p10/p90 per state, the predicted stored mean (OETF of clip(raw / W)), and the
# Δ columns (Δpolicy = shaft plaster − north upper flank; Δtier = north upper flank −
# spandrel; the world-only plate's south/floor/ceiling-vs-north ratios = the
# glass-throttle falsifier).
#
# The census NEVER bakes. The plates are produced separately: the committed chain's
# --preview mode is exactly the census spec (quarter res, PREVIEW_SAMPLES, quartered
# margin) and the pre-split tree needs no extra flags; the world-only falsifier runs
# bake.py --sun 0 in the split tree (the shell's cells are unchanged by the split, so
# its field bins read the same indices).
#
# ETC1S note: a per-region Δenc column is not separable without decoding the ktx2; the
# committed global dark-median loss (−22 at stored ~70, the 2c method) stands in for it,
# and the encode ruling happens at the chain's re-measure (bar B5), not here.

import argparse
import json
import pathlib
import sys
import os

import numpy as np
from mathutils import Vector

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='jordan-lm-census.py')
    parser.add_argument('--builder', required=True,
                        help="path to the checkout's jordan.py whose layout the plates carry")
    parser.add_argument('--out', required=True, help='census stage dir (cells.json lands here)')
    parser.add_argument('--plates', required=True,
                        help='comma list of state=path pairs; states: day, duskChandeliers, '
                             'nightChandeliers, worldonly')
    parser.add_argument('--w', default=None, help='comma list of state=W overrides')
    args = parser.parse_args(argv)
    plates = {}
    for pair in args.plates.split(','):
        state, _, path = pair.partition('=')
        if not state or not path:
            parser.error(f'--plates pair {pair!r} must be state=path')
        plates[state] = pathlib.Path(path)
    w = {'day': 0.45, 'duskChandeliers': 0.35, 'nightChandeliers': 4.0, 'worldonly': 0.45}
    if args.w:
        for pair in args.w.split(','):
            state, _, value = pair.partition('=')
            w[state] = float(value)
    return pathlib.Path(args.builder), pathlib.Path(args.out), plates, w


def build_scene(builder_path, stage):
    """bake.py's build_room pattern: a factory-empty scene, then exec the committed
    builder with ZIMNY_BAKE=1 (geometry only: the builder writes lm/cells.json and
    returns early; the exec'd namespace keeps its constants for the band bands)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not builder_path.exists():
        raise SystemExit(f'census: no builder at {builder_path}')
    saved_argv = sys.argv
    saved_env = os.environ.get('ZIMNY_BAKE')
    sys.argv = [sys.argv[0], '--', '--room', 'jordan', '--out', str(stage)]
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': str(builder_path)}
    try:
        code = compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
        if saved_env is None:
            os.environ.pop('ZIMNY_BAKE', None)
        else:
            os.environ['ZIMNY_BAKE'] = saved_env
    cells_path = stage / 'lm' / 'cells.json'
    if not cells_path.exists():
        raise SystemExit(f'census: the builder wrote no cells.json at {cells_path}')
    cells_map = json.loads(cells_path.read_text(encoding='utf-8'))
    meshes = [obj for obj in bpy.context.scene.objects
              if obj.type == 'MESH' and not obj.hide_render]
    return namespace, cells_map, meshes


def datablock_family(name):
    """The band-surface family of a datablock; the split tree's _n/_s/_e/_lo/_hi suffixes
    fold into the pre-split single names so one census serves both trees."""
    if 'pilaster_base' in name:
        return 'pilaster_base'
    if 'pilaster' in name:
        return 'pilaster'
    if 'window_frame' in name:
        return 'window_frame'
    if name == 'cornice':
        return 'cornice'
    return 'other'


def shell_bin(centre, normal, win_x, tiers):
    """The shell's band bins by the face centroid + normal (world space; the builders
    emit the north wall at z −86 with the field facing +z, the recess between −86.6
    and −86, the south wall at −62, the east wall at x 92, the west at x 66)."""
    x, y, z = (float(v) for v in centre)
    n = (float(v) for v in normal)
    nz, ny, nx_abs = n[2], n[1], abs(n[0])
    if z < -86.05:  # the reveal recess faces
        if nx_abs > 0.5:
            return 'reveal_jamb'
        if ny > 0.5:
            return 'reveal_sill'
        if ny < -0.5:
            return 'reveal_head'
        return 'reveal_other'
    if nz > 0.5 and z <= -85.9:  # the north wall field
        upper_sill, upper_head = tiers[1]
        lower_sill = tiers[0][0]
        for cx in win_x:
            dx = x - cx
            if 1.05 <= dx <= 1.95 and upper_sill - 0.4 <= y <= upper_head + 0.2:
                return 'north_upper_flank'
        if abs(y - (tiers[0][1] + upper_sill) / 2) < (upper_sill - tiers[0][1]) / 2 \
                and any(abs(x - cx) <= 1.1 for cx in win_x):
            return 'north_spandrel'
        if y > upper_head + 0.2 and y < 17.6:
            return 'north_head_zone'
        if y < lower_sill - 0.3:
            return 'north_below_lower'
        return 'north_field_other'
    if nz < -0.5 and z >= -62.1:
        return 'south_wall'
    if nx_abs > 0.5 and abs(nz) < 0.5:
        return 'east_wall' if x > 80.0 else 'west_wall'
    if ny > 0.5:
        return 'floor'
    if ny < -0.5:
        return 'ceiling'
    return 'shell_other'


def census_cells(namespace, cells_map, meshes):
    """Walk every mesh face to its lm cell and classify it. Returns
    {cell_key: {'bin': ..., 'datablock': ..., 'material': ...}}."""
    cells = cells_map['cells']
    grid = int(cells_map.get('grid', namespace.get('LM_GRID', 64)))
    win_x = list(namespace['WIN_X'])
    tiers = [(float(sill), float(head)) for sill, head in namespace['WIN_TIERS']]
    owned = {}
    for key, row in cells.items():
        cx, cy = (int(part) for part in key.split(','))
        owned.setdefault(row['object'], []).append(cy * grid + cx)
    seen, out = set(), {}
    for obj in sorted(meshes, key=lambda item: item.name):
        name = obj.data.name
        if name in seen:
            continue  # instanced templates share data; one geometry source each
        seen.add(name)
        runs = sorted(owned.get(name, []))
        if not runs:
            continue  # meshes without lm cells (none today; guard anyway)
        if len(runs) != runs[-1] - runs[0] + 1:
            raise SystemExit(f'census: datablock {name!r} cell run is not consecutive')
        first = runs[0]
        family = datablock_family(name)
        matrix = obj.matrix_world
        normal_matrix = matrix.to_3x3()
        for pi, poly in enumerate(obj.data.polygons):
            cell = first + pi
            key = f'{cell % grid},{cell // grid}'
            if key not in cells:
                raise SystemExit(f'census: face {pi} of {name!r} maps to absent cell {key}')
            material = cells[key]['material']
            centre = matrix @ poly.center
            normal = (normal_matrix @ poly.normal).normalized()
            if name == 'shell':
                bin_name = shell_bin(centre, normal, win_x, tiers)
            else:
                bin_name = family
            out[key] = {'bin': bin_name, 'datablock': name, 'material': material,
                        'world': [round(float(v), 3) for v in centre]}
    return out, grid


def cell_rects(census, grid, res, pad_px):
    rects = {}
    for key in census:
        cx, cy = (int(part) for part in key.split(','))
        cell = res / grid
        rects[key] = ((cx * cell + pad_px) / res,
                      (cy * cell + pad_px) / res,
                      ((cx + 1) * cell - pad_px) / res,
                      ((cy + 1) * cell - pad_px) / res)
    return rects


def plate_stats(path, rects):
    """Per-cell raw stats over one plate: Rec.709 luminance mean / p10 / p90 of the
    cell's interior rect. bpy image pixels run bottom-up; the lm v axis is row 0 at
    v=0 — the axes align with NO flip."""
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    channels = image.channels
    buf = np.empty(width * height * channels, dtype=np.float32)
    image.pixels.foreach_get(buf)
    buf = buf.reshape(height, width, channels)[:, :, :3]
    lum = 0.2126 * buf[:, :, 0] + 0.7152 * buf[:, :, 1] + 0.0722 * buf[:, :, 2]
    out = {}
    for key, (u0, v0, u1, v1) in rects.items():
        x0, x1 = int(round(u0 * width)), max(int(round(u1 * width)), int(round(u0 * width)) + 1)
        y0, y1 = int(round(v0 * height)), max(int(round(v1 * height)), int(round(v0 * height)) + 1)
        patch = lum[y0:y1, x0:x1]
        out[key] = {'mean': float(patch.mean()),
                    'p10': float(np.percentile(patch, 10)),
                    'p90': float(np.percentile(patch, 90))}
    bpy.data.images.remove(image)
    return out


def srgb_stored(raw, w):
    v = np.clip(np.asarray(raw, dtype=np.float64) / w, 0.0, 1.0)
    return float(np.where(v <= 0.0031308, 12.92 * v, 1.055 * np.power(v, 1 / 2.4) - 0.055) * 255.0)


def bin_stats(census, per_cell):
    """{bin: {mean/p10/p90 mean-of-cells, cells: N}} over one state's per-cell stats."""
    bins = {}
    for key, row in census.items():
        bins.setdefault(row['bin'], []).append(per_cell[key])
    out = {}
    for bin_name, rows in sorted(bins.items()):
        means = [row['mean'] for row in rows]
        out[bin_name] = {'cells': len(rows),
                         'mean': float(np.mean(means)),
                         'p10': float(np.mean([row['p10'] for row in rows])),
                         'p90': float(np.mean([row['p90'] for row in rows])),
                         'meanMin': float(np.min(means)),
                         'meanMax': float(np.max(means))}
    return out


def main():
    builder, out, plates, w = parse_args()
    out.mkdir(parents=True, exist_ok=True)
    namespace, cells_map, meshes = build_scene(builder, out)
    census, grid = census_cells(namespace, cells_map, meshes)
    rects = cell_rects(census, grid, int(cells_map.get('res', namespace.get('LM_RES', 2048))),
                       int(cells_map.get('padPx', namespace.get('LM_PAD_PX', 2))))
    per_state = {}
    for state, path in sorted(plates.items()):
        if not path.exists():
            raise SystemExit(f'census: plate {state} missing at {path}')
        per_state[state] = plate_stats(path, rects)
    report = {'plates': {state: str(path) for state, path in sorted(plates.items())},
              'bins': {}, 'w': {state: w[state] for state in per_state},
              'cells': len(census)}
    for state, per_cell in per_state.items():
        stats = bin_stats(census, per_cell)
        for bin_name, row in stats.items():
            row['stored255'] = srgb_stored(row['mean'], w[state])
        report['bins'][state] = stats
    # The Δ rulings (the bands round's classes rule ONLY from this table).
    deltas = {}
    for state in ('day', 'duskChandeliers', 'nightChandeliers'):
        if state not in report['bins']:
            continue
        bins = report['bins'][state]
        if 'pilaster' in bins and 'north_upper_flank' in bins:
            deltas[f'deltaPolicy_{state}'] = round(bins['pilaster']['mean']
                                                   - bins['north_upper_flank']['mean'], 5)
        if 'north_upper_flank' in bins and 'north_spandrel' in bins:
            deltas[f'deltaTier_{state}'] = round(bins['north_upper_flank']['mean']
                                                 - bins['north_spandrel']['mean'], 5)
    if 'worldonly' in report['bins']:
        bins = report['bins']['worldonly']
        north = bins.get('north_field_other', {}).get('mean')
        for other in ('south_wall', 'floor', 'ceiling', 'north_upper_flank'):
            if other in bins and north:
                deltas[f'worldRatio_{other}_over_north'] = round(
                    bins[other]['mean'] / north, 3)
    report['deltas'] = deltas
    out_path = out / 'census.json'
    out_path.write_text(json.dumps(report, sort_keys=True, indent=2) + '\n', encoding='utf8')
    print(f'ZIMNY_CENSUS {out_path}')
    header = 'bin'.ljust(22) + 'cells ' + ''.join(
        f'{state:>28}' for state in sorted(report['bins']))
    print(header)
    all_bins = sorted({bin_name for stats in report['bins'].values() for bin_name in stats})
    for bin_name in all_bins:
        line = bin_name.ljust(22) + f'{sum(stats[bin_name]["cells"] for stats in report["bins"].values() if bin_name in stats):5} '
        for state in sorted(report['bins']):
            stats = report['bins'][state]
            if bin_name in stats:
                row = stats[bin_name]
                line += f"raw {row['mean']:7.4f} st {row['stored255']:6.1f}  n{row['cells']:4}"
            else:
                line += ' ' * 28
        print(line)
    for key, value in deltas.items():
        print(f'  {key}: {value}')
    print('ZIMNY_CENSUS-END')


main()
