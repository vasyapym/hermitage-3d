# Zimny — St George's Hall (the Winter Palace's Great Throne Room) room kit
# (Blender 4.2 LTS, headless). Run by tools/asset.mjs `bpy st-george` (stem =
# room id verbatim); the bake side execs this file with ZIMNY_BAKE=1
# (tools/bpy/bake.py build_room).
#
# Implements DECISION-1 step 2: the hall's Blender translation of the committed
# geometry plan tools/st-george/law.json (schema st-george-law-1, byte-pinned;
# emitted by tools/st-george/emit.mjs). The law carries the review-pass-1
# rulings R1-R8 (the vault's round-2 FINDINGS.md): sourced constants, the exact
# per-edge look-cone visibility certificate, joined pair capitals on one
# support height, the canopy reshaped around the pinned gazes.
#
# THE SCRIPT IS A TRANSLATOR — data only, never a law: it re-derives no
# geometry. Every vertex, normal, material slot, tessellation count and
# lightmap constant is read from law.json and turned into Blender meshes
# (declared.zero: 'no runtime JS; data only').
#
# The lightmap layout adopts the military-gallery ArchChart scheme
# (tools/bpy/military-gallery.py face_patch / _bind / _finish_all,
# tools/bpy/military_gallery_chart.py) made RES-INDEPENDENT: the chart is a
# fixed METRE canvas (law.lighting.lmChart.canvasM — the law's own bisection),
# every face is one patch at its in-plane metre extents (u = the longest loop
# edge, v = normal x u), the min clamp and the pad live in metres
# (minPx*canvasM/shellRes, padPx*canvasM/shellRes — the shell's metre-pad,
# fixed for every resolution), and a point's UV is
#     u = (x_m + s*w_m) / canvasM,  v = 1.0 - (y_m + t*h_m) / canvasM
# for (s, t) in [0, 1]^2 across the patch's content area — the chart's top-down
# y convention (military_gallery_chart.py uv(), v0 = 1 - (y + h)/canvas), so
# the exporter's flip and the runtime sampling agree at ANY bake resolution
# (the 1024 shell and the 2048 final sample one layout).
#
# Writes:  <stage>/st-george.glb (export runs; NOT under ZIMNY_BAKE=1)
#          <stage>/tex/ornament-gilt.png + tex/ornament-parquet.png (the record's
#          step-4 plates, copied verbatim; export runs only)
#          <stage>/lm/cells.json (bake runs only, or ZIMNY_LM_LAYOUT_OUT)
#          one `ZIMNY_SUMMARY <json sorted-keys>` line (export runs only) —
#          tools/asset.mjs extracts it into <stage>/summary.json.
# Bake contract (the bake registration step reads these): one merged mesh per
# material slot, the object AND its material named the slot id verbatim; every
# face carries BOTH uv layers ('uv' mirrors the chart mapping, 'lm' is the
# bake's coordinate space); no layoutHash key anywhere (asset.mjs's
# layout-identity gate stays dormant for this room).
#
# Deterministic: no randomness, no clock reads, no locale-dependent formatting,
# no trig, no ** operator; fixed creation order (slots 0..13, faces in law.json
# order); JSON always sort_keys=True, allow_nan=False. Repeat runs are
# byte-identical (the repo checks sha256 equality between two runs).

import bmesh
import bpy
import json
import math
import os
import shutil
import sys

BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'st-george'
SCHEMA = 'st-george-builder-1'
COLLECTION_NAME = 'StGeorge'
UV_LIGHTMAP = 'lm'          # layer 1: the bake's coordinate space
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LAW_PATH = os.path.join(SCRIPT_DIR, '..', 'st-george', 'law.json')

# ---- the law: the ONLY data input ---------------------------------------------
# Loud contract failures carry the 'st-george-builder: ' prefix. A missing key,
# a <3-vertex face, an unknown slot index, an unknown tessellation kind or a
# packer overflow must never pass silently.

LAW = None
FRAME = None
BOX = None
SLOTS_ROWS = None
CLASSES = None
LM = None
CAPS = None
LAW_SCHEMA = None
SLOT_IDS = None
SLOT_INDEXES = None


def refuse(message):
    raise RuntimeError('st-george-builder: %s' % message)


def _key(container, key, where):
    if not isinstance(container, dict) or key not in container:
        refuse('law %s missing key %r' % (where, key))
    return container[key]


