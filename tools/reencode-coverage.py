# tools/reencode-coverage.py — the lightmap-plates coverage gate (brief 44's ruling §3, v1).
# The gate fails when a REQUIRED atlas cell of the composed/painted linear plate reads
# UNWRITTEN: the cell's interior RGB max <= the floor. That is the pure-black class the
# tear-tbdr-lane 1(a) overlay audit convicted: the flat bake's use_clear=True cleared the
# whole atlas while the emitter-exclusion law (bake.py EMITTER_EXCLUSION) kept the sconce
# objects out of the bake set, so the reserved sconce strip (chart rows [0, stripRowPx))
# reads pure black on dusk/night, and ~25% of the shell's faces read pure black on all
# three plates. The gate sits where exactly-0.0 float (unwritten) is distinguishable from
# written-but-dark (a tiny nonzero float): on the linear EXR, after the paint, BEFORE the
# LDR encode. It never reads the encoded PNG/ktx2.
#
#   blender -b --factory-startup -noaudio --python-exit-code 1 -P tools/reencode-coverage.py -- \
#     check <exr> <bake-layout.<state>.json> <bake-summary.<state>.json> \
#       [--strip-px <n>] [--res <n>] [--floor <f>] [--require-strip] \
#       [--shelf-owner <name>] [--strip-owner <name>] [--exclude <csv | path.json>]
#
# Inputs (fail-closed: a missing/unreadable/unparsable artifact fails naming it):
#   <exr>                        the composed (or single-source) plate — the exact file the
#                                encode consumes (reencode.mjs calls post-paint, pre-encode).
#   <bake-layout.<state>.json>   the builder's lm block ({'lm': block}) written beside the
#                                bake stage. Its cells rows ARE the per-cell px rects
#                                ([x, y, w, h], chart px, y from the top, roster order) —
#                                no bake-cells.<state>.json exists or is needed — plus
#                                the patches dict (the paint step's domain: part name →
#                                [x, y, w, h] chart px), coveredCells/dimCells (brief 7's
#                                declared dim classes), stripRowPx, and the strip's
#                                equal-cell grid under lm.strip
#                                ({mode, grid, cellPx, faces, v0}; the strip-block
#                                addition — the same fields the export summary's lm.strip
#                                has always carried, now beside the layout too).
#   <bake-summary.<state>.json>  the bake sidecar. Its `receivers` field (brief 44 §3: the
#                                flat bake's selected targets' mesh datablock names + the
#                                S2A targets) is the required-receiver set; a missing or
#                                malformed field = a summary that predates the law —
#                                regenerate the bake.
#
# The pin classes, stated once:
#   REQUIRED-WRITTEN (fail on unwritten):
#     (a) every roster cell whose owner is in the receivers set. The v1 roster-owner law:
#         the layout-identity law binds the bake-layout roster to the atlas's ONE shelf
#         datablock (--shelf-owner, default 'shell'); per-cell owner names would add a
#         field to the hashed lm canon (the layoutHash must not move), so the owner rides
#         the flag. The receivers list must contain the shelf owner — a bake whose own
#         target list lacks the roster's owner cannot have written the roster (fail loud,
#         never the vacuous report-only downgrade).
#     (b) under --require-strip: the strip's INKED cells — the strip block's first `faces`
#         grid slots (cell i: col = i % grid, row = i // grid, rect = [col*cellW,
#         (grid-row-1)*cellH, cellW, cellH], chart px); the band's empty grid slots (no
#         face's UV rect maps there) are never pinned. The flag stays a decision-rerun
#         capability, never the committed drive: the RG-E1 re-adjudication makes the strip
#         REPORT-ONLY (the look law keeps the sconce's cells clear whenever the glow is a
#         live emitter), and tools/reencode.mjs passes no --require-strip.
#   REPORT-ONLY (counted, never failing, v1): cells that are allocated but not pinned —
#     the strip's inked cells when --require-strip is absent.
#   PATCH-DOMAIN (report-only, counted, never failing): every roster cell whose rect
#     exactly equals one of the layout lm block's `patches` rects (doorcard, pane01..11,
#     stairlight — the shelf pack's single-rect parts). Those rects are the PAINT step's
#     domain: reencode-paint.py overwrites exactly them per state with DECLARED colours
#     (the night pane paint is the declared [0,0,0] — the D1 dial's night-zero law, proven
#     by the bake summary's paneApplied/paneProof rows), so a declared-black patch cell is
#     not unwritten. The strip and coveredCells/dimCells exemptions keep their precedence.
#   EXEMPT (skipped, counted): coveredCells ∪ dimCells read from the layout block — the
#     same source file and keys as tools/reencode-paint.py's declared handling — plus
#     --exclude (an inline comma/space list of indices, or a JSON path carrying `deadCells`
#     — the bake-log memory key — or coveredCells/dimCells).
#
# Sampling law: every cell's interior = its allocation inset 2 px on all four sides (the
# builder's Sol-amended pad law, LM_PAD_PX = 2); an empty interior is skipped (counted).
# Chart y runs from the top, Blender's pixel rows from the bottom (r0 = height - (y + h)) —
# the layout/paint convention. The unwritten verdict, stated once: UNWRITTEN = the interior
# is EXACTLY 0.0 everywhere — max(R, G, B) over the whole interior <= --floor, default 0.0
# (the bake's use_clear cleared the cell and nothing wrote it; a float exact zero);
# written-but-dark = ANY nonzero float however small, never unwritten (--floor exists for
# overrides only). A non-finite interior fails loud naming the cell — a plate
# defect, never a dead-cell row (the reencode-paint.py law). The reserved-band law: a
# roster cell with y < strip_px fails loud (the band belongs to the sconce datablock; a
# roster cell inside it is a packer bug).
#
# Output: `ZIMNY_COVERAGE ok <state> cells=<n> checked=<m>` + a breakdown line, or a fail
# listing up to 20 dead cells (index, owner, [x, y, w, h], mean, max) plus the full count.
# Exit code 1 on every guarded defect. Deterministic: fixed arithmetic, no randomness,
# no clock.
import json
import math
import os
import sys

