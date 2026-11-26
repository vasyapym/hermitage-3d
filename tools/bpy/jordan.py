"""Deterministic Jordan Staircase authoring for Blender 4.2 LTS.

Authored coordinates are glTF world axes: +X east, +Y up, +Z south. Blender
coordinates are (x, -z, y).

Slice 2 replaces the shell lightmap layout, procedural albedos and authored
emissive strengths, not the room footprint, ascent, fixture forms or instance
rosters. Wall-mounted templates have their wall at local z=0 and project toward
-Z. Their glTF Y rotations are Blender Z rotations after the coordinate
conversion. The allocator exposes LM_CELL_MAP and write_lm_cells() to bake.py.
Its cells use Blender UV rows: row zero is v=0. Template instances share one
allocation. The asset build also writes the same map beside the staged
lightmap plates.
"""

import json
import math
import os
import struct
import sys
import zlib
from pathlib import Path

import bpy
import numpy as np

# bake.py executes this builder with ZIMNY_BAKE=1 and owns export/logging then.
BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'jordan'
STAGE = 'full'
X_W, X_E = 66.0, 92.0
Z_N, Z_S = -86.0, -62.0
Y_FLOOR = 0.0
VAULT_SPRING_Y = 18.0
Y_CROWN = 20.0
LANDING_Y = 10.0
HALL_REF = ((X_W + X_E) / 2, 9.0, (Z_N + Z_S) / 2)
VAULT_NZ = 8
VAULT_NX = 8
COFFER_INSET = 0.18
COFFER_DEPTH = 0.35
FLOOR_DIV = (10, 10)
END_WALL_DIV = (4, 3)
SHELL_FIELD_MAX_QUAD_M = 2.0
SHELL_TRIS_EXPECTED = 3500
WIN_BAYS = 6
WIN_PITCH = 3.9
WIN_W = 2.2
WIN_RECESS = 0.6
WIN_TIERS = ((3.0, 6.5), (13.0, 16.5))
PORT_R = 1.0
PORT_SQ = 1.3
PORT_DEPTH = 0.3
PORT_SEG = 16
PORT_Y = (4.75, 14.75)
VEST_X = (78.0, 84.0)
VEST_Z = (-68.0, -62.0)
VEST_H = 3.0
DOOR_X = (79.5, 82.5)
DOOR_H = 2.6
DOOR_RECESS = 0.4
UV_TILE_M = 4.0
LM_RES = 2048
LM_PAD_PX = 2
LM_GRID = 64
LM_CAPACITY = LM_GRID * LM_GRID
# The bands fix (2026-11-16): the per-wall/per-tier template split adds 2 extra pilaster
# datablocks (2 x 24 faces), 2 extra bases (2 x 8) and 1 extra frame (16) — 3150 + 80.
# The ghost-split (2026-11-18): +144 (the ghost-split: the north shafts 24×7) —
# 3230 + 144 = 3374; max unchanged.
# The plafond round (2026-11-21): the 20 field bays drop their coffers (−180 faces) and
# the field +20 / the frame +58 join right after the pane — 3374 − 102 = 3272; the
# measured counter 3,372 (the fixtures' retired ranges re-seat −102); max unchanged.
# The warn raised 3,400→3,500 (the ghost-split's measured atlas repack cost — 7
# isolated rosters pay their own pad-2 footprints; the owner's call 2026-11-18;
# the measured 3,474); the hard max 4,096 untouched.
LM_CELLS = {'expected': 3272, 'warn': 3500, 'max': 4096}
# Filled from the actual envelope allocation; 1536 is no longer a safe barrier.
LM_PART2_FIRST_CELL = 0
LM_CELL_MAP = {'res': LM_RES, 'grid': LM_GRID, 'pad': LM_PAD_PX, 'cells': {}}
PANE_EMISSION = ((0.84, 0.89, 1.00), 3.0)
SCONCE_GLOW_EMISSION = ((1.00, 0.78, 0.50), 1.0)  # 2c: strength 1.0 — the tint survives the clip (2.0 blew blue to white)
CHANDELIER_GLOW_EMISSION = ((1.00, 0.82, 0.58), 1.0)  # 2c: same law
PANE_BASE_COLOR = (0.02, 0.02, 0.025)  # 2c: the pane reads as dark glass, never a lit plaster card
GILT_METALLIC = 0.5
TEXTURES = (('marble_floor', 512), ('plaster_warm', 512), ('granite_grey', 256), ('gilt', 256),
            ('plafond', 1024), ('neva', 1024))
TEX_SEED = {'plaster_warm': 0x504C4153, 'marble_floor': 0x4D415242, 'granite_grey': 0x4752414E, 'gilt': 0x47494C54,
            'plafond': 0x504C4146}  # 'PLAF' — the ruling's seed; the open-sky plafond plate
MATERIAL_REPEAT_M = {'plaster_warm': 4.0, 'granite_grey': 0.5, 'gilt': 0.32, 'pane': 4.0, 'sconce_glow': 4.0, 'chandelier_glow': 0.32}
# The supplied source has no separate numeric gold-F0 record. These are the
# exact channel means of its former gold generator, in encoded sRGB values.
GILT_BASE = (0.88, 0.705, 0.35)
MAT_PLASTER, MAT_MARBLE = 0, 1
MAT_PLAFOND = 0  # the field mesh's single slot (the runner's materials list is ['plafond'])
MAT_FRAME_GILT = 0  # the frame mesh's single slot (the runner's materials list is ['gilt'])
KIT_BASE, KIT_GLOW = 0, 1
KIT_ACCENT = 1
RISERS = 35
TREADS = RISERS - 1
RISE = 5.0 / RISERS
GOING = 0.32
RUN = TREADS * GOING
STRINGER_T = 0.45
SLAB_T = 0.5
MEZZ_Y = 5.0
F1_X = (X_W, X_W + 1.6)
F1_TOP_Z = -79.0
F1_Z0 = F1_TOP_Z + RUN
MEZZ_Z = (-84.4, F1_TOP_Z)
F2_TOP_X = 80.0
F2_X0 = F2_TOP_X - RUN
MEZZ_X = (X_W, F2_X0)
F2_Z = (-84.4, -82.8)
LAND_X = (F2_TOP_X, X_E)
LAND_Z = (-84.4, -64.0)
FLIGHTS = (
    {'name': 'flight1', 'axis': 'z', 'a0': F1_Z0, 'd': -1.0, 'band': F1_X, 'y': (Y_FLOOR, MEZZ_Y), 'open': (F1_X[1],)},
    {'name': 'flight2', 'axis': 'x', 'a0': F2_X0, 'd': 1.0, 'band': F2_Z, 'y': (MEZZ_Y, LANDING_Y), 'open': F2_Z},
)
RAIL_INSET = 0.1
RAIL_TOP = 1.0
RAIL_PROFILE = (0.16, 0.10)
RAIL_RUNS = (
    ((F1_X[1] - RAIL_INSET, Y_FLOOR, F1_Z0), (F1_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET),
     (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET), (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, F2_Z[1] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, F2_Z[1] + RAIL_INSET), (LAND_X[0] + RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET),
     (LAND_X[1] - RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET)),
    ((X_W + 0.15, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET), (F2_X0, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET), (LAND_X[1] - RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET)),
)
BALUSTER_PITCH = 0.55
BALUSTER_SEG = 8
BALUSTER_RINGS = ((0.06, -2 * RISE), (0.085, 0.03), (0.04, 0.16), (0.075, 0.45), (0.04, 0.74), (0.065, 0.93))
COLUMN_XZ = ((91.0, -76.6), (91.0, -71.4))
COLUMN_SEG = 16
COLUMN_PLINTH = (0.65, 0.3)
COLUMN_SHAFT_RINGS = ((0.62, 0.30), (0.62, 0.40), (0.54, 0.48), (0.50, 0.56), (0.50, 2.40), (0.47, 4.40), (0.42, 6.20))
COLUMN_CAPITAL_RINGS = ((0.42, 6.20), (0.45, 6.32), (0.56, 6.55), (0.60, 6.72))
COLUMN_ABACUS = (0.65, 6.72, 7.0)
PORTAL_Z = -74.0
PORTAL_HALF_W = 1.5
PORTAL_H = 6.0
PORTAL_JAMB = 0.5
PORTAL_DEPTH = 0.7
PORTAL_HEAD = 0.4
PORTAL_ENTAB = (16.4, 17.0, 1.9, 0.9)
DOOR_LEAF = (0.14, 0.06)
DOOR_MOULD = (0.14, 0.05)
DOOR_STILES_DZ = (-1.43, 0.0, 1.43)
DOOR_RAILS_Y = (10.5, 12.9, 15.0, 15.7)
DOOR_MARGIN = 0.07
NICHE_DZ = 5.5
NICHE_OUTER = (0.75, 10.8, 14.4)
NICHE_OPEN = (0.5, 11.1, 14.0)
NICHE_DEPTH = 0.45
NICHE_CAVITY = 0.35
PEDESTAL = (0.2, 0.25)
VASE_SEG = 6
VASE_RINGS = ((0.07, 0.0), (0.13, 0.2), (0.17, 0.55), (0.09, 1.0), (0.07, 1.15), (0.12, 1.27))
CHAND_C = (86.0, -74.0)
CHAND_RING_Y = 15.0
CHAND_R = (1.45, 1.6)
CHAND_BAND = 0.2
CHAND_SEG = 10
CHAND_ROD = 0.06
CHAND_ROD_TOP = 19.9
CHAND_DROP = (0.12, 0.3, 0.12)
CHAND_DROP_R = 1.5
CHAND_DROP_Y = 14.5
CHAND_CORE = (0.4, 0.8, 0.4)
CHAND_CORE_Y = 14.2
SCONCE_ABOVE = 1.8
SCONCE_WEST_Z = (-69.5, -71.5, -73.5, -75.5, -77.5)
SCONCE_NORTH_X = (71.2, 75.1, 79.0)
SCONCE_EAST = ((-82.0, 12.4), (-66.0, 12.4))
SCONCE_BRACKET = (0.35, 0.05)
SCONCE_GLOW_BOX = ((0.22, 0.48), (0.05, 0.45), (-0.13, 0.13))
CORNICE = ((17.0, 17.45, 0.35), (17.45, 18.0, 0.60))
CORNICE_DIV = 4
CORNICE_RUNS = (
    ('z', Z_N, X_W, X_E, 1.0, False),
    ('z', Z_S, X_W, X_E, -1.0, False),
    ('x', X_W, Z_N, Z_S, 1.0, True),
    ('x', X_E, Z_N, Z_S, -1.0, True),
)
VEST_CAP = (2.78, 3.0, 0.14)
VEST_CAP_RUNS = (
    ('z', VEST_Z[0], VEST_X[0] - 0.14, VEST_X[1] + 0.14, -1.0),
    ('x', VEST_X[0], VEST_Z[0], VEST_Z[1], -1.0),
    ('x', VEST_X[1], VEST_Z[0], VEST_Z[1], 1.0),
)
VEST_DOOR_FRAME = (0.16, 0.08)
PILASTER_Y0 = 0.6
PILASTER_SHAFT = (0.45, 0.20, 15.7)
PILASTER_SHAFT_DIV = 4
PILASTER_CAPITAL = ((0.47, 0.22, 15.70, 15.82), (0.52, 0.26, 15.82, 16.15), (0.56, 0.28, 16.15, 16.40))
PILASTER_BASE = ((0.54, 0.28, 0.0, 0.45), (0.50, 0.24, 0.45, 0.60))
PIER_X = (67.075, 71.2, 75.1, 79.0, 82.9, 86.8, 90.925)
PILASTER_NORTH_X = PIER_X
PILASTER_SOUTH_X = (67.075, 71.2, 75.1, 86.8, 90.925)
PILASTER_EAST_Z = (-85.2, -76.6, -71.4, -62.8)
PILASTERS = tuple(
    [(x, Z_N, math.pi) for x in PILASTER_NORTH_X]
    + [(x, Z_S, 0.0) for x in PILASTER_SOUTH_X]
    + [(X_E, z, math.pi / 2) for z in PILASTER_EAST_Z])
WIN_X = tuple((X_W + X_E) / 2 + (i - (WIN_BAYS - 1) / 2) * WIN_PITCH for i in range(WIN_BAYS))
WINDOW_FRAME_OPEN = (WIN_W, WIN_TIERS[0][1] - WIN_TIERS[0][0])
WINDOW_ARCH = (0.18, 0.10)
WINDOW_SILL = (0.14, 0.18, 0.06)
WINDOW_FRAMES = tuple((cx, (sill + head) / 2) for cx in WIN_X for sill, head in WIN_TIERS)