def load_law():
    """Read + validate the committed plan; populate the module's law globals."""
    global LAW, FRAME, BOX, SLOTS_ROWS, CLASSES, LM, CAPS, LAW_SCHEMA, SLOT_IDS, SLOT_INDEXES
    if not os.path.exists(LAW_PATH):
        refuse('the geometry plan is missing at %s' % LAW_PATH)
    with open(LAW_PATH, encoding='utf-8') as handle:
        LAW = json.load(handle)
    FRAME = _key(LAW, 'frame', 'law')
    BOX = _key(LAW, 'box', 'law')
    SLOTS_ROWS = _key(LAW, 'materialSlots', 'law')
    CLASSES = _key(LAW, 'classes', 'law')
    LM = _key(_key(LAW, 'lighting', 'law'), 'lmChart', 'law.lighting')
    CAPS = _key(LAW, 'caps', 'law')
    LAW_SCHEMA = _key(LAW, 'schema', 'law')
    for name in ('X0', 'AXIS_Z', 'FLOOR_Y', 'CEILING_Y', 'bounds'):
        _key(FRAME, name, 'law.frame')
    for name in ('min', 'max'):
        _key(FRAME['bounds'], name, 'law.frame.bounds')
    for name in ('min', 'max'):
        _key(BOX, name, 'law.box')
    for name in ('canvasM', 'padPx', 'minPx', 'occupancy', 'patchCount', 'totalPatchArea',
                 'shellRes', 'finalRes', 'densityShellPxPerM', 'densityFinalPxPerM'):
        _key(LM, name, 'law.lighting.lmChart')
    # The slots run 0..N-1 in row order; the slot index IS the draw order.
    SLOT_IDS = []
    for index, row in enumerate(SLOTS_ROWS):
        if _key(row, 'slot', 'law.materialSlots[%d]' % index) != index:
            refuse('material slot %r out of order at row %d (slots must run 0..N-1)'
                   % (row.get('slot'), index))
        SLOT_IDS.append(_key(row, 'id', 'law.materialSlots[%d]' % index))
    SLOT_INDEXES = frozenset(range(len(SLOT_IDS)))


# ---- the metre lightmap chart (the military-gallery ArchChart, res-independent)
# Every face binds to its OWN patch (the D-10 per-face law). The packer is the
# guillotine first-fit over patches sorted (-island height, -island width,
# name) — the same order rule as military_gallery_chart.py — run in METRE
# space against the law's own bisected canvas. The min clamp and the pad are
# the shell's METRE constants: a patch smaller than minPatchM gets a
# minPatchM-clamped island (>= 8 px at the 1024 shell, >= 16 px at the 2048
# final), and the packed rects never move between resolutions, so the UVs
# below are identical at both. Overflow is a loud failure: the law bisected
# the canvas with the same pad/min maths, so a failure means the maths drifted.

class Patch:
    __slots__ = ('name', 'w_m', 'h_m', 'island_w', 'island_h', 'canvas', 'x', 'y')

    def __init__(self, name, w_m, h_m, min_m, canvas_m):
        self.name = name
        self.w_m = float(w_m)
        self.h_m = float(h_m)
        self.island_w = max(self.w_m, min_m)
        self.island_h = max(self.h_m, min_m)
        self.canvas = float(canvas_m)
        self.x = None
        self.y = None

    def uv(self, s_m, t_m):
        """Metres inside the patch's content area -> chart UV (u right, v up; the
        chart's y runs top-down). (s, t) in [0, 1] across the content, scaled by
        the content's own metres: u = (x_m + s*w_m)/canvasM."""
        if self.x is None:
            refuse('patch %s read before pack()' % self.name)
        fs = 0.0 if self.w_m <= 0.0 else min(max(s_m / self.w_m, 0.0), 1.0)
        ft = 0.0 if self.h_m <= 0.0 else min(max(t_m / self.h_m, 0.0), 1.0)
        return ((self.x + fs * self.w_m) / self.canvas,
                1.0 - (self.y + ft * self.h_m) / self.canvas)


