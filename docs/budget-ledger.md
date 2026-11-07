# The budget ledger — one authoritative table of committed and reserved costs

**What this file is:** the single place where the project's byte/triangle/draw BALANCES are kept
honest across parallel sessions. `tools/budget.mjs` measures the COMMITTED tree at build; STATE
bullets and DEC rows carry history. This file carries the CURRENT truth: committed costs per
snapshot, the reservations of in-flight branches against the shared envelope, and the headroom
that decides whether a next round's declared allowance fits. The project-course dossier
(`docs/design-project-course.md` §3, recorded 2026-11-04) set the rules; this file implements them.

**The laws (the dossier's, verbatim in intent):**
- Charge shared JS and shared assets ONCE; distinguish committed use from reserved deltas; a
  reservation is RELEASED when its candidate is abandoned (remove the row).
- Update this table at every integration (a merge into main, a closed candidate, a re-dimension).
- A declared +3,000 B gz allowance must fit the REMAINING shared envelope alongside the other
  open reservations — the declaration is a request against a finite balance, not a recurring
  entitlement.
- **DEC numbers are assigned by the integrating authority** (the session that lands the round);
  parallel branches park their DEC-ready rows and do NOT infer the next number from an old count.
- No branch spends another branch's optimistic savings before those savings land.
- Balances are nested, not additive (payload ⊃ textures; the RU chunk rides inside the JS total);
  compressed bytes do not establish decoded GPU cost or transition peaks.

**Snapshot discipline:** the committed numbers below name their commit. Re-measure with
`pnpm build && pnpm budget` at merge; never present a pre-branch table as indefinitely current.

## Shared lines

| line | cap | operating ceiling | committed (main @ the square-env2 merge, 2026-11-05) | committed (branch `roomload-mglight`) | reserved (open branches) | remaining to the operating ceiling |
|---|---|---|---|---|---|---|
| JS gzip (all chunks) | 350,000 | 285,707 — *proposed explicit ceiling, owner ratification pending (design-project-course §1)* | **282,514** (the fresh measure at the merged tree: 281,748 + the DEC-038 fence's union shift +766 — the branch's own round print was +780 over its pre-branch base 280,150) | merged | none — all four stack slots merged or merging | **3,193** |
| RU strings (lazy chunk) | 12,000 | — | 7,332 (byte-equal — the jordan round touched no chrome copy) | 7,332 | none | **4,668** |
| basis transcoder | 600,000 | — | 584,862 | unchanged | none | 15,138 — effectively closed (the dossier: only a measured vendor upgrade opens it) |
| exterior (square payload) | 4,000,000 | — | 0 | unchanged | none | full; the dossier: measure the procedural baseline BEFORE an asset program (no texture/tri/draw caps yet — under-specified) |
| `_check` canary | 500,000 | — | 37,157 | unchanged | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (`--check --frozen-at`) | unchanged | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 378,876 / 2,000,000 | 288,761 / 1,000,000 | 110,000 / not established (unique-prims 6 is info-only) | 25 / not established | the dossier: retain the reserve; measure first |
| jordan | **1,237,543 / 7,000,000** (slice 2a landed; was 1,028,681 pre-slice-2) | **996,068 / 4,000,000** (tex 40,472 + lm 942,061 + probe 13,535 — the same composition the pre-slice-2 802,139 held; read off the merged manifest's own rows) | 380,000 / **21,872** (unique 6,236; was 20,898 pre-slice-2 — the shell densification to 2.0 m fields) | 60 / 19 (unchanged) | **decode-cell ledger 3,250 / 4,096** (the 64-grid at 28-px cells: envelope 1,986 + the ascent's part-2 1,264; the cells.json provenance law rides tools/lm-percentile) |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | **19 / 17 — the last 2 draws are contingency, not feature allocation** | portrait atlas 416,732 inside the 1,900,000 fence; nested inside the texture and payload balances; **byte-identical through the jordan merge (the cross-room guard)** |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | the one-plate arrangement stands (dossier §1) |
| square | 0 / 4,000,000 (exterior) | no cap supplied | no cap supplied / the S0 whole-frame reads 52,413 (noon) · 53,173 (dec-night) | no cap supplied / 37 (noon) · 41 (dec-night) whole-frame incl. shadow | **the DEC-038 bronze fence landed (slot 3/4): +1,568 tris, +1 draw exact** — still procedural, 0 payload |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| `square-entry-ground` | the owner's two Palace Square observations, ONE parallel lane (branch off e09c667, worktree `~/Documents/hermitage-3d-square-entry`): (1) mobile-only — the boot view must partly capture the Alexander Column (a corner or ~1/3 of the frame; desktop byte-identical); (2) the square ground reads «as in a vacuum» — a ground/ground-elements round, zero steering. Declared allowance: **+2,000 B gz shared JS** (fits the 3,193 headroom beside no other open reservations; a bigger ask flags to the owner), RU +0 expected (any chrome copy rides the committed charset law), exterior payload +0 (procedural), basis untouched, no room-cap change (square carries no caps yet; the whole-frame probe rows get re-measured and recorded at integration). DEC-ready: the branch parks its DEC row; the number is assigned by the integrating authority at the merge. | **OPEN 2026-11-07** — brief 18 (vault `projects v11/18-hermitage-3d-square-entry-ground-find.md`, CREATIVE) relays the facts dossier + the 8-frame capture battery; MERGE + the FULL e2e/golden gate ride the owner's stack signal |
| ~~`jordan-slice-2`~~ — RELEASED | the stair hall's light program: the percentile encode law, the lamp bake rig, the per-state pane emission, the value-noise textures, the shell subdivision — measured at its merge: shared js +244 gz, ru +0, jordan payload 1,028,681 → 1,237,543, jordan tris 20,898 → 21,872, decode-cells 2,798 → 3,250 | **MERGED to main 2026-11-05 (stack slot 2/4)** — the reservation is spent and recorded in the committed column |
| ~~`square-env2`~~ — RELEASED (never a formal reservation row — the ledger was founded after the branch had landed; declared +3,200 in DEC-038) | the Column's bronze fence: one merged Lambert mesh, declared +3,200 JS — measured +780 gz on its own branch (the union shift +766 on the post-slot-2 tree), RU +0, exterior/textures/basis all byte-zero, +1 draw exact, +1,568 tris exact | **MERGED to main 2026-11-05 (stack slot 3/4)** — the reservation is spent and recorded in the committed column |
| ~~`roomload-mglight`~~ — RELEASED | R23-ux + R24-ux: declared +3,000 JS — measured +1,330–1,360 gz, RU +87, zeroes on every asset/draw line | **MERGED to main 2026-11-05 (stack slot 1/4)** — the reservation is spent and recorded in the committed column |

**Update log (append at each integration; newest first):**
- 2026-11-07 · the `square-entry-ground` parallel branch OPENED (off e09c667; the owner's two square observations — the mobile boot frame part-capturing the Column + the ground «reads as a vacuum»): the reservation row declared (+2,000 B gz against the 3,193 headroom; DEC-ready); no bytes measured yet — the relay (brief 18, CREATIVE) opens the round.
- 2026-11-07 · THE STACK FINALE (this session): rastrelli-details merged (`69335b4`) — NO budget line moved anywhere (the branch ships bpy+records only; the union numbers byte-equal pre/post merge: JS 282,514, RU 7,332, jordan 1,237,543, exterior 0, basis 584,862; the full read in ROUNDS row 68); the golden battery's five re-baselines (jordan J4 ×3 + the 1812 360-corner fixtures ×2) carry node-modules/textures already counted; the five DEC-038-declared S0 square re-baselines retired by measurement (the fence band ≈0.7 % within the 1.0 tolerance — nothing spent).
- 2026-11-05 · the square-env2 branch MERGED to main (stack slot 3/4; the FULL e2e/golden gate + the five S0 re-baselines + the golden-s1-noon HOLD render ride the stack finale by the LAST merging session — deferred NOT waived): committed (main) JS 281,748 → **282,514** (the fresh measure; the DEC-038 fence's union shift +766 over the post-slot-2 tree; the branch's own round print +780 over its pre-branch base), RU byte-equal 7,332, exterior 0 B, basis unchanged; the square row re-noted (the fence's +1,568 tris / +1 draw exact; S0 whole-frame 37 draws / 52,413 tris noon · 41 / 53,173 dec-night); the vitest surface 1021 → **1043 passed / 1 skipped (64 files)** — all green at the merged tree; operating-ceiling headroom **3,193**; the reservation released.
- 2026-11-05 · the jordan-slice-2 branch MERGED to main (stack slot 2/4; the FULL e2e/golden gate rides the stack finale by the last merging session — NOT this merge): committed (main) JS 281,504 → **281,748** (the fresh measure; jordan's blend-gl hook + the emissive-scale table ≈ +244 gz; the merge's cross-room byte-identity guard printed EMPTY), RU byte-equal at 7,332, jordan payload 1,028,681 → **1,237,543**, jordan drawn 20,898 → **21,872** (unique 5,262 → 6,236), jordan lm decode-cells 2,798 → **3,250** of 4,096 (envelope 1,986 + part-2 1,264; the cells.json provenance law rides tools/lm-percentile); the jordan baked numbers moved: the three lm ktx2s day 304,963 / dusk 324,047 / night 313,051 (night was 150,352 — the rig's pools are real bytes; night display ≈1.0 at κ); the vitest surface 1014 → **1021 passed / 1 skipped (63 files)** — all green at the merged tree; the open-reservation ledger: the slots' family reservations closed — no open reservations remain from the four.
- 2026-11-05 · the roomload-mglight branch MERGED to main (stack slot 1/4): committed (main) JS 280,144 → **281,504** (the fresh measure; +30 toolchain drift over the round's 281,474 print, reconciled), RU 7,245 → 7,332; the branch's reservation released; the jordan-slice-2 family reservations remain the only open ones (their integration re-dimensions jordan/1812/decode-cells).
- 2026-11-04 · table founded (this session) — snapshots named; the dossier's rules recorded; reservations: the two in-flight branches as prose-pending numerics.
