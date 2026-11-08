import { expect, type Page, test } from '@playwright/test';

// The travel-hint e2e contract — design-i18n-notes.md §9 (round 25). Every navigation pins
// ?lang= explicitly (§1.1's e2e rule); a fresh page per configuration (the round-17c trap:
// same-base goto is a fragment navigation, and the hint's law is once-per-page-lifetime).
const SETTLE_TIMEOUT_MS = 45_000;
const AT = 'at=2026-06-21T12:00:00Z&q=t1'; // q pinned: no tier probe, no post-settle compile jank — the 6 s hold is real time
const HINT = '#travel-hint';

async function settled(page: Page, query: string): Promise<void> {
  await page.goto(`/#/?${query}`);
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
}

test('(a) S0 en: the hint shows at the settle beat with the EN copy', async ({ page }) => {
  await settled(page, `${AT}&lang=en`);
  const hint = page.locator(HINT);
  await expect(hint).toHaveAttribute('data-visible', 'true', { timeout: 10_000 });
  // The movement-ux ruling renamed the verbs: the hint names the ARROWS now.
  await expect(hint).toHaveText('Press the arrow keys to walk · drag to look around');
  await expect(hint).toHaveAttribute('data-dismissed', 'none');
});

test('(b) S0 ru: «Нажимайте стрелки, чтобы идти · потяните, чтобы осмотреться»', async ({
  page,
}) => {
  await settled(page, `${AT}&lang=ru`);
  const hint = page.locator(HINT);
  await expect(hint).toHaveAttribute('data-visible', 'true', { timeout: 10_000 });
  await expect(hint).toHaveText('Нажимайте стрелки, чтобы идти · потяните, чтобы осмотреться');
});

test('(c) the first travel intent dismisses with data-dismissed=travel', async ({ page }) => {
  // Two legs, two FRESH pages: the goto on the same base is a fragment navigation (no
  // reload — the round-17c trap), and the hint's law is once per page lifetime.
  const freshSettled = async (query: string): Promise<Page> => {
    const fresh = await page.context().newPage();
    await fresh.goto(`/#/?${query}`);
    await expect(fresh.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    return fresh;
  };
  // The intent is dispatched the moment the row settles — the hint may already be shown
  // (the settle beat fired: shown → gone, the hold is cancelled) or still armed (armed →
  // gone, it never flashes); §9 makes the FIRST travel intent the dismissal either way.
  // Waiting for data-visible=true here would race the 6 s hold against a janked main
  // thread (the watch: a slow protocol round-trip pushed the press past the hold and the
  // unprompted timeout won).
  // The wheel leg is retired with the wheel (the movement-ux ruling): the arrows and the
  // drag already assert the same first-intent dismissal data-attributes.
  // Arrow step:
  let p = await freshSettled(`${AT}&lang=en`);
  await p.locator('#scene').focus();
  await p.keyboard.press('ArrowRight');
  await expect(p.locator(HINT)).toHaveAttribute('data-visible', 'false');
  await expect(p.locator(HINT)).toHaveAttribute('data-dismissed', 'travel');
  await p.close();

  // A pointer drag start, any pointer type (the pointerdown path, touch included):
  p = await freshSettled(`${AT}&lang=en`);
  await p.mouse.move(640, 360);
  await p.mouse.down();
  await p.mouse.up();
  await expect(p.locator(HINT)).toHaveAttribute('data-visible', 'false');
  await expect(p.locator(HINT)).toHaveAttribute('data-dismissed', 'travel');
  await p.close();
});

test('(d) the unprompted timeout fade lands data-dismissed=timeout', async ({ page }) => {
  test.setTimeout(120_000); // the hold is 6 s real time from the settle beat
  await settled(page, `${AT}&lang=en`);
  const hint = page.locator(HINT);
  await expect(hint).toHaveAttribute('data-visible', 'true', { timeout: 10_000 });
  await expect(hint).toHaveAttribute('data-dismissed', 'timeout', { timeout: 15_000 });
  await expect(hint).toHaveAttribute('data-visible', 'false');
});

test('(e) det never shows the hint and never schedules it', async ({ page }) => {
  await settled(page, `${AT}&det=1&lang=en`);
  const hint = page.locator(HINT);
  await page.waitForTimeout(3000); // past the settle beat: the show step must not fire
  await expect(hint).toHaveAttribute('data-visible', 'false');
  await expect(hint).toHaveAttribute('data-dismissed', 'none');
});

test('(f) deep links to other stops never see the hint', async ({ page }) => {
  for (const stop of ['G0', 'J4']) {
    // A fresh page per stop: a same-base goto is a fragment navigation (no reload), and
    // the hint's state lives for the page lifetime (the round-17c trap).
    const fresh = await page.context().newPage();
    await fresh.goto(`/#/gallery?${AT}&lang=en&stop=${stop}`);
    await expect(fresh.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await fresh.waitForTimeout(3000);
    await expect(fresh.locator(HINT)).toHaveAttribute('data-visible', 'false');
    await expect(fresh.locator(HINT)).toHaveAttribute('data-dismissed', 'none');
    await fresh.close();
  }
});

test('(g) reduced motion cuts every transition on the hint', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settled(page, `${AT}&lang=en`);
  const hint = page.locator(HINT);
  await expect(hint).toHaveAttribute('data-visible', 'true', { timeout: 10_000 });
  await expect(hint).toHaveCSS('transition-duration', '0s');
});

test('the language toggle flips the overlay and the page (§1.2)', async ({ page }) => {
  await settled(page, `${AT}&lang=ru`);
  const toggle = page.locator('#lang-toggle');
  await expect(toggle).toHaveText('EN'); // the TARGET language in its own script
  await expect(toggle).toHaveAttribute('lang', 'en');
  await expect(page.locator(HINT)).toHaveText(
    'Нажимайте стрелки, чтобы идти · потяните, чтобы осмотреться',
  );
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', {
    timeout: 10_000,
  });
  await expect(page).toHaveTitle('Winter Palace in the browser');
  // Swaps in place:
  await expect(page.locator(HINT)).toHaveText('Press the arrow keys to walk · drag to look around');
  await expect(page.locator('#notes-link')).toHaveText('How it’s built →');
  // The URL carries the written lang= (replaceState, no history entry) and the toggle
  // now names the OTHER language.
  expect(page.url()).toContain('lang=en');
  await expect(toggle).toHaveText('RU');
  await expect(toggle).toHaveAttribute('lang', 'ru');
});
