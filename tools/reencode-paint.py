# tools/reencode-paint.py — the published-state patch-paint (D-4/D-23 law, RG-E1 variant).
# Fills the named patch rect(s) of a denoised or COMPOSED linear EXR with a flat linear
# colour, or with the glare law's gradient field, and writes the result, so reencode.mjs's
# single-input encode sees the paint as content. Deterministic: the output depends only on
# the input EXR and the payload JSON.
#
#   blender -b --factory-startup -noaudio -P tools/reencode-paint.py -- \
#     <in.exr> <out.exr> <payload.json>
#
# RG-F2 also arms the DEAD_CELL gate here (verdict 2.4, pre-ETC1S): a check mode loads the
# encoded PNG and the bpy stage summary and fails when any OWNED atlas cell reads
# dead-black against the rest of the atlas. It runs from reencode.mjs between the LDR
# encode and toktx on the day arch chart only; its non-zero exit propagates (all-or-
# nothing per the publish law).
#
#   blender -b --factory-startup -noaudio -P tools/reencode-paint.py -- \
#     check <png> <summary.json> [--max <pct>] [--required]
#
# RG-F2 fail-closed (--required) — the room's own invocation passes it: the summary's
# lm block must carry a NON-EMPTY CELLS list of valid ownership records AND a valid
# stripRowPx; absent/broken = the fail path "regenerate the bpy stage" (never a silent
# pass). Zero remaining owned cells after the strip exclusion fails the same way.
# Without --required (the optional branch, kept for tool future — no caller today) a
# summary without cells only prints the skip line and exits 0. Ordinary Python
# exceptions propagate as non-zero exits under Blender's --python-exit-code (the
# driver passes it), and the gate itself raises SystemExit on every guarded defect:
# a non-finite or <= 0 atlas P99 (the all-black atlas fails loud, always), a
# non-finite cell mean, a dead cell.
#
# payload JSON: [{"rect": [x, y, w, h]}, ...] paired colour entries —
# entries: [{"rect": [x, y, w, h], "colour": [r, g, b]}, ...] in CHART coordinates
# (y runs from the top, Blender's pixel rows run from the bottom), pixels of the atlas.
# The glare law's entries carry {"rect": [...], "glare": {"edge", "tint", "level"}}:
# value(u,v) = tint × level × (EDGE + (1 − EDGE) × falloff(centre→rect edge)) with the
# smooth cos² window — 1 at the rect's centre texel, 0 at its rim (the machine below).
import json
import math
import os
import sys

import bpy
import numpy as np


def glare_field(rect, edge, tint, level):
    """The glare law's field over one rect, chart coordinates (y-from-top).

    value(u,v) = tint × level × (EDGE + (1 − EDGE) × falloff(centre→rect edge));
    d = the axis-normalized Chebyshev distance from the rect's centre to its nearest
    edge (|u−0.5|·2, |v−0.5|·2, max) — 0 at the centre, 1 at the rim — and
    falloff(d) = cos²(π·d/2): a smooth window, 1 at the centre texel, 0 at the rim,
    zero slope at both ends. The centre texel reads tint × level exactly; the rim
    reads EDGE of it. Deterministic: a fixed formula over texel centres, no
    randomness, no clock."""
    x, y, w, h = (int(v) for v in rect)
    tex_u = (np.arange(w, dtype=np.float64) + 0.5) / w
    tex_v = (np.arange(h, dtype=np.float64) + 0.5) / h
    du = np.abs(tex_u - 0.5) / 0.5
    dv = np.abs(tex_v - 0.5) / 0.5
    d = np.maximum(du[None, :], dv[:, None])
    falloff = 0.5 * (1.0 + np.cos(np.pi * d))
    scale = edge + (1.0 - edge) * falloff
    field = np.asarray(tint, dtype=np.float64)[None, None, :] * (level * scale)[:, :, None]
    return field


