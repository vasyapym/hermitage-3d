"""Zimny phase-2 - jordan (Jordan Staircase) — the complete kit (envelope + ascent + order).

Deterministic bpy authoring for Blender 4.2 LTS. Everything is authored in glTF world axes
(+X east, +Z south / Palace Square, -Z north / Neva, +Y up); Blender = (x, -z, y).
The envelope ('shell' and 'pane': geometry, UVs, lm cells) is frozen; the ascent adds NEW
meshes only: 'stairs', 'rail', 'baluster' (instanced), 'column' (x2), 'portal' (with vase
niches and closed doors), 'chandelier' and 'sconce' (instanced). Jordan details slice 1
(design-staircase.md §2.2 hero-mesh + materials rows, §4.4 look-law consumer, §9 budget
rows; design-walkthrough-ux.md §8 stop subjects, §9 stair-arrival clauses;
docs/artistic-license.md 'Jordan wall order' row) adds the wall ORDER against the frozen
shell: 'cornice' (the two-step entablature ring at the vault spring + the vestibule trim),
'pilaster' + 'pilaster_base' (instanced giant order on the window piers and the east wall,
gilt capitals, the east bases at landing level), 'window_frame' (instanced stucco
architraves on all twelve windows); the east portal deepens to a 0.7 m aedicule with
closed double doors; the columns gain base, entasis and a gilt capital whose abacus
carries the cornice; the balustrade thickens; the four procedural textures retune to white
stucco / Carrara marble / grey-pink granite / gold (gilt metallic 0.5). Emitters (pane,
sconce_glow, chandelier_glow) are byte-identical to the committed kit: fixture FORM awaits
real-object evidence (DEC-026). Kit lm cells start at LM_PART2_FIRST_CELL; instanced
props share their template's cells (ADR-0013 probe). No randomness, no noise, no
tangents. Two UV layers per mesh: 'uv' (box, metres / UV_TILE_M) and 'lm' (per-face
padded cell in a FIXED 64 x 64 grid over LM_RES).

Template convention for wall-mounted instanced props (sconce, pilaster, pilaster_base,
window_frame): the wall is the template plane z = 0, the prop projects toward -Z;
rot_y -pi/2 mounts it on the west wall, pi on the north, pi/2 on the east, 0 on the south.

Orchestrator adjudication vs the specialist draft: stage_dir() binds to the asset.mjs
driver convention (`-- --room <id> --out <stage>`; `--stage`, a bare positional path, and
ZIMNY_STAGE are also accepted) - the draft's bare argv[0] would have consumed the literal
'--room' flag.
"""
import json
import math
import os
import sys
from pathlib import Path

import bpy
import numpy as np

# Round 17a: tools/bpy/bake.py exec's this builder with ZIMNY_BAKE=1 — build the scene,
# skip the export + summary (the bake owns stdout and never writes the glb).
BAKE = os.environ.get('ZIMNY_BAKE') == '1'

ROOM_ID = 'jordan'
STAGE = 'full'

# ---- declared envelope (metres, glTF world) ------------------------------------------------
X_W, X_E = 66.0, 92.0  # 26 m wide
Z_N, Z_S = -86.0, -62.0  # 24 m deep; north wall (Z -86) = Neva front, window tiers
Y_FLOOR = 0.0
VAULT_SPRING_Y = 18.0
Y_CROWN = 20.0  # hall height (declared)
LANDING_Y = 10.0  # part-2 first-floor slab (reserved constant)
HALL_REF = ((X_W + X_E) / 2, 9.0, (Z_N + Z_S) / 2)

VAULT_NZ = 8  # facets across the span (segmental barrel, axis along X)
VAULT_NX = 8  # coffer columns along X
COFFER_INSET = 0.18  # fraction of facet edge
COFFER_DEPTH = 0.35
FLOOR_DIV = (10, 10)
END_WALL_DIV = (4, 3)

WIN_BAYS = 6
WIN_PITCH = 3.9
WIN_W = 2.2
WIN_RECESS = 0.6
WIN_TIERS = ((3.0, 6.5), (13.0, 16.5))  # (sill, head)

PORT_R = 1.0
PORT_SQ = 1.3  # half-size of the square cut that carries the ring
PORT_DEPTH = 0.3
PORT_SEG = 16
PORT_Y = (4.75, 14.75)  # one porthole per window bay per tier, south wall

VEST_X = (78.0, 84.0)
VEST_Z = (-68.0, -62.0)
VEST_H = 3.0
DOOR_X = (79.5, 82.5)
DOOR_H = 2.6
DOOR_RECESS = 0.4

UV_TILE_M = 2.0
LM_RES = 2048
LM_PAD_PX = 2
LM_GRID = 64  # 32 px cells, 28 px inner; fixed so part 2 cannot shift envelope cells
LM_PART2_FIRST_CELL = 1536
PANE_EMISSION = 6.0
PANE_EMISSION_RGB = (1.0, 0.82, 0.58)

TEXTURES = (('marble_floor', 512), ('plaster_warm', 512), ('granite_grey', 256), ('gilt', 256))
MAT_PLASTER, MAT_MARBLE = 0, 1

# ---- PART 2: the ascent (new constants; everything above is the frozen envelope) -----------

KIT_BASE, KIT_GLOW = 0, 1  # per-mesh material slots for the two-slot kit meshes (sconce, chandelier)
KIT_ACCENT = 1  # the gilt slot on the two-slot ORDER meshes (column, portal, pilaster); cornice, pilaster_base, window_frame are plaster-only
KIT_GLOW_RGB = (1.0, 0.86, 0.62)
KIT_GLOW_EMISSION = 6.0
GILT_METALLIC = 0.5  # half diffuse (the lightmap lights it), half specular (the ADR-0013 probe)
LM_CAPACITY = LM_GRID * LM_GRID  # 4096 cells

RISERS = 35  # per flight; the 35th riser is the slab edge of the level above
TREADS = RISERS - 1
RISE = 5.0 / RISERS  # 0.142857 m (both flights climb 5 m)
GOING = 0.32
RUN = TREADS * GOING  # 10.88 m plan run per flight
STRINGER_T = 0.45  # vertical thickness of the stringer/soffit slab under the nose line
SLAB_T = 0.5

MEZZ_Y = 5.0
F1_X = (X_W, X_W + 1.6)  # flight 1 hugs the west wall and climbs northward
F1_TOP_Z = -79.0  # mezzanine edge (top nose) of flight 1
F1_Z0 = F1_TOP_Z + RUN  # -68.12, first riser, 2 m north of the vestibule
MEZZ_Z = (-84.4, F1_TOP_Z)
F2_TOP_X = 80.0  # landing edge (top nose) of flight 2
F2_X0 = F2_TOP_X - RUN  # 69.12
MEZZ_X = (X_W, F2_X0)
F2_Z = (-84.4, -82.8)  # flight 2 runs east along the window wall, 1.6 m clear of it
LAND_X = (F2_TOP_X, X_E)
LAND_Z = (-84.4, -64.0)

FLIGHTS = (
    {'name': 'flight1', 'axis': 'z', 'a0': F1_Z0, 'd': -1.0, 'band': F1_X,
     'y': (Y_FLOOR, MEZZ_Y), 'open': (F1_X[1],)},
    {'name': 'flight2', 'axis': 'x', 'a0': F2_X0, 'd': 1.0, 'band': F2_Z,
     'y': (MEZZ_Y, LANDING_Y), 'open': F2_Z},
)

RAIL_INSET = 0.1  # rail / baluster centre line inboard of the open edge
RAIL_TOP = 1.0  # rail top above the flight datum (nose line - one rise) and the slab edges
RAIL_PROFILE = (0.16, 0.10)  # (width, height) of the rectangular handrail section
RAIL_RUNS = (
    ((F1_X[1] - RAIL_INSET, Y_FLOOR, F1_Z0),
     (F1_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET),
     (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET),
     (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, F2_Z[1] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, F2_Z[1] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET),
     (LAND_X[1] - RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET)),
    ((X_W + 0.15, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET),
     (F2_X0, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET),
     (LAND_X[1] - RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET)),
)

BALUSTER_PITCH = 0.55  # count per segment = int(horizontal length / pitch + 0.5) -> N = 151
BALUSTER_SEG = 8
BALUSTER_RINGS = ((0.06, -2 * RISE), (0.085, 0.03), (0.04, 0.16), (0.075, 0.45), (0.04, 0.74),
                  (0.065, 0.93))  # (radius, y above datum); root sunk two rises into the step

COLUMN_XZ = ((91.0, -76.6), (91.0, -71.4))  # twin granite columns flanking the portal
COLUMN_SEG = 16
COLUMN_PLINTH = (0.65, 0.3)  # half-width, height
# One granite lathe: torus base, entasis shaft; (radius, local y) bottom -> top.
COLUMN_SHAFT_RINGS = ((0.62, 0.30), (0.62, 0.40), (0.54, 0.48), (0.50, 0.56), (0.50, 2.40),
                      (0.47, 4.40), (0.42, 6.20))
COLUMN_CAPITAL_RINGS = ((0.42, 6.20), (0.45, 6.32), (0.56, 6.55), (0.60, 6.72))  # gilt echinus
COLUMN_ABACUS = (0.65, 6.72, 7.0)  # half-width, y0, y1 — top at Y 17.0 = the cornice bottom

