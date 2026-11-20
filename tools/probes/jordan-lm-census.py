# tools/probes/jordan-lm-census.py — the bands round's census instrument (COMMITTED code;
# run only at the round's read phases — never by CI; Blender headless).
#
#   blender -b --factory-startup -noaudio -P tools/probes/jordan-lm-census.py -- \
#     --builder <tools/bpy/jordan.py of the checkout whose layout the plates carry> \
#     --out <census stage dir> \
#     --plates day=<...exr>,duskChandeliers=<...exr>,nightChandeliers=<...exr>[,worldonly=<...exr>] \
#     [--w day=0.45,duskChandeliers=0.35,nightChandeliers=4.0]
#
# What it does (the bands round's enumerate-first ruling): rebuilds the room's scene from
# the committed builder (ZIMNY_BAKE=1 — geometry only; the builder writes lm/cells.json
# and returns before any glb/summary work), walks every mesh face to its lm cell
# (cells.json's per-object consecutive runs: first_cell + face index), classifies every
# cell into the band surfaces (shafts / bases / frames / the north field's band bins /
# the reveals / south / east / west walls / floor / ceiling / cornice), samples each
# census plate per cell over the normalized interior rect, and prints the ruling table:
# raw mean/p10/p90 per state, the predicted stored mean (OETF of clip(raw / W)), and the
# Δ columns (Δpolicy = shaft plaster − north upper flank; Δtier = north upper flank −
# spandrel; the world-only plate's south/floor/ceiling-vs-north ratios = the
# glass-throttle falsifier).
#
# The census NEVER bakes. The plates are produced separately: the committed chain's
# --preview mode is exactly the census spec (quarter res, PREVIEW_SAMPLES, quartered
# margin) and the pre-split tree needs no extra flags; the world-only falsifier runs
# bake.py --sun 0 in the split tree (the shell's cells are unchanged by the split, so
# its field bins read the same indices).
#
# ETC1S note: a per-region Δenc column is not separable without decoding the ktx2; the
# committed global dark-median loss (−22 at stored ~70, the 2c method) stands in for it,
# and the encode ruling happens at the chain's re-measure (bar B5), not here.
#
# ---------------------------------------------------------------------------
# The jordan-fixtures round (batch B0) — ADDITIVE flags only: with none of the B0 flags
# below, every byte of the output above (stdout lines and <out>/census.json) is unchanged
# for every argv the committed tool accepted (it REQUIRED --builder/--out/--plates; the
# B0 verify line omits them, so they are now optional with this checkout's committed-path
# defaults — an argv the committed tool rejected has no committed output to protect), and
# the new sections print after ZIMNY_CENSUS-END under their own ZIMNY_CENSUS-B0 markers.
# What each addition quotes, once:
#
# D1 --frame-share: the 7 rail stops (rooms/jordan/contract.ts — the stop position IS
# the eye: feet + 1.7), aimed at the stop's subject, vertical FOV CAMERA_VFOV_DEG = 55
# (src/camera/portrait-frame.ts:16 «LAW: the one source of the vertical FOV»), 1280×720.
# Geometry-only, state-independent, ONE pass set: a flat object-ID raycast per pixel
# centre over the FULL built scene (one BVH, no lights, no renderer), so a fixture
# hidden behind a wall counts nothing. Rows = stops; columns = sconce body / sconce
# glow / chandelier body / chandelier glow as % of frame, plus per-instance pixel
# counts and the camera→instance distance (m). The chandelier datablock is built
# in-place (its object origin sits at 0,0,0), so its bbox-centre distance rides beside
# the literal origin distance.
#
# D2 --per-object (+ --free-blocks): from cells.json — per lightmapped datablock the
# cells (the committed law is ONE cell per mesh FACE, so islands == faces == cells
# touched == cells owned exclusively today), the texel area, the per-primitive
# material split; the two placeholder fixtures' rows carry their glow areas and world
# bboxes (the GLOW_AREA_PARITY and CHANDELIER_ENVELOPE baselines); the free-cell map
# (the 64×64 atlas minus the allocated keys) and its largest cell-aligned free
# rectangles — the FIXTURE_LM_BLOCK candidates (each ≥ the B4 sconce estimate, a
# 64×32 px strip = 2 cells) and the chosen block (≤ FIXTURE_LM_BLOCK_CELLS = 6).
# ATLAS_HASH: sha256 over every DISTINCT TEXCOORD_1 accessor's STORED glb payload
# bytes in mesh order (meshopt-compressed views hash their EXT_meshopt_compression
# stored range; shared accessors hash once) — the AS-1 atlas baseline name.
#
# D4 --clamp-baseline: per state — the raw pre-clamp percentile P (the lm-percentile
# order statistic: np.partition(L, k)[k], k = floor(p/100·(n−1)), p = 99.5, over the
# allocated-interior Rec.709 luminance EXCLUDING the pane/glow emitter chips), the
# band (tools/gltf/jordan.mjs LM_ENCODE.clamp), W (the manifest's lightmaps.intensity),
# the clamp side (which band edge W sits on), the margin |P − W| / W, and the clipped
# fraction (texels above W). When the staged bake EXRs exist they are re-measured
# exactly like tools/bpy/lm_percentile.py (plus, for night, per rig light max/p99
# within 1.5 m); when they are MISSING the committed bake-log encode rows carry the
# same statistics (measured on this exact bake chain) and the degradation is recorded
# in the report. The committed jordan-dark-median figure rides in the report.
#
# D5 --assert-max N + the self-check: --assert-max fails loud when the cells count
# exceeds N (the K1 gate). The extended report self-checks cells / draws / drawn
# triangles / W against main @ 3da446d (a miss means the probe is wrong — fix the
# probe, never the room; a legitimate cells.json drift STOPs the census) and ends
# with EXACTLY ONE decision line (ADMIT-FULL / ADMIT-SCONCES-ONLY / FALSIFIED) plus
# the J4 line. The decision needs all four analysis flags (--per-object --free-blocks
# --frame-share --clamp-baseline) because it reads every one of them.

import argparse
import hashlib
import json
import math
import pathlib
import re
import struct
import sys
import os

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import bpy


# --- the jordan-fixtures B0 constants (every one quoted from its committed source) ---
B0_CHECKOUT = pathlib.Path(__file__).resolve().parents[2]
B0_GLB = pathlib.Path('public/assets/jordan/jordan.glb')
B0_MANIFEST = pathlib.Path('public/assets/jordan/manifest.json')
B0_BAKE_LOG = pathlib.Path('tools/bake-logs/jordan.json')
B0_STAGE = pathlib.Path('node_modules/.cache/zimny-asset-stage/jordan')

CAMERA_VFOV_DEG = 55.0  # src/camera/portrait-frame.ts:16 «LAW: the one source of the vertical FOV»
FRAME_SIZE = (1280, 720)  # the D1 render size (16:9)
CLAMP_BANDS = {'day': (0.2, 0.45), 'duskChandeliers': (0.35, 0.45),
               'nightChandeliers': (4.0, 4.5)}  # tools/gltf/jordan.mjs LM_ENCODE.clamp
LM_PERCENTILE_P = 99.5  # LM_ENCODE.percentile (the bake-log rows record the same)
EXCLUDED_EMITTERS = ('pane', 'sconce_glow', 'chandelier_glow')  # LM_ENCODE.excludeMaterials
FIXTURE_DATABLOCKS = ('sconce', 'chandelier', 'chandelier_arm', 'chandelier_bead')  # jordan.py's
# runner rows — the placeholders ('sconce', 'chandelier') today; the B2 slice_e build
# carries the chandelier assembly's archetypes too (the extra names are inert for every
# committed placeholder input)
FIXTURE_LM_BLOCK_CELLS = 6  # B4's NO-REPACK law
SCONCE_NEED_CELLS = 2  # the B4 estimate's shape (a 64×32 px strip); B1's packer re-measures
STOPS = (  # rooms/jordan/contract.ts, glTF coords: (id, eye = the stop position, subject)
    ('J0', (67.2, 1.7, -67.6), (69.2, 7.5, -84.0)),
    ('J1', (67.2, 4.1, -73.5), (69.2, 7.5, -84.0)),
    ('J1b', (67.2, 6.7, -79.0), (75.1, 9.5, -85.5)),
    ('J2', (68.6, 6.7, -83.3), (82.0, 11.7, -83.6)),
    ('J2b', (74.5, 9.1, -83.3), (82.0, 11.7, -83.6)),
    ('J3', (80.4, 11.7, -83.3), (92.0, 13.0, -74.0)),
    ('J4', (82.5, 11.7, -78.5), (92.0, 13.0, -74.0)),
)
# D5 self-check pins (main @ 3da446d): a miss means the probe is wrong — fix the probe,
# never the room; if cells.json legitimately differs, STOP and report.
SELF_CHECK = {'cells': 3474, 'draws': 38, 'drawnTris': 21872,
              'w': {'day': 0.45, 'duskChandeliers': 0.35, 'nightChandeliers': 4.0}}
# The jordan-fixtures B1 self-check pins (the slice_e form): the sconce row swaps the
# placeholder's 2 primitives/24 tris ×10 for the archetype's 3/361 ×10 — draws
# 38 − 2 + 3 = 39 (the unique-primitive gate), drawn tris 21,872 − 240 + 3,610 = 25,242;
# cells stay 3,474 (the sub-cell packer keeps the datablock's own 12 cells) and the W
# record is untouched (no bake in B1).
SELF_CHECK_B1 = {'cells': 3474, 'draws': 39, 'drawnTris': 25242,
                 'w': {'day': 0.45, 'duskChandeliers': 0.35, 'nightChandeliers': 4.0}}
# The jordan-fixtures B2 self-check pins (the slice_e form with the chandelier
# assembly): the placeholder chandelier's 2 primitives/356 tris ×1 swap for the stem's
# 1/444 + the arm archetype's 3/121 ×36 + the bead's 1/8 ×300 — draws 39 − 2 + 5 = 42
# (the unique-primitive gate, the round's exact ceiling), drawn tris 25,242 − 356 +
# (444 + 4,356 + 2,400) = 32,086; cells stay 3,474 (the three datablocks split exactly
# the retired 214) and the W record is untouched (no bake in B2).
SELF_CHECK_B2 = {'cells': 3474, 'draws': 42, 'drawnTris': 32086,
                 'w': {'day': 0.45, 'duskChandeliers': 0.35, 'nightChandeliers': 4.0}}
DARK_MEDIAN_COMMITTED = {  # docs/STATE.md 2026-11-17: the q128 re-measure at the wave's close
    'global': {'day': -1, 'dusk': 0, 'nightChandeliers': -1},
    'dark': {'day': 1, 'dusk': 0, 'nightChandeliers': -1},
    'source': ('docs/STATE.md 2026-11-17 — the jordan-dark-median re-measure: global −1/0/−1 · '
               'dark +1/0/−1 (the ORIENTATION law: the transcoder rows are top-down)'),
}
CHANDELIER_PINNED = {'tierRadius': (1.40, 1.00, 0.60), 'tierDy': 0.85, 'tiers': 3,
                     'source': 'the ruling B2 (tools/bpy/jordan_fixtures.py constants, stage 2)'}
# The jordan-fixtures review (P2-8): the envelope reference is the IMMUTABLE
# placeholder envelope — the placeholder chandelier's own glTF extremes grown
# 0.10 per side, MEASURED once from the committed builder's constants at main
# @ 3da446d (tools/bpy/jordan.py: CHAND_C (86.0, -74.0), CHAND_DROP_R 1.5,
# CHAND_DROP[0] 0.12 — the 8 drop octahedra reach x/z ±(1.5 + 0.12) of (86, -74),
# wider than the ring's outer radius 1.6; CHAND_CORE_Y 14.2 − CHAND_CORE[1] 0.8
# = the core octahedron's lower apex 13.4; CHAND_ROD_TOP 19.9) — and hard-coded
# here so neither a foreign --builder's namespace nor the assembly's own bbox
# can move the fence. The assembly is judged against THIS box (da19680:
# «envelope ⊆ placeholder +0.10/side»); comparisons stay unrounded internally.
PLACEHOLDER_ENVELOPE_GLTF = (84.28, 13.30, -75.72, 87.72, 20.00, -72.28)
PLACEHOLDER_ENVELOPE_SOURCE = (
    'the placeholder chandelier\'s own glTF extremes at main @ 3da446d '
    '(tools/bpy/jordan.py CHAND_C (86.0, -74.0), CHAND_DROP_R 1.5, CHAND_DROP[0] '
    '0.12, CHAND_CORE_Y 14.2, CHAND_CORE[1] 0.8, CHAND_ROD_TOP 19.9), grown 0.10 '
    'per side — hard-coded (immutable), not the assembly\'s own bbox')
