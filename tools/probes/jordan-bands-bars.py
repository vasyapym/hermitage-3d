# tools/probes/jordan-bands-bars.py — the bands round's bar checker (COMMITTED code,
# authored by the round; run only at the round's read phases — never by CI).
#
#   python3 tools/probes/jordan-bands-bars.py <after-dir> [before-dir]
#   JORDAN_BANDS_LOG=tools/bake-logs/jordan.json   (the B4 plate-gate source)
#   JORDAN_BANDS_EXPECT_W=0.45                     (F2 may declare another W)
#
# Inputs: the capture battery's PNGs + per-shot pose jsons (the rail stops' committed
# poses + CAMERA_VFOV_DEG = 55). The regions are projected from world AABBs with the
# shot's own pose — no hand rects (the bands round's spec). Occlusion is NOT testable
# from a PNG: the adaptation of the design's «drop a bay if < 60 % unoccluded» rule is
# geometric — a region drops unless every corner projects inside the frame with depth —
# and B1/B3 therefore measure at J1b (the columns and the portal stand clear of its
# sight lines to the north wall); J4 stays the golden-regression stop.
#
# Bars (the bands round's design, the specialist's artifact §4):
#   B1 strips — per north pier with a visible shaft and flanks:
#      |meanY(SHAFT_HI) − meanY(its bays' FLANK_HI)| ≤ 6, every state.
#   B2 frames — meanY(FRAME_HI) − meanY(FLANK_HI) ≤ 20 at day.
#   B3 tier — meanY(FLANK_HI) ≥ 0.70 × meanY(SPANDREL) at day; day FLANK_HI ≥ night + 20;
#      day SHAFT_HI ≥ night + 20 (the DEC-044 shape; the «evening» killer).
#   B7east — at J3: |meanY(EAST_SHAFT_HI) − meanY(EAST_FLANK_HI)| ≤ 6, every state
#      (the split's east group must sit in its own wall's field after the fix).
#   B4 plate gates — the day encode row: W == expected, clipped ≤ 3.0 %, halo ≤ 1.51 %
#      (the committed 2c value; no worsening).
#   B5/B6 diagnostics — the ETC1S dark-median loss re-measure rides the chain's
#      re-encode (not re-derived here); the patchwork step prints as a diagnostic and
#      its ruling belongs to the 2b round per the design.
# Baseline law: run once on the pre-fix build — it must FAIL B1 or B3; a passing
# baseline means the bands are the contrast frame alone and the design's F4 becomes
# primary. Exit 0 only when every verdict bar passes on every required frame.

import json
import math
import os
import pathlib
import sys

import numpy as np
from PIL import Image

# The committed roster constants (tools/bpy/jordan.py).
PIER_X = [67.075, 71.2, 75.1, 79.0, 82.9, 86.8, 90.925]
WIN_X = [69.25, 73.15, 77.05, 80.95, 84.85, 88.75]
EAST_Z = [-85.2, -76.6, -71.4, -62.8]
Z_N = -86.0
FOV_DEG = 55.0  # CAMERA_VFOV_DEG — the one source of the vertical FOV

STATES = ['day-golden', 'day-noon', 'dusk', 'night']
VIEWPORTS = ['p', 'l']
STOPS = ['J1b', 'J3', 'J4']


