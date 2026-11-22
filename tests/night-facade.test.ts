/*
 * Night facade pure laws (DEC-019; ROADMAP Phase 2b; design-sky-time.md §8 via the imported
 * weights). Node Vitest, no three, no DOM.
 */
import { describe, expect, it } from 'vitest';
import { lightmapWeights } from '../src/sky/lightmap-weights';
import { solarPosition } from '../src/sky/solar';
import {
  DARK_PANE_TONE,
  DAY_PANE_TONE,
  hashKey,
  K_LEVEL,
  LEVEL_SPLIT,
  type LinearRgb,
  latticeVisible,
  levelOf,
  PANE_BASE_TONE,
  PANE_LEVEL_COUNT,
  PANE_LEVELS,
  type PaneLevel,
  PEAK_EMISSIVE_INTENSITY,
  paneBaseTone,
  paneIntensity,
  unitHash,
  WINDOW_WARM_LINEAR,
  warmGround,
} from '../src/world/night-facade';

const SAMPLE_COUNT = 4000;
const SAMPLE_IDS = Array.from(
  { length: SAMPLE_COUNT },
  (_, i) => `surround-row${1 + (i % 4)}-${i % 2 === 0 ? 'small' : 'large'}:${i}`,
);
/** Dense elevation grid, -90..90 in 0.1° steps. */
const ELEVATION_GRID = Array.from({ length: 1801 }, (_, i) => -90 + i * 0.1);
/** Local midnight on the 2026 June solstice at the palace (UTC+3). */
const JUNE_SOLSTICE_LOCAL_MIDNIGHT_MS = Date.parse('2026-06-20T21:00:00Z');

