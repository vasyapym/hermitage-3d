# HANDOFF-2 — the records-compaction lane, the post-freeze continuation (read this first, fresh session)

You continue the records-compaction lane on the branch `records-compaction` in the worktree
`/Users/vasilij/Documents/hermitage-3d-records`. The lane compacted the project's records per the
RATIFIED ruling (`probes/records-phase0/ruling.md`; the owner ratified the shapes/caps as
written). The FIRST handoff is `docs/briefs/records-compaction-handoff.md` (read it for the
ratified shapes/caps and the ruling references). The full per-batch log is
`probes/records-phase0/progress.md` (append one line per batch — never rewrite it).

## Where the lane stands (all committed and pushed; the tree clean)

- The branch head: `49148fa` (the dogfood records). The relay specialist was **Sonnet 5.5**
  (mechanical batch executor); briefs went one by one; the replies came back via chat paste or
  (from batch 16) were extracted byte-exact from the OpenCode session DB.
- DONE and verified: batches 4–19 — every ROUNDS row of the pin compacted to ≤1,000 B
  (1,140–10,966 B → 474–787 B) with a per-round archive under `docs/archive/` (76 round
  archives); batches 20–22 — the 25 unclaimed DEC homes (`2026-11-12-dec-*.md`) + the compacted
  register lines; decs4 (`0d638b0`) — the six over-cap lines the unclaimed list missed
  (DEC-038 ×2 the never-merge duplicate pair → their own archives via ARCHIVE-DEC, 040/041 →
  squareentryground, 042 → rglook, 043 → squarepalace); Batch D (`6f3117d`) — the budget ledger
  cut 29,185 → 6,994 B (zero number losses; three rows over the 400-B cap under the documented
  numbers exception); Assembly A (`579f71a`) — the new `docs/STATE.md` 18,409 B (header + §3.3
  Live-state law + `### Now` + ≤6 window bullets from `probes/records-phase0/state-bullets/` +
  the Standing protocol byte-verbatim + the appended «Record shapes.» entry; the §3.3 ROUNDS
  intro sentence inserted into `docs/briefs/ROUNDS.md`); `tools/records-check.mjs` committed
  (`feb46c7`) + the CI warning step (7e4bf81, blocking next round); records-check **GREEN**
  (STATE 18,409 / Live 5,573 / ROUNDS 59,564 / 115 pointers / 0 citations / the protocol
  immutable); the dogfood records landed (`49148fa`).
- Pass V residual (documented, accepted): 39 archives flagged with 108 number tokens in five
  structural classes — the cross-round references homed in the pointer-named archives (by
  design), DEC-id pointer tokens, source-meta byte annotations, self-reference line numbers,
  two token-form leftovers. No content loss. `probes/records-phase0/pass-v.mjs` is the checker.

## What changed since the pin (your job)

The pin is `ff2a85ed19b41c2bda750dc1dd229e6409201daf`. AFTER the lane froze, the owner ran more
rounds in other sessions — main has new commits (new ROUNDS rows, STATE bullets, DEC lines, and
possibly code). Your job, in order:

