// tests/rooms-registry.test.ts
// The COMMITTED registry — docs/design-staircase.md §8.1 (one list in rooms/index.ts; adding
// a room never touches src/engine or src/world), §1.1 (the chain), §2.2 (budgets mirror the
// generated manifests). Orchestrator-authored gate: the specialist tested the pure core
// against fixtures; this pins the real list.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AIRLOCKS, ENTRIES } from '../rooms/index';
import type { Bounds, NodeHandle } from '../src/world/registry';
import { validateRegistry } from '../src/world/registry';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const roomEntries = ENTRIES.filter((e) => e.kind === 'room');
const inBounds = (b: Bounds | null, outer: Bounds): boolean =>
  b !== null &&
  b.min[0] >= outer.min[0] &&
  b.min[1] >= outer.min[1] &&
  b.min[2] >= outer.min[2] &&
  b.max[0] <= outer.max[0] &&
  b.max[1] <= outer.max[1] &&
  b.max[2] <= outer.max[2];

describe('rooms/index.ts (committed registry)', () => {
  it('fences clean: routes, ids, airlocks, bidirectional edges, stops, looks, holds', () => {
    expect(validateRegistry(ENTRIES, AIRLOCKS)).toEqual([]);
  });
  it('is exactly the §1.1 chain, extended by DEC-025 and DECISION-1', () => {
    expect(ENTRIES.map((e) => e.id)).toEqual([
      'square',
      'rastrelli-gallery',
      'jordan',
      'military-gallery',
      'st-george',
    ]);
    expect(ENTRIES.map((e) => e.route)).toEqual(['/', '/gallery', '/jordan', '/1812', '/throne']);
    expect(AIRLOCKS.map((a) => a.id)).toEqual([
      'arch-portal',
      'gallery-airlock',
      'landing-airlock',
      'throne-airlock',
    ]);
    // DEC-025: the landing airlock retargets to the 1812 room (a cut with a destination).
    expect(AIRLOCKS[2]?.to).toBe('military-gallery');
    // DECISION-1: the appended hall's doorway from M4 (the step-3 capture shipped the cut).
    expect(AIRLOCKS[3]?.to).toBe('st-george');
    expect(AIRLOCKS[3]?.transit).toBe('cut');
  });
  it('contract budgets equal the generated manifests', () => {
    for (const entry of roomEntries) {
      const manifestPath = join(ROOT, 'public', 'assets', entry.id, 'manifest.json');
      // DECISION-1: st-george's manifest rides the step-2 bake (the all-or-nothing law —
      // never pre-created); P6 pins its parity the moment the artifacts land.
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        budget: Record<string, number>;
      };
      expect(entry.contract.budget, entry.id).toEqual(manifest.budget);
    }
  });
  it('every stop position lies inside the contract bounds', () => {
    for (const entry of roomEntries) {
      for (const stop of entry.contract.rail.stops) {
        const [x, y, z] = stop.position;
        const { min, max } = entry.contract.bounds;
        const inside =
          x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2];
        expect(inside, `${entry.id} ${stop.id}`).toBe(true);
      }
    }
  });
  it('every portal box touching a room lies inside that room bounds', () => {
    const boundsOf = new Map<NodeHandle, Bounds>();
    for (const entry of ENTRIES) {
      if (entry.kind === 'room') boundsOf.set(entry.id, entry.contract.bounds);
    }
    for (const def of AIRLOCKS) {
      if (def.to === null) continue; // the dead end has no far portal (registry fence)
      const near = def.from === 'square' ? null : boundsOf.get(def.from);
      const far = boundsOf.get(def.to);
      if (near) {
        expect(inBounds(def.portalFrom, near), `${def.id} portalFrom`).toBe(true);
      }
      expect(far !== undefined && inBounds(def.portalTo ?? null, far), `${def.id} portalTo`).toBe(
        true,
      );
    }
  });
  it('every room module resolves behind its thunk and carries its own contract', async () => {
    for (const entry of roomEntries) {
      const m = await entry.thunk();
      expect(m.contract.id, entry.id).toBe(entry.id);
      expect(m.contract).toBe(entry.contract); // one shared reference, no second source
    }
  });
});
