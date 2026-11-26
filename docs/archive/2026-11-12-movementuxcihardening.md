# movement-ux ci-hardening + the stops mini-round — the movement-ux branch's follow-up (ci-hardening handoff + the owner's un-parked stops item)
Opened 2026-11-12 · Landed n/r · Merged 2026-11-13 (679298d) · slot n/r · briefs 1, 3, 7 (the stops-placement brief, the waived follow-up, the handoff) · vault projects v13 · DEC-ids n/r
This is a DISTINCT round from the archived movement-ux arrows round (docs/archive/2026-11-09-movementux.md, batch 16) and is not appended to it.
## Ask

The handoff's mini-round (vault projects v13/7-…-ci-hardening-handoff.md): CI hardening of the touch-rail settle and the smoke keyboard walk.
The owner's un-parked stops item: +1–2 walk stops per scene for Palace Square and Rastrelli Gallery. Count, placement and captions (en+ru) ride the Fable brief.
Opening conditions: PARALLEL to the owner's other in-flight agent (the 2026-11-13 directive). The lane worked only in its own worktree ~/Documents/hermitage-3d-movement-ux, branch movement-ux off main 438c3a3, and touched its own paths.
Merge and gate: the MERGE into main and the FULL e2e/golden gate ride the owner's signal. Only scope-local gates ran.
Ledger reservation declared: JS ≤ +450 gz · RU ≤ +250, riding the proposed 285,707 ceiling. The owner's stop order rides the ratification.

## Relay shape

Handoff brief 7 (vault projects v13): the mini-round's scope. Its ~80–150 B byte-trade figure was an unmeasured estimate.
Brief 1 (Fable 5.1, 2026-11-12-hermitage-3d-ci-hardening/1-…stops-placement.md): the stops' count, placement and captions, adopted verbatim. The reply is OUT, and its fallbacks are on record in the round folder.
Sol review, pass 1, score 8/10 (round-1/FINDINGS.md ledger): findings F1–F3, open questions OQ1/OQ2/OQ4/OQ5 (see Verdicts).
Brief 3: the waived follow-up.
The owner ruled REVERT on the byte-trade.

## Verdicts
No DEC number exists. The DEC retires without a number (the movement-ux precedent); the design-doc count updates and these records carry the decision content. n/r, never invented.

Byte-trade: MEASURED ZERO NET. The four id literals live once each in the minified bundle (≈40 raw B ≈ 9 B gz in the main chunk). The room chunks' import-hash-string noise ate the saving, and the tool total stayed 285,170. Owner-ruled REVERT: main.ts is byte-identical to the recorded state, and the +129 overage is back on the owner's plate.
Touch-rail rapid-activation settle = tap #1's OWN completed landing (the changed stop + the rest on the coherent snapshot).

Rejected: the wall-time figures 2.5 s / 8 s, which were arithmetic against the wrong clock.
Budget sized against the CAPPED SIMULATION CLOCK: ≥22 frames ≈ 40 s at the CI's ~1.3 s/frame.


Smoke keyboard walk = one coherent snapshot per landing plus the pressability bit (aria-disabled mirrors touchAdmitted). The arrival window is invisible to the five-row snapshot.

It uses the app's OWN published drain: data-dwell-ms added to syncTouchRail. This is the R13-class instrument on the ≤500 ms state-write cadence, with Math.ceil so '0' means drained.
The outside-the-loop frame-gap mirror was retired; its either-way divergence was refuted by the Sol review.


Reduced-motion dwell: Math.min(deltaMs, 100) makes REDUCED_DWELL_MS 600 a six-frame drain at any fps (≈0.1 s at 60 fps, ≈6 s at ~1 fps).

The removed read chain cleared it by accident.
This EXPLAINS the recorded CI deaths' moving failure point.


