/*
 * Type declarations for tools/st-george/law.mjs.
 * DECISION-1 step 1 and P7: direct pure-library imports with allowJs disabled.
 */

export type Vec3 = [number, number, number];
export type Visibility = 'exported' | 'bake-only';
export type ConstantValue = string | number | boolean | null;

export interface TaggedConstant {
  kind: string;
  value: ConstantValue;
  source: string | null;
}

export interface Stop {
  id: string;
  position: Vec3;
  subject: Vec3;
  look: {
    yaw: number;
    pitchUp: number;
    pitchDown: number;
  };
  source: string;
}

export interface Witness {
  stop: string;
  edge: number;
  t: number;
}

export interface FaceGeometry {
  vertices: Vec3[];
  normal: Vec3;
}

export interface Face extends FaceGeometry {
  id: string;
  materialSlot: number;
  tessellation: {
    kind: 'bilinear-grid' | 'first-vertex-fan';
    u: number;
    v: number;
  };
  triangles: number;
  area: number;
  visibility: Visibility;
  witness: Witness | null;
}

export interface Instance {
  id: string;
  position: Vec3;
  faces: Face[];
  size?: Vec3 | null;
  min?: Vec3 | null;
  max?: Vec3 | null;
  vertices?: Vec3[] | null;
  ring?: Vec3[][] | null;
}

export interface ElementClass {
  id: string;
  source: string;
  count: number | null;
  instances: Instance[];
  UNSOURCED?: boolean | null;
  missingConstant?: string | null;
  drawing?: string | null;
  palette?: string | null;
  figureRuling?: string | null;
  placementRule?: {
    axis: string;
    fixedZ: number;
    xRange: number[];
    positions: Vec3[];
    source: string;
    status: string;
  } | null;
}

export interface Frame {
  X0: number;
  AXIS_Z: number;
  FLOOR_Y: number;
  CEILING_Y: number;
  source: string;
  bounds: {
    min: Vec3;
    max: Vec3;
    source: string;
  };
}

export interface Caps {
  triangles: number;
  draws: number;
  textureBytes: number;
  payloadBytes: number;
}

export interface Subcaps {
  lightmaps: number;
  plates: number;
  probe: number;
  source: string;
}

export interface MaterialSlot {
  slot: number;
  id: string;
  source: string;
  authoredStep: number;
  drawRule: string;
  step2Fallback: string;
}

export interface Design {
  source: string;
  pairHalfPitch: number;
  columnInsetWidth: number;
  columnRadiusWidth: number;
  columnHeight: number;
  baseHeight: number;
  capitalHeight: number;
  capitalRadius: number;
  shaftStrips: number;
  windowWidthPitch: number;
  windowHeight: number;
  lowerWindowCentre: number;
  upperWindowCentre: number;
  balconyInnerWidth: number;
  balconyHeight: number;
  balconyThickness: number;
  railingHeight: number;
  railingThicknessWidth: number;
  plateOffsetWidth: number;
  atlasSize: number;
  shellAtlasSize: number;
  atlasOccupancy: number;
  lightmapBytesPerState: number;
  plateBytesEach: number;
  probeBytes: number;
  geometryBytesPerDrawnTriangle: number;
  containerBytes: number;
}

export interface Law {
  schema: string;
  sources: Record<string, string>;
  constants: Record<string, TaggedConstant>;
  frame: Frame;
  design: Design;
  box: { min: Vec3; max: Vec3 };
  grid: {
    source: string;
    bayCount: number;
    bayPitch: number;
    origin: number;
    stationXs: number[];
    derivation: string;
  };
  rail: Stop[];
  visibilityRule: {
    source: string;
    cosineYaw: number;
    tangents: Record<number, number>;
    samples: string;
    eyes: string;
    occlusion: string;
  };
  materialSlots: MaterialSlot[];
  classes: ElementClass[];
  lighting: {
    atlasSize: number;
    states: string[];
    probes: string[];
    lmChart: {
      canvasM: number;
      padPx: number;
      minPx: number;
      occupancy: number;
      patchCount: number;
      totalPatchArea: number;
      shellRes: number;
      finalRes: number;
      densityShellPxPerM: number;
      densityFinalPxPerM: number;
    };
    source: string;
  };
  caps: Caps;
}

export interface CensusRow {
  id: string;
  count: number | null;
  placedCount: number;
  triangles: {
    drawn: number;
    unique: number;
    bakeOnly: number;
    basis: string;
  };
  materialSlots: number[];
  visibility: Visibility | 'mixed';
  exportedFaces: number;
  bakeOnlyFaces: number;
  lightmap: {
    islandClass: string;
    texelsPerMetreFinal: number;
    texelsPerMetreShell: number;
  };
  flags: {
    bands: string;
    ghostSplit: string;
    deadCells: string;
    junctionRelief: string;
    winding: string;
    paneOrientation: string;
    encoderParity: string;
    UNSOURCED: boolean;
  };
}

export interface Census {
  schema: string;
  source: string;
  status: string;
  drawRule: string;
  rows: CensusRow[];
  totals: Caps & {
    uniqueTriangles: number;
    bakeOnlyTriangles: number;
  };
  caps: Caps;
  subcaps: Subcaps;
  maximumCapFraction: number;
  textureReservations: {
    lightmaps: number;
    plates: number;
    probe: number;
  };
  lightmap: {
    exportedArea: number;
    totalPatchArea: number;
    patchCount: number;
    canvasM: number;
    finalAtlasSize: number;
    shellAtlasSize: number;
    texelsPerMetreFinal: number;
    texelsPerMetreShell: number;
    shellScale: number;
  };
  deferred: string[];
}

export const SOURCES: Record<string, string>;
export const CONSTANTS: Record<string, TaggedConstant>;
export const X0: number;
export const AXIS_Z: number;
export const FLOOR_Y: number;
export const CEILING_Y: number;
export const FRAME: Frame;
export const COS_YAW: number;
export const TANGENTS: Record<number, number>;
export const RAIL: Stop[];
export const CAPS: Caps;
export const SUBCAPS: Subcaps;
export const DESIGN: Design;

export function refuse(message: string): never;
export function validateConstants(constants?: Record<string, TaggedConstant>): void;
export function validateFrame(length: number, width: number): void;
export function subtract(a: Vec3, b: Vec3): Vec3;
export function dot(a: Vec3, b: Vec3): number;
export function cross(a: Vec3, b: Vec3): Vec3;
export function centreOf(vertices: Vec3[]): Vec3;
export function areaOf(vertices: Vec3[]): number;
export function railWitness(face: FaceGeometry): Witness | null;
export function seenFromRail(face: FaceGeometry): boolean;
export function buildLaw(): Law;
export function validatePlan(law: Law): void;
export function buildCensus(law?: Law): Census;
export function sortKeysDeep(value: unknown): unknown;
export function serializeLaw(law: Law): string;
export function serializeCensus(census: Census): string;
