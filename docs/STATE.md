# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: main @ the rg-audit merge (the wave's LAST slot — the FULL e2e/golden gate + the CI verdict + the due re-baselines = this session's battery; the wave: square-gap DEC-049 the machinery · jordan-fixtures the fixture form · rg-audit DEC-050 the junction law). Budgets (the merged tree's pnpm build && pnpm budget): JS 287,527/350,000 · RU 7,427/12,000 · jordan 1,561,106/7,000,000 · military-gallery 3,008,700/4,000,000 · rastrelli-gallery 1,147,151/2,000,000 · basis 584,862/600,000 · square KIT row 81,539/1,500,000.
Owed: the jordan 2b wall articulation (the next slice) · the axial photograph (the fixture FORM) · the doorway residual parked (docs/parking-lot.md) · the draw-calls SwiftShader CI debt (the pre-existing class) · the square's successors (the GS junction massing, the HQ's night lattice, the day-look census — docs/archive/2026-11-19-squaregap.md «Owed») · the Rastrelli Gallery's parked relief items (the impost cove's texel starvation, O5 the tonal split, the axial-photo evidence pass, the niche archivolts — docs/archive/2026-11-21-rgaudit.md «The parked items»).

- 2026-11-21 · LANDED **rg-f5** (PARALLEL to the owner's other in-flight agents: worktree `~/Documents/hermitage-3d-rg-f5`, branch `rg-f5` off main c05a451; **merge + FULL gate at the owner's signal — scope-local gates only, ALL GREEN here**) — the Rastrelli Gallery's dado + panel order (the objective census relay → THE ONE = the blank wall fields; Fable-class verdict 1, the design drawn, the orchestrator integrated): **the exported-never-baked wall articulation** (the reciprocal of DEC-050): the dado datum rail (the sill-ledge section continued across the piers, through the passage, around the end wall; the facade ends cap-less) + 56 mitred framed panels (22 under-niche, 40 passage, 4 end-wall flanks — the tall panels skip the 2 mouth-sconce bays), riding the shell's roster with **ADOPTED TEXCOORD_1** (one host per face, the exact affine map; zero atlas cells) and the fillet-shade device (M_SHADE = stucco × FILLET_AO 0.62; the DEC-042 note parks at the merge) · **ALL THREE PLATES BYTE-IDENTICAL** (21070dfc/d4eec68c/27bb7c1e — the bake chain never builds the families; the proof = the 3-state bake + the compose re-encode) · glb 292,928 sha 30137c87 (+40,224; tris 12,540 = +1,672; draws 9/25; the node list unchanged) · payload 1,184,825/2M (texture 891,897/1M byte-held) · JS/RU +0 · determinism ×2 · vitest 1,212 green · **the battery 42/42** (the 13 standing bars in-window — the night pin HOLDS at 87.0 · B6 ×4 · the junction rows unchanged · the F5 rows: the band steps +22.7/+20.5 day, +19.9/+18.5 night, +14.9/+12.8 G0b; the shade lines −35.9/−32.1; the drifts +0.30..+1.22 ≤ +3) · found+fixed the SAME SESSION: the adoption's speckle class (the per-loop host picking scattered 388 faces' loops across cells via the concave fan-triangle containment → the per-face host + the exact affine map) · the review pass (Iterative, FIX-BEFORE-MERGE) integrated: the bars' junction accounting restored · the collision belt's buried-face blind spot closed + the sconce-instance belt · the mouth corners' mating mitres (the caps → the 45-deg seam) · the F5-C's reference law (the identity pin, the non-skippable drift) · the per-foot polygon clamping, the wrap-only fallback · DEC-ready rows parked: the golden re-baselines ×3 (the goldens WILL flip under t=0.1) + the DEC-042 fillet-shade note · the facets diagnosis recorded (a bake-lever class, parked with the impost starvation as the next natural bake occasion) · → docs/archive/2026-11-21-rgf5.md
- 2026-11-21 · MERGED rg-audit (the wave's last slot — the FULL e2e/golden gate + the CI verdict + the due re-baselines = this session's battery, deferred NOT waived; the merge + the FULL gate at the owner's advance signal 2026-11-20) — DEC-050 · the junction law: the rib↔vault junction (the census relay ×2 — reply 1's «painted box» pinpoint withdrawn at the salvage, the true pinpoint the overhead bay rhythm) delivered as projected relief: never-exported bake proxies S2A into day+dusk + the UV2 re-weight (S0-D1: the cove starved at 20 texels/m — 2 texels needs r > max_proj; the order seats ×2, the donors floor/passage-vault/reveal; 2048 rejected — the cap busts) + the seam fix (S2A_SEAM_FACES 52 faces; the target classes → 0) · the ×2 determinism PASS (day 21070dfc · dusk d4eec68c · night 27bb7c1e byte-held — the night flat; glb f8407818 +392 B; tris 10,868) · the instrument v3 (the 24×16 rows retired — the grid dilutes 2–3-px creases, the pane edges owned the maxima; the direct-diff rows: J-A 13 peaks/0.87, J-B 0.905, J-C 1.535, J-N 0.0000; 21/21) · the MAGNITUDE ~1–2 gray levels (the +6 margins ~3× optimistic — capped by max_proj 0.08; the tonal O5 parked; the EYE the authority) · the room payload 1,147,151/2,000,000 (texture 891,897/1,000,000 — +291,321, the re-parameterization's cost, the cap holds) · JS +0 (287,527; src/ empty) · RU +0 · DEC-051 = the jordan J4 ×3 re-baselines (their DEC-ready row's number) · vitest 1,212 green on the merged tree · **the FULL gate VERDICT: PASS** — the chromium+golden battery 116 passed / 9 failed (2.2 h): the 9 = the recorded classes (the 4 walk-stall rows + the 2 1812-360 race) + the jordan J4 ×3 (the DECLARED flips, DEC-051 re-baselined scoped, the golden re-run 36/38 with the recorded race class); the gallery goldens measured HELD under the t=0.1 detector (the relief's ~1–2-level signature — the DEC-048 precedent) · CI: the draw-calls e2e row (the recorded SwiftShader class) + the lint swept GREEN (the cross-lane mechanical sweep: my capture format + the jordan-bands era's two rows) · → docs/archive/2026-11-21-rgaudit.md
- 2026-11-19 · MERGED square-gap (the wave's slot 1/4 — the FIRST merging session; the FULL e2e/golden gate + the CI verdict DEFERRED to the LAST merging session, deferred NOT waived; scope gates on the lane: validate GREEN + the e2e square-kit 8/8 + the golden square battery 7/7) — DEC-049 · the DEC-045 machinery (the kit law M1 · the bpy/census chain M2 with the committed EMPTY kit · the late-bind mount M3 + the first-presented-hook wiring; the e2e contract 8/8) + the kit node el:hq-east (C1: the Guards Corps HQ east wall, 944 tris, the massing-with-portico stylization) · the T2 void 42–47 % → 0.0 % (the ≤ 20 % bar) · the goldens: ADD golden-s0b-dec-noon (the acceptance frame + the daylight instrument); the day frames 0 flips; golden-dec-night + golden-oct-night re-baselined (the wall's bare-geometry presence — the bisect trail in the archive) · the kit does NOT register in the disposal ledger (the ruling) · JS 287,527 (+1,543 of ≤ 2,048) · RU +0 · the KIT row 81,539/1,500,000 · found: the design's ledger item mis-sited → the type-widening; the empty-kit GLB carries no buffers → the strict-buffer allowance · the AL-SQ verbatims lost with the deleted vault brief → the rows re-written for what landed — → docs/archive/2026-11-19-squaregap.md
- 2026-11-20 · MERGED jordan-fixtures (the wave's slot 2/4 — the FULL e2e/golden gate + the CI verdict + the jordan J4 ×3 golden re-baselines DEFERRED to the LAST merging session, deferred NOT waived; scope gates on the lane: validate GREEN ×5 · the determinism ×2 (placeholder ab686b86… byte-identical to 3da446d · slice_e a8044573… stable through the review fixes) · the census battery a–e · the probes' additive law re-proven byte-identical vs the pristine census) — the fixture FORM slice: the sconce archetype ×10 (gilt bracket+arms+pans · glow candles+flames · crystal drops; 361 tris ≤ 520) + the chandelier archetype (gilt lathe stem 444 + the arm archetype 121 ×36 across the pinned tiers 16/12/8 @ 1.40/1.00/0.60 + the crystal bead ×300) behind ONE additive FIXTURE_FORM hook (tools/bpy/jordan_fixtures.py, the module never imports jordan.py) · the ONE 3-state re-bake on the frozen geometry (GEOMETRY_SHA a8044573… · ATLAS_HASH de0425a9…): W pinned 0.45/0.35/4.0 byte-held (lightmaps.intensity asserted unchanged; the raw percentiles on B0's sides; the night clip −0.10 pp) · the dark-median ≤ 1 code · the pier-halo cells SIGNED ≤ 0 on night AND dusk · the band-spike 0.259 ≤ 0.33 — the ghost-split class did not reappear · the glow ruling: GLOW_AREA_PARITY retired → P1 area bands + P2 surface law + P3 share bands; the anchor binding = EMISSION CONTINUITY (0.0578; the 0.03 pin vs the core lamp proven unreachable — the committed card's own centroid sat 1.05 above it); the gaze 0.2725 < 0.3106 (the strict-improvement law) · the owner accepted the J4 body growth (6.192 % > the 4.51 % ceiling — the ceiling superseded) and the B3-baked look (the served before/after packet; the mean-luminance shift −1…−6 % = the fresh bake's entropy + the shrunken chips, inside C6's ≤ 5 %) · cells 3,474 ≤ 3,494 (the retired 226 consumed honestly; zero new cells; the non-fixture UV2 hash == 3da446d) · JS +0 (the wave-total 287,527) · RU +0 · payload jordan 1,561,106/7M (the texture −75,510 NEGATIVE — the re-encoded plates shrank) · draws 42/42 EXACT (unique primitives) · review pass 1 both scopes LANDED (bbda459 the builder contracts + d632ea7 the census hardening +662/−137; the frozen assets verified after both; the regression battery a–e green including the negative --assert-max/--uv2-baseline paths) · the parked classes in the archive (the packer's px-floor CONFIRMED: 312/471 fixture faces cover zero texel centres — the fix = a packer revision + re-pack + re-bake at the next natural geometry occasion; the pendants tangency; the node-reachability counting; the test's meshopt limits; faceCellMap/fixtureLm await their consumers) · the DEC-ready row: the J4 ×3 golden re-baselines bounded to the fixture mask dilated 8 px, the number from the LAST merging session — → docs/archive/2026-11-20-jordanfixtures.md

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

**Standing construction path — assets-first, zero JS for content by default (owner,
2026-11-18; the DEC-045 pattern).** New scene content (geometry, materials, lightmap
content, texture rows) is authored through the asset program and rides the ROOM's own
budgets (payload / texture / tris / draws / decode-cells) — the shared JS line is spent
only by new RUNTIME behavior (a new stop = contract data + captions (RU); a new emissive
class = blend-gl; new UI text = RU). The mechanism: a room module binds whatever the glb
+ manifest contain at mount, so static content needs no src/ change. Precedents on
record: rg-look — a ZERO-JS room round (payload +478,000, JS +0); jordan-bands and
jordan-ghost-split — JS +0; DEC-045's square program: «assets-first owner-ratified, zero
JS for content by default», wiring ≤ 2,048 B gz. Every brief composes this as a fact; a
slice that needs runtime behavior declares its JS delta against the shared envelope
explicitly. DEC-045's numeric cap rows (KIT 6 meshes / 18,000 tris / …) stay
SQUARE-scoped until the machinery round generalizes them.

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
