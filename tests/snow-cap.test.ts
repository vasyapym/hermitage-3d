/*
 * Snow cap builder (DEC-033; the square-next-2 round's HQ cornice lip). Node Vitest; three core
 * only, no DOM. The lip is MERGED into the cap's morph geometry: base collapsed strictly inside
 * the cornice band, target the full strip — the wSnow gate and the morph ride the cap's own
 * group/mesh (+0 draw calls, +12 tris).
 */
import { describe, expect, it } from 'vitest';
import type { Placement } from '../src/procedural/facade-solver';
import { buildSnowCap } from '../src/procedural/snow-cap';
import { HQ_SNOW_LIP, HQ_SNOW_LIP_BAND } from '../src/world/square-kit';

const vec = (x: number, y: number, z: number): Placement['position'] => ({ x, y, z });
/** Fixture-only: one upper cornice-run placement (the real KIT frame drives the crown). */
const runPlacement = (id: string): Placement => ({
  id,
  partId: 'cornice-run',
  position: vec(0, 0, 0),
  rotationY: 0,
  scale: vec(1, 1, 1),
});

describe('snow-cap: the HQ cornice lip (the square-next-2 round)', () => {
  const cap = buildSnowCap({ placements: [runPlacement('south/cornice-upper/0')] });

  it('merges the HQ lip into the cap geometry: exactly 12 tris beyond the one-run cap', () => {
    // One run = 32 tris (the DEC-033 shape: 14 surface + 4 contact + 14 end caps); the lip
    // adds a 12-tri box strip. A drift here is a conscious shape edit.
    expect(cap.triangles).toBe(32 + 12);
  });

  it('the morph target carries the lip corners in world space (all three axes)', () => {
    const target = cap.mesh.geometry.morphAttributes.position?.[0];
    if (!target) throw new Error('the cap carries no morph target');
    // The lip's vertices are the FINAL 24 of the target (the palace runs come first) —
    // asserting their bounds on ALL three axes (the review fix: a mirrored lip would pass
    // an X/Y-only check). float32 storage: the authored constants survive to ~1e-3.
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = target.count - 24; i < target.count; i += 1) {
      xs.push(target.getX(i));
      ys.push(target.getY(i));
      zs.push(target.getZ(i));
    }
    expect(xs).toHaveLength(24);
    const bounds = (list: number[]): Readonly<{ min: number; max: number }> => ({
      min: Math.min(...list),
      max: Math.max(...list),
    });
    const bx = bounds(xs);
    const by = bounds(ys);
    const bz = bounds(zs);
    expect(bx.min).toBeGreaterThan(HQ_SNOW_LIP.min[0] - 1e-3);
    expect(bx.max).toBeLessThan(HQ_SNOW_LIP.max[0] + 1e-3);
    expect(by.min).toBeGreaterThan(HQ_SNOW_LIP.min[1] - 1e-3);
    expect(by.max).toBeLessThan(HQ_SNOW_LIP.max[1] + 1e-3);
    expect(bz.min).toBeGreaterThan(HQ_SNOW_LIP.min[2] - 1e-3);
    expect(bz.max).toBeLessThan(HQ_SNOW_LIP.max[2] + 1e-3);
  });

  it('the lip waits for the kit: the draw range hides it until the host flips it on', () => {
    // The default: hidden (the degraded mount path must not float a snow strip over bare
    // field). The lip's 12 tris sit at the END of the index array — the palace tris draw
    // as before in the same draw call.
    const total = cap.mesh.geometry.index?.count ?? 0;
    expect(cap.hqLipIndexStart).toBe(total - 36);
    expect(cap.mesh.geometry.drawRange.count).toBe(cap.hqLipIndexStart);
    cap.setHqLipVisible(true);
    expect(cap.mesh.geometry.drawRange.count).toBe(Infinity);
    cap.setHqLipVisible(false);
    expect(cap.mesh.geometry.drawRange.count).toBe(cap.hqLipIndexStart);
  });

  it('the collapsed base seats strictly inside the cornice band (nothing coplanar)', () => {
    const base = cap.mesh.geometry.getAttribute('position');
    let lipVerts = 0;
    for (let i = 0; i < base.count; i += 1) {
      const x = base.getX(i);
      // the HQ lip's base verts are the only ones inside the cornice band's x span (the
      // palace runs' bases live at x ±105, far west of 109.7)
      if (x > HQ_SNOW_LIP_BAND.xMin && x < HQ_SNOW_LIP_BAND.xMax) {
        lipVerts += 1;
        expect(base.getY(i)).toBeLessThan(HQ_SNOW_LIP.min[1]); // under the band's top face
      }
    }
    expect(lipVerts).toBe(24); // six faces × four flat vertices
  });

  it('rides the cap gate: hidden at wSnow 0, the morph full in season', () => {
    expect(cap.group.visible).toBe(false);
    cap.setSnow(1);
    expect(cap.group.visible).toBe(true);
    expect(cap.mesh.morphTargetInfluences?.[0]).toBe(1);
  });
});
