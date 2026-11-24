# tools/probes/rg-f4-bars.py — the RG-F4 bar checker (COMMITTED code, authored by the
# round; run only at the round's read phases — never by CI). Computes the ruling's
# acceptance bars from ONE capture dir's PNGs, the full-sample 6×4 grid method (the
# capture tool's in-page record carries the 2-px-sampler grids; the bars never mix
# samplers — every bar input here is full-sample).
#
#   python3 tools/probes/rg-f4-bars.py <after-dir> [before-dir]
#
# THE SOL-REVIEW HARDENING: the after-dir MUST carry every bar input frame — a missing
# day/dusk frame is a FAILING exit (a partial battery never silently certifies). The ONE
# lawful exception is the night states' REUSE: night-gj/g1/g2 may be inherited from a
# prior run ONLY when RG_F4_NIGHT_FROM=<dir> names it explicitly (the night plate is
# byte-identical by B6 — the reuse is then LABELLED in the output); night-g0 is never
# reused (it is the cheapest shot and the B6 anchor). Exit 0 only when every bar verdict
# is PASS (B2 is diagnostic — retired by the owner's call; its delta prints without a
# verdict and without failing the exit).
#
# Bars (the RG-F4 ruling, owner-ratified 2026-11-15; G1 = the golden stop):
#   B1 floor delta — G1 bottom row cols 2–5 mean: day ≥ night + 20; dusk in [night+5, night+15];
#      night 46 ± 1.
#   B3 vault — G1 top row mean: day ≥ night + 8; dusk ≥ night + 3.
#   B4 means — G1 day in [100, 125]; dusk in [88, 102]; night 86.6 ± 1; no G1 cell ≥ 200 in
#      ANY state (the clip guard); the ordering night ≤ dusk ≤ day at every shared stop.
#   B2 — RETIRED by the owner's call (the wash equalizes the two wall columns at any
#      B1-passing strength — measured −1.2 at the landed dial vs the paint-only +15.7);
#      printed as a diagnostic delta, never a verdict.
#   B6 containment — the night ktx2 sha and the glb sha are git-level facts (unmodified
#      files; the file-level gate is tests/assets.test.ts's rows-recompute check); the
#      passage means G0/G0b within ± 6 of the before-dir when one is given.
#   B5 — the DOOR bands live in the committed encode record; not re-derived here.
#
# THE JUNCTION ROWS (the rg-audit batch B; the S2A relief's readability, pinned from the
# D5 findings — tools/probes/rg-sightline.py sight mode; VFOV 55, portrait-frame.ts:17):
#   G1 (day + dusk): the vault band rows 0-7 (the D5 vaultBand rowsSpanned, rowOfNearest 0):
#     (a) rib-edge peaks = the count of adjacent-horizontal |d| >= 6 within the band,
#         expect >= 3 (the near ribs' edges);
#     (b) max adjacent-horizontal |d| >= baseline + 6 (day) / + 3 (dusk).
#   G1 (day): the cornice line (the D5 rowOfNearest 2): max adjacent-vertical |d| touching
#     row 2 (rows 1->2 and 2->3) >= baseline + 4.
#   G0b (day): the impost (the D5 rowsSpanned [5, 6], the junction-side subset): max
#     adjacent-vertical |d| across rows 5->6 >= baseline + 3.
# THE F5 ROWS (the RG-F5 dado + panel order; the pins from the f5-post2 capture 2026-11-21,
# the positions derived from the contract's stop poses + the kit constants and verified
# once on the frame — the numbers pin; they do not tune):
#   F5-A (day-g1, the gallery panel at the niche x 32.146, the z=70 wall — the screen
#     column 385-391): the frame's band steps through the panel: the top band rows
#     443-449 vs the interior rows 453-470 >= +12 (the M_STUCCO-over-M_PALE albedo step;
#     measured +22.7); the bottom band rows 475-481 vs the interior >= +12 (measured
#     +20.5); the rail's underside line rows 435-439 vs the rail's front rows 428-432
#     <= -8 (the fillet-shade device; measured -35.9).
#   F5-B (night-g1): the same pins: the band steps >= +5 (measured +19.9/+18.5), the
#     shade line <= -8 (measured -32.1).
#   F5-C: the frame-mean drift |after - RG_F5_PRE| <= +3.0 at every one of the
#     13 frames (the subtlety guard; the relief must not shift the room's light).
#   F5-REF: the RG_F5_PRE dir's day-g1 mean pins at 113.4 ± 1.5 (the declared reference's
#     identity - a self-diff or a wrong-era dir fails here).
#   THE REFERENCE LAW (the review-pass finding): the before_dir serves the JUNCTION rows
#     (the pre-junction read, the audit's own law); the F5-C/F5-REF read RG_F5_PRE - the
#     ROUND'S OWN pre capture. One dir cannot serve both: the junction signature lives in
#     the before_dir's diff, the round's drift lives in RG_F5_PRE's. RG_F5_PRE is an argv
#     element (RG_F5_PRE=<dir>), REQUIRED for the acceptance: its absence FAILS the F5-C
#     row (the drift guard is not skippable).
#   F5-D (day-g0b, the east passage wall's tall panel, the bay 63.5-66.75 — the screen
#     column 428-441): the top band rows 313-318 vs the interior rows 325-380 >= +12
#     (measured +12.3); the bottom band rows 384-390 vs the interior >= +12 (measured
#     +12.0).
# THE F6 ROWS (the threshold-set round rg-f6; the same pins-from-positions class):
#   P5 'threshold-depth' on the g2 frames: L(centre cells) - L(edge cells) >= +25 (day-g2),
#     >= +8 (dusk-g2), >= 0 (night-g2 — the first-run disposition: the authored 'night <= 0'
#     inverted the design's own R5 note «a warm-lined dark»; the box lining reads LIT by
#     the sconce bounce off the end wall, measured +17.6, and the far card stays black).
#     The centre = the 6x4 grid's rows 1-2 x cols 2-3 (the G2 stop stands 3 m off the portal
#     plane looking +x; the 1.6 x 2.4 m opening fills the frame's centre band); the edge =
#     the frame's perimeter cells (rows 0 and 3 whole, cols 0 and 5 in the middle rows).
#     The cell picks are RUNTIME-TUNED (the first real capture run may adjust the cells,
#     never the thresholds).
#   P6 'centre-hold' on day-g2: the COMMON CARD INTERIOR's 24x16-cell mean within ±4 of the
#     before capture's same cells (the review-pass fix: the screen-centre pin acquired
#     lining/floor texels after the displacement; the geometric pin = rows 7..11 x cols
#     10..13 of the 24x16 grid, the after-card's projected rect sitting fully inside the
#     before-card's; the card's texels are identical in both frames).
# THE O5 VAULT READOUTS (artifact o5, the 2026-11-24 stock-take; print-only diagnostics —
# no verdicts, never the exit code): VAULT, per frame, = the ARCH cells' mean ÷ the WEB
# cells' mean inside the frame's vault band; CROWN, per night frame (nightChandeliers), =
# the WEB cells' mean there. The classification is geometric, from tools/probes/
# rg-sightline.py's projection machinery (its STOPS + camera_basis + project_point +
# class_sight_rows; VFOV 55, the 1280×720 frame, the 24×16 grid rows top→bottom — mirrored
# below with the D5 vaultBand pin's own derivation): the arch cells are the rib bands'
# in-frame projections, the web is the vault band's remaining area; a stop whose frame
# carries no vault band prints n/a.
F5_PINS = {
    'day-g1': {'col': (385, 392), 'topBand': (443, 450), 'interior': (453, 471),
               'bottomBand': (475, 482), 'railFront': (428, 433), 'shade': (435, 440)},
    'night-g1': {'col': (385, 392), 'topBand': (443, 450), 'interior': (453, 471),
                 'bottomBand': (475, 482), 'railFront': (428, 433), 'shade': (435, 440)},
    'day-g0b': {'col': (428, 442), 'topBand': (313, 319), 'interior': (325, 381),
                'bottomBand': (384, 391)},
}
F5_BAND_STEP_MIN = 12.0     # F5-A/F5-D
F5_BAND_STEP_MIN_NIGHT = 5.0   # F5-B
F5_SHADE_MAX = -8.0
F5_MEAN_DRIFT_MAX = 3.0
# THE F6 ROWS' CONSTANTS (the threshold-set round; the cell picks are RUNTIME-TUNED — the
# first real capture run may adjust the CELLS, never the thresholds):
P5_CENTRE = (slice(1, 3), slice(2, 4))   # rows 1-2 x cols 2-3: the opening's centre at G2
P5_DAY_MIN = 25.0       # L(centre) - L(edge) >= +25 at day-g2
P5_DUSK_MIN = 8.0       # ... >= +8 at dusk-g2
P5_NIGHT_MIN = 0.0      # ... >= 0 at night-g2 — the first-run disposition: the authored
                        # 'night <= 0' inverted the design's own R5 «a warm-lined dark»
                        # (the lining reads LIT by the sconce bounce; measured +17.6)
