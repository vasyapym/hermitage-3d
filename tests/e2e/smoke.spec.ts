import { test as base, expect, type Locator, type Page } from '@playwright/test';

// Budgets are CI-enforced contracts (docs/architecture.md, Tiers/budget table):
// "Draw calls, any frame | ≤ 250 | HUD + Playwright assertion"
// "Triangles in frustum (T1) | ≤ 1.0 M | same"
// Fixed by art/tier, never by loosening these numbers.
const MAX_DRAW_CALLS = 250;
const MAX_TRIANGLES = 1_000_000;

// Hang detectors for software GL, NOT the ≤ 3 s first-frame device budget (that one is gated on
// the reference Mac per phase; no CI run on SwiftShader can honestly measure it).
const FIRST_FRAME_TIMEOUT_MS = 15_000;
const SETTLE_TIMEOUT_MS = 45_000;

// Host binds the HUD at most every 500 ms after the whole-frame render; one positive rAF delta is
// enough for data-frame-ms to leave "0".
const HUD_BIND_TIMEOUT_MS = 10_000;

// data-frame-ms is "0" until a positive delta exists, then a wall-clock value with two decimals.
// Only the non-zero gate is asserted; the value itself is never compared.
const POSITIVE_FRAME_MS = /^(?!0(?:\.0+)?$)\d+(?:\.\d+)?$/;
const PLAIN_INTEGER = /^\d+$/;

const AT = 'at=2026-06-21T12:00:00Z';

// R4 (design-gallery §4.6, D-22): the 1812 baked contract the smoke asserts — the served
// manifest carries the three states and the six lm rows: the arch chart on the core path law
// (lm/<file>.ktx2) and the kit chart beside it (lm/kit-<file>.ktx2, DEC-027).
const MANIFEST_1812 = '/assets/military-gallery/manifest.json';
const LM_ROWS_1812 = [
  'lm/day.ktx2',
  'lm/dusk.ktx2',
  'lm/night.ktx2',
  'lm/kit-day.ktx2',
  'lm/kit-dusk.ktx2',
  'lm/kit-night.ktx2',
] as const;
type ManifestShape = Readonly<{
  lightmaps: Readonly<{ states: readonly string[] }>;
  files: readonly Readonly<{ path: string; kind: string }>[];
}>;

// Devlog contract: clean console. pageerror and console.error fail the test; console.warn is
// legal diagnostics. Auto fixture so both tests get it without ceremony; asserted on teardown so
// the collected messages survive an earlier timeout in the test body.
const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      await use(errors);
      expect(errors, 'clean console (devlog contract)').toEqual([]);
    },
    { auto: true },
  ],
});

async function readInteger(hud: Locator, name: string): Promise<number> {
  const text = await hud.getAttribute(name);
  if (text === null) {
    throw new Error(`#hud is missing ${name}`);
  }
  expect(text, `${name} is a plain ungrouped integer`).toMatch(PLAIN_INTEGER);
  return Number.parseInt(text, 10);
}

async function bootDeterministic(page: Page, query: string): Promise<Locator> {
  await page.goto(`/#/?${query}`);
  // "title" beat: the header becomes visible before massing/settled.
  await expect(page.locator('#title')).toBeVisible({ timeout: FIRST_FRAME_TIMEOUT_MS });
  // "settled": #scrub (range input) loses `hidden` exactly when the arrival FSM settles.
  await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-frame-ms', POSITIVE_FRAME_MS, {
    timeout: HUD_BIND_TIMEOUT_MS,
  });
  return hud;
}

async function expectWithinBudgets(hud: Locator): Promise<void> {
  // All four data-* come from one buildHudAttrs call, so once data-frame-ms is non-zero the
  // draw/triangle numbers describe a real whole-frame render (including the shadow pass).
  // The budget is "any frame", so whichever frame was bound must hold the ceiling.
  const draws = await readInteger(hud, 'data-draws');
  const tris = await readInteger(hud, 'data-tris');
  expect(draws, 'frame rendered something').toBeGreaterThan(0);
  expect(draws, 'draw calls, any frame').toBeLessThanOrEqual(MAX_DRAW_CALLS);
  expect(tris, 'frame rendered something').toBeGreaterThan(0);
  expect(tris, 'triangles in frustum').toBeLessThanOrEqual(MAX_TRIANGLES);
}

