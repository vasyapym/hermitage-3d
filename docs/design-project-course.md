# Design — the project course (the dossier round)

A RECORD round of the parallel branch `roomload-mglight` (PARALLEL: merges by the owner's
signal). Relay: CREATIVE brief 20 (the state-of-the-project fact pack: budgets, 67-row history,
parked inventory, conventions; vault `projects v10/20-…`) → the long-context specialist's
course dossier → orchestrator integration. The dossier's date: 2026-11-03; recorded 2026-11-04.
STATUS: **a record and a proposal set — none of its cap changes, Frozen-law changes, or route
changes take effect by this document; the owner ratifies (or strikes) at review.** It was written
against the committed snapshot BEFORE jordan slice 2's accounting lands and WITHOUT the two
parallel chrome rounds of this branch merged into main — see §0.2 for the reconciled numbers.

## 0. Challenge the table

**The balances are nested, not additive.** Room payload includes textures and manifests; the
portrait plate sits inside the atlas fence, texture fence, and room fence. RU chunk growth also
consumes the total-JS allowance insofar as it enters emitted JavaScript. Compressed file bytes
do not establish decoded GPU cost, download latency, or rendering capacity. The Square's zero
asset payload does not mean its procedural architecture is free: its code, geometry, draws, and
resident resources already cost something elsewhere.

**The rendering columns need consistent denominators.** Rastrelli's unique primitives are not a
measured draw count. Jordan's 20,898 drawn triangles cannot establish remaining capacity against
380,000 until both numbers are shown to count the same thing. The reported 1812 draw balance is
the governing constraint, but its coverage should identify tier, camera, passes, and light-state
blends. Per-room VRAM honesty does not establish the route's peak while outgoing and incoming
rooms, shared resources, and capture buffers overlap.

**These are gross balances, not reservations available to every branch.** Reconcile the table to
one commit after Jordan slice 2, including any affected 1812 assets and shared code. Record
pending branch reservations separately. Before changing a cap, obtain comparable loaded/drawn
triangle counts, worst-case issued draws, resource-ledger peaks through room transitions and
capture, and post-bake decode-cell occupancy. Without those measurements, several apparent
surpluses remain unspendable.

### §0.2 — the orchestrator's integration corrections (the only edits of substance)

1. **The two drifted numbers:** §1's JS arithmetic used the snapshot 280,144 (the reply read the
   pre-refresh fact pack). The CURRENT committed branch numbers are 281,474 of 350,000 JS gzip
   and 7,332 of 12,000 RU. Refreshed readings of the same conclusions: the standing-ceiling class
   headroom is **285,707 − 281,474 = 4,233 B** (not ≈5,563); one conventional +3,000 B declared
   round would leave **≈1,233 B** before other reservations (not ≈2,563) — the conclusion
   «operationally almost spent» STRENGTHENS under the refresh. RU remaining is **4,668 B**
   (not 4,755).
2. **My branch's own placements against the dossier's review terms (facts, not defenses):** the
   room-open round the dossier treats as «a candidate until its measurements are reviewed» is
   R23-ux (the load line) — its design doc's §6 already contains exactly the measure-first list
   the dossier demands (per-stage split of `ensureRoom`, warm-re-entry card durations, the
   loader's progress path), its visibility law is disclosed (1 s card-threshold, latch, no FSM
   change), and its budget delta is declared (+3,000 declared; +1,330 measured for BOTH rounds
   combined). The dark-entry fix (R24-ux) is a measured resource/lifecycle fault with a runtime
   probe verification — in the dossier's own priority order (resource/loading faults first), it
   is already the executed instance of the request.
3. **The dossier's trace-first demand for the 4–5 s class maps onto the committed instrument:**
   the VITE_PERF_LOG transit-log's `data +<ms>` line already prints the aggregate wait; the
   per-stage split it names is the unmeasured part and rides the same clock — a measurement
   round only, no new contract proposed here.
4. The dossier's «the charter's treatment of the Square and future exterior destinations is not
   established here» stands as an owner question (docs/charter.md's non-goals + the ≤7 room
   count; an ADR-level reading would settle the counting rule).

## 1. The budget read-back

*All byte figures below are decimal bytes in their respective accounting classes. These are
remaining balances against the supplied snapshot, before in-flight work.*

