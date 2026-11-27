# sq-fix-improve — the iPhone-11 device fix + the Palace Square's low-sun look (opened 2026-11-26)

The round's task (the owner, 2026-11-26, the parallel lane, verbatim): «Fix the iPhone-11 close-up
mottling; then an improvement iteration of the Palace Square's light/shadows — every shadow/light
decision the creative's, we trust its rationale and taste». The PARALLEL constraint: the round ran
in its own worktree `~/Documents/hermitage-3d-sq-fix-improve`, branch `sq-fix-improve`; main
untouched by it — commits 199432f → 26aa1ac → f4082c7 on the base 0e6cea5. The merge rides the
owner's ticket decision 2026-11-27: merge tonight per the merge-queue ticket, the full gate per the
last-merge law. The trail: the vault folder `03-1_projects/hermitage-3d-2026-11-26-sq-fix-improve/`
— briefs 1–5, round-1/replies/, round-1/FINDINGS.md, probes/p1-debug-report.md. All shadow/light
decisions belong to the creative; the orchestrator gathers evidence and integrates the picks.

## The flow

1. **R1 — the device fix** (brief 1 → astra-6.2's ruling): the tier rows carry
   shadowNormalBias/shadowRadius — t0 0.1/0.5 (the iPhone-11 device class), t1/t2 0.05/1 (the Mac
   bit-identical) — applied per settle in settleTier (`src/engine/tier.ts`, `src/main.ts`); validate
   1301, goldens 17/17, no re-baseline (commit 199432f). The rationale: «The extra 5 cm moves the
   lit wall's lookup along its normal, away from nearly coplanar kit backs»; the half radius limits
   «how far an upslope depth or relief edge can darken adjacent plaster». The dprCap argument: «The
   iPhone's 2× stretch applies to a color-buffer pixel, not to each shadow texel... Keep the fill
   budget rather than spend it on a world-fixed collar» — dprCap stays 1. The factor-1.6 refusal:
   «Do not stack factor 1.6 on top. Its slope offset on A13 is unmeasured, and extra caster
   separation could erase the contact shadow that makes a sill look seated.»
2. **R2 — the low-sun warm key** (brief 2 → Fable's ruling): SUN_LOW_RGB [1.12, 0.72, 0.4] (linear
   ≈ 3200 K, Y ≈ 0.78 of neutral) keyed on elevation through lowSunMix — smootherstep over the
   SUN_LOW_RAMP_DEG 25° ramp (h 6.6 → 0.12, 16 → 0.75, ≥ 25 → 1); applyEpoch lerps SUN_WARM toward
   SUN_LOW by 1 − lowSunMix(h) through a scratch colour before the day term (`src/sky/appearance.ts`
   stays pure, `src/main.ts` applyEpoch). h ≥ 25° bit-identical by construction (spring/summer); the
   §8 intensity law untouched. The goldens held 17/17 — DEC-056's dec-row price realized as none
   (the creative's proposed re-baseline of the dec-noon rows moved nothing). The read: «shadows
   become legible by hue» — the dec facade gold, the arch recesses cool.
3. **R3 — the snow drift lighting** (brief 2 → Fable's ruling): a normal tilt in the ground's paving
   slot, snow mode only — «A smooth Lambert snow plane under a frontal low sun IS flat; the only
   honest lever is relief»: SNOW_TILT_AMP 0.05 rad off the slot's hash-noise gradient at
   worldXZ / SNOW_TILT_PERIOD_M 4, gated by the slot's snow weight uSnow (relative N·L swing ≈ 45 %
   at h 6.6° vs ≈ 4 % at 51° — self-gating by season); the snow albedo drift floor GROUND_DRIFT_MIN
   0.5 → 0.75 (the mottle halved). The calibration story: the tilt landed raw (the gradient
   unbounded — the realized peak ≈ 1.5°, not the ruled ≈ 3°); the review fix divided the gradient by
   the new SNOW_TILT_GRAD_BOUND = the field sup 1.5 / period = 0.375 → the peak = SNOW_TILT_AMP
   exactly (0.05 rad ≈ 2.86° theoretical, ≈ 2.81° measured on the grid) — the ruled ±3° class,
   pinned by the derivation/sweep/achieved-angle/emitted-chunk pin tests; the slot body changed →
   PAVING_SLOT @4 / the cache key @6. The uSnow = 0 guard is an exact-identity branchless select of
   the incoming normal (the review's R4 fix).
4. **P1 — the Column's dec shadow, the saga** (briefs 2–4): the creative's pick 1 — «The Column
   must cast»: the dec 6.6° sun should throw the 47 m Column's shadow up the facade (a ~410 m shadow
   = a full-height stripe) + the pedestal's long rake on the snow; «This is the most legible shadow
   the square can own, and the real phenomenon». Integration found the Column already casting,
   healthy, deep in the frustum — yet the stripe faint (box mean 20.65) and the S0b rake absent,
   while the same caster at x = −40 painted BOTH bold (diff 87,291 px ≥ 24). Both ruled suspicions
   refuted by direct evidence: the polygon offset (factor 1.4→0.2 / units→1 restored nothing, mean
   0.092–0.103/px) and the caster/fit class. Brief 3 (astra) ordered ONE bounded texel-level debug
   round, branches pre-ruled B1–B5, with the physics correction: the south facade's N·L at dec is
   cos 6.6° ≈ 0.99, not sin — «the blade MUST read bold; the faint 20-unit stripe is not physical».
   The grid T1–T6, none skipped (probes/p1-diag/): T1 fence-off → 0 px change; T2 the 24 kit
   InstancedMeshes off → lane unchanged; T3 column z→240 → no onset; T4 lateral x ∈ {−1…−40} → NO
   onset (the earlier «bold band at x=40» was the probe's own too-narrow column exclusion — the
   moved plinth's own pink pixels); T5 packed-depth read: the map's column silhouette complete
   (6,631 texels at depth 907), the lane receivers clean — the shadow test passes; T6 raycast: the
   receivers are the unnamed PalaceMassing ground (receiveShadow true; transparent true never
   unset — a latent wart). B5 fired (map complete AND receiver clean): the
   ROOT CAUSE = the capture-timing artifact — the probe shot at kit-ready + 300 ms,
   mid-massing-fade (opacity ≈ 0.5, the fade 600 ms), while the x = −40 reference was settled; the
   blade and the lane existed in settled renders all along. Brief 4 (astra) closed P1
   at ZERO product edits — the acceptance lines: the S0 blade «a hard ~14 px (≈3–3.5 m) vertical
   valley at sRGB 94–110 against the wall's 130–164», the lane ~15 units at every x = the ruled
   fence-tie class; throat-darkness withdrawn: «the blade should read as sun cut from a warm wall;
   the throat's 40–48 should read as enclosure. Lowering the fill floor would darken other open
   shadows to erase that distinction»; S0b's occlusion is geometry (the pedestal/fence between
   camera and lane).
5. **The review pass** (brief 5 → astra-6.2, fresh thread, score 7/10): 6 findings — 4 fixed,
   1 procedure, 1 declined, zero disagreements (round-1/FINDINGS.md). The calibration (R1, breaks):
   the tilt to the field sup (item 3). The look-probe waits (R2, breaks): the exterior look probes
   (sq-accept-gate, sq-shadow-toggle, sq-census-capture plates) re-waitered to the settled 1500 ms
   class per the capture law; the goldens stay historical/self-consistent — no re-baseline, no
   census-count change. The device procedure (R3): the sitting pins q=t0 for the paired captures
   — no code change. The exact identity (R4): the branchless select. The test tolerance (R6):
   explicit absolute-error assertions ≤ 0.01 at the ruled targets (toBeCloseTo(x, 2) was ±0.005).
   The declined (R5, the snowy-night guarantee):
   «the code's guarantee is scoped to uSnow = 0; the snowy-night hemi shift was declared ≈ 0.1 %
   sub-threshold in the round's report and the dec-night golden held 17/17 — the guarantee the
   reviewer narrows is not made by the code». The fixes landed one batch → the gates re-run (commit
   f4082c7).

## The capture law (the owner-facing rule, brief 4 → the review's R2 fix)

- Look-evidence captures wait for the massing fade — ≥ 600 ms from fade start or opacity == 1 — on
  BOTH sides of every comparison: «a before/after pair can therefore measure an opacity difference
  as a lighting difference» (the review's R2).
- The implemented class: the exterior look probes wait the settled 1500 ms (sq-accept-gate,
  sq-shadow-toggle, sq-census-capture plates), citing the law; probe-only, 0 B shipped JS.
- The goldens stay historical/self-consistent by ruling (the creative's ruling 4 + the reviewer's
  fix line); no shipped timer, no blanket change to the room/offline readers.
- The provenance: every look capture this session and last shot mid-fade at kit-ready + 300 ms.

## The gates at the close (sq-fix-improve @ f4082c7, the branch)

- Validate GREEN (typecheck, biome, build, records-check; 1306 passed/2 skipped → 1310 after the
  pin tests).
- The census 15/15 — the counts unchanged through the shader edits (draws 75–86 ≤ 96, tris
  111,834–115,630 ≤ 120,000).
- The goldens 17/17 ×3 runs, NO re-baseline (the dec rows may flip on the doubled tilt — they did
  not; DEC-056's dec-row price realized as none).
- Budget JS 292,084/350,000 (+277 over the 291,807 rg-next baseline; 291,854 → 292,071 → 292,084
  across the three commits). RU +0. Payloads ±0.
- The mid-run note: the census and goldens ran under co-tenant video load — the owner accepted; the
  counts are deterministic.

## The sitting (PENDING — the owner's eye, the morning after)

- The page: the vault sitting/ folder (to be built).
- The acceptance lines (brief 4's ruling): S0 — «a hard vertical blade runs unbroken from ground to
  pavilion head, sRGB 94–110 against warm wall at 130–164, about 14 px wide in the reference capture
  (≈3–3.5 m)»; Sh — «the north-running lane reads continuously on exposed ground at roughly 15
  units of contrast against adjacent lit ground — the fence-tie class, without acne or dirt»;
  «Judge ground pixels, not plinth or fence pixels»; S0b remains a pedestal pause — «its occlusion
  is not a lane failure».
- The same S0 → Sh sitting on Mac and iPhone: «Judge the same blade and lane on iPhone, not a fixed
  count of device pixels».
- The iPhone boots pinned q=t0 for the paired capture (the settled 0.1/0.5 readout recorded) +
  the ordinary auto boot checked separately (the review's R3 procedure).
- The settled captures per the capture law, both sides of every pair.
- The t0 device check rides the same sitting (brief 2's packet): «no acne/dirt returns on the facade
  fields (t0 0.1/0.5 stays); the dec stripe survives t0's 2048 map».

## The iPhone verdict (2026-11-27, the sitting) — IMG_0059, the settled live app

The owner's words, verbatim: «for iphone 11 it is still not good. but it is better.» The t0 device ruling (shadowNormalBias 0.1 / shadowRadius 0.5) validated directionally on the real device; the close-up residue is the recorded device-backend class (the A13/Safari TBDR shadow-pass + the dprCap-1 canvas stretched ~2× on the 828-px screen). The owner's weight: «i guess it is not critical». The parked lever: the t0 dprCap revisit (1 → 2 — the §11 fit bounds the buffer at ≈ 786k px ≈ 3× today's fill on the A13; the frame budget is UNMEASURED on the device; the brief-1 ruling declined this trade once for the fill budget). The path if the eye wants more: a measured experiment first (the dprCap 2.0 build on the device + the Mac Safari → Develop frame timing), the creative rules with the trade in view. F8 closes with this verdict; the residue is a parked candidate, not an open Owed item (the owner: not critical).

## Parked / the successor list

- The T6 wart: the massing's `transparent: true` never unset at settle (only opacity is driven) —
  transparent-queue rendering at opacity 1 (probes/p1-debug-report.md, T6).
- The cornice-band F6 round: «Physically the dec facade should be banded under every cornice and
  sill (a 1 m projection casts ~8.6 m down at 6.6°)» — a deliberate round with its own acceptance
  (june grazing acne-free); the 1.4/4 offset stays suppressed for P1 (brief 3, item 5).
- The candidates (brief 2, one line each, not spec'd): the autumn left-bay streaks → test the depth
  polygonOffset factor 1.4 → 2.0 if they survive the sitting · the panes as glass (roughness 1 →
  0.25 + the sky PMREM env) so the windows stop reading as holes · the mid-square light band's
  crisp edge → a paving.ts round.
- R5 the arch tunnels (sq-shadow-dirt's deferral): unmoved.

## The coordination

- The merge: the owner's ticket decision 2026-11-27 — merge tonight per the merge-queue ticket, the
  full gate per the last-merge law (SIGNALS.md: the last ticket in a merge queue runs the full
  gate; «Unsure -> run the full gate (a redundant gate is cheap, a skipped one is not)»).
- The queue: `turns/merge-hermitage-3d/` holds the open ticket 1-hermitage-3d; this lane's mailbox
  identity is sq-fix-improve.
- The other agent on main: main moved during the round — rg-improve merged first of three (d80feee,
  «the FULL gate runs by the last merging session») and the st-george lane's steps landed (the
  wiring 9ed9db2, the plates 380cc5a, the bakes 5b12c3a); this lane's three commits ride the branch
  only.
