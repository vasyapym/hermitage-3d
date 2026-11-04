# Design — the load line (R23-ux)

One round of the parallel branch `roomload-mglight` (PARALLEL: merges by the owner's signal).
Relay: CREATIVE brief 18 (the zero-steering facts dossier, vault `projects v10/18-…`) → the
long-context specialist's design → orchestrator integration. Date: 2026-11-03/04.

## The ask (the owner, 2026-11-03)

«Rooms open a bit slow, especially Military Gallery — sometimes it takes 4–5 seconds. There
should be some indication that the room is loading, so that the user won't think that the website
has died. The indications should be consistent with the overall website (how it's built — page,
dropdown menus) — with senior-developer minimalistic taste, but which at the same time stands
out.» The facts dossier measured: hosted cold settles `#/1812` ≈ 4.5–5.7 s on the consumer line
(R6 experiment, 2026-10-27) and the CDN fetch chain rode the dark card **with no sign of life
anywhere**: a pure black frame with one static serif room title.

## §1 — THE LAW

One sans line under the card's serif title, new corner-stack member `#load-line` (between
`#caption-title` and `#travel-hint`). Nothing drawn — the only motion is tabular numerals, the
one moving idiom this chrome already owns (the clock row). Stages read the host's actual awaits:

- `open` — the manifest + the lazy chunk: verb only («Загружаем зал»), no numbers (.unknown until
  the manifest lands).
- `bytes` — `module.load` streaming the manifest's rows: «Загружаем зал · {received} из {total}».
  The total = the SUM OF THE MANIFEST'S ROW SIZES (the payload bytes — **the reply's claim that
  this equals `data-ledger-bytes` was WRONG**: the HUD ledger is the honest GPU-VRAM total;
  integration correction recorded). Per-row counts come from a streaming fetch reader; a row
  without a body stream reports once at resolve; a cache hit reports its full size at once.
- `assemble` — `mount` + `compileAsync`: «Собираем зал · {total}».
- `failed` (optional row TAKEN — the same promise; the chain rejecting holds the card in
  silence today): «Зал не открылся · обновите страницу», announced once via `#scene-announcement`
  (role=alert). No button, no new surface; the owner may strike the row at review.

Visibility (the pure law `src/ui/load-line.ts`): arms at the transit's card entry (box present,
transparent); SHOWS on the first card frame where `phase === 'card' && !dataReady &&
phaseElapsedMs ≥ LOAD_LINE_AFTER_MS = 1_000`; LATCHES until the title clears (the same tick, the
same 240 ms opacity fade), `off` (display:none) at idle. Data landing before the threshold means
the line NEVER shows — the 800 ms floor reads exactly as today. The FSM is untouched; the line
never extends the card. Why 1 s and not the transit clock: during `depart` the picture glides
(motion is the feedback); doubt begins when the frame freezes black.

Formatting (`src/i18n/format.ts::formatByteProgress`): totals < 1 MB read integer KB (received
floors, the total rounds); totals ≥ 1 MB read one-decimal MB with a CONSTANT width («1,0» not
«1»); both values quantize at 100 KB steps (`LOAD_LINE_BYTE_STEP = 100_000` — 0.1 MB exactly);
the unit shows ONCE (on the total); the number–unit junction is the no-break space; RU/EN differ
only in the decimal byte and the unit's script. Integration corrections of the reply: the unit
tokens ride the COMMITTED `BYTE_UNITS` map (`kB`/`кБ`, new `MB`/`МБ` member) instead of new
dictionary keys, and the number formatting rides format.ts's own decimal separator law (no
Intl.NumberFormat construct — the repo's DEC-laws own the decimal byte).

## §2 — THE FACE

`#load-line`: sans 400 at `--hint-size` (12 px; 14 ≥1600), tracking 0, tabular numerals, nowrap,
right-aligned, `rgba(255,255,255,.72)` — the values register between the title's .85 and the
hint's .55 (information in transit, not a resting control). Text-shadow per the chrome family;
no underline, no hover, `pointer-events: none`, `user-select: none`, aria-hidden. States ride
`data-state`: `off` (display:none — no box at settle), `armed` (box present, opacity 0),
`open|bytes|assemble|failed` (ink, 240 ms fade). Margin 0 — a plain stack member. Reduced motion:
the transition drops (the numerals carry on — content, not motion).

