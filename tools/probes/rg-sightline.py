# tools/probes/rg-sightline.py — the junction law's S0 instrument (COMMITTED probe code,
# authored by the rg-audit S0 slice; RUN for the slice's measurements — never by CI).
# Blender-routed like the repo's probe law: lazy bpy imports (inside the measurement path),
# `python3 tools/probes/rg-sightline.py --help` works WITHOUT Blender, main() runs only
# under the __main__ guard, fail-loud everywhere, no clock reads, no randomness, sorted
# outputs (the repository's determinism law for python tools).
#
# DESIGN SECTIONS IMPLEMENTED (the accepted verdict, S0 slice of «the junction law»):
#   - the accepted design: docs/STATE.md (the 2026-11-18/19 OPEN rg-audit row) + docs/
#     briefs/ROUNDS.md (the rg-audit row) — the junction law: never-exported bake proxies
#     (coves + springers) S2A-baked into the day+dusk lightmaps only, the night plate
#     untouched, glb byte-identical, zero JS. This probe measures the CURRENT kit against
#     the law's verbatim constants (JUNCTION_LAW below) and produces the decision rows
#     D1–D5 the slice owes the design: the rib texel density verdict (D1), the screen-
#     invisible class list (D2), the CAGE table S1 will use (D3), the LM_RES 2048 budget
#     verdict (D4), and the 24×16 screen-grid row pins at G1/G0b (D5).
#   - the probe law: tools/probes/rg-gates.py (the lazy-bpy / __main__ / fail-loud shape)
#     and tools/bpy/bake.py's builder-loading pattern (source_path + exec with the
#     `fail(f'no committed builder at {source_path}')` guard, ZIMNY_BAKE=1, the builder's
#     own argv grammar) — reused verbatim, not reinvented.
#
# RUN FORMS (all print one deterministic JSON document to stdout; --out additionally
# writes the same JSON under probes/ — gitignored, local-only):
#   python3 tools/probes/rg-sightline.py --help
#   python3 tools/probes/rg-sightline.py sight   [--out probes/rg-sightline-sight.json]
#   python3 tools/probes/rg-sightline.py cage    [--out ...]     (Blender-free)
#   python3 tools/probes/rg-sightline.py lmres   [--out ...]     (Blender-free)
#   blender -b --factory-startup -noaudio -P tools/probes/rg-sightline.py -- texels [--out ...]
#
# SOURCES CITED PER NUMBER (the kit is mirrored here DECLARED, the bake.py precedent for
# reading constants a python tool cannot import: bake.py's JORDAN_RIG_* block):
#   - the builder: tools/bpy/rastrelli-gallery.py (the kit constants + the element
#     schedule; the per-face lm.cells tagging rides the builder's own roster, and the
#     texels mode re-runs the builder's OWN finish() so the atlas allocation is the
#     shipped one, not a replica).
#   - the stops: rooms/rastrelli-gallery/contract.ts (six stops; each position/subject
#     cited at its lines). The stop gaze = the committed pose law (src/camera/rail.ts
#     «Gaze at a stop … a stop with an authored SUBJECT … looks at it»).
#   - the camera: src/camera/portrait-frame.ts:17 CAMERA_VFOV_DEG = 55 — the ONE source
#     of the vertical FOV, read by src/main.ts:572's PerspectiveCamera. The capture
#     frame: tools/probes/rg-f4-capture.mjs (1280×720 page clip) → aspect 16:9; the S1
#     screen grid: 24×16, row-major top→bottom (the F4 grid convention, rg-f4-capture.mjs).
#   - the committed lm facts: public/assets/rastrelli-gallery/manifest.json (lightmaps
#     res 1536, budget.textureBytesMax 1,000,000, the albedo + probe file sizes) and
#     tools/bake-logs/rastrelli-gallery.json (the postEncode byte rows).
#
# NOTE ON CORNICE_PROUD: the builder pins it by its own assert (CORNICE_PROUD ==
# SHAFT_PROUD + CAPITAL_PROFILE[-1][0] = 0.18, rastrelli-gallery.py:873) — the `# 0.17`
# on line 118 is a stale comment. This probe mirrors the PINNED value (0.18) and the
# texels mode's belt-check fails loud on any divergence from the namespace.

import json
import math
import os
import sys
from pathlib import Path

# ---- the accepted design's verbatim constants (the junction law) -----------------------------
JUNCTION_LAW = {
    'ribCoveRangeM': [0.04, 0.08],
    'ribCoveRM': 0.05,
    'springerHM': 0.30,
    'springerProjM': 0.06,
    'springerWM': 0.44,
    'corniceCoveRM': 0.04,
    'impostCoveRM': 0.03,
    'maxProjM': 0.08,
}
S2A_TARGETS = ('arch', 'vault.gallery', 'vault.reveal', 'cornice', 'ressaut', 'impost',
               'vault.passage')
CAGE_DEFAULT_M = 0.15
MAX_RAY_DISTANCE_M = 0.35

