# jordan-bands — the day state's upper-tier wall bands (2026-11-16 → 2026-11-17)

The parked row `docs/parking-lot.md` «The day state's upper-tier wall bands (the Jordan
Staircase)» taken up as a PARALLEL lane: the Fable 5.1 diagnosis relay (brief 2 of the vault
`03_projects/hermitage-3d-2026-11-16`), the enumerate-first census, the fix (the per-wall/
per-tier representative split + the encode dark-end), the owner's eye read «it is good»
(2026-11-16, the served before/after page — the standing screenshots-HTML rule's first use).

## The diagnosis (what the bands ARE — the census's ruling, the corrected signs)

Three layers + a contrast frame; the hour blend was already refuted by the owner's June-noon
det test. The census (512²/32s preview plates + a world-only falsifier; the committed census
jsons live in the local stage cache; the instrument: `tools/probes/jordan-lm-census.py`):

- **Layer T (transport, absolute):** the whole north wall field is sky-blind (coplanar with
  the 12 apertures → zero sky solid angle) and sun-blind (an interior north-window wall is
  never sun-lit); it lives on bounce. The upper tier (y 13–16.5) is the worst-served band:
  the flanks baked 0.0454 raw (stored 89.4) vs the spandrels 0.1965 (176.5) — the field's
  darkest wall bins, framed above by the cornice and beside by the blown whites.
- **Layer P (policy, relative):** the 16 shafts + 16 bases shared ONE representative's cells
  (the BAKE_TEMPLATE_INSTANCE centroid law picked the east-wall shaft at (92, −76.6)); the
  12 window frames shared the lower-tier frame's bright cells. The decoupling's visible sign
  is WALL-DEPENDENT: the north shafts carried the east rep's brighter cells (Δpolicy day
  +0.093 — the shafts read LIGHTER than the field), while the east shafts read darker than
  their own flanks (−6…−15.5, worst at dusk/night). Both are the same shared-rep defect.
- **Layer E (encode):** the 28-px cells + ETC1S q128's dark-median loss (−22 at stored ~70)
  blockified the dark tier into legible bands (the slice-1 eye flag's class).
- **The contrast frame (H4):** the frames (0.5745) and the reveals (2.12–2.58 raw) clip to
  stored 255 beside the 89-stored flanks; the pane cards emit at 3.0 — the eye exposes for
  the windows and reads «evening».

**The corrected transport story:** the walls are SKY-fed (~90%) — the sun adds only ~+10% to
the wall fields (the day-vs-world-only census deltas; the world-only ratios: south/north
1.68, floor/north 2.02). The committed «sun-bounce-fed / the swap glass throttles the sky»
note was a muddled 2c record: the swap passes diffuse + shadow rays transparent (verified in
the node graph), the north wall's blindness is geometric (coplanarity), not the glass.

## What was measured and buried

- **F2 (the world lift) — BURIED by its own gates, the owner's call 2026-11-16:** the
  decision plates (world 5.0/5.5/6.0) lifted the flanks +23.3/+35.0/+46.7% (the gate ≥ +25%)
  but breached the encode gates at EVERY step — clip 5.09/6.81/9.04% (gate ≤ 3.0%), halo
  1.80/1.81/1.83% (gate ≤ the committed 1.51%): the lift pushes the pools and the blown
  whites over W. The world stays 4.0.
- **F4 (the pane day 1.0 → 0.6) — declined by the owner's eye** (the window cards stay at
  the authored 3.0; the honest sky light).
- **The relative tier gradient (flank ≈ 0.23 × spandrel) — NOT this round's reach:** it is
  transport geometry (the coplanar sky-blindness + the cornice shadow). The 2b wall
  articulation round owns it (parked; the door-heading/2b coordination note stands).

## The fix (landed)

