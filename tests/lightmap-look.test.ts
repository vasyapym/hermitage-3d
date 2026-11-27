// tests/lightmap-look.test.ts
// §5 look law content table: INTERIOR_LOOK_GAIN covers exactly the interior rooms, every state
// entry finite and > 0; LIGHT_STATES is the ordered §4 triple. Pure module, pure test.
import { describe, expect, it } from 'vitest';
import {
  INTERIOR_EMISSIVE_SCALE,
  INTERIOR_LOOK_GAIN,
  LIGHT_STATES,
} from '../src/content/lightmap-look';

const INTERIOR_ROOMS = ['jordan', 'rastrelli-gallery', 'st-george'] as const;

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
  it('the DECISION-2 row carries the ×1.10 gains (mg-1812-look; the B10 ×1.15 base)', () => {
    const row = INTERIOR_LOOK_GAIN['military-gallery'];
    expect(row).toEqual({ day: 1.8975, dusk: 3.795, nightChandeliers: 2.53 });
    // B10 (owner, ≈15 % more light): one ×1.15 shape across all three states; DECISION-2
    // (the owner, «around 10 %» again) re-pins the row ×1.10 as literals — the same
    // one-shape law, so every inter-state relation scales. eff = manifest wp × gain =
    // 2.84625 / 0.56925 / 0.759.
    // The old D-21 pure ceiling ≤ 1.0 retired de-facto at 3be6e50 (the day eff became 2.25 —
    // the stale 0.5/0.75 narrative there predates that retune); the order law night < day
    // per texel is the surviving invariant.
    const WHITE_POINT = { day: 1.5, dusk: 0.15, nightChandeliers: 0.3 } as const;
    expect(WHITE_POINT.day * row.day).toBeCloseTo(2.84625, 9);
    expect(WHITE_POINT.dusk * row.dusk).toBeCloseTo(0.56925, 9);
    expect(WHITE_POINT.nightChandeliers * row.nightChandeliers).toBeCloseTo(0.759, 9);
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

describe('INTERIOR_EMISSIVE_SCALE rastrelli-gallery (D2)', () => {
  // D2 («the hour on the glass» + the door card): the export glb carries the authored
  // emission (pane + stairlight emissiveFactor, strength exactly 1.0 - the glTF default,
  // no KHR_materials_emissive_strength); this row is the per-state dial blend-gl multiplies
  // over that base. The pane's night 0 and the sconce_glow's night 1 are the byte-holds.
  const row = INTERIOR_EMISSIVE_SCALE['rastrelli-gallery'];

  it('pins the pane row (the hour on the glass): day 1.4, dusk 0.3, night 0', () => {
    expect(row?.pane).toEqual({ day: 1.4, dusk: 0.3, nightChandeliers: 0 });
  });
  it('pins the sconce_glow row: day 0.6, dusk 0.85, night 1 (the byte-hold)', () => {
    expect(row?.sconce_glow).toEqual({ day: 0.6, dusk: 0.85, nightChandeliers: 1 });
  });
  it('pins the stairlight row (D2 approved): dark by day, dusk/night 0.30/0.40', () => {
    expect(row?.stairlight).toEqual({ day: 0, dusk: 0.3, nightChandeliers: 0.4 });
  });
  it('the row is explicit in every state, no material inherits a default', () => {
    for (const material of ['pane', 'sconce_glow', 'stairlight'] as const) {
      expect(Object.keys(row?.[material] ?? {}).sort()).toEqual([...LIGHT_STATES].sort());
    }
  });
});
