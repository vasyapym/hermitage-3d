# square-entry-ground — the Palace Square's two observations: the mobile portrait witness and the paving/footprint ground
Opened 2026-11-07 (PARALLEL, branch off e09c667) · Landed 2026-11-07/08 · Merged 2026-11-08 (merge sha n/r; the branch pre-merged main 8eaf4ce) · slot 2/3 of the three-session stack · briefs 18–19 (+ optional Sol review brief 20, composed, not run) · vault projects v11 · DEC-ids: none owned by this unit (DEC-040/DEC-041 numbered at the integrating act)
## Ask
The owner's two Palace Square observations. The lane worked BESIDE the in-flight agents; MERGE + the FULL e2e/golden gate rode the OWNER's stack signal, not this lane.

Mobile-only: the boot view must partly capture the Alexander Column (a corner or ~1/3 of the frame) so users learn it exists. The desktop starting view stays byte-identical (the five S0 goldens + golden-s1-noon).
The square ground «reads as a vacuum» — a ground/ground-elements round, ZERO STEERING (the specialist decides the elements). Parked prior art on the record: R12's no-noise re-argument, the plowed-bank R13 candidate, DEC-038's lantern successor, the ROADMAP lampposts checkbox.

## Relay shape

Capture battery (local probes/sq-entry-shots/, 8 PNGs + reads.md, not committed; vault copies projects v11/sq-entry-captures/). The relay is TEXT-ONLY (the specialist channel cannot take images), so frames travel as numeric reads + fixed-law luminance grids (§1.8 + APPENDIX Q of the brief).
Stage 1, brief 18 — the observation-1 draw ADOPTED verbatim: the pure camera law src/camera/portrait-frame.ts (aspect-keyed, identity-by-reference for aspect ≥ 0.8657, yaw-only re-aim δ ≤ 12°, the arrival law camera-blind).
Stages 2–5, brief 19 (vault projects v11/19-…-ground-census.md, self-contained per the Fable fresh-session law):

census A/B/C adopted as ONE surface law;
D deferred; E/F/J successors; G deferred;
H not-modelled; I owner-flag; K charter;
implementation via its file batches OR orchestrator-direct by pinned tests (its choice); both implementation batches landed.
The reply's tail was cut at «Integration check for the orchestrator:»; the orchestrator's own integration substituted for it.


Relay decisions adopted with the salvage corrections:

(a) the Stage-1 fence band: 12.1°–39.5° right of gaze (the brief's own 9.0°–29.0° arithmetic was wrong);
(b) the #caption 0×0 struck as by-design (DEC-036 V2);
(c) the travel-hint «MUST paint on every width» ruling STRUCK (the ≤767.98 display:none is a committed owner-verdict rule in style.css with its own register note — no hint change lands);
(d) the round's own stop=s0 lowercase slip corrected at re-shoot (the real token S0; the seed's fall-through was geometry-identical anyway);
(e) the brief-18 base battery's landscape read corrected on evidence (the shaft reads x ≈69–77 %, not the logged 54.7–57.5 %);
the look-right +35° frame is a battery gap.



## Verdicts
No DEC head in this batch's excerpt; none restated.

DEC-040 — the portrait witness:

mobile-only boot re-aim; identity-by-reference at aspect ≥ 0.8657; yaw-only δ ≤ 12°;
the five S0 desktop goldens + golden-s1-noon untouched BY CONSTRUCTION;
COLUMN_WITNESS_FRACTION 1/3, S0_YAW_DELTA_MAX_DEG 12, WITNESS_ASPECT 0.8657 (identity-by-reference);
CAMERA_VFOV_DEG is the one FOV source;
squareRailForAspect returns SQUARE_RAIL ITSELF for aspect ≥ 0.8657 (δ = 0); Sh/S1 are the committed objects by reference;
eye/pitch preserved, subject′ range 231.2488 pinned.


DEC-041 — the paving/footprint:

the sourced 1977 diabase sett field + the analytic light-granite band grid + the declared 220×238 footprint + surround, inside the ONE snow-hook shader term;
the plane 600→2000;
0 draws / 0 tris / 0 texture bytes by construction;
the June S0 goldens' ground pixels move → the re-baseline request R-ground-1 is parked for the merge.


Paving constants, GLSL twin 1217 chars:

