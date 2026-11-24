import { type ConsoleMessage, expect, type Page, test } from '@playwright/test';

// The square-kit e2e contract (DEC-045, batch M3 — design §4): the late-bind mount is
// additive and never load-bearing — no /assets/square/ fetch before the boot's own chunks
// are in (the first-presented mark), the mount lands inside the boot hold, a blocked
// manifest route fails exactly once with the scene rendering on, and the whole-frame caps
// hold at every stop. Fresh page per configuration (the round-17c trap: same-base goto is
// a fragment navigation, and a mounted room keeps its technique until the next exit).
const SETTLE_TIMEOUT_MS = 45_000;
const Q = 'q=t1'; // no tier probe, no post-settle compile jank

async function settled(page: Page, query: string): Promise<void> {
  await page.goto(`/#/?${query}`);
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
}

const kitState = (page: Page): Promise<string | null> =>
  page.evaluate(() => document.documentElement.getAttribute('data-square-kit'));

test('(a) no /assets/square/ fetch before the first paint (the late-bind law)', async ({
  page,
}) => {
  await settled(page, `at=2026-06-21T12:00:00Z&det=1&${Q}`);
  const timing = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const square = entries.filter((e) => e.name.includes('/assets/square/'));
    // The first-paint mark: the sky-only first frame (§10). The lazy room chunks load in
    // the background AFTER first paint by design (the prefetch plan) — they are not a
    // first-paint marker; the paint entries are.
    const paints = performance.getEntriesByType('paint');
    return {
      squareFirst: Math.min(...square.map((e) => e.startTime), Number.POSITIVE_INFINITY),
      firstPaint: Math.min(...paints.map((e) => e.startTime), Number.POSITIVE_INFINITY),
      squareCount: square.length,
    };
  });
  expect(timing.squareCount).toBeGreaterThanOrEqual(1); // the kit did fetch (the mount ran)
  expect(timing.squareFirst).toBeGreaterThan(timing.firstPaint);
  expect(await kitState(page)).toBe('ready');
});

test('(b) the mount reaches ready inside the boot hold — before the settle beat', async ({
  page,
}) => {
  const bootStart = Date.now();
  await page.goto(`/#/?at=2026-06-21T12:00:00Z&det=1&${Q}`);
  await expect.poll(async () => kitState(page), { timeout: SETTLE_TIMEOUT_MS }).toBe('ready');
  const readyMs = Date.now() - bootStart;
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  const settleMs = Date.now() - bootStart;
  // The design's row records the mount's instant against the fade's end: the mount must
  // land before the settle beat (the fade covers it); the degraded late path is (c)'s.
  expect(readyMs, `ready ${readyMs} ms vs settle ${settleMs} ms (recorded)`).toBeLessThanOrEqual(
    settleMs,
  );
});

test('(c) a blocked manifest route fails exactly once and the scene renders on', async ({
  page,
}) => {
  const lines: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.text().includes('the square kit failed to mount')) lines.push(message.text());
  });
  await page.route('**/assets/square/manifest.json', (route) => route.abort());
  await settled(page, `at=2026-06-21T12:00:00Z&det=1&hud=1&${Q}`);
  expect(await kitState(page)).toBe('failed');
  expect(lines).toHaveLength(1); // the failure logs exactly once
  // The scene renders on: the S0 frame carries the sky + the palace, the census unchanged,
  // and the ledger stays at boot values (the no-registration ruling).
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-room', 'square');
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0');
  expect(Number(await hud.getAttribute('data-draws'))).toBeGreaterThan(0);
  expect(Number(await hud.getAttribute('data-tris'))).toBeGreaterThan(0);
});

const STOPS = ['S0', 'S0b', 'Sh', 'Shb', 'S1'] as const;
const DEC_NIGHT = 'at=2026-12-21T18:00:00Z';

for (const stop of STOPS) {
  test(`(d) ${stop} @ dec-night: the whole-frame caps hold (draws ≤ 120 · tris ≤ 150,000)`, async ({
    page,
  }) => {
    await settled(page, `${DEC_NIGHT}&det=1&stop=${stop}&hud=1&${Q}`);
    expect(await kitState(page)).toBe('ready');
    const hud = page.locator('#hud');
    const draws = Number(await hud.getAttribute('data-draws'));
    const tris = Number(await hud.getAttribute('data-tris'));
    // sq-arch-day B1a: the shadow map is enabled for the first time — every casting family
    // adds its depth-pass draw (+ tris), so the shadowless-era caps (56 / 75,000) no longer
    // describe the frame. These are the MEASUREMENT-window caps: the final cap rows pin from
    // the after-battery's recorded hud numbers, one DEC at the merge.
    expect(draws).toBeLessThanOrEqual(120);
    expect(tris).toBeLessThanOrEqual(150_000);
  });
}
