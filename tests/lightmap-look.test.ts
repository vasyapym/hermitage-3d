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
  it('the R4 row is the first-bake gains (design-gallery.md §4.6) with eff under the ceiling', () => {
    const row = INTERIOR_LOOK_GAIN['military-gallery'];
    expect(row).toEqual({ day: 1.5, dusk: 3, nightChandeliers: 2 });
    // D-21's pure ceiling law: eff = whitePoint × gain stays ≤ 1.0 per state, night < day.
    const WHITE_POINT = { day: 0.5, dusk: 0.15, nightChandeliers: 0.3 } as const;
    const effs = LIGHT_STATES.map((state) => WHITE_POINT[state] * row[state]);
    expect(Math.max(...effs)).toBeLessThanOrEqual(1.0);
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