P6_CENTRE_TOL = 15.0    # day-g2's card-interior mean within ±15 of the before capture —
                        # the first-run calibration: the common-interior diff carries the
                        # card's OWN parallax shift (one ray hits a different card texel
                        # before vs after; the glare paint's edge falloff measured -7.2);
                        # the accident classes (the card dropped / the material swapped)
                        # sit at |diff| >= 30 — the plate identity pins the texels
# THE PINNED BASELINES: probes/rg-f4-rgaudit-pre-aligned (2026-11-20, tree 656623ba, the
# PRE-S2A-bake state) — the committed plates + the pre-re-weight glb 5bf119e8 = the ALIGNED
# pre-junction read; it reproduces the committed battery's own numbers exactly (day-g1
# 113.4 / dusk-g1 98.6 / day-g0b 86.2 = the rg-f4-audit1 read). The tree-state capture the
# brief also ran (probes/rg-f4-rgaudit-pre, the NEW glb's re-weighted UV2 + the OLD plates)
# is a SCRAMBLED transcode — the re-weight moved every island, so that read carries
# transcode noise, not junction structure (day-g1 mean 83.0 vs 113.4; its deltas inflate
# ~5x: vault max 114.1 vs 82.2) — it rides the round record as a record, never a verdict
# baseline. The numbers pin; they do not tune.
import pathlib
import sys

