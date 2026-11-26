# Bake log — st-george

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs st-george day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 1.5 | 1.4056 | 0 | 14.0 |
| dusk | `node tools/bake.mjs st-george dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.25 | 0.2279 | 0 | 90.8 |
| nightChandeliers | `node tools/bake.mjs st-george nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.1 | 0.1 | 0 | 18.1 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 3880 | 9b5b527d8353085114ab20b95828def4d2478fac8f7b5834073a72b2b995e82d |
| dusk | lm/dusk.ktx2 | 3963 | a3ee9587f84479061cb26382a5a30bc5fe23977c88373f293b7ac6f9ff79be1d |
| dusk | probe/dusk.ktx2 | 8907 | 59c12d5309592084178f84f7d107cc16030bc5919695e4c1ff87a15c7df5b9e7 |
| nightChandeliers | lm/night.ktx2 | 3924 | 54bbaf8c589bd88299c76786fbffedd121cf1f0c2e9e3cf229d47f304ccb74bc |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
