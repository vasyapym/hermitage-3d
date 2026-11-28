/*
 * DECISION-1: SHAPE, FRAME, P7 and step 1; brief: SOURCED CONSTANTS,
 * SEEN-FROM-RAIL, LAW.JSON and determinism fence.
 *
 * Surface patches are explicit, ordered polygons. Their tessellation is data:
 * a quad's u/v counts prescribe a regular bilinear grid, not another room law.
 * Polygon caps use a first-vertex fan. No instancing is assumed in the census.
 *
 * Visibility uses the five specified stop eyes. The witness is an actual stop,
 * never an invented camera. A face is visible from a stop when the stop's look
 * cone — yaw measured on the HORIZONTAL projection, pitch separately limited —
 * intersects the face's polygon; the intersection is decided EXACTLY per edge
 * by quadratic t-intervals, so a face whose interior crosses the cone while no
 * sampled point does is still found. This is a deterministic visibility
 * certificate, not an occlusion test.
 *
 * All small geometry ratios below are DESIGN choices, not historical claims.
 * Failure flags distinguish plan checks from checks awaiting actual bakes.
 */

export const SOURCES = {
  A:
    'Brief SOURCES Row A: official Hermitage EN, archived 2018; 800 m², ' +
    'two window tiers, double Corinthian columns; original interior.',
  B:
    'Brief SOURCES Row B: ru.wikipedia, Георгиевский (Большой тронный) ' +
    'зал Зимнего дворца; approximately 800 m², paired wall columns.',
  C:
    'Brief SOURCES Row C: post-1837 Stasov restoration; white Carrara ' +
    'marble walls and columns; official museum corroboration.',
  D:
    'Brief SOURCES Row D: sixteen woods; parquet repeats ceiling divisions ' +
    'and ornament, except state symbols.',
  E: 'Brief SOURCES Row E: marble Saint George and dragon relief above throne.',
  F:
    'Brief SOURCES Row F: Ukhtomsky, Георгиевский зал, 1862; observed gilt ' +
    'multi-tier chandeliers along axis; total count not established.',
  G: 'Brief SOURCES Row G: crimson canopy and stepped throne dais.',
  H:
    'Brief SOURCES Row H: double-headed eagle observed in 1862 watercolour ' +
    'and 2015 photograph; observed, not text-confirmed.',
  I: 'Brief SOURCES Row I: long-wall balcony galleries observed in primary visuals.',
  J:
    'Brief SOURCES Row J: east palace block; west approach, east throne inferred ' +
    'from text and plans and fixed in-world by committed doors.',
  K: 'Brief SOURCES Row K: Stasov white-marble interior, throne restored by 2000.',
  L:
    'Brief SOURCES (observed): К. А. Ухтомский, «Виды залов Зимнего дворца. ' +
    'Георгиевский зал», 1862 watercolour — the restored hall as built: ' +
    'Corinthian capitals on the paired columns (row F shares this source).',
  FRAME:
    'DECISION-1 FRAME and Amendments; rooms/1812/contract.ts lines 9–14, ' +
    '29–30, 45, 93–98; X0 91, axis 14.5, floor 10, eye 11.65.',
  BOUNDS: 'DECISION-1 step-0 P5 amendment: [91,9.5,5] to [139,20.5,24].',
  DESIGN:
    'DECISION-1 adopted design: L 47, W 17, 48 design columns; ' +
    'not historical measurements or a historically confirmed column count.',
  DETAIL:
    'Step-1 implementation design choices under DECISION-1 SHAPE: ' +
    'stylised capitals, neutral shell, plates, two reserved heroes; ' +
    'ratios and tessellation are artistic construction, not historical evidence.',
  RAIL: 'DECISION-1 CONTRACT and re-anchored brief FRAME: H0–H4 and subjects.',
  ANGLES: 'Brief SEEN-FROM-RAIL: pinned binary64 cosine/tangent literals.',
  BUDGET: 'DECISION-1 CONTRACT, BUDGET ROW and P7; estimates, not asset measurements.',
};

export const CONSTANTS = {
  AREA: { kind: 'historical', value: 800, source: 'A' },
  COLUMN_ARRANGEMENT: {
    kind: 'historical',
    value: 'paired columns along the walls',
    source: 'B',
  },
  COLUMN_ORDER: {
    kind: 'observed',
    value: 'Corinthian capitals on the restored paired columns',
    source: 'L',
  },
  CHANDELIER_COUNT: {
    kind: 'licence',
    value: 5,
    source: 'F',
    licence: 'AL-SG-2',
    derivation: 'one fixture per two window bays of the 12-bay tier',
  },
  MARBLE: {
    kind: 'historical',
    value: 'white Carrara marble walls and columns',
    source: 'C',
  },
  WINDOW_TIERS: { kind: 'historical', value: 2, source: 'A' },
  PARQUET_WOODS: { kind: 'historical', value: 16, source: 'D' },
  PARQUET_RULE: {
    kind: 'historical',
    value: 'repeat ceiling divisions and ornament, excluding state symbols',
    source: 'D',
  },
  RELIEF: {
    kind: 'historical',
    value: 'white marble Saint George spearing the dragon above throne',
    source: 'E',
  },
  CHANDELIER_FORM: {
    kind: 'observed',
    value: 'gilded multi-tier; line along hall axis',
    source: 'F',
  },
  CANOPY: { kind: 'historical', value: 'crimson canopy', source: 'G' },
  DAIS: { kind: 'historical', value: 'stepped throne dais', source: 'G' },
  EAGLE: { kind: 'observed', value: 'double-headed eagle plate', source: 'H' },
  BALCONIES: {
    kind: 'observed',
    value: 'galleries along both long walls',
    source: 'I',
  },
  ORIENTATION: {
    kind: 'inferred',
    value: 'west entrance, east throne; east palace block',
    source: 'J',
  },
  ERA: {
    kind: 'historical',
    value: 'Stasov restoration, throne and canopy restored by 2000',
    source: 'K',
  },
  L: { kind: 'design', value: 47, source: 'DESIGN' },
  W: { kind: 'design', value: 17, source: 'DESIGN' },
  COLUMN_COUNT: { kind: 'design', value: 48, source: 'DESIGN' },
};

export const X0 = 91;
export const AXIS_Z = 14.5;
export const FLOOR_Y = 10;
export const CEILING_Y = 20;

export const FRAME = {
  X0,
  AXIS_Z,
  FLOOR_Y,
  CEILING_Y,
  source: 'FRAME',
  bounds: {
    min: [X0, FLOOR_Y - 0.5, AXIS_Z - 9.5],
    max: [X0 + 48, CEILING_Y + 0.5, AXIS_Z + 9.5],
    source: 'BOUNDS',
  },
};

/* These are angles encoded as exact source literals, not runtime trig. */
export const COS_YAW = 0.8191520442889918; // cos(35 degrees).
export const TANGENTS = {
  15: 0.2679491924311227, // tan(15 degrees).
  20: 0.36397023426620234, // tan(20 degrees).
  25: 0.4663076581549986, // tan(25 degrees).
  35: 0.7002075382097097, // tan(35 degrees).
  40: 0.8390996311772799, // tan(40 degrees).
};

export const RAIL = [
  {
    id: 'H0',
    position: [X0 + 2.5, FLOOR_Y + 1.65, AXIS_Z],
    subject: [X0 + 45, FLOOR_Y + 2.9, AXIS_Z],
    look: { yaw: 35, pitchUp: 40, pitchDown: 15 },
    source: 'RAIL',
  },
  {
    id: 'H1',
    position: [X0 + 12, FLOOR_Y + 1.65, AXIS_Z],
    subject: [X0 + 45, FLOOR_Y + 5.2, AXIS_Z],
    look: { yaw: 35, pitchUp: 40, pitchDown: 20 },
    source: 'RAIL',
  },
  {
    id: 'H2',
    position: [X0 + 23.5, FLOOR_Y + 1.65, AXIS_Z],
    subject: [X0 + 39, CEILING_Y - 0.1, AXIS_Z],
    look: { yaw: 35, pitchUp: 25, pitchDown: 40 },
    source: 'RAIL',
  },
  {
    id: 'H3',
    position: [X0 + 33, FLOOR_Y + 1.65, AXIS_Z],
    subject: [X0 + 45, FLOOR_Y + 2.9, AXIS_Z],
    look: { yaw: 35, pitchUp: 35, pitchDown: 25 },
    source: 'RAIL',
  },
  {
    id: 'H4',
    position: [X0 + 39.5, FLOOR_Y + 1.65, AXIS_Z],
    subject: [X0 + 46.6, FLOOR_Y + 6.6, AXIS_Z],
    look: { yaw: 35, pitchUp: 25, pitchDown: 35 },
    source: 'RAIL',
  },
];

