# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.4771 | 0.0018 | 396.5 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.111 | 0.0015 | 626.6 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1324 | 0.0015 | 451.2 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 67856 | 83189dc474cc05123caa20a0d2f4a07a22ad30c9210cddf1351075c91657e10a |
| dusk | lm/dusk.ktx2 | 93548 | 1c60d73c5e536719e1d635f91776df919ec97985bc952887e36d92c3c0851803 |
| dusk | probe/dusk.ktx2 | 1734 | 487556b1ae801c1c1432dae3d428ea18aa38134069132478e2afcf957c1e1479 |
| nightChandeliers | lm/night.ktx2 | 89631 | 433182fcf3dd9fabcf7a3d17843fa2edaaed560eb0bd540c54f4437f84fee0e9 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 185659 | 658fd27133c3f1f681bc90a499cb27b212b8be5e2f56336aa1e2f702ae76fa71 |
| dusk | lm/dusk.ktx2 | 167986 | 483b43514f97166182c8332605643cffc8b31930ad7e8bcc3a8cae77234c9194 |
| nightChandeliers | lm/night.ktx2 | 165959 | 064ea1dfe914bb3e01d273e2bfb7ceaa0ef023b9be98b9d079666c07c1b50474 |
paneApplied (day) = true — 1 proof row(s): applied; pre-paint exr bake-day/lm/day.exr 8018c13a5cf87244bf0c7ab350e390b9fdda98386dbcbd4504604065220e95ea
paneApplied (dusk) = true — 1 proof row(s): applied; pre-paint exr bake-dusk/lm/dusk.exr ffd65d165a6ce780ea80d2123da3aefc32caa3d6ab6221ba86457adf66a7076b
paneApplied (nightChandeliers) = true — 1 proof row(s): declared-zero-verified; pre-paint exr bake-night/lm/night.exr f460a0e2c8977e00028aaf4157b9d1f95163562b32cfd966fd5918351b88c66d
