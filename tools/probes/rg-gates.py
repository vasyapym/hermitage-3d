# tools/probes/rg-gates.py — the RG-F3 capture-gate instrument (COMMITTED code, authored by
# the round; RUN only at the round's capture phases — never by CI). Blender-routed like the
# repo's other image tools: it loads the capture PNGs via bpy (f32 pixels, no colourspace
# transform) and measures with numpy only. Deterministic: fixed-fraction declared ROIs,
# fixed thresholds, no clock, no randomness. Blender imports are LAZY (inside the
# measurement path) so `python3 tools/probes/rg-gates.py --help` works without Blender,
# and main() runs only under the __main__ guard (ordinary-Python import safety).
#
#   python3 tools/probes/rg-gates.py --help                 # no Blender needed
#   blender -b --factory-startup -noaudio -P tools/probes/rg-gates.py -- \
#     calibrate --before probes/rg-f3-before            # FIRST before-run: measured-vs-recorded DELTAS
#   blender -b --factory-startup -noaudio -P tools/probes/rg-gates.py -- \
#     gates --before probes/rg-f3-before --after probes/rg-f3-after
#
# THE OWNER-ACCEPTANCE LAW (binding on this instrument): calibrate is MEASUREMENT-ONLY —
# it prints every measured value beside its recorded reference and the delta, and issues
# NO pass/FAIL decision; the day>53.15 stop is an AFTER-ONLY row and never applies to the
# before battery. The retained bands ride the gates ONLY after an explicit acceptance
# step: a prior calibration run + env RG_GATES_ACCEPTED=1 (the owner's acceptance of the
# replacement instrument). Without that flag, or with a partial battery, a gates run is
# 'NON-GATING': rows carry measured values, never gating verdicts. A gating run
# additionally requires the FULL 21-frame roster provenance-measured in the after dir;
# frames are IDENTIFIED by the capture runner's provenance.json rows only — unprovenanced,
# absent, or stale PNG files are never consumed.
#
# REPLACEMENT (documented): the predecessor capture-gate instruments recorded at the RG-F2
# landing (END-WALL x4 / SYMMETRY 12/12 / LEVEL / JUNCTION / COUNTS / DOOR / ORDER) are NOT
# in the repo — recovery FAILED (checked: no gate script on main, and the sibling rg-look
# worktree's probes/ carries only the 15 PNG frames + the capture runners; the runner's own
# rgf2-serve-verify.* scratch references are gone too). The comparators below therefore
# implement the §2.5 RECORDED DEFINITIONS SHAPE (docs/STATE.md's bullets + docs/briefs/
# ROUNDS.md's record rows) with masks/ROIs declared in-file; substantive calibration
# deltas go to the owner as NON-COMPARABLE evidence — no old band is silently attached to
# a different measurement.
#
# Band laws carried from the ruling (RG-F3 dispositions), gated as above:
#   - SYMMETRY: the original 0.908–1.079 band is RETAINED for the NIGHT frames only (4/4);
#     day/dusk ratios are REPORTED without pass bands (the declared unilateral daylight).
#   - LEVEL: the G1-night mean stays [55, 90]; dark/clip shares are prints (§2.5 recorded
#     0.33 % / 0.258 %; their instrument acceptance rules were not recoverable).
#   - ORDER: the 1.13 floor is kept; the recorded read 1.1328 rides the calibration.
#   - DOOR: the card/lunette floors {day 165, dusk 132, nightChandeliers 145}/255 and the
#     ratio >= 1.35 are kept (recorded reads 1.59/1.39/1.51).
#   - JUNCTION: 56.37 alone is NOT a band — the value is recorded and the after-vs-before
#     delta (where a validated baseline frame exists) is the evidence; no fabricated pass
#     or fail band; a missing baseline is an explicit 'no baseline row'.
#   - NIGHT-PLATE: zero pane emission does not imply byte-identical night transport after
#     the albedo change — every night frame reports the signed mean luminance delta and
#     the absolute pixel-code deltas (camera/state + comparison domain on each row); the
#     baseline identity comes FROM THE BEFORE BATTERY'S OWN PROVENANCE (its tree HEAD sha
#     + served asset identities), never from an invented revision label.
#   - MEANS: the per-state stop-battery means keep the ordering night < dusk < day; the
#     day>53.15 requirement is THE RULED STOP with its own explicit AFTER-ONLY row.
import json
import math
import os
import sys

CANONICAL_STATES = ('day', 'dusk', 'nightChandeliers')

