# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 4.0484 | 0.0135 | 347.6 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.3667 | 0.0023 | 304.3 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.2239 | 0.0022 | 341.6 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 183655 | ccae696e288096fa0f41dbb1ba67988e31b8e0797c388e14b08fddbb68b570d1 |
| dusk | lm/dusk.ktx2 | 147426 | cbb520b02c733dd3b1756a57ac73e191200c5ab55e2f6fcb28aedc07af766c0f |
| dusk | probe/dusk.ktx2 | 2348 | bbed81b76f5f4aca933bfc4a514a6960b3c36ae9bccaa88d1a0efd57a4296b1c |
| nightChandeliers | lm/night.ktx2 | 118163 | 2f88ab23c91d5a6764ea0cf6aa72835867fff20167f328fdb9a88edc7852be81 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 336627 | b7f952bca591f4c55ba0371d83b199044ce7d53c0a144367b51bca7858befbc9 |
| dusk | lm/dusk.ktx2 | 303413 | cf728dc788ce39cfc2d36620d4054051fe6d596651e80e4206fe87de2d8cf1b2 |
| nightChandeliers | lm/night.ktx2 | 301235 | 983c4d51ce2fc111b978e673d8c9d578bed817a1a6b7211ea7c8585db2d141fa |
paneApplied (day) = true — 2 proof row(s): applied / applied; pre-paint exr bake-day/lm/day.exr 1dbcc16a33f032a55f9d5499186af347926133c851f9ec9206bd07e9d1d92def
paneApplied (dusk) = true — 2 proof row(s): applied / applied; pre-paint exr bake-dusk/lm/dusk.exr bcbafec2d43fb9b98a15a5604222aa62bc364adccee8de16a2869a26a94d1bf5
paneApplied (nightChandeliers) = true — 2 proof row(s): applied / declared-zero-verified; pre-paint exr bake-night/lm/night.exr f7e54822d347cc60daac56700cd0d06bdd4e25aba97029e6b70033a987f0f625
