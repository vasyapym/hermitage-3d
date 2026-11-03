# Design — the environment handover (R24-ux)

The dark-on-entry bug fix. Relay: the orchestrator's own runtime measurement + code dossier
(vault `projects v10/19-…`) → the long-context specialist's fix design → orchestrator
integration on the parallel branch `roomload-mglight` (PARALLEL: merges by the owner's signal).
Date: 2026-11-03/04.

## §1 — THE DEFECT (owner-reported 2026-11-03, measured the same day)

Entering the Military Gallery of 1812 from Palace Square read light; entering from another
interior room read dark. Measured (fresh pages per configuration, the room's pinned golden noon,
built preview): fresh `#/1812` ≈ luminance 31 /100 with `scene.environment` bound; jordan →
1812 ≈ 15 with the environment NULL; gallery → jordan ≈ 65 vs fresh jordan ≈ 81. So the defect
hit EVERY interior→interior handover, not just 1812 — only the square-side path is immune
because `disposeFrom` never disposes a resident (DEC-013).

Mechanism (code-verified): every interior room's unmount called `scene.setEnvironment(null)`
UNCONDITIONALLY, but the FSM fires `dispose-from` (the unmount) one transit AFTER the hold —
and the destination room's mount publishes ITS probe DURING the hold (ADR-0013: PMREM once per
room load, inside the hold). The departing room therefore cleared the NEWCOMER'S slot (the
host scene has ONE environment slot), and nothing re-bound it: the kit's gilt (metallic, with
sun/hemisphere hidden indoors) collapsed to near-black. Exposure was 1.0 in every measured
row — exposure was never the variable.

## §2 — THE FIX LAW (ownership-checked release)

The destination keeps publishing inside the hold; the departing room's unmount binds NOTHING
and clears the slot ONLY if the slot still holds exactly the handle the departing MOUNT saved
(identity, not contents); it disposes its own saved resource REGARDLESS, and never early-returns
on the check's answer. Per-load handles are per-load facts: `pmrem.fromEquirectangular`
allocates a fresh RT per mount (verified), and the loaders' `disposeEnvironment(roomId)`
already targets the owner's own entry — disposal of the newcomer's resource was never possible;
the LAW keeps it that way (integration read: unchanged, the guard documented).

