# Phase 3 — The Gallery · DESIGN relay (creative tier; docs-only round)
Opened 2026-10-21 · Landed 2026-10-21 · Merged (sha7 not stated at the pin) · slot not stated · briefs not stated (the specialist's §0–§12; §12 carries the record) · vault projects vN not stated · DEC-021, DEC-022, DEC-023, DEC-024, DEC-025, DEC-026, DEC-027, DEC-028, DEC-029, DEC-030

## Ask
Design the Phase 3 Gallery (the 1812 room): the specialist's §0–§12 integrated with verdicts against sources (en.wiki + ru.wiki, both retrieved this day). The portrait fork was ruled stylized stand-ins by the owner before the brief. Q12 added (tier declaration per the relay-routing rule). Twelve owner forks queued (defaults safe).

## Relay shape — one line per stage that produced a surviving fact
1. Specialist §0–§12 (creative tier) → adopted near-wholesale.
2. Integration verdicts against en.wiki + ru.wiki (location, lanterns, rows, monarchs, Stasov rebuild, arithmetic, SPA concern, goldens, stop ids, caption keys).
3. Post-row verification pass (same session) against the committed location plan and the Field Marshals' Hall article → east-wall doors restored, x band plan-supported, card text finalised.
4. Owner dispositions (2026-10-21): all twelve defaults accepted → DEC-021…030 written in decisions.md.
5. Photo check (same session, Hau's 1862 watercolour) → end-wall, wall colour, night-light, parquet and COL_PITCH corrections; DEC-026 amended pre-code.

## Verdicts
Integration verdicts (stage 2):
- Location: the gallery sits between the ARMORIAL Hall and St George's (not directly off the Field Marshals' — the specialist's own challenge confirmed); the card note becomes «Через Фельдмаршальский и Гербовый залы» and the compression register row cites the eastern enfilade.
- THREE skylight lanterns verified (its verify marker closed). FIVE rows per wall verified against the ru hanging scheme.
- The monarchs are LARGE EQUESTRIAN canvases (Kruger ×2, Kraft ×1) AT THE END WALL — its §2.5 east-wall door + §6.1 S4-looking-east inconsistency resolved into one end-wall composition (monarchs over the closed St George's doors).
- Stasov's post-1837 rebuild sourced (lengthened ~6 m, choirs above the cornice) → choirs/grenadiers/Hess recorded as declared omissions; the 13 green-silk frames (generals with no surviving image) recorded as a sourced v2 roster detail.
- Its SPA-rewrite concern dissolved (hash routes need no server rewrites — R6 verifies types/speed only).
- Stop ids renamed S0–S4 → M0–M4 (S collides with the square's committed S0/S1); caption keys adapted to the committed grammar (caption.m0–m4, data.title1812).
- Placement x-band: a declared convenience [verify against a plan before R1] — later plan-supported (stage 3).
Post-row verification pass (stage 3):
- The committed location plan read — the gallery is a narrow N-S strip continuing the STAIR-HALL tract southward with the palace church between («a few steps», sourced) and St George's as the E-W hall along its EAST side → the specialist's original east-wall St George's doors RESTORED (the orchestrator's interim south-end folding reverted); the declared x band now plan-supported.
- The Field Marshals' Hall article places the FM/Petrovsky suite in the WESTERN part (Montferrand 1833) → the navbox order is the TOUR order.
- The gallery is reached from the ARMORIAL side (ru.wiki) → card text finalised «Через Гербовый зал — в Военную галерею».
- Rotunda ruled out (NW wing, links state rooms to the private apartments).
Photo check (stage 5, Hau's 1862 watercolour, sourced):
- The end wall is ONE monarch portal (Alexander I equestrian, pediment + drapery + step) flanked by two dark doors; the allies' two equestrian canvases hang on the long walls' final bays.
- The walls are CRIMSON below the cornice band (the off-white-wall draft corrected).
- The night light is floor torchère candelabra (not wall sconces — DEC-026 amended pre-code).
- The parquet is a bold checker-diamond, not herringbone.
- The vault's grisaille programme recorded as a declared omission.

### DEC-021 — Portraits consume the atlas through merged canvas quads with baked atlas UVs on one stock material
Seven draws carry every portrait in the room and the last custom-material slot stays unspent (DEC-009 + ADR-0014 hold two of three; the slot is kept for something the camera cannot fake). Rejected: InstancedMesh with per-instance UV offsets — it needs onBeforeCompile and would spend the last slot; committed per-frame GLB geometry — payload for data the layout law already states. Numbers (seven draws; two of three slots held): no attribution tag stated at the pin.

### DEC-022 — The frame kit is generated at build and run time from one layout law; zero committed frame geometry
The same named-constant module feeds the bake rig and the runtime, so bake-time and run-time geometry are identical by construction (DEC-006 assets as code). Rejected: a committed GLB of 335 frames. Number (335 frames): no attribution tag stated at the pin.

### DEC-023 — Portrait atlas law: one 2048² KTX2 ETC1S texture, 96×120 px slots, 21×17 grid, slot index the only atlas–geometry contract, 3 px inset, 2 px gutters; the three monarchs as 2×2 blocks, slot 356 the "missing" slot
Small canvases at painterly stand-in quality fit one texture; the basis decoder row never moves. Rejected: one texture per block (draw and payload explosion); 4k atlas (VRAM line); single-slot monarchs (illegible at M3). Numbers (2048², 96×120 px, 21×17, 3 px, 2 px, 2×2, slot 356, 4k): no attribution tag stated at the pin.

### DEC-024 — The stand-in generator is a pure-JS deterministic rasteriser keyed by hash(SALT, slot)
Silhouettes, uniform/facing palette entries, tone noise and vignette from hash bit fields; Math.random is forbidden; byte-identical reruns are the CI gate under the DEC-016 toolchain pins. Rejected: node-canvas (platform anti-aliasing breaks byte-identity).

### DEC-025 — The landing airlock retargets to the 1812 room; the transit is a cut; the compression note rides the card; the "to be continued" card module is deleted
The sourced walk passes unbuilt state rooms (the gallery's rooms sat between the Armorial Hall and St George's), so a doorway glide would claim a false adjacency; the M4 stop caption carries the end-of-route sentence. Rejected: a second airlock beside the first (an orphan seam and a second dispose path on one landing); doorway glide; relocating the placeholder card.

### DEC-026 — The gallery's night state is the gilt torchère candelabra standing against the piers (Hau 1862, sourced); the manifest key stays `nightChandeliers` with a per-room display map
Data keys are raw tokens (DEC-020's law); the watercolour shows floor candelabra, not wall sconces (the pre-code verification pass corrected the relay's draft). Rejected: renaming the key; inventing chandeliers to match the key name. Amended pre-code at the photo check (same session, 2026-10-21).

### DEC-027 — Lightmaps: 2k² architecture + 1k² frame kit, three states each
Texel density goes where the camera reads (M2 looks into the vault; 335 small gilt rectangles need bevel pitch, not area). Rejected: single 2k (frame texels fall below the bevel pitch); 4k (VRAM line and bake time). Pre-declared fallback if the swap VRAM line fails: the frame kit at 512² — art/tier, never a loosened number. Numbers (2k², 1k², three states, 335, 512²): no attribution tag stated at the pin.

### DEC-028 — The room index is a registry-driven native `<dialog>` behind one dim chrome button; jumps take the airlock cold-entry path
The registry is the index (no second list, no "coming soon"); one code path for URL and index entry; keyboard-complete. Rejected: persistent sidebar/minimap (UI nearly absent); hidden-until-Tab (invisible controls fail keyboard and discovery); bespoke modal.

### DEC-029 — Route slug `#/1812`
Short and language-neutral; hash paths need no server rewrites. Rejected: `#/military-gallery` (English-first).

### DEC-030 — The stand-in portraits are declared in the license register in the phase they ship, with the v2 swap path recorded
(The owner's ruling, 2026-10-21.) One atlas slot per portrait; v2 replaces the generator with a per-roster-key importer of public-domain images — geometry, UVs, lightmaps and goldens untouched; the 13 green-silk frames (generals with no surviving image) are the v2 roster's own detail (sourced, per the row).

## Measured — every budget line as stated at each flip, with the flip date
- 2026-10-21 (integration): golden arithmetic fixed — 9 scene goldens today → 12; room goldens 6 → 9.
- 2026-10-21 (integration): 11 blocks × 5.0 pitch ≈ 52 m of 55 closes (the specialist's «0.62 m pitch fills only ~20 m» was wrong).
- 2026-10-21 (photo check): COL_PITCH re-fit target ~0.8–1.0 m with 3-col bays and ~1.0–1.4 m strips.
- Attribution tags for the above: none stated at the pin.

## Hunt / found / fixed
- Found: the specialist's arithmetic challenge («0.62 m pitch fills only ~20 m») was wrong → 11 blocks × 5.0 pitch ≈ 52 m of 55 closes; its parametric-placeholder conclusion stands.
- Found: §2.5 east-wall door + §6.1 S4-looking-east inconsistency → one end-wall composition; then the east-wall doors RESTORED from the committed plan (interim south-end folding reverted).
- Found: SPA-rewrite concern → dissolved (hash routes need no server rewrites).
- Found: stop ids S0–S4 collide with the square's S0/S1 → M0–M4; caption keys → caption.m0–m4, data.title1812.
- Found (photo check): off-white-wall draft → CRIMSON walls; wall sconces → floor torchère candelabra (DEC-026 amended pre-code); herringbone → checker-diamond parquet; monarch arrangement → one monarch portal + allies on the long walls' final bays.

## Gates — passed · deferred-not-waived → who carries · owed
- Passed: verify marker on the three lanterns closed; five rows verified; photo check CLOSED (same session).
- Passed: owner dispositions — all twelve defaults accepted (2026-10-21).
- Owed → R1 (asset A, the kit — mechanical tier) proceeds after the photo check of the monarch-wall and east-door compositions (closed this session); x band to be verified against a plan before R1 (now plan-supported).
- Declared omissions: choirs/grenadiers/Hess; the vault's grisaille programme.

## Mentioned elsewhere — segments about this round that lived in other rounds' records
None in this batch (R1/R6 references above are forward pointers inside this round's own row).

## Sources — file · entity · line range @ <pinned commit>
- docs/briefs/ROUNDS.md · row roundNo 27 · line 55 (3537 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- docs/decisions.md · DEC-021…DEC-029 · lines 42–50; DEC-030 · lines 51–52 @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e
- Integrated per the row: docs/design-gallery.md, docs/decisions.md, docs/briefs/ROUNDS.md, docs/STATE.md
- en.wiki + ru.wiki (retrieved 2026-10-21); the committed location plan; the Field Marshals' Hall article; Hau's 1862 watercolour