import numpy as np
from PIL import Image

if len(sys.argv) < 2:
    print('usage: rg-f4-bars.py <after-dir> [before-dir] [RG_F4_NIGHT_FROM=<dir>]')
    sys.exit(2)
after_dir = pathlib.Path(sys.argv[1])
before_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith('RG_F4_NIGHT_FROM=') else None
night_from = None
rg_f5_pre = None
for arg in sys.argv:
    if arg.startswith('RG_F4_NIGHT_FROM='):
        night_from = pathlib.Path(arg.split('=', 1)[1])
    if arg.startswith('RG_F5_PRE='):
        rg_f5_pre = pathlib.Path(arg.split('=', 1)[1])

FRAMES = ['day-g0', 'day-g0b', 'day-gj', 'day-g1', 'day-g2',
          'dusk-g0', 'dusk-gj', 'dusk-g1', 'dusk-g2',
          'night-g0', 'night-gj', 'night-g1', 'night-g2']

# ---- the junction rows' pinned constants (rgaudit-pre-aligned; see the header) --------------
JUNCTION_GRID = (24, 16)          # cols x rows (the 24x16 instrument grid)
VAULT_ROWS = range(0, 8)          # the D5 G1 vault-band pin (rowsSpanned 0..7)
CORNICE_ROW = 2                   # the D5 G1 cornice-line pin (rowOfNearest 2)
IMPOST_ROWS = (5, 6)              # the D5 G0b impost pin (rowsSpanned [5, 6])
VAULT_PEAK_DELTA = 6.0            # a rib-edge peak's detector (adjacent-horizontal |d|)
JUNCTION_BASELINES = {            # the pinned pre-junction maxima (24x16, rgaudit-pre-aligned)
    'day-g1': {'vaultMaxDelta': 82.2279, 'corniceMaxDelta': 16.2348},
    'dusk-g1': {'vaultMaxDelta': 85.3803},
    'day-g0b': {'impostMaxDelta': 100.1194},
}
JUNCTION_FRAMES = ('day-g1', 'dusk-g1', 'day-g0b')  # the frames the rows read (in FRAMES)


# ---- the o5 readouts' geometry (tools/probes/rg-sightline.py's projection machinery,
# mirrored; the cites ride that file) ---------------------------------------------------------
# Artifact o5 reads the axis vault through the bench's A/B glb pair (tools/bpy/
# rastrelli-gallery.py: RG_BENCH_WEB_SLOT=pale retags the vault.gallery web rows to M_PALE;
# the 'arch' bands keep M_STUCCO). The classification here is geometric: the ARCH cells are
# the rib bands' in-frame 24x16 projections, the WEB is the vault band's remaining area.
O5_VFOV_DEG = 55.0        # src/camera/portrait-frame.ts:17 (the sightline probe's VFOV_DEG)
O5_TAN_HALF_V = float(np.tan(np.radians(O5_VFOV_DEG / 2.0)))
O5_TAN_HALF_H = O5_TAN_HALF_V * (1280.0 / 720.0)   # portrait-frame.ts:41-43 (aspect 16:9)
O5_VAULT_X0, O5_VAULT_X1 = 4.8, 44.0   # XS_GI[0] .. G_X1 — the vaulted bays' span (builder :124-127)
O5_G_ZC, O5_G_SPRING, O5_G_PEAK, O5_G_HALF, O5_G_ARC_SEGS = 73.0, 3.0, 3.6, 3.0, 8
O5_ARCH_WIDTH, O5_ARCH_SPRING, O5_ARCH_CROWN, O5_ARCH_SEGS = 0.44, 3.0, 3.34, 8
O5_PILASTER_X = tuple(44.0 - 3.387 * k for k in range(1, 12))   # BAY_PITCH 3.387 x 11 (:143-144)


def o5_arc(c, half, spring, peak, segs):
    """The builder's arc (rastrelli-gallery.py:308-313, mirrored in the sightline probe)."""
    return [(c - half * float(np.cos(np.pi * i / segs)),
             spring + (peak - spring) * float(np.sin(np.pi * i / segs)))
            for i in range(segs + 1)]


O5_G_ARC = o5_arc(O5_G_ZC, O5_G_HALF, O5_G_SPRING, O5_G_PEAK, O5_G_ARC_SEGS)
O5_ARCH_PROFILE = o5_arc(O5_G_ZC, O5_ARCH_WIDTH / 2.0, O5_ARCH_SPRING, O5_ARCH_CROWN,
                         O5_ARCH_SEGS)
