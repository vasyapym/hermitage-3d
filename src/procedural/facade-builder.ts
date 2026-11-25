// Facade kit builder — src/procedural/facade-builder.ts
// Turns solver placements into InstancedMesh objects. Runtime relief kit:
// walls are the coordinator's massing boxes; recesses are opaque dark panels.
// Salvaged from relay round 7; orchestrator correction: the surround opening
// fills the envelope up to the head ornament (openH = sy − rise) so window
// heads land on the design row table (3.00 / 9.20 / 15.50 / 19.50 m) — the
// draft stacked an internal sill ledge and band inside the envelope instead.
import * as THREE from 'three';
import { SNOW_ALBEDO_LINEAR } from '../world/snow-season';
import type { PartId, Placement, SolvedFacade } from './facade-solver';
import { KIT, PART_IDS } from './facade-solver';

/* ------------------------------------------------------------------ colours */

/* sRGB hex constants; new THREE.Color(hex) converts to the linear working space. */
export const DRESSING_HEX = 0xf2f0e8;
export const RECESS_HEX = 0x23262b;
export const GOLD_HEX = 0xc9a227;
export const PALE_STONE_HEX = 0xded9cc;

export const FACADE_COLORS = Object.freeze({
  dressings: DRESSING_HEX,
  recess: RECESS_HEX,
  gold: GOLD_HEX,
  paleStone: PALE_STONE_HEX,
});

const WHITE = new THREE.Color(DRESSING_HEX);
const DARK = new THREE.Color(RECESS_HEX);
const GOLD = new THREE.Color(GOLD_HEX);
const STONE = new THREE.Color(PALE_STONE_HEX);

/* ------------------------------------------------------------------ primitives */

/* Pivot convention for every part: bottom-centre-back (x centred, y from 0, z from 0 back to sz front). */

type Pt = readonly [number, number];
type Piece = { g: THREE.BufferGeometry; c: THREE.Color };

function envelope(id: PartId): { sx: number; sy: number; sz: number } {
  const { min, max } = KIT[id].localBounds;
  return { sx: max.x - min.x, sy: max.y - min.y, sz: max.z - min.z };
}

/** Box given width/height/depth, x centre, bottom y and back z. */
function box(
  w: number,
  h: number,
  d: number,
  cx: number,
  y0: number,
  z0: number,
  c: THREE.Color,
): Piece {
  return {
    g: new THREE.BoxGeometry(w, h, d).translate(cx, y0 + h / 2, z0 + d / 2),
    c,
  };
}

/** 8-sided vertical prism/frustum; open-ended by default because bases and capitals cover the ends. */
function prism(
  rTop: number,
  rBottom: number,
  h: number,
  cx: number,
  y0: number,
  cz: number,
  c: THREE.Color,
  open = true,
): Piece {
  return {
    g: new THREE.CylinderGeometry(rTop, rBottom, h, 8, 1, open).translate(cx, y0 + h / 2, cz),
    c,
  };
}

/** 8-sided lathe around a vertical axis at (cx, cz); profile points are (radius, y). */
function lathe(profile: readonly Pt[], cx: number, cz: number, c: THREE.Color): Piece {
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  return { g: new THREE.LatheGeometry(points, 8).translate(cx, 0, cz), c };
}

/** Flat extrusion of a simple polygon drawn in XY, extruded along +Z from 0 to depth (no closePath: avoids a degenerate side quad). */
function slab(outline: readonly Pt[], depth: number, c: THREE.Color): Piece {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  return {
    g: new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }),
    c,
  };
}

/** Elliptical arc band (outer radii rx/ry, thickness t) centred on (0, cy), from angle a0 to a1 in degrees. */
function arcBand(
  rx: number,
  ry: number,
  t: number,
  cy: number,
  a0: number,
  a1: number,
  segments: number,
  depth: number,
  c: THREE.Color,
): Piece {
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / segments);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    outer.push([rx * cos, cy + ry * sin]);
    inner.push([(rx - t) * cos, cy + (ry - t) * sin]);
  }
  return slab([...outer, ...inner.reverse()], depth, c);
}

/** Concatenates primitive geometries into one indexed geometry carrying a per-vertex linear colour. */
function merge(pieces: readonly Piece[]): THREE.BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const color: number[] = [];
  const index: number[] = [];
  let offset = 0;
  for (const { g, c } of pieces) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const idx = g.getIndex();
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      color.push(c.r, c.g, c.b);
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + offset);
    } else {
      for (let i = 0; i < p.count; i++) index.push(i + offset);
    }
    offset += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  out.setIndex(index);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