test('deterministic T1 boot settles within budget', async ({ page }) => {
  // Fresh context: no persisted tier, no ?q → det skips the probe and boots T1.
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&lang=en`);
  await expect(hud).toHaveAttribute('data-tier', 'T1 · default');
  await expectWithinBudgets(hud);
});

test('deterministic T0 boot settles within budget', async ({ page }) => {
  // The floor tier must also hold the ceiling numbers.
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&q=t0&lang=en`);
  await expect(hud).toHaveAttribute('data-tier', 'T0 · low');
  await expectWithinBudgets(hud);
});

// DEC-033 winter: at a plateau instant (wSnow === 1) the cornice cap is visible and the kit's
// facade-surface slot is live — +1 draw call, +≤1,000 triangles — and the frame still holds the
// architecture caps. The summer identity is fenced by the unchanged June goldens, not here.
test('winter: the cornice cap renders within budgets', async ({ page }) => {
  const hud = await bootDeterministic(page, 'at=2026-12-21T12:00:00Z&det=1&hud=1&lang=en');
  await expectWithinBudgets(hud);
});

// §8.3 layer 3: the smoke walks the phase-2 graph (transits driven directly in-test — the
// hash is the r16 input surface; rail-driven walking is asserted in r18) and asserts the
// HUD metadata ledger rows return to their boot values with a clean console. Smoke asserts
// contracts, never cadence: attribute waits are generous (holds dwell until data is ready),
// no frame timing is compared.
test('smoke walk: the graph returns the ledger to boot values', async ({ page }) => {
  test.slow(); // four transits on a starved page: the load dwell is data-bound, not timed
  const query = `${AT}&det=1&hud=1&lang=en`;
  const hud = await bootDeterministic(page, query);
  // Boot posture: the resident owns the row, nothing registered, no hold.
  await expect(hud).toHaveAttribute('data-room', 'square');
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0');
  await expect(hud).toHaveAttribute('data-hold-ms', '0');
  const nav = (path: string): Promise<void> =>
    page.evaluate((hash) => {
      location.hash = hash;
    }, `#${path}?${query}`);

  // #/ → gallery: a cold entry (from = null); the room registers its payload in load.
  await nav('/gallery');
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  await expect(hud).not.toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  // §8.4/§1.2 + §4 (DEC-017 rewritten): the black card carries the destination's room title
  // above the seed-stop caption — the cold entry's card-first shape, now titled. The sticky
  // data-shown breadcrumb catches the card no matter how short its window is (a staged
  // room's card lives exactly holdMs — CI polls at ~500 ms and can miss the whole window).
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Rastrelli Gallery — the way in',
    { timeout: 60_000 },
  );
  // §8.4/§1.2: the dwell shows the destination's seed-stop caption and hands over to the
  // rest frame on the same stop — the dark card never flashes a second text.
  await expect(page.locator('#caption')).toHaveText('dark; the square behind', { timeout: 60_000 });

  // gallery → jordan: the heaviest room must render within the whole-frame budgets.
  await nav('/jordan');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  // The transit's card titled the destination — the sticky breadcrumb proves the shape.
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Jordan Staircase — the ascent',
    { timeout: 60_000 },
  );
  await expectWithinBudgets(hud);

  // Re-target DURING the open transit: the queued chain still ends where the URL says,
  // and the departing room always disposes first (§2.4) — this leg exercises that path.
  await nav('/gallery');
  await nav('/');
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
});

