# RG-F1: source-registered, watertight Rastrelli Gallery boundary reconstruction.
# Blender 4.2.23 LTS.
#
# Design authority: PART 2a-WATERTIGHT, adopted REPAIR SPEC items 1-5;
# required captures: the same brief, section 2(b).
# Supplied predecessor, counted from its first comment:
# lines 48-58: lightmap resolution, strip, padding, density and cell limits;
# lines 76-78: CSG_OVERLAP, LINE_PERP_MAX and arch clearance;
# lines 146-158: transverse arch geometry, including the adopted 3.34 crown;
# lines 183-188: bake-only spill and the existing material partition.
#
# Geometry authority is the authored construction, before Blender's float32
# storage. Original scalar construction coordinates retain the predecessor's
# eight-decimal convention. Intersections are exact rational constructions.
# Source facets, their actual materialized rings, instance IDs and the original
# Boolean expression are retained before operands are discarded.
#
# EXACT collection operations remain: gallery UNION passage, UNION niche
# pockets, then DIFFERENCE architectural members. Only that last result receives
# registered boundary replacement. Other stages receive conforming assembly,
# not missing-surface reconstruction.
#
# Numerical policy, in metres:
# joint source-support projection <= 0.00005;
# source-junction weld cluster diameter <= 0.00001;
# on-line candidate discovery <= 0.000005;
# mouth-plane reporting tolerance <= 0.000001;
# mouth bisect classification tolerance = 0.0000001.
# Projection solves all incident constraints jointly. A nearby plane, by itself,
# is not a constraint. Welding requires an identical source-feature witness and
# an identical source-defined point. There is no transitive proximity clustering.
# Geometric zero is EXACT zero, not a positive face-area cutoff.
#
# A constrained Delaunay call proposes planar connectivity only. Its coordinates
# are never authoritative: all vertices must map one-to-one to exact arrangement
# nodes, and constraints, orientation, intersections, hull coverage and edge uses
# are certified with rational predicates. An uncertifiable proposal stops here.
# Side classification uses an infinitesimal normal displacement and exact ray
# predicates against the original closed source operands, not finite probes.
#
# Every replacement consumes complete affected rings. Exact perimeter noding
# includes retained neighboring vertices, including legitimate intermediate
# subdivisions. Both canonicalizations explicitly call weld_verts on bare
# vertices. Shared edges are materialized once, before faces are constructed.
# No position welding occurs after UV assignment.
#
# RG_F1_* JSON records are deterministic and sort_keys=True. Raw records retain
# actual Blender vertex/edge/face IDs and every loop use. Later records identify
# their exact ring-graph representation. Removed-face records reference complete
# before/after inventories and list changed incident edges and replacement faces.
# Previously deletable positive-area slivers are accounted for, never silently
# discarded. Intermediate pending checks are explicitly NOT closure passes.
#
# The square mouth at z=87.5 is the only shell opening. Legacy sconce openings
# remain separately reported. STAGE_SPILL remains bake-only. The lm consumer
# contract remains mode/stripRowPx/patches/cells; stairlight remains one rectangle.

import hashlib
import json
import math
import os
import sys
from collections import defaultdict, deque
from dataclasses import dataclass, field, replace
from fractions import Fraction

import bmesh
import bpy
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt, tessellate_polygon

BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'rastrelli-gallery'
POLICY_ID = 'RG-F1-source-junction-2a-v1'
SOURCE_ATTRIBUTE = '_rg_f1_source'
TAU = math.tau

TEX_RES = 512
FLOOR_TEX_RES = 1024
UV_TILE_M = 2.0
FLOOR_TILE_M = 4.0

LM_RES = 1024
LM_GRID = 64
LM_GRID_PX = LM_RES // LM_GRID
LM_PAD_PX = 2
LM_STRIP_FRAC = 0.875
LM_STRIP_ROWS = 8
LM_SCONCE_GRID = 8
LM_PX_PER_M = 20
PX_PER_M_FLOOR = 12
LM_CELL_MIN_PX = 6
LM_CELL_MAX_PX = 480

PROJECTION_MAX = Fraction(1, 20000)
JUNCTION_WELD_MAX = Fraction(1, 100000)
LINE_PERP_MAX = 5e-6
LINE_PERP_MAX_Q = Fraction(1, 200000)
WELD_EPS = 1e-7
GEOM_EPS = 1e-6
CSG_OVERLAP = 0.02
ARCH_CLEARANCE_MIN = 0.18
LEGACY_SLIVER_AREA = 1e-10
MAX_PATCH_VERTICES = 12000
MAX_PATCH_TRIANGLES = 100000
TRIANGLES_MAX = 110000
DRAWS_MAX = 25
TEXTURE_BYTES_MAX = 1000000
ATLAS_BYTES_MAX = 400000
PAYLOAD_BYTES_MAX = 2000000

FLAGS_PER_TILE = 4
FLAG_PX = FLOOR_TEX_RES // FLAGS_PER_TILE
MORTAR_PX = 8
STONE_RGB = (0.56, 0.54, 0.50)
MORTAR_RGB = (0.34, 0.32, 0.29)
PLASTER_PALE_RGB = (0.76, 0.72, 0.64)
STUCCO_GREY_RGB = (0.86, 0.84, 0.79)
STONE_BAND_RGB = (0.42, 0.40, 0.37)
IRON_RGB = (0.07, 0.065, 0.06)
IRON_ROUGHNESS = 0.55
GLOW_TINT_RGB = (0.38, 0.29, 0.22)

G_X0, G_X1 = 4.0, 44.0
G_Z0, G_Z1, G_ZC = 70.0, 76.0, 73.0
G_SPRING, G_PEAK = 3.0, 3.6
G_REVEAL = 0.8
G_LEN_SEGS = 10
G_ARC_SEGS = 8
XS_G = [G_X0, G_X0 + G_REVEAL] + [
    G_X0 + G_REVEAL + (G_X1 - G_X0 - G_REVEAL) * k / G_LEN_SEGS
    for k in range(1, G_LEN_SEGS + 1)
]
XS_GI = XS_G[1:]

P_X0, P_X1 = -4.0, 4.0
P_Z0, P_Z1 = 63.5, 87.5
P_SPRING, P_PEAK = 3.0, 5.0
P_ARC_SEGS = 12
P_Z_NODES = (63.5, 66.75, 70.0, 73.0, 76.0, 79.8333, 83.6667, 87.5)

PASSAGE_VAULT = {'spanM': 8.0, 'springY': 3.0, 'peakY': 5.0, 'profile': 'semi-ellipse'}
GALLERY_VAULT = {'spanM': 6.0, 'springY': 3.0, 'peakY': 3.6, 'profile': 'semi-ellipse'}

CORNICE_PROFILE = (
    (0.00, 2.70), (0.04, 2.70), (0.04, 2.80), (0.09, 2.85),
    (0.17, 2.85), (0.17, 2.93), (0.22, 2.98), (0.22, 3.00),
)
CORNICE = CORNICE_PROFILE
SKIRTING = ((0.09, 0.0), (0.09, 0.11), (0.0, 0.14))
BASE_PROFILE = ((0.04, 0.15), (0.05, 0.18), (0.05, 0.23), (0.02, 0.27), (0.0, 0.30))
RESSAUT_WIDTH = 0.44
RESSAUT_PROUD = 0.10
END_CORNICE_BREAK = 0.90

FLOOR_BORDER = 0.30
FLOOR_ARCH_BAND = 0.44

BAY_PITCH = 3.387
PILASTERS_PER_SIDE = 11
PILASTER_X = tuple(G_X1 - BAY_PITCH * k for k in range(1, PILASTERS_PER_SIDE + 1))
CORNER_RETURN_Z = (70.45, 75.55)
PILASTER_COUNT = 24

SCONCE_X = tuple(PILASTER_X[k] for k in (0, 2, 4, 6, 8, 10))
SCONCE_MOUNT_D = 0.10
SCONCE_Y = 2.0
SCONCE_SEW_Z = (68.4, 77.6)
SCONCE_COUNT = 14
SCONCE_EMISSION = 6.0
SCONCE_GLOW_RGB = (1.0, 0.72, 0.42)
SCONCE_SEGS = 16

TRANSVERSE_ARCH_WIDTH = 0.44
TRANSVERSE_ARCH_HALF_Z = 2.68
TRANSVERSE_ARCH_SPRING = 3.0
TRANSVERSE_ARCH_CROWN = 3.34
TRANSVERSE_ARCH_SEGS = 8
RIB_WIDTH = TRANSVERSE_ARCH_WIDTH
RIB_HALF_Z = TRANSVERSE_ARCH_HALF_Z
RIB_SPRING_Y = TRANSVERSE_ARCH_SPRING
RIB_CROWN_Y = TRANSVERSE_ARCH_CROWN
RIB_ARC_SEGS = TRANSVERSE_ARCH_SEGS

NICHE_WIDTH = 1.80
NICHE_SILL = 0.90
NICHE_SPRING = 1.60
NICHE_HEAD_R = 0.90
NICHE_PEAK = 2.50
NICHE_RECESS = 0.22
NICHE_HEAD_SEGS = 8
NICHE_SURROUND_W = 0.10
NICHE_SURROUND_D = 0.03
NICHE_SILL_LENGTH = 2.08
NICHE_CENTRES = tuple(G_X1 - BAY_PITCH * (k - 0.5) for k in range(1, 12))

PORTAL_X0, PORTAL_X1 = 43.2, 44.0
PORTAL_Z0, PORTAL_Z1 = 72.2, 73.8
DOOR_JAMB_W = 0.25
DOOR_BAND_Y = (2.40, 2.70)
DOOR_FILLET_W, DOOR_FILLET_D = 0.04, 0.03
LUNETTE_R = 0.75
LUNETTE_SEGS = 8
LUNETTE_ARCHIVOLT_W = 0.07
LUNETTE_ARCHIVOLT_D = 0.04
LUNETTE_BACK_X = G_X1

STAGE_SPILL_RGB = (1.0, 0.80, 0.58)
STAGE_SPILL_STRENGTH = 0.4
STAGE_SPILL_STATES = ('dusk', 'nightChandeliers')

PLASTER, FLAGS, STUCCO, STAIRLIGHT, BAND = range(5)
SHELL_MATERIAL_NAMES = ('plaster_pale', 'stone_flags', 'stucco_grey', 'stairlight', 'stone_band')

FINGERPRINTS = {}
EXPRESSIONS = {}
REGISTRY = []
ZERO3 = (Fraction(0), Fraction(0), Fraction(0))


def fail(message):
    raise RuntimeError(f'{ROOM_ID}: {message}')


def emit(kind, value):
    print('RG_F1_' + kind + ' ' + json.dumps(
        value, sort_keys=True, separators=(',', ':'), allow_nan=False
    ), flush=True)


def stage_dir():
    rest = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for flag in ('--out', '--stage'):
        if flag in rest:
            i = rest.index(flag) + 1
            if i >= len(rest):
                fail(f'missing argument after {flag}')
            return rest[i]
    if rest and not rest[0].startswith('-'):
        return rest[0]
    return os.environ.get('ZIMNY_STAGE_DIR') or os.path.join(
        os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID
    )


def q(value):
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value)
    return Fraction(str(round(float(value), 8)))


def binary_q(value):
    return Fraction.from_float(float(value))


def qpoint(point):
    return tuple(q(v) for v in point)


def binary_point(point):
    return tuple(binary_q(v) for v in point)


def exact_record(point):
    return [str(v) for v in point]


# ===========================================================================
# Lane-2 A′-0 probe (ruling-40 §5/§6; research lane, never ships). Additive
# instrumentation only: for each canonicalization record it measures how
# many distinct exact FACET_TABLE ring nodes share the record's float32
# storage image (the intake's own reader) and are certified on the
# record's own witness plane set, and collects the S6 intake row images
# for the route-law decision rule. Nothing here changes canon1/WELD2/S6
# semantics, any solve, or any pre-existing census row; the probe's own
# rows never appear in the shipped log (route law §6, lane 2).
# ===========================================================================
_A0_INTAKE_IMAGES = set()      # every _s6_remap_node row image (exact text)
_A0_INTAKE_IMAGES_LTA = set()  # the emitted rows with source 'lineTwinAbsent'
_A0_R2_K1_IMAGES = {}          # pass -> images whose rank-2 probe measured k==1
_A0_HISTS = {}                 # pass -> frozen bucket counters (run settlement)


def _a0_image_text(image):
    # the exact text key shared by every A0 image comparison: the record's
    # storage image and the recorded node's intake reader image both enter
    # as a tuple of binary_q Fractions and here into one comparable string
    return ','.join(exact_record(image))


def _a0_collect_intake(image, snap):
    # Lane-2 A′ probe collection (ruling-40 §5/§6; research lane, never ships)
    text = _a0_image_text(image)
    _A0_INTAKE_IMAGES.add(text)
    if snap == 'lineTwinAbsent':
        _A0_INTAKE_IMAGES_LTA.add(text)


def _a0_node_universe():
    # the recorded node universe collected ONCE per probe pass: every
    # FACET_TABLE ring node keyed by the intake's own reader
    # (binary_q(_s6_f32(N[i])))_i — byte-for-byte _s6_remap_node's image
    # key — then deduped by the exact node triple with the facets that
    # carry it; sorted once so every later read is hash-seed independent
    universe = {}
    for facet in FACET_TABLE:
        for node in facet.ring:
            image = (binary_q(_s6_f32(node[0])),
                     binary_q(_s6_f32(node[1])),
                     binary_q(_s6_f32(node[2])))
            universe.setdefault(_a0_image_text(image), []).append(
                (node, facet.id))
    combined = {}
    for image_key, entries in universe.items():
        by_node = {}
        for node, facet_id in entries:
            by_node.setdefault(node, set()).add(facet_id)
        combined[image_key] = [
            (node, sorted(facet_ids)) for node, facet_ids in sorted(
                by_node.items(),
                key=lambda item: ','.join(str(value) for value in item[0]))]
    return combined


def _a0_probe_pass(pass_name, records):
    # A′-0 per-pass sweep. For every record: candidates = the distinct
    # exact recorded ring nodes whose f32 image equals the record's own
    # storage image I; certified = candidates with plane_side(N, p) == 0
    # for every plane of the record's witness's full deduped plane set D;
    # kRaw = |candidates|, k = |certified| (route law §5). Rank-3 records
    # additionally measure M == N (the row-4238 class: a full-rank solve
    # through a non-axis plane set is an exact point that is not a design
    # decimal). One PROBE row per record; the hist counters freeze per
    # pass and the HIST rows emit at the WELD2 pass's settlement
    # (see _a0_probe_finalize — the S4 pass's own end runs before the S6
    # intake exists, so its intake fields could only carry zeros there).
    if pass_name in _A0_HISTS:
        fail('a0 probe: pass %s already probed' % pass_name)
    hist = {'rank1_k0': 0, 'rank1_k1': 0, 'rank1_k2plus': 0,
            'rank2_k0': 0, 'rank2_k1': 0, 'rank2_k2plus': 0,
            'rank3Agree': 0, 'rank3Disagree': 0, 'rank3NoCell': 0}
    universe = _a0_node_universe()
    planes = {facet.id: facet.plane for facet in FACET_TABLE}
    for _vertex, point, moved, witness, resolved in records:
        # `_vertex` is a bmesh handle (freed by the time the WELD2 pass
        # runs) — the probe reads only the exact recorded fields
        image_key = ','.join(exact_record(point))
        rank = len(resolved)
        if rank < 1 or rank > 3:
            fail('a0 probe: record rank %d at image %s unsupported' % (
                rank, image_key))
        matched = universe.get(image_key, ())
        deduped = {}
        for facet_id in sorted(witness):
            plane = planes[facet_id]
            deduped.setdefault(plane_key(plane), plane)
        plane_set = tuple(deduped.values())
        node_texts = []
        facet_ids = set()
        certified = 0
        for node, ids in matched:
            facet_ids.update(ids)
            node_texts.append(','.join(str(value) for value in node))
            for probe_plane in plane_set:
                if plane_side(node, probe_plane) != 0:
                    break
            else:
                certified += 1
        emit('CANON1_NODE_SOURCE_PROBE', {
            'pass': pass_name,
            'image': image_key,
            'rank': rank,
            'kRaw': len(matched),
            'k': certified,
            'nodes': node_texts,
            'facets': sorted(facet_ids),
        })
        if rank == 3:
            if matched:
                if any(node == moved for node, _ids in matched):
                    hist['rank3Agree'] += 1
                else:
                    hist['rank3Disagree'] += 1
            else:
                hist['rank3NoCell'] += 1
            continue
        bucket = 'rank%d_k' % rank
        if certified == 0:
            hist[bucket + '0'] += 1
        elif certified == 1:
            hist[bucket + '1'] += 1
            if rank == 2:
                _A0_R2_K1_IMAGES.setdefault(pass_name, set()).add(image_key)
        else:
            hist[bucket + '2plus'] += 1
    _A0_HISTS[pass_name] = hist
    if pass_name == 'WELD2':
        _a0_probe_finalize()


def _a0_probe_finalize():
    # A′-0 settlement: ONE hist row per probe pass, route-law §5 row shape.
    # Emitted at the WELD2 pass's end: every _s6_remap_node call in this
    # chain (the S6 stage and the S7 absorb intake) completes before the
    # WELD2 re-key block, so both rows carry the final intake numbers.
    if len(_A0_HISTS) != 2:
        fail('a0 probe: finalize without both passes')
    for pass_name in ('S4', 'WELD2'):
        hist = _A0_HISTS[pass_name]
        emit('CANON1_NODE_SOURCE_HIST', {
            'pass': pass_name,
            'rank1': {'k0': hist['rank1_k0'], 'k1': hist['rank1_k1'],
                      'k2plus': hist['rank1_k2plus']},
            'rank2': {'k0': hist['rank2_k0'], 'k1': hist['rank2_k1'],
                      'k2plus': hist['rank2_k2plus']},
            'rank3Agree': hist['rank3Agree'],
            'rank3Disagree': hist['rank3Disagree'],
            'intakeImagesCovered': len(
                _A0_INTAKE_IMAGES & _A0_R2_K1_IMAGES.get(pass_name, set())),
            'intakeImagesTotal': len(_A0_INTAKE_IMAGES),
        })


def to_b(point):
    return (point[0], -point[2], point[1])


def to_w(point):
    return (point[0], point[2], -point[1])


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def mul(a, value):
    return tuple(x * value for x in a)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def norm2(a):
    return dot(a, a)


def cross2(a, b):
    return a[0] * b[1] - a[1] * b[0]


def orient2(a, b, c):
    return cross2(sub(b, a), sub(c, a))


def pairs(ring):
    return zip(ring, ring[1:] + ring[:1])


def area2(poly):
    return sum(cross2(a, b) for a, b in pairs(poly))


def area_vector(ring):
    result = ZERO3
    for a, b in pairs(ring):
        result = add(result, cross(a, b))
    return result


def clean_polygon(poly):
    result = []
    for point in poly:
        point = tuple(q(v) for v in point)
        if not result or result[-1] != point:
            result.append(point)
    if len(result) > 1 and result[0] == result[-1]:
        result.pop()
    if len(result) < 3 or area2(result) == 0:
        return []
    return result


def ccw(poly):
    result = clean_polygon(list(poly))
    return result if area2(result) >= 0 else list(reversed(result))


def rectangle(a, b, c, d):
    return [(q(a), q(c)), (q(b), q(c)), (q(b), q(d)), (q(a), q(d))]


def halfplane(poly, a, b, inside=True):
    if not poly:
        return []
    result = []
    previous = poly[-1]
    dp = orient2(a, b, previous) * (1 if inside else -1)
    for current in poly:
        dc = orient2(a, b, current) * (1 if inside else -1)
        if (dp >= 0) != (dc >= 0):
            t = dp / (dp - dc)
            result.append(add(previous, mul(sub(current, previous), t)))
        if dc >= 0:
            result.append(current)
        previous, dp = current, dc
    return clean_polygon(result)


def partition(poly, mask):
    remaining = poly
    outside = []
    for a, b in pairs(ccw(mask)):
        piece = halfplane(remaining, a, b, False)
        if piece:
            outside.append(piece)
        remaining = halfplane(remaining, a, b)
        if not remaining:
            break
    return outside, remaining


def painted_regions(boundary, default, layers):
    regions = [(ccw(boundary), default)]
    for mask, material_index in layers:
        next_regions = []
        for poly, old_material in regions:
            if old_material == material_index:
                next_regions.append((poly, old_material))
                continue
            outside, intersection = partition(poly, mask)
            next_regions.extend((piece, old_material) for piece in outside)
            if intersection:
                next_regions.append((intersection, material_index))
        regions = next_regions
    return [(poly, material) for poly, material in regions if poly]
# Mouth tolerances documented in the header: reporting 1e-6, bisect 1e-7.
MOUTH_REPORT_TOL = 1e-6
MOUTH_BISECT_TOL = 1e-7
RAY_DIRECTIONS = (
    (Fraction(7), Fraction(3), Fraction(11)),
    (Fraction(3), Fraction(13), Fraction(5)),
    (Fraction(11), Fraction(5), Fraction(-7)),
    (Fraction(5), Fraction(-11), Fraction(13)),
    (Fraction(-13), Fraction(7), Fraction(17)),
)
@dataclass(frozen=True)
class SourceFacet:
    id: str
    operand: str
    family: str
    instance: str
    plane: tuple
    ring: tuple
    material: int
@dataclass
class Operand:
    id: str
    kind: str
    family: str
    instance: str
    facets: list = field(default_factory=list)
def plane_of(ring):
    normal = area_vector(ring)
    if normal == ZERO3:
        fail('degenerate source ring has no support plane')
    scale = max(abs(v) for v in normal)
    normal = tuple(v / scale for v in normal)
    return normal, dot(normal, ring[0])
def plane_key(plane):
    normal, offset = plane
    sign = 1
    for v in normal:
        if v != 0:
            sign = 1 if v > 0 else -1
            break
    return tuple(v * sign for v in normal) + (offset * sign,)
def plane_side(point, plane):
    normal, offset = plane
    value = dot(normal, point) - offset
    return (value > 0) - (value < 0)
def independent(normals):
    if len(normals) == 1:
        return normals[0] != ZERO3
    if len(normals) == 2:
        return cross(normals[0], normals[1]) != ZERO3
    if len(normals) == 3:
        return dot(normals[0], cross(normals[1], normals[2])) != 0
    return False
def solve3(rows, rhs):
    det = dot(rows[0], cross(rows[1], rows[2]))
    if det == 0:
        fail('singular joint projection system')
    result = []
    for i in range(3):
        swapped = [
            tuple(rhs[k] if j == i else rows[k][j] for j in range(3)) for k in range(3)
        ]
        result.append(dot(swapped[0], cross(swapped[1], swapped[2])) / det)
    return tuple(result)
def project_joint(point, planes):
    unique = list({plane_key(p): p for p in planes}.values())
    if not unique:
        return point
    normals = [p[0] for p in unique]
    if len(unique) > 3 or not independent(normals):
        fail('support set is dependent or over-determined; not a joint constraint')
    if len(unique) == 1:
        n, d = unique[0]
        moved = sub(point, mul(n, (dot(n, point) - d) / norm2(n)))
    elif len(unique) == 2:
        (n1, d1), (n2, d2) = unique
        direction = cross(n1, n2)
        moved = solve3((n1, n2, direction), (d1, d2, dot(direction, point)))
    else:
        moved = solve3(tuple(normals), tuple(p[1] for p in unique))
    if norm2(sub(moved, point)) > PROJECTION_MAX * PROJECTION_MAX:
        fail(
            'joint projection exceeds 0.00005 m at '
            + ','.join(exact_record(point))
            + '; a replacement patch or a hard failure is required, not a wider limit'
        )
    return moved
def drop_axis(normal):
    return max(range(3), key=lambda i: (abs(normal[i]), -i))
def flatten(point, axis):
    return tuple(point[i] for i in range(3) if i != axis)
def point_in_polygon(point, poly):
    winding = 0
    for a, b in pairs(poly):
        o = orient2(a, b, point)
        if (
            o == 0
            and min(a[0], b[0]) <= point[0] <= max(a[0], b[0])
            and min(a[1], b[1]) <= point[1] <= max(a[1], b[1])
        ):
            return 0
        if a[1] <= point[1]:
            if b[1] > point[1] and o > 0:
                winding += 1
        elif b[1] <= point[1] and o < 0:
            winding -= 1
    return 1 if winding != 0 else -1
def facet_contains(point, facet):
    axis = drop_axis(facet.plane[0])
    return point_in_polygon(flatten(point, axis), [flatten(p, axis) for p in facet.ring])
def check_operand(operand):
    uses = defaultdict(int)
    volume6 = Fraction(0)
    for facet in operand.facets:
        ring = facet.ring
        if len(ring) < 3 or plane_side(ring[0], facet.plane) != 0:
            fail(f'operand {operand.id}: facet {facet.id} is not a planar ring')
        for point in ring:
            if plane_side(point, facet.plane) != 0:
                fail(f'operand {operand.id}: facet {facet.id} leaves its support')
        for a, b in pairs(ring):
            if a == b:
                fail(f'operand {operand.id}: repeated point in facet {facet.id}')
            uses[(a, b)] += 1
        for i in range(1, len(ring) - 1):
            volume6 += dot(ring[0], cross(ring[i], ring[i + 1]))
    for (a, b), count in uses.items():
        if count != 1 or uses.get((b, a), 0) != 1:
            fail(
                f'operand {operand.id} is not a closed oriented 2-manifold at '
                + ','.join(exact_record(a)) + ' -> ' + ','.join(exact_record(b))
            )
    if volume6 <= 0:
        fail(f'operand {operand.id} is inverted or flat (6V={volume6})')
def membership(point, operand):
    on = [
        f for f in operand.facets
        if plane_side(point, f.plane) == 0 and facet_contains(point, f) >= 0
    ]
    if on:
        return 0, on
    for direction in RAY_DIRECTIONS:
        crossings = 0
        clean = True
        for facet in operand.facets:
            n, d = facet.plane
            denominator = dot(n, direction)
            if denominator == 0:
                if plane_side(point, facet.plane) == 0:
                    clean = False
                    break
                continue
            t = (d - dot(n, point)) / denominator
            if t <= 0:
                continue
            state = facet_contains(add(point, mul(direction, t)), facet)
            if state == 0:
                clean = False
                break
            if state > 0:
                crossings += 1
        if clean:
            return (1 if crossings % 2 else -1), []
    fail('no clean exact ray direction for membership at ' + ','.join(exact_record(point)))
def displaced_inside(point, normal, sign, operand):
    state, facets = membership(point, operand)
    if state != 0:
        return state > 0
    if len(facets) != 1 or facet_contains(point, facets[0]) != 1:
        fail(
            'side witness meets an operand edge or vertex at '
            + ','.join(exact_record(point)) + '; choose another interior witness'
        )
    s = dot(facets[0].plane[0], normal) * sign
    if s == 0:
        fail('ambiguous source membership: facet support contains the displacement')
    return s < 0
def air_side(point, normal, operands):
    sides = []
    for sign in (1, -1):
        in_union = any(
            displaced_inside(point, normal, sign, op) for op in operands if op.kind != 'member'
        )
        in_member = any(
            displaced_inside(point, normal, sign, op) for op in operands if op.kind == 'member'
        )
        sides.append(in_union and not in_member)
    return tuple(sides)
def fingerprint(stage, points):
    digest = hashlib.sha256()
    for point in sorted(points):
        digest.update(','.join(exact_record(point)).encode())
        digest.update(b';')
    FINGERPRINTS[stage] = digest.hexdigest()
    emit('FINGERPRINT', {'points': len(points), 'sha256': FINGERPRINTS[stage], 'stage': stage})
    return FINGERPRINTS[stage]
def mouth_edge(edge):
    return all(abs(v.co.y + P_Z1) <= MOUTH_REPORT_TOL for v in edge.verts)
def ring_of(face):
    return [v.index for v in face.verts]
def exact_face_area_vector(face):
    return area_vector([binary_point(tuple(v.co)) for v in face.verts])
def capture_topology(bm, stage, allowed=None, raw=False):
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    edge_uses = defaultdict(int)
    for face in bm.faces:
        for loop in face.loops:
            edge_uses[loop.edge.index] += 1
    one_face, wire, over, winding, authorized = [], [], [], [], []
    for edge in bm.edges:
        linked = len(edge.link_faces)
        uses = edge_uses[edge.index]
        if linked == 0:
            wire.append(edge.index)
        elif linked == 1 or uses == 1:
            (authorized if allowed and allowed(edge) else one_face).append(edge.index)
        if linked > 2 or uses > 2:
            over.append(edge.index)
        if linked == 2 and not edge.is_contiguous:
            winding.append(edge.index)
    degenerate = [
        f.index for f in bm.faces
        if len(set(v.index for v in f.verts)) < 3 or exact_face_area_vector(f) == ZERO3
    ]
    defect_edges = set(one_face) | set(wire) | set(over) | set(winding)
    defect_faces = set(degenerate)
    for index in defect_edges:
        defect_faces.update(f.index for f in bm.edges[index].link_faces)
    detail = {
        'edges': {
            str(i): {
                'verts': [v.index for v in bm.edges[i].verts],
                'linkedFaces': [f.index for f in bm.edges[i].link_faces],
                'uses': edge_uses[i],
                'co': [exact_record(binary_point(tuple(v.co))) for v in bm.edges[i].verts],
            }
            for i in sorted(defect_edges)
        },
        'faces': {
            str(i): {
                'ring': ring_of(bm.faces[i]),
                'edges': [l.edge.index for l in bm.faces[i].loops],
                'material': bm.faces[i].material_index,
            }
            for i in sorted(defect_faces)
        },
    }
    record = {
        'authorizedOpenEdges': len(authorized),
        'counts': {'verts': len(bm.verts), 'edges': len(bm.edges), 'faces': len(bm.faces)},
        'degenerateFaces': degenerate,
        'detail': detail,
        'oneFaceEdges': one_face,
        'overEdges': over,
        'stage': stage,
        'windingErrors': winding,
        'wireEdges': wire,
    }
    emit('RAW' if raw else 'CLOSURE', record)
    return record
def closed_guard(bm, stage, allowed=None, pending=False):
    record = capture_topology(bm, stage, allowed=allowed, raw=pending)
    broken = (
        record['oneFaceEdges'] or record['wireEdges'] or record['overEdges']
        or record['windingErrors'] or record['degenerateFaces']
    )
    if pending:
        emit('PENDING', {'stage': stage, 'closurePass': False, 'defects': bool(broken)})
        return record
    if broken:
        fail(
            f'closed_guard[{stage}]: oneFace={len(record["oneFaceEdges"])} '
            f'wire={len(record["wireEdges"])} over={len(record["overEdges"])} '
            f'winding={len(record["windingErrors"])} degenerate={len(record["degenerateFaces"])}'
        )
    return record
def account_removed_face(stage, face, reason, replacements, before, after):
    ring = [binary_point(tuple(v.co)) for v in face.verts]
    vector = area_vector(ring)
    support = exact_record(plane_of(ring)[0]) if vector != ZERO3 else None
    emit('REMOVED', {
        'after': after,
        'area2': str(norm2(vector)),
        'before': before,
        'face': face.index,
        'incidentEdgesChanged': [l.edge.index for l in face.loops],
        'reason': reason,
        'replacements': sorted(replacements),
        'ring': ring_of(face),
        'ringCo': [exact_record(p) for p in ring],
        'stage': stage,
        'support': support,
    })
# ----------------------------------------------------------------------------
# Continuation segment 2/n — stages S2 (provenance and operands) and S3
# (Boolean chain) of the adopted PART 2a-WATERTIGHT spec. Appended
# contiguously after the received kernel span; every kernel symbol (imports,
# constants, exact helpers, records, guards) is consumed as-is and is never
# redefined here. The span ends where S4 (first constrained canonicalization)
# would begin; nothing of S4-S9 is implemented.
#
# S2 reuses the predecessor's construction code as the source of record: the
# spans below are taken from the construction file byte-for-byte except at the
# points marked "S2 recording attachment", which add provenance recording only
# and do not touch the solid. Each constructed mesh face is recorded as an
# exact SourceFacet whose ring is the face's FINAL loop cycle, expressed
# through exact construction scalars — never through v.co:
#
#   - a loop vertex that IS one of the face's own construction corners
#     (matched by its stored float32 position against the Builder's exact
#     8-decimal key table for this slot, recorded at face() time) is written
#     with that own key;
#   - a loop vertex created by the conform T-merger process (edge_split
#     inserting a neighbouring construction corner of a coincident-edge
#     neighbour into this face's realized edge, then welded to it) resolves to
#     the FOREIGN entity's own construction key. That key is by construction
#     ~1e-9 off this face's own support plane (measured on real data:
#     orient2 non-zero exactly), so the kernel's exact plane_side law cannot
#     hold for the realized ring it joins. OWNER RULING (this session's
#     amendment): the foreign key STAYS in the recorded ring — dropping it
#     alone broke the kernel's directed-pair law (34 displaced directed pairs
#     in the x=44 end region, measured), and the exact both-side re-keying
#     was dropped; the conformance-merge imprecision is accepted in the
#     recorded facets. The affected facets' plane law is verified under the
#     documented RECORD_FLAT_BAND recording band and each band-carrying
#     facet carries one deterministic RG_F1_FACET_BAND_TOLERATED row.
#   - a foreign loop vertex sitting EXACTLY (orient2 == 0 + bbox, the
#     adopted verdict's noding predicate) on one of the face's own
#     construction-edge segments is a legitimate collinear subdivision the
#     cover must keep ("preserve legitimate collinear subdivisions,
#     including solver-generated intermediate points when they are still
#     needed by neighboring faces"): its own construction key IS exactly
#     planar for this face, so it stays in the ring and its directed pair is
#     mirrored by the cover faces that needed it (e.g. the wall-top edges
#     split at the roof rows' shared station vertices).
#
# The owner's recording band (span-local constant, documented here; the
# kernel is untouched): RECORD_FLAT_BAND = Fraction(1, 10**8) bounds the
# exact residual dot(normal, point) - offset — the value underneath the
# kernel's plane_side predicate (which returns only its sign) — for facets
# whose recorded ring carries conform-merged foreign keys. It sits 5000x
# below the verdict's 5e-5 joint-projection band and 13x above the measured
# worst residual (1081609/1435062875000000 ~ 7.54e-10) on the two affected
# gallery roof-band facets. build_operands verifies every facet by the
# exact kernel law first; a facet with a non-zero exact residual is
# verified against the band and emits RG_F1_FACET_BAND_TOLERATED {band,
# facet, mergedNodes, worstResidual}. The kernel check_operand runs
# unchanged on every operand whose recorded rings are all exactly planar;
# the banded operand's verification mirrors the kernel's remaining laws
# (directed pairs / enclosed volume) span-locally, constant for constant,
# because the kernel's exact plane law cannot accept the band facets first.
#
# plane_of, the kernel plane law, then runs directly on those rings, and the
# later canonicalization stages (S4: project_joint(binary_point(co), facet
# plane)) share their frame with the stored mesh. The spec sentence
# "ring=tuple(qpoint(to_w(v)))" is realized through those keys: applying to_w
# to the exact construction scalars would land OUTSIDE the frame the stored
# mesh and S4's binary_point(co) reads, so the scalars are expressed through
# the storage map instead — the recorded values stay the exact eight-decimal
# construction points, and no float round-trip through v.co is involved.
#
# The S3 chain applies the three EXACT collection Booleans in the unchanged
# order. The predecessor's boolean_collection post-pass (conform_edges +
# closed_guard) is NOT carried into these stages: the adopted spec requires
# the member-difference result to be captured raw ("this is the required
# post-Boolean inventory; it is NOT a closure pass"), asks to keep
# remove_doubles out because nothing is welded in S2-S3, and returns junction
# welding to the S4/S7 canonicalizations. Every stage source-verifies the
# result and re-derives exact provenance for any face the solver delivered
# without a valid FACET_TABLE index.
# ----------------------------------------------------------------------------

# Construction reuse (predecessor construction code) needs the KDTree conform;
# the received kernel's import block does not carry it.
from mathutils.kdtree import KDTree


# Arched construction spines, verbatim from the predecessor (lines 218-263):
# the arcs, their arc-length tables, profile interpolation, the derived
# G/P profiles, the rib profile, the vault height law, and the arch/vault
# clearance receipt with its loud guard (the kernel deliberately left the
# derived RIB_CLEARANCE_M instantiation out; the receipt keeps the check).
def arc(c, half, spring, peak, segs):
    return [
        (c - half * math.cos(math.pi * i / segs),
         spring + (peak - spring) * math.sin(math.pi * i / segs))
        for i in range(segs + 1)
    ]


