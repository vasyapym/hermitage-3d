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
| JS gzip (all chunks) | 350,000 | 285,707 — proposed, owner ratification pending | 282,514 @ main, square-env2 merge 2026-11-05 | none | 3,193 |
| RU strings (lazy chunk) | 12,000 | — | 7,332 @ main, square-env2 merge 2026-11-05 | none | 4,668 |
| basis transcoder | 600,000 | — | 584,862 @ main, square-env2 merge 2026-11-05 | none | 15,138 — effectively closed |
| exterior (square payload) | 4,000,000 | — | 0 @ main, square-env2 merge 2026-11-05 | none | full |
| _check canary | 500,000 | — | 37,157 @ main, square-env2 merge 2026-11-05 | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (--check --frozen-at) @ main, square-env2 merge 2026-11-05 | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 853,872 / 2,000,000 (manifest rows 851,322) (was 857,041 dir / 854,491 rows; the four ktx2 re-encodes shrank −4,729 while the glb grew +1,560) | 599,010 / 1,000,000 (lm 185,659/167,986/165,959 · probe 1,734 · tex 77,672) | 110,000 / 10,868 | 25 / 8 | RG-F3 state: 11 z=70 niche backs → daylight panes (PANE_PAINT_RAW day (0.550,0.650,0.740)/dusk (0.360,0.400,0.460)/night 0); glb 252,312 sha 5bf119e8…; RG-F2 atlas (4,558 faces, 0.6159) superseded; shared delta 0; the white-order value split (stucco 0.88/0.86/0.82 over the warm field 0.72/0.67/0.58, dark stone base 0.42/0.40/0.37) |
| jordan | 1,237,543 / 7,000,000 | 996,068 / 4,000,000 (tex 40,472 + lm 942,061 + probe 13,535) (the same composition the pre-slice-2 802,139 held) | 380,000 / 21,872 (unique 6,236) | 60 / 19 | decode-cell ledger 3,250 / 4,096 (envelope 1,986 + part-2 1,264) |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | 19 / 17 — last 2 draws contingency | portrait atlas 416,732 inside the 1,900,000 fence; byte-identical through the jordan merge |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | one-plate arrangement stands (dossier §1) |
| square | 0 / 4,000,000 (exterior) | no cap | no cap / S0 whole-frame 52,413 (noon) · 53,173 (dec-night) | no cap / 37 (noon) · 41 (dec-night) | DEC-038 bronze fence landed (slot 3/4): +1,568 tris, +1 draw exact; procedural, 0 payload |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| movement-ux — RELEASED | ONE arrows mechanism: wheel travel removed, one continuous press/hold walk (WALK_CRUISE/ACCEL/BRAKE/LEASE/HOLD 1500/420/700/600/300, REDUCED_DWELL_MS 600), pair visible on desktop | MERGED 2026-11-09/10 — union JS 285,170 (declared +1,000 overspent ≈ +129, owner plate), RU 7,339 (the branch measure JS 284,726 of 350,000, +685 over the 284,041 base, headroom ≈ 981; RU 7,331 the toolchain's rounding; vitest 1075 passed / 1 skipped, 63 files incl. the 20-row rail-walk battery) — spent, released |

| square-palace — RELEASED | «The winter square» DEC-041 snow-legibility: walked-path lane (core ±2.5 m / edge ±7 m), sky gain K = 1.5, caption «колонна позади»; declared ≤ +700 gz | MERGED 2026-11-09 — JS 284,110 (+69), RU 7,339, DEC-043; full gate deferred NOT waived — spent, released |
| square-entry-ground — RELEASED | mobile boot view part-captures the Column (witness ≥ 0.8657, yaw-only δ ≤ 12°); ground «as in a vacuum» round (plane 600→2000); declared +2,000 (the branch build 284,007 of 350,000, +1,493; headroom to the 285,707 ceiling 1,700; the row declared +2,000 B gz) | MERGED 2026-11-08 — JS 284,041 (+1,527), RU 7,332, DEC-040/DEC-041; full gate deferred NOT waived — spent, released |
| jordan-slice-2 — RELEASED | stair hall light program (percentile encode, lamp bake rig, pane emission, noise textures, shell subdivision): JS +244 gz, ru +0, payload 1,028,681 → 1,237,543, tris 20,898 → 21,872, unique 5,262 → 6,236, decode-cells 2,798 → 3,250 | MERGED 2026-11-05 — spent, released |
| square-env2 — RELEASED | Column's bronze fence, one merged Lambert mesh: declared +3,200 JS, measured +780 gz (union +766), +1 draw, +1,568 tris; RU/exterior/textures/basis zero | MERGED 2026-11-05 — spent, released |
| roomload-mglight — RELEASED | R23-ux + R24-ux: declared +3,000 JS, measured +1,330–1,360 gz, RU +87, zero on asset/draw lines | MERGED 2026-11-05 — spent, released |
| rg-look — RELEASED | RG-F2 zero-JS room round (door card, lunette, white-order split, k = 4): reserved payload ≤ 800,000 · texture ≤ 400,000 · tris ≤ 10,000 · draws ≤ 7 of 25 (the round's committed deltas: payload +478,000, textures +315,000) | MERGED 2026-11-08 — landed 856,876 / 603,739 / 10,856 (now 10,868) / 7; DEC-042 — spent, released |

**Update log:** Update log: cut — history lives in the round archives (docs/archive/*.md); newest entry 2026-11-09/10 movement-ux merge, landing commit 56aebb9.