test('arrow walk: the prompt click and a fresh ArrowRight at a settled end enter both airlocks', async ({
  page,
}) => {
  // The movement-ux ruling (DEC-031 amended) retired the wheel: the two roads that reach
  // the same beginTransitTo call the arrows use are the chrome prompt's click (road 1)
  // and a fresh ArrowRight press made at a settled rail end (road 2). Fresh page: a
  // mounted room keeps its technique (the round-17 measurement trap).
  test.slow();
  const query = `${AT}&det=1&hud=1&lang=en`;
  const hud = await bootDeterministic(page, query);
  await expectWithinBudgets(hud);
  const edgePrompt = page.locator('#edge-prompt');
  // Mid-room at the start: the prompt is hidden (the UI-nearly-absent law).
  await expect(edgePrompt).toHaveAttribute('data-visible', 'false');
  type HudSample = Readonly<{
    stop: string | null;
    holdMs: string | null;
    room: string | null;
    moving: string | null; // #touch-rail[data-moving]: the walk's ACTUAL motion bit (R13)
    u: number | null; // #touch-rail[data-u]: the rail parameter, parsed
  }>;
  // ONE page task reads all five rows across BOTH elements: the sample is one write pass,
  // never a mix of two reads a tick apart (the HUD and the rail rows ride their own ≤500 ms
  // bind cadences, so only the single-task read is coherent).
  const sampleHud = (): Promise<HudSample> =>
    hud.evaluate((el) => {
      const rail = document.querySelector('#touch-rail');
      const uRow = rail?.getAttribute('data-u') ?? null;
      return {
        stop: el.getAttribute('data-stop'),
        holdMs: el.getAttribute('data-hold-ms'),
        room: el.getAttribute('data-room'),
        moving: rail?.getAttribute('data-moving') ?? null,
        u: uRow === null || uRow === '' ? null : Number.parseFloat(uRow),
      };
    });
  const sampleKey = (s: HudSample): string => `${s.stop} | hold ${s.holdMs}`;
  // One press per leg; the walk settles at the NEXT stop (the walk law's ≈2060 ms leg —
  // never asserted). The settle read is a two-sample stable poll, each sample ONE coherent
  // task over both elements: the ACTUAL motion bit (data-moving) says a walk is in flight,
  // so a walk passing THROUGH the destination's nearest reading mid-flight can never be
  // mistaken for a landing (mid-walk presses lawfully extend the walk — never a retarget —
  // so a coalesced read still lands where the legs aimed).
  const legTo = async (stop: string): Promise<void> => {
    await page.keyboard.press('ArrowRight'); // the leg's only press
    await expect
      .poll(
        async () => {
          const first = await sampleHud();
          if (first.moving !== 'false' || first.holdMs !== '0') return 'in flight';
          await page.waitForTimeout(700);
          const second = await sampleHud();
          return second.moving === 'false' &&
            second.holdMs === '0' &&
            second.stop === first.stop &&
            second.stop === stop
            ? sampleKey(second)
            : `moving ${sampleKey(first)} → ${sampleKey(second)}`;
        },
        {
          message: `leg: a stable coherent sample at ${stop}`,
          timeout: 90_000,
          intervals: [400, 800],
        },
      )
      .toBe(`${stop} | hold 0`);
  };
  // The square's four gap legs to its far end S1 (R18-ux D1's halfway rhythm; the
  // 2026-11-12/13 stops round's quarter-point inserts: S0 → S0b → Sh → Shb → S1); the walk
  // rests there and the edge prompt appears.
  for (const stop of ['S0b', 'Sh', 'Shb', 'S1']) await legTo(stop);
  await expect(edgePrompt).toHaveAttribute('data-visible', 'true', { timeout: 30_000 });
  // The label names the room through the door (§2/D1): verb + ' · ' + the room's NAME.
  await expect(edgePrompt).toHaveText('Enter · Rastrelli Gallery', { timeout: 30_000 });
  // Road 1 — the prompt: the click travels the same boundary step the arrows use.
  await edgePrompt.click();
  // The threshold beat (§4, DEC-017 rewritten): the black card shows the destination's room
  // title (the words the door label will click), then empties with the first lit frame.
  // The sticky data-shown breadcrumb (the CI poll-cadence lesson) catches the short window.
  const captionTitle = page.locator('#caption-title');
  await expect(captionTitle).toHaveAttribute('data-shown', 'Rastrelli Gallery — the way in', {
    timeout: 60_000,
  });
  await expect(captionTitle).toHaveAttribute('data-visible', 'false', { timeout: 60_000 });
  // The URL is the state: the swap rewrites the hash to the room's route (DEC-031).
  await expect(page).toHaveURL(/#\/gallery/, { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  // The swap is only proven by the hold returning to zero at the NEW room (the dwell
  // caption shows DURING the hold — it names the destination, not the arrival).
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expectWithinBudgets(hud);
  // The entry stop's first settled frame shows the caption only (§9): the door label waits
  // for a backward push, and a forward press at a mid-room settle walks one gap instead.
  await expect(edgePrompt).toHaveAttribute('data-visible', 'false');
  // The gallery's five gap legs to its far end G2 (G0 → Gj → Gjb → G1 → G1b → G2; the
  // 2026-11-12/13 stops round's axis inserts): the walk law brakes into the corner stop Gj
  // (hard for the walk), re-departs live, then rests at G2.
  for (const stop of ['Gj', 'Gjb', 'G1', 'G1b', 'G2']) await legTo(stop);
  await expect(edgePrompt).toHaveAttribute('data-visible', 'true', { timeout: 30_000 });
  await expect(edgePrompt).toHaveText('Enter · Jordan Staircase', { timeout: 30_000 });
  // Road 2 — the fresh ArrowRight at the settled end: the same boundary chain the arrows
  // always used; no sustained gesture exists anymore.
  await page.keyboard.press('ArrowRight');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expect(page).toHaveURL(/#\/jordan/, { timeout: 60_000 });
  await expectWithinBudgets(hud);
  // Home by URL (the smoke's own law): the ledger returns to boot values. The room's
  // own rewrites mean the boot hash now DIFFERS from the address bar (the URL-is-the-
  // state law), so this assignment is a real hashchange → the transit home by the chain.
  await page.evaluate((hash) => {
    location.hash = hash;
  }, `#/?${query}`);
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
});

// r18 gate (§6.1, §10): every stop of the phase is reachable by keyboard — arrows step
// stop→stop and a boundary intent past an end stop IS the keyboard's airlock — and
// reduced motion moves by CUTS (the seed law: a cut under reduced motion, the walk under
// it). Reduced motion is emulated BEFORE boot (the host reads matchMedia once); cuts make
// the movement instant. The room flips and the hold rows carry the assertions; per-stop
// captions surface in r18b. Fresh page: a mounted room keeps its technique (no reload
// between configurations — the round-17 measurement trap).
test('keyboard walk: every stop reachable, reduced-motion cuts', async ({ page }) => {
  test.slow(); // same data-bound dwell per transit, on top of the instant reduced-motion cuts
  // The R3 walk crosses TWO extra airlocks (the 1812 cut and its reverse) and walks 38 landings:
  // every room entry is a full mount behind the card. ~8 min is the honest data-bound budget on a
  // healthy box; the r73 stall-storm class realized 10.3 m, so 900 s keeps ×1.4 headroom.
  test.setTimeout(900_000); // the walk spans ~38 legs; a stall-storm run reaches 10.2 m against the r73 600-s cap — 900 s keeps ×1.4 headroom (the index-dialog precedent's class)
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hud = await bootDeterministic(page, `${AT}&det=1&hud=1&lang=en`);
  // One accepted press per landing. The keydown handler drops any press while the arrival is
  // unsettled or a transit is open (railInputReady: §2.4, the airlock owns the camera), and
  // nothing retries a dropped press. Under Playwright 1.64.1 an error thrown inside an
  // expect.poll callback ends that poll at once, so a nested press-and-poll gives no second
  // press. A leg is therefore complete, and the next press permitted, only on ONE coherent
  // snapshot that shows the expected data-stop AND data-hold-ms "0" AND the walk's ACTUAL
  // motion bit unset (#touch-rail[data-moving], R13 — data-stop alone can read a walk's
  // mid-flight pass-through, hold-ms reads 0 for every walk-free instant). "Coherent" means
  // all five rows — the HUD's three AND the rail's two — are read in one page task: the two
  // element groups ride their own bind cadences, so only the single-task read refuses a mix.
  // data-stop alone is not readiness: a cut's swap seeds the destination stop mid-card while
  // the transit still owns the camera (the backward landing-airlock entry reports J4 with the
  // card open). data-hold-ms is not a "was non-zero" signal either: hudHoldMs reports the
  // transit's holdMs for EVERY non-idle phase, exit included (the landing airlock's cut card
  // reads 600 through its whole dwell), and "0" only when no transit is open. A short transit
  // may never publish a non-zero sample, so none is awaited. The HUD binds at most every
  // 500 ms, so a (stop, "0") sample can lag readiness but never lead it.
  // The caption binds the destination from the card phase on (dwellStop). It is asserted on
  // every landing (§10 r18 gate) but is never readiness evidence.
  const caption = page.locator('#caption');
  // The §6.1 caption beats, verbatim from the committed stop data (rooms/*/contract.ts;
  // R-UX5 §7/§8 stop authoring: Gj, J1b, J2b new; J2, J3 re-authored; the 2026-11-12/13
  // stops round adds S0b, Shb, Gjb, G1b).
  const BEATS: Readonly<Record<string, string>> = {
    S0: 'the facade and the hour',
    S0b: 'the monolith', // the 2026-11-12/13 stops round: the Column's own frame
    Sh: 'past the column', // the winter-square round: the close pass gets its own caption
    Shb: 'the arch ahead',
    S1: 'the arch opens',
    G0: 'dark; the square behind',
    Gj: 'The turn east: pilaster after pilaster, forty metres to the far door.',
    Gjb: 'the vault leads on',
    G1: 'compression',
    G1b: 'the door nears',
    G2: 'the door (airlock)',
    J0: 'looking up into light',
    J1: 'the flight',
    J1b: 'The upper flight\u2019s sconce shows across the well: Rastrelli lights the turn in advance.',
    J2: 'The landing: the stair divides; the flights meet again beneath the painted ceiling.',
    J2b: 'The upper tier of windows: the Neva light enters high and carries the last flight.',
    J3: 'Near the top the eastern portal comes square to the eye: the doorway to the state rooms, framed in gilt between columns of grey granite.',
    J4: 'arrival; the portal (landing airlock)',
    // R3 (DEC-025): the five 1812 landings join the walk — the EN corpus verbatim.
    M0: 'The threshold: the long view south, to the portraits of the heroes of 1812.',
    M1: 'The west wall — a block of portraits in gilt frames.',
    M2: 'The lantern — the vault and the glazing bars above the gallery.',
    M3: 'The monarchs — the end wall, the large portraits above the small.',
    M4: 'The doors are closed; beyond them — St George’s Hall.',
  };
  // A leg spans the data-bound load + mount behind the card (seconds on a starved page; the
  // backward entries re-mount, since the exit disposes the room left), the card's hold, one
  // exit frame and up to one 500 ms HUD bind. 180 s: the R16.2 storm-day finding — a leg can
  // burn 60–90 s inside Playwright's own click/stability retries on GL-readback stalls (the
  // 2-core reference device under any load); 90 s starved ONE leg (G1→Gj) into a flake.
  const LEG_TIMEOUT_MS = 180_000;
  const IDLE_HOLD = '0';
  type HudSample = Readonly<{
    stop: string | null;
    holdMs: string | null;
    room: string | null;
    moving: string | null; // #touch-rail[data-moving]: the walk's ACTUAL motion bit (R13)
    u: number | null; // #touch-rail[data-u]: the rail parameter, parsed
  }>;
  // ONE page task reads all five rows across BOTH elements: the sample is one write pass,
  // never a mix of two reads a tick apart (the HUD and the rail rows ride their own ≤500 ms
  // bind cadences, so only the single-task read is coherent).
  const sampleHud = (): Promise<HudSample> =>
    hud.evaluate((el) => {
      const rail = document.querySelector('#touch-rail');
      const uRow = rail?.getAttribute('data-u') ?? null;
      return {
        stop: el.getAttribute('data-stop'),
        holdMs: el.getAttribute('data-hold-ms'),
        room: el.getAttribute('data-room'),
        moving: rail?.getAttribute('data-moving') ?? null,
        u: uRow === null || uRow === '' ? null : Number.parseFloat(uRow),
      };
    });
  const sampleKey = (s: HudSample): string =>
    `${s.stop} | hold ${s.holdMs} | ${s.moving === 'true' ? 'moving' : s.moving === null ? 'no moving row' : 'still'}`;
  // The settle target: the stop, the idle hold and the WALK OFF — in the same snapshot
  // (R13's ready read: hold 0 under a walk reads transit-free, so the bit is the discriminator).
  const readyKey = (stop: string): string => `${stop} | hold ${IDLE_HOLD} | still`;
  // The walk starts from a ready S0. The arrival-settle half of the gate is bootDeterministic's
  // own contract; data-hold-ms does not encode the arrival phase.
  await expect
    .poll(async () => sampleKey(await sampleHud()), {
      message: 'boot: a coherent ready sample at S0',
      timeout: HUD_BIND_TIMEOUT_MS,
      intervals: [100, 250],
    })
    .toBe(readyKey('S0'));
  let at = 'S0';
  const walkTo = async (stop: string, key = 'ArrowRight'): Promise<void> => {
    const from = at;
    const beat = BEATS[stop];
    if (beat === undefined) throw new Error(`no committed beat for stop ${stop}`);
    // The reduced-motion dwell (REDUCED_DWELL_MS 600) drains inside advance() per rendered
    // frame, each frame clamped at ≤100 ms of state time (the loop's Math.min(deltaMs, 100)):
    // the drain takes SIX RENDERED FRAMES at any box speed (≈0.1 s at 60 fps, ≈6 s at the
    // CI's ~1 fps). No DOM bit exposes dwellMs, and the press path does not pre-advance by
    // wall time — so the press waits out SEVEN rAF frames (the drain's own driver, counted
    // directly: 7 × ≤100 ms ≥ 600 ms of state time, guaranteed at any fps). The removed
    // pre-press read chain used to spend ~1.3 s per CI read and cleared the dwell by
    // accident — the recorded CI deaths moved between runs on exactly this race.
    for (let frame = 0; frame < 7; frame += 1) {
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
      );
    }
    // The press waits for the pair's OWN pressability bit before firing: aria-disabled
    // 'false' on the direction's button mirrors touchAdmitted (§5) — arrival settled,
    // transit-free, gesture- and menu-free — which the five-row snapshot cannot see
    // (data-hold-ms reads 0 through the arrival phase; the arrival beats own the
    // pre-settle frames). The bit replaces the old read-chain accident with evidence
    // and costs one attribute read, not a five-row sample. The keyboard drop gate
    // (§2.4 railInputReady) keys on the same settled+transit facts, so a 'false' bit
    // is the honest green light.
    const dirButton = key === 'ArrowLeft' ? '#touch-back' : '#touch-forward';
    await expect
      .poll(async () => page.locator(dirButton).getAttribute('aria-disabled'), {
        message: `leg ${from} → ${stop}: the pair admits the press`,
        timeout: LEG_TIMEOUT_MS,
        intervals: [100, 250],
      })
      .toBe('false');
    await page.keyboard.press(key); // the leg's ONLY press: no retry, by contract
    await expect
      .poll(
        async () => {
          const s = await sampleHud();
          // The ready read is the walk's motion bit in THIS snapshot: a walk in flight is
          // never a ready read — even at the destination's nearest reading (R13).
          if (s.moving !== 'false') return sampleKey(s);
          // An idle sample on any third stop is a wrong landing, never lag: fail at once.
          if (s.holdMs === IDLE_HOLD && s.stop !== from && s.stop !== stop) {
            throw new Error(`leg ${from} → ${stop}: one press settled on ${s.stop}`);
          }
          return sampleKey(s);
        },
        {
          message: `leg ${from} → ${stop}: one coherent snapshot with the walk over (the stop, hold 0, the motion bit false)`,
          timeout: LEG_TIMEOUT_MS,
          intervals: [100, 250],
        },
      )
      .toBe(readyKey(stop));
    at = stop;
    // Every landing shows that stop's beat (the caption doubles as the description). This
    // is asserted after readiness and is not part of it.
    await expect(caption).toHaveAttribute('data-stop', stop, { timeout: 60_000 });
    await expect(caption).toHaveText(beat, { timeout: 60_000 });
  };
  // Forward: S0 → S0b → Sh → Shb → S1 (R18-ux D1's halfway rhythm; the 2026-11-12/13 stops
  // round's quarter-point inserts), the arch-portal boundary, G0 → Gj → Gjb → G1 → G1b → G2,
  // the gallery-airlock boundary, J0 → J1b → J2b → J4 — every stop of the phase observed
  // landed.
  for (const stop of [
    'S0b',
    'Sh',
    'Shb',
    'S1',
    'G0',
    'Gj',
    'Gjb',
    'G1',
    'G1b',
    'G2',
    'J0',
    'J1',
    'J1b',
    'J2',
    'J2b',
    'J3',
    'J4',
  ]) {
    await walkTo(stop);
  }
  // The live region names the stop (§1.2) and tracks the walk's landings.
  await expect(page.locator('#caption-live')).toHaveText(
    'J4 · arrival; the portal (landing airlock)',
  );
  // DEC-025: the landing's far end is no longer inert — the same forward press crosses the
  // retargeted airlock into the 1812 room (a cut: the card, then the M0 seed), and the walk
  // lands M0–M4 the same way it landed the phase-2 stops.
  for (const stop of ['M0', 'M1', 'M2', 'M3', 'M4']) {
    await walkTo(stop);
  }
  // The route's end (M4, the closed doors) is the new inert end: a press past it, made in
  // the ready state the M4 landing poll proved (no fresh pre-press read — the same
  // redundant-double-read rule as the legs' presses), changes nothing. The room's only
  // airlock side sits at M0, the entry stop (§1.1's chain end). After the re-check window,
  // one coherent sample shows the stop, the room and an idle hold: no transit opened.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2000);
  expect(await sampleHud(), 'inert end: the press past M4 opened nothing').toEqual({
    stop: 'M4',
    holdMs: IDLE_HOLD,
    room: 'military-gallery',
    moving: 'false', // the motion bit: nothing walks after a press that admitted nothing
    u: 1, // M4 is the gallery's last of five stops: its exact stop parameter
  });
  // Backward: the whole way home through both airlocks — M0's backward push is the landing
  // airlock's reverse (the cut back to jordan), and the backward entries seed the far stop
  // (J4, then G2, then S1) so the direction of travel is preserved (§6.1 seed law).
  for (const stop of [
    'M3',
    'M2',
    'M1',
    'M0',
    'J4',
    'J3',
    'J2b',
    'J2',
    'J1b',
    'J1',
    'J0',
    'G2',
    'G1b',
    'G1',
    'Gjb',
    'Gj',
    'G0',
    'S1',
    'Shb', // the 2026-11-12/13 stops round: the backward square walk passes both inserts home
    'Sh', // R18-ux D1: the backward square walk passes the halfway stop home
    'S0b',
    'S0',
  ]) {
    await walkTo(stop, 'ArrowLeft');
  }
  await expect(page.locator('#caption-live')).toHaveText('S0 · the facade and the hour');
  await expect(hud).toHaveAttribute('data-room', 'square');
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
});

// R3 (design-gallery.md §7.3; DEC-025/029): the new edge both ways + the two cold deep-link
// starts, the ledger back at boot every time. The card carries the destination's room title —
// the full sentence, the compression note riding it as the second clause (DEC-025); the
// arrival captions are the EN corpus. Smoke asserts contracts, never cadence.
test('smoke walk: the 1812 edge runs both ways, the ledger returns at boot', async ({ page }) => {
  test.slow(); // four more transits, each data-bound on a starved page
  const query = `${AT}&det=1&hud=1&lang=en`;
  const hud = await bootDeterministic(page, query);
  const nav = (path: string): Promise<void> =>
    page.evaluate((hash) => {
      location.hash = hash;
    }, `#${path}?${query}`);

  // The committed legs to jordan (unchanged shape; the ledger rows prove the rooms mount).
  await nav('/gallery');
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  await expect(hud).not.toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Rastrelli Gallery — the way in',
    { timeout: 60_000 },
  );
  await nav('/jordan');
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  // The capture point: the hold's zero means the mount COMPLETED — the ledger stops growing.
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expectWithinBudgets(hud);
  const atJordan = await readInteger(hud, 'data-ledger-bytes');

  // jordan → 1812 (forward): the retargeted landing airlock — a cut whose card carries the
  // title sentence; the arrival seeds M0, the threshold stop.
  await nav('/1812');
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Military Gallery of 1812 — through the Armorial Hall',
    { timeout: 60_000 },
  );
  await expect(hud).toHaveAttribute('data-room', 'military-gallery', { timeout: 60_000 });
  await expect(page).toHaveURL(/#\/1812/, { timeout: 60_000 });
  await expect(page.locator('#caption')).toHaveText(
    'The threshold: the long view south, to the portraits of the heroes of 1812.',
    { timeout: 60_000 },
  );
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
  await expectWithinBudgets(hud); // the baked room renders within the whole-frame budgets
  // R4 (D-22): the baked leg — the contract, never the pixels (the goldens own those). The
  // served manifest declares the three states and the six lm rows; the HUD's non-zero ledger
  // after hold-ms 0 means both charts decoded and bound inside the hold.
  const response = await page.request.get(MANIFEST_1812);
  expect(response.ok(), `${MANIFEST_1812} served`).toBe(true);
  const manifest = (await response.json()) as ManifestShape;
  expect(manifest.lightmaps.states).toHaveLength(3);
  const ktx2Rows = new Set(
    manifest.files.filter((row) => row.kind === 'ktx2').map((row) => row.path),
  );
  for (const path of LM_ROWS_1812) expect(ktx2Rows.has(path), `lm row ${path}`).toBe(true);
  await expect(hud).not.toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });

  // 1812 → jordan (backward through the same airlock): the entry seeds the far stop (J4)
  // and the 1812 room releases whole — the ledger reads its jordan value again.
  await nav('/jordan');
  await expect(page.locator('#caption-title')).toHaveAttribute(
    'data-shown',
    'Jordan Staircase — the ascent',
    { timeout: 60_000 },
  );
  await expect(hud).toHaveAttribute('data-room', 'jordan', { timeout: 60_000 });
  await expect(page.locator('#caption')).toHaveText('arrival; the portal (landing airlock)', {
    timeout: 60_000,
  });
  await expect
    .poll(async () => readInteger(hud, 'data-ledger-bytes'), { timeout: 60_000 })
    .toBe(atJordan);

  // Home through the remaining chain; the ledger returns to boot (all scopes empty).
  await nav('/gallery');
  await expect(hud).toHaveAttribute('data-room', 'rastrelli-gallery', { timeout: 60_000 });
  await nav('/');
  await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 60_000 });
  await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 60_000 });
});

