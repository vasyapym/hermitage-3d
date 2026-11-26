# sq-shadow-dirt — the Palace facade's «dirt» shadows fixed (opened 2026-11-26)

The round's task (the owner, 2026-11-26, the solo lane, verbatim): «Palace facade shadows in the
summer, autumn, and spring seasons look like a dirt. Especially it is prominent in summer. I
haven't noticed it in winter. Fix this with creative model + other improvements on the
light/shadows of the Palace Square. Decisions should be on creative model's side — we trust its
rationale and taste». The references: IMG_0047–49 (828×1792 iPhone captures, copied to the session
folder's `reference-images/`). The wave-law question rode the round: the third parallel lane had
not merged, and the owner's «do all now» (2026-11-26) put the FULL gate on THIS session; later the
same day the owner amended it back — the FULL gate stays with the third (last) merging session,
this round carries the scope gates only, deferred NOT waived. All shadow/light decisions belong to
the creative; the orchestrator gathers evidence, prices nothing, integrates the picks.

## The flow

1. **The pickup**: the complaint above, the three reference frames, and the wave-law flip recorded
   both ways (see the opening). The round's trail lives in the vault folder
   `03-1_projects/hermitage-3d-2026-11-26-sq-shadow-dirt/` — briefs 1–3, the probes, the sitting.
2. **The find**: the description sub-agent's frame prose (the dirt is fine dark speckle bound to
   the relief — soft-edged «spray» halos around the surrounds, collars by the arches, murky clouds
   on spring's shaded fields — never reading as an honest geometric shadow; the autumn
   arch-interior gradient reads stepped, like shadow-map banding; the pattern is world-fixed and
   magnifies on approach) + the probe battery: the census baseline 15/15 (june-noon-S0: 84 draws /
   115,294 tris), the seasonal equinox plates + the owner-instant plates, the band quartiles per
   instant (dec-noon 0.404, june 0.318, autumn-eq 0.389, spring-eq 0.435; the owner's summer
   0.352 / spring 0.270 / autumn 0.365), and the A/B at june-noon-S0: mapSize 1024→2048 = 25,829 px
   (2.80 %) of diff, normalBias 0.05→0.1 = 8,678 px with +6.75 luma — plus the mechanism fact that
   the effective mapSize lever lives at the T1 row of `src/engine/tier.ts:54` (settleTier re-arms
   it at boot), not in main.ts.
3. **Brief 1 → the creative's row-set** (round-1/replies/1-sqdirt-reply.md): the mechanism read —
   the 25.4 cm texel (260 m / 1024) + the constant-only bias pair; false shadow when
   texel·tan θ·(1…1.4) beats the allowance → acne from θ ≳ 40° (axis taps) / ≳ 33° (diagonal) at
   1024²; winter's cleanliness is geometric (θ ≤ 32° all day), not a sky/fill accident; the same
   bias eats the honest shadows (june a piece must stand > 0.49 m proud to cast — the surrounds
   ≤ 0.32 m never cast). The rows: R1 the slope-scaled caster bias (one shared MeshDepthMaterial,
   polygonOffset 1.4/4, as customDepthMaterial) / R2 the tier shadowMapSize / R3 the receiver bias
   −0.0001 → −0.00003 / R4 the shadow strength min(1, 4·day) / R5 the arch tunnels / R6 the
   day-only ground albedo lerp. The stop rule: «any plate contradicting this read stops
   integration» and comes back. The acceptance instrument: a speckle index over the clean-wall
   band, ≥ 70 % drop at the three owner instants, no rise at dec noon. The sitting packet: 4
   frames, one question each.
4. **The three confirmation plates** at the owner's summer instant (probes/2-appendix-a.md, tree
   clean at 2b3860b): (i) `intensity=0` — **CONFIRM**, the dirt is shadow-borne (index 26.48 ≈ the
   dec-noon clean class 26.27); (ii) `bias=−0.0005` — **CONFIRM on mechanism, finding on
   magnitude**: 88 % of the dirt-Δ removed against the December control, 71.4 % against the
   same-summer shadow-off control; (iii) `radius=0` — **CONTRADICTS the far-tap magnitude**: −20 %
   raw field-only (7.80 → 6.24), 89 % of the same-summer excess, not the predicted ≈ 50 % halving
   → integration stopped per the creative's rule.
