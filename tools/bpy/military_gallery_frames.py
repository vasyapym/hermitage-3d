# Zimny Phase 3 R1b — military-gallery frame kit module (Blender 4.2 LTS, headless).
# Imported by tools/bpy/military-gallery.py (design-gallery.md §3.2/§3.3/§3.4, DEC-021/022).
#
# Pure consumer of the committed layout law. Every coordinate, size, offset and UV
# rect is read from tools/gallery/layout.json — no frame coordinate is a literal here.
# Deterministic: no randomness, no clock; frames are consumed in the JSON's array
# order and named by index (stable across runs). World axes are glTF axes: +X east,
# +Z south, -Z north, +Y up; every vertex passes through to_b() (the sibling
# conversion, winding preserved). Layer 0 'uv' hosts the atlas rects (canvases),
# layer 1 'lm' hosts the bake space.
#
# Writes nothing by itself; returns objects to the caller.

import json
import os

import bmesh
import bpy
from mathutils import Vector

LAYOUT_RELATIVE_PATH = os.path.join('..', 'gallery', 'layout.json')

# ---- bar profile (design-gallery.md §3.3; frame outer = canvas + 2 bars) ------
FRAME_BAR_WIDTH = 0.07     # boom per side: 0.35 + 2x0.07 = the 0.49 outer law
FRAME_BAR_DEPTH = 0.05     # bar depth off the wall plane, metres
MONARCH_BAR_WIDTH = 0.12   # the oversized frames' boom (§2.7)
UV_ATLAS = 'uv'            # layer 0: the atlas rects live here (canvases)
UV_LIGHTMAP = 'lm'         # layer 1: the bake's coordinate space

FRAME_PART_PREFIX = 'frame'
CANVAS_PART_PREFIX = 'canvas'


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def read_layout(script_dir):
    path = os.path.normpath(os.path.join(script_dir, LAYOUT_RELATIVE_PATH))
    with open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def _basis(facing):
    """Wall basis: n out of the wall, u horizontal along it, v up; right-handed."""
    n = Vector((facing['x'], facing['y'], facing['z'])).normalized()
    up = Vector((0.0, 1.0, 0.0))
    u = up.cross(n).normalized()
    v = u.cross(n).normalized()
    return n, u, v


def _wm(gx, gy, gz):
    return Vector(to_b((gx, gy, gz)))


def _quad_uv(face, layer, rect):
    """Map a quad's four loops onto a rect (u0v0, u1v0, u1v1, u0v1) in loop order."""
    us = (rect['u0'], rect['u1'], rect['u1'], rect['u0'])
    vs = (rect['v0'], rect['v0'], rect['v1'], rect['v1'])
    for i, loop in enumerate(face.loops):
        loop[layer].uv = (us[i], vs[i])


def _put(bm, origin, n, u, v, cu, cv, du, dv, back, front):
    """One gilt bar box in wall space about (cu, cv): n spans from `back`
    (the wall face) to `front` (just proud of the canvas plane)."""
    verts = []
    for sn in (back, front):
        for su, sv in ((-du, -dv), (du, -dv), (du, dv), (-du, dv)):
            p = origin + u * (cu + su) + v * (cv + sv) + n * sn
            verts.append(bm.verts.new(_wm(p.x, p.y, p.z)))
    quads = ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0))
    return [bm.faces.new([verts[i] for i in q]) for q in quads]


def _bar_boxes(canvas_w, canvas_h, bar_w):
    """Four mitred bars as (centre_u, centre_v, half_u, half_v) in wall space."""
    ou = canvas_w * 0.5 + bar_w
    ov = canvas_h * 0.5 + bar_w
    iu = ou - bar_w
    iv = ov - bar_w
    return (
        (0.0, (ov + iv) * 0.5, ou, (ov - iv) * 0.5),      # top rail
        (0.0, -(ov + iv) * 0.5, ou, (ov - iv) * 0.5),     # bottom rail
        (-(ou + iu) * 0.5, 0.0, (ou - iu) * 0.5, iv),     # left stile
        ((ou + iu) * 0.5, 0.0, (ou - iu) * 0.5, iv),      # right stile
    )