0. `git pull --ff-only` on the branch, then merge `origin/main` INTO `records-compaction`.
   Conflicts are expected ONLY in the four record files: the lane rewrote the OLD rows/lines
   (take the LANE's side for everything the lane already compacted), main adds NEW rows/lines
   (take MAIN's side — they are the input for your compaction pass). Code files: main's side.
1. Re-run the inventory against the merged tree: `node probes/records-phase0.mjs` (it rebuilds
   `probes/records-phase0/inventory.json` at the new head). The NEW pin = main's merged head;
   all anchors now cite it.
2. Identify the NEW units: the ROUNDS rows added since the old pin (the inventory's rowNos the
   old cfgs — `probes/records-phase0/batches/batch*-cfg.json` — do not cover), their STATE
   bullets, their DEC lines. Build cfgs (continue the numbering from batch 25; group ≤8 rows,
   byte-balanced ≤ ~45 KB per brief) and run the builder:
   `node probes/records-batch-brief.mjs probes/records-phase0/batches/batchN-cfg.json
   probes/records-phase0/batches/batchN.md`, copy to the vault
   `/Users/vasilij/Documents/vasyapym-Vault/02_projects/projects v13/N-hermitage-3d-records-batchN.md`.
3. Relay per batch (the owner gates each paste; each brief = a new chat; prepend the opener
   "Answer as a chat model — no agentic operations. Do not run tools, commands or tests, and do
   not change any of your settings; an agentic session does all of that."). The replies:
   EXTRACT from the session DB (read-only sqlite; the text lives in the v2 `session_message`
   rows; disambiguate by the marker profile — the phrase, the block-kind counts, the terminal
   `COMPLETE`; reject your own spawn prompts by session id) OR ask the owner to save the reply
   into the vault. NEVER re-type from chat (the transport strips markdown and mangles
   number tokens). Save verbatim to `probes/records-phase0/replies/batchN.md`.
4. Per batch: `node probes/records-phase0/repair-reply.mjs probes/records-phase0/replies/batchN.md`
   then `node probes/records-apply.mjs probes/records-phase0/replies/batchN.md
   probes/records-phase0/batches/batchN-cfg.json`. VERIFY PASS → commit EXACTLY
   `docs/archive docs/briefs/ROUNDS.md docs/decisions.md docs/STATE.md docs/budget-ledger.md`
   («RECORDS: batch N integrated …»); push the branch periodically (NEVER main). VERIFY FAIL →
   fix the REPLY (the apply is idempotent for ARCHIVE/ROW/DEC; the ARCHIVE-DEC inserts have
   the section-present guard). Never rewrite the verifier's contract logic to pass a reply.
5. The tail for the new pin, in the same pattern as this session: the DEC homes for any new
   DECs (the cfgs pattern `probes/records-phase0/decs-cfg.mjs`; the over-cap register lines of
   the new rounds → ARCHIVE-DEC into their round archives, the `decs4-cfg.mjs` pattern); the
   ledger's new rows (the `batch-d-brief.mjs` + `batch-d-apply.mjs` pair); the STATE.md
   Assembly update (re-pick ≤6 newest bullets from `state-bullets/`, update `### Now`'s
   sha/budgets/owed from the verified records, re-verify the Standing protocol byte-verbatim);
   Pass C (the citation scan) + Pass V (`probes/records-phase0/pass-v.mjs`) + `node
   tools/records-check.mjs` — ALL green before you stop.

## The merge (only at the owner's explicit signal)

The owner will signal the merge of BOTH this branch's work and the other sessions' rounds —
after your full gate. The merge protocol (docs-only): run `pnpm validate` AND
`node tools/records-check.mjs` AND Pass V green immediately before; NO full e2e/golden gate
(docs-only — the finale gates already ran on the merged unions per the records). Merge
`records-compaction` → main, push, and record the lane's own closing line in
`probes/records-phase0/progress.md`.

## The conventions the batches already encode (do not re-litigate)

- `n/r` = «not recorded at pin» — never invented. The status vocabulary: OPENED · LANDED ·
  MERGED (+ DEFERRED/ABANDONED); old solo rounds = `MERGED (docs-only; … merge n/r)`. The row's
  own first cell is the identity law. Attribution tags preserved; missing = «tag n/r at pin».
  Chatter cut; one line per fact-producing stage. RU stays RU. Heads (DEC + verdict) survive
  verbatim, whitespace-normalized — INCLUDING inline-code backticks (the transport strips
  them; restore from the pin verbatim).
- The configs resolve rows by PHYSICAL rowNo (NOT the round number). The apply's ROUNDS-label
  fallback resolves bare digits by roundNo — for duplicate/prefix-colliding lanes use the
  rowNo label form (`row98`/`row15`; the `square-env` ⊂ `square-env2` substring trap bit
  batch 17). The duplicate DEC-038 pair is never merged — the apply consumes `DEC-038#1`/`#2`
  bodies in pin order.
- The verifier's whitelist includes the cfg's STATE-slice ranges (the briefs carry them as
  byte-authoritative). For DEC-home batches the displaced-detail homing corpus extends to the
  target archives. Number-token glue classes: a line-ending number + a B/K/M/G/%-starting next
  line glue into one token; brace comma-lists are ONE token; match the pin's exact forms
  (glued vs spaced, B-suffixed vs bare). Pointer tokens are case-sensitive lowercase
  ("brief 20", not "Brief 20").
- Context discipline: NEVER read `docs/briefs/ROUNDS.md` or `docs/decisions.md` whole — the
  batch files carry the slices; use the pin snapshots only to re-check a boundary.
- Network git is `/usr/bin/git` (`/usr/local/bin/git` is broken for network ops — known, do
  not diagnose).
- If you run subagents: the standing wedge-agent stop is
  `opencode api post /api/session/<sessionID>/interrupt`. Delegate the mechanical loops
  (extract → repair → apply → report); the decisions and the commits stay with you. The
  subagents can extract the replies from the DB themselves — give them the marker profile and
  the "read-only, reject your own spawn prompts" rule.
- The transport-stripped replies are repaired by `probes/records-phase0/repair-reply.mjs`
  (the markers, the status vocabulary, the DEC `- **` lines, the band forms) — extend it per
  batch only on the known template lines, never free-form.
- The skill suggestions from this session (the ranked list): the owner saved them to
  `~/Documents/vasyapym-Vault/02_projects/suggestions/bytecheck-suggestions-1.md` — read them
  if the relay mechanics fight you.

## Start

Sync, do step 0 (the main merge with the conflict rule), then step 1 (the inventory). One
batch per relay; the owner gates each paste. All green → stop → the merge at the owner's
signal.
