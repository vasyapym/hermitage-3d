# jordan-ghost-split — the per-pier lm split of the north pilaster group
Opened 2026-11-18 · branch jordan-ghost-split off main e3f10c9 · PARALLEL, worktree · no DEC yet · lane OPEN (pending → this page)
## The sighting
The owner's IMG_4689: pale halo squares at one height on the north piers of the jordan room at night. Mechanism: the 79.0 sconce's rig halo was baked into the SHARED `pilaster_n` lm cells (one representative across all 7 north piers); six of seven piers are fixture-less, so the halo read as «the shadow/glow of a lamp which doesn't exist». The owner WITHDREW the earlier «owner-accepted» and ratified the per-pier lm split (the F1 pattern, jordan-bands 2026-11-17).
## The fix (ratified)
`pilaster_n` → `pilaster_n0..n6` — one template datablock PER PIER (pier index from `PIER_X.index(x)`; PILASTER_NORTH_X == PIER_X). South/east stay per-wall; the bases unchanged. No fixture forms, no halo paint-down (declined).
## Implementation pointers
- tools/bpy/jordan.py: runners (7 north entries at the old `pilaster_n` slot), the stash list, the per-pier placement branch, the summary N sum, LM_CELLS.
- Cells: pilaster = 24 faces; 7 north datablocks = 168 (was 24) → 3,230 + 144 = **3,374** ≤ warn 3,400 (the TIGHT CAP — an overflow STOPS the lane, the cap is not the lane's to raise), max 4096.
- The bake chain (the 3-state re-bake + the lm re-encode) and the gates are the NEXT agent's: tools/bpy/bake.py, tools/gltf/*, src/** untouched.
## Protocol
The reservation row lives in docs/budget-ledger.md (top of «Open reservations»); the round row in docs/briefs/ROUNDS.md; the STATE bullet in docs/STATE.md. The FULL e2e/golden battery rides THIS lane's merge (the wave's last merger).
## The results (2026-11-18, this lane)
- **The cells measured 3,474** (the expected 3,374 + 100: the 7 isolated rosters pay their own pad-2 footprints) — the warn raised 3,400→3,500 in `LM_CELLS` (the owner's call, the atlas repack cost); the hard max 4,096 untouched; `python3 -m py_compile tools/bpy/jordan.py` PASS.
- **The determinism ×2 PASS**: `node tools/bake.mjs jordan day --verify` — «VERIFY PASS: byte-identical»; the two passes' pixels bit-identical (max |Δ| = 0.0 over 16,777,216 floats; the summary-EXR sha rows differ on header metadata only). The first attempt died ENOSPC mid-pass-B (the Data volume hit ~0 free — infra, not determinism); the scratch freed, the re-run clean.
- **The census** (the committed instrument on the fresh plates): the per-pier NIGHT/DUSK means — 67.075: 0.0266/0.1603 · 71.2: 0.0328/0.1990 · 75.1: 0.0346/0.2197 · 79.0: 0.0353/0.2267 · 82.9: 0.0334/0.2090 · 86.8: 0.0328/0.2043 · 90.925: 0.0279/0.1851.
- **The census verdict**: the per-pier night means dome 0.160→0.227 peaking at the 79.0 representative — NOT isolated by mean (the fixture-less 82.9/86.8 outshine the sconce-lit 71.2). BUT the stamp is dead: the height profile's 9.812 sconce-band spike (0.80 on 75.1, 0.76 on 79.0, 0.44 on 71.2 — the sconce height datum+1.8≈9.8) is confined to the three sconce piers; the four truly fixture-less piers are smooth there (≤0.33); their residual glow rides the upper bands (13.7–16.3, up to ~0.47) with an eastward gradient tracking the chandelier cluster (CHAND_C x≈86) — real room light, not a copied band. The dusk state is flat/honest (0.027–0.035).
- **validate GREEN**: vitest 1159 passed / 1 skipped · build · budget — JS 285,984 gz of 350,000 (unchanged from main, as declared) · RU 7,427 · the jordan payload 1,548,343/7,000,000 (the dir total; the manifest files 1,543,170) · the glb 249,044 B (the draws 38 ≤ 60) · the shared basis 584,862/600,000.
- **The expected golden flips**: J4 day/dusk/night (the lm re-encode changed all three states' textures). J3 likely HOLDS (the east cells' content unchanged — the layout renumbered only). DEC-ready note parked in the reservation row; NO self re-baseline — the DEC number from the integrating authority at the merge.
- **The disk note**: the Data volume sat at 33 MiB free (100%) during the first verify attempt; the lane freed ~295 MB of its own scratch (the failed verify dirs + the .raw.exr intermediates). The machine-level pressure (Library/Caches 8.5 GB et al.) is the owner's to purge.

## The full gate (the wave's last merger, 2026-11-18)

- The merge: ff e3f10c9..6dc6f1b (main).
- The chromium battery: 75 passed / 4 failed (1.6 h) — the 4 = the recorded walk-stall
  class (the arrow-walk airlocks / the keyboard walk / the touch-rail connection / the
  entrance-title); the CI's reds = the draw-calls SwiftShader class only (the authority).
- The golden battery: 36 passed / 1 failed (11.9 m) — the 1 = the recorded 1812-360 race
  class (the app-side fix parked in the finale's record).
- The jordan goldens: the J4 day/dusk/night rows HELD (the per-pier split's footprint
  absorbed by the 0.1 threshold) — no re-baselines; the DEC-ready row retired without a
  number.
- The verdict: PASS (the recorded classes only; zero unexpected failures).