export const CAPS = {
  triangles: 70_000,
  draws: 24,
  textureBytes: 2_400_000,
  payloadBytes: 4_000_000,
};

/*
 * The record's texture subcaps (the BUDGET ROW's parenthetical), gated at the
 * same 85 % admission fraction as the room-wide caps (review finding R1).
 */
export const SUBCAPS = {
  lightmaps: 1_500_000,
  plates: 550_000,
  probe: 8_000,
  source: 'BUDGET',
};

/*
 * DESIGN construction parameters. Fractions refer to L, W or room height.
 * 96 vertical shaft strips preserve a roughly 32–40k drawn-triangle plan;
 * this is an explicit stylisation/tessellation choice, not measured detail.
 * The support chain is one height: the balcony deck's underside sits on the
 * capital tops (columnHeight), and the upper window tier is clerestory above
 * the deck slab (review findings R5/R6).
 */
export const DESIGN = {
  source: 'DETAIL',
  pairHalfPitch: 1 / 8,
  columnInsetWidth: 1 / 16,
  columnRadiusWidth: 1 / 48,
  columnHeight: 0.68,
  baseHeight: 0.032,
  capitalHeight: 0.045,
  capitalRadius: 1.5,
  shaftStrips: 96,
  windowWidthPitch: 0.46,
  windowHeight: 0.22,
  lowerWindowCentre: 0.27,
  upperWindowCentre: 0.825,
  balconyInnerWidth: 0.38,
  balconyHeight: 0.68,
  balconyThickness: 0.025,
  railingHeight: 0.075,
  railingThicknessWidth: 1 / 160,
  plateOffsetWidth: 1 / 2000,
  atlasSize: 2048,
  shellAtlasSize: 1024,
  atlasOccupancy: 0.7,
  lightmapBytesPerState: 420_000,
  plateBytesEach: 150_000,
  probeBytes: 6_800,
  geometryBytesPerDrawnTriangle: 24,
  containerBytes: 65_536,
};

/* sqrt(2)-1, pinned; unit chamfered octagon in the x/z plane. */
const CHAMFER = 0.4142135623730951;
const RING = [
  [1, CHAMFER],
  [CHAMFER, 1],
  [-CHAMFER, 1],
  [-1, CHAMFER],
  [-1, -CHAMFER],
  [-CHAMFER, -1],
  [CHAMFER, -1],
  [1, -CHAMFER],
];

export function refuse(message) {
  throw new Error(`st-george-law: ${message}`);
}

/* The rows that carry the repo's own decisions, not historical evidence. */
const DESIGN_SOURCES = new Set(['FRAME', 'BOUNDS', 'DESIGN', 'DETAIL', 'RAIL', 'ANGLES', 'BUDGET']);

export function validateConstants(constants = CONSTANTS) {
  for (const [name, entry] of Object.entries(constants)) {
    if (entry.value === null || !entry.source || !SOURCES[entry.source]) {
      refuse(`${name} has no source row`);
    }
    const designRow = DESIGN_SOURCES.has(entry.source);
    if (entry.kind === 'design' && !designRow) {
      refuse(`${name} claims design authority from a non-design row ${entry.source}`);
    }
    if (entry.kind !== 'design' && designRow) {
      refuse(`${name} claims ${entry.kind} evidence from a design row ${entry.source}`);
    }
  }
}

export function validateFrame(length, width) {
  const area = CONSTANTS.AREA.value;
  // The rounded historical area permits a two-percent discrepancy.
  if (Math.abs(length * width - area) > area * 0.02) {
    refuse(`frame L×W = ${length * width} m² contradicts the sourced area 800 m² ± 2 %`);
  }
}

export function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function centreOf(vertices) {
  const sum = [0, 0, 0];
  for (const vertex of vertices) {
    for (let axis = 0; axis < 3; axis += 1) sum[axis] += vertex[axis];
  }
  return sum.map((value) => value / vertices.length);
}

function normalOf(vertices, id) {
  const vector = cross(subtract(vertices[1], vertices[0]), subtract(vertices[2], vertices[0]));
  const length = Math.sqrt(dot(vector, vector));
  if (!(length > 0)) refuse(`face ${id} is degenerate`);
  return vector.map((value) => value / length);
}

export function areaOf(vertices) {
  let area = 0;
  for (let i = 1; i < vertices.length - 1; i += 1) {
    const vector = cross(
      subtract(vertices[i], vertices[0]),
      subtract(vertices[i + 1], vertices[0]),
    );
    area += Math.sqrt(dot(vector, vector)) / 2;
  }
  return area;
}

/*
 * The exact per-edge look-cone test (review finding R2). For the segment
 * P(t) = a + t·(b − a), t ∈ [0, 1], a point is inside the stop's look cone when
 *   yaw:   dx ≥ 0 and sin²yaw·dx² ≥ cos²yaw·dz²   (dx/horizontal ≥ cos yaw,
 *          squared under the signed guard; horizontal² = dx² + dz²)
 *   pitch: −tanDown ≤ dy/horizontal ≤ tanUp, where each bound is either
 *          signed-away (dy ≤ 0 clears the upper; dy ≥ 0 clears the lower) or
 *          bounded by the squared form dy² ≤ tan²·(dx² + dz²).
 * Every condition's solution on [0, 1] is a union of a few closed intervals
 * (quadratic roots, or a linear sign half); the edge is seen when the
 * intersection is non-empty. Squaring is exact because every dropped side is
 * provably signed. For a CONVEX face, vertex-in-cone and edge-crossing cases
 * are both covered by the edge intervals, so the test is exact, not a sample.
 * The measure-zero case of a segment passing through the eye itself would be
 * admitted by the closed intervals; no edge on this plan comes within metres
 * of an eye, and the front-facing check runs first.
 */

function linearIntervals(slope, intercept) {
  if (slope === 0) return intercept >= 0 ? [[0, 1]] : [];
  const t0 = -intercept / slope;
  return slope > 0 ? clipIntervals([[t0, 1]]) : clipIntervals([[0, t0]]);
}

function quadraticIntervals(a, b, c) {
  if (a === 0) return linearIntervals(b, c);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return a > 0 ? [[0, 1]] : [];
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  const t1 = (-b + root) / (2 * a);
  return a > 0
    ? clipIntervals([
        [0, Math.min(t0, t1)],
        [Math.max(t0, t1), 1],
      ])
    : clipIntervals([[Math.min(t0, t1), Math.max(t0, t1)]]);
}

function clipIntervals(list) {
  const out = [];
  for (const interval of list) {
    const lo = Math.max(interval[0], 0);
    const hi = Math.min(interval[1], 1);
    if (lo <= hi) out.push([lo, hi]);
  }
  return out;
}