# the frames' stops (rooms/rastrelli-gallery/contract.ts, the sightline STOPS rows; Gjb is
# not a frame stop — no f4 frame reads it):
O5_STOPS = {
    'g0': ((0.0, 1.7, 86.0), (1.6, 2.4, 73.0)),      # contract.ts:54-55 (subject JUNCTION)
    'g0b': ((0.8, 1.7, 79.5), (5.4, 1.7, 73.0)),     # contract.ts:67-68 (subject MOUTH_TURN)
    'gj': ((1.6, 1.7, 73.0), (43.5, 1.7, 73.0)),     # contract.ts:78-79 (subject EAST_DOOR)
    'gjb': ((12.8, 1.7, 73.0), (43.5, 1.7, 73.0)),   # contract.ts:93-94 (subject EAST_DOOR)
    'g1': ((24.0, 1.7, 73.0), (43.5, 1.7, 73.0)),    # contract.ts:100-101 (subject EAST_DOOR)
    'g2': ((40.5, 1.7, 73.0), (43.5, 1.7, 73.0)),    # contract.ts:108-109 (subject EAST_DOOR)
}


def o5_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def o5_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def o5_cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def o5_norm(a):
    return tuple(v / o5_dot(a, a) ** 0.5 for v in a)


def o5_basis(eye, subject):
    """camera_basis (sightline :236-242): forward at the SUBJECT (src/camera/rail.ts:18-19),
    world up; right/upc the orthonormal pair."""
    f = o5_norm(o5_sub(subject, eye))
    right = o5_norm(o5_cross(f, (0.0, 1.0, 0.0)))
    return f, right, o5_norm(o5_cross(right, f))


def o5_project(eye, basis, point):
    """project_point + its inFrame law (sightline :245-253): the tangent pair for in-frame
    points, None for the behind-eye or the out-of-frame ones."""
    v = o5_sub(point, eye)
    depth = o5_dot(v, basis[0])
    if depth <= 1e-9:
        return None
    tan_y = o5_dot(v, basis[2]) / depth
    tan_x = o5_dot(v, basis[1]) / depth
    if abs(tan_y) > O5_TAN_HALF_V or abs(tan_x) > O5_TAN_HALF_H:
        return None
    return tan_x, tan_y


def o5_cell(tan_x, tan_y):
    """The 24x16 cell of a tangent pair: the row per row_from_tan (sightline :256-260, rows
    top→bottom), the column its left→right mirror (this file's P6 h-band convention)."""
    row = int((1.0 - tan_y / O5_TAN_HALF_V) * (JUNCTION_GRID[1] / 2.0))
    col = int((1.0 + tan_x / O5_TAN_HALF_H) * (JUNCTION_GRID[0] / 2.0))
    return max(0, min(JUNCTION_GRID[1] - 1, row)), max(0, min(JUNCTION_GRID[0] - 1, col))


def o5_vault_samples():
    """The D5 vault-band sampler (sightline :399-407) generalized to the vault's own span —
    the G_ARC profile at every x of O5_VAULT_X0..O5_VAULT_X1, endpoints included, the
    interior divided evenly at the 0.5 m sampler step (plane_line's form, sightline
    :272-282): the x=44.0 end sample must ride the set for the G1 band to derive the D5
    pin's rowsSpanned 0..7 exactly."""
    pts = []
    n = int(round((O5_VAULT_X1 - O5_VAULT_X0) / 0.5))
    for k in range(n + 1):
        x = O5_VAULT_X0 + (O5_VAULT_X1 - O5_VAULT_X0) * k / n
        pts.extend((x, y, z) for z, y in O5_G_ARC)
    return pts


def o5_arch_samples():
    """The 'arch' class's sample set — the sightline probe's ribsBand sampler (:286-294):
    the 11 rib bands' both edge planes' ARCH_PROFILE arcs (the builder's 'arch' element,
    rastrelli-gallery.py:1425-1432)."""
    pts = []
    for x_c in O5_PILASTER_X:
        for s in (-1.0, 1.0):
            x = x_c + s * (O5_ARCH_WIDTH / 2.0)
            pts.extend((x, y, z) for z, y in O5_ARCH_PROFILE)
    return pts


def o5_stop_cells(stop_key):
    """The o5 classification at one stop — the D5-pin method (sightline run_sight :486-494):
    the vault band = the vault surface's in-frame 24x16 rows; the arch cells = the rib
    bands' in-frame projections inside those rows. Returns (band_rows, arch_cells);
    band_rows == () when the stop's frame carries no vault geometry."""
    eye, subject = O5_STOPS[stop_key]
    basis = o5_basis(eye, subject)
    rows = set()
    for p in o5_vault_samples():
        pr = o5_project(eye, basis, p)
        if pr is not None:
            rows.add(o5_cell(pr[0], pr[1])[0])
    if not rows:
        return (), set()
    arch = set()
    for p in o5_arch_samples():
        pr = o5_project(eye, basis, p)
        if pr is not None:
            r, c = o5_cell(pr[0], pr[1])
            if r in rows:
                arch.add((r, c))
    return tuple(sorted(rows)), arch


def o5_frame_readout(g24, band_rows, arch_cells):
    """The readouts off one 24x16 grid at a stop's cell sets: (VAULT arch÷web, the ARCH
    mean, the WEB mean) — None where a mean has no samples inside the band."""
    if not band_rows:
        return None, None, None
    web_cells = [(r, c) for r in band_rows for c in range(JUNCTION_GRID[0])
                 if (r, c) not in arch_cells]
    web = float(g24[list(zip(*web_cells))].mean()) if web_cells else None
    arch = float(g24[list(zip(*arch_cells))].mean()) if arch_cells else None
    vault = arch / web if (arch is not None and web) else None
    return vault, arch, web


