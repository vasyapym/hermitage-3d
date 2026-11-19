/**
 * DEC-045, batch M1 — design §§3–4: square-kit manifest, material-name, allowance,
 * geometry and backdrop laws. Pure world metres: +X east, +Y up, +Z south.
 * The resident mounts the kit at identity; content never supplies runtime transforms.
 */
import type { Bounds, RoomBudget, RoomManifest, Vec3 } from './registry';
import { THROAT_VOID } from './throat';

export type KitAllow = Readonly<{
  meshes: number;
  tris: number;
  payloadB: number;
  texVramB: number;
}>;

export const SQUARE_KIT_URL = '/assets/square/manifest.json';
export const SQUARE_KIT_GLB = 'kit.glb';
export const KIT_NODE_PREFIX = 'el:';

export const SQUARE_KIT_ALLOW = {
  meshes: 6,
  tris: 18_000,
  payloadB: 1_500_000,
  texVramB: 8_388_608,
} satisfies KitAllow;

export const KIT_TEXTURES_ALLOWED = 0;
/** Whole-frame caps include shadow passes; these are not disposal-ledger rows. */
export const SQUARE_DRAW_CAP = 56;
export const SQUARE_TRI_CAP = 75_000;

export const SQUARE_KIT_BUDGET = {
  trianglesMax: 18_000,
  drawsMax: 6,
  textureBytesMax: 1,
  payloadBytesMax: 1_500_000,
} satisfies RoomBudget;

/**
 * The material-name bind table: every slot must resolve to the matching shared material.
 * No fallback to an imported material is legal; one unknown slot rejects the whole kit.
 */
export const KIT_BIND_KEYS = ['massing', 'dressing', 'dark-pane'] as const;
export type BindKey = (typeof KIT_BIND_KEYS)[number];

export const KIT_RAIL_CLEARANCE_M = 3;
/** The committed S0→S1 XZ segment; the excluded eye band is y = 0…3. */
export const KIT_RAIL_SEGMENT = {
  start: [-24, 0, 230],
  end: [0, 0, 124],
} satisfies Readonly<{ start: Vec3; end: Vec3 }>;

export const KIT_PORTAL_BOX = {
  xHalf: THROAT_VOID.halfWidth,
  yTop: THROAT_VOID.topY,
  zSouth: 93.5,
} satisfies Readonly<{ xHalf: number; yTop: number; zSouth: number }>;

/**
 * With no north face specified, the portal exclusion extends north from the mouth.
 * This conservatively protects the entire passage, not an invented finite-depth box.
 */
export const KIT_WORLD_LAW =
  'World metres: +X east, +Y up, +Z south; mount at identity under palace.';

export const KIT_MOUNT_ATTR = 'data-square-kit';
export const KIT_MOUNT_STATES = ['loading', 'ready', 'failed'] as const;
export type KitMountState = (typeof KIT_MOUNT_STATES)[number];

export const HQ_FACE_X = 110;
export const HQ_DEPTH_M = 24;
/** North is 8 m south of the facade face z = 92 (the corrected declared license). */
export const HQ_Z = { north: 100, south: 240 } satisfies Readonly<{
  north: number;
  south: number;
}>;
export const HQ_CORNICE_M = 20.5;
export const HQ_FLOORS = 4;
export const HQ_RUSTICATED_FLOORS = 2;
export const HQ_STRING_COURSE_Y = 9;
export const HQ_PORTICO = {
  columns: 12,
  pitchM: 4.2,
  radiusM: 0.7,
  threeQuarter: true,
  baseY: 9,
  heightM: 10.2,
  centreZ: 170,
} satisfies Readonly<{
  columns: number;
  pitchM: number;
  radiusM: number;
  threeQuarter: boolean;
  baseY: number;
  heightM: number;
  centreZ: number;
}>;
export const HQ_BAYS = 31;
export const HQ_WINDOW_ROWS_Y = [
  [1.5, 4],
  [5, 8],
  [10.5, 14],
  [15, 17.5],
] as const;
export const HQ_NODE_TRI_CAP = 1_500;