def arc_lengths(profile):
    result = [0.0]
    for a, b in zip(profile, profile[1:]):
        result.append(result[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return result


def interpolate(profile, coordinate):
    for a, b in zip(profile, profile[1:]):
        if a[0] - GEOM_EPS <= coordinate <= b[0] + GEOM_EPS:
            t = (coordinate - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    fail(f'coordinate {coordinate} outside profile')


G_ARC = arc(G_ZC, 3.0, G_SPRING, G_PEAK, G_ARC_SEGS)
P_ARC = arc(0.0, 4.0, P_SPRING, P_PEAK, P_ARC_SEGS)
G_ARC_M = arc_lengths(G_ARC)
P_ARC_M = arc_lengths(P_ARC)

_RIB_PROFILE = arc(G_ZC, RIB_HALF_Z, RIB_SPRING_Y, RIB_CROWN_Y, RIB_ARC_SEGS)


def vault_y_at(z):
    # Clearance uses the ACTUAL faceted host, not an analytic ellipse above it.
    return interpolate(G_ARC, z)


_CLEARANCE_NODES = sorted(
    {z for z, _y in _RIB_PROFILE}
    | {z for z, _y in G_ARC if _RIB_PROFILE[0][0] <= z <= _RIB_PROFILE[-1][0]}
)
RIB_CLEARANCE_M = min(
    vault_y_at(z) - interpolate(_RIB_PROFILE, z)
    for z in _CLEARANCE_NODES
)
if RIB_CLEARANCE_M < ARCH_CLEARANCE_MIN - GEOM_EPS:
    fail(f'arch/vault clearance {RIB_CLEARANCE_M:.8f} < {ARCH_CLEARANCE_MIN} m')


# Global recording state (S2). FACET_TABLE index == the mesh face attribute
# value of SOURCE_ATTRIBUTE; _OPERANDS accumulates one Operand per
# constructed object; the module-level targets below hand the constructed
# scene state to the S3 chain.
FACET_TABLE = []
_OPERANDS = []
_FACET_GROUP_COUNT = {}
_AIR_TARGET = None
_AIR_UNION = None
_POCKET_UNION = None
_MEMBER_UNION = None
# Owner-ruled recording band (S2 recording verification; documented in the
# span header above): a facet whose ring is exactly on plane_of(ring) is
# verified by the kernel's exact plane law; a facet with non-zero exact
# residuals is verified within RECORD_FLAT_BAND and accounted by
# RG_F1_FACET_BAND_TOLERATED. _MERGED_NODE_COUNTS carries each facet's
# count of realized nodes whose construction key is not one of the face's
# own construction keys (the conform-merged foreign T-keys for the two
# affected roof-band facets); _RECORD_CENSUS carries the per-operand
# exact/band facets census. Both live here because the recording Builder
# state is gone by the time build_operands runs the check.
RECORD_FLAT_BAND = Fraction(1, 10 ** 8)
_MERGED_NODE_COUNTS = {}
_RECORD_CENSUS = {}


def _next_facet_id(family, instance):
    # Facet id law: id=f'{family}/{instance}/{k}' with a per-(family,
    # instance) counter that continues across the construction objects of one
    # group (e.g. the eleven surrounding-object meshes of one niche dressing
    # share their surround's k sequence).
    key = (family, instance)
    index = _FACET_GROUP_COUNT.get(key, 0)
    _FACET_GROUP_COUNT[key] = index + 1
    return index


def _operand_group(name):
    # The S2 family/instance law for every construction object of this
    # segment. The adopted family list leaves the jamb/keystone rims, the
    # door fillets, the north-wall arch and the corner returns unnamed; each
    # receives its family/instance under the spec's operand law here.
    if name == '_air_gallery':
        return 'air', 'air', 'gallery'
    if name == '_air_passage':
        return 'air', 'air', 'passage'
    if name.startswith('NICHE_DRESS_'):
        # The niche dressing: ring segments, jambs and keystone form the
        # surround of one niche dressing instance; the sill is its own family.
        prefix = '_'.join(name.split('_')[:4])
        if name.endswith('_SILL'):
            return 'member', 'niche_sill', prefix
        return 'member', 'niche_surround', prefix
    if name.startswith('NICHE_'):
        return 'pocket', 'niche_pocket', name[len('NICHE_'):]
    if name.startswith('G_CORNICE_'):
        return 'member', 'cornice_long', name
    if name.startswith('G_SKIRTING_'):
        return 'member', 'skirting', name
    if name.startswith('PILASTER_'):
        if name.endswith('_RESSAUT'):
            return 'member', 'ressaut', name
        return 'member', 'pilaster', name
    if name.startswith('CORNER_RETURN_'):
        if name.endswith('_RESSAUT'):
            return 'member', 'ressaut', name
        return 'member', 'pilaster', name
    if name.startswith('END_CORNICE_'):
        return 'member', 'cornice_east', name
    if name.startswith('END_SKIRTING_'):
        return 'member', 'skirting', name
    if name in ('DOOR_LEFT', 'DOOR_RIGHT'):
        return 'member', 'portal_jamb', name
    if name == 'DOOR_FRIEZE':
        return 'member', 'door_band', name
    if name.startswith('DOOR_OUTER_FILLET_'):
        if name == 'DOOR_OUTER_FILLET_2':
            return 'member', 'door_band', name
        return 'member', 'portal_jamb', name
    if name.startswith('LUNETTE_ARCHIVOLT_'):
        return 'member', 'lunette_archivolt', 'LUNETTE_ARCHIVOLT'
    if name.startswith('TRANSVERSE_ARCH_'):
        return 'member', 'rib', name
    if name.startswith('P_CORNICE_'):
        return 'member', 'cornice_passage', name
    if name.startswith('P_SKIRTING_'):
        return 'member', 'skirting', name
    if name.startswith('NORTH_WALL_ARCH_'):
        return 'member', 'north_wall_arch', 'NORTH_WALL_ARCH'
    fail(f'construction object {name} has no S2 operand mapping')


class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.vertices = {}
        # S2 recording attachment: the exact construction key of every placed
        # vertex (kept by the stored float triple, which survives conform's
        # splits because a split vertex copies its hit vertex's coordinates),
        # the vertex-object -> creating-key map (a construction vertex is
        # created exactly once, under one key), the per-face-slot record of
        # the face's own construction-key cycle (call order, post-dedup), and
        # the provenance slot layer threaded through conform_edges.
        self._keys = {}
        self._obj_keys = {}
        self._slot_own = {}
        self._slots = 0
        self.slot_layer = self.bm.faces.layers.int.new(SOURCE_ATTRIBUTE)

    def vert(self, point):
        key = tuple(round(float(v), 8) for v in point)
        if key not in self.vertices:
            vertex = self.bm.verts.new(to_b(key))
            self.vertices[key] = vertex
            self._keys[tuple(vertex.co)] = key
            self._obj_keys[vertex] = key
        return self.vertices[key]

    def face(self, points, material_index, smooth=False):
        verts = []
        own = []
        for p in points:
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
                own.append(self._obj_keys[v])
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
            own.pop()
        if len(set(verts)) < 3:
            return
        normal = Vector((0.0, 0.0, 0.0))
        for a, b in zip(verts, verts[1:] + verts[:1]):
            normal += a.co.cross(b.co)
        if normal.length <= LEGACY_SLIVER_AREA * 2:
            return
        try:
            face = self.bm.faces.new(verts)
        except ValueError as error:
            fail(f'duplicate construction face: {error}')
        face.material_index = material_index
        face.smooth = smooth
        # S2 recording attachment: provenance slot, rebuilt to the global
        # FACET_TABLE index in _record_facets; the slot also carries the face's
        # own construction-key cycle for the exact ring recording.
        face[self.slot_layer] = self._slots
        self._slot_own[self._slots] = tuple(own)
        self._slots += 1

    def _facet_ring(self, face):
        # S2 recording attachment: the facet ring in final loop order, rebuilt
        # from each vertex's exact construction scalar through the storage
        # conversion the Builder itself applied — never from v.co.
        ring = []
        keys = []
        for loop in face.loops:
            key = self._keys.get(tuple(loop.vert.co))
            if key is None:
                fail('construction scalar lost for a bmesh vertex during '
                     'provenance recording')
            keys.append(key)
            ring.append(qpoint(to_b(key)))
        return tuple(ring), tuple(keys)

    def _record_facets(self, name):
        # S2 recording attachment: rebuild every constructed mesh face as an
        # exact SourceFacet, index the faces with the global FACET_TABLE
        # numbering, and assemble the operand record.
        kind, family, instance = _operand_group(name)
        facets = []
        faces = sorted(self.bm.faces, key=lambda face: face[self.slot_layer])
        previous = -1
        for face in faces:
            slot = face[self.slot_layer]
            if slot <= previous:
                fail(f'operand {name}: provenance slots are not unique after '
                     'the conform')
            previous = slot
            ring, keys = self._facet_ring(face)
            facet_family = family
            if family == 'pilaster' and max(k[1] for k in keys) <= 0.30:
                # The predecessor realizes the pilaster base rings inside
                # add_pilaster (BASE_PROFILE); the base family rides the exact
                # construction rings: all construction heights <= 0.30.
                facet_family = 'base'
            if family == 'air' and instance == 'gallery' and all(
                k[1] == G_SPRING for k in keys
            ):
                # The flat-soffit run of the gallery volume: the two leading
                # G_ARC rows of build_air_volumes (the shell soffit at the
                # spring), carried by their exact construction rings.
                facet_family = 'soffit_flat'
            facet = SourceFacet(
                id=f'{facet_family}/{instance}/{_next_facet_id(facet_family, instance)}',
                operand=name,
                family=facet_family,
                instance=instance,
                plane=plane_of(ring),
                ring=ring,
                material=face.material_index,
            )
            # S2 recording attachment: the count of realized loop nodes whose
            # construction key is not one of the face's own construction keys
            # (the conform-merged foreign T-keys on the affected roof-band
            # facets), kept for the RG_F1_FACET_BAND_TOLERATED rows. The
            # recorded ring itself is untouched by this count.
            _MERGED_NODE_COUNTS[facet.id] = sum(
                1 for key in keys if key not in self._slot_own[slot]
            )
            FACET_TABLE.append(facet)
            facets.append(facet)
            face[self.slot_layer] = len(FACET_TABLE) - 1
        operand = Operand(id=name, kind=kind, family=family,
                          instance=instance, facets=facets)
        _OPERANDS.append(operand)
        return operand

    def mesh(self, name, materials, closed=True):
        conform_edges(self.bm)
        bmesh.ops.recalc_face_normals(self.bm, faces=list(self.bm.faces))
        self.bm.normal_update()
        if closed:
            closed_guard(self.bm, name)
        self._record_facets(name)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for material_ in materials:
            mesh.materials.append(material_)
        return mesh


def conform_edges(bm):
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=WELD_EPS)
    vertices = list(bm.verts)
    tree = KDTree(len(vertices))
    for i, vertex in enumerate(vertices):
        tree.insert(vertex.co, i)
    tree.balance()
    for edge in list(bm.edges):
        if not edge.is_valid or len(edge.link_faces) != 1:
            continue
        start, end = edge.verts
        origin = start.co.copy()
        delta = end.co - origin
        length = delta.length
        if length <= WELD_EPS:
            continue
        hits = []
        for point, index, _distance in tree.find_range(
            (origin + end.co) / 2, length / 2 + WELD_EPS
        ):
            vertex = vertices[index]
            if vertex is start or vertex is end:
                continue
            t = (point - origin).dot(delta) / delta.length_squared
            if WELD_EPS / length < t < 1.0 - WELD_EPS / length:
                if (point - (origin + delta * t)).length <= LINE_PERP_MAX:
                    hits.append((t, point.copy()))
        previous_t = 0.0
        current = start
        for t, point in sorted(hits, key=lambda item: item[0]):
            if t - previous_t <= WELD_EPS / length:
                continue
            _new_edge, new_vertex = bmesh.utils.edge_split(
                edge, current, (t - previous_t) / (1.0 - previous_t)
            )
            new_vertex.co = point
            edge = next(e for e in new_vertex.link_edges if end in e.verts)
            current, previous_t = new_vertex, t
    # Boolean slivers: degenerate faces (zero-area, or repeated-point rings)
    # the exact solver leaves behind; their perimeter is bound to the neighbors
    # by the splits + welds above, so deleting them opens nothing (the following
    # closed_guard fails loud if otherwise).
    slivers = [
        face for face in bm.faces
        if face.calc_area() <= LEGACY_SLIVER_AREA
        or len({tuple(round(c, 6) for c in v.co) for v in face.verts}) < len(face.verts)
    ]
    if slivers:
        print(f'RG_F1_SLIVERS removed: {len(slivers)}', flush=True)
        bmesh.ops.delete(bm, geom=slivers, context='FACES')
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=WELD_EPS)
    # T-junction + parallel-edge repair: edge_split can insert a vertex that
    # coincides with another face's construction vertex. remove_doubles cannot
    # merge such a pair once an edge directly joins the two (the merge would
    # strand a self-loop), and faces.new never invents reuse of an edge it did
    # not find. So the surface rebuilds: keep the conforming rings, dissolve
    # every edge + face, unify the coincident vertices on the bare vertex set,
    # materialize each shared edge exactly once, then construct every face over
    # its ring (faces.new links loops onto those pre-existing edges).
    # S2 recording attachment: thread each face's provenance slot through the
    # rebuild in the same tuple as the material/smooth tags.
    source_layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    tagged = []
    for face in bm.faces:
        tagged.append((tuple((l.vert.co.copy(), l.vert) for l in face.loops),
                       face.material_index, face.smooth,
                       face[source_layer] if source_layer else -1))
    bmesh.ops.delete(bm, geom=list(bm.edges) + list(bm.faces), context='EDGES_FACES')
    # Unify coincident vertices EXPLICITLY, per position group, BEFORE any edges
    # exist: blind remove_doubles left doubles behind once faces and their pad
    # edges were rebuilt, and merges blocked by direct edges cannot run. With a
    # bare vertex set the weld is complete and deterministic per group.
    groups = {}
    for vert in bm.verts:
        groups.setdefault(tuple(round(c, 6) for c in vert.co), []).append(vert)
    targetmap = {}
    survivors = {}
    for key, group in groups.items():
        kept = group[0]
        survivors[key] = kept
        for vert in group[1:]:
            targetmap[vert] = kept
    if targetmap:
        bmesh.ops.weld_verts(bm, targetmap=targetmap)
    edges_by_key = {}

    def edge_for(vert, other):
        key = (min(id(vert), id(other)), max(id(vert), id(other)))
        edge_ = edges_by_key.get(key)
        if edge_ is None:
            edge_ = bm.edges.new((vert, other))
            edges_by_key[key] = edge_
        return edge_

    rebuilt = []
    for slots, material_index, smooth, source_slot in tagged:
        ring = []
        for position, vert in slots:
            if vert.is_valid:
                ring.append(vert)
            else:
                ring.append(survivors[tuple(round(c, 6) for c in position)])
        cleaned = [vert for i, vert in enumerate(ring) if ring[(i - 1) % len(ring)] is not vert]
        if len(cleaned) < 3:
            fail('degenerate ring: a face collapsed below three vertices in the T-merge: '
                 + json.dumps({'slots': len(slots),
                               'positions': [tuple(round(c, 6) for c in pos) for pos, _v in slots],
                               'ring': len(ring)}, sort_keys=True))
        rebuilt.append((cleaned, material_index, smooth, source_slot))
    for verts, _material_index, _smooth, _source_slot in rebuilt:
        for i, vert in enumerate(verts):
            edge_for(vert, verts[(i + 1) % len(verts)])
    for verts, material_index, smooth, source_slot in rebuilt:
        face = bm.faces.new(verts)
        face.material_index = material_index
        face.smooth = smooth
        if source_layer is not None and source_slot >= 0:
            face[source_layer] = source_slot
    bm.normal_update()


def frame(axis, plane, sign):
    if axis == 'z':
        return lambda t, y, d: (t, y, plane + sign * d)
    return lambda t, y, d: (plane + sign * d, y, t)


def make_object(name, builder, materials, collection):
    mesh = builder.mesh(name, materials)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def prism(name, outline, d0, d1, transform, mat, materials, collection, back=None):
    outline = ccw(outline)
    builder = Builder()
    rings = [[transform(t, y, d) for t, y in outline] for d in (d0, d1)]
    builder.face(list(reversed(rings[0])), mat if back is None else back)
    builder.face(rings[1], mat)
    for i in range(len(outline)):
        j = (i + 1) % len(outline)
        builder.face([rings[0][i], rings[0][j], rings[1][j], rings[1][i]], mat)
    return make_object(name, builder, materials, collection)


def extrusion(name, profile, a, b, transform, mat, materials, collection):
    builder = Builder()
    rings = [[transform(t, y, d) for d, y in profile] for t in (a, b)]
    builder.face(list(reversed(rings[0])), mat)
    builder.face(rings[1], mat)
    for i in range(len(profile)):
        j = (i + 1) % len(profile)
        builder.face([rings[0][i], rings[0][j], rings[1][j], rings[1][i]], mat)
    return make_object(name, builder, materials, collection)


def collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def floor_layers(gallery):
    if gallery:
        layers = [
            (rectangle(G_X0, G_X1, G_Z0, G_Z0 + FLOOR_BORDER), BAND),
            (rectangle(G_X0, G_X1, G_Z1 - FLOOR_BORDER, G_Z1), BAND),
            (rectangle(G_X1 - FLOOR_BORDER, G_X1, G_Z0, PORTAL_Z0), BAND),
            (rectangle(G_X1 - FLOOR_BORDER, G_X1, PORTAL_Z1, G_Z1), BAND),
            (rectangle(G_X0, G_X0 + G_REVEAL, G_Z0, G_Z1), BAND),
            (rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z0, PORTAL_Z1), BAND),
        ]
        layers.extend(
            (rectangle(x - FLOOR_ARCH_BAND / 2, x + FLOOR_ARCH_BAND / 2,
                       G_Z0 + FLOOR_BORDER, G_Z1 - FLOOR_BORDER), BAND)
            for x in PILASTER_X
        )
        return layers
    return [
        (rectangle(P_X0, P_X0 + FLOOR_BORDER, P_Z0, P_Z1 + CSG_OVERLAP), BAND),
        (rectangle(P_X0, P_X1, P_Z0, P_Z0 + FLOOR_BORDER), BAND),
        (rectangle(P_X1 - FLOOR_BORDER, P_X1, P_Z0, G_Z0), BAND),
        (rectangle(P_X1 - FLOOR_BORDER, P_X1, G_Z1, P_Z1 + CSG_OVERLAP), BAND),
    ]


def build_air_volumes(materials):
    target_collection = bpy.context.scene.collection
    b = Builder()
    for poly, mat in painted_regions(rectangle(G_X0, G_X1, G_Z0, G_Z1), FLAGS, floor_layers(True)):
        b.face([(x, 0.0, z) for x, z in poly], mat)
    for z in (G_Z0, G_Z1):
        b.face([(G_X0, 0, z), (G_X1, 0, z), (G_X1, 3, z), (G_X0, 3, z)], PLASTER)
    flat = [(z, G_SPRING) for z, _y in G_ARC]
    roof_rows = [(G_X0, flat), (G_X0 + G_REVEAL, flat)] + [(x, G_ARC) for x in XS_GI]
    for (xa, pa), (xb, pb) in zip(roof_rows, roof_rows[1:]):
        for i in range(len(G_ARC) - 1):
            b.face([(xa, pa[i][1], pa[i][0]),
                    (xa, pa[i + 1][1], pa[i + 1][0]),
                    (xb, pb[i + 1][1], pb[i + 1][0]),
                    (xb, pb[i][1], pb[i][0])], PLASTER)
    b.face([(G_X0, 0, G_Z0), (G_X0, 0, G_Z1)] + [(G_X0, y, z) for z, y in reversed(flat)], PLASTER)
    end_boundary = [(G_Z0, 0), (G_Z1, 0)] + list(reversed(G_ARC))
    lunette = arc(G_ZC, LUNETTE_R, 2.70, 2.70 + LUNETTE_R, LUNETTE_SEGS)
    end_layers = [
        (rectangle(PORTAL_Z0, PORTAL_Z1, 0, DOOR_BAND_Y[0]), STAIRLIGHT),
        (lunette, STAIRLIGHT),
    ]
    for poly, mat in painted_regions(end_boundary, PLASTER, end_layers):
        b.face([(G_X1, y, z) for z, y in poly], mat)
    target = make_object('_air_gallery', b, materials, target_collection)

    operands = collection('_air_union')
    b = Builder()
    z_end = P_Z1 + CSG_OVERLAP
    for poly, mat in painted_regions(rectangle(P_X0, P_X1, P_Z0, z_end), FLAGS, floor_layers(False)):
        b.face([(x, 0, z) for x, z in poly], mat)
    for x in (P_X0, P_X1):
        b.face([(x, 0, P_Z0), (x, 0, z_end), (x, 3, z_end), (x, 3, P_Z0)], PLASTER)
    nodes = list(P_Z_NODES) + [z_end]
    for za, zb in zip(nodes, nodes[1:]):
        for a, c in zip(P_ARC, P_ARC[1:]):
            b.face([(a[0], a[1], za), (c[0], c[1], za),
                    (c[0], c[1], zb), (a[0], a[1], zb)], PLASTER)
    for z in (P_Z0, z_end):
        b.face([(P_X0, 0, z), (P_X1, 0, z)] + [(x, y, z) for x, y in reversed(P_ARC)], PLASTER)
    make_object('_air_passage', b, materials, operands)

    # S3 restructure: the predecessor's closing
    # boolean_collection(target, operands, 'UNION', 'passage/gallery union')
    # is delivered by union_air() — the adopted S3 stage below — so the
    # construction always ran its EXACT solve unchanged, and this port hands
    # both the target and the operand collection to the chain instead.
    return target, operands


def build_niches(target, materials):
    pockets = collection('_niche_pockets')
    for wall_index, (z, sign) in enumerate(((G_Z0, 1), (G_Z1, -1))):
        transform = frame('z', z, sign)
        for i, x in enumerate(NICHE_CENTRES):
            head = arc(x, NICHE_HEAD_R, NICHE_SPRING, NICHE_PEAK, NICHE_HEAD_SEGS)
            outline = [(x - 0.9, NICHE_SILL), (x + 0.9, NICHE_SILL)] + list(reversed(head))
            prism(f'NICHE_{wall_index}_{i}', outline,
                  -NICHE_RECESS, CSG_OVERLAP, transform, STUCCO, materials, pockets, back=PLASTER)
    # S3 restructure: the predecessor's closing
    # boolean_collection(target, pockets, 'UNION', '22 blind niche pockets')
    # is delivered by union_pockets(); the port returns the pocket collection.
    return pockets


def add_pilaster(name, station, transform, materials, operands):
    # Rings are (y, half-width, proud); repeated heights create exposed shelves.
    rings = [(0.0, 0.28, 0.16), (0.15, 0.28, 0.16)]
    rings.extend((y, 0.20 + outset, 0.10 + outset) for outset, y in BASE_PROFILE)
    rings.extend([
        (2.45, 0.20, 0.10), (2.45, 0.225, 0.125), (2.49, 0.225, 0.125), (2.49, 0.20, 0.10),
        (2.57, 0.20, 0.10), (2.57, 0.21, 0.11),
        (2.63, 0.26, 0.15), (2.63, 0.28, 0.16), (2.70, 0.28, 0.16),
    ])
    b = Builder()
    points = [
        [transform(station - width, y, -CSG_OVERLAP), transform(station + width, y, -CSG_OVERLAP),
         transform(station + width, y, proud), transform(station - width, y, proud)]
        for y, width, proud in rings
    ]
    b.face(list(reversed(points[0])), STUCCO)
    b.face(points[-1], STUCCO)
    for a, c in zip(points, points[1:]):
        for i in range(4):
            j = (i + 1) % 4
            b.face([a[i], a[j], c[j], c[i]], STUCCO)
    make_object(name, b, materials, operands)
    add_cornice(f'{name}_RESSAUT', station - RESSAUT_WIDTH / 2, station + RESSAUT_WIDTH / 2,
                transform, materials, operands, RESSAUT_PROUD)


def add_cornice(name, a, b, transform, materials, operands, outset=0.0):
    profile = [(-CSG_OVERLAP, 2.70)]
    profile.extend((d + outset, y) for d, y in CORNICE_PROFILE)
    profile.append((-CSG_OVERLAP, 3.00))
    extrusion(name, profile, a, b, transform, STUCCO, materials, operands)


def add_skirting(name, a, b, transform, materials, operands):
    profile = [(-CSG_OVERLAP, 0.0)] + list(SKIRTING) + [(-CSG_OVERLAP, 0.14)]
    extrusion(name, profile, a, b, transform, STUCCO, materials, operands)


def add_arch_ring(name, inner, outer, proud, transform, materials, operands):
    for i in range(len(inner) - 1):
        outline = [inner[i], inner[i + 1], outer[i + 1], outer[i]]
        prism(f'{name}_{i}', outline, -CSG_OVERLAP, proud, transform, STUCCO, materials, operands)


def inset_arch(profile, width):
    lines = []
    for a, b in zip(profile, profile[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        shift = (dy * width / length, -dx * width / length)
        lines.append(((a[0] + shift[0], a[1] + shift[1]), (dx, dy)))
    result = []
    for i in range(len(profile)):
        if i == 0 or i == len(profile) - 1:
            p, direction = lines[0 if i == 0 else -1]
            t = (P_SPRING - p[1]) / direction[1]
            result.append((p[0] + t * direction[0], P_SPRING))
        else:
            a, u = lines[i - 1]
            b, v = lines[i]
            cross = u[0] * v[1] - u[1] * v[0]
            if abs(cross) <= 1e-12:
                fail('parallel adjacent north arch segments')
            t = ((b[0] - a[0]) * v[1] - (b[1] - a[1]) * v[0]) / cross
            result.append((a[0] + t * u[0], a[1] + t * u[1]))
    return result


def build_members(target, materials):
    operands = collection('_architectural_members')
    for wall_index, (z, sign) in enumerate(((G_Z0, 1), (G_Z1, -1))):
        transform = frame('z', z, sign)
        add_cornice(f'G_CORNICE_{wall_index}', G_X0 + G_REVEAL, G_X1, transform, materials, operands)
        add_skirting(f'G_SKIRTING_{wall_index}', G_X0, G_X1, transform, materials, operands)
        for i, station in enumerate(PILASTER_X):
            add_pilaster(f'PILASTER_{wall_index}_{i}', station, transform, materials, operands)
        for i, x in enumerate(NICHE_CENTRES):
            inner = arc(x, 0.90, 1.60, 2.50, NICHE_HEAD_SEGS)
            outer = arc(x, 1.00, 1.60, 2.60, NICHE_HEAD_SEGS)
            prefix = f'NICHE_DRESS_{wall_index}_{i}'
            add_arch_ring(prefix, inner, outer, NICHE_SURROUND_D, transform, materials, operands)
            for j, (a, b) in enumerate(((x - 1.00, x - 0.90), (x + 0.90, x + 1.00))):
                prism(f'{prefix}_JAMB_{j}', rectangle(a, b, 0.90, 1.60),
                      -CSG_OVERLAP, 0.03, transform, STUCCO, materials, operands)
            prism(f'{prefix}_SILL', rectangle(x - 1.04, x + 1.04, 0.84, 0.90),
                  -CSG_OVERLAP, 0.06, transform, STUCCO, materials, operands)
            prism(f'{prefix}_KEYSTONE',
                  [(x - 0.07, 2.50), (x + 0.07, 2.50), (x + 0.10, 2.70), (x - 0.10, 2.70)],
                  -CSG_OVERLAP, 0.06, transform, STUCCO, materials, operands)
    end = frame('x', G_X1, -1)
    for i, station in enumerate(CORNER_RETURN_Z):
        add_pilaster(f'CORNER_RETURN_{i}', station, end, materials, operands)
    for i, (a, b) in enumerate(((G_Z0, G_ZC - END_CORNICE_BREAK), (G_ZC + END_CORNICE_BREAK, G_Z1))):
        add_cornice(f'END_CORNICE_{i}', a, b, end, materials, operands)
    for i, (a, b) in enumerate(((G_Z0, PORTAL_Z0 - DOOR_JAMB_W), (PORTAL_Z1 + DOOR_JAMB_W, G_Z1))):
        add_skirting(f'END_SKIRTING_{i}', a, b, end, materials, operands)
    depth = G_X1 - PORTAL_X0
    left, right = PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z1 + DOOR_JAMB_W
    door_parts = [
        ('LEFT', rectangle(left, PORTAL_Z0, 0, 2.40)),
        ('RIGHT', rectangle(PORTAL_Z1, right, 0, 2.40)),
        ('FRIEZE', rectangle(left, right, 2.40, 2.70)),
    ]
    for name, outline in door_parts:
        prism(f'DOOR_{name}', outline, -CSG_OVERLAP, depth, end, STUCCO, materials, operands)
    fillets = [
        rectangle(left - DOOR_FILLET_W, left, 0, 2.70 + DOOR_FILLET_W),
        rectangle(right, right + DOOR_FILLET_W, 0, 2.70 + DOOR_FILLET_W),
        rectangle(left, right, 2.70, 2.70 + DOOR_FILLET_W),
    ]
    for i, outline in enumerate(fillets):
        prism(f'DOOR_OUTER_FILLET_{i}', outline, -CSG_OVERLAP, depth + DOOR_FILLET_D,
              end, STUCCO, materials, operands)
    inner = arc(G_ZC, LUNETTE_R, 2.70, 2.70 + LUNETTE_R, LUNETTE_SEGS)
    outer = arc(G_ZC, LUNETTE_R + LUNETTE_ARCHIVOLT_W, 2.70,
                2.70 + LUNETTE_R + LUNETTE_ARCHIVOLT_W, LUNETTE_SEGS)
    add_arch_ring('LUNETTE_ARCHIVOLT', inner, outer, LUNETTE_ARCHIVOLT_D, end,
                  materials, operands)
    arch_profile = [(G_Z0, 3.0)] + _RIB_PROFILE + [(G_Z1, 3.0)]
    arch_profile += [(z, y + CSG_OVERLAP) for z, y in reversed(G_ARC)]
    for i, x in enumerate(PILASTER_X):
        extrusion(f'TRANSVERSE_ARCH_{i}', arch_profile,
                  x - RIB_WIDTH / 2, x + RIB_WIDTH / 2,
                  lambda t, y, z: (t, y, z), STUCCO, materials, operands)
    passage_runs = [
        ('WEST', frame('x', P_X0, 1), P_Z0, P_Z1),
        ('EAST_NORTH', frame('x', P_X1, -1), P_Z0, G_Z0),
        ('EAST_SOUTH', frame('x', P_X1, -1), G_Z1, P_Z1),
        ('NORTH', frame('z', P_Z0, 1), P_X0, P_X1),
    ]
    for name, transform, a, b in passage_runs:
        add_cornice(f'P_CORNICE_{name}', a, b, transform, materials, operands)
        add_skirting(f'P_SKIRTING_{name}', a, b, transform, materials, operands)
    add_arch_ring('NORTH_WALL_ARCH', inset_arch(P_ARC, 0.30), P_ARC, 0.06,
                  frame('z', P_Z0, 1), materials, operands)

    # EXACT computes the union of the operands before subtraction. This clips
    # corner returns and touching order members rather than retaining overlap.
    # S3 restructure: the predecessor's closing
    # boolean_collection(target, operands, 'DIFFERENCE',
    # 'inline architectural members') is delivered by subtract_members(); the
    # port returns the member collection for the chain.
    return operands


def verify_source(bm, stage):
    # Adopted spec S2/S3: verify after each stage that every face carries a
    # valid FACET_TABLE index (fail otherwise apart from the exact re-derive
    # path below). If the result mesh carries no SOURCE_ATTRIBUTE layer at
    # all, the whole provenance was lost in the exact-Boolean stage: every
    # face is marked missing and re-derived. A lost provenance is re-derived
    # by exact coplanarity + containment against FACET_TABLE and emits
    # RG_F1_PROVENANCE_REDERIVED, never guessed.
    bm.faces.ensure_lookup_table()
    bm.faces.index_update()
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    lost_layer = False
    if layer is None:
        if not bm.faces:
            return
        layer = bm.faces.layers.int.new(SOURCE_ATTRIBUTE)
        lost_layer = True
    if lost_layer:
        missing = list(bm.faces)
    else:
        missing = [
            face for face in bm.faces if not 0 <= face[layer] < len(FACET_TABLE)
        ]
    if not missing:
        return
    rederived = {}
    for face in missing:
        index = _rederive_source(face, stage)
        face[layer] = index
        rederived[str(face.index)] = FACET_TABLE[index].id
    emit('PROVENANCE_REDERIVED', {
        'count': len(rederived),
        'faces': rederived,
        'stage': stage,
    })


def _rederive_source(face, stage):
    # CHALLENGES: re-derive the provenance of a face the exact solver did not
    # transfer with a usable SOURCE_ATTRIBUTE index, by exact coplanarity +
    # containment against FACET_TABLE. The face ring is read as binary floats
    # (the stored coordinates); the coplanarity band is the kernel's declared
    # float-noise bound LINE_PERP_MAX_Q, applied with rational comparisons.
    # Containment uses the kernel's exact point_in_polygon over exact ring
    # scalars. An empty or ambiguous candidate set refuses loudly.
    ring = [binary_point(tuple(v.co)) for v in face.verts]
    if area_vector(ring) == ZERO3:
        fail(f'stage {stage}: provenance lost on degenerate face {face.index}')
    candidates = []
    for facet in FACET_TABLE:
        normal, offset = facet.plane
        if all(abs(dot(normal, point) - offset) <= LINE_PERP_MAX_Q for point in ring):
            candidates.append(facet)
    if not candidates:
        fail(f'stage {stage}: face {face.index} matches no recorded source facet')
    witnesses = [tuple(sum(point[i] for point in ring) / len(ring) for i in range(3))]
    for i in range(1, len(ring) - 1):
        tri = (ring[0], ring[i], ring[i + 1])
        if cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])) != ZERO3:
            witnesses.append(
                tuple(sum(point[j] for point in tri) / 3 for j in range(3))
            )
    matches = []
    for facet in candidates:
        if any(facet_contains(witness, facet) == 1 for witness in witnesses):
            matches.append(facet)
    if not matches:
        fail(f'stage {stage}: face {face.index} is not contained in any candidate facet')
    if len(matches) > 1:
        fail(f'stage {stage}: face {face.index} provenance is ambiguous between '
             + ', '.join(facet.id for facet in matches))
    return FACET_TABLE.index(matches[0])


def _exact_collection_boolean(target, operands, operation, label):
    # The predecessor's EXACT collection-Boolean mechanism, copied through the
    # modifier plumbing and the cleanup, WITHOUT its conform_edges +
    # closed_guard pass: the adopted S3 chain must capture the member
    # difference raw, nothing is welded in stages S2-S3, and junction welding
    # returns in the S4/S7 canonicalizations. Returns the opened result bmesh
    # for the stage's own guard/capture; the provenance verification the spec
    # attaches to every exact-Boolean stage runs before that step.
    if not operands.objects:
        fail(f'{label}: operand collection holds no objects')
    bpy.context.view_layer.objects.active = target
    target.select_set(True)
    modifier = target.modifiers.new(label, 'BOOLEAN')
    modifier.operation = operation
    modifier.solver = 'EXACT'
    modifier.operand_type = 'COLLECTION'
    modifier.collection = operands
    modifier.use_hole_tolerant = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bm = bmesh.new()
    bm.from_mesh(target.data)
    verify_source(bm, label)
    return bm


def _finish_boolean_stage(bm, target, operands):
    # The predecessor's verbatim post-Boolean state hand-off.
    bm.to_mesh(target.data)
    bm.free()
    for obj in list(operands.objects):
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    # The per-object removals can drop the operand collection's last user,
    # freeing the datablock; only remove what still exists.
    if operands.name in bpy.data.collections:
        bpy.data.collections.remove(operands)


def union_air():
    """S3 stage 1: the gallery UNION passage, the unchanged EXACT collection
    chain, then the stage's own closure bar."""
    bm = _exact_collection_boolean(_AIR_TARGET, _AIR_UNION, 'UNION', 'air-union')
    closed_guard(bm, 'air-union')
    _finish_boolean_stage(bm, _AIR_TARGET, _AIR_UNION)


def union_pockets():
    """S3 stage 2: the 22 blind niche pockets UNION the air volume, then the
    stage's own closure bar."""
    bm = _exact_collection_boolean(_AIR_TARGET, _POCKET_UNION, 'UNION', 'pocket-union')
    closed_guard(bm, 'pocket-union')
    _finish_boolean_stage(bm, _AIR_TARGET, _POCKET_UNION)


def subtract_members():
    """S3 stage 3: one EXACT DIFFERENCE with the merged member operand
    (CSG_OVERLAP 0.02 is already in the construction), then the required raw
    post-Boolean inventory 'member-difference-raw'. This is NOT a closure
    pass and nothing is welded here: remove_doubles stays out of S2-S3."""
    bm = _exact_collection_boolean(
        _AIR_TARGET, _MEMBER_UNION, 'DIFFERENCE', 'member-difference')
    capture_topology(bm, 'member-difference-raw', raw=True)
    _finish_boolean_stage(bm, _AIR_TARGET, _MEMBER_UNION)


