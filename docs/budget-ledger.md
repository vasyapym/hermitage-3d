# The budget ledger — one authoritative table of committed and reserved costs

main @ rg-next-merge · 2026-11-26 — the snapshot this table is measured against (mirrors STATE's Tree label).

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

| line | cap | operating ceiling | committed (main @ records-decision · 2026-11-26) | committed (branch `sq-arch-day`) | remaining to the operating ceiling |
|---|---|---|---|---|---|
| JS gzip (all chunks) | 350,000 | 285,707 — proposed explicit ceiling, owner ratification pending (design-project-course §1); the rg-walk-tune merge lands +185 OVER it — the OWNER PLATE line (the hard CI cap holds with 61,842 spare) | 289,447 @ main, the socle re-tune, 2026-11-23 (the union merge 289,411 → +36, the derived lower-tier stretch law) | **291,653 measured at the round's close, 2026-11-25** (the P1 review batch + the DEC-054 pick-set; +2,134 over main's 289,519; RU +0) — **MERGED at the wave's slot 2/3 (the merge e72c442)**; the rg-next merge a470f06 re-measured the merged tree: 291,807 (the office box's battery, e2e 87/0) | −6,100 (the st-george lane's correction: the cell had read −3,740 against the stale 289,447) |
| RU strings (lazy chunk) | 12,000 | — | 7,546 @ main, the sq-facade union merge, 2026-11-23 (the jordan-next captions +97 → the sq-facade formula chips +19; the dressings law's declared RU +0 held — the +19 is the notes page's own re-wording) | +0 measured (no strings touched) | 4,454 |
| basis transcoder | 600,000 | — | 584,862 @ main, square-env2 merge 2026-11-05 | none | 15,138 — effectively closed |
| exterior (square payload) | 4,000,000 | — | 0 @ main, square-env2 merge 2026-11-05 | none | full |
| _check canary | 500,000 | — | 37,157 @ main, square-env2 merge 2026-11-05 | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (--check --frozen-at) @ main, square-env2 merge 2026-11-05 | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 1,147,151 dir / 1,144,601 rows of 2,000,000 | 891,897 / 1,000,000 (lm 290,526/261,009/260,956 · probe 1,734 · tex 77,672) | 110,000 / 10,868 drawn | 25 / 8 | the junction law (DEC-050): the UV2 re-weight + the S2A cove/springer relief into day+dusk (the night flat; night 27bb7c1e byte-held ×2); glb 252,704 sha f8407818… (+392 B, TEXCOORD_1); the ×2 determinism PASS; the rendered magnitude ~1–2 gray levels (the instrument v3; the EYE the authority); shared envelope delta = 0 |
| jordan | 1,777,597 dir / 1,783,733 budget row of 7,000,000 | 1,337,949 / 4,000,000 (tex 198,347 · lm 1,133,912 · probe 5,690) | 380,000 / 36,178 (unique 11,330) | 60 / 47 | decode-cell ledger 3,372 / 4,096 (warn 3,500); slice 2b wall order (2026-11-24): +4,296 tris drawn AND unique (merged, no instancing), +3 draws (wall_order 2 + the cornice's L7 gilt slot), +0 cells (the exported-never-baked dress, the adopted host lightmap), glb 439,648 sha 38050c79… (the review batch: −236 B, the corrected flank windings); the 2026-11-24 Mac re-baseline (glb −84 / neva +9 / plafond −60 — the encoder-parity class, the owner-accepted reference switch); 2c bands day [0.2,0.45] W 0.45 · dusk [0.35,0.45] W 0.35 · night [4.0,4.5] W 4.0, κ=1; the bands fix landed 2026-11-17 (F1 the per-wall/per-tier rep split + F3 q255/clevel 2) · the ghost-split landed 2026-11-18 (the per-pier north shafts; the warn 3,500) · shared-JS delta 0 B gz |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | 19 / 17 — last 2 draws contingency | portrait atlas 416,732 inside the 1,900,000 fence; byte-identical through the jordan merge |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | one-plate arrangement stands (dossier §1) |
| square | 107,902 / 1,500,000 (the DEC-049 KIT row + the square-next rounds; kit.glb 106,652 + manifest 1,250 — the exterior umbrella row reads assets/exterior = 0 of 4,000,000) | no cap | no cap / whole-frame inside the SQUARE_TRI_CAP 75,000 (measured ≤ 54,377 across both instants × 5 stops) | no cap / inside the SQUARE_DRAW_CAP 56 (measured 34–46 across both instants × 5 stops; kit draws 6 of drawsMax 6 EXACT — the wall's five material primitives + the junction's one; the reserved slot consumed) | DEC-049 (2026-11-19): the exterior kit machinery + the node el:hq-east; DEC-038 bronze fence stands; the T2 void 42–47 % → 0.0 % · the square-next round 1 (2026-11-21, PARALLEL): the HQ joins the ONE night law — the 124 quads re-slotted by the generated lit map into the three pane slots; PANE_BASE_TONE unified; ADD golden-s0b-dec-night · the square-next round 2 (2026-11-22, PARALLEL): the HQ joins the DAY laws — the hour-driven pane albedo, the 124 white surround quads on the existing dressing slot, the wSnow-gated cornice lip merged into the cap's morph; the owner's tone ruling (0xc0b36d → 0xc0bc6d 2026-11-23: +5 % yellow — the night hue off the gold/brown axis — the eye's chain: orange → too prominent → too dark/brown → the balance found); the el:gs-junction rider on the reserved 6th draw; golden-s0b-dec-noon re-baselined (the one declared flip) |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| st-george | JS ≤ +2,048 B gz, wiring only (contract data, the room chunk, EN strings) — OWNER PLATE, the line reads 291,807 against 285,707 · RU ≤ +900 B of 4,454 · transcoder +0 · exterior +0 | open |


**Update log:** Update log: cut — history lives in the round archives (docs/archive/*.md); newest entry 2026-11-15 square-palace-2 merge.
