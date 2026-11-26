# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Live state = Now + every lane not yet MERGED + the last 3 MERGED rounds (≤ 10 KB); a round's history lives in `docs/archive/<opened-date>-<lane>.md`, pointed to from its bullet and from docs/briefs/ROUNDS.md.

## Live state

### Now

Tree: main @ the sq-shadow-dirt landing (2026-11-26, main direct d88a141). Budgets (the tree's pnpm build && pnpm budget): JS 291,800/350,000 (+147) · RU 7,609/12,000 · jordan 1,783,733/7,000,000 (dir 1,777,597) · military-gallery 3,008,700/4,000,000 · rastrelli-gallery 1,189,246/2,000,000 (the dir bytes incl. the manifest) · basis 584,862/600,000 · square 107,902/1,500,000.
Lane MERGED: **sq-arch-day** (the merge = this commit; DEC-054: the Palace Square's FIRST cast shadows + the day look + the review's P1 batch + the owner's PICK — fill 4.5, the sun ≈ 4600 K, the dome knee 0.72; «PICK is fine»). The scope gates green ON THE BRANCH: validate ×2 (1284 tests), the census 15/15 (75–86 draws, ≤ 115,630 tris — the caps re-pinned 96/120,000), e2e square-kit 8/8 ×2, the goldens 17/17 (the 4 day rows re-baselined at the PICK; the night rows never moved). The FULL gate rides the LAST merging session → docs/archive/2026-11-24-sqarchday.md.
Owed, one item per line:
- the darwin golden battery — closes when: the next darwin gate run (the DEC-ready rows' numbers from that battery, never here) → docs/archive/2026-11-26-sqshadowdirt.md
- the jordan Mac-rebuild parity — closes when: the next Mac rebuild/verify session (pane UVs/sampler/orientation vs pane-neva.mjs) → docs/archive/2026-11-24-turncascade.md
- the axial photograph — closes when: the owner supplies the photos (the fixture FORM's sourced shapes) → docs/archive/2026-11-20-jordanfixtures.md
- the turn-cascade DEC-ready rows — closes when: the wave's LAST merging session's battery (the jordan scene-golden flips by design — the wall order is in every stop's frame — + the 3-row Mac re-baseline DEC; the numbers then, never here) → docs/archive/2026-11-24-turncascade.md
- the sqdirt acceptance-gate ingest — closes when: the ingest lands (astra's excess-field-speckle gate on the office box; the two-build composition, the watcher carries the numbers) → docs/archive/2026-11-26-sqshadowdirt.md

- 2026-11-26 · LANDED sq-shadow-dirt (main direct d88a141, solo-lane; the FULL gate rides the third (last) merging session — deferred NOT waived) — the owner's complaint: the facade's shadows in summer/autumn/spring read as dirt (worst in summer; winter clean) · the creative's row-set (brief 1) + the confirmation plates (i)/(ii) CONFIRMED, (iii) the magnitude contradicted → the review pass astra-6.2 pre-integration 6/10 (11 findings; the owner waived the creative ruling round-trip — the dispositions in the round's FINDINGS.md) → **DEC-055**: R1 the slope-scaled caster bias (the shared MeshDepthMaterial polygonOffset 1.4/4 as customDepthMaterial, the PartMeta law respected — the socle's opt-out intact), R3 the receiver bias −0.00003 (the dressings cast attached shadows), R2 the tier shadowMapSize t1 2048 / t2 4096, R4 the shadow strength min(1, 4·day), R6 the day-only ground albedo lerp (probe-gated), R5 the arch tunnels DEFERRED (astra's F3/F4: only the middle arch is open, the resident throat) · the goldens 16/17 (night/dusk byte-identical; jordan J4 day re-baselined by DEC: 9,896 px / 2 %) · the census 15/15 in caps · validate GREEN (1301 tests) · JS 291,800 (+147) · the sitting the owner's eye: «it looks good» · the acceptance gate (astra's excess-field-speckle metric) + e2e square-kit = the office box, the ingest pending → docs/archive/2026-11-26-sqshadowdirt.md
- 2026-11-24 · MERGED turn-cascade (the wave's FIRST merging session of three — the ff to main 36d9d15; the FULL gate + the DEC-ready goldens + the due re-baselines ride the LAST merging session — deferred NOT waived) — Task 1 the owner's redistribution ask: the climb's gazes pre-turn toward the chandelier's crown (J1 0→13% FLIGHT1_TURN [70.4, 8.1, −83.5]; J1b 23→36% FLIGHT2_TURN [76.4, 10.4, −82.6]; the swings 4.0/47.9/52.8° → 10.2/47.4/45.7°, stops.test.ts pins the rows; captions untouched) · Task 2 the room survey → the creative's pick (brief 1, Fable-class) = **slice 2b «the white-and-gold wall order»** LANDED: ONE wall_order mesh (12 panels + 12 porthole rings + the cornice's gilt fascia; 2 prims; +4,296 tris → 36,178 drawn, 47/60 draws), EXPORTED-NEVER-BAKED (the rg-f6 declared-host adoption; cells 3,372 ±0; NO re-bake — the lm/probe plates byte-held; the 3-row Mac re-baseline neva +9/plafond −60/glb −84 owner-accepted, the reference switch; the plafond-art input restored via the committed rasterizer) · the review pass astra-6.2 7/10: 16 findings — 14 fixed (the flank winding, the shipped-fixture clearance, the release pins), 1 deferred (the cell-ownership instrument) · validate GREEN ×2 (tsc 0 · biome · vitest 1,254 · budgets ok: payload dir 1,777,597 / row 1,783,733, JS 289,527, RU 7,609) → docs/archive/2026-11-24-turncascade.md
- 2026-11-23 · MERGED rg-f6 (the wave's LAST slot — the merge 5ecca9c + the FULL gate = this session's battery) — the east airlock set: the displaced doorcard twin + five borrowed faces (declared-host adoption, zero atlas cells) + the M_SHADE_AIRLOCK 0.85 8th shell slot + bounds max.x 47 (DEC-41 DEC-B) + three RU caption rewrites (DEC-41 recorded round-41/DECISION-41.md; the review pass astra-6.2 7/10, the findings fixed) · the plates BYTE-HELD ×3 (21070dfc/d4eec68c/27bb7c1e — no bake ran; the displaced-twin construction) · glb f8ea77dc 294,632 (+1,704; tris 12,550 = +10; the census 10 = shell 8 + sconce 2) · the battery 40/42 (the ONLY fails = the rg-audit-era signature rows J-A/J-C — the before dir carries the crease already; the instrument-class record) · the P5 depth read day +28.3 / dusk +20.2 / night +17.6 · the capture determinism ×2 identical · the FULL gate e2e 84/3 (55.4 min — the 3 = the machine-stall family: the touch-rail ×2 + the jordan hot-entry 240 s predicate timeout; the goldens skipped off-darwin; CI rides the push) · the Windows toolchain (Blender 4.2.23 LTS portable + toktx 4.4.2, both version-pinned) → docs/archive/2026-11-23-rgf6.md

## Standing protocol

**Read map (by moment; full reads only at wiring time).**
- Session start: AGENTS.md → docs/STATE.md (this file) → docs/budget-ledger.md before
  planning a round.
- Compose a brief or take a reply: docs/relay.md (the Relay loop and routing, the
  standing construction path, the transport traps, the brief boilerplate, the purity
  gate, the verified three facts).
- Gate run or merge: docs/ops.md (the budget gates, the ledger law, the quiet-machine
  and gate-run laws, the golden re-baseline law, the Windows sessions) — and update
  docs/budget-ledger.md at the merge.
- Past round: docs/briefs/ROUNDS.md (the row) → docs/archive/<date>-<lane>.md (the trail).
- Backlog and parked items: docs/parking-lot.md. The declarations live in the orchestrate
  repo (the split is a later step of the records-decision design).


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
creative session's own call; the round's clean trail lives in docs/archive/2026-11-03-rastrellidetails.md,
the vault texts (26/30/32/37-REPLY), and the pinned probe logs.

**Record law (this file owns it).** Caps: AGENTS.md 5,000 B · docs/STATE.md 10,000 B
whole · docs/relay.md 9,000 B · docs/ops.md 6,000 B · docs/budget-ledger.md 12,000 B · a
docs/briefs/ROUNDS.md row 1,000 B · docs/archive/ and docs/parking-lot.md uncapped. One
home per fact: the budget numbers live only in the ledger; the DEC numbers only in the
integrating authority's rows; a round's trail only in its archive file; a parked item
only in docs/parking-lot.md; the open reservations only in the ledger's open table. At
every lifecycle flip REWRITE the record to the flip's shape and MOVE the displaced text
into the round's `docs/archive/` file in the same commit — never append; an obligation
that outlives its bullet moves to Owed (with a closing event) or to docs/parking-lot.md
(without one) before the bullet leaves. Cite records by named anchor, never by line. A
cap breach is fixed by moving text, never by raising the cap. The records-check (every
`docs/…` pointer here resolves; no MERGED/RELEASED/SPENT tokens in Live; the caps hold)
gates the validate run.
