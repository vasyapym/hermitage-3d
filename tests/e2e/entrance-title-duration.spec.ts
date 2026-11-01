// tests/e2e/entrance-title-duration.spec.ts
// design-walkthrough-ux.md §4 (the 2026-11-01 owner reading-fix, over the R-UX1 window):
// the room-entry title stays readable through the card's 800 ms window and its outgoing
// glyphs ride the 240 ms fade — an instant text clear once cut the fade dead (the window
// read «gone in ≈ 0.2 s»). The instrument samples #caption-title per frame and reports
// the painted window through html data attrs: measured, not waited.
import { expect, type Page, test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

const SEED = 'at=2026-06-22T03:18:00Z&det=1&lang=en'; // the season.spec June det day
const SETTLE_TIMEOUT_MS = 60_000; // the sibling-spec law: slow boots never gate on the default
// The nominal readable window is ≈ 800 ms (the card hold; the fades overlap its ends by
// ~120 ms each) — the bound rides one render budget of reserve, never an upper gate:
// not-ready data legitimately holds longer.
const READABLE_MIN_MS = 700;

// One-shot per window: from the first frame the title is ≥ half opaque to the first frame
// it is below (or its glyphs are gone). The retention flag is observed on the fade-out
// frames — a writer that had cleared textContent instantly could never set it true.
const watchTitle = (): void => {
  let readableFrom: number | null = null;
  let retained = false;
  let done = false;
  const sample = (now: number): void => {
    if (done) return;
    const title = document.getElementById('caption-title');
    const hasText = (title?.textContent ?? '') !== '';
    const opacity = title === null ? 1 : Number(getComputedStyle(title).opacity);
    if (readableFrom === null) {
      if (hasText && opacity >= 0.5) readableFrom = now;
    } else {
      if (title?.dataset.visible === 'false') retained ||= hasText && opacity > 0;
      if (!hasText || opacity < 0.5) {
        done = true; // the single-writer guard: the first ender wins (the interval's twin)
        const root = document.documentElement;
        root.dataset.titleReadableMs = String(Math.round(now - readableFrom));
        root.dataset.titleFadeRetained = String(retained);
        clearInterval(ticker);
        return; // window measured; the sampler stands down
      }
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  // The R73-class guard: on some runners the trace screencast stalls GL readbacks and
  // starves rAF for seconds — an ~800-ms window then closes faster than the sampler's
  // frames ever hear (run 41362175165: the arrival settled, the title cleared, the
  // sampler never wrote). The interval hears the same state on the same clock; the
  // report stays single-writer.
  const ticker = setInterval(() => {
    sample(performance.now());
  }, 250);
};

const expectCardWindow = async (page: Page): Promise<void> => {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-title-readable-ms', /\d+/, {
    timeout: SETTLE_TIMEOUT_MS,
  });
  const windowMs = Number(await root.getAttribute('data-title-readable-ms'));
  expect(windowMs).toBeGreaterThanOrEqual(READABLE_MIN_MS);
  await expect(root).toHaveAttribute('data-title-fade-retained', 'true');
  await expect(page.locator('#caption-title')).toHaveAttribute('data-visible', 'false');
  await expect(page.locator('#caption-title')).toHaveText('', { timeout: 60_000 });
};

for (const route of ['/gallery', '/jordan', '/1812']) {
  test(`the entry title is readable through the card on ${route}`, async ({ page }) => {
    // The storm-class 2-core machine stretches every actionability window (R16.2 precedent).
    test.setTimeout(240_000);
    await page.addInitScript(watchTitle); // the boot card is the very first window
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
  await page.evaluate(watchTitle); // attach after the boot card is done — one shot
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
