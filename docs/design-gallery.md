# Design — Phase 3 · The Gallery (v1)

The design document for Phase 3 (ROADMAP.md): the Military Gallery of 1812 as room three, the full route end to end, the room index, and the v1 exit. Produced by the design relay (docs/briefs/ROUNDS.md), integrated and fact-verified by the orchestrator 2026-10-21.

Marker legend: **[sourced]** — verified against a cited source at integration; **(verify)** — a declared design value to check against sources before/at the build round that consumes it; **(re-measure)** — a declared number the reference device owns at the light or exit round. Sources: en.wiki + ru.wiki "Military Gallery / Военная галерея" (both retrieved 2026-10-21), ATTRIBUTIONS.md rows to land with the license round.

## 0. Overview

Phase 3 ships room three, the Military Gallery of 1812 (route `#/1812`), and with it the first complete route of Zimny: Palace Square → arch portal → Rastrelli Gallery → Jordan Staircase → landing airlock → Military Gallery, ending at the closed doors to St George's Hall. It builds the gallery kit (shell, barrel vault, three skylight lanterns, doors, pilasters), a merged-geometry frame kit carrying 332 bust-length stand-in portraits plus the three monarch stand-ins on the end wall, one deterministic portrait atlas, the retargeted landing airlock, a registry-driven room index with deep links, three new room goldens (every room then golden in all three states), and the v1 README/architecture pass. The one signature idea: the gallery is a single long perspective of gilt rows lit only from above — the three skylight lanterns are the room's sole daylight [sourced: "потолок с тремя световыми фонарями", ru.wiki], so the three lightmap states are not three weathers but three positions of the sun over the same roof; the portraits are honest stand-ins, one atlas slot each, so v2 can swap the atlas for Dawe's canvases without moving a single vertex.

## 1. Script and beats

1.1 Route extension. The graph gains one edge: `jordan ⇄ 1812` via the existing landing airlock. The square stays resident; rastrelli-gallery and jordan are untouched modules. Adding the room is one folder under `rooms/1812` plus one registry line (DEC-013; rule 8 "core stays core").

1.2 Airlock: retarget, not new. The landing airlock already owns a portal box at true coordinates on the jordan landing and a declared hold beat; its far side changes from `null` to `1812` with a portal box at the gallery's north door. Rejected: a second airlock beside the first — it would leave an orphan seam and a second dispose path on the same landing (DEC-014: one seam per neighbour edge).

1.3 Transit kind: cut. The real walk from the staircase runs through the state rooms and reaches the gallery from the Armorial Hall: the rooms the gallery replaced sat "between the Armorial Hall and St George's Hall, in the middle of the main block" [sourced: ru.wiki], the tour order ends Armorial → Military Gallery → St George's [sourced: the Hermitage tour sequence], and the Field Marshals' and Petrovsky halls lie further west [sourced: Montferrand's 1833 western suite]. None of these halls are built. A doorway glide would claim an adjacency that does not exist; the cut is the same honest compression precedent as the arch-to-staircase cut (theatre-set compression). Reduced motion already forces cuts, so one path serves both.

1.4 Cold-load beat. A cold arrival at `#/1812` opens on the dark caption card with the room name and the compression note, never a spinner, for the declared hold beat: card text «Через Гербовый зал — в Военную галерею» / "Through the Armorial Hall into the Military Gallery" [sourced: the gallery's rooms sat between the Armorial Hall and St George's; the key joins the flat i18n union at the code round].

1.5 Prefetch policy. One new prefetch row: when the visitor reaches the jordan landing stop (the stop owning the portal box), fetch the 1812 manifest, geometry, atlas and the dusk probe; lightmaps load in order of current blend weight (highest first); the zero-weight state defers to idle. The warm path then needs only the hold beat; the cold path shows the card until the first two textures are resident.

1.6 The "to be continued" card retires. It was a parked placeholder at a null edge (r18b); the edge now has a neighbour. The card module is deleted (git remembers); the gallery's own far end is a closed door with an ordinary stop caption, no card. Rejected: moving the card to the St George's door — a palace should not announce its own unfinishedness inside the frame; v1 is a complete route, not a preview (the owner may reverse via Q2(b)).

1.7 Beats in order: landing stop → card (cut) → M0 threshold long view → M1 west wall close → M2 under the middle lantern → M3 the monarch wall → M4 the St George's doors, closed. Backward travel reverses through the same airlock (cut back to the landing).

## 2. Set design

2.1 The real hall (sourced unless marked): a top-lit, barrel-vaulted memorial gallery designed by Carlo Rossi (built June–November 1826, opened 25 December 1826), rebuilt by Stasov after the 1837 fire "exactly as it had been", lengthened then by almost six metres with choirs (хоры — an обходная галерея) added above the cornice. It sits between the Armorial Hall (north) and St George's Hall (south), in the middle of the palace's main block, a few steps from the Grand Church; long axis north–south; entered from the north end; five rows of bust-length portraits per long wall; three skylight lanterns in the vault; large equestrian portraits of Alexander I (Kruger), Friedrich Wilhelm III (Kruger) and Franz I (Kraft) added in the 1830s. Visual reference for the decoration: E. P. Hau's 1862 watercolour of the gallery (crimson walls, white coffered vault, gilt everywhere, the floor's checker-diamond parquet, the torchère candelabra, the monarch portal with flanking doors) — to join ATTRIBUTIONS at the license round; both wiki sources carry it.

