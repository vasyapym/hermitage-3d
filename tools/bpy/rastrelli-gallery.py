# RG-F1: the lit door and the order — Rastrelli Gallery.
# Blender 4.2.23 LTS. Implements the adopted east-end rebuild, white order,
# capitals/ressauts/bases/transverse arches, blind niche dressings, passage trims,
# floor frame, value split, smooth 16-segment shades, and build-side guards.
#
# Coordinates below are glTF world coordinates: +X east, +Y up, +Z south.
# Construction uses a CLOSED air volume. Closed architectural operands are
# subtracted, and closed niche pockets are united, with Blender's EXACT solver.
# Reversing the resulting boundary produces the visitor-facing shell. Operands
# are discarded: there are no exported member backs or covered host texels.
# "Closed member" therefore means a closed construction operand and a manifold
# member/host junction, NOT an independently capped solid hidden inside the wall.
#
# The square passage mouth is the only intentionally open shell boundary.
# Its construction cap is removed AFTER the closed-volume and facing checks.
# Legacy sconce openings are reported, not promoted to architectural exceptions.
#
# Lightmap footprints are aligned to the 64 x 64 ownership grid. A face may own
# multiple 16 px cells. Different faces never share an ownership cell. UV islands
# retain >= 2 px outer padding, >= 6 px inner dimensions, and >= 12 px/m.
# Empty cells inside a reserved rectangular footprint are not published as owned.
# The encode-side consumer uses only lm.cells; patches retains its legacy shape.
#
# STAGE_SPILL is applied by the fixture rigs in bake.py, not by this builder.
# A bake-only shadow-ray transparent branch preserves direct sun through the
# declared stairlight cards. Exported stairlight is non-emissive Principled.

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import tessellate_polygon
from mathutils.kdtree import KDTree

from fractions import Fraction  # F1'' splice: imports live here, not the top block, because the route-law splice adds exactly five regions (ruling v11/16)
import hashlib

ASSEMBLY_ROUTE = 'raw'  # ruling v11/16: C-double-prime "raw-ship" (F1''); selector {'predecessor', 'exact', 'raw'}; 'exact' = the census module's research lane


def _rg_f1_emit(kind, value):
    print('RG_F1_' + kind + ' ' + json.dumps(value, sort_keys=True, separators=(',', ':')), flush=True)

BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'rastrelli-gallery'
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

# Guard thresholds: weld <= 1e-7 m; face area > 1e-10 m²; normal length >
# 1e-8; facing samples +/- 1e-4 m; ray advancement 1e-7 m. Closed boundaries
# permit ZERO non-manifold or inconsistently wound edges. Final shell boundary
# exceptions must lie wholly on z=87.5 within 1e-6 m. Arch clearance >= 0.18 m.
# LINE_PERP_MAX: the conform's on-line test sits above bmesh's float32 noise
# (~4 ulps at 40 m spans measured 9.5e-7; a coincident vertex may sit another
# row's arithmetic path away), yet far below any 1e-2-scale profile step.
WELD_EPS = 1e-7
GEOM_EPS = 1e-6
FACE_AREA_MIN = 1e-10
NORMAL_MIN = 1e-8
FACING_OFFSET = 1e-4
RAY_ADVANCE = 1e-7
RAY_DISTANCE = 1000.0
RAY_MAX_HITS = 4096
CSG_OVERLAP = 0.02
LINE_PERP_MAX = 5e-6
ARCH_CLEARANCE_MIN = 0.18
RAY_DIRECTIONS = tuple(
    Vector(v).normalized()
    for v in ((0.937, 0.283, 0.207), (-0.317, 0.881, 0.351), (0.241, -0.413, 0.878))
)

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
# Re-measured integration correction (ROUNDS row 67): the reply's crown 3.38 cleared
# the adopted 0.18 m bound only at the arc nodes' endpoints and failed on the
# chord crossing (0.1727 < 0.18); crown 3.34 holds 0.18803 everywhere.
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


def fail(message):
    raise RuntimeError(f'{ROOM_ID}: {message}')


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


def to_b(p):
    return (p[0], -p[2], p[1])


def to_w(p):
    return (p[0], p[2], -p[1])


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


def area2(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))


def clean_polygon(poly):
    out = []
    for p in poly:
        p = (float(p[0]), float(p[1]))
        if not out or math.dist(p, out[-1]) > WELD_EPS:
            out.append(p)
    if len(out) > 1 and math.dist(out[0], out[-1]) <= WELD_EPS:
        out.pop()
    if len(out) < 3 or abs(area2(out)) <= FACE_AREA_MIN * 2:
        return []
    return out


def ccw(poly):
    poly = clean_polygon(list(poly))
    return poly if area2(poly) >= 0 else list(reversed(poly))


def rectangle(a, b, c, d):
    return [(a, c), (b, c), (b, d), (a, d)]


def halfplane(poly, a, b, inside=True):
    if not poly:
        return []

    def distance(p):
        value = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
        return value if inside else -value

    out = []
    previous = poly[-1]
    dp = distance(previous)
    for current in poly:
        dc = distance(current)
        if (dp >= 0.0) != (dc >= 0.0):
            t = dp / (dp - dc)
            out.append((previous[0] + t * (current[0] - previous[0]),
                        previous[1] + t * (current[1] - previous[1])))
        if dc >= 0.0:
            out.append(current)
        previous, dp = current, dc
    return clean_polygon(out)


def partition(poly, mask):
    remaining = poly
    outside = []
    mask = ccw(mask)
    for a, b in zip(mask, mask[1:] + mask[:1]):
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
            next_regions.extend((p, old_material) for p in outside)
            if intersection:
                next_regions.append((intersection, material_index))
        regions = next_regions
    return regions


class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.vertices = {}

    def vert(self, point):
        key = tuple(round(float(v), 8) for v in point)
        if key not in self.vertices:
            self.vertices[key] = self.bm.verts.new(to_b(key))
        return self.vertices[key]

    def face(self, points, material_index, smooth=False):
        verts = []
        for p in points:
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
        if len(set(verts)) < 3:
            return
        normal = Vector((0.0, 0.0, 0.0))
        for a, b in zip(verts, verts[1:] + verts[:1]):
            normal += a.co.cross(b.co)
        if normal.length <= FACE_AREA_MIN * 2:
            return
        try:
            face = self.bm.faces.new(verts)
        except ValueError as error:
            fail(f'duplicate construction face: {error}')
        face.material_index = material_index
        face.smooth = smooth

    def mesh(self, name, materials, closed=True):
        conform_edges(self.bm)
        bmesh.ops.recalc_face_normals(self.bm, faces=list(self.bm.faces))
        self.bm.normal_update()
        if closed:
            closed_guard(self.bm, name)
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
        if face.calc_area() <= FACE_AREA_MIN
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
    tagged = []
    for face in bm.faces:
        tagged.append((tuple((l.vert.co.copy(), l.vert) for l in face.loops),
                       face.material_index, face.smooth))
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
    for slots, material_index, smooth in tagged:
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
        rebuilt.append((cleaned, material_index, smooth))
    for verts, _material_index, _smooth in rebuilt:
        for i, vert in enumerate(verts):
            edge_for(vert, verts[(i + 1) % len(verts)])
    for verts, material_index, smooth in rebuilt:
        face = bm.faces.new(verts)
        face.material_index = material_index
        face.smooth = smooth
    bm.normal_update()


