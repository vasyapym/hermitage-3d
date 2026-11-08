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

ROOMS = ('rastrelli-gallery', 'jordan', 'military-gallery')
STATES = ('day', 'dusk', 'nightChandeliers')
STATE_ALIASES = {'night': 'nightChandeliers'}
STATE_FILE = {'day': 'day', 'dusk': 'dusk', 'nightChandeliers': 'night'}
LM_UV_LAYER = 'lm'
BPY_DIR = Path(__file__).resolve().parent

# ---- Declared numbers (FILL: the orchestrator tunes these from the first real bake logs) ----
# Directions are in the glTF/three frame (+X east, +Y up, +Z south), unit, pointing TO the sun.
DAY_SUN_DIR = (0.9016, 0.2591, -0.3463)      # FILL: +15 deg plateau, 2026-06-22 06:18 UTC+3
DUSK_WORLD_DIR = (0.0000, -0.1150, -0.9930)  # FILL: -6.6 deg one-hot centre, 00:50 UTC+3
SUN_STRENGTH = 4.0        # FILL — new default; MASKED-IN-BRIEF: keep the SUN_STRENGTH value
SUN_ANGLE_DEG = 0.53      # solar disc
# FILL — new defaults; MASKED-IN-BRIEF: keep the WORLD_STRENGTH values
WORLD_STRENGTH = {'day': 1.0, 'dusk': 0.08, 'nightChandeliers': 0.0}
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
}
PROBE_YAW_DEG = 0.0       # FILL — aligned against three's equirect convention in 17b
# FILL — per-room pane material names for the committed swap law (D-13's table; the empty
# row = the gallery has no pane geometry). MASKED-IN-BRIEF: keep the committed names
PANE_MATERIALS = {
    'rastrelli-gallery': (),
    'jordan': ('pane',),
    'military-gallery': ('MG_glass',),
}
# R4 D-3: the dusk rig's fixtures per room — False composes the candelabra third at
# re-encode time (tools/lm-recipes.mjs) instead of baking a third-emission rig.
DUSK_FIXTURES = {'rastrelli-gallery': True, 'jordan': True, 'military-gallery': False}
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
        'day': (0.55, 0.58, 0.62),
        'dusk': (0.45, 0.32, 0.17),
        'nightChandeliers': (0.60, 0.42, 0.22),
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
EMITTER_EXCLUSION = {'military-gallery': True, 'rastrelli-gallery': True}

# ---- D1 (jordan slice 2): the per-room outcome tables — every other room keeps the
# exact committed path (absent room row = the room is not in the table) --------------

# B (D1): an absolute Emission override on the pane material, applied AFTER the swap and
# the capture (restore law untouched). day/dusk None = skip: the swap rebuilds the pane
# tree WITHOUT an Emission node (no bake vehicle; the swap + world carry the window
# light); night carries the real pane term as rgb + strength.
PANE_BAKE_EMISSION = {
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
    'jordan': {
        'sconce_glow': {'day': 0.0, 'dusk': 1.0, 'nightChandeliers': 1.0},
        'chandelier_glow': {'day': 0.0, 'dusk': 1.0, 'nightChandeliers': 1.0},
    },
}
# C (D1): the lamp rig lights a state only where its scale is > 0 (jordan day bakes with
# no rig — its light is the sun).
RIG_STATE_SCALE = {'jordan': {'day': 0.0, 'dusk': 1.0, 'nightChandeliers': 1.0}}
# D (D1): the per-template lm representative law for instanced props — 'first' keeps the
# committed deterministic-first-object selection; jordan's 'centroid' picks the instance
# nearest the roster's centroid.
BAKE_TEMPLATE_INSTANCE = {'jordan': 'centroid'}

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
    return args.room, state, Path(out).resolve(), args.preview


