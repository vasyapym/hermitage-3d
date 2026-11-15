# R2 — Sky-and-time design (Phase 0 contract)
Opened 2026-10-15 · Landed 2026-10-16 (date cell «2026-10-15/16» at the pin) · Merged (sha7 not stated at the pin) · slot not stated · briefs not stated · vault projects vN not stated · DEC-ids: owns none (DEC-009, DEC-010 written in decisions.md at this round per the row)

## Ask
Land the sky-and-time subsystem as a finished contract: solar recipe and acceptance gates become the Phase 0 contract. Specialist: full-cloud chat model.

## Relay shape — one line per stage that produced a surviving fact
1. Combined two-subsystem brief (sky+facade) stalled on every relay model across shapes → lesson: one subsystem per draw.
2. Re-scoped single-subsystem draw (orchestrator-brief form, one varied signal: paragraph-size rhythm) routed on the first try; the reply landed as a finished contract.
3. Orchestrator hand-check of epochs / timestamps / physics sums.

## Verdicts
- Salvage near-wholesale, with the model's two argued deviations accepted: hand-written analytic dome over Preetham (1 of 3 material slots) and zero PMREM (lighting via sun+hemi).
- The model's corrections accepted: white nights = nautical twilight (−6.6° dips below the −6° civil boundary); dusk plateau −7…−4°; bounded epochs 1901–2099; title hold 240 ms / fade 600 ms.
- Attribution tags: none stated at the pin for the numbers above (carried untagged).
- Solar recipe and acceptance gates are now the Phase 0 contract.
- DEC-009, DEC-010 recorded in docs/decisions.md by this round (ownership outside this batch).

### DEC-009 — Sky: hand-written analytic dome material
- **Census:** three.js Sky (Preetham) as-is vs a hand-written analytic dome material.
- **Verdict:** Preetham (three.js Sky) is a daylight model. Below the horizon it extrapolates a look that fails the defining white-night band (−8.6°…−4.6°; tag n/r at pin). The dome is built around a controlled twilight continuation (docs/design-sky-time.md §7).
- **Budget:** consumes 1 of the ≤ 3 custom-material slots (cap; tag n/r at pin); 2 remain (derived: ≤ 3 minus 1).
- **Rejected:** three.js Sky as-is. It costs no material slot, but visually fails the project's defining light state.
- **By-construction claims:** none stated.
- **Source:** docs/decisions.md · DEC-009 · L13 (479 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

### DEC-010 — No PMREM in Phase 0
- **Census:** PMREM regeneration on clock movement vs no PMREM (no environment bake).
- **Verdict:** exterior massing is diffuse Lambert under a solar directional light + a palette-derived hemispheric light; `scene.environment` stays null (docs/design-sky-time.md §7).
- **By-construction claim:** the bake jank failure mode is removed by removing the bake, not rate-limited.
- **Rejected:** PMREM regeneration on clock movement. A non-preemptible GPU stall returns at any cadence.
- **Revisit:** by ADR in Phase 2 with interiors.
- **Numbers:** none beyond the phase scope (Phase 0; revisit Phase 2).
- **Source:** docs/decisions.md · DEC-010 · L14 (452 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

### DEC-009 — Sky: hand-written analytic dome material
- **Census:** three.js Sky (Preetham) as-is vs a hand-written analytic dome material.
- **Verdict:** Preetham (three.js Sky) is a daylight model. Below the horizon it extrapolates a look that fails the defining white-night band (−8.6°…−4.6°; tag n/r at pin). The dome is built around a controlled twilight continuation (docs/design-sky-time.md §7).
- **Budget:** consumes 1 of the ≤ 3 custom-material slots (cap; tag n/r at pin); 2 remain (derived: ≤ 3 minus 1).
- **Rejected:** three.js Sky as-is. It costs no material slot, but visually fails the project's defining light state.
- **By-construction claims:** none stated.
- **Source:** docs/decisions.md · DEC-009 · L13 (479 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

### DEC-010 — No PMREM in Phase 0
- **Census:** PMREM regeneration on clock movement vs no PMREM (no environment bake).
- **Verdict:** exterior massing is diffuse Lambert under a solar directional light + a palette-derived hemispheric light; `scene.environment` stays null (docs/design-sky-time.md §7).
- **By-construction claim:** the bake jank failure mode is removed by removing the bake, not rate-limited.
- **Rejected:** PMREM regeneration on clock movement. A non-preemptible GPU stall returns at any cadence.
- **Revisit:** by ADR in Phase 2 with interiors.
- **Numbers:** none beyond the phase scope (Phase 0; revisit Phase 2).
- **Source:** docs/decisions.md · DEC-010 · L14 (452 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

### DEC-009 — Sky: hand-written analytic dome material
- **Census:** three.js Sky (Preetham) as-is vs a hand-written analytic dome material.
- **Verdict:** Preetham (three.js Sky) is a daylight model. Below the horizon it extrapolates a look that fails the defining white-night band (−8.6°…−4.6°; tag n/r at pin). The dome is built around a controlled twilight continuation (docs/design-sky-time.md §7).
- **Budget:** consumes 1 of the ≤ 3 custom-material slots (cap; tag n/r at pin); 2 remain (derived: ≤ 3 minus 1).
- **Rejected:** three.js Sky as-is. It costs no material slot, but visually fails the project's defining light state.
- **By-construction claims:** none stated.
- **Source:** docs/decisions.md · DEC-009 · L13 (479 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

### DEC-010 — No PMREM in Phase 0
- **Census:** PMREM regeneration on clock movement vs no PMREM (no environment bake).
- **Verdict:** exterior massing is diffuse Lambert under a solar directional light + a palette-derived hemispheric light; `scene.environment` stays null (docs/design-sky-time.md §7).
- **By-construction claim:** the bake jank failure mode is removed by removing the bake, not rate-limited.
- **Rejected:** PMREM regeneration on clock movement. A non-preemptible GPU stall returns at any cadence.
- **Revisit:** by ADR in Phase 2 with interiors.
- **Numbers:** none beyond the phase scope (Phase 0; revisit Phase 2).
- **Source:** docs/decisions.md · DEC-010 · L14 (452 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e

## Measured — every budget line as stated at each flip, with the flip date
None stated at the pin.

## Hunt / found / fixed
- Found: a combined sky+facade brief stalled on every relay model across shapes → fixed by re-scoping to one subsystem per draw.
- Hand-checked: epochs, timestamps, physics sums.

## Gates — passed · deferred-not-waived → who carries · owed
- Passed: orchestrator hand-check of epochs/timestamps/physics sums.
- Owed (implementation-time checks): the 1e-5° vector tolerance; the three.js chunk APIs.

## Mentioned elsewhere — segments about this round that lived in other rounds' records
- Round 4 (2026-10-16, sky dome rig code relay) was briefed on src/sky/rig.ts against §7 + DEC-009 and implements the hand-written dome under DEC-009. It uses the x²·x²·x² 6th-power lobe and GLSL1 + <common> for the dithering rand, and is gated on zero textures. Validate green: 66 tests, 129 015 gzip bytes of 350 000. → docs/archive/2026-10-16-sky-dome-rig-code.md
None in this batch.

## Sources — file · entity · line range @ <pinned commit>
- docs/briefs/ROUNDS.md · row roundNo 2 · line 23 (1042 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- Integrated per the row: docs/design-sky-time.md (new), docs/decisions.md (DEC-009, DEC-010), docs/architecture.md, ROADMAP.md
