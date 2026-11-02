# Phase 2 design — the staircase

Status: adopted — planning-round 14 · owner dispositions 2026-10-17: Q1–Q10 accepted **by default** (no overrides); DEC-013…018 + ADR-0013 recorded in the registers; the lightmap-blend ADR stays deferred to r17 measurement (Q5's own plan).
Scope: ROADMAP phase 2 "The Staircase" only. Planning; no code, no measurements. Rounds 15–19 implement.
Provenance labels: **sourced** (citation candidate → ATTRIBUTIONS.md) · **declared** (→ docs/artistic-license.md) · **derived** (derivation stated inline).
Frozen inputs this doc never edits: §8 lightmap weights (src/sky/lightmap-weights.ts), budget table, URL grammar, charter non-goals.

---

## 1. Script & beats — the route as room registry

The film: a visitor crosses Palace Square, is swallowed by the arch, walks a low dim gallery, and climbs into light. Three beats, three registry nodes, two seams.

### 1.1 Registry graph

| node | kind | route key | payload | beat |
|---|---|---|---|---|
| `square` | static resident (not a lazy room) | `#/` (default, unchanged) | 0 B (procedural, exists today) | approach — the facade and the hour |
| `rastrelli-gallery` | lazy room | `#/gallery` | ≤2.5 MB declared | compression — low, dim, long |
| `jordan` | lazy room | `#/jordan` | ≤7.5 MB declared | ascent → arrival — the hour made visible |
| `(phase-3 placeholder)` | not registered in phase 2 | — | — | the landing airlock dead-ends into a lit portal, no route |

Edges (ordered, bidirectional for the back-scroll):
`square →[arch portal]→ rastrelli-gallery →[gallery airlock]→ jordan →[landing airlock]→ ∅`

- Default: the square is **not** a room. It has no manifest, no disposal, and is never unloaded; inside the interiors its facade kit, massing cards and shadow pass are set `visible=false` (draw budget), the sky dome stays resident but hidden indoors (see §6.2). Rationale: the default route must paint without any fetch; a registry node that cannot be unloaded is a resident, and modelling it as a room would make the ledger lie.
- Declared compression (theatre-set rule): the real walk arch → Great Courtyard → north range → staircase is ~200 m and is **not** modelled. The gallery airlock is a *cut* that carries the visitor from the gallery's east end to the staircase's ground floor at its own true coordinates (§2.4). Both rooms keep true coordinates; only the connecting path is compressed. Names stay honest: the gallery is *a* ground-floor Rastrelli Gallery (sourced: exists, today shop/cafés/lifts), the hall is the Jordan Staircase (sourced). The historical ambassadors' Jordan Hall colonnade is **not** built in phase 2 (declared omission; this doc does not propose it as a lifetime-cap room).

### 1.2 URL

- Route key is the hash path; `?at=&cam=&q=&det=1` unchanged. The time parser already leaves the route and other keys untouched — no parser change is needed.
- `cam` inside a room = a rail parameter 0…1 within the active room (existing grammar reused; stops are named only in the HUD captions and a11y text). Rejected: a separate `stop=` key — it forks the grammar.
- Deep link to `#/jordan?at=…` cold-loads jordan directly: the "loading hides behind a beat" rule holds by opening on a dark card with the caption of stop J0 fading in, then the frame — never a spinner (DEC candidate in §11).

### 1.3 Prefetch policy

> **R-UX1 note (2026-10-22):** the prefetch SHIPS with a simpler trigger — at every
> arrival-settle, not rail-keyed — per [design-walkthrough-ux.md §4.6](design-walkthrough-ux.md);
> the table below is the superseded phase-2 plan, kept for provenance.

| trigger | prefetches | mechanism |
|---|---|---|
| boot on `#/`, after first frame + idle (`requestIdleCallback`, 2 s fallback) | `rastrelli-gallery` **manifest only** (≤2 KB) | fetch, no decode |
| square rail passes S1 (arch approach, §6.1) | gallery glb + 3 lightmaps + atlas | fetch + decode in workers, no GPU upload |
| gallery rail passes G1 | jordan manifest + glb + lightmaps | same |
| airlock hold begins | GPU upload (`initTexture`, compile) of the *next* room | hidden in the hold |

Deep link to a room: fetch its manifest first, then everything; the reviewed room is not prefetched until the visitor scrolls back past the entry stop.

### 1.4 How the hour moves along the beats (frozen §8, consumed not changed)

- Square: live sky + exposure E(h) — exists.
- Gallery: artificial light dominates at every hour → the three bakes differ little (declared: day adds a cool bounce from the arch mouth and the courtyard-side slit windows; night is sconces only). Visual delta small by design — compression should feel timeless.
- Jordan: the hero of the phase. Day — tall windows flood the flights; dusk — low warm cross-light, chandeliers warming up; nightChandeliers — gilding and crystal carry the room. The ascent is where `w_day/w_dusk/w_night` reads as narrative.

---

## 2. Set design — the room contract instantiated

### 2.1 Contract fields

Reproduced and verified verbatim against architecture.md (orchestrator, 2026-10-17):
`id`/`title`/caption per stop (doubles as the accessible description) · `bounds` at true coordinates in the shell · `assets` manifest (glTF + KTX2 + lightmap states, content-hashed) · `rail` spline, stops, look limits · `lighting.states` + blend function · `neighbors` with airlock portals · `budget` (triangles, draw calls, bytes, texture memory).

Type sketch (design-level):

```ts
interface RoomContract {
  id: RoomId; title: string; stops: Stop[]; bounds: Box3;
  assets: ManifestRef; rail: Rail;
  lighting: { states: StateId[]; blend: 'lightmapBlend' | 'preBlendRT' };
  neighbors: { to: RoomId | null; airlock: AirlockId }[];
  budget: RoomBudget;
}
```

Coordinate frame (exists): metres; +X east, +Z south (Palace Square), −Z north (Neva), +Y up. Shell: halfWidth 105, halfDepth 87.5, wing depth 24, cornice Y 22, roof band → ~24. Interiors must fit Y 0…22.

### 2.2 Per-room values

All values declared, marked `[measure r15/r17]` where bpy or the bake decides.

| field | rastrelli-gallery | jordan |
|---|---|---|
| title / caption theme | "Rastrelli Gallery — the way in" | "Jordan Staircase — the ascent" |
| bounds X | +4 … +44 (40 m long, east of the arch passage, inside the south block) `[measure r15]` | +66 … +92 (26 m) `[measure r15]` |
| bounds Z | +70 … +76 (6 m wide) | −86 … −62 (24 m deep; north tract, east end) |
| bounds Y | 0 … 3.6 (ground-floor rooms ≈3–4 m, declared) | 0 … 20 (stair-hall height ≈20 m declared; under the cornice) |
| landing | — | Y ≈ +10 (first-floor landing, declared) |
| floor materials | stone flags, painted plaster, sconce bronze | grey granite columns, white marble, gilt stucco (sourced: materials; stylized) |
| windows | none visible; slit light sources baked only | two tiers on the Neva side + mirrored portholes opposite (sourced) |
| hero meshes (≤3) | shell+vaults (1), sconce set (2), end portal (3) | shell+flights+balustrade (1), twin-column gallery + portal with niches (2), chandelier (3) |
| rail length | ~44 m | ~48 m (two flights + half-landing) |
| stops | G0 arch mouth · G1 mid · G2 east door | J0 ground entry · J1 mid first flight · J2 mezzanine turn · J3 upper flight · J4 landing |
| lighting.states | day · dusk · nightChandeliers (3; delta small) | day · dusk · nightChandeliers |
| lightmap res | 1024² ×3 | 2048² ×3 |
| neighbors | square via arch-portal; jordan via gallery-airlock | gallery via gallery-airlock; ∅ via landing-airlock |

Orientation note (derived; **plan check closed r19** — the direction is attested verbatim by two independent sources: saint-petersburg.com, «The rooms of the Neva Enfilade, which runs west from the Jordan Staircase» (hermitage-museum state rooms page), and the hermitagemuseum.org 1917 virtual-visit order (Jordan Gallery on the ground floor → Small Dining-Room); both place the staircase at the **east end of the north wing's Neva front**, so the windows face **north onto the Neva/Palace-Embankment**): the sourced "two tiers of windows on the Neva" plus the enfilade order Jordan Staircase → Forehall → Nicholas Hall → Concert Hall → Malachite Room → Small Dining-Room, which *runs west away from* the staircase. Earlier planning notes said "west", which the enfilade derivation contradicts — resolved in the derivation's favour. A measured plan (РГИА ф. 485 / Albertina) would still settle exact proportions; the r15 bpy build followed this derived orientation and no source contradicts it. Where the window tiers face, the two-tiers fact is sourced (en.wiki, citing Budberg 1969 p. 198; hermitagemuseum.org).
The arch passage itself (X −4…+4, Z +63.5…+87.5, the 24 m wing depth) is part of the gallery room's model: a vault the visitor walks through before turning east. Derived from the massing (wing depth 24); declared walkable volume.

### 2.3 Windows, the dome and the arch plane

- **Windows in jordan:** opaque baked panes (the sky colour per state is baked into the pane texture). Avoids see-through to the dome (whose brightness follows E(h), not the bake), avoids card-model leaks, saves draws. Flip to see-through only if the owner wants real sun movement in the panes (then the dome renders through window stencils — +1 draw, exposure mismatch to solve). Q9 in §12.
- **The shell is a card model:** the massing has no arch hole today. Default: the arch-portal is a doorway transit whose first metre is inside the card (the vault mesh begins at the facade plane and the fade-to-dark completes before the camera crosses the card plane); r16 may alternatively cut an arch opening in the card — owner's call (Q7). Interiors sit at true coordinates inside the envelope; nothing exterior is drawn while a room is active, so there is no collision to resolve, only the one plane at the arch.
- **R-UX1 (2026-10-22): the hold choreography shipped as the threshold beat** — the camera keeps moving through the light-fade (the drain rides `renderer.toneMappingExposure`, not an overlay), the FSM gained depart → card → arrive, and the transit became a threshold for every airlock. This section's fade-to-dark-in-place is superseded by [design-walkthrough-ux.md §4](design-walkthrough-ux.md).

### 2.4 The airlock — definition

Default: an airlock is a **neighbor-edge seam, not a room**. It owns no assets, has no route key, and cannot be a camera destination; it is a choreography + lifecycle object.

```ts
interface Airlock {
  id: AirlockId; from: RoomId; to: RoomId | null;
  portalFrom: Box3; portalTo: Box3;      // true coordinates in each room
  transit: 'doorway' | 'cut'; holdMs: number;   // reduced-motion forces 'cut'
  hooks: { onApproach: 'prefetch'; onHold: 'upload+swap'; onExit: 'dispose(from)' };
}
```

Physical place and portal placement: **arch-portal** — portalFrom: a 6 × 6 × 2 m box at the facade plane Z = +87.5, X −3…+3; portalTo: the first 2 m of the passage vault. **gallery-airlock** — portalFrom: the east door of the gallery (X 43…44); portalTo: the ground-floor entry bay of jordan beneath the first flight (declared under-stair vestibule). **landing-airlock** — portalFrom: the landing's twin-column portal; portalTo: null (phase 3); the transit is a fade to a lit card ("to be continued" caption, a11y-labelled).

Code meaning: the only place in the runtime where a room's `dispose()` is legal is `onExit` of an airlock; the only place `scene.environment`/exposure/post may be swapped is `onHold`. This makes the ledger assertion local and the no-spinner rule mechanical.
Rejected: airlock-as-room — it would be the 3rd and 4th rooms of a ≤7 lifetime cap spent on corridors nobody stops in.

---

## 3. Set construction — the asset pipeline

Principle: one committed binary ← one committed script ← one command. Blender runs locally headless, never in CI.

### 3.1 Kit list per room (bpy, `tools/bpy/<room>.py`)

| part | gallery | jordan | notes |
|---|---|---|---|
| shell (walls, vault/ceiling, floor, trim) | 1 mesh | 1 mesh | only the rail-frusta union + margin is modelled |
| stair flights + treads | — | 2 flights + half-landing, 1 mesh | merged into hero 1 |
| balustrade | — | instanced baluster + rail profile | instance count `[measure r15]` |
| columns | pilaster strip | twin-column gallery at the top (grey granite) | instanced |
| chandeliers + sconces | sconce ×N instanced | chandelier ×1 hero, sconces instanced | emissive material for bloom (§7) |
| portals / doors | arch mouth, east door frame | portal with Mars & Apollo statue niches (declared: the niches keep their place but hold stylized vases — the charter bans figures) | sourced: niches exist |
| floor pattern | stone flags | marble | atlas texture, stylized hand-painted |
| windows (jordan) | — | panes as baked opaque surfaces (§2.3) | |

### 3.2 Stages and rounds

| stage | command (one part) | tool / pin (candidates) | determinism notes | round |
|---|---|---|---|---|
| model | `pnpm asset:bpy <room>` → `blender -b -P tools/bpy/<room>.py` | Blender 4.2 LTS pin (ships Intel builds for macOS 13.7; verify) | fixed seeds, no procedural noise textures in exported geometry, stable object names, `export_apply=True`, no tangents from Blender | r15 |
| glTF optimise | `pnpm asset:gltf <room>` | `@gltf-transform/cli` pinned; dedup → prune → weld → quantize → meshopt (EXT_meshopt_compression) | version recorded; sha256 in manifest | r15 |
| textures → KTX2 | same command | toktx (KTX-Software 4.3.x, universal macOS binary) or basisu | ETC1S for lightmaps + most albedo; UASTC only where banding shows (normal maps, subtle grain — albedo/atlas bytes in §4.3/§9 stay declared either way); encoder is thread-order-dependent → force `--threads 1`; CI checks sha256 of committed files against the manifest and never re-encodes | r15 |
| manifest | emitted by `asset:gltf` | — | { files, bytes, sha256, states, lightmap res, intensities } — the budget input (§9) | r15 |
| bake | `pnpm asset:bake <room> <state>` → Cycles headless, OIDN denoise, ≤2 K, sample cap, writes `tools/bake-logs/<room>.md` (time, samples, res, Blender version) | Cycles **CPU** on the 2-core i5 — the known slow spot | bake-once-and-cache: the `.exr` intermediates are not committed, the KTX2 are; a bake > ~45 min/state goes on the borrowed-hardware menu and never blocks | r17 |

### 3.3 Committed layout

```
public/assets/<room>/<room>.glb           # Meshopt-compressed, Draco not used
public/assets/<room>/lm/day.ktx2 | dusk.ktx2 | night.ktx2
public/assets/<room>/tex/albedo.ktx2 (+ normal.ktx2 if used)
public/assets/<room>/manifest.json
public/basis/ (transcoder wasm+js, shared, lazy)   # its own "shared runtime payload" budget row
tools/bpy/<room>.py · tools/bpy/bake.py · tools/gltf/<room>.mjs · tools/bake-logs/<room>.md
```

`tools/budget.mjs` gains payload rows (per room, exterior, shared) in r15 — the ≤8 MB / ≤4 MB rows are unexercised today (it counts JS gzip only) and become real the moment the first glb lands.

---

## 4. Light — three baked states, one frozen weight function

Consumption only. §8 gives `w = {day, dusk, night}`, Σ=1, ≤2 nonzero, quintic seams. Each state is one lightmap atlas per room (UV2 packed in Blender); bakes carry absolute brightness; a per-state intensity scalar in the manifest compensates ETC1S being 8-bit LDR (chandelier range clipped at bake → the scalar restores level; declared, verify in r17 bakes).

### 4.1 Technique A — lightmap-blend material (custom slot 2 of 2)

One custom material (ShaderMaterial or an `onBeforeCompile` patch — either counts as the slot; no sophistry) with uniforms `lmA, lmB, wA, wB, iA, iB`; the two nonzero states are bound, so always exactly 2 texture fetches per fragment regardless of state count.

Delivers: continuous hour-shift, exact §8 semantics, per-state intensity, compressed textures stay compressed in VRAM.
Costs: spends the last-but-one custom-material slot project-wide; 1 extra texture fetch vs the stock lightMap; one material to maintain against three.js upgrades.

### 4.2 Technique B — per-room pre-blend

- **B-discrete:** `argmax(w)` swaps `material.lightMap` among 3 textures. Zero custom shaders, zero extra memory. Cannot deliver a continuous blend — the dusk→day ramp becomes a pop at the crossover; honest only if the owner accepts "three looks" instead of "light changes with the hour".
- **B-RT:** render two full-screen quads with stock MeshBasicMaterial (map = state tex, additive blending) into a per-room render target; the stock lightMap consumes the RT. Zero custom shaders, continuous. Costs: an uncompressed RT — 2048² RGBA8 = 16 MB (HalfFloat = 32 MB) in the ledger per active room, plus overlap during transit; a re-blend pass when w changes beyond ε (quantise w to 1/64 → ≤64 passes per seam, each a 2048² fill — cheap on paper, measure); sRGB/linear handling of the RT must match the bake. r17c harness amendments: the restored per-state blend exceeds 1.0, so the target is HalfFloat and each quad scales via its stock `color` uniform (w·eff, One/One custom blending onto a black-cleared target) — opacity is an alpha factor and cannot carry scale > 1; the quads carry a `uv1` attribute (the channel-1 maps otherwise sample an undefined attribute); the consuming side reads `lightMapIntensity = 1` exactly (no double restore); renderability (WebGL2 + `EXT_color_buffer_float`) throws loud at mount.

### 4.3 Texture bytes (declared estimates; transcode target on Iris 640 WebGL2 assumed BC1 for ETC1S RGB, BC7 for UASTC)

| res | format | VRAM/state (with mips ×1.33) | disk/state (ETC1S supercompressed, est.) |
|---|---|---|---|
| 2048² | ETC1S→BC1 (4 bpp) | ≈2.7 MB | ≈0.5–0.8 MB |
| 1024² | ETC1S→BC1 | ≈0.7 MB | ≈0.15–0.25 MB |
| 2048² | UASTC→BC7 (8 bpp) | ≈5.3 MB | ≈2–4 MB |
| 2048² | B-RT RGBA8 / RGBA16F | 16 / 32 MB | 0 |

Risk note: these rows assume the browser reports the BC paths; on a device without them KTX2Loader falls back to RGBA/ETC2 targets — VRAM rows can rise roughly 2–8×. Measure `detectSupport()` on the reference device in r17 before trusting the table.

Ledger arithmetic (A, both rooms resident during a transit): jordan 3×2.7 + gallery 3×0.7 = 10.2 MB lightmaps; + albedo atlases (2048² jordan, 1024² gallery) ≈ 17 MB textures — far inside 256 MB; the ledger is dominated by render targets (§7). B-RT adds 16–32 MB per active room. Trade: the hero stair gets 2048² per state; the gallery 1024² — its states differ little, and 3×0.25 MB on disk is the cost of keeping the contract uniform (no fourth state anywhere, no room with fewer states than the contract expects).

### 4.4 Recommended default and the measurement that can flip it

Default: **A**. It is the only option that is both continuous and compressed; the remaining slot has no other claimant in the ROADMAP.
Measurement plan (r17, headed, reference device, T1 @1080p, HUD `data-frame-ms` median over 10 s, det=1): jordan stub geometry with 3×2048² noise lightmaps; scenes: A; B-RT at plateau (no re-blend) and mid-seam (re-blend every frame, worst case); B-discrete as floor. Flip to B-RT if A costs >1.5 ms over B-discrete at J1 **and** B-RT mid-seam stays within 1.0 ms of B-discrete **and** VRAM with overlap stays <128 MB. Flip to B-discrete only by owner decision — it changes the product promise.

r17c outcome: measured at J1 with the real baked rooms (the harness's B-RT re-blends EVERY frame — the ceiling — so its plateau number is the mid-seam worst case): A 16.70 ms, B-discrete 16.70, B-RT 16.70 (vsync floor; +2 draws +4 tris for the quad pass), the B-RT ledger 40.6 MB < 128 MB. The flip thresholds are not met; **ADR-0014 keeps technique A**. Honest limitation: the display cadence clamps the medians — sub-vsync differences between the techniques are below the measurement's resolution.

r17c scalar law (the LDR survival fix found by the round-17c bisect): one white point per room, tuned for the night chandelier range, quantised the day/dusk field to 8-bit codes 0–2 and ETC1S finished the job — interiors read black with the seam on. Each state now encodes at its OWN white point (the manifest's `lightmaps.intensity` record: jordan 0.1/0.1/3.0, gallery 0.03/0.2/0.2) restored at runtime by the same number, plus a declared per-room per-state LOOK GAIN (`src/content/lightmap-look.ts`, both rooms day 4 / dusk 3 / night 1) applied after restoration. The white point survives the 8-bit range; the gain moves the look; clipping at bake is flat highlights (declared, accepted). Re-encodes come from the surviving denoised EXRs via `tools/reencode.mjs` — never the old PNG/ktx2; determinism verified byte-identical on the pinned toolchain.

Interior exposure: bakes carry brightness; the renderer exposure is set to a per-room constant (declared 1.0) in the airlock hold and restored to E(h) on exit. §7 remains an exterior/sky contract — flag it in one line, do not rewrite.

---

## 5. Environment reopen (DEC-010 punted PMREM here)

| option | what | cost | risk |
|---|---|---|---|
| (a) no probe | bakes carry ambient; `scene.environment=null` | 0 | gilding and crystal read flat; the room's two signature materials lose specular |
| (b) one static cube probe per room | a Cycles-baked 256² cube (dusk state, neutral) → PMREM once per room load inside the airlock hold, never in the frame loop; `envMapIntensity` scaled by a scalar derived from w (declared day 1.0 / dusk 0.6 / night 0.35) | PMREM RT ≈ 6 MB in the ledger per room, disposed on exit; one-off GPU stall hidden in the hold (long-task rule: measure that the hold covers it) | hour-static reflections; if the stall exceeds the hold on Iris 640, split or drop |

Recommend (b). architecture.md's "one cube probe per room" stands unamended; the ADR records the static-probe + weight-scaled-intensity consumption and the hold-only generation rule.
ADR needed: **ADR-0013 — Interior environment probe** (supersedes DEC-010's punt).
Flip to (a) if the r17 golden frames at the three plateaux read acceptably with bakes alone (owner's eye at J4 night), or if PMREM generation measures longer than the hold on the device.

---

## 6. Cinematography — the rail

### 6.1 Stops

Eye height 1.7 m above the local floor; `t` on the room rail; look limits yaw/pitch, ±35° default, narrowed where set edges would show (the frusta union defines what gets modelled, not vice versa).

| stop | position (declared) | look limits | caption beat |
|---|---|---|---|
| S0 | (−24, 1.7, 230) — exists today, west of the Column's axis (DEC-037) | ±35/±35 | the facade and the hour |
| Sh | (−12, 1.7, 177) — halfway on the west rail (R18-ux D1; DEC-037) | ±30 / +25…−20 | the arch beat (caption.s1 reused; no Sh caption authored) |
| S1 | (0, 1.7, 124) — arch approach, on the gate axis | ±25 / +20…−10 | the arch opens |
| G0 | (0, 1.7, 86) — inside the arch plane | ±20/±15 | dark; the square behind |
| G1 | (24, 1.7, 73) — gallery mid | ±30/±15 | compression |
| G2 | (42, 1.7, 73) — east door | ±15/±10 | the door (airlock) |
| J0 | (79, 1.7, −64) — ground entry under the stair | ±35 / +35…−10 | looking up into light |
| J1 | (79, 5.2, −70) — mid first flight | ±35/±35 | the flight |
| J2 | (79, 6.7, −80) — half-landing turn | ±35/±35 | portholes mirror the windows |
| J3 | (73, 9.7, −76) — upper flight | ±35/±30 | the gallery above |
| J4 | (73, 11.7, −66) — landing between the twin columns | ±35/±30 | arrival; the portal (landing airlock) |

> **DEC-037 (the square rail).** The rail no longer lies ON the gate axis — it runs 24 m west
> and meets it at S1; the three stops stay XZ-collinear (the square's `S0/Sh/S1` rows above),
> the subjects untouched, the perpendicular Column clearance 14.57449 m. Supersedes this
> section's on-axis S0/S1 rows only.

Rail: Catmull-Rom through stop positions with two helper points per flight for the turns; `cam` float as today. Inputs unchanged (scroll/drag/arrows). `prefers-reduced-motion`: glides become cuts stop→stop; airlocks force `transit:'cut'`.

> **r18a adjudication (binding).** Path: centripetal Catmull-Rom (α = ½) through the stop
> positions with end phantoms only — mid-segment turn helpers are rejected: centripetal
> parameterisation is cusp-free from the stop data alone and the frozen contracts carry no
> numbers to justify extras (the helper law above is superseded). Gaze = the glide look
> law of walkthrough-ux §8 (R19-ux C). One phase-shaped departure turn blends the
> frozen departure direction toward the live destination aim, then holds its target.
> Back Gj→G0 is a near-field turn (R19-ux C): JUNCTION's ray sweeps ≈82.4° under the
> nominal 0.4 span, so the turn spans the whole segment and the pitch rises monotonically
> from 0° to its 3.06° settle at G0 (2.62° at 7% of the distance, 3.05° by mid-glide),
> superseding FIXUPS 2's ≈10.05° and the round-landed 17.39°.
> Shared targets stay locked dollies; the position path is this section's spline. At
> stops the pose is bit-identical, which keeps the eight goldens green un-rebaselined.
> Only stops whose authored data an R18-ux D-item changes re-baseline, under that item.
> The square's S0 keeps its
> authored gaze (the goldens' cornice framing) and S1 gazes into the arch: a per-stop gaze
> override lives with the square data, S1's target host-resolved to the gallery entry stop.
> Seed precedence on node entry: `?stop=` (known id) > `?cam=` (clamped) > entry; a backward
> entry (through the airlock's home side) seeds the far stop so travel continues in its
> direction. Scroll clamps at the rail ends silently; only arrow steps surface boundary
> intents — the keyboard's airlock across the §1.1 chain. The HUD `data-stop` row (nearest
> stop id) is the e2e reachability instrument: a cut transit's `data-hold-ms` reads 0 by
> contract, so the hold row cannot gate a reduced-motion walk.

### 6.2 Exterior → interior hand-off

- **Near/far:** exterior near/far stay as today (0.5 / 2000); interior near 0.05 m, far = room bounds diagonal + margin, swapped in the arch hold.
- **Exposure:** §4.4 — room constant in, E(h) out.
- **The dome:** resident but `visible=false` indoors; the load path hands background duties to the room (see §2.3 on baked opaque window panes).
- **Goldens** (ADR-0012 style: page-level clip, local-only, platform-suffixed, det): J1 and J4 at `at=` values for the plateau centres (night −12°, dusk −6.6°, day +15°), G1 at night only → **7 goldens for phase 2**. Headless never judges cadence.

---

## 7. Finishing — post stack per tier

| tier | today | phase-2 default | notes |
|---|---|---|---|
| T0 | postEnabled:false | none | hard floor 33 ms; stock tone mapping in material output |
| T1 | postEnabled:false | none (candidate: nothing) | 16.7 ms on Iris 640 at 1080p leaves no room for a bloom chain (declared; measure r17 before anyone wires it) |
| T2 | registered, unwired | selective bloom on emissive chandelier/sconce + window-pane glints (threshold on the emissive channel, half-res, 5 mips) | wiring T2 is in scope only if r17 measurement shows T1 cannot carry any post |

Excluded project-wide: SSAO (this GPU), TAA/motion blur/any frame-history effect (det cannot freeze it), film grain unless seeded and det-frozen.

- **Draw accounting (T2 bloom):** 1 scene pass + 1 bright-pass + 5 down + 5 up + 1 composite ≈ 13 fullscreen draws → the interiors plan ≤220 scene draws so T2 stays under 250.
- **Ledger (T2):** composer read/write 2× 1080p RGBA16F ≈ 2×16 MB + bloom mip chain ≈ 11 MB ≈ 43 MB; T0/T1 zero. Within 256 MB with §4.3 textures, but RTs are the biggest line item — register them.
- **det:** bloom is deterministic (no history), so det=1 leaves the tier's post on; det disables only time (already) and any seeded noise. If a golden proves bloom non-deterministic across driver updates, det forces `postEnabled:false` and that becomes a DEC.

---

## 8. Streaming + housekeeping

### 8.1 Room module + manifest contract

```ts
// rooms/<id>/index.ts
export const room: RoomModule = {
  contract,                                   // RoomContract, §2.1
  async load(ctx, manifest, signal) { /* fetch+decode off-thread; no GPU upload */ },
  mount(ctx) { /* add to scene, register in ledger, initTexture, PMREM */ },
  unmount(ctx) { /* remove; ledger.release(scope); dispose all */ },
};
```

`manifest.json` (generated, §3.2): `{ id, files:[{path, bytes, sha256, kind}], lightmaps:{states, res, intensity}, budget }`. Adding a room later = a folder under `rooms/` + `public/assets/<id>/` + one registry line in `rooms/index.ts` — never a change under `src/engine/` or `src/world/` (phase 2 builds them; the r16 exit gate includes this as a checkable rule).

### 8.2 Loaders (three 0.186.x)

GLTFLoader + MeshoptDecoder (`three/examples/jsm/libs/meshopt_decoder.module.js`, workers=1 on the 2-core machine) + KTX2Loader (`setTranscoderPath('/basis/')`, worker pool 1, `detectSupport(renderer)` once). Policy: fetch + transcode + meshopt decode run off the render path (workers); GLTFLoader.parse and GPU upload run only inside an airlock hold; nothing allocates GPU memory in the frame loop. The basis transcoder is a lazy shared payload (own budget row), not initial JS.

### 8.3 Disposal ledger (asserted)

- **Registers:** geometries, materials, textures (compressed, with VRAM bytes from format×mips), render targets (PMREM, pre-blend RT, composer RTs) — per scope: `RoomId | 'engine'`.
- **Disposes:** `unmount` on airlock `onExit` — the room being left, after the hold, never mid-transit (the two-room overlap is budgeted in §4.3/§9).
- **Assertion, three layers:** (1) a pure ledger module (no three import) node-tested: register/release/snapshot/bytesByScope; (2) dev assertion after every transit: the departing scope is empty **and** `renderer.info.memory` returns to its post-boot baseline (±0 geometries/textures); (3) CI smoke (SwiftShader) walks `#/` → gallery → jordan → gallery → `#/` and asserts the HUD metadata ledger rows equal the boot values with a clean console. Smoke asserts contracts, never cadence.
- **Texture memory ≤256 MB includes transition overlap:** peak = both rooms' textures + both PMREMs + composer RTs — projected ≈ 17 + 12 + 43 ≈ 72 MB at T2 (declared).

### 8.4 No-spinner and long-task rules

Every fetch is triggered by rail position (§1.3) ahead of need; if a hold begins before data is ready, the transit dwells in the dark card with the caption visible (a beat, not a spinner) — the HUD exposes `data-hold-ms` so goldens and smoke can see it; a hold >2 s on the device is a budget failure to fix, not to hide.
Long task: GLTF parse of a ≤3 MB glb and each texture upload must stay <50 ms on the device; otherwise split uploads across hold frames (`initTexture` per texture per frame). Boot-compile janks stay the carried exception.

---

## 9. Box office — budget projection (all declared; re-marked when measured)

| row | gallery | jordan | whole frame (jordan active, T1) | gate | measured in |
|---|---|---|---|---|---|
| triangles: shell / stairs / balustrade+columns / chandeliers+sconces | 60k / — / 20k / 30k | 120k / 90k / 110k (inst.) / 60k | ≤380k in frustum (≤1.0 M) | HUD `data-tris` | r15 (bpy export counts), r16 (frustum), r19 (golden stops: jordan J4 10 702 / gallery G1 1 410 drawn) |
| draw calls (instanced kit) | ≤25 | ≤60 | ≈60 room + post (T1 0) ≈ 60 (≤250) | HUD `data-draws` | r16; r19 whole-frame at the golden stops: jordan J4 114 / J1 96 · gallery G1 27 · square 31 — the ≈60 estimate was low, ≥2× headroom to the gate |
| texture VRAM | 3×0.7 + 1.3 ≈ 3.4 MB | 3×2.7 + atlas ≈ 13.4 MB | peak with overlap ≈ 72 MB (≤256) | HUD ledger rows | r17 (honest ledger rows); r19 totals: gallery 4 708 151 B · jordan 7 044 854 B mounted · two-room overlap peak 11 753 005 B (the exact sum) — ETC1S stays compressed on the GPU, ≤256 MB holds with ~22× headroom |
| payload | declared ≈2.0 MB; measured r15b ≈124 KB (glb + 2 ktx2; lm lands r17) | declared ≈7.0 MB; measured r15c ≈527 KB (glb 439 692 + 4 ktx2 84 512 + manifest; lm lands r17) | per room ≤8 MB; shared basis 584 862 B measured (wasm 527 333 + js 57 529, three 0.186.1), cap 600 000 B | `tools/budget.mjs` payload rows | r15; r19 re-mark with the r17 lightmaps: gallery 228 982 of 2 000 000 · jordan 1 172 871 of 7 000 000 · basis 584 862 of 600 000 — **basis is the tight line now** (never add to `/basis/`) |
| initial JS | +0 (rooms are lazy chunks) | +0 | engine additions ≤ +60 KB gzip (165,175 → ≤225 of 350,000); measured r16a: +70,785 gzip (165,175 → 235,960 of 350,000) — the loader stack (GLTFLoader + KTX2Loader + MeshoptDecoder) costs more than the estimate projected; the 350,000 CI cap is untouched with 114,040 headroom, r16b adds ~1 KB (ledger + HUD rows) | existing budget | r16 (measured); r18b close: **243,239 gzip of 350,000** (rooms stay lazy chunks), 106,761 headroom |
| first frame | unchanged (`#/` paints procedurally) | deep link: dark card + caption ≤1 s, frame ≤3 s on device | device gate | headed only | r19 (measured: card 454–617 ms warm browser, 500–505 ms @10 Mbps; first frame 1 713–1 867 ms, 2 860 ms @10 Mbps — dominated by the declared 1 500 ms hold beat, ledger full before it releases; gates met) |

Gates map to the existing CI: the HUD `data-*` contract (extended with room, ledger and hold amounts) + the r15 budget.mjs payload rows. The declared "jordan at 7.0 of 8 MB is the tightest line" proved pessimistic — measured, jordan is 1.17 of 8 MB; the tight line is the shared basis row (584 862 of 600 000 — never add anything to `/basis/`).

Measured at r15 (committed bpy scripts, byte-identical regeneration, sha256 manifests validated in CI): gallery **2 106** drawn tris (shell 768 · pilasters 30×24 · sconces 42×14 · portal 30; 6 unique primitives, naive node draws 55) and jordan **15 110** (shell 2 770 · stairs 864 · rail 192 · balusters 68×151 · columns 68×2 · portal 260 incl. 2 vases · chandelier 356 · sconces 24×10; 12 unique primitives, naive node draws 181 info-only) — every cap holds with ≥25× headroom; the fixed 64² lightmap grid carries envelope 1 501 + kit 938 of 4 096 cells (jordan). The declared ~60k/~120k shell projections were caps, not targets; r16/r17 re-measure frustum and runtime draws.

Re-marked at r19 (the phase-2 exit device pass: headed Chromium on the reference device, det, T1 1280×720, 10-s HUD median windows, 20 samples each — method per devlog #0002): every row above is measured and green. Frame medians pin the vsync floor (16.5–16.8 ms) on all ten probed scenes — the six room goldens (jordan J4 / gallery G1 × day/dusk/night), jordan J1, the square noon re-check (31 draws / 49 807 tris, byte-identical to the phase-1 pass — the rail and caption overlays cost nothing measurable), and T0 floor checks (jordan J4 day, gallery G1 night) at the same medians. Zero long tasks after settle in every window. Deep-link first frame (the §10 r19 device gate): dark card + caption 454–617 ms (first page after browser launch 1 018 ms — cold process start, not product cost), first frame 1 713–1 867 ms unthrottled and 2 860 ms (jordan) / 1 869 ms (gallery) under a 10 Mbps + 40 ms profile — the fetch finishes well inside the declared 1 500 ms hold beat, so the gate is hold-dominated, not network-dominated. Disposal: ledger 0 → 4 708 151 (gallery mounted) → 7 044 854 (jordan mounted) → peak 11 753 005 during the gallery→jordan hold (exactly the two mounts' sum) → 0 back on the square, matching the CI smoke's boot-values assertion.

---

## 10. Production schedule — relay rounds (split, never widen)

| round | delivers | exit gate | must not touch |
|---|---|---|---|
| r14 (this) | docs/design-staircase.md; owner disposes Q1–Q10; orchestrator then writes ADR/DEC entries | doc merged; dispositions recorded | any `src/` |
| r15 asset pipeline | `tools/bpy` (both rooms' kits, placeholder materials), `tools/gltf`, KTX2 toolchain pinned, manifests, budget.mjs payload rows, `pnpm asset:*` | both glbs regenerate byte-identical twice locally; CI validates sha256 + payload rows; tests green | `src/engine`, `src/world` (they don't exist yet — they are not started here) |
| r16 runtime | src/world (shell visibility, registry, airlock seam, streaming), src/assets (loaders, prefetch), ledger (pure + dev assertion + smoke walk), rooms/<id> scaffolding with the r15 glbs, HUD rows, routes | smoke walks the graph with the ledger back to baseline (transits driven directly in-test; rail-driven walking asserted in r18); initial JS ≤225 KB; draws/tris within §9 on the device | §8 weights, URL grammar, tier registry semantics |
| r17 lightmaps | Cycles bakes ×3 per room, bake logs, technique A (or B after the §4.4 measurement), ADR-0013 probe, interior exposure constant; T1/T2 post measurement | 3 states per room blend under the frozen weights; goldens at 3 plateaux captured locally; ledger holds; bake logs committed | src/world (API frozen after r16; additive hooks only), src/engine |
| r18 camera rail | src/camera (spline, stops, look limits, inputs, reduced-motion cuts), captions + a11y; may split r18a rail / r18b stops+captions — pre-split further to rail+inputs vs stops+captions+a11y if scopes crowd | all 10 stops reachable by keyboard; reduced-motion cuts verified; goldens J1/J4/G1 stable | src/world, src/assets, materials |
| r19 phase-2 exit | contract check per room, device gates headed, disposal verified, devlog #0002 with hero frame, URL updated, ATTRIBUTIONS/artistic-license synced, ROADMAP line closed | deployed URL; all §9 rows re-marked measured | everything except docs and gate-failure fixes |
| r20 phase-2b night windows | the DEC-019 lattice: pure level law (hash/split/intensity/visibility/ground-warm) + the pane builder (3 InstancedMesh, stock materials), unit tests, the Dec-21 21:00 golden; main.ts wiring by the orchestrator | facade reads from the lattice alone at 21 Dec 21:00; +≤3 draws, +≤~4k tris, 0 custom slots, +0 lights; day/dusk and room goldens bit-identical; reference-device frame time within +0.2 ms | the three-state contract, facade kit materials and geometry (the slot is reserved for snow), the day/dusk sky palette, light counts, UI |
| r21 look response | the free-look feel (owner report: drag too fast, nauseating): a new pure look law — damped target/current split, viewport-normalized sensitivity, touch-safe deltas — + tests; the rail/main.ts patches applied by the orchestrator | drag-to-look feels slow and organic on desktop and mobile; at rest the rendered pose is bit-identical (goldens gate); reduced-motion keeps the damping; the keyboard walk e2e unchanged | the committed stop data, pose law and look limits (§6.1); glide durations; wheel/scroll/arrow semantics; captions/a11y; the HUD contract |
| r22 Russian voice + /notes redesign | DESIGN relay: the specialist decides the language model (RU-default + toggle), the Cyrillic-capable self-hosted typography replacing system-ui, and the /notes redesign (senior-minimalist, stands out); delivers docs/design-i18n-notes.md with the EN→RU text inventory + the implementation plan; the owner dispositions, code rounds follow | the design doc merged after owner disposition; no code | any src/ (code rounds come after the disposition) |

If the r16 initial-JS headroom (+60 KB) proves optimistic, pre-split r16 into r16a (registry + airlock + loaders) and r16b (ledger + smoke walk). — Happened as advised: measured r16a is 235,960 gzip (the +60 KB estimate missed by ~11 KB), the 350,000 cap holds.

---

## 11. ADR/DEC candidates (one line each; the orchestrator writes them after owner disposition)

1. **DEC — Room registry & contract form:** rooms are `rooms/<id>` modules + generated manifests registered in one list; the square is a static resident, not a room — because the default route must paint with zero fetches and a resident cannot honestly carry a disposal scope. *Rejected: square as room 0.*
2. **DEC — Airlock is a seam:** airlocks are neighbor-edge objects owning portals, transit and the only legal dispose/swap hooks — because lifecycle must be local and assertable. *Rejected: airlock-as-room (burns the ≤7 cap on corridors).*
3. **ADR — Lightmap blend technique (post r17 measurement):** default A, custom slot 2 of 2 — because it is the only continuous **and** compressed consumption of §8. *Rejected: B-RT (uncompressed 16–32 MB/room), B-discrete (breaks the hour promise).*
4. **ADR-0013 — Interior environment probe:** one static dusk cube probe per room, PMREM once in the airlock hold, intensity scaled from §8 weights — because gilding needs specular and the frame loop must stay allocation-free. *Rejected: per-state probes (3× memory, swaps), no probe (flat gilding — flip condition kept).*
5. **DEC — Post stack:** T0/T1 none, T2 selective emissive bloom only, no history-dependent effects — because Iris 640 at 1080p has no post headroom at 16.7 ms and det must freeze goldens. *Rejected: SSAO, TAA.*
6. **DEC — Loader/toolchain pins:** Blender 4.2 LTS, gltf-transform + Meshopt, KTX-Software toktx single-threaded ETC1S, three 0.186.x GLTFLoader/MeshoptDecoder/KTX2Loader, CI verifies sha256 only — because committed binaries must regenerate deterministically and Blender never runs in CI. *Rejected: Draco (decoder weight for no texture story), re-encoding in CI.*
7. **DEC — Deep-link cold-load beat:** rooms open on a dark caption card, never a spinner; `data-hold-ms` exposed — because no-spinner is charter and holds must be measurable. *Rejected: progress bar.*
8. **DEC — Windows baked opaque (flippable):** jordan panes carry the baked sky per state — because the dome's exposure follows E(h) while interiors follow bakes. *Rejected: see-through dome.*

---

## 12. Open questions — orchestrator dispositions

Each: decision · blocks · options · recommendation · default if silent.
Dispositions (owner, 2026-10-17): **all ten defaults accepted** — the room graph, airlock seam, 2048²/1024² state split, measurement plan §4.4, static probe §5, door-fade arch, post-stack (a), baked-opaque windows and the dark-card cold load all stand as written; Q5 keeps its measurement plan, so the blend ADR is deliberately still unwritten until r17 measures.

**Q1 Room segmentation for phase 2** — blocks r15 (kit list), r16 (registry). (a) two rooms (gallery, jordan) + landing airlock to ∅ · (b) merge the gallery into jordan as one approach sequence (one room, one manifest, one 8 MB cap for everything) · (c) three rooms incl. a ground-floor Jordan Hall colonnade (spends a 3rd of 7 lifetime rooms). Trade: (a) keeps the compression beat its own light-state set and leaves jordan 7 MB headroom; (b) simplest runtime but the gallery eats jordan's payload and loses its own bakes; (c) closest to history, costs a lifetime slot and a round. **Recommend (a). Default (a).**

**Q2 Airlock placement and the courtyard compression** — blocks r15 (portal geometry), r18. (a) gallery runs east inside the south block, airlock cut to the east-end staircase (declared compression, §1.1) · (b) gallery runs north through the arch, cut at the courtyard mouth · (c) model a compressed courtyard crossing as part of the gallery (more kit, exterior-lit). **Recommend (a): the longest dim walk, the cleanest cut, true coordinates in both rooms. Default (a).**

**Q3 Airlock as seam vs room** — blocks r16. (a) seam · (b) room. **Recommend/default (a)** (§2.4).

**Q4 Lightmap state count/resolution per room** — blocks r15 (UV2 packing), r17. (a) jordan 3×2048², gallery 3×1024² · (b) both 3×2048² (+1.5 MB payload, +6 MB VRAM) · (c) gallery 1 state (breaks contract uniformity — the contract expects 2–3). **Recommend (a). Default (a).**

**Q5 Blend-technique acceptance plan** — blocks r17 only; r15/r16 are technique-agnostic if UV2 + per-state intensities are emitted either way. (a) measure A vs B-RT vs B-discrete per §4.4 and let the thresholds decide · (b) commit to A now, skip measurement · (c) commit to B-discrete (saves the slot, loses continuity). **Recommend (a) with A as the presumptive winner. Default (a).**

**Q6 Environment probe** — blocks r17. (a) none · (b) static probe + weighted intensity (§5). **Recommend/default (b)**; flip condition recorded.

**Q7 Arch plane: fade-through-card vs cutting an arch in the massing** — blocks r16. (a) doorway fade inside the card plane, massing untouched · (b) r16 cuts an arch opening in the card (touches the procedural massing, risks the facade goldens). **Recommend (a). Default (a).**

**Q8 Post stack contents** — blocks r17's measurement scope only. (a) T0/T1 none, T2 selective bloom (§7) · (b) T1 gets a half-res bloom if measured <2 ms · (c) no post in phase 2 at all (T2 stays unwired). **Recommend (a); (b) only on measurement. Default (a).**

**Q9 Windows: baked opaque vs see-through dome** — blocks r15 (pane geometry/UVs) and r17. (a) baked opaque panes · (b) see-through with stencils, the dome rendered indoors. **Recommend (a). Default (a).**

**Q10 Deep-link cold-load presentation** — blocks r16. (a) dark card + caption of the entry stop · (b) land on the square and auto-glide (ignores the URL for seconds). **Recommend/default (a).**

Parked and not reopened here: Rastrelli ink-transition, audio, tier watchdog.