def paint(src_path, out_path, payload_path):
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
        if 'glare' in entry:
            law = entry['glare']
            edge = float(law['edge'])
            level = float(law['level'])
            tint = law['tint']
            if not (0.0 < edge < 1.0):
                raise SystemExit(f"paint: glare edge must be in (0, 1), got {edge!r}")
            if not (math.isfinite(level) and level > 0.0):
                raise SystemExit(f'paint: glare level must be finite and > 0, got {level!r}')
            if not (
                isinstance(tint, list)
                and len(tint) == 3
                and all(math.isfinite(c) and c > 0.0 for c in tint)
            ):
                raise SystemExit(f'paint: glare tint must be 3 finite positive channels, got {tint!r}')
            field = glare_field(entry['rect'], edge, tint, level)
            plane[r0 : r0 + h, x : x + w, 0:3] = field.astype(np.float32)
        else:
            plane[r0 : r0 + h, x : x + w, 0:3] = np.array(entry['colour'], dtype=np.float32)
    dst = bpy.data.images.new(
        'reencode_paint', width, height, alpha=True, float_buffer=True, is_data=True
    )
    dst.pixels.foreach_set(np.ascontiguousarray(plane, dtype=np.float32).ravel())
    dst.filepath_raw = str(out_path)
    dst.file_format = 'OPEN_EXR'
    dst.save()
    print('reencode_paint: wrote ' + str(out_path))


def layout_divergence(export_lm, bake_lm):
    """The layout-identity comparison (the law bake.py asserts; a local copy - the two
    tools do not import each other): None when the bake layout equals the export
    summary's lm on pxPerM, stripRowPx, faces, layoutHash and every cell in roster
    order, else the message naming the first divergent roster index. Stored hashes
    compare as strings."""
    keys = ('pxPerM', 'stripRowPx', 'faces', 'layoutHash')
    e_cells = export_lm.get('cells') if isinstance(export_lm.get('cells'), list) else []
    b_cells = bake_lm.get('cells') if isinstance(bake_lm.get('cells'), list) else []
    if bake_lm.get('layoutHash') and all(export_lm.get(k) == bake_lm.get(k) for k in keys) \
            and e_cells == b_cells:
        return None
    index = next((i for i, (a, b) in enumerate(zip(e_cells, b_cells)) if a != b),
                 min(len(e_cells), len(b_cells)))
    e_cell = e_cells[index] if index < len(e_cells) else None
    b_cell = b_cells[index] if index < len(b_cells) else None
    return (f"export faces {export_lm.get('faces')} pxPerM {export_lm.get('pxPerM')} hash "
            f"{export_lm.get('layoutHash')} vs bake {bake_lm.get('faces')}/"
            f"{bake_lm.get('pxPerM')}/{bake_lm.get('layoutHash')}; first divergence at roster "
            f'index {index}: {e_cell} vs {b_cell}')


