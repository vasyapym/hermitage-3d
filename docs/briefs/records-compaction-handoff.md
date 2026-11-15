# HANDOFF — the records-compaction lane (read this first, fresh session)

The lane compacts the project's records per the RATIFIED ruling (`probes/records-phase0/ruling.md`;
the owner ratified the shapes/caps as written + Batch D in + the chatter cut + the records-check
CI warning stage). The relay specialist is now **Sonnet 5.5** (Sol 6.1 hit its query limit); briefs
go ONE BY ONE. Everything below is on disk — do not re-derive.

## Where you are

- Worktree `/Users/vasilij/Documents/hermitage-3d-records`, branch `records-compaction` (pushed; HEAD `ff2a85e` = batch 6). The pin = `438c3a3` (main's head when the lane froze; the four pinned record files are snapshotted at `probes/records-phase0/pin/`).
- DONE (integrated, verified, committed): batch 4 (pilot: rounds 2/27/project-course + DEC-021…030), batch 5 (rounds 1, 3–8 + DEC-009/010), batch 6 (rounds 9–12 + DEC-011) — **14 rows + 13 DEC bodies done; 14 archive files exist** under `docs/archive/`. A deputy subagent was cancelled BEFORE any batch-7 work (verified: no replies, no dirty tree) — you start cleanly at batch 7.
- The machinery (all in `probes/records-phase0/`, gitignored): `executor-law.md` (the standing law — READ IT FIRST), `batches/batch7..30.md` + `batchN-cfg.json` (the ALREADY-BUILT batch files: resolved rows by physical rowNo, verbatim source slices, constants, owned DECs, window STATE-bullet ranges), `records-apply.mjs` (the apply+§4-verify gate; idempotent), `records-batch-brief.mjs` (the brief builder), `records-phase0.mjs` + `inventory.json` (the inventory), `replies/` (the three integrated replies as receipts), `state-bullets/` (empty; collects the window STATE-BULLET blocks), `progress.md` (append per batch).

## The relay protocol (one batch at a time)

1. For batch N: copy `probes/records-phase0/batches/batchN.md` to the owner's vault as the numbered brief (`/Users/vasilij/Documents/vasyapym-Vault/02_projects/projects v13/N-hermitage-3d-records-batchN.md`; briefs 1–6 exist — batch 7's vault copy is STALE, refresh it from the probes file; 8–30 are new). The owner pastes it to Sonnet 5.5.
2. Prepend the ROLE header when composing the paste (from `executor-law.md`: the engineering-peer executor frame + «reply in chat only, staged; end with the sentinel COMPLETE»).
3. The reply comes back: save it VERBATIM to `probes/records-phase0/replies/batchN.md` (the apply script auto-reflows collapsed one-line pastes — a transport habit of relay pastes).
4. Run `node probes/records-apply.mjs probes/records-phase0/replies/batchN.md probes/records-phase0/batches/batchN-cfg.json`.
   - VERIFY PASS → commit EXACTLY `docs/archive docs/briefs/ROUNDS.md docs/decisions.md` («RECORDS: batch N integrated …»); push the branch periodically (never main).
   - VERIFY FAIL → fix the REPLY (the apply is idempotent; re-run). If the verifier itself errors, do not rewrite its contract logic — note the case in `progress.md`, iterate on the reply.
5. Append one line per batch to `probes/records-phase0/progress.md`.

## What remains (the machine's own plan)

- **Batches 7–22** — the old era (62 rows: rounds 13–67 ×2, the suffix lanes 18a/18b/24a/24b/24t/26.2–26.4). Sizes 0.6–9.1 KB per row; ≤8 rows per batch.
- **Batches 23–30** — the recent lanes (movement-ux, arrows-face-tune, atlas-v2, square-palace, square-entry-ground, square-env + square-env2, R23-ux + R24-ux, jordan-slice-2, rg-look + rastrelli-details, rg-f3). Their units carry `stateBullets` ranges (the window STATE bullets from the pin) — the reply emits `STATE-BULLET` blocks, which the apply script collects into `state-bullets/` for the assembly step.
- **Unclaimed DECs** (~26 bodies: DEC-001…008, 012…020, 031…037, 039) — build 2–3 configs from `pin/decisions.md` (the bodies not yet rewritten), archive files `<date>-dec-nnn.md`; ownership unresolvable from the rows per the ruling's rule → these files ARE their home.
- **Batch D** — the ledger cut (`pin/budget-ledger.md` rows → contract fields ≤ 400 B/row; every number preserved; the history prose is already homed by the round archives).
- **Assembly A** — the new `docs/STATE.md`: the header + the one-sentence Live-state law (ruling §3.3), `### Now` (≤ 2 KB: tree/sha, budgets from the latest merged-tree measure, the stack state, Owed — incl. the parked DEC-ready rows if any remain, the golden re-baselines owed — NOTE: the dec-noon/dec-night re-baselines were the merge wave's finale business; verify their state in the CURRENT main's records before listing), the window bullets from `state-bullets/` (≤ 6, newest on top), the Standing protocol VERBATIM + the new «Record shapes.» entry (ruling §3.2 verbatim), the ROUNDS intro sentence (§3.3).
- **Pass C** — the citation re-anchor: the pin has ZERO `file:line` citations into the four records (verified) — expect an empty pass; re-run the scan after assembly.
- **Pass V** — the full-tree §4 verification (the DEC multiset, the number set-inclusion per archive vs its sources, the caps: STATE ≤ 40 KB / Live ≤ 10 KB / ROUNDS ≤ 100 KB / rows ≤ 1,000 / DEC lines ≤ 1,500; pointers resolve; no line-citations; the Standing protocol byte-identical except the one insertion).
- **`tools/records-check.mjs`** — the records check as a committed tool (caps + pointer resolution + no line-citations + the Standing-protocol immutability), wired as a CI WARNING this round (the owner ratified warning→block next round). Vite-free plain node; the repo's biome house style.
- **The lane's own records (dogfooding)** — the compaction round's own ROUNDS row + STATE bullet are written IN THE NEW SHAPE at the integration.
- **Merge** — docs-only; run `pnpm validate` before the push; NO full e2e/golden gate (docs-only; the November merge wave's finale already ran it; if the dec-noon/dec-night re-baselines are still owed anywhere, they belong to that finale's record, not this lane). The merge happens at the owner's signal.

## The conventions the batches already encode (do not re-litigate)

- `n/r` = «not recorded at pin» — never invented. The status vocabulary: OPENED · LANDED · MERGED (+ DEFERRED/ABANDONED); old solo rounds = `MERGED (docs-only; … merge n/r)`. The row's own first cell is the identity law (a config label that disagrees is the config's error). Attribution tags preserved; missing = «tag n/r at pin». Chatter cut; one line per fact-producing stage. RU stays RU. The duplicate DEC-038 pair is never merged. The apply script auto-strips the «Round » label leak and normalizes INTEGRATED/LANDED → the vocabulary; sha backfills are script-verified from git log only.
- The configs resolve rows by PHYSICAL rowNo (the inventory's `rowNo` = the table's row index, NOT the round number — two rows share roundNo 67). The apply resolves reply labels `row<N>` by rowNo.
- Context discipline for you: NEVER read `docs/briefs/ROUNDS.md` or `docs/decisions.md` whole (300/59 KB) — the batch files carry the slices; use `pin/` only to re-check a boundary.
- The standing wedge-agent stop (if you run subagents): `opencode api post /api/session/<sessionID>/interrupt`.

## Start

Read `probes/records-phase0/executor-law.md`, then relay batch 7 (step 1 above). One batch per relay; the owner gates each paste.