# ---- the kit constants, mirrored DECLARED from tools/bpy/rastrelli-gallery.py -----------------
# Every value carries its builder line cite. The texels mode belt-checks these against the
# builder's own namespace (fail-loud) so the Blender-free modes ride a PROVEN mirror.
KIT = {
    'G_X0': 4.0, 'G_X1': 44.0, 'G_Z0': 70.0, 'G_Z1': 76.0, 'G_ZC': 73.0,          # :86-88
    'G_SPRING': 3.0, 'G_PEAK': 3.6, 'G_HALF': 3.0, 'G_ARC_SEGS': 8,               # :89-94
    'P_X0': -4.0, 'P_X1': 4.0, 'P_Z0': 63.5, 'P_Z1': 87.5,                        # :101-102
    'P_SPRING': 3.0, 'P_PEAK': 5.0, 'P_HALF': 4.0, 'P_ARC_SEGS': 12,              # :103-106
    'CORNICE_Y0': 2.70,                                                            # :858
    'RESSAUT_W': 0.56, 'RESSAUT_D': 0.10,                                          # :119
    'END_CORNICE_BREAK': 0.90,                                                     # :120
    'SKIRTING_PROUD': 0.09, 'SKIRTING_TOP': 0.14,                                  # :121/:857
    'PLINTH_HALF_W': 0.28,                                                         # :127
    'SHAFT_PROUD': 0.10, 'SHAFT_Y0': 0.30, 'SHAFT_Y1': 2.45,                       # :129-130
    'ARCH_WIDTH': 0.44, 'ARCH_HALF': 2.72, 'ARCH_SPRING': 3.00, 'ARCH_CROWN': 3.34,
    'ARCH_SEGS': 8,                                                                # :135
    'BAY_PITCH': 3.387, 'PILASTERS_PER_SIDE': 11,                                  # :143-144
    'NICHE_SILL': 0.90, 'NICHE_SPRING': 1.60, 'NICHE_HEAD_R': 0.90,                # :163-165
    'NICHE_RECESS': 0.22, 'NICHE_HEAD_SEGS': 8,                                    # :167-168
    'NICHE_SURROUND_D': 0.03, 'NICHE_OUTER_R': 1.00,                               # :138/:865
    'PORTAL_Z0': 72.2, 'PORTAL_Z1': 73.8, 'DOOR_JAMB_W': 0.25,                     # :175-177
    'DOOR_BAND_Y': (2.40, 2.70),                                                   # :178
    'LUNETTE_R': 0.75, 'ARCHIVOLT_W': 0.07, 'ARCHIVOLT_D': 0.04,                   # :179/:181
    'LM_RES': 1536, 'LM_PAD_PX': 2.0,                                              # :57/:60
    'LM_PX_PER_M': 20, 'LM_PX_PER_M_MIN': 14,                                      # :64-65
    'LM_CELL_MIN_PX': 6, 'LM_CELL_MAX_PX': 480,                                    # :66-67
    'LM_STRIP_FRAC': 0.875,                                                        # :61
    # the builder's computed min arch/vault clearance (:348): 0.1769 — the `# 0.188`
    # comment on :348 is STALE (the belt caught it against the namespace; the value rides
    # the faceted G_ARC interpolation, and the builder only asserts it > 0)
    'ARCH_CLEARANCE_M': 0.1769279646273696,                                        # :348 (computed)
    'CORNICE_PROUD': 0.18,      # the builder's OWN assert pins 0.18 (:873); :118's 0.17 is stale
    'RESSAUT_PROUD': 0.28,      # :862 == G_ZC - ARCH_HALF - G_Z0 (the arch foot)
}
CORNICE_PROFILE = (   # :114-117 — 8 points, (0, 2.70) -> y 3.00 and back to the wall
    (0.00, 2.70), (0.08, 2.70), (0.08, 2.78), (0.12, 2.78),
    (0.12, 2.86), (0.18, 2.86), (0.18, 3.00), (0.00, 3.00),
)
CAPITAL_PROFILE = (   # :131-133 — relative to the SHAFT face
    (0.00, 2.45), (0.02, 2.49), (0.05, 2.53), (0.05, 2.58), (0.08, 2.62), (0.08, 2.70),
)
BASE_PROFILE = ((0.16, 0.00), (0.16, 0.15), (0.13, 0.15), (0.13, 0.26), (0.10, 0.30))  # :123-124
SKIRTING_PROFILE = ((0.09, 0.00), (0.09, 0.11), (0.00, 0.14))                          # :121
IMPOST_PROFILE = (    # :859 == PASSAGE_IMPOST (:140) + the spring point
    (0.00, 2.86), (0.06, 2.86), (0.06, 2.94), (0.12, 3.00), (0.00, 3.00),
)
# the derived stations, the builder's own formulas mirrored (:145/:169)
ARCH_HALF_W = KIT['ARCH_WIDTH'] / 2.0
RESSAUT_W = KIT['RESSAUT_W']
RESSAUT_D = KIT['RESSAUT_D']
RESSAUT_HALF_W = KIT['RESSAUT_W'] / 2.0
PILASTER_X = tuple(KIT['G_X1'] - KIT['BAY_PITCH'] * k
                   for k in range(1, KIT['PILASTERS_PER_SIDE'] + 1))
NICHE_CENTRES = tuple(KIT['G_X1'] - KIT['BAY_PITCH'] * (k - 0.5)
                      for k in range(1, KIT['PILASTERS_PER_SIDE'] + 1))
GEOM_EPS = 1e-6


def arc(c, half, spring, peak, segs):
    """The builder's arc (:308-313), mirrored exactly."""
    return [(c - half * math.cos(math.pi * i / segs),
             spring + (peak - spring) * math.sin(math.pi * i / segs))
            for i in range(segs + 1)]


