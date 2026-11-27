/*
 * The 1812 kit's runtime classification (docs/design-gallery.md §3.2/§3.3; the merge law).
 * Pure: no three, no DOM, no node, no clock, no randomness.
 *
 * State laws:
 * - ROLE: a part is a kit frame, a kit canvas, a runtime-hinged door leaf, or an architecture
 *   part — by the part-name prefix the bpy builder committed (frame_%03d / canvas_%03d /
 *   leaf_sg_*; mg-1812-look DECISION-1 adds the leaf role; else architecture).
 * - WALL: a kit part's wall comes from the LAYOUT LAW by frame index
 *   (rooms/1812/layout.ts allFrames()[index].wall) — never from geometry centroids: the
 *   usable wall range is inset from the modelled ends, so bay-0 columns classify north and
 *   bay-10 columns south of it, and a centroid read misclassifies the end bays. The part
 *   name's number is the frame index. The K8 portal and the two allies hang in the end-wall
 *   group with H3 (§3.3 "the end-wall group lives with H3").
 * - The four merge buckets: west, east, north (the flanking pair) and the end-wall group.
 *   The leaf parts hang in no bucket: they mount as their own meshes (the hinges).
 */
import { allFrames } from './layout';

export type KitRole = 'frame' | 'canvas' | 'leaf' | 'architecture';
export type KitWall = 'west' | 'east' | 'north' | 'h3';
export const KIT_WALLS: readonly KitWall[] = ['west', 'east', 'north', 'h3'];

export function roleOf(name: string): KitRole {
  if (name.startsWith('frame_')) return 'frame';
  if (name.startsWith('canvas_')) return 'canvas';
  if (name.startsWith('leaf_')) return 'leaf';
  return 'architecture';
}

/** The hinge law of a leaf part, from the committed node names (mg-1812-look DECISION-1):
 * leaf_sg_n pivots at the opening's north jamb (z 11.55), leaf_sg_s at the south one
 * (z 13.45); the hinge sign carries the sweep direction — both free edges swing toward −x,
 * into the gallery (verified by capture). The room tag scopes the host's per-room grouping
 * (both interiors may be resident mid-transit). A leaf part naming neither law throws loud. */
export function leafOfName(
  name: string,
): { airlock: 'throne-airlock'; hinge: 1 | -1; room: 'military-gallery' } | null {
  if (name === 'leaf_sg_n')
    return { airlock: 'throne-airlock', hinge: -1, room: 'military-gallery' };
  if (name === 'leaf_sg_s')
    return { airlock: 'throne-airlock', hinge: 1, room: 'military-gallery' };
  return null;
}

/** The frame index a kit part carries in its name, or null for an architecture part. */
export function indexOfName(name: string): number | null {
  const role = roleOf(name);
  if (role === 'architecture') return null;
  // The role prefixes differ in length: 'frame_' is 6 characters, 'canvas_' is 7.
  const prefix = role === 'frame' ? 'frame_' : 'canvas_';
  const index = Number.parseInt(name.slice(prefix.length), 10);
  return Number.isFinite(index) ? index : null;
}

/** The merge bucket of a kit part: the layout law's wall, south mapped onto the end group. */
export function wallOfName(name: string): KitWall | null {
  const index = indexOfName(name);
  if (index === null) return null;
  const frame = allFrames()[index];
  if (frame === undefined) return null;
  if (frame.wall === 'south') return 'h3';
  return frame.wall;
}
