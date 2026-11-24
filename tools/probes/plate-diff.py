# tools/probes/plate-diff.py — the G-E region diff (the 2026-11-24 stock-take gates
# artifact; COMMITTED code, authored by the round; run only at the round's gate phases —
# never by CI). Prints, per part, the area-weighted mean linear value of its texels,
# NEW plate through NEW UV2 ÷ OLD plate through OLD UV2, per state — layout-free, since
# the rects move — and exits non-zero on a miss.
#
#   blender -b --factory-startup -noaudio -P tools/probes/plate-diff.py -- \
#     --new-summary <new-stage>/summary.json --old-summary <old-stage>/summary.json \
#     --state day:<new-day.exr>:<old-day.exr> \
#     --state dusk:<new-dusk.exr>:<old-dusk.exr> \
#     --state nightChandeliers:<new-night.exr>:<old-night.exr>
#
# The parts come from each stage's own summary.json: lm.cells rows carry every shelf
# cell's rect [x, y, w_total, h_total] (chart px, y from the top) with the builder element
# name riding each row. The plate is the state's linear atlas EXR (the painted composite
# the encode reads — reencode.mjs's <room>.<state>.paint.exr — or the composite itself;
# the texels outside the painted patch rects are identical either way). The rect's pixel
# band reads r0 = height - (y + h) .. r0 + h (the reencode-paint y-flip law), the luminance
# law is rg-f4-bars.py's Rec.709 weights, and a part's mean = sum(rect mean x rect area) /
# sum(rect area) — each texel equal, so the rect-area weighting IS the part's texel mean.
#
# Classes (the gates artifact G-E):
#   PREDICTED to change: impost and cove · dado.panel, dado.rail and the wall fields in
#     their shadow · the five airlock faces · vault.gallery (the web under the adopted
#     word «B» + the east bays) · floor.flags, floor.band and wall.e (the east two bays'
#     floor, wall and vault — up, in every state the door row lights) · vault.reveal (the
#     mouth's reveal). These print without a verdict; a predicted part UNMOVED
#     (|ratio - 1| < 0.01) is named for the sitting's cause-reading, never hidden.
#   HELD = everything else. Under the adopted word «B» the band is ± 6 % of the held
#     parts' own median ratio, and the median itself must sit inside 0.84-0.98 — printed
#     beside the artifact's 0.86 closed-enclosure estimate. (The «A» band 0.97-1.03 is
#     retired with the o5 word; a held part outside the band, or the median outside
#     0.84-0.98, fails the exit.)
#
# Blender-hosted like the EXR readers it mirrors (tools/lm_compose.py,
# tools/reencode-paint.py). Deterministic: no clock, no network, no randomness.
import json
import sys

import bpy
import numpy as np

LM_RES_EXPECTED = 1536
PREDICTED = (
    'impost', 'dado.panel', 'dado.rail', 'wall.field', 'passage.field',
    'airlock.reveal.w', 'airlock.reveal.e', 'airlock.soffit', 'airlock.floor',
    'airlock.threshold',
    'vault.gallery', 'floor.flags', 'floor.band', 'wall.e', 'vault.reveal',
)
HELD_BAND_FRAC = 0.06      # under «B»: within ± 6 % of the held parts' own median
HELD_MEDIAN_MIN = 0.84     # the median itself inside 0.84-0.98, beside the 0.86 estimate
HELD_MEDIAN_MAX = 0.98
UNMOVED_EPS = 0.01


def fail(message):
    sys.stderr.write(f'plate-diff: {message}\n')
    sys.exit(2)


def parse_args(argv):
    args = {'new': None, 'old': None, 'states': []}
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token == '--new-summary':
            args['new'] = rest.pop(0)
        elif token == '--old-summary':
            args['old'] = rest.pop(0)
        elif token == '--state':
            spec = rest.pop(0)
            sep = spec.find(':')
            if sep <= 0:
                fail(f'--state spec must be <name>:<new-exr>:<old-exr>, got {spec!r}')
            name = spec[:sep]
            tail = spec[sep + 1:]
            sep2 = tail.rfind(':')
            if sep2 <= 0:
                fail(f'--state spec must be <name>:<new-exr>:<old-exr>, got {spec!r}')
            args['states'].append((name, tail[:sep2], tail[sep2 + 1:]))
        else:
            fail(f'unrecognised argument {token!r}')
    if args['new'] is None or args['old'] is None or not args['states']:
        fail('expected --new-summary, --old-summary and at least one --state')
    return args


