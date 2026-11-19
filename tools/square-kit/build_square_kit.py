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
    # === The empty kit (M2) ships no objects and no materials. ============================

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
