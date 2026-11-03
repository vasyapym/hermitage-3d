// tests/environment-slot.test.ts
/**
 * R24-ux — the ownership-checked environment release (docs/design-environment-handover.md):
 * the primitive's identity rows, the release law's rows, and the pure module's own fence
 * (the hud.test precedent). Vitest node style; trivial object identities stand in for
 * three's textures (identity is the law — contents are not).
 */
import { describe, expect, it } from 'vitest';
import { clearEnvironmentIfOwned, releaseOwnedEnvironment } from '../src/assets/environment-slot';

const slotOf = (environment: object | null): { environment: object | null } => ({ environment });
const A = { texture: 'A' };
const B = { texture: 'B' };
const A_twin = { texture: 'A' }; // identical CONTENTS, different identity

describe('clearEnvironmentIfOwned — the compare-and-clear rows', () => {
  it('the matching non-null owner clears the slot and returns true', () => {
    const slot = slotOf(A);
    expect(clearEnvironmentIfOwned(slot, A)).toBe(true);
    expect(slot.environment).toBeNull();
  });
  it('a replaced slot (the destination published) survives and returns false', () => {
    const slot = slotOf(B);
    expect(clearEnvironmentIfOwned(slot, A)).toBe(false);
    expect(slot.environment).toBe(B); // B stays bound
  });
  it('contents-equal objects are NOT interchangeable ownership identities', () => {
    const slot = slotOf(A);
    expect(clearEnvironmentIfOwned(slot, A_twin)).toBe(false);
    expect(slot.environment).toBe(A);
  });
  it('a null owned handle never clears a non-null slot (presence is not ownership)', () => {
    const slot = slotOf(A);
    expect(clearEnvironmentIfOwned(slot, null)).toBe(false);
    expect(slot.environment).toBe(A);
  });
  it('releasing into an already-null slot is a no-op in both shapes', () => {
    const slot = slotOf(null);
    expect(clearEnvironmentIfOwned(slot, A)).toBe(false);
    expect(slot.environment).toBeNull();
  });
  it('a repeated release cannot clear a later replacement', () => {
    const slot = slotOf(A);
    expect(clearEnvironmentIfOwned(slot, A)).toBe(true);
    slot.environment = B;
    expect(clearEnvironmentIfOwned(slot, A)).toBe(false);
    expect(slot.environment).toBe(B);
  });
});

describe('releaseOwnedEnvironment — the facade release law, disposable regardless', () => {
  /** The facade double the room scopes face: clears through the same primitive. */
  const facadeOf = (slot: { environment: object | null }) => ({
    clearEnvironmentIfCurrent: (handle: object | null): boolean =>
      clearEnvironmentIfOwned(slot, handle),
  });
  it('the owner both clears and disposes its own resource', () => {
    const slot = slotOf(A);
    let disposed = 0;
    releaseOwnedEnvironment(facadeOf(slot), A, () => {
      disposed += 1;
    });
    expect(slot.environment).toBeNull();
    expect(disposed).toBe(1);
  });
  it('the replaced slot leaves B bound while A\u2019s disposal still runs exactly once', () => {
    const slot = slotOf(B);
    let disposed = 0;
    releaseOwnedEnvironment(facadeOf(slot), A, () => {
      disposed += 1;
    });
    expect(slot.environment).toBe(B);
    expect(disposed).toBe(1);
  });
  it('a null owned handle disposes (the no-op consumers) without touching the slot', () => {
    const slot = slotOf(A);
    let disposed = 0;
    releaseOwnedEnvironment(facadeOf(slot), null, () => {
      disposed += 1;
    });
    expect(slot.environment).toBe(A);
    expect(disposed).toBe(1);
  });
});

describe('purity — src/assets/environment-slot.ts (the hud.test fence, per pure module)', () => {
  const sources = import.meta.glob('../src/assets/environment-slot.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripped = (src: string): string => {
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return noComments
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  };
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripped(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer, network or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\bperformance\b/,
      /\bDate\b/,
      /Math\.random/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripped(src);
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
