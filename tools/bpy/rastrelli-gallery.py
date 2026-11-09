# Zimny RG-F3 ("the courtyard's light and the order") - rastrelli-gallery kit
# (Blender 4.2 LTS, headless). Run by tools/asset.mjs `bpy rastrelli-gallery` (stem = room id
# verbatim). Deterministic: no randomness, every dimension is a constant below. World axes
# are glTF axes: +X east, +Z south (Palace Square side), -Z north, +Y up. Geometry is
# authored in world coordinates and converted to Blender space at vertex creation so
# export_yup gives them back.
# Writes:  <stage>/rastrelli-gallery.raw.glb
#          <stage>/tex/{stone_flags,plaster_pale,stucco_grey,stone_band}.png
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` stdout line.
# RG-F2 CONSTRUCTION LAW (the adopted verdict 2.1): the rg-e1 direct-assembly lineage, extended
# by direct polygon assembly only. (a) Every wall / vault / floor plane is ONE 2-D partition:
# the field polygons are cut around each applied element's footprint, no face is ever covered
# by another. (b) Every face is authored with its normal into the room air (the Builder sets
# the winding from the authored normal; FACING verifies it against the analytic air set).
# (c) Gates test only what the bake or the renderer consumes: FACING, COVERED, OVERLAP, CELL,
# BOUNDS, ROSTER, DETERMINISM. (d) The ELEMENT SCHEDULE is authored BEFORE geometry as
# formulas over the constants, published in summary.json, and a face count outside it fails
# the build. No booleans, no watertight law, no census, no pins.
# RG-F2 PALETTE (the value split): the whole order + vaults in white stucco over a warm
# limewash field with a dark stone base; texture NAMES kept, stone_band added (4 textures).
# RG-F2 EAST END: the x = 44 plane is one partition; 'stairlight' = the lunette half-disc
# (8 segs) and 'doorcard' = the 1.6 m x 2.40 m rectangle, both AT x = 44.0, both painted per
# published state at encode (tools/lm_compose.py + reencode); the bake world no longer enters.
# RG-F3 (the ruling's builder-header record): existing courtyard niche backs become declared
# panes without new faces. 'pane' and 'stairlight' ship non-emissive; bake.py supplies their
# separate bake-only terms.

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# Round 17a: tools/bpy/bake.py exec's this builder with ZIMNY_BAKE=1 — build the scene,
# skip the export + summary (the bake owns stdout and never writes the glb).
BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'rastrelli-gallery'
TAU = math.tau
GEOM_EPS = 1e-6
TOUCH_EPS = 1e-4  # (RG-F2) the COVERED gate's historical boundary slack; themeasured facts (the Sol gate round): the bmesh float32 half-ulp at the room'slargest coordinate magnitude 87.5 m is 3.8e-6 m per axis and the 1e-5 vert weldstores same-site verts EXACTLY equal, so the practical no-touch separation gridis 1e-5..1.4e-5 m (~7-10x) - NOT 10x of a ~5e-6 noise; and 1e-4 is 25x below thesmallest genuine double-cover (~2.5e-3 m), not 30x/40x. This slack dies with thegate replacement below (the full coplanar law replaces the whole span).
FACE_AREA_MIN = 1e-7
WELD_DP = 5        # vert() welds by rounded key: 1e-5 m
FACING_PROBE_M = 0.002  # centroid + 0.002 * n must lie inside the air set (gate FACING)
HOLE = -1          # painted_regions sentinel: the footprint of an applied element, nothing emitted


def fail(message):
    raise RuntimeError(f'rastrelli-gallery: {message}')


# ---- textures (tileable 512^2 albedos, procedural, sRGB-encoded values) ---------------------
TEX_RES = 512
UV_TILE_M = 2.0     # one tile covers 2 m x 2 m ('uv' layer, box/cyl projection, world metres)
LM_RES = 1536   # (RG-F2) the owner's ratified CELL-stop resolution (2026-11-08):
#   1024 -> 1536 after the Sol-9 STOP row; the px/m law >= 14 UNCHANGED (the
#   metric is atlas-independent); the pack law untouched
LM_PAD_PX = 2.0
LM_STRIP_FRAC = 0.875   # the reserved sconce strip: v in [0.875, 1) (the chart's
#   top rows 0..first_row-1; first_row = round((1 - LM_STRIP_FRAC) * LM_RES)
#   = 192 at this res)
LM_PX_PER_M = 20        # shelf law: start here, step down by 1 until the pack fits ...
LM_PX_PER_M_MIN = 14    # ... but never below this (gate CELL); cut T3/T2 before touching it
LM_CELL_MIN_PX = 6
LM_CELL_MAX_PX = 480
FLAGS_PER_TILE = 2      # 1.0 m flags, 12 px/m on the 2 m tile - unchanged
FLAG_PX = TEX_RES // FLAGS_PER_TILE
MORTAR_PX = 8
STONE_RGB = (0.56, 0.54, 0.50)
MORTAR_RGB = (0.34, 0.32, 0.29)
PLASTER_PALE_RGB = (0.72, 0.67, 0.58)   # the limewash field (verdict 2.3)
STUCCO_GREY_RGB = (0.88, 0.86, 0.82)    # the whole order + vaults: white stucco
STONE_BAND_RGB = (0.42, 0.40, 0.37)     # skirting, plinths, floor border + arch bands, threshold
IRON_RGB = (0.07, 0.065, 0.06)
IRON_ROUGHNESS = 0.55
GLOW_TINT_RGB = (0.38, 0.29, 0.22)
TEXTURE_NAMES = ('stone_flags', 'plaster_pale', 'stucco_grey', 'stone_band')

# shell material slots (6 primitives - RG-F3 adds the flat 'pane' slot) / sconce slots (2)
M_PALE, M_FLAGS, M_STUCCO, M_BAND, M_STAIR, M_PANE = 0, 1, 2, 3, 4, 5
S_IRON, S_GLOW = 0, 1

# ---- gallery proper (east of the arch passage), metres -------------------------------------
G_X0, G_X1 = 4.0, 44.0      # 40 m long; X 4.0..4.8 is the straight-soffit reveal into the passage
G_Z0, G_Z1 = 70.0, 76.0     # 6 m wide
G_ZC = 73.0
G_SPRING = 3.0
G_PEAK = 3.6
G_HALF = 3.0
G_REVEAL = 0.8
G_LEN_SEGS = 10
G_ARC_SEGS = 8
XS_G = [G_X0, G_X0 + G_REVEAL] + [
    G_X0 + G_REVEAL + (G_X1 - G_X0 - G_REVEAL) * k / G_LEN_SEGS for k in range(1, G_LEN_SEGS + 1)
]
XS_GI = XS_G[1:]

# ---- arch passage (part of this room's model) ----------------------------------------------
P_X0, P_X1 = -4.0, 4.0
P_Z0, P_Z1 = 63.5, 87.5     # Z 87.5 = facade arch plane (left OPEN)
P_SPRING = 3.0
P_PEAK = 5.0
P_HALF = 4.0
P_ARC_SEGS = 12
P_Z_NODES = (63.5, 66.75, 70.0, 73.0, 76.0, 79.8333, 83.6667, 87.5)
PASSAGE_VAULT = {'spanM': 8.0, 'springY': P_SPRING, 'peakY': P_PEAK, 'profile': 'semi-ellipse'}
GALLERY_VAULT = {'spanM': 6.0, 'springY': G_SPRING, 'peakY': G_PEAK, 'profile': 'semi-ellipse'}

# ---- the order (verdict 2.3) - profiles are (proud, y): proud = metres off the host plane
# into the air. Travel direction along a profile keeps the AIR on the right-hand side
# ((+proud) travel -> face normal -y; (+y) travel -> normal +proud; (-proud) travel -> +y).
CORNICE_PROFILE = (  # 8 points, (0, 2.70) -> y 3.00 and back to the wall (pinned here)
    (0.00, 2.70), (0.08, 2.70), (0.08, 2.78), (0.12, 2.78),
    (0.12, 2.86), (0.18, 2.86), (0.18, 3.00), (0.00, 3.00),
)
CORNICE_PROUD = max(d for d, _y in CORNICE_PROFILE)     # 0.17
RESSAUT_W, RESSAUT_D = 0.56, 0.10      # the cornice breaks forward over every pilaster
END_CORNICE_BREAK = 0.90               # the end wall carries the cornice only this far from each corner
SKIRTING_PROFILE = ((0.09, 0.00), (0.09, 0.11), (0.00, 0.14))   # stone_band, y 0..0.14
SKIRTING_PROUD = 0.09
BASE_PROFILE = (  # 5 points, floor -> the shaft face (proud 0.10) at y 0.30 (pinned here)
    (0.16, 0.00), (0.16, 0.15), (0.13, 0.15), (0.13, 0.26), (0.10, 0.30),
)
PLINTH_Y = 0.15          # BASE_PROFILE below this y is stone_band (the plinth), above it stucco
PLINTH_HALF_W = 0.28     # plinth 0.56 wide; base 0.50; shaft 0.40; abacus 0.56
BASE_HALF_W = 0.25
SHAFT_HALF_W, SHAFT_PROUD = 0.20, 0.10
SHAFT_Y0, SHAFT_Y1 = 0.30, 2.45
CAPITAL_PROFILE = (  # relative to the SHAFT face (verdict 2.3, pinned there)
    (0.00, 2.45), (0.02, 2.49), (0.05, 2.53), (0.05, 2.58), (0.08, 2.62), (0.08, 2.70),
)
ABACUS_HALF_W = 0.28
ARCH_WIDTH, ARCH_HALF, ARCH_SPRING, ARCH_CROWN, ARCH_SEGS = 0.44, 2.72, 3.00, 3.34, 8
FLOOR_BORDER = 0.30
FLOOR_ARCH_BAND = 0.44
NICHE_SURROUND_W, NICHE_SURROUND_D = 0.10, 0.03
SILL_LEDGE_L, SILL_LEDGE_D, SILL_Y0, SILL_Y1 = 2.00, 0.06, 0.84, 0.90
PASSAGE_IMPOST = ((0.00, 2.86), (0.06, 2.86), (0.06, 2.94), (0.12, 3.00))

# ---- pilasters: facade pitch, 11 per side + 2 corner returns on the east end wall ----------
BAY_PITCH = 3.387
PILASTERS_PER_SIDE = 11
PILASTER_X = tuple(G_X1 - BAY_PITCH * k for k in range(1, PILASTERS_PER_SIDE + 1))
CORNER_RETURN_Z = (70.45, 75.55)
PILASTER_COUNT = PILASTERS_PER_SIDE * 2 + len(CORNER_RETURN_Z)  # 24

# ---- sconces: 14 positions unchanged; SCONCE_SEGS 16 + smooth shade (verdict 2.3) ----------
SCONCE_X = tuple(PILASTER_X[k] for k in (0, 2, 4, 6, 8, 10))
SCONCE_MOUNT_D = 0.10
SCONCE_Y = 2.0
SCONCE_SEW_Z = (68.4, 77.6)
SCONCE_COUNT = len(SCONCE_X) * 2 + len(SCONCE_SEW_Z)   # 14
SCONCE_EMISSION = 6.0
SCONCE_GLOW_RGB = (1.0, 0.72, 0.42)
SCONCE_SEGS = 16
SCONCE_FACES = 5 + 5 + SCONCE_SEGS + 1        # back plate + arm (5 faces each) + shade + cap = 27
LM_SCONCE_GRID = math.ceil(math.sqrt(SCONCE_FACES))    # 6: the strip's equal-cell grid

# ---- wall niches, blind arches: 22 (11 per wall, one per bay) -------------------------------
NICHE_WIDTH = 1.80
NICHE_SILL = 0.90
NICHE_SPRING = 1.60
NICHE_HEAD_R = 0.90
NICHE_PEAK = NICHE_SPRING + NICHE_HEAD_R      # 2.50
NICHE_RECESS = 0.22
NICHE_HEAD_SEGS = 8
NICHE_CENTRES = tuple(G_X1 - BAY_PITCH * (k - 0.5) for k in range(1, PILASTERS_PER_SIDE + 1))
# (RG-F3) the NICHE_CENTRES order runs EAST -> WEST: k=1 x 42.3065 (the bay nearest the
# door) ... k=11 x 8.4365, one bay pitch 3.387 apart. The pane tags pane01..pane11 keep
# this k order (k=1 = the EAST-most bay).

# ---- east doorcase + stairlight lunette + door card, around the UNCHANGED opening ----------
PORTAL_X0, PORTAL_X1 = 43.2, 44.0
PORTAL_Z0, PORTAL_Z1 = 72.2, 73.8     # 1.6 m clear opening, centred on Z = 73
DOOR_JAMB_W = 0.25
DOOR_BAND_Y = (2.40, 2.70)
LUNETTE_R = 0.75                      # half-disc ON the x = 44 plane, centre (44, 2.70, 73): top 3.45
LUNETTE_SEGS = 8
ARCHIVOLT_W, ARCHIVOLT_D = 0.07, 0.04
STAIRLIGHT_PAINT = {  # declared record (the machine source is bake.py PANE_PAINT / lm_compose)
    'day': (0.55, 0.58, 0.62), 'dusk': (0.45, 0.32, 0.17), 'night': (0.60, 0.42, 0.22),
}
# (RG-F3) the declared panes' RAW paint record beside STAIRLIGHT_PAINT (the machine
# sources: tools/reencode.mjs PATCH_PAINTS - the encode paint; tools/bpy/bake.py
# STAGE_SPILL_PARTS - the spill rows). RAW triples are pane-specific: the door's x1.14
# calibration is NOT transferred (the stated largest value 0.740 stays under the
# bake-linear no-clip roof 0.8); night black = zero encoded pane light. Named *_RAW
# after bake.py's PANE_PAINT-style table so the exec namespace never shadows bake.py's
# own room-keyed PANE_PAINT record.
PANE_PAINT_RAW = {
    'day': (0.550, 0.650, 0.740), 'dusk': (0.360, 0.400, 0.460), 'night': (0.0, 0.0, 0.0),
}
CONTRACT_BOUNDS = ((-4.0, 0.0, 63.5), (44.0, 5.0, 87.5))


# ---- INT: stage-dir handoff. asset.mjs invokes `... -P <py> -- --room <id> --out <stage>`;
# also accepted: `--stage <dir>`, a bare positional path, or ZIMNY_STAGE_DIR (canary parity).
def stage_dir():
    argv = sys.argv
    if '--' in argv:
        rest = argv[argv.index('--') + 1 :]
        for flag in ('--out', '--stage'):
            if flag in rest:
                return rest[rest.index(flag) + 1]
        if rest and not rest[0].startswith('-'):
            return rest[0]
    env = os.environ.get('ZIMNY_STAGE_DIR')
    if env:
        return env
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def to_w(co):
    return (co.x, co.z, -co.y)


# ---- 2-D kit (HEAD's helpers, verbatim in behaviour) ---------------------------------------
def rectangle(a, b, c, d):
    return [(a, c), (b, c), (b, d), (a, d)]


def signed_area(poly):
    total = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        total += x0 * y1 - x1 * y0
    return 0.5 * total


def ccw(poly):
    return list(poly) if signed_area(poly) >= 0.0 else list(reversed(poly))


def clean_polygon(poly):
    out = []
    for p in poly:
        if not out or abs(p[0] - out[-1][0]) > GEOM_EPS or abs(p[1] - out[-1][1]) > GEOM_EPS:
            out.append(p)
    while len(out) > 1 and abs(out[0][0] - out[-1][0]) <= GEOM_EPS and abs(out[0][1] - out[-1][1]) <= GEOM_EPS:
        out.pop()
    if len(out) < 3 or abs(signed_area(out)) <= FACE_AREA_MIN:
        return []
    return out


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
    """Convex mask: returns (pieces outside the mask, the piece inside)."""
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
    """[(polygon, material)] - every applied (convex mask, material) cuts the field; HOLE
    regions are the applied elements' footprints and are dropped by the caller."""
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


def arc(c, half, spring, peak, segs):
    """Semi-elliptical profile as (across, up) pairs, spring -> peak -> spring."""
    return [
        (c - half * math.cos(math.pi * i / segs), spring + (peak - spring) * math.sin(math.pi * i / segs))
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


def head_arc(x_c, spring, r, segs):
    """A blind arch / lunette head: left spring -> peak -> right spring, (across, up)."""
    return arc(x_c, r, spring, spring + r, segs)


G_ARC = arc(G_ZC, G_HALF, G_SPRING, G_PEAK, G_ARC_SEGS)         # (z, y)
P_ARC = arc(0.0, P_HALF, P_SPRING, P_PEAK, P_ARC_SEGS)          # (x, y)
G_ARC_M = arc_lengths(G_ARC)
P_ARC_M = arc_lengths(P_ARC)
ARCH_PROFILE = arc(G_ZC, ARCH_HALF, ARCH_SPRING, ARCH_CROWN, ARCH_SEGS)  # (z, y) soffit


def vault_y_at(z):
    """The gallery vault's FACETED height at z (the host the arches must clear)."""
    return interpolate(G_ARC, z)


ARCH_CLEARANCE_M = min(vault_y_at(z) - y for z, y in ARCH_PROFILE)   # 0.188 (row 67)
if ARCH_CLEARANCE_M <= 0.0:
    fail(f'arch/vault clearance violated: {ARCH_CLEARANCE_M:.4f} m')


# ---- the analytic air set (gate FACING) ------------------------------------------------------
def gallery_air_y(z):
    u = (z - G_ZC) / G_HALF
    return G_SPRING + (G_PEAK - G_SPRING) * math.sqrt(max(0.0, 1.0 - u * u))


def passage_air_y(x):
    u = x / P_HALF
    return P_SPRING + (P_PEAK - P_SPRING) * math.sqrt(max(0.0, 1.0 - u * u))


NICHE_POCKETS = tuple(
    (x_c - NICHE_WIDTH / 2.0, x_c + NICHE_WIDTH / 2.0, NICHE_SILL, NICHE_PEAK,
     min(z_wall, z_wall + in_dir * NICHE_RECESS), max(z_wall, z_wall + in_dir * NICHE_RECESS))
    for z_wall, in_dir in ((G_Z0, -1.0), (G_Z1, 1.0))
    for x_c in NICHE_CENTRES
)


def air_contains(p):
    x, y, z = p
    if G_X0 < x < G_X1 and G_Z0 < z < G_Z1 and 0.0 < y < gallery_air_y(z):
        return True
    if P_X0 < x < P_X1 and P_Z0 < z < P_Z1 and 0.0 < y < passage_air_y(x):
        return True
    for x0, x1, y0, y1, z0, z1 in NICHE_POCKETS:
        if x0 < x < x1 and y0 < y < y1 and z0 < z < z1:
            return True
    return False


# ---- host planes: an axis-aligned plane with a 2-D (t, y) frame; d = metres INTO the air ----
class Plane:
    """axis 'z': wall at z = offset, t = x.  axis 'x': wall at x = offset, t = z.
    axis 'y': the floor at y = offset, frame (t = x, 'y' slot = z), d = up."""

    def __init__(self, name, axis, offset, sign):
        self.name, self.axis, self.offset, self.sign = name, axis, offset, sign

    def world(self, t, y, d=0.0):
        o = self.offset + self.sign * d
        if self.axis == 'z':
            return (t, y, o)
        if self.axis == 'x':
            return (o, y, t)
        return (t, o, y)

    def normal(self, d_comp=1.0, y_comp=0.0):
        """World direction with d_comp along the plane's into-air axis and y_comp up (or,
        on the floor plane, y_comp along +z)."""
        if self.axis == 'z':
            return (0.0, y_comp, self.sign * d_comp)
        if self.axis == 'x':
            return (self.sign * d_comp, y_comp, 0.0)
        return (0.0, self.sign * d_comp, y_comp)


# ---- the Builder: shared verts, authored normals, the element registry --------------------
class Builder:
    """Every face is recorded as (face, kind, uvmap, element) in creation order (the roster =
    the lightmap shelf's deterministic face index). The winding is set from the AUTHORED
    normal (rule b); kind 'cyl' carries per-vertex (u, v) metres for the cylindrical law."""

    def __init__(self):
        self.bm = bmesh.new()
        self.cache = {}
        self.roster = []
        self.tags = {}
        self.counts = {}

    def vert(self, p):
        key = (round(p[0], WELD_DP), round(p[1], WELD_DP), round(p[2], WELD_DP))
        v = self.cache.get(key)
        if v is None:
            v = self.bm.verts.new(to_b(key))
            self.cache[key] = v
        return v

    def face(self, pts, mat, element, normal, uid=None, tag=None, smooth=False):
        verts, maps = [], []
        for j, p in enumerate(pts):
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
                maps.append(None if uid is None else uid[j])
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
            maps.pop()
        if len(set(verts)) < 3:
            return None
        n = Vector((0.0, 0.0, 0.0))
        for a, b in zip(verts, verts[1:] + verts[:1]):
            n += a.co.cross(b.co)
        if n.length <= FACE_AREA_MIN * 2.0:
            return None  # a degenerate ring is dropped, never emitted
        if n.dot(Vector(to_b(normal))) < 0.0:
            verts.reverse()
            maps.reverse()
        try:
            f = self.bm.faces.new(verts)
        except ValueError as error:
            fail(f'duplicate construction face in {element}: {error}')
        f.material_index = mat
        f.smooth = smooth
        self.roster.append((f, 'cyl' if uid is not None else 'box',
                            maps if uid is not None else None, element))
        self.counts[element] = self.counts.get(element, 0) + 1
        if tag:
            self.tags[tag] = f
        return f

    def polygon(self, plane, poly, mat, element, d=0.0, tag=None):
        """One planar face on a host plane, normal = the plane's into-air axis."""
        return self.face([plane.world(t, y, d) for t, y in poly], mat, element, plane.normal(), tag=tag)

    def regions(self, plane, boundary, default_mat, layers, elements, d=0.0):
        """The plane's partition: field polygons cut around every mask; HOLE regions are the
        applied elements' footprints (nothing emitted there). elements: mat -> element name."""
        for poly, mat in painted_regions(boundary, default_mat, layers):
            if mat == HOLE:
                continue
            self.polygon(plane, poly, mat, elements[mat], d=d)

    def profile(self, plane, profile, t0, t1, mat_of, element_of):
        """A (proud, y) profile extruded along t0..t1 on a host plane; the air stays on the
        right-hand side of travel so each segment's normal is (dy, -dd) in (proud, y)."""
        for (d0, y0), (d1, y1) in zip(profile, profile[1:]):
            dd, dy = d1 - d0, y1 - y0
            if abs(dd) <= GEOM_EPS and abs(dy) <= GEOM_EPS:
                continue
            ym = (y0 + y1) / 2.0
            self.face(
                [plane.world(t0, y0, d0), plane.world(t1, y0, d0),
                 plane.world(t1, y1, d1), plane.world(t0, y1, d1)],
                mat_of(ym), element_of(ym), plane.normal(dy, -dd),
            )

    def profile_cap(self, plane, profile, t, outward_sign, mat, element):
        """The end face of an extruded profile at t: the polygon profile + the wall segment,
        normal along +-t (the plane's t axis)."""
        pts = [plane.world(t, y, d) for d, y in profile]
        if plane.axis == 'x':
            normal = (0.0, 0.0, outward_sign)
        else:
            normal = (outward_sign, 0.0, 0.0)
        return self.face(pts, mat, element, normal)

    def block(self, x0, x1, y0, y1, z0, z1, mat, element, skip=()):
        """An axis box with named sides; skip the sides that sit against a host (rule a:
        the host's field is cut around the footprint instead). Normals point OUT of the box."""
        sides = {
            '-x': (((x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)), (-1.0, 0.0, 0.0)),
            '+x': (((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)), (1.0, 0.0, 0.0)),
            '-y': (((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)), (0.0, -1.0, 0.0)),
            '+y': (((x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)), (0.0, 1.0, 0.0)),
            '-z': (((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)), (0.0, 0.0, -1.0)),
            '+z': (((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)), (0.0, 0.0, 1.0)),
        }
        for name, (pts, normal) in sides.items():
            if name not in skip:
                self.face(list(pts), mat, element, normal)

    def rows(self, rows, mat, element, normal_fn, uid_rows=None, smooth=False):
        """Quads between consecutive point rows; normal_fn(pts) -> the authored normal."""
        for si, (ra, rb) in enumerate(zip(rows, rows[1:])):
            for i in range(len(ra) - 1):
                pts = [ra[i], ra[i + 1], rb[i + 1], rb[i]]
                uid = None
                if uid_rows is not None:
                    ur, ub = uid_rows[si], uid_rows[si + 1]
                    uid = [ur[i], ur[i + 1], ub[i + 1], ub[i]]
                self.face(pts, mat, element, normal_fn(pts), uid=uid, smooth=smooth)


# ---- gates on authored data (rule c): FACING + COVERED -------------------------------------
def face_centroid_w(f):
    c = sum((v.co for v in f.verts), Vector()) / len(f.verts)
    return to_w(c)


def gate_facing(builder):
    offenders = {}
    for f, _kind, _uid, element in builder.roster:
        n = to_w(f.normal)
        cx, cy, cz = face_centroid_w(f)
        probe = (cx + FACING_PROBE_M * n[0], cy + FACING_PROBE_M * n[1], cz + FACING_PROBE_M * n[2])
        if not air_contains(probe):
            offenders.setdefault(element, []).append([round(v, 3) for v in probe])
    return offenders


# ---- the covered gate: the full coplanar-overlap law (the Sol amendment) -------------------
# Every face's plane is quantified from its own stored bmesh data - the non-unit normal is
# normalised, given a CANONICAL SIGN (the first nonzero component is forced positive), and
# rounded together with the plane offset d = n.v0 - and the faces group by that plane key.
# An explicit merge pass cures the one residual split mode: two true-equal planes whose
# float32 noise straddles a key quantum. Within a group the faces project into a stable
# orthonormal basis (u = the base axis least aligned with the normal, orthogonalised;
# v = n x u) and the footprints are compared DIMENSIONLESSLY (all distances divided by
# the group's projected diagonal). The band = COVERED_BAND_M / diag metres and is set
# from the measured storage reality, not from guesswork: bmesh stores float32 - the
# largest coordinate magnitude in this room is 87.5 (P_Z1), whose float32 half-ulp is
# 2^-17 / 2 = 3.8e-6 m per axis; the 1e-5 vert weld stores SAME-site vertices EXACTLY equal (one
# shared Builder cache), so legal-touch separations are exactly 0 or the 1e-5 grid
# (f32-compressed to 6e-6..1.4e-5 m) - the band is ~2-3x that largest legal separation
# and ~4700x below the smallest double-cover the law must fire on in this build (the
# demos' 0.14 m doorway overwrite). Facts frozen in rg-f2-amendments.md. The gate
# replaces the S1 axis-plane shortcut (_plane_key) wholesale: no coplanar family is
# exempt - the sloped vault/arch strips group by their own planes and pair-test like
# the axis-aligned ones.
COVERED_NORM_DP = 4     # the unit-normal key quantum (float32 normal noise ~1e-7: 3 orders clear)
COVERED_OFFSET_DP = 3   # the offset key quantum (offset noise ~2e-5 m at 87.5 m: 2 orders clear)
COVERED_NM = 1.6e-4     # the merge pass's per-component normal identity bound
COVERED_DM = 1.6e-3     # ... and the offset identity bound
COVERED_BAND_M = 3e-5   # the touch band in metres (the derivation above; frozen in the ledger)


def _canonical_plane(f):
    """The face's canonical plane: the unit normal with the first nonzero component
    forced positive, plus the rounded envelope (n, d). Returns (nx, ny, nz, d) or None."""
    n = f.normal
    length = n.length
    if length <= GEOM_EPS:
        return None
    nx, ny, nz = n.x / length, n.y / length, n.z / length
    for comp in (nx, ny, nz):
        if abs(comp) > 1e-6:
            if comp < 0.0:
                nx, ny, nz = -nx, -ny, -nz
            break
    v = f.verts[0].co
    d = nx * v.x + ny * v.y + nz * v.z
    return nx, ny, nz, d


def covered_groups(builder):
    """The canonical coplanar groups (the gate's whole test basis): exact (normal, offset)
    quantisation + the explicit merge pass, then per group the stable orthonormal basis
    and the DIMENSIONLESS projected footprints (divided by the group's diagonal).
    Returns [((nx, ny, nz), d, [(element, face), ...], [poly2d, ...], band), ...]."""
    raw = {}
    for f, _kind, _uid, element in builder.roster:
        plane = _canonical_plane(f)
        if plane is None:
            continue
        nx, ny, nz, d = plane
        key = (round(nx, COVERED_NORM_DP), round(ny, COVERED_NORM_DP),
               round(nz, COVERED_NORM_DP), round(d, COVERED_OFFSET_DP))
        raw.setdefault(key, []).append((element, f))
    keys = sorted(raw)
    true_plane = {k: _canonical_plane(raw[k][0][1]) for k in keys}
    parent = list(range(len(keys)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            nx_a, ny_a, nz_a, d_a = true_plane[keys[i]]
            nx_b, ny_b, nz_b, d_b = true_plane[keys[j]]
            if max(abs(nx_a - nx_b), abs(ny_a - ny_b), abs(nz_a - nz_b)) <= COVERED_NM \
                    and abs(d_a - d_b) <= COVERED_DM:
                ra, rb = find(i), find(j)
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
    merged = {}
    for index in range(len(keys)):
        merged.setdefault(find(index), []).extend(raw[keys[index]])
    groups = []
    for root in sorted(merged):
        members = merged[root]
        nx, ny, nz, d = true_plane[keys[root]]
        axis_values = (nx, ny, nz)
        e = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))[
            min(range(3), key=lambda c: abs(axis_values[c]))]
        dot = nx * e[0] + ny * e[1] + nz * e[2]
        u = (e[0] - nx * dot, e[1] - ny * dot, e[2] - nz * dot)
        u_len = math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2])
        u = (u[0] / u_len, u[1] / u_len, u[2] / u_len)
        v = (ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0])
        polys = []
        for _element, f in members:
            dps = []
            for vert in f.verts:
                co = vert.co
                dps.append((co.x * u[0] + co.y * u[1] + co.z * u[2],
                            co.x * v[0] + co.y * v[1] + co.z * v[2]))
            polys.append(dps)
        xs = [p[0] for poly in polys for p in poly]
        ys = [p[1] for poly in polys for p in poly]
        diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
        # all footprint distances become dimensionless: the metric band spans the tried
        # scale, the polys project into the same units.
        polys = [[(p[0] / diag, p[1] / diag) for p in poly] for poly in polys]
        groups.append(((nx, ny, nz), d, members, polys, COVERED_BAND_M / diag))
    return groups


def _inside_band(p, poly, band):
    """Strictly inside the projected polygon at the dimensionless touch band: any edge
    within band of p makes p boundary (outside). Legal adjacency shares EXACT verts
    (the one Builder weld cache), so the band only sweeps the residual storage noise."""
    x, y = p
    inside = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        ex, ey = x1 - x0, y1 - y0
        ee = ex * ex + ey * ey
        if ee <= 0.0:
            continue
        seg = ((x - x0) * ex + (y - y0) * ey) / ee
        seg = 0.0 if seg < 0.0 else (1.0 if seg > 1.0 else seg)
        if math.hypot(x - (x0 + seg * ex), y - (y0 + seg * ey)) <= band:
            return False
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * ex / ey:
            inside = not inside
    return inside


def _cross_band(p, q, r, s, band):
    """Proper crossing at the dimensionless touch band: both orientations are normalised
    to SIGNED DISTANCES (per edge's own length), so the band is length-true everywhere."""
    lpq = math.hypot(q[0] - p[0], q[1] - p[1]) or 1.0
    lrs = math.hypot(s[0] - r[0], s[1] - r[1]) or 1.0
    d1 = ((s[0] - r[0]) * (p[1] - r[1]) - (s[1] - r[1]) * (p[0] - r[0])) / lrs
    d2 = ((s[0] - r[0]) * (q[1] - r[1]) - (s[1] - r[1]) * (q[0] - r[0])) / lrs
    d3 = ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / lpq
    d4 = ((q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0])) / lpq
    return (d1 > band) != (d2 > band) and (d1 < -band) != (d2 < -band) \
        and (d3 > band) != (d4 > band) and (d3 < -band) != (d4 < -band)


def polys_overlap(a, b, band):
    """Dimensionless overlap over projected footprints: bbox cull, vertex AND edge-midpoint
    containment (both directions), proper crossings, then the exact shared-shape test -
    all inside the touch band. The midpoint probes close the pure-vertex blind ring: a
    piece wholly covered by a larger face whose own vertices all sit ON the cover's
    boundary (the doorway-field class the old axis gate passed)."""
    ax0, ax1 = min(p[0] for p in a), max(p[0] for p in a)
    ay0, ay1 = min(p[1] for p in a), max(p[1] for p in a)
    bx0, bx1 = min(p[0] for p in b), max(p[0] for p in b)
    by0, by1 = min(p[1] for p in b), max(p[1] for p in b)
    if ax1 <= bx0 + band or bx1 <= ax0 + band or ay1 <= by0 + band or by1 <= ay0 + band:
        return False
    def midpoints(poly):
        return [((p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0)
                for p, q in zip(poly, poly[1:] + poly[:1])]
    if any(_inside_band(p, b, band) for p in a + midpoints(a)):
        return True
    if any(_inside_band(p, a, band) for p in b + midpoints(b)):
        return True
    for i in range(len(a)):
        for j in range(len(b)):
            if _cross_band(a[i], a[(i + 1) % len(a)], b[j], b[(j + 1) % len(b)], band):
                return True
    same = {tuple(p) for p in a} == {tuple(p) for p in b}
    return same


def _plane_rep(n, d):
    for comp, axis in zip(n, ('x', 'y', 'z')):
        if abs(abs(comp) - 1.0) < 1e-3:
            return f'{axis}={d:.3f}'
    return f'{n[0]:.3f},{n[1]:.3f},{n[2]:.3f}|{d:.3f}'


def covered_face_pairs(builder):
    """Every overlapping coplanar pair with the concrete faces in hand - the gate's rows
    and the debug dump share this one enumeration (the full coplanar-overlap law)."""
    pairs = []
    for n, d, members, polys, band in covered_groups(builder):
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                if polys_overlap(polys[i], polys[j], band):
                    pairs.append((members[i][0], members[i][1], members[j][0],
                                  members[j][1], _plane_rep(n, d)))
    return pairs


def gate_covered(builder):
    """Zero pairs of coplanar faces (ANY plane orientation, canonical grouping; either
    normal sign folded by the canonical flip) with overlapping footprints - the §A12
    mechanism at the full law, tested on authored data."""
    return [[ea, eb, rep] for ea, _fa, eb, _fb, rep in covered_face_pairs(builder)]


# ---- procedural textures (HEAD's painter vocabulary; RG-F2 values) ---------------------------
def hash_unit(x, y, seed):
    value = (x * 374761393 + y * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    value ^= value >> 13
    value = (value * 1274126177) & 0xFFFFFFFF
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
    broad = (math.cos(TAU * 4 * x / TEX_RES) + math.cos(TAU * 4 * y / TEX_RES)
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


PAINTERS = {
    'stone_flags': stone_flags_px, 'plaster_pale': plaster_pale_px,
    'stucco_grey': stucco_grey_px, 'stone_band': stone_band_px,
}


def write_texture(name, painter, tex_dir):
    image = bpy.data.images.new(name, TEX_RES, TEX_RES, alpha=False)
    pixels = [1.0] * (TEX_RES * TEX_RES * 4)
    for y in range(TEX_RES):
        for x in range(TEX_RES):
            rgb = painter(x, y)
            index = 4 * (y * TEX_RES + x)
            pixels[index:index + 3] = [max(0.0, min(1.0, c)) for c in rgb]
    image.pixels.foreach_set(pixels)
    path = os.path.join(tex_dir, f'{name}.png')
    image.filepath_raw = path
    image.file_format = 'PNG'
    image.save()
    return image, path


def material(name, image):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    return mat


def flat_material(name, rgb, roughness, emission=None):
    """A Principled with no texture: base colour + roughness (+ optional glow emission).
    The declared bake-painted slots ship NON-emissive (strength 0.0) and their separate
    bake-only terms are supplied by bake.py by material name: 'stairlight' via the
    STAGE_SPILL row (RG-F2, verdict 2.2), 'pane' via the parallel STAGE_SPILL_PARTS rows
    applied post-scan (RG-F3 - the builder-header record's flat-material sentence)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    return mat
# ---- THE ELEMENT SCHEDULE (authored before geometry) ----------------------------------------
# A schedule entry is a FORMULA over the constants, or the size of a pure 2-D plan (the same
# polygons the emitters consume). finish() fails on any element whose emitted count differs.
SKIRTING_TOP = SKIRTING_PROFILE[-1][1]     # 0.14
CORNICE_Y0 = CORNICE_PROFILE[0][1]         # 2.70
IMPOST_PROFILE = tuple(PASSAGE_IMPOST) + ((0.00, P_SPRING),)
RESSAUT_PROFILE = tuple((d + RESSAUT_D if d > GEOM_EPS else 0.0, y) for d, y in CORNICE_PROFILE)
RESSAUT_HALF_W = RESSAUT_W / 2.0
RESSAUT_PROUD = CORNICE_PROUD + RESSAUT_D  # 0.28 = the arch foot (G_ZC - ARCH_HALF - G_Z0)
ARCH_HALF_W = ARCH_WIDTH / 2.0
SILL_HALF_L = SILL_LEDGE_L / 2.0
NICHE_OUTER_R = NICHE_HEAD_R + NICHE_SURROUND_W    # 1.00
NICHE_HALF_W = NICHE_WIDTH / 2.0                    # 0.90
PILASTER_FACES = (1 + 4 + 2) + (3 + 2 + 2) + 3 + (5 + 10)    # 32
NICHE_FACES = 1 + (1 + 2 + NICHE_HEAD_SEGS) + (2 + NICHE_HEAD_SEGS) + (2 + NICHE_HEAD_SEGS) + 7
CORNICE_SEGS = len(CORNICE_PROFILE) - 1     # 7
LONG_WALL_SPANS = PILASTERS_PER_SIDE + 1    # 12
if abs(RESSAUT_PROUD - (G_ZC - ARCH_HALF - G_Z0)) > 1e-9:
    fail('the arch foot must land on the ressaut top edge (RESSAUT_PROUD == G_ZC - ARCH_HALF - G_Z0)')
if abs(CORNICE_PROUD - (SHAFT_PROUD + CAPITAL_PROFILE[-1][0])) > 1e-9:
    fail('the ressaut soffit must equal the abacus top (CORNICE_PROUD == abacus proud)')


def author_schedule():
    plans = {
        'wall.field': sum(len(plan_long_wall(z)) for z in (G_Z0, G_Z1)),
        'wall.e': len(plan_end_wall()),
    }
    floor = plan_floor()
    plans['floor.flags'] = sum(1 for _p, mat in floor if mat == M_FLAGS)
    plans['floor.band'] = sum(1 for _p, mat in floor if mat == M_BAND)
    return {
        **plans,
        'passage.field': 4,
        'tympanum': 2,
        'pilaster': PILASTER_COUNT * PILASTER_FACES,
        'ressaut': PILASTERS_PER_SIDE * 2 * (5 + 2 + 2) + len(CORNER_RETURN_Z) * (5 + 2 + 1),
        # (RG-F2) the corner L-cut splits the end-repair treads into front+flank (+4;
        # the corner runs' 2.86 and 3.00 treads), while the internally mitred end
        # runs' 0.18-risers die whole at the 45-seam (-2): net +2 against the draft.
        'cornice': 2 * (LONG_WALL_SPANS * CORNICE_SEGS + 1) + 2 * (2 * CORNICE_SEGS + 1) + 2,
        'skirting': 2 * (LONG_WALL_SPANS * 2) + 4 * 2 + 4 * 2,
        'niche': len(NICHE_CENTRES) * 2 * NICHE_FACES,
        # (RG-F2) the vault's bays are LONG_WALL_SPANS (12: the cuts are XS_GI[0], the
        # 22 arch edges and G_X1), not 11: the draft formula missed the west reveal bay.
        'vault.gallery': (PILASTERS_PER_SIDE + 1) * G_ARC_SEGS,
        'vault.reveal': 1,
        'vault.passage': (len(P_Z_NODES) - 1) * P_ARC_SEGS,
        'arch': PILASTERS_PER_SIDE * (ARCH_SEGS + 2),
        'impost': (len(IMPOST_PROFILE) - 1) * 4 + 2,
        'doorcase': DOORCASE_FACES,   # S3
        'stairlight': 1,
        'doorcard': 1,
    }


# ---- host planes ------------------------------------------------------------------------------
WALL_S = Plane('wall.s', 'z', G_Z0, 1.0)
WALL_N = Plane('wall.n', 'z', G_Z1, -1.0)
WALL_E = Plane('wall.e', 'x', G_X1, -1.0)
FLOOR = Plane('floor', 'y', 0.0, 1.0)
PWALL_W = Plane('passage.w', 'x', P_X0, 1.0)
PWALL_E = Plane('passage.e', 'x', P_X1, -1.0)
PWALL_N = Plane('passage.n', 'z', P_Z0, 1.0)
UP = (0.0, 1.0, 0.0)


def t_dir(plane, sign):
    """World direction of the plane's t axis (x for z-walls, z for x-walls, x for the floor)."""
    return (0.0, 0.0, sign) if plane.axis == 'x' else (sign, 0.0, 0.0)


def _sh_keep(pts, keep):
    """(RG-F2 amendment helper) Sutherland-Hodgman against one half-plane; keep(p)
    returns the SIGNED line value (>= 0 kept), so axis-aligned and diagonal planes
    share the one clipper."""
    out = []
    n = len(pts)
    for i in range(n):
        p, q = pts[i], pts[(i + 1) % n]
        pv, qv = keep(p), keep(q)
        if pv >= 0.0:
            out.append(p)
        if (pv >= 0.0) != (qv >= 0.0):
            f = pv / (pv - qv)
            out.append((p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])))
    return out


def _l_cut(poly, tc, dc):
    """(RG-F2 amendment helper) the kept ring minus {t >= tc} x {d >= dc}: the
    forward corner block's front and flank keep pieces."""
    front = clean_polygon(_sh_keep(poly, lambda p: tc - p[0]))
    band = _sh_keep(poly, lambda p: dc - p[1])
    flank = clean_polygon(_sh_keep(band, lambda p: p[0] - tc))
    return front, flank


def profile_run(b, plane, prof, t0, t1, mat_of, element_of, mitre0=0, mitre1=0, skip=(),
                corner_clip=None):
    """A (proud, y) profile extruded t0..t1. mitre = +1: internal corner (the face ends at
    t -/+ proud), -1: external corner (extends past the corner by proud); each mitred quad
    stays planar because its (proud, y) edge is a line. skip: segment indices not emitted
    (solid-on-solid contacts owned by another element)."""
    for i, ((d0, y0), (d1, y1)) in enumerate(zip(prof, prof[1:])):
        if i in skip:
            continue
        dd, dy = d1 - d0, y1 - y0
        if abs(dd) <= GEOM_EPS and abs(dy) <= GEOM_EPS:
            continue
        a0, a1 = t0 + mitre0 * d0, t0 + mitre0 * d1
        e0, e1 = t1 - mitre1 * d0, t1 - mitre1 * d1
        ym = (y0 + y1) / 2.0
        keeps = []
        riser = abs(dd) <= GEOM_EPS
        if riser:  # the face's (t, y) plane at constant proud
            d = d0
            pts = [(a0, y0), (e0, y0), (e1, y1), (a1, y1)]
            world = lambda t, y, _d=d: plane.world(t, y, _d)
            if mitre0 > 0.0:  # internal: keep t >= t0 + d (may out-live a short run)
                keeps.append(lambda p, _l=t0 + d: p[0] - _l)
            if mitre1 > 0.0:  # internal: keep t <= t1 - d
                keeps.append(lambda p, _l=t1 - d: _l - p[0])
            if corner_clip is not None and d >= corner_clip[1]:
                keeps.append(lambda p, _tc=corner_clip[0]: _tc - p[0])
        else:  # the segment's (t, d) plan at interpolated y
            pts = [(a0, d0), (e0, d0), (e1, d1), (a1, d1)]
            world = lambda t, d_, _y0=y0, _dd=(y1 - y0) / dd: \
                plane.world(t, _y0 + _dd * (d_ - d0), d_)
            if mitre0 > 0.0:  # keep t - d >= t0: the 45-degree internal seam
                keeps.append(lambda p, _t0=t0: p[0] - p[1] - _t0)
                keeps.append(lambda p, _t1=t1: _t1 - p[0])  # the span's far clamp
            if mitre1 > 0.0:  # keep t + d <= t1
                keeps.append(lambda p, _t1=t1: _t1 - p[0] - p[1])
                keeps.append(lambda p, _t0=t0: p[0] - _t0)  # the span's near clamp
        for keep in keeps:
            pts = _sh_keep(pts, keep)
        pieces = [pts]
        if not riser and corner_clip is not None and corner_clip[1] < max(d0, d1):
            front, flank = _l_cut(pts, corner_clip[0], corner_clip[1])
            pieces = [front, flank]
        for p in pieces:
            p = clean_polygon(p)
            if not p:
                continue
            b.face([world(t, second) for t, second in p],
                   mat_of(ym), element_of(ym), plane.normal(dy, -dd))


def profile_cap(b, plane, prof, t, sign, mat, element):
    b.face([plane.world(t, y, d) for d, y in prof], mat, element, t_dir(plane, sign))


def skirting_run(b, plane, t0, t1, mitre0=0, mitre1=0):
    profile_run(b, plane, SKIRTING_PROFILE, t0, t1, lambda _y: M_BAND, lambda _y: 'skirting', mitre0, mitre1)


def cornice_run(b, plane, t0, t1, mitre0=0, mitre1=0, cap0=False, cap1=False, corner_clip=None):
    profile_run(b, plane, CORNICE_PROFILE, t0, t1, lambda _y: M_STUCCO, lambda _y: 'cornice', mitre0, mitre1,
                corner_clip=corner_clip)
    if cap0:
        profile_cap(b, plane, CORNICE_PROFILE, t0, -1.0, M_STUCCO, 'cornice')
    if cap1:
        profile_cap(b, plane, CORNICE_PROFILE, t1, 1.0, M_STUCCO, 'cornice')


# ---- the long walls: one partition each -------------------------------------------------------
def pilaster_footprint_masks(t_c):
    """The 4 convex masks a pilaster leaves on its host plane (plinth, base, shaft, capital)."""
    cap = [(t_c + SHAFT_HALF_W + d, y) for d, y in CAPITAL_PROFILE]
    cap += [(t_c - SHAFT_HALF_W - d, y) for d, y in reversed(CAPITAL_PROFILE)]
    return [
        rectangle(t_c - PLINTH_HALF_W, t_c + PLINTH_HALF_W, 0.0, PLINTH_Y),
        rectangle(t_c - BASE_HALF_W, t_c + BASE_HALF_W, PLINTH_Y, SHAFT_Y0),
        rectangle(t_c - SHAFT_HALF_W, t_c + SHAFT_HALF_W, SHAFT_Y0, SHAFT_Y1),
        clean_polygon(cap),
    ]


def niche_polygon(x_c, half_w):
    """Rect + half-disc head: (x, y), convex; half_w 0.90 = the opening, 1.00 = the surround."""
    head = head_arc(x_c, NICHE_SPRING, half_w, NICHE_HEAD_SEGS)  # left spring -> peak -> right
    return [(x_c - half_w, NICHE_SILL), (x_c + half_w, NICHE_SILL)] + list(reversed(head))


def plan_long_wall(z_wall):
    field = rectangle(G_X0, G_X1, SKIRTING_TOP, CORNICE_Y0)
    layers = []
    for x_c in PILASTER_X:
        layers += [(mask, HOLE) for mask in pilaster_footprint_masks(x_c)]
    for x_c in NICHE_CENTRES:
        layers.append((niche_polygon(x_c, NICHE_OUTER_R), HOLE))
        layers.append((rectangle(x_c - SILL_HALF_L, x_c + SILL_HALF_L, SILL_Y0, SILL_Y1), HOLE))
    return [poly for poly, mat in painted_regions(field, M_PALE, layers) if mat != HOLE]


def build_long_wall(b, plane):
    for poly in plan_long_wall(plane.offset):
        b.polygon(plane, poly, M_PALE, 'wall.field')
    # skirting + cornice runs between the pilasters; west end = external corner with the
    # passage wall (skirting mitre -1, cornice flat cap), east end = internal corner (mitre +1)
    edges = [G_X0] + [t for x_c in sorted(PILASTER_X) for t in (x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W)] + [G_X1]
    for k in range(0, len(edges), 2):
        t0, t1 = edges[k], edges[k + 1]
        skirting_run(b, plane, t0, t1, -1 if k == 0 else 0, 1 if k + 2 == len(edges) else 0)
    edges = [G_X0] + [t for x_c in sorted(PILASTER_X) for t in (x_c - RESSAUT_HALF_W, x_c + RESSAUT_HALF_W)] + [G_X1]
    corner_clip = (G_X1 - RESSAUT_PROUD, CORNER_RETURN_Z[0] - RESSAUT_HALF_W - G_Z0) if plane.offset == G_Z0 \
        else (G_X1 - RESSAUT_PROUD, G_Z1 - CORNER_RETURN_Z[1] - RESSAUT_HALF_W)
    for k in range(0, len(edges), 2):
        t0, t1 = edges[k], edges[k + 1]
        cornice_run(b, plane, t0, t1, 0, 1 if k + 2 == len(edges) else 0, cap0=(k == 0),
                    corner_clip=corner_clip if k + 2 == len(edges) else None)
    for x_c in PILASTER_X:
        build_pilaster(b, plane, x_c)
        build_ressaut(b, plane, x_c, arch=True)
    # (RG-F3) the pane tags' ONLY call site: the z=70 courtyard wall (WALL_S, owner-confirmed;
    # the wall at z=70 whose backs the census enumerated) passes pane01..pane11 in k order
    # (k=1 the EAST-most bay x 42.3065 -> k=11 the WEST-most x 8.4365); the z=76 wall's
    # backs stay blind (no tag -> M_PALE, untagged).
    for k, x_c in enumerate(NICHE_CENTRES, 1):
        build_niche(b, plane, x_c, pane_tag=f'pane{k:02d}' if plane is WALL_S else None)


# ---- the order ---------------------------------------------------------------------------------
def build_pilaster(b, plane, t_c):
    el = 'pilaster'
    P = plane.world
    plinth_d = BASE_PROFILE[0][0]   # 0.16
    base_d = BASE_PROFILE[2][0]     # 0.13
    # plinth: front, sides cut around the skirting profile (2 pieces each), top side strips
    b.polygon(plane, rectangle(t_c - PLINTH_HALF_W, t_c + PLINTH_HALF_W, 0.0, PLINTH_Y), M_BAND, el, d=plinth_d)
    for s in (-1.0, 1.0):
        t = t_c + s * PLINTH_HALF_W
        n = t_dir(plane, s)
        b.face([P(t, 0.0, SKIRTING_PROUD), P(t, 0.0, plinth_d), P(t, PLINTH_Y, plinth_d), P(t, PLINTH_Y, SKIRTING_PROUD)],
               M_BAND, el, n)
        b.face([P(t, SKIRTING_TOP, 0.0), P(t, SKIRTING_PROFILE[1][1], SKIRTING_PROUD), P(t, PLINTH_Y, SKIRTING_PROUD), P(t, PLINTH_Y, 0.0)],
               M_BAND, el, n)
        ta, tb = sorted((t_c + s * BASE_HALF_W, t_c + s * PLINTH_HALF_W))
        b.face([P(ta, PLINTH_Y, 0.0), P(tb, PLINTH_Y, 0.0), P(tb, PLINTH_Y, plinth_d), P(ta, PLINTH_Y, plinth_d)],
               M_BAND, el, UP)
    # base: ledge (stone) + riser + slope (stucco), sides, top strips beside the shaft
    profile_run(b, plane, BASE_PROFILE[1:], t_c - BASE_HALF_W, t_c + BASE_HALF_W,
                lambda y: M_BAND if y <= PLINTH_Y + 1e-9 else M_STUCCO, lambda _y: el)
    for s in (-1.0, 1.0):
        t = t_c + s * BASE_HALF_W
        b.face([P(t, PLINTH_Y, 0.0), P(t, PLINTH_Y, base_d), P(t, BASE_PROFILE[3][1], base_d),
                P(t, SHAFT_Y0, SHAFT_PROUD), P(t, SHAFT_Y0, 0.0)], M_STUCCO, el, t_dir(plane, s))
        ta, tb = sorted((t_c + s * SHAFT_HALF_W, t_c + s * BASE_HALF_W))
        b.face([P(ta, SHAFT_Y0, 0.0), P(tb, SHAFT_Y0, 0.0), P(tb, SHAFT_Y0, SHAFT_PROUD), P(ta, SHAFT_Y0, SHAFT_PROUD)],
               M_STUCCO, el, UP)
    # shaft
    b.polygon(plane, rectangle(t_c - SHAFT_HALF_W, t_c + SHAFT_HALF_W, SHAFT_Y0, SHAFT_Y1), M_STUCCO, el, d=SHAFT_PROUD)
    for s in (-1.0, 1.0):
        t = t_c + s * SHAFT_HALF_W
        b.face([P(t, SHAFT_Y0, 0.0), P(t, SHAFT_Y0, SHAFT_PROUD), P(t, SHAFT_Y1, SHAFT_PROUD), P(t, SHAFT_Y1, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    # capital: the (proud, y) profile flares the half-width by its proud (0.20 -> 0.28)
    for (d0, y0), (d1, y1) in zip(CAPITAL_PROFILE, CAPITAL_PROFILE[1:]):
        D0, D1 = SHAFT_PROUD + d0, SHAFT_PROUD + d1
        w0, w1 = SHAFT_HALF_W + d0, SHAFT_HALF_W + d1
        dd, dy, dw = d1 - d0, y1 - y0, w1 - w0
        b.face([P(t_c - w0, y0, D0), P(t_c + w0, y0, D0), P(t_c + w1, y1, D1), P(t_c - w1, y1, D1)],
               M_STUCCO, el, plane.normal(dy, -dd))
        for s in (-1.0, 1.0):
            tn = t_dir(plane, s)
            n = (tn[0] * dy, -dw, tn[2] * dy)
            b.face([P(t_c + s * w0, y0, 0.0), P(t_c + s * w0, y0, D0), P(t_c + s * w1, y1, D1), P(t_c + s * w1, y1, 0.0)],
                   M_STUCCO, el, n)


def build_ressaut(b, plane, t_c, arch):
    """The cornice's forward break over a pilaster. Segment 0 (soffit) is the abacus top:
    solid-on-solid, not emitted. The top carries the arch foot (arch=True: two strips beside
    it) or stays whole (end wall)."""
    el = 'ressaut'
    P = plane.world
    t0, t1 = t_c - RESSAUT_HALF_W, t_c + RESSAUT_HALF_W
    profile_run(b, plane, RESSAUT_PROFILE, t0, t1, lambda _y: M_STUCCO, lambda _y: el,
                skip=(0, len(RESSAUT_PROFILE) - 2))
    cap = [(RESSAUT_PROFILE[1][0] - RESSAUT_D, RESSAUT_PROFILE[1][1])]   # (0.08, 2.70)
    cap += list(RESSAUT_PROFILE[1:-1])   # the ressaut's outer steps up to (0.28, 3.00)
    cap += [(d, y) for d, y in reversed(CORNICE_PROFILE[2:-1])]  # back down the plain steps
    for s in (-1.0, 1.0):
        t = t_c + s * RESSAUT_HALF_W
        b.face([P(t, y, d) for d, y in cap], M_STUCCO, el, t_dir(plane, s))
    top_y = CORNICE_PROFILE[-1][1]
    if arch:
        for s in (-1.0, 1.0):
            ta, tb = sorted((t_c + s * ARCH_HALF_W, t_c + s * RESSAUT_HALF_W))
            b.face([P(ta, top_y, 0.0), P(tb, top_y, 0.0), P(tb, top_y, RESSAUT_PROUD), P(ta, top_y, RESSAUT_PROUD)],
                   M_STUCCO, el, UP)
    else:
        b.face([P(t0, top_y, 0.0), P(t1, top_y, 0.0), P(t1, top_y, RESSAUT_PROUD), P(t0, top_y, RESSAUT_PROUD)],
               M_STUCCO, el, UP)


# ---- niches: pocket + surround band + sill ledge ---------------------------------------------
def build_niche(b, plane, x_c, pane_tag=None):
    """One bay niche. RG-F3: pane_tag (assigned ONLY by the z=70 courtyard wall caller)
    turns the back face into a declared pane - M_PANE + the zero-padded single-face tag;
    the z=76 wall's backs keep M_PALE blind. Geometry, order and the 'niche' element
    label are unchanged either way (the schedule equality holds)."""
    el = 'niche'
    P = plane.world
    back_d = -NICHE_RECESS
    band_d = NICHE_SURROUND_D
    inner = head_arc(x_c, NICHE_SPRING, NICHE_HALF_W, NICHE_HEAD_SEGS)
    outer = head_arc(x_c, NICHE_SPRING, NICHE_OUTER_R, NICHE_HEAD_SEGS)
    # (RG-F3) the declared pane's back face: M_PANE with the caller's zero-padded tag on
    # the z=70 wall; blind M_PALE without a tag (the z=76 backs stay untagged).
    b.polygon(plane, niche_polygon(x_c, NICHE_HALF_W), M_PANE if pane_tag else M_PALE,
              el, d=back_d, tag=pane_tag)
    # reveals: sill (+y), jambs (toward the axis), head (toward the arc centre)
    b.face([P(x_c - NICHE_HALF_W, NICHE_SILL, back_d), P(x_c + NICHE_HALF_W, NICHE_SILL, back_d),
            P(x_c + NICHE_HALF_W, NICHE_SILL, 0.0), P(x_c - NICHE_HALF_W, NICHE_SILL, 0.0)],
           M_PALE, el, UP)
    for s in (-1.0, 1.0):
        t = x_c + s * NICHE_HALF_W
        b.face([P(t, NICHE_SILL, back_d), P(t, NICHE_SPRING, back_d), P(t, NICHE_SPRING, band_d), P(t, NICHE_SILL, band_d)],
               M_PALE, el, t_dir(plane, -s))
    for (xa, ya), (xb, yb) in zip(inner, inner[1:]):
        tn = t_dir(plane, 1.0)
        mx, my = (xa + xb) / 2.0, (ya + yb) / 2.0
        n = (tn[0] * (x_c - mx), NICHE_SPRING - my, tn[2] * (x_c - mx))
        b.face([P(xa, ya, back_d), P(xb, yb, back_d), P(xb, yb, band_d), P(xa, ya, band_d)],
               M_PALE, el, n)
    # surround band: front faces at +0.03 and outer side faces
    for s in (-1.0, 1.0):
        ta, tb = sorted((x_c + s * NICHE_HALF_W, x_c + s * NICHE_OUTER_R))
        b.polygon(plane, rectangle(ta, tb, SILL_Y1, NICHE_SPRING), M_STUCCO, el, d=band_d)
        t = x_c + s * NICHE_OUTER_R
        b.face([P(t, SILL_Y1, 0.0), P(t, SILL_Y1, band_d), P(t, NICHE_SPRING, band_d), P(t, NICHE_SPRING, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    for i in range(NICHE_HEAD_SEGS):
        (ia, ib), (oa, ob) = (inner[i], inner[i + 1]), (outer[i], outer[i + 1])
        b.face([P(*ia, band_d), P(*ib, band_d), P(*ob, band_d), P(*oa, band_d)],
               M_STUCCO, el, plane.normal())
        tn = t_dir(plane, 1.0)
        mx, my = (oa[0] + ob[0]) / 2.0, (oa[1] + ob[1]) / 2.0
        n = (tn[0] * (mx - x_c), my - NICHE_SPRING, tn[2] * (mx - x_c))
        b.face([P(*oa, 0.0), P(*ob, 0.0), P(*ob, band_d), P(*oa, band_d)], M_STUCCO, el, n)
    # sill ledge: front, bottom, ends, top in 3 pieces around the jamb bands' feet
    L0, L1 = x_c - SILL_HALF_L, x_c + SILL_HALF_L
    b.polygon(plane, rectangle(L0, L1, SILL_Y0, SILL_Y1), M_STUCCO, el, d=SILL_LEDGE_D)
    b.face([P(L0, SILL_Y0, 0.0), P(L1, SILL_Y0, 0.0), P(L1, SILL_Y0, SILL_LEDGE_D), P(L0, SILL_Y0, SILL_LEDGE_D)],
           M_STUCCO, el, (0.0, -1.0, 0.0))
    for s, t in ((-1.0, L0), (1.0, L1)):
        b.face([P(t, SILL_Y0, 0.0), P(t, SILL_Y0, SILL_LEDGE_D), P(t, SILL_Y1, SILL_LEDGE_D), P(t, SILL_Y1, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    b.face([P(x_c - NICHE_HALF_W, SILL_Y1, 0.0), P(x_c + NICHE_HALF_W, SILL_Y1, 0.0),
            P(x_c + NICHE_HALF_W, SILL_Y1, SILL_LEDGE_D), P(x_c - NICHE_HALF_W, SILL_Y1, SILL_LEDGE_D)],
           M_STUCCO, el, UP)
    for s in (-1.0, 1.0):
        ta, tb = sorted((x_c + s * NICHE_HALF_W, x_c + s * NICHE_OUTER_R))
        b.face([P(ta, SILL_Y1, band_d), P(tb, SILL_Y1, band_d), P(tb, SILL_Y1, SILL_LEDGE_D), P(ta, SILL_Y1, SILL_LEDGE_D)],
               M_STUCCO, el, UP)


# ---- the floor: one y = 0 partition over the T-shaped boundary --------------------------------
def plan_floor():
    boundary = [(P_X0, P_Z0), (P_X1, P_Z0), (P_X1, G_Z0), (G_X1, G_Z0), (G_X1, G_Z1),
                (P_X1, G_Z1), (P_X1, P_Z1), (P_X0, P_Z1)]
    s, k = SKIRTING_PROUD, FLOOR_BORDER
    bands = [
        rectangle(G_X0, G_X1, G_Z0, G_Z0 + k), rectangle(G_X0, G_X1, G_Z1 - k, G_Z1),
        rectangle(G_X1 - k, G_X1, G_Z0, G_Z1),
        rectangle(P_X0, P_X0 + k, P_Z0, P_Z1), rectangle(P_X0, P_X1, P_Z0, P_Z0 + k),
        rectangle(P_X1 - k, P_X1, P_Z0, G_Z0 + k), rectangle(P_X1 - k, P_X1, G_Z1 - k, P_Z1),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z0, PORTAL_Z1),   # the threshold
    ] + [rectangle(x_c - ARCH_HALF_W, x_c + ARCH_HALF_W, G_Z0, G_Z1) for x_c in PILASTER_X]
    holes = [
        rectangle(G_X0, G_X1, G_Z0, G_Z0 + s), rectangle(G_X0, G_X1, G_Z1 - s, G_Z1),
        rectangle(G_X1 - s, G_X1, G_Z0, G_Z1),
        rectangle(P_X0, P_X0 + s, P_Z0, P_Z1), rectangle(P_X0, P_X1, P_Z0, P_Z0 + s),
        rectangle(P_X1 - s, P_X1, P_Z0, G_Z0 + s), rectangle(P_X1 - s, P_X1, G_Z1 - s, P_Z1),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z0),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z1, PORTAL_Z1 + DOOR_JAMB_W),
    ]
    plinth_d = BASE_PROFILE[0][0]
    for x_c in PILASTER_X:
        holes.append(rectangle(x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W, G_Z0, G_Z0 + plinth_d))
        holes.append(rectangle(x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W, G_Z1 - plinth_d, G_Z1))
    for z_c in CORNER_RETURN_Z:
        holes.append(rectangle(G_X1 - plinth_d, G_X1, z_c - PLINTH_HALF_W, z_c + PLINTH_HALF_W))
    layers = [(m, M_BAND) for m in bands] + [(m, HOLE) for m in holes]
    return [(poly, mat) for poly, mat in painted_regions(boundary, M_FLAGS, layers) if mat != HOLE]


def build_floor(b):
    for poly, mat in plan_floor():
        b.polygon(FLOOR, poly, mat, 'floor.flags' if mat == M_FLAGS else 'floor.band')


# ---- the gallery vault, the straight reveal soffit, the transverse arches ---------------------
def vault_normal(pts):
    zm = sum(p[2] for p in pts) / len(pts)
    ym = sum(p[1] for p in pts) / len(pts)
    return (0.0, G_SPRING - 0.3 - ym, G_ZC - zm)


def build_vault_and_arches(b):
    cuts = [XS_GI[0]] + sorted(t for x_c in PILASTER_X for t in (x_c - ARCH_HALF_W, x_c + ARCH_HALF_W)) + [G_X1]
    for k in range(0, len(cuts), 2):  # bays only; the arch footprints are solid-on-solid
        xa, xb = cuts[k], cuts[k + 1]
        b.rows([[(xa, y, z) for z, y in G_ARC], [(xb, y, z) for z, y in G_ARC]], M_STUCCO, 'vault.gallery',
               vault_normal, uid_rows=[[(xa, m) for m in G_ARC_M], [(xb, m) for m in G_ARC_M]])
    b.face([(G_X0, G_SPRING, G_Z0 + CORNICE_PROUD), (XS_GI[0], G_SPRING, G_Z0 + CORNICE_PROUD),
            (XS_GI[0], G_SPRING, G_Z1 - CORNICE_PROUD), (G_X0, G_SPRING, G_Z1 - CORNICE_PROUD)],
           M_STUCCO, 'vault.reveal', (0.0, -1.0, 0.0))
    b.face([(XS_GI[0], y, z) for z, y in G_ARC], M_STUCCO, 'tympanum', (1.0, 0.0, 0.0))
    for x_c in PILASTER_X:
        xa, xb = x_c - ARCH_HALF_W, x_c + ARCH_HALF_W
        rows = [[(xa, y, z) for z, y in ARCH_PROFILE], [(xb, y, z) for z, y in ARCH_PROFILE]]
        b.rows(rows, M_STUCCO, 'arch',
               lambda pts: (0.0, ARCH_SPRING - 0.3 - sum(p[1] for p in pts) / 4, G_ZC - sum(p[2] for p in pts) / 4))
        ring = [(z, y) for z, y in ARCH_PROFILE] + [(z, y) for z, y in reversed(G_ARC)]
        for x, s in ((xa, -1.0), (xb, 1.0)):
            b.face([(x, y, z) for z, y in ring], M_STUCCO, 'arch', (s, 0.0, 0.0))


# ---- the arch passage: walls, north tympanum, vault, impost, skirting -------------------------
def build_passage(b):
    y0, y1 = SKIRTING_TOP, IMPOST_PROFILE[0][1]
    b.polygon(PWALL_W, rectangle(P_Z0, P_Z1, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_E, rectangle(P_Z0, G_Z0, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_E, rectangle(G_Z1, P_Z1, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_N, rectangle(P_X0, P_X1, y0, y1), M_PALE, 'passage.field')
    b.face([(x, y, P_Z0) for x, y in P_ARC], M_PALE, 'tympanum', (0.0, 0.0, 1.0))
    rows = [[(x, y, z) for x, y in P_ARC] for z in P_Z_NODES]
    uids = [[(z, m) for m in P_ARC_M] for z in P_Z_NODES]
    b.rows(rows, M_STUCCO, 'vault.passage',
           lambda pts: (-sum(p[0] for p in pts) / 4, P_SPRING - 0.5 - sum(p[1] for p in pts) / 4, 0.0),
           uid_rows=uids)
    stucco, el = (lambda _y: M_STUCCO), (lambda _y: 'impost')
    profile_run(b, PWALL_W, IMPOST_PROFILE, P_Z0, P_Z1, stucco, el, mitre0=1)
    profile_run(b, PWALL_E, IMPOST_PROFILE, P_Z0, G_Z0, stucco, el, mitre0=1)
    profile_cap(b, PWALL_E, IMPOST_PROFILE, G_Z0, 1.0, M_STUCCO, 'impost')
    profile_run(b, PWALL_E, IMPOST_PROFILE, G_Z1, P_Z1, stucco, el)
    profile_cap(b, PWALL_E, IMPOST_PROFILE, G_Z1, -1.0, M_STUCCO, 'impost')
    profile_run(b, PWALL_N, IMPOST_PROFILE, P_X0, P_X1, stucco, el, mitre0=1, mitre1=1)
    skirting_run(b, PWALL_W, P_Z0, P_Z1, mitre0=1)
    skirting_run(b, PWALL_E, P_Z0, G_Z0, mitre0=1, mitre1=-1)
    skirting_run(b, PWALL_E, G_Z1, P_Z1, mitre0=-1)
    skirting_run(b, PWALL_N, P_X0, P_X1, mitre0=1, mitre1=1)
# ---- the east end wall: one x = 44 partition (RG-F2 part 3) ---------------------------------
# The verdict 2.2's law: ONE partition of the end-wall plane; the doorcase bands + archivolt
# own their footprints; the lunette 'stairlight' half-disc and the 'doorcard' sit AT x = 44.0
# (proud 0). DOORCASE_FACES = 16 (the Sol-reviewed rebuild: 2 jamb fronts + 4 corrected jamb
# sides + the head band front with NO end caps + the archivolt ring front + the 8-quad step
# ring — the caps were buried head/jamb interfaces; the schedule pins it via DOORCASE_FACES).
# F8 stays with the S1-amended constants (owner-ratified): CORNICE_PROUD 0.18, RESSAUT_PROUD
# 0.28 = the arch foot.
DOORCASE_FACES = 16
# (RG-F3) the two door patches join the eleven declared pane tags: THIRTEEN single-rect
# parts, one rect per part on the shelf, the SAME schema as before (one face per tag).
PATCH_PARTS = ('stairlight', 'doorcard',
               'pane01', 'pane02', 'pane03', 'pane04', 'pane05', 'pane06',
               'pane07', 'pane08', 'pane09', 'pane10', 'pane11')
DOOR_JAMB_PROUD = ARCHIVOLT_D          # the applied-band depth (0.04) — pinned here


def end_halfdisc(cx, y_base, r, segs):
    """The upper half-disc polygon (t, y): CCW from (cx - r, y_base) over the crown back."""
    pts = arc(cx, r, y_base, y_base + r, segs)
    pts.append((cx - r, y_base))
    return ccw(clean_polygon(pts))


def plan_end_wall():
    """The end-wall partition: [(polygon(t=z, y), material)] — the field below CORNICE_Y0 is
    plaster; the tympanum band above (y >= 2.70 everywhere the arch profile allows) is stucco.
    The applied elements' footprints are HOLE layers."""
    boundary = [(z, y) for z, y in G_ARC] + [(G_Z1, SKIRTING_TOP), (G_Z0, SKIRTING_TOP)]
    layers = [
        (rectangle(G_Z0, G_Z1, CORNICE_Y0, G_PEAK), M_STUCCO),
        (end_halfdisc(G_ZC, DOOR_BAND_Y[1], LUNETTE_R + ARCHIVOLT_W, 8), HOLE),
        (rectangle(71.95, 72.20, 0.0, CORNICE_Y0), HOLE),
        (rectangle(73.80, 74.05, 0.0, CORNICE_Y0), HOLE),
        (rectangle(71.95, 74.05, DOOR_BAND_Y[0], CORNICE_Y0), HOLE),
        # (RG-F2 Sol fix 1) the doorway's own field cut: without it the field fills the
        # doorway interior between the jamb masks and the doorcard emits coplanar over it
        # (the COVERED demo pair wall.e x doorcard).
        (rectangle(PORTAL_Z0, PORTAL_Z1, 0.0, DOOR_BAND_Y[0]), HOLE),
        # (RG-F2 Sol fix 3) the end-wall cornice + ressaut footprints derived from the SAME
        # spans the emitters use (the one-partition law: a field face never sits behind a
        # proud front). The 4 cornice spans + the 2 end ressauts, y CORNICE_Y0..G_SPRING.
        (rectangle(G_Z0, CORNER_RETURN_Z[0] - RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[0] + RESSAUT_HALF_W, G_Z0 + END_CORNICE_BREAK, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(G_Z1 - END_CORNICE_BREAK, CORNER_RETURN_Z[1] - RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[1] + RESSAUT_HALF_W, G_Z1, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[0] - RESSAUT_HALF_W, CORNER_RETURN_Z[0] + RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[1] - RESSAUT_HALF_W, CORNER_RETURN_Z[1] + RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
    ]
    for z_c in CORNER_RETURN_Z:
        layers += [(mask, HOLE) for mask in pilaster_footprint_masks(z_c)]
    return [(poly, mat) for poly, mat in painted_regions(boundary, M_PALE, layers) if mat != HOLE]


def build_doorcase(b):
    """16 faces (the Sol-reviewed topology): jamb fronts 2 + the corrected jamb sides 4 + the
    head band front 1 + the archivolt ring front 1 + the 8-quad step ring. NO head-band end
    caps: the head/jamb interfaces are internal to the applied band's solid, never faced.
    Then the tagged 'stairlight' half-disc and the 'doorcard' rectangle, both AT x = 44.0."""
    el = 'doorcase'
    P = WALL_E.world
    D = DOOR_JAMB_PROUD
    # the two jamb band fronts at proud D, full applied height (y 0..CORNICE_Y0)
    b.polygon(WALL_E, rectangle(71.95, 72.20, 0.0, CORNICE_Y0), M_STUCCO, el, d=D)
    b.polygon(WALL_E, rectangle(73.80, 74.05, 0.0, CORNICE_Y0), M_STUCCO, el, d=D)
    # jamb sides per the corrected table (height x normal): the outer sides run the full
    # height with the air outward; the inner sides stop at the doorcard's top and face INTO
    # the doorway air (z = 72.20: +z, z = 73.80: -z).
    b.face([P(71.95, SKIRTING_TOP, 0.0), P(71.95, SKIRTING_TOP, D),
            P(71.95, CORNICE_Y0, D), P(71.95, CORNICE_Y0, 0.0)], M_STUCCO, el, (0.0, 0.0, -1.0))
    b.face([P(72.20, SKIRTING_TOP, 0.0), P(72.20, SKIRTING_TOP, D),
            P(72.20, DOOR_BAND_Y[0], D), P(72.20, DOOR_BAND_Y[0], 0.0)], M_STUCCO, el, (0.0, 0.0, 1.0))
    b.face([P(73.80, SKIRTING_TOP, 0.0), P(73.80, SKIRTING_TOP, D),
            P(73.80, DOOR_BAND_Y[0], D), P(73.80, DOOR_BAND_Y[0], 0.0)], M_STUCCO, el, (0.0, 0.0, -1.0))
    b.face([P(74.05, SKIRTING_TOP, 0.0), P(74.05, SKIRTING_TOP, D),
            P(74.05, CORNICE_Y0, D), P(74.05, CORNICE_Y0, 0.0)], M_STUCCO, el, (0.0, 0.0, 1.0))
    # the head band front (z 72.20..73.80, y DOOR_BAND_Y[0]..CORNICE_Y0) — no end caps
    b.polygon(WALL_E, rectangle(72.20, 73.80, DOOR_BAND_Y[0], CORNICE_Y0), M_STUCCO, el, d=D)
    # the archivolt ring front: the annular n-gon at proud D. The walk = the outer arc
    # left->right (no closure), then the inner arc right->left; the two radial baseline
    # edges close it (the outer 0.07 ring footprints the surround; the disc sits inside).
    outer_pts = arc(G_ZC, LUNETTE_R + ARCHIVOLT_W, DOOR_BAND_Y[1],
                    DOOR_BAND_Y[1] + LUNETTE_R + ARCHIVOLT_W, 8)
    inner_pts = arc(G_ZC, LUNETTE_R, DOOR_BAND_Y[1], DOOR_BAND_Y[1] + LUNETTE_R, 8)
    b.face([P(t, y, D) for t, y in outer_pts + list(reversed(inner_pts))],
           M_STUCCO, el, (-1.0, 0.0, 0.0))
    # the step ring: 8 quads from the ring's inner edge (proud D) down to the disc rim (proud 0)
    for (t0a, y0a), (t1a, y1a) in zip(inner_pts, inner_pts[1:]):
        b.face([P(t0a, y0a, D), P(t1a, y1a, D), P(t1a, y1a, 0.0), P(t0a, y0a, 0.0)],
               M_STUCCO, el, (-1.0, 0.0, 0.0))
    # the lunette back: the exact half-disc at proud 0 — tag 'stairlight'
    b.face([P(t, y, 0.0) for t, y in end_halfdisc(G_ZC, DOOR_BAND_Y[1], LUNETTE_R, 8)],
           M_STAIR, 'stairlight', (-1.0, 0.0, 0.0), tag='stairlight')
    # the doorcard: the doorway's exact rectangle at proud 0 — tag 'doorcard'
    b.face([P(t, y, 0.0) for t, y in rectangle(PORTAL_Z0, PORTAL_Z1, 0.0, DOOR_BAND_Y[0])],
           M_STAIR, 'doorcard', (-1.0, 0.0, 0.0), tag='doorcard')


def build_end_wall(b):
    for poly, mat in plan_end_wall():
        b.polygon(WALL_E, poly, mat, 'wall.e')
    build_pilaster(b, WALL_E, CORNER_RETURN_Z[0])   # the corner returns (32 faces each, S2's port)
    build_pilaster(b, WALL_E, CORNER_RETURN_Z[1])
    build_ressaut(b, WALL_E, CORNER_RETURN_Z[0], arch=False)
    build_ressaut(b, WALL_E, CORNER_RETURN_Z[1], arch=False)
    # end-wall cornice: 2 runs [70..70.9] and [75.1..76] (END_CORNICE_BREAK 0.90), each
    # 2 spans × 7 segments + 1 cap at the inner end; the corner end carries the mitre.
    cornice_run(b, WALL_E, G_Z0, CORNER_RETURN_Z[0] - RESSAUT_HALF_W, mitre0=1)
    cornice_run(b, WALL_E, CORNER_RETURN_Z[0] + RESSAUT_HALF_W, G_Z0 + END_CORNICE_BREAK, cap1=True)
    cornice_run(b, WALL_E, G_Z1 - END_CORNICE_BREAK, CORNER_RETURN_Z[1] - RESSAUT_HALF_W, cap0=True)
    cornice_run(b, WALL_E, CORNER_RETURN_Z[1] + RESSAUT_HALF_W, G_Z1, mitre1=1)
    # end-wall skirting: 4 runs × 2 faces; the runs at the corners carry the mitre.
    skirting_run(b, WALL_E, G_Z0, CORNER_RETURN_Z[0] - PLINTH_HALF_W, mitre0=1)
    skirting_run(b, WALL_E, CORNER_RETURN_Z[0] + PLINTH_HALF_W, 71.95)
    skirting_run(b, WALL_E, 74.05, CORNER_RETURN_Z[1] - PLINTH_HALF_W)
    skirting_run(b, WALL_E, CORNER_RETURN_Z[1] + PLINTH_HALF_W, G_Z1, mitre1=1)
    build_doorcase(b)


def build_sconce():
    """The 27-face lamp in its LOCAL frame (mount axis = local z, up = local y): iron plate
    + arm skip their mount bottoms (solid-on-solid), the 16-seg smooth trunc-cone shade +
    the bottom cap; the strip layout carries it. Count guarded against SCONCE_FACES."""
    b = Builder()
    b.block(-0.06, 0.06, -0.32, 0.18, 0.0, 0.03, S_IRON, 'sconce', skip=('-z',))
    b.block(-0.03, 0.03, 0.02, 0.10, 0.03, 0.24, S_IRON, 'sconce', skip=('-z',))
    bottom = []
    top = []
    for k in range(SCONCE_SEGS):
        ang = TAU * k / SCONCE_SEGS
        bottom.append((0.06 * math.sin(ang), 0.10, 0.22 + 0.06 * math.cos(ang)))
        top.append((0.11 * math.sin(ang), 0.38, 0.22 + 0.11 * math.cos(ang)))
    for k in range(SCONCE_SEGS):
        kNext = (k + 1) % SCONCE_SEGS
        pts = [bottom[k], bottom[kNext], top[kNext], top[k]]
        mid = ((pts[0][0] + pts[2][0]) / 2.0,
               (pts[0][1] + pts[2][1]) / 2.0,
               (pts[0][2] + pts[2][2]) / 2.0)
        norm = (0.0 - mid[0], 0.0, 0.22 - mid[2])
        b.face(pts, S_GLOW, 'sconce', norm, smooth=True)
    b.face(list(reversed(bottom)), S_GLOW, 'sconce', (0.0, -1.0, 0.0))
    if len(b.roster) != SCONCE_FACES:
        fail(f'the sconce template emitted {len(b.roster)} faces, SCONCE_FACES = {SCONCE_FACES}')
    return b


def instance(name, me, location, rot_y=0.0):
    """location/rot_y in world terms (rotation about world +Y == Blender +Z)."""
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---- direct-assembly finish: projection / shelf / the authored-data gates --------------------
def project(normal, co):
    ax, ay, az = abs(normal.x), abs(normal.y), abs(normal.z)
    if ax >= ay and ax >= az:
        return (co.z, co.y)
    if ay >= az:
        return (co.x, co.z)
    return (co.x, co.y)


def count_overlaps(rects):
    """Pairwise overlap count over chart-space rects (x, y0, x1, y1), y from the top. EPS
    tolerances the touching boundaries: float drift between independently computed edges
    must not read as an overlap of whole cells."""
    eps = 1e-9
    items = sorted(rects)
    count = 0
    for i in range(len(items)):
        ax0, ay0, ax1, ay1 = items[i]
        for j in range(i + 1, len(items)):
            bx0, by0, bx1, by1 = items[j]
            if bx0 >= ax1 - eps:
                break
            if by0 < ay1 - eps and ay0 < by1 - eps:
                count += 1
    return count


def shelf_pack(cells, res, first_row):
    """Deterministic placement of (w, h, index) cells (w/h = the cell's inner px into the
    atlas; the 2 px pad rides the footprint). The RG-F2 packer upgrade (documented):
    a bottom-left skyline, not the flat row shelf — the flat shape wasted a row's whole
    depth budget per height class and could not close the atlas at the CELL floor.

    Shape laws (the owner's ratified packer class): fully deterministic; the primary
    order stays height desc (the rg-e1 area-weighted spirit), the width desc + the roster
    index break the ties; each cell is placed at the lowest profile position its width
    fits, the leftmost on ties; each cell's allocation carries the pad on ALL FOUR sides
    (the Sol-reviewed pad law: wt/ht = (w, h) + 2*pad each), so chart inners stay
    exactly two pads apart from every neighbour on every side; the allocations stay
    disjoint — count_overlaps' adjacent-touch-is-not-overlap semantics unchanged.
    first_row = the chart-y the shelf starts at (the reserved strip owns the rows above
    it). Returns {index: (x, y, w_total, h_total)}, or None fail-loud if even the best
    profile position cannot hold a cell."""
    pad = int(LM_PAD_PX)
    ordered = sorted(cells, key=lambda item: (-item[1], -item[0], item[2]))
    points = [(0, first_row)]        # the ascending-x steps: y is the height from x onward
    placed = {}
    for w, h, idx in ordered:
        wt, ht = w + 2 * pad, h + 2 * pad
        best = None                  # (top, x): the lowest top wins; the scan keeps the leftmost
        for i in range(len(points)):
            x = points[i][0]
            if x + wt > res:
                break
            top = points[i][1]
            j = i + 1
            while j < len(points) and points[j][0] < x + wt:
                if points[j][1] > top:
                    top = points[j][1]
                j += 1
            if top + ht <= res and (best is None or top < best[0]):
                best = (top, x)
        if best is None:
            return None
        top, x = best
        placed[idx] = (x, top, wt, ht)
        y_right = first_row          # the profile's height at the cell's right edge
        for px, py in points:
            if px <= x + wt:
                y_right = py
            else:
                break
        before = [(px, py) for px, py in points if px < x]
        after = [(px, py) for px, py in points if px > x + wt]
        points = before + [(x, top + ht), (x + wt, y_right)] + after
    return placed


def finish(name, builder, materials, mode='shelf'):
    """Two UV layers: 'uv' (albedo: box projection, or the tagged cylindrical arc mapping,
    always world metres / UV_TILE_M) and 'lm' (the atlas cells).

    mode='shelf': per-face cells on the deterministic row shelf — cell size
    clamp(round(extent_m * px), 6, 480) px with the 2 px pad inside the footprint; px steps
    down from LM_PX_PER_M until the pack fits the atlas under the reserved strip, and FAILS
    if it would go below LM_PX_PER_M_MIN (the verdict's CELL law: cut T3/T2 before touching
    resolution). mode='strip' (the sconce template): the reserved v range
    [LM_STRIP_FRAC, 1) as a grid of equal cells (the derived grid), pads inside each cell.
    Returns (mesh, triangles, lm_block)."""
    bm = builder.bm
    bm.normal_update()
    uv_lay = bm.loops.layers.uv.new('uv')
    lm_lay = bm.loops.layers.uv.new('lm')
    roster = [entry for entry in builder.roster if entry[0] is not None]
    pad_px = int(LM_PAD_PX)
    pad_uv = LM_PAD_PX / LM_RES
    first_row = int(round((1.0 - LM_STRIP_FRAC) * LM_RES))

    def planar(entry):
        f, _kind, uid, _el = entry
        if uid is not None:
            return list(uid)
        return [project(entry[0].normal, loop.vert.co) for loop in entry[0].loops]

    faces_uv = [(entry, planar(entry)) for entry in roster]

    if mode == 'shelf':
        extents = []
        for _entry, uv in faces_uv:
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            extents.append(((max(us) - min(us)) or 1.0, (max(vs) - min(vs)) or 1.0))
        px = float(LM_PX_PER_M)
        placed = None
        cell_px = None
        while px >= 1.0:
            if int(px) < LM_PX_PER_M_MIN:
                fail(f'the lm shelf needs pxPerM {px:g} < the CELL floor {LM_PX_PER_M_MIN} — '
                     'cut T3/T2 (the verdict failure case (i))')
            cell_px = [
                (
                    min(max(int(round(du * px)), LM_CELL_MIN_PX), LM_CELL_MAX_PX),
                    min(max(int(round(dv * px)), LM_CELL_MIN_PX), LM_CELL_MAX_PX),
                )
                for du, dv in extents
            ]
            if os.environ.get('RGF2_DUMP_SHELF'):
                import collections as _co
                fam = _co.defaultdict(list)
                cell = _co.defaultdict(int)
                area = _co.defaultdict(int)
                for idx, (entry, _uv) in enumerate(faces_uv):
                    el = entry[3] if len(entry) > 3 else '?'
                    w, h = cell_px[idx]
                    fam[el].append((w, h))
                    cell[el] += 1
                    area[el] += w * h
                rows = []
                for el in sorted(area, key=lambda e: -area[e]):
                    big = max(fam[el], key=lambda wh: wh[0] * wh[1])
                    rows.append({'element': el, 'faces': cell[el], 'px2': area[el], 'biggest': big})
                import json as _j
                with open(COVERED_DUMP_PATH.rsplit('/', 1)[0] + '/rgf2-shelf-debug.json', 'w') as _fh:
                    _j.dump({'px': px, 'finder_row': first_row, 'rows': rows,
                             'cells': [[int(placed[idx][0]) if placed and idx in placed else None,
                                        tuple(cell_px[idx])] for idx in range(len(cell_px))]}, _fh, indent=1)
            placed = shelf_pack(cells=[(w, h, idx) for idx, (w, h) in enumerate(cell_px)],
                                res=LM_RES, first_row=first_row)
            if placed is not None:
                break
            px -= 1.0
        for idx, (entry, uv) in enumerate(faces_uv):
            f, _kind, uid, _el = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            x, y, wt, ht = placed[idx]
            w_in, h_in = wt - 2 * pad_px, ht - 2 * pad_px
            # the pad law (the Sol amendment): the mapped cell's bounds sit >= 2 px inside
            # its allocation on ALL FOUR sides — verified before any atlas emission.
            insets = {
                'left': (x + pad_px) - x,
                'right': (x + wt) - (x + pad_px + w_in),
                'bottom': (y + pad_px) - y,
                'top': (y + ht) - (y + pad_px + h_in),
            }
            deficient = [side for side, inset in insets.items() if inset < pad_px]
            if deficient:
                fail(f'the lm pad law violated for cell {idx}: insets {insets} px < {pad_px} on {deficient}')
            for loop, (pu, pv) in zip(f.loops, uv):
                fu = (pu - u0) / du
                fv = (pv - v0) / dv
                loop[uv_lay].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
                loop[lm_lay].uv = (
                    (x + pad_px + fu * w_in) / LM_RES,
                    1.0 - (y + pad_px + fv * h_in) / LM_RES,
                )
        used = float(sum(wt * ht for _x, _y, wt, ht in placed.values()))
        min_cell = min(min(w, h) for w, h in cell_px)
        chart = [
            (x / LM_RES, y / LM_RES, (x + wt) / LM_RES, (y + ht) / LM_RES)
            for (x, y, wt, ht) in placed.values()
        ]
        block = {
            'mode': 'shelf',
            'pxPerM': int(px),
            'occupancy': round(used / float(LM_RES * LM_RES), 4),
            'minCellPx': min_cell,
            'faces': len(roster),
            'stripRowPx': first_row,
        }
        # the cells law (part-3 addition): the lm block serialises every shelf cell —
        # rect [x, y, w_total, h_total] in chart px, y from the top, one entry per face in
        # roster order, the element name riding each row. The same placements the UV law
        # consumed. The strip mode keeps no cells.
        block['cells'] = [
            {'rect': [placed[idx][0], placed[idx][1], placed[idx][2], placed[idx][3]],
             'element': _entry[3]}
            for idx, (_entry, _uv) in enumerate(faces_uv)
        ]
    else:
        grid = LM_SCONCE_GRID
        cell_w = 1.0 / grid
        cell_h = (1.0 - LM_STRIP_FRAC) / grid
        inner_u = max(cell_w - 2.0 * pad_uv, cell_w * 0.5)
        inner_v = max(cell_h - 2.0 * pad_uv, cell_h * 0.5)
        for idx, (entry, uv) in enumerate(faces_uv):
            f, _kind, uid, _el = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            u_base = (idx % grid) * cell_w
            v_base = LM_STRIP_FRAC + (idx // grid) * cell_h
            # the pad law (the Sol amendment) holds for the strip grid too: every equal
            # cell's mapped interior sits >= 2 px inside its allocation on all four sides.
            strip_insets = {
                'left': pad_uv * LM_RES,
                'right': (cell_w - pad_uv - inner_u) * LM_RES,
                'bottom': pad_uv * LM_RES,
                'top': (cell_h - pad_uv - inner_v) * LM_RES,
            }
            if any(inset + 1e-9 < 2.0 for inset in strip_insets.values()):
                fail(f'the lm pad law violated for strip cell {idx}: insets {strip_insets}')
            for loop, (pu, pv) in zip(f.loops, uv):
                fu = (pu - u0) / du
                fv = (pv - v0) / dv
                loop[uv_lay].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
                loop[lm_lay].uv = (
                    u_base + pad_uv + fu * inner_u,
                    v_base + pad_uv + fv * inner_v,
                )
        used = float(len(roster)) * cell_w * cell_h
        chart = []
        for idx in range(len(roster)):
            x0 = (idx % grid) * cell_w
            y0 = 1.0 - (LM_STRIP_FRAC + (idx // grid + 1) * cell_h)
            chart.append((x0, y0, x0 + cell_w, y0 + cell_h))
        block = {
            'mode': 'strip',
            'grid': grid,
            'cellPx': [cell_w * LM_RES, cell_h * LM_RES],
            'occupancy': round(used, 4),
            'minCellPx': int(round(cell_h * LM_RES)),
            'faces': len(roster),
            'v0': LM_STRIP_FRAC,
        }

    overlap_faces = count_overlaps(chart)
    block['overlapFaces'] = overlap_faces
    if overlap_faces:
        raise RuntimeError(f'rastrelli-gallery: lm atlas overlaps: {overlap_faces} mode={mode}')

    patches = {}
    for part in PATCH_PARTS:
        face = builder.tags.get(part)
        if face is not None:
            if mode != 'shelf':
                fail(f'the {part} patch is expected on the shelf pack')
            found = None
            for idx, (entry, _uv) in enumerate(faces_uv):
                if entry[0] is face:
                    found = idx
                    break
            if found is None:
                fail(f'the {part} face vanished from the roster')
            x, y, wt, ht = placed[found]
            patches[part] = [x, y, wt, ht]
    block['patches'] = patches

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return me, tris, block


def check_schedule(builder, schedule):
    """The element schedule (S2's author_schedule) against the emitted counts — the round's
    enumeration (the verdict 2.1(d)): any element outside its scheduled count fails loud.
    The schedule is authored in main() BEFORE any geometry and passed in (the law's
    "authored before geometry" holds literally)."""
    emitted = dict(builder.counts)
    problems = []
    for element, expected in schedule.items():
        got = emitted.pop(element, 0)
        if got != expected:
            problems.append(f'{element}: scheduled {expected}, emitted {got}')
    for element, extra in sorted(emitted.items()):
        problems.append(f'{element}: not in the schedule, emitted {extra}')
    if problems:
        fail('schedule mismatch — ' + '; '.join(problems))
    return schedule


def build_room(b):
    """The deterministic build order (the roster = the schedule's index)."""
    build_long_wall(b, WALL_S)
    build_long_wall(b, WALL_N)
    build_passage(b)
    build_vault_and_arches(b)
    build_floor(b)
    build_end_wall(b)


COVERED_DUMP_PATH = '/private/var/folders/8x/yls1cw1d6s3fmbrxhqg0y17w0000gp/T/opencode/rg-verify/rgf2-covered-debug.json'


def covered_debug_dump(b, _covered):
    """Debug helper (env RGF2_DUMP_COVERED=1): dump the concrete face pairs (world verts)
    behind the COVERED offenders. Read-only - the real gate still fails."""
    debug = []
    for ea, fa, eb, fb, rep in covered_face_pairs(b)[:30]:
        debug.append({'pair': [ea, eb, rep],
                      'a_w': [[round(v, 3) for v in to_w(vert.co)] for vert in fa.verts],
                      'b_w': [[round(v, 3) for v in to_w(vert.co)] for vert in fb.verts]})
    with open(COVERED_DUMP_PATH, 'w', encoding='utf-8') as fh:
        json.dump(debug, fh, indent=1)


def main():
    stage = stage_dir()
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # the element schedule is authored BEFORE geometry: a pure 2-D enumeration over the
    # plan formulas (the Sol amendment; the law's order now literal).
    schedule = author_schedule()
    b = Builder()
    build_room(b)

    # bmesh lazily computes face normals — update BEFORE the authored-data gates read them.
    b.bm.normal_update()

    # the authored-data gates (the verdict 2.1(c)): FACING, COVERED — element names, not
    # probe shards; the schedule closes it (2.1(d)).
    facing = gate_facing(b)
    if facing:
        fail('FACING offenders: ' + json.dumps({k: v[:3] for k, v in facing.items()}))
    covered = gate_covered(b)
    if covered:
        if os.environ.get('RGF2_DUMP_COVERED'):
            covered_debug_dump(b, covered)
        fail('COVERED offenders: ' + json.dumps(covered))
    schedule = check_schedule(b, schedule)

    img_stone, png_stone = write_texture('stone_flags', stone_flags_px, tex_dir)
    img_pale, png_pale = write_texture('plaster_pale', plaster_pale_px, tex_dir)
    img_stucco, png_stucco = write_texture('stucco_grey', stucco_grey_px, tex_dir)
    img_band, png_band = write_texture('stone_band', stone_band_px, tex_dir)
    mat_stone = material('stone_flags', img_stone)
    mat_pale = material('plaster_pale', img_pale)
    mat_stucco = material('stucco_grey', img_stucco)
    mat_band = material('stone_band', img_band)
    mat_stair = flat_material('stairlight', (1.0, 1.0, 1.0), 1.0)
    mat_pane = flat_material('pane', (1.0, 1.0, 1.0), 1.0)   # (RG-F3) flat white, roughness 1.0
    mat_iron = flat_material('iron_dark', IRON_RGB, IRON_ROUGHNESS)
    mat_glow = flat_material('sconce_glow', GLOW_TINT_RGB, 0.92, emission=SCONCE_GLOW_RGB)
    me_shell, t_shell, lm_shell = finish(
        'shell', b, [mat_pale, mat_stone, mat_stucco, mat_band, mat_stair, mat_pane],
        mode='shelf')
    sconce_b = build_sconce()
    me_sconce, t_sconce, lm_strip = finish(
        'sconce', sconce_b, [mat_iron, mat_glow], mode='strip')
    instance('shell', me_shell, (0.0, 0.0, 0.0))
    for x in SCONCE_X:  # 12 sconces on the odd pilasters' shaft planes
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z0 + SCONCE_MOUNT_D))
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z1 - SCONCE_MOUNT_D), math.pi)
    for z in SCONCE_SEW_Z:  # 2 passage-mouth sconces on the passage's east wall, facing west
        instance('sconce', me_sconce, (P_X1, SCONCE_Y, z), -math.pi / 2)
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
        'shell': {'triangles': t_shell, 'instances': 1, 'primitives': 6},
        'sconce': {'triangles': t_sconce, 'instances': SCONCE_COUNT, 'primitives': 2},
    }
    lm_block = dict(lm_shell)
    lm_block['strip'] = lm_strip
    summary = {
        'room': ROOM_ID,
        'glb': glb_path,
        'textures': {'stone_flags': png_stone, 'plaster_pale': png_pale,
                     'stucco_grey': png_stucco, 'stone_band': png_band},
        'meshes': meshes,
        'triangles': sum(m['triangles'] * m['instances'] for m in meshes.values()),
        'trianglesUnique': sum(m['triangles'] for m in meshes.values()),
        'drawsNaive': sum(m['primitives'] * m['instances'] for m in meshes.values()),
        'drawsUniquePrimitives': sum(m['primitives'] for m in meshes.values()),
        'schedule': schedule,
        'patches': dict(lm_block['patches']),
        'gates': {'facing': 0, 'covered': 0, 'scheduleCheck': 'equal'},
        'declared': {
            'bayPitchM': BAY_PITCH,
            'pilasters': PILASTER_COUNT,
            'sconces': SCONCE_COUNT,
            'sconceEmission': SCONCE_EMISSION,
            'sconceSegments': SCONCE_SEGS,
            'nicheCount': len(NICHE_CENTRES) * 2,
            'ribCount': len(PILASTER_X),
            'ribClearanceM': round(ARCH_CLEARANCE_M, 4),
            'doorJambWidthM': DOOR_JAMB_W,
            'doorJambProudM': DOOR_JAMB_PROUD,
            'lunetteRadiusM': LUNETTE_R,
            'corniceProudM': CORNICE_PROUD,
            'ressautProudM': RESSAUT_PROUD,
            'passageVault': PASSAGE_VAULT,
            'galleryVault': GALLERY_VAULT,
            'uvTileM': UV_TILE_M,
            'lmRes': LM_RES,
        },
        'lm': lm_block,
    }
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as fh:
        json.dump(summary, fh, sort_keys=True, indent=2)
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')), flush=True)


main()
