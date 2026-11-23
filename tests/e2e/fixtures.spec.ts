import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// r26 layout fixtures — design-i18n-notes.md §6 r26 + §9(h): en/ru × 360/768/1280 for both
// pages. Local-only (the "golden" project — the reference Mac's GPU, committed
// platform-suffixed baselines; CI runs --project=chromium and never sees this file).
// Refresh after an intentional visual change: pnpm e2e --project=golden --update-snapshots
// (this file is matched into the same project).

// The baselines exist only for darwin: elsewhere a run fails with no cause and
// writes bogus <platform> actuals - skip with the reason (the 2026-11-23 fix).
if (
  !existsSync(
    join(
      import.meta.dirname,
      'golden.spec.ts-snapshots',
      `coarse-chrome-en-360x744-golden-${process.platform}.png`,
    ),
  )
) {
  test.skip(true, 'the golden baselines exist only for darwin - capture on the reference device');
}
//
// The /notes fixtures pin the ledger face — no clipping at the three widths (risk R3: the
// RU column expands 20–35%). The main-page fixtures pin the settled-with-hint moment: the
// §9 hint branch (corner + stacked-above-caption) and the r26 right-aligned caption. The
// canvas hides on the main page — the dome dithers per frame, so a pixel gate over it would
// flake; the overlays (title, chrome, caption, hint, scrub) are the subject. No ?det=1
// here: det never shows the hint (§9), so these boots run the real tier probe.

const SETTLE_TIMEOUT_MS = 45_000;
const AT = 'at=2026-06-21T12:00:00Z'; // noon — the pinned epoch keeps the clock text fixed
const VIEWPORTS = [
  { name: '360', width: 360, height: 744 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 720 },
  // The ≥1600 px chrome step-up law (the overlay reads small on big displays) — pinned.
  { name: '1920', width: 1920, height: 1080 },
] as const;
const LANGS = ['en', 'ru'] as const;

const NOTES_TITLE = { en: 'How the south facade is built', ru: 'Как устроен южный фасад' } as const;

for (const viewport of VIEWPORTS) {
  test.describe(`main page ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const lang of LANGS) {
      test(`fixtures: main ${lang} ${viewport.name}`, async ({ page }) => {
        await page.goto(`/#/?${AT}&lang=${lang}`);
        await expect(page.locator('#scrub')).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
        // The hint shows at the arrival-settle beat (S0 boot); the caption sits under it.
        await expect(page.locator('#travel-hint')).toHaveAttribute('data-visible', 'true', {
          timeout: 10_000,
        });
        // Hide the canvas: visibility keeps layout, the dithering pixels leave the gate.
        await page.addStyleTag({ content: '#scene { visibility: hidden !important; }' });
        // Pin the hint's PIXELS against the 6 s hold timer (the R11 en-1280 lesson: a slow
        // page-level capture — 2–6 s per ADR-0012 — can cross HINT_HOLD_MS and dismiss the
        // hint mid-shot, so two runs captured different states). The data-visible assert
        // above still guards the state machine; this style only de-races the capture.
        await page.addStyleTag({
          content: '#travel-hint { opacity: 1 !important; transition: none !important; }',
        });
        await page.waitForTimeout(300); // one settle margin: the fade transitions finish
        // Strict threshold: the overlays are deterministic DOM (the canvas is hidden), and a
        // loose ratio would swallow a whole layout change — text is <1% of the viewport.
        await expect(page).toHaveScreenshot(`fixtures-main-${viewport.name}-${lang}.png`, {
          maxDiffPixelRatio: 0,
          timeout: 60_000,
        });
      });
    }
  });

  test.describe(`/notes ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const lang of LANGS) {
      test(`fixtures: notes ${lang} ${viewport.name}`, async ({ page }) => {
        // The binding resolves the language from the hash query and re-renders behind the
        // dictionary activation — the title is the ready signal.
        await page.goto(`/notes.html#?lang=${lang}`);
        await expect(page.locator('h1')).toHaveText(NOTES_TITLE[lang], { timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);
        // Pure DOM, no canvas — deterministic, so the gate is pixel-strict (a loose ratio
        // would swallow a whole layout change).
        await expect(page).toHaveScreenshot(`fixtures-notes-${viewport.name}-${lang}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0,
          timeout: 60_000,
        });
      });
    }
  });
}

// R13: the room-corner fixture — the /1812 settled M0 state at the narrow width, where the
// caption × chrome-row collision lived (the main fixtures never leave `/`, so the defect
// was invisible to them). The overlays are the subject; the canvas hides (the room render
// is the golden project's det-pinned subject, not this file's). No hint here: the §9 hint
// is S0-only; the corner stack's caption anchor (69 px above the chrome row at ≤767) is
// what this pair pins.
test.describe('room corner 360', () => {
  test.use({ viewport: { width: 360, height: 744 } });

  for (const lang of LANGS) {
    test(`fixtures: 1812 ${lang} 360`, async ({ page }) => {
      // hud=1: the data-* settle contract writes only while the HUD is open (main.ts's
      // hudOpen gate) — the fixture reads the attrs from the hidden node and hides the
      // HUD's pixels out of the shot.
      await page.goto(`/#/1812?${AT}&lang=${lang}&hud=1`);
      // The room settle contract (the smoke's): the room mounted, its payload staged
      // (the ledger non-zero), the threshold hold elapsed.
      await expect(page.locator('#hud')).toHaveAttribute('data-room', 'military-gallery', {
        timeout: SETTLE_TIMEOUT_MS,
      });
      await expect(page.locator('#hud')).not.toHaveAttribute('data-ledger-bytes', '0', {
        timeout: SETTLE_TIMEOUT_MS,
      });
      await expect(page.locator('#hud')).toHaveAttribute('data-hold-ms', '0', {
        timeout: SETTLE_TIMEOUT_MS,
      });
      // The settled rest beat: the card faded, M0's caption visible.
      await expect(page.locator('#caption')).toHaveAttribute('data-visible', 'true', {
        timeout: 10_000,
      });
      await expect(page.locator('#caption-title')).toHaveAttribute('data-visible', 'false', {
        timeout: 10_000,
      });
      // Hide the canvas (the room render is the golden project's subject) and the HUD
      // box (a dev tool): visibility keeps layout, their pixels leave the gate.
      await page.addStyleTag({
        content: '#scene, #hud { visibility: hidden !important; }',
      });
      await page.waitForTimeout(300); // one settle margin: the fade transitions finish
      await expect(page).toHaveScreenshot(`fixtures-1812-360-${lang}.png`, {
        maxDiffPixelRatio: 0,
        timeout: 60_000,
      });
    });
  }
});