function unionIntervals(left, right) {
  const merged = [...left, ...right].sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of merged) {
    const last = out[out.length - 1];
    if (last !== undefined && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

function intersectIntervals(left, right) {
  const out = [];
  for (const [a0, a1] of left) {
    for (const [b0, b1] of right) {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (lo <= hi) out.push([lo, hi]);
    }
  }
  return out;
}

function edgeInLook(a, b, stop) {
  const dx0 = a[0] - stop.position[0];
  const dy0 = a[1] - stop.position[1];
  const dz0 = a[2] - stop.position[2];
  const ddx = b[0] - a[0];
  const ddy = b[1] - a[1];
  const ddz = b[2] - a[2];
  const cosSq = COS_YAW * COS_YAW;
  const sinSq = 1 - cosSq;
  // The pinned binary64 literals hit for the stops' own integer angles; the swept eyes
  // BETWEEN stops carry interpolated (fractional) pitches — TANGENTS[fraction] is
  // undefined and the squared intervals would go NaN-silent. Math.tan is byte-identical
  // to every pinned literal, so the certificate's arithmetic is unchanged where the
  // table hits and the interpolated eyes read their limits as the sweep documents.
  const tangentUp = TANGENTS[stop.look.pitchUp] ?? Math.tan((stop.look.pitchUp * Math.PI) / 180);
  const tangentDown =
    TANGENTS[stop.look.pitchDown] ?? Math.tan((stop.look.pitchDown * Math.PI) / 180);
  const horizontalSqA = ddx * ddx + ddz * ddz;
  const horizontalSqB = 2 * (dx0 * ddx + dz0 * ddz);
  const horizontalSqC = dx0 * dx0 + dz0 * dz0;

  // yaw(t): dx ≥ 0 and sin²yaw·dx² − cos²yaw·dz² ≥ 0.
  let intervals = intersectIntervals(
    linearIntervals(ddx, dx0),
    quadraticIntervals(
      sinSq * ddx * ddx - cosSq * ddz * ddz,
      2 * (sinSq * dx0 * ddx - cosSq * dz0 * ddz),
      sinSq * dx0 * dx0 - cosSq * dz0 * dz0,
    ),
  );

  // Upper pitch(t): dy ≤ 0, or dy > 0 and tanUp²·h² − dy² ≥ 0.
  const upperA = tangentUp * tangentUp * horizontalSqA - ddy * ddy;
  const upperB = tangentUp * tangentUp * horizontalSqB - 2 * dy0 * ddy;
  const upperC = tangentUp * tangentUp * horizontalSqC - dy0 * dy0;
  intervals = intersectIntervals(
    intervals,
    unionIntervals(
      linearIntervals(-ddy, -dy0),
      intersectIntervals(linearIntervals(ddy, dy0), quadraticIntervals(upperA, upperB, upperC)),
    ),
  );

  // Lower pitch(t): dy ≥ 0, or dy < 0 and tanDown²·h² − dy² ≥ 0.
  const lowerA = tangentDown * tangentDown * horizontalSqA - ddy * ddy;
  const lowerB = tangentDown * tangentDown * horizontalSqB - 2 * dy0 * ddy;
  const lowerC = tangentDown * tangentDown * horizontalSqC - dy0 * dy0;
  intervals = intersectIntervals(
    intervals,
    unionIntervals(
      linearIntervals(ddy, dy0),
      intersectIntervals(linearIntervals(-ddy, -dy0), quadraticIntervals(lowerA, lowerB, lowerC)),
    ),
  );

  return intervals.length > 0 ? intervals[0][0] : null;
}

/*
 * The swept rail eyes (the record's rule verbatim: «a face is exported only if
 * it front-faces at least one eye on the segment H0…H4 within the look
 * limits»). The eye walks the stop path at RAIL_SWEEP_STEP_M intervals; each
 * sampled eye carries its position and the look limits LINEARLY interpolated
 * between the two stops it lies between (yaw is 35° at every stop, so the
 * interpolation touches only the pitch pair). The five stops are the first and
 * last samples of their segments — the sweep includes them.
 */
const RAIL_SWEEP_STEP_M = 0.25;

function lerpLook(a, b, t) {
  return {
    yaw: a.yaw + (b.yaw - a.yaw) * t,
    pitchUp: a.pitchUp + (b.pitchUp - a.pitchUp) * t,
    pitchDown: a.pitchDown + (b.pitchDown - a.pitchDown) * t,
  };
}

const RAIL_SWEEP_EYES = RAIL.slice(0, -1).flatMap((stop, index) => {
  const next = RAIL[index + 1];
  const span = [
    next.position[0] - stop.position[0],
    next.position[1] - stop.position[1],
    next.position[2] - stop.position[2],
  ];
  const length = Math.sqrt(dot(span, span));
  const count = Math.ceil(length / RAIL_SWEEP_STEP_M);
  const eyes = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    eyes.push({
      id: `${stop.id}-${next.id}#${i}`,
      position: [
        stop.position[0] + span[0] * t,
        stop.position[1] + span[1] * t,
        stop.position[2] + span[2] * t,
      ],
      look: lerpLook(stop.look, next.look, t),
    });
  }
  return eyes;
});

export function railWitness(face) {
  const centre = centreOf(face.vertices);
  const vertices = face.vertices;
  for (const eye of RAIL_SWEEP_EYES) {
    if (dot(face.normal, subtract(eye.position, centre)) <= 0) continue;
    for (let edge = 0; edge < vertices.length; edge += 1) {
      const t = edgeInLook(vertices[edge], vertices[(edge + 1) % vertices.length], eye);
      if (t !== null) return { stop: eye.id, edge, t };
    }
  }
  return null;
}

export function seenFromRail(face) {
  return railWitness(face) !== null;
}

function makeFace(id, vertices, materialSlot, u = 1, v = 1, opts = {}) {
  const normal = normalOf(vertices, id);
  const face = {
    id,
    vertices,
    normal,
    materialSlot,
    tessellation:
      vertices.length === 4
        ? { kind: 'bilinear-grid', u, v }
        : { kind: 'first-vertex-fan', u: 1, v: 1 },
    triangles: vertices.length === 4 ? 2 * u * v : vertices.length - 2,
    area: areaOf(vertices),
  };
  // The eye-plane backface rule (the S2/S3 classes opt in via
  // opts.backfaceCull): a horizontal face whose front faces away from the
  // shared stop eye height can never be seen from the rail — bake-only
  // without a witness, before the cone certificate runs.
  if (opts.backfaceCull === 'eye-plane' && eyePlaneBackface(normal, vertices, EYE_PLANE_Y)) {
    return {
      ...face,
      visibility: 'bake-only',
      witness: null,
      reason: 'eye-plane-backface',
    };
  }
  const witness = railWitness(face);
  return {
    ...face,
    visibility: witness === null ? 'bake-only' : 'exported',
    witness,
  };
}

/*
 * The stage-2 patch (pp4c/pp4d): Appendix M verbatim plus the tail (ring faces with
 * verified outward windings, candles/flames in slot 16, -y spokes, bipyramid finial, stem
 * foot), the S3 glazing class, the slot rows, the eye-plane wiring and the class pushes.
 * The splice anchors are the committed lines named in the appendix ([A] materialSlots,
 * [B] eagle/front, [C] figureRuling, [D] makeFace opts, [F] CHANDELIER_COUNT, [E] the
 * class pushes).
 */

// [C] the relief-plate class field, verbatim:
export const RELIEF_FIGURE_RULING =
  'SETTLED by the owner 2026-11-28: a drawn low-relief depiction is not a charter figure; the relief ships as the drawn plate';

// ---- shared helpers (pp4c) ------------------------------------------------------------
const r6 = (v) => Math.round(v * 1e6) / 1e6; // the byte pin survives libm ulps
const P = (x, y, z) => [r6(x), r6(y), r6(z)];
const TAU = 2 * Math.PI;
// u x v = the face normal; vertices CCW seen from the front (the emit computes normal/area/triangles).
const AXES = {
  '+x': [
    [0, 1, 0],
    [0, 0, 1],
  ],
  '-x': [
    [0, 0, 1],
    [0, 1, 0],
  ],
  '+y': [
    [0, 0, 1],
    [1, 0, 0],
  ],
  '-y': [
    [1, 0, 0],
    [0, 0, 1],
  ],
  '+z': [
    [1, 0, 0],
    [0, 1, 0],
  ],
  '-z': [
    [0, 1, 0],
    [1, 0, 0],
  ],
};
function face(id, materialSlot, vertices) {
  // 4 vertices: the law's bilinear grid 1x1; more: the law's own first-vertex-fan kind.
  return {
    id,
    materialSlot,
    vertices,
    tessellation:
      vertices.length === 4 ? { kind: 'bilinear-grid', u: 1, v: 1 } : { kind: 'first-vertex-fan' },
  };
}
function rectFace(id, slot, key, c, hu, hv) {
  const [u, v] = AXES[key];
  const at = (su, sv) =>
    P(
      c[0] + su * hu * u[0] + sv * hv * v[0],
      c[1] + su * hu * u[1] + sv * hv * v[1],
      c[2] + su * hu * u[2] + sv * hv * v[2],
    );
  return face(id, slot, [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)]);
}
// the outward faces of an axis-aligned box [min, max], chosen by key. Named keyedBoxFaces:
// the committed boxFaces(id, min, max, slot) above emits all six sides — this keyed variant
// is the patch's own and must not collide with it.
function keyedBoxFaces(id, slot, min, max, keys) {
  const mid = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const half = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
  return keys.map((key) => {
    const axis = 'xyz'.indexOf(key[1]);
    const c = mid.slice();
    c[axis] = key[0] === '+' ? max[axis] : min[axis];
    const [u, v] = AXES[key];
    return rectFace(`${id}/${key}`, slot, key, c, half[u.indexOf(1)], half[v.indexOf(1)]);
  });
}
// [D] the eye-plane backface rule — OPT-IN per class (cls.backfaceCull === 'eye-plane'),
// applied after the normal is computed and BEFORE the cone certificate: a horizontal face
// whose front faces away from the shared stop eye height can never be seen from the rail
// -> visibility 'bake-only', witness null, reason 'eye-plane-backface'. No committed class
// opts in, so no committed census row moves.
export function eyePlaneBackface(normal, vertices, eyeY) {
  if (Math.abs(normal[1]) < 1 - 1e-9) return false;
  const ys = vertices.map((v) => v[1]);
  return normal[1] > 0 ? Math.min(...ys) > eyeY : Math.max(...ys) < eyeY;
}

