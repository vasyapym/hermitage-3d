# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: the compaction branch `records-compaction`; the pre-rewrite pin `ff2a85ed19b41c2bda750dc1dd229e6409201daf`; the merge to main waits the owner's signal.
Budgets (the movement-ux union — the last-merging session's measure, ROUNDS row 7): JS 285,170/350,000 (the lane ≈ +1,129 — the declared +1,000, ≈ +129 over, the owner plate) · RU 7,339 · rastrelli-gallery 851,322 shipped of 2,000,000 · jordan 1,237,543 of 7,000,000 · military-gallery 3,008,700 of 4,000,000 · basis 584,862 of 600,000 · exterior 0 of 4,000,000.
The wave: square-palace (slot 1, `b5d364c`), rg-f3 (slot 2, `cb55702`), movement-ux (slot 3/3 — the FULL e2e/golden gate rode this last-merging session; landing `56aebb9` per the pinned ledger) — all PARALLEL slots MERGED, every reservation released.
Owed: the owner's eye-read of the union gate's 9 re-baselined goldens (ROUNDS row 7: «15/15 green, 0 flips», the eye-read pending).

- **2026-11-15 · square-palace-2 MERGED TO MAIN (the wave's slot 2/3; the FULL e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived).** The round: the certification round per the adopted find reply (`2-palace-square-find`, 2026-11-15): NO src/ change — the declared JS/RU/payload/draws/tris deltas all +0 (docs, tests/e2e spec options and snapshot files only). EXECUTED ON THE BRANCH: **T1 the golden detector adjudication** (probes/golden-gap-t1b: self-noise 0 — deterministic; all four square goldens PASS honestly at the gate; the detector is a STRUCTURE detector — the committed dec-noon baseline vs HEAD: 61 % of frame differs by tone at meanY 25–35 under the ~52.8/255 blind spot, trip 0.12 %; dec-night absorbed as the find predicted; the touch-rail pair rode inside the golden frames — HIDDEN now in golden.spec.ts); **T2 the 35-cell census** (probes/square-census-t2: HEAD maxima 41 draws / 53,173 tris at d-S0-dec-night, the recorded S0 cells exact; the VOID_BACKDROP_S0B metric — 42–47 % of the S0b band behind the monument is bare field at every instant, the find's 1.1 confirmed numerically); **T4 the sourcing hunts** (the vault hunt-sources.md: the HQ height honest NULL + the sourced relation «Фасад штаба Гвардейского корпуса имеет такую же высоту, что и здание Главного штаба» (subject preserved, never an absolute HQ number) + the 1844 decree as ERA-CONTEXT ONLY — the HQ predates it (1843 completion vs the 1844 decree), it governs later construction, it is not the HQ's bound; the candelabra count/height NULL, the form rides two dated photo refs; the arch 28/28/17/10 confirmed; the 1977 lanterns NULL re-confirmed); **the Sol 6.1 review pass (brief 3) INTEGRATED with a triage** — confirmed-and-fixed: the box-denominator mislabel (the per-box numbers were frame contributions; the box-internal shares published: dec-noon's ground ≈ 100 % differing), the s1-noon-at-t=0.1 consequence (trip 1.05 % > 1 % — the pin flips s1-noon today, its re-baseline rides the same sitting), the decree narrowing (era-context, not a bound), the VOID metric relabel (modal-tone occupancy, not bare field — the mask image `void-mask-d-S0b-dec-noon.png` is the exhibit: the solid void block right of the monument + the facade's shared-tone dither), the arrival contract verified in source (scrub.hidden = phase !== 'settled'; under det=1 the fade is SKIPPED — no partial-opacity state exists; the time-series evidence row rides); scoped-down with recorded reasons: the full comparator-parity campaign (the constants are the vendored source's own — equivalence by construction; the synthetic self-test pins the grey/chromatic semantics: a 60-byte blue-only step trips neither threshold), the interior-family re-runs (they ride the finale), the cold-cache test (the self-noise pairs are already independent chromium launches); the fixtures hide question CLOSED by inspection (fixtures has its own hide law and deliberately captures the overlays). **T5 — the owner sitting RESOLVED (2026-11-15, the question tool)**: (1) **1a ratified** — the golden baselines re-baseline to the landed winter (dec-noon + dec-night + s1-noon) AND the detector pins **t = 0.1** (the explicit `GOLDEN_THRESHOLD` in golden.spec.ts; the daylight-testing instrument: a grey re-grade ≥ ≈26.4/255 over ≥1 % of frame now trips; the re-baseline run waits for mains+quiet per the gate law); **the owner's steer recorded verbatim**: «light scenes ok. I prefer night; daylight realization should be improved and we should test daylight» — the DAY look is a design direction for the next rounds (the night aesthetic preferred; the day scenes accepted as baselines but to be improved); (2) **the assets-first rule RATIFIED** (the DEC-ready row's text stands; the DEC number at merge); (3) **the pans KEEP** (the 47.9°/45.8° pending closes); (4) **the S0b void = THE MISSING WALL** (rank 1.1 stands: the HQ east wall is the first content slice after machinery); (5) **the spill stills ACCEPTED** (the 2026-11-14 eye-read closes; the dusk-class parking-lot row remains the only open throat item). Geometry rounds do not open before the machinery round. **The golden battery at the pinned t=0.1 (2026-11-15, two passes under co-tenant load)**: pass 1 (enumeration) — 25 passed, **ONE real flip: golden-dec-noon, ratio 0.40 (the gate's own number, matching the probe's 41.7 %)**; 11 storm-class deaths (the hold-800/goto-timeout class, data-frame-ms 833–6116 ≈ 1 fps — the documented load pattern; classified from the error contexts); **the AA-forgiveness learning: the vendored comparator's anti-aliasing allowance (which the probe lacks) forgives the s1-noon fence/paving/grading drift — the probe's trip shares are upper bounds; s1-noon and dec-night PASS at t=0.1 — the re-baseline scope narrows to dec-noon ONLY**. Pass 2 (--update-snapshots) ran on a thrashing machine (38.7 min, 23 timeout deaths; two PNG rewrites written under load — dec-noon + fixture-1812-en — are UNTRUSTED and REVERTED). **The dec-noon re-baseline DEFERRED to the merge finale's quiet full battery (deferred NOT waived — the standing pattern); until then the row flips by design against the old baseline; the pin and the daylight-testing instrument stand.** **The architecture draw (brief 4, Fable 5.1) ADOPTED** — the exterior asset program: the resident gains ONE kit (`public/assets/square/{manifest.json, kit.glb}`, RoomManifest verbatim, named nodes `el:*`), late-bind boot-parallel load (zero fetches before first paint; the presenter's fade covers the mount; failure = log + `data-square-kit='failed'`, additive never load-bearing), the material bind law (the glb ships placeholder materials, the mount binds by node name to the square's massing materials — the MeshStandardMaterial trap named mandatory), the style law (content = bpy; behaviour/shading = JS with a justification row), the pilot spec (the HQ east wall: massing-with-portico, one mesh ≤ 1,500 tris, HQ_CORNICE_M 20.5 declared inside the sourced frames, AL-SQ-01…05 verbatim), the chain gates G1–G9 (script-only, determinism ×2, the census tool, the manifest law unit-pinned), the machinery's declared wiring ≤ 2,000 B → the allowance 2,048 B → the ceiling micro-lift 285,707 → 287,755 proposed, ratified at the measured delta at the machinery landing; the caps: SQUARE_DRAW_CAP 56 / SQUARE_TRI_CAP 75,000 + the KIT sub-allowances (6 meshes / 18,000 tris / payload 1.5M of the 4M / TEX_VRAM 8,388,608 decoded); the candelabra successor specced (4 corners DECLARED from the two photo references, ≤ 2 meshes / 2,400 tris). The integration-time verification items: the shadow-draw counter scope (the ledger row says incl. shadow — consistent), the type-widening ripple in engine/ledger.ts + registry.ts, the first-presented-frame hook's exact name in main.ts. **THE MERGE ACT (slot 2/3, 2026-11-15)**: origin/main's `94f0cd8` (rg-f4's slot, DEC-044 taken) merged into the lane; both-stand conflict resolutions in STATE + the ledger; the union's validate GREEN (tsc 0 · biome clean · vitest · build · budget — the budget print byte-equal, JS 285,631 held); **DEC-045 numbered by this merge** — «the Palace Square certification: the golden detector's explicit threshold t=0.1 (the daylight-testing instrument), the #touch-rail hide law, the certification records, and the owner-ratified assets-first direction with the adopted exterior asset-program architecture (the machinery's implementation DEC-ready rows stay parked for the machinery's merge)»; the reservation SPENT and RELEASED; **the dec-noon golden re-baseline + the full-battery verdict ride the finale (deferred NOT waived — the row flips by design against the old baseline until the finale's quiet re-baseline)**.
- **2026-11-15 · rg-f4 MERGED TO MAIN (the FIRST slot of the three-lane wave; fast-forward
  `a32b70c..82e1756` at the owner's directive — the other two lanes merge after; the FULL
  e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived;
  validate GREEN on the merged HEAD; DEC-044 numbered at this merge; the ledger row SPENT
  and RELEASED).** The bench ×4 landed «the day that lights the room»: the pane row in
  bake.py STAGE_SPILL_PARTS is the room's PANE_EMISSION dial — **day 2.7 / dusk 0.9 / night 0**
  (the RG-F3 first-bake 0.020/0.006 emitted ~nothing; the Fable-5.1 find-draw ruling + the
  owner's ratifications: the slice as drawn · the B4 bands · the B2 retire · the (c) retire).
  MEASURED 14/14 (the committed instrument, full-sample 6×4 grids): G1 floor day **+21.2** ≥
  +20 · vault day **+21.1** ≥ +8 · dusk floor **+6.9** ∈ [+5,+15] / vault +7.2 / mean 98.6 ·
  night 45.8/86.5 byte-held · day mean 113.3 ∈ [100,125] · max cell 147 < 200 · ordering
  86.5 ≤ 98.6 ≤ 113.3 · B6 passage ≤ +2.1. The compose law untouched — the (c) day-lamp-weight
  split retired by the owner's call on ESTIMATES (the floor delta ≈ −11 / the G0 day mean ≈ −17,
  rendered-space linearity unverified end-to-end; the day reads lamp-lit + pane-washed); B2's
  numeric z=70 lead retired (the wash equalizes the wall columns at any B1-passing strength,
  measured −1.2 vs the paint-only +15.7; the source asymmetry lives in the dial + the paint).
  CONTAINMENT: glb 5bf119e8… byte-identical (the bpy build regenerated), the night ktx2
  5b5d2111… reproduced **×4** through the fresh chain (the rg-details ×2 worry resolved at the
  chain level), probe 487556b1… unchanged, the night renders +0.0; payload **852,888/2,000,000**
  (+1,614) · textures 600,576/1M (+1,566) · tris 10,868 / draws 8 · JS/RU/basis byte-zero.
  INSTRUMENT COMMITTED: tools/probes/rg-f4-capture.mjs + rg-f4-bars.py +
  tests/rastrelli-state.test.ts (the dial rows + the two containment sha locks + the envelope
  pins). RECORDS: design-staircase §1.4 DELIVERED AND MEASURED; license row 52's
  measured-delivery sentence; the ledger reservation LANDED + the update-log line; the
  DEC-ready row parks (the number at the merge). The golden flips expected at the merge
  finale: golden-gallery-{day,dusk} re-baseline, golden-gallery-night byte-held. The
  targeted night-golden harness run STORMED today (the machine's ~6.3 s/frame cadence: the
  hold's 800 ms needs ~8 clamped 100 ms ticks ≈ 50 s > the spec's 45 s settle timeout; two
  earlier runs were also CONTAMINATED — another lane's 26-hour-old vite preview (square-palace-2,
  PID 41776) squats on the e2e config's port 4173 and playwright's reuseExistingServer reused
  it — reaping rides the owner/that lane) — the night byte-held evidence is the plate sha ×4 +
  the battery's +0.0 night renders + the direct baseline diff: only the doorway-reads glare
  repaint's PRE-EXISTING deferred door-box flip (x 612–843 · y 300–418, the >32 deltas 0.51% <
  the 1% fence; the baseline predates 4147e60), everything else AA grain. The vault
  trail: `03_projects/hermitage-3d-2026-11-15/` (the ruling in round-1/replies/, the bench
  iterations in probes/rg-f4-shots-iter1..4/, local-only).