def edge_description(edge):
    return [tuple(round(c, 6) for c in to_w(v.co)) for v in edge.verts]


def closed_guard(bm, name):
    bad = [edge_description(e) for e in bm.edges if not e.is_manifold or not e.is_contiguous]
    tiny = [i for i, f in enumerate(bm.faces) if f.calc_area() <= FACE_AREA_MIN]
    if bad or tiny:
        fail(f'WATERTIGHT {name}: edges={bad}; degenerateFaces={tiny}')
    if bm.calc_volume(signed=True) <= FACE_AREA_MIN:
        fail(f'WATERTIGHT {name}: non-positive oriented volume')


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


def boolean_collection(target, operands, operation, label):
    if not operands.objects:
        return
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
    conform_edges(bm)
    closed_guard(bm, label)
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

    boolean_collection(target, operands, 'UNION', 'passage/gallery union')
    return target


def build_niches(target, materials):
    pockets = collection('_niche_pockets')
    for wall_index, (z, sign) in enumerate(((G_Z0, 1), (G_Z1, -1))):
        transform = frame('z', z, sign)
        for i, x in enumerate(NICHE_CENTRES):
            head = arc(x, NICHE_HEAD_R, NICHE_SPRING, NICHE_PEAK, NICHE_HEAD_SEGS)
            outline = [(x - 0.9, NICHE_SILL), (x + 0.9, NICHE_SILL)] + list(reversed(head))
            prism(f'NICHE_{wall_index}_{i}', outline,
                  -NICHE_RECESS, CSG_OVERLAP, transform, STUCCO, materials, pockets, back=PLASTER)
    boolean_collection(target, pockets, 'UNION', '22 blind niche pockets')


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
    boolean_collection(target, operands, 'DIFFERENCE', 'inline architectural members')


def volume_bvh(mesh):
    mesh.calc_loop_triangles()
    vertices = [Vector(to_w(v.co)) for v in mesh.vertices]
    triangles = [tuple(t.vertices) for t in mesh.loop_triangles]
    for i, (a, b, c) in enumerate(triangles):
        if (vertices[b] - vertices[a]).cross(vertices[c] - vertices[a]).length <= 2 * FACE_AREA_MIN:
            fail(f'degenerate reference triangle {i}')
    return BVHTree.FromPolygons(vertices, triangles, all_triangles=True, epsilon=0.0)


def inside_volume(tree, point):
    votes = []
    for direction in RAY_DIRECTIONS:
        origin = point.copy()
        hits = 0
        distance_left = RAY_DISTANCE
        for _ in range(RAY_MAX_HITS):
            hit, _normal, _index, distance = tree.ray_cast(origin, direction, distance_left)
            if hit is None:
                break
            hits += 1
            advance = distance + RAY_ADVANCE
            distance_left -= advance
            origin = hit + direction * RAY_ADVANCE
        else:
            fail('FACING ray exceeded 4096 intersections')
        if distance_left <= 0:
            fail('FACING ray exhausted its distance budget')
        votes.append(hits % 2 == 1)
    return sum(votes) >= 2


def facing_guard(mesh, tree):
    mesh.calc_loop_triangles()
    errors = []
    for triangle in mesh.loop_triangles:
        points = [Vector(to_w(mesh.vertices[i].co)) for i in triangle.vertices]
        normal = (points[1] - points[0]).cross(points[2] - points[0])
        if normal.length <= NORMAL_MIN:
            errors.append({'face': triangle.polygon_index, 'reason': 'degenerate normal'})
            continue
        normal.normalize()
        centre = sum(points, Vector()) / 3
        front = inside_volume(tree, centre + normal * FACING_OFFSET)
        back = inside_volume(tree, centre - normal * FACING_OFFSET)
        if not front or back:
            errors.append({
                'face': triangle.polygon_index,
                'material': mesh.materials[mesh.polygons[triangle.polygon_index].material_index].name,
                'centre': [round(v, 6) for v in centre],
                'frontInside': front,
                'backInside': back,
            })
    if errors:
        fail('FACING: ' + json.dumps(errors, sort_keys=True))


def shell_boundary_guard(bm):
    forbidden = []
    legacy = []
    for edge in bm.edges:
        if edge.is_manifold and edge.is_contiguous:
            continue
        if len(edge.link_faces) == 1 and all(
            abs(to_w(v.co)[2] - P_Z1) <= GEOM_EPS for v in edge.verts
        ):
            legacy.append(edge_description(edge))
        else:
            forbidden.append(edge_description(edge))
    if forbidden:
        fail('WATERTIGHT shell/new members: ' + json.dumps(forbidden))
    if not legacy:
        fail('square passage mouth was accidentally closed')
    print('RG_F1_LEGACY_OPEN_EDGES ' + json.dumps({'shellSquareMouth': legacy}), flush=True)


def prepare_shell(target):
    bm = bmesh.new()
    bm.from_mesh(target.data)
    bmesh.ops.dissolve_limit(
        bm, angle_limit=1e-7, use_dissolve_boundaries=False,
        verts=list(bm.verts), edges=list(bm.edges),
        delimit={'MATERIAL', 'NORMAL'},
    )
    conform_edges(bm)
    closed_guard(bm, 'completed air volume')
    bm.to_mesh(target.data)
    reference = volume_bvh(target.data)
    bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.normal_update()

    # A short construction extension lets square-mouth mouldings retain their
    # actual returned end faces at z=87.5, rather than clipping those caps away.
    bmesh.ops.bisect_plane(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        dist=WELD_EPS,
        plane_co=to_b((0, 0, P_Z1)),
        plane_no=to_b((0, 0, 1)),
        clear_outer=True,
        clear_inner=False,
    )
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
    conform_edges(bm)
    shell_boundary_guard(bm)
    bm.to_mesh(target.data)
    bm.free()
    facing_guard(target.data, reference)
    if any(
        p[0] < -4 - GEOM_EPS or p[0] > 44 + GEOM_EPS
        or p[1] < -GEOM_EPS or p[1] > 5 + GEOM_EPS
        or p[2] < 63.5 - GEOM_EPS or p[2] > 87.5 + GEOM_EPS
        for p in (to_w(v.co) for v in target.data.vertices)
    ):
        fail('contract bounds exceeded')
    return target.data


