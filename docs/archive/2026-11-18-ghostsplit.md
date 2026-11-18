# jordan-ghost-split — the per-pier lm split of the north pilaster group
Opened 2026-11-18 · branch jordan-ghost-split off main e3f10c9 · PARALLEL, worktree · no DEC yet · lane OPEN (pending → this page)
## The sighting
The owner's IMG_4689: pale halo squares at one height on the north piers of the jordan room at night. Mechanism: the 79.0 sconce's rig halo was baked into the SHARED `pilaster_n` lm cells (one representative across all 7 north piers); six of seven piers are fixture-less, so the halo read as «the shadow/glow of a lamp which doesn't exist». The owner WITHDREW the earlier «owner-accepted» and ratified the per-pier lm split (the F1 pattern, jordan-bands 2026-11-17).
## The fix (ratified)
`pilaster_n` → `pilaster_n0..n6` — one template datablock PER PIER (pier index from `PIER_X.index(x)`; PILASTER_NORTH_X == PIER_X). South/east stay per-wall; the bases unchanged. No fixture forms, no halo paint-down (declined).
## Implementation pointers
- tools/bpy/jordan.py: runners (7 north entries at the old `pilaster_n` slot), the stash list, the per-pier placement branch, the summary N sum, LM_CELLS.
- Cells: pilaster = 24 faces; 7 north datablocks = 168 (was 24) → 3,230 + 144 = **3,374** ≤ warn 3,400 (the TIGHT CAP — an overflow STOPS the lane, the cap is not the lane's to raise), max 4096.
- The bake chain (the 3-state re-bake + the lm re-encode) and the gates are the NEXT agent's: tools/bpy/bake.py, tools/gltf/*, src/** untouched.
## Protocol
The reservation row lives in docs/budget-ledger.md (top of «Open reservations»); the round row in docs/briefs/ROUNDS.md; the STATE bullet in docs/STATE.md. The FULL e2e/golden battery rides THIS lane's merge (the wave's last merger).
