// tests/blend-gl.test.ts
// §5 scalar law gates: eff(s) = whitePoint(s) × INTERIOR_LOOK_GAIN[room][s], every factor
// finite and > 0. blend-gl is three-bound (node import of three is fine); no renderer, no DOM.
// R4 (design-gallery §3.7, D-9): the charted laws — the single-chart delegate keeps its
// uniform objects and values; a charted room gets one lmB per chart and one lmScale per
// room; unknown charts and b-rt on charts ≠ 1 throw loud at mount. Mode 'a' and 'b-discrete'
// never touch the renderer, so the mount runs under node with a stub; onBeforeCompile is
// driven by hand with a stub shader carrying the real include line.
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyChartedTechnique,
  applyTechnique,
  applyWeights,
  disposeTechnique,
  effectiveIntensities,
} from '../src/assets/blend-gl';
import type { RoomLedger, StateId } from '../src/world/registry';

// The landed manifest white points (lm-percentile's fresh-bake row, D1 clamps, κ=1) —
// the descriptor row public/assets/jordan/manifest.json mirrors.
const JORDAN = { day: 0.45, dusk: 1, nightChandeliers: 1.2 } as const;
// The committed gallery record (R-UX4): all three states encode at the shared white point 0.2
// (public/assets/rastrelli-gallery/manifest.json is the source of truth this fixture mirrors).
const GALLERY = { day: 0.8, dusk: 0.8, nightChandeliers: 0.8 } as const;
// R4 Block 2: WHITE_POINT_1812 + the look gains (eff = wp × gain). B10 (owner, ≈15 % more
// light): the gains ×1.15 — eff 2.5875 / 0.5175 / 0.69.
// The Military Gallery's manifest intensity record as committed (R4's fixed tree).
const MILITARY = { day: 1.5, dusk: 0.15, nightChandeliers: 0.3 } as const;
const PRECISION = 12;

describe('effectiveIntensities', () => {
  it('jordan: white points × gains (the landed κ≈1 trio)', () => {
    // eff = wp × gain = 0.45×2.22 / 1×1 / 1.2×0.83 — the round2(κ/W) gains pin eff ≈ κ = 1.
    const eff = effectiveIntensities('jordan', JORDAN);
    expect(eff.day).toBeCloseTo(0.999, PRECISION);
    expect(eff.dusk).toBeCloseTo(1, PRECISION);
    expect(eff.nightChandeliers).toBeCloseTo(0.996, PRECISION);
  });
  it('rastrelli-gallery: white point 0.8 × one gain 2 (RG-D1 adopted law)', () => {
    const eff = effectiveIntensities('rastrelli-gallery', GALLERY);
    expect(eff.day).toBeCloseTo(1.6, PRECISION);
    expect(eff.dusk).toBeCloseTo(1.6, PRECISION);
    expect(eff.nightChandeliers).toBeCloseTo(1.6, PRECISION);
  });
  it('returns a fresh record covering exactly the three states', () => {
    const eff = effectiveIntensities('jordan', JORDAN);
    expect(Object.keys(eff).sort()).toEqual(['day', 'dusk', 'nightChandeliers']);
    expect(eff).not.toBe(JORDAN);
  });
  it('a zero white-point entry throws RangeError naming the state', () => {
    const bad = { ...JORDAN, dusk: 0 };
    expect(() => effectiveIntensities('jordan', bad)).toThrow(RangeError);
    expect(() => effectiveIntensities('jordan', bad)).toThrow(/whitePoint\[dusk\]/);
  });
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'a non-finite or negative white point (%s) throws RangeError naming the state',
    (value) => {
      const bad = { ...GALLERY, nightChandeliers: value };
      expect(() => effectiveIntensities('rastrelli-gallery', bad)).toThrow(RangeError);
      expect(() => effectiveIntensities('rastrelli-gallery', bad)).toThrow(
        /whitePoint\[nightChandeliers\]/,
      );
    },
  );
  it('a zero look-gain entry throws RangeError naming the state', async () => {
    vi.resetModules();
    vi.doMock('../src/content/lightmap-look', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/content/lightmap-look')>();
      return {
        ...actual,
        INTERIOR_LOOK_GAIN: {
          ...actual.INTERIOR_LOOK_GAIN,
          jordan: { ...actual.INTERIOR_LOOK_GAIN.jordan, day: 0 },
        },
      };
    });
    try {
      const mocked = await import('../src/assets/blend-gl');
      expect(() => mocked.effectiveIntensities('jordan', JORDAN)).toThrow(RangeError);
      expect(() => mocked.effectiveIntensities('jordan', JORDAN)).toThrow(/lookGain\[day\]/);
    } finally {
      vi.doUnmock('../src/content/lightmap-look');
      vi.resetModules();
    }
  });
});