export type SquareKitNode = Readonly<{
  name: string;
  tris: number;
  aabb: Bounds;
  materials: readonly BindKey[];
}>;

export type SquareManifest = RoomManifest &
  Readonly<{
    nodes: readonly SquareKitNode[];
    glbSha256: string;
  }>;

const SHA_PATTERN = /^[0-9a-f]{64}$/;
const NODE_PATTERN = /^el:[a-z0-9-]+$/;
const RAY_EPSILON = 1e-9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function isVec3(value: unknown): value is Vec3 {
  return isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

function isBounds(value: unknown): value is Bounds {
  if (!isRecord(value) || !isVec3(value.min) || !isVec3(value.max)) return false;
  return (
    value.min[0] <= value.max[0] && value.min[1] <= value.max[1] && value.min[2] <= value.max[2]
  );
}

export function isKitNodeName(value: unknown): value is string {
  return typeof value === 'string' && NODE_PATTERN.test(value);
}

export function isKitBindKey(value: unknown): value is BindKey {
  return KIT_BIND_KEYS.some((key) => key === value);
}

function pointRectangleDistanceSq(x: number, z: number, box: Bounds): number {
  const dx = Math.max(box.min[0] - x, 0, x - box.max[0]);
  const dz = Math.max(box.min[2] - z, 0, z - box.max[2]);
  return dx * dx + dz * dz;
}

function pointSegmentDistanceSq(x: number, z: number): number {
  const a = KIT_RAIL_SEGMENT.start;
  const b = KIT_RAIL_SEGMENT.end;
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz)));
  const ex = x - (a[0] + t * dx);
  const ez = z - (a[2] + t * dz);
  return ex * ex + ez * ez;
}

function segmentCrossesRectangle(box: Bounds): boolean {
  const a = KIT_RAIL_SEGMENT.start;
  const b = KIT_RAIL_SEGMENT.end;
  let enter = 0;
  let leave = 1;
  for (const axis of [0, 2] as const) {
    const delta = b[axis] - a[axis];
    if (delta === 0) {
      if (a[axis] < box.min[axis] || a[axis] > box.max[axis]) return false;
    } else {
      const near = (box.min[axis] - a[axis]) / delta;
      const far = (box.max[axis] - a[axis]) / delta;
      enter = Math.max(enter, Math.min(near, far));
      leave = Math.min(leave, Math.max(near, far));
      if (enter > leave) return false;
    }
  }
  return true;
}

/** Exact XZ segment-to-AABB clearance, not centre-point or sampled-rail clearance. */
export function squareKitClearsRail(box: Bounds): boolean {
  if (!isBounds(box)) return false;
  if (box.max[1] < 0 || box.min[1] > 3) return true;
  if (segmentCrossesRectangle(box)) return false;

  const a = KIT_RAIL_SEGMENT.start;
  const b = KIT_RAIL_SEGMENT.end;
  let distanceSq = Math.min(
    pointRectangleDistanceSq(a[0], a[2], box),
    pointRectangleDistanceSq(b[0], b[2], box),
  );
  for (const x of [box.min[0], box.max[0]]) {
    for (const z of [box.min[2], box.max[2]]) {
      distanceSq = Math.min(distanceSq, pointSegmentDistanceSq(x, z));
    }
  }
  return distanceSq >= KIT_RAIL_CLEARANCE_M * KIT_RAIL_CLEARANCE_M;
}

/** Touching the protected portal boundary counts as intersection. */
export function squareKitClearsPortal(box: Bounds): boolean {
  if (!isBounds(box)) return false;
  return (
    box.max[0] < -KIT_PORTAL_BOX.xHalf ||
    box.min[0] > KIT_PORTAL_BOX.xHalf ||
    box.max[1] < 0 ||
    box.min[1] > KIT_PORTAL_BOX.yTop ||
    box.min[2] > KIT_PORTAL_BOX.zSouth
  );
}

/**
 * Forward XZ ray through subject. Parallel/degenerate rays and planes behind the eye
 * have no hit. The returned z is not clamped to the wall span.
 */
