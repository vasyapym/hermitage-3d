# Bake log — st-george

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs st-george day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 2.09 | 1.7114 | 0 | 75.1 |
| dusk | `node tools/bake.mjs st-george dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 0.46 | 0.432 | 0 | 153.5 |
| nightChandeliers | `node tools/bake.mjs st-george nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 1.07 | 1.0232 | 0 | 100.9 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 14720 | d223d26d7d51a5f818a50bc9ccdadfb5e8cebe455a4c756c315c1ba324a2e379 |
| dusk | lm/dusk.ktx2 | 11806 | a00c653a7b043cd6341537199ced0e3511df485fd2e6d6d72d147010aa513dd4 |
| dusk | probe/dusk.ktx2 | 7244 | b77ece058d3605b2d406667e0c963c70f59eb28dc571fdabcbe852911196351c |
| nightChandeliers | lm/night.ktx2 | 11697 | c6b88270a30893c359f7a7305ca46e3ee2c42af57054b5d57390bf19c6d99888 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