class MetreChart:
    """Patches add in law order, pack once (guillotine first-fit), then every
    bound loop's (s, t) metres resolve to chart UVs through patch.uv()."""

    def __init__(self, lm):
        self.canvas_m = float(lm['canvasM'])
        self.pad_px = int(lm['padPx'])
        self.min_px = int(lm['minPx'])
        self.shell_res = int(lm['shellRes'])
        self.occupancy = float(lm['occupancy'])
        # The law's own metre maths (lmChartPlan's expression order): the pad and
        # the min clamp are pixel constants; in metres they scale with canvas/res,
        # the SHELL resolution carrying the larger metre-pads.
        self.pad_m = (self.pad_px * self.canvas_m) / self.shell_res
        self.min_m = (self.min_px * self.canvas_m) / self.shell_res
        self.patches = []
        self._names = set()
        self.packed = False

    def add(self, name, w_m, h_m):
        if self.packed:
            refuse('MetreChart.add() after pack()')
        if name in self._names:
            refuse('duplicate lightmap patch %s' % name)
        self._names.add(name)
        patch = Patch(name, w_m, h_m, self.min_m, self.canvas_m)
        self.patches.append(patch)
        return patch

    def pack(self):
        pad, canvas = self.pad_m, self.canvas_m
        # The law's bisection bound (lmChartPlan placedDemand): the placed demand
        # (islands + the pad on every side) fits the occupancy share of the
        # canvas. Summed in law order — the same float sum the bisection ran;
        # the 1e-9 slack only absorbs an ulp-order drift (the packer below is
        # the hard gate).
        demand = 0.0
        for patch in self.patches:
            demand += (patch.island_w + 2.0 * pad) * (patch.island_h + 2.0 * pad)
        bound = self.occupancy * canvas * canvas
        if demand > bound * (1.0 + 1e-9):
            refuse('lightmap demand %.3f m2 exceeds the law occupancy %.2f of the '
                   '%.6f m canvas (%.3f m2) — the bisected maths drifted'
                   % (demand, self.occupancy, canvas, bound))
        order = sorted(self.patches, key=lambda p: (-p.island_h, -p.island_w, p.name))
        free = [{'x': pad, 'y': pad, 'w': canvas - 2.0 * pad, 'h': canvas - 2.0 * pad}]
        for index, patch in enumerate(order):
            placed = False
            for fi, rect in enumerate(free):
                if patch.island_w + 2.0 * pad > rect['w'] or \
                        patch.island_h + 2.0 * pad > rect['h']:
                    continue
                patch.x = rect['x'] + pad
                patch.y = rect['y'] + pad
                # Split rule (military_gallery_chart.py): the RIGHT strip sits
                # beside the slot at the SLOT's height; the BOTTOM strip runs the
                # rect's FULL width under it — a full-width slab (the walls, the
                # floor) always finds its band.
                slot_w = patch.island_w + 2.0 * pad
                slot_h = patch.island_h + 2.0 * pad
                right = {'x': rect['x'] + slot_w, 'y': rect['y'],
                         'w': rect['w'] - slot_w, 'h': slot_h}
                bottom = {'x': rect['x'], 'y': rect['y'] + slot_h,
                          'w': rect['w'], 'h': rect['h'] - slot_h}
                free[fi:fi + 1] = [r for r in (right, bottom)
                                   if r['w'] > 0 and r['h'] > 0]
                placed = True
                break
            if placed:
                continue
            refuse('lightmap chart overflow at %s (%.3f x %.3f m): packed %d of %d '
                   'patches, %.3f m2 demanded of a %.6f m canvas'
                   % (patch.name, patch.island_w, patch.island_h, index,
                      len(order), demand, canvas))
        self.packed = True


# ---- the coordinate rotation ----------------------------------------------------
# Authored coordinates are glTF world axes: +X east, +Y up, +Z south (the law's
# bounds [91, 9.5, 5]..[139, 20.5, 24]; the floor at y=10, the ceiling at y=20).
# Blender coordinates are (x, -z, y): a proper rotation, winding preserved —
# every face keeps its law-ordered loop and its inward normal.

def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y)."""
    return (p[0], -p[2], p[1])


# ---- the law's projection arithmetic (bit-parity with law.mjs) ------------------
# The patch rect per face: u = the longest loop edge (first-max on ties),
# v = normal x u; w/h from the vertex projections — the law's own patchExtents
# and the military-gallery face_patch rule. The law's committed normal,
# vertices and tessellation counts are data; nothing is re-derived.

def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def patch_projections(vertices, normal):
    """(dus, dvs): the per-vertex projections on the face's in-plane metre frame."""
    u = _sub(vertices[1], vertices[0])
    longest = 0.0
    for i in range(len(vertices)):
        edge = _sub(vertices[(i + 1) % len(vertices)], vertices[i])
        length = math.sqrt(_dot(edge, edge))
        if length > longest:
            longest = length
            u = (edge[0] / length, edge[1] / length, edge[2] / length)
    v = _cross(normal, u)
    dus = [_dot(p, u) for p in vertices]
    dvs = [_dot(p, v) for p in vertices]
    return dus, dvs


# ---- materials (DECISION-1 steps 2 and 4) -----------------------------------------
# One material per slot, named the slot id VERBATIM (the bake registration
# matches these names). Plain Principled BSDF; fixed base colours and
# roughness/metallic constants. The record's step-4 line wires the two
# ornament slots to the rastered plates as base-colour textures (jordan.py's
# plafond/neva pattern): the plate PNG lands in the stage's tex/ for the gltf
# step, and the MIRROR sampler exports glTF MIRRORED_REPEAT.
#
# THE MIRROR LAW (the record: the drawing is ONE QUADRANT mirrored): the SVG
# draws one quadrant of the 45.04 x 10.20 m ornament field; the plate faces'
# albedo UV layer ('uv') maps the face's own metres to [0, 2] on both axes and
# the ornament textures carry the MIRRORED_REPEAT sampler, so the drawing
# mirrors 2x2 over the field. The 'lm' layer keeps the chart mapping untouched.
# The plates are plain sRGB albedo — NO mean-linear normalization (unlike the
# plafond's bake plate, jordan.py::_plafond_art_pixels; the bounce pin does not
# apply to a step-4 albedo plate).

