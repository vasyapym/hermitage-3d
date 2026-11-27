# Bake log — st-george

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs st-george day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 2.3 | 2.1529 | 0 | 13.4 |
| dusk | `node tools/bake.mjs st-george dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.51 | 0.4881 | 0 | 59.8 |
| nightChandeliers | `node tools/bake.mjs st-george nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 0.15 | 0.1372 | 0 | 16.6 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 6170 | e8e5711704a6ff1ec841aeb6d8798af68f73a510fed244476a1c55d674f45347 |
| dusk | lm/dusk.ktx2 | 5263 | 9d331325aa1094c5a03062b2829057e96b0ee051e64a0ad0c91c775143920893 |
| dusk | probe/dusk.ktx2 | 9142 | f3d4adfb95f15e15a429491fecc993d5a98b6ed5914667deec4bdb4b65e2c4e3 |
| nightChandeliers | lm/night.ktx2 | 5919 | a45729b667a42292c3f2b120ab597a2e9a208abf61aedc192d6d79c9c6f83c52 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