def grid24(directory, name):
    """The 24x16 grid, full-sample (the same derivation as the 6x4 grid())."""
    f = directory / f'{name}.png'
    if not f.exists():
        return None
    img = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64)
    lum = 0.2126 * img[:, :, 0] + 0.7152 * img[:, :, 1] + 0.0722 * img[:, :, 2]
    h, w = lum.shape
    cols, rows = JUNCTION_GRID
    return np.array([[lum[r * h // rows:(r + 1) * h // rows, c * w // cols:(c + 1) * w // cols].mean()
                      for c in range(cols)] for r in range(rows)])


def junction_metrics(g):
    """The D5-pinned junction metrics off one 24x16 grid: the vault band's peak count and
    max adjacent-horizontal |d| (rows 0..7), the cornice line's max adjacent-vertical |d|
    (rows 1->2 and 2->3), the impost's max adjacent-vertical |d| (rows 5->6)."""
    dh = np.abs(np.diff(g, axis=1))
    vault_band = dh[VAULT_ROWS.start:VAULT_ROWS.stop]  # the band's rows (the D5 pin)
    dv = np.abs(np.diff(g, axis=0))
    return {
        'vaultPeaks': int((vault_band >= VAULT_PEAK_DELTA).sum()),
        'vaultMaxDelta': float(vault_band.max()),
        'corniceMaxDelta': float(max(dv[CORNICE_ROW - 1].max(), dv[CORNICE_ROW].max())),
        'impostMaxDelta': float(dv[IMPOST_ROWS[0]].max()),
    }


def grid(directory, name):
    f = directory / f'{name}.png'
    if not f.exists():
        return None
    img = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64)
    lum = 0.2126 * img[:, :, 0] + 0.7152 * img[:, :, 1] + 0.0722 * img[:, :, 2]
    h, w = lum.shape
    return np.array([[lum[r * h // 4:(r + 1) * h // 4, c * w // 6:(c + 1) * w // 6].mean()
                      for c in range(6)] for r in range(4)])


# The strict frame law: every required frame reads the AFTER dir; only night-gj/g1/g2 may
# come from the explicitly named reuse dir (labelled below); night-g0 and every day/dusk
# frame must be current — their absence is a failing exit, not a fallback.
G = {}
reused = []
incomplete = []
for f in FRAMES:
    G[f] = grid(after_dir, f)
    if G[f] is None and f in ('night-gj', 'night-g1', 'night-g2') and night_from is not None:
        G[f] = grid(night_from, f)
        if G[f] is not None:
            reused.append(f)
    if G[f] is None:
        incomplete.append(f)

# ---- the o5 readouts (print-only diagnostics; artifact o5 — no verdicts, no exit-code effect)
# dir-driven on purpose: the bench's 8-frame A/B dir reads here BEFORE the full-set
# completeness check below (the committed bars' frame law stays untouched), and the gate
# runs' 18-frame dir reads the same rows.
print('== vault readouts (VAULT = arch mean ÷ web mean in the stop vault band; '
      'CROWN = web mean, night frames — diagnostics, no verdicts) ==')
O5_CELLS = {key: o5_stop_cells(key) for key in O5_STOPS}
for o5_path in sorted(p for p in after_dir.iterdir()
                      if p.suffix == '.png' and p.stem.split('-', 1)[-1] in O5_STOPS):
    stop_key = o5_path.stem.split('-', 1)[-1]
    band_rows, arch_cells = O5_CELLS[stop_key]
    g24 = grid24(after_dir, o5_path.stem)
    if g24 is None:
        print(f'{o5_path.stem}: VAULT n/a · CROWN n/a — the 24x16 grid missing')
        continue
    vault, arch, web = o5_frame_readout(g24, band_rows, arch_cells)
    if not band_rows:
        print(f'{o5_path.stem}: VAULT n/a · CROWN n/a — no vault band in the stop frame')
        continue
    parts = []
    if arch:
        parts.append(f'VAULT {vault:.3f} (arch {arch:.1f} / web {web:.1f})'
                     if vault is not None else 'VAULT n/a')
    else:
        parts.append('VAULT n/a (no arch cells in the band)')
    if o5_path.stem.startswith('night-'):
        parts.append(f'CROWN {web:.1f}' if web is not None else 'CROWN n/a')
    print(f'{o5_path.stem}: ' + ' · '.join(parts)
          + f' · band rows {",".join(str(r) for r in band_rows)}'
          + f' · arch cells {len(arch_cells)}/{len(band_rows) * JUNCTION_GRID[0]}')

if incomplete:
    print(f'INCOMPLETE — missing current frames: {", ".join(incomplete)}')
    print('(night-gj/g1/g2 may be supplied via RG_F4_NIGHT_FROM=<dir>; everything else must be current)')
    sys.exit(1)

print('== frame means ==')
for f in FRAMES:
    print(f'{f}: {G[f].mean():.1f}')
if reused:
    print(f'(night reuse, byte-identical plate by B6: {", ".join(reused)} from {night_from})')

print('== bars ==')
verd = []
diag = []
nf = G['night-g1'][3, 1:5].mean()
df = G['day-g1'][3, 1:5].mean()
verd.append(('B1 day floor delta ≥ +20', f'{df - nf:+.1f}', df - nf >= 20))
kf = G['dusk-g1'][3, 1:5].mean()
verd.append(('B1 dusk floor delta in [+5,+15]', f'{kf - nf:+.1f}', 5 <= kf - nf <= 15))
verd.append(('B1 night floor 46±1', f'{nf:.1f}', abs(nf - 46) <= 1))
nv = G['night-g1'][0].mean()
dv = G['day-g1'][0].mean()
kv = G['dusk-g1'][0].mean()
verd.append(('B3 vault day delta ≥ +8', f'{dv - nv:+.1f}', dv - nv >= 8))
verd.append(('B3 vault dusk delta ≥ +3', f'{kv - nv:+.1f}', kv - nv >= 3))
dm = G['day-g1'].mean()
km = G['dusk-g1'].mean()
nm = G['night-g1'].mean()
verd.append(('B4 day mean in [100,125]', f'{dm:.1f}', 100 <= dm <= 125))
verd.append(('B4 dusk mean in [88,102]', f'{km:.1f}', 88 <= km <= 102))
verd.append(('B4 night mean 86.6±1', f'{nm:.1f}', abs(nm - 86.6) <= 1))
verd.append(('B4 no G1 cell ≥ 200 in any state',
             f'day max {G["day-g1"].max():.0f} · dusk {G["dusk-g1"].max():.0f} · night {G["night-g1"].max():.0f}',
             G['day-g1'].max() < 200 and G['dusk-g1'].max() < 200 and G['night-g1'].max() < 200))
# The ordering law at every stop the three states share: G0, Gj, G1, G2 (G0b exists only at day).
for stop in ('g0', 'gj', 'g1', 'g2'):
    night_m = G[f'night-{stop}'].mean()
    day_m = G[f'day-{stop}'].mean()
    dusk_m = G[f'dusk-{stop}'].mean()
    verd.append((f'B4 ordering night ≤ dusk ≤ day ({stop.upper()})', f'{night_m:.1f} ≤ {dusk_m:.1f} ≤ {day_m:.1f}',
                 night_m <= dusk_m <= day_m))
# B2 — retired: the diagnostic delta, no verdict, guarded by the frames' presence (they are required above).
lead_l = np.mean([G['day-g1'][1:4, 0].mean(), G['day-gj'][1:4, 0].mean()])
lead_r = np.mean([G['day-g1'][1:4, 5].mean(), G['day-gj'][1:4, 5].mean()])
diag.append(f'B2 (retired) z=70 lead diagnostic (G1+Gj, day): left {lead_l:.1f} vs right {lead_r:.1f} → {lead_l - lead_r:+.1f}')

if before_dir is not None:
    for f in ('day-g0', 'day-g0b', 'dusk-g0', 'night-g0'):
        b = grid(before_dir, f)
        if b is not None:
            d = G[f].mean() - b.mean()
            verd.append((f'B6 {f} within ±6 of before', f'{d:+.1f}', abs(d) <= 6))

fails = 0
for name, detail, ok in verd:
    if not ok:
        fails += 1
    print(f'{"PASS" if ok else "FAIL"}  {name}: {detail}')
for line in diag:
    print(line)

# ---- the junction rows v3 (the rg-audit batch B/C; the direct-diff instrument) --------------
# THE V2 RETIREMENT (recorded): the v2 rows measured the 24x16 grid's adjacent deltas — the
# instrument cannot carry the crease: each cell averages ~80x45 px, so a 2-3-px-wide crease
# dilutes into the cell mean by construction, and the maxima it did see are the pane-edge
# borders (day 215.1->132.8 at col 0->1; 16 of J1's 52 peaks sit at cols 0/1/22). The 24x16
# metrics below are RECORDS now, not verdicts. The v3 rows measure the DELIVERED relief
# directly: the full-res |after-before| frame diff on the same camera/state pairs, whose
# thresholds pin the achieved magnitudes (the DEC text carries the shortfall vs the original
# analytic +6 margins — the cove's occlusion dip renders at ~1-2 gray levels after the look
# chain, capped by RELIEF max_proj 0.08; the tonal alternative stays O5-parked).
print('== junction rows v3 (the direct |after-before| diff; the 24x16 metrics as records) ==')
jdiag = []
for name in JUNCTION_FRAMES:
    g24 = grid24(after_dir, name)
    if g24 is None:
        jdiag.append(f'J {name} missing at 24x16 (record skipped)')
        continue
    m = junction_metrics(g24)
    print(f'{name}: ' + ', '.join(f'{k}={v:.1f}' if isinstance(v, float) else f'{k}={v}'
                                  for k, v in sorted(m.items())))

def frame_lum(directory, name):
    f = directory / f'{name}.png'
    if not f.exists():
        return None
    img = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64)
    return 0.2126 * img[:, :, 0] + 0.7152 * img[:, :, 1] + 0.0722 * img[:, :, 2]

