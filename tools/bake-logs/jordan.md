# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1508.7 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2940.6 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1895.4 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 6362 | bd415e7cc1e7886489fa95f6823bbefbe5af7b9ba5fd52384a900f912fff7867 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

- dusk: 49.0 min wall at 0.18 Msamples/s on this CPU; the full room (3 states) projects to ~147.0 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| nightChandeliers | 2.33813 | 4 | 0.25 | 1 | 0.001296 | 0 | lm/night.ktx2 351768 B e7e51ec2160fdf29af3880c9b28ddb710d46b97991c9f0355b939b244c1bff5f |