## §3 — COPY (RU first, keyed `chrome.load.*`)

- `chrome.load.open` — «Загружаем зал» / 'Loading the room'
- `chrome.load.bytes` — «Загружаем зал · {received} из {total}» / 'Loading the room · {received}
  of {total}'
- `chrome.load.assemble` — «Собираем зал · {total}» / 'Assembling the room · {total}'
- `chrome.load.failed` — «Зал не открылся · обновите страницу» / 'The room did not open · reload
  the page'

The «мы» register is deliberate (the specialist's verdict: authorial, as on the «Как это
устроено» page). Charset: ZERO growth — «·» is U+00B7 (inside the committed Latin-1 0xA0–0xBF
block), nbsp and digits already ship; no subset sync, no `pnpm fonts`.

## §4 — A11Y

The line is aria-hidden (a live counter must not be read out). ONE announcement at the first
show: `chrome.load.open` pushed into the existing `#caption-live` (role=status, polite), never
repeated per transit; the arrival announcement then reports completion naturally. `failed` is
the one state that goes to `#scene-announcement` (role=alert) instead. No new region.

## §5 — TESTS + COSTS

- `tests/load-line.test.ts`: the latch law (999/1000 ms, dataReady-before-threshold, latch
  holds, loud throws), the stage map (verb-only views, the clamp, the assemble total), the
  formatting law (ru `,`/en `.`, the step identity across a 50 KB delta, the trailing zero at
  whole MB, KB rooms, the clamp) + the module's own purity fence.
- `tests/assets.test.ts` (appendix): the row sink — the no-stream fallback reports once per row
  at resolve, the streamed rows report monotone cumulative counts, cache hits report full sizes
  without fetching, no sink → no reports (the `stageUnit` path stays silent forever).
- e2e `tests/e2e/load-line.spec.ts` (allowlisted in the chromium project): the throttled-atlas
  walk jordan → 1812 — the arms/show stages, the RU pair's shape, the ONE «Загружаем зал», the
  settle contract + the line `off` at settle, and the lower-bound stamp window
  (`loadLineShownAt − titleShownAt ≥ 1000`); the EN column row. The never-shows anti-case is
  pinned by the UNIT law only (a starved runner legitimately shows the line — no upper bounds).
- The scene goldens' overlay hide list gains `#load-line` (one selector; the settle state never
  shows the box — no fixture/image re-baselines).
- Budget: measured **+1,330 B gz TOTAL, both this round and R24-ux's fix combined** — 280,144 →
  281,474 of 350,000 (the standing 285,707 ceiling class holds; the declared allowance was
  +3,000 for this round alone). RU chunk 7,245 → 7,332 of 12,000. Room payloads untouched.
- Dev-inspect: `document.documentElement.loadLineShownAt` stamps the first show (the
  `titleShownAt` precedent; consumed by the e2e row).

## §6 — RISKS / MEASURE FIRST (from the reply, recorded as conditions, not promises)

- The dead `open` window (manifest+chunk) on the owner's VPN'd line can dominate: if the device
  pass shows it, the mitigation INSIDE this design is carrying each room's committed total in
  its contract («0,0 из 3,0 МБ» from frame one) — a build-time field, NOT added by default.
- Warm re-entries re-run parse/transcode/PMREM/compile (bytes cached, work is not): if the
  warm card clusters at 1.0–1.4 s, raise `LOAD_LINE_AFTER_MS` to 1 500 — a tuning knob, no new
  timer, no FSM change.
- The hidden `/basis/` (585 KB) fetch on a session's FIRST interior is not in the row's total
  (three's internal loader) — the `assemble` verb covers it; measure before adding anything.
- Scope not covered by this round: the ~2.3–3.7 s square boot (no transit) shows nothing — a
  separate round if the owner asks; idle prefetch never shows anything (the visitor is not in a
  wait).