- **F1 — the per-wall/per-tier representative split** (`tools/bpy/jordan.py` + the gates in
  `tools/gltf/jordan.mjs`): `pilaster_n/_s/_e` (7/5/4), `pilaster_base_n/_s/_e` (7/5/4),
  `window_frame_lo/_hi` (6/6) — bake.py's centroid law now runs INSIDE each group. Cells
  3,150 → 3,230 (≤ warn 3,400); drawn tris 21,872 unchanged; toolchain draws 19 → 26 (≤ 60);
  the glb 237,556 → 241,864 B. The picks + runner-up dist² are logged into the bake summary
  (`reps`) — the east group's tie (dist² 6.759987 vs 6.759997) resolves by float order, the
  frame ties by name; both visible in the log.
- **F3 — the transcode dark-end** (`tools/reencode.mjs`): qlevel 128 → 255, clevel 1 → 2
  (jordan is the only percentile room). The lm ktx2s: day 358,260 → 469,019 B, dusk
  299,077 → 388,348, night 260,617 → 338,168 (the set 1,195,535 ≤ the design's 1.35 MB cap).
- The day/dusk/night re-bake chain (one pass, quiet + mains, the owner's go): the committed
  `tools/bake-logs/jordan.{json,md}` rewritten — the bake rows carry the new layout sha
  `2a9978bb…`, the reps, and the wall-seconds. The W bands HELD (day wRaw → 0.45, dusk →
  0.35, night → 4.0; the gains 2.22/2.86/0.25 unchanged — `lightmap-look.ts` untouched,
  JS +0 declared and held).
- The dusk/night sconce-glow class (the shared north cells carry the 79.0 sconce's rig glow
  to all seven piers; the real wall has three): **accepted by the owner's eye** — the read
  is the torchère light climbing the piers (DEC-026's class). The bars' residual
  day-east-end deltas (the piers 86.8/90.925, −9…−14 on screen) — the per-wall representative
  cannot carry per-pier variation; owner-accepted as-is.

## The instruments (committed)

- `tools/probes/jordan-lm-census.py` — the census (the bands' ruling table; the plates are
  produced separately, never by this script).
- `tools/probes/jordan-bands-capture.mjs` + `jordan-bands-bars.py` — the 24-frame battery
  (J1b/J3/J4 × portrait/landscape × day-golden/day-noon/dusk/night) + the projected-region
  bars. The baseline ran FAIL (B1, B7east) as the falsifier required; the after-run: the day
  B1 passes at the visible piers (−3…−4.8, was −7…−17), the sconce-glow and the east-end
  residuals stand — owner-accepted.
- bake.py's decision-plate overrides (`--res/--samples/--world/--sun/--dump-layout`) + the
  representative pick logging. The sort never compares RNA objects (the exact-tie TypeError
  the worldonly plate caught).
- The bars' calibration notes: the flank rects cleared of the architrave/pier overlap
  ([1.30, 1.48] — the architrave ends at 1.28, the pier face starts at 1.5); the B3 screen
  calibration does not transfer through the oblique projection + the display transform — the
  census owns the bake-side tier ruling; the screen bars are the before/after deltas and the
  east check.

## The declared golden flips (at the merge)

jordan J4 day/dusk/night (the layout change re-bakes everything jordan); possibly J3 (the
east tie-break shows in its framing). The goldens re-baseline at the MERGE only (the wave
precedent); the FULL e2e/golden gate rides the last-merging session.

## The dark-median re-measure (the owed item, 2026-11-17, unblocked at the wave's close)

- The instrument: `tools/probes/jordan-dark-median.mjs` (committed) — the dry row from the
  bake EXRs (the reencode formula, the per-cell stored medians, Blender headless) paired by
  cell index with the published ktx2's decoded texels (the repo's basis transcoder in Node,
  cTFRGBA32). Two statistics over the allocated-interior population, both sides the same
  statistic: the GLOBAL (every interior texel) and the DARK (the cells whose dry per-cell
  median sits in (10, 100] — the 2c's «dark-median at stored ~70» class; the ~0 black cells
  — the metallic gilt's diffuse — excluded as degenerate).
- **The verdict: PASS at every state — global −1 / 0 / −1, dark +1 / 0 / −1** (the day's
  dark population 314 cells · the dusk's 1,527 · the night's 2,385). The q255/clevel 2
  bought the dark end back; the F3 target ≥ −10 holds with an order-of-magnitude margin.
- **The instrument laws (the bugs the re-measure caught):**
  - ORIENTATION: the transcoder's cTFRGBA32 output rows are TOP-DOWN while the atlas is
    bottom-up («row 0 at v=0») — the ktx2 sample reads row (RES−1−y). The non-flipped read
    prints a phantom loss (day −34 · dusk −18 · night −18) — the same artifact class as the
    2c's recorded −22/−16 numbers, which this instrument cannot reproduce on the same dry
    row (the q128 A/B: the dark +1): the 2c's numbers were almost certainly the same
    mirrored-read artifact.
  - PAIRING: the population's order is the cells.json file order (the pairing key) — a
    positional sort scrambles the dry↔ktx2 pairs (the day's dark median printed 0).
- The flags' measured effect: q128 vs q255 on the same dry — the medians tie (±1); the
  per-texel deltas mean ~0.7 (the q255 the truer decode); the +267 kB is the price of the
  marginal per-texel fidelity — kept (a revert would buy nothing measurable).
- The dead ends, recorded for the next session: `require()` of the transcoder returns an
  empty namespace (the repo's type=module — copy it as .cjs); `--python-expr` breaks on the
  multiline scripts (write a temp file, pass `--python`); the KTX2File decode API =
  isValid / getWidth / getImageTranscodedSizeInBytes(mip, layer, face, fmt) /
  startTranscoding / transcodeImage(dst, 0, 0, 0, 13, 0, −1, −1), with initializeBasis()
  after the runtime init (the KTX2Loader's exact pattern).

## The displaced parked row (verbatim, the pre-fix text)

> - **The day state + s upper-tier wall bands (the Jordan Staircase; PARKED 2026-11-16, the owner + s sighting + the decisive test):** the upper parts of the north wall + s pilaster strips and the zones flanking/below the upper windows read as dark evening-like bands at every hour — at night the read is consistent (all-dark), at day it reads wrong. MEASURED: the owner + s June-noon det test (`#/jordan?at=2026-06-22T12:00:00Z&det=1`, one-hot day) KEPT the bands → the hour-blend hypothesis is REFUTED; the bands live in the DAY lightmap itself (the screenshot: IMG_4685.PNG, the November 10:52 deployed view). Mechanism candidates, ranked: (a) the day bake + s upper-tier underlight — the sky path is throttled by the swap glass (the 2c-measured fact: the world ×4 barely moved the diffuse walls; the walls are sun-bounce-fed) and the ~15° sun paints the floor/stairs, not the y 13–16.5 tier; (b) the pilasters + centroid-shared lm cells (the BAKE_TEMPLATE_INSTANCE centroid law: all 16 shafts carry the representative + s baked shading — the upper rows dark at the representative propagate to every shaft); (c) the lm cell-patchwork legibility on the pale walls (the slice-1 eye flag, never dispositioned). Levers for the fixing session: the day sky + s reach to the upper tier through the glass (the swap transmission or a reveal-side path), the upper tier + s direct exposure in the bake, the representative-cell policy for the shafts. The next session starts from the sighting conditions (the screenshot) + the June-noon persistence fact; the door-heading/2b wall-articulation rounds touch the same wall — coordinate.

ARCHIVE-APPEND 2026-11-26 — the merge record's facts from the retired STATE bullet: merged 34e708c (the wave's slot 1/4); F1 the per-tier rep split + F3 the transcode.

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **jordan-bands — RELEASED** | the day upper-tier bands fix (the parked row): F1 the per-wall/per-tier representative split + F3 the lm transcode q255/clevel 2; declared JS +0 gz · RU +0 · basis/exterior 0; the jordan room cap absorbed the lm delta (payload 1,206,199 → 1,484,261 of 7,000,000; the dusk/night re-bakes were declared required by the layout change) | LANDED 2026-11-17 — spent, released; the merge + FULL gate + the golden re-baselines (J4 ×3, +J3?) ride the last-merging session |
