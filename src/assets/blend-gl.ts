// src/assets/blend-gl.ts
/**
 * Lightmap techniques — three-bound hub (design-staircase §4.1 A, §4.2 B, §4.4 measurement;
 * r17c per-state scalar law; design-gallery §3.7/§4.4 charts, DEC-027).
 *
 * Scalar law (stated once here, applied in applyWeights): every baked state s carries its own
 * effective intensity eff(s) = manifest white point(s) × INTERIOR_LOOK_GAIN[room][s]. The white
 * point restores the ktx2 encoding; the look gain is runtime design configuration applied after
 * restoration (§4.4: the interior exposure stays 1.0, ADR-0013's probe scalars stay untouched).
 * A state binding and its scalar land in the same frame — setStates then setWeights, both before
 * the render call. A null B state binds the black texel with scalar 0, never a stale scalar.
 *
 * Chart law (design-gallery §3.7, DEC-027): a room binds one or more CHARTS — atlas families
 * that each carry the three states, sampled on the same vLightMapUv (1812: architecture 2k +
 * kit 1k). The binding is material-blind: applyChartedTechnique takes the charts map and
 * chartOf(material), both resolved ONCE at mount — a material naming a chart the room lacks
 * throws there, never on a frame. ONE lmB uniform object per chart (a material's program wires
 * its chart's), ONE lmScale per room (both charts of a state encode at the same white point, so
 * scaleB is identical), state A bound per material from its chart. applyTechnique is the
 * single-chart delegate ('arch', () => 'arch'): every sibling call site, uniform object and
 * value stays what it was. 'b-discrete' routes state A per material; 'b-rt' is the dev
 * measurement mode, measured on single-chart rooms — a charted room (≠ 1 chart) throws loud at
 * mount, before the renderer is touched.
 *
 * Mode 'a' (shipped, technique A): the glb's own MeshStandardMaterial instances patched via
 * onBeforeCompile — state A rides the stock lightmap path (material.lightMap,
 * lightMapIntensity = wA · eff(A)), state B is a second fetch on the SAME vLightMapUv through a
 * shared `lmB` sampler scaled by `lmScale = wB · eff(B)`; the sampler is always bound, so exactly
 * two fetches per fragment and plateau crossings are texture/uniform binds, never recompiles.
 * Mode 'b-discrete' (the §4.4 floor): stock lightmap, the argmax state at ITS OWN eff — not
 * multiplied by the winning weight, no custom shaders.
 * Mode 'b-rt' (the §4.4 measured ceiling): two fullscreen quads re-blended EVERY FRAME into a
 * per-room RGBA16F target (the restored blend exceeds 1.0; RGBA8 would clip it) consumed by the
 * stock lightmap path at lightMapIntensity = 1 exactly. Each quad's stock colour is
 * (w·eff, w·eff, w·eff) under One/One custom blending onto a black-cleared target — no opacity.
 * The real product would quantise w to 1/64 and re-blend only on drift; the harness runs the
 * ceiling, so a passing ceiling passes any honest implementation.
 *
 * Laws:
 * - One lmScale object per room and one lmB object per chart across every patched program; one
 *   write updates every program that reads it.
 * - Materials are patched once per unique instance (shared across meshes).
 * - Module-level state is safe: the coordinator serializes transits (loaders.ts pattern).
 * - lm textures are LINEAR data (NoColorSpace) and are added to `irradiance` untouched.
 *   Jordan's sources are sRGB containers decoded to linear by the GPU sampler (the DFD
 *   flag travels with the encode); the other rooms' sources stay linear data. Composition
 *   and the irradiance inputs stay linear on every path either way.
 * - A missing texture for a bound state throws — loud, never a silent black room.
 * - The coordinator calls applyWeights(roomId, frozenWeights) once per frame; unregistered
 *   rooms no-op (a hold before mount, the square).
 * - b-rt needs a renderable half-float colour attachment; when absent it throws loud at mount.
 */
