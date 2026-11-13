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
  TOUCH_RAIL_PROMPT_LINES as LINES,
  TOUCH_RAIL_SHIFT_PCT as SHIFT_PCT,
  touchRailCenter,
  touchRailSlotBottom,
  TOUCH_BUTTON_MIN_INLINE_PX as W,
} from '../../src/ui/touch-rail';

const CHAIN = ['square', 'rastrelli-gallery', 'jordan', 'military-gallery'] as const;
// The rooms' route slugs (the room contracts' own routes: DEC-029's `/1812` law — a room ID
// is NOT always its route). The re-driver replaces the storm-walk seeks with direct
// navigation where a row's subject is ITS OWN room's stops (the SwiftShader-class budgets).
const SLUGS: Readonly<Record<string, string>> = {
  square: '',
  'rastrelli-gallery': 'gallery',
  jordan: 'jordan',
  'military-gallery': '1812',
};
// The stops' travel order per room, read off the room contracts (src/camera/square-rail.ts,
// rooms/*/contract.ts). The digit suffix alone is NOT an order: 'Gj' carries none and
// 'J1b'/'J2b' trail a letter, so the walk assertions read this map instead of a regex.
// The 2026-11-12/13 stops round: S0b/Shb (the square's quarter-point inserts) and Gjb/G1b
// (the gallery's axis inserts) join their rooms' walk order.
const STOPS: Record<string, number> = {
  S0: 0,
  S0b: 1, // the 2026-11-12/13 stops round: the first quarter-point insert
  Sh: 2, // R18-ux D1: the halfway stop (the §8 stop table)
  Shb: 3, // the round's second quarter-point insert
  S1: 4,
  G0: 0,
  Gj: 1,
  Gjb: 2, // the round's first axis insert (the Gj→G1 midpoint)
  G1: 3,
  G1b: 4, // the round's second axis insert (the G1→G2 midpoint)
  G2: 5,
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

// The coherent walk snapshot (Sol R13): ONE page task reads the HUD's settle rows AND the
// rail's own rows together — the ACTUAL motion bit (data-moving) included, so a settle poll
// can never mistake a walk's mid-flight nearest reading for a landing, and no two reads can
// interleave a state between ticks. data-u is the rail parameter (parsed float).
type Snapshot = Readonly<{
  room: string | null;
  stop: string | null;
  holdMs: string | null;
  moving: string | null;
  u: number | null;
}>;
const snapshot = (p: Page): Promise<Snapshot> =>
  p.locator('#hud').evaluate((el) => {
    const rail = document.querySelector('#touch-rail');
    const uRow = rail?.getAttribute('data-u') ?? null;
    return {
      room: el.getAttribute('data-room'),
      stop: el.getAttribute('data-stop'),
      holdMs: el.getAttribute('data-hold-ms'),
      moving: rail?.getAttribute('data-moving') ?? null,
      u: uRow === null || uRow === '' ? null : Number.parseFloat(uRow),
    };
  });

// The square's own stop parameters (five stops → u = i/4, exact binary floats — the
// 2026-11-12/13 quarter-point inserts sit at 0.25/0.75): the landing assertions (R15/R16)
// check the rest's u against the stop it reports.
const SQUARE_STOP_U: Readonly<Record<string, number>> = {
  S0: 0,
  S0b: 0.25,
  Sh: 0.5,
  Shb: 0.75,
  S1: 1,
};
// The landing law (R15/R16): the walk's rest rides the stop's OWN parameter — the check
// runs on one coherent (stop, u) pair. A mid-segment rest (the walk law never allows one
// once intent is dead) reads loud here.
const assertStopLanding = (s: Snapshot, why: string): void => {
  const stop = s.stop;
  if (stop === null || !(stop in SQUARE_STOP_U)) {
    throw new Error(`the walk rested off the square’s stop map: ${stop}`);
  }
  expect(SQUARE_STOP_U[stop], why).toBe(s.u);
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

/** A settle read for a walk (never a transit), reworked on the coherent snapshot (Sol R13):
 * the walks' ACTUAL motion bit (data-moving) proves the walk is over — no nearest-window
 * agreement game is needed against a passing walk (the bit is the truth, written by the
 * rail's own sync) — then one repeat read 600 ms later must agree with the first: nothing
 * presses between the reads, so a stable pair is the rest. */
async function settledRoute(p: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const first = await snapshot(p);
        if (first.moving === 'true') return 'moving';
        if (first.holdMs !== '0') return 'transit-open';
        await p.waitForTimeout(600);
        const second = await snapshot(p);
        if (second.moving === 'true') return 'stirring';
        return second.room === first.room && second.stop === first.stop
          ? `${first.room}|${first.stop}`
          : 'moved';
      },
      { message: 'a stable coherent settle read', timeout: 90_000, intervals: [250, 600] },
    )
    .toMatch(/^[a-z0-9-]+\|[a-zA-Z0-9-]+$/);
  expect(await p.locator('#hud').getAttribute('data-hold-ms')).toBe('0');
}

