# Mobile tier + touch rail — the R17 design (RATIFIED 2026-10-30)

Round R17 · designed 2026-10-29 against commit `d050c18`; integrated 2026-10-30 · CREATIVE relay ×1.
Status: RATIFIED 2026-10-30 — every §16 call adopted with the owner's verdict tool (§17); the
hint copy KEPT as-is. The Mobile-A/B/C implementation rounds follow §15. §0.1 records every
fact the integration corrected (the design's claims vs the verified tree) — the numbered
sections below carry the corrected text.

Mobile-C capture design · designed 2026-10-31 against commit `c017878` · CREATIVE relay ×3
draws (the first draw's fragment was retrieved after a chat transport timeout) — adds §18–§21
below the ratified R17 sections. The capture design is NOT part of the 2026-10-30
ratification: its owner calls (the Android identity/adoption, the power-law exception) and
every measurement stay open exactly as the text says.

## §0.1 Integration corrections (fact-check record)

1. THE HINT COPY — the design's premise (inherited from the relay brief) was stale. The
   CURRENT dictionary (`src/i18n/ru.ts:28`, `en.ts:23`) already reads
   `chrome.travelHint: 'Прокрутите, чтобы идти · потяните, чтобы осмотреться'` /
   `'Scroll to walk · drag to look around'` — the verbs are truthful TODAY. The r23-freeze
   sentence the brief quoted («Потяните, чтобы подойти ближе»/"Drag to move closer") was
   retuned by later rounds (the R-UX2/D1 door-label work). The design's §6
   «corrects an inaccurate verb» is therefore MOOT: the decision reduces to an owner taste
   call — keep the current copy, or adopt the design's tweak («Прокрутите, чтобы двигаться.
   Потяните, чтобы осмотреться.» / "Scroll to move. Drag to look around."). The §13
   baseline estimate drops the «hint copy» clause if the owner keeps it.
2. THE NIGHT/DAY DEVICE EPOCHS (§10): the design proposed winter day `2026-01-15T09:00:00Z`
   (12:00 Petersburg). The committed README anchor is `at=2026-01-15T10:00:00Z` (the
   solar-noon convention — the R10 integration corrected 09:30Z → 10:00Z); the device
   matrix adopts 10:00Z. Winter night `18:00Z` (21:00 local) stands; summer epoch
   `2026-06-21T12:00:00Z` (15:00 local — the fixtures' «noon» label is a UTC-hour
   mislabel, recorded as-is) stands.
3. RASTRELLI HEADROOM (§11): today's budget measurement reads usage **238,950 B of
   2,000,000** (the payload drifted from architecture.md's r19-era 228,982 through the
   R-UX4 re-encodes) → headroom **1,761,050 B**, not 1,771,018, and not «239 KB free» —
   the brief's «239 KB» was the parking lot's usage figure mis-typed as headroom. Both
   the brief and the design's arithmetic corrected to the fresh number.
4. THE BASIS CAP (§11, resolved at integration as the design requested): `budget.mjs`
   imports `collectPayloadRows()` from `common.mjs` → the ENFORCED cap is
   `BASIS_CAP = 600_000 B` (`common.mjs:19`; today's run: `584,862 B of 600,000 B ok`).
   The `budget.mjs:51` header comment «(500 000 B)» is STALE; corrected in this commit
   (a comment-only edit, no behavior). No waiver needed anywhere.
5. THE CHROME-FACE LINE (§2): the design preserves «solo top-right «Залы», bottom-right
   language toggle» — composed against `d050c18`. The owner's R16.2 verdict (2026-10-29
   evening, validated in the working tree, golden gates pending mains — the toggle reads
   top-right again, «Залы» takes the corner stack's base) already reversed that. §2 reads
   against R16.2. The design's §13 baseline math is unchanged by it (the same ten DOM
   baselines move).
6. ARROWS/INPUT FACTS (§5, verified for the record): the existing document keydown handler
   has NO `event.repeat` gate (a held arrow repeats steps) and no pointerdown
   primary-button check (any button starts a look-drag); pointermove carries NO
   per-move `railInputReady()` recheck (a transit beginning mid-drag keeps feeding
   `drag()`). The design's §5 guards are NEW for the buttons and partially NEW for the
   canvas (the second-contact cancellation law); they do not claim otherwise. The button
   gate «no glide» is STRICTER than the arrows' existing mid-glide retarget law — arrived
   at deliberately (one tap, one command) and left as a named difference (see §5 note).
7. NEW-KEY NAMING (§6): the repo's dictionary namespace law is `chrome.*` / `notes.*` /
   content keys — the design's proposed prefixes (`touchRail.*`, `travelHint.touch`,
   `scene.*`) are renamed to `chrome.touchRailLabel`, `chrome.touchRailBack`,
   `chrome.touchRailForward`, `chrome.travelHintTouch`, `chrome.sceneUnsupported`,
   `chrome.sceneInterrupted`, `chrome.sceneReload`. RU-first + EN pairs + NBSP law
   unchanged; the literals fence applies as always.
8. TODAY'S FRESH NUMBERS (the §11/§15 references): JS gzip **274,707** of 350,000 (+1 vs
   the R16.1 gate's 274,706 — a build-artifact byte; re-verified at each gate), the RU
   chunk **6,962**, chromium cases **40** (yesterday's gates), golden **33**.
9. THE MOBILE-C CAPTURE DESIGN (§18–§21, integrated 2026-10-31): the addendum comes from
   three relay draws; the first draw's reply fragment survived a chat transport timeout
   mid-§18.3 and was completed by continuations (the fragments preserved in the owner's
   vault). Corrections: (1) the reply's «Today's incremental ceiling is 277,757 B total JS
   gzip» (§18.1) replaced in the integrated text — the ratified §15 standing ceiling is
   **285,707 B** (the §0.1-8 baseline 274,707 + the A/B/C allocations 4,000/6,000/1,000; the
   fresh actual is **276,757**); (2) §18.9 types the transit artifact's
   transit/open/closed/frames as `MobileCJson` — the design relay hedged without the
   committed `AirlockTransit`/`PhaseRow` shapes in context; the types stand frozen and the
   mechanical round narrows them to the committed source shapes losslessly, never
   re-inventing fields; (3) the unit-test list and CHALLENGES arrived numbered «§21/§22» and
   are integrated under this document's structure (§21 keeps its number; the capture
   CHALLENGES carry their own trailing heading). The long-line reply prose is reflowed to
   the house column; words unchanged except (1).

## §1 Decision and meaning of «works on a phone»

Ship a visible, two-button touch rail; retain one-finger dragging exclusively for looking.
Use T0 as the conservative automatic choice when a coarse pointer is available, or reported
memory is below 4 GiB. Do not expose those boots to the T2 probe first. This is a
capability-based safety policy, not a claim that touch implies a slow GPU. «Works» means
native-phone access to all 18 stops, both directions through all three room connections,
working look/time/season/language/index controls, and usable recovery states. «Floor met»
additionally requires the physical-device evidence in §§9–10. Neither a small viewport, a
T0 HUD label, an owner's appearance verdict, nor SwiftShader establishes it. Certification
names devices and conditions; it does not promise every phone or power mode.

## §2 Preserved contracts

- All URL keys and lifecycle laws survive: `at`, `q`, `lang`, `hud`, `cam`, `stop`, `det`.
  No new keys.
- Existing explicit-quality persistence survives. Automatic choices are not persisted.
- Unoverridden deterministic boots settle T1 without probing or consulting timing.
- Keep every `TIERS` numeric value, `BENCHMARK` threshold and pinned §11 assertion
  unchanged.
