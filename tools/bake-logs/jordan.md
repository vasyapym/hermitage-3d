# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2373.5 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 3011.0 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2787.6 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 13535 | cef3cd4b744f437eed86dc4760a0fcf0bcdab098c695b551424022168557e802 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

- dusk: 50.2 min wall at 0.18 Msamples/s on this CPU; the full room (3 states) projects to ~150.6 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- nightChandeliers: 46.5 min wall at 0.19 Msamples/s on this CPU; the full room (3 states) projects to ~139.4 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day | 1.02422 | 0.45 | 2.22 | 1 | 0.017272 | 0.000344 | lm/day.ktx2 304963 B 284c01b72da0ceda96d3d043fc7401dc3bf213a02159b46079ace6fd391158e5 |
| dusk | 2.357531 | 1 | 1 | 1 | 0.028745 | 0.001353 | lm/dusk.ktx2 324047 B 7b36773648e634e58f982f20423b8dab4580f7161a1e4367cf7dd817887cc61f |
| nightChandeliers | 2.365537 | 1.2 | 0.83 | 1 | 0.020231 | 0.000148 | lm/night.ktx2 313051 B 7288c24a2ec3fdfa3388a26c14c0988adea6bf25cac9a38ef20646cc4b2bdf61 |