async function rawTap(p: Page, d: number): Promise<void> {
  const b = await button(p, d).boundingBox();
  expect(b).not.toBeNull();
  if (b === null) throw new Error('the rail button is not rendered');
  await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

// R19-ux A.1: at a settled far end the door prompt shows UNDER the arrows — the hit at the
// Forward button's centre is the button itself and the prompt's box starts ≥ one stack gap
// below the pair (the seven rows' interception, pinned where it bit).
async function promptClear(p: Page): Promise<void> {
  const facts = await p.evaluate(() => {
    const fwd = document.querySelector('#touch-forward');
    const prompt = document.querySelector('#edge-prompt');
    const stack = document.querySelector('#corner-stack');
    if (fwd === null || prompt === null || stack === null) return null;
    const f = fwd.getBoundingClientRect();
    const hit = document.elementFromPoint(f.x + f.width / 2, f.y + f.height / 2);
    return {
      hit: hit?.id ?? '',
      clearance: prompt.getBoundingClientRect().top - f.bottom,
      gap: Number.parseFloat(getComputedStyle(stack).rowGap) || 0,
    };
  });
  if (facts === null) throw new Error('the rail or the corner stack is missing');
  expect(facts.hit).toBe('touch-forward');
  expect(facts.clearance).toBeGreaterThanOrEqual(facts.gap - 0.5);
}
async function step(p: Page, d: number) {
  const before = await position(p);
  await expect(button(p, d)).toHaveAttribute('aria-disabled', 'false');
  if (d > 0 && (await p.locator('#edge-prompt').getAttribute('data-visible')) === 'true') {
    await promptClear(p);
  }
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
      // Direct navigation (the movement-ux re-driver): the row walks ITS OWN room — the
      // storm-walk seek spent the whole budget getting there under SwiftShader pacing.
      await p.goto(
        `${baseURL ?? 'http://127.0.0.1:4173'}/#/${SLUGS[room]}?at=2026-06-21T12:00:00Z&lang=ru&hud=1`,
      );
      await roomReady(p);
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
        await p.goto(
          `${baseURL ?? 'http://127.0.0.1:4173'}/#/1812?at=2026-06-21T12:00:00Z&lang=ru&hud=1`,
        );
        await roomReady(p);
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
        // The settle between the taps (the CI pacing hardening): under the CI runner's
        // dispatch pace two back-to-back rawTaps never registered movement (before+0 twice;
        // locally the same row always read +1/+2). Wait for tap #1's OWN completed landing
        // on the coherent snapshot — the stop ADVANCED past the boot pose AND the walk is
        // over — not the idle bit alone (an idle bit alone cannot tell a rest from a walk
        // the cadence has not published yet). The press path publishes its bit synchronously
        // (the pair's activation syncs on pointerdown), so an accepted tap reads moving
        // 'true' from the poll's first sample; the reduced-motion cut is instant and passes
        // as soon as its changed stop binds. THE BUDGET SIZES AGAINST THE CAPPED SIMULATION
        // CLOCK: the walk law feeds ≤100 ms of state time per rendered frame
        // (Math.min(deltaMs, 100)), so the no-preference leg's ~2.2 s of simulation needs
        // ≥22 rendered frames — ≈29 s at the CI's recorded ~1.3 s/frame — the wall-time
        // figures (2.5 s, then 8 s) were arithmetic against the wrong clock (the Sol review).
        await expect
          .poll(
            async () => {
              const s = await snapshot(p);
              return routeIndex(s.stop) > before && s.moving === 'false' ? 'rested' : 'waiting';
            },
            {
              message: 'tap #1: its own leg landed (the stop advanced, the walk over)',
              timeout: 40_000,
              intervals: [100, 250],
            },
          )
          .toBe('rested');
        await rawTap(p, 1);
        await roomReady(p);
        // The walk law owns the outcome (the one admission rule admits a press MID-WALK —
        // it extends the walk; there is no drop gate anymore), and the settle above waits
        // out tap #1's own rest first. Reduced: tap two lands inside the 600 ms dwell and
        // is dropped (one cut: S0b); normal: tap two departs the first cut's rest and runs
        // its own leg: two steps along the route S0 → S0b → Sh, resting at Sh — never
        // three steps off a double activation; a boundary crossing into G0 needs a press
        // from a SETTLED S1 (four steps) — so the legal set [before+1, before+2] holds in
        // both modes (the
        // documented law change; the old mid-glide-drop wording is gone with the walk).
        // Assert the legal set on the route order, plus stability across frames.
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
      // The wait only paces the two key blocks: the walk law admits the next block's
      // press MID-WALK (it refills the intent — never a door), and that press still rests
      // at the leg's own next stop either way. hold-ms reads 0 during every walk
      // (hudHoldMs reports transits only), so roomReady cannot see one — the wait is
      // pacing, never readiness (the CI's tighter cadence exposed the old race).
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
            // The movement-ux ruling: the pair shows at EVERY pointer type and width —
            // the old hasTouch || width ≤ 767.98 law is retired (TOUCH_RAIL_MAX_WIDTH_PX
            // is gone), so the fine-pointer 767 read flipped from false here to true.
            const visible = true;
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
              for (const id of ['#title', '#lang-toggle']) {
                const r = rects(id);
                if (r !== null && inColumn(r)) above.push({ id, bottom: r.bottom, top: r.top });
              }
              const bandTop = Math.max(0, ...above.map((r) => r.bottom)) + 16;
              const stack = document.querySelector('#corner-stack');
              const titleEl = document.querySelector('#caption-title');
              if (stack === null || titleEl === null) return null;
              // Every displayed stack member but the entry title, in the flow or fixed (≥768).
              const members = Array.from(stack.children)
                .filter((el) => el !== titleEl && el.getClientRects().length > 0)
                .map((el) => {
                  const r = el.getBoundingClientRect();
                  const style = getComputedStyle(el);
                  return {
                    id: el.id,
                    fixed: style.position === 'fixed' || style.position === 'absolute',
                    inColumn: inColumn(r),
                    top: r.top,
                    height: r.height,
                    line: Number.parseFloat(style.lineHeight),
                  };
                });
              const stackBottom = stack.getBoundingClientRect().bottom;
              const gap = Number.parseFloat(getComputedStyle(stack).rowGap) || 0;
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
                bandTop,
                stackBottom,
                gap,
                members,
              };
            });
            if (probe === null) throw new Error('the rail geometry did not read');
            const SHIFT = (SHIFT_PCT / 100) * probe.clientWidth;
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
            // Row 2: back.left = max(24, safe-area-left) + SHIFT (±0.5) — the env() insets
            // resolve to 0 without viewport-fit=cover (§4's law note), so 24 + 7 % (R21-ux).
            expect(probe.a.x).toBeGreaterThanOrEqual(INSET + SHIFT - 0.5);
            expect(Math.abs(probe.rail.x - (INSET + SHIFT))).toBeLessThanOrEqual(0.5);
            // Row 3: clientWidth − fwd.right = max(24, safe-area-right) + SHIFT (±0.5, R21-ux).
            expect(
              Math.abs(probe.clientWidth - probe.b.x - probe.b.width - (INSET + SHIFT)),
            ).toBeLessThanOrEqual(0.5);
            // Row 4 (R19-ux A.1): the box stands on the reserved slot — its bottom edge at
            // touchRailSlotBottom over the live stack facts (±1), the door prompt counted at
            // LINES of its line box; the centre line = touchRailCenter(bandTop, slot, height).
            const slot = touchRailSlotBottom({
              stackBottom: probe.stackBottom,
              gap: probe.gap,
              inFlow: probe.members
                .filter((m) => !m.fixed)
                .map((m) => ({
                  height: m.height,
                  reserve: m.id === 'edge-prompt' ? LINES * m.line : 0,
                })),
              outOfFlowTops: probe.members.filter((m) => m.fixed && m.inColumn).map((m) => m.top),
            });
            expect(slot.overflow).toBe(false);
            const expected = touchRailCenter(probe.bandTop, slot.slotBottom, probe.rail.height);
            expect(expected.fits).toBe(true);
            expect(Math.abs(probe.centerVar - expected.center)).toBeLessThanOrEqual(1);
            const railBottom = probe.a.y + probe.a.height;
            expect(Math.abs(railBottom - slot.slotBottom)).toBeLessThanOrEqual(1);
            // Row 5: clearance ≥ 16 px to the chrome above in either column; below, every
            // displayed stack member but the title (in the flow, or fixed in a column) starts
            // ≥ one stack gap under the box, and in the flow the band between the box and
            // «Залы» still holds LINES door-prompt lines plus its two gaps.
            for (const block of probe.above) {
              expect(
                probe.a.y - block.bottom,
                `${block.id} above clearance`,
              ).toBeGreaterThanOrEqual(CLEAR - 0.5);
            }
            for (const m of probe.members.filter((x) => !x.fixed || x.inColumn)) {
              expect(m.top - railBottom, `${m.id} below clearance`).toBeGreaterThanOrEqual(
                probe.gap - 0.5,
              );
            }
            const base = probe.members.find((m) => m.id === 'index-open' && !m.fixed);
            const door = probe.members.find((m) => m.id === 'edge-prompt' && !m.fixed);
            if (base !== undefined && door !== undefined) {
              const band = base.top - probe.gap - LINES * door.line;
              expect(band - railBottom, 'reserved door band').toBeGreaterThanOrEqual(
                probe.gap - 0.5,
              );
            }
            // The face (R19-ux A): glyph arrows, the words as accessible names.
            await expect(button(p, -1)).toHaveText('↓');
            await expect(button(p, 1)).toHaveText('↑');
            await expect(button(p, -1)).toHaveAttribute(
              'aria-label',
              lang === 'ru' ? 'Назад' : 'Back',
            );
            // The face law (R21-ux): medium at 27 px is pinned, not eyeballed.
            const face = await button(p, 1).evaluate((el) => {
              const style = getComputedStyle(el);
              return { size: style.fontSize, weight: style.fontWeight };
            });
            expect(face).toEqual({ size: '27px', weight: '500' });
            // The face registers (R25-ux): the rail's own ink (.79, a step under the caption
            // title's .85) and the halo dimmed in step (.74). Pinned loosely: engines agree on
            // the alpha text, not on text-shadow's serialization order. The pin carries its own
            // clean state: the tab-order row of an EARLIER size iteration leaves the keyboard
            // focus on this very button (:focus-visible paints #fff), and focus survives
            // setViewportSize — release it before reading the register.
            await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            expect(await button(p, 1).evaluate((el) => getComputedStyle(el).color)).toBe(
              'rgba(255, 255, 255, 0.79)',
            );
            expect(await button(p, 1).evaluate((el) => getComputedStyle(el).textShadow)).toContain(
              'rgba(0, 0, 0, 0.74)',
            );
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