import bpy
import numpy as np

CELL_INSET_PX = 2      # the pad law's inset (rastrelli-gallery.py's LM_PAD_PX = 2.0)
MAX_DEAD_LISTED = 20   # the fail listing's cap; the full count always prints


def fail(message):
    sys.stderr.write('reencode_coverage: ' + message + '\n')
    sys.exit(1)


def pop_value(flag, inline, rest):
    if inline is not None:
        return inline
    if not rest:
        fail(f'{flag} needs a value')
    return rest.pop(0)


def read_int(flag, inline, rest):
    raw = pop_value(flag, inline, rest)
    try:
        return int(raw)
    except ValueError:
        fail(f'{flag} needs an integer, got {raw!r}')


def read_float(flag, inline, rest):
    raw = pop_value(flag, inline, rest)
    try:
        return float(raw)
    except ValueError:
        fail(f'{flag} needs a number, got {raw!r}')


def read_str(flag, inline, rest):
    return pop_value(flag, inline, rest)


def parse_check_args(argv):
    """The check grammar: 3 positionals + the option table. Both '--flag value' and
    '--flag=value' forms parse (the reencode-paint.py convention)."""
    opts = {
        'strip_px': 0,
        'res': 1536,
        'floor': 0.0,
        'require_strip': False,
        'shelf_owner': 'shell',
        'strip_owner': 'sconce',
        'excludes': [],
    }
    positional = []
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token.startswith('--') and '=' in token:
            flag, inline = token.split('=', 1)
        else:
            flag, inline = token, None
        if flag == '--strip-px':
            opts['strip_px'] = read_int(flag, inline, rest)
        elif flag == '--res':
            opts['res'] = read_int(flag, inline, rest)
        elif flag == '--floor':
            opts['floor'] = read_float(flag, inline, rest)
        elif flag == '--require-strip':
            if inline is not None:
                fail('--require-strip takes no value')
            opts['require_strip'] = True
        elif flag == '--shelf-owner':
            opts['shelf_owner'] = read_str(flag, inline, rest)
        elif flag == '--strip-owner':
            opts['strip_owner'] = read_str(flag, inline, rest)
        elif flag == '--exclude':
            opts['excludes'].append(read_str(flag, inline, rest))
        elif token.startswith('--'):
            fail(f'unknown option {token}')
        else:
            positional.append(token)
    if len(positional) != 3:
        fail('usage: ... -- check <exr> <bake-layout.<state>.json> <bake-summary.<state>.json> '
             '[--strip-px <n>] [--res <n>] [--floor <f>] [--require-strip] '
             '[--shelf-owner <name>] [--strip-owner <name>] [--exclude <csv | path.json>]')
    opts['exr'], opts['layout'], opts['receivers'] = positional
    if opts['strip_px'] < 0 or opts['res'] <= 0:
        fail('--strip-px must be >= 0 and --res must be > 0')
    if not math.isfinite(opts['floor']) or opts['floor'] < 0.0:
        fail(f'--floor must be finite and >= 0, got {opts["floor"]!r}')
    if opts['require_strip'] and opts['strip_px'] == 0:
        fail('--require-strip needs --strip-px > 0 (the room has no reserved strip)')
    return opts


