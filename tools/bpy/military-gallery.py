# Zimny Phase 3 R1b / R4a — military-gallery room kit (Blender 4.2 LTS, headless).
# Run by tools/asset.mjs `bpy military-gallery` (stem = room id verbatim).
#
# Implements design-gallery.md §2.2 (placement), §2.4 (palette), §2.5/§2.6
# (kit), §3.1 (kit list), DEC-024 (torchere candelabra, DEC-028 night law)
# with the frame kit in tools/bpy/military_gallery_frames.py.
# R4 Slice A (light delta): MG_candle carries the committed emission
# (CANDLE_EMISSION_RGB x CANDLE_EMISSION — the jordan parity value read from
# tools/bpy/jordan.py's committed constants); every architecture face writes
# its 'lm' UV from the packed architecture chart
# (tools/bpy/military_gallery_chart.py). The pack runs once every part is
# authored, so face finishing is deferred to _finish_all().
#
# Writes:  <stage>/military-gallery.raw.glb
#          <stage>/tex/military-gallery-parquet.png (math-only, 512x512)
#          <stage>/arch-chart.json (EVERY run, bake runs included: the bake
#          stage is the builder's stage; the gltf step copies it to its
#          committed home tools/gallery/arch-chart.json)
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` line.
# INT: stage-dir handoff mirrors the sibling rooms (asset.mjs invokes
# `... -P <py> -- --room <id> --out <stage>`; also --stage, positional,
# ZIMNY_STAGE_DIR).
#
# Bake contract (read by tools/bpy/bake.py from this module's namespace):
#   LM_CHARTS {arch: {res, pad}, kit: {res, pad, objectPrefixes}}
#   LM_RES / LM_PAD_PX      the arch chart (legacy single-chart readers)
#   ARCH_CHART              the packed chart dict (== arch-chart.json), set by main()
#
# Deterministic: no randomness, no clock, every dimension a named constant,
# stable part names for the gltf-transform pass. Repeat runs byte-identical.
# ZIMNY_BAKE=1: build the scene + the chart, skip export/summary.

import bmesh
import bpy
from mathutils import Vector

import os
import sys

BAKE = os.environ.get('ZIMNY_BAKE') == '1'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
import military_gallery_frames as frames_kit  # noqa: E402

import military_gallery_chart as chart_kit  # noqa: E402

import json  # noqa: E402
import math  # noqa: E402
ROOM_ID = 'military-gallery'
PARQUET_TEX_NAME = 'military-gallery-parquet.png'
TEX_SIZE = 512
UV_LIGHTMAP = frames_kit.UV_LIGHTMAP

# ---- shell (design-gallery.md §2.2; metres, glTF world axes) -----------------
WALL_X_WEST = 82.0
WALL_X_EAST = 90.5
WALL_Z_NORTH = -40.0
WALL_Z_SOUTH = 15.0
FLOOR_Y = 10.0             # the committed jordan landing floor height (§2.2)
SPRING_Y = 16.5            # vault springing / the cornice band's top
VAULT_RISE = 2.0           # crown at floor+8.5
LANTERN_KERB_H = 0.3
LANTERN_PITCH_H = 0.8      # lantern ridge at floor+9.6 (bounds Y max 19.7)

# ---- vault                                                                   -
VAULT_SEGMENTS = 40         # 8 segments per coffer row: mouths on profile vertices (R4c)
COFFER_ROWS = 5
COFFER_COLS = 22
COFFER_INSET = 0.18
COFFER_MARGIN = 0.35

# ---- lantern (one authored glazed lantern, merged over three placements) ----
LANTERN_Z = (-27.0, -12.5, 2.0)
LANTERN_LEN = 10.0
LANTERN_WIDTH = 3.0
LANTERN_BARS = 6
LANTERN_BAR_W = 0.10
LANTERN_BAR_D = 0.08

# ---- doors (K4: one authored double-door panel, parametric width, six reuses) --
DOOR_W = 1.9                # the north entry pair (the passage look)
SOUTH_DOOR_W = 0.8          # the portal's flanking dark pairs (Hau's narrow panels)
BLIND_DOOR_W = 1.4          # the long-wall blinds: their jamb boxes span [W/2, W/2+CASE],
                            # which must clear the pair's shafts (outer 0.675) below and
                            # the canvases' near edge (0.785) above
DOOR_H = 3.4
DOOR_LEAF_INSET = 0.04
DOOR_PANEL_D = 0.10
DOOR_CASE_W = 0.06          # R4 fit re-fit: the case span (W/2+CASE) must clear the
                            # flanking/ally frames and sit inside the end walls
NORTH_DOOR_SWING = 0.0      # the entry pair reads as the airlock face (closed)
SOUTH_DOOR_INSET = 0.50     # the flanking pairs' stations at mid+/-3.75: the case
                            # span [3.29..4.21] sits inside the 4.25 half-width corner
BLIND_DOOR_BAYS = (2, 9)    # pier indices per long wall (of 12): z -30/+5, symmetric
                            # about the hall's mid, both PLAIN piers (the old (4, 8) sat
                            # the blind doors inside the engaged columns at piers 4/8)

# ---- the St George doorway (mg-1812-look DECISION-1; design §2.5's seat) ------
# A real opening in the east wall's last bay: the wall plane is x 90.5, the centre
# line z 12.5, the opening DOOR_W × DOOR_H; the reveal runs DOOR_REVEAL_D deep into
# the unmodelled gap (x 90.5..91.0) and bakes dark (the 'door' material); the two
# leaves are SEPARATE hinge-pivoted nodes (leaf_sg_n/s, origins at the jambs) the
# runtime swings (src/world/door.ts). The kit frame zone is excluded by the layout
# law's DOOR_ZONE (tools/gallery/layout.mjs) — the bay's centre column rows 1..4
# drop, the top row rides over the door.
SG_DOOR_Z = 12.5            # the opening's centre line on the east wall
SG_REVEAL_D = 0.5           # the reveal depth into the unmodelled gap (to x 91.0)

# ---- piers (twelve per wall between the law's eleven portrait bays) ---------
PIERS_PER_WALL = 12
PILASTER_W = 0.30           # R4 fit re-fit (owner-ruled): the pair's shafts span
                            # pier+/-0.375..0.675, so the clear wall between adjacent
                            # pairs is 5-2x0.675 = 3.65 m and the frame kit's 3.57 m
                            # span now clears by 4 cm a side (at 0.55/0.9 the bay-end
                            # canvases sat ~61% inside the shafts)
PILASTER_D = 0.14
PILASTER_PAIR_GAP = 0.75    # >= ~0.7: the wide piers' engaged columns (r 0.32) must
                            # clear the pair's inner faces (0.375 > 0.32 + 5 cm)
CAP_H = 0.35
CAP_FLARE = 0.06
BASE_H = 0.45
COLUMN_R = 0.32
COLUMN_SIDES = 12
WIDE_PIER_EVERY = 4        # piers 0/4/8 carry the engaged light-stone columns

# ---- torchere candelabra (DEC-026: the night state's light bearers) ---------
TORCHERE_H = 2.4
TORCHERE_BASE_R = 0.16
TORCHERE_STEM_R = 0.05
TORCHERE_SIDES = 10
TORCHERE_CANDLES = 5
TORCHERE_CANDLE_R = 0.025
TORCHERE_CANDLE_H = 0.18
TORCHERE_RING_R = 0.18
TORCHERE_WALL_OFF = 0.9

# ---- benches -----------------------------------------------------------------
BENCH_L = 1.8
BENCH_W = 0.5
BENCH_H = 0.45
BENCH_WALL_OFF = 0.9
BENCHES_PER_WALL = 7

# ---- K8 monarch portal surround (the south end wall composition) -------------
PORTAL_PED_W = 2.4
PORTAL_PED_H = 0.9
PORTAL_PED_D = 0.3
PORTAL_VALANCE_W = 0.24
PORTAL_VALANCE_H = 0.3
PORTAL_VALANCE_COUNT = 5
PORTAL_STEP_W = 2.4
PORTAL_STEP_D = 1.2
PORTAL_STEP_H = 0.15
PORTAL_LEAF_W = 1.2
PORTAL_LEAF_H = 3.6
PORTAL_LEAF_OFF = 3.5      # the two dark panels near the end-wall corners (§2.7)

# ---- materials (§2.4 palette; flat colours except the procedural parquet) ----
CRIMSON_RGB = (0.520, 0.115, 0.155)
PLASTER_RGB = (0.700, 0.690, 0.660)
VAULT_RGB = (0.660, 0.650, 0.630)
GILT_RGB = (0.550, 0.410, 0.150)
STONE_RGB = (0.520, 0.510, 0.480)
GLASS_RGB = (0.020, 0.024, 0.030)   # §2.4 dark glass — the BAKE-side pane (R4 D-23)
DOOR_RGB = (0.160, 0.100, 0.060)
UPHOLSTERY_RGB = (0.240, 0.055, 0.075)
CANDLE_RGB = (0.850, 0.820, 0.740)
CANVAS_RGB = (0.230, 0.180, 0.150)   # the R1 placeholder; the atlas lands in R2
CARPET_RGB = (0.260, 0.048, 0.062)
PARQUET_LIGHT_RGB = (0.420, 0.280, 0.150)
PARQUET_DARK_RGB = (0.240, 0.150, 0.085)
PARQUET_LINE_RGB = (0.180, 0.115, 0.065)
PARQUET_BAKE_RGB = (0.330, 0.215, 0.118)  # mean of light/dark: the bake's floor albedo
FLOOR_UV_REPEAT = 1.0                 # one 0..1 sweep; repeat is the runtime's law (R3)

# ---- light (R4 D-2: MG_candle emissive; DEC-028) ----------------------------
# ~2700 K in linear sRGB: sRGB (255, 169, 87) linearised (the relay draft's
# revision of Block 2's first sketch — the actual linearisation of 2700 K).
CANDLE_EMISSION_RGB = (1.000, 0.405, 0.094)
# Block 2's first guess was the jordan fixture parity 6.0; the first bake
# CONTRADICTED its own flagged units assumption (walls 0.04 vs the assumed 0.3,
# the kit frames quantising to codes 0-1 = the r17c death class). The draft's
# own placeholder value 40.0 lands the estimate: walls ~0.25, the M1 frames
# ~0.1 -> codes 20-40. A retune = this constant + a NIGHT re-bake (the probe and
# the composed dusk re-encode from the EXRs, minutes).
CANDLE_EMISSION = 40.0

PARQUET_CHECKS = 8
PARQUET_DIAMOND_INSET = 0.15
PARQUET_LINE_W = 0.06

COLLECTION_NAME = 'MilitaryGallery'

# ---- the bake contract (tools/bpy/bake.py reads these names) -----------------
_LAYOUT = frames_kit.read_layout(SCRIPT_DIR)
_LAYOUT_LM = _LAYOUT['lightmap']
LM_RES = chart_kit.ARCH_CHART_RES
LM_PAD_PX = chart_kit.ARCH_CHART_PAD_PX
LM_CHARTS = {
    'arch': {'res': LM_RES, 'pad': LM_PAD_PX},
    'kit': {
        'res': int(_LAYOUT_LM['sizePx']),
        'pad': int(_LAYOUT_LM['padPx']),
        'objectPrefixes': (frames_kit.FRAME_PART_PREFIX + '_',
                           frames_kit.CANVAS_PART_PREFIX + '_'),
    },
}
ARCH_CHART = None   # set by main(): the packed chart dict (== arch-chart.json)
CHART = None        # the ArchChart registry, created in main()
PENDING = {}        # id(bm) -> [(face, patch, ((s, t), ...)), ...]
FINISH_QUEUE = []   # (obj, bm, shade_flat) — finished after CHART.pack()


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def _wm(gx, gy, gz):
    return Vector(to_b((gx, gy, gz)))


def stage_dir():
    """INT: the stage handoff, canary-parity with the sibling rooms."""
    argv = sys.argv
    for flag in ('--out', '--stage'):
        if flag in argv:
            return os.path.abspath(argv[argv.index(flag) + 1])
    for arg in argv:
        if arg.startswith('--out=') or arg.startswith('--stage='):
            return os.path.abspath(arg.split('=', 1)[1])
    if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 2:
        return os.path.abspath(sys.argv[sys.argv.index('--') + 2])
    env = os.environ.get('ZIMNY_STAGE_DIR')
    if env:
        return os.path.abspath(env)
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def hall_span():
    return (WALL_X_EAST - WALL_X_WEST, WALL_Z_SOUTH - WALL_Z_NORTH)


def hall_mid_x():
    return (WALL_X_WEST + WALL_X_EAST) * 0.5


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(collection)
    return collection


def make_materials():
    flats = (
        ('crimson', CRIMSON_RGB), ('plaster', PLASTER_RGB), ('vault', VAULT_RGB),
        ('gilt', GILT_RGB), ('stone', STONE_RGB), ('glass', GLASS_RGB),
        ('door', DOOR_RGB), ('upholstery', UPHOLSTERY_RGB),
        ('candle', CANDLE_RGB), ('canvas', CANVAS_RGB),
        ('carpet', CARPET_RGB),
        ('parquet', PARQUET_BAKE_RGB if BAKE else (0.4, 0.4, 0.4)),
    )
    made = {}
    for name, rgb in flats:
        mat = bpy.data.materials.new('MG_' + name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        made[name] = mat
    # D-2: the candles are the night state's only light; the exporter writes the
    # emissive strength, the runtime never state-gates it (the F11 law).
    candle = made['candle'].node_tree.nodes['Principled BSDF']
    candle.inputs['Emission Color'].default_value = (
        CANDLE_EMISSION_RGB[0], CANDLE_EMISSION_RGB[1], CANDLE_EMISSION_RGB[2], 1.0)
    candle.inputs['Emission Strength'].default_value = CANDLE_EMISSION
    return made


def _new_part(collection, name):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj, bmesh.new()


def _bind(bm, face, patch, sts):
    """Record a face's (s, t) metres per loop against its chart patch; resolved in _finish_all."""
    PENDING.setdefault(id(bm), []).append((face, patch, tuple(sts)))
    return face


def _finish(obj, bm, shade_flat):
    FINISH_QUEUE.append((obj, bm, shade_flat))
    return obj


def _finish_all():
    """Resolve every pending 'lm' loop from the packed chart, then triangulate + commit."""
    for obj, bm, shade_flat in FINISH_QUEUE:
        lm = bm.loops.layers.uv.get(UV_LIGHTMAP)
        bound = PENDING.get(id(bm), ())
        if len(bound) != len(bm.faces):
            raise AssertionError('%s: %d of %d faces carry no lightmap patch'
                                 % (obj.name, len(bm.faces) - len(bound), len(bm.faces)))
        for face, patch, sts in bound:
            if len(sts) != len(face.loops):
                raise AssertionError('%s: %d (s,t) pairs for a %d-loop face on %s'
                                     % (obj.name, len(sts), len(face.loops), patch.name))
            for loop, (s, t) in zip(face.loops, sts):
                loop[lm].uv = patch.uv(s, t)
        if shade_flat:
            for face in bm.faces:
                face.smooth = False
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(obj.data)
        bm.free()
    FINISH_QUEUE.clear()
    PENDING.clear()


def _layers(bm):
    return bm.loops.layers.uv.new('uv'), bm.loops.layers.uv.new(UV_LIGHTMAP)


def face_patch(bm, face, part):
    """Bind `face` to its OWN chart patch (D-10's per-face law): w/h from the face's
    in-plane extents (u = the longest loop edge, first-max on ties), (s, t) metres per loop."""
    pts = [v.co.copy() for v in face.verts]
    origin = pts[0]
    best = None
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        d = pts[j] - pts[i]
        length = d.length
        if best is None or length > best[0] + 1e-9:
            best = (length, d * (1.0 / length) if length > 1e-9 else Vector((1.0, 0.0, 0.0)))
    u = best[1]
    # bmesh computes normals lazily — a fresh face's .normal reads (0, 0, 0); derive the
    # in-plane normal from the verts themselves (the first non-collinear triple).
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
    for i in range(2, len(pts)) if n.length <= 1e-9 else ():
        n = (pts[1] - pts[0]).cross(pts[i] - pts[0])
        if n.length > 1e-9:
            break
    if n.length < 1e-9:
        n = Vector((0.0, 1.0, 0.0))
    n = n * (1.0 / n.length)
    v = n.cross(u)
    if v.length < 1e-9:
        v = Vector((0.0, 0.0, 1.0)) if abs(u.z) < 0.9 else Vector((1.0, 0.0, 0.0))
    v = v * (1.0 / v.length)
    dus = [(p - origin).dot(u) for p in pts]
    dvs = [(p - origin).dot(v) for p in pts]
    w_m = max(dus) - min(dus)
    h_m = max(dvs) - min(dvs)
    patch = CHART.add(part, w_m, h_m)
    _bind(bm, face, patch, [(du - min(dus), dv - min(dvs)) for du, dv in zip(dus, dvs)])
    return face


def add_box(bm, centre, half, part):
    """Axis-aligned box in WORLD coordinates; every face binds to its OWN chart patch (D-10)."""
    cx, cy, cz = centre
    hx, hy, hz = half
    coords = []
    for sy in (-hy, hy):
        for sx, sz in ((-hx, -hz), (hx, -hz), (hx, hz), (-hx, hz)):
            coords.append(_wm(cx + sx, cy + sy, cz + sz))
    verts = [bm.verts.new(c) for c in coords]
    quads = ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0))
    return [face_patch(bm, bm.faces.new([verts[i] for i in q]), part) for q in quads]


def add_prism(bm, centre, radius, height, sides, taper=1.0, part=None):
    """Vertical n-gon prism, flat caps; the lateral surface unrolls into one chart patch
    (the relay draft's tight prism net — adopted: width = perimeter + two cap diameters).
    Winding: every face runs so its normal points OUT of the prism (the R4 winding
    audit — the previous order faced every normal inward and the bake read the
    columns/torcheres as black)."""
    cx, cy, cz = centre
    lower = []
    upper = []
    angles = []
    for i in range(sides):
        a = 2.0 * math.pi * i / float(sides)
        angles.append(a)
        dx = math.cos(a)
        dz = math.sin(a)
        lower.append(bm.verts.new(_wm(cx + dx * radius, cy, cz + dz * radius)))
        upper.append(bm.verts.new(_wm(cx + dx * radius * taper, cy + height,
                                      cz + dz * radius * taper)))
    net_w, net_h, chord, perim = chart_kit.prism_net(radius, height, sides)
    patch = CHART.add(part, net_w, net_h)
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        face = bm.faces.new((lower[i], upper[i], upper[j], lower[j]))
        st = chart_kit.prism_side_st(i, chord, height)
        faces.append(_bind(bm, face, patch, (st[0], st[3], st[2], st[1])))
    bottom = bm.faces.new(tuple(lower))
    faces.append(_bind(bm, bottom, patch,
                       chart_kit.prism_cap_st(tuple(angles), radius, perim)))
    top = bm.faces.new(tuple(reversed(upper)))
    faces.append(_bind(bm, top, patch,
                       chart_kit.prism_cap_st(tuple(reversed(angles)), radius,
                                              perim + 2.0 * radius)))
    return faces


def read_metrics():
    return _LAYOUT['metrics']


def bay_centres(metrics):
    centres = metrics['bayCentresZ']
    assert len(centres) == 11, 'the layout law carries eleven bay centres'
    return tuple(float(z) for z in centres)


def pier_centres(metrics):
    """Twelve pier positions per long wall: the bay-pitch midpoints, extended
    half a pitch at both ends so the run closes against the end walls."""
    centres = bay_centres(metrics)
    pitch = float(metrics['bayPitchZ'])
    mids = [centres[0] - pitch * 0.5]
    for i in range(len(centres) - 1):
        mids.append((centres[i] + centres[i + 1]) * 0.5)
    mids.append(centres[-1] + pitch * 0.5)
    assert len(mids) == PIERS_PER_WALL, 'the bay law must close at twelve piers'
    return tuple(mids)


def lantern_overlaps():
    """The kit-chart of vault columns to skip under the lantern footprints:
    the crown stays bare where a lantern kerb lands (the specialist's catch)."""
    half_l = LANTERN_LEN * 0.5 + COFFER_MARGIN
    return tuple((z - half_l, z + half_l) for z in LANTERN_Z)


def write_parquet_texture(stage):
    """Deterministic checker-diamond tile, math-only, square PNG."""
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    size = TEX_SIZE
    image = bpy.data.images.new(PARQUET_TEX_NAME, width=size, height=size,
                                alpha=False, float_buffer=False)
    checks = PARQUET_CHECKS
    cell = size / float(checks)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        for px in range(size):
            u = (px + 0.5) / cell
            v = (py + 0.5) / cell
            cu = u - math.floor(u)
            cv = v - math.floor(v)
            parity = (int(math.floor(u)) + int(math.floor(v))) % 2
            base = PARQUET_LIGHT_RGB if parity == 0 else PARQUET_DARK_RGB
            other = PARQUET_DARK_RGB if parity == 0 else PARQUET_LIGHT_RGB
            d = abs(2.0 * cu - 1.0) + abs(2.0 * cv - 1.0)
            rgb = other if d <= (1.0 - PARQUET_DIAMOND_INSET) else base
            if (cu < PARQUET_LINE_W or cu > 1.0 - PARQUET_LINE_W
                    or cv < PARQUET_LINE_W or cv > 1.0 - PARQUET_LINE_W):
                rgb = PARQUET_LINE_RGB
            o = (py * size + px) * 4
            pixels[o] = rgb[0]
            pixels[o + 1] = rgb[1]
            pixels[o + 2] = rgb[2]
            pixels[o + 3] = 1.0
    image.pixels = pixels
    image.filepath_raw = os.path.join(tex_dir, PARQUET_TEX_NAME)
    image.file_format = 'PNG'
    image.save()
    return image


def wire_parquet(materials, image):
    mat = materials['parquet']
    tree = mat.node_tree
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Closest'
    tex.location = (-400.0, 0.0)
    bsdf = tree.nodes['Principled BSDF']
    tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])


def build_floor(collection, materials):
    obj, bm = _new_part(collection, 'floor')
    uv, _ = _layers(bm)
    mid_x = hall_mid_x()
    span_x, span_z = hall_span()
    half_x = span_x * 0.5
    repeats = FLOOR_UV_REPEAT
    # The floor patch runs (s = along Z, t = across X): transposed so the packer's
    # height-descending shelves meet a 1980-wide slab, never a 1980-tall one.
    # Winding: the corners run COUNTERCLOCKWISE seen from above (+Y up) so the
    # face's normal points INTO the room (the R4 night-bake winding audit).
    corners = (((mid_x - half_x, FLOOR_Y, WALL_Z_NORTH), (0.0, 0.0)),
               ((mid_x - half_x, FLOOR_Y, WALL_Z_SOUTH), (span_z, 0.0)),
               ((mid_x + half_x, FLOOR_Y, WALL_Z_SOUTH), (span_z, span_x)),
               ((mid_x + half_x, FLOOR_Y, WALL_Z_NORTH), (0.0, span_x)))
    face = _plane(bm, corners, CHART.add('floor', span_z, span_x, 'parquet'))
    uvs = ((0.0, 0.0), (repeats, 0.0), (repeats, repeats), (0.0, repeats))
    for i, loop in enumerate(face.loops):
        loop[uv].uv = uvs[i]
    obj.data.materials.append(materials['parquet'])
    return _finish(obj, bm, True)


def build_walls(collection, materials):
    """Crimson portrait fields on the long walls below the cornice band; plaster above and
    on both end walls. One developable patch per wall face (D-10) — EXCEPT the east wall's
    doorway (mg-1812-look DECISION-1): the opening (z 11.55..13.45, y 10..13.4) splits the
    east crimson field into three pieces, each its own patch; the reveal's dark quads close
    the hole (build_doorway)."""
    span_x, span_z = hall_span()
    half_x = span_x * 0.5
    mid_x = hall_mid_x()
    band_y = SPRING_Y - 0.9           # the portrait fields run floor..band
    field_h = band_y - FLOOR_Y
    crimson, bm_c = _new_part(collection, 'wall_crimson')
    _, _ = _layers(bm_c)
    west_x, west_nx, west_tag = WALL_X_WEST, 1.0, 'west'
    patch = CHART.add('wall_crimson', span_z, field_h, west_tag)
    _wall(bm_c, (west_x, FLOOR_Y, WALL_Z_NORTH),
          (west_x, FLOOR_Y, WALL_Z_SOUTH),
          (west_x, band_y, WALL_Z_SOUTH),
          (west_x, band_y, WALL_Z_NORTH),
          ((0.0, 0.0), (span_z, 0.0), (span_z, field_h), (0.0, field_h)),
          west_nx > 0.0, patch)
    # The east field around the opening: left (north) of it, right (south) of it, above it.
    # The (s, t) metres restart at each piece's own corner (D-10's per-face law).
    east_x = WALL_X_EAST
    opening_lo = SG_DOOR_Z - DOOR_W * 0.5   # z 11.55
    opening_hi = SG_DOOR_Z + DOOR_W * 0.5   # z 13.45
    opening_top = FLOOR_Y + DOOR_H          # y 13.4
    z_north = WALL_Z_NORTH
    z_south = WALL_Z_SOUTH
    span_left = opening_lo - z_north
    patch_l = CHART.add('wall_crimson', span_left, field_h, 'east-left')
    _wall(bm_c, (east_x, FLOOR_Y, z_north),
          (east_x, FLOOR_Y, opening_lo),
          (east_x, band_y, opening_lo),
          (east_x, band_y, z_north),
          ((0.0, 0.0), (span_left, 0.0), (span_left, field_h), (0.0, field_h)),
          False, patch_l)
    span_right = z_south - opening_hi
    patch_r = CHART.add('wall_crimson', span_right, field_h, 'east-right')
    _wall(bm_c, (east_x, FLOOR_Y, opening_hi),
          (east_x, FLOOR_Y, z_south),
          (east_x, band_y, z_south),
          (east_x, band_y, opening_hi),
          ((0.0, 0.0), (span_right, 0.0), (span_right, field_h), (0.0, field_h)),
          False, patch_r)
    span_over = opening_hi - opening_lo
    height_over = band_y - opening_top
    patch_t = CHART.add('wall_crimson', span_over, height_over, 'east-over')
    _wall(bm_c, (east_x, opening_top, opening_lo),
          (east_x, opening_top, opening_hi),
          (east_x, band_y, opening_hi),
          (east_x, band_y, opening_lo),
          ((0.0, 0.0), (span_over, 0.0), (span_over, height_over), (0.0, height_over)),
          False, patch_t)
    obj = _finish(crimson, bm_c, True)
    obj.data.materials.append(materials['crimson'])
    plaster, bm_p = _new_part(collection, 'wall_plaster')
    _, _ = _layers(bm_p)
    band_h = SPRING_Y - band_y
    for wall_x, nx, tag in ((WALL_X_WEST, 1.0, 'band-west'), (WALL_X_EAST, -1.0, 'band-east')):
        patch = CHART.add('wall_plaster', span_z, band_h, tag)
        _wall(bm_p, (wall_x, band_y, WALL_Z_NORTH),
              (wall_x, band_y, WALL_Z_SOUTH),
              (wall_x, SPRING_Y, WALL_Z_SOUTH),
              (wall_x, SPRING_Y, WALL_Z_NORTH),
              ((0.0, 0.0), (span_z, 0.0), (span_z, band_h), (0.0, band_h)),
              nx > 0.0, patch)
    wall_h = SPRING_Y - FLOOR_Y
    for wall_z, nz, tag in ((WALL_Z_NORTH, 1.0, 'end-north'), (WALL_Z_SOUTH, -1.0, 'end-south')):
        patch = CHART.add('wall_plaster', span_x, wall_h, tag)
        _wall(bm_p, (mid_x - half_x, FLOOR_Y, wall_z),
              (mid_x + half_x, FLOOR_Y, wall_z),
              (mid_x + half_x, SPRING_Y, wall_z),
              (mid_x - half_x, SPRING_Y, wall_z),
              ((0.0, 0.0), (span_x, 0.0), (span_x, wall_h), (0.0, wall_h)),
              nz < 0.0, patch)
        # R4c: the wall meets the barrel — the tympanum closes the wall's flat top
        # (SPRING_Y) against the arc, whose sub-segments are the soffit's edge here.
        # Vertex order (arc west->east, chord return) winds the normal to -z; the
        # north end wall must face +z (south, into the hall), so it flips alone.
        tym = CHART.add('wall_plaster', span_x, VAULT_RISE, tag.replace('end', 'tympanum'))
        arc = list(vault_profile())
        ty = bm_p.faces.new([bm_p.verts.new(_wm(px, py, wall_z)) for px, py in arc])
        if nz > 0.0:
            ty.normal_flip()
        _bind(bm_p, ty, tym, [(p[0] - (mid_x - half_x), p[1] - SPRING_Y) for p in arc])
    obj2 = _finish(plaster, bm_p, True)
    obj2.data.materials.append(materials['plaster'])
    return [obj, obj2]


def _plane(bm, corners, patch):
    """One planar face from ((x, y, z), (s, t)) corners, bound to `patch`."""
    face = bm.faces.new([bm.verts.new(_wm(*p)) for p, _ in corners])
    return _bind(bm, face, patch, [st for _, st in corners])


def _wall(bm, a, b, c, d, sts, flip, patch):
    corners = list(zip((a, b, c, d), sts))
    if flip:
        corners = [corners[1], corners[0], corners[3], corners[2]]
    return _plane(bm, corners, patch)


def vault_profile():
    """The barrel arc across X: springing -> crown -> springing (semicircle)."""
    half = hall_span()[0] * 0.5
    mid = hall_mid_x()
    pts = []
    for i in range(VAULT_SEGMENTS + 1):
        t = i / float(VAULT_SEGMENTS)
        a = math.pi * t
        pts.append((mid - half * math.cos(a), SPRING_Y + VAULT_RISE * math.sin(a)))
    return tuple(pts)


def arc_angle(p):
    """The arc angle (0 at the west springing .. pi at the east one) of a barrel point."""
    half = hall_span()[0] * 0.5
    return math.atan2((p[1] - SPRING_Y) / VAULT_RISE, (hall_mid_x() - p[0]) / half)


def arc_at(x):
    """The barrel point at a given x: the profile's law at an arbitrary x (R4c)."""
    half = hall_span()[0] * 0.5
    c = max(-1.0, min(1.0, (x - hall_mid_x()) / half))
    return (x, SPRING_Y + VAULT_RISE * math.sin(math.acos(c)))


def vault_arc():
    """The deterministic arc-vertex table (R4c): the uniform profile vertices plus the
    lantern-wall intersections (the wells' cut lines), sorted along the arc."""
    mid = hall_mid_x()
    half_w = LANTERN_WIDTH * 0.5
    pts = [tuple(vault_profile()[i]) for i in range(VAULT_SEGMENTS + 1)]
    for x_line in (mid - half_w, mid + half_w):
        pts.append(arc_at(x_line))
    return tuple(sorted(pts, key=arc_angle))


def build_vault(collection, materials):
    """CLOSED barrel soffit with a coffer grid (R4c law: the shell closes; the coffers are
    true recesses cut radially into the barrel; the lantern wells stay open as the light's
    path and the lantern's glazed drum seals their sides).
    The surface and the recess bottoms bind to (z, arc) patches; every recess wall binds
    to its own per-(row, column, end) patch — no two faces share a uv region (the D-10
    write law: a shared rect would let the bake's last-rasterized face clone one
    column's response to every coffer)."""
    obj, bm = _new_part(collection, 'vault')
    uv, _ = _layers(bm)
    half = hall_span()[0] * 0.5
    mid = hall_mid_x()
    north, south = WALL_Z_NORTH, WALL_Z_SOUTH
    pts = vault_arc()
    cum = [0.0]
    for i in range(len(pts) - 1):
        cum.append(cum[-1] + math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]))
    arc_total = cum[-1]
    assert VAULT_SEGMENTS % COFFER_ROWS == 0, 'the mouths must sit on profile vertices'

    half_w = LANTERN_WIDTH * 0.5
    west_i = next(i for i, p in enumerate(pts) if abs(p[0] - (mid - half_w)) < 1e-9)
    east_i = next(i for i, p in enumerate(pts) if abs(p[0] - (mid + half_w)) < 1e-9)
    wells = tuple((zc - LANTERN_LEN * 0.5, zc + LANTERN_LEN * 0.5) for zc in LANTERN_Z)

    live = []
    col_step = (south - north) / float(COFFER_COLS)
    for ci in range(COFFER_COLS):
        za = north + col_step * ci + COFFER_MARGIN
        zb = north + col_step * (ci + 1) - COFFER_MARGIN
        if any(lo <= (za + zb) * 0.5 <= hi for lo, hi in lantern_overlaps()):
            continue
        live.append((za, zb))
    band = col_step - 2.0 * COFFER_MARGIN
    row_rib = math.pi / float(VAULT_SEGMENTS)
    row_span = math.pi / float(COFFER_ROWS)

    def well_cell(si, z_mid):
        return west_i <= si < east_i and any(lo < z_mid < hi for lo, hi in wells)

    def mouth_cell(si, z_mid):
        if not any(za < z_mid < zb for za, zb in live):
            return False
        a_mid = (arc_angle(pts[si]) + arc_angle(pts[si + 1])) * 0.5
        for ri in range(COFFER_ROWS):
            if ri * row_span + row_rib <= a_mid <= (ri + 1) * row_span - row_rib:
                return True
        return False

    # R4c: the shell field FOLDS the arc — only the built faces' sub-bands occupy the
    # t axis (the mouths and wells are skipped faces; a raw-cum field would allocate
    # their texels and overflow the chart). Per z-cut the fold re-bases the t origin on
    # the built si's only; a face's span rides its own arc length, seam-free.
    def shell_fold(z_mid):
        built = [si for si in range(len(pts) - 1)
                 if not (well_cell(si, z_mid) or mouth_cell(si, z_mid))]
        span = {si: math.hypot(pts[si + 1][0] - pts[si][0], pts[si + 1][1] - pts[si][1])
                for si in built}
        fold = {}
        run = 0.0
        for si in built:
            fold[si] = run
            run += span[si]
        return built, fold, span, run

    z_cuts = tuple(sorted(
        {north, south} | {cut for span in live for cut in span}
        | {cut for span in wells for cut in span}))
    folds = {zi: shell_fold((z_cuts[zi] + z_cuts[zi + 1]) * 0.5)
             for zi in range(len(z_cuts) - 1)}
    surface_patch = CHART.add('vault', south - north,
                              max(f[3] for f in folds.values()), 'shell')
    for zi, (built, fold, span, _) in folds.items():
        z0, z1 = z_cuts[zi], z_cuts[zi + 1]
        for si in built:
            p0, p1 = pts[si], pts[si + 1]
            face = bm.faces.new([bm.verts.new(_wm(px, py, zz)) for px, py, zz in
                                 ((p0[0], p0[1], z0), (p1[0], p1[1], z0),
                                  (p1[0], p1[1], z1), (p0[0], p0[1], z1))])
            face.smooth = False
            t0, t1 = fold[si], fold[si] + span[si]
            _bind(bm, face, surface_patch, [(z0 - north, t0), (z0 - north, t1),
                                        (z1 - north, t1), (z1 - north, t0)])

    def pushed(p):
        """A mouth point pushed radially OUTWARD: the recess's true depth."""
        dx, dy = p[0] - mid, p[1] - SPRING_Y
        length = math.hypot(dx, dy)
        k = (length + COFFER_INSET) / length
        return (mid + dx * k, SPRING_Y + dy * k)

    # R4c: the soffit field FOLDS the arc like the shell's — every row's bottoms cover
    # the row's mouth arcs only; a raw-cum t axis would allocate the rib arcs' texels
    # no bottom face ever samples (the same overflow the shell fold removes).
    rows = []
    for ri in range(COFFER_ROWS):
        band_lo = ri * row_span + row_rib
        band_hi = (ri + 1) * row_span - row_rib
        rows.append((next(si for si in range(len(pts) - 1)
                          if abs(arc_angle(pts[si]) - band_lo) < 1e-9),
                     next(si for si in range(len(pts) - 1)
                          if abs(arc_angle(pts[si + 1]) - band_hi) < 1e-9)))
    row_base = [0.0]
    for si0, si1 in rows:
        row_base.append(row_base[-1] + (cum[si1 + 1] - cum[si0]))
    soffit_patch = CHART.add('vault', band * len(live), row_base[-1], 'soffit')
    wall_classes = {}
    for gi, (za, zb) in enumerate(live):
        for ri, (si0, si1) in enumerate(rows):
            mouth = pts[si0:si1 + 2]
            bottom = tuple(pushed(p) for p in mouth)
            chord = cum[si1 + 1] - cum[si0]
            for bi in range(len(mouth) - 1):
                t0 = row_base[ri] + (cum[si0 + bi] - cum[si0])
                t1 = row_base[ri] + (cum[si0 + bi + 1] - cum[si0])
                mb = bm.faces.new([bm.verts.new(_wm(px, py, zz)) for px, py, zz in
                                   ((bottom[bi][0], bottom[bi][1], za),
                                    (bottom[bi + 1][0], bottom[bi + 1][1], za),
                                    (bottom[bi + 1][0], bottom[bi + 1][1], zb),
                                    (bottom[bi][0], bottom[bi][1], zb))])
                mb.smooth = False
                _bind(bm, mb, soffit_patch, [(gi * band, t0), (gi * band, t1),
                                         ((gi + 1) * band, t1), ((gi + 1) * band, t0)])
                for zz in (za, zb):
                    key = ('z-end', ri, gi, zz)
                    if key not in wall_classes:
                        wall_classes[key] = (CHART.add('vault', chord, COFFER_INSET),
                                             cum[si0])
                    zwall, base = wall_classes[key]
                    mz = bm.faces.new([bm.verts.new(_wm(px, py, zz)) for px, py, zz in
                                       ((mouth[bi][0], mouth[bi][1], zz),
                                        (mouth[bi + 1][0], mouth[bi + 1][1], zz),
                                        (bottom[bi + 1][0], bottom[bi + 1][1], zz),
                                        (bottom[bi][0], bottom[bi][1], zz))])
                    mz.smooth = False
                    _bind(bm, mz, zwall, [(cum[si0 + bi] - base, 0.0), (cum[si0 + bi + 1] - base, 0.0),
                                      (cum[si0 + bi + 1] - base, COFFER_INSET),
                                      (cum[si0 + bi] - base, COFFER_INSET)])
            for ei, (edge, flip) in enumerate(((mouth[0], False), (mouth[-1], True))):
                # R4c: the honest (radial, z) net — the wall's 0.18 x band metres at the
                # uniform density (the session draft's transposed bind crushed the
                # wall's z-variation into COFFER_INSET's 6 texels; this restores it).
                key = ('arc-end', ri, gi, ei)
                if key not in wall_classes:
                    wall_classes[key] = CHART.add('vault', COFFER_INSET, band)
                awall = wall_classes[key]
                pb = pushed(edge)
                ms = bm.faces.new([bm.verts.new(_wm(px, py, zz)) for px, py, zz in
                                   ((edge[0], edge[1], zb), (edge[0], edge[1], za),
                                    (pb[0], pb[1], za), (pb[0], pb[1], zb))])
                if flip:
                    ms.normal_flip()
                ms.smooth = False
                _bind(bm, ms, awall, [(0.0, band), (0.0, 0.0),
                                      (COFFER_INSET, 0.0), (COFFER_INSET, band)])
    # R4c: the wells' throats — the drum's sides run down to the arc rim and seal the
    # well (the lantern law): two x-side walls plus the two arc-bounded end walls,
    # normals inward (the hall sees them through the well; the D-10 per-face rects).
    # The x-side walls rise to the kerb and so overlap the committed drum wall's
    # crown..kerb band with an opposite-facing twin — coincident, never co-visible.
    kerb = SPRING_Y + VAULT_RISE + LANTERN_KERB_H
    rim_y = arc_at(mid - half_w)[1]
    for za, zb in wells:
        for sx in (-1.0, 1.0):
            x_line = mid + sx * half_w
            tw = bm.faces.new([bm.verts.new(_wm(x_line, yy, zz)) for yy, zz in
                               ((rim_y, za), (rim_y, zb), (kerb, zb), (kerb, za))])
            if sx < 0.0:
                tw.normal_flip()
            tw.smooth = False
            face_patch(bm, tw, 'vault')
        for z_end, flip in ((za, False), (zb, True)):
            ty = bm.faces.new(
                [bm.verts.new(_wm(px, py, z_end)) for px, py in pts[west_i:east_i + 1]]
                + [bm.verts.new(_wm(mid + half_w, kerb, z_end)),
                   bm.verts.new(_wm(mid - half_w, kerb, z_end))])
            if flip:
                ty.normal_flip()
            ty.smooth = False
            face_patch(bm, ty, 'vault')
    obj.data.materials.append(materials['vault'])
    return _finish(obj, bm, False)


# ---- lantern (one authored glazed lantern, placed three times, merged) -------
def _orient_outward(face, axis_x, axis_y):
    """Mirror-proof winding for the lantern's glazed faces: the normal must point
    horizontally AWAY from the lantern's mid-axis (the R4 winding audit — mirrored
    placements invert any fixed vertex order). Blender axes (x east, y north).
    Flips in place, before the face's chart patch binds its per-loop (s, t) values."""
    face.normal_update()
    c = face.calc_center_median()
    away = Vector((c.x - axis_x, c.y - axis_y, 0.0))
    if away.length > 1e-9 and face.normal.dot(away) < 0.0:
        face.normal_flip()


def build_lanterns(collection, materials):
    glaze, bm_g = _new_part(collection, 'lantern_glazing')
    bars, bm_b = _new_part(collection, 'lantern_bars')
    uv_g, _ = _layers(bm_g)
    _, _ = _layers(bm_b)
    mid = hall_mid_x()
    crown = SPRING_Y + VAULT_RISE
    kerb = crown + LANTERN_KERB_H
    ridge = kerb + LANTERN_PITCH_H
    half_w = LANTERN_WIDTH * 0.5
    half_l = LANTERN_LEN * 0.5
    for zc in LANTERN_Z:
        za = zc - half_l
        zb = zc + half_l
        for sx in (-1.0, 1.0):
            eave = mid + sx * half_w
            slope = bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                        ((eave, kerb, za), (mid, ridge, za),
                         (mid, ridge, zb), (eave, kerb, zb))])
            _orient_outward(slope, mid, -zc)
            face_patch(bm_g, slope, 'lantern_glazing')
            kerb_wall = bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                        ((eave, crown, za), (eave, kerb, za),
                         (eave, kerb, zb), (eave, crown, zb))])
            _orient_outward(kerb_wall, mid, -zc)
            face_patch(bm_g, kerb_wall, 'lantern_glazing')
            for bi in range(LANTERN_BARS):
                t = (bi + 0.5) / float(LANTERN_BARS)
                zc_bar = za + (zb - za) * t
                bx = (eave + mid) * 0.5
                by = (kerb + ridge) * 0.5
                add_box(bm_b, (bx, by, zc_bar),
                        (abs(eave - mid) * 0.5, LANTERN_BAR_D * 0.5, LANTERN_BAR_W * 0.5),
                        'lantern_bars')
        for z_end in (za, zb):
            gable = bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                        ((mid - half_w, kerb, z_end), (mid + half_w, kerb, z_end),
                         (mid, ridge, z_end))])
            _orient_outward(gable, mid, -zc)
            face_patch(bm_g, gable, 'lantern_glazing')
        add_box(bm_b, (mid, ridge, zc),
                (LANTERN_BAR_W * 0.5, half_l, LANTERN_BAR_D * 0.5), 'lantern_bars')
    glaze_obj = _finish(glaze, bm_g, True)
    bars_obj = _finish(bars, bm_b, False)
    glaze_obj.data.materials.append(materials['glass'])
    bars_obj.data.materials.append(materials['gilt'])
    return [glaze_obj, bars_obj]


# ---- doors (K4: one authored double-door panel, six reuses) -------------------
def door_architrave(bm_case, centre, normal, width, part='door_cases'):
    """The gilt architrave law of door_panel's case half: two jamb boxes plus the head,
    one DOOR_PANEL_D proud of the wall plane. door_panel composes it with its leaves;
    build_doorway calls it alone for the east opening (the leaves there are separate
    hinge-pivoted nodes, not merged decor). The chart part name follows the MESH name
    (the D-12 gate maps mesh -> patch part): build_doorway passes 'door_case_sg'."""
    cx, cy, cz = centre
    nx, _, nz = normal
    ux, uz = -nz, nx
    half_h = DOOR_H * 0.5
    jamb_off = width * 0.5 + DOOR_CASE_W * 0.5
    for side in (-1.0, 1.0):
        jx = cx + ux * side * jamb_off + nx * DOOR_PANEL_D * 0.5
        jz = cz + uz * side * jamb_off + nz * DOOR_PANEL_D * 0.5
        add_box(bm_case, (jx, cy + half_h + DOOR_CASE_W * 0.5, jz),
                (abs(ux) * DOOR_CASE_W * 0.5 + abs(nx) * DOOR_PANEL_D * 0.5,
                 half_h + DOOR_CASE_W * 0.5,
                 abs(uz) * DOOR_CASE_W * 0.5 + abs(nz) * DOOR_PANEL_D * 0.5),
                part)
    hx = cx + nx * DOOR_PANEL_D * 0.5
    hz = cz + nz * DOOR_PANEL_D * 0.5
    add_box(bm_case, (hx, cy + DOOR_H + DOOR_CASE_W * 0.5, hz),
            (abs(ux) * (width * 0.5 + DOOR_CASE_W) + abs(nx) * DOOR_PANEL_D * 0.5,
             DOOR_CASE_W * 0.5,
             abs(uz) * (width * 0.5 + DOOR_CASE_W) + abs(nz) * DOOR_PANEL_D * 0.5),
            part)


def door_panel(bm_leaf, bm_case, centre, normal, swing, width=DOOR_W):
    """Two leaves plus a gilt architrave; swing offsets the leaves inward."""
    cx, cy, cz = centre
    nx, _, nz = normal
    ux, uz = -nz, nx
    leaf_w = (width - DOOR_LEAF_INSET * 2.0) * 0.5
    half_h = DOOR_H * 0.5
    for side in (-1.0, 1.0):
        off = side * (leaf_w * 0.5 + DOOR_LEAF_INSET * 0.5)
        depth = DOOR_PANEL_D * 0.5 + swing
        lx = cx + ux * off + nx * depth
        lz = cz + uz * off + nz * depth
        add_box(bm_leaf, (lx, cy + half_h, lz),
                (abs(ux) * leaf_w * 0.5 + abs(nx) * DOOR_PANEL_D * 0.5,
                 half_h,
                 abs(uz) * leaf_w * 0.5 + abs(nz) * DOOR_PANEL_D * 0.5),
                'door_leaves')
    door_architrave(bm_case, centre, normal, width)


def door_stations(piers):
    """The six reuses: the north entry pair, two south flanks, four blinds.
    Each station carries its door width."""
    mid = hall_mid_x()
    half_x = hall_span()[0] * 0.5
    stations = [((mid, FLOOR_Y, WALL_Z_NORTH), (0.0, 0.0, 1.0), NORTH_DOOR_SWING, DOOR_W)]
    for sx in (-1.0, 1.0):
        stations.append(((mid + sx * (half_x - SOUTH_DOOR_INSET), FLOOR_Y, WALL_Z_SOUTH),
                         (0.0, 0.0, -1.0), 0.0, SOUTH_DOOR_W))
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for bay_index in BLIND_DOOR_BAYS:
            stations.append(((wall_x + nx * DOOR_PANEL_D * 0.5, FLOOR_Y, piers[bay_index]),
                             (nx, 0.0, 0.0), 0.0, BLIND_DOOR_W))
    return tuple(stations)


def build_doors(collection, materials, metrics):
    leaves, bm_leaf = _new_part(collection, 'door_leaves')
    cases, bm_case = _new_part(collection, 'door_cases')
    _, _ = _layers(bm_leaf)
    _, _ = _layers(bm_case)
    for centre, normal, swing, width in door_stations(pier_centres(metrics)):
        door_panel(bm_leaf, bm_case, centre, normal, swing, width)
    leaves_obj = _finish(leaves, bm_leaf, True)
    cases_obj = _finish(cases, bm_case, True)
    leaves_obj.data.materials.append(materials['door'])
    cases_obj.data.materials.append(materials['gilt'])
    return [leaves_obj, cases_obj]


# ---- the St George doorway (mg-1812-look DECISION-1; design §2.5's seat) -------
def build_doorway(collection, materials):
    """The east wall's real opening: the reveal's dark quads (two jambs, the soffit, the
    back and the sill — §2.8's single-quad law) closing the hole build_walls split around,
    plus the gilt architrave on the room face. The reveal bakes dark: the next hall is
    unmodelled, the enclosed gap reads as the dark throat the card hides."""
    reveal, bm_r = _new_part(collection, 'door_reveal')
    _, _ = _layers(bm_r)
    wx = WALL_X_EAST
    back_x = wx + SG_REVEAL_D
    lo = SG_DOOR_Z - DOOR_W * 0.5
    hi = SG_DOOR_Z + DOOR_W * 0.5
    top = FLOOR_Y + DOOR_H
    # The north jamb at z lo, facing +z (into the opening).
    patch = CHART.add('door_reveal', SG_REVEAL_D, DOOR_H, 'jamb-n')
    _plane(bm_r, (((back_x, FLOOR_Y, lo), (0.0, 0.0)),
                  ((wx, FLOOR_Y, lo), (SG_REVEAL_D, 0.0)),
                  ((wx, top, lo), (SG_REVEAL_D, DOOR_H)),
                  ((back_x, top, lo), (0.0, DOOR_H))), patch)
    # The south jamb at z hi, facing -z.
    patch = CHART.add('door_reveal', SG_REVEAL_D, DOOR_H, 'jamb-s')
    _plane(bm_r, (((back_x, FLOOR_Y, hi), (0.0, 0.0)),
                  ((wx, FLOOR_Y, hi), (SG_REVEAL_D, 0.0)),
                  ((wx, top, hi), (SG_REVEAL_D, DOOR_H)),
                  ((back_x, top, hi), (0.0, DOOR_H))), patch)
    # The soffit at y top, facing -y (down).
    patch = CHART.add('door_reveal', DOOR_W, SG_REVEAL_D, 'soffit')
    _plane(bm_r, (((wx, top, lo), (0.0, 0.0)),
                  ((back_x, top, lo), (DOOR_W, 0.0)),
                  ((back_x, top, hi), (DOOR_W, SG_REVEAL_D)),
                  ((wx, top, hi), (0.0, SG_REVEAL_D))), patch)
    # The back at x back, facing -x (west, toward the room).
    patch = CHART.add('door_reveal', DOOR_W, DOOR_H, 'back')
    _plane(bm_r, (((back_x, FLOOR_Y, lo), (0.0, 0.0)),
                  ((back_x, FLOOR_Y, hi), (DOOR_W, 0.0)),
                  ((back_x, top, hi), (DOOR_W, DOOR_H)),
                  ((back_x, top, lo), (0.0, DOOR_H))), patch)
    # The sill at the floor, facing +y (up) — the parquet stops at the wall plane.
    patch = CHART.add('door_reveal', DOOR_W, SG_REVEAL_D, 'sill')
    _plane(bm_r, (((wx, FLOOR_Y, lo), (0.0, 0.0)),
                  ((wx, FLOOR_Y, hi), (DOOR_W, 0.0)),
                  ((back_x, FLOOR_Y, hi), (DOOR_W, SG_REVEAL_D)),
                  ((back_x, FLOOR_Y, lo), (0.0, SG_REVEAL_D))), patch)
    reveal_obj = _finish(reveal, bm_r, True)
    reveal_obj.data.materials.append(materials['door'])
    # The gilt architrave on the room face — the door law's case boxes (door_architrave),
    # its own part: the architecture merge groups by material, so the shared gilt bucket
    # absorbs it (no new draw).
    case, bm_c = _new_part(collection, 'door_case_sg')
    _, _ = _layers(bm_c)
    door_architrave(bm_c, (wx, FLOOR_Y, SG_DOOR_Z), (-1.0, 0.0, 0.0), DOOR_W, 'door_case_sg')
    case_obj = _finish(case, bm_c, True)
    case_obj.data.materials.append(materials['gilt'])
    return [reveal_obj, case_obj]


def build_door_leaves(collection, materials):
    """The doorway's two hinge-pivoted leaves (the runtime swing's subjects): SEPARATE
    glb nodes named leaf_sg_n / leaf_sg_s, each authored in HINGE-LOCAL coordinates with
    the node origin AT the jamb (glTF translation = the hinge) so the runtime's
    rotation.y swings the leaf about its hinge (src/world/door.ts). Both bake CLOSED:
    the enclosed reveal bakes dark, the leaves carry their closed-pose texels."""
    leaf_w = (DOOR_W - DOOR_LEAF_INSET * 2.0) * 0.5
    leaves = []
    stations = (
        # (name, hinge glTF (x, y, z), the panel's local z span, the hinge law's sign)
        ('leaf_sg_n', (WALL_X_EAST, FLOOR_Y, SG_DOOR_Z - DOOR_W * 0.5), (0.0, leaf_w), -1),
        ('leaf_sg_s', (WALL_X_EAST, FLOOR_Y, SG_DOOR_Z + DOOR_W * 0.5), (-leaf_w, 0.0), 1),
    )
    for name, hinge, (z_lo, z_hi), _sign in stations:
        obj, bm = _new_part(collection, name)
        _, _ = _layers(bm)
        # The panel: x -DOOR_PANEL_D..0 (proud of the wall plane, the door law's depth),
        # y 0..DOOR_H, z the leaf's own span — all hinge-local glTF metres. The chart part
        # name follows the MESH name (the D-12 gate maps mesh -> patch part).
        add_box(bm,
                (-DOOR_PANEL_D * 0.5, DOOR_H * 0.5, (z_lo + z_hi) * 0.5),
                (DOOR_PANEL_D * 0.5, DOOR_H * 0.5, (z_hi - z_lo) * 0.5),
                name)
        leaf_obj = _finish(obj, bm, True)
        leaf_obj.data.materials.append(materials['door'])
        leaf_obj.location = to_b(hinge)
        leaves.append(leaf_obj)
    return leaves


# ---- piers (paired pilasters + gilt capitals/bases, band, engaged columns) ----
def build_piers(collection, materials, metrics):
    shafts, bm_s = _new_part(collection, 'pier_shafts')
    gilt, bm_g = _new_part(collection, 'pier_gilt')
    columns, bm_c = _new_part(collection, 'pier_columns')
    _, _ = _layers(bm_s)
    _, _ = _layers(bm_g)
    _, _ = _layers(bm_c)
    piers = pier_centres(metrics)
    band_y = SPRING_Y - 0.9
    shaft_h = band_y - FLOOR_Y - BASE_H - CAP_H
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for pi in range(PIERS_PER_WALL):
            z = piers[pi]
            px = wall_x + nx * PILASTER_D * 0.5
            for side in (-1.0, 1.0):
                zc = z + side * (PILASTER_PAIR_GAP + PILASTER_W) * 0.5
                add_box(bm_s, (px, FLOOR_Y + BASE_H + shaft_h * 0.5, zc),
                        (PILASTER_D * 0.5, shaft_h * 0.5, PILASTER_W * 0.5), 'pier_shafts')
                add_box(bm_g, (px, FLOOR_Y + BASE_H * 0.5, zc),
                        (PILASTER_D * 0.5 + CAP_FLARE, BASE_H * 0.5,
                         PILASTER_W * 0.5 + CAP_FLARE), 'pier_gilt')
                add_box(bm_g, (px, band_y - CAP_H * 0.5, zc),
                        (PILASTER_D * 0.5 + CAP_FLARE, CAP_H * 0.5,
                         PILASTER_W * 0.5 + CAP_FLARE), 'pier_gilt')
            if pi % WIDE_PIER_EVERY == 0:
                add_prism(bm_c, (wall_x + nx * COLUMN_R, FLOOR_Y, z),
                          COLUMN_R, band_y - FLOOR_Y, COLUMN_SIDES, part='pier_columns')
        add_box(bm_g, (wall_x + nx * 0.45, SPRING_Y - 0.45,
                       (WALL_Z_NORTH + WALL_Z_SOUTH) * 0.5),
                (0.45, 0.45, hall_span()[1] * 0.5), 'pier_gilt')
    shafts_obj = _finish(shafts, bm_s, True)
    gilt_obj = _finish(gilt, bm_g, True)
    columns_obj = _finish(columns, bm_c, False)
    shafts_obj.data.materials.append(materials['plaster'])
    gilt_obj.data.materials.append(materials['gilt'])
    columns_obj.data.materials.append(materials['stone'])
    return [shafts_obj, gilt_obj, columns_obj]


# ---- torchere candelabra (DEC-026) -------------------------------------------
def torchere_stations(piers):
    stations = []
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for pi in piers:
            stations.append((wall_x + nx * TORCHERE_WALL_OFF, pi))
    mid = hall_mid_x()
    half_x = hall_span()[0] * 0.5
    for sx in (-1.0, 1.0):
        stations.append((mid + sx * (half_x - SOUTH_DOOR_INSET),
                         WALL_Z_SOUTH - TORCHERE_WALL_OFF))
    return tuple(stations)


def build_torcheres(collection, materials, metrics):
    body, bm_b = _new_part(collection, 'torchere_body')
    candles, bm_f = _new_part(collection, 'torchere_candles')
    _, _ = _layers(bm_b)
    _, _ = _layers(bm_f)
    stem_h = TORCHERE_H - TORCHERE_CANDLE_H
    for x, z in torchere_stations(pier_centres(metrics)):
        add_prism(bm_b, (x, FLOOR_Y, z), TORCHERE_BASE_R,
                  TORCHERE_BASE_R, TORCHERE_SIDES,
                  TORCHERE_STEM_R / TORCHERE_BASE_R, part='torchere_body')
        add_prism(bm_b, (x, FLOOR_Y + TORCHERE_BASE_R, z), TORCHERE_STEM_R,
                  stem_h - TORCHERE_BASE_R, TORCHERE_SIDES, part='torchere_body')
        add_prism(bm_b, (x, FLOOR_Y + stem_h, z), TORCHERE_RING_R,
                  TORCHERE_CANDLE_R, TORCHERE_SIDES, part='torchere_body')
        for ci in range(TORCHERE_CANDLES):
            a = 2.0 * math.pi * ci / float(TORCHERE_CANDLES)
            add_prism(bm_f,
                      (x + math.cos(a) * TORCHERE_RING_R,
                       FLOOR_Y + stem_h + TORCHERE_CANDLE_R,
                       z + math.sin(a) * TORCHERE_RING_R),
                      TORCHERE_CANDLE_R, TORCHERE_CANDLE_H, TORCHERE_SIDES,
                      part='torchere_candles')
    body_obj = _finish(body, bm_b, False)
    candle_obj = _finish(candles, bm_f, False)
    body_obj.data.materials.append(materials['gilt'])
    candle_obj.data.materials.append(materials['candle'])
    return [body_obj, candle_obj]


# ---- benches ------------------------------------------------------------------
def build_benches(collection, materials):
    obj, bm = _new_part(collection, 'bench')
    _, _ = _layers(bm)
    span_z = WALL_Z_SOUTH - WALL_Z_NORTH
    step = span_z / float(BENCHES_PER_WALL + 1)
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for bi in range(BENCHES_PER_WALL):
            z = WALL_Z_NORTH + step * (bi + 1)
            x = wall_x + nx * (BENCH_WALL_OFF + BENCH_W * 0.5)
            add_box(bm, (x, FLOOR_Y + BENCH_H * 0.5, z),
                    (BENCH_W * 0.5, BENCH_H * 0.5, BENCH_L * 0.5), 'bench')
    obj.data.materials.append(materials['upholstery'])
    return _finish(obj, bm, True)


# ---- K8 monarch portal surround (the south end wall composition) --------------
def build_portal(collection, materials):
    gilt, bm_g = _new_part(collection, 'portal_gilt')
    leaves, bm_l = _new_part(collection, 'portal_leaves')
    carpet, bm_c = _new_part(collection, 'portal_step')
    _, _ = _layers(bm_g)
    _, _ = _layers(bm_l)
    _, _ = _layers(bm_c)
    mid = hall_mid_x()
    face_z = WALL_Z_SOUTH - PORTAL_PED_D * 0.5
    add_box(bm_g, (mid, 10.0 + 4.7, face_z),
            (PORTAL_PED_W * 0.5, PORTAL_PED_H * 0.5, PORTAL_PED_D * 0.5), 'portal_gilt')
    for vi in range(PORTAL_VALANCE_COUNT):
        t = (vi + 0.5) / float(PORTAL_VALANCE_COUNT)
        vx = mid + (t - 0.5) * PORTAL_PED_W
        vy = 10.0 + 4.7 - PORTAL_PED_H * 0.5 - PORTAL_VALANCE_H * 0.5
        add_box(bm_g, (vx, vy, face_z),
                (PORTAL_VALANCE_W * 0.5, PORTAL_VALANCE_H * 0.5,
                 PORTAL_PED_D * 0.5), 'portal_gilt')
    add_box(bm_c, (mid, FLOOR_Y + PORTAL_STEP_H * 0.5,
                   WALL_Z_SOUTH - PORTAL_STEP_D * 0.5),
            (PORTAL_STEP_W * 0.5, PORTAL_STEP_H * 0.5, PORTAL_STEP_D * 0.5), 'portal_step')
    for side in (-1.0, 1.0):
        add_box(bm_l, (mid + side * PORTAL_LEAF_OFF,
                       FLOOR_Y + PORTAL_LEAF_H * 0.5, face_z),
                (PORTAL_LEAF_W * 0.5, PORTAL_LEAF_H * 0.5, PORTAL_PED_D * 0.5),
                'portal_leaves')
    gilt_obj = _finish(gilt, bm_g, True)
    leaves_obj = _finish(leaves, bm_l, True)
    carpet_obj = _finish(carpet, bm_c, True)
    gilt_obj.data.materials.append(materials['gilt'])
    leaves_obj.data.materials.append(materials['door'])
    carpet_obj.data.materials.append(materials['carpet'])
    return [gilt_obj, leaves_obj, carpet_obj]


# ---- summary (the sibling shape: per-part triangles/instances/primitives) -----
def main():
    collection = reset_scene()
    materials = make_materials()
    metrics = read_metrics()

    global CHART, ARCH_CHART
    CHART = chart_kit.ArchChart()

    parts = []
    floor = build_floor(collection, materials)
    parts.append(floor)
    parts.extend(build_walls(collection, materials))
    parts.append(build_vault(collection, materials))
    parts.extend(build_lanterns(collection, materials))
    parts.extend(build_doors(collection, materials, metrics))
    parts.extend(build_doorway(collection, materials))
    parts.extend(build_door_leaves(collection, materials))
    parts.extend(build_piers(collection, materials, metrics))
    parts.extend(build_torcheres(collection, materials, metrics))
    parts.append(build_benches(collection, materials))
    parts.extend(build_portal(collection, materials))
    frame_objects, frame_count = frames_kit.build_frames(collection, SCRIPT_DIR, FLOOR_Y)
    for obj in frame_objects:
        if obj.name.startswith(frames_kit.CANVAS_PART_PREFIX):
            obj.data.materials.append(materials['canvas'])
        else:
            obj.data.materials.append(materials['gilt'])
    parts.extend(frame_objects)

    CHART.pack()
    _finish_all()
    ARCH_CHART = CHART.to_dict()

    stage = stage_dir()
    os.makedirs(stage, exist_ok=True)
    CHART.write_json(os.path.join(stage, chart_kit.ARCH_CHART_FILE))

    if BAKE:
        return

    image = write_parquet_texture(stage)
    wire_parquet(materials, image)

    counts = {}
    for obj in sorted(parts, key=lambda o: o.name):
        obj.data.calc_loop_triangles()
        count = sum(max(len(p.vertices) - 2, 0) for p in obj.data.polygons)
        total = len(obj.data.loop_triangles)
        counts[obj.name] = {'triangles': total, 'polys': count}
    counts['frames'] = frame_count
    os.makedirs(stage, exist_ok=True)
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as handle:
        json.dump(counts, handle, sort_keys=True, indent=2)
        handle.write('\n')
    glb_path = os.path.join(stage, ROOM_ID + '.raw.glb')
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
    body = json.dumps(counts, sort_keys=True, separators=(',', ':'))
    sys.stdout.write('ZIMNY_SUMMARY %s\n' % body)


main()
