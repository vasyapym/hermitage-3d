# square-next round 2 — the HQ joins the palace's DAY laws: the hour albedo, the surrounds, the lip; the tone ruled; the junction rider
Opened 2026-11-21 · LANDED ON THE LANE 2026-11-22 (branch `square-next`, the same worktree; PARALLEL
— the owner's arrangement, the co-tenants per STATE.md/ROUNDS.md; the merge + the FULL e2e/golden
gate + the CI verdict + the DEC numbers ride the owner's signal — deferred NOT waived; the lane
carries rounds 1+2) · relay brief 3 (the find dossier, zero steering over the 13-frame exhibit
harvest — the owner attached the frames to the chat per their «let the creative model decide»)
+ the design reply (staged, one thread) + the owner sitting (the question tool, 2026-11-21: the
tone Q-row ADOPTED, the junction rider INCLUDED) + the orchestrator-direct batches B1–B5 · vault
`03_projects/hermitage-3d-2026-11-21-square-next`
## Ask
Phase 4 Palace Square — the room's second round, opened PARALLEL on the same lane: the facts-only
find relay (zero steering; the dossier = the post-round-1 state, the 13-frame day battery as
exhibits) → the picked work's design → the implementation. The find's pick: rank 1 — the HQ's
DAY read (the unmade day twin of round 1): (a) the 124 quads printed the NIGHT law's tone
(PANE_BASE_TONE = DARK_PANE_TONE) on the sunlit face at day — two buildings, two day-window
laws; (b) the flat proud cards, no surround (the sticker half of the IMG_4707 sighting closed
only at night); (c) the body rode the palace's own massing material; (d) the HQ cornice carried
no snow lip. Behind it: rank 2 el:gs-junction (the reserved draw), rank 3 the day census as a
number (folded into the pick's gates as the pane/wall probe), rank 4 the west flank (DEC-heavy,
deferred), rank 5 the lanterns (STRICTER, set aside). The lighting fact that bounded the design:
at both instrument noons the sun stands due south — the west face is grazing-plane lit; only
albedo contrast and geometry can move the day read.
## Relay shape — one line per stage that produced a surviving fact
brief 3 (the find dossier + the exhibits table): the ranked lacks + the pick + the two-stage
contract; the owner attached the 13 day frames to the chat.
reply 3 (stage 1, the pinpoint) + reply 4 (stage 2, the design draw): the three-half pick (the
window half = content on the existing dressing slot; the albedo half = shading via the
lattice's setNight, justification row J1; the snow half = procedural by the style law's own
list, J2) + the tone Q-row + the severable junction rider (J3 conditional) + the five-batch
staging; adopted by the orchestrator with THREE corrections recorded below.
T-sitting (the question tool, 2026-11-21): the tone ADOPTED (0xc4a86e + 'hq-massing'); the
rider INCLUDED — both per the design's recommendation.
B1+B2+B3 (orchestrator-direct, commit d1ad6d3's successor): the laws (DAY_PANE_TONE +
paneBaseTone + lerp3/clamp01 in night-facade.ts; HQ_SURROUND + the PROUD pair + hqSurroundRows
+ HQ_SURROUND_TRIS + HQ_NODE_TRIS + HQ_SNOW_LIP(+BAND) + HQ_TONE_HEX + GS_JUNCTION + the 6th
bind key in square-kit.ts) · the py (the surround loop, the pane re-set 0.04/0.02, the flip
law keyed on the authored open-quad list per R6, the slot-0 rename 'hq-massing', the
el:gs-junction object) · `pnpm kit:square` (2 nodes · 1,192 + 36 tris · payload 106,652; the
law gate 38/38 incl. the new twin pins) · night-lattice's setNight colour writes · the HQ lip
MERGED into the cap's morph geometry (appendHqLip: base seated in HQ_SNOW_LIP_BAND, target the
full strip; +12 tris, +0 draws) · main.ts (hqMassingMaterial + the fade write + the record's
'hq-massing' line).
B4 (orchestrator-direct, commit 2b840aa): validate (tsc 0 · biome clean · the square suites
94/94 · gallery 6/6 standalone) · the e2e square-kit 8/8 · the golden battery: ONE flip
(golden-s0b-dec-noon — re-baselined on the lane, deterministic on re-run; s0b-dec-night HELD) ·
the HUD probe both instants × 5 stops · the pane/wall quartile probe · the day battery + the
IMG_4707 vantage re-captured (the BEFORE re-built fresh at 3300123 — verified bit-identical to
the earlier read).
B5 (orchestrator-direct): the records (this file + the registers + the rows).
## Verdicts
### DEC-053 (assigned at the square-next merge, the wave's first slot) — the Guards Corps HQ joins the palace's DAY laws: the hour-driven unlit albedo paneBaseTone(wNight) (DAY_PANE_TONE at day, DARK_PANE_TONE bit-exact at w 1, carried by the lattice's own setNight); the 124 flat white surround quads on the existing dressing slot (the flat-surround illusion; the true recess stays rejected); the wSnow-gated snow lip on the HQ cornice (merged into the cap's morph); the owner's tone ruling (HQ_TONE_HEX 0xc0b36d — the eye's chain 2026-11-22: 0xc4a86e orange at night → 0xc6ba64 too prominent («a toy building») → 0xa3985d BROWN at darker times (the luminance drop crushed the chroma) → 0xc0b36d: the original's luminance restored, the saturation held −15%; + the 6th bind key 'hq-massing'); the el:gs-junction rider on the reserved 6th draw
THE HOUR LAW (night-facade.ts): paneBaseTone(wNight) = lerp3(DAY_PANE_TONE
[0.03, 0.034, 0.042], DARK_PANE_TONE, w) — endpoint-exact, clamped; the justification row J1:
the pane base albedo is per-frame hour behaviour and the lattice's setNight is its existing
carrier; Python holds no law. The no-checkerboard invariant extended: all three levels take
the SAME value at every w (the R1 class holds hour-wide). PANE_BASE_TONE kept (= DARK_PANE_TONE
by reference, now the w = 1 value).
THE SURROUND LAW (square-kit.ts + the py): HQ_SURROUND {side, head, sill = 0.3} widening
HQ_WINDOW_ROWS_Y (the derived rows clear the plinth top 0.6 and the тяга 8.85–9.15 — a test
derives them); the pane at 4 cm proud, the surround at 2 cm (the proven 2 cm separation class,
now pane↔surround); ONE white dressing quad per window — 944 → 1,192 tris (≤ 1,500), no new
primitive, kit draws stay 5 on the wall. The relief successor CLOSED as the flat-surround
illusion (the record's re-rank, executed: a true recess — 1,936 tris — still does not fit).
THE LIP (snow-cap.ts): the HQ cornice joins the ONE snow law by the style law's own list (J2)
— appendHqLip merges a 12-tri box strip into the cap's morph geometry: the base collapsed
strictly inside HQ_SNOW_LIP_BAND (the py's cornice-course pair 109.7…110.15, the seat
SNOW_SINK below the band's top), the target the full HQ_SNOW_LIP box (x 109.55…110.3, y
20.5→20.7, z the wall's span) — the wSnow gate and the morph ride the cap's own group/mesh:
+0 draws (the sibling-mesh fallback never needed), the DEC-033 ceiling 288 → 300 ≤ 1,000.
THE TONE (the owner's ruling, the artistic-license row): HQ_TONE_HEX 0xc0b36d — a muted yellow
ochre of the GS/HQ family, unsourced in-repo, declared (the eye's chain 2026-11-22: the original
0xc4a86e read orange at night; 0xc6ba64 read too prominent day+night, «a toy building»; 0xa3985d
read BROWN at darker times — the luminance drop crushed the chroma — the balance: the original's
luminance restored, the saturation held −15%); the 6th bind key 'hq-massing' binds slot 0 of
el:hq-east (and the junction) to a Lambert sibling of the massing material riding the same
fade; 'massing' stays admitted for future shared-massing nodes. THE HUE AMENDED per the
owner's eye 2026-11-22: the original red-leaning ochre 0xc4a86e (the T-sitting's value, above)
read ORANGE under the night's warm hemisphere — the owner ruled yellowish; the s0b golden pair
re-baselined scoped (both rows GREEN, the other six held), JS ±0. THE TONE AMENDED 2026-11-23
per the owner's steer: +5 % yellow — 0xc0b36d → 0xc0bc6d (the G raised; the night hue off the
gold/brown axis); the s0b golden pair re-baselined scoped — the re-baseline found NO drift (0
rewrites: the rendered delta under the t=0.1 detector — the DEC-048 precedent), the confirm 2/2
green, JS ±0.
THE RIDER (el:gs-junction, the owner's ruling): the General Staff junction's massing at the
wall's south end — body + plinth + cornice courses on 'hq-massing', z 240→300 (where the S0b
max-right edge ray meets x 110, ≈ 296 — the void closes to the frame edge), 36 tris, ONE
primitive on the RESERVED 6th draw — kit draws 6/6 EXACT, no drawsMax DEC needed. Golden-neutral
by the record's bearing arithmetic (the committed S0b right edge hits z ≈ 216.7).
THE GOLDENS: ONE declared flip materialized — golden-s0b-dec-noon, the acceptance frame itself
(the thing being fixed; re-baselined on the lane, deterministic on a clean re-run). The design
declared TWO (the night twin's white surrounds ≈ 5 % of frame) — MEASURED HELD: the white
surrounds under the night hemisphere stayed sub-gate; the correction is recorded. The other six
held (incl. white-night — the design's 1 %-edge mid-w risk did not trip).
## Measured — every budget line as stated at each flip
B1+B2+B3: the square suites 94/94 · kit:square GREEN (the law gate 38/38 incl. the surround/twin
pins) · the census 2 nodes · el:hq-east 1,192 tris · el:gs-junction 36 · payload 106,652
(+23,892 of ≤ +45,000) · kit draws 6/6 EXACT.
B4: tsc 0 · biome clean · JS 287,989 (+448 of ≤ +600; the DEC-045 wiring remainder consumed,
the rest the reservation the owner ratifies at merge) · RU +0 · the square row 107,902/1,500,000 ·
the e2e square-kit 8/8 (3.7 min) · the golden battery 7/8 + the one re-baseline (6.0 min) ·
the deterministic re-run GREEN.
The FULL vitest ran under a saturated co-tenant machine (7,218 s): the 2 failures = the
snow-cap float32 pin (mine, fixed) + the gallery-arch-chart load timeouts (green standalone
6/6) — the load class, recorded; the quiet FULL battery rides the merge.
The probes: the HUD both instants × 5 stops — dec-night 46/41/39/38/37 draws · dec-noon
43/38/36/35/34 · tris ≤ 54,377 ≤ 75,000 · all ≤ 56 (the per-stop spread re-appeared with the
two-node kit; round 1's uniform 46 recorded as the single-node read). The pane/wall quartile
probe at S0b dec-noon (the wall band, the darkest quartile vs the brightest half): BEFORE
0.461 / AFTER 0.226 — the ≤ 0.35 target met (the BEFORE verified bit-identical from a fresh
3300123 build; the instrument is the design's, recorded — not a CI gate).
## Hunt / found / fixed
Found: the design's two-flip prediction measured ONE — the night twin held (the white
surrounds sub-gate); the correction recorded in the golden row's comment.
Found: the whole-frame draws now VARY per stop (the design's «+4 uniform, S1 culled» and the
round-1 uniform 46 both superseded by the two-node measurement) — recorded per stop.
Found: the column.test.ts shadow-fit pin still counted 7 golden rows after round 1's B4 added
the eighth — the round-1 miss caught by this round's full vitest; fixed 7→8 with the row named.
Found: the float32 corner pin — the Set-membership test failed on 109.55000305175781 (the
manifest's own AABB carries the same rounding); fixed to the 1e-3 tolerance with the note.
Fixed-by-construction: R6 (the flip law) — the py flips the authored open-quad list, never
material_index ≥ 2 (the dressing slot carries open quads now); the vitest pin asserts both.
Fixed-by-tooling: the probe's Playwright one-arg evaluate (the second argument was silently
dropped — the region travelled inside one object).
## Gates — passed · deferred-not-waived → who carries · owed
Passed (the lane's targeted battery): tsc 0 · biome clean · the square suites 94/94 · gallery
6/6 standalone · build · budget · pnpm kit:square (the census + the law gate 38/38) · the e2e
square-kit 8/8 · the golden battery with exactly the one declared flip + the deterministic
re-run · the HUD probe · the pane/wall probe · the before/after packet.
Deferred, NOT waived → the merge session (the owner's signal) carries: the FULL e2e/golden
battery (quiet + mains per the law) + the CI verdict + the DEC numbers (rounds 1+2) + the
records reconciliation with the co-tenant lanes + the reservation row's release.
Owed (successors, recorded): the day-look census — the instrument battery exists (13 frames ×
2 rounds) and the pane/wall probe makes the day verdict measurable; its own ranking is a later
find's · the west flank + the Admiralty/south massings (DEC-heavy: five S0 goldens flip; the
Alexander Garden's trees read) · the candelabra/lanterns (the gate closed STRICTER; an
exception row needed) · the doorway residual parked (unchanged).
## Mentioned elsewhere
ARCHIVE-APPEND 2026-11-22 — the review pass (brief 5, the lane's cumulative review; the reply in
the vault's round-1/replies/; the ledger round-1/FINDINGS.md; score 8/10): five findings fixed,
one declined. (1) the HQ lip's draw gate — the lip's 36 indices at the END of the cap's index
array, `setHqLipVisible(false)` the default, the mount's `onReady` hook flips it on: a slow or
failed GLB never floats a snow strip over bare field (the additive law extended to the
palace-side lip; the palace tris render unchanged in the same draw). (2) the pane stocks ride
the presentation fade — `night-lattice.setFade(opacity)` from applyPresentation (the HQ's
emissive quads AND the pre-existing dark-card mismatch fade with the wall; the identity at
settle — det=1 never sees a partial state). (3) the junction's winding — CONFIRMED with the
mechanism corrected: box() winds from the argument order and the rider's jbm shipped without
the recalc; four of six faces were inverted (the north/south/top/east), NOT the west face the
reviewer named (the descending-y argument order happens to wind the west face outward) —
`recalc_face_normals` added before to_mesh; the chain rebuilt. (4) the snow-cap corner test
bounded on all three axes. (5) `color: HQ_TONE_HEX` (one value, one place). Declined: the
per-level paneBaseTone allocation (nicer; no defect per the reviewer). The gates after the
fixes: the FULL vitest 68 files 1232 passed/2 skipped · validate complete · e2e square-kit 8/8 ·
the golden battery 8/8 (zero flips — the fixes are settled-identity; the first battery's
golden-noon death classified the storm class by the error context — the 90 s settle timeout
under the co-tenant's bake — GREEN on the single-row re-run per the one-re-run law) · JS +132 →
288,121 (the round-2 cumulative +580 of the declared ≤ +600 — the reservation holds unamended).
The day strip question closed by measurement: the post-fix day drag capture shows a darker band
at the junction's top — identified as the junction's NORTH end-grain wedge (the occlusion-
bounded sliver beside the wall's west edge; a real building reads the same at this angle) —
not a defect; the winding fix verified by the night capture (the clean massing continuation).
The evidence packet re-captured on the fixed build (the same filenames in the vault captures/).

The evidence packet: `packet2.html` in the vault session folder (the day before/after with the
lum numbers; the junction's night vantage; the measured tables) — served locally for the
owner's eye; the captures are local-only scratch (never staged).
The co-tenant lanes' record-conflict surface: docs/STATE.md, docs/briefs/ROUNDS.md,
docs/budget-ledger.md, docs/artistic-license.md, ROADMAP.md — line-level, the integrator
reconciles at the merge.
The round-1 review relay (brief 2) is still outstanding with the owner — the merge session's
review pass covers the lane cumulatively (rounds 1+2 as they then stand).
(none at creation; the orchestrator appends via ARCHIVE-APPEND)
## Sources — file · entity · line range @ the lane's commits (3300123…2b840aa)
src/world/night-facade.ts · DAY_PANE_TONE + paneBaseTone · 67-95
src/world/square-kit.ts · the 6th key + the day-read constants + the lip/band + the rider · 43-234
src/procedural/night-lattice.ts · the setNight colour writes · the setNight body
src/procedural/snow-cap.ts · appendHqLip + the call site · 271-377
tools/square-kit/build_square_kit.py · the surrounds + the flip list + the junction · the C1 block
src/main.ts · hqMassingMaterial + the fade write + the record line · 628-636
tests/snow-cap.test.ts · the merged-lip pins · whole
tests/square-kit.test.ts · the six keys + the day-read laws + the two-node manifest · describe 1/6/7
tests/column.test.ts · the shadow-fit row census 7→8 · 317-336

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6; the row spans rounds 1+2 — the round-1 trail lives in docs/archive/2026-11-21-squarenext.md):
| **square-next** | the Palace Square lane (PARALLEL, worktree branch `square-next` off c05a451; the merge + the FULL gate + the DEC numbers ride the owner's signal) — round 1 (the HQ night lattice) LANDED with measured JS +14, kit payload +2,128, kit draws 5/6; round 2 (the HQ's day read: the hour-driven pane albedo, the flat white surrounds on the existing dressing slot, the wSnow-gated HQ cornice lip; the owner ruled the HQ tone Q-row ADOPTED — HQ_TONE_HEX 0xc0b36d (the eye's chain: orange at night → too prominent → too dark/brown at darker times → the original's luminance restored, the saturation held −15%) + the 6th bind key 'hq-massing' on slot 0 — and the el:gs-junction rider INCLUDED on the reserved 6th draw) · declared allowance (round 2): JS ≤ +600 B gz (the DEC-045 SQUARE_JS_WIRING_ALLOW remainder ≈ 491 B first, the rest a reservation the owner ratifies at merge) · RU ±0 · kit payload ≤ +45,000 B (cumulative ≤ +48,000; the KIT row 83,710/1,500,000) · kit tris 944 → 1,192 (+36 junction) ≤ 18,000 · kit draws 5 → 6 of drawsMax 6 EXACT (the reserved slot consumed; no drawsMax DEC) · whole-frame ≤ 56 / 75,000 · TEX_VRAM ±0 | MERGED at the wave's first slot (the ff to main) — SPENT and RELEASED; the measured shape: round 1 JS +14 · round 2 JS +448 → cumulative +462, then the review fixes +132 → **the lane total +580 of the declared ≤ +1,112 (512+600)** · RU +0 · the KIT row 107,902/1,500,000 (2 nodes: 1,192 + 36 tris; kit draws 6/6 EXACT) · DEC-052 + DEC-053 assigned here; the FULL e2e/golden gate + the CI verdict ride the LAST merging session (deferred NOT waived) |