def read_json(path, what):
    try:
        with open(path, 'r', encoding='utf-8') as handle:
            return json.load(handle)
    except OSError as exc:
        fail(f'cannot read the {what} at {path}: {exc}')
    except ValueError as exc:
        fail(f'the {what} at {path} is not valid JSON: {exc}')


def declared_exemptions(lm, cells, path):
    """The declared dim classes (brief 7's law artifact rgnext-7): coveredCells + dimCells
    from the layout block — the same source file and keys as reencode-paint.py's handling.
    Fail-closed on absence/malformity: types, the roster range, sorted-unique, disjoint
    (a duplicate or overlapping index would silently skip a cell twice)."""
    covered = lm.get('coveredCells')
    dim = lm.get('dimCells')
    declared_ok = (
        isinstance(covered, list) and isinstance(dim, list)
        and all(isinstance(i, int) and not isinstance(i, bool) for i in covered)
        and all(isinstance(i, int) and not isinstance(i, bool) for i in dim)
    )
    if not declared_ok:
        fail(f"the layout at {path} lacks valid coveredCells/dimCells (the declared dim "
             f'classes, got {covered!r} / {dim!r}) — regenerate the bpy stage')
    for name, ids in (('coveredCells', covered), ('dimCells', dim)):
        if any(i < 0 or i >= len(cells) for i in ids):
            fail(f"the layout's lm block {name} holds an index outside the "
                 f'{len(cells)}-cell roster — regenerate the bpy stage')
        if ids != sorted(set(ids)):
            fail(f"the layout's lm block {name} is not sorted-unique — regenerate the "
                 'bpy stage')
    both = sorted(set(covered) & set(dim))
    if both:
        fail(f"the layout's lm block coveredCells and dimCells overlap at {both[:8]} "
             '— regenerate the bpy stage')
    return set(covered) | set(dim)


def patch_rects(lm, path):
    """The layout's lm block patches dict — the paint step's domain: reencode-paint.py
    overwrites exactly these rects per state with declared colours (the night pane paint
    is the declared [0,0,0]), so a patch cell's verdict is never the gate's. Fail-closed
    on absence/malformity, the declared-key law: a dict of part name -> [x, y, w, h]
    chart-px rect (integral px, the roster cells' convention). Returns {name: int tuple}."""
    patches = lm.get('patches')
    if not isinstance(patches, dict):
        fail(f"the layout at {path} lacks a valid patches dict (the paint step's domain, "
             f'got {patches!r}) — regenerate the bpy stage')
    rects = {}
    for name, rect in patches.items():
        if not (isinstance(name, str) and isinstance(rect, list) and len(rect) == 4
                and all(isinstance(v, (int, float)) and not isinstance(v, bool)
                        and math.isfinite(v) and float(v).is_integer() for v in rect)):
            fail(f"the layout's lm block patches entry {name!r} is not a chart-px rect "
                 f'[x, y, w, h] (got {rect!r}) — regenerate the bpy stage')
        rects[name] = tuple(int(v) for v in rect)
    return rects