# ===========================================================================
# F1'/F2'/R3 additions (ruling v11/16, route C-double-prime, lane 1). The
# predecessor's prepare_shell above stays in-file verbatim as the record; the
# shipped mesh is prepare_shell_raw below — ITS finishing with the tolerance
# path removed (F6'):
#   - dissolve_limit is topology-only and is kept under I1-I3 (step 0 measured
#     bad=2 right after it — the two kissing edges; the tolerance path needed
#     a conform pass to reach bad=15, and conform is not run);
#   - the two conform_edges calls are dropped whole;
#   - the 'completed air volume' closed_guard refuses as the named counting
#     bar R3 (ship_accepts/ship_bar) instead of the binary tuple-less refuse.
#
# conform_edges / closed_guard site map under route 'raw' — never reached, so
# no wrapper is needed (the single pinned predicate IS ship_accepts):
#   conform_edges at Builder.mesh        — pred construction, not reached ('raw')
#   conform_edges at boolean_collection  — pred construction, not reached ('raw')
#   conform_edges at prepare_shell x2    — the record function, not called
#   closed_guard at Builder.mesh         — pred construction, not reached ('raw')
#   closed_guard at boolean_collection   — pred construction, not reached ('raw')
#   closed_guard at prepare_shell        — the record function, not called
#   shell_boundary_guard holds NO inner conform_edges/closed_guard call: it
#   stays verbatim untouched, and its own open-edge loop count feeds MOUTH.
#
# Pins: transcribed by the orchestrator from RG_F1_SHIP_PINS_CANDIDATE (the
# only allowed source) — v11/16 R3.
# ===========================================================================

HEAD_REF = 'a641ec7'  # the self-baseline commit (F4'; s41: its build is an older construction)

KISS_PINS = frozenset({  # transcribed by the orchestrator from RG_F1_SHIP_PINS_CANDIDATE (the only allowed source) — v11/16 R3 (s44-pinrun.log; the two raw over edges 4877/7273 — the law's expected candidates confirmed)
    ((Fraction(5033165, 1048576), Fraction(-76, 1), Fraction(3)),
     (Fraction(5033165, 1048576), Fraction(-2483159, 32768), Fraction(3))),
    ((Fraction(5033165, 1048576), Fraction(-2300969, 32768), Fraction(3)),
     (Fraction(5033165, 1048576), Fraction(-70, 1), Fraction(3))),
})  # noqa: E501
DEGEN_PINS = frozenset({  # transcribed same run: SEVEN zero-area faces by vertex-triple pins (the law's "count may read ≠6" case — the seventh is the identity-tie-class face the exact solver built exactly collapsed; D11's row names the definitional difference)
    ((Fraction(2097023, 524288), Fraction(-8328315, 131072), Fraction(11324621, 4194304)),
     (Fraction(2097023, 524288), Fraction(-8328315, 131072), Fraction(11324621, 4194304)),
     (Fraction(4, 1), Fraction(-8328315, 131072), Fraction(11324621, 4194304))),
    ((Fraction(8846311, 1048576), Fraction(-76, 1), Fraction(5, 2)),
     (Fraction(4438201, 524288), Fraction(-76, 1), Fraction(5230909, 2097152)),
     (Fraction(4438201, 524288), Fraction(-76, 1), Fraction(5230909, 2097152))),
    ((Fraction(8846311, 1048576), Fraction(-70, 1), Fraction(5, 2)),
     (Fraction(4438201, 524288), Fraction(-70, 1), Fraction(5230909, 2097152)),
     (Fraction(4438201, 524288), Fraction(-70, 1), Fraction(5230909, 2097152))),
    ((Fraction(4438201, 524288), Fraction(-76, 1), Fraction(5230909, 2097152)),
     (Fraction(4438201, 524288), Fraction(-76, 1), Fraction(5230909, 2097152)),
     (Fraction(9207457, 1048576), Fraction(-76, 1), Fraction(10198415, 4194304))),
    ((Fraction(4438201, 524288), Fraction(-70, 1), Fraction(5230909, 2097152)),
     (Fraction(4438201, 524288), Fraction(-70, 1), Fraction(5230909, 2097152)),
     (Fraction(9207457, 1048576), Fraction(-70, 1), Fraction(10198415, 4194304))),
    ((Fraction(638211, 16384), Fraction(-70, 1), Fraction(10457551, 4194304)),
     (Fraction(638211, 16384), Fraction(-70, 1), Fraction(653597, 262144)),
     (Fraction(160825, 4096), Fraction(-70, 1), Fraction(10198415, 4194304))),
    ((Fraction(1441767, 32768), Fraction(-9180283, 131072), Fraction(11324621, 4194304)),
     (Fraction(1441767, 32768), Fraction(-9180283, 131072), Fraction(11324621, 4194304)),
     (Fraction(44, 1), Fraction(-9180283, 131072), Fraction(11324621, 4194304))),
})  # noqa: E501

_RG_F1_RAW_CAPTURE = {}


def binary_point(point):
    # The exact storage image: Blender stores bmesh coordinates as float32,
    # so every component is exactly a binary rational — the same value the
    # exact module's RG_F1_RAW row prints in its co strings.
    return tuple(Fraction.from_float(float(v)) for v in point)


def edge_pin(edge):
    # v11/16 R3: the sorted pair of binary_point triples.
    return tuple(sorted(binary_point(v.co) for v in edge.verts))


def face_pin(face):
    # v11/16 R3: the sorted tuple of binary_point triples.
    return tuple(sorted(binary_point(v.co) for v in face.verts))


def _pin_json(pin):
    return [[str(coordinate) for coordinate in triple] for triple in pin]


def ship_classes(bm):
    # The R3 five classes on one mesh: oneFace/wire/over by link-face count,
    # winding by the 2-face non-contiguous edges, degenerate by the
    # predecessor's own tiny-face scale (FACE_AREA_MIN, the 1e-10 the
    # closed_guard's census used).
    return (
        [e for e in bm.edges if len(e.link_faces) == 1],
        [e for e in bm.edges if len(e.link_faces) == 0],
        [e for e in bm.edges if len(e.link_faces) > 2],
        [e for e in bm.edges if len(e.link_faces) == 2 and not e.is_contiguous],
        [f for f in bm.faces if f.calc_area() <= FACE_AREA_MIN],
    )


def ship_census(bm, BEFORE, V0):
    # The R3 census: the five classes + the BEFORE/V0 deltas (moved/added =
    # hand-over points the bar state does not carry; removedVerts = the
    # deletions dissolve removed, expected ~109: 5,655 -> 5,546).
    after = {binary_point(v.co) for v in bm.verts}
    return {
        'classes': ship_classes(bm),
        'movedVerts': len(after - BEFORE),
        'addedVerts': len(after - BEFORE),
        'removedVerts': len(BEFORE - after),
        'volume': bm.calc_volume(signed=True),
    }


