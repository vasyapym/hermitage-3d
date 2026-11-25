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
