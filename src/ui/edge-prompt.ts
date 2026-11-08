// src/ui/edge-prompt.ts
/**
 * The door label law — docs/design-walkthrough-ux.md §2 (the invitation, adopted), §9
 * (the invitation script), §10 D1, §12 R-UX2; DEC-031 amended (its prompt copy replaced;
 * its momentum-gate and minimap rejections stand).
 *
 * The chrome line at a rail end is the door's answer to a push: it names what lies through
 * the door («Enter · Rastrelli Gallery», «Back out · Palace Square») and shows only when the
 * camera is settled AT the end — the rail at rest (no walk), the arrival beats done, no
 * transit — AND the door has been asked. The far end (u = 1) asks by being reached; the entry
 * end (u = 0) asks only after a push INTO its clamp, so a fresh arrival shows the caption
 * alone, a backward push shows «Back out», and forward travel walks in silently.
 *
 * Three pure pieces, fed by the host:
 * - pushMemory (once per frame): the remembered push into the clamped end. Set by a push in
 *   the end's direction, held while the settled parameter stays on that end, dropped the
 *   frame the state leaves it. Boundary press edge (arrows or the pair) and label click are
 *   both pushes. (The wheel-through push retired with the wheel — the movement-ux ruling.)
 * - edgePromptView (once per frame): visible ⇔ settled ∧ atRest ∧ boundary ≠ null ∧
 *   (boundary = 'forward' ∨ pushed = boundary). «No frame shows the label while the camera
 *   moves»: atRest is the walk law's moving() === false — a forward approach shows on its
 *   settle frame; a backward push at a resting clamp shows on the push frame.
 * - doorLabel (on change): the room's NAME is the head of its sentence title before the em
 *   dash («Rastrelli Gallery — the way in» → «Rastrelli Gallery»; a bare title is its own
 *   name). The card keeps the sentence; the door says the name. Separator: the ruled « · ».
 * The host owns the node, the 240 ms fade, the language swap and the click (the boundary chain
 * the arrows use). Golden fixtures hide the node; a seeded golden has no push in any case.
 */
export type DoorBoundary = 'backward' | 'forward';
export const DOOR_LABEL_SEPARATOR = ' · ';
export interface EdgePromptInput {
  /** The arrival beats own the pre-settle frames; a transit owns the camera. */
  readonly settled: boolean;
  /** The rail's glide === null: the camera is not moving along the rail. */
  readonly atRest: boolean;
  /** The rail end the resting camera sits on, only when an airlock side exists there. */
  readonly boundary: DoorBoundary | null;
  /** The remembered push into the clamped end (pushMemory). */
  readonly pushed: DoorBoundary | null;
}
export interface EdgePromptView {
  readonly visible: boolean;
  /** The door the label names; null exactly when invisible. */
  readonly boundary: DoorBoundary | null;
}
export interface PushInput {
  /** The end the CLAMPED scroll target sits on (glide included), with an airlock side. */
  readonly end: DoorBoundary | null;
  /** This frame's push intent, if any: wheel sign, arrow boundary step, label click. */
  readonly push: DoorBoundary | null;
}
export function pushMemory(previous: DoorBoundary | null, input: PushInput): DoorBoundary | null {
  if (input.end === null) return null;
  if (input.push === input.end) return input.end;
  return previous === input.end ? previous : null;
}
export function edgePromptView(input: EdgePromptInput): EdgePromptView {
  const asked = input.boundary === 'forward' || input.pushed === input.boundary;
  const visible = input.settled && input.atRest && input.boundary !== null && asked;
  return { visible, boundary: visible ? input.boundary : null };
}
/** The head of a sentence title before its em dash, whitespace (NBSP included) trimmed. */
export function roomName(title: string): string {
  const head = (title.split('—')[0] ?? title).trim();
  const name = head.length > 0 ? head : title.trim();
  if (name.length === 0) throw new RangeError('edge-prompt: a door label needs a room name');
  return name;
}
export function doorLabel(input: Readonly<{ verb: string; title: string }>): string {
  const verb = input.verb.trim();
  if (verb.length === 0) throw new RangeError('edge-prompt: a door label needs a verb');
  return `${verb}${DOOR_LABEL_SEPARATOR}${roomName(input.title)}`;
}
