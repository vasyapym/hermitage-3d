# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: main @ the sq-arch-day merge (2026-11-25, the wave's SECOND merging session of three — the FULL gate = the LAST merging session's battery, deferred NOT waived). Budgets (the tree's pnpm build && pnpm budget): JS 291,653/350,000 (the sq-arch-day round's +2,134 over the pre-merge 289,527; the merged-tree re-measure rides the LAST merging session) · RU 7,609/12,000 · jordan 1,783,733/7,000,000 (dir 1,777,597) · military-gallery 3,008,700/4,000,000 · rastrelli-gallery 1,189,246/2,000,000 (the dir bytes incl. the manifest) · basis 584,862/600,000 · square 107,902/1,500,000.
Lane MERGED: **sq-arch-day** (the merge = this commit; DEC-054: the Palace Square's FIRST cast shadows + the day look + the review's P1 batch + the owner's PICK — fill 4.5, the sun ≈ 4600 K, the dome knee 0.72; «PICK is fine»). The scope gates green ON THE BRANCH: validate ×2 (1284 tests), the census 15/15 (75–86 draws, ≤ 115,630 tris — the caps re-pinned 96/120,000), e2e square-kit 8/8 ×2, the goldens 17/17 (the 4 day rows re-baselined at the PICK; the night rows never moved). The FULL gate rides the LAST merging session → docs/archive/2026-11-24-sqarchday.md.
Owed: the darwin golden battery (the DEC-ready rows above — the numbers assigned there, never here) · the jordan J1 spire verdict (the owner's eye; the caption fallback parked) · the jordan Mac-rebuild parity (pane UVs/sampler/orientation vs pane-neva.mjs) · the jordan 2b wall articulation (the next slice) · the axial photograph (the fixture FORM) · the doorway residual parked (docs/parking-lot.md) · the portal's arch read (the oval rings on rectangular recesses — the outer two a one-function fix, the middle a proportions decision — docs/archive/2026-11-23-sqfacade.md «Owed») · the draw-calls SwiftShader CI debt (the pre-existing class) · the square's successors (the day-look census — the instrument battery exists (13 frames × 2 rounds) + the pane/wall probe makes the verdict measurable; its own ranking is a later find's; the west flank + the Admiralty/south massings — DEC-heavy, five S0 goldens — docs/archive/2026-11-22-squarenext2.md «Owed») · the Rastrelli Gallery's parked relief items (the impost cove's texel starvation, O5 the tonal split, the axial-photo evidence pass, the niche archivolts — docs/archive/2026-11-21-rgaudit.md «The parked items») · the turn-cascade DEC-ready rows (the jordan scene-golden flips by design — the wall order is in every stop's frame — + the 3-row Mac re-baseline DEC; the numbers from the LAST merging session's battery, never here) · the jordan cell-ownership instrument (the deferred finding 06 — the per-mesh first-cell rows into the manifest; a chain/manifest change).

- 2026-11-24 · MERGED turn-cascade (the wave's FIRST merging session of three — the ff to main MERGEHASH; the FULL gate + the DEC-ready goldens + the due re-baselines ride the LAST merging session — deferred NOT waived) — Task 1 the owner's redistribution ask: the climb's gazes pre-turn toward the chandelier's crown (J1 0→13% FLIGHT1_TURN [70.4, 8.1, −83.5]; J1b 23→36% FLIGHT2_TURN [76.4, 10.4, −82.6]; the swings 4.0/47.9/52.8° → 10.2/47.4/45.7°, stops.test.ts pins the rows; captions untouched) · Task 2 the room survey → the creative's pick (brief 1, Fable-class) = **slice 2b «the white-and-gold wall order»** LANDED: ONE wall_order mesh (12 panels + 12 porthole rings + the cornice's gilt fascia; 2 prims; +4,296 tris → 36,178 drawn, 47/60 draws), EXPORTED-NEVER-BAKED (the rg-f6 declared-host adoption; cells 3,372 ±0; NO re-bake — the lm/probe plates byte-held; the 3-row Mac re-baseline neva +9/plafond −60/glb −84 owner-accepted, the reference switch; the plafond-art input restored via the committed rasterizer) · the review pass astra-6.2 7/10: 16 findings — 14 fixed (the flank winding, the shipped-fixture clearance, the release pins), 1 deferred (the cell-ownership instrument) · validate GREEN ×2 (tsc 0 · biome · vitest 1,254 · budgets ok: payload dir 1,777,597 / row 1,783,733, JS 289,527, RU 7,609) → docs/archive/2026-11-24-turncascade.md
- 2026-11-23 · MERGED rg-f6 (the wave's LAST slot — the merge 5ecca9c + the FULL gate = this session's battery) — the east airlock set: the displaced doorcard twin + five borrowed faces (declared-host adoption, zero atlas cells) + the M_SHADE_AIRLOCK 0.85 8th shell slot + bounds max.x 47 (DEC-41 DEC-B) + three RU caption rewrites (DEC-41 recorded round-41/DECISION-41.md; the review pass astra-6.2 7/10, the findings fixed) · the plates BYTE-HELD ×3 (21070dfc/d4eec68c/27bb7c1e — no bake ran; the displaced-twin construction) · glb f8ea77dc 294,632 (+1,704; tris 12,550 = +10; the census 10 = shell 8 + sconce 2) · the battery 40/42 (the ONLY fails = the rg-audit-era signature rows J-A/J-C — the before dir carries the crease already; the instrument-class record) · the P5 depth read day +28.3 / dusk +20.2 / night +17.6 · the capture determinism ×2 identical · the FULL gate e2e 84/3 (55.4 min — the 3 = the machine-stall family: the touch-rail ×2 + the jordan hot-entry 240 s predicate timeout; the goldens skipped off-darwin; CI rides the push) · the Windows toolchain (Blender 4.2.23 LTS portable + toktx 4.4.2, both version-pinned) → docs/archive/2026-11-23-rgf6.md