# --- the jordan-parallel plafond round (the ceiling slice; the ruling 2026-11-21) ---
# The painted plafond: a smooth field + a gilt frame ring cut into the vault's bay grid.
# PLAFOND_BAYS: half-open [i0,i1)×[k0,k1) ranges of the VAULT_NX×VAULT_NZ bay grid — the
# field x spans xs[i0]..xs[i1], z spans prof[k0].z..prof[k1].z (the S5 night-pool shift:
# the chandelier rig lamp sits at x 86, so the field reaches bay 6 to hang the lamp
# 2.75 m inside the east bar). The margins keep today's coffers.
PLAFOND_BAYS = ((2, 7), (2, 6))
PLAFOND_FRAME = (0.30, 0.16)  # the gilt bar's section: w along-surface × d radial drop
BORDER_M = 0.90               # the plate's painted margin (metres, aspect-true; the gilt bar sits on it)
PLATE_MAX = 0.80              # the plate's stored-channel cap: the percentile encode must not clip the field
# uv_fn-mapped one-shot plates: the metre-repeat law (MATERIAL_REPEAT_M) does not apply —
# realize's default metre scaling would destroy the field-planar mapping.
ONE_SHOT_MATERIALS = ('plafond',)


def v_sub(a, b):
    return tuple(a[i] - b[i] for i in range(3))


def v_add(a, b):
    return tuple(a[i] + b[i] for i in range(3))


def v_scale(a, s):
    return tuple(x * s for x in a)


def v_dot(a, b):
    return sum(a[i] * b[i] for i in range(3))


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
    return v_scale(n, 1.0 / (math.sqrt(v_dot(n, n)) or 1.0))


def to_b(p):
    return (p[0], -p[2], p[1])


def r6(vals):
    return tuple(round(v, 6) for v in vals)


def edges(vals):
    return sorted(set(round(v, 6) for v in vals))


def field_edges(vals):
    result = [vals[0]]
    for a, c in zip(vals, vals[1:]):
        count = max(1, math.ceil((c - a) / SHELL_FIELD_MAX_QUAD_M))
        result.extend(a + (c - a) * i / count for i in range(1, count + 1))
    return result


def box_uv(p, n):
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ax >= ay and ax >= az:
        return (p[2], p[1])
    if ay >= az:
        return (p[0], p[2])
    return (p[0], p[1])


def surface_projection(pts):
    """Orthonormal planar coordinates, so sloping surfaces still use surface metres."""
    n = unit(newell(pts))
    ax, ay, az = map(abs, n)
    if ay >= ax and ay >= az:
        u_hint, v_hint = (1.0, 0.0, 0.0), (0.0, 0.0, 1.0)
    elif ax >= az:
        u_hint, v_hint = (0.0, 0.0, 1.0), (0.0, 1.0, 0.0)
    else:
        u_hint, v_hint = (1.0, 0.0, 0.0), (0.0, 1.0, 0.0)
    u = unit(v_sub(u_hint, v_scale(n, v_dot(u_hint, n))))
    v = unit(v_sub(v_sub(v_hint, v_scale(n, v_dot(v_hint, n))), v_scale(u, v_dot(v_hint, u))))
    return [(v_dot(p, u), v_dot(p, v)) for p in pts]


class MeshBuilder:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []
        self.uvs = []
        self.smooth_groups = []
        self._shared = {}

    def add(self, pts, mat, ref, uv=None, smooth_group=None):
        pts = list(pts)
        uv = list(uv) if uv is not None else None
        if v_dot(newell(pts), v_sub(ref, pts[0])) < 0:
            pts.reverse()
            if uv is not None:
                uv.reverse()
        indices = []
        for p in pts:
            # Only vault faces share vertices. Welding the whole shell would join
            # deliberately opposite-facing vestibule surfaces and damage normals.
            key = (smooth_group, tuple(round(x, 9) for x in p))
            if smooth_group is not None and key in self._shared:
                index = self._shared[key]
            else:
                index = len(self.verts)
                self.verts.append(p)
                if smooth_group is not None:
                    self._shared[key] = index
            indices.append(index)
        self.faces.append((tuple(indices), mat))
        self.uvs.append(uv)
        self.smooth_groups.append(smooth_group)

    def triangles(self):
        return sum(len(f) - 2 for f, _ in self.faces)


def _grid(n):
    t = (np.arange(n, dtype=np.float64) + 0.5) / n
    v, u = np.meshgrid(t, t, indexing='ij')
    return u, v


def lowbias32(value):
    mask = np.uint64(0xFFFFFFFF)
    x = np.asarray(value, dtype=np.uint64) & mask
    x = ((x ^ (x >> np.uint64(16))) * np.uint64(0x7FEB352D)) & mask
    x = ((x ^ (x >> np.uint64(15))) * np.uint64(0x846CA68B)) & mask
    return (x ^ (x >> np.uint64(16))) & mask


def tex_hash(seed, ix=0, iy=0, octave=0):
    x = lowbias32(np.uint64(seed) ^ lowbias32(np.asarray(ix, dtype=np.uint64) ^ np.uint64(0x9E3779B9)))
    x = lowbias32(x ^ lowbias32(np.asarray(iy, dtype=np.uint64) ^ np.uint64(0x85EBCA6B)))
    return lowbias32(x ^ lowbias32(np.asarray(octave, dtype=np.uint64) ^ np.uint64(0xC2B2AE35)))


def hash01(seed, ix=0, iy=0, octave=0):
    return tex_hash(seed, ix, iy, octave).astype(np.float64) / 4294967296.0


def quintic(t):
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def value_noise(u, v, period, seed, octave=0, wrap=True):
    x, y = u * period, v * period
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = quintic(x - ix), quintic(y - iy)
    # wrap tiles the lattice at `period` (the committed repeating plates); wrap=False
    # leaves the lattice open for one-shot plates (the plafond's metre-isotropic fBm,
    # whose periods are non-integer in the tile space).
    if wrap:
        x0, x1 = ix % period, (ix + 1) % period
        y0, y1 = iy % period, (iy + 1) % period
    else:
        x0, x1 = ix, ix + 1
        y0, y1 = iy, iy + 1
    a = hash01(seed, x0, y0, octave)
    b = hash01(seed, x1, y0, octave)
    c = hash01(seed, x0, y1, octave)
    d = hash01(seed, x1, y1, octave)
    return 2.0 * ((a + (b - a) * fx) * (1.0 - fy) + (c + (d - c) * fx) * fy) - 1.0


def fbm(u, v, periods, seed, gain=0.5, octave_offset=0, wrap=True):
    result = np.zeros_like(u, dtype=np.float64)
    weight = total = 1.0
    total = 0.0
    for octave, period in enumerate(periods):
        result += weight * value_noise(u, v, period, seed, octave + octave_offset, wrap=wrap)
        total += weight
        weight *= gain
    return result / total


def tex_plaster_warm(n):
    u, v = _grid(n)
    seed = TEX_SEED['plaster_warm']
    mottle = 0.025 * fbm(u, v, (8, 16, 32), seed)
    # A period-one, one-node toroidal value lattice is a constant shade term.
    shade = 0.015 * value_noise(u, v, 1, seed, 17)
    delta = mottle + shade
    return tuple(channel + delta for channel in (0.93, 0.91, 0.87))


def tex_marble_floor(n):
    u, v = _grid(n)
    seed = TEX_SEED['marble_floor']
    mottle = 0.02 * fbm(u, v, (8, 16, 32), seed)
    rgb = np.stack([channel + mottle for channel in (0.90, 0.90, 0.89)], axis=-1)
    sx, sy = np.floor(2 * u).astype(np.int64), np.floor(2 * v).astype(np.int64)
    su, sv = 2 * u - sx, 2 * v - sy
    vein_rgb = np.array((0.62, 0.63, 0.65), dtype=np.float64)
    for slab in range(4):
        mask = (sx == slab % 2) & (sy == slab // 2)
        count = 1 + int(tex_hash(seed, slab, 0, 40)) % 3
        alpha = np.zeros_like(u)
        for vein in range(count):
            angle = 2 * math.pi * float(hash01(seed, slab, vein, 41))
            centre = 0.55 * (float(hash01(seed, slab, vein, 42)) - 0.5)
            width = 0.006 + 0.006 * float(hash01(seed, slab, vein, 43))
            warp = 0.08 * value_noise(su, sv, 8, seed, 64 + slab * 3 + vein)
            distance = ((su - 0.5) * math.cos(angle) + (sv - 0.5) * math.sin(angle) - centre + warp)
            alpha = np.maximum(alpha, 0.60 * np.exp(-0.5 * (distance / width) ** 2))
        rgb[mask] = rgb[mask] * (1.0 - alpha[mask, None]) + vein_rgb * alpha[mask, None]
    indices = np.arange(n)
    slab_px = n // 2
    joint_axis = (indices % slab_px == 0) | (indices % slab_px == slab_px - 1)
    joints = joint_axis[:, None] | joint_axis[None, :]
    rgb[joints] = (0.78, 0.78, 0.77)
    return tuple(rgb[..., channel] for channel in range(3))


def tex_granite_grey(n):
    u, v = _grid(n)
    seed = TEX_SEED['granite_grey']
    grains = n // 2
    ix, iy = np.floor(u * grains).astype(np.int64), np.floor(v * grains).astype(np.int64)
    pick = hash01(seed, ix, iy)
    rgb = np.empty((*u.shape, 3), dtype=np.float64)
    rgb[...] = (0.50, 0.50, 0.51)
    lower = 0.0
    for tone, fraction in ((0.28, 0.18), (0.55, 0.22), (0.72, 0.12)):
        upper = lower + fraction
        rgb[(pick >= lower) & (pick < upper)] = (tone, tone, tone)
        lower = upper
    rgb[(pick >= lower) & (pick < lower + 0.06)] = (0.66, 0.54, 0.52)
    return tuple(rgb[..., channel] for channel in range(3))


def tex_gilt(n):
    u, v = _grid(n)
    seed = TEX_SEED['gilt']
    ix, iy = np.floor(u * 4).astype(np.int64), np.floor(v * 4).astype(np.int64)
    leaf = 0.02 * (2.0 * hash01(seed, ix, iy, 31) - 1.0)
    detail = 0.015 * fbm(u, v, (8, 16), seed)
    return tuple(channel + leaf + detail for channel in GILT_BASE)


def _srgb_encode(lin):
    """The sRGB OETF: the stored plate bytes from the generator's LINEAR values. The
    plafond's ruling authored its constants as linear (the dome 0.62→0.32 is the linear
    albedo); the house writer takes stored bytes, so the conversion happens here — the
    v1 stored-space reading halved the ceiling's albedo and collapsed the room's bounce
    (the black-facet columns class, 2026-11-21)."""
    lin = np.clip(lin, 0.0, 1.0)
    return np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * np.power(lin, 1.0 / 2.4) - 0.055)


# The owner-supplied painting (an AI-generated original composition; the charter's
# painted-likeness distinction — picture content, not figures). Absent = the procedural
# sky. The loader normalizes its mean linear luminance to PLATE_TARGET_MEAN_L, so the
# swap never re-bakes (the albedo-free lightmap keeps the bounce valid within ±5 %).
PLAFOND_ART_PATH = Path(__file__).resolve().parent / 'plafond-art.png'
PLATE_TARGET_MEAN_L = 0.41  # the v3 plate's measured linear mean (2026-11-21) — the bounce-

# The round-29 Neva backcloth: the painted view plate on the window panes (the plafond
# round's own mechanism — an original composition, no re-bake, zero JS). The plate is
# rasterized by tools/bpy/neva-raster.mjs from tools/bpy/neva-art.svg (generated by
# neva-art-gen.mjs from tools/jordan-windows.json); the pane's wall-space UV law is
# NEVA_V below, shared by all three. Absent png = the pale procedural card.
NEVA_ART_PATH = Path(__file__).resolve().parent / 'neva-art.png'
NEVA_V = (2.0, 18.0)  # the plate's v law: v = (y − 2)/16, the full plate spans y 2..18


def _neva_art_pixels(n):
    """The painted backcloth: the rasterizer's stored sRGB bytes passed through
    UNCHANGED — the mean pin (0.80 ± 0.05 target) lives in neva-raster.mjs, and the
    pane's bake emission is untouched, so the plafond's bounce normalization does not
    apply here. Returns stored-space (r, g, b); write_texture encodes them as-is."""
    img = bpy.data.images.load(str(NEVA_ART_PATH), check_existing=False)
    width, height = img.size
    if (width, height) != (n, n):
        img.scale(n, n)
    px = np.empty(n * n * img.channels, dtype=np.float32)
    img.pixels.foreach_get(px)
    channels = img.channels
    bpy.data.images.remove(img)
    rgb = px.reshape(n, n, channels)[:, :, :3].astype(np.float64)
    return rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]


