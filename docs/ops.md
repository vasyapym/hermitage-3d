# Ops protocol — the gate and merge blocks

What the orchestrator reads before a gate run or a merge: the budget gates, the ledger
law, the quiet-machine and gate-run laws, the golden re-baseline law, the Windows
sessions note. The open state lives in docs/STATE.md; the read map points here.


**Budget gates (CI contracts — fixed by art/tier, never by loosening).**
JS gzip total ≤350,000 (budget.mjs counts EVERY dist/assets/*.js — lazy room chunks included).
Per-room payload caps from each manifest (≤8,000,000 ceiling); exterior ≤4,000,000; shared basis
≤600,000. HUD data-draws ≤250, data-tris ≤1,000,000 asserted by CI smoke; the toolchain draws gate
counts UNIQUE primitives (naive node draws are info-only). Goldens local-only (ADR-0012); CI smoke
on SwiftShader asserts contracts, never cadence; device numbers headed only; chromium on macOS
13.7 via PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14; locator screenshots fail element-stability on
rAF-canvas — page-level capture with clip, expect timeout 60 s.


**The budget ledger (owner, 2026-11-04, standing):** `docs/budget-ledger.md` is the ONE
authoritative reservation table — committed costs per named snapshot + the open branches'
reservations against the shared envelope. Every session: READ it before planning a round (does
the declared allowance fit alongside the open reservations?); DECLARE your round's reservation
row in it BEFORE the first commit against shared lines; the INTEGRATING session updates the

table at every merge/closed candidate (and releases reservations of abandoned candidates);
**DEC numbers are assigned by the integrating authority** — a parallel branch parks its
DEC-ready row and never infers the next number from an old count. The dossier's rules live in
`docs/design-project-course.md` §3; the dossier itself is owner-ratification-pending record.


**Ops.** Session start: `git pull --ff-only origin main`, then read docs/STATE.md. Stage
own files by name; never .DS_Store, dist, probes/.
**Windows sessions:** the macOS-specific laws above (the override, /usr/bin/git, /Applications
paths) do not map 1:1 — this machine runs the win64 headless shell with NO override, and the
asset chain needs `ZIMNY_BLENDER=<portable blender.exe>` + the KTX `bin/` dir on PATH (both

version-pinned in tools/toolchain.json; the portable copies live beside the worktrees).
**The quiet-machine law (owner, 2026-10-23, standing):** this IS the 2-core reference device the
owner works on — "quiet" means no other agent sessions AND no owner interactive load (browsing,
preview, anything); any co-tenant eats the gate margins and a full gate run is valid only quiet.
Before a gate run, ask the owner if unsure; the owner's own `pnpm preview` sits on 4173 where e2e's
`reuseExistingServer` would grab it — never gate-run while it is up. Gates run on MAINS power

(battery throttling froze a baseline once — the R-UX2 1920-capture lesson).
**The gate-run law (owner, 2026-10-23, standing — amended mid-R-UX4):** the full e2e suite runs
ONCE per round, quiet and on mains; CI is the standing second gate (a different GL backend +
retries: 1). A second local run only after a failure; two consecutive failures = fix the flake,
never re-roll. (The per-round ×2 convention is retired; it duplicated the quiet-machine law's
protection and is a statistically weak flake detector — a 1-in-10 flake slips both runs 81% of
the time. The R-UX4 round's ×2 was the last.) GATE DURATION (R12 lesson, 2026-10-28): the full
chromium and golden suites run 10–20+ min at workers=1 on the reference machine — start them in
the BACKGROUND (no timeout) from the first attempt, never under a foreground timeout: a 15-min

timeout killed a chromium run mid-flight and wasted the machine time.
**The golden re-baseline law (R5, 2026-10-26):** the `golden` project matches BOTH
golden.spec.ts and fixtures.spec.ts — an `--update-snapshots` pass rewrites the historical
SCENE baselines too, not just the fixtures. The scene goldens re-baseline only by an explicit
DEC (§9.3); a fixtures-only re-baseline must restore any scene-baseline drift from git
afterwards (the R5 round restored the four square/gallery-dusk references twice).