import * as THREE from 'three';
import {
  INTERIOR_EMISSIVE_SCALE,
  INTERIOR_LOOK_GAIN,
  type InteriorEmissiveStateScale,
  LIGHT_STATES,
} from '../content/lightmap-look';
import { type BlendWeights, blendPayload, environmentScalar } from '../world/blend';
import type {
  LightmapIntensity,
  LightState,
  LmMode,
  RoomId,
  RoomLedger,
  RoomObject,
  StateId,
} from '../world/registry';

/** Both scalars are FINAL (the law already applied): A's lightMapIntensity, B's lmScale. */
export interface TechniqueHandle {
  setStates(a: StateId, b: StateId | null): void;
  setWeights(scaleA: number, scaleB: number): void;
}

/** A chart id names one atlas family of the room; the hub never interprets it (room vocabulary). */
export type ChartId = string;
export type ChartTextures = ReadonlyMap<StateId, unknown>;
export type ChartMap = ReadonlyMap<ChartId, ChartTextures>;
export type ChartOf = (material: THREE.MeshStandardMaterial) => ChartId;

type LmBUniform = { value: THREE.Texture };

/** The D6/D1 runtime emissive law per material: authoredStrength × Σ_s w_s scale_s. */
type EmissiveRow = { base: number; scale: InteriorEmissiveStateScale };

type SharedUniforms = Readonly<{
  /** ONE lmB object per chart — a material's program wires the one of its chart. */
  lmB: ReadonlyMap<ChartId, LmBUniform>;
  /** ONE lmScale per room — both charts of a state encode at the same white point (D-9). */
  lmScale: { value: number };
}>;

type ChartBinding = Readonly<{
  id: ChartId;
  textures: ReadonlyMap<StateId, THREE.Texture>;
  lmB: LmBUniform;
}>;

type RoomTechnique = Readonly<{
  mode: LmMode;
  handle: TechniqueHandle;
  shared: SharedUniforms;
  materials: THREE.MeshStandardMaterial[];
  charts: ReadonlyMap<ChartId, ChartBinding>;
  /** eff(s) per state — white point × look gain, fixed for the room's mounted lifetime. */
  effective: LightmapIntensity;
  /** B-RT only: the per-room render target and its quad scene (the ceiling re-blend). */
  rt: { target: THREE.WebGLRenderTarget; scene: THREE.Scene; camera: THREE.Camera } | null;
  /** D6/D1: jordan's per-frame emissive rows — authored base, INTERIOR_EMISSIVE_SCALE row.
   *  Null for every room without a scale-table row (never a default multiplier). */
  emissive: ReadonlyMap<THREE.MeshStandardMaterial, EmissiveRow> | null;
  current: { a: StateId | null; b: StateId | null };
}>;

const rooms = new Map<RoomId, RoomTechnique>();

/** The authored emissive bases, read ONCE per material instance at first patch — before
 * any per-frame write. A remount (same material instance) reuses the stored base, so a
 * scaled frame value can never become the next mount's base. */
const authoredEmissive = new WeakMap<THREE.MeshStandardMaterial, number>();

function authoredEmissiveBase(material: THREE.MeshStandardMaterial): number {
  const saved = authoredEmissive.get(material);
  if (saved !== undefined) return saved;
  authoredEmissive.set(material, material.emissiveIntensity);
  return material.emissiveIntensity;
}

/** Jordan's D6 hook: the per-material emissive rows (by the glb material name). Missing
 * room/material rows mean no write, never a default; other rooms' materials never enter. */
function captureEmissiveScale(
  roomId: RoomId,
  materials: readonly THREE.MeshStandardMaterial[],
): ReadonlyMap<THREE.MeshStandardMaterial, EmissiveRow> | null {
  const roomScale = INTERIOR_EMISSIVE_SCALE[roomId];
  if (!roomScale) return null;
  const library = roomScale as Partial<Record<string, InteriorEmissiveStateScale>>;
  const rows = new Map<THREE.MeshStandardMaterial, EmissiveRow>();
  for (const material of materials) {
    const scale = library[material.name];
    if (scale === undefined) continue;
    rows.set(material, { base: authoredEmissiveBase(material), scale });
  }
  return rows.size > 0 ? rows : null;
}

