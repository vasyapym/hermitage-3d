# doorway-reads — the owner's three doorway/screen observations in one round
Opened 2026-11-13 · Landed n/r (branch landing 4147e60) · Merged 2026-11-13 (fd838f4, as cited by the 2026-11-14 verdict bullet) · slot n/r · briefs n/r · vault projects vN n/r (03_projects/hermitage-3d-2026-11-12/) · DEC-ids: none (owns no DEC; DEC-017 amended §4.1a/§4.1b)
## Ask
Phase 4 doorway-reads — the owner's three doorway/screen observations in one round. PARALLEL to the owner's in-flight lanes: the lane works only inside its own worktree ~/Documents/hermitage-3d-doorway-reads, branch doorway-reads off main 438c3a3. MERGE into main plus the FULL e2e/golden gate happen at the owner's signal, not in the opening session. SCOPE-LOCAL gates only (pnpm validate, targeted rows). Golden re-baselines ride the finale — deferred, NOT waived.

The square→gallery doorway «block» entering the Rastrelli Gallery.
The Back-arrow depart at the stair foot J0.
The three chrome buttons (lang toggle / notes link / rooms opener) more prominent on big screens.

Also in the round: the row-60-reported dev-only TDZ, and the G2 east-door flat-card read surfaced by the same capture pass.
## Relay shape

Capture probe ×1 — captured the doorway and surfaced the G2 east-door flat-card read.
Sol 6.1 ×1 — the two doorway diagnoses (the throat «block»; the J0 depart).
CREATIVE (Fable 5.1) ×1 — the camera law (door heading) and the chrome tier.
Sol review pass — 8/10, ZERO breaks, two survivable findings.
All in the vault 03_projects/hermitage-3d-2026-11-12/; the FINDINGS ledger is in the vault round-1/.

## Verdicts
No DEC owned. The round's laws are recorded as follows.

Throat grading (1).

Diagnosis (Sol 6.1): the sky-lit run's AO-bottomed grading reads as a plate from the approach distance (committed-design-mis-reading). The magenta-collar diagnostic proves the collar shows no second source.
FIXED in src/world/throat.ts, constants only: AO_MOUTH 0.83 / AO_FALL_M 9 / AO_FLOOR 0.10 / GLOW_TOE 0.04 / GLOW_GAMMA 1.4. The lamp's warmth reaches the seam; no bake, vertex colours.


Door-heading law (2).

