# The ground-snow look — the trampled-snow ground term (R12, design)

Phase 4 · Reach, round R12 (2026-10-28). Design by the CREATIVE relay (a zero-steering brief rode
in-chat and the owner's vault — not committed, the R-UX2 precedent); the reply fact-checked at
integration (§0.1); ratified by the owner the same day (§11). The implementation DEC (DEC-035) is
written at ship. The cap (design-winter §2), the kit's slot (§3), the season law, the chooser, the
sky, the chrome, the URL grammar, the interiors and the light count are untouched by this round.

## §0.1 Integration corrections (the orchestrator, against the tree)

1. The reply's §8 interior-hemisphere uncertainty is RESOLVED: the light seam (main.ts:908–919,
   the r17c seam) hides sun and hemisphere indoors (`visible = false`) — the §3 law cannot reach
   any interior material; §3 ships without the gating conditional.
2. §6.4's sRGB slip: sRGB of 0.38 linear is ≈ 0.65, so the lane-vs-floor step is ≈ **51/255**
   pre-tonemap (the reply's «0.69 vs 0.85 ≈ 40/255»); the 1.8× linear ratio stands.
3. §2.5's wedge prose aligned to §6.4's own arithmetic: the lane converges to **≈ 100 px core
   (≈ 220 px to the shoulder edges)** at the facade foot from S0 (the reply's «~120 px»).
4. `glslFloat` is module-private to facade-builder.ts — the ground module carries its own
   one-line twin; the kit module is not widened.
5. Distance-record slips recorded so they stop propagating: the recorded 0.19 m/px at S0 matches
   the TRUE eye-to-facade distance (230 − 93.5 = 136.5 m → 0.197 m/px; the record's «at 230 m»
   label is wrong — 230 m gives 0.33 m/px); the recorded «4.7 px at S1» does not reproduce
   (0.5 m at 30.5 m ≈ 11 px; 4.7 px implies ~74 m). Out of scope; noted, not cited.
6. design-winter §3's «roughness toward ~0.9» is unshippable on MeshLambertMaterial as written —
   the shipped kit slot mixes albedo only. Noted here; the kit is untouched by this round.
7. The brief's «the plane has 2 vertices» corrected: PlaneGeometry(600, 600) has 4 vertices /
   2 triangles (the design's own phrasing was right).
8. §6.3's smoke folds into existing coverage — no new e2e spec (this also avoids the chromium
   `testMatch` allowlist trap the R11 lesson recorded): the season spec's existing winter rows
   boot the patched program on CI (a splice failure fails the page loudly), the unit tests pin
   the laws, and the golden re-baseline pair proves the render. The uniform-value smoke is
   module-level and covered by the unit file + integration review of the 3-line wiring.

## §1 The extent — the plane is the city's ground; the SQUARE is distinguished by trample, not by cover

Resolution (ratified): the snow COVER applies to the WHOLE 600×600 plane, weighted by wSnow; the
TRAMPLE is what makes the square the square — a uniform trodden floor plus ONE lane along the
viewer's route (x = 0), continuing through the gate into the courtyard. Nothing else partitions
the plane.

1. Snow cover is a law of the date for every horizontal surface in the city (that is exactly what
   wSnow encodes: the probability of persistent cover, not a depth). A plane that is white only
   inside a rectangle and dark beyond it would show an asphalt island or a bare city — a fidelity
   nobody asked for and a boundary line the frame would have to hide.
2. The plane has no visible partition the frame can honour: from S0 the ground runs from the foot
   of the frame to the facade foot and sideways (yaw ±35°) to the plane's own edge at ±300 m,
   where the sky dome begins. Any cut at x = ±105 or at z = 93.5 is either hidden (under the
   facade) or reads as a seam. From S1 the only ground besides the square is the courtyard floor
   seen THROUGH the arch mouth — and the route continues there, so the lane continues there.
3. Register row 21 says «the square» because the square is the only ground the viewer stands on
   and the deviation from the real palace is the TRAMPLE (the real square is machine-cleared),
   not the cover. The amended wording (§5) says exactly that.
4. Spatial variation needs NO geometry: the 4-vertex / 2-triangle plane interpolates a
   world-position varying perfectly; the trample field is evaluated per fragment. Vertex colours
   / re-subdivision are not used (declined: they would make the extent a geometry decision for a
   shading question).

Consequence: the courtyard and the ground under the footprint receive the same term (unseen
except through the arch, where the lane is what shows). The plane's edge at ±300 m becomes a
bright edge against the dome instead of a dark one (risk, §8).

## §2 The ground law

### 2.1 Mechanism

ONE `onBeforeCompile` + `customProgramCacheKey` on the existing `groundMaterial` (the kit slot's
discipline, applied to a second, separate Lambert): an albedo term only — Lambert has no
roughness or metalness, so the «packed-snow roughness» of the season-chooser §7 sketch has no
carrier and is dropped (stated, not pretended). 0 draws, 0 triangles, 0 textures, no hash, no
noise (the DEC-019 discipline: every edge comes from an analytic smoothstep of world position).

Files (the house style binds each):
- `src/world/ground-snow.ts` — PURE (three-free, DOM-free): the constants and the TS twins of
  the GLSL laws (`trampleField`, `groundSnowAlbedo`, `snowBounceGround`), so every constant that
  ends up in GLSL is test-pinned in TS and generated into the shader string from the SAME export
  (the SNOW_FACING lesson: a constant and its compiled GLSL must have one source).
- `src/procedural/ground-snow.ts` — three-dependent: `GROUND_SNOW_UNIFORMS`, the GLSL strings
  generated from the pure constants via a private one-line `glslFloat` twin (§0.1.4),
  `patchGroundSnowSlot(material, uniforms = GROUND_SNOW_UNIFORMS)`, the same `spliceChunk`
  discipline (throw on a missing anchor).
- `src/main.ts` — three lines: patch the ground material at creation; write
  `GROUND_SNOW_UNIFORMS.uSnow.value = wSnow` in `applyEpoch` beside the kit's write; the
  hemisphere law of §3 replaces the `hemi.groundColor.setRGB(...)` line.

### 2.2 Constants (all linear RGB or metres; every one a TUNING TARGET unless marked LAW)

| name | value | unit | rationale |
|---|---|---|---|
| `GROUND_SNOW_FRESH_LINEAR` | `SNOW_ALBEDO_LINEAR` = [0.82, 0.86, 0.92] (re-exported, not duplicated) | linear albedo | one snow colour in the repo: cap, kit slot and ground agree; fresh dry snow albedo 0.8–0.9 |
| `GROUND_SNOW_TRAMPLED_LINEAR` | [0.38, 0.39, 0.41] | linear albedo | aged/packed urban snow albedo 0.3–0.5 in the literature; chosen near the low end so the lane survives AgX's compression of near-whites and stays ≥ 1.8× below the fresh value |
| `GROUND_TRAMPLE_BASE` | 0.3 | 0–1 | the square's floor away from the lane is trodden everywhere, never pristine: 0.3 keeps it clearly lighter than the lane (albedo ≈ 0.69/0.72/0.77) yet off-white, not paper |
| `GROUND_LANE.coreHalfM` | 10 | m | the route's full-trample core: 20 m is the breadth of the pedestrian flow across the real square toward the gate |
| `GROUND_LANE.edgeHalfM` | 22 | m | the feather to the base floor; 12 m of feather is ~60 px at the facade foot from S0 (§6.4) — a soft shoulder, not a painted stripe |
| `GROUND_SNOW_CACHE_KEY` | `'Ground/snow-slot@1'` | LAW | patched and unpatched programs never share a cache entry |

### 2.3 Laws (stated once; the TS twins and the GLSL are the same formulas)

```
lane(x) = 1 − smoothstep(coreHalfM, edgeHalfM, |x|)      x = world X, metres
trampleField(x) = GROUND_TRAMPLE_BASE + (1 − GROUND_TRAMPLE_BASE) · lane(x)   ∈ [BASE, 1]
snowRgb(x) = mix(FRESH, TRAMPLED, trampleField(x))
groundAlbedo(x, w) = mix(asphaltRgb, snowRgb(x), w)      w = wSnow
```

- The lane is a function of world X only (infinite along Z): it runs under both stops, through
  the gate and across the courtyard — the route is one straight line at x = 0. Where it is not
  visible (under the footprint, far north) it costs nothing.
- `uSnow` is written per frame from `snowWeight(epochMs)` — the SAME instant the sun samples; no
  new time source, no Date.now(), no Math.random (the purity gate).

### 2.4 Shader-level spec (only what the implementer must not invent)

- Vertex: after `#include <common>` declare `varying vec2 vGroundXZ;`; after
  `#include <worldpos_vertex>` write `vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;`
  (do NOT read three's `worldPosition` — in Lambert it exists only under USE_SHADOWMAP et al.;
  the ground mesh is not instanced, no instanceMatrix branch).
- Fragment: after `#include <common>` declare `uniform float uSnow; varying vec2 vGroundXZ;`;
  replace `#include <color_fragment>` with the chunk followed by a block that computes `lane`,
  `trample`, `snowRgb` as in 2.3 and ends with
  `diffuseColor.rgb = mix( diffuseColor.rgb, snowRgb, uSnow );` — rgb only; `.a` (the fade's
  opacity) untouched. Verified in three 0.186: the Lambert fragment carries `color_fragment`
  after `map_fragment` and BEFORE the lighting includes — the surface-before-light order holds
  structurally. Surface term before any light term (the slot contract's order, kept).
- All literals emitted through `glslFloat(constant)`; no hand-typed numbers in GLSL.

### 2.5 What it looks like (the claims §6.4 backs with arithmetic)

- S0, Dec 21 10:00Z and Jan 15 10:00Z: the lower ~45% of the frame turns from asphalt to a cool
  off-white floor with a darker grey wedge converging from ~690 px wide at the frame's bottom
  edge to ≈ 100 px core (≈ 220 px to the shoulder edges) at the facade foot (§0.1.3) — a trodden
  path to the gate. The sun is behind the camera at 6.6–9°, so the ground is lit mostly by the
  sky (grazing sun: sin 6.6° ≈ 0.115 of the facade's irradiance) — a blue-grey snowfield under a
  warm-lit facade, which is what a winter photograph of the square looks like.
- S1: the viewer stands IN the lane (its 10 m core is wider than the frame's 4.6 m half-width at
  the bottom edge); the shoulders appear only toward the facade foot (lane ≈ 453 px wide there);
  through the mouth the courtyard floor is the lane continuing.
- dec-night: the sun is off; the ground plane's up normal is lit by `hemi.color` (near-dark sky)
  — albedo × near-zero is still near-black; the frame changes by bytes, possibly below the
  differ's 51/255 blindness. Nothing new is lit at night; no term is added for it (the lattice
  remains the night subject by DEC-019).

## §3 The light treatment — the snowfield's bounce: DESIGNED (pure TS, hemisphere precedent)

Today: `hemi.groundColor = warmGround(0.25·h, WINDOW_WARM_LINEAR, wNight)`. The 0.25 encodes a
dark asphalt bounce. A trodden snow square returns most of the sky light it receives.

Law (`src/world/ground-snow.ts`, pure, endpoint-exact; `lerp(a,b,t) = a·(1−t) + b·t` — a private
twin of night-facade's, which is not exported):

```
GROUND_BOUNCE_LINEAR = [0.50, 0.52, 0.56]     tuning target, linear
snowBounceGround(h, wSnow) = lerp3( 0.25·h , h ⊙ GROUND_BOUNCE_LINEAR , wSnow )
hemi.groundColor = warmGround( snowBounceGround(h, wSnow), WINDOW_WARM_LINEAR, wNight )
```

- Composition order: season term first, night term second. At wNight = 1 the result is
  WINDOW_WARM_LINEAR bit-exactly whatever wSnow is — dec-night's hemisphere is UNCHANGED, the
  lattice law's night endpoint is preserved. At wSnow = 0 the inner lerp returns 0.25·h
  bit-exactly (a·1 + b·0 = a in IEEE) — the pre-R12 line.
- 0.50/0.52/0.56 rationale: the square's mean albedo under the trample base (~0.69/0.72/0.77)
  discounted by ~0.7 for the view factor (a vertical facade sees the square at grazing angles
  and other buildings fill half its lower hemisphere); slightly blue because the bounce carries
  the sky's tint, not a warm one.
- Effect: a vertical surface's hemisphere irradiance rises from 0.5·sky + 0.125·h to
  0.5·sky + ~0.26·h — the shaded facade stone, the undersides of the cornice lips and the
  throat's soffit lift gently; the sunlit south face barely changes. No Light objects; counts
  frozen. RESOLVED (§0.1.1): the light seam hides sun/hemi indoors, so no interior material can
  receive this — no interior golden can move.
- Declined alternative: lifting `hemi.intensity` — it would brighten the sky term too (the roof,
  the cap's tops) and is not a ground property.

## §4 The identity law at wSnow = 0

1. Ground albedo: `mix(a, b, 0.0)` = `a + (b − a)·0` = `a` exactly in IEEE; the added varying
   feeds nothing else; opacity untouched; the shadow/depth materials are not patched. The June
   and October frames are analytically the pre-R12 bytes.
2. Hemisphere: the inner lerp at t = 0 is bit-exact (§3); the outer call is today's call.
3. Fence fallback (the recorded one): if the patched program drifts ≤1 LSB out of season on the
   reference GPU, gate the whole fragment block behind `#ifdef GROUND_SNOW`, set
   `material.defines.GROUND_SNOW` from `snowVisible(wSnow)` per frame and fold the flag into the
   cache key (`'Ground/snow-slot@1/' + flag`) — the out-of-season program is then literally
   today's Lambert plus an unused varying; the cost is one program compile when a scrub crosses
   Nov 10 / Apr 20. The fallback is a decision to be recorded, not a silent switch.
4. Out of season the term costs exactly one uniform write per frame.

## §5 The amended register row (paste-ready; replaces the existing Snow line)

- **Snow (Phase 4, R8; square amended R12)** — snow follows the mean season (climatology), not
  the weather; the square carries trampled snow with a trodden lane along the viewer's route
  (the real square is machine-cleared); the roof stays bare; the cornices carry the lip.

## §6 Test / golden impact map

### 6.1 Scene goldens

- RE-BASELINE (named here, by this round's DEC): `golden-dec-noon.png`, `golden-dec-night.png`.
  dec-noon is THE verdict site; dec-night re-baselines on bytes even if the YIQ differ cannot
  see it (the R-UX4 lesson: the fence is blind against near-black; the R9.1 precedent
  re-baselined it the same way). Re-baseline filtered to these two files; every other PNG
  reverted (the recorded procedure); both baselines visually read.
- BYTE-IDENTICAL (wSnow = 0 ⇒ §4): `golden-noon`, `golden-white-night`, `golden-s1-noon`,
  `golden-oct-night`. The nine interior goldens (the palace group — the ground with it — hides
  indoors; §0.1.1 closes the seam question). The 16 DOM layout fixtures (canvas hidden,
  strict 0-diff).
- NO partial-season golden (the mix is linear in wSnow; covered by the unit twin + the season
  spec's winter boots).

### 6.2 New unit tests — `tests/ground-snow.test.ts` (Vitest node, no jsdom)

- purity: regex scan of `src/world/ground-snow.ts` for `from 'three'`, `document`, `window`.
- `trampleField`: symmetric in x; equals 1 for |x| ≤ 10; equals `GROUND_TRAMPLE_BASE` for
  |x| ≥ 22; monotone non-increasing on |x| ∈ [10, 22]; range [BASE, 1].
- `groundSnowAlbedo(x, 0)` returns the asphalt input bit-exactly for x ∈ {0, 15, 300}; at w = 1,
  x = 0 returns TRAMPLED exactly; at w = 1, x ≥ 22 returns `mix(FRESH, TRAMPLED, BASE)`.
- `snowBounceGround(h, 0) === 0.25·h` bit-exactly (toBe on each channel, not toBeCloseTo);
  `snowBounceGround(h, 1) === h ⊙ BOUNCE`; `warmGround(snowBounceGround(h, w), WARM, 1) === WARM`
  for w ∈ {0, 0.5, 1}.
- constants: `GROUND_SNOW_FRESH_LINEAR` is `SNOW_ALBEDO_LINEAR` (same reference); TRAMPLED
  channel-wise < FRESH; lane core < edge.
- GLSL/TS agreement (the SNOW_FACING lesson): the exported fragment body string contains
  `glslFloat(coreHalfM)`, `glslFloat(edgeHalfM)`, `glslFloat(GROUND_TRAMPLE_BASE)` and all six
  albedo channels — a constant can never change without the compiled shader following.
- `patchGroundSnowSlot` with a fake material: sets `onBeforeCompile` and
  `customProgramCacheKey`; the compile hook throws on a shader lacking
  `#include <color_fragment>` (the anchor contract).

### 6.3 Smoke (folded — §0.1.8)

No new e2e spec. The season spec's existing winter rows boot the patched program on CI (a
splice failure fails the page loudly); the uniform-value law is covered by the unit file; the
main.ts wiring is 3 reviewed lines; the re-baselined dec-noon golden proves the term renders.

### 6.4 Pixel arithmetic (the legibility claim)

Focal length in pixels at 1280×720, fov 55°: f = 360 / tan 27.5° ≈ 691.5 px.

- S0 horizon: gaze pitch = atan(9.3/230) = 2.3° up ⇒ horizon ≈ 28 px below centre (row ≈ 388);
  the facade foot (136.5 m away, 1.7 m below the eye, 0.71°) ≈ row 397. Ground = rows ≈ 397–720
  = 323 rows × 1280 ≈ 413 k px ≈ 45% of the frame. The term is not a small-delta feature; it is
  45× the 1% fence — re-baseline is structural, legibility is a luminance question only.
- Lane width at the facade foot from S0: 20 m × 691.5 / 136.5 ≈ 101 px core, ≈ 223 px to the
  shoulder edges; at 20 m ahead ≈ 690 px core — a visible perspective wedge, feather ≈ 60 px/side
  at the facade foot (never a hard stripe).
- S1: horizon ≈ 106 px below centre (row ≈ 466); the facade foot (30.5 m) ≈ row 505; square
  ground rows ≈ 505–720 ≈ 30% of the frame; lane core at the foot ≈ 453 px.
- Luminance (the uncertainty): lane 0.38 vs floor ≈ 0.69 linear is a 1.8× step — ≈ 0.65 vs 0.85
  in sRGB terms at equal exposure (§0.1.2), ≈ 51/255 before AgX. The absolute ground level
  depends on `atmosphere.sunIntensity` and the hemisphere at 6.6° (not in the brief) — see §8.

## §7 Budget declaration

- JS gzip ceiling: **+3,000 B** ⇒ ≤ 276,945 of 350,000. Expected ≈ 1.7 KB: patch module with
  GLSL strings ≈ 1.0 (the kit slot's recorded ≈ 1 KB), pure law + constants ≈ 0.4, hemisphere law
  ≈ 0.1, wiring ≈ 0.15. The ceiling leaves headroom for the §4 define fallback (+~0.2).
- RU i18n chunk: +0 B (no user-facing strings; stays 7,101 of 12,000).
- Exterior payload +0 (stays 0 of 4,000,000); /basis/ +0 (stays 584,862 of 600,000).
- Frame: +0 draws, +0 triangles, +0 lights, +0 materials; +1 shader program variant (+1 more
  only under the fallback); CPU: two more writes per frame (one uniform, one hemisphere colour
  law replacing an existing one).

## §8 Risks and residuals

- RISK — absolute ground luminance: with the sun at 6.6° behind the camera the snow floor is
  sky-lit and may read as light-grey pavement rather than snow if the hemisphere is weak at that
  elevation. Mitigation inside scope: raise BASE toward 0.15 (whiter floor) and/or lighten
  TRAMPLED; the sky palette and exposure are must-not-touch. The first dec-noon render decides
  (the DEC-033 tuning convention).
- RISK — the plane edge at ±300 m becomes a bright line ~4 px under the horizon against the dome
  (today it is dark and unnoticed). A skirt/horizon mesh is out of scope; recorded as an observed
  consequence, fix in a later round if the owner sees it.
- NOTE — `groundMaterial` stays `transparent: true` forever (unlike the kit, it is never flipped
  opaque once settled); unchanged by this round, flagged as a pre-existing cost.

## §9 The SNOW_FACING restoration rides this round's implementation DEC (owner call, ratified §11)

The R9.1 record states the kit slot's facing band was tuned {0.45, 0.8} → {0.3, 0.75}; the
shipped commit changed only the comment — the constant stayed {0.45, 0.8} (verified against
94eb655). The owner ruled (2026-10-28): the recorded intent RESTORES inside R12's implementation
— one line in facade-builder.ts (the comment already documents the intent), re-baselined
together with the ground term's two files, one DEC, one render cycle. The first R12 render is
judged on the restored-record state. (The creative relay's challenge stands: judging the ground
while the facade dusting differs from its own record risks tuning the wrong term.)

## §10 Parked (the relay's challenges, recorded not decided)

- The no-noise discipline's stated reason is cross-run determinism, which a deterministic
  analytic modulation (a low-frequency sin of world position) satisfies as well as a smoothstep
  does. A 45%-of-frame surface with zero spatial texture risks reading as flat paint; the
  discipline kept this round («split, never widen»); the ban should be re-argued on its merits
  in a later round.
- «Trampled snow on a machine-cleared square» is a fidelity trade the owner made for legibility;
  the more faithful winter picture is a cleared dark square between plowed white banks —
  geometry (ridges at the lane edges) the capability facts make cheap (a few hundred
  triangles). Not designed because the ratification's premise is a material term; the natural
  R13 if the flat trample does not satisfy the verdict.
- The distance-record slips (§0.1.5) — an audit candidate for the next docs touch.

## §11 The owner's ratification (2026-10-28)

1. The design is RATIFIED as corrected (§0.1): the extent (whole-plane cover + the route lane),
   the material term on `groundMaterial`, the §3 bounce law, the §5 register wording, the
   re-baseline pair (dec-noon + dec-night, per the R9.1 precedent; dec-night possibly on
   invisible bytes — recorded as accepted), the budget ceiling +3,000 B (→ ≤ 276,945).
2. The lane stays (the invented footfall is the square's read).
3. The SNOW_FACING restoration folds into R12's implementation (§9).
4. Implementation runs as a MECHANICAL relay (the ratified design is the spec; the R11
   precedent).

Docs at ship: DEC-035, artistic-license row 21 (§5), design-winter §9/§4 staleness fixes + a
pointer to this doc, ROUNDS row, STATE row. README untouched (no user-facing surface).

## §12 The winter-square round — the class-I closure (2026-11-09, branch `square-palace`)

The ground round's own census flagged the winter legibility (class I) as «the sky's side of the
fence»; the DEC-041 follow-on round named the fix's home the sky lane and left the flag parked.
The `square-palace` round closed it with ONE enumeration battery + a two-term re-declaration:

- **The battery (dec-noon `at=2026-12-21T10:00:00Z&det=1`, desktop 1280×720 at S0; local
  `probes/palace-snow-battery/`):** P1 baseline **0.275** field/sky (linearized) — and the
  straddle reads (≈86–87/255 across the whole lower half of the frame) proved the P1
  foreground IS the lane by construction: the ±10/±22 m lane centred on the rail sits under
  the camera at every stop, so ~9/10 of the visible ground pixels read the TRAMPLED tone.
  P2 all-fresh albedo (TRAMPLED→FRESH, BASE→0) **0.576** — still below the declared 0.6
  target → **the LIGHT bounds the winter ground; the authored albedo was the louder half of
  the class-I story** (the old «sky core» attribution held only under the old constants).
  P3 the hemi sky ×2 moved the far field above target; P4 `sun.castShadow=false` returned
  byte-identical ground boxes (no shadow-term factor at this instant); P5 — no haze/fog term
  exists in `src/sky/appearance.ts` (verified; N/A toggle).
- **2a — the lane re-declared**: core ×10 → ±**2.5** m, edge ×22 → ±**7** m; TRAMPLED
  [0.38,0.39,0.41] → **[0.55,0.56,0.58]** (packed snow, not slush); BASE 0.3 → **0.1**
  (the off-lane field reads mix(0.82, 0.56, 0.1) ≈ 0.794 albedo); cache key
  `Ground/snow-slot@1` → `@2`. The laws (§2) are unchanged — the constants re-enter the same
  TS/GLSL twins; the pin rows follow (tests/ground-snow.test.ts; the fence's cooperation pin
  re-stated: at COLUMN_Z the fence's west face sits 6.69 m east of the narrow path's line —
  the falloff tail — and the east face 23.19 m — full fresh).
- **2b — the measured sky term** (the owner's CONDITIONAL grant, silently gated): the pure
  law `snowSkyGain(wSnow, wNight) = 1 + wSnow·(1−wNight)·(K−1)` in src/world/snow-season.ts;
  **K = 1.5**, the smallest of the drawn {1.5, 2, 3} meeting the 0.6 target at the measured
  boxes (far-left 0.692 / far-right 0.640 under 2a+K; the near-field box reads 0.512 — the
  path-dominated zone, as drawn). Exactly 1.0 at wSnow = 0 (every June/October frame
  IEEE-identical) and at wNight = 1 (dec-night IEEE-identical by construction — the draw's
  conditional (1−wNight) gate applied unconditionally, so the night re-read need dissolves;
  docs/design-sky-time.md §7's palette stays untouched out of the winter window).
- **Goldens:** expected flips at the merge finale — the square's **dec-noon only**.
  The DEC-033 §6 gate («December becomes legible in daylight») is measured against the
  batteries, not just re-baselined. Budget: JS +69 gz of the declared ≤ +400 (284,110 of
  350,000 at the branch), RU +7, 0 draws / 0 tris / 0 texture bytes.