import shutil

MATERIAL_ROWS = (
    # slot id, base colour (linear), roughness, metallic, emission, strength
    ('wall-marble', (0.820, 0.780, 0.700), 0.50, 0.0, None, 0.0),
    ('column-marble', (0.780, 0.790, 0.800), 0.50, 0.0, None, 0.0),
    ('capital-gilt', (0.550, 0.410, 0.150), 0.35, 1.0, None, 0.0),
    ('window-light', (0.880, 0.830, 0.700), 0.20, 0.0, (0.880, 0.830, 0.700), 1.0),
    ('balcony-stone', (0.600, 0.590, 0.560), 0.60, 0.0, None, 0.0),
    ('balcony-gilt', (0.550, 0.410, 0.150), 0.35, 1.0, None, 0.0),
    ('parquet', (0.300, 0.190, 0.100), 0.60, 0.0, None, 0.0),
    ('ceiling', (0.800, 0.800, 0.780), 0.50, 0.0, None, 0.0),
    ('ornament-gilt', (0.550, 0.410, 0.150), 0.35, 1.0, None, 0.0),
    ('ornament-parquet', (0.300, 0.190, 0.100), 0.60, 0.0, None, 0.0),
    ('throne-stone', (0.620, 0.610, 0.580), 0.60, 0.0, None, 0.0),
    ('throne-cloth', (0.480, 0.070, 0.090), 0.90, 0.0, None, 0.0),
    ('throne-gilt', (0.620, 0.460, 0.170), 0.35, 1.0, None, 0.0),
    ('relief', (0.800, 0.790, 0.760), 0.50, 0.0, None, 0.0),
)


# The record's step-4 plates: the ornament slots reference the rastered plates
# (tools/bpy/plate-raster.mjs <palette> → tools/bpy/st-george-ornament-<palette>.png,
# copied verbatim into <stage>/tex/ as tex/<slot>.png for tools/gltf/st-george.mjs's
# stageTextures/encodeTextures). Missing plate = a loud refusal, never a silent colour
# slot: the plates ARE the step-4 look.
ORNAMENT_PLATES = {
    'ornament-gilt': 'gilt',
    'ornament-parquet': 'parquet',
}
PLATE_SPAN = 2.0    # the albedo UV spans [0, 2] on both axes (the mirror law)
PLATE_SLOTS = frozenset(ORNAMENT_PLATES)


def _plate_image(slot):
    """The rastered plate, loaded sRGB and stored-sRGB byte-faithful (no Blender
    reprocessing): the glTF exporter embeds the PNG bytes verbatim."""
    src = os.path.join(SCRIPT_DIR, 'st-george-ornament-%s.png' % ORNAMENT_PLATES[slot])
    if not os.path.exists(src):
        refuse('the ornament plate is missing at %s — run '
               'node tools/bpy/plate-raster.mjs %s' % (src, ORNAMENT_PLATES[slot]))
    img = bpy.data.images.load(src, check_existing=False)
    img.name = slot
    img.colorspace_settings.name = 'sRGB'
    return img


def _wire_plate(mat, image):
    """The jordan.py plafond pattern (ShaderNodeTexImage -> Base Color over the 'uv'
    layer) with the record's mirror law in the sampler: Blender 4.2's MIRROR extension
    exports glTF MIRRORED_REPEAT (33648) on both axes."""
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Linear'
    tex.extension = 'MIRROR'
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])


def make_materials():
    made = {}
    for slot, row in enumerate(MATERIAL_ROWS):
        name, rgb, roughness, metallic, emission, strength = row
        if name != SLOT_IDS[slot]:
            refuse('material row %d is %s, the law names slot %s'
                   % (slot, name, SLOT_IDS[slot]))
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if emission is not None:
            # The window-light panes: emission strength EXACTLY 1.0 — the exporter
            # then omits the strength extension (the jordan precedent).
            bsdf.inputs['Emission Color'].default_value = \
                (emission[0], emission[1], emission[2], 1.0)
            bsdf.inputs['Emission Strength'].default_value = strength
        if name in ORNAMENT_PLATES:
            _wire_plate(mat, _plate_image(name))
        made[name] = mat
    return made