// ---- S2 (pp4c): chandeliers — SOURCES F (existence) + licence AL-SG-2 (count, form) -----------
export const CHANDELIER = {
  // Five fixtures (the licence's pre-authorized fallback): the eagle-sightline pin measured
  // chandelier-5 (bay 10) only 0.2347 m clear of the H0 sightline to the relief's top edge
  // (< the 0.25 m requirement), so bay 10 is dropped — one fixture per two window bays:
  // the 1st, 3rd, 5th, 7th and 9th of the twelve.
  bays: [0, 2, 4, 6, 8],
  bayModule: 47 / 12, // the window tier's module: 12 panes per wall-tier over L 47
  axisZ: 14.5,
  ceilingY: 20,
  stem: { half: 0.07, bottomY: 17.2 },
  tiers: [
    { y: 18.85, R: 0.55, n: 12 },
    { y: 18.25, R: 0.85, n: 16 },
    { y: 17.55, R: 1.15, n: 24 },
  ],
  band: 0.16,
  ringWidth: 0.25,
  spokes: 3,
  spokeHalf: 0.03,
  candle: { half: 0.025, height: 0.22, inset: 0.12 },
  flame: { half: 0.035, height: 0.12 },
  finial: { y: 17.1, r: 0.16, up: 0.15, down: 0.15, n: 8 },
  slot: { gilt: 15, flame: 16 },
  lowestY: 16.95, // finial.y - finial.down; the relief-clearance pin reads it
};
function ringPoint(cx, y, cz, r, i, n) {
  const a = (i / n) * TAU;
  return P(cx + r * Math.cos(a), y, cz + r * Math.sin(a));
}
function chandelier(k, cx) {
  const C = CHANDELIER;
  const cz = C.axisZ;
  const id = `chandelier-${k}`;
  const g = C.slot.gilt;
  const f = C.slot.flame;
  const faces = [];
  faces.push(
    ...keyedBoxFaces(
      `${id}/stem`,
      g,
      [cx - C.stem.half, C.stem.bottomY, cz - C.stem.half],
      [cx + C.stem.half, C.ceilingY, cz + C.stem.half],
      ['+x', '-x', '+z', '-z'],
    ),
  );
  C.tiers.forEach((t, ti) => {
    const yb = t.y - C.band / 2;
    const yt = t.y + C.band / 2;
    const ri = t.R - C.ringWidth;
    for (let i = 0; i < t.n; i++) {
      const j = (i + 1) % t.n;
      const Ob = ringPoint(cx, yb, cz, t.R, i, t.n);
      const Ob1 = ringPoint(cx, yb, cz, t.R, j, t.n);
      const Ot = ringPoint(cx, yt, cz, t.R, i, t.n);
      const Ot1 = ringPoint(cx, yt, cz, t.R, j, t.n);
      const Ib = ringPoint(cx, yb, cz, ri, i, t.n);
      const Ib1 = ringPoint(cx, yb, cz, ri, j, t.n);
      const It = ringPoint(cx, yt, cz, ri, i, t.n);
      const It1 = ringPoint(cx, yt, cz, ri, j, t.n);
      const seg = `${id}/tier${ti}/seg${i}`;
      // windings verified at angle 0 (+x out, +z = increasing angle): (v1-v0) x (v3-v0) is the front normal
      faces.push(face(`${seg}/outer`, g, [Ob1, Ob, Ot, Ot1])); // radial out
      faces.push(face(`${seg}/inner`, g, [Ib, Ib1, It1, It])); // radial in, toward the stem
      faces.push(face(`${seg}/top`, g, [Ot1, Ot, It, It1])); // +y: bake-only by the eye-plane rule (never seen from the rail)
      faces.push(face(`${seg}/bottom`, g, [Ob, Ob1, Ib1, Ib])); // -y: the underside the rail sees
      // one candle per segment (slot 16, the emitter): a wax box on the band's top at the
      // segment's mid-angle, inset from the rim, a 4-tri flame pyramid on it
      const am = ((i + 0.5) / t.n) * TAU;
      const rc = t.R - C.candle.inset;
      const qx = cx + rc * Math.cos(am);
      const qz = cz + rc * Math.sin(am);
      const y0 = yt + C.candle.height;
      faces.push(
        ...keyedBoxFaces(
          `${seg}/candle`,
          f,
          [qx - C.candle.half, yt, qz - C.candle.half],
          [qx + C.candle.half, y0, qz + C.candle.half],
          ['+x', '-x', '+z', '-z'],
        ),
      );
      faces.push(...pyramidFaces(`${seg}/flame`, f, qx, y0, qz, C.flame.half, C.flame.height));
    }
    // three spokes per tier: flat bars stem -> band inner face, flush with the band's
    // UNDERSIDE, front -y (a +y spoke would be culled by the eye-plane rule)
    for (let s = 0; s < C.spokes; s++) {
      const a = (s / C.spokes) * TAU;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const px = -Math.sin(a) * C.spokeHalf;
      const pz = Math.cos(a) * C.spokeHalf;
      const r0 = C.stem.half;
      const r1 = ri;
      faces.push(
        face(`${id}/tier${ti}/spoke${s}`, g, [
          P(cx + r0 * dx - px, yb, cz + r0 * dz - pz),
          P(cx + r1 * dx - px, yb, cz + r1 * dz - pz),
          P(cx + r1 * dx + px, yb, cz + r1 * dz + pz),
          P(cx + r0 * dx + px, yb, cz + r0 * dz + pz),
        ]),
      );
    }
  });
  // the stem's foot: the finial's upper cone (r 0.053 at y 17.2) does not cover the stem's
  // 0.07 square, so the -y face is drawn (pp4d: +2 tris per fixture)
  faces.push(
    ...keyedBoxFaces(
      `${id}/stem-foot`,
      g,
      [cx - C.stem.half, C.stem.bottomY, cz - C.stem.half],
      [cx + C.stem.half, C.ceilingY, cz + C.stem.half],
      ['-y'],
    ),
  );
  // the 8-fold finial: a bipyramid on the stem's foot; the lower apex is the fixture's
  // lowest point (CHANDELIER.lowestY)
  const F = C.finial;
  const up = P(cx, F.y + F.up, cz);
  const down = P(cx, F.y - F.down, cz);
  for (let i = 0; i < F.n; i++) {
    const j = (i + 1) % F.n;
    const Ri = ringPoint(cx, F.y, cz, F.r, i, F.n);
    const Rj = ringPoint(cx, F.y, cz, F.r, j, F.n);
    faces.push(face(`${id}/finial/up${i}`, g, [Rj, Ri, up])); // out + up
    faces.push(face(`${id}/finial/down${i}`, g, [Ri, Rj, down])); // out + down
  }
  return faces;
  // 1,084 triangles per fixture: stem 8 + foot 2 + rings 416 + spokes 18 + candles 624 +
  // finial 16 (x6 = 6,504; the ring tops 104 x 6 bake-only -> drawn <= 5,880)
}
// a square pyramid, open base, apex up; base order q0..q3 chosen so [q_i, q_{i+1}, apex]
// has the outward normal (verified per side)
function pyramidFaces(id, slot, x, y0, z, h, H) {
  const q = [P(x + h, y0, z - h), P(x - h, y0, z - h), P(x - h, y0, z + h), P(x + h, y0, z + h)];
  const apex = P(x, y0 + H, z);
  return q.map((v, i) => face(`${id}/${i}`, slot, [v, q[(i + 1) % 4], apex]));
}
export const CHANDELIER_X0 = 91; // FRAME X0 — the law's own constant; the pin asserts equality
// chandelierX: 92.958333 100.791667 108.625 116.458333 124.291667
export const chandelierX = (bay) => r6(CHANDELIER_X0 + (bay + 0.5) * CHANDELIER.bayModule);
export const CHANDELIER_LICENCE = 'AL-SG-2';
// The chandeliers' faces draw but bake nothing of their own: they adopt the ceiling's
// lightmap cells (the rg-f5 borrowed-cells pattern — the exporter's TEXCOORD_1 borrows
// the host cell, the bake chain never builds their charts).
export const CHANDELIER_ISLAND_CLASS =
  'adopted host cells (rg-f5 pattern); no atlas cells of their own';

