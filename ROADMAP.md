# Roadmap

Phases are defined by exit criteria, not dates. A phase that stalls is **split, never widened**. Every phase ends at a deployed, publicly visitable URL — never an invisible foundation.

Lifetime cap: **≤ 7 rooms, ever** (charter — [docs/charter.md](docs/charter.md)).

## Principles

1. The room is the unit of planning, budgeting and shipping.
2. Procedural where the architecture repeats; handmade only where the camera gets close.
3. Light is the feature; UI is nearly absent.
4. The least machinery a senior reviewer would still respect.

## Reference device

One machine: **MacBook Pro 2017 — 2-core i5 2.3 GHz, 8 GB RAM, Iris Plus 640.** It is both the development box and the performance gate: if it holds a steady frame on T1 and never breaks the T0 floor, the palace holds everywhere. Discrete-GPU (T2) checks are opportunistic, on borrowed hardware. Lightmap bakes in Blender are the known slow spot on this machine — bake times are logged per room and bakes are constrained accordingly ([docs/architecture.md](docs/architecture.md)).

## Phases

### Phase 0 · Mass & Sky — **complete 2026-10-16** — exit: URL live · CI green · devlog #0 ([docs/devlog/0000.md](docs/devlog/0000.md) holds the gate numbers and the recorded §12 method notes)

Pure modules complete and gate-green: solar (NOAA, four contract vectors at 1e-5°), exposure, frozen lightmap weights, appearance palette, URL/scrub/det parsing, arrival beats — 55 node tests, JS gzip budget enforced in CI (129 KB of 350 KB). Contract: [docs/design-sky-time.md](docs/design-sky-time.md).

