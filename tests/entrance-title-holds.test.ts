// design-walkthrough-ux.md §4 (the 2026-11-01 owner reading-fix): the threshold card's
// minimum dwell is 800 ms on every shipped doorway/cut airlock. The host's synthetic
// index square-cut (main.ts) mirrors the same value by its own law — unpinnable from a
// data test (main.ts is the host, not a registry row).
import { describe, expect, it } from 'vitest';
import { AIRLOCKS } from '../rooms/index';

describe('shipped title-card holds', () => {
  it('uses 800 ms for doorway and cut cards', () => {
    expect(AIRLOCKS.map(({ id, holdMs }) => [id, holdMs])).toEqual([
      ['arch-portal', 800],
      ['gallery-airlock', 800],
      ['landing-airlock', 800],
    ]);
  });
});