# ---- the §2.5 recorded constants (the calibration reference; CANONICAL state keys) --------
RECORDED = {
    'doorFloorsByState': {'day': 165.0, 'dusk': 132.0, 'nightChandeliers': 145.0},  # /255 code means
    'doorRatioFloor': 1.35,
    'doorRatioRecordedByState': {'day': 1.59, 'dusk': 1.39, 'nightChandeliers': 1.51},
    'junctionRecorded': 56.37,                  # a recorded print, never a pass band
    'levelBand': (55.0, 90.0),                  # the G1-night mean band
    'levelClipsRecordedPct': 0.258,
    'levelDarkRecordedPct': 0.33,
    'meansRecordedByState': {'day': 53.15, 'dusk': 41.22, 'nightChandeliers': 38.98},
    'orderFloor': 1.13,
    'orderRecorded': 1.1328,
    'symmetryBand': (0.908, 1.079),             # the RG-F2 12/12 recorded min..max
}
# Belt: every state key in every record table is canonical (pure-Python check, runs at
# import without Blender — the --help path stays import-safe).
for _table_name in ('doorFloorsByState', 'doorRatioRecordedByState', 'meansRecordedByState'):
    for _key in RECORDED[_table_name]:
        if _key not in CANONICAL_STATES:  # a non-canonical ('night'-style) key must never load
            raise SystemExit(
                f'rg_gates: the {RECORDED.get(_table_name)!r} record table {_table_name!r} '
                f'carries a non-canonical state key {_key!r} '
                f'(must be one of {CANONICAL_STATES})'
            )

STATE_BY_SUFFIX = {'day': 'day', 'dusk': 'dusk', 'night': 'nightChandeliers'}

# ---- the declared per-metric rosters (whose measured frames each metric rides) -------------
def _is_rail(frame):
    return frame['stop'].startswith('cam')


METRIC_ROSTERS = {
    'SYMMETRY': lambda _f: True,                                   # the FULL battery incl. rail
    'LEVEL': lambda f: f['stop'] == 'g1' and f['state'] == 'nightChandeliers',
    'ORDER': lambda f: f['state'] == 'day' and not _is_rail(f),    # the day stop frames
    'DOOR': lambda f: f['stop'] in ('gj', 'g1', 'g2'),             # every state, the door frames
    'JUNCTION': lambda f: f['stop'] == 'g0',                       # every state, the junction frames
    'MEANS': lambda f: not _is_rail(f),                            # the four stops per state
}

# ---- declared ROIs (fractions of the frame; y runs FROM THE TOP) ---------------------------
# SYMMETRY: screen-left half is the z=70 (courtyard) wall, screen-right half the z=76 wall
# (the camera looks east, +x, so screen-right = +z). A 0.02-half-width central gutter is
# excluded so the door/head band never dominates either half's mean.
SYMMETRY_GUTTER_FRAC = 0.02
# ORDER: the white stucco order band (tympanum/cornice/capital strip) vs the warm limewash
# field mid-band — the value split the ORDER read measured. Boxes (x0, y0, x1, y1).
ORDER_ROI = (0.55, 0.05, 0.90, 0.30)
FIELD_ROI = (0.18, 0.30, 0.42, 0.62)
# DOOR: the card + lunette sit frame-centred toward the east end at Gj/G1/G2. The SURROUND
# is the declared OUTER box's pixel mass MINUS the inner door ROI's own counts (an honest
# ring, recomputed — the outer box's plain mean would contaminate the denominator with the
# door itself); the calibration rows judge the fit against the recorded 1.59/1.39/1.51.
DOOR_ROI = (0.455, 0.36, 0.545, 0.55)
DOOR_OUTER_ROI = (0.42, 0.28, 0.58, 0.62)
# JUNCTION: the knot where the passage opens into the gallery on the g-g0 frames
# (G0 [0,1.7,86] faces the junction [1.6,2.4,73]).
JUNCTION_ROI = (0.30, 0.25, 0.70, 0.75)
# NIGHT-PLATE: a pixel "moves" when its mean code differs by more than this (codes).
NIGHT_MOVE_TOL_CODES = 2.0
# LEVEL dark/clip definitions (declared; the recorded prints' instrument acceptance rules
# were not recoverable — the calibration deltas expose the fit instead).
LEVEL_DARK_MAX_CODE = 25.0      # dark = pixels whose mean code reads below 10 % white
LEVEL_CLIP_MIN_CODE = 254.0     # clip = pixels at (near-)full white

GATES_ACCEPTANCE_ENV = 'RG_GATES_ACCEPTED'   # the explicit acceptance switch (must be '1')
BATTERY_SIZE = 21                            # the canonical gating roster (the capture runner's)

