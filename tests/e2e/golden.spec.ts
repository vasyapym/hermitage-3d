import { expect, type Page, test } from '@playwright/test';

// Local-only project "golden" (CI selects --project=chromium and never runs this file).
// Baselines are rendered on the reference Mac's GPU and are platform-specific by design; Playwright
// suffixes them with project + platform under tests/e2e/golden.spec.ts-snapshots/.
// Refresh after an intentional visual change: pnpm e2e --project=golden --update-snapshots
const SETTLE_TIMEOUT_MS = 45_000;

// One small margin after "settled": ~18 presented frames at 60 Hz, still ~3 at a 10 Hz worst case,
// so the compositor has shown at least a couple of post-settle canvas frames before
// toHaveScreenshot starts its own stability loop. Not a tuning knob.
const SETTLE_MARGIN_MS = 300;

// Must equal the config viewport: 1280 × 720 at DPR 1 gives pixelRatio exactly 1.0 on T1.
const VIEWPORT = { width: 1280, height: 720 };

// An element screenshot is a clip of the composited page, so overlapping DOM overlays would land
// in the baseline. Hide them (visibility keeps layout, so nothing reflows). #chrome-row holds
// the notes link; #lang-toggle is the §1.2 top-right toggle (outside the row); #travel-hint is
// the §9 hint — all overlay chrome.
// R23-ux: the load line rides the same hide law (it lives in the corner stack during a
// transit; a settled scene never shows it, and the goldens' deep-link entries never reach
// the threshold — the row hides it unconditionally, one selector, no image change).
const HIDE_OVERLAYS_CSS =
  '#title, #scrub, #chrome-row, #lang-toggle, #index-open, #index-dialog, #travel-hint, #edge-prompt, #hud, #caption, #caption-title, #load-line { visibility: hidden !important; }';

const MAX_DIFF_PIXEL_RATIO = 0.01;

// Screenshot options shared by every scene (see the comment on 'golden: noon' for why page-level).
const SHOT = {
  clip: { x: 0, y: 0, width: 1280, height: 720 },
  maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
  timeout: 60_000,
} as const;

// design-staircase §4.4 room goldens: one stop per interior room at the three §4 det times.
// `stop` is the dev-only `?stop=` switch (src/world/stop-param.ts); the det times are the same
// instants the smoke and the room look review use. Nine scenes = 3 rooms × 3 light states.
// R-UX5: J4 is RE-SITED onto the landing slab with an authored subject (the east portal) —
// its three baselines re-baseline ONCE, recorded in the round row; G1's position and gaze
// direction are bit-identical (its subject lies due east on the same ray), so its three
// baselines HOLD; the four square scenes hold (poses unchanged).
// R4 (design-gallery §4.6, D-20): the 1812 scene is ADDED — the same precedent, SHOT / DET_AT /
// roomReady untouched; golden-1812-{day,dusk,night}.png are NEW files (26 → 29). The stop is
// the threshold M0: the long view south along the axis — both long walls, the roof light and
// the kit in one frame; the existing baselines stay bit-identical (§9.2).
const DET_AT = {
  day: '2026-06-22T03:18:00Z',
  dusk: '2026-06-20T21:50:00Z',
  night: '2026-02-17T16:25:00Z',
} as const;
const ROOM_SCENES = [
  { name: 'jordan', route: 'jordan', roomId: 'jordan', stop: 'J4' },
  { name: 'gallery', route: 'gallery', roomId: 'rastrelli-gallery', stop: 'G1' },
  { name: '1812', route: '1812', roomId: 'military-gallery', stop: 'M0' },
] as const;

async function settledPage(page: Page, query: string): Promise<void> {
  await page.goto(`/#/?${query}`);
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  // Guard: the canvas must fill the viewport exactly at DPR 1 — a smaller canvas would silently
  // turn into a cropped page capture, a larger one would change the pixelRatio inputs.
  expect(await page.locator('#scene').boundingBox(), '#scene fills the viewport exactly').toEqual({
    x: 0,
    y: 0,
    ...VIEWPORT,
  });
}

