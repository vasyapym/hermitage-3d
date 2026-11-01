// tests/lm-recipes.test.mjs
//
// R-UX4 (walkthrough-UX pass, corridor light) + RG-D1 (the lamps' light): pins the declared
// compose law in tools/lm-recipes.mjs — the gallery's lamp field is published at
// GALLERY_LAMP_SCALE × the rig's emission in all three states (night = k·L; dusk = the rig's
// 1·L + (k−1)·L; day = the sun rig + k·L); argv construction is deterministic and fail-loud.
// Node driver-side data (imports tools/, never src/).
import { describe, expect, it } from 'vitest';
import {
  composeArgs,
  composeRecipeFor,
  DUSK_CANDELABRA_SCALE,
  GALLERY_LAMP_SCALE,
  LIGHTMAP_COMPOSE_RECIPES,
} from '../tools/lm-recipes.mjs';

const STATES = ['day', 'dusk', 'nightChandeliers'];

describe('lightmap compose recipes', () => {
  it('RG-D1: declares an integer lamp scale > 1 (the slow path executed at encode)', () => {
    expect(Number.isInteger(GALLERY_LAMP_SCALE)).toBe(true);
    expect(GALLERY_LAMP_SCALE).toBeGreaterThan(1);
  });

  it('RG-D1: gallery day = k·night + 1·day', () => {
    const terms = composeRecipeFor('rastrelli-gallery', 'day');
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['nightChandeliers', GALLERY_LAMP_SCALE],
      ['day', 1],
    ]);
  });

  it('RG-D1: gallery dusk = 1·dusk + (k − 1)·night (the dusk rig already carries 1·L)', () => {
    const terms = composeRecipeFor('rastrelli-gallery', 'dusk');
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['dusk', 1],
      ['nightChandeliers', GALLERY_LAMP_SCALE - 1],
    ]);
  });

  it('RG-D1: gallery night = k·night (a one-term compose; lm_compose accepts >= 1 input)', () => {
    const terms = composeRecipeFor('rastrelli-gallery', 'nightChandeliers');
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['nightChandeliers', GALLERY_LAMP_SCALE],
    ]);
  });

  it('RG-D1: the lamp term is the same k in every state (per-texel ordering by construction)', () => {
    const lampOf = (state) =>
      composeRecipeFor('rastrelli-gallery', state)
        .filter((t) => t.source === 'nightChandeliers')
        .reduce((s, t) => s + t.scale, 0) + (state === 'dusk' ? 1 : 0);
    expect(lampOf('day')).toBe(GALLERY_LAMP_SCALE);
    expect(lampOf('dusk')).toBe(GALLERY_LAMP_SCALE);
    expect(lampOf('nightChandeliers')).toBe(GALLERY_LAMP_SCALE);
  });

  it('R4 D-3: the 1812 dusk composes the night candelabra field at a third', () => {
    const terms = composeRecipeFor('military-gallery', 'dusk');
    expect(terms).not.toBeNull();
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['dusk', 1],
      ['nightChandeliers', DUSK_CANDELABRA_SCALE],
    ]);
    expect(DUSK_CANDELABRA_SCALE).toBeCloseTo(1 / 3, 12);
    // The night state itself encodes its own bake; the day state too.
    expect(composeRecipeFor('military-gallery', 'day')).toBeNull();
    expect(composeRecipeFor('military-gallery', 'nightChandeliers')).toBeNull();
  });

  it('every term names a canonical state with a finite positive scale', () => {
    for (const room of Object.values(LIGHTMAP_COMPOSE_RECIPES)) {
      for (const terms of Object.values(room)) {
        for (const term of terms ?? []) {
          expect(STATES).toContain(term.source);
          expect(Number.isFinite(term.scale) && term.scale > 0).toBe(true);
        }
      }
    }
  });

  it('unknown rooms and states resolve to null (their own bake)', () => {
    expect(composeRecipeFor('jordan', 'day')).toBeNull();
    expect(composeRecipeFor('rastrelli-gallery', 'unknown')).toBeNull();
  });

  it('builds a deterministic argv tail and rejects bad scales', () => {
    expect(
      composeArgs('/stage/out.exr', [
        { path: '/stage/n.exr', scale: 1 },
        { path: '/stage/d.exr', scale: 1 },
      ]),
    ).toEqual(['--out', '/stage/out.exr', '--in', '/stage/n.exr:1', '--in', '/stage/d.exr:1']);
    expect(() => composeArgs('/stage/out.exr', [{ path: '/stage/n.exr', scale: 0 }])).toThrow();
  });
});
