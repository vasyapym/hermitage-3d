/**
 * DEC-037 — the Alexander Column builder: ONE merged non-indexed mesh with vertex colours and ONE
 * MeshLambertMaterial (no shader slot, no program key). The law lives in src/world/column.ts.
 */
import * as THREE from 'three';
import {
  BRONZE_PATINA_LINEAR,
  COLUMN_ANGEL_PEDESTAL,
  COLUMN_CAPITAL,
  COLUMN_CROSS,
  COLUMN_CROSS_HEIGHT_M,
  COLUMN_FIGURE,
  COLUMN_FIGURE_HEIGHT_M,
  COLUMN_PEDESTAL,
  COLUMN_PLINTH,
  COLUMN_RELIEF,
  COLUMN_SHAFT,
  COLUMN_TRIANGLES,
  COLUMN_X,
  COLUMN_Y,
  COLUMN_Z,
  GRANITE_RAPAKIVI_LINEAR,
  type Rgb,
  shaftProfile,
} from '../world/column';

export type ColumnBuild = Readonly<{
  mesh: THREE.Mesh;
  material: THREE.MeshLambertMaterial;
  triangles: number;
}>;

type Part = readonly [THREE.BufferGeometry, Rgb];

function merge(parts: readonly Part[]): THREE.BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const color: number[] = [];
  for (const [source, rgb] of parts) {
    const flat = source.index === null ? source : source.toNonIndexed();
    const p = flat.getAttribute('position');
    const n = flat.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
      color.push(rgb[0], rgb[1], rgb[2]);
    }
    if (flat !== source) flat.dispose();
    source.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  merged.computeBoundingSphere();
  return merged;
}

export function buildColumn(): ColumnBuild {
  const granite = GRANITE_RAPAKIVI_LINEAR;
  const bronze = BRONZE_PATINA_LINEAR;
  const y = COLUMN_Y;
  const parts: Part[] = [];

  const stepH = COLUMN_PLINTH.heightM / COLUMN_PLINTH.steps;
  for (let k = 0; k < COLUMN_PLINTH.steps; k++) {
    const w = COLUMN_PLINTH.footprintM - 2 * COLUMN_PLINTH.stepInsetM * k;
    parts.push([new THREE.BoxGeometry(w, stepH, w).translate(0, stepH * (k + 0.5), 0), granite]);
  }

  const pw = COLUMN_PEDESTAL.widthM;
  const pedestalMidY = y.plinthTop + COLUMN_PEDESTAL.heightM / 2;
  parts.push([
    new THREE.BoxGeometry(pw, COLUMN_PEDESTAL.heightM, pw).translate(0, pedestalMidY, 0),
    granite,
  ]);
  for (let side = 0; side < 4; side++) {
    const panel = new THREE.PlaneGeometry(COLUMN_RELIEF.widthM, COLUMN_RELIEF.heightM)
      .translate(0, 0, pw / 2 + COLUMN_RELIEF.standoffM)
      .rotateY((side * Math.PI) / 2)
      .translate(0, pedestalMidY, 0);
    parts.push([panel, bronze]);
  }

  const profile = shaftProfile().map(([r, h]) => new THREE.Vector2(r, h));
  parts.push([
    new THREE.LatheGeometry(profile, COLUMN_SHAFT.segments).translate(0, y.pedestalTop, 0),
    granite,
  ]);

  const c = COLUMN_CAPITAL;
  parts.push([
    new THREE.CylinderGeometry(
      c.echinusTopRadiusM,
      COLUMN_SHAFT.topRadiusM,
      c.echinusM,
      COLUMN_SHAFT.segments,
      1,
      true,
    ).translate(0, y.shaftTop + c.echinusM / 2, 0),
    bronze,
  ]);
  parts.push([
    new THREE.BoxGeometry(c.abacusWidthM, c.abacusM, c.abacusWidthM).translate(
      0,
      y.capitalTop - c.abacusM / 2,
      0,
    ),
    bronze,
  ]);

  const a = COLUMN_ANGEL_PEDESTAL;
  parts.push([
    new THREE.CylinderGeometry(
      a.radiusM,
      a.radiusM,
      a.drumM,
      COLUMN_SHAFT.segments,
      1,
      true,
    ).translate(0, y.capitalTop + a.drumM / 2, 0),
    bronze,
  ]);
  parts.push([
    new THREE.SphereGeometry(
      a.radiusM,
      COLUMN_SHAFT.segments,
      a.domeRings,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    )
      .scale(1, a.domeM / a.radiusM, 1)
      .translate(0, y.drumTop, 0),
    bronze,
  ]);

  const f = COLUMN_FIGURE;
  parts.push([
    new THREE.CylinderGeometry(
      f.topRadiusM,
      f.baseRadiusM,
      COLUMN_FIGURE_HEIGHT_M,
      f.segments,
    ).translate(0, y.domeTop + COLUMN_FIGURE_HEIGHT_M / 2, 0),
    bronze,
  ]);

  const cr = COLUMN_CROSS;
  parts.push([
    new THREE.BoxGeometry(cr.poleM, COLUMN_CROSS_HEIGHT_M, cr.poleM).translate(
      0,
      y.crossBottom + COLUMN_CROSS_HEIGHT_M / 2,
      -cr.behindM,
    ),
    bronze,
  ]);
  parts.push([
    new THREE.BoxGeometry(cr.barWidthM, cr.poleM, cr.poleM).translate(
      0,
      y.crossTop - cr.barBelowTopM,
      -cr.behindM,
    ),
    bronze,
  ]);

  const geometry = merge(parts);
  const triangles = geometry.getAttribute('position').count / 3;
  if (triangles !== COLUMN_TRIANGLES) {
    throw new Error(`[column] built ${triangles} triangles; the law pins ${COLUMN_TRIANGLES}`);
  }

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
  });
  material.name = 'ColumnGraniteBronze';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'AlexanderColumn';
  mesh.position.set(COLUMN_X, 0, COLUMN_Z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return Object.freeze({ mesh, material, triangles });
}

/** The massing fade's reach (opaque once settled, like the kit and the throat). */
export function setColumnOpacity(build: ColumnBuild, opacity: number): void {
  build.material.opacity = opacity;
  build.material.transparent = opacity < 1;
}
