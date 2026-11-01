# Zimny — Phase 0 sky and time

Status: implementation contract. Numerical reference values have been calculated from the equations below. Browser appearance, repository compatibility, and performance on the designated MacBook still require the acceptance checks in this document; none is claimed as already verified.

## 1. Scope and fixed constraints

This module supplies Petersburg solar position, procedural sky appearance, exposure, diffuse exterior lighting, time controls, and the three interior lightmap weights. It also specifies scheduling at the arrival boundary. It does not specify facade grammar, room geometry, camera composition, or interior material implementation.

Fixed environment:

- Vanilla three.js 0.186, WebGL2, TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, Vite 8, pnpm, AgX tone mapping.
- No UI framework, backend, weather service, solar-position dependency, or runtime network lookup for this module.
- Initial JavaScript: at most 350,000 gzip bytes; first visible sky frame: at most 3 seconds at approximately 10 Mbps.
- Whole application, any frame: at most 250 draw calls and 1,000,000 triangles in the frustum. GPU texture allocation: at most 256,000,000 bytes. Decimal byte limits are the conservative interpretation of the supplied KB/MB budgets.
- At most three custom shader materials across the entire project. This module reserves one, leaving two.
- Performance gate: the 2017 MacBook, two-core 2.3 GHz i5, 8 GB RAM, Iris Plus 640. T1 targets 16.7 ms; T0 permits no application-controlled visible frame above 33 ms. A percentile does not replace the maximum-frame requirement.

“Real sky” means a stylized clear-sky appearance driven by the real solar position, not a claim to reproduce current clouds, weather, or measured atmospheric radiance.

### Astronomical terminology

At this latitude the June minimum is approximately −6.6°. That is just beyond the conventional −6° civil-twilight boundary, in nautical twilight. Use “white nights”; do not encode or publish “civil twilight never ends” as an astronomical invariant. Solar midnight is near 01:00 on the fixed UTC+03:00 clock, not necessarily 00:00. The required 00:45 probe is close to, but not exactly at, the daily minimum.

## 2. Decisions

| Concern | Binding choice | Reason |
| --- | --- | --- |
| Solar calculation | NOAA Julian-century calculator equations; geometric elevation; no atmospheric refraction | Retains the incumbent, is independently implementable and node-testable, and avoids a weather-dependent correction to twilight thresholds. |
| Sky | One hand-written analytic sky material on a fullscreen background triangle | Preetham is a daylight model, not a reliable below-horizon twilight model. The critical −8.6° to −4.6° interval needs an explicitly controlled continuation rather than a daylight extrapolation. |
| Exposure | Retain 0.55 below −6.6°, linear to 1.0 at +15°, then 1.0 | It is continuous and introduces no spatial bands. There is no demonstrated reason to replace it. |
| PMREM | Zero generation or regeneration in Phase 0 | Matte white massing can use solar directional light plus sky-derived hemispheric light. A frequency limit cannot bound the duration of one PMREM bake. |
| Interior blend | Retain night at or below −8° and day at or above +10°; define a dusk plateau from −7° through −4° | Completes the missing three-state contract without moving the incumbent outer thresholds. White-night minima remain wholly dusk. |
| Time input | Strict, explicitly zoned ISO timestamps within the UTC interval 1901–2099 | Unbounded or implementation-dependent date parsing is not an acceptable public input boundary. Invalid input falls back to now; it is not silently clamped. |
| Scrub | Gesture-local ±24 hours, additionally bounded by the supported epoch interval; one-minute steps | Prevents runaway dragging while preserving navigation to distant dates through an explicit timestamp. |

The sky replacement and removal of PMREM are deliberately narrow changes to the incumbent. The former addresses the model’s below-horizon domain; the latter removes the offending GPU operation entirely rather than disguising it behind a timer.

## 3. Constants and coordinate conventions

`src/content/sky-time.ts` owns immutable configuration only. It must not import three.js, read the clock, or access browser globals.

Export these constants, with readonly types:

```ts
SITE = { latitudeDeg: 59.9398, longitudeDeg: 30.3146, timeZoneLabel: "Europe/Moscow", utcOffsetMinutes: 180 }
TIME = { minEpochMs: -2177452800000, maxEpochMsExclusive: 4102444800000, minuteMs: 60000, scrubRadiusMs: 86400000, liveSamplePeriodMs: 1000, maxFragmentLength: 4096, maxAtLength: 64 }
EXPOSURE = { lowElevationDeg: -6.6, highElevationDeg: 15, low: 0.55, high: 1.0 }
BLEND = { nightEndDeg: -8, duskStartDeg: -7, duskEndDeg: -4, dayStartDeg: 10 }
ARRIVAL = { titleHoldMs: 240, massingFadeMs: 600 }
DETERMINISTIC_SEED = 0x5a494d4e
SKY_RESERVATION = { drawCalls: 1, triangles: 1, customShaderMaterials: 1, ownedTextureBytes: 0 }
```