def tex_neva(n):
    """The Neva backcloth plate (the round-29 design §2). With the painted composition
    present it IS the picture, stored bytes untouched. Without it: the pale flat card —
    the pre-round read (the pane's emission still carries the window light)."""
    if NEVA_ART_PATH.exists():
        return _neva_art_pixels(n)
    c = np.full((n, n), 0.85)
    return c, c, c


def _plafond_art_pixels(n):
    """The owner-supplied painting: stored bytes → linear, aspect-corrected to the field
    (the generated art composes for the world; the plate stretches u), the mean linear
    luminance normalized to PLATE_TARGET_MEAN_L (the bounce-preservation pin — the swap
    never re-bakes). Returns (r, g, b) LINEAR, the tail's own processing still applies."""
    img = bpy.data.images.load(str(PLAFOND_ART_PATH), check_existing=False)
    width, height = img.size
    if (width, height) != (n, n):
        img.scale(n, n)
    px = np.empty(n * n * img.channels, dtype=np.float32)
    img.pixels.foreach_get(px)
    channels = img.channels
    bpy.data.images.remove(img)
    rgb = px.reshape(n, n, channels)[:, :, :3].astype(np.float64)
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    lum = 0.2126 * lin[:, :, 0] + 0.7152 * lin[:, :, 1] + 0.0722 * lin[:, :, 2]
    gain = PLATE_TARGET_MEAN_L / max(float(lum.mean()), 1e-6)
    return lin[:, :, 0] * gain, lin[:, :, 1] * gain, lin[:, :, 2] * gain


def tex_plafond(n):
    """The open-sky plafond plate (S1, linear-space v2). With the owner's painting
    present (tools/bpy/plafond-art.png) it IS the picture — the border/grain/cap tail
    still applies. Without it: the procedural painted sky — the radial dome + the
    sunburst + the metre-isotropic fBm cumulus (two banks) + the centre-facing lit rims
    + the painted-architecture ring + the aspect-true border. All math in LINEAR (the
    ruling's space); the stored sRGB conversion at the very end. The cap keeps every
    linear channel ≤ PLATE_MAX before the encode."""
    _, _, fx0, fx1, fz0, fz1 = plafond_bounds()
    fw, fd = fx1 - fx0, fz1 - fz0
    seed = TEX_SEED['plafond']
    u, v = _grid(n)
    ix = np.arange(n, dtype=np.int64)[None, :]
    iy = np.arange(n, dtype=np.int64)[:, None]
    ixg = np.broadcast_to(ix, u.shape)
    iyg = np.broadcast_to(iy, u.shape)
    bu, bv = BORDER_M / fw, BORDER_M / fd
    in_band = (u < bu) | (u > 1.0 - bu) | (v < bv) | (v > 1.0 - bv)

    if PLAFOND_ART_PATH.exists():
        r, g, b = _plafond_art_pixels(n)
    else:
        xm, ym = u * fw, v * fd

        # The radii: rn clipped to the half-extent (the dome), rne the true elliptical
        # one (the corners reach √2 — the painted-architecture ring lives there).
        dx, dy = 2.0 * u - 1.0, 2.0 * v - 1.0
        rne = np.hypot(dx, dy)
        rn = np.minimum(1.0, rne)
        ang = np.arctan2(dy, dx)

        # The sky dome + the hue ramp (linear 0.62 centre → 0.32 edge, luminance-normalised).
        t = quintic(np.clip(rn ** 1.2, 0.0, 1.0))
        sky_r = 0.86 + (0.36 - 0.86) * t
        sky_g = 0.80 + (0.42 - 0.80) * t
        sky_b = 0.66 + (0.55 - 0.66) * t
        dome = 0.62 - 0.30 * t
        lum = 0.2126 * sky_r + 0.7152 * sky_g + 0.0722 * sky_b
        s_r, s_g, s_b = sky_r * dome / lum, sky_g * dome / lum, sky_b * dome / lum

        # The sunburst: a white-hot core + 22 soft rays whose gains vary by the plate
        # hash (the burst reads hand-painted, not compass-drawn).
        core = np.exp(-(rn / 0.16) ** 2) * 0.85
        ray_period = 22
        ray_phase = (ang / (2.0 * math.pi) * ray_period) % 1.0
        ray_k = 0.65 + 0.35 * hash01(seed, np.arange(ray_period, dtype=np.int64), np.int64(0), 31)
        ray_gain = ray_k[np.floor(ang / (2.0 * math.pi) * ray_period).astype(np.int64) % ray_period]
        ray_wedge = quintic(np.clip(1.0 - np.abs(ray_phase - 0.5) * 2.0 / 0.55, 0.0, 1.0))
        ray = ray_wedge * ray_gain * (1.0 - rn) ** 1.5 * 0.30
        burst = core + ray

        # The cumulus: 4 octaves, lacunarity 2, gain 0.5, metre coords at 3.476 m per
        # base lattice step; the one-shot lattice (no tile wrap). Percentile stretch,
        # the centre thinning, the mask, the shaded bodies, the centre-facing rims.
        base = 3.476
        f = fbm(u * fw / base, v * fd / base, (1, 2, 4, 8), seed, wrap=False)
        p2, p98 = np.percentile(f, 2.0), np.percentile(f, 98.0)
        f01 = np.clip((f - p2) / (p98 - p2), 0.0, 1.0) * 0.90 + 0.05
        f01 = f01 - 0.12 * (1.0 - quintic(np.clip(rn / 0.6, 0.0, 1.0)))
        m = quintic(np.clip((f01 - 0.45) / 0.25, 0.0, 1.0))
        # The second, lower cloud bank rising toward the edges (the depth layer).
        f2 = value_noise(u * fw / 9.0, v * fd / 9.0, 1, seed + 7, 0, wrap=False)
        p2b, p98b = np.percentile(f2, 5.0), np.percentile(f2, 95.0)
        f2n = np.clip((f2 - p2b) / (p98b - p2b), 0.0, 1.0)
        m2 = quintic(np.clip((f2n - 0.35) / 0.30, 0.0, 1.0)) \
            * quintic(np.clip((rn - 0.45) / 0.25, 0.0, 1.0)) * 0.6
        body_r = s_r - (0.15 * m) * (s_r / lum) + 0.03 * m
        body_g = s_g - (0.15 * m) * (s_g / lum)
        body_b = s_b - (0.15 * m) * (s_b / lum) + 0.05 * m
        gv, gu = np.gradient(f01)
        # The gradient is per-PIXEL; the centre direction is in METRES — scale the
        # derivatives to metres before the dot (the review: a pixel's x-span runs
        # ~1.34× a z-span, so the raw mix lit tangent diagonal edges).
        gu = gu * (n / fw)
        gv = gv * (n / fd)
        norm = np.maximum(np.hypot(gu, gv), 1e-12)
        dcx, dcy = fw / 2 - xm, fd / 2 - ym
        dcl = np.maximum(np.hypot(dcx, dcy), 1e-12)
        facing = np.clip(-(gu * dcx + gv * dcy) / (norm * dcl), 0.0, 1.0)
        rb = m * (1.0 - quintic(np.clip((f01 - 0.55) / 0.14, 0.0, 1.0)))
        rim_gain = (rb + 0.6 * m2) * facing * (1.0 - 0.5 * t)
        sky_r = body_r + 0.18 * rim_gain + burst
        sky_g = body_g + 0.13 * rim_gain + burst * 0.95
        sky_b = body_b + 0.06 * rim_gain + burst * 0.85

        # The fresco glaze: a very low-frequency luminance drift (the hand's uneven hand).
        gl = value_noise(u * fw / 5.0, v * fd / 5.0, 1, seed + 11, 0, wrap=False)
        sky_r = sky_r * (1.0 + 0.05 * gl)
        sky_g = sky_g * (1.0 + 0.05 * gl)
        sky_b = sky_b * (1.0 + 0.05 * gl)

        # The painted-architecture ring: the illusionistic opening's zone 0.15..1.40 m
        # inside the picture edge — the warm balustrade band whose posts run ALONG the
        # nearest edge (18 on the z-edges, 24 on the x-edges), with shadow lines at both
        # its boundaries; the corners double-dose where the strips cross (cartouches).
        d_left = (u - bu) * fw
        d_right = ((1.0 - bu) - u) * fw
        d_bottom = (v - bv) * fd
        d_top = ((1.0 - bv) - v) * fd
        dmin = np.minimum(np.minimum(d_left, d_right), np.minimum(d_bottom, d_top))
        ring_m = quintic(np.clip((-dmin - 0.15) / 0.18, 0.0, 1.0)) \
            * quintic(np.clip((1.40 + dmin) / 0.35, 0.0, 1.0))
        on_h = (d_left <= d_bottom) & (d_left <= d_top) & (d_left <= d_right) \
            | (d_right < d_bottom) & (d_right <= d_top) & (d_right <= d_left)
        along_m = np.where(on_h, (v - bv) * fd, (u - bu) * fw)
        pitch_m = np.where(on_h, fd / 18.0, fw / 24.0)
        post_phase = (along_m / pitch_m) % 1.0
        post = quintic(np.clip(1.0 - np.abs(post_phase - 0.5) * 2.0 / 0.35, 0.0, 1.0))
        line_in = quintic(np.clip(1.0 - np.abs(-dmin - 0.15) / 0.025, 0.0, 1.0))
        line_out = quintic(np.clip(1.0 - np.abs(-dmin - 1.40) / 0.025, 0.0, 1.0))
        ring_lum = 0.42 + 0.14 * post - 0.28 * (line_in + line_out) * ring_m
        arch_r, arch_g, arch_b = 1.25 * ring_lum, 1.0 * ring_lum, 0.70 * ring_lum
        r = sky_r * (1.0 - ring_m) + arch_r * ring_m
        g = sky_g * (1.0 - ring_m) + arch_g * ring_m
        b = sky_b * (1.0 - ring_m) + arch_b * ring_m

    # The painted border: ochre body, a darker shadow line, a light bead — measured
    # outward from the picture edge in metres (aspect-true).
    dist = np.maximum(np.maximum(bu - u, u - (1.0 - bu)) * fw,
                      np.maximum(bv - v, v - (1.0 - bv)) * fd)
    bead = in_band & (dist <= 0.08)
    shadow = in_band & (dist > 0.08) & (dist <= 0.24)
    o_r, o_g, o_b = 0.55, 0.42, 0.22
    r = np.where(bead, o_r * 1.25, np.where(shadow, o_r * 0.70, np.where(in_band, o_r, r)))
    g = np.where(bead, o_g * 1.25, np.where(shadow, o_g * 0.70, np.where(in_band, o_g, g)))
    b = np.where(bead, o_b * 1.25, np.where(shadow, o_b * 0.70, np.where(in_band, o_b, b)))

    # The canvas grain (linear), then the cap, then the stored conversion.
    g01 = hash01(seed, ixg, iyg)
    r = r + 0.02 * (g01 * 2.0 - 1.0)
    g = g + 0.02 * (g01 * 2.0 - 1.0)
    b = b + 0.02 * (g01 * 2.0 - 1.0)
    r, g, b = np.minimum(r, PLATE_MAX), np.minimum(g, PLATE_MAX), np.minimum(b, PLATE_MAX)
    assert max(np.max(r), np.max(g), np.max(b)) <= PLATE_MAX + 1e-12
    return _srgb_encode(r), _srgb_encode(g), _srgb_encode(b)


TEX_FN = {'marble_floor': tex_marble_floor, 'plaster_warm': tex_plaster_warm, 'granite_grey': tex_granite_grey, 'gilt': tex_gilt,
          'plafond': tex_plafond, 'neva': tex_neva}


def write_texture(name, size, tex_dir):
    rgb = np.stack(TEX_FN[name](size), axis=-1)
    encoded = np.floor(np.clip(rgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)

    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF))

    # Write encoded bytes directly: passing them through Blender's linear image
    # buffer and saving as sRGB would risk applying a second transfer function.
    # PNG stores its top row first; the generator's row zero is UV v=0.
    scanlines = b''.join(b'\x00' + row.tobytes() for row in encoded[::-1])
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'sRGB', b'\x00') + chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b''))
    path = tex_dir / f'{name}.png'
    path.write_bytes(png)
    img = bpy.data.images.load(str(path), check_existing=False)
    img.name = name
    img.colorspace_settings.name = 'sRGB'
    return img


