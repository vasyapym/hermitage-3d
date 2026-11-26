 # Roadmap

Phases are defined by exit criteria, not dates. A phase that stalls is **split, never widened**. Every phase ends at a deployed, publicly visitable URL — never an invisible foundation.

Lifetime cap: **≤ 7 rooms, ever** (charter — [docs/charter.md](docs/charter.md)).

Rooms: 4 of 7 in progress — St George's Hall (lane `st-george`, PARALLEL; the DEC-ready row lands at the integrating merge).

## Principles

1. The room is the unit of planning, budgeting and shipping.
2. Procedural where the architecture repeats; handmade only where the camera gets close.
3. Light is the feature; UI is nearly absent.
4. The least machinery a senior reviewer would still respect.

**Course — standing preferences** (owner, 2026-11-23; suggestions to explore, not contracts):
- Default shared-JS delta ≤ 0. A positive delta declares its OWNER PLATE in docs/budget-ledger.md. Use `pnpm build && pnpm budget`; target the chunk the rooms / ru / other split names, not a guess. Content follows AGENTS.md rule 9; compose from docs/relay.md. Instrument: docs/briefs/ROUNDS.md (course-instrument).
- Painted content: authored SVG → deterministic raster → KTX2 on the room's texture line. Jordan precedent: tools/bpy/plafond-art.svg + tools/bpy/plafond-raster.mjs. Generalise the rasterizer at the second plate, not before.
- Features: the v2 menu below. Deferred work and the plan's successor (the parked vision round): docs/parking-lot.md. Costs: docs/budget-ledger.md. State: docs/STATE.md.

## Reference device

One machine: **MacBook Pro 2017 — 2-core i5 2.3 GHz, 8 GB RAM, Iris Plus 640.** It is both the development box and the performance gate: if it holds a steady frame on T1 and never breaks the T0 floor, the palace holds everywhere. Discrete-GPU (T2) checks are opportunistic, on borrowed hardware. Lightmap bakes in Blender are the known slow spot on this machine — bake times are logged per room and bakes are constrained accordingly ([docs/architecture.md](docs/architecture.md)).

## Phases

### Phase 0 · Mass & Sky — complete 2026-10-16

