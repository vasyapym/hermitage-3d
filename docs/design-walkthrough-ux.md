# Design — the walkthrough UX pass («compose the seams»)

Status: direction adopted from the relay reply (2026-10-22, zero-steering dossier
`docs/briefs/walkthrough-ux-dossier.md`), near-wholesale with the orchestrator's
verification deltas; **owner dispositions D1–D8 pending.** No code yet; the
implementation plan is §12. Provenance labels: **verified** (checked against the
committed tree/captures this session) · **reply** (the specialist's decision text,
adopted as written) · **declared** (a number to re-declare at implementation).

The thesis (the reply's, adopted): every one of the four owner complaints is the same
defect seen from four sides — **the frames that matter most (the door, the arrival, the
pause, the climb) are the frames nobody composed.** Stops are composed and
golden-pinned; everything between and across them is interpolation or a default. The
direction is to compose the seams: light at a threshold is the invitation, dark at a
threshold is the pause, a subject the camera keeps looking at is the intention. The
chrome stays nearly absent; two text lines change; no icons, no spinner.

---

## 1. Verified root causes (each observed complaint → mechanism → fact)

1. **The invitation is invisible or lies** (obs 1): the one-shot hint names DRAG
   («Потяните, чтобы подойти ближе») while drag only rotates — the first wheel event
   dismisses the hint, so the correct verb is never shown (verified: main.ts wheel
   handler calls `hintTravel()` first; rail drag → `lookTarget`). The bottom-centre
   prompt appears only when the glide has fully died at the exact rail end, is
   ~12 px ~55%-white text, says "Keep scrolling to enter" while being a click-button,
   and needs a sustained wheel pass (three thresholds) with **zero visible feedback**
   during the pass. After every arrival the same line shows «Keep scrolling to enter»
   in a room just entered (the boundary law is directional; verified in captures).
2. **The approach and the arch void are uncomposed** (obs 2): S1 stands ~6.5 m from
   the gate pavilion's columns (massing outer face z 93.5, S1 z 100); the arch
   openings are kit recesses with nothing modelled behind while the gallery is
   unmounted (verified: massing has no arch hole; the gallery GLB owns the passage).
   ~40% of the frame under luminance 10/255 in the day-instant capture; the caption
   says «the arch opens» while the frame shows a void.
3. **The pause is an empty slot** (obs 3): the transit is hold → hard cut. The hold
   is max(declared 1500 ms, load) and the frame freezes exactly (no pose advance, no
   dimming, no indication; the §2.3 choreography that was meant to occupy the hold
   never shipped; the §1.3 prefetch table never shipped). beginTransitTo → ensureRoom
   starts the whole chain serially at transit start (manifest → chunk → fetch →
   transcode → mount → compileAsync + PMREM), so an un-prefetched neighbour costs
   seconds on the owner's network. A frozen frame with dead inputs reads as a hang.
4. **The corridor's day state is the divergence, not the design** (obs 4a): the day
   bake's wall light is nearly absent in bytes (recorded bisect); the restore chain
   (manifest white points day 0.03 × gain 4 ≪ dusk 0.2 × 3) makes DAY the darkest
   state of the room. The committed day golden is ~99% black at G1; night reads
   brighter. The declared beat was «low, dim, long… differ little… timeless».
5. **The corridor path cuts its own corner** (obs 4 movement): G0's default gaze
   targets G1's position — the ray exits the arch passage through its east wall
   (verified: (0,86)→(24,73) crosses x=4 at z≈83.8, inside the passage
   z 63.5..87.5 — into unlit/unmodelled shell); the G0→G1 glide carries the camera
   through that same wall band for several metres. The L-turn passage→gallery axis
   has no stop (the end-phantoms adjudication leaves it uncomposed).
6. **The stair arrival stands inside a doorway box** (obs 4b): the destination
   portal is the declared under-stair vestibule; J0 (79, 1.7, −64) sits inside the
   vestibule box — verified against the build script: the vestibule spans x 78..84,
   z −68..−62, **height 3.0 m** (ceiling 1.3 m over the eye), door x 79.5..82.5
   (h 2.6) in its north face. The arrival gaze points at its interior wall; the
   back-prompt shares the first frame.
7. **The stair stop set does not touch the built stair at all** (obs 4c — the
   salvage's deepest find, deeper than the reply's chain): the committed stops carry
   the §6.1 DECLARED guesses; the built stair (r15 bpy, sourced) sits elsewhere
   entirely. Verified against `tools/bpy/jordan.py`:
   - Hall tract x 66..92, z −86..−62; the **north wall (z −86) is the Neva front —
     the window tiers**; small portholes on the south wall.
   - Flight 1 hugs the **west wall**: x band 66..67.6, runs z −68.12 → −79.0
     (climbs NORTH), y 0 → 5 (35 risers, rise 0.143, going 0.32, run 10.88).
   - Mezzanine lane: x 66..69.12, z −84.4..−79, **y 5**.
   - Flight 2 runs along the **north window wall**: z band −84.4..−82.8 (1.6 m clear
     of it), climbs EAST x 69.12 → 80, y 5 → 10.
   - First-floor landing slab: x 80..92, z −84.4..−64, **y 10**; chandelier over its
     centre (86, −74).
   - J1 (79, 5.2, −70), J2 (79, 6.7, −80), J3 (73, 9.7, −76), J4 (73, 11.7, −66) all
     hover mid-air away from flights/landing; J4 is WEST of the landing's west edge
     (x 80) and 6.7 m above the mezzanine. The camera path cuts the well void
     diagonally — the pull that the owner named «random flying». The gaze law
     (stop i → stop i+1's position, shortest arc) compounds it: gaze chases the
     camera's own future positions across two near-reversals per climb.
     RESOLVED (R18-ux verdict 2): the gaze no longer follows positions. It holds the
     destination's subject, so the climb's near-reversals no longer reach the look.
8. **G2 faces away from the door it stands at** (the pose law's «last stop looks
   back»): the corridor's east-door stop gazes into the gallery behind it, not at
   the door the visitor must push through (verified in rail.ts committedTarget).

---

## 2. The invitation (reply §2.1, adopted)

- PRIMARY: composed light. From the approach stop the doorway reads as a lit
  opening with depth (§3). A visitor walks toward light.
- The chrome line becomes a **door label** naming what lies through the door,
  sourced from the room `title` keys the contracts already carry and never render
  (the phase-2 "stored, not rendered" note ends): EN "Enter · Rastrelli Gallery" /
  RU «Войти · Галерея Растрелли»; at an entry stop facing back: EN "Back out ·
  Palace Square" / RU «Назад · Дворцовая площадь».
- Appearance law: the label is the door's answer to a push — it shows when settled
  at a rail end with an airlock AND (a push into the clamp in the door's direction
  OR a settle at the far end u=1). It never shows at an entry stop until a backward
  push. The prompt, the arrows and the pair all pass through the same law (the
  wheel-through's wording was retired with the wheel — the movement-ux amendment).
- Feedback (AMENDED, the movement-ux ruling): the lean feeds PRESS EDGES — a settled
  end's fresh press edge (the pair, the arrows) or the prompt's click stamps the host's
  pulse clock; the camera leans toward the portal at ONE declared magnitude
  (LEAN_MAX_M 0.35 m), springs back when the pulse goes stale, and the lean continues
  seamlessly into the departure glide (§4). (The wheel's budget-proportional readout
  is retired with the sustained-scroll pass.)
- The travel hint copy (AMENDED, the movement-ux ruling): EN "Press the arrow keys to
  walk · drag to look around" / RU «Нажимайте стрелки, чтобы идти · потяните, чтобы
  осмотреться» (the pair is self-evident wherever it shows; the copy needs only the
  keys). The travelHintTouch fork is unchanged. [declared; D1 + the amendment]
- Reduced motion: the lean is absent; the enter still fires.
- Keyboard stays silent chrome (nearly-absent). Touches: DEC-031 amended (copy,
  appearance law, feedback — an amendment, its minimap/sidebar rejection stands);
  the travel-hint inventory is owner-ruled → D1.

## 3. The gate composition (reply §2.2, adopted)

- S1 moves back so the gate pavilion composes as architecture; S1's gaze becomes an
  authored point inside the arch opening at about two-thirds of its height. Working
  range for the stop: z ≈ 118–125 [declared — framed by capture, not by number].
- A **resident throat**: procedural vault interior belonging to the square, from the
  facade plane inward, dark in its middle and lit at its far end by a warm slab —
  the corridor's lamp light promised through the arch (D2: warm vs cool). Few
  hundred triangles, vertex-shaded, no texture (no basis row, no boot-path cost);
  hidden the frame the gallery mounts (the gallery's true-coordinate passage
  replaces it at black). The throat is what «the arch opens» describes and the
  invitation itself.
- The throat's grading (2026-11-13 amendment): the sky-lit run darkens with depth as an
  authored occlusion whose e-fold is the passage's first third and whose floor is a tenth
  of the mouth — the stone never reaches black, a passage is read by its gradient, a tone
  without one is a wall. The lamp run carries the slab's warmth to the seam as a toe and
  rises to the slab's last-metre fall — the seam is cool stone crossing into warm light,
  never a step into black. The mouth keeps the kit's stone; the collar stays the recess
  dark — the ring's shadow line, never the body.
- Early-mounting the real gallery passage outdoors is rejected for now (couples
  the room's lightmap-only exposure to the sky, sun/hemi leak, extra draws).
- Touches: the S1 golden re-baselines (deliberate re-composition, recorded); new
  square-resident geometry → owner disposition D2.

## 4. The pause is a threshold (reply §2.3, adopted with verified deltas)

Verdicts on the standing decisions: the §2.3 doorway choreography was RIGHT in
intent, wrong in one detail (the camera must KEEP MOVING through a light-fade; a
frozen fade still reads as loading); the §1.3 prefetch was RIGHT and overdue, its
rail-keyed trigger unnecessary; DEC-017's "never a spinner" is RIGHT and becomes THE
threshold rule for every transit (progress bars stay rejected).

The transit beat, in order:
1. **Departure glide** (~700 ms, STEP-glide easing; declared): the camera leaves the
   door stop along the rail's end tangent toward the portal centre for the last few
   metres (never reaching the plane) while the scene's light drains: ramp
   `renderer.toneMappingExposure` → 0 over the glide (indoors from
   INTERIOR_EXPOSURE, outdoors from E(h)). No overlay, no extra draw.
   **NEED CLOSED (orchestrator):** the renderer runs AgX tone mapping and the sky
   dome's shader includes `<tonemapping_fragment>`/`<colorspace_fragment>` with
   toneMapped true (src/sky/rig.ts; main.ts line ~182) — exposure drains every
   visible pass. The B-RT dev quad is toneMapped:false — dev-only, not in the
   product path.
2. **Blackout + title card**: at black, the caption region shows the destination's
   room title (the words clicked on the door label); the entry-stop caption beneath
   is visually retired since R16.1 (its accessible announcement remains). The card's
   minimum dwell is 800 ms on every card, doorway or cut, including index jumps
   [the 2026-11-01 owner reading-fix: the R-UX1 ~250–400 ms cut-to-black window
   dismissed the title in ≈ 0.2 s]. This is the card WINDOW, not an 800 ms
   full-opacity plateau: the 240 ms fade plays inside it, and on leaving the card
   the title VIEW clears while the host retains the outgoing glyphs through that
   fade — an instant text clear once cut the fade dead (the writer's hand-over law,
   main.ts). Reduced motion removes both fades. If data is not ready the card holds
   — black with a room name is a title card, not a hang. No spinner/percentage
   ever; the ">2 s on device" clause stays a fix-not-hide item, attacked by
   prefetch.
3. **Swap at black**: applySwap / upload / compile / PMREM inside the black.
4. **Arrival glide** (~900 ms; declared): the camera starts a few metres back toward
   the destination portal (inside its doorway) and glides into the entry stop while
   exposure ramps to the room constant. The arrival frame is REACHED, not cut to;
   the title card fades on the first lit frame; the entry caption stays (the
   caption law's zero-change hand-over holds).
5. Reduced motion: cut to the black card → cut to the entry stop; the card's
   minimum dwell still applies. det: identical beats driven through the FSM deltaMs
   (hold phases become depart → card → arrive); goldens capture at stops, so pinned
   pixels do not move.
6. **Prefetch** (the pause's real fix): at every arrival-settle, fetch
   manifest + lazy chunk + GLB + KTX2 rows of every non-resident neighbour and
   transcode ahead (staggered, one row per idle frame — the 2-core stutter guard);
   per-session cache keyed by room id, never evicted in-session (≈ 10 MB RAM
   declared; the §8.3 ledger still registers only on load). The black card then owns
   only GPU upload + compile + PMREM. Never prefetch while the current chain is
   pending; also unserialise manifest ∧ chunk. Cold deep links keep today's shape:
   card first, then the arrival glide.
7. Beats: the doorway persists as depart ~700 + card ≥ ~300 + arrive ~900 [declared]
   — a warm-cache wait becomes ~2 s of continuous MOTION with a title. The landing
   airlock's 600 ms dead-end beat stays untouched until DEC-025 retargets it.

### 4.1 The door heading and the gaze (2026-11-13; DEC-017 amended)

**§4.1a The door heading.** The departure glide travels the door heading — the rail's
end tangent with world-up removed and renormalised. A stair's end tangent inherits the
stair's slope; the visitor's eye does not: a depart keeps the door stop's eye height from
its first frame to the card, and the standoff is measured from the doorway's own vertical
plane (through the portal centre, normal to the heading). The lean (R-UX2) rides the same
heading — a body leans into a door, it does not stoop. A heading already level passes
through the law untouched: the flat rails' departs are bit-identical. The exact-height
guarantee holds for a flattened or exactly horizontal heading; a near-level tangent inside
the level fence keeps its own residual slope — a bounded drift of at most the fence times
the travel cap (≈2.5 cm; the committed rails' residuals ≈0.3 mm), documented as intentional
(the review finding, 2026-11-13).

**§4.1b The gaze.** A door stop that faces its door glides the gaze to the portal centre
— the stride through «the last few metres». A door stop whose committed gaze faces away
from its door backs out as a locked dolly: the eye retreats along the heading, the gaze
holds the stop's subject — «back out of the scene», the arrival played backward. Arrivals
are untouched; an arrive never reads the tangent.

- Touches: DEC-017 rewritten («dark title card, every transit, min dwell, no
  spinner»), §2.3 recorded as implemented (exposure instead of overlay), §1.3
  recorded as implemented (simpler trigger), the hold constants re-declared. Owner
  dispositions D3 (title card) and D4 (prefetch bytes). 2026-11-13: §4.1 above —
  DEC-017 amended again (the door heading; the facing-away gaze backs out).

## 5. The corridor's light (reply §2.4, adopted)

The law promotes its clauses to the adjacent H2 sections below (the numbering follows the body's own bold clauses).

## 5.1 Fast path first
  (byte-deterministic re-encode from the surviving EXRs via tools/reencode.mjs; no
  re-bake); then re-tune per-state white points so the G1 mean luminance across
  states stays within ~1.5× of each other and the brightest state is ≤ ~⅓ of the
  stair mid-flight mean (the compression→release beat survives). Look gains lift
  the floor/pilaster reading without clipping the sconces. Guard: inspect the vault
  for banding at the new white points before accepting.

## 5.2 Slow path
  line to legibility at G1: re-bake with higher lamp power and daylight portals at
  the arch mouth + east door (logged, slow).
- G0's arrival black is fixed jointly by §8 (G0 gazes down the passage at the lit
  junction, not into the wall).
- Touches: the G1 day golden re-baselines (recorded). Owner disposition D5.
- Open authoring fact: what the east door shows when faced (whether a lit slab must
  be baked there for G2's new gaze) — closed by capture at implementation.

## 5.3 **R-UX4 LANDED (2026-10-23, this round's integration notes; D5 executed as t
  path):** the three states re-designed by the creative relay to "one lamp field with three
  different mouths" — day = night + day rigs composed linearly at scale 1
  (tools/lm_compose.py + tools/lm-recipes.mjs, the dispatch rides tools/reencode.mjs), all
  gallery states encode at the shared white point 0.2 (the lamp field byte-identical across
  atlases — the shared-white-point law), gains day 3 / dusk 3 / night 2.75 (the ceiling law:
  max eff = 0.6 = the accepted dusk; night ≤ day holds per texel). Verified: dusk/night
  re-encodes reproduced the committed sha256 byte-identically from the surviving EXRs; the
  composite EXR byte-identical across runs; capture gates at G1 (probe frames): day 32.34%
  below lum 10/255 (was 99.84%), day mean 20.26 / dusk 12.87 / night 11.89 — the ~1.5× band
  reads ~1.57× (day/dusk) and ~1.70× (day/night): the reply's band rule spent its step
  (night gain 2.5 → 2.75) and sits at its ceiling g(night) < g(day) — the residual is
  recorded, amending the criteria number is an owner call. "Sconces remain the brightest
  thing" gated precisely: the top 0.05% luminance pixels of every G1 frame fall inside the
  sconce-glass screen mask (night-frame threshold >100/255) in all three states. Fresh fact
  for the record: the §1.4 "cool bounce" byte does not exist — the day EXR is mildly WARM
  (R/G 1.107); the 56% (<0.001) bisect figure vs the fresh 34.31% read of the denoised day
  EXR is unresolved in provenance (raw-vs-denoised is the working hypothesis). G0/G2 ×3
  fact rows captured: the junction is lamp-lit in every state, but the committed pose law
  still frames the passage's east wall band at G0 and looks back west at G2 — the G0 arrival
  and the east door's faced view remain R-UX5's authored gazes (?cam= is a rail-u parameter
  and cannot face the door).

## 5.4 **RG-D1 (2026-11-01, the details program's iteration 1 — the lamps' light; P
  on branch `rg-d1-light` while another session's round was in flight — the full e2e/golden
  suite and the captures run at merge).** The owner's verdict «too dark, especially in autumn
  and winter; evenings and nights are pitch dark; there should be more light» is the owner call
  the R-UX4 record asked for (the band rule sat at its ceiling). The season chooser (committed
  after the R-UX4 measurements) places every autumn/winter evening at sun ≤ −8° = pure
  `nightChandeliers`, held at eff 0.55. The R-UX4 band rule (~1.5× between states, eff ceiling
  0.6, g(night) < g(day)) is RETIRED for this room. The fixture-free look law: the lamp field
  is published at GALLERY_LAMP_SCALE = 8 × the rig's emission in ALL THREE states by compose
  (night = 8·L; dusk = the dusk rig's sky + 1·L, plus 7·L; day = the day rig's sun, plus 8·L),
  encoded at the manifest white point 0.8, the room carries ONE gain (2) → eff 1.6 in every
  state; night ≤ dusk ≤ day holds per texel by construction (the states differ by the sky/sun
  term alone; design §1.4's «differ little» re-affirmed). No geometry change, no re-bake, no
  new fixture (DEC-026's rejection respected — the light LEVEL is the confirmed gap; the
  fixture FORM is not yet sourced). INTEGRATION CORRECTIONS of the relay reply (both verified
  against the staged night EXR): (1) «wp = k/10 keeps the clipped texel set fixed» is not so —
  the atlas clip point moves to wall L ≥ 0.1 (13.29 → 15.86 % of texels measured; the
  acceptance gate «clipped share outside the sconce mask ≤ 3 %» covers the delta); (2) the
  paired law «wp = k/10, retune k» is a no-op family — any (k, k/10) pair encodes the same
  atlas (encode = clamp((k/wp)·L)); the encoded quantity is C = k/wp (first setting 10), and
  the retune knob is C (raise k with wp held 0.8). Light budget: atlas night mean 0.2324 →
  0.3221; the rendered product grew ≈ ×4.03 LINEAR (0.3221 × 1.6 vs 0.2324 × 0.55) — AgX
  compresses heavily, the capture band arbitrates. Acceptance gates at G1 (probe-frame, 255
  scale): night mean in 40..70; pixels below 10/255 at night ≤ 10 %; clipped (code 255)
  atlas share outside the sconce mask ≤ 3 %; «sconces remain the brightest» in all three
  states (shade emission 6.0 vs the walls' clip max 1.0 × eff 1.6); no visible vault banding
  at eff 1.6. Retune: outside the band raise/lower C; banding remedy: smaller C with a finer
  toe, never the eff ceiling. Declared residuals: the dusk probe ktx2 is NOT rescaled
  (specular from the probe lags the lamp field until a re-bake; the plaster/stone finishes
  are rough — minor); the day state reads lamp-dominated until the courtyard-side windows
  exist (the daylight term's shortfall is the windows gap, not a regression; §1.4's declared
  behaviour). Real-room facts (iteration-2 evidence): LOOKUP-SUPPORTED (web summaries,
  unsourced): the real gallery is vaulted with large windows along the courtyard side — in
  tension with design §2.2's «windows | none visible». Fixture form unknown; next evidence:
  an axial photograph toward the Jordan Staircase (day and evening) and a courtyard-wall
  view; the owner's own screenshot with clock/season settles the «total black» reading
  alongside the merge-time pre-change capture at the det night time (expect ≈ 12/255 —
  designed darkness, not a decode failure).


## 5.5 RG-E1 (2026-11-02, the details program's second lane — the pale gallery / "E
  **THE FORENSIC PASS (offline, before integration — mechanism PROVEN):** in a one-image bake across datablocks Blender 4.2 rasterizes per-pixel STRICT last-writer-wins (4,553/4,553 conflict pixels to the later writer, pure value copy, byte-deterministic reruns; clear-once, not per object), and the write order is the builder's creation order (shell → portal → pilaster → **sconce**) — NOT `bake_targets`'s name sort. The z=70 wall faces 28–31 (x 24.4→40.08, atlas row-1 cols 8–11) were ~88 % overwritten by the last sconce representative's dim back-plate/arm cells (≤ 0.45/255) — the near-black courtyard wall run mechanically explained; the shell face census: 387 faces (floor 22, walls 11+11, vault 80, tympana 16, end 3, cornice 80, skirting 40, passage 134). Along the way: the committed night atlas demonstrably descends from an EARLIER staged EXR (band ≈ 104× off the declared compose scale) — the re-encode's EXR-sha gate was VACUOUS for rooms whose bake-log JSON lacked `charts` rows; now FAIL-LOUD (`assertStagedExr`), the rastrelli/jordan logs carry their rows, and the fresh encode's provenance is sha-verified live on all three states.
  **THE LANDED ROUND (one builder + one bake pass):** palette — `plaster_pale` (0.74, 0.70, 0.62; isotropic mottle ≤ 0.035 declared, grid max 0.0359 measured, no diagonal term), `stucco_grey` (0.60, 0.58, 0.54), `stone_flags` retuned to 1 m flags (0.56/0.54/0.50, mortar 0.34/0.32/0.29), flat `iron_dark` (0.07, 0.065, 0.06, roughness 0.55) — the sconce-slot-bug fixed; `plaster_dark` retired end-to-end (the glb carries 3 images). Atlas law — pilasters/ribs/niches/doorcase/lunette merged into the shell datablock (1,213 lm faces), area-weighted shelf packing at PX_PER_M 18 (20/19 did not fit; occupancy 0.7817, overlapFaces 0, minCellPx 6), the sconce template in a reserved v ≥ 0.875 strip (19 faces, 5×5), summary.json's `lm` block published; vault + passage-arch soffits on cylindrical UV (the wood-grain streak gone). Bays — 11 transverse ribs (RIB_X = PILASTER_X, crown 3.48 under the 3.6 vault, RIB_CLEARANCE_M 0.12), 22 blind niches (width 1.8, sill 0.9, peak 2.5, recess 0.22; backs in plaster_pale = the constants-level pane slot, shipped BLIND — evidence pending), the east doorcase + lunette r 0.75 with a `stairlight` back quad whose cells are PAINTED per PUBLISHED state at the re-encode (after compose: day 0.55/0.58/0.62, dusk 0.45/0.32/0.17, night 0.60/0.42/0.22; the values live twice — bake.py PANE_PAINT as the declared record, reencode-paint.py as the machine source — kept in sync by law); sconces relocated 6/wall onto the odd pilasters' shaft planes + 2 at the passage mouth facing west (14 total, SCONCE_Y 2.0). EMITTER_EXCLUSION gains 'rastrelli-gallery': True (the re-adjudication: the glow is runtime material emission; the shade renders its warm colour — this re-bake is the recorded shape change).
  **THE RETUNE:** k = 4 by the reproducible LOOK-RATIO (the k=8 G1-night still measured 0.3505 vs the ratified baseline 0.1528 → 8/2.3 → 3.5 → 4; wp held 0.8, gains 2/2/2). FLAGGED (honest): the round's 0.30–0.34 atlas-mean intent is unreachable at k ≤ 8 under any estimator consistent with the tree (the anchor's 0.3221 ≠ the old atlas's decoded full mean 0.5043 — the band's original estimator is not reproducible from the repo); published pre-ETC1S means at k=4: night 0.1752 (clip 0.56 %), dusk 0.1992, day 0.2883 (clip 3.79 %). The night still at k=4 reads 0.2991 (≈76/255) — marginally above the old 40–70/255 band; k 3–3.5 is the ~7-minute re-encode dial if the owner's fix is lower.
  **GATES LANDED (branch-local):** regen determinism fence IDENTICAL (night.png + night.ktx2 sha256 match across a full night re-bake; the denoised EXR's FILE sha differs run-to-run — the EXR container, not the pixels; the committed bytes descend from the fence's plate, sha-proven); manifest 8 rows, payload 376,509 ≤ 2,000,000; textures 288,761 ≤ 1,000,000; contract budget untouched; validate green (build 278,518 ≤ 350,000; RU 7,245). Bake wall secs: 408/640/574 (the fence ~600). PENDING at the stack finale: the full e2e/golden sheet, the three G1 re-baselines + the reference G0/Gj/G2 ×3 captures, the capture-side gates (night mean band, the symmetry band banning the near-black run, lunette ≥ 180/255, lit junction ≥ 25/255, the rib/niche count read, a mean-luminance band assertion so ≥ 51/255 drift can no longer pass silently), and the owner's k dial on the capture.

## 6. The stair arrival (reply §2.5, adopted + geometry)

- J0 moves OUT of the vestibule box to the hall at the foot of the first flight; the
  arrival glide carries the visitor from the doorway (the vestibule's north door,
  x 79.5..82.5) through into the hall so the doorway is passed, not stood in. The
  departure glide still ends inside portalFrom (the e2e portal-box observation
  holds); the portalTo box moves with J0 or the glide start derives from it.
- J0 gets an AUTHORED gaze: up the first flight toward the north window light over
  the mezzanine. With the real geometry (§1/§8), flight 1 climbs NORTH along the
  WEST wall from z −68.12 — a correct J0 sits near x ≈ 68, z ≈ −68.5, gazing north
  up the flight [declared — capture frames it].
- Touches: contract data + the gaze field (§8); the J0 golden re-baselines
  (re-composed). Covered by D6.

## 7. The corridor path fix (reply §2.6b for the gallery)

- A **junction stop** where the arch passage meets the gallery axis (near
  (1.5–2, 1.7, 73); gaze east down the gallery toward the east door's light) —
  four stops; the G0→G1 wall-pass disappears (seven since the 2026-11-16 walk
  re-choreography: the 2026-11-12/13 stops round added G0b and two axis inserts
  Gjb/G1b; the owner's 2026-11-14 steer retired those two and kept G0b at the G0→Gj
  diagonal's midpoint; the owner's 2026-11-16 feel report re-opened the trade — the
  per-gap pace law makes the unsplit 22.4 m leg run 14.9 m/s — so Gjb/G1b are
  reinstated as axis rests on the EAST_DOOR lock, speed for sameness, and G0b's
  subject is re-authored from JUNCTION to GALLERY_MOUTH: the head pre-turns toward
  the light before the corner). The 2026-11-24 feel tune pre-turns G0b's subject past
  the mouth toward the door (MOUTH_TURN — the pan splits 28°/55°, the second click
  −10 %; the owner's eye validates the feel). The G0 gaze stays «down the
  passage toward the lit junction» (the vault leads the entry frame, its 3.06°
  fence untouched); G2 (the door) keeps its authored subject (the
  door's light); G1 keeps the lock-on east, gaze exactly (1, 0, 0).
- The end-phantoms adjudication does NOT reopen: these are stops with captions,
  not helpers.

## 8. The movement law — authored subjects, corner stops, feet on treads

The law promotes its clauses to the adjacent H2 sections below (the numbering follows the body's own bold clauses).

## 8.1 Gaze law (B9, supersedes R19-ux C's departure turn)
  subjectless next/back fallback remain unchanged; stop poses remain bit-identical. Between
  two stops the base gaze travels the arc between their two committed framings and nothing
  else: the source aim is frozen at the departure eye (or at the look in force at a
  reversal), the destination aim is frozen at the destination eye, yaw takes the shortest
  arc and pitch blends linearly, both with one weight — the distance fraction covered of
  the anchor's remaining segment, reshaped by the lag (B9c, 2026-11-17; the lead B9b's
  mirror): the look HOLDS the anchor's aim across the first 1 − LOOK_LAG of the segment (10 % at the declared dial) — the body
  starts first — and plays its whole arc across the last 80 %, landing on the destination
  framing exactly at the stop (on an isolated tap the sweep plays ≈ 0.5–1.75 s while the
  body runs and brakes, both resting together at 2.06 s). The look therefore trails the
  travel: the position starts first, the look peaks at 60 % of the segment, never turning
  faster per unit of rail than 1.875 × the segment's own average (the
  smoothstep peak over the lag span), and no held point's parallax reaches the gaze. The base gaze is a function of
  rail position, heading and the active anchor alone — no independent clock: within one
  anchored segment, Forward and Back, walks, partial intents, retargets
  and reversals read the same look at the same point; a fresh opposite heading anchors at
  its own origin and reads its own shape (the lead made the fresh-heading shapes differ —
  the linear law's cross-heading point-equality is retired intentionally, 2026-11-16);
  pass-through stops are met on their
  committed poses. Equal source and destination points remain a locked dolly throughout
  (the point is held). There is no turn span, no TURN_REF_DEG widening and no near-field
  exemption: the former exemption's distance weight is now the rule. An APPROACH point
  remains authored data on its stop's committed gaze ray and no longer steers a glide
  (at the stop it is direction-identical to the subject). Position stays on the unchanged
  spline. Measured (derived at the R19-ux 2380-ms leg; the pacing is superseded by the walk law, the gaze law shape kept): a step's pan peaks at mid-glide at
  1.875 × arc ÷ duration — G0→Gj and Back Gj→G0, 83.0° → 65.4°/s (286°/s at
  SCROLL_GLIDE_MS); Back Gj→G0's pitch rises linearly from 0° to its 3.06° settle.

## 8.2 Corner stops (R18-ux D3)
  evaluated per RUN — the stop list split after each corner stop — so a corner knot
  inherits no tangent from across the turn. Each run uses the committed spline and end
  rule unchanged; a rail with no corner flag is one run and samples bit-identically to
  before. A walk never crosses a corner stop: it brakes into the knot and, with live intent,
  re-departs at once (a hard knot; the movement-ux amendment).

## 8.3 Corner stops
  Stairs: a stop on the REAL mezzanine turn — near (67.5, 6.7, −81.7) between the
  flights [declared] — the switchback becomes two right-angle turns on the mezzanine
  land/edge, which centripetal CR rounds like a person turning.

## 8.4 Feet on treads
  + 1.7 (the build script's `flight_datum()` is the source of truth);
  flight-1 stops sit on the west band (x 66..67.6), flight-2 stops on the north
  band (z −84.4..−82.8); the landing survey stop sits on the slab (x ≥ 80).
- Committed authored set, retained by R19-ux C and B9: J0/J1 → MEZZ_LIGHT (locked climb);
  J1b → FLIGHT2_SCONCE; J2 → FLIGHT2_TOP; J2b → the SAME FLIGHT2_TOP (D-J2b, owner
  2026-11-02: press 4 locks onto J2's framing — the old upper-window glance into the north
  wall retired); J3/J4 → EAST_PORTAL
  (locked approach). Local presses from J0 land at J1, J1b, J2, J2b, J3, J4. The sconce
  and window are intentional subjects, not random samples. Corridor (re-authored
  2026-11-16, pre-turned 2026-11-24): G0 → JUNCTION (the vault leads the entry frame);
  G0b → MOUTH_TURN (the head pre-turns past the mouth toward the door; the 2026-11-24
  feel tune, the pan split 28°/55°); Gj/Gjb/G1/G2 → EAST_DOOR (one
  locked dolly onto the door's light; Gjb is the 2026-11-16 axis rest for the pace,
  G1b retired 2026-11-17);
  GALLERY_MOUTH stays recorded as Gj's approach on the committed ray
  and, under B9, no longer steers the Forward glide.


## 8.5.1 Look limits (B9): the gaze's distance weight blends departure rows (or
- Look limits (B9): the gaze's distance weight blends departure rows (or the rows at a
  reversal) into destination rows over the whole remaining segment. Limits are manual offsets around the
  base gaze. Existing offsets are re-clamped, never silently reset; zero-offset stop poses
  and the stop inventory remain unchanged.

## 8.5.2 Departure absorbs the look (B10, the 2026-11-16 owner report — the dra
- Departure absorbs the look (B10, the 2026-11-16 owner report — the drag+Forward feel item;
  amends B9's anchor clause and the re-clamp sentence above): at every anchor the press path
  creates — a press from rest (at a stop or mid-segment) and a reversal's turnaround — the
  arc's source aim freezes at the look in force: the base gaze composed with the user's
  offset (additive in degrees, the exact rendered direction), and the offset is ABSORBED —
  both look fields return to zero in the same frame, so the view does not jump. The arc then
  runs from where the visitor looks to the destination's committed framing, so every arrival
  is the author's frame exactly — the S0b monument pause lands on the pedestal whatever was
  dragged. A never-dragged walk is bit-identical in every room (offset 0 ⇒ source = the
  committed framing): the golden fence and «the pans KEEP» (T5 2026-11-15) stand. Drags made
  while walking ride on top, re-clamped by the rows in force, and are absorbed at the next
  anchor; pass-through stops and mid-walk presses neither anchor nor absorb. Reduced motion's
  cut absorbs at the same press edge — the cut lands on the destination's committed pose
  exactly. Within an anchor the base gaze stays a function of rail position alone; the
  anchor's frozen source is the one history the law carries (B9 already carried it at
  reversals). The realized turn's size is the angle between the visitor's look and the
  author's next frame; the head law's MAX_SWING_DEG 90 governs the DEFAULT gaze and has no
  absorbed-look universal bound — the census row records each rail's stop-departure worst
  over both directions of every leg instead (the square's 90.7° at S0's full down-left look;
  the rooms' extremes ride their own wide look rows — 1812's ±90 rows reach 141.7°; the
  turnaround anchors are a separate surface the eye probes cover). The rail-anchor tests
  pin the fence, the no-jump, the absorption, the turnaround, the cut, the dolly and the
  sign. The owner's-eye probes: S0 drag +30 → a ≈ 15° glide onto the pedestal; S0 drag −30 →
  a ≈ 77° glide that turns MORE than today's 48° but lands on the frame — the eye rules.

## 8.5.3 Reduced motion (R18-ux, verdict 2; amended movement-ux): a fresh press
- Reduced motion (R18-ux, verdict 2; amended movement-ux): a fresh press edge cuts to the next
  stop under REDUCED_DWELL_MS 600 (a press during the dwell is dropped, repeats are ignored; the
  boundary is checked before the dwell); a cut lands on the
  destination's committed pose. There is no departure turn.

## 8.5.4 Speed laws (movement-ux, superseding R19-ux B): ONE walk pacing — WALK
- Speed laws (movement-ux, superseding R19-ux B): ONE walk pacing — WALK_CRUISE_MS 1500 ms per
  stop gap at cruise, WALK_ACCEL_MS 420, WALK_BRAKE_MS 700 (T = 2r/v when intent dies early),
  WALK_LEASE_MS 600 / WALK_HOLD_MS 300, REDUCED_DWELL_MS 600. The scroll family is retired
  with the wheel; the touch no-glide admission is retired with it (one admission law); the
  threshold-beat timing is unchanged.

## 8.5.5 Touches: the committed gaze law (owner D6), the Stop type gains an opt
- Touches: the committed gaze law (owner D6), the Stop type gains an optional
  authored-gaze field (src/world/registry.ts — a type extension; DEC-013
  unaffected), stop counts (new stop ids + captions in both languages — the RU
  dictionary ceiling counts bytes), e2e stop-id walks extend; goldens by stop id
  keep bit-identical poses where the authored target equals the old implicit one
  (parameter shifts at stops keep poses exact), re-baseline only where
  re-composed (S1, G0, G1-day, J0 + any newly composed views).

## 8.5.6 D8 (AMENDED, movement-ux): the wheel's continuous travel is retired WI
- D8 (AMENDED, movement-ux): the wheel's continuous travel is retired WITH the wheel; the
  walk IS the one continuous idiom — a cruise runs through every non-hard stop, the arrows
  (keys + the pair) are the only movement affordance, and control stays part of the visit.

## 8.5.7 The military gallery of 1812 stop table (R18-ux D5; positions in the c
- The military gallery of 1812 stop table (R18-ux D5; positions in the committed
  frame; EYE 11.65):

  | Stop | Position | Subject | Look {yaw, up/down} | Change |
  |---|---|---|---|---|
  | M0 | [86.25, 11.65, −38] | AXIS_FAR | {90, +25/−10} | R22-ux: yaw 30→90 — squares on either portrait wall; the trailing frame edge brings the north end-wall corners into the frusta union (one capture-day check on the end wall). |
  | M1 | [86.25, 11.65, −25] | AXIS_FAR | {90, +25/−15} | x 84.3→86.25 (on axis); subject WEST_BLOCK→AXIS_FAR; yaw 25→60 so a drag-left frames the west portrait block; R22-ux: yaw 60→90 — a drag-left now squares on the west block (due west); the frame stays on the long wall, so the set-edge half of the capture-day line is answered by geometry — block fill stays a composition check. |
  | M2 | [86.25, 11.65, −12.5] | AXIS_FAR | {90, +55/−0} | subject LANTERN→AXIS_FAR; rows unchanged — pitchUp 55 keeps the 35° lantern as the drag's reward; R22-ux: yaw 40→90; pitch rows unchanged — pitchDown 0 hides no canvas (lowest edge −3.6°). |
  | M3 | [86.25, 11.65, 0] | MONARCHS | {90, +20/−10} | z 9→0; flagged `corner`; R22-ux: yaw 25→90; the z 4..6 slide stays open (position, out of this round). |
  | M4 | [88.5, 11.65, 13] | ST_GEORGE_DOORS | {40, +10/−10} | was none; R22-ux: yaw 20→40 — squares on the east wall (38.3° left of the doors); the west wall (+141.7°) lies past the 90° cap and is read from the axial stops. |

  R22-ux (owner ruling): the gallery is read off its two portrait walls, so every axial stop's
  yaw row opens to ±90° — the composed gaze squares on either wall at 4.2 m, where the
  unchanged pitch rows already frame the whole five-row ladder (−3.6°…+35.2°) inside the 55°
  frame — and the door stop M4 opens to ±40°, the turn that squares it on the east wall 2 m
  beside it, because no yaw row exceeds 90°: a look never faces back past the side, the half
  the frusta union was never built for.

  The rail becomes one axial dolly: run M0..M3 is axial (x = 86.25 to float rounding); run
  M3→M4 is the chord (2.25, 0, 13), 9.8° off axis, straight to the door stop. Segments
  13 / 12.5 / 12.5 / 13.2 m — an even rhythm at the R19-ux 2380 ms (approximately 5.5 / 5.3 /
  5.3 / 5.5 m/s average). Presses 1–2 remain a locked dolly. Press 3 turns toward MONARCHS;
  press 4 turns toward the doors, then holds that point as it approaches. These small
  departure turns ride the B9 distance weight (one weight over the anchor's remaining
  segment, above), which superseded the 0.31744 distance span and the 40%-elapsed-time
  phase law. The
  door's near-field parallax still contributes angular motion after the turn; the previous
  timing's measured/estimated rates are not current rate guarantees and must not be carried
  forward as evidence.
  Back glides face forward while backing away (AXIS_FAR / MONARCHS), consistent along the
  whole gallery. WEST_BLOCK and LANTERN stay exported landmarks (the capture checklist
  and the look-row comments), no longer subjects; M0 and M4 are untouched, so any goldens
  there hold. Capture-day uncertainties: (1) M3 reads the monarch wall from 14.9 m — if
  it composes too far, slide M3 to z 4..6 (one number; the corner keeps the path
  straight); (2) M1's yaw 60 is the widest look row in the building — confirm the west
  portrait block fills the frame without showing the set edge; (3) the door geometry —
  ST_GEORGE_DOORS at x 90.4 sits at the end wall's east end, so M4 views it ≈52° off its
  normal.

## 9. Felt-experience acceptance criteria (the reviewer script; reply §4 verbatim)