def regions():
    """The world AABBs: name -> (x0, x1, y0, y1, z0, z1)."""
    out = {}
    for i, px in enumerate(PIER_X):
        out[f'shaft_hi_{i}'] = (px - 0.22, px + 0.22, 8.5, 16.0, Z_N + 0.15, Z_N + 0.25)
        out[f'shaft_lo_{i}'] = (px - 0.22, px + 0.22, 0.8, 8.5, Z_N + 0.15, Z_N + 0.25)
    for j, cx in enumerate(WIN_X):
        out[f'flank_hi_{j}_w'] = (cx - 1.70, cx - 1.15, 13.2, 16.3, Z_N - 0.05, Z_N + 0.05)
        out[f'flank_hi_{j}_e'] = (cx + 1.15, cx + 1.70, 13.2, 16.3, Z_N - 0.05, Z_N + 0.05)
        out[f'spandrel_{j}'] = (cx - 1.0, cx + 1.0, 7.0, 12.5, Z_N - 0.05, Z_N + 0.05)
        out[f'head_zone_{j}'] = (cx - 1.0, cx + 1.0, 16.6, 16.95, Z_N - 0.05, Z_N + 0.05)
        out[f'frame_hi_{j}'] = (cx - 1.30, cx - 1.12, 13.0, 16.7, Z_N + 0.05, Z_N + 0.15)
        out[f'frame_hi_{j}_e'] = (cx + 1.12, cx + 1.30, 13.0, 16.7, Z_N + 0.05, Z_N + 0.15)
        out[f'pane_hi_{j}'] = (cx - 1.0, cx + 1.0, 13.2, 16.3, Z_N - 0.62, Z_N - 0.58)
    for i, ez in enumerate(EAST_Z):
        out[f'east_shaft_hi_{i}'] = (91.75, 91.85, 8.5, 16.0, ez - 0.22, ez + 0.22)
        out[f'east_flank_hi_{i}_n'] = (91.95, 92.05, 8.5, 16.0, ez - 1.55, ez - 0.75)
        out[f'east_flank_hi_{i}_s'] = (91.95, 92.05, 8.5, 16.0, ez + 0.75, ez + 1.55)
    out['coffer'] = (77.0, 81.0, 17.1, 18.3, -84.5, -80.5)
    out['floor'] = (80.0, 86.0, 0.02, 0.08, -76.0, -70.0)
    return out


REGIONS = regions()


def project(aabb, pose):
    """Project one world AABB into the shot's screen; returns (bbox, visible) with the
    bbox = (x0, y0, x1, y1) in pixels (y down) or None."""
    px, py, pz = pose['pos']
    tx, ty, tz = pose['target']
    width, height = pose['viewport']
    f = np.array([tx - px, ty - py, tz - pz], dtype=np.float64)
    norm = np.linalg.norm(f)
    if norm < 1e-9:
        return None, False
    f /= norm
    up = np.array([0.0, 1.0, 0.0])
    r = np.cross(f, up)
    rn = np.linalg.norm(r)
    if rn < 1e-9:  # the gaze is vertical — the jordan stops never are
        return None, False
    r /= rn
    u = np.cross(r, f)
    tan_v = math.tan(math.radians(FOV_DEG) / 2)
    tan_h = tan_v * (width / height)
    xs = (aabb[0], aabb[1])
    ys = (aabb[2], aabb[3])
    zs = (aabb[4], aabb[5])
    corners = [(x, y, z) for x in xs for y in ys for z in zs]
    pts = []
    for cx, cy, cz in corners:
        d = np.array([cx - px, cy - py, cz - pz], dtype=np.float64)
        depth = float(np.dot(d, f))
        if depth < 0.2:
            return None, False
        ndc_x = float(np.dot(d, r)) / (depth * tan_h)
        ndc_y = float(np.dot(d, u)) / (depth * tan_v)
        if abs(ndc_x) > 1.02 or abs(ndc_y) > 1.02:
            return None, False
        pts.append(((ndc_x + 1) / 2 * width, (1 - ndc_y) / 2 * height))
    x0 = max(min(p[0] for p in pts), 0.0)
    x1 = min(max(p[0] for p in pts), float(width))
    y0 = max(min(p[1] for p in pts), 0.0)
    y1 = min(max(p[1] for p in pts), float(height))
    if x1 - x0 < 12 or y1 - y0 < 12:
        return None, False
    return (int(x0), int(y0), int(x1), int(y1)), True


def mean_y(image, bbox):
    x0, y0, x1, y1 = bbox
    patch = image[y0:max(y1, y0 + 1), x0:max(x1, x0 + 1)]
    return float(np.mean(0.2126 * patch[:, :, 0] + 0.7152 * patch[:, :, 1]
                         + 0.0722 * patch[:, :, 2]))


