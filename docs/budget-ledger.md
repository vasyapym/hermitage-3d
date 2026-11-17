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
| JS gzip (all chunks) | 350,000 | 285,707 — proposed explicit ceiling, owner ratification pending (design-project-course §1) | 285,629 @ main, jordan-slice-3 2c landing 2026-11-15 | none — no open reservations | 78 |
| RU strings (lazy chunk) | 12,000 | — | 7,360 @ main, owner-steer landing 2026-11-14 (byte-equal through 2c) | none | 4,640 |
| basis transcoder | 600,000 | — | 584,862 @ main, square-env2 merge 2026-11-05 | none | 15,138 — effectively closed |
| exterior (square payload) | 4,000,000 | — | 0 @ main, square-env2 merge 2026-11-05 | none | full |
| _check canary | 500,000 | — | 37,157 @ main, square-env2 merge 2026-11-05 | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (--check --frozen-at) @ main, square-env2 merge 2026-11-05 | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 855,438 dir / 852,888 rows of 2,000,000 | 600,576 / 1,000,000 (lm 188,665/166,552/165,953 · probe 1,734 · tex 77,672) | 110,000 / 10,868 drawn | 25 / 8 | RG-F4 dial (DEC-044): pane day 2.7 / dusk 0.9 / night 0; 11 z=70 daylight panes stand; glb 252,312 sha 5bf119e8…; shared envelope delta = 0 |
| jordan | 1,484,261 / 7,000,000 | 1,242,397 / 4,000,000 (tex 40,472 · lm 1,195,535 · probe 6,390) | 380,000 / 21,872 (unique 6,396) | 60 / 26 | decode-cell ledger 3,230 / 4,096; 2c bands day [0.2,0.45] W 0.45 · dusk [0.35,0.45] W 0.35 · night [4.0,4.5] W 4.0, gains 2.22/2.86/0.25, κ=1; the bands fix landed 2026-11-17 (F1 the per-wall/per-tier rep split + F3 q255/clevel 2; the lm +277,581) · shared-JS delta −2 B gz |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | 19 / 17 — last 2 draws contingency | portrait atlas 416,732 inside the 1,900,000 fence; byte-identical through the jordan merge |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | one-plate arrangement stands (dossier §1) |
| square | 0 / 4,000,000 (exterior) | no cap | no cap / S0 whole-frame 52,413 (noon) · 53,173 (dec-night) | no cap / 37 (noon) · 41 (dec-night) | DEC-038 bronze fence landed (slot 3/4): +1,568 tris, +1 draw exact; procedural, 0 payload |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| **jordan-bands — RELEASED** | the day upper-tier bands fix (the parked row): F1 the per-wall/per-tier representative split + F3 the lm transcode q255/clevel 2; declared JS +0 gz · RU +0 · basis/exterior 0; the jordan room cap absorbed the lm delta (payload 1,206,199 → 1,484,261 of 7,000,000; the dusk/night re-bakes were declared required by the layout change) | LANDED 2026-11-17 — spent, released; the merge + FULL gate + the golden re-baselines (J4 ×3, +J3?) ride the last-merging session |
| **square-palace-2** | certification round: declared JS +0 gz · RU +0 · exterior 0 · draws +0 · tris +0 (docs/tests/snapshots only, no src/ change); detector pin t = 0.1. Parked DEC-ready numbers kept (not in archives as far as the brief shows): SQUARE_DRAW_CAP 56 / SQUARE_TRI_CAP 75,000; KIT allow 6 meshes / 18,000 tris / 1,500,000 payload / TEX_VRAM 8,388,608; SQUARE_JS_WIRING_ALLOW 2,048 B (ceiling 285,707 → 287,755 proposed); HQ_CORNICE_M 20.5; AL-SQ-01…05 | MERGED 2026-11-15 — SPENT and RELEASED; DEC-045 assigned; dec-noon golden re-baseline + full-battery verdict ride the wave finale (deferred NOT waived); machinery's DEC-ready rows stay parked for its own merge |
| rg-f4 | «The day that lights the room»: pane dial day 2.7 / dusk 0.9 / night 0; payload +1,614, textures +1,566, JS/RU/basis byte-zero | MERGED to main 2026-11-15 (fast-forward a32b70c..82e1756) — SPENT and RELEASED; DEC-044; full e2e/golden gate + CI verdict ride the last merging session (deferred NOT waived) |
| movement-ux (the ci-hardening + stops follow-up) — RELEASED | CI pacing hardening (tests-only) + stops mini-round (+1–2 walk stops per scene, Palace Square and Rastrelli Gallery); declared JS ≤ +450 gz · RU ≤ +250 | MERGED 2026-11-13 — spent, released; measured JS 285,332 (+162), RU 7,386 (+47); full e2e/golden gate + CI verdict ride the last merging session (deferred NOT waived) |
| movement-ux — RELEASED | ONE arrows mechanism: wheel travel removed, one continuous press/hold walk (WALK_CRUISE/ACCEL/BRAKE/LEASE/HOLD 1500/420/700/600/300, REDUCED_DWELL_MS 600), pair visible on desktop | MERGED 2026-11-09/10 — union JS 285,170, RU 7,339 — spent, released |

| square-palace — RELEASED | «The winter square» DEC-041 snow-legibility: walked-path lane (core ±2.5 m / edge ±7 m), sky gain K = 1.5, caption «колонна позади»; declared ≤ +700 gz | MERGED 2026-11-09 — JS 284,110 (+69), RU 7,339, DEC-043; full gate deferred NOT waived — spent, released |
| square-entry-ground — RELEASED | mobile boot view part-captures the Column (witness ≥ 0.8657, yaw-only δ ≤ 12°); ground «as in a vacuum» round (plane 600→2000); declared +2,000 gz | MERGED 2026-11-08 — JS 284,041 (+1,527), RU 7,332, DEC-040/DEC-041; full gate deferred NOT waived — spent, released |
| jordan-slice-2 — RELEASED | stair hall light program (percentile encode, lamp bake rig, pane emission, noise textures, shell subdivision): JS +244 gz, ru +0, payload 1,028,681 → 1,237,543, tris 20,898 → 21,872, unique 5,262 → 6,236, decode-cells 2,798 → 3,250 | MERGED 2026-11-05 — spent, released |
| square-env2 — RELEASED | Column's bronze fence, one merged Lambert mesh: declared +3,200 JS, measured +780 gz (union +766), +1 draw, +1,568 tris; RU/exterior/textures/basis zero | MERGED 2026-11-05 — spent, released |
| roomload-mglight — RELEASED | R23-ux + R24-ux: declared +3,000 JS, measured +1,330–1,360 gz, RU +87, zero on asset/draw lines | MERGED 2026-11-05 — spent, released |
| rg-look — RELEASED | RG-F2 zero-JS room round (door card, lunette, white-order split, k = 4): reserved payload ≤ 800,000 · texture ≤ 400,000 · tris ≤ 10,000 · draws ≤ 7 of 25 (committed deltas: payload +478,000, textures +315,000) | MERGED 2026-11-08 — landed 856,876 / 603,739 / 10,856 (now 10,868) / 7; DEC-042 — spent, released |

**Update log:** Update log: cut — history lives in the round archives (docs/archive/*.md); newest entry 2026-11-15 square-palace-2 merge.
