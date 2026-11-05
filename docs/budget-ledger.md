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

| line | cap | operating ceiling | committed (main @ the jordan-slice-2 merge, 2026-11-05) | committed (branch `roomload-mglight`) | reserved (open branches) | remaining to the operating ceiling |
|---|---|---|---|---|---|---|
| JS gzip (all chunks) | 350,000 | 285,707 — *proposed explicit ceiling, owner ratification pending (design-project-course §1)* | **281,748** (the fresh measure at the merged tree: 281,504 props + jordan's blend-gl hook/look-table token cost ≈ +244) | merged | none — all four stack slots merged or merging | **3,959** |
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
| square | 0 / 4,000,000 (exterior) | no cap supplied | no cap supplied | no cap supplied | procedural today; the dossier: establish the full envelope before the first asset |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| ~~`jordan-slice-2`~~ — RELEASED | the stair hall's light program: the percentile encode law, the lamp bake rig, the per-state pane emission, the value-noise textures, the shell subdivision — measured at its merge: shared js +244 gz, ru +0, jordan payload 1,028,681 → 1,237,543, jordan tris 20,898 → 21,872, decode-cells 2,798 → 3,250 | **MERGED to main 2026-11-05 (stack slot 2/4)** — the reservation is spent and recorded in the committed column |
| ~~`roomload-mglight`~~ — RELEASED | R23-ux + R24-ux: declared +3,000 JS — measured +1,330–1,360 gz, RU +87, zeroes on every asset/draw line | **MERGED to main 2026-11-05 (stack slot 1/4)** — the reservation is spent and recorded in the committed column |

**Update log (append at each integration; newest first):**
- 2026-11-05 · the jordan-slice-2 branch MERGED to main (stack slot 2/4; the FULL e2e/golden gate rides the stack finale by the last merging session — NOT this merge): committed (main) JS 281,504 → **281,748** (the fresh measure; jordan's blend-gl hook + the emissive-scale table ≈ +244 gz; the merge's cross-room byte-identity guard printed EMPTY), RU byte-equal at 7,332, jordan payload 1,028,681 → **1,237,543**, jordan drawn 20,898 → **21,872** (unique 5,262 → 6,236), jordan lm decode-cells 2,798 → **3,250** of 4,096 (envelope 1,986 + part-2 1,264; the cells.json provenance law rides tools/lm-percentile); the jordan baked numbers moved: the three lm ktx2s day 304,963 / dusk 324,047 / night 313,051 (night was 150,352 — the rig's pools are real bytes; night display ≈1.0 at κ); the vitest surface 1014 → **1021 passed / 1 skipped (63 files)** — all green at the merged tree; the open-reservation ledger: the slots' family reservations closed — no open reservations remain from the four.
- 2026-11-05 · the roomload-mglight branch MERGED to main (stack slot 1/4): committed (main) JS 280,144 → **281,504** (the fresh measure; +30 toolchain drift over the round's 281,474 print, reconciled), RU 7,245 → 7,332; the branch's reservation released; the jordan-slice-2 family reservations remain the only open ones (their integration re-dimensions jordan/1812/decode-cells).
- 2026-11-04 · table founded (this session) — snapshots named; the dossier's rules recorded; reservations: the two in-flight branches as prose-pending numerics.
