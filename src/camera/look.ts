/**
 * Look response law — how the camera's free look answers a drag.
 *
 * Implements design-staircase.md §6.1 (look offsets and limits — the rendering law and the limit
 * values are frozen and stay in rail.ts) and the r21 owner report ("dragging turns the view very
 * fast — almost nauseating"); §10 row r21.
 *
 * Pure: three-free, DOM-free. Two laws, each a declared tuning target for the owner's device:
 *
 * sensitivity deg/px = DRAG_SPAN_DEG / viewportHeightPx
 *   A drag spanning the whole viewport height turns DRAG_SPAN_DEG degrees, so the
 *   same viewport FRACTION of drag yields the same degrees on every screen, mouse or
 *   finger alike. One scalar for both axes, so diagonal drags stay isotropic.
 *
 * damping current += (target - current) * (1 - exp(-dtMs / LOOK_TAU_MS))
 *   Frame-rate-independent exponential ease of the rendered look toward the drag
 *   target; self-similar, so one 100 ms step equals ten 10 ms steps.
 *
 * rail.ts splits the look state: drag() accumulates the clamped TARGET (`lookTarget`), advance()
 * eases the CURRENT (`look`) toward it every frame, settle() re-clamps both to the limits in
 * force. The damping stays under reduced motion: it only shapes user-initiated direct
 * manipulation downward and never adds motion of its own.
 */
export type LookOffset = Readonly<{ yaw: number; pitch: number }>;
export type LookLimits = Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>;
/** The look fields RailState carries, by the same names: eased CURRENT and drag TARGET. */
export type LookState = Readonly<{ look: LookOffset; lookTarget: LookOffset }>;
export const NO_LOOK = { yaw: 0, pitch: 0 } satisfies LookOffset;
/**
 * Declared tuning target. Degrees of look a drag spanning the full viewport height traverses.
 * 35 was calibrated to the §6.1 yaw limit (a half-height drag covered about half of it); the
 * r26.1 owner report («… a bit fast — around 15% slower») lowered it to 30; the R19-ux report
 * («manual looking around ~10% faster — it reads slower than the automatic look») raises it
 * to 33 for every pointer kind (TOUCH_SPAN_FACTOR unchanged: the phone runs 37.95°/height).
 * The automatic family (rail.ts: the destination turn during travel) uses a segment law,
 * not a per-pixel one; no fixed angular-rate equivalence follows from a swipe duration.
 * This changes manual gain only: its damping and the existing look limits stay unchanged.
 */
export const DRAG_SPAN_DEG = 33;
/**
 * Declared tuning target. Damping time constant: 63% of the remaining offset closes per TAU and
 * the ease is visually settled after ~5 TAU. Shorter is snappier, longer floatier (80–200 ms).
 */
export const LOOK_TAU_MS = 100;
/**
 * Numerical: below this remaining offset the ease lands on the target exactly, so lookSettled()
 * becomes true (pure exponential decay never arrives). Far sub-pixel at any §6.1 field of view.
 */
export const LOOK_SNAP_DEG = 1e-3;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** §6.1 limits, verbatim from rail.ts: yaw symmetric, pitch asymmetric (down is negative). */
export const clampLook = (look: LookOffset, lim: LookLimits): LookOffset => ({
  yaw: clamp(look.yaw, -lim.yaw, lim.yaw),
  pitch: clamp(look.pitch, -lim.pitchDown, lim.pitchUp),
});
/** Re-clamp BOTH fields to the limits in force; they blend per frame along a glide. */
export const settleLook = (s: LookState, lim: LookLimits): LookState => ({
  look: clampLook(s.look, lim),
  lookTarget: clampLook(s.lookTarget, lim),
});
/**
 * Declared tuning target. The touch pointer's span multiplier (the owner's r21.1 report: after
 * the viewport normalization the desktop felt right but touch felt too slow — a thumb swipe is
 * a shorter physical gesture than a mouse drag, so touch runs ~15% hotter; r21.1 says «around
 * 15% faster»). Mouse and pen stay at 1.
 */
export const TOUCH_SPAN_FACTOR = 1.15;
export type PointerTypeName = 'mouse' | 'touch' | 'pen';
/** Viewport-normalized sensitivity: degrees of look per CSS pixel of drag. */
export const dragDegPerPx = (viewportHeightPx: number, pointerType: PointerTypeName): number => {
  if (!Number.isFinite(viewportHeightPx) || viewportHeightPx <= 0) {
    throw new RangeError(`viewport height must be finite and positive, got ${viewportHeightPx}`);
  }
  const span = DRAG_SPAN_DEG * (pointerType === 'touch' ? TOUCH_SPAN_FACTOR : 1);
  return span / viewportHeightPx;
};
/**
 * Total guard over the DOM's `pointerType: string` (lib.dom types it wider than the union):
 * known kinds pass, anything future defaults to 'mouse' — the un-tuned baseline.
 */
export const toPointerType = (s: string): PointerTypeName =>
  s === 'touch' || s === 'pen' ? s : 'mouse';
/**
 * Accumulate one drag delta onto the target. Unclamped: the caller clamps with the limits at its
 * u. Signs are the host's grab-the-world law (it passes -dx, +dy); this law adds them as given.
 */
export const dragLook = (
  target: LookOffset,
  dxPx: number,
  dyPx: number,
  viewportHeightPx: number,
  pointerType: PointerTypeName,
): LookOffset => {
  if (!Number.isFinite(dxPx) || !Number.isFinite(dyPx)) {
    throw new RangeError('drag deltas must be finite');
  }
  const k = dragDegPerPx(viewportHeightPx, pointerType);
  return { yaw: target.yaw + dxPx * k, pitch: target.pitch + dyPx * k };
};
/** Fraction of the remaining offset one step of dtMs closes: 1 - exp(-dt / TAU). */
export const dampingAlpha = (dtMs: number): number => {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    throw new RangeError(`dtMs must be finite and non-negative, got ${dtMs}`);
  }
  return 1 - Math.exp(-dtMs / LOOK_TAU_MS);
};
export const lookSettled = (current: LookOffset, target: LookOffset): boolean =>
  current.yaw === target.yaw && current.pitch === target.pitch;
const easeAxis = (current: number, target: number, alpha: number): number => {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) <= LOOK_SNAP_DEG ? target : next;
};
/**
 * One frame of damping. Returns `current` ITSELF when already settled, so a caller at rest can
 * keep its whole state by reference — the never-dragged golden scenes stay bit-identical.
 */
export const easeLook = (current: LookOffset, target: LookOffset, dtMs: number): LookOffset => {
  if (lookSettled(current, target)) return current;
  const alpha = dampingAlpha(dtMs);
  return {
    yaw: easeAxis(current.yaw, target.yaw, alpha),
    pitch: easeAxis(current.pitch, target.pitch, alpha),
  };
};
