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

| line | cap | operating ceiling | committed (main @ 92d3a4f) | committed (branch `roomload-mglight`) | reserved (open branches) | remaining to the operating ceiling |
|---|---|---|---|---|---|---|
| JS gzip (all chunks) | 350,000 | 285,707 — *proposed explicit ceiling, owner ratification pending (design-project-course §1)* | 280,144 | 281,474 (its +1,330 = R23-ux + R24-ux) | jordan-slice-2: declared +3,000-class per round, exact pending its integration | **4,233** |
| RU strings (lazy chunk) | 12,000 | — | 7,245 | 7,332 (its +87) | jordan-slice-2 pending | **4,668** |
| basis transcoder | 600,000 | — | 584,862 | unchanged | none | 15,138 — effectively closed (the dossier: only a measured vendor upgrade opens it) |
| exterior (square payload) | 4,000,000 | — | 0 | unchanged | none | full; the dossier: measure the procedural baseline BEFORE an asset program (no texture/tri/draw caps yet — under-specified) |
| `_check` canary | 500,000 | — | 37,157 | unchanged | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (`--check --frozen-at`) | unchanged | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 378,876 / 2,000,000 | 288,761 / 1,000,000 | 110,000 / not established (unique-prims 6 is info-only) | 25 / not established | the dossier: retain the reserve; measure first |
| jordan | 1,028,681 / 7,000,000 | 802,139 / 4,000,000 | 380,000 / 20,898 (denominators unproven — §0) | 60 / 19 | slice 2 re-dimensions these at its integration; decode-cell ledger 2,798 / 4,096 (1,298 nominal remainder — NOT guaranteed usable subdivision) |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | **19 / 17 — the last 2 draws are contingency, not feature allocation** | portrait atlas 416,732 inside the 1,900,000 fence; nested inside the texture and payload balances |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | the one-plate arrangement stands (dossier §1) |
| square | 0 / 4,000,000 (exterior) | no cap supplied | no cap supplied | no cap supplied | procedural today; the dossier: establish the full envelope before the first asset |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| `jordan-slice-2` (worktree `~/Documents/hermitage-3d-jordan2`) | the stair hall's light program: percentile encode law, lamp bake rig, per-state pane emission, value-noise textures, shell subdivision — its own payload/texture/decode-cell + shared JS deltas | IN FLIGHT (bakes mid-flight); exact numbers recorded here at its integration |
| `roomload-mglight` (worktree `~/Documents/hermitage-3d-roomload-mglight`) | R23-ux (the load line) + R24-ux (the environment handover): declared +3,000 JS — measured +1,330 gz COMBINED, RU +87, zeroes on every asset/draw line | LANDED ON THE BRANCH (commits efc0578…9c2fe2a), merges by the owner's signal; the e2e battery rides the quiet-window finale; its dossier record awaits ratification |

**Update log (append at each integration; newest first):**
- 2026-11-04 · table founded (this session) — snapshots named; the dossier's rules recorded; reservations: the two in-flight branches as prose-pending numerics.
