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
    // mg-1812-look DECISION-1: the east doorway is a real opening now — the beats are the
    // 'doorway' class (the closed-decor cut retires with the fallback it shipped).
    expect(AIRLOCKS[3]?.to).toBe('st-george');
    expect(AIRLOCKS[3]?.transit).toBe('doorway');
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
  it('every portal box touching a room lies inside the endpoint rooms\u2019 bounds union', () => {
    // mg-1812-look DECISION-1 amendment: a DECLARED doorway's departure box straddles the
    // shared wall plane (the arch-portal's shape — its mouth sits in the throat between the
    // two shells), so the fence widens from "inside the near room" to "inside the two
    // endpoint rooms' bounds union". Every pre-round box already satisfies the union.
    const boundsOf = new Map<NodeHandle, Bounds>();
    for (const entry of ENTRIES) {
      if (entry.kind === 'room') boundsOf.set(entry.id, entry.contract.bounds);
    }
    const union = (a: Bounds | undefined, b: Bounds | undefined): Bounds | null => {
      if (a === undefined && b === undefined) return null;
      if (a === undefined) return b ?? null;
      if (b === undefined) return a;
      return {
        min: [
          Math.min(a.min[0], b.min[0]),
          Math.min(a.min[1], b.min[1]),
          Math.min(a.min[2], b.min[2]),
        ],
        max: [
          Math.max(a.max[0], b.max[0]),
          Math.max(a.max[1], b.max[1]),
          Math.max(a.max[2], b.max[2]),
        ],
      };
    };
    for (const def of AIRLOCKS) {
      if (def.to === null) continue; // the dead end has no far portal (registry fence)
      const near = boundsOf.get(def.from);
      const far = boundsOf.get(def.to);
      // The square is a resident without bounds: its side's box stays unchecked (the old
      // law's shape — the throat belongs to no room).
      if (near !== undefined) {
        const hull = union(near, far);
        if (hull !== null) {
          expect(inBounds(def.portalFrom, hull), `${def.id} portalFrom in the union`).toBe(true);
        }
      }
      if (far !== undefined) {
        const farHull = union(far, near);
        if (farHull !== null) {
          expect(inBounds(def.portalTo ?? null, farHull), `${def.id} portalTo in the union`).toBe(
            true,
          );
        }
      }
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
