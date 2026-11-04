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
 *
 * THE STARVE-BISECT VERDICT (probes/settle-bisect.mjs): the SAME page/URL/viewport settles
 * in ~14 s OUTSIDE the test harness (plain launch, no recording machinery) while this
 * file's rows starved their 240 s predicates inside it — the trace/screenshot recorders
 * breathe on every action of these minutes-long rAF-canvas rows. These rows keep their
 * verdicts via the hud attrs, the dev readout and console stamps, so the recording knobs
 * go off FOR THIS FILE ONLY (the global retain-on-failure law stays for the rest).
 */
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { PNG } from 'pngjs';

test.use({ trace: 'off', screenshot: 'off' });

const AT = '?at=2026-06-22T03:18:00Z&det=1&hud=1'; // the rooms' pinned golden noon det instant
const SETTLE_TIMEOUT_MS = 240_000;
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
// NOTE: the hop hash is composed on the Node side and passed as the argument — the
// evaluate callback runs in the BROWSER context (the three-times-recorded closure trap).
// The per-step stamps (Node-side, printed inline by the line reporter) turned the
// «predicate starved» class into facts: WHICH leg ate the budget and how much.
const stepStamp = (label: string, startedAt: number): void => {
  console.log(`[handover] +${((Date.now() - startedAt) / 1000).toFixed(1)}s ${label}`);
};
const hopAndSettle = async (page: Page, from: string, to: string): Promise<void> => {
  const startedAt = Date.now();
  stepStamp(`${from}: goto begin`, startedAt);
  await page.goto(`/#/${from}${AT}`);
  stepStamp(`${from}: page open`, startedAt);
  await expect.poll(() => hudSettled(page, from), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  stepStamp(`${from}: settled`, startedAt);
  // THE SECOND-LEG HEARTBEAT (the harness-only starve): every 10 s reads the app's own
  // state — which room binds, what the hold-row says, whether the ledger moved, whether
  // the environment slot is bound — and hears the app's console. The app is identical
  // under the plain probe (the same hop settled in 15–30 s); this turns the harness's
  // silent freeze into per-10-s facts.
  const appLines: string[] = [];
  const consoleTap = (message: { type(): string; text(): string }): void => {
    if (['error', 'warning'].includes(message.type()))
      appLines.push(`${message.type()}: ${message.text()}`);
  };
  page.on('console', consoleTap);
  const heartbeat = setInterval(() => {
    void page
      .evaluate(() => {
        const hud = document.getElementById('hud');
        const ds = hud?.dataset;
        const debug = window as unknown as {
          __zimnyDebug?: { environmentPresent?: () => boolean };
        };
        return JSON.stringify({
          room: ds?.room,
          hold: ds?.holdMs,
          ledger: ds?.ledgerBytes,
          env: debug.__zimnyDebug?.environmentPresent?.() ?? 'n/a',
        });
      })
      .then((state) => stepStamp(`heartbeat ${state}`, startedAt))
      .catch((error: unknown) => stepStamp(`heartbeat failed: ${String(error)}`, startedAt));
  }, 10_000);
  try {
    await page.evaluate((hash) => (location.hash = hash), `#/${to}${AT}`);
    stepStamp(`hop ${from} → ${to}`, startedAt);
    await expect.poll(() => hudSettled(page, to), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
    stepStamp(`${to}: settled`, startedAt);
  } finally {
    clearInterval(heartbeat);
    page.off('console', consoleTap);
    for (const line of appLines) stepStamp(`app ${line}`, startedAt);
  }
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
  const t0 = Date.now();
  const mark = (label: string): void => {
    console.log(`[handover-fence] +${((Date.now() - t0) / 1000).toFixed(1)}s ${label}`);
  };
  await page.goto(`/#/jordan${STOP}`);
  mark('hot: jordan goto');
  await expect.poll(() => hudSettled(page, 'jordan'), { timeout: SETTLE_TIMEOUT_MS }).toBe(true);
  mark('hot: jordan settled');
  await page.evaluate((params) => (location.hash = `#/military-gallery${params}`), STOP);
  mark('hot: hop → military');
  await expect
    .poll(() => hudSettled(page, 'military-gallery'), { timeout: SETTLE_TIMEOUT_MS })
    .toBe(true);
  mark('hot: military settled');
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