def make_material(name, image, roughness, emission=None, metallic=0.0, base_color=None,
                  extension='REPEAT', emission_from_image=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    if image is None and base_color is not None:
        # The untextured route (the pane's dark-glass law): a constant base colour, no
        # image node — the glb slot count and the texture lock are untouched because the
        # material's ALBEDO TEXTURE is what disappears, and no other material loses its
        # reference (plaster_warm stays used by shell/portal/sconce/pilaster/cornice).
        bsdf.inputs['Base Color'].default_value = (*base_color, 1.0)
    else:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = image
        tex.interpolation = 'Linear'
        # 'REPEAT' tiles (the committed metre-repeat plates); 'CLIP' clamps — the glTF
        # exporter maps it to CLAMP_TO_EDGE, the one-shot plafond plate's sampler law.
        tex.extension = extension
        uvn = nt.nodes.new('ShaderNodeUVMap')
        uvn.uv_map = 'uv'
        nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission is not None:
        rgb, strength = emission
        if emission_from_image and image is not None:
            # The round-29 Neva backcloth: the plate modulates the emission too — the
            # pane glows with the picture (a window's daylight read); the constant tint
            # would wash it back to a white card. The exporter emits this as
            # emissiveTexture with a white emissiveFactor; the strength below still
            # rides KHR_materials_emissive_strength (the committed pane gate 3.0).
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        else:
            bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat


def marble_planar_uv(pts, anchor=None):
    n = newell(pts)
    if abs(n[1]) >= max(abs(n[0]), abs(n[2])):
        x0, z0 = anchor if anchor is not None else (min(p[0] for p in pts), min(p[2] for p in pts))
        return [((p[0] - x0) / 2.6, (p[2] - z0) / 2.4) for p in pts]
    projected = surface_projection(pts)
    u0, v0 = min(p[0] for p in projected), min(p[1] for p in projected)
    return [((u - u0) / 2.6, (v - v0) / 2.4) for u, v in projected]


def floor_variant_uv(ix, iz):
    d = int(tex_hash(TEX_SEED['marble_floor'], ix, iz, 101)) % 8
    result = []
    for u, v in ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)):
        if d >= 4:
            u = 1.0 - u
        for _ in range(d % 4):
            u, v = 1.0 - v, u
        result.append((u, v))
    return result


def tread_uv(pts, index):
    seed = TEX_SEED['marble_floor']
    q = int(tex_hash(seed, index)) % 4
    projected = surface_projection(pts)
    us, vs = [p[0] for p in projected], [p[1] for p in projected]
    # The 1.6 m cross-flight edge is the long coordinate even on flight 2.
    if max(vs) - min(vs) > max(us) - min(us):
        projected = [(v, u) for u, v in projected]
    u0, v0 = min(p[0] for p in projected), min(p[1] for p in projected)
    width = max(p[0] for p in projected) - u0
    depth = max(p[1] for p in projected) - v0
    if width > 1.6 + 1e-6 or depth > 1.6 + 1e-6:
        raise RuntimeError('tread/riser mapping escaped its 1.6 m slab quadrant')
    band = depth / 1.6 * 252.0
    offset = 2.0 + float(hash01(seed, index + 97)) * max(0.0, 252.0 - band)
    mirror = bool(int(tex_hash(seed, index + 193)) & 1)
    # Stay below 254 even after conversion to the mesh's float32 UV storage.
    end = float(np.nextafter(np.float32(254.0), np.float32(2.0)))
    result = []
    for u, v in projected:
        pu = min(end, 2.0 + (u - u0) / 1.6 * 252.0)
        if mirror:
            pu = min(end, 256.0 - pu)
        pv = min(end, offset + (v - v0) / 1.6 * 252.0)
        result.append(((q % 2 * 256 + pu) / 512.0, (q // 2 * 256 + pv) / 512.0))
    return result


def window_bays():
    return list(WIN_X)


def plane_point(axis, u, v, c):
    return (u, v, c) if axis == 'z' else (c, v, u)


def wall_grid(b, axis, const, u_edges, v_edges, holes, mat, ref):
    us, vs = field_edges(u_edges), field_edges(v_edges)
    for u0, u1 in zip(us, us[1:]):
        for v0, v1 in zip(vs, vs[1:]):
            if any(h[0] - 1e-7 <= u0 and u1 <= h[1] + 1e-7 and h[2] - 1e-7 <= v0 and v1 <= h[3] + 1e-7 for h in holes):
                continue
            b.add([plane_point(axis, u0, v0, const), plane_point(axis, u1, v0, const),
                   plane_point(axis, u1, v1, const), plane_point(axis, u0, v1, const)], mat, ref)


def add_reveals(b, axis, c0, c1, u0, u1, v0, v1, mat):
    def p(u, v, c):
        return plane_point(axis, u, v, c)

    ref = p((u0 + u1) / 2, (v0 + v1) / 2, (c0 + c1) / 2)
    b.add([p(u0, v0, c0), p(u0, v1, c0), p(u0, v1, c1), p(u0, v0, c1)], mat, ref)
    b.add([p(u1, v0, c0), p(u1, v1, c0), p(u1, v1, c1), p(u1, v0, c1)], mat, ref)
    b.add([p(u0, v0, c0), p(u1, v0, c0), p(u1, v0, c1), p(u0, v0, c1)], mat, ref)
    b.add([p(u0, v1, c0), p(u1, v1, c0), p(u1, v1, c1), p(u0, v1, c1)], mat, ref)


def build_floor(b):
    nx, nz = FLOOR_DIV
    xs = [X_W + (X_E - X_W) * i / nx for i in range(nx + 1)]
    zs = [Z_N + (Z_S - Z_N) * j / nz for j in range(nz + 1)]
    for i in range(nx):
        for j in range(nz):
            b.add([(xs[i], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j + 1]), (xs[i], 0.0, zs[j + 1])],
                  MAT_MARBLE, HALL_REF, uv=floor_variant_uv(i, j))


def build_north_wall(shell, pane):
    holes = [r6((cx - WIN_W / 2, cx + WIN_W / 2, sill, head)) for cx in window_bays() for sill, head in WIN_TIERS]
    us = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    vs = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(shell, 'z', Z_N, us, vs, holes, MAT_PLASTER, HALL_REF)
    zb = Z_N - WIN_RECESS

    def neva_wall_uv(u0, u1, v0, v1):
        """The round-29 Neva backcloth's wall-space mapping (the pane's one-shot plate).
        The STORED glTF law is u (x−66)/26, v (y−2)/16 — the transport script
        tools/gltf/pane-neva.mjs wrote exactly those stored values and is the parity
        reference for any rebuild. The BLENDER-space v below is (18−y)/16 because the
        glTF exporter flips V on export (the glTF top-left UV origin; u is never
        flipped). Shared with neva-art-gen.mjs's composition (px_v = (1 − v_stored) ·
        1024). The metre-repeat law is exempted here exactly like the plafond's field."""
        def w(x, y):
            u = (x - X_W) / (X_E - X_W)
            v_stored = (y - NEVA_V[0]) / (NEVA_V[1] - NEVA_V[0])
            return (u, 1.0 - v_stored)

        return [w(u0, v0), w(u1, v0), w(u1, v1), w(u0, v1)]

    for u0, u1, v0, v1 in holes:
        add_reveals(shell, 'z', Z_N, zb, u0, u1, v0, v1, MAT_PLASTER)
        pane.add([(u0, v0, zb), (u1, v0, zb), (u1, v1, zb), (u0, v1, zb)], 0, HALL_REF,
                 uv=neva_wall_uv(u0, u1, v0, v1))


def add_porthole(b, cx, cy):
    z0, z1 = Z_S, Z_S + PORT_DEPTH
    ring, sq = [], []
    for k in range(PORT_SEG):
        a = 2 * math.pi * k / PORT_SEG
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
    us = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    vs = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(b, 'z', Z_S, us, vs, holes, MAT_PLASTER, HALL_REF)
    zb = Z_S + DOOR_RECESS
    add_reveals(b, 'z', Z_S, zb, *door, MAT_PLASTER)
    b.add([(door[0], door[2], zb), (door[1], door[2], zb), (door[1], door[3], zb), (door[0], door[3], zb)],
          MAT_PLASTER, HALL_REF)
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
        pts.append((yc + radius * math.cos(a), zc + radius * math.sin(a)))
    pts[0], pts[-1] = (VAULT_SPRING_Y, Z_N), (VAULT_SPRING_Y, Z_S)
    return pts


def vault_arc():
    """The profile's circle, shared by the plafond frame's radial drop law (the ruling:
    n = ((yc − y), (zc − z)) / radius — unit on the arc, normalized off it)."""
    half = (Z_S - Z_N) / 2
    rise = Y_CROWN - VAULT_SPRING_Y
    radius = (half * half + rise * rise) / (2 * rise)
    return (Y_CROWN - radius), (Z_N + Z_S) / 2, radius


def plafond_bounds():
    """The field's bounds, computed from the bay arrays — never literals. Returns
    (prof, xs, fx0, fx1, fz0, fz1)."""
    prof = vault_profile()
    xs = [X_W + (X_E - X_W) * i / VAULT_NX for i in range(VAULT_NX + 1)]
    fx0, fx1 = xs[PLAFOND_BAYS[0][0]], xs[PLAFOND_BAYS[0][1]]
    fz0, fz1 = prof[PLAFOND_BAYS[1][0]][1], prof[PLAFOND_BAYS[1][1]][1]
    return prof, xs, fx0, fx1, fz0, fz1


def plafond_uv(p, fx0, fx1, fz0, fz1):
    """The field-planar albedo mapping: (x, z) → 0..1 over the field bounds (S2)."""
    return ((p[0] - fx0) / (fx1 - fx0), (p[2] - fz0) / (fz1 - fz0))


def build_end_walls(b):
    prof = vault_profile()
    zc = (Z_N + Z_S) / 2
    nu, nv = END_WALL_DIV
    us = edges([Z_N + (Z_S - Z_N) * i / nu for i in range(nu + 1)])
    vs = edges([Y_FLOOR + (VAULT_SPRING_Y - Y_FLOOR) * j / nv for j in range(nv + 1)])
    for x in (X_W, X_E):
        wall_grid(b, 'x', x, us, vs, [], MAT_PLASTER, HALL_REF)
        for k in range(VAULT_NZ):
            b.add([(x, VAULT_SPRING_Y, zc), (x, prof[k][0], prof[k][1]), (x, prof[k + 1][0], prof[k + 1][1])],
                  MAT_PLASTER, HALL_REF)


def build_vault(b, field=None, frame=None):
    prof, xs, fx0, fx1, fz0, fz1 = plafond_bounds()
    t = COFFER_INSET
    for i in range(VAULT_NX):
        for k in range(VAULT_NZ):
            (ya, za), (yb, zb) = prof[k], prof[k + 1]
            p00, p10 = (xs[i], ya, za), (xs[i + 1], ya, za)
            p11, p01 = (xs[i + 1], yb, zb), (xs[i], yb, zb)
            if field is not None and PLAFOND_BAYS[0][0] <= i < PLAFOND_BAYS[0][1] \
                    and PLAFOND_BAYS[1][0] <= k < PLAFOND_BAYS[1][1]:
                # The painted field's own bay: one smooth quad on the vault surface, the
                # field-planar albedo mapping (S2); no coffer. The auto-orient via
                # HALL_REF faces it down into the room, like every vault face.
                field.add([p00, p10, p11, p01], MAT_PLAFOND, HALL_REF,
                          uv=[plafond_uv(p, fx0, fx1, fz0, fz1) for p in (p00, p10, p11, p01)],
                          smooth_group='plafond')
                continue
            n = unit(newell([p00, p10, p11, p01]))
            if v_dot(n, v_sub(HALL_REF, p00)) > 0:
                n = v_scale(n, -1.0)
            q00 = bilerp(p00, p10, p11, p01, t, t)
            q10 = bilerp(p00, p10, p11, p01, 1 - t, t)
            q11 = bilerp(p00, p10, p11, p01, 1 - t, 1 - t)
            q01 = bilerp(p00, p10, p11, p01, t, 1 - t)
            r00, r10, r11, r01 = (v_add(q, v_scale(n, COFFER_DEPTH)) for q in (q00, q10, q11, q01))
            rc = v_add(bilerp(p00, p10, p11, p01, 0.5, 0.5), v_scale(n, COFFER_DEPTH / 2))
            for quad in ([p00, p10, q10, q00], [p10, p11, q11, q10], [p11, p01, q01, q11], [p01, p00, q00, q01]):
                b.add(quad, MAT_PLASTER, HALL_REF, smooth_group='vault')
            for quad in ([q00, q10, r10, r00], [q10, q11, r11, r10], [q11, q01, r01, r11], [q01, q00, r00, r01]):
                b.add(quad, MAT_PLASTER, rc, smooth_group='vault')
            b.add([r00, r10, r11, r01], MAT_PLASTER, HALL_REF, smooth_group='vault')
    if frame is not None:
        build_plafond_frame(frame)


def _frame_face(b, corners, outward, group):
    """One frame face with an explicit reference point so the auto-orient keeps the
    desired normal: ref = the face centroid stepped out along `outward`."""
    cx = sum(p[0] for p in corners) / 4
    cy = sum(p[1] for p in corners) / 4
    cz = sum(p[2] for p in corners) / 4
    ref = (cx + outward[0] * 0.5, cy + outward[1] * 0.5, cz + outward[2] * 0.5)
    b.add(corners, MAT_FRAME_GILT, ref, smooth_group=group)


def build_plafond_frame(b):
    """The gilt stucco ring on the field boundary (S3): box bars w along-surface × d
    radial, one island (smooth group) per run; the x-bars own the corners (extended w/2
    each way + the end caps), the z-bars trim w/2 along their end tangents and butt the
    x-bars' inner faces. 10 x-bar segments × 3 faces + 8 z-bar segments × 3 faces + 4
    end caps = 58 quads."""
    w, d = PLAFOND_FRAME
    w2 = w / 2
    prof, xs, fx0, fx1, fz0, fz1 = plafond_bounds()
    yc, zc, _ = vault_arc()

    def drop(p):
        ny, nz = yc - p[1], zc - p[2]
        length = math.hypot(ny, nz)
        return (p[0], p[1] + d * ny / length, p[2] + d * nz / length)

    radius = vault_arc()[2]

    def arc_y(z):
        return yc + math.sqrt(radius * radius - (z - zc) * (z - zc))

    def face_outward(nvec):
        return (0.0, nvec[0], nvec[1])

    # The x-bars: south z=fz0 (the field toward +z), north z=fz1 (the field toward −z).
    for z_line, inward, group in ((fz0, 1.0, 'fr_s'), (fz1, -1.0, 'fr_n')):
        y_line, y_in, y_out = arc_y(z_line), arc_y(z_line + inward * w2), arc_y(z_line - inward * w2)
        zin, zout = z_line + inward * w2, z_line - inward * w2
        xa, xb = fx0 - w2, fx1 + w2  # the corner square belongs to the x-bar
        edges = [xa] + [xs[i] for i in range(PLAFOND_BAYS[0][0] + 1, PLAFOND_BAYS[0][1])] + [xb]
        for sa, sb in zip(edges, edges[1:]):
            inner = [(sa, y_in, zin), (sb, y_in, zin)]
            outer = [(sa, y_out, zout), (sb, y_out, zout)]
            _frame_face(b, inner + [drop(inner[1]), drop(inner[0])], (0.0, 0.0, inward), group)
            _frame_face(b, outer + [drop(outer[1]), drop(outer[0])], (0.0, 0.0, -inward), group)
            _frame_face(b, [drop(inner[0]), drop(inner[1]), drop(outer[1]), drop(outer[0])],
                        face_outward((yc - y_line, zc - z_line)), group)
        # The end caps close the bar's cross-section at both outer ends.
        for cap_x, cap_out in ((xa, (-1.0, 0.0, 0.0)), (xb, (1.0, 0.0, 0.0))):
            _frame_face(b, [(cap_x, y_in, zin), (cap_x, y_out, zout),
                            drop((cap_x, y_out, zout)), drop((cap_x, y_in, zin))], cap_out, group)

    # The z-bars: west x=fx0 (the field toward +x), east x=fx1 (the field toward −x);
    # the runs follow the profile CHORDS (the field's own edge), trimmed w/2 at their
    # ends so they butt the x-bars' inner faces.
    for x_line, inward, group in ((fx0, 1.0, 'fr_w'), (fx1, -1.0, 'fr_e')):
        line = [prof[k] for k in range(PLAFOND_BAYS[1][0], PLAFOND_BAYS[1][1] + 1)]
        # Trim w/2 along each end's own chord direction (2D in the profile plane; the
        # committed vector helpers are 3-component).
        (y0, z0), (y1, z1) = line[0], line[1]
        l0 = math.hypot(y1 - y0, z1 - z0)
        v0 = (x_line, y0 + (y1 - y0) * w2 / l0, z0 + (z1 - z0) * w2 / l0)
        (yN, zN), (yM, zM) = line[-1], line[-2]
        lN = math.hypot(yN - yM, zN - zM)
        vN = (x_line, yN - (yN - yM) * w2 / lN, zN - (zN - zM) * w2 / lN)
        run = [v0] + [(x_line, p[0], p[1]) for p in line[1:-1]] + [vN]
        x_in, x_out = x_line + inward * w2, x_line - inward * w2
        for pa, pb in zip(run, run[1:]):
            a_in, b_in = (x_in, pa[1], pa[2]), (x_in, pb[1], pb[2])
            a_out, b_out = (x_out, pa[1], pa[2]), (x_out, pb[1], pb[2])
            _frame_face(b, [a_in, b_in, drop(b_in), drop(a_in)], (inward, 0.0, 0.0), group)
            _frame_face(b, [a_out, b_out, drop(b_out), drop(a_out)], (-inward, 0.0, 0.0), group)
            _frame_face(b, [drop(a_in), drop(b_in), drop(b_out), drop(a_out)],
                        face_outward(((yc - (pa[1] + pb[1]) / 2), (zc - (pa[2] + pb[2]) / 2))), group)


def build_vestibule(b):
    (x0, x1), (z0, z1), h = VEST_X, VEST_Z, VEST_H
    xm, zm = (x0 + x1) / 2, (z0 + z1) / 2
    for x in (x0, x1):
        for side in (-1.0, 1.0):
            wall_grid(b, 'x', x, [z0, z1], [0.0, h], [], MAT_PLASTER, (x + side, 1.5, zm))
    opening = [r6((DOOR_X[0], DOOR_X[1], Y_FLOOR, DOOR_H))]
    us = edges([x0, x1, DOOR_X[0], DOOR_X[1]])
    vs = edges([Y_FLOOR, DOOR_H, h])
    wall_grid(b, 'z', z0, us, vs, opening, MAT_PLASTER, (xm, 1.5, z0 - 1.0))
    wall_grid(b, 'z', z0, us, vs, opening, MAT_PLASTER, (xm, 1.5, z0 + 1.0))
    xs, zs = field_edges([x0, x1]), field_edges([z0, z1])
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            quad = [(xa, h, za), (xb, h, za), (xb, h, zb), (xa, h, zb)]
            b.add(quad, MAT_PLASTER, (xm, 1.5, zm))
            b.add(quad, MAT_PLASTER, (xm, h + 1.0, zm))


def kit_centre(pts):
    return tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))


