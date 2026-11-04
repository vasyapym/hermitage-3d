import { defineConfig } from '@playwright/test';

// Not part of tsconfig `include` and never typechecked by `pnpm typecheck`; process.env is fine
// here and ONLY here (tests/ must stay free of node globals — no @types/node in this repo).
// macOS 13 hosts install the browser with an override, because Chrome-for-Testing builds no
// longer publish a mac13 download slot: PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 … (README →
// Development). Chrome 153 itself runs on macOS 12+.
const isCi = Boolean(process.env.CI);
const softwareGl = process.env.ZIMNY_SOFTWARE_GL === '1';
const BASE_URL = 'http://127.0.0.1:4173';

// Software WebGL2 for GPU-less linux runners (CI sets ZIMNY_SOFTWARE_GL=1). Locally the default
// (real GPU) is used, which is what golden baselines are rendered against.
// --use-gl=angle / --use-angle=swiftshader select ANGLE over SwiftShader explicitly, instead of
// relying on Chromium's deprecated "automatic fallback to software WebGL".
// --enable-unsafe-swiftshader opts in to SwiftShader-backed WebGL contexts.
// --ignore-gpu-blocklist keeps WebGL2 enabled on an unknown-GPU runner.
const SOFTWARE_GL_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  // Two simultaneous WebGL2 contexts saturate the 2-core reference device (and any 2-vCPU
  // runner): each halves the other's frame rate and loads the data-bound transit dwells
  // for no benefit. Everything runs serially, local included.
  workers: 1,
  // Smoke worst case is 15 s (title) + 45 s (settled) + 10 s (HUD bind).
  timeout: 90_000,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    // 1280 × 720 at DPR 1 is the geometry the renderer contract assumes:
    // pixelRatio = min(dprCap, sqrt(1_048_576 / (1280 · 720))) = 1.0 on T1, canvas 1:1 CSS px.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: softwareGl ? SOFTWARE_GL_ARGS : [] },
  },
  projects: [
    {
      // The only project CI runs: `playwright test --project=chromium`.
      name: 'chromium',
      testMatch:
        /(smoke|season|travel-hint|index-dialog|mobile-tier|touch-rail|entrance-title-duration|scrub-double-click-season|load-line|environment-handover)\.spec\.ts$/,
      retries: isCi ? 1 : 0,
    },
    {
      // Local-only pixel goldens on the reference Mac's GPU. Never retried: a flaky golden is
      // the documented signal (charter risk row), not something to paper over.
      // NOTE: this project matches BOTH spec files — an --update-snapshots pass rewrites the
      // historical SCENE baselines too, not just the fixtures. Scene goldens re-baseline only
      // by an explicit DEC (design-gallery §9.3); restore any scene drift from git after a
      // fixtures-only re-baseline (STATE.md, the golden re-baseline law).
      name: 'golden',
      testMatch: /(golden|fixtures)\.spec\.ts$/,
      retries: 0,
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
