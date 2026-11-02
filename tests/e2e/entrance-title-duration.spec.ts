// tests/e2e/entrance-title-duration.spec.ts
// design-walkthrough-ux.md §4 (the 2026-11-01 owner reading-fix, over the R-UX1 window):
// the room-entry title stays readable through the card's 800 ms window and its outgoing
// glyphs ride the 240 ms fade — an instant text clear once cut the fade dead (the window
// read «gone in ≈ 0.2 s»). The instrument samples #caption-title per frame and reports
// the painted window through html data attrs: measured, not waited. The window's pair
// (shownAt/clearedAt, both stamped by the writer) IS the retention proof: clearedAt
// writes only on the opacity transition's end while the glyphs were still there. The
// per-frame retention sampler was retired after four runs of the metric dependency
// (the stalled-runner class; 41362175165/41364407100 + the locals).
import { expect, type Page, test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });
// The R73-class guard, v2: the trace screencast's GL readback stalls starve the renderer's
// frame loop on this slow machine (the 281-ms stamp + the ReadPixels-stalled frames above
//; runs 41362175165/41364407100: the app settled, the instrument starved) — this spec's
// rows are pure chrome/DOM asserts with nothing to hand to a failure's pixel diff, so the
// record's own screencast buys nothing here and the data-attr stamps ARE the audit trail.
test.use({ trace: 'off' });

const SEED = 'at=2026-06-22T03:18:00Z&det=1&lang=en'; // the season.spec June det day
const SETTLE_TIMEOUT_MS = 60_000; // the sibling-spec law: slow boots never gate on the default
// The nominal readable window is ≈ 800 ms (the card hold; the fades overlap its ends by
// ~120 ms each) — the bound rides one render budget of reserve, never an upper gate:
// not-ready data legitimately holds longer.
const READABLE_MIN_MS = 700;

const expectCardWindow = async (page: Page): Promise<void> => {
  const root = page.locator('html');
  // The window's wall-clock stamps: the pair of APP-side facts (the fill frame and the
  // transition-end clear) — measured, not waited. The stalled-runner law: run
  // 41362175165 starved the live sampler's rAF outright and 41364407100's dual drive
  // still heard only ~100 ms of the real ~800-ms window on the same runner.
  await expect(root).toHaveAttribute('data-title-shown-at', /\d+/, {
    timeout: SETTLE_TIMEOUT_MS,
  });
  await expect(root).toHaveAttribute('data-title-cleared-at', /\d+/, {
    timeout: SETTLE_TIMEOUT_MS,
  });
  const shownAt = Number(await root.getAttribute('data-title-shown-at'));
  const clearedAt = Number(await root.getAttribute('data-title-cleared-at'));
  const windowMs = clearedAt - shownAt;
  expect(windowMs).toBeGreaterThanOrEqual(READABLE_MIN_MS);
  await expect(page.locator('#caption-title')).toHaveAttribute('data-visible', 'false');
  await expect(page.locator('#caption-title')).toHaveText('', { timeout: 60_000 });
};

for (const route of ['/gallery', '/jordan', '/1812']) {
  test(`the entry title is readable through the card on ${route}`, async ({ page }) => {
    // The storm-class 2-core machine stretches every actionability window (R16.2 precedent).
    test.setTimeout(240_000);
    await page.goto(`/#${route}?${SEED}`);
    await expectCardWindow(page);
  });
}

test('the square jump (an external hash navigation) keeps the window', async ({ page }) => {
  test.setTimeout(240_000); // the storm-class budget (R16.2 precedent)
  await page.goto(`/#/gallery?${SEED}`);
  // The boot settle proxy — the sibling-spec settle: the scrub + a margin. (The door
  // prompt at G0 does not reveal: the entry stop is not a far end — the push law.)
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.evaluate(() => {
    location.hash = '#/?at=2026-06-22T03:18:00Z&det=1&lang=en&hud=1';
  });
  await expectCardWindow(page);
  // Arrived on the square: the backward entry seeds the FAR stop S1 (the §6.1 seed law);
  // the announcement mirrors it (hide never clears, so the last text is the truth).
  await expect(page.locator('#caption-live')).toHaveText('S1 · the arch opens', {
    timeout: SETTLE_TIMEOUT_MS,
  });
});