# ---- the build (the military-gallery deferred-UV pattern) ------------------------
# One merged mesh per material slot (slot = draw; 14 meshes <= the law cap of
# 24), created in fixed slot order, faces in law.json order. Every face's
# polygons are the law's own tessellation: a bilinear-grid quad subdivides
# into a u x v grid of quads (two triangles each; the (a, b) sweep keeps the
# source loop's orientation), a polygon caps by a first-vertex fan. Each
# polygon's per-loop (s, t) metres bind to the face's patch; the loops resolve
# AFTER the pack (both uv layers: 'uv' mirrors the chart mapping, 'lm' is the
# bake's coordinate space), then flat shading + triangulation + commit.

PENDING = {}        # id(bm) -> [(poly, patch, ((s, t), ...)), ...]
FINISH_QUEUE = []   # (obj, bm)
ACCOUNT = {}        # mesh name -> the per-slot build counts
CHART = None        # the MetreChart, created in main()


def _new_part(collection, name):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj, bmesh.new()


def _layers(bm):
    return bm.loops.layers.uv.new('uv'), bm.loops.layers.uv.new(UV_LIGHTMAP)


def _bind(bm, poly, patch, sts, plate_sts=None):
    """Record a polygon's (s, t) metres per loop against its chart patch — plus the
    plate-face albedo UVs when the polygon rides an ornament plate slot (the mirror
    law; None keeps 'uv' on the chart mapping)."""
    PENDING.setdefault(id(bm), []).append(
        (poly, patch, tuple(sts), None if plate_sts is None else tuple(plate_sts)))
    return poly


def _plate_uv(st, w_m, h_m):
    """One (s, t) metre pair -> the plate's albedo UV: the face's own metres scaled to
    [0, PLATE_SPAN] on both axes. The mirrored tiling is invariant under the projection
    frame's direction, so no axis orientation is special-cased."""
    s_m, t_m = st
    u = 0.0 if w_m <= 0.0 else (s_m / w_m) * PLATE_SPAN
    v = 0.0 if h_m <= 0.0 else (t_m / h_m) * PLATE_SPAN
    return (u, v)


def _finish(obj, bm):
    FINISH_QUEUE.append((obj, bm))
    return obj


def _finish_all():
    """Resolve every pending 'lm' loop from the packed chart, then triangulate + commit."""
    for obj, bm in FINISH_QUEUE:
        uv = bm.loops.layers.uv.get('uv')
        lm = bm.loops.layers.uv.get(UV_LIGHTMAP)
        bound = PENDING.get(id(bm), ())
        if len(bound) != len(bm.faces):
            refuse('%s: %d of %d polygons carry no lightmap patch'
                   % (obj.name, len(bm.faces) - len(bound), len(bm.faces)))
        for poly, patch, sts, plate_sts in bound:
            if len(sts) != len(poly.loops):
                refuse('%s: %d (s, t) pairs for a %d-loop polygon on %s'
                       % (obj.name, len(sts), len(poly.loops), patch.name))
            if plate_sts is not None and len(plate_sts) != len(poly.loops):
                refuse('%s: %d plate UVs for a %d-loop polygon on %s'
                       % (obj.name, len(plate_sts), len(poly.loops), patch.name))
            for loop, (s_m, t_m), plate_uv in zip(poly.loops, sts, plate_sts or ()):
                value = patch.uv(s_m, t_m)
                loop[lm].uv = value
                # The mirror law: a plate face's albedo UV carries the [0, 2] mapping;
                # every other face (and the lm layer always) keeps the chart mapping.
                loop[uv].uv = plate_uv if plate_sts is not None else value
        for poly in bm.faces:
            poly.smooth = False       # flat shading; the faces are planar
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        built = len(bm.faces)
        expected = ACCOUNT[obj.name]['expected']
        if built != expected:
            refuse('mesh %s built %d triangles, the law carries %d'
                   % (obj.name, built, expected))
        ACCOUNT[obj.name]['built'] = built
        bm.to_mesh(obj.data)
        bm.free()
    FINISH_QUEUE.clear()
    PENDING.clear()


def _bilinear3(corners, a, b):
    """The law's bilinear grid: (a, b) in [0, 1]^2 sweep the corners p0..p3 in loop order."""
    ab = 1.0 - a
    bb = 1.0 - b
    return tuple(ab * bb * corners[0][k] + a * bb * corners[1][k]
                 + a * b * corners[2][k] + ab * b * corners[3][k] for k in range(3))


def _bilinear2(corners, a, b):
    ab = 1.0 - a
    bb = 1.0 - b
    return (ab * bb * corners[0][0] + a * bb * corners[1][0]
            + a * b * corners[2][0] + ab * b * corners[3][0],
            ab * bb * corners[0][1] + a * bb * corners[1][1]
            + a * b * corners[2][1] + ab * b * corners[3][1])


