// tests/e2e/load-line.spec.ts
/**
 * R23-ux (design-load-line.md): the load line's e2e rows. The positive case throttles ONE
 * 1812 row — the portrait atlas, the room's half-the-wait row — so the card's data wait
 * outlives LOAD_LINE_AFTER_MS; the rows assert the line's stages, the RU-first copy, the
 * one spoken word, the app-side stamp window (a LOWER bound only) and the settle contract.
 * The «never shows on a fast open» case is the unit law's, not the runner's: an
 * unthrottled or starved runner can legitimately show the line (the rAF-starved runner
 * class inflates the card's elapsed) — e2e never pins an upper bound on the wait.
 */
import { expect, type Page, test } from '@playwright/test';

const AT = '?at=2026-06-22T03:18:00Z&det=1&hud=1'; // the room's own pinned golden instant
const SETTLE_TIMEOUT_MS = 120_000;
const LINE_TIMEOUT_MS = 60_000;
// The throttle's length: far above LOAD_LINE_AFTER_MS (1,000), far below the settle budget,
// possibly doubled — the idle prefetch's own request, queued behind the transit's
// re-fetch through the same route, adds its share.
const ATLAS_DELAY_MS = 2_500;
const ATLAS_PATTERN = '**/assets/military-gallery/tex/military-gallery-portraits.ktx2';

// The settle contract the smoke walks (the data attrs bind only under ?hud=1). The
// check runs INSIDE the browser context — self-contained, the room as the argument.
const hudSettled = (page: Page, room: string): Promise<boolean> =>
  page.evaluate((room) => {
    const hud = document.querySelector('#hud');
    if (hud === null) return false;
    const ds = (hud as HTMLElement).dataset;
    return (
      ds.room === room &&
      ds.holdMs === '0' &&
      ds.ledgerBytes !== undefined &&
      ds.ledgerBytes !== '0'
    );
  }, room);

// The #caption-live recorder — installed before any script runs: the one spoken word
// must appear exactly once per transit even though the arrival announcement rewrites it.
const initAnnouncements = (): void => {
  const w = window as unknown as { __loadAnnouncements?: string[] };
  w.__loadAnnouncements = [];
  document.addEventListener('DOMContentLoaded', () => {
    const region = document.getElementById('caption-live');
    if (region === null) return;
    new MutationObserver(() => {
      w.__loadAnnouncements?.push(region.textContent ?? '');
    }).observe(region, { childList: true, characterData: true, subtree: true });
  });
};

const announcements = async (page: Page): Promise<ReadonlyArray<string>> =>
  ((await page.evaluate(
    () => (window as unknown as { __loadAnnouncements?: string[] }).__loadAnnouncements,
  )) ?? []) as ReadonlyArray<string>;

test('the load line counts a throttled 1812 open (ru)', async ({ page }) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2): the parallel
  // bake saturates the runner and stretches every settle; the predicates stay 120 s.
  await page.addInitScript(initAnnouncements);
  await page.route(ATLAS_PATTERN, async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, ATLAS_DELAY_MS));
    await route.fulfill({ response });
  });
  await page.goto(`/#/jordan${AT}`);
  await expect.poll(() => hudSettled(page, 'jordan'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  await page.evaluate((hash) => (location.hash = hash), `#/1812${AT}`);
  // The line arms at the card and shows past the threshold: open (manifest/chunk) or
  // bytes (rows streaming) — both honest while the data waits.
  const line = page.locator('#load-line');
  await expect(line).toHaveAttribute('data-state', /open|bytes/, { timeout: LINE_TIMEOUT_MS });
  const state = await line.getAttribute('data-state');
  if (state === 'bytes') {
    // The RU pair: the decimals ride the ru column, the unit rides the total only.
    await expect(line).toHaveText(/·\s\d+(,\d+)?\sиз\s\d+(,\d+)?\s(МБ|кБ)$/, {
      timeout: LINE_TIMEOUT_MS,
    });
  }
  // The one spoken word: the verb, exactly once (the arrival announce may rewrite it).
  await expect
    .poll(
      async () => (await announcements(page)).filter((text) => text === 'Загружаем зал').length,
      { timeout: SETTLE_TIMEOUT_MS },
    )
    .toBe(1);
  // The transit settles — contract rows back, the line gone (no box, no layout).
  await expect
    .poll(() => hudSettled(page, 'military-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  await expect(line).toHaveAttribute('data-state', 'off', { timeout: LINE_TIMEOUT_MS });
  // The app-side window: the line shows ≥ LOAD_LINE_AFTER_MS after the title shows.
  const stamps = await page.evaluate(() => ({
    title: document.documentElement.dataset.titleShownAt,
    line: document.documentElement.dataset.loadLineShownAt,
  }));
  expect(stamps.title).toBeDefined();
  expect(stamps.line).toBeDefined();
  expect(Number(stamps.line) - Number(stamps.title)).toBeGreaterThanOrEqual(1_000);
});

test('the load line speaks the en copy when the session runs en', async ({ page }) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  await page.route(ATLAS_PATTERN, async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, ATLAS_DELAY_MS));
    await route.fulfill({ response });
  });
  await page.goto(`/#/jordan${AT}&lang=en`);
  await expect.poll(() => hudSettled(page, 'jordan'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  await page.evaluate((hash) => (location.hash = hash), `#/1812${AT}&lang=en`);
  const line = page.locator('#load-line');
  await expect(line).toHaveAttribute('data-state', /open|bytes/, { timeout: LINE_TIMEOUT_MS });
  if ((await line.getAttribute('data-state')) === 'bytes') {
    await expect(line).toHaveText(/·\s\d+(\.\d+)?\sof\s\d+(\.\d+)?\s(MB|kB)$/, {
      timeout: LINE_TIMEOUT_MS,
    });
  } else {
    await expect(line).toHaveText('Loading the room', { timeout: LINE_TIMEOUT_MS });
  }
  await expect
    .poll(() => hudSettled(page, 'military-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  await expect(line).toHaveAttribute('data-state', 'off', { timeout: LINE_TIMEOUT_MS });
});
