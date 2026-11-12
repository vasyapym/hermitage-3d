# R24-ux the environment handover — the dark-on-entry fix
Opened n/r · Landed n/r · Merged 2026-11-05 (n/r) · date cell 2026-11-03/04 · slot 1/4 of four · brief 19 · vault projects v n/r · DEC-ids: none owned (DEC-039 + design-environment-handover.md referenced)
## Ask
The owner's bug: the Military Gallery of 1812 reads light entering from Palace Square and DARK from every other room.
## Relay shape

Same-day measurement on the built preview (fresh pages per config, the pinned golden noon).
CREATIVE relay, brief 19: the facts dossier + the specialist's fix design.
Code-verified mechanism; hand probe of the fix (design-environment-handover.md §7).

## Verdicts
THE LAW (no DEC owned; DEC-039 + design-environment-handover.md): ownership-checked release — the room saves the handle ITS mount created; the unmount clears the slot ONLY on exact identity (contents-equal objects are not ownership), then disposes the own saved resource REGARDLESS (never early-returning; the loaders' per-room disposal verified already owner-keyed). NO change to the FSM/applySwap/scheduling.
## Measured

Before (same-day, built preview): fresh #/1812 meanY 31 with scene.environment bound; jordan→1812 meanY 15 with the slot NULL; gallery→jordan meanY 65 vs fresh 81; exposure 1.0 on every row (never the variable). Every interior→interior handover is affected; only the square path is immune (residents are never disposed, DEC-013).
After (hand probe): jordan→1812 meanY 31.04 vs fresh cold 31.03 (ratio 1.0003, env bound); gallery→jordan meanY 81.39 vs fresh 81.39 (ratio 1.0000) — the hot entries EQUAL the cold twins.
Pre-fix e2e luminance pairs read ≈0.49/≈0.80; the committed fences are 0.85–1.15.
Branch: vitest 1014/1/0, build 281,474 gzip of 350,000 (+1,330 for both parallel rounds combined); at merge HEAD: build 281,504/350,000, RU 7,332/12,000, tsc 0, biome 189.

## Hunt / found / fixed

Mechanism (code-verified): the unmounts cleared the shared slot unconditionally while the FSM disposes the departing room AFTER the hold, and the destination's mount publishes its PMREM probe INSIDE the hold (ADR-0013) — the newcomer's handle was wiped; the gilt kit (metallic, sun/hemi hidden indoors) collapsed near-black.
Fixed: src/assets/environment-slot.ts (pure: the compare-and-clear + the facade release law); RoomScene.clearEnvironmentIfCurrent (the facade method over the real scene); the three room modules' identical unmount shape (per-load envHandle; 1812's unbaked canary rides the null case).
The SUB-BISECT debug leftover re-committed as the dev/test-only __zimnyDebug.environmentPresent() readout.
Tests: the identity/release rows + the scope-lifecycle mocks (per-load distinct handles; slot-null-before-dispose) + the purity fence; the COMMITTED e2e regression (jordan→1812, gallery→jordan structural rows; the hot/cold luminance fences at the pinned noon AND pose via ?stop=M0/J0); the interior→square row pins the square's CURRENT no-probe policy as-is.

## Gates

The e2e battery rides the quiet machine / the stack finale; the storm-stretched e2e attempts under the parallel bpy bake could not settle (~68 s cold-settle stretch) and were deferred NOT waived.
MERGED 2026-11-05 (stack slot 1/4 of four): deterministic gates green on the HEAD; targeted e2e handover 5/5 + load-line 2/2 + smoke 14/15 — the keyboard-walk row DEFERRED NOT WAIVED (storm-class reds ×3; single-row split main-green/branch-red; the delegated probes + the bisect exonerate the ownership law — the machine's per-leg class is the bound); the walkbisect worktree removed.
Branch roomload-mglight (PARALLEL row 69).

## Mentioned elsewhere
none at the pin
## Sources

docs/briefs/ROUNDS.md · row R24-ux the environment handover (roundNo 18) · line 18 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
