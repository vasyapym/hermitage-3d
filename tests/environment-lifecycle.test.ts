// tests/environment-lifecycle.test.ts
/**
 * R24-ux — the room-scope lifecycle over the release law (docs/design-environment-handover
 * §4): node mocks of the room-scope shape (the module-level handle saved at mount,
 * released in unmount through releaseOwnedEnvironment with that mount's own factory
 * closure). The REAL wiring (facade + three rooms) is exercised by the committed e2e row —
 * a helper-only test never catches an unconditional clear elsewhere, which is why the e2e
 * hot-entry regression exists.
 */
import { describe, expect, it } from 'vitest';
import { clearEnvironmentIfOwned, releaseOwnedEnvironment } from '../src/assets/environment-slot';

/** A scope double that mirrors rooms/<id>/room.ts's environment law verbatim: the mount
 * saves its own handle; the unmount releases through a facade that clears with the SAME
 * primitive the real host facade uses. */
type ScopeHandle = { readonly label: string };
type Scope = {
  readonly disposedAt: string[];
  readonly slot: { environment: ScopeHandle | null };
  mount: (env: ScopeHandle) => void;
  unmount: () => void;
};

const makeScope = (roomId: string, slot: { environment: ScopeHandle | null }): Scope => {
  // A facade double built on the real primitive — the room's release law wiring.
  const facade = {
    clearEnvironmentIfCurrent: (handle: ScopeHandle | null): boolean =>
      clearEnvironmentIfOwned(slot, handle),
  };
  const disposedAt: string[] = [];
  let current: ScopeHandle | null = null; // the mounting scope's saved handle
  return {
    disposedAt,
    slot,
    mount(env: ScopeHandle) {
      slot.environment = env; // the hold's publication (§5/ADR-0013)
      current = env; // R24-ux: the identity this mount owns
    },
    unmount() {
      releaseOwnedEnvironment(facade, current, () => {
        disposedAt.push(roomId); // the own-RT disposal — the ONLY consumer
      });
      current = null;
    },
  };
};

const freshSlot = (): { environment: ScopeHandle | null } => ({ environment: null });

describe('the interior handover lifecycle (R24-ux §4, mock wiring over the real law)', () => {
  it('B binds before A unmounts: B stays bound, A\u2019s RT dies exactly once, B\u2019s never', () => {
    const slot = freshSlot();
    const A = makeScope('gallery', slot);
    const B = makeScope('military-gallery', slot);
    A.mount({ label: 'A-rt' });
    B.mount({ label: 'B-rt' }); // the destination published inside the hold
    A.unmount(); // the departing room's unmount, after B's mount
    expect(slot.environment?.label).toBe('B-rt');
    expect(A.disposedAt).toEqual(['gallery']);
    expect(B.disposedAt).toEqual([]);
  });
  it('A still owns the slot on unmount: the slot nulls before the disposer executes', () => {
    const slot = freshSlot();
    const handle: ScopeHandle = { label: 'A-rt' };
    slot.environment = handle;
    const atDispose: Array<ScopeHandle | null> = [];
    releaseOwnedEnvironment(
      { clearEnvironmentIfCurrent: (h) => clearEnvironmentIfOwned(slot, h) },
      handle,
      () => {
        atDispose.push(slot.environment); // the disposer reads the slot at its own run
      },
    );
    expect(atDispose).toEqual([null]); // the clear preceded the disposal
    expect(slot.environment).toBeNull();
  });
  it('A \u2192 B \u2192 A re-loads distinct handles; each departing RT dies once, the live one survives', () => {
    const slot = freshSlot();
    const first = makeScope('gallery', slot);
    const second = makeScope('military-gallery', slot);
    first.mount({ label: 'A-rt-1' });
    second.mount({ label: 'B-rt' });
    first.unmount();
    first.mount({ label: 'A-rt-2' }); // a re-entry loads/mounts a NEW resource
    expect(slot.environment?.label).toBe('A-rt-2');
    expect(first.disposedAt).toEqual(['gallery']);
    second.unmount(); // B leaves A's second mount
    expect(slot.environment?.label).toBe('A-rt-2');
    expect(second.disposedAt).toEqual(['military-gallery']);
    expect(first.disposedAt).toEqual(['gallery']); // still exactly once
  });
  it('the interior-of-an-interior report (gallery \u2192 jordan) keeps jordan\u2019s probe bound', () => {
    const slot = freshSlot();
    const gallery = makeScope('rastrelli-gallery', slot);
    const jordan = makeScope('jordan', slot);
    gallery.mount({ label: 'gallery-rt' });
    jordan.mount({ label: 'jordan-rt' });
    gallery.unmount();
    expect(slot.environment?.label).toBe('jordan-rt');
    expect(gallery.disposedAt).toEqual(['rastrelli-gallery']);
  });
  it('A \u2192 square when the square\u2019s activation assigns null: A clears its own binding before disposal', () => {
    const slot = freshSlot();
    const A = makeScope('jordan', slot);
    A.mount({ label: 'A-rt' });
    slot.environment = null; // the square's existing activation policy (no probe today)
    A.unmount();
    expect(slot.environment).toBeNull(); // the existing cleanup behavior — not a proof of intent
    expect(A.disposedAt).toEqual(['jordan']);
  });
});