// Row 9 (R18-ux verdict 1 + D2): while busy, the geometry doesn't change. The walk needs
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
        // Mid-walk (the walk law's cruise still running): the box is where it was.
        await p.waitForTimeout(600);
        const mid = await read();
        for (const key of ['ax', 'ay', 'aw', 'bx', 'by', 'rx', 'ry', 'rw', 'rh'] as const) {
          expect(Math.abs(mid[key] - before[key]), `${key} mid-walk`).toBeLessThanOrEqual(0.5);
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

// The movement-ux desktop row (R14 re-driver): at a FINE pointer and 1280×720 the pair is
// visible (the ruling shows it at every pointer/width), a click moves one stop, and a HELD
// keyboard walk crosses the square's halfway stop by intent alone. The crossing read is
// the ACTUAL motion bit plus the nearest-stop row from ONE coherent snapshot: the nearest
// flip sits at k = 0.5 (S0 → Sh) and k = 1.5 (Sh → S1), so 'S1' as the NEAREST first reads
// only past the halfway stop — the held walk has crossed Sh exactly while the intent was
// still held (Sol R14). The lift ends the intent and the walk brakes into the next stop in
// its heading — the square's far boundary stop S1 — where the settle read pins the stop,
// the unchanged room and the EXACT stop-parameter string data-u === '1'. No fixed sleeps:
// the reads are motion- and position-based; the durations are never asserted.
test('desktop 1280×720 (fine pointer): the pair is visible, a click steps one stop, a held walk crosses the halfway stop and rests on data-u = 1', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 720 },
    hasTouch: false,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  try {
    const p = await context.newPage();
    await p.goto('/#/?at=2026-06-21T12:00:00Z&lang=en&hud=1');
    await roomReady(p);
    const rail = p.locator('#touch-rail');
    await expect(rail).toHaveAttribute('data-visible', 'true');
    // The pair answers clicks at the desk: a click = one press = one leg (the walk law's
    // lease ends → the brake lands at the next stop). Route-order arithmetic: the leg
    // can cross a room boundary (S1 → G0), so +1 on the route, not the per-room index.
    const before = routeIndex((await position(p)).stop);
    await button(p, 1).click();
    await settledRoute(p);
    const afterClick = routeIndex((await position(p)).stop);
    expect(afterClick).toBe(before + 1);
    // R14: the held walk — ONE press (a single down), then the coherent poll above: the
    // walk alive AND the nearest stop reading 'S1' inside a generous 30 s budget (the
    // budget bounds the crossing's wait, never the walk's own duration).
    await p.keyboard.down('ArrowRight');
    await expect
      .poll(
        async () => {
          const s = await snapshot(p);
          return s.moving === 'true' && s.stop === 'S1' ? 'crossed' : `${s.stop}|${s.moving}`;
        },
        {
          message: 'the held walk crossed into the S1 neighbourhood (the nearest flip at k = 1.5)',
          timeout: 30_000,
          intervals: [150, 300],
        },
      )
      .toBe('crossed');
    await p.keyboard.up('ArrowRight');
    // The lift ends the intent → the walk brakes into the next stop in its heading and
    // rests exactly there; the settle read polls the motion bit off, hold-ms idle.
    await expect
      .poll(
        async () => {
          const s = await snapshot(p);
          return s.moving === 'false' && s.holdMs === '0' ? 'rested' : 'in flight';
        },
        { message: 'the released walk rests', timeout: 60_000, intervals: [150, 300] },
      )
      .toBe('rested');
    const rest = await snapshot(p);
    expect(rest.stop, 'the hold rests at the square’s far boundary stop').toBe('S1');
    expect(rest.room, 'a hold never opens a door: the room is unchanged').toBe('square');
    // The exact landing: the settled rail parameter is the stop's own parameter — the
    // EXACT float string '1' (S1 = u 1 of the square's three stops).
    expect(await rail.getAttribute('data-u'), 'the exact stop parameter of S1').toBe('1');
  } finally {
    await context.close();
  }
});

