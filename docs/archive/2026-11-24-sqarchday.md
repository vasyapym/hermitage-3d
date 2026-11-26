# sq-arch-day — the Palace Square's first cast shadows + the day look (opened 2026-11-24)

The round's two tasks (the owner, 2026-11-24, the PARALLEL lane): Task 1 — the portal's arch read
(the outer two arches' mechanical tier landed earlier, commit 88d3ed1; the middle arch's
proportions decision); Task 2 — the day-look census → the creative's rank → the design → the
owner's T-sitting → integrate.

## The flow

1. **The census** (the instrument, committed): 15 plates = 5 rail stops × dec-noon + june-noon,
   3 june drag plates, 2 dec S1 drag plates (the arch-read pair) + the wall-probe quartiles
   (darkest-25 %/brightest-50 %, Rec.709). The frames' prose descriptions live in the vault.
2. **Brief 1 → the rank** (round-1/replies/1-sqday-reply.md): R1 no light direction (PICK) /
   R2 grading / R3 ground sheet / R4 dead panes / R5 flat sky / R6 placeholders; the arch =
   disposition A concentric. Gate verdicts (verified): the sun mapping CORRECT; the E-challenge
   accepted (dec-noon h ≈ 3–6°, E ≈ 0.76–0.83); ROOT FINDING: `renderer.shadowMap.enabled` was
   set NOWHERE — the project never rendered a cast shadow.
3. **Briefs 2–3 → the design** (the deltas): B0's acceptance restated in the display domain
   (the AgX shoulder lesson); DRIFT_MIN 0.50; the shadow.intensity E-fade replaces the castShadow
   toggle; B1a(1) resolved no-bite (the ground is Lambert).
4. **The T-sitting** (round-1/SITTING.md): 12/12 at the creative's recommendations — the design
   FINAL (B1a the shadow enable + normalBias 0.05 + the intensity fade; B1b SUN_PEAK 6 + the warm
   sun + fill 11/0.60; B2 the deepened zenith + the aureole; B3 the drift + the lanes; B4 the pane
   day albedo + tint; B5 the concentric arch + the ONE Shape head + the throat knots).