5. **The owner's second opinion**: astra-6.2 reviewed the proposed row-set pre-integration
   (brief 2) — 11 findings (5 breaks, 6 survivable), a replacement acceptance metric (the
   excess-field-speckle gate: B/O/C captures × the four instants, a frozen edge-cleared green-wall
   mask, ε, the 30 % retention rule), verdict **6/10**. The orchestrator confirmed against the
   code: F2 (the honour loop sets `castShadow = true` unconditionally — the traverse switch would
   flip the socle's authored opt-out), F3 (`openGroundArch` opens the middle instance only; the
   gate is 30 m deep, not 24) and F10 (the dec-noon readout is 0.9053 — the winter leak 9.47 %,
   not 22 %). The dispositions ledger: round-1/FINDINGS.md.
6. **The ruling**: the owner waived the creative ruling round-trip — Brief 3 was composed, then
   withdrawn with the owner's word. The ruling stands as the dispositions imply: R1–R4 + R6
   integrate with astra's mechanics; R5 defers.
7. **The integration** (the sub-agent's report): eight code files — `src/world/shadow-depth.ts`
   (new), `src/engine/tier.ts` (t1 2048 / t2 4096 / t0 1024), `src/main.ts`, 
   `src/procedural/facade-builder.ts`, `src/sky/fill.ts`, plus the tier/sun-stack/shadow-depth
   tests — with the J4 golden re-baseline and the new acceptance instrument
   `tools/probes/sq-accept-gate.mjs` (725 lines). The F10 comment corrected in code (9.47 %, not
   22 %); the R6 row lands probe-gated (the ratio test + immutable endpoints per F11). Validate
   GREEN: 73 files, 1301 tests + 2 skipped, tsc 0, biome 0.
8. **The gates**: the goldens' first run lost twice — the tree's Playwright 1.64.1 wanted
   `chromium_headless_shell-1248`, which the local cache lacked, and the standing mac14 host
   override then pulled an x64 build onto the arm64 Mac; the fix: install the browser and run with
   NO override — both recorded here. The verdict **16/17**: night/dusk byte-identical (the sacred
   identity held); jordan J4 day flipped 9,896 px / 2 % (the 2048 window-shadow edges) →
   re-baselined, scoped by DEC-055; the square's day rows pass sub-threshold (the speckle-scale
   changes below the golden threshold). The census 15/15 (draws 75–86, tris 111,834–115,630 — the
   caps 96/120,000 hold). Budget JS 291,800/350,000 (+147), RU +0.
9. **The acceptance gate + e2e square-kit = the office box** (agent-jobs): two failed filings —
   the box's hermitage-3d clone never existed (declarations §3.3: «First clone pending»), then the
   agent2 dir stale — after which the layout probe was filed. The job's shape: the two-build
   composition, the B/O legs on 2b3860b and the C leg on d88a141. The ingest pending at this
   file's writing.
10. **The sitting**: the S0 static before/after pairs on the sitting page (the four seasonal
    frames, the creative's one question each) + the live-app walk after the owner's word that the
    static pairs sit too far from the wall. The owner's verdict: **«it looks good»**.

## The gates at the close (DEC-055, 2026-11-26, main direct d88a141)

- Validate GREEN (1301 tests + 2 skipped; tsc 0, biome 0); the census 15/15 in caps; the budget
  JS 291,800 (+147).
- The goldens 16/17 — night/dusk byte-identical; jordan J4 day re-baselined by the DEC (9,896 px /
  2 %); the square's day rows sub-threshold, the display verdict belonging to the sitting.
- The sitting: the owner's eye, «it looks good».
- e2e square-kit + the acceptance gate ride the office box; the FULL gate rides the third (last)
  merging session — deferred NOT waived.

## Owed / the successor list

- R5 the arch tunnels (astra's F3/F4 geometry facts: only the middle arch is open, the gate 30 m
  deep, the resident throat must survive — the real openings/returns pricing at the successor
  creative touch).
- The iPhone tier t0 (F8): the owner's iPhone settles t0 → 1024; R1 covers its acne, the relief
  smear stays coarse — the mapSize row for t0 is the successor creative's call.
- The acceptance-gate ingest (astra's excess-field-speckle gate on the office box — the two-build
  composition, the watcher carries the numbers).
- F6/F7's frame-judged candidates: the polygon-offset factor 1.4 and the relief thresholds stay
  candidates, not guarantees — the spring oblique fields + the autumn contacts decide; any factor
  change returns to the creative.
- The metric restates' calibration against a reference build (the sq-arch-day carry-over).
