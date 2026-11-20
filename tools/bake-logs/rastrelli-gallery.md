# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.2428 | 0.0097 | 3413.6 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1054 | 0.0028 | 3571.5 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1544 | 0.0026 | 2324.2 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 151328 | b0bd7a058be853a41d3cf11d753d0d65178e5cf90fed596bea78b2c926284a6d |
| dusk | lm/dusk.ktx2 | 125034 | 449f3a73a67677bfafac251c6ab51e852067255a5de8a7d86f80fbe63cfb20f6 |
| dusk | probe/dusk.ktx2 | 1734 | 487556b1ae801c1c1432dae3d428ea18aa38134069132478e2afcf957c1e1479 |
| nightChandeliers | lm/night.ktx2 | 104826 | ce5a236b7685d57685ae68b4f3bae820a9f19c4334397a0ff3fd0391105dd990 |

## Borrowed-hardware menu

- day: 56.9 min wall at 0.09 Msamples/s on this CPU; the full room (3 states) projects to ~170.7 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- dusk: 59.5 min wall at 0.08 Msamples/s on this CPU; the full room (3 states) projects to ~178.6 min at this rate — borrowed hardware recommended (§3.2); this never blocks.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 291308 | a7913fd817f13733f4579b18ef932cea212a767a4f5c6da7baad88bd4f259c26 |
| dusk | lm/dusk.ktx2 | 261120 | a08d7e6ce790274c502836cb9eac96a04237306e77621bb95995fabe05f36578 |
| nightChandeliers | lm/night.ktx2 | 260956 | 27bb7c1eedd4e9cbb7e90e617da3e1ae00a817b7fa8f11ba5cf43a311b6f55e9 |
paneApplied (day) = true — 1 proof row(s): applied; pre-paint exr bake-day/lm/day.exr a2c5fd40697cf4a24b2ba6b74e68b2c776d33ddf9041e4c4d708ce4c99e6a1db
paneApplied (dusk) = true — 1 proof row(s): applied; pre-paint exr bake-dusk/lm/dusk.exr dec3c87e710732325ec755750540d3b31487c4d3c7b719529e9e14f8be637f00
paneApplied (nightChandeliers) = true — 1 proof row(s): declared-zero-verified; pre-paint exr bake-night/lm/night.exr 898df657b13527145c3ecc7c4a4a6f3a08455319ce3d019ed3f34123324ce6f9