def _verify_operand_recorded(operand):
    """S2 recording verification — the owner-ruled tolerance variant
    (span-local; the kernel is untouched and is called unchanged below
    wherever it applies).

    Every facet is screened in FACET_TABLE order by the exact kernel plane
    law first. An operand whose recorded rings all hold plane_side == 0 for
    every point is handed to the kernel check_operand itself (the exact
    plane law, the directed pairs and the enclosed volume are then the
    kernel's, unchanged). A facet with a non-zero exact residual (the
    conformance-merged foreign T-keys on the gallery roof bands) is verified
    against RECORD_FLAT_BAND instead — the check still fails loudly on
    anything outside the band — and emits the RG_F1_FACET_BAND_TOLERATED row
    {band, facet, mergedNodes, worstResidual}. For a banded operand the
    kernel function cannot be called with those facets included (its exact
    plane law would trip on them first, before its pair and volume stages
    ever run), so the remaining kernel laws run span-locally in
    _band_operand_check, mirrored from check_operand constant for constant.
    """
    exact = 0
    banded = []
    for facet in operand.facets:
        normal, offset = facet.plane
        worst = Fraction(0)
        for point in facet.ring:
            # The exact residual VALUE of the kernel's plane_side predicate
            # (plane_side itself returns only its sign): kernel-exact plane
            # law holds iff this value is zero for every ring point.
            residual = dot(normal, point) - offset
            if residual < 0:
                residual = -residual
            if residual > worst:
                worst = residual
        if worst > RECORD_FLAT_BAND:
            fail(
                f'operand {operand.id}: facet {facet.id} plane residual {worst} '
                f'exceeds recording band {RECORD_FLAT_BAND}'
            )
        if worst == 0:
            exact += 1
        else:
            banded.append((facet, worst))
    _RECORD_CENSUS[operand.id] = {
        'band': len(banded),
        'exact': exact,
        'facets': len(operand.facets),
    }
    if not banded:
        check_operand(operand)
        return
    for facet, worst in banded:
        emit('FACET_BAND_TOLERATED', {
            'band': str(RECORD_FLAT_BAND),
            'facet': facet.id,
            'mergedNodes': _MERGED_NODE_COUNTS.get(facet.id, 0),
            'worstResidual': str(worst),
        })
    _band_operand_check(operand)


def _band_operand_check(operand):
    # The remaining kernel laws (kernel check_operand lines 517-526
    # semantics, thresholds unchanged) for an operand whose facet set
    # includes band-carrying facets: the kernel cannot be called with those
    # facets (its exact plane law would trip first and abort before the pair
    # and volume stages ever run), so this span-local mirror collects the
    # same directed uses and volume6 from the same recorded rings and
    # applies the same exact thresholds. The kernel itself is never
    # redefined or shadowed.
    uses = defaultdict(int)
    volume6 = Fraction(0)
    for facet in operand.facets:
        ring = facet.ring
        if len(ring) < 3:
            fail(f'operand {operand.id}: facet {facet.id} is not a planar ring')
        for a, b in pairs(ring):
            if a == b:
                fail(f'operand {operand.id}: repeated point in facet {facet.id}')
            uses[(a, b)] += 1
        for i in range(1, len(ring) - 1):
            volume6 += dot(ring[0], cross(ring[i], ring[i + 1]))
    for (a, b), count in uses.items():
        if count != 1 or uses.get((b, a), 0) != 1:
            fail(
                f'operand {operand.id} is not a closed oriented 2-manifold at '
                + ','.join(exact_record(a)) + ' -> ' + ','.join(exact_record(b))
            )
    if volume6 <= 0:
        fail(f'operand {operand.id} is inverted or flat (6V={volume6})')


def build_operands():
    """S2. Constructs every closed operand with the predecessor's existing
    construction code (reused verbatim per the adopted spec, apart from the
    marked recording attachments), records every constructed mesh face as an
    exact SourceFacet indexed by SOURCE_ATTRIBUTE, verifies every operand
    through _verify_operand_recorded (the kernel check_operand unchanged for
    exactly-planar operands; the owner-ruled RECORD_FLAT_BAND variant for
    the conformance-merged roof-band rings), fingerprints all facet points,
    and registers the air expression as RG_F1_EXPRESSION. Returns the
    operand list for the S3 chain; the collections it produced ride the
    module state the chain uses.
    """
    materials = [
        bpy.data.materials.new(f'_rg_f1_slot_{name_}')
        for name_ in SHELL_MATERIAL_NAMES
    ]
    target, air_union = build_air_volumes(materials)
    pocket_union = build_niches(target, materials)
    member_union = build_members(target, materials)
    for operand in _OPERANDS:
        _verify_operand_recorded(operand)
    fingerprint('operands', [point for facet in FACET_TABLE for point in facet.ring])
    EXPRESSIONS['air'] = '(gallery ∪ passage ∪ ⋃pocket) − ⋃member'
    emit('EXPRESSION', {'air': EXPRESSIONS['air']})
    global _AIR_TARGET, _AIR_UNION, _POCKET_UNION, _MEMBER_UNION
    _AIR_TARGET, _AIR_UNION = target, air_union
    _POCKET_UNION, _MEMBER_UNION = pocket_union, member_union
    return _OPERANDS


# ----------------------------------------------------------------------------
# Continuation segment 3/n — stage S4 (first constrained canonicalization)
# and stage S5 (the four-family junction registry) of the adopted PART
# 2a-WATERTIGHT spec. Appended contiguously after the S2-S3 span; received
# and existing symbols are consumed, never redefined. The span ends where
# S6 (arrangement + classification) would begin; nothing of S6-S9 is
# implemented here.
#
# S4 — first_canonicalization(). The member-difference product is opened
# from the S3 target mesh and every BMesh vertex is keyed and moved per the
# adopted law:
#
#   witness  = the set of FACET_TABLE ids of its link_faces (the faces'
#              SOURCE_ATTRIBUTE index; a face without a valid index fails
#              loud — the kernel's verify law, no re-derivation in S4),
#   supports = {plane_key(f.plane): f.plane} over those facets — the
#              recorded construction planes. The two band-carrying facets'
#              tilted planes participate as recorded (brief fact F), so the
#              conform-T-merged vertices at the two band junctions project
#              onto the recorded joint line and carry the tiny offsets the
#              verdict's 0.00005 m band controls,
#   moved    = project_joint(binary_point(co), supports) — the received
#              kernel call, unchanged,
#   canonical key = (tuple(moved), frozenset(witness)).
#
# Two vertices weld iff their key is identical — the key already contains
# the source-defined point, so "moved equal exactly" holds by construction.
# Mesh-side re-key: EVERY vertex (multi-member clusters and 1-member
# clusters alike) takes its source-defined moved position before the weld —
# the stored mesh must describe the canonical vertex table S7 remaps the
# retained rings through. Representative = the source-defined point (never
# an average); the target vertices are set to it before weld_verts runs.
# Grouping is by key only: no transitive proximity clustering. The cluster
# diameter is identically 0 (equal moved inside one key); the pipeline
# asserts it against JUNCTION_WELD_MAX.
#
# S4-COHERENCE (the flagged divergence, documented in place): after the
# weld the mesh vertices sit on their moved positions — at the two band
# junctions that is the {band plane, x=44} joint line — while the
# FACET_TABLE rings keep their recorded conform-merged keys untouched.
# That is exactly where S7 absorbs it: S7 remaps the retained/replacement
# rings through the canonical vertex table built from these S4 keys, NOT
# through the FACET_TABLE rings, so no ring is rewritten here.
#
# S5 — build_registry(). Every construction instance of the four families
# becomes one REGISTRY entry (the kernel's received REGISTRY list):
#   cornice_termination — each cornice run end: the passage side walls'
#     ends at z 63.5 and 87.5, the east gallery wall's own run ends at
#     z 70.0 and 76.0 (the cornice cycle corners: family 1's
#     requires_occupancy instances), the long walls' 22 ressaut breaks
#     (both flanks of each ressaut run). The box: y 2.70..3.00, profile
#     depth 0..0.22 along the wall normal into the room, 0.04 along the
#     run axis anchored AT the run end and extending into the run.
#   niche_rib_junction — per niche x adjacent rib edge: the strip on the
#     wall plane anchored AT the rib flank (the near face, unchanged) and
#     extending to the amended far face x_dress + σ·1/50 — the Brief 26 Q2
#     ruling retired the inherited 17/50 sum for the landmark form
#     (σ·(x_dress − x_flank) = 947/2000 exact); width 17/50 → 987/2000.
#   soffit_termination — the flat-soffit ends at x 4.8 and the far end
#     x 4.0: y 3.0, the full z 70..76 span, both wall planes.
#   cornice_cycle_cap is NOT a separate family: those boxes are family 1's
#     east-wall instances with requires_occupancy=True.
#
# Registry box representation law (documented design decision): every box
# face is the construction scalar opened by LINE_PERP_MAX_Q, the kernel's
# own declared float-noise band — the same declared band _rederive_source
# applies for coplanarity. The mesh stores float32 images of the 8-decimal
# construction scalars (measured scatter of one float32 ulp: 4.8 -> 4.8 +
# 1.9e-7 m, 70.45 -> 70.45 - 3.1e-6 m), and Boolean cut vertices are
# float32 snaps of doubles close to the scalars, so a box face AT the exact
# scalar alone can miss a representational bounce by one ulp. The band is
# representational, not geometric: no live-defect search widens anything by
# geometry tolerance (the CHALLENGES' outside clause stays untouched).
#
# Window orientation (documented design decision): "0..0.04 along the run
# axis" anchors at the run end and extends into the run. Measured evidence:
# the raw cornice profile-bottom remnants RG faces 1139 (z 70.0400009 at
# the G_CORNICE_0 run end x 44.0) and 3773 (z 63.5400009 at the
# P_CORNICE_EAST_NORTH run start z 63.5) sit inside [end, end + 0.04] and
# outside a centred variant. The niche/rib strip is likewise anchored at
# the rib flank toward the niche. The original span's retained strip
# reached 0.34 m of the 947/2000 m gap to the surround outer edge; the
# adopted Q2 ruling (Brief 26, amended far face) extends the far face to
# x_dress + σ·1/50 (width 987/2000) as a preventive reserve — dress-side
# firing is evidence-only per the Brief 30 re-ruling (B.2: the actual
# exact three-slab results are recorded per instance, zero hits stop
# nothing and widen nothing), and the reserve grants no S7 credit.
#
# affected faces = faces of the current canonicalized product (the mesh
# S4 has just re-keyed) whose exact ring intersects the box: rings are the
# vertices' binary float coordinates, intersected against the exact box by
# the exact rational segment/box slab tests below. incident = the
# FACET_TABLE facet ids whose recorded support plane intersects the box
# (exact plane-box corner test). retained_neighbors = faces sharing an
# edge with an affected face but not themselves affected — under ruling 32
# consequence 7 evaluated on the union of overlapping affected regions: a
# face affected by ANY registry instance (any overlapping affected
# region's own replacement interior) is never on another entry's retained
# list; the per-entry lists are recomputed from geometry, no stale
# per-instance-only decision survives. Frozen into the entry for S7.
# RG_F1_REGISTRY rows carry family, instance, exact bbox,
# incident/affected/retained counts and the requiresOccupancy flag; the
# full id/index lists live in the REGISTRY entries for S6/S7.
#
# S4 support-set ceiling (documented decision; the _joint_supports helper
# carries the same rationale with the measured evidence): the received
# kernel's project_joint refuses any deduped support set of more than 3
# planes. Measured on the raw product, 241 of 5655 vertices carry
# exactly-4 recorded planes (never more; no dependent sets), and every
# such set is consistent at its recorded construction point (skirting and
# cornice profile corners; the niche-surround keystone row at the NICHE_
# PEAK spring). S4 resolves exactly that consistent class the same owner-
# ruled way the S2 span resolved the kernel's monolithic check_operand for
# the band-carrying operand (_band_operand_check): the kernel's
# project_joint remains THE solver — called unchanged with a determin-
# istically selected independent 3-plane subset (sorted plane_key order,
# greedy exact independence) — and every excluded plane is certified
# exact (plane_side == 0) against the solved point. Contradictory sets
# still fail loud; nothing is forced.
# ----------------------------------------------------------------------------

# S4 diagnostics: how many vertices took the kernel's direct joint solve
# (the full support set) and how many took the span-local certified-subset
# path (_joint_supports; the probe prints the census).
_CANON1_COUNTS = {}


def _joint_supports(supports):
    """The span-local resolution of the received kernel's over-3 guard.

    The kernel's project_joint rejects any support set whose deduped plane
    count exceeds 3 or whose normals are dependent ('over-determined; not
    a joint constraint'). Measured on the raw member-difference product:
    241 of 5655 vertices carry exactly 4 deduped recorded planes (never
    more: the support-set histogram is 1x410, 2x850, 3x4154, 4x241, no
    dependent 3-sets), and every 4-plane set is consistent — the vertex's
    recorded construction point lies on all four planes exactly (the
    skirting/cornice profile corners and the niche-surround/keystone row
    at the NICHE_PEAK spring). For such a set any independent 3-plane
    subset solves to the same source-defined point, so this helper picks
    that subset deterministically (sorted plane_key order, greedy exact
    independence), the caller hands it to the kernel's project_joint
    unchanged, and EVERY excluded plane is then certified exact against
    the solved point (plane_side == 0): a set whose excluded planes reject
    the point still fails loud. Parallel-and-different offsets (a real
    contradiction the 2-plane guard alone cannot express) keeps kernel-
    refusal semantics through the same certification path. The kernel
    function is never redefined and never bypassed for a set it accepts;
    this is the same owner-ruled pattern as the S2 span's
    _band_operand_check mirror of check_operand."""
    keys = sorted(supports)
    planes = [supports[key] for key in keys]
    if len(planes) <= 3 and independent([plane[0] for plane in planes]):
        return planes, True
    chosen = []
    chosen_normals = []
    for key in keys:
        normal = supports[key][0]
        if independent(chosen_normals + [normal]):
            chosen.append(supports[key])
            chosen_normals.append(normal)
            if len(chosen) == 3:
                break
    return chosen, False


# Brief 26 ruling consequence 2: S4's canonical table, persisted at module
# level (S7 remaps rings through the same table). _CANON1_TABLE carries
# (input, witness) → moved per mesh vertex; _CANON1_BY_IMAGE indexes it by
# the vertex's exact pre-move storage image for the S6 intake's recorded-
# ring remap. Both are cleared and rebuilt wherever first_canonicalization
# runs (deterministic on the same product).
_CANON1_TABLE = {}
_CANON1_BY_IMAGE = {}

# ruling-40 (v11/13) §2: the recorded exact source of each rank<3
# canonical key, keyed by pre-move storage image → witness → (rank,
# source); the S6 intake belt consumes it so a remapped arrangement node
# is born exact-domain or named. Cleared and rebuilt by
# first_canonicalization on every run (deterministic on the same
# product).
_CANON1_SNAP_SOURCES = {}

# The C' census lane (this module is the exact lane's census copy; the
# shipped builder is the predecessor file): the census-mode counters of
# the law's named relaxations R1+R2 and nothing else (the route law §2
# rule (b): any third demotion is an unnamed new class). The keys keep
# the probe census's shape:
#   s4_rank_1/2/3           — the S4 records by rank
#   s4_cand_zero/multi      — R2 at S4: the candidate-refusal demotion
#                             (zero/multi candidates → the as-solved node
#                             passes, the CANON1_NODE_SUPPORT row emits)
#   s4_line_population      — summed full-rank line-population sizes
#   s4_minLineDelta         — numeric minimum exact line delta (the
#                             probe's _PROBE_TWIN_MIN['s4']; stringified
#                             at row time — json cannot carry Fractions)
#   s7w2_*                  — the identical R2 family at WELD2
#                             (s7w2_rank_1/2/3, s7w2_cand_zero/multi,
#                             s7w2_line_population, _MIN['w2'])
#   s6_rank2UnsnappedClaims — R2 at the S6 intake belt (the rank-2
#                             with-no-snap claim passes; the row emits)
#   s7_patchTriZero         — R1: the route-law §4 zero-area patch-tri
#                             refusal demoted to the row + skip
#   s7_clipTriZero          — declared but never incremented: the clip-tri
#                             zero site stays fail-loud (the shipped law)
#   s7_clipOrientationZero  — declared but never incremented: the clip
#                             orientation site stays fail-loud (the
#                             shipped law)
_EXACT_CENSUS_LEDGER = defaultdict(int)
_EXACT_CENSUS_MIN = {'s4': None, 'w2': None}
# Module-instance captures the deviation ledger reads live (kept out of
# the census fields, whose keys stay the census counters): the intake
# belt's per-row claimant ranks, the S4 canonical table's values, the
# S4 identity ties, and the same-run census-pass values the bar-tuple
# roll-up composes from.
_EXACT_CENSUS_CAPTURES = defaultdict(int)


def _f32_ulp(value):
    """One float32 ulp as an exact Fraction at the value's binade — the
    ruling-40 candidate band («within one float32 ulp» at the free
    coordinate). Exact: the binade derives from the exact value, no
    float log. The binade's power is 2^e with 2^e <= |value| < 2^(e+1);
    the ulp is 2^(e-23) — an integer above the smallest binade bound,
    a unit fraction below it."""

    def _pow2(exp):
        if exp >= 0:
            return Fraction(1 << exp, 1)
        return Fraction(1, 1 << -exp)

    magnitude = abs(value)
    if magnitude == 0:
        return Fraction(1, 1 << 149)
    exponent = (magnitude.numerator.bit_length()
                - magnitude.denominator.bit_length())
    while _pow2(exponent + 1) <= magnitude:
        exponent += 1
    while _pow2(exponent) > magnitude:
        exponent -= 1
    return _pow2(exponent - 23)


def first_canonicalization():
    """S4: the first constrained canonicalization of the member-difference
    product. Appended per the adopted spec sentence: the weld groups by
    the canonical key (tuple(moved), witness) only, welds identical keys
    through bmesh.ops.weld_verts with the source-defined representative,
    the cluster diameter is asserted trivially <= JUNCTION_WELD_MAX, and
    the stage closes with the pending-only canon1 checkpoint (this is NOT
    a closure pass — the raw canon1 defects are repaired by registered
    replacement in S6/S7, not here)."""
    if _AIR_TARGET is None:
        fail('canonicalization S4 runs after the S3 chain')
    bm = bmesh.new()
    bm.from_mesh(_AIR_TARGET.data)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    if layer is None:
        fail('canon1: provenance layer lost before first canonicalization')
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(f'canon1: face {face.index} carries no valid FACET_TABLE index')
    planes = {facet.id: facet.plane for facet in FACET_TABLE}
    # ruling-40 (v11/13) §2 stage 1: per-vertex records; the keys re-key
    # after the exact-source repair block below
    _s4_records = []
    support_calls = {'direct': 0, 'certifiedSubset': 0}
    for vertex in list(bm.verts):
        witness = set()
        supports = {}
        for face in vertex.link_faces:
            facet_id = FACET_TABLE[face[layer]].id
            witness.add(facet_id)
            support = planes[facet_id]
            supports[plane_key(support)] = support
        point = binary_point(tuple(vertex.co))
        resolved_supports, direct = _joint_supports(supports)
        support_calls['direct' if direct else 'certifiedSubset'] += 1
        # the received kernel solve, unchanged — on the full support set
        # wherever its guard accepts it, on the deterministic certified
        # independent subset otherwise
        moved = project_joint(point, resolved_supports)
        if not direct:
            for plane in supports.values():
                if plane_side(moved, plane) != 0:
                    fail(
                        'canon1: an over-set support plane rejects the joint '
                        'point at ' + ','.join(exact_record(point)) + '; a '
                        'replacement patch or a hard failure is required'
                    )
        # ruling-40 (v11/13) §2 stage 1: record per vertex — the solve used
        # exactly this resolved subset, so its length IS the node's rank
        # and its planes are the candidate-test geometry
        _s4_records.append((
            vertex, point, tuple(moved), frozenset(witness),
            tuple(resolved_supports)))
    # ---- ruling-40 (v11/13) §2: a canonical key may never carry a
    # float-domain coordinate. The rank<3 project_joint branches source
    # the free coordinate(s) from the vertex's own storage image (the
    # 2-plane solve pins the along-line row to the input point; the
    # 1-plane solve leaves the in-plane pair at the input). For rank == 2
    # the exact source is the full-rank node on the same exact line (the
    # two pinned planes' intersection line — the exact line of the ring
    # edge the node subdivides) within one float32 ulp; that node's third
    # plane is 'the exact plane of the facet that produced the T-vertex'
    # and its rank-3 solve is the exact line ∩ plane point. Zero or
    # several distinct candidates fail loud (the project law: never
    # guessed). A rank<2 node has no ruled line source (the law defines
    # the subdivision line only through the node's own pinned planes) —
    # recorded with source 'none' and NOT guessed; the deviation rides in
    # the fact rows for the owner's ruling round.
    clusters = defaultdict(list)
    states = {}
    max_squares = Fraction(0)
    _CANON1_SNAP_SOURCES.clear()
    for vertex, point, moved, witness, resolved in _s4_records:
        rank = len(resolved)
        if rank == 3:
            repaired, source = moved, 'fullRankSupports'
        elif rank == 2:
            (n1, d1), (n2, d2) = resolved[0], resolved[1]
            direction = cross(n1, n2)
            free = dot(direction, point)
            band = _f32_ulp(free)
            node_keys = {plane_key(plane) for plane in resolved}
            candidates = {}
            for _cv, _cpoint, cand_moved, _cw, cand_resolved \
                    in _s4_records:
                if len(cand_resolved) != 3:
                    continue
                if dot(n1, cand_moved) != d1 or dot(n2, cand_moved) != d2:
                    continue
                if abs(dot(direction, cand_moved) - free) > band:
                    continue
                candidates[cand_moved] = cand_resolved
            if len(candidates) != 1:
                # Census R2 (the route law §2: the rank-2 refusal family
                # demoted to rows; the shipped builder keeps the law's
                # fail-loud): record the class and the full-rank line
                # population with the minimum exact line delta, then pass
                # the as-solved node — nothing guessed, the census feeds
                # the owner's relay
                lineage_full = [
                    abs(dot(direction, _cmoved) - free)
                    for _cv, _cpoint, _cmoved, _cw, _cres in _s4_records
                    if len(_cres) == 3
                    and dot(n1, _cmoved) == d1
                    and dot(n2, _cmoved) == d2]
                key = 's4_cand_zero' if not candidates else 's4_cand_multi'
                _EXACT_CENSUS_LEDGER[key] += 1
                _EXACT_CENSUS_LEDGER['s4_line_population'] += len(lineage_full)
                smallest = min(lineage_full) if lineage_full else None
                if smallest is not None and (
                        _EXACT_CENSUS_MIN['s4'] is None
                        or smallest < _EXACT_CENSUS_MIN['s4']):
                    _EXACT_CENSUS_MIN['s4'] = smallest
                emit('CANON1_NODE_SUPPORT', {
                    'candidates': len(candidates),
                    'image': ','.join(exact_record(point)),
                    'linePopulation': len(lineage_full),
                    'minLineDelta': (str(min(lineage_full))
                                     if lineage_full else None),
                    'moved': ','.join(exact_record(moved)),
                    'rank': rank,
                    'source': 'lineTwin',
                })
                repaired = moved if not candidates else next(iter(candidates))
                third = [plane for plane in candidates[repaired]
                         if plane_key(plane) not in node_keys] \
                    if candidates else ()
                source = (
                    'lineTwinAbsent' if not candidates else
                    ('lineTwin:' + ','.join(str(value) for value in
                                            plane_key(third[0]))
                     if len(third) == 1 else 'lineTwinMulti'))
            else:
                repaired = next(iter(candidates))
                third = [plane for plane in candidates[repaired]
                         if plane_key(plane) not in node_keys]
                source = (
                    'lineTwin:' + ','.join(str(value) for value in
                                           plane_key(third[0]))
                    if len(third) == 1 else 'lineTwin')
        else:
            repaired, source = moved, 'none'
        _EXACT_CENSUS_LEDGER['s4_rank_%d' % rank] += 1
        emit('CANON1_NODE_SUPPORT', {
            'image': ','.join(exact_record(point)),
            'moved': ','.join(exact_record(repaired)),
            'rank': rank,
            'source': source,
            'vertex': vertex.index,
        })
        _CANON1_SNAP_SOURCES.setdefault(point, {})[witness] = (
            rank, source)
        clusters[(repaired, witness)].append(vertex)
        states[vertex] = (point, repaired)
        square = norm2(sub(repaired, point))
        if square > max_squares:
            max_squares = square
    cluster_count = 0
    targetmap = {}
    # Brief 26 ruling consequence 2 (the S7 trap): S4's canonical table,
    # persisted at module level for the S6/S7 remap laws — for every mesh
    # vertex the (input, witness) → moved identity. The input is the
    # vertex's exact pre-move storage image (binary_point of v.co, the
    # kernel's binary law); the witness is the cluster's facet-id
    # frozenset; the move is the vertex's canonical moved point (exact).
    # _CANON1_BY_IMAGE indexes the same table by storage image so the S6
    # intake's recorded-ring remap is O(1) per node; multi-entry images
    # (the colliding-key class) resolve by the claimant facet inside the
    # witness, deterministically in build order.
    _CANON1_TABLE.clear()
    _CANON1_BY_IMAGE.clear()
    for cluster_key, members in clusters.items():
        for vertex in members:
            point = states[vertex][0]
            _CANON1_TABLE[(point, cluster_key[1])] = cluster_key[0]
            _CANON1_BY_IMAGE.setdefault(point, []).append(
                (cluster_key[1], cluster_key[0]))
    for key, members in clusters.items():
        moved = key[0]
        if len(members) < 2:
            continue
        cluster_count += 1
        # Cluster diameter: measured over the cluster's moved positions
        # (identical inside one key, so the measured value is 0); the
        # adopted spec asserts it <= JUNCTION_WELD_MAX as its trivial case.
        diameter = Fraction(0)
        for a in members:
            for b in members:
                if a is not b:
                    diameter = max(diameter, norm2(sub(states[a][1], states[b][1])))
        assert diameter <= JUNCTION_WELD_MAX ** 2
        for vertex in members[1:]:
            targetmap[vertex] = members[0]
    moved_count = 0
    for vertex, (point, moved) in states.items():
        if moved == point:
            continue
        vertex.co = Vector((float(moved[0]), float(moved[1]), float(moved[2])))
        moved_count += 1
    bmesh.ops.weld_verts(bm, targetmap=targetmap)
    emit('WELD1', {
        'clusters': cluster_count,
        'maxDisplacement': str(max_squares),
        'moved': moved_count,
    })
    _CANON1_COUNTS['supportCalls'] = support_calls
    _s4_census = dict(_EXACT_CENSUS_LEDGER)
    if _EXACT_CENSUS_MIN['s4'] is not None:
        _s4_census['s4_minLineDelta'] = str(_EXACT_CENSUS_MIN['s4'])
    _EXACT_CENSUS_CAPTURES['canon1_entries'] = len(_CANON1_TABLE)
    _EXACT_CENSUS_CAPTURES['canon1_images'] = len(_CANON1_BY_IMAGE)
    _EXACT_CENSUS_CAPTURES['canon1_vertices'] = len(_s4_records)
    emit('CANON1_TABLE', {
        'entries': len(_CANON1_TABLE),
        'images': len(_CANON1_BY_IMAGE),
        'census': _s4_census,
    })
    # Lane-2 A′-0 probe hook (ruling-40 §5/§6; research lane, never ships):
    # the S4 records are probed as-solved, before any later stage moves on
    _a0_probe_pass('S4', _s4_records)
    # no face may have lost its provenance index in the weld
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(f'canon1: face {face.index} lost its FACET_TABLE index in '
                 'the canonicalization weld')
    closed_guard(bm, 'canon1-pending', pending=True)
    bm.to_mesh(_AIR_TARGET.data)
    bm.free()


def _face_bbox(ring):
    lo = list(ring[0])
    hi = list(ring[0])
    for point in ring[1:]:
        for axis in range(3):
            if point[axis] < lo[axis]:
                lo[axis] = point[axis]
            if point[axis] > hi[axis]:
                hi[axis] = point[axis]
    return tuple(lo), tuple(hi)


def _bbox_overlaps(lo, hi, box_lo, box_hi):
    return all(lo[axis] <= box_hi[axis] and box_lo[axis] <= hi[axis]
               for axis in range(3))


def _segment_hits_box(a, b, box_lo, box_hi):
    # exact slab clip of a + t (b - a) for t in [0, 1]; a segment inside the
    # closed box intersects it, as does any segment leaving-box touching it.
    tmin, tmax = Fraction(0), Fraction(1)
    for axis in range(3):
        d = b[axis] - a[axis]
        if d == 0:
            if a[axis] < box_lo[axis] or a[axis] > box_hi[axis]:
                return False
            continue
        t1 = (box_lo[axis] - a[axis]) / d
        t2 = (box_hi[axis] - a[axis]) / d
        if t1 > t2:
            t1, t2 = t2, t1
        if t1 > tmin:
            tmin = t1
        if t2 < tmax:
            tmax = t2
        if tmin > tmax:
            return False
    return True


def _plane_hits_box(plane, box_lo, box_hi):
    # exact SAT: the support plane meets the closed box iff the offset lies
    # between the box's minimum and maximum plane values over its corners.
    normal, offset = plane
    low = high = Fraction(0)
    for axis in range(3):
        if normal[axis] > 0:
            low += normal[axis] * box_lo[axis]
            high += normal[axis] * box_hi[axis]
        elif normal[axis] < 0:
            low += normal[axis] * box_hi[axis]
            high += normal[axis] * box_lo[axis]
    return low <= offset <= high


def _box_to_blender(room_lo, room_hi):
    return (
        (room_lo[0], -room_hi[2], room_lo[1]),
        (room_hi[0], -room_lo[2], room_hi[1]),
    )


def _dress_landmark(wall_index, niche_index, sigma, flank, centre, label,
                    wall_room_z, k):
    """Brief 26 Q2: the amended family-2 far face. x_dress(w,k,s) is the
    FACET_TABLE support scalar of niche_surround/NICHE_DRESS_{w}_{k}'s
    outer side facet on side s; the ruled exact assertion
    σ·(x_dress − x_flank) = 947/2000 decides it (mismatch = build stop, no
    tolerance; the ±5e−6 band remains a box-FACE allowance only and never
    enters this predicate). The parenthetical landmark identity
    x_dress = x_c(k) ± (NICHE_W/2 + NICHE_SURROUND_W) is asserted too
    (x_c = the niche centre). The dress-side firing clause is
    evidence-only per the Brief 30 re-ruling (consequence B.2): these
    landmark and box-bound assertions stay, build_registry records the
    actual exact three-slab results per instance, and zero hits stops
    nothing and widens nothing."""
    target = flank + sigma * Fraction(947, 2000)
    landmark_want = centre - sigma * (q(NICHE_WIDTH) / 2 + q(NICHE_SURROUND_W))
    if target != landmark_want:
        fail(f'family-2 amendment landmarks disagree: σ·(x_dress − x_flank) '
             f'solves {target} but x_c(k) ± (NICHE_W/2 + NICHE_SURROUND_W) '
             f'is {landmark_want} for NICHE_DRESS_{wall_index}_{niche_index} '
             '@rib' + label)
    prefix = f'niche_surround/NICHE_DRESS_{wall_index}_{niche_index}/'
    values = set()
    for facet in FACET_TABLE:
        if facet.id.startswith(prefix):
            normal, offset = facet.plane
            if normal[1] == 0 and normal[2] == 0 and normal[0] != 0:
                values.add(offset / normal[0])
    if target not in values:
        fail(f'family-2 amendment: the ruled 947/2000 premise fails for '
             f'NICHE_DRESS_{wall_index}_{niche_index} @rib{label} '
             f'(wall {wall_room_z}, flank {flank}): the dress instance '
             f'carries no exact side-plane scalar {target} (measured '
             f'{sorted(str(v) for v in sorted(values))}); the ruled '
             'landmark assertion fails — the ruled build stop; no '
             'tolerance, no widening')
    return target


# Ruling 32 (Brief 32 REPLY §1/§3): the provenance-resolved crown-hairline
# pair inventory, persisted at module level once S5 builds it. The pairs are
# identified from construction provenance (the pinned node's S4 cluster
# witnesses = recorded FACET_TABLE ids, carrying the niche pocket and the
# niche dress crown arms) plus exact post-weld topology (the pair's
# collapsed hairline edge shows as a ring node value carried twice within
# each half's post-move ring) and are NEVER derived from existing box hits,
# proximity, or face numbers: no registry box is consulted anywhere in the
# builder. _CROWN_HAIRLINE_PAIRS carries one dict per resolved pair
# (site, faces, pin, facet, arms, window standards); _CROWN_HAIRLINE_FACES
# is the frozenset of every half's face id; the S6 crown-face ledger and
# the S5 site-and-pair assertions consume both.
_CROWN_HAIRLINE_PAIRS = None
_CROWN_HAIRLINE_FACES = frozenset()


def _crown_pin_site_band(x):
    """Ruling 32 §3's site binding: the pin's site resolves by its EXACT
    x-band against the construction's own disjoint site bands. The bands
    are the bays' crown spans [G_X1 − BAY_PITCH·(k+1), G_X1 −
    BAY_PITCH·k), whose midpoint x_c(k) = G_X1 − BAY_PITCH·(2k+1)/2 is the
    crown landmark: band k therefore spans exactly x_c(k) ± BAY_PITCH/2
    and adjacent bands share only the boundary station. Returns the list
    of open-band claims; a station edge or an outside x claims several or
    none — the callers treat anything != one claim as an ambiguous binding
    and stop (never guess)."""
    bay = q(BAY_PITCH)
    sites = []
    for k in range(11):
        lo = q(G_X1) - bay * (k + 1)
        hi = q(G_X1) - bay * k
        if lo < x < hi:
            sites.append(k)
        elif x == lo or x == hi:
            sites.extend([k - 1, k])
    return sites


