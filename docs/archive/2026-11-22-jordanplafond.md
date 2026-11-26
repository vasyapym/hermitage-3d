# jordan-parallel — the plafond round (the ceiling slice; the ranked #2)

Opened 2026-11-21 · branch jordan-parallel off main c05a451 · PARALLEL, worktree
~/Documents/hermitage-3d-jordan-parallel · the merge + the FULL gate ride the owner's
signal. The vault folder: 03_projects/hermitage-3d-2026-11-21-jordan-parallel (briefs
1–4; replies, harvests, probes, the eye pages). Byte-check off (the deliverable was a
ruling; the repo's own gates verify the artifacts).

## The directive and the pick

The owner's directive (the repeat of the jordan-fixtures shape): investigate, let the
creative pinpoint, zero steering. The creative (Fable) ranked: #1 the painted plafond
(the j2 caption promises «расписной плафоном»; the vault is bare plaster + coffers), #2
the west end wall (the 2b class), #3 the windows, #4 the packer px-floor class, #5 the
pendants' tangency. THE PICK: the plafond, geometry + paint — a smooth painted field in
a gilt frame cut into the vault's bay grid. The owner settled: figure-free procedural
first (the authored painting later), the 48 margin coffers KEPT (E4 closed), the bake
here, byte-check off.

## The landed shape

- **Geometry** (tools/bpy/jordan.py): PLAFOND_BAYS ((2,7),(2,6)) — the S5 night-pool
  shift (the chandelier rig lamp at x 86 hangs 2.75 m inside the east bar; the v1 field
  ((2,6)) left the lamp 0.5 m OFF the picture). The field 20 faces/40 tris, the
  field-planar UV1, the one-shot material 'plafond' (roughness 0.85, CLAMP_TO_EDGE,
  ONE_SHOT_MATERIALS + the realize guard); the gilt frame ring 58 quads (the x-bars own
  the corners + the end caps, the z-bars trim along the chords and butt the inner
  faces, the radial drop law n = ((yc−y),(zc−z))/r). Cells 3,474 → 3,372 (the fixture
  retired ranges re-seat −102: the sconce 2993, the chandelier 2779); the gltf/gltf
  chain declarations + the census PLAFOND pins (3372/31,882/44). Tris drawn 32,086 →
  31,882 (−204), draws 42 → 44. GEOMETRY_SHA af1027bd…, ATLAS_HASH a2ea908d….
- **The light**: nothing authored; the bake alone. The intensity bytes 0.45/0.35/4.0
  and the gains 2.22/2.86/0.25 byte-untouched. The albedo-free lm (DIFFUSE, COLOR off)
  is the operational lever: the plate swaps iterate by captures only.

## The black-wedge class (the owner's sighting; the value-space root cause)

The owner saw black lines on the wall columns and at the 1812-entry frames. The frame
diffs: the darkest column −55±10 % in ALL three states (day 47.9→28.2 · dusk 44.3→20.5
· night 33.6→18.0) — the albedo-side loss signature, not a crossed-cells bug. ROOT: the
ruling authored the plate's constants as LINEAR (0.62→0.32); v1 mapped them into the
house's stored-sRGB space without conversion — the ceiling's albedo landed ≈ 0.15
linear vs the plaster's ≈ 0.52; the ceiling became a light sink and every surface fed
by its bounce collapsed. FIX: the generator computes in LINEAR and converts to stored
at the boundary (_srgb_encode); the painted-sky composition v3 (the sunburst, two cloud
banks, the balustrade ring along the picture edge, the glaze) landed at linear 0.413;
the re-bake restored the columns to 90–96 % of the committed fill (43.2/41.9/31.4 vs
the golden's 47.9/44.3/33.6) — the class CLOSED. Recorded lessons: the ruling's numbers
live in the space the ruling names; the stored-space convention needs the explicit
conversion at the generator's boundary; a ceiling's albedo is a room-wide light
parameter, not a local texture.

## The review pass 1 (the reviewer; salvaged at 31f9931)

Accepted+fixed: the rim gradient scaled to metres (the pixel/метre mix); the cloud
bodies returned to the ruling's literal fixed −0.15 luminance drop; the AREA comment's
coffers figure −212.12 → −256.01. REJECTED with the record: LM_CELLS.expected 3,272 =
the house's face-count arithmetic (the committed precedent 3,374 vs the measured 3,474
carried the same +100 sub-cell delta; the census D5 validates the measured). RETIRED as
unimplementable: the S6's post-bake PLATE_MAX/PLAFOND_LM_SCALE ladders (a plate-only
edit cannot move the baked lm clip counter; the cells knob has no consumer; the
face-removal variant breaks the fixture pins — packing/topology rides a separately
baked revision). Verified positive: the plafond sampler wrapS/wrapT 33071 in the glb vs
the tiled 10497. Recorded-deferred: the frame's corner-joint ~3 cm plan mismatch
(sub-visible at the rail distances; rides the next geometry occasion with the parked
px-floor class).

