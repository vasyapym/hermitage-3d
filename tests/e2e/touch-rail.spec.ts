import {
  type Browser,
  type BrowserContextOptions,
  expect,
  type Page,
  test,
} from '@playwright/test';
import {
  TOUCH_RAIL_CLEARANCE_PX as CLEAR,
  TOUCH_RAIL_GAP_PX as GAP,
  TOUCH_BUTTON_MIN_BLOCK_PX as H,
  TOUCH_RAIL_INSET_PX as INSET,
  touchRailCenter,
  TOUCH_BUTTON_MIN_INLINE_PX as W,
} from '../../src/ui/touch-rail';

const CHAIN = ['square', 'rastrelli-gallery', 'jordan', 'military-gallery'] as const;
// The stops' travel order per room, read off the room contracts (src/camera/square-rail.ts,
// rooms/*/contract.ts). The digit suffix alone is NOT an order: 'Gj' carries none and
// 'J1b'/'J2b' trail a letter, so the walk assertions read this map instead of a regex.
const STOPS: Record<string, number> = {
  S0: 0,
  Sh: 1, // R18-ux D1: the halfway stop (the §8 stop table)
  S1: 2,
  G0: 0,
  Gj: 1,
  G1: 2,
  G2: 3,
  J0: 0,
  J1: 1,
  J1b: 2,
  J2: 3,
  J2b: 4,
  J3: 5,
  J4: 6,
  M0: 0,
  M1: 1,
  M2: 2,
  M3: 3,
  M4: 4,
};
const button = (p: Page, d: number) => p.locator(d > 0 ? '#touch-forward' : '#touch-back');
const position = (p: Page) =>
  p.locator('#hud').evaluate((e) => ({
    room: e.getAttribute('data-room'),
    stop: e.getAttribute('data-stop'),
  }));
const index = (s: string | null): number => {
  const at = s === null ? undefined : STOPS[s];
  expect(at).toBeDefined();
  return at ?? 0;
};
// The route's travel order across the WHOLE chain — the STOPS map's own key order. Per-room
// stop indexes restart at every boundary (S1 → G0 walks 1 → 0), so an expectation that can
// span a boundary must compare on this list, never on index(before) + delta. (The battery's
// rapid-activation + native-keyboard traces: a lawfully admitted tap at S1 crossed into G0
// and the +1 arithmetic read the wrap as a regression.)
const ROUTE: readonly string[] = Object.keys(STOPS);
const routeIndex = (s: string | null): number => {
  const at = s === null ? undefined : ROUTE.indexOf(s);
  expect(at).toBeDefined();
  return at ?? -1;
};

async function roomReady(p: Page): Promise<void> {
  const h = p.locator('#hud[data-room]');
  await expect(h).toBeAttached({ timeout: 45_000 });
  await expect(h).toHaveAttribute('data-hold-ms', '0', { timeout: 45_000 });
  // The chrome's own reveal IS the settle signature (the fixtures' gate): hold-0 reads
  // transit-free, not settled — a press racing the last arrival beats is LAWFULLY dropped
  // (the CI's first-Enter failure was exactly that race).
  await expect(p.locator('#scrub')).toBeVisible({ timeout: 45_000 });
  await expect
    .poll(() => p.locator('#touch-rail button[aria-disabled="false"]').count(), { timeout: 45_000 })
    .toBeGreaterThan(0);
  await p.waitForTimeout(300);
}