The supported epoch interval is inclusive at 1901-01-01T00:00:00.000Z and exclusive at 2100-01-01T00:00:00.000Z. It bounds the supported product, not JavaScript Date’s much larger representable range. Petersburg display time is fixed UTC+03:00 throughout this interval. `Europe/Moscow` is the location label, not a request to reproduce historical Soviet/Russian offset changes or to predict future legislation. Format with UTC getters after adding the fixed offset, not the host’s local zone or historical tzdb rules.

World coordinates are right-handed: +Y up, +X east, −Z north. Solar azimuth is clockwise from true north: north 0°, east 90°, south 180°, west 270°. For elevation `h` and azimuth `A`, converted to radians:

$$ \mathbf{s}=(\cos h\,\sin A,\ \sin h,\ -\cos h\,\cos A). $$

This unit vector points toward the sun. The flattened azimuth vector is:

$$ \mathbf{a}=(\sin A,\ 0,\ -\cos A). $$

Do not interpolate wrapped azimuth numbers through the 359°/0° boundary.

## 4. Public modules and state ownership

Pure modules must be importable in Vitest under Node without importing the rendering adapter. There is no browser-dependent barrel import on their test path.

### `src/sky/solar.ts`

```ts
export type SolarPosition = Readonly<{ elevationDeg: number; azimuthDeg: number; }>;

export function solarPosition(epochMs: number): SolarPosition;
```

Owns no state. Rejects non-finite, non-integer, unsafe, or out-of-range epoch milliseconds with `RangeError`. Returns geometric elevation and normalized azimuth.

### `src/sky/exposure.ts`

```ts
export function exposureForElevation(elevationDeg: number): number;
```

Owns no state. Accepts any finite elevation; saturates outside the defined transition. Non-finite input throws `RangeError`.

### `src/sky/lightmap-weights.ts`

```ts
export type LightmapWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number; }>;

export function lightmapWeights(elevationDeg: number): LightmapWeights;
```

Owns no state. These three fields, their meaning, and the invariants in section 8 are frozen for room phases. Non-finite input throws `RangeError`.

### `src/sky/appearance.ts`

```ts
export type Vec3 = readonly [number, number, number];
export type LinearRgb = readonly [number, number, number];
export type Atmosphere = Readonly<{ zenithRgb: LinearRgb; horizonRgb: LinearRgb; glowStrength: number; sunIntensity: number; }>;
export type SkySample = Readonly<{ epochMs: number; solar: SolarPosition; exposure: number; lightmaps: LightmapWeights; atmosphere: Atmosphere; sunDirection: Vec3; horizonSunDirection: Vec3; }>;

export function atmosphereForElevation(elevationDeg: number): Atmosphere;
export function sampleSky(epochMs: number): SkySample;
```

Owns no state. `sampleSky` calls `solarPosition` once and derives all outputs from that result. Elevation validation matches the other pure scalar functions. No three.js Color or Vector objects occur in these public types.

### `src/sky/time.ts`

```ts
export type TimeState =
  | Readonly<{ mode: "live"; deterministic: false }>
  | Readonly<{ mode: "fixed"; deterministic: boolean; epochMs: number }>;

export type TimeIssue =
  | "fragment-too-long"
  | "duplicate-at"
  | "duplicate-det"
  | "at-too-long"
  | "invalid-at"
  | "at-out-of-range"
  | "invalid-det";

export type ParsedTime = Readonly<{ state: TimeState; initialEpochMs: number; issues: readonly TimeIssue[]; }>;

export function parseTime(fragment: string, nowMs: number): ParsedTime;
export function epochAt(state: TimeState, nowMs: number): number;
export function canonicalAt(epochMs: number): string;
export function scrubBounds(anchorMs: number): readonly [number, number];
export function scrubEpoch(anchorMs: number, offsetMinutes: number): number;
export function formatPetersburg(epochMs: number): Readonly<{ date: string; time: string; offset: "UTC+03:00"; }>;
```

Owns no hidden state. Clock values are injected; none of these functions calls `Date.now()`. `date` is `YYYY-MM-DD`; `time` is `HH:mm`; canonical timestamps are UTC ISO strings with milliseconds and `Z`.

The browser coordinator owns the active `TimeState`, the latest `SkySample`, the opening snapshot, and any scrub session’s pre-gesture state, anchor, and latest preview. It also owns URL writes and event listeners. None of that state belongs in storage outside the URL.

### `src/sky/rig.ts`

```ts
export interface SkyRig {
  readonly root: Group;
  setSample(sample: SkySample): void;
  syncCamera(camera: PerspectiveCamera): void;
  dispose(): void;
}

export function createSkyRig(): SkyRig;
```

This is the only three.js-dependent sky module. It owns one background triangle, one ShaderMaterial, reusable uniform/matrix objects, one DirectionalLight and target, and one HemisphereLight. It owns no clock, renderer, animation loop, URL, PMREM generator, texture, or render target. `setSample` updates uniforms and light properties only. `syncCamera` updates ray reconstruction for the current camera without allocation. `dispose` removes the owned root from its parent and disposes the owned geometry/material, but not the host renderer or unrelated scene resources. The host sets renderer exposure from `sample.exposure`; the rig does not silently change global renderer settings.

### `src/sky/arrival.ts`

