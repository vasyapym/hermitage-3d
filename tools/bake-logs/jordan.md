# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 1083.9 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 2425.6 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | percentile | null | null | 3427.2 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| dusk | probe/dusk.ktx2 | 6390 | 4bcd13e345610d62299d5604a5a78a2fd38edf7b656fb2892f9c696d87f2c991 |

## Encode

| state | mode | transfer | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | percentile | srgb | null | null | null | 1 | null | null | null |
| dusk | percentile | srgb | 0.251881 | 0.35 | 2.86 | 1 | 0.002065 | 0 | 299077 B be38e5cdb35331f5b6c6994158cf1c1cd01be110265895a5f610a8b27166fac3 |
| nightChandeliers | percentile | srgb | 2.362587 | 4 | 0.25 | 1 | 0.001388 | 0 | 260617 B f7fa86df7cc8e3a323874ce45c37b1c00f99c79a69418032830828ae9898e733 |

## Borrowed-hardware menu

- nightChandeliers: 57.1 min wall at 0.16 Msamples/s on this CPU; the full room (3 states) projects to ~171.4 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
<!-- lm-percentile: deterministic encode block, rewritten by tools/lm-percentile.mjs -->

## Encode — lm-percentile (D1-e)

| state | wRaw | w | gain | kappa | clipped | halo | artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| day | 2.677779 | 0.45 | 2.22 | 1 | 0.022296 | 0.015051 | lm/day.ktx2 358260 B c4b3ae53b13048233dbf5ac5ad8aea77237382cdd79ad834d3238666e2539ef7 |
| dusk | 0.251881 | 0.35 | 2.86 | 1 | 0.002065 | 0 | lm/dusk.ktx2 299077 B be38e5cdb35331f5b6c6994158cf1c1cd01be110265895a5f610a8b27166fac3 |
| nightChandeliers | 2.362587 | 4 | 0.25 | 1 | 0.001388 | 0 | lm/night.ktx2 260617 B f7fa86df7cc8e3a323874ce45c37b1c00f99c79a69418032830828ae9898e733 |