- Keep `antialias: true` at every tier. ADR-0015 supersedes stale «no MSAA» comments.
- No new geometry, LOD, material, shader slot, post-processing or asset variant.
- One TimeState remains authoritative. Input adds no independent season or clock state.
- Keep the corner stack, transparent reserved slots, opacity-only fades and the retired
  caption; the R16.2 chrome face is the current law (the language toggle top-right in
  `#controls`; «Залы» on the corner stack's base) and the clock-row season voice (§0.1-5).
- Keep the ink-and-underline focus law, including its forced-colors exception.
- No backend, telemetry, new persistence, WebGPU switch or runtime dependency.

## §3 Automatic tier policy — amendment R17-A

The host samples capabilities before presenting the first frame. Resolution order remains:

1. Explicit valid `q` override: apply and persist through the existing law.
2. Valid persisted override: apply it, including on phones.
3. Deterministic boot without either override: T1, probe skipped.
4. Otherwise apply the new automatic policy below.

Constants defined here:
`MOBILE_AUTO_TIER = 't0'; AUTO_LOW_MEMORY_GIB = 4; MOBILE_COARSE_QUERY = '(any-pointer: coarse)'`.
The memory boundary remains strictly below 4. A coarse-pointer match OR the existing
low-memory fact settles T0 without starting a probe. Otherwise run the existing T2-surface
probe and classifier unchanged. Missing memory stays `null`, not zero. Screen width, UA
strings and CPU-core count do not select a render tier. This deliberately includes touch
laptops and tablets. A user's `q` override still wins. Capability changes, rotation and
browser-bar resizing never initiate another probe or change a settled tier. Existing
redirect-style `q` handling and `q=auto` clearing/no-reprobe semantics remain verbatim; this
proposal does not rewrite boot persistence semantics.

On common phone dimensions, T0 and T1 already have identical DPR-1 buffers and 1 K shadows
(verified: at ≤ ~0.79 M css px both tiers clamp to dpr 1 before the buffer cap binds). The
immediate saving is avoiding T2 surfaces/shadows, especially during boot — not a new LOD. A
sky-only rAF median is not a measurement of room GPU cost. Calibration remains parked. Add
HUD-only selection-source/probe-count diagnostics; never invent a median for a skipped
probe.

## §4 Touch rail surface — amendment R17-B

Add one separate navigation group, `#touch-rail`, with native Back and Forward buttons. Show
it when any coarse pointer is available OR viewport width is at most 767.98 CSS px.
Visibility is independent of quality; a narrow mouse window gets controls, not forced T0.
When absent, the group is absent from layout, focus order and the accessibility tree. Place
its horizontal pair on the left, centered in the free vertical band between the
wordmark/clock/scrub block and the notes link. It is not a corner-stack member or clock row.

Constants defined here, in CSS px:
`TOUCH_BUTTON_MIN_INLINE_PX = 72; TOUCH_BUTTON_MIN_BLOCK_PX = 44; TOUCH_RAIL_GAP_PX = 8;
TOUCH_RAIL_INSET_PX = 24; TOUCH_RAIL_CLEARANCE_PX = 16; TOUCH_RAIL_MAX_WIDTH_PX = 767.98`.
Use the larger of the left inset and the applicable safe-area inset. Maintain clearance from
both existing blocks; measure layout only on layout changes, not in the render loop.
Insufficient space is a failed layout gate, not permission to hide essential navigation. Use
the existing chrome typeface, size and focus treatment: visible words, no boxes, background
panel, progress text or revived caption. Reserve the group's geometry while busy. These new
44-px targets do not resolve or retune the parked global 24-px accessibility item. Do not
move existing chrome or add `viewport-fit=cover` to accommodate this addition.

## §5 Travel and pointer laws

Each accepted button activation invokes the existing `stepStop` direction and
arrow/door boundary resolution. There is one route graph, not a second mobile graph. At a
boundary, the next deliberate activation enters the adjoining room through its existing
airlock. The square's outer end and the 1812 terminal (M4) end remain inert in their outward
directions (the committed RAIL_CHAIN law). Admission requires settled arrival, no transit,
no glide, no active canvas gesture and no menu owning input. Drop rejected activations;
never queue them across arrival or airlocks (the app's deliberate input-dropping policy —
the r7 CI record). Use `aria-disabled` with guarded handlers so focus survives temporary
unavailability. One native click is one command: no pointerup-plus-click double dispatch,
hold-repeat or swipe momentum. Suppress repeat-key activation on these buttons; keep native
Enter/Space. Reduced motion uses the existing immediate step law; two distinct taps remain
two intents.

NOTE (the integration's named difference, §0.1-6): the existing arrows admit input
mid-glide (the wheel retargets an open glide; `stepStop` steps FROM a glide's target); the
button gate above is stricter. If the owner prefers one admission law everywhere, the
design accepts that amendment without changes elsewhere.

Canvas drag remains look-only. Preserve 30°, touch ×1.15 and τ=100 ms; preserve mouse/pen
sensitivity, 1,400-ms steps, 320-ms scroll glides and the 1,200-px wheel segment budget.
Wheel-edge's 650/120/420 thresholds and existing keyboard travel are not retuned. Track
client coordinates, never `movementX/Y` (the r21 lesson). Admit one primary contact; mouse
starts require its primary button (new: today's pointerdown checks none — §0.1-6). A second
touch cancels looking and cannot replace the anchor; re-arm only after the touch sequence
ends. Recheck readiness on every move (new for the canvas — §0.1-6). Cancel/release
idempotently on pointercancel, lost capture, blur, hidden document, resize and transit
start. No cancelled contact, stale delta or resumed tab may generate travel.

## §6 Discovery, copy and hint contract — amendment R17-C

The persistent Back/Forward pair is phone onboarding; there is no new instructional overlay.
Keep the hint hidden through 767.98 px. Keep its eligibility, absorbing dismissal, timers
(6,000/1,200/240 ms), reduced-motion cuts and det exclusion unchanged. New button intents
call `hintTravel` before admission, as existing dropped intents do. Looking still dismisses
it: the existing dismissal contract is broader than literal travel.
THE CORPUS FACT (§0.1-1): the current fine-pointer hint already reads
`chrome.travelHint: 'Прокрутите, чтобы идти · потяните, чтобы осмотреться'` /
`'Scroll to walk · drag to look around'` — truthful today. The OWNER CALL is keep vs adopt
the design's tweak below; the baseline estimate in §13 drops the «hint copy» clause if
kept. Proposed (optional) fine-pointer tweak: RU «Прокрутите, чтобы двигаться. Потяните,
чтобы осмотреться.» / EN "Scroll to move. Drag to look around." At wider coarse-pointer
layouts use `chrome.travelHintTouch`.

Proposed new dictionary pairs (repo namespaces per §0.1-7; RU-first, NBSP law):

| Key | RU | EN |
| --- | --- | --- |
| chrome.touchRailLabel | Движение по маршруту | Tour navigation |
| chrome.touchRailBack | Назад | Back |
| chrome.touchRailForward | Вперёд | Forward |
| chrome.travelHintTouch | Нажмите «Назад» или «Вперёд», чтобы двигаться. | Tap Back or Forward to move. |
| chrome.sceneUnsupported | Для просмотра нужен браузер с поддержкой WebGL2. | This tour requires a browser with WebGL2 support. |
| chrome.sceneInterrupted | Сцена недоступна. Перезагрузите страницу. | The scene is unavailable. Reload the page. |
| chrome.sceneReload | Перезагрузить | Reload |

Reuse equivalent existing keys where present. Keep `#caption-live` as the stop announcement,
not a second live region announcing every animation frame. Native button names contain
their visible text.

## §7 Browser ownership and lifecycle

R17-C also changes canvas `touch-action` from `none` to `pinch-zoom`: one-finger panning
remains app-owned; browser pinch zoom remains browser-owned. No application
pinch-to-travel handler. Keep the viewport meta unrestricted. Real Safari verification is
mandatory for this change. Modal/listbox input and scrub gestures must not leak into rail
handlers or canvas capture. Rotation reapplies the existing viewport/scale law, without
reclassification. Browser zoom must not multiply renderer scale by `visualViewport.scale`.
Check browser-bar changes and safe areas natively; no silent chrome relocation or
resolution-law amendment is authorized. An accepted glide may finish under existing resume
timing; a suspended gesture cannot add one. On unavailable WebGL2 show the localized
unsupported state (no such screen exists today — new UI, §0.1-7 keys). On context loss
cancel input, announce interruption once and offer Reload of the existing URL. Do not
invent `stop=` writes or promise position restoration beyond existing URL semantics.
In-place recovery is not part of this design. An unrequested context loss during a device
gate fails that gate.

## §8 Alternatives considered

Fixed rubric: discoverability; preservation of existing laws; machinery cost; evidence
burden.

| Alternative | Discovery | Preservation | Machinery | Evidence |
| --- | --- | --- | --- | --- |
| Native step buttons, chosen | Persistent, named | Keeps drag-look | Small adapter | Existing rail + native taps |
| Vertical swipe travel | Hidden without teaching | Steals vertical look | Axis lock, thresholds, cancellation | New motor tuning |
| Two-finger travel | Poor reach/discovery | Conflicts with browser pinch | Multi-contact recognizer | Native accessibility risk |
| Door button alone | Discoverable only at ends | Unchanged | None | Cannot reach interior stops |
| Retain phone sky probe | No UI change | Existing boot | None | No room-load predictive evidence |
| Conservative auto T0, chosen | No extra UI | Preserves tier numbers | Boot branch | Still requires real devices |
| Adaptive in-tour quality | Invisible | Breaks settle-once law | Hysteresis, reallocations | Thermal/motion tuning |

Buttons trade continuous touch travel for reliable, discoverable coverage of the existing
stop-based tour. This is an explicit product choice, not a claim that swipe travel shipped.

## §9 Mobile floor and Phase-4 exit — amendment R17-D

Define `MOBILE_FRAME_WINDOW_MS = 60,000; MOBILE_FRAME_P95_MS = 33.0; MOBILE_FRAME_P99_MS =
50.0; MOBILE_LONG_TASK_MS = 50.0; MOBILE_CAPTURE_REPEATS = 3`. Use nearest-rank percentiles
of foreground rAF intervals, separately per scenario/window. Every required window must
pass; aggregate medians cannot conceal a slow room or transit. Report p50/p95/p99/max,
sample count and count above 33 ms. rAF cadence is not GPU time. A sustained 33.33-ms
cadence fails the literal 33.0 threshold; do not round it into a pass. The existing
«never break» sentence specifies no statistic. This proposal interprets the floor as
worst-window p95, with a p99 guard — not an every-frame guarantee. If «never» means
maximum, this is a relaxation requiring explicit ratification. Until then report data only.
Post-load CPU tasks over 50 ms must be zero; initial exterior settlement ends the load
exemption. Subsequent room fetch/decode/compile/transit work receives no new exemption.
Absent Long Tasks API support means unknown; obtain a native trace, never report zero.
Keep peak draws ≤250 and texture ledger ≤256 MB; apply the existing 1.0-M triangle ceiling
to T0 too. Ledger accounting must reflect actual device transcode formats. Record MSAA
samples and drawing-buffer dimensions separately; compressed payload is not GPU allocation.
Propose `MOBILE_FIRST_EXTERIOR_MS = 3,000` at 10 Mbps and 100-ms RTT, extending — not
relaxing — the reference's first-exterior target to mobile. Measure an exterior frame, not
DOM title paint. Phase-4 exit is conjunctive: mobile certificate + all existing
budgets/gates + Lighthouse accessibility ≥95 on each of four routes in RU and EN +
keyboard-only 18-stop tour + honoured reduced motion. The a11y round supplies its audits
and open-control/focus/SR checks. Revalidate affected physical-device scenarios after the
Neva facade lands; mobile's first pass cannot certify the eventual Phase-4 tree. WebGPU
evaluation is not a substitute.

## §10 Native-device certificate — amendment R17-E

Required: one named low-end Android phone and the owner's identified iPhone/Safari, plus
unchanged reference-Mac regression gates. Proposed Android sentinel: Galaxy A13 4G
SM-A135F, 4-GiB variant; **verify its actual model/SoC before adoption** (owner call). RAM
alone does not define low-end. A substitute requires owner approval of its hardware class.
No physical low-end phone means «floor pending», not an emulation-based pass. Windows
native-control checks remain an a11y rider.

Record commit/build, device model, SoC/GPU where available, RAM, OS/browser, refresh
behaviour, CSS viewport/native DPR, coarse-pointer result, memory API value, tier/source,
actual buffer, AA samples, shadow size, ledger peak, power/thermal conditions and cold/warm
cache state. Capture clean-profile auto and explicit `q=t0`. Do not use `det`; do not erase
a visitor override. Pin the existing summer epoch `2026-06-21T12:00:00Z` (15:00 Petersburg
local), **winter day `2026-01-15T10:00:00Z`** (§0.1-2 — the committed README anchor,
13:00 local) and winter night `2026-01-15T18:00:00Z` (21:00 local). For each room and epoch
collect three 60-second windows including resting, looking and stepping. Cover all 18 stops
and both directions of every airlock; record transition windows separately, including cold
room entries. Include landscape, browser-bar changes and resume. At least one capture per
scenario follows `MOBILE_SOAK_MS = 1,200,000` (20 minutes) of active touring. Keep every
planned result; a failed warm run cannot be replaced by a favourable cold run. Visibility
interruption invalidates the whole window; unexplained foreground stalls count. Use the
existing build-time `VITE_PERF_LOG` opt-in for bounded capture and explicit export. No
analytics, automatic upload or localStorage report store. Preserve raw intervals and trace
references alongside a machine-readable report; overflow invalidates a capture.

Proposed narrow power-law exception: physical phones run unplugged, normal-power mode,
50–80% battery, 20–25°C ambient, no external cooling. Record battery and thermal warnings.
The controller/reference Mac stays quiet and on mains; its gate law is unchanged. This
exception requires ratification because mains-only is current house law. Low-power mode and
untested devices remain stated riders, not certified conditions.

## §11 Budgets and accounting

Hard ceilings remain: all JS chunks together 350,000 B gzip; RU 12,000 B; exterior
4,000,000 B; rastrelli 2,000,000 B; jordan 7,000,000 B; military-gallery 4,000,000 B. No
asset increases are authorized in this build. Keep the current basis payload at 584,862 B
or less. Current JS/RU baselines are **274,707/6,962 B** (§0.1-8). §15 allocations are
ceilings, not size predictions. Diagnostics must be removable from the ordinary build;
count anything retained in every chunk.
THE BASIS DISCREPANCY IS RESOLVED (§0.1-4): 600,000 B is enforced (common.mjs — the
trajectory of `collectPayloadRows`); the stale 500,000 header comment is corrected in this
commit. AND THE HEADROOM FACT: rastrelli holds **1,761,050 B** headroom today (238,950 used
of 2,000,000 — §0.1-3), not the brief's «239 KB». No failure authorizes larger budgets,
disabled MSAA, smaller §11 numbers or new asset tiers.

## §12 Executable coverage specification

Pure Vitest tests cover the automatic-policy truth table, override/det precedence,
unavailable memory, pointer-session admission/cancellation and button locking. Existing
scale, classifier, look, wheel-edge, hint and §11 tests remain pinned. Tests stay in
`tests/`, node-only, no jsdom. Keep the existing 734-pass/1-skip baseline as history, not a
claim about this unbuilt design. Add exactly 20 Chromium test cases in `mobile-tier.spec.ts`
and `touch-rail.spec.ts`:

- Four tier cases: coarse/null-memory auto; fine-pointer real probe and low-memory branch;
  det/explicit override precedence; persisted override and redirect/`q=auto` lifecycle.
- Four room cases traverse every stop forward/back using actual button taps.
- Three connection cases exercise each airlock in both directions using the same buttons.
- Nine cases: terminal locks; rapid activation/reduced motion; look-only/multitouch;
  cancellation/resume/rotation; native keyboard/focus; menu/scrub ownership; context loss;
  RU geometry; EN geometry.

Extend the existing chromium project's `testMatch` to include both files; CI already
selects that project. Planned total: 40 existing + 20 = 60. Keep workers=1, retries and
timeouts. Use touch-enabled Chromium contexts, native DPR 3 and browser-dispatched touch
input, not only `dispatchEvent`-created PointerEvents. Retain a fine-pointer context for
the probe case. Exercise 320×568, 360×744, 744×360, 844×390 and the 767/768 width boundary
in geometry cases. Use `hud=1` for observable rail/settle/source contracts; wait on
readiness, not fixed sleeps. Assert actual buffer caps, no overflow/overlap, focus
retention and no accidental second step. These checks prove wiring and layout, never native
Safari behaviour or a hardware frame floor.

## §13 Golden and gate consequences

Existing main-page fixtures retain their fine-pointer, real-probe boots even at width 360.
Do not replace them with det or coarse-pointer contexts. New touch cases use their own
policy. Expect ten existing DOM baselines to change: eight main-page fixtures from the
controls face (and, only if the owner adopts it, §6's optional hint tweak), plus the two
360-px 1812 fixtures from controls. Notes fixtures remain unchanged. Add four DOM fixtures:
coarse 360×744 and 844×390, each RU/EN, DPR 3, fixed `at`, real auto boot. Their canvas and
HUD remain hidden. Planned golden-project total: 33 + 4 = 37. DOM comparison remains
`maxDiffPixelRatio: 0` with visual reading. Existing scene goldens must stay unchanged; new
overlay exclusion is explicit where needed, never a scene-wide mask. No scene re-baseline
is authorized. Target fixture updates narrowly; restore unintended scene baseline drift
from git. A real scene change requires its own explicit DEC and 1% discipline. Author
targeted checks before the round's full gate. Full e2e runs once per round, background,
without an imposed gate timeout, quiet and on mains; a second full run only after failure;
two consecutive failures require a flake fix. Free port 4173 afterwards. Device sampling
repetitions are protocol captures, not permission to rerun the full suite until green.
(SEQUENCING NOTE (integration): the R16.2 chrome swap riding the working tree rewrites the
same ten baselines in its own delivery first — Mobile-B must not duplicate that work.)

## §14 Implementation boundaries

- `src/engine/tier.ts`: §3 pure decision on injected capability facts; existing numbers
  intact.
- `src/camera/touch-input.ts`, if extraction is needed: §5 pure admission/session
  decisions.
- `src/main.ts`: §§3–7 host adapters, shared step dispatch, cancellation and recovery UI;
  §§9–10 diagnostic capture. DOM, capability reads and clocks belong here, not pure laws.
- `index.html` and `src/style.css`: §§4, 7 navigation placement, browser gesture ownership.
- Existing dictionaries and hint bindings: §6 copy only; hint state law stays unchanged.
- `tests/` and `tests/e2e/`: §§12–13; `playwright.config.ts` includes the new cases
  explicitly.
- Performance report schema/aggregation: §§9–10; no production service or runtime package.
- Architecture/state records: adopted policy and evidence links; never mark pending gates
  met.

Every described source/test file follows the standing protocol: leading section citation,
named exports, no enums, `satisfies`/`import type`, strict null handling, preserved law
comments, Biome style and the unchanged purity fence. Material/cache-key/GLSL agreement
remains untouched.

## §15 Implementation round map and declared ceilings

These are mobile subrounds; the orchestrator assigns relay numbers after ratification.

| Round | Deliverable | JS gzip ceiling | RU ceiling | Chromium / golden cases |
| --- | --- | ---: | ---: | ---: |
| Mobile-A | Auto policy, diagnostic facts, four policy cases | 278,707 B | 6,962 B | 44 / 33 |
| Mobile-B | Touch rail, cancellation, copy, recovery, fixtures | 284,707 B | 7,462 B | 60 / 37 |
| Mobile-C | Capture/export, native evidence, certificate | 285,707 B | 7,462 B | 60 / 37 |

(The baseline raised to §0.1-8's fresh +1.) All payload ceilings and §11 values stay fixed
throughout. Missing devices leave Mobile-C incomplete. A hardware failure produces a
measured diagnosis and another ratified amendment, not automatic quality adaptation or
ceiling relaxation. Then resume the queued a11y pass, Neva facade and WebGPU ADR; rooms
finishing remains after the whole Phase-4 queue.

## §16 Owner ratification register

- **R17-A**: conservative coarse-pointer/low-memory pre-probe T0, including touch laptops;
  explicit overrides and det precedence unchanged. This replaces universal auto probing.
- **R17-B**: «touch rail» means discrete native buttons, their left free-band placement,
  visibility rule and new-target dimensions. Continuous touch travel is not promised.
- **R17-C**: the truthful-hint CONTRACT (the existing copy already truthful — the call is
  keep vs the optional tweak), named RU/EN pairs (`chrome.*` namespaces),
  input admission/cancellation (incl. the no-glide button gate — see §5 NOTE), and canvas
  pinch-zoom ownership. No restoration of mobile hint or captions; no global target-size
  pass.
- **R17-D**: explicit percentile interpretation of 33 ms, p99/long-task gates, T0 triangle
  limit and the proposed 3-second mobile first-exterior gate. All are unmeasured proposals
  today.
- **R17-E**: named low-end sentinel (verify the Galaxy A13 4G hardware before adoption),
  identified iPhone, native capture matrix, battery-only handset exception and the limited
  certificate scope. Mains-only desktop gates survive.
- **R17-F**: round allocations, 20 new functional cases, four new fixtures and narrowly
  scoped fixture re-baselines; no scene DEC. Basis enforcement resolved (600,000 B).
  Ratification authorizes implementation, not a performance claim. This document contains
  no new measurement and cannot close either Phase-4 exit checkbox by itself.

## §17 Ratification record (2026-10-30, the owner's verdict through the question tool)

ALL SIX §16 CALLS ADOPTED as recommended, with one resolution recorded:

1. **R17-A ADOPTED** — the conservative pre-probe T0 at coarse pointer or RAM < 4 GiB;
   touch laptops included; probe/ladder/§11/`?q=`/det precedence untouched.
2. **R17-B ADOPTED** — the touch rail = the native Back/Forward pair, left free-band
   placement (not a corner), the visibility rule, the 72×44 targets; drag stays look-only;
   continuous touch travel is not promised.
3. **R17-C ADOPTED IN FULL** — browser pinch-zoom (canvas `touch-action` none →
   pinch-zoom), the admission/cancellation laws (one primary contact, per-move readiness
   re-check, the cancellation surfaces; the no-glide button gate per §5 NOTE stands as
   designed), Safari verification mandatory.
4. **R17-C COPY KEPT** — «Прокрутите, чтобы идти · потяните, чтобы осмотреться» /
   «Scroll to walk · drag to look around» stays VERBATIM; the design's optional tweak is
   REJECTED; the §13 baseline estimate drops the hint-copy clause (the ten DOM baselines
   move from the controls face only, plus the four new coarse fixtures in Mobile-B).
5. **R17-D ADOPTED (p95+99)** — the floor statistic is now the law's stated form:
   per-scenario 60-second windows, nearest-rank p95 ≤ 33.0 ms with the p99 ≤ 50 guard,
   zero post-load long tasks > 50 ms, `MOBILE_FIRST_EXTERIOR_MS = 3,000` at 10 Mbps/100 ms.
6. **R17-E ADOPTED (A13 + iPhone)** — the Galaxy A13 4G SM-A135F 4-GiB sentinel (verify its
   model/SoC on the live device before adoption), the owner's iPhone, the soak protocol,
   the battery-only handset exception (50–80%, 20–25°C; the reference Mac stays on mains).
7. **R17-F ADOPTED** — the three-round map (Mobile-A/B/C ceilings 278,707/284,707/285,707
   JS; RU 6,962/7,462/7,462; case totals 44/33 → 60/37 → 60/37), the 20 new functional
   cases, the 4 new coarse fixtures, the no-scene-DEC rule, the basis resolution (600,000
   B enforced) standing done. Ratification authorizes IMPLEMENTATION, not a performance
   claim — §§9/10's numbers remain proposals until measured (the doc still closes no
   exit checkbox).

## CHALLENGES (the specialist's, dispositioned at integration)

1. «Drag to move closer» contradicts the supplied look-only pointer wiring — the design
   corrects that copy but preserves the broader first-intent hint-dismissal contract.
   **INTEGRATION: mooted (§0.1-1) — the current copy is already truthful; the tweak is an
   optional owner taste call.**
2. A sky-only rAF probe is not room GPU timing. Its Mac-calibrated thresholds,
   refresh-rate sensitivity, cold-start behaviour and thermal predictive value remain
   unvalidated on phones.
3. T0 is not an existing mobile asset tier. On small viewports its surfaces equal T1's;
   choosing its label cannot prove a performance improvement or satisfy the hardware exit.
4. MSAA was measured free on the reference Mac, not universally. Native AA allocation,
   shader cost, KTX2 transcode format and context-loss risk remain unmeasured.
5. Missing Safari deviceMemory cannot establish low memory. Coarse-pointer selection is a
   conservative policy, not GPU detection; touch laptops are intentionally affected.
6. The proposed buttons, 1,400-ms stop cadence, left-side placement and short-landscape
   clearances lack owner/native-phone validation. Fresh corner-stack verdicts remain
   intact.
7. Native pinch zoom, pointer cancellation, browser-bar resizing, safe areas, zoomed
   layouts and VoiceOver interaction require actual Safari checks; Chromium emulation
   cannot certify them.
8. «≤33 ms, never break» has no established statistic. Worst-window p95 is an explicit
   ratification call, not equivalent to maximum frame time. Sustained 30 Hz would fail
   33.0 ms.
9. The mobile 3-second startup requirement and measurement matrix are proposed acceptance
   criteria, not results. Native trace availability, especially on the owner's iPhone, is
   unknown.
10. The proposed Android sentinel has not been supplied or measured; the iPhone model is
    unknown. Other Android GPUs, low-power modes and Windows remain outside this
    certificate.
11. Battery-powered phone capture deliberately needs a narrow exception to the mains law;
    thermal soak, ambient conditions and charging effects have no existing repo
    measurements.
12. ~~The basis header and shared constant disagree.~~ **RESOLVED at integration
    (§0.1-4: 600,000 enforced, the stale comment corrected).** Also,
    2,000,000 − 228,982 leaves 1,771,018 B, not 239 KB. **INTEGRATION: corrected to the
    fresh measurement (238,950 used → 1,761,050 free).** Neither discrepancy authorizes
    budget relaxation.
13. The fixture's «noon» epoch is 15:00 in Petersburg at +03. Its bytes remain unchanged;
    the new device matrix labels local times explicitly.
14. Lighthouse has no recorded baseline. Keyboard/SR quality is not established by its
    score, and a pre-Neva mobile pass cannot certify the final Phase-4 rendering workload.
15. All allocations, case counts and baseline changes above are prospective. No repository
    inspection, implementation, test, device measurement or gate run was performed by the
    design round (the integration's fact-checks above are the orchestrator's).

## §18 Mobile-C capture and export protocol

### §18.1 Scope, boundaries and declared constants

This amendment specifies an instrument and an evidence protocol, not a measured result. §9’s
numerical proposals, the interpretation of “never”, and §10’s pending owner decisions remain
unresolved by implementation alone. No Phase-4 exit checkbox is closed here.

Host adapters, capability reads, clocks, observers, browser-native file operations and explicit
commands belong in `src/main.ts`. New named-export, side-effect-free modules
`src/perf/mobile-capture.ts` and `src/perf/mobile-report.ts` own injected-input state transitions,
validation, aggregation and report types. Both receive the §12 purity fence. No runtime package,
production service, new route, Chromium case or DOM fixture is introduced.

Reuse, without redeclaration or changed meaning, `MOBILE_FRAME_WINDOW_MS`, `MOBILE_FRAME_P95_MS`,
`MOBILE_FRAME_P99_MS`, `MOBILE_LONG_TASK_MS`, `MOBILE_CAPTURE_REPEATS`, `MOBILE_FIRST_EXTERIOR_MS`
and `MOBILE_SOAK_MS`. The only new constants are:

```
/** §9/§10, implemented by §18: storage bounds, not performance-floor amendments. */
export const MOBILE_CAPTURE_MAX_FRAMES = 32_768;
export const MOBILE_CAPTURE_MAX_RECORDS = 4_096;
export const MOBILE_CAPTURE_MAX_BYTES = 8_388_608;
```

All new host state, registration and calls are guarded by the existing build-time `perfLog`
constant, declared before every reference. Pure imports must be eliminable with those branches.
Ordinary-build residue is intended to be **zero**, including emitted diagnostic assets; the
allowance is not permission to retain an exporter. Absence tokens are `__H3D_MOBILE_C__` and
`h3d-mobile-c/v1`; ordinary emitted assets must contain neither, and their module graph must contain
neither new module. Preserve the existing sky, rolling-window and transit console formats
byte-for-byte; new diagnostic lines never contain `frames · avg`.

The mechanical round must measure absence and gzip afresh. The ratified round map’s Mobile-C
standing ceiling is 285,707 B total JS gzip (the §0.1-8 baseline 274,707 + the A/B/C allocations
4,000/6,000/1,000; today’s actual is 276,757), additionally subject to the overall ceilings; RU has
no planned increase. These are verification requirements, not measurements performed by this
amendment.

### §18.2 Scenario and planned-result model

- Before measurement, export an immutable plan derived from the actual committed room/stop/airlock
  inventory. Do not invent room names, airlock endpoints, epoch-selector parameters or route paths
  from this brief. Inventory resolution and the existing epoch-selection mechanism are
  implementation prerequisites.
- A frame scenario is either one **room** or one **directed airlock** under one device, selection
  mode and pinned epoch. Selection modes are clean-profile auto and explicit `q=t0`. Epochs are
  exactly `2026-06-21T12:00:00Z`, `2026-01-15T10:00:00Z`, and `2026-01-15T18:00:00Z`.
- Every frame scenario has three planned 60-second slots. A room slot is composite: first third
  resting, second third looking, final third stepping along a predeclared legal intra-room
  itinerary. Every repeat contains all three activities; these are not three separate scenario
  populations. Actual activity and accepted stop changes are recorded, not inferred from elapsed
  time.
- The union of observed stops must cover all 18 stops for each device × selection × epoch. A room
  without a legal intra-room stepping itinerary is an unresolved matrix requirement, not permission
  to count a rejected step or an airlock as an intra-room step.
- Each directed airlock has repeat 1 with a demonstrably unprepared destination and cold destination
  assets, then repeats 2–3 with warmed destination assets. Record readiness separately: warm HTTP
  assets do not imply a resident or ready room. Trigger the one designated transit immediately after
  capture admission; it must begin and finish inside the recorded span. No second transit belongs in
  that slot.
- Repeat 3 of **every scenario** follows at least `MOBILE_SOAK_MS` of evidenced active touring. One
  continuing thermal session can serve multiple repeat-3 slots; passive waiting, hidden time and
  export administration do not earn soak time. A reload may preserve the physical thermal session
  only with externally continuous evidence; it does not preserve an in-memory counter by itself.
- Predeclare one suitable room per selection × epoch as the manipulation sentinel. Its repeat 1 is
  landscape; repeat 2 includes actual browser-bar/viewport changes; repeat 3 starts after resume and
  remains post-soak. These are overlays on the three room slots, not a favourable additional
  population. All other room slots use the declared baseline orientation.
- Immediately before each sentinel resume slot, perform a separately planned visibility-interruption
  probe. Its expected outcome is invalidation; it is expressly **not a required floor window**.
  Preserve its result. The following resumed window is a normal required floor window.
- First-exterior probes are separate navigation scenarios, not 60-second frame windows. Plan three
  cold navigations per device × selection × epoch, with the third post-soak. Their network and
  presentation evidence must qualify independently.
- Freeze slot IDs, cache intents, itineraries, manipulation assignments and repeat numbers before
  results exist. Retries have new attempt IDs and link their original slot. They never overwrite
  results or clear a valid measured exceedance. An invalid attempt cannot fulfil a slot; a
  same-condition retry may supply missing evidence, but every invalid/lost attempt remains visible
  and accounted for. An unexplained stall is not an invalidation excuse.

### §18.3 Explicit control and bounded acquisition

The command surface is `globalThis.__H3D_MOBILE_C__`, present only in the opt-in build. Its
operations are `loadPlan`, `begin`, `abort`, `endVisit`, `prepareExport`, `exportPrepared`, and
`verifySaved`. Commands accept the schema’s IDs and records; malformed commands fail without
advancing the plan. `loadPlan` never starts collection. `begin` explicitly authorizes one bounded
capture; its automatic boundary detection is part of that request, not autonomous capture
scheduling.

There is **no in-page diagnostic UI**, capture route, gesture alias, or interception of tour
controls. The owner uses a remote console or owner-installed command bookmarklets invoking the same
surface. Bookmarks contain commands/plan metadata, not captured reports. Browser-native
save/share/open-file dialogs are explicit file transport, not a performance readout. URL parameters
continue to select existing application state; changing a query or reloading is not a
capture-control channel.

Bookmark execution, native file selection and user-activated export must be preflighted on the
actual browser. A locked browser that rejects them and has no usable console connection cannot
execute the disconnected protocol under the current no-UI law: its capture/export gate is
**pending**, not silently replaced by a diagnostic panel. No CSP or browser security setting is
weakened to make commands work.

### §18.4 Caps and retention lifecycle

`MOBILE_CAPTURE_MAX_FRAMES` bounds raw rAF-interval rows **per bounded frame attempt**, including an
interruption probe. It does not bound a scenario’s three repeats collectively. Navigation probes
have no fabricated interval stream. `MOBILE_CAPTURE_MAX_RECORDS` bounds **one visit artefact**:
count every JSON object node except objects inside `rawIntervals` subtrees. Nested ledger, transit,
evidence and terminal objects count; arrays themselves do not. A visit contains exactly one attempt.
Plan/index artefacts are not visit records. `MOBILE_CAPTURE_MAX_BYTES` bounds the exact UTF-8 JSON
bytes **per exported artefact**, including its envelope, escaping and terminal records—not the whole
campaign or referenced native files. Enforce the prospective visit size during acquisition. An
oversize plan/index is rejected without altering captures; it cannot be truncated into an apparently
complete export. Indexes may have explicitly numbered parts. The twelve device-scope passes
therefore use separate verified visit files: even four rooms yield approximately 43,200 raw rows per
pass at 60 Hz, before airlocks. Export and verify each closed visit before admitting another.
Release that visit’s buffers only after verification; retain no growing in-memory archive. A
complete external index joins the immutable plan, every registration/attempt and all referenced
files. Verified files must be retained for the whole pass. Reserve capacity for the bounded
terminal/overflow record before admission. The first required acquisition append exceeding any cap
stops acquisition and invalidates **that attempt**; retain its accepted prefix and record the
violated cap, retained amount and at least one rejected item. Prefix statistics cannot qualify a
window. Earlier verified attempts remain untouched. Oversize command arguments fail validation
before mutation, rather than causing retrospective capture invalidation. Register each attempt ID
externally before `begin`. Reload, process death or loss of an unverified file cannot erase that
registration: reconcile it as lost, or pending while recovery remains possible. Missing files, index
parts or registrations prevent completeness. Neither a later retry nor an index regeneration removes
a valid measured exceedance.

### §18.5 Observation and assessment semantics

Frame admission establishes a foreground rAF baseline. The terminal sample is the first foreground
rAF at or after baseline plus `MOBILE_FRAME_WINDOW_MS`; retain its entire interval, including
boundary overshoot. Never clamp a stall, substitute refresh-rate estimates, or splice across
visibility interruptions. Record nominal and actual boundaries. For sorted intervals, nearest-rank
percentile uses the element at one-based rank `ceil(p × N)`; zero samples yield unknown, not zero.
Compare unrounded values; count intervals strictly above `MOBILE_FRAME_P95_MS`. Activity thirds use
the nominal window boundaries, but activity segments, accepted/rejected steps, initial stop,
orientation and viewport changes come from observations. Terminal overshoot earns no missing third.
Validate the legal itinerary, all three activities, transit containment and sentinel overlays
independently of timing statistics. Unexplained foreground stalls remain measurements, never
invalidation reasons. Outside bounded captures, soak credit requires external active-tour evidence;
hidden time, administration and passive waiting earn none. Long-task coverage records its actual
span and completeness after observer drainage. Only initial exterior settlement ends the load
exemption; no subsequent fetch, decode, compile or transit restarts it. A task longer than
`MOBILE_LONG_TASK_MS` intersecting post-settlement coverage counts, including a task straddling
settlement. Unsupported, uncertain or incomplete API coverage leaves the API count unknown and
requires native evidence; separately assessed native coverage may resolve the CPU gate without
changing API support or inventing API zeroes. Each required window independently assesses p95/p99,
post-load tasks and graphics ceilings; no median or pooled percentile substitutes. Peaks cover the
observed window, not rolling-display averages. Preserve the existing ledger unit convention; if its
byte conversion or accounting is unresolved, its gate stays pending. Numerical assessment, protocol
qualification and owner ratification remain separate; this amendment closes no exit gate.

### §18.6 Command exits and explicit file transport

All replies carry command ID, lifecycle state and `ok`, `pending` or `error`, with a reason.
`loadPlan` validates and freezes the actual-inventory plan; replacement is forbidden while an
attempt or unverified artefact is held. Export and verify the plan before measurement. `begin`
validates the registered attempt, original slot, scope and same-condition retry link, then
authorizes only that bounded acquisition; its reply identifies admission, or a pending admission
without claiming collection has begun. `abort` stops acquisition, retains its prefix and returns the
invalid terminal result; it never means discard. `endVisit` seals a stopped attempt after evidence
reconciliation. Called before a required boundary, it stops and invalidates the attempt as ended
early. Supplemental external evidence may fill absence fields, but never rewrite measured rows. Both
operations return IDs and terminal state; unverified results still block the next visit.
`prepareExport` is allowed only for a plan, a sealed visit or an explicit index part. It validates
references, materializes stable JSON bytes and prepares the browser-native file object outside the
save gesture. It returns artefact ID, suggested filename, byte length, SHA-256 and retained counts.
Repeating preparation for the same artefact returns identical bytes; no collection or upload occurs.
The artefact’s own digest is outside its hashed bytes, in the preparation receipt and referring
index. `exportPrepared` must run through an actually supported, user-activated native
save/share/download path. It returns the selected transport and handoff status, never proof of
durable storage. Missing activation, unsupported transport, cancellation or unavailable
console/bookmark execution stay pending with an explicit reason. A transport I/O failure returns an
error while preserving the prepared artefact. There is no fallback diagnostic UI, automatic retry,
upload or persistent browser report store. `verifySaved` explicitly opens a native file-selection
dialog and reads the selected saved file—not the retained Blob. Bound its size before parsing;
compare byte length, SHA-256, version, artefact identity and plan reference against preparation. A
mismatch is a loud error and retains the buffer; cancellation/unsupported selection remains pending.
Success returns a receipt recording the actual basename, digest and verification time, then permits
buffer release. Verification of a JSON file does not verify referenced traces or the whole archive.
Use `h3d-mobile-c_v1_<planId>_<scopeId-or-all>_<kind>_<artifactId>.json`; identifier components must
be portable ASCII letters, digits, underscores or hyphens. Record browser-renamed basenames in
receipts. The exact top-level `format: "h3d-mobile-c/v1"` identifies every plan, visit and index
file. That string and the command-surface token are independently forbidden in ordinary emitted
assets. Malformed commands, illegal state transitions and inconsistent IDs fail without advancing
the plan.

### §18.7 Native traces and first-exterior evidence

Assign every native trace a stable `traceId` and retain its actual basename, byte length, SHA-256,
device/scope/attempt association, clock domain and exact event/time locator. Reports reference
files/IDs only, never a workstation path, upload URL or tooling-specific session handle. Record
clock correlations and uncertainty; absent correlation cannot establish a cross-clock duration.
Android/iOS provenance is explicit, but neither filename nor platform alone establishes coverage.
Tool-specific acquisition belongs to §19. Each first-exterior slot records its cold-navigation
evidence, navigation start, first demonstrably presented exterior frame, elapsed duration and
uncertainty, actual application/selection/epoch identity, network conditions, power and thermal
evidence. The third navigation must independently satisfy post-soak requirements. Evidence spanning
reload comes from an explicitly bounded external probe; post-navigation `begin` imports it under the
pre-registered attempt ID. Reload never arms collection, and a late command cannot reconstruct an
unobserved presentation event. Network records distinguish the ratified CDP reference method from a
phone-realised method, uncontrolled networking and unavailable evidence. Record the requested
10-Mbps/100-ms-RTT conditions, achieved or verified conditions, latency interpretation, provenance
and an explicit equivalence decision. A phone setting labelled “10 Mbps” is not reference
equivalence; unsupported shaping, missing calibration or unresolved owner acceptance remains
unknown/pending. Coldness must address relevant HTTP assets, decoded/resident state, service-worker
effects and navigation restoration independently. Presentation evidence distinguishes an actual
presented exterior frame from renderer submission or DOM paint. Only qualified network, coldness,
presentation and clock evidence can qualify the first-exterior comparison. Preserve a measured miss
even when qualification is unresolved; do not convert missing evidence into a pass. With timing
uncertainty, pass requires the complete uncertainty interval within `MOBILE_FIRST_EXTERIOR_MS`;
overlap with the threshold is unknown, not rounded down.

### §18.8 Requirements for the mechanical round

The ordinary build must produce zero fixed-string matches for `__H3D_MOBILE_C__` and
`h3d-mobile-c/v1` across **all emitted assets**, including emitted maps and diagnostic chunks; its
resolved module graph must contain neither `src/perf/mobile-capture.ts` nor
`src/perf/mobile-report.ts`. No exporter-only diagnostic asset may survive under another name.
Confirm `perfLog` declaration precedes every guarded reference, both purity fences apply, and
existing console formats remain byte-identical. Measure total JS gzip afresh using the established
round-map accounting: Mobile-C’s standing ceiling is **285,707 B**, additionally constrained by the
round-map and overall ceilings; RU has no planned increase. These are requirements, not results
reported here.

### §18.9 `MobileCReportV1` data contract

All fields below are required; use `not-applicable` only for genuine structural inapplicability,
`unknown` for unavailable/unestablished facts, and `pending` for outstanding evidence or decisions
with a stated next action. Empty arrays mean observed/declared emptiness only; completeness fields
prevent absence masquerading as zero. IDs resolve within the archive; timestamps identify their
clock. Construction uses `satisfies`, never assertions; no additional runtime constants are
declared. Mapping note: §9/§10’s combined observations are deliberately split into source versus
device-format ledger accounting, CSS versus drawing-buffer dimensions, API versus native CPU
evidence, and measurement versus qualification/ratification so none can silently stand in for
another.

```typescript
export type MobileCId = string;
export type MobileCJson = null | boolean | number | string | readonly MobileCJson[] | { readonly
[key: string]: MobileCJson };
export type MobileCField<T> = { state: "known"; value: T; evidenceIds: readonly MobileCId[] } | {
state: "unknown"; reason: string; requiredEvidence: readonly string[] } | { state: "pending";
reason: string; nextAction: string } | { state: "not-applicable"; reason: string };
export type MobileCDecision = { status: "pass" | "fail" | "unknown" | "pending" | "not-applicable";
reason: string; evidenceIds: readonly MobileCId[] };
export type MobileCEpoch = "2026-06-21T12:00:00Z" | "2026-01-15T10:00:00Z" | "2026-01-15T18:00:00Z";
export type MobileCSelection = "clean-profile-auto" | "explicit-q=t0";
export type MobileCRepeat = 1 | 2 | 3;
export type MobileCStamp = { clockId: MobileCId; atMs: number };
export type MobileCSpan = { start: MobileCStamp; end: MobileCStamp };
export type MobileCSize = { width: number; height: number };
export type MobileCFileRef = { artifactId: MobileCId; fileName: string; byteLength: number; sha256:
string };
export type MobileCEvidence = { id: MobileCId; source: "host" | "operator" | "external-file";
artifactId: MobileCId; locator: string; file: MobileCField<MobileCFileRef>; description: string };
export type MobileCClock = { id: MobileCId; kind: "performance" | "native" | "external";
timeOriginUnixMs: MobileCField<number>; resolutionMs: MobileCField<number> };
export type MobileCClockRelation = { id: MobileCId; fromClockId: MobileCId; toClockId: MobileCId;
offsetMs: number; uncertaintyMs: number; evidenceIds: readonly MobileCId[] };
export type MobileCTraceRef = { traceId: MobileCId; file: MobileCFileRef; platform: "android" |
"ios"; deviceId: MobileCId; scopeId: MobileCId; attemptIds: readonly MobileCId[]; clockId:
MobileCId; coverage: MobileCField<MobileCSpan>; locator: string; provenance: string; assessment:
MobileCDecision };
export type MobileCBuild = { commit: string; buildId: string; bundleSha256: string; dirty: boolean;
perfLog: true };
export type MobileCScope = { id: MobileCId; deviceId: MobileCId; selection: MobileCSelection; epoch:
MobileCEpoch; entryLocation: string; epochMechanism: string; epochInputs: readonly { name: string;
value: string }[]; evidenceIds: readonly MobileCId[] };
export type MobileCInventory = { commit: string; rooms: readonly { id: MobileCId; stopIds: readonly
MobileCId[] }[]; stops: readonly { id: MobileCId; roomId: MobileCId }[]; directedAirlocks: readonly
{ id: MobileCId; airlockId: MobileCId; fromRoomId: MobileCId; toRoomId: MobileCId; fromStopId:
MobileCId; toStopId: MobileCId }[]; evidenceIds: readonly MobileCId[] };
export type MobileCItinerary = { id: MobileCId; roomId: MobileCId; stopIdsInOrder: readonly
MobileCId[]; legality: MobileCDecision };
export type MobileCScenario = { id: MobileCId; scopeId: MobileCId; target: { kind: "room"; roomId:
MobileCId; itineraryId: MobileCId; sentinel: boolean } | { kind: "directed-airlock";
directedAirlockId: MobileCId } | { kind: "first-exterior"; exteriorRoomId: MobileCId } };
export type MobileCThirdPlan = { third: 1 | 2 | 3; activity: "resting" | "looking" | "stepping";
startOffsetMs: number; endOffsetMs: number };
export type MobileCCacheIntent = { kind: "room-baseline" | "cold-unprepared-destination" |
"warm-destination" | "cold-navigation"; httpAssets: "cold" | "warm"; decodedAssets:
MobileCField<"cold" | "warm">; destinationReady: MobileCField<boolean>; description: string };
export type MobileCSlot = { id: MobileCId; scenarioId: MobileCId; repeat: MobileCRepeat; gate:
"frame-floor" | "expected-invalidation" | "first-exterior"; thirds: readonly MobileCThirdPlan[];
cacheIntent: MobileCCacheIntent; baselineOrientation: "portrait" | "landscape"; manipulations:
readonly ("landscape" | "browser-bars" | "visibility-interruption" | "resume")[]; postSoakRequired:
boolean; precedingProbeSlotId: MobileCField<MobileCId>; parentFrameSlotId: MobileCField<MobileCId>
};
export type MobileCLimits = { frameWindowMs: number; p95Ms: number; p99Ms: number; longTaskMs:
number; repeats: 3; firstExteriorMs: number; soakMs: number; maxDraws: number; maxTriangles: number;
ledgerCeilingBytes: MobileCField<number>; ledgerUnitConvention: MobileCField<string>; ratification:
MobileCDecision };
export type MobileCPlanV1 = Readonly<{ id: MobileCId; frozenAtUtc: string; build: MobileCBuild;
devices: readonly { id: MobileCId; label: string; physicalPhone: true }[]; scopes: readonly
MobileCScope[]; inventory: MobileCInventory; itineraries: readonly MobileCItinerary[]; scenarios:
readonly MobileCScenario[]; slots: readonly MobileCSlot[]; limits: MobileCLimits; evidence: readonly
MobileCEvidence[] }>;
export type MobileCDisplay = { cssViewportPx: MobileCSize; nativeDpr: MobileCField<number>;
reportedDevicePixelRatio: number; coarsePointer: boolean; orientation: MobileCField<"portrait" |
"landscape">; nominalRefreshHz: MobileCField<number>; adaptiveRefresh: MobileCField<boolean>;
refreshBehaviour: MobileCField<string>; visualViewport: MobileCField<{ sizeCssPx: MobileCSize;
scale: number; offsetLeftCssPx: number; offsetTopCssPx: number }> };
export type MobileCProfile = { deviceId: MobileCId; model: string; soc: MobileCField<string>; gpu:
MobileCField<string>; ramGiB: MobileCField<number>; os: string; osVersion: string; browser: string;
browserVersion: string; userAgent: string; physicalPhone: true; display: MobileCDisplay;
deviceMemoryApiGiB: MobileCField<number>; jsHeapApi: MobileCField<{ usedBytes: number; totalBytes:
number; limitBytes: number }>; tier: MobileCField<string>; tierSource: MobileCField<string>;
probeCount: MobileCField<number>; selection: MobileCSelection; epoch: MobileCEpoch; actualLocation:
string; detUsed: false; cleanProfile: MobileCDecision; visitorOverrideBefore: MobileCField<string>;
visitorOverrideAfter: MobileCField<string>; overridePreserved: MobileCDecision;
rendererCapabilities: MobileCField<{ webglVersion: 1 | 2; precision: string; maxTextureSize: number;
maxTextures: number; maxSamples: MobileCField<number> }>; evidenceIds: readonly MobileCId[]; };
export type MobileCPowerPoint = { at: MobileCStamp; batteryPercent: MobileCField<number>; unplugged:
MobileCField<boolean>; normalPowerMode: MobileCField<boolean>; lowPowerMode: MobileCField<boolean>;
ambientC: MobileCField<number>; externalCooling: MobileCField<boolean>; thermalState:
MobileCField<string>; thermalWarnings: MobileCField<readonly string[]> };
export type MobileCThermalSegment = { span: MobileCSpan; activity: "active-touring" | "passive" |
"hidden" | "administration"; source: "authorized-visit" | "external-evidence"; creditedActiveMs:
number; evidenceIds: readonly MobileCId[] };
export type MobileCThermal = { sessionId: MobileCId; creditedBeforeAdmissionMs:
MobileCField<number>; segments: readonly MobileCThermalSegment[]; precedingEvidenceIds: readonly
MobileCId[]; reloadOccurred: boolean; externalContinuity: MobileCDecision; soakQualification:
MobileCDecision };
export type MobileCCache = { at: MobileCStamp; httpAssets: MobileCField<"cold" | "warm" | "mixed">;
decodedAssets: MobileCField<"cold" | "warm" | "mixed">; destinationResident: MobileCField<boolean>;
destinationReady: MobileCField<boolean>; serviceWorkerEffect: MobileCField<string>;
restoredFromBackForwardCache: MobileCField<boolean>; resourceCoverage: MobileCDecision; evidenceIds:
readonly MobileCId[]; qualification: MobileCDecision };
export type MobileCActivitySegment = { fromMs: number; toMs: number; activity: "resting" | "looking"
| "stepping" | "other"; roomId: MobileCId; itineraryLegIndex: MobileCField<number>; evidenceIds:
readonly MobileCId[] };
export type MobileCStopEvent = { atMs: number; fromRoomId: MobileCId; toRoomId: MobileCId;
fromStopId: MobileCId; toStopId: MobileCId; cause: "intra-room-step" | "airlock" | "other";
accepted: boolean; rejectionReason: MobileCField<string>; evidenceIds: readonly MobileCId[] };
export type MobileCViewportEvent = { atMs: number; display: MobileCDisplay; drawingBufferPx:
MobileCSize; browserBarsChanged: MobileCField<boolean>; evidenceIds: readonly MobileCId[] };
export type MobileCVisibilityEvent = { atMs: number; state: "visible" | "hidden" | "pagehide" |
"freeze" | "resume"; evidenceIds: readonly MobileCId[] };
export type MobileCRenderSample = { draws: number; triangles: number; ledgerBytes:
MobileCField<number>; drawingBufferPx: MobileCSize; msaaSamples: number };
export type MobileCRawInterval = { index: number; fromMs: number; toMs: number; deltaMs: number;
render: MobileCField<MobileCRenderSample> };
export type MobileCStatistics = { method: "nearest-rank"; sampleCount: number; p50Ms: number; p95Ms:
number; p99Ms: number; maxMs: number; countAbove33Ms: number };
export type MobileCThirdResult = { third: 1 | 2 | 3; observedSegmentIndexes: readonly number[];
acceptedStepEventIndexes: readonly number[]; qualification: MobileCDecision };
export type MobileCFrameWindow = { clockId: MobileCId; admittedAtMs: number; nominalEndMs: number;
actualEndMs: MobileCField<number>; initialRoomId: MobileCId; initialStopId: MobileCId; rawIntervals:
readonly MobileCRawInterval[]; rawCompleteness: "complete" | "prefix" | "missing"; statistics:
MobileCField<MobileCStatistics>; thirds: readonly MobileCThirdResult[]; observedStopIds: readonly
MobileCId[]; intervalFloor: MobileCDecision };
export type MobileCGraphicsState = { atMs: number; drawingBufferPx: MobileCSize; msaaSamples:
MobileCField<number>; shadowMapPx: MobileCField<MobileCSize>; rendererMemory: MobileCField<{
geometries: number; textures: number }> };
export type MobileCGraphics = { peakDraws: MobileCField<number>; peakTriangles:
MobileCField<number>; ledgerPeakBytes: MobileCField<number>; peakLedgerSnapshotId:
MobileCField<MobileCId>; states: readonly MobileCGraphicsState[]; coverage: MobileCDecision;
drawsGate: MobileCDecision; trianglesGate: MobileCDecision; ledgerGate: MobileCDecision };
export type MobileCTextureAllocation = { receivedDeviceFormat: MobileCField<string>; internalFormat:
MobileCField<string>; width: number; height: number; depth: number; layers: number; faces: number;
mipLevels: number; samples: number; blockGeometry: MobileCField<{ width: number; height: number;
bytes: number }>; allocatedBytes: MobileCField<number>; formatEvidenceIds: readonly MobileCId[] };
export type MobileCLedgerRow = { rowId: MobileCId; kind: "glb" | "ktx2" | "texture" | "material" |
"geometry" | "renderTarget"; allocationId: MobileCField<MobileCId>; sourceBytes: number;
compressedPayloadBytes: MobileCField<number>; accountingClass: "cpu-payload" | "gpu-allocation" |
"metadata" | "unresolved"; includedInComparisonTotal: boolean; comparisonBytes:
MobileCField<number>; texture: MobileCField<MobileCTextureAllocation>; accountingBasis: string;
evidenceIds: readonly MobileCId[] };
export type MobileCLedgerSnapshot = { id: MobileCId; atMs: number; sourceTotalBytes: number; rows:
readonly MobileCLedgerRow[]; comparisonTotalBytes: MobileCField<number>; aliasAndDoubleCountCheck:
MobileCDecision; deviceFormatAccounting: MobileCDecision };
export type MobileCLongTaskRow = { start: MobileCStamp; durationMs: number; attribution: readonly
string[]; loadRelation: "exempt" | "post-load" | "straddles-settlement" | "unknown"; evidenceIds:
readonly MobileCId[] };
export type MobileCNativeCpu = { traceIds: readonly MobileCId[]; coveredSpan:
MobileCField<MobileCSpan>; rows: readonly MobileCLongTaskRow[]; postLoadOverThresholdCount:
MobileCField<number>; completeCoverage: MobileCDecision; adjudication: MobileCDecision };
export type MobileCLongTasks = { apiSupported: MobileCField<boolean>; apiCoveredSpan:
MobileCField<MobileCSpan>; observerDrained: MobileCField<boolean>; apiRows: readonly
MobileCLongTaskRow[]; apiCompleteCoverage: MobileCDecision; apiPostLoadOverThresholdCount:
MobileCField<number>; initialExteriorSettledAt: MobileCField<MobileCStamp>; nativeTraceRequired:
boolean; native: MobileCField<MobileCNativeCpu>; cpuGate: MobileCDecision };
export type MobileCFrameCosts = { swapCostMs: number; disposeCostMs: number };
export type MobileCTransitFrame = { rawIntervalIndex: number; atMs: number; phase: string; costs:
MobileCFrameCosts };
export type MobileCTransit = { airlockId: MobileCId; directedAirlockId: MobileCId; from: MobileCId;
to: MobileCId; transit: MobileCJson; holdMs: MobileCField<number>; beganAtMs: number; endedAtMs:
MobileCField<number>; readyAtBegin: MobileCField<boolean>; leanAtFireM: MobileCField<number>;
dataReadyMs: MobileCField<number>; swapMs: MobileCField<number>; swapCostMs: MobileCField<number>;
postSwapDeltaMs: MobileCField<number>; disposeCostMs: MobileCField<number>; litAtMs:
MobileCField<number>; open: MobileCJson; closed: readonly MobileCJson[]; frames: MobileCJson;
maxDeltaMs: MobileCField<number>; maxDeltaPhase: MobileCField<string>; stalled: boolean; frameRows:
readonly MobileCTransitFrame[]; designated: boolean; containmentAndCount: MobileCDecision; };
export type MobileCNetwork = { method: "cdp-reference" | "phone-realised" | "uncontrolled" |
"unavailable"; mechanism: string; requested: { downMbps: 10; rttMs: 100 }; realisedDownMbps:
MobileCField<number>; realisedRttMs: MobileCField<number>; latencyMeaning: MobileCField<"rtt" |
"one-way" | "tool-specific">; calibrationEvidenceIds: readonly MobileCId[]; referenceEquivalence:
MobileCDecision; qualification: MobileCDecision };
export type MobileCPresentation = { basis: "verified-exterior-presentation" | "renderer-submission"
| "dom-paint" | "unavailable"; exteriorRoomId: MobileCId; markerLocator: string; traceIds: readonly
MobileCId[]; clockRelationId: MobileCField<MobileCId>; evidenceIds: readonly MobileCId[];
qualification: MobileCDecision };
export type MobileCFirstExterior = { navigationType: MobileCField<"navigate" | "reload" |
"back-forward" | "prerender">; navigationStart: MobileCField<MobileCStamp>; firstExteriorPresented:
MobileCField<MobileCStamp>; elapsedMs: MobileCField<number>; elapsedUncertaintyMs:
MobileCField<number>; network: MobileCNetwork; presentation: MobileCPresentation; coldness:
MobileCCache; measuredTarget: MobileCDecision; qualification: MobileCDecision };
export type MobileCInvalidation = { reason: "visibility-interruption" | "aborted" | "ended-early" |
"frame-overflow" | "record-overflow" | "byte-overflow" | "clock-discontinuity" | "context-loss" |
"protocol-incomplete"; at: MobileCField<MobileCStamp>; details: string; evidenceIds: readonly
MobileCId[] };
export type MobileCOverflow = { cap: "frames" | "records" | "bytes"; targetArtifactId: MobileCId;
limit: number; retained: number; rejectedAtLeast: number; firstRejectedAt: MobileCStamp };
export type MobileCRegistration = { attemptId: MobileCId; slotId: MobileCId; registeredAtUtc:
string; conditionKey: string; retryOf: MobileCField<MobileCId>; externalEvidenceIds: readonly
MobileCId[] };
export type MobileCAttempt = { registration: MobileCRegistration; status: "valid" | "invalid" |
"lost"; lossReason: MobileCField<string>; invalidations: readonly MobileCInvalidation[]; overflows:
readonly MobileCOverflow[]; frame: MobileCField<MobileCFrameWindow>; firstExterior:
MobileCField<MobileCFirstExterior>; activities: readonly MobileCActivitySegment[]; stopEvents:
readonly MobileCStopEvent[]; viewportEvents: readonly MobileCViewportEvent[]; visibilityEvents:
readonly MobileCVisibilityEvent[]; transits: readonly MobileCTransit[]; cacheBefore: MobileCCache;
cacheAfter: MobileCCache; thermal: MobileCThermal; powerStart: MobileCPowerPoint; powerEnd:
MobileCPowerPoint; powerQualification: MobileCDecision; longTasks: MobileCLongTasks; graphics:
MobileCGraphics; ledgerSnapshots: readonly MobileCLedgerSnapshot[]; protocolQualification:
MobileCDecision; measuredFloor: MobileCDecision; };
export type MobileCAttemptLink = { attemptId: MobileCId; retryOf: MobileCField<MobileCId>;
conditionKey: string; disposition: "valid" | "invalid" | "lost" | "pending"; visitFile:
MobileCField<MobileCFileRef>; measuredExceedance: MobileCField<boolean>; explanation: string };
export type MobileCSlotResult = { slotId: MobileCId; scenarioId: MobileCId; scopeId: MobileCId;
repeat: MobileCRepeat; attempts: readonly MobileCAttemptLink[]; fulfillingAttemptId:
MobileCField<MobileCId>; anyValidMeasuredExceedance: MobileCField<boolean>; fulfilment:
MobileCDecision };
export type MobileCVisit = { id: MobileCId; scopeId: MobileCId; clockId: MobileCId; openedAt:
MobileCStamp; sealedAt: MobileCStamp; profile: MobileCProfile; attempt: MobileCAttempt; slotResult:
MobileCSlotResult; clocks: readonly MobileCClock[]; clockRelations: readonly MobileCClockRelation[];
traces: readonly MobileCTraceRef[]; evidence: readonly MobileCEvidence[] };
export type MobileCScopeCoverage = { scopeId: MobileCId; observedStopIds: readonly MobileCId[];
requiredStopIds: readonly MobileCId[]; directedAirlockIds: readonly MobileCId[]; stopCoverage:
MobileCDecision; airlockCoverage: MobileCDecision; sentinelCoverage: MobileCDecision;
repeatAndSoakCoverage: MobileCDecision };
export type MobileCOwnerDecision = { decisionId: MobileCId; subject: string; disposition:
MobileCField<string>; authorityEvidenceIds: readonly MobileCId[] };
export type MobileCRider = { topic: "low-power-mode" | "untested-device" | "unratified-target" |
"unresolved-never" | "other"; description: string; decision: MobileCDecision };
export type MobileCIndex = { indexId: MobileCId; part: number; parts: number; scopeIds: readonly
MobileCId[]; registrations: readonly MobileCRegistration[]; slots: readonly MobileCSlotResult[];
visitFiles: readonly MobileCFileRef[]; receipts: readonly MobileCSavedReceipt[]; traces: readonly
MobileCTraceRef[]; evidence: readonly MobileCEvidence[]; scopeCoverage: readonly
MobileCScopeCoverage[]; ownerDecisions: readonly MobileCOwnerDecision[]; riders: readonly
MobileCRider[]; archiveCompleteness: MobileCDecision; measuredFloor: MobileCDecision; ownerGate:
MobileCDecision; exitGate: MobileCDecision };
export type MobileCPayload = { kind: "plan"; plan: MobileCPlanV1 } | { kind: "visit"; planFile:
MobileCFileRef; visit: MobileCVisit } | { kind: "index"; planFile: MobileCFileRef; index:
MobileCIndex };
export type MobileCReportV1 = { format: "h3d-mobile-c/v1"; artifactId: MobileCId; planId: MobileCId;
createdAtUtc: string; producer: MobileCBuild; payload: MobileCPayload };
export type MobileCPrepared = { artifactId: MobileCId; kind: "plan" | "visit" | "index";
suggestedFileName: string; mime: "application/json"; byteLength: number; sha256: string;
rawIntervalRows: number; visitObjectRecords: number };
export type MobileCSavedReceipt = { artifactId: MobileCId; actualFileName: string; byteLength:
number; sha256: string; verifiedAtUtc: string; verification: "native-selected-file-byte-match" };
export type MobileCTransport = { transport: "native-save" | "native-share" | "download"; handoff:
"not-started" | "handed-off" | "cancelled" | "failed"; reason: string };
export type MobileCControlState = "empty" | "plan-loaded" | "ready" | "admission-pending" |
"capturing" | "stopped" | "sealed" | "prepared" | "awaiting-verification" | "released";
export type MobileCBeginInput = { visitId: MobileCId; registration: MobileCRegistration; profile:
MobileCProfile; thermal: MobileCThermal; cacheBefore: MobileCCache; powerStart: MobileCPowerPoint;
initialExteriorSettledAt: MobileCField<MobileCStamp>; importedProbe:
MobileCField<MobileCFirstExterior>; clocks: readonly MobileCClock[]; clockRelations: readonly
MobileCClockRelation[]; traces: readonly MobileCTraceRef[]; evidence: readonly MobileCEvidence[] };
export type MobileCEndInput = { visitId: MobileCId; externalEvidence: readonly MobileCEvidence[];
traces: readonly MobileCTraceRef[]; clockRelations: readonly MobileCClockRelation[]; nativeCpu:
MobileCField<MobileCNativeCpu> };
export type MobileCCommand = { commandId: MobileCId } & ( { op: "loadPlan"; plan: MobileCPlanV1 } |
{ op: "begin"; input: MobileCBeginInput } | { op: "abort"; visitId: MobileCId; reason: string } | {
op: "endVisit"; input: MobileCEndInput } | { op: "prepareExport"; artifactId: MobileCId; target: {
kind: "plan" } | { kind: "visit"; visitId: MobileCId } | { kind: "index"; index: MobileCIndex } } |
{ op: "exportPrepared"; artifactId: MobileCId; transport: "native-save" | "native-share" |
"download" } | { op: "verifySaved"; artifactId: MobileCId } );
export type MobileCCommandValue = { kind: "plan-loaded"; planId: MobileCId } | { kind: "admission";
visitId: MobileCId; attemptId: MobileCId; admittedAt: MobileCField<MobileCStamp> } | { kind:
"terminal"; visitId: MobileCId; attemptId: MobileCId; result: MobileCSlotResult } | { kind:
"prepared"; prepared: MobileCPrepared } | { kind: "transport"; transport: MobileCTransport } | {
kind: "verified"; receipt: MobileCSavedReceipt };
export type MobileCCommandReply = { commandId: MobileCId; state: MobileCControlState; outcome: "ok"
| "pending" | "error"; code: string; reason: string; value: MobileCField<MobileCCommandValue> };
```

The limits are populated from the existing exports and §9 ceilings, not a second threshold registry.
`conditionKey` binds the frozen slot conditions; indexes must enumerate every planned slot and
registered attempt across their declared parts. Transit `transit/open/closed/frames` preserve their
existing source shapes losslessly as JSON because those source types were not supplied here;
normalized timing/cost fields are explicit, and source null is not an absence convention. Ledger
comparison totals require documented device-format accounting and alias handling; source totals
remain unchanged evidence.

## §19 Device runbook

### Phase A — One-time device, build and control preparation

1. **Resolve device adoption before freezing a certifying plan.** Record the Android phone’s actual
   model, variant, SoC/GPU and RAM from device information plus corroborating manufacturer/tool
   evidence. Galaxy A13 4G SM-A135F, 4-GiB is a proposal, not an assumed identification. Record the
   owner’s identified iPhone and Safari version equally explicitly. **Pending owner decision:
   Android model/SoC verification and adoption.** An emulator or another unadopted phone cannot
   discharge this gate.
2. **Keep current power law.** Mains-only remains the lawful capture condition until the owner
   ratifies the battery-only exception. **Pending owner decision: unplugged, normal-power, 50–80%
   battery, 20–25°C ambient, no external cooling.** If ratified, archive that decision before using
   those conditions; otherwise capture on mains and retain the unresolved rider. Record actual
   conditions either way. The reference Mac remains quiet and on mains; low-power mode and untested
   devices are not certified.
3. **Identify the exact opt-in build.** The established local command is `VITE_PERF_LOG=1 pnpm build
   && pnpm preview`. Record commit, build identity and producer evidence; never infer identity from
   a familiar URL. Consume the integration session’s ordinary-build evidence separately: neither
   capture token in any emitted asset, neither pure module in its graph, byte-identical legacy
   console formats, total JS gzip ≤285,707 B and RU +0.
4. **Default serving route: an immutable deployed HTTPS URL for that exact opt-in output.** Publish
   the matching frozen plan input alongside that output, only in the opt-in distribution. Explicit
   alternative: trusted-LAN preview, deliberately bound to the host’s LAN interface, normally port
   4173, with firewall access checked. A phone’s `localhost` is not the Mac. Restart/reconfigure the
   existing preview rather than occupying its port twice; do not expose it publicly. If LAN browser
   policy blocks a required operation, that operation stays pending until a rehearsed lawful route
   works. Do not run phone-control workloads during reference-Mac regression measurements.
5. **Rehearse commands before capture day.** Android: Chrome remote inspection, where available.
   iPhone: Safari Web Inspector through a compatible Mac, where available. Explicit alternative:
   owner-built, reviewed bookmarklets carrying command arguments and plan URL/digest metadata—not
   captured reports. Confirm access to `globalThis.__H3D_MOBILE_C__`, command IDs, coded replies and
   the complete save/select/verify path using a separate rehearsal plan. Confirm how cold
   navigations will be externally authorized and observed. Browser rejection of both control routes
   means **capture/export pending**, not permission to add diagnostic UI, browser storage or a new
   transport.
6. **Rehearse evidence tools and pairing.** On Android, assess Perfetto and available browser
   tracing; on iPhone, assess Safari Timelines and compatible Instruments recordings. Tool
   availability, supported tracks and export permissions are **device-unknown until demonstrated**.
   A sampled profile alone cannot prove zero long tasks; a compositor frame alone cannot identify
   the exterior. Demonstrate the required CPU coverage and presented-content evidence, or leave the
   corresponding native-evidence gate pending.

**Phase A verification — see:** identified devices, explicit owner decisions/riders, a reachable
identified build, successful rehearsal replies and native-selected-file verification.

**Failure looks like:** assumed hardware identity, an ordinary build without the command surface,
blocked controls, absent trace tracks or a save handoff without a verification receipt; none
qualifies capture readiness.

### Phase B — Author, deliver and verify the frozen plan

7. **Authorship decision:** a repository-side generator produces one deterministic UTF-8 JSON file
   containing the `MobileCPlanV1` VALUE, derived from the committed room/stop/airlock inventory. The
   owner reviews the generated inventory coverage, legal itineraries, scope identities, slots, cache
   intents, manipulations and external-probe schedule before results exist. Integration validates
   the actual names; this runbook invents none. Freeze the value and its SHA-256 before acquisition.
8. Distribute those exact input bytes as a static, immutable opt-in-build resource. The reviewed
   command helper carries its URL and the independently recorded expected digest. Host-side delivery
   reads bounded bytes, checks SHA-256, then parses and supplies the value to `loadPlan`;
   networking, decoding and hashing stay outside the pure modules. **Never hand-retype the plan:** a
   transposed slot, itinerary or cache intent would silently change the experiment. A delivery
   mismatch stops preparation; do not “repair” the phone’s copy.
9. On each acquisition environment, `loadPlan` must validate and freeze that value. Before
   measurement, use `prepareExport` for the plan, `exportPrepared`, then `verifySaved`. Check that
   the exported report’s `payload.plan` is structurally identical to the verified input value. The
   input-file digest and exported-report digest are different identities: the latter also covers its
   report envelope; never compare them as if equal.
10. Bind each visit/index `planFile` to the exact saved plan REPORT identity, byte length and
    SHA-256 verified for it—not merely the input filename or matching `planId`. Retain delivery
    verification through the existing exported evidence/decision records. Preserve every referenced
    plan report if separate environments produce distinct report envelopes for the same frozen plan
    value; do not alias their file identities. Any necessary plan amendment is a new prospective
    plan identity, never a rewrite informed by results.

**Phase B verification — see:** matching delivered-input digest, accepted frozen value, saved-plan
receipt, and exact `planFile` binding.

**Failure looks like:** parsing edited JSON, exporting without selecting the saved file, a payload
mismatch, or unresolved inventory coverage; measurement remains blocked.

### Phase C — Open each device scope and evidence ledger

11. Work through all 12 scopes: two adopted phones × `clean-profile-auto`/`explicit-q=t0` × the
    three pinned epochs. Use the existing epoch mechanism; record the actual URL and resulting
    state. The epochs are `2026-06-21T12:00:00Z`, `2026-01-15T10:00:00Z` and `2026-01-15T18:00:00Z`.
    `det` stays off.
12. Use dedicated test profiles or equivalent isolated browser contexts whose clean state can be
    demonstrated. Auto must have neither a visitor override nor forced `q=t0`; the explicit scope
    uses `q=t0`. **Do not erase a visitor override.** If isolation/cleanliness cannot be
    demonstrated on a phone, mark that scope’s selection provenance pending rather than relabelling
    a reused visitor profile. Record actual tier and source, not just requested selection.
13. Before **every** `begin`, externally register the unique attempt ID, scope, original slot,
    repeat, cache intent and any retry link. Keep the registration ledger outside the page so
    reloads cannot erase attempted work. Register expected-invalidation probes explicitly as such. A
    reconnect does not restore an in-page attempt; a lost attempt remains visible.
14. Start the necessary external trace/probe before its event. Associate every trace with device,
    scope and attempts; record actual basename, bytes, SHA-256, clock domain and exact locator. For
    each domain relation retain synchronization observations, offset and uncertainty. Unrelated
    timestamps are not comparable. Tool absence is pending; a supplied but insufficient trace gives
    unknown coverage, never a fabricated zero.
15. Record power source, mode, battery percentage, ambient reading and thermal-warning state at
    scope start, each visit start/end, immediately before/after the soak, and at each warning or
    condition change. Record the observation method and timestamp. **Device-unknown:** unavailable
    battery/thermal/ambient telemetry remains explicitly unknown; lack of visible warning is not a
    temperature measurement. Preserve any run affected by changed conditions and reconcile its rider
    before qualification.

**Phase C verification — see:** exact scope/selection/epoch, verified plan, external registrations
and usable clock relations.

**Failure looks like:** missing attempt identities, unexplained profile provenance, unsupported
telemetry labelled zero, or timestamps aligned by guesswork; affected gates remain pending/unknown.

### Phase D — Execute the frozen slot walk

16. Follow the predeclared ordering that preserves cold destinations. Reset into a separately
    documented cold visit where required; touring through a destination first cannot later be called
    “cold.” Finish, reconcile and export in-page acquisitions before deliberate navigation destroys
    their state. After reload, reload/verify the applicable plan and start fresh in-page attempts;
    never splice intervals across pages.
17. For each room, perform three independent 60-second foreground windows. Execute **resting →
    looking → stepping**, approximately one third each, using the frozen legal intra-room itinerary.
    Record observed activity changes and visited stops; timing cues may guide the operator but
    elapsed time cannot prove an activity or stop. The observation interval includes the full
    terminal rAF interval and overshoot. Repeat 3 is post-soak.
18. In the one sentinel room per scope, repeat 1 has the planned landscape overlay; repeat 2 has the
    planned browser-bar/viewport changes. Before repeat 3, run the separately registered deliberate
    visibility-interruption probe: it must invalidate, retain its prefix and remain excluded from
    floor windows. Resume foreground, establish a fresh baseline and begin repeat 3. An unexpected
    interruption invalidates its whole window; an unexplained foreground stall stays in the
    measurements.
19. For every directed airlock, collect separate repeat-1/2/3 transition windows with **one
    designated transit per slot**: repeat 1 enters its declared cold unprepared destination; repeats
    2–3 are warmed, with repeat 3 post-soak. Preserve direction, destination preparation and
    transition observations. Destination loading after initial exterior settlement is not a renewed
    CPU-load exemption.
20. Obtain three **cold navigations** for first-exterior per scope; the third is post-soak. These
    are bounded external probes, not 60-second frame windows. Record navigation start and evidence
    of a genuinely presented exterior frame. Renderer submission, DOM paint and title appearance do
    not establish that endpoint. Preserve measured misses even if network or presentation
    qualification is unresolved.
21. Record the network method as `cdp-reference`, `phone-realised`, `uncontrolled` or `unavailable`,
    requested 10 Mbps/100-ms RTT, realised evidence and the explicit equivalence decision. A phone
    setting named “10 Mbps” proves neither RTT nor reference equivalence. Missing
    control/equivalence leaves the reference-condition gate unresolved; it does not erase the
    observed timing.
22. Evidence at least `MOBILE_SOAK_MS = 1,200,000` of active touring before the designated post-soak
    captures. Count observed active navigation/look/step activity with timestamps; setup, idle
    waits, hidden time, exports and a timer merely left running do not count. Maintain evidence of
    the same device/scope and intervening conditions. If duration or continuity cannot be
    established, collect a new evidenced soak rather than estimating it.
23. For a first-exterior navigation after soaking, bind the external probe to the pre-navigation
    registration/authorization, soak evidence, navigation marker and post-navigation presentation
    evidence. The external evidence boundary—not resurrected page memory—spans the reload. Unknown
    clock relation, missing authorization or an unbound reload blocks qualification. The plan must
    schedule cold reset and probe control without pretending a warm navigation is cold or losing
    thermal provenance.
24. Obtain post-load CPU evidence covering every required window, including completeness and
    drainage. Preserve the Long Tasks API record and native evidence separately. Unsupported/alien
    API coverage is unknown; adequate native coverage may resolve the CPU gate without rewriting the
    API result as zero. Record per-window graphics peaks, actual transcode-format ledger accounting,
    actual buffer dimensions and AA samples.

**Phase D verification — see:** three required repeats per room/directed edge, three first-exterior
probes, designated post-soak evidence, all 18 stops in the scope’s observed stop union and both
directions of every inventory airlock.

**Failure looks like:** missing thirds/stops, warmed “cold” destinations, a valid-looking
interruption probe, absent post-soak binding, or pooled statistics replacing an individual result.

### Phase E — Reconcile, seal, save and archive each visit

25. Let completed bounded attempts terminate normally. Use `abort` only to stop an active
    acquisition: it returns an invalid terminal result and preserves the accepted prefix. Never use
    abort as deletion. Reconcile registrations, observations and external evidence before
    `endVisit`; an early `endVisit` invalidates as ended early and cannot manufacture completion.
26. Classify honestly: a measured exceedance is retained as failure, not discarded; an invalid
    attempt cannot fulfil a slot. Retry invalid slots only with a new externally registered ID
    linked to the original slot and the same planned conditions. Keep the original. Diagnostic
    repetitions cannot select away a valid failure, and a favourable cold run cannot replace a
    failed warm run. If matching conditions cannot be restored, the slot stays unresolved.
27. For every sealed visit, execute `prepareExport` → `exportPrepared` → `verifySaved`. Check
    prepared identity, suggested name, exact bytes, SHA-256 and retained counts. Handoff is not
    proof of durable storage: select the actual saved file and obtain the
    `native-selected-file-byte-match` receipt. Cancellation, rejection or mismatch retains the
    buffer and remains pending/error; retry the same prepared bytes rather than editing them.
    Overflow retains its accepted prefix and cap reason but never yields qualifying prefix
    statistics.
28. Archive verified plan/visit files, native traces, external registrations and command receipts.
    Reconcile those identities and receipts into the growing, explicitly exported index parts;
    verify each saved part through the same sequence. Preserve the frozen index-part closure
    rules—never edit a sealed index to insert its own receipt. Missing registered attempts, files,
    traces or required receipts block archive completeness. Release only buffers permitted by
    successful verification.

**Phase E verification — see:** saved-file receipts matching actual archived bytes, every
registration accounted for, trace locators resolvable, and exported index decisions that distinguish
failures, unknowns and pending work.

**Failure looks like:** only a share-sheet success, a filename without digest verification, a
vanished failed run or an incomplete index labelled complete.

**Operator prohibitions:** no `det`; no visitor-override deletion; no manual report edits; no silent
retries, report uploads or persistent browser report store; no expected in-page diagnostic UI; no
rounding 33.33 ms into 33.0 ms; no replacement of failed warm evidence with favourable cold
evidence.

## §20 Native-device certificate template

### Source and completion rules

- All blanks below are unfilled `MobileCField<T>` values, or `MobileCDecision` blanks where labelled
  decision. Use `known(value, evidenceIds)`, `unknown(reason, requiredEvidence)`, `pending(reason,
  nextAction)` or genuinely structural `not-applicable(reason)`. No blank, empty array or
  unsupported API silently means zero/pass.
- Source notation: `P⟦label⟧` = plan report field `/payload/plan`; `V⟦label⟧` = visit report field
  `/payload/visit`; `I⟦label⟧` = index report field `/payload/index`. Each notation requires **saved
  report artifactId ___; exact existing descendant JSON Pointer ___; evidence ID(s) ___** before its
  cell may be filled. These labels are semantic selectors, not additions to the frozen schema; the
  supplied brief does not expose its inner member names. An unresolved selector stays pending.
- Envelope sources `R⟦field⟧` name the exact top-level field on the identified report; `R` must
  specify plan/visit/index kind. Each populated value must be extracted from that exported field,
  with its evidence references. Narrative recollection, command output alone and this template are
  not evidence sources.
- External budget/accessibility/tour/owner evidence must first be referenced and reconciled in the
  exported index. The certificate may then transcribe its exported decision and evidence references;
  it cannot independently turn an external claim green.

### Eligibility and riders — display above every result page

- **Overall certificate decision: ___** ← `I⟦owner certificate decision and applicable riders⟧`; no
  unconditional green while an applicable rider is unresolved. A passing measurement row is not a
  certificate.
- Android identity/adoption owner decision: ___ ← `I⟦Android adoption decision⟧`; actual model/SoC
  evidence: ___ ← `V⟦hardware identification⟧`.
- Power-law exception owner decision and effective conditions: ___ ← `I⟦power-law owner decision⟧`;
  actual compliance: ___ ← `V⟦power/thermal observations⟧`. Pending ratification is not approval to
  unplug.
- Low-power mode: ___ ← `I⟦low-power rider⟧`; excluded/unqualified conditions must remain visibly
  outside the certificate.
- Untested devices: ___ ← `I⟦device coverage rider⟧`; this certificate does not generalize to them.
- Neva facade: build applicability ___; affected physical scenarios/revalidation ___ ← `I⟦Neva
  applicability and revalidation decision⟧`; missing required revalidation blocks exit.
- Other device/tool/coverage unknowns and pending actions: ___ ← `I⟦unresolved evidence and
  riders⟧`; list each, never a generic “limitations apply.”
- Governing law: **«never mark pending gates met».** Also: “No physical low-end phone means «floor
  pending», not an emulation-based pass.”

### Identity and §10 device record — repeat for each device/scope/visit

- Report identity/version: ___ ← identified plan/visit/index `R⟦artifactId⟧`, `R⟦format⟧`; plan
  identity: ___ ← `R⟦planId⟧`.
- Exact plan-file identity/digest: ___ ← visit/index `/payload/planFile`, with its concrete member
  pointer and saved-receipt evidence ID.
- Scope/device/selection/epoch: ___ ← `P⟦scope definition⟧`, corroborated by `V⟦observed scope and
  application state⟧`.
- Commit: ___ ← visit `R⟦producer⟧`, resolved commit member and evidence ID.
- Build: ___ ← visit `R⟦producer⟧`, resolved build member and evidence ID.
- Device model and variant: ___ ← `V⟦device model and variant⟧`.
- SoC: ___ ← `V⟦SoC⟧`.
- GPU: ___ ← `V⟦GPU⟧`.
- RAM: ___ ← `V⟦RAM⟧`.
- OS/version: ___ ← `V⟦OS/version⟧`.
- Browser/version: ___ ← `V⟦browser/version⟧`.
- Refresh behaviour: ___ ← `V⟦observed refresh behaviour⟧`.
- CSS viewport: ___ ← `V⟦CSS viewport observations⟧`.
- Native DPR: ___ ← `V⟦native DPR⟧`.
- Coarse-pointer result: ___ ← `V⟦coarse-pointer result⟧`.
- Memory API value/support: ___ ← `V⟦memory API observation⟧`.
- Actual tier: ___ ← `V⟦actual tier⟧`.
- Tier source: ___ ← `V⟦tier source⟧`.
- Actual drawing-buffer dimensions: ___ ← `V⟦drawing-buffer observations⟧`.
- MSAA samples: ___ ← `V⟦MSAA sample observations⟧`.
- Shadow size: ___ ← `V⟦shadow size⟧`.
- Texture ledger peak and units: ___ ← `V⟦texture ledger peak⟧`.
- Actual transcode formats/accounting evidence: ___ ← `V⟦device texture accounting⟧`.
- Power source/mode and battery observations: ___ ← `V⟦power observations⟧`.
- Thermal conditions/warnings and ambient observations: ___ ← `V⟦thermal observations⟧`.
- Cold/warm cache state, method and intent: ___ ← `V⟦observed cache state⟧`, `P⟦slot cache intent⟧`.
- Landscape/browser-bar/resume observations: ___ ← `V⟦sentinel manipulation observations⟧`.
- Active-tour soak duration, association and evidence: ___ ← `V⟦soak association⟧`, `I⟦external soak
  reconciliation⟧`.
- Native trace identity/domain/locator/clock uncertainty: ___ ← `I⟦trace registration and clock
  relation⟧`, associated `V⟦trace references⟧`.

### Required floor rows — instantiate from the exported plan, never summarize away rows

“Every required window must pass; aggregate medians cannot conceal a slow room or transit.”

- **Room-window row**, one per scope × room × repeat: slot ___ ← `P⟦room slot⟧`; attempt/validity
  ___ ← `V⟦room attempt⟧`; resulting slot decision ___ ← `I⟦room slot result⟧`.
- Room statistics, separately sourced: p50 ___ ← `V⟦attempt p50⟧`; p95 ___ ← `V⟦attempt p95⟧`; p99
  ___ ← `V⟦attempt p99⟧`; max ___ ← `V⟦attempt max⟧`; sample count ___ ← `V⟦attempt sample count⟧`;
  countAbove33 ___ ← `V⟦attempt count above 33 ms⟧`.
- **Directed-airlock-window row**, one per scope × directed edge × repeat: slot ___ ←
  `P⟦directed-airlock slot⟧`; attempt/validity ___ ← `V⟦transition attempt⟧`; resulting slot
  decision ___ ← `I⟦directed-airlock slot result⟧`.
- Airlock statistics, separately sourced: p50 ___ ← `V⟦attempt p50⟧`; p95 ___ ← `V⟦attempt p95⟧`;
  p99 ___ ← `V⟦attempt p99⟧`; max ___ ← `V⟦attempt max⟧`; sample count ___ ← `V⟦attempt sample
  count⟧`; countAbove33 ___ ← `V⟦attempt count above 33 ms⟧`.
- **For each frame-window row:** frame decision ___ ← `I⟦attempt frame decision⟧`; p95 ≤33.0 ms and
  p99 ≤50.0 ms, nearest rank, no rounding concession. Zero samples gives unknown; invalid/overflow
  prefixes cannot qualify.
- **For each frame-window row:** API post-load task count ___, support/coverage/drainage ___ ←
  `V⟦Long Tasks API evidence⟧`; native post-load count ___, coverage/locator ___ ← `I⟦associated
  native CPU evidence⟧`; resolved CPU decision ___ ← `I⟦attempt CPU decision⟧`. Count tasks strictly
  over 50 ms; required count is zero. Native evidence may resolve the gate while API evidence
  remains unknown.
- **For each frame-window row:** peak draws ___ / decision ___ ← `V⟦peak draws⟧`, `I⟦draw ceiling
  decision⟧`; ceiling ≤250.
- **For each frame-window row:** texture ledger peak ___ / decision ___ ← `V⟦texture ledger peak and
  actual-format accounting⟧`, `I⟦texture ceiling decision⟧`; ceiling ≤256 MB under the existing
  ledger convention, not a silently substituted unit.
- **For each frame-window row:** peak triangles ___ / decision ___ ← `V⟦peak triangles⟧`,
  `I⟦triangle ceiling decision⟧`; ceiling ≤1,000,000, including T0. Actual buffer ___ and MSAA
  samples ___ ← their separate `V` device-record selectors above.
- **First-exterior row**, one per scope × cold navigation repeat: slot ___ ← `P⟦first-exterior
  slot⟧`; attempt/cold evidence ___ ← `V⟦first-exterior probe⟧`; third-repeat soak binding ___ ←
  `I⟦external probe/soak reconciliation⟧`.
- First-exterior network method ___; requested conditions ___; realised conditions ___; equivalence
  decision ___ ← respective members selected by `V⟦first-exterior network evidence⟧` and `I⟦network
  equivalence decision⟧`.
- First-exterior start/presented-frame evidence ___; clock relation ___; measured duration ___;
  complete uncertainty interval ___ ← respective `V⟦first-exterior timing evidence⟧` / `I⟦external
  presentation and clock evidence⟧` members.
- First-exterior decision ___ ← `I⟦first-exterior slot decision⟧`: pass requires the complete
  duration interval within 0–3,000 ms plus qualified conditions/presentation evidence. An interval
  crossing the threshold cannot pass; preserve any measured miss even when qualification remains
  unresolved.
- Scope coverage: room/repeat coverage ___; directed-edge coverage ___; observed 18-stop union ___;
  manipulations ___; post-soak coverage ___ ← respective `I⟦scope coverage⟧` members, checked
  against `P⟦required inventory and slots⟧`.
- Archive completeness: registered/terminal/lost attempts ___; invalid probes/retries ___; required
  saved files/receipts ___; trace availability ___; index-part closure ___; decision ___ ←
  respective `I⟦archive reconciliation and completeness⟧` members. Missing evidence blocks
  completion, not merely a footnote.

### Phase-4 exit — conjunction, not a score

- Native mobile certificate across both adopted devices/all 12 scopes: ___ ← `I⟦mobile certificate
  decision⟧`, with every required floor and eligibility source above.
- All existing budgets/gates, including unchanged reference-Mac regression gates: ___ ← `I⟦existing
  gate decisions and evidence references⟧`; retain each constituent result, including ordinary-build
  isolation, gzip and RU checks.
- Lighthouse accessibility: eight route-language cells, each ≥95: ___ ← `I⟦Lighthouse decisions for
  four routes × RU/EN⟧`; route names come from the committed inventory, each cell with its own
  evidence ID.
- Keyboard-only 18-stop tour: ___ ← `I⟦keyboard tour decision and observed stop evidence⟧`.
- Honoured reduced motion: ___ ← `I⟦reduced-motion decision and evidence⟧`.
- Applicable Neva-facade physical revalidation: ___ ← `I⟦Neva revalidation decision⟧`; structural
  inapplicability requires exported justification, not missing work.
- Applicable owner decisions/riders resolved and archive complete: ___ ← `I⟦owner decisions, riders
  and archive completeness⟧`.
- **Phase-4 exit decision: ___** ← `I⟦Phase-4 exit decision⟧`. Pass requires every applicable
  conjunct to pass; a known failed conjunct prevents pass even when another is pending. Preserve
  that full vector. **«never mark pending gates met».**

## §21 Unit-test list

All files use Vitest’s node environment and deterministic injected inputs; no jsdom, DOM fixtures,
Chromium cases, clocks, observers or file operations. Tests import named pure exports; new fixtures
follow `satisfies`, no enums and strict null handling.

- `tests/mobile-capture.test.ts` — Parameterized frame-cap boundary: 32,768 accepted raw rows
  includes interruption-probe rows; the next row invalidates, preserves the accepted prefix/reason
  and cannot qualify prefix statistics.
- `tests/mobile-capture.test.ts` — Parameterized record/byte boundaries: 4,096 JSON object nodes
  excludes `rawIntervals` subtrees and does not count arrays; 8,388,608 exact UTF-8 bytes is
  inclusive; prospective overflow invalidates before accepting the excess and retains an exportable
  terminal prefix. Include multibyte fixture lengths, not string-length assumptions.
- `tests/mobile-capture.test.ts` — Lifecycle: registered-before-begin, abort retains invalid prefix,
  early endVisit invalidates, ordinary completion seals only through its legal path, visibility
  invalidates the whole attempt, and reconnect cannot revive a lost attempt.
- `tests/mobile-capture.test.ts` — Plan validation against injected committed inventory rejects
  missing/duplicate coverage, illegal itineraries, wrong scope/epoch/selection and malformed
  sentinel/cold-warm/post-soak assignments; accepted plan content cannot subsequently mutate.
- `tests/mobile-capture.test.ts` — Slot/registration validation rejects mismatched
  attempt/scope/slot/retry ancestry; a retry has a new ID and original conditions; invalid attempts
  and expected-invalidation probes cannot fulfil floor slots or conceal predecessors.
- `tests/mobile-capture.test.ts` — Window boundary retains the first terminal sample’s entire
  overshooting interval from the foreground baseline; activity/stop coverage requires observations,
  and unexplained foreground stalls remain samples.
- `tests/mobile-capture.test.ts` — Exhaust the frozen 10-state × 7-operation transition table: legal
  transitions succeed; every other combination fails loudly with command ID/state/reason/code and no
  unauthorized acquisition or release.
- `tests/mobile-report.test.ts` — Nearest-rank p50/p95/p99/max/count/countAbove33: small samples and
  ties, empty samples unknown, strict above-33 count, and sustained 33.33-ms cadence fails without
  rounding.
- `tests/mobile-report.test.ts` — Required-window conjunction: one failed room/transit cannot be
  hidden by pooled medians; unsupported/incomplete API coverage stays unknown, with separately
  sufficient native evidence permitted to resolve only the CPU gate.
- `tests/mobile-report.test.ts` — First-exterior qualification requires presented-frame evidence,
  network equivalence and the complete uncertainty interval within the threshold; straddling
  intervals cannot pass and unresolved qualification never deletes measured misses.
- `tests/mobile-report.test.ts` — Absence/riders: known observed emptiness differs from
  unknown/pending; unsupported evidence is not zero; not-applicable requires structural grounds;
  unresolved applicable riders prevent an unqualified certificate/exit pass.
- `tests/mobile-report.test.ts` — Archive completeness reconciles all registrations, retained
  failures/invalidations, files, receipts, traces, plan references and index parts; a missing member
  stays unresolved rather than disappearing from required coverage.
- `tests/mobile-report.test.ts` — Portable filename/identity and verification predicates: exact
  naming grammar and format; repeated preparation of unchanged sealed input preserves serialized
  bytes; injected size/digest/version/identity/plan mismatches reject receipts; export handoff never
  authorizes release. Native hashing/dialog execution remains host validation, not a simulated node
  unit test.

## CHALLENGES — capture protocol (the specialist's, dispositioned at integration)

- **Decision unlike the obvious shortcut:** ship a generated immutable plan VALUE, not a
  hand-written phone payload or report-bearing bookmarklet. Verify input bytes, then separately
  verify the exported plan REPORT; those digests must not be conflated.
- **Power-law tension is real:** battery-only may be the intended methodology, but it is not yet
  lawful by default. Mains captures remain explicitly scoped, with the outstanding owner decision
  visible; this draw does not ratify it.
- **Cold plus post-soak is operationally fragile:** reload loses page state, cold preparation can
  disturb conditions, and warming a destination is irreversible within that cold attempt. External
  authorization, provenance and clock pairing must be rehearsed; otherwise the slot remains
  unresolved.
- **Tool names do not establish coverage:** phone/browser/OS versions may prevent full CPU task
  boundaries or identifiable presented-frame evidence. Sampling and compositor timing alone cannot
  substitute for them.
- **Schema precision remains an integration responsibility:** only outer report paths were supplied
  here. Certificate selectors deliberately do not fabricate inner §18.9 fields; resolve each to an
  existing exported member before issuance, or leave it pending. No frozen schema amendment is
  implied.
- **Delivery and archive closure are separate risks:** successful sharing is not saved-byte
  verification, and index parts must follow the frozen closure protocol without self-editing or
  suppressing lost registrations. These host behaviours are not proven by pure unit tests.
- **No result is claimed here:** hardware adoption, owner ratification, tooling support, realised
  network equivalence and every measurement remain unfilled until exported evidence establishes them