```ts
export type ArrivalState =
  | Readonly<{ phase: "sky" }>
  | Readonly<{ phase: "title"; elapsedMs: number }>
  | Readonly<{ phase: "massing"; elapsedMs: number }>
  | Readonly<{ phase: "settled" }>;

export type ArrivalPresentation = Readonly<{ titleVisible: boolean; massingOpacity: number; }>;

export function initialArrival(): ArrivalState;
export function advanceArrival(
  state: ArrivalState,
  deltaMs: number,
  massingReady: boolean,
  deterministic: boolean
): ArrivalState;
export function presentationForArrival(
  state: ArrivalState,
  deterministic: boolean
): ArrivalPresentation;
```

These functions are pure. The coordinator owns their current state and calls `advanceArrival` after rendering a frame, applying its returned state only on the next frame. The timing and transition rules are in section 10.

### `tests/sky.test.ts`

Owns fixtures and tests only. It imports the pure modules directly and runs with the Node Vitest environment. No WebGL context, DOM shim, network request, or current-clock dependency is permitted.

## 5. Solar algorithm and provenance

Use an independent TypeScript transcription of NOAA GML’s public-domain solar-calculator equations, not a third-party astronomy package. Sources:

- NOAA Solar Calculation Details: https://gml.noaa.gov/grad/solcalc/calcdetails.html
- NOAA calculator implementation, identifying the Julian-century calculation family: https://gml.noaa.gov/grad/solcalc/main.js
- NOAA public-domain/disclaimer policy: https://www.noaa.gov/disclaimer

NOAA’s calculations draw on astronomical work including Meeus; this contract uses the NOAA equations and its own implementation, not copied book text or third-party licensed source.

These links are provenance, not runtime or test dependencies.

The complete required numerical recipe follows. All trigonometric helpers suffixed `D` take degrees. Inverse helpers return degrees. `mod` is positive modulo; `clamp` is inclusive. Calculations use JavaScript double precision without intermediate rounding.

```
rad = Math.PI / 180
deg = 180 / Math.PI
mod(x, n) = ((x % n) + n) % n
sinD(x) = Math.sin(x * rad)
cosD(x) = Math.cos(x * rad)
tanD(x) = Math.tan(x * rad)
asinD(x) = Math.asin(x) * deg
atan2D(y, x) = Math.atan2(y, x) * deg

JD = epochMs / 86400000 + 2440587.5
T = (JD - 2451545.0) / 36525

L0 = mod(280.46646 + T * (36000.76983 + 0.0003032 * T), 360)
M  = 357.52911 + T * (35999.05029 - 0.0001537 * T)
e  = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)

C = sinD(M) * (1.914602 - T * (0.004817 + 0.000014 * T))
  + sinD(2 * M) * (0.019993 - 0.000101 * T)
  + sinD(3 * M) * 0.000289

omega = 125.04 - 1934.136 * T
lambda = L0 + C - 0.00569 - 0.00478 * sinD(omega)

epsilon0 = 23 + (26 + (
            21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))
          ) / 60) / 60
epsilon = epsilon0 + 0.00256 * cosD(omega)

declination = asinD(sinD(epsilon) * sinD(lambda))

y = tanD(epsilon / 2) ** 2

equationOfTimeMinutes = 4 * deg * (
    y * sinD(2 * L0)
  - 2 * e * sinD(M)
  + 4 * e * y * sinD(M) * cosD(2 * L0)
  - 0.5 * y * y * sinD(4 * L0)
  - 1.25 * e * e * sinD(2 * M)
)

utcMinutes = mod(epochMs, 86400000) / 60000
trueSolarMinutes = mod(
  utcMinutes + equationOfTimeMinutes + 4 * SITE.longitudeDeg, 1440
)
hourAngle = trueSolarMinutes / 4 - 180

elevationDeg = asinD(clamp(
  sinD(SITE.latitudeDeg) * sinD(declination)
  + cosD(SITE.latitudeDeg) * cosD(declination) * cosD(hourAngle),
  -1, 1
))

azimuthDeg = mod(atan2D(
  sinD(hourAngle),
  cosD(hourAngle) * sinD(SITE.latitudeDeg) - tanD(declination) * cosD(SITE.latitudeDeg)
) + 180, 360)
```

The longitude is east-positive. The input is already UTC epoch milliseconds: do not add the Petersburg offset inside this calculation. Use fractional minutes internally; “minute precision” is not a requirement to round the sun to minute-sized jumps.

The scrub is minute-stepped and the displayed clock omits seconds, but the calculation retains the supplied instant.

### Refraction policy

Return and use geometric solar-centre elevation everywhere: sky, exposure, direct light, and interior weights. Do not mix an apparent elevation into one branch.

There is no NOAA refraction correction in Phase 0. Near the visible horizon, apparent sunrise/set can differ materially from this model; the sky therefore includes no rendered solar disk whose edge would imply precise apparent contact. At −6.6° the sun is well below the horizon, and adding a near-horizon refraction approximation does not provide the missing twilight scattering model.

Leap seconds, weather-dependent refraction, observer-height corrections, and terrain horizons are outside this version.

## 6. Exactly four solar reference vectors