// Mobile-B (design-mobile-tier.md §13): the four coarse DOM fixtures — the real auto boot
// (no ?q=, no det — the coarse policy path) at 360×744 and 844×390, RU/EN, DPR 3. The
// truth rows (data-tier-source ∈ {coarse, memory}, probe count 0) and the touch rail's
// reveal are the subject; the canvas + HUD pixels leave the shot (the room-corner pattern).
for (const viewport of [
  { width: 360, height: 744 },
  { width: 844, height: 390 },
]) {
  for (const lang of ['ru', 'en']) {
    test.describe(`coarse chrome ${lang} ${viewport.width}x${viewport.height}`, () => {
      test.use({ hasTouch: true, deviceScaleFactor: 3, viewport });
      test('auto-tier DOM fixture', async ({ page }) => {
        await page.goto(`/#/?${AT}&lang=${lang}&hud=1`);
        const hud = page.locator('#hud[data-room]');
        await expect(hud).toBeAttached({ timeout: 45_000 });
        await expect(hud).toHaveAttribute('data-hold-ms', '0', { timeout: 45_000 });
        await expect(page.locator('#touch-forward')).toHaveAttribute('aria-disabled', 'false', {
          timeout: 45_000,
        });
        await expect(hud).toHaveAttribute('data-tier-source', /^(coarse|memory)$/);
        await expect(hud).toHaveAttribute('data-probe-count', '0');
        await expect(page.locator('#scrub')).toBeVisible();
        await expect(page.locator('#travel-hint')).toHaveAttribute(
          'data-dismissed',
          /^(?!none$).+/,
          { timeout: 15_000 },
        );
        await expect(page.locator('#touch-rail')).toHaveAttribute('data-visible', 'true');
        await page.addStyleTag({ content: '#scene, #hud { visibility: hidden !important; }' });
        await expect(page).toHaveScreenshot(
          `coarse-chrome-${lang}-${viewport.width}x${viewport.height}.png`,
          { maxDiffPixelRatio: 0, timeout: 60_000 },
        );
      });
    });
  }
}
