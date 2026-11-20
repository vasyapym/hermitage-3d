# jordan-fixtures · B0 admission census — main @ 3da446d (branch jordan-next)

Run 2026-11-19, worktree `~/Documents/hermitage-3d-jordan-next`, Blender 4.2.23 LTS
(tools/toolchain.json pin). Machine numbers:
`docs/probes/jordan-fixtures-census.json` (the full census report, `b0` key). The
instrument: `tools/probes/jordan-lm-census.py` extended with the B0 flags
(`--per-object --free-blocks --frame-share --clamp-baseline --assert-max N --json PATH`),
additive per the batches convention — proved byte-identical on the default path (below).

Law: the census reproduces the committed pins or it is wrong — fix the probe, never the
room (D5). A legitimate cells.json drift STOPs the census (K7).

## Self-check (D5)

| pin | measured | expected | verdict |
|---|---|---|---|
| cells | 3,474 | 3,474 | PASS |
| draws (unique primitives, the committed gate) | 38 | 38 | PASS |
| drawn tris | 21,872 | 21,872 | PASS |
| W (manifest lightmaps.intensity) | 0.45 / 0.35 / 4.0 | 0.45 / 0.35 / 4.0 | PASS |

Completeness (D5): **PASS** — 11 fixtures enumerated (1 chandelier + 10 sconce
instances), 19 rig lights (10 sconce lamps + 8 chandelier ring lamps + 1 core), the
light-to-fixture pairing complete (bake.py walks the builder's own rosters west → north →
east; the sconce naming follows creation order, so lamp *k* pairs with the *k*-th
instance).

## DECISION LINE (exactly one)

```
DECISION ADMIT-FULL — sconce peak 3.9182% at J0 · chandelier peak 3.6082% at J4 · largest free rect 576 cells · night margin 41.55%
J4: fixture share 3.6662% > 0 → a re-baseline of (day, dusk, nightChandeliers) is PREDICTED, bounded to the fixture mask dilated 8 px
```

All four ADMIT-FULL conditions hold: sconce peak ≥ 0.10 % ✓ (3.9182 % at J0), chandelier
peak ≥ 0.10 % ✓ (3.6082 % at J4), a free block ≥ 6 cells ✓ (576-cell largest free rect),
night margin ≥ 5 % ✓ (41.55 %). FALSIFIED's premise fails (the J1b sconce reads 0.2920 %
≥ 0.20 %). The ADMIT-SCONCES-ONLY triggers all fail (the chandelier peak is far above
0.30 %, the block is far beyond the sconce need, the envelope holds — below).

**The J4 line is the round's biggest carry:** the fixtures will be visible at J4 (3.67 %
of frame, the chandelier dominates), so the three J4 goldens are PREDICTED to flip and
re-baseline at B4, bounded to the fixture mask dilated 8 px (K5's "unpredicted" class
excluded in advance).

## D1 — frame share × 7 stops (geometry-only object-ID pass)

Camera: each stop's position IS the eye (feet on treads + 1.7, rooms/jordan/contract.ts),
aimed at the stop's authored subject; vertical FOV 55° (src/camera/portrait-frame.ts:16
«LAW»), 1280×720, per-pixel-centre raycast over the FULL built scene (one BVH, no lights,
no renderer). Counts are exact (no anti-aliasing); a fixture hidden behind a wall counts
nothing. State-independent.

| stop | sconce body % | sconce glow % | chandelier body % | chandelier glow % | all fixtures % |
|---|---|---|---|---|---|
| J0 | 0.9905 | 2.9277 | 0 | 0 | 3.9182 |
| J1 | 0.9334 | 2.5218 | 0 | 0 | 3.4552 |
| J1b | 0.0340 | 0.2580 | 0 | 0 | 0.2920 |
| J2 | 0.2127 | 1.3949 | 0.3675 | 0.1656 | 2.1407 |
| J2b | 0.0548 | 0.3410 | 0.9073 | 0.3531 | 1.6562 |
| J3 | 0.0166 | 0.1000 | 1.0940 | 0.5175 | 1.7281 |
| J4 | 0.0112 | 0.0468 | 2.0292 | 1.5790 | 3.6662 |

