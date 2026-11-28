# tools/bpy/bake.py — round 17a: Cycles headless lightmap bake + ADR-0013 probe (bake side).
# Extended in Phase 3 R4 (Slice A): the two-chart bake contract (D-13) — a builder may
# declare LM_CHARTS ({arch: {res, pad}, kit: {res, pad, objectPrefixes}}) and every chart
# bakes ONCE per state as a multi-object selection bake; per-room tables for the pane
# swap (PANE_MATERIALS), the dusk fixtures (DUSK_FIXTURES), the pane paint (PANE_PAINT,
# D-4/D-23) and the per-state white points (the scalar row stays legal for the siblings).
#
# Implements docs/design-staircase.md
#   §3.2  bake row: Cycles CPU, OIDN denoise, <= 2K, sample cap, one Blender process per state;
#         wall time is measured by tools/bake.mjs around this process (no clock reads here).
#   §3.3  committed layout: lm/day | dusk | night and probe/dusk — written here as LDR PNG
#         intermediates (+ never-committed EXRs); tools/bake.mjs turns them into ktx2.
#   §4    three light states baked independently with absolute brightness; LDR encode is
#         clamp(linear / whitePoint, 0, 1) against ONE per-room white point that the manifest's
#         lightmaps.intensity restores at runtime (17b). The lightmap is irradiance only.
#         R4: the white point may be a per-state dict (the r17c law's encode side).
#   §5 / ADR-0013 (amended): one static dusk probe per room, Cycles panorama camera, committed
#         as a single equirectangular 512x256, white point 1.0 (absolute LDR clamp).
#         R4 D-6: the probe restores the rig's fixtures to FULL for its render only.
#
# Invocation — the room-builder grammar plus --state:
#   blender -b --factory-startup -noaudio -P tools/bpy/bake.py -- \
#     --room <rastrelli-gallery|jordan|military-gallery> \
#     --state <day|dusk|nightChandeliers> --out <stage> [--preview]
#
# State law (declared once, applied in main):
#   day               sun lamp at the +15 deg plateau, neutral-white world, fixtures OFF,
#                     panes swapped to transmissive glass (in-bake only, glb untouched).
#   dusk              no sun (the -6.6 deg one-hot centre is below the horizon), dim neutral
#                     world with a north horizon glow, fixtures ON by room table, panes
#                     swapped, probe rendered (fixtures restored to FULL for the probe only).
#   nightChandeliers  black world, no sun, fixtures ON — emission is the only light; panes
#                     NOT swapped (their dark glass faces the candelabra's bounce).
# Bake law: target = the committed 'lm' UV layer; DIFFUSE with DIRECT+INDIRECT, COLOR off.
# One bake CALL per chart per state: the chart's objects are selected together and baked
# in a single bpy.ops.object.bake (the 1812 kit's 670 objects never pay 670 calls).
# Instanced template meshes bake once (first instance by name): the lm cells live on the shared
# mesh data, so every instance would overwrite the same cells.
# Determinism law: fixed Cycles seed, CPU device, no randomness, no clock reads, sorted-key JSON,
# locale-independent output. The committed glb is never read or written here.
#
# D1 (jordan slice 2): WHITE_POINT['jordan'] = 'percentile' is a SENTINEL, not a float —
# jordan's lm charts bake EXR ONLY (the stage's denoised EXR + the builder's OWN cells.json
# via ZIMNY_BAKE are the deliverables; NO bake-time jordan lm LDR PNG/ktx2), while the PROBE
# keeps its committed encode at PROBE_WHITE_POINT. The encode/publication side belongs to
# tools/lm-percentile.mjs + tools/reencode.mjs (--transfer srgb). The order law splice per
# state: build -> pane swap (day, dusk) -> capture_fixtures -> PANE_BAKE_EMISSION +
# FIXTURE_BAKE_STRENGTH (absolute overrides, capture/restore-safe) -> the lamp rig
# (RIG_STATE_SCALE scale > 0 only) -> add_sun (day) -> world -> bake -> the dusk probe.
import argparse
import hashlib
import json
import math
import os
import sys
import traceback
from pathlib import Path

import bpy
import numpy as np
import mathutils.geometry
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOMS = ('rastrelli-gallery', 'jordan', 'military-gallery', 'st-george')
STATES = ('day', 'dusk', 'nightChandeliers')
STATE_ALIASES = {'night': 'nightChandeliers'}
STATE_FILE = {'day': 'day', 'dusk': 'dusk', 'nightChandeliers': 'night'}
LM_UV_LAYER = 'lm'
BPY_DIR = Path(__file__).resolve().parent

# ---- Declared numbers (FILL: the orchestrator tunes these from the first real bake logs) ----
# Directions are in the glTF/three frame (+X east, +Y up, +Z south), unit, pointing TO the sun.
DAY_SUN_DIR = (0.9016, 0.2591, -0.3463)      # FILL: +15 deg plateau, 2026-06-22 06:18 UTC+3
DUSK_WORLD_DIR = (0.0000, -0.1150, -0.9930)  # FILL: -6.6 deg one-hot centre, 00:50 UTC+3
SUN_STRENGTH = {  # per-room (jordan 2c: the sun's G-cut 4.0→3.5 was REVERTED by the capture read — the walls' bounce is sun-fed (the swap glass throttles the sky), the −12% sun dropped the wall fields ~10 points below the committed frame)
    'rastrelli-gallery': 4.0,
    'jordan': 4.0,
    'military-gallery': 4.0,
    # st-george registration: the siblings' committed row (the sun through the swapped
    # glass panes is the day driver; the golden sitting re-tunes from the bake logs).
    'st-george': 4.0,
}
SUN_ANGLE_DEG = 0.53      # solar disc
# Per-room world strengths (jordan 2c: the day sky lift + the dusk sky-led read); the
# siblings carry their former global row byte-for-byte.
WORLD_STRENGTH = {
    'rastrelli-gallery': {'day': 1.0, 'dusk': 0.08, 'nightChandeliers': 0.0},
    'jordan': {'day': 4.0, 'dusk': 0.30, 'nightChandeliers': 0.0},  # 2c: sky-led dusk; the TRUE sky coefficient measured 0.10/unit at the plate's p50 (the brief's 0.254 was poisoned by the RIG_STATE_SCALE gate-only bug — dusk#1 carried the full rig); 0.30 targets stored p50 ≈ 82 inside the reply's 70-90 gate after the ETC1S q128 dark-median loss (~-16 at stored ~70, measured dusk#2-encode vs its EXR dry row)
    'military-gallery': {'day': 1.0, 'dusk': 0.08, 'nightChandeliers': 0.0},
    # st-george registration: the siblings' neutral row (day sky + sun through the
    # swapped glass; dim dusk horizon; night is a black world — the window-light emission
    # bounce and the chandelier-flame slot (S2, ABSOLUTE 12.0) are the state's lights).
    'st-george': {'day': 1.0, 'dusk': 0.08, 'nightChandeliers': 0.0},
}
DUSK_GLOW_GAIN = 0.25     # FILL — new default; MASKED-IN-BRIEF: keep the DUSK_GLOW_GAIN value
DUSK_GLOW_POWER = 4.0     # FILL — new default; MASKED-IN-BRIEF: keep the DUSK_GLOW_POWER value
BAKE_SAMPLES = 128        # FILL — new default; MASKED-IN-BRIEF: keep the BAKE_SAMPLES value
PROBE_SAMPLES = 256       # FILL — new default; MASKED-IN-BRIEF: keep the PROBE_SAMPLES value
BAKE_MARGIN_PX = None     # FILL — None = the chart's own pad; MASKED-IN-BRIEF: keep the value
# FILL — the encode white point per room: a scalar (the siblings' committed rows), a
# per-state dict (1812's r17c law; Block 2's WHITE_POINT_1812), or the jordan slice 2's
# 'percentile' SENTINEL (D1: the sentinel says the encoder is lm-percentile, not this bake).
WHITE_POINT = {
    'rastrelli-gallery': {'day': 0.8, 'dusk': 0.8, 'nightChandeliers': 0.8},
    'jordan': 'percentile',
    'military-gallery': {'day': 1.5, 'dusk': 0.15, 'nightChandeliers': 0.3},
    # st-george registration: the military-gallery shape (numeric per-state values, never
    # the 'percentile' sentinel). The row mirrors ROOM.lightmaps.intensity in
    # tools/gltf/st-george.mjs (the lightmapsRow agreement gate compares them state by
    # state); owner re-tune data at the golden sitting.
    # WHITE_POINT — the st-george row: PROVISIONAL seeds after the S2+S3 shell bake; rule:
    # each state's wp = the first 0.01 step >= 1.04 x its measured peak, written to BOTH
    # tables (tools/gltf/st-george.mjs ROOM.lightmaps.intensity mirrors it; the
    # lightmapsRow agreement gate compares state by state); gains stay 2/2/2; the golden
    # sitting re-tunes.
    'st-george': {'day': 2.09, 'dusk': 0.46, 'nightChandeliers': 1.07},
}
PROBE_WHITE_POINT = 1.0   # pinned by ADR-0013: "neutral" = absolute LDR clamp
PROBE_RES = (512, 256)    # pinned by the ADR-0013 amendment (equirect)
# FILL — glTF frame; gallery ~ the passage end, jordan ~ under the vault centre,
# 1812 = the room midpoint at eye height (Block 2's PROBE_POINT_1812).
# MASKED-IN-BRIEF: keep the PROBE_POINT values
PROBE_POINT = {
    'rastrelli-gallery': (0.0, 1.7, 80.0),
    'jordan': (79.0, 9.0, -74.0),
    'military-gallery': (86.25, 11.7, -12.5),
    # st-george registration: the hall's centre stop eye (glTF frame; the law's
    # X0..X0+48 centre, FLOOR_Y 10 + the eye height, AXIS_Z 14.5).
    'st-george': (114.5, 11.65, 14.5),
}
PROBE_YAW_DEG = 0.0       # FILL — aligned against three's equirect convention in 17b
# FILL — per-room pane material names for the committed swap law (D-13's table;
# MASKED-IN-BRIEF: keep the committed names). RG-F3 (the ruling's pane-family record):
# RG deliberately retains an empty PANE_MATERIALS row: its declared pane geometry bypasses
# pane swapping and pre-scan emission. Material 'pane' receives its separate emission only
# after emitter classification and fixtures-off.
PANE_MATERIALS = {
    'rastrelli-gallery': (),
    'jordan': ('pane',),
    'military-gallery': ('MG_glass',),
    # st-george registration: the emissive window panes are the hall's daylight source
    # in the bake — day/dusk they swap to glass (camera-ray glass, shadow/diffuse
    # transparent) so the sun and sky enter; nightChandeliers keeps them unswapped
    # (their authored emission is the state's light, the chandeliers being absent).
    'st-george': ('window-light',),
}
# R4 D-3: the dusk rig's fixtures per room — False composes the candelabra third at
# re-encode time (tools/lm-recipes.mjs) instead of baking a third-emission rig.
# st-george registration: False — the hall has NO fixtures this round (the chandeliers
# are absent), so dusk runs the fixtures-off law and the dusk probe's
# capture_fixtures/restore_fixtures pass no-ops safely over the builder's only
# emission material (the window panes, restored to their authored strength for the
# probe). No fixture roster exists to loop; RIG_STATE_SCALE carries no row, so no
# rig is ever built for the room.
DUSK_FIXTURES = {'rastrelli-gallery': True, 'jordan': True, 'military-gallery': False,
                 'st-george': False}
