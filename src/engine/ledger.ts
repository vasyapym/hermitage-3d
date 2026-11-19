// src/engine/ledger.ts
/**
 * Disposal ledger — pure core (design-staircase.md §8.3, assertion layer 1 of three).
 *
 * Registers payload bytes per scope (`RoomId | 'engine' | 'square'`) so the HUD ledger rows (§8.4,
 * DEC-018) and the CI smoke walk can assert that leaving a room returns the ledger to
 * its boot values. Round 16 registers payload bytes only — the glb ArrayBuffer and each
 * ktx2 ArrayBuffer a room fetched, labelled by the manifest row path — registered in the
 * room's `load`, released in the room's `unmount` (airlock `onExit`, after the hold,
 * never mid-transit). The 'texture' / 'material' / 'geometry' / 'renderTarget' kinds are
 * reserved for round 17's VRAM fidelity (format×mips) and render-target registers.
 * renderer.info.memory counts are layer 2 (host dev assertion), not ledger rows.
 *
 * Laws:
 * - `register` keeps one row per (scope, kind, label); registering the same triple again
 *   replaces the row — an idempotent re-load is never a double count. Throws RangeError
 *   when bytes is non-finite or negative, or when label is empty.
 * - `release(scope)` removes every row of that scope and is a no-op on an unknown or
 *   already-empty scope — rooms unmount idempotently, so a second release must not throw.
 * - `bytesByScope(scope)` sums the scope's rows; an unknown scope sums to 0.
 * - `snapshot()` returns rows sorted by scope, then kind, then label (plain string
 *   comparison) and `total` = sum of all bytes; the rows array is fresh on every call, so
 *   the caller cannot mutate the ledger through it.
 *
 * Pure by the house standard: no three (not even types), no DOM, no node imports, no
 * clock, no storage, no timers, no randomness. The ledger is a closure over its own
 * private map (the manifests.ts pattern) — no module-level state.
 */
import type { RoomId } from '../world/registry';

// DEC-045, batch M1: the resident gains a kit; later batches register its GLB under square.
export type LedgerScope = RoomId | 'engine' | 'square';
export type LedgerKind = 'glb' | 'ktx2' | 'texture' | 'material' | 'geometry' | 'renderTarget';
export type LedgerRow = Readonly<{
  scope: LedgerScope;
  kind: LedgerKind;
  bytes: number;
  label: string;
}>;
export type LedgerSnapshot = Readonly<{ rows: readonly LedgerRow[]; total: number }>;
export interface RoomLedger {
  register(scope: LedgerScope, kind: LedgerKind, bytes: number, label: string): void;
  release(scope: LedgerScope): void;
  bytesByScope(scope: LedgerScope): number;
  snapshot(): LedgerSnapshot;
}

/** NUL cannot occur in a manifest path, so the joined key is collision-free. */
function rowKey(scope: LedgerScope, kind: LedgerKind, label: string): string {
  return `${scope}\u0000${kind}\u0000${label}`;
}

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareRows(a: LedgerRow, b: LedgerRow): number {
  return (
    compareText(a.scope, b.scope) || compareText(a.kind, b.kind) || compareText(a.label, b.label)
  );
}

export function createLedger(): RoomLedger {
  const rows = new Map<string, LedgerRow>();
  return {
    register(scope, kind, bytes, label) {
      if (!Number.isFinite(bytes) || bytes < 0) {
        throw new RangeError(`ledger: bytes must be a finite non-negative number, got ${bytes}`);
      }
      if (label === '') throw new RangeError('ledger: label must not be empty');
      rows.set(rowKey(scope, kind, label), { scope, kind, bytes, label });
    },
    release(scope) {
      for (const [key, row] of rows) {
        if (row.scope === scope) rows.delete(key);
      }
    },
    bytesByScope(scope) {
      let sum = 0;
      for (const row of rows.values()) {
        if (row.scope === scope) sum += row.bytes;
      }
      return sum;
    },
    snapshot() {
      const sorted = [...rows.values()].sort(compareRows);
      let total = 0;
      for (const row of sorted) total += row.bytes;
      return { rows: sorted, total };
    },
  };
}