Rejected alternatives (the reply's own challenge record): «never clear on unmount» (the
standalone teardown and the square return DO owe a clear — the square installs no probe
today); «clear if an environment exists» (presence is not ownership); «dispose only when the
clear succeeded» (leaks A's RT after B replaced the slot); «dispose whatever the scene
references» (destroys the newcomer); «rebind B after disposing A» (a second publication that
conceals wrong ownership); «dispose A before mounting B» (violates the stated overlap and the
exit-only disposal law); «the cold golden passes» (no coverage unless the test crosses an
interior departure).

## §3 — INTEGRATION SHAPE

- `src/assets/environment-slot.ts` (NEW, pure): `clearEnvironmentIfOwned(slot, owned)` — the
  compare-and-clear; `releaseOwnedEnvironment(facade, owned, disposeResource)` — clear (if
  owned) then dispose, one tested place. Generic over any `T` (identity works for any handle
  value; the null owned check is explicit).
- `src/world/registry.ts::RoomScene`: the facade gains `clearEnvironmentIfCurrent(handle):
  boolean`; `src/main.ts` implements it over the real scene through the primitive (exact
  identity of what the setter assigns).
- `rooms/rastrelli-gallery/room.ts`, `rooms/jordan/room.ts`, `rooms/1812/room.ts`: each mount
  saves `envHandle = env` after the hold-time `setEnvironment`; each unmount calls
  `releaseOwnedEnvironment(ctx.scene, envHandle, () => ctx.assets.disposeEnvironment(contract.id))`
  then nulls its handle — identical shape in all three (1812's unbaked canary branch rides the
  helper's null case). NO changes to applySwap/disposeFrom/airlock/registry lifecycle,
  the FSM, the black-swap-frame guarantee, the hold laws, DEC-013's resident immunity.
- Dev readout retained under a committed name: the earlier SUB-BISECT `__zimnyDebug` (a
  temporary instrument that had in fact been "removed before commit" only in intent — it was
  still in the tree) is now the dev/test-only `environmentPresent()` readout, exactly what the
  regression row asserts. No per-frame diagnostic work; no debug hook in production paths.

## §4 — TESTS

- `tests/environment-slot.test.ts`: the identity rows (the matching owner clears and returns
  true; a replaced slot survives and returns false; contents-equal objects are NOT
  interchangeable; a null owned handle never clears presence; a repeated release cannot clear a
  later replacement; the release law clears-when-owned-else-leaves with the disposal ALWAYS
  exactly once) + the module's own purity fence.
- `tests/environment-lifecycle.test.ts`: the scope doubles that mirror the room law verbatim
  (per-load handles): B binds before A unmounts → B stays bound, A's RT dies exactly once; the
  slot nulls BEFORE the disposer runs; A→B→A re-entry loads distinct handles; the
  gallery→jordan pair; the interior→square return under the null-activation policy.
- e2e `tests/e2e/environment-handover.spec.ts` (allowlisted): jordan→1812 and gallery→jordan
  structural rows (`environmentPresent()` true after the departure — the R24-ux regression), the
  two hot/cold luminance FENCES at the pinned noon instant AND pose (`?stop=M0`/`J0`, fresh page
  per pair, 0.85–1.15 — the pre-fix pair measured ≈0.49 / ≈0.80), and the interior→square row
  pinning the square's own NO-PROBE policy (the slot returns to null — the current activation
  behavior, recorded as-is; whether the square SHOULD carry a probe is the capture-day question
  parked below).
- Existing airlock/ledger/golden contracts unchanged. No golden bytes move (the goldens enter
  by deep links only; the luminance fence is numeric, not a golden).

## §5 — PARKED (owner calls / future captures)

- The square's return environment policy is UNMEASURED as a look: the row pins the current
  no-probe behavior; if a capture day shows the square missing IBL ambience after handovers,
  the repair is a rebind from the resident's authoritative handle in `applySwap('square')` — a
  named activation omission, NOT preserving the departing interior's probe.
- Overlap visibility during a handover (the departing room's meshes lit by the newcomer's
  environment for the exit frames) is the EXISTING policy — unchanged; a transitional capture
  should confirm no newly exposed stale/missing-IBL frame appears.
- The unequal dark reads (1812 −51%, jordan −20%) and the dark-state vault mosaic's material
  cause remain unproven; no compensation with exposure/lights/bakes/goldens is allowed.

## §7 — THE FIX VERIFIED AT RUNTIME (2026-11-04, hand-run probe, built preview)

Same probe as the defect dossier (fresh pages, the pinned golden noon, gitignored `probes/
mg-dark-probe.mjs`, storm-stretched 240 s settles): fresh `#/1812` meanY 31.03 / env bound;
jordan→1812 (THE defect's path) meanY **31.04** / env **bound** — ratio 1.0003 vs cold; fresh
`#/jordan` 81.39; gallery→jordan meanY **81.39** env bound — ratio 1.0000. The hot entries are
now numerically identical to the cold twins on both pairs. The formal e2e battery (the two new
spec files' rows + smoke) rides the quiet machine / the parallel stack finale — the first
attempts under the parallel bpy bake could not settle (a ~68 s cold-settle stretch measured);
the probe above is the round's runtime verdict until that window.
- The dev-only `?hud=1`-less sessions: the row reads `__zimnyDebug.environmentPresent()` which
  exists in every build (a dev-only GTM-free closure; documented; cheap).

## §6 — COSTS

Measured with the load-line round combined: JS gzip 280,144 → 281,474 of 350,000; RU chunk
unchanged (7,332 of 12,000, no new strings this round); no payload/texture bytes; +0 draws/tris.
The full gate (e2e/goldens) runs at the parallel stack finale per the standing convention — the
branch's targeted battery green at the round's close.