def part_means(summary_path, plate_path):
    """Per element, the area-weighted mean luminance of the part's cells off one plate."""
    with open(summary_path, 'r', encoding='utf-8') as fh:
        summary = json.load(fh)
    lm = summary.get('lm') or {}
    cells = lm.get('cells')
    if not isinstance(cells, list) or not cells:
        fail(f'{summary_path}: the lm block carries no cells list - regenerate the stage')
    res = int((summary.get('declared') or {}).get('lmRes') or LM_RES_EXPECTED)
    src = bpy.data.images.load(plate_path, check_existing=False)
    width, height = src.size
    if (width, height) != (res, res):
        fail(f'{plate_path}: the plate is {width}x{height}, the stage pins {res}x{res}')
    channels = src.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    src.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)[:, :, 0:3].astype(np.float64)
    lum = 0.2126 * plane[:, :, 0] + 0.7152 * plane[:, :, 1] + 0.0722 * plane[:, :, 2]
    totals = {}
    for idx, row in enumerate(cells):
        rect = row.get('rect')
        element = row.get('element')
        if not isinstance(rect, list) or len(rect) != 4 or not element:
            fail(f'{summary_path}: cell {idx} is not a valid {{rect, element}} row')
        x, y, wt, ht = (int(v) for v in rect)
        r0 = height - (y + ht)   # the rect's y runs from the top; the pixels run bottom-up
        patch = lum[r0:r0 + ht, x:x + wt]
        area = wt * ht
        totals[element] = totals.get(element, (0.0, 0))
        old_sum, old_area = totals[element]
        totals[element] = (old_sum + float(patch.sum()), old_area + area)
    bpy.data.images.remove(src)
    return {element: total / max(area, 1) for element, (total, area) in totals.items()}


def main():
    args = parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    exit_code = 0
    for state, new_plate, old_plate in args['states']:
        new_means = part_means(args['new'], new_plate)
        old_means = part_means(args['old'], old_plate)
        both = sorted(set(new_means) & set(old_means))
        if not both:
            fail(f'{state}: the two stages share no part - the summaries disagree')
        rows = []
        for element in both:
            old_mean = old_means[element]
            ratio = new_means[element] / old_mean if old_mean > 0 else float('nan')
            rows.append((element, new_means[element], old_mean, ratio))
        held = [r for r in rows if r[0] not in PREDICTED]
        held_ratios = np.array([r[3] for r in held], dtype=np.float64)
        held_ratios = held_ratios[np.isfinite(held_ratios)]
        median = float(np.median(held_ratios)) if held_ratios.size else float('nan')
        print(f'== plate-diff · {state} ==')
        print(f'held parts {len(held)} · held median {median:.4f} '
              f'(band {HELD_MEDIAN_MIN}-{HELD_MEDIAN_MAX}, the 0.86 estimate beside it)')
        for element, new_mean, old_mean, ratio in rows:
            cls = 'PREDICTED' if element in PREDICTED else 'HELD'
            flag = ''
            if cls == 'PREDICTED' and abs(ratio - 1.0) < UNMOVED_EPS:
                flag = ' · UNMOVED (named for the sitting)'
            print(f'{cls} {element}: new {new_mean:.6f} · old {old_mean:.6f} · '
                  f'ratio {ratio:.4f}{flag}')
        misses = []
        for element, _new_mean, _old_mean, ratio in held:
            # under «B»: within ± 6 % of the held parts' own median (relative — the room's
            # light moves as a field, the band rides the field's level, not the axis)
            if not np.isfinite(ratio) or abs(ratio - median) > HELD_BAND_FRAC * median:
                misses.append(f'{element} ratio {ratio:.4f} outside the ±{HELD_BAND_FRAC:.0%} '
                              f'band of the median {median:.4f}')
        if not (HELD_MEDIAN_MIN <= median <= HELD_MEDIAN_MAX):
            misses.append(f'the held median {median:.4f} outside {HELD_MEDIAN_MIN}-'
                          f'{HELD_MEDIAN_MAX}')
        for miss in misses:
            print(f'FAIL  {miss}')
        if misses:
            exit_code = 1
        else:
            print(f'PASS  all {len(held)} held parts inside the band, the median in band')
    sys.exit(exit_code)


main()
