# Handoff — the doorway's residual dark mass (PARKED 2026-11-14; the next session's entry point)

> **SUPERSEDED 2026-11-14** — the residual this pack chased was diagnosed from the owner's own sighting conditions and is NOT a light law: it is the transit band (the gallery glb's south end wall visible through the mouth while mounted but not indoor), fixed by the roomsRoot gate. See docs/briefs/ROUNDS.md row 68 and the vault `03_projects/hermitage-3d-2026-11-14/`. The costed levers below remain on record for the SEPARATE settled-frame day-read question (the deep vault black at day — probe A's TABLE.md); pick them only if the owner still wants that read warmer.

**Read first:** docs/STATE.md's owner-steer bullet + docs/parking-lot.md's doorway row. This file is the self-contained pack for the session that picks the item up.

## The standing situation

The owner twice reported a dark block-like mass over the warm glow in the Palace Square's gate arch mouth (entering the Rastrelli Gallery), intermittent — "not always visible". Two rounds landed fixes; the owner **still sees the defect** and **PARKED it by explicit call** (2026-11-14, docs/parking-lot.md). The next attempt must **start from the owner's own sighting conditions** — the hour, the device, and the DEPLOYED build's identity — not from another blind class ruling.

## What landed (both merged to main, the owner-steer lane d46343b/d64b3d2)

1. **Round 1 (the day-state plate)**: the throat's AO-grading constants lifted (`AO_MOUTH 0.83 / AO_FALL_M 9 / AO_FLOOR 0.10 / GLOW_TOE 0.04 / GLOW_GAMMA 1.4`) — the day read is a gradient now; the doorway goldens stayed inside ±1%.
2. **The evening lane (the night-state cut-out)**: the lamp's forward spill — `lampSpill(d) = GLOW_TOE × exp((d − LAMP_REACH_M)/THROAT.depthM)` written into the lit geometry's colour attribute as itemSize 4 (alpha), the lit material's emissive = `lampSlab()` at intensity 0, the one-splice shader patch (`totalEmissiveRadiance ×= vColor.a; diffuseColor.a = opacity;` — the massing fade law exact), the gate `setThroatNightSpill(throat, wNight)` beside `nightLattice.setNight`. Day is bit-identical (the canary: golden-s1-noon green); the night mouth reads as a warm receding ramp on the capture at 19:21.
3. **The walk reshaping** (the same lane): the gallery rail is five stops (G0, G0b, Gj, G1, G2); CI green except the recorded draw-calls SwiftShader debt (the stops lane's).

## The recorded mechanism (Astra-6's relay, brief 5 — the vault `03_projects/hermitage-3d-2026-11-12/`)

The crown's light is **albedo × hemisphere (relative)** while the lamp run is **absolute radiance**: the seam is a step at every hour, and at night the crown collapses into the display's black floor (`wNight` is a SWITCH at −7°/−8°, `warmGround` REPLACES the ground, E(h) clamps at 0.55 and cancels in ratios; AgX's floor ≈ 0.01 scene-linear). The pre-flight dusk numbers: the crown at −5° ≈ 0.0086 post-exposure — **below the display floor**: the dusk class is real in arithmetic, and ruling it was deliberately deferred (the class discipline; the owner's complaint hour is night).

## The costed levers for the next ruling (each with its golden flip set)

- **The dusk-gate widening** (`1 − lightmaps.day` instead of `wNight`): fixes dusk + night together; flips the dusk/white-night pins; leaks ~10 % at December noon (must be checked against the battery).
- **`GLOW_TOE` raise** (the round-1 constant): lifts the whole spill ramp; the day/night goldens re-measure.
- **`EXPOSURE.low` lift** (global): everything flips — the last resort.
- **The deploy caveat**: the owner's 2026-11-14 sighting may predate the landing's deploy — VERIFY the deployed sha first (a build marker: the ≥1920 CSS tier or a bundle-hash comparison) before diagnosing anything.

## The next session's shape (the owner's directive)

1. Ask the owner for the sighting conditions: the hour (the site's clock state), the device, and confirm the deployed build carries `d64b3d2`.
2. Classify the sighting: night (ruled, landed — re-verify on the owner's screen), dusk (the recorded candidate — the widest lever above), or day (would falsify the landed law — a defect in the patch, not a new class).
3. Only then pick the lever; the golden re-baseline rides the merging session with the eyeball read; the JS budget sits at 285,609 with **98 B** to the proposed ceiling — frugal, or a budget-ledger row first.

## The pointers

- The law: `src/world/throat.ts` (lampSpill), the builder/patch/gate: `src/procedural/throat.ts`, the gate write: `src/main.ts` beside `nightLattice.setNight`.
- The tests: `tests/throat.test.ts` (the spill law + the builder itemSize 4 + the real-Lambert patch guard + the lightmapWeights switch row).
- The captures: `probes/s1-after-{night-spill,day-spill}.png` (+ the vault copies, `03_projects/hermitage-3d-2026-11-12/probe/`) — the owner's eye-read evidence.
- The relay record: brief 5 + the Astra-6 reply in the vault folder above; the round-1 FINDINGS ledger in `round-1/`.
- The unrelated open debts (other lanes'): the draw-calls SwiftShader probe (smoke 126), the 1812-360 touch-rail slot race (the app fix), scrub-11's +12 h mechanism.
