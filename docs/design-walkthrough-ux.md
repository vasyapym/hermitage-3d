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
  push. Click, arrows and wheel-through all pass through the same law.
- The sustained-wheel pass gets **feedback**: the camera leans toward the portal by
  a small fraction of a metre ∝ budget/EDGE_BUDGET_PX, springs back when the pass
  resets, and the lean continues seamlessly into the departure glide (§4). Thresholds stay declared constants; re-tune against a measured time-to-fire
  (target: a calm two-finger roll fires ≤ ~0.7 s; a flick never fires) [declared].
- The travel hint copy fixes its verb: EN "Scroll to walk · drag to look around" /
  RU «Прокрутите, чтобы идти · потяните, чтобы осмотреться» [declared; D1].
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
- Touches: DEC-017 rewritten («dark title card, every transit, min dwell, no
  spinner»), §2.3 recorded as implemented (exposure instead of overlay), §1.3
  recorded as implemented (simpler trigger), the hold constants re-declared. Owner
  dispositions D3 (title card) and D4 (prefetch bytes).

## 5. The corridor's light (reply §2.4, adopted)

- Art rule: **a museum's lamps are ON by day.** The three states differ by the
  daylight spill at the arch mouth and the east door, not by the lamps — the
  declared «differ little» intent; the shipped day bytes are the divergence.
- **Fast path first**: at the ENCODE, composite day = daylight bake + lamp bake × k
  (byte-deterministic re-encode from the surviving EXRs via tools/reencode.mjs; no
  re-bake); then re-tune per-state white points so the G1 mean luminance across
  states stays within ~1.5× of each other and the brightest state is ≤ ~⅓ of the
  stair mid-flight mean (the compression→release beat survives). Look gains lift
  the floor/pilaster reading without clipping the sconces. Guard: inspect the vault
  for banding at the new white points before accepting.
- **Slow path** only if the composite cannot bring the pilaster rhythm and the vault
  line to legibility at G1: re-bake with higher lamp power and daylight portals at
  the arch mouth + east door (logged, slow).
- G0's arrival black is fixed jointly by §8 (G0 gazes down the passage at the lit
  junction, not into the wall).