export function countTriangles(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  return index ? index.count / 3 : geometry.getAttribute('position').count / 3;
}

/* ------------------------------------------------------------------ parts */

type HeadKind = 'cornice' | 'broken-arch' | 'pediment' | 'none';

/* The populated surround parts with their opening/head/rise params — consumed by the
 * BUILDERS table below and re-exposed by surroundOpening() for the DEC-019 night
 * lattice. One source of truth: the pane must size to the exact recess panel. */
type SurroundParams = Readonly<{ opening: number; head: HeadKind; rise: number }>;
const SURROUND_PARAMS: Partial<Record<PartId, SurroundParams>> = {
  'surround-row1-small': { opening: 1.0, head: 'cornice', rise: 0.45 },
  'surround-row2-large': { opening: 1.7, head: 'broken-arch', rise: 0.65 },
  'surround-row3-large': { opening: 1.7, head: 'pediment', rise: 0.6 },
  'surround-row4-small': { opening: 1.0, head: 'cornice', rise: 0.45 },
  // The dressings law's variants carry their row's opening/panel params so the
  // DEC-019 pane sizing (surroundOpening) is row-exact for them too.
  'surround-row2-risalit': { opening: 1.7, head: 'broken-arch', rise: 0.65 },
  'surround-row3-segmental': { opening: 1.7, head: 'none', rise: 0.6 },
  'surround-row3-risalit': { opening: 1.7, head: 'none', rise: 0.6 },
};

function surroundParams(partId: PartId): SurroundParams {
  const p = SURROUND_PARAMS[partId];
  if (!p) throw new Error(`facade-builder: "${partId}" is not a surround part`);
  return p;
}

/** The dark recess panel's depth (its front-face z in the part's local frame). */
function panelDepth(sz: number): number {
  return Math.min(0.05, sz / 4);
}

/** The dark recess-panel rect in the part's local frame (DEC-019 night lattice reads it):
 *  the panel is box(opening, openH, rd) at x=0, y∈[0, openH], z∈[0, rd]; the reveal sits
 *  in front of it. A pane glazing this window sits a hair in front of z = depth. */
export type SurroundOpening = Readonly<{ width: number; height: number; depth: number }>;
export function surroundOpening(partId: PartId): SurroundOpening {
  const p = surroundParams(partId);
  const { sy, sz } = envelope(partId);
  return { width: p.opening, height: sy - p.rise, depth: panelDepth(sz) };
}

function surround(id: PartId, opening: number, head: HeadKind, rise: number): THREE.BufferGeometry {
  return merge(surroundPieces(id, opening, head, rise));
}

/** The surround's pieces in the part's local frame; 'none' leaves the head
 * relief to the variant builders (the dressings law's row2/row3 variants). */
function surroundPieces(
  id: PartId,
  opening: number,
  head: HeadKind,
  rise: number,
  jambInset = 0,
): Piece[] {
  const { sx, sy, sz } = envelope(id);
  const openH = sy - rise; // the opening fills the envelope; the head ornament owns the top `rise`
  const jamb = Math.max(0.12, (sx - opening) / 2 - jambInset);
  const jambCentre = opening / 2 + jamb / 2;
  const rd = panelDepth(sz);
  const dz = sz * 0.7;
  const yHead = openH;
  const half = sx / 2;
  const pieces: Piece[] = [
    box(jamb, openH, dz, -jambCentre, 0, 0, WHITE),
    box(jamb, openH, dz, jambCentre, 0, 0, WHITE),
    box(opening, openH, rd, 0, 0, 0, DARK),
    box(0.06, openH, rd, 0, 0, rd, DARK),
    box(opening, 0.06, rd, 0, openH * 0.62, rd, DARK),
  ];
  if (head === 'cornice') {
    pieces.push(
      box(sx, rise * 0.45, sz * 0.85, 0, yHead, 0, WHITE),
      box(sx, rise * 0.55, sz, 0, yHead + rise * 0.45, 0, WHITE),
    );
  } else if (head === 'pediment') {
    pieces.push(
      box(sx, 0.15, sz, 0, yHead, 0, WHITE),
      slab(
        [
          [-half, yHead + 0.15],
          [half, yHead + 0.15],
          [0, yHead + rise],
        ],
        sz * 0.85,
        WHITE,
      ),
    );
  } else if (head === 'broken-arch') {
    const t = 0.28;
    pieces.push(
      arcBand(half, rise, t, yHead, 100, 180, 3, sz * 0.85, WHITE),
      arcBand(half, rise, t, yHead, 0, 80, 3, sz * 0.85, WHITE),
      box(0.4, rise, sz, 0, yHead, 0, WHITE),
    );
  }
  return pieces;
}

function sill(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  return merge([box(sx, sy, sz, 0, 0, 0, WHITE)]);
}

function pairedColumn(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const r = 0.22;
  const baseH = 0.45;
  const bellH = 0.5;
  const abacusH = 0.15;
  const cz = Math.max(r, sz - r);
  const pw = 2 * r + 0.16;
  const pd = Math.min(sz, pw);
  const pz = sz - pd;
  const spread = Math.min(0.4, sx / 2 - 0.36);
  const pieces: Piece[] = [box(sx, sy, Math.min(0.08, sz * 0.2), 0, 0, 0, WHITE)];
  for (const cx of [-spread, spread]) {
    pieces.push(
      box(pw, baseH, pd, cx, 0, pz, WHITE),
      prism(r, r, sy - baseH - bellH - abacusH, cx, baseH, cz, WHITE),
      prism(r + 0.1, r, bellH, cx, sy - bellH - abacusH, cz, WHITE),
      box(pw + 0.08, abacusH, pd, cx, sy - abacusH, pz, WHITE),
    );
  }
  return merge(pieces);
}

function cornerBunch(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const r = 0.16;
  const baseH = 0.4;
  const bellH = 0.4;
  const abacusH = 0.15;
  const cz = Math.max(r, sz - r);
  const step = Math.min(0.36, sx / 2 - r - 0.08);
  const pieces: Piece[] = [
    box(sx, sy, Math.min(0.08, sz * 0.2), 0, 0, 0, WHITE),
    box(sx, baseH, sz, 0, 0, 0, WHITE),
    box(sx, abacusH, sz, 0, sy - abacusH, 0, WHITE),
  ];
  for (const cx of [-step, 0, step]) {
    pieces.push(
      prism(r, r, sy - baseH - bellH - abacusH, cx, baseH, cz, WHITE),
      prism(r + 0.07, r, bellH, cx, sy - bellH - abacusH, cz, WHITE),
    );
  }
  return merge(pieces);
}

/** The portal ring's band thickness (portalArch): the ground-arch's dark reads against the
 * same curve, so the thickness is one value here. */
const PORTAL_RING_T = 0.5;

function portalArch(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const R = sx / 2;
  const t = PORTAL_RING_T;
  const spring = sy - R;
  return merge([
    arcBand(R, R, t, spring, 0, 180, 12, sz * 0.85, WHITE),
    box(t, spring, sz * 0.85, -(R - t / 2), 0, 0, WHITE),
    box(t, spring, sz * 0.85, R - t / 2, 0, 0, WHITE),
    box(0.6, 1.0, sz, 0, sy - 1.0, 0, WHITE),
  ]);
}

/** The portal's arch read (the owner's IMG_0022 sighting, the sq-facade round's «Owed»): the
 * oval rings stand on ARCH-TOPPED dark recesses, not rectangular slabs. The cap rides the
 * portal-arch ring's own curve — 0.05 outside its inner edge, the reveal class the throat's
 * collar reads (front-on the band's face covers the cap edge; obliquely the dark reveal reads
 * between ring and dark) — and the lintel is gone: the arch IS the top, the wall reads in the
 * spandrels as it does beside the ring. One cross-part read: both parts share archBaseY, so
 * the ring's spring height in its own local coords is the dark's spring height here. The cap
 * keeps the ring's 12-segment resolution; the plaque stays inside the part's 96-tri ceiling
 * (64 + the two piers = 88). */
function groundArch(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const slabW = Math.min(4.9, sx - 0.5);
  const fw = (sx - slabW) / 2;
  const ring = envelope('portal-arch');
  const ringR = ring.sx / 2;
  const spring = ring.sy - ringR;
  const capR = ringR - PORTAL_RING_T + 0.05;
  const cap: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (Math.PI * i) / 12;
    cap.push([capR * Math.cos(a), spring + capR * Math.sin(a)]);
  }
  const hw = slabW / 2;
  const outline: readonly Pt[] = [[-hw, 0], [hw, 0], [hw, spring], ...cap, [-hw, spring]];
  return merge([
    slab(outline, Math.min(0.1, sz), DARK),
    box(fw, sy, sz, -(slabW + fw) / 2, 0, 0, WHITE),
    box(fw, sy, sz, (slabW + fw) / 2, 0, 0, WHITE),
  ]);
}

