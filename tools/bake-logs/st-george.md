# Bake log — st-george

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs st-george day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 2.3 | 2.1679 | 0 | 22.0 |
| dusk | `node tools/bake.mjs st-george dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.51 | 0.4887 | 0 | 144.4 |
| nightChandeliers | `node tools/bake.mjs st-george nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.15 | 0.1374 | 0 | 24.3 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 6174 | 319bcafef8dfc774e0e533c4d2a810336375709803dcd43d484bc95eaaab9c07 |
| dusk | lm/dusk.ktx2 | 5325 | 4b8e0af68c88c9c302c57258c24fb8c097bbbd6d39758c5519e61116d4250459 |
| dusk | probe/dusk.ktx2 | 9088 | f2f2fc56eac5956a4a2b53ca9621f458965f2378554ba871db771ed82eb186b5 |
| nightChandeliers | lm/night.ktx2 | 6035 | bded60c1cb3460590fb80c76792bdb16cd396f60c7750df9c30c4aa1dc0ead7f |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
