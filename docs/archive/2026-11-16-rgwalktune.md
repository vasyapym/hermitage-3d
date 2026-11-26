# rg-walk-tune — the Rastrelli Gallery's Forward-walk camera feel
Opened 2026-11-16 · Landed n/r · Merged n/r (n/r — pending; worktree merge + FULL e2e/golden gate at the owner's signal only) · slot n/r · briefs 1–2b · vault projects hermitage-3d-2026-11-16 · DEC-ids: none owned yet
## Ask
The owner's three 2026-11-16 observations on the five-stop gallery walk (G0 → G0b → Gj → G1 → G2): move 1 tilts up oddly («it feels like it looks a bit to the above»); move 2's down-look plus the movement/camera-rotation synchrony («it shouldn't stop moving exactly at the same time as it stops camera rotation — or I might be wrong»); the two long corridor glides too distant and fast (the owner's hypotheses: move G2 back so three moves divide the distance, or add a stop if JS allows). The creative (Fable 5.1) evaluates and decides data-only vs law-level. Status at pin: OPEN, PARALLEL (branch rg-walk-tune off main d136e79, worktree ~/Documents/hermitage-3d-rg-walk-tune; scope-local gates only).
## Relay shape

Brief 1 = the decision brief (facts + mechanism map + the owner's verbatim report; zero-steering on the mechanism, the owner's hypotheses carried as hypotheses). Fable 5.1's decision + spec ADOPTED in full by the orchestrator (the transport: one collapsed line, ⏎ decode + marker cut; the decode note beside the reply file).
Integration commit 7208438: B9b «the look leads» (LOOK_LEAD 0.8; the one weight w = smoothstep(min(1, wd / LOOK_LEAD)); the pass-through rate kink closed by construction) · G0b's subject re-authored JUNCTION → GALLERY_MOUTH (the passage pan split 22.0°/61.0°; the 6.10° down-settle retires) · Gjb/G1b reinstated at x 12.8/32.25 (the axis rests; 14.9→7.5 / 11.0→5.5 m/s) · captions g0b revised + gjb/g1b new (keys en ru) · the pin surface re-pointed (stops, rail-b9, rail-walk, rail, smoke legs/BEATS/counts, touch-rail STOPS) · the design laws rewritten (walkthrough-ux §7/§8, staircase r18a).
Review passes 2a (the gaze law + its record) and 2b (the room data + its pin surface) composed, self-contained, pending the owner's relay.

## Verdicts

The creative's spec adopted (the decision: data-only for moves 1 and 3–4; the B9b weight reshape for the synchrony; the owner's «fifth stop back from the door» hypothesis REJECTED — the fifth press is the airlock boundary, G2's 3 m offset is the airlock's depart choreography). The integration's own calls: tests/rail.test.ts added to the re-pin list (the spec missed it — the old 6.1009°/3.0591° linear rows); the keyboard landing count 46 (the spec said 44 — the reduced-motion CUT law lands on every stop in EACH direction); the per-heading gaze shape re-pinned (the cross-heading point-equality pins retired — under the lead the two readings no longer coincide at a rail point; the law's promise holds per anchored segment).

## Measured

The unit battery: vitest 252/252 over stops/rail-b9/rail-walk/rail/look/i18n; biome clean (9 files); tsc clean. Build/budget: JS 285,892 (+263 of the declared ≤ +400) · RU 7,474 (+114 of ≤ +150) — vs the proposed operating ceiling 285,707: +185 gz OVER → the owner plate pending (the ledger row carries it). The targeted e2e (quiet, one run + one re-run): touch-rail fine-pointer GREEN (the STOPS walk order verified live); the smoke walk rows (arrow 176 + keyboard 300) local-red — the recorded machine-stall class: two runs, two DIFFERENT timeout points (run 1 wedged its poll at the G1 leg; run 2 PASSED every gallery leg, both airlock transits and the jordan entry, dying only at the final home swap on the spent budget), the trace cadence p50 288 ms / p99 1.16 s / max 2.5 s = the reference machine's recorded stall profile; CI green = the authority (the ownersteer precedent for smoke 176 verbatim); the honest note: the re-choreography's +2 gallery legs tighten the row's own budget further (the walk-row verdict rides the merge PR's CI).

## Hunt / found / fixed

Found at integration: the spec's re-pin list missed tests/rail.test.ts (fixed); the smoke keyboard count 44 → 46 (the spec's forward-only count — fixed by the composition law); the subagent's historical-note transcription checked against main («MEASURED at 44 calls» was the original's own figure — faithful, no fix).
Found at review 2a (Sol 6.1, both fixed at 2496396, text-only): the law prose promised history-free/retracing that B9b no longer provides (the base gaze is now stated as a function of position, heading and the active anchor; the cross-heading point-equality's retirement recorded as intentional); the universal «zero rate on both sides of every stop» overclaimed past the locked-dolly branch (qualified to the nonlocked blends, the held-point parallax excepted). Review 2b (Sol 6.1): zero findings; its open questions resolved (the count 46 confirmed; the bytes measured; the captions mechanically clean; the e2e consistency by inspection → the live targeted run).
Found at the e2e verification: the smoke walk rows local-red ×2 at DIFFERENT steps (see Measured) — the recorded stall class, CI = the authority; the deferred Sol-2a strengthening item (a real anchor-clearing crossing test) parked.

## Gates — passed · deferred-not-waived → who carries · owed

Passed: records-check at the lane marking and at the integrated state; the unit battery + tsc + biome local (252/252); the build + budget (the measured numbers above); the touch-rail fine-pointer e2e row (live, green); the framing stills captured (probes/rg-walk-after/, six frames — day/dusk × G0/G0b/Gj; the mouth reads warm/lit at dusk, the owner's eye-read pending).
Deferred NOT waived: the smoke walk rows' verdict = CI at the merge PR (the recorded stall class; the local reds ×2 diagnosed above); the FULL e2e/golden gate + the CI verdict + the golden re-baselines (predicted zero flips — G1's pose untouched) ride the owner's merge signal; the owner's eye-reads (the stills, the HUD caption fit, the Forward-walk feel); the keyboard row's 46-call CI timing.

## Sources

docs/briefs/ROUNDS.md · row rg-walk-tune · commits b2f007c (the marking) + 7208438 (the integration)

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **rg-walk-tune — RELEASED** | the Rastrelli Gallery's Forward-walk camera re-choreography (B9b the look leads LOOK_LEAD 0.8 · G0b → GALLERY_MOUTH, the pan split 22/61 · Gjb/G1b reinstated, 7.5/5.5 m/s): measured JS 285,892 (+263 of the declared ≤ +400) · RU 7,474 (+114 of ≤ +150) — +185 gz over the proposed operating ceiling 285,707 → the OWNER PLATE line (the movement-ux precedent ≈ +129 covered) | MERGED 2026-11-17 (the wave's slot 3/4) — SPENT and RELEASED; no DEC owned (the B9b law lives in design-walkthrough-ux §8 + the rail header); the FULL gate + the CI verdict + the smoke walk rows' CI timing ride the last-merging session |