# CHANDELIER_MIN_Y (the B2 min-y fence, da19680: «min y 13.41 ≥ 13.4»): the
# placeholder's own lowest glTF y — the core octahedron's lower apex; the
# assembly's lowest y may never dip below it.
CHANDELIER_MIN_Y_GLTF = 13.4
# The jordan-fixtures review (P2-7): the EXACT per-datablock instance counts —
# a miss is fatal to the census (main stops before any decision). The B2
# assembly form (da19680): the stem ×1, the arm archetype ×36 (16/12/8 across
# the pinned tiers), one bead ×300, the sconce archetype ×10. The placeholder
# form (and B1's slice_e sconce row): 10 + 1 = 11.
EXPECTED_FIXTURE_INSTANCES = {
    'assembly': {'sconce': 10, 'chandelier': 1, 'chandelier_arm': 36,
                 'chandelier_bead': 300},
    'placeholder': {'sconce': 10, 'chandelier': 1},
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='jordan-lm-census.py')
    # --builder/--out/--plates stay byte-compatible when passed; the jordan-fixtures B0
    # verify line omits them, so each now defaults to this checkout's committed paths
    # (the builder's own stage convention for --out). --plates empty = no plate pass.
    parser.add_argument('--builder', default=None,
                        help="path to the checkout's jordan.py whose layout the plates carry "
                             f'(default {B0_CHECKOUT / "tools/bpy/jordan.py"})')
    parser.add_argument('--out', default=None, help='census stage dir (cells.json lands here) '
                        f'(default {B0_CHECKOUT / B0_STAGE})')
    parser.add_argument('--plates', default='',
                        help='comma list of state=path pairs; states: day, duskChandeliers, '
                             'nightChandeliers, worldonly (default: none)')
    parser.add_argument('--w', default=None, help='comma list of state=W overrides')
    # --- the jordan-fixtures B0 additions (additive; nothing above moved) ---
    parser.add_argument('--per-object', action='store_true',
                        help='D2: the per-datablock cell ledger (fixtures, texel areas, ownership)')
    parser.add_argument('--free-blocks', action='store_true',
                        help='D2: the free-cell map and its largest cell-aligned free rectangles')
    parser.add_argument('--frame-share', action='store_true',
                        help='D1: the 7-stop fixture frame-share table (geometry-only ID pass)')
    parser.add_argument('--clamp-baseline', action='store_true',
                        help='D4: the per-state raw percentile / band / W / margin / clipped fraction')
    parser.add_argument('--assert-max', type=int, default=None, metavar='N',
                        help='D5: fail loud when the cells count exceeds N (the K1 gate)')
    parser.add_argument('--json', default=None, metavar='PATH',
                        help='write the extended report to PATH in addition to <out>/census.json')
    # --- the jordan-fixtures B1 addition (additive; nothing above moved) ---
    parser.add_argument('--uv2-subset-hash', action='store_true',
                        help='B1: sha256 over the NON-fixture TEXCOORD_1 accessor stored '
                             'payload bytes in mesh order (the ATLAS_HASH law minus the '
                             'fixture datablocks) — the NO-REPACK gate')
    parser.add_argument('--uv2-baseline', default=None, metavar='PATH',
                        help='B1: the baseline glb (3da446d) to compare the subset hash '
                             'against; without it only this checkout\'s hash is computed')
    # --- the jordan-fixtures B2 addition (additive; nothing above moved) ---
    parser.add_argument('--uv2-fixture-baseline', default=None, metavar='PATH',
                        help='B2: the baseline glb (B1 e7db9e6) to compare the per-datablock '
                             'fixture subset hashes against — the sconce archetype\'s UV2 '
                             'must be byte-identical to B1 while the chandelier assembly\'s '
                             'is new')
    args = parser.parse_args(argv)
    # The jordan-fixtures review (P1-2): the baseline arguments are loud — a
    # --uv2-baseline / --uv2-fixture-baseline without the enabling --uv2-subset-hash
    # is an error, never a silent ignore (the committed tool never accepted the
    # uv2 flags, so no protected output exists for this argv).
    if (args.uv2_baseline or args.uv2_fixture_baseline) and not args.uv2_subset_hash:
        parser.error('--uv2-baseline/--uv2-fixture-baseline require --uv2-subset-hash '
                     '(the NO-REPACK gate) — a baseline without the enabling hash flag '
                     'is not silently ignored')
    builder = pathlib.Path(args.builder) if args.builder else B0_CHECKOUT / 'tools' / 'bpy' / 'jordan.py'
    out = pathlib.Path(args.out) if args.out else B0_CHECKOUT / B0_STAGE
    plates = {}
    if args.plates:
        for pair in args.plates.split(','):
            state, _, path = pair.partition('=')
            if not state or not path:
                parser.error(f'--plates pair {pair!r} must be state=path')
            plates[state] = pathlib.Path(path)
    w = {'day': 0.45, 'duskChandeliers': 0.35, 'nightChandeliers': 4.0, 'worldonly': 0.45}
    if args.w:
        for pair in args.w.split(','):
            state, _, value = pair.partition('=')
            w[state] = float(value)
    flags = {'per_object': args.per_object, 'free_blocks': args.free_blocks,
             'frame_share': args.frame_share, 'clamp_baseline': args.clamp_baseline,
             'assert_max': args.assert_max, 'json': args.json,
             'uv2_subset_hash': args.uv2_subset_hash,
             'uv2_baseline': pathlib.Path(args.uv2_baseline) if args.uv2_baseline else None,
             'uv2_fixture_baseline': (pathlib.Path(args.uv2_fixture_baseline)
                                      if args.uv2_fixture_baseline else None)}
    return builder, out, plates, w, flags