async function frames(p: Page): Promise<void> {
  await p.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

async function rawTap(p: Page, d: number): Promise<void> {
  const b = await button(p, d).boundingBox();
  expect(b).not.toBeNull();
  if (b === null) throw new Error('the rail button is not rendered');
  await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

async function step(p: Page, d: number) {
  const before = await position(p);
  await expect(button(p, d)).toHaveAttribute('aria-disabled', 'false');
  await button(p, d).tap();
  await expect.poll(() => position(p), { timeout: 45_000 }).not.toEqual(before);
  await roomReady(p);
  const after = await position(p);
  if (after.room === before.room) expect(index(after.stop)).toBe(index(before.stop) + d);
  await frames(p);
  expect(await position(p)).toEqual(after);
  return after;
}

async function seek(p: Page, room: string): Promise<void> {
  for (let n = 0; n < 100 && (await position(p)).room !== room; n++) await step(p, 1);
  expect((await position(p)).room).toBe(room);
}

async function farEnd(p: Page): Promise<void> {
  for (let n = 0; n < 100; n++) {
    if ((await button(p, 1).getAttribute('aria-disabled')) === 'true') return;
    if (
      index((await position(p)).stop) > 0 &&
      (await p.locator('#edge-prompt').getAttribute('data-visible')) === 'true'
    )
      return;
    await step(p, 1);
  }
  throw new Error('Rail end was not reached');
}

async function run(
  browser: Browser,
  baseURL: string | undefined,
  body: (p: Page) => Promise<void>,
  options: BrowserContextOptions = {},
  lang = 'ru',
) {
  const context = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:4173',
    hasTouch: true,
    deviceScaleFactor: 3,
    viewport: { width: 360, height: 744 },
    reducedMotion: 'reduce',
    ...options,
  });
  try {
    const p = await context.newPage();
    await p.goto(`/#/?at=2026-06-21T12:00:00Z&lang=${lang}&hud=1`);
    await roomReady(p);
    await body(p);
  } finally {
    await context.close();
  }
}