- Touches: the G1 day golden re-baselines (recorded). Owner disposition D5.
- Open authoring fact: what the east door shows when faced (whether a lit slab must
  be baked there for G2's new gaze) — closed by capture at implementation.
- **R-UX4 LANDED (2026-10-23, this round's integration notes; D5 executed as the fast
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
- **RG-D1 (2026-11-01, the details program's iteration 1 — the lamps' light; PARALLEL: integrated
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

- **RG-E1 (2026-11-02, the details program's second lane — the pale gallery / "Eleven Bays"; PARALLEL: integrated on branch `rg-e1-room` while another session's round is in flight — the full e2e/golden suite, the captures and the three G1 re-baselines run at the stack finale, the RG-D1 convention).** The owner's verdict: the room «looks very raw / like a draft». The relay (the zero-steering facts dossier `projects v8/8-hermitage-3d-rastrelli-room-inventory.md`; the room's whole light chain + builder carried byte-verbatim) returned a ranked assessment adopted as the round: (1) ATLAS INTEGRITY — the four datablocks' per-face equal-cell grids all span 0..1 and bake into ONE image; (2) the PALETTE — one dark chocolate plaster (0.38/0.29/0.22) on wall/vault/pilaster AND sconce-iron reads as wood; (3) the missing BAY articulation between "shell + pilasters" and a finished interior; (4) the door's light contradicting the contract's own "one locked dolly onto the door's light"; (5) the fixture slot (iron in plaster albedo; the glow clipped to white lozenges).
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
  four stops; the G0→G1 wall-pass disappears. The G0 gaze re-authors as «down the
  passage toward the lit junction»; G2 (the door) gets an authored subject (the
  door's light) replacing the look-back law there; G1 keeps the lock-on east.
- The end-phantoms adjudication does NOT reopen: these are stops with captions,
  not helpers.

## 8. The movement law — authored subjects, corner stops, feet on treads
(reply §2.6, adopted; the stop re-authoring is one pass, capture-framed)

Verdict: the rail stays; free roam stays rejected; the two defect laws are fixed
inside the promise.
- **Gaze law (R19-ux C)**: authored SUBJECTS and the subjectless next/back fallback remain
  unchanged. A segment makes one DEPARTURE TURN, then holds its destination's target exactly.
  The source direction is frozen at the departure position; the destination aim tracks its
  target from the current spline position. Equal source and destination points instead remain
  a locked dolly throughout. Yaw takes the shortest arc; pitch blends linearly with the same
  weight. TURN_SPAN_T is 0.31744 of segment distance: smootherstep(0.4). Widen
  that distance span by θ/TURN_REF_DEG above 45°, cap at TURN_SPAN_MAX_T = 0.4, and never pass
  the destination. Map traveled/remaining-segment distance and span/remaining-segment distance
  through inverse smootherstep; smootherstep of their phase ratio is the turn weight. A
  settled adjacent step up to 45° therefore turns over its first 40% of elapsed time (952 ms
  at the R19-ux speed), not over 31.744% of elapsed time. A near-field held point — its own
  ray turns by TURN_REF_DEG or more between the anchor eye and that nominal span's end — is
  exempt: its turn spans the whole remaining segment with the distance fraction as its
  weight, so its parallax enters only in proportion to the distance covered. Partial
  scrolls and retargets use the same geometric law; this is not a separate turn timer or an
  absolute angular-speed cap.
  Reversals re-anchor at the current base gaze; pass-through stops start their next turn from
  their committed poses. Position stays on the unchanged spline. Stop poses remain
  bit-identical. A Forward glide into an APPROACH stop uses its approach point; Back and the
  stop itself use its subject. The approach and subject must remain on the same committed
  gaze ray. Measured on Back Gj→G0 (JUNCTION 0.7 m over Gj, sweep 82.4°): the pitch rises
  monotonically from 0° to its 3.06° settle; the 83° pan peaks ≈65°/s at STEP_GLIDE_MS 2380
  (≈286°/s at SCROLL_GLIDE_MS 544).
- **Corner stops (R18-ux D3)**: a stop may be flagged `corner`. The position spline is
  evaluated per RUN — the stop list split after each corner stop — so a corner knot
  inherits no tangent from across the turn. Each run uses the committed spline and end
  rule unchanged; a rail with no corner flag is one run and samples bit-identically to
  before. A scroll glide never crosses a corner stop: its target clamps there and the
  next delta starts a new glide from the corner. Step glides are unaffected.
- **Corner stops**: the path turns only at stops. Corridor: the junction stop (§7).
  Stairs: a stop on the REAL mezzanine turn — near (67.5, 6.7, −81.7) between the
  flights [declared] — the switchback becomes two right-angle turns on the mezzanine
  land/edge, which centripetal CR rounds like a person turning.
- **Feet on treads**: every stair stop's y = the flight_datum/flank at its (x,z)
  + 1.7 (the build script's `flight_datum()` is the source of truth);
  flight-1 stops sit on the west band (x 66..67.6), flight-2 stops on the north
  band (z −84.4..−82.8); the landing survey stop sits on the slab (x ≥ 80).
- Committed authored set, retained by R19-ux C: J0/J1 → MEZZ_LIGHT (locked climb);
  J1b → FLIGHT2_SCONCE; J2 → FLIGHT2_TOP; J2b → UPPER_WINDOW; J3/J4 → EAST_PORTAL
  (locked approach). Local presses from J0 land at J1, J1b, J2, J2b, J3, J4. The sconce
  and window are intentional subjects, not random samples. Corridor: G0 → JUNCTION;
  Gj/G1/G2 → EAST_DOOR, with GALLERY_MOUTH as Gj's Forward approach.
- Look limits (R19-ux C): the same turn-phase weight blends departure rows (or the rows at
  a reversal) into destination rows, then holds them. Limits are manual offsets around the
  base gaze. Existing offsets are re-clamped, never silently reset; zero-offset stop poses
  and the stop inventory remain unchanged.
- Reduced motion (R18-ux, verdict 2): glides become cuts stop→stop; a cut lands on the
  destination's committed pose. There is no departure turn.
- Speed laws (R19-ux B): step glides 2380 ms, scroll glides 544 ms, both retaining smootherstep
  position easing: 15% less elapsed time in each family. Wheel distance, reduced-motion cuts,
  the touch no-glide admission and the threshold-beat timing are unchanged.
- Touches: the committed gaze law (owner D6), the Stop type gains an optional
  authored-gaze field (src/world/registry.ts — a type extension; DEC-013
  unaffected), stop counts (new stop ids + captions in both languages — the RU
  dictionary ceiling counts bytes), e2e stop-id walks extend; goldens by stop id
  keep bit-identical poses where the authored target equals the old implicit one
  (parameter shifts at stops keep poses exact), re-baseline only where
  re-composed (S1, G0, G1-day, J0 + any newly composed views).
- D8 (the reply's fork): scroll travel stays CONTINUOUS (not stop-stepped) — with
  authored subjects the between-frames stop being random; control is part of the visit.
- The military gallery of 1812 stop table (R18-ux D5; positions in the committed
  frame; EYE 11.65):

  | Stop | Position | Subject | Look {yaw, up/down} | Change |
  |---|---|---|---|---|
  | M0 | [86.25, 11.65, −38] | AXIS_FAR | {30, +25/−10} | none |
  | M1 | [86.25, 11.65, −25] | AXIS_FAR | {60, +25/−15} | x 84.3→86.25 (on axis); subject WEST_BLOCK→AXIS_FAR; yaw 25→60 so a drag-left frames the west portrait block |
  | M2 | [86.25, 11.65, −12.5] | AXIS_FAR | {40, +55/−0} | subject LANTERN→AXIS_FAR; rows unchanged — pitchUp 55 keeps the 35° lantern as the drag's reward |
  | M3 | [86.25, 11.65, 0] | MONARCHS | {25, +20/−10} | z 9→0; flagged `corner` |
  | M4 | [88.5, 11.65, 13] | ST_GEORGE_DOORS | {20, +10/−10} | none |

  The rail becomes one axial dolly: run M0..M3 is axial (x = 86.25 to float rounding); run
  M3→M4 is the chord (2.25, 0, 13), 9.8° off axis, straight to the door stop. Segments
  13 / 12.5 / 12.5 / 13.2 m — an even rhythm at the R19-ux 2380 ms (approximately 5.5 / 5.3 /
  5.3 / 5.5 m/s average). Presses 1–2 remain a locked dolly. Press 3 turns toward MONARCHS;
  press 4 turns toward the doors, then holds that point as it approaches. These small
  departure turns use the 0.31744 distance span and the 40%-elapsed-time phase law. The
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

- **Invitation:** a first-time visitor at S0 who reads the hint and scrolls arrives
  at the gate; the door label appears as the camera settles and names the room;
  clicking it enters. No frame shows the label while the camera moves or during a
  threshold. At any entry stop after arrival, the first settled frame shows the
  caption only; a backward push shows "Back out"; forward scroll walks in silently.
  A calm two-finger roll visibly leans the camera and enters within ~0.7 s; a hard
  flick leans and springs back, never entering. Reduced motion: no lean, enter
  still fires.
- **Approach:** the S1 day capture shows the gate as a whole (arch, flanking
  columns, entablature) with the arch reading as a receding vault with light at its
  far end; ≤ 15% of the frame below luminance 10/255 (today ~40%), the darkest band
  INSIDE the arch.
- **Threshold:** from click to the first lit frame on a warm cache, the camera is
  in motion except the black card; nothing frozen; no chrome besides the title
  card. The card shows the room title + entry caption; never a spinner/bar. A cold
  cache holds the card longer, title readable. Warm-cache card ≤ 0.5 s on the
  reference device; cold deep-link first frame not worse than recorded. Reduced
  motion: two cuts, title readable. det stop captures unchanged where the pose is
  unchanged. The hash updates at the first lit frame of the destination.
- **Corridor light:** at G1 day: pilaster rhythm and vault line readable; ≤ 60% of
  pixels below luminance 10/255 (today ≈ total); sconces remain the brightest
  thing; day/dusk/night G1 means within ~1.5×; night never brighter than day.
  Arrival at G0: a vault leading to a lit junction; «dark; the square behind» is
  true-dark, not black.
- **Stair arrival:** the first lit frame shows the first flight rising toward a lit
  window wall; no single wall > ~30% of the frame; the vestibule behind the camera.
- **Movement:** G0→G2 never passes through geometry; J0→J4: the default gaze never
  swings > ~90° in one glide; the window light stays in frame from J0 through the
  climb; the eye stays 1.7 ± 0.3 m over the tread/landing under it at every frame;
  the path turns only on the mezzanine/land corners. Free look still returns
  bit-identical poses when never dragged (golden fence).

> Executed headed on the reference device in R-UX6 (2026-10-24; devlog #0004); the
> execution record is §9.1.

### 9.1 Execution record (R-UX6 device pass, 2026-10-24)

Headed Chromium 156, det noon, T1 1280×720, mains; the per-phase split read from the new
`zimny: transit` console lines (the perfLog instrument, absent from normal builds); medians
of 3 runs unless stated.

| Clause | Method | Measured | Verdict |
|---|---|---|---|
| Invitation · the hint + scroll arrive at the gate; the label settles in; click enters | observed + the begin line | the label click fires the transit (begin lines at every click) | pass |
| Invitation · no label during motion or a threshold | observed across 2+ transits | — | pass |
| Invitation · entry stop: caption only; «Back out» on a backward push; silent walk-in | observed (the smoke's contract, live) | — | pass |
| Invitation · a calm roll leans and enters ~0.7 s; a flick never enters | observed + begin line | the healthy wheel-through's begin `lean` **0.325 m** at fire | pass |
| Invitation · reduced motion: no lean, enter fires | the cut transit | begin `lean` 0.000 m; card 284 ms, total 317 ms | pass |
| Approach · S1 day ≤ 15% below lum 10/255, the darkest band inside the arch | probe (Rec. 709 luma) | **13.20%** (was ~40% at R-UX3's ruling; 0.77% recorded there pre-R-UX5) · mean 63.92/255 · darkest band #8 of 10 (the floor band before the arch mouth), 39.37/255 | pass |
| Threshold · warm card | the transit split | card **800 ms nominal** on every card (the 2026-11-01 reading-fix; the previous rows: card **283–316 ms** / 300 nominal, at-begin 284 on the resident, data +117–151 ms on the HTTP-cached rooms — historical under the 300 ms law) | remeasure |
| Threshold · the camera in motion except the black card; nothing frozen | the split's max @phase + long tasks | max @depart ≤ 18.9 ms, @arrive ≤ 18.9 ms (1–2 vsync frames); long tasks in the glides: **0** | pass |
| Threshold · the card = title + caption, never a spinner | observed (the S-A cold card, 317–717 ms) | — | pass |
| Threshold · cold deep-link first frame not worse than recorded | the split's `lit t` | gallery **736 / 947 / 1180 ms** (median 947), jordan **939 / 1014 / 1053** (median 1014) unthrottled; @10 Mbps + 40 ms: **1844** (gallery) / **2539** (jordan) — r19's row read 1,713–1,867 unthrottled and 1,869/2,860 @10 Mbps under the 1,500 ms hold law (today 300) | pass |
| Threshold · reduced motion: two cuts, title readable | the cut transit | depart skipped · arrive skipped; card **800 ms nominal** (the 2026-11-01 reading-fix; the previous row: card 284.1/300 — historical under the 300 ms law) | remeasure |
| Threshold · det stop captures unchanged | goldens | 26/26 | pass |
| Threshold · the hash updates at the first lit frame | observed | the write lands on the EXIT frame: the same frame under 'cut'; ≈ +900 ms after `lit t` under 'doorway' — the §9 wording vs the R-UX1 completion law: an owner wording call (open item) | recorded |
| Corridor light · G1 day ≤ 60% below 10/255; sconces the brightest | probe + the R-UX4 fence | **32.03%** (mean 19.47/255); sconces-remain-brightest 100% ×3 states (the R-UX4 unit fence) | pass |
| Corridor light · the three G1 means within ~1.5×; night ≤ day | probe | day 19.47 · dusk 11.89 · night 10.90 → **1.79×** day/night (R-UX4's record read 1.70× — the same residual under a different luma reader); night ≤ day per texel ✓ | recorded (owner call) |
| Corridor light · G0: a vault to a lit junction; «dark; the square behind» true-dark, not black | probe + observed | mean **24.19/255**, 7.99% below 10/255; the bands 19.5–28.7 — the junction reads lit, the back is true-dark | pass |
| Stair arrival · the first lit frame shows the flight rising to the window wall; no single wall > ~30%; the vestibule behind | observed (the J0 arrival frame) | the push-in composes the flight to the window wall (devlog hero candidate) | pass |
| Movement · G0→G2 never passes through geometry | observed (the stop captures + a wheel walk) | — | pass |
| Movement · J0→J4: swing ≤ ~90°, eye 1.7 ± 0.3, turns only at corners | tests/stops.test.ts | the eye fence over 256 samples/segment, the ≤ 90° swing fence, the walkable-rect fence — green | pass |
| Movement · the window light stays in frame J0→J4 | the complete r-ux5 shots | the seven jordan stops × day captured 7/7 | pass |
| Movement · free look bit-identical when never dragged | goldens | 26/26 | pass |

The per-phase split matrix (the medians of 3 runs; T1, det noon): warm room-to-room
depart 683–700/700 · card 283–316/300 · arrive 900–917/900 · total ≈ **1,917 ms**; the
cold `null→room` entry (depart skipped): card = the data wait (gallery 484–817, jordan
650–717 unthrottled; 1,283/2,050 @10 Mbps), arrive 917–950, total 1,233–1,784 (2,234/3,000
@10 Mbps); the post-swap frame (the first draw with the new resources) **15.6–66 ms** warm,
**33–66 ms** cold; the resident's own entry reads `data at-begin`. The settle cadence at
the eleven stops: **16.5–16.8 ms** everywhere (the vsync floor), draws 5–124 (≤ 250), tris
5,102–11,046 (≤ 1,000,000), zero post-settle long tasks. The paused-pass quirk (R-UX2's
parked item): reproduced — the pass's budget persists across the pause, so a single nudge
after a 1.0/0.5/2.0 s pause FIRES the door with the lean **0.008 / 0.057 / 0.000 m**
(the healthy wheel-through: 0.325 m) — the numbers recorded for the owner's re-tune call.

## 10. Dispositions (RULING — owner, 2026-10-22: **all eight defaults accepted**)

- **D1 — Chrome copy:** door label «Enter/Back out · <room title>» replacing the
  DEC-031 prompt copy + the hint verb fix. RULED yes.
- **D2 — The throat's far light:** warm lamp glow. Rec: warm (foreshadows the
  corridor's lamps; light-is-the-feature). Default: warm.
- **D3 — The title card:** room title on the black threshold for human transits,
  min dwell 800 ms (the 2026-11-01 owner reading-fix over the R-UX1 ~300 ms; §4).
  Rec: yes (the only indication that is also a museum object: a
  room label). Default: yes.
- **D4 — Prefetch:** neighbour fetch + staggered transcode at arrival-settle
  (bytes ahead of need; ≈ 10 MB RAM worst case). Rec: yes — the budget law calls
  >2 s a failure to fix; this is the fix. Default: yes.
- **D5 — Corridor day light:** (a) composite day/dusk at the encode + white points
  first; (b) re-bake with lamp power + daylight portals; (c) accept the cave.
  Rec: (a), escalate to (b) only if the pilaster rhythm stays unreadable. Default: (a).
- **D6 — Camera gaze law + stop sets:** authored per-stop subjects with world-space
  target interpolation; corridor junction stop; real mezzanine turn stop;
  feet-on-treads heights; J0 at the flight's foot; on-rails + free look kept, free
  roam still rejected. Rec: yes, as one authoring pass with captures. Default: yes.
- **D7 — S1 re-composition:** move back to frame the gate pavilion (its golden
  re-baselines). Rec: yes. Default: yes.
- **D8 — Wheel travel:** keep continuous scroll travel (vs stop-to-step). Rec:
  keep continuous. Default: keep.

## 11. How each touch re-baselines the gates

- Goldens: the deliberate re-compositions (S1, G0-arrival class, G1-day, J0 and any
  newly composed views) re-baseline once, recorded; everything else
  pixel-stable. The room goldens seeded by stop id stay bit-identical where the
  stop pose is unchanged (parameterisation at stops is id-exact).
- e2e: the r18 stop walk extends to the new stop ids; any test pinning ?cam=
  numbers or stop INDICES (not ids) audits list at implementation.
- Unit fences: the purity gate (rail/look/wheel-edge/edge-prompt stay pure); the
  new throat + beat machinery live on the host/three-free law modules it needs.
- Budgets: throat = a few hundred triangles (declared ≤ ~500), zero textures, zero
  custom slots; the beat/glides add no per-frame allocations; the RU chunk counts
  the two new/diffing captions + two title renders against its 12,000 ceiling.
- det/transit FSM: the beats drive through the FSM deltaMs; the reduced-motion cuts
  ride the existing cut law.

## 12. Implementation plan (split never widen; post-disposition)

- **R-UX1 — the threshold beat + prefetch** (world/airlock phases depart/card/arrive
  + exposure law + prefetch chain + DEC-017 rewrite; the pause becomes motion).
- **R-UX2 — the door label + hint copy + wheel-pass lean** (DEC-031 amendment; i18n
  keys; the lean law pure + host wiring).
- **R-UX3 — the throat + S1 re-composition** (procedural throat on the square,
  authored S1 gaze; golden re-baseline S1).
- **R-UX4 — the corridor light** (encode composite + white points/gains or the slow
  bake by D5; goldens G1; banding inspection).
- **R-UX5 — the stop authoring pass** (gaze field + authored subjects + corner
  stops + feet-on-treads + J0/vestibule; capture-framed; goldens + e2e updated).
- **R-UX6 — close-out** (DEVICE PASS: per-phase transit timing split logged via
  perfLog — the last open NEED; devlog; STATE/ROUNDS sync; the acceptance script of
  §9 executed headed on the reference device) — landed 2026-10-24, devlog #0004.
- Forbidden in all: the §8 weight law, the URL grammar, tier semantics, budgets
  (fixed by art/tier only), Blender-in-CI, the basis row.