2.2 Placement (declared at true coordinates; parametric pending the photo check). The committed location plan (en/ru.wiki "1812Gallerylocation.jpg", own read) shows the gallery as a narrow north–south strip continuing the stair-hall tract southward, with the palace church ("a few steps away", sourced) between, and St George's Hall as the big east–west hall along its east side — the declared placement follows that read. Declared bounds: x from 82.0 to 90.5 (width 8.5 m; inside the committed stair hall's x band, directly south of it), z from −40.0 to +15.0 (length 55.0 m; Stasov's lengthened hall (verify)), floor y equal to the committed jordan landing floor height (continuity across the cut), vault springing at floor+6.5, crown at floor+8.5, lantern ridges at floor+9.6 — all below the committed cornice. Portal box: north door, centred on x=86.25, z=−40, a 2×2×3 m box; the jordan portal box does not move (golden protection, §9). Open verify for the R1 photo check: whether the north door reads from the staircase's own tract or from the Armorial side (the sourced tour order says the Armorial) — either answer moves bounds, portal boxes and lantern z's only; no law changes.

2.3 Compression declared. The real walk from the staircase through the state rooms (Field Marshals', Petrovsky, Armorial [sourced tour order]) and the halls along the gallery's east side (St George's Hall) are not built; they exist as the card note and the closed doors. Register row: "the state-room walk compressed to one cut; neighbours implied by the card note and the closed east doors."

2.4 Materials palette (six, stock materials only — the last custom slot is not spent): PLASTER off-white matte (vault, pilaster shafts, soffits, the choirs' console band) · **CRIMSON** — the saturated crimson-pink of the long walls below the cornice band [sourced: Hau's 1862 watercolour of the gallery; Stasov's decoration — this corrects the relay's off-white-wall draft toward the sourced look] · GILT (frames, capitals, mouldings, door trim, the torchère candelabra — the shared gold MeshStandardMaterial with committed constants) · PARQUET oak tile (floor; the sourced pattern is a bold checker-diamond of large light/dark squares with figured borders [sourced: Hau 1862] — not herringbone; reuse the committed parquet tile if one exists, else one new 512² ETC1S tile) · PANE dark glass (lantern glazing, baked opaque per DEC-018 with the per-state sky colour baked in) · CANVAS (the portrait atlas on MeshStandardMaterial with map + lightMap). Every surface takes the blended lightmap through the adopted technique-A patch (ADR-0014).

2.5 Hero meshes (three, the DEC-005 cap): H1 the frame kit (merged frames + canvases per wall; the camera gets within 2.2 m at M1) · H2 the skylight lantern (one modelled lantern with glazing bars, placed three times and merged [sourced: three lanterns; the watercolour shows the lantern strips along the vault crown]) · H3 the monarch portal on the south end wall: the large equestrian gilt frame with a sculptured pediment (trophies/laurel), a simple geometric drapery suggestion and the carpet step, flanked by TWO dark double doors [sourced: Hau 1862 — the end wall reads exactly so; Kruger painted the Alexander I and Friedrich Wilhelm III canvases, Kraft the Franz I] (verify the sizes against the watercolour proportions before R1; H3's law is parametric). The St George's doors sit in the EAST wall, in the bay nearest the monarch end [sourced: the location plan shows St George's Hall along the gallery's east side] (verify the bay/door count against photographs). Everything else is procedural kit: shell, vault coffers, pilasters, doors, candelabra, benches, skirting.

2.6 Inventory. Floor: parquet, the bold checker-diamond pattern [sourced: Hau 1862]; red museum benches along the walls (simple boxes, declared add — visible at the floor in every view). Doors: one double door north (entry), the monarch portal's two flanking dark double doors on the end wall [sourced: Hau], the closed St George's doors in the east wall (verify count/bay), four blind doors in the long walls at bay piers (declared). Dressings: paired Corinthian pilasters with gilt capitals at each pier plus engaged light-stone columns at the wider piers [sourced: Hau — the large light columns flanking the bays], a continuous gilt cornice band at the vault springing, and the gilt torchère candelabra standing against the piers (twelve per wall plus the end-wall pair [sourced: Hau — floor candelabra, not wall sconces]). The white console row at the cornice (the choirs' corbels) rides as a simplified band. Declared omissions recorded for the license register: the Stasov choirs above the cornice, the vault's grisaille trophy programme (coffers stay, medallions omitted), the four Palace Grenadiers portraits and the two Hess battle paintings (Soviet-era additions).

2.7 Portrait-wall layout law (declared, verify; parametric so the integration pass re-fits constants without touching code): rows five [sourced: ru.wiki hanging scheme; confirmed visually in Hau 1862]; per long wall eleven bays of five rows × three columns = 165 portraits, block pitch 5.0 m along z, piers between bays carry the pilasters/candelabra; the two remaining portraits flank the north door at row 2 height; total 2×165+2 = 332. The pitch arithmetic closes: eleven bays at 5.0 pitch span ~52 m of the 55 m wall. Photo-check re-fit (Hau 1862, integration): COLUMN_PITCH (centre-to-centre) ~1.5 m — edge-to-edge gaps ~1.0 m inside a bay, bay strips ~1.4 m — the relay's 0.62 draft was a gap/pitch conflation; ROW_PITCH ~0.70 m confirmed, bottom row centre ~1.6 m, top row centre ~4.4 m. Frame outer 0.49×0.57 m around a 0.35×0.43 m canvas [sourced canvas size; bar 0.07 m each side]; the oversized monarch/ally canvases are the standard canvas scaled five times (1.75×2.15 m, §3.4) with 0.12 m bars (declared). End composition: the south end wall carries the three monarch canvases — the portal (Alexander I, Kruger) centred under the pediment, the two allies (Friedrich Wilhelm III, Franz I) flanking it [sourced: ru.wiki "в торце галереи" for Alexander; the modern arrangement reads the same; Hau's flanking dark recesses are the two door panels or the allies in shadow — (verify) at the R1 photo check]; the two doors lead south to the gallery's southern neighbour hall. The allies hang at the declared ±2.05 m offsets, monarch canvas centre height 3.6 m (verify).

2.8 Only the union of rail frusta plus margin is modelled (DEC-005): the vault's far quarter-spans beyond the stops' pitch limits drop coffering; the backs of H3 and the door reveals are single quads.

## 3. Set construction

3.1 Kit list. K1 shell (walls, floor, end walls) — procedural boxes with a baked UV2 chart · K2 vault — extruded segmental profile with coffer grid, UV2 charted per span (coffers only; the grisaille programme is a declared omission) · K3 lantern (H2) — one authored low-poly glazed lantern, ~10×3 m footprint, pitched glazing, placed three times at the declared z's (verify spacing symmetric about mid) · K4 doors — one authored double-door panel reused six times, open/closed variants by rotation only · K5 pilaster + capital + cornice band + engaged column — one authored pier module instanced along both walls then merged · K6 torchère candelabra — gilt, floor-standing, ~2.4 m, low poly, merged · K7 the frame kit (H1): frame profile + canvas quad, generated, plus the allies' two oversized frames · K8 the monarch portal (H3): one authored large frame + pediment + drapery suggestion + carpet step.

3.2 The frame kit is generated, not committed. One module, `tools/gallery/layout.mjs`, holds the layout law as named constants and emits, deterministically, a committed `tools/gallery/layout.json` (the law's single serialized form; regenerating it byte-identically is the CI gate). The same law is implemented a second time for the browser as `rooms/1812/layout.ts` (typed, in-bundle) — a Vitest test pins the two implementations to byte-equal JSON, so bake-time and run-time geometry are identical by construction with the pin enforced in CI (assets as code, DEC-006). The bpy builder reads the committed JSON and never re-derives the law. Runtime builds one BufferGeometry per long wall (frames + canvases as two material groups) and one for the north-door pair; the end-wall group lives with H3. Rejected: a committed GLB of 335 frames — payload for data the law already states; rejected: InstancedMesh with a per-instance UV offset attribute — it needs onBeforeCompile and would spend the last custom material slot (the only one left after DEC-009 and ADR-0014).

3.3 Frame geometry. Four mitred bars, each a bevelled box of sixteen triangles → 64 triangles per frame, two per canvas; 335 frames ≈ 22 k triangles, ≈ 0.7 k for canvases. The gilt bars take the shared GILT material and lightmap UVs from a per-frame UV2 rectangle in the frame-kit lightmap chart; canvases take CANVAS with UV1 = atlas slot rectangle and UV2 = their own strip in the same chart. Draw calls: west wall 2, east wall 2, north pair 1, end-wall group 2 — seven draws for every portrait in the room.

> **Hang law (B10, 2026-11-02).** The canvas binding puts (u0, v0) on the quad's low-v corner
> in basis coordinates, and `military_gallery_frames._basis` points v world-DOWN — so that
> corner sits on the PHYSICAL TOP edge. `slotUvRect`/`superBlockUvRect` therefore return
> **v0 = 1 − y0 (the cell's image-top row) and v1 = 1 − (y0 + h)**; v0 > v1 by law.
> `chartRect` keeps v0 < v1: the bake reads the lightmap chart through the same binding, so
> the canvas light was never inverted. The atlas stays painted upright; the hang flip is a
> verified live read (the M1 rows and the M3 monarchs hung heads-down before the fix).

3.4 Portrait atlas. One KTX2 ETC1S texture 2048×2048 (power of two, mipmapped, through the existing KTX2 loader; nothing added to the basis decoder row — the tight budget line is untouched). Slot 96×120 px (aspect 0.80 against the canvas 0.81), grid 21×17 = 357 slots, enumerated row-major (slot 0 = top-left). Allocation: the three monarch super-blocks sit at the grid's top-left, rows 0–1, columns 0–5 (block b at columns 2b, 2b+1 — the slot set {0,1,2,3,4,5,21,22,23,24,25,26}; the relay's "slots 0–11" assumed square-tiling that a 21-wide grid does not give — amended pre-code at integration); one slot (356) is the neutral "missing" slot; the ROSTER law: the 332 standard frames (330 wall portraits + the flanking pair, in canonical frame order) take the first 332 free slots in row-major enumeration, skipping the super-block cells and the missing slot (so the roster runs 6…20, 27…41, 42…343 — contiguous in enumeration order, which is what the generator's keyed painting consumes). Canvas UVs inset 3 px inside the slot; a 2 px dark gutter is painted into every slot edge; far-mip bleeding is accepted because stand-ins are painterly, and v2 inherits the same inset law. The monarch canvases are the standard canvas scaled ×5 (1.75×2.15 m, aspect 0.814 against the block's 0.80 — a declared 1.7 % stretch that the generator authors for). Slot-keyed consumers (the generator, the chart order) see the roster's enumeration order, which is the contract between atlas and geometry; SLOT(i) in the drawing law = the roster's i-th free slot.

3.5 Stand-in generator law (build-time script, the only producer of the atlas). For slot i: h = hash32(SALT_1812, i) using the committed deterministic hash (Math.random is forbidden). From h's bit fields: silhouette class ∈ {frontal, three-quarter-left, three-quarter-right}; shoulder width ∈ three named widths; head offset ±3 px; uniform colour from PALETTE_UNIFORM (six entries: infantry green, guards dark green, cuirassier white, hussar dark blue, artillery black, general's dark green with red); facing colour from PALETTE_FACING (four); epaulettes on/off; background from three dark umbers with ±8 % value from a second hash; face tone from four; two octaves of hash-based value noise as brush texture; a soft vignette. Monarch blocks use a fixed equestrian-suggestion field (horse mass, rider, sky) with hashed tone only. The rasteriser is pure JS writing RGBA (no node-canvas: platform anti-aliasing differences would break byte-identity), then the committed PNG→KTX2 ETC1S step under the DEC-016 toolchain pins (single-threaded toktx; byte-identity is the r15/r17 precedent). Output is byte-identical on rerun; CI hashes it.

3.6 Upgrade path to real portraits (v2, out of phase): replace the generator with an importer that places a public-domain image per roster key into the same slot, same inset; geometry, UVs, lightmaps and goldens untouched; the register row "stand-in portraits" is then closed. Roster: v1 keys slots by index only; a names roster (332 keys, display maps) is v2 content. Two sourced v2 details recorded now so the register can carry them: thirteen of the 332 places belong to generals with no surviving image — their frames are stretched green silk in the real gallery [sourced: ru.wiki]; v1 paints all 332 slots as stand-ins (picking the thirteen without a roster would misname them), and the v2 roster turns exactly those slots silk. The four Palace Grenadiers portraits and the two Hess battle paintings [sourced] are declared v1 omissions (§2.6), returning with the roster if the owner wants them.

3.7 Lightmap charts. Architecture (K1–K6, K8) shares one 2k² chart; the frame kit (K7, both walls and the door pair) gets its own 1k² chart generated by the layout module — ordered by slot, as deterministic as the geometry.

## 4. Light

4.1 Daylight sources are the three lantern openings only [sourced: three lanterns; top-lit hall]; no side windows exist, so the bake has no wall-level daylight and the room reads as a top-lit vault with a bright floor and dim lower rows — the look that makes the gilt rows legible.

4.2 States (shared manifest keys, per-room display meaning). day: cool-neutral skylight wash, floor the brightest surface, portrait rows graded top-bright to bottom-dim, the crimson walls reading warm against the white vault; white point neutral, look gain unity (declared content rows). dusk: lantern panes baked to the dusk sky colour, low blue-grey wash from above, the candelabra at a third of night intensity so gilt starts to glint; white point warm-shifted by the committed per-room row. nightChandeliers: the gallery's night is the gilt torchère candelabra (twenty-six, warm, ~2700 K look declared) and the lanterns baked as dark glass with a faint sky memory; the key stays `nightChandeliers` (data keys are raw tokens; this room's display map says "candelabra"). Rejected: inventing chandeliers to match the key name.

4.3 Expected deltas between states are large here, unlike Rastrelli's timeless artificial light: floor luminance drops by an order of magnitude from day to night while the upper frame rows invert from brightest to dimmest. This is the room where the frozen §8 weight function is most visible; it is not re-opened.

4.4 Resolution: architecture 2k² (the largest surface area of the three rooms, and M2 looks straight into the vault), frame kit 1k² (335 small rectangles need texel density on gilt, not area), three states each → six lightmaps. Rejected: packing frames into the 2k (frame texels fall below the gilt's bevel pitch); rejected: 4k (VRAM line and bake time on the reference device).

4.5 Bake discipline on the two-core reference device (charter risk 6): preview bakes at quarter resolution for layout checks; one full bake per light round, three states sequentially, fixed seeds and sample counts under the committed baker's determinism contract; declared ceiling 40 min per state, 2.5 h total — re-measured at R6: day 33.0 / dusk 41.9 / night 43.5 min, total ≈118 min (dusk and night over the per-state line, total under the bound); bake artefacts committed and regenerate byte-identically.

4.6 The R4 rig (the specialist's ruling, adopted 2026-10-25; residuals open):

- **The candle emission is BUILDER content**: `MG_candle` carries Emission
  `CANDLE_EMISSION_RGB` at strength 40.0. The relay's draft revised Block 2's
  colour to the true linearisation of 2700 K — sRGB (255, 169, 87) linearised =
  (1.000, 0.405, 0.094) — adopted. The first bake CONTRADICTED the FILL's 6.0
  (walls ~0.04, the kit quantising to codes 0-1); the retune to 40.0 lands the
  estimate: walls ~0.25, the M1 frames ~0.1 → codes 20-40 (a builder edit plus a
  re-bake). The glb carries it; bake.py's rig zeroes it at day
  and keeps it at dusk/night (the jordan precedent, `set_fixtures_off`); the
  candles themselves read lit at night.
- **The dusk's "candelabra at a third of night" is COMPOSED, not baked at a
  third**: the dusk rig bakes sky only (`DUSK_FIXTURES` False for this room), and
  the published dusk = EXR(dusk) × 1 + EXR(nightChandeliers) × 1/3 via the
  committed compose law (tools/lm-recipes.mjs gains the room's dusk recipe; the
  scale is a recipe literal — a re-encode retunes it, never a re-bake).
- **The pane colours are PAINTED into the lightmap cells; the pane material in
  the glb is the CARRIER (D-23, closing the round's one open item)**: bake.py
  fills the lantern_glazing patch cells of the architecture chart with
  `PANE_SKY_LINEAR[state]` (day (0.20, 0.23, 0.28) cool skylight; dusk
  (0.05, 0.06, 0.09) the dusk sky colour; night (0.004, 0.005, 0.008) the faint
  sky memory) after OIDN and before the LDR encode, into the surviving denoised
  EXR — reencode.mjs and the compose law see the paint as bake content. The
  gltf step rewrites the exported `MG_glass` to a unit carrier
  (`baseColorFactor` 1,1,1,1, roughness 1, metallic 0), so the runtime pane
  pixel is 1.0 × paintedCell × whitePoint × gain = the painted sky itself. The
  BAKE-side pane stays §2.4's dark `GLASS_RGB` (night: the un-swapped dark glass
  faces the candelabra's bounce truthfully). No state-gated emissive (F11), no
  shader change (the fence), `GLASS_RGB` untouched.
- **The architecture chart packer** (tools/bpy/military_gallery_chart.py): one
  density across the whole 2048² chart; D-10's per-face patch law restored at
  integration (the draft's box net wasted 98% of its bounding on elongated
  boxes — the 55 m cornice band alone demanded ~8.1M px); the shelf packer
  upgraded to first-fit guillotine (the naive single-band packer overflowed at
  81% demand); `ARCH_DENSITY_PX_PER_M` resolved at 32 px/m against the real
  pack (the draft's 36 demanded 4,132,894 px² of 4,194,304 and threw, as
  designed); pad 2 both charts (Block 2's `LM_PAD_PX`; jordan's committed
  2 @ 2k margin).
- **White points and look gains** (first-bake values; retune = descriptor edit +
  `node tools/reencode.mjs military-gallery <state>`, never a re-bake):
  `WHITE_POINT_1812` = day 0.25 / dusk 0.15 / night 0.3;
  `INTERIOR_LOOK_GAIN['military-gallery']` = 3 / 3 / 2 → eff 0.75 / 0.45 / 0.6.
  R4's landed values: day 0.25 → 0.5 (the first bake's histogram) → **1.5** (the
  fixed tree's histogram: the arch lit 60%, p50 0.244, p90 1.14, p95 1.33 — 0.5
  still flat-clipped 13.3% as the inversion-symptom retune; 1.5 grades the
  sunlit field inside 0.89 at a 1-2% clip); the gains landed 1.5 / 3 / 2 →
  eff 2.25 / 0.45 / 0.6. **B10 (owner «around 15 % more light», 2026-11-02): the
  gains ×1.15 in every state — 1.725 / 3.45 / 2.3 → eff 2.5875 / 0.5175 / 0.69**
  (the white points stay the encode ranges; the pixel means re-derived at the
  re-record).
- **The probe**: the dusk process, `PROBE_POINT_1812` = (86.25, 11.7, −12.5) — the
  room midpoint at eye height, panes swapped, fixtures restored to FULL for the
  probe render only; committed `PROBE_RES` / `PROBE_WHITE_POINT` / `PROBE_SAMPLES`.
- **§3.7 residual (owner by DEC):** K8 (the portal frame + canvas_334) stays on
  the KIT chart in a declared 128 px block (the bevel-pitch parity argument)
  instead of §3.7's literal 2k² architecture chart.
- **R4b (2026-10-26): the night-kit blackness was PLACEMENT, twice over.**
  (a) The whole kit hung 5.6-8.6 m under the hall floor: layout.json's
  floor-relative y (rowBottomY 1.6 … rowTopY 4.4) consumed as absolute glTF-Y by
  the frames module while the whole architecture adds FLOOR_Y 10 (probe13:
  canvas_000 z 1.385-1.815 vs the floor at 10; the candles at 12.245-12.425 were
  the void's only light). Fix: `build_frames(collection, script_dir, floor_y)`
  lifts the kit onto the wall. (b) The pier composition did not close: the clear
  wall between adjacent pilaster pairs was 3.0 m against the kit's 3.57 m span →
  the bay-end canvases sat ~61% inside the shafts; the blind doors sat inside the
  engaged columns; the north-door flanking pair hid inside the door case. The
  owner-ruled re-fit: `PILASTER_W` 0.55 → 0.30, `PILASTER_PAIR_GAP` 0.9 → 0.75,
  the doors parametric (entry 1.9 / south flanks 0.8 at `SOUTH_DOOR_INSET` 0.50 /
  blinds 1.4), `DOOR_CASE_W` 0.28 → 0.06, `BLIND_DOOR_BAYS` (4, 8) → (2, 9); the
  layout law's `FLANK_OFFSET_X` 0.8 → 1.45, `ALLY_OFFSET_X` 2.05 → 2.25
  (layout.json regenerated byte-deterministic + the TS mirror). Census
  (probe13c): 0/335 canvases buried; 330/335 canvases' first candle ray hits
  `torchere_candles` — the 5 end-wall specials (flanking pair, allies, portal)
  see their nearest candelabra edge-on and collect bounce, honest. Final night
  kit bake: 335/335 canvas cells lit, 0 dead strips, mean 0.048 linear.
- **The "emitter-exclusion law" demoted to a LOOK law.** The production control
  (probes/r4-kit-night/probe16: the fixed arch night preview, candles excluded
  vs selected-and-bound) showed the room's texels IDENTICAL both ways —
  selected-and-bound objects DO ride the bake's ray tree; the naked plane/cube
  probe's black arm was texel OVERWRITE (the bound cube's dark diffuse response
  re-inking the plane's shared UV region), not tree exclusion. The winding fix,
  not the exclusion, lit the arch. bake.py keeps the emitters out of the target
  set as a LOOK law (the glow is runtime F11 emission, never bake content) under
  the per-room gate `EMITTER_EXCLUSION = {'military-gallery': True}`; the
  siblings stay False — their committed bakes had the fixtures selected and
  bound with their cells baked (O10), and a future sibling rebake must
  reproduce that committed shape.
- **The kit cells' write law**: a frame's 24 bar faces share ONE lm rect and the
  bake's last-rasterized face wins each texel (the naked probes' mechanism) —
  bake.py collapses every face whose normal is not aligned with the frame's
  facing to a zero-area UV triangle, restored right after the bake (the glb is
  untouched: the runtime samples the same rect for every face; the collapse only
  chooses which faces ink it). The preview's EXTEND margin scales with the
  quartered res (pad // 4, min 1 px).
- **The texture budget**: `textureBytesMax` 1,000,000 → 1,200,000 (the owner's
  ruling): the cap was a pre-light plan estimate; the lit room measures
  1,131,373 B of ktx2 (the jordan-class sharp-light content: 219-264 K per 2048²
  lm + the atlas's 419 K). Encoder-side levers measured and rejected: the white
  point moves the size ~0.6%, the ETC1S qlevel 128 → 100 moves it ~9% with
  banding risk.
- **R4c (2026-10-26): the CI luminance fences (run 40268449538) — measurement wins.** The
  first CI read of the committed M0 baselines failed both original fences: day 0.0456 <
  dusk 0.0485, and day/night 2.17 < the declared ratio floor 3. Mechanism: M0 stands at the
  north (lantern-less) end of the hall — the day's sun patches live under the mid-hall
  lanterns, while the dusk is the composed candelabra third (candles along ALL walls), so at
  the north stop the dusk composite genuinely out-reads the day. Owner ruling: both numbers
  are sanity fences, not art targets. The order law reformulates to «day > night ∧
  dusk > night» (tests/goldens-1812-luminance.test.ts); the ratio floor lands at 2 — the
  honest room dynamic at the wp-1.5 day; the M0 dusk > day exception is recorded here. The
  §4.3 prose (the order-of-magnitude floor→frame drop) stays untouched. Run-order lesson:
  tests reading the baselines must run AFTER their capture — the local validate skipped the
  suite while the baselines were absent and CI measured the committed PNGs honestly.
- **R4c close (2026-10-26): the black vault was the missing barrel; the M0 fences re-ruled
  on the honest light.** The defect was the MESH: build_vault never created the barrel
  surface — the runtime saw the clear colour through the holes (the magenta proof). The
  geometry landed (room.ts untouched): the closed shell folds the arc (built faces only;
  mouths on profile vertices, VAULT_SEGMENTS 40 = 8 per row), the tympani close the end
  walls, the wells' throats seal the shafts, the coffers are true radial recesses with
  per-face D-10 rects. The arch chart re-resolved against the real pack: the soffit field
  folds the arc like the shell's (the bottoms cover the mouth arcs only), the density
  32→31 px/m (94.6% packed; the 36→32 precedent above). The 3 M0 goldens re-baselined and
  read — the vault lit in all three states. The honest means (day 0.022239 / dusk 0.012466
  / night 0.020330; the old day and dusk rode the leak) re-ruled the fences: the order law
  is «day > night», the dusk > night leg and the day/night ratio floor retire at M0.
- **Residuals — accepted as-is for v1 (owner eyeball, 2026-10-27; no fix this phase; the
  day's light-design call parked post-v1):** the monarch/portal crown (the
  canvas top sits 0.3-0.7 m behind the valance/pediment band — "centred under
  the pediment" by design, the 34% share is the owner's call); the portrait
  atlas's v orientation — CLOSED (B10, 2026-11-02): checked live at the M1/M3
  captures — every canvas hung vertically mirrored; fixed in the atlas-rect
  law (see «Hang law», `slotUvRect`/`superBlockUvRect` v0 = 1 − y0);
  the end walls' night bounce dimness (the torchères are side-wall only);
  the day's sun pools died with the leak — the closed barrel leaves the
  lanterns' light path weak (the low sun behind the glazing), the floor reads
  lamp-less by day (a light-design call: the DET time, the pane law or the
  well path — an owner ruling, not a fence).

## 5. Environment

The adopted probe law applies unchanged (ADR-0013): one static dusk environment cube probe for the room, baked from the gallery's midpoint at eye height with the lantern panes in their dusk colour, loaded once in the airlock hold and disposed with the room; it feeds the gilt's specular and nothing else. No sky dome is visible from inside (opaque panes), so the probe is the only environment the gilt ever sees.

## 6. Cinematography and the room index

6.1 Rail: five stops over 55 m, glides of 12–15 m at the committed glide duration, scroll/drag/arrows as everywhere, reduced motion cuts. Stop ids follow the committed one-letter pattern (S0/S1 square, G0–G2, J0–J4): **M0–M4**. M0 Threshold (x 86.25, z −38, eye 1.65, looking south along the axis; yaw ±30°, pitch −10/+25°) — the signature long view and the golden stop. M1 West wall (x 84.3, z −25, looking west at a block; yaw ±25°, pitch ±20°, never closer than 2.2 m to the canvases so stand-in texels stay painterly). M2 Lantern (x 86.25, z −12.5, looking up 35°; yaw ±40°, pitch 0/+55°) — vault and glazing bars. M3 Monarchs (x 86.25, z +9, looking south at H3; yaw ±20°, pitch ±15°). M4 Doors (x 88.5, z +13, looking east-south at the closed St George's doors; yaw ±20°, pitch ±10°) — end of route; the stop caption carries the sentence the retired card used to carry ("за дверями — Георгиевский зал", Q2). Captions are i18n keys `caption.m0`–`caption.m4` (committed grammar), Russian canonical.

6.2 Room index — what it is. A deep-link list: an in-app overlay listing the built rooms in route order with their Russian/English names and a marker for the current room. Its data source is the room registry itself — no second list exists ("the registry is the index"); unbuilt rooms do not appear, nothing says "coming soon".

6.3 Where it lives. One small text button in the DOM chrome corner, label `index.open` → «Залы» / "Rooms", rendered at the chrome's resting opacity and fading with the captions on idle. It opens a native `<dialog>` (focus trap, Escape, backdrop for free), centred, dark, typographic — a list, no thumbnails, no map. Rejected: a persistent sidebar or minimap (light is the feature; UI nearly absent); rejected: hidden-until-Tab (an invisible control fails keyboard users and discovery alike). **R15 amendment (the owner's verdicts: the corner reads noisy; the face isn't senior-developer minimal):** the button left the #title block's corner and joined the language toggle in a one-row controls group at the top-right anchor (`#controls`, fixed 24/24, baseline, 16 px gap — controls grouped by kind, not by proximity); the old top-90/left-24 law (derived from the block's height + 12 px) died with the move, and tab order now puts the index button before the toggle. The dialog's face is a MENU: one typeface (the chrome sans, 15px), four plain rows (8px padding, hover/focus rise ink-2 → ink, the 2px ink focus ring), the current room at ink + medium, nothing drawn — no rules, numerals, chips or serif front matter (the heading stays in the DOM, visually clipped, for `aria-labelledby`); opaque `--ground` #151a21 over a 0.6 night-backdrop, width `min(20rem, 100vw − 48px)`, native centering. Two faces were rejected before it: the chrome-register card (the R5 landing, read «template-ish») and the v1 «/notes fragment» (ledger lines, mono route numerals, a gilt chip, a serif heading — read as decoration).

6.4 Behaviour. Activating an entry is a jump: it closes the dialog and runs the airlock cold-entry path to that room's stop 0 (cut with caption card) — the same path a deep link takes, one code path for URL entry and index entry. Jumping to the current room just closes; jumping to the square cuts to its stop 0 (the square is resident). Keyboard: arrows move, Enter jumps, Escape closes, focus returns to the button; aria-labelledby `index.title`, role list, aria-current on the current room; no single-letter shortcut (arrows are the rail's). i18n keys join the flat union in the committed grammar: `index.open`, `index.title`, `index.current`, plus the room names as `data.title*` keys (the committed data-key pattern; `data.title1812` → «Военная галерея 1812 года» / "Military Gallery of 1812").

6.5 Routes: `/gallery`, `/jordan`, `/1812` (short, language-neutral hash paths; rejected `/military-gallery` as English-first). Note: these are HASH paths — the server always serves `index.html` and the hash carries the route, so no hosting rewrites are involved (the relay's SPA-rewrite concern does not apply); the R6 hosting experiment verifies content types and speed only.

## 7. Streaming and housekeeping

7.1 Prefetch rows: add 1812 to the landing-stop row (manifest, geometry, atlas, probe, lightmaps by weight); add the reverse row on M0 of 1812 so a backward cut to jordan is warm.

7.2 Disposal ledger expectations on leaving 1812: geometries −5 (two wall kits, door pair, architecture, H3 kit), textures −8 (six lightmaps, atlas, probe) and −1 if a new parquet tile ships, materials −1 (the CANVAS instance; GILT/PLASTER are shared), programs: at most +2 new stock variants compiled on first entry (Standard with map+lightMap, and the pane variant) and retained by the three.js program cache as the committed ledger already tolerates. The ledger must return to boot values after square → gallery → jordan → 1812 → jordan → gallery → square.

7.3 Smoke walk extension: the walk covers the new edge in both directions, plus two deep-link starts (cold `#/1812`, then index-jump to `#/gallery`, then to the square) with the ledger back at boot. The manifest-verified payload rows for 1812 join the existing room-cap check.

## 8. Box office

All 1812 values were declared and marked (re-measure); **the reference device owns them at the exit round — re-measured at R6 (2026-10-27, the device pass + the ledger walk)**. Whole-frame peak is the jordan→1812 swap, when both rooms are briefly resident; the measured swap peak equals the two mounts' ledger sums exactly.

| Row | rastrelli | jordan | 1812 (measured R6) | peak at swap | cap |
|---|---|---|---|---|---|
| Triangles | committed | committed | 31,090 total (manifest; 30,990 in frustum at the stops) | jordan + ~31 k | committed frame cap |
| Draw calls | committed | committed | 17 (15 at the M1 block view) | jordan + 17 | committed frame cap |
| VRAM (ledger walk) | committed | committed | 31.3 MB resident at the 1812 mount (all kinds; the HUD attr does not split kinds) | 38.4 MB — exactly the two mounts' sums | committed VRAM cap |
| Payload (room) | committed | committed | 1,944,413 B (lm 550 k, atlas 419 k, glb 867 k, probe, parquet, manifest) | n/a | 4 MB (this room's manifest row) |
| JS gzip delta | committed | committed | +12.4 KB landed (258,248 → 270,685; vs the +9 KB estimate — a recorded over-line) | n/a | 350 KB cap; ~79 KB headroom |
| First lit frame, cold | committed | committed | unthrottled 1.5 s; @10 Mbps + 40 ms 3.6 s (vs the hold + 2.5 s estimate — a recorded over-line) | n/a | committed |
| Bake time (3 states) | committed | committed | ≈118 min (day 33.0 / dusk 41.9 / night 43.5) | n/a | discipline only |

Tight line: VRAM at the swap — jordan's 2k set plus the gallery's six lightmaps and atlas on integrated graphics. Measured R6: the peak is 38.4 MB of 256 — the line not approached, the 512² kit fallback never rehearsed. If it fails, the fix is art or tier (frame-kit lightmap to 512², atlas mips trimmed by content — never the number). The basis decoder row does not move: zero new loaders.

## 9. Golden frames plan

9.1 New: three goldens for 1812 at M0 (day, dusk, nightChandeliers) under the committed capture rig and frozen clock values — room goldens go six → nine, scene goldens nine → twelve; M0 sees both walls, all three lanterns and the end wall, so one stop pins every material.

9.2 Existing nine scene goldens stay bit-identical. Guarantees: the jordan portal box and landing stop do not move; the retired card is DOM, never in the canvas; no shared shader, the lightmap-blend patch, the sky dome, the weight function or the capture rig is touched; the shared GILT material constants are not edited (if the gallery wants different gold it declares a room-level look gain, not a material change). Any golden drift outside 1812 fails the round.

9.3 Goldens regenerate only when a law changes, by an explicit DEC; this phase proposes none.

## 10. Production schedule

Split-never-widen: a round that overruns is split, its scope is not widened. Each round ends with budgets green and goldens unchanged outside 1812.

| Round | Scope | Exit gate | Must not touch |
|---|---|---|---|
| R1 Asset A — kit | layout law + constants; frame-kit generator with UV1/UV2; K1–K6, K8 authored/procedural kit; UV2 charts; placeholder atlas slot colours | kit renders in the bake rig; frame count 335; chart hashes stable across two runs | `src/engine`, `src/world`, other rooms, shared materials |
| R2 Asset B — atlas | pure-JS rasteriser, generator law, PNG→KTX2 step, slot allocation, "missing" slot, license register row for stand-ins | atlas byte-identical on rerun; ≤ 0.7 MB; mips inspected at M1 distance | decoder/loader rows, R1 geometry |
| R3 Runtime | `rooms/1812` module + manifest + registry line; landing airlock retarget (cut); card retirement; prefetch rows; ledger; smoke walk extension | smoke walk passes both directions and deep links; ledger at boot; payload rows verified | `src/engine`, `src/world` beyond the additive hooks, rastrelli/jordan modules |
| R4 Light | three bakes (2k arch, 1k kit), probe, per-state white points/look gains, pane colours; three new goldens; VRAM swap-peak measurement on the reference device | goldens captured; the nine old scene goldens bit-identical; swap peak measured (the 512² kit fallback rehearsed here if the line is close) | shader patch, weight function, capture rig |
| R5 Camera + index | five stops with look limits and captions; room index dialog + button; i18n keys RU/EN; a11y pass | keyboard walk of index and rail; captions complete in both languages; JS delta ≤ +9 KB | rail engine, chrome layout of existing controls |
| R6 Exit | re-measure every row of §8; license register complete; README and architecture.md (route, airlock graph, atlas law, device gate); v1 tag; hosting reachability experiment (cold-load `https://…/`, `#/jordan`, `#/1812` from a remote network; record first lit frame; confirm content types; hash routes need no rewrites) | all budgets green; public URL serves `#/1812` cold on the reference device within budget; v1 announced in README (RU first, EN) | everything else |

The (verify) placement block (§2.2) and the layout-law constants (§2.7) close before R1 constants freeze — the plan check and the photo check are integration work, not a relay round.

## 11. ADR/DEC candidates

One line each, unnumbered; the orchestrator writes the numbered entries after owner disposition (DEC-021… / ADR-0016… continue the registers).

- **Portrait consumption: merged canvas quads with baked atlas UVs on one stock material.** Rejected: InstancedMesh with per-instance UV offsets — spends the last custom slot.
- **The frame kit generated at build and run time from one layout law, zero committed frame geometry.** Rejected: a committed GLB of all frames.
- **Portrait atlas law: 2048², 96×120 slots, 21×17 grid, slot index as the only atlas–geometry contract, 3 px inset.** Rejected: one texture per block (draw and payload explosion); rejected: 4k atlas (VRAM line).
- **Stand-in generator: pure-JS deterministic rasteriser keyed by hash(SALT, slot).** Rejected: node-canvas (non-reproducible anti-aliasing).
- **Retarget the landing airlock to 1812; transit kind cut with the compression note on the card.** Rejected: a new airlock beside it; rejected: doorway glide implying false adjacency.
- **Retire the "to be continued" card entirely.** Rejected: relocating it to the St George's door (Q2).
- **Night state is sconces; the key remains `nightChandeliers` with a per-room display map.** Rejected: renaming the key; rejected: invented chandeliers (Q6).
- **Lightmaps 2k architecture + 1k frame kit.** Rejected: single 2k; rejected: 4k; the 512² kit fallback is pre-declared for the VRAM line (Q7).
- **Room index = registry-driven native dialog behind one chrome button, jumps via the airlock cold-entry path.** Rejected: sidebar/minimap, hidden-until-Tab, bespoke modal (Q4).
- **Route slug `#/1812`.** Rejected: `#/military-gallery` (Q3).
- **Three monarchs as 2×2 atlas blocks on the end wall as the third hero.** Rejected: single slots (illegible at M3) (Q5).
- **Stand-in portraits declared in the license register this phase, with the v2 swap path recorded** (the owner's ruling — cited, not re-opened).

## 12. Open questions — owner dispositions

Each: decision · blocks · options · recommendation · default if silent. **Dispositions (owner, 2026-10-21): all twelve defaults accepted** — cut+card (Q1), the card module deleted with the M4 caption carrying the sentence (Q2), `#/1812` (Q3), the always-present dim index button (Q4), three 2×2 monarch blocks (Q5), sconces-only night (Q6 — realised as the sourced torchère candelabra after the Hau photo check), 2k+1k lightmaps with the 512² kit fallback pre-declared (Q7), the M0 golden stop (Q8), the roster deferred to v2 (Q9), the parametric layout law with the integration re-fit (Q10), README banner + git tag v1 (Q11), and the tier plan R2-strong / R1+R3-cheap / R4–R6 by disposition (Q12). The DEC entries DEC-021…030 are written in decisions.md.

- **Q1 Transit kind for landing→1812.** Blocks R3. (a) cut with compression card · (b) doorway glide. Recommend (a) — the intermediate halls do not exist. Default (a).
- **Q2 The "to be continued" card.** Blocks R3. (a) delete the module; the M4 caption carries the sentence · (b) move the card to the St George's door. Recommend (a). Default (a).
- **Q3 Route slug.** Blocks R3/R5. (a) `#/1812` · (b) `#/military-gallery` · (c) transliterated Russian. Recommend (a). Default (a).
- **Q4 Room index exposure.** Blocks R5. (a) dim always-present text button · (b) appears only on Tab/idle · (c) key-only, no button. Recommend (a). Default (a).
- **Q5 Monarch stand-ins.** Blocks R2 slot allocation. (a) three 2×2 blocks · (b) single slots. Recommend (a). Default (a).
- **Q6 Night light of the gallery.** Blocks R4. (a) sconces only · (b) lanterns lit from within (attic-lamped) · (c) both. Recommend (a) — unsourced historic night lighting; the declared look is the memorial dusk. Default (a).
- **Q7 Lightmap split.** Blocks R1 charts and R4. (a) 2k + 1k · (b) single 2k · (c) 2k + 512². Recommend (a); (c) is the pre-declared fallback if the VRAM line fails. Default (a).
- **Q8 Golden stop.** Blocks R4. (a) M0 only · (b) M0 and M1. Recommend (a) — M0 pins every material. Default (a).
- **Q9 Names roster now or v2.** Blocks nothing in v1. (a) v2 · (b) commit the 332-key roster now. Recommend (a). Default (a).
- **Q10 Layout law fit.** Blocks R1 constants. (a) accept the declared law pending the plan check, integration re-fits constants · (b) hold R1 until sources are checked. Recommend (a). Default (a).
- **Q11 v1 announcement form.** Blocks R6. (a) README banner + git tag v1 · (b) README only. Recommend (a). Default (a).
- **Q12 Tier declaration.** Blocks nothing (process). (a) R2 (the generator law) runs on the strong specialist; R1/R3 on the cheaper fast model; R4/R5/R6 by disposition per round · (b) every relay round on the strong specialist. Recommend (a) per the relay-routing rule. Default (a).
