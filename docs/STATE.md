# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: the compaction branch `records-compaction`; the pre-rewrite pin `ff2a85ed19b41c2bda750dc1dd229e6409201daf`; the merge to main waits the owner's signal.
Budgets (the movement-ux union — the last-merging session's measure, ROUNDS row 7): JS 285,170/350,000 (the lane ≈ +1,129 — the declared +1,000, ≈ +129 over, the owner plate) · RU 7,339 · rastrelli-gallery 851,322 shipped of 2,000,000 · jordan 1,237,543 of 7,000,000 · military-gallery 3,008,700 of 4,000,000 · basis 584,862 of 600,000 · exterior 0 of 4,000,000.
The wave: square-palace (slot 1, `b5d364c`), rg-f3 (slot 2, `cb55702`), movement-ux (slot 3/3 — the FULL e2e/golden gate rode this last-merging session; landing `56aebb9` per the pinned ledger) — all PARALLEL slots MERGED, every reservation released.
Owed: the owner's eye-read of the union gate's 9 re-baselined goldens (ROUNDS row 7: «15/15 green, 0 flips», the eye-read pending).

- 2026-11-09 · MERGED square-palace (the FIRST slot of this merge wave · 7fa4892 merged into the lane at 2968ef0 · FULL e2e/golden gate + the square's dec-noon AND dec-night re-baselines ride the LAST merging session, deferred NOT waived · no e2e here) — DEC-041 class-I closure; DEC-043 assigned by this merge · P1 baseline 0.275 · P2 all-fresh 0.576 < 0.6 (the LIGHT bounds it) · snowSkyGain K = 1.5 — JS +69 (declared ≤ +400) → 284,110 of 350,000 · RU +7 → 7,339 of 12,000 · vitest 64 files 1057 passed / 1 skipped · tsc 0 — found/fixed: Sol 6.1 review RETRACTED the dec-noon-only flip reading (the 2a ground albedo moves at night too) — → docs/archive/2026-11-08-squarepalace.md

- 2026-11-09 · LANDED rg-f3 (slot n/r · PARALLEL · merged later as cb55702 · scope-local gates green; FULL e2e/golden gate DEFERRED) — no DEC; the eleven z=70 niche backs → DECLARED daylight panes (route B, no new geometry; M_PANE = 5; PANE_PAINT_RAW day (0.550,0.650,0.740) / dusk (0.360,0.400,0.460) / night 0, no ×1.14) — glb 252,312 B (+1,560) · payload 851,322/2,000,000 · textures 599,010/1,000,000 · tris 10,868 (10,856 prints were record errors) · draws 8 · JS 284,041 — 12 FAIL rows all retired-band, zero new-class (owner verdict 2026-11-09); LEVEL 84.1953 ∈ [55,90]; instruments rg-gates.py + rg-f3-capture.mjs committed as the REPLACEMENT — → docs/archive/2026-11-08-rgf3.md

- 2026-11-08 · MERGED arrows-face-tune (slot 1/3, the FIRST of three · ordinary code/records merge 5fc9a82 off branch head 25343fd · FULL e2e/golden gate rides the LAST merging session, deferred NOT waived) — DEC n/r · tsc 0 · biome clean · committed suite 1036 passed / 1 skipped (branch 62-file measure stands) — build 282,514 of 350,000, byte-equal to the finale's print (JS delta ≈ 0) · RU 7,332 byte-equal · budgets ok — found: in-tree 1042/1 on 64 files = two UNCOMMITTED gitignored scratch-probe files, one fails locally (probe25_analysis.test.ts), not the repo's — → docs/archive/2026-11-07-arrowsfacetuner25uxthearrowsfacetune.md

- 2026-11-08 · MERGED square-entry-ground (stack slot 2/3 of the three-session stack · the solo-merge ruling · FULL e2e/golden gate rides the LAST merging session, deferred NOT waived) — DEC-040 portrait witness (identity-by-reference ≥ 0.8657, yaw-only δ ≤ 12°) · DEC-041 paving/footprint, plane 600→2000 — JS +1,527 over main's 282,514 (the +2 = slot-1 arrows-face-tune constants) → 284,041 of 350,000 · RU 7,332 · vitest 64 files 1052 passed / 1 skipped · tsc 0 · biome clean — found/fixed: boot defect (?look= injection wiped by the language activation's re-seed) → applyInjectedLook() at three host sites; 7/7 declared deep-link frames byte-identical to their hashchange twins — → docs/archive/2026-11-07-squareentryground.md

- 2026-11-08 · LANDED rg-look (slot n/r · PARALLEL · merged 5c242e3 · scope-local gates green; full e2e/golden gate ran at the merge) — DEC-042 · k := 3 → 85.81 ∈ [55,90] · LM_RES 1536 · paint ×1.14 — JS 282,514 byte-equal · payload 854,491/2,000,000 · textures 603,739/1,000,000 · tris 10,868 (the 10,856 print was a record error) · draws 7/25 — found/fixed: the doorway double-cover class the old COVERED gate was blind to → canonical-coplanar COVERED + negative demos; DOOR/ORDER re-rated measured — → docs/archive/2026-11-07-rglook.md

- 2026-11-08 · OPEN rg-f3 (slot n/r · PARALLEL to the luna2 portfolio + square-palace sessions · branch rg-f3 off main 742bb3d; MERGE + FULL e2e/golden gate at the owner's notification, NOT this session; scope-local gates only · flipped: landed 2026-11-09, merged cb55702) — no DEC — budget n/r (no code at open) — facts-only relay: Fable 5.1 (no screenshots) pinpoints what the room lacks most, zero steering; briefs from 1 in vault projects v13 — → docs/archive/2026-11-08-rgf3.md

## Standing protocol

**Relay loop.** One self-contained English brief at a time to the specialist chat (no tools, no
repo); wait for the reply; salvage-integrate (never paste wholesale); validate; commit own paths
only; push; watch CI via gh CLI. One ROUNDS.md row per round (multi-relay rounds list their relay
commits in the row). Briefs are composed as .md files in the owner's vault folder
(`/Users/vasilij/Documents/vasyapym-Vault/02_projects/projects v5`) and handed over as files —
never typed into the chat (owner, 2026-10-28; not committed to the repo, not parked in
docs/briefs/). Owner reads Russian; briefs and code in English.

**Relay routing (owner, 2026-10-21).** Two tiers, declared by the orchestrator per round:
- **creative** (design docs, art/generator laws, anything taste decides) → the strong specialist;
- **mechanical** (bpy kits, wiring, docs, number-pinned work) → a cheaper fast model. Its briefs
  pin every contract explicitly; the orchestrator validates harder.
- Trivial mechanical work stays orchestrator-direct (no relay at all — the r24b/R006 precedent).

**Standing situation — the repair-cascade shape (measured; the rastrelli-gallery RG-F1
precedent, 2026-11-05/06).** A verdict-law for a repair/assembly program can be tested, hold,
and still face an UNENUMERATED task space: each newly measured class then earns its own
ruling and implementation pass one at a time (that round logged six class rulings), and the
classes close only when a single full-enumeration probe finally exists — at which point one
run lists the remainder together (the 240-row census) and the adopted laws apply to all of
them in one pass. Measured sequencing facts from that round: the enumeration ran AFTER four
class rulings; the two-frame failure class surfaced only at the assembly stage; a single
census at admission time would have seen the whole class list before the first class
ruling. The situation — not a procedure — is recorded here: how such a task advances
(enumerate-first, rule-per-class, scope reduction, or another disposition) remains the fresh
creative session's own call; the round's clean trail lives in the rg-details bullet above,
the vault texts (26/30/32/37-REPLY), and the pinned probe logs.

**Transport traps (cost a full relay each when ignored).**
0. THE WEDGED-SUBAGENT STOP (owner request 2026-11-06, the Brief-39 precedent; works while
   an agent is in its thought-loop, when queued messages go unread): the orchestrator's
   kill-switch is the server API — discover via `opencode api get /openapi.json`, then
   `opencode api post /api/session/<sessionID>/interrupt` (→ `{"interrupted": true}`); the
   subagent's harness state turns cancelled. A cancelled session is NOT revived by queued
   messages — treat as terminal: snapshot the working tree, continue on a fresh agent (the
   work state lives on disk: snapshots + probe logs). Do not pkill the shared daemon (it
   kills every session incl. the orchestrator's own).
1. RETIRED (owner, 2026-10-28): the MASKED-marker protocol. The transport masked verbatim
   numbers exactly once — the single incident that wrote this list — so the marker protocol
   (`MASKED-IN-BRIEF: keep the <name> value`) is no longer used in briefs. Numbers still belong
   in orchestrator-owned files where convenient, as ordinary content.
2. Long replies get truncated. Split whales at file boundaries; instruct: end with
   `TRUNCATED-HERE: <next file>`; continuation brief carries the adopted constants block + the
   committed file.
3. Reply budget: ~450 lines; cut at a file boundary, never mid-file.
4. Same-base `page.goto` is a FRAGMENT navigation (no reload), and a mounted room keeps its
   technique until the next exit disposes it — measurement/e2e configs must open a FRESH page
   per configuration (the round-17c measurement's first run silently re-measured config 1).
5. THE STAGE LAW (owner, 2026-11-03): every relay reply ships as a SEQUENCE of stage messages
   in the same thread, never one monologue — stage 1 = the assessment/design draw, complete in
   itself; later stages = implementation batches per file or tight family; every non-final
   stage ends `TRUNCATED-HERE: <next artifact>`, the final ends `COMPLETE`; no recap
   transitions, each stage opens on its own facts. The generation dead-air (a passive-framed
   specialist stalls mid-output with nothing yielded) is the trap this law exists to prevent.

**Brief boilerplate (copy blocks, compose fresh only the task-specific parts).**
- ROLE line (the engineering-peer frame; OWNER AMENDMENT 2026-11-03 — the fresh-session law
  stands, but never phrase the specialist as «you have no tools / no repo access»; a passive
  one-shot frame produces one uninterrupted generation — see trap 5): «You are the room's
  engineering lead for this round. The orchestrator hands you the room's committed source tree
  inside this brief and takes your work back — it integrates, runs the bake chain, and
  validates everything against the repository's own gates (build chain, budgets, the tests it
  writes from your pins). Everything you may consult is inside this brief. Every brief is a
  fresh session — carry forward whatever the reply itself needs.»
- HOUSE STYLE (binds every file): leading block comment citing the design sections implemented;
  named exports only, no default exports; no enums; `satisfies` over `as` where a literal object
  is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index
  access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
  optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100;
  tests live in tests/ (never beside modules), Vitest node style describe/it/expect, no jsdom;
  pure modules are three-free and DOM-free (regex-scannable); state laws in comments once, plain
  declarative style.
- FORBIDDEN fence (per-round «must not touch» from design §10)
  + OUTPUT CONTRACT (numbered fenced blocks per file, one rationale line each, then CHALLENGES
  bullets) + closing line: «Before answering, challenge key assumptions, consider a credible
  alternative, and check likely failure cases; give the requested output with concise rationale
  and any material uncertainties.»

**Purity gate (house standard).** Regex scan of module source — strip comments and string
literals, then assert no /from\s+['"]three/, no node:, and no document/window/localStorage/
performance/Date/setTimeout/Math.random. Reference implementation: tests/hud.test.ts (~line 229).
Applies to every pure module (sky/*, engine/tier, ui/hud, world/registry, world/airlock,
engine/ledger, world/blend, world/lm-mode, world/stop-param, content/lightmap-look).

**Verified three 0.186.1 facts** (checked in node_modules 2026-10-18; do not re-derive):
- Import paths: three/examples/jsm/loaders/GLTFLoader.js · KTX2Loader.js ·
  libs/meshopt_decoder.module.js (exports MeshoptDecoder with useWorkers(count)).
- KTX2Loader: setTranscoderPath('/basis/') · setWorkerLimit(1) · detectSupport(renderer) (sync;
  detectSupportAsync deprecated r181) · parse(buffer, onLoad, onError).
- GLTFLoader: setMeshoptDecoder · parse(data, path, onLoad, onError) — callback-style, wrap in a
  promise; `path` resolves external texture URIs. renderer.initTexture(t) forces GPU upload.
- @types/three 0.186.0 covers examples/jsm.
- `capabilities.isWebGL2` is kept hardcoded true in r186 (backwards compat) — the half-float
  renderability check works, but the extension check is the real gate.
- A KTX2Loader CompressedTexture carries `mipmaps.length === 1` + the LinearMipmapLinear
  minFilter and still samples correctly (three/ANGLE keeps mip 0); the albedo chain ships mips.

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

**Per-round read map (read only what the brief will quote; full reads only at wiring time).**
Design doc: docs/design-staircase.md. r16: §1.1, §2, §8, §10 (+src/main.ts at wiring).
r17: §4, §5, §7 + tools/asset.mjs + ADR-0013. r18: §6 + src/ui/hud.ts + src/sky/arrival.ts.
r19: §9 + docs/architecture.md (room contract) + ROADMAP.

**Ops.** Session start: `cd ~/Documents/hermitage-3d && /usr/bin/git pull --ff-only origin main`,
then read this file. Network git ops via /usr/bin/git only (local /usr/local/bin/git is broken for
network — known, do not diagnose). Stage own files by name; never .DS_Store, dist, probes/.
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

**Record shapes.** AGENTS.md rule 6 owns the record law. The habit it enforces: at every lifecycle flip, REWRITE the bullet / row / cell to the flip's shape and MOVE the displaced text into the round's `docs/archive/` file in the same commit — never append. Live state = Now + un-merged lanes + the last 3 MERGED (≤ 10 KB); an obligation that outlives its bullet moves to «Now › Owed» before the bullet leaves. Cite records by named anchor, never by line. A cap breach is fixed by moving text, never by raising the cap.