| Room | Payload remaining | Texture remaining | Draw position | Practical reading |
|---|---:|---:|---|---|
| Rastrelli Gallery | 1,621,124 — 81.1% | 711,239 — 71.1% | Cap 25; actual headroom not established by primitive count | Substantial asset reserve; no demonstrated need to spend it |
| Jordan Staircase | 5,971,319 — 85.3% | 3,197,861 — 79.9% | 41 nominal draws remaining at the reported sample | Generous file reserve; pending bake and runtime accounting govern |
| Military Gallery of 1812 | 991,300 — 24.8% | 592,882 — 22.4% | 2 draws remaining: 17 of 19 | Draw-constrained, not payload-exhausted |
| Palace Square | 4,000,000 — 100% | No separate cap supplied | No triangle/draw ceiling supplied | Unused asset allocation, incomplete runtime envelope |

**JavaScript is operationally almost spent.** The hard fence leaves 64,526 B (350,000 − 281,474
— the refreshed number, §0.2), but the standing ceiling class leaves only approximately **4,233
B**. One conventional +3,000 B round would leave approximately **1,233 B** before other
reservations. The declaration is a request against a finite balance, not a recurring entitlement.
Route splitting can improve delivery and execution timing; it does not reduce a budget counting
every emitted chunk. New frameworks, rendering backends, and general-purpose feature libraries
should therefore be presumed unaffordable until their actual net contribution is demonstrated.

**Make the two JS limits explicit.** The 350,000 B outer fence is mis-sized as the sole release
criterion for the current mobile class. I recommend an explicit operating ceiling of 285,707 B,
subject to confirmation of the intended exact figure and reconciliation of pending work. This is
64,293 B tighter than the outer fence; it need not replace that architectural fence. It gates
emitted gzip JavaScript, not room GLBs or KTX2 files. Today's committed code fits, but safety for
the pending stack is not yet established. If the stack exceeds the operating class, resolve that
discrepancy explicitly rather than quietly promoting 350,000 B to the working allowance.

**The other shared balances have different meanings.** RU has **4,668 B** remaining (refreshed,
§0.2), enough to make accessibility and truthful explanatory copy plausible priorities, but not
an independent allowance outside JS. Basis has 15,138 B remaining and is effectively closed:
preserve the decoder family, avoid duplicate distributions, and admit a future vendor upgrade
only with an explicit measured delta. The mobile plan's 717,197 B is a reproducibility result,
not a stated cap or a spending balance. Establish whether it is build input, emitted data, or
bundled code before attributing delivery cost; source changes must regenerate it, while
unchanged inputs must remain byte-identical.

**Rastrelli should retain its reserve.** Its low payload utilization is not evidence that the
pale gallery needs another detail program. The remaining texture and payload capacity can
support a bounded, evidence-led correction without an obvious byte-cap problem. First measure
actual draws and the relevant triangle inventory. Prefer corrections to proportion, material
hierarchy, light continuity, or an identifiable missing feature over distributing detail across
surfaces simply because capacity exists. RG-E1 should stand unless a specific observation
contradicts its result.

**Jordan has file capacity, not a blank commission.** The 7 MB payload and 4 MB texture fences
are generous relative to the committed slice, and the triangle ceiling looks particularly loose
relative to the reported drawn count. Those comparisons do not justify tightening the contracts
before slice 2 establishes the intended artifact mix. The nearer warning is the decode-cell
ledger: 1,298 of 4,096 cells nominally remain before pending work. Confirm packing and
per-state requirements rather than treating that subtraction as guaranteed usable subdivision
capacity. Finish the light program; do not convert the remaining megabytes into authorization
for the chandelier form, plafond, or rosettes.

**1812 should treat its last two draws as contingency, not feature allocation.** The portrait
atlas has 416,732 B remaining inside its 1,900,000 B fence; that balance is also bounded by the
592,882 B texture balance and 991,300 B payload balance. Preserve the one-plate arrangement
unless an evidence-backed quality failure requires reconsideration. Favor revised existing maps,
atlas content, material tuning, and genuinely draw-neutral corrections. Batching extra geometry
does not exempt it from the 60,000-triangle or VRAM contracts. The eagle/plafond program is not
justified by the remaining payload: its full rebake and rendering implications make it a
separate commission.