Reference year: 2026. These are calendar-date probes, not assertions that the listed clock times coincide with the astronomical event or solar transit. Values below are outputs of section 5, rounded to six decimal places. The local timestamp includes its offset; the second row consequently belongs to the previous UTC date.

| Probe | Petersburg timestamp | UTC timestamp | Epoch ms | Elevation ° | Azimuth ° |
| --- | --- | --- | ---: | ---: | ---: |
| June solstice, 13:00 | 2026-06-21T13:00:00+03:00 | 2026-06-21T10:00:00.000Z | 1782036000000 | 53.498189 | 179.788785 |
| June solstice, 00:45 | 2026-06-21T00:45:00+03:00 | 2026-06-20T21:45:00.000Z | 1781991900000 | -6.562633 | 356.436275 |
| December solstice, 13:00 | 2026-12-21T13:00:00+03:00 | 2026-12-21T10:00:00.000Z | 1797847200000 | 6.620538 | 180.744154 |
| March equinox, 13:00 | 2026-03-20T13:00:00+03:00 | 2026-03-20T10:00:00.000Z | 1774000800000 | 29.971841 | 178.210866 |

Assert elevation error and circular azimuth error at or below 0.00001°. That tolerance verifies this implementation, not physical accuracy to that many decimal places. Do not loosen it to the approximate values in the original brief.

No additional dated solar reference fixtures are required. Boundary and generated property checks below are separate from these four vectors.

## 7. Sky, exposure, and exterior lighting

### Shared interpolation

Define a clamped quintic smootherstep:

$$ t=\operatorname{clamp}(x,0,1),\qquad S(x)=t^3(6t^2-15t+10). $$

`mix` below is componentwise linear interpolation. All palette values are scene-linear RGB, not sRGB hex values.

Export this readonly palette from `src/content/sky-time.ts`:

| Name | Scene-linear RGB |
| --- | --- |
| `night` / N | (0.0015, 0.0030, 0.0100) |
| `twilightZenith` / Zt | (0.0180, 0.0390, 0.1050) |
| `dayZenith` / Zd | (0.1400, 0.3000, 0.5600) |
| `dayHorizon` / Hd | (0.5800, 0.7000, 0.8000) |
| `warmHorizon` / W | (0.4800, 0.2800, 0.1700) |

For geometric elevation `h` in degrees:

$$ T=S\left(\frac{h+18}{12}\right),\qquad D=S\left(\frac{h+4}{19}\right). $$

$$ Z=\operatorname{mix}\left(N,\ \operatorname{mix}\left(Z_t,Z_d,D\right),\ T\right). $$

$$ H=\operatorname{mix}\left(2N,\ \operatorname{mix}\left(0.35H_d,\ H_d,\ D\right),\ T\right),\qquad G=T\,(1-D). $$

Return `Z`, `H`, and `G` as the atmosphere’s zenith, horizon, and glow strength.

The twilight factor reaches its plateau at −6° but with continuous first and second derivatives; it is not a civil-twilight on/off switch.

For each pixel, reconstruct normalized world view direction `d` using the inverse camera projection and camera rotation. Ignore camera translation. Compute:

$$ v=S\left(\frac{d_y+0.08}{1.08}\right),\qquad B=\operatorname{mix}\left(H,\ Z,\ v\right). $$

$$ g=\exp\left(-\left(d_y/0.22\right)^2\right)\,\left[\max\left(\mathbf d\cdot\mathbf a,\ 0\right)\right]^6. $$

$$ C=\operatorname{mix}\left(B,\ W,\ G\,g\right). $$

The lower hemisphere continues smoothly into the horizon colour; do not introduce a black half-dome or mirror the upper sky. The warm lobe follows solar azimuth even while the sun is below the horizon. The June midnight lobe therefore belongs toward the north, not automatically toward the west.

These are art-directed clear-sky colours, not an atmospheric radiative-transfer solution. The binding visual requirement is a coherent, uninterrupted twilight gradient through the critical −8.6° to −4.6° solar-elevation interval.

### Geometry and shader configuration

- Use one oversized fullscreen triangle, not a tessellated sphere. It is one draw call and one triangle, independent of camera position.
- Draw first, behind the scene; disable depth writing and depth testing for this background mesh. Disable frustum culling. Keep it opaque.
- Reconstruct rays with high-precision fragment calculations. Do not use low-resolution lookup textures or quantized colour bands.
- Renderer output is `SRGBColorSpace`; renderer tone mapping is `AgXToneMapping`.
- Apply three.js tone-mapping and colour-space shader chunks exactly once, in that order. Do not pre-apply exposure to palette values.
- Enable static spatial dithering after output colour conversion, using the three.js dithering chunks. Its noise must not depend on frame number, clock, or camera history. Keep the final noise bounded to approximately one 8-bit code step peak-to-peak.
- No clouds, stars, moon, solar disk, bloom, atmosphere shell, noise texture, or temporal accumulation in Phase 0.

The appearance interpolation is smooth across its knots. The retained exposure curve has slope changes at its endpoints but no value discontinuity; a uniform exposure multiplier cannot introduce a spatial horizon band.

