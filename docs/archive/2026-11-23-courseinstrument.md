# The course-instrument round — 2026-11-23 (main direct, solo-lane)

The owner's orientation round: «directions for improvements» — how the project carries the
standing preferences on choosing a round, and whether the JS budget is measurable per room.

## The decision (DECISION-34)

One decision brief (brief 34, Fable 5.1 max, the decision flow: 4 options × 7 tests). The
owner adopted **Option B**: the «Course» standing-preferences sub-block in ROADMAP › Principles
(read second in the AGENTS.md order — every new session sees it) + `tools/budget.mjs` per-chunk
rows with the rooms/ru/other group line (a stdout diagnostic: no per-room cap, no ledger
column) + `vite.config.ts` `chunkFileNames` naming room chunks `room_<folder>-[hash].js` on
`facadeModuleId` (the attribution seam; folders read from `rooms/`, so a new room needs no
instrument edit). Rejected: A record-only (per-room ask unmet), C a generated numbers doc
(a fifth record; conflicts in parallel lanes; the upkeep the owner forbade), D the ratchet
(the tree sits over the ratification-pending 285,707 ceiling; fails day one).

## The measured

- Before: 8 chunks, 288,121 gz (the tree at main @ b328f47; STATE's Now then quoted 251061c-era
  numbers — 288,127 · jordan payload 1,657,498 — snapshot mixing, not build drift; the measured
  print is the authority).
- After: 288,158 gz — **the instrument's cost +37 B gz** (the naming's longer specifiers in
  the entry chunk; declared "tens of bytes" in the design). RU 7,427 ±0; payloads ±0.
- The first per-chunk print: main 237,418 · lang-host 16,345 · basis transcoder 15,143 ·
  notes 7,479 · ru 7,427 · room_1812 2,876 · room_rastrelli-gallery 737 · room_jordan 733.
  Rooms 1812 2876 · jordan 733 · rastrelli-gallery 737 · ru 7427 · other 276,385.
  (Integration amendment, review round 35: the group line labels itself `rooms (lazy chunk
  gzip)` — the room rows measure the room's lazy chunk only; contracts ride 'other'.)
- The room chunks are a few KB under a three.js-dominated entry — the specialist's trigger (c)
  read "flat" for the preference; the adopted artifact already reads "JS lands flat or
  negative", and the naming stays (the owner's explicit per-room ask outweighs 37 B).
- The Vite 8.3.4 API claim was verified in the installed types: `chunkFileNames?: string |
  ChunkFileNamesFunction`, `PreRenderedChunk.facadeModuleId: string | null`; the user
  `output` spread overrides Vite's default (the dev-path overwrite does not apply to builds).

## The gates

`pnpm validate` GREEN (typecheck · biome · vitest · build · budget). records-check: the round's own rows within caps (728 B ≤ 1,000; the STATE additions fit the 10,240 B Live-state cap) but the check FAILS overall — 8 pre-existing items byte-identical on the pristine HEAD b328f47 (parked in docs/parking-lot.md; CI runs it WARNING-waived). No DEC (no budget law changed — the feel-tune
precedent); the ledger's JS committed cell re-measured to 288,158 with the −2,451 remaining
against the proposed ceiling.

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **course-instrument — RELEASED** | the orientation round (brief 34, the DECISION-34 record, owner-adopted Option B): ROADMAP › Principles «Course» standing-preferences sub-block · tools/budget.mjs per-chunk rows + the rooms/ru/other group line (a stdout diagnostic — no per-room cap, no ledger column) · vite.config.ts chunkFileNames names room chunks `room_<folder>-[hash].js` (the attribution seam; folders read from rooms/, a new room needs no instrument edit) | LANDED on main 2026-11-23 (direct, solo-lane, targeted gates; the FULL gate = pnpm validate): JS +37 gz (288,121 → 288,158 — the naming's specifier cost) · RU ±0 · payload ±0 · the first per-chunk print: rooms 1812 2876 · jordan 733 · rastrelli-gallery 737 · ru 7427 · other 276385 |