// R16 (the assistive click's identity law): the tap's own synthesized click is consumed
// ONCE by the activation latch; an assistive click made AFTER the tap is an independent
// activation and must move the rail again. The walk law's lease carries each activation's
// one leg: the tap rests exactly one stop on (never a double-jump off the tap's own
// click), and the evaluated click carries the rail one more. Runs under the walk law —
// cuts know no walks, and a reduced tap's dwell would lawfully drop the click.
test('an assistive click after a tap moves again', async ({ browser, baseURL }) => {
  test.setTimeout(240_000); // two lease-walks + settle reads under the box's stall storms (the index-dialog precedent's class)
  await run(
    browser,
    baseURL,
    async (p) => {
      const settled = async (): Promise<string> => {
        const s = await snapshot(p);
        return s.moving === 'false' && s.holdMs === '0' ? `${s.room}|${s.stop}` : 'in flight';
      };
      // The tap: one activation = ONE leg (the lease drains from its press) — the rest is
      // exactly one stop on, no jump further: the tap's synthesized click moves nothing.
      await rawTap(p, 1);
      await expect
        .poll(settled, { message: 'the tapped walk rests', timeout: 90_000, intervals: [150, 400] })
        .toBe('square|Sh');
      const afterTap = await snapshot(p);
      expect(routeIndex(afterTap.stop), 'the tap moved exactly one stop').toBe(
        routeIndex('S0') + 1,
      );
      assertStopLanding(afterTap, 'the rest is on the stop’s own parameter');
      // NOW the assistive click on the SAME button: the tap's own click was consumed by
      // the identity latch, so this one passes as an independent activation — one leg more.
      await p.locator('#touch-forward').evaluate((el) => (el as HTMLButtonElement).click());
      await expect
        .poll(settled, {
          message: 'the clicked walk rests',
          timeout: 90_000,
          intervals: [150, 400],
        })
        .toBe('square|S1');
      const afterClick = await snapshot(p);
      expect(routeIndex(afterClick.stop), 'the assistive click moved the rail again').toBe(
        routeIndex('S0') + 2,
      );
      assertStopLanding(afterClick, 'the rest is on the stop’s own parameter');
    },
    { reducedMotion: 'no-preference' },
  );
});

