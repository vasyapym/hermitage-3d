// tests/lightmap-look.test.ts
// §5 look law content table: INTERIOR_LOOK_GAIN covers exactly the interior rooms, every state
// entry finite and > 0; LIGHT_STATES is the ordered §4 triple. Pure module, pure test.
import { describe, expect, it } from 'vitest';
import { INTERIOR_LOOK_GAIN, LIGHT_STATES } from '../src/content/lightmap-look';

const INTERIOR_ROOMS = ['jordan', 'rastrelli-gallery'] as const;

describe('LIGHT_STATES', () => {
  it('is exactly day, dusk, nightChandeliers in that order', () => {
    expect([...LIGHT_STATES]).toEqual(['day', 'dusk', 'nightChandeliers']);
  });
});

describe('INTERIOR_LOOK_GAIN', () => {
  it('covers every interior room id (the Record keys on the registry union)', () => {
    expect(Object.keys(INTERIOR_LOOK_GAIN).sort()).toEqual(
      [...INTERIOR_ROOMS, 'military-gallery'].sort(),
    );
  });
  it('the B10 row carries the ×1.15 gains (design-gallery.md §4.6; the R4-era ceiling is retired)', () => {
    const row = INTERIOR_LOOK_GAIN['military-gallery'];
    expect(row).toEqual({ day: 1.725, dusk: 3.45, nightChandeliers: 2.3 });
    // B10 (owner, ≈15 % more light): one ×1.15 shape across all three states, so every
    // inter-state relation scales. eff = manifest wp × gain = 2.5875 / 0.5175 / 0.69.
    // The old D-21 pure ceiling ≤ 1.0 retired de-facto at 3be6e50 (the day eff became 2.25 —
    // the stale 0.5/0.75 narrative there predates that retune); the order law night < day
    // per texel is the surviving invariant.
    const WHITE_POINT = { day: 1.5, dusk: 0.15, nightChandeliers: 0.3 } as const;
    expect(WHITE_POINT.day * row.day).toBeCloseTo(2.5875, 9);
    expect(WHITE_POINT.dusk * row.dusk).toBeCloseTo(0.5175, 9);
    expect(WHITE_POINT.nightChandeliers * row.nightChandeliers).toBeCloseTo(0.69, 9);
    expect(WHITE_POINT.nightChandeliers * row.nightChandeliers).toBeLessThan(
      WHITE_POINT.day * row.day,
    );
  });
  it('rastrelli-gallery carries one gain for all states (RG-D1: ordering by construction)', () => {
    const g = INTERIOR_LOOK_GAIN['rastrelli-gallery'];
    expect(g.dusk).toBe(g.day);
    expect(g.nightChandeliers).toBe(g.day);
  });
  it('every state entry is a finite positive number', () => {
    for (const room of INTERIOR_ROOMS) {
      const row = INTERIOR_LOOK_GAIN[room];
      expect(Object.keys(row).sort()).toEqual([...LIGHT_STATES].sort());
      for (const state of LIGHT_STATES) {
        const gain = row[state];
        expect(Number.isFinite(gain), `${room}.${state} finite`).toBe(true);
        expect(gain, `${room}.${state} > 0`).toBeGreaterThan(0);
      }
    }
  });
});