- **Ships:** Palace Square with the palace as a true-scale white massing (an architect's card model) under the live Petersburg sky; title with the real time; hairline time control; shareable URL.
- **Builds underneath:** repo, CI/CD with PR previews (Cloudflare Pages), typed store + app state machine, sky/solar module with tests, URL state, perf-budget doc, initial ADRs.
- **Exit:** URL live · CI green · devlog #0.
- *Split rule: if it stalls, split 0a (repo/CI/sky module) from 0b (massing + time UI). Never widen.*

### Phase 1 · The Facade — **complete 2026-10-17** — exit: budgets met on the reference device · grammar documented and tested ([docs/devlog/0001.md](docs/devlog/0001.md) holds the device-pass numbers and the §11 verdict)

- **Ships:** the Palace Square facade fully articulated, hundreds of window surrounds catching low sun; the Alexander Column as a simple scale prop; the General Staff building as massing; walk or fly the square.
- **Builds underneath:** facade grammar + solver + kit of parts (~25 scripted pieces); instancing; shadows; quality tiers + boot microbenchmark; debug HUD; golden-frame tests; `/notes` page v1 with the facade spec viewer.
- **Exit:** budgets met on the reference device · grammar documented and tested.

### Phase 2 · The Staircase — **complete 2026-10-19** — exit: room meets its contract · disposal verified · devlog ([docs/devlog/0002.md](docs/devlog/0002.md) holds the device-pass numbers and the §9 re-marks)

- **Ships:** enter through the arches, pass the dim compressed Rastrelli Gallery, ascend the Jordan Staircase while light changes with the hour.
- **Builds underneath:** Blender → glTF → KTX2 pipeline; baked lightmap states + runtime blend; interior kit; first airlock; camera rail; post stack; resource disposal ledger (asserted).
- **Exit:** room meets its contract ([docs/architecture.md](docs/architecture.md)) · disposal verified · devlog.

### Phase 2b · Night Windows — **complete 2026-10-19** — exit: the Dec-21 21:00 golden reads the facade from the lattice alone ([docs/devlog/0003.md](docs/devlog/0003.md) holds the gate numbers)

- **Ships:** the night facade as a lit window lattice — the interior `nightChandeliers` state seen from the square. One emissive pane per window, hashed into three stock-material levels (dark / dim warm / bright warm), intensity driven by the same §8 weight curve that blends the interiors; `hemi.groundColor` warms cornice undersides on the same weight. No lights, no custom materials, no fourth baked state.
- **Builds underneath:** instanced pane quads (facade recesses are opaque dark panels today) + weight import + hemisphere ground lerp; unit test (pane intensity ≡ weight over −15°…+5°, ≤ 10% of peak at June-solstice midnight — weight is 0 on the −7…−4° dusk plateau, so white-night windows stay dark under a still-luminous sky); night goldens re-baselined once, day/dusk goldens bit-identical. Decision: DEC-019.
- **Exit:** 21 Dec 21:00 golden reads the facade from the lattice alone · draw calls +≤ 3, tris +≤ ~4 k, slots and light counts unchanged · reference-device frame time within +0.2 ms.

### Phase 3 · The Gallery — **v1 — complete 2026-10-27** — exit: v1 announced · all budgets green · license register complete ([docs/devlog/0005.md](docs/devlog/0005.md) holds the device-pass numbers)

- **Ships:** the Military Gallery of 1812: 332 frames under skylights; room index; the full route (Square → portal → Rastrelli Gallery → Jordan Staircase → airlock → Gallery) works end to end.
- **Builds underneath:** instanced frames + portrait atlas; second airlock; golden frames for every room; README and architecture polish.
- **Exit: v1 announced** · all budgets green · license register complete.

### Phase 4 · Reach — **in progress** (the winter mode R8–R12 + the senior-minimal chrome batch R13–R15 + the chrome verdicts R16/R16.1 (+ its delivery completion `d050c18`) landed 2026-10-27…2026-10-30; the R16.2 chrome swap LANDED (the language toggle top-right ⇄ «Залы» at the corner stack's base, the owner's verdict; CI-watched); **the mobile tier DESIGN landed AND RATIFIED 2026-10-30** (R17 — docs/design-mobile-tier.md, all six §16 calls adopted per design §17; the Mobile-A/B/C implementation rounds follow §15); then the a11y pass / the Neva facade / the WebGPU ADR)

- **Ships:** works on a phone (T0); a keyboard-only tour; winter mode — snow on the cornices (LANDED); the Neva facade (cheap: same kit).
- **Builds underneath:** mobile tier + touch rail; accessibility pass; snow-mask material (LANDED — DEC-033..035: the lip + the facade slot + the season chooser + the ground snow); WebGPU evaluation ADR.
- **Exit:** Lighthouse accessibility ≥ 95 · mobile floor met on low-end hardware stats.

### Phases 5+ · v2 menu — one feature per phase

- [ ] **The Cut** — pull out of any room and the shell slices open like a dollhouse; interiors sit at true coordinates (a standing constraint since Phase 2), so this composes with Petersburg Time.
- [ ] **Pavilion Hall** — with the Peacock Clock as its single hero prop; first v2 phase once the pipeline is proven.
- [ ] **Malachite Room**
- [ ] **Rotunda** — as an airlock between wings
- [ ] **Neva embankment approach**
- [ ] **Floodlit facade** — night floodlighting as a facade-material height gradient sharing a custom slot with Phase 4's snow mask; design together (DEC-019 rejected real uplights: day-time fragment tax + shader change on the reference GPU)
- [ ] **Palace Square lampposts** — the historic cast-iron posts around the column, halos faked; a small accent, not a light source
- [ ] **Palace Square successors (the ground round, 2026-11-07; re-stated 2026-11-09; the `square-palace-2` find round re-drawn, 2026-11-15)** — the column stylobate (steps under the pedestal; sourcing: step count/height — CLARIFIED: `COLUMN_PLINTH` already models «the sourced three rows, plain boxes» (world/column.ts:29); the hunt must mean a BROADER stepped platform, not the plinth's rows), the Column's candelabra (SPLIT from the lantern row by the find: the 1876 Rachau decorative lamps at the column — Monferran's own design, «канделябр с медными фонарями и газовым освещением» (ru.wiki); the S0b accent — the SW corner sits ≈ 8.6° right of the axis in the monument's own frame, the NW corner ≈ 29° left; Sh never sees them — the NW corner bearing ≈ 142° is BEHIND the close-pass gaze; count/height UNSOURCED — NULL re-confirmed 2026-11-15 across ru.wiki ×2 + Commons captions; the form rides two dated photo references: the 1896 photochrom + the 1897–98 postcard; the 1930s removal rides the fence-melt sentence, the candelabra's simultaneity INFERRED), the square's 1977 corner lanterns (far, low — the four corner recreations; form/height NULL re-confirmed across ru.wiki/walkspb/СПб-Энциклопедия-2006/pastvu), the flanking massings (the Guards Corps HQ east wall LANDED 2026-11-19 as the exterior kit's node `el:hq-east` — DEC-04x: the massing-with-portico built per the sourced hunt below; the S0b void closed, the T2 42–47 % → 0.0 % bare field; still open in the class: the General Staff junction's massing at the wall's south end, the HQ's own night lattice, the Admiralty/west and south flanks; the landed law record: the S0b witness makes an east wall at x ≈ 110 the band y ≈ 57–73 % behind the plinth/pedestal — the monolith against its enclosure; derivation OURS, re-derive if S0b moves; THE HUNT PRECEDED THE GEOMETRY: four floors, the 12-column ionic portico at floors 3–4 as three-quarter columns «имитирующими лоджию», the two rusticated floors split by a horizontal тяга, the Millionnaya junction at the facade's kink — but NO absolute height anywhere (honest NULL, five sources 2026-11-15); the sourced relation «Фасад штаба Гвардейского корпуса имеет такую же высоту, что и здание Главного штаба» (the SUBJECT preserved: the HQ = the GS height; never convert into an absolute HQ number); the 1844 decree (ПСЗРИ 2-е собр., т. XIX, № 18398; 11 саженей = 23,47 м (ru.wiki «Зингер») / ≈ 22 м (КГИОП) — distinct source statements, not interchangeable conversions) is ERA-CONTEXT ONLY and cannot bound the HQ itself: the HQ was completed in 1843, the decree is 1844 — it governs later construction; the HQ's height law rides the GS relation and the ensemble composition; the General Staff ARC south stays BLOCKED by the committed look law — its figures now SOURCED for the day a look-back unblocks it: arch height/width 28 m, span 17 m, Nika 10 m, horses 3 m, front ≈ 16 m (the ru.wiki «с высоты 36 м» row reads as the composition top, never recorded as an equation); the Admiralty end west is the lowest), the facade pavement strip (sub-pixel from S0, ≈9 px at S1; re-visit with S1 captures), the wet-sett sheen (leaves Lambert; lighting goldens); the EDGE CLASS MERGED by the find: paving show-through in the trodden path + the winter windrows + the east wall are ONE class — «the snowed square has no edge»: the field runs to the horizon under wSnow=1 and the band grid is under the cover; both levers kept (sourcing: city snow-clearing practice; take only if the field still lacks an extent cue). CLOSED 2026-11-09 (the `square-palace` round): the owner flag «snow legibility at wSnow=1» — the cause-enumeration battery split the cause (authored trample constants + the light bound) and the round landed the narrow path + the packed tone + the conditional wSnow-gated sky gain (design-ground-snow §12; decisions.md's class-I closure note).

## Definition of Done — every phase

1. production URL updated;
2. budgets met on the reference device;
3. CI green, including budget checks;
4. ADRs for any new decisions;
5. one devlog entry with one hero frame;
6. license register and artistic-license register updated.