def validate_strip_block(lm, res, strip_px):
    """The strip block's equal-cell grid law (the builder's strip mode: cell_w = res/grid,
    cell_h = strip_px/grid, v0 = 1 - strip_px/res; the stored floats validated to 1e-3,
    then rounded to ints — the builder's values are exact at 1536/6). Returns
    (grid, cell_w, cell_h, faces)."""
    block = lm.get('strip')
    if not isinstance(block, dict):
        fail("the layout's lm block carries no strip block and --strip-px > 0 — the layout "
             'predates the strip-block addition — regenerate the bpy stage')
    grid = block.get('grid')
    cell_px = block.get('cellPx')
    faces = block.get('faces')
    v0 = block.get('v0')
    if not isinstance(grid, int) or isinstance(grid, bool) or grid < 1:
        fail(f"the layout's strip block has no valid grid (got {grid!r}) — regenerate the "
             'bpy stage')
    if not (isinstance(cell_px, list) and len(cell_px) == 2
            and all(isinstance(v, (int, float)) and not isinstance(v, bool)
                    and math.isfinite(v) and v > 0 for v in cell_px)):
        fail(f"the layout's strip block has no valid cellPx (got {cell_px!r}) — "
             'regenerate the bpy stage')
    if not isinstance(faces, int) or isinstance(faces, bool) or not 1 <= faces <= grid * grid:
        fail(f"the layout's strip block has no valid faces count (got {faces!r}, grid "
             f'{grid}) — regenerate the bpy stage')
    cell_w, cell_h = round(cell_px[0]), round(cell_px[1])
    if abs(cell_px[0] - res / grid) > 1e-3 or cell_w * grid != res:
        fail(f"the layout's strip cellW {cell_px[0]!r} does not tile {res} px at grid "
             f'{grid} — the equal-cell grid law')
    if abs(cell_px[1] - strip_px / grid) > 1e-3 or cell_h * grid != strip_px:
        fail(f"the layout's strip cellH {cell_px[1]!r} does not tile the {strip_px} px "
             f'reserved strip at grid {grid} — the equal-cell grid law')
    if not isinstance(v0, (int, float)) or isinstance(v0, bool) \
            or not math.isfinite(v0) or abs(v0 * res - (res - strip_px)) > 1e-3:
        fail(f"the layout's strip v0 {v0!r} does not place the band at rows "
             f'[0, {strip_px}) — the reserved-strip law')
    return grid, cell_w, cell_h, faces


