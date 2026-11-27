// tests/world-registry.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  type AirlockDef,
  type Bounds,
  nextAirlockOnPath,
  type RegistryEntry,
  type RoomBudget,
  type RoomContract,
  type RoomEntry,
  type RoomId,
  type RoomModule,
  type RoomNeighbor,
  type RouteKey,
  resolveRoute,
  routeKeyOf,
  type Stop,
  validateRegistry,
} from '../src/world/registry';

const box: Bounds = { min: [0, 0, 0], max: [1, 1, 1] };
const stop: Stop = {
  id: 's0',
  position: [0, 1.6, 0],
  subject: null, // the pose law: the next stop's position, the last stop looks back
  look: { yaw: 45, pitchUp: 20, pitchDown: 15 },
  caption: 'caption.s0', // fixtures never resolve captions; the key just has to typecheck
};
const budget: RoomBudget = { trianglesMax: 1, drawsMax: 1, textureBytesMax: 1, payloadBytesMax: 1 };
const thunk = (): Promise<RoomModule> => Promise.reject(new Error('fixture thunk'));
const contract = (
  id: RoomId,
  neighbors: readonly RoomNeighbor[],
  stops = [stop],
): RoomContract => ({
  id,
  title: 'data.titleGallery', // fixtures never resolve titles; the key just has to typecheck
  bounds: box,
  rail: { stops },
  lighting: { states: ['day'], blend: 'lightmapBlend' },
  neighbors,
  budget,
});
const airlocks: readonly AirlockDef[] = [
  {
    id: 'arch-portal',
    from: 'square',
    to: 'rastrelli-gallery',
    portalFrom: box,
    portalTo: box,
    transit: 'doorway',
    holdMs: 900,
    headingFrom: null,
    headingTo: null,
  },
  {
    id: 'gallery-airlock',
    from: 'rastrelli-gallery',
    to: 'jordan',
    portalFrom: box,
    portalTo: box,
    transit: 'doorway',
    holdMs: 900,
    headingFrom: null,
    headingTo: null,
  },
  {
    id: 'landing-airlock',
    from: 'jordan',
    to: null,
    portalFrom: box,
    portalTo: null,
    transit: 'doorway',
    holdMs: 900,
    headingFrom: null,
    headingTo: null,
  },
];
const roomEntry = (id: RoomId, route: RouteKey): RoomEntry => ({
  kind: 'room',
  id,
  route,
  contract: contract(
    id,
    id === 'rastrelli-gallery'
      ? [
          { to: 'square', airlock: 'arch-portal' },
          { to: 'jordan', airlock: 'gallery-airlock' },
        ]
      : [
          { to: 'rastrelli-gallery', airlock: 'gallery-airlock' },
          { to: null, airlock: 'landing-airlock' },
        ],
  ),
  thunk,
});
const list: readonly RegistryEntry[] = [
  {
    kind: 'resident',
    id: 'square',
    route: '/',
    neighbors: [{ to: 'rastrelli-gallery', airlock: 'arch-portal' }],
  },
  roomEntry('rastrelli-gallery', '/gallery'),
  roomEntry('jordan', '/jordan'),
];
// Fixture-known indexes: fail the collection (not the test) if the fixture shape drifts.
const at = (index: number): RegistryEntry => {
  const hit = list[index];
  if (hit === undefined) throw new Error(`fixture: missing entry ${index}`);
  return hit;
};

describe('routeKeyOf', () => {
  it('reads only the path before the query', () => {
    expect(routeKeyOf('#/gallery?at=x').route).toBe('/gallery');
    expect(routeKeyOf('#/').route).toBe('/');
    expect(routeKeyOf('').route).toBe('/');
    expect(routeKeyOf('#/jordan').route).toBe('/jordan');
    expect(routeKeyOf('#/jordan?cam=1&q=2').route).not.toContain('?');
  });
});

describe('resolveRoute', () => {
  it('maps known routes and falls back to square', () => {
    expect(resolveRoute(list, '#/gallery?at=1').node).toBe('rastrelli-gallery');
    expect(resolveRoute(list, '#/jordan').node).toBe('jordan');
    expect(resolveRoute(list, '#/').node).toBe('square');
    const unknown = resolveRoute(list, '#/foo');
    expect(unknown.node).toBe('square');
    expect(unknown.issues).toEqual(['unknown-route']);
  });
});

describe('validateRegistry', () => {
  it('accepts the phase-2 chain', () => {
    expect(validateRegistry(list, airlocks)).toEqual([]);
  });
  it('flags a duplicate route', () => {
    const dup = roomEntry('jordan', '/gallery');
    expect(validateRegistry([at(0), at(1), dup], airlocks)).toContain('duplicate-route');
  });
  it('flags a missing airlock', () => {
    const missing = airlocks.filter((a) => a.id !== 'arch-portal');
    expect(validateRegistry(list, missing)).toContain('unknown-airlock');
  });
  it('flags a unidirectional edge mismatch', () => {
    const bad: RegistryEntry = {
      kind: 'resident',
      id: 'square',
      route: '/',
      neighbors: [{ to: 'jordan', airlock: 'arch-portal' }],
    };
    expect(validateRegistry([bad, at(1), at(2)], airlocks)).toContain('edge-mismatch');
  });
  it('flags a lazy room without stops', () => {
    const empty = roomEntry('jordan', '/jordan');
    const stripped: RoomContract = { ...empty.contract, rail: { stops: [] } };
    expect(validateRegistry(list, airlocks)).toEqual([]);
    expect(validateRegistry([at(0), at(1), { ...empty, contract: stripped }], airlocks)).toContain(
      'no-stops',
    );
  });
  it('flags a dead end with a far portal', () => {
    const bad = airlocks.map((a) => (a.to === null ? { ...a, portalTo: box } : a));
    expect(validateRegistry(list, bad)).toContain('dead-end-portal');
  });
  it('flags a contract id mismatch and a hold without time', () => {
    const swapped = roomEntry('jordan', '/jordan');
    expect(
      validateRegistry(
        [at(0), at(1), { ...swapped, contract: contract('rastrelli-gallery', []) }],
        airlocks,
      ),
    ).toContain('contract-mismatch');
    const arch = airlocks[0];
    if (arch === undefined) throw new Error('fixture: missing airlock');
    expect(validateRegistry(list, [{ ...arch, holdMs: 0 }])).toContain('bad-hold');
  });
});

describe('nextAirlockOnPath', () => {
  it('returns the first step and null at the destination', () => {
    expect(nextAirlockOnPath(list, airlocks, 'square', 'jordan')?.id).toBe('arch-portal');
    expect(nextAirlockOnPath(list, airlocks, 'rastrelli-gallery', 'jordan')?.id).toBe(
      'gallery-airlock',
    );
    expect(nextAirlockOnPath(list, airlocks, 'jordan', 'square')?.id).toBe('gallery-airlock');
    expect(nextAirlockOnPath(list, airlocks, 'rastrelli-gallery', 'square')?.id).toBe(
      'arch-portal',
    );
    expect(nextAirlockOnPath(list, airlocks, 'jordan', 'jordan')).toBeNull();
  });
});

describe('purity', () => {
  it('imports no three/node and touches no host globals', () => {
    const src = readFileSync(new URL('../src/world/registry.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/from\s+['"]three/);
    expect(src).not.toMatch(/from\s+['"]node:/);
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
    expect(stripped).not.toMatch(/\b(document|window|localStorage|performance|Date|setTimeout)\b/);
    expect(stripped).not.toMatch(/Math\.random/);
  });
});
