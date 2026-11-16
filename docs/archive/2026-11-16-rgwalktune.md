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

The unit battery: vitest 252/252 over stops/rail-b9/rail-walk/rail/look/i18n; biome clean (9 files); tsc clean. Build/budget/e2e/probes DEFERRED NOT WAIVED (the owner's bake session co-tenants the machine; the quiet-machine law) — the spec predicts ≈ +170 B gz JS / +55 RU (ledger refined at the measured run). The displaced design rows (the 83°/6.10° linear field rows, the five-stop §7 note) live in this file's Verdicts/history pending the close compaction.

## Hunt / found / fixed

Found at integration: the spec's re-pin list missed tests/rail.test.ts (fixed); the smoke keyboard count 44 → 46 (the spec's forward-only count — fixed by the composition law); the subagent's historical-note transcription checked against main («MEASURED at 44 calls» was the original's own figure — faithful, no fix).

## Gates — passed · deferred-not-waived → who carries · owed

Passed: records-check at the lane marking and at the integrated state; the unit battery + tsc + biome local (252/252).
Deferred NOT waived: pnpm build + budget (the byte prediction's verdict), the e2e smoke/touch-rail targeted rows, the framing stills (probes/rg-walk-capture.mjs written, not run — the G0b mouth's dusk/night «lit» read is the flagged capture question), the review passes 2a/2b, the FULL e2e/golden gate + the CI verdict — the gates ride tomorrow's quiet window and the owner's merge signal.

## Sources

docs/briefs/ROUNDS.md · row rg-walk-tune · commits b2f007c (the marking) + 7208438 (the integration)