/** The runtime law applied to ONE jordan material this frame:
 * emissiveIntensity = authoredStrength × Σ_s (w_s × scale_m_s), w = this frame's blend
 * weights (the same frame the lm scalars consume). */
function applyEmissiveWeights(
  material: THREE.MeshStandardMaterial,
  row: EmissiveRow,
  weights: BlendWeights,
): void {
  material.emissiveIntensity =
    row.base *
    (weights.day * row.scale.day +
      weights.dusk * row.scale.dusk +
      weights.nightChandeliers * row.scale.nightChandeliers);
}

const LIGHTMAP_UV_CHANNEL = 1;
const CACHE_KEY = 'zimny-lm-blend-v1';
const INCLUDE_LINE = '#include <lights_fragment_maps>';
const UNIFORM_DECLS = 'uniform sampler2D lmB;\nuniform float lmScale;\n';
const RT_BYTES_PER_TEXEL = 8; // RGBA16F

/** The delegate's chart: every single-chart room (jordan, the gallery) binds under this id. */
const SINGLE_CHART: ChartId = 'arch';

// Stock block as shipped in three 0.186.1 `lights_fragment_maps`; whitespace-tolerant.
const STOCK_BLOCK =
  /vec4 lightMapTexel = texture2D\( lightMap, vLightMapUv \);\s*vec3 lightMapIrradiance = lightMapTexel\.rgb \* lightMapIntensity;\s*irradiance \+= lightMapIrradiance;/;

const BLEND_BLOCK = [
  'vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );',
  'vec4 lmTexelB = texture2D( lmB, vLightMapUv );',
  'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity + lmTexelB.rgb * lmScale;',
  'irradiance += lightMapIrradiance;',
].join('\n\t\t');

let patchedChunkCache: string | null = null;
let fallbackTexel: THREE.DataTexture | null = null;

function patchedChunk(): string {
  if (patchedChunkCache !== null) return patchedChunkCache;
  const stock: unknown = THREE.ShaderChunk.lights_fragment_maps;
  if (typeof stock !== 'string' || !STOCK_BLOCK.test(stock)) {
    throw new Error('blend-gl: three lights_fragment_maps no longer matches the §4.1 patch');
  }
  patchedChunkCache = stock.replace(STOCK_BLOCK, BLEND_BLOCK);
  return patchedChunkCache;
}

function blackTexel(): THREE.Texture {
  if (fallbackTexel === null) {
    fallbackTexel = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    fallbackTexel.colorSpace = THREE.NoColorSpace;
    fallbackTexel.channel = LIGHTMAP_UV_CHANNEL;
    fallbackTexel.needsUpdate = true;
  }
  return fallbackTexel;
}

function asTexture(roomId: RoomId, chart: ChartId, state: StateId, value: unknown): THREE.Texture {
  if (!(value instanceof THREE.Texture)) {
    throw new Error(`blend-gl: ${roomId}/${chart}/${state} lightmap is not a three Texture`);
  }
  return value;
}

function requireTexture(
  roomId: RoomId,
  chart: ChartId,
  textures: ReadonlyMap<StateId, THREE.Texture>,
  state: StateId,
): THREE.Texture {
  const tex = textures.get(state);
  if (tex === undefined) {
    throw new Error(`blend-gl: ${roomId}/${chart} has no baked lightmap for state ${state}`);
  }
  return tex;
}

type QuadMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
/** Unique materials across every mesh of the parsed root (materials are shared by instances). */
export function collectMaterials(roomId: RoomId, object: RoomObject): THREE.MeshStandardMaterial[] {
  const root = object as unknown as THREE.Object3D;
  const seen = new Set<THREE.Material>();
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (seen.has(material)) continue;
      seen.add(material);
      const standard = material as THREE.MeshStandardMaterial;
      if (!standard.isMeshStandardMaterial) {
        throw new Error(`blend-gl: ${roomId} mesh ${mesh.name} uses non-standard ${material.type}`);
      }
      out.push(standard);
    }
  });
  return out;
}