async function touches(p: Page) {
  const cdp = await p.context().newCDPSession(p);
  return (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: Array<{ x: number; y: number; id: number }>,
  ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

for (const room of CHAIN) {
  test(`room: ${room} every stop forward/back`, async ({ browser, baseURL }) => {
    // The raise lives HERE, before run(): the body's own first line ran only after
    // goto+roomReady, and the battery's rastrelli row died at the 90-s config default
    // before the body ever began (the boot-storm class). 540 s: the battery's military
    // trace spent a whole 240-s clock inside seek alone (~13-26 s per step at 3-5 fps —
    // ~21 steps for the far rooms; the index-dialog 240-s precedent's class).
    test.setTimeout(540_000);
    await run(browser, baseURL, async (p) => {
      await seek(p, room);
      const stops = [(await position(p)).stop];
      for (let n = 0; n < 100; n++) {
        if (
          (await button(p, 1).getAttribute('aria-disabled')) === 'true' ||
          (stops.length > 1 &&
            (await p.locator('#edge-prompt').getAttribute('data-visible')) === 'true')
        )
          break;
        const next = await step(p, 1);
        expect(next.room).toBe(room);
        stops.push(next.stop);
      }
      expect(stops.length).toBeGreaterThan(1);
      for (const stop of stops.slice(0, -1).reverse()) {
        expect((await step(p, -1)).stop).toBe(stop);
      }
    });
  });
}

for (let i = 0; i < 3; i++) {
  test(`connection: ${String(CHAIN[i])} / ${String(CHAIN[i + 1])} both directions`, async ({
    browser,
    baseURL,
  }) => {
    // Before run(), same placement law as the room rows (the battery's rastrelli/jordan
    // connections died at the 90-s default or spent 240 s on ~11-16 storm-paced steps).
    test.setTimeout(540_000);
    await run(browser, baseURL, async (p) => {
      await seek(p, CHAIN[i] ?? 'square');
      await farEnd(p);
      const edge = await position(p);
      expect((await step(p, 1)).room).toBe(CHAIN[i + 1]);
      expect(await step(p, -1)).toEqual(edge);
    });
  });
}

test('terminal locks', async ({ browser, baseURL }) => {
  // Before run() (the placement law): the battery row died at the 90-s default mid-seek —
  // seek to the military gallery alone is 13 storm-paced steps (~20 s each).
  test.setTimeout(540_000);
  await run(browser, baseURL, async (p) => {
    for (const d of [-1, 1]) {
      if (d > 0) {
        await seek(p, CHAIN[3] ?? 'military-gallery');
        await farEnd(p);
        expect((await position(p)).stop).toMatch(/M4$/);
      }
      const before = await position(p);
      await button(p, d).focus();
      await expect(button(p, d)).toHaveAttribute('aria-disabled', 'true');
      await rawTap(p, d);
      await frames(p);
      expect(await position(p)).toEqual(before);
      await expect(button(p, d)).toBeFocused();
    }
  });
});

test('rapid activation / reduced motion', async ({ browser, baseURL }) => {
  test.setTimeout(240_000); // two raw taps + roomReady under the box's GPU-stall storms (the index-dialog precedent's class)
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await run(
      browser,
      baseURL,
      async (p) => {
        const before = routeIndex((await position(p)).stop); // S0 boots at the square
        await rawTap(p, 1);
        await rawTap(p, 1);
        await roomReady(p);
        // The admission law owns the outcome, and it reads the SECOND tap's arrival time:
        // a tap landing mid-glide or mid-hold is dropped (one step: S1), one landing after
        // the settle is admitted — and S1 IS the square's boundary stop, so that step
        // crosses (two steps: G0). Both outcomes are one-tap-one-step holding (the
        // battery's trace: the second CDP tap arrived ~1.5 s after the first, post-settle,
        // and the old per-room +1 arithmetic read the S1→G0 wrap as a regression). Assert
        // the legal set on the route order, plus stability across frames.
        const after = (await position(p)).stop;
        expect([before + 1, before + 2]).toContain(routeIndex(after));
        await frames(p);
        expect((await position(p)).stop).toBe(after);
      },
      { reducedMotion },
    );
  }
});

test('look-only / multitouch', async ({ browser, baseURL }) =>
  run(browser, baseURL, async (p) => {
    // Before run() (the placement law): a boot storm must meet the test's own budget.
    test.setTimeout(240_000);
    const send = await touches(p);
    const rail = p.locator('#touch-rail');
    const u = await rail.getAttribute('data-u');
    if (u === null) throw new Error('data-u row missing');
    const look = await rail.getAttribute('data-look');
    if (look === null) throw new Error('data-look row missing');
    await send('touchStart', [{ x: 250, y: 280, id: 1 }]);
    await send('touchMove', [{ x: 280, y: 300, id: 1 }]);
    await expect(rail).not.toHaveAttribute('data-look', look);
    await send('touchStart', [
      { x: 280, y: 300, id: 1 },
      { x: 310, y: 340, id: 2 },
    ]);
    await frames(p);
    const cancelled = await rail.getAttribute('data-look');
    if (cancelled === null) throw new Error('data-look row missing');
    await send('touchMove', [
      { x: 290, y: 310, id: 1 },
      { x: 320, y: 350, id: 2 },
    ]);
    await frames(p);
    await expect(rail).toHaveAttribute('data-look', cancelled);
    await expect(rail).toHaveAttribute('data-u', u);
    await send('touchEnd', []);
    await send('touchStart', [{ x: 250, y: 280, id: 3 }]);
    await send('touchMove', [{ x: 210, y: 260, id: 3 }]);
    await expect(rail).not.toHaveAttribute('data-look', cancelled);
    await send('touchEnd', []);
  }));

test('cancellation / resume / rotation', async ({ browser, baseURL }) =>
  run(browser, baseURL, async (p) => {
    // Five cancel causes × (reads + viewport round-trips + roomReady) at the storm cadence;
    // the raise lives before run() — the battery row died at the 90-s default mid-roomReady.
    test.setTimeout(360_000);
    const send = await touches(p);
    const rail = p.locator('#touch-rail');
    const u = await rail.getAttribute('data-u');
    if (u === null) throw new Error('data-u row missing');
    for (const cause of ['blur', 'hidden', 'resize', 'lost-capture', 'cancel']) {
      await send('touchStart', [{ x: 250, y: 280, id: 1 }]);
      await send('touchMove', [{ x: 270, y: 290, id: 1 }]);
      if (cause === 'resize') {
        await p.setViewportSize({ width: 744, height: 360 });
      } else {
        await p.evaluate((c) => {
          const scene = document.querySelector('#scene');
          if (scene === null) throw new Error('#scene missing');
          if (c === 'blur') window.dispatchEvent(new Event('blur'));
          else if (c === 'hidden') {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
            Reflect.deleteProperty(document, 'hidden');
            document.dispatchEvent(new Event('visibilitychange'));
          } else {
            scene.dispatchEvent(
              new PointerEvent(c === 'cancel' ? 'pointercancel' : 'lostpointercapture', {
                pointerId: Number(scene.getAttribute('data-look-pointer')),
              }),
            );
          }
        }, cause);
      }
      await frames(p);
      const look = await rail.getAttribute('data-look');
      if (look === null) throw new Error('data-look row missing');
      await send('touchMove', [{ x: 290, y: 300, id: 1 }]);
      await frames(p);
      await expect(rail).toHaveAttribute('data-look', look);
      await expect(rail).toHaveAttribute('data-u', u);
      await send('touchEnd', []);
      await p.setViewportSize({ width: 360, height: 744 });
      await roomReady(p);
    }
  }));

test('native keyboard / focus', async ({ browser, baseURL }) =>
  run(browser, baseURL, async (p) => {
    for (const key of ['Enter', 'Space']) {
      const before = routeIndex((await position(p)).stop);
      await button(p, 1).focus();
      await p.keyboard.down(key);
      await p.keyboard.down(key);
      await p.keyboard.down(key);
      await p.keyboard.up(key);
      await roomReady(p);
      // Route-order arithmetic: one activation = one step, and a step from a room's last
      // stop CROSSES the boundary (the battery's Space block: S1 → G0, where the per-room
      // index wraps 1 → 0 and the old +1 arithmetic read the lawful crossing as a miss).
      expect(routeIndex((await position(p)).stop)).toBe(before + 1);
      await expect(button(p, 1)).toBeFocused();
      // The 1.4-s step glide must END before the next key block: the ratified no-glide
      // admission lawfully DROPS a mid-glide command (hold-ms reads 0 during a glide —
      // roomReady cannot see it; the CI's tighter cadence exposed the race).
      await p.waitForTimeout(1_600);
    }
  }));

test('menu / scrub ownership', async ({ browser, baseURL }) =>
  run(browser, baseURL, async (p) => {
    const before = await position(p);
    for (const opener of ['#index-open', '[aria-haspopup="listbox"]']) {
      await p.locator(opener).tap();
      await expect(button(p, 1)).toHaveAttribute('aria-disabled', 'true');
      await button(p, 1).evaluate((e) => (e as HTMLButtonElement).click());
      expect(await position(p)).toEqual(before);
      await p.keyboard.press('Escape');
    }
    const send = await touches(p);
    const b = await p.locator('#scrub').boundingBox();
    expect(b).not.toBeNull();
    if (b === null) throw new Error('the scrub is not rendered');
    await send('touchStart', [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }]);
    await expect(button(p, 1)).toHaveAttribute('aria-disabled', 'true');
    await button(p, 1).evaluate((e) => (e as HTMLButtonElement).click());
    await send('touchEnd', []);
    await p.locator('#scrub').focus();
    await p.keyboard.press('ArrowRight');
    expect(await position(p)).toEqual(before);
  }));

