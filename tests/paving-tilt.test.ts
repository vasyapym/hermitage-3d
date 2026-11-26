// tests/paving-tilt.test.ts
/**
 * sq-fix-improve R3 review fixes 1 + 4 — the snow normal tilt's calibration pins. The ruled
 * spec is a ±3° normal tilt; the raw gsNoise gradient is unbounded by the amplitude, so the
 * emitted chunk divides it by SNOW_TILT_GRAD_BOUND — the field's actual sup |∇|, the
 * smoothstep-faded bilinear's per-axis max 1.5 / SNOW_TILT_PERIOD_M = 0.375 per metre (the
 * measured sweep max 0.368 sits just under it) — and the tilt is amp-scaled: the peak tilt
 * is SNOW_TILT_AMP (0.05 rad ≈ 2.86°, the ruled ±3° class). At uSnow = 0 the branchless
 * select preserves the incoming normal EXACTLY (no re-normalization). Pins the derivation,
 * the envelope over the TS twin's swept gradient, the realized peak, the achieved angle, and
 * the emitted chunk.
 */
import { describe, expect, it } from 'vitest';
import { pavingNormalGlsl } from '../src/procedural/ground-paving';
import { gsNoise } from '../src/world/ground-snow';
import { SNOW_TILT_AMP, SNOW_TILT_GRAD_BOUND, SNOW_TILT_PERIOD_M } from '../src/world/paving';

/** The pin sweep's central-difference step (world metres; the twin's shader uses e = 0.25). */
const E = 0.05;
/** The sweep's lattice extent: 200 × 200 cells of the 4 m period, 7 × 7 samples per cell. */
const CELLS = 200;
const SUB = [1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8];

/** |∇| of gsNoise(xz / period) per metre at (x, z) — the emitted chunk's law, twin-verbatim. */
const grad = (x: number, z: number): number => {
  const gx =
    (gsNoise((x + E) / SNOW_TILT_PERIOD_M, z / SNOW_TILT_PERIOD_M) -
      gsNoise((x - E) / SNOW_TILT_PERIOD_M, z / SNOW_TILT_PERIOD_M)) /
    (2 * E);
  const gz =
    (gsNoise(x / SNOW_TILT_PERIOD_M, (z + E) / SNOW_TILT_PERIOD_M) -
      gsNoise(x / SNOW_TILT_PERIOD_M, (z - E) / SNOW_TILT_PERIOD_M)) /
    (2 * E);
  return Math.hypot(gx, gz);
};

describe('the snow normal tilt calibration (the review fix)', () => {
  it('pins the derivation: the bound is the field sup |∇| = 1.5 / period per metre', () => {
    expect(Math.abs(SNOW_TILT_GRAD_BOUND - 1.5 / SNOW_TILT_PERIOD_M)).toBeLessThanOrEqual(1e-4);
  });

  it('the swept twin gradient stays under the bound, and the bound is not vacuous', {
    timeout: 30_000,
  }, () => {
    let max = 0;
    for (let i = 0; i < CELLS; i += 1) {
      for (let j = 0; j < CELLS; j += 1) {
        for (const ox of SUB) {
          for (const oz of SUB) {
            max = Math.max(max, grad((i + ox) * SNOW_TILT_PERIOD_M, (j + oz) * SNOW_TILT_PERIOD_M));
          }
        }
      }
    }
    // The bound is a true envelope — the review fix's guarantee: tilt ≤ amp · uSnow, always.
    expect(max).toBeLessThanOrEqual(SNOW_TILT_GRAD_BOUND + 1e-6);
    // ...and the envelope is not vacuous: the sweep finds a material gradient (measured
    // 0.368242 — just under the 0.375 sup). The free two-axis envelope √2 × 1.5 / period
    // ≈ 0.53033 was unreachable — the diagonal hash coupling denies both axes their joint
    // maximum, so it realized only ≈ 2.0°: the confirmed break this recalibration corrects.
    expect(max).toBeGreaterThanOrEqual(0.35);
    // The realized peak tilt on the measured grid: (max / bound) · amp — inside the ruled
    // class [0.04, 0.05] rad (≈ 2.3–2.9°; measured → ≈ 0.0491 rad ≈ 2.81°).
    expect((max / SNOW_TILT_GRAD_BOUND) * SNOW_TILT_AMP).toBeGreaterThanOrEqual(0.04);
    expect((max / SNOW_TILT_GRAD_BOUND) * SNOW_TILT_AMP).toBeLessThanOrEqual(0.05);
  });

  it('the achieved angle: the calibration makes amp the peak-tilt ceiling (0.05 rad ≈ 2.86°)', () => {
    // The emitted tilt is (|∇| / bound) · amp · uSnow: at the field's sup the peak IS amp —
    // the ruled 0.05 rad (≈ 2.86°, the ±3° class); the practical peak on the measured grid
    // ≈ 2.8° (the pre-fix √2-loose bound 0.53033 realized only ≈ 2.0°).
    expect(SNOW_TILT_AMP).toBeCloseTo(0.05, 3);
  });

  it('the emitted chunk divides by the bound and keeps the normal exact at uSnow = 0', () => {
    const chunk = pavingNormalGlsl();
    expect(chunk).toContain('vec3 pvTilt=vec3(pvTiltGx,0.0,pvTiltGz)*0.05*uSnow/0.375;');
    // The review's exact-identity fix: the tilted normal is computed, then selected — at
    // uSnow = 0 the incoming `normal` rides through un-renormalized.
    expect(chunk).toContain('vec3 pvTiltN=normalize(normal-(viewMatrix*vec4(pvTilt,0.0)).xyz);');
    expect(chunk).toContain('normal=uSnow>0.0?pvTiltN:normal;');
  });
});