# R4 D-4/D-23: the lantern glazing's patch cells are PAINTED with the state's sky colour
# (linear, bake units) after OIDN and before the LDR encode, into the surviving denoised
# EXR — reencode.mjs and the compose law see the paint as bake content. The part names the
# architecture-chart patches whose cells are painted (arch chart only).
# RG-E1: rastrelli-gallery's stairlight (the lunette back quad above the east door) carries
# the same three published-state colours — but this room's states are COMPOSED of rig EXRs
# (tools/lm-recipes.mjs), so a bake-time paint would ink only one rig term per plate. The
# paint application therefore runs at ENCODE time, per published state, in
# tools/reencode.mjs (staged summary lm.patches carries the atlas rect); 'atEncode': True
# keeps THIS table the declared colour record while gating the bake-time application.
# The military-gallery row keeps firing here exactly as committed.
# RG-DOORWAY-READS (the G2 glare law, the accepted brief-2 reply §2.3 — the DECLARED record
# twin; the machine source + the gradient live in reencode.mjs GLARE_* / reencode-paint.py
# glare_field, kept in sync by law): per part and state value(u,v) = tint_s × L_s × (EDGE +
# (1 − EDGE) × falloff(centre→rect edge)), EDGE 0.55, the smooth cos² window; the lunette
# shares the card's law. Per state: DAY neutral daylight at L_DAY (the ONE dial, turned at
# G2 — landed at 1.1; the pale end-wall texel beside the card reads plate lum 0.3566).
# The contrast domains, recorded apart (the review finding, 2026-11-13 — the pre-encode
# ratio alone was NOT rendered proof): pre-encode paint ratio 1.1/0.3566 = 3.08× (the dial's
# setup arithmetic); encoded scene-linear 0.8/0.3566 = 2.24× (the card's core clips at the
# 0.8 wp → stored 1.0, decoded 0.8 — the FORMAT's ceiling at this wall plate); display
# (AgX at eff 1.6, measured off the captures) day 1.77× / dusk 1.52× / night 1.39×; the
# night light-domain read 0.87× — the owner's eye pending. The floor puts the centre above
# the 0.8 white point on purpose — the card renders at the atlas's expressible ceiling, the
# cos² fall survives in the outer band. DUSK the stair's sconce tint at 0.35 of day; NIGHT
# the chandelier tint
# at 0.25. The triples below are the law's CENTRE values (tint × L_s); the falloff falls
# smoothly to EDGE × them at each rect's rim. The old flat triples (the verdict's law and
# the owner-ratified ×1.14 screen-side calibration) are SUPERSEDED — the ×1.14 was the
# G1-distance calibration; the dial is G2-first now.
PANE_PAINT = {
    'military-gallery': {
        'part': 'lantern_glazing',
        'day': (0.20, 0.23, 0.28),           # cool skylight
        'dusk': (0.05, 0.06, 0.09),          # the dusk sky colour (blue-grey)
        'nightChandeliers': (0.004, 0.005, 0.008),  # dark glass with a faint sky memory
    },
    'rastrelli-gallery': {
        'atEncode': True,
        'part': 'stairlight',
        'day': (1.049677, 1.106527, 1.183982),
        'dusk': (0.514242, 0.365956, 0.194455),
        'nightChandeliers': (0.371666, 0.260296, 0.136386),
    },
}
# RG-F2 verdict 2.2: the bake-only stage spill on the shell's stairlight slot — applied
# in ALL THREE rigs regardless of fixtures_off; the glb export stays strength 0.0
# (the builder's flat emission) — this is the declared record + the rig source.
STAGE_SPILL = {
    'rastrelli-gallery': {
        'colours': {
            'day': (0.82, 0.86, 0.92),
            'dusk': (1.0, 0.80, 0.58),
            'nightChandeliers': (1.0, 0.80, 0.58),
        },
        'strengths': {
            'day': 0.6,
            'dusk': 0.4,
            'nightChandeliers': 0.4,
        },
    },
}
# RG-F3 (the ruling's spill record): the legacy door STAGE_SPILL record above is
# unchanged. Parallel per-material rows add pane spill post-scan; pane proof distinguishes
# nonzero application from declared-and-verified zero. Applied at the SAME insertion
# point as apply_stage_spill (AFTER the emitter scan, AFTER the fixtures-off law) in all
# three rigs; never registered in the pre-scan PANE_BAKE_EMISSION path, never fed to the
# swap or the pane_rects machinery (the room's PANE_PAINT row keeps 'atEncode': True).
# First-bake constants were FIXED (the RG-F3 ruling's constants block): every colour and
# the strength decrease day -> dusk, so every effective emitted channel decreases too; night
# is the declared zero. The published pane-cast weights stay 1/1/0 under the unchanged
# compose law.
# RG-F4 (the ruling's dial): the pane row IS the room's PANE_EMISSION dial — the z=70
# declared panes' bake-only emission {day, dusk, night = 0}. RG-F3's first-bake strengths
# (0.020/0.006) emitted ~nothing (the fresh 13-frame battery: the §1.4 courtyard-led day
# undelivered — floor/vault/z=76 state-identical at G1); the strengths are raised at the
# bench until the G1 state-delta bars hold (B1 floor +20 day, B3 vault +8). The colours
# and the day>dusk ordering stand; night stays the declared zero.
STAGE_SPILL_PARTS = {
    'rastrelli-gallery': {
        # RG-F4 dial: the strengths below are the bench's current values (day 2.7 /
        # dusk 0.9; iter 1 1.0/0.15 → B1 day +11.0; iter 2 2.0/0.9 → +17.6; iter 3 2.4 →
        # +19.8 of ≥ +20 — the response compresses sublinearly; iter 4 crosses it).
        'pane': {
            'day': ((0.82, 0.86, 0.92), 2.7),
            'dusk': ((0.70, 0.55, 0.38), 0.9),
            'nightChandeliers': ((0.0, 0.0, 0.0), 0.0),
        },
        # THE STOCK-TAKE EMITTER ROW (the 2026-11-24 bake artifact, EMITTER ROW + VALUES +
        # TUNE): the displaced doorcard twin (the builder's tag 'doorcard', one face,
        # one-sided toward -x - at export into the 2.6 m threshold box, at bake into the
        # room from the x = 44 wall plane) joins the spill set beside 'pane'. The key is a
        # PART name, not a material - the card shares its 'stairlight' material with the
        # lunette, and only the card lights - so apply_stage_spill_parts resolves it
        # through the builder's LM_FACE_ELEMENTS roster and splits the card's polygons onto
        # their own material slot (bake-scene-only; the glb's slots stay 0..7). The row's
        # colours: the pane's own per state for day/dusk; night = the rig's sconce colour
        # (the builder's SCONCE_GLOW_RGB (1.0, 0.72, 0.42)), the lamp family the room
        # already burns. The strengths: the seeds - the pane's x 1.35 (the DOOR bands' own
        # floor ratio), rounded; night starts low and is STRUCK TO 0.0 if the card's night
        # frame is not brighter than the wall round it.
        # COMPOSE TRAP (the artifact's fix, the divide form): the nightChandeliers source
        # publishes at GALLERY_LAMP_SCALE k (tools/lm-recipes.mjs, k = 3) in EVERY recipe -
        # day k, dusk k-1, night k - so a door term baked into it multiplies by k. The row
        # enters the seed DIVIDED by k: the published night reads the seed
        # (0.3 / 3 = 0.1 below), and the day/dusk leak shrinks x k. The recipes gain no
        # term: the file's ComposeTerm sources resolve to the three rig EXRs, so a
        # door-only {source, scale: 1} term has no source to resolve.
        # TUNE, on the bench, not on the bake: at most three low-sample runs of the east
        # two bays per state (seed, x 1.5, x 0.67; the response is sublinear, as the pane's
        # comment records). Take the lowest strength at which SPILL reads (gates), and stop
        # while the DOOR ratio holds >= 1.40 on the bench - the spill lights the door's own
        # surround, so it spends the DOOR margin. Enter the chosen figures here (a
        # day/dusk strength as-is; a night strength divided by k), and the bench numbers
        # ride this comment. BENCH NUMBERS: (the seeds; none tuned yet)
        'doorcard': {
            'day': ((0.82, 0.86, 0.92), 3.6),
            'dusk': ((0.70, 0.55, 0.38), 1.2),
            'nightChandeliers': ((1.0, 0.72, 0.42), 0.1),   # the seed 0.3 / k 3
        },
    },
}
CYCLES_SEED = 0
MAX_BOUNCES = 8
DIFFUSE_BOUNCES = 4
GLOSSY_BOUNCES = 4
TRANSMISSION_BOUNCES = 8
TRANSPARENT_BOUNCES = 8
SAMPLE_CLAMP_INDIRECT = 10.0
DENOISER = 'OPENIMAGEDENOISE'
PREVIEW_SAMPLES = 32       # the layout-check path: quarter res, a fraction of the samples
# R4: the emitters' cells stay clear, per room — a LOOK law (see emissive_objects:
# the bound-arm control probe16 showed the ray tree rides identically either way, so
# this is not a transport mechanic). 1812 declares True: its glow is runtime material
# emission (F11). The siblings keep False: their committed bakes had the fixtures
# selected and bound with their cells baked (O10), and a future sibling rebake must
# reproduce that committed shape byte-stably until the owner re-adjudicates.
# RG-E1 re-adjudication for THIS room's re-bake: rastrelli-gallery joins True — the sconce
# glow's cells stay clear and the warm colour is runtime material emission; the earlier
# siblings-keep-False byte-stability note no longer covers a room that re-bakes its
# architecture (RG-E1 rebuilds the shell), and the sconce albedo is near-black iron.
# st-george registration: True — the same look law (F11) through the existing mechanism:
# the window-light panes' glow is runtime material emission (the glb's emissiveFactor),
# never bake content, so their cells stay clear when they are LIVE emitters. The scan is
# per state: day/dusk the swapped glass panes carry no emission, so nothing is excluded
# and the cells bake; nightChandeliers the unswapped panes are live and their cells stay
# clear (the walls still record the bounce).
EMITTER_EXCLUSION = {'military-gallery': True, 'rastrelli-gallery': True, 'st-george': True}

# ---- D1 (jordan slice 2): the per-room outcome tables — every other room keeps the
# exact committed path (absent room row = the room is not in the table) --------------

# B (D1): an absolute Emission override on the pane material, applied AFTER the swap and
# the capture (restore law untouched). day/dusk None = skip: the swap rebuilds the pane
# tree WITHOUT an Emission node (no bake vehicle; the swap + world carry the window
# light); night carries the real pane term as rgb + strength.
# st-george: the swap is SKIPPED (the row below) — the law's wall grid seals every window
# aperture 2.4 cm behind its pane (the seal probe's ray sequence: balcony-stone ×2 ->
# window-light -> wall-marble @ 0.024 m -> sky), so swapped glass transmits nothing and
# the sun/world rows stay inert registration data. The design's own words: 'the emissive
# window panes are the hall's daylight source' — the hall keeps the authored pane emitters
# in every state and carries the state brightness here. The aperture cut rides a future
# round (DECISION-1, amendment 11); the values are the owner's re-tune data at the sitting.
PANE_SWAP_DAY_DUSK = {'st-george': False}
PANE_BAKE_EMISSION = {
    'st-george': {
        'day': ((0.880, 0.830, 0.700), 15.0),
        'dusk': ((0.980, 0.620, 0.340), 3.0),
        # nightChandeliers: None — the authored pane emission (strength 1.0) IS the night
        # state; the authored tree stands unswapped at night, the override skips.
        'nightChandeliers': None,
    },
    'jordan': {
        'day': None,
        'dusk': None,
        'nightChandeliers': ((0.10, 0.12, 0.18), 0.3),
    },
}
# C (D1): absolute per-material Emission Strength overrides (replaces the blanket
# fixtures-off law for a table room: the table covers the room's glow chips). The
# capture/restore law stays byte-compatible — the overrides ride ON TOP of the captured
# values, so the dusk probe restores the AUTHORED glb strengths with the rig left on.
FIXTURE_BAKE_STRENGTH = {
    # jordan 2c — ABSOLUTE strengths (apply_fixture_bake_strength REPLACES the authored
    # value; bake.py:459-479). The reply's multiplier table is corrected to intent under
    # the true semantics: night keeps the committed baked chips exactly (1.0); dusk rides
    # the rig's ×0.1 step off the normalized authored 1.0.
    'jordan': {
        'sconce_glow': {'day': 0.0, 'dusk': 0.1, 'nightChandeliers': 1.0},
        'chandelier_glow': {'day': 0.0, 'dusk': 0.1, 'nightChandeliers': 1.0},
    },
    # st-george S2 (pp4c/pp4d) — ABSOLUTE, apply_fixture_bake_strength REPLACES the authored 1.0: day 0.0 (daylit wax,
    # the sun is the day), dusk 1.0 (the first glow under the amber panes' 3.0), night 12.0 (~16 m2 of candle+flame
    # faces x 12 ~ the night panes' 1.0 x 200 m2 — the night field roughly doubles; the wp seed below follows).
    'st-george': {
        'chandelier-flame': {'day': 0.0, 'dusk': 1.0, 'nightChandeliers': 12.0},
    },
}
# C (D1): the lamp rig lights a state only where its scale is > 0 (jordan day bakes with
# no rig — its light is the sun).
RIG_STATE_SCALE = {'jordan': {'day': 0.0, 'dusk': 0.1, 'nightChandeliers': 1.0}}  # 2c: the parked dusk knob taken
# D (D1): the per-template lm representative law for instanced props — 'first' keeps the
# committed deterministic-first-object selection; jordan's 'centroid' picks the instance
# nearest the roster's centroid.
BAKE_TEMPLATE_INSTANCE = {'jordan': 'centroid'}
# The layout-identity law (rastrelli-next round 4): the shelf-law rooms whose builder writes
# its lm block to ZIMNY_LM_LAYOUT_OUT under ZIMNY_BAKE=1; bake.py asserts that layout equal
# to the export stage's summary.lm before any bake op and records its hash in the state's
# sidecar. Every other room is untouched by the law (cross-room byte-safety: no file is
# required of their builders, no new summary row lands in their printed summaries).
LM_LAYOUT_LAW_ROOMS = ('rastrelli-gallery',)

# ---- RG-AUDIT «THE JUNCTION LAW» (batch B): the S2A (Selected-to-Active) pass table ---------
# The accepted verdict + the S0 amendments' design contract, wired for rastrelli-gallery.
# Every other room (and the night state) keeps the exact committed flat path: absent from
# these tables = byte-identical behaviour, the standing sibling law.
#
#   * STATES_S2A = {day, dusk} ONLY. The night bake runs the committed flat path on the new
#     UVs (re-parameterization only — NO S2A, no proxies visible). A recorded ruling (O4):
#     the night relief stays owner-gated; do not extend S2A to night.
#   * Targets and their assigned proxies (RECONCILED against the geometry when wiring; a
#     target with no proxies, an unknown proxy, or a target naming no shell faces fails
#     loud — a silent empty write would publish a corrupted relief):
#       arch            <- junction.rib_coves + junction.springers
#       vault.gallery   <- junction.rib_coves + junction.cornice_coves
#       vault.reveal    <- junction.rib_coves
#       vault.passage   <- junction.impost_coves
#       ressaut         <- junction.springers
#       cornice         <- junction.cornice_coves
#       impost          <- junction.impost_coves
#     The reconciliation notes (each checked against the proxy host pairs):
#       - vault.passage rides the IMPOST coves: their W/E runs' corner lines ARE the passage
#         vault's own spring edges (the builder's build_impost_coves), and the rib coves
#         never leave the gallery (G_ARC at the pilaster ring planes) — the literal
#         rib_coves row cannot reach that vault. This matches the S0 CAGE fits row
#         ('vault.passage': the impost cove radius fits its 0.06 cage).
#       - vault.gallery carries the cornice coves: the long-wall runs' vault-side tangent
#         bands ARE the gallery vault's spring facets (the first/last row of every bay), so
#         the cornice crease must read on the vault side too (the verdict's binding seats:
#         cornice + the vault.gallery bay field). The SPRINGERS do NOT ride vault.gallery:
#         the blocks' tops poke through the vault's spring facets over their full seat
#         depth (the top 3.30 vs the facet 3.00..3.2451 from the wall to the foot line),
#         so a vault texel's catch line pierces the block's solid near the wall — its ray
#         samples the block's buried back face or its flush underside (dark/bright bands
#         inside lit bay cells). The springer relief rides the ARCH bake instead (the ring
#         faces' spring wedges catch the blocks' room-facing sides legitimately) and the
#         RESSAUT bake (the seats).
#       - the tympanum faces beside the end-wall cornice runs and the north impost run are
#         NOT S2A targets (absent from the table) — their cells keep the committed flat bake.
#   * FLUSH-COVERED FACES (the write-region reconciliation): a target face whose CATCH line
#     (origin = the face centre offset cage along the normal, direction -normal) pierces
#     one of the pass's proxies through a BACK face within the cage band is EXCLUDED from
#     the pass's write: the springer blocks fill the ressaut seat wings EXACTLY (the S0
#     flush fact), so the seat faces' catch lines start inside the blocks and would sample
#     enclosed dark faces — the pass keeps the committed flat base for them instead (the
#     seats are runtime-invisible: the blocks cover them, never exported). The exclusion
#     is measured per pass and rides the summary's s2a provenance.
#   * CAGE per target = the S0 D3 table (tools/probes/rg-sightline.py cage mode), pinned:
#     arch 0.0885, vault.gallery 0.0885, vault.reveal 0.09, cornice 0.04, ressaut 0.03,
#     impost 0.06, vault.passage 0.06; max_ray_distance 0.35 rides every target.
#   * WRITE ORDER (the fail-loud last-writer semantics): per state, the atlas's FIRST write
#     is the committed FLAT bake (use_clear=True — byte-identical to the committed law);
#     the S2A passes then run in the FIXED order below, each with use_clear=False, writing
#     ONLY its own target's cells (the non-target lm UVs are collapsed to (-1,-1) for the
#     pass and restored right after — the collapse_frame_backfaces precedent). The pass
#     write sets are DISJOINT by construction (one element set per pass, one pass per
#     element), so every cell's last writer is either its owning S2A pass or the flat base;
#     the EXTEND margins may bleed into neighbouring pads (never sampled: the pad law keeps
#     every mapped cell >= 2 px inside its allocation), exactly as the committed flat bake.
#   * Per pass: selected = {a coincident COPY of the target mesh (the same mesh data, the
#     same transform — the ray-catch backdrop) + the proxies assigned to that target};
#     active = the target (the shell, unselected — the scratch-validated S2A mechanics: an
#     unselected active receives the bake; the catch BVH = the selected set; a catch MISS
#     keeps the prior texel value — measured on the bench).
#   * Proxy visibility: the proxies live in the builder's BAKE_PROXIES collection with
#     hide_render=True; each pass flips its own proxies' hide_render (their light transport)
#     AND selects them (the catch BVH), then restores exactly. The committed flat path (the
#     night bake, the siblings) never sees them: hidden AND deselected there.
S2A_ROOM = 'rastrelli-gallery'
S2A_STATES = ('day', 'dusk')
S2A_MAX_RAY_DISTANCE = 0.35
S2A_WRITE_ORDER = ('flat base use_clear=True -> arch -> vault.gallery -> vault.reveal -> '
                   'cornice -> ressaut -> impost -> vault.passage (each pass use_clear=False, '
                   'its own writable target cells only; the flush-covered + corner-seam '
                   'excluded faces keep the flat base)')