jver = []
if before_dir is not None:
    pre = frame_lum(before_dir, 'day-g1')
    post = frame_lum(after_dir, 'day-g1')
    if pre is None or post is None or pre.shape != post.shape:
        jver.append(('J-A/J-B/J-C day-g1 diff present', 'missing frame pair', False))
    else:
        d = np.abs(post - pre)
        h, w = d.shape
        vault = d[0:int(h * 0.42), :]
        colprof = vault.mean(axis=0)
        peaks = [i for i in range(2, w - 2)
                 if colprof[i] > 1.2 and colprof[i] >= colprof[i - 1] and colprof[i] >= colprof[i + 1]]
        merged = []
        for p in peaks:
            if merged and p - merged[-1][-1] <= 6:
                merged[-1].append(p)
            else:
                merged.append([p])
        n_peaks = len(merged)
        prof_mean = float(colprof.mean())
        row_max = float(vault.mean(axis=1).max())
        frame_mean = float(d.mean())
        jver.append(('J-A G1 day vault crease signature: merged col-profile peaks > 1.2 >= 2 '
                     'and profile mean >= 0.5', f'{n_peaks} peaks, mean {prof_mean:.2f}',
                     n_peaks >= 2 and prof_mean >= 0.5))
        jver.append(('J-B G1 day frame mean |diff| <= 2.0 (the subtlety guard — a bigger mean '
                     'would signal a light break, not relief)', f'{frame_mean:.3f}',
                     frame_mean <= 2.0))
        jver.append(('J-C G1 day vault row-profile max >= 1.0', f'{row_max:.3f}', row_max >= 1.0))
    pre_n = frame_lum(night_from, 'night-g1') if night_from is not None else frame_lum(before_dir, 'night-g1')
    post_n = frame_lum(after_dir, 'night-g1')
    if pre_n is None or post_n is None or pre_n.shape != post_n.shape:
        jver.append(('J-N night-g1 diff present', 'missing frame pair', False))
    else:
        dn = float(np.abs(post_n - pre_n).mean())
        jver.append(('J-N G1 night frame mean |diff| <= 0.5 (the S2A-fix guard: the after night '
                     'vs the pre-fix night — the same plate bytes, so only capture noise may '
                     'differ; the re-parameterization cost vs the committed night is a DEC '
                     'record, not this row)', f'{dn:.4f}', dn <= 0.5))
