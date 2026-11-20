# Square exterior kit (DEC-045, batch M2) — design §6 M2; the G1–G9 chain gates.
# usage: blender -b --factory-startup -noaudio -P tools/square-kit/build_square_kit.py -- --out <dir>
# M2 ships the EMPTY kit: no objects, no materials — the chain proves the plumbing end-to-end
# (build ×2 → sha equal → census → manifest). C1 lands the node el:hq-east (the Guards Corps
# HQ east wall, design §3) inside the marked section below.
# Deterministic by construction: fixed seed, math-generated meshes, stable names, no modifiers,
# no textures or UVs ever (G5: the kit is geometry-only; COLOR_0 rides the C1 primitives).
# THE IDENTITY LAW (G6): every exported node carries an identity transform — meshes are authored
# with world-space vertices at the origin, and any object transform is applied before export —
# because the kit group mounts at identity and the census reads world AABBs from accessor min/max.
# Coordinate mapping (Blender Z-up → glTF Y-up, export_yup=True):
#   glTF_x = Blender_x · glTF_y = Blender_z · glTF_z = −Blender_y
# so the C1 wall face at glTF x 110, z 100–240, y 0–20.5 is authored at Blender
# x 110, y −100…−240, z 0–20.5. World metres throughout (KIT_WORLD_LAW).
import json
import math
import os
import random
import sys

import bmesh
import bpy

SEED = 20261119
random.seed(SEED)  # nothing below draws randomness; pinned so future edits inherit the rule


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = None
    for i, a in enumerate(argv):
        if a == '--out':
            out = argv[i + 1]
    if not out:
        raise SystemExit('usage: blender -b -P build_square_kit.py -- --out <dir>')
    return os.path.abspath(out)


def placeholder(name, base, roughness):
    """A flat Principled placeholder — the mount binds every slot away by name (the bind law)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    return mat


def box(bm, mat_index, x0, x1, y0, y1, z0, z1):
    """An axis-aligned box in Blender world coordinates, faces assigned to mat_index."""
    verts = [
        bm.verts.new(p)
        for p in (
            (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
        )
    ]
    for quad in ((0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([verts[i] for i in quad]).material_index = mat_index


def export(path):
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_apply=True, export_yup=True,
        export_texcoords=False, export_normals=True, export_tangents=False,
        export_materials='EXPORT', export_image_format='AUTO',
        export_cameras=False, export_lights=False, export_animations=False,
        export_skins=False, export_morph=False, export_extras=False,
        use_selection=False, export_draco_mesh_compression_enable=False,
        will_save_settings=False)


def main():
    out = parse_args()
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # === C1 content lands here (the node el:hq-east; design §3; the identity law above) ===
    # The Guards Corps HQ east wall — massing-with-portico, ONE mesh ≤ 1,500 tris, three
    # material slots. glTF frame: west face x 110, body depth 24 (east face 134), z 100–240,
    # cornice 20.5. Blender frame via the mapping law: x unchanged; y = −glTF_z (−100…−240);
    # z = glTF_y (0…20.5). Every vertex authored at WORLD coordinates, the object at the
    # origin — the identity law holds by construction. The planned tris ≈ 944: body 12,
    # plinth 12, тяга 12, 12 shafts 336, 12 bases 144, 12 capitals 144, entablature+cornice
    # 36, 124 window quads 248.
    m_massing = placeholder('massing', (0.5, 0.5, 0.5), 0.9)
    m_dressing = placeholder('dressing', (1.0, 1.0, 1.0), 0.85)
    m_darkpane = placeholder('dark-pane', (0.08, 0.08, 0.08), 0.6)

    FACE_X = 110.0  # the west face (glTF) — Blender x is the same axis
    Z_NORTH, Z_SOUTH = -100.0, -240.0  # Blender y = −glTF_z: north 100 → south 240
    TOP = 20.5  # HQ_CORNICE_M (glTF y) — Blender z
    PROUD = 0.15  # the courses'/cornice's projection west of the face

    bm = bmesh.new()
    # Body (massing): the whole block, floors 1–4 inclusive.
    box(bm, 0, FACE_X, FACE_X + 24, Z_NORTH, Z_SOUTH, 0.0, TOP)
    # Plinth course (massing): z 0–0.6, projecting PROUD.
    box(bm, 0, FACE_X - PROUD, FACE_X + 0.3, Z_NORTH, Z_SOUTH, 0.0, 0.6)
    # The тяга splitting the two rusticated floors from the smooth upper (massing):
    # HQ_STRING_COURSE_Y 9, ±0.15 tall, projecting PROUD.
    box(bm, 0, FACE_X - PROUD, FACE_X + 0.15, Z_NORTH, Z_SOUTH, 8.85, 9.15)
    # The portico order (dressing): 12 three-quarter columns imitating the loggia —
    # HQ_PORTICO: pitch 4.2, r 0.7, baseY 9, height 10.2, centreZ 170 (glTF z).
    for i in range(12):
        centre = -(170.0 + 4.2 * (i - 5.5))  # Blender y
        # Shaft: an 8-segment prism, r 0.7, centred ON the face (the east half embeds).
        shaft = bmesh.ops.create_cone(
            bm, cap_ends=True, segments=8, radius1=0.7, radius2=0.7, depth=10.0
        )
        bmesh.ops.translate(
            bm, verts=shaft['verts'], vec=(FACE_X, centre, 9.0 + 10.0 / 2)
        )
        # Base and capital blocks (dressing): slightly wider than the shaft.
        box(bm, 1, FACE_X - 0.85, FACE_X + 0.85, centre - 0.85, centre + 0.85, 8.5, 9.0)
        box(bm, 1, FACE_X - 0.85, FACE_X + 0.85, centre - 0.85, centre + 0.85, 19.0, 19.4)
    # Entablature + cornice (dressing): three projecting bands to the cornice line 20.5.
    box(bm, 1, FACE_X - PROUD, FACE_X + 0.15, Z_NORTH, Z_SOUTH, 19.4, 19.8)   # architrave
    box(bm, 1, FACE_X - PROUD, FACE_X + 0.15, Z_NORTH, Z_SOUTH, 19.8, 20.1)   # frieze
    box(bm, 1, FACE_X - PROUD - 0.15, FACE_X + 0.15, Z_NORTH, Z_SOUTH, 20.1, TOP)  # cornice

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # The 124 window quads (dark-pane): 31 bays × 4 declared rows, flat on the west face,
    # 0.02 proud. Rows (glTF y ranges): [1.5,4], [5,8], [10.5,14], [15,17.5]; width 2.2.
    ROWS = ((1.5, 4.0), (5.0, 8.0), (10.5, 14.0), (15.0, 17.5))
    BAYS = 31
    PITCH = (100.0 - 240.0) / BAYS  # Blender y step: −4.516…
    WINDOW_W = 2.2
    for bay in range(BAYS):
        centre = Z_NORTH + PITCH * (bay + 0.5)
        for z0, z1 in ROWS:
            quads = [
                bm.faces.new(
                    (
                        bm.verts.new((FACE_X - 0.02, centre - WINDOW_W / 2, z0)),
                        bm.verts.new((FACE_X - 0.02, centre + WINDOW_W / 2, z0)),
                        bm.verts.new((FACE_X - 0.02, centre + WINDOW_W / 2, z1)),
                        bm.verts.new((FACE_X - 0.02, centre - WINDOW_W / 2, z1)),
                    )
                )
            ]
            for f in quads:
                f.material_index = 2
    # The open quads' normals are wind-ambiguous — face them WEST (toward the square).
    bm.normal_update()
    for f in bm.faces:
        if f.material_index == 2 and f.normal.x > 0:
            f.normal_flip()

    # Whole-mesh white COLOR_0 (G5): the dressing primitives bind to the vertexColors kit
    # material; the massing/dark-pane primitives ignore the attribute.
    col = bm.loops.layers.color.new('COL')
    for f in bm.faces:
        for loop in f.loops:
            loop[col] = (1.0, 1.0, 1.0, 1.0)

    me = bpy.data.meshes.new('el:hq-east')
    bm.to_mesh(me)
    bm.free()
    for m in (m_massing, m_dressing, m_darkpane):
        me.materials.append(m)
    ob = bpy.data.objects.new('el:hq-east', me)  # the object name = the glTF node name
    bpy.context.scene.collection.objects.link(ob)
    # === The empty kit (M2) ships no further objects. =====================================

    if bpy.context.scene.objects:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    glb = os.path.join(out, 'square.raw.glb')
    export(glb)
    meshes = [{'name': me.name, 'triangles': sum(len(p.vertices) - 2 for p in me.polygons)}
              for me in sorted(bpy.data.meshes, key=lambda m: m.name)]
    summary = {'room': 'square', 'seed': SEED, 'meshes': meshes,
               'triangles': sum(m['triangles'] for m in meshes), 'glb': glb}
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True))


main()