- **2026-11-15 · rg-f4 OPEN (PARALLEL — the owner's 2026-11-15 directive: another agent works per
  STATE/ROUNDS in parallel; this lane works ONLY inside its own worktree
  `~/Documents/hermitage-3d-rg-f4`, branch `rg-f4` off main `a32b70c`; MERGE into main + the FULL
  e2e/golden gate at the owner's notification that the parallel work is done — NOT this session;
  SCOPE-LOCAL gates only: the bpy/bake/encode chain as needed, `pnpm validate`).** The Rastrelli
  Gallery's next visual round. The room's committed assets stand as the merged doorway-reads
  round left them (payload 851,274/2,000,000 · textures 598,962/1M · glb 252,312 sha `5bf119e8…`
  · tris 10,868/110,000 · draws 8/25 · LM 1536 · wp 0.8 × gain 2 = eff 1.6 in every state ·
  GALLERY_LAMP_SCALE 3 · five stops G0/G0b/Gj/G1/G2). The relay opens FACTS-ONLY (the owner's
  directive: investigate the room's current state, hand the creative model the fact pack, let it
  pinpoint what is missing/lacking the most and decide what the round takes; ZERO STEERING). The
  fact pack: the round trail (RG-D1 → RG-E1 → RG-F2 → RG-F3 → rg-details C″ → doorway-reads →
  owner-steer → transit-band) + the committed manifests/licenses + the standing repair-cascade
  situation + the orchestrator's own capture battery (probes/rg-f4-shots/, local-only, 13 frames
  — all five stops × day + four stops × dusk/night, 6×4 luminance grids per frame: the floor
  zone reads near-black at every stop but G2 in all states; the door zone barely differentiates
  across states at G1; night-G0 the only true-black frame). Briefs numbered from 1 in the vault
  `03_projects/hermitage-3d-2026-11-15/`. The budget-ledger reservation row is declared when the
  slice is known; the DEC number is assigned by the integrating authority at merge (a parallel
  branch parks its DEC-ready row).