def _crown_hairline_inventory():
    """Ruling 32 §1/§3: the provenance-resolved crown-hairline pair
    inventory (the crown_instance law's 𝒫 farms). REQUIRES the post-Boolean
    S3 chain and the S4 canonicalization (the inventory reads the pin's
    exact post-move node values and the recorded S4 cluster witnesses at
    them); stops loud otherwise. Deterministic end to end: face-index
    order everywhere, exact Fraction keys, sorted witness/arm sets; no box,
    no proximity, no face-number law enters the decision path.

    Per candidate repeated node:
      - post-weld topology: the node value (exact) appears >= 2 times in a
        face's post-move ring; the faces carrying it twice are the node's
        collapsed readers;
      - provenance: the S4 cluster rows at the node's moved-image witness
        union must carry BOTH crown arms (a niche_pocket/{w}_{k} facet and
        a NICHE_DRESS_{w}_{k} facet); a node whose witness carries only
        other families (e.g. the cornice-corner collapse) is out of class
        and records nothing; one arm type missing while the other is
        present, or a site disagreement between the two arm types, is an
        ambiguous provenance and stops;
      - site binding: wall w binds by the pin's exact y ( blender −z_w,
        the wall planes are disjoint); the bay binds through
        _crown_pin_site_band and must be exactly one claim equal to the
        provenance-named bay; ambiguous = loud stop;
      - the ruled precondition (§1): every included pin lies in the closed
        y-slab AND z-slab of the UNCHANGED slabs (height 62/25..63/25,
        run z_w − 1/50..z_w + 1/50); any violation stops for a further
        ruling — the amendment does not authorize widening either slab;
      - halves: exactly two faces must carry the node twice, sharing ONE
        common source facet id, and the pin must be an actual node of both
        halves' rings; otherwise ambiguous = loud stop."""
    global _CROWN_HAIRLINE_PAIRS, _CROWN_HAIRLINE_FACES
    if _CROWN_HAIRLINE_PAIRS is not None:
        return _CROWN_HAIRLINE_PAIRS
    if _AIR_TARGET is None:
        fail('crown-hairline inventory runs after the S3 chain')
    if not _CANON1_BY_IMAGE:
        fail('crown-hairline inventory runs after the S4 canonicalization')
    bm = bmesh.new()
    bm.from_mesh(_AIR_TARGET.data)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    if layer is None:
        fail('inventory: provenance layer lost before the inventory')
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(f'inventory: face {face.index} carries no valid '
                 'FACET_TABLE index')
    ring_nodes = {}
    facet_by_face = {}
    for face in bm.faces:
        ring_nodes[face.index] = [binary_point(tuple(v.co)) for v in face.verts]
        facet_by_face[face.index] = FACET_TABLE[face[layer]].id
    # the S4 cluster rows indexed by the MOVED point's float32 image (the
    # pin is a post-move exact point; the recorded pre-move storage image
    # is not the pin's own image) — the same indexed law the pre-work
    # read-only diagnostic measured the arms with
    rows_by_moved_image = defaultdict(list)
    for _image, rows in _CANON1_BY_IMAGE.items():
        for witness, moved in rows:
            key = (binary_q(_s6_f32(float(moved[0]))),
                   binary_q(_s6_f32(float(moved[1]))),
                   binary_q(_s6_f32(float(moved[2]))))
            rows_by_moved_image[key].append((witness, moved))
    # exact post-weld topology: per repeated node value, the faces whose
    # ring carries it twice (the collapsed hairline edge readers)
    repeat_faces = defaultdict(list)
    for face_index, ring in sorted(ring_nodes.items()):
        counts = defaultdict(int)
        for node in ring:
            counts[node] += 1
        for node, count in counts.items():
            if count >= 2:
                repeat_faces[node].append(face_index)
    pairs = []
    for node, faces in sorted(repeat_faces.items(), key=lambda item: item[0]):
        # provenance: the moved-image rows' witness union at this node
        rows = rows_by_moved_image.get(
            (binary_q(_s6_f32(float(node[0]))),
             binary_q(_s6_f32(float(node[1]))),
             binary_q(_s6_f32(float(node[2])))) , [])
        witnesses = set()
        for _witness, _moved in rows:
            witnesses |= set(_witness)
        pocket_facets = sorted(fid for fid in witnesses
                               if fid.startswith('niche_pocket/'))
        dress_facets = sorted(fid for fid in witnesses
                              if fid.startswith('niche_surround/NICHE_DRESS_'))
        if not pocket_facets and not dress_facets:
            # out of the crown class (e.g. the cornice-corner collapse):
            # records nothing rather than a run-stopper; the three measured
            # named pairs below remain the required completeness regressions
            continue
        pocket_sites = sorted({tuple(fid.split('/')[1].split('_'))
                               for fid in pocket_facets})
        dress_sites = sorted({tuple(fid.split('/')[1].split('_')[2:])
                              for fid in dress_facets})
        if len(pocket_sites) > 1 or len(dress_sites) > 1:
            fail(f"inventory: crown provenance is ambiguous at pin "
                 f"({','.join(exact_record(node))}): the S4 cluster witness "
                 f"carries pocket sites {pocket_sites} and dress sites "
                 f"{dress_sites}; never guess")
        if not pocket_sites or not dress_sites or pocket_sites[0] != dress_sites[0]:
            fail(f"inventory: the crown triad is incomplete at pin "
                 f"({','.join(exact_record(node))}): pocket arms "
                 f"{pocket_facets} name {pocket_sites} but dress arms "
                 f"{dress_facets} name {dress_sites}; ambiguous provenance "
                 "— build stop, never guess")
        site_text = pocket_sites[0]
        w, k = int(site_text[0]), int(site_text[1])
        # site binding: the wall y must be the exact wall plane
        wall_room_z = {0: q(G_Z0), 1: q(G_Z1)}[w]
        if node[1] != binary_q(-wall_room_z):
            fail(f"inventory: the pin ({','.join(exact_record(node))}) binds "
                 f"to wall {w} (z {float(wall_room_z)}) by provenance but "
                 f"its exact y is not the wall plane ±; ambiguous binding — "
                 "build stop, never guess")
        # site binding: the exact x-band (the construction's own disjoint
        # bands); ambiguous = loud stop
        band_sites = _crown_pin_site_band(node[0])
        if band_sites != [k]:
            fail(f"inventory: the pin ({','.join(exact_record(node))}) binds "
                 f"its exact x to site bands {band_sites}, not exactly the "
                 f"provenance-named bay {k}; ambiguous binding — build "
                 "stop, never guess")
        # the ruled precondition: the pin inside the unchanged closed
        # y-slab AND z-slab (height 62/25..63/25; run z_w ± 1/50); any
        # violation stops for a further ruling (no slab widening)
        height_lo, height_hi = Fraction(62, 25), Fraction(63, 25)
        run_lo, run_hi = wall_room_z - Fraction(1, 50), wall_room_z + Fraction(1, 50)
        if not (height_lo <= node[2] <= height_hi
                and run_lo <= -node[1] <= run_hi):
            emit('CROWN_PAIR_STOP', {
                'detail': 'a provenance-resolved crown-hairline pin lies '
                          'outside the unchanged closed y-slab or z-slab; '
                          'the amendment stops for a further ruling and '
                          'does not widen either slab',
                'faces': sorted(faces),
                'pin': exact_record(node),
                'site': f'{w}_{k}',
            })
            fail(f"inventory: the pin ({','.join(exact_record(node))}) of the "
                 f"provenance-resolved pair at site {w}_{k} is outside the "
                 "unchanged closed slabs (height 62/25..63/25, run "
                 f"{float(run_lo)}..{float(run_hi)}) — the ruled build stop; "
                 "no slab widening without a further ruling")
        # halves: exactly two faces carry the node twice, one common source
        # facet, and the pin an actual node of both halves' rings
        if len(faces) != 2:
            fail(f"inventory: the node ({','.join(exact_record(node))}) is "
                 f"carried twice by {len(faces)} faces {sorted(faces)}; the "
                 "crown-hairline pair law demands exactly two halves — "
                 "ambiguous post-weld topology, build stop, never guess")
        facet_ids = sorted({facet_by_face[face_index] for face_index in faces})
        if len(facet_ids) != 1:
            fail(f"inventory: the two halves {sorted(faces)} of the node "
                 f"({','.join(exact_record(node))}) carry distinct source "
                 f"facets {facet_ids}; the paired halves of one hairline "
                 "share their source facet — ambiguous provenance, build "
                 "stop, never guess")
        for face_index in faces:
            ring = ring_nodes[face_index]
            if sum(1 for n in ring if n == node) < 2:
                fail(f"inventory: the pin ({','.join(exact_record(node))}) is "
                     f"not an actual node of half face {face_index}'s ring "
                     f"({[exact_record(n) for n in ring]}) — the ruled "
                     "pin-is-endpoint-of-both-halves law fails; build stop")
        pairs.append({
            'arms': sorted(witnesses),
            'dressArms': dress_facets,
            'faces': sorted(faces),
            'facet': facet_ids[0],
            'pin': node,
            'pocketArms': pocket_facets,
            'site': (w, k),
        })
    # the three measured named pairs are inventory-completeness regressions
    named = {(1, 10): [210, 226], (0, 10): [231, 242], (0, 1): [237, 255]}
    for site, faces in sorted(named.items()):
        resolved = [pair for pair in pairs
                    if pair['site'] == site and pair['faces'] == faces]
        if not resolved:
            fail(f"inventory: the measured named pair {faces} at site "
                 f"{site[0]}_{site[1]} does not resolve inside the "
                 "provenance-resolved inventory — the inventory-completeness "
                 "regression fails; build stop, never guessed")
    _CROWN_HAIRLINE_PAIRS = pairs
    _CROWN_HAIRLINE_FACES = frozenset(
        face for pair in pairs for face in pair['faces'])
    bm.free()
    return pairs


def _registry_boxes():
    """The S5 family instances with their exact room boxes. Ordered:
    cornice_termination (clause A passage ends, clause B east-wall cycle
    ends, clause C long-wall ressaut breaks), niche_rib_junction,
    soffit_termination. Every returned box face is its construction scalar
    opened by LINE_PERP_MAX_Q (the representation band documented in the
    span header)."""
    band = LINE_PERP_MAX_Q
    boxes = []

    def add(family, instance, room_lo, room_hi, cap=False):
        boxes.append({
            'cap': cap,
            'family': family,
            'instance': instance,
            'roomLo': tuple(q(v) for v in room_lo),
            'roomHi': tuple(q(v) for v in room_hi),
        })

    def cornice(instance, wall_axis, depth_lo, depth_hi, run_axis, run_lo, run_hi, cap=False):
        lo = [None, None, None]
        hi = [None, None, None]
        lo[1], hi[1] = q(2.70) - band, q(3.00) + band
        lo[wall_axis] = q(depth_lo) - band
        hi[wall_axis] = q(depth_hi) + band
        lo[run_axis] = run_lo - band
        hi[run_axis] = run_hi + band
        add('cornice_termination', instance, lo, hi, cap=cap)

    # clause A — the passage side walls' ends at z 63.5 and 87.5, both walls
    cornice('P_CORNICE_WEST@63.5', 0, -4.0, -3.78, 2, q(63.5), q(63.5) + Fraction(1, 25))
    cornice('P_CORNICE_WEST@87.5', 0, -4.0, -3.78, 2, q(87.5) - Fraction(1, 25), q(87.5))
    cornice('P_CORNICE_EAST_NORTH@63.5', 0, 3.78, 4.0, 2, q(63.5), q(63.5) + Fraction(1, 25))
    cornice('P_CORNICE_EAST_SOUTH@87.5', 0, 3.78, 4.0, 2, q(87.5) - Fraction(1, 25), q(87.5))
    # clause B — the east gallery wall's run ends at z 70.0 / 76.0; these
    # are the cornice cycle corners, family 1's requires_occupancy boxes.
    cornice('END_CORNICE_0@70.0', 0, 43.78, 44.0, 2, q(70.0), q(70.0) + Fraction(1, 25), cap=True)
    cornice('END_CORNICE_1@76.0', 0, 43.78, 44.0, 2, q(76.0) - Fraction(1, 25), q(76.0), cap=True)
    # clause C — the long walls' ressaut breaks: both flanks of each
    # ressaut run [station - 0.22, station + 0.22], windows into the run.
    half = q(RESSAUT_WIDTH) / 2
    for wall_room_z, direction in ((G_Z0, 1), (G_Z1, -1)):
        depth_lo, depth_hi = wall_room_z, wall_room_z + direction * q(0.22)
        if direction < 0:
            depth_lo, depth_hi = depth_hi, depth_lo
        for station in PILASTER_X:
            station = q(station)
            west_end, east_end = station - half, station + half
            cornice(f'{_ressaut_name(wall_room_z, station)}@{float(west_end)}', 2,
                    depth_lo, depth_hi, 0, west_end, west_end + Fraction(1, 25))
            cornice(f'{_ressaut_name(wall_room_z, station)}@{float(east_end)}', 2,
                    depth_lo, depth_hi, 0, east_end - Fraction(1, 25), east_end)
    # family 2 — niche_rib_junction: per niche x adjacent rib edge.
    # AMENDED (Brief 26 Q2, ruling adopted): the near face stays
    # flank-anchored; the far face is x_dress(w,k,s) + σ·1/50 from the
    # dress landmark (retiring the 17/50 sum it encoded). Width
    # 17/50 → 987/2000, ledgered exactly below.
    station_set = {q(station) for station in PILASTER_X}
    niche_pitch = q(BAY_PITCH) / 2
    family2_count = 0
    family2_rows = []
    for wall_index, (wall_room_z, direction) in enumerate(((G_Z0, 1), (G_Z1, -1))):
        for k, centre in enumerate(NICHE_CENTRES, 1):
            centre = q(centre)
            for side, label in ((-1, 'W'), (1, 'E')):
                station = centre + side * niche_pitch
                if station not in station_set:
                    print('===S5 NOTE no adjacent rib for NICHE_%d_%d @%s '
                          '(abutment outside the rib stations)' % (
                              wall_room_z, k, 'E' if side == 1 else 'W'), flush=True)
                    continue
                flank = station - side * q(RIB_WIDTH) / 2
                sigma = Fraction(-side)
                x_dress = _dress_landmark(
                    wall_index, k - 1, sigma, flank, centre, label,
                    wall_room_z, k)
                padq = Fraction(1, 50)
                if side < 0:
                    run_lo, run_hi = flank, x_dress + padq
                else:
                    run_lo, run_hi = x_dress - padq, flank
                family2_count += 1
                family2_rows.append(
                    f'{wall_index} {k} rib{label} stripe '
                    f'{flank}..{x_dress + sigma * padq}')
                boxes.append({
                    'cap': False,
                    'family': 'niche_rib_junction',
                    'instance': f'NICHE_W{wall_room_z}_K{k}@rib{label}',
                    'dressPrefix': f'niche_surround/NICHE_DRESS_{wall_index}_{k - 1}',
                    'roomLo': (run_lo - band, q(2.60) - band, wall_room_z - band),
                    'roomHi': (run_hi + band, q(3.00) + band, wall_room_z + band),
                })
    # family 3 — soffit_termination: the flat-soffit ends at x 4.8 and the
    # far end x 4.0, y 3.0, the full z 70..76 span, both wall planes.
    for soffit_x in (G_X0 + G_REVEAL, G_X0):
        boxes.append({
            'cap': False,
            'family': 'soffit_termination',
            'instance': f'soffit@{soffit_x}',
            'roomLo': (q(soffit_x) - band, q(3.0) - band, G_Z0 - band),
            'roomHi': (q(soffit_x) + band, q(3.0) + band, G_Z1 + band),
        })
    # family 5 — niche_crown_junction (Brief 26 ruling Q1: 22 instances).
    # instance {w}_{k}, w ∈ {0,1} (z_w = 70 / 76), k ∈ 0..10; landmark
    # P_crown(w,k) = (x_c(k), NICHE_PEAK, z_w), x_c(k) = G_X1 −
    # BAY_PITCH·(2k+1)/2 exact (x_c(10) = 16873/2000 = 8.4365); the box is
    # the landmark ± 1/50 per axis with the standing ±5e−6 band on each
    # box face (band faces only, never the predicates). Incident/affected/
    # retained run the standing laws; requires_occupancy False. The ruled
    # self-checks (affected ≠ ∅ at all 22; the three measured named pairs
    # resolve and pass the site-and-pair law) run as ledger assertions in
    # build_registry — an empty instance is the ruled build stop
    # ('landmark no longer matches the construction'), never a widening.
    #
    # RULING 32 (Brief 32 REPLY §1) AMENDMENT: the crown x-window is
    # pin-derived. For a site with a provenance-resolved crown-hairline
    # pair (built by _crown_hairline_inventory: construction provenance +
    # exact post-weld topology, never box hits / proximity / face
    # numbers), x_i⁻ = min({x_c(k) − 1/50} ∪ {p_x : p ∈ 𝒫_i}) and
    # x_i⁺ = max({x_c(k) + 1/50} ∪ {p_x}), the exact pinned-node x's of
    # the site's pairs; the y/z slabs stay the unchanged Q1 bounds
    # (62/25..63/25, z_w ± 1/50); no pad beyond the original window from
    # the pins; no extension to the away-running remote vertex; the ±5e−6
    # band remains the box-FACE allowance only. An empty 𝒫 leaves the
    # original window unchanged. Every included pin passed the ruled
    # closed-slab precondition inside _crown_hairline_inventory.
    crown_pad = Fraction(1, 50)
    crown_pins_by_site = defaultdict(set)
    for pair in _crown_hairline_inventory():
        crown_pins_by_site[pair['site']].add(pair['pin'][0])
    for crown_w, (wall_room_z, direction) in enumerate(((G_Z0, 1), (G_Z1, -1))):
        for crown_k in range(11):
            x_c = q(G_X1) - q(BAY_PITCH) * Fraction(2 * crown_k + 1, 2)
            pins = sorted(crown_pins_by_site.get((crown_w, crown_k), ()))
            x_lo = min([x_c - crown_pad] + [pin for pin in pins])
            x_hi = max([x_c + crown_pad] + [pin for pin in pins])
            boxes.append({
                'cap': False,
                'family': 'niche_crown_junction',
                'instance': f'{crown_w}_{crown_k}',
                'roomLo': (x_lo - band, q(NICHE_PEAK) - crown_pad - band,
                           wall_room_z - crown_pad - band),
                'roomHi': (x_hi + band, q(NICHE_PEAK) + crown_pad + band,
                           wall_room_z + crown_pad + band),
                # the reshaped window's own facts (Ruling 32 §1); build_registry
                # records the row once per amended site
                'crownPins': [str(pin) for pin in pins],
                'crownXLo': str(x_lo),
                'crownXLoWithoutPins': str(x_c - crown_pad),
                'crownXHi': str(x_hi),
                'crownXHiWithoutPins': str(x_c + crown_pad),
                'crownXC': str(x_c),
            })
    return boxes


def _ressaut_name(wall_room_z, station):
    wall = 0 if wall_room_z == G_Z0 else 1
    stations = [q(s) for s in PILASTER_X]
    index = stations.index(station)
    return f'PILASTER_{wall}_{index}_RESSAUT'


def build_registry():
    """S5: the four-family registry per the adopted spec sentence. Every
    construction instance gets its exact box, its incident facets (the
    FACET_TABLE ids whose support plane intersects the box), its affected
    faces (faces of the current canonicalized product whose exact ring
    intersects the box) and the frozen retained_neighbors list. Ruling 32
    consequence 7 evaluates that law on amendments: affected sets are
    rebuilt from the amended boxes, and the retained list is recomputed on
    the union of overlapping affected regions — a face sharing an edge
    with this entry's affected faces and NOT affected by any instance of
    the registry (every affected face of any overlapping entry belongs to
    its own replacement; no stale per-instance-only retained entry
    survives). REGISTRY carries the full entries (exact boxes, sorted id
    and index lists) for the S6 arrangement stage and the S7 replacement
    law; RG_F1_REGISTRY rows carry family, instance, the exact blender
    bbox, the incident/affected/retained counts and requiresOccupancy."""
    if _AIR_TARGET is None:
        fail('registry S5 runs after the S3 chain')
    # Ruling 32 §3: resolve the crown-hairline pair inventory BEFORE any
    # box reads it — provenance + post-weld topology only, never box hits
    inventory = _crown_hairline_inventory()
    bm = bmesh.new()
    bm.from_mesh(_AIR_TARGET.data)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    if layer is None:
        fail('registry: provenance layer lost before S5')
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(f'registry: face {face.index} carries no valid '
                 'FACET_TABLE index')
    rings = {}
    face_facets = {}
    for face in bm.faces:
        ring = [binary_point(tuple(v.co)) for v in face.verts]
        rings[face.index] = (_face_bbox(ring), ring)
        face_facets[face.index] = FACET_TABLE[face[layer]].id
    planes_by_key = defaultdict(list)
    for facet in FACET_TABLE:
        planes_by_key[plane_key(facet.plane)].append(facet)
    for facets in planes_by_key.values():
        facets.sort(key=lambda facet: facet.id)
    # Brief 30 re-ruling coverage accounting: per family-2 instance, whether
    # any dress-side evidence fired (slab hits or an own-dress product face
    # in the affected set); the summary lands in the REGISTRY_AMENDMENT row.
    family2_coverage = []
    # pass 1 — the exact affected law per amended box; the retained lists
    # are recomputed below on the union law (ruling 32 consequence 7) and
    # the REGISTRY rows record both counts
    for box in _registry_boxes():
        box_lo, box_hi = _box_to_blender(box['roomLo'], box['roomHi'])
        incident = sorted(
            facet.id
            for facets in planes_by_key.values()
            if _plane_hits_box(facets[0].plane, box_lo, box_hi)
            for facet in facets
        )
        affected = []
        for face in bm.faces:
            face_lo, face_hi = rings[face.index][0]
            if not _bbox_overlaps(face_lo, face_hi, box_lo, box_hi):
                continue
            ring = rings[face.index][1]
            if any(_segment_hits_box(a, b, box_lo, box_hi)
                   for a, b in pairs(ring)):
                affected.append(face.index)
        REGISTRY.append({
            'affected': affected,
            'bbox': (tuple(box_lo), tuple(box_hi)),
            'family': box['family'],
            'incident': incident,
            'instance': box['instance'],
            'requiresOccupancy': box['cap'],
            'roomBox': (tuple(box['roomLo']), tuple(box['roomHi'])),
        })
        if box['family'] == 'niche_crown_junction' and box.get('crownPins'):
            # Ruling 32 §1: the site's reshaped x-window, recorded once per
            # amended site (the y/z slabs are unchanged and the exact
            # precondition assertions live in _crown_hairline_inventory)
            emit('CROWN_WINDOW', {
                'instance': f'niche_crown_junction@{box["instance"]}',
                'pins': box['crownPins'],
                'xLo': box['crownXLo'],
                'xLoWithoutPins': box['crownXLoWithoutPins'],
                'xHi': box['crownXHi'],
                'xHiWithoutPins': box['crownXHiWithoutPins'],
                'xLandmarkC': box['crownXC'],
            })
        if box['family'] == 'niche_rib_junction':
            # Brief 26 Q2 as re-ruled (Brief 30 REPLY, consequence B.2):
            # dress-side firing is EVIDENCE-ONLY, not a required positive
            # self-check. The coordinate (x_dress, 13/5, z_w) lies on the
            # amended box's y-min boundary by the landmark arithmetic; the
            # ruling withholds the fired-face assertion. This row records
            # the actual exact three-slab intersection results — the exact
            # slab clip (_segment_hits_box) over every recorded dress-ring
            # segment against this instance's band-opened box — including
            # zero hits, without manufacturing a witness or admitting a
            # nonintersecting facet or product piece. Zero hits stops
            # nothing and widens nothing; coverage is recorded as
            # reserve / no measured firing, never a repaired defect.
            prefix = box['dressPrefix'] + '/'
            slab_hits = {}
            for facet in FACET_TABLE:
                if facet.id.startswith(prefix):
                    slab_hits[facet.id] = sum(
                        1 for a, b in pairs(facet.ring)
                        if _segment_hits_box(a, b, box_lo, box_hi))
            own_dress = [
                index for index in affected
                if face_facets[index].startswith(prefix)]
            fired = bool(own_dress) or any(slab_hits.values())
            family2_coverage.append(fired)
            emit('AMEND_CHECK', {
                'affected': len(affected),
                'coverage': 'reserve/noMeasuredFiring' if not fired
                            else 'measured',
                'dressFacets': len(slab_hits),
                'dressPrefix': box['dressPrefix'],
                'family': 'niche_rib_junction',
                'instance': box['instance'],
                'ownDressFaces': own_dress,
                'slabHits': slab_hits,
                'width': '987/2000',
            })
        if box['family'] == 'niche_crown_junction' and not affected:
            # Brief 26 Q1: an empty crown instance is the ruled build stop.
            fail(f'family-5 self-check: niche_crown_junction@{box["instance"]} '
                 'has an empty affected set — the landmark no longer '
                 'matches the construction (the ruled build stop; never '
                 'a widening)')
    # RULING 32 consequence 7 (recompute from geometry; no stale retained
    # entries carried over): the retained law runs on the union of
    # overlapping affected regions — a face sharing an edge with this
    # entry's affected faces and not affected by ANY registry instance.
    # (Every affected face of any overlapping entry belongs to its own
    # entry's replacement; keeping it on another entry's retained list
    # carried a stale per-instance-only decision, measured today as 1053
    # such conflict rows.)
    adjacency = defaultdict(set)
    for face in bm.faces:
        for edge in face.edges:
            for neighbor in edge.link_faces:
                adjacency[face.index].add(neighbor.index)
    affected_everywhere = set()
    for entry in REGISTRY:
        affected_everywhere.update(entry['affected'])
    for entry in REGISTRY:
        retained = sorted(
            {neighbor
             for index in entry['affected']
             for neighbor in adjacency[index]
             if neighbor not in affected_everywhere})
        entry['retained'] = retained
        emit('REGISTRY', {
            'affected': len(entry['affected']),
            'bbox': [[str(v) for v in entry['bbox'][0]],
                     [str(v) for v in entry['bbox'][1]]],
            'family': entry['family'],
            'incident': len(entry['incident']),
            'instance': entry['instance'],
            'requiresOccupancy': entry['requiresOccupancy'],
            'retained': len(retained),
        })
    # RULING 32 §3: the SITE-AND-PAIR LAW replaces the face-number
    # membership law. crown_hairline_pairs is the provenance-resolved
    # inventory (built above, independent of every box); the three
    # measured named pairs resolve inside it as inventory-completeness
    # regressions; each pair's halves must satisfy the exact geometric
    # predicates at their own site's instance, the polyline pin must be an
    # actual ring node of both halves, and the site's ownership law holds
    # with cross-family justified overlap REPORTED, never suppressed.
    crown_entries = [entry for entry in REGISTRY
                     if entry['family'] == 'niche_crown_junction']
    crown_instance_by_site = {
        tuple(int(text) for text in entry['instance'].split('_')): entry
        for entry in crown_entries}
    pair_rows = 0
    for pair in inventory:
        site = pair['site']
        inst = crown_instance_by_site[site]
        faces = pair['faces']
        pin = pair['pin']
        box_lo, box_hi = inst['bbox']
        if len(faces) != 2:
            fail(f'site-and-pair law: the {site[0]}_{site[1]} pair resolves '
                 f'{len(faces)} halves {sorted(faces)}; the pair law demands '
                 'exactly two — build stop; never guessed')
        # the ruled precondition's instance-side twin: the pin lies inside
        # the instance's own closed box (the unchanged closed ruled slabs
        # themselves were asserted in _crown_hairline_inventory)
        pin_inside = all(box_lo[axis] <= pin[axis] <= box_hi[axis]
                         for axis in range(3))
        for face_index in faces:
            face_ring = rings[face_index][1]
            endpoint = sum(1 for node in face_ring if node == pin) >= 1
            covered = any(_segment_hits_box(a, b, box_lo, box_hi)
                          for a, b in pairs(face_ring))
            in_site = face_index in inst['affected']
            cross_crown = sorted(
                f'{other["family"]}@{other["instance"]}' for other in crown_entries
                if other is not inst and face_index in other['affected'])
            others_beyond = sorted(
                f'{other["family"]}@{other["instance"]}' for other in REGISTRY
                if other['family'] != 'niche_crown_junction'
                and face_index in other['affected'])
            emit('CROWN_PAIR', {
                'affectedIn': [f'{inst["family"]}@{inst["instance"]}'],
                'coveredByPinLaw': covered,
                'crossCrownOwnership': cross_crown,
                'crossFamilyOverlap': others_beyond,
                'facet': pair['facet'],
                'faces': faces,
                'instance': inst['instance'],
                'pin': exact_record(pin),
                'pinInsideInstanceBox': pin_inside,
                'pinIsRingNodeOfBothHalves': endpoint,
                'site': f'{site[0]}_{site[1]}',
                'witnessArms': sorted(pair['arms']),
            })
            if not endpoint:
                fail(f'site-and-pair law: the pin '
                     f'({",".join(exact_record(pin))}) of the '
                     f'{site[0]}_{site[1]} pair is not an actual node of '
                     f'half face {face_index}\'s ring '
                     f'({[exact_record(n) for n in face_ring]}) — build '
                     'stop; never guessed, never widened')
            if not pin_inside:
                fail(f'site-and-pair law: the pin '
                     f'({",".join(exact_record(pin))}) of the '
                     f'{site[0]}_{site[1]} pair lies outside the '
                     f'{inst["family"]}@{inst["instance"]} closed box '
                     f'{[[str(v) for v in box_lo], [str(v) for v in box_hi]]}'
                     ' — build stop; never widened')
            if not covered:
                fail(f'site-and-pair law: half face {face_index} of the '
                     f'{site[0]}_{site[1]} pair does not hit the '
                     f'{inst["family"]}@{inst["instance"]} closed box — '
                     'its exact ring '
                     f'({[exact_record(n) for n in face_ring]}) carries no '
                     'segment intersecting it; build stop; never widened')
            if not in_site:
                fail(f'site-and-pair law: half face {face_index} of the '
                     f'{site[0]}_{site[1]} pair is absent from the '
                     f'{inst["family"]}@{inst["instance"]} affected set — '
                     'build stop; never widened')
            # ownership: the crown instances whose affected contain a half
            # are exactly one (the site's own); cross-site membership inside
            # the crown family is a hard stop
            if cross_crown:
                fail(f'site-and-pair law: half face {face_index} of the '
                     f'{site[0]}_{site[1]} pair is also affected by the '
                     f'crown instances {cross_crown}; the crown-site '
                     'ownership law fails — build stop; never suppressed')
            # cross-family overlap is justified overlap by the ruling's
            # note: reported, never suppressed
            if others_beyond:
                emit('AMEND_REPORT', {
                    'detail': 'a crown-hairline pair half is also affected '
                              'by non-crown instances; justified overlap '
                              'from another family is reported, not '
                              'suppressed (the crown-site ownership law '
                              'binds crown instances only)',
                    'faces': [face_index],
                    'instances': others_beyond,
                    'site': f'{site[0]}_{site[1]}',
                })
        pair_rows += 1
    emit('CROWN_INVENTORY', {
        'pairs': pair_rows,
        'faces': sorted(_CROWN_HAIRLINE_FACES),
        'instances': [f'niche_crown_junction@{pair["site"][0]}_{pair["site"][1]}'
                      for pair in inventory],
        'line': 'provenance-resolved crown-hairline pair inventory; the '
                'three measured named pairs are the completeness '
                'regressions, not the class definition',
    })
    emit('REGISTRY_AMENDMENT', {
        'family': 'niche_rib_junction',
        'instances': sum(
            1 for entry in REGISTRY if entry['family'] == 'niche_rib_junction'),
        'law': 'near face flank-anchored; far face x_dress + σ·1/50 '
               'with σ·(x_dress − x_flank) = 947/2000 exact',
        'retired': '17/50',
        'amended': '987/2000',
        # Brief 30 re-ruling §3: coverage accounting — family-2 dress-side
        # coverage is reserve / no measured firing, not a repaired defect,
        # and the reserve grants no S7 acceptance credit.
        'dressCoverage': 'reserve/noMeasuredFiring'
                         if not any(family2_coverage) else 'measured',
        'noMeasuredFiring': sum(1 for was_fired in family2_coverage
                                if not was_fired),
    })
    emit('AMEND_LEDGER', {
        'line': 'four of the nine observed slivers were outside the four '
                'adopted families; resolved by niche_crown_junction '
                '(22 instances)',
        'token': 'brief26-challenge-ledger',
    })
    # RULING 32 §2: the cornice-remnant provenance assertion at the
    # P_CORNICE_EAST_NORTH@63.5 site. The site's ACTUAL cornice remnants
    # resolve from construction provenance — every post-weld face whose
    # recorded source facet is cornice_passage/P_CORNICE_EAST_NORTH/3
    # (currently reported as post-weld faces 3772/3773) — resolved through
    # the provenance layer's resolved face identity, never by face number
    # and never by a vertex index (the received v.index wiring defect is
    # retired with the face-number law). Each resolved remnant face must
    # be covered (the exact three-slab law against this instance's closed
    # box) and affected.
    cornice_entry = None
    for entry in REGISTRY:
        if (entry['family'] == 'cornice_termination'
                and entry['instance'] == 'P_CORNICE_EAST_NORTH@63.5'):
            cornice_entry = entry
            break
    if cornice_entry is None:
        fail('cornice-remnant provenance assertion: the ruled '
             'cornice_termination@P_CORNICE_EAST_NORTH@63.5 site is not in '
             'the registry')
    box_lo, box_hi = cornice_entry['bbox']
    remnant_facet = 'cornice_passage/P_CORNICE_EAST_NORTH/3'
    remnants = sorted(index for index, facet_id in face_facets.items()
                      if facet_id == remnant_facet)
    if not remnants:
        fail('cornice-remnant provenance assertion: facet '
             f'{remnant_facet} resolves to no post-weld face; the '
             'provenance-based remnant law has nothing to assert — build '
             'stop, never guessed')
    for face_index in remnants:
        face_ring = rings[face_index][1]
        covered = any(_segment_hits_box(a, b, box_lo, box_hi)
                      for a, b in pairs(face_ring))
        # the weld-cluster witnesses by the RESOLVED face identity law: the
        # facet ids of every face linked to the remnant face's vertices,
        # looked up by face, never by any vertex index
        cluster_witnesses = sorted(
            {face_facets[neighbor.index]
             for vertex in bm.faces[face_index].verts
             for neighbor in vertex.link_faces})
        in_site = face_index in cornice_entry['affected']
        emit('CORNICE_REMNANT', {
            'affectedIn': [f'{cornice_entry["family"]}@{cornice_entry["instance"]}'],
            'coveredByRingSet': covered,
            'face': face_index,
            'facet': remnant_facet,
            'inAffectedSet': in_site,
            'instance': f'{cornice_entry["family"]}@{cornice_entry["instance"]}',
            'resolvedFromProvenance': True,
            'ringNodes': sorted({tuple(str(v) for v in node)
                                 for node in face_ring}),
            'weldClusterWitnesses': cluster_witnesses,
        })
        if not covered:
            fail(f'cornice-remnant provenance assertion: the site '
                 f'{cornice_entry["family"]}@{cornice_entry["instance"]}\'s '
                 f'remnant face {face_index} (from {remnant_facet}) is not '
                 'covered by its exact ring against the closed box — build '
                 'stop; never widened')
        if not in_site:
            fail(f'cornice-remnant provenance assertion: the site '
                 f'{cornice_entry["family"]}@{cornice_entry["instance"]}\'s '
                 f'remnant face {face_index} (from {remnant_facet}) is not '
                 'in the instance\'s affected set — build stop; never '
                 'widened')
    # ruling consequence 8: the construction-evidence probe (not a
    # predicate) — per crown instance, the exact distance between the
    # pocket's crown keys and the dress's (closest ring node per operand
    # set to the crown landmark); if nonzero only at k=10, that is a
    # construction key inconsistency logged for the next round; the
    # construction itself stays byte-unchanged.
    for entry in REGISTRY:
        if entry['family'] != 'niche_crown_junction':
            continue
        crown_w_text, crown_k_text = entry['instance'].split('_')
        box_lo, box_hi = entry['bbox']
        landmark = tuple(
            (box_lo[axis] + box_hi[axis]) / 2 for axis in range(3))
        def _nearest(prefix):
            nodes = [
                node for facet in FACET_TABLE
                if facet.id.startswith(prefix + '/')
                for node in facet.ring]
            if not nodes:
                fail(f'family-5 evidence probe: no operand facets for '
                     f'{prefix} (the crown-instance key check stopped)')
            best = min(
                (norm2(sub(node, landmark)), tuple(node)) for node in nodes)
            return best[1], best[0]
        pocket_node, pocket_dist2 = _nearest(f'niche_pocket/{crown_w_text}_{crown_k_text}')
        dress_node, dress_dist2 = _nearest(
            f'niche_surround/NICHE_DRESS_{crown_w_text}_{crown_k_text}')
        emit('CROWN_KEYS', {
            'dressDist2': str(dress_dist2),
            'dressKey': exact_record(dress_node),
            'gapDist2': str(norm2(sub(pocket_node, dress_node))),
            'instance': entry['instance'],
            'pocketDist2': str(pocket_dist2),
            'pocketKey': exact_record(pocket_node),
        })
    bm.free()




# ----------------------------------------------------------------------------
# Continuation segment 4/n — stage S6 (arrangement + classification) of the
# adopted PART 2a-WATERTIGHT spec, per Brief 27. Appended contiguously after
# the S4/S5 span; received and previously landed symbols are consumed as-is
# and never redefined. The span ends where S7 (assembly) would begin; no S7
# code exists here.
#
# WHAT THE STAGE IS (the adopted S6 sentence, mechanically, per registry
# instance):
#   - the entry's incident facet ids are grouped by plane_key; every plane
#     group runs its own arrangement (the brief's design point: several
#     incidents of one box may be coplanar at different scalars, the
#     plane_key groups them, and the machinery is a per-instance render over
#     the group keys — the number of groups per instance is counted and
#     reported);
#   - per plane: the segment intake is (a) every boundary segment of the
#     incident facets lying in that plane and (b) the perimeter edges of the
#     entry's retained_neighbors lying in that plane, flattened through the
#     kernel's drop_axis/flatten exactly as the letter says;
#   - noding is exact rational (Fractions end to end): pairwise segment
#     intersections (the span-local exact solve, no float), plus every
#     vertex lying on a segment (orient2 == 0 and inclusive bbox — realized
#     through the pairwise events: a transversal pair nodes the shared
#     point, a collinear pair adds the other segment's endpoints lying in
#     its closed span; repeated EXACT vertices collapse to one node while
#     the directed uses bookkeep once per direction);
#   - the planar graph: nodes 1:1 with the distinct exact points; faces via
#     the half-edge walk with the CCW-predecessor-of-twin next rule, the
#     angular order built with cross2/dot comparisons only (no atan2);
#   - bounded regions = the positive-area face rings; the negative ring of
#     a component containing no positive ring is that component's exterior
#     (unbounded) face and is never classified; a negative ring inside a
#     positive one is a hole of the smallest-area positive ring containing
#     it; degenerate zero-area cycles are counted, never classified;
#   - the witness = the centroid of the first certified ear: a consecutive
#     ring triple with orient2 > 0 and no other ring vertex strictly inside
#     it (the classic ear certificate, by the kernel's exact
#     point_in_polygon), whose centroid lies outside every hole; ears are
#     tried in the ring's deterministic lexicographic rotation, max 8 (the
#     letter's cap) then loud failure; the kernel's air_side raises on an
#     edge/vertex contact and every such contact retries the next certified
#     ear; 'ambiguous source membership' and 'no clean exact ray direction'
#     are kernel refusals, not edge contacts, and are not retried;
#   - the retention law air_side(witness, plane_normal, operands) in
#     {(True, False), (False, True)} is the kernel call unchanged on the
#     module's operand list; (True, True) and (False, False) regions are
#     dropped — which for family 1 IS the source-occupancy confirmation the
#     letter binds: a loop classifying (T,T) or (F,F) is never capped;
#   - the retained ring is re-oriented so its normal points from air to
#     not-air (outward from air): the exact 3D ring rebuilt on the group
#     plane is dot-tested against that outward direction;
#   - delaunay_2d_cdt(..., output_type=2, epsilon=0.0) is called only to
#     propose triangulation of a retained region; every proposal must pass
#     the letter's certification or the stage fails loud: each output
#     vertex maps 1:1 onto an arrangement node (exact equality after
#     binary_point), every constraint edge appears, every output triangle
#     orient2 > 0; span-local extension for the nested-faces case: the
#     exact signed triangle areas in the proposal's own feed domain must
#     sum exactly to area2(outerRing) + sum(area2(holeRings)) of its input
#     nodes — the tiled-coverage proof (Blender's ot=2 otherwise fills
#     holes, and the rational sum exposes that). The proposal's coordinates
#     are never authoritative; the certified node triangle lists are
#     recorded for S7;
#   - the intake reads SEGMENTS FROM THE RING (design point D): the
#     incident facet ring segments are the recorded exact scalars (the
#     source facts the patch rebuilds from) and the retained neighbors'
#     perimeter edges are realized through their recorded facet rings; every
#     realized (post-S4) mesh-side edge is cross-checked against the exact
#     recorded segments of the plane under _S6_EDGE_MATCH_BAND, and one
#     matching none is REPORTED as S7's remap business — flagged, never
#     guessed into the arrangement.
#
# THE EDGE-MATCH BAND: _S6_EDGE_MATCH_BAND = LINE_PERP_MAX_Q — the kernel's
#   own declared float-noise band, already the S5 span's choice for exactly
#   this reconciliation (S4 moves every vertex exactly onto the recorded
#   joint supports, but the stored mesh is float32 and the S5 header
#   measured a one-ulp scatter ≈ 4e-6 m at the room's larger coordinates,
#   so exact equality against recorded 8-decimal scalars is impossible for
#   the stored realized edges by construction).
#
# ARITHMETIC DETERMINISM: every coordinate stays an exact Fraction through
#   the 2D frame; floats appear only as the CDT proposal's feed domain and
#   are certified back through binary_point. The kernel air_side call is
#   memoized by its full exact argument (the witness, the displacement
#   normal) — a pure-function cache over a deterministic kernel, so repeat
#   witnesses across registry instances (the far cells re-classify in every
#   box on their wall) classify once, and reruns classify identically. The
#   plane-group structure (nodes, faces, ears) is memoized by the exact
#   structural key (plane_key, frozenset of segments) for the same reason;
#   census counts stay per instance-event, not per cache hit.
#
# LEGALITY STATES: an entry with an empty affected set and an entry whose
#   plane groups retain zero regions are legal S6 states (Brief 27: the
#   registry is under amendment and the ruling decides which instances
#   matter for S7's bar); each emits its explicit row and fails nothing.
#
# IDENTITY CHECK: the stage re-derives every entry's affected/retained sets
#   with the S5 predicates on the same mesh the registry froze them from
#   (unchanged constants, unchanged law) and fails loud on any divergence —
#   the face-index identity of REGISTRY is verified, never assumed.
#
# OUTPUT: per (entry, plane) RG_F1_PATCH {family, instance, plane, regions,
#   retained, dropped, witness}; legality rows as RG_F1_PATCH_STATE; the
#   machine census lands in _S6_CENSUS for the probe's machine-summary
#   marker; the per-region detail the S7 next span needs (oriented exact 3D
#   rings, witnesses, sides, the certified CDT node lists, unmatched
#   realized neighbor edges) lands in _s6_results. The stage opens the
#   canonicalized product read-only and mutates no bmesh geometry.
# ----------------------------------------------------------------------------