def ship_accepts(bm, name, BEFORE, V0):
    # R3 — the single pinned predicate the demoted closed_guard sites route
    # through (v11/16). Hard: oneFace == wire == winding == [] (over and
    # degenerate are accepted only as the banked pin sets), no vertex moved
    # or added since the hand-over, volume preserved, V > 0.
    census = ship_census(bm, BEFORE, V0)
    one_face, wire, over, winding, degenerate = census['classes']
    return (
        not one_face and not wire and not winding
        and census['movedVerts'] == 0 and census['addedVerts'] == 0
        and abs(census['volume'] - V0) <= FACE_AREA_MIN
        and census['volume'] > 0
        and {edge_pin(e) for e in over} == set(KISS_PINS)
        and {face_pin(f) for f in degenerate} == set(DEGEN_PINS)
    )


def ship_bar(bm, name, BEFORE, V0):
    # The R3 counting bar at 'completed air volume' (F2' step 3): one row —
    # the full five-class census, both pin sets, the BEFORE/V0 deltas — plus
    # the banked-pin contract: with the pin constants unset this IS the
    # pin-emitting run, so the candidate emits and 'R3 pins unset' IS the
    # designed stop (the orchestrator transcribes the pins from that row,
    # the only allowed source, then the pair runs). Returns the census dict;
    # the D9/D11 rows are sourced from it (F3').
    census = ship_census(bm, BEFORE, V0)
    one_face, wire, over, winding, degenerate = census['classes']
    over_pins = _pin_json(sorted({edge_pin(e) for e in over}))
    degen_pins = _pin_json(sorted({face_pin(f) for f in degenerate}))
    volume_delta = abs(census['volume'] - V0)
    _rg_f1_emit('SHIP_BAR', {
        'stage': name,
        'oneFace': len(one_face),
        'wire': len(wire),
        'over': len(over),
        'winding': len(winding),
        'degenerate': len(degenerate),
        'overPins': over_pins,
        'degeneratePins': degen_pins,
        'movedVerts': census['movedVerts'],
        'addedVerts': census['addedVerts'],
        'removedVerts': census['removedVerts'],
        'volume': census['volume'],
        'volumeDelta': volume_delta,
    })
    if KISS_PINS == frozenset() and DEGEN_PINS == frozenset():
        _rg_f1_emit('SHIP_PINS_CANDIDATE', {
            'overPins': over_pins,
            'degeneratePins': degen_pins,
            'counts': {'oneFace': len(one_face), 'wire': len(wire),
                       'over': len(over), 'winding': len(winding),
                       'degenerate': len(degenerate),
                       'movedVerts': census['movedVerts'],
                       'addedVerts': census['addedVerts'],
                       'removedVerts': census['removedVerts'],
                       'volumeDelta': volume_delta},
            'volume': census['volume'],
        })
        if over_pins or degen_pins:
            fail('R3 pins unset')
    if not ship_accepts(bm, name, BEFORE, V0):
        fail('WATERTIGHT R3 ' + name + ': ' + json.dumps(
            {'oneFace': len(one_face), 'wire': len(wire), 'over': len(over),
             'winding': len(winding), 'degenerate': len(degenerate),
             'overPins': over_pins, 'degeneratePins': degen_pins,
             'movedVerts': census['movedVerts'],
             'addedVerts': census['addedVerts'],
             'removedVerts': census['removedVerts'],
             'volume': census['volume'], 'volumeDelta': volume_delta},
            sort_keys=True))
    return census


def _rg_f1_capture_raw(module, lane):
    # RG_F1_RAW_TWIN wiring (F1'/F4', v11/16): record the instance's own
    # RG_F1_RAW row body (its first RAW record — the S3 hand-over state) as
    # the exact emitted line text; when the census instance's RAW lands, the
    # one-row comparison emits — the ship instance's RAW byte-equal to the
    # census instance's RAW in the same run.
    original = module.emit

    def emit(kind, value):
        if kind == 'RAW' and _RG_F1_RAW_CAPTURE.get(lane) is None:
            _RG_F1_RAW_CAPTURE[lane] = json.dumps(
                value, sort_keys=True, separators=(',', ':'), allow_nan=False)
            if lane == 'census':
                _rg_f1_emit('RAW_TWIN', {
                    'equal': _RG_F1_RAW_CAPTURE.get('ship')
                    == _RG_F1_RAW_CAPTURE[lane]})
        return original(kind, value)

    module.emit = emit