def check(argv):
    """The DEAD_CELL gate (verdict 2.4): every OWNED atlas cell of the encoded PNG must
    read lit against the rest of the atlas. Cells = the bpy stage summary's lm.cells
    ([{rect: [x, y, w, h], element}], chart px, y-from-top); cells whose y-range lies
    inside the RESERVED strip (the summary's lm.stripRowPx) are excluded — the strip is
    not atlas content. The atlas P99 = the 99th percentile of the per-pixel code
    ((r+g+b)/3) over the whole NON-STRIP area; a cell fails when its INNER mean (a 1-px
    border is skipped against gutter bleed) is below (max_pct / 100) of that P99.
    Fail-loud always: a non-finite or <= 0 P99 (the all-black / non-numeric atlas case)
    and a non-finite cell mean exit non-zero naming their cause — no percentage gate on
    an undefined reference. With --required (RG-F2, fail-closed) the gate further
    demands a non-empty cells list of valid ownership records and a valid stripRowPx,
    and zero owned cells after the strip exclusion — every breach says the action
    ("regenerate the bpy stage"); without the flag only a non-list cells block skips
    (the optional branch, no caller today). Deterministic: numpy's fixed percentile,
    no randomness, no clock."""
    max_pct = 0.5
    required = False
    layouts = []
    positional = []
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token == '--max':
            if not rest:
                raise SystemExit('check: --max needs a value')
            max_pct = float(rest.pop(0))
        elif token.startswith('--max='):
            max_pct = float(token.split('=', 1)[1])
        elif token == '--layout':
            if not rest:
                raise SystemExit('check: --layout needs a path')
            layouts.append(rest.pop(0))
        elif token.startswith('--layout='):
            layouts.append(token.split('=', 1)[1])
        elif token == '--required':
            required = True
        else:
            positional.append(token)
    if len(positional) != 2:
        raise SystemExit(
            'usage: ... -- check <png> <summary.json> [--max <pct>] '
            '[--layout <bake-layout.<state>.json>]... [--required]'
        )
    if max_pct < 0.0:
        raise SystemExit('check: --max must be >= 0')
    if required and not layouts:
        raise SystemExit(
            'check: required layout-identity gate: no --layout given — pass every bake '
            "state's bake-layout.<state>.json"
        )
    png_path, summary_path = positional
    with open(summary_path, 'r', encoding='utf-8') as handle:
        doc = json.load(handle)
    lm = doc.get('lm') or {}
    cells = lm.get('cells')
    if not isinstance(cells, list):
        if required:
            raise SystemExit(
                "check: required dead-cell gate: the summary's lm block has no "
                'cells records — regenerate the bpy stage'
            )
        # The optional branch: the gate arms when the builder's lm.cells law lands;
        # until then a non-required caller skips (none today). SystemExit code 0.
        print('reencode_paint: dead-cell check skipped (no cells block)')
        return
    if required and not cells:
        raise SystemExit(
            'check: required dead-cell gate: the summary lm block has an empty '
            'cells list — regenerate the bpy stage'
        )
    strip_row = lm.get('stripRowPx')
    if required and (
        isinstance(strip_row, bool)
        or not isinstance(strip_row, (int, float))
        or strip_row < 0
    ):
        raise SystemExit(
            "check: required dead-cell gate: the summary's lm block lacks a valid "
            f'stripRowPx (got {strip_row!r}) — regenerate the bpy stage'
        )
    strip_px = int(strip_row or 0)
    # The declared dim classes (brief 7's law artifact rgnext-7): the builder's lm block
    # names the roster indices whose cells may read dead (the covered-by-family and
    # dim-by-enclosure sets). Required when the gate is required — absent/malformed fails
    # closed exactly like the stripRowPx law above; the optional branch treats them as
    # empty (no caller today).
    covered_cells = lm.get('coveredCells')
    dim_cells = lm.get('dimCells')
    declared_ok = (
        isinstance(covered_cells, list) and isinstance(dim_cells, list)
        and all(isinstance(i, int) and not isinstance(i, bool) for i in covered_cells)
        and all(isinstance(i, int) and not isinstance(i, bool) for i in dim_cells)
    )
    if required and not declared_ok:
        raise SystemExit(
            "check: required dead-cell gate: the summary's lm block lacks valid "
            'coveredCells/dimCells (the declared dim classes, got '
            f'{covered_cells!r} / {dim_cells!r}) — regenerate the bpy stage'
        )
    declared = set()
    if declared_ok:
        # (reply 9) the malformed-input promise: beyond the types, the sets must be
        # in-range roster indices, sorted-unique, and disjoint before they union - a
        # duplicate or overlapping index would silently skip a cell twice.
        for name, ids in (('coveredCells', covered_cells), ('dimCells', dim_cells)):
            if any(i < 0 or i >= len(cells) for i in ids):
                raise SystemExit(
                    f"check: the summary's lm block {name} holds an index outside the "
                    f'{len(cells)}-cell roster — regenerate the bpy stage'
                )
            if ids != sorted(set(ids)):
                raise SystemExit(
                    f"check: the summary's lm block {name} is not sorted-unique — "
                    'regenerate the bpy stage'
                )
        both = sorted(set(covered_cells) & set(dim_cells))
        if both:
            raise SystemExit(
                "check: the summary's lm block coveredCells and dimCells overlap at "
                f'{both[:8]} — regenerate the bpy stage'
            )
        declared = set(covered_cells) | set(dim_cells)
    # (the correction, 2026-11-26; the Standing protocol's trap 8 — THE MEMORY LAW) the
    # gate's memory: the LAST INGESTED bake's dead set, recorded in the committed bake log
    # at ingest time. The STABLE darkness (dead in the memory too) is the advisory class —
    # printed, never gating; the NEW darkness fails exactly as before. The memory's
    # absence = the strict law: every dead cell counts as new (fail-closed fallback).
    room = doc.get('room') or 'rastrelli-gallery'
    memory_set = None
    memory_path = f'tools/bake-logs/{room}.json'
    try:
        with open(memory_path, encoding='utf-8') as handle:
            memory_set = json.load(handle).get('postEncode', {}).get('deadCells')
    except (OSError, ValueError) as exc:
        print(f'reencode_paint: the memory read failed ({type(exc).__name__}: {exc})')
    memory_set = set(memory_set) if isinstance(memory_set, list) else None
    print(
        f'reencode_paint: the memory: path={memory_path} '
        f'present={memory_set is not None} cells={len(memory_set or ())}'
    )
    # The layout-identity gate (rastrelli-next round 4): every bake state's layout is proven
    # equal to this summary's lm BEFORE a single sample is read - the compose mixes three
    # states' plates, and a plate baked on another layout is not this atlas.
    for layout_path in layouts:
        try:
            with open(layout_path, 'r', encoding='utf-8') as handle:
                bake_lm = json.load(handle).get('lm') or {}
        except (OSError, ValueError) as exc:
            raise SystemExit(f'check: layout identity: cannot read {layout_path}: {exc}')
        divergence = layout_divergence(lm, bake_lm)
        if divergence is not None:
            raise SystemExit(
                f'check: layout identity: {os.path.basename(layout_path)}: {divergence}'
            )
        print(
            f'check: layout identity ok {os.path.basename(layout_path)} '
            f"faces={bake_lm['faces']} hash={bake_lm['layoutHash'][:16]}"
        )
    img = bpy.data.images.load(png_path, check_existing=False)
    # The gate reads the PNG's STORED 8-bit codes ((r+g+b)/3 as encoded): the load must
    # not colourspace-transform them (Blender tags plain PNGs sRGB by default).
    img.colorspace_settings.name = 'Non-Color'
    width, height = img.size
    channels = img.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    img.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)
    code = plane[:, :, :3].mean(axis=2)  # the per-pixel code (r+g+b)/3
    # Chart rows run from the TOP; Blender's pixel rows run from the bottom: the
    # reserved strip (chart rows [0, strip_px)) is the plane's BOTTOM strip_px rows,
    # so the scanned non-strip area is the plane's [: height - strip_px] prefix.
    scanned = code[: max(height - strip_px, 0)]
    if scanned.size == 0:
        raise SystemExit('check: the reserved strip covers the whole atlas')
    atlas_p99 = float(np.percentile(scanned.astype(np.float64), 99))
    if not math.isfinite(atlas_p99) or atlas_p99 <= 0.0:
        # The all-black atlas fails loud (and any NaN-contaminated one): a percentage
        # gate against a zero/undefined reference guards nothing — fail before any
        # cell comparison, naming the cause, never through the dead-row table.
        raise SystemExit(
            'check: the reference atlas P99 is '
            f'{atlas_p99!r} (non-finite or <= 0) — the atlas reads all-black/non-numeric; '
            'check the bake/encode plate, not a cell'
        )
    threshold = (max_pct / 100.0) * atlas_p99
    dead = []
    owned = 0
    excluded = 0
    excluded_declared = 0
    for index, row in enumerate(cells):
        if not isinstance(row, dict) or not isinstance(row.get('rect'), list) or len(row['rect']) != 4:
            raise SystemExit(
                f'check: malformed cell ownership record {row!r} '
                "(needs {'element', 'rect': [x, y, w, h]}) — regenerate the bpy stage"
            )
        element = row.get('element')
        rect = row['rect']
        x, y, w, h = (int(v) for v in rect)
        if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > width or y + h > height:
            raise SystemExit(
                f'check: cell rect {rect!r} is outside the {width}x{height} atlas'
            )
        if y + h <= strip_px:
            excluded += 1
            continue  # its whole y-range lies in the reserved strip
        if index in declared:
            excluded_declared += 1
            continue  # the declared dim classes (brief 7's law rgnext-7): skipped like the strip
        owned += 1
        r0 = height - (y + h)
        top = 1 if h > 2 else 0
        left = 1 if w > 2 else 0
        inner = code[r0 + top : r0 + h - top, x + left : x + w - left]
        mean = float(inner.mean())
        if not math.isfinite(mean):
            raise SystemExit(
                f'check: cell {element!r} rect {rect!r} inner mean is non-finite '
                f'({mean!r}) — the encoded plate carries non-numeric pixels; check the '
                'bake/encode plate, not a cell'
            )
        if mean < threshold:
            dead.append([index, element, [x, y, w, h], mean, threshold])
    if required and owned == 0:
        raise SystemExit(
            'check: required dead-cell gate: zero owned cells remain after the '
            f'strip exclusion ({len(cells)} records, strip {strip_px} px) — '
            'regenerate the bpy stage'
        )
    if dead:
        print(
            f'reencode_paint: declared sets: coveredCells={len(covered_cells or [])} '
            f'dimCells={len(dim_cells or [])} (the declared cells stay skipped in the count)'
        )
        new_dead = dead if memory_set is None else [row for row in dead if row[0] not in memory_set]
        stable = dead if memory_set is None else [row for row in dead if row[0] in memory_set]
        if stable:
            print(
                'reencode_paint: the advisory dead (stable since the last ingested bake, '
                f'not gating): {json.dumps([row[0] for row in stable])}'
            )
        if new_dead:
            for index, element, rect, mean, cell_threshold in new_dead:
                print(
                    'reencode_paint: dead cell '
                    + json.dumps(
                        [index, element, rect, round(mean, 6), round(cell_threshold, 6)]
                    )
                )
            raise SystemExit(
                f'reencode_paint: {len(new_dead)} NEW of {owned} owned cells read below '
                f'{max_pct:g}% of the atlas P99'
            )
        print(
            f'reencode_paint: all {len(dead)} dead cells are STABLE since the last ingested '
            'bake (the advisory class, trap 8) — the gate passes with findings'
        )
    print(
        f'reencode_paint: check ok — 0 of {owned} owned cells below {max_pct:g}% of P99 '
        f'{atlas_p99:.4f} (threshold {threshold:.6f}); {excluded} strip cells excluded; '
        f'{excluded_declared} declared cells excluded'
    )
    print(
        f'reencode_paint: postEncode atlasP99={atlas_p99:.6f} threshold={threshold:.6f} '
        f'cells={len(cells)} owned={owned} dead=0 declaredExcluded={excluded_declared}'
    )


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    if argv and argv[0] == 'check':
        check(argv[1:])
        return
    if len(argv) != 3:
        raise SystemExit(
            'usage: ... -- <in.exr> <out.exr> <payload.json> | '
            'check <png> <summary.json> [--max <pct>]'
        )
    paint(argv[0], argv[1], argv[2])


main()