Diagnosis, numerical: the end tangent inherits the stair slope; the eye sinks 0.83 m; the point-lerp gaze crosses overhead (a zenith pass).
FIXED by the Fable 5.1 law: levelHeading in src/world/threshold-beat.ts. The eye keeps the stop's height, the standoff is measured from the doorway's own vertical plane, and the lean rides it.
Plus the facing-away clause (a locked dolly: the gaze holds the stop's subject). It is live at J0/G0/M0 backward per the measured facing table; the flat rails are bit-identical.
DEC-017 amended §4.1a/§4.1b; tests +11 spec rows.


Chrome tier (3).

A NEW ≥1920 tier. The register ×1.2 takes 17→20; hint 16.
The three members' rest alpha goes 0.55→0.72. Nothing at ≤1919 changes byte-wise.
The 1920 fixture flips ride the finale re-baseline.


Dev-only TDZ.

lastLabelEpochMs was read by the top-level applyEpoch(epochMs) before its line-2708 declaration.
HEALED: the declaration moved above applyEpoch. Dev boots clean (console-verified); the built preview was always clean.


G2 east-door flat-card read.

Diagnosis: a flat painted value calibrated at G1; G2 was never golden'd.
FIXED bake-side via the encode-paint path. The accepted reply §2.3's glare law landed in the machine source tools/reencode.mjs GLARE_* + tools/reencode-paint.py glare_field, with the tools/bpy/bake.py PANE_PAINT declared twin synced.
Law: per part and state, value = tint×L_s×(EDGE 0.55 + 0.45×cos² falloff centre→rect edge); the lunette shares the card's law.
L_DAY 1.1 (DAY neutral). The dial's floor puts the card's centre above the 0.8 white point, so it renders at the atlas's expressible ceiling.
DUSK is the stair's sconce tint 0.385; NIGHT is the chandelier tint 0.275 (0.35/0.25 of day, luminance-normalized committed hues).
The ×1.14 measured-ratio lineage is SUPERSEDED: it was the G1-distance calibration, and the dial is G2-first now.
The contrast domains are recorded apart (the review finding, 2026-11-13):

pre-encode paint ratio 1.1/0.3566 = 3.08× (the dial's setup arithmetic);
encoded scene-linear 0.8/0.3566 = 2.24× (the format's ceiling at this wall plate; raising it needs the white point, a room-wide law);
display (AgX at eff 1.6, measured off the captures) day 1.77× / dusk 1.52× / night 1.39× (the AgX shoulder compressing the rest).


The night card reads 0.87× the wall's light (the law's own 0.25 ratio); the owner's eye is pending.
The plates were re-baked because the stage caches were wiped:

The bake itself is untouched, and the bake-stage plates byte-matched the previous run (pixel-identical).
The wall's old card spill rides as-is (the residual is noted).
The PUBLISHED ktx2s change by the glare paint: the manifest sha rows are updated, and the re-encode ×2 is byte-equal per the chain's record.
Payload: rastrelli 851,274 of 2,000,000.




Sol review pass. 8/10, ZERO breaks, two survivable findings fixed comment-only: the three-domain contrast record above, and the near-level eye-height residual documented ≤2.5 cm in §4.1a + the module comment. The follow-up was declined by the owner.

## Measured

2026-11-13 (OPEN, branch):

validate green: vitest 1100/1; JS 285,264 of 350,000 (+94 over main's 285,170; the ledger row).
rastrelli 851,274/2M.


2026-11-14 (the stack finale, merged union):

tsc 0 · biome clean · build.
vitest 1116 passed / 1 skipped on 64 files.
JS 285,446 of 350,000 (the +94 reservation released into committed).
RU 7,386 · rastrelli 851,274/2M · basis 584,862.
The FULL battery: 116 rows, 2.9 h.



## Hunt / found / fixed

Doorway «block», J0 depart, ≥1920 chrome tier, TDZ and G2 glare: all FIXED as under Verdicts.
Finale battery, 25 reds classified by isolation (AC power, no competing load):

12 storm (isolation green).
1 flaky pre-existing: scrub-double-click 11. The +12 h noon-anchor mechanism is unexplained; open.
2 REAL stale test literals from the 5-stop square (touch-rail 916 + 1091): one tap now rests on S0b, the assistive click/second tap on Sh. FIXED at the finale, isolation green ×2. They are the stop lane's own rows; the cross-lane repair is recorded.
The walk-budget class (smoke 176/300, touch-rail 304/269-jordan): 4/4 CI GREEN but local-red at ~1.2 s frames over the inserted stops' longer walks. Machine class, not code; the R73 trace-off differential is the named next probe.
The 1812-360 race: the touch arrows' slot --touch-center is only written on font/layout events, never re-measured at settle. The load-line's 1 s latch (R23-ux, pre-existing) races the fonts, and the arrows can freeze ~13–18 px high. The baselines were restored per the golden law (a re-baseline would encode one race side). The APP-side fix (re-run layoutTouchRail on load-line latch/unlatch) is the named next step, neither merged lane's debt.


CI on the merged main:

916/1091 GREEN in the 4f80224 run (the literal fix held).
The residual 2 reds are one class: the draw-calls budget assertion («draw calls, any frame», expectWithinBudgets) on smoke 126 + touch-rail 269-jordan. Retried and failed ×2; reproducible in CI's SwiftShader env.
PRE-EXISTING at fd838f4's own run (×4 there). The delivery has zero runtime changes (test literals + 2 fixture PNGs + records).
It is the stops lane's CI-only debt; the trace-off/draw-ledger differential is the named next probe.


Doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md, the costed levers on record). The next attempt starts from the owner's sighting conditions.

## Gates — passed · deferred-not-waived → who carries · owed

Passed:

Branch gates: validate green.
Stack finale 2026-11-14: validate GREEN on the union; [golden] GREEN with ZERO golden flips (throat grading + G1 glare repaint inside the ±1 % tolerance).
fixtures-main-1920 en/ru = the DUE r26.2 flip, re-baselined ×2 and eyeballed. The bands read exactly the designed lift: the RU/EN toggle, the touch arrows' ~3 px nudge, the hint 14→16 re-anchor, the bottom chrome row 17→20 px + 0.72 rest alpha. Confirm green; the pairs are under probes/golden-flips-2026-11-13/.


Deferred-not-waived (the owner carries):

The eye-reads on probes/{s1-after-,g2-door-,g1-door-day}.png. Captures are gitignored in the worktree: probes/g2-door-{day,dusk,night}.png + probes/g1-door-day.png.
The morning/noon/evening stills at S1.


Owed:

The app-side layoutTouchRail-at-settle fix.
The R73 trace-off / draw-ledger differential.
scrub-11's +12 h.
The doorway residual (parked).


Merge-stage record: the 2026-11-13 bullet calls the merge "the LAST merging session of the stack — the merge commit carried the records", with branch landing 4147e60. The 2026-11-14 bullet cites merge fd838f4. The orchestrator should confirm which sha is the merge.

## Mentioned elsewhere
None in this batch's excerpts.
## Sources

docs/briefs/ROUNDS.md · row 109 (doorway-reads) · line 109 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · bullet (2026-11-14 full gate verdict) · line 135 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · bullet (2026-11-13 merge) · line 136 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · bullet (2026-11-13 OPEN) · line 137 @ de58d5206909e308e33a089bd0227bbbc85a2278
