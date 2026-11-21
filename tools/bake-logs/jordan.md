# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 3101.8 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2977.6 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 25846.4 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 5735 | 4669844f47208b31853f7811bd1bf7fc1197ae4eb59739631bf287a449197881 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

- day: 51.7 min wall at 0.17 Msamples/s on this CPU; the full room (3 states) projects to ~155.1 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- dusk: 49.6 min wall at 0.18 Msamples/s on this CPU; the full room (3 states) projects to ~148.9 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- nightChandeliers: 430.8 min wall at 0.02 Msamples/s on this CPU; the full room (3 states) projects to ~1292.3 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day | 2.690877 | 0.45 | 2.22 | 1 | 0.022575 | 0.014736 | lm/day.ktx2 453715 B ad6e17716efc5473759f59d525a5f0d485560364a8ec7f7ae02bcf7df13d765d |
| dusk | 0.194056 | 0.35 | 2.86 | 1 | 0.000439 | 0.00003 | lm/dusk.ktx2 362581 B b641e2dd8fabab268a177c6ecaee9b8acc8a15086d50565365e1aef7a85184d4 |
| nightChandeliers | 1.095636 | 4 | 0.25 | 1 | 0.000269 | 0.000025 | lm/night.ktx2 319767 B aa810373bac41bca9b3671ef059eee5416d868a61e523da5f38d4c6aa0eff88d |

