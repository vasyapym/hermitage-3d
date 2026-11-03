/**
 * DEC-038 — the Column's bronze fence builder: ONE merged non-indexed mesh and ONE
 * MeshLambertMaterial in the declared bronze. No vertex colours (the fence is one colour), no
 * shader slot, no program key. The law lives in src/world/column-fence.ts.
 */
import * as THREE from 'three';
import { BRONZE_PATINA_LINEAR, COLUMN_FENCE, COLUMN_X, COLUMN_Z } from '../world/column';
import {
  COLUMN_FENCE_GUN,
  COLUMN_FENCE_STAFF,
  COLUMN_FENCE_TRIANGLES,
  columnFenceGunStations,
  columnFenceStaffStations,
  columnFenceTies,
} from '../world/column-fence';

export type ColumnFenceBuild = Readonly<{
  mesh: THREE.Mesh;
  material: THREE.MeshLambertMaterial;
  triangles: number;
}>;

function merge(parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  for (const source of parts) {
    const flat = source.index === null ? source : source.toNonIndexed();
    const p = flat.getAttribute('position');
    const n = flat.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      position.push(p.getX(i), p.getY(i), p.getZ(i));
      normal.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (flat !== source) flat.dispose();
    source.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  merged.computeBoundingSphere();
  return merged;
}

export function buildColumnFence(): ColumnFenceBuild {
  const h = COLUMN_FENCE.heightM;
  const parts: THREE.BufferGeometry[] = [];
  const gun = COLUMN_FENCE_GUN;
  for (const [x, z] of columnFenceGunStations()) {
    parts.push(
      new THREE.CylinderGeometry(gun.radiusM, gun.radiusM, h, gun.segments).translate(x, h / 2, z),
    );
  }
  const staff = COLUMN_FENCE_STAFF;
  for (const [x, z] of columnFenceStaffStations()) {
    parts.push(
      new THREE.CylinderGeometry(
        staff.radiusM,
        staff.radiusM,
        h,
        staff.segments,
        1,
        true,
      ).translate(x, h / 2, z),
    );
  }
  for (const { centre, size } of columnFenceTies()) {
    parts.push(new THREE.BoxGeometry(...size).translate(...centre));
  }
  const geometry = merge(parts);
  const triangles = geometry.getAttribute('position').count / 3;
  if (triangles !== COLUMN_FENCE_TRIANGLES) {
    throw new Error(
      `[column-fence] built ${triangles} triangles; the law pins ${COLUMN_FENCE_TRIANGLES}`,
    );
  }
  const material = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0 });
  material.color.setRGB(...BRONZE_PATINA_LINEAR, THREE.LinearSRGBColorSpace);
  material.name = 'ColumnFenceBronze';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'AlexanderColumnFence';
  mesh.position.set(COLUMN_X, 0, COLUMN_Z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return Object.freeze({ mesh, material, triangles });
}

/** The massing fade's reach — setColumnOpacity's law (opaque once settled). */
export function setColumnFenceOpacity(build: ColumnFenceBuild, opacity: number): void {
  build.material.opacity = opacity;
  build.material.transparent = opacity < 1;
}
