 # 11 — Playwright e2e + golden frames Row date 2026-10-17 · Opened n/r · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief round-11 · vault projects n/r · no DEC

## Ask Code relay (brief: round-11): Playwright e2e — a smoke project on software GL in CI, pixel goldens local-only.

## Relay shape — one line per stage that produced a surviving fact
- Specialist draft — accepted near-wholesale with three adjudicated deviations (vitest fence, injected-stylesheet overlay hiding, #scene bounding-box guard).
- Orchestrator debugging that landed in code — page-level screenshot with viewport clip; explicit 60 s expect.
- Orchestrator pin correction — 1.64.1 kept; mac14 host-platform override for the reference Mac; README.
- Integration — vitest exclude, e2e script, CI job with --with-deps chromium; architecture.md caveat replaced.

## Verdicts (no owned DEC)
- vitest fence as test.exclude over defaults — an include list would silently drop co-located unit tests.
- Golden overlays hidden via an injected stylesheet — an element screenshot is a composited page clip, not an isolated render.
- #scene bounding-box guard — viewport growth would silently change the pixelRatio inputs.
- CI runs only the smoke project in a separate e2e job: SwiftShader flags (--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist), ZIMNY_SOFTWARE_GL=1, workers 1 (declared). Deterministic T1/T0 boots read the HUD data-* contract: data-tier labels, draws ≤ 250 (declared), tris ≤ 1.0 M (declared), data-frame-ms non-zero gate before reading; clean-console fixture; generous hang bounds title 15 s / settle 45 s (declared).
- Pixel goldens local-only per the charter fallback: noon + devlog-hero white night in det, committed platform-suffixed baselines, maxDiffPixelRatio 0.01 (declared). architecture.md's «unproven» caveat replaced by the implemented arrangement.
- Locator screenshot path never clears Playwright's element-stability wait on a rAF-driven WebGL canvas (watched twice) → goldens capture via page-level toHaveScreenshot with a viewport clip.
- Raw captures measure 2–6 s each (measured), so the 5 s expect default (declared) trips before the two-capture stability loop converges → explicit 60 s (declared).
- Pin: Playwright 1.64.1 (declared) stays; the reference Mac (macOS 13.7) has no chromium download slot upstream → installed via PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14, documented in README.
- vite.config test.exclude fences tests/e2e from Vitest; e2e script; --with-deps chromium in CI.

## Measured — every budget line as stated at each flip, with the flip date
- 2026-10-17 · E2E green locally: smoke 2 (GPU and SwiftShader rehearsals) (measured), goldens 2 (deterministic re-run) (measured) · validate green: 175 tests (measured) · 164 901 gzip of 350 000 unchanged (measured).

## Hunt / found / fixed
- Found: element-stability wait never clears on the WebGL canvas. Fixed: page-level toHaveScreenshot + viewport clip.
- Found: 5 s expect default trips on 2–6 s captures. Fixed: explicit 60 s.
- Found: no upstream chromium slot for macOS 13.7. Fixed: PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14, README.

## Gates
- Passed: smoke 2, goldens 2 locally; validate green (175 tests); CI smoke project.
- Charter fallback in force: goldens local-only (not in CI) — carried by local runs; owed: none further recorded at pin.

## Mentioned elsewhere — segments about this round that lived in other rounds' records (orchestrator appends here)
- From round 10's record: the HUD data-* contract (data-tier / data-draws / data-tris / data-frame-ms) is set on every refresh expressly for the round-11 Playwright assertions; HUD text grouping uses a plain-space regex because Intl would leak NBSP and break Playwright text matches. (ROUNDS.md line 31 @ 438c3a3)
- From round 9's record (DEC-011): the runtime watchdog downgrade is parked until golden frames exist. (decisions.md line 15 @ 438c3a3)

## Sources — file · entity · line range @ <pinned commit>
- docs/briefs/ROUNDS.md · row 11 · line 32 (2223 B) @ 438c3a3
- playwright.config.ts, tests/e2e/smoke.spec.ts, tests/e2e/golden.spec.ts, tests/e2e/golden.spec.ts-snapshots/, vite.config.ts, package.json, pnpm-lock.yaml, .github/workflows/ci.yml, .gitignore, README.md, docs/architecture.md · line ranges n/r @ 438c3a3 