def prepare_shell_raw(target):
    # F2' (ruling v11/16): the shipped mesh. prepare_shell above is the
    # verbatim record; this function keeps its step order with the tolerance
    # path removed (F6'): the topology-only dissolve_limit (kept or dropped
    # under I1-I3 on a copy), the R3 ship bar in place of the binary
    # closed_guard, then the predecessor's own to_mesh / volume_bvh /
    # reverse_faces / normal_update / z=87.5 mouth bisect / loose-vertex
    # delete sequence verbatim with NO conform_edges anywhere on this path,
    # then shell_boundary_guard verbatim, facing_guard, contract bounds, and
    # the law's row order to the tail.
    bm = bmesh.new()
    bm.from_mesh(target.data)
    # Step 1 (hand-over census): BEFORE is the S3 vertex set, V0 the S3
    # signed volume; both belong to the hand-over state for BOTH dissolve
    # outcomes (the row's removedVerts IS the count dissolve removed).
    BEFORE = {binary_point(v.co) for v in bm.verts}
    V0 = bm.calc_volume(signed=True)
    # Step 2 (dissolve_limit, kept|dropped): topology-only, but a deletion
    # cannot be un-deleted, so it runs on a copy and the I1-I3 evaluator
    # picks which state is the product: kept -> the dissolved copy continues
    # (the snapshot copy is discarded); dropped -> the copy is discarded and
    # the untouched hand-over state continues. The FINISH_STEPS row says
    # kept|dropped truthfully either way.
    trial = bm.copy()
    bmesh.ops.dissolve_limit(
        trial, angle_limit=1e-7, use_dissolve_boundaries=False,
        verts=list(trial.verts), edges=list(trial.edges),
        delimit={'MATERIAL', 'NORMAL'},
    )
    trial_after = {binary_point(v.co) for v in trial.verts}
    trial_volume = trial.calc_volume(signed=True)
    one_face, wire, _over, winding, _degenerate = ship_classes(trial)
    kept = (
        trial_after <= BEFORE                        # I1: movedVerts = addedVerts = 0
        and abs(trial_volume - V0) <= FACE_AREA_MIN  # I3: |V - V0| <= 1e-10
        and trial_volume > 0
        and not one_face and not wire and not winding  # R3 hard zeros
    )
    _rg_f1_emit('FINISH_STEPS', {
        'dissolve_limit': 'kept' if kept else 'dropped',
        'conform_edges': 'dropped',
        'closed_guard': 'R3',
    })
    if kept:
        shell = trial
        bm.free()
    else:
        shell = bm
        trial.free()
    # Step 3 (the R3 counting bar): the law's row order keeps FINISH_STEPS
    # immediately before SHIP_BAR.
    census = ship_bar(shell, 'completed air volume', BEFORE, V0)
    over_count = len(census['classes'][2])
    degenerate_count = len(census['classes'][4])
    degenerate_area = sum(f.calc_area() for f in census['classes'][4])
    # Steps 4-8: the predecessor's own sequence verbatim (F2' steps 4-8).
    shell.to_mesh(target.data)
    reference = volume_bvh(target.data)
    bmesh.ops.reverse_faces(shell, faces=list(shell.faces))
    shell.normal_update()

    # A short construction extension lets square-mouth mouldings retain their
    # actual returned end faces at z=87.5, rather than clipping those caps away.
    bmesh.ops.bisect_plane(
        shell,
        geom=list(shell.verts) + list(shell.edges) + list(shell.faces),
        dist=WELD_EPS,
        plane_co=to_b((0, 0, P_Z1)),
        plane_no=to_b((0, 0, 1)),
        clear_outer=True,
        clear_inner=False,
    )
    loose = [v for v in shell.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(shell, geom=loose, context='VERTS')
    # (F6') the predecessor's second conform_edges call is dropped wholesale.
    shell_boundary_guard(shell)
    # The guard's own open-edge loop count (F2' step 7): after the guard's
    # honest refusal logic has passed, every non-manifold edge left is a
    # mouth edge at z=87.5 — the same predicate the guard itself computes.
    authorized = sum(
        1 for e in shell.edges
        if not (e.is_manifold and e.is_contiguous)
        and len(e.link_faces) == 1
        and all(abs(to_w(v.co)[2] - P_Z1) <= GEOM_EPS for v in e.verts)
    )
    _rg_f1_emit('MOUTH', {'authorizedOpenEdges': authorized,
                          'looseDeleted': len(loose)})
    shell.to_mesh(target.data)
    shell.free()
    facing_guard(target.data, reference)
    if any(
        p[0] < -4 - GEOM_EPS or p[0] > 44 + GEOM_EPS
        or p[1] < -GEOM_EPS or p[1] > 5 + GEOM_EPS
        or p[2] < 63.5 - GEOM_EPS or p[2] > 87.5 + GEOM_EPS
        for p in (to_w(v.co) for v in target.data.vertices)
    ):
        fail('contract bounds exceeded')
    # The D9/D11 rows are the ship bar's (F3'): the counts are the bar's own
    # census, emitted after facing/contract per the law's row order.
    _rg_f1_emit('DEVIATION_CLASS', {
        'class': 'over-edges', 'stage': 'bar', 'count': over_count,
        'mechanism': 'kissing contact: two construction solids share an edge '
                     '(4 faces); closed mesh (oneFace=0) — not a hole',
        'owner': 'construction-era', 'inShippedMesh': True,
        'visibleEffect': 'none'})
    _rg_f1_emit('DEVIATION_CLASS', {
        'class': 'degenerate faces', 'stage': 'bar', 'count': degenerate_count,
        'mechanism': 'zero-area faces (area \u2264 1e-10) left by the exact '
                     'solver, \u03a3area emitted; kept because deleting them at '
                     'weld scale opens their unbound perimeters (measured 2\u219215)',
        'owner': 'construction-era', 'inShippedMesh': True,
        'visibleEffect': 'none'})
    _rg_f1_emit('VISIBLE', {'d9': 'closed + facing pass',
                            'd11': {'sumArea': degenerate_area}})
    return target.data


def face_key(face):
    return (face.material_index,
            tuple(sorted(tuple(round(c, 7) for c in v.co) for v in face.verts)))


def planar_uv(face):
    pairs = []
    for edge in face.edges:
        a, b = sorted((tuple(v.co) for v in edge.verts))
        pairs.append(((Vector(b) - Vector(a)).length_squared, a, b))
    _length, a, b = max(pairs)
    u = (Vector(b) - Vector(a)).normalized()
    v = face.normal.cross(u).normalized()
    return [(loop.vert.co.dot(u), loop.vert.co.dot(v)) for loop in face.loops]


def profile_uv(points, profile, lengths, across, along):
    if not all(
        profile[0][0] - GEOM_EPS <= p[across] <= profile[-1][0] + GEOM_EPS
        and abs(p[1] - interpolate(profile, p[across])) <= GEOM_EPS
        for p in points
    ):
        return None
    metric = [(p[0], length) for p, length in zip(profile, lengths)]
    return [(interpolate(metric, p[across]), p[along]) for p in points]


def albedo_uv(face, local_uv, object_name):
    if object_name != 'shell':
        return local_uv
    points = [to_w(loop.vert.co) for loop in face.loops]
    if all(p[0] >= G_X0 + G_REVEAL - GEOM_EPS for p in points):
        uv = profile_uv(points, G_ARC, G_ARC_M, 2, 0)
        if uv is not None:
            return uv
        uv = profile_uv(points, _RIB_PROFILE, arc_lengths(_RIB_PROFILE), 2, 0)
        if uv is not None:
            return uv
    if all(P_X0 - GEOM_EPS <= p[0] <= P_X1 + GEOM_EPS for p in points):
        uv = profile_uv(points, P_ARC, P_ARC_M, 0, 2)
        if uv is not None:
            return uv
    normal = Vector(to_w(face.normal))
    axis = max(range(3), key=lambda i: abs(normal[i]))
    axes = ((2, 1), (0, 2), (0, 1))[axis]
    return [(p[axes[0]], p[axes[1]]) for p in points]


def shelf_pack(sizes):
    placed = {}
    x, y, row_height = 0, LM_STRIP_ROWS, 0
    ordered = sorted(enumerate(sizes), key=lambda item: (-item[1][1], -item[1][0], item[0]))
    for index, (width, height) in ordered:
        if width > LM_GRID or height > LM_GRID - LM_STRIP_ROWS:
            return None
        if x + width > LM_GRID:
            x, y, row_height = 0, y + row_height, 0
        if y + height > LM_GRID:
            return None
        placed[index] = (x * LM_GRID_PX, y * LM_GRID_PX, width * LM_GRID_PX, height * LM_GRID_PX)
        x += width
        row_height = max(row_height, height)
    return placed


def count_overlaps(rects):
    items = sorted(rects)
    count = 0
    for i, (ax, ay, aw, ah) in enumerate(items):
        for bx, by, bw, bh in items[i + 1:]:
            if bx >= ax + aw:
                break
            if by < ay + ah and ay < by + bh:
                count += 1
    return count


def ownership_cells(poly, footprint):
    x, y, width, height = footprint
    triangles = tessellate_polygon([[Vector((u, v, 0)) for u, v in poly]])
    result = []
    for row in range(y // LM_GRID_PX, (y + height) // LM_GRID_PX):
        for col in range(x // LM_GRID_PX, (x + width) // LM_GRID_PX):
            left, top = col * LM_GRID_PX, row * LM_GRID_PX
            mask = rectangle(left - LM_PAD_PX, left + LM_GRID_PX + LM_PAD_PX,
                             top - LM_PAD_PX, top + LM_GRID_PX + LM_PAD_PX)
            if any(partition([(v.x, v.y) for v in triangle], mask)[1] for triangle in triangles):
                result.append(f'{col},{row}')
    if not result:
        fail('face received no ownership cells')
    return result


def finish(name, source, materials, strip=False):
    bm = bmesh.new()
    bm.from_mesh(source)
    bm.normal_update()
    bm.faces.sort(key=face_key)
    faces = list(bm.faces)
    planar = [planar_uv(face) for face in faces]
    extents = [
        (max(u for u, _v in uv) - min(u for u, _v in uv),
         max(v for _u, v in uv) - min(v for _u, v in uv))
        for uv in planar
    ]
    if any(min(du, dv) <= WELD_EPS for du, dv in extents):
        fail(f'{name}: degenerate UV extent')
    if strip:
        if len(faces) > LM_SCONCE_GRID * LM_STRIP_ROWS:
            fail('sconce strip capacity exceeded')
        placed = {i: ((i % 8) * 128, (i // 8) * 16, 128, 16) for i in range(len(faces))}
        px = LM_PX_PER_M
    else:
        placed = None
        for px in range(LM_PX_PER_M, PX_PER_M_FLOOR - 1, -1):
            sizes = [
                (math.ceil((max(LM_CELL_MIN_PX, math.ceil(du * px)) + 2 * LM_PAD_PX) / LM_GRID_PX),
                 math.ceil((max(LM_CELL_MIN_PX, math.ceil(dv * px)) + 2 * LM_PAD_PX) / LM_GRID_PX))
                for du, dv in extents
            ]
            placed = shelf_pack(sizes)
            if placed is not None:
                break
        if placed is None:
            fail('lm shelf cannot hold 12 px/m; apply the adopted cut order, never lower density')
        overlaps = count_overlaps(list(placed.values()))
        if overlaps:
            fail(f'{name}: {overlaps} overlapping lightmap footprints')
    uv_layer = bm.loops.layers.uv.new('uv')
    lm_layer = bm.loops.layers.uv.new('lm')
    cells = {}
    patches = {}
    door_faces = []
    lunette_faces = []
    minimum_inner = LM_RES
    minimum_density = float('inf')
    for i, (face, uv, (du, dv)) in enumerate(zip(faces, planar, extents)):
        x, y, width, height = placed[i]
        inner_width = min(width - 2 * LM_PAD_PX, LM_CELL_MAX_PX)
        inner_height = min(height - 2 * LM_PAD_PX, LM_CELL_MAX_PX)
        minimum_inner = min(minimum_inner, inner_width, inner_height)
        minimum_density = min(minimum_density, inner_width / du, inner_height / dv)
        if min(inner_width, inner_height) < LM_CELL_MIN_PX:
            fail(f'{name} face {i}: inner lightmap cell below 6 px')
        if min(inner_width / du, inner_height / dv) < PX_PER_M_FLOOR - GEOM_EPS:
            fail(f'{name} face {i}: actual island density below 12 px/m')
        left = x + (width - inner_width) / 2
        top = y + (height - inner_height) / 2
        u0, v0 = min(u for u, _v in uv), min(v for _u, v in uv)
        chart_poly = [(left + (u - u0) / du * inner_width,
                       top + (v - v0) / dv * inner_height) for u, v in uv]
        owner = {'object': name, 'material': materials[face.material_index].name}
        for key in ownership_cells(chart_poly, placed[i]):
            if key in cells:
                fail(f'ownership cell {key} assigned to multiple faces')
            cells[key] = owner
        tile = FLOOR_TILE_M if owner['material'] == 'stone_flags' else UV_TILE_M
        surface_uv = albedo_uv(face, uv, name)
        for loop, (u, v), (cu, cv) in zip(face.loops, surface_uv, chart_poly):
            loop[uv_layer].uv = (u / tile, v / tile)
            loop[lm_layer].uv = (cu / LM_RES, 1.0 - cv / LM_RES)
        if name == 'shell' and owner['material'] == 'stairlight':
            points = [to_w(vertex.co) for vertex in face.verts]
            if not all(abs(p[0] - G_X1) <= GEOM_EPS for p in points):
                fail('stairlight is not on the declared east closure plane')
            if all(p[1] <= DOOR_BAND_Y[0] + GEOM_EPS for p in points):
                door_faces.append(face)
            elif all(p[1] >= DOOR_BAND_Y[1] - GEOM_EPS for p in points):
                lunette_faces.append(face)
            else:
                fail('unexpected stairlight surface')
                continue
            patches['stairlight'] = list(placed[i])
    if name == 'shell':
        if len(door_faces) != 1 or len(door_faces[0].verts) != 4:
            fail('DOOR_CARD must be exactly one quad')
        expected = {(G_X1, y, z) for y in (0.0, 2.40) for z in (PORTAL_Z0, PORTAL_Z1)}
        actual = {tuple(round(c, 6) for c in to_w(v.co)) for v in door_faces[0].verts}
        if actual != expected:
            fail(f'DOOR_CARD bounds drift: {sorted(actual)}')
        if len(lunette_faces) != 1:
            fail('legacy stairlight patch requires one lunette back face')
    used = sum(w * h for _x, _y, w, h in placed.values()) / (LM_RES * LM_RES)
    if strip:
        block = {'mode': 'strip', 'grid': LM_SCONCE_GRID, 'cellPx': [128, 16],
                 'occupancy': round(used, 4), 'minCellPx': minimum_inner,
                 'faces': len(faces), 'v0': LM_STRIP_FRAC}
    else:
        block = {'mode': 'shelf', 'pxPerM': px, 'occupancy': round(used, 4),
                 'minCellPx': minimum_inner, 'faces': len(faces), 'stripRowPx': 128}
        block['overlapFaces'] = overlaps
        block['patches'] = patches
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for material_ in materials:
        mesh.materials.append(material_)
    mesh.calc_loop_triangles()
    print(f'RG_F1_LM {name}: faces={len(faces)} actualMinPxPerM={minimum_density:.6f}', flush=True)
    return mesh, len(mesh.loop_triangles), block, dict(sorted(cells.items()))


def build_shell(materials):
    # F2 construction splice (route law v11/13 C-prime, Lane 1): the shipped
    # S3 product comes from the exact chain's own S2-S3 span — the fresh
    # research module instance builds the operands, then drives its EXACT
    # Booleans (union_air -> union_pockets -> subtract_members). The chain
    # hands its bmesh state through the module's own targets:
    # build_operands sets _AIR_TARGET, and _finish_boolean_stage writes the
    # members-difference result into _AIR_TARGET.data — the predecessor's
    # own bmesh hand-off pattern (booleans write the opened result to the
    # target mesh datablock). No S4-S7 call runs on this side of the splice; the predecessor's OWN
    # post-difference finishing machinery (prepare_shell_raw, ruling v11/16:
    # dissolve kept|dropped + the R3 ship bar, mouth bisect, facing — the
    # conform/closed_guard tolerance path removed, F6'') takes
    # over from the members-difference state. The alternate
    # ASSEMBLY_ROUTE == 'exact' research path is not wired here: the exact
    # module stays in-file as the research record (F1) and runs only as the
    # census sidecar after the summary (F3).
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'rgf1_exact_build',
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     'rastrelli-gallery-exact.py'))
    exact = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exact)
    # F1'/F4' RAW_TWIN wiring: the SHIP instance's RG_F1_RAW row body is
    # captured here (the census bridge instance joins later in main()).
    _rg_f1_capture_raw(exact, 'ship')
    exact.build_operands()
    exact.union_air()
    exact.union_pockets()
    exact.subtract_members()
    target = exact._AIR_TARGET
    source = prepare_shell_raw(target)
    result = finish('shell', source, materials)
    bpy.data.objects.remove(target, do_unlink=True)
    if source.users == 0:
        bpy.data.meshes.remove(source)
    return result


def build_sconce(materials):
    b = Builder()

    def box(x0, x1, y0, y1, z0, z1):
        b.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], 0)
        b.face([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], 0)
        b.face([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], 0)
        b.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], 0)
        b.face([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], 0)

    box(-0.06, 0.06, -0.32, 0.18, 0.0, 0.03)
    box(-0.03, 0.03, 0.02, 0.10, 0.03, 0.24)
    rings = [
        [(r * math.cos(TAU * i / SCONCE_SEGS), y, 0.22 + r * math.sin(TAU * i / SCONCE_SEGS))
         for i in range(SCONCE_SEGS)]
        for y, r in ((0.10, 0.06), (0.38, 0.11))
    ]
    for i in range(SCONCE_SEGS):
        j = (i + 1) % SCONCE_SEGS
        b.face([rings[0][i], rings[1][i], rings[1][j], rings[0][j]], 1, smooth=True)
    b.face(rings[0], 1)
    source = b.mesh('_sconce_source', materials, closed=False)
    bm = bmesh.new()
    bm.from_mesh(source)
    legacy = [edge_description(e) for e in bm.edges if not e.is_manifold]
    print('RG_F1_LEGACY_OPEN_EDGES ' + json.dumps({'sconce': legacy}), flush=True)
    bm.free()
    result = finish('sconce', source, materials, strip=True)
    bpy.data.meshes.remove(source)
    return result