### Exposure: incumbent retained

$$ E(h)=0.55+0.45\,\operatorname{clamp}\left(\frac{h+6.6}{21.6},\,0,\,1\right). $$

Set `renderer.toneMappingExposure` to this value.

There is no auto-exposure, adaptation delay, hysteresis, luminance readback, or separate sky exposure.

### Diffuse lighting and PMREM

Use the solar direction for a neutral-white DirectionalLight, with intensity:

$$ I_{sun}(h)=3\,S\left(\frac{h}{10}\right). $$

Thus no direct sunlight is emitted at or below geometric elevation 0°. No shadow map is generated in Phase 0.

The HemisphereLight has intensity 1. Its sky colour is `0.25 Z + 0.75 H`; its ground colour is `0.25 H`. Update these alongside the sky sample.

The night palette provides a deliberately small stylized diffuse floor; it is not a simulated moon.

Phase 0 white massing is diffuse and non-metallic. A built-in MeshLambertMaterial is sufficient; no reflection contract is being promised here. The host owns its fade implementation and must prewarm the shader variant it actually uses.

`scene.environment` remains null. Do not import or instantiate PMREMGenerator, CubeCamera, or environment render targets for this phase. PMREM cadence is exactly zero across initial load, title hold, idle, live updates, scrubbing, release, and visibility restoration. Do not move a bake into `requestIdleCallback`; that changes its start time, not its non-preemptible GPU cost.

## 8. Frozen interior blend contract

Always return exactly `{ day, dusk, nightChandeliers }`. There is no fourth state and no exposure, clock, renderer, or room input.

| Elevation interval | day | dusk | nightChandeliers |
| --- | --- | --- | --- |
| At or below −8° | 0 | 0 | 1 |
| Between −8° and −7° | 0 | a | 1 − a |
| −7° through −4°, inclusive | 0 | 1 | 0 |
| Between −4° and +10° | b | 1 − b | 0 |
| At or above +10° | 1 | 0 | 0 |

The two transition parameters are:

$$ a=S\left(\frac{h+8}{1}\right),\qquad b=S\left(\frac{h+4}{14}\right). $$

Invariants:

1. Pure and deterministic; no mutation of inputs or returned values by the implementation.
2. All three weights are finite and in [0, 1].
3. The weights sum to 1. Construct the active pair with a complement, not three independently interpolated values followed by normalization. Numerical assertions allow only floating-point roundoff, at most 0.000000000001.
4. As elevation increases, day never decreases and night-chandeliers never increases. Dusk increases into its plateau, then decreases out of it. Requiring dusk to be globally monotone would contradict a three-state blend.
5. Exact one-hot plateaus include the state centres: night −12°, dusk −6.6°, day +15°.
6. The transitions meet the plateaus with zero first and second derivatives. At most two weights are nonzero at once.

The new dusk plateau resolves the incumbent’s unspecified middle state. The outer −8° and +10° thresholds are unchanged. “Night-chandeliers” describes the interior lighting state; it must not force the exterior sky to black at −8°.

Room phases consume these weights unchanged. Their texture/material technique is a later contract and must fit the two remaining custom-material slots.

## 9. URL, clock, and scrub semantics

### URL boundary

Time parameters live in the existing fragment query, for example the `at` and `det` keys in `#/?at=&cam=&q=&det=1`. They are not duplicated in the document’s top-level query string.

Before constructing URLSearchParams, reject a fragment longer than 4,096 code units. Return a `fragment-too-long` issue and default now state without parsing the oversized payload or rewriting it automatically.

For a bounded fragment:

- Parse the query after the first `?`; do not reinterpret its route or other keys.
- Missing or empty `at` means now.
- Accept exactly `YYYY-MM-DDTHH:mm:ss[.S|.SS|.SSS](Z|±HH:MM)`. Require uppercase `T` and `Z`, an explicit offset, valid Gregorian calendar fields, seconds 00–59, hours 00–23, and an offset no greater than 14:00 in magnitude.
- Do not accept locale dates, a date without a time, numeric epoch shorthand, expanded years, whitespace, named zones, leap-second notation, or Date.parse rollover of an invalid day.
- Reject an `at` value longer than 64 decoded code units before calendar parsing. Decode once. Canonical output is always UTC `Z`, avoiding raw `+` query encoding ambiguities.
- Convert the validated offset to UTC, then apply the supported epoch bounds. This is validation, not a clamp.
- Duplicate `at` values invalidate that key; duplicate `det` values invalidate that key. Do not pick an arbitrary first or last value.
- Missing, empty, or `0` det is false; exactly `1` is true. Other values produce an issue and act as false.
- Invalid `at` falls back to the injected real `nowMs`, while a separately valid det flag still applies. Return issues for diagnostics; add no toast, modal, spinner, or substitute historical date.
- `nowMs` itself must satisfy the epoch precondition. A misconfigured host clock outside the supported interval is an integration error, not permission to invent a current date.
- The host preserves `cam`, `q`, the route, and other bounded valid parameters on time writes. This module neither defines nor modifies their semantics.

### Live and fixed time