HELP_TEXT = """\
rg-gates.py usage:
  python3 tools/probes/rg-gates.py --help   (this text; no Blender needed)
  blender -b --factory-startup -noaudio -P tools/probes/rg-gates.py -- \\
      calibrate --before probes/rg-f3-before
      -> measurement-only: measured values vs the recorded references + deltas;
         NO pass/FAIL, NO band attach, NO after-only stop applied to the battery.
  blender -b --factory-startup -noaudio -P tools/probes/rg-gates.py -- \\
      gates --before probes/rg-f3-before --after probes/rg-f3-after
      -> the gates run: NON-GATING (no verdict) unless the after dir's provenance
         shows the FULL 21-roster and env RG_GATES_ACCEPTED=1 is set; frames are
         identified by the capture runner's provenance.json rows only.
The OWNER-ACCEPTANCE LAW and the per-metric rosters/ROIs live in the module header.
"""

# Lazy Blender/numpy handles: assigned on first measurement-path use only.
bpy = None
np = None


def ensure_blender():
    """The Blender-dependent imports live inside the execution path: plain python never
    sees them (`--help` proof)."""
    global bpy
    global np
    if np is None:
        import bpy as _bpy
        import numpy as _np
        bpy, np = _bpy, _np


def fail(message):
    print(f'rg_gates: {message}', file=sys.stderr, flush=True)
    raise SystemExit(f'rg_gates: {message}')


def parse_args(argv):
    if argv and argv[0] in ('--help', '-h'):
        print(HELP_TEXT, end='')
        return None, None
    if not argv or argv[0] not in ('calibrate', 'gates'):
        fail(
            'usage: calibrate --before <dir> | gates --before <dir> --after <dir> | '
            '--help (calibration is measurement-only; gating needs the full roster + '
            f'{GATES_ACCEPTANCE_ENV}=1)'
        )
    mode = argv.pop(0)
    opts = {'after': None, 'before': None}
    positional = []
    rest = list(argv)
    while rest:
        token = rest.pop(0)
        if token in ('--before', '--after'):
            if not rest:
                fail(f'{token} needs a directory')
            opts[token[2:]] = rest.pop(0)
        else:
            positional.append(token)
    if positional:
        fail(f'unrecognised arguments {positional}')
    if not opts['before']:
        opts['before'] = opts['after']
    if not opts['before'] or not os.path.isdir(opts['before']):
        fail(f'the capture directory is missing: {opts["before"]}')
    if mode == 'gates' and not opts['after']:
        fail('gates mode needs --after (the before dir defaults to it only in calibrate)')
    return mode, opts


def read_provenance(directory):
    """The battery's OWN provenance (the capture runner's frame-identity law): the
    directory's provenance.json, its validated ok-rows keyed by shot name, and its
    tree/dist identity. A capture dir without provenance is NOT a measurable battery
    (stale-evidence guard: gates consume only rows matching measured frames)."""
    path = os.path.join(directory, 'provenance.json')
    if not os.path.exists(path):
        fail(
            f'no provenance.json at {path} — a capture battery without its provenance '
            'is stale evidence; run the capture runner first (gates consume only rows '
            'matching measured frames)'
        )
    with open(path, 'r', encoding='utf-8') as handle:
        doc = json.load(handle)
    rows = doc.get('shots')
    if not isinstance(rows, list) or any(
        not isinstance(row, dict)
        or not isinstance(row.get('name'), str)
        or not isinstance(row.get('file'), str)
        or not isinstance(row.get('ok'), bool)
        for row in rows
    ):
        fail(f'the provenance at {path} carries no valid per-frame rows')
    identity = doc.get('dist') or {}
    if not doc.get('treeHeadSha') or not isinstance(identity.get('rel'), str):
        fail(f'the provenance at {path} carries no tree/asset identity (stale schema)')
    return {
        'battery': doc.get('battery') or [],
        'identity': {'dist': identity, 'treeHeadSha': doc['treeHeadSha']},
        'okFrames': {row['name']: row for row in rows if row['ok']},
        'path': path,
    }