def build_face(bm, face, account, build_geometry):
    """One law face -> its chart patch (always) and, when the face is built,
    its polygons bound to that patch (the D-10 per-face law). The allocation
    runs for EVERY face in BOTH modes so the exported glb's lm UVs address the
    same chart the bake lays out; DEC-005 keeps bake-only faces out of the glb
    (they exist only in the bake scene)."""
    face_id = _key(face, 'id', 'face')
    vertices = _key(face, 'vertices', 'face %s' % face_id)
    if len(vertices) < 3:
        refuse('law face %s carries %d vertices' % (face_id, len(vertices)))
    for p in vertices:
        if len(p) != 3 or not (math.isfinite(p[0]) and math.isfinite(p[1])
                               and math.isfinite(p[2])):
            refuse('law face %s carries a non-finite vertex' % face_id)
    normal = _key(face, 'normal', 'face %s' % face_id)
    slot = _key(face, 'materialSlot', 'face %s' % face_id)
    if slot not in SLOT_INDEXES:
        refuse('law face %s names unknown slot index %r' % (face_id, slot))
    visibility = _key(face, 'visibility', 'face %s' % face_id)
    if visibility not in ('exported', 'bake-only'):
        refuse('law face %s carries unknown visibility %r' % (face_id, visibility))
    tess = _key(face, 'tessellation', 'face %s' % face_id)
    kind = _key(tess, 'kind', 'face %s tessellation' % face_id)
    dus, dvs = patch_projections(vertices, normal)
    du_min, dv_min = min(dus), min(dvs)
    w_m = max(dus) - du_min
    h_m = max(dvs) - dv_min
    patch = CHART.add(face_id, w_m, h_m)
    if not build_geometry:
        return
    sts = [(du - du_min, dv - dv_min) for du, dv in zip(dus, dvs)]
    # The mirror law: the two ornament slots' faces are the plate faces — their albedo
    # UVs map the face's own metres to [0, PLATE_SPAN] on both axes (one face per slot,
    # the full 45.04 x 10.20 m field, so the face mapping IS the field mapping).
    plate = SLOT_IDS[slot] in PLATE_SLOTS
    if kind == 'bilinear-grid':
        if len(vertices) != 4:
            refuse('law face %s is a %d-vertex bilinear-grid (a grid needs four corners)'
                   % (face_id, len(vertices)))
        u_count = _key(tess, 'u', 'face %s tessellation' % face_id)
        v_count = _key(tess, 'v', 'face %s tessellation' % face_id)
        if not isinstance(u_count, int) or not isinstance(v_count, int) \
                or u_count < 1 or v_count < 1:
            refuse('law face %s carries grid counts %r x %r' % (face_id, u_count, v_count))
        built = 2 * u_count * v_count
        grid3 = [[_bilinear3(vertices, i / u_count, j / v_count)
                  for j in range(v_count + 1)] for i in range(u_count + 1)]
        gridst = [[_bilinear2(sts, i / u_count, j / v_count)
                   for j in range(v_count + 1)] for i in range(u_count + 1)]
        gridplate = [[_plate_uv(st, w_m, h_m) for st in row] for row in gridst] \
            if plate else None
        bverts = [[bm.verts.new(to_b(p)) for p in row] for row in grid3]
        first = None
        for i in range(u_count):
            for j in range(v_count):
                poly = bm.faces.new((bverts[i][j], bverts[i + 1][j],
                                     bverts[i + 1][j + 1], bverts[i][j + 1]))
                _bind(bm, poly, patch, (gridst[i][j], gridst[i + 1][j],
                                        gridst[i + 1][j + 1], gridst[i][j + 1]),
                      None if gridplate is None else
                      (gridplate[i][j], gridplate[i + 1][j],
                       gridplate[i + 1][j + 1], gridplate[i][j + 1]))
                if first is None:
                    first = poly
        account['quads'] += u_count * v_count
    elif kind == 'first-vertex-fan':
        built = len(vertices) - 2
        bverts = [bm.verts.new(to_b(p)) for p in vertices]
        first = None
        for k in range(1, len(vertices) - 1):
            poly = bm.faces.new((bverts[0], bverts[k], bverts[k + 1]))
            _bind(bm, poly, patch, (sts[0], sts[k], sts[k + 1]),
                  None if not plate else (_plate_uv(sts[0], w_m, h_m),
                                          _plate_uv(sts[k], w_m, h_m),
                                          _plate_uv(sts[k + 1], w_m, h_m)))
            if first is None:
                first = poly
        account['fan'] += built
    else:
        refuse('law face %s carries unknown tessellation kind %r' % (face_id, kind))
    declared = _key(face, 'triangles', 'face %s' % face_id)
    if declared != built:
        refuse('law face %s declares %d triangles, its tessellation builds %d'
               % (face_id, declared, built))
    # The winding audit: the law's normal is derived from the same ordered loop
    # (normalOf) and to_b preserves orientation, so the first polygon's bmesh
    # normal must agree with the rotated law normal — a flip would be a build bug.
    first.normal_update()
    expected_normal = to_b(normal)
    n = first.normal
    if n.x * expected_normal[0] + n.y * expected_normal[1] + n.z * expected_normal[2] < 0.5:
        refuse('law face %s winds against its normal' % face_id)
    account['faces'] += 1
    account['patches'] += 1
    account['expected'] += declared