- 2026-11-23 · LANDED turn-preview (main direct, solo-lane) — the owner's ask: the THIRD stop's (J1b) gaze pre-turns 23% of the way from the flight-2 sconce toward the chandelier's crown (FLIGHT2_TURN [76.0, 10.1, −83.8]; the pitch 15.3° → 18.8°, the azimuth −39.4° → −28.6°; the sconce stays in frame left) — press 3's arrival reads as a continuation, not a jump · the swing J1b→J2 63.7° → 52.8° (the ~58 design frame holds again) · the sconce's rig law untouched (the fixtures test's citation re-pointed to jordan_fixtures.py) · JS 289,443 (−4) · vitest 1238 green · tsc 0 → docs/archive/2026-11-23-turnpreview.md
- 2026-11-23 · MERGED sq-facade (the wave's slot 2/3 — the FULL e2e/golden gate + the CI verdict + the DEC numbers ride the LAST merging session — deferred NOT waived; the lane's scope gates ALL GREEN at the merge: validate ×2 · e2e square-kit 8/8 ×2) — the Palace Square's palace-side round: **the dressings law** — the find relay (brief 38, the dossier + the exhibit frames, Fable 5.1 max) picked the surround stamp + the ground line as one work; the owner's Q-sitting: Q1 the full law ADOPTED (JS ≤ +4,000), Q2 the recess tone, Q3 the alternation, Q4 the head-suffix ids — landed: the window-type grid (the (row × section-class) law, all 12 types populated — the review pass's grid law), the head law (the segmental/triangular alternation mirrored about the portal, the risalit heads with the broken pediment + the keystone mask dome, the lug step 0.08 m), the socle course (12 placements, the recess tone, the joints between the proud front planes, casts no shadow via PartMeta.castShadow); the review pass (Sol 6.1, 6.5/10): 8 findings ALL fixed (the grid 12, the dome winding, the socle joints, the fitted relief + the built-bounds pin with the 3 measured pre-existing exceptions, the lug step, the mirrors, the castShadow law, one depth value); JS +1,009 of ≤ +4,000 · RU +19 · the census 671/21/134,264 · e2e square-kit 8/8 ×2 · validate GREEN ×2 · the goldens NOT run on the lane (darwin-only baselines — the C1 correction: both spec files skip off-darwin) → docs/archive/2026-11-23-sqfacade.md
- 2026-11-23 · MERGED jordan-next (the ff to main; the FULL gate + the CI verdict + the due re-baselines ride the wave's LAST merging session — deferred NOT waived) — part A the plafond-arrival gaze (J2 → CHANDELIER_CROWN) + part B «the Neva backcloth» (the painted view plate on the twelve panes; NO re-bake) · the review 7/10 · payload 1,678,429/7M · JS 288,350 (+196) → docs/archive/2026-11-23-jordannext.md
- 2026-11-23 · LANDED course-instrument (main direct, solo-lane) — the «Course» preferences sub-block in ROADMAP › Principles + the budget per-chunk print + the room-chunk naming · JS +37 (288,158) · RU ±0 · → docs/archive/2026-11-23-courseinstrument.md
- 2026-11-23 · MERGED jordan-parallel (the wave's slot; merge 251061c; the FULL gate VERDICT: PASS — 122/4 = the recorded classes; the J4 ×3 HELD; the DEC-ready row retired without a number) — the painted plafond: the field + the gilt frame ring; the black-wedge class CLOSED · → docs/archive/2026-11-22-jordanplafond.md
- 2026-11-22 · MERGED rg-f5 (the wave's slot 2/3; the lane's scope gates ALL GREEN; the FULL gate + the CI verdict + the due re-baselines ride the wave's LAST merging session — deferred NOT waived) — the dado + panel order: the exported-never-baked articulation (the DEC-050 reciprocal): the dado rail + 56 panels, adopted TEXCOORD_1, the fillet shade · ALL THREE PLATES BYTE-IDENTICAL · glb 30137c87 (+40,224; tris 12,540) · the battery 43/43 · DEC-ready parked: the goldens ×3 + the DEC-042 note → docs/archive/2026-11-21-rgf5.md
- 2026-11-22 · MERGED square-next round 2 (the wave's FIRST slot — the merge carries rounds 1+2; the FULL e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived) — DEC-053 · the Palace Square's day-read round: the find relay (zero steering over the 13-frame exhibit harvest — the owner attached the frames to the chat per «let the creative model decide») picked the HQ's DAY read; the owner's T-sitting: the tone ADOPTED — 0xc0b36d → 0xc0bc6d (2026-11-23: +5 % yellow — the night hue off the gold/brown axis, the owner's steer), the eye chain 2026-11-22 (orange → too prominent → too dark/brown → the balance found) — plus the 6th bind key 'hq-massing'), the el:gs-junction rider INCLUDED (the reserved 6th draw) — landed: the hour-driven unlit albedo paneBaseTone(wNight) carried by the lattice's setNight (DAY_PANE_TONE at day; DARK_PANE_TONE bit-exact at w 1), the 124 white surround quads on the existing dressing slot (the flat-surround illusion; the relief successor CLOSED), the wSnow-gated HQ cornice lip MERGED into the cap's morph (+0 draws), the junction (z 240→300, 36 tris, golden-neutral); the goldens: ONE declared flip materialized — golden-s0b-dec-noon re-baselined (deterministic on re-run); golden-s0b-dec-night HELD (the design's ~5 % measured sub-gate); the other six held; JS +448 of ≤ +600 (287,989/350,000) · RU +0 · the KIT row 107,902/1,500,000 · kit draws 6/6 EXACT · the pane/wall quartile probe 0.461 → 0.226 ≤ 0.35 · the review pass (the lane's cumulative, iterative/Sol 6.1, score 8/10): 5 fixed (the lip's draw gate + the mount's onReady hook; the pane stocks' fade; the junction's winding — four of six faces were inverted, the mechanism corrected from the reviewer's), 1 declined (nicer); the FULL vitest 68 files 1232 passed/2 skipped · e2e 8/8 · the goldens 8/8 zero flips · JS +132 → 288,121 (the round-2 cumulative +580 ≤ +600) — → docs/archive/2026-11-22-squarenext2.md
- 2026-11-21 · MERGED square-next round 1 (the wave's FIRST slot; DEC-052 the HQ night lattice — the 124 quads re-slotted, the ONE unlit albedo; ADD golden-s0b-dec-night) → docs/archive/2026-11-21-squarenext.md
- 2026-11-21 · MERGED rg-audit (the wave's last slot; DEC-050 the junction law · DEC-051 = the jordan J4 ×3 re-baselines; the FULL gate VERDICT: PASS — 116/9 = the recorded classes) → docs/archive/2026-11-21-rgaudit.md
- 2026-11-19 · MERGED square-gap (the wave's slot 1/4; DEC-049 the kit machinery + el:hq-east; ADD golden-s0b-dec-noon) → docs/archive/2026-11-19-squaregap.md
- 2026-11-20 · MERGED jordan-fixtures (the wave's slot 2/4 — the sconce ×10 + the chandelier archetype behind ONE additive FIXTURE_FORM hook; the J4 body growth owner-accepted) → docs/archive/2026-11-20-jordanfixtures.md
- 2026-11-18 · LANDED feel-tune (main direct, solo-lane — LOOK_LAG 0.9 + the room titles trimmed) → docs/archive/2026-11-18-feeltune.md
- 2026-11-17 · MERGED facade-shadow (DEC-048 the dark pane tone; its FULL battery VERDICT: 112/4 = the recorded classes) → docs/archive/2026-11-17-facadeshadow.md

- 2026-11-17 · MERGED square-forward-gaze (the wave's slot 4/4; DEC-046 B10 the departure absorbs the look) → docs/archive/2026-11-16-squareforwardgaze.md
- 2026-11-17 · MERGED rg-move (DEC-047 B9c the look trails the travel; G1b retired) → docs/archive/2026-11-17-rgmove.md
- 2026-11-17 · MERGED rg-walk-tune (the wave's slot 3/4 — B9b the look leads; Gjb/G1b reinstated) → docs/archive/2026-11-16-rgwalktune.md
- 2026-11-17 · MERGED jordan-bands (the wave's slot 1/4, merge 34e708c — F1 the per-tier rep split + F3 the transcode) → docs/archive/2026-11-16-jordanbands.md

- 2026-11-18 · MERGED jordan-ghost-split (ff 6dc6f1b — the per-pier north split; its FULL gate VERDICT: PASS, the recorded classes) → docs/archive/2026-11-18-ghostsplit.md

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

**Record shapes.** AGENTS.md rule 6 owns the record law. The habit it enforces: at every lifecycle flip, REWRITE the bullet / row / cell to the flip's shape and MOVE the displaced text into the round's `docs/archive/` file in the same commit — never append. Live state = Now + un-merged lanes + the last 3 MERGED (≤ 10 KB); an obligation that outlives its bullet moves to «Now › Owed» before the bullet leaves. Cite records by named anchor, never by line. A cap breach is fixed by moving text, never by raising the cap.
