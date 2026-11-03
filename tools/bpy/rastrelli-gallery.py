# Zimny RG-E1 (details program round e1 - the pale gallery) - rastrelli-gallery kit
# (Blender 4.2 LTS, headless). Run by tools/asset.mjs `bpy rastrelli-gallery` (stem = room id
# verbatim). Deterministic: no randomness, every dimension is a constant below. World axes
# are glTF axes: +X east, +Z south (Palace Square side), -Z north, +Y up. Geometry is
# authored in world coordinates and converted to Blender space at vertex creation so
# export_yup gives them back.
# Writes:  <stage>/rastrelli-gallery.raw.glb
#          <stage>/tex/stone_flags.png, <stage>/tex/plaster_pale.png, <stage>/tex/stucco_grey.png
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` stdout line.
# RG-E1 PALETTE (replaces the dark phase-2 plaster): plaster_pale on the walls above dado,
# the gallery vault/tympana and the passage; stucco_grey on pilasters, ribs, cornice,
# skirting and the doorcase trim; stone_flags retuned (2 flags per 2 m tile, 8 px mortar);
# iron_dark (flat, no texture) for the sconce plates/arms - the recorded bug where the
# sconce's "iron" read the room plaster albedo is fixed here. The sconce glow colour
# (1.0, 0.72, 0.42) and emission strength 6.0 are unchanged.
# RG-E1 BAY GEOMETRY: ONE merged SHELL datablock carries the room's architecture - the
# original shell faces, the 24 pilasters inline (was: a 24-instance template), the folded
# doorcase (was: the 'portal' datablock), the 11 transverse ribs, the 22 blind niches and
# the stairlight lunette - so every face gets its own lightmap cell and per-position
# lighting. The 14 sconces stay one instanced template: their albedo is near-black iron
# plus the glow, so the reserved same-atlas strip at v >= 0.875 (equal cells, 5x5 grid over
# 19 faces) is theirs. Niches ship BLIND (no window variant); the niche back is a separate
# face group (plaster_pale) so a later baked-pane swap is a constants-level material change.
# The east doorcase's lunette back is ONE quad named 'stairlight' (flat Principled,
# white placeholder) whose atlas cells are PAINTED per published state at re-encode
# (tools/reencode.mjs; the D-23 law - NOT in PANE_MATERIALS, no glass swap for this room).
# The portal opening itself and the arch passage stay unchanged.
# RG-E1 ATLAS LAW: per-face lightmap cells on a deterministic row shelf - cell w,h =
# clamp(round(extent_m * PX_PER_M), 6, 480) px, 2 px pad inside the footprint, faces sorted
# by (height desc, width desc, roster index), rows wrap at the atlas edge, PX_PER_M starts
# at 20 and steps down by 1 until the pack fits under the reserved strip. Vault and
# passage-arch soffit faces use CYLINDRICAL uv (u = arc length along the profile, v = the
# extrusion axis) instead of box projection, killing the wood-grain streak box projection
# paints on the curved surfaces. One 1024^2 lm atlas per state referenced by 'lm'
# coordinates on all merged geometry, as before. The summary's `lm` block records pxPerM /
# occupancy / overlapFaces / minCellPx plus the stairlight patch rect (reencode paints it).
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

# ---- textures (tileable 512^2 albedos, procedural, sRGB-encoded values) ---------------------
TEX_RES = 512
UV_TILE_M = 2.0  # one tile covers 2 m x 2 m ('uv' layer, box/cyl projection, world metres)
LM_RES = 1024  # r17 bake resolution: the atlas the 'lm' per-face shelf cells are packed into
LM_PAD_PX = 2.0
LM_STRIP_FRAC = 0.875  # the reserved sconce strip: v in [0.875, 1) (chart rows 0..127 px)
LM_SCONCE_GRID = 5  # ceil(sqrt(19)): the strip's equal-cell grid
LM_PX_PER_M = 20  # RG-E1 shelf law: start here, step down by 1 until the pack fits
LM_CELL_MIN_PX = 6
LM_CELL_MAX_PX = 480

# stone flags (RG-E1 retune): 2 flags per 2 m tile (1.0 m flags), 8 px mortar walls
FLAGS_PER_TILE = 2
FLAG_PX = TEX_RES // FLAGS_PER_TILE
MORTAR_PX = 8
STONE_RGB = (0.56, 0.54, 0.50)
MORTAR_RGB = (0.34, 0.32, 0.29)
# plaster_pale: walls above dado, vault, tympana, passage - isotropic mottle
# 0.02 sin(3x) sin(2y) + 0.012 cos(7x) cos(5y) + 0.008 sin(13x) sin(11y), total <= 0.035
PLASTER_PALE_RGB = (0.74, 0.70, 0.62)
# stucco_grey: pilasters, ribs, cornice, skirting, doorcase trim - the same isotropic
# form at half amplitude (total <= 0.02)
STUCCO_GREY_RGB = (0.60, 0.58, 0.54)
IRON_RGB = (0.07, 0.065, 0.06)
IRON_ROUGHNESS = 0.55
GLOW_TINT_RGB = (0.38, 0.29, 0.22)  # the shade body's albedo (was the plaster-dark texture)

# ---- gallery proper (east of the arch passage), metres -------------------------------------
G_X0, G_X1 = 4.0, 44.0  # 40 m long; X 4.0..4.8 is the straight-soffit reveal into the passage
G_Z0, G_Z1 = 70.0, 76.0  # 6 m wide
G_ZC = 73.0
G_SPRING = 3.0  # wall springing line
G_PEAK = 3.6  # shallow vault crown = room Y bound
G_REVEAL = 0.8
G_LEN_SEGS = 10  # ~3.9 m lightmap cells along the gallery
G_ARC_SEGS = 8
XS_G = [G_X0, G_X0 + G_REVEAL] + [
    G_X0 + G_REVEAL + (G_X1 - G_X0 - G_REVEAL) * k / G_LEN_SEGS for k in range(1, G_LEN_SEGS + 1)
]
XS_GI = XS_G[1:]  # interior proper, from the tympanum at X = 4.8

# ---- arch passage (part of this room's model) ----------------------------------------------
P_X0, P_X1 = -4.0, 4.0  # 8 m opening
P_Z0, P_Z1 = 63.5, 87.5  # 24 m through-walk; Z 87.5 = facade arch plane (left OPEN)
P_SPRING = 3.0
P_PEAK = 5.0  # semi-ellipse: rise 2.0 over half-span 4.0 (flattened, no semicircle)
P_ARC_SEGS = 12
P_Z_NODES = (63.5, 66.75, 70.0, 73.0, 76.0, 79.8333, 83.6667, 87.5)
PASSAGE_VAULT = {'spanM': 8.0, 'springY': P_SPRING, 'peakY': P_PEAK, 'profile': 'semi-ellipse'}
GALLERY_VAULT = {'spanM': 6.0, 'springY': G_SPRING, 'peakY': G_PEAK, 'profile': 'semi-ellipse'}

# ---- trim profiles (d = protrusion into the room, y) - shell geometry, not a hero ---------------
CORNICE = ((0.0, 2.70), (0.07, 2.70), (0.07, 2.84), (0.13, 2.84), (0.13, G_SPRING))
SKIRTING = ((0.09, 0.0), (0.09, 0.11), (0.0, 0.14))

# ---- pilasters: facade pitch, 11 per side + 2 corner returns on the east end wall -----------
BAY_PITCH = 3.387
PILASTERS_PER_SIDE = 11
PILASTER_X = tuple(G_X1 - BAY_PITCH * k for k in range(1, PILASTERS_PER_SIDE + 1))
CORNER_RETURN_Z = (70.45, 75.55)
PILASTER_COUNT = PILASTERS_PER_SIDE * 2 + len(CORNER_RETURN_Z)  # 24

# ---- sconces (RG-E1): 6 per side ON the odd pilasters' shaft planes + 2 at the passage mouth.
# Station x = the odd pilasters (2 dp: 40.61, 33.84, 27.06, 20.29, 13.51, 6.74); the mount
# plane is the shaft's outer plane = wall + 0.10, plate 1.68..2.38 (capital bottom 2.45).
SCONCE_X = tuple(PILASTER_X[k] for k in (0, 2, 4, 6, 8, 10))
SCONCE_MOUNT_D = 0.10  # the shaft plane stands SCONCE_MOUNT_D off the wall plane
SCONCE_Y = 2.0  # mount centre; plate spans Y 1.68..2.38
SCONCE_SEW_Z = (68.4, 77.6)  # passage-mouth sconces on the passage's east wall, facing west
SCONCE_COUNT = len(SCONCE_X) * 2 + len(SCONCE_SEW_Z)  # 14
SCONCE_EMISSION = 6.0
SCONCE_GLOW_RGB = (1.0, 0.72, 0.42)
SCONCE_SEGS = 8

# ---- transverse ribs (RG-E1): one per pilaster station; the soffit profile is the gallery
# vault arc scaled toward the axis so it springs on the cornice step at z = 73 +- 2.87,
# spring y 2.84 / crown y 3.48 (0.12 below the vault crown). The vault over the rib zone
# stays >= ~3.17 m (RIB_CLEARANCE_M measured below; the build fails loud if <= 0).
RIB_WIDTH = 0.40
RIB_HALF_Z = 2.87
RIB_SPRING_Y = 2.84
RIB_CROWN_Y = 3.48
RIB_ARC_SEGS = 8

# ---- wall niches, blind arches (RG-E1): 22 (11 per wall, one per bay), centres at the bay
# mid-points 44 - BAY_PITCH * (k - 0.5). Shipped BLIND: no window variant this round; the
# back polygon is its own face group in the wall family (plaster_pale) so a later
# baked-pane variant is a constants-level material change, not a geometry change.
NICHE_WIDTH = 1.80
NICHE_SILL = 0.90
NICHE_SPRING = 1.60
NICHE_HEAD_R = 0.90
NICHE_PEAK = NICHE_SPRING + NICHE_HEAD_R  # 2.50
NICHE_RECESS = 0.22
NICHE_HEAD_SEGS = 8
NICHE_CENTRES = tuple(G_X1 - BAY_PITCH * (k - 0.5) for k in range(1, PILASTERS_PER_SIDE + 1))

# ---- east doorcase + stairlight lunette (RG-E1), around the UNCHANGED portal opening ----
DOOR_JAMB_W = 0.25  # jamb bands: PORTAL_Z0 - 0.25..PORTAL_Z0 and PORTAL_Z1..PORTAL_Z1 + 0.25
DOOR_BAND_Y = (2.40, 2.70)  # entablature/head band over the opening, across the doorcase
LUNETTE_R = 0.75  # half-disc on the X = G_X1 plane, centre (44, 2.70, 73): top 3.45
LUNETTE_RECESS = 0.15  # the back plane sits G_X1 - 0.15; its cells are PAINTED at re-encode
LUNETTE_SEGS = 8

# ---- portal frame (gallery-airlock portalFrom), X 43.2..44 (unchanged opening) ----------------
PORTAL_X0, PORTAL_X1 = 43.2, 44.0
PORTAL_Z0, PORTAL_Z1 = 72.2, 73.8  # 1.6 m clear opening, centred on Z = 73


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


def arc(c, half, spring, peak, segs):
    """Semi-elliptical profile as (across, up) pairs, spring -> peak -> spring."""
    out = []
    for i in range(segs + 1):
        a = math.pi * i / segs
        out.append((c - half * math.cos(a), spring + (peak - spring) * math.sin(a)))
    return out


def arc_lengths(profile):
    """Cumulative chord length along a sampled profile (metres); index 0 == 0.0."""
    out = [0.0]
    for i in range(1, len(profile)):
        out.append(
            out[-1]
            + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1])
        )
    return out


G_ARC = arc(G_ZC, 3.0, G_SPRING, G_PEAK, G_ARC_SEGS)  # (z, y)
P_ARC = arc(0.0, 4.0, P_SPRING, P_PEAK, P_ARC_SEGS)  # (x, y)
G_ARC_M = arc_lengths(G_ARC)  # cylindrical-law arc length per gallery-vault sample
P_ARC_M = arc_lengths(P_ARC)  # ... per passage-arch sample


def vault_y_at(z):
    """The gallery vault surface's height at across-coordinate z (the shell's own arc)."""
    u = (G_ZC - z) / (G_Z1 - G_ZC)
    u = min(1.0, max(-1.0, u))
    return G_SPRING + (G_PEAK - G_SPRING) * math.sin(math.acos(u))


# RG-E1 preflight: the rib soffit must clear the vault surface at every sample.
_RIB_PROFILE = arc(G_ZC, RIB_HALF_Z, RIB_SPRING_Y, RIB_CROWN_Y, RIB_ARC_SEGS)
RIB_CLEARANCE_M = min(vault_y_at(z) - y for z, y in _RIB_PROFILE)
if RIB_CLEARANCE_M <= 0.0:
    raise RuntimeError(
        f'rastrelli-gallery: rib/vault clearance violated: {RIB_CLEARANCE_M:.4f} m'
    )


class Builder:
    """bmesh builder with shared verts and explicit normal orientation toward/away a point.

    Every face is recorded as (face, kind, uvmap) in creation order (the roster): kind
    'box' maps ordinary box projection onto the albedo; kind 'cyl' carries a per-vertex
    (u, v) in arc/world metres for the cylindrical law (u = arc length along the profile).
    The roster order is the lightmap shelf's deterministic face index."""

    def __init__(self):
        self.bm = bmesh.new()
        self.cache = {}
        self.roster = []
        self.tags = {}

    def vert(self, p):
        key = (round(p[0], 4), round(p[1], 4), round(p[2], 4))
        v = self.cache.get(key)
        if v is None:
            v = self.bm.verts.new(to_b(key))
            self.cache[key] = v
        return v

    def face(self, pts, mat, ref, away=False, uid=None, tag=None):
        verts = []
        maps = []  # per-vertex (u, v) metres, parallel to verts; None for box faces
        for j, p in enumerate(pts):
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
                maps.append(None if uid is None else uid[j])
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
            maps.pop()
        if len(verts) < 3:
            return None
        n = Vector((0.0, 0.0, 0.0))
        for i, v in enumerate(verts):
            a, b = v.co, verts[(i + 1) % len(verts)].co
            n.x += (a.y - b.y) * (a.z + b.z)
            n.y += (a.z - b.z) * (a.x + b.x)
            n.z += (a.x - b.x) * (a.y + b.y)
        centre = sum((v.co for v in verts), Vector()) / len(verts)
        toward = Vector(to_b(ref)) - centre
        if (n.dot(toward) < 0.0) != away:
            verts.reverse()
            maps.reverse()
        try:
            f = self.bm.faces.new(verts)
        except ValueError:
            return None
        f.material_index = mat
        self.roster.append((f, 'cyl' if uid is not None else 'box', maps if uid is not None else None))
        if tag:
            self.tags[tag] = f
        return f

    def rows(self, rows, mat, ref_fn, away=False, uid_rows=None):
        for si, (ra, rb) in enumerate(zip(rows, rows[1:])):
            for i in range(len(ra) - 1):
                pts = [ra[i], ra[i + 1], rb[i + 1], rb[i]]
                uid = None
                if uid_rows is not None:
                    ur, ub = uid_rows[si], uid_rows[si + 1]
                    uid = [ur[i], ur[i + 1], ub[i + 1], ub[i]]
                self.face(pts, mat, ref_fn(pts), away, uid)

    def box(self, x0, x1, y0, y1, z0, z1, mat, skip=()):
        c = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        sides = {
            '-x': ((x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)),
            '+x': ((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)),
            '-y': ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
            '+y': ((x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)),
            '-z': ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)),
            '+z': ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
        }
        for name, pts in sides.items():
            if name not in skip:
                self.face(pts, mat, c, away=True)

    def cone(self, cx, cz, y0, r0, y1, r1, segs, mat):
        def ring(y, r):
            return [
                (cx + r * math.cos(TAU * i / segs), y, cz + r * math.sin(TAU * i / segs))
                for i in range(segs + 1)
            ]

        axis = (cx, (y0 + y1) / 2, cz)
        self.rows([ring(y0, r0), ring(y1, r1)], mat, lambda pts: axis, away=True)
        self.face(ring(y0, r0)[:-1], mat, (cx, y1, cz), away=True)  # bottom cap; top open


def project(normal, co):
    ax, ay, az = abs(normal.x), abs(normal.y), abs(normal.z)
    if ax >= ay and ax >= az:
        return (co.z, co.y)
    if ay >= az:
        return (co.x, co.z)
    return (co.x, co.y)


def count_overlaps(rects):
    """Pairwise overlap count over chart-space rects (x, y0, x1, y1), y from the top.
    EPS tolerances the touching boundaries: float drift between independently computed
    edges (1 - sum-of-cells) must not read as an overlap of whole cells."""
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
    """Deterministic row-shelf placement of (w, h, index) cells (w/h = the cell's inner px).

    Sorted by (height desc, width desc, index); rows wrap at res; first_row is the chart-y
    the shelf starts at (the reserved strip owns the rows above it). Returns
    {index: (x, y, w_total, h_total)} with the 2 px pad added to the footprints."""
    pad = int(LM_PAD_PX)
    ordered = sorted(cells, key=lambda item: (-item[1], -item[0], item[2]))
    placed = {}
    x = 0
    y = first_row
    row_h = 0
    for w, h, idx in ordered:
        wt, ht = w + 2 * pad, h + 2 * pad
        if x + wt > res:
            x = 0
            y += row_h
            row_h = 0
        if y + ht > res:
            return None
        placed[idx] = (x, y, wt, ht)
        x += wt
        row_h = max(row_h, ht)
    return placed


def finish(name, builder, materials, mode='shelf'):
    """Two UV layers: 'uv' (albedo: box projection, or the tagged cylindrical arc mapping,
    always world metres / UV_TILE_M) and 'lm' (the atlas cells).

    mode='shelf' (merged shell): per-face cells on the deterministic row shelf - cell size
    clamp(round(extent_m * px), 6, 480) px with the 2 px pad inside the footprint; px steps
    down from LM_PX_PER_M until the pack fits the atlas under the reserved strip.
    mode='strip' (the sconce template): the SAME atlas's reserved v range
    [LM_STRIP_FRAC, 1) as a grid of equal cells (ceil(sqrt(19)) columns), pads inside each
    cell (the legacy convention). Returns (mesh, triangles, lm_block)."""

    bm = builder.bm
    bm.normal_update()
    uv_lay = bm.loops.layers.uv.new('uv')
    lm_lay = bm.loops.layers.uv.new('lm')
    roster = [entry for entry in builder.roster if entry[0] is not None]
    pad_px = int(LM_PAD_PX)
    pad_uv = LM_PAD_PX / LM_RES
    first_row = int(round((1.0 - LM_STRIP_FRAC) * LM_RES))  # chart rows the strip owns

    def planar(entry):
        _f, _kind, uid = entry
        if uid is not None:
            return list(uid)
        f = _f
        return [project(f.normal, loop.vert.co) for loop in f.loops]

    faces_uv = [(entry, planar(entry)) for entry in roster]

    if mode == 'shelf':
        extents = []
        for _entry, uv in faces_uv:
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            du = (max(us) - min(us)) or 1.0
            dv = (max(vs) - min(vs)) or 1.0
            extents.append((du, dv))
        px = float(LM_PX_PER_M)
        placed = None
        cell_px = None
        while px >= 1.0:
            cell_px = [
                (
                    min(max(int(round(du * px)), LM_CELL_MIN_PX), LM_CELL_MAX_PX),
                    min(max(int(round(dv * px)), LM_CELL_MIN_PX), LM_CELL_MAX_PX),
                )
                for du, dv in extents
            ]
            cells = [(w, h, idx) for idx, (w, h) in enumerate(cell_px)]
            placed = shelf_pack(cells, LM_RES, first_row)
            if placed is not None:
                break
            px -= 1.0
        if placed is None:
            raise RuntimeError('rastrelli-gallery: the lm shelf does not fit even at 1 px/m')
        for idx, (entry, uv) in enumerate(faces_uv):
            f, kind, uid = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            x, y, wt, ht = placed[idx]
            w_in, h_in = wt - 2 * pad_px, ht - 2 * pad_px  # the clamp'd cell = footprint − pad
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
    else:
        grid = LM_SCONCE_GRID
        cell_w = 1.0 / grid
        cell_h = (1.0 - LM_STRIP_FRAC) / grid
        inner_u = max(cell_w - 2.0 * pad_uv, cell_w * 0.5)
        inner_v = max(cell_h - 2.0 * pad_uv, cell_h * 0.5)
        for idx, (entry, uv) in enumerate(faces_uv):
            f, kind, uid = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            u_base = (idx % grid) * cell_w
            v_base = LM_STRIP_FRAC + (idx // grid) * cell_h
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
            y0 = 1.0 - (LM_STRIP_FRAC + (idx // grid + 1) * cell_h)  # chart y-from-top
            chart.append((x0, y0, x0 + cell_w, y0 + cell_h))
        block = {
            'mode': 'strip',
            'grid': grid,
            'cellPx': [cell_w * LM_RES, cell_h * LM_RES],
            # the strip's share of the atlas: used is ALREADY an atlas fraction here
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
    stair = builder.tags.get('stairlight')
    if stair is not None:
        if mode != 'shelf':
            raise RuntimeError('the stairlight patch is expected on the shelf pack')
        find = None
        for idx, (entry, _uv) in enumerate(faces_uv):
            if entry[0] is stair:
                find = idx
                break
        if find is None:
            raise RuntimeError('the stairlight face vanished from the roster')
        x, y, wt, ht = placed[find]
        patches['stairlight'] = [x, y, wt, ht]
    block['patches'] = patches

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return me, tris, block


# ---- procedural textures --------------------------------------------------------------------
def _per(k, p):
    return TAU * k * p / TEX_RES


def stone_flags_px(x, y):
    fy = y / FLAG_PX
    row = int(fy)
    fx = x / FLAG_PX + (0.5 if row % 2 else 0.0)  # running bond
    col = int(fx)
    u, v = fx - col, fy - row
    m = MORTAR_PX / FLAG_PX
    grain = 0.03 * math.sin(_per(5, x)) * math.cos(_per(7, y)) + 0.02 * math.sin(_per(3, x + y))
    if u < m or v < m:
        return tuple(c * (1.0 + grain) for c in MORTAR_RGB)
    ci, ri = col % FLAGS_PER_TILE, row % FLAGS_PER_TILE
    shade = 0.82 + 0.07 * math.sin(2.3 * ci + 1.7 * ri) + 0.05 * math.cos(0.9 * ci - 2.6 * ri)
    edge = min(u - m, v - m, 1.0 - u, 1.0 - v) / (1.0 - m)
    wear = 0.86 + 0.14 * min(1.0, edge * 8.0)
    k = shade * wear * (1.0 + grain)
    return tuple(c * k for c in STONE_RGB)


def _isotropic_mottle(x, y, a1, a2, a3):
    """The palette's isotropic mottle: sin(3x)sin(2y), cos(7x)cos(5y), sin(13x)sin(11y) - no
    x-y diagonal term (the phase-2 plaster's diagonal term retires with the dark look)."""
    return (
        a1 * math.sin(_per(3, x)) * math.sin(_per(2, y))
        + a2 * math.cos(_per(7, x)) * math.cos(_per(5, y))
        + a3 * math.sin(_per(13, x)) * math.sin(_per(11, y))
    )


def plaster_pale_px(x, y):
    return tuple(c * (1.0 + _isotropic_mottle(x, y, 0.02, 0.012, 0.008)) for c in PLASTER_PALE_RGB)


def stucco_grey_px(x, y):
    return tuple(c * (1.0 + _isotropic_mottle(x, y, 0.01, 0.006, 0.004)) for c in STUCCO_GREY_RGB)


def write_texture(name, fn, tex_dir):
    img = bpy.data.images.new(name, TEX_RES, TEX_RES, alpha=False)
    buf = [1.0] * (TEX_RES * TEX_RES * 4)
    for y in range(TEX_RES):
        for x in range(TEX_RES):
            r, g, b = fn(x, y)
            i = 4 * (y * TEX_RES + x)
            buf[i] = min(1.0, max(0.0, r))
            buf[i + 1] = min(1.0, max(0.0, g))
            buf[i + 2] = min(1.0, max(0.0, b))
    img.pixels.foreach_set(buf)
    path = os.path.join(tex_dir, f'{name}.png')
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img, path


def material(name, image, emission=None):
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
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    return mat


def flat_material(name, rgb, roughness, emission=None):
    """A Principled with no texture: base colour + roughness (+ optional glow emission)."""
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


# ---- merged shell parts ----------------------------------------------------------------------
def niche_head_pts(x_c):
    """The blind arch's head arc, left spring -> peak -> right spring, 8 segments."""
    return [
        (
            x_c - NICHE_HEAD_R * math.cos(math.pi * i / NICHE_HEAD_SEGS),
            NICHE_SPRING + NICHE_HEAD_R * math.sin(math.pi * i / NICHE_HEAD_SEGS),
        )
        for i in range(NICHE_HEAD_SEGS + 1)
    ]


def build_wall_side(b, z_wall, in_dir, mat_wall, mat_stucco):
    """One gallery side wall with its 11 blind niches. in_dir -1 = the south wall (recess
    -z) / +1 = the north wall. Columns merge the gallery x nodes with every niche jamb; a
    column pair inside a niche span carries only the sill band (the opening eats
    y 0.9..arc); around each opening the wall becomes the niche's surround strips (bottom
    band under the sill, the full-height side strips as ordinary columns, the top n-gon
    whose lower edge is the head arc). The reveals (stucco) close the recess."""

    jambs = [(x_c, x_c - NICHE_WIDTH / 2.0, x_c + NICHE_WIDTH / 2.0) for x_c in NICHE_CENTRES]
    all_jambs = [x for _c, x_a, x_b in jambs for x in (x_a, x_b)]
    cols = sorted(set(XS_G) | set(all_jambs))

    def side_ref(pts):
        mx = (pts[0][0] + pts[1][0]) / 2.0
        return (min(max(mx, XS_GI[0] + 0.5), G_X1 - 0.5), 1.0, G_ZC)

    for u, v in zip(cols, cols[1:]):
        niche = next((nl for nl in jambs if nl[1] <= u and v <= nl[2]), None)
        y_top = NICHE_SILL if niche is not None else G_SPRING
        b.rows(
            [[(x, 0.0, z_wall) for x in (u, v)], [(x, y_top, z_wall) for x in (u, v)]],
            mat_wall,
            side_ref,
        )
    for x_c, x_a, x_b in jambs:
        head = niche_head_pts(x_c)
        z_back = z_wall + in_dir * NICHE_RECESS
        z_m = (z_wall + z_back) / 2.0
        # top surround strip: ONE n-gon whose lower edge is the head arc, wall top at 3.0
        b.face(
            [(x, y, z_wall) for x, y in head] + [(x_b, G_SPRING, z_wall), (x_a, G_SPRING, z_wall)],
            mat_wall,
            (x_c, 1.7, z_back - in_dir * 0.5),
        )
        # jamb reveal cheeks (stucco): the recess's side walls
        b.face(
            [(x_a, NICHE_SILL, z_wall), (x_a, NICHE_SILL, z_back),
             (x_a, NICHE_SPRING, z_back), (x_a, NICHE_SPRING, z_wall)],
            mat_stucco,
            (x_c, NICHE_SILL + 0.3, z_m),
        )
        b.face(
            [(x_b, NICHE_SILL, z_wall), (x_b, NICHE_SILL, z_back),
             (x_b, NICHE_SPRING, z_back), (x_b, NICHE_SPRING, z_wall)],
            mat_stucco,
            (x_c, NICHE_SILL + 0.3, z_m),
        )
        # sill reveal: the pocket's floor
        b.face(
            [(x_a, NICHE_SILL, z_wall), (x_a, NICHE_SILL, z_back),
             (x_b, NICHE_SILL, z_back), (x_b, NICHE_SILL, z_wall)],
            mat_stucco,
            (x_c, NICHE_SILL + 0.6, z_m),
        )
        # arch reveal: the half-disc edge ruled back at 0.22
        for i in range(len(head) - 1):
            (x0, y0), (x1, y1) = head[i], head[i + 1]
            b.face(
                [(x0, y0, z_wall), (x1, y1, z_wall), (x1, y1, z_back), (x0, y0, z_back)],
                mat_stucco,
                (x_c, 0.5, z_m),
            )
        # back: ONE polygon (plaster_pale - the wall family, future pane-swap slot:
        # bottom edge, the left jamb cheek's inner edge, the full head arc, the right edge)
        b.face(
            [(x_a, NICHE_SILL, z_back)]
            + [(x, y, z_back) for x, y in head]
            + [(x_b, NICHE_SILL, z_back)],
            mat_wall,
            (x_c, 1.7, z_wall - in_dir * 0.5),
        )


def build_pilasters(b, mat):
    """The 24 pilasters inline in the merged shell (RG-E1: per-face cells + per-position
    lighting beat the shared template; proportions stay exactly the template's)."""
    for x in PILASTER_X:  # the two long walls: protrusion toward the room centreline
        emit_pilaster(b, mat, 'south', x, G_Z0)
        emit_pilaster(b, mat, 'north', x, G_Z1)
    for z in CORNER_RETURN_Z:  # the east end wall's corner returns: protrusion toward -x
        emit_pilaster(b, mat, 'east', G_X1, z)


def emit_pilaster(b, mat, mode, a, b_):
    """One pilaster in world coordinates. mode south: wall plane z = a... no -
    (axis_x, axis_z) => a is the station x, b_ the wall z (south/north) or the station z
    (east, a = 44). The local frame: width x0..x1, height y0..y1, protrusion d0..d1."""
    if mode == 'south':
        W = lambda lx, ly, ld: (a + lx, ly, b_ + ld)  # noqa: E731
    elif mode == 'north':
        W = lambda lx, ly, ld: (a - lx, ly, b_ - ld)  # noqa: E731
    else:  # 'east' corner return: protrusion toward -x, width runs along z
        W = lambda lx, ly, ld: (a - ld, ly, b_ + lx)  # noqa: E731
    parts = (
        (-0.28, 0.28, 0.0, 0.15, 0.0, 0.16, ('wall', 'ground')),  # plinth
        (-0.25, 0.25, 0.15, 0.30, 0.0, 0.13, ('wall', 'ground')),  # base
        (-0.20, 0.20, 0.30, 2.45, 0.0, 0.10, ('wall', 'ground', 'top')),  # shaft
        (-0.28, 0.28, 2.45, 2.70, 0.0, 0.16, ('wall', 'top')),  # capital under cornice
    )
    for lx0, lx1, y0, y1, d0, d1, skips in parts:
        lm, ym, dm = (lx0 + lx1) / 2.0, (y0 + y1) / 2.0, (d0 + d1) / 2.0
        faces = {
            'wall': ([(lx0, y0, d0), (lx1, y0, d0), (lx1, y1, d0), (lx0, y1, d0)],
                     W(lm, ym, d0 - 0.2)),
            'ground': ([(lx0, y0, d0), (lx1, y0, d0), (lx1, y0, d1), (lx0, y0, d1)],
                       W(lm, y0 - 0.2, dm)),
            'top': ([(lx0, y1, d0), (lx1, y1, d0), (lx1, y1, d1), (lx0, y1, d1)],
                    W(lm, y1 + 0.2, dm)),
            'out': ([(lx0, y0, d1), (lx0, y1, d1), (lx1, y1, d1), (lx1, y0, d1)],
                    W(lm, ym, d1 + 0.2)),
            '-x': ([(lx0, y0, d0), (lx0, y1, d0), (lx0, y1, d1), (lx0, y0, d1)],
                   W(lx0 - 0.2, ym, dm)),
            '+x': ([(lx1, y0, d0), (lx1, y0, d1), (lx1, y1, d1), (lx1, y1, d0)],
                   W(lx1 + 0.2, ym, dm)),
        }
        for name, (pts, ref) in faces.items():
            if name in skips:
                continue
            b.face([W(*p) for p in pts], mat, ref)


def build_ribs(b, mat_stucco):
    """The 11 transverse ribs: two side n-gons (between the rib soffit arc and the vault)
    plus the 8-quad soffit strip the two side profiles close. RIB_CLEARANCE_M governs."""
    rib = _RIB_PROFILE
    vault = [
        (G_ZC - (G_Z1 - G_ZC) * math.cos(math.pi * i / RIB_ARC_SEGS),
         G_SPRING + (G_PEAK - G_SPRING) * math.sin(math.pi * i / RIB_ARC_SEGS))
        for i in range(RIB_ARC_SEGS + 1)
    ]
    for x_station in PILASTER_X:
        for x0, ref_x in (
            (x_station - RIB_WIDTH / 2.0, x_station - RIB_WIDTH),
            (x_station + RIB_WIDTH / 2.0, x_station + RIB_WIDTH),
        ):
            ring = [(x0, z, y) for z, y in rib] + [(x0, z, y) for z, y in reversed(vault)]
            b.face(ring, mat_stucco, (ref_x, 1.0, G_ZC))
        prof0 = [(x_station - RIB_WIDTH / 2.0, z, y) for z, y in rib]
        prof1 = [(x_station + RIB_WIDTH / 2.0, z, y) for z, y in rib]
        b.rows([prof0, prof1], mat_stucco, lambda _pts: (x_station, 0.0, G_ZC))


def build_doorcase(b, mat_stucco, mat_wall, mat_stair):
    """The east doorcase under the UNCHANGED portal opening plus the stairlight lunette.

    The x = 44 wall re-partitions: jamb bands and the head band are trim boxes; the wall
    plane keeps the plain side fields, the under-band strips and - above the head band -
    the lunette hole with its arched surround and reveal, whose back quad (part
    'stairlight') carries the per-state painted patch."""
    for z_a, z_b in ((PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z0), (PORTAL_Z1, PORTAL_Z1 + DOOR_JAMB_W)):
        b.box(PORTAL_X0, G_X1, 0.0, DOOR_BAND_Y[0], z_a, z_b, mat_stucco, skip=('+x', '-y'))
    b.box(
        PORTAL_X0, G_X1, DOOR_BAND_Y[0], DOOR_BAND_Y[1],
        PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z1 + DOOR_JAMB_W, mat_stucco, skip=('+x',),
    )
    # wall plane x = 44: plain side fields under the doorcase band
    for z_a, z_b in ((G_Z0, PORTAL_Z0 - DOOR_JAMB_W), (PORTAL_Z1 + DOOR_JAMB_W, G_Z1)):
        b.rows(
            [[(G_X1, 0.0, z) for z in (z_a, z_b)],
             [(G_X1, DOOR_BAND_Y[0], z) for z in (z_a, z_b)]],
            mat_wall,
            lambda _pts: (G_X1 - 0.5, 1.0, G_ZC),
        )
    lunette = [
        (G_ZC - LUNETTE_R * math.cos(math.pi * i / LUNETTE_SEGS),
         DOOR_BAND_Y[1] + LUNETTE_R * math.sin(math.pi * i / LUNETTE_SEGS))
        for i in range(LUNETTE_SEGS + 1)
    ]
    z_l, z_r = G_ZC - LUNETTE_R, G_ZC + LUNETTE_R
    back_x = G_X1 - LUNETTE_RECESS
    # side fields between the head band and the spring line, plus their tympanum slices
    for z_a, z_b in ((G_Z0, z_l), (z_r, G_Z1)):
        b.rows(
            [[(G_X1, DOOR_BAND_Y[1], z) for z in (z_a, z_b)],
             [(G_X1, G_SPRING, z) for z in (z_a, z_b)]],
            mat_wall,
            lambda _pts: (G_X1 - 0.5, 1.0, G_ZC),
        )
        samples = sorted(
            set([z_a, z_b])
            | {
                z
                for z, _y in G_ARC
                if z_a + 1e-6 < z < z_b - 1e-6
            }
        )
        base = [(G_X1, G_SPRING, z) for z in samples]
        crown = [(G_X1, vault_y_at(z), z) for z in samples]
        b.rows([base, crown], mat_wall, lambda _pts: (G_X1 - 0.5, 3.2, G_ZC))
    # the lunette's arched surround (stucco): ONE n-gon between the head arc, the side
    # fields and the vault arc directly above the hole
    ring = (
        [(G_X1, y, z) for z, y in lunette]
        + [(G_X1, vault_y_at(z_r), z_r), (G_X1, vault_y_at(G_ZC), G_ZC), (G_X1, vault_y_at(z_l), z_l)]
    )
    b.face(ring, mat_stucco, (G_X1 - 0.5, 3.2, G_ZC))
    # the arched recess reveal (stucco): the head arc ruled back 0.15
    for i in range(LUNETTE_SEGS):
        (z0, y0), (z1, y1) = lunette[i], lunette[i + 1]
        b.face(
            [(G_X1, y0, z0), (G_X1, y1, z1), (back_x, y1, z1), (back_x, y0, z0)],
            mat_stucco,
            (back_x + 0.05, DOOR_BAND_Y[1], G_ZC),
        )
    # the stairlight back: ONE quad on the recess plane - the atlas cells are PAINTED
    # per published state at re-encode (tools/reencode.mjs), never a glass swap
    b.face(
        [(back_x, DOOR_BAND_Y[1], z_l), (back_x, DOOR_BAND_Y[1], z_r),
         (back_x, DOOR_BAND_Y[1] + LUNETTE_R, z_r), (back_x, DOOR_BAND_Y[1] + LUNETTE_R, z_l)],
        mat_stair,
        (back_x - 0.5, DOOR_BAND_Y[1], G_ZC),
        tag='stairlight',
    )


def build_shell(mat_pale, mat_stone, mat_stucco, mat_stair):
    b = Builder()
    pl, st, sg, sl = 0, 1, 2, 3

    def g_ref(pts):  # interior point of the gallery, pulled off the end planes
        mx = sum(p[0] for p in pts) / len(pts)
        return (min(max(mx, XS_GI[0] + 0.5), G_X1 - 0.5), 1.0, G_ZC)

    def p_ref(pts):  # interior point of the passage
        mz = sum(p[2] for p in pts) / len(pts)
        return (0.0, 1.0, min(max(mz, P_Z0 + 0.5), P_Z1 - 0.5))

    # gallery floor + the straight-soffit reveal over the passage mouth
    b.rows([[(x, 0.0, z) for z in (G_Z0, G_ZC, G_Z1)] for x in XS_G], st, g_ref)
    b.rows([[(x, G_SPRING, z) for z in (G_Z0, G_Z1)] for x in (G_X0, G_X0 + G_REVEAL)], pl, g_ref)
    # side walls (with the niche cuts), then the shallow vault + tympana
    for z_wall, in_dir in ((G_Z0, -1.0), (G_Z1, 1.0)):
        build_wall_side(b, z_wall, in_dir, pl, sg)
    # shallow vault: CYLINDRICAL uv (u = arc length along the profile, v = x); the point
    # is to kill the wood-grain streak box projection paints on the curved surfaces
    vault_rows = [[(x, y, z) for (z, y) in G_ARC] for x in XS_GI]
    vault_uid = [[(G_ARC_M[i], x) for i in range(len(G_ARC))] for x in XS_GI]
    b.rows(vault_rows, pl, g_ref, uid_rows=vault_uid)
    for x in (XS_GI[0], G_X1):
        base = [(x, G_SPRING, z) for (z, _y) in G_ARC]
        crown = [(x, y, z) for (z, y) in G_ARC]
        b.rows([base, crown], pl, g_ref)
    # trim: cornice + skirting profiles extruded along both gallery walls (stucco)
    for z, s in ((G_Z0, 1.0), (G_Z1, -1.0)):
        b.rows([[(x, y, z + s * d) for (d, y) in CORNICE] for x in XS_GI], sg, g_ref)
        b.rows([[(x, y, z + s * d) for (d, y) in SKIRTING] for x in XS_GI], sg, g_ref)
    # passage: floor, west wall, east wall minus the gallery mouth (Z 70..76), vault, north end
    b.rows([[(x, 0.0, z) for x in (P_X0, 0.0, P_X1)] for z in P_Z_NODES], st, p_ref)
    b.rows([[(P_X0, y, z) for y in (0.0, P_SPRING)] for z in P_Z_NODES], pl, p_ref)
    for zs in (P_Z_NODES[:3], P_Z_NODES[4:]):
        b.rows([[(P_X1, y, z) for y in (0.0, P_SPRING)] for z in zs], pl, p_ref)
    p_rows = [[(x, y, z) for (x, y) in P_ARC] for z in P_Z_NODES]
    p_uid = [[(P_ARC_M[i], z) for i in range(len(P_ARC))] for z in P_Z_NODES]
    b.rows(p_rows, pl, p_ref, uid_rows=p_uid)
    b.rows([[(x, y, P_Z0) for y in (0.0, P_SPRING)] for x in (P_X0, P_X1)], pl, p_ref)
    base = [(x, P_SPRING, P_Z0) for (x, _y) in P_ARC]
    crown = [(x, y, P_Z0) for (x, y) in P_ARC]
    b.rows([base, crown], pl, p_ref)
    # the bay furniture inline in this datablock: pilasters, ribs, doorcase + lunette
    build_pilasters(b, sg)
    build_ribs(b, sg)
    build_doorcase(b, sg, pl, sl)
    return finish('shell', b, [mat_pale, mat_stone, mat_stucco, mat_stair])


def build_sconce(mat_iron, mat_glow):
    """Local frame as the pilaster template's: back plate + arm (iron_dark - the recorded
    slot bug fixed) + open-top shade (glow, emission 6.0). The 19 faces take equal cells
    on the atlas's reserved strip (5x5 grid, finish(mode='strip'))."""
    b = Builder()
    b.box(-0.06, 0.06, -0.32, 0.18, 0.0, 0.03, 0, skip=('-z',))  # back plate
    b.box(-0.03, 0.03, 0.02, 0.10, 0.03, 0.24, 0, skip=('-z',))  # bracket arm
    b.cone(0.0, 0.22, 0.10, 0.06, 0.38, 0.11, SCONCE_SEGS, 1)  # shade
    return finish('sconce', b, [mat_iron, mat_glow], mode='strip')


def instance(name, me, location, rot_y=0.0):
    """location/rot_y in world terms (rotation about world +Y == Blender +Z)."""
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def main():
    stage = stage_dir()
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    img_stone, png_stone = write_texture('stone_flags', stone_flags_px, tex_dir)
    img_pale, png_pale = write_texture('plaster_pale', plaster_pale_px, tex_dir)
    img_stucco, png_stucco = write_texture('stucco_grey', stucco_grey_px, tex_dir)
    mat_stone = material('stone_flags', img_stone)
    mat_pale = material('plaster_pale', img_pale)
    mat_stucco = material('stucco_grey', img_stucco)
    mat_stair = flat_material('stairlight', (1.0, 1.0, 1.0), 1.0)
    mat_iron = flat_material('iron_dark', IRON_RGB, IRON_ROUGHNESS)
    mat_glow = flat_material('sconce_glow', GLOW_TINT_RGB, 0.92, emission=SCONCE_GLOW_RGB)
    me_shell, t_shell, lm_shell = build_shell(mat_pale, mat_stone, mat_stucco, mat_stair)
    me_sconce, t_sconce, lm_strip = build_sconce(mat_iron, mat_glow)
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
        'shell': {'triangles': t_shell, 'instances': 1, 'primitives': 4},
        'sconce': {'triangles': t_sconce, 'instances': SCONCE_COUNT, 'primitives': 2},
    }
    lm_block = dict(lm_shell)
    lm_block['strip'] = lm_strip
    summary = {
        'room': ROOM_ID,
        'glb': glb_path,
        'textures': {'stone_flags': png_stone, 'plaster_pale': png_pale, 'stucco_grey': png_stucco},
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
            'nicheCount': len(NICHE_CENTRES) * 2,
            'ribCount': len(PILASTER_X),
            'ribClearanceM': round(RIB_CLEARANCE_M, 4),
            'doorJambWidthM': DOOR_JAMB_W,
            'lunetteRadiusM': LUNETTE_R,
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
