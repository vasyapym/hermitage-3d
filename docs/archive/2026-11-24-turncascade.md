# turn-cascade — the climb's pre-turn cascade + slice 2b the wall order (2026-11-24, PARALLEL lane)

The owner's two-task ask, worked as one PARALLEL lane: worktree branch `jordan-turn2` off
origin/main 77d5849; the merge + the FULL gate ride the owner's signal.

## Task 1 — the turn redistribution (the owner's ask, Option A confirmed at the sitting question)

The first two Forward clicks turn a bit more to the right and upwards, by around 13% for
both, so the third click (the arrival at the FOURTH stop, J2) keeps less rotation — the
turn-preview's fraction law extended down the climb.

- J1's subject: MEZZ_LIGHT → **FLIGHT1_TURN [70.4, 8.1, −83.5]** — 13% of the angular way
  from the mezzanine light toward the chandelier's crown, on the light's ray (11.2 m out,
  the locked climb's anchor distance kept). J0 keeps MEZZ_LIGHT (the locked climb ends here).
- J1b's subject: FLIGHT2_TURN [76.0, 10.1, −83.8] → **[76.4, 10.4, −82.6]** — the pre-turn
  fraction 23% → **36%** (the 13 points), on the sconce's ray (10.6 m out); the sconce stays
  in frame left (az ≈18° off gaze centre, the turn-preview's ≈11° widened); caption j1b
  unchanged. The fixtures rig law untouched (jordan_fixtures.py SCONCE_GAZE_POINT).
- The click swings: 4.0 / 47.9 / 52.8° → **10.2 / 47.4 / 45.7°** — the press-3 arrival loses
  ~13% of its turn; the §9 MAX_SWING 90 head law holds; the ~58° design-frame sentence in
  contract.ts rewritten to the current truth (the turn-preview 52.8°, the pre-relaxation
  63.7°). stops.test.ts pins all three rows (J0→J1 and J1→J1b added; J1b→J2 re-pinned
  52.8 → 45.7).

## Task 2 — the room survey → the creative's pick → slice 2b «the white-and-gold wall order»

The room dossier cut from the committed tree (facts-jordan-room.md in the vault session
folder), creative brief 1 issued (the design draw; Fable-class relay), the owner trusting
the pick. The creative ranked 8 lacks and picked **slice 2b** — the wall fields the room's
own record named next three times (archive 2026-11-03:35, 2026-11-15:13/24, STATE «Owed»)
— with **lack 3 as the method**: the rg-f6 declared-host adoption law brought into this
room (exported-never-baked: no cells, no re-bake, the plates byte-identical). Deferred by
the same reply: the coffer rosettes (low read at 18–20 m), the J2 caption copy-truth (the
owner's voice), the south-wall mirrors (runtime reflection — the engine fence).

- NEW `tools/bpy/jordan_walls.py` (the kit): 12 dressed panels (2.2 × 4.4 m stucco band +
  gilt fillet + scroll-lozenge cartouche + drop; the 2 east bays OMITTED — the sconces at
  z −82/−66 sit inside the planned spans, L5's omission law), 12 gilt porthole rings, the
  cornice's lower-step fascia re-slotted to gilt (16 faces). ONE `wall_order` mesh, 2
  primitives (plaster_warm, gilt), 2,076 faces / 4,296 tris.
- `tools/bpy/jordan.py`: the importlib module load (the fixtures module law), the strict
  WALL_ARTICULATION env (unset 'none' | 'slice_2b', else RuntimeError), the export-only
  hook (`if not BAKE`), the realize dispatcher branch, the cell-counter skip
  (`lmFirstCell: None`), the summary's declared row. `tools/gltf/jordan.mjs`: the same env
  law + the conditional EXPECTED_INSTANCES / MATERIAL_SLOTS rows + the gate cross-checking
  the summary's fascia branch.
- **The adoption law (L6)**: every dress face adopts ONE host shell face's own bbox→cell
  mapping (clamp into the host cell's interior ≥ 2 px, LM_PAD_PX's law), hosts found by
  point-in-polygon on the wall plane, bars pre-split at the shell's field edges — no
  triangle's UV1s span two cells; the dress inherits the wall's day/dusk/night irradiance
  texel-for-texel (the night pier halos honoured per bay — no ghost class).
- **The chain discoveries, en route**: (1) the gitignored `plafond-art.png` was absent on
  this machine (the janitor hygiene) — restored by the committed rasterizer
  (`tools/bpy/plafond-raster.mjs`, Chromium headless-shell; ×2 sha-identical); (2) HEAD's
  committed assets are a `FIXTURE_FORM='slice_e'` build — with the right env the geometry
  returns to HEAD EXACTLY (31,882 / 7,034 / 44 / 3,372); (3) the residual machine-parity
  delta = 3 rows (glb −84 B quantizer-JSON parity, neva +9 B Blender float, plafond −60 B
  re-rastered encode) — **the owner accepted the re-baseline** (this Mac's chain = the new
  build reference; the Owed «Mac-rebuild parity» item's verdict). The lm ×3 + probe + 4
  albedo rows byte-identical throughout.

## The review pass (astra-6.2, brief 2, 7/10 — 16 findings: 14 fixed, 1 deferred)

- The top BREAKS, confirmed by the orchestrator's read: **01** the opposing slab flanks'
  winding (the ref-behind trick forces the always-reverse; identical parametric order ⇒ one
  flank winds inward — the fix: the ref outward + per-edge flank normals; the glb −236 B);
  **02** the clearance templated the kit's placeholder sconce, not the shipped slice_e
  archetype (the fix: the shipped builder through the hook's namespace dict).
- The SURVIVABLE tier fixed: the decoder await (03), the T8 pins as base-commit shas (04),
  the per-face clearance gaps (05; the roster re-verified 12/0-shrunk), the host-identity
  instrument (07, bounded interior samples), hashing the plate bytes not the manifest
  strings (08), the emit-extent law (09), the gate pins (16 fascia faces, 32 gilt tris, the
  exact omissions) (10), the directory byte sum (11), the fillets' exposed end caps
  (+8 tris/panel → 4,296) (12), the report reset (13), the byteOffset default (14), the T5
  strictness (15), the license row's wording (16).
- **06 deferred**: the per-mesh cell-ownership instrument — the ownership data is not
  available outside the bake chain; gating it needs a manifest/chain change. A next-step
  instrument round.
- The full trail: `round-1/FINDINGS.md` in the vault session folder.

## The measured (final)

- wall_order 2,076 faces / **4,296 tris** ×1 instance, 2 prims; cornice 190 tris / 2 prims;
  drawn 31,882 → **36,178** (+4,296); unique 7,034 → **11,330**; draws 44 → **47** ≤ 60;
  decode cells **3,372** unchanged; payload dir **1,777,597** / budget row **1,783,733** of
  7,000,000; glb **439,648 B** sha 38050c79…; JS **289,527**/350,000 (+8, the Task-1
  literals); RU 7,609 ±0.
- validate GREEN: tsc 0 · biome clean · vitest 69 files 1,254 passed / 2 skipped · build
  ok · budgets ok. The T9 'none' check: byte-identical to the re-baselined reference
  with and without the kit code.
- The FULL gate (e2e + the darwin goldens + the DEC numbers) stays with the LAST merging
  session (deferred NOT waived). The jordan scene goldens flip by design (the north wall is
  in every stop's frame) — the DEC-ready rows for the darwin battery.

ARCHIVE-APPEND 2026-11-26 — Trap 1, retired 2026-10-28, moved from STATE 2026-11-26 (the Transport traps list): the MASKED-marker protocol. The transport masked verbatim numbers exactly once — the single incident that wrote this list — so the marker protocol (`MASKED-IN-BRIEF: keep the <name> value`) is no longer used in briefs. Numbers still belong in orchestrator-owned files where convenient, as ordinary content.