def build_slot_meshes(collection, materials, build_all):
    """One merged mesh per slot, created in slot order; faces in law order.
    In export mode only the exported faces build geometry (DEC-005: the
    rail-frusta union is the modelled area; bake-only faces live in the bake
    scene alone), while every face still claims its chart patch."""
    parts = []
    for slot in range(len(SLOT_IDS)):
        name = SLOT_IDS[slot]
        obj, bm = _new_part(collection, name)
        _layers(bm)
        account = {'faces': 0, 'patches': 0, 'quads': 0, 'fan': 0, 'expected': 0, 'built': 0}
        ACCOUNT[name] = account
        for group in CLASSES:                       # law order
            for instance in group['instances']:     # law order
                for face in _key(instance, 'faces', 'instance %s'
                                 % instance.get('id', '?')):
                    if face.get('materialSlot') != slot:
                        continue
                    build_this = build_all or face['visibility'] == 'exported'
                    build_face(bm, face, account, build_this)
        if account['faces'] == 0:
            refuse('slot %s (index %d) built no faces' % (name, slot))
        obj.data.materials.append(materials[name])
        parts.append(_finish(obj, bm))
    return parts


# ---- the summary (the sibling shape: per-mesh triangles/faces/draw materials) ----
def build_summary():
    meshes = {}
    for name in SLOT_IDS:
        account = ACCOUNT[name]
        meshes[name] = {'faces': account['faces'],
                        'lmPatches': account['patches'],
                        'materials': [name],
                        'triangles': account['built']}
    drawn = 0
    bake_only = 0
    class_rows = {}
    sources = set()
    for group in CLASSES:
        cid = _key(group, 'id', 'class')
        sources.add(_key(group, 'source', 'class %s' % cid))
        exported_faces = bake_only_faces = 0
        exported_tris = bake_only_tris = 0
        for instance in group['instances']:
            for face in _key(instance, 'faces', 'instance of class %s' % cid):
                if face['visibility'] == 'exported':
                    exported_faces += 1
                    exported_tris += _key(face, 'triangles', 'face %s' % face['id'])
                else:
                    bake_only_faces += 1
                    bake_only_tris += _key(face, 'triangles', 'face %s' % face['id'])
        drawn += exported_tris
        bake_only += bake_only_tris
        class_rows[cid] = {'bakeOnlyFaces': bake_only_faces,
                           'bakeOnlyTriangles': bake_only_tris,
                           'count': group.get('count'),
                           'exportedFaces': exported_faces,
                           'exportedTriangles': exported_tris}
    for row in SLOTS_ROWS:
        sources.add(_key(row, 'source', 'law.materialSlots'))
    return {
        'room': ROOM_ID,
        'schema': SCHEMA,
        'meshes': meshes,
        'trianglesDrawn': drawn,
        'trianglesUnique': drawn,      # no instancing credit (the census basis)
        'trianglesBakeOnly': bake_only,
        'draws': len(meshes),
        'lm': {'canvasM': CHART.canvas_m,
               'padM': CHART.pad_m,
               'minPatchM': CHART.min_m,
               'patches': len(CHART.patches),
               'totalPatchArea': LM['totalPatchArea'],
               'densityShellPxPerM': LM['densityShellPxPerM'],
               'densityFinalPxPerM': LM['densityFinalPxPerM'],
               'shellRes': CHART.shell_res,
               'finalRes': int(LM['finalRes'])},
        'slots': list(SLOT_IDS),
        'declared': {
            'lawSchema': LAW_SCHEMA,
            'frame': {'X0': FRAME['X0'], 'AXIS_Z': FRAME['AXIS_Z'],
                      'FLOOR_Y': FRAME['FLOOR_Y'], 'CEILING_Y': FRAME['CEILING_Y']},
            'bounds': {'min': FRAME['bounds']['min'], 'max': FRAME['bounds']['max']},
            'box': {'min': BOX['min'], 'max': BOX['max']},
            'classes': class_rows,
            'sources': sorted(sources),
            'caps': CAPS,
            'zero': 'no runtime JS; data only',
        },
    }


# ---- the bake-mode layout write (the bake side's verification input) -------------
# Under ZIMNY_BAKE=1 the builder writes the layout the bake verifies:
# {res, canvasM, padM, minPatchM, patches: {faceId: {x, y, w, h}}} — the placed
# islands in METRES (res = the shell resolution), honouring ZIMNY_LM_LAYOUT_OUT
# (tools/bpy/bake.py build_room) when set. No layoutHash key anywhere
# (asset.mjs's layout-identity gate stays dormant for this room).

