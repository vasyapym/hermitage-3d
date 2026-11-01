// docs/design-mobile-tier.md §§4–5: injected facts only; the host owns input and layout.
export const TOUCH_BUTTON_MIN_INLINE_PX = 72;
export const TOUCH_BUTTON_MIN_BLOCK_PX = 44;
export const TOUCH_RAIL_GAP_PX = 8;
export const TOUCH_RAIL_INSET_PX = 24;
export const TOUCH_RAIL_CLEARANCE_PX = 16;
export const TOUCH_RAIL_MAX_WIDTH_PX = 767.98;
/** R18-ux D6: the pair's centre line sits at this fraction of the free band measured from
 * the band's top — a quarter of the band below its midpoint. */
export const TOUCH_RAIL_BAND_FRACTION = 0.75;

/** R18-ux D6: the centre line at BAND_FRACTION of the free band from its top, clamped so the
 * box fits; a misfit (a band shorter than the box) centres in the band and reports
 * fits=false — warn, never hide. */
export function touchRailCenter(
  bandTop: number,
  bandBottom: number,
  height: number,
): { center: number; fits: boolean } {
  const lo = bandTop + height / 2;
  const hi = bandBottom - height / 2;
  if (hi < lo) return { center: (bandTop + bandBottom) / 2, fits: false };
  const ideal = bandTop + TOUCH_RAIL_BAND_FRACTION * (bandBottom - bandTop);
  return { center: Math.min(hi, Math.max(lo, ideal)), fits: true };
}

export function touchRailVisible(
  f: Readonly<{ coarsePointer: boolean; widthCssPx: number }>,
): boolean {
  return f.coarsePointer || f.widthCssPx <= TOUCH_RAIL_MAX_WIDTH_PX;
}

export function admitTouchTravel(
  f: Readonly<{
    settled: boolean;
    transitNull: boolean;
    glideNull: boolean;
    canvasGestureFree: boolean;
    menuOwningInput: boolean;
  }>,
): 'accept' | 'drop' {
  // Deliberately stricter than arrows: their mid-glide retargeting remains unchanged.
  return f.settled && f.transitNull && f.glideNull && f.canvasGestureFree && !f.menuOwningInput
    ? 'accept'
    : 'drop';
}

export function admitTouchKey(
  f: Readonly<{ repeat: boolean; accepted: boolean }>,
): 'accept' | 'drop' {
  return !f.repeat && !f.accepted ? 'accept' : 'drop';
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