def _build_frame(frame, index, canvas_offset):
    name = '%s_%03d' % (FRAME_PART_PREFIX, index)
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    origin = Vector((frame['position']['x'], frame['position']['y'],
                     frame['position']['z']))
    n, u, v = _basis(frame['facing'])
    # Layer 0 'uv': the bars' atlas coordinate is unused at R1 (flat gilt) but
    # the pipeline gate carries TEXCOORD_0 on every primitive; layer 1 'lm'.
    uv_a = bm.loops.layers.uv.new(UV_ATLAS)
    uv_l = bm.loops.layers.uv.new(UV_LIGHTMAP)
    bar_w = MONARCH_BAR_WIDTH if frame['kind'] in ('ally', 'portal') else FRAME_BAR_WIDTH
    rect = frame['chart']
    for cu, cv, du, dv in _bar_boxes(frame['canvas']['width'],
                                     frame['canvas']['height'], bar_w):
        faces = _put(bm, origin, n, u, v, cu, cv, du, dv,
                     -canvas_offset, FRAME_BAR_DEPTH - canvas_offset)
        for face in faces:
            face.smooth = False
            _quad_uv(face, uv_l, rect)
            for loop in face.loops:
                loop[uv_a].uv = (0.0, 0.0)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()
    return bpy.data.objects.new(name, mesh)


def _quad_uv_reversed(face, layer, rect):
    """Map a quad's four loops onto a rect for a face whose winding runs BL, TL, TR, BR
    (the reversed canvas winding): (u0v0, u0v1, u1v1, u1v0) in loop order."""
    us = (rect['u0'], rect['u0'], rect['u1'], rect['u1'])
    vs = (rect['v0'], rect['v1'], rect['v1'], rect['v0'])
    for i, loop in enumerate(face.loops):
        loop[layer].uv = (us[i], vs[i])


def _build_canvas(frame, index, canvas_offset):
    name = '%s_%03d' % (CANVAS_PART_PREFIX, index)
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    origin = Vector((frame['position']['x'], frame['position']['y'],
                     frame['position']['z']))
    n, u, v = _basis(frame['facing'])
    hw = float(frame['canvas']['width']) * 0.5
    hh = float(frame['canvas']['height']) * 0.5
    uv_a = bm.loops.layers.uv.new(UV_ATLAS)
    uv_l = bm.loops.layers.uv.new(UV_LIGHTMAP)
    # Winding runs BL, TL, TR, BR so the canvas normal points OUT of the wall into
    # the room (the R4 winding audit: the old order faced it into the wall and the
    # bake culled/read the cell black).
    corners = ((-hw, -hh), (-hw, hh), (hw, hh), (hw, -hh))
    verts = [bm.verts.new(_wm(*tuple(origin + u * cu + v * cv)))
             for cu, cv in corners]
    face = bm.faces.new(verts)
    face.smooth = False
    _quad_uv_reversed(face, uv_a, frame['uv'])
    _quad_uv_reversed(face, uv_l, frame['chartCanvas'])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()
    return bpy.data.objects.new(name, mesh)


def build_frames(collection, script_dir, floor_y=0.0):
    """Build every frame in the law. Returns (objects, frame_count).

    floor_y: the room's floor height in glTF metres. The layout's position.y is a
    hanging height OVER the floor (rowBottomY..rowTopY are floor-relative by
    design); the architecture adds FLOOR_Y everywhere, and the R4 night-kit probe
    (probes/r4-kit-night/probe13_where.py) proved the raw consumption left the
    whole kit 5.6-8.6 m under the hall floor — the night bake's receivers sat in
    the void beneath the only emitters. The kit is lifted onto the wall here."""
    layout = read_layout(script_dir)
    frames = layout['frames']
    canvas_offset = float(layout['metrics']['canvasOffset'])
    frames = [dict(f, position=dict(f['position'], y=f['position']['y'] + floor_y))
              for f in frames]
    objects = []
    for index in range(len(frames)):
        frame = frames[index]
        # mg-1812-look DECISION-1: the doorway keep-clear law — a dropped frame's part is
        # never built; the part indices stay stable (named by the layout index) and the
        # frame's atlas slot stays allocated by rank (the atlas byte-identical).
        if frame.get('dropped', False):
            continue
        bars = _build_frame(frame, index, canvas_offset)
        canvas = _build_canvas(frame, index, canvas_offset)
        collection.objects.link(bars)
        collection.objects.link(canvas)
        objects.append(bars)
        objects.append(canvas)
    return objects, len(frames)
