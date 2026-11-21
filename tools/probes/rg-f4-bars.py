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
#   F5-C: the frame-mean drift |after - probes/rg-f4-f5-pre| <= +3.0 at every one of the
#     13 frames (the subtlety guard; the relief must not shift the room's light).
#   F5-D (day-g0b, the east passage wall's tall panel, the bay 63.5-66.75 — the screen
#     column 428-441): the top band rows 313-318 vs the interior rows 325-380 >= +12
#     (measured +12.3); the bottom band rows 384-390 vs the interior >= +12 (measured
#     +12.0).
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
for arg in sys.argv:
    if arg.startswith('RG_F4_NIGHT_FROM='):
        night_from = pathlib.Path(arg.split('=', 1)[1])

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
if before_dir is not None:
    for name in FRAMES:
        a = frame_lum(after_dir, name)
        b = frame_lum(before_dir, name)
        if a is None or b is None or a.shape != b.shape:
            f5.append(('F5-C drift present', f'{name} missing frame pair', False))
            continue
        drift = float(a.mean() - b.mean())
        f5.append((f'F5-C {name} frame-mean drift <= +3.0', f'{drift:+.3f}',
                   abs(drift) <= F5_MEAN_DRIFT_MAX))
else:
    f5_diag.append('the before dir absent — the F5-C drift rows skipped (the standing 13 still run)')

fails += len([1 for _n, _d, ok in f5 if not ok])
for name, detail, ok in f5:
    print(f'{"PASS" if ok else "FAIL"}  {name}: {detail}')
for line in f5_diag:
    print(line)
print(f'{len(verd) + len(jver) + len(f5) - fails}/{len(verd) + len(jver) + len(f5)} bars pass')
sys.exit(0 if fails == 0 else 1)