PORTAL_Z = -74.0
PORTAL_HALF_W = 1.5
PORTAL_H = 6.0
PORTAL_JAMB = 0.5
PORTAL_DEPTH = 0.7  # frame face proud of the east wall (the reveal the doors sit in)
PORTAL_HEAD = 0.4  # head band height above the opening
PORTAL_ENTAB = (16.4, 17.0, 1.9, 0.9)  # y0, y1, half-width, proud — tops out at the cornice; 1.9 keeps 0.05 m clear of the column abaci (z -75.95)
DOOR_LEAF = (0.14, 0.06)  # leaf slab x-offsets from the wall: back, front (0.08 m thick)
DOOR_MOULD = (0.14, 0.05)  # gilt moulding width, proud of the leaf
DOOR_STILES_DZ = (-1.43, 0.0, 1.43)  # outer stiles flush with the opening, one meeting stile
DOOR_RAILS_Y = (10.5, 12.9, 15.0, 15.7)  # bottom, lock, frieze, top rails — WORLD y (bottom 0.5 over the slab, top under the door head)
DOOR_MARGIN = 0.07  # stiles stop this far short of sill and head

NICHE_DZ = 5.5  # niche bays either side of the portal axis
NICHE_OUTER = (0.75, 10.8, 14.4)  # half-width, y0, y1 of the aedicule
NICHE_OPEN = (0.5, 11.1, 14.0)  # half-width, sill, head of the recess
NICHE_DEPTH = 0.45  # frame face proud of the wall
NICHE_CAVITY = 0.35
PEDESTAL = (0.2, 0.25)  # half-width, height
VASE_SEG = 6
VASE_RINGS = ((0.07, 0.0), (0.13, 0.2), (0.17, 0.55), (0.09, 1.0), (0.07, 1.15), (0.12, 1.27))

CHAND_C = (86.0, -74.0)  # over the landing centre
CHAND_RING_Y = 15.0
CHAND_R = (1.45, 1.6)  # inner, outer radius of the gilt ring
CHAND_BAND = 0.2
CHAND_SEG = 10
CHAND_ROD = 0.06
CHAND_ROD_TOP = 19.9
CHAND_DROP = (0.12, 0.3, 0.12)  # pendant octahedron half-extents
CHAND_DROP_R = 1.5
CHAND_DROP_Y = 14.5
CHAND_CORE = (0.4, 0.8, 0.4)
CHAND_CORE_Y = 14.2

SCONCE_ABOVE = 1.8  # above the flight datum
SCONCE_WEST_Z = (-69.5, -71.5, -73.5, -75.5, -77.5)  # flight 1, west wall, pitch 2.0
SCONCE_NORTH_X = (71.2, 75.1, 79.0)  # flight 2, window piers between bays 1-2, 2-3, 3-4
SCONCE_EAST = ((-82.0, 12.4), (-66.0, 12.4))  # (z, y) on the east wall flanking the portal
SCONCE_BRACKET = (0.35, 0.05)  # depth, half-size
SCONCE_GLOW_BOX = ((0.22, 0.48), (0.05, 0.45), (-0.13, 0.13))  # (depth, height, width) mount offsets

# ---- SLICE 1: the wall order (new meshes against the frozen shell) -------------------------
# Wall-mounted order templates follow the sconce convention (wall = template plane z 0, prop
# projects -Z) and emit NO wall-plane back face (the vestibule shell faces are double-sided).
CORNICE = ((17.0, 17.45, 0.35), (17.45, 18.0, 0.60))  # two steps (y0, y1, projection): bed band, corona; corona top = the vault spring
CORNICE_DIV = 4  # lm segments per run (a 6.5 m cell -> 0.23 m/px)
CORNICE_RUNS = (  # (axis, wall plane, u0, u1, inward sign, trim); trimmed runs shorten by each step's projection to butt under the N/S runs
    ('z', Z_N, X_W, X_E, 1.0, False),
    ('z', Z_S, X_W, X_E, -1.0, False),
    ('x', X_W, Z_N, Z_S, 1.0, True),
    ('x', X_E, Z_N, Z_S, -1.0, True),
)
VEST_CAP = (2.78, 3.0, 0.14)  # cap moulding (y0, y1, projection) on the vestibule box's three free faces
VEST_CAP_RUNS = (  # (axis, plane, u0, u1, outward sign); the north run is extended by the projection to close both corners
    ('z', VEST_Z[0], VEST_X[0] - 0.14, VEST_X[1] + 0.14, -1.0),
    ('x', VEST_X[0], VEST_Z[0], VEST_Z[1], -1.0),
    ('x', VEST_X[1], VEST_Z[0], VEST_Z[1], 1.0),
)
VEST_DOOR_FRAME = (0.16, 0.08)  # architrave (band width, projection) round DOOR_X x (0, DOOR_H) on the z = VEST_Z[0] face; head top 2.76 clears the cap
PILASTER_Y0 = 0.6  # shaft foot = base top for every instance (one template; the four east shafts rise from the floor through the landing slab)
PILASTER_SHAFT = (0.45, 0.20, 15.7)  # half-width, projection, height -> world 0.6..16.3; projection < the sconce glow depth 0.22, so the three north sconces mount on the shaft face
PILASTER_SHAFT_DIV = 4  # lm segments up the shaft
PILASTER_CAPITAL = ((0.47, 0.22, 15.70, 15.82), (0.52, 0.26, 15.82, 16.15), (0.56, 0.28, 16.15, 16.40))  # gilt (KIT_ACCENT): necking, echinus, abacus — (half-width, proj, local y0, y1); abacus top = world 17.0, under the 0.35 bed band
PILASTER_BASE = ((0.54, 0.28, 0.0, 0.45), (0.50, 0.24, 0.45, 0.60))  # plaster, from the floor: plinth, torus band — (half-width, proj, y0, y1)
PIER_X = (67.075, 71.2, 75.1, 79.0, 82.9, 86.8, 90.925)  # north/south pier centres: the two end piers and the five 1.7 m piers between window bays
PILASTER_NORTH_X = PIER_X
PILASTER_SOUTH_X = (67.075, 71.2, 75.1, 86.8, 90.925)  # 79.0 and 82.9 fall inside the vestibule box
PILASTER_EAST_Z = (-85.2, -76.6, -71.4, -62.8)  # corner pair 0.8 m off the end walls; inner pair = responds behind COLUMN_XZ (0.07 m clear of plinth and abacus)
PILASTERS = tuple([(x, Z_N, math.pi) for x in PILASTER_NORTH_X] + [(x, Z_S, 0.0) for x in PILASTER_SOUTH_X] + [(X_E, z, math.pi / 2) for z in PILASTER_EAST_Z])  # 16 x (plan x, plan z, rot_y); pilaster_base uses the same roster at Y_FLOOR
WIN_X = tuple((X_W + X_E) / 2 + (i - (WIN_BAYS - 1) / 2) * WIN_PITCH for i in range(WIN_BAYS))  # == window_bays(): 69.25 .. 88.75
WINDOW_FRAME_OPEN = (WIN_W, WIN_TIERS[0][1] - WIN_TIERS[0][0])  # 2.2 x 3.5 (both tiers identical), centred on the template origin
WINDOW_ARCH = (0.18, 0.10)  # architrave band width, projection — jambs + head, no hood (the upper heads sit 0.5 m under the cornice)
WINDOW_SILL = (0.14, 0.18, 0.06)  # sill height, projection, overhang beyond the architrave; 0.16 m clear of the pilaster edge
WINDOW_FRAMES = tuple((cx, (sill + head) / 2) for cx in WIN_X for sill, head in WIN_TIERS)  # 12 x (x, y) on the north wall, rot_y pi


# ---- vector helpers (glTF space) -----------------------------------------------------------
def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def v_scale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def v_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def lerp(a, b, t):
    return v_add(v_scale(a, 1.0 - t), v_scale(b, t))


def bilerp(p00, p10, p11, p01, s, t):
    return lerp(lerp(p00, p10, s), lerp(p01, p11, s), t)


def newell(pts):
    nx = ny = nz = 0.0
    for i, (x0, y0, z0) in enumerate(pts):
        x1, y1, z1 = pts[(i + 1) % len(pts)]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    return (nx, ny, nz)


def unit(n):
    m = math.sqrt(v_dot(n, n)) or 1.0
    return v_scale(n, 1.0 / m)


def to_b(p):
    return (p[0], -p[2], p[1])


def r6(vals):
    return tuple(round(v, 6) for v in vals)


def edges(vals):
    return sorted(set(round(v, 6) for v in vals))


def box_uv(p, n):
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ax >= ay and ax >= az:
        return (p[2], p[1])
    if ay >= az:
        return (p[0], p[2])
    return (p[0], p[1])


class MeshBuilder:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []  # (vertex index tuple, material slot)

    def add(self, pts, mat, ref):
        """Planar face; winding flipped so the normal faces `ref` (the viewing side)."""
        if v_dot(newell(pts), v_sub(ref, pts[0])) < 0:
            pts = pts[::-1]
        base = len(self.verts)
        self.verts.extend(pts)
        self.faces.append((tuple(range(base, base + len(pts))), mat))

    def triangles(self):
        return sum(len(f) - 2 for f, _ in self.faces)


# ---- procedural textures (periodic trig sums, no noise) ------------------------------------
def _grid(n):
    t = (np.arange(n, dtype=np.float64) + 0.5) / n
    v, u = np.meshgrid(t, t, indexing='ij')
    return u, v


def _wave(u, v, a, b, phase=0.0):
    return np.sin(2.0 * math.pi * (a * u + b * v) + phase)


def tex_marble_floor(n):
    """Carrara: cool near-white body, thin neutral-grey veins (sharper exponents than the
    committed brown-warm veins), a faint cloud so the slab is not flat."""
    u, v = _grid(n)
    w1 = np.sin(2 * math.pi * (3 * u + 2 * v) + 1.5 * _wave(u, v, 2, -3) + 0.8 * _wave(u, v, 5, 1))
    w2 = np.sin(2 * math.pi * (u - 4 * v) + 1.1 * _wave(u, v, 3, 1) + 0.5 * _wave(u, v, -2, 6))
    w3 = np.sin(2 * math.pi * (5 * u + 3 * v) + 0.9 * _wave(u, v, -3, 4, 0.5))
    vein = np.exp(-9.0 * np.abs(w1))
    vein2 = np.exp(-14.0 * np.abs(w2))
    vein3 = np.exp(-18.0 * np.abs(w3))
    cloud = 0.02 * _wave(u, v, 1, 1) + 0.01 * _wave(u, v, 4, -3, 0.7)
    base = 0.86 + cloud
    grey = 0.20 * vein + 0.12 * vein2 + 0.07 * vein3
    return base - grey, base - grey, base + 0.01 - 0.9 * grey


def tex_plaster_warm(n):
    """White stucco with a faint warm cast and low-amplitude mottle (name locked)."""
    u, v = _grid(n)
    m = 0.02 * _wave(u, v, 7, 3) + 0.015 * _wave(u, v, 2, 11, 1.0)
    m = m + 0.012 * _wave(u, v, 13, 5) * _wave(u, v, 3, -9)
    return 0.84 + m, 0.83 + 0.95 * m, 0.80 + 0.85 * m


def tex_granite_grey(n):
    """Grey-pink Serdobol granite: pinkish-grey body, pink feldspar field, quartz sparkle,
    dark mica specks (name locked)."""
    u, v = _grid(n)
    s = _wave(u, v, 37, 23) * _wave(u, v, 29, -41) * _wave(u, v, 17, 53)
    p = _wave(u, v, 43, -19, 0.6) * _wave(u, v, 23, 31, 1.3)
    spark = np.clip((s - 0.55) * 4.0, 0.0, 1.0)
    dark = np.clip((-s - 0.6) * 4.0, 0.0, 1.0)
    pink = np.clip((p - 0.45) * 3.0, 0.0, 1.0)
    grey = 0.46 + 0.04 * _wave(u, v, 3, 5) + 0.03 * s
    f = 0.22 * spark - 0.24 * dark
    return grey + 0.04 + f + 0.14 * pink, grey - 0.01 + f + 0.04 * pink, grey - 0.02 + f + 0.03 * pink


def tex_gilt(n):
    """Gold leaf: broad sheen plus a fine leaf-lap field; lifted green channel so the
    half-metallic F0 (GILT_METALLIC) reads gold, not copper."""
    u, v = _grid(n)
    sheen = 0.5 + 0.5 * _wave(u, v, 2, 3) * _wave(u, v, -1, 5)
    leaf = 0.5 + 0.5 * _wave(u, v, 11, -7, 0.4) * _wave(u, v, 5, 13)
    return (0.80 + 0.12 * sheen + 0.04 * leaf, 0.64 + 0.10 * sheen + 0.03 * leaf,
            0.30 + 0.08 * sheen + 0.02 * leaf)


TEX_FN = {
    'marble_floor': tex_marble_floor,
    'plaster_warm': tex_plaster_warm,
    'granite_grey': tex_granite_grey,
    'gilt': tex_gilt,
}


def write_texture(name, size, tex_dir):
    r, g, b = TEX_FN[name](size)
    rgba = np.stack([r, g, b, np.ones_like(r)], axis=-1).clip(0.0, 1.0).astype(np.float32)
    path = tex_dir / f'{name}.png'
    tmp = bpy.data.images.new(name, size, size, alpha=False)
    tmp.colorspace_settings.name = 'sRGB'
    tmp.pixels.foreach_set(rgba.ravel())
    tmp.filepath_raw = str(path)
    tmp.file_format = 'PNG'
    tmp.save()
    bpy.data.images.remove(tmp)
    img = bpy.data.images.load(str(path))
    img.name = name  # exporter keeps this as the glTF image name (mapped by name in jordan.mjs)
    img.colorspace_settings.name = 'sRGB'
    return img


def make_material(name, image, roughness, emission=None, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Linear'
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission is not None:
        rgb, strength = emission
        bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat

# ---- geometry ------------------------------------------------------------------------------
def window_bays():
    cx0 = (X_W + X_E) / 2 - (WIN_BAYS - 1) / 2 * WIN_PITCH
    return [cx0 + i * WIN_PITCH for i in range(WIN_BAYS)]


def plane_point(axis, u, v, c):
    return (u, v, c) if axis == 'z' else (c, v, u)


def wall_grid(b, axis, const, u_edges, v_edges, holes, mat, ref):
    for i in range(len(u_edges) - 1):
        for j in range(len(v_edges) - 1):
            u0, u1, v0, v1 = u_edges[i], u_edges[i + 1], v_edges[j], v_edges[j + 1]
            if any(h[0] <= u0 and u1 <= h[1] and h[2] <= v0 and v1 <= h[3] for h in holes):
                continue
            P = plane_point
            b.add([P(axis, u0, v0, const), P(axis, u1, v0, const), P(axis, u1, v1, const),
                   P(axis, u0, v1, const)], mat, ref)


def add_reveals(b, axis, c0, c1, u0, u1, v0, v1, mat):
    def P(u, v, c):  # noqa: E731
        return plane_point(axis, u, v, c)

    ref = P((u0 + u1) / 2, (v0 + v1) / 2, (c0 + c1) / 2)
    b.add([P(u0, v0, c0), P(u0, v1, c0), P(u0, v1, c1), P(u0, v0, c1)], mat, ref)
    b.add([P(u1, v0, c0), P(u1, v1, c0), P(u1, v1, c1), P(u1, v0, c1)], mat, ref)
    b.add([P(u0, v0, c0), P(u1, v0, c0), P(u1, v0, c1), P(u0, v0, c1)], mat, ref)
    b.add([P(u0, v1, c0), P(u1, v1, c0), P(u1, v1, c1), P(u0, v1, c1)], mat, ref)


def build_floor(b):
    nx, nz = FLOOR_DIV
    xs = [X_W + (X_E - X_W) * i / nx for i in range(nx + 1)]
    zs = [Z_N + (Z_S - Z_N) * j / nz for j in range(nz + 1)]
    for i in range(nx):
        for j in range(nz):
            b.add([(xs[i], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j + 1]),
                   (xs[i], 0.0, zs[j + 1])], MAT_MARBLE, HALL_REF)


def build_north_wall(shell, pane):
    holes = [r6((cx - WIN_W / 2, cx + WIN_W / 2, sill, head))
             for cx in window_bays() for sill, head in WIN_TIERS]
    u_edges = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    v_edges = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(shell, 'z', Z_N, u_edges, v_edges, holes, MAT_PLASTER, HALL_REF)
    zb = Z_N - WIN_RECESS
    for u0, u1, v0, v1 in holes:
        add_reveals(shell, 'z', Z_N, zb, u0, u1, v0, v1, MAT_PLASTER)
        pane.add([(u0, v0, zb), (u1, v0, zb), (u1, v1, zb), (u0, v1, zb)], 0, HALL_REF)


def add_porthole(b, cx, cy):
    z0, z1 = Z_S, Z_S + PORT_DEPTH
    ring, sq = [], []
    for k in range(PORT_SEG):
        a = 2.0 * math.pi * k / PORT_SEG
        c, s = math.cos(a), math.sin(a)
        ring.append((cx + PORT_R * c, cy + PORT_R * s))
        m = PORT_SQ / max(abs(c), abs(s))
        sq.append((cx + m * c, cy + m * s))
    centre = (cx, cy, (z0 + z1) / 2)
    for k in range(PORT_SEG):
        j = (k + 1) % PORT_SEG
        b.add([(*sq[k], z0), (*sq[j], z0), (*ring[j], z0), (*ring[k], z0)], MAT_PLASTER, HALL_REF)
        b.add([(*ring[k], z0), (*ring[j], z0), (*ring[j], z1), (*ring[k], z1)], MAT_PLASTER, centre)
        b.add([(cx, cy, z1), (*ring[k], z1), (*ring[j], z1)], MAT_PLASTER, HALL_REF)


def build_south_wall(b):
    ports = [(cx, cy) for cx in window_bays() for cy in PORT_Y]
    holes = [r6((cx - PORT_SQ, cx + PORT_SQ, cy - PORT_SQ, cy + PORT_SQ)) for cx, cy in ports]
    door = r6((DOOR_X[0], DOOR_X[1], Y_FLOOR, DOOR_H))
    holes.append(door)
    u_edges = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    v_edges = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(b, 'z', Z_S, u_edges, v_edges, holes, MAT_PLASTER, HALL_REF)
    zb = Z_S + DOOR_RECESS
    add_reveals(b, 'z', Z_S, zb, *door, MAT_PLASTER)
    b.add([(door[0], door[2], zb), (door[1], door[2], zb), (door[1], door[3], zb),
           (door[0], door[3], zb)], MAT_PLASTER, HALL_REF)
    for cx, cy in ports:
        add_porthole(b, cx, cy)


def vault_profile():
    half = (Z_S - Z_N) / 2
    rise = Y_CROWN - VAULT_SPRING_Y
    radius = (half * half + rise * rise) / (2 * rise)
    zc, yc = (Z_N + Z_S) / 2, Y_CROWN - radius
    th = math.asin(half / radius)
    pts = []
    for k in range(VAULT_NZ + 1):
        a = -th + 2 * th * k / VAULT_NZ
        pts.append((yc + radius * math.cos(a), zc + radius * math.sin(a)))  # (y, z)
    pts[0], pts[-1] = (VAULT_SPRING_Y, Z_N), (VAULT_SPRING_Y, Z_S)  # exact seams with the walls
    return pts


def build_end_walls(b):
    prof = vault_profile()
    zc = (Z_N + Z_S) / 2
    nu, nv = END_WALL_DIV
    u_edges = edges([Z_N + (Z_S - Z_N) * i / nu for i in range(nu + 1)])
    v_edges = edges([Y_FLOOR + (VAULT_SPRING_Y - Y_FLOOR) * j / nv for j in range(nv + 1)])
    for x in (X_W, X_E):
        wall_grid(b, 'x', x, u_edges, v_edges, [], MAT_PLASTER, HALL_REF)
        for k in range(VAULT_NZ):
            b.add([(x, VAULT_SPRING_Y, zc), (x, prof[k][0], prof[k][1]),
                   (x, prof[k + 1][0], prof[k + 1][1])], MAT_PLASTER, HALL_REF)


def build_vault(b):
    prof = vault_profile()
    xs = [X_W + (X_E - X_W) * i / VAULT_NX for i in range(VAULT_NX + 1)]
    t = COFFER_INSET
    for i in range(VAULT_NX):
        for k in range(VAULT_NZ):
            (ya, za), (yb, zb) = prof[k], prof[k + 1]
            p00, p10 = (xs[i], ya, za), (xs[i + 1], ya, za)
            p11, p01 = (xs[i + 1], yb, zb), (xs[i], yb, zb)
            n = unit(newell([p00, p10, p11, p01]))
            if v_dot(n, v_sub(HALL_REF, p00)) > 0:
                n = v_scale(n, -1.0)  # outward (away from the hall)
            q00 = bilerp(p00, p10, p11, p01, t, t)
            q10 = bilerp(p00, p10, p11, p01, 1 - t, t)
            q11 = bilerp(p00, p10, p11, p01, 1 - t, 1 - t)
            q01 = bilerp(p00, p10, p11, p01, t, 1 - t)
            r00, r10, r11, r01 = (v_add(q, v_scale(n, COFFER_DEPTH)) for q in (q00, q10, q11, q01))
            rc = v_add(bilerp(p00, p10, p11, p01, 0.5, 0.5), v_scale(n, COFFER_DEPTH / 2))
            for quad in ([p00, p10, q10, q00], [p10, p11, q11, q10], [p11, p01, q01, q11],
                         [p01, p00, q00, q01]):
                b.add(quad, MAT_PLASTER, HALL_REF)
            for quad in ([q00, q10, r10, r00], [q10, q11, r11, r10], [q11, q01, r01, r11],
                         [q01, q00, r00, r01]):
                b.add(quad, MAT_PLASTER, rc)
            b.add([r00, r10, r11, r01], MAT_PLASTER, HALL_REF)


def build_vestibule(b):
    (x0, x1), (z0, z1), h = VEST_X, VEST_Z, VEST_H
    xm, zm = (x0 + x1) / 2, (z0 + z1) / 2
    for x in (x0, x1):
        quad = [(x, 0.0, z0), (x, 0.0, z1), (x, h, z1), (x, h, z0)]
        b.add(quad, MAT_PLASTER, (x - 1.0, 1.5, zm))
        b.add(quad, MAT_PLASTER, (x + 1.0, 1.5, zm))
    opening = [r6((DOOR_X[0], DOOR_X[1], Y_FLOOR, DOOR_H))]
    u_edges = edges([x0, x1, DOOR_X[0], DOOR_X[1]])
    v_edges = edges([Y_FLOOR, DOOR_H, h])
    wall_grid(b, 'z', z0, u_edges, v_edges, opening, MAT_PLASTER, (xm, 1.5, z0 - 1.0))
    wall_grid(b, 'z', z0, u_edges, v_edges, opening, MAT_PLASTER, (xm, 1.5, z0 + 1.0))
    soffit = [(x0, h, z0), (x1, h, z0), (x1, h, z1), (x0, h, z1)]
    b.add(soffit, MAT_PLASTER, (xm, 1.5, zm))
    b.add(soffit, MAT_PLASTER, (xm, h + 1.0, zm))


# ---- PART 2: builders and placement (frozen envelope above) --------------------------------
def kit_centre(pts):
    return tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))


def kit_solid(b, faces, mat=KIT_BASE):
    centre = kit_centre([p for face in faces for p in face])
    for face in faces:
        ref = v_sub(v_scale(kit_centre(face), 2), centre)
        b.add(face, mat, ref)


def kit_loft(b, a, c, mat=KIT_BASE):
    faces = [a, c]
    for i in range(len(a)):
        j = (i + 1) % len(a)
        faces.append([a[i], a[j], c[j], c[i]])
    kit_solid(b, faces, mat)


def kit_box(b, x, y, z, mat=KIT_BASE):
    rings = [[(x[0], h, z[0]), (x[1], h, z[0]), (x[1], h, z[1]), (x[0], h, z[1])] for h in y]
    kit_loft(b, *rings, mat)


def kit_circle(cx, cz, radius, y, segments):
    return [(cx + radius * math.cos(2 * math.pi * k / segments), y,
             cz + radius * math.sin(2 * math.pi * k / segments)) for k in range(segments)]


def kit_lathe(b, rings, segments, cx=0.0, cz=0.0, mat=KIT_BASE):
    circles = [kit_circle(cx, cz, r, y, segments) for r, y in rings]
    for a, c in zip(circles, circles[1:]):
        centre = (cx, (a[0][1] + c[0][1]) / 2, cz)
        for i in range(segments):
            j = (i + 1) % segments
            face = [a[i], a[j], c[j], c[i]]
            b.add(face, mat, v_sub(v_scale(kit_centre(face), 2), centre))
    height = rings[-1][1] - rings[0][1]
    b.add(circles[0], mat, (cx, rings[0][1] - height, cz))
    b.add(circles[-1], mat, (cx, rings[-1][1] + height, cz))


