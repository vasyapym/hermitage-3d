# Architecture

## Runtime overview

```
URL #/jordan?at=2026-06-21T23:30&cam=3&q=1
        │
        ▼
AppState (FSM: boot → arriving → exploring → transit → idle)
        │
        ▼                ▼                  ▼
RoomRegistry        Clock & Sky        CameraRig
load / unload       solar position     rail + free look
prefetch            sky env (PMREM)    stops & framings
disposal ledger     exposure           reduced-motion → cuts
                    lightmap weights   input: pointer / touch / keys
        │                │                  │
        └──────────────► three.js Scene ◄────┘
                         │
                 Renderer + Post (quality tier)
                         │
     DOM overlay: wordmark · index · time line · hints · /notes · debug HUD
```

## Key properties

- **The URL is the state.** Room, time, camera stop and quality tier round-trip through the hash. "Share this view" is copying the address bar; reviewers can deep-link an exact frame.
- **Rooms are lazy chunks.** A room = a module (rail, metadata, lighting blend) + an asset bundle (glTF, KTX2, lightmap states). Entering an airlock prefetches the neighbour; leaving disposes the previous room through a **resource ledger**, asserted empty in dev and in tests. Adding a room never touches the core.
- **Deterministic mode** (`?det=1`): fixed clock, fixed seeds, no temporal effects — the basis of golden-frame tests.
- **No spinner.** The sky is procedural and renders instantly; the title and the real time appear on the sky; the palace arrives into it.

## Room contract (data, not code)

| Field | Meaning | Who checks it |
|---|---|---|
| `id`, `title`, caption per stop | Doubles as the accessible description | a11y tests |
| `bounds` at true coordinates in the shell | Enables The Cut later; keeps scale honest | unit test vs. footprint |
| `assets` manifest | glTF + KTX2 + lightmap states, content-hashed | budget script in CI |
| `rail` spline, stops, look limits | Defines the camera envelope and therefore the modelling scope | golden frames |
| `lighting.states` + blend function | 2–3 baked states, weights from the sky clock | unit test (weights sum to 1, monotone) |
| `neighbors` with airlock portals | The streaming graph | smoke test walks the whole graph |
| `budget` | Triangles, draw calls, bytes, texture memory | CI fails the PR |

Phase-2 exit check (r19): both rooms (`rastrelli-gallery`, `jordan`) satisfy every field, and every check in the last column is live — per-stop captions reachable and announced by keyboard (r18 a11y), bounds unit-tested against the footprint, sha256 manifests revalidated against `budget.mjs` in CI, golden frames at one stop per room (J4/G1 × day/dusk/night), blend weights unit-tested (sum to 1, monotone), the smoke walk covers the whole graph with the ledger back to boot, and the payload/VRAM rows are CI gates.

Phase-3 exit check (R5/R6): the third room (`military-gallery`, route `#/1812`) joins behind the retargeted landing airlock (a cut whose card carries the compression note), satisfies every field the same way — budget mirrors the served manifest (60,000 tris / 19 draws / 1.2 MB textures / 4 MB payload; measured 31,090 tris / 17 draws / 1,944,413 B), golden frames at M0 in all three states, the smoke walk crosses the edge both ways with the ledger back at boot. The room's 332 portraits sample one generated 2048² KTX2 atlas produced by the layout law (`tools/gallery/layout.mjs` → the committed `layout.json`, the browser twin byte-pinned by test); the room index is a registry-driven native `<dialog>` behind the chrome «Залы» button — deep links and index jumps share one cold-entry path (`beginTransitTo(target, cold)`).

## Camera: the museum visitor

A spline rail with composed stops; scroll, drag or arrow keys move along it; pointer/touch gives ±35° of free look; `prefers-reduced-motion` turns glides into cuts. Eye height 1.7 m. Every frame is composed, the asset envelope is bounded, and it works on trackpads, phones and keyboards. *(Rejected: free FPS roam — collision, full surface coverage, uncomposed frames.)*

## Lighting model

- **Exterior:** analytic sun/sky from real date, time and the palace latitude — the binding contract is [design-sky-time.md](design-sky-time.md): a hand-written analytic dome under the frozen blend rules. **Phase 0 runs without PMREM and without shadow maps** (DEC-010); a fitted directional shadow and baked AO return with the facade kit (Phase 1); PMREM returned with interiors — one static dusk cube probe per room ([ADR-0013](adr/0013.md)).
- **Interior:** three-bound ETC1S lightmap states blended by clock weights; technique A on the stock lightmap path with the second state fetched on the same UV — **decided by measurement** ([ADR-0014](adr/0014.md); B-RT and B-discrete measured at the vsync floor and rejected); emissive chandeliers (T2 selective bloom reserved by DEC-015, not yet wired); one static dusk cube probe per room ([ADR-0013](adr/0013.md)).
- **Colour:** linear workflow, AgX tone mapping, exposure driven by sky luminance — dusk is dim and white night is luminous, not "night = blue filter".
- Lightmap blending (custom material vs. per-room pre-blend) was **decided by measurement in Phase 2** ([ADR-0014](adr/0014.md): technique A); both options were bounded by the ≤ 3 custom materials rule. The weight function itself is frozen now — day/dusk/night-chandeliers with a dusk plateau −7…−4°, white-night minima wholly dusk ([design-sky-time.md](design-sky-time.md) §8).

## Asset pipeline: assets as code

No manual modelling exists in this project — every asset is produced by committed scripts:

- `tools/` holds **bpy (Blender Python) scripts** that generate each kit part and room shell, plus `gltf-transform` optimisation steps. A single command regenerates a part deterministically.
- Lightmaps are baked with Cycles **locally** (headless): ≤ 3 states per room, ≤ 2 K, denoised; bake times logged per room (`tools/bake-logs/`) — the reference machine makes bakes the known slow spot, so bake-once-and-cache is the norm. If a bake genuinely outgrows the machine, that is a menu item for borrowed hardware, never a blocking dependency.
- The Military Gallery's portrait atlas and frame geometry are produced by the same law, zero committed frame geometry: `tools/gallery/layout.mjs` holds the layout law and emits the committed `tools/gallery/layout.json` byte-deterministically (the CI gate regenerates it; the browser twin `rooms/1812/layout.ts` is byte-pinned to it by test), and the `tools/gallery/import.mjs` pipeline paints the 3072² portrait atlas and pins its mock digest for CI to recompute (design-gallery-atlas-v2 §4) — toktx never runs in CI.
- Built outputs (glTF/Meshopt, KTX2 textures) are committed under `public/assets/`, small by design and guarded by budgets. **Blender never runs in CI** — CI validates the committed artifacts.

## Quality tiers & performance budget

Tiers: **T0** (low: DPR 1, no bloom, 1 K shadow, near-LOD instancing) · **T1** (default) · **T2** (discrete GPU: DPR ≤ 2, full post, 2 K+ shadow). Auto-selected at boot from a ~1 s GPU microbenchmark plus heuristics; overridable via `?q=`, persisted.

| Metric | Budget | Enforced by |
|---|---|---|
| First frame, exterior, T1, ~10 Mbps | ≤ 3 s | Device gate on the reference Mac at each phase gate; CI smoke only bounds hangs (`#title` ≤ 15 s on software GL) |
| Initial JS | ≤ 350 KB gzip | gzip budget script |
| Exterior payload | ≤ 4 MB | asset budget script |
| Per-room payload | ≤ 8 MB | asset budget script |
| Draw calls, any frame | ≤ 250 | HUD + Playwright assertion |
| Triangles in frustum (T1) | ≤ 1.0 M | same |
| GPU texture memory | ≤ 256 MB | resource ledger |
| Frame time (T1) | 16.7 ms @ 1080p where achievable on the reference device | device itself, every phase |
| Frame time (T0) | ≤ 33 ms — the floor that must never break | same |
| Long tasks after load | none > 50 ms | Playwright trace |
| Accessibility | Lighthouse ≥ 95 · full keyboard · reduced-motion honoured | CI |

**Reference device:** MacBook Pro 2017 (2-core i5, 8 GB, Iris Plus 640) — the only machine. T1 is the goal on it; T0 is the hard floor. Budget numbers are hypotheses until Phase 1 measures them; reneging on a budget requires an ADR, not a quiet change.

**Golden frames — implemented arrangement:** CI runs only the Playwright *smoke* project, in a
separate `e2e` job on software GL (SwiftShader): deterministic T1 and T0 boots, HUD `data-*` budget
assertions (draw calls ≤ 250, triangles ≤ 1.0 M), tier-label checks, generous hang bounds (`#title`
≤ 15 s, settled ≤ 45 s) and a clean-console gate. Pixel goldens (`tests/e2e/golden.spec.ts`: 15 scenes — noon, white night, S1 noon, the three winter/autumn square gates (dec night, dec noon, oct night) and the nine room goldens — jordan J4 / gallery G1 / 1812 M0 × day/dusk/night at the shared det instants, deterministic mode, page-level clip of the `#scene` viewport, `maxDiffPixelRatio` 0.01, plus 16 layout fixtures en/ru across 360/768/1280/1920 on both pages) run locally on the
reference Mac's GPU. This is the charter's documented "goldens run locally" fallback, adopted
deliberately rather than after observed flakiness: software-GL output is deterministic per machine,
but baselines are not portable across platforms, so CI goldens would need their own generated
baselines and still would not vouch for the real GPU. Borrowed-hardware CI goldens remain an option
to revisit.

## Delivery & security

Hashed asset URLs with immutable caching · strict CSP, no inline scripts · no third-party scripts; the debug HUD is client-only · no COOP/COEP needed (no SharedArrayBuffer).

## Repository layout

```
├─ src/
│  ├─ app/        bootstrap, state machine, URL state
│  ├─ engine/     renderer, loop, tiers, resize, resource ledger
│  ├─ world/      shell, room registry, airlocks, streaming
│  ├─ procedural/ facade grammar: spec types, solver, instancing builder
│  ├─ sky/        solar position, sky model, exposure, lightmap weights
│  ├─ camera/     rail, stops, input, reduced motion
│  ├─ materials/  library + the ≤ 3 custom materials
│  ├─ post/       effect stack per tier
│  ├─ ui/         DOM overlay, /notes page, debug HUD
│  ├─ assets/     manifests, loaders, prefetch policy
│  └─ content/    facade specs, room metadata, captions
├─ rooms/         one folder per room: module + asset manifest
├─ tools/         asset pipeline (bpy scripts, gltf-transform), budget checks
├─ public/assets/ built glTF / KTX2 (committed, budget-checked)
├─ tests/         unit (Vitest) · e2e + golden frames (Playwright)
└─ docs/          architecture · decisions · charter · artistic-license · briefs/
```

## CI on every PR

typecheck → Biome → Vitest → build → gzip budget script → preview deploy on Cloudflare Pages.
`main` deploys production. `checks` keeps that list; a separate `e2e` job runs the Playwright smoke
project on software GL (`--project=chromium`) with the HUD budget assertions, and golden frames are
local-only (see the caveat above).