def interpolate(profile, coordinate):
    """The builder's interpolate (:323-328), mirrored exactly."""
    for a, b in zip(profile, profile[1:]):
        if a[0] - GEOM_EPS <= coordinate <= b[0] + GEOM_EPS:
            t = (coordinate - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    raise ValueError(f'coordinate {coordinate} outside profile')


G_ARC = arc(KIT['G_ZC'], KIT['G_HALF'], KIT['G_SPRING'], KIT['G_PEAK'], KIT['G_ARC_SEGS'])
ARCH_PROFILE = arc(KIT['G_ZC'], KIT['ARCH_HALF'], KIT['ARCH_SPRING'], KIT['ARCH_CROWN'],
                   KIT['ARCH_SEGS'])
P_ARC = arc(0.0, KIT['P_HALF'], KIT['P_SPRING'], KIT['P_PEAK'], KIT['P_ARC_SEGS'])


def vault_y_at(z):
    return interpolate(G_ARC, z)


# ---- the camera law + the capture frame + the S1 screen grid ----------------------------------
VFOV_DEG = 55            # src/camera/portrait-frame.ts:17 (read by src/main.ts:572)
CAPTURE_W, CAPTURE_H = 1280, 720   # rg-f4-capture.mjs (the 1280×720 page clip)
ASPECT = CAPTURE_W / CAPTURE_H
GRID_COLS, GRID_ROWS = 24, 16      # the S1 24×16 screen grid, rows top→bottom (F4 convention)
TAN_HALF_V = math.tan(math.radians(VFOV_DEG / 2.0))
TAN_HALF_H = TAN_HALF_V * ASPECT   # portrait-frame.ts:41-43's horizontal law

# ---- the six stops (rooms/rastrelli-gallery/contract.ts:49-108) --------------------------------
# gaze = the stop's authored SUBJECT (src/camera/rail.ts:18-19); each subject cited.
STOPS = (
    {'id': 'G0', 'eye': (0.0, 1.7, 86.0), 'subject': (1.6, 2.4, 73.0),
     'cite': 'contract.ts:50-51 (subject JUNCTION :29)'},
    {'id': 'G0b', 'eye': (0.8, 1.7, 79.5), 'subject': (4.4, 1.7, 73.0),
     'cite': 'contract.ts:63-64 (subject GALLERY_MOUTH :31)'},
    {'id': 'Gj', 'eye': (1.6, 1.7, 73.0), 'subject': (43.5, 1.7, 73.0),
     'cite': 'contract.ts:74-75 (subject EAST_DOOR :27)'},
    {'id': 'Gjb', 'eye': (12.8, 1.7, 73.0), 'subject': (43.5, 1.7, 73.0),
     'cite': 'contract.ts:89-90 (subject EAST_DOOR :27)'},
    {'id': 'G1', 'eye': (24.0, 1.7, 73.0), 'subject': (43.5, 1.7, 73.0),
     'cite': 'contract.ts:96-97 (subject EAST_DOOR :27)'},
    {'id': 'G2', 'eye': (40.5, 1.7, 73.0), 'subject': (43.5, 1.7, 73.0),
     'cite': 'contract.ts:104-105 (subject EAST_DOOR :27)'},
)

# ---- the committed lm facts (manifest.json + bake-logs/rastrelli-gallery.json) -----------------
POST_ENCODE_BYTES = {   # tools/bake-logs/rastrelli-gallery.json postEncode rows :130-150
    'day': 188665, 'dusk': 166552, 'nightChandeliers': 165953,
}
PROBE_PLATE_BYTES = 1734        # probe/dusk.ktx2 (manifest :23-27)
ALBEDO_BYTES = {'plaster_pale': 30804, 'stone_band': 29510, 'stone_flags': 15464,
                'stucco_grey': 1894}   # manifest tex/ rows
TEXTURE_LINE_BYTES = 600576     # the manifest's full ktx2 file list, summed
TEXTURE_CAP_BYTES = 1000000     # manifest budget.textureBytesMax (:98) == contract.ts:119
LM_RES_NOMINAL = 1536           # manifest lightmaps.res (:88) == the builder's LM_RES
LM_RES_FORECAST = 2048          # the design's forecast resolution

SAMPLE_STEP_M = 0.5      # the long-line sampler step (deterministic, endpoints included)
FEATURE_STEP_M = 0.25    # the short/feature-line step
EYE_EPS = 1e-9

INSTRUMENT = 'rg-sightline (the junction law S0 slice)'


def fail(message):
    print(f'rg_sightline: {message}', file=sys.stderr, flush=True)
    raise SystemExit(f'rg_sightline: {message}')


# ---- tiny vector kit (pure; no numpy anywhere in this probe) ----------------------------------
def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def v_cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def v_len(a):
    return math.sqrt(v_dot(a, a))


def v_norm(a):
    n = v_len(a)
    if n <= EYE_EPS:
        fail(f'cannot normalise a zero vector {a}')
    return (a[0] / n, a[1] / n, a[2] / n)


UP = (0.0, 1.0, 0.0)


def camera_basis(eye, subject):
    """The stop's committed framing: forward = toward the SUBJECT (src/camera/rail.ts:18-19),
    world up (0,1,0); right/upc = the orthonormal camera basis."""
    f = v_norm(v_sub(subject, eye))
    right = v_norm(v_cross(f, UP))
    upc = v_norm(v_cross(right, f))
    return {'f': f, 'right': right, 'upc': upc}


def project_point(eye, basis, point):
    v = v_sub(point, eye)
    depth = v_dot(v, basis['f'])
    if depth <= EYE_EPS:
        return None
    tan_y = v_dot(v, basis['upc']) / depth
    tan_x = v_dot(v, basis['right']) / depth
    return {'depth': depth, 'dist': v_len(v), 'tanX': tan_x, 'tanY': tan_y,
            'inFrame': abs(tan_y) <= TAN_HALF_V and abs(tan_x) <= TAN_HALF_H}


def row_from_tan(tan_y):
    """The 24×16 grid's row index (top→bottom) of a vertical tangent."""
    ndc_y = tan_y / TAN_HALF_V
    row = int(math.floor((1.0 - ndc_y) * (GRID_ROWS / 2.0)))
    return max(0, min(GRID_ROWS - 1, row))


def line_samples(a, b, step):
    """Deterministic samples along a segment: endpoints included, interior at `step`."""
    length = v_len(v_sub(b, a))
    n = int(math.floor(length / step))
    points = [a] + [tuple(a[i] + (b[i] - a[i]) * (k / (n + 1)) for i in range(3))
                    for k in range(1, n + 1)] + [b]
    return points


def plane_line(axis_plane, sign, offset, t0, t1, y, proud, step):
    """Samples along a host-plane line: (t, y, proud-d) on a z-wall or x-wall."""
    pts = []
    n = max(1, int(math.floor((t1 - t0) / step)))
    for k in range(n + 1):
        t = t0 + (t1 - t0) * k / n
        if axis_plane == 'z':
            pts.append((t, y, offset + sign * proud))
        else:
            pts.append((offset + sign * proud, y, t))
    return pts


# ---- the sight classes (each sample list + its kit cite) ---------------------------------------
def ribs_band_samples():
    """The 11 rib bands: both edge planes' ARCH_PROFILE arcs. Cite: KIT ARCH_* (:135),
    the arch rows at PILASTER_X (builder :1265-1272)."""
    pts = []
    for x_c in PILASTER_X:
        for s in (-1.0, 1.0):
            x = x_c + s * ARCH_HALF_W
            pts.extend((x, y, z) for z, y in ARCH_PROFILE)
    return pts


def cornice_line_samples():
    """The gallery + end-wall cornice: the front profile's 6 silhouette corners.
    Cite: CORNICE_PROFILE :114-117, CORNICE_PROUD 0.18 (:873-pinned); the end-wall runs
    are the builder's own spans (:1406-1409: the ressaut half-widths around the corner
    returns + END_CORNICE_BREAK 0.90)."""
    pts = []
    for offset, sign in ((KIT['G_Z0'], 1.0), (KIT['G_Z1'], -1.0)):
        for d, y in CORNICE_PROFILE[1:-1]:
            pts += plane_line('z', sign, offset, KIT['G_X0'], KIT['G_X1'], y, d, SAMPLE_STEP_M)
    end_runs = (
        (KIT['G_Z0'], KIT['G_Z0'] + KIT['END_CORNICE_BREAK'] - RESSAUT_HALF_W),   # :1406
        (KIT['G_Z0'] + KIT['END_CORNICE_BREAK'] - RESSAUT_HALF_W + 2 * RESSAUT_HALF_W,
         KIT['G_Z0'] + KIT['END_CORNICE_BREAK']),                                 # :1407
        (KIT['G_Z1'] - KIT['END_CORNICE_BREAK'],
         KIT['G_Z1'] - KIT['END_CORNICE_BREAK'] + RESSAUT_W),                     # :1408
        (KIT['G_Z1'] - KIT['END_CORNICE_BREAK'] + 2 * RESSAUT_HALF_W, KIT['G_Z1']),  # :1409
    )
    for t0, t1 in end_runs:
        for d, y in CORNICE_PROFILE[1:-1]:
            pts += plane_line('x', -1.0, KIT['G_X1'], t0, t1, y, d, FEATURE_STEP_M)
    return pts


def capital_samples():
    """The 24 capitals' flare edges. Cite: CAPITAL_PROFILE :131-133, SHAFT_PROUD 0.10,
    ABACUS_HALF_W 0.28 (:134); PILASTER_X + CORNER_RETURN_Z (:145/:146)."""
    pts = []
    stations = [(x_c, 'z', KIT['G_Z0'], 1.0) for x_c in PILASTER_X]
    stations += [(x_c, 'z', KIT['G_Z1'], -1.0) for x_c in PILASTER_X]
    stations += [(z_c, 'x', KIT['G_X1'], -1.0) for z_c in (70.45, 75.55)]  # CORNER_RETURN_Z :146
    for t_c, axis, offset, sign in stations:
        pts += plane_line(axis, sign, offset, t_c - 0.28, t_c + 0.28, 2.70,
                          KIT['SHAFT_PROUD'] + CAPITAL_PROFILE[-1][0], FEATURE_STEP_M)
        pts += plane_line(axis, sign, offset, t_c - 0.20, t_c + 0.20, 2.45,
                          KIT['SHAFT_PROUD'], FEATURE_STEP_M)
    return pts


def impost_samples():
    """The passage impost band's front corners. Cite: IMPOST_PROFILE :859 (PASSAGE_IMPOST
    :140); the PWALL_W/E/N runs (builder :1289-1294)."""
    pts = []
    for d, y in ((0.06, 2.86), (0.06, 2.94), (0.12, 3.00)):
        pts += plane_line('x', 1.0, KIT['P_X0'], KIT['P_Z0'], KIT['P_Z1'], y, d, SAMPLE_STEP_M)
        pts += plane_line('x', -1.0, KIT['P_X1'], KIT['P_Z0'], KIT['G_Z0'], y, d, SAMPLE_STEP_M)
        pts += plane_line('x', -1.0, KIT['P_X1'], KIT['G_Z1'], KIT['P_Z1'], y, d, SAMPLE_STEP_M)
        pts += plane_line('z', 1.0, KIT['P_Z0'], KIT['P_X0'], KIT['P_X1'], y, d, SAMPLE_STEP_M)
    return pts


def niche_arch_samples():
    """The 22 niches' surround head arcs at the surround's proud. Cite: NICHE_* :162-168,
    NICHE_CENTRES :169, the surround front at NICHE_SURROUND_D (builder :1188-1191)."""
    pts = []
    for z_wall, in_dir in ((KIT['G_Z0'], 1.0), (KIT['G_Z1'], -1.0)):
        for x_c in NICHE_CENTRES:
            for t, y in arc(x_c, KIT['NICHE_OUTER_R'], KIT['NICHE_SPRING'],
                            KIT['NICHE_SPRING'] + KIT['NICHE_OUTER_R'], KIT['NICHE_HEAD_SEGS']):
                pts.append((t, y, z_wall + in_dir * KIT['NICHE_SURROUND_D']))
    return pts


def door_frame_samples():
    """The east door frame's applied band + archivolt ring. Cite: PORTAL_Z0/1 :175-176,
    DOOR_JAMB_W/PROUD :177/:1313, DOOR_BAND_Y :178, LUNETTE_R :179, ARCHIVOLT_W :181;
    the fronts at WALL_E proud ARCHIVOLT_D (builder :1362-1388)."""
    proud = KIT['ARCHIVOLT_D']
    pts = []
    for t in (KIT['PORTAL_Z0'], KIT['PORTAL_Z1']):   # the jamb fronts' inner edges (vertical)
        n = int(round(KIT['CORNICE_Y0'] / FEATURE_STEP_M))
        for k in range(n + 1):
            pts.append((KIT['G_X1'] - proud, k * FEATURE_STEP_M, t))
    for y in (KIT['DOOR_BAND_Y'][0], KIT['DOOR_BAND_Y'][1]):
        pts += plane_line('x', -1.0, KIT['G_X1'], KIT['PORTAL_Z0'], KIT['PORTAL_Z1'], y,
                          proud, FEATURE_STEP_M)
    for t, y in arc(KIT['G_ZC'], KIT['LUNETTE_R'] + KIT['ARCHIVOLT_W'], KIT['DOOR_BAND_Y'][1],
                    KIT['DOOR_BAND_Y'][1] + KIT['LUNETTE_R'] + KIT['ARCHIVOLT_W'], 8):
        pts.append((KIT['G_X1'] - proud, y, t))
    return pts


def skirting_samples():
    """The skirting's top edge (y 0.14, proud 0.09). Cite: SKIRTING_PROFILE :121,
    SKIRTING_PROUD :122; the gallery, passage + end-wall runs (builder :1295-1298/:1411-1414)."""
    pts = []
    pts += plane_line('z', 1.0, KIT['G_Z0'], KIT['G_X0'], KIT['G_X1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('z', -1.0, KIT['G_Z1'], KIT['G_X0'], KIT['G_X1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('x', 1.0, KIT['P_X0'], KIT['P_Z0'], KIT['P_Z1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('x', -1.0, KIT['P_X1'], KIT['P_Z0'], KIT['G_Z0'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('x', -1.0, KIT['P_X1'], KIT['G_Z1'], KIT['P_Z1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('z', 1.0, KIT['P_Z0'], KIT['P_X0'], KIT['P_X1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    pts += plane_line('x', -1.0, KIT['G_X1'], KIT['G_Z0'], KIT['G_Z1'], KIT['SKIRTING_TOP'],
                      KIT['SKIRTING_PROUD'], SAMPLE_STEP_M)
    return pts


# the D5 vault-band sampler (the gallery vault's faceted surface, G_ARC :336)
def vault_band_samples():
    pts = []
    n = int(round((KIT['G_X1'] - 24.0) / SAMPLE_STEP_M))
    for k in range(n + 1):
        x = 24.0 + k * SAMPLE_STEP_M
        for z, y in G_ARC:
            pts.append((x, y, z))
    return pts


SIGHT_CLASSES = {
    'capitals': {'heightM': 0.25, 'sampler': capital_samples,
                 'heightCite': 'CAPITAL_PROFILE y 2.45→2.70 (rastrelli-gallery.py:131-133)'},
    'corniceLine': {'heightM': 0.30, 'sampler': cornice_line_samples,
                    'heightCite': 'CORNICE_PROFILE y 2.70→3.00 (:114-117, :858)'},
    'eastDoorFrame': {'heightM': 2.70, 'sampler': door_frame_samples,
                      'heightCite': 'the applied band y 0→2.70 (DOOR_BAND_Y :178; jamb fronts'
                                    ' :1362-1363); the archivolt crown reaches 3.52'},
    'impost': {'heightM': 0.14, 'sampler': impost_samples,
               'heightCite': 'IMPOST_PROFILE y 2.86→3.00 (:859; PASSAGE_IMPOST :140)'},
    'nicheArches': {'heightM': 0.90, 'sampler': niche_arch_samples,
                    'heightCite': 'the head arc rise NICHE_HEAD_R 0.90 (:165-166)'},
    'ribsBand': {'heightM': 0.34, 'sampler': ribs_band_samples,
                 'heightCite': 'ARCH_CROWN − ARCH_SPRING = 3.34 − 3.00 (:135)'},
    'skirting': {'heightM': 0.14, 'sampler': skirting_samples,
                 'heightCite': 'SKIRTING_PROFILE y 0→0.14 (:121)'},
}


def class_sight_rows(stop):
    basis = camera_basis(stop['eye'], stop['subject'])
    rows = {}
    for name in sorted(SIGHT_CLASSES):
        cls = SIGHT_CLASSES[name]
        projs = [project_point(stop['eye'], basis, p) for p in cls['sampler']()]
        inframe = [p for p in projs if p is not None and p['inFrame']]
        sampled = sum(1 for p in projs if p is not None)
        row = {'heightCite': cls['heightCite'], 'sampled': sampled,
               'stopCite': stop['cite']}
        if inframe:
            nearest = min(inframe, key=lambda p: p['dist'])
            d = nearest['dist']
            angular = 2.0 * math.atan(cls['heightM'] / (2.0 * d))
            row.update({
                'angularHeightDeg': round(math.degrees(angular), 3),
                'elevationDeg': round(math.degrees(math.atan(nearest['tanY'])), 3),
                'inFrameCount': len(inframe),
                'nearestDistanceM': round(d, 3),
                'rowOfNearest': row_from_tan(nearest['tanY']),
                'rowsSpanned': sorted({row_from_tan(p['tanY']) for p in inframe}),
                'screenHeightPct': round(math.degrees(angular) / VFOV_DEG * 100.0, 3),
            })
        else:
            row.update({'angularHeightDeg': 0.0, 'inFrameCount': 0, 'nearestDistanceM': None,
                        'rowOfNearest': None, 'rowsSpanned': [], 'screenHeightPct': 0.0,
                        'note': 'the class geometry is entirely outside the stop frame'})
        rows[name] = row
    return rows


def run_sight(opts):
    per_stop = {}
    for stop in STOPS:
        per_stop[stop['id']] = class_sight_rows(stop)
    invisible = [name for name in sorted(SIGHT_CLASSES)
                 if max(per_stop[stop['id']][name]['screenHeightPct'] for stop in STOPS) < 2.0]
    # D5 — the 24×16 row pins S1's instrument extension reads. The G0b impost pin is the
    # JUNCTION-SIDE impost (the runs at/below the gallery's south wall plane z = 70): the
    # far-side runs (z > 76) also graze the frame's top rows at G0b but are not the S2A
    # work's readable seat.
    g0b = next(s for s in STOPS if s['id'] == 'G0b')
    basis = camera_basis(g0b['eye'], g0b['subject'])
    junction_impost = [p for p in impost_samples() if p[2] <= KIT['G_Z0'] + 1e-9]
    projs = [project_point(g0b['eye'], basis, p) for p in junction_impost]
    inframe = [p for p in projs if p is not None and p['inFrame']]
    g0b_impost = {
        'rowOfNearest': row_from_tan(min(inframe, key=lambda p: p['dist'])['tanY']),
        'rowsSpanned': sorted({row_from_tan(p['tanY']) for p in inframe}),
        'subset': 'the junction-side impost runs (world z <= 70.0)',
    } if inframe else None
    d5 = {
        'G0b': {'impost': g0b_impost},
        'G1': {'corniceLine': {
            'rowOfNearest': per_stop['G1']['corniceLine']['rowOfNearest'],
            'rowsSpanned': per_stop['G1']['corniceLine']['rowsSpanned']}},
    }
    # the vault band's row range at G1 (the D5 pin S1's instrument extension reads)
    g1 = next(s for s in STOPS if s['id'] == 'G1')
    basis = camera_basis(g1['eye'], g1['subject'])
    vault_projs = [project_point(g1['eye'], basis, p) for p in vault_band_samples()]
    vault_in = [p for p in vault_projs if p is not None and p['inFrame']]
    d5['G1']['vaultBand'] = {
        'rowOfNearest': row_from_tan(min(vault_in, key=lambda p: p['dist'])['tanY']),
        'rowsSpanned': sorted({row_from_tan(p['tanY']) for p in vault_in}),
    } if vault_in else None
    payload = {
        'camera': {'aspect': round(ASPECT, 6), 'captureFrame': f'{CAPTURE_W}x{CAPTURE_H}',
                   'grid': f'{GRID_COLS}x{GRID_ROWS} (rows top→bottom)',
                   'horizontalHalfDeg': round(math.degrees(math.atan(TAN_HALF_H)), 3),
                   'source': 'src/camera/portrait-frame.ts:17 CAMERA_VFOV_DEG = 55 '
                             '(read by src/main.ts:572 PerspectiveCamera)',
                   'verticalFovDeg': VFOV_DEG},
        'decisions': {
            'D2_screenInvisibleClasses': invisible,
            'D5_screenGridRowPins': d5,
        },
        'instrument': INSTRUMENT,
        'mode': 'sight',
        'notes': ['no occlusion is modelled: each row is the class screen geometry if the '
                  'class is inside the stop frame; visibility through openings is the '
                  'capture instrument\'s job (S1)',
                  'screenHeightPct = the class feature height\'s subtended angle / the 55° '
                  'vertical fov (angularHeightDeg / 55 × 100)',
                  'rowOfNearest/rowsSpanned ride the 24×16 grid (row 0 = frame top)'],
        'stops': per_stop,
    }
    emit(payload, opts['out'])


def run_cage(opts):
    """D3 — the CAGE table: default 0.15, capped at half the smallest gap in each S2A
    target's neighbourhood, every gap derived from the kit constants."""
    half = lambda g: g / 2.0
    arch_vault_clearance = KIT['ARCH_CLEARANCE_M']
    niche_recess = KIT['NICHE_RECESS']
    cornice_standoff = CORNICE_PROFILE[1][0]          # the soffit's stand-off from the wall
    impost_standoff = IMPOST_PROFILE[3][0]            # the impost's max proud
    seat_wing = RESSAUT_HALF_W - ARCH_HALF_W          # the strip beside the arch foot
    reveal_channel = KIT['CORNICE_PROUD']             # the reveal's edges stand this far off
    table = {}
    specs = (
        ('arch', (('the arch↔vault min clearance (the host the arch must clear; the builder'
                   ' asserts it > 0, :348-350)', arch_vault_clearance),
                  ('the niche inner corners (the pockets behind the wall plane, task-named;'
                   ' NICHE_RECESS :167)', niche_recess))),
        ('vault.gallery', (('the arch↔vault min clearance (the rib bands cross every bay;'
                            ' :348)', arch_vault_clearance),
                           ('the niche inner corners at the spring edges (task-named;'
                            ' NICHE_RECESS :167)', niche_recess))),
        ('vault.reveal', (('the mouth channel: the reveal\'s edges stand CORNICE_PROUD off'
                           ' the gallery wall planes (:1261-1262; CORNICE_PROUD :873)',
                           reveal_channel),
                          ('the niche inner corners (task-named; NICHE_RECESS :167)',
                           niche_recess))),
        ('cornice', (('the cornice-wall gap: the soffit\'s stand-off from its wall plane'
                      ' (CORNICE_PROFILE[1][0] :115)', cornice_standoff),)),
        ('ressaut', (('the ressaut top strips beside the arch foot (the springer seats;'
                      ' RESSAUT_HALF_W − ARCH_HALF_W :119/:861/:135)', seat_wing),)),
        ('impost', (('the impost-wall gap: the impost\'s max proud stand-off'
                     ' (IMPOST_PROFILE[3][0] :859; PASSAGE_IMPOST :140)', impost_standoff),)),
        ('vault.passage', (('the impost stand-off at the vault springs (IMPOST_PROFILE[3][0]'
                            ' :859)', impost_standoff),)),
    )
    for target, sources in specs:
        rows = []
        for name, gap in sources:
            gap = round(gap, 6)
            rows.append({'capM': round(half(gap), 4), 'gapM': gap, 'source': name})
        cap = min(row['capM'] for row in rows)
        cage = min(CAGE_DEFAULT_M, cap)
        table[target] = {'cageM': cage, 'capM': cap, 'cageIsDefault': cap >= CAGE_DEFAULT_M,
                         'sources': rows}
    # the design's own work sizes must fit inside the recommended cages; the springer's
    # seat check is the FLUSH fact (springerProj == the wing width — the proxy fills its
    # seat exactly and rides the arch/vault bakes, never the ressaut's own 0.03 cage)
    fits = {
        'arch': JUNCTION_LAW['ribCoveRM'] <= table['arch']['cageM'],
        'vault.gallery': JUNCTION_LAW['ribCoveRM'] <= table['vault.gallery']['cageM'],
        'vault.reveal': JUNCTION_LAW['ribCoveRM'] <= table['vault.reveal']['cageM'],
        'cornice': JUNCTION_LAW['corniceCoveRM'] <= table['cornice']['cageM'],
        'ressaut': abs(JUNCTION_LAW['springerProjM'] - seat_wing) <= 1e-9,
        'impost': JUNCTION_LAW['impostCoveRM'] <= table['impost']['cageM'],
        'vault.passage': JUNCTION_LAW['impostCoveRM'] <= table['vault.passage']['cageM'],
    }
    for target, ok in fits.items():
        table[target]['designWorkFits'] = ok
    payload = {
        'cageDefaultM': CAGE_DEFAULT_M,
        'decisions': {'D3_cageTable': table},
        'derivationLaw': 'CAGE = min(default 0.15, half the smallest neighbourhood gap); '
                         'every gap derived from the kit constants (the cites in each row)',
        'instrument': INSTRUMENT,
        'maxRayDistanceM': MAX_RAY_DISTANCE_M,
        'mode': 'cage',
        'notes': ['the ressaut row binds the RESSAUT target\'s own bake (0.03): the springer'
                  ' proxies ride the ARCH/VAULT bakes (cage 0.094), and the springer\'s'
                  ' springerProj 0.06 == the seat wing width — the proxy fills its seat'
                  ' exactly, flush with the ressaut edge',
                  'the cornice/impost/vault.reveal/vault.passage gap readings are derived'
                  ' from the named sources (the proud stand-offs); the S3 owner may confirm'
                  ' the readings against the design text',
                  'max_ray_distance 0.35 rides every target (the design\'s constant)'],
        'targets': sorted(S2A_TARGETS),
    }
    emit(payload, opts['out'])


def run_lmres(opts):
    """D4 — the LM_RES 2048 forecast: the naive bytes ∝ texels bound against the
    committed 1,000,000 texture cap."""
    scale = (LM_RES_FORECAST / LM_RES_NOMINAL) ** 2
    lm_after = {state: bytes_ * scale for state, bytes_ in sorted(POST_ENCODE_BYTES.items())}
    fixed = sum(ALBEDO_BYTES.values()) + PROBE_PLATE_BYTES
    total_after = fixed + sum(lm_after.values())
    bust = total_after - TEXTURE_CAP_BYTES
    payload = {
        'assumption': 'bytes ∝ texels as the naive bound (the design\'s stated scaling; a'
                      ' real toktx run at 2048 may land either side — the forecast is the'
                      ' bound, not an encode)',
        'atlas': {'res1536Texels': LM_RES_NOMINAL ** 2, 'res2048Texels': LM_RES_FORECAST ** 2,
                  'texelScale': round(scale, 6)},
        'committed': {'capBytes': TEXTURE_CAP_BYTES, 'lmBytes': POST_ENCODE_BYTES,
                      'source': 'public/assets/rastrelli-gallery/manifest.json + '
                                'tools/bake-logs/rastrelli-gallery.json postEncode rows',
                      'textureLineBytes': TEXTURE_LINE_BYTES},
        'decisions': {
            'D4_lmres2048': {
                'bustBytesOverCap': round(bust, 1),
                'lmBytesAt2048': {state: round(value, 1)
                                  for state, value in lm_after.items()},
                'lmBytesTotalAt2048': round(sum(lm_after.values()), 1),
                'textureLineAfterBytes': round(total_after, 1),
                'verdict': 'BUST' if bust > 0.0 else 'PASS',
            },
        },
        'fixedLines': {'albedoBytes': ALBEDO_BYTES, 'fixedTotalBytes': fixed,
                       'note': 'the 4 albedo plates (TEX_RES 512) + the fixed probe plate '
                               '([512,256]) do not ride LM_RES'},
        'instrument': INSTRUMENT,
        'mode': 'lmres',
        'resFrom': LM_RES_NOMINAL,
        'resTo': LM_RES_FORECAST,
    }
    emit(payload, opts['out'])


# ---- the texels mode (Blender) ----------------------------------------------------------------
bpy = None


def ensure_blender():
    global bpy
    if bpy is None:
        try:
            import bpy as _bpy
        except ImportError:
            fail('the texels mode needs Blender: run '
                 '`blender -b --factory-startup -noaudio -P tools/probes/rg-sightline.py -- texels`')
        bpy = _bpy


def belt_check(namespace):
    """The declared-kit belt: the mirrored constants must equal the builder's namespace
    (fail loud) — the Blender-free modes ride this PROVEN mirror."""
    problems = []
    scalars = dict(KIT)
    for name, expected in sorted(scalars.items()):
        got = namespace.get(name)
        if isinstance(expected, float) and isinstance(got, (int, float)):
            if abs(float(got) - expected) > 1e-9:
                problems.append(f'{name}: declared {expected}, builder {got}')
        elif got != expected:
            problems.append(f'{name}: declared {expected!r}, builder {got!r}')
    tuples = {
        'CORNICE_PROFILE': CORNICE_PROFILE, 'CAPITAL_PROFILE': CAPITAL_PROFILE,
        'BASE_PROFILE': BASE_PROFILE, 'SKIRTING_PROFILE': SKIRTING_PROFILE,
        'IMPOST_PROFILE': IMPOST_PROFILE, 'ARCH_PROFILE': tuple(ARCH_PROFILE),
        'G_ARC': tuple(G_ARC), 'P_ARC': tuple(P_ARC),
        'PILASTER_X': PILASTER_X, 'NICHE_CENTRES': NICHE_CENTRES,
    }
    for name, expected in sorted(tuples.items()):
        got = namespace.get(name)
        if got is None or len(got) != len(expected):
            problems.append(f'{name}: missing/length mismatch vs the declared mirror')
            continue
        for i, (e, g) in enumerate(zip(expected, got)):
            e_vals = e if isinstance(e, tuple) else (e,)
            g_vals = g if isinstance(g, tuple) else (g,)
            if len(e_vals) != len(g_vals) or any(abs(a - b) > 1e-9
                                                for a, b in zip(e_vals, g_vals)):
                problems.append(f'{name}[{i}]: declared {e}, builder {g}')
    if problems:
        fail('the declared-kit belt FAILED against the builder namespace — '
             + '; '.join(problems))
    return {'schedule': 'checked below', 'kitConstants': 'equal'}


def build_like_bake(stage):
    """bake.py's build_room pattern (tools/bpy/bake.py:343-364): factory-empty scene, then
    exec the committed builder with ZIMNY_BAKE=1 and the builder's own argv grammar."""
    here = Path(__file__).resolve().parent
    source_path = here.parent / 'bpy' / 'rastrelli-gallery.py'
    if not source_path.exists():
        fail(f'no committed builder at {source_path}')
    saved_argv = sys.argv
    sys.argv = [sys.argv[0], '--', '--room', 'rastrelli-gallery', '--out', str(stage)]
    saved_env = os.environ.get('ZIMNY_BAKE')
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': str(source_path)}
    try:
        code = compile(source_path.read_text(encoding='utf-8'), str(source_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
        if saved_env is None:
            os.environ.pop('ZIMNY_BAKE', None)
        else:
            os.environ['ZIMNY_BAKE'] = saved_env
    return namespace


def face_stats(face):
    """True world area (Newell) + world-space extents of one bmesh face (coords converted
    to_w: (x, y, -z_bl) — the builder's :220-221)."""
    verts = [v.co for v in face.verts]
    newell = (0.0, 0.0, 0.0)
    for i in range(len(verts)):
        a, b = verts[i], verts[(i + 1) % len(verts)]
        newell = (newell[0] + a.y * b.z - a.z * b.y,
                  newell[1] + a.z * b.x - a.x * b.z,
                  newell[2] + a.x * b.y - a.y * b.x)
    area = v_len(newell) / 2.0
    ws = [(c.x, c.z, -c.y) for c in verts]
    xs, ys, zs = [w[0] for w in ws], [w[1] for w in ws], [w[2] for w in ws]
    return area, (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


def chart_extents(entry):
    """finish()'s planar() extents in metres, replicated EXACTLY (builder :1553-1557 +
    :1455-1461): the uid pairs for 'cyl', else the box projection of the Blender co."""
    face, _kind, uid, _el = entry
    if uid is not None:
        plane = [tuple(p) for p in uid]
    else:
        normal = face.normal
        ax, ay, az = abs(normal.x), abs(normal.y), abs(normal.z)
        if ax >= ay and ax >= az:
            plane = [(v.co.z, v.co.y) for v in face.verts]
        elif ay >= az:
            plane = [(v.co.x, v.co.z) for v in face.verts]
        else:
            plane = [(v.co.x, v.co.y) for v in face.verts]
    us = [p[0] for p in plane]
    vs = [p[1] for p in plane]
    return (max(us) - min(us), max(vs) - min(vs))


def family_empty():
    return {'areaM2': 0.0, 'chartAreaM2': 0.0, 'faces': 0, 'maxCell': 0, 'maxDensity': 0.0,
            'minCell': 10 ** 9, 'minDensity': float('inf'), 'texels': 0}


def family_add(fam, area, chart_area, texels, cell_w, cell_h):
    fam['areaM2'] += area
    fam['chartAreaM2'] += chart_area
    fam['faces'] += 1
    fam['texels'] += texels
    fam['minCell'] = min(fam['minCell'], cell_w, cell_h)
    fam['maxCell'] = max(fam['maxCell'], cell_w, cell_h)
    if area > 1e-12:
        density = math.sqrt(texels / area)
        fam['minDensity'] = min(fam['minDensity'], density)
        fam['maxDensity'] = max(fam['maxDensity'], density)


def family_out(fam):
    density = math.sqrt(fam['texels'] / fam['areaM2']) if fam['areaM2'] > 1e-12 else None
    return {
        'areaM2': round(fam['areaM2'], 4),
        'atlasSharePct': round(fam['texels'] / (LM_RES_NOMINAL ** 2) * 100.0, 3),
        'chartAreaM2': round(fam['chartAreaM2'], 4),
        'cellPxRange': [fam['minCell'], fam['maxCell']],
        'densityTexelsPerM': round(density, 2) if density else None,
        'faces': fam['faces'],
        'faceDensityRange': [round(fam['minDensity'], 2), round(fam['maxDensity'], 2)]
        if fam['faces'] else None,
        'texels': fam['texels'],
    }


def arch_seg_table(roster, cells, pad, pre):
    """The per-seg rate table across the 11 arch runs (the D1 rows): each run = ARCH_SEGS
    soffit faces + 2 ring caps, in creation order (builder :1265-1272)."""
    runs = []
    current = None
    run_len = KIT['ARCH_SEGS'] + 2
    for idx, entry in enumerate(roster):
        if entry[3] == 'arch':
            if current is None:
                current = []
            current.append(idx)
            if len(current) == run_len:      # the arches emit consecutively, run by run
                runs.append(current)
                current = None
        elif current is not None:
            fail(f'an interrupted arch run after {len(current)} faces')
    lengths = {len(run) for run in runs}
    if lengths != {KIT['ARCH_SEGS'] + 2} or len(runs) != KIT['PILASTERS_PER_SIDE']:
        fail(f'the arch runs read {len(runs)} x {sorted(lengths)} faces; expected '
             f'{KIT["PILASTERS_PER_SIDE"]} x {[KIT["ARCH_SEGS"] + 2]}')
    segs = []
    for s in range(KIT['ARCH_SEGS'] + 2):
        per_arch = []
        for run in runs:
            idx = run[s]
            rect = cells[idx]['rect']
            texels = (rect[2] - 2 * pad) * (rect[3] - 2 * pad)
            per_arch.append((texels, pre[idx]['area']))
        first = per_arch[0]
        for other in per_arch[1:]:
            # the bmesh stores float32 verts: at the room's coordinate magnitudes the
            # half-ulp is ~3.8e-6 m per axis (the builder's TOUCH_EPS facts), so the
            # per-arch areas agree only to ~1e-6 — exact texels, relative-tolerant areas.
            if other[0] != first[0] or abs(other[1] - first[1]) > 1e-3 * max(1.0, first[1]):
                fail(f'the arch seg {s} is not uniform across the 11 arches '
                     f'({first} vs {other})')
        segs.append({
            'areaM2PerArch': round(first[1], 5),
            'cellPx': [cells[runs[0][s]]['rect'][2] - 2 * pad,
                       cells[runs[0][s]]['rect'][3] - 2 * pad],
            'chartExtentM': [round(v, 4) for v in pre[runs[0][s]]['chart']],
            'faceIndexWithinRun': s,
            'rateTexelsPerM': round(math.sqrt(first[0] / first[1]), 2),
            'role': 'soffitSeg' if s < KIT['ARCH_SEGS'] else 'ringCap',
            'texelsPerArch': first[0],
        })
    return segs


def run_texels(opts):
    ensure_blender()
    stage = os.environ.get('RG_SIGHTLINE_STAGE')
    if not stage:
        stage = str(Path(__file__).resolve().parent.parent.parent / 'probes'
                    / 'rg-sightline-stage')
    os.makedirs(stage, exist_ok=True)
    namespace = build_like_bake(stage)
    belt = belt_check(namespace)
    b = namespace['Builder']()
    namespace['build_room'](b)
    b.bm.normal_update()
    schedule = namespace['check_schedule'](b, namespace['author_schedule']())
    belt['schedule'] = 'equal (the builder\'s own check_schedule ran clean)'
    belt['rosterFaces'] = len([e for e in b.roster if e[0] is not None])
    mk = namespace['flat_material']
    slots = [mk('rg-sightline.pale', (0.72, 0.67, 0.58), 0.92),
             mk('rg-sightline.flags', (0.56, 0.54, 0.50), 0.92),
             mk('rg-sightline.stucco', (0.88, 0.86, 0.82), 0.92),
             mk('rg-sightline.band', (0.42, 0.40, 0.37), 0.92),
             mk('rg-sightline.stair', (1.0, 1.0, 1.0), 1.0),
             mk('rg-sightline.pane', (1.0, 1.0, 1.0), 1.0)]
    roster = [e for e in b.roster if e[0] is not None]
    # Precompute every per-face fact while the bmesh is ALIVE — finish() frees it
    # (builder :1729-1730: bm.to_mesh + bm.free), so nothing may touch the faces after.
    pre = []
    for entry in roster:
        face = entry[0]
        area, ext = face_stats(face)
        ys = [v.co.z for v in face.verts]      # blender co.z == the world y (to_w :221)
        pre.append({'area': area, 'yMin': min(ys), 'yMax': max(ys),
                    'chart': chart_extents(entry)})
    me_shell, t_shell, lm_shell = namespace['finish']('shell', b, slots, mode='shelf')
    sconce_b = namespace['build_sconce']()
    _me_s, _t_s, lm_strip = namespace['finish']('sconce', sconce_b, slots[:2], mode='strip')
    pad = int(KIT['LM_PAD_PX'])
    cells = lm_shell['cells']
    if len(cells) != len(roster):
        fail(f'the lm cells ({len(cells)}) and the roster ({len(roster)}) disagree')
    families = {}
    cornice_fascia = []  # the top risers (world y-extent 0.14)
    ressaut_tops = []    # the y-constant top strips at y 3.00
    capital_faces = []   # the capital band faces (min world y >= 2.45)
    for idx, entry in enumerate(roster):
        element = entry[3]
        rect = cells[idx]['rect']
        cell_w, cell_h = rect[2] - 2 * pad, rect[3] - 2 * pad
        texels = cell_w * cell_h
        chart_w, chart_h = pre[idx]['chart']
        fam = families.setdefault(element, family_empty())
        family_add(fam, pre[idx]['area'], chart_w * chart_h, texels, cell_w, cell_h)
        y_min, y_max = pre[idx]['yMin'], pre[idx]['yMax']
        if element == 'cornice':
            if abs((y_max - y_min) - (3.00 - 2.86)) < 1e-6:
                cornice_fascia.append(idx)
        elif element == 'ressaut':
            if (y_max - y_min) < 1e-9 and abs(y_max - 3.0) < 1e-9:
                ressaut_tops.append(idx)
        elif element == 'pilaster':
            if y_min >= KIT['SHAFT_Y1'] - 1e-9:
                capital_faces.append(idx)
    family_rows = [{'element': name, **family_out(families[name])}
                   for name in sorted(families)]
    total_texels = sum(row['texels'] for row in family_rows)
    total_area = sum(row['areaM2'] for row in family_rows)
    segs = arch_seg_table(roster, cells, pad, pre)
    vault_face_idx = [i for i, e in enumerate(roster) if e[3] == 'vault.gallery']
    vault_segs = []
    for s in range(KIT['G_ARC_SEGS']):
        texels_sum, area_sum = 0, 0.0
        for k in range(s, len(vault_face_idx), KIT['G_ARC_SEGS']):
            idx = vault_face_idx[k]
            rect = cells[idx]['rect']
            texels_sum += (rect[2] - 2 * pad) * (rect[3] - 2 * pad)
            area_sum += pre[idx]['area']
        vault_segs.append({'faceStride': s, 'rateTexelsPerM': round(math.sqrt(texels_sum / area_sum), 2),
                           'texels': texels_sum, 'areaM2': round(area_sum, 4)})

    def feature(sizes, rates, need=(2, 3), cap=JUNCTION_LAW['maxProjM']):
        rows = []
        for seat, rate in sorted(rates.items()):
            spans = [{'sizeM': size, 'texels': round(size * rate, 2)} for size in sizes]
            solves = [{'requiredRM': round(n / rate, 4), 'texels': n,
                       'withinMaxProj': n / rate <= cap + 1e-12} for n in need]
            rows.append({'rateTexelsPerM': round(rate, 2), 'seat': seat, 'solves': solves,
                         'spans': spans})
        return {'capM': cap, 'seatRates': rows}

    rates = {
        'archFamilyAggregate': math.sqrt(
            families['arch']['texels'] / families['arch']['areaM2']),
        'archCrownAdjacentSeg': max(segs[3]['rateTexelsPerM'], segs[4]['rateTexelsPerM']),
        'archFootSeg': min(segs[0]['rateTexelsPerM'], segs[7]['rateTexelsPerM']),
        'vaultGalleryAggregate': math.sqrt(
            families['vault.gallery']['texels'] / families['vault.gallery']['areaM2']),
    }
    cornice_rate = math.sqrt(families['cornice']['texels'] / families['cornice']['areaM2'])
    ressaut_rate = math.sqrt(families['ressaut']['texels'] / families['ressaut']['areaM2'])
    capital_rate = math.sqrt(
        sum((cells[i]['rect'][2] - 2 * pad) * (cells[i]['rect'][3] - 2 * pad)
            for i in capital_faces)
        / sum(pre[i]['area'] for i in capital_faces))
    features = {
        'ribCove': {**feature(tuple(sorted({JUNCTION_LAW['ribCoveRangeM'][0],
                                            JUNCTION_LAW['ribCoveRM'],
                                            JUNCTION_LAW['maxProjM']})), rates),
                    'crownAdjacentNote': 'the box-projection law starves the crown-adjacent'
                                         ' segs (their projected y-extent collapses): these'
                                         ' seats run near the design\'s ≈10 texels/m'},
        'corniceFascia': feature((JUNCTION_LAW['corniceCoveRM'], 3.00 - 2.86),
                                 {'corniceFamily': cornice_rate},
                                 cap=JUNCTION_LAW['corniceCoveRM']),
        'capitalProfile': feature((0.02, 0.05, 0.08),
                                  {'capitalBandFaces': capital_rate},
                                  cap=JUNCTION_LAW['maxProjM']),
        'ressautTopStrips': feature((RESSAUT_HALF_W - ARCH_HALF_W, JUNCTION_LAW['springerProjM']),
                                    {'ressautFamily': ressaut_rate},
                                    cap=RESSAUT_HALF_W - ARCH_HALF_W),
    }
    payload = {
        'archSegs': segs,
        'belt': belt,
        'families': family_rows,
        'features': features,
        'instrument': INSTRUMENT,
        'lm': {'atlasTexels': LM_RES_NOMINAL ** 2,
               'occupancy': lm_shell.get('occupancy'),
               'pxPerM': lm_shell.get('pxPerM'),
               'res': LM_RES_NOMINAL,
               'shelfFaces': lm_shell.get('faces'),
               'strip': {k: lm_strip[k] for k in sorted(lm_strip) if k != 'cells'},
               'stripRowPx': lm_shell.get('stripRowPx'),
               'totalFamilyTexels': total_texels,
               'totalFamilyAreaM2': round(total_area, 3)},
        'mode': 'texels',
        'notes': ['the texels mode re-runs the builder\'s OWN build_room + finish (the '
                  'shipped shelf pass), so the allocation is the committed atlas, not a '
                  'replica; the belt-check pins the mirrored kit constants to the namespace',
                  'density = sqrt(texels / true face area); archSegs/vaultSegs carry the '
                  'per-seg seat rates (the D1 seats); the crown-adjacent segs run at the '
                  'cell-min clamp because their projected cross-arc extent collapses',
                  'the arch/vault feature spans ride the seat rates above; D1 reads the '
                  'design\'s 0.05 m cove against them'],
        'schedule': schedule,
        'shellTriangles': t_shell,
        'vaultSegs': vault_segs,
    }
    emit(payload, opts['out'])


def emit(payload, out):
    text = json.dumps(payload, indent=1, sort_keys=True)
    print(text, flush=True)
    if out:
        path = Path(out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text + '\n', encoding='utf-8')
        print(f'rg_sightline: wrote {path}', file=sys.stderr, flush=True)


HELP_TEXT = """\
rg-sightline.py usage:
  python3 tools/probes/rg-sightline.py --help    (this text; no Blender needed)
  python3 tools/probes/rg-sightline.py sight [--out probes/<name>.json]
  python3 tools/probes/rg-sightline.py cage  [--out ...]    (Blender-free)
  python3 tools/probes/rg-sightline.py lmres [--out ...]    (Blender-free)
  blender -b --factory-startup -noaudio -P tools/probes/rg-sightline.py -- \\
      texels [--out ...]
Modes print one deterministic JSON document to stdout (D1-D5 feed the junction law's
S0 slice); --out additionally writes the same JSON under probes/ (gitignored).
"""


def parse_args(argv):
    if argv and argv[0] in ('--help', '-h'):
        print(HELP_TEXT, end='')
        return None, None
    if not argv or argv[0] not in ('texels', 'sight', 'cage', 'lmres'):
        fail('usage: texels | sight | cage | lmres [--out <path>] | --help '
             '(texels runs under Blender only)')
    mode = argv.pop(0)
    out = None
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token == '--out':
            if not rest:
                fail('--out needs a path')
            out = rest.pop(0)
        else:
            fail(f'unrecognised argument {token!r}')
    return mode, {'out': out}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    mode, opts = parse_args(argv)
    if mode is None:
        return
    if mode == 'sight':
        run_sight(opts)
    elif mode == 'cage':
        run_cage(opts)
    elif mode == 'lmres':
        run_lmres(opts)
    elif mode == 'texels':
        run_texels(opts)


if __name__ == '__main__':
    main()