// R16 (the OWNED release law, R11/R15): a foreign source pressing the SAME direction on
// top of the button's walk cannot end it — releases match owners (the walk keeps running
// while ANY owner of the direction still holds). The data-moving bit stays 'true' at the
// key lift and ≥ 700 ms past it; only the BUTTON's own pointer lift ends the claim, and
// the walk then brakes into the next stop in its heading — resting exactly ON a stop,
// never mid-segment. Runs under the walk law (the moving bit reads walks, never cuts).
test('a foreign key lift cannot end a button’s walk', async ({ browser, baseURL }) => {
  // R11/R15 evidence on a LONG rail: the button's claim survives the SAME-direction key's
  // press+lift; the release-matching is owner-scoped. Boot the military gallery (five stops,
  // a corner) — the square's 2-s legs would eat the interleaving window (the row's first
  // draft died exactly there: the walk reached the hard end before the key insertion).
  test.setTimeout(240_000);
  await run(
    browser,
    baseURL,
    async (p) => {
      await p.goto(
        `${baseURL ?? 'http://127.0.0.1:4173'}/#/1812?at=2026-06-21T12:00:00Z&lang=ru&hud=1`,
      );
      await roomReady(p);
      const b = button(p, 1);
      await b.tap();
      // The young-walk gate: one coherent read proves the walk is alive, then the foreign key
      // inserts at once (the walk has ~6 s of runway across M1..M3's held corner re-departs).
      await expect
        .poll(
          async () => {
            const s = await snapshot(p);
            return s.moving === 'true' && (s.u ?? 1) < 0.3 ? 'young' : 'old';
          },
          { timeout: 20_000, intervals: [50, 120] },
        )
        .toBe('young');
      await p.keyboard.press('ArrowRight'); // the SAME direction, ANOTHER source, down+up
      const lifted = await snapshot(p);
      expect(lifted.moving, 'the walk runs on across the foreign lift').toBe('true');
      await p.waitForTimeout(700);
      expect((await snapshot(p)).moving, 'still moving ≥ 700 ms after the lift').toBe('true');
      await p.mouse.up(); // OWN the button's pointer lift — the intent ends NOW (the hold law)
      await settledRoute(p);
      const rest = await snapshot(p);
      // The rest is the walk's NEXT stop boundary (never mid-segment, never past the end).
      expect(rest.moving).toBe('false');
      expect(
        [0, 0.25, 0.5, 0.75, 1],
        'the rest sits exactly on a stop parameter of five',
      ).toContain(rest.u);
      expect(rest.room).toBe('military-gallery');
    },
    { reducedMotion: 'no-preference' },
  );
});