test('context loss', async ({ browser, baseURL }) =>
  run(browser, baseURL, async (p) => {
    const url = p.url();
    await p.evaluate(() => {
      const n = document.querySelector('#scene-announcement');
      if (n === null) throw new Error('#scene-announcement missing');
      n.setAttribute('data-writes', '0');
      new MutationObserver(() =>
        n.setAttribute('data-writes', String(Number(n.getAttribute('data-writes')) + 1)),
      ).observe(n, { childList: true });
      const gl = (document.querySelector('#scene') as HTMLCanvasElement).getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_lose_context');
      if (!ext) throw new Error('WEBGL_lose_context unavailable');
      ext.loseContext();
    });
    await expect(p.locator('#scene-recovery')).toBeVisible();
    await expect(button(p, 1)).toHaveAttribute('aria-disabled', 'true');
    await p
      .locator('#scene')
      .evaluate((e) => e.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await expect(p.locator('#scene-announcement')).toHaveAttribute('data-writes', '1');
    await Promise.all([p.waitForEvent('load'), p.locator('#scene-reload').tap()]);
    expect(p.url()).toBe(url);
    await roomReady(p);
  }));

for (const lang of ['ru', 'en']) {
  test(`${lang.toUpperCase()} geometry (R18-ux verdict 1 + D6)`, async ({ browser, baseURL }) => {
    // Before the loop, not inside a body: the test spans TWO contexts (touch + mouse) ×
    // six viewports of bounding-box reads, and both boots can sit out a storm spike — the
    // battery's RU row died at the 90-s default while the second context was still
    // being created.
    test.setTimeout(540_000);
    for (const hasTouch of [true, false]) {
      await run(
        browser,
        baseURL,
        async (p) => {
          const hud = p.locator('#hud');
          const source = await hud.getAttribute('data-tier-source');
          const probes = await hud.getAttribute('data-probe-count');
          if (source === null || probes === null) throw new Error('tier rows missing');
          if (hasTouch) {
            expect(source).toMatch(/^(coarse|memory)$/);
            expect(probes).toBe('0');
          } else {
            expect(source).toBeTruthy();
            expect(source).not.toBe('coarse');
            expect(probes).toMatch(/^\d+$/);
          }
          const sizes = hasTouch
            ? ([
                [320, 568],
                [360, 744],
                [744, 360],
                [844, 390],
              ] as const)
            : ([
                [767, 744],
                [768, 744],
              ] as const);
          for (const [width, height] of sizes) {
            await p.setViewportSize({ width, height });
            const rail = p.locator('#touch-rail');
            const visible = hasTouch || width === 767;
            await expect(rail).toHaveAttribute('data-visible', String(visible));
            await expect(hud).toHaveAttribute('data-tier-source', source);
            await expect(hud).toHaveAttribute('data-probe-count', probes);
            await expect(button(p, -1)).toHaveAttribute('aria-disabled', 'true');
            await expect(button(p, 1)).toHaveAttribute('aria-disabled', 'false');
            if (!visible) {
              // Row 8 (R18-ux verdict 1): data-visible="false" removes the group from the
              // a11y tree — display:none is out of layout, focus and the tree.
              await expect(rail).toBeHidden();
              expect(await rail.boundingBox()).toBeNull();
              expect(await rail.evaluate((el) => getComputedStyle(el).display)).toBe('none');
              expect(await rail.evaluate((el) => el.checkVisibility())).toBe(false);
              continue;
            }
            await frames(p);
            const probe = await p.evaluate(() => {
              const rects = (id: string): DOMRect | null => {
                const el = document.querySelector(id);
                if (el === null) return null;
                return el.getClientRects().length === 0 ? null : el.getBoundingClientRect();
              };
              const backBtn = document.querySelector('#touch-back');
              const fwdBtn = document.querySelector('#touch-forward');
              const railEl = document.querySelector('#touch-rail');
              if (backBtn === null || fwdBtn === null || railEl === null) return null;
              const a = backBtn.getBoundingClientRect();
              const b = fwdBtn.getBoundingClientRect();
              const railRect = railEl.getBoundingClientRect();
              const inColumn = (r: DOMRect): boolean =>
                (r.left < a.right && r.right > a.left) || (r.left < b.right && r.right > b.left);
              const above: Array<{ id: string; bottom: number; top: number }> = [];
              const below: Array<{ id: string; top: number }> = [];
              for (const id of ['#title', '#lang-toggle']) {
                const r = rects(id);
                if (r !== null && inColumn(r)) above.push({ id, bottom: r.bottom, top: r.top });
              }
              for (const id of ['#chrome-row', '#scrub', '#notes-link']) {
                const r = rects(id);
                if (r !== null && inColumn(r)) below.push({ id, top: r.top });
              }
              const bandTop = Math.max(0, ...above.map((r) => r.bottom)) + 16;
              const bandBottom =
                Math.min(document.documentElement.clientHeight, ...below.map((r) => r.top)) - 16;
              return {
                a: { x: a.x, y: a.y, width: a.width, height: a.height },
                b: { x: b.x, y: b.y, width: b.width, height: b.height },
                rail: {
                  x: railRect.x,
                  right: railRect.x + railRect.width,
                  height: railRect.height,
                },
                clientWidth: document.documentElement.clientWidth,
                clientHeight: document.documentElement.clientHeight,
                centerVar: Number(
                  getComputedStyle(railEl).getPropertyValue('--touch-center').replace('px', ''),
                ),
                above,
                below,
                bandTop,
                bandBottom,
              };
            });
            if (probe === null) throw new Error('the rail geometry did not read');
            // The §4 box laws (unchanged): the two buttons carry the 72/44 minima; the
            // 8-px TOUCH_RAIL_GAP_PX is now the MINIMUM gap (verdict 1's space-between
            // pair spreads the buttons to the two insets).
            for (const box of [probe.a, probe.b]) {
              expect(box.width).toBeGreaterThanOrEqual(W);
              expect(box.height).toBeGreaterThanOrEqual(H);
            }
            expect(probe.b.x - probe.a.x - probe.a.width).toBeGreaterThanOrEqual(GAP - 0.5);
            // Row 1: the two buttons share one top (±0.5 px).
            expect(Math.abs(probe.a.y - probe.b.y)).toBeLessThanOrEqual(0.5);
            // Row 2: back.left = max(24, safe-area-left) (±0.5) — the env() insets resolve
            // to 0 without viewport-fit=cover (§4's law note), so 24 exactly.
            expect(probe.a.x).toBeGreaterThanOrEqual(INSET - 0.5);
            expect(Math.abs(probe.rail.x - INSET)).toBeLessThanOrEqual(0.5);
            // Row 3: clientWidth − fwd.right = max(24, safe-area-right) (±0.5).
            expect(
              Math.abs(probe.clientWidth - probe.b.x - probe.b.width - INSET),
            ).toBeLessThanOrEqual(0.5);
            // Row 4: the centre line equals touchRailCenter(bandTop, bandBottom, height).
            const expected = touchRailCenter(probe.bandTop, probe.bandBottom, probe.rail.height);
            expect(Math.abs(probe.centerVar - expected.center)).toBeLessThanOrEqual(1);
            // Row 5: clearance ≥ 16 px to every chrome block in either column.
            for (const block of probe.above) {
              expect(
                probe.a.y - block.bottom,
                `${block.id} above clearance`,
              ).toBeGreaterThanOrEqual(CLEAR - 0.5);
            }
            for (const block of probe.below) {
              expect(
                block.top - (probe.a.y + probe.a.height),
                `${block.id} below clearance`,
              ).toBeGreaterThanOrEqual(CLEAR - 0.5);
            }
            expect(probe.centerVar).toBeLessThanOrEqual(probe.bandBottom);
            expect(probe.centerVar).toBeGreaterThan(probe.bandTop - probe.rail.height);
            // Row 6: elementFromPoint at the group's centre returns the canvas — the group's
            // own box passes pointer input through (the verdict-1 layout law).
            expect(
              await p.evaluate(() => {
                const el = document.querySelector('#touch-rail');
                if (el === null) return null;
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return hit?.id ?? '';
              }),
            ).toBe('scene');
            // Row 7: tab order is Back then Forward.
            await button(p, -1).focus();
            await p.keyboard.press('Tab');
            await expect(button(p, 1)).toBeFocused();
          }
        },
        { hasTouch },
        lang,
      );
    }
  });
}

// Row 9 (R18-ux verdict 1 + D2): while busy, the geometry doesn't change. The glide needs
// motion, so this rides its own no-preference contexts at the phone size.
for (const lang of ['ru', 'en']) {
  test(`R18-ux ${lang.toUpperCase()} busy reserved geometry`, async ({ browser, baseURL }) => {
    test.setTimeout(240_000);
    await run(
      browser,
      baseURL,
      async (p) => {
        const read = async () => {
          const rail = p.locator('#touch-rail');
          const a = await button(p, -1).boundingBox();
          const b = await button(p, 1).boundingBox();
          const r = await rail.boundingBox();
          if (a === null || b === null || r === null) throw new Error('the rail is not rendered');
          return {
            ax: a.x,
            ay: a.y,
            aw: a.width,
            bx: b.x,
            by: b.y,
            rx: r.x,
            ry: r.y,
            rw: r.width,
            rh: r.height,
          };
        };
        const before = await read();
        await rawTap(p, 1);
        // Mid-glide (the 2800-ms step still running): the box is where it was.
        await p.waitForTimeout(600);
        const mid = await read();
        for (const key of ['ax', 'ay', 'aw', 'bx', 'by', 'rx', 'ry', 'rw', 'rh'] as const) {
          expect(Math.abs(mid[key] - before[key]), `${key} mid-glide`).toBeLessThanOrEqual(0.5);
        }
        await roomReady(p);
        const after = await read();
        for (const key of ['ax', 'ay', 'aw', 'bx', 'by', 'rx', 'ry', 'rw', 'rh'] as const) {
          expect(Math.abs(after[key] - before[key]), `${key} after`).toBeLessThanOrEqual(0.5);
        }
      },
      { reducedMotion: 'no-preference' },
      lang,
    );
  });
}
