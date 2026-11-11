 # 9 — Quality tiers + boot microbenchmark Row date 2026-10-17 · Opened n/r · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief round-9 · vault projects n/r · DEC-011

## Ask Code relay (brief: round-9, src/engine/tier.ts): quality tiers anchored on the §11 designated-device gate, with an auto-tier boot microbenchmark, a `?q=` override, persistence, and deterministic-boot behaviour.

## Relay shape — one line per stage that produced a surviving fact
- Specialist draft — accepted near-wholesale; its challenged tolerance-edge pins were right, the orchestrator's were wrong; caught the brief's internal T0 contradiction; three deviations accepted.
- Orchestrator corrections — warmupFrames back to 2; lower-median gate re-anchored to pin «not-averaged».
- Orchestrator wiring (main.ts, sky/time.ts) — boot order, applyViewport generalisation, shadow re-arm/dispose, delayed compileAsync, hashchange handling, deviceMemory cap, queryOf export.
- Integration — ADR-0011 + DEC-011 recorded; watchdog parked; calibration reserved.

## Verdicts

### DEC-011 — Quality tiers on §11 anchors, boot probe at the heaviest surfaces Census: T1 reproduces the §11 designated-device gate verbatim; T0 bounds it down; T2 relaxes it up (post reserved). Auto tier from a ~0.85 s (declared) lower-median probe of rAF intervals, renderer armed at T2 surfaces, decided pre-arrival so the massing compiles once; `?q=` override persists (zimny:tier); det boots skip the probe (det boots cannot depend on wall-clock timing). One heuristic only: `deviceMemory < 4 GiB` (declared) → cap T0; `hardwareConcurrency` excluded because it misgrades the 2-core (declared) reference device. Law: docs/adr/0011.md. Rejected alternatives: probe at T1 surfaces — negligible differentiation; runtime watchdog downgrade — parked until golden frames exist. By-construction claims: lower median, not mean, so a slow first rAF cannot grade the device; the massing compiles once at the final tier (delayed compileAsync); hash query follows one extraction rule (queryOf exported from sky/time.ts). Pins (all derived from stated inputs): t1@1080p = 1024/1440 = 0.71111; t1@1440×900 = 0.89949; t2@1440×900 = 1.79898. T0 contradiction: registered t0 cap 786 432 px (declared) renders ≈0.616 (derived) at 1080p, so «same scale as T1» was impossible — registered cap kept; lower median chosen because the mean would grade the borderline case t0. Not-averaged pin: samples [20,40,30,40,50,30] (declared) → mean 35 (derived) would be t0, lower median 30 (derived) → t1. warmupFrames = 2 (declared; one slow first rAF plus compile jank, cost ~17 ms measured). Specialist deviations accepted: low-memory cap also on the too-short-probe path (device fact, not probe fact); duplicate-q last-wins; Map aliases close the q=constructor prototype hole. Wiring: boot order q → persisted (zimny:tier) → T1 in det (probe skipped) → probe at T2 surfaces; applyViewport generalised to min(dprCap, sqrt(bufferPixelsCap/wh)); shadow re-arm by mapSize + dispose on settle; hashchange re-applies/persists ?q (auto clears, no re-probe after settle); navigator.deviceMemory < 4 caps T0 (fine-typed — unknown in the DOM lib).

## Measured — every budget line as stated at each flip, with the flip date
- 2026-10-17 · validate green: 147 tests (24 new) (measured) · 164 189 gzip of 350 000 (+1.4 KB) (measured).

## Hunt / found / fixed
- Found: brief's internal contradiction on T0 («same scale as T1» vs registered cap 786 432 px → ≈0.616 at 1080p). Fixed: registered cap kept.
- Found: orchestrator's tolerance-edge pins wrong. Fixed: specialist's pins adopted (0.71111 / 0.89949 / 1.79898).
- Found: lower-median gate could pass an averaged implementation. Fixed: re-anchored on [20,40,30,40,50,30].
- Found: q=constructor prototype hole. Fixed: Map aliases.

## Gates — passed · deferred-not-waived → who carries · owed
- Passed: validate green (147 tests).
- Parked: runtime tier watchdog — until golden frames exist (docs/parking-lot.md).
- Deferred-not-waived: calibration of 17.5/30 ms (declared) thresholds → Phase 1 device pass carries; misgrade risk documented.

## Mentioned elsewhere — segments about this round that lived in other rounds' records
- From round 11's record: the CI smoke project boots deterministically at T1 and T0 and asserts the tier via the HUD data-tier labels under SwiftShader (ZIMNY_SOFTWARE_GL=1). (ROUNDS.md line 32 @ 438c3a3)
- Round 11 smoke: deterministic T1/T0 boots read the HUD data-tier labels (see docs/archive/2026-10-17-playwright-e2e-goldens.md).

## Sources — file · entity · line range @ <pinned commit>
- docs/briefs/ROUNDS.md · row 9 · line 30 (1870 B) @ 438c3a3
- docs/decisions.md · DEC-011 · line 15 (697 B) @ 438c3a3
- src/engine/tier.ts, tests/tier.test.ts, src/main.ts, src/sky/time.ts, docs/adr/0011.md, docs/parking-lot.md · line ranges n/r @ 438c3a3 