**The Square's cap is under-specified rather than demonstrably too small or too large.** Keep
the 4 MB asset fence, but establish texture, triangles, draws, and resident-resource limits
before starting an asset program. Measure the current procedural baseline first. A future
authored asset may exchange JS generation work for downloaded bytes, or may merely add another
cost; only an implementation comparison can distinguish them. The untouched allocation is not an
argument for environmental dressing, nor permission to finance the Neva facade under the
Square's name.

**No room-cap increase is warranted now.** My proposed immediate increases are zero bytes, zero
triangles, and zero draws. The 1812 draw fence and its nested texture fences are doing useful
work. Rastrelli and Jordan have loose outer asset ceilings, but the evidence does not establish
safe replacement values: that requires the completed artifact inventory, approved remaining
scope, and worst-case runtime measurements. Keep those ceilings and manage work through explicit
deltas beneath them. Unused Jordan bytes cannot compensate for an 1812 draw, a shared JS
overrun, or an excessive mobile transition peak.

## 2. The preferred approach going forward

**The next product is a finished four-stop work, not a larger inventory.** The route, threshold
grammar, authored stops, seasonal sky, bilingual surface, and device program already constitute
a substantial public piece. The project is ready to stop treating added architectural detail as
its default unit of progress. Its next gains should be confidence, legibility, and arrival:
rooms that open predictably, communicate their hierarchy, remain usable on the intended devices,
and disclose reconstruction honestly. A fifth destination would currently multiply obligations
before resolving those qualities.

**Land Jordan slice 2 as the close of the current light commission.** Complete its three-state
assets, shared encode/decode compatibility, pane emission, and associated ledger changes as one
coherent result. Explicitly inspect any 1812 effects rather than assuming a Jordan branch is
room-local. The missing axial photograph still blocks the chandelier fixture form; improved
illumination must not silently manufacture that evidence. Preserve the permitted glow-chip
treatment and keep slices 3 and 4 parked. Reopen them only on their stated evidence or owner
trigger, not because the bake pipeline is already running.

**Use the next parallel capacity for acceptance, not four more visual commissions.** While
Jordan finishes, the useful lanes are: the existing room-open investigation; an accessibility
audit of the stable interaction surface; and an evidence/finishing audit that identifies specific
remaining defects without launching another bake. Jordan occupies the asset-changing lane until
it closes. Four slots are capacity, not a quota. Afterward, admit only the implementation work
those findings justify, in this priority order: resource/loading faults, access failures, then
bounded visual corrections. Evidence gathering can continue in parallel without competing for
the same renderer, loader, or owner approval.

**Serialize integration around a known asset baseline.** The default merge order is Jordan slice
2, then any accepted room-open implementation, then accessibility corrections, then selected
finishing work. This does not reassign or prejudge the parallel slowness round: its report is a
candidate until its measurements and proposed mechanism are reviewed. Shared loader, decoder,
light-contract, and manifest changes need one integration owner each. Rebase dependent work
against the landed asset snapshot and reconcile its reservations before merge; do not assemble
the final budget by adding independently measured branch totals.

**Name the gate duty before the stack begins.** For an explicitly agreed bounded stack, the last
merging session owns the full existing gate on a quiet machine, with competing bakes and GPU
work stopped. Earlier rounds must say that final gating is pending, not imply a pass. If the
next candidate is not ready or accepted, close Jordan as its own gated round rather than
extending an indefinite stack. Scene goldens change only through the owner's explicit DEC;
fixture replacement remains a binary-rewritten, owner-eyeballed operation. A changed bake is not
blanket permission to bless unrelated image differences.

**Treat the 4–5 s room-open class as a measured latency program.** First distinguish initial
application startup, first entry to an uncached room, return to a cached room, and settling to
full approved quality. Define room-open from the initiating action to the first correct,
navigable room frame — not the threshold card, progress UI, or a nominal frame with missing
architecture. Record device, tier, network/cache condition, sample count, median, and tail
behavior. The preferred objective is the existing ≤3 s class under comparable reference
conditions; any extension to a new percentile or scenario is a proposed contract, not something
this dossier can declare already satisfied.

**Choose the optimization from the critical path.** Separate transfer, parsing, KTX2
transcoding, geometry creation, upload, shader compilation, and main-thread obstruction before
selecting a mechanism. Reuse shared decoder resources and remove duplicate or serial work where
demonstrated. Staging through the existing threshold opportunity may help, but it must preserve
Frozen behavior and charge the outgoing/incoming resource overlap. Do not preload every room,
duplicate the Basis payload, weaken sharpness, or substitute a visibly incomplete scene to
improve a headline time. Each accepted fix must report both latency and its JS, residency,
cancellation, and frame-quality consequences.

