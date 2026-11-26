# Relay protocol — the compose-time blocks

What the orchestrator reads before composing a brief or taking a relay reply: the Relay
loop and routing, the standing construction path, the transport traps, the brief
boilerplate, the purity gate and the verified three facts. The open state lives in
docs/STATE.md; the read map points here.

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


**Transport traps (cost a full relay each when ignored; 0 and 1 are retired — the stop lives in AGENTS.md, the retired masked-marker protocol lives in the turncascade archive).**
   an agent is in its thought-loop, when queued messages go unread): the orchestrator's
   kill-switch is the server API — discover via `opencode api get /openapi.json`, then
   `opencode api post /api/session/<sessionID>/interrupt` (→ `{"interrupted": true}`); the
   subagent's harness state turns cancelled. A cancelled session is NOT revived by queued
   messages — treat as terminal: snapshot the working tree, continue on a fresh agent (the
   work state lives on disk: snapshots + probe logs). Do not pkill the shared daemon (it
   kills every session incl. the orchestrator's own).
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