- **2026-11-15 · jordan-slice-3 LANDED (slice 2c «the hour reads before the walls are
  dressed» — the branch; the MERGE into main + the FULL e2e/golden gate RIDE THIS SESSION by
  the owner's directive — the last merging session of the wave; the expected golden flips:
  the three jordan J4 frames (day/dusk/night) re-baseline at the finale + rg-f4's
  golden-gallery-{day,dusk} + square-palace-2's dec-noon).** The round's shape: the FACTS-ONLY
  FIND (the RG-F3 opening shape; the census + the 13-frame battery + the record trail) → the
  owner ratified slice 2c IN FULL (the FIND's items 1–3: the dusk≈night separation + the day's
  value band + the warm chips; 2b wall articulation named the next slice) → the value-table
  draw (brief 2) → the dusk-correction draw (brief 3, rev 2 adopted over rev 1) → the
  integration with FOUR measured iterations. THE DELIVERABLE: the per-state encode bands (day
  [0.2,0.45] W 0.45 · dusk [0.35,0.45] W 0.35 · night [4.0,4.5] W 4.0; gains 2.22/2.86/0.25;
  κ = 1 everywhere), the day sky 1.0 → 4.0 (the sun unchanged 4.0 — the drawn 3.5 cut reverted
  by the capture read), the dusk rig ×0.1 of 1,600 W (the parked knob taken) with sky 0.30
  (the first draw 0.8 lit the whole body — the dome is omnidirectional), the chips normalized
  to authored 1.0 (the tint survives the clip; bake-side dusk chips 0.1 absolute; runtime
  scales 0/0.5/1), the pane dark-glass (base colour (0.02, 0.02, 0.025) — the night pane the
  darkest surface), the environment probe re-rendered (dusk/scaled-rig). THE FINDS ON RECORD:
  (1) **bake.py's RIG_STATE_SCALE was a GATE, not a multiplier** — the parked knob was not
  exercisable (the committed 0/1/1 masked it); 2c made it a multiplier (day/night
  byte-identical through the fix); (2) the committed day plate's top was BINARY — 0.0 % of
  texels at stored 152–247 (the clip census's smoking gun; the fresh plate: 33 %); (3) the
  ETC1S q128 dark-median loss measured −22 (the dry-row → ktx2 delta the gates must carry);
  (4) the emissive gate reads the glTF default at strength 1.0 (the exporter omits the
  extension at the default). THE GATES: the census green on all three fresh ktx2s (day p50
  118.3 · p90 195.8 · near-white 1.58 %; dusk p50 72.5 ∈ [70, 90] · p90 122.9 · near-white
  0.13 %; night p50 40.1 · p90 94.1 · near-white 0.08 % — nothing clips, the pools keep the
  lamp tint, the walls fall off); validate GREEN (tsc 0 · biome clean · vitest 1121/1 on 63
  files · build · budgets ok; **JS 285,629 = −2 of the ≤ +0 declared** — the dusk gain 1 → 2.86
  +3 clawed by the jordan-row shortenings; jordan payload 1,190,510 of 7,000,000); the capture
  battery 15 frames + the pixel-grid reads: the day reads with real modulation (the walls'
  mean −10 % vs the committed = the contrast arriving — the eye-verdict better; the stairs and
  the sun patches brighter, the patches white-hot), the dusk reads evening (the warm lamps +
  the cool windows; the window-zone B−R split reads on the pane/chips, the mid-wall median
  near-neutral by construction), the night reads night (the dark walls + the pools + the dark
  glass panes; the hour ladder day > dusk > night holds at the paired cells). THE BAKES: day
  ×2 + dusk ×4 + night ×1 (the scale fix + the sky recalibrations, all under caffeinate; the
  probe ×3). THE PARKED: the wall articulation (2b — the next slice), the fixture FORM (E —
  the axial photograph), the plafond (3), the rosettes (4), the probe's day-state residual
  (the day envMapIntensity 1.0 samples the dusk-lit probe — the ADR-0013 class, re-worded).
  The records: the license row «Jordan light states (slice 2c)», the ledger rows (the shared
  lines + the jordan room row + the update log).
- **2026-11-15 · jordan-slice-3 OPEN (PARALLEL to the luna2 portfolio session's in-flight track —
  observed in flight at this round's opening; this lane works only inside its own worktree
  `~/Documents/hermitage-3d-jordan3`, branch `jordan-slice-3` off main `a32b70c`; MERGE into main +
  the FULL e2e/golden gate at the owner's notification that the parallel work is done — NOT this
  session; SCOPE-LOCAL gates only: the bpy/bake/encode chain as needed, `pnpm validate`, the jordan
  capture battery).** The Jordan Staircase's next visual round — the owner's directive: investigate
  the room's current state, hand the creative model the fact pack, and let it pinpoint what is
  missing/lacking the most; the selected slice then runs decision → implementation docs as separate
  briefs (the RG-F3 round-opening shape). The relay opens FACTS-ONLY — the FIND dossier (the vault
  `03_projects/hermitage-3d-2026-11-15/1-…`, CREATIVE Fable 5.1, text-only) carries the full census
  (geometry / materials / light / assets+budgets / gates), the fresh capture battery's factual reads
  (13 frames: 7 stops × day + J0/J2b/J4 × dusk/night on the branch tree), the record trail (slice 1
  + slice 2 + what they parked), the register's jordan rows, and the repair-cascade standing
  situation surfaced with its own numbers; the specialist decides the slice; ZERO STEERING. Budget
  context at open: shared JS 285,631 of 350,000 — 76 B under the proposed 285,707 operating ceiling
  (a shared-JS spend is effectively blocked without an owner call); the room's own budgets have
  headroom (payload 1,237,543 of 7,000,000 · textures 996,068 of 4,000,000 · tris 21,872 of 380,000
  · draws 19 of 60 · decode-cells 3,250 of 4,096). No code yet; the state/rounds marks ride the
  branch and land at the round's own landing commit.
- **2026-11-14 · the transit-band round LANDED ON MAIN (direct, solo-lane; the gate = validate GREEN (tsc 0 · biome clean · vitest 1127/1 on 64 files) · JS 285,631 gzip (+22 — the roomsRoot Group + 2 redirects + 1 flag line; 76 B under the proposed 285,707 ceiling, no ledger row) · RU 7,360 · the targeted e2e battery GREEN — golden + smoke + environment-handover: 29 passed (38.6 m), zero failed/flaky — the settled goldens bit-identical (incl. golden-s1-noon, the day zero-flip detector), the smoke covers both transit directions + the return home, environment-handover covers gallery→jordan + interior→square · the golden spot-checks GREEN (the battery's golden suite — zero flips) · the CI verdict on the pushed head: FAILURE = the residual known reds ONLY — the draw-calls budget assertion (expectWithinBudgets, Received 260 > 250, SwiftShader) tripped on the touch-rail military-gallery walk; the identical received 260 is the documented pre-existing class (failed ×2 on the two immediately-prior main runs — the handoff and the parking-records commits, zero runtime changes — and ×4 at fd838f4 itself); nothing new — the verdict per the solo-merge ruling: PASS; the post-fix transit screencast GREEN — 132 frames, the band absent across the whole mounted-but-not-indoor window (cast-025 mid-drain clean; the pre-fix casts preserved in the vault probe-1/prefix-casts/)).** The doorway residual PARKED 2026-11-14 is RESOLVED — and it was never the light law: the owner's sighting (both directions, camera-close, clock/device-independent, "most of the time") is **the Rastrelli gallery glb's south end wall (z 87.49, its baked lightmap's grain under MSAA) visible through the gate mouth whenever the room is mounted (the hold's start, `268e277`) while the exterior is still renderable** — the transit's mounted-but-not-indoor window; every prior golden and probe sampled the settled state, so two landed light rounds (4147e60, d64b3d2 — real settled-frame fixes, both REMAIN) never saw it. FIX: **the roomsRoot gate** — a host-owned `THREE.Group` under the scene; `RoomScene.add/remove` redirect into it (`rooms/*` and the contract byte-identical); `roomsRoot.visible = indoor` beside `palace.visible = visible && !indoor` in `applyPresentation` (per-frame) — exterior XOR interior, state-based (covers reduced-motion cuts and any window width; no FSM/applySwap/scheduling change). Verified on disk: three's compile collects materials via `scene.traverse` (visibility-agnostic — the hold still compiles the room's shaders; the light pass is `traverseVisible`, but all three room glbs carry no lights — JSON-chunk verified) so the hold-mount intent stands; the throat rides the palace group; the boot deep link goes `beginTransitTo` → `upload-swap` → `indoor = true` (no direct mount at boot); the exit swap re-seeds the camera (`seedRail('square')`) before the first exterior frame; the one stale-flag frame at the swap renders at the card's drained exposure (today's behavior is worse — the room stays visible until dispose). Relays (the vault `03_projects/hermitage-3d-2026-11-14/`): brief 1 the diagnosis ruling (Astra-6: six candidates; my "day deep-end collapse" REJECTED as stated — corrected to the lit-run contrast question; the ownership unresolved there), the two evidence probes (the lighting TABLE.md — the day lit-run collapses below ~0.01 ×E from d≈5–16 while the Basic cap stays (217,192,164); the ownership raycast — the settled stack matches the capture's element set, no band), probe C FINDINGS.md (the glb verdict: the band = the gallery's end wall mid-transit; no depth-fight pair; the glb north face 0.49 m BEHIND the cap; the settled frames never show the band at any viewport), brief 2 the lever (Astra-6: **(b′)** the host-side root gate — over defer-add (compileAsync would warm nothing), over a contract hook (the object is module-internal), over accept), brief 3 the review (Sol 6.1: ship as-is; the two conditional risks — the cold deep-link and the exit glide — closed on disk). The R24-ux «overlap visibility policy stands» (`efc0578`) consciously ADJUSTED on the exterior↔interior half by the one complementary line; the interior↔interior lifetimes and the environment handover unchanged. The settled-frame day read (the deep vault black at 12:01 — probe A's TABLE) is a SEPARATE on-record design question for the owner; the light-law levers (dusk-gate widening, GLOW_TOE, EXPOSURE.low) stay parked with it. Open threads unchanged: the 1812-360 app fix, scrub-11's +12 h, the draw-calls SwiftShader CI debt; the owner's eye-read CONFIRMED on the deployed build (2026-11-15, the owner: «i checked visually — it is fine»).
- **2026-11-14 · owner-steer LANDED ON MAIN (the walk reshaping + the doorway's evening spill; the two lane commits + the records; validate GREEN vitest 1127/1 · JS 285,609 of 350,000 (the walk −25, the evening +188; 98 B under the proposed 285,707 ceiling) · RU 7,360 · ZERO golden flips (golden-s1-noon = the day zero-flip detector GREEN; golden-dec-night GREEN) · the owner's eye-reads pending on probes/s1-after-{night-spill,day-spill}.png + the g2-door/g1-door stills).** (1) the gallery walk = the owner's directive verbatim: G0b inserted at the entry diagonal's exact midpoint (0.8, 1.7, 79.5, subject JUNCTION by reference, the look row Gj's verbatim), Gjb/G1b retired — five stops, the corridor reads as two long glides; the plan --check byte-identical (717,499; was 717,607); the smoke arrow-walk row stays the recorded machine-stall class (frame ~1283 ms; CI green = the authority). (2) the doorway's evening law = the Astra-6 relay's forward spill: lampSpill in src/world/throat.ts, the lit attribute itemSize 4 (alpha = the spill; the collar 0), the emissive = lampSlab() at intensity 0 with the one-splice shader patch (totalEmissiveRadiance ×= vColor.a; diffuseColor.a = opacity — the fade law exact; the loud-fail guard), the gate setThroatNightSpill(throat, wNight) beside nightLattice.setNight — day bit-identical; the pre-flight dusk numbers on record (the crown at −5° ≈ 0.0086 < the 0.01 floor — the dusk class rides the next ruling per the class discipline; the lever's AgX ceiling = the toe ~code 40, the deeper levers are owner decisions); the open threads otherwise unchanged (the 1812-360 app fix, scrub-11's +12 h, the draw-calls SwiftShader debt); the doorway residual: the owner STILL sees the visual bug post-spill and PARKED it 2026-11-14 (docs/parking-lot.md — the candidate levers on record; the next attempt starts from the owner's sighting conditions); the full battery waived by the owner's solo-merge ruling (the R21-ux/R22-ux precedent); the gate = the targeted battery + the golden spot-checks + the CI verdict.**
- **2026-11-14 · doorway-reads MERGED to main — THE STACK FINALE'S FULL GATE VERDICT (the merge `fd838f4`; the last merging session = this one; validate GREEN on the union: tsc 0 · biome clean · vitest **1116 passed / 1 skipped** on 64 files · build · budget **JS 285,446 of 350,000** (the doorway-reads reservation +94 released into committed; RU 7,386; rastrelli 851,274/2M; basis 584,862)).** The FULL battery 116 rows, 2.9h: **the [golden] project GREEN with ZERO golden flips** — the throat grading and the G1 door-glare repaint stayed inside the ±1 % tolerance (the owner's eye-reads remain pending on the capture probes); **fixtures-main-1920 en/ru = the DUE r26.2 flip** (re-baselined ×2, confirm green; the eyeballed bands read exactly the designed lift: the RU/EN toggle, the touch arrows' ~3 px nudge, the hint 14→16 re-anchor, the bottom chrome row 17→20 px + the 0.72 rest alpha; the pairs under probes/golden-flips-2026-11-13/). The 25 battery reds classified by isolation (AC power, no competing load): **12 storm** (isolation green), **1 flaky pre-existing** (scrub-double-click 11 — the +12 h noon-anchor mechanism unexplained, open), **2 REAL stale test literals from the 5-stop square** (touch-rail 916 + 1091: one tap now rests on S0b, the assistive click/second tap on Sh — FIXED at the finale, isolation green ×2; the stop lane's own rows, the cross-lane repair recorded), and the **walk-budget class** (smoke 176/300, touch-rail 304/269-jordan — 4/4 CI GREEN but local-red at ~1.2 s frames over the inserted stops' longer walks: the R73 trace-off differential is the named next probe; machine class, not code). The **1812-360 find** (the finale's own substantive result): the touch arrows' slot `--touch-center` is only written on font/layout events, never re-measured at settle — the load-line's 1 s latch (R23-ux) races the fonts and the arrows can freeze ~13–18 px high; the baselines were restored per the golden law (a re-baseline would encode one race side); the APP-side fix (re-run `layoutTouchRail` on load-line latch/unlatch) is the named next step, neither merged lane's debt. CI on the merged main: 916/1091 ride this delivery's literal fix — **GREEN in the 4f80224 run ✓**; the residual 2 reds = ONE class, the draw-calls budget assertion («draw calls, any frame», `expectWithinBudgets`) on smoke 126 + touch-rail 269-jordan, retried and failed ×2 — **reproducible in CI's SwiftShader env and PRE-EXISTING at fd838f4's own run** (the same assertion failed there ×4) while this delivery contains zero runtime changes (test literals + 2 fixture PNGs + records) — the stops lane's CI-only debt, the trace-off/draw-ledger differential the named next probe. The owner-steer follow-ups named by the owner 2026-11-13/14 ride the next lane: the gallery walk tweak (split the G0→Gj entry leg + remove the two axis midpoints; orchestrator-direct) + the doorway's evening dark-crown lever (the square sky-model law; one gentle relay).
- **2026-11-13 · doorway-reads MERGED to main (the LAST merging session of the stack — the merge commit carried the records; the FULL gate verdict is the bullet above; the branch landing 4147e60: the throat grading constants (AO_MOUTH 0.83 / AO_FALL_M 9 / AO_FLOOR 0.10 / GLOW_TOE 0.04 / GLOW_GAMMA 1.4 — the doorway «block» read as a plate, no bake), the door-heading law (levelHeading + the facing-away locked dolly; live at J0/G0/M0 backward; the flat rails bit-identical), the ≥1920 chrome tier (17→20 / hint 16 / the three members 0.72), the dev-only TDZ healed, and the G2 east-door glare repaint (the full 3-state bake re-ran; L_DAY 1.1; the contrast record three-domain — encoded 2.24× the wp ceiling, display 1.77/1.52/1.39×); the branch gates: vitest 1100/1 · JS 285,264 (+94, the ledger row) · rastrelli 851,274/2M; the Sol review 8/10 zero breaks, two survivable fixed comment-only; the owner eye-reads pending on probes/{s1-after-*,g2-door-*,g1-door-day}.png).** The PARALLEL bullet below carries the lane's full shape; the FINDINGS ledger rides the vault 03_projects/hermitage-3d-2026-11-12/round-1/.
- **2026-11-13 · doorway-reads OPEN (PARALLEL to the owner's in-flight lanes — this lane works only inside its own worktree `~/Documents/hermitage-3d-doorway-reads`, branch `doorway-reads` off main `438c3a3`; MERGE into main + the FULL e2e/golden gate at the owner's signal — NOT this session; SCOPE-LOCAL gates only: `pnpm validate`, targeted rows; golden re-baselines ride the finale — deferred NOT waived).** The owner's three observations in one round: (1) the doorway «block» entering the Rastrelli Gallery from the square — captured and DIAGNOSED (Sol 6.1): the sky-lit run's AO-bottomed grading reads as a plate from the approach distance (committed-design-mis-reading; the magenta-collar diagnostic proves the collar shows no second source); FIXED in `src/world/throat.ts` constants only (AO_MOUTH 0.83 / AO_FALL_M 9 / AO_FLOOR 0.10 / GLOW_TOE 0.04 / GLOW_GAMMA 1.4 — the lamp's warmth reaches the seam; no bake, vertex colours); the owner's eye-read pending on the capture stills (morning/noon/evening at S1). (2) the Back-arrow depart at the stair foot J0 — DIAGNOSED numerically (the end tangent inherits the stair slope; the eye sinks 0.83 m; the point-lerp gaze crosses overhead — a zenith pass) and FIXED by the Fable 5.1 law: `levelHeading` in `src/world/threshold-beat.ts` (the door heading — the eye keeps the stop's height; the standoff measured from the doorway's own vertical plane; the lean rides it) + the facing-away clause (a locked dolly — the gaze holds the stop's subject; live at J0/G0/M0 backward per the measured facing table; DEC-017 amended §4.1a/§4.1b; tests +11 spec rows); validate green (vitest 1100/1; JS 285,264 of 350,000, +94 over main's 285,170). (3) the three chrome buttons (lang toggle / notes link / rooms opener) more prominent on big screens — the Fable ≥1920 tier (the register ×1.2: 17→20, hint 16; the three members' rest alpha 0.55→0.72; nothing below 1920 changes byte-wise; the 1920 fixture flips ride the finale re-baseline). PLUS: the row-60-reported dev-only TDZ (`lastLabelEpochMs` read by the top-level `applyEpoch(epochMs)` before its line-2708 declaration) HEALED (the declaration moved above `applyEpoch`; dev boots clean — console-verified; the built preview was always clean). The G2 east-door flat-card read (surfaced by the same capture pass): DIAGNOSED (a flat painted value calibrated at G1; G2 never golden'd) then FIXED — bake-side repaint via the encode-paint path (the accepted reply §2.3's glare law, implemented in the machine source `tools/reencode.mjs` GLARE_* + `tools/reencode-paint.py` glare_field with the `tools/bpy/bake.py` PANE_PAINT twin synced: value = tint×L_s×(0.55 + 0.45×cos² falloff) per part and state, the lunette sharing the card's law; L_DAY 1.1 — the dial's floor puts the card's centre above the 0.8 white point so it renders at the atlas's expressible ceiling; the contrast domains recorded apart (the review finding, 2026-11-13): pre-encode paint ratio 1.1/0.3566 = 3.08× (the dial's setup arithmetic), encoded scene-linear 0.8/0.3566 = 2.24× (the format's ceiling at this wall plate — raising it needs the white point, a room-wide law), display (AgX at eff 1.6, measured off the captures) day 1.77× / dusk 1.52× / night 1.39×; the ×1.14 G1-distance lineage superseded). The plates were re-baked because the stage caches were wiped — the bake-stage plates byte-matched the previous run (pixel-identical); the PUBLISHED ktx2s change by the glare paint (the manifest sha rows updated; the re-encode byte-equal ×2 per the chain's record; payload 851,274 of 2,000,000; the wall's old card spill rides as-is, the residual noted). Acceptance captures: probes/g2-door-{day,dusk,night}.png + probes/g1-door-day.png (gitignored); the night card reads 0.87× the wall's light (the law's own 0.25 ratio) — the owner's eye pending. The Sol review pass: **8/10, zero breaks**, two survivable findings fixed comment-only (the three-domain contrast record above; the near-level eye-height residual documented ≤2.5 cm in §4.1a + the module comment); the follow-up declined by the owner; the FINDINGS ledger in the vault `round-1/`. The landing commit carries the STATE/ROUNDS/ledger rows.
- **2026-11-12/13 · movement-ux ci-hardening + the stops mini-round → MERGED to main (the FIRST of the two merging sessions — fast-forward `438c3a3..679298d`, ff'd 2026-11-13; the FULL e2e/golden gate + the CI verdict ride the LAST merging session — deferred NOT waived; the deterministic battery green on the merged HEAD: tsc 0 · biome clean · vitest 63 files 1099 passed / 1 skipped — the COMMITTED suite; the main tree's `probes/r4-kit-night/probe24_test_copy.test.ts` (another session's gitignored scratch) inflates the local run to 64 files / 1105 — reaping rides the owner; build JS 285,332 (+162 of the declared ≤ +450 — the binding budget line is the TIGHTER of the two: 285,620 declared vs the 285,707 proposed ceiling, the Sol-review OQ5 wording) · RU 7,386 (+47 of ≤ +250) · rooms/basis untouched; the mobile-plan determinism pin 717,197 → 717,607 (+410, `--check` byte-identical); the goldens BYTE-HELD by construction (S0/Sh/S1/G0/Gj/G1/G2 poses untouched — the last session's golden battery expects ZERO flips from this lane); the owner's eyeball of the two ~47° pans (S0→S0b→Sh) rides the merge preview — Fable's fallbacks are on record in the round folder).** The PARALLEL bullet below carries the round's full shape (the measured deviations: the byte-trade's zero-net + the owner-ruled revert; the settle's capped-clock sizing; the data-dwell-ms instrument; the 44-call truthing).
- **2026-11-12/13 · movement-ux ci-hardening + the stops mini-round OPEN (PARALLEL — the owner's 2026-11-13 directive: another agent works per STATE/ROUNDS in parallel; this lane stays ONLY in its own worktree `~/Documents/hermitage-3d-movement-ux`, branch `movement-ux` off main `438c3a3`, touches its own paths, and the MERGE into main + the FULL e2e/golden gate ride the OWNER'S notification that the parallel work is done — NOT this lane; scope-local gates only).** The handoff round (vault `projects v13/7-…-ci-hardening-handoff.md`) ran with three measured deviations on the record: (1) the byte-trade MEASURED ZERO NET — the four id literals appear once each in the minified bundle (≈40 raw B ≈ 9 B gz in the main chunk) and the room chunks' import-hash-string noise ate it (the tool total stayed 285,170; the handoff's ~80–150 B was an unmeasured estimate); the owner ruled REVERT — main.ts is byte-identical to the recorded state, and the +129 overage returns to the owner's plate; (2) the touch-rail settle 2.5 → 8 s (the no-preference tap #1 is a WALK leg ≤ ~2.6 s and the bit binds per rendered frame, ≤ ~3.4 s at ~1 fps); (3) the smoke rework needed the pressability bit (aria-disabled mirrors touchAdmitted — settled, transit-free, gesture/menu-free; the five-row snapshot cannot see the arrival window) AND seven rAF frames for the reduced-motion dwell (the loop's `Math.min(deltaMs, 100)` makes REDUCED_DWELL_MS 600 a SIX-FRAME drain at any fps: ≈0.1 s at 60 fps, ≈6 s at ~1 fps — the removed read chain cleared it by accident at ~1.3 s per CI read; the recorded CI deaths' MOVING failure point EXPLAINED). Both rows verified GREEN in the CI-representative environment (ZIMNY_SOFTWARE_GL=1 + the mac14 override): touch-rail 23–27 s · smoke keyboard walk 6.3 min / all 34 legs; commit 8273061 (tests only, no bundle change; tsc 0 · biome clean · vitest 1089/1). ENVIRONMENT FACT: this Mac's GPU path degraded since 11-10 (ReadPixels stalls → 0.3–3 fps; the smoke 900 s starves on it regardless of the spec) — the SwiftShader path is the honest local pre-CI check. THE STOPS MINI-ROUND (the parked product item un-parked by the owner): +1–2 walk stops per scene for Palace Square and Rastrelli Gallery — the count/placement/captions (en+ru) ride the Fable brief (the vault round folder `2026-11-12-hermitage-3d-ci-hardening/1-…stops-placement.md`; the reply OUT); the ledger reservation declared (JS ≤ +450 gz · RU ≤ +250, riding the proposed 285,707 ceiling — the owner's stop order rides the ratification); the test-pin surface (stops.test.ts pins, the smoke BEATS + leg lists, the mobile-plan --check regen) rides the integration; no DEC number guessed (the integrating authority assigns).

- 2026-11-12 · MERGED the records compaction (docs-only on the branch records-compaction · the merge to main pending the owner's signal) — no DEC · 21 batches (4–24), 90+ units → the round archives; the ROUNDS rows 1,140–10,966 B → 474–787 B; 31 DEC homes (25 + the six over-cap lines, the DEC-038 pair never merged); the ledger 29,185 → 6,994 B; STATE.md 17,695 B — no budget delta (docs-only, the tree's budgets byte-held) — the verifier's contract fixed (the rowNo form, the STATE-slice whitelist, the duplicate DEC-038 pair); the machine: records-apply + repair-reply + records-check — → the pin ff2a85ed19b41c2bda750dc1dd229e6409201daf (the displaced detail's home; no archive file)

- 2026-11-09 · MERGED square-palace (the FIRST slot of this merge wave · 7fa4892 merged into the lane at 2968ef0 · FULL e2e/golden gate + the square's dec-noon AND dec-night re-baselines ride the LAST merging session, deferred NOT waived · no e2e here) — DEC-041 class-I closure; DEC-043 assigned by this merge · P1 baseline 0.275 · P2 all-fresh 0.576 < 0.6 (the LIGHT bounds it) · snowSkyGain K = 1.5 — JS +69 (declared ≤ +400) → 284,110 of 350,000 · RU +7 → 7,339 of 12,000 · vitest 64 files 1057 passed / 1 skipped · tsc 0 — found/fixed: Sol 6.1 review RETRACTED the dec-noon-only flip reading (the 2a ground albedo moves at night too) — → docs/archive/2026-11-08-squarepalace.md

- 2026-11-09 · LANDED rg-f3 (slot n/r · PARALLEL · merged later as cb55702 · scope-local gates green; FULL e2e/golden gate DEFERRED) — no DEC; the eleven z=70 niche backs → DECLARED daylight panes (route B, no new geometry; M_PANE = 5; PANE_PAINT_RAW day (0.550,0.650,0.740) / dusk (0.360,0.400,0.460) / night 0, no ×1.14) — glb 252,312 B (+1,560) · payload 851,322/2,000,000 · textures 599,010/1,000,000 · tris 10,868 (10,856 prints were record errors) · draws 8 · JS 284,041 — 12 FAIL rows all retired-band, zero new-class (owner verdict 2026-11-09); LEVEL 84.1953 ∈ [55,90]; instruments rg-gates.py + rg-f3-capture.mjs committed as the REPLACEMENT — → docs/archive/2026-11-08-rgf3.md

- 2026-11-08 · MERGED arrows-face-tune (slot 1/3, the FIRST of three · ordinary code/records merge 5fc9a82 off branch head 25343fd · FULL e2e/golden gate rides the LAST merging session, deferred NOT waived) — DEC n/r · tsc 0 · biome clean · committed suite 1036 passed / 1 skipped (branch 62-file measure stands) — build 282,514 of 350,000, byte-equal to the finale's print (JS delta ≈ 0) · RU 7,332 byte-equal · budgets ok — found: in-tree 1042/1 on 64 files = two UNCOMMITTED gitignored scratch-probe files, one fails locally (probe25_analysis.test.ts), not the repo's — → docs/archive/2026-11-07-arrowsfacetuner25uxthearrowsfacetune.md

- 2026-11-08 · MERGED square-entry-ground (stack slot 2/3 of the three-session stack · the solo-merge ruling · FULL e2e/golden gate rides the LAST merging session, deferred NOT waived) — DEC-040 portrait witness (identity-by-reference ≥ 0.8657, yaw-only δ ≤ 12°) · DEC-041 paving/footprint, plane 600→2000 — JS +1,527 over main's 282,514 (the +2 = slot-1 arrows-face-tune constants) → 284,041 of 350,000 · RU 7,332 · vitest 64 files 1052 passed / 1 skipped · tsc 0 · biome clean — found/fixed: boot defect (?look= injection wiped by the language activation's re-seed) → applyInjectedLook() at three host sites; 7/7 declared deep-link frames byte-identical to their hashchange twins — → docs/archive/2026-11-07-squareentryground.md

- 2026-11-08 · LANDED rg-look (slot n/r · PARALLEL · merged 5c242e3 · scope-local gates green; full e2e/golden gate ran at the merge) — DEC-042 · k := 3 → 85.81 ∈ [55,90] · LM_RES 1536 · paint ×1.14 — JS 282,514 byte-equal · payload 854,491/2,000,000 · textures 603,739/1,000,000 · tris 10,868 (the 10,856 print was a record error) · draws 7/25 — found/fixed: the doorway double-cover class the old COVERED gate was blind to → canonical-coplanar COVERED + negative demos; DOOR/ORDER re-rated measured — → docs/archive/2026-11-07-rglook.md

- 2026-11-08 · OPEN rg-f3 (slot n/r · PARALLEL to the luna2 portfolio + square-palace sessions · branch rg-f3 off main 742bb3d; MERGE + FULL e2e/golden gate at the owner's notification, NOT this session; scope-local gates only · flipped: landed 2026-11-09, merged cb55702) — no DEC — budget n/r (no code at open) — facts-only relay: Fable 5.1 (no screenshots) pinpoints what the room lacks most, zero steering; briefs from 1 in vault projects v13 — → docs/archive/2026-11-08-rgf3.md

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