// ---- S3 (pp4c/pp4d): glazing bars + surround per pane — SOURCES A (the windows), form
// DETAIL; rides S2's bake -----
// Per pane: a 0.12 architrave OUTSIDE the pane rectangle on the wall (head + sill full width
// with end faces, jambs between: 16 faces), one mullion 0.07 proud (3 faces), two
// through-transoms 0.055 proud passing BEHIND the mullion (3 faces each; no coplanar fronts)
// -> 6 lights, 25 quads = 50 tris per pane, 2,400 total (cap 2,500), slot 0 wall-marble,
// 0 draws. Tops/undersides fall to the eye-plane rule.
export const GLAZING = {
  mullionHalf: 0.04,
  transomHalf: 0.04,
  surround: 0.12,
  proud: 0.07,
  transomProud: 0.055,
  slot: 0,
  lights: 6,
};
function glazingBars(paneId, vertices) {
  const G = GLAZING;
  const s = G.slot;
  const z0 = vertices[0][2];
  if (vertices.some((v) => Math.abs(v[2] - z0) > 1e-9)) {
    throw new Error(`glazing: pane ${paneId} is not a z-plane — extend the frame mapping`);
  }
  const inward = CHANDELIER.axisZ > z0 ? 1 : -1;
  const front = inward > 0 ? '+z' : '-z';
  const xs = vertices.map((v) => v[0]);
  const ys = vertices.map((v) => v[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const S = G.surround;
  const xm = (x0 + x1) / 2;
  const h = y1 - y0;
  const faces = [];
  const box = (name, xa, xb, ya, yb, d, keys) =>
    faces.push(
      ...keyedBoxFaces(
        `${paneId}/bars/${name}`,
        s,
        [xa, ya, inward > 0 ? z0 : z0 - d],
        [xb, yb, inward > 0 ? z0 + d : z0],
        [front, ...keys],
      ),
    );
  box('head', x0 - S, x1 + S, y1, y1 + S, G.proud, ['-y', '+y', '-x', '+x']);
  box('sill', x0 - S, x1 + S, y0 - S, y0, G.proud, ['+y', '-y', '-x', '+x']);
  box('jamb-w', x0 - S, x0, y0, y1, G.proud, ['+x', '-x']);
  box('jamb-e', x1, x1 + S, y0, y1, G.proud, ['-x', '+x']);
  box('mullion', xm - G.mullionHalf, xm + G.mullionHalf, y0, y1, G.proud, ['-x', '+x']);
  box(
    'transom-lo',
    x0,
    x1,
    y0 + h / 3 - G.transomHalf,
    y0 + h / 3 + G.transomHalf,
    G.transomProud,
    ['+y', '-y'],
  );
  box(
    'transom-hi',
    x0,
    x1,
    y0 + (2 * h) / 3 - G.transomHalf,
    y0 + (2 * h) / 3 + G.transomHalf,
    G.transomProud,
    ['+y', '-y'],
  );
  return faces; // 25 quads
}

export { chandelier, glazingBars, pyramidFaces };

// [D-wiring] makeFace above gained one trailing opts argument; the committed call sites
// are unchanged. EYE_PLANE_Y == the shared stop eye height (FRAME: eye 11.65); the pin
// asserts it equals the rail's H0 eye y.
export const EYE_PLANE_Y = 11.65;

function instancesOf(faces, opts) {
  // u = v = 1 for the quads; the polygons ride makeFace's own first-vertex-fan branch
  // (the law's one face constructor dispatches on the vertex count).
  return faces.map((fc) => makeFace(fc.id, fc.vertices, fc.materialSlot, 1, 1, opts));
}

function boxFaces(id, min, max, slot) {
  const [a, b, c] = min;
  const [d, e, f] = max;
  return [
    makeFace(
      `${id}/west`,
      [
        [a, b, c],
        [a, b, f],
        [a, e, f],
        [a, e, c],
      ],
      slot,
    ),
    makeFace(
      `${id}/east`,
      [
        [d, b, f],
        [d, b, c],
        [d, e, c],
        [d, e, f],
      ],
      slot,
    ),
    makeFace(
      `${id}/bottom`,
      [
        [a, b, f],
        [a, b, c],
        [d, b, c],
        [d, b, f],
      ],
      slot,
    ),
    makeFace(
      `${id}/top`,
      [
        [a, e, c],
        [a, e, f],
        [d, e, f],
        [d, e, c],
      ],
      slot,
    ),
    makeFace(
      `${id}/south`,
      [
        [d, b, c],
        [a, b, c],
        [a, e, c],
        [d, e, c],
      ],
      slot,
    ),
    makeFace(
      `${id}/north`,
      [
        [a, b, f],
        [d, b, f],
        [d, e, f],
        [a, e, f],
      ],
      slot,
    ),
  ];
}

function boxInstance(id, min, max, slot) {
  return {
    id,
    position: centreOf([min, max]),
    size: subtract(max, min),
    min,
    max,
    faces: boxFaces(id, min, max, slot),
  };
}

function plateInstance(id, vertices, slot) {
  return {
    id,
    position: centreOf(vertices),
    vertices,
    faces: [makeFace(`${id}/front`, vertices, slot)],
  };
}

function verticalPlate(id, x, y, z, width, height, slot) {
  // Ordered for a west-facing normal: the throne and relief face the entrance.
  return plateInstance(
    id,
    [
      [x, y - height / 2, z - width / 2],
      [x, y - height / 2, z + width / 2],
      [x, y + height / 2, z + width / 2],
      [x, y + height / 2, z - width / 2],
    ],
    slot,
  );
}

function shaftInstance(id, x, z, radius, bottom, top, slot) {
  const lower = RING.map(([rx, rz]) => [x + rx * radius, bottom, z + rz * radius]);
  const upper = RING.map(([rx, rz]) => [x + rx * radius, top, z + rz * radius]);
  const faces = [];
  for (let i = 0; i < RING.length; i += 1) {
    const next = (i + 1) % RING.length;
    faces.push(
      makeFace(
        `${id}/side-${i}`,
        [lower[i], upper[i], upper[next], lower[next]],
        slot,
        DESIGN.shaftStrips,
        1,
      ),
    );
  }
  faces.push(makeFace(`${id}/bottom`, lower, slot));
  faces.push(makeFace(`${id}/top`, [...upper].reverse(), slot));
  return {
    id,
    position: [x, (bottom + top) / 2, z],
    size: [2 * radius, top - bottom, 2 * radius],
    ring: lower.map((point, index) => [point, upper[index]]),
    faces,
  };
}

function elementClass(id, source, instances, extra = {}) {
  return { id, source, count: instances.length, instances, ...extra };
}

function materialSlots() {
  const rows = [
    ['wall-marble', 'C', 2],
    ['column-marble', 'C', 2],
    ['capital-gilt', 'DETAIL', 2],
    ['window-light', 'A', 2],
    ['balcony-stone', 'I', 2],
    ['balcony-gilt', 'I', 2],
    ['parquet', 'D', 2],
    ['ceiling', 'DETAIL', 2],
    ['ornament-gilt', 'D', 4],
    ['ornament-parquet', 'D', 4],
    ['throne-stone', 'G', 2],
    ['throne-cloth', 'G', 4],
    ['throne-gilt', 'H', 4],
    ['relief', 'E', 4],
    // [A-concrete] appended (slot = index; the builder's MATERIAL_ROWS mirror them):
    ['eagle-plate', 'H', 4],
    ['chandelier-gilt', 'F', 4],
    ['chandelier-flame', 'F', 4],
  ];
  return rows.map(([id, source, authoredStep], slot) => ({
    slot,
    id,
    source,
    authoredStep,
    drawRule: 'one merged primitive per exported material slot',
    step2Fallback: 'neutral standard material',
  }));
}

export function buildLaw() {
  validateConstants();
  const L = CONSTANTS.L.value;
  const W = CONSTANTS.W.value;
  validateFrame(L, W);
  const height = CEILING_Y - FLOOR_Y;
  const x1 = X0 + L;
  const z0 = AXIS_Z - W / 2;
  const z1 = AXIS_Z + W / 2;
  const inset = W * DESIGN.plateOffsetWidth;

  // Two long walls, paired columns: count / (2 walls * 2 columns per pair).
  const bayCount = CONSTANTS.COLUMN_COUNT.value / (2 * 2);
  if (bayCount !== Math.floor(bayCount)) refuse('COLUMN_COUNT cannot form paired bays');
  const pitch = L / bayCount;
  const stations = [];
  for (let bay = 0; bay < bayCount; bay += 1) {
    stations.push(X0 + (bay + 0.5) * pitch);
  }
  const grid = {
    source: 'DESIGN',
    bayCount,
    bayPitch: pitch,
    origin: X0,
    stationXs: stations,
    derivation: 'COLUMN_COUNT / (two long walls × paired columns); pitch = L / bays',
  };

  const classes = [];
  const walls = [
    plateInstance(
      'west-wall',
      [
        [X0, FLOOR_Y, z1],
        [X0, FLOOR_Y, z0],
        [X0, CEILING_Y, z0],
        [X0, CEILING_Y, z1],
      ],
      0,
    ),
    plateInstance(
      'east-wall',
      [
        [x1, FLOOR_Y, z0],
        [x1, FLOOR_Y, z1],
        [x1, CEILING_Y, z1],
        [x1, CEILING_Y, z0],
      ],
      0,
    ),
    plateInstance(
      'south-wall',
      [
        [X0, FLOOR_Y, z0],
        [x1, FLOOR_Y, z0],
        [x1, CEILING_Y, z0],
        [X0, CEILING_Y, z0],
      ],
      0,
    ),
    plateInstance(
      'north-wall',
      [
        [x1, FLOOR_Y, z1],
        [X0, FLOOR_Y, z1],
        [X0, CEILING_Y, z1],
        [x1, CEILING_Y, z1],
      ],
      0,
    ),
  ];
  classes.push(elementClass('walls', 'C', walls));
  classes.push(
    elementClass('floor', 'D', [
      plateInstance(
        'floor',
        [
          [X0, FLOOR_Y, z0],
          [X0, FLOOR_Y, z1],
          [x1, FLOOR_Y, z1],
          [x1, FLOOR_Y, z0],
        ],
        6,
      ),
    ]),
  );
  classes.push(
    elementClass('ceiling', 'DETAIL', [
      plateInstance(
        'ceiling',
        [
          [X0, CEILING_Y, z1],
          [X0, CEILING_Y, z0],
          [x1, CEILING_Y, z0],
          [x1, CEILING_Y, z1],
        ],
        7,
      ),
    ]),
  );

  const bases = [];
  const shafts = [];
  const capitals = [];
  const windows = [];
  const balconies = [];
  const railings = [];
  const radius = W * DESIGN.columnRadiusWidth;
  const baseTop = FLOOR_Y + height * DESIGN.baseHeight;
  const orderTop = FLOOR_Y + height * DESIGN.columnHeight;
  const capitalBottom = orderTop - height * DESIGN.capitalHeight;

  for (const side of [-1, 1]) {
    const columnZ = AXIS_Z + side * (W / 2 - W * DESIGN.columnInsetWidth);
    for (let bay = 0; bay < stations.length; bay += 1) {
      const centreX = stations[bay];
      for (const member of [-1, 1]) {
        const x = centreX + member * pitch * DESIGN.pairHalfPitch;
        const id = `column-${side}-${bay}-${member}`;
        bases.push(
          boxInstance(
            `${id}-base`,
            [x - radius, FLOOR_Y, columnZ - radius],
            [x + radius, baseTop, columnZ + radius],
            1,
          ),
        );
        shafts.push(shaftInstance(`${id}-shaft`, x, columnZ, radius, baseTop, capitalBottom, 1));
      }

      /*
       * One joined capital per column pair (review finding R5): the paired
       * columns share a single cap block spanning both shafts plus the
       * capitalRadius overhang each side, so no two exported capital faces
       * overlap in the same plane.
       */
      const capRadius = radius * DESIGN.capitalRadius;
      const capHalf = pitch * DESIGN.pairHalfPitch + capRadius;
      capitals.push(
        boxInstance(
          `column-capital-${side}-${bay}`,
          [centreX - capHalf, capitalBottom, columnZ - capRadius],
          [centreX + capHalf, orderTop, columnZ + capRadius],
          2,
        ),
      );

      const tierCentres = [DESIGN.lowerWindowCentre, DESIGN.upperWindowCentre];
      for (let tier = 0; tier < CONSTANTS.WINDOW_TIERS.value; tier += 1) {
        const y = FLOOR_Y + height * tierCentres[tier];
        const halfW = (pitch * DESIGN.windowWidthPitch) / 2;
        const halfH = (height * DESIGN.windowHeight) / 2;
        const z = AXIS_Z + side * (W / 2 - inset);
        const vertices = [
          [centreX - halfW, y - halfH, z],
          [centreX + halfW, y - halfH, z],
          [centreX + halfW, y + halfH, z],
          [centreX - halfW, y + halfH, z],
        ];
        if (side > 0) vertices.reverse();
        windows.push(plateInstance(`window-${side}-${bay}-${tier}`, vertices, 3));
      }
    }

    const innerZ = AXIS_Z + side * W * DESIGN.balconyInnerWidth;
    const outerZ = AXIS_Z + (side * W) / 2;
    const lowZ = Math.min(innerZ, outerZ);
    const highZ = -Math.min(-innerZ, -outerZ);
    const deckY = FLOOR_Y + height * DESIGN.balconyHeight;
    const deckTop = deckY + height * DESIGN.balconyThickness;
    balconies.push(boxInstance(`balcony-${side}`, [X0, deckY, lowZ], [x1, deckTop, highZ], 4));
    const railHalf = (W * DESIGN.railingThicknessWidth) / 2;
    railings.push(
      boxInstance(
        `balcony-rail-${side}`,
        [X0, deckTop, innerZ - railHalf],
        [x1, deckTop + height * DESIGN.railingHeight, innerZ + railHalf],
        5,
      ),
    );
  }

  classes.push(elementClass('column-bases', 'DESIGN', bases));
  classes.push(elementClass('column-shafts', 'DESIGN', shafts));
  classes.push(elementClass('column-capitals', 'DETAIL', capitals));
  classes.push(elementClass('windows', 'A', windows));
  // [E] the stage-2 class pushes (the glazing derives from windows in law order): the
  // census emitter copies licence / censusStatus / caps into the row's flags; 17 slots =
  // 17 merged meshes <= the law cap of 24.
  {
    const cull = { backfaceCull: 'eye-plane' };
    // The law's instance shape: one object per fixture / pane carrying its faces
    // (instancesOf maps the raw faces through makeFace; the committed census, the lm
    // chart plan and the builder read instance.faces).
    const chandeliers = CHANDELIER.bays.map((b, k) => ({
      id: `chandelier-${k}`,
      faces: instancesOf(chandelier(k, chandelierX(b)), cull),
    }));
    classes.push(
      elementClass('chandeliers', 'F', chandeliers, {
        licence: CHANDELIER_LICENCE,
        backfaceCull: 'eye-plane',
        censusStatus: 'provisional',
        // The borrowed-cells mode (rg-f5): every face adopts its host face's lightmap
        // cell; the chart plan carries no patches for this class.
        lightmap: 'adopted',
        lightmapHost: 'ceiling',
        islandClass: CHANDELIER_ISLAND_CLASS,
        caps: { drawnTriangles: 9000, draws: 2 },
      }),
    );
    const glazing = windows.map((w) => ({
      id: w.id,
      faces: instancesOf(glazingBars(w.id, w.vertices), cull),
    }));
    classes.push(
      elementClass('glazing-bars', 'A', glazing, {
        formSource: 'DETAIL',
        backfaceCull: 'eye-plane',
        lightmap: 'adopted',
        lightmapHost: 'walls',
        islandClass: 'adopted host cells (rg-f5 pattern); no atlas cells of their own',
        caps: { drawnTriangles: 2500, draws: 0 },
      }),
    );
  }
  classes.push(elementClass('balconies', 'I', balconies));
  classes.push(elementClass('balcony-rails', 'I', railings));

  /*
   * Throne-place proportions are deliberately schematic DESIGN dimensions:
   * three diminishing dais steps; seat at +45; canopy behind it at +46.
   * These fractions never purport to measure the historical throne.
   */
  const throneX = X0 + 45;
  const stepHeight = height / 50;
  const dais = [];
  for (let step = 0; step < 3; step += 1) {
    const halfLength = L / 24 - (step * L) / 240;
    const halfWidth = W / 6 - (step * W) / 60;
    dais.push(
      boxInstance(
        `dais-${step}`,
        [throneX - halfLength, FLOOR_Y + step * stepHeight, AXIS_Z - halfWidth],
        [throneX + halfLength, FLOOR_Y + (step + 1) * stepHeight, AXIS_Z + halfWidth],
        10,
      ),
    );
  }
  classes.push(elementClass('throne-dais', 'G', dais));

  const seatY = FLOOR_Y + 3 * stepHeight;
  const seatHalf = W / 24;
  classes.push(
    elementClass('throne-seat', 'G', [
      boxInstance(
        'seat',
        [throneX - seatHalf, seatY, AXIS_Z - seatHalf],
        [throneX + seatHalf, FLOOR_Y + 2.9, AXIS_Z + seatHalf],
        12,
      ),
      boxInstance(
        'seat-back',
        [throneX + seatHalf / 2, FLOOR_Y + 2.9, AXIS_Z - seatHalf],
        [throneX + seatHalf, FLOOR_Y + height * 0.42, AXIS_Z + seatHalf],
        12,
      ),
    ]),
  );

  /*
   * The canopy is reshaped around the pinned gazes (review finding R3): the
   * crown is the H1 subject's height (THRONE_RISE), and the roof's front edge
   * is derived so the H4→RELIEF sightline clears the roof top by 0.1 m. The
   * back plate rises to the crown, the drapes hang from the front edge to the
   * roof underside, and the eagle plate sits clear beneath the roof. The
   * sightline itself is gated in validatePlan (segment vs every canopy box).
   */
  const RELIEF_X = X0 + 46.6;
  const RELIEF_Y = FLOOR_Y + 6.6;
  const canopyX = throneX + L / 47;
  const canopyHalf = W / 7;
  const crownY = RAIL[1].subject[1];
  const reliefSlope = (RELIEF_Y - RAIL[4].position[1]) / (RELIEF_X - RAIL[4].position[0]);
  const canopyFrontX = RAIL[4].position[0] + (crownY + 0.1 - RAIL[4].position[1]) / reliefSlope;
  const roofBottom = crownY - height / 50;
  const clothWidth = W / 24;
  const canopy = [
    boxInstance(
      'canopy-roof',
      [canopyFrontX, roofBottom, AXIS_Z - canopyHalf],
      [canopyX, crownY, AXIS_Z + canopyHalf],
      12,
    ),
    verticalPlate(
      'canopy-back',
      canopyX,
      (seatY + crownY) / 2,
      AXIS_Z,
      2 * canopyHalf,
      crownY - seatY,
      11,
    ),
  ];
  for (const side of [-1, 1]) {
    const z = AXIS_Z + side * (canopyHalf - clothWidth / 2);
    canopy.push(
      boxInstance(
        `canopy-drape-${side}`,
        [canopyFrontX, seatY, z - clothWidth / 2],
        [canopyFrontX + inset, roofBottom, z + clothWidth / 2],
        11,
      ),
    );
  }
  classes.push(elementClass('canopy', 'G', canopy));
  classes.push(
    elementClass('eagle-plate', 'H', [
      verticalPlate(
        'eagle',
        canopyX - inset,
        FLOOR_Y + height * 0.35,
        AXIS_Z,
        W / 12,
        height / 12,
        // [B-concrete] 12 -> 14: the eagle-plate class (leaves the throne-gilt mesh; +1 draw)
        14,
      ),
    ]),
  );
  classes.push(
    elementClass(
      'relief-plate',
      'E',
      [verticalPlate('relief', RELIEF_X, RELIEF_Y, AXIS_Z, W / 5, height / 6, 13)],
      // [C-concrete] the relief class field, the settled string verbatim (law.json follows):
      { figureRuling: RELIEF_FIGURE_RULING },
    ),
  );

  /*
   * One shared ornament layout, two palettes; no state symbols in this drawing.
   * Inset one quarter-bay at each end and one fifth-width at each side.
   */
  const ornamentX0 = X0 + pitch / 4;
  const ornamentX1 = x1 - pitch / 4;
  const ornamentZ0 = z0 + W / 5;
  const ornamentZ1 = z1 - W / 5;
  classes.push(
    elementClass(
      'ceiling-ornament',
      'D',
      [
        plateInstance(
          'ceiling-ornament',
          [
            [ornamentX0, CEILING_Y - inset, ornamentZ1],
            [ornamentX0, CEILING_Y - inset, ornamentZ0],
            [ornamentX1, CEILING_Y - inset, ornamentZ0],
            [ornamentX1, CEILING_Y - inset, ornamentZ1],
          ],
          8,
        ),
      ],
      { drawing: 'shared-ornament', palette: 'gilt' },
    ),
  );
  classes.push(
    elementClass(
      'parquet-ornament',
      'D',
      [
        plateInstance(
          'parquet-ornament',
          [
            [ornamentX0, FLOOR_Y + inset, ornamentZ0],
            [ornamentX0, FLOOR_Y + inset, ornamentZ1],
            [ornamentX1, FLOOR_Y + inset, ornamentZ1],
            [ornamentX1, FLOOR_Y + inset, ornamentZ0],
          ],
          9,
        ),
      ],
      { drawing: 'shared-ornament', palette: 'parquet' },
    ),
  );

  /*
   * The chandeliers class is pushed in the stage-2 [E] block above (the deferred empty
   * placeholder retired once CHANDELIER_COUNT settled under licence AL-SG-2).
   */

  const law = {
    schema: 'st-george-law-1',
    sources: SOURCES,
    constants: CONSTANTS,
    frame: FRAME,
    design: DESIGN,
    box: { min: [X0, FLOOR_Y, z0], max: [x1, CEILING_Y, z1] },
    grid,
    rail: RAIL,
    visibilityRule: {
      source: 'ANGLES',
      cosineYaw: COS_YAW,
      tangents: TANGENTS,
      samples: 'polygon arithmetic centre, then ordered vertices',
      eyes: `the swept H0–H4 eye path: ${RAIL_SWEEP_EYES.length} samples at ${RAIL_SWEEP_STEP_M} m, the look limits interpolated between stops`,
      occlusion: 'not tested; conservative export is allowed',
    },
    materialSlots: materialSlots(),
    classes,
    lighting: {
      atlasSize: DESIGN.atlasSize,
      states: ['day', 'dusk', 'nightChandeliers'],
      probes: ['dusk'],
      lmChart: lmChartPlan(classes),
      source: 'BUDGET',
    },
    caps: CAPS,
  };
  validatePlan(law);
  return law;
}

/*
 * The lightmap chart plan (the builder's packer reads this block from law.json).
 * Patches are the faces' in-plane metre rectangles (u = the longest loop edge,
 * v = normal × u — the military-gallery ArchChart rule); each placed patch
 * carries the pad on every side. The canvas is bisected in METRES until the
 * placed demand fits the occupancy share, so the chart's normalized UVs are
 * identical at the 1024² shell bake and the 2048² final bake — the glb built
 * once never re-packs. The densities are the canvas's px/m at each resolution.
 */
const LM_PAD_PX = 2;
const LM_MIN_PX = 8;
const CHART_OCCUPANCY = 0.72;

function patchExtents(vertices, normal) {
  let u = subtract(vertices[1], vertices[0]);
  let longest = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const edge = subtract(b, a);
    const length = Math.sqrt(dot(edge, edge));
    if (length > longest) {
      longest = length;
      u = edge.map((value) => value / length);
    }
  }
  const v = cross(normal, u);
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const vertex of vertices) {
    const du = dot(vertex, u);
    const dv = dot(vertex, v);
    uMin = Math.min(uMin, du);
    uMax = Math.max(uMax, du);
    vMin = Math.min(vMin, dv);
    vMax = Math.max(vMax, dv);
  }
  return { wM: uMax - uMin, hM: vMax - vMin };
}