function positiveGuard(roomId: RoomId, label: string, state: LightState, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`blend-gl: ${roomId} ${label}[${state}] must be finite and > 0: ${value}`);
  }
}

/** eff(s) = whitePoint(s) × INTERIOR_LOOK_GAIN[room][s], every entry validated. */
export function effectiveIntensities(
  roomId: RoomId,
  whitePoint: LightmapIntensity,
): LightmapIntensity {
  const gain = INTERIOR_LOOK_GAIN[roomId];
  const out: Record<LightState, number> = { day: 0, dusk: 0, nightChandeliers: 0 };
  for (const state of LIGHT_STATES) {
    positiveGuard(roomId, 'whitePoint', state, whitePoint[state]);
    positiveGuard(roomId, 'lookGain', state, gain[state]);
    out[state] = whitePoint[state] * gain[state];
  }
  return out;
}

function requireFree(roomId: RoomId): void {
  if (rooms.has(roomId)) {
    throw new Error(`blend-gl: ${roomId} already mounted — disposeTechnique before re-mount`);
  }
}

function requireHalfFloatTarget(roomId: RoomId, r: THREE.WebGLRenderer): void {
  const gl = r.getContext();
  const ext =
    gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float');
  if (!r.capabilities.isWebGL2 || ext === null) {
    throw new Error(`blend-gl: ${roomId} b-rt needs WebGL2 + EXT_color_buffer_(half_)float`);
  }
}

/** Types every chart's textures and gives each chart its own lmB object (black until bound). */
function bindCharts(roomId: RoomId, charts: ChartMap): ReadonlyMap<ChartId, ChartBinding> {
  if (charts.size === 0) throw new Error(`blend-gl: ${roomId} binds no lightmap chart`);
  const out = new Map<ChartId, ChartBinding>();
  for (const [id, textures] of charts) {
    const typed = new Map<StateId, THREE.Texture>();
    for (const [state, value] of textures) {
      const tex = asTexture(roomId, id, state, value);
      tex.channel = LIGHTMAP_UV_CHANNEL;
      typed.set(state, tex);
    }
    out.set(id, { id, textures: typed, lmB: { value: blackTexel() } });
  }
  return out;
}

/** chartOf resolved ONCE: a material naming a chart the room lacks throws here, never on a frame. */
function resolveCharts(
  roomId: RoomId,
  materials: readonly THREE.MeshStandardMaterial[],
  charts: ReadonlyMap<ChartId, ChartBinding>,
  chartOf: ChartOf,
): ReadonlyMap<THREE.MeshStandardMaterial, ChartBinding> {
  const out = new Map<THREE.MeshStandardMaterial, ChartBinding>();
  for (const material of materials) {
    const id = chartOf(material);
    const binding = charts.get(id);
    if (binding === undefined) {
      const name = material.name === '' ? material.uuid : material.name;
      throw new Error(`blend-gl: ${roomId} material ${name} names chart ${id} — no such atlas`);
    }
    out.set(material, binding);
  }
  return out;
}

/** §4.4 measurement mode: b-rt is measured on single-chart rooms; charted rooms throw loud. */
function singleChart(roomId: RoomId, charts: ReadonlyMap<ChartId, ChartBinding>): ChartBinding {
  const [only] = charts.values();
  if (only === undefined || charts.size !== 1) {
    throw new Error(
      `blend-gl: ${roomId} b-rt is the single-chart measurement mode (§4.4); got ${charts.size} charts`,
    );
  }
  return only;
}

