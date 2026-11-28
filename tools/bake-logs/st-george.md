# Bake log — st-george

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs st-george day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 2.09 | 2.0074 | 0 | 18.4 |
| dusk | `node tools/bake.mjs st-george dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.46 | 0.4393 | 0 | 85.7 |
| nightChandeliers | `node tools/bake.mjs st-george nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.93 | 0.8906 | 0 | 24.1 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 6600 | a9e60c06d9754bb75069eea429f0063f1c84dac99a51fbbcba1c6667f35d6991 |
| dusk | lm/dusk.ktx2 | 6103 | af969f118d71743c02f26c28ceab312db37e507276b9b655b1934589f69b1d7c |
| dusk | probe/dusk.ktx2 | 9376 | 0e56f335ee2e6ec8f1ea2a4cb178079df1e7227d14b02479c9823f051966d94c |
| nightChandeliers | lm/night.ktx2 | 5879 | 2f24fdf308332fa0d00241afd8c77543291222954cc28d946a291fea7ab8a13b |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