Capture `Date.now()` once before creating the first sample. Use that same snapshot for the initial sky and arrival time label; do not independently read the clock for each.

In ordinary live mode, sample the current wall clock at most once per second and derive a new `SkySample`. There is no accelerated clock and no accumulated simulation delta. On returning from a hidden tab, sample the current clock once; do not replay missed updates.

A valid `at` is fixed until another explicit time action. It does not start running from the specified timestamp. All displayed scene time comes from the same active epoch. Normal arrival therefore shows the real current Petersburg time. An explicit `at` intentionally overrides both sky and displayed time; never label an overridden time as “now”.

### Deterministic mode

With `det=1`:

- Freeze at valid `at`, or at the single captured opening instant when `at` is empty/invalid.
- Use the fixed seed from section 3. No frame-driven random stream, Math.random, temporal dithering, or evolving shader-time uniform is allowed.
- Disable autonomous temporal effects. A fade uses its settled value when its arrival beat becomes eligible; it must not freeze forever at opacity zero.
- Preserve separate sky-only and title-only rendered frames before admitting massing. Determinism does not authorize drawing all three beats in frame one.
- Explicit scrubbing remains enabled: it changes the frozen instant, then freezes again. It does not resume the clock.
- Returning to now while det remains set captures a new instant and freezes it. It does not silently remove det.
- Empty `at` plus det is stable within that visit, not across reloads.

Reproducible captures across visits require an explicit absolute `at` and the same camera, quality, and viewport.

### Scrub transaction

The hairline control becomes available after arrival settles, not during the three beats. Use a focusable native range input with an accessible label and an absolute Petersburg date/time in `aria-valuetext`; no additional permanent panel is needed.

On gesture start, sample and freeze an anchor from the active scene time. Keep that anchor and the pre-gesture TimeState until commit/cancel. Never recenter the window on each pointer move.

For the gesture, `scrubBounds` returns the whole-minute instants inside the intersection of the anchor’s ±24-hour interval and the supported epoch interval:

$$ L=60000\left\lceil\frac{\max\left(MIN,\ anchor-86400000\right)}{60000}\right\rceil. $$

$$ U=60000\left\lfloor\frac{\min\left(MAX-1,\ anchor+86400000\right)}{60000}\right\rfloor. $$

`MAX` is exclusive.

Clamp the requested offset to ±1,440 minutes before multiplication, round the resulting absolute instant to the nearest whole minute using JavaScript Math.round, then clamp it to `[L, U]`. Reject a non-finite offset. This also prevents extreme finite drag values from overflowing arithmetic.

- Coalesce pointer updates: retain only the newest request, calculate at most one sample per animation frame, and drop stale requests. No queued backlog.
- Preview does not write the URL. It does not generate environment maps or restart arrival.
- On release/keyboard commit, enter fixed time and use `history.replaceState` once to write canonical absolute `at`, preserving det and unrelated parameters. Apply state locally because replaceState does not dispatch hashchange.
- Arrow keys step one minute; PageUp/PageDown step one hour; Home/End select the gesture bounds. Escape cancels. A focused-control `N` action returns to now, with an accessible instruction for that action. Pointer double-clicks on the scrub do not reset time; pointer return-to-now uses the season menu's «Сейчас» / "Now" option [the 2026-11-01 owner reading-fix: a pointer double-click that is just two hour commits must never invoke the reset — the former «may expose» affordance retired].
- Cancel, pointercancel, or focus loss restores the pre-gesture mode. A restored live mode samples current now, not the old anchor.
- An external URL navigation cancels the gesture and takes precedence. Hiding the document also cancels an incomplete gesture.

### The season transaction (R11; design-season-chooser.md §3, DEC-034)

- The season listbox in the clock row is a view of the committed time state: live reads «now», fixed reads the local meteorological season of the instant. It is re-derived after every commit and on every hashchange re-parse; it is never written during scrub preview, and it lives outside this module's parser — the URL carries only the resulting canonical `at=`.
- Choosing a season commits `seasonInstant(...)` — the season's anchor day in the scene instant's local civil year at the scene instant's local time of day — through the same transaction as the scrub: enter fixed time (det preserved), apply locally, one `history.replaceState` writing canonical `at=` with unrelated keys preserved, no history entry, no preview phase. Choosing «now» is the return-to-now law verbatim.
- An in-progress scrub gesture is cancelled by a season change (the external-action clause). A resolved instant outside the supported epoch bounds is refused: state unchanged, the menu re-synced, one console diagnostic — validation, not a clamp.
- A later gesture may establish a new ±24-hour window. This is a per-gesture clamp, not a permanent prohibition on exploring other dates.

The fixed UTC+03:00 policy means every local scrub day is exactly 24 hours; no DST discontinuity exists in this product’s time model.

## 10. Arrival and work scheduling

The normal sequence is immutable:

1. First rendered frame: procedural sky alone.
2. A later rendered frame: title and the active Petersburg time.
3. White massing fades in only after presentation-ready data exists.

No spinner, loading counter, placeholder building, or time control appears between these beats.

### State-machine rules