/** The charted entry (design-gallery §3.7, D-9): one or more charts, the chart read per material. */
export function applyChartedTechnique(
  mode: LmMode,
  roomId: RoomId,
  object: RoomObject,
  charts: ChartMap,
  chartOf: ChartOf,
  whitePoint: LightmapIntensity,
  renderer: RoomObject,
  ledger: RoomLedger,
): TechniqueHandle {
  const effective = effectiveIntensities(roomId, whitePoint);
  requireFree(roomId);
  const bindings = bindCharts(roomId, charts);
  const materials = collectMaterials(roomId, object);
  const ofMaterial = resolveCharts(roomId, materials, bindings, chartOf);
  const lmB = new Map<ChartId, LmBUniform>();
  for (const [id, binding] of bindings) lmB.set(id, binding.lmB);
  const shared: SharedUniforms = { lmB, lmScale: { value: 0 } };
  const current: { a: StateId | null; b: StateId | null } = { a: null, b: null };
  let rt: RoomTechnique['rt'] = null;
  let handle: TechniqueHandle;

  /** State A per material, from its own chart (the stock slot). */
  const bindA = (a: StateId): void => {
    for (const [material, binding] of ofMaterial) {
      material.lightMap = requireTexture(roomId, binding.id, binding.textures, a);
    }
  };

  if (mode === 'b-rt') {
    const single = singleChart(roomId, bindings); // before the renderer is touched
    const typed = single.textures;
    const r = renderer as THREE.WebGLRenderer;
    requireHalfFloatTarget(roomId, r);
    // §4.2 B-RT ceiling: the largest baked atlas sizes the per-room RT (2048² RGBA16F ≈ 32 MB).
    const res = Math.max(
      ...[...typed.values()].map((t) => (t.image as { width?: number } | undefined)?.width ?? 0),
      256,
    );
    const target = new THREE.WebGLRenderTarget(res, res, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.NoColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });
    target.texture.channel = LIGHTMAP_UV_CHANNEL; // the consuming glb materials read uv1
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = (map: THREE.Texture): QuadMesh => {
      const geometry = new THREE.PlaneGeometry(2, 2);
      // The lm textures sample channel 1; the plane ships uv0 only — share the attribute.
      geometry.setAttribute('uv1', geometry.getAttribute('uv'));
      const material = new THREE.MeshBasicMaterial({
        map,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      material.blending = THREE.CustomBlending;
      material.blendEquation = THREE.AddEquation;
      material.blendSrc = THREE.OneFactor;
      material.blendDst = THREE.OneFactor;
      material.color.setScalar(0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    };
    const quadA = quad(requireTexture(roomId, single.id, typed, 'day'));
    const quadB = quad(blackTexel());
    const savedClear = new THREE.Color();
    rt = { target, scene, camera };
    handle = {
      setStates(a, b) {
        quadA.material.map = requireTexture(roomId, single.id, typed, a);
        quadB.material.map =
          b === null ? blackTexel() : requireTexture(roomId, single.id, typed, b);
      },
      setWeights(scaleA, scaleB) {
        // The ceiling: re-blend EVERY frame (the product would quantise w to 1/64 first).
        quadA.material.color.setScalar(scaleA);
        quadB.material.color.setScalar(scaleB);
        r.getClearColor(savedClear);
        const savedAlpha = r.getClearAlpha();
        r.setRenderTarget(target);
        r.setClearColor(0x000000, 1);
        r.clear(true, false, false);
        r.render(scene, camera);
        r.setRenderTarget(null);
        r.setClearColor(savedClear, savedAlpha);
      },
    };
    for (const material of materials) {
      material.lightMap = target.texture;
      material.lightMapIntensity = 1; // the RT already carries the w·eff blend — no double restore
      material.needsUpdate = true;
    }
    const image = target.texture.image as { width: number; height: number };
    ledger.register(
      roomId,
      'renderTarget',
      image.width * image.height * RT_BYTES_PER_TEXEL,
      'preblend-rt',
    );
  } else if (mode === 'b-discrete') {
    // §4.4 floor: the stock lightmap path, the argmax state bound at its own eff — per chart.
    bindA('day');
    for (const material of materials) {
      material.lightMapIntensity = effective.day;
      material.needsUpdate = true;
    }
    handle = {
      setStates(a) {
        bindA(a);
      },
      setWeights(scaleA) {
        for (const material of materials) material.lightMapIntensity = scaleA;
      },
    };
  } else {
    // Technique A: state A on the stock slot; the patch adds the B fetch from the chart's lmB.
    const chunk = patchedChunk();
    for (const [material, binding] of ofMaterial) {
      material.lightMap = blackTexel(); // bound for real on the first applyWeights frame
      material.lightMapIntensity = 0;
      material.onBeforeCompile = (shader) => {
        if (!shader.fragmentShader.includes(INCLUDE_LINE)) {
          throw new Error('blend-gl: fragment shader lacks lights_fragment_maps include');
        }
        shader.uniforms.lmB = binding.lmB;
        shader.uniforms.lmScale = shared.lmScale;
        shader.fragmentShader = UNIFORM_DECLS + shader.fragmentShader.replace(INCLUDE_LINE, chunk);
      };
      material.customProgramCacheKey = () => CACHE_KEY;
      material.needsUpdate = true;
    }
    handle = {
      setStates(a, b) {
        bindA(a);
        for (const binding of bindings.values()) {
          binding.lmB.value =
            b === null ? blackTexel() : requireTexture(roomId, binding.id, binding.textures, b);
        }
      },
      setWeights(scaleA, scaleB) {
        for (const material of materials) material.lightMapIntensity = scaleA;
        shared.lmScale.value = scaleB;
      },
    };
  }

  rooms.set(roomId, {
    mode,
    handle,
    shared,
    materials,
    charts: bindings,
    effective,
    rt,
    emissive: captureEmissiveScale(roomId, materials),
    current,
  });
  return handle;
}

/** The single-chart entry every sibling room calls once at mount (inside the airlock hold). */
export function applyTechnique(
  mode: LmMode,
  roomId: RoomId,
  object: RoomObject,
  textures: ChartTextures,
  whitePoint: LightmapIntensity,
  renderer: RoomObject,
  ledger: RoomLedger,
): TechniqueHandle {
  const charts: ChartMap = new Map([[SINGLE_CHART, textures]]);
  return applyChartedTechnique(
    mode,
    roomId,
    object,
    charts,
    () => SINGLE_CHART,
    whitePoint,
    renderer,
    ledger,
  );
}

/** Per frame, once for the active room: applies the scalar law, dispatches by technique. */
export function applyWeights(roomId: RoomId, weights: BlendWeights): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  const payload = blendPayload(weights);
  const effA = room.effective[payload.a];
  if (room.mode === 'b-discrete') {
    if (room.current.a !== payload.a) {
      room.handle.setStates(payload.a, null);
      room.current.a = payload.a;
    }
    room.handle.setWeights(effA, 0); // argmax at its own eff — no weight, no blend
  } else {
    if (room.current.a !== payload.a || room.current.b !== payload.b) {
      room.handle.setStates(payload.a, payload.b);
      room.current.a = payload.a;
      room.current.b = payload.b;
    }
    const scaleB = payload.b === null ? 0 : payload.wB * room.effective[payload.b];
    room.handle.setWeights(payload.wA * effA, scaleB);
  }
  // D6/D1: jordan's per-material emissive law, the same frame the lm scalars consume.
  // Per-material, per-frame (the envMapIntensity cadence), jordan-scoped: rooms without
  // a scale table have no entries and are never written.
  if (room.emissive) {
    for (const [material, row] of room.emissive) {
      applyEmissiveWeights(material, row, weights);
    }
  }
  // §5/ADR-0013: the probe is hour-static; envMapIntensity follows the clock scalars.
  const envIntensity = environmentScalar(weights);
  for (const material of room.materials) material.envMapIntensity = envIntensity;
}

export function disposeTechnique(roomId: RoomId): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  for (const lmB of room.shared.lmB.values()) lmB.value = blackTexel();
  room.shared.lmScale.value = 0;
  if (room.emissive) {
    // The scaled frame values never outlive the room: every tracked material leaves at
    // its authored base (a remount re-captures from the same WeakMap anyway).
    for (const [material, row] of room.emissive) {
      material.emissiveIntensity = row.base;
    }
  }
  if (room.rt) {
    room.rt.target.dispose();
    for (const child of room.rt.scene.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }
  rooms.delete(roomId);
}
