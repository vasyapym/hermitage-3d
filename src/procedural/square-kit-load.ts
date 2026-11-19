// src/procedural/square-kit-load.ts
/**
 * The square kit's late-bind mount (DEC-045, batch M3 — design §6 M3; the architecture's
 * load + bind laws). ONE fetch root (the manifest, then its relative glb), boot-parallel
 * after the first presented frame, additive content never load-bearing: every failure
 * logs exactly once and leaves the scene as it was. The glb ships placeholder PBR
 * materials; the mount binds every slot BY MATERIAL NAME to the square's shared scene
 * materials — the MeshStandardMaterial trap: an unbound glb material under the square's
 * null environment reads dull/black and ignores the fade, so one unknown slot fails the
 * whole mount. The mounted group parents under the caller's group (the palace), so the
 * indoors visibility flip inherits; every mesh casts and receives shadows. The mount
 * state rides `data-square-kit` on the document root: loading → ready | failed.
 * Ledger note (the DEC-045 ripple's ruling): the kit does NOT register in the disposal
 * ledger — the resident never unmounts, and a resident row would break the
 * ledger-returns-to-boot law the smoke pins (data-ledger-bytes 0 at the square).
 */
import { type Group, type Material, Mesh } from 'three';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  type BindKey,
  KIT_MOUNT_ATTR,
  type KitMountState,
  SQUARE_KIT_GLB,
  SQUARE_KIT_URL,
  validateSquareManifest,
} from '../world/square-kit';

export type SquareKitMaterials = Readonly<Record<BindKey, Material>>;

export type SquareKitMount = Readonly<{
  /** The group the kit parents under — the palace; the indoors flip inherits. */
  palace: Group;
  /** The shared-material bind record: glb material name → the square's scene material. */
  materials: SquareKitMaterials;
}>;

const setState = (state: KitMountState): void => {
  document.documentElement.setAttribute(KIT_MOUNT_ATTR, state);
};

function bindAndAdd(gltf: GLTF, host: SquareKitMount): void {
  const byName = new Map<string, Material>(Object.entries(host.materials));
  gltf.scene.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const slots = Array.isArray(obj.material) ? obj.material : [obj.material];
    const bound = slots.map((slot) => {
      const shared = byName.get(slot.name);
      if (shared === undefined) {
        throw new Error(`square kit: unbound material slot "${slot.name}" (the bind law)`);
      }
      return shared;
    });
    obj.material = Array.isArray(obj.material) ? bound : (bound[0] ?? obj.material);
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
  gltf.scene.name = 'square-kit';
  host.palace.add(gltf.scene);
}

/** Starts the late-bind mount; fire-and-forget — the scene never depends on the kit. */
export function mountSquareKit(host: SquareKitMount): void {
  setState('loading');
  void (async () => {
    try {
      const res = await fetch(SQUARE_KIT_URL);
      if (!res.ok) throw new Error(`square kit: manifest ${res.status}`);
      const manifest: unknown = await res.json();
      if (!validateSquareManifest(manifest)) {
        throw new Error('square kit: the manifest fails validateSquareManifest');
      }
      const glbPath = SQUARE_KIT_URL.replace(/manifest\.json$/, SQUARE_KIT_GLB);
      const glbRes = await fetch(glbPath);
      if (!glbRes.ok) throw new Error(`square kit: glb ${glbRes.status}`);
      const glb = await glbRes.arrayBuffer();
      const gltf = await new Promise<GLTF>((resolve, reject) =>
        new GLTFLoader().parse(glb, '', resolve, reject),
      );
      bindAndAdd(gltf, host);
      setState('ready');
    } catch (error) {
      console.error('zimny: the square kit failed to mount', error); // exactly once
      setState('failed');
    }
  })();
}
