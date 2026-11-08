// docs/design-mobile-tier.md §§4–5 (as amended by the movement-ux round): injected facts only;
// the host owns input and layout. The pair is visible at EVERY pointer type and width (the old
// coarse/narrow law is retired — touchRailVisible + TOUCH_RAIL_MAX_WIDTH_PX no longer exist);
// the admission law is ONE law everywhere (mid-walk presses extend the walk).
export const TOUCH_BUTTON_MIN_INLINE_PX = 72;
/** R25-ux: 44 → 41 by the owner's call — the hit area is the box itself; 41 is chosen knowing
 * the 44 px touch-target convention (WCAG 2.5.8's 24 px floor stands clear). The bottom edge
 * stays on slotBottom, so the pair's centre drops 1.5 px — the round's only position change. */
export const TOUCH_BUTTON_MIN_BLOCK_PX = 41;
export const TOUCH_RAIL_GAP_PX = 8;
export const TOUCH_RAIL_INSET_PX = 24;
/** R21-ux: each box sits this share of the viewport width inside the inset (host writes `%`). */
export const TOUCH_RAIL_SHIFT_PCT = 7;
export const TOUCH_RAIL_CLEARANCE_PX = 16;

export const TOUCH_RAIL_PROMPT_LINES = 3;

/** R19-ux A.1: the line the pair's box stands on — one stack gap above the highest top any
 * corner-stack member but the entry title can reach. In-flow members stack up from the stack's
 * bottom edge, each at the larger of its box and its reserve (the door prompt reserves
 * TOUCH_RAIL_PROMPT_LINES of its line box, so no door label rises into the pair); out-of-flow
 * members sharing a button column count at their own tops. overflow=true when a member
 * outgrows its reserve: the slot clears it at that layout and the host warns.
 * R20-ux: this is the LOWEST clean line — directly below it sit the stack gap, then the
 * highest member at its reserve. Lowering the pair D px puts that member (D − gap) px into the
 * box (with a reserve-filling door label, D = gap + box/2 is the R19-ux A defect). A lower pair
 * needs a smaller HONEST reserve (fewer real label lines), never an offset. */
export function touchRailSlotBottom(
  f: Readonly<{
    stackBottom: number;
    gap: number;
    inFlow: ReadonlyArray<Readonly<{ height: number; reserve: number }>>;
    outOfFlowTops: ReadonlyArray<number>;
  }>,
): { slotBottom: number; overflow: boolean } {
  let top = f.stackBottom;
  let overflow = false;
  for (const member of f.inFlow) {
    top -= Math.max(member.height, member.reserve) + f.gap;
    if (member.reserve > 0 && member.height > member.reserve) overflow = true;
  }
  return { slotBottom: Math.min(top, ...f.outOfFlowTops.map((t) => t - f.gap)), overflow };
}

/** The pair's box stands on slotBottom (touchRailSlotBottom): its bottom edge there. The slot
 * is the law: the centre never clamps or moves. fits=false when the box would run into the
 * chrome above (bandTop already carries the clearance) — warn, never hide. */
export function touchRailCenter(
  bandTop: number,
  slotBottom: number,
  height: number,
): { center: number; fits: boolean } {
  const center = slotBottom - height / 2;
  return { center, fits: center - height / 2 >= bandTop };
}

export function admitTouchTravel(
  f: Readonly<{
    settled: boolean;
    transitNull: boolean;
    canvasGestureFree: boolean;
    menuOwningInput: boolean;
  }>,
): 'accept' | 'drop' {
  // ONE admission law everywhere (the §5 NOTE's amendment): a press is admitted mid-walk —
  // it extends the walk; the walk law owns idempotency (a refill never multiplies the pace).
  return f.settled && f.transitNull && f.canvasGestureFree && !f.menuOwningInput
    ? 'accept'
    : 'drop';
}

export function canvasContact(
  f: Readonly<{
    primaryDown: boolean;
    secondContactShadowed: boolean;
    reArmableAfterSequenceEnd: boolean;
  }>,
): 'admit' | 'cancel' | 'drop' | 'rearm' {
  if (f.reArmableAfterSequenceEnd) return 'rearm';
  if (f.secondContactShadowed) return 'cancel';
  return f.primaryDown ? 'admit' : 'drop';
}