// The smoke's roomReady contract: the HUD reports the target room, a non-zero ledger (the room's
// textures are resident) and hold-ms 0 (the swap hold has released), then the same margin.
async function roomReady(
  page: Page,
  scene: (typeof ROOM_SCENES)[number],
  at: string,
): Promise<void> {
  await page.goto(`/#/${scene.route}?at=${at}&det=1&stop=${scene.stop}&hud=1`);
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-room', scene.roomId, { timeout: SETTLE_TIMEOUT_MS });
  await expect(hud).not.toHaveAttribute('data-ledger-bytes', '0', { timeout: SETTLE_TIMEOUT_MS });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: SETTLE_TIMEOUT_MS });
  await page.addStyleTag({ content: HIDE_OVERLAYS_CSS });
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  expect(await page.locator('#scene').boundingBox(), '#scene fills the viewport exactly').toEqual({
    x: 0,
    y: 0,
    ...VIEWPORT,
  });
}

test('golden: noon', async ({ page }) => {
  await settledPage(page, 'at=2026-06-21T12:00:00Z&det=1');
  // Page-level capture with a viewport clip — NOT locator('#scene'). The locator path runs a
  // scroll-into-view "element stability" wait that never settles on a continuously rAF-driven
  // WebGL canvas (watched twice on the reference Mac); the page path takes the frame as composited
  // and needs no element scroll. With the overlays hidden above this clips the same pixels.
  // timeout: raw captures measure 2–6 s each on the reference machine (diagnostic probe,
  // gitignored), and the internal two-capture stability loop must fit inside this assertion
  // timeout — the 5 s default provably trips first.
  await expect(page).toHaveScreenshot('golden-noon.png', SHOT);
});

test('golden: white night (devlog-0000 hero)', async ({ page }) => {
  await settledPage(page, 'at=2026-06-20T21:45:00Z&det=1');
  await expect(page).toHaveScreenshot('golden-white-night.png', SHOT);
});

// golden: the square's S1 frame — the gate whole with the throat's receding vault and its
// warm far light (R-UX3 §3, §9 «Approach»; sep-2026: the doorstep a stop further back).
// Seeds ?stop=S1 over the noon instant; captured like every square scene (settled + margin).
test('golden: S1 noon (the gate approach)', async ({ page }) => {
  await settledPage(page, 'at=2026-06-21T12:00:00Z&det=1&stop=S1');
  // Deliberate re-composition (D7): a NEW baseline, recorded in the round row.
  await expect(page).toHaveScreenshot('golden-s1-noon.png', SHOT);
});

// Phase 2b exit gate (DEC-019): 21 Dec 21:00 local (18:00Z) — deep winter night, the sun far
// below the horizon, the sky near-dark. The facade must read from the pane lattice alone; the
// hemisphere's ground warm-up is the only secondary. wNight === 1 at this instant.
test('golden: dec night (lattice)', async ({ page }) => {
  await settledPage(page, 'at=2026-12-21T18:00:00Z&det=1');
  await expect(page).toHaveScreenshot('golden-dec-night.png', SHOT);
});

// DEC-033 winter exit gate: 21 Dec 13:00 local (10:00Z) — solar noon at 30.3°E, the day's
// maximum ~6.6°. wNight === 0 (the lattice hidden), wSnow === 1 (the plateau): the low sun rakes
// the cornice lips and the slot's up-facing dusting. The point of snow is that December becomes
// legible in daylight. Same camera as dec night; captured like every square scene.
test('golden: dec noon (winter gate)', async ({ page }) => {
  await settledPage(page, 'at=2026-12-21T10:00:00Z&det=1');
  await expect(page).toHaveScreenshot('golden-dec-noon.png', SHOT);
});

// DEC-033: an isolated lattice fence now that dec night fences two things — 15 Oct 23:00 local
// (20:00Z): wNight === 1, wSnow === 0 (Oct 15 precedes the Nov 10 anchor; the cap hidden, the
// slot an exact identity).
test('golden: oct night (lattice only)', async ({ page }) => {
  await settledPage(page, 'at=2026-10-15T20:00:00Z&det=1');
  await expect(page).toHaveScreenshot('golden-oct-night.png', SHOT);
});

for (const scene of ROOM_SCENES) {
  for (const [light, at] of Object.entries(DET_AT)) {
    test(`golden: ${scene.name} ${scene.stop} ${light}`, async ({ page }) => {
      await roomReady(page, scene, at);
      await expect(page).toHaveScreenshot(`golden-${scene.name}-${light}.png`, SHOT);
    });
  }
}
