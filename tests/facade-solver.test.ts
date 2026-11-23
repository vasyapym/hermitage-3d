// Facade solver gates — relay round 6 (tests written by the orchestrator per
// docs/design-facade-grammar.md §6; the relay's test block never arrived).
import { describe, expect, it } from 'vitest';
import { DECOR_SYSTEM, SOUTH_FACADE, WINDOW_ROWS } from '../src/content/facade-spec';
import {
  checkBounds,
  KIT,
  ORDER_TIER_BASE_Y,
  projectBudget,
  SECTION_CLASS_BY_LAYOUT,
  SOUTH_ENVELOPE,
  type SolvedFacade,
  solveSouthFacade,
  validateSouthSpec,
  windowTypeGrid,
} from '../src/procedural/facade-solver';

function solveOk(): SolvedFacade {
  const result = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
  if (!result.ok) throw new Error(`solve failed: ${JSON.stringify(result.issues)}`);
  return result.value;
}

const PITCH = 210 / 62;

describe('facade solver', () => {
  it('solves the committed spec with exactly one crease warning', () => {
    const result = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe('crease');
    expect(result.value.derivedCreaseM).toBe(234);
    expect(result.value.pitchM).toBeCloseTo(PITCH, 12);
  });

  it('leaves the frozen spec and rows untouched', () => {
    const specBefore = structuredClone(SOUTH_FACADE);
    const rowsBefore = structuredClone(WINDOW_ROWS);
    solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
    expect(JSON.stringify(SOUTH_FACADE)).toBe(JSON.stringify(specBefore));
    expect(JSON.stringify(WINDOW_ROWS)).toBe(JSON.stringify(rowsBefore));
  });

  it('solves deterministically', () => {
    const a = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
    const b = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('reproduces the round-5 aggregate table', () => {
    const counts = solveOk().counts;
    expect(counts.axes).toBe(62);
    expect(counts.windowSlots).toBe(248);
    expect(counts.windows).toBe(236);
    expect(counts.portalVoidCells).toBe(12);
    expect(counts.columnShafts).toBe(68);
    expect(counts.instances).toBe(671);
    expect(counts.activeParts).toBe(21);
    expect(counts.triangles).toBe(134_264);
    expect(counts.byPart['surround-row1-small']).toBe(56);
    expect(counts.byPart['surround-row2-large']).toBe(42);
    expect(counts.byPart['surround-row2-risalit']).toBe(14);
    expect(counts.byPart['surround-row3-large']).toBe(20);
    expect(counts.byPart['surround-row3-segmental']).toBe(20);
    expect(counts.byPart['surround-row3-risalit']).toBe(22);
    expect(counts.byPart['surround-row4-small']).toBe(62);
    expect(counts.byPart.sill).toBe(236);
    expect(counts.byPart['paired-column']).toBe(20);
    expect(counts.byPart['corner-bunch']).toBe(8);
    expect(counts.byPart['portal-arch']).toBe(3);
    expect(counts.byPart['ground-arch']).toBe(3);
    expect(counts.byPart['giant-column']).toBe(4);
    expect(counts.byPart.pediment).toBe(1);
    expect(counts.byPart.cartouche).toBe(1);
    expect(counts.byPart['cornice-run']).toBe(17);
    expect(counts.byPart['order-junction']).toBe(20);
    expect(counts.byPart.balustrade).toBe(62);
    expect(counts.byPart.vase).toBe(24);
    expect(counts.byPart.statue).toBe(24);
    expect(counts.byPart.socle).toBe(12);
  });

  it('runs the socle along every face and reveal and clears the arch voids', () => {
    const byPart = solveOk().byPart;
    const socle = byPart.socle;
    expect(socle).toHaveLength(12);
    // the course's top is the order's foot; the depth is the proud offset
    expect(KIT.socle.localBounds.max.y).toBe(ORDER_TIER_BASE_Y.lower);
    expect(KIT.socle.localBounds.max.z).toBeCloseTo(0.35, 9);
    for (const placement of socle) {
      expect(placement.position.y).toBe(0);
      expect(placement.scale.y).toBe(1);
      expect(placement.scale.z).toBe(1);
      expect(placement.scale.x).toBeGreaterThan(0);
    }
    // the portal's four pier segments clear every arch void span by archClearM
    const portalPiers = socle.filter(
      (placement) => placement.rotationY === 0 && Math.abs(placement.position.x) < 14,
    );
    expect(portalPiers).toHaveLength(4);
    const voidHalf = 4.9 / 2 + 0.2;
    for (const archCentre of [-2 * PITCH, 0, 2 * PITCH]) {
      for (const pier of portalPiers) {
        const from = pier.position.x - pier.scale.x / 2;
        const to = pier.position.x + pier.scale.x / 2;
        // The piers end exactly at the widened span edges; sub-nanometre float
        // noise on the shared boundary is a touch, not an overlap.
        const overlaps = from < archCentre + voidHalf - 1e-9 && to > archCentre - voidHalf + 1e-9;
        expect(overlaps).toBe(false);
      }
    }
    // the four crease returns ride the path as rotated placements; each runs
    // between the two proud front planes (the review pass's joint law: both
    // endpoints shift south by the course's own depth)
    const returns = socle.filter((placement) => placement.rotationY !== 0);
    expect(returns).toHaveLength(4);
    const depth = KIT.socle.localBounds.max.z;
    for (const placement of returns) {
      expect(placement.position.z).toBeCloseTo((87.5 + 93.5) / 2 + depth, 9);
      expect(placement.scale.x).toBeCloseTo(93.5 - 87.5, 9);
    }
  });

  it('populates all twelve window types of the declared twelve', () => {
    const grid = windowTypeGrid(SOUTH_FACADE);
    expect(grid.size).toBe(12);
    // The portal's flanking axes carry rows 1-2 as windows; only the six arch
    // axes void them (the review pass's grid law — derived from the cells).
    expect(grid.has('row1/portal')).toBe(true);
    expect(grid.has('row2/portal')).toBe(true);
    expect(grid.size).toBeLessThanOrEqual(DECOR_SYSTEM.windowTypes);
    expect(SECTION_CLASS_BY_LAYOUT).toHaveLength(SOUTH_FACADE.sections.length);
  });

  it('alternates the row3 stretch heads by parity and mirrors them about the portal', () => {
    const byPart = solveOk().byPart;
    const base = byPart['surround-row3-large'];
    const segmental = byPart['surround-row3-segmental'];
    expect(base).toHaveLength(20);
    expect(segmental).toHaveLength(20);
    for (const placement of segmental) {
      const mirrored = segmental.some(
        (candidate) => Math.abs(candidate.position.x + placement.position.x) < 1e-9,
      );
      expect(mirrored).toBe(true);
    }
    // Within one stretch the ids alternate along x: no two neighbours share a part.
    const westStart = -105 + 7 * PITCH;
    const westEnd = -105 + 27 * PITCH;
    const west = [...base, ...segmental]
      .filter((placement) => placement.position.x > westStart && placement.position.x < westEnd)
      .sort((a, b) => a.position.x - b.position.x);
    expect(west).toHaveLength(20);
    for (let index = 1; index < west.length; index += 1) {
      const previous = west[index - 1];
      const current = west[index];
      if (previous === undefined || current === undefined) throw new Error('placement missing');
      expect(previous.partId === current.partId).toBe(false);
    }
    // The risalit and portal windows of the upper rows carry the risalit head.
    const risalitRow2 = byPart['surround-row2-risalit'];
    expect(risalitRow2).toHaveLength(14);
    const risalitRow3 = byPart['surround-row3-risalit'];
    expect(risalitRow3).toHaveLength(22);
    expect(risalitRow3.filter((placement) => Math.abs(placement.position.x) < 13)).toHaveLength(8);
    for (const placement of risalitRow2) {
      const mirrored = risalitRow2.some(
        (candidate) => Math.abs(candidate.position.x + placement.position.x) < 1e-9,
      );
      expect(mirrored).toBe(true);
    }
    for (const placement of risalitRow3) {
      const mirrored = risalitRow3.some(
        (candidate) => Math.abs(candidate.position.x + placement.position.x) < 1e-9,
      );
      expect(mirrored).toBe(true);
    }
  });

  it('closes the facade line at -105 and +105', () => {
    const facade = solveOk();
    const first = facade.axes.at(0);
    const last = facade.axes.at(-1);
    if (first === undefined || last === undefined) throw new Error('axes missing');
    expect(first.x - PITCH / 2).toBeCloseTo(-105, 9);
    expect(last.x + PITCH / 2).toBeCloseTo(105, 9);
  });

  it('emits no window placements inside the portal arches of rows 1-2', () => {
    const facade = solveOk();
    const prefixAxes = 7 + 20;
    const archWest = -105 + (prefixAxes + 2) * PITCH;
    const archEast = -105 + (prefixAxes + 6) * PITCH;
    const inside = (x: number): boolean => x > archWest && x < archEast;
    const surrounds = facade.byPart;
    for (const partId of ['surround-row1-small', 'surround-row2-large'] as const) {
      for (const placement of surrounds[partId]) {
        expect(inside(placement.position.x)).toBe(false);
      }
    }
    const upperRows = [...surrounds['surround-row3-large'], ...surrounds['surround-row4-small']];
    expect(upperRows.some((placement) => inside(placement.position.x))).toBe(true);
  });

  it('mirrors column piers about the facade centre', () => {
    const byPart = solveOk().byPart;
    for (const partId of ['paired-column', 'corner-bunch', 'giant-column'] as const) {
      const xs = byPart[partId].map((placement) => placement.position.x);
      for (const x of xs) {
        const mirrored = xs.some((candidate) => Math.abs(candidate + x) < 1e-9);
        expect(mirrored).toBe(true);
      }
    }
  });

  it('keeps every column shaft clear of the window sills', () => {
    const facade = solveOk();
    const openingByRow = new Map(
      WINDOW_ROWS.map((row) => [
        row.id,
        row.module === 'large' ? 1.7 : row.module === 'medium' ? 1.35 : 1.0,
      ]),
    );
    const axisXs = facade.axes.map((axis) => axis.x);
    let minClearance = Number.POSITIVE_INFINITY;
    for (const partId of ['paired-column', 'corner-bunch', 'giant-column'] as const) {
      for (const pier of facade.byPart[partId]) {
        for (const axis of facade.axes) {
          for (const cell of axis.cells) {
            if (cell.kind !== 'window') continue;
            const sillHalf = ((openingByRow.get(cell.rowId) ?? 1.0) + 0.4) / 2;
            minClearance = Math.min(
              minClearance,
              Math.abs(pier.position.x - axis.x) - sillHalf - 0.55,
            );
          }
        }
      }
    }
    expect(minClearance).toBeGreaterThan(0.09);
    expect(axisXs).toHaveLength(62);
  });

  it('centres the portal assembly on the facade axis', () => {
    const byPart = solveOk().byPart;
    expect(byPart.pediment[0]?.position.x).toBeCloseTo(0, 9);
    expect(byPart.cartouche[0]?.position.x).toBeCloseTo(0, 9);
    const archXs = byPart['portal-arch'].map((placement) => placement.position.x);
    expect(archXs).toHaveLength(3);
    const centre = archXs.find((x) => Math.abs(x) < 1e-9);
    expect(centre).toBeDefined();
    const west = archXs.filter((x) => x < -1e-9);
    const east = archXs.filter((x) => x > 1e-9);
    expect(west).toHaveLength(1);
    expect(east).toHaveLength(1);
    if (west[0] === undefined || east[0] === undefined) throw new Error('arch placements missing');
    expect(west[0]).toBeCloseTo(-east[0], 9);
  });

  it('omits the lower band across the portal front', () => {
    const placements = solveOk().placements;
    expect(placements.filter((p) => p.id.startsWith('central-portal/cornice-lower'))).toHaveLength(
      0,
    );
    const lowerRuns = placements.filter(
      (p) => p.partId === 'cornice-run' && p.id.includes('/cornice-lower/'),
    );
    const upperRuns = placements.filter((p) => p.id.includes('/cornice-upper/'));
    expect(lowerRuns).toHaveLength(8);
    expect(upperRuns).toHaveLength(9);
  });

  it('splits junction blocks 8 upper, 6 lower, 6 parapet', () => {
    const placements = solveOk().placements;
    const count = (fragment: string): number =>
      placements.filter((p) => p.partId === 'order-junction' && p.id.includes(`/${fragment}/`))
        .length;
    expect(count('junction-upper')).toBe(8);
    expect(count('junction-lower')).toBe(6);
    expect(count('parapet-junction')).toBe(6);
  });

  it('uses unique ids and partitions placements exactly by part', () => {
    const facade = solveOk();
    const ids = facade.placements.map((placement) => placement.id);
    expect(new Set(ids).size).toBe(ids.length);
    const grouped = Object.values(facade.byPart).flat();
    expect(grouped).toHaveLength(facade.placements.length);
    expect(new Set(grouped.map((placement) => placement.id)).size).toBe(ids.length);
  });

  it('leaves the unused surround groups empty', () => {
    const byPart = solveOk().byPart;
    const empty = Object.entries(byPart)
      .filter(([, placements]) => placements.length === 0)
      .map(([partId]) => partId);
    expect(empty).toEqual([
      'surround-row1-medium',
      'surround-row1-large',
      'surround-row2-small',
      'surround-row2-medium',
      'surround-row3-small',
      'surround-row3-medium',
      'surround-row4-medium',
      'surround-row4-large',
    ]);
  });

  it('stays inside the south envelope with finite positive transforms', () => {
    const facade = solveOk();
    for (const placement of facade.placements) {
      const { position, scale, rotationY } = placement;
      for (const value of [
        position.x,
        position.y,
        position.z,
        rotationY,
        scale.x,
        scale.y,
        scale.z,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(Math.min(scale.x, scale.y, scale.z)).toBeGreaterThan(0);
    }
    expect(checkBounds(facade.placements, SOUTH_ENVELOPE).ok).toBe(true);
  });

  it('reports outside placements when the envelope shrinks', () => {
    const placements = solveOk().placements;
    const shrunk = {
      min: SOUTH_ENVELOPE.min,
      max: { x: SOUTH_ENVELOPE.max.x, y: 5, z: SOUTH_ENVELOPE.max.z },
    };
    const check = checkBounds(placements, shrunk);
    expect(check.ok).toBe(false);
    expect(check.outsideIds.length).toBeGreaterThan(0);
  });

  it('projects the round-5 budget for a one-shadow-pass scene', () => {
    const projection = projectBudget(solveOk(), {
      shadowPasses: 1,
      otherFrameDrawCalls: 16,
      massingTriangles: 135,
      skyTriangles: 4096,
      measuredJsGzipBytes: null,
    });
    // The projection's shadow families are the casting parts only (the ONE
    // castShadow law lives on PartMeta): 21 colour families + 20 casting
    // families' shadow pass; the socle's 144 ceiling tris stay out of the
    // shadow subtotal.
    expect(projection.facadeDrawCalls).toBe(41);
    expect(projection.frameDrawCalls).toBe(57);
    expect(projection.frustumTriangles).toBe(138_495);
    expect(projection.submittedTriangleCeiling).toBe(272_615);
    expect(projection.jsGzipBytes).toBeNull();
  });

  it('rejects invalid specs explicitly without repairing them', () => {
    const wrongId = { ...SOUTH_FACADE, id: 'north' as const };
    expect(solveSouthFacade(wrongId, WINDOW_ROWS).ok).toBe(false);

    const westStretch = SOUTH_FACADE.sections.at(1);
    if (westStretch === undefined) throw new Error('south facade section 1 missing');
    const swapped = {
      ...SOUTH_FACADE,
      sections: [
        westStretch,
        ...SOUTH_FACADE.sections.slice(0, 1),
        ...SOUTH_FACADE.sections.slice(2),
      ],
    };
    expect(solveSouthFacade(swapped, WINDOW_ROWS).ok).toBe(false);

    const firstSection = SOUTH_FACADE.sections.at(0);
    if (firstSection === undefined) throw new Error('south facade section 0 missing');
    const duplicated = {
      ...SOUTH_FACADE,
      sections: SOUTH_FACADE.sections.map((section, index) =>
        index === 1 ? { ...section, id: firstSection.id } : section,
      ),
    };
    const duplicateIssues = validateSouthSpec(duplicated, WINDOW_ROWS);
    expect(duplicateIssues.length).toBeGreaterThan(0);
    expect(duplicateIssues.every((issue) => issue.code === 'spec')).toBe(true);

    const zeroAxes = {
      ...SOUTH_FACADE,
      sections: SOUTH_FACADE.sections.map((section, index) =>
        index === 0 ? { ...section, declaredAxes: 0 } : section,
      ),
    };
    expect(solveSouthFacade(zeroAxes, WINDOW_ROWS).ok).toBe(false);

    const nonfinite = { ...SOUTH_FACADE, mainLineLengthM: Number.NaN };
    expect(solveSouthFacade(nonfinite, WINDOW_ROWS).ok).toBe(false);

    const badTier = WINDOW_ROWS.map((row) =>
      row.id === 'row2' ? { ...row, tier: 'upper' as const } : row,
    );
    expect(solveSouthFacade(SOUTH_FACADE, badTier).ok).toBe(false);

    const missingRow = WINDOW_ROWS.slice(0, 3);
    expect(solveSouthFacade(SOUTH_FACADE, missingRow).ok).toBe(false);
  });

  it('emits the crease warning only against the declared 215 m', () => {
    const matching = { ...SOUTH_FACADE, creaseLineLengthM: 234 };
    expect(validateSouthSpec(matching, WINDOW_ROWS)).toHaveLength(0);
    const declared = validateSouthSpec(SOUTH_FACADE, WINDOW_ROWS);
    expect(declared).toHaveLength(1);
    expect(declared[0]?.code).toBe('crease');
    expect(declared[0]?.severity).toBe('warning');
  });
});
