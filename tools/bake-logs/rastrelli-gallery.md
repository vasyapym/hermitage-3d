# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 4.2241 | 0 | 408.4 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 2.227 | 0 | 640.4 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 2.1981 | 0 | 574.4 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 20319 | 0a397615ded1105677c4a30570243fd857dcdb120bd65f243c8d53291343bf65 |
| dusk | lm/dusk.ktx2 | 18674 | ff89e11e8decaad67eb157719bf9ae3aa8195f51035806d19c7e9ccef1e97c25 |
| dusk | probe/dusk.ktx2 | 2206 | f2e64c2f8379754bf711e83644f87f20f5ca0815cff0638122ba3dc1d1593a8e |
| nightChandeliers | lm/night.ktx2 | 14032 | de80902f10581d79664594ec86957cb6b5a37cea2592b31d057ddd3d56281e13 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