S2A_TARGETS = (  # the fixed pass order (the S0 probe's S2A_TARGETS declaration order)
    ('arch', 0.0885, ('junction.rib_coves', 'junction.springers')),
    ('vault.gallery', 0.0885, ('junction.rib_coves', 'junction.cornice_coves')),
    ('vault.reveal', 0.09, ('junction.rib_coves',)),
    ('cornice', 0.04, ('junction.cornice_coves',)),
    ('ressaut', 0.03, ('junction.springers',)),
    ('impost', 0.06, ('junction.impost_coves',)),
    ('vault.passage', 0.06, ('junction.impost_coves',)),
)
#   * CORNER-SEAM EXCLUSION (batch C; the census-derived seam-face table): the S2A write's
#     remaining defect class (the B5 miss census, tools/probes/rg-relief-miss.py): the bay
#     cells' spring-edge texels' CATCH rays cross the cornice-top pocket and read its
#     enclosed darkness. They HIT — the backdrop works; the ray GEOMETRY crosses the
#     pocket — so neither the cage nor the denied subset-backdrop form can fix it. The
#     faces whose texels went sub-0.002 (luminance < 0.002) inside lit islands
#     (island-mean > 0.02) are EXCLUDED from the pass's writable set (the flush-covered
#     path's precedent above): their cells keep the committed flat base, the crease still
#     reads everywhere else.
#     THE DERIVATION (the census's per-face map on the batch-B chain run 1 plates —
#     the probe reproduced the record's day 10,822 / dusk 10,058 miss texels exactly):
#     the day ∪ dusk offending faces ON S2A TARGETS = 52 —
#       cornice 28 (the long-wall back-band runs, both walls, at the roster's ~7-stride
#         seats + the end-wall piece 4509; the day-only members are the run's dimmer-end
#         faces whose dusk islands fall below the lit threshold — the union covers both),
#       vault.gallery 23 (the bay spring-edge pairs at the roster's stride-8 seats,
#         3744..3825, + the corner face 3832; the SAME 23 faces offend in both states),
#       impost 1 (3715, dusk-only; the day impost wrote clean).
#     THE STOCK-TAKE RE-DERIVATION (the 2026-11-24 raised roster, probes/s2a-rederive.py +
#     probes/s2a-match.py): the geometry transaction re-rowed the arcs (G_ARC_SEGS 8 -> 16,
#     ARCH_SEGS 8 -> 16, NICHE_HEAD_SEGS 8 -> 16, LUNETTE_SEGS 8 -> 24) and re-partitioned
#     the walls (wall.field 1640 -> 2892, wall.e 119 -> 181, niche 858 -> 1386, arch
#     110 -> 198, doorcase 16 -> 32), so every pinned index shifted by the inserted faces'
#     counts BEFORE it in the roster. THE IDENTITY LAWS, per part:
#       cornice / impost (+0 faces, unchanged geometry): the SAME PHYSICAL FACES proved by
#         EXACT welded-corner-key identity (28/28 and 1/1) — the runs only shift:
#         runs (844..930, 2655..2741, 4504..4531) -> (1470..1556, 4171..4257, 6530..6557),
#         impost 3711..3728 -> 5491..5508.
#       vault.gallery (96 -> 192, 12 bays x 8 -> x 16 rows): the pins are the BAY
#         SPRING-EDGE QUADS AT THE ARCH FEET — each interior arch's (bay b last quad,
#         bay b+1 first quad) pair + the east end's last quad — and the plan slots are
#         stable: the within-run positions move 7+8b / 8+8b -> 15+16b / 16+16b, the run
#         start 3737 -> 5517 (+1780, the preceding parts' insertions). PHYSICAL IDENTITY
#         VERIFIED 23/23: every mapped pair shares exactly its two SPRING-EDGE corner keys
#         (the arc's end nodes — unchanged by the raise), while the chord corners moved
#         outward (|z| 75.772 -> 75.942, y 3.2296 -> 3.1171 at the first chord) — the
#         raised-arc law itself. The pairs stay consecutive at their new seats.
#     OLD -> NEW (the same 52 physical faces):
#       cornice:  850->1476 858->1484 865->1491 872->1498 879->1505 886->1512
#                 893->1519 900->1526 907->1533 914->1540 921->1547 929->1555 930->1556
#                 2655->4171 2661->4177 2669->4185 2676->4192 2683->4199 2690->4206
#                 2697->4213 2704->4220 2711->4227 2718->4234 2725->4241 2732->4248
#                 2740->4256 2741->4257  4509->6535
#       vault.gallery: 3744->5532 3745->5533 3752->5548 3753->5549 3760->5564 3761->5565
#                 3768->5580 3769->5581 3776->5596 3777->5597 3784->5612 3785->5613
#                 3792->5628 3793->5629 3800->5644 3801->5645 3808->5660 3809->5661
#                 3816->5676 3817->5677 3824->5692 3825->5693 3832->5708
#       impost:   3715->5495
#     The census's NON-target offenders (pilaster 12 faces / 176 texels, wall.field
#     15 × 1, wall.e 1 × 1, passage.field) are the FLAT BASE'S OWN dark-crease class:
#     they sit on faces no S2A pass ever writes (they show black in the RAW pre-denoise
#     plate — 788 texels across 54 faces at day — written by the flat bake itself, the
#     OIDN pass then reduces them to 209/223 day/dusk denoised). They are re-sampled
#     creases of the committed flat look, NOT the seam defect, and stay untouched.
#     The index lists are keyed to the LM_FACE_ELEMENTS roster (the roster order IS the
#     mesh polygon order — the dump-layout belt); any roster drift fails loud in
#     s2a_seam_faces. THE BELT (fail loud): the post-fix census re-run must show the
#     seam class collapsed to the flat base's own order; the exact before/after numbers
#     ride the round record.
S2A_SEAM_FACES = {
    'cornice': (1476, 1484, 1491, 1498, 1505, 1512, 1519, 1526, 1533, 1540, 1547, 1555, 1556,
                4171, 4177, 4185, 4192, 4199, 4206, 4213, 4220, 4227, 4234, 4241,
                4248, 4256, 4257, 6535),
    'vault.gallery': (5532, 5533, 5548, 5549, 5564, 5565, 5580, 5581, 5596, 5597,
                      5612, 5613, 5628, 5629, 5644, 5645, 5660, 5661, 5676, 5677,
                      5692, 5693, 5708),
    'impost': (5495,),
}
# The denoiser decision knob (the verdict's decision tree; a DECISION-RUN override, never a
# DEC-044 dial): bake day/dusk WITH the committed compositor OIDN first, run the B4 junction
# rows, and only if they fail re-run the state with ZIMNY_BAKE_DENOISE=off — the state's
# charts then encode from the RAW (un-denoised) bake plates (fixed seed, deterministic).
# Committed runs never set the knob: absent = the committed OIDN path, byte-identical.
DENOISE_ENV = 'ZIMNY_BAKE_DENOISE'

# D3 (jordan slice 2): the bake lamp rig. Common: POINT lamps, use_shadow,
# visible_camera/visible_glossy off, clearance 0.03 m (JORDAN_RIG_CLEARANCE). Derived
# from the BUILDER's own constants in the exec namespace (SCONCE_*, FLIGHTS,
# flight_datum, CHAND_*) — never from a parsed summary copy. Coordinates in glTF world
# (+X east, +Y up, +Z south); the rig rows land in the bake log's 'rig' block.
JORDAN_RIG_CLEARANCE = 0.03       # every lamp sphere clears every fixture by >= this
JORDAN_RIG_FRONT = 0.15           # sconce lamp's offset beyond the glow box's far face
JORDAN_RIG_RING_FLOOR = 0.35      # the ring law's artistic floor below the drop centre
JORDAN_RIG_RING_GAP = 0.05        # ring lamps: sphere surface 0.05 clear of the drop tip
JORDAN_RIG_CORE_GAP = 0.05        # core lamp: sphere surface 0.05 clear of the core oct
JORDAN_RIG_CORE_BASE_Y = 14.3     # D3's authored core-lamp start y (it intersects the oct)
JORDAN_RIG_STEP = 0.005           # the lower-to-clear rule's deterministic descent step
JORDAN_RIG_SCONCE = {'power_W': 80.0, 'radius_m': 0.12, 'colour': (1.00, 0.76, 0.46)}
JORDAN_RIG_RING = {'power_W': 75.0, 'radius_m': 0.15, 'colour': (1.00, 0.80, 0.55)}
JORDAN_RIG_CORE = {'power_W': 200.0, 'radius_m': 0.20, 'colour': (1.00, 0.80, 0.55)}
# The fixture vocabulary the clearance law guards (D1's LM_ENCODE.excludeMaterials;
# bake.py cannot read tools/gltf/jordan.mjs, so the names are declared here on purpose).
JORDAN_RIG_FIXTURE_MATERIALS = ('pane', 'sconce_glow', 'chandelier_glow')
# D3's sanity contract: the flight-2 middle sconce's lamp lands within 0.6 m of the
# committed probe row on the room side.
JORDAN_RIG_SANITY = {'point': (75.1, 9.5, -85.5), 'max_distance_m': 0.6, 'z_above': -85.6}


def fail(message):
    print(f'bake.py: {message}', file=sys.stderr, flush=True)
    sys.exit(1)


def gltf_to_blender(vector):
    # glTF (x, y, z) with +Y up  ->  Blender (x, -z, y) with +Z up (inverse of the exporter).
    x, y, z = vector
    return (x, -z, y)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='bake.py')
    parser.add_argument('--room', required=True)
    parser.add_argument('--state', required=True)
    parser.add_argument('--out', '--stage', dest='out')
    parser.add_argument('--preview', action='store_true',
                        help='quarter-resolution layout check; never published')
    # Decision-bake overrides (the bands round's probes; never published): a census
    # plate or a lever falsifier runs the committed chain with one knob turned. Each
    # defaults to the committed law when absent.
    parser.add_argument('--res', type=int, default=None,
                        help='override the chart bake resolution (census/decision plates)')
    parser.add_argument('--samples', type=int, default=None,
                        help='override BAKE_SAMPLES (census/decision plates)')
    parser.add_argument('--world', type=float, default=None,
                        help='override WORLD_STRENGTH for this run (the F2 decision bake)')
    parser.add_argument('--sun', type=float, default=None,
                        help='override SUN_STRENGTH for this run; 0 skips add_sun '
                             '(the world-only falsifier plate)')
    parser.add_argument('--dump-layout', action='store_true', dest='dump_layout',
                        help='write lm/layout.json: per representative datablock, per face '
                             'lm cell + world corners + normal (the census input)')
    parser.add_argument('out_positional', nargs='?')
    args = parser.parse_args(argv)
    out = args.out or args.out_positional
    if out is None:
        parser.error('--out <stage> is required')
    state = STATE_ALIASES.get(args.state, args.state)
    if args.room not in ROOMS:
        fail(f'unknown room {args.room!r}; expected one of {list(ROOMS)}')
    if state not in STATES:
        fail(f'unknown state {args.state!r}; expected one of {list(STATES)}')
    return args.room, state, Path(out).resolve(), args.preview, args