export function squareKitBackdropHitZ(stop: Vec3, subject: Vec3, faceX: number): number | null {
  if (!isVec3(stop) || !isVec3(subject) || !Number.isFinite(faceX)) return null;
  const dx = subject[0] - stop[0];
  if (Math.abs(dx) <= RAY_EPSILON) return null;
  const t = (faceX - stop[0]) / dx;
  if (!Number.isFinite(t) || t < 0) return null;
  const z = stop[2] + t * (subject[2] - stop[2]);
  return Number.isFinite(z) ? z : null;
}

/**
 * The kit is geometry-only: it mounts with the square's shared materials and carries
 * no baked lightmap states, so the manifest's lightmaps row is exactly the null record.
 */
function isSquareLightmaps(value: unknown): value is RoomManifest['lightmaps'] {
  if (!isRecord(value) || !isArray(value.states)) return false;
  return value.states.length === 0 && value.res === null && value.intensity === null;
}

function isBudget(value: unknown): value is RoomBudget {
  if (!isRecord(value)) return false;
  return (
    value.trianglesMax === SQUARE_KIT_BUDGET.trianglesMax &&
    value.drawsMax === SQUARE_KIT_BUDGET.drawsMax &&
    value.textureBytesMax === SQUARE_KIT_BUDGET.textureBytesMax &&
    value.payloadBytesMax === SQUARE_KIT_BUDGET.payloadBytesMax
  );
}

function isNode(value: unknown): value is SquareKitNode {
  return (
    isRecord(value) &&
    isKitNodeName(value.name) &&
    isCount(value.tris) &&
    value.tris <= HQ_NODE_TRI_CAP &&
    isBounds(value.aabb) &&
    squareKitClearsRail(value.aabb) &&
    squareKitClearsPortal(value.aabb) &&
    isArray(value.materials) &&
    value.materials.length > 0 &&
    value.materials.every(isKitBindKey)
  );
}

/**
 * Runtime shape/allowance gate. Hash syntax and manifest-row equality are checked here;
 * actual GLB digest, primitive census, COLOR_0 and world-frame identity require the chain.
 * Geometry-only means exactly one relative GLB row and no texture files.
 */
export function validateSquareManifest(json: unknown): json is SquareManifest {
  if (!isRecord(json) || json.id !== 'square') return false;
  if (!isSquareLightmaps(json.lightmaps) || !isBudget(json.budget)) return false;
  if (!isRecord(json.toolchain)) return false;
  if (!Object.values(json.toolchain).every((value) => typeof value === 'string')) return false;
  if (typeof json.glbSha256 !== 'string' || !SHA_PATTERN.test(json.glbSha256)) return false;
  if (!isArray(json.files) || json.files.length !== 1) return false;
  const file = json.files[0];
  if (
    !isRecord(file) ||
    file.path !== SQUARE_KIT_GLB ||
    file.kind !== 'glb' ||
    !isCount(file.bytes) ||
    file.bytes === 0 ||
    file.bytes > SQUARE_KIT_ALLOW.payloadB ||
    file.sha256 !== json.glbSha256
  ) {
    return false;
  }
  if (!isArray(json.nodes) || json.nodes.length > SQUARE_KIT_ALLOW.meshes) return false;

  const names = new Set<string>();
  let tris = 0;
  let draws = 0;
  for (const node of json.nodes) {
    if (!isNode(node) || names.has(node.name)) return false;
    names.add(node.name);
    tris += node.tris;
    draws += node.materials.length;
  }
  return tris <= SQUARE_KIT_ALLOW.tris && draws <= SQUARE_KIT_BUDGET.drawsMax;
}

/**
 * Corrected S0 golden prediction: gaze 5.96° + half-FOV 42.78° gives a right-edge
 * hit at x = 110, z ≈ 112.4; the facade-line hit is x ≈ 133.3.
 * The wall sliver z = 100…112.4 occupies ≈ 0.57% of frame pixels, below the 1%
 * diff budget plus AA allowance: predict no flips, not invisibility.
 * The targeted t = 0.1 battery decides; a trip requires a DEC-named re-baseline.
 */