// §7.3's two deep-link starts: a fresh page load AT the room route is the cold entry
// (from = null; the sky renders until the room is ready, r16 interim), then the hops home
// ride the same chained transits the arrows fire, and the square reads the boot ledger.
const DEEP_LINK_QUERY = `${AT}&det=1&hud=1&lang=en`;

async function bootDeepLink(page: Page, path: string): Promise<Locator> {
  await page.goto(`/#${path}?${DEEP_LINK_QUERY}`);
  await expect(page.locator('#title')).toBeVisible({ timeout: FIRST_FRAME_TIMEOUT_MS });
  // The cold transit cannot settle before the room's data is ready (the card dwells on the
  // mount), so the scrub wait is the load-dwell class, not the resident boot's.
  await expect(page.locator('#scrub')).toBeVisible({ timeout: 90_000 });
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-frame-ms', POSITIVE_FRAME_MS, {
    timeout: HUD_BIND_TIMEOUT_MS,
  });
  return hud;
}

for (const [label, hops] of [
  ['cold #/1812 → #/gallery → square', ['#/gallery', '#/']],
  ['cold #/1812 → #/jordan → #/gallery → square', ['#/jordan', '#/gallery', '#/']],
] as const) {
  test(`deep link: ${label}`, async ({ page }) => {
    test.slow();
    const hud = await bootDeepLink(page, '/1812');
    await expect(hud).toHaveAttribute('data-room', 'military-gallery', { timeout: 60_000 });
    await expect(page.locator('#caption-title')).toHaveAttribute(
      'data-shown',
      'Military Gallery of 1812 — through the Armorial Hall',
      { timeout: 60_000 },
    );
    await expect(page.locator('#caption')).toHaveText(
      'The threshold: the long view south, to the portraits of the heroes of 1812.',
      { timeout: 60_000 },
    );
    await expect(page).toHaveURL(/#\/1812/, { timeout: 60_000 });
    await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 90_000 });
    await expectWithinBudgets(hud);
    for (const hash of hops) {
      await page.evaluate(
        ([target, query]) => {
          location.hash = `${target}?${query}`;
        },
        [hash, DEEP_LINK_QUERY],
      );
    }
    await expect(hud).toHaveAttribute('data-room', 'square', { timeout: 90_000 });
    await expect(hud).toHaveAttribute('data-ledger-bytes', '0', { timeout: 90_000 });
    await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 90_000 });
  });
}