// ---- the charted laws (R4, D-9) ----

const INCLUDE_LINE = '#include <lights_fragment_maps>';
const STATES: readonly StateId[] = ['day', 'dusk', 'nightChandeliers'];
const W_DAY_DUSK = { day: 0.6, dusk: 0.4, nightChandeliers: 0 } as const;
const W_DAY = { day: 1, dusk: 0, nightChandeliers: 0 } as const;
const W_DUSK = { day: 0, dusk: 1, nightChandeliers: 0 } as const;
const ledger = { register: vi.fn(), release: vi.fn() } as unknown as RoomLedger;
/** Modes 'a' and 'b-discrete' never read the renderer; b-rt must throw before it would. */
const noRenderer: unknown = {};

type StubShader = {
  uniforms: Record<string, { value: unknown }>;
  fragmentShader: string;
  vertexShader: string;
};

const texture = (): THREE.Texture => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  t.colorSpace = THREE.NoColorSpace;
  return t;
};

const chart = (states: readonly StateId[] = STATES): Map<StateId, THREE.Texture> =>
  new Map(states.map((s) => [s, texture()]));

const kitMaterial = (): THREE.MeshStandardMaterial => {
  const m = new THREE.MeshStandardMaterial();
  m.userData.lmChart = 'kit';
  return m;
};

const chartOfTag = (m: THREE.MeshStandardMaterial): string =>
  m.userData.lmChart === 'kit' ? 'kit' : 'arch';

const roomOf = (...materials: THREE.MeshStandardMaterial[]): THREE.Group => {
  const group = new THREE.Group();
  for (const m of materials) group.add(new THREE.Mesh(new THREE.BoxGeometry(), m));
  return group;
};

/** Drives the material's onBeforeCompile as three would, against a stub program. */
const compile = (material: THREE.MeshStandardMaterial): StubShader => {
  const shader: StubShader = {
    uniforms: {},
    fragmentShader: `void main() {\n\t${INCLUDE_LINE}\n}`,
    vertexShader: '',
  };
  material.onBeforeCompile(
    shader as unknown as THREE.WebGLProgramParametersWithUniforms,
    noRenderer as THREE.WebGLRenderer,
  );
  return shader;
};