`initialArrival()` returns sky. Render the current state first, then calculate the next state for the next requestAnimationFrame callback. Do not update the title DOM to the next state in the callback that draws the first sky frame: that would permit both to appear in the same browser paint.

After the sky frame, advance to title with elapsed time zero. Keep title visible for at least 240 ms in normal mode. Once that hold is satisfied and `massingReady` is true, advance to massing with elapsed time zero.

Normal massing opacity is:

$$ opacity=S\left(elapsedMs/600\right). $$

After 600 ms, advance to settled with opacity 1. The title remains visible; no additional title animation is required by this module.

In deterministic mode, title still receives a separate frame; its timed hold is skipped. Once ready, massing is admitted at opacity 1 on a subsequent frame, then the state settles. This freezes the temporal fade at its final state while preserving the three-beat ordering.

Validate finite nonnegative delta time. Pause arrival while hidden and restart its delta baseline on visibility restoration. Do not hide a visible long frame by clamping its reported duration.

### Presentation-ready is stronger than downloaded

`massingReady` means its data is decoded, geometry is constructed, required buffers have been admitted/uploaded within budget, and the material variant used during the fade has been prewarmed. A completed fetch alone does not qualify.

- Before frame one: parse bounded URL input, evaluate one sample, create the minimal renderer/rig, and draw. Do not await massing data, fonts, interior lightmaps, or environment generation.
- Use the system font for the initial title; font loading must not gate sky or title.
- Begin nonblocking data work after the first sky opportunity. Keep imported modules’ top-level work trivial; dynamic import does not make module evaluation preemptible.
- During the title hold, prepare massing in main-thread slices budgeted at no more than 2 ms each. Large decoding/geometry work belongs in a worker or a genuinely incremental producer, not in one promise continuation.
- Use renderer.compileAsync where supported for the already-selected simple material. Async compilation is not a guarantee that all driver calls are nonblocking. Measure first-use uploads and compilation on the actual device.
- Once the massing fade begins, do not compile a new variant, attach a large resource batch, change render resolution, allocate render targets, or perform synchronous decoding. In particular, do not introduce an un-prewarmed material variant when opacity reaches 1.
- If data is late, keep sky and title. If data fails, retain that valid scene and report a diagnostic through the host; do not synthesize a success or add another arrival beat.

The implementation must reduce or split work that fails the device gate. Moving an unsplittable operation to an idle callback is not a fix for a missed visible frame.

## 11. Runtime budgets mapped to mechanisms

| Frequency/event | Permitted work | Explicitly excluded |
| --- | --- | --- |
| Once before first sky | Bounded parsing, one solar/appearance sample, minimal rig/context creation | PMREM, massing assembly, remote sky assets, blocking font load |
| Each visible frame | Camera-ray uniforms, one sky draw, normal scene render, arrival presentation | Solar work unless dirty, resource creation, GL readback, environment work |
| Live, at most 1 Hz | One epoch sample, one solar evaluation, exposure/weights/palette/light updates | Temporal LUT generation, background bake queues |
| Scrub, at most once per frame | Latest coalesced preview and the same small pure calculation | URL writes per move, replaying stale events, PMREM |
| Scrub release | One canonical URL replacement and fixed-state commit | Extra bake or arrival restart |
| Title hold only | Budgeted preparation/prewarming slices | Assuming idle scheduling makes a long task safe |
| Hidden document | Suspend render/update work and pending scrub | Catch-up loops on resume |
| Disposal | Release owned geometry/material and host listeners | Disposing the shared renderer or unrelated assets |

Except for a small immutable sample on dirty updates, the frame loop reuses its objects. No per-frame arrays of geometry, textures, or temporary matrices are created.

### Resolution and resources

