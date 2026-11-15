# 8 — /notes page v1 — code relay (pure view-model + provenance register + gates)
Opened 2026-10-17 (row date) · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief: round-8 · vault projects n/r · DEC-ids: none owned
## Ask
Code relay for the /notes page v1: pure view-model + provenance register + gates.
## Relay shape
- Code relay (brief round-8): pure core → accepted near-wholesale; the specialist challenged assumptions and flagged docs debt.
- Orchestrator: adjudicated the assumptions, applied corrections, wrote the DOM binding and wiring; 21 gates; validate green.
## Verdicts
Pure core accepted near-wholesale:
- Provenance as a discriminated union (sourced ⇒ keys, declared ⇒ register line — compiler-enforced, not convention).
- Derived rows carry formulas instead of register ids.
- An unregistered number fails the build to an error card ("no line, no use").
- Spec audit re-checks pitch against the declared ±1 axis per section.

Specialist's challenged assumptions, adjudicated:
- crease-warning at 300 m verified against the solver (emitted, warnings[] on success);
- projectBudget arithmetic verified (kit + massing + sky, ×(1+shadowPasses)); pins 136 506 / 273 012 for massing 146 hold;
- the 50-axis case already fails in the solver (170 vs 210 closed against ±2 m), so the view audit stays as a second belt.

Orchestrator corrections:
- node:fs purity scan replaced by Vite ?raw import.meta.glob (tsconfig ships no node types, no @types/node).
- Allowance echo table rebuilt from tuples to typed objects.
- DOM binding written:
  - dl/table semantics;
  - chips: sourced keyed, declared in kit gold 0xc9a227, derived dashed;
  - a positional provenance↔cell alignment policy;
  - a jsdom-free DOM-stub gate.

Register line 'Budget allowance (Phase 1 /notes)' landed in artistic-license.md as the specialist's flagged docs debt.

Wiring:
- notes.html multi-page entry (pure DOM, no WebGL; in-app overlay link deferred to the HUD round).
- vite config input.
- README link.
## Measured
- 2026-10-17 · validate green (measured): 123 tests, 162 824 gzip of 350 000 (+7.8 KB, allocation ≤30 KB held), 3 chunks.
- The solver is split out and shared between pages; /notes serves on the preview at /notes.
## Hunt / found / fixed
- Found: node:fs purity scan unusable (no node types) → fixed with Vite ?raw import.meta.glob.
- Found: tuple-based allowance table → fixed with typed objects.
- Docs debt fixed: register line 'Budget allowance (Phase 1 /notes)'.
- The crease 234-vs-215 warning renders on the page as designed.
- The measured-elevation hunt (Пилявский) stays open.
## Gates
- Passed: 21 gates (18 view + 3 binding) on top of 102; validate green.
- Deferred: in-app overlay link → the HUD round.
- Owed: the measured-elevation hunt (Пилявский) stays open.
## Mentioned elsewhere
- None in this batch's sources.
## Sources
- docs/briefs/ROUNDS.md · round 8 · physical line 29 (2028 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- Integrated: src/content/provenance.ts, src/ui/notes-view.ts, src/ui/notes-main.ts, src/ui/notes.css, notes.html, tests/notes-view.test.ts, tests/notes-dom.test.ts, vite.config.ts, docs/artistic-license.md, README.md.