def build_scene(builder_path, stage):
    """bake.py's build_room pattern: a factory-empty scene, then exec the committed
    builder with ZIMNY_BAKE=1 (geometry only: the builder writes lm/cells.json and
    returns early; the exec'd namespace keeps its constants for the band bands)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not builder_path.exists():
        raise SystemExit(f'census: no builder at {builder_path}')
    saved_argv = sys.argv
    saved_env = os.environ.get('ZIMNY_BAKE')
    sys.argv = [sys.argv[0], '--', '--room', 'jordan', '--out', str(stage)]
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': str(builder_path)}
    try:
        code = compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
        if saved_env is None:
            os.environ.pop('ZIMNY_BAKE', None)
        else:
            os.environ['ZIMNY_BAKE'] = saved_env
    cells_path = stage / 'lm' / 'cells.json'
    if not cells_path.exists():
        raise SystemExit(f'census: the builder wrote no cells.json at {cells_path}')
    cells_map = json.loads(cells_path.read_text(encoding='utf-8'))
    meshes = [obj for obj in bpy.context.scene.objects
              if obj.type == 'MESH' and not obj.hide_render]
    return namespace, cells_map, meshes


def datablock_family(name):
    """The band-surface family of a datablock; the split tree's _n/_s/_e/_lo/_hi suffixes
    fold into the pre-split single names so one census serves both trees."""
    if 'pilaster_base' in name:
        return 'pilaster_base'
    if 'pilaster' in name:
        return 'pilaster'
    if 'window_frame' in name:
        return 'window_frame'
    if name == 'cornice':
        return 'cornice'
    return 'other'


def shell_bin(centre, normal, win_x, tiers):
    """The shell's band bins by the face centroid + normal, in BLENDER space (the
    builder's to_b: glTF (x, y, z) -> Blender (x, -z, y) — the north wall is the plane
    y = +86 with the field facing -y, the south wall y = +62 facing +y, the east wall
    x = +92 facing -x, the west x = +66 facing +x, the floor z = 0 facing +z, the
    heights ride z)."""
    x, y, z = (float(v) for v in centre)
    nz, ny, nx = float(normal[2]), float(normal[1]), float(normal[0])
    if y > 86.05:  # the reveal recess faces (glTF z in -86.6..-86)
        if abs(nx) > 0.5:
            return 'reveal_jamb'
        if nz > 0.5:
            return 'reveal_sill'
        if nz < -0.5:
            return 'reveal_head'
        return 'reveal_other'
    if ny < -0.5 and y >= 85.9:  # the north wall field (faces the room, -y)
        upper_sill, upper_head = tiers[1]
        lower_sill = tiers[0][0]
        for cx in win_x:
            dx = x - cx
            if 1.05 <= dx <= 1.95 and upper_sill - 0.4 <= z <= upper_head + 0.2:
                return 'north_upper_flank'
        if abs(z - (tiers[0][1] + upper_sill) / 2) < (upper_sill - tiers[0][1]) / 2 \
                and any(abs(x - cx) <= 1.1 for cx in win_x):
            return 'north_spandrel'
        if z > upper_head + 0.2 and z < 17.6:
            return 'north_head_zone'
        if z < lower_sill - 0.3:
            return 'north_below_lower'
        return 'north_field_other'
    if ny > 0.5 and y <= 62.1:
        return 'south_wall'
    if abs(nx) > 0.5 and abs(ny) < 0.5:
        return 'east_wall' if x > 80.0 else 'west_wall'
    if nz > 0.5:
        return 'floor'
    if nz < -0.5:
        return 'ceiling'
    return 'shell_other'


def validate_packed_schema(cells_map, meshes):
    """The jordan-fixtures review (P2-5): the packed-fixture sidecar schema
    validates BEFORE any classification, so the readers can never silently
    revert to the committed one-face/one-cell model. Under the archetype form a
    fixture datablock whose allocated cells are FEWER than its faces is packed
    and MUST carry its faceCellMap (length == the template's polygon count) and
    fixtureLm (cells == the datablock's own allocated run); every mapped linear
    cell belongs to that datablock (never another owner's) and no non-fixture
    datablock appears in the maps. Under the placeholder form the sidecars'
    presence is tolerated and noted (the committed form never writes them) —
    the note rides the b0 report when one is built."""
    face_cells = cells_map.get('faceCellMap') or {}
    fixture_lm = cells_map.get('fixtureLm') or {}
    templates = {}
    for obj in meshes:
        templates.setdefault(obj.data.name, obj.data)
    sconce = templates.get('sconce')
    sconce_prims = (sum(1 for material in sconce.materials if material is not None)
                    if sconce is not None else 0)
    scene_is_slice_e = 'chandelier_arm' in templates or sconce_prims >= 3
    grid = int(cells_map.get('grid', 64))
    allocated = {}
    for key, row in cells_map['cells'].items():
        cx, cy = (int(part) for part in key.split(','))
        allocated.setdefault(row['object'], set()).add(cy * grid + cx)
    if not scene_is_slice_e:
        unexpected = sorted(set(face_cells) | set(fixture_lm))
        if not unexpected:
            return None
        return {'stance': ('tolerated — the committed placeholder form never writes the '
                           'packed sidecars; their presence is noted, not rejected'),
                'unexpectedSidecars': unexpected}
    problems = []
    stray = sorted(name for name in face_cells if name not in FIXTURE_DATABLOCKS)
    if stray:
        problems.append(f'faceCellMap carries non-fixture datablocks {stray}')
    stray_lm = sorted(name for name in fixture_lm if name not in FIXTURE_DATABLOCKS)
    if stray_lm:
        problems.append(f'fixtureLm carries non-fixture datablocks {stray_lm}')
    present = [name for name in FIXTURE_DATABLOCKS if name in templates]
    for name in present:
        cells_owned = allocated.get(name, set())
        expected_faces = len(templates[name].polygons)
        packed_needed = len(cells_owned) < expected_faces
        if name not in face_cells:
            if packed_needed:
                problems.append(
                    f'the packed sidecar faceCellMap[{name!r}] is missing ({len(cells_owned)} '
                    f'cells for {expected_faces} faces) — the reader would silently revert '
                    'to the one-face/one-cell model')
            continue
        if len(face_cells[name]) != expected_faces:
            problems.append(f'faceCellMap[{name!r}] has {len(face_cells[name])} entries but '
                            f'the template carries {expected_faces} faces')
        foreign = sorted(set(face_cells[name]) - cells_owned)
        if foreign:
            shown = ', '.join(str(cell) for cell in foreign[:8])
            problems.append(f'faceCellMap[{name!r}] maps faces to cells outside the '
                            f'datablock\'s own run ({shown}'
                            + ('…' if len(foreign) > 8 else '') + ')')
        lm_row = fixture_lm.get(name)
        if lm_row is None:
            problems.append(f'the packed sidecar fixtureLm[{name!r}] is missing')
        elif int(lm_row.get('cells', -1)) != len(cells_owned):
            problems.append(f'fixtureLm[{name!r}] declares {lm_row.get("cells")} cells but '
                            f'the datablock owns {len(cells_owned)}')
    if problems:
        raise SystemExit('census: the packed-fixture sidecar schema is broken —\n  '
                         + '\n  '.join(problems))
    return {'stance': 'validated before classification',
            'faceCellMapDatablocks': sorted(name for name in face_cells),
            'law': ('faceCellMap length == the template\'s polygon count per fixture '
                    'datablock; every mapped cell inside the datablock\'s own '
                    'allocated run; fixtureLm cells == the datablock\'s own cells')}


def census_cells(namespace, cells_map, meshes):
    """Walk every mesh face to its lm cell and classify it. Returns
    {cell_key: {'bin': ..., 'datablock': ..., 'material': ...}}."""
    cells = cells_map['cells']
    grid = int(cells_map.get('grid', namespace.get('LM_GRID', 64)))
    win_x = list(namespace['WIN_X'])
    tiers = [(float(sill), float(head)) for sill, head in namespace['WIN_TIERS']]
    owned = {}
    for key, row in cells.items():
        cx, cy = (int(part) for part in key.split(','))
        owned.setdefault(row['object'], []).append(cy * grid + cx)
    # The jordan-fixtures B1 sub-cell packer: the fixture datablock's faces share cells
    # (cells.json's faceCellMap carries the per-face linear cell, written only in
    # slice_e builds — the committed placeholder form never writes it, so this line is
    # inert for every committed input and the default path stays byte-identical).
    face_cells = cells_map.get('faceCellMap') or {}
    seen, out = set(), {}
    res = int(cells_map.get('res', namespace.get('LM_RES', 2048)))
    for obj in sorted(meshes, key=lambda item: item.name):
        name = obj.data.name
        if name in seen:
            continue  # instanced templates share data; one geometry source each
        seen.add(name)
        runs = sorted(owned.get(name, []))
        if not runs:
            continue  # meshes without lm cells (none today; guard anyway)
        if len(runs) != runs[-1] - runs[0] + 1:
            raise SystemExit(f'census: datablock {name!r} cell run is not consecutive')
        first = runs[0]
        family = datablock_family(name)
        matrix = obj.matrix_world
        normal_matrix = matrix.to_3x3()
        sub_cells = face_cells.get(name)
        if sub_cells is None or name == 'shell':
            # The committed path — ONE face per cell (the committed law), the
            # exact committed expressions; the shell is forced here regardless of
            # any sidecar (its own law is one face per cell and its bins are
            # per-face). The default path's bytes ride on these lines.
            for pi, poly in enumerate(obj.data.polygons):
                cell = sub_cells[pi] if sub_cells is not None else first + pi
                key = f'{cell % grid},{cell // grid}'
                if key not in cells:
                    raise SystemExit(f'census: face {pi} of {name!r} maps to absent cell {key}')
                material = cells[key]['material']
                centre = matrix @ poly.center
                normal = (normal_matrix @ poly.normal).normalized()
                if name == 'shell':
                    bin_name = shell_bin(centre, normal, win_x, tiers)
                else:
                    bin_name = family
                out[key] = {'bin': bin_name, 'datablock': name, 'material': material,
                            'world': [round(float(v), 3) for v in centre]}
            continue
        # The jordan-fixtures review (P2-6): the packed path (the B1/B2 sub-cell
        # packer — several faces share one cell; the last-face-wins overwrite is
        # gone). The cell's world position is the TEXEL-AREA-WEIGHTED mean of the
        # packed faces' centroids, each face weighted by its lm-UV2 footprint in
        # atlas px² (the uv polygon's shoelace area × res²) — a documented
        # aggregate approximation (exact per-texel attribution would need the
        # island regions cells.json does not carry; the law rides the rig
        # statistics' cellPositionLaw field). A single-face cell keeps the face's
        # own centroid exactly; the legacy (non-packed) path above keeps its
        # exact committed output.
        lm_uv = obj.data.uv_layers.get('lm')
        per_cell_faces = {}
        for pi, poly in enumerate(obj.data.polygons):
            cell = sub_cells[pi]
            key = f'{cell % grid},{cell // grid}'
            if key not in cells:
                raise SystemExit(f'census: face {pi} of {name!r} maps to absent cell {key}')
            centre = matrix @ poly.center
            weight = 0.0
            if lm_uv is not None and len(poly.loop_indices) >= 3:
                area2 = 0.0
                loops = list(poly.loop_indices)
                for i, loop_index in enumerate(loops):
                    u = lm_uv.data[loop_index].uv
                    v = lm_uv.data[loops[(i + 1) % len(loops)]].uv
                    area2 += float(u.x) * float(v.y) - float(v.x) * float(u.y)
                weight = abs(area2) * 0.5 * float(res) * float(res)
            per_cell_faces.setdefault(key, []).append((centre, weight))
        for key, faces in per_cell_faces.items():
            material = cells[key]['material']
            if len(faces) == 1:
                centre = faces[0][0]
            else:
                total = sum(weight for _, weight in faces)
                acc = Vector((0.0, 0.0, 0.0))
                if total > 0.0:
                    for face_centre, weight in faces:
                        acc = acc + face_centre * weight
                    centre = acc / total
                else:
                    # degenerate lm UVs (no measurable footprint): the plain mean
                    for face_centre, _weight in faces:
                        acc = acc + face_centre
                    centre = acc / len(faces)
            out[key] = {'bin': family, 'datablock': name, 'material': material,
                        'world': [round(float(v), 3) for v in centre]}
    return out, grid


def cell_rects(census, grid, res, pad_px):
    rects = {}
    for key in census:
        cx, cy = (int(part) for part in key.split(','))
        cell = res / grid
        rects[key] = ((cx * cell + pad_px) / res,
                      (cy * cell + pad_px) / res,
                      ((cx + 1) * cell - pad_px) / res,
                      ((cy + 1) * cell - pad_px) / res)
    return rects


def plate_stats(path, rects):
    """Per-cell raw stats over one plate: Rec.709 luminance mean / p10 / p90 of the
    cell's interior rect. bpy image pixels run bottom-up; the lm v axis is row 0 at
    v=0 — the axes align with NO flip."""
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    channels = image.channels
    buf = np.empty(width * height * channels, dtype=np.float32)
    image.pixels.foreach_get(buf)
    buf = buf.reshape(height, width, channels)[:, :, :3]
    lum = 0.2126 * buf[:, :, 0] + 0.7152 * buf[:, :, 1] + 0.0722 * buf[:, :, 2]
    out = {}
    for key, (u0, v0, u1, v1) in rects.items():
        x0, x1 = int(round(u0 * width)), max(int(round(u1 * width)), int(round(u0 * width)) + 1)
        y0, y1 = int(round(v0 * height)), max(int(round(v1 * height)), int(round(v0 * height)) + 1)
        patch = lum[y0:y1, x0:x1]
        out[key] = {'mean': float(patch.mean()),
                    'p10': float(np.percentile(patch, 10)),
                    'p90': float(np.percentile(patch, 90))}
    bpy.data.images.remove(image)
    return out


def srgb_stored(raw, w):
    v = np.clip(np.asarray(raw, dtype=np.float64) / w, 0.0, 1.0)
    return float(np.where(v <= 0.0031308, 12.92 * v, 1.055 * np.power(v, 1 / 2.4) - 0.055) * 255.0)


def bin_stats(census, per_cell):
    """{bin: {mean/p10/p90 mean-of-cells, cells: N}} over one state's per-cell stats."""
    bins = {}
    for key, row in census.items():
        bins.setdefault(row['bin'], []).append(per_cell[key])
    out = {}
    for bin_name, rows in sorted(bins.items()):
        means = [row['mean'] for row in rows]
        out[bin_name] = {'cells': len(rows),
                         'mean': float(np.mean(means)),
                         'p10': float(np.mean([row['p10'] for row in rows])),
                         'p90': float(np.mean([row['p90'] for row in rows])),
                         'meanMin': float(np.min(means)),
                         'meanMax': float(np.max(means))}
    return out


def per_cell_dump(census, per_state):
    """Per-cell rows for the json: {bin: [{cell, world, material, state: mean}]} — the
    strip question needs the shaft's height profile, not the bin mean."""
    out = {}
    for key, row in census.items():
        entry = {'world': row['world'], 'material': row['material']}
        for state, per_cell in per_state.items():
            entry[state] = round(per_cell[key]['mean'], 5)
        out.setdefault(row['bin'], []).append({'cell': key, **entry})
    for bin_name in out:
        out[bin_name].sort(key=lambda item: (item['world'][0], item['world'][2]))
    return out


# ---------------------------------------------------------------------------
# The jordan-fixtures B0 additions (additive; every law is quoted at its definition).


def rel_to_checkout(path):
    """The report's paths ride repo-relative when they live under the checkout — the
    committed docs/probes report must not carry machine-absolute paths."""
    try:
        return str(pathlib.Path(path).resolve().relative_to(B0_CHECKOUT.resolve()))
    except ValueError:
        return str(path)


def to_gltf_point(p):
    """The inverse of the builder's to_b: Blender (x, y, z) -> glTF (x, z, -y)."""
    return [round(float(p[0]), 3), round(float(p[2]), 3), round(-float(p[1]), 3)]


def to_gltf_bbox(lo, hi):
    """A Blender-space [lo, hi] bbox in glTF coords: x survives, y_g = z_b, z_g = -y_b."""
    return [round(float(lo[0]), 3), round(float(lo[2]), 3), round(-float(hi[1]), 3),
            round(float(hi[0]), 3), round(float(hi[2]), 3), round(-float(lo[1]), 3)]


def min_vec(a, b):
    return Vector((min(a.x, b.x), min(a.y, b.y), min(a.z, b.z)))


def max_vec(a, b):
    return Vector((max(a.x, b.x), max(a.y, b.y), max(a.z, b.z)))


def per_object_ledger(namespace, cells_map, meshes, fixture_form=None):
    """D2: per lightmapped datablock — the cells (the committed law is ONE cell per mesh
    FACE, so islands == faces == cells touched == cells owned exclusively today), the
    texel area, the per-primitive material split; the placeholder fixtures' rows carry
    their glow areas and world bboxes (the GLOW_AREA_PARITY / CHANDELIER_ENVELOPE bases).
    The jordan-fixtures B1 sub-cell packer: a datablock named by cells.json's fixtureLm
    reports its true islands (the packer's per-solid units), the island box texels and
    the sub-cell law beside the committed fields. B2: when the glb carries the chandelier
    assembly, an additive chandelierAssembly row records the union world bbox, the min-y
    fence and the envelope verdict (the builder's own declared rows carry the same)."""
    grid = int(cells_map.get('grid', namespace.get('LM_GRID', 64)))
    res = int(cells_map.get('res', namespace.get('LM_RES', 2048)))
    pad = int(cells_map.get('padPx', namespace.get('LM_PAD_PX', 2)))
    cell_px = res // grid
    inner_px = (cell_px - 2 * pad) ** 2
    owned = {}
    for key, row in cells_map['cells'].items():
        cx, cy = (int(part) for part in key.split(','))
        owned.setdefault(row['object'], []).append((cy * grid + cx, row['material']))
    instances = {}
    for obj in meshes:
        instances.setdefault(obj.data.name, []).append(obj)
    bbox_exact = {}  # the review (P1-1/P2-8): the UNROUNDED per-datablock Blender bboxes
    fixture_lm = cells_map.get('fixtureLm') or {}
    rows = []
    for name in sorted(owned):
        entries = sorted(owned[name])
        materials = {}
        for _cell, material in entries:
            materials[material] = materials.get(material, 0) + 1
        packed = fixture_lm.get(name)
        row = {
            'object': name,
            'cells': len(entries),
            'cellRange': [entries[0][0], entries[-1][0]],
            'islands': len(entries),
            'islandsLaw': 'one cell per mesh FACE (committed) — islands == cells today',
            'texelAreaPx': len(entries) * inner_px,
            'cellsTouched': len(entries),
            'cellsOwnedExclusively': len(entries),
            'facesByMaterial': materials,
            'instances': len(instances.get(name, [])),
        }
        if packed is not None:
            row['islands'] = packed['islands']
            row['islandsLaw'] = packed['islandsLaw']
            row['texelAreaPx'] = packed['islandBoxPx']
            row['texelAreaCellInteriorsPx'] = len(entries) * inner_px
        if name in FIXTURE_DATABLOCKS:
            # B2: the flag is honest — under the slice_e form the placeholders are
            # retired (the chandelier assembly replaced its own); the committed
            # placeholder form keeps every fixture row marked.
            row['fixturePlaceholder'] = fixture_form != 'slice_e'
            template = instances[name][0].data
            glow_area, total_area = 0.0, 0.0
            for poly in template.polygons:
                material = template.materials[poly.material_index]
                area = float(poly.area)  # template == instance geometry (uniform scale 1)
                total_area += area
                if material is not None and material.name.endswith('_glow'):
                    glow_area += area
            row['glowAreaM2PerInstance'] = round(glow_area, 6)
            row['areaM2PerInstance'] = round(total_area, 6)
            lo = hi = None
            for obj in instances[name]:
                matrix = obj.matrix_world
                for vertex in template.vertices:
                    world = matrix @ vertex.co
                    lo = world.copy() if lo is None else min_vec(lo, world)
                    hi = world.copy() if hi is None else max_vec(hi, world)
            row['worldBboxBlender'] = ([round(v, 3) for v in lo] + [round(v, 3) for v in hi])
            row['worldBboxGltf'] = to_gltf_bbox(lo, hi)
            bbox_exact[name] = (lo.copy(), hi.copy())
        rows.append(row)
    allocated = sum(row['cells'] for row in rows)
    out = {'res': res, 'grid': grid, 'padPx': pad, 'cellPx': cell_px,
           'innerPxPerCell': inner_px,
           'islandsLaw': 'one cell per mesh FACE (committed)',
           'objects': rows,
           'totals': {'objects': len(rows), 'cells': allocated,
                      'capacity': grid * grid, 'cellsFree': grid * grid - allocated}}
    if all(name in instances for name in ('chandelier', 'chandelier_arm', 'chandelier_bead')):
        # B2: the assembly's union world bbox + the envelope verdict (additive; the
        # builder's declared.chandelierFixtures carries the same numbers). The
        # review (P1-1/P2-8): the union is computed UNROUNDED from the per-datablock
        # Blender bboxes and carried in BOTH spaces (the glTF union is
        # authoritative; the Blender display bbox derives from it by the builder's
        # to_b inverse — glTF (x, y, z) -> Blender (x, -z, y), so Blender lo =
        # (gltf x_lo, -gltf z_hi, gltf y_lo)) — the missing worldBboxBlender key
        # that crashed the combined-flags pass cannot recur. The envelope
        # reference is the IMMUTABLE placeholder envelope (the hard-coded
        # B0-measured PLACEHOLDER_ENVELOPE_GLTF) — never the assembly's own bbox,
        # never a foreign --builder's namespace constants; the verdicts compare
        # unrounded coordinates and only the display fields round.
        union_lo = union_hi = None
        for name in ('chandelier', 'chandelier_arm', 'chandelier_bead'):
            lo, hi = bbox_exact[name]
            union_lo = lo.copy() if union_lo is None else min_vec(union_lo, lo)
            union_hi = hi.copy() if union_hi is None else max_vec(union_hi, hi)
        # Blender (x, y, z) -> glTF (x, z, -y): glTF lo = (b.x, b.z, -b_hi.y),
        # glTF hi = (b.x, b.z, -b_lo.y) — the same mapping to_gltf_bbox applies,
        # unrounded.
        union_gltf_exact = [union_lo.x, union_lo.z, -union_hi.y,
                            union_hi.x, union_hi.z, -union_lo.y]
        envelope_exact = list(PLACEHOLDER_ENVELOPE_GLTF)
        envelope_pass = all(envelope_exact[axis] <= union_gltf_exact[axis]
                            and union_gltf_exact[3 + axis] <= envelope_exact[3 + axis]
                            for axis in range(3))
        min_y_pass = CHANDELIER_MIN_Y_GLTF <= union_gltf_exact[1]
        out['chandelierAssembly'] = {
            'worldBboxGltf': [round(v, 3) for v in union_gltf_exact],
            'worldBboxBlender': [round(union_gltf_exact[0], 3),
                                 round(-union_gltf_exact[5], 3),
                                 round(union_gltf_exact[1], 3),
                                 round(union_gltf_exact[3], 3),
                                 round(-union_gltf_exact[2], 3),
                                 round(union_gltf_exact[4], 3)],
            'unionExactGltf': [float(v) for v in union_gltf_exact],
            'minYGltf': round(union_gltf_exact[1], 3),
            'maxYGltf': round(union_gltf_exact[4], 3),
            'minYFenceGltf': CHANDELIER_MIN_Y_GLTF,
            'minYFencePass': bool(min_y_pass),
            'envelopeGltf': [round(v, 3) for v in envelope_exact],
            'envelopeSource': PLACEHOLDER_ENVELOPE_SOURCE,
            'envelopePass': bool(envelope_pass),
            'law': ('the C2 pins, on the immutable reference: the assembly\'s union '
                    'bbox (stem + 36 arms + 300 beads, unrounded) inside the '
                    'placeholder\'s own measured bbox grown 0.10 per side '
                    '(hard-coded PLACEHOLDER_ENVELOPE_GLTF), and the lowest y never '
                    'below CHANDELIER_MIN_Y (the placeholder\'s own lowest = the '
                    'core octahedron\'s lower apex); sub-millimetre rounding can no '
                    'longer hide a violation'),
        }
    return out


def free_blocks(cells_map, namespace):
    """D2: the free-cell map (the atlas grid minus the allocated keys) and its largest
    CELL-ALIGNED free rectangles — the FIXTURE_LM_BLOCK candidates. Maximal rectangles
    by the histogram law: for every bottom edge the stack enumeration collects exactly
    the maximal rectangles with that bottom edge."""
    grid = int(cells_map.get('grid', namespace.get('LM_GRID', 64)))
    res = int(cells_map.get('res', namespace.get('LM_RES', 2048)))
    cell_px = res // grid
    allocated = set()
    for key in cells_map['cells']:
        cx, cy = (int(part) for part in key.split(','))
        allocated.add((cx, cy))
    occ = [[(cx, cy) in allocated for cx in range(grid)] for cy in range(grid)]
    found = set()
    heights = [0] * grid
    for bottom in range(grid):
        row = occ[bottom]
        for cx in range(grid):
            heights[cx] = 0 if row[cx] else heights[cx] + 1
        stack = [(-1, 0)]
        for cx in range(grid + 1):
            h = heights[cx] if cx < grid else 0
            start = cx
            while stack[-1][1] > h:
                s, sh = stack.pop()
                found.add((s, bottom - sh + 1, cx - 1, bottom))
                start = s
            if stack[-1][1] == h:
                continue
            stack.append((start, h))
    unique = {}
    for x0, y0, x1, y1 in found:
        unique[(x0, y0, x1, y1)] = True
    rects = sorted(
        ({'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'cells': (x1 - x0 + 1) * (y1 - y0 + 1),
          'px': [x0 * cell_px, y0 * cell_px, (x1 + 1) * cell_px, (y1 + 1) * cell_px]}
         for (x0, y0, x1, y1) in unique),
        key=lambda rect: (-rect['cells'], rect['y0'], rect['x0']))
    maximal = [rect for i, rect in enumerate(rects) if not any(
        other['x0'] <= rect['x0'] and other['y0'] <= rect['y0']
        and other['x1'] >= rect['x1'] and other['y1'] >= rect['y1']
        and other['cells'] > rect['cells'] for other in rects)]
    largest = maximal[0] if maximal else None
    block = None
    if largest is not None:
        width = min(largest['x1'] - largest['x0'] + 1, FIXTURE_LM_BLOCK_CELLS)
        height = min(largest['y1'] - largest['y0'] + 1, max(1, FIXTURE_LM_BLOCK_CELLS // width))
        block = {
            'x0': largest['x0'], 'y0': largest['y0'],
            'x1': largest['x0'] + width - 1, 'y1': largest['y0'] + height - 1,
            'cells': width * height,
            'px': [largest['x0'] * cell_px, largest['y0'] * cell_px,
                   (largest['x0'] + width) * cell_px, (largest['y0'] + height) * cell_px],
            'pickLaw': (f'the largest maximal free rect anchored at its low corner, clipped '
                        f'to FIXTURE_LM_BLOCK_CELLS = {FIXTURE_LM_BLOCK_CELLS}'),
        }
    candidates = [rect for rect in maximal if rect['cells'] >= SCONCE_NEED_CELLS][:12]
    return {'grid': grid, 'allocatedCells': len(allocated),
            'freeCells': grid * grid - len(allocated),
            'largestFreeRect': largest,
            'fixtureLmBlock': block,
            'candidates': candidates,
            'candidateLaw': (f'maximal cell-aligned free rectangles ≥ the B4 sconce estimate '
                             f'({SCONCE_NEED_CELLS} cells), top 12 by area'),
            'cellPx': cell_px}


def glb_parse(path):
    """The committed glb's two chunks: (json dict, binary chunk bytes). Python struct
    parse — the node side's tools/common.mjs parseGlb pattern, stay-python-side."""
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b'glTF':
        raise SystemExit(f'census: not a GLB: {path}')
    json_len = struct.unpack_from('<I', data, 12)[0]
    if struct.unpack_from('<I', data, 16)[0] != 0x4E4F534A:
        raise SystemExit('census: first GLB chunk is not JSON')
    gl = json.loads(data[20:20 + json_len].decode('utf8'))
    blob = b''
    offset = 20 + json_len
    if offset + 8 <= len(data):
        chunk_len, chunk_type = struct.unpack_from('<II', data, offset)
        if chunk_type == 0x004E4942:
            blob = data[offset + 8:offset + 8 + chunk_len]
    return gl, blob


def atlas_hash_and_stats(checkout):
    """D2 / AS-1: ATLAS_HASH — sha256 over every DISTINCT TEXCOORD_1 accessor's STORED
    payload bytes in mesh order (meshopt-compressed views hash their
    EXT_meshopt_compression stored range; shared accessors hash once). Plus the D5 draw
    gate: UNIQUE primitives (the committed gate law — naive per-node draws are
    info-only) and drawn triangles (per-mesh triangles × that mesh's nodes)."""
    gl, blob = glb_parse(checkout / B0_GLB)
    accessors, views = gl.get('accessors', []), gl.get('bufferViews', [])
    comp_bytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5124: 4, 5125: 4, 5126: 4}
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
    meshes = gl.get('meshes', [])
    instances = [0] * len(meshes)
    for node in gl.get('nodes', []):
        if node.get('mesh') is not None:
            instances[node['mesh']] += 1
    seen, pieces, payload_bytes = set(), [], 0
    draws, drawn_tris = 0, 0
    for mesh_index, mesh in enumerate(meshes):
        mesh_tris = 0
        for prim in mesh.get('primitives', []):
            draws += 1
            if prim.get('mode', 4) != 4:
                raise SystemExit(f'census: mesh {mesh_index} carries a non-triangle primitive')
            attributes = prim.get('attributes') or {}
            if 'TEXCOORD_0' not in attributes or 'TEXCOORD_1' not in attributes:
                raise SystemExit(f'census: mesh {mesh_index} primitive without both TEXCOORDs')
            accessor_index = attributes['TEXCOORD_1']
            if accessor_index not in seen:
                seen.add(accessor_index)
                accessor = accessors[accessor_index]
                view = views[accessor['bufferView']]
                meshopt = (view.get('extensions') or {}).get('EXT_meshopt_compression')
                if meshopt is not None:
                    # A meshopt view's OUTER byteOffset/buffer describe the DECODED data's
                    # place in gltf-transform's dropped fallback buffer (the repackBin law
                    # in tools/common.mjs) — the STORED bytes live only in the extension's
                    # compressed range, always inside the GLB's single BIN chunk.
                    if accessor.get('byteOffset') not in (None, 0):
                        raise SystemExit('census: meshopt TEXCOORD_1 with a byteOffset — '
                                         'the ATLAS_HASH law needs an update')
                    offset, length = meshopt['byteOffset'], meshopt['byteLength']
                else:
                    if view.get('buffer', 0) != 0:
                        raise SystemExit('census: TEXCOORD_1 view outside the GLB buffer')
                    # The review's conditional note: the uncompressed branch assumes
                    # a tightly packed accessor. A byteStride other than the tight
                    # element size means an interleaved layout — the naive range
                    # would hash the wrong byte population, so reject loudly instead.
                    tight = (components[accessor['type']]
                             * comp_bytes[accessor['componentType']])
                    stride = view.get('byteStride')
                    if stride is not None and int(stride) != tight:
                        raise SystemExit(
                            f'census: TEXCOORD_1 view carries byteStride {stride} != the '
                            f'tight {tight} — an interleaved layout is unsupported (the '
                            'hash would read the wrong byte population); gather the '
                            'accessor elements by stride or reject the encoding first')
                    offset = view['byteOffset'] + accessor.get('byteOffset', 0)
                    length = accessor['count'] * tight
                piece = blob[offset:offset + length]
                if len(piece) != length:
                    raise SystemExit('census: a TEXCOORD_1 payload reaches outside the glb binary chunk')
                pieces.append(piece)
                payload_bytes += length
            indices = prim.get('indices')
            position = attributes.get('POSITION')
            count = (accessors[indices]['count'] if indices is not None
                     else accessors[position]['count'])
            mesh_tris += count // 3
        drawn_tris += mesh_tris * instances[mesh_index]
    digest = hashlib.sha256(b''.join(pieces)).hexdigest()
    return {
        'algorithm': ('sha256 over every distinct TEXCOORD_1 accessor stored payload bytes, '
                      'meshes in file order then primitives in order, shared accessors once; '
                      'meshopt-compressed views hash their EXT_meshopt_compression stored '
                      'range; the glb is the committed public asset'),
        'glb': rel_to_checkout(checkout / B0_GLB),
        'sha256': digest,
        'texcoord1Accessors': len(seen),
        'texcoord1PayloadBytes': payload_bytes,
        'meshes': len(meshes),
        'meshNames': sorted({re.sub(r'\.\d{3}$', '', str(mesh.get('name') or f'mesh_{i}'))
                             for i, mesh in enumerate(meshes)}),
        'meshNodes': sum(instances),
        'draws': draws,
        'drawsLaw': 'unique primitives (the committed draw gate; naive node draws are info-only)',
        'drawnTriangles': drawn_tris,
    }


def verify_scene_identity(namespace, meshes, checkout, fixture_form_env=None):
    """The jordan-fixtures review (P1-3): the report binds to ONE artifact
    identity. The rebuilt scene's datablock roster (names, instance counts,
    per-template primitive counts) is compared against the INSPECTED public
    asset — the committed glb (the census's own struct parse) and the
    manifest's geometry rows, which must themselves agree (the manifest's
    jordan.glb row sha256 == the glb file's sha256). The fixture form is a
    scene fact (the archetype's 3-primitive sconce / the chandelier_arm
    datablock), not just an env wish: the builder's declared namespace
    FIXTURE_FORM and the caller's env must agree with the asset's form. A
    mismatch stops the census loudly — a placeholder rebuild beside a B2 glb is
    a stop, not a hybrid certification. Runs only where the glb is actually
    read (the b0 report and the uv2 subset gate); the default path never reads
    the glb and keeps its byte-identical output."""
    gl, _blob = glb_parse(checkout / B0_GLB)
    meshes_glb = gl.get('meshes', [])
    nodes_per_mesh = [0] * len(meshes_glb)
    for node in gl.get('nodes', []):
        if node.get('mesh') is not None:
            nodes_per_mesh[node['mesh']] += 1
    glb_roster = {}
    for index, mesh in enumerate(meshes_glb):
        name = re.sub(r'\.\d{3}$', '', str(mesh.get('name') or f'mesh_{index}'))
        row = glb_roster.setdefault(name, {'instances': 0, 'primitives': 0})
        row['instances'] += nodes_per_mesh[index]
        row['primitives'] += len(mesh.get('primitives', []))
    manifest = json.loads((checkout / B0_MANIFEST).read_text(encoding='utf8'))
    manifest_glb_sha = next((row.get('sha256') for row in manifest.get('files', [])
                             if row.get('path') == 'jordan.glb'), None)
    glb_sha = hashlib.sha256((checkout / B0_GLB).read_bytes()).hexdigest()
    manifest_rows = {row['name']: row
                     for row in (manifest.get('geometry') or {}).get('meshes', [])}
    scene_roster = {}
    for obj in meshes:
        slot_count = sum(1 for slot in obj.material_slots if slot.material is not None)
        row = scene_roster.setdefault(obj.data.name, {'instances': 0, 'primitives': 0})
        row['instances'] += 1
        row['primitives'] = max(row['primitives'], slot_count)

    def asset_form(roster):
        sconce = roster.get('sconce')
        if 'chandelier_arm' in roster or (sconce is not None and sconce['primitives'] >= 3):
            return 'slice_e'
        return 'placeholder'

    scene_form = asset_form(scene_roster)
    glb_form = asset_form(glb_roster)
    builder_form = namespace.get('FIXTURE_FORM')
    env_form = 'slice_e' if fixture_form_env == 'slice_e' else 'placeholder'
    problems = []
    if manifest_glb_sha is not None and manifest_glb_sha != glb_sha:
        problems.append(f'the manifest jordan.glb row sha {manifest_glb_sha[:12]}… != the '
                        f'inspected glb file sha {glb_sha[:12]}… — the manifest does not '
                        'describe the inspected asset')
    if glb_form != scene_form:
        problems.append(f'the rebuilt scene form {scene_form!r} != the inspected glb form '
                        f'{glb_form!r} — a hybrid certification is refused')
    if builder_form in ('placeholder', 'slice_e'):
        if builder_form != env_form:
            problems.append(f'the builder declares FIXTURE_FORM {builder_form!r} but the '
                            f'caller\'s env says {env_form!r}')
        if builder_form == 'placeholder' and glb_form == 'slice_e':
            problems.append('the builder declares the placeholder form while the inspected '
                            'asset carries the slice_e assembly — the declared form '
                            'contradicts the asset')
    else:
        pass  # a builder that declares no form cannot be cross-checked (noted below)
    if set(scene_roster) != set(glb_roster):
        problems.append('the rebuilt datablock roster differs from the inspected glb: '
                        f'scene-only {sorted(set(scene_roster) - set(glb_roster))} · '
                        f'glb-only {sorted(set(glb_roster) - set(scene_roster))}')
    for name in sorted(set(scene_roster) & set(glb_roster)):
        if scene_roster[name] != glb_roster[name]:
            problems.append(f'datablock {name!r}: rebuilt {scene_roster[name]} vs glb '
                            f'{glb_roster[name]}')
    if manifest_rows and set(manifest_rows) != set(glb_roster):
        problems.append('the manifest geometry roster differs from the inspected glb: '
                        f'manifest-only {sorted(set(manifest_rows) - set(glb_roster))} · '
                        f'glb-only {sorted(set(glb_roster) - set(manifest_rows))}')
    for name in sorted(set(manifest_rows) & set(glb_roster)):
        row = manifest_rows[name]
        if (int(row.get('instances', -1)) != glb_roster[name]['instances']
                or int(row.get('primitives', -1)) != glb_roster[name]['primitives']):
            problems.append(f'manifest row {name!r} declares instances '
                            f'{row.get("instances")}/primitives {row.get("primitives")} '
                            f'but the glb parses {glb_roster[name]}')
    if problems:
        raise SystemExit('census: the rebuilt scene does not match the inspected public '
                         'asset — the report is not certified\n  ' + '\n  '.join(problems))
    return {'glb': rel_to_checkout(checkout / B0_GLB),
            'glbSha256': glb_sha,
            'manifestGlbRowSha256': manifest_glb_sha,
            'glbManifestBind': ('match' if manifest_glb_sha == glb_sha else
                                'absent' if manifest_glb_sha is None else 'mismatch'),
            'glbForm': glb_form, 'sceneForm': scene_form,
            'builderForm': builder_form,
            'builderFormNote': (None if builder_form in ('placeholder', 'slice_e') else
                                'the builder declares no FIXTURE_FORM — its declared '
                                'form cannot be cross-checked'),
            'envForm': env_form,
            'sceneRoster': scene_roster, 'glbRoster': glb_roster,
            'pass': True,
            'law': ('the rebuilt datablock roster (names, instances, per-template '
                    'primitives) == the inspected glb == the manifest geometry rows; '
                    'the fixture form is a scene fact checked against the builder\'s '
                    'declared FIXTURE_FORM and the caller\'s env')}


def uv2_subset_hash(checkout, baseline=None, fixture_baseline=None):
    """The B1 NO-REPACK instrument: sha256 over every NON-fixture mesh's TEXCOORD_1
    accessor stored payload bytes, meshes in file order, primitives in order, shared
    accessors once (the ATLAS_HASH law minus the fixture datablocks — the lane's own
    islands may re-UV, nothing else may move a byte). Compared against the baseline glb
    (3da446d) when one is given: equal → the NO-REPACK law holds. B2: every fixture
    datablock's OWN subset hash is reported beside it, and when a fixture baseline is
    given (B1's committed glb) the sconce archetype's subset must be byte-identical
    while the chandelier assembly's are new."""
    import re

    def accessor_piece(prim, gl, blob, accessors, views, components, comp_bytes):
        attributes = prim.get('attributes') or {}
        if 'TEXCOORD_1' not in attributes:
            raise SystemExit(f'census: mesh primitive without TEXCOORD_1')
        accessor_index = attributes['TEXCOORD_1']
        accessor = accessors[accessor_index]
        view = views[accessor['bufferView']]
        meshopt = (view.get('extensions') or {}).get('EXT_meshopt_compression')
        if meshopt is not None:
            if accessor.get('byteOffset') not in (None, 0):
                raise SystemExit('census: meshopt TEXCOORD_1 with a byteOffset — '
                                 'the subset-hash law needs an update')
            offset, length = meshopt['byteOffset'], meshopt['byteLength']
        else:
            if view.get('buffer', 0) != 0:
                raise SystemExit('census: TEXCOORD_1 view outside the GLB buffer')
            # The review's conditional note (same law as the atlas hash): a
            # byteStride other than the tight element size = an interleaved
            # layout — reject loudly, never hash the wrong byte population.
            tight = (components[accessor['type']]
                     * comp_bytes[accessor['componentType']])
            stride = view.get('byteStride')
            if stride is not None and int(stride) != tight:
                raise SystemExit(
                    f'census: TEXCOORD_1 view carries byteStride {stride} != the tight '
                    f'{tight} — an interleaved layout is unsupported (the subset hash '
                    'would read the wrong byte population); gather the accessor '
                    'elements by stride or reject the encoding first')
            offset = view['byteOffset'] + accessor.get('byteOffset', 0)
            length = accessor['count'] * tight
        piece = blob[offset:offset + length]
        if len(piece) != length:
            raise SystemExit('census: a TEXCOORD_1 payload reaches outside the glb '
                             'binary chunk')
        return piece

    def walk(path, fixture=False):
        gl, blob = glb_parse(path)
        accessors, views = gl.get('accessors', []), gl.get('bufferViews', [])
        comp_bytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5124: 4, 5125: 4, 5126: 4}
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9,
                      'MAT4': 16}
        seen, pieces, payload_bytes, meshes_seen = set(), [], 0, 0
        fixture_subsets = {}
        for mesh in gl.get('meshes', []):
            name = re.sub(r'\.\d{3}$', '', str(mesh.get('name') or ''))
            is_fixture = name in FIXTURE_DATABLOCKS
            if bool(is_fixture) != fixture:
                continue
            meshes_seen += 1
            if not fixture:
                # The non-fixture walk stays ONE shared digest across meshes (the B1 law);
                # shared accessors hash once in mesh order.
                for prim in mesh.get('primitives', []):
                    accessor_index = prim.get('attributes', {}).get('TEXCOORD_1')
                    if accessor_index in seen:
                        continue
                    seen.add(accessor_index)
                    piece = accessor_piece(prim, gl, blob, accessors, views, components,
                                           comp_bytes)
                    pieces.append(piece)
                    payload_bytes += len(piece)
                continue
            # The fixture walk: a per-datablock subset digest (the B2 additions report;
            # shared accessors hash once inside their datablock).
            subset_seen, subset_pieces, subset_bytes = set(), [], 0
            for prim in mesh.get('primitives', []):
                accessor_index = prim.get('attributes', {}).get('TEXCOORD_1')
                if accessor_index in subset_seen:
                    continue
                subset_seen.add(accessor_index)
                piece = accessor_piece(prim, gl, blob, accessors, views, components,
                                       comp_bytes)
                subset_pieces.append(piece)
                subset_bytes += len(piece)
            fixture_subsets[name] = {
                'sha256': hashlib.sha256(b''.join(subset_pieces)).hexdigest(),
                'texcoord1Accessors': len(subset_seen),
                'texcoord1PayloadBytes': subset_bytes}
        if fixture:
            return fixture_subsets
        return {'sha256': hashlib.sha256(b''.join(pieces)).hexdigest(),
                'texcoord1Accessors': len(seen), 'texcoord1PayloadBytes': payload_bytes,
                'nonFixtureMeshes': meshes_seen}
    row = {'algorithm': ('sha256 over the non-fixture TEXCOORD_1 accessor stored payload '
                         'bytes, meshes in file order (shared accessors once; meshopt views '
                         'hash their EXT_meshopt_compression stored range; the fixture '
                         'datablocks ' + ', '.join(FIXTURE_DATABLOCKS) + ' are excluded — '
                         'the lane\'s own islands may re-UV)'),
           'glb': rel_to_checkout(checkout / B0_GLB),
           'excludedDatablocks': list(FIXTURE_DATABLOCKS)}
    row['checkout'] = walk(checkout / B0_GLB)
    row['checkoutFixtureSubsets'] = walk(checkout / B0_GLB, fixture=True)
    if baseline is not None:
        row['baseline'] = walk(baseline)
        row['baselineGlb'] = rel_to_checkout(baseline)
        row['noRepackPass'] = (row['checkout']['sha256'] == row['baseline']['sha256']
                               and row['checkout']['texcoord1PayloadBytes']
                               == row['baseline']['texcoord1PayloadBytes'])
    if fixture_baseline is not None:
        row['fixtureBaseline'] = walk(fixture_baseline, fixture=True)
        row['fixtureBaselineGlb'] = rel_to_checkout(fixture_baseline)
        checkout_subsets = row['checkoutFixtureSubsets']
        baseline_subsets = row['fixtureBaseline']
        common = sorted(set(checkout_subsets) & set(baseline_subsets))
        row['fixtureSubsetsUnchanged'] = {
            name: checkout_subsets[name]['sha256'] == baseline_subsets[name]['sha256']
            for name in common}
        # The B2 law: the sconce archetype's UV2 is byte-identical to B1; the chandelier
        # assembly's subsets are new (absent from the B1 baseline).
        row['sconceUnchangedPass'] = (
            'sconce' in checkout_subsets and 'sconce' in baseline_subsets
            and checkout_subsets['sconce']['sha256'] == baseline_subsets['sconce']['sha256'])
    return row


def frame_share(namespace, meshes):
    """D1: the 7-stop frame-share table — ONE geometry-only pass set. A flat object-ID
    raycast per pixel centre over the FULL built scene (one BVH, no lights, no
    renderer, no state): vertical FOV CAMERA_VFOV_DEG, 1280×720, the stop's eye aimed
    at its subject; a fixture hidden behind a wall counts nothing."""
    to_b = namespace['to_b']
    width, height = FRAME_SIZE
    aspect = width / height
    half_h = math.tan(math.radians(CAMERA_VFOV_DEG) / 2.0)
    half_w = half_h * aspect
    fixtures = set(FIXTURE_DATABLOCKS)
    verts, polys, owner = [], [], []
    instances, slot_classes = [], {}
    for obj in sorted(meshes, key=lambda item: item.name):
        datablock = obj.data.name
        is_fixture = datablock in fixtures
        base = len(verts)
        matrix = obj.matrix_world
        verts.extend(tuple(matrix @ vertex.co) for vertex in obj.data.vertices)
        classes = None
        if is_fixture:
            if datablock not in slot_classes:
                slot_classes[datablock] = [
                    'glow' if (slot.material is not None and slot.material.name.endswith('_glow'))
                    else 'body' for slot in obj.material_slots]
            classes = slot_classes[datablock]
            centre_lo = centre_hi = None
            for vertex in obj.data.vertices:
                world = matrix @ vertex.co
                centre_lo = world.copy() if centre_lo is None else min_vec(centre_lo, world)
                centre_hi = world.copy() if centre_hi is None else max_vec(centre_hi, world)
            centre = (centre_lo + centre_hi) / 2.0
            instances.append({'object': obj.name, 'datablock': datablock,
                              'originB': matrix.translation.copy(), 'centreB': centre})
        for poly in obj.data.polygons:
            polys.append(tuple(base + vertex_index for vertex_index in poly.vertices))
            owner.append((obj.name if is_fixture else None,
                          classes[poly.material_index] if is_fixture else None))
    tree = BVHTree.FromPolygons(verts, polys)
    datablock_of = {row['object']: row['datablock'] for row in instances}
    stops = []
    for stop_id, eye_gltf, subject_gltf in STOPS:
        eye = Vector(to_b(eye_gltf))
        forward = (Vector(to_b(subject_gltf)) - eye).normalized()
        right = forward.cross(Vector((0.0, 0.0, 1.0))).normalized()  # Blender up = the app's +y
        up = right.cross(forward).normalized()
        counts = {row['object']: {'body': 0, 'glow': 0} for row in instances}
        background = 0
        for py in range(height):
            ny = 1.0 - (2.0 * (py + 0.5)) / height  # +1 at the top row (screen space)
            for px in range(width):
                nx = (2.0 * (px + 0.5)) / width - 1.0
                direction = Vector((
                    forward.x + nx * half_w * right.x + ny * half_h * up.x,
                    forward.y + nx * half_w * right.y + ny * half_h * up.y,
                    forward.z + nx * half_w * right.z + ny * half_h * up.z)).normalized()
                hit = tree.ray_cast(eye, direction, 100.0)
                if hit[0] is None:
                    background += 1
                    continue
                label, cls = owner[hit[2]]
                if label is not None:
                    counts[label][cls] += 1
        totals = {}
        for label, hit_counts in counts.items():
            for cls, pixels in hit_counts.items():
                family = ('chandelier' if datablock_of[label].startswith('chandelier')
                          else datablock_of[label])
                key = (family, cls)
                totals[key] = totals.get(key, 0) + pixels
        total_px = width * height

        def pct(pixels):
            return round(100.0 * pixels / total_px, 4)

        share = {'sconceBody': pct(totals.get(('sconce', 'body'), 0)),
                 'sconceGlow': pct(totals.get(('sconce', 'glow'), 0)),
                 'chandelierBody': pct(totals.get(('chandelier', 'body'), 0)),
                 'chandelierGlow': pct(totals.get(('chandelier', 'glow'), 0))}
        share['allFixtures'] = round(sum(share[key] for key in
                                         ('sconceBody', 'sconceGlow', 'chandelierBody',
                                          'chandelierGlow')), 4)
        instance_rows = []
        for row in instances:
            hit_counts = counts[row['object']]
            origin = row['originB']
            instance_rows.append({
                'object': row['object'], 'datablock': row['datablock'],
                'originGltf': to_gltf_point(origin),
                'originDistanceM': round((origin - eye).length, 3),
                'centreDistanceM': round((row['centreB'] - eye).length, 3),
                'bodyPx': hit_counts['body'], 'glowPx': hit_counts['glow']})
        instance_rows.sort(key=lambda item: item['object'])
        stops.append({'stop': stop_id, 'eyeGltf': list(eye_gltf), 'subjectGltf': list(subject_gltf),
                      'framePx': total_px, 'backgroundPx': background, 'sharePct': share,
                      'instances': instance_rows})
    return {
        'camera': {'vfovDeg': CAMERA_VFOV_DEG, 'renderPx': list(FRAME_SIZE),
                   'aspect': round(aspect, 6),
                   'source': 'src/camera/portrait-frame.ts:16 CAMERA_VFOV_DEG («LAW: the one '
                             'source of the vertical FOV»)',
                   'pass': 'geometry-only flat object-ID raycast, one pass set (state-independent)'},
        'passLaw': ('per-pixel-centre raycast over the FULL built scene; a fixture hidden '
                    'behind a wall counts nothing; px counts are exact (no anti-aliasing)'),
        'instances': [{'object': row['object'], 'datablock': row['datablock'],
                       'originGltf': to_gltf_point(row['originB']),
                       'centreGltf': to_gltf_point(row['centreB']),
                       'originNote': ('the chandelier datablock is built in-place (origin 0,0,0) '
                                      '— use centreDistanceM for it')}
                      for row in instances],
        'stops': stops,
    }


def measure_percentile_exr(exr_path, cells_path, percentile, w):
    """The EXR-first D4 measurement — exactly tools/bpy/lm_percentile.py's statistic:
    L = Rec.709 luminance over the (cell − 2·pad) interiors of ALLOCATED cells whose
    owning material is not an excluded emitter chip; wRaw = np.partition(L, k)[k],
    k = floor(percentile/100·(n−1)); the clipped fraction counts L > W."""
    source = bpy.data.images.load(str(exr_path), check_existing=False)
    width, height = source.size
    channels = source.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    source.pixels.foreach_get(linear)
    rgb = linear.reshape(height, width, channels)[:, :, :3]
    bpy.data.images.remove(source)
    cells = json.loads(cells_path.read_text(encoding='utf8'))
    res, grid, pad = int(cells['res']), int(cells['grid']), int(cells['pad'])
    if (width, height) != (res, res):
        raise SystemExit(f'census: the EXR is {width}x{height} but cells.json declares res {res}')
    cell = res // grid
    inner = cell - 2 * pad
    if inner <= 0:
        raise SystemExit(f'census: cells.json pad {pad} eats the {cell} px cell')
    blocks = []
    for key in sorted(cells['cells']):
        row = cells['cells'][key]
        if row['material'] in EXCLUDED_EMITTERS:
            continue
        cx, cy = (int(part) for part in key.split(','))
        x0, y0 = cx * cell + pad, cy * cell + pad
        block = rgb[y0:y0 + inner, x0:x0 + inner, :]
        blocks.append((0.2126 * block[:, :, 0].astype(np.float64)
                       + 0.7152 * block[:, :, 1].astype(np.float64)
                       + 0.0722 * block[:, :, 2].astype(np.float64)).ravel())
    samples = np.concatenate(blocks)
    index = math.floor(percentile / 100.0 * (samples.size - 1))
    w_raw = float(np.partition(samples, index)[index])
    return {'wRaw': round(w_raw, 6), 'n': int(samples.size),
            'clipFraction': round(float(np.count_nonzero(samples > w) / samples.size), 6),
            'haloFraction': round(float(np.count_nonzero(samples > 4.0 * w) / samples.size), 6)}


def rig_light_stats_exr(namespace, census_cells, cells_map, rig, exr_path, radius_m=1.5):
    """Night-only, EXR-first: per rig light the max and p99 linear value within 1.5 m.
    Population: the interior texels of the lm cells whose world centroid (the census's
    per-cell map, Blender space) sits within radius_m of the lamp."""
    to_b = namespace['to_b']
    source = bpy.data.images.load(str(exr_path), check_existing=False)
    width, height = source.size
    channels = source.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    source.pixels.foreach_get(linear)
    rgb = linear.reshape(height, width, channels)[:, :, :3]
    bpy.data.images.remove(source)
    grid = int(cells_map.get('grid', namespace.get('LM_GRID', 64)))
    res = int(cells_map.get('res', namespace.get('LM_RES', 2048)))
    pad = int(cells_map.get('padPx', namespace.get('LM_PAD_PX', 2)))
    cell = res // grid
    inner = cell - 2 * pad
    lamps = ([('sconce[%d]' % index, position) for index, position in enumerate(rig['sconcePositions'])]
             + [('chandelierRing[%d]' % index, position)
                for index, position in enumerate(rig['dropPositions'])]
             + [('chandelierCore', rig['corePosition'])])
    lamps_out = []
    for label, position in lamps:
        lamp = Vector(to_b(position))
        patches = []
        for key in sorted(census_cells):
            row = census_cells[key]
            if (Vector(row['world']) - lamp).length > radius_m:
                continue
            cx, cy = (int(part) for part in key.split(','))
            x0, y0 = cx * cell + pad, cy * cell + pad
            block = rgb[y0:y0 + inner, x0:x0 + inner, :]
            patches.append((0.2126 * block[:, :, 0].astype(np.float64)
                            + 0.7152 * block[:, :, 1].astype(np.float64)
                            + 0.0722 * block[:, :, 2].astype(np.float64)).ravel())
        entry = {'lamp': label, 'positionGltf': [round(float(v), 3) for v in position],
                 'cells': len(patches), 'texels': int(sum(p.size for p in patches)),
                 'max': None, 'p99': None}
        if patches:
            values = np.concatenate(patches)
            entry['max'] = round(float(values.max()), 6)
            entry['p99'] = round(float(np.percentile(values, 99)), 6)
        lamps_out.append(entry)
    return {'radiusM': radius_m,
            'population': ('linear Rec.709 luminance over the interior texels of the lm cells '
                           'whose world centroid sits within the radius of the lamp'),
            'cellPositionLaw': ('the packed cell\'s world position = the TEXEL-AREA-WEIGHTED '
                                'mean of the packed faces\' centroids (each face weighted by '
                                'its lm-UV2 footprint in atlas px², measured post-transform) '
                                '— a documented aggregate approximation: exact per-texel '
                                'attribution would need the island regions cells.json does '
                                'not carry; single-face cells keep the face\'s own centroid '
                                'and the legacy non-packed path keeps its committed output'),
            'lamps': lamps_out}


def clamp_baseline(checkout, namespace, census_cells, cells_map, atlas_sha=None):
    """D4: per state — raw pre-clamp percentile P, band, W, clamp side, margin
    |P − W| / W, clipped fraction; night's per-rig-light stats when the staged
    EXRs VERIFY. EXR-first (re-measured exactly like tools/bpy/lm_percentile.py),
    but the review (P1-4/P2-9): EXISTENCE IS NOT PROVENANCE. One can_measure
    predicate per state: the state's EXR exists AND the staged cells.json exists
    AND the bake identity holds — the staged cells.json's sha256 == the bake-log
    encode row's cellsSha256, and the committed log's geometry sidecar
    (tools/bake-logs/jordan.json geometry.geometrySha256 / atlasHash256) matches
    the current asset identities (the glb file's sha256, the manifest's jordan.glb
    row, the census's own re-measured ATLAS_HASH). When provenance cannot be
    established the committed-log figures stand with the honest label — the
    report never calls an unverified cache «exr (re-measured)»."""
    bake_log_path = checkout / B0_BAKE_LOG
    manifest_path = checkout / B0_MANIFEST
    stage_root = checkout / B0_STAGE
    log = json.loads(bake_log_path.read_text(encoding='utf8'))
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    # --- the bake identity (P1-4): the log's geometry sidecar binds the bake to
    # the committed asset; the manifest binds the glb row to the file; the
    # census's own ATLAS_HASH re-measure closes the atlas half of the AS-4 law.
    glb_sha = hashlib.sha256((checkout / B0_GLB).read_bytes()).hexdigest()
    manifest_glb_sha = next((row.get('sha256') for row in manifest.get('files', [])
                             if row.get('path') == 'jordan.glb'), None)
    log_geometry = log.get('geometry') or {}
    log_geometry_sha = log_geometry.get('geometrySha256')
    log_atlas_sha = log_geometry.get('atlasHash256')
    provenance_problems = []
    if log_geometry_sha is None:
        provenance_problems.append(
            'the bake log carries no geometry.geometrySha256 sidecar (the AS-4 identity '
            'is absent) — a staged EXR cache cannot be bound to the committed asset')
    elif log_geometry_sha != glb_sha:
        provenance_problems.append(
            f'the bake log geometrySha256 {log_geometry_sha[:12]}… != the committed glb '
            f'sha {glb_sha[:12]}… — the staged cache belongs to another asset revision')
    if manifest_glb_sha is None:
        provenance_problems.append(
            'the manifest carries no jordan.glb row — the asset identity has no '
            'committed binding')
    elif manifest_glb_sha != glb_sha:
        provenance_problems.append(
            f'the manifest glb row sha {manifest_glb_sha[:12]}… != the committed glb sha '
            f'{glb_sha[:12]}…')
    if log_atlas_sha is None:
        provenance_problems.append(
            'the bake log carries no atlasHash256 — the atlas identity is unchecked')
    elif atlas_sha is not None and log_atlas_sha != atlas_sha:
        provenance_problems.append(
            f'the bake log atlasHash256 {log_atlas_sha[:12]}… != the census re-measured '
            f'ATLAS_HASH {atlas_sha[:12]}…')
    state_keys = {'day': ('day', 'day'), 'duskChandeliers': ('dusk', 'dusk'),
                  'nightChandeliers': ('nightChandeliers', 'night')}
    states = {}
    for state, (log_key, file_name) in state_keys.items():
        record = log['states'][log_key]
        encode = record['encode']
        band = CLAMP_BANDS[state]
        w = float(manifest['lightmaps']['intensity'][log_key])
        if abs(w - float(encode['w'])) > 1e-9:
            raise SystemExit(f'census: manifest W {w} != the bake-log encode W {encode["w"]} ({state})')
        if abs(w - band[1]) < 1e-9:
            clamp_side = 'upper'
        elif abs(w - band[0]) < 1e-9:
            clamp_side = 'lower'
        else:
            raise SystemExit(f'census: W {w} sits on neither edge of band {band} ({state})')
        exr = stage_root / f'bake-{file_name}' / 'lm' / f'{file_name}.exr'
        cells_path = stage_root / f'bake-{file_name}' / 'lm' / 'cells.json'
        state_problems = []
        if not exr.exists():
            state_problems.append(f'the staged EXR is missing at {rel_to_checkout(exr)}')
        if not cells_path.exists():
            state_problems.append(
                f'the staged cells.json is missing at {rel_to_checkout(cells_path)}')
        log_cells_sha = encode.get('cellsSha256')
        cells_sha = None
        if cells_path.exists():
            cells_sha = hashlib.sha256(cells_path.read_bytes()).hexdigest()
            if log_cells_sha is None:
                state_problems.append(
                    'the bake-log encode row carries no cellsSha256 — the staged cells '
                    'cannot be bound to the bake')
            elif cells_sha != log_cells_sha:
                state_problems.append(
                    f'the staged cells.json sha {cells_sha[:12]}… != the bake-log '
                    f'cellsSha256 {log_cells_sha[:12]}…')
            staged_summary_path = stage_root / f'bake-{file_name}' / 'summary.json'
            if staged_summary_path.exists():
                staged_cells_sha = None
                try:
                    staged_cells_sha = json.loads(
                        staged_summary_path.read_text(encoding='utf8')).get('cellsSha256')
                except (ValueError, OSError):
                    staged_cells_sha = None
                if staged_cells_sha is not None and staged_cells_sha != cells_sha:
                    state_problems.append(
                        'the staged bake summary cellsSha256 disagrees with the staged '
                        'cells.json file')
        can_measure = not provenance_problems and not state_problems
        row = {'state': state, 'logKey': log_key, 'band': list(band), 'w': w,
               'clampSide': clamp_side, 'percentile': encode['percentile'],
               'scope': encode['scope'], 'kappa': encode['kappa'], 'gain': encode['gain'],
               'source': ('exr (re-measured)' if can_measure else
                          'bake-log (committed figures) — the staged EXR cache is not '
                          'verified for this asset/log'),
               'exrProvenance': {'verified': can_measure,
                                 'stagedExr': exr.exists(),
                                 'stagedCells': cells_path.exists(),
                                 'stagedCellsSha256': cells_sha,
                                 'logCellsSha256': log_cells_sha,
                                 'glbSha256': glb_sha,
                                 'manifestGlbRowSha256': manifest_glb_sha,
                                 'logGeometrySha256': log_geometry_sha,
                                 'logAtlasHash256': log_atlas_sha,
                                 'problems': provenance_problems + state_problems}}
        if can_measure:
            measured = measure_percentile_exr(exr, cells_path, encode['percentile'], w)
            row['rawPercentileP'] = measured['wRaw']
            row['clippedFraction'] = measured['clipFraction']
            row['haloFraction'] = measured['haloFraction']
            row['population'] = measured['n']
            if state == 'nightChandeliers':
                row['rigLightStats'] = rig_light_stats_exr(
                    namespace, census_cells, cells_map, record['rig'], exr)
        else:
            row['rawPercentileP'] = encode['wRaw']
            row['clippedFraction'] = encode['clipFraction']
            row['haloFraction'] = encode['haloFraction']
            if state == 'nightChandeliers':
                row['rigLightStats'] = ('SKIPPED-NO-EXR' if not exr.exists()
                                        else 'SKIPPED-EXR-UNVERIFIED')
        row['marginPct'] = round(abs(row['rawPercentileP'] - w) / w * 100.0, 4)
        states[state] = row
    return {
        'exrStagedRoot': rel_to_checkout(stage_root),
        'exrPresent': any(state['exrProvenance']['verified'] for state in states.values()),
        'provenanceLaw': ('existence is not provenance (the review P1-4): a staged EXR is '
                          're-measured only when the bake identity holds — the staged '
                          'cells.json sha256 == the bake-log encode cellsSha256, and the '
                          'log geometry sidecar (geometrySha256/atlasHash256) matches the '
                          'committed glb sha, the manifest glb row and the census\'s own '
                          're-measured ATLAS_HASH; otherwise the committed-log figures '
                          'stand with the honest label'),
        'states': states,
        'darkMedianCommitted': DARK_MEDIAN_COMMITTED,
        'populationLaw': ('the lm-percentile population: allocated-interior Rec.709 luminance '
                          'excluding the pane/sconce_glow/chandelier_glow emitter chips '
                          '(LM_ENCODE.excludeMaterials)'),
        'degradation': ('no VERIFIED staged EXRs → the committed bake-log encode rows carry '
                        'wRaw, W, gain, kappa, clipFraction and haloFraction as measured on '
                        'this exact bake chain; the night per-rig-light stats report '
                        'SKIPPED-NO-EXR (the EXR missing) or SKIPPED-EXR-UNVERIFIED (the EXR '
                        'present but its bake identity unproven — an unverified cache is '
                        'never reported as re-measured); the ktx2 stays undecoded (the '
                        'ETC1S transcoder is node-side — the census stays python-side '
                        'deterministic)')}


def self_check(checkout, cells_count, atlas, fixture_form=None):
    """D5: cells / draws / drawn triangles / W against main @ 3da446d. A miss means the
    probe is wrong — fix the probe, never the room. Under the B1 slice_e form the room
    legitimately carries the archetype: the expected set is the B1 pins above; once the
    glb also carries the B2 chandelier assembly (chandelier_arm present), the expected
    set is the B2 pins; the committed pins stay when FIXTURE_FORM is unset or
    'placeholder'."""
    manifest = json.loads((checkout / B0_MANIFEST).read_text(encoding='utf8'))
    intensity = manifest['lightmaps']['intensity']
    measured_w = {'day': float(intensity['day']), 'duskChandeliers': float(intensity['dusk']),
                  'nightChandeliers': float(intensity['nightChandeliers'])}
    if 'chandelier_arm' in atlas.get('meshNames', []):
        expected = SELF_CHECK_B2
    elif fixture_form == 'slice_e':
        expected = SELF_CHECK_B1
    else:
        expected = SELF_CHECK
    checks = {
        'cells': {'measured': cells_count, 'expected': expected['cells'],
                  'source': "the builder's cells.json (this run)"},
        'draws': {'measured': atlas['draws'], 'expected': expected['draws'],
                  'source': 'the committed glb: unique primitives'},
        'drawnTris': {'measured': atlas['drawnTriangles'], 'expected': expected['drawnTris'],
                      'source': 'the committed glb: per-mesh triangles × mesh nodes'},
        'w': {'measured': measured_w, 'expected': expected['w'],
              'source': 'public/assets/jordan/manifest.json lightmaps.intensity'},
    }
    for key, row in checks.items():
        if key == 'w':
            row['pass'] = all(abs(row['measured'][state] - row['expected'][state]) < 1e-9
                              for state in row['expected'])
        else:
            row['pass'] = row['measured'] == row['expected']
    return {'verdict': 'PASS' if all(row['pass'] for row in checks.values()) else 'FAIL',
            'checks': checks,
            'note': ('a miss means the probe is wrong — fix the probe, never the room; a '
                     'legitimate cells.json drift STOPs the census (K7)')}


def completeness(cells_map, meshes, checkout):
    """D5: all fixtures and every rig light enumerated, with the light-to-fixture
    pairing. The review (P2-7): the per-datablock instance counts are EXACT and
    a miss is fatal to the census — the assembly form (chandelier_arm present)
    demands sconce 10 · chandelier 1 · chandelier_arm 36 · chandelier_bead 300
    (da19680), the placeholder form sconce 10 · chandelier 1; no other fixture
    datablock may exist. main() stops before any decision on a miss. The lamp
    pairing stays as recorded: bake.py derives lamp k from the same
    builder-roster order put() walks (west, then north, then east), so lamp k
    pairs with the k-th sconce instance in NAME ORDER and the chandelier lamps
    pair with the 'chandelier' datablock by name — placement is not re-derived
    here; the caveat rides the lightToFixtureLaw field."""
    by_datablock = {}
    for obj in meshes:
        by_datablock.setdefault(obj.data.name, []).append(obj)
    assembly = 'chandelier_arm' in by_datablock
    expected = dict(EXPECTED_FIXTURE_INSTANCES['assembly' if assembly else 'placeholder'])
    fixtures = []
    counts_pass = True
    for datablock in sorted(FIXTURE_DATABLOCKS):
        objects = by_datablock.get(datablock, [])
        expected_count = expected.get(datablock, 0)
        row_pass = len(objects) == expected_count
        counts_pass = counts_pass and row_pass
        fixtures.append({'datablock': datablock, 'instances': len(objects),
                         'expected': expected_count, 'pass': row_pass,
                         'objects': sorted(obj.name for obj in objects)})
    unexpected = sorted(name for name in by_datablock
                        if name not in FIXTURE_DATABLOCKS
                        and ('sconce' in name or 'chandelier' in name))
    if unexpected:
        counts_pass = False
    log = json.loads((checkout / B0_BAKE_LOG).read_text(encoding='utf8'))
    rig = log['states']['nightChandeliers']['rig']
    lamps = ([('sconce', index, position) for index, position in enumerate(rig['sconcePositions'])]
             + [('chandelierRing', index, position)
                for index, position in enumerate(rig['dropPositions'])]
             + [('chandelierCore', 0, rig['corePosition'])])
    sconce_names = sorted(by_datablock.get('sconce', []), key=lambda obj: obj.name)
    pairing = []
    for kind, index, position in lamps:
        instance = (sconce_names[index].name if kind == 'sconce' and index < len(sconce_names)
                    else 'chandelier' if kind != 'sconce' else None)
        pairing.append({'lamp': f'{kind}[{index}]', 'positionGltf': position,
                        'fixtureInstance': instance})
    fixture_instances = sum(row['instances'] for row in fixtures)
    expected_instances = sum(expected.values())
    return {'fixtures': fixtures, 'fixtureInstances': fixture_instances,
            'fixtureInstancesExpected': expected_instances,
            'expectedPerDatablock': expected, 'unexpectedFixtureDatablocks': unexpected,
            'assembly': assembly,
            'rigLights': {'sconce': len(rig['sconcePositions']),
                          'chandelierRing': len(rig['dropPositions']),
                          'chandelierCore': 1, 'total': len(lamps),
                          'source': ('tools/bake-logs/jordan.json nightChandeliers rig rows '
                                     '(derived from the builder namespace by tools/bpy/bake.py)')},
            'lightToFixture': pairing,
            'lightToFixtureLaw': ('lamp k pairs with the k-th sconce instance in NAME ORDER '
                                  '(the committed naming follows creation order) and the '
                                  'chandelier lamps pair with the \'chandelier\' datablock '
                                  'by name — the pairing is recorded, not re-derived '
                                  'against placement (the caveat stands)'),
            'pass': (counts_pass and fixture_instances == expected_instances
                     and len(lamps) == 19
                     and all(row['fixtureInstance'] is not None for row in pairing))}


def envelope_holds_tiers(per_object_rows, per_object=None):
    """The D5 envelope reading against the IMMUTABLE PLACEHOLDER envelope
    (the review P2-8): the hard-coded B0-measured placeholder extremes grown
    0.10 per side (PLACEHOLDER_ENVELOPE_GLTF) — never the subject's own bbox,
    never a foreign --builder's namespace constants. The pinned tiers (radii
    1.40/1.00/0.60 — the widest ring's diameter must fit; DY 0.85 — the
    two-tier vertical span must fit) are tested against the ENVELOPE's own
    spans in glTF space (the horizontal axes are the glTF x/z pair, the
    vertical axis is glTF y; the mapping to Blender is to_b's inverse). B2:
    when the per-object block carries the chandelier assembly, the union bbox
    is consumed from the ledger's glTF union (the review P1-1 — the Blender
    display bbox is emitted beside it and derives by the to_b inverse), and
    the ledger's unrounded envelopePass / minYFencePass verdicts ride the
    result for decide()'s hard-failure enforcement. Coordinates compare
    unrounded internally; only the display fields round."""
    env = PLACEHOLDER_ENVELOPE_GLTF
    horizontal = min(env[3] - env[0], env[5] - env[2])  # the glTF x/z pair = horizontal
    vertical = env[4] - env[1]                          # the glTF y = vertical
    tiers = CHANDELIER_PINNED
    fits = horizontal >= 2 * tiers['tierRadius'][0] and vertical >= 2 * tiers['tierDy']
    fit = min(horizontal / (2 * tiers['tierRadius'][0]), vertical / (2 * tiers['tierDy']))
    law = ('literal ring geometry on the immutable reference: the widest ring '
           'diameter and the two-tier span inside the hard-coded placeholder '
           'envelope (the placeholder bbox grown 0.10 per side); the arm '
           'archetypes hang inside the rings and scale with CHANDELIER_FIT')
    if (per_object or {}).get('chandelierAssembly') is not None:
        assembly = per_object['chandelierAssembly']
        union = assembly.get('unionExactGltf') or assembly['worldBboxGltf']
        return {'subject': 'the B2 chandelier assembly (union of the stem, the 36 arms '
                           'and the 300 beads)',
                'envelopeGltf': list(env), 'envelopeSource': PLACEHOLDER_ENVELOPE_SOURCE,
                'envelopeGrowM': 0.10,
                'bboxGltf': [round(float(v), 3) for v in union],
                'bboxBlender': assembly.get('worldBboxBlender'),
                'horizontalAvailableM': round(horizontal, 4),
                'verticalAvailableM': round(vertical, 4),
                'pinnedTiers': tiers, 'impliedFitScale': round(fit, 4), 'holds': bool(fits),
                'envelopePass': assembly.get('envelopePass'),
                'minYFencePass': assembly.get('minYFencePass'),
                'minYFenceGltf': assembly.get('minYFenceGltf', CHANDELIER_MIN_Y_GLTF),
                'law': law + (' The assembly\'s own union must also sit inside the '
                              'envelope and above the min-y fence — both verdicts are '
                              'computed unrounded in per_object_ledger and enforced by '
                              'the decision as hard failures.')}
    row = next(row for row in per_object_rows if row['object'] == 'chandelier')
    return {'subject': "the rebuilt placeholder chandelier ('chandelier' datablock)",
            'envelopeGltf': list(env), 'envelopeSource': PLACEHOLDER_ENVELOPE_SOURCE,
            'envelopeGrowM': 0.10,
            'bboxBlender': row['worldBboxBlender'],
            'bboxGltf': row.get('worldBboxGltf'),
            'horizontalAvailableM': round(horizontal, 4),
            'verticalAvailableM': round(vertical, 4),
            'pinnedTiers': tiers, 'impliedFitScale': round(fit, 4), 'holds': bool(fits),
            'envelopePass': None, 'minYFencePass': None,
            'law': law + (' The rebuilt placeholder\'s own measured bbox is displayed '
                          'beside the immutable reference; the roster identity '
                          '(b0.identity) binds the rebuild to the committed asset.')}


def decide(b0):
    """D5: EXACTLY ONE decision line. Priority ADMIT-FULL → FALSIFIED →
    ADMIT-SCONCES-ONLY (FALSIFIED outranks sconces-only: if even the gaze subject is
    under its threshold and nothing else reaches 0.10 %, the ranking's premise fails)."""
    frame = b0['frameShare']
    shares = {row['stop']: row['sharePct'] for row in frame['stops']}
    sconce_peak, sconce_stop = max(
        (shares[row['stop']]['sconceBody'] + shares[row['stop']]['sconceGlow'], row['stop'])
        for row in frame['stops'])
    chandelier_peak, chandelier_stop = max(
        (shares[row['stop']]['chandelierBody'] + shares[row['stop']]['chandelierGlow'], row['stop'])
        for row in frame['stops'])
    j1b_sconce = shares['J1b']['sconceBody'] + shares['J1b']['sconceGlow']
    j4_total = shares['J4']['allFixtures']
    block_cells = (b0['freeBlocks']['largestFreeRect'] or {'cells': 0})['cells']
    night_margin = b0['clampBaseline']['states']['nightChandeliers']['marginPct']
    envelope = envelope_holds_tiers(b0['perObject']['objects'], b0['perObject'])
    # The review (P2-8): envelope / min-y failures are HARD failures enforced
    # independently of the admission ranking — ADMIT-FULL is refused on any of
    # them; the ladder then yields ADMIT-SCONCES-ONLY while the sconce path
    # holds (the FALSIFIED ranking keeps its own law) or stops as UNRESOLVED.
    envelope_hard_failures = []
    if not envelope['holds']:
        envelope_hard_failures.append(
            'the pinned tiers do not fit the immutable placeholder envelope')
    if envelope.get('envelopePass') is False:
        envelope_hard_failures.append(
            'the assembly union overflows the immutable placeholder envelope')
    if envelope.get('minYFencePass') is False:
        envelope_hard_failures.append(
            'the assembly dips below CHANDELIER_MIN_Y (the min-y fence)')
    beyond_sconce_need = block_cells > SCONCE_NEED_CELLS
    admit_full = (sconce_peak >= 0.10 and chandelier_peak >= 0.10
                  and block_cells >= FIXTURE_LM_BLOCK_CELLS and night_margin >= 5.0
                  and not envelope_hard_failures)
    falsified = (j1b_sconce < 0.20
                 and all(shares[stop]['allFixtures'] < 0.10
                         for stop in shares if stop != 'J1b'))
    sconces_only = (chandelier_peak < 0.30 or not beyond_sconce_need
                    or not envelope['holds'] or bool(envelope_hard_failures))
    if j4_total == 0.0:
        j4 = {'sharePct': 0.0,
              'line': 'J4: fixture share 0 → «zero J4 golden flips» becomes a hard pin'}
    else:
        j4 = {'sharePct': j4_total,
              'line': (f'J4: fixture share {j4_total:.4f}% > 0 → a re-baseline of '
                       '(day, dusk, nightChandeliers) is PREDICTED, bounded to the fixture '
                       'mask dilated 8 px')}
    if admit_full:
        verdict = 'ADMIT-FULL'
    elif falsified:
        verdict = 'FALSIFIED'
    elif sconces_only:
        verdict = 'ADMIT-SCONCES-ONLY'
    else:
        # The D5 conditions have a literal hole (e.g. the chandelier ≥ 0.30 % at a
        # non-J1b stop while the free block sits at 3–5 cells): report it as
        # UNRESOLVED — the report still carries every number; the caller fails loud.
        return {'verdict': 'UNRESOLVED',
                'line': ('DECISION UNRESOLVED — no pinned D5 condition set holds; the census '
                         'stops for an owner ruling'),
                'unresolved': {'admitFull': admit_full, 'falsified': falsified,
                               'sconcesOnly': sconces_only},
                'envelope': envelope, 'envelopeHardFailures': envelope_hard_failures,
                'j4': j4}
    line = (f'DECISION {verdict} — sconce peak {sconce_peak:.4f}% at {sconce_stop} · '
            f'chandelier peak {chandelier_peak:.4f}% at {chandelier_stop} · '
            f'largest free rect {block_cells} cells · night margin {night_margin:.2f}%')
    return {'verdict': verdict, 'line': line,
            'sconcePeakPct': round(sconce_peak, 4), 'sconcePeakStop': sconce_stop,
            'chandelierPeakPct': round(chandelier_peak, 4), 'chandelierPeakStop': chandelier_stop,
            'j1bSconcePct': round(j1b_sconce, 4), 'j4FixtureSharePct': j4_total,
            'largestFreeRectCells': block_cells, 'nightMarginPct': night_margin,
            'beyondSconceNeed': bool(beyond_sconce_need), 'envelope': envelope,
            'envelopeHardFailures': envelope_hard_failures,
            'admitFull': {key: value for key, value in (
                ('sconce ≥ 0.10%', sconce_peak >= 0.10),
                ('chandelier ≥ 0.10%', chandelier_peak >= 0.10),
                ('free block ≥ 6 cells', block_cells >= FIXTURE_LM_BLOCK_CELLS),
                ('night margin ≥ 5%', night_margin >= 5.0))},
            'priority': 'ADMIT-FULL → FALSIFIED → ADMIT-SCONCES-ONLY (FALSIFIED outranks: '
                        'the gaze subject under 0.20% with nothing else at 0.10% fails the '
                        "ranking's premise)",
            'j4': j4}


def main():
    builder, out, plates, w, flags = parse_args()
    out.mkdir(parents=True, exist_ok=True)
    namespace, cells_map, meshes = build_scene(builder, out)
    cells_count = len(cells_map['cells'])
    # The review (P2-5): the --assert-max gate moves BEFORE classification — the
    # count is already in cells_map, so the gate fires even when census_cells()
    # would fail later on a drifted sidecar.
    if flags['assert_max'] is not None and cells_count > flags['assert_max']:
        raise SystemExit(f'census: {cells_count} cells exceed --assert-max {flags["assert_max"]}')
    # The review (P2-5): the packed-fixture sidecar schema validates BEFORE
    # classification — the readers can never silently revert to the committed
    # one-face/one-cell model on a lost sidecar.
    packed_note = validate_packed_schema(cells_map, meshes)
    analysis_flags = ('per_object', 'free_blocks', 'frame_share', 'clamp_baseline')
    analysis_on = any(flags[key] for key in analysis_flags)
    # The review (P1-3): wherever the census actually reads the public glb (the
    # b0 report's atlas/draw stats, the uv2 subset gates), the rebuilt scene is
    # bound to that inspected artifact FIRST — a mismatch stops the census
    # loudly; a placeholder rebuild beside a B2 glb is a stop, not a hybrid
    # certification.
    identity = None
    if analysis_on or flags['uv2_subset_hash']:
        identity = verify_scene_identity(namespace, meshes, B0_CHECKOUT,
                                         os.environ.get('FIXTURE_FORM'))
    # The review (P2-6): the view-layer update moves BEFORE census_cells for
    # every pass that reads world positions — the rig statistics must see
    # post-transform positions. The committed census never needed the transforms
    # (only the shell's bins read world coords and the shell is built
    # in-place), so the no-flag path keeps its byte-identical output — the
    # update runs only under the flags the committed tool never accepted.
    if analysis_on or flags['uv2_subset_hash']:
        bpy.context.view_layer.update()
    census, grid = census_cells(namespace, cells_map, meshes)
    rects = cell_rects(census, grid, int(cells_map.get('res', namespace.get('LM_RES', 2048))),
                       int(cells_map.get('padPx', namespace.get('LM_PAD_PX', 2))))
    per_state = {}
    for state, path in sorted(plates.items()):
        if not path.exists():
            raise SystemExit(f'census: plate {state} missing at {path}')
        per_state[state] = plate_stats(path, rects)
    report = {'plates': {state: str(path) for state, path in sorted(plates.items())},
              'bins': {}, 'w': {state: w[state] for state in per_state},
              'cells': len(census)}
    for state, per_cell in per_state.items():
        stats = bin_stats(census, per_cell)
        for bin_name, row in stats.items():
            row['stored255'] = srgb_stored(row['mean'], w[state])
        report['bins'][state] = stats
    # The Δ rulings (the bands round's classes rule ONLY from this table).
    deltas = {}
    for state in ('day', 'duskChandeliers', 'nightChandeliers'):
        if state not in report['bins']:
            continue
        bins = report['bins'][state]
        if 'pilaster' in bins and 'north_upper_flank' in bins:
            deltas[f'deltaPolicy_{state}'] = round(bins['pilaster']['mean']
                                                   - bins['north_upper_flank']['mean'], 5)
        if 'north_upper_flank' in bins and 'north_spandrel' in bins:
            deltas[f'deltaTier_{state}'] = round(bins['north_upper_flank']['mean']
                                                 - bins['north_spandrel']['mean'], 5)
    if 'worldonly' in report['bins']:
        bins = report['bins']['worldonly']
        north = bins.get('north_field_other', {}).get('mean')
        for other in ('south_wall', 'floor', 'ceiling', 'north_upper_flank'):
            if other in bins and north:
                deltas[f'worldRatio_{other}_over_north'] = round(
                    bins[other]['mean'] / north, 3)
    report['deltas'] = deltas
    report['perCell'] = per_cell_dump(census, per_state)
    # --- the jordan-fixtures B0 additions (additive: nothing above moved; the new
    # sections ride under report['b0'] and print after ZIMNY_CENSUS-END) ---
    b0 = None
    if analysis_on:
        b0 = {'flags': {key: bool(value) for key, value in flags.items() if key != 'json'},
              'builder': rel_to_checkout(builder), 'checkout': rel_to_checkout(B0_CHECKOUT)}
        if identity is not None:
            b0['identity'] = identity
        if packed_note is not None:
            b0['packedSchema'] = packed_note
        if flags['per_object']:
            b0['perObject'] = per_object_ledger(namespace, cells_map, meshes,
                                                os.environ.get('FIXTURE_FORM'))
        if flags['free_blocks']:
            b0['freeBlocks'] = free_blocks(cells_map, namespace)
        # the ATLAS_HASH is cheap (one glb parse) and every D5 consumer needs it
        b0['atlasHash'] = atlas_hash_and_stats(B0_CHECKOUT)
        if flags['frame_share']:
            b0['frameShare'] = frame_share(namespace, meshes)
        if flags['clamp_baseline']:
            b0['clampBaseline'] = clamp_baseline(B0_CHECKOUT, namespace, census, cells_map,
                                                 atlas_sha=b0['atlasHash']['sha256'])
        b0['selfCheck'] = self_check(B0_CHECKOUT, cells_count, b0['atlasHash'],
                                     os.environ.get('FIXTURE_FORM'))
        b0['completeness'] = completeness(cells_map, meshes, B0_CHECKOUT)
        if b0['selfCheck']['verdict'] != 'PASS':
            report['b0'] = b0
            report_text = json.dumps(report, sort_keys=True, indent=2) + '\n'
            (out / 'census.json').write_text(report_text, encoding='utf8')
            if flags['json']:
                json_path = pathlib.Path(flags['json'])
                json_path.parent.mkdir(parents=True, exist_ok=True)
                json_path.write_text(report_text, encoding='utf8')
            print('ZIMNY_CENSUS-STOP self-check FAILED — the report is not accepted; '
                  'fix the probe, never the room (K7)')
            raise SystemExit(1)
        if not b0['completeness']['pass']:
            # The review (P2-7): an incomplete census is FATAL to the decision —
            # no ADMIT-FULL / ADMIT-SCONCES-ONLY certifies a missing or extra
            # fixture instance; the report still writes and the exit is nonzero.
            report['b0'] = b0
            report_text = json.dumps(report, sort_keys=True, indent=2) + '\n'
            (out / 'census.json').write_text(report_text, encoding='utf8')
            if flags['json']:
                json_path = pathlib.Path(flags['json'])
                json_path.parent.mkdir(parents=True, exist_ok=True)
                json_path.write_text(report_text, encoding='utf8')
            print('ZIMNY_CENSUS-STOP completeness FAILED — the census is incomplete; '
                  'no admission verdict on an incomplete census')
            raise SystemExit(1)
        if all(flags[key] for key in analysis_flags):
            b0['decision'] = decide(b0)
        report['b0'] = b0
    elif identity is not None:
        report['identity'] = identity
    if flags['uv2_subset_hash']:
        # The B1 NO-REPACK gate: the non-fixture UV2 subset hash vs the baseline glb.
        # The B2 addition: the per-datablock fixture subsets + the B1 sconce-unchanged
        # gate (both additive; the default path untouched).
        report['uv2SubsetHash'] = uv2_subset_hash(B0_CHECKOUT, flags['uv2_baseline'],
                                                  flags['uv2_fixture_baseline'])
    out_path = out / 'census.json'
    out_path.write_text(json.dumps(report, sort_keys=True, indent=2) + '\n', encoding='utf8')
    if flags['json']:
        json_path = pathlib.Path(flags['json'])
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(report, sort_keys=True, indent=2) + '\n', encoding='utf8')
    print(f'ZIMNY_CENSUS {out_path}')
    header = 'bin'.ljust(22) + 'cells ' + ''.join(
        f'{state:>28}' for state in sorted(report['bins']))
    print(header)
    all_bins = sorted({bin_name for stats in report['bins'].values() for bin_name in stats})
    for bin_name in all_bins:
        line = bin_name.ljust(22) + f'{sum(stats[bin_name]["cells"] for stats in report["bins"].values() if bin_name in stats):5} '
        for state in sorted(report['bins']):
            stats = report['bins'][state]
            if bin_name in stats:
                row = stats[bin_name]
                line += f"raw {row['mean']:7.4f} st {row['stored255']:6.1f}  n{row['cells']:4}"
            else:
                line += ' ' * 28
        print(line)
    for key, value in deltas.items():
        print(f'  {key}: {value}')
    print('ZIMNY_CENSUS-END')
    # --- the B0 prints (always after the default block so the default stdout is untouched) ---
    if b0 is not None:
        checks = b0['selfCheck']['checks']
        print('ZIMNY_CENSUS-B0 self-check: '
              + ' · '.join(f'{key} {checks[key]["measured"]}/{checks[key]["expected"]}'
                           + ('' if checks[key]['pass'] else ' FAIL')
                           for key in sorted(checks))
              + f' → {b0["selfCheck"]["verdict"]}')
        print('ZIMNY_CENSUS-B0 atlas hash: ' + b0['atlasHash']['sha256'])
        block = b0['freeBlocks']['fixtureLmBlock'] if 'freeBlocks' in b0 else None
        if block is not None:
            print(f'ZIMNY_CENSUS-B0 FIXTURE_LM_BLOCK: cells {block["x0"]},{block["y0"]}..'
                  f'{block["x1"]},{block["y1"]} = {block["cells"]} cells '
                  f'(px {block["px"][0]},{block["px"][1]}..{block["px"][2]},{block["px"][3]})')
        if 'frameShare' in b0:
            for row in b0['frameShare']['stops']:
                share = row['sharePct']
                print(f'ZIMNY_CENSUS-B0 frame {row["stop"]}: sconce {share["sconceBody"]:.4f}'
                      f'+{share["sconceGlow"]:.4f}% · chandelier '
                      f'{share["chandelierBody"]:.4f}+{share["chandelierGlow"]:.4f}%'
                      f' · all {share["allFixtures"]:.4f}%')
        if 'decision' in b0:
            print('ZIMNY_CENSUS-B0 ' + b0['decision']['line'])
            print('ZIMNY_CENSUS-B0 ' + b0['decision']['j4']['line'])
        print('ZIMNY_CENSUS-B0-END')
        if 'decision' in b0 and b0['decision']['verdict'] == 'UNRESOLVED':
            raise SystemExit('census: the D5 conditions resolve to no pinned decision — '
                             'the report is written; stop for an owner ruling')
    if 'uv2SubsetHash' in report:
        # The review (P1-2): the subset results print independently of the B0
        # analysis block — with --uv2-subset-hash alone the stdout is no longer
        # suppressed under `if b0 is not None`.
        row = report['uv2SubsetHash']
        line = (f'ZIMNY_CENSUS-B1 uv2 subset (non-fixture): {row["checkout"]["sha256"]} '
                f'({row["checkout"]["texcoord1Accessors"]} accessors, '
                f'{row["checkout"]["texcoord1PayloadBytes"]} B)')
        if 'baseline' in row:
            line += (f' | baseline {row["baseline"]["sha256"]} '
                     f'({row["baseline"]["texcoord1PayloadBytes"]} B) → '
                     f'NO-REPACK {"PASS" if row["noRepackPass"] else "FAIL"}')
        print(line)
        for name, subset in sorted(row['checkoutFixtureSubsets'].items()):
            print(f'ZIMNY_CENSUS-B2 fixture subset {name}: {subset["sha256"]} '
                  f'({subset["texcoord1Accessors"]} accessors, '
                  f'{subset["texcoord1PayloadBytes"]} B)')
        if 'sconceUnchangedPass' in row:
            print('ZIMNY_CENSUS-B2 sconce subset vs the B1 baseline: '
                  + ('PASS' if row['sconceUnchangedPass'] else 'FAIL'))
            for name, ok in sorted(row['fixtureSubsetsUnchanged'].items()):
                print(f'ZIMNY_CENSUS-B2 fixture subset {name} unchanged vs the '
                      f'baseline: {"PASS" if ok else "FAIL"}')
        print('ZIMNY_CENSUS-B1-END')
        # The review (P1-2): a REQUESTED baseline comparison that fails exits
        # NONZERO after the diagnostics are written — an external JSON validator
        # is not the enforcement layer.
        gate_failures = []
        if 'noRepackPass' in row and not row['noRepackPass']:
            gate_failures.append(
                'NO-REPACK: the non-fixture UV2 subset moved vs the requested baseline '
                + str(row.get('baselineGlb')))
        if 'sconceUnchangedPass' in row and not row['sconceUnchangedPass']:
            gate_failures.append(
                'the sconce subset is not byte-identical to the requested fixture '
                'baseline ' + str(row.get('fixtureBaselineGlb')))
        if gate_failures:
            print('ZIMNY_CENSUS-STOP uv2 subset gate FAILED — ' + ' · '.join(gate_failures))
            raise SystemExit(1)


main()
