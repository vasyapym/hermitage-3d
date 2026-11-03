// tests/e2e/environment-handover.spec.ts
/**
 * R24-ux (docs/design-environment-handover.md): the interior→interior handover regression.
 * The defect the round fixes: every departure whose origin was an interior room cleared the
 * freshly published destination environment AFTER the mount (the FSM fires dispose-from on
 * the exit transition, one transit after the hold's publication) — the room arrived dark.
 * The rows: the structural regression (the environment survives an interior departure),
 * the hot/cold rendered fences at a pinned instant AND pose (0.85–1.15 — the pre-fix hot
 * entry measured ≈0.49 for 1812 and ≈0.80 for jordan), and the square return (the square's
 * own policy: no probe — the slot nulls when the interior leaves it).
 * Every configuration opens a FRESH page (the resident/fragment-hop landmine), while the
 * intended transitions stay chained on their own page.
 */
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { PNG } from 'pngjs';

const AT = '?at=2026-06-22T03:18:00Z&det=1&hud=1'; // the rooms' pinned golden noon det instant
const SETTLE_TIMEOUT_MS = 120_000;
const SETTLE_MARGIN_MS = 1_500; // the goldens' post-settle compositor margin

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

const environmentPresent = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const debug = window as unknown as { __zimnyDebug?: { environmentPresent?: () => boolean } };
    const present = debug.__zimnyDebug?.environmentPresent;
    if (present === undefined) throw new Error('the dev readout is missing');
    return present();
  });

const meanLuminance = (file: string): number => {
  const png = PNG.sync.read(readFileSync(file));
  const data = png.data;
  let sum = 0;
  for (let index = 0; index < data.length; index += 4) {
    sum +=
      0.299 * (data[index] ?? 0) + 0.587 * (data[index + 1] ?? 0) + 0.114 * (data[index + 2] ?? 0);
  }
  return sum / (png.width * png.height) / 255;
};

// One interior transit on a fresh page: settle at `from`, hop, settle at `to`, idle.
const hopAndSettle = async (page: Page, from: string, to: string): Promise<void> => {
  await page.goto(`/#/${from}${AT}`);
  await expect.poll(() => hudSettled(page, from), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  await page.evaluate(({ to }) => (location.hash = `#/${to}${AT}`), { to });
  await expect.poll(() => hudSettled(page, to), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
};

// The hot/cold pair capture: the hot page walks jordan→1812 (the defect's own path) and
// the cold page deep-links the same room; both pin THE SAME stop pose via ?stop=<id>, the
// dev switch that seeds a stop on arrival — so the two frames differ in lighting alone.
const shoot = (page: Page, leg: string): Promise<string> =>
  page.waitForTimeout(SETTLE_MARGIN_MS).then(async () => {
    const file = `test-results/handover-${leg}.png`;
    await page.screenshot({ path: file, fullPage: false });
    return file;
  });

test('jordan → 1812: the destination environment survives an interior departure', async ({
  page,
}) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  await hopAndSettle(page, 'jordan', 'military-gallery');
  expect(await environmentPresent(page)).toBe(true); // the defect: was null before R24-ux
});

test('gallery → jordan: the destination environment survives an interior departure', async ({
  page,
}) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  await hopAndSettle(page, 'gallery', 'jordan');
  expect(await environmentPresent(page)).toBe(true);
});

test('the 1812 hot entry renders as bright as a cold deep link (0.85–1.15)', async ({ page }) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  const STOP = `${AT}&stop=M0`; // the pinned entry stop on both pages of the pair
  await page.goto(`/#/jordan${STOP}`);
  await expect.poll(() => hudSettled(page, 'jordan'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  await page.evaluate((params) => (location.hash = `#/military-gallery${params}`), STOP);
  await expect
    .poll(() => hudSettled(page, 'military-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  const hotFile = await shoot(page, 'military-hot');
  const coldPage = await page.context().newPage();
  await coldPage.goto(`/#/military-gallery${STOP}`);
  await expect
    .poll(() => hudSettled(coldPage, 'military-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  const coldFile = await shoot(coldPage, 'military-cold');
  const ratio = meanLuminance(hotFile) / meanLuminance(coldFile);
  expect(ratio).toBeGreaterThanOrEqual(0.85);
  expect(ratio).toBeLessThanOrEqual(1.15);
  await coldPage.close();
});

test('the jordan hot entry renders as bright as a cold deep link (0.85–1.15)', async ({ page }) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  const STOP = `${AT}&stop=J0`; // the pinned flight-foot stop on both pages of the pair
  await page.goto(`/#/gallery${STOP}`);
  await expect
    .poll(() => hudSettled(page, 'rastrelli-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  await page.evaluate((params) => (location.hash = `#/jordan${params}`), STOP);
  await expect.poll(() => hudSettled(page, 'jordan'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  await page.waitForTimeout(SETTLE_MARGIN_MS);
  const hotFile = await shoot(page, 'jordan-hot');
  const coldPage = await page.context().newPage();
  await coldPage.goto(`/#/jordan${STOP}`);
  await expect
    .poll(() => hudSettled(coldPage, 'jordan'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  await coldPage.waitForTimeout(SETTLE_MARGIN_MS);
  const coldFile = await shoot(coldPage, 'jordan-cold');
  const ratio = meanLuminance(hotFile) / meanLuminance(coldFile);
  expect(ratio).toBeGreaterThanOrEqual(0.85);
  expect(ratio).toBeLessThanOrEqual(1.15);
  await coldPage.close();
});

test('interior → square: the slot follows the square\u2019s own no-probe policy', async ({
  page,
}) => {
  test.setTimeout(300_000); // the storm-stretched budget precedent (R16.2)
  await hopAndSettle(page, 'jordan', 'military-gallery');
  expect(await environmentPresent(page)).toBe(true);
  await page.evaluate((params) => (location.hash = `#/${params}`), AT);
  await expect.poll(() => hudSettled(page, 'square'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  // The square is sun/hemisphere-lit and never binds a probe today: the returning
  // interior's ownership-checked release clears the last interior texture and returns
  // the slot to the square's own (null) environment. This row pins THAT POLICY as-is —
  // the capture-vs-reference question stays with the design doc, not with this row.
  expect(await environmentPresent(page)).toBe(false);
});
