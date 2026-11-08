// src/ui/hint.ts
/**
 * Travel-hint law (design-i18n-notes.md §9), in the shape of src/ui/captions.ts: events
 * come in, a view comes out; the host owns the DOM node, the timers and the text (t()).
 *
 * State law, stated once:
 * - eligible ⇔ main page ∧ the load's initial stop is S0 ∧ not det. Anything else boots
 *   straight into 'gone' with dismissed 'none': data-visible is never true and no timer is
 *   ever requested (det/golden pixels stay frozen; deep links never see the hint).
 * - armed → shown only at the arrival-settle beat, and only if nothing dismissed the hint
 *   first: travel before the beat wins and the hint never flashes.
 * - shown → gone on the first travel intent of any kind (a press on the pair or the arrows,
 *   pointer drag start of any pointer type, a boundary press that fires an airlock — one
 *   definition, the rail's own travel-intent entry point) or when the hold timer fires; the
 *   cause is kept for data-dismissed. (The wheel's dismissal retired with the wheel.)
 * - gone is absorbing: no event brings the hint back for the page lifetime. Time scrubbing
 *   and the language toggle are not events of this law — the host swaps the text in place
 *   and leaves the timers alone.
 * - timers: the host schedules a single hold timer of HINT_HOLD_MS when a step says
 *   'schedule-hold' and clears it on 'cancel-hold'; a late hold tick is absorbed by gone.
 * - motion: exitMs is HINT_DISMISS_MS after travel (answers a user action — the caption's
 *   fade), HINT_FADE_MS after the hold (nothing happened to cause it), 0 under reduced
 *   motion (appear with the settle, cut at the hold, cut on travel). Appearance follows the
 *   notes link's reveal on the host side and has no duration here.
 */

export const HINT_HOLD_MS = 6000;
export const HINT_FADE_MS = 1200;
export const HINT_DISMISS_MS = 240;

export type HintDismissal = 'none' | 'travel' | 'timeout';
export type HintPhase = 'armed' | 'shown' | 'gone';
export type HintTimer = 'schedule-hold' | 'cancel-hold' | null;

export interface HintBoot {
  readonly mainPage: boolean;
  readonly initialStopIsStart: boolean;
  readonly det: boolean;
  readonly reducedMotion: boolean;
}

export interface HintState {
  readonly eligible: boolean;
  readonly phase: HintPhase;
  readonly dismissed: HintDismissal;
  readonly reducedMotion: boolean;
}

export interface HintStep {
  readonly state: HintState;
  readonly timer: HintTimer;
}

export interface HintView {
  readonly visible: boolean;
  readonly dismissed: HintDismissal;
  readonly exitMs: number;
}

const EXIT_MS: Readonly<Record<HintDismissal, number>> = {
  none: 0,
  travel: HINT_DISMISS_MS,
  timeout: HINT_FADE_MS,
};

export function createHintState(boot: HintBoot): HintState {
  const eligible = boot.mainPage && boot.initialStopIsStart && !boot.det;
  return {
    eligible,
    phase: eligible ? 'armed' : 'gone',
    dismissed: 'none',
    reducedMotion: boot.reducedMotion,
  };
}

export function hintSettled(state: HintState): HintStep {
  if (state.phase !== 'armed') return { state, timer: null };
  return { state: { ...state, phase: 'shown' }, timer: 'schedule-hold' };
}

export function hintTravelIntent(state: HintState): HintStep {
  if (state.phase === 'gone') return { state, timer: null };
  const timer: HintTimer = state.phase === 'shown' ? 'cancel-hold' : null;
  return { state: { ...state, phase: 'gone', dismissed: 'travel' }, timer };
}

export function hintHoldElapsed(state: HintState): HintStep {
  if (state.phase !== 'shown') return { state, timer: null };
  return { state: { ...state, phase: 'gone', dismissed: 'timeout' }, timer: null };
}

export function hintReducedMotion(state: HintState, reducedMotion: boolean): HintState {
  return state.reducedMotion === reducedMotion ? state : { ...state, reducedMotion };
}

export function hintView(state: HintState): HintView {
  return {
    visible: state.phase === 'shown',
    dismissed: state.dismissed,
    exitMs: state.reducedMotion ? 0 : EXIT_MS[state.dismissed],
  };
}
