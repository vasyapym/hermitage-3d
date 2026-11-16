# the transit-band round — the doorway residual's PARKED «dark mass» diagnosed and fixed by the roomsRoot gate
Opened 2026-11-14 · Landed 2026-11-14 · Merged 2026-11-14 (n/r) · slot n/r · briefs 1–3 · vault projects n/r (03_projects/hermitage-3d-2026-11-14/) · DEC-ids n/r
Landed ON MAIN, direct, solo-lane.
## Ask
Resolve the doorway residual (PARKED 2026-11-14), the «dark mass»: diagnose it from the owner's own sighting conditions (the handoff's own directive) and fix it. The owner's sighting was both directions, camera-close, clock/device-independent, "most of the time".
## Relay shape

Astra-6, brief 1 (1-throat-day-seam): the diagnosis ruling, six candidates. The orchestrator's "day deep-end collapse" was REJECTED as stated and corrected to the lit-run contrast question; the ownership question was unresolved there.
Orchestrator probes A / B / C (probe-1/{TABLE,FINDINGS}.md):

A: the lighting table at three instants.
B: the ownership raycast at S1 ± distances.
C: all-hits + the glb parse + the transit reproduction.


Astra-6, brief 2 (2-transit-band-mount): the lever, (b′) the host-side root gate. It was chosen over defer-add (compileAsync would warm nothing), over a contract hook (the object is module-internal), and over accept.
Sol 6.1, brief 3 (3-review-transit-gate): ship as-is. Its two conditional risks, the cold deep-link and the exit glide, were closed on disk.
Replies are in round-1/replies/. Evidence is capture-1-iphone-day-1201.png + probe-1/.

## Verdicts
No DEC number exists (n/r). Verdicts on record:

The diagnosis, three independent lines:

The owner's capture (iPhone 11, site clock 12:01, a DAY state on the deployed, d64b3d2-carrying bundle; deploy verified by the splice markers in main-CJO05Hxz.js) shows a speckled grey band across the warm cap's lower half.
Probe A ruled the light law OUT of the band's seat. The day lit-run does collapse (deep rows below ~0.01 ×E, from d≈5–16), but the cap is Basic and permanently warm,.6, 0.88, 0.352] = (217,192,164).
Probe B matched the capture's element set to the computed stack and found NO mid-mouth occluder in the settled scene.
Probe C pinned it: the band = the gallery glb's south end wall (z 87.49, the tombstone face with the arched doorway, baked-lightmap grain under MSAA) seen through the mouth while the room is mounted (hold-start, 268e277) and the exterior is still renderable.
It is the mounted-but-not-indoor window, in both directions, masked from every settled capture by construction (the golden gap: all prior evidence was settled-frame). No depth-fight pair exists, and the glb north face is 0.49 m BEHIND the cap.
Two landed light rounds (4147e60, d64b3d2) were real settled-frame fixes and both REMAIN; they never saw it.


The fix, the roomsRoot gate (Astra-6 lever (b′), Sol-reviewed, ship-as-is):

A host-owned THREE.Group roomsRoot under the scene. RoomScene.add/remove redirect into it (rooms/* and the contract byte-identical).
roomsRoot.visible = indoor per-frame in applyPresentation, beside palace.visible = visible && !indoor.
Exterior XOR interior, state-based: covers reduced-motion cuts and any window width. No module/contract/FSM/applySwap/scheduling change.


R24-ux «overlap visibility policy stands» (efc0578) consciously ADJUSTED on the exterior↔interior half by the one complementary line. Interior↔interior lifetimes and the environment handover are unchanged.
Verified on disk:

three's compile collects materials via scene.traverse (visibility-agnostic), so the hold still compiles the room's shaders. The light pass is traverseVisible, but all three room glbs carry no lights (JSON-chunk verified). The hold-mount intent stands.
The throat rides the palace group.
The boot deep link goes beginTransitTo → upload-swap → indoor = true (no direct mount at boot).
The exit swap re-seeds the camera (seedRail('square')) before the first exterior frame.
The one stale-flag frame at the swap renders at the card's drained exposure; today's behavior is worse, since the room stays visible until dispose.


Separate, on record for the owner: the settled-frame day read (the deep vault black at 12:01, probe A's TABLE) is a different design question. The light-law levers (dusk-gate widening, GLOW_TOE, EXPOSURE.low) stay parked with it.

## Measured
At landing (2026-11-14):

validate GREEN: tsc 0 · biome clean · vitest 1127 passed / 1 skipped on 64 files (the committed suite unchanged, no test rows touched).
JS 285,631 gzip of 350,000 (+22: the roomsRoot Group + 2 redirects + 1 flag line; 76 B under the proposed 285,707 ceiling; no ledger row). RU 7,360.
Targeted e2e battery GREEN (golden + smoke + environment-handover): 29 passed (38.6 m), zero failed/flaky.

The settled goldens are bit-identical, including golden-s1-noon, the day zero-flip detector.
The smoke covers both transit directions and the return home.
environment-handover covers gallery→jordan and interior→square.


Golden spot-checks GREEN (the battery's golden suite, zero flips).
Post-fix transit screencast GREEN: 132 frames, the band absent across the whole mounted-but-not-indoor window (cast-025 mid-drain clean). The pre-fix casts are preserved in the vault probe-1/prefix-casts/.
Owner's eye-read CONFIRMED on the deployed build, 2026-11-15: «i checked visually — it is fine».

## Hunt / found / fixed

Found: the «dark mass» was never the light law. It is the gallery glb's south end wall (z 87.49) visible through the gate mouth in the transit's mounted-but-not-indoor window. Prior evidence was all settled-frame.
Fixed by the roomsRoot gate (see Verdicts).

## Gates

Passed: validate; targeted e2e battery; golden spot-checks; post-fix screencast.
CI verdict on the pushed head: FAILURE = the residual known reds ONLY. The draw-calls budget assertion (expectWithinBudgets, Received 260 > 250, SwiftShader) tripped on the touch-rail military-gallery walk. The identical received 260 is the documented pre-existing class: failed ×2 on the two immediately-prior main runs (the handoff and the parking-records commits, zero runtime changes) and ×4 at fd838f4 itself. Nothing new. The verdict per the solo-merge ruling: PASS.
Waived: the FULL battery, per the R21-ux/R22-ux precedent. It is waived under that precedent, not deferred.
Owed / open threads unchanged: the 1812-360 app fix, scrub-11's +12 h, the draw-calls SwiftShader CI debt.

## Mentioned elsewhere
None in this batch's excerpts. Superseded record: docs/handoff-doorway-residual.md (superseded header).
## Sources

docs/briefs/ROUNDS.md · row 111 · line 111 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · LANDED ON MAIN bullet · line 133 @ de58d5206909e308e33a089bd0227bbbc85a2278
Touched by the round: src/main.ts, src/world/registry.ts, docs/STATE.md, docs/briefs/ROUNDS.md, docs/budget-ledger.md, docs/parking-lot.md, docs/handoff-doorway-residual.md