// R15 (the window-loss law): a window blur lifts EVERY owner — the pair's held walk meets
// its release edge, brakes into its own next stop and rests INSIDE the square (a stop
// parameter — no airlock), and the pair re-arms: a fresh press on the button starts a NEW
// walk. Runs under the walk law (the moving bit reads walks, never cuts).
test('a window blur ends a held walk and re-arms the pair', async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  await run(
    browser,
    baseURL,
    async (p) => {
      const centre = async (): Promise<{ x: number; y: number }> => {
        const box = await button(p, 1).boundingBox();
        expect(box).not.toBeNull();
        if (box === null) throw new Error('the rail button is not rendered');
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      const { x, y } = await centre();
      await p.mouse.move(x, y);
      await p.mouse.down();
      // The blur must catch the walk INSIDE the square's first segment — the gate reads
      // the walk's birth rows (u < 0.25 → the release's rest lands the NEXT stop Sh,
      // never the far boundary S1, where the re-press would lawfully fire the airlock
      // instead). Polls only — no sleeps.
      await expect
        .poll(
          async () => {
            const s = await snapshot(p);
            return s.moving === 'true' && s.u !== null && s.u < 0.25
              ? 'young'
              : `${s.moving}|u ${s.u}`;
          },
          { message: 'the held walk is alive and young', timeout: 45_000, intervals: [100, 300] },
        )
        .toBe('young');
      // The window loss: the host's blur handler lifts every owner (R15's cancel-all).
      await p.evaluate(() => window.dispatchEvent(new Event('blur')));
      await expect
        .poll(async () => (await snapshot(p)).moving, {
          message: 'the blur ended the held walk',
          timeout: 60_000,
          intervals: [100, 300],
        })
        .toBe('false');
      // The ended walk rested inside its own room: the release braked the walk to its own
      // next stop (a stop parameter — no runaway, no frozen mid-segment state, no airlock).
      const aftermath = await snapshot(p);
      assertStopLanding(aftermath, 'the walk rests inside its segment — at its own next stop');
      expect(aftermath.room, 'the blur’s release crossed no door').toBe('square');
      // The pair re-arms: the physical lift first (a real press transition — the app's own
      // activation is already gone by the blur; the stray synthesized click is consumed by
      // the identity latch), then a fresh press starts a NEW walk.
      await p.mouse.up();
      await p.mouse.down();
      await expect
        .poll(async () => (await snapshot(p)).moving, {
          message: 'the re-armed walk is alive',
          timeout: 45_000,
          intervals: [100, 300],
        })
        .toBe('true');
      await p.mouse.up();
      await expect
        .poll(async () => (await snapshot(p)).moving, {
          message: 'the re-armed walk ends with its own lift',
          timeout: 60_000,
          intervals: [100, 300],
        })
        .toBe('false');
      const again = await snapshot(p);
      assertStopLanding(again, 'the re-armed walk rests at a stop boundary too');
      expect(again.room, 'the re-armed walk’s rest crossed no door').toBe('square');
    },
    { reducedMotion: 'no-preference' },
  );
});