def hash_unit(x, y, salt=0):
    value = ((x * 0x1F123BB5) ^ (y * 0x5F356495) ^ salt) & 0xFFFFFFFF
    value ^= value >> 16
    value = (value * 0x7FEB352D) & 0xFFFFFFFF
    value ^= value >> 15
    value = (value * 0x846CA68B) & 0xFFFFFFFF
    value ^= value >> 16
    return value / 0xFFFFFFFF


def fine_grain(x, y):
    # Integer Fourier modes make a seamless 2 m tile. Wavelengths are
    # 2/sqrt(kx²+ky²) m: 1.5–3 cm, with no 0.1–0.3 m components.
    modes = ((73, 0), (0, 83), (64, 51), (43, -87), (97, 23), (31, 113))
    return sum(math.cos(TAU * (kx * x + ky * y) / TEX_RES + i * 0.73)
               for i, (kx, ky) in enumerate(modes)) / len(modes)


def plaster_pale_px(x, y):
    broad = (math.cos(TAU * 4 * x / TEX_RES)
             + math.cos(TAU * 4 * y / TEX_RES)
             + math.cos(TAU * (3 * x + 3 * y) / TEX_RES)) / 3
    delta = 0.025 * fine_grain(x, y) + 0.012 * broad
    return tuple(c + delta for c in PLASTER_PALE_RGB)