sett 0.12 / joints 0.012 / body 1.060445 / mottle 3.5·0.10 / bands 20×0.6, tone [3.6,3.5,3.3];
bands anchored on the Column's cell (the fence ±8.25 inside, 1.75 m to a band);
footprint −110..110 × 92..330; edge soft 0.6 / surround 0.8 / plane 600→2000;
pvCover fwidth analytic AA + Nyquist fades + mod-1024 wrap; the FIRST repo fwidth — ESSL3-safe.


The composition is one hook inside src/procedural/ground-snow.ts: the paving call BEFORE the snow mix. Cache key Ground/snow-slot@1|Ground/paving-slot@1; the wSnow=0 IEEE identity + wSnow=1 full-cover unchanged by construction.

### DEC-040 — Palace Square portrait witness — the boot subject is a pure function of (committed S0, viewport aspect)

The law (CREATIVE, adopted verbatim): src/camera/portrait-frame.ts, pure.

Frames whose horizontal half-FOV at S0 cannot reach the Column get a boot SUBJECT re-aimed by the shortfall (yaw only, live on resize; the arrival law camera-blind).
The host feeds samplePose a derived rail via squareRailForAspect.
Identity BY REFERENCE for every aspect ≥ WITNESS_ASPECT 0.8657 (all desktop goldens, landscape phones) → zero committed-golden consequence.
Else δ = clamp(witness 24.2577° − halfHFOV, 0, 12).
The declared share COLUMN_WITNESS_FRACTION = 1/3 of the shaft's base width; S0_YAW_DELTA_MAX_DEG = 12 bounds the S0→Sh glide swing.
Sh/S1/look rows/captions/ids untouched; eye/pitch unchanged; ?cam=/?stop= seeds unaffected.


Owner declarations carried: the 1/3 share; the 12° clamp.
Test pins:

The aspect table: 1280/720, 844/390, 1, 0.9, 0.8657 → δ 0 + squareRailForAspect toBe(SQUARE_RAIL).
768/1024 → 2.926; 320/568 → 7.915; 360/744 → 10.122, subject′ ≈ (40.05, 11, 7.80); 390/844 → 10.734; 0.3 → 12 clamped.
The purity fence, and the anti-copy scan (no 190/1.83/−24/230 literals).


Rejected:

A boot look offset (user offsets persist re-clamped through Sh/S1).
A width/pointer-gated second rail (a step gate fails portrait tablets at 0.75 and narrow desktop windows, and keys the frame on an input capability, not what it can show).
Moving S0 (DEC-037's own REJECTED row).
A pitch component (moves the horizon and the facade band on every portrait frame).
Widening the FOV in portrait (a global-look change for a local framing problem).


SALVAGE CORRECTION of the reply's §4:

The travel-hint «MUST paint at S0 on every width» ruling is STRUCK.
The ≤767.98 #travel-hint { display: none } is a committed owner-verdict rule with its own register note in style.css («the dismissal state machine still runs — it just has nothing to fade»).
So the m-real-boot 0×0 read is BY DESIGN, exactly like DEC-036 V2's caption slot.
No hint change lands; no pixel-hint e2e row is written.

### DEC-041 — Palace Square paving term + footprint — the ground reads the sourced 1977 diabase sett field with an analytic light-granite band grid, wear mottle and a declared footprint edge

The owner ask: the square ground «reads as a vacuum» — zero texture at any scale on 44–56 % of the frame, no extent cue on three open sides, empty flanks.

THE CENSUS (CREATIVE, enumerate-first per its own §0):

ADOPTED as ONE surface term: A the sett field (SOURCED: the wiki's 1977 diabase re-laying); B the light-granite band grid (READINGS: aerial photographs); C the footprint/surround (footprint SOURCED ≈5.4 ha; edges DECLARED).
D the column stylobate DEFERRED (successor; sourcing pending).
E lanterns SUCCESSOR (count sourced for the 1977 corners only; form/height absent everywhere).
F flanking massings SUCCESSOR (architecture, not ground; the Guards Corps HQ east first — what the look-right frame misses).
G the facade pavement strip DEFERRED (sub-pixel from S0, ≈9 px at S1).
H bollards/chains/drains/the fence enclosure floor NOT MODELLED (not in the source).
I the snow legibility at wSnow=1 (dec-noon reads mid-grey; the brightness bound is the hemi SKY core): OWNER FLAG — outside the ground fence (sky palette/exposure must-not-touch).
J the wet-sett sheen SUCCESSOR (leaves Lambert; lighting goldens).
K people/vehicles = charter non-goal.


THE LAW (one term, one slot):

src/world/paving.ts pure ↔ src/procedural/ground-paving.ts (the GLSL twin; interpolates the constants, restates none) ↔ tests/paving.test.ts.
The slot Ground/paving-slot@1 composes INSIDE the existing ground-snow compile hook (one hook, one material; customProgramCacheKey <snow@1>|<paving@1>).
The paving call runs BEFORE the snow mix: the snow slot sees a paved base, and its wSnow=0 IEEE identity and wSnow=1 full-cover are unchanged by construction → the committed winter field pixels are untouched.
Only the June goldens' ground pixels move → the re-baseline request R-ground-1 is parked for the stack finale.


Constants:

PAVING_SETT_M 0.12; PAVING_JOINT_M 0.012 (joint area 0.19); PAVING_JOINT_TONE 0.7; PAVING_SETT_TONE_AMP 0.18.
PAVING_BODY_TONE 1.060445 (the cell mean equals the base exactly — no tonal step with distance).
PAVING_MOTTLE_M 3.5 / 0.10.
PAVING_BAND_PERIOD_M 20 / WIDTH 0.6 / TONE [3.6,3.5,3.3] (band area ≈5.9 % → mean +≈15 % linear, declared).
PAVING_BAND_ANCHOR (COLUMN_X+10, COLUMN_Z+10) (the Column axis a cell centre; the fence's ±8.25 inside one cell with 1.75 m to the nearest band).
SQUARE_FOOTPRINT x −110..110 / z 92..330 (220 × 238 m ≈ 5.2 ha against the sourced 5.4).
PAVING_EDGE_SOFT_M 0.6; PAVING_SURROUND_TONE 0.8.
The ground plane 600→2000 m (the sky dome is a fullscreen NDC trick — no finite radius to collide; the committed shadow box untouched).
PAVING_SOURCE 'wiki-ru'.


Antialiasing law: bands/joints by pixel-footprint coverage (fwidth — the FIRST repo use; safe: three r186's WebGL2 pipeline compiles ESSL3 where derivatives are core); hashes by a Nyquist fade to the mean; hash inputs wrap mod 1024 (period ≈123 m).
Tooling riding this DEC: the capture battery's det-only look injection ?look=<yawDeg>,<pitchDeg>.

It is parsed only with det=1 and clamped by the stop's own look row.
It is applied at THREE host sites: after the boot seed; inside onLangChange after seedRail; at the hashchange re-parse under the explicit transit === null gate.
The language-activation re-seed case was found by the round's own capture battery.

Budget: the measured integration +1,525 B gz (the implementation +1,493 + the capture battery's boot-look race fix +32 — d608012) of the declared +2,000 reservation.
The June-asphalt ledger record (rgb(64,66,68)) re-samples at the stack finale (expected ≈ +15 % linear from the bands).

## Measured

At the branch (opening): the S0 portrait frame (360×744) drops the Column entirely (fence sliver ≈1.2 % of width at the right edge). The DERIVED S0 gaze→column bearing is ≈25.0° vs the 14.14° portrait half-FOV. Landscape 844×390 shows it whole; desktop 1280 shows shaft+pedestal right-of-center.
Branch gates (2026-11-07/08): JS 284,039 of 350,000 = +1,525 B gz over the 282,514 base (inside the declared +2,000; the conditional +600 ask retired; headroom to the proposed 285,707 ceiling 1,668). RU 7,332 (+0). Exterior payload 0. Basis 584,862 untouched. budget.mjs all ok. 0 draws / 0 tris / 0 texture bytes by construction (whole-frame square probe rows 37/52,413 · 41/53,173 unchanged by construction; re-measure at the stack finale).
Merged union (2026-11-08): JS 284,041 of 350,000 (+2 = the arrows-face-tune constants; +1,527 over main's pre-merge 282,514) · RU 7,332 · vitest 64 files 1052 passed / 1 skipped / 0 failed · tsc 0 · biome clean · payloads/basis ok.
Capture verdicts (§3.5 battery): the law's claimed frame contents are CONFIRMED except TWO Stage-3-sheet forecast slips (forecast arithmetic, not code):

the gate anchor measured ≈17 % vs the declared ≈12–15;
the portrait fence onset measured 57 % vs the declared 36.


Re-verified cells:

the boot-witness re-shoot shaft strip 93.9–99.4 % off the top (declared 94.5–100 ✓);
the m-col centred axis ≈49.5–50 (the law 49.61 ✓);
l-right: the whole Column left-of-centre + the bounded eastern void ✓;
d-right: gate centre ≈16.6–18.4 with onset 12.8 ✓;
the east footprint edge entering right and receding toward the facade ✓.


Pin table (IEEE-exact): 21.326931 / 2.930835 / 16.345211 / 7.912555 / 14.137971 / 10.119795 / 13.525330 / 10.732436 / subject 40.0392. The Stage-4 draft's rounded pins were corrected at integration.
THE WINTER FACT (OWNER FLAG, class I): in EVERY winter look-right frame the fresh-vs-trampled lane contrast never reaches a visible tone (flat ≈86/255 outside the low-sun fan; the band grid correctly GONE under the cover). The lane legibility is an encode/sky-bound matter, not a ground-slot one.

## Hunt / found / fixed

THE CAPTURE BATTERY'S OWN FIND (the one defect the deterministic gates could not see): the boot ?look= injection died with the async language activation's seedRail re-seed. A RU boot re-seeds the square, so the look was zeroed before the first frame. Verified on the built dist: the frame never turned and #touch-rail[data-look] stuck at {"yaw":0,"pitch":0}, while the hashchange re-parse path re-applied fine.
FIXED d608012: one host helper applyInjectedLook() (guard: requestedLook null ∨ non-det ∨ railNode ∉ square) at three sites — after the boot seed, inside onLangChange right after seedRail, and at the hashchange re-parse under the explicit transit === null gate. seedState (the pure law) and the i18n activation flow are untouched.
VERIFIED by re-shoot: 7/7 declared frames byte-IDENTICAL (md5 exact) to their hashchange-reapplied twins; the ledgers live ({"yaw":35} / {"yaw":15}).

Code landed (5fb69bf + the find-fixed d608012, 10 files; records db53827; ledger 91026ca)

src/camera/portrait-frame.ts (the pure witness law).
src/camera/look-param.ts (the det-only ?look= parser, the ?cam= contract family).
src/world/paving.ts ↔ src/procedural/ground-paving.ts (the GLSL twin).
src/procedural/ground-snow.ts (the one-hook composition).
main.ts W1–W5: railForViewport for EVERY square rail assignment incl. boot + the applyViewport re-derivation; degenerate w/h → aspect 1 = SQUARE_RAIL itself.
tests/portrait-frame.test.ts: the pin table; identity toBe(SQUARE_RAIL); purity + the anti-copy scan.
tests/paving.test.ts: constants/geometry/footprint pins; the GLSL literal pins incl. the 10.0×4 count; the 1,400 length ceiling; purity; the footprint toEqual.
The compound-cache-key pin; the rail purity glob 6→8.
Records: the register/ATTRIBUTIONS/ROADMAP edits landed (db53827); the ledger moved (91026ca).

## Gates — passed · deferred-not-waived → who carries · owed

Branch: tsc 0; biome clean (touched files); vitest 64 files, 1052 passed / 1 skipped / 0 failed; budgets ok; 7/7 declared look frames byte-identical to their hashchange twins.
Merge (2026-11-08, the slot 2/3 SOLO merge): the branch pre-merged main (8eaf4ce — the ROUNDS table conflict resolved by keeping both slots' rows). The deterministic battery re-ran on the union. DEC-040/DEC-041 numbered at the integrating act; the ledger row SPENT and RELEASED.
The owner merged WITHOUT the Sol review brief 20 (composed, optional).
Deferred-not-waived → the LAST merging session carries: the FULL e2e/golden gate + the R-ground-1 June S0 re-baselines + the whole-frame re-measure.
Successors named (ROADMAP): stylobate / lanterns / massings / strip / sheen. Class-I OWNER FLAG: the winter lane legibility (above).

## Mentioned elsewhere

None at the pin. The class-I winter-lane fact fed the square-palace round (own archive).

## Sources

docs/briefs/ROUNDS.md · round 11 · line 11 (6368 B) @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
docs/STATE.md · bullet «2026-11-08 · MERGED square-entry-ground» · line 10 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
docs/STATE.md · bullet «2026-11-07 · PARALLEL square-entry-ground OPENED» · line 11 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
