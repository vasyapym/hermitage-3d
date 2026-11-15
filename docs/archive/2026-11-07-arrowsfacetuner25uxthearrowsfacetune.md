# arrows-face-tune / R25-ux the arrows' face tune — the touch rail's arrow-face tune
Opened 2026-11-07 (branch arrows-face-tune, worktree ~/Documents/hermitage-3d-arrows-face-tune, off e09c667) · Landed 2026-11-07 · Merged 2026-11-08 (5fc9a82, off the branch head 25343fd) · slot 1/3 of the three-session merge stack · brief n/r (vault file projects v11/18-…) · vault projects v11 · DEC-ids: none owned
## Ask
The owner's three arrow-face asks on the mobile touch rail:

The available register ≈ 7 % more transparent (the .85 available state only; the .35 dim and the #fff hover/focus values untouched).
The box 72×44 → 72×41 (owner-rounded).
«≈ 7 % less glossy».
Plus two additions:


The owner-ratified sticky-hover guard.
The owner's DAY-2 ADDENDUM: the tap-highlight line.

## Relay shape

CREATIVE draw ×1 (vault projects v11/18-…, Fable; the render described in words — the specialist has no image input) ruled the gloss. It also found the sticky-hover guard, aimed at the owner's «when you click on it» complaint.

## Verdicts
No DEC owned.

Register: available .85 → .79 (≈ 7 % more transparent, multiplicative); .35 dim and #fff hover/focus untouched.
Box: 72×44 → 72×41 (owner-rounded). The glyph centre drops exactly 1.5 px; the bottom edge stays pinned to slotBottom — the slot law untouched.
Gloss: ruled by the draw. The gloss = the halo's downward-offset emboss read (a bright core over a dark 1 px-down rim = a lit-from-above bevel), so halo alpha .8 → .74. Both moves are one ×.93 sentence, so the rim keeps its share of the dimmer glyph.
Sticky-hover guard (owner-ratified): :hover only under @media (hover: hover). Touch painted :hover on tap and held it, so the just-tapped arrow sat at #fff. :focus-visible stays unconditional (the keyboard signal).
Day-2 addendum: -webkit-tap-highlight-color: transparent on the rail — the tap-aware chrome law the season rows and the index buttons already carry. The browser's default ≈ 200 ms translucent black tap box was painting over the scene on every arrow tap. One line, no tests touched.

## Measured

Branch (2026-11-07): build 282,504 gzip of 350,000 (−10 vs the finale's print, build-to-build drift; budgets ok), RU 7,332, payloads ok.
Merged union (2026-11-08): build 282,514 of 350,000 — byte-equal to the finale's print (the arrows tune's JS delta ≈ 0 beyond the constant 41/44 inlining drift the branch printed as −10). RU 7,332 byte-equal. jordan payload 1,237,543, military-gallery 3,008,700, rastrelli 378,876, _check 37,157, exterior 0, basis 584,862 — every budget ok.
vitest: branch 1036 passed / 1 skipped / 62 files (stands for the union). The in-tree run on main reads 1042/1 on 64 files: two UNCOMMITTED gitignored scratch-probe files ride main's disk. One fails locally exactly as recorded pre-merge — probes/r4-kit-night/probe25_analysis.test.ts, not the repo's.
Goldens: the branch STATE bullet records the 4 coarse-chrome goldens re-recorded and read. The ROUNDS row and the merge bullet record 8 (4 coarse-chrome + the 4 whole-page 360 pairs), all riding the merge. The R21-ux-deferred 1812 pair debt was already re-baselined at the finale.

## Hunt / found / fixed

Found (the draw's own find): the sticky :hover on touch — fixed by the @media (hover: hover) guard.
Found: an earlier size iteration's tab-order row leaves :focus-visible on the button, and focus survives setViewportSize. Fixed: the two NEW e2e face-register pins each carry their own clean-state blur.
Found: the browser's default ≈ 200 ms tap box — fixed by the one-line tap-highlight rule.
Formatter: biome clean after one formatter fix.
E2E verdict split (storm class + pin fix, the R16.2/finale re-verdict precedent). The sources disagree on the run attribution and it is not resolved here.

Row: runs 1–2 storm-class 540-s timeouts on the loaded/full-disk machine (the ENOSPC-plate class) plus the un-blurred pins; runs 3–4 quiet.
Branch STATE: run 1 (the owner's browser loading the machine) 14/18 with 540-s timeout-class reds; runs 2–4 on the quiet machine.
Both: every row of the touch-rail spec carries a green on this tree across the verdicts (walks: square 23 s · rastrelli 1.1 m · jordan 5.3 m · military 5.7 m = 12.6 m; no single 18/18 pass ran) + fixtures 22/22 with the re-recorded goldens.



Landed — files

src/style.css (face block + guard + the tap line).
src/ui/touch-rail.ts (41 + comment; the purity fence intact).
tests/touch-rail.test.ts (the unit tuple re-pin).
tests/e2e/touch-rail.spec.ts (two NEW face-register pins).
docs/design-mobile-tier.md §4 (constants + the R25-ux note + the face sentence; the R17 ratification rows kept as-written).

## Gates — passed · deferred-not-waived → who carries · owed

Passed on the branch: pnpm validate green (tsc 0, biome clean, vitest 1036/1 on 62 files; build 282,504/350,000, RU 7,332, payloads ok); the touch-rail spec as above; fixtures 22/22.
Passed on the union at the merge: tsc 0 · biome clean · committed suite green · budgets ok.
Merge: an ordinary code/records merge (merge 5fc9a82 off the branch head 25343fd), public/assets untouched. ROUNDS' row-68 conflict with the CI-legend docs commit was resolved by the flip convention — both rows stand.
Deferred-not-waived: the FULL e2e/golden gate rides the LAST merging session, per the owner's ruling. Not this session: merge slots 2/3 and 3/3.

## Mentioned elsewhere

None emitted. STATE lines 792-813 are the R21-ux bullet (ROUNDS row 66, branch uxfix-arrows-look) — another round's record, routed to its own unit.

## Sources

docs/briefs/ROUNDS.md · round 12 · line 12 (2079 B) @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
docs/STATE.md · bullet «2026-11-08 · ARROWS-FACE-TUNE MERGED TO MAIN» · lines 462-479 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
docs/STATE.md · bullet «2026-11-07 · ARROWS-FACE-TUNE LANDED ON THE PARALLEL BRANCH» · lines 480-514 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
