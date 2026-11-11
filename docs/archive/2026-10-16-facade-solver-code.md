# 6 — Facade solver — code relay (src/procedural/facade-solver.ts + tests)
Opened 2026-10-16 (row date) · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief: round-6 · vault projects n/r · DEC-ids: none owned
## Ask
Code relay for src/procedural/facade-solver.ts + tests.
## Relay shape
- Code relay (brief round-6): complete-file solver draft → accepted near-wholesale; no test block was delivered.
- Orchestrator: two corrections; wrote the 18-test gate suite per design §6; pinned the junction derivation by tests.
## Verdicts
Accepted near-wholesale: complete-file, 25-part KIT, issue-based validation, exact quarter-turn bounds math, prefix-sum axis geometry.

Orchestrator corrections:
- Sills scale to opening width + 0.40 (round-5 rule); the draft emitted unit-scale sills under large windows.
- `archRows` cast restored.

Junction derivation resolved: 8 upper + 6 lower + 6 parapet (open-corner rule at the two risalit-top corners), pinned by tests.

Assumption flags accepted:
- Lower band baseY 10.20, which fills the 10.20–11.20 band (the brief's "Y 11.2" was ambiguous).
- Facade-level placements prefixed `south`.
- Two extra validations (min axes per kind; plan-step between adjacent sections), accepted as path guards.
## Measured
- 2026-10-16 · validate green (measured): 91 tests, 136 071 gzip bytes of 350 000. The solver is not yet imported by main.ts.
## Hunt / found / fixed
- Found: unit-scale sills under large windows → fixed to opening width + 0.40.
- Found: `archRows` cast missing → restored.
- Found: brief "Y 11.2" ambiguous → resolved as baseY 10.20.
## Gates
- Passed: 18-test gate suite (design §6); junction counts pinned; validate green.
- Deferred-not-waived: none recorded. Owed: none recorded.
## Mentioned elsewhere
- Round 7: the south massing front was rebuilt in main.ts from the solved sections (→ 2026-10-17-facade-kit-builder.md).
- Round 8 (→ 2026-10-17-notes-page-v1.md):
  - crease-warning at 300 m verified against the solver (emitted, warnings[] on success);
  - the 50-axis case already fails in the solver (170 vs 210 closed against ±2 m);
  - the solver chunk was split out and shared between pages.
## Sources
- docs/briefs/ROUNDS.md · round 6 · physical line 27 (1068 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- Integrated: src/procedural/facade-solver.ts, tests/facade-solver.test.ts.