function placedDemand(patches, canvasM, res) {
  // The pad and the min-clamp are pixel constants; in metres they scale with
  // canvas/res. The SHELL resolution carries the larger metre-pads, so the
  // bisection runs against it and the final bake's pads shrink inside the
  // same layout.
  const padM = (LM_PAD_PX * canvasM) / res;
  const minM = (LM_MIN_PX * canvasM) / res;
  let total = 0;
  for (const patch of patches) {
    const w = Math.max(patch.wM, minM) + 2 * padM;
    const h = Math.max(patch.hM, minM) + 2 * padM;
    total += w * h;
  }
  return total;
}

function lmChartPlan(classes) {
  const patches = [];
  let totalArea = 0;
  for (const group of classes) {
    // The adopted classes (rg-f5) borrow their host faces' lightmap cells: no atlas
    // patches of their own, no area in the chart's demand — the bisection never sees
    // them (their per-face micro-patches at the pad floor would explode the demand).
    if (group.lightmap === 'adopted') continue;
    for (const instance of group.instances) {
      for (const face of instance.faces) {
        const extents = patchExtents(face.vertices, face.normal);
        patches.push(extents);
        totalArea += face.area;
      }
    }
  }
  // Bisection on the canvas against the shell resolution's demand: the placed
  // demand (patches + pads + the min clamp) must fit the occupancy share.
  // 60 fixed iterations, no tolerance fuzz — byte-stable.
  let lo = 1;
  let hi = 400;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (placedDemand(patches, mid, DESIGN.shellAtlasSize) <= CHART_OCCUPANCY * mid * mid) hi = mid;
    else lo = mid;
  }
  const canvasM = hi;
  return {
    canvasM,
    padPx: LM_PAD_PX,
    minPx: LM_MIN_PX,
    occupancy: CHART_OCCUPANCY,
    patchCount: patches.length,
    totalPatchArea: totalArea,
    shellRes: DESIGN.shellAtlasSize,
    finalRes: DESIGN.atlasSize,
    densityShellPxPerM: DESIGN.shellAtlasSize / canvasM,
    densityFinalPxPerM: DESIGN.atlasSize / canvasM,
  };
}

