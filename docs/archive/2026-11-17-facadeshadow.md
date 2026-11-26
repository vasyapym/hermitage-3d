# facade-shadow — the round record (opened 2026-11-17; the fix landed on the lane the same day)

The owner's night facade sighting (IMG_4688, the square's boot view ~22:06 autumn): dark
~0.3–0.4 m square patches on the pilasters/window slots at ONE height across the whole
facade, read as «the shadow of a lamp which doesn't exist on columns»; the real lamps are
only the two throat-slab fixtures (src/world/throat.ts, LAMP_SLAB).

## The mechanism (bisected, the owner's eye ratified)

The patches are the night lattice's **dark-level pane cards' own near-black surfaces**
(`src/procedural/night-lattice.ts` `paneMaterial('dark')`: color = RECESS_HEX ≈ the
linear [0.017, 0.019, 0.024], emissive 0; the level is a deterministic hash of the
placement id — 34 % of every row's slots, `src/world/night-facade.ts:60-69`). The cards
stand 0.01 in front of their recess panels while the hemisphere's ground term warms the
wall (`src/main.ts` ~line 850, the `warmGround(..., WINDOW_WARM_LINEAR, wNight)` law — the
night wall's warm read is law, not a defect); the black cards on the warm-lit wall read as
impossible shadows. The hour blend was never a suspect (the owner's det test held the
patches at one-hot night); the sun's intensity is 0 at night (no real shadows).

The bisect (the probe `tools/probes/facade-shadow-capture.mjs`, four configs):
- `no-lattice` (the pane cards hidden): 15,494 px changed in a band y 529–693 — the rows'
  band = the symptom zone; the patches vanish.
- `lit-recess` (the recess panels painted white): 158 px — the cards fully cover their
  recesses, so «dropping the cards» is a visual no-op (the recesses behind are the same
  dark) — this ruled the brief's «drop the stamp» option out.
- `no-warm-ground` (the warm tint dropped): 153,140 px — the global term, not per-slot.

The brief's first menu («light/shade only where the real fixtures are» / «drop the stamp»)
does not apply to the found mechanism: the warmth is the designed uniform ambient, and the
stamp is visually redundant with its recess. The actual lever is the dark cards' TONE.

## The fix (landed on the lane; the owner's eye «yes it is good»)

- `src/world/night-facade.ts`: `DARK_PANE_TONE = [0.37, 0.36, 0.35]` (linear) — the wall
  dressing's albedo (DRESSING_HEX ≈ [0.73, 0.72, 0.69] linear) × 0.5, NEUTRAL on purpose:
  the warm hue comes from the light (the same that warms the wall), so the card cannot
  out-salience the wall at equal luminance. The first probe (the warm tint
  [0.37, 0.21, 0.09]) rendered the cards' blue channel to zero — the orange salience read
  stronger than the luminance ratio warranted — replaced by the neutral albedo.
- `src/procedural/night-lattice.ts`: the dark cards' color = DARK_PANE_TONE; the dim/bright
  cards unchanged (RECESS_HEX behind their emissive).
- The measured: the card/wall luminance ratio ≈ 0.71 (the target 0.5 was the design guess;
  the AgX tone curve lands the neutral albedo at 0.71 — the dimmer window, not the hole).
- The day look: byte-identical by construction (the lattice hides outright at
  wNight === 0, `latticeVisible`), asserted by the day-noon capture (`probes/facade-shadow/
  day-noon-patched.png`) and the committed determinism rows.
- The budgets: JS 286,070 gz = the lane base 286,053 + **17 B** (the tone constant + the
  material line); RU 7,474 (+0); validate GREEN.
- The tests: `tests/night-lattice.test.ts`'s two pins amended to the new law («the dim-tone
  law» replaces «the dark level indistinguishable from the recess» — the color computed
  from DARK_PANE_TONE, no hardcoded hex).

## The goldens (the expected flips, DEC-ready)

`golden-square-d-s0-dec-night` flips by the tone change (the S0 night framing is exactly
the probe's framing). No other golden should move (the day lattice hidden; the dusk's
wNight < 1 → the blend... the dusk's lattice rides wNight — the dusk capture may drift
sub-threshold; declared flips: **d-S0-dec-night only**, the DEC number from the
integrating authority, no self re-baseline).

## Not verified (the lane's limits)

The patch↔slot mapping was read from the phone shot, not measured per-slot; the dark
level's hash distribution over the visible row is not enumerated; the AgX ratio 0.71 was
measured on the probe's exposure, not the owner's phone exposure (the eye ratified the
look regardless).


## Gates — passed · deferred-not-waived → who carries · owed
Scope-local: validate GREEN on the lane's branch (JS 286,070 on their base) and on the merged tree (JS **286,021** — the composition with rg-move's −55 lands +23 over 285,998, the drift +6 over the lane's +17; the dictionary interactions compose non-additively) · RU 7,448 · vitest 1,165/1 skipped.
The FULL e2e/golden battery = THIS merge's (the one deferred from the rg-move merge; 1.7 h): **112 passed / 4 failed — the goldens ALL GREEN, 0 flips on the reconciled tree** — the lane's declared d-S0-dec-night flip MEASURED HELD (the targeted --update-snapshots found no drift; the rendered delta under DEC-045's t=0.1 threshold — fewer flips than declared, the second such case this week after jordan-bands' ×3→1). The 4 failures = the recorded classes: smoke 176/301 + touch-rail 306 (the machine-stall class; CI green = the authority) + entrance-title's square-jump row (the row's THIRD documented stall-cadence occurrence — the negative stamp arithmetic across the jump's double card cycle; the page snapshot proves the app's state perfect — the caption 'S1 · the arch opens' settled; the row's history: CI 41362175165's twice-in-run + the hardening commits 0002ab1/13fecd9). The fixtures 1812-360 race rows PASSED this run. CI run 44107679937: the draw-calls SwiftShader known reds only → **the merge verdict PASS**.
Owed: nothing from this lane — the owner's-eye probes of the rg-move B9c laws and the B9d question live in the rg-move trail (docs/archive/2026-11-17-rgmove.md).

ARCHIVE-APPEND 2026-11-26 — the merge record's facts from the retired STATE bullet: DEC-048 the dark pane tone (the id assigned at the merge); the FULL battery VERDICT 112/4 = the recorded classes.

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **facade-shadow — RELEASED** | the night facade's dark per-slot patches: the mechanism bisected to the dark-level pane cards' near-black albedo on the hemisphere's warm-lit wall band (the four-config probe; drop-the-stamp a visual no-op — the same dark niches behind); the fix DARK_PANE_TONE [0.37,0.36,0.35] (the wall dressing ×0.5, neutral — the hue from the light); the day byte-identical (the lattice hides at wNight 0) | MERGED 2026-11-17 (0e387be) — SPENT and RELEASED; measured on the merged tree JS +23 (286,021; the composition drift +6 over the lane's +17) · RU +0; the declared d-S0-dec-night flip measured HELD (the confirm 37/37); the FULL battery = this merge's; DEC-048 |
