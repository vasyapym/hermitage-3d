# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 3.0999 | 0 | 713.0 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 23.3192 | 0.0003 | 1294.6 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 21.9716 | 0.0003 | 1297.5 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 54649 | fb5e9abdfa3686ea7281b55e2b951840355df232aac744a8c38b08a2047d2354 |
| dusk | lm/dusk.ktx2 | 53576 | 5bf61fcdd19d2ef9d5e8bf8cbf7f992a8c92759100ab1b90733892ef5a8cd7a3 |
| dusk | probe/dusk.ktx2 | 4260 | 399189a35a0b9bd92c1082e1cfe320ce2344ee8c22f00c8b9198861840e98d04 |
| nightChandeliers | lm/night.ktx2 | 121104 | 4744845ee971dc5eea5372bb0b1b906abe0e21848a524236c2fccfab0d98ce13 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
