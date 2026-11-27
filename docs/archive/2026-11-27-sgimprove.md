# The sg-improve trail — the improvement iteration of St George's Hall (2026-11-27)

Lane: branch `sg-improve-lane` off main 3ab6aab, PARALLEL per the owner; merged to main
(the branch tip eaa0bff; the merge commit carries the records composition). The FULL gate + the
CI verdict ride the wave's LAST merging session — deferred NOT waived. Briefs 42 (the plan) and
43 (the review) + the replies: the vault 03-1_projects/hermitage-3d-2026-11-26-new-room/round-4/
(FINDINGS.md carries the round's record + the review ledger; DECISION-1.md carries amendment 12
and the a10 rewrite).

## The task (the owner's words, verbatim)

«Do the improvement iteration of the room - let the creative model decide what to improve and
how, etc. on this round - we trust its rationale and taste.»

## The slices (brief 42, the creative's own selection; three of seven classes — the record's
steps 5–6, Ruling 4 and the aperture cut stay parked)

1. **The gilt quartet as semi-metals in three registers + the marble sheen** (MATERIAL_ROWS):
   the four gilt slots were metallic 1.0 — zero diffuse under a lightmap-fed term, black bake
   cells; re-rowed as capitals (0.900,0.690,0.300) r0.40 m0.60 / balcony (0.800,0.600,0.260)
   r0.50 m0.50 / throne (0.950,0.740,0.320) r0.30 m0.65 / ornament-gilt r0.45 m0.15 (the base
   inert — the plate is the colour authority); column-marble (0.850,0.860,0.870) r0.30, wall
   r0.40. The glb determinism ×2 byte-held (e9f29538), tris/draws unchanged.
2. **The dusk amber key** via the a10 pane lever: dusk (0.980,0.620,0.340) × 3.0 — the emitter's
   Rec.709 luminance held by construction (2.035 vs 2.078); the atlas pair is hue evidence
   (R/B 3.64 vs 1.60), the room's dusk brightness is the golden sitting's call.
3. **The parquet sixteen-woods gate: PASS** — the six fills' CIE L* spread 60.5 ≥ 30, adjacent
   gaps ≥ 5; no re-palette; the plates re-encoded (palette unchanged, the win-toktx bytes).

## The white-point remedy (the brief's risk-b path, corrected by the review's R1)

The lit gilt raised the peaks past the committed white points (clipped 0.23–0.64 %). The white
points lifted to day 2.3 / dusk 0.51 / night 0.15 (bake.py + the gltf descriptor together — the
lightmapsRow agreement gate) as ENCODE headroom; the gains stay the committed 2/2/2 (the
rendered light is bake × gain — the daylight genuinely rose with the gilt lit). Re-baked ×3:
clipped 0, the published ktx2 byte-held every run.

## The review pass (astra 6.2, brief 43, 7/10)

10 findings — 4 breaking fixed (the gains restored; the bake agreement gate moved BEFORE
publish — the incremental-rebake hazard; the lane fence's base resolved after the head guard,
failing loud; the fence triggers only on a lane touching the hall's own content surface), 4
survivable reworded in the records, 1 declined (the register ordering in the diffuse term —
the fact stands, no records claim broken; the sitting arbitrates), 1 nicer fixed with the
rest. The full ledger: the vault round-4/FINDINGS.md.

## Displaced bytes (this merge's compositions)

The ROUNDS row as it stood LANDED-PARALLEL (replaced by the MERGED row in the same commit):

```
| **sg-improve** · LANDED-PARALLEL (branch sg-improve-lane @ 74ed113; merge + the FULL gate ride the owner's signal; the sitting verdict pending — the owner's eye) | 2026-11-27 | the improvement iteration of the room; every look decision the creative's (brief 42) | S1 the gilt quartet as semi-metals in three registers + the marble sheen (glb ×2 e9f29538; tris/draws unchanged) · S2 the dusk amber via the pane dial — the emitter luminance held by construction; the room's dusk brightness is the sitting's call · S3 the parquet palette gate PASS (L* spread 60.5); palette unchanged, the plates re-encoded · the white points 2.3/0.51/0.15 as encode headroom, the gains unchanged 2/2/2 (the daylight rose with the gilt lit), clipped 0 · the review: 10 findings — 4 fixed, the records reworded, 1 declined, 1 nicer (7/10) · vitest 1350/77 · budget 293,779 (+0) | branch sg-improve-lane off main 3ab6aab · briefs 42–43 (the vault) · → round-4 (the vault) |
```

The reservation row (released at the merge; the measured JS +0):

```
| sg-improve-lane | JS +0 measured (the reservation ≤ +8 B unused — the gains return to the committed 2/2/2 per the review's exposure fix) · RU +0 · the st-george room rows regenerate in place (no new texture rows) | open |
```

The sq-t0-residue merge's fence retirement (displaced by the scoped-fence composition — the
disagreement goes to the owner unresolved):

```ts
    // Retired on main AND on any lane carrying the st-george merge 99b8dd4: the merge
    // happened, the integrating authority owns the tree (the fence's own law, faafbd0) —
    // past the merge the d38cec0 diff is main's history, not a scope question a new lane
    // may answer. A branch still living on the pre-merge base stays guarded.
    let carriesMerge = false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', '99b8dd4', 'HEAD'], {
        cwd: ROOT,
        stdio: 'ignore',
      });
      carriesMerge = true;
    } catch {
      carriesMerge = false;
    }
    if (head === 'main' || carriesMerge) {
      // retired: the merge happened, the integrating authority owns the tree (the fence's
      // own law) — the lane's cumulative diff is main's history now.
      return;
```

The composition's rationale: the retirement's stated reason («the d38cec0 diff is main's
history») dissolves once the fence's base is each branch's own merge-base — and the retirement
would leave the record's own NEXT lanes (step 5 the heroes, step 6 the goldens — both hall
lanes) unfenced. The scoped fence keeps the protection for the lanes it protects and leaves
every other lane untriggered. The owner may reverse this flip at the next merge.