(Columns are % of the 921,600-px frame; glow dominates the sconce share because the
placeholder's glow box is larger than its bracket — the FORM work replaces exactly this.)

Per-instance detail (the json carries all 11 instances × 7 stops with per-instance pixel
counts, the camera→instance distances by literal node origin AND by world bbox centre):

- **J1b (the gaze stop):** 3 instances visible — `sconce.005` (7.95 m, 169 body + 1,390
  glow px), `sconce.006` (10.81 m, 92 + 625 px), `sconce.007` (14.39 m, 52 + 363 px).
  The gaze subject FLIGHT2_SCONCE is `sconce.006` (x 75.1): its own share is 0.078 %;
  the stop's 0.292 % leans on the closer sconce.005.
- **J4 (the landing stop):** the chandelier alone = 18,701 body + 14,552 glow px
  (3.608 %, bbox-centre distance 7.55 m — its node origin is (0,0,0), built in-place, so
  the bbox-centre distance is the meaningful one), plus the east sconce.009 (15.58 m,
  103 + 431 px).
- Visible instance counts per stop: J0 8 · J1 5 · J1b 3 · J2 4 · J2b 3 · J3 3 · J4 2.
- Gaze baselines for B1 (informational — SCONCE_GAZE_TOL 0.15 pins the NEW form's bbox
  centre, not the placeholder): the placeholder sconce.006's bbox centre reads
  (75.1, 9.67, −85.76), 0.3106 m from the contract's (75.1, 9.5, −85.5); the chandelier's
  bbox centre sits exactly over CHAND_C (86, −74) at (86, 16.65, −74).

## D2 — per-object cell ledger + free blocks + ATLAS_HASH

Atlas: 64×64 cells of 32 px (res 2048, pad 2 px; the committed law is ONE cell per mesh
FACE, so islands == faces == cells touched == cells owned exclusively today).

| object | cells | cell range | instances | glow m²/instance | area m²/instance | faces by material |
|---|---|---|---|---|---|---|
| chandelier (placeholder) | 214 | 2881–3094 | 1 | 3.613 | 14.467 | gilt 142 · chandelier_glow 72 |
| sconce (placeholder) | 12 | 3095–3106 | 10 | 0.551 | 0.711 | plaster_warm 6 · sconce_glow 6 |

**The placeholders own 226 cells today (12 + 214)** — ACCEPTANCE #2's inference, now
measured authoritative. Retiring them frees more than the ruling assumed; the ≤ +20
ceiling stands comfortably. World bboxes (glTF, the GLOW_AREA_PARITY /
CHANDELIER_ENVELOPE baselines): chandelier [84.38, 13.4, −75.62 … 87.62, 19.9, −72.38];
sconce template bbox [−0.13, −0.05, −0.48 … 0.13, 0.45, −0.0] (instances carry it to
their mounts). Totals: 24 objects, 3,474 cells allocated of 4,096 → **622 free**.

Free-cell map and the largest CELL-ALIGNED free rectangles (the FIXTURE_LM_BLOCK
candidates ≥ the 2-cell B4 sconce estimate; the two maximal rects found):

| candidate | cells (x0,y0)…(x1,y1) | px |
|---|---|---|
| largest | 576 (0,55)…(63,63) = a 64×9 strip | [0,1760 … 2048,2048] |
| second | 460 (18,54)…(63,63) | [576,1728 … 2048,2048] |

**FIXTURE_LM_BLOCK (chosen, ≤ 6 cells): cells (0,55)…(5,55) = 6 cells = a 192×32 px
strip [0,1760 … 192,1792]** — the largest maximal free rect anchored at its low corner,
clipped to FIXTURE_LM_BLOCK_CELLS = 6 (the pick law is stated in the json). The atlas's
bottom nine rows are entirely free; the block sits inside the largest strip.

**ATLAS_HASH (the AS-1 baseline name):
`d5d2706e75eff604b8ff40c0a5127d3aa082b39b33a1045ad8254c3edcd92354`**
— sha256 over every DISTINCT TEXCOORD_1 accessor's STORED glb payload bytes in mesh
order (38 distinct accessors, 38,482 bytes; the committed glb is fully
meshopt-compressed, one accessor per primitive, no sharing — each hashes its
EXT_meshopt_compression stored range inside the single BIN chunk).

Envelope (the ADMIT-SCONCES-ONLY check): the placeholder chandelier's bbox grown 0.10 per
side holds the 3 pinned tiers — 3.44 m horizontal available vs the 2.80 m widest ring
(implied CHANDELIER_FIT scale 1.2286, i.e. the envelope is LOOSER than the pinned
numbers), 6.70 m vertical vs the 1.70 m two-tier span → **holds**.

## D4 — night clamp baseline (per state)

No staged bake EXRs exist (`node_modules/.cache/zimny-asset-stage/jordan` is absent), so
the committed bake-log encode rows (tools/bake-logs/jordan.json, measured on this exact
bake chain) carry the statistics — the recorded degradation. The EXR path
(`tools/bpy/lm_percentile.py`'s exact statistic: allocated-interior Rec.709 luminance
excluding the pane / sconce_glow / chandelier_glow emitter chips; wRaw = order statistic
np.partition(L, k)[k], k = floor(99.5/100·(n−1))) is implemented and validated but
inactive this round.

| state | source | band | W | clamp side | raw P (p99.5) | margin \|P−W\|/W | clipped fraction | halo | gain | κ |
|---|---|---|---|---|---|---|---|---|---|---|
| day | bake-log | [0.2, 0.45] | 0.45 | upper | 2.662714 | 491.71 % | 0.021923 | 0.014409 | 2.22 | 1 |
| dusk | bake-log | [0.35, 0.45] | 0.35 | lower | 0.247161 | 29.38 % | 0.001928 | 0 | 2.86 | 1 |
| night | bake-log | [4.0, 4.5] | 4.0 | lower | 2.338130 | 41.55 % | 0.001296 | 0 | 0.25 | 1 |

**The B5 W-pin premise HOLDS:** every raw percentile sits on the same side of its clamp
as pinned (day raw ≥ 0.45 — far above; dusk raw ≤ 0.35; night raw ≤ 4.0), so the pinned
W = 0.45 / 0.35 / 4.0 survives transport while the raw percentile stays on its side.

Night per-rig-light max/p99 within 1.5 m: **SKIPPED-NO-EXR** (the EXR path requires the
staged bake EXRs; the committed bake-log carries no per-light linear figures).

Dark-median (the D4 rider): the committed re-measure (docs/STATE.md 2026-11-17) — global
−1 / 0 / −1 · dark +1 / 0 / −1 (the ORIENTATION law: the transcoder rows are top-down).
The re-run is **SKIPPED-NO-EXR**: `tools/probes/jordan-dark-median.mjs` is not
standalone — it requires `<stage-with-bakes> <cells.json> <day|dusk|night.ktx2>` (the
stage with bake EXRs is missing; it ran 2026-11-17 and its figures are the committed
record this report quotes).

## Additive law — the byte-identity proof

**PASS** (re-run against the final delivered census). The pristine committed census
(`git show 3da446d:tools/probes/jordan-lm-census.py`) and the extended census were run
with the SAME legacy argv (`--builder <checkout>/tools/bpy/jordan.py --out <stage>
--plates day=<synthetic 2048×2048 plate>`) into two stage dirs: **census.json is
byte-identical**, and stdout differs in exactly one line — the `ZIMNY_CENSUS <path>`
echo of the two DIFFERENT `--out` input paths. With both runs sharing one `--out` dir,
**stdout is byte-identical too** (the echo line included). The plate makes the default
bin table/perCell non-empty, exercising the whole default path (builder exec included).
The two post-proof fixes (the ATLAS_HASH meshopt guard, the B0-scoped
`view_layer.update()`) live inside the B0 gate and cannot touch the no-flag path — the
re-run above confirms it on the delivered file.

Deviation stated: the brief's "both with NO flags" is literally unexecutable — the
committed census REQUIRES `--builder/--out/--plates` (argparse required=True), so no
committed output exists for a no-flag argv. The law binds per legacy argv (the batches
convention's own wording); the B0 verify line's shape (no legacy args) works because
those arguments gained committed-path defaults, an argv class the committed tool never
accepted. The B0 sections print only after `ZIMNY_CENSUS-END`, under
`ZIMNY_CENSUS-B0 … END` markers.

## Deviations from the ruling / ACCEPTANCE, and probe fixes (explicit)

1. **ATLAS_HASH meshopt guard fixed** (the prior agent's draft raised `TEXCOORD_1 view
   outside the GLB buffer` and stopped): the committed glb is raw gltf-transform output —
   meshopt views carry `buffer: 1` whose OUTER byteOffset/byteLength are DECODED-data
   coordinates into gltf-transform's dropped fallback buffer; the STORED bytes live only
   in the extension's compressed range (the law stated by tools/common.mjs `repackBin`,
   lines 138–139/175). The `buffer != 0` check now guards only the non-meshopt branch.
2. **Stale `matrix_world` fixed, scoped to the B0 block**: the builder places instances
   (`put` → `place`) without a depsgraph tick, so `matrix_world` read identity and the
   first frame-share run reported the sconces at 0 px everywhere (their world bboxes sat
   at the template origin). `bpy.context.view_layer.update()` now runs once INSIDE the
   B0 gate — the committed census's bins never needed transforms (only the in-place
   shell reads world coords), so the no-flag output stays byte-identical.
3. **The mjs `--preset fixtures21` was parsed but never used** (the prior agent's
   draft): the battery would still have shot the committed 24-frame bands grid and the
   pose writer would crash on J0/J1/J2/J2b (STOPS knew only J1b/J3/J4). Rewritten: a
   BATTERIES table drives the grid (bands = the committed 4×3×2 = 24 unchanged;
   fixtures21 = 3 lightmap states × the full rail J0…J4 × the one landscape viewport =
   21), the full 7-stop table added from rooms/jordan/contract.ts (the committed three
   kept verbatim), and the day state rides the §4.4 golden instant
   2026-06-22T03:18:00Z (tests/e2e/golden.spec.ts DET_AT; the dusk/night instants were
   already committed). Also removed a dead statement in the flag loop.
4. **The D5 decision hole now fails loud WITHOUT losing the report**: the draft raised
   before writing anything when no pinned condition set holds; now the census writes the
   full report with `DECISION UNRESOLVED …` + the failing condition sets and exits 1.
   (Did not fire on the real numbers.)
5. **ADMIT-FULL's "(or are a rail subject)" clause is implemented as the strict share
   reading** (the sconce's peak across stops incl. J1b ≥ 0.10 %): the clause could have
   admitted the sconce on rail-subject status alone. Academic here — the J1b sconce
   reads 0.2920 % ≥ 0.20 %, so FALSIFIED's premise fails and ADMIT-FULL holds on the
   shares themselves.
6. **The D4 EXR path mirrors lm_percentile.py exactly** (res/pad validation added to the
   draft's sampler). The night per-light population reading: the interior texels of the
   lm cells whose world CENTROID sits within 1.5 m of the lamp (cells are 0.5 m — a
   coarse but deterministic reading; inactive this round, SKIPPED-NO-EXR).
7. **Report paths are repo-relative** (the committed report must not carry
   machine-absolute paths).

## The battery (D3) and the records

- `pnpm build` (the committed tree's assets — main's — valid for the before run), then
  `node tools/probes/jordan-bands-capture.mjs --preset fixtures21 --tag before` → **21
  frames captured under `probes/jordan-bands-before/`** (gitignored, local-only; the log
  rides beside them as reads.md). The first pass shot 20/21 — `day-j2b-l` hit one
  roomReady timeout flake (180 s; its dusk/night twins and day-j2 captured normally) —
  the frame was re-shot restricted (`JORDAN_BANDS_ONLY='^day-j2b-l$'`) and captured
  (draws 87 · tris 11204, matching its twins). The log carries all 21 captured rows with
  the flake noted in its header. HUD figures per stop (the D3 log, drawn at the authored
  look — the runtime's naive per-node counts, info-only per the committed law):

  | stop | draws | drawn tris | tier |
  |---|---|---|---|
  | J0 | 159 | 15,554 | T1 · default |
  | J1 | 114 | 12,546 | T1 · default |
  | J1b | 122 | 13,648 | T1 · default |
  | J2 | 138 | 14,784 | T1 · default |
  | J2b | 87 | 11,204 | T1 · default |
  | J3 | 61 | 9,128 | T1 · default |
  | J4 | 36 | 7,312 | T1 · default |

  (identical across the three states per stop — the transport is state-independent at
  this geometry, as expected before any fixture content exists.)
- `node tools/probes/jordan-dark-median.mjs` — **SKIPPED-NO-EXR** (see D4).

## AS-3 publication block (for the parallel lane / the orchestrator's STATE.md row)

- Baseline: main @ 3da446d, cells 3,474 of a 64×64 atlas,
  ATLAS_HASH `d5d2706e75eff604b8ff40c0a5127d3aa082b39b33a1045ad8254c3edcd92354`.
- This lane's claim: at most 20 cells, all inside FIXTURE_LM_BLOCK
  **cells (0,55)…(5,55)** (px [0,1760 … 192,1792]) and the retired placeholder cells
  (sconce 3095–3106, chandelier 2881–3094), and not one non-fixture UV2 byte.
- The atlas's bottom nine rows (y 55–63, px 1760–2048) are entirely free; any lane that
  leaves that strip and the placeholder cells alone commutes with this lane.

## Fence notes for the orchestrator

- **The report files' committability was fixed mid-batch by a co-tenant**: `.gitignore`
  line 9 (`probes/`) matched ANY directory named `probes`, including `docs/probes/` —
  both report files existed but `git status` did not list them. A co-tenant agent added
  the `!docs/probes/` negation to `.gitignore` while this batch ran (that edit is NOT
  this batch's — it now shows as `M .gitignore` in the shared tree; the agent-ledger
  sweep belongs to whoever commits). The files are untracked and committable now.
- `git diff` of the assets is empty (B0's exit condition): no src/, no tools/bpy, no
  assets, no tests were touched; no bake ran; no pnpm install.
