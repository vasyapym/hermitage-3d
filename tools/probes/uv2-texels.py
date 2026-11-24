# tools/probes/uv2-texels.py — the G-C texel-floor readout (the 2026-11-24 stock-take
# gates artifact; COMMITTED code, authored by the round; run only at the round's gate
# phases — never by CI). Prints, per part, the texel floor across the short axis off the
# exported UV2 at 1536, and exits non-zero on a miss.
#
#   python3 tools/probes/uv2-texels.py <stage>/summary.json
#
# The input is the export stage's own summary.json — its lm.cells rows carry every shelf
# cell's rect [x, y, w_total, h_total] (chart px, y from the top) with the builder element
# name riding each row, and lm.stripRowPx + declared.lmRes pin the usable atlas. The cells
# ARE the exported TEXCOORD_1's rects (the same placements the UV law consumed), so the
# mapped interior span of a cell = (w_total - 2 x pad, h_total - 2 x pad) with the builder's
# LM_PAD_PX = 2 — the texel floor a face reads across its short axis.
#
# Gates (the gates artifact G-C, every line prints numbers):
#   cove (the impost element) >= 4.0 texels across, the minimum printed (W1: the cove's
#     1.12 x 4.0 = 4.48, snapped to 5 whole texels; the element-wide minimum covers the
#     row's "every other IMPOST_PROFILE face >= 2" a fortiori);
#   dado.panel >= 2.0 (W2, every moulding return) and dado.rail >= 2.0 (W3, the cap's
#     profile faces) — the panel and dado fields keep the wall field's density (1.0), no
#     gate of their own;
#   the five airlock faces on their own cells: each airlock element carries exactly one
#     cell, and no borrowedFaces record rides the block (W4 — borrowed faces after
#     export: 0);
#   no rect overlap (pairwise disjoint cells — the packer's own belt, re-read off the
#     exported record);
#   atlas area in use <= 100 % of the usable shelf (LM_RES x (LM_RES - stripRowPx); the
#     reserved strip is the sconce template's, not atlas content).
#
# Pure stdlib, deterministic, no network.
import json
import sys


def fail(message):
    print(f'uv2-texels: {message}')
    sys.exit(2)


LM_PAD_PX = 2          # tools/bpy/rastrelli-gallery.py LM_PAD_PX (the pad law's inset)
LM_RES_EXPECTED = 1536  # the room's LM_RES line (the stock-take holds it)
COVE_MIN = 4.0         # W1's cove floor (the snap lands 5; the gate reads the artifact's 4.0)
FAMILY_MIN = 2.0       # W2/W3's returns-and-caps floor
AIRLOCK_ELEMENTS = ('airlock.reveal.w', 'airlock.reveal.e', 'airlock.soffit',
                    'airlock.floor', 'airlock.threshold')

if len(sys.argv) != 2:
    print('usage: uv2-texels.py <stage>/summary.json')
    sys.exit(2)

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    summary = json.load(fh)
lm = summary.get('lm') or {}
cells = lm.get('cells')
if not isinstance(cells, list) or not cells:
    fail('the summary lm block carries no cells list - regenerate the bpy stage')
res = int((summary.get('declared') or {}).get('lmRes') or LM_RES_EXPECTED)
strip_row = int(lm.get('stripRowPx') or 0)

parts = {}
for idx, row in enumerate(cells):
    rect = row.get('rect')
    element = row.get('element')
    if not isinstance(rect, list) or len(rect) != 4 or not element:
        fail(f'cell {idx} is not a valid {{rect, element}} row: {row!r}')
    x, y, wt, ht = (int(v) for v in rect)
    if wt <= 2 * LM_PAD_PX or ht <= 2 * LM_PAD_PX:
        fail(f'cell {idx} ({element}) allocation {wt}x{ht} leaves no mapped interior')
    short = min(wt, ht) - 2 * LM_PAD_PX
    long_ = max(wt, ht) - 2 * LM_PAD_PX
    parts.setdefault(element, []).append(
        {'rect': (x, y, wt, ht), 'short': short, 'long': long_, 'idx': idx})

print(f'== uv2-texels (LM_RES {res}, pad {LM_PAD_PX} px, cells {len(cells)}, '
      f'parts {len(parts)}) ==')
worst = None
for element in sorted(parts):
    rows_ = parts[element]
    short_min = min(r['short'] for r in rows_)
    area = sum(r['rect'][2] * r['rect'][3] for r in rows_)
    print(f'{element}: faces {len(rows_)} · short-axis floor {short_min} tex '
          f'· area {area} px2 ({100.0 * area / (res * (res - strip_row)):.2f} % of the shelf)')
    worst = (element, short_min) if worst is None or short_min < worst[1] else worst

verd = []
imp = min(r['short'] for r in parts.get('impost', [])) if 'impost' in parts else 0
verd.append((f'W1 cove/impost short-axis floor >= {COVE_MIN} (minimum printed: {imp})',
             imp >= COVE_MIN))
for element, what in (('dado.panel', 'W2 the panels\' moulding returns'),
                      ('dado.rail', 'W3 the dado cap profile faces')):
    if element not in parts:
        verd.append((f'{what}: the element carries no cells', False))
        continue
    floor = min(r['short'] for r in parts[element])
    verd.append((f'{what} short-axis floor >= {FAMILY_MIN} (minimum: {floor})',
                 floor >= FAMILY_MIN))
missing_airlock = [el for el in AIRLOCK_ELEMENTS
                   if el not in parts or len(parts[el]) != 1]
verd.append(('W4 the five airlock faces on their own cells (one cell each, present)'
             if not missing_airlock else
             f'W4 the airlock faces missing or not single-celled: {", ".join(missing_airlock)}',
             not missing_airlock))
verd.append(('W4 no borrowedFaces record rides the lm block (borrowed faces after '
             'export: 0)', 'borrowedFaces' not in lm))
# the pairwise overlap sweep: x-sorted, the active list pruned by x1 <= the candidate's x0.
order = sorted(((r['rect'], element, r['idx']) for element, rs in parts.items() for r in rs),
               key=lambda item: item[0][0])
overlaps = 0
active = []
for rect, element, idx in order:
    x, y, wt, ht = rect
    active = [a for a in active if a[0][0] + a[0][2] > x]
    for arect, ael, aidx in active:
        ax, ay, awt, aht = arect
        if ax < x + wt and ay < y + ht and ay + aht > y:
            overlaps += 1
            if overlaps <= 4:
                print(f'overlap: cell {aidx} ({ael}) x cell {idx} ({element})')
    active.append((rect, element, idx))
verd.append((f'no rect overlap ({len(cells)} cells swept)', overlaps == 0))
used = sum(r['rect'][2] * r['rect'][3] for rs in parts.values() for r in rs)
usable = res * (res - strip_row)
verd.append((f'atlas use {used} / {usable} px2 = {100.0 * used / usable:.2f} % <= 100 %',
             used <= usable))

fails = 0
for name, ok in verd:
    if not ok:
        fails += 1
    print(f'{"PASS" if ok else "FAIL"}  {name}')
print(f'{len(verd) - fails}/{len(verd)} gates pass')
sys.exit(0 if fails == 0 else 1)