describe('applyTechnique — the single-chart delegate (D-9)', () => {
  afterEach(() => disposeTechnique('jordan'));

  it('one lmB and one lmScale object across every program; A on the stock slot, B on lmB', () => {
    const arch = chart();
    const m1 = new THREE.MeshStandardMaterial();
    const m2 = new THREE.MeshStandardMaterial();
    applyTechnique('a', 'jordan', roomOf(m1, m2), arch, JORDAN, noRenderer, ledger);
    const s1 = compile(m1);
    const s2 = compile(m2);
    expect(s1.uniforms.lmB).toBe(s2.uniforms.lmB);
    expect(s1.uniforms.lmScale).toBe(s2.uniforms.lmScale);
    expect(s1.fragmentShader).toContain('uniform sampler2D lmB;');
    expect(s1.fragmentShader).not.toContain(INCLUDE_LINE);
    applyWeights('jordan', W_DAY_DUSK);
    expect(m1.lightMap).toBe(arch.get('day'));
    expect(m2.lightMap).toBe(arch.get('day'));
    expect(m1.lightMapIntensity).toBeCloseTo(0.6 * 0.999, PRECISION);
    expect(m2.lightMapIntensity).toBeCloseTo(0.6 * 0.999, PRECISION);
    expect(s1.uniforms.lmB?.value).toBe(arch.get('dusk'));
    expect(s1.uniforms.lmScale?.value).toBeCloseTo(0.4 * 1, PRECISION);
  });

  it('is value-equal to applyChartedTechnique over a single arch chart', () => {
    const arch = chart();
    const m1 = new THREE.MeshStandardMaterial();
    const m2 = new THREE.MeshStandardMaterial();
    const charts = new Map([['arch', arch]]);
    applyChartedTechnique(
      'a',
      'jordan',
      roomOf(m1, m2),
      charts,
      () => 'arch',
      JORDAN,
      noRenderer,
      ledger,
    );
    const s1 = compile(m1);
    const s2 = compile(m2);
    expect(s1.uniforms.lmB).toBe(s2.uniforms.lmB);
    expect(s1.uniforms.lmScale).toBe(s2.uniforms.lmScale);
    applyWeights('jordan', W_DAY_DUSK);
    expect(m1.lightMap).toBe(arch.get('day'));
    expect(m1.lightMapIntensity).toBeCloseTo(0.6 * 0.999, PRECISION);
    expect(s1.uniforms.lmB?.value).toBe(arch.get('dusk'));
    expect(s1.uniforms.lmScale?.value).toBeCloseTo(0.4 * 1, PRECISION);
  });

  it('a null B binds the black texel at scalar 0', () => {
    const arch = chart();
    const m = new THREE.MeshStandardMaterial();
    applyTechnique('a', 'jordan', roomOf(m), arch, JORDAN, noRenderer, ledger);
    const s = compile(m);
    applyWeights('jordan', W_DAY);
    const black = s.uniforms.lmB?.value as THREE.Texture;
    expect(black).toBeInstanceOf(THREE.Texture);
    expect(STATES.map((st) => arch.get(st))).not.toContain(black);
    expect(s.uniforms.lmScale?.value).toBe(0);
  });
});