def write_lm_layout(stage):
    env = os.environ.get('ZIMNY_LM_LAYOUT_OUT')
    path = env if env else os.path.join(stage, 'lm', 'cells.json')
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    block = {
        'res': CHART.shell_res,
        'canvasM': CHART.canvas_m,
        'padM': CHART.pad_m,
        'minPatchM': CHART.min_m,
        'patches': {patch.name: {'x': patch.x, 'y': patch.y,
                                 'w': patch.island_w, 'h': patch.island_h}
                    for patch in CHART.patches},
    }
    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(block, handle, sort_keys=True, indent=2, allow_nan=False)
        handle.write('\n')


# ---- export (the jordan flag set, verbatim) ---------------------------------------
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


# ---- the stage handoff (the sibling rooms' INT grammar) ---------------------------
def stage_dir():
    argv = sys.argv
    for flag in ('--out', '--stage'):
        if flag in argv:
            index = argv.index(flag) + 1
            if index >= len(argv):
                refuse('%s requires a path' % flag)
            return os.path.abspath(argv[index])
    for arg in argv:
        if arg.startswith('--out=') or arg.startswith('--stage='):
            return os.path.abspath(arg.split('=', 1)[1])
    if '--' in argv and len(argv) > argv.index('--') + 1:
        rest = argv[argv.index('--') + 1:]
        if rest and not rest[0].startswith('-'):
            return os.path.abspath(rest[0])
    env = os.environ.get('ZIMNY_STAGE_DIR') or os.environ.get('ZIMNY_STAGE')
    if env:
        return os.path.abspath(env)
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def room_arg():
    argv = sys.argv
    if '--room' in argv:
        index = argv.index('--room') + 1
        if index >= len(argv):
            refuse('--room requires a value')
        return argv[index]
    return None


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(collection)
    return collection


def stage_plates(stage):
    """Copy the rastered plates into the stage's tex/ dir verbatim — the exact names
    tools/gltf/st-george.mjs's stageTextures/encodeTextures consume (tex/<slot>.png)."""
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    for slot, palette in ORNAMENT_PLATES.items():
        src = os.path.join(SCRIPT_DIR, 'st-george-ornament-%s.png' % palette)
        shutil.copyfile(src, os.path.join(tex_dir, slot + '.png'))


def main():
    declared_room = room_arg()
    if declared_room is not None and declared_room != ROOM_ID:
        refuse('--room %s does not name this builder (%s)' % (declared_room, ROOM_ID))
    load_law()
    global CHART
    collection = reset_scene()
    materials = make_materials()
    CHART = MetreChart(LM)
    parts = build_slot_meshes(collection, materials, build_all=BAKE)

    # The pack runs once every face is authored; the finishing is deferred to it.
    CHART.pack()
    if len(CHART.patches) != LM['patchCount']:
        refuse('packed %d lightmap patches, the law carries %d'
               % (len(CHART.patches), LM['patchCount']))
    law_faces = sum(len(_key(instance, 'faces', 'instance of class %s'
                             % group.get('id', '?'))
                         ) for group in CLASSES for instance in group['instances'])
    if BAKE:
        expected_faces = law_faces
    else:
        # DEC-005: the glb carries the exported faces only.
        expected_faces = sum(
            1 for group in CLASSES for instance in group['instances']
            for face in _key(instance, 'faces', 'instance of class %s'
                             % group.get('id', '?'))
            if face['visibility'] == 'exported')
    built_faces = sum(ACCOUNT[name]['faces'] for name in SLOT_IDS)
    if built_faces != expected_faces:
        refuse('built %d of the %s %d faces'
               % (built_faces, 'law' if BAKE else 'law exported', expected_faces))
    _finish_all()

    stage = stage_dir()
    os.makedirs(stage, exist_ok=True)
    if BAKE:
        write_lm_layout(stage)
        return

    stage_plates(stage)
    export_glb(os.path.join(stage, ROOM_ID + '.glb'))
    sys.stdout.write('ZIMNY_SUMMARY %s\n' % json.dumps(
        build_summary(), sort_keys=True, separators=(',', ':'), allow_nan=False))


main()

# The bake registration's fallback constants (bake.py chart_contract reads them from the
# builder namespace): the shell bake runs at the SHELL resolution; the step-5 final bake
# flips LM_RES to LM['finalRes'] (the metre canvas keeps the UVs resolution-independent,
# so the glb does not change). They sit after main() because the law globals exist only
# once load_law() has run inside it.
LM_RES = LM['shellRes']
LM_PAD_PX = LM['padPx']
