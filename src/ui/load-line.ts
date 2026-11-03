// src/ui/load-line.ts
/**
 * The load line — docs/design-load-line.md (R23-ux): the loading-stage line under the
 * transit card's room title. One sans row whose numerals are the only motion on the black
 * card: the stage verb first, then the honest byte pair while rows stream in, then the
 * assemble verb at the total. Pure: no three, no DOM, no clock — the host hands in the
 * card's elapsed time and receives the view; the thresholds and the stage map are laws
 * here, the copy and the number formatting live with the host (src/i18n/format).
 *
 * Laws: the line shows from the first card frame where data is NOT ready at/after
 * LOAD_LINE_AFTER_MS since the card began, and latches — once shown it stays shown until
 * the host takes it down (the title-clear tick, then off at idle). Data landing before the
 * threshold means the line never showed at all: the 800 ms floor and every fast open read
 * exactly as before. The line never extends the card; the airlock FSM is untouched.
 * The stages are the host's own awaits (design-load-line.md §1): open = the manifest and
 * the lazy chunk, bytes = the manifest's rows streaming (received/total from the
 * manifest's row sizes — the payload bytes, NOT the VRAM ledger), assemble = mount +
 * `compileAsync`, failed = the chain rejected. A bytes/assemble stage without a resolved
 * manifest reads as open — the total is genuinely unknown until the manifest lands.
 */
export const LOAD_LINE_AFTER_MS = 1_000;
/** The write quantum: the numerals re-render only at a 100 KB step (= 0.1 MB — the MB law). */
export const LOAD_LINE_BYTE_STEP = 100_000;

export type LoadStage = 'open' | 'bytes' | 'assemble' | 'failed';

export type LoadLineView =
  | Readonly<{ kind: 'open' }>
  | Readonly<{ kind: 'failed' }>
  | Readonly<{ kind: 'bytes'; readonly receivedBytes: number; readonly totalBytes: number }>
  | Readonly<{ kind: 'assemble'; readonly totalBytes: number }>;

const assertFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`load-line: ${name} must be finite, got ${value}`);
  }
};
const assertNonNegative = (name: string, value: number): void => {
  assertFinite(name, value);
  if (value < 0) {
    throw new RangeError(`load-line: ${name} must be ≥ 0, got ${value}`);
  }
};

/**
 * The visibility latch (the host calls it per card frame with the prior shown flag):
 * shown once the card has waited LOAD_LINE_AFTER_MS without data, never un-shown here —
 * the latch releases only when the host leaves the card (the title-clear tick).
 */
export function shouldShow(
  input: Readonly<{ elapsedMs: number; dataReady: boolean; shown: boolean }>,
): boolean {
  assertNonNegative('elapsedMs', input.elapsedMs);
  return input.shown || (!input.dataReady && input.elapsedMs >= LOAD_LINE_AFTER_MS);
}

/** The stage → view map; the host renders the copy, the numbers travel raw. */
export function loadLine(
  input: Readonly<{ stage: LoadStage; receivedBytes: number; totalBytes: number | null }>,
): LoadLineView {
  assertNonNegative('receivedBytes', input.receivedBytes);
  if (input.stage === 'open') return { kind: 'open' };
  if (input.stage === 'failed') return { kind: 'failed' };
  if (input.totalBytes === null) return { kind: 'open' };
  assertNonNegative('totalBytes', input.totalBytes);
  const receivedBytes = Math.min(input.receivedBytes, input.totalBytes);
  return input.stage === 'bytes'
    ? { kind: 'bytes', receivedBytes, totalBytes: input.totalBytes }
    : { kind: 'assemble', totalBytes: input.totalBytes };
}