def list_measured_frames(directory, provenance):
    """Only the PNG files whose provenance row measured ok (frame identity = provenance,
    never the directory walk); unknown PNG suffixes and stale files are excluded loudly."""
    measured = []
    for row_name, row in sorted(provenance['okFrames'].items()):
        if row['file'] != f'{row_name}.png':
            print(f'rg_gates: excluded {row_name}: its provenance file is {row["file"]}')
            continue
        path = os.path.join(directory, row['file'])
        if not os.path.exists(path):
            print(f'rg_gates: excluded {row_name}: its PNG is absent')
            continue
        parts = row_name.split('-')
        if len(parts) < 3 or parts[0] != 'g':
            print(f'rg_gates: excluded {row_name}: an unrecognised frame name')
            continue
        stop, suffix = '-'.join(parts[1:-1]), parts[-1]
        if suffix not in STATE_BY_SUFFIX:
            print(f'rg_gates: excluded {row_name}: an unrecognised state suffix')
            continue
        measured.append({'file': row['file'], 'name': row_name, 'state': suffix, 'stop': stop})
    if not measured:
        fail(f'no provenance-validated frames in {directory}')
    return measured


def load_frame(path):
    """The frame's per-pixel mean code (0..255) plane, rows top-down (r0 = the frame's top
    row), from the PNG's STORED 8-bit codes — Non-Color keeps Blender from transforming."""
    ensure_blender()
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = 'Non-Color'
    width, height = img.size
    channels = img.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    img.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)
    code = plane[:, :, :3].mean(axis=2) * 255.0
    return code[::-1]


def roi(code, box):
    """A declared ROI in fractions; y runs from the TOP of the frame."""
    height, width = code.shape
    x0, y0, x1, y1 = box
    a0, a1 = int(round(x0 * width)), int(round(x1 * width))
    b0, b1 = int(round(y0 * height)), int(round(y1 * height))
    area = code[b0:max(b1, b0 + 1), a0:max(a1, a0 + 1)]
    if area.size == 0:
        fail(f'declared ROI {list(box)} is empty on a {width}x{height} frame')
    return area


def roi_counts(code, box):
    height, width = code.shape
    x0, y0, x1, y1 = box
    a0, a1 = int(round(x0 * width)), int(round(x1 * width))
    b0, b1 = int(round(y0 * height)), int(round(y1 * height))
    area = code[b0:max(b1, b0 + 1), a0:max(a1, a0 + 1)]
    return float(area.sum()), int(area.size)


def mean_code(plane):
    value = float(plane.mean())
    if not math.isfinite(value):
        fail(f'measured a non-finite frame mean ({value!r})')
    return value


def measure_frames(directory, provenance):
    """The provenance-validated frames and their per-pixel mean-code planes."""
    frames = list_measured_frames(directory, provenance)
    codes = {}
    for frame in frames:
        codes[frame['name']] = load_frame(os.path.join(directory, frame['file']))
    return frames, codes


def frame_meta(name):
    """(stop, suffix, state) out of a canonical `g-<stop>-<state>` name."""
    parts = name.split('-')
    stop, suffix = '-'.join(parts[1:-1]), parts[-1]
    return {'name': name, 'state': STATE_BY_SUFFIX[suffix], 'stop': stop, 'suffix': suffix}


def band_status(band_mode, ok, note):
    if band_mode:
        return 'pass' if ok else 'FAIL'
    return f'measured (NON-GATING: no band attached; {note})' if ok else \
        f'measured (NON-GATING: no band attached; {note})'


def symmetry_row(code, meta, band_mode):
    """SYMMETRY rides the FULL declared battery (incl. the rail frames) — every row
    carries frame/camera/state identity."""
    width = code.shape[1]
    cut = width // 2
    gutter = int(round(SYMMETRY_GUTTER_FRAC * width / 2.0))
    left, right = code[:, : cut - gutter], code[:, cut + gutter :]
    left_mean, right_mean = mean_code(left), mean_code(right)
    value = left_mean / right_mean if right_mean > 0.0 else float('inf')
    low, high = RECORDED['symmetryBand']
    in_band = low <= value <= high
    night = meta['state'] == 'nightChandeliers'
    if band_mode:
        status = ('pass' if in_band else 'FAIL') if night \
            else 'report (day/dusk: the band is retired; the declared asymmetry)'
    else:
        status = 'measured (NON-GATING: no band attached)' if night \
            else 'report (day/dusk: the band is retired)'
    note = 'band retained for night only'
    return {
        'camera': meta['stop'], 'deltaToBandLow': round(value - low, 4),
        'deltaToBandHigh': round(value - high, 4), 'frame': meta['name'],
        'retainedBandNote': note, 'state': meta['state'], 'status': status,
        'value': round(value, 4), 'z70Mean': round(left_mean, 4),
        'z76Mean': round(right_mean, 4), 'band': list(RECORDED['symmetryBand']),
    }, band_mode and night and not in_band