def kit_solid(b, faces, mat=KIT_BASE, uv_fn=None):
    centre = kit_centre([p for face in faces for p in face])
    for face in faces:
        ref = v_sub(v_scale(kit_centre(face), 2), centre)
        b.add(face, mat, ref, uv=uv_fn(face) if uv_fn else None)


def kit_loft(b, a, c, mat=KIT_BASE, uv_fn=None):
    faces = [a, c]
    for i in range(len(a)):
        j = (i + 1) % len(a)
        faces.append([a[i], a[j], c[j], c[i]])
    kit_solid(b, faces, mat, uv_fn)


def kit_box(b, x, y, z, mat=KIT_BASE, uv_fn=None):
    rings = [[(x[0], h, z[0]), (x[1], h, z[0]), (x[1], h, z[1]), (x[0], h, z[1])] for h in y]
    kit_loft(b, *rings, mat, uv_fn)


def kit_circle(cx, cz, radius, y, segments):
    return [(cx + radius * math.cos(2 * math.pi * k / segments), y, cz + radius * math.sin(2 * math.pi * k / segments))
            for k in range(segments)]


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
    return (min([f['band'][0]] + [c - radius for c in centres]), max([f['band'][1]] + [c + radius for c in centres]))


def kit_open_box(b, x, y, z, mat=KIT_BASE, hide=(), uv_fn=None):
    """Do not spend geometry or lightmap cells on named buried faces."""
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
            b.add(pts, mat, ref, uv=uv_fn(pts) if uv_fn else None)


def build_landing_slab(b, x, y, z, flight, index):
    axis = flight['axis']
    front = 'south' if axis == 'z' else 'west'
    anchor = (x[0], z[0])
    kit_open_box(b, x, (y - SLAB_T, y), z, hide=(front,), uv_fn=lambda pts: marble_planar_uv(pts, anchor))
    band = x if axis == 'z' else z
    plane = z[1] if axis == 'z' else x[0]
    us = edges([*band, *flight['band']])
    ys = [y - SLAB_T, y - RISE, y]
    ref = plane_point(axis, sum(band) / 2, y - SLAB_T / 2, plane + (1.0 if axis == 'z' else -1.0))
    for u0, u1 in zip(us, us[1:]):
        for y0, y1 in zip(ys, ys[1:]):
            pts = [plane_point(axis, u0, y0, plane), plane_point(axis, u1, y0, plane),
                   plane_point(axis, u1, y1, plane), plane_point(axis, u0, y1, plane)]
            final_riser = (abs(y1 - y) < 1e-7 and u0 >= flight['band'][0] - 1e-7 and u1 <= flight['band'][1] + 1e-7)
            uv = tread_uv(pts, index) if final_riser else marble_planar_uv(pts)
            b.add(pts, KIT_BASE, ref, uv=uv)