**Bring accessibility forward now; do not wait for the next room.** Audit keyboard traversal,
menu/listbox semantics, focus return, threshold announcements, URL transitions, bilingual
naming, touch-target behavior, and a usable textual account of the visit. Visual and motor
access are part of the finished route, not a post-expansion enhancement. The inaccessible M4
upper rows are a genuine unresolved product question: equivalent portrait information can
improve access, but does not make the spatial viewing limitation disappear. Changing look caps,
stops, or B9 remains an owner decision. Present that conflict explicitly rather than hiding it
in an accessibility patch or asking for repeated phone swipes as the solution.

**Revisit devices at two deliberate points.** Use targeted device checks during any light or
loader change that alters decode, allocation, or readiness behavior; then perform one coherent
acceptance pass after the accepted stack. Cover the relevant tiers, portrait/landscape use,
state blending, room handoff, repeated entry/exit, and capture/export resource peaks. Preserve
the existing deterministic plan and required scenario coverage. Feed failures back into one
causal round rather than reopening the mobile program as an indefinite collection of
handset-specific patches.

**Let finishing repair observed discontinuities.** After the light and arrival behavior settle,
review the fixed route in its actual sequence. Prioritize a broken threshold or light handoff,
then loss of architectural or portrait legibility, then isolated material defects; decorative
completeness comes last. Each selected correction needs an evidence reference, a visible
before/after claim, and a budget delta. Do not automatically reopen Rastrelli, add Square props,
or start the 1812 ceiling because those rooms occupy parallel slots. The post-Phase-4 finishing
queue should become a bounded acceptance round, not a second reconstruction phase under a softer
name.

**Close Reach without absorbing the parking lot.** The accessibility work, accepted latency
corrections, final device acceptance, and a bounded finishing pass belong to closure. Tier
watchdogs and abort-seam work join that scope only where a demonstrated failure needs them;
ADR-0015's sharpness posture stays in force. Thin soundscape, Rastrelli's Line, the year
display, and additional environmental programs wait unless a specific correctness issue elevates
them. The Neva facade, Pavilion Hall, Floodlit facade, and The Cut are expansion candidates, not
unfinished business owed by Phase 4. Defer the WebGPU ADR until the performance findings can
establish whether a renderer change addresses an actual constraint.

## 3. Future-round shape

**One round should resolve one decision or one coupled implementation.** A room light program
may legitimately include three bakes, encoding, materials, and manifests because those artifacts
form one contract. A loading round may include lifecycle and cancellation because they share one
mechanism. Neither should also introduce navigation changes or an ornamental program. The
round's opening statement should identify its question, baseline, owned boundary, acceptance
claim, and rollback boundary. If its success cannot be described without several unrelated
"and" clauses, split it before commissioning the specialist.

**Measure the affected bottleneck before requesting design.** A brief should carry the relevant
commit, approved evidence, frozen viewing conditions, current artifact and runtime costs, pending
reservations, and costs of plausible capabilities. For visual work, include the actual
camera/state views the audience can reach; for performance, include traces rather than a
room-open anecdote. Missing triangle inventories, transition peaks, or source photographs should
be named as missing — not replaced by reassuring aggregate headroom. Do not run a universal audit
every round; obtain the measurements that could change that round's choice.

**Keep one authoritative reservation ledger.** Charge shared JS and shared assets once,
distinguish committed use from reserved deltas, and release reservations when a candidate is
abandoned. Update room balances after merge rather than presenting the pre-branch table as
indefinitely current. A declared +3,000 B allowance must fit the remaining shared envelope
alongside other reservations. Assign DEC numbers through the integrating authority so parallel
sessions do not infer the next number from an old count. No branch gets to spend another
branch's optimistic savings before those savings land.

**Preserve the relay's distinction between judgment and execution.** Creative briefs should
contain facts, constraints, and capability costs without steering the answer toward a
predetermined ornament or technology. Mechanical briefs should pin the already-approved
contracts tightly enough that execution is not another design election. Continue one brief at a
time to a specialist and salvage-integrate the result rather than pasting it. The vision round
can solicit distinct judgments, but it needs a bounded question and a synthesis decision — not a
permanent consensus loop that repeatedly reopens settled work.