def stucco_grey_px(x, y):
    return tuple(c + 0.010 * fine_grain(x, y) for c in STUCCO_GREY_RGB)


def stone_band_px(x, y):
    delta = 0.02 * (2 * hash_unit(x, y, 0xB41D) - 1)
    return tuple(c + delta for c in STONE_BAND_RGB)


def stone_flags_px(x, y):
    fy = y / FLAG_PX
    row = int(fy)
    fx = x / FLAG_PX + (0.5 if row % 2 else 0.0)
    col = int(fx)
    u, v = fx - col, fy - row
    mortar = MORTAR_PX / FLAG_PX

    def phase(k, p):
        return TAU * k * p / TEX_RES

    grain = 0.03 * math.sin(phase(5, x)) * math.cos(phase(7, y))
    grain += 0.02 * math.sin(phase(3, x + y))
    if u < mortar or v < mortar:
        return tuple(c * (1.0 + grain) for c in MORTAR_RGB)
    ci, ri = col % 2, row % 2
    shade = 0.82 + 0.07 * math.sin(2.3 * ci + 1.7 * ri)
    shade += 0.05 * math.cos(0.9 * ci - 2.6 * ri)
    edge = min(u - mortar, v - mortar, 1 - u, 1 - v) / (1 - mortar)
    wear = 0.86 + 0.14 * min(1.0, edge * 8.0)
    delta = 0.05 * (2 * hash_unit(col % FLAGS_PER_TILE, row % FLAGS_PER_TILE, 0xF1A6) - 1)
    return tuple(c * shade * wear * (1 + grain) + delta for c in STONE_RGB)


def write_texture(name, painter, resolution, tex_dir):
    image = bpy.data.images.new(name, resolution, resolution, alpha=False)
    pixels = [1.0] * (resolution * resolution * 4)
    for y in range(resolution):
        for x in range(resolution):
            rgb = painter(x, y)
            index = 4 * (y * resolution + x)
            pixels[index:index + 3] = [max(0.0, min(1.0, c)) for c in rgb]
    image.pixels.foreach_set(pixels)
    path = os.path.join(tex_dir, f'{name}.png')
    image.filepath_raw = path
    image.file_format = 'PNG'
    image.save()
    return image, path