## The ceiling's painting (brief 4; the SVG path)

The image-generation path was blocked by the provider policy (2 attempts) and the
websearch 403'd; the PD-Art route died on quality (the ceiling photos are shot from the
floor). The creative composed an ORIGINAL SVG (the Gods-at-Olympus allegory; the
statue-posture silhouettes — abstracted masses, no faces; the charter's
painted-likeness distinction covers painted figures; zero third-party rights — no
reproduction/dataset/photo input). Committed: tools/bpy/plafond-art.svg (17.1 KB) +
tools/bpy/plafond-raster.mjs (the deterministic Chromium raster at 1024²,
preserveAspectRatio=none; ×2 sha-equal 87697fbb…). The integration bugs found and
fixed: the missing preserveAspectRatio (the letterboxed white bands) and
img.channels read AFTER bpy.data.images.remove (the ReferenceError class). The plate:
linearized + normalized to PLATE_TARGET_MEAN_L 0.41 (the measured 0.422, the drift
+2.2 % — the swap-without-re-bake law holds); the glb byte-identical. The posture row
landed in docs/artistic-license.md.

## The re-bake and the gates

The re-bake wall: day 2,703.6 · dusk ~2,977 · night 2,946 s — the App-Nap throttle
find: the first bake's night took 25,846 s WITHOUT caffeinate (the background process
napped); the owner's caffeinate cut it 8.8×. The lm: day 455,240 B 779010b8… · dusk
362,744 dc2575fe… · night 315,928 e871a53f…. The encode rows: day clipped 0.022793
(the FIELD's own 0.000 — the plate cap holds; the frame's 4.94 % direct-bounce
highlight = the recorded bust class, the eye arbitrates) · dusk 0.000448 ✓ · night
0.000272 ✓. The night pool: east/west 1.89 (the ≥2.5 prediction busted by the bounce
softening — recorded; max/p99 0.72 ≥ 0.5 ✓). The census PASS (3372/31,882/44, W
byte-equal). The captures 21/21 (the stale-dist trap recorded: the plate swap needs
pnpm build before the battery). pnpm validate GREEN (JS 287,527 ±0 · RU 7,427 · the
room payload 1,657,498/7,000,000 = +96,392 of the declared ≤ +600,000; the texture line
1,307,119/4,000,000 = +88,503 of ≤ +400,000).

## Waits (parked, not lost)

The west end wall / the 2b articulation (the next slice) · the pane view plates (share
a future re-bake) · the frame corner-joint rework + the packer px-floor revision (the
next natural geometry occasion) · the authored-figure composition refinements (the
SVG swaps iterate by captures only, the mean pin) · the S6's number-ladders are
retired — the look's remedies are the eye + a re-bake.

## The merge protocol (what rides the owner's signal)