/*
 * Exact segment-vs-AABB slab test: both parameters of the entry/exit span per
 * axis, intersected. Returns true when the open segment crosses the box.
 */
function segmentHitsBox(from, to, min, max) {
  let lo = 0;
  let hi = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const direction = to[axis] - from[axis];
    if (direction === 0) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    const t0 = (min[axis] - from[axis]) / direction;
    const t1 = (max[axis] - from[axis]) / direction;
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
    if (lo > hi) return false;
  }
  return lo < hi;
}

function instanceAabb(instance) {
  if (instance.min && instance.max) return { min: instance.min, max: instance.max };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const face of instance.faces) {
    for (const vertex of face.vertices) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], vertex[axis]);
        max[axis] = Math.max(max[axis], vertex[axis]);
      }
    }
  }
  return { min, max };
}

export function validatePlan(law) {
  for (const group of law.classes) {
    if (!SOURCES[group.source]) refuse(`${group.id} has no source row`);
    for (const instance of group.instances) {
      for (const face of instance.faces) {
        if (face.vertices.length < 3) refuse(`face ${face.id} has too few vertices`);
        for (const vertex of face.vertices) {
          for (let axis = 0; axis < 3; axis += 1) {
            const value = vertex[axis];
            if (!Number.isFinite(value)) refuse(`face ${face.id} has a non-finite vertex`);
            if (value < FRAME.bounds.min[axis] || value > FRAME.bounds.max[axis]) {
              refuse(`face ${face.id} leaves contract bounds`);
            }
          }
        }
        if (!(face.area > 0)) refuse(`face ${face.id} has no area`);
        if (face.visibility === 'exported' && !seenFromRail(face)) {
          refuse(`face ${face.id} is exported without a rail witness`);
        }
        if (!law.materialSlots.some((slot) => slot.slot === face.materialSlot)) {
          refuse(`face ${face.id} has no material slot`);
        }
      }
    }
  }
  // The pinned subject sightlines (review finding R3): for every stop whose
  // subject lies beyond the canopy, the gaze segment must clear the canopy.
  const canopy = law.classes.find((group) => group.id === 'canopy');
  if (canopy !== undefined) {
    const canopyBoxes = canopy.instances.map(instanceAabb);
    for (const stop of law.rail) {
      if (stop.subject[0] <= canopyBoxes[0].max[0]) continue;
      for (const box of canopyBoxes) {
        if (segmentHitsBox(stop.position, stop.subject, box.min, box.max)) {
          refuse(
            `the ${stop.id}→subject sightline crosses canopy ${canopy.instances[canopyBoxes.indexOf(box)].id}`,
          );
        }
      }
    }
  }
}