describe('applyChartedTechnique — two charts (D-9)', () => {
  afterEach(() => disposeTechnique('military-gallery'));

  it('one lmB per chart, one lmScale per room, state A per material from its chart', () => {
    const arch = chart();
    const kit = chart();
    const mArch = new THREE.MeshStandardMaterial();
    const mKit = kitMaterial();
    const charts = new Map([
      ['arch', arch],
      ['kit', kit],
    ]);
    applyChartedTechnique(
      'a',
      'military-gallery',
      roomOf(mArch, mKit),
      charts,
      chartOfTag,
      MILITARY,
      noRenderer,
      ledger,
    );
    const sArch = compile(mArch);
    const sKit = compile(mKit);
    expect(sArch.uniforms.lmB).not.toBe(sKit.uniforms.lmB);
    expect(sArch.uniforms.lmScale).toBe(sKit.uniforms.lmScale);
    applyWeights('military-gallery', W_DAY_DUSK);
    expect(mArch.lightMap).toBe(arch.get('day'));
    expect(mKit.lightMap).toBe(kit.get('day'));
    expect(sArch.uniforms.lmB?.value).toBe(arch.get('dusk'));
    expect(sKit.uniforms.lmB?.value).toBe(kit.get('dusk'));
    // One white point per state serves both charts: the scalars are identical.
    expect(mArch.lightMapIntensity).toBeCloseTo(0.6 * 2.5875, PRECISION);
    expect(mKit.lightMapIntensity).toBeCloseTo(0.6 * 2.5875, PRECISION);
    expect(sArch.uniforms.lmScale?.value).toBeCloseTo(0.4 * 0.5175, PRECISION);
  });

  it('a null B binds black on EVERY chart with scalar 0', () => {
    const mArch = new THREE.MeshStandardMaterial();
    const mKit = kitMaterial();
    const charts = new Map([
      ['arch', chart()],
      ['kit', chart()],
    ]);
    applyChartedTechnique(
      'a',
      'military-gallery',
      roomOf(mArch, mKit),
      charts,
      chartOfTag,
      MILITARY,
      noRenderer,
      ledger,
    );
    const sArch = compile(mArch);
    const sKit = compile(mKit);
    applyWeights('military-gallery', W_DAY);
    expect(sArch.uniforms.lmB?.value).toBe(sKit.uniforms.lmB?.value);
    expect(sArch.uniforms.lmScale?.value).toBe(0);
  });

  it('b-discrete routes the argmax state per material at its own eff', () => {
    const arch = chart();
    const kit = chart();
    const mArch = new THREE.MeshStandardMaterial();
    const mKit = kitMaterial();
    const charts = new Map([
      ['arch', arch],
      ['kit', kit],
    ]);
    applyChartedTechnique(
      'b-discrete',
      'military-gallery',
      roomOf(mArch, mKit),
      charts,
      chartOfTag,
      MILITARY,
      noRenderer,
      ledger,
    );
    applyWeights('military-gallery', W_DUSK);
    expect(mArch.lightMap).toBe(arch.get('dusk'));
    expect(mKit.lightMap).toBe(kit.get('dusk'));
    expect(mArch.lightMapIntensity).toBeCloseTo(0.5175, PRECISION);
    expect(mKit.lightMapIntensity).toBeCloseTo(0.5175, PRECISION);
  });

  it('a material naming a chart the room lacks throws at mount and leaves the room free', () => {
    const m = new THREE.MeshStandardMaterial();
    m.name = 'MG_gilt';
    const charts = new Map([['arch', chart()]]);
    const mount = (): unknown =>
      applyChartedTechnique(
        'a',
        'military-gallery',
        roomOf(m),
        charts,
        () => 'gold',
        MILITARY,
        noRenderer,
        ledger,
      );
    expect(mount).toThrow(/MG_gilt names chart gold/);
    // No partial registration: a correct mount on the same id succeeds afterwards.
    expect(() =>
      applyChartedTechnique(
        'a',
        'military-gallery',
        roomOf(m),
        charts,
        () => 'arch',
        MILITARY,
        noRenderer,
        ledger,
      ),
    ).not.toThrow();
  });

  it('b-rt on a charted room (≠ 1 chart) throws loud before touching the renderer', () => {
    const charts = new Map([
      ['arch', chart()],
      ['kit', chart()],
    ]);
    expect(() =>
      applyChartedTechnique(
        'b-rt',
        'military-gallery',
        roomOf(new THREE.MeshStandardMaterial(), kitMaterial()),
        charts,
        chartOfTag,
        MILITARY,
        noRenderer,
        ledger,
      ),
    ).toThrow(/b-rt .* got 2 charts/);
  });

  it('a chart missing a bound state throws naming the chart and the state', () => {
    const charts = new Map([
      ['arch', chart()],
      ['kit', chart(['day', 'nightChandeliers'])],
    ]);
    applyChartedTechnique(
      'a',
      'military-gallery',
      roomOf(new THREE.MeshStandardMaterial(), kitMaterial()),
      charts,
      chartOfTag,
      MILITARY,
      noRenderer,
      ledger,
    );
    expect(() => applyWeights('military-gallery', W_DAY_DUSK)).toThrow(
      /military-gallery\/kit has no baked lightmap for state dusk/,
    );
  });

  it('an empty charts map throws at mount', () => {
    expect(() =>
      applyChartedTechnique(
        'a',
        'military-gallery',
        roomOf(new THREE.MeshStandardMaterial()),
        new Map(),
        () => 'arch',
        MILITARY,
        noRenderer,
        ledger,
      ),
    ).toThrow(/binds no lightmap chart/);
  });
});
