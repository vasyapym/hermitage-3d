// rooms/index.ts
/**
 * The room registry list — design-staircase.md §8.1: adding a room = a folder under rooms/
 * + public/assets/<id>/ + one line here; never a change under src/engine/ or src/world/
 * (DEC-013; AGENTS.md rule 8). Contracts are static data; modules load behind their thunks
 * (lazy chunks). Portal boxes are true coordinates (§2.4); holdMs is the threshold card's
 * MINIMUM DWELL — 800 ms on every card, doorway or cut (the 2026-11-01 owner reading-fix:
 * the R-UX1 ~300 ms cinema cut-to-black window dismissed the title in ≈ 0.2 s, and the
 * former 600 ms cuts joined the same window; design-walkthrough-ux.md §4).
 * Verified against the rail at r18: the keyboard walk observed every airlock firing through
 * its portal box, forward and backward.
 */
import type { AirlockDef, RegistryEntry } from '../src/world/registry';
import { contract as militaryContract } from './1812/contract';
import { contract as jordanContract } from './jordan/contract';
import { contract as galleryContract } from './rastrelli-gallery/contract';

export const AIRLOCKS: readonly AirlockDef[] = [
  {
    id: 'arch-portal',
    from: 'square',
    to: 'rastrelli-gallery',
    portalFrom: { min: [-3, 0, 86.5], max: [3, 6, 88.5] },
    portalTo: { min: [-3, 0, 85.5], max: [3, 3.6, 87.5] },
    transit: 'doorway',
    holdMs: 800,
  },
  {
    id: 'gallery-airlock',
    from: 'rastrelli-gallery',
    to: 'jordan',
    portalFrom: { min: [43, 0, 70], max: [44, 3.6, 76] },
    // R-UX5 (§6, D6): the box moves with J0 — the arrival is a 2.5 m push-in up the flight's
    // own axis (centre (67.2, 1.7, −63.6), 4.0 m south of J0); the vestibule drops out of
    // the visit. Declared by the specialist, orchestrator-owned data, framed by capture.
    portalTo: { min: [66.2, 0, -64.6], max: [68.2, 3.4, -62.6] },
    transit: 'doorway',
    holdMs: 800,
  },
  {
    id: 'landing-airlock',
    from: 'jordan',
    // DEC-025: the dead end retargets to the 1812 room; the transit stays a cut. The jordan
    // box does not move (golden protection, §9); the 1812 box is 2×2×3 m enclosing M0's eye
    // (86.25, 11.65, −38) — the committed J0 convention (the box moves with the entry stop).
    to: 'military-gallery',
    portalFrom: { min: [81, 10, -80], max: [84, 13.5, -77] },
    portalTo: { min: [85.25, 10, -39], max: [87.25, 13, -37] },
    transit: 'cut',
    holdMs: 800,
  },
];

export const ENTRIES: readonly RegistryEntry[] = [
  {
    kind: 'resident',
    id: 'square',
    route: '/',
    neighbors: [{ to: 'rastrelli-gallery', airlock: 'arch-portal' }],
  },
  {
    kind: 'room',
    id: 'rastrelli-gallery',
    route: '/gallery',
    contract: galleryContract,
    thunk: () => import('./rastrelli-gallery/room').then((m) => m.room),
  },
  {
    kind: 'room',
    id: 'jordan',
    route: '/jordan',
    contract: jordanContract,
    thunk: () => import('./jordan/room').then((m) => m.room),
  },
  {
    kind: 'room',
    id: 'military-gallery',
    route: '/1812',
    contract: militaryContract,
    thunk: () => import('./1812/room').then((m) => m.room),
  },
];