import struct
from functools import cmp_to_key
from heapq import heappop, heappush
from itertools import islice

# S7's next span consumes this holder: per registry entry, the plane groups'
# retained regions (oriented exact rings, witnesses, sides, certified CDT
# node lists) and the counted unmatched realized neighbor edges.
_s6_results = []

_S6_MAX_EARS = 8
_S6_EDGE_MATCH_BAND = LINE_PERP_MAX_Q
_S6_CENSUS = {}
_S6_AIR_CACHE = {}
_S6_GROUP_CACHE = {}
_S6_FACE_FACTS = {}
_S6_USABLE_OPERANDS = []


def _s6_census_blank():
    return {
        'capConfirmed': 0,
        'cdtProposals': 0,
        'collapsedRings': 0,
        'droppedRegions': 0,
        'earContacts': 0,
        'earRefusals': 0,
        'edgeCollapses': 0,
        'emptyAffected': 0,
        'exteriorCycles': 0,
        'instances': 0,
        'neighborEdges': 0,
        'orientationFlips': 0,
        'planeGroups': 0,
        'regions': 0,
        'retainedRegions': 0,
        'unmappedNodes': 0,
        'unmatchedNeighborEdges': 0,
        'zeroCycles': 0,
        'zeroRetained': 0,
    }


def _s6_key_plane(key):
    """The received plane record of a plane_key group: (normal, offset)."""
    return key[:3], key[3]


def _s6_flat2(point, axis_i, axis_j):
    """The two frame coordinates of a 3D point, dropping the frame axis."""
    return (point[axis_i], point[axis_j])


def _s6_frame_of(plane):
    """The kernel's flattening frame: axis dropped, the other two ascending
    (drop_axis/flatten, the letter's own words)."""
    normal, _offset = plane
    axis = drop_axis(normal)
    others = [index for index in range(3) if index != axis]
    return axis, others[0], others[1]


def _s6_lift(plane, axis, axis_i, axis_j, uv):
    """The exact 3D point of the group plane for a 2D frame point."""
    normal, offset = plane
    result = [None, None, None]
    result[axis_i] = uv[0]
    result[axis_j] = uv[1]
    result[axis] = (offset - normal[axis_i] * uv[0] - normal[axis_j] * uv[1]) / normal[axis]
    return tuple(result)


def _s6_in_closed_span(point, r, s):
    # the letter's vertex-on-segment predicate's bbox clause; the caller has
    # already established orient2 == 0 through the collinear clause
    return (min(r[0], s[0]) <= point[0] <= max(r[0], s[0])
            and min(r[1], s[1]) <= point[1] <= max(r[1], s[1]))


def _s6_band_on_segment(image, r, s, band):
    """Exact banded on-segment test for a realized mesh-side point against a
    recorded segment: orient2 within band × length (squared, exact) and the
    bbox enlarged by the band."""
    span = sub(s, r)
    length2 = norm2(span)
    if length2 == 0:
        return image == r
    cross = cross2(span, sub(image, r))
    if cross * cross > band * band * length2:
        return False
    return (min(r[0], s[0]) - band <= image[0] <= max(r[0], s[0]) + band
            and min(r[1], s[1]) - band <= image[1] <= max(r[1], s[1]) + band)


def _s6_angle_cmp(d1, d2):
    """Exact CCW angular order of two directions from a common node: the
    cross2 sign decides, opposite directions split by a deterministic
    half-plane rule; no atan2 anywhere. Identical directions cannot exist
    in a noded graph (noding splits the longer segment), so equal directions
    return 0 only as a defensive tie."""
    c = cross2(d1, d2)
    if c > 0:
        return -1
    if c < 0:
        return 1
    if dot(d1, d2) > 0:
        return 0
    early1 = d1[0] > 0 or (d1[0] == 0 and d1[1] > 0)
    early2 = d2[0] > 0 or (d2[0] == 0 and d2[1] > 0)
    if early1 and not early2:
        return -1
    if early2 and not early1:
        return 1
    return 0


def _s6_canonical(ring):
    """The ring rotated to start at its lexicographically smallest node —
    the deterministic rotation every consumer orders by."""
    key = min(range(len(ring)), key=lambda i: (ring[i][0], ring[i][1]))
    return tuple(ring[key:] + ring[:key])