// R10 (the season list owns the arrows): while the listbox is open the rail's arrow funnel
// admits nothing (the ONE admission law's menu membership) — the arrows may steer the
// LIST itself (desired), but the rail's position must stand still. After the menu closes,
// the same keys drive the walk law again: one press = one step (the cut branch under this
// context's reduced motion — the seed law: a cut under reduced motion, the walk under it).
test('the season list owns the arrows', async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  await run(
    browser,
    baseURL,
    async (p) => {
      // The season spec's idiom: the toggle opens the in-page listbox.
      const before = await snapshot(p);
      if (before.u === null) throw new Error('data-u row missing');
      await p.locator('#season').tap();
      await expect(p.locator('#season-list')).toBeVisible({ timeout: 45_000 });
      // The arrows may navigate the list itself while open — the assertion is ONLY the rail:
      // the coherent snapshot's stop and u stand still across the press.
      await p.keyboard.press('ArrowRight');
      const held = await snapshot(p);
      expect(held.stop, 'the rail stood still while the list owns the arrows').toBe(before.stop);
      expect(held.u, 'the rail stood still while the list owns the arrows').toBe(before.u);
      expect(held.room, 'the rail stood still while the list owns the arrows').toBe(before.room);
      // Close, and the walk law works again. The close rides the toggle's OWN click law
      // (open ⇄ close); Escape's refocus behavior is the menu's own concern — this row tests
      // the RAIL's gating, not the menu's close law. The resume asserts the RAIL MOVED once
      // the menu closed — through the pair (the arrows' own UI), the probe-proven path; the
      // keys' blocking law already rode press #1 above.
      await p.locator('#season').tap();
      await expect(p.locator('#season-list')).toBeHidden({ timeout: 45_000 });
      await button(p, 1).tap();
      // The settle bit, not the nearest-STOP label: the label flips to the target while the
      // walk is still braking toward it (the nearest-window class the R13 helper exists for).
      await settledRoute(p);
      const atSh = await snapshot(p);
      expect(atSh.stop, 'the first resume tap rests on Sh').toBe('Sh');
      expect(atSh.u, 'the first resume tap rests on Sh’s own parameter').toBe(0.5);
      expect(atSh.room, 'the first tap stayed inside the square').toBe('square');
      await button(p, 1).tap();
      await settledRoute(p);
      const after = await snapshot(p);
      expect(after.stop, 'the second tap rests on S1').toBe('S1');
      expect(after.u, 'the second tap rests on S1’s own parameter').toBe(1);
      expect(after.room, 'the taps stayed inside the square').toBe('square');
    },
    { reducedMotion: 'no-preference' },
  );
});
