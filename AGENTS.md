# AGENTS.md

**Zimny** — a stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg) for the web. Every phase ends at a public URL. Work is done by AI agents under the owner's direction: write for agents — checklists over vibes, tests over "should work".

Read order before touching anything: `README.md` → `ROADMAP.md` → `docs/charter.md` → `docs/decisions.md` → `docs/architecture.md`.

**Standing situation to read (any task, any room; the owner's directive).** Before answering
or planning, read `docs/STATE.md`'s **Standing protocol → "Standing situation — the
repair-cascade shape"** entry (measured precedent: the rastrelli-gallery RG-F1 round,
2026-11-05/06 — six class rulings in one round; the full 240-row census after them). For
briefs, agents, and relay replies alike: surface that situation to the creative model with
the round's own numbers and let it decide the disposition independently — the entry marks
the situation, not a procedure.


## Operating rules

1. **The room is the unit.** Plan, budget and ship per room; a phase ends only when its URL is live.
2. **Phases split, never widen.** Lifetime cap: ≤ 7 rooms. Charter non-goals are binding; changing them requires an ADR.
3. **Budgets are CI-enforced contracts.** A failing budget is fixed by changing art or tier — never by quietly loosening the number. **Before planning any round, read `docs/budget-ledger.md`** — the one authoritative reservation table (committed costs per named snapshot + the open branches' reservations against the shared envelope). Declare your round's reservation row in it BEFORE the first commit against shared lines (JS gzip / RU chunk / basis / room caps); the INTEGRATING session updates the ledger at every merge and release abandoned reservations; **DEC numbers are assigned by the integrating authority** — a parallel branch parks its DEC-ready row and never guesses the next number from an old count. A declared allowance (~+3,000 B gz) is a request against a finite balance, not a recurring entitlement: it must fit the remaining envelope beside the other open reservations (the working operating ceiling class ≈ 285,707 B of the 350,000 fence — ratification pending, `docs/design-project-course.md` §1; the numbers themselves live ONLY in the ledger, not here).
4. **Assets are code.** Every committed binary in `public/assets/` must regenerate from a committed script in `tools/`. Never hand-edit built artifacts.
5. **Relay briefs.** `docs/briefs/` holds only open briefs; delete after integration and log the round in `docs/briefs/ROUNDS.md`.
6. **Licensing.** No photography of real interiors as textures; every source cited in `ATTRIBUTIONS.md`; every artistic deviation recorded in `docs/artistic-license.md` in the phase it appears.
7. **Git hygiene.** Stage only files you authored; never commit `.DS_Store`, build junk or `probes/` scratch.
8. **Core stays core.** Adding a room never touches `src/engine/` or `src/world/`; if it feels like it must, stop and raise the question instead of hacking through.
