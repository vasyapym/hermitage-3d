# R23-ux the load line — an honest loading line under the room title
Opened n/r · Landed n/r · Merged 2026-11-05 (n/r) · date cell 2026-11-03/04 · slot 1/4 of four (the owner's solo-merge ruling) · brief 18 · vault projects v10 · DEC-ids: none owned (DEC-038 + design-load-line.md referenced)
## Ask
The owner's observation: rooms open slowly (the Military Gallery 4–5 s worst; the R6 experiment: the hosted #/1812 ≈ 4.5–5.7 s cold on the consumer line) and the wait is silent — the visitor thinks the site died.
## Relay shape

CREATIVE relay, one brief (vault projects v10/18-…, facts-only); the reply carried the design.
Integration corrections by the orchestrator (see Verdicts).

## Verdicts
THE DESIGN (no DEC owned; DEC-038 + design-load-line.md):

ONE sans line in the corner stack under the serif room title — the loading stage with, while bytes stream, the honest byte pair in tabular numerals (the one moving idiom the chrome owns); no spinner/bar/drawn anything.
It shows only when the card's data wait outlives 1 s and latches to the title clear.
The stages read the host's REAL awaits: open = manifest+chunk, bytes = the rows streaming, assemble = mount+compile, failed = the chain rejected — announced once.
Integration corrections recorded: the byte total is the MANIFEST ROW SUM (payload), not data-ledger-bytes (the reply's GPU-VRAM confusion); the unit tokens ride the committed BYTE_UNITS map (+MB/МБ), the decimals ride format.ts's law; the failed optional row taken.

### DEC-038 — The load line (R23-ux): a room's loading stage reads live under the card's room title — verb + honest byte pair, nothing drawn, 1 s card-threshold, latch to the title clear

Two corrections to the specialist's design:

The byte TOTAL is the manifest row sum (payload bytes), NOT data-ledger-bytes. The reply's claim confused the GPU-VRAM ledger with payload.
The unit tokens ride the committed BYTE_UNITS map (+MB/МБ) and format.ts's decimal law instead of numeric keys.


NEW: corner-stack member #load-line, with the serif title above it. The question «is it alive?» is asked where the only visible thing is, the title; the answer sits under it.

Style: sans 400 --hint-size, tabular numerals, .72 white, nowrap.
States: off (display:none at settle — no box, no layout), armed (box transparent), open|bytes|assemble|failed.


The pure law is src/ui/load-line.ts.

It shows from the first card frame with !dataReady && phaseElapsedMs ≥ 1000.
It LATCHES until the title clears (the same tick, the same 240 ms fade).
It never extends the card: the FSM is untouched, and the 800 ms floor reads byte-identical when data lands early.


The stages mark the host's real awaits via the ensureRoom chain and a per-row streaming sink.

The sink is RowByteSink, passed through fetchRoom's optional param and bounded by setLoadSink around one serialized hold chain.
open = manifest+chunk (verb only).
bytes = the rows' honest received/total pair: 100 KB write steps, one-decimal MB / integer KB, the unit once, nbsp joined (formatByteProgress in format.ts).
assemble = mount+compile («Собираем зал · {total}»).
failed = the chain rejected («Зал не открылся · обновите страницу»), announced once over #scene-announcement, role=alert; no button — the owner may strike the row at review.


A11y: the line is aria-hidden. ONE spoken word at the first show (chrome.load.open in #caption-live); the arrival announcement reports completion.
Strings are RU-first, keyed chrome.load.open/bytes/assemble/failed. Charset ZERO growth (· U+00B7 ships).
Rejected alternatives: none recorded at pin beyond the two corrections above.
IN-FLIGHT instrument rows:

LOAD_LINE_AFTER_MS is the tuning knob (1 s; raise to 1.5 s if a device pass shows the warm re-entry pass clustered at 1.0–1.4 s).
The square's ~2.3–3.7 s boot shows nothing (another round if asked).
Prefetch never shows (the visitor is not in the wait).

### DEC-038 — The load line (R23-ux): a room's loading stage reads live under the card's room title — verb + honest byte pair, nothing drawn, 1 s card-threshold, latch to the title clear

Two corrections to the specialist's design:

The byte TOTAL is the manifest row sum (payload bytes), NOT data-ledger-bytes. The reply's claim confused the GPU-VRAM ledger with payload.
The unit tokens ride the committed BYTE_UNITS map (+MB/МБ) and format.ts's decimal law instead of numeric keys.


NEW: corner-stack member #load-line, with the serif title above it. The question «is it alive?» is asked where the only visible thing is, the title; the answer sits under it.

Style: sans 400 --hint-size, tabular numerals, .72 white, nowrap.
States: off (display:none at settle — no box, no layout), armed (box transparent), open|bytes|assemble|failed.


The pure law is src/ui/load-line.ts.

It shows from the first card frame with !dataReady && phaseElapsedMs ≥ 1000.
It LATCHES until the title clears (the same tick, the same 240 ms fade).
It never extends the card: the FSM is untouched, and the 800 ms floor reads byte-identical when data lands early.


The stages mark the host's real awaits via the ensureRoom chain and a per-row streaming sink.

The sink is RowByteSink, passed through fetchRoom's optional param and bounded by setLoadSink around one serialized hold chain.
open = manifest+chunk (verb only).
bytes = the rows' honest received/total pair: 100 KB write steps, one-decimal MB / integer KB, the unit once, nbsp joined (formatByteProgress in format.ts).
assemble = mount+compile («Собираем зал · {total}»).
failed = the chain rejected («Зал не открылся · обновите страницу»), announced once over #scene-announcement, role=alert; no button — the owner may strike the row at review.


A11y: the line is aria-hidden. ONE spoken word at the first show (chrome.load.open in #caption-live); the arrival announcement reports completion.
Strings are RU-first, keyed chrome.load.open/bytes/assemble/failed. Charset ZERO growth (· U+00B7 ships).
Rejected alternatives: none recorded at pin beyond the two corrections above.
IN-FLIGHT instrument rows:

LOAD_LINE_AFTER_MS is the tuning knob (1 s; raise to 1.5 s if a device pass shows the warm re-entry pass clustered at 1.0–1.4 s).
The square's ~2.3–3.7 s boot shows nothing (another round if asked).
Prefetch never shows (the visitor is not in the wait).

### DEC-038 — The load line (R23-ux): a room's loading stage reads live under the card's room title — verb + honest byte pair, nothing drawn, 1 s card-threshold, latch to the title clear

Two corrections to the specialist's design:

The byte TOTAL is the manifest row sum (payload bytes), NOT data-ledger-bytes. The reply's claim confused the GPU-VRAM ledger with payload.
The unit tokens ride the committed BYTE_UNITS map (+MB/МБ) and format.ts's decimal law instead of numeric keys.


NEW: corner-stack member #load-line, with the serif title above it. The question «is it alive?» is asked where the only visible thing is, the title; the answer sits under it.

Style: sans 400 --hint-size, tabular numerals, .72 white, nowrap.
States: off (display:none at settle — no box, no layout), armed (box transparent), open|bytes|assemble|failed.


The pure law is src/ui/load-line.ts.

It shows from the first card frame with !dataReady && phaseElapsedMs ≥ 1000.
It LATCHES until the title clears (the same tick, the same 240 ms fade).
It never extends the card: the FSM is untouched, and the 800 ms floor reads byte-identical when data lands early.


The stages mark the host's real awaits via the ensureRoom chain and a per-row streaming sink.

The sink is RowByteSink, passed through fetchRoom's optional param and bounded by setLoadSink around one serialized hold chain.
open = manifest+chunk (verb only).
bytes = the rows' honest received/total pair: 100 KB write steps, one-decimal MB / integer KB, the unit once, nbsp joined (formatByteProgress in format.ts).
assemble = mount+compile («Собираем зал · {total}»).
failed = the chain rejected («Зал не открылся · обновите страницу»), announced once over #scene-announcement, role=alert; no button — the owner may strike the row at review.


A11y: the line is aria-hidden. ONE spoken word at the first show (chrome.load.open in #caption-live); the arrival announcement reports completion.
Strings are RU-first, keyed chrome.load.open/bytes/assemble/failed. Charset ZERO growth (· U+00B7 ships).
Rejected alternatives: none recorded at pin beyond the two corrections above.
IN-FLIGHT instrument rows:

LOAD_LINE_AFTER_MS is the tuning knob (1 s; raise to 1.5 s if a device pass shows the warm re-entry pass clustered at 1.0–1.4 s).
The square's ~2.3–3.7 s boot shows nothing (another round if asked).
Prefetch never shows (the visitor is not in the wait).

### DEC-038 — The load line (R23-ux): a room's loading stage reads live under the card's room title — verb + honest byte pair, nothing drawn, 1 s card-threshold, latch to the title clear

Two corrections to the specialist's design:

The byte TOTAL is the manifest row sum (payload bytes), NOT data-ledger-bytes. The reply's claim confused the GPU-VRAM ledger with payload.
The unit tokens ride the committed BYTE_UNITS map (+MB/МБ) and format.ts's decimal law instead of numeric keys.


NEW: corner-stack member #load-line, with the serif title above it. The question «is it alive?» is asked where the only visible thing is, the title; the answer sits under it.

Style: sans 400 --hint-size, tabular numerals, .72 white, nowrap.
States: off (display:none at settle — no box, no layout), armed (box transparent), open|bytes|assemble|failed.


The pure law is src/ui/load-line.ts.

It shows from the first card frame with !dataReady && phaseElapsedMs ≥ 1000.
It LATCHES until the title clears (the same tick, the same 240 ms fade).
It never extends the card: the FSM is untouched, and the 800 ms floor reads byte-identical when data lands early.


The stages mark the host's real awaits via the ensureRoom chain and a per-row streaming sink.

The sink is RowByteSink, passed through fetchRoom's optional param and bounded by setLoadSink around one serialized hold chain.
open = manifest+chunk (verb only).
bytes = the rows' honest received/total pair: 100 KB write steps, one-decimal MB / integer KB, the unit once, nbsp joined (formatByteProgress in format.ts).
assemble = mount+compile («Собираем зал · {total}»).
failed = the chain rejected («Зал не открылся · обновите страницу»), announced once over #scene-announcement, role=alert; no button — the owner may strike the row at review.


A11y: the line is aria-hidden. ONE spoken word at the first show (chrome.load.open in #caption-live); the arrival announcement reports completion.
Strings are RU-first, keyed chrome.load.open/bytes/assemble/failed. Charset ZERO growth (· U+00B7 ships).
Rejected alternatives: none recorded at pin beyond the two corrections above.
IN-FLIGHT instrument rows:

LOAD_LINE_AFTER_MS is the tuning knob (1 s; raise to 1.5 s if a device pass shows the warm re-entry pass clustered at 1.0–1.4 s).
The square's ~2.3–3.7 s boot shows nothing (another round if asked).
Prefetch never shows (the visitor is not in the wait).

### DEC-038 — The load line (R23-ux): a room's loading stage reads live under the card's room title — verb + honest byte pair, nothing drawn, 1 s card-threshold, latch to the title clear

Two corrections to the specialist's design:

The byte TOTAL is the manifest row sum (payload bytes), NOT data-ledger-bytes. The reply's claim confused the GPU-VRAM ledger with payload.
The unit tokens ride the committed BYTE_UNITS map (+MB/МБ) and format.ts's decimal law instead of numeric keys.


NEW: corner-stack member #load-line, with the serif title above it. The question «is it alive?» is asked where the only visible thing is, the title; the answer sits under it.

Style: sans 400 --hint-size, tabular numerals, .72 white, nowrap.
States: off (display:none at settle — no box, no layout), armed (box transparent), open|bytes|assemble|failed.


The pure law is src/ui/load-line.ts.

It shows from the first card frame with !dataReady && phaseElapsedMs ≥ 1000.
It LATCHES until the title clears (the same tick, the same 240 ms fade).
It never extends the card: the FSM is untouched, and the 800 ms floor reads byte-identical when data lands early.


The stages mark the host's real awaits via the ensureRoom chain and a per-row streaming sink.

The sink is RowByteSink, passed through fetchRoom's optional param and bounded by setLoadSink around one serialized hold chain.
open = manifest+chunk (verb only).
bytes = the rows' honest received/total pair: 100 KB write steps, one-decimal MB / integer KB, the unit once, nbsp joined (formatByteProgress in format.ts).
assemble = mount+compile («Собираем зал · {total}»).
failed = the chain rejected («Зал не открылся · обновите страницу»), announced once over #scene-announcement, role=alert; no button — the owner may strike the row at review.


A11y: the line is aria-hidden. ONE spoken word at the first show (chrome.load.open in #caption-live); the arrival announcement reports completion.
Strings are RU-first, keyed chrome.load.open/bytes/assemble/failed. Charset ZERO growth (· U+00B7 ships).
Rejected alternatives: none recorded at pin beyond the two corrections above.
IN-FLIGHT instrument rows:

LOAD_LINE_AFTER_MS is the tuning knob (1 s; raise to 1.5 s if a device pass shows the warm re-entry pass clustered at 1.0–1.4 s).
The square's ~2.3–3.7 s boot shows nothing (another round if asked).
Prefetch never shows (the visitor is not in the wait).

## Measured

vitest 1014/1/0 (61 files; +38 rows incl. R24-ux); build 281,474 gzip of 350,000 on the branch (+1,330 for BOTH parallel rounds combined — the 285,707 ceiling holds); RU 7,332 of 12,000; budgets ok.
At merge (HEAD): build 281,504/350,000; tsc 0, biome 189, vitest 1014/1/0, RU 7,332/12,000.

## Hunt / found / fixed

Wiring: src/ui/load-line.ts (pure: the latch + the stage map + the 100 KB write step); fetchRoom's optional RowByteSink (streaming readers; a no-stream fallback reports at resolve; cache hits report at once; setLoadSink bounds one serialized hold chain; stageUnit stays silent); the per-frame host writer (textContent on change only; the stamps loadLineShownAt); the i18n rows (chrome.load.open/bytes/assemble/failed, RU-first «мы» register; charset ZERO growth); the CSS member (off = display:none so no settled layout moves; reduced motion drops only the transition).
Tests: the unit latch/stage/formatting rows + the purity fence; the sink rows; the e2e throttled-atlas walk (the RU pair shape, ONE «Загружаем зал», the settle contract, the lower-bound stamp window) + the EN row; the goldens' hide list gains #load-line — no fixture/image re-baselines.

## Gates

Branch: tsc 0, biome clean, vitest 1014/1/0, build and RU as above, budgets ok. The e2e battery rides the quiet machine / the stack finale (PARALLEL merge law); the first battery attempt hung under the parallel session's bpy bake and was abandoned, NOT waived.
MERGED 2026-11-05 (stack slot 1/4 of four; the full e2e/golden gate rides the stack finale): deterministic gates green on the HEAD; targeted e2e handover 5/5 + load-line 2/2 + smoke 14/15 — the keyboard-walk row DEFERRED NOT WAIVED (storm-class reds ×3; single-row split main-green/branch-red; the delegated probes + the bisect exonerate the ownership law — the machine's per-leg class is the bound); the walkbisect worktree removed.
Branch roomload-mglight (PARALLEL row 68).

## Mentioned elsewhere

The +38 vitest rows include R24-ux's, and the +1,330 build delta covers both parallel rounds (R23-ux and R24-ux).

## Sources

docs/briefs/ROUNDS.md · row R23-ux the load line (roundNo 17) · line 17 @ ff2a85ed19b41c2bda750dc1dd229e6409201daf