def material(name, rgb=None, image=None, roughness=0.92, emission=None):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    bsdf.inputs['Emission Color'].default_value = (0.0, 0.0, 0.0, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 0.0
    if image is not None:
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        uv = nodes.new('ShaderNodeUVMap')
        uv.uv_map = 'uv'
        links.new(uv.outputs['UV'], texture.inputs['Vector'])
        links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    if name == 'stairlight' and BAKE:
        ray = nodes.new('ShaderNodeLightPath')
        transparent = nodes.new('ShaderNodeBsdfTransparent')
        mix = nodes.new('ShaderNodeMixShader')
        links.new(ray.outputs['Is Shadow Ray'], mix.inputs[0])
        links.new(bsdf.outputs['BSDF'], mix.inputs[1])
        links.new(transparent.outputs['BSDF'], mix.inputs[2])
        links.new(mix.outputs[0], nodes['Material Output'].inputs['Surface'])
    return result


def instance(name, mesh, location, rot_y=0.0):
    obj = bpy.data.objects.new(name, mesh)
    obj.location = to_b(location)
    obj.rotation_euler = (0.0, 0.0, rot_y)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def main():
    _rg_f1_emit('ROUTE', {"route": "raw", "ruling": "v11/16 C-double-prime",
                          "exactLane": "census", "relaxations": ["R1", "R2"],
                          "shipRelaxations": ["R3"]})
    stage = stage_dir()
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    specifications = (
        ('stone_flags', stone_flags_px, FLOOR_TEX_RES),
        ('plaster_pale', plaster_pale_px, TEX_RES),
        ('stucco_grey', stucco_grey_px, TEX_RES),
        ('stone_band', stone_band_px, TEX_RES),
    )
    textures, materials = {}, {}
    for name, painter, resolution in specifications:
        image, path = write_texture(name, painter, resolution, tex_dir)
        textures[name] = path
        materials[name] = material(name, image=image)
    materials['stairlight'] = material('stairlight', rgb=(1.0, 1.0, 1.0), roughness=1.0)
    iron = material('iron_dark', rgb=IRON_RGB, roughness=IRON_ROUGHNESS)
    glow = material('sconce_glow', rgb=GLOW_TINT_RGB, emission=SCONCE_GLOW_RGB)

    shell_materials = [materials[name] for name in SHELL_MATERIAL_NAMES]
    shell, shell_tris, lm_shell, shell_cells = build_shell(shell_materials)
    sconce, sconce_tris, lm_strip, strip_cells = build_sconce([iron, glow])
    if set(shell_cells) & set(strip_cells):
        fail('shell/sconce ownership collision')
    instance('shell', shell, (0.0, 0.0, 0.0))
    for x in SCONCE_X:
        instance('sconce', sconce, (x, SCONCE_Y, G_Z0 + SCONCE_MOUNT_D))
        instance('sconce', sconce, (x, SCONCE_Y, G_Z1 - SCONCE_MOUNT_D), math.pi)
    for z in SCONCE_SEW_Z:
        instance('sconce', sconce, (P_X1, SCONCE_Y, z), -math.pi / 2)
    if BAKE:
        return
    glb_path = os.path.join(stage, f'{ROOM_ID}.raw.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    meshes = {
        'shell': {'triangles': shell_tris, 'instances': 1,
                  'primitives': len({p.material_index for p in shell.polygons})},
        'sconce': {'triangles': sconce_tris, 'instances': SCONCE_COUNT,
                   'primitives': len({p.material_index for p in sconce.polygons})},
    }
    if meshes['shell']['primitives'] != 5 or meshes['sconce']['primitives'] != 2:
        fail(f'material primitive roster drift: {meshes}')
    lm_block = dict(lm_shell)
    lm_block['strip'] = lm_strip
    lm_block['cells'] = dict(sorted({**shell_cells, **strip_cells}.items()))
    summary = {
        'room': ROOM_ID,
        'glb': glb_path,
        'textures': textures,
        'meshes': meshes,
        'triangles': sum(m['triangles'] * m['instances'] for m in meshes.values()),
        'trianglesUnique': sum(m['triangles'] for m in meshes.values()),
        'drawsNaive': sum(m['primitives'] * m['instances'] for m in meshes.values()),
        'drawsUniquePrimitives': sum(m['primitives'] for m in meshes.values()),
        'declared': {
            'bayPitchM': BAY_PITCH,
            'pilasters': PILASTER_COUNT,
            'sconces': SCONCE_COUNT,
            'sconceEmission': SCONCE_EMISSION,
            'sconceSegments': SCONCE_SEGS,
            'nicheCount': len(NICHE_CENTRES) * 2,
            'ribCount': len(PILASTER_X),
            'ribClearanceM': round(RIB_CLEARANCE_M, 6),
            'archClearanceMinM': ARCH_CLEARANCE_MIN,
            'doorJambWidthM': DOOR_JAMB_W,
            'lunetteRadiusM': LUNETTE_R,
            'doorCard': {'x': 44.0, 'z': [72.2, 73.8], 'y': [0.0, 2.40]},
            'passageVault': PASSAGE_VAULT,
            'galleryVault': GALLERY_VAULT,
            'uvTileM': UV_TILE_M,
            'floorTileM': FLOOR_TILE_M,
            'lmRes': LM_RES,
            'pxPerMFloor': PX_PER_M_FLOOR,
            'lmPadPx': LM_PAD_PX,
            'stageSpill': {'rgb': STAGE_SPILL_RGB,
                           'strength': STAGE_SPILL_STRENGTH,
                           'states': STAGE_SPILL_STATES,
                           'exportedStrength': 0.0},
        },
        'lm': lm_block,
    }
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as handle:
        json.dump(summary, handle, sort_keys=True, indent=2)
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')), flush=True)
    if ASSEMBLY_ROUTE in ('predecessor', 'raw'):
        # F1'' (v11/16): the shipped route is 'raw' and the census bridge
        # still belongs to the lane's row set — the gateway ('predecessor',
        # 'raw') keeps both laws' semantics, 'exact' excluded (the research
        # lane does not sidecar itself).
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            'rgf1_exact',
            os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         'rastrelli-gallery-exact.py'))
        module = importlib.util.module_from_spec(spec)
        # F1''/F4'' RAW_TWIN wiring: the census instance joins the ship
        # instance (captured in build_shell); the comparison row emits the
        # moment the census instance's own RG_F1_RAW lands (the bridge's
        # start), per the law's row ORDER section.
        _rg_f1_capture_raw(module, 'census')
        try:
            module.run_census()
        except Exception as error:  # the census is a sidecar: a hard stop
            # never blocks the shipped build (F3's REFUSAL is the record,
            # not a build gate)
            _rg_f1_emit('EXACT_LANE_REFUSAL',
                        {'message': '%s' % (error,)})
    if ASSEMBLY_ROUTE == 'raw':
        # F1''/F4'' (v11/16), the order section's tail rows: the
        # self-baseline diff (a finding row, never a gate) and the x2 pair's
        # gltf sha256 record (F5: sha recorded, not gated).
        _rg_f1_emit('BASELINE_DIFF', {
            'head': HEAD_REF,
            'shell': {'primitives': [4, meshes['shell']['primitives']],
                      'triangles': [3044, shell_tris]},
            'sconce': {'primitives': [2, meshes['sconce']['primitives']],
                       'instances': [SCONCE_COUNT, SCONCE_COUNT],
                       'triangles': [42, sconce_tris]},
            'cause': 'construction delta since HEAD; today\'s construction '
                     'does not build under the predecessor (s41)',
        })
        with open(glb_path, 'rb') as handle:
            _rg_f1_emit('GLTF_SHA256', {'path': glb_path,
                                        'sha256': hashlib.sha256(handle.read()).hexdigest()})


main()