Walk-count comments truthed: 44 walkTo calls = 17 forward + 5 + 22 backward. The pre-round count was 36 (commit 8273061 stage said 34 legs; the recorded «34 legs» was already 2 under). The inherited ×1.4 was retired for the measured 6.0–8.3 min ≈ ×1.8–2.4 in the SwiftShader env.
The stops (commit 234aa48, Fable 5.1's placement adopted verbatim):

Square: S0b/Shb quarter-point inserts split the two 54.3 m gaps on the committed XZ line (cruise 36 → 18 m/s).

S0b's gaze is the Column's pedestal top, SQUARE_S0B_GAZE [0,7,190]. This was the round's capture-checked judgment call; the four capture frames read clean.
Shb reuses SQUARE_S1_GAZE by reference, so Sh→Shb→S1 is one locked dolly.


Gallery: Gjb/G1b axis midpoints keep the EAST_DOOR lock. The G0→Gj passage gap is deliberately unsplit.
Captions en+ru: the monolith / the arch ahead / the vault leads on / the door nears (RU text kept as in the source records).
Test pins: the five index-pinning unit files and the touch-rail STOPS/SQUARE_STOP_U maps were re-pointed (five stops → u = i/4, exact binary floats).
Swing rows re-pinned: S0→S0b 47.9 · S0b→Sh 45.8 · Sh→Shb 1.8 · Shb→S1 7.0. The two ~47° pans are the round's feel item for the owner's merge-preview eye.


Sol review (pass 1, 8/10):

F1 breaks → fixed (the capped-clock sizing).
F2 survivable → declined on the code fact: the pair publishes data-moving synchronously at main.ts:3117, mooted by the adopted predicate.
F3 survivable → fixed (the 44-call truthing).
OQ2's mirror refutation ACCEPTED; the data-dwell-ms instrument replaced it.
OQ1 deferred to the owner's merge-preview eyeball.
OQ4: no weakening found.
OQ5 deferred to the ledger wording.


Merge: fast-forward 438c3a3..679298d. The branch was strictly ahead, so there was no union and no conflicts.

## Measured
At the handoff stage (commit 8273061, tests only, no bundle change; 2026-11-12/13, CI-representative env ZIMNY_SOFTWARE_GL=1 + the mac14 override):

Byte-trade: tool total stayed 285,170; ≈40 raw B ≈ 9 B gz. The +129 overage is back on the owner's plate.
Touch-rail settle 2.5 → 8 s. The no-preference tap #1 is a WALK leg ≤ ~2.6 s, and the bit binds per rendered frame, ≤ ~3.4 s at ~1 fps.
Rows verified GREEN: touch-rail 23–27 s · smoke keyboard walk 6.3 min / all 34 legs.
Smoke rework needed seven rAF frames for the reduced-motion dwell.
tsc 0 · biome clean · vitest 1089/1.
ENVIRONMENT FACT: this Mac's GPU path degraded since 11-10 (ReadPixels stalls → 0.3–3 fps; the smoke 900 s starves on it regardless of the spec). SwiftShader is the honest local pre-CI check.

After the Sol review (commits 0144ba0 + 679298d, tests only):

Settle budget re-sized to the CAPPED SIMULATION CLOCK (≥22 frames ≈ 40 s at ~1.3 s/frame).
Smoke walk 44 walkTo calls, measured 6.0–8.3 min ≈ ×1.8–2.4 (the inherited ×1.4 retired).

At the merge (2026-11-13), on the merged HEAD:

tsc 0 · biome clean · vitest 63 files 1099/1 (the COMMITTED suite). The main tree's gitignored probes/r4-kit-night/probe24_test_copy.test.ts (another session's scratch) inflates the local run to 64 files / 1105; reaping rides the owner.
Build JS 285,332 (+162 of declared ≤ +450). The binding line is 285,620 declared vs the 285,707 proposed ceiling, the tighter of the two (Sol-review OQ5 wording).
RU 7,386 (+47 of ≤ +250). Rooms/basis untouched.
Mobile-plan determinism pin 717,197 → 717,607 (+410, --check byte-identical).
Goldens BYTE-HELD by construction (S0/Sh/S1/G0/Gj/G1/G2 poses untouched): the last session's golden battery expects ZERO flips from this lane.

## Hunt / found / fixed

Byte-trade zero net → owner-ruled REVERT.
Settle wall-time arithmetic against the wrong clock → capped-simulation-clock sizing (F1).
The five-row snapshot cannot see the arrival window → the pressability bit plus data-dwell-ms.
The moving failure point of the recorded CI deaths EXPLAINED by the six-frame dwell drain.
Walk-count comments wrong (36 / «34 legs») → truthed to 44 calls.

## Gates

Passed: the deterministic battery on the merged HEAD (see Measured).
Deferred-not-waived → carried by the LAST merging session: the FULL e2e/golden gate, the CI verdict, and the legend.
Owed:

the owner's eyeball of the two ~47° pans (S0→S0b→Sh), riding the merge preview (Fable's fallbacks on record in the round folder)
Sol OQ1 and OQ5
reaping the main tree's scratch test copy



## Mentioned elsewhere
None in this batch's excerpts.
## Sources

docs/briefs/ROUNDS.md · row 11 · line 11 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · MERGED bullet · line 138 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · OPEN bullet · line 139 @ de58d5206909e308e33a089bd0227bbbc85a2278

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| movement-ux (the ci-hardening + stops follow-up) — RELEASED | CI pacing hardening (tests-only) + stops mini-round (+1–2 walk stops per scene, Palace Square and Rastrelli Gallery); declared JS ≤ +450 gz · RU ≤ +250 | MERGED 2026-11-13 — spent, released; measured JS 285,332 (+162), RU 7,386 (+47); full e2e/golden gate + CI verdict ride the last merging session (deferred NOT waived) |