def build_stairs(b):
    for fi, f in enumerate(FLIGHTS):
        for i in range(TREADS):
            a = f['a0'] + f['d'] * i * GOING
            span = sorted((a, a + f['d'] * GOING))
            y = (f['y'][0] + i * RISE, f['y'][0] + (i + 1) * RISE)
            x, z = (span, f['band']) if f['axis'] == 'x' else (f['band'], span)
            index = fi * RISERS + i
            kit_box(b, x, y, z, uv_fn=lambda pts, index=index: tread_uv(pts, index))
        band = stringer_band(f)
        rings = []
        for a, y in ((f['a0'], f['y'][0]), (f['a0'] + f['d'] * RUN, f['y'][1] - RISE)):
            rings.append([plane_point(f['axis'], u, h, a)
                          for u, h in ((band[0], y), (band[1], y), (band[1], y - STRINGER_T), (band[0], y - STRINGER_T))])
        kit_loft(b, *rings)
    build_landing_slab(b, MEZZ_X, MEZZ_Y, MEZZ_Z, FLIGHTS[0], TREADS)
    build_landing_slab(b, LAND_X, LANDING_Y, LAND_Z, FLIGHTS[1], RISERS + TREADS)


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
                  for s, y in ((-1, RAIL_TOP - height), (1, RAIL_TOP - height), (1, RAIL_TOP), (-1, RAIL_TOP))]
                 for p, side in zip(path, sides)]
        for i, (a, c) in enumerate(zip(path, path[1:])):
            if (a[0], a[2]) != (c[0], c[2]):
                kit_loft(b, rings[i], rings[i + 1])
                continue
            # A vertical sweep of a vertical section degenerates; use a solid return.
            side = sides[i]
            along = v_scale(unit((side[2], 0.0, -side[0])), height / 2)
            corners = [v_add(a, v_add(v_scale(side, s), v_scale(along, t)))
                       for s, t in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            lower = [(p[0], a[1] + RAIL_TOP - height, p[2]) for p in corners]
            upper = [(p[0], c[1] + RAIL_TOP, p[2]) for p in corners]
            kit_loft(b, lower, upper)


def build_baluster(b):
    kit_lathe(b, BALUSTER_RINGS, BALUSTER_SEG)


def kit_lathe_sides(b, rings, segments, cx=0.0, cz=0.0, mat=KIT_BASE):
    """No end caps: column shaft and echinus ends are buried in adjoining solids."""
    circles = [kit_circle(cx, cz, r, y, segments) for r, y in rings]
    for a, c in zip(circles, circles[1:]):
        centre = (cx, (a[0][1] + c[0][1]) / 2, cz)
        for i in range(segments):
            j = (i + 1) % segments
            face = [a[i], a[j], c[j], c[i]]
            b.add(face, mat, v_sub(v_scale(kit_centre(face), 2), centre))


def build_column(b):
    half, height = COLUMN_PLINTH
    kit_open_box(b, (-half, half), (0.0, height), (-half, half), KIT_BASE, hide=('bottom',))
    kit_lathe_sides(b, COLUMN_SHAFT_RINGS, COLUMN_SEG)
    kit_lathe_sides(b, COLUMN_CAPITAL_RINGS, COLUMN_SEG, mat=KIT_ACCENT)
    half, y0, y1 = COLUMN_ABACUS
    kit_open_box(b, (-half, half), (y0, y1), (-half, half), KIT_ACCENT, hide=('top',))


def build_portal(b):
    """Wall-backed aedicule; doors remain closed. Rail heights are WORLD y."""
    sill, head = LANDING_Y, LANDING_Y + PORTAL_H
    frame_x = (X_E - PORTAL_DEPTH, X_E)
    outer = PORTAL_HALF_W + PORTAL_JAMB
    for sign in (-1, 1):
        z = sorted((PORTAL_Z + sign * PORTAL_HALF_W, PORTAL_Z + sign * outer))
        kit_open_box(b, frame_x, (sill, head), z, KIT_BASE, hide=('east', 'top', 'bottom'))
    kit_open_box(b, frame_x, (head, head + PORTAL_HEAD), (PORTAL_Z - outer, PORTAL_Z + outer),
                 KIT_BASE, hide=('east', 'top'))
    y0, y1, half, proud = PORTAL_ENTAB
    kit_open_box(b, (X_E - proud, X_E), (y0, y1), (PORTAL_Z - half, PORTAL_Z + half),
                 KIT_BASE, hide=('east', 'top'))
    back, front = DOOR_LEAF
    width, proud = DOOR_MOULD
    if not (0.0 <= front < back and front + proud <= PORTAL_DEPTH):
        raise RuntimeError('portal doors must sit inside the reveal: DOOR_LEAF/DOOR_MOULD vs PORTAL_DEPTH')
    xf = X_E - front
    levels = (sill,) + DOOR_RAILS_Y + (head,)
    for sign in (-1, 1):
        z0, z1 = sorted((PORTAL_Z, PORTAL_Z + sign * PORTAL_HALF_W))
        for ya, yb in zip(levels, levels[1:]):
            b.add([(xf, ya, z0), (xf, ya, z1), (xf, yb, z1), (xf, yb, z0)],
                  KIT_BASE, (xf - 1.0, (ya + yb) / 2, (z0 + z1) / 2))
    stile_y = (sill + DOOR_MARGIN, head - DOOR_MARGIN)
    stiles = []
    for dz in DOOR_STILES_DZ:
        c = PORTAL_Z + dz
        stiles.append((max(PORTAL_Z - PORTAL_HALF_W, c - width / 2), min(PORTAL_Z + PORTAL_HALF_W, c + width / 2)))
    stiles.sort()
    for z in stiles:
        kit_open_box(b, (xf - proud, xf), stile_y, z, KIT_ACCENT, hide=('east',))
    for a, c in zip(stiles, stiles[1:]):
        for y in DOOR_RAILS_Y:
            kit_open_box(b, (xf - proud, xf), (y - width / 2, y + width / 2), (a[1], c[0]),
                         KIT_ACCENT, hide=('east', 'north', 'south'))
    face, back = X_E - NICHE_DEPTH, X_E - NICHE_DEPTH + NICHE_CAVITY
    for cz in (PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ):
        outer_w, y0, y1 = NICHE_OUTER
        inner_w, sill, head = NICHE_OPEN
        outer = [(face, y0, cz - outer_w), (face, y0, cz + outer_w), (face, y1, cz + outer_w), (face, y1, cz - outer_w)]
        inner = [(face, sill, cz - inner_w), (face, sill, cz + inner_w), (face, head, cz + inner_w), (face, head, cz - inner_w)]
        centre = ((face + X_E) / 2, (y0 + y1) / 2, cz)
        for i in range(len(outer)):
            j = (i + 1) % len(outer)
            b.add([outer[i], outer[j], inner[j], inner[i]], KIT_BASE, HALL_REF)
            quad = [outer[i], outer[j], (X_E, outer[j][1], outer[j][2]), (X_E, outer[i][1], outer[i][2])]
            b.add(quad, KIT_BASE, v_sub(v_scale(kit_centre(quad), 2), centre))
        add_reveals(b, 'x', face, back, cz - inner_w, cz + inner_w, sill, head, KIT_BASE)
        b.add([(back, p[1], p[2]) for p in inner], KIT_BASE, HALL_REF)
        cx, (half, height) = (face + back) / 2, PEDESTAL
        kit_box(b, (cx - half, cx + half), (sill, sill + height), (cz - half, cz + half))
        kit_lathe(b, [(r, sill + height + y) for r, y in VASE_RINGS], VASE_SEG, cx, cz, mat=KIT_ACCENT)


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


# --- the jordan-fixtures round's ONE hook (batch B1; all form code lives in the new
# jordan_fixtures.py, which never imports this file: the kit helpers, the anchor tables
# and the namespace constants ride inside the namespace dict passed below). With
# FIXTURE_FORM unset or 'placeholder' the returned row IS the committed one and every
# byte of the build is unchanged; 'slice_e' swaps the runner's sconce row to the
# fixture module's archetype builder (gilt + sconce_glow + crystal) and routes its
# realize through the module's own sub-cell LM packer.
import importlib.util as _importlib_util

_jordan_fixtures_spec = _importlib_util.spec_from_file_location(
    'jordan_fixtures', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jordan_fixtures.py'))
jordan_fixtures = _importlib_util.module_from_spec(_jordan_fixtures_spec)
_jordan_fixtures_spec.loader.exec_module(jordan_fixtures)

# The slice-2b wall articulation module (the white-and-gold wall order): the same
# module law as jordan_fixtures — it never imports this file; the namespace dict and
# the shell builder instance arrive through its hook row below.
_jordan_walls_spec = _importlib_util.spec_from_file_location(
    'jordan_walls', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jordan_walls.py'))
jordan_walls = _importlib_util.module_from_spec(_jordan_walls_spec)
_jordan_walls_spec.loader.exec_module(jordan_walls)

# The review HIGH-3: the form env is validated STRICTLY at the load — empty/unset is
# 'placeholder', 'slice_e' is 'slice_e', anything else fails loud here (a typo such as
# 'slice-e' must never silently select the committed placeholder path).
_FIXTURE_FORM_ENV = os.environ.get('FIXTURE_FORM', '')
if _FIXTURE_FORM_ENV in ('', 'placeholder'):
    FIXTURE_FORM = 'placeholder'
elif _FIXTURE_FORM_ENV == 'slice_e':
    FIXTURE_FORM = 'slice_e'
else:
    raise RuntimeError(f'jordan: FIXTURE_FORM {_FIXTURE_FORM_ENV!r} is not '
                       "('placeholder' | 'slice_e')")

# The slice-2b hook's env (the same strict law): empty/unset is 'none' (the committed
# bare walls, every byte unchanged — the r15 law), 'slice_2b' builds the wall_order
# kit, anything else fails loud at the load.
_WALL_ARTICULATION_ENV = os.environ.get('WALL_ARTICULATION', '')
if _WALL_ARTICULATION_ENV in ('', 'none'):
    WALL_ARTICULATION = 'none'
elif _WALL_ARTICULATION_ENV == 'slice_2b':
    WALL_ARTICULATION = 'slice_2b'
else:
    raise RuntimeError(f'jordan: WALL_ARTICULATION {_WALL_ARTICULATION_ENV!r} is not '
                       "('none' | 'slice_2b')")


def build_fixtures(kit, form):
    """The runner's fixture rows through the fixture module (the module law: it never
    imports jordan.py — it receives this namespace dict and reads from it). B2: the
    module returns the chandelier assembly's three rows AND the sconce row under
    'slice_e'; the committed two rows (the placeholder chandelier + the placeholder
    sconce) otherwise — the byte-identical path."""
    return jordan_fixtures.fixture_rows(kit, form)


def cornice_rows():
    """The cornice roster row: the committed one everywhere except the slice-2b
    export path, which swaps the builder for the L7-fascia wrapper and adds the gilt
    slot (the fascia faces keep their own cells; only the slot index moves)."""
    if WALL_ARTICULATION == 'slice_2b' and not BAKE:
        return [('cornice', build_cornice_articulated, ['plaster_warm', 'gilt'])]
    return [('cornice', build_cornice, ['plaster_warm'])]


def build_cornice_articulated(b):
    """The slice-2b cornice row's builder: the committed build_cornice plus L7's
    fascia reassignment (jordan_walls.cornice_fascia enumerates the ring's four
    runs' lower-step fascia faces by construction order, cross-checks the geometric
    filters and moves their slot to gilt; topology, UV1 and cells untouched)."""
    build_cornice(b)
    jordan_walls.cornice_fascia(globals(), b)


def wall_point(axis, plane, u, y, d):
    return (u, y, plane + d) if axis == 'z' else (plane + d, y, u)


def kit_wall_box(b, x, y, depth, mat=KIT_BASE, hide=(), wall_z=0.0):
    """Open-backed wall-mounted box; no coincident wall-plane face."""
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


def kit_mould(b, axis, plane, u0, u1, sign, profile, divisions, trim=False, caps=False, mat=KIT_BASE):
    """Open profile sweep; trimmed runs butt under their perpendicular neighbours."""
    for p, q in zip(profile, profile[1:]):
        t = max(p[0], q[0]) if trim else 0.0
        a0, a1 = u0 + t, u1 - t
        nd, ny = q[1] - p[1], p[0] - q[0]
        for i in range(divisions):
            s0, s1 = a0 + (a1 - a0) * i / divisions, a0 + (a1 - a0) * (i + 1) / divisions
            face = [wall_point(axis, plane, s0, p[1], sign * p[0]), wall_point(axis, plane, s1, p[1], sign * p[0]),
                    wall_point(axis, plane, s1, q[1], sign * q[0]), wall_point(axis, plane, s0, q[1], sign * q[0])]
            md, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            b.add(face, mat, wall_point(axis, plane, (s0 + s1) / 2, my + ny, sign * (md + nd)))
    if caps:
        dc = sum(d for d, _ in profile) / len(profile)
        yc = sum(y for _, y in profile) / len(profile)
        for u, out in ((u0, -1.0), (u1, 1.0)):
            ring = [wall_point(axis, plane, u, y, sign * d) for d, y in profile]
            b.add(ring, mat, wall_point(axis, plane, u + out, yc, sign * dc))


def build_cornice(b):
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
    kit_wall_box(b, (DOOR_X[0] - band, DOOR_X[1] + band), (DOOR_H, DOOR_H + band), proj, wall_z=VEST_Z[0])


def build_pilaster(b):
    half, proj, height = PILASTER_SHAFT
    step = height / PILASTER_SHAFT_DIV
    for i in range(PILASTER_SHAFT_DIV):
        kit_wall_box(b, (-half, half), (i * step, (i + 1) * step), proj, KIT_BASE, hide=('top', 'bottom'))
    for half, proj, y0, y1 in PILASTER_CAPITAL:
        kit_wall_box(b, (-half, half), (y0, y1), proj, KIT_ACCENT, hide=('top',))


def build_pilaster_base(b):
    for half, proj, y0, y1 in PILASTER_BASE:
        kit_wall_box(b, (-half, half), (y0, y1), proj, KIT_BASE, hide=('bottom',))


def build_window_frame(b):
    width, height = WINDOW_FRAME_OPEN
    band, proj = WINDOW_ARCH
    sill_h, sill_proj, overhang = WINDOW_SILL
    hw, hh = width / 2, height / 2
    for x in ((-hw - band, -hw), (hw, hw + band)):
        kit_wall_box(b, x, (-hh, hh), proj, KIT_BASE, hide=('top', 'bottom'))
    kit_wall_box(b, (-hw - band, hw + band), (hh, hh + band), proj, KIT_BASE)
    kit_wall_box(b, (-hw - band - overhang, hw + band + overhang), (-hh - sill_h, -hh), sill_proj, KIT_BASE)


def place(name, me, location, rot_y=0.0):
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    return ob


def realize(b, material_names, first_cell):
    me = bpy.data.meshes.new(b.name)
    me.from_pydata([to_b(p) for p in b.verts], [], [list(f) for f, _ in b.faces])
    me.update()
    for name in material_names:
        me.materials.append(bpy.data.materials[name])
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
        if c < 0 or c >= LM_CAPACITY:
            raise RuntimeError(f'{b.name}: lm cell {c} outside the atlas')
        cx, cy = c % LM_GRID, c // LM_GRID
        key = f'{cx},{cy}'
        if key in LM_CELL_MAP['cells']:
            raise RuntimeError(f'duplicate lm cell allocation: {key}')
        material = material_names[mat]
        LM_CELL_MAP['cells'][key] = {'object': b.name, 'material': material}
        mapped = b.uvs[pi]
        if mapped is None:
            if material in ONE_SHOT_MATERIALS:
                raise RuntimeError(f'{b.name}: the one-shot material {material} carries no '
                                   f'uv_fn mapping (the metre-repeat law must not apply)')
            if material == 'marble_floor':
                mapped = marble_planar_uv(pts)
            else:
                repeat = MATERIAL_REPEAT_M.get(material, UV_TILE_M)
                mapped = [(u / repeat, v / repeat) for u, v in surface_projection(pts)]
        for li, loop in enumerate(poly.loop_indices):
            uv.data[loop].uv = mapped[li]
            pu, pv = proj[li]
            fu, fv = (pu - u0) / du, (pv - v0) / dv
            lm.data[loop].uv = ((cx * cell + LM_PAD_PX + fu * inner) / LM_RES,
                                (cy * cell + LM_PAD_PX + fv * inner) / LM_RES)
    if any(group in ('vault', 'plafond') for group in b.smooth_groups):
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(30.0))
        for pi, poly in enumerate(me.polygons):
            poly.use_smooth = b.smooth_groups[pi] in ('vault', 'plafond')
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)
    return len({mat for _, mat in b.faces})


# --- the jordan-fixtures round's realize dispatcher (part of the ONE hook): under
# slice_e the fixture datablocks realize through the fixture module's sub-cell LM
# packer (the committed one-cell-per-mesh-FACE law is not their law); every other mesh
# rides the committed realize unchanged, and the placeholder form never diverts.
_committed_realize = realize


def realize(b, material_names, first_cell):
    if FIXTURE_FORM == 'slice_e' and b.name in ('sconce', 'chandelier', 'chandelier_arm',
                                                'chandelier_bead'):
        return jordan_fixtures.realize_fixture(b, material_names, first_cell)
    if WALL_ARTICULATION == 'slice_2b' and b.name == 'wall_order':
        # The slice-2b law (L6): the dress's UV1 is the adopted host mapping computed
        # at build time; it allocates no cells, so first_cell is never consumed.
        return jordan_walls.realize_wall_order(b, material_names)
    return _committed_realize(b, material_names, first_cell)


def write_lm_cells(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(LM_CELL_MAP, sort_keys=True, indent=2, allow_nan=False) + '\n', encoding='utf8')


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format='GLB',
        export_apply=True,
        export_tangents=False,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_yup=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        use_selection=False)


