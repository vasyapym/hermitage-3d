# owner-steer: the gallery walk reshaping + the doorway's evening spill
Opened 2026-11-14 · Landed 2026-11-14 · Merged n/r (landed on main directly, solo-lane ruling; commits d46343b + d64b3d2) · slot n/r · briefs n/r (Astra-6 relay brief 5 for the evening spill) · vault projects vN n/r · DEC-ids: none (owns no DEC)
## Ask
The owner's two 2026-11-14 directives were landed as finished validate-green edits on main's working tree by the parallel sessions. This closing session placed the two lane commits, the records and the push mechanically (no redesign, the solo-lane ruling).

The gallery walk reshaping: «one added stop before the turn; minus two after it».
The doorway's evening spill. The Astra-6 relay brief 5's diagnosis: the crown's light is albedo×hemisphere (RELATIVE) while the lamp run is ABSOLUTE radiance. The seam is therefore a step at every hour, and at night the crown collapses into the display's black floor.

## Relay shape

Astra-6 relay, brief 5 — the evening-spill diagnosis and the forward-spill law.
Parallel sessions — landed the two directives as validate-green edits on main's working tree.
Closing session — placed commits d46343b + d64b3d2, the records and the push (the solo-lane ruling; the parallel agents were done).

## Verdicts
No DEC owned. The round's laws:

Walk.

G0b is inserted at the entry diagonal's exact midpoint (0.8, 1.7, 79.5). Its subject is JUNCTION by reference (G0's own subject, owner-approved), and its look row is Gj's verbatim.
The stops round's two axis inserts are RETIRED (Gjb/G1b — «the corridor looks the same»).
Five stops (G0, G0b, Gj, G1, G2); the corridor reads as two long calm glides.
Captions en+ru: 'caption.g0b': 'the lit junction' / «свет впереди». The retired keys are removed from both dictionaries and from keys.ts.
The plan --check is byte-identical (717,499; was 717,607).


Evening spill.

The lamp's FORWARD SPILL: lampSpill(d) = GLOW_TOE × exp((d − LAMP_REACH_M)/THROAT.depthM). It is written into the lit geometry's colour attribute as itemSize 4 (rgb = the round-1 albedo law, alpha = lampSpill per ring, the collar 0).
The lit material carries emissive = lampSlab() at intensity 0, with the one-splice shader patch (totalEmissiveRadiance ×= vColor.a; diffuseColor.a = opacity — the massing fade law exact; the loud-fail guard).
The gate setThroatNightSpill(throat, wNight) sits beside nightLattice.setNight. Day is BIT-IDENTICAL.
Pre-flight dusk numbers on record: the crown at −5° ≈ 0.0086 < the 0.01 floor. The dusk class rides the next ruling per the class discipline.
The lever's AgX ceiling = the toe ~code 40; the deeper levers are owner decisions.



## Measured
2026-11-14 (landing):

validate GREEN: vitest 1127/1.
JS 285,609 of 350,000 (the walk −25, the evening +188; the evening's estimate 180–240 held). 98 B under the proposed 285,707 ceiling.
RU 7,360.
ZERO golden flips (golden-s1-noon = the day zero-flip detector, GREEN; golden-dec-night GREEN).

## Hunt / found / fixed

Found: the relative-vs-absolute seam step (see Ask). Fixed by lampSpill.
The smoke arrow-walk row stays the recorded machine-stall class (frame ~1283 ms; CI green = the authority).
Doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md — the candidate levers on record). The next attempt starts from the owner's sighting conditions.
Files touched: src/world/throat.ts, src/procedural/throat.ts, src/main.ts, rooms/rastrelli-gallery/contract.ts, src/i18n/{en,keys,ru}.ts, tests/{throat,stops,rail,rail-b9,i18n,e2e/smoke,e2e/touch-rail}.test.ts, docs/{design-staircase,design-walkthrough-ux}.md, docs/STATE.md, docs/briefs/ROUNDS.md (this row), docs/budget-ledger.md.

## Gates — passed · deferred-not-waived → who carries · owed

Passed: the targeted battery (validate 1127/1); the golden spot-checks (s1-noon + dec-night green).
The FULL local battery is WAIVED by the owner's solo-merge ruling (the R21-ux/R22-ux precedent). The gate is the targeted battery + the golden spot-checks + the CI verdict on the pushed head.
The CI verdict: failure = the residual known reds only. The draw-calls SwiftShader class: smoke 126 'draw calls, any frame' 260 > 250 ×2 attempts. touch-rail 269-jordan GREEN this run; nothing new.
Deferred-not-waived (the owner carries): the eye-reads on probes/s1-after-{night-spill,day-spill}.png + the g2-door/g1-door stills.
Owed (open threads otherwise unchanged): the 1812-360 app fix, scrub-11's +12 h, the draw-calls SwiftShader debt; the dusk class (next ruling).

## Mentioned elsewhere
From the doorway-reads records (the 2026-11-14 full-gate-verdict bullet, STATE.md L135; and the doorway-reads ROUNDS row):

The owner-steer follow-ups named by the owner 2026-11-13/14 ride the next lane: the gallery walk tweak (split the G0→Gj entry leg + remove the two axis midpoints; orchestrator-direct) + the doorway's evening dark-crown lever (the square sky-model law; one gentle relay).
The doorway-reads row's Integrated-in cell: the owner-steer follow-ups LANDED (the walk reshaping + the evening spill — the two lane commits + the records above). The doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md — the costed levers on record; the next attempt starts from the owner's sighting conditions).
From the doorway-reads records (the 2026-11-14 full-gate-verdict bullet, STATE.md L135; and the doorway-reads ROUNDS row 109):

The owner-steer follow-ups named by the owner 2026-11-13/14 ride the next lane: the gallery walk tweak (split the G0→Gj entry leg + remove the two axis midpoints; orchestrator-direct) + the doorway's evening dark-crown lever (the square sky-model law; one gentle relay).
The doorway-reads row's Integrated-in cell: the owner-steer follow-ups LANDED (the walk reshaping + the evening spill — the two lane commits + the records above). The doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md — the costed levers on record; the next attempt starts from the owner's sighting conditions).
From the doorway-reads records (the 2026-11-14 full-gate-verdict bullet, STATE.md L135; and the doorway-reads ROUNDS row 109):

The owner-steer follow-ups named by the owner 2026-11-13/14 ride the next lane: the gallery walk tweak (split the G0→Gj entry leg + remove the two axis midpoints; orchestrator-direct) + the doorway's evening dark-crown lever (the square sky-model law; one gentle relay).
Row 109, Integrated-in cell: the owner-steer follow-ups LANDED (the walk reshaping + the evening spill — the two lane commits + the records above). The doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md — the costed levers on record; the next attempt starts from the owner's sighting conditions).
(The orchestrator appends the segment from the ARCHIVE-APPEND block below.)
## Sources

docs/briefs/ROUNDS.md · row 110 (owner-steer) · line 110 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · bullet (2026-11-14 LANDED ON MAIN) · line 134 @ de58d5206909e308e33a089bd0227bbbc85a2278
