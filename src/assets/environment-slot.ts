// src/assets/environment-slot.ts
/**
 * Ownership-safe environment release — docs/design-load-line.md's sibling (the R24-ux
 * dark-on-entry touch): the host scene has ONE environment slot (`scene.environment`), and
 * interior lifetimes overlap during a transit — the destination publishes its probe inside
 * the hold BEFORE the departing room's unmount runs. The resource a room's mount created
 * (its own PMREM RT texture) belongs to that mount's scope; the SLOT it leased may already
 * hold a newcomer's texture by the time the room leaves. Releasing is therefore a
 * compare-and-clear on exact identity, and disposal is always of the room's own saved
 * resource — the two facts are independent (a failed clear still owes a disposal).
 *
 * Pure: no three, no DOM, no clock — the slot (the scene facade or a mock) is handed in.
 */
/**
 * The compare-and-clear: nulls the slot ONLY when it still holds `owned`; returns whether
 * the clear happened. A null/cleared owned handle never clears the slot (presence is not
 * ownership), and a replaced slot (the newcomer's texture, or another object with identical
 * CONTENTS — identity is the law, contents are not) is left untouched.
 */
export function clearEnvironmentIfOwned<T>(
  slot: { environment: T | null },
  owned: T | null,
): boolean {
  if (owned === null || slot.environment !== owned) return false;
  slot.environment = null;
  return true;
}

/**
 * The full release law, one tested place: clear the binding ONLY if the room still owns
 * the slot, then dispose the room's OWN resource regardless — the disposal targets the
 * saved handle's owners (the loaders' per-room entry), never whatever the scene currently
 * references. Never early-return on a failed clear: the room still owes its disposal.
 */
export function releaseOwnedEnvironment<T>(
  scene: { clearEnvironmentIfCurrent(handle: T | null): boolean },
  owned: T | null,
  disposeResource: () => void,
): void {
  scene.clearEnvironmentIfCurrent(owned);
  disposeResource();
}