For the designated device gate, use no MSAA, device pixel ratio at most 1, and a drawing-buffer area at most 1,048,576 pixels. Fit larger viewports by reducing render scale while preserving aspect ratio. Choose this before arrival; do not resize targets during its fade. The host maps existing `q` semantics to these limits rather than inventing a competing query format here. *(Amended 2026-10-19 by [ADR-0015](adr/0015.md): MSAA on at every tier — measured free on the reference device; the dpr-1/1,048,576 caps stand pending the owner's dpr-2 disposition, measured viable-but-edge.)*

The sky owns no textures or render targets. That is not a claim that the browser/WebGL context uses zero GPU memory. The global ledger includes all application textures, render-target attachments, mip levels, cube faces, and simultaneously live transition resources; report drawing-buffer/renderbuffer allocations separately or conservatively include them as well.

The sky consumes one draw call and one triangle, leaving at most 249 calls and 999,999 triangles for other rendering in the same frame. Lights do not add draws. No shadow or PMREM pass is hidden outside that accounting.

For runtime counting, disable renderer.info’s automatic per-render reset, reset once at the start of the application frame, and aggregate every render in that frame, including prewarm/offscreen work. Check instanced triangle totals, not only source-mesh triangle counts.

### CI and the existing validation command

`pnpm validate` remains typecheck → Biome → Vitest → build.

- The Node tests validate the pure contracts and exported budget reservation.
- During build, gzip and sum every emitted Phase 0 JavaScript chunk, including bootstrap dynamic imports and workers, using a fixed gzip configuration. Fail above 350,000 bytes. Do not count only the entry chunk or defer startup code merely to evade the limit.
- Put the byte check in the build stage: Vitest precedes build and must not inspect stale dist output.
- The orchestrator’s scene-admission ledger must reserve the sky’s costs and reject plans exceeding draw, triangle, texture, or custom-material limits. CI can validate conservative manifests and these admission rules without a DOM.
- Browser instrumentation confirms actual frame totals on the integrated scene. A static ledger is not evidence that runtime culling, multipass rendering, or resource disposal behaves as expected. A Node-only validation pass cannot certify GPU frame time, banding, or first paint. Device acceptance below is mandatory and must be recorded separately; it is not silently added to the meaning of a passing Vitest run.

## 12. Acceptance checks

### Node tests

Use the four rows in section 6 as the only dated solar reference fixtures. Add deterministic generated/property checks, not another table of approximate astronomical values:

- Solar outputs remain finite and in their declared angular ranges across a bounded, seeded sample of supported epochs; repeated calls are identical.
- Invalid epoch numbers and values outside either bound throw before trigonometric work. Negative valid epochs exercise positive modulo.
- Exposure is continuous at its joins, monotone with elevation, bounded by 0.55 and 1.0, and exactly plateaued outside the ramp.
- Lightmap weights have exactly the frozen keys, obey bounds/sum, have the defined monotonic branches and exact plateaus, and reject non-finite inputs.
- Atmosphere outputs are finite, nonnegative, and continuous through the twilight interval and interpolation knots. Do not assert that output-image brightness is globally monotone through every tone-mapped hue change.
- Timestamp parsing rejects malformed calendars, missing offsets, oversized values, duplicate time keys, expanded years, and unsupported epochs. Invalid at falls back to the injected now while respecting a valid det flag.
- Formatting uses fixed UTC+03:00, including calendar rollover, independent of the host time zone. Reuse the supplied fixtures or generate boundary inputs from constants.
- Scrub bounds, rounding, clamping, and extreme finite offsets remain valid. Preview does not mutate its anchor or prior state.
- Arrival cannot show title in its initial presentation or massing before a title frame. Normal mode holds/fades as specified; det changes visibility in separate frames without a running fade.

### Browser appearance on the MacBook

Inspect native-scale output with AgX and the configured output colour space. Capture all four reference scenes. Additionally sweep injected elevation from −8.6° through −4.6° in small increments at a fixed azimuth; this is a shader-continuity check, not another astronomical fixture.

Pass requirements:

- No black horizon cutoff, inverted gradient, discrete horizontal colour stripe, sudden palette switch, or detached below-horizon sun disk.
- At white night, a readable cool zenith and luminous horizon remain; the directional warm region is on the sun’s azimuth side.
- Static dithering removes obvious 8-bit bands without visible animation or crawling at a stationary camera.
- Azimuth wrap does not swing the warm region through the wrong side of the scene.
- Now, explicit at, invalid at, scrub preview/release/cancel, reset-to-now, det, and visibility restoration agree between lighting and time label.

Palette constants are an authored starting contract, not a claim of measured photometric truth. If they fail this visual gate, revise the documented constants explicitly; do not add an undocumented colour correction or switch backends silently.

### Arrival and performance on the MacBook

Record the browser/OS version, viewport, drawing-buffer dimensions, quality selection, build bytes, and a trace/report for cold arrival and sustained scrubbing. Use a production build and the approximately 10 Mbps condition for the first-frame measurement.

- First visible sky at or before 3 seconds; neither title nor massing is present in that first frame.
- A separately presented title beat precedes massing, even if its data was cached or immediately ready.
- No application-attributable long task of 50 ms or more from sky presentation through settled arrival. This is an additional diagnostic threshold, not permission to exceed the stricter 33 ms frame limit.
- Target 16.7 ms; no application-controlled visible frame above 33 ms during arrival, live operation, scrub, or release. Report maxima as well as distributions. Do not omit a compilation/upload hitch or the release frame.
- PMREM invocation count is zero throughout.
- Whole-frame draw/triangle totals and peak live texture allocation remain within their hard limits, including overlapping resources during transitions.

OS scheduling and browser internals prevent an absolute wall-clock guarantee from design alone. An observed application-controlled miss is nevertheless a failed gate, not a percentile waiver. Preserve the trace, identify the responsible work, and simplify or subdivide it before acceptance.

## 13. Handoff and exclusions

The orchestrator implements these modules, integrates their ownership boundaries with the existing URL/camera/render loop, and connects the build/runtime budget checks. `docs/architecture.md` and `docs/decisions.md` reference this contract at integration.

Do not infer repository compatibility, completed browser tests, or measured MacBook performance from this document. Check the installed three.js shader-chunk and compilation APIs before wiring the adapter; preserve the stated output behaviour if an API detail differs.

Not included: facade grammar, cloud/weather simulation, accurate apparent sunrise/set, environment reflections, room lightmap shaders, shadows, postprocessing, persistence outside the URL, or extra UI.

None is required to deliver the Phase 0 Petersburg Time idea.
