# turn-preview — the J1b gaze pre-turn (2026-11-23)

The owner's ask right after the jordan-next merge: the THIRD stop (J1b, two Forward clicks)
moves its camera rotation a bit right and up, ≈23% — so the FOURTH stop's ceiling gaze
won't seem too much. Main direct, solo-lane (the trivial-mechanical routing).

- J1b's subject: FLIGHT2_SCONCE [75.1, 9.5, −85.5] → **FLIGHT2_TURN [76.0, 10.1, −83.8]** —
  23% of the angular way from the sconce toward the chandelier's crown (the sconce stays in
  frame left; caption j1b unchanged). The pitch 15.3° → 18.8° up; the azimuth −39.4° →
  −28.6°.
- The swing J1b→J2: 63.7° → **52.8°** — the ~58° design frame holds again; J2→J2b 28.7°.
- The sconce's own law is untouched: the fixtures bake rig keeps SCONCE_GAZE_POINT
  (jordan_fixtures.py); the fixtures test's GAZE_POINT citation re-pointed from the
  contract (whose constant is now the turn gaze) to the rig's own file.
- The measured: JS 289,443 (the literal −4 B) · vitest 1,238 green · tsc 0 · the J1b day
  capture verified (the probes/j1b-turn-preview.png lane file).
- The FULL gate stays with the LAST merging session (deferred NOT waived).