5. **The integration** B1–B5 (commit af835c4 + the fixes' tail 4284fb9…2a30b5c): the shadow enable,
   the FIT's projection rebuild, the pane uniforms' declarations, the caps re-pin, the DEV shadow
   hook (the sqdebug=1 URL gate).
6. **Brief 4 → the review pass** (Sol 6.1; round-1/replies/4-sqday-reply.md): P0-1 (the receiver
   splices) ruled out by the toggle plate (the shadows render and receive: 34,824 px diff;
   determinism 0); P0-2 the fork taken (the fill-11 contrast eats them in display — the design
   lever, not a bug); the FIT-record finding (WebGLShadowMap rebuilds the projection at the first
   map allocation — the frames' identity explained); the P1 batch (the head translate, the sun
   colour's night identity, the drift↔lane ordering, the panes' live K); the verdicts: the
   metric domains RESTATed ((i) the walls — within-plane uniformity ≠ relief; (v) the sky — the
   fixed angular bands; the census ceilings hold at 96/120,000).
7. **The review's P1 batch** (the round's fix pass): the head translate `centreX` (was
   `centreX − width/2` — the head sat half a width west, its arch cutout off the throat void);
   the sun colour lerps white → warm by E(h) in applyEpoch (the warm tint rode E = 0); the drift
   gates OFF-lane (`mix(1, drift, 1 − lane)` — it cannot refill the cleared lane; the cache key
   @4; the driftLaneDay TS twin + the tests); the honest filter: three r186 REMOVED PCFSoftShadowMap
   (the first shadow pass warned and reset the type — the readout's "1"); the code carries
   `THREE.PCFShadowMap`; the wall-probe lint fix.
8. **Brief 5 → the day RICHNESS pass** (the owner: «the daylight mostly feels like only a whiter
   version of room. and thus it looks less rich»): the row-set over the full day stack (the fill
   / the sun's colour / the sun's peak / the exposure / the dome's gradient knee / the fill's
   colour); the fill ladder MEASURED (11 → 7.5 → 4.5: the facade darkQ 98–109 → 90–101 → 82–93;
   the shadow-toggle diff 34,824 → 38,386 → 40,941 px; the lane 0.68/0.70 → 0.59/0.67; the
   off-lane snow stable). **The PICK-set** (the owner's eye, 2026-11-25: «PICK is fine»):
   FILL_DAY_GAIN 4.5 (the shade:lit ≈ 1/6), SUN_COLOR [1.0, 0.92, 0.78] (≈ 4600 K — the warm/cool
   split against the blue fill), DOME_KNEE_DAY 0.72 in rig.ts (the dome's gradient knee — the
   visible sky band deepens above the roofline; the v0/vDay/mix three-line form keeps the
   committed expression byte-identical at E = 0). The sun's peak, the exposure, the fill's colour
   hold; the plaza albedo deferred to the successor round.

## The gates at the close (the PICK tree, 2026-11-25)

- validate GREEN ×2 (the P1 tree and the PICK tree): 1284 tests + 2 skipped; JS 291,653/350,000
  (the round's +2,134 over main's 289,519); RU +0.
- The census 15/15 (gating): draws 75–86, tris 111,834–115,630 — inside the re-pinned caps
  96/120,000; 0 console errors.
- e2e square-kit 8/8 ×2; the shadow toggle on PICK: 41,543 px (+1.5 % of the spec's band),
  the determinism in the noise class (0–285 observed across runs).
- The goldens: the 4 DAY rows flipped as declared (noon, S1 noon, dec noon, S0b dec noon) and
  were re-baselined at the PICK (17/17 after); every night/dusk/room row held through every
  build — the night identity never moved.

## Owed / the successor list

- R6 (placeholders) items recorded, not implemented this round — the flat-black side arches read
  as the first candidate.
- The metric restates' calibration against a reference build ((i)/(v)/(iv)'s lane note).
- The deferred rows: the fill's colour 0.45 (the cooler shade), the plaza albedo 0x3f3f3f →
  ~0x4f4f4f (the granite setts; needs the wall-probe's ground band), the exposure 0.92
  saturation probe.
- The middle arch's proportions decision (Task 1) landed WITH the round's arch (the concentric
  disposition); the throat ring/vault radii remain the committed values.
- The channel-level instrument checks (the lit trim's B, the sky bands at 17°/30°, the horizon
  seam) — not run; the wall-probe's band mode is the successor instrument.

### ROUNDS row before compaction (moved 2026-11-26)

| **sq-arch-day** · MERGED (the wave's SECOND merging session of three — the merge carries the round's close 1905977; the FULL gate + the due numbers ride the LAST merging session — deferred NOT waived) | 2026-11-24 → 2026-11-25 | The Palace Square's first cast shadows + the day look: the census relay (15 plates + the quartile probe) → the creative's rank (R1 no light direction) → the design briefs 2–3 → the T-sitting 12/12 (B1a–B5) → the integration → the review pass (Sol 6.1, brief 4: the P0/P1 findings + the metric-domain restates) → the review's P1 batch (the head translate, the sun colour's night identity, the drift off-lane, the honest PCF — r186 removed PCFSoft) → the day RICHNESS brief 5 (the owner: «only a whiter version of room») → the row-set → **the owner's PICK**: fill 4.5 + sun 4600 K + the dome knee 0.72. Vault: 03-1_projects/hermitage-3d-2026-11-24-sq-arch-day; briefs 1–5. | DEC-054 · the shadows render and receive (the toggle plate 34,824 → 41,543 px) · the night/dusk bit-identity through every build (the goldens' night rows never moved) · the 4 DAY goldens re-baselined at the PICK (17/17) · validate GREEN ×2 (1284 tests) · the census 15/15 (75–86 draws, ≤ 115,630 tris — the caps re-pinned 96/120,000) · e2e square-kit 8/8 ×2 · JS 291,653/350,000 (+2,134) · RU +0 | branch sq-arch-day (af835c4…1905977) · briefs 1–5 · merge = this commit · → docs/archive/2026-11-24-sqarchday.md |

### DEC-054 — the full DEC entry (moved from docs/decisions.md 2026-11-26, the records decision step 6; the bounded entry lives in docs/decisions.md)

- **DEC-054 · The Palace Square's first cast shadows + the day look: the shadow map enabled (two pre-existing defects: `shadowMap.enabled` was never set; the shadow frustum's projection rebuilt after the FIT — and three r186's own first-allocation rebuild made the explicit fix a no-op on the frames), the day reshaped (SUN_PEAK 6, the warm sun white-lerped by E(h), the fill, the deepened zenith + the aureole, the winter drift gated off-lane, the pane day albedo + sky tint), the gate pavilion as the ONE arch-topped piece (the concentric arch, the crown 9.70), and the day RICHNESS pick-set — the owner's eye: «PICK is fine»** (2026-11-25 · assigned at the round's close, the branch push · round sq-arch-day · briefs 1–5 + the T-sitting 12/12 + the review pass Sol 6.1 · the PARALLEL lane, the merge on the owner's signal) — verdicts: the toggle plate proved the shadows render and receive (34,824 px diff) with the fill-11 contrast eating them in display — the review's P0-2 fork (the design lever, not a bug); the review's P1 batch integrated (the head translate `centreX` — the head sat half a width west with its arch cutout off the throat void; the sun colour's night identity — the warm tint rode E = 0; the drift gates OFF-lane so it cannot refill the cleared lane, the snow slot @4; the honest `THREE.PCFShadowMap` — three r186 REMOVED PCFSoftShadowMap, the first shadow pass warned and reset the type, the readout "1"); the pick-set (FILL_DAY_GAIN 4.5 — the shade:lit ≈ 1/6, the measured ladder's darkQ 98–109 → 90–101 → 82–93 and the shadow diff 34,824 → 40,941 px; SUN_COLOR [1.0, 0.92, 0.78] ≈ 4600 K — the warm/cool split against the blue fill; DOME_KNEE_DAY 0.72 — the dome's gradient knee, the v0/vDay/mix form bit-identical at E = 0); the acceptance metric domains RESTATed by the review's verdicts ((i) the walls' within-plane uniformity ≠ relief; (v) the sky's fixed angular bands; the darkest arcade cell 81 accepted under the restatement — the eye is the display verdict); the night/dusk bit-identity HELD through every build (the goldens' night/dusk/room rows green at every step) — contracts: JS 291,653/350,000 measured (the round's +2,134; the +82 over the P1 tree = the pick-set: two constants + three shader lines) · RU +0 · the whole-frame caps RE-PINNED 96 draws / 120,000 tris (the measured max 86/115,630 — the shadow passes add ~42 depth-pass draws the shadowless caps never modeled; ONE DEC at this close) · the census 15/15 · e2e square-kit 8/8 ×2 · the goldens: the 4 DAY rows re-baselined at the PICK (noon, S1 noon, dec noon, S0b dec noon — 17/17 after), the night rows never moved — law: src/main.ts (the shadow enable + the rig + applyEpoch) + src/sky/{fill,rig,appearance}.ts + src/content/sky-time.ts + src/{world,procedural}/ground-snow.ts + tests/{sun-stack,sky-palette,ground-snow}.test.ts | here · why: docs/archive/2026-11-24-sqarchday.md
