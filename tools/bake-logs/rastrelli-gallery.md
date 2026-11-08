# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.5239 | 0.0019 | 433.7 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.0999 | 0.0015 | 635.0 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1329 | 0.0015 | 668.8 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 65121 | 442b0a356117c9a9deaeaa8997c631d8e7397d933c8316b342a1f6ffb863479c |
| dusk | lm/dusk.ktx2 | 92709 | dad0d191d633bc3982d22b2bc674d34a4675821aec98bb0ebb5b3732c55eeeea |
| dusk | probe/dusk.ktx2 | 1755 | 2f849f82fa8e6ffa0a314dea7ec481c9fc4cd60187a95e6ea36f02dd211b3f2f |
| nightChandeliers | lm/night.ktx2 | 88381 | 84c095a08c6ce7338aeab31c36c214723ab58915cb8828d6ae71fba0e6b357bf |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 187652 | d114702be5c1c28c723da81569cb8df1f7128b036e83b8959115f43f59b46c74 |
| dusk | lm/dusk.ktx2 | 169305 | 97f7192713c8cc2a36bb789b8cccad0e0332b07563748bb109d4416c64ed56bb |
| nightChandeliers | lm/night.ktx2 | 167355 | 951e9e35fd0baf7383e82f80838e5de06bfdac51c76c7d3cb5c90b39da97b726 |
