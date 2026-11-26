# jordan-next — the plafond-arrival + the Neva backcloth (2026-11-23)

The lane's full trail (the STATE/ROUNDS rows carry only the flip shape). PARALLEL worktree
`hermitage-3d-jordan-next`, branch `jordan-next` off main 8b5618d; the merge = the ff to
main; the FULL e2e/golden gate + the CI verdict + the due re-baselines ride the LAST
merging session of the wave — deferred NOT waived.

## The round's two parts

- **Part A — the plafond-arrival gaze (the owner's ask, the IMG_0019 reference).** Press 3's
  stop J2 re-authored: CHANDELIER_CROWN [86, 15.5, −74] (the chandelier's crown), the base
  gaze ≈24° up — the owner's own framing (the plafond PARTLY in frame; a plafond-centred
  ≈41° attempt read as too much rotation and was re-pinned the same day; the ceiling centres
  one manual drag away, pitchUp 35). The R18-ux D4 flight-top read retired; the D-J2b locked
  pairing (J2/J2b shared subject) retired — J2b keeps FLIGHT2_TOP alone; the J1b→J2 swing
  ≈63.7° (the ~58 design frame relaxed, the §9 MAX_SWING 90 holds), J2→J2b ≈28.7°; the pins
  in tests/stops.test.ts.
- **Part B — «the Neva backcloth» (the creative's pick, brief 29, Fable 5.1).** The round's
  census fed the creative; it named the twelve blank emissive window cards the room's
  biggest lack (the captions call the light four times) and designed the painted view plate:
  the lead-grey Neva with the silver shimmer, the far-bank silhouettes, the fortress with
  the gilt spire, the pearl sky with stratus, the painted glazing bars (no modelled
  mullions exist). The plafond round's own mechanism: tools/bpy/neva-art-gen.mjs (composes
  the SVG from tools/jordan-windows.json — the bay table parsed from jordan.py's
  constants) → tools/bpy/neva-raster.mjs (the deterministic Chromium raster, the msedge
  fallback; the mean pin 0.7513 gates the WRITE) → toktx ETC1S 22,861 B →
  tools/gltf/pane-neva.mjs (the one-shot transport: the pane's wall-space UV0
  u (x−66)/26 v (y−2)/16, the baseColor + emissive binding, the CLAMP sampler,
  verify-then-commit). Captions j0/j1/j2b/j4 de-stubbed (RU + EN); the EN pins updated.

## The no-re-bake deviation (the round's one law call)

A UV0-only glb change shipped WITHOUT a lightmap re-bake: the lm channel TEXCOORD_1 is
untouched, the bake scene bit-identical, the three lm ktx2s never regenerated. The proof:
probes/f8-logical.mjs — the decoded base-vs-output POSITION/TEXCOORD_1/NORMAL/indices
element-wise IDENTICAL. The DEC-ready golden-flip row parks for the LAST merging session
(the J4 ×3 + the jordan day/dusk scene frames — the pane look changed in every frame). The
Mac-rebuild parity stays open: jordan.py's neva_wall_uv writes the Blender-space v
((18−y)/16 — the exporter's V-flip assumed, never exercised here); a rebuild verifies
against the transport's output (9b30ac7b…).

## The review pass (astra-6.2, brief 30) — 7/10

8 findings: 7 fixed (the spire into the glass-visible band — the tip 6.49 < the 6.5 pane
cut; the mean gate blocks the rasterizer's write; the transport's verify-then-commit + the
ktx2 pre-require; the CLAMP sampler; the square-only canonical raster; the explicit
opacity), 1 declined (the V-flip — refuted by the F1b capture). The full ledger:
the vault briefs folder round-29/FINDINGS.md. The J1 spire glint reads marginally — the
owner's eye rules; the caption fallback (drop «и шпиль») parked.

## The measured

payload jordan 1,678,429/7,000,000 (+23,132: the ktx2 22,861 + the glb +100 + the manifest)
· texture 1,330,002/4,000,000 · tris drawn 31,882 / unique 7,034 unchanged · draws 44/60 ·
decode-cells 3,372 unchanged (the atlas counts faces, not textures) · JS 288,350/350,000
(+196 — the caption texts; RU 7,524/12,000) · basis unchanged · GEOMETRY_SHA 9b30ac7b… ·
vitest 1,232 green / 2 skipped (68 files) · tsc 0.

## The parked items the round carries

- The J1 spire verdict (the owner's eye; the caption fallback).
- The Mac-rebuild parity check (the pane UVs/sampler/orientation vs the transport).
- The D3 tint option (the per-state pane tint vec3, ≈ +250 B gz) if a dusk capture reads
  cold — the design's declared stage-2, not spent.
- The runner-ups (the creative's own list): the 2b/window-wall articulation (a re-bake
  occasion, bundle with the frame corner-joint rework); the mirror plates (one bay first);
  the grisaille niche figures (after the backcloth's read proves).

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **jordan-next** | the Jordan Staircase's plafond-arrival + finishing round (PARALLEL, worktree branch jordan-next off main 8b5618d): part A the owner's ask — press 3's stop J2 re-aimed at the chandelier's crown with the painted plafond partly above (CHANDELIER_CROWN, the base gaze ≈24° up — the owner's reference framing; a plafond-centred ≈41° read as too much rotation and was re-pinned; the D-J2b locked pairing retired) · part B the creative's own pick over the room census (Fable 5.1, brief 29): «the Neva backcloth» — the painted ORIGINAL view plate on the twelve window panes (the plafond's mechanism: the SVG → the deterministic raster (the mean pin 0.7513) → toktx ETC1S 22,861 B; the glb transport tools/gltf/pane-neva.mjs: the pane's wall-space UV0 + the baseColor/emissive binding + the CLAMP sampler; NO re-bake — the lm channel untouched, the decoded base-vs-output comparison element-wise IDENTICAL; the deviation + the DEC-ready golden-flip row parked for the merge) · the review pass (astra-6.2, brief 30, 7/10): 7 fixed / 1 declined (the V-flip refuted by the captures) | MERGED (the ff to main) — SPENT; the measured: payload 1,678,429/7,000,000 (+23,132) · tris/draws unchanged (31,882 drawn; 44/60) · decode-cells 3,372 unchanged · JS 288,350 (+196 — the caption texts; RU 7,524/12,000) · vitest 1232 green · the FULL gate + the DEC numbers ride the LAST merging session (deferred NOT waived) |