def level_row(code, meta, band_mode):
    """LEVEL rides the g-g1-night frame only (declared roster)."""
    mean = mean_code(code)
    dark = float((code < LEVEL_DARK_MAX_CODE).mean()) * 100.0
    clips = float((code >= LEVEL_CLIP_MIN_CODE).mean()) * 100.0
    low, high = RECORDED['levelBand']
    in_band = low <= mean <= high
    return {
        'camera': meta['stop'], 'clipsPct': round(clips, 4),
        'clipsRecordedPct': RECORDED['levelClipsRecordedPct'],
        'darkPct': round(dark, 4), 'darkRecordedPct': RECORDED['levelDarkRecordedPct'],
        'deltaToBandLow': round(mean - low, 4), 'deltaToBandHigh': round(mean - high, 4),
        'frame': meta['name'], 'instrument-roster': 'LEVEL rides the g-g1-night frame only',
        'mean': round(mean, 4), 'state': meta['state'],
        'status': band_status(band_mode, in_band, 'the [55,90] mean band'),
    }, band_mode and not in_band


def order_row(code, meta, band_mode):
    """ORDER rides the day stop frames (declared roster)."""
    field_mean = mean_code(roi(code, FIELD_ROI))
    order_mean = mean_code(roi(code, ORDER_ROI))
    value = order_mean / field_mean if field_mean > 0.0 else float('inf')
    ok = value >= RECORDED['orderFloor']
    return {
        'camera': meta['stop'], 'fieldMean': round(field_mean, 4), 'fieldRoi': list(FIELD_ROI),
        'frame': meta['name'],
        'instrument-roster': 'ORDER rides the day stop frames',
        'orderMean': round(order_mean, 4), 'orderRoi': list(ORDER_ROI),
        'recorded': RECORDED['orderRecorded'],
        'deltaVsRecorded': round(value - RECORDED['orderRecorded'], 4),
        'state': meta['state'], 'status': band_status(band_mode, ok, 'the 1.13 floor'),
        'value': round(value, 4),
    }, band_mode and not ok


def door_row(code, meta, band_mode):
    """DOOR rides the Gj/G1/G2 frames of every state (declared roster). The surround is
    the OUTER box's pixel mass minus the INNER door ROI's own counts (the honest ring)."""
    outer_sum, outer_count = roi_counts(code, DOOR_OUTER_ROI)
    inner_sum, inner_count = roi_counts(code, DOOR_ROI)
    door_mean = mean_code(roi(code, DOOR_ROI))
    ring_sum, ring_count = outer_sum - inner_sum, outer_count - inner_count
    surround_mean = ring_sum / ring_count if ring_count > 0 else float('nan')
    value = door_mean / surround_mean if surround_mean > 0.0 and math.isfinite(surround_mean) else float('inf')
    floor = RECORDED['doorFloorsByState'].get(meta['state'])
    ratio_ok = value >= RECORDED['doorRatioFloor']
    floor_ok = floor is not None and door_mean >= floor
    return {
        'camera': meta['stop'],
        'declaredRing': 'outer box pixel mass minus the inner door ROI (declared in-file)',
        'deltaRatioVsRecorded': round(
            value - RECORDED['doorRatioRecordedByState'].get(meta['state'], 0.0), 4),
        'deltaVsFloor': round(door_mean - (floor or 0.0), 4),
        'doorMean': round(door_mean, 4), 'doorRoi': list(DOOR_ROI), 'floor': floor,
        'frame': meta['name'],
        'instrument-roster': 'DOOR rides the Gj/G1/G2 frames of every state',
        'ratio': round(value, 4), 'ratioFloor': RECORDED['doorRatioFloor'],
        'ratioRecorded': RECORDED['doorRatioRecordedByState'].get(meta['state']),
        'state': meta['state'],
        'status': band_status(band_mode, ratio_ok and floor_ok, 'floors + the 1.35 ratio'),
        'surroundMean': round(surround_mean, 4) if math.isfinite(surround_mean) else None,
        'surroundRoi': list(DOOR_OUTER_ROI),
    }, band_mode and not (ratio_ok and floor_ok)


def junction_row(after_value, before_value, before_baseline):
    """JUNCTION rides the g-g0 frames (declared roster): a recorded print row with the
    after-vs-before delta where a validated baseline frame exists (else an explicit
    'no baseline row'); never a fabricated pass/fail band."""
    row = {
        'camera': 'g0',
        'instrument-roster': 'JUNCTION rides the g-g0 frames of every state',
        'junctionRoi': list(JUNCTION_ROI), 'recorded': RECORDED['junctionRecorded'],
        'deltaVsRecorded': round(after_value - RECORDED['junctionRecorded'], 4),
        'value': round(after_value, 4),
    }
    if before_value is None:
        row.update({
            'baseline': None, 'beforeMean': None, 'deltaVsBefore': None,
            'status': 'record (no baseline row: the before battery lacks this frame)',
        })
    else:
        row.update({
            'baseline': before_baseline, 'beforeMean': round(before_value, 4),
            'deltaVsBefore': round(after_value - before_value, 4),
            'status': 'record (a print, not a band; the before delta is the evidence)',
        })
    return row


