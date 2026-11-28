# The budget ledger — one authoritative table of committed and reserved costs

main @ tear-tbdr-merge · 2026-11-27 — the snapshot this table is measured against (mirrors STATE's Tree label).

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

| line | cap | operating ceiling | committed (main @ records-decision · 2026-11-26) | committed (branch `rg-improve`, merged 2026-11-26) | remaining to the operating ceiling |
|---|---|---|---|---|---|
| JS gzip (all chunks) | 350,000 | 285,707 — proposed explicit ceiling, owner ratification pending (design-project-course §1); the rg-walk-tune merge lands +185 OVER it — the OWNER PLATE line (the hard CI cap holds with 61,842 spare) | 289,447 @ main, the socle re-tune, 2026-11-23 (the union merge 289,411 → +36, the derived lower-tier stretch law) | **291,653 measured at the round's close, 2026-11-25** (the P1 review batch + the DEC-054 pick-set; +2,134 over main's 289,519; RU +0) — **MERGED at the wave's slot 2/3 (the merge e72c442)**; the rg-next merge a470f06 re-measured the merged tree: 291,807 (the office box's battery, e2e 87/0); the rg-improve merge d80feee re-measured: 291,847 (+40 gz — the D2 emissive dial rows, the owner's D1) | **293,483 @ the merged main, the st-george merge, 2026-11-27** (+1,636 gz — the wiring's P9 +1,642 measured on the lane base; RU +324 = 7,933); the sq-fix-improve merge re-measured: **293,779** (the branch's +277 rides the st-george 293,483 — the merge overlap +19; RU +0 = 7,933); the sq-t0-residue merge re-measured: **293,932** (+153 — the tier key `shadowDepthOffsetFactor` + the sqdebug sitting arms; RU +0 = 7,933); the sg-improve merge re-measured: **293,932** (+0 — the round's gains returned to the committed 2/2/2; the reservation released at the merge; RU +0 = 7,933); the sq-t0-residue merge re-measured: **296,211** (+2,279 — the R4/R5 receiver variant + the caster gate + the p95 HUD; RU +0 = 7,933); the tear-tbdr merge re-measured: **296,237** (+26 — the `__lmProbe` hook's {scene, renderer} exposure; the round's static KTX2Loader pull +35,774 caught at the merge's budget re-measure and removed — the lazy attempt does not dedupe, the budget counts every chunk; RU +0 = 7,933) | −10,504 to the proposed ceiling (OVER — the OWNER PLATE line stands: the hard CI cap holds 53,763 spare) |
| RU strings (lazy chunk) | 12,000 | — | 7,546 @ main, the sq-facade union merge, 2026-11-23 (the jordan-next captions +97 → the sq-facade formula chips +19; the dressings law's declared RU +0 held — the +19 is the notes page's own re-wording) | +0 measured (no strings touched); the merged tree re-measured: the rg-next merge 7,609 · the st-george wiring +324 = 7,933 · the sq-fix-improve merge re-measured 7,933 (no i18n in the round) | 4,067 |
| basis transcoder | 600,000 | — | 584,862 @ main, square-env2 merge 2026-11-05 | none | 15,138 — effectively closed |
| exterior (square payload) | 4,000,000 | — | 0 @ main, square-env2 merge 2026-11-05 | none | full |
| _check canary | 500,000 | — | 37,157 @ main, square-env2 merge 2026-11-05 | none | full |
| mobile plan determinism | — | — | 717,197 B byte-identical (--check --frozen-at) @ main, square-env2 merge 2026-11-05 | none | reproducibility result, not a spending balance |

## Rooms

| room | payload | texture | tris (cap / measured drawn) | draws (cap / measured) | notes |
|---|---|---|---|---|---|
| rastrelli-gallery | 1,257,669 dir / 1,255,019 rows of 2,000,000 | 861,675 / 1,000,000 (lm 290,526/261,009/260,956 · probe 1,734 · tex 47,054) | 110,000 / 17,037 drawn (16,179 unique) | 25 / 8 | the D2 round (merged 2026-11-26, first of three): pane/sconce_glow/stairlight export emission gated per state (D1 the JS plate spend, D2 the night lift — both owner-approved); the floor as laid stone + the limewash character (the tex −30.6K, no cut). The SURFACED layout-identity export drift: the committed glb was stale vs the flattened-branch builder (+4,487 tris, glb +98.7K) — the UV2 belt proved TEXCOORD_1 identical, layout 38df8415 ok ×3 states, the plates byte-held ×3; determinism ×2; the capture battery + the golden re-baselines ride the owner's sitting |
| jordan | 1,777,597 dir / 1,783,733 budget row of 7,000,000 | 1,337,949 / 4,000,000 (tex 198,347 · lm 1,133,912 · probe 5,690) | 380,000 / 36,178 (unique 11,330) | 60 / 47 | decode-cell ledger 3,372 / 4,096 (warn 3,500); slice 2b wall order (2026-11-24): +4,296 tris drawn AND unique (merged, no instancing), +3 draws (wall_order 2 + the cornice's L7 gilt slot), +0 cells (the exported-never-baked dress, the adopted host lightmap), glb 439,648 sha 38050c79… (the review batch: −236 B, the corrected flank windings); the 2026-11-24 Mac re-baseline (glb −84 / neva +9 / plafond −60 — the encoder-parity class, the owner-accepted reference switch); 2c bands day [0.2,0.45] W 0.45 · dusk [0.35,0.45] W 0.35 · night [4.0,4.5] W 4.0, κ=1; the bands fix landed 2026-11-17 (F1 the per-wall/per-tier rep split + F3 q255/clevel 2) · the ghost-split landed 2026-11-18 (the per-pier north shafts; the warn 3,500) · shared-JS delta 0 B gz |
| military-gallery | 3,008,700 / 4,000,000 | 2,057,118 / 2,650,000 | 60,000 / 31,090 | 19 / 17 — last 2 draws contingency | portrait atlas 416,732 inside the 1,900,000 fence; byte-identical through the jordan merge |
| military (atlas fence) | — | 1,483,268 / 1,900,000 | — | — | one-plate arrangement stands (dossier §1) |
| square | 107,902 / 1,500,000 (the DEC-049 KIT row + the square-next rounds; kit.glb 106,652 + manifest 1,250 — the exterior umbrella row reads assets/exterior = 0 of 4,000,000) | no cap | no cap / whole-frame inside the SQUARE_TRI_CAP 75,000 (measured ≤ 54,377 across both instants × 5 stops) | no cap / inside the SQUARE_DRAW_CAP 56 (measured 34–46 across both instants × 5 stops; kit draws 6 of drawsMax 6 EXACT — the wall's five material primitives + the junction's one; the reserved slot consumed) | DEC-049 (2026-11-19): the exterior kit machinery + the node el:hq-east; DEC-038 bronze fence stands; the T2 void 42–47 % → 0.0 % · the square-next round 1 (2026-11-21, PARALLEL): the HQ joins the ONE night law — the 124 quads re-slotted by the generated lit map into the three pane slots; PANE_BASE_TONE unified; ADD golden-s0b-dec-night · the square-next round 2 (2026-11-22, PARALLEL): the HQ joins the DAY laws — the hour-driven pane albedo, the 124 white surround quads on the existing dressing slot, the wSnow-gated cornice lip merged into the cap's morph; the owner's tone ruling (0xc0b36d → 0xc0bc6d 2026-11-23: +5 % yellow — the night hue off the gold/brown axis — the eye's chain: orange → too prominent → too dark/brown → the balance found); the el:gs-junction rider on the reserved 6th draw; golden-s0b-dec-noon re-baselined (the one declared flip) |

## Open reservations

| branch / candidate | what it reserves | status |
|---|---|---|
| sg-plate (branch `sg-plate`) | the ornament plate + the stage-2 slices (S1–S3): the room's rows regenerate in place (the ornament + eagle + relief ktx2s, the 3-state re-bake and probe; the room texture cap 2,400,000 · payload measured 412,785/4,000,000) · shared JS +13 gz (the declared chandelier-flame emissive row) · RU +0 · S4 the 2048² flip landed (the probe ladder closed the subcap) | open |
| tear-tbdr-lane (branch `tear-tbdr-lane`) | the gallery UV2-emission fix: the glb re-export rides the ROOM's caps (payload 1,257,669/2M · texture 861,675/1M byte-held · tris cap 110,000) · shared JS ≤ +300 B gz (the `__lmProbe` probe hook, the sqdebug class — droppable at merge) | LANDED at the round close 2026-11-27: the plates re-baked + re-encoded (texture 991,073/1,000,000, 9,323 spare; payload 1,387,067/2,000,000; shared JS +0 — the probe hook rode the main chunk's slack); the row's numbers reconcile at the merge |



**Update log:** Update log: cut — history lives in the round archives (docs/archive/*.md); newest entry 2026-11-15 square-palace-2 merge.
