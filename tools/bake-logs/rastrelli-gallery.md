# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1524 | 0.0096 | 3091.9 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1056 | 0.0028 | 23097.7 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1536 | 128 | OPENIMAGEDENOISE | 0.8 | 2.1544 | 0.0026 | 2634.1 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 152276 | b767d7fdeed2b0e2ff1ba2a0c627819ecc82550d929211cf686d7570f4e79a5b |
| dusk | lm/dusk.ktx2 | 124858 | 0b8bcf90c3d1adaff6965c8547bd4cdee869081b011e5793f32b101cb26a64e6 |
| dusk | probe/dusk.ktx2 | 1734 | 487556b1ae801c1c1432dae3d428ea18aa38134069132478e2afcf957c1e1479 |
| nightChandeliers | lm/night.ktx2 | 104826 | ce5a236b7685d57685ae68b4f3bae820a9f19c4334397a0ff3fd0391105dd990 |

## Borrowed-hardware menu

- day: 51.5 min wall at 0.10 Msamples/s on this CPU; the full room (3 states) projects to ~154.6 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
- dusk: 385.0 min wall at 0.01 Msamples/s on this CPU; the full room (3 states) projects to ~1154.9 min at this rate — borrowed hardware recommended (§3.2); this never blocks.

---
## Post-encode artifacts (the RG-F2 re-encode; the committed bytes = the manifest)
| state | file | bytes | sha256 |
|---|---|---|---|
| day | lm/day.ktx2 | 290526 | 21070dfc50ded69a9ec45769e72972a25c9a60b23cd0d822eba44c13e15b86a3 |
| dusk | lm/dusk.ktx2 | 261009 | d4eec68c205bd6cde4f47eef67c84ba7963169a4db75ad5da903722f0e6cfe25 |
| nightChandeliers | lm/night.ktx2 | 260956 | 27bb7c1eedd4e9cbb7e90e617da3e1ae00a817b7fa8f11ba5cf43a311b6f55e9 |
paneApplied (day) = true — 1 proof row(s): applied; pre-paint exr bake-day/lm/day.exr 523e6569839eb207c269d7d8b58c266c0feb7c1189bed16d4bb7d630766f7934
paneApplied (dusk) = true — 1 proof row(s): applied; pre-paint exr bake-dusk/lm/dusk.exr 0e261878715800a01345caff8e38bfddce31be8e0df2363d7fa36df4ec57e317
paneApplied (nightChandeliers) = true — 1 proof row(s): declared-zero-verified; pre-paint exr bake-night/lm/night.exr 2aa5328205d1abaed169261850a2f535c96d505a579e84c7bb6497ffbe44fd35