def load_dir(dir_path):
    """{frame: {'pose': ..., 'regions': {region: meanY | None}}} — None = projected out."""
    out = {}
    for png in sorted(dir_path.glob('*.png')):
        frame = png.stem
        pose_path = dir_path / f'{frame}.pose.json'
        if not pose_path.exists():
            continue
        pose = json.loads(pose_path.read_text(encoding='utf-8'))
        image = np.asarray(Image.open(png).convert('RGB'), dtype=np.float64)
        regions = {}
        for name, aabb in REGIONS.items():
            bbox, visible = project(aabb, pose)
            regions[name] = mean_y(image, bbox) if visible else None
        out[frame] = {'pose': pose, 'regions': regions}
    return out


def pair(frame, after):
    return frame in after and after[frame]['regions'] is not None


def region(after, frame, name):
    data = after.get(frame)
    if data is None:
        return None
    return data['regions'].get(name)


def pooled(after, frame, names):
    values = [region(after, frame, name) for name in names]
    values = [v for v in values if v is not None]
    return float(np.mean(values)) if values else None


def pier_pairs():
    """Pier i with its flanking bays' flank regions (the piers sit between the bays)."""
    pairs = []
    for i in range(1, 6):  # piers 1..5 flank bays i-1 and i
        names = [f'flank_hi_{i - 1}_e', f'flank_hi_{i}_w']
        pairs.append((i, names))
    pairs.append((6, [f'flank_hi_5_e']))  # the corner pier 90.925 flanks bay 5 only
    return pairs


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('JORDAN_BANDS_')]
    if not args:
        print('usage: jordan-bands-bars.py <after-dir> [before-dir]')
        sys.exit(2)
    after_dir = pathlib.Path(args[0])
    before_dir = pathlib.Path(args[1]) if len(args) > 1 else None
    log_path = os.environ.get('JORDAN_BANDS_LOG', 'tools/bake-logs/jordan.json')
    expect_w = float(os.environ.get('JORDAN_BANDS_EXPECT_W', '0.45'))

    after = load_dir(after_dir)
    before = load_dir(before_dir) if before_dir else None
    if not after:
        print(f'BARS: no captured frames under {after_dir} — FAIL')
        sys.exit(1)

    verdicts, diagnostics = [], []

    # B1 — the strips.
    b1_rows = []
    b1_fail = 0
    for state in STATES:
        for view in VIEWPORTS:
            for pier, flank_names in pier_pairs():
                shaft = region(after, f'{state}-j1b-{view}', f'shaft_hi_{pier}')
                flank = pooled(after, f'{state}-j1b-{view}', flank_names)
                if shaft is None or flank is None:
                    continue
                delta = shaft - flank
                ok = abs(delta) <= 6.0
                if not ok:
                    b1_fail += 1
                b1_rows.append(f'  B1 {state}-j1b-{view} pier {PIER_X[pier]}: '
                               f'shaft {shaft:.1f} flank {flank:.1f} Δ {delta:+.1f} '
                               f'{"PASS" if ok else "FAIL"} (|Δ| ≤ 6)')
    verdicts.append(('B1', b1_fail == 0 and len(b1_rows) > 0))
    print('\n'.join(b1_rows) if b1_rows else '  B1: no measurable pier/flank pair — FAIL')
    if not b1_rows:
        verdicts[-1] = ('B1', False)

    # B2 — the frames.
    b2_rows, b2_fail = [], 0
    for state in ('day-golden', 'day-noon'):
        for view in VIEWPORTS:
            for j in range(len(WIN_X)):
                frame = region(after, f'{state}-j1b-{view}', f'frame_hi_{j}')
                frame_e = region(after, f'{state}-j1b-{view}', f'frame_hi_{j}_e')
                flank = pooled(after, f'{state}-j1b-{view}',
                               [f'flank_hi_{j}_w', f'flank_hi_{j}_e'])
                if frame is None or flank is None:
                    continue
                frame_mean = float(np.mean([v for v in (frame, frame_e) if v is not None]))
                delta = frame_mean - flank
                ok = delta <= 20.0
                if not ok:
                    b2_fail += 1
                b2_rows.append(f'  B2 {state}-j1b-{view} bay {WIN_X[j]}: frame {frame_mean:.1f} '
                               f'flank {flank:.1f} Δ {delta:+.1f} {"PASS" if ok else "FAIL"} (Δ ≤ 20)')
    if b2_rows:
        verdicts.append(('B2', b2_fail == 0))
    print('\n'.join(b2_rows))

    # B3 — the tier (the «evening» killer).
    b3_rows, b3_fail = [], 0
    for view in VIEWPORTS:
        flanks_day = [region(after, f'day-golden-j1b-{view}', f'flank_hi_{j}_{side}')
                      for j in range(len(WIN_X)) for side in ('w', 'e')]
        flanks_day = [v for v in flanks_day if v is not None]
        spandrels_day = [region(after, f'day-golden-j1b-{view}', f'spandrel_{j}')
                         for j in range(len(WIN_X))]
        spandrels_day = [v for v in spandrels_day if v is not None]
        flanks_noon = [region(after, f'day-noon-j1b-{view}', f'flank_hi_{j}_{side}')
                       for j in range(len(WIN_X)) for side in ('w', 'e')]
        flanks_noon = [v for v in flanks_noon if v is not None]
        flanks_night = [region(after, f'night-j1b-{view}', f'flank_hi_{j}_{side}')
                        for j in range(len(WIN_X)) for side in ('w', 'e')]
        flanks_night = [v for v in flanks_night if v is not None]
        shafts_day = [region(after, f'day-golden-j1b-{view}', f'shaft_hi_{i}') for i in range(7)]
        shafts_day = [v for v in shafts_day if v is not None]
        shafts_night = [region(after, f'night-j1b-{view}', f'shaft_hi_{i}') for i in range(7)]
        shafts_night = [v for v in shafts_night if v is not None]
        if flanks_day and spandrels_day:
            fd, sd = float(np.mean(flanks_day)), float(np.mean(spandrels_day))
            ok = fd >= 0.70 * sd
            if not ok:
                b3_fail += 1
            b3_rows.append(f'  B3 day-golden-j1b-{view}: flank {fd:.1f} ≥ 0.70 × spandrel '
                           f'{sd:.1f} = {0.70 * sd:.1f} {"PASS" if ok else "FAIL"}')
        if flanks_noon and spandrels_day:
            fn = float(np.mean(flanks_noon))
            ok = fn >= 0.70 * float(np.mean(spandrels_day))
            if not ok:
                b3_fail += 1
            b3_rows.append(f'  B3 day-noon-j1b-{view}: flank {fn:.1f} ≥ 0.70 × spandrel '
                           f'{float(np.mean(spandrels_day)):.1f} {"PASS" if ok else "FAIL"}')
        if flanks_day and flanks_night:
            fd, fn_ = float(np.mean(flanks_day)), float(np.mean(flanks_night))
            ok = fd >= fn_ + 20
            if not ok:
                b3_fail += 1
            b3_rows.append(f'  B3 day vs night flank j1b-{view}: day {fd:.1f} ≥ night '
                           f'{fn_:.1f} + 20 {"PASS" if ok else "FAIL"}')
        if shafts_day and shafts_night:
            sd_, sn = float(np.mean(shafts_day)), float(np.mean(shafts_night))
            ok = sd_ >= sn + 20
            if not ok:
                b3_fail += 1
            b3_rows.append(f'  B3 day vs night shaft j1b-{view}: day {sd_:.1f} ≥ night '
                           f'{sn:.1f} + 20 {"PASS" if ok else "FAIL"}')
    if b3_rows:
        verdicts.append(('B3', b3_fail == 0))
    print('\n'.join(b3_rows) if b3_rows else '  B3: no measurable tier rows — FAIL')
    if not b3_rows:
        verdicts.append(('B3', False))

    # B7east — the east group at J3.
    b7_rows, b7_fail = [], 0
    for state in STATES:
        for view in VIEWPORTS:
            for i in range(len(EAST_Z)):
                shaft = region(after, f'{state}-j3-{view}', f'east_shaft_hi_{i}')
                flank = pooled(after, f'{state}-j3-{view}',
                               [f'east_flank_hi_{i}_n', f'east_flank_hi_{i}_s'])
                if shaft is None or flank is None:
                    continue
                delta = shaft - flank
                ok = abs(delta) <= 6.0
                if not ok:
                    b7_fail += 1
                b7_rows.append(f'  B7 {state}-j3-{view} east shaft z {EAST_Z[i]}: '
                               f'{shaft:.1f} vs flank {flank:.1f} Δ {delta:+.1f} '
                               f'{"PASS" if ok else "FAIL"} (|Δ| ≤ 6)')
    if b7_rows:
        verdicts.append(('B7east', b7_fail == 0))
    print('\n'.join(b7_rows))

    # B4 — the plate gates from the committed bake log.
    b4_rows, b4_fail = [], 0
    log_file = pathlib.Path(log_path)
    if log_file.exists():
        log = json.loads(log_file.read_text(encoding='utf-8'))
        rows = log if isinstance(log, list) else log.get('bakes', log.get('rows', []))
        day_rows = [row for row in rows
                    if isinstance(row, dict) and row.get('state') == 'day'
                    and row.get('encode')]
        if day_rows:
            enc = day_rows[-1]['encode']
            w = enc.get('w')
            clipped = enc.get('clippedFraction')
            halo = enc.get('haloFraction')
            checks = [(w == expect_w, f'W {w} == {expect_w}'),
                      (clipped is not None and clipped <= 0.03,
                       f'clipped {clipped} ≤ 0.03'),
                      (halo is not None and halo <= 0.0151, f'halo {halo} ≤ 0.0151')]
            for ok, label in checks:
                if not ok:
                    b4_fail += 1
                b4_rows.append(f'  B4 {label} {"PASS" if ok else "FAIL"}')
        else:
            b4_rows.append('  B4: no day encode row in the log — FAIL (the chain must land first)')
            b4_fail += 1
    else:
        b4_rows.append(f'  B4: no bake log at {log_path} — FAIL')
        b4_fail += 1
    verdicts.append(('B4', b4_fail == 0))
    print('\n'.join(b4_rows))

    # Diagnostics — the patchwork step (the 2b round's ruling) + the before/after deltas.
    for view in VIEWPORTS:
        for j in range(len(WIN_X)):
            sp = region(after, f'day-golden-j1b-{view}', f'spandrel_{j}')
            if sp is not None:
                diagnostics.append(f'  B6-diag day-golden-j1b-{view} spandrel {WIN_X[j]}: {sp:.1f}')
    if before:
        for frame in sorted(after):
            if frame in before:
                a_regions = after[frame]['regions']
                b_regions = before[frame]['regions']
                shared = [n for n in a_regions if a_regions[n] is not None and b_regions.get(n) is not None]
                if shared:
                    delta = float(np.mean([a_regions[n] - b_regions[n] for n in shared]))
                    diagnostics.append(f'  before→after {frame}: mean region Δ {delta:+.1f} '
                                       f'over {len(shared)} shared regions (the flips are declared)')

    print('\n'.join(diagnostics))
    print()
    failed_bars = [name for name, ok in verdicts if not ok]
    for name, ok in verdicts:
        print(f'{name}: {"PASS" if ok else "FAIL"}')
    if failed_bars:
        print(f'VERDICT: FAIL ({", ".join(failed_bars)})')
        sys.exit(1)
    print('VERDICT: PASS')


main()