def strip_cell_rects(strip_block):
    """The strip's inked cells' px rects (chart px, y from the top): the first `faces`
    grid slots; the band's empty slots never appear. Cell i: col = i % grid,
    row = i // grid, y0 = strip_px - (row + 1) * cell_h = (grid - row - 1) * cell_h."""
    grid, cell_w, cell_h, faces = strip_block
    return [[(i % grid) * cell_w, (grid - i // grid - 1) * cell_h, cell_w, cell_h]
            for i in range(faces)]


def load_layout(path, res, strip_px):
    """The layout's lm block, validated: the shelf cells' px rects, the reserved-band law,
    the declared dim classes, the patches dict (the paint step's domain), and — when
    strip_px > 0 — the strip block's equal-cell grid.
    Returns (cells, exempt, strip_block or None, patch rects {name: int (x, y, w, h)})."""
    lm = (read_json(path, 'bake-layout file').get('lm') or {})
    if lm.get('mode') != 'shelf':
        fail(f"the layout's lm.mode is {lm.get('mode')!r}, not 'shelf' — the coverage gate "
             'pins the shelf atlas')
    cells = lm.get('cells')
    if not isinstance(cells, list) or not cells:
        fail("the layout's lm block has no cells records — regenerate the bpy stage")
    for index, row in enumerate(cells):
        rect = row.get('rect') if isinstance(row, dict) else None
        if not isinstance(rect, list) or len(rect) != 4:
            fail(f'malformed cell record {row!r} at roster index {index} '
                 "(needs {'element', 'rect': [x, y, w, h]}) — regenerate the bpy stage")
        x, y, w, h = (int(v) for v in rect)
        if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > res or y + h > res:
            fail(f'cell {index} rect {rect} is outside the {res}x{res} atlas')
        if strip_px > 0 and y < strip_px:
            # The reserved-band law: chart rows [0, strip_px) belong to the sconce
            # datablock's strip; a roster cell reaching into them is a packer bug.
            fail(f'cell {index} rect {rect} reaches into the reserved strip rows '
                 f'[0, {strip_px}) — regenerate the bpy stage')
    exempt = declared_exemptions(lm, cells, path)
    patches = patch_rects(lm, path)
    strip_block = validate_strip_block(lm, res, strip_px) if strip_px > 0 else None
    return cells, exempt, strip_block, patches


def load_receivers(path, shelf_owner):
    """The bake sidecar's receivers field (brief 44 §3): the per-state receiver datablock
    names — the flat bake's selected targets' mesh datablock names + the S2A targets.
    Fail-closed: a missing/malformed field = a summary that predates the law."""
    doc = read_json(path, 'bake-summary file')
    receivers = doc.get('receivers')
    if not (isinstance(receivers, list) and receivers
            and all(isinstance(name, str) and name for name in receivers)):
        fail(f"the bake summary at {path} has no valid receivers field (the per-state "
             f'receiver datablock names, got {receivers!r}) — the summary predates the '
             'receiver law — re-run the bake (node tools/bake.mjs)')
    if shelf_owner not in receivers:
        fail(f"the receivers list {receivers} lacks the layout roster owner "
             f"{shelf_owner!r} — a bake whose target list lacks the roster's owner "
             'cannot have written the roster — regenerate the bake')
    state = doc.get('state')
    return receivers, state if isinstance(state, str) else 'unknown'


def extra_exclusion(spec, cell_count):
    """The --exclude value: an inline comma/space list of indices, or a JSON path carrying
    `deadCells` (the bake-log memory key) or coveredCells/dimCells (the declared keys)."""
    if os.path.isfile(spec):
        doc = read_json(spec, 'exclusions file')
        ids = doc.get('deadCells')
        if not isinstance(ids, list):
            ids = (doc.get('coveredCells') or []) + (doc.get('dimCells') or [])
        if not all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
            fail(f'the exclusions file at {spec} carries no valid deadCells/'
                 'coveredCells/dimCells index list')
    else:
        try:
            ids = [int(part) for part in spec.replace(',', ' ').split()]
        except ValueError:
            fail(f'--exclude value {spec!r} is neither an existing file nor an index list')
    if any(i < 0 or i >= cell_count for i in ids):
        fail(f'--exclude holds an index outside the {cell_count}-cell roster')
    return set(ids)


def load_exr(path, res):
    """The plate as stored floats: Blender bottom-origin rows, the returned array's
    channels are RGB. The atlas law: width == height == --res (the layout grid's basis)."""
    try:
        image = bpy.data.images.load(path, check_existing=False)
    except Exception as exc:  # noqa: BLE001 — fail loud naming the file, not a traceback
        fail(f'cannot read the plate EXR at {path}: {exc}')
    width, height = image.size
    if (width, height) != (res, res):
        fail(f'the plate at {path} is {width}x{height}, the atlas law is {res}x{res} '
             '(--res) — the plate and the layout disagree')
    if image.channels < 3:
        fail(f'the plate at {path} carries {image.channels} channel(s), need >= 3 (RGB)')
    linear = np.empty(width * height * image.channels, dtype=np.float32)
    image.pixels.foreach_get(linear)
    return linear.reshape(height, width, image.channels)[:, :, :3]


def sample_interior(rgb, rect, res):
    """One cell's interior sample: the allocation inset CELL_INSET_PX on all four sides
    (the pad law), chart y from the top converted to Blender's bottom-origin rows
    (r0 = res - (y + h)). Returns (mean, max) over the interior's RGB, or None when the
    interior is empty."""
    x, y, w, h = (int(v) for v in rect)
    inset = CELL_INSET_PX
    if w - 2 * inset <= 0 or h - 2 * inset <= 0:
        return None
    r0 = res - (y + h)
    block = rgb[r0 + inset : r0 + h - inset, x + inset : x + w - inset]
    return float(block.mean()), float(block.max())


def verdict(sample, floor, index, owner, rect, dead):
    """The unwritten verdict for one sample: non-finite fails loud (a plate defect, never
    a dead-cell row); interior max <= floor collects the cell as dead. Returns True when
    the cell was actually sampled."""
    if sample is None:
        return False
    mean, top = sample
    if not math.isfinite(mean) or not math.isfinite(top):
        fail(f'cell {index} ({owner}) rect {rect} interior reads non-finite '
             f'(mean {mean!r}, max {top!r}) — the plate carries non-numeric pixels; '
             'check the bake/encode plate, not a cell')
    if top <= floor:
        dead.append([index, owner, list(rect), mean, top])
    return True


def check(argv):
    """The coverage gate's one mode. Fills the pin classes, samples the plate, fails on
    any REQUIRED cell reading unwritten; the report-only, patch-domain and exempt classes
    only count."""
    opts = parse_check_args(argv)
    cells, exempt, strip_block, patches = load_layout(
        opts['layout'], opts['res'], opts['strip_px'])
    receivers, state = load_receivers(opts['receivers'], opts['shelf_owner'])
    for extra in opts['excludes']:
        exempt |= extra_exclusion(extra, len(cells))
    # the patch-domain class: every roster cell whose rect exactly equals one of the
    # layout's lm.patches rects — the paint step's domain (reencode-paint.py overwrites
    # exactly those rects per state with declared colours, so a declared-black patch cell
    # is not unwritten). Report-only: counted, never failing (v1). The exempt classes keep
    # their precedence: an exempt cell stays skipped, never re-classified.
    patch_domain = sorted(
        index for index, row in enumerate(cells)
        if index not in exempt
        and tuple(int(v) for v in row['rect']) in set(patches.values())
    )
    # (a) the receivers' roster cells — the v1 roster-owner law puts every roster cell
    # under the shelf owner, whose membership the receivers load just enforced.
    required_roster = set(range(len(cells))) - exempt - set(patch_domain)
    # (b) the strip pin: the inked band cells are REQUIRED on every state under
    # --require-strip, else the report-only class (counted, never failing, v1).
    strip_rects = strip_cell_rects(strip_block) if strip_block is not None else []
    required_total = len(required_roster) + (len(strip_rects) if opts['require_strip'] else 0)
    print(
        f'reencode_coverage: receivers={receivers} shelfOwner={opts["shelf_owner"]} '
        f'stripPx={opts["strip_px"]} requireStrip={opts["require_strip"]} '
        f'roster={len(cells)} exempt={len(exempt)} required={required_total} '
        f'stripCells={len(strip_rects)} patchCells={len(patch_domain)}'
    )
    rgb = load_exr(opts['exr'], opts['res'])
    dead_required = []
    dead_report_only = []
    dead_patch_domain = []
    checked = 0
    report_checked = 0
    patch_checked = 0
    skipped_empty = 0
    for index in sorted(required_roster):
        rect = cells[index]['rect']
        sampled = verdict(sample_interior(rgb, rect, opts['res']), opts['floor'],
                          index, opts['shelf_owner'], rect, dead_required)
        checked += 1 if sampled else 0
        skipped_empty += 0 if sampled else 1
    for index, rect in enumerate(strip_rects):
        pinned = opts['require_strip']
        owner = opts['strip_owner']
        sampled = verdict(sample_interior(rgb, rect, opts['res']), opts['floor'],
                          index, owner, rect,
                          dead_required if pinned else dead_report_only)
        if pinned:
            checked += 1 if sampled else 0
        else:
            report_checked += 1 if sampled else 0
        skipped_empty += 0 if sampled else 1
    for index in patch_domain:
        rect = cells[index]['rect']
        sampled = verdict(sample_interior(rgb, rect, opts['res']), opts['floor'],
                          index, opts['shelf_owner'], rect, dead_patch_domain)
        patch_checked += 1 if sampled else 0
        skipped_empty += 0 if sampled else 1
    if dead_report_only:
        print(
            'reencode_coverage: report-only dead (allocated, not pinned — counted, never '
            f'failing in v1): {len(dead_report_only)} of {report_checked}'
        )
        for index, owner, rect, mean, top in dead_report_only[:MAX_DEAD_LISTED]:
            print('reencode_coverage: report-only cell '
                  + json.dumps([index, owner, rect, round(mean, 9), round(top, 9)]))
    if dead_patch_domain:
        print(
            'reencode_coverage: patch-domain dead (the paint step owns these rects — '
            f'counted, never failing): {len(dead_patch_domain)} of {patch_checked}'
        )
        for index, owner, rect, mean, top in dead_patch_domain[:MAX_DEAD_LISTED]:
            print('reencode_coverage: patch-domain cell '
                  + json.dumps([index, owner, rect, round(mean, 9), round(top, 9)]))
    if dead_required:
        for index, owner, rect, mean, top in dead_required[:MAX_DEAD_LISTED]:
            print('reencode_coverage: unwritten cell '
                  + json.dumps([index, owner, rect, round(mean, 9), round(top, 9)]))
        fail(f'{len(dead_required)} of {checked} required cells read UNWRITTEN '
             f'(interior RGB max <= floor {opts["floor"]:g}) — the plate ships pure-black '
             'atlas cells')
    print(
        f'reencode_coverage: exempt={len(exempt)} skippedEmpty={skipped_empty} '
        f'reportOnlyDead={len(dead_report_only)} patchChecked={patch_checked} '
        f'patchDomainDead={len(dead_patch_domain)}'
    )
    print(f'ZIMNY_COVERAGE ok {state} cells={required_total} checked={checked}')


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    if not argv or argv[0] != 'check':
        fail('usage: ... -- check <exr> <bake-layout.<state>.json> '
             '<bake-summary.<state>.json> [--strip-px <n>] [--res <n>] [--floor <f>] '
             '[--require-strip] [--shelf-owner <name>] [--strip-owner <name>] '
             '[--exclude <csv | path.json>]')
    check(argv[1:])


main()
