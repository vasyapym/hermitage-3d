# facade-shadow — the round stub (opened 2026-11-17)

The owner's night facade sighting (IMG_4688, the square's boot view ~22:06 autumn): dark
square patches on the pilasters/window slots at ONE height across the whole facade, read as
«the shadow of a lamp which doesn't exist on columns»; the real lamps are only the two
throat-slab fixtures (src/world/throat.ts, LAMP_SLAB).

## The PHASE 0 draft (static reads; the bisect waits PHASE 1)

- The facade is procedural (DEC-045): no lightmap, no real shadows at night — the sun's
  intensity is 0 (src/main.ts applyEpoch; sun stays visible but dark), the night wall's warm
  band is the hemisphere's ground term tinted by warmGround(..., WINDOW_WARM_LINEAR, wNight)
  (src/main.ts ~line 850).
- Per-slot dark terms found in the committed tree:
  1. the night lattice's 'dark'-level pane cards (src/procedural/night-lattice.ts; the level
     is a hash of the placement id — 34% of slots; each dark card = color RECESS_HEX,
     emissive 0, standing 0.01 in front of the recess panel);
  2. the surround's opaque dark recess panels (facade-builder.ts surround(): the DARK box
     behind every opening);
  3. the surround's two internal 0.06-m dark fins (a vertical one at x=0 and a horizontal
     one at y = 0.62·openH — the «тяга» shade class) — geometrically too thin (~6 cm) to
     read as the ~0.3–0.4 m squares.
- The prime suspect: the dark-level pane cards / recess panels standing in the hemisphere's
  warm ground-lit wall band — the per-slot dark stamp class (the brief's candidate (i)).
- The decisive test (PHASE 1): the dev probe at the night state in the screenshot's framing;
  bisect one term at a time (hide nightLattice.group → the recess panels → the hemisphere
  ground tint) until the patches vanish; name file:lines.

## The fix shape (the round's protocol)

Light/shade only where the real fixtures are, or drop the stamp; the day look byte-identical
if the term is night-only (the lattice already hides at wNight === 0; assert with the
day/night determinism rows). The goldens: d-S0-dec-night is the exposed one — if it flips,
park a DEC-ready row, no self re-baseline.