describe('night-facade: level hash', () => {
  it('is deterministic and maps onto [0, 1)', () => {
    for (const id of SAMPLE_IDS) {
      expect(hashKey(id)).toBe(hashKey(id));
      expect(levelOf(id)).toBe(levelOf(id));
      const u = unitHash(id);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
    expect(hashKey('surround-row1-small:0')).not.toBe(hashKey('surround-row1-small:1'));
  });
  it('declares three levels with a positive split summing to one', () => {
    expect(PANE_LEVEL_COUNT).toBe(3);
    expect(PANE_LEVELS).toEqual(['dark', 'dim', 'bright']);
    expect(LEVEL_SPLIT.dark + LEVEL_SPLIT.dim + LEVEL_SPLIT.bright).toBeCloseTo(1, 12);
    for (const level of PANE_LEVELS) {
      expect(LEVEL_SPLIT[level]).toBeGreaterThan(0);
    }
  });
  it('spreads panes over all three levels (non-degenerate split)', () => {
    const counts: Record<PaneLevel, number> = { dark: 0, dim: 0, bright: 0 };
    for (const id of SAMPLE_IDS) {
      counts[levelOf(id)] += 1;
    }
    for (const level of PANE_LEVELS) {
      expect(counts[level]).toBeGreaterThan(SAMPLE_COUNT * 0.1);
      // loose sanity against the declared share, not an exact split (DEC-019 tuning target)
      expect(Math.abs(counts[level] / SAMPLE_COUNT - LEVEL_SPLIT[level])).toBeLessThan(0.08);
    }
  });
});

describe('night-facade: intensity identity against the §8 weight', () => {
  it('equals K_LEVEL[level] * nightChandeliers on a dense elevation grid', () => {
    for (const elevationDeg of ELEVATION_GRID) {
      const w = lightmapWeights(elevationDeg).nightChandeliers;
      for (const level of PANE_LEVELS) {
        expect(paneIntensity(level, w)).toBe(K_LEVEL[level] * w);
      }
      expect(paneIntensity('dark', w) === 0).toBe(true);
    }
  });
  it('declares dark as 0, dim below bright, bright as the peak', () => {
    expect(K_LEVEL.dark).toBe(0);
    expect(K_LEVEL.dim).toBeGreaterThan(0);
    expect(K_LEVEL.dim).toBeLessThan(K_LEVEL.bright);
    expect(K_LEVEL.bright).toBe(PEAK_EMISSIVE_INTENSITY);
  });
  it('is exactly 0 across the dusk plateau where nightChandeliers === 0', () => {
    const plateau = ELEVATION_GRID.filter((e) => {
      const w = lightmapWeights(e);
      return w.nightChandeliers === 0 && w.dusk > 0;
    });
    expect(plateau.length).toBeGreaterThan(0);
    for (const e of plateau) {
      const w = lightmapWeights(e).nightChandeliers;
      expect(paneIntensity('bright', w)).toBe(0);
      expect(latticeVisible(w)).toBe(false);
    }
  });
  it('reaches the peak where nightChandeliers === 1', () => {
    const deep = ELEVATION_GRID.find((e) => lightmapWeights(e).nightChandeliers === 1);
    expect(deep).toBeDefined();
    if (deep === undefined) {
      return;
    }
    const w = lightmapWeights(deep).nightChandeliers;
    expect(paneIntensity('bright', w)).toBe(PEAK_EMISSIVE_INTENSITY);
    expect(latticeVisible(w)).toBe(true);
  });
  it('keeps white-night windows dark: June-solstice local midnight gives wNight === 0', () => {
    const { elevationDeg } = solarPosition(JUNE_SOLSTICE_LOCAL_MIDNIGHT_MS);
    expect(elevationDeg).toBeLessThan(0);
    const w = lightmapWeights(elevationDeg).nightChandeliers;
    expect(w).toBe(0);
    expect(latticeVisible(w)).toBe(false);
    for (const level of PANE_LEVELS) {
      expect(paneIntensity(level, w)).toBe(0);
    }
  });
});

describe('night-facade: visibility and ground warm-up', () => {
  it('shows the lattice iff wNight > 0', () => {
    expect(latticeVisible(0)).toBe(false);
    expect(latticeVisible(-0)).toBe(false);
    expect(latticeVisible(Number.MIN_VALUE)).toBe(true);
    expect(latticeVisible(0.5)).toBe(true);
    expect(latticeVisible(1)).toBe(true);
  });
  it('declares a warm tint: unit-range linear channels, red >= green >= blue', () => {
    for (const c of WINDOW_WARM_LINEAR) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    expect(WINDOW_WARM_LINEAR[0]).toBeGreaterThanOrEqual(WINDOW_WARM_LINEAR[1]);
    expect(WINDOW_WARM_LINEAR[1]).toBeGreaterThanOrEqual(WINDOW_WARM_LINEAR[2]);
  });
  it('warmGround returns current at 0, the tint at 1, the midpoint at 0.5', () => {
    const current: LinearRgb = [0.21, 0.23, 0.27];
    expect(warmGround(current, WINDOW_WARM_LINEAR, 0)).toEqual([...current]);
    expect(warmGround(current, WINDOW_WARM_LINEAR, 1)).toEqual([...WINDOW_WARM_LINEAR]);
    const mid = warmGround(current, WINDOW_WARM_LINEAR, 0.5);
    expect(mid[0]).toBeCloseTo((current[0] + WINDOW_WARM_LINEAR[0]) / 2, 12);
    expect(mid[1]).toBeCloseTo((current[1] + WINDOW_WARM_LINEAR[1]) / 2, 12);
    expect(mid[2]).toBeCloseTo((current[2] + WINDOW_WARM_LINEAR[2]) / 2, 12);
  });
});

describe('night-facade: the one unlit albedo (the square-next round)', () => {
  it('PANE_BASE_TONE is the dark stock tone by reference — one law, not a copy', () => {
    expect(PANE_BASE_TONE).toBe(DARK_PANE_TONE);
  });
});

describe('night-facade: the hour-driven unlit albedo (the square-next-2 round)', () => {
  it('paneBaseTone is endpoint-exact: the day glass tone at 0, DEC-048 bit-exact at 1', () => {
    for (const c of [0, 1, 2] as const) {
      expect(paneBaseTone(0)[c]).toBe(DAY_PANE_TONE[c]);
      expect(paneBaseTone(1)[c]).toBe(DARK_PANE_TONE[c]);
    }
  });
  it('is monotone per channel over the hour range', () => {
    for (const c of [0, 1, 2] as const) {
      let previous = paneBaseTone(0)[c];
      for (const w of [0.25, 0.5, 0.75, 1]) {
        const current = paneBaseTone(w)[c];
        expect(current).toBeGreaterThanOrEqual(previous); // the day tone is darker throughout
        previous = current;
      }
    }
  });
  it('the day tone stays an opening: every channel at the dark-glass scale', () => {
    for (const c of [0, 1, 2] as const) {
      expect(DAY_PANE_TONE[c]).toBeLessThanOrEqual(0.05);
    }
    expect(DAY_PANE_TONE[2]).toBeGreaterThan(DAY_PANE_TONE[0]); // the cool sky-reflection lift
  });
  it('clamps out-of-range weights to the endpoints (the callers may pass raw hour weights)', () => {
    expect(paneBaseTone(-1)).toEqual([...DAY_PANE_TONE]);
    expect(paneBaseTone(2)).toEqual([...DARK_PANE_TONE]);
  });
});