def night_plate_row(name, after_code, before_dir, before_provenance):
    """NIGHT-PLATE rides EVERY measured night frame (incl. the rail): the signed mean
    delta + the pixel-move share vs the BEFORE battery's own provenance identity."""
    before_row = before_provenance['okFrames'].get(name) if before_provenance else None
    after_frame = frame_meta(name)
    if before_row is None:
        return {
            'baseline': None, 'camera': f'{after_frame["stop"]} ({after_frame["state"]})',
            'frame': name, 'instrument': 'NIGHT-PLATE', 'meanDelta': None, 'movedPct': None,
            'state': after_frame['state'],
            'status': 'record (no baseline row: the before battery lacks this frame '
                      'or its provenance)',
        }
    before_code = load_frame(os.path.join(before_dir, before_row['file']))
    before_mean = mean_code(before_code)
    after_mean = mean_code(after_code)
    identity = before_provenance['identity']
    return {
        'afterMean': round(after_mean, 4), 'beforeMean': round(before_mean, 4),
        'baseline': (
            'the before battery per its OWN provenance: tree '
            f'{identity["treeHeadSha"]} dist {identity["dist"].get("rel")}'
            f'/glb {identity["dist"].get("glbSha")}'
        ),
        'camera': f'{after_frame["stop"]} ({after_frame["state"]})', 'frame': name,
        'comparisonDomain': 'whole frame; per-pixel |delta| > '
        f'{NIGHT_MOVE_TOL_CODES:g} code',
        'instrument': 'NIGHT-PLATE', 'meanDelta': round(after_mean - before_mean, 4),
        'movedPct': round(
            float((np.abs(after_code - before_code) > NIGHT_MOVE_TOL_CODES).mean())
            * 100.0, 4),
        'state': after_frame['state'],
        'status': 'record (held or moved only after this measurement; the owner reads '
        'the deltas)',
    }


def stop_means(codes, metas, roster=METRIC_ROSTERS['MEANS']):
    """The per-state means over the MEANS roster (the four stop frames; rail excluded)."""
    means = {}
    for name, code in codes.items():
        meta = metas[name]
        if not roster(meta):
            continue
        state = meta['state']
        plane_accum = means.setdefault(state, [])
        plane_accum.append(code)
    if not means:
        fail('the state-mean instrument has no stop frames at all (the MEANS roster is '
             'the four committed stops per state)')
    return {state: mean_code(np.concatenate([code.ravel() for code in planes]))
            for state, planes in sorted(means.items())}


def means_rows(means, recorded_means, band_mode, baseline_label):
    """MEANS rows: per-state means with the recorded references + deltas where a before
    battery exists, then the ordering row (required: night < dusk < day)."""
    state = None
    for state in CANONICAL_STATES:
        if state not in means:
            fail(f'the state-mean instrument has no {state} stop frames in the '
                 'provenance-validated battery')
    rows = []
    for state in CANONICAL_STATES:
        value = means[state]
        row = {
            'instrument-roster': 'MEANS rides the four stop frames per state',
            'instrument': 'MEANS', 'measured': round(value, 4), 'state': state,
        }
        recorded = RECORDED['meansRecordedByState'][state]
        row.update({
            'deltaVsRecorded': round(value - recorded, 4),
            'recorded': recorded,
            'status': 'measured' + (' (the after-only DAY-STOP row owns the 53.15 check)'
                                    if state == 'day' else ''),
        })
        if baseline_label is not None:
            before_value = baseline_label.get(state)
            row.update({'baseline': baseline_label.get('__baseline') if before_value is not None
                        else 'no baseline row',
                        'beforeMean': round(before_value, 4) if before_value is not None else None,
                        'deltaVsBefore': round(value - before_value, 4)
                        if before_value is not None else None})
        rows.append(row)
    ordered = means['nightChandeliers'] < means['dusk'] < means['day']
    ordering_row = {
        'instrument': 'MEANS', 'ordering': list(CANONICAL_STATES),
        'status': band_status(band_mode, ordered, 'the ruled ordering night < dusk < day'),
    }
    rows.append(ordering_row)
    return rows, band_mode and not ordered


