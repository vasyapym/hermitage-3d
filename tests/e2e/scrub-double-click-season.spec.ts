// tests/e2e/scrub-double-click-season.spec.ts
// design-sky-time.md §9 (the 2026-11-01 owner reading-fix): the pointer double-click
// reset is retired. A double click that is just two hour commits never returns the scene
// to «Сейчас»/"Now": the committed at= and the derived season label persist through the
// one-second live-sampling intervals that would resample a live mode.
import { expect, test } from '@playwright/test';

const SEED = 'at=2026-11-01T09:00Z&det=1&lang=en'; // the real autumn day the owner saw
const SETTLE_TIMEOUT_MS = 45_000; // the sibling-spec law: slow boots never gate on the default

test('a double click commits the hour once more, never the reset', async ({ page }) => {
  // The 2-core reference machine runs headless WebGL pages with multi-second click
  // actionability windows (the storm class) — the R16.2 precedent: stretch the budget,
  // never the retries.
  test.setTimeout(240_000);
  await page.goto(`/#/gallery?${SEED}`);
  const season = page.locator('#season');
  // The settle proxy (the sibling law): the scrub and the control visible before interaction.
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expect(season).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.waitForTimeout(300);

  // The owner's setup: choose Summer from the in-page listbox; the commit writes the
  // season's anchor instant (Jun 21, the same local time of day) into at=.
  await season.click();
  await expect(page.locator('#season-list')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await page.locator('#season-list [data-season="summer"]').click();
  await expect(season).toHaveText('Summer');

  const params = (): URLSearchParams => {
    const hash = new URL(page.url()).hash;
    const mark = hash.indexOf('?');
    return new URLSearchParams(mark === -1 ? '' : hash.slice(mark + 1));
  };
  const summerAt = params().get('at');
  expect(summerAt).not.toBeNull();

  // The double click: two pointer commits landing at one spot on the hairline scrub.
  const scrub = page.locator('#scrub');
  const box = await scrub.boundingBox();
  if (box === null) throw new Error('the scrub has no pointer box');
  await scrub.dblclick({ position: { x: box.width * 0.55, y: box.height / 2 } });

  // An hour-shift commit moved the instant within the Summer anchor day; the season held.
  const afterAt = params().get('at');
  if (afterAt === null) throw new Error('the double click removed the committed at=');
  expect(afterAt).not.toBe(summerAt);
  const localDay = new Date(Date.parse(afterAt) + 3 * 60 * 60 * 1000); // the +03 clock
  expect(localDay.toISOString().slice(0, 10)).toBe('2026-06-21');
  await expect(season).toHaveText('Summer');

  // Fixed mode is never resampled: the committed hash/clock/label survive the one-second
  // intervals that would have resampled a live mode (the reported bug's afterlife).
  const committedHash = new URL(page.url()).hash;
  const committedClock = await page.locator('#clock').textContent();
  for (let sample = 0; sample < 3; sample += 1) {
    await page.waitForTimeout(1100);
    expect(new URL(page.url()).hash).toBe(committedHash);
    await expect(season).toHaveText('Summer');
    expect(await page.locator('#clock').textContent()).toBe(committedClock);
  }
});