def build_room(room, stage):
    # Factory-empty scene, then exec the committed builder with ZIMNY_BAKE=1 so it populates
    # bpy.data and (guard patch) skips the glb export + its ZIMNY_SUMMARY line.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source_path = BPY_DIR / f'{room}.py'
    if not source_path.exists():
        fail(f'no committed builder at {source_path}')
    saved_argv = sys.argv
    # The builders parse their own argv; hand them exactly their grammar (no --state).
    sys.argv = [sys.argv[0], '--', '--room', room, '--out', str(stage)]
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': str(source_path)}
    try:
        code = compile(source_path.read_text(encoding='utf-8'), str(source_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
    scene = bpy.context.scene
    meshes = [obj for obj in scene.objects if obj.type == 'MESH' and not obj.hide_render]
    if not meshes:
        fail(f'the {room} builder produced no renderable mesh objects')
    return namespace, scene, meshes


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


def add_sun(scene):
    data = bpy.data.lights.new('ZIMNY_SUN', 'SUN')
    data.energy = SUN_STRENGTH
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


def add_jordan_rig(scene, namespace, meshes):
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
        data.energy = row['power_W']
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
        'totals_W': {'chandelier': len(drops) * JORDAN_RIG_RING['power_W']
                     + JORDAN_RIG_CORE['power_W'],
                     'sconces': len(sconces) * JORDAN_RIG_SCONCE['power_W']},
    }


def build_world(scene, state):
    world = bpy.data.worlds.new('ZIMNY_BAKE_WORLD')
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    output = tree.nodes.new('ShaderNodeOutputWorld')
    background = tree.nodes.new('ShaderNodeBackground')
    background.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    base = WORLD_STRENGTH[state]
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
    for name in sorted(grouped):
        group = grouped[name]
        if mode == 'centroid' and len(group) > 1:
            centre_x = sum(obj.location.x for obj in group) / len(group)
            centre_y = sum(obj.location.y for obj in group) / len(group)
            centre_z = sum(obj.location.z for obj in group) / len(group)
            chosen = min(group, key=lambda obj: ((obj.location.x - centre_x) ** 2
                                                 + (obj.location.y - centre_y) ** 2
                                                 + (obj.location.z - centre_z) ** 2,
                                                 obj.name))
        else:
            chosen = group[0]
        targets.append(chosen)
    return targets


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


def print_summary(summary):
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True), flush=True)


def main():
    room, state, stage, preview = parse_args()
    stage.mkdir(parents=True, exist_ok=True)
    namespace, scene, meshes = build_room(room, stage)
    charts = chart_contract(namespace)
    lm_grid = builder_constant(namespace, 'LM_GRID', required=False)
    samples = PREVIEW_SAMPLES if preview else BAKE_SAMPLES
    if preview:
        for spec in charts:
            spec['res'] = max(spec['res'] // 4, 256)
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
    swapped = swap_panes_to_glass(materials, room) if state != 'nightChandeliers' else []
    rig_saved = capture_fixtures(materials)
    # D1 order law: the state tables apply AFTER the capture (the dusk probe still
    # restores the same captured nodes) and BEFORE the rig and the sun. The emission
    # tables carry their own skip laws (day/dusk pane = None); a fixture-table room
    # replaces the blanket fixtures-off law; the committed day law keeps running for
    # rooms without a fixture table (the siblings stay byte-identical).
    apply_pane_bake_emission(materials, room, state)
    fixtures_off = state == 'day' or (state == 'dusk' and not DUSK_FIXTURES[room])
    if room in FIXTURE_BAKE_STRENGTH:
        apply_fixture_bake_strength(materials, room, state)
    elif fixtures_off:
        set_fixtures_off(materials)
    # RIG_STATE_SCALE: the lamp rig exists only where the state's scale is > 0
    # (jordan day bakes with no rig — its light is the sun).
    rig = None
    if RIG_STATE_SCALE.get(room, {}).get(state, 0.0) > 0.0:
        rig = add_jordan_rig(scene, namespace, meshes)
    if state == 'day':
        add_sun(scene)
    build_world(scene, state)
    add_probe_camera(scene, room)
    configure_cycles(scene, samples)

    chart_rows = []
    arch_row = None
    files = []
    # The emitter look law (see emissive_objects): the emitters stay untouched in the
    # scene and out of every chart's target set; per-room gate: EMITTER_EXCLUSION.
    exclude_emitters = EMITTER_EXCLUSION.get(room, False)
    emitter_names = ({obj.name for obj in emissive_objects(meshes)}
                     if exclude_emitters else set())
    # RG-F2 2.2: the stage spill rides AFTER the emitter scan (so the target sets stay
    # exactly as committed — verdict "target sets unchanged") and after the fixtures-off
    # law (so day cannot zero it): it applies in ALL THREE rigs.
    spill = apply_stage_spill(materials, room, state)
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
        targets = bake_targets(objects, room)
        collapsed = (collapse_frame_backfaces(objects, namespace['_LAYOUT']['frames'])
                     if spec['objectPrefixes'] else [])
        image = bake_lightmap(scene, meshes, targets, bake_mats, spec['res'], margin_px)
        if collapsed:
            restore_frame_backfaces(collapsed)
        save_exr(image, lm_dir / f'{prefix}{file_state}.raw.exr')
        denoised = denoise_image(scene, image, lm_dir / f'{prefix}{file_state}.exr')
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
        'denoiser': DENOISER,
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
    print_summary(summary)


def run():
    try:
        main()
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001 — a loud non-zero exit is the contract
        traceback.print_exc()
        fail('bake failed (traceback above)')


run()