function giantColumn(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const r = Math.min(0.45, sx / 2 - 0.15);
  const pw = 2 * r + 0.3;
  const pd = Math.min(sz, pw);
  const pz = sz - pd;
  const cz = sz - pd / 2;
  return merge([
    box(pw, 0.5, pd, 0, 0, pz, WHITE),
    prism(r + 0.04, r + 0.14, 0.3, 0, 0.5, cz, WHITE),
    prism(r, r, sy - 0.8 - 0.9, 0, 0.8, cz, WHITE),
    prism(r + 0.15, r, 0.7, 0, sy - 0.9, cz, WHITE),
    box(pw, 0.2, pd, 0, sy - 0.2, pz, WHITE),
  ]);
}

/* Broken-pediment silhouette, normalised: u in [-1, 1] (half-width), v in [0, 1] (height). */
const PEDIMENT_OUTLINE: readonly Pt[] = [
  [-1, 0],
  [1, 0],
  [1, 0.16],
  [0.94, 0.32],
  [0.88, 0.26],
  [0.29, 0.68],
  [0.25, 0.6],
  [0.19, 0.72],
  [0.1, 0.92],
  [0, 1],
  [-0.1, 0.92],
  [-0.19, 0.72],
  [-0.25, 0.6],
  [-0.29, 0.68],
  [-0.88, 0.26],
  [-0.94, 0.32],
  [-1, 0.16],
];

function pediment(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const outline: Pt[] = PEDIMENT_OUTLINE.map(([u, v]) => [(u * sx) / 2, v * sy]);
  const trim = slab(outline, sz * 0.3, GOLD);
  const body = slab(outline, sz * 0.7, WHITE);
  // Slightly smaller white body in front of the full gold slab leaves a gold rim along every edge.
  body.g.scale(0.96, 0.96, 1).translate(0, 0, sz * 0.3);
  return merge([trim, body]);
}

/** The socle course (the dressings law §C1/C4): one dark unit box; the
 * instance's scale.x carries the segment length, the part's depth is the
 * proud offset. Vertex colour DARK (the recess tone — the palette stays at
 * five); the mesh receives shadows but casts none (the design's draw saving). */
function socle(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  return merge([box(sx, sy, sz, 0, 0, 0, DARK)]);
}

function cartouche(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const scaled = (pts: readonly Pt[]): Pt[] => pts.map(([u, v]) => [u * sx, v * sy]);
  const shield = scaled([
    [0, 0],
    [0.23, 0.16],
    [0.29, 0.4],
    [0.29, 0.69],
    [0.19, 0.75],
    [-0.19, 0.75],
    [-0.29, 0.69],
    [-0.29, 0.4],
    [-0.23, 0.16],
  ]);
  const wingL = scaled([
    [-0.25, 0.38],
    [-0.5, 0.72],
    [-0.4, 0.78],
    [-0.22, 0.6],
  ]);
  const wingR: Pt[] = wingL.map(([x, y]) => [-x, y]);
  const disc = new THREE.CylinderGeometry(0.2 * sx, 0.2 * sx, 0.2 * sz, 8)
    .rotateX(Math.PI / 2)
    .translate(0, 0.47 * sy, 0.75 * sz);
  return merge([
    slab(shield, 0.65 * sz, GOLD),
    slab(wingL, 0.45 * sz, GOLD),
    slab(wingR, 0.45 * sz, GOLD),
    { g: disc, c: GOLD },
    box(0.025 * sx, 0.14 * sy, 0.15 * sz, 0, 0.47 * sy, 0.85 * sz, GOLD),
    box(0.12 * sx, 0.02 * sy, 0.15 * sz, 0.06 * sx, 0.46 * sy, 0.85 * sz, GOLD),
    box(0.22 * sx, 0.25 * sy, 0.6 * sz, 0, 0.75 * sy, 0, GOLD),
  ]);
}

/* Crown profile as (depth fraction, height fraction): frieze 0.4 then stepped crowning to 1.0. */
const CROWN_PROFILE: readonly Pt[] = [
  [0, 0],
  [0.19, 0],
  [0.19, 0.4],
  [0.44, 0.45],
  [0.5, 0.7],
  [0.75, 0.75],
  [1, 0.95],
  [1, 1],
  [0, 1],
];

function corniceRun(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const piece = slab(
    CROWN_PROFILE.map(([d, v]): Pt => [d * sz, v * sy]),
    sx,
    WHITE,
  );
  // Profile was drawn in XY and extruded along Z; bake the turn so the run lies along +X and faces +Z.
  piece.g.rotateY(-Math.PI / 2).translate(sx / 2, 0, 0);
  return merge([piece]);
}

function orderJunction(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const a = sx / 2;
  const c = Math.min(sx, sz) * 0.18;
  const octagon: Pt[] = [
    [-a + c, -sz],
    [a - c, -sz],
    [a, -sz + c],
    [a, -c],
    [a - c, 0],
    [-a + c, 0],
    [-a, -c],
    [-a, -sz + c],
  ];
  const piece = slab(octagon, sy, WHITE);
  // Octagon drawn with y in [-sz, 0]; this turn maps extrusion to +Y and the footprint to z in [0, sz].
  piece.g.rotateX(-Math.PI / 2);
  return merge([piece]);
}

function balustrade(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  const balH = 0.9;
  const hb = (sy - balH) * 0.45;
  const ht = sy - balH - hb;
  const profile: Pt[] = [
    [0.06, hb],
    [0.12, hb + 0.4],
    [0.05, hb + balH],
  ];
  const pieces: Piece[] = [box(sx, hb, sz, 0, 0, 0, WHITE), box(sx, ht, sz, 0, sy - ht, 0, WHITE)];
  for (let i = 0; i < 6; i++) {
    pieces.push(lathe(profile, -sx / 2 + (sx * (i + 0.5)) / 6, sz / 2, WHITE));
  }
  return merge(pieces);
}

const VASE_PROFILE: readonly Pt[] = [
  [0.16, 0.23],
  [0.12, 0.33],
  [0.36, 0.54],
  [0.26, 0.8],
  [0.3, 0.9],
  [0, 1],
];

function vase(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  return merge([
    box(0.6 * sx, 0.23 * sy, 0.6 * sz, 0, 0, 0.2 * sz, STONE),
    lathe(
      VASE_PROFILE.map(([r, v]): Pt => [r * sx, v * sy]),
      0,
      sz / 2,
      STONE,
    ),
  ]);
}

/* Robed figure as one lathe: hem, waist, shoulders, neck, head, crown. No face by design. */
const FIGURE_PROFILE: readonly Pt[] = [
  [0.37, 0.295],
  [0.33, 0.55],
  [0.3, 0.72],
  [0.1, 0.86],
  [0.14, 0.9],
  [0.14, 0.98],
  [0, 1],
];

function statue(id: PartId): THREE.BufferGeometry {
  const { sx, sy, sz } = envelope(id);
  return merge([
    box(0.83 * sx, 0.27 * sy, 0.83 * sz, 0, 0, 0.085 * sz, STONE),
    box(sx, 0.025 * sy, sz, 0, 0.27 * sy, 0, STONE),
    lathe(
      FIGURE_PROFILE.map(([r, v]): Pt => [r * sx, v * sy]),
      0,
      sz / 2,
      STONE,
    ),
    box(0.15 * sx, 0.2 * sy, 0.17 * sz, -0.33 * sx, 0.52 * sy, 0.415 * sz, STONE),
    box(0.15 * sx, 0.2 * sy, 0.17 * sz, 0.33 * sx, 0.52 * sy, 0.415 * sz, STONE),
  ]);
}

/* ------------------------------------------------------------------ catalogue + memo */

const surroundOf = (id: PartId): THREE.BufferGeometry => {
  const p = surroundParams(id);
  return surround(id, p.opening, p.head, p.rise);
};

/** The dressings law's row3 stretch head (design §B2): the base surround's
 * pieces plus the row3 architrave course and a closed segmental band seated
 * on its top — chord 1.0 sx, the rise and thickness fitted to the head zone
 * above the architrave (the relief stays inside the declared envelope, the
 * review pass's bounds law), 12 segments, depth 0.9 sz. No gold: the whole
 * head stays WHITE like every surround. */
function surroundRow3Segmental(id: PartId): THREE.BufferGeometry {
  const p = surroundParams(id);
  // The variant relief is proportioned on its row's BASE envelope — the
  // variant's own declared bound may extend past it (the row2 mask's proud
  // tip) without scaling the fractions (the review pass's bounds law).
  const { sx, sy, sz } = envelope('surround-row3-large');
  const pieces = surroundPieces(id, p.opening, 'none', p.rise);
  const yHead = sy - p.rise;
  const zone = p.rise - 0.15;
  pieces.push(box(sx, 0.15, sz, 0, yHead, 0, WHITE));
  pieces.push(arcBand(sx / 2, 0.35 * zone, 0.15 * zone, yHead + 0.15, 0, 180, 12, sz * 0.9, WHITE));
  return merge(pieces);
}

/** The feasible lug step (the review pass's §F5 ruling): the 1.7 m opening
 * leaves a 0.2 m jamb that floors at 0.12 m, so the widest step the envelope
 * admits is 0.08 m — both risalit variants share it. */
const LUG_STEP_M = 0.08;

/** The dressings law's row3 risalit head (design §B3): the row3 base with a
 * broken pediment — two raking slabs leaving a 0.3 sx apex gap, a centre
 * block rising to the apex line through the break, and lugged ears at the
 * architrave's outer top corners; the jambs step in by the lug step so the
 * ears overhang them. All relief is fitted to the head zone above the
 * architrave (the review pass's bounds law). */
function surroundRow3Risalit(id: PartId): THREE.BufferGeometry {
  const p = surroundParams(id);
  const { sx, sy, sz } = envelope('surround-row3-large');
  const pieces = surroundPieces(id, p.opening, 'none', p.rise, LUG_STEP_M);
  const yHead = sy - p.rise;
  const yBase = yHead + 0.15;
  const zone = p.rise - 0.15;
  const apex = yHead + p.rise;
  const gapHalf = 0.15 * sx;
  const earCentre = sx / 2 - 0.06 * sx;
  pieces.push(
    box(sx, 0.15, sz, 0, yHead, 0, WHITE),
    slab(
      [
        [-sx / 2, yBase],
        [-gapHalf, apex],
        [-gapHalf, yBase],
      ],
      sz * 0.85,
      WHITE,
    ),
    slab(
      [
        [gapHalf, yBase],
        [gapHalf, apex],
        [sx / 2, yBase],
      ],
      sz * 0.85,
      WHITE,
    ),
    box(0.26 * sx, zone, 0.6 * sz, 0, yBase, 0, WHITE),
    box(0.12 * sx, zone, 0.7 * sz, -earCentre, yBase, 0, WHITE),
    box(0.12 * sx, zone, 0.7 * sz, earCentre, yBase, 0, WHITE),
  );
  return merge(pieces);
}

/** The dressings law's row2 risalit head (design §B4): the base broken-arch
 * head with a keystone mask — a 6-segment lathe dome of 5 profile points,
 * radius 0.12 sx, proud 0.3 sz, scaled to the rise-height mask and seated on
 * the keystone block's face (the profile runs rim-to-tip so the outward
 * faces wind outward — the review pass's winding law) — plus the lugged
 * ears of §B3 at the surround's top corners, sharing the lug step. */
function surroundRow2Risalit(id: PartId): THREE.BufferGeometry {
  const p = surroundParams(id);
  const { sx, sy, sz } = envelope('surround-row2-large');
  const pieces = surroundPieces(id, p.opening, 'broken-arch', p.rise, LUG_STEP_M);
  const maskRadius = 0.12 * sx;
  const profile: readonly Pt[] = [
    [maskRadius, 0],
    [0.115 * sx, 0.06 * sz],
    [0.09 * sx, 0.18 * sz],
    [0.05 * sx, 0.27 * sz],
    [0, 0.3 * sz],
  ];
  const dome = new THREE.LatheGeometry(
    profile.map(([radius, axial]) => new THREE.Vector2(radius, axial)),
    6,
  )
    .rotateX(Math.PI / 2)
    .scale(1, p.rise / (2 * maskRadius), 1)
    .translate(0, sy - p.rise / 2, sz);
  dome.computeVertexNormals();
  const earCentre = sx / 2 - 0.06 * sx;
  const earY = sy - 0.12 * sy;
  pieces.push(
    { g: dome, c: WHITE },
    box(0.12 * sx, 0.12 * sy, 0.7 * sz, -earCentre, earY, 0, WHITE),
    box(0.12 * sx, 0.12 * sy, 0.7 * sz, earCentre, earY, 0, WHITE),
  );
  return merge(pieces);
}

const BUILDERS: Partial<Record<PartId, (id: PartId) => THREE.BufferGeometry>> = {
  'surround-row1-small': surroundOf,
  'surround-row2-large': surroundOf,
  'surround-row3-large': surroundOf,
  'surround-row4-small': surroundOf,
  'surround-row3-segmental': surroundRow3Segmental,
  'surround-row2-risalit': surroundRow2Risalit,
  'surround-row3-risalit': surroundRow3Risalit,
  sill,
  'paired-column': pairedColumn,
  'corner-bunch': cornerBunch,
  'portal-arch': portalArch,
  'ground-arch': groundArch,
  'giant-column': giantColumn,
  pediment,
  cartouche,
  socle,
  'cornice-run': corniceRun,
  'order-junction': orderJunction,
  balustrade,
  vase,
  statue,
};

const geometryCache = new Map<PartId, THREE.BufferGeometry>();

export function getPartGeometry(partId: PartId): THREE.BufferGeometry {
  const cached = geometryCache.get(partId);
  if (cached) return cached;
  const build = BUILDERS[partId];
  if (!build) throw new Error(`facade-builder: no geometry defined for part "${partId}"`);
  const geometry = build(partId);
  geometry.name = partId;
  geometryCache.set(partId, geometry);
  return geometry;
}

/* ------------------------------------------------------------------ assembly */

export type FacadeBuild = Readonly<{
  group: THREE.Group;
  meshes: readonly THREE.InstancedMesh[];
  material: THREE.MeshLambertMaterial;
  trianglesByPart: Readonly<Record<PartId, number>>;
  instanceTotal: number;
}>;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------------ facade-surface slot */

/*
 * DEC-033 / design-winter.md §3: the ONE injection point on the kit's single material.
 * Contract: inputs are world height (vFacadeWorldY), the shading normal and clock scalars;
 * SURFACE TERMS run BEFORE LIGHT TERMS — snow alters the albedo before lighting; the floodlight
 * (5+ Floodlit) later adds irradiance after it, reusing the same varying. One shared uniforms
 * object, written once per frame by the host. No hash, no noise (DEC-019 discipline).
 * At uSnow === 0 every term is an exact identity (mix by 0) — out-of-season frames unchanged.
 */
export type FacadeSurfaceUniforms = Readonly<{ uSnow: { value: number } }>;

export const FACADE_SURFACE_UNIFORMS: FacadeSurfaceUniforms = { uSnow: { value: 0 } };

/** Snow catches on up-facing surfaces: dot(shadingNormal, worldUp) across this smoothstep.
 * Tuned by the owner's verdict (2026-10-27): the band lowered (0.45→0.8 → 0.3→0.75) so the
 * shallower slopes — pediment rakes, broken-arch tops — catch the dusting from the rail. */
export const SNOW_FACING = { lo: 0.3, hi: 0.75 } as const;

/** TUNING TARGET (DEC-033): the cleared, trampled zone — coverage fades out below topM world height. */
export const SNOW_CLEAR = { bottomM: 0, topM: 1.5 } as const;

/* Patched and unpatched programs must never share a cache entry: any non-empty key is distinct. */
const FACADE_SURFACE_CACHE_KEY = 'FacadeKit/surface-slot/snow@1';

const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : `${x}`);

const SURFACE_VERTEX_DECL = `#include <common>
varying float vFacadeWorldY;`;

const SURFACE_VERTEX_BODY = `#include <worldpos_vertex>
{
vec4 facadeWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
facadeWorld = instanceMatrix * facadeWorld;
#endif
vFacadeWorldY = ( modelMatrix * facadeWorld ).y;
}`;

const SURFACE_FRAGMENT_DECL = `#include <common>
uniform float uSnow;
varying float vFacadeWorldY;`;

const SURFACE_FRAGMENT_BODY = `#include <normal_fragment_maps>
{
vec3 facadeUpView = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
float snowFacing = smoothstep( ${glslFloat(SNOW_FACING.lo)}, ${glslFloat(SNOW_FACING.hi)}, dot( normal, facadeUpView ) );
float snowCleared = smoothstep( ${glslFloat(SNOW_CLEAR.bottomM)}, ${glslFloat(SNOW_CLEAR.topM)}, vFacadeWorldY );
float snowCoverage = uSnow * snowFacing * snowCleared;
diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${SNOW_ALBEDO_LINEAR.map(glslFloat).join(', ')} ), snowCoverage );
}`;

function spliceChunk(source: string, anchor: string, replacement: string, stage: string): string {
  if (!source.includes(anchor)) {
    throw new Error(
      `facade-builder: surface slot anchor '${anchor}' missing from the ${stage} shader`,
    );
  }
  return source.replace(anchor, replacement);
}

/** The one onBeforeCompile on the kit material; the host writes `uniforms.uSnow.value` per frame. */
export function patchFacadeSurfaceSlot(
  material: THREE.Material,
  uniforms: FacadeSurfaceUniforms = FACADE_SURFACE_UNIFORMS,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = uniforms.uSnow;
    shader.vertexShader = spliceChunk(
      spliceChunk(shader.vertexShader, '#include <common>', SURFACE_VERTEX_DECL, 'vertex'),
      '#include <worldpos_vertex>',
      SURFACE_VERTEX_BODY,
      'vertex',
    );
    shader.fragmentShader = spliceChunk(
      spliceChunk(shader.fragmentShader, '#include <common>', SURFACE_FRAGMENT_DECL, 'fragment'),
      '#include <normal_fragment_maps>',
      SURFACE_FRAGMENT_BODY,
      'fragment',
    );
  };
  material.customProgramCacheKey = () => FACADE_SURFACE_CACHE_KEY;
}

function placementsFor(solved: SolvedFacade, partId: PartId): readonly Placement[] {
  const byPart = solved.byPart as Partial<Record<PartId, readonly Placement[]>>;
  return byPart[partId] ?? [];
}

export function buildFacade(solved: SolvedFacade): FacadeBuild {
  if (solved.placements.length === 0) {
    throw new Error('facade-builder: solved facade carries no placements');
  }
  const tally = new Map<PartId, number>();
  for (const placement of solved.placements) {
    if (!(placement.partId in KIT)) {
      throw new Error(
        `facade-builder: unknown partId "${placement.partId}" on placement "${placement.id}"`,
      );
    }
    tally.set(placement.partId, (tally.get(placement.partId) ?? 0) + 1);
  }

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xffffff });
  material.name = 'FacadeKit';
  // DEC-033: the facade-surface slot — the one onBeforeCompile on the kit's single material.
  patchFacadeSurfaceSlot(material);
  const group = new THREE.Group();
  group.name = 'FacadeKit';

  const meshes: THREE.InstancedMesh[] = [];
  const trianglesByPart = {} as Record<PartId, number>;
  for (const id of PART_IDS) trianglesByPart[id] = 0;

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  let instanceTotal = 0;

  for (const partId of PART_IDS) {
    const list = placementsFor(solved, partId);
    const expected = tally.get(partId) ?? 0;
    if (list.length !== expected) {
      throw new Error(
        `facade-builder: byPart["${partId}"] holds ${list.length} placements but placements[] carries ${expected}`,
      );
    }
    if (list.length === 0) continue;
    for (const placement of list) {
      if (placement.partId !== partId) {
        throw new Error(
          `facade-builder: placement "${placement.id}" (${placement.partId}) filed under "${partId}"`,
        );
      }
    }
    const geometry = getPartGeometry(partId);
    const triangles = countTriangles(geometry);
    const ceiling = KIT[partId].triangleCeiling;
    if (triangles > ceiling) {
      throw new Error(
        `facade-builder: "${partId}" uses ${triangles} triangles, ceiling is ${ceiling}`,
      );
    }
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.name = partId;
    list.forEach((placement, i) => {
      position.set(placement.position.x, placement.position.y, placement.position.z);
      quaternion.setFromAxisAngle(Y_AXIS, placement.rotationY);
      scale.set(placement.scale.x, placement.scale.y, placement.scale.z);
      mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
    });
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    // The ONE castShadow law lives on the PartMeta row (the projection reads
    // it too): the socle course hugs the wall base and casts nothing (§C4).
    mesh.castShadow = KIT[partId].castShadow;
    mesh.receiveShadow = true;
    meshes.push(mesh);
    group.add(mesh);
    trianglesByPart[partId] = triangles;
    instanceTotal += list.length;
  }

  if (instanceTotal !== solved.placements.length) {
    throw new Error(
      `facade-builder: byPart totals ${instanceTotal} instances but placements[] carries ${solved.placements.length}`,
    );
  }

  return Object.freeze({
    group,
    meshes: Object.freeze(meshes),
    material,
    trianglesByPart: Object.freeze(trianglesByPart),
    instanceTotal,
  });
}
