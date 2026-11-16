# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: main @ the square-forward-gaze marks; one PARALLEL lane open — square-forward-gaze (worktree ~/Documents/hermitage-3d-square-forward-gaze, branch off main, scope-local gates, merge + FULL gate at the owner's signal).
Budgets (the verified ledger — batch-d's rebuild off the fixed-current-truth pin `4ffd0f8`): JS 285,629/350,000 · RU 7,360/12,000 · jordan 1,206,199/7,000,000 · rastrelli-gallery 855,438/2,000,000 · basis 584,862/600,000.
Owed: the machinery round per DEC-045 (the exterior asset program; geometry rounds wait behind it) · the jordan 2b wall articulation (the next slice) · the axial photograph (the fixture FORM) · the doorway residual parked (docs/parking-lot.md) · the draw-calls SwiftShader CI debt (the pre-existing class).

- 2026-11-16 · the records lane synced (the compaction landed on main via the merges `dae337d`/`7e61efd`; the ledger regression fixed at `4ffd0f8` — the lane's frozen pre-wave snapshot had carried over main's current rows, restored from the verified records: JS 285,629 · RU 7,360 · rastrelli 855,438/852,888 · jordan 1,206,199) — batches 25/26/27 (rg-f4 · square-palace-2 · jordan-slice-3 · movement-ux · transit-band · doorway-reads · owner-steer) + batch-d (the ledger rebuilt to the contract shape; the 11 lost numbers appended to their round archives) integrated, VERIFY PASS each — no DEC, docs-only, zero budget delta — → the pin `88c6ef1` (the lane's trail; the displaced text lives in the round archives)

- 2026-11-15 · the wave finale's FULL GATE VERDICT (the jordan-slice-3 merge — the fast-forward `5583c2c..b747e11`, the last merging session; the finale records + the golden re-baselines landed at `a352aa3`) — the full chromium 106 passed / 10 failed (2.0 h): the 10 = the 7 EXPECTED golden flips (jordan J4 ×3 + rg-f4's gallery G1 day/dusk + square-palace-2's dec-noon) + the 4 walk rows (smoke 176/271, touch-rail 269/304) = the IDENTICAL recorded machine-stall class of the 2026-11-14 finale («4/4 CI GREEN but local-red at ~1.2 s frames — machine class, not code»; CI green = the authority); the goldens: the 6 expected flips re-baselined + eyeballed → the confirm 37/37 GREEN (11.7 m), no fixtures drift; the CI = the one known reds class — the draw-calls budget assertion (smoke 126, SwiftShader — the pre-existing CI-only debt) — → docs/archive/2026-11-15-jordanslice3.md

- 2026-11-15 · MERGED square-palace-2 (slot 2/3 of the wave · origin/main 94f0cd8 merged into the lane, merge sha n/r · validate GREEN; the FULL e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived) — DEC-045 detector pin t=0.1 · golden-dec-noon flip ratio 0.40 · wiring ≤ 2,048 B gz (declared) — JS +0 → 285,631 byte-held; RU/payload/draws/tris +0 — found: the detector blind to tone (61 % of frame, measured), fixed by the t=0.1 pin + the #touch-rail hide; the dec-noon re-baseline DEFERRED to the finale's quiet battery, NOT waived — → docs/archive/2026-11-15-squarepalace2.md

- 2026-11-15 · MERGED rg-f4 (slot 1/3 of the three-lane wave · fast-forward a32b70c..82e1756 · validate GREEN; the FULL e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived) — DEC-044 dial day 2.7 / dusk 0.9 / night 0 · G1 floor day +21.2 (≥ +20) · night 45.8/86.5 byte-held — payload +1,614 → 852,888/2,000,000 · textures +1,566 → 600,576/1M · JS/RU/basis +0 — found: the RG-F3 pane strengths 0.020/0.006 emitted ~nothing, fixed by the bake.py PANE_EMISSION dial; golden-gallery-{day,dusk} re-baseline at the finale, night byte-held — → docs/archive/2026-11-15-rgf4.md

- 2026-11-15 · LANDED jordan-slice-3 (slot n/r · merge n/r, rides the owner's directive, the last merging session · gate: scope-local validate GREEN; FULL e2e/golden DEFERRED to the merge) — DEC n/r · bands day [0.2,0.45] W 0.45 / dusk [0.35,0.45] W 0.35 / night [4.0,4.5] W 4.0 · census p50 118.3 / 72.5 / 40.1 — JS −2 → 285,629 (declared ≤ +0); payload 1,190,510 of 7,000,000 — found RIG_STATE_SCALE was a gate not a multiplier (fixed, day/night byte-identical); expected re-baseline: jordan J4 day/dusk/night, rg-f4 golden-gallery-{day,dusk}, square-palace-2 dec-noon — → docs/archive/2026-11-15-jordanslice3.md

- 2026-11-16 · square-forward-gaze OPENED (PARALLEL, worktree, branch off main): the owner's drag+Forward feel item — at S0 a manual look + Forward rides the B9 arc ≈48° right onto the Column's pedestal framing (S0b), the manual offset composes on top (re-clamped, never reset); the T5 2026-11-15 «the pans KEEP» verdict is the ratified context; the creative rules the transit-gaze law (remove/damp/other). Scope-local gates; merge + FULL gate at the owner's signal. Vault: 03_projects/hermitage-3d-2026-11-16; briefs 1

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