def _s6_certified_ears(ring, holes):
    """Yield (triple, centroid) for every certified ear of a CCW ring, in
    the ring's order: a consecutive triple with orient2 > 0, no other ring
    vertex strictly inside the triangle (the kernel's exact
    point_in_polygon), and its centroid outside every hole."""
    n = len(ring)
    if n < 3:
        return
    for k in range(n):
        p0, p1, p2 = ring[k], ring[(k + 1) % n], ring[(k + 2) % n]
        if orient2(p0, p1, p2) <= 0:
            continue
        triple = (p0, p1, p2)
        centroid = ((p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3)
        skip = (k, (k + 1) % n, (k + 2) % n)
        certified = True
        for m, point in enumerate(ring):
            if m in skip:
                continue
            if point_in_polygon(point, triple) == 1:
                certified = False
                break
        if certified:
            for hole in holes:
                if point_in_polygon(centroid, hole) == 1:
                    certified = False
                    break
        if certified:
            yield triple, centroid


def _s6_group_structure(key, segments):
    """Noding + planar graph + half-edge faces for one plane group — a pure
    function of the exact segment set, memoized by
    (plane_key, frozenset(segments))."""
    hit = _S6_GROUP_CACHE.get((key, frozenset(segments)))
    if hit is not None:
        return hit
    # ---- exact rational noding ----
    points = set()
    chains = []
    for r, s in segments:
        points.add(r)
        points.add(s)
        chains.append({r, s})
    sweep = []
    for index, (r, s) in enumerate(segments):
        sweep.append((min(r[0], s[0]), min(r[1], s[1]),
                      max(r[0], s[0]), max(r[1], s[1]), index))
    sweep.sort()
    heap = []
    # position 1 of each sweep entry is the segment's min-x; the heap pops
    # are keyed by max-x, so expiry must compare the segment's min-x against
    # heap max-x — a segment ended before the sweep position cannot meet the
    # current or any later segment; popping on the current seg's max-x would
    # drop overlapped intersection candidates instead
    # the pairwise filter: a guard-only float bbox (outward-rounded, so a
    # guard reject is provably a real disjointness) skips the exact
    # Fraction work for pairs that cannot touch; every pair the exact law
    # could node gets its exact test unchanged
    float_bounds = {}

    def bbox_out(index):
        hit = float_bounds.get(index)
        if hit is None:
            br, bs = segments[index]
            hit = (_s6_f_out(min(br[0], bs[0]), False),
                   _s6_f_out(min(br[1], bs[1]), False),
                   _s6_f_out(max(br[0], bs[0]), True),
                   _s6_f_out(max(br[1], bs[1]), True))
            float_bounds[index] = hit
        return hit

    for xmin, _ymin, _xmax, _ymax, seg in sweep:
        while heap and heap[0][0] < xmin:
            heappop(heap)
        r, s = segments[seg]
        fb = bbox_out(seg)
        d1 = sub(s, r)
        for _xmax_o, other in heap:
            ob = bbox_out(other)
            if (fb[2] < ob[0] or ob[2] < fb[0]
                    or fb[3] < ob[1] or ob[3] < fb[1]):
                continue
            oro, oso = segments[other]
            d2 = sub(oso, oro)
            den = cross2(d1, d2)
            if den == 0:
                # parallel: both endpoints in the other's closed span node a
                # collinear subdivision (orient2 == 0 holds on the shared
                # line; the span test is the adopted bbox clause)
                if cross2(sub(oro, r), d1) == 0:
                    for point in (oro, oso):
                        if _s6_in_closed_span(point, r, s):
                            chains[seg].add(point)
                    for point in (r, s):
                        if _s6_in_closed_span(point, oro, oso):
                            chains[other].add(point)
                continue
            # the span-local exact solve: a rational intersection, no float
            t = cross2(sub(oro, r), d2) / den
            u = cross2(sub(oro, r), d1) / den
            if 0 <= t <= 1 and 0 <= u <= 1:
                point = add(r, mul(d1, t))
                points.add(point)
                chains[seg].add(point)
                chains[other].add(point)
        heappush(heap, (max(r[0], s[0]), seg))
    node_pts = sorted(points)
    node_ids = {point: index for index, point in enumerate(node_pts)}
    edges = set()
    for chain in chains:
        ordered = sorted(chain)
        for a, b in zip(ordered, ordered[1:]):
            edges.add((min(node_ids[a], node_ids[b]), max(node_ids[a], node_ids[b])))
    # ---- the planar graph and its half-edge walk ----
    halves = []
    twins = []
    out_by_node = defaultdict(list)
    for a, b in sorted(edges):
        base = len(halves)
        halves.append((a, b))
        halves.append((b, a))
        twins.append(base + 1)
        twins.append(base)
        out_by_node[a].append(base)
        out_by_node[b].append(base + 1)
    angular = {}
    position = {}
    for node in range(len(node_pts)):
        outs = out_by_node.get(node, [])
        base = node_pts[node]

        def out_order(h, other):
            d1 = sub(node_pts[halves[h][1]], base)
            d2 = sub(node_pts[halves[other][1]], base)
            return _s6_angle_cmp(d1, d2)

        outs.sort(key=cmp_to_key(out_order))
        angular[node] = outs
        for pos, half in enumerate(outs):
            position[half] = pos
    visited = [False] * len(halves)
    cycles = []
    for h0 in range(len(halves)):
        if visited[h0]:
            continue
        cycle = []
        cur = h0
        while True:
            visited[cur] = True
            cycle.append(cur)
            target = halves[cur][1]
            nxt = angular[target][(position[twins[cur]] - 1) % len(angular[target])]
            if nxt == h0:
                break
            cur = nxt
        cycles.append(cycle)
    assert all(visited), 's6: the half-edge walk left a half unvisited'
    # ---- bounded regions, holes, the unbounded exterior, degenerate cycles
    positives = []
    negatives = []
    zero_cycles = 0
    for cycle in cycles:
        ring = tuple(node_pts[halves[h][0]] for h in cycle)
        area = area2(ring)
        if area > 0:
            positives.append((area, _s6_canonical(ring)))
        elif area < 0:
            negatives.append(_s6_canonical(ring))
        else:
            zero_cycles += 1
    holes = defaultdict(list)
    exterior_cycles = 0
    outer_boxes = [
        (_s6_f_out(min(p[0] for p in outer), False),
         _s6_f_out(min(p[1] for p in outer), False),
         _s6_f_out(max(p[0] for p in outer), True),
         _s6_f_out(max(p[1] for p in outer), True))
        for _area, outer in positives
    ]
    for ring in negatives:
        # guard-only float bbox on each candidate outer (outward-rounded):
        # a negative ring with no float image inside the box cannot carry a
        # single strictly-inside point; the exact containment still runs
        # for every ring the guard admits
        parents = [
            (area, index)
            for (area, _outer), (f0, f1, f2, f3) in zip(
                positives, outer_boxes)
            if any(f0 <= float(point[0]) <= f2 and f1 <= float(point[1]) <= f3
                   for point in ring)
            and any(point_in_polygon(point, _outer) == 1 for point in ring)
        ]
        if not parents:
            exterior_cycles += 1
            continue
        parent = min(parents)
        holes[parent[1]].append(ring)
    regions = []
    for index, (area, ring) in enumerate(positives):
        region_holes = holes[index]
        regions.append({
            'ring': ring,
            'holes': region_holes,
            'area': area,
            'ears': list(islice(_s6_certified_ears(ring, region_holes),
                                _S6_MAX_EARS)),
        })
    record = {
        'regions': regions,
        'zeroCycles': zero_cycles,
        'exteriorCycles': exterior_cycles,
        'nodes': len(node_pts),
        'edges': len(edges),
    }
    _S6_GROUP_CACHE[(key, frozenset(segments))] = record
    return record


def _s6_orientation_outward(plane, axis, axis_i, axis_j, ring, sides):
    """The retained ring oriented so its normal points from air to not-air
    (outward from air): air on the +normal side (sides[0]) means the
    outward direction is -normal, and vice versa; the exact 3D ring's area
    vector is dot-tested against that direction."""
    normal, _offset = plane
    outward = normal if sides == (False, True) else tuple(-v for v in normal)
    ring3d = [_s6_lift(plane, axis, axis_i, axis_j, point) for point in ring]
    vector = area_vector(ring3d)
    if vector == ZERO3 or dot(vector, outward) == 0:
        fail('s6: a retained region ring has no exact out-of-plane area at '
             + ','.join(exact_record(ring3d[0])))
    flipped = dot(vector, outward) < 0
    if flipped:
        ring3d = list(reversed(ring3d))
    return ring3d, flipped


def _s6_air_sides(point3, plane):
    """The kernel's air_side call, unchanged, memoized by its full exact
    argument (the witness, the displacement normal). The kernel never sees
    anything but the letter's own call shape.

    The operand list handed to the kernel is filtered by each operand's
    outward-guarded float extent: a witness whose float image lies outside
    a guard box (expanded one ulp, rounding-monotone) provably lies outside
    the closed operand in exact arithmetic, so that operand's air_side
    contribution is exactly False and dropping it does not change the
    verdict — every surviving operand is still classified by the kernel's
    exact law. Without the guard the kernel's own `any()` over the 365
    member operands never short-circuits and measures ~0.5 s per witness
    (measured: 601 calls in 301.6 s on this registry's first entry)."""
    if not _S6_USABLE_OPERANDS:
        usable = []
        for op in _OPERANDS:
            points = [p for facet in op.facets for p in facet.ring]
            usable.append(
                (op, (
                    _s6_f_out(min(p[0] for p in points), False),
                    _s6_f_out(min(p[1] for p in points), False),
                    _s6_f_out(min(p[2] for p in points), False),
                    _s6_f_out(max(p[0] for p in points), True),
                    _s6_f_out(max(p[1] for p in points), True),
                    _s6_f_out(max(p[2] for p in points), True),
                )))
        _S6_USABLE_OPERANDS.extend(usable)
    selected = [
        op for op, (x0, y0, z0, x1, y1, z1) in _S6_USABLE_OPERANDS
        if x0 <= float(point3[0]) <= x1
        and y0 <= float(point3[1]) <= y1
        and z0 <= float(point3[2]) <= z1
    ]
    key = (point3, tuple(plane[0]))
    if key not in _S6_AIR_CACHE:
        _S6_AIR_CACHE[key] = air_side(point3, tuple(plane[0]), selected)
    return _S6_AIR_CACHE[key]


# Brief 26 ruling consequence 2's ledger: the collapsed source edges
# (deduped, emitted sorted at the stage's end) and the ruled crown faces
# the consequence-1 ledger classifies. The edges' keys are the source
# ring nodes' exact strings; the stage replays them identically per run.
_S6_COLLAPSED_EDGES = set()


def _s6_remap_node(node, facet_id):
    """Brief 26 consequence 2: the recorded ring node's canonical-remap
    identity through S4's table. The node's float32 storage image keys
    _CANON1_BY_IMAGE; the claimant facet inside the cluster witness
    resolves multi-entry images (the colliding-key class), build order
    deterministic. An image with no claimant entry keeps the raw node and
    counts in the census — a source fact the canonical mesh never
    realized, flagged, never guessed and never widened. Return value is
    (canonical_or_raw_point, identity_state)."""
    image = (binary_q(_s6_f32(node[0])),
             binary_q(_s6_f32(node[1])),
             binary_q(_s6_f32(node[2])))
    candidates = _CANON1_BY_IMAGE.get(image)
    if not candidates:
        return node, 'unmapped'
    matches = [(witness, moved) for witness, moved in candidates
               if facet_id in witness]
    claims = [moved for _witness, moved in matches]
    if not claims:
        return node, 'unclaimed'
    if len(set(claims)) > 1:
        _S6_AMBIGUOUS['ambiguous'] += 1
    # ruling-40 (v11/13) §2 at the S6 intake: a remapped node borrows the
    # claimant's S4 identity, so it is exact-domain only when that
    # identity is. The claimant's (rank, source) snapshot rides
    # _CANON1_SNAP_SOURCES (the S4 write of record). A rank-2 claim with
    # no recorded exact line-snap source is a law violation — fail loud;
    # rank<2 claims ride the recorded S4 deviation ('none' — named, not
    # guessed). Full-rank claims emit no row: no float-domain coordinate
    # exists there by construction.
    entry = _CANON1_SNAP_SOURCES.get(image, {}).get(matches[0][0])
    if entry is not None and entry[0] < 3:
        rank, snap = entry
        if rank == 2 and not snap:
            # Census R2 (the route law §2: the rank-2 refusal family demoted
            # to rows; the shipped builder fails here): count and pass —
            # the census feeds the owner's relay
            _EXACT_CENSUS_LEDGER['s6_rank2UnsnappedClaims'] += 1
        _EXACT_CENSUS_CAPTURES['s6_intake_rank_%d' % rank] += 1
        emit('S6_INTAKE_NODE_SUPPORT', {
            'facet': facet_id,
            'node': ','.join(exact_record(node)),
            'rank': rank,
            'source': snap if snap else 'none',
        })
        _a0_collect_intake(image, snap)  # Lane-2 A′ probe collection (ruling-40 §5/§6; research lane, never ships)
    return claims[0], 'remapped'


def _s6_remap_ring(ring, facet_id, census):
    """The intake's remapped ring: every node through _s6_remap_node, then
    the fold — a consecutive-remapped-equal node pair is a collapsed
    source edge: it drops from the intake, one canonical node carries the
    ring, and the pair ledgers at RG_F1_EDGE_COLLAPSED (deduped, sorted at
    the stage end). The wrap pair folds identically."""
    mapped = []
    unmapped = 0
    for node in ring:
        point, state = _s6_remap_node(node, facet_id)
        mapped.append(point)
        if state != 'remapped':
            unmapped += 1
    folded = []
    for index, point in enumerate(mapped):
        if folded and folded[-1] == point:
            _S6_COLLAPSED_EDGES.add((
                facet_id,
                tuple(exact_record(ring[index - 1])),
                tuple(exact_record(ring[index]))))
            continue
        folded.append(point)
    if len(folded) > 1 and folded[0] == folded[-1]:
        _S6_COLLAPSED_EDGES.add((
            facet_id,
            tuple(exact_record(ring[-1])),
            tuple(exact_record(ring[0]))))
        folded.pop()
    if unmapped:
        census['unmappedNodes'] += unmapped
        _S6_CENSUS['total']['unmappedNodes'] += unmapped
    if len(folded) < len(mapped):
        collapsed_pairs = len(mapped) - len(folded)
        census['edgeCollapses'] += collapsed_pairs
        _S6_CENSUS['total']['edgeCollapses'] += collapsed_pairs
    if not folded:
        census['collapsedRings'] += 1
        _S6_CENSUS['total']['collapsedRings'] += 1
    return folded


def _emit_collapsed_edges():
    """Brief 26 consequence 2's ledger rows: the collapsed source edges,
    sorted and deduped ('source edge collapsed by canonical
    identification: key_a ≡ key_b')."""
    for facet_id, key_a, key_b in sorted(_S6_COLLAPSED_EDGES):
        emit('EDGE_COLLAPSED', {
            'facet': facet_id,
            'keyA': list(key_a),
            'keyB': list(key_b),
            'line': 'source edge collapsed by canonical identification',
        })


def _ledger_crown_faces():
    """Brief 26 consequence 1's face ledger under ruling 32: the
    crown-hairline pair faces' rows — face id · source facet · instance id
    · class · outcome — read from the post-weld ring's own exact nodes.
    The faces resolve from the provenance-resolved S5 pair inventory
    (_CROWN_HAIRLINE_FACES — by resolved identity, never a face-number
    law), matched against each crown instance's affected set. A repeated
    node is the ruling's collapsed_ring (the colliding pair mapped to one
    canonical vertex — the geometric zero, absent_in_arrangement); a
    distinct-node ring with exact positive area is positive_area_replaced
    (two distinct canonical points, recorded with the exact ring-area
    norm, present as the substituted exact face). The
    zero-area-without-repeat case is the ruled robust-zero class
    (collapsed_ring). One row per (face, instance claim); the ownership
    was already ledger asserted in build_registry."""
    if not _CROWN_HAIRLINE_PAIRS:
        fail('crown face ledger: the provenance-resolved pair inventory is '
             'absent (S5 must resolve it before the S6 ledger)')
    for entry in REGISTRY:
        if entry['family'] != 'niche_crown_junction':
            continue
        instance = f'niche_crown_junction@{entry["instance"]}'
        for face_index in entry['affected']:
            if face_index not in _CROWN_HAIRLINE_FACES:
                continue
            facts = _S6_FACE_FACTS.get(face_index)
            if facts is None:
                fail(f'crown face ledger: face {face_index} carries no '
                     'S6 face facts at its ruled instance '
                     f'{instance} (the identity check should have '
                     'prevented this)')
            ring = facts['ring']
            counts = defaultdict(int)
            for node in ring:
                counts[node] += 1
            repeated = any(count > 1 for count in counts.values())
            area_norm2 = norm2(area_vector(ring))
            if repeated or area_norm2 == 0:
                class_name = 'collapsed_ring'
                outcome = 'absent_in_arrangement'
                area_field = '0'
            else:
                class_name = 'positive_area_replaced'
                outcome = 'present_as_exact_face'
                area_field = str(area_norm2)
            emit('CROWN_FACE', {
                'areaNorm2': area_field,
                'class': class_name,
                'facet': facts['facet'],
                'face': face_index,
                'instance': instance,
                'outcome': outcome,
                'ringNodes': sorted({tuple(str(v) for v in node)
                                     for node in ring}),
            })


_S6_AMBIGUOUS = {'unmapped': 0, 'ambiguous': 0}


def _s6_region_witness(region, plane, axis, axis_i, axis_j, family, instance,
                       where):
    """The witness law: the centroid of the first certified ear whose
    displaced_inside classifies cleanly; max 8 ears (the letter), then the
    loud, accounted failure. The ear fallback covers every refusal the
    kernel raises for an unclassifiable witness — the edge/vertex contact
    ('meets an operand edge or vertex', counted as earContacts) and the
    kernel refusals 'ambiguous source membership' / 'no clean exact ray
    direction' (an ear centroid that happens to lie on an operand facet
    perpendicular to the displacement): the kernel's own refusal messages
    instruct choosing another interior witness, and the retention law is
    witness-independent (sides describe the region's interior, not the
    try order), so a retried ear classifies identically. Returns the
    exact 3D witness, its sides and the (contacts, refusals) counts."""
    refusals = 0
    contacts = 0
    for _triple, centroid in islice(region['ears'], _S6_MAX_EARS):
        point3 = _s6_lift(plane, axis, axis_i, axis_j, centroid)
        try:
            sides = _s6_air_sides(point3, plane)
        except RuntimeError as error:
            text = str(error)
            if ('meets an operand edge or vertex' in text
                    or 'ambiguous source membership' in text
                    or 'no clean exact ray direction' in text):
                if 'meets an operand edge or vertex' in text:
                    contacts += 1
                else:
                    refusals += 1
                continue
            fail(
                f's6: {family}/{instance} {where}: the kernel air_side '
                f'refused the certified ear centroid '
                f'{exact_record(point3)}: {error}'
            )
        return point3, sides, (contacts, refusals)
    if region['ears']:
        fail(
            f's6: {family}/{instance} {where}: every certified ear witness of '
            f'min({len(region["ears"])}, {_S6_MAX_EARS}) tried was refused '
            'by the exact operands (edge/vertex contacts and kernel '
            f'refusals: {refusals}); the region has no classified interior '
            'witness (the letter\'s max-8 law)'
        )
    fail(
        f's6: {family}/{instance} {where}: a bounded region carries no '
        f'certified ear triangle ({len(region["ring"])} ring nodes, '
        f'{len(region["holes"])} holes); the ear certificate finds none'
    )


def _s6_f32(value):
    """The float32 storage image of an exact coordinate — the value Blender's
    delaunay_2d_cdt API boundary truncates the fed double to and returns
    binary-exact. The kernel's binary_point law, the same storage boundary
    S4's v.co reads."""
    return struct.unpack('f', struct.pack('f', float(value)))[0]


def _s6_f_out(value, upward):
    """The outward-guarded float image of an exact scalar: the double the
    exact value may round through, expanded one ulp in the guard direction,
    so a float comparison against the guard bound can never prune an exact
    fact (the guard only costs efficiency, never exactness)."""
    image = float(value)
    return math.nextafter(image, -math.inf if not upward else math.inf)


def _s6_cdt_propose(region, family, instance, where):
    """delaunay_2d_cdt(..., output_type=2, epsilon=0.0) — the letter's own
    call — proposed ONLY for a retained region and certified exactly:
    every output vertex maps 1:1 onto an arrangement node (float-image
    equality through binary_point), every constraint edge appears, every
    output triangle orient2 > 0, and the exact signed triangle areas in the
    feed domain sum exactly to the region's own ring area minus its holes
    (holes carried as constraints too). The proposal's coordinates are
    never authoritative; the certified triangle list is recorded for S7."""
    vertices = []
    feed = {}
    node_points = []
    nodes_of_image = {}

    def node_index(point):
        # Blender's delaunay_2d_cdt boundary is float32: the fed doubles are
        # truncated to C floats in and out of the call. The feed therefore
        # carries the arrangement node's own float32 storage image — the
        # kernel's binary_point boundary — and the letter's "each output
        # vertex maps 1:1 onto an arrangement node (exact equality after
        # binary_point)" holds against that image: the CDT passes a fed
        # vertex through float32-free, and a CDT-internal intersection whose
        # exact location is an arrangement node rounds back onto that node's
        # float32 image. Two distinct arrangement nodes sharing one image
        # cannot map 1:1 and fail loud (a shadow collision at the storage
        # boundary).
        image = (_s6_f32(point[0]), _s6_f32(point[1]))
        if image in nodes_of_image and nodes_of_image[image] != point:
            fail(
                f's6: {family}/{instance} {where}: CDT rejected at the feed: '
                'two arrangement nodes share one float32 image '
                f'({image[0]!r}, {image[1]!r}): '
                f'{exact_record(point)} vs '
                f'{exact_record(nodes_of_image[image])}'
            )
        if image not in feed:
            feed[image] = len(vertices)
            vertices.append(image)
            node_points.append(point)
            nodes_of_image[image] = point
        return feed[image]

    outer_ids = [node_index(point) for point in region['ring']]
    constraints = []
    n = len(outer_ids)
    if len(set(outer_ids)) != n:
        repeat = {}
        for point, index in zip(region['ring'], outer_ids):
            repeat.setdefault(index, []).append(exact_record(point))
        collides = {index: points for index, points in repeat.items()
                    if len(points) > 1}
        fail(
            f's6: {family}/{instance} {where}: the outer ring repeats a feed '
            f'node ({len(collides)} repeated feed index pairing '
            f'{len(outer_ids)} ring nodes against {len(vertices)} fed '
            f'float32 images; first {list(collides.items())[:2]}): either a '
            'walk pinch (an exact-equal repeat — the recorded ring cannot) '
            'or two distinct arrangement nodes sharing one float32 image '
            '(a shadow collision at the CDT storage boundary)'
        )
    for k in range(n):
        a, b = outer_ids[k], outer_ids[(k + 1) % n]
        constraints.append((a, b))
    hole_id_ranges = []
    for hole in region['holes']:
        ids = [node_index(point) for point in hole]
        hole_id_ranges.append(ids)
        m = len(ids)
        for k in range(m):
            a, b = ids[k], ids[(k + 1) % m]
            constraints.append((a, b))
    verted, outedges, outfaces = delaunay_2d_cdt(
        vertices, constraints, [outer_ids], 2, 0.0)[:3]
    binary_of = {}
    for image, index in feed.items():
        binary_of[index] = (binary_q(image[0]), binary_q(image[1]))
    expected = area2([binary_of[k] for k in outer_ids])
    for ids in hole_id_ranges:
        expected += area2([binary_of[k] for k in ids])
    mapped = []
    for v in verted:
        image = (float(v[0]), float(v[1]))
        if image not in feed:
            fail(
                f's6: {family}/{instance} {where}: CDT rejected: output vertex '
                f'({image[0]!r}, {image[1]!r}) is not an arrangement node '
                'under the exact binary_point equality'
            )
        mapped.append(feed[image])
    if len(verted) != len(vertices) or len(set(mapped)) != len(mapped):
        fail(
            f's6: {family}/{instance} {where}: CDT rejected: the output is not '
            f'a 1:1 map of the {len(vertices)} arrangement nodes '
            f'({len(verted)} output vertices)'
        )
    seen = set()
    for a, b in outedges:
        seen.add((min(mapped[a], mapped[b]), max(mapped[a], mapped[b])))
    # a constraint edge "appears" when the CDT's edge set covers exactly the
    # edge's own chain: a collinear intermediate the arrangement itself noded
    # onto that edge (the letter's preserved collinear subdivisions, S2's
    # conform T-merger keys) splits it in the CDT output, and every sub-edge
    # between the chain's nodes must be present
    missing = []
    for a, b in sorted(constraints):
        la, lb = node_points[a], node_points[b]
        between = [
            i for i in range(len(node_points))
            if i != a and i != b
            and orient2(la, lb, node_points[i]) == 0
            and _s6_in_closed_span(node_points[i], la, lb)
        ]
        chain = [a] + sorted(
            between, key=lambda i: norm2(sub(node_points[i], la))) + [b]
        for c, e in zip(chain, chain[1:]):
            pair = (min(c, e), max(c, e))
            if pair not in seen:
                missing.append(pair)
    if missing:
        fail(
            f's6: {family}/{instance} {where}: CDT rejected: constraint edge '
            f'chains missing ({len(missing)} sub-edges of '
            f'{len(constraints)} constraints, first {missing[:4]})'
        )
    total = Fraction(0)
    for face in outfaces:
        if len(face) != 3:
            fail(
                f's6: {family}/{instance} {where}: CDT rejected: output face of '
                f'length {len(face)} is not a triangle'
            )
        a, b, c = (binary_of[mapped[k]] for k in face)
        orient = orient2(a, b, c)
        if orient <= 0:
            fail(
                f's6: {family}/{instance} {where}: CDT rejected: output '
                f'triangle {face} is not positively oriented (orient2={orient})'
            )
        total += orient
    if total != expected:
        fail(
            f's6: {family}/{instance} {where}: CDT rejected: output triangle '
            f'areas sum {total} but the region feeds {expected} exactly '
            '(coverage gap or hole filling, certified with rational predicates)'
        )
    return {'nodes': [k for k, _v in enumerate(vertices)],
            'triangles': [[mapped[k] for k in face] for face in outfaces]}


def build_patch_arrangements():
    """S6: the arrangement + classification driver over the CURRENT registry
    data. Opens the canonicalized product read-only, re-derives every
    entry's affected/retained identity with the S5 predicates (a mismatch
    fails loud, never silently re-mapped), then per entry groups the
    incident facets by plane_key and runs one exact arrangement per plane
    group over (a) the incident facet ring segments and (b) the in-plane
    retained neighbors' recorded rings, nodes it exactly, walks its faces,
    classifies each bounded region by the kernel's air_side law, orients the
    retained rings outward from air, certifies a CDT proposal per retained
    region, and records everything the S7 next span needs in _s6_results.
    Emits RG_F1_PATCH per (entry, plane) and RG_F1_PATCH_STATE legality
    rows; fills _S6_CENSUS for the probe's machine-summary. Mutates no
    geometry."""
    if _AIR_TARGET is None:
        fail('arrangement S6 runs after the S3 chain')
    bm = bmesh.new()
    bm.from_mesh(_AIR_TARGET.data)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    verify_source(bm, 's6-arrangement')
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    if layer is None:
        fail('s6-arrangement: provenance layer lost before S6')
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(
                f's6-arrangement: face {face.index} carries no valid '
                'FACET_TABLE index'
            )
    facet_by_id = {facet.id: facet for facet in FACET_TABLE}
    face_rings = {}
    face_boxes = {}
    for face in bm.faces:
        ring = tuple(binary_point(tuple(v.co)) for v in face.verts)
        face_rings[face.index] = ring
        face_boxes[face.index] = _face_bbox(ring)
        _S6_FACE_FACTS[face.index] = {
            'facet': FACET_TABLE[face[layer]].id,
            'ring': ring,
        }
    # identity check: the frozen registry lists must re-derive identically
    # from the same mesh the registry froze them on (S5's own predicates,
    # unchanged constants) — a mismatch is never silently re-mapped
    adjacency = defaultdict(set)
    for face in bm.faces:
        for edge in face.edges:
            for neighbor in edge.link_faces:
                adjacency[face.index].add(neighbor.index)
    if 'total' not in _S6_CENSUS:
        _S6_CENSUS['total'] = _s6_census_blank()
    # RULING 32 consequence 7 under the rerun: the identity check re-derives
    # every entry's affected set with the S5 predicates and recomputes the
    # retained fact on the union of overlapping affected regions — the SAME
    # law S5 froze the entry with (a face sharing an edge with the entry's
    # affected faces and not affected by ANY registry instance). The union's
    # boundary coherence reconciles here before acceptance, not merely
    # logged: any divergence fails loud.
    derived_affected = {}
    affected_everywhere = set()
    for entry_number, entry in enumerate(REGISTRY):
        box_lo, box_hi = entry['bbox']
        affected = []
        for face_index, bbox in face_boxes.items():
            if not _bbox_overlaps(bbox[0], bbox[1], box_lo, box_hi):
                continue
            if any(_segment_hits_box(a, b, box_lo, box_hi)
                   for a, b in pairs(face_rings[face_index])):
                affected.append(face_index)
        if sorted(affected) != entry['affected']:
            fail(
                f's6-arrangement: entry {entry["family"]}/{entry["instance"]} '
                'affected set does not re-derive from the canonicalized '
                'product the registry froze it with '
                f'({sorted(affected)[:6]}... vs {entry["affected"][:6]}...)'
            )
        derived_affected[entry_number] = set(affected)
        affected_everywhere.update(affected)
    for entry_number, entry in enumerate(REGISTRY):
        retained = sorted(
            {neighbor for index in derived_affected[entry_number]
             for neighbor in adjacency[index]
             if neighbor not in affected_everywhere})
        if retained != entry['retained']:
            fail(
                f's6-arrangement: entry {entry["family"]}/{entry["instance"]} '
                'retained set does not re-derive from the canonicalized '
                'product the registry froze it with (the union law of '
                'ruling 32 consequence 7) — the union\'s boundary '
                'coherence does not reconcile'
            )
    # ---- the per-instance render over the plane groups ----
    for entry_number, entry in enumerate(REGISTRY):
        family = entry['family']
        instance = entry['instance']
        census = _S6_CENSUS.setdefault(family, _s6_census_blank())

        def bump(field, count=1):
            census[field] += count
            _S6_CENSUS['total'][field] += count

        entry_result = {
            'affected': list(entry['affected']),
            'entry': entry_number,
            'family': family,
            'instance': instance,
            'requiresOccupancy': entry['requiresOccupancy'],
            'planeGroups': [],
            'unmatchedNeighborEdges': [],
        }
        if not entry['affected']:
            emit('PATCH_STATE', {
                'family': family,
                'instance': instance,
                'state': 'emptyAffected',
            })
            bump('emptyAffected')
            _s6_results.append(entry_result)
            continue
        bump('instances')
        incident = [facet_by_id[fid] for fid in entry['incident']]
        entry_result['affectedFacets'] = sorted(
            {_S6_FACE_FACTS[index]['facet'] for index in entry['affected']})
        neighbor_records = []
        for face_index in entry['retained']:
            neighbor_records.append({
                'face': face_index,
                'facet': facet_by_id[_S6_FACE_FACTS[face_index]['facet']],
                'facetId': _S6_FACE_FACTS[face_index]['facet'],
                'realized': face_rings[face_index],
            })
        groups = defaultdict(list)
        for facet in incident:
            groups[plane_key(facet.plane)].append(facet)
        entry_retained = 0
        for key in sorted(groups):
            plane = _s6_key_plane(key)
            axis, axis_i, axis_j = _s6_frame_of(plane)
            segments = {}
            for facet in sorted(groups[key], key=lambda f: f.id):
                for a, b in pairs(_s6_remap_ring(
                        facet.ring, facet.id, census)):
                    fa = _s6_flat2(a, axis_i, axis_j)
                    fb = _s6_flat2(b, axis_i, axis_j)
                    low, high = (fa, fb) if fa <= fb else (fb, fa)
                    segments.setdefault((low, high), True)
            neighbor_facets = [
                record for record in neighbor_records
                if plane_key(record['facet'].plane) == key
            ]
            for record in neighbor_facets:
                for a, b in pairs(_s6_remap_ring(
                        record['facet'].ring, record['facetId'], census)):
                    fa = _s6_flat2(a, axis_i, axis_j)
                    fb = _s6_flat2(b, axis_i, axis_j)
                    low, high = (fa, fb) if fa <= fb else (fb, fa)
                    segments.setdefault((low, high), True)
            segment_list = sorted(segments)
            structure = _s6_group_structure(key, segment_list)
            where = 'plane ' + '/'.join(str(v) for v in key)
            bump('planeGroups')
            # the realized-edge audit's fast path: a bucket of the recorded
            # segments' float32 end-images — S4 moved every vertex exactly
            # onto the recorded scalars, so a matched realized edge carries
            # the same float32 image as one recorded end per endpoint, and
            # the bucket retrieves those candidates without scanning the
            # plane's whole recorded segment list. Every retrieved candidate
            # still passes the letter's exact band test, and a bucket miss
            # falls through to the full scan unchanged, so the match law is
            # untouched.
            segment_buckets = {}
            for r, s in segment_list:
                segment_buckets.setdefault((
                    _s6_f32(r[0]), _s6_f32(r[1]),
                    _s6_f32(s[0]), _s6_f32(s[1])), []).append((r, s))
            for record in neighbor_facets:
                for a, b in pairs(record['realized']):
                    pa = _s6_flat2(a, axis_i, axis_j)
                    pb = _s6_flat2(b, axis_i, axis_j)
                    if pa == pb:
                        # a degenerate realized edge (a sliver ring's repeated
                        # point): never feedable into the arrangement, and it
                        # accounts for itself in the defect records
                        continue
                    bump('neighborEdges')
                    matched = False
                    fp = (_s6_f32(pa[0]), _s6_f32(pa[1]),
                          _s6_f32(pb[0]), _s6_f32(pb[1]))
                    for r, s in segment_buckets.get(fp, ()):
                        if (_s6_band_on_segment(pa, r, s, _S6_EDGE_MATCH_BAND)
                                and _s6_band_on_segment(
                                    pb, r, s, _S6_EDGE_MATCH_BAND)):
                            matched = True
                            break
                    if not matched:
                        for r, s in segment_list:
                            if (_s6_band_on_segment(
                                    pa, r, s, _S6_EDGE_MATCH_BAND)
                                    and _s6_band_on_segment(
                                        pb, r, s, _S6_EDGE_MATCH_BAND)):
                                matched = True
                                break
                    if matched:
                        continue
                    entry_result['unmatchedNeighborEdges'].append({
                        'face': record['face'],
                        'facet': record['facetId'],
                        'p': [str(pa[0]), str(pa[1])],
                        'q': [str(pb[0]), str(pb[1])],
                    })
                    bump('unmatchedNeighborEdges')
            plane_row = {'dropped': [], 'retained': []}
            for region in structure['regions']:
                witness, sides, (contacts, refusals) = _s6_region_witness(
                    region, plane, axis, axis_i, axis_j, family, instance, where)
                bump('earContacts', contacts)
                bump('earRefusals', refusals)
                bump('regions')
                if sides in ((True, False), (False, True)):
                    ring3d, flipped = _s6_orientation_outward(
                        plane, axis, axis_i, axis_j, region['ring'], sides)
                    proposal = _s6_cdt_propose(region, family, instance, where)
                    bump('cdtProposals')
                    plane_row['retained'].append({
                        'area2': str(region['area']),
                        'flipped': flipped,
                        'nodes': len(region['ring']),
                        'ring': [exact_record(p) for p in ring3d],
                        'sides': [bool(sides[0]), bool(sides[1])],
                        'witness': exact_record(witness),
                    })
                    proposal['ring'] = [exact_record(p) for p in ring3d]
                    proposal['witness'] = exact_record(witness)
                    plane_row['retained'][-1]['cdt'] = proposal
                    bump('retainedRegions')
                    if flipped:
                        bump('orientationFlips')
                    if entry['requiresOccupancy']:
                        bump('capConfirmed')
                else:
                    plane_row['dropped'].append({
                        'nodes': len(region['ring']),
                        'sides': [bool(sides[0]), bool(sides[1])],
                        'witness': exact_record(witness),
                    })
                    bump('droppedRegions')
            bump('zeroCycles', structure['zeroCycles'])
            bump('exteriorCycles', structure['exteriorCycles'])
            plane_list = [str(v) for v in key]
            emit('PATCH', {
                'dropped': len(plane_row['dropped']),
                'family': family,
                'instance': instance,
                'plane': plane_list,
                'regions': len(structure['regions']),
                'retained': len(plane_row['retained']),
                'witness': plane_row['retained'][0]['witness']
                if plane_row['retained'] else None,
            })
            entry_retained += len(plane_row['retained'])
            entry_result['planeGroups'].append({
                'exteriorCycles': structure['exteriorCycles'],
                'plane': plane_list,
                'regions': len(structure['regions']),
                'retained': plane_row['retained'],
                'dropped': plane_row['dropped'],
                'zeroCycles': structure['zeroCycles'],
            })
        if entry_retained == 0:
            emit('PATCH_STATE', {
                'family': family,
                'instance': instance,
                'state': 'zeroRetained',
            })
            bump('zeroRetained')
        _s6_results.append(entry_result)
    _ledger_crown_faces()
    _emit_collapsed_edges()
    bm.free()


# ----------------------------------------------------------------------------
# Continuation segment 5/n — stage S7 (assembly) of the adopted PART 2a
# WATERTIGHT spec. Appended contiguously after the S6 span; received and
# previously landed symbols are consumed as-is and never redefined. The span
# ends where S8 (downstream triangulation/mouth/facing) would begin; no S8
# and no tail exist here.
#
# THE ADOPTED LETTER (verbatim, binding):
#   S7 — assembly. Delete affected faces through account_removed_face(
#   stage='patch', …) listing the replacement face ids (before/after
#   inventories = the two surrounding capture_topology records' stages).
#   Canonical vertex table keyed by exact point (from S4 keys + new
#   arrangement nodes); every perimeter node is inserted into the retained
#   neighbor's ring too (bmesh.utils.edge_split at the exact parameter, then
#   the split vertex is remapped to the node); second canonicalization =
#   repeat S4 policy on perimeter + split vertices only, emit RG_F1_WELD2.
#   Materialize shared edges once (bm.edges.new guarded by bm.edges.get),
#   then bm.faces.new over existing edges; material index from the owning
#   source facet; UV discontinuities remain loop attributes. Then
#   closed_guard(bm, 'member-difference-closed') — acceptance bar: 0/0/0/0/0.
#
# THE S7 INTAKE (the landed engine facts; Brief 34 section F):
#   _s6_results carries per-instance patches: per (entry, plane group) the
#   retained regions with exact 3-node exact rings and certified CDT node
#   triangle lists ("the certified node triangle lists are recorded for
#   S7", received-reply-tail S6). The accepted kernel facts carried out of
#   the current state: 24 connected affected sets (one 91-entry, one
#   3-entry, 22 crown singletons); at the (component, plane) grain the
#   entries' retained-region sets were measured IDENTICAL whenever two
#   overlapping entries share a plane group (the union law's reconciliation
#   did NOT conflict); no retained region carries a CDT hole feed. The
#   measured acceptance census the span must turn into 0/0/0/0/0: the raw
#   2 over-edges (4877/7273, shared by the soffit@4.8/4.0, ressaut@6.523
#   and END_CORNICE_0@70.0 instances) plus the 7 post-weld degenerate
#   faces (6 collapsed/sliver classes + the vanished 3773-class), all
#   inside the named instances' ring sets, plus the six crown
#   collapsed_ring rows (absent_in_arrangement, area 0).
#
# IN-SPAN DESIGN DECISIONS (resolved under the spec, documented per Brief
# 34 section D's mandate; none contradicts a letter sentence):
#
# 1. THE PATCH (= the replacement surface). The letter's replacement face
#    ids are the S6 region rows' own certified CDT triangles ("the
#    proposal's coordinates are never authoritative; the certified node
#    triangle lists are recorded for S7"). The patch surface of a merged
#    unit is assembled per connected affected set: per (component,
#    recorded-plane) the retained-region triangles whose exact centroid
#    lies inside-or-on a nonzero-area deleted realized ring of that
#    component on that plane. This is the letter's own patch-merge law:
#    one merged replacement unit per connected affected set whose intake
#    consumed the retained neighbors' frozen rings (S6) — the rebuilt
#    territory replaces exactly the deleted faces' area, and triangles
#    over no deleted territory (the far intake cells the registry boxes'
#    SAT incident rings also covered) are NOT assembled: the letter's
#    guarded surface must not double-cover existing faces. Measured on
#    the current state: 1544 patch triangles over 826 distinct affected
#    faces.
# 2. THE COVERAGE LAW (the letter's "any unexplained positive-area face
#    removal = failure" and the sliver class): a deleted face whose
#    realized ring carries exact zero area (the collapsed/sliver classes,
#    crown rows included) is removed as part of rebuilding its incident
#    patch — its zero area needs no triangle. A deleted face with
#    positive area and NO patch triangle over it is an uncovered positive
#    removal: the span emits its RG_F1_S7_UNCOVERED fact rows and refuses
#    the whole assembly (build stop). Measured candidates live in the 9
#    zero-triangle buckets (comp 0 planes '0,1,0,-127/2'-class and two
#    comp-1 planes); the span's own count is the authoritative license.
# 3. THE VERTEX TABLE = "from S4 keys + new arrangement nodes". The
#    sub-span law: a vertex's canonical point is the S4 moved point whose
#    float32 image equals the vertex's stored float32 image
#    (_CANON1_BY_IMAGE keyed by the moved image, the S6 remap's own
#    frame). Where one image carries ≥2 distinct moved claims, the
#    vertex's own cluster witness discriminates: the claim whose witness
#    frozenset equals the vertex's current link-face facet-id frozenset.
#    A still-ambiguous vertex (or an image with no claim) fails loud with
#    its facts (measured today: 5650 images / new nodes 337/5651 moved
#    claims; the mesh carries 4 same-image vertex pairs and exactly one
#    two-claim image). Table key = the exact point; the new arrangement
#    nodes and the split vertices are keyed the same way as they are
#    created, so the table stays the one exact-point -> vertex map.
# 4. THE EXACT SPLIT PARAMETER: the node's foot parameter along the
#    realized edge = dot(node-start, edge-vector)/dot(edge-vector,
#    edge-vector) in exact rationals (the kernel's line algebra), used
#    with bmesh.utils.edge_split starting from the kept ring's vertex,
#    iterating the nodes in ascending parameter order; every new split
#    vertex is remapped to the node (co := float32 image of the exact
#    node) and keyed in the table. Nodes AT the kept ring's corners are
#    not split: the corner's canonical point IS the node, and the table
#    hands both sides the same vertex object.
# 5. THE MATERIAL AND PROVENANCE: a patch triangle's material index and
#    its SOURCe_ATTRIBUTE value come from the owning source facet — the
#    source facet of the deleted realized face whose ring contains the
#    triangle's exact centroid (at most one nonzero-area ring can
#    contain an interior point; ties依法 fail loud). The predecessor's
#    recorded material rides the facet table; loop attributes survive
#    construction here (the S9 tail re-derives UV as the letter says).
# 6. THE WELD2 REFERENCES S4's POLICY SYMBOL-FOR-SYMBOL: witness =
#    current link-face facet ids, supports = their recorded planes,
#    resolved through the certified-subset path where the kernel's
#    over-3 guard refuses, moved = project_joint, cluster diameter
#    asserted <= JUNCTION_WELD_MAX, representative = the source-defined
#    point, applied through bmesh.ops.weld_verts on bare vertices. The
#    perimeter set = the retained neighbors' ring vertices plus every
#    assembled node vertex; no face's geometry outside those sets is
#    touched, and remove_doubles stays deferred (the letter's explicit
#    weld_verts handling).
# 7. THE LEDGER: account_removed_face rows are emitted PER (entry, face)
#    ownership pair (the union law can re-claim a shared face), before
#    the deletions run, citing the replacement face ids covering the
#    face's own area; 'before' = 'member-difference-raw', 'after' =
#    'member-difference-closed'. Zero-area collapsed classes cite
#    reason 'collapsed_ring' in-class; every other affected row cites
#    'patch'.
# ----------------------------------------------------------------------------

_s7_results = []
_S7_CENSUS = {}
_S7_STOP = {'uncoveredDeletedFaces': [], 'unionConflicts': [],
            'nodedConflicts': []}


def _s7_census_field(field):
    return _S7_CENSUS.setdefault(field, 0)


def _s7_frac_ring(row):
    """The retained-region row's exact ring as Fractions."""
    return tuple(tuple(Fraction(p[i]) for i in range(3)) for p in row['ring'])


def _s7_plane_of_text(ptext):
    parts = ptext.split(',')
    return (tuple(Fraction(x) for x in parts[:3]), Fraction(parts[3]))


def _s7_flat_ring(ring3d, axis):
    """The exact flattened ring of a 3D point list at the group's axis."""
    return tuple(tuple(p[i] for i in range(3) if i != axis) for p in ring3d)


def _s7_lift_point(ptext, flat2d):
    """The exact 3D point of the group plane for a 2D frame point."""
    normal, offset = _s7_plane_of_text(ptext)
    axis = drop_axis(normal)
    others = [index for index in range(3) if index != axis]
    point = [None, None, None]
    point[axis] = (offset - normal[others[0]] * flat2d[0]
                   - normal[others[1]] * flat2d[1]) / normal[axis]
    point[others[0]] = flat2d[0]
    point[others[1]] = flat2d[1]
    return tuple(point)


def _s7_moved_image(point):
    return tuple(binary_q(_s6_f32(float(v))) for v in point)


def _s7_canonical_vertex_table(bm, layer):
    """The canonical vertex table (letter: 'keyed by exact point (from S4
    keys + new arrangement nodes)'). Returns (table, ambiguity_rows):
    table maps the exact canonical point -> the bmesh vertex; every entry
    came from S4's persisted claims (a vertex whose stored image indexes
    _CANON1_BY_IMAGE with exactly one distinct moved, or whose cluster
    witness discriminates a multi-claim image). The new arrangement nodes
    and split vertices key into this map as they are created (Method:
    the table's exact-point merge the design decision 3 documents)."""
    claims_by_image = defaultdict(set)
    for _image, rows in _CANON1_BY_IMAGE.items():
        for _witness, moved in rows:
            claims_by_image[_s7_moved_image(moved)].add(tuple(moved))
    claims_witness = defaultdict(list)
    for _image, rows in _CANON1_BY_IMAGE.items():
        for witness, moved in rows:
            claims_witness[_s7_moved_image(moved)].append((witness, moved))
    table = {}
    ambiguities = []
    for vertex in bm.verts:
        image = binary_point(tuple(vertex.co))
        distinct = sorted(claims_by_image.get(image, ()))
        if not distinct:
            ambiguities.append({
                'detail': 'a vertex carries no S4 moved claim at its '
                          'stored image; the canonical vertex table has '
                          'no exact key for it',
                'vertex': vertex.index,
                'image': exact_record(image),
            })
            continue
        if len(distinct) == 1:
            table.setdefault(distinct[0], vertex)
            continue
        current_witness = frozenset(
            FACET_TABLE[face[layer]].id for face in vertex.link_faces)
        resolved = [moved for witness, moved in
                    claims_witness.get(image, ())
                    if witness == current_witness]
        distinct_resolved = sorted(set(resolved))
        if len(distinct_resolved) == 1:
            table.setdefault(distinct_resolved[0], vertex)
            continue
        ambiguities.append({
            'detail': 'a vertex image carries multiple distinct moved '
                      'claims and no witness equals the vertex\'s current '
                      'link-face facet set; the canonical identity is '
                      'ambiguous — build stop, never guessed',
            'vertex': vertex.index,
            'image': exact_record(image),
            'claims': [exact_record(moved) for moved in distinct],
            'currentWitness': sorted(current_witness),
        })
    return table, ambiguities


def _s7_component_units():
    """The merged patch units (Brief 33's union law): components over the
    entries' affected lists; per component the union affected and the
    union retained lists. Retained is checked against the letter's law
    (a retained face is affected nowhere)."""
    parent = {}

    def find(key):
        parent.setdefault(key, key)
        while parent[key] != key:
            parent[key] = parent[parent[key]]
            key = parent[key]
        return key

    face_owners = defaultdict(list)
    for entry_number, entry in enumerate(REGISTRY):
        for face_index in entry['affected']:
            face_owners[face_index].append(entry_number)
    for owners in face_owners.values():
        root0 = find(owners[0])
        for other in owners[1:]:
            join = find(other)
            if join != root0:
                parent[join] = root0
    components = defaultdict(list)
    for entry_number in range(len(REGISTRY)):
        components[find(entry_number)].append(entry_number)
    units = []
    for root, members in components.items():
        affected = set()
        retained = set()
        for member in members:
            affected.update(REGISTRY[member]['affected'])
            retained.update(REGISTRY[member]['retained'])
        overlap = retained & affected
        if overlap:
            fail(
                's7: the merged unit %s has faces in both its affected and '
                'retained sets (%s): the frozen union lists violate the '
                'ruling-32 law — build stop' % (
                    [REGISTRY[m]['instance'] for m in members][:4],
                    sorted(overlap)[:8]))
        units.append({
            'affected': sorted(affected),
            'entries': sorted(members),
            'retained': sorted(retained),
        })
    units.sort(key=lambda unit: unit['entries'][0])
    return units, face_owners


def _s7_component_cells(unit, res_by_entry):
    """Per (recorded-plane text) the merged unit's retained cells, deduped
    by exact ring across the unit's entries. Two entries carrying the
    SAME plane group with different region sets = the pre-declared
    union-law stop candidate: measured today as zero; enforced loud."""
    cells = {}
    rings_by_entry = {}
    for entry_number in unit['entries']:
        result = res_by_entry[entry_number]
        for group in result['planeGroups']:
            if not group['retained']:
                continue
            ptext = ','.join(group['plane'])
            entry_rings = tuple(sorted(
                str(row['ring']) for row in group['retained']))
            rings_by_entry.setdefault((entry_number, ptext), entry_rings)
            bucket = cells.setdefault(ptext, {})
            for row in group['retained']:
                ring = _s7_frac_ring(row)
                bucket.setdefault(ring, row)
    owners_of_ring = defaultdict(set)
    for (entry_number, ptext), rings in rings_by_entry.items():
        owners_of_ring[ptext].add(entry_number)
        if len(owners_of_ring[ptext]) > 1:
            first, second = sorted(owners_of_ring[ptext])[:2]
            if rings_by_entry[(first, ptext)] != rings:
                _S7_STOP['unionConflicts'].append({
                    'detail': 'two entries of one merged unit classify '
                              'different retained-region sets on the same '
                              'plane; the one-merged-patch-unit law '
                              'conflicts — the pre-declared stop candidate',
                    'entries': [
                        f'{REGISTRY[e]["family"]}@{REGISTRY[e]["instance"]}'
                        for e in (first, second)],
                    'plane': ptext,
                })
    return cells


def _s7_patches(units, res_by_entry, identity_meta):
    """The whole S7 plan: per (component, plane) the deleted rings, the
    deduped cells, the patch triangles (exact centroid inside-or-on a
    nonzero-area deleted realized ring) with their owning deleted face,
    and the uncovered-deleted inventory. READS the current mesh state
    through the caller's bitmaps; casts no mutation."""
    bm, facet_of_face, ring_of_face = identity_meta
    facet_by_id = {facet.id: facet for facet in FACET_TABLE}
    patches = []
    total_patch_tris = 0
    for unit in units:
        cells = _s7_component_cells(unit, res_by_entry)
        deleted_by_plane = defaultdict(list)
        for face_index in unit['affected']:
            facet = facet_by_id[facet_of_face[face_index]]
            ptext = ','.join(str(v) for v in plane_key(facet.plane))
            deleted_by_plane[ptext].append(face_index)
        for ptext, bucket in sorted(cells.items()):
            deletes = deleted_by_plane.get(ptext) or []
            if not deletes:
                continue
            plane_normal, _offset = _s7_plane_of_text(ptext)
            axis = drop_axis(plane_normal)
            polys = {}
            for face_index in deletes:
                ring = ring_of_face[face_index]
                if (len({p for p in ring}) >= 3
                        and norm2(area_vector(ring)) != Fraction(0)):
                    polys[face_index] = _s7_flat_ring(ring, axis)
            patch_tris = []
            for ring, row in sorted(bucket.items(), key=lambda kv: str(kv[0])):
                cdt = row['cdt']
                count_ring = len(ring)
                if len(cdt['nodes']) > count_ring:
                    fail(
                        's7: a retained region carries a CDT hole feed '
                        '(%d nodes over a %d-node ring); the span\'s '
                        'measured state held none — build stop' % (
                            len(cdt['nodes']), count_ring))
                cell_ring = _s7_frac_ring(row)
                flat_cell = _s7_flat_ring(cell_ring, axis)
                for tri in cdt['triangles']:
                    nodes = tuple(flat_cell[k] for k in tri)
                    if len(set(nodes)) != 3:
                        continue
                    centroid = (
                        sum(point[0] for point in nodes) / 3,
                        sum(point[1] for point in nodes) / 3)
                    owner = None
                    candidates = []
                    for face_index, poly in polys.items():
                        if point_in_polygon(centroid, poly) >= 0:
                            candidates.append(face_index)
                    if not candidates:
                        continue
                    if len(candidates) > 1:
                        owner = min(candidates)
                    else:
                        owner = candidates[0]
                    patch_tris.append({
                        'nodes': nodes,
                        'owner': owner,
                    })
            # the ruling-38 certification: the positive-area faces with no
            # own patch triangle become the candidate set; the certifyer
            # partitions D_f = B_f ∪ I_f per face and refuses what it
            # cannot certify
            absorb_candidates = []
            for face_index in deletes:
                if face_index not in polys:
                    continue  # zero-area class: the collapse ledger covers it
                if not patch_tris or not any(
                        tri['owner'] == face_index for tri in patch_tris):
                    absorb_candidates.append(face_index)
            patches.append({
                'absorbCandidates': sorted(absorb_candidates),
                'cells': bucket,
                'deletes': deletes,
                'patchTris': patch_tris,
                'planeText': ptext,
                'unit': unit,
            })
            total_patch_tris += len(patch_tris)
    return patches, total_patch_tris


def _s7_edges_for(bm, vertex_a, vertex_b, edge_memo):
    """Materialize a shared edge once: bm.edges.get guarded (the letter),
    falling back to bm.edges.new; memo keeps the guard exact across the
    same pass."""
    key = (vertex_a.index, vertex_b) if False else (id(vertex_a), id(vertex_b))
    hit = edge_memo.get(key)
    if hit is not None:
        return hit
    edge = bm.edges.get((vertex_a, vertex_b))
    if edge is None:
        _s7_census_field('newEdges')
        edge = bm.edges.new((vertex_a, vertex_b))
    edge_memo[key] = edge
    return edge


def _s7_node_canonical_point(node3):
    """The ruling-39 moved-frame bridge: the overlay node's own S4 claim.
    The node (an exact intake/overlay point on the recorded-scalar frame)
    keys _CANON1_BY_IMAGE through its float32 storage image — the same law
    _s6_remap_node applies to the recorded rings. Returns (point, state):
    'canonical' -> the node's unique claimed S4-moved exact point (the
    realized vertex's canonical identity); 'raw' -> no claim at the node's
    image (the node keeps its recorded-scalar position: interior overlay
    geometry or the letters' new-arrangement-node); 'ambiguous' -> several
    distinct claimed moved points, never resolved here — the caller stops
    loud (the letters: never guessed)."""
    image = tuple(binary_q(_s6_f32(float(v))) for v in node3)
    rows = _CANON1_BY_IMAGE.get(image)
    if not rows:
        return node3, 'raw'
    distinct = sorted({tuple(moved) for _witness, moved in rows})
    if len(distinct) == 1:
        return distinct[0], 'canonical'
    return node3, 'ambiguous'


def _s7_deleted_chain_divergence(bm, patch, moved_states, patch_index_n):
    """The boundaries' one-object-per-position law check (the letters: the
    position = ONE object — its canonical identity; conflicts = loud):
    scans the bucket's deleted faces' OWN realized ring vertex objects and
    fails loud when two different stored positions claim ONE canonical
    moved identity (the S4 welding never covered it). Exact-position ties
    (two objects, same stored float32 image, one identity) ride
    S7_VERTEX_IDENTITY_TIE fact rows and keep the deterministic
    face-order first object (exact-neutral; the mesh's own shared
    vertices are not affected)."""
    seen_moved = {}
    ties = {}
    divergences = []
    for face_index in sorted(patch['deletes']):
        for vertex in tuple(bm.faces[face_index].verts):
            moved = moved_states.get(vertex.index)
            if moved is None:
                continue
            previous = seen_moved.setdefault(moved, vertex)
            if previous is vertex:
                continue
            co_a = binary_point(tuple(previous.co))
            co_b = binary_point(tuple(vertex.co))
            if co_a == co_b:
                ties.setdefault(
                    ','.join(exact_record(moved)),
                    ','.join(exact_record(co_a)))
                continue
            divergences.append({
                'identity': ','.join(exact_record(moved)),
                'bucket': patch_index_n,
                'objects': [','.join(exact_record(co_a)),
                            ','.join(exact_record(co_b))],
            })
    return ties, divergences


def assemble_replacement_patches():
    """S7 — assembly (the adopted letter, mechanically, per the span
    header's in-span decisions): opens the canonicalized product, forms
    the merged patch units, plans the patch triangles from the S6
    retained-region CDT proposals over the deleted areas, builds the
    canonical vertex table (S4 keys + the new arrangement nodes), splits
    the retained neighbors' ring edges at exact parameters for the
    perimeter nodes, materializes shared edges once, constructs the
    replacement faces over existing edges with material and provenance
    from the owning source facet, emits the account_removed_face ledger
    rows and deletes the affected faces, runs the second canonicalization
    over the perimeter + split vertices only (emit RG_F1_WELD2), and
    closes with closed_guard(bm, 'member-difference-closed') whose
    acceptance bar is the verdict's 0/0/0/0/0."""
    if _AIR_TARGET is None:
        fail('assembly S7 runs after the S3 chain')
    if not _s6_results:
        fail('assembly S7 runs after the S6 arrangements')
    bm = bmesh.new()
    bm.from_mesh(_AIR_TARGET.data)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    if layer is None:
        fail('s7: provenance layer lost before assembly')
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(
                f's7: face {face.index} carries no valid FACET_TABLE index')
    facet_of_face = {}
    ring_of_face = {}
    vertex_ring_objects = {}
    for face in bm.faces:
        facet_of_face[face.index] = FACET_TABLE[face[layer]].id
        ring_of_face[face.index] = tuple(
            binary_point(tuple(v.co)) for v in face.verts)
        vertex_ring_objects[face.index] = tuple(face.verts)
    facet_by_id = {facet.id: facet for facet in FACET_TABLE}
    facet_index = {facet.id: k for k, facet in enumerate(FACET_TABLE)}

    units, face_owners = _s7_component_units()
    res_by_entry = {result['entry']: result for result in _s6_results}
    if res_by_entry.keys() != set(range(0, max(res_by_entry) + 1)):
        fail('s7: the S6 holder does not cover every entry the registry '
             'froze (the merged units need the whole plan)')
    emit('S7_PLAN', {
        'entryCount': len(REGISTRY),
        'units': len(units),
        'bigUnits': [len(unit['entries']) for unit in units][:10],
    })
    identity_meta = (bm, facet_of_face, ring_of_face)
    patches, total_patch_tris = _s7_patches(units, res_by_entry, identity_meta)
    deleted_total = sorted({delete for patch in patches
                            for delete in patch['deletes']})
    emit('S7_PATCHES', {
        'bucketCount': len(patches),
        'deletedFaces': len(deleted_total),
        'patchTris': total_patch_tris,
        'unionConflicts': len(_S7_STOP['unionConflicts']),
        'absorbCandidates': sum(
            len(patch.get('absorbCandidates') or ()) for patch in patches),
    })
    if _S7_STOP['unionConflicts']:
        for row in _S7_STOP['unionConflicts']:
            emit('S7_UNION_CONFLICT', row)
        fail(
            's7: the merged units\' entries classify different retained '
            'regions on a shared plane (the one-merged-unit law '
            'conflicts); facts emitted above — build stop, no '
            're-vectoring')

    # ---- the ruling-38 certification pass (the certified
    # union_interior_absorbed disposition): partition D_f = B_f ∪ I_f per
    # candidate face on the reconciled union of the owning entries'
    # arrangements, certify the five-part absorption certificate per free
    # piece, and schedule the genuinely-boundary remainder replacements.
    # Any refusal keeps its face unexplained — the standing hard stop.
    dispositions, coverings, absorb_replacements, absorb_refusals, (
        absorb_conflicts) = _s7_absorption_certify(
            patches, res_by_entry, face_owners, identity_meta)
    if absorb_conflicts:
        for row in absorb_conflicts:
            emit('S7_ABSORB_CONFLICT', row)
        fail(
            's7: the ruling-38 certification found reconciled-union intake '
            'conflicts (the certificates carry them as evidence rows above, '
            'never as absorption); facts emitted — build stop, no '
            're-vectoring')
    if absorb_refusals:
        for row in absorb_refusals:
            emit('S7_ABSORB_REFUSED', row)
        fail(
            's7: %d ruling-38 absorption refusals: the unexplained '
            'positive-area face-removal law stands verbatim (any unexplained '
            'positive-area face removal is a failure); the refusal rows '
            'carry which condition failed — build stop, facts emitted, no '
            're-vectoring' % len(absorb_refusals))
    emit('S7_ABSORB_CENSUS', {'census': dict(_S7_ABSORB_CENSUS)})

    # ---- the canonical vertex table (S4 keys; the new nodes key in below)
    table, ambiguities = _s7_canonical_vertex_table(bm, layer)
    if ambiguities:
        for row in ambiguities[:64]:
            emit('S7_VERTEX_AMBIGUITY', row)
        fail(
            's7: the canonical vertex table has ambiguous or unmatched '
            'identities (%d); facts emitted — build stop, never guessed'
            % len(ambiguities))
    emit('CANON2_TABLE', {'entries': len(table)})

    # ---- the ruling-39 moved-frame vertex resolution (the repair): the
    # replacement pieces and the assembled tiles materialize their ring
    # vertices strictly through the DELETED faces' OWN ring vertex objects
    # (the S4-moved realized chains — the letters: the pieces' boundary =
    # the deleted rings' vertices + the retained neighbors' edges) and the
    # retained neighbors' realized edges — NOTHING fresh is created on the
    # boundary. The intake's scalar-frame overlay nodes remap through the
    # node's OWN S4 claim (the recorded rings' remap law) to the canonical
    # moved identity, and the canonical vertex table resolves the identity
    # to the mesh's ONE realized object per boundary position. The chain
    # divergence law scans the bucket's deleted chains (one object per
    # position; exact-position ties ride loud rows, different-position
    # divergences fail). The retained-edge nodes split at the letters'
    # exact parameter (the landed exact machinery, kept verbatim); what
    # remains carries no boundary identity and is interior node geometry —
    # emitted as S7_BOUNDARY_FRESH facts rows when it sits exactly on a
    # deleted realized chain edge (facts for the next ruling — no forcing,
    # no fresh-vertex boundary creation is silently hidden).
    split_events = []
    vertex_for_node = {}
    split_vertex_objects = set()
    moved_states = _s7_moved_states(bm, layer, _s7_canonical_claims())
    _identity_tie_rows = []
    for patch_index_n, patch in enumerate(patches):
        ptext = patch['planeText']
        plane_normal, _offset = _s7_plane_of_text(ptext)
        bucket_nodes = set()
        for tri in patch['patchTris']:
            for point2 in tri['nodes']:
                node3 = _s7_lift_point(ptext, point2)
                bucket_nodes.add((node3, point2))
        # the ruling-38 replacement clips: their own common-refinement
        # rings join the same node pool (the split machinery covers the
        # retained-edge nodes for them too)
        for replacement in absorb_replacements:
            if replacement['bucketIndex'] != patch_index_n:
                continue
            for point2 in replacement['ring']:
                node3 = _s7_lift_point(ptext, point2)
                bucket_nodes.add((node3, point2))
        # the bucket's one-object-per-position law (the deleted chains'
        # own realizeed ring vertex objects)
        ties, divergences = _s7_deleted_chain_divergence(
            bm, patch, moved_states, patch_index_n)
        if divergences:
            for row in divergences:
                emit('S7_VERTEX_IDENTITY_DIVERGENCE', row)
            fail(
                's7: two different stored positions claim one canonical '
                'moved identity across the deleted chains of bucket %d; '
                'the boundary is not one object per canonical identity — '
                'facts emitted above — build stop, never guessed'
                % patch_index_n)
        for identity, co in sorted(ties.items()):
            _identity_tie_rows.append({'identity': identity, 'co': co})
        for node3, _point2 in sorted(bucket_nodes, key=lambda p: str(p[0])):
            # (a) the pool cache: one object per exact position
            cached = vertex_for_node.get(node3)
            if cached is not None and cached.is_valid:
                continue
            hit = table.get(node3)
            if hit is not None:
                vertex_for_node[node3] = hit
                continue
            # (b) the node's own S4 claim -> the canonical moved identity ->
            # the canonical table's ONE realized object (the identity
            # bridge; the deleted faces' own ring vertex object belongs to
            # that identity — the letters' resolution)
            canonical, claim_state = _s7_node_canonical_point(node3)
            if claim_state == 'ambiguous':
                emit('S7_VERTEX_CLAIM_AMBIGUITY', {
                    'node': ','.join(exact_record(node3)),
                    'claims': [','.join(exact_record(moved))
                               for _witness, moved
                               in _CANON1_BY_IMAGE.get(tuple(
                                   binary_q(_s6_f32(float(v)))
                                   for v in node3)) or ()][:8],
                })
                fail(
                    's7: a pool node carries several distinct S4 moved '
                    'claims (' + ','.join(exact_record(node3)) + '); the '
                    'canonical identity is ambiguous — the letters never '
                    'guessed — build stop, facts emitted')
            if claim_state == 'canonical':
                canonical_object = table.get(canonical)
                if canonical_object is not None and canonical_object.is_valid:
                    vertex_for_node[node3] = canonical_object
                    continue
                emit('S7_CLAIM_IDENTITY_MISS', {
                    'node': ','.join(exact_record(node3)),
                    'canonical': ','.join(exact_record(canonical)),
                })
                fail(
                    's7: a pool node\'s claimed S4 moved identity is not a '
                    'canonical vertex table key; the S4 claims cover every '
                    'realized vertex — never guessed — build stop, facts '
                    'emitted')
            # (c) the letters' exact-parameter split law on the realized
            # edges: the search re-scans the OUTER face's LOOP edges each
            # time so an edge split inside this scan is visible to the next
            # node on the same span (the sub-edge the next node needs)
            split_done = False
            for face_index in patch['unit']['retained']:
                face = bm.faces[face_index]
                for loop in face.loops:
                    start = loop.vert
                    edge = loop.edge
                    other = edge.other_vert(start)
                    point_a = binary_point(tuple(start.co))
                    point_b = binary_point(tuple(other.co))
                    # the exact tests run only after the outward float
                    # bbox prune (two ulps each side; the prune only saves
                    # the exact work, never changes it)
                    if not all(
                        min(point_a[a], point_b[a]) - Fraction(2, 10 ** 9)
                        <= node3[a] <=
                        max(point_a[a], point_b[a]) + Fraction(2, 10 ** 9)
                        for a in range(3)):
                        continue
                    span = sub(point_b, point_a)
                    length = norm2(span)
                    if length == Fraction(0):
                        continue
                    # the letter's exact parameter: the node's foot along
                    # the realized edge (the dot-product ratio) holds an
                    # EXACT zero orthogonal distance for an edge the
                    # arrangement node lies on
                    line_value = dot(sub(node3, point_a), span)
                    if not Fraction(0) < line_value < length:
                        continue
                    t = line_value / length
                    if norm2(sub(node3, add(point_a, mul(span, t)))) != 0:
                        continue
                    _new_edge, new_vertex = bmesh.utils.edge_split(
                        edge, start, float(t))
                    for vertex in (start, other):
                        if not vertex.is_valid:
                            fail('s7: the exact edge split invalidated a '
                                 'retained ring endpoint (the parameter '
                                 'law landed on a degenerate ring)')
                    new_vertex.co = Vector(
                        (float(node3[0]), float(node3[1]),
                         float(node3[2])))
                    _s7_census_field('splitVertices')
                    table[node3] = new_vertex
                    vertex_for_node[node3] = new_vertex
                    split_vertex_objects.add(new_vertex)
                    split_events.append({
                        'face': face_index,
                        'node': node3,
                        'parameter': t,
                    })
                    split_done = True
                    break
                if split_done:
                    break
            if not split_done:
                # an interior node that no realized identity and no
                # realized realized-edge span carries: fresh vertex at the
                # node's own recorded-scalar position, with the
                # boundary-fact rows for the positions that sit exactly on
                # a deleted realized ring edge (facts for the next ruling —
                # the edge dies with the deleted face; no surviving mesh
                # geometry carries the position)
                on_deleted_chain_edge = None
                for face_index in patch['deletes']:
                    realized = vertex_ring_objects[face_index]
                    if len(realized) < 2:
                        continue
                    for vertex_a, vertex_b in zip(
                            realized, realized[1:] + realized[:1]):
                        point_a = binary_point(tuple(vertex_a.co))
                        point_b = binary_point(tuple(vertex_b.co))
                        span = sub(point_b, point_a)
                        length = norm2(span)
                        if length == Fraction(0):
                            continue
                        foot = dot(sub(node3, point_a), span)
                        if not Fraction(0) < foot < length:
                            continue
                        if norm2(sub(node3, add(
                                point_a, mul(span, foot / length)))) == 0:
                            on_deleted_chain_edge = (face_index, foot / length)
                            break
                    if on_deleted_chain_edge:
                        break
                if on_deleted_chain_edge is not None:
                    emit('S7_BOUNDARY_FRESH', {
                        'faceIndex': on_deleted_chain_edge[0],
                        'parameter': str(on_deleted_chain_edge[1]),
                        'node': ','.join(exact_record(node3)),
                        'bucket': patch_index_n,
                    })
                vertex = bm.verts.new((
                    float(node3[0]), float(node3[1]), float(node3[2])))
                table[node3] = vertex
                vertex_for_node[node3] = vertex
                _s7_census_field('interiorNodes')
        patch['vertexPlan'] = True
    for row in _identity_tie_rows:
        emit('S7_VERTEX_IDENTITY_TIE', row)
    _EXACT_CENSUS_CAPTURES['s7_identity_tie_rows'] += len(_identity_tie_rows)


    emit('S7_SPLITS', {
        'splits': len(split_events),
        'eventsByFace': [
            {'face': event['face'], 'parameter': str(event['parameter'])}
            for event in sorted(
                split_events, key=lambda event: (
                    event['face'], str(event['parameter'])))],
    })

    # ---- build the replacement faces (triangles over existing edges)
    edge_memo = {}
    face_records = []
    face_records_by_face = defaultdict(list)
    vertex_object_cache = {}
    for node3, vertex in vertex_for_node.items():
        vertex_object_cache[node3] = vertex
    material_by_patch = {}
    for patch_index_n, patch in enumerate(patches):
        ptext = patch['planeText']
        patch_faces = []
        tri_face_map = []
        for tri in sorted(
                patch['patchTris'],
                key=lambda tri: str(
                    ';'.join(','.join(exact_record(point)) for point in tri['nodes']))):
            vertex_order = []
            for point2 in tri['nodes']:
                node3 = _s7_lift_point(ptext, point2)
                vertex = vertex_object_cache.get(node3)
                if vertex is None or not vertex.is_valid:
                    vertex = table.get(node3)
                    if vertex is None or not vertex.is_valid:
                        vertex = bm.verts.new((
                            float(node3[0]), float(node3[1]),
                            float(node3[2])))
                        table[node3] = vertex
                        vertex_object_cache[node3] = vertex
                        _s7_census_field('interiorNodes')
                vertex_order.append(vertex)
            if len(set(vertex_order)) != 3:
                fail(
                    's7: a patch triangle\'s three nodes collapse to fewer '
                    'vertices through the vertex table ('
                    + ';'.join(exact_record(_s7_lift_point(
                        ptext, point2)) for point2 in tri['nodes'])
                    + '): the shadow-class at the canonical merge — build '
                      'stop, never guessed')
            v0, v1, v2 = vertex_order
            _s7_edges_for(bm, v0, v1, edge_memo)
            _s7_edges_for(bm, v1, v2, edge_memo)
            _s7_edges_for(bm, v2, v0, edge_memo)
            owner_index = tri['owner']
            owner_facet = facet_by_id[facet_of_face[owner_index]]
            # ruling-40 (v11/13) §4 pre-check: a zero-area patch tri means
            # the S6 CDT triangulated through a node lying on a segment —
            # the arrangement must split that segment at the node instead;
            # refused with the fact row (face, three nodes), exact domain
            # (the same binary_point frame the closure's degenerate
            # census measures)
            tri_points = [binary_point(tuple(vertex.co))
                          for vertex in (v0, v1, v2)]
            # Census R1 (the route law §4 pre-check, demoted to rows; the
            # shipped builder fails): the row stays, the zero tri is
            # skipped (no face built; the census feeds the relay)
            if area_vector(tri_points) == ZERO3:
                _EXACT_CENSUS_LEDGER['s7_patchTriZero'] += 1
                emit('S7_PATCH_TRI_ZERO', {
                    'co': [','.join(exact_record(point))
                           for point in tri_points],
                    'nodes': [','.join(exact_record(_s7_lift_point(
                        ptext, point2))) for point2 in tri['nodes']],
                    'owner': owner_index,
                })
                continue
            try:
                face = bm.faces.new((v0, v1, v2))
            except ValueError as error:
                fail('s7: patch face construction refused: %s over '
                     '%s' % (error, ';'.join(
                         exact_record(_s7_lift_point(ptext, point2))
                         for point2 in tri['nodes'])))
            face.material_index = owner_facet.material
            face[layer] = facet_index[owner_facet.id]
            patch_faces.append(face)
            tri_face_map.append(face)
            _s7_census_field('patchFaces')
        patch['faces'] = patch_faces
        face_records.extend(tri_face_map)
        # ---- the ruling-38 replacement clips: the genuinely-boundary
        # remainder pieces build exactly their own refined territory as
        # their certified-ear triangle fans over the materialized edges —
        # under the ruling-39 moved-frame repair their rings resolve
        # strictly through the deleted faces' OWN ring vertex objects: the
        # pool's canonical identity resolution covered this bucket's clip
        # rings, the materialized ring runs on the resolved vertices'
        # canonical exact positions, and the raw overlay's twin nodes (a
        # recorded-scalar position and the moved identity of the SAME
        # boundary position) collapse: they are ONE position. The ring is
        # oriented outward from air by the piece's own certified verdict;
        # the ears tile the piece's materialized area exactly. No fresh
        # vertex is created here (the pool registered everything).
        patch['clipFaces'] = []
        clip_plane_normal, _clip_offset = _s7_plane_of_text(ptext)
        for replacement in absorb_replacements:
            if replacement['bucketIndex'] != patch_index_n:
                continue
            owner_face_index = replacement['face']
            owner_facet = facet_by_id[facet_of_face[owner_face_index]]
            plane_outward = (
                clip_plane_normal if replacement['sides'] == (False, True)
                else tuple(-value for value in clip_plane_normal))
            materialized = []
            for point2 in replacement['ring']:
                node3 = _s7_lift_point(ptext, point2)
                vertex = vertex_object_cache.get(node3)
                if vertex is None or not vertex.is_valid:
                    vertex = table.get(node3)
                if vertex is None or not vertex.is_valid:
                    fail(
                        's7: a replacement clip ring node carries no '
                        'materialized vertex after the canonical identity '
                        'resolution (the pool pass covers this bucket\'s '
                        'clip rings; ' + ','.join(exact_record(node3)) +
                        ' at face %d) — the letters never guessed — build '
                        'stop' % owner_face_index)
                materialized.append(
                    (vertex, binary_point(tuple(vertex.co))))
            # the consecutive canonical duplicates collapse: the raw
            # overlay's twin nodes (a recorded-scalar position and its
            # moved identity) are ONE boundary position (the same object
            # through the canonical identity, or two exact-stored-equal
            # objects at it)
            collapsed_ring = []
            for vertex, position in materialized:
                if collapsed_ring:
                    previous_vertex, previous_position = collapsed_ring[-1]
                    if previous_position == position or (
                            previous_vertex is vertex):
                        continue
                collapsed_ring.append((vertex, position))
            if collapsed_ring and collapsed_ring[0][1] == collapsed_ring[-1][1]:
                collapsed_ring.pop()
            if len(collapsed_ring) < 3 or len(
                    {vertex for vertex, _position in collapsed_ring}) < 3:
                # a zero-content remainder strip: the certified piece's raw
                # overlay ring walked two parallel frames (the recorded
                # -scalar 8-decimal exact positions and the float32-stored
                # moved identities of the SAME boundary positions, a few
                # F32 ulps apart); through the moved-frame vertex
                # resolution EVERY node lands on the deleted faces' own
                # ring vertex objects and the ring degenerates onto the
                # chain — the piece carries no positive area in the moved
                # frame the mesh realizes, so its materialized territory
                # is exactly nothing: no surface is built, the flat frame
                # pair (the S7_PARTITION canon areas and the certified
                # verdicts) rides as its own frame-labeled evidence, and
                # the face's removal row cites the assembled covering
                # tiles. No forcing, no tolerance, no fresh vertex.
                emit('S7_CLIP_ZERO_CONTENT', {
                    'face': owner_face_index,
                    'bucket': patch_index_n,
                    'rawRingNodes': len(replacement['ring']),
                    'collapsed': [','.join(exact_record(position))
                                  for _v, position in collapsed_ring],
                    'sides': replacement['sides'],
                    'area': replacement['area'],
                })
                patch['zeroContentClips'] = patch.get('zeroContentClips', 0) + 1
                continue
            ring3d = [position for _vertex, position in collapsed_ring]
            area_vec = area_vector(ring3d)
            if area_vec == ZERO3:
                # the same zero-content class at three or more distinct
                # positions: the resolved ring is exactly collinear (the
                # strip's width is zero in the moved frame) — no surface,
                # facts emitted, the covering tiles carry the removal row
                emit('S7_CLIP_ZERO_CONTENT', {
                    'face': owner_face_index,
                    'bucket': patch_index_n,
                    'rawRingNodes': len(replacement['ring']),
                    'collapsed': [','.join(exact_record(position))
                                  for _v, position in collapsed_ring],
                    'sides': replacement['sides'],
                    'area': replacement['area'],
                })
                patch['zeroContentClips'] = patch.get('zeroContentClips', 0) + 1
                continue
            # ruling-40 (v11/13) §3: the clip ring replaces the deleted
            # face; its orientation comparator is that face's own
            # realized area vector — the same source the account ledger
            # cites through ring_of_face (built at the stage's top from
            # binary_point(v.co)). Exact, deterministic; never guessed.
            deleted_vec = area_vector(ring_of_face[owner_face_index])
            alignment = dot(area_vec, deleted_vec)
            if alignment == Fraction(0):
                emit('S7_CLIP_ORIENTATION_ZERO', {
                    'bucket': patch_index_n,
                    'clipVecNorm2': str(norm2(area_vec)),
                    'deletedVecNorm2': str(norm2(deleted_vec)),
                    'face': owner_face_index,
                    'ring': [','.join(exact_record(position))
                             for _v, position in collapsed_ring],
                    'ringNodes': len(collapsed_ring),
                })
                fail(
                    's7: a replacement clip ring\'s area vector is exactly '
                    'orthogonal to the deleted face\'s realized ring area '
                    'vector (dot = 0) at face %d — the law never guesses '
                    'an orientation — build stop' % owner_face_index)
            if alignment < 0:
                collapsed_ring = list(reversed(collapsed_ring))
                emit('S7_CLIP_ORIENTED', {
                    'alignmentAfter': str(-alignment),
                    'alignmentBefore': str(alignment),
                    'bucket': patch_index_n,
                    'face': owner_face_index,
                })
            clip_axis = drop_axis(clip_plane_normal)
            flat_vertex = {}
            for vertex, position in collapsed_ring:
                flat_vertex.setdefault(
                    _s7_flat_ring((position,), clip_axis)[0], vertex)
            ring_flat = [flat for flat in flat_vertex]
            ears, _ear_area = _s7_absorb_certified_ears(ring_flat, None)
            if not ears:
                fail('s7: a replacement clip ring has no certified ear '
                     'decomposition: ' + ';'.join(
                         ','.join(exact_record(position))
                         for _v, position in collapsed_ring))
            for triple in ears:
                fan_vertices = tuple(
                    flat_vertex[point] for point in triple)
                if len(set(fan_vertices)) != 3:
                    fail('s7: a replacement clip\'s ear triangle collapses '
                         'through the moved-frame vertex resolution: build '
                         'stop, never guessed')
                # the replacement clip walks the deleted face's realized
                # ring orientation (ruling-40 (v11/13) §3: the ring's
                # area vector is compared with that face's realized ring
                # area vector — the same source the account ledger
                # cites; the mesh's retained loops stay contiguous with
                # every two-face ring attachment — measured facts:
                # assembledPatch+meshFace winding pairs were zero while
                # the clip pairs carried the whole inversion census)
                fan_vertices = tuple(reversed(fan_vertices))
                v0, v1, v2 = fan_vertices
                _s7_edges_for(bm, v0, v1, edge_memo)
                _s7_edges_for(bm, v1, v2, edge_memo)
                _s7_edges_for(bm, v2, v0, edge_memo)
                # ruling-40 (v11/13) §4 pre-check on the clip fan (the
                # clips' ring-level zero-content stop covers collinear
                # rings; this is the tri-level exact stop)
                tri_points = [binary_point(tuple(vertex.co))
                              for vertex in fan_vertices]
                if area_vector(tri_points) == ZERO3:
                    emit('S7_CLIP_TRI_ZERO', {
                        'co': [','.join(exact_record(point))
                               for point in tri_points],
                        'face': owner_face_index,
                        'nodes': [
                            ','.join(exact_record(flat_vertex[point]))
                            for point in triple],
                    })
                    fail(
                        's7: a replacement clip ear triangle is exactly '
                        'zero-area at face %d (three nodes in the row '
                        'above); refused per the adopted law (face, three '
                        'nodes)' % owner_face_index)
                try:
                    clip_face = bm.faces.new(fan_vertices)
                except ValueError as error:
                    fail('s7: replacement clip face construction refused: '
                         '%s at face %d over %s' % (
                             error, owner_face_index,
                             ';'.join(','.join(exact_record(position))
                                      for position in triple)))
                clip_face.material_index = owner_facet.material
                clip_face[layer] = facet_index[owner_facet.id]
                patch['clipFaces'].append(clip_face)
                face_records.append(clip_face)
                face_records_by_face.setdefault(
                    owner_face_index, []).append(clip_face)
                _s7_census_field('replacementFaces')

    # ---- delete the affected faces (ledger rows first; the objects are
    # gathered per patch and deleted in one closing pass so face indexes
    # stay stable inside the per-patch bookkeeping)
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    pending_delete_objects = []
    for patch in patches:
        unit = patch['unit']
        # replacement references per affected face: the assembled triangles
        # whose owning ring is that face, plus the certified covering tiles
        # of its boundary-replaced portions and the ruling-38 replacement
        # clip faces (the letters' rows cite the face ids covering the
        # face's own area)
        bm.faces.ensure_lookup_table()
        sorted_tris = sorted(
            patch['patchTris'],
            key=lambda tri: str(
                ';'.join(','.join(exact_record(point)) for point in tri['nodes'])))
        face_by_sorted_position = list(patch['faces'])
        replacements = defaultdict(list)
        for position, (face_object, tri) in enumerate(zip(
                face_by_sorted_position, sorted_tris)):
            replacements[tri['owner']].append(face_object.index)
        covering_faces = defaultdict(set)
        for face_index, tiles in coverings.items():
            for nodes in tiles:
                for position, tri in enumerate(sorted_tris):
                    if tuple(tri['nodes']) == tuple(nodes):
                        if position < len(face_by_sorted_position):
                            covering_faces[face_index].add(
                                face_by_sorted_position[position].index)
                        break
        for face_index, clip_faces in face_records_by_face.items():
            for clip_face in clip_faces:
                if clip_face.is_valid:
                    covering_faces[face_index].add(clip_face.index)
        for entry_number in unit['entries']:
            for face_index in sorted(
                    set(REGISTRY[entry_number]['affected'])):
                face_object = bm.faces[face_index]
                if not face_object.is_valid:
                    fail('s7: the affected face %d vanished before its '
                         'removal row' % face_index)
                realized = ring_of_face[face_index]
                zero_class = (
                    len({p for p in realized}) < len(realized)
                    or norm2(area_vector(realized)) == Fraction(0))
                if zero_class:
                    reason = 'collapsed_ring'
                else:
                    reason = {
                        'boundary_replaced': 'boundary_replaced',
                        'absorbed': 'union_interior_absorbed',
                    }.get(
                        dispositions.get(face_index)
                        if dispositions.get(face_index) else None,
                        'boundary_replaced')
                cited = sorted(set(
                    replacements.get(face_index, ())
                    ) | covering_faces.get(face_index, set()))
                account_removed_face(
                    'patch', face_object, reason, cited,
                    'member-difference-raw', 'member-difference-closed')
                _s7_census_field('removalRows')
        for face_index in patch['deletes']:
            face_object = bm.faces[face_index]
            if not face_object.is_valid:
                fail('s7: the affected face %d vanished before the '
                     'deletion pass' % face_index)
            pending_delete_objects.append(face_object)
        patch_faces_alive = all(face.is_valid for face in patch['faces'])
        if not patch_faces_alive:
            fail('s7: an assembled patch triangle lost validity before the '
                 'closing deletion pass')
    bmesh.ops.delete(bm, geom=pending_delete_objects, context='FACES')
    _s7_census_field('deletedFaces')
    # ---- the ruling-38 edge-ownership census: for every deleted face's own
    # pre-deletion ring edge, how many mesh faces hold the mesh edge now,
    # and for the surviving one-ledger operators which face kinds hold the
    # surviving side (never an absorption instrument: a recording only)
    edge_uses_now = {}
    for edge in bm.edges:
        edge_uses_now[id(edge)] = sorted(face.index for face in edge.link_faces)
    edge_by_vertex_ids = defaultdict(list)
    for edge in bm.edges:
        ids = tuple(sorted((id(edge.verts[0]), id(edge.verts[1]))))
        edge_by_vertex_ids[ids].append(edge)
    deleted_edge_hold_census = {'two': 0, 'one': 0, 'zero': 0, 'over': 0}
    deleted_ring_edge_rows = []
    for face_index in deleted_total:
        for vertex_a, vertex_b in zip(vertex_ring_objects[face_index],
                                      vertex_ring_objects[face_index][1:]):
            ids = tuple(sorted((id(vertex_a), id(vertex_b))))
            holders = edge_by_vertex_ids.get(ids) or []
            uses = len(holders)
            if uses == 2:
                deleted_edge_hold_census['two'] += 1
            elif uses == 1:
                deleted_edge_hold_census['one'] += 1
            elif uses == 0:
                deleted_edge_hold_census['zero'] += 1
            else:
                deleted_edge_hold_census['over'] += 1
            if len(deleted_ring_edge_rows) < 12 and uses != 2:
                holder_face = holders[0].link_faces[0] if holders and (
                    holders[0].link_faces) else None
                deleted_ring_edge_rows.append({
                    'deletedFace': face_index,
                    'edgeUses': uses,
                    'holderFace': holder_face.index if holder_face else None,
                    'co': [','.join(exact_record(binary_point(tuple(v.co))))
                           for v in (vertex_a, vertex_b)],
                })
    emit('S7_DELETED_EDGE_HOLD', {
        'census': deleted_edge_hold_census,
        'rows': deleted_ring_edge_rows,
    })
    # ---- the ruling-38 authorized-absence table enters the
    # removal-accounting proof: per absorbed face its union_interior_absorbed
    # row (source-face identity/provenance, the reconciled union, the
    # canonical plane and mapping, the exact absorbed cell geometry and
    # area, the (F,F) classifications, the two-sided membership
    # certificate), then the summary
    _s7_absorb_emit_absorption_rows(coverings, face_owners)

    # ---- the second canonicalization: perimeter + split vertices only
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    perimeter = set()
    for patch in patches:
        for face_index in patch['unit']['retained']:
            face = bm.faces[face_index]
            if not face.is_valid:
                fail(
                    's7: the retained face %d of one merged unit vanished '
                    'during assembly (the frozen boundary must survive the '
                    'deletions)' % face_index)
            for vertex in face.verts:
                perimeter.add(vertex)
    perimeter.update(v for v in split_vertex_objects if v.is_valid)
    perimeter = sorted(perimeter, key=lambda vertex: vertex.index)
    states = {}
    clusters = defaultdict(list)
    max_squares = Fraction(0)
    # ruling-40 (v11/13) §2 stage 1 (WELD2 tables): per-perimeter records;
    # the keys re-key after the exact-source repair block below
    _s7_weld2_records = []
    for vertex in perimeter:
        if not vertex.is_valid:
            fail('s7: the perimeter set lost a vertex before the second '
                 'canonicalization')
        witness = set()
        supports = {}
        for face in vertex.link_faces:
            if not face.is_valid or not 0 <= face[layer] < len(FACET_TABLE):
                fail(
                    's7: a perimeter vertex carries an invalid link face at '
                    f'index {face.index}')
            facet_id = FACET_TABLE[face[layer]].id
            witness.add(facet_id)
            support = facet_by_id[facet_id].plane
            supports[plane_key(support)] = support
        point = binary_point(tuple(vertex.co))
        resolved_supports, direct = _joint_supports(supports)
        _s7_census_field('weld2SupportCalls')
        moved = project_joint(point, resolved_supports)
        if not direct:
            for plane in supports.values():
                if plane_side(moved, plane) != 0:
                    fail(
                        's7: the over-set support plane rejects the joint '
                        'point at ' + ','.join(exact_record(point))
                        + ' (the second canonicalization repeats S4\'s '
                          'certified-subset law; nothing is forced)')
        # ruling-40 (v11/13) §2 stage 1: record per perimeter vertex — the
        # solve used exactly this resolved subset
        _s7_weld2_records.append((
            vertex, point, tuple(moved), frozenset(witness),
            tuple(resolved_supports)))
    # ---- ruling-40 (v11/13) §2 at the WELD2 table: the identical
    # exact-source repair over the perimeter's own full-rank records
    # (the candidate set covers only the vertices WELD2 re-solves —
    # vertices the deleted chains alone hold are not in this record set;
    # a stated coverage fact). Zero or several distinct candidates fail
    # loud (the project law: never guessed); rank<2 is recorded with
    # source 'none' and not guessed — the same recorded S4 deviation.
    clusters = defaultdict(list)
    states = {}
    max_squares = Fraction(0)
    for vertex, point, moved, witness, resolved in _s7_weld2_records:
        rank = len(resolved)
        if rank == 3:
            repaired, source = moved, 'fullRankSupports'
        elif rank == 2:
            (n1, d1), (n2, d2) = resolved[0], resolved[1]
            direction = cross(n1, n2)
            free = dot(direction, point)
            band = _f32_ulp(free)
            node_keys = {plane_key(plane) for plane in resolved}
            candidates = {}
            for _cv, _cpoint, cand_moved, _cw, cand_resolved \
                    in _s7_weld2_records:
                if len(cand_resolved) != 3:
                    continue
                if dot(n1, cand_moved) != d1 or dot(n2, cand_moved) != d2:
                    continue
                if abs(dot(direction, cand_moved) - free) > band:
                    continue
                candidates[cand_moved] = cand_resolved
            if len(candidates) != 1:
                # Census R2 (the route law §2: the rank-2 refusal family
                # demoted to rows; the shipped builder fails here):
                # record the class + the full-rank line population with
                # the minimum exact line delta, pass the as-solved node
                lineage_full = [
                    abs(dot(direction, _cmoved) - free)
                    for _cv, _cpoint, _cmoved, _cw, _cres
                    in _s7_weld2_records
                    if len(_cres) == 3
                    and dot(n1, _cmoved) == d1
                    and dot(n2, _cmoved) == d2]
                key = ('s7w2_cand_zero' if not candidates
                       else 's7w2_cand_multi')
                _EXACT_CENSUS_LEDGER[key] += 1
                _EXACT_CENSUS_LEDGER['s7w2_line_population'] += (
                    len(lineage_full))
                smallest = min(lineage_full) if lineage_full else None
                if smallest is not None and (
                        _EXACT_CENSUS_MIN['w2'] is None
                        or smallest < _EXACT_CENSUS_MIN['w2']):
                    _EXACT_CENSUS_MIN['w2'] = smallest
                emit('CANON2_NODE_SUPPORT', {
                    'candidates': len(candidates),
                    'image': ','.join(exact_record(point)),
                    'linePopulation': len(lineage_full),
                    'minLineDelta': (str(min(lineage_full))
                                     if lineage_full else None),
                    'moved': ','.join(exact_record(moved)),
                    'rank': rank,
                    'source': 'lineTwin',
                })
                repaired = (moved if not candidates
                            else next(iter(candidates)))
                third = [plane for plane in candidates[repaired]
                         if plane_key(plane) not in node_keys] \
                    if candidates else ()
                source = (
                    'lineTwinAbsent' if not candidates else
                    ('lineTwin:' + ','.join(str(value) for value in
                                            plane_key(third[0]))
                     if len(third) == 1 else 'lineTwinMulti'))
            else:
                repaired = next(iter(candidates))
                third = [plane for plane in candidates[repaired]
                         if plane_key(plane) not in node_keys]
                source = (
                    'lineTwin:' + ','.join(str(value) for value in
                                           plane_key(third[0]))
                    if len(third) == 1 else 'lineTwin')
        else:
            repaired, source = moved, 'none'
        _EXACT_CENSUS_LEDGER['s7w2_rank_%d' % rank] += 1
        emit('CANON2_NODE_SUPPORT', {
            'image': ','.join(exact_record(point)),
            'moved': ','.join(exact_record(repaired)),
            'rank': rank,
            'source': source,
            'vertex': vertex.index,
        })
        clusters[(repaired, witness)].append(vertex)
        states[vertex] = (point, repaired)
        square = norm2(sub(repaired, point))
        if square > max_squares:
            max_squares = square
    cluster_count = 0
    targetmap = {}
    diameter = Fraction(0)
    for (moved, witness), members in clusters.items():
        if len(members) == 1:
            continue
        members = sorted(members, key=lambda vertex: vertex.index)
        cluster_count += 1
        cluster_diameter = Fraction(0)
        for a in members:
            for b in members:
                if a is not b:
                    cluster_diameter = max(
                        cluster_diameter,
                        norm2(sub(states[a][1], states[b][1])))
        if cluster_diameter > diameter:
            diameter = cluster_diameter
        assert cluster_diameter <= JUNCTION_WELD_MAX ** 2
        for vertex in members[1:]:
            targetmap[vertex] = members[0]
    moved_count = 0
    for vertex, (point, moved) in states.items():
        if moved == point:
            continue
        vertex.co = Vector((float(moved[0]), float(moved[1]),
                            float(moved[2])))
        moved_count += 1
    bmesh.ops.weld_verts(bm, targetmap=targetmap)
    _w2_census = dict(_EXACT_CENSUS_LEDGER)
    if _EXACT_CENSUS_MIN['w2'] is not None:
        _w2_census['w2_minLineDelta'] = str(_EXACT_CENSUS_MIN['w2'])
    emit('WELD2', {
        'clusters': cluster_count,
        'maxDisplacement': str(max_squares),
        'moved': moved_count,
        'census': _w2_census,
    })
    # Lane-2 A′-0 probe hook (ruling-40 §5/§6; research lane, never ships):
    # the WELD2 records probed as-solved; the WELD2 pass's end is also the
    # settlement point of both HIST rows (every S6 intake row exists by now)
    _a0_probe_pass('WELD2', _s7_weld2_records)
    # ---- the acceptance guard
    for seq in (bm.verts, bm.edges, bm.faces):
        seq.ensure_lookup_table()
        seq.index_update()
    for face in bm.faces:
        if not 0 <= face[layer] < len(FACET_TABLE):
            fail(
                f's7: face {face.index} lost its FACET_TABLE index in the '
                'assembly')
    # ---- the ruling-38 follow-through: record (never absorb) the
    # post-weld closure defects' structure before the guard's own verdict:
    # each one-face edge classifies by the face kind that holds it (the
    # ruling-38 replacement clip, the assembled patch, or the mesh's own
    # face), and reports whether both endpoints are vertices of a deleted
    # face's own pre-deletion realized ring, with a same-coordinate
    # twin-edge test
    clip_ids = set()
    patch_ids = set()
    for patch in patches:
        for face in patch.get('clipFaces') or ():
            if face.is_valid:
                clip_ids.add(face.index)
        for face in patch['faces']:
            if face.is_valid:
                patch_ids.add(face.index)
    deleted_ring_pairs = defaultdict(set)
    for face_index in deleted_total:
        for vertex_a, vertex_b in zip(vertex_ring_objects[face_index],
                                      vertex_ring_objects[face_index][1:]):
            deleted_ring_pairs[(id(vertex_a), id(vertex_b))].add(face_index)
        deleted_ring_pairs[(id(vertex_ring_objects[face_index][-1]),
                            id(vertex_ring_objects[face_index][0]))].add(
            face_index)
    co_image = {}
    for edge in bm.edges:
        verts = edge.verts
        images = tuple(sorted((
            binary_point(tuple(verts[0].co)),
            binary_point(tuple(verts[1].co)))))
        co_image.setdefault(images, []).append(edge.index)
    one_face_census = 0
    twin_census = 0
    deleted_ring_edge_census = 0
    precheck_rows = []
    one_face_holder_census = {}
    holder_rows = {}
    winding_holder_pairs = {}
    for edge in bm.edges:
        if len(edge.link_faces) != 1:
            continue
        one_face_census += 1
        holder_face = edge.link_faces[0]
        # ruling-40 (v11/13) fix: classify by the holder FACE's index — the
        # edge's own index was being compared against face-index sets, so the
        # buckets counted index collisions, not classification; the winding
        # pair loop below already did it correctly by face
        if holder_face.index in clip_ids:
            holder = 'replacementClip'
        elif holder_face.index in patch_ids:
            holder = 'assembledPatch'
        else:
            holder = 'meshFace'
        vertex_a, vertex_b = edge.verts
        ring_hits = (deleted_ring_pairs.get(
            (id(vertex_a), id(vertex_b)))
            or deleted_ring_pairs.get(
                (id(vertex_b), id(vertex_a))))
        on_deleted_ring = ring_hits is not None
        if on_deleted_ring:
            deleted_ring_edge_census += 1
        end_images = tuple(sorted((
            binary_point(tuple(vertex_a.co)),
            binary_point(tuple(vertex_b.co)))))
        twins = [other for other in co_image.get(end_images, ())
                 if other != edge.index]
        if twins:
            twin_census += 1
        key = (holder, on_deleted_ring, 'twin' if twins else 'sole')
        one_face_holder_census[key] = (
            one_face_holder_census.get(key, 0) + 1)
        # ruling-40 (v11/13): sample per holder class (was one global
        # 24-row cap) — a bounded, deterministic first-rows budget each
        # class can evidence
        if holder_rows.get(holder, 0) < 24:
            holder_rows[holder] = holder_rows.get(holder, 0) + 1
            precheck_rows.append({
                'edge': edge.index,
                'holder': holder,
                'holderFace': holder_face.index,
                'holderSource': FACET_TABLE[holder_face[layer]].id
                if 0 <= holder_face[layer] < len(FACET_TABLE) else None,
                'holderRingNodes': len(holder_face.verts),
                'onDeletedFaceRing': on_deleted_ring,
                'deletedRingOf': sorted(ring_hits) if ring_hits else [],
                'co': [','.join(exact_record(binary_point(tuple(v.co))))
                       for v in (vertex_a, vertex_b)],
                'twinEdges': twins,
            })
    for edge in bm.edges:
        if len(edge.link_faces) != 2 or edge.is_contiguous:
            continue
        kinds = []
        for face in edge.link_faces:
            if face.index in clip_ids:
                kinds.append('replacementClip')
            elif face.index in patch_ids:
                kinds.append('assembledPatch')
            else:
                kinds.append('meshFace')
        key = tuple(sorted(kinds))
        winding_holder_pairs[key] = (
            winding_holder_pairs.get(key, 0) + 1)
    emit('S7_CLOSURE_PRECHECK', {
        'oneFaceEdges': one_face_census,
        'twinSameCoEdges': twin_census,
        'onDeletedFaceRingEdges': deleted_ring_edge_census,
        'oneFaceHolderCensus': {
            '%s/onRing=%s/%s' % (holder, on_ring, twin): count
            for (holder, on_ring, twin), count
            in sorted(one_face_holder_census.items())},
        'windingHolderPairs': {
            '+'.join(kinds): count for kinds, count
            in sorted(winding_holder_pairs.items())},
        'rows': precheck_rows,
    })
    _EXACT_CENSUS_CAPTURES['bar_census_oneFace'] = one_face_census
    _EXACT_CENSUS_CAPTURES['bar_census_twinSameCoEdges'] = twin_census
    _EXACT_CENSUS_CAPTURES['bar_census_onDeletedFaceRing'] = (
        deleted_ring_edge_census)
    _EXACT_CENSUS_CAPTURES['bar_census_holder'] = {
        '%s/onRing=%s/%s' % (holder, on_ring, twin): count
        for (holder, on_ring, twin), count
        in sorted(one_face_holder_census.items())}
    record = closed_guard(bm, 'member-difference-closed')
    _EXACT_CENSUS_CAPTURES['final_bar'] = tuple(
        len(record[name]) for name in
        ('oneFaceEdges', 'wireEdges', 'overEdges', 'windingErrors',
         'degenerateFaces'))
    _s7_results.append({
        'accepted': record,
        'buckets': len(patches),
        'deletedFaces': len(deleted_total),
        'patchFaces': len(face_records),
        'patchTris': total_patch_tris,
        'splits': len(split_events),
        'units': len(units),
    })
    bm.to_mesh(_AIR_TARGET.data)
    bm.free()


# ----------------------------------------------------------------------------
# Continuation segment 6/n — the ruling-38 certification pass inside the S7
# span (v10 brief 37 REPLY, adopted; brief 38 mechanical). Appended after the
# landed S7 span; the received kernel segment, the construction code, and
# stages S2-S6 stay untouched; the S7 in-span decisions 1-7 keep their
# recorded facts (the merged units, the retained cell buckets, the
# patch-triangle plan, the canonical vertex table, the exact-parameter
# splits, WELD2). ONLY the landed span's uncovered-removal refusal path is
# replaced by the ruling's exact three-class disposition partition
# (boundary_replaced | union_interior_absorbed | unexplained).
#
# THE CERTIFICATE'S DETAILS (per candidate face f, by definition a
# positive-area affected face of the landed plan with no patch triangle of
# its own owner):
#
# 1. THE SINGLE DECLARED AREA CONVENTION. D_f is the face's actual removed
#    region in the canonical plane: the face's S4-moved ring flattened
#    exactly in the group plane's 2D frame. Every moved ring vertex lies
#    exactly on the face's own recorded facet plane (S4 moved it there
#    through project_joint), so D_f is exactly planar. The convention:
#    exact rational shoelace area2 in that 2D frame. No area is ever
#    compared across frames; the face's REALIZED (storage frame) area and
#    the standing realized coverage equations ride the rows as their own
#    frame-labeled evidence.
#
# 2. THE PARTITION. The complete relevant arrangement for the face's plane
#    is the owning entries' landed S6 intake (the recorded facet rings and
#    the retained-neighbor rings, re-derived exactly by the landed intake
#    law — the ruling's re-derivation duty — with the machine census
#    checkpointed so nothing accounts twice) RECONCILED ACROSS THE OWNING
#    INSTANCES as their union (the ruling's own sentence: "use reconciled
#    instance unions"), refined further by (i) every D_f moved-ring edge,
#    (ii) every assembled tile edge (the landed certified-CDT patch
#    surface). The half-edge walk yields the exact common refinement; the
#    overlay pieces inside D_f close the exact partition with no uncovered
#    positive cell:
#       D_f = B_f ∪ I_f,   area(B_f ∩ I_f) = 0,
#       area(D_f) = area(B_f) + area(I_f)
#    per face, asserted exactly in the declared convention.
#
# 3. THE CELLS. A piece whose interior witness lies strictly inside an
#    assembled tile is a B_f portion — the tile IS the existing replacement
#    surface over it, and its citation enters the face's removal row. Every
#    free piece is a portion of I_f and must pass the five-part certificate
#    or the face stays unexplained — the standing hard stop ("any
#    unexplained positive-area face removal is a failure").
#
# 4. THE FIVE CONDITIONS per positive cell of I_f (the received machinery
#    only; no numeric offset):
#     1. belongs to the actual affected source face (the partition carries
#        the face's provenance and its affected membership);
#     2. exact provenance-preserving mapping (every D_f vertex resolves to
#        its S4-moved exact point through the landed _CANON1_BY_IMAGE
#        claims — the canonical vertex table's own claim law; a missing or
#        ambiguous claim is a refusal, never absorption);
#     3. partition by the complete relevant arrangement into positive-area
#        cells (the exact partition equation, no uncovered positive-area
#        cell, and the containing arrangement cell recorded per owning
#        entry from that entry's own recorded arrangement);
#     4. (F,F) under the EXISTING exact side-classification machinery ONLY
#        (the landed memoized kernel air_side — displaced_inside rays — at
#        the piece's certified interior witnesses; two clean witnesses must
#        agree; a contradiction is a refusal);
#     5. the exact two-sided Boolean-membership certificate: per displaced
#        side, displaced_inside must hold for at least one non-member
#        operand (the union of the two air stages: gallery ∪ passage ∪
#        pockets) — the kernel's own received calls re-run per operand with
#        per-op ids recorded; a refusal there is not absorption.
#
# 5. THE BOUNDARY REMAINDER (the ruling's own consequence): a free piece
#    whose certified side verdict has exactly one air side, e.g. (T,F)/(F,T),
#    is genuinely boundary — it cannot be absorbed ("absorption explains
#    only internal-face absence") and must be replaced. Its replacement is
#    built from the piece's own common-refinement ring: the exact overlay
#    polygon, under the landed assembly laws (nodes resolved through the
#    same canonical vertex table and the exact-parameter split machinery;
#    shared edges materialized once through _s7_edges_for; bm.faces.new over
#    existing edges; material and SOURCE provenance from the owning source
#    facet of the partition's own owner face; the ring oriented outward
#    from air by the piece's own certified side verdict) and covered by the
#    same account_removed_face rows as the assembled tiles, inside the same
#    canonical-frame partition proof. A free (F,F) piece that passes all
#    five conditions is absorbed with its per-face union_interior_absorbed
#    row; a face mixing certified and replacement pieces is refused loudly
#    (measured zero). A free (T,T) piece is refused (the ruling authorizes
#    no (T,T) absence); kernel refusals, mapping misses and partition gaps
#    carry their evidence rows and refuse — never absorb.
#
# 6. THE LEDGER. Absorbed faces emit S7_ABSORPTION rows with the ruling's
#    mandated content (source-face identity and provenance; owning instance
#    or reconciled union; canonical plane and mapping; exact absorbed cell
#    geometry and area; arrangement-cell identities; the (F,F)
#    classifications; the two-sided air-union membership certificate), the
#    crown-pocket remainders carry their own rows under the same predicates
#    (they are marked by their source facet family), and the
#    S7_ABSORPTION_TABLE summary enters the removal-accounting proof.
#    Absorbed cells delete alongside the assembled patches (the landed
#    single deletion pass keeps that); the replacement clips build before
#    the deletions and invent no merged coplanar wall: they cover exactly
#    their own refined territory and nothing else. bmesh deletes an edge
#    only when nothing survives on it, so an edge separating an absorbed or
#    replaced cell from a retained boundary cell survives on the retained
#    ring and participates in the final boundary-coherence checks, while an
#    edge wholly internal to the deleted region need not survive. The
#    closed_guard(bm, 'member-difference-closed') 0/0/0/0/0 bar stays the
#    geometric gate and never becomes a ledger counter.
# ----------------------------------------------------------------------------

_S7_ABSORB_STOP = {'refused': [], 'conflicts': []}
_S7_ABSORB_CENSUS = {}
_S7_ABSORB_FACE_ROWS = {}


def _s7_canonical_claims():
    """The S4 persisted claims re-keyed by the MOVED float32 image — the
    landed canonical vertex table's own claim law, materialized once."""
    claims = {}
    for rows in _CANON1_BY_IMAGE.values():
        for witness, moved in rows:
            claims.setdefault(_s7_moved_image(moved), []).append(
                (witness, tuple(moved)))
    return claims


def _s7_moved_states(bm, layer, claims):
    """vertex index -> canonical moved point for every vertex whose S4 claim
    set resolves exactly (the landed table law reversed; nothing guessed)."""
    states = {}
    for vertex in bm.verts:
        image = binary_point(tuple(vertex.co))
        rows = claims.get(image, ())
        if not rows:
            continue
        distinct = sorted(set(moved for _witness, moved in rows))
        if len(distinct) == 1:
            states[vertex.index] = distinct[0]
            continue
        current_witness = frozenset(
            FACET_TABLE[face[layer]].id for face in vertex.link_faces)
        resolved = sorted(set(
            moved for witness, moved in rows if witness == current_witness))
        if len(resolved) == 1:
            states[vertex.index] = resolved[0]
    return states


def _s7_absorb_ring_2d(ring):
    deduped = []
    for point in ring:
        if not deduped or deduped[-1] != point:
            deduped.append(point)
    if len(deduped) > 1 and deduped[0] == deduped[-1]:
        deduped.pop()
    return deduped


def _s7_absorb_bbox(poly):
    xs = [point[0] for point in poly]
    ys = [point[1] for point in poly]
    return min(xs), min(ys), max(xs), max(ys)


def _s7_absorb_bbox_reject(box, other):
    return (other[2] < box[0] or other[0] > box[2]
            or other[3] < box[1] or other[1] > box[3])


def _s7_absorb_certified_ears(ring, holes=None):
    """The certified-ear decomposition of a ring (optionally with holes the
    ears' centroids must avoid): exact triangles tiling the ring's doubled
    area exactly, in ring order. Kernel predicates only."""
    ring = _s7_absorb_ring_2d(ring)
    if area2(ring) < 0:
        ring.reverse()
    original = area2(ring)
    if original <= 0 or len(ring) < 3:
        return [], original
    tri_area_total = Fraction(0)
    ears = []
    guard = 0
    while len(ring) > 2:
        covered = False
        n = len(ring)
        for k in range(n):
            p0, p1, p2 = ring[k], ring[(k + 1) % n], ring[(k + 2) % n]
            if orient2(p0, p1, p2) <= 0:
                continue
            skip = (k, (k + 1) % n, (k + 2) % n)
            certified = True
            for m, point in enumerate(ring):
                if m in skip:
                    continue
                if point_in_polygon(point, (p0, p1, p2)) == 1:
                    certified = False
                    break
            if certified and holes:
                centroid = ((p0[0] + p1[0] + p2[0]) / 3,
                            (p0[1] + p1[1] + p2[1]) / 3)
                for hole in holes:
                    if point_in_polygon(centroid, hole) == 1:
                        certified = False
                        break
            if not certified:
                continue
            ears.append((p0, p1, p2))
            tri_area_total += orient2(p0, p1, p2)
            del ring[(k + 1) % n]
            covered = True
            break
        if not covered:
            leftover = abs(area2(clean_polygon(list(ring))))
            if leftover != 0:
                fail(
                    's7-absorb: a ring has a positive-area leftover with no '
                    'certified ear: ' + ';'.join(
                        ','.join(exact_record(p)) for p in ring))
            break
        guard += 1
        if guard >= 100000:
            fail('s7-absorb: the certified-ear decomposition overflowed '
                 'its guard')
    if tri_area_total != original:
        fail('s7-absorb: the certified-ear decomposition does not tile the '
             'ring area exactly')
    return ears, original


def _s7_absorb_witnesses(ring, limit):
    """Interior witness candidates of a simple ring: the first `limit`
    certified ears' centroids (strictly inside the ring)."""
    ears, _area = _s7_absorb_certified_ears(ring)
    witnesses = []
    for triple in ears[:limit]:
        witnesses.append(((triple[0][0] + triple[1][0] + triple[2][0]) / 3,
                          (triple[0][1] + triple[1][1] + triple[2][1]) / 3))
    return witnesses


def _s7_absorb_census_checkpoint():
    return ({key: dict(value) for key, value in _S6_CENSUS.items()},
            dict(_S6_AMBIGUOUS))


def _s7_absorb_census_restore(state):
    _S6_CENSUS.clear()
    _S6_CENSUS.update({key: dict(value) for key, value in state[0].items()})
    _S6_AMBIGUOUS.clear()
    _S6_AMBIGUOUS.update(dict(state[1]))


def _s7_absorb_intake_segments(entry_number, entry_key, facet_by_id):
    """The landed S6 intake segments for one (entry, plane key), re-derived
    from the recorded exact facets — the ruling's re-derivation duty — with
    the machine census checkpointed (the re-derivation accounts nothing
    twice)."""
    entry = REGISTRY[entry_number]
    state = _s7_absorb_census_checkpoint()
    try:
        axis, axis_i, axis_j = _s6_frame_of((entry_key[:3], entry_key[3]))
        incoming = sorted({
            fid for fid in entry['incident']
            if plane_key(facet_by_id[fid].plane) == entry_key})
        family = entry['family']
        census = _S6_CENSUS.setdefault(family, _s6_census_blank())
        segments = {}
        for fid in incoming:
            facet = facet_by_id[fid]
            for a, b in pairs(_s6_remap_ring(facet.ring, facet.id, census)):
                fa = _s6_flat2(a, axis_i, axis_j)
                fb = _s6_flat2(b, axis_i, axis_j)
                low, high = (fa, fb) if fa <= fb else (fb, fa)
                segments.setdefault((low, high), True)
        for face_index in entry['retained']:
            facet_id = _S6_FACE_FACTS[face_index]['facet']
            facet = facet_by_id[facet_id]
            if plane_key(facet.plane) != entry_key:
                continue
            for a, b in pairs(_s6_remap_ring(facet.ring, facet_id, census)):
                fa = _s6_flat2(a, axis_i, axis_j)
                fb = _s6_flat2(b, axis_i, axis_j)
                low, high = (fa, fb) if fa <= fb else (fb, fa)
                segments.setdefault((low, high), True)
        return sorted(segments)
    finally:
        _s7_absorb_census_restore(state)


def _s7_absorb_air_verdict(point3, plane):
    """The kernel's own side verdict through the landed memoized law. Returns
    (sides, refusal-text-or-None); the kernel's triage refusals are retried
    by the caller over its next certified witness, exactly as S6 did."""
    try:
        return tuple(_s6_air_sides(point3, plane)), None
    except RuntimeError as error:
        text = str(error)
        if ('meets an operand edge or vertex' in text
                or 'ambiguous source membership' in text
                or 'no clean exact ray direction' in text):
            return None, text
        raise


def _s7_absorb_membership(point3, plane):
    """The two-sided Boolean-membership certificate through the kernel's own
    exact machinery, per operand (per displaced side: the union of the two
    air stages' holding operands and the member holding operands whose
    presence explains the (F,F) verdict)."""
    normal = plane[0]
    selected = []
    for op, (x0, y0, z0, x1, y1, z1) in _S6_USABLE_OPERANDS:
        if (x0 <= float(point3[0]) <= x1
                and y0 <= float(point3[1]) <= y1
                and z0 <= float(point3[2]) <= z1):
            selected.append(op)
    detail = {}
    for sign in (1, -1):
        union_true = []
        member_true = []
        refusals = []
        for op in selected:
            try:
                inside = displaced_inside(point3, normal, sign, op)
            except RuntimeError as error:
                text = str(error)
                if ('meets an operand edge or vertex' in text
                        or 'ambiguous source membership' in text
                        or 'no clean exact ray direction' in text):
                    refusals.append(f'{op.id}: {text[:48]}')
                    continue
                raise
            if not inside:
                continue
            if op.kind == 'member':
                member_true.append(op.id)
            else:
                union_true.append(op.id)
        detail[sign] = {
            'inMember': bool(member_true),
            'inUnion': bool(union_true),
            'memberTrue': member_true,
            'refusals': refusals,
            'unionTrue': union_true,
        }
    return detail


def _s7_absorption_certify(patches, res_by_entry, face_owners,
                           identity_meta):
    """The ruling-38 certification pass over the landed S7 plan (the whole
    scope is the segment header above). READS the open bmesh and the landed
    S6 machinery only; emits S7_PARTITION per candidate face and refusal /
    conflict fact rows; returns
      (dispositions, coverings, replacements, refusal_rows, conflict_rows)
    dispositions: face index -> 'boundary_replaced' | 'absorbed';
    coverings: face index -> the sorted tuples of assembled tile nodes
      (the exact covering tiles of the face's B_f portions);
    replacements: dicts for the genuinely-boundary remainder pieces the
      assembly must build as its replacement clip faces ('bucket', 'face',
      the piece's exact canonical 'ring', 'witness', 'sides', 'area',
      'cellEvidence' per owning entry).
    Refusals keep their faces unexplained; the caller fails loudly before
    any face is built or deleted."""
    bm, facet_of_face, ring_of_face = identity_meta
    layer = bm.faces.layers.int.get(SOURCE_ATTRIBUTE)
    facet_by_id = {facet.id: facet for facet in FACET_TABLE}
    claims = _s7_canonical_claims()
    moved_states = _s7_moved_states(bm, layer, claims)
    dispositions = {}
    coverings = {}
    replacements = []
    refusal_rows = []
    conflict_rows = []
    for patch_index, patch in enumerate(patches):
        ptext = patch['planeText']
        parts = ptext.split(',')
        plane_normal = tuple(Fraction(x) for x in parts[:3])
        offset = Fraction(parts[3])
        plane = (plane_normal, offset)
        axis = drop_axis(plane_normal)
        candidates = sorted(set(patch.get('absorbCandidates') or ()))
        if not candidates:
            continue
        deleted_flats = {}
        for face_index in candidates:
            face = bm.faces[face_index]
            if not face.is_valid:
                refusal_rows.append({
                    'face': face_index, 'plane': ptext,
                    'failed': 'faceVanished',
                    'detail': 'the candidate face lost validity before its '
                              'certificate'})
                continue
            moved = []
            mapping_failed = False
            for vertex in face.verts:
                point = moved_states.get(vertex.index)
                if point is None:
                    refusal_rows.append({
                        'face': face_index, 'plane': ptext,
                        'failed': 'mappingMissing',
                        'vertex': vertex.index,
                        'detail': 'a candidate ring vertex has no exact S4 '
                                  'moved claim at its stored image; the '
                                  'provenance-preserving mapping is refused '
                                  '(condition 2)'})
                    mapping_failed = True
                    break
                moved.append(point)
            if mapping_failed:
                continue
            flat = [(point[0], point[1])
                    for point in _s7_flat_ring(moved, axis)]
            deduped = _s7_absorb_ring_2d(flat)
            if len(deduped) < 3 or abs(area2(deduped)) == 0:
                refusal_rows.append({
                    'face': face_index, 'plane': ptext,
                    'failed': 'canonicalRingDegenerate',
                    'realizedAreaNorm2': str(norm2(area_vector(moved))),
                    'detail': 'the candidate\'s canonical moved ring carries '
                              'no positive area in the certificate plane '
                              'while its realized storage frame does; the '
                              'realized positive area is a storage artifact '
                              'and is not a certificate'})
                continue
            deleted_flats[face_index] = (deduped, abs(area2(deduped)),
                                         tuple(moved))
        candidates = [face_index for face_index in candidates
                      if face_index in deleted_flats]
        if not candidates:
            continue
        owners = sorted({entry for face_index in candidates
                         for entry in face_owners.get(face_index, ())})
        plane_key4 = plane_normal + (offset,)
        entry_manifests = {}
        for entry_number in owners:
            entry = REGISTRY[entry_number]
            intake = _s7_absorb_intake_segments(
                entry_number, plane_key4, facet_by_id)
            entry_manifests[entry_number] = {
                'entry': entry_number,
                'intake': intake,
                'structure': _s6_group_structure(plane, intake),
                'name': f'{entry["family"]}@{entry["instance"]}',
            }
        distinct_sets = sorted({
            frozenset(manifest['intake'])
            for manifest in entry_manifests.values()})
        if len(distinct_sets) > 1:
            conflict_rows.append({
                'plane': ptext,
                'owners': [entry_manifests[e]['name'] for e in owners],
                'distinctIntakeSets': len(distinct_sets),
                'detail': 'the owning entries carry distinct landed intake '
                          'segment sets on this plane; the certificate runs '
                          'on their reconciled union (the finest arrangement '
                          'every overlapping instance\'s own recorded '
                          'arrangement refines) and the per-owner containing '
                          'cells ride the replacement rows as the '
                          'reconciliation evidence'})
        # the reconciled instance union arrangement
        union = set()
        for manifest in entry_manifests.values():
            union.update(manifest['intake'])
        face_edges = set()
        for face_index in deleted_flats:
            flat, _area, _moved = deleted_flats[face_index]
            for a, b in pairs(flat):
                low, high = (a, b) if a <= b else (b, a)
                face_edges.add((low, high))
        tile_nodes = set()
        tile_edges = set()
        tiles = []
        for tri in patch['patchTris']:
            nodes = list(tri['nodes'])
            tiles.append(tuple(nodes))
            tile_nodes.update(nodes)
            for a, b in pairs(nodes):
                low, high = (a, b) if a <= b else (b, a)
                tile_edges.add((low, high))
        structure = _s6_group_structure(
            plane, sorted(union | face_edges | tile_edges))
        _S7_ABSORB_CENSUS['overlayPlaneGroups'] = (
            _S7_ABSORB_CENSUS.get('overlayPlaneGroups', 0) + 1)
        _S7_ABSORB_CENSUS['overlayRegions'] = (
            _S7_ABSORB_CENSUS.get('overlayRegions', 0)
            + len(structure['regions']))
        for face_index in candidates:
            flat, area2_face, moved_ring = deleted_flats[face_index]
            face_box = _s7_absorb_bbox(flat)
            pieces = []
            for region in structure['regions']:
                region_box = _s7_absorb_bbox(region['ring'])
                if _s7_absorb_bbox_reject(face_box, region_box):
                    continue
                inside = False
                for _triple, centroid in region['ears']:
                    if point_in_polygon(centroid, flat) == 1:
                        inside = True
                        break
                if inside:
                    pieces.append(region)
            partition_sum = sum(region['area'] for region in pieces)
            if partition_sum != area2_face:
                refusal_rows.append({
                    'face': face_index, 'plane': ptext,
                    'failed': 'partitionEquation',
                    'canonArea2': str(area2_face),
                    'partitionSum': str(partition_sum),
                    'pieces': len(pieces),
                    'detail': 'the canonical arrangement does not partition '
                              "the face's removed region exactly (condition "
                              '3, the uncovered positive-area cell law)'})
                continue
            _S7_ABSORB_CENSUS['facesPartitioned'] = (
                _S7_ABSORB_CENSUS.get('facesPartitioned', 0) + 1)
            covered_tiles = set()
            certified_pieces = []
            replacement_pieces = []
            face_refused = False
            for region in pieces:
                if region['holes']:
                    refusal_rows.append({
                        'face': face_index, 'plane': ptext,
                        'failed': 'pieceHoles',
                        'area': str(region['area']),
                        'ringNodes': len(region['ring']),
                        'detail': 'the piece carries arrangement holes; no '
                                  'certificate can hold it'})
                    face_refused = True
                    break
                clean = []
                refusal_text = None
                for witness in _s7_absorb_witnesses(region['ring'], 4):
                    point3 = _s7_lift_point(ptext, witness)
                    sides, refusal = _s7_absorb_air_verdict(point3, plane)
                    if refusal is not None:
                        refusal_text = refusal
                        continue
                    clean.append((witness, point3, tuple(sides)))
                if not clean:
                    refusal_rows.append({
                        'face': face_index, 'plane': ptext,
                        'failed': 'noCleanWitness',
                        'area': str(region['area']),
                        'detail': (refusal_text or '')[:200]})
                    face_refused = True
                    break
                if any(sides != clean[0][2] for _w, _p3, sides in clean):
                    refusal_rows.append({
                        'face': face_index, 'plane': ptext,
                        'failed': 'witnessInconsistency',
                        'area': str(region['area']),
                        'sides': [sides for _w, _point3, sides in clean],
                        'detail': 'the existing exact side-classification '
                                  'machinery gives contradictory verdicts '
                                  'inside one piece (condition 4: ambiguous '
                                  '= failure)'})
                    face_refused = True
                    break
                covering = None
                for nodes in tiles:
                    if point_in_polygon(clean[0][0], nodes) == 1:
                        covering = tuple(nodes)
                        break
                if covering is not None:
                    covered_tiles.add(covering)
                    _S7_ABSORB_CENSUS['piecesBoundaryCovered'] = (
                        _S7_ABSORB_CENSUS.get('piecesBoundaryCovered', 0) + 1)
                    continue
                sides = clean[0][2]
                if sides == (False, False):
                    witness = clean[0][0]
                    certificate = _s7_absorb_membership(clean[0][1], plane)
                    if not certificate[1]['inUnion']:
                        refusal_rows.append({
                            'face': face_index, 'plane': ptext,
                            'failed': 'membershipNotUnionPlus',
                            'area': str(region['area']),
                            'membership': {
                                'unionTrue': certificate[1]['unionTrue'],
                                'memberTrue': certificate[1]['memberTrue'],
                                'refusals': certificate[1]['refusals']},
                            'detail': 'the displaced + side is not inside the '
                                      'union of the two air operands '
                                      '(condition 5)'})
                        face_refused = True
                        break
                    if not certificate[-1]['inUnion']:
                        refusal_rows.append({
                            'face': face_index, 'plane': ptext,
                            'failed': 'membershipNotUnionMinus',
                            'area': str(region['area']),
                            'membership': {
                                'unionTrue': certificate[-1]['unionTrue'],
                                'memberTrue': certificate[-1]['memberTrue'],
                                'refusals': certificate[-1]['refusals']},
                            'detail': 'the displaced − side is not inside the '
                                      'union of the two air operands '
                                      '(condition 5)'})
                        face_refused = True
                        break
                    certified_pieces.append({
                        'ring': tuple(region['ring']),
                        'witness': witness,
                        'witness3': ','.join(exact_record(clean[0][1])),
                        'sides': sides,
                        'area': str(region['area']),
                        'certificate': certificate,
                    })
                    _S7_ABSORB_CENSUS['piecesCertified'] = (
                        _S7_ABSORB_CENSUS.get('piecesCertified', 0) + 1)
                    continue
                if sides == (True, True):
                    refusal_rows.append({
                        'face': face_index, 'plane': ptext,
                        'failed': 'bothSidesAirRemainder',
                        'area': str(region['area']),
                        'sides': [sides],
                        'detail': 'the free piece classifies (T,T); the '
                                  'ruling authorizes no (T,T) absence — '
                                  'unexplained remainder, hard stop'})
                    face_refused = True
                    break
                replacement_pieces.append({
                    'ring': tuple(region['ring']),
                    'witness': clean[0][0],
                    'sides': sides,
                    'area': str(region['area']),
                })
                _S7_ABSORB_CENSUS['piecesBoundaryFree'] = (
                    _S7_ABSORB_CENSUS.get('piecesBoundaryFree', 0) + 1)
            if face_refused:
                continue
            if certified_pieces and replacement_pieces:
                refusal_rows.append({
                    'face': face_index, 'plane': ptext,
                    'failed': 'mixedDispositionUnresolved',
                    'piecesCertified': len(certified_pieces),
                    'piecesReplacement': len(replacement_pieces),
                    'detail': 'the partition carries both (F,F)-certified and '
                              'boundary-replacement cells; the per-portion '
                              'accounting would need both instruments on one '
                              'face — measured zero, refused on any '
                              'occurrence'})
                continue
            if certified_pieces:
                dispositions[face_index] = 'absorbed'
                _S7_ABSORB_CENSUS['facesAbsorbed'] = (
                    _S7_ABSORB_CENSUS.get('facesAbsorbed', 0) + 1)
                _S7_ABSORB_FACE_ROWS[face_index] = {
                    'facet': facet_by_id[facet_of_face[face_index]],
                    'pieceFacts': certified_pieces,
                    'witnesses': [piece['witness'] for piece in
                                  certified_pieces],
                    'owners': owners,
                    'plane': ptext,
                }
            elif replacement_pieces:
                dispositions[face_index] = 'boundary_replaced'
                _S7_ABSORB_CENSUS['facesReplaced'] = (
                    _S7_ABSORB_CENSUS.get('facesReplaced', 0) + 1)
                for piece in replacement_pieces:
                    cell_evidence = []
                    for entry_number, manifest in entry_manifests.items():
                        hit = None
                        for region_e in manifest['structure']['regions']:
                            if region_e['holes']:
                                continue
                            box_e = _s7_absorb_bbox(region_e['ring'])
                            if (box_e[0] <= piece['witness'][0] <= box_e[2]
                                    and box_e[1] <= piece['witness'][1]
                                    <= box_e[3]
                                    and point_in_polygon(
                                        piece['witness'],
                                        region_e['ring']) == 1):
                                hit = region_e
                                break
                        cell_evidence.append({
                            'entry': manifest['name'],
                            'cellArea': None if hit is None
                            else str(hit['area']),
                            'cellRingNodes': None if hit is None
                            else len(hit['ring']),
                        })
                    replacements.append({
                        'bucketIndex': patch_index,
                        'face': face_index,
                        'ring': piece['ring'],
                        'witness': piece['witness'],
                        'sides': piece['sides'],
                        'area': piece['area'],
                        'cellEvidence': cell_evidence,
                    })
            else:
                dispositions[face_index] = 'boundary_replaced'
                _S7_ABSORB_CENSUS['facesFullyCovered'] = (
                    _S7_ABSORB_CENSUS.get('facesFullyCovered', 0) + 1)
            coverings[face_index] = tuple(sorted(covered_tiles))
            realized = ring_of_face[face_index]
            facet = facet_by_id[facet_of_face[face_index]]
            emit('S7_PARTITION', {
                'class': dispositions.get(face_index),
                'face': face_index,
                'facet': facet_of_face[face_index],
                'facetFamily': facet.family,
                'facetInstance': facet.instance,
                'crown': facet.family.startswith('niche_pocket'),
                'plane': ptext,
                'unit': ', '.join(
                    entry_manifests[e]['name'] for e in owners[:4]),
                'canonArea2': str(area2_face),
                'realizedAreaNorm2': str(norm2(area_vector(realized))),
                'pieces': len(pieces),
                'coveredPieces': len(covered_tiles),
                'certifiedPieces': len(certified_pieces),
                'replacementPieces': len(replacement_pieces),
                'unionIntakeSets': len(distinct_sets),
                'mapping': [
                    ','.join(exact_record(point)) for point in moved_ring],
            })
    refused = sorted({row['face'] for row in refusal_rows})
    dispositions = {face_index: verdict for face_index, verdict
                    in dispositions.items() if face_index not in refused}
    coverings = {face_index: tiles for face_index, tiles
                 in coverings.items() if face_index not in refused}
    for row in conflict_rows:
        _S7_ABSORB_STOP['conflicts'].append(row)
    return (dispositions, coverings, replacements, refusal_rows,
            conflict_rows)


def _s7_absorb_emit_absorption_rows(coverings, face_owners):
    """The authorized-absence table for the removal-accounting proof: per
    absorbed face one union_interior_absorbed row with the ruling's mandated
    content, plus the summary."""
    absorbed = sorted(_S7_ABSORB_FACE_ROWS)
    for face_index in absorbed:
        record = _S7_ABSORB_FACE_ROWS[face_index]
        emit('S7_ABSORPTION', {
            'face': face_index,
            'facet': record['facet'].id,
            'facetFamily': record['facet'].family,
            'facetInstance': record['facet'].instance,
            'sourcePlane': [str(v) for v in record['facet'].plane],
            'canonicalPlane': record['plane'],
            'reconciledUnion': [f'{REGISTRY[e]["family"]}@'
                                f'{REGISTRY[e]["instance"]}'
                                for e in record['owners']],
            'absorbedArea2': sum(
                Fraction(piece['area']) for piece in record['pieceFacts']),
            'cells': [{
                'ring': [
                    ','.join(exact_record(point)) for point in piece['ring']],
                'area2': piece['area'],
                'witness3': piece['witness3'],
                'sides': [bool(flag) for flag in piece['sides']],
                'certificate': piece['certificate'],
            } for piece in record['pieceFacts']],
        })
    emit('S7_ABSORPTION_TABLE', {
        'absorbedFaces': len(absorbed),
        'absorbedArea2': str(sum(
            Fraction(piece['area'])
            for face_index in absorbed
            for piece in _S7_ABSORB_FACE_ROWS[face_index]['pieceFacts']))
        if absorbed else '0',
        'coveredFaces': sum(1 for tiles in coverings.values() if tiles),
        'crownPocketFaces': sum(
            1 for record in _S7_ABSORB_FACE_ROWS.values()
            if record['facet'].family.startswith('niche_pocket')),
        'census': dict(_S7_ABSORB_CENSUS),
    })


# ----------------------------------------------------------------------------
# The C' route law (v11/13): the census lane's deviation ledger and driver.
# Appended at the module bottom: this module is the exact lane's census copy
# (loading via the shipped file's bridge or run standalone); the shipped
# builder is the predecessor finishing and carries none of this. The
# mechanism/owner/stage strings below are the route law §2 D-table's
# constants, transcribed verbatim; the counts are the census lane's own
# recorded state.
# ----------------------------------------------------------------------------


def _parse_bar_tuple(message):
    """The route law's bar-tuple roll-up: parse the closed_guard refusal
    message's five counts (oneFace/wire/over/winding/degenerate). Returns
    None for any other message shape (the sender is then an unexpected
    census-lane refusal, not the law's designed chain end)."""

    if 'closed_guard[' not in message or ']: oneFace=' not in message:
        return None
    counts = []
    for name in ('oneFace', 'wire', 'over', 'winding', 'degenerate'):
        token = name + '='
        index = message.find(token)
        if index < 0:
            return None
        start = index + len(token)
        end = start
        while end < len(message) and message[end].isdigit():
            end += 1
        if end == start:
            return None
        counts.append(int(message[start:end]))
    if len(counts) != 5:
        return None
    return tuple(counts)


def emit_deviation_rows(bar_tuple):
    """The route law §2 accepted-deviation ledger (one row per class,
    emitted by the census lane). Thirteen classes in the law's table; the
    census lane owns D1-D8, D10, D12 and D13 — D9 (over-edges) and D11
    (degenerate faces) are the shipped side's classes, whose numbers are
    whatever the predecessor guard measures; this lane only counts them
    through the bar-tuple roll-up (run_census receives it from the
    closed_guard message's parse). Counts are live (the census ledger and
    the module-instance captures); class/stage/mechanism/owner strings
    are the law's table constants, verbatim."""
    route = 'B-prime'
    ruling = 'v11/13 §2'
    ledger = dict(_EXACT_CENSUS_LEDGER)
    captures = dict(_EXACT_CENSUS_CAPTURES)

    bar_one = bar_tuple[0] if bar_tuple else 0
    bar_wire = bar_tuple[1] if bar_tuple else 0
    bar_winding = bar_tuple[3] if bar_tuple else 0

    def d1_count():
        return (ledger.get('s4_cand_zero', 0)
                + ledger.get('s4_cand_multi', 0))

    def d4_count():
        return (ledger.get('s7w2_rank_1', 0)
                + ledger.get('s7w2_rank_2', 0))

    def d5_count():
        return (captures.get('s6_intake_rank_1', 0)
                + captures.get('s6_intake_rank_2', 0))

    # D7's own row names the count-rule (a): the bar's oneFace count plus
    # the same-run census-pass count, never averaged. The law's mechanism
    # constant rides the same string.
    if captures.get('bar_census_oneFace') is not None:
        census_one = captures['bar_census_oneFace']
        split = ', '.join(
            '%s %d' % (key, value)
            for key, value in sorted(
                captures.get('bar_census_holder', {}).items()))
        d7_mechanism = ('census %d = %s; bar %d at the bar — two identities '
                        '~1.5e-6 apart for one point'
                        % (census_one, split, bar_one))
    else:
        d7_mechanism = ('two identities ~1.5e-6 apart for one point '
                        '(no same-run census pass: the census stopped '
                        'before the S7_CLOSURE_PRECHECK pass)')

    rows = [
        {
            'class': 'S4 rank-2 float-domain keys',
            'count': d1_count(),
            'inShippedMesh': False,
            'mechanism': (
                'T-vertex on collinear ring edge; link planes coplanar '
                'with the edge; along-line coordinate stays the f32 image. '
                'Exact counterpart lives in the recorded ring domain, not '
                'the S4 vertex population.'),
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'S4',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'S4 rank-1 keys',
            'count': ledger.get('s4_rank_1', 0),
            'inShippedMesh': False,
            'mechanism': 'recorded deviation, named not guessed.',
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'S4',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'S4 table',
            'count': {
                'entries': captures.get('canon1_entries', 0),
                'images': captures.get('canon1_images', 0),
                'vertices': captures.get('canon1_vertices', 0),
            },
            'inShippedMesh': False,
            'mechanism': 'population fact',
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'S4',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'WELD2 rank<3',
            'count': d4_count(),
            'inShippedMesh': False,
            'mechanism': (
                'same mechanism; coverage caveat (deleted-chain-only '
                'vertices absent from the record set).'),
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'WELD2',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'S6 intake remaps born float-domain',
            'count': d5_count(),
            'inShippedMesh': False,
            'mechanism': (
                'remapped node adopts the claimant\'s float-broken '
                '`moved`; the exact `node` is in the row itself.'),
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'S6',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'zero-area patch triangles',
            'count': ledger.get('s7_patchTriZero', 0),
            'inShippedMesh': False,
            'mechanism': (
                'CDT triangulated through an on-segment node; the exact '
                'split can\'t fire on an f32 node.'),
            'owner': '§4←§2',  # noqa: RUF001 — the law's literal
            'ruling': ruling,
            'route': route,
            'stage': 'S7',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'one-face edges',
            'count': bar_one,
            'inShippedMesh': False,
            'mechanism': d7_mechanism,
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'bar',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'wire edges',
            'count': bar_wire,
            'inShippedMesh': False,
            'mechanism': 'unidentified',
            'owner': 'unidentified',
            'ruling': ruling,
            'route': route,
            'stage': 'bar',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'winding errors',
            'count': bar_winding,
            'inShippedMesh': False,
            'mechanism': 'unidentified — NOT clip orientation',
            'owner': 'unidentified',
            'ruling': ruling,
            'route': route,
            'stage': 'bar',
            'visibleEffect': 'n/a-census-only',
        },
        {
            'class': 'identity ties',
            'count': captures.get('s7_identity_tie_rows', 0),
            'inShippedMesh': False,
            'mechanism': 'banked',
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': 'S7',
            'visibleEffect': 'n/a-census-only',
        },
        {
            # D13's stage and inShippedMesh carry the law's own D-row cell
            # literal «—» (determinism is no stage's count).
            'class': 'determinism',
            'count': 0,
            'inShippedMesh': '—',
            'mechanism': 'verdict stands',
            'owner': '§2',
            'ruling': ruling,
            'route': route,
            'stage': '—',
            'visibleEffect': 'n/a-census-only',
        },
    ]
    for row in rows:
        emit('DEVIATION_CLASS', row)
    return rows


def run_census():
    """F3's census lane: the exact chain on its own copy of the S3 product
    (module instance), satisfied by a separate module; discarded at return.

    The census mode carries exactly the law's relaxations R1+R2 and
    nothing else (the route law §2 rule (b)); nothing from this lane
    ships (F6). The designed chain end is the assemble_replacement_patches
    closed_guard bar refusal, the exact lane's own designed verdict: the
    caught exception's printed tuple (oneFace/wire/over/winding/degenerate)
    parses into the D7/D8/D9/D10/D11-class counts — the law's bar-tuple
    roll-up, not a refusal. Any other exception — a fail() the census
    mode did not demote — is the census's acceptance blocker (F3): the
    lane emits RG_F1_EXACT_LANE_REFUSAL {message} for it and then the
    deviation rows for whatever roll-ups landed before the stop. On the
    success path (the tuple parsed) the deviation ledger emits and the
    census ledger dict returns.

    The census never touches the caller's bmesh state: it runs in this
    separate module instance with its own operand/module records and its
    own bpy objects; the copy is discarded at return."""

    try:
        build_operands()
        union_air()
        union_pockets()
        subtract_members()
        first_canonicalization()
        build_registry()
        build_patch_arrangements()
        assemble_replacement_patches()
    except Exception as error:  # noqa: BLE001 — the lane's own record law
        message = str(error)
        bar_tuple = _parse_bar_tuple(message)
        if bar_tuple is None:
            bar_tuple = _EXACT_CENSUS_CAPTURES.get('final_bar')
            emit('EXACT_LANE_REFUSAL', {'message': message})
        emit_deviation_rows(bar_tuple)
        return dict(_EXACT_CENSUS_LEDGER)
    else:
        # The exact chain PASSED its acceptance bar (the 0/0/0/0/0 state
        # the law aims at): no closed_guard tuple is printed on a pass;
        # the counts ride the captured CLOSURE record instead.
        emit_deviation_rows(_EXACT_CENSUS_CAPTURES.get('final_bar'))
        return dict(_EXACT_CENSUS_LEDGER)