**Freeze the interfaces that make parallel work possible.** Route and camera laws,
threshold/copy commitments, room-manifest structure, shared light encode/decode semantics, and
the selected decoder family should not drift through incidental cleanup. A necessary change to
one is a named cross-cutting round with affected consumers listed. Preserve the three-state
light model and blend contract unless the owner explicitly commissions a change. In particular,
do not let a percentile-encoding improvement appear compatible merely because its originating
room looks correct; establish compatibility or migrate every affected consumer deliberately.

**Make documentation carry decisions, not repeated history.** Keep the required design doc, DEC
row, ROUNDS row, and in-session STATE update. Give each a different job: design reasoning;
authoritative decision; historical outcome; current operational truth. Link rather than recopy
the same budget narrative into all four. Keep the artistic-license register complete for visible
invented claims, and distinguish it from source-rights records: acknowledging stylization does
not establish permission to use an image. A parked item needs its reopening trigger and
consequence, not a growing essay in every subsequent round.

**Use the vision round after consolidation and before expansion.** Its input should be the
completed four-stop experience, reconciled budgets, accessibility findings, and room-open
evidence. Its job is to decide what the next destination contributes to the visit and portfolio
that the current route cannot — not to rank every attractive palace room. My default remains no
expansion until the current route meets its accepted quality class. The vision decision should
choose at most one next commission, identify what stays out, and state why that choice deserves
the owner's scarce evidence, review, and rebake capacity. «Remain a complete four-stop work»
must be a legitimate outcome.

**Resolve the seven-room accounting before promising a slate.** There are four route
destinations but three interiors in the supplied description; the charter's treatment of the
Square and future exterior destinations is not established here. Plan conservatively with three
uncommitted destination slots until the actual counting rule is confirmed. A genuinely new room
pair consumes two slots, not one project label. Under that conservative reading, The Cut plus
the Pavilion Hall would exhaust the remainder. Exterior variants must be classified honestly as
states, views, or new destinations; renaming a room must not evade the charter.

**Admit a room only as a fully costed visit.** Require owner authorization for the route change,
an evidence and rights packet, TRUE-coordinate bounds, sha-budgeted assets, stops/look rows,
three light states and blend weights, neighbors and airlock, explicit bytes/textures/triangles/
draws/VRAM limits, and the existing seven acceptance classes. Add shared-JS impact,
transition/capture peak residency, bilingual access, mobile-plan expansion, and
golden-maintenance cost to the admission packet. Prove one representative difficult view on the
target device before commissioning the full asset set. A room that fits its payload directory
but breaks arrival, accessibility, or review capacity has not passed admission.

**Give each room a bounded light commission, not a new lighting engine.** Establish its
evidence-led value hierarchy and a representative difficult surface before final production
bakes. Stabilize architecture, occluders, fixture decisions, and material grouping before the
full three-state bake; validate blends as well as endpoints. Reuse the common sky and encoding
contracts while allowing room-specific treatment within them. Schedule a full rebake when the
proposed feature requires one, rather than concealing it inside a detail allowance.
Evidence-blocked fixture forms stay blocked even when a convincing illumination approximation is
technically easy.

**Protect the owner from approval saturation.** Every owner-facing packet should show the
decision needed, relevant fixed-view comparisons, budget delta, license consequences, expected
golden changes, and a clear recommendation. Separate source-evidence requests from merge
approvals so an unavailable photograph does not hold unrelated work hostage. Group genuinely
coupled visual changes into one reviewable packet, but do not bundle unrelated changes to secure
a blanket rebaseline. Mechanical diagnosis and recovery belong with the integrating sessions;
the owner's attention belongs on evidence, visible intent, cap changes, Frozen laws, and
admission of new scope.

**Stop accumulating contingent commitments.** The principal risks are not a shortage of build
ideas: they are a nearly closed shared code envelope, resource peaks hidden between honest room
ledgers, golden fatigue that normalizes unintended changes, duplicated documentation that
obscures authority, and parallel output exceeding the owner's review capacity. Keep the current
release bounded, finish or explicitly park each active commission, and start the next only when
its evidence and approval path exist. The project should grow because the next room strengthens
the work — not because another round can be made to fit.
