# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.4771 | 0.0018 | 451.5 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.111 | 0.0015 | 753.3 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1324 | 0.0015 | 725.6 |

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
| day | lm/day.ktx2 | 185647 | 5c1a499afc977b785e1394d9badc75d76d3b6bff3299ea17cf70e37fca980b6e |
| dusk | lm/dusk.ktx2 | 167956 | 0bb018fdef44ac9298f9c439a6617660cc985514660f9513256f084cd42a03c2 |
| nightChandeliers | lm/night.ktx2 | 165953 | 5b5d211169220570c3b20d5597a60fa8728c4a9e624556d5276b1deea5e633cd |
paneApplied (day) = true — 1 proof row(s): applied; pre-paint exr bake-day/lm/day.exr c25b19d7095b9a0e7a768c51a2300c90e87f2a047d5466c1da038164e5b0c7e0
paneApplied (dusk) = true — 1 proof row(s): applied; pre-paint exr bake-dusk/lm/dusk.exr 7518b3e3f0d0e7bd5e68cb11ae31526e25464e411b4d6d5264ffaa5f382147c3
paneApplied (nightChandeliers) = true — 1 proof row(s): declared-zero-verified; pre-paint exr bake-night/lm/night.exr 27e4df86d0ef2c39dbdbda9d5de98860b6a7a77738c473d1e945fbfb4639a1c8
