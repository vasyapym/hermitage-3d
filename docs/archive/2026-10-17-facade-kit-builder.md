# 7 — Facade kit builder — code relay (src/procedural/facade-builder.ts)
Opened 2026-10-17 (row date) · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief: round-7 · vault projects n/r · DEC-ids: none owned
## Ask
Code relay for the facade kit builder src/procedural/facade-builder.ts.
## Relay shape
- Code relay (brief round-7): builder → accepted near-wholesale.
- Orchestrator: surround-opening correction; main.ts wiring; 11 builder gates; validate green.
## Verdicts
Accepted near-wholesale:
- Own concat-merge over primitives (BufferGeometryUtils excluded by the import rule).
- Per-part geometry memoized.
- Crash-at-boot on ceiling overrun and on byPart↔placements mismatch.
- Static instance matrices with computeBoundingSphere.

Orchestrator correction: surround openings now fill the envelope up to the head ornament (openH = sy − rise). The draft's internal sill/band stack shrank every recess by ~0.35 m off the design row table.

Orchestrator wiring in main.ts:
- South massing front rebuilt from the solved sections. The Phase 0 card model put risalits at x −95…−65 with a 35 m pavilion; the spec's axes demand −105…−81.2 / 81.2…105 and an 8-axis portal.
- Walls recoloured pale green 0x7dab93 (owner palette; §12 owner pass pending).
- The kit fades with the massing (transparent → opaque flip at settle).
- Fitted directional shadows return (1024², bias −0.0001, normalBias 0.25).
## Measured
- 2026-10-17 · validate green (measured): 102 tests, 155 026 gzip of 350 000 (+19 KB, allocation ≤30 KB held).
- Projected, not measured: ≈60 draws with shadow pass; kit ≈55 k tris, half the round-5 ceiling. Real draw/tri counts await the device pass.
## Hunt / found / fixed
- Found: every recess shrank ~0.35 m off the design row table → fixed by openH = sy − rise.
- Found: the Phase 0 card-model geometry (x −95…−65, 35 m pavilion) contradicts the spec's axes (−105…−81.2 / 81.2…105, 8-axis portal) → fixed by rebuilding from the solved sections.
## Gates
- Passed: 11 builder gates; validate green.
- Owed:
  - device pass for real draw/tri counts;
  - §12 owner pass on the 0x7dab93 palette (pending → owner).
## Mentioned elsewhere
- Round 8: its 21 gates land on top of this round's 102 tests (→ 2026-10-17-notes-page-v1.md).
## Sources
- docs/briefs/ROUNDS.md · round 7 · physical line 28 (1321 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- Integrated: src/procedural/facade-builder.ts, tests/facade-builder.test.ts, src/main.ts.