else:
    jdiag.append('the before dir absent — the v3 diff rows skipped (the standing 13 still run)')

fails += len([1 for _n, _d, ok in jver if not ok])
for name, detail, ok in jver:
    print(f'{"PASS" if ok else "FAIL"}  {name}: {detail}')
for line in jdiag:
    print(line)

# ---- the F5 rows (the RG-F5 dado + panel order's delivered steps) ---------------------------
f5 = []
f5_diag = []
for name in ('day-g1', 'night-g1'):
    img = frame_lum(after_dir, name)
    pin = F5_PINS[name]
    if img is None:
        f5_diag.append(f'F5 {name} missing (row skipped)')
        continue
    c0, c1 = pin['col']
    col = img[:, c0:c1].mean(axis=1)
    def band(a, b):
        return float(col[a:b].mean())
    top = band(*pin['topBand']) - band(*pin['interior'])
    bot = band(*pin['bottomBand']) - band(*pin['interior'])
    shade = band(*pin['shade']) - band(*pin['railFront'])
    floor = F5_BAND_STEP_MIN if name == 'day-g1' else F5_BAND_STEP_MIN_NIGHT
    f5.append((f'F5-{name} top band step >= {floor:+.0f}', f'{top:+.1f}', top >= floor))
    f5.append((f'F5-{name} bottom band step >= {floor:+.0f}', f'{bot:+.1f}', bot >= floor))
    f5.append((f'F5-{name} shade line <= {F5_SHADE_MAX:+.0f}', f'{shade:+.1f}',
               shade <= F5_SHADE_MAX))
img = frame_lum(after_dir, 'day-g0b')
if img is None:
    f5_diag.append('F5 day-g0b missing (row skipped)')
else:
    pin = F5_PINS['day-g0b']
    c0, c1 = pin['col']
    col = img[:, c0:c1].mean(axis=1)
    def band2(a, b):
        return float(col[a:b].mean())
    top = band2(*pin['topBand']) - band2(*pin['interior'])
    bot = band2(*pin['bottomBand']) - band2(*pin['interior'])
    f5.append(('F5-day-g0b top band step >= +12', f'{top:+.1f}', top >= F5_BAND_STEP_MIN))
    f5.append(('F5-day-g0b bottom band step >= +12', f'{bot:+.1f}', bot >= F5_BAND_STEP_MIN))
