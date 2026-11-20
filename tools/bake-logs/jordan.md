# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2747.1 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 6109.0 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 6270.5 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 6302 | 191da75961efa1e20783116ebe029e33ea912c8e4eb74641985cccb770035033 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

- day: 45.8 min wall at 0.20 Msamples/s on this CPU; the full room (3 states) projects to ~137.4 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- dusk: 101.8 min wall at 0.09 Msamples/s on this CPU; the full room (3 states) projects to ~305.4 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- nightChandeliers: 104.5 min wall at 0.09 Msamples/s on this CPU; the full room (3 states) projects to ~313.5 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day | 2.645531 | 0.45 | 2.22 | 1 | 0.021517 | 0.014146 | lm/day.ktx2 465767 B e257f5cd9f260a28a7451d404c19b6208f8bb55bab78e95c2584aaef94812214 |
| dusk | 0.194362 | 0.35 | 2.86 | 1 | 0.000458 | 0.000027 | lm/dusk.ktx2 376486 B 727cb1dca27a6ebf5e1be7de5cc7cd15a4850e21befbf5844411a725a13d7a36 |
| nightChandeliers | 1.115335 | 4 | 0.25 | 1 | 0.000281 | 0.000022 | lm/night.ktx2 329589 B 1e35694936b998474d6b019aa6310a706f920973c8cd8f3b9b3672cb4d8025f4 |

