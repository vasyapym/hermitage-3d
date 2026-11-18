// tests/e2e/index-dialog.spec.ts
// The room index (design-gallery §6.2–6.4, §10 R5): the chrome button, the native dialog,
// the jump. Ground rules (the R-UX6 probe lessons): ?hud=1 rides the HASH query (the
// hashchange listener parses it there); a deep link boots on a FRESH page; the settle
// proxy is the button's own reveal (it flips at the first settled rest frame — §6.3).
import { expect, type Page, test } from '@playwright/test';

const AT = 'at=2026-06-22T03:18:00Z'; // the committed det day instant (§9)
const QUERY = `${AT}&det=1&hud=1&lang=en`;

const settleIndex = async (page: Page, room: string): Promise<void> => {
  // The committed roomReady pattern (the golden spec): the room attr flips at the SWAP
  // frame, hold-ms reads 0 only at the exit — the pair (+ the margin) is the settled,
  // transit-free state. The button's reveal alone races: the arrival can settle BEFORE
  // the deep-link transit exits (the applyPresentation comment), and a dialog opened
  // mid-flight has no current room yet (honest: nothing is current mid-transit).
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-room', room, { timeout: 90_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 90_000 });
  await page.waitForTimeout(300);
  await expect(page.locator('#index-open')).toHaveAttribute('data-visible', 'true', {
    timeout: 60_000,
  });
};

test('the button opens the dialog and lists every built room (RU default)', async ({ page }) => {
  await page.goto(`/#/gallery?${AT}&det=1&hud=1`);
  await settleIndex(page, 'rastrelli-gallery');
  await page.locator('#index-open').click();
  await expect(page.locator('#index-dialog')).toBeVisible();
  await expect(page.locator('#index-list button')).toHaveCount(4);
  await expect(page.locator('#index-list button[aria-current="true"]')).toHaveText(
    'Галерея Растрелли',
  );
});

test('arrows move, Enter jumps — the jump takes the cold-entry path (§6.4)', async ({ page }) => {
  await page.goto(`/#/gallery?${QUERY}`);
  await settleIndex(page, 'rastrelli-gallery');
  await page.locator('#index-open').click();
  await page.keyboard.press('ArrowDown'); // the current room (gallery) → jordan
  // R16 (the V3 disposition): no box — the label rises to ink and takes the underline
  // (the chrome's one focus law); forced-colors keeps the engine outline (untestable here).
  const focusedRow = page.locator('#index-list button').nth(2); // jordan after the arrow
  await expect(focusedRow).toHaveCSS('text-decoration-line', 'underline');
  await expect(focusedRow).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Enter');
  await expect(page.locator('#index-dialog')).toBeHidden();
  // The card carries the destination's sentence title (the sticky breadcrumb row)…
  await expect(page.locator('#caption-title')).toHaveAttribute('data-shown', 'Jordan Staircase', {
    timeout: 60_000,
  });
  // …and the arrival lands on the room's stop 0, the URL the state.
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 90_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 90_000 });
  await expect(page.locator('#caption')).toHaveAttribute('data-stop', 'J0', { timeout: 90_000 });
  await expect(page).toHaveURL(/#\/jordan/);
});

test('Escape closes and focus returns to the button (§6.4)', async ({ page }) => {
  await page.goto(`/#/jordan?${QUERY}`);
  await settleIndex(page, 'jordan');
  await page.locator('#index-open').click();
  await expect(page.locator('#index-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#index-dialog')).toBeHidden();
  await expect(page.locator('#index-open')).toBeFocused();
});

test('jumping to the current room just closes (§6.4)', async ({ page }) => {
  // R16.2 storm-day slack: the 1812 boot + the trace screencast's GL-readback stalls can
  // burn the default 90 s on Playwright's own click/stability retries (the R73 differential:
  // the probe ran the same flow clean; the per-test instrumentation cost the margin).
  test.setTimeout(240_000);
  await page.goto(`/#/1812?${QUERY}`);
  await settleIndex(page, 'military-gallery');
  await page.locator('#index-open').click();
  const current = page.locator('#index-list button[aria-current="true"]');
  await expect(current).toHaveText('Military Gallery of 1812');
  const url = page.url();
  await current.click();
  await expect(page.locator('#index-dialog')).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(page.locator('#hud')).toHaveAttribute('data-room', 'military-gallery', {
    timeout: 15_000,
  });
});

test('jumping to the square cuts to its stop 0 with the ledger back at boot (§6.4/§7.2)', async ({
  page,
}) => {
  // R16.2 storm-day slack (the R73 differential class): this test's waits (60–90 s asserts)
  // can exceed the default 90-s test cap on the 2-core reference device when GL-readback
  // stalls slow the page — its own budget must span its own asserted windows.
  test.setTimeout(360_000);
  await page.goto(`/#/1812?${QUERY}`);
  await settleIndex(page, 'military-gallery');
  await page.locator('#index-open').click();
  await page.locator('#index-list button').first().click(); // Palace Square
  await expect(page.locator('#index-dialog')).toBeHidden();
  await expect(page.locator('#caption-title')).toHaveAttribute('data-shown', 'Palace Square', {
    timeout: 60_000,
  });
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 90_000 });
  await expect(page.locator('#caption')).toHaveAttribute('data-stop', 'S0', { timeout: 90_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 90_000 });
  await expect(page).toHaveURL(/#\/(\?|$)/);
});

test('the EN list shows bare names derived from the sentence titles (§6.4)', async ({ page }) => {
  await page.goto(`/#/gallery?${QUERY}`);
  await settleIndex(page, 'rastrelli-gallery');
  await page.locator('#index-open').click();
  await expect(page.locator('#index-list button').nth(3)).toHaveText('Military Gallery of 1812');
});

test('Tab stays inside the open dialog (the native trap, §6.3)', async ({ page }) => {
  await page.goto(`/#/gallery?${QUERY}`);
  await settleIndex(page, 'rastrelli-gallery');
  await page.locator('#index-open').click();
  await expect(page.locator('#index-dialog')).toBeVisible();
  // Focus the last row, then Tab past it: the trap must cycle inside the dialog.
  await page.locator('#index-list button').last().focus();
  await page.keyboard.press('Tab');
  const inside = await page
    .locator('#index-dialog button, #index-open')
    .evaluateAll((els) => els.map((el) => el === document.activeElement));
  expect(inside.some(Boolean)).toBe(true);
});