The FULL e2e/golden battery + the CI verdict + the J4 ×3 golden re-baselines (the
DEC-ready row — the number from the integrating authority) + the records flip (the
STATE/ROUNDS/ledger rows to their MERGED shapes; this archive carries the narrative) +
the artistic-license row's ratification. AS-4: the geometry merges first, the bake
last, once — this lane's bake IS the once; a co-tenant jordan geometry change would
re-invalidate (no jordan co-tenant: the other agents work in different rooms).

## The merge (2026-11-23)

The merge commit 251061c (Merge branch 'jordan-parallel' into main); the gate commit 631adda on
top of it (the union validate green — the plafond SVG's `<title>` restored: the biome a11y gate;
the staged rewrite had dropped it). The displaced OPEN-shape facts: the worktree branch
jordan-parallel off main c05a451; the merge + the FULL gate rode the owner's signal; no jordan
co-tenant (the other agents worked in DIFFERENT rooms — AS-4's last-once = this lane's bake, and
it held through the merge); byte-check off — the deliverable was a ruling.

**The FULL gate VERDICT: PASS** — the chromium+golden battery 122 passed / 4 failed (1.7 h).
The 4 = the recorded classes: the 3 walk-stall rows (the arrow-walk airlocks — smoke.spec.ts:172 ·
the keyboard walk — smoke.spec.ts:297 · the touch-rail walk row — touch-rail.spec.ts:965; the
machine-stall family, CI green = the authority) + the scrub-double-click row
(scrub-double-click-season.spec.ts:11 — the recorded scrub-11 flaky race, the +12 h noon-anchor
class, docs/archive/2026-11-13-doorwayreads.md). The goldens: 0 flips — the jordan J4 day/dusk/night
×3 HELD (the plate's signature sub-gate — the DEC-048 precedent; the DEC-ready row retired without
a number — the jordan-ghost-split precedent) and the rg-f5 ×3 HELD likewise; no re-baselines due
(the gate commit touched no snapshots). CI rides the push (the local verdict the authority).
pnpm validate GREEN (JS 287,527 · payload jordan 1,657,498/7M).

- The ledger reservation row (moved from docs/budget-ledger.md 2026-11-26, the records decision step 6):

| **jordan-parallel** | the Jordan Staircase's plafond round (PARALLEL, worktree branch jordan-parallel off main c05a451): the ranked #2 the painted plafond — the field (bays ((2,7),(2,6)), 20 faces, field-planar UV1, the one-shot 'plafond' material CLAMP) + the gilt frame ring (58 quads) in jordan.py; the plate: the linear-space generator v3 + the creative's ORIGINAL SVG painting (tools/bpy/plafond-art.svg → the deterministic Chromium raster, the mean pin 0.41, the swap-without-re-bake law) · zero-JS · the 3-state bake ran in the lane (the App-Nap find: caffeinate cut the night wall 25,846 → 2,946 s) | MEASURED (the merge + the FULL gate ride the owner's signal): the texture line 1,307,119/4,000,000 (+88,503 of ≤ +400,000: the plate 127,045 B, the lm −35 K by the repack) · the payload 1,657,498/7,000,000 (+96,392 of ≤ +600,000) · tris drawn 31,882 (−204) · draws 44/60 · cells 3,372 ≤ 3,500 (the fixture ranges re-seat −102) · JS 287,527 ±0 · RU 7,427 ±0 · GEOMETRY_SHA af1027bd… · ATLAS_HASH a2ea908d… · the day total clip 0.022793 recorded (the FIELD's own 0.000; the frame's 4.94 % highlight class) · the columns vs the golden 90–96 % (the black-wedge class CLOSED — the value-space root cause: the ruling's linear numbers landed as stored; the ceiling's albedo is a room-wide light parameter) · pnpm validate GREEN · census PASS · DEC-ready: the J4 ×3 golden flips (the number from the LAST merging session) | MERGED 2026-11-23 (251061c) — SPENT and RELEASED; the FULL gate VERDICT: PASS (122/4 = the recorded classes; the J4 ×3 HELD — the DEC-ready row retired without a number) |
