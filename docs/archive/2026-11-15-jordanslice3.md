# jordan-slice-3 — the Jordan Staircase's next visual round (slice 2c «the hour reads before the walls are dressed»)
Opened 2026-11-15 · Landed 2026-11-15 · Merged n/r (n/r) · slot n/r · briefs 1–3 · vault projects n/r (03_projects/hermitage-3d-2026-11-15/) · DEC-ids n/r
## Ask
The owner's directive: investigate the room's current state, hand the creative model the fact pack, and let it pinpoint what is missing or lacking the most. The selected slice then runs decision → implementation docs as separate briefs (the RG-F3 round-opening shape).
The round opened PARALLEL to the luna2 portfolio session's in-flight track, observed in flight at the round's opening. The lane worked only inside its own worktree ~/Documents/hermitage-3d-jordan3, branch jordan-slice-3 off main a32b70c.
The merge into main and the FULL e2e/golden gate were first set to ride the owner's notification that the parallel work was done, not the opening session. At landing they ride the owner's directive in this session, the last merging session of the wave. Only SCOPE-LOCAL gates ran: the bpy/bake/encode chain as needed, pnpm validate, and the jordan capture battery.
## Relay shape

Brief 1, CREATIVE Fable 5.1, text-only: the FACTS-ONLY FIND dossier, with ZERO STEERING (the specialist decides the slice).

It carried the census (geometry / materials / light / assets+budgets / gates), the 13-frame capture battery (7 stops × day + J0/J2b/J4 × dusk/night on the branch tree), the record trail (slice 1 + slice 2 + what they parked), the register's jordan rows, and the repair-cascade standing situation with its own numbers.
It ranked the room under-separated by hour, over-clipped, and chip-blown.
The owner ratified slice 2c IN FULL (the FIND's items 1–3: the dusk≈night separation, the day's value band, the warm chips). The 2b wall articulation was named the next slice.


Brief 2, CREATIVE Fable 5.1: the value-table draw.
Brief 3, CREATIVE Fable 5.1: the dusk-correction draw. Rev 2 was adopted over rev 1.
Integration: FOUR measured iterations (the scale fix and the sky recalibrations).

## Verdicts
No DEC number exists for this round. The row records the DEC-ready decision as parked for the integrating authority, so the DEC is n/r and none is invented.
Verdicts on record:

Slice 2c ratified in full by the owner.
Dusk-correction rev 2 adopted over rev 1 (rev 1 rejected).
The drawn day-sun 3.5 cut reverted by the capture read (sun unchanged at 4.0).
The first dusk sky draw of 0.8 rejected: it lit the whole body, because the dome is omnidirectional. Sky 0.30 taken.

By-construction claim: the dusk mid-wall median reads near-neutral by construction. The window-zone B−R split reads on the pane and chips.
The deliverable:

Per-state encode bands (declared by the round):

day [0.2,0.45] W 0.45
dusk [0.35,0.45] W 0.35
night [4.0,4.5] W 4.0
gains 2.22 / 2.86 / 0.25, κ = 1 everywhere


Day sky 1.0 → 4.0.
Dusk rig ×0.1 of 1,600 W (the parked knob taken), with sky 0.30.
Chips normalized to authored 1.0 (the tint survives the clip). Bake-side dusk chips are 0.1 absolute; runtime scales are 0 / 0.5 / 1.
Pane dark-glass, base colour (0.02, 0.02, 0.025): the night pane is the darkest surface.
Environment probe re-rendered (dusk / scaled-rig).

## Measured
At open (2026-11-15):

Shared JS 285,631 of 350,000, 76 B under the proposed 285,707 operating ceiling. A shared-JS spend was effectively blocked without an owner call.
Room budgets: payload 1,237,543 of 7,000,000 · textures 996,068 of 4,000,000 · tris 21,872 of 380,000 · draws 19 of 60 · decode-cells 3,250 of 4,096.

At landing (2026-11-15), census on the three fresh ktx2s (measured):

day p50 118.3 · p90 195.8 · near-white 1.58 %
dusk p50 72.5 ∈ [70, 90] · p90 122.9 · near-white 0.13 %
night p50 40.1 · p90 94.1 · near-white 0.08 %
Nothing clips, the pools keep the lamp tint, the walls fall off.

At landing, validate GREEN:

tsc 0 · biome clean · vitest 1121/1 on 63 files · build · budgets ok.
JS 285,629 = −2 of the ≤ +0 declared. The dusk gain 1 → 2.86 cost +3, clawed back by the jordan-row shortenings.
Jordan payload 1,190,510 of 7,000,000.

Capture battery, 15 frames, plus pixel-grid reads:

Day reads with real modulation: the walls' mean is −10 % vs the committed (the contrast arriving; the eye-verdict is better). Stairs and sun patches are brighter, the patches white-hot.
Dusk reads evening: warm lamps and cool windows.
Night reads night: dark walls, pools, dark glass panes.
The hour ladder day > dusk > night holds at the paired cells.

The bakes: day ×2 · dusk ×4 · night ×1 (the scale fix and the sky recalibrations, all under caffeinate); the probe ×3.
## Hunt / found / fixed

bake.py's RIG_STATE_SCALE was a GATE, not a multiplier. The parked knob was not exercisable (the committed 0/1/1 masked it). 2c made it a multiplier; day and night are byte-identical through the fix.
The committed day plate's top was BINARY: 0.0 % of texels at stored 152–247 (the clip census's smoking gun). The fresh plate has 33 %.
The ETC1S q128 dark-median loss measured −22 (the dry-row → ktx2 delta the gates must carry).
The emissive gate reads the glTF default at strength 1.0 (the exporter omits the extension at the default).

## Gates

Passed (scope-local): census, validate, and the 15-frame battery with pixel-grid reads (see Measured).
Deferred-not-waived → carried by the owner's directive, this session (the last merging session of the wave): the MERGE into main and the FULL e2e/golden gate.

Expected golden flips: the three jordan J4 frames (day/dusk/night) re-baseline at the finale, plus rg-f4's golden-gallery-{day,dusk} and square-palace-2's dec-noon.


Owed:

the license row «Jordan light states (slice 2c)»
the ledger rows (the shared lines, the jordan room row, the update log)
the DEC number, parked for the integrating authority


PARKED:

wall articulation (2b, the next slice)
fixture FORM (E, the axial photograph)
plafond (3)
rosettes (4)
the probe's day-state residual: the day envMapIntensity 1.0 samples the dusk-lit probe, the ADR-0013 class, re-worded


The sibling slice's archive (docs/archive/2026-11-03-jordanslice2thestairhallslightfinishslice.md) is untouched.

## Mentioned elsewhere
From the budget ledger's jordan row (the 2c landing): the day plate grew to 358,260 with the modulation's bits — the three lm ktx2s re-encoded at the hour bands.

None in this batch's excerpts.
## Sources

docs/briefs/ROUNDS.md · row 10 (PARALLEL → LANDED) · line 10 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · jordan-slice-3 LANDED bullet · lines 73–113 @ de58d5206909e308e33a089bd0227bbbc85a2278
docs/STATE.md · jordan-slice-3 OPEN bullet · lines 114–132 @ de58d5206909e308e33a089bd0227bbbc85a2278