def stage_dir():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for flag in ('--out', '--stage'):
        if flag in argv:
            index = argv.index(flag) + 1
            if index >= len(argv):
                raise ValueError(f'{flag} requires a path')
            return Path(argv[index]).resolve()
    if argv and not argv[0].startswith('-'):
        return Path(argv[0]).resolve()
    env = os.environ.get('ZIMNY_STAGE')
    if env:
        return Path(env).resolve()
    return Path(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def main():
    global LM_PART2_FIRST_CELL
    stage = stage_dir()
    # finding 13: this invocation's report — the previous build's wallArticulation row
    # dies here (the emission below gates on the row THIS build sets, export-only).
    jordan_walls.reset_report()
    tex_dir = stage / 'tex'
    tex_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    LM_CELL_MAP['cells'].clear()
    LM_PART2_FIRST_CELL = 0
    images = {name: write_texture(name, size, tex_dir) for name, size in TEXTURES}
    make_material('plaster_warm', images['plaster_warm'], 0.85)
    make_material('marble_floor', images['marble_floor'], 0.35)
    # The round-29 Neva backcloth: the pane carries the painted view as BOTH the base
    # and the emission source (emission_from_image) — the dark-glass constant base is
    # retired with it; the one-shot sampler law (CLIP) matches the wall-space UVs.
    make_material('pane', images['neva'], 0.6, PANE_EMISSION, extension='CLIP',
                  emission_from_image=True)
    make_material('sconce_glow', images['plaster_warm'], 0.85, SCONCE_GLOW_EMISSION)
    make_material('chandelier_glow', images['gilt'], 0.35, CHANDELIER_GLOW_EMISSION)
    make_material('granite_grey', images['granite_grey'], 0.6)
    make_material('gilt', images['gilt'], 0.35, metallic=GILT_METALLIC)
    # The plafond plate: rough matte painting, no metal, no emission; the one-shot
    # sampler law (CLIP → the glTF CLAMP_TO_EDGE) — the field-planar UVs span 0..1.
    make_material('plafond', images['plafond'], 0.85, extension='CLIP')
    shell, pane = MeshBuilder('shell'), MeshBuilder('pane')
    plafond, plafond_frame = MeshBuilder('plafond'), MeshBuilder('plafond_frame')
    build_floor(shell)
    build_north_wall(shell, pane)
    build_south_wall(shell)
    build_end_walls(shell)
    build_vault(shell, field=plafond, frame=plafond_frame)
    build_vestibule(shell)
    runners = [(shell, ['plaster_warm', 'marble_floor']), (pane, ['pane']),
               (plafond, ['plafond']), (plafond_frame, ['gilt'])]
    for name, builder, mats in (
        ('stairs', build_stairs, ['marble_floor']),
        ('rail', build_rail, ['gilt']),
        ('baluster', build_baluster, ['gilt']),
        ('column', build_column, ['granite_grey', 'gilt']),
        ('portal', build_portal, ['plaster_warm', 'gilt']),
        # The jordan-fixtures B2: the fixture module supplies the chandelier rows too —
        # the committed placeholder chandelier row on the placeholder path (byte
        # identical), the archetype assembly (stem / arm / bead) on the slice_e path.
        *build_fixtures(globals(), FIXTURE_FORM),
        # The slice-2b hook (the ONE additive call, after the fixtures hook): the
        # wall_order kit joins the roster EXPORT-ONLY — under BAKE (bake.py's scene)
        # the row is absent, so the bake scene (and all three plates) stay the
        # committed ones byte-for-byte by construction (the gallery's
        # exported-never-baked guard, rastrelli-gallery.py build_room).
        *(jordan_walls.wall_order_rows(globals(), WALL_ARTICULATION, shell) if not BAKE else []),
        *cornice_rows(),
        # The bands fix (2026-11-16): one template datablock PER WALL (pilaster,
        # pilaster_base: north/south/east by placement) and PER TIER (window_frame:
        # lower/upper) — bake.py's centroid representative then runs inside each group
        # instead of once across all 16 shafts. Same builders; identical geometry.
        # The ghost-split round (2026-11-18): the north group per-PIER — the sconce
        # rig's halo on the 79.0 representative must not copy to the six fixture-less
        # piers.
        ('pilaster_n0', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n1', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n2', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n3', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n4', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n5', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_n6', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_s', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_e', build_pilaster, ['plaster_warm', 'gilt']),
        ('pilaster_base_n', build_pilaster_base, ['plaster_warm']),
        ('pilaster_base_s', build_pilaster_base, ['plaster_warm']),
        ('pilaster_base_e', build_pilaster_base, ['plaster_warm']),
        ('window_frame_lo', build_window_frame, ['plaster_warm']),
        ('window_frame_hi', build_window_frame, ['plaster_warm']),
    ):
        b = MeshBuilder(name)
        builder(b)
        runners.append((b, mats))
    meshes, cells, draws = {}, 0, 0
    templates, primitives, envelope_cells = {}, {}, 0
    for b, mats in runners:
        name = b.name
        if name == 'stairs':
            LM_PART2_FIRST_CELL = cells
        first_cell = cells
        # The slice-2b law (L6): wall_order is exported-never-baked — it allocates NO
        # lightmap cells (its UV1 is the adopted host mapping), so the counter and
        # the ownership map skip it and the cell totals stay the committed ones.
        cells += 0 if (WALL_ARTICULATION == 'slice_2b' and name == 'wall_order') else len(b.faces)
        if cells > LM_CELLS['max']:
            raise RuntimeError(f'lm cells {cells} exceed LM_CAPACITY ({LM_CAPACITY}); overflow mesh: {name}')
        prims = realize(b, mats, first_cell)
        meshes[name] = {'triangles': b.triangles(), 'instances': 1, 'materials': mats,
                        'lmFirstCell': first_cell, 'faces': len(b.faces)}
        if name == 'wall_order':
            meshes[name]['lmFirstCell'] = None  # L6: borrowed light — no cells of its own
        primitives[name] = prims
        draws += prims
        if name == 'pane':
            envelope_cells = cells
        if name in ('baluster', 'column', 'sconce', 'chandelier_arm', 'chandelier_bead',
                    'pilaster_n0', 'pilaster_n1',
                    'pilaster_n2', 'pilaster_n3', 'pilaster_n4', 'pilaster_n5', 'pilaster_n6',
                    'pilaster_s', 'pilaster_e',
                    'pilaster_base_n', 'pilaster_base_s', 'pilaster_base_e',
                    'window_frame_lo', 'window_frame_hi'):
            ob = bpy.data.objects[name]
            templates[name] = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            meshes[name]['instances'] = 0
    if cells != len(LM_CELL_MAP['cells']):
        raise RuntimeError('allocator cell count differs from its ownership map')
    if cells > LM_CELLS['warn']:
        print(f'JORDAN_LM_WARNING allocated {cells} cells; warning threshold {LM_CELLS["warn"]}', file=sys.stderr)

    def put(name, location, rot_y=0.0):
        place(name, templates[name], location, rot_y)
        meshes[name]['instances'] += 1

    segment_counts = []
    for run in RAIL_RUNS:
        counts = []
        for a, c in zip(run, run[1:]):
            dx, dz = c[0] - a[0], c[2] - a[2]
            count = int(math.hypot(dx, dz) / BALUSTER_PITCH + 0.5)
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
    # The jordan-fixtures B2: the chandelier assembly's instances ride the module's own
    # rosters (36 arms on the stem's tier mounts, 300 beads: the festoons between the
    # adjacent pans + the pendants under the tiers). Empty under the placeholder form,
    # so the committed node order is byte-identical there.
    for location, rot_y in jordan_fixtures.arm_roster():
        put('chandelier_arm', location, rot_y)
    for location in jordan_fixtures.bead_roster():
        put('chandelier_bead', location, 0.0)
    # Keep the committed roster: east shafts pass through the landing; bases
    # remain at Y_FLOOR. The wall/tier split (the bands fix) picks each instance's
    # template by position; bake.py's centroid representative runs inside each group.
    tier_centres = [(sill + head) / 2 for sill, head in WIN_TIERS]
    for x, z, rot_y in PILASTERS:
        wall = 'n' if z == Z_N else ('s' if z == Z_S else 'e')
        if wall == 'n':
            # The ghost-split (2026-11-18): the north shaft per-PIER — pier index
            # from position (PILASTER_NORTH_X == PIER_X, so index always exists).
            put(f'pilaster_n{PIER_X.index(x)}', (x, PILASTER_Y0, z), rot_y)
        else:
            put(f'pilaster_{wall}', (x, PILASTER_Y0, z), rot_y)
        put(f'pilaster_base_{wall}', (x, Y_FLOOR, z), rot_y)
    for x, y in WINDOW_FRAMES:
        tier = 'lo' if y == tier_centres[0] else 'hi'
        put(f'window_frame_{tier}', (x, y, Z_N), math.pi)
    drawn = sum(row['triangles'] * row['instances'] for row in meshes.values())
    draws_naive = sum(primitives[name] * row['instances'] for name, row in meshes.items())
    if BAKE:
        return write_lm_cells(stage / 'lm' / 'cells.json')
    export_glb(stage / f'{ROOM_ID}.glb')
    summary = {
        'room': ROOM_ID,
        'stage': STAGE,
        'meshes': meshes,
        'trianglesDrawn': drawn,
        'draws': draws,
        'drawsNaive': draws_naive,
        'budget': {'trianglesMax': 380000},
        'textures': [{'name': n, 'size': s} for n, s in TEXTURES],
        'declared': {
            'bounds': {'x': [X_W, X_E], 'y': [Y_FLOOR, Y_CROWN], 'z': [Z_N, Z_S]},
            'orientation': {'windowWall': 'north Z-86 Neva/Palace Embankment', 'portholeWall': 'south Z-62 Palace Square'},
            'windowTiers': {'bays': WIN_BAYS, 'pitchM': WIN_PITCH, 'widthM': WIN_W, 'recessM': WIN_RECESS,
                            'bayCentresX': window_bays(), 'tiers': [{'sill': s, 'head': h} for s, h in WIN_TIERS]},
            'portholes': {'radiusM': PORT_R, 'depthM': PORT_DEPTH, 'y': list(PORT_Y), 'segments': PORT_SEG},
            'vault': {'springY': VAULT_SPRING_Y, 'crownY': Y_CROWN, 'facets': VAULT_NZ, 'coffers': [VAULT_NX, VAULT_NZ],
                      'cofferDepthM': COFFER_DEPTH, 'shading': 'smooth shared vault topology; sharp from angle 30 degrees'},
            'plafond': {'bays': PLAFOND_BAYS, 'frameSectionM': PLAFOND_FRAME, 'borderM': BORDER_M,
                        'plateMax': PLATE_MAX, 'meshes': ['plafond', 'plafond_frame'],
                        'plate': {'name': 'plafond', 'size': 1024, 'seed': hex(TEX_SEED['plafond']),
                                  'space': 'stored sRGB-encoded; figure-free open sky',
                                  'sampler': 'CLAMP_TO_EDGE (one-shot)'},
                        'uv': 'field-planar (x, z) → 0..1 over the field bounds; the metre-repeat law exempted',
                        'shading': 'smooth shared plafond topology; sharp from angle 30 degrees'},
            'neva': {'mesh': 'pane', 'plate': {'name': 'neva', 'size': 1024, 'source': 'tools/bpy/neva-art.png',
                                               'space': 'stored sRGB pass-through; the mean pin 0.80 lives in neva-raster.mjs',
                                               'sampler': 'CLAMP_TO_EDGE (one-shot)'},
                     'uv': 'wall-space (x, z-plane) → u (x−66)/26, v (y−2)/16; the metre-repeat law exempted',
                     'emission': 'emission_from_image — the plate modulates the emission (white factor); the strength gate 3.0 unchanged'},
            'vestibule': {'x': list(VEST_X), 'z': list(VEST_Z), 'ceilingY': VEST_H,
                          'door': {'x': list(DOOR_X), 'head': DOOR_H}},
            'landingY': LANDING_Y,
            'lm': {'res': LM_RES, 'padPx': LM_PAD_PX, 'grid': LM_GRID, 'envelopeCells': envelope_cells,
                   'part2FirstCell': LM_PART2_FIRST_CELL, 'part2Cells': cells - LM_PART2_FIRST_CELL,
                   'totalCells': cells, 'capacity': LM_CAPACITY, 'expectedCells': LM_CELLS['expected'],
                   'warnCells': LM_CELLS['warn'], 'cellsFile': 'lm/cells.json', 'rowConvention': 'row 0 at v=0; no flip'},
            'shellFieldMaxQuadM': SHELL_FIELD_MAX_QUAD_M,
            'shellTrianglesExpected': SHELL_TRIS_EXPECTED,
            'floorQuads': list(FLOOR_DIV),
            'uvTileM': UV_TILE_M,
            'uvRepeatM': MATERIAL_REPEAT_M,
            'marbleUv': {'horizontalRepeatM': [2.6, 2.4], 'slabM': [1.3, 1.2],
                         'floor': '10x10; one repeat per quad; hashed dihedral variant',
                         'treads': 'one inset slab quadrant, including slab-edge final risers'},
            'paneEmissionStrength': PANE_EMISSION[1],
            'paneEmissionColour': PANE_EMISSION[0],
            'giltMetallic': GILT_METALLIC,
            'giltBaseEncodedSrgb': GILT_BASE,
            'textureEncoding': 'sRGB-encoded 8-bit PNG; no additional OETF in the writer',
            'textureSeeds': TEX_SEED,
            'textures': [n for n, _ in TEXTURES],
            'flights': [dict(f, top=f['a0'] + f['d'] * RUN, risers=RISERS, treads=TREADS, riseM=RISE, goingM=GOING,
                             runM=RUN, treadBlockM=[f['band'][1] - f['band'][0], RISE, GOING],
                             topRiser='slab edge', stringerThicknessM=STRINGER_T, stringerBand=stringer_band(f))
                        for f in FLIGHTS],
            'slabs': {'thicknessM': SLAB_T,
                      'mezzanine': {'x': MEZZ_X, 'y': MEZZ_Y, 'z': MEZZ_Z},
                      'landing': {'x': LAND_X, 'y': LANDING_Y, 'z': LAND_Z},
                      'soffitReturnM': abs(STRINGER_T + RISE - SLAB_T)},
            'rail': {'profileM': RAIL_PROFILE, 'topAboveDatumM': RAIL_TOP, 'runs': RAIL_RUNS,
                     'datum': 'nose line minus one rise; slab top on landings', 'topReturnsM': RISE,
                     'returnPlanDepthM': RAIL_PROFILE[1], 'joins': 'mitered closed spans and overlapping solid vertical returns',
                     'flight2SouthSupportM': round(stringer_band(FLIGHTS[1])[1] - F2_Z[1], 6)},
            'balusters': {'pitchM': BALUSTER_PITCH, 'N': meshes['baluster']['instances'], 'segmentCounts': segment_counts,
                          'segments': BALUSTER_SEG, 'rings': BALUSTER_RINGS,
                          'placement': 'equal-bin midpoints per segment',
                          'datum': 'same continuous nose-minus-rise datum as the rail'},
            'columns': {'count': meshes['column']['instances'], 'xz': COLUMN_XZ, 'baseY': LANDING_Y,
                        'plinth': COLUMN_PLINTH, 'shaftRings': COLUMN_SHAFT_RINGS, 'capitalRings': COLUMN_CAPITAL_RINGS,
                        'abacus': COLUMN_ABACUS, 'segments': COLUMN_SEG,
                        'abacusTopY': round(LANDING_Y + COLUMN_ABACUS[2], 6),
                        'buried': 'plinth bottom, lathe ends, abacus top (coplanar with the cornice soffit)',
                        'materials': {'granite_grey': 'plinth, torus, shaft', 'gilt': 'echinus, abacus'}},
            'portal': {'z': PORTAL_Z, 'baseY': LANDING_Y, 'halfWidthM': PORTAL_HALF_W, 'heightM': PORTAL_H,
                       'jambM': PORTAL_JAMB, 'depthM': PORTAL_DEPTH, 'head': PORTAL_HEAD,
                       'doors': {'leaf': DOOR_LEAF, 'mould': DOOR_MOULD, 'stilesDz': DOOR_STILES_DZ,
                                 'railsY': DOOR_RAILS_Y, 'railsYFrame': 'world', 'margin': DOOR_MARGIN,
                                 'panels': 'white', 'state': 'closed (DEC-025)'},
                       'materials': {'plaster_warm': 'jambs, head, entablature, leaves, niches, pedestals',
                                     'gilt': 'stile and rail mouldings, vases'},
                       'entablature': PORTAL_ENTAB, 'opening': 'wall-backed; shell uncut',
                       'nichesZ': [PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ],
                       'nicheOuter': NICHE_OUTER, 'nicheOpen': NICHE_OPEN, 'nicheFaceDepthM': NICHE_DEPTH,
                       'nicheCavityM': NICHE_CAVITY, 'pedestal': PEDESTAL,
                       'vases': {'count': 2, 'segments': VASE_SEG, 'rings': VASE_RINGS, 'mesh': 'portal'}},
            'order': {
                'cornice': {'steps': CORNICE, 'divisions': CORNICE_DIV, 'runs': CORNICE_RUNS,
                            'bottomY': CORNICE[0][0], 'topY': CORNICE[1][1],
                            'corners': 'butt; E/W runs trimmed by each step projection; no end caps',
                            'vestibuleCap': VEST_CAP, 'vestibuleCapRuns': VEST_CAP_RUNS,
                            'vestibuleDoorFrame': VEST_DOOR_FRAME, 'instances': meshes['cornice']['instances'],
                            'mesh': 'world-space'},
                'pilasters': {'footY': PILASTER_Y0, 'shaft': PILASTER_SHAFT, 'shaftDivisions': PILASTER_SHAFT_DIV,
                              'capital': PILASTER_CAPITAL, 'abacusTopY': round(PILASTER_Y0 + PILASTER_CAPITAL[-1][3], 6),
                              'base': PILASTER_BASE, 'baseY': Y_FLOOR, 'northX': PILASTER_NORTH_X,
                              'southX': PILASTER_SOUTH_X, 'eastZ': PILASTER_EAST_Z, 'roster': PILASTERS,
                              'N': sum(meshes[f'pilaster_{w}']['instances'] for w in ('s', 'e'))
                                   + sum(meshes[f'pilaster_n{i}']['instances'] for i in range(7)),
                              'basesN': sum(meshes[f'pilaster_base_{w}']['instances'] for w in ('n', 's', 'e')),
                              'templateFront': '-Z',
                              'rotYRadians': {'north': math.pi, 'south': 0.0, 'east': math.pi / 2}},
                'windowFrames': {'opening': WINDOW_FRAME_OPEN, 'architrave': WINDOW_ARCH, 'sill': WINDOW_SILL,
                                 'baysX': WIN_X, 'roster': WINDOW_FRAMES, 'wall': 'north', 'wallZ': Z_N,
                                 'rotYRadians': math.pi,
                                 'N': sum(meshes[f'window_frame_{t}']['instances'] for t in ('lo', 'hi'))},
                'slots': {'base': KIT_BASE, 'accent': KIT_ACCENT,
                          'law': 'materials[i] is builder slot i; one glTF primitive per used slot'},
            },
            'chandelier': {'xz': CHAND_C, 'ringY': CHAND_RING_Y, 'radiiM': CHAND_R, 'bandM': CHAND_BAND,
                           'segments': CHAND_SEG, 'rodWidthM': CHAND_ROD, 'rodTopY': CHAND_ROD_TOP,
                           'pendants': min(CHAND_SEG, 8), 'spokes': min(CHAND_SEG, 8),
                           'dropHalfExtentsM': CHAND_DROP, 'dropRadiusM': CHAND_DROP_R, 'dropY': CHAND_DROP_Y,
                           'coreHalfExtentsM': CHAND_CORE, 'coreY': CHAND_CORE_Y,
                           'emissionStrength': CHANDELIER_GLOW_EMISSION[1],
                           'emissionColour': CHANDELIER_GLOW_EMISSION[0]},
            'sconces': {'M': meshes['sconce']['instances'], 'aboveDatumM': SCONCE_ABOVE, 'westZ': SCONCE_WEST_Z,
                        'northX': SCONCE_NORTH_X, 'eastZY': SCONCE_EAST,
                        'westPitchM': abs(SCONCE_WEST_Z[1] - SCONCE_WEST_Z[0]),
                        'northPitchM': round(SCONCE_NORTH_X[1] - SCONCE_NORTH_X[0], 6),
                        'templateFront': '-Z', 'northWorldFront': '+Z into hall',
                        'rotYRadians': {'west': -math.pi / 2, 'north': math.pi, 'east': math.pi / 2},
                        'bracket': SCONCE_BRACKET, 'glowBox': SCONCE_GLOW_BOX,
                        'emissionStrength': SCONCE_GLOW_EMISSION[1], 'emissionColour': SCONCE_GLOW_EMISSION[0]},
            'lmInstancePolicy': 'instanced props bake one representative per wall/tier group '
                                '(pilaster x3, pilaster_base x3, window_frame x2 datablocks; '
                                'the day upper-tier bands fix); bake.py selects the centroid '
                                'representative inside each group; runtime ADR-0013 probe '
                                'scalars remain unchanged',
            'kitRefs': 'solids: twice face centroid minus interior centroid; lathe sides: '
                       'radially outward; caps: beyond ends; ring inner: centre; niche faces: '
                       'HALL_REF; niche reveals: cavity centre; frame returns: radially outward',
        },
    }
    # The jordan-fixtures B2: the assembly's honest rows beside the committed
    # chandelier row (which keeps reporting the RIG's derivation inputs — the rig
    # never moves). Constructed BEFORE either serialization (the review HIGH-2): the
    # stage summary.json and the ZIMNY_SUMMARY stdout carry the SAME
    # declared.chandelierFixtures, and if declared_rows() raises nothing is written —
    # an apparently finished stage file without the key cannot exist. The placeholder
    # path never adds the key (the byte-identical law).
    if FIXTURE_FORM == 'slice_e':
        summary['declared']['chandelierFixtures'] = jordan_fixtures.declared_rows()
    # The slice-2b row: the built truth beside the committed declared rows (the
    # fixtures-precedent pattern; the 'none' path never adds the key — the
    # byte-identity law). jordan.mjs's gate reads the cornice branch from it.
    if jordan_walls.WALL_ORDER_REPORT is not None:
        summary['declared']['wallArticulation'] = jordan_walls.WALL_ORDER_REPORT
    (stage / 'summary.json').write_text(json.dumps(summary, sort_keys=True, indent=2, allow_nan=False) + '\n', encoding='utf8')
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':'), allow_nan=False))


main()