def build_room(room, stage, state):
    # Factory-empty scene, then exec the committed builder with ZIMNY_BAKE=1 so it populates
    # bpy.data and (guard patch) skips the glb export + its ZIMNY_SUMMARY line.
    # The layout-identity law: a shelf-law builder writes its lm block to ZIMNY_LM_LAYOUT_OUT;
    # a stale file is removed first so only THIS exec's layout can satisfy the check below.
    # The layout files live at the STAGE ROOT (one canonical place beside the summary and the
    # sidecars — what the check's --layout paths and the wrapper's capture read); bake.mjs
    # passes the per-state dir, so the root is its parent.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source_path = BPY_DIR / f'{room}.py'
    if not source_path.exists():
        fail(f'no committed builder at {source_path}')
    stage_root = stage.parent if stage.name.startswith('bake-') else stage
    layout_path = stage_root / f'bake-layout.{state}.json'
    if layout_path.exists():
        layout_path.unlink()
    saved_argv = sys.argv
    # The builders parse their own argv; hand them exactly their grammar (no --state).
    sys.argv = [sys.argv[0], '--', '--room', room, '--out', str(stage)]
    os.environ['ZIMNY_BAKE'] = '1'
    os.environ['ZIMNY_LM_LAYOUT_OUT'] = str(layout_path)
    namespace = {'__name__': '__main__', '__file__': str(source_path)}
    try:
        code = compile(source_path.read_text(encoding='utf-8'), str(source_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
    if room in LM_LAYOUT_LAW_ROOMS and not layout_path.exists():
        fail(f'the {room} builder wrote no layout at {layout_path} — the layout-identity law')
    scene = bpy.context.scene
    meshes = [obj for obj in scene.objects if obj.type == 'MESH' and not obj.hide_render]
    if not meshes:
        fail(f'the {room} builder produced no renderable mesh objects')
    return namespace, scene, meshes


def assert_layout_identity(summary_path, layout_path, state):
    """The layout-identity bar (rastrelli-next round 4): the export stage's summary.lm and
    the layout this exec just wrote agree on pxPerM, stripRowPx, faces, layoutHash and
    every cell in roster order - or the bake refuses to run, naming the first divergent
    roster index. Seconds, not a bake. The stored hashes are compared as strings (never
    recomputed from the JSON round-trip). Returns the bake lm block for the sidecar."""
    if not summary_path.exists():
        fail(f'layout identity: {summary_path} missing — run the export stage (asset.mjs bpy) '
             'at this commit first')
    if not layout_path.exists():
        fail(f'layout identity: {layout_path} missing — the builder wrote no layout '
             '(the layout-identity law)')
    export = json.loads(summary_path.read_text(encoding='utf-8')).get('lm') or {}
    bake = json.loads(layout_path.read_text(encoding='utf-8')).get('lm') or {}
    if not bake.get('layoutHash'):
        fail(f'layout identity: {layout_path} carries no layoutHash — the builder predates the law')
    keys = ('pxPerM', 'stripRowPx', 'faces', 'layoutHash')
    e_cells = export.get('cells') or []
    b_cells = bake.get('cells') or []
    same = all(export.get(k) == bake.get(k) for k in keys) and e_cells == b_cells
    if not same:
        index = next((i for i, (a, b) in enumerate(zip(e_cells, b_cells)) if a != b),
                     min(len(e_cells), len(b_cells)))
        e_cell = e_cells[index] if index < len(e_cells) else None
        b_cell = b_cells[index] if index < len(b_cells) else None
        fail(f"layout identity: export faces {export.get('faces')} pxPerM {export.get('pxPerM')} "
             f"hash {export.get('layoutHash')} vs bake {bake.get('faces')}/{bake.get('pxPerM')}/"
             f"{bake.get('layoutHash')}; first divergence at roster index {index}: "
             f'{e_cell} vs {b_cell}')
    print(f"ZIMNY_LAYOUT_IDENTITY ok state={state} faces={bake['faces']} pxPerM={bake['pxPerM']} "
          f"hash={bake['layoutHash'][:16]}", flush=True)
    return bake


def builder_constant(namespace, name, required=True):
    if name not in namespace:
        if required:
            fail(f'builder namespace has no {name}')
        return None
    return namespace[name]


def new_fallback_material():
    mat = bpy.data.materials.new('ZIMNY_BAKE_FALLBACK')
    mat.use_nodes = True
    return mat


def ensure_materials(objects):
    # Every baked object needs at least one material carrying the target image node.
    fallback = None
    for obj in objects:
        if len(obj.material_slots) == 0:
            fallback = fallback or new_fallback_material()
            obj.data.materials.append(fallback)
        for slot in obj.material_slots:
            if slot.material is None:
                fallback = fallback or new_fallback_material()
                slot.material = fallback
    unique = {}
    for obj in objects:
        for slot in obj.material_slots:
            unique[slot.material.name] = slot.material
    return [unique[name] for name in sorted(unique)]


def is_pane_material(mat, room):
    base = mat.name.split('.')[0]
    return base in PANE_MATERIALS[room]


def swap_panes_to_glass(materials, room):
    # Baked-opaque at runtime, but the sun must enter during day/dusk: glass for camera rays,
    # transparent for shadow + diffuse rays so direct sun and bounces pass without caustics.
    swapped = []
    for mat in materials:
        if not is_pane_material(mat, room):
            continue
        mat.use_nodes = True
        tree = mat.node_tree
        tree.nodes.clear()
        output = tree.nodes.new('ShaderNodeOutputMaterial')
        glass = tree.nodes.new('ShaderNodeBsdfGlass')
        glass.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
        glass.inputs['Roughness'].default_value = 0.0
        glass.inputs['IOR'].default_value = 1.45
        transparent = tree.nodes.new('ShaderNodeBsdfTransparent')
        light_path = tree.nodes.new('ShaderNodeLightPath')
        either = tree.nodes.new('ShaderNodeMath')
        either.operation = 'MAXIMUM'
        mix = tree.nodes.new('ShaderNodeMixShader')
        tree.links.new(light_path.outputs['Is Shadow Ray'], either.inputs[0])
        tree.links.new(light_path.outputs['Is Diffuse Ray'], either.inputs[1])
        tree.links.new(either.outputs['Value'], mix.inputs['Fac'])
        tree.links.new(glass.outputs['BSDF'], mix.inputs[1])
        tree.links.new(transparent.outputs['BSDF'], mix.inputs[2])
        tree.links.new(mix.outputs['Shader'], output.inputs['Surface'])
        swapped.append(mat.name)
    return swapped


def capture_fixtures(materials):
    """The emission strengths exactly as the builder authored them — the probe's restore law."""
    saved = []
    for mat in materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and 'Emission Strength' in node.inputs:
                saved.append((node, node.inputs['Emission Strength'].default_value))
            elif node.type == 'EMISSION':
                saved.append((node, node.inputs['Strength'].default_value))
    return saved


def set_fixtures_off(materials):
    # Day: fixtures OFF. Emission strengths otherwise stay exactly as committed.
    for mat in materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and 'Emission Strength' in node.inputs:
                node.inputs['Emission Strength'].default_value = 0.0
            elif node.type == 'EMISSION':
                node.inputs['Strength'].default_value = 0.0


def restore_fixtures(saved):
    for node, value in saved:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Emission Strength'].default_value = value
        else:
            node.inputs['Strength'].default_value = value


def material_base(mat):
    return mat.name.split('.')[0]


def r6(vals):
    return tuple(round(v, 6) for v in vals)


def apply_pane_bake_emission(materials, room, state):
    """D1 B: the pane's absolute Emission override, applied AFTER the swap/capture.
    day/dusk None = skip (the swap removed the emission nodes; nothing to override)."""
    row = PANE_BAKE_EMISSION.get(room)
    if row is None:
        return
    override = row.get(state)
    if override is None:
        return
    rgb, strength = override
    for mat in materials:
        if not mat.use_nodes or not is_pane_material(mat, room):
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Emission Color'].default_value = (*rgb, 1.0)
                node.inputs['Emission Strength'].default_value = strength
                break


def apply_fixture_bake_strength(materials, room, state):
    """D1 C: absolute per-material Emission Strength overrides for the table room's glow
    chips (state -> value). Runs after capture_fixtures, so restore_fixtures still
    carries the authored strengths the dusk probe needs; the rig state stays as authored."""
    table = FIXTURE_BAKE_STRENGTH.get(room)
    if table is None:
        return
    for mat in materials:
        if not mat.use_nodes:
            continue
        value = table.get(material_base(mat))
        if value is None:
            continue
        strength = value.get(state)
        if strength is None:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and 'Emission Strength' in node.inputs:
                node.inputs['Emission Strength'].default_value = strength
            elif node.type == 'EMISSION':
                node.inputs['Strength'].default_value = strength


def apply_stage_spill(materials, room, state):
    """RG-F2 verdict 2.2: the bake-only stage spill on the shell's stairlight slot — set
    the named material's emission (colour + strength) per state. Applied in ALL THREE
    rigs regardless of fixtures_off, and AFTER the emitter scan in main (the shell object
    carries the stairlight slot beside its other slots — a pre-scan live emission would
    exclusion-reclassify the WHOLE shell object; the verdict's 'target sets unchanged'
    law + the card's cells being painted over at re-encode keep this blind to the scan).
    The capture/restore law is untouched: the spill rides past it, so the dusk probe
    renders with the spill still live (it is part of that rig). Rooms without a row are
    untouched: absent = unchanged behaviour. The function VERIFIES its own work and the
    summary row carries the proof: spillApplied = at least one material matched the
    'stairlight' slot AND an emission node actually reads back a non-zero strength;
    a declared spill with NO matching material must not silently zero out — the row
    records spillApplied: False and the bake continues (the log row is the proof; this
    path must not raise)."""
    spec = STAGE_SPILL.get(room)
    if spec is None:
        return None
    colours = spec['colours']
    strengths = spec['strengths']
    if state not in colours or state not in strengths:
        fail(f'the stage-spill row of {room} lacks state {state}')
    rgb, strength = colours[state], strengths[state]
    found = []
    lit_nodes = 0
    for mat in materials:
        if not mat.use_nodes or material_base(mat) != 'stairlight':
            continue
        found.append(mat.name)
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and 'Emission Strength' in node.inputs:
                node.inputs['Emission Color'].default_value = (*rgb, 1.0)
                node.inputs['Emission Strength'].default_value = strength
                if node.inputs['Emission Strength'].default_value > 0.0:
                    lit_nodes += 1
            elif node.type == 'EMISSION':
                node.inputs['Color'].default_value = (*rgb, 1.0)
                node.inputs['Strength'].default_value = strength
                if node.inputs['Strength'].default_value > 0.0:
                    lit_nodes += 1
    return {'colour': list(rgb),
            'litNodes': lit_nodes,
            'materials': sorted(found),
            'spillApplied': bool(found) and lit_nodes > 0,
            'strength': strength}


def element_spill_material(namespace, meshes, element):
    """The stock-take emitter row's PART path: the shell polygons whose builder element is
    `element` (the LM_FACE_ELEMENTS roster - the roster order IS the mesh polygon order,
    the S2A belt's correspondence), split onto their OWN material slot: a copy of the
    faces' current material, renamed to the element. The spill applies AFTER the emitter
    scan, so the extra slot never reclassifies the shell (the RG-F3 law); it is
    bake-scene-only - the glb export never runs in the bake chain, so the room's shipped
    slots stay 0..7. Returns the new material, or None when the namespace carries no
    element map (a sibling room's namespace - the caller's material path already missed).
    Fail-loud on a declared element with no faces (the pane rows' rated-look law)."""
    if 'LM_FACE_ELEMENTS' not in namespace:
        return None
    elements = builder_constant(namespace, 'LM_FACE_ELEMENTS')
    faces = [i for i, el in enumerate(elements) if el == element]
    if not faces:
        fail(f'the stage-spill-parts row names element {element!r} and the LM_FACE_ELEMENTS '
             'roster carries no such face - the spill rows are rated look, a silent miss '
             'would publish an unlit door')
    shell = next((obj for obj in meshes if obj.name == 'shell'), None)
    if shell is None:
        fail(f'the stage-spill-parts row names element {element!r} and the scene carries '
             "no 'shell' object - the element path splits the shell's polygons")
    source = shell.data.materials[shell.data.polygons[faces[0]].material_index]
    if source is None:
        fail(f'the stage-spill-parts row names element {element!r} whose face carries no '
             'material to split')
    mat = source.copy()
    mat.name = element
    slot = len(shell.data.materials)
    shell.data.materials.append(mat)
    for pi in faces:
        shell.data.polygons[pi].material_index = slot
    return mat


def apply_stage_spill_parts(materials, room, state, namespace=None, meshes=None):
    """RG-F3: the declared panes' bake-only emission, by MATERIAL NAME at the door
    spill's insertion point — the same post-scan, post-fixtures-off law as
    apply_stage_spill (the shell object carries the 'pane' slot beside its other slots,
    so a pre-scan live emission would exclusion-reclassify the WHOLE shell object; this
    runs only after emitter_names is built). Rooms without a row are untouched: absent =
    unchanged behaviour, keeps the door's no-raise default for the siblings.
    THE STOCK-TAKE EXTENSION: a row key that names no material resolves as a PART (the
    doorcard twin) through element_spill_material - the namespace/meshes pair is required
    for that path and untouched for the material-keyed rows ('pane' byte-identical).
    Proof law (stricter than the door's, per the ruling): a declared row with NO matching
    material, a partial application, or a read-back mismatch fails the bake (fail(); no
    re-raise-free path). paneApplied =
    the row's assignment AND read-back verification succeeded — a declared zero
    (nightChandeliers) that reads back zero is a successful verified application
    ('declared-zero-verified'), not a failure; a nonzero state reads back equal to the
    declaration ('applied'). paneProof carries material, declared and read-back rgb +
    strength, and the status per material."""
    rows = STAGE_SPILL_PARTS.get(room)
    if rows is None:
        return None
    proofs = []
    for material_name, per_state in sorted(rows.items()):
        if state not in per_state:
            fail(f'the stage-spill-parts row of {room}/{material_name} lacks state {state}')
        rgb, strength = per_state[state]
        found = [mat for mat in materials
                 if mat.use_nodes and material_base(mat) == material_name]
        if not found and namespace is not None:
            split = element_spill_material(namespace, meshes, material_name)
            if split is not None:
                found = [split]
        if not found:
            fail(f'the stage-spill-parts row of {room} declares material '
                 f'{material_name!r} with no matching material in the scene — the pane '
                 'rows are rated look, a silent miss would publish an unpainted pane '
                 'sky (the door no-raise law covers only rooms with no pane row)')
        for mat in found:
            # The FLAT contract (finding: read-back checks were on "the last
            # emission-capable node"; linked inputs can keep an effective value from
            # another node): the pane material must carry EXACTLY one BSDF_PRINCIPLED
            # node, NO stray EMISSION nodes, and UNLINKED Emission Color/Strength
            # inputs — the row is verified directly on that node.
            principled = [node for node in mat.node_tree.nodes
                          if node.type == 'BSDF_PRINCIPLED'
                          and 'Emission Strength' in node.inputs]
            strays = [node for node in mat.node_tree.nodes if node.type == 'EMISSION']
            if len(principled) != 1 or strays:
                fail(f'the {material_name!r} material is not the declared flat contract '
                     f'({len(principled)} BSDF_PRINCIPLED node(s) with an Emission '
                     f'Strength input, {len(strays)} stray EMISSION node(s)) — the '
                     f'{room} pane spill rows verify the flat node directly')
            node = principled[0]
            for socket_name in ('Emission Color', 'Emission Strength'):
                if node.inputs[socket_name].is_linked:
                    fail(f"the {material_name!r} material's {socket_name!r} input is "
                         'LINKED — the flat pane contract requires the direct unlinked '
                         'inputs (a linked value would silently override the written '
                         'default and the proof would not be the effective emission)')
            node.inputs['Emission Color'].default_value = (*rgb, 1.0)
            node.inputs['Emission Strength'].default_value = strength
            read_rgb = node.inputs['Emission Color'].default_value[:3]
            read_strength = node.inputs['Emission Strength'].default_value
            # f32 node storage: verify at the record's 6-decimal precision.
            status = 'applied' if strength > 0.0 else 'declared-zero-verified'
            if r6(read_rgb) != r6(rgb) or round(read_strength, 6) != round(strength, 6):
                fail(f'the {material_name!r} pane emission read back '
                     f'{(list(r6(read_rgb)), round(read_strength, 6))} against the '
                     f'declared {(list(rgb), strength)} — the {room} pane spill rows '
                     'must read back exactly as declared')
            proofs.append({
                'declaredColour': list(rgb),
                'declaredStrength': round(strength, 6),
                'material': material_name,
                'readBackColour': list(r6(read_rgb)),
                'readBackStrength': round(read_strength, 6),
                'status': status,
            })
    # Non-declared-state guard: the row family is all-rig by law; reaching this line means
    # every declared material applied and verified (any gap failed above), so the
    # paneApplied boolean is exactly the door's spillApplied semantics with the declared
    # zero admitted as a SUCCESS (the night outcome = verified zero, not failed nonzero).
    return {'paneApplied': True, 'paneProof': proofs}


def add_sun(scene, room, strength=None):
    data = bpy.data.lights.new('ZIMNY_SUN', 'SUN')
    data.energy = SUN_STRENGTH[room] if strength is None else strength
    data.angle = math.radians(SUN_ANGLE_DEG)
    data.color = (1.0, 1.0, 1.0)
    data.use_shadow = True
    obj = bpy.data.objects.new('ZIMNY_SUN', data)
    scene.collection.objects.link(obj)
    to_sun = Vector(gltf_to_blender(DAY_SUN_DIR)).normalized()
    # A sun lamp shines along its local -Z: point it from the sun toward the scene.
    obj.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()
    return obj


def octahedron_distance(point, centre, half):
    """Exact distance from a point to a kit octahedron SOLID (0 when inside): the 6
    vertices and 12 edges analytically, the 8 faces via closest_point_on_tri (the
    perpendicular foot may sit inside a triangle for off-axis queries). D3's
    intersection rule needs the actual solid surface, not the mesh's world AABB."""
    lx, ly, lz = (point[i] - centre[i] for i in range(3))
    hx, hy, hz = half
    if abs(lx) / hx + abs(ly) / hy + abs(lz) / hz <= 1.0:
        return 0.0
    best = math.inf
    apexes = ((0, hy, 0), (0, -hy, 0))
    ring = ((hx, 0, 0), (0, 0, hz), (-hx, 0, 0), (0, 0, -hz))
    vertices = apexes + ring
    for off in vertices:
        best = min(best, math.dist(point, (centre[0] + off[0], centre[1] + off[1],
                                            centre[2] + off[2])))
    edges = [(apex, r) for apex in apexes for r in ring]
    edges += [(ring[i], ring[(i + 1) % len(ring)]) for i in range(len(ring))]
    for a, b in edges:
        a_abs = (centre[0] + a[0], centre[1] + a[1], centre[2] + a[2])
        b_abs = (centre[0] + b[0], centre[1] + b[1], centre[2] + b[2])
        ab = Vector(b_abs) - Vector(a_abs)
        t = max(0.0, min(1.0, (Vector(point) - Vector(a_abs)).dot(ab) / ab.dot(ab)))
        best = min(best, (Vector(point) - (Vector(a_abs) + ab * t)).length)
    for apex in apexes:
        for i in range(len(ring)):
            j = (i + 1) % len(ring)
            pa = mathutils.geometry.closest_point_on_tri(
                Vector(point),
                Vector((centre[0] + apex[0], centre[1] + apex[1], centre[2] + apex[2])),
                Vector((centre[0] + ring[i][0], centre[1] + ring[i][1], centre[2] + ring[i][2])),
                Vector((centre[0] + ring[j][0], centre[1] + ring[j][1], centre[2] + ring[j][2])),
            )
            best = min(best, (Vector(point) - pa).length)
    return best


def jordan_fixture_bvhs(meshes):
    """The D3 clearance set: every rendered object carrying a fixture-vocabulary
    material, as world-space BVHs (one per object instance; the sconce roster shares
    mesh data but every instance has its own world matrix)."""
    bpy.context.view_layer.update()  # the placed instances' matrix_world must be current
    out = []
    for obj in meshes:
        mats = {material_base(slot.material) for slot in obj.material_slots if slot.material}
        if not mats & set(JORDAN_RIG_FIXTURE_MATERIALS):
            continue
        matrix = obj.matrix_world
        verts = [tuple(matrix @ v.co) for v in obj.data.vertices]
        polys = [tuple(poly.vertices) for poly in obj.data.polygons]
        bvh = BVHTree.FromPolygons(verts, polys)
        out.append((obj.name, bvh))
    return out


def jordan_rig_check_clearance(rows, fixtures, radius, label):
    """Common rule: every lamp sphere clears every fixture mesh by >= JORDAN_RIG_CLEARANCE
    (distance to the fixture's surface minus the sphere's radius) or FAIL loud."""
    for index, position in enumerate(rows):
        for fixture_name, bvh in fixtures:
            hit = bvh.find_nearest(Vector(position))
            distance = hit[3] if hit[0] is not None else math.inf
            gap = distance - radius
            if gap < JORDAN_RIG_CLEARANCE - 1e-9:
                fail(f'jordan rig {label}[{index}] at {position} clears fixture '
                     f'{fixture_name} by {gap:.4f} m < {JORDAN_RIG_CLEARANCE} m')


def add_jordan_rig(scene, namespace, meshes, scale=1.0):
    """scale: the RIG_STATE_SCALE multiplier for THIS state (2c: the parked dusk knob —
    it multiplies every lamp's energy; before 2c the row only gated the rig's existence,
    so the knob was not exercisable and the committed 0/1/1 values masked that)."""
    """D3 verbatim, derived from the builder's own constants (no parsed summary copies):
    10 sconce lamps on the builder's mount rosters (glow-box WORLD centre + the unit
    room-facing normal * (half-depth + the front offset)), 8 chandelier drop lamps on the
    builder's kit_circle drop azimuths, and one core lamp lowered below the core
    octahedron until D3's lower-to-clear rule passes. Returns the rig rows for the log."""
    flights = namespace['FLIGHTS']
    x_w, x_e = namespace['X_W'], namespace['X_E']
    z_n = namespace['Z_N']
    above = namespace['SCONCE_ABOVE']
    glow_depth, glow_height, _glow_width = namespace['SCONCE_GLOW_BOX']
    # The glow box lives at template depth magnitude 0.22..0.48 along the room-facing
    # normal (the template projects the prop toward -Z, and rot maps -Z onto n_room):
    # its WORLD centre sits 0.35 m out from the mount's wall plane, half-depth 0.13, 0.25
    # m above the mount datum.
    out = (glow_depth[0] + glow_depth[1]) / 2       # the glow box's centre offset (0.35)
    half_depth = (glow_depth[1] - glow_depth[0]) / 2  # along the room-facing normal (0.13)
    up = (glow_height[0] + glow_height[1]) / 2        # above the mount datum (0.25)
    along = out + half_depth + JORDAN_RIG_FRONT       # 0.35 + 0.13 + 0.15 = 0.63
    sconces = []
    for z in namespace['SCONCE_WEST_Z']:
        mount = (x_w, namespace['flight_datum'](flights[0], z) + above, z)
        sconces.append((mount[0] + along, mount[1] + up, mount[2]))
    for x in namespace['SCONCE_NORTH_X']:
        mount = (x, namespace['flight_datum'](flights[1], x) + above, z_n)
        sconces.append((mount[0], mount[1] + up, mount[2] + along))
    for z, y in namespace['SCONCE_EAST']:
        sconces.append((x_e - along, y + up, z))
    # D3 sanity: the flight-2 middle sconce's lamp must land near the contract row, room side.
    sanity = JORDAN_RIG_SANITY
    probe_index = len(namespace['SCONCE_WEST_Z']) + 1  # north's middle of three
    distance = math.dist(sconces[probe_index], sanity['point'])
    if distance > sanity['max_distance_m'] or sconces[probe_index][2] <= sanity['z_above']:
        fail(f'jordan rig sanity: flight-2 middle sconce lamp at '
             f'{sconces[probe_index]} misses {sanity["point"]} by {distance:.3f} m')
    # Chandelier: the drop azimuths ride the builder's own kit_circle count law.
    cx, cz = namespace['CHAND_C']
    drop_half = namespace['CHAND_DROP'][1]
    below = max(JORDAN_RIG_RING_FLOOR,
                drop_half + JORDAN_RIG_RING['radius_m'] + JORDAN_RIG_RING_GAP)
    drop_y = namespace['CHAND_DROP_Y'] - below
    drops = []
    segments = min(namespace['CHAND_SEG'], 8)
    for k in range(segments):
        phi = 2.0 * math.pi * k / segments
        drops.append((cx + namespace['CHAND_DROP_R'] * math.cos(phi), drop_y,
                      cz + namespace['CHAND_DROP_R'] * math.sin(phi)))
    # Core lamp: D3's lower-to-clear rule against the core octahedron's SOLID surface.
    # Steps are index-based (base - step*i), never accumulated subtraction: the descent
    # must land on the exact grid point the rule implies (0.005 steps; the boundary is
    # a signpost, the tolerance makes the boundary step itself pass).
    core_x, core_z = cx, cz
    core_half = namespace['CHAND_CORE']
    core_centre = (core_x, namespace['CHAND_CORE_Y'], core_z)
    core_y = JORDAN_RIG_CORE_BASE_Y
    floor_y = core_centre[1] - core_half[1] - 2.0
    steps = 0
    while True:
        gap = (octahedron_distance((core_x, core_y, core_z), core_centre, core_half)
               - JORDAN_RIG_CORE['radius_m'])
        if gap >= JORDAN_RIG_CORE_GAP - 1e-9:
            break
        steps += 1
        core_y = JORDAN_RIG_CORE_BASE_Y - JORDAN_RIG_STEP * steps
        if core_y < floor_y:
            fail(f'jordan rig core lamp never cleared the core octahedron; last y {core_y}')
    fixtures = jordan_fixture_bvhs(meshes)
    if not fixtures:
        fail('jordan rig clearance found no fixture meshes')
    jordan_rig_check_clearance(sconces, fixtures, JORDAN_RIG_SCONCE['radius_m'], 'sconce')
    jordan_rig_check_clearance(drops, fixtures, JORDAN_RIG_RING['radius_m'], 'ring')
    jordan_rig_check_clearance([(core_x, core_y, core_z)], fixtures,
                               JORDAN_RIG_CORE['radius_m'], 'core')
    lamps = (
        [('ZIMNY_RIG_SCONCE', row, JORDAN_RIG_SCONCE) for row in sconces]
        + [('ZIMNY_RIG_CHANDRING', row, JORDAN_RIG_RING) for row in drops]
        + [('ZIMNY_RIG_CHANDCORE', (core_x, core_y, core_z), JORDAN_RIG_CORE)]
    )
    for name, position, row in lamps:
        data = bpy.data.lights.new(name, 'POINT')
        data.energy = row['power_W'] * scale
        data.shadow_soft_size = row['radius_m']
        data.color = row['colour']
        data.use_shadow = True
        obj = bpy.data.objects.new(name, data)
        obj.location = gltf_to_blender(position)
        obj.visible_camera = False
        obj.visible_glossy = False
        scene.collection.objects.link(obj)
    return {
        'clearance_m': JORDAN_RIG_CLEARANCE,
        'coreBasePosition': r6((core_x, JORDAN_RIG_CORE_BASE_Y, core_z)),
        'corePosition': r6((core_x, core_y, core_z)),
        'coreRule': 'D3 lower-to-clear: 0.05 m sphere-surface gap vs the core octahedron',
        'dropPositions': [r6(row) for row in drops],
        'dropRule': ('ring y = drop_centre_y - max(0.35, drop_half + radius + 0.05); '
                     'azimuths = the builder kit_circle law (8 of CHAND_SEG)'),
        'fixtures': [name for name, _bvh in fixtures],
        'sconcePositions': [r6(row) for row in sconces],
        'sconceRule': 'c_glow + n_room * (h_glow + 0.15) on the builder mount rosters',
        'totals_W': {'chandelier': (len(drops) * JORDAN_RIG_RING['power_W']
                                    + JORDAN_RIG_CORE['power_W']) * scale,
                     'sconces': len(sconces) * JORDAN_RIG_SCONCE['power_W'] * scale},
        'scale': scale,
    }


def build_world(scene, room, state, strength=None):
    world = bpy.data.worlds.new('ZIMNY_BAKE_WORLD')
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    output = tree.nodes.new('ShaderNodeOutputWorld')
    background = tree.nodes.new('ShaderNodeBackground')
    background.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    base = WORLD_STRENGTH[room][state] if strength is None else strength
    background.inputs['Strength'].default_value = base
    if state == 'dusk' and DUSK_GLOW_GAIN > 0.0:
        # Horizon glow toward the below-horizon sun: base + gain * max(dot, 0) ^ power.
        coords = tree.nodes.new('ShaderNodeTexCoord')
        dot = tree.nodes.new('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = gltf_to_blender(DUSK_WORLD_DIR)
        positive = tree.nodes.new('ShaderNodeMath')
        positive.operation = 'MAXIMUM'
        positive.inputs[1].default_value = 0.0
        power = tree.nodes.new('ShaderNodeMath')
        power.operation = 'POWER'
        power.inputs[1].default_value = DUSK_GLOW_POWER
        strength = tree.nodes.new('ShaderNodeMath')
        strength.operation = 'MULTIPLY_ADD'
        strength.inputs[1].default_value = DUSK_GLOW_GAIN
        strength.inputs[2].default_value = base
        tree.links.new(coords.outputs['Generated'], dot.inputs[0])
        tree.links.new(dot.outputs['Value'], positive.inputs[0])
        tree.links.new(positive.outputs['Value'], power.inputs[0])
        tree.links.new(power.outputs['Value'], strength.inputs[0])
        tree.links.new(strength.outputs['Value'], background.inputs['Strength'])
    tree.links.new(background.outputs['Background'], output.inputs['Surface'])
    scene.world = world


def set_panorama_type(camera, value):
    # Blender 4.0 moved panorama settings from Camera.cycles to Camera itself.
    if hasattr(camera, 'panorama_type'):
        camera.panorama_type = value
    else:
        camera.cycles.panorama_type = value


def add_probe_camera(scene, room):
    camera = bpy.data.cameras.new('ZIMNY_PROBE')
    camera.type = 'PANO'
    set_panorama_type(camera, 'EQUIRECTANGULAR')
    obj = bpy.data.objects.new('ZIMNY_PROBE', camera)
    scene.collection.objects.link(obj)
    obj.location = gltf_to_blender(PROBE_POINT[room])
    obj.rotation_euler = (math.radians(90.0), 0.0, math.radians(PROBE_YAW_DEG))
    scene.camera = obj
    return obj


def configure_cycles(scene, samples):
    scene.render.engine = 'CYCLES'
    cycles = scene.cycles
    cycles.device = 'CPU'
    cycles.samples = samples
    cycles.use_adaptive_sampling = False
    cycles.time_limit = 0.0
    cycles.seed = CYCLES_SEED
    cycles.use_animated_seed = False
    cycles.max_bounces = MAX_BOUNCES
    cycles.diffuse_bounces = DIFFUSE_BOUNCES
    cycles.glossy_bounces = GLOSSY_BOUNCES
    cycles.transmission_bounces = TRANSMISSION_BOUNCES
    cycles.transparent_max_bounces = TRANSPARENT_BOUNCES
    cycles.caustics_reflective = False
    cycles.caustics_refractive = False
    cycles.blur_glossy = 1.0
    cycles.sample_clamp_direct = 0.0
    cycles.sample_clamp_indirect = SAMPLE_CLAMP_INDIRECT
    cycles.use_light_tree = True
    render = scene.render
    render.use_persistent_data = False
    render.dither_intensity = 0.0
    render.resolution_percentage = 100
    render.pixel_aspect_x = 1.0
    render.pixel_aspect_y = 1.0
    render.film_transparent = False
    render.use_compositing = True
    render.use_sequencer = False
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def configure_bake(scene, margin_px):
    bake = scene.render.bake
    bake.target = 'IMAGE_TEXTURES'
    bake.use_selected_to_active = False
    bake.use_clear = True
    bake.margin = margin_px
    bake.margin_type = 'EXTEND'
    bake.use_pass_direct = True
    bake.use_pass_indirect = True
    bake.use_pass_color = False
    scene.cycles.bake_type = 'DIFFUSE'
    scene.cycles.use_denoising = False


def configure_render_denoise(scene):
    cycles = scene.cycles
    cycles.use_denoising = True
    cycles.denoiser = DENOISER
    cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    cycles.denoising_prefilter = 'ACCURATE'
    if hasattr(cycles, 'denoising_use_gpu'):
        cycles.denoising_use_gpu = False


def set_exr_output(render, path):
    settings = render.image_settings
    settings.file_format = 'OPEN_EXR'
    settings.color_mode = 'RGB'
    settings.color_depth = '32'
    settings.exr_codec = 'ZIP'
    render.filepath = str(path)
    render.use_file_extension = False


def attach_target(mat, image):
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    for node in nodes:
        node.select = False
    node = nodes.new('ShaderNodeTexImage')
    node.name = 'ZIMNY_BAKE_TARGET'
    node.image = image
    node.select = True
    nodes.active = node


def bake_targets(objects, room):
    # One representative per mesh datablock, chosen deterministically by object name;
    # a BAKE_TEMPLATE_INSTANCE row may override the law: jordan's 'centroid' picks the
    # instance whose location is nearest the roster's centroid (the kit's middle view),
    # ties broken by object name. Shared mesh data means every instance would ink the
    # same cells — the representative only chooses WHICH bounce neighbourhood they see.
    mode = BAKE_TEMPLATE_INSTANCE.get(room, 'first')
    grouped = {}
    for obj in sorted(objects, key=lambda item: item.name):
        grouped.setdefault(obj.data.name, []).append(obj)
    targets = []
    reps = []
    for name in sorted(grouped):
        group = grouped[name]
        if mode == 'centroid' and len(group) > 1:
            centre_x = sum(obj.location.x for obj in group) / len(group)
            centre_y = sum(obj.location.y for obj in group) / len(group)
            centre_z = sum(obj.location.z for obj in group) / len(group)
            # Build unsorted (RNA objects are not orderable — an exact dist2 tie must
            # never fall into tuple comparison), then sort by the committed law's key:
            # (dist2, object name) — exact ties resolve to the lexicographically lowest
            # name. Log pick + runner-up so the next session reads them instead of
            # re-deriving the law (the bands round's pins).
            keyed = [(((obj.location.x - centre_x) ** 2
                       + (obj.location.y - centre_y) ** 2
                       + (obj.location.z - centre_z) ** 2), obj) for obj in group]
            keyed.sort(key=lambda item: (item[0], item[1].name))
            chosen = keyed[0][1]
            runner = keyed[1] if len(keyed) > 1 else None
            reps.append({'datablock': name, 'groupSize': len(group),
                         'pick': f'{chosen.name} @ ({chosen.location.x:.3f}, '
                                 f'{chosen.location.y:.3f}, {chosen.location.z:.3f})',
                         'dist2': round(keyed[0][0], 6),
                         'runnerUp': None if runner is None else
                                     f'{runner[1].name} @ d2 {runner[0]:.6f}'})
        else:
            chosen = group[0]
        targets.append(chosen)
    for rep in reps:
        print(f"ZIMNY_REP {rep['datablock']}: pick {rep['pick']} (d2 {rep['dist2']}, "
              f"runner-up {rep['runnerUp']})", flush=True)
    return targets, reps


def dump_layout(path, targets, grid):
    # The bands census input: per representative datablock, per face — the lm cell it
    # inks (cells.json's per-object consecutive runs: first_cell + face index) and the
    # face's world corners + normal at the representative's own placement.
    cells = json.loads((path.parent / 'cells.json').read_text(encoding='utf-8'))['cells']
    owned = {}
    for key, row in cells.items():
        cx, cy = (int(part) for part in key.split(','))
        owned.setdefault(row['object'], []).append(cy * grid + cx)
    layout = {}
    for obj in targets:
        name = obj.data.name
        runs = sorted(owned.get(name, []))
        if not runs:
            fail(f'layout dump: datablock {name!r} owns no lm cells in cells.json')
        first = runs[0]
        matrix = obj.matrix_world
        normal_matrix = matrix.to_3x3()
        faces = []
        for pi, poly in enumerate(obj.data.polygons):
            cell = first + pi
            faces.append({'cell': f'{cell % grid},{cell // grid}',
                          'corners': [list(matrix @ obj.data.vertices[i].co)
                                      for i in poly.vertices],
                          'normal': list((normal_matrix @ poly.normal).normalized())})
        layout[name] = {'firstCell': first, 'faces': faces}
    path.write_text(json.dumps(layout, sort_keys=True, indent=2) + '\n', encoding='utf8')
    total = sum(len(row['faces']) for row in layout.values())
    print(f'ZIMNY_LAYOUT {path} ({total} faces)', flush=True)


def bake_lightmap(scene, meshes, targets, materials, res, margin_px):
    image = bpy.data.images.new(
        'ZIMNY_LM', res, res, alpha=False, float_buffer=True, is_data=True
    )
    if hasattr(image, 'use_half_precision'):
        image.use_half_precision = False
    for mat in materials:
        attach_target(mat, image)
    for obj in scene.objects:
        obj.select_set(False)
    for obj in targets:
        layer = obj.data.uv_layers.get(LM_UV_LAYER)
        if layer is None:
            fail(f"mesh {obj.data.name!r} has no '{LM_UV_LAYER}' UV layer")
        obj.data.uv_layers.active = layer
        obj.hide_viewport = False
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = targets[0]
    result = bpy.ops.object.bake(
        type='DIFFUSE',
        pass_filter={'DIRECT', 'INDIRECT'},
        margin=margin_px,
        margin_type='EXTEND',
        use_selected_to_active=False,
        target='IMAGE_TEXTURES',
        save_mode='INTERNAL',
        use_clear=True,
        uv_layer=LM_UV_LAYER,
    )
    if 'FINISHED' not in result:
        fail(f'bpy.ops.object.bake returned {sorted(result)}')
    for obj in meshes:
        obj.select_set(False)
    return image


def save_exr(image, path):
    image.filepath_raw = str(path)
    image.file_format = 'OPEN_EXR'
    image.save()


def denoise_image(scene, image, exr_path):
    # Cycles 4.2 does not denoise bakes; run the baked float image through the compositor's
    # OIDN node (no Render Layers node, so the composite output is the image itself). The
    # 3D pass Blender still runs behind the compositor is unused: pin it to one sample so
    # it stays cheap (the baked image already holds the full-sample result).
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    source = tree.nodes.new('CompositorNodeImage')
    source.image = image
    denoise = tree.nodes.new('CompositorNodeDenoise')
    denoise.use_hdr = True
    denoise.prefilter = 'ACCURATE'
    composite = tree.nodes.new('CompositorNodeComposite')
    tree.links.new(source.outputs['Image'], denoise.inputs['Image'])
    tree.links.new(denoise.outputs['Image'], composite.inputs['Image'])
    render = scene.render
    render.resolution_x, render.resolution_y = image.size
    render.resolution_percentage = 100
    scene.cycles.samples = 1  # orchestrator adjudication: the discarded 3D pass must be cheap
    if hasattr(render, 'compositor_device'):
        render.compositor_device = 'CPU'
    if hasattr(render, 'compositor_precision'):
        render.compositor_precision = 'FULL'
    set_exr_output(render, exr_path)
    bpy.ops.render.render(write_still=True)
    scene.use_nodes = False
    if not exr_path.exists():
        fail(f'compositor wrote no denoised EXR at {exr_path}')
    return bpy.data.images.load(str(exr_path))


def render_probe(scene, exr_path):
    render = scene.render
    render.resolution_x, render.resolution_y = PROBE_RES
    render.resolution_percentage = 100
    scene.cycles.samples = PROBE_SAMPLES
    configure_render_denoise(scene)
    scene.use_nodes = False
    set_exr_output(render, exr_path)
    bpy.ops.render.render(write_still=True)
    if not exr_path.exists():
        fail(f'probe render wrote no EXR at {exr_path}')
    return bpy.data.images.load(str(exr_path))


def encode_ldr(source, white_point, name, png_path):
    # encoded = clamp(linear / whitePoint, 0, 1), saved as Non-Color (linear) 8-bit PNG.
    width, height = source.size
    channels = source.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    source.pixels.foreach_get(linear)
    rgb = linear.reshape(-1, channels)[:, :3]
    peak = float(rgb.max())
    clipped = float(np.mean(np.any(rgb > white_point, axis=1)))
    ldr = bpy.data.images.new(name, width, height, alpha=False, float_buffer=False, is_data=True)
    encoded = np.ones((width * height, ldr.channels), dtype=np.float32)
    encoded[:, :3] = np.clip(rgb / white_point, 0.0, 1.0)
    ldr.pixels.foreach_set(encoded.ravel())
    ldr.filepath_raw = str(png_path)
    ldr.file_format = 'PNG'
    ldr.save()
    return peak, clipped


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def paint_pane_cells(image, rects, colour):
    """D-4/D-23: fill the lantern glazing's patch cells with the state's sky colour.
    Chart y runs from the top; Blender's pixel rows run from the bottom."""
    width, height = image.size
    channels = image.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    image.pixels.foreach_get(linear)
    plane = linear.reshape(height, width, channels)
    for x, y, w, h in rects:
        r0 = height - (y + h)
        plane[r0:r0 + h, x:x + w, 0] = colour[0]
        plane[r0:r0 + h, x:x + w, 1] = colour[1]
        plane[r0:r0 + h, x:x + w, 2] = colour[2]
    image.pixels.foreach_set(plane.reshape(-1))
    image.save()


def pane_rects(namespace, part):
    """The painted part's patch rects from the builder's packed chart dict."""
    chart = namespace.get('ARCH_CHART')
    if not chart:
        fail('the builder namespace carries no ARCH_CHART for the pane paint')
    rects = []
    for name in sorted(chart['patches']):
        patch = chart['patches'][name]
        if patch['part'] == part:
            rects.append((patch['x'], patch['y'], patch['w'], patch['h']))
    if not rects:
        fail(f"arch chart has no patches for part {part!r}")
    return rects


def chart_contract(namespace):
    """D-13: the builder may declare LM_CHARTS; the legacy LM_RES/LM_PAD_PX/LM_GRID triple
    falls back to a single 'arch' chart (the siblings' committed shape)."""
    charts = namespace.get('LM_CHARTS')
    if charts:
        out = []
        for name in sorted(charts):
            spec = charts[name]
            out.append({'name': name,
                        'res': int(spec['res']),
                        'pad': int(spec['pad']),
                        'objectPrefixes': tuple(spec.get('objectPrefixes', ()))})
        return out
    lm_res = int(builder_constant(namespace, 'LM_RES'))
    lm_pad = int(builder_constant(namespace, 'LM_PAD_PX'))
    return [{'name': 'arch', 'res': lm_res, 'pad': lm_pad, 'objectPrefixes': ()}]


def chart_objects(meshes, spec, charts):
    """A chart's bake set: prefixed objects for the kit chart; everything NOT claimed by
    another prefixed chart for the arch chart."""
    if spec['objectPrefixes']:
        return [obj for obj in meshes if obj.name.startswith(spec['objectPrefixes'])]
    claimed = set()
    for other in charts:
        if other['objectPrefixes']:
            claimed.update(obj.name for obj in meshes
                           if obj.name.startswith(other['objectPrefixes']))
    return [obj for obj in meshes if obj.name not in claimed]


def duplicate_chart_materials(objects):
    """The kit chart's bake writes through DUPLICATES of the objects' materials (the
    pane-swap precedent: bpy.data only, the glb untouched) — MG_gilt is shared with
    architecture objects, so the kit target must never touch the original."""
    duplicates = {}
    for obj in objects:
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None:
                continue
            base = mat.name.split('.')[0]
            dup = duplicates.get(base)
            if dup is None:
                dup = mat.copy()
                dup.name = f'{base}.kit'
                duplicates[base] = dup
            slot.material = dup
    return [duplicates[name] for name in sorted(duplicates)]


def emissive_objects(meshes):
    """Objects carrying a LIVE emission shader (post fixtures-off): the room's light
    bearers. They stay OUT of every chart's target set (unselected, unbound, their
    cells stay clear) as a DECLARED LOOK law: the glow is runtime material emission
    (F11), never bake content, and a bake's diffuse response must not quantise into
    the emitters' texels. Production control (probes/r4-kit-night/probe16: the fixed
    arch night preview, candles excluded vs selected-and-bound): the room's texels are
    IDENTICAL both ways — selected-and-bound objects DO ride the bake's ray tree; the
    naked plane/cube probe's black arm was texel OVERWRITE (the bound cube's dark
    diffuse response re-inking the plane's shared UV region), not tree exclusion. The
    winding fix, not the exclusion, lit the arch."""
    out = []
    for obj in meshes:
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or not mat.use_nodes:
                continue
            live = False
            for node in mat.node_tree.nodes:
                if (node.type == 'BSDF_PRINCIPLED'
                        and 'Emission Strength' in node.inputs
                        and node.inputs['Emission Strength'].default_value > 0.0):
                    live = True
                elif node.type == 'EMISSION' \
                        and node.inputs['Strength'].default_value > 0.0:
                    live = True
            if live:
                out.append(obj)
                break
    return out


def collapse_frame_backfaces(objects, layout_frames):
    """Bake-only lm-UV edit (restored right after the bake): every frame's 24 bar faces
    share ONE lightmap rect, and the bake's last-rasterized face wins each texel — the
    cells showed whichever single face (often a wall-facing back) finished last. The
    frame cell must read the room-facing fronts: every face whose normal is not aligned
    with the frame's facing collapses to a zero-area UV triangle. The glb is untouched
    (the runtime samples the SAME rect for every face; the collapse only chooses WHICH
    faces ink it during the bake)."""
    saved = []
    for obj in objects:
        if not obj.name.startswith('frame_'):
            continue
        index = int(obj.name.split('_')[1])
        facing = layout_frames[index]['facing']
        n = Vector((facing['x'], -facing['z'], facing['y']))  # glTF -> Blender
        layer = obj.data.uv_layers.get(LM_UV_LAYER)
        if layer is None:
            continue
        for poly in obj.data.polygons:
            if poly.normal.dot(n) < 0.9:
                for li in poly.loop_indices:
                    uv = layer.data[li]
                    saved.append((layer, li, uv.uv.copy()))
                    uv.uv = (-1.0, -1.0)
    return saved


def restore_frame_backfaces(saved):
    for layer, li, uv in saved:
        layer.data[li].uv = uv


def s2a_shell_object(objects):
    """The S2A passes' target object: the room's shell (the single datablock carrying the
    lm shelf with every S2A target's faces). Fail loud when absent — the pass table binds
    this room's builder."""
    shell = next((obj for obj in objects if obj.name == 'shell'), None)
    if shell is None:
        fail("the S2A pass found no 'shell' object in the arch chart's bake set")
    return shell


def s2a_proxy_objects():
    """The builder's BAKE_PROXIES part objects by name (the pass table's proxy vocabulary).
    Fail loud on any miss: the proxies are never-exported, render-hidden by default; an
    absent one means the builder and the pass table disagree."""
    out = {}
    for name in sorted({proxy for _t, _c, proxies in S2A_TARGETS for proxy in proxies}):
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != 'MESH':
            fail(f'the S2A pass table names proxy {name!r} and the scene carries no such '
                 "mesh object (the builder's BAKE_PROXIES collection) — fail loud")
        out[name] = obj
    return out


def s2a_target_faces(elements, target):
    """The shell polygons whose builder element is the S2A target (the roster order IS the
    mesh polygon order — the dump_layout belt's correspondence). Empty = fail loud."""
    faces = [i for i, element in enumerate(elements) if element == target]
    if not faces:
        fail(f'the S2A pass for {target!r} names no shell faces — the builder element map '
             'and the pass table disagree, fail loud')
    return faces


def s2a_covered_faces(shell, faces, proxy_objs, cage):
    """THE FLUSH-COVERED RECONCILIATION (see the S2A table's comment): a face whose CATCH
    line pierces one of the pass's proxies' solids poisons the pass's write — the catch
    samples the proxy's enclosed/buried faces (the springer blocks fill the ressaut seat
    wings EXACTLY (the S0 flush fact), so the seat faces' catch lines start inside the
    blocks). Probe: the catch ray itself — origin = the face centre offset cage along the
    normal, direction -normal — cast against the PASS'S PROXIES ONLY (world verts; the
    proxies are identity-transformed, the shell's convention). Poisoned iff the first hit
    is a BACK face (dot(normal_hit, probe_dir) > 0 — the ray entered the solid) within the
    cage band (distance <= cage * 1.0001; the block's flush underside sits at exactly
    cage). A proxy FRONT-face hit is the relief's legitimate catch and never excludes.
    The excluded faces keep the committed flat base (the seats are runtime-invisible: the
    blocks cover them, never exported). Returns the excluded polygon indices."""
    probe_bvh = BVHTree.FromPolygons(
        [tuple(obj.matrix_world @ v.co) for obj in proxy_objs for v in obj.data.vertices],
        [tuple(poly.vertices) for obj in proxy_objs for poly in obj.data.polygons],
    )
    layer = shell.data.uv_layers.get(LM_UV_LAYER)
    if layer is None:
        fail(f"mesh {shell.data.name!r} has no '{LM_UV_LAYER}' UV layer (the S2A pass)")
    polys = shell.data.polygons
    limit = cage * 1.0001 + 1e-9
    excluded = []
    for pi in faces:
        poly = polys[pi]
        origin = poly.center + poly.normal * cage
        direction = -poly.normal
        hit = probe_bvh.ray_cast(origin, direction, limit)
        if hit is not None and hit[0] is not None and hit[1].dot(direction) > 1e-6:
            excluded.append(pi)
    return excluded


def s2a_seam_faces(elements, target):
    """THE CORNER-SEAM EXCLUSION's fail-loud binding (see the S2A table's comment): the
    pinned census-derived face indices must exist and carry exactly this pass's element
    (the roster order IS the mesh polygon order — the dump-layout belt). Returns the
    indices; empty when the target pins none."""
    pinned = S2A_SEAM_FACES.get(target, ())
    for pi in pinned:
        if not 0 <= pi < len(elements) or elements[pi] != target:
            fail(f'the corner-seam exclusion names face {pi} for {target!r} but the '
                 "LM_FACE_ELEMENTS roster disagrees (the builder's roster order is the "
                 'mesh polygon order — the dump-layout belt) — fail loud')
    return pinned


def s2a_backdrop_refused_note():
    """THE REFUSED FORM (recorded, never wired): a per-target SUBSET mesh as the ray-catch
    backdrop (the target's own faces' geometry only, materials carried) was trialled and
    REFUSED by the bench — its catch wrote uniform ~0.9 (the sky response) into every
    target cell (measured: the arch cell 0.66-0.88 and the bay cell 0.88 vs the flat
    0.03-0.11; the backdrop-only control run — the proxies deselected — reproduced it, so
    the proxies were exonerated; the mesh's normals, material slots, winding order and
    smooth flags verified identical to the shell's). The whole-shell coincident copy
    reproduces the committed look on every target cell except the measured corner-seam
    bands (see the S2A table's comment). Kept as a note so the next session does not
    re-derive this."""


def collapse_s2a_faces(obj, faces):
    """Bake-only lm-UV edit (restored right after the pass): the non-target faces' lm UVs
    collapse to (-1, -1) so this pass's bake writes ONLY the target's cells (the
    collapse_frame_backfaces precedent; out-of-range UVs write no texels). The glb is
    untouched — the runtime samples the same cells through the unchanged mesh."""
    layer = obj.data.uv_layers.get(LM_UV_LAYER)
    if layer is None:
        fail(f"mesh {obj.data.name!r} has no '{LM_UV_LAYER}' UV layer (the S2A pass)")
    keep = set(faces)
    saved = []
    for pi, poly in enumerate(obj.data.polygons):
        if pi in keep:
            continue
        for li in poly.loop_indices:
            saved.append((li, layer.data[li].uv.copy()))
            layer.data[li].uv = (-1.0, -1.0)
    return saved, layer


def restore_s2a_faces(saved, layer):
    for li, uv in saved:
        layer.data[li].uv = uv


def save_witness(image, stage_dir, name):
    """The ZIMNY_BAKE_WITNESS instrument: a per-pass EXR snapshot of the bake image, read-only
    for the bake itself (the image pixels are never touched). Absent env -> no-op."""
    if os.environ.get('ZIMNY_BAKE_WITNESS') != '1':
        return
    witness_dir = stage_dir / 'witness'
    witness_dir.mkdir(parents=True, exist_ok=True)
    path = witness_dir / name
    image.filepath_raw = str(path)
    image.file_format = 'OPEN_EXR'
    image.save()
    print(f'ZIMNY_WITNESS {path}', flush=True)


def s2a_passes(scene, namespace, shell, pad_px, image, state, stage_root):
    """THE JUNCTION LAW'S S2A SEQUENCE for one state (day/dusk only — the S2A_STATES gate
    sits at the call site). The committed flat bake has already written the atlas
    (use_clear=True); these passes overwrite ONLY their own target's cells, in the fixed
    S2A_TARGETS order, each with use_clear=False (the write-order law in the S2A table's
    comment). Per pass: selected = {a coincident COPY of the target mesh (the same mesh
    data, the same transform — the ray-catch backdrop) + the target's assigned proxies};
    active = the shell (unselected — the scratch-validated S2A mechanics; a catch MISS
    keeps the prior texel value, measured on the bench).
    Everything flips per pass and restores in the
    finally block, so the dusk probe render (and every later step) sees exactly the
    committed scene."""
    elements = builder_constant(namespace, 'LM_FACE_ELEMENTS')
    proxies = s2a_proxy_objects()
    rows = []
    backdrop = None
    try:
        # THE RAY-CATCH BACKDROP: a coincident COPY of the target mesh (the same mesh
        # data, the same transform). THE MEASURED RECONCILIATION: a per-target SUBSET
        # mesh (the target's faces' geometry only) was trialled and REFUSED by the
        # bench: its catch wrote uniform ~0.9 (the sky response) into every target
        # cell (the flat-vs-S2A scratch references are in the round notes) — the
        # whole-shell copy reproduces the committed look on every target cell except
        # the measured corner-seam bands (the bay cells' spring edges where the catch
        # line crosses the cornice-top pocket and reads its enclosed darkness) — the
        # batch-C seam-face exclusion below now keeps those cells on the flat base
        # (S2A_SEAM_FACES + s2a_seam_faces; the derivation + counts in the table's
        # comment and the round record).
        backdrop = shell.copy()  # same mesh data, same transform
        scene.collection.objects.link(backdrop)
        for target, cage, proxy_names in S2A_TARGETS:
            faces = s2a_target_faces(elements, target)
            proxy_objs = [proxies[name] for name in proxy_names]
            covered = s2a_covered_faces(shell, faces, proxy_objs, cage)
            seam = s2a_seam_faces(elements, target)
            seam_set = set(seam)
            writable = [pi for pi in faces if pi not in set(covered) and pi not in seam_set]
            if not writable:
                fail(f'the S2A pass for {target!r} has no writable faces left after the '
                     'flush-covered + corner-seam exclusions — the assignment and the '
                     'geometry disagree, fail loud')
            saved, layer = collapse_s2a_faces(shell, writable)
            shell.data.uv_layers.active = layer
            flipped = []
            for name in proxy_names:
                proxy = proxies[name]
                proxy.hide_render = False  # light transport for THIS pass only
                flipped.append(proxy)
            for obj in scene.objects:
                obj.select_set(False)
            backdrop.select_set(True)
            for proxy in flipped:
                proxy.select_set(True)  # the catch BVH: the backdrop + this pass's proxies
            bpy.context.view_layer.objects.active = shell
            result = bpy.ops.object.bake(
                type='DIFFUSE',
                pass_filter={'DIRECT', 'INDIRECT'},
                margin=pad_px,
                margin_type='EXTEND',
                use_selected_to_active=True,
                cage_extrusion=cage,
                max_ray_distance=S2A_MAX_RAY_DISTANCE,
                target='IMAGE_TEXTURES',
                save_mode='INTERNAL',
                use_clear=False,
                uv_layer=LM_UV_LAYER,
            )
            if 'FINISHED' not in result:
                fail(f'the S2A pass for {target!r} returned {sorted(result)}')
            restore_s2a_faces(saved, layer)
            for proxy in flipped:
                proxy.select_set(False)
                proxy.hide_render = True
            target_file = ''.join(ch if ch.isalnum() else '-' for ch in target)
            save_witness(image, stage_root, f'{state}.witness-s2a-{target_file}.exr')
            rows.append({'cageM': cage, 'excludedFaces': len(covered), 'faces': len(faces),
                         'proxies': list(proxy_names), 'seamFaces': len(seam),
                         'target': target, 'writableFaces': len(writable)})
    finally:
        for obj in scene.objects:
            obj.select_set(False)
        for proxy in proxies.values():
            proxy.hide_render = True
        if backdrop is not None:
            bpy.data.objects.remove(backdrop, do_unlink=True)
    return rows


def print_summary(summary):
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True), flush=True)


def main():
    room, state, stage, preview, opts = parse_args()
    stage.mkdir(parents=True, exist_ok=True)
    namespace, scene, meshes = build_room(room, stage, state)
    charts = chart_contract(namespace)
    # The denoiser decision knob (DENOISE_ENV): absent = the committed OIDN path, byte-identical;
    # 'off' = a decision re-run encodes from the RAW plates (the verdict's decision tree).
    denoise_enabled = os.environ.get(DENOISE_ENV, '').strip().lower() != 'off'
    lm_grid = builder_constant(namespace, 'LM_GRID', required=False)
    samples = PREVIEW_SAMPLES if preview else BAKE_SAMPLES
    if opts.samples is not None:
        samples = opts.samples
    if preview:
        for spec in charts:
            spec['res'] = max(spec['res'] // 4, 256)
    if opts.res is not None:
        for spec in charts:
            spec['res'] = opts.res
    white_point = WHITE_POINT[room]
    if isinstance(white_point, dict):
        if state not in white_point:
            fail(f'the white-point table of {room} lacks state {state}')
        white_point = white_point[state]
    file_state = STATE_FILE[state]
    lm_dir = stage / 'lm'
    lm_dir.mkdir(parents=True, exist_ok=True)

    materials = ensure_materials(meshes)
    # Order law: the pane swap REBUILDS the pane materials' node trees — every capture of
    # pre-swap nodes would leave dead RNA for the probe's restore to touch (a headless abort
    # with no traceback). Capture AFTER the swap, BEFORE the fixtures are zeroed.
    swapped = (swap_panes_to_glass(materials, room)
               if state != 'nightChandeliers' and PANE_SWAP_DAY_DUSK.get(room, True) else [])
    rig_saved = capture_fixtures(materials)
    # D1 order law: the state tables apply AFTER the capture (the dusk probe still
    # restores the same captured nodes) and BEFORE the rig and the sun. The emission
    # tables carry their own skip laws (day/dusk pane = None); a fixture-table room
    # replaces the blanket fixtures-off law; the committed day law keeps running for
    # rooms without a fixture table (the siblings stay byte-identical).
    # D1 order amendment (st-george, DECISION-1 amendment 11): the pane table is an
    # ABSOLUTE override — it lands AFTER the fixtures-off zeroing, or the blanket law
    # clobbers the pane emission and the day bakes black (the jordan rows skip day/dusk
    # and the night runs no fixtures-off, so the other table rooms' outcomes unchanged).
    fixtures_off = state == 'day' or (state == 'dusk' and not DUSK_FIXTURES[room])
    if room in FIXTURE_BAKE_STRENGTH:
        apply_fixture_bake_strength(materials, room, state)
    elif fixtures_off:
        set_fixtures_off(materials)
    apply_pane_bake_emission(materials, room, state)
    # RIG_STATE_SCALE: the lamp rig exists only where the state's scale is > 0
    # (jordan day bakes with no rig — its light is the sun).
    rig = None
    if RIG_STATE_SCALE.get(room, {}).get(state, 0.0) > 0.0:
        rig = add_jordan_rig(scene, namespace, meshes,
                             scale=RIG_STATE_SCALE[room][state])
    if state == 'day' and opts.sun != 0.0:
        # opts.sun=0 skips the sun entirely (the world-only falsifier plate); a value
        # overrides SUN_STRENGTH for this run (the F2 decision bake never uses it).
        add_sun(scene, room, strength=opts.sun)
    build_world(scene, room, state, strength=opts.world)
    add_probe_camera(scene, room)
    configure_cycles(scene, samples)

    chart_rows = []
    arch_row = None
    files = []
    lm_layout = None  # the layout-identity law: the bake lm block, set per shelf-law room
    # The coverage gate's receiver law (brief 44's ruling §3): the summary's `receivers`
    # field = the arch chart's flat-bake target datablock names + the S2A targets. The
    # names are captured where they exist (below); the field lands emit-gated in the
    # summary assembly.
    arch_target_names = []
    s2a_target_names = []
    # bake.mjs passes the per-state dir (bake-<state> under the shared stage root — its own
    # law: never the bpy stage dir); the export summary, the sidecars and the manifest all
    # live at the ROOT.
    stage_root = stage.parent if stage.name.startswith('bake-') else stage
    # The emitter look law (see emissive_objects): the emitters stay untouched in the
    # scene and out of every chart's target set; per-room gate: EMITTER_EXCLUSION.
    exclude_emitters = EMITTER_EXCLUSION.get(room, False)
    emitter_names = ({obj.name for obj in emissive_objects(meshes)}
                     if exclude_emitters else set())
    # RG-F2 2.2: the stage spill rides AFTER the emitter scan (so the target sets stay
    # exactly as committed — verdict "target sets unchanged") and after the fixtures-off
    # law (so day cannot zero it): it applies in ALL THREE rigs.
    spill = apply_stage_spill(materials, room, state)
    # RG-F3: the declared panes' parallel STAGE_SPILL_PARTS rows apply at the SAME
    # insertion point (post-emit-scan, post-fixtures-off; never the pre-scan emission
    # path) — the door's row above is untouched and still the only STAGE_SPILL row.
    # The stock-take's 'doorcard' row rides the same call: its PART key resolves through
    # the exec namespace's LM_FACE_ELEMENTS (the element path is inert for the
    # material-keyed rows and for rooms whose builder declares no element map).
    pane_spill = apply_stage_spill_parts(materials, room, state,
                                         namespace=namespace, meshes=meshes)
    for spec in charts:
        prefix = '' if spec['name'] == 'arch' else 'kit-'
        configure_cycles(scene, samples)
        configure_bake(scene, spec['pad'])
        margin_px = spec['pad'] if BAKE_MARGIN_PX is None else BAKE_MARGIN_PX
        if preview:
            # the preview quarters res; the pad is pixel-space and must scale with it,
            # or the EXTEND margins overwrite whole 10-px cells of the neighbours
            margin_px = max(1, margin_px // 4)
        objects = [obj for obj in chart_objects(meshes, spec, charts)
                   if obj.name not in emitter_names]
        if not objects:
            fail(f"chart {spec['name']!r} of {room} selected no objects")
        chart_mats = ensure_materials(objects)
        bake_mats = duplicate_chart_materials(objects) if spec['objectPrefixes'] else chart_mats
        # 4.3 the observable: ensure_materials already returns every slotted material of
        # every chart object (the union is a no-op); the print is what the job greps.
        print('ZIMNY_BAKE_MATERIALS n=' + str(len(bake_mats)) + ' names=' +
              json.dumps(sorted(mat.name for mat in bake_mats)), flush=True)
        targets, reps = bake_targets(objects, room)
        if spec['name'] == 'arch':
            arch_target_names = sorted({obj.data.name for obj in targets})
        if room in LM_LAYOUT_LAW_ROOMS:
            # the layout-identity law: refuse to bake against a stale or divergent export
            # (the summary AND the layout both live at the stage root — one canonical place)
            lm_layout = assert_layout_identity(
                stage_root / 'summary.json', stage_root / f'bake-layout.{state}.json', state)
        if opts.dump_layout and lm_grid:
            dump_layout(lm_dir / 'layout.json', targets, lm_grid)
        collapsed = (collapse_frame_backfaces(objects, namespace['_LAYOUT']['frames'])
                     if spec['objectPrefixes'] else [])
        image = bake_lightmap(scene, meshes, targets, bake_mats, spec['res'], margin_px)
        if collapsed:
            restore_frame_backfaces(collapsed)
        save_witness(image, stage_root, f"{state}.witness-flat-{spec['name']}.exr")
        # THE JUNCTION LAW'S S2A PASSES (batch B; rastrelli-gallery day/dusk, the arch chart
        # only, never in preview): the committed flat bake above was the atlas's FIRST write
        # (use_clear=True); these passes overwrite only their own target's cells with
        # use_clear=False (the write-order law in the S2A table's comment). The night bake
        # and every sibling room skip this block entirely — the committed flat path.
        s2a_rows = None
        if (room == S2A_ROOM and state in S2A_STATES and spec['name'] == 'arch'
                and not preview):
            s2a_rows = s2a_passes(scene, namespace, s2a_shell_object(objects), margin_px,
                                  image, state, stage_root)
            s2a_target_names = sorted({row['target'] for row in s2a_rows})
        save_exr(image, lm_dir / f'{prefix}{file_state}.raw.exr')
        # The denoiser decision knob (see DENOISE_ENV): the committed path is the compositor
        # OIDN below; a decision re-run (ZIMNY_BAKE_DENOISE=off) encodes from the RAW plate —
        # the knob rides the summary's denoiser row so the landed form is on the record.
        if denoise_enabled:
            denoised = denoise_image(scene, image, lm_dir / f'{prefix}{file_state}.exr')
        else:
            save_exr(image, lm_dir / f'{prefix}{file_state}.exr')
            denoised = image
        paint = PANE_PAINT.get(room)
        # The 'atEncode' rooms (rastrelli-gallery) paint per PUBLISHED state at re-encode —
        # their states are composed of the rig EXRs here, so this bake-time application
        # would ink only one rig term. The 1812 row keeps firing below exactly as committed.
        if paint is not None and not paint.get('atEncode', False) and spec['name'] == 'arch':
            paint_pane_cells(denoised, pane_rects(namespace, paint['part']), paint[state])
        if white_point == 'percentile':
            # D1: the lm chart bakes EXR ONLY — no bake-time LDR PNG/ktx2. The stage
            # deliverables are the denoised EXR + the builder's own cells.json; the
            # encode pass (tools/lm-percentile.mjs -> reencode --transfer srgb) owns
            # publication and fills the D1-e encode rows. peak/clipped stay null: the
            # encoder measures its own clip fraction against the W_s it emits.
            row = {'clippedFraction': None,
                   'emitters': len(emitter_names),
                   'exrSha256': file_sha256(lm_dir / f'{prefix}{file_state}.exr'),
                   'name': spec['name'],
                   'objects': len(objects),
                   'pad': margin_px,
                   'peak': None,
                   'res': spec['res'],
                   'targets': len(targets)}
            chart_rows.append(row)
            if spec['name'] == 'arch':
                arch_row = row
            continue
        peak, clipped = encode_ldr(
            denoised, white_point, 'ZIMNY_LM_LDR', lm_dir / f'{prefix}{file_state}.png')
        rel = f'lm/{prefix}{file_state}.png'
        files.append((rel, lm_dir / f'{prefix}{file_state}.png'))
        row = {'clippedFraction': round(clipped, 4),
               'emitters': len(emitter_names),
               'exrSha256': file_sha256(lm_dir / f'{prefix}{file_state}.exr'),
               'name': spec['name'],
               'objects': len(objects),
               'pad': margin_px,
               'peak': round(peak, 4),
               'res': spec['res'],
               'targets': len(targets)}
        chart_rows.append(row)
        if spec['name'] == 'arch':
            arch_row = row

    probe = None
    if state == 'dusk':
        # D-6: the probe is the only environment the gilt ever sees and is scaled by
        # ADR-0013 — the warm candle highlights that make gilt glint at night must exist
        # in it: the rig's fixtures return to FULL for the probe render only.
        restore_fixtures(rig_saved)
        probe_dir = stage / 'probe'
        probe_dir.mkdir(parents=True, exist_ok=True)
        probe_image = render_probe(scene, probe_dir / 'dusk.exr')
        probe_png = probe_dir / 'dusk.png'
        probe_peak, probe_clipped = encode_ldr(
            probe_image, PROBE_WHITE_POINT, 'ZIMNY_PROBE_LDR', probe_png
        )
        files.append(('probe/dusk.png', probe_png))
        probe = {
            'clippedFraction': round(probe_clipped, 4),
            'peak': round(probe_peak, 4),
            'point': list(PROBE_POINT[room]),
            'res': list(PROBE_RES),
            'samples': PROBE_SAMPLES,
            'whitePoint': PROBE_WHITE_POINT,
        }

    cells_path = lm_dir / 'cells.json'
    cells_sha = file_sha256(cells_path) if cells_path.exists() else None
    summary = {
        'bakedObjects': sum(row['targets'] for row in chart_rows),
        'blender': bpy.app.version_string,
        'cellsSha256': cells_sha,
        'charts': chart_rows,
        'clippedFraction': arch_row['clippedFraction'],
        'denoiser': DENOISER if denoise_enabled else 'none',
        'device': 'CPU',
        'duskFixtures': DUSK_FIXTURES[room] if state == 'dusk' else None,
        'files': [{'bytes': os.path.getsize(path), 'rel': rel} for rel, path in files],
        'lmGrid': lm_grid,
        'margin': arch_row['pad'],
        'meshObjects': len(meshes),
        'panesSwapped': swapped,
        'peak': arch_row['peak'],
        'preview': preview,
        'probe': probe,
        'res': arch_row['res'],
        'rig': rig,
        'room': room,
        'samples': samples,
        'seconds': None,
        'state': state,
        'whitePoint': white_point,
    }
    # The stage-spill row exists ONLY for rooms that declare one (RG-F2 2.2): an absent
    # spill must not add a `"stageSpill": null` byte-diff to the siblings' summaries.
    if spill is not None:
        summary['stageSpill'] = spill
    # The representative picks land only where the centroid mode ran with multi-instance
    # groups (jordan's split rosters); every-else rooms keep their summaries byte-stable.
    if reps:
        summary['reps'] = reps
    # RG-F3 (the proof-law rows): paneApplied + paneProof land only for rooms that declare
    # pane spill rows; the door's spillApplied rows above are untouched.
    if pane_spill is not None:
        summary['paneApplied'] = pane_spill['paneApplied']
        summary['paneProof'] = pane_spill['paneProof']
    # RG-AUDIT batch B (the junction law): the S2A provenance lands ONLY when the S2A passes
    # ran (rastrelli-gallery day/dusk, the arch chart) — the standing emit-gated provenance
    # pattern (rig / reps / paneProof); every other room and the night state stay byte-stable.
    if s2a_rows is not None:
        summary['s2a'] = {'maxRayDistanceM': S2A_MAX_RAY_DISTANCE,
                          'passes': s2a_rows,
                          'writeOrder': S2A_WRITE_ORDER}
    # The layout-identity law's provenance row: lands ONLY for the shelf-law rooms (the
    # standing emit-gated pattern; every sibling's printed summary stays byte-stable).
    if lm_layout is not None:
        summary['lmLayout'] = {'layoutHash': lm_layout['layoutHash'],
                               'pxPerM': lm_layout['pxPerM'],
                               'faces': lm_layout['faces'],
                               'stripRowPx': lm_layout['stripRowPx'],
                               'state': state}
    # The coverage gate's receiver law (brief 44's ruling §3, v1): the per-state receiver
    # datablock names — the flat bake's selected targets' mesh datablock names + the S2A
    # targets (the elements whose cells the S2A passes write; they all live on the shelf
    # datablock). Lands ONLY for the layout-law rooms (the standing emit-gated provenance
    # pattern); every sibling's printed summary stays byte-stable. The field lands in the
    # per-state bake-summary.<state>.json SIDECAR at the stage root, not the committed log;
    # tools/reencode-coverage.py consumes it fail-closed (a missing field = a summary that
    # predates the law).
    if room in LM_LAYOUT_LAW_ROOMS:
        summary['receivers'] = sorted(set(arch_target_names) | set(s2a_target_names))
    print_summary(summary)
    # The state's sidecar (new; the summary was print-only): the same dict, for the manifest
    # step's identity assertion and the job's evidence capture.
    sidecar = stage_root / f'bake-summary.{state}.json'
    sidecar.write_text(json.dumps(summary, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    print(f'ZIMNY_BAKE_SIDECAR {sidecar}', flush=True)


def run():
    try:
        main()
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001 — a loud non-zero exit is the contract
        traceback.print_exc()
        fail('bake failed (traceback above)')


run()
