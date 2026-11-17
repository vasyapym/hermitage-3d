# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 982.9 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1783.4 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1566.5 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 6390 | 4bcd13e345610d62299d5604a5a78a2fd38edf7b656fb2892f9c696d87f2c991 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | null | null | null | 1 | null | null | null |
| nightChandeliers | percentile | srgb | null | null | null | 1 | null | null | null |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| nightChandeliers | 2.353849 | 4 | 0.25 | 1 | 0.001353 | 0 | lm/night.ktx2 338168 B d6f89a6658043905167b497432316cad84177565a00ee22ef2188d4604761e42 |