True-scale white Palace massing under the live Petersburg sky; real-time title, hairline time control, shareable URL. Contract: [docs/design-sky-time.md](docs/design-sky-time.md). **Exit:** URL live · CI green · [devlog #0](docs/devlog/0000.md), including the gate and §12 method record. Stall split: 0a repo/CI/sky; 0b massing/time UI.

### Phase 1 · The Facade — complete 2026-10-17

Articulated Palace Square facade, Alexander Column for scale, General Staff massing, walk/fly the square; facade spec viewer at `/notes`. **Exit:** budgets met on the reference device · grammar documented and tested. [Device pass and §11 verdict](docs/devlog/0001.md).

### Phase 2 · The Staircase — complete 2026-10-19

Enter through the arches, cross the dim Rastrelli Gallery and ascend the Jordan Staircase in hour-dependent light. **Exit:** room meets [its contract](docs/architecture.md) · disposal verified · [devlog and §9 re-marks](docs/devlog/0002.md). Interiors stay at true coordinates.

### Phase 2b · Night Windows — complete 2026-10-19

The lattice reads the interior nightChandeliers state from the square; no added lights, custom materials or fourth baked state. DEC-019 owns the pane/weight law. White-night windows stay dark on the dusk plateau; the June-solstice midnight bound is ≤10% of peak. For this change only night goldens re-baseline; day/dusk stay bit-identical. **Exit:** 21 Dec 21:00 golden reads the facade from the lattice alone · ≤3 additional draws and ≤~4 k additional tris, slots and light counts unchanged · reference frame time within +0.2 ms. [Gate record](docs/devlog/0003.md).

### Phase 3 · The Gallery — v1 complete 2026-10-27

Military Gallery of 1812: 332 frames under skylights, room index and end-to-end Square → portal → Rastrelli Gallery → Jordan Staircase → airlock → Gallery route. **Exit:** v1 announced · all budgets green · license register complete. [Device pass](docs/devlog/0005.md).

### Phase 4 · Reach — in progress

**Ships:** phone tour on T0; keyboard-only tour; winter cornices; Neva facade using the same kit. Winter mode landed (DEC-033..035). Delivery records in docs/briefs/ROUNDS.md: R8–R12 winter; R13–R15 chrome; R16/R16.1 chrome verdicts and delivery; R16.2 language/«Залы» swap.

**Dependency:** R17's design ratification (2026-10-30) is not a device pass: all six §16 calls adopted in docs/design-mobile-tier.md §17. Mobile-A/B/C follow §15 for the tier and touch rail; then the accessibility pass, Neva facade and WebGPU evaluation ADR. **Exit:** Lighthouse accessibility ≥ 95 · mobile floor met on low-end hardware stats.

### Phases 5+ · v2 menu — one feature per phase

- [ ] **The Cut** — pull out of any room and slice the shell open. True-coordinate interiors are the dependency; compose with Petersburg Time.
- [ ] **Pavilion Hall** — first v2 phase once the pipeline is proven; the Peacock Clock is its single hero prop.
- [ ] **Malachite Room**
- [ ] **Rotunda** — an airlock between wings.
- [ ] **Neva embankment approach**
- [ ] **Floodlit facade** — design the height gradient together with Phase 4's snow-mask slot. DEC-019 rejected real uplights: day-time fragment tax and shader change on the reference GPU.
- [ ] **Palace Square lampposts** — historic cast-iron posts around the column, faked halos; accent, not light source. Keep the column and far-corner hunts distinct.
- [ ] **Palace Square successors** — select a feature, not the whole list. The find and its sourcing limits are indexed in docs/briefs/ROUNDS.md (square-palace-2).
 - **Stylobate:** source a broader stepped platform, not the three sourced plain-box rows already in COLUMN_PLINTH.
 - **Column candelabra:** the 1876 Rachau set is an S0b accent, not visible at Sh. Form: 1896 photochrom and 1897–98 postcard. Count/height NULL; removal with the fence is inferred. The four 1977 corner recreations are a separate, far/low subject; form/height NULL.
 - **Flanks:** Admiralty/west and south massings remain choices affecting five S0 goldens. The south General Staff arc stays blocked absent a look-back; the find owns its sourced figures (36 m is a composition-top reading, not an equation). The sourced relation is HQ = General Staff height; the hunt found no absolute height. The 1844 decree does not bound the 1843 HQ. Re-derive the enclosure sightline if S0b moves.
 - **Surface:** revisit the pavement strip with S1 captures (sub-pixel at S0, ≈9 px at S1). Wet-sett sheen leaves Lambert and implicates lighting goldens. Paving show-through, windrows and the east wall addressed one missing extent cue: take the remaining surface levers only if the snowy field still lacks an edge; source city snow-clearing practice.

**Square dispositions** (docs/briefs/ROUNDS.md, by row): square-palace closed the wSnow=1 legibility flag (docs/design-ground-snow.md §12); square-gap landed the east HQ (DEC-049); square-next round 1 landed its night lattice (DEC-052); square-next round 2 landed its day read, surrounds, snow lip and General Staff junction (DEC-053). The surround-relief successor is closed. The day census has a ranking and an owner PICK in sq-arch-day (DEC-054); sq-shadow-dirt owns the later shadow fix (DEC-055). These are evidence for selecting a successor, not fresh scope.

## Definition of Done — every phase

1. production URL updated;
2. budgets met on the reference device;
3. CI green, including budget checks;
4. ADRs for any new decisions;
5. one devlog entry with one hero frame;
6. license register and artistic-license register updated.
 