def day_stop_row(day_mean, band_mode):
    """THE RULED STOP, its own explicit AFTER-ONLY row (never mislabelled 'record', never
    applied to the before battery)."""
    recorded = RECORDED['meansRecordedByState']['day']
    meets = day_mean > recorded
    return {
        'instrument': 'DAY-STOP', 'instrument-roster': 'an AFTER-ONLY row (gates mode)',
        'measured': round(day_mean, 4), 'required': f'> {recorded} (the recorded day mean)',
        'ruled-stop': 'the ruling §5 stop: day must FAIL mean > 53.15 (the window-led '
        'read) for the round to continue',
        'state': 'day',
        'status': band_status(band_mode, meets, 'the ruled day stop (after-only)'),
    }, band_mode and not meets


def measure_stop_rows(codes, band_mode):
    """The per-frame metric rows (SYMMETRY/LEVEL/ORDER/DOOR) per the declared rosters."""
    rows = []
    failed_rows = 0
    for name in sorted(codes):
        meta = frame_meta(name)
        code = codes[name]
        row, failed = symmetry_row(code, meta, band_mode)
        rows.append(row)
        failed_rows += 1 if failed else 0
        if METRIC_ROSTERS['LEVEL'](meta):
            row, failed = level_row(code, meta, band_mode)
            rows.append(row)
            failed_rows += 1 if failed else 0
        if METRIC_ROSTERS['ORDER'](meta):
            row, failed = order_row(code, meta, band_mode)
            rows.append(row)
            failed_rows += 1 if failed else 0
        if METRIC_ROSTERS['DOOR'](meta):
            row, failed = door_row(code, meta, band_mode)
            rows.append(row)
            failed_rows += 1 if failed else 0
    return rows, failed_rows


def write_out(path, payload):
    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write('\n')


def jsonable(row):
    return {key: (list(value) if isinstance(value, tuple) else value)
            for key, value in row.items()}


def calibrate(opts):
    """Measurement-only: measured values beside the recorded references + the deltas; NO
    pass/FAIL, NO day stop (the owner-acceptance law lives in the module docstring)."""
    provenance = read_provenance(opts['before'])
    frames, codes = measure_frames(opts['before'], provenance)
    rows, _failed = measure_stop_rows(codes, band_mode=False)
    metas = {name: frame_meta(name) for name in codes}
    means = stop_means(codes, metas)
    for state, value in means.items():
        delta_row = {
            'instrument-roster': 'MEANS rides the four stop frames per state',
            'instrument': 'MEANS', 'measured': round(value, 4), 'state': state,
            'deltaVsRecorded': round(value - RECORDED['meansRecordedByState'][state], 4),
            'recorded': RECORDED['meansRecordedByState'][state],
            'status': 'measured (calibration; the day>53.15 stop is an after-only row, '
            'NOT applied to the before battery)',
        }
        rows.append(delta_row)
    payload = {
        'before': opts['before'],
        'frames': sorted(codes),
        'instrument': 'rg-f3 gate calibration (MEASUREMENT-ONLY)',
        'note': ('REPLACEMENT (documented): the predecessor gate instruments were not '
                 'recoverable; these comparators are the declared in-file replacements. '
                 'Every band row prints its measured value, its recorded band/floor, and '
                 'the deltas; NO pass/FAIL is issued here and NO band is accepted or '
                 f'attached. The bands ride gates ONLY after an explicit acceptance step '
                 f'(prior calibration + {GATES_ACCEPTANCE_ENV}=1). Substantive deltas '
                 'go to the owner as NON-COMPARABLE evidence.'),
        'provenance': {'identity': provenance['identity'], 'path': provenance['path']},
        'recorded': {key: (list(value) if isinstance(value, tuple) else value)
                     for key, value in sorted(RECORDED.items())},
        'rows': [jsonable(row) for row in rows],
    }
    out = os.path.join(opts['before'], 'calibration.json')
    write_out(out, payload)
    for row in rows:
        print('rg_gates: ' + json.dumps(row, sort_keys=True))
    print(f'rg_gates: calibration (measurement-only) {len(rows)} rows -> {out}')


def gates(opts):
    accepted = os.environ.get(GATES_ACCEPTANCE_ENV) == '1'
    after_provenance = read_provenance(opts['after'])
    after_frames, codes = measure_frames(opts['after'], after_provenance)
    measured = set(codes)
    roster = after_provenance['battery']
    full = len(roster) == BATTERY_SIZE and all(name in measured for name in roster)
    if accepted and full:
        band_mode = True
        run_class = 'gating (the full 21-roster measured; acceptance recorded)'
    else:
        band_mode = False
        run_class = (
            'NON-GATING ('
            + (f'acceptance {GATES_ACCEPTANCE_ENV}=1 is unset; ' if not accepted else '')
            + f'{sum(1 for name in roster if name in measured)}/{len(roster) or BATTERY_SIZE} '
            + 'of the canonical 21-roster measured)'
        )
    # The baseline battery: JUNCTION/MEANS/NIGHT rows read the BEFORE battery's own
    # provenance identity (never an invented revision label). A missing/unprovenanced
    # baseline degrades ONLY the dependent rows to explicit 'no baseline row' records —
    # the per-frame band rows (validated by the AFTER battery) still gate.
    before_provenance = None
    if os.path.exists(os.path.join(opts['before'], 'provenance.json')):
        before_provenance = read_provenance(opts['before'])
        _before_frames, before_codes = measure_frames(opts['before'], before_provenance)
    else:
        before_codes = {}
    rows, failed_rows = measure_stop_rows(codes, band_mode)
    # JUNCTION rows (the g-g0 frames), with the matching before-frame deltas.
    metas = {name: frame_meta(name) for name in codes}
    before_metas_all = {name: frame_meta(name) for name in before_codes}
    for name in sorted(codes):
        if not METRIC_ROSTERS['JUNCTION'](metas[name]):
            continue
        before_value = None
        baseline = None
        if name in before_codes and METRIC_ROSTERS['JUNCTION'](before_metas_all.get(name)):
            before_value = mean_code(roi(before_codes[name], JUNCTION_ROI))
            identity = before_provenance['identity']
            baseline = (f"the before battery per its OWN provenance: tree "
                        f"{identity['treeHeadSha']} dist {identity['dist'].get('rel')}"
                        f"/glb {identity['dist'].get('glbSha')}")
        rows.append(junction_row(mean_code(roi(codes[name], JUNCTION_ROI)), before_value, baseline))
    # MEANS rows (the per-state stop means) with before deltas handled inside.
    after_means = stop_means(codes, metas)
    before_means = stop_means(before_codes, before_metas_all) if before_codes else None
    means, means_failed = means_rows(
        after_means, RECORDED['meansRecordedByState'], band_mode,
        {'__baseline': (f"the before battery per its OWN provenance: tree "
                        f"{before_provenance['identity']['treeHeadSha']} dist "
                        f"{before_provenance['identity']['dist'].get('rel')}/glb "
                        f"{before_provenance['identity']['dist'].get('glbSha')}",
                        before_means) if before_means and before_provenance else None},
    )
    rows.extend(means)
    failed_rows += 1 if means_failed else 0
    # THE RULED STOP (the explicit after-only row).
    stop, stop_failed = day_stop_row(after_means['day'], band_mode)
    rows.append(stop)
    failed_rows += 1 if stop_failed else 0
    # NIGHT-PLATE rows (every measured night frame, rail included).
    for name in sorted(codes):
        if frame_meta(name)['state'] != 'nightChandeliers':
            continue
        rows.append(night_plate_row(name, codes[name], opts['before'], before_provenance))
    failures = []
    if band_mode:
        if failed_rows > 0:
            failures.append(f'{failed_rows} retained-band row(s) FAILED (see the FAIL rows)')
    # A NON-GATING run issues NO gating verdict and exits 0 by design: its rows are
    # records; the payload + every row carry the NON-GATING label (explicit, not silent).
    payload = {
        'after': opts['after'], 'before': opts['before'],
        'failures': failures, 'frames': sorted(codes), 'runClass': run_class,
        'instrument': 'rg-f3 capture gates',
        'note': ('REPLACEMENT (documented): the predecessor gate instruments were not '
                 'recoverable; the retained bands ride ONLY after calibration + '
                 f'{GATES_ACCEPTANCE_ENV}=1 and on the full 21-roster. JUNCTION, '
                 'NIGHT-PLATE and the NON-GATING measurement rows are records with '
                 'explicit baselines, never silent passes.'),
        'rows': [jsonable(row) for row in rows],
    }
    out = os.path.join(opts['after'], 'gates.json')
    write_out(out, payload)
    for row in rows:
        print('rg_gates: ' + json.dumps(row, sort_keys=True))
    print(f'rg_gates: {run_class}; {len(rows)} rows -> {out}; failures={len(failures)}')
    if failures:
        raise SystemExit(f'rg_gates: {len(failures)} failure group(s)')


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else sys.argv[1:]
    mode, opts = parse_args(argv)
    if mode == 'calibrate':
        calibrate(opts)
    elif mode == 'gates':
        gates(opts)


if __name__ == '__main__':
    main()