export function buildCensus(law = buildLaw()) {
  validatePlan(law);
  let exportedArea = 0;
  for (const group of law.classes) {
    for (const instance of group.instances) {
      for (const face of instance.faces) {
        if (face.visibility === 'exported') exportedArea += face.area;
      }
    }
  }
  // The chart's real densities come from the law's bisected canvas (the whole
  // patch demand, pads included) — the same numbers the builder packs with.
  const chart = law.lighting.lmChart;
  const activeSlots = new Set();
  const rows = law.classes.map((group) => {
    let drawn = 0;
    let bakeOnly = 0;
    let exportedFaces = 0;
    let bakeOnlyFaces = 0;
    const slots = new Set();
    for (const instance of group.instances) {
      for (const face of instance.faces) {
        slots.add(face.materialSlot);
        if (face.visibility === 'exported') {
          drawn += face.triangles;
          exportedFaces += 1;
          activeSlots.add(face.materialSlot);
        } else {
          bakeOnly += face.triangles;
          bakeOnlyFaces += 1;
        }
      }
    }
    return {
      id: group.id,
      count: group.count,
      placedCount: group.instances.length,
      triangles: {
        drawn,
        unique: drawn,
        bakeOnly,
        basis: 'no instancing credit; explicit patch tessellation',
      },
      materialSlots: [...slots].sort((a, b) => a - b),
      visibility: exportedFaces === 0 ? 'bake-only' : bakeOnlyFaces === 0 ? 'exported' : 'mixed',
      exportedFaces,
      bakeOnlyFaces,
      lightmap: {
        // The adopted classes' rows carry the borrowed truth: no atlas cells of their
        // own, the host class named, no own texel density (they sample the host cells
        // at the host's density).
        ...(group.lightmap === 'adopted' ? { adopted: true, host: group.lightmapHost } : {}),
        islandClass:
          group.islandClass === undefined
            ? 'one planar patch; packed by later bake stage'
            : group.islandClass,
        texelsPerMetreFinal:
          exportedFaces === 0 || group.lightmap === 'adopted' ? 0 : chart.densityFinalPxPerM,
        texelsPerMetreShell:
          exportedFaces === 0 || group.lightmap === 'adopted' ? 0 : chart.densityShellPxPerM,
      },
      flags: {
        bands: 'pending-three-state-bake',
        ghostSplit: 'pending-three-state-bake',
        deadCells: 'pending-atlas-pack',
        junctionRelief: 'pending-three-state-bake',
        winding: 'checked-from-ordered-vertices',
        paneOrientation:
          group.id === 'windows' ? 'inward-plan-normals; pending-glb-check' : 'not-applicable',
        encoderParity: 'pending-encoder',
        UNSOURCED: group.count === null,
        // The stage-2 classes' own extra rows copy into the flags verbatim (licence /
        // censusStatus / caps); classes without them emit no key.
        ...(group.licence === undefined ? {} : { licence: group.licence }),
        ...(group.censusStatus === undefined ? {} : { census: group.censusStatus }),
        ...(group.caps === undefined ? {} : { caps: group.caps }),
      },
    };
  });

  let triangles = 0;
  let uniqueTriangles = 0;
  let bakeOnlyTriangles = 0;
  for (const row of rows) {
    triangles += row.triangles.drawn;
    uniqueTriangles += row.triangles.unique;
    bakeOnlyTriangles += row.triangles.bakeOnly;
  }

  // Three states, three plates, one probe: compressed-byte reservations only.
  const textureBytes =
    law.lighting.states.length * DESIGN.lightmapBytesPerState +
    3 * DESIGN.plateBytesEach +
    DESIGN.probeBytes;
  const geometryBytes = uniqueTriangles * DESIGN.geometryBytesPerDrawnTriangle;
  const payloadBytes = textureBytes + geometryBytes + DESIGN.containerBytes;
  const totals = {
    triangles,
    uniqueTriangles,
    bakeOnlyTriangles,
    draws: activeSlots.size,
    textureBytes,
    payloadBytes,
  };
  for (const [metric, cap] of Object.entries(CAPS)) {
    if (totals[metric] > cap * 0.85) {
      refuse(`census ${metric} = ${totals[metric]} exceeds 85 % of cap ${cap}`);
    }
  }
  // The record's texture subcaps gate at the same admission fraction (R1).
  const reservations = {
    lightmaps: law.lighting.states.length * DESIGN.lightmapBytesPerState,
    plates: 3 * DESIGN.plateBytesEach,
    probe: DESIGN.probeBytes,
  };
  for (const [metric, cap] of Object.entries(SUBCAPS)) {
    if (metric === 'source') continue;
    if (reservations[metric] > cap * 0.85) {
      refuse(
        `census reservation ${metric} = ${reservations[metric]} exceeds 85 % of subcap ${cap}`,
      );
    }
  }
  const shellScale = DESIGN.shellAtlasSize / DESIGN.atlasSize;
  return {
    schema: 'st-george-census-1',
    source: 'BUDGET',
    status: 'plan estimates, not measured GLB/KTX2 or decoded resource costs',
    drawRule: 'merge exported patches by material slot; no per-instance draws',
    rows,
    totals,
    caps: CAPS,
    subcaps: SUBCAPS,
    maximumCapFraction: 0.85,
    textureReservations: reservations,
    lightmap: {
      exportedArea,
      totalPatchArea: chart.totalPatchArea,
      patchCount: chart.patchCount,
      canvasM: chart.canvasM,
      finalAtlasSize: DESIGN.atlasSize,
      shellAtlasSize: DESIGN.shellAtlasSize,
      texelsPerMetreFinal: chart.densityFinalPxPerM,
      texelsPerMetreShell: chart.densityShellPxPerM,
      shellScale,
    },
    deferred: [
      'Chandelier count and instances remain unsourced and absent.',
      'Actual compressed bytes and decoded costs require later asset gates.',
      'Atlas packability and all bake/encoder failure classes require later gates.',
      'Relief rider requires the deferred figure ruling.',
      'The 8.5 mm canopy-drape returns sit at the chart min-px floor: a specific minimum-island check for the step-2 packer.',
    ],
  };
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

export function serializeLaw(law) {
  return `${JSON.stringify(sortKeysDeep(law), null, 2)}\n`;
}

export function serializeCensus(census) {
  return `${JSON.stringify(sortKeysDeep(census), null, 2)}\n`;
}
