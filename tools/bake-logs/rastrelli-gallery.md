# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.2251 | 0.0094 | 502.3 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1246 | 0.0016 | 1789.3 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1324 | 0.0015 | 1342.1 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 133222 | bf323d0f9345d5c7909cd157147057c383abf0938da453d4b19da49571717b33 |
| dusk | lm/dusk.ktx2 | 105745 | 5b100049c197fc95ef0aff9b8961d6a973f37dd8f6c2f574761723762b4738d7 |
| dusk | probe/dusk.ktx2 | 1734 | 487556b1ae801c1c1432dae3d428ea18aa38134069132478e2afcf957c1e1479 |
| nightChandeliers | lm/night.ktx2 | 89631 | 433182fcf3dd9fabcf7a3d17843fa2edaaed560eb0bd540c54f4437f84fee0e9 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 188665 | c786522c379057f9b0e8d30e9a94cc45197184bcec561038d52d1f47d1a06785 |
| dusk | lm/dusk.ktx2 | 166552 | bdec329179a979771f8537016fd9608ba5d40cc08d6a563f10cf842a71b82bd6 |
| nightChandeliers | lm/night.ktx2 | 165953 | 5b5d211169220570c3b20d5597a60fa8728c4a9e624556d5276b1deea5e633cd |
paneApplied (day) = true — 1 proof row(s): applied; pre-paint exr bake-day/lm/day.exr 9db15b6d16fe6c1167233d5e81bcd53b85f039f7887cbe9b2f87c343f19fc67b
paneApplied (dusk) = true — 1 proof row(s): applied; pre-paint exr bake-dusk/lm/dusk.exr 3f34d002598a4ea1d25385025bba583acd6548a00f5fafbed6ad173a33921999
paneApplied (nightChandeliers) = true — 1 proof row(s): declared-zero-verified; pre-paint exr bake-night/lm/night.exr fb8f1c13fd49b9b824f77aa13cb65f9264205d9ad2f3c1db1c5c63f847e8da86