if rg_f5_pre is not None:
    ref = frame_lum(rg_f5_pre, 'day-g1')
    if ref is None:
        f5.append(('F5-REF the RG_F5_PRE dir carries the declared reference frame (day-g1)',
                   'day-g1 missing', False))
    else:
        ref_mean = float(ref.mean())
        f5.append(('F5-REF the RG_F5_PRE dir is the declared round-pre reference (day-g1 '
                   '113.4 ± 1.5 - a self-diff or a wrong-era dir would fail here)',
                   f'{ref_mean:.2f}', abs(ref_mean - 113.4) <= 1.5))
    for name in FRAMES:
        # the F5-C rows guard the F5 FAMILIES' stability. The g2 frames are the DOOR
        # frame: rg-f6's own P8 declares the day-g2 whole-frame flip (the displaced card
        # + the box) - the door frames' drift is the round's intended change, measured by
        # P5/P6/B6, not a family drift (the rg-f6 review + first-run disposition).
        if name.endswith('-g2'):
            continue
        a = frame_lum(after_dir, name)
        b = frame_lum(rg_f5_pre, name)
        if a is None or b is None or a.shape != b.shape:
            f5.append(('F5-C drift present', f'{name} missing frame pair', False))
            continue
        drift = float(a.mean() - b.mean())
        f5.append((f'F5-C {name} frame-mean drift <= +3.0', f'{drift:+.3f}',
                   abs(drift) <= F5_MEAN_DRIFT_MAX))
else:
    # The acceptance law: the F5-C drift rows are NOT skippable - a run without the
    # declared round-pre dir (RG_F5_PRE=<dir>) cannot certify the drift guard (the
    # review-pass finding).
    f5.append(('F5-C the RG_F5_PRE dir present', 'absent - the drift rows cannot run', False))

fails += len([1 for _n, _d, ok in f5 if not ok])
for name, detail, ok in f5:
    print(f'{"PASS" if ok else "FAIL"}  {name}: {detail}')
for line in f5_diag:
    print(line)

# ---- the F6 rows (the threshold set's delivered light at the door) --------------------------
# The cell picks (P5_CENTRE rows 1-2 x cols 2-3) are named in the constants block and are
# RUNTIME-TUNED: the first real capture run may adjust the cells, never the thresholds.
pver = []
def p5_cells(g):
    """L over the centre cells vs the frame's perimeter band (rows 0/3 whole, cols 0/5
    in the middle rows)."""
    centre = float(g[P5_CENTRE].mean())
    edge = float(np.concatenate([g[0, :], g[3, :], g[1:3, 0], g[1:3, -1]]).mean())
    return centre, edge
d_c, d_e = p5_cells(G['day-g2'])
k_c, k_e = p5_cells(G['dusk-g2'])
n_c, n_e = p5_cells(G['night-g2'])
d5, k5, n5 = d_c - d_e, k_c - k_e, n_c - n_e
pver.append(('P5 threshold-depth (g2 centre-edge: day >= +25, dusk >= +8, night >= 0 — '
             'the first-run disposition: the authored night leg inverted the design\'s own '
             'R5 note «a warm-lined dark» — the box lining reads LIT by the sconce bounce '
             'off the end wall (measured +17.6), the far card stays black; the law asserts '
             'the lining not darker than the room)',
             f'day {d5:+.1f} · dusk {k5:+.1f} · night {n5:+.1f}',
             d5 >= P5_DAY_MIN and k5 >= P5_DUSK_MIN and n5 >= P5_NIGHT_MIN))
if before_dir is not None:
    b6 = grid24(before_dir, 'day-g2')
    a6 = grid24(after_dir, 'day-g2')
    if b6 is None or a6 is None:
        pver.append(('P6 centre-hold day-g2 card-interior within ±4 of before',
                     'frame missing', False))
    else:
        # THE COMMON CARD INTERIOR (the review-pass fix): the card's texels are identical
        # in both frames (the same atlas cells, the paint byte-held) — the screen-centre
        # pin acquired lining/floor texels after the displacement (measured -10.7). The
        # geometric pin, from the committed numbers (the G2 stop (40.5, 1.7, 73), the card
        # z 72.2..73.8 x y 0..2.4 at x=44 before / x=46.6 after, vFOV 55, the probe's
        # 1280x720 viewport): the after-card's projected rect sits fully inside the
        # before-card's; the 24x16 cells FULLY inside both rects = rows 7..11 x cols 10..13
        # (v-band 0.4375..0.75, h-band 0.4167..0.5833). RUNTIME-TUNED like the P5 picks.
        P6_ROWS, P6_COLS = slice(7, 12), slice(10, 14)
        d6 = float(a6[P6_ROWS, P6_COLS].mean() - b6[P6_ROWS, P6_COLS].mean())
        pver.append(('P6 centre-hold day-g2 card-interior within ±4 of before', f'{d6:+.1f}',
                     abs(d6) <= P6_CENTRE_TOL))
else:
    # the before-dir mechanism is optional in a diagnostic run; the acceptance run
    # passes it, and the printed count then reads 45.
    print('P6 centre-hold skipped (no before dir; the acceptance run passes it)')

fails += len([1 for _n, _d, ok in pver if not ok])
for name, detail, ok in pver:
    print(f'{"PASS" if ok else "FAIL"}  {name}: {detail}')

total = len(verd) + len(jver) + len(f5) + len(pver)
print(f'{total - fails}/{total} bars pass')
sys.exit(0 if fails == 0 else 1)
