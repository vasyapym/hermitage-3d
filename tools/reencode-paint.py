# tools/reencode-paint.py — the published-state patch-paint (D-4/D-23 law, RG-E1 variant).
# Fills the named patch rect(s) of a denoised or COMPOSED linear EXR with a flat linear
# colour and writes the result, so reencode.mjs's single-input encode sees the paint as
# content. Deterministic: the output depends only on the input EXR and the payload JSON.
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
import json
import math
import sys

import bpy
import numpy as np


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
        plane[r0 : r0 + h, x : x + w, 0:3] = np.array(entry['colour'], dtype=np.float32)
    dst = bpy.data.images.new(
        'reencode_paint', width, height, alpha=True, float_buffer=True, is_data=True
    )
    dst.pixels.foreach_set(np.ascontiguousarray(plane, dtype=np.float32).ravel())
    dst.filepath_raw = str(out_path)
    dst.file_format = 'OPEN_EXR'
    dst.save()
    print('reencode_paint: wrote ' + str(out_path))


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
        elif token == '--required':
            required = True
        else:
            positional.append(token)
    if len(positional) != 2:
        raise SystemExit('usage: ... -- check <png> <summary.json> [--max <pct>] [--required]')
    if max_pct < 0.0:
        raise SystemExit('check: --max must be >= 0')
    png_path, summary_path = positional
    with open(summary_path, 'r', encoding='utf-8') as handle:
        lm = json.load(handle).get('lm') or {}
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
    for row in cells:
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
            continue  # its whole y-range lies in the reserved strip
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
            dead.append([element, [x, y, w, h], mean, threshold])
    if required and owned == 0:
        raise SystemExit(
            'check: required dead-cell gate: zero owned cells remain after the '
            f'strip exclusion ({len(cells)} records, strip {strip_px} px) — '
            'regenerate the bpy stage'
        )
    if dead:
        for element, rect, mean, cell_threshold in dead:
            print(
                'reencode_paint: dead cell '
                + json.dumps(
                    [element, rect, round(mean, 6), round(cell_threshold, 6)]
                )
            )
        raise SystemExit(
            f'reencode_paint: {len(dead)} of {owned} owned cells read below '
            f'{max_pct:g}% of the atlas P99'
        )
    print(
        f'reencode_paint: postEncode atlasP99={atlas_p99:.6f} threshold={threshold:.6f} '
        f'cells={len(cells)} owned={owned} dead=0'
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
