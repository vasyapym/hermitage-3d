# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1785.5 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2402.2 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2946.8 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 5690 | e303b0aac36823883f5f95aa286f166833c7ed0f3558cf6234c146c23c475e16 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

- nightChandeliers: 49.1 min wall at 0.18 Msamples/s on this CPU; the full room (3 states) projects to ~147.3 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day | 2.703574 | 0.45 | 2.22 | 1 | 0.022793 | 0.014758 | lm/day.ktx2 455240 B 779010b841a6095fb0a825601776a6e6740a3ccd006582d12765d5d2102e25bf |
| dusk | 0.194884 | 0.35 | 2.86 | 1 | 0.000448 | 0.00003 | lm/dusk.ktx2 362744 B dc2575fe82615ea403fd4dfe1c5bd82e1ca8f4953d6fff35b3c2a30c7db76d97 |
| nightChandeliers | 1.104837 | 4 | 0.25 | 1 | 0.000272 | 0.000025 | lm/night.ktx2 315928 B e871a53ff2bdad4b6556a3d9daf206d8a3d1b0f9ca3ede2c9416f3866ba0a4ea |