def kit_beam(b, a, c, width, height, mat=KIT_BASE):
    side = v_scale(unit((a[2] - c[2], 0.0, c[0] - a[0])), width / 2)
    rings = [[(p[0] + s * side[0], p[1] + h * height / 2, p[2] + s * side[2])
              for s, h in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for p in (a, c)]
    kit_loft(b, *rings, mat)


def kit_octahedron(b, centre, half, mat):
    x, y, z = half
    ring = [v_add(centre, p) for p in ((x, 0, 0), (0, 0, z), (-x, 0, 0), (0, 0, -z))]
    faces = [[v_add(centre, (0, h, 0)), ring[i], ring[(i + 1) % len(ring)]]
             for h in (-y, y) for i in range(len(ring))]
    kit_solid(b, faces, mat)


def rail_flight(a, c):
    return next(f for f in FLIGHTS if f['y'] == (a[1], c[1]))


def flight_datum(f, coordinate):
    distance = (coordinate - f['a0']) * f['d']
    if distance >= RUN:
        return f['y'][1]
    return f['y'][0] + max(0.0, distance) * RISE / GOING


def stringer_band(f):
    axis = 2 if f['axis'] == 'x' else 0
    centres = [a[axis] for run in RAIL_RUNS for a, c in zip(run, run[1:]) if (a[1], c[1]) == f['y']]
    radius = max(r for r, _ in BALUSTER_RINGS)
    return (min([f['band'][0]] + [c - radius for c in centres]),
            max([f['band'][1]] + [c + radius for c in centres]))


def build_stairs(b):
    # MAT_MARBLE is shell slot 1; this single-material mesh uses local slot KIT_BASE.
    for f in FLIGHTS:
        for i in range(TREADS):
            a = f['a0'] + f['d'] * i * GOING
            span = sorted((a, a + f['d'] * GOING))
            y = (f['y'][0] + i * RISE, f['y'][0] + (i + 1) * RISE)
            x, z = (span, f['band']) if f['axis'] == 'x' else (f['band'], span)
            kit_box(b, x, y, z)
        band = stringer_band(f)
        rings = []
        for a, y in ((f['a0'], f['y'][0]), (f['a0'] + f['d'] * RUN, f['y'][1] - RISE)):
            rings.append([plane_point(f['axis'], u, h, a) for u, h in
                          ((band[0], y), (band[1], y), (band[1], y - STRINGER_T),
                           (band[0], y - STRINGER_T))])
        kit_loft(b, *rings)
    for x, y, z in ((MEZZ_X, MEZZ_Y, MEZZ_Z), (LAND_X, LANDING_Y, LAND_Z)):
        kit_box(b, x, (y - SLAB_T, y), z)


def rail_path(run):
    path = [run[0]]
    for a, c in zip(run, run[1:]):
        if a[1] == c[1]:
            path.append(c)
            continue
        f = rail_flight(a, c)
        axis = 0 if f['axis'] == 'x' else 2
        start, end = list(a), list(c)
        start[axis], start[1] = f['a0'], f['y'][0]
        end[axis], end[1] = f['a0'] + f['d'] * RUN, f['y'][1] - RISE
        upper = (end[0], f['y'][1], end[2])
        for p in (tuple(start), tuple(end), upper, c):
            if p != path[-1]:
                path.append(p)
    return path


def rail_side(path, i):
    p = path[i]

    def heading(a, c):
        return unit((c[0] - a[0], 0.0, c[2] - a[2]))

    before = next((heading(q, p) for q in reversed(path[:i]) if (q[0], q[2]) != (p[0], p[2])), None)
    after = next((heading(p, q) for q in path[i + 1:] if (q[0], q[2]) != (p[0], p[2])), None)
    before, after = before or after, after or before
    denominator = 1 + v_dot(before, after)
    if denominator <= 0:
        raise ValueError('rail cannot miter a reversing segment')
    direction = v_add(before, after)
    return v_scale((-direction[2], 0.0, direction[0]), RAIL_PROFILE[0] / (2 * denominator))


def build_rail(b):
    height = RAIL_PROFILE[1]
    for run in RAIL_RUNS:
        path = rail_path(run)
        sides = [rail_side(path, i) for i in range(len(path))]
        rings = [[(p[0] + s * side[0], p[1] + y, p[2] + s * side[2])
                  for s, y in ((-1, RAIL_TOP - height), (1, RAIL_TOP - height),
                               (1, RAIL_TOP), (-1, RAIL_TOP))]
                 for p, side in zip(path, sides)]
        for i, (a, c) in enumerate(zip(path, path[1:])):
            if (a[0], a[2]) != (c[0], c[2]):
                kit_loft(b, rings[i], rings[i + 1])
                continue
            # A vertical sweep of a vertical section degenerates; use a solid return instead.
            side = sides[i]
            along = v_scale(unit((side[2], 0.0, -side[0])), height / 2)
            corners = [v_add(a, v_add(v_scale(side, s), v_scale(along, t)))
                       for s, t in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            lower = [(p[0], a[1] + RAIL_TOP - height, p[2]) for p in corners]
            upper = [(p[0], c[1] + RAIL_TOP, p[2]) for p in corners]
            kit_loft(b, lower, upper)


def build_baluster(b):
    kit_lathe(b, BALUSTER_RINGS, BALUSTER_SEG)


def kit_open_box(b, x, y, z, mat=KIT_BASE, hide=()):
    """Axis-aligned box in glTF space emitting only the faces not named in `hide` ('west' -X,
    'east' +X, 'bottom', 'top', 'north' -Z, 'south' +Z). Used wherever a kit_box face would be
    buried against the shell, a slab or another kit solid, so the order grammar emits no
    coincident pairs and spends no lm cells on faces that are never seen."""
    x0, x1 = x
    y0, y1 = y
    z0, z1 = z
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    faces = (
        ('west', [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (x0 - 1.0, cy, cz)),
        ('east', [(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], (x1 + 1.0, cy, cz)),
        ('bottom', [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (cx, y0 - 1.0, cz)),
        ('top', [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (cx, y1 + 1.0, cz)),
        ('north', [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (cx, cy, z0 - 1.0)),
        ('south', [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (cx, cy, z1 + 1.0)),
    )
    for name, pts, ref in faces:
        if name not in hide:
            b.add(pts, mat, ref)


def kit_lathe_sides(b, rings, segments, cx=0.0, cz=0.0, mat=KIT_BASE):
    """kit_lathe without its two end caps, for a lathe whose ends are both buried (the column
    shaft sits on the plinth and under the echinus; the echinus sits on the shaft and under
    the abacus). Same ring/segment face order as kit_lathe."""
    circles = [kit_circle(cx, cz, r, y, segments) for r, y in rings]
    for a, c in zip(circles, circles[1:]):
        centre = (cx, (a[0][1] + c[0][1]) / 2, cz)
        for i in range(segments):
            j = (i + 1) % segments
            face = [a[i], a[j], c[j], c[i]]
            b.add(face, mat, v_sub(v_scale(kit_centre(face), 2), centre))


def build_column(b):
    """Template origin = plinth foot at LANDING_Y. Granite (KIT_BASE): plinth box (no bottom,
    it stands on the slab) and one lathe — torus base + entasis shaft — with no caps (foot on
    the plinth top, head under the echinus). Gilt (KIT_ACCENT): echinus lathe, no caps (on the
    shaft, under the abacus), and the abacus box with no top: its top is world 17.0, the
    cornice bottom, and faces up where no eye in the room can see it. Requires, as the adopted
    constants hold: plinth half >= torus radius, echinus foot radius >= shaft top radius 0.42,
    abacus half >= echinus top radius."""
    half, height = COLUMN_PLINTH
    kit_open_box(b, (-half, half), (0.0, height), (-half, half), KIT_BASE, hide=('bottom',))
    kit_lathe_sides(b, COLUMN_SHAFT_RINGS, COLUMN_SEG)
    kit_lathe_sides(b, COLUMN_CAPITAL_RINGS, COLUMN_SEG, mat=KIT_ACCENT)
    half, y0, y1 = COLUMN_ABACUS
    kit_open_box(b, (-half, half), (y0, y1), (-half, half), KIT_ACCENT, hide=('top',))


def build_portal(b):
    """World-space aedicule on the east wall, the shell uncut, no wall-plane (east) faces.
    White stucco (KIT_BASE): two jambs (no top/bottom - under the head band, on the slab),
    head band and entablature (no top - they face up at 16.4 / 17.0), the two closed leaves
    (front faces only: every other leaf face is sealed by jambs, head band, slab and the
    meeting line, so the slab behind the leaves is never seen), the niche aedicules exactly
    as committed. Gilt (KIT_ACCENT): stile and rail mouldings proud of the leaf fronts, the
    niche vases. Stiles are the moulding width centred on PORTAL_Z + dz and clamped to the
    opening; rails run between neighbouring stiles at the DOOR_RAILS_Y WORLD heights (the
    orchestrator's integration correction: the constants store world y, not sill offsets),
    their ends buried in the stiles. The leaf fronts are split at the rail centres so each
    panel band owns an lm cell under the mouldings."""
    sill, head = LANDING_Y, LANDING_Y + PORTAL_H
    frame_x = (X_E - PORTAL_DEPTH, X_E)
    outer = PORTAL_HALF_W + PORTAL_JAMB
    for sign in (-1, 1):
        z = sorted((PORTAL_Z + sign * PORTAL_HALF_W, PORTAL_Z + sign * outer))
        kit_open_box(b, frame_x, (sill, head), z, KIT_BASE, hide=('east', 'top', 'bottom'))
    kit_open_box(b, frame_x, (head, head + PORTAL_HEAD), (PORTAL_Z - outer, PORTAL_Z + outer),
                 KIT_BASE, hide=('east', 'top'))
    y0, y1, half, proud = PORTAL_ENTAB
    kit_open_box(b, (X_E - proud, X_E), (y0, y1), (PORTAL_Z - half, PORTAL_Z + half), KIT_BASE,
                 hide=('east', 'top'))
    back, front = DOOR_LEAF
    width, proud = DOOR_MOULD
    if not (0.0 <= front < back and front + proud <= PORTAL_DEPTH):
        raise RuntimeError('portal doors must sit inside the reveal: DOOR_LEAF/DOOR_MOULD vs PORTAL_DEPTH')
    xf = X_E - front
    levels = (sill,) + DOOR_RAILS_Y + (head,)
    for sign in (-1, 1):
        z0, z1 = sorted((PORTAL_Z, PORTAL_Z + sign * PORTAL_HALF_W))
        for ya, yb in zip(levels, levels[1:]):
            b.add([(xf, ya, z0), (xf, ya, z1), (xf, yb, z1), (xf, yb, z0)], KIT_BASE,
                  (xf - 1.0, (ya + yb) / 2, (z0 + z1) / 2))
    stile_y = (sill + DOOR_MARGIN, head - DOOR_MARGIN)
    stiles = []
    for dz in DOOR_STILES_DZ:
        c = PORTAL_Z + dz
        stiles.append((max(PORTAL_Z - PORTAL_HALF_W, c - width / 2),
                       min(PORTAL_Z + PORTAL_HALF_W, c + width / 2)))
    stiles.sort()
    for z in stiles:
        kit_open_box(b, (xf - proud, xf), stile_y, z, KIT_ACCENT, hide=('east',))
    for a, c in zip(stiles, stiles[1:]):
        for y in DOOR_RAILS_Y:
            yc = y
            kit_open_box(b, (xf - proud, xf), (yc - width / 2, yc + width / 2), (a[1], c[0]),
                         KIT_ACCENT, hide=('east', 'north', 'south'))
    face, back = X_E - NICHE_DEPTH, X_E - NICHE_DEPTH + NICHE_CAVITY
    for cz in (PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ):
        outer_w, y0, y1 = NICHE_OUTER
        inner_w, sill, head = NICHE_OPEN
        outer = [(face, y0, cz - outer_w), (face, y0, cz + outer_w),
                 (face, y1, cz + outer_w), (face, y1, cz - outer_w)]
        inner = [(face, sill, cz - inner_w), (face, sill, cz + inner_w),
                 (face, head, cz + inner_w), (face, head, cz - inner_w)]
        centre = ((face + X_E) / 2, (y0 + y1) / 2, cz)
        for i in range(len(outer)):
            j = (i + 1) % len(outer)
            b.add([outer[i], outer[j], inner[j], inner[i]], KIT_BASE, HALL_REF)
            quad = [outer[i], outer[j], (X_E, outer[j][1], outer[j][2]),
                    (X_E, outer[i][1], outer[i][2])]
            b.add(quad, KIT_BASE, v_sub(v_scale(kit_centre(quad), 2), centre))
        add_reveals(b, 'x', face, back, cz - inner_w, cz + inner_w, sill, head, KIT_BASE)
        b.add([(back, p[1], p[2]) for p in inner], KIT_BASE, HALL_REF)
        cx, (half, height) = (face + back) / 2, PEDESTAL
        kit_box(b, (cx - half, cx + half), (sill, sill + height), (cz - half, cz + half))
        kit_lathe(b, [(r, sill + height + y) for r, y in VASE_RINGS], VASE_SEG, cx, cz,
                  mat=KIT_ACCENT)


def build_chandelier(b):
    cx, cz = CHAND_C
    low, high = CHAND_RING_Y - CHAND_BAND / 2, CHAND_RING_Y + CHAND_BAND / 2
    il, ih = [kit_circle(cx, cz, CHAND_R[0], y, CHAND_SEG) for y in (low, high)]
    ol, oh = [kit_circle(cx, cz, CHAND_R[1], y, CHAND_SEG) for y in (low, high)]
    centre = (cx, CHAND_RING_Y, cz)
    for i in range(CHAND_SEG):
        j = (i + 1) % CHAND_SEG
        outer = [ol[i], ol[j], oh[j], oh[i]]
        b.add(outer, KIT_BASE, v_sub(v_scale(kit_centre(outer), 2), centre))
        b.add([il[i], il[j], ih[j], ih[i]], KIT_BASE, centre)
        b.add([oh[i], oh[j], ih[j], ih[i]], KIT_BASE, (cx, high + CHAND_BAND, cz))
        b.add([ol[i], ol[j], il[j], il[i]], KIT_BASE, (cx, low - CHAND_BAND, cz))
    half = CHAND_ROD / 2
    kit_box(b, (cx - half, cx + half), (low, CHAND_ROD_TOP), (cz - half, cz + half))
    count = min(CHAND_SEG, 8)
    for x, _, z in kit_circle(cx, cz, CHAND_DROP_R, CHAND_DROP_Y, count):
        kit_beam(b, centre, (x, CHAND_RING_Y, z), CHAND_ROD, CHAND_ROD)
        kit_box(b, (x - half, x + half), (CHAND_DROP_Y + CHAND_DROP[1], low), (z - half, z + half))
        kit_octahedron(b, (x, CHAND_DROP_Y, z), CHAND_DROP, KIT_GLOW)
    kit_octahedron(b, (cx, CHAND_CORE_Y, cz), CHAND_CORE, KIT_GLOW)


def build_sconce(b):
    depth, half = SCONCE_BRACKET
    kit_box(b, (-half, half), (-half, half), (-depth, 0.0), KIT_BASE)
    depth, height, width = SCONCE_GLOW_BOX
    kit_box(b, width, height, (-depth[1], -depth[0]), KIT_GLOW)


# ---- SLICE 1: wall-mounted order grammar ---------------------------------------------------
def wall_point(axis, plane, u, y, d):
    """Point on an axis-aligned wall run: axis 'z' = a z-plane run along x, 'x' = an x-plane
    run along z; `d` is the signed offset off the plane (the run's inward/outward sign already
    applied). Own helper (not plane_point) so the order grammar does not lean on the flights'
    signature."""
    if axis == 'z':
        return (u, y, plane + d)
    return (plane + d, y, u)


def kit_wall_box(b, x, y, depth, mat=KIT_BASE, hide=(), wall_z=0.0):
    """Box against a wall plane (z = wall_z, projecting -Z) with NO wall-plane back face;
    `hide` names further faces that are always buried ('top', 'bottom', 'left', 'right')."""
    x0, x1 = x
    y0, y1 = y
    z0, z1 = wall_z - depth, wall_z
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    faces = (
        ('front', [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (cx, cy, z0 - 1.0)),
        ('left', [(x0, y0, z1), (x0, y0, z0), (x0, y1, z0), (x0, y1, z1)], (x0 - 1.0, cy, cz)),
        ('right', [(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (x1 + 1.0, cy, cz)),
        ('bottom', [(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)], (cx, y0 - 1.0, cz)),
        ('top', [(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (cx, y1 + 1.0, cz)),
    )
    for name, pts, ref in faces:
        if name not in hide:
            b.add(pts, mat, ref)


def kit_mould(b, axis, plane, u0, u1, sign, profile, divisions, trim=False, caps=False,
              mat=KIT_BASE):
    """Sweep an open (projection, y) profile along a wall run, one face per profile segment
    per division; the wall plane is never emitted. The profile starts on the wall at the
    bottom and runs outward/upward with the solid on its left, so each segment's outward
    normal is its right-hand perpendicular (robust for the stepped, concave cornice section).
    A trimmed run shortens every face by its own step's projection so it butts under the
    untrimmed run at the corner. `caps` closes both ends with the profile polygon
    (untrimmed runs only)."""
    for p, q in zip(profile, profile[1:]):
        t = max(p[0], q[0]) if trim else 0.0
        a0, a1 = u0 + t, u1 - t
        nd, ny = q[1] - p[1], p[0] - q[0]  # outward perpendicular of the segment heading
        for i in range(divisions):
            s0 = a0 + (a1 - a0) * i / divisions
            s1 = a0 + (a1 - a0) * (i + 1) / divisions
            face = [wall_point(axis, plane, s0, p[1], sign * p[0]),
                    wall_point(axis, plane, s1, p[1], sign * p[0]),
                    wall_point(axis, plane, s1, q[1], sign * q[0]),
                    wall_point(axis, plane, s0, q[1], sign * q[0])]
            md, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            b.add(face, mat, wall_point(axis, plane, (s0 + s1) / 2, my + ny, sign * (md + nd)))
        if caps:
            dc = sum(d for d, _ in profile) / len(profile)
            yc = sum(y for _, y in profile) / len(profile)
            for u, out in ((u0, -1.0), (u1, 1.0)):
                ring = [wall_point(axis, plane, u, y, sign * d) for d, y in profile]
                b.add(ring, mat, wall_point(axis, plane, u + out, yc, sign * dc))


def build_cornice(b):
    """One world-space mesh: the two-step ring (bed band + corona, no corona top — it faces up
    at the vault spring and is never seen), the vestibule cap on its three free faces and the
    door architrave. Butt corners, no end caps: the N/S runs' step fronts visually close the
    trimmed E/W legs; the cap's north run alone shows its two outer ends."""
    (y0, y1, d1), (_, y2, d2) = CORNICE
    profile = ((0.0, y0), (d1, y0), (d1, y1), (d2, y1), (d2, y2))
    for axis, plane, u0, u1, sign, trim in CORNICE_RUNS:
        kit_mould(b, axis, plane, u0, u1, sign, profile, CORNICE_DIV, trim=trim)
    y0, y1, d = VEST_CAP
    cap = ((0.0, y0), (d, y0), (d, y1), (0.0, y1))
    for axis, plane, u0, u1, sign in VEST_CAP_RUNS:
        kit_mould(b, axis, plane, u0, u1, sign, cap, 2, caps=(axis == 'z'))
    band, proj = VEST_DOOR_FRAME
    for x in ((DOOR_X[0] - band, DOOR_X[0]), (DOOR_X[1], DOOR_X[1] + band)):
        kit_wall_box(b, x, (Y_FLOOR, DOOR_H), proj, hide=('top', 'bottom'), wall_z=VEST_Z[0])
    kit_wall_box(b, (DOOR_X[0] - band, DOOR_X[1] + band), (DOOR_H, DOOR_H + band), proj,
                 wall_z=VEST_Z[0])


def build_pilaster(b):
    """Template origin = shaft foot on the wall plane, projecting -Z; the wiring mounts it at
    PILASTER_Y0 so the abacus top lands at world 17.0. Shaft foot/top and the lower capital
    tops are buried (base torus 0.50/0.24 > shaft 0.45/0.20; each band overhangs the one
    below). The abacus top is hidden too: it would be coplanar with the cornice soffit, so
    omitting it removes the only coincident pair at y 17 without losing a visible face."""
    half, proj, height = PILASTER_SHAFT
    step = height / PILASTER_SHAFT_DIV
    for i in range(PILASTER_SHAFT_DIV):
        kit_wall_box(b, (-half, half), (i * step, (i + 1) * step), proj, KIT_BASE,
                     hide=('top', 'bottom'))
    for half, proj, y0, y1 in PILASTER_CAPITAL:
        kit_wall_box(b, (-half, half), (y0, y1), proj, KIT_ACCENT, hide=('top',))


def build_pilaster_base(b):
    """Plaster plinth and torus band from the floor (local y 0) to the shaft foot at 0.6;
    bottoms sit on the floor and are never emitted. Mounted at Y_FLOOR for all sixteen
    roster entries."""
    for half, proj, y0, y1 in PILASTER_BASE:
        kit_wall_box(b, (-half, half), (y0, y1), proj, KIT_BASE, hide=('bottom',))


def build_window_frame(b):
    """Template centred on the opening (WINDOW_FRAME_OPEN 2.2 x 3.5), wall at z 0 projecting
    -Z: two jambs standing on the sill, a head band over both jambs, the sill slab
    overhanging the architrave by WINDOW_SILL[2]; no hood. Jamb tops/bottoms are buried in
    head and sill."""
    width, height = WINDOW_FRAME_OPEN
    band, proj = WINDOW_ARCH
    sill_h, sill_proj, overhang = WINDOW_SILL
    hw, hh = width / 2, height / 2
    for x in ((-hw - band, -hw), (hw, hw + band)):
        kit_wall_box(b, x, (-hh, hh), proj, KIT_BASE, hide=('top', 'bottom'))
    kit_wall_box(b, (-hw - band, hw + band), (hh, hh + band), proj, KIT_BASE)
    kit_wall_box(b, (-hw - band - overhang, hw + band + overhang), (-hh - sill_h, -hh),
                 sill_proj, KIT_BASE)


def place(name, me, location, rot_y=0.0):
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    return ob


# ---- realisation ---------------------------------------------------------------------------
def realize(b, material_names, first_cell):
    me = bpy.data.meshes.new(b.name)
    me.from_pydata([to_b(p) for p in b.verts], [], [list(f) for f, _ in b.faces])
    me.update()
    for mn in material_names:
        me.materials.append(bpy.data.materials[mn])
    uv = me.uv_layers.new(name='uv')
    lm = me.uv_layers.new(name='lm')
    cell = LM_RES / LM_GRID
    inner = cell - 2 * LM_PAD_PX
    for pi, poly in enumerate(me.polygons):
        f, mat = b.faces[pi]
        poly.material_index = mat
        pts = [b.verts[i] for i in f]
        proj = [box_uv(p, newell(pts)) for p in pts]
        us, vs = [p[0] for p in proj], [p[1] for p in proj]
        u0, v0 = min(us), min(vs)
        du, dv = (max(us) - u0) or 1.0, (max(vs) - v0) or 1.0
        c = first_cell + pi
        cx, cy = c % LM_GRID, c // LM_GRID
        for li, loop in enumerate(poly.loop_indices):
            pu, pv = proj[li]
            uv.data[loop].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
            fu, fv = (pu - u0) / du, (pv - v0) / dv
            lm.data[loop].uv = ((cx * cell + LM_PAD_PX + fu * inner) / LM_RES,
                                (cy * cell + LM_PAD_PX + fv * inner) / LM_RES)
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)
    return len({mat for _, mat in b.faces})


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', export_apply=True, export_tangents=False,
        export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='AUTO', export_yup=True, export_animations=False, export_skins=False,
        export_morph=False, export_cameras=False, export_lights=False, export_extras=False,
        use_selection=False)


def stage_dir():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for flag in ('--out', '--stage'):
        if flag in argv:
            return Path(argv[argv.index(flag) + 1]).resolve()
    if argv and not argv[0].startswith('-'):
        return Path(argv[0]).resolve()
    env = os.environ.get('ZIMNY_STAGE')
    if env:
        return Path(env).resolve()
    return Path(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def main():
    stage = stage_dir()
    tex_dir = stage / 'tex'
    tex_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    images = {name: write_texture(name, size, tex_dir) for name, size in TEXTURES}
    make_material('plaster_warm', images['plaster_warm'], 0.85)
    make_material('marble_floor', images['marble_floor'], 0.35)
    make_material('pane', images['plaster_warm'], 0.6, (PANE_EMISSION_RGB, PANE_EMISSION))
    make_material('sconce_glow', images['plaster_warm'], 0.85, (KIT_GLOW_RGB, KIT_GLOW_EMISSION))
    make_material('chandelier_glow', images['gilt'], 0.35, (KIT_GLOW_RGB, KIT_GLOW_EMISSION))
    make_material('granite_grey', images['granite_grey'], 0.6)
    make_material('gilt', images['gilt'], 0.35, metallic=GILT_METALLIC)

    shell, pane = MeshBuilder('shell'), MeshBuilder('pane')
    build_floor(shell)
    build_north_wall(shell, pane)
    build_south_wall(shell)
    build_end_walls(shell)
    build_vault(shell)
    build_vestibule(shell)

    runners = [(shell, ['plaster_warm', 'marble_floor']), (pane, ['pane'])]
    for name, builder, mats in (
        ('stairs', build_stairs, ['marble_floor']),
        ('rail', build_rail, ['gilt']),
        ('baluster', build_baluster, ['gilt']),
        ('column', build_column, ['granite_grey', 'gilt']),
        ('portal', build_portal, ['plaster_warm', 'gilt']),
        ('chandelier', build_chandelier, ['gilt', 'chandelier_glow']),
        ('sconce', build_sconce, ['plaster_warm', 'sconce_glow']),
        # slice 1: the wall order; slot order = KIT_BASE 0, KIT_ACCENT 1 as the builders emit it
        ('cornice', build_cornice, ['plaster_warm']),
        ('pilaster', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_base', build_pilaster_base, ['plaster_warm']),
        ('window_frame', build_window_frame, ['plaster_warm']),
    ):
        b = MeshBuilder(name)
        builder(b)
        runners.append((b, mats))

    meshes, cells, drawn, draws = {}, 0, 0, 0
    templates, primitives, envelope_cells = {}, {}, 0
    for b, mats in runners:
        name = b.name
        if name == 'stairs':
            cells = LM_PART2_FIRST_CELL
        first_cell = cells
        cells += len(b.faces)
        if cells > LM_CAPACITY:
            raise RuntimeError(
                f'lm cells {cells} exceed LM_CAPACITY ({LM_CAPACITY}); overflow mesh: {name}')
        prims = realize(b, mats, first_cell)
        meshes[name] = {'triangles': b.triangles(), 'instances': 1, 'materials': mats,
                        'lmFirstCell': first_cell, 'faces': len(b.faces)}
        primitives[name] = prims
        draws += prims
        if name == 'pane':
            envelope_cells = cells
        if name in ('baluster', 'column', 'sconce', 'pilaster', 'pilaster_base', 'window_frame'):
            ob = bpy.data.objects[name]
            templates[name] = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            meshes[name]['instances'] = 0

    def put(name, location, rot_y=0.0):
        place(name, templates[name], location, rot_y)
        meshes[name]['instances'] += 1

    segment_counts = []
    for run in RAIL_RUNS:
        counts = []
        for a, c in zip(run, run[1:]):
            dx, dz = c[0] - a[0], c[2] - a[2]
            length = math.hypot(dx, dz)
            count = int(length / BALUSTER_PITCH + 0.5)
            counts.append(count)
            for i in range(count):
                p = lerp(a, c, (i + 0.5) / count)
                y = a[1]
                if a[1] != c[1]:
                    f = rail_flight(a, c)
                    y = flight_datum(f, p[0] if f['axis'] == 'x' else p[2])
                put('baluster', (p[0], y, p[2]), math.atan2(-dz, dx))
        segment_counts.append(counts)
    for x, z in COLUMN_XZ:
        put('column', (x, LANDING_Y, z))
    for z in SCONCE_WEST_Z:
        put('sconce', (X_W, flight_datum(FLIGHTS[0], z) + SCONCE_ABOVE, z), -math.pi / 2)
    for x in SCONCE_NORTH_X:
        put('sconce', (x, flight_datum(FLIGHTS[1], x) + SCONCE_ABOVE, Z_N), math.pi)
    for z, y in SCONCE_EAST:
        put('sconce', (X_E, y, z), math.pi / 2)
    # slice 1: the wall order. Template convention = sconce convention: wall plane z 0, prop
    # toward local -Z. rot_y about glTF +Y (= Blender Z after to_b): north pi -> local -Z
    # becomes world +Z into the hall; south 0 -> world -Z; east pi/2 -> world -X (and local
    # +x -> world -z). The roster carries each pier's rot_y; shaft foot PILASTER_Y0 is world
    # y (= base top), the base stands on Y_FLOOR for all sixteen entries (one template; the
    # east shafts rise from the floor through the landing slab).
    for x, z, rot_y in PILASTERS:
        put('pilaster', (x, PILASTER_Y0, z), rot_y)
        put('pilaster_base', (x, Y_FLOOR, z), rot_y)
    for x, y in WINDOW_FRAMES:
        put('window_frame', (x, y, Z_N), math.pi)

    drawn = sum(row['triangles'] * row['instances'] for row in meshes.values())
    draws_naive = sum(primitives[name] * row['instances'] for name, row in meshes.items())

    if BAKE:
        return
    export_glb(stage / f'{ROOM_ID}.glb')

    summary = {
        'room': ROOM_ID, 'stage': STAGE, 'meshes': meshes, 'trianglesDrawn': drawn,
        'draws': draws, 'drawsNaive': draws_naive, 'budget': {'trianglesMax': 380000},
        'textures': [{'name': n, 'size': s} for n, s in TEXTURES],
        'declared': {
            'bounds': {'x': [X_W, X_E], 'y': [Y_FLOOR, Y_CROWN], 'z': [Z_N, Z_S]},
            'orientation': {'windowWall': 'north Z-86 Neva/Palace Embankment',
                            'portholeWall': 'south Z-62 Palace Square'},
            'windowTiers': {'bays': WIN_BAYS, 'pitchM': WIN_PITCH, 'widthM': WIN_W,
                            'recessM': WIN_RECESS, 'bayCentresX': window_bays(),
                            'tiers': [{'sill': s, 'head': h} for s, h in WIN_TIERS]},
            'portholes': {'radiusM': PORT_R, 'depthM': PORT_DEPTH, 'y': list(PORT_Y),
                          'segments': PORT_SEG},
            'vault': {'springY': VAULT_SPRING_Y, 'crownY': Y_CROWN, 'facets': VAULT_NZ,
                      'coffers': [VAULT_NX, VAULT_NZ], 'cofferDepthM': COFFER_DEPTH},
            'vestibule': {'x': list(VEST_X), 'z': list(VEST_Z), 'ceilingY': VEST_H,
                          'door': {'x': list(DOOR_X), 'head': DOOR_H}},
            'landingY': LANDING_Y,
            'lm': {'res': LM_RES, 'padPx': LM_PAD_PX, 'grid': LM_GRID, 'envelopeCells': envelope_cells,
                   'part2FirstCell': LM_PART2_FIRST_CELL, 'part2Cells': cells - LM_PART2_FIRST_CELL,
                   'totalCells': cells, 'capacity': LM_CAPACITY},
            'uvTileM': UV_TILE_M,
            'paneEmissionStrength': PANE_EMISSION,
            'giltMetallic': GILT_METALLIC,
            'textures': [n for n, _ in TEXTURES],
            'flights': [dict(f, top=f['a0'] + f['d'] * RUN, risers=RISERS, treads=TREADS,
                             riseM=RISE, goingM=GOING, runM=RUN,
                             treadBlockM=[f['band'][1] - f['band'][0], RISE, GOING],
                             topRiser='slab edge', stringerThicknessM=STRINGER_T,
                             stringerBand=stringer_band(f)) for f in FLIGHTS],
            'slabs': {'thicknessM': SLAB_T,
                      'mezzanine': {'x': MEZZ_X, 'y': MEZZ_Y, 'z': MEZZ_Z},
                      'landing': {'x': LAND_X, 'y': LANDING_Y, 'z': LAND_Z},
                      'soffitReturnM': abs(STRINGER_T + RISE - SLAB_T)},
            'rail': {'profileM': RAIL_PROFILE, 'topAboveDatumM': RAIL_TOP, 'runs': RAIL_RUNS,
                     'datum': 'nose line minus one rise; slab top on landings',
                     'topReturnsM': RISE, 'returnPlanDepthM': RAIL_PROFILE[1],
                     'joins': 'mitered closed spans and overlapping solid vertical returns',
                     'flight2SouthSupportM': round(stringer_band(FLIGHTS[1])[1] - F2_Z[1], 6)},
            'balusters': {'pitchM': BALUSTER_PITCH, 'N': meshes['baluster']['instances'],
                          'segmentCounts': segment_counts, 'segments': BALUSTER_SEG,
                          'rings': BALUSTER_RINGS, 'placement': 'equal-bin midpoints per segment',
                          'datum': 'same continuous nose-minus-rise datum as the rail'},
            'columns': {'count': meshes['column']['instances'], 'xz': COLUMN_XZ,
                        'baseY': LANDING_Y, 'plinth': COLUMN_PLINTH,
                        'shaftRings': COLUMN_SHAFT_RINGS, 'capitalRings': COLUMN_CAPITAL_RINGS,
                        'abacus': COLUMN_ABACUS, 'segments': COLUMN_SEG,
                        'abacusTopY': round(LANDING_Y + COLUMN_ABACUS[2], 6),
                        'buried': 'plinth bottom, lathe ends, abacus top (coplanar with the cornice soffit)',
                        'materials': {'granite_grey': 'plinth, torus, shaft',
                                      'gilt': 'echinus, abacus'}},
            'portal': {'z': PORTAL_Z, 'baseY': LANDING_Y, 'halfWidthM': PORTAL_HALF_W,
                       'heightM': PORTAL_H, 'jambM': PORTAL_JAMB, 'depthM': PORTAL_DEPTH,
                       'head': PORTAL_HEAD,
                       'doors': {'leaf': DOOR_LEAF, 'mould': DOOR_MOULD,
                                 'stilesDz': DOOR_STILES_DZ, 'railsY': DOOR_RAILS_Y,
                                 'railsYFrame': 'world', 'margin': DOOR_MARGIN,
                                 'panels': 'white', 'state': 'closed (DEC-025)'},
                       'materials': {'plaster_warm': 'jambs, head, entablature, leaves, niches, pedestals',
                                     'gilt': 'stile and rail mouldings, vases'},
                       'entablature': PORTAL_ENTAB, 'opening': 'wall-backed; frozen shell uncut',
                       'nichesZ': [PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ],
                       'nicheOuter': NICHE_OUTER, 'nicheOpen': NICHE_OPEN,
                       'nicheFaceDepthM': NICHE_DEPTH, 'nicheCavityM': NICHE_CAVITY,
                       'pedestal': PEDESTAL,
                       'vases': {'count': 2, 'segments': VASE_SEG, 'rings': VASE_RINGS,
                                 'mesh': 'portal'}},
            'order': {
              'cornice': {'steps': CORNICE, 'divisions': CORNICE_DIV, 'runs': CORNICE_RUNS,
                          'bottomY': CORNICE[0][0], 'topY': CORNICE[1][1],
                          'corners': 'butt; E/W runs trimmed by each step projection; no end caps',
                          'vestibuleCap': VEST_CAP, 'vestibuleCapRuns': VEST_CAP_RUNS,
                          'vestibuleDoorFrame': VEST_DOOR_FRAME,
                          'instances': meshes['cornice']['instances'], 'mesh': 'world-space'},
              'pilasters': {'footY': PILASTER_Y0, 'shaft': PILASTER_SHAFT,
                            'shaftDivisions': PILASTER_SHAFT_DIV, 'capital': PILASTER_CAPITAL,
                            'abacusTopY': round(PILASTER_Y0 + PILASTER_CAPITAL[-1][3], 6),
                            'base': PILASTER_BASE, 'baseY': Y_FLOOR,
                            'northX': PILASTER_NORTH_X, 'southX': PILASTER_SOUTH_X,
                            'eastZ': PILASTER_EAST_Z, 'roster': PILASTERS,
                            'N': meshes['pilaster']['instances'],
                            'basesN': meshes['pilaster_base']['instances'],
                            'templateFront': '-Z',
                            'rotYRadians': {'north': math.pi, 'south': 0.0,
                                            'east': math.pi / 2}},
              'windowFrames': {'opening': WINDOW_FRAME_OPEN, 'architrave': WINDOW_ARCH,
                               'sill': WINDOW_SILL, 'baysX': WIN_X, 'roster': WINDOW_FRAMES,
                               'wall': 'north', 'wallZ': Z_N, 'rotYRadians': math.pi,
                               'N': meshes['window_frame']['instances']},
              'slots': {'base': KIT_BASE, 'accent': KIT_ACCENT,
                        'law': 'materials[i] is the builder slot i; one glTF primitive per used slot'},
              },

            'chandelier': {'xz': CHAND_C, 'ringY': CHAND_RING_Y, 'radiiM': CHAND_R,
                           'bandM': CHAND_BAND, 'segments': CHAND_SEG, 'rodWidthM': CHAND_ROD,
                           'rodTopY': CHAND_ROD_TOP, 'pendants': min(CHAND_SEG, 8),
                           'spokes': min(CHAND_SEG, 8), 'dropHalfExtentsM': CHAND_DROP,
                           'dropRadiusM': CHAND_DROP_R, 'dropY': CHAND_DROP_Y,
                           'coreHalfExtentsM': CHAND_CORE, 'coreY': CHAND_CORE_Y,
                           'emissionStrength': KIT_GLOW_EMISSION},
            'sconces': {'M': meshes['sconce']['instances'], 'aboveDatumM': SCONCE_ABOVE,
                        'westZ': SCONCE_WEST_Z, 'northX': SCONCE_NORTH_X, 'eastZY': SCONCE_EAST,
                        'westPitchM': abs(SCONCE_WEST_Z[1] - SCONCE_WEST_Z[0]),
                        'northPitchM': round(SCONCE_NORTH_X[1] - SCONCE_NORTH_X[0], 6),
                        'templateFront': '-Z', 'northWorldFront': '+Z into hall',
                        'rotYRadians': {'west': -math.pi / 2, 'north': math.pi,
                                        'east': math.pi / 2},
                        'bracket': SCONCE_BRACKET, 'glowBox': SCONCE_GLOW_BOX,
                        'emissionStrength': KIT_GLOW_EMISSION},
            'kitRefs': 'solids: twice face centroid minus interior centroid; lathe sides: '
                       'radially outward; caps: beyond ends; ring inner: centre; niche faces: '
                       'HALL_REF; niche reveals: cavity centre; frame returns: radially outward',
            'lmInstancePolicy': 'instanced props share their template\'s \'lm\' cells; '
                                'the r17 lighting policy for props is the ADR-0013 static '
                                'environment probe (architecture + stairs get the lightmap '
                                'bake, props get probe + emissive fixtures).',
        },
    }
    (stage / 'summary.json').write_text(json.dumps(summary, sort_keys=True, indent=2) + '\n')
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')))


main()
