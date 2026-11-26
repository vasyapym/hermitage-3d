// tests/panes.test.ts
/**
 * sq-arch-day B4 — the day pane class. The albedo law extends paneBaseTone's day endpoint by
 * E(h) (bit-exact at E = 0 — the DEC-048 baseline); the sky tint after lighting is the E-gated,
 * view-dependent mix; uSkyFill shares the hemi colour × uDomeK (the dome's K); the DEC-019
 * lattice geometry and the no-checkerboard invariant are untouched.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import { solveSouthFacade } from '../src/procedural/facade-solver';
import { buildNightLattice, patchPaneDayTint } from '../src/procedural/night-lattice';
import {
  DARK_PANE_TONE,
  DAY_PANE_TONE,
  PANE_DAY_ALBEDO,
  PANE_TINT_MAX,
  PANE_TINT_MIN,
  paneBaseTone,
  paneDayAlbedo,
  paneTintFactor,
} from '../src/world/night-facade';
import { snowSkyGain } from '../src/world/snow-season';

describe('B4 — the day albedo law', () => {
  it('pins the day class: [0.06, 0.07, 0.085] over the committed endpoints', () => {
    expect(PANE_DAY_ALBEDO).toEqual([0.06, 0.07, 0.085]);
    expect(PANE_TINT_MIN).toBe(0.2);
    expect(PANE_TINT_MAX).toBe(0.4);
  });

  it('at E = 0 the law is paneBaseTone bit-exact (the DEC-048 baseline holds)', () => {
    for (const w of [0, 0.25, 0.5, 0.75, 1]) {
      const day = paneDayAlbedo(w, 0);
      const base = paneBaseTone(w);
      expect(day[0]).toBe(base[0]);
      expect(day[1]).toBe(base[1]);
      expect(day[2]).toBe(base[2]);
    }
    expect(paneDayAlbedo(1, 0)[0]).toBe(DARK_PANE_TONE[0]); // the night law exact
    expect(paneDayAlbedo(0, 0)[0]).toBe(DAY_PANE_TONE[0]);
  });

  it('at full day the lit-glass read takes over; the ramp is monotone in E', () => {
    const day = paneDayAlbedo(0, 1);
    expect(day[0]).toBeCloseTo(PANE_DAY_ALBEDO[0], 12);
    expect(day[1]).toBeCloseTo(PANE_DAY_ALBEDO[1], 12);
    expect(day[2]).toBeCloseTo(PANE_DAY_ALBEDO[2], 12);
    for (let c = 0; c < 3; c += 1) {
      let previous = paneDayAlbedo(0, 0)[c] ?? Number.NaN;
      for (let e = 0.1; e <= 1.001; e += 0.1) {
        const current = paneDayAlbedo(0, Math.min(1, e))[c] ?? Number.NaN;
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });
});

describe('B4 — the sky tint after lighting', () => {
  it('is 0.20 at NdotV 1 and 0.40 at NdotV 0, scaled by E(h)', () => {
    expect(paneTintFactor(1, 1)).toBeCloseTo(0.2, 12);
    expect(paneTintFactor(0, 1)).toBeCloseTo(0.4, 12);
    expect(paneTintFactor(0.5, 1)).toBeCloseTo(0.2 + 0.2 * 0.5 ** 3, 12);
    expect(paneTintFactor(1, 0.5)).toBeCloseTo(0.1, 12);
  });

  it('is exactly 0 at E = 0 (the pane output is the DEC-048 baseline)', () => {
    for (const ndotV of [0, 0.25, 0.5, 0.75, 1]) {
      expect(paneTintFactor(ndotV, 0)).toBe(0);
    }
  });

  it("uDomeK is the dome's K: 1.5 snow season, 1 else", () => {
    expect(snowSkyGain(1, 0)).toBeCloseTo(1.5, 12); // dec-noon
    expect(snowSkyGain(0, 0)).toBe(1); // june-noon
    expect(snowSkyGain(1, 1)).toBe(1); // any night
  });
});

describe('B4 — the lattice carries the day class', () => {
  const solved = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
  if (!solved.ok) throw new Error(`solve failed: ${JSON.stringify(solved.issues)}`);
  const lattice = buildNightLattice(solved.value);

  it('setNight(w, day) writes paneDayAlbedo — day 0 is the committed write', () => {
    lattice.setNight(0.5, 0.5);
    const expected = paneDayAlbedo(0.5, 0.5);
    const color = lattice.materials.dark.color;
    expect(color.r).toBeCloseTo(expected[0], 7);
    expect(color.g).toBeCloseTo(expected[1], 7);
    expect(color.b).toBeCloseTo(expected[2], 7);
    // All three levels take the SAME value: the no-checkerboard invariant at every (w, day).
    for (const level of ['dark', 'dim', 'bright'] as const) {
      expect(lattice.materials[level].color.getHex()).toBe(color.getHex());
    }
    lattice.setNight(0);
    const seeded = paneDayAlbedo(0, 0); // the build seed: the committed day glass tone
    const seededColor = lattice.materials.bright.color;
    expect(seededColor.r).toBeCloseTo(seeded[0], 7);
    expect(seededColor.g).toBeCloseTo(seeded[1], 7);
    expect(seededColor.b).toBeCloseTo(seeded[2], 7);
  });

  it('setDayTint binds the shared sky-fill instance and the dome K', () => {
    // The idempotent bind: the same instance re-bound every epoch, K updated in place.
    expect(() => lattice.setDayTint(lattice.materials.dark.color, 1.5)).not.toThrow();
    expect(() => lattice.setDayTint(lattice.materials.dark.color, 1)).not.toThrow();
  });

  it('the DEC-019 geometry is untouched: one unit plane per level, 2 tris each', () => {
    const mesh = lattice.meshes.dark;
    const geometry = mesh.geometry;
    expect(geometry.getAttribute('position').count).toBe(4);
    expect(mesh.count).toBe(lattice.counts.dark);
    expect(lattice.materials.dark.emissiveIntensity).toBe(0); // the dark law: never lights
  });
});

describe('B4 — the day-tint shader patch', () => {
  const latticeSrc = readFileSync('src/procedural/night-lattice.ts', 'utf8');

  it('splices after lighting at the opaque write and loud-fails without the anchor', () => {
    const shader = { fragmentShader: 'x\n#include <opaque_fragment>\ny' };
    patchPaneDayTint(shader);
    expect(shader.fragmentShader).toContain(
      'outgoingLight = mix( outgoingLight, uSkyFill * uDomeK, paneTint );',
    );
    expect(shader.fragmentShader.indexOf('paneNdotV')).toBeLessThan(
      shader.fragmentShader.indexOf('#include <opaque_fragment>'),
    );
    expect(() => patchPaneDayTint({ fragmentShader: 'no tokens here' })).toThrow(
      /no <opaque_fragment> token/,
    );
  });

  it("the tint law's constants and uniforms are in the emitted program", () => {
    expect(latticeSrc).toContain('uSkyFill * uDomeK');
    expect(latticeSrc).toContain('pow( 1.0 - paneNdotV, 3.0 )');
    expect(latticeSrc).toContain("'Pane/day-tint@1'");
    expect(latticeSrc).toContain('uPaneDay');
  });
});
