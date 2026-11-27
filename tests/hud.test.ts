import { describe, expect, it } from 'vitest';
import {
  buildHudAttrs,
  buildHudLines,
  HUD_FRAME_WINDOW,
  type HudState,
  parseHudParam,
  pushFrameInterval,
  rollingMedianFrameMs,
} from '../src/ui/hud';

const params = (q: string): URLSearchParams => new URLSearchParams(q);
const parse = (q: string) => parseHudParam(params(q));
const ON = { enabled: true, issues: [] };
const OFF = { enabled: false, issues: [] };
const ON_INVALID = { enabled: true, issues: ['invalid-hud'] };
const OFF_INVALID = { enabled: false, issues: ['invalid-hud'] };
const STATE: HudState = Object.freeze({
  tierLabel: 'T1 · default',
  frameDrawCalls: 132,
  frameTriangles: 132264,
  medianFrameMs: 16.5,
  p95FrameMs: 16.9,
  room: 'square',
  stop: 'S0',
  holdMs: 0,
  ledgerBytes: 0,
  tierSource: 'probe',
  probeSampleCount: 8,
});
describe('parseHudParam', () => {
  it('is off without issues when the param is absent or empty', () => {
    expect(parse('')).toEqual(OFF);
    expect(parse('det=1&at=1700000000')).toEqual(OFF);
    expect(parse('hud=')).toEqual(OFF);
    expect(parse('hud')).toEqual(OFF);
  });
  it('1 enables and 0 disables, wherever the param sits', () => {
    const onQueries = [
      'hud=1',
      'hud=1&det=1&at=1700000000',
      'det=1&hud=1&q=2',
      'at=1700000000&q=1&hud=1',
    ];
    for (const q of onQueries) expect(parse(q), q).toEqual(ON);
    const offQueries = ['hud=0', 'hud=0&det=1', 'det=1&hud=0&q=2', 'at=1700000000&hud=0'];
    for (const q of offQueries) expect(parse(q), q).toEqual(OFF);
  });
  it('duplicates: exactly one invalid-hud issue, last value wins', () => {
    expect(parse('hud=0&hud=1')).toEqual(ON_INVALID);
    expect(parse('hud=1&hud=0')).toEqual(OFF_INVALID);
    expect(parse('hud=1&det=1&hud=1')).toEqual(ON_INVALID);
    expect(parse('hud=1&hud=on')).toEqual(OFF_INVALID);
    expect(parse('hud=0&hud=')).toEqual(OFF_INVALID);
    expect(parse('hud=1&hud=1&hud=1').issues).toHaveLength(1);
  });
  it('garbage values are off with invalid-hud', () => {
    for (const v of ['2', 'on', 'true', 'yes', '01', 'HUD', '1.0']) {
      expect(parse(`hud=${v}`), v).toEqual(OFF_INVALID);
    }
  });
  it('leaves unrelated params untouched', () => {
    const p = params('at=1700000000&det=1&q=2&hud=1');
    const before = p.toString();
    expect(parseHudParam(p)).toEqual(ON);
    expect(p.toString()).toBe(before);
    expect(p.get('at')).toBe('1700000000');
    expect(p.get('det')).toBe('1');
    expect(p.get('q')).toBe('2');
    expect(p.get('hud')).toBe('1');
  });
});
describe('pushFrameInterval', () => {
  it('appends a positive interval', () => {
    expect(pushFrameInterval([], 16.7)).toEqual([16.7]);
    expect(pushFrameInterval([16.7], 33.4)).toEqual([16.7, 33.4]);
  });
  it('keeps only the newest HUD_FRAME_WINDOW entries', () => {
    expect(HUD_FRAME_WINDOW).toBe(32);
    let buf: readonly number[] = [];
    for (let i = 1; i <= HUD_FRAME_WINDOW + 1; i += 1) buf = pushFrameInterval(buf, i);
    expect(buf).toHaveLength(32);
    expect(buf[0]).toBe(2);
    expect(buf[31]).toBe(33);
  });
  it('never mutates the input', () => {
    const prev: readonly number[] = Object.freeze([16, 17]);
    const next = pushFrameInterval(prev, 18);
    expect(prev).toEqual([16, 17]);
    expect(next).toEqual([16, 17, 18]);
    expect(next).not.toBe(prev);
  });
  it('ignores non-positive and non-finite deltas', () => {
    const prev: readonly number[] = Object.freeze([16]);
    for (const d of [0, -1, -0.001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pushFrameInterval(prev, d), String(d)).toEqual([16]);
    }
    expect(pushFrameInterval([], 0)).toEqual([]);
  });
  it('handles the single-value case', () => {
    const buf = pushFrameInterval([], 8.3);
    expect(buf).toEqual([8.3]);
    expect(rollingMedianFrameMs(buf)).toBe(8.3);
  });
});
describe('rollingMedianFrameMs', () => {
  it('odd length: the middle value', () => {
    expect(rollingMedianFrameMs([30, 10, 20])).toBe(20);
    expect(rollingMedianFrameMs([16.7])).toBe(16.7);
  });
  it('even length: the lower middle, no averaging', () => {
    expect(rollingMedianFrameMs([20, 40, 30, 40, 50, 30])).toBe(30);
    expect(rollingMedianFrameMs([10, 20])).toBe(10);
  });
  it('empty buffer: 0', () => {
    expect(rollingMedianFrameMs([])).toBe(0);
  });
  it('does not reorder the input', () => {
    const buf: readonly number[] = Object.freeze([30, 10, 20]);
    rollingMedianFrameMs(buf);
    expect(buf).toEqual([30, 10, 20]);
  });
  it('end-to-end: the fast tail wins only once it holds the lower-middle slot', () => {
    // Window 32, lower median = sorted[15]. 40 slow pushes leave 32 slow frames; each
    // fast push then evicts one slow frame, so after k fast pushes the sorted buffer is
    // k fast then 32 - k slow, and sorted[15] turns fast exactly at k = 16 — not at 8.
    let buf: readonly number[] = [];
    for (let i = 0; i < 40; i += 1) buf = pushFrameInterval(buf, 33.3);
    expect(buf).toHaveLength(32);
    expect(rollingMedianFrameMs(buf)).toBe(33.3);
    for (let i = 0; i < 8; i += 1) buf = pushFrameInterval(buf, 8.3);
    expect(buf).toHaveLength(32);
    expect(rollingMedianFrameMs(buf)).toBe(33.3);
    for (let i = 0; i < 7; i += 1) buf = pushFrameInterval(buf, 8.3);
    expect(buf.filter((v) => v === 8.3)).toHaveLength(15);
    expect(rollingMedianFrameMs(buf)).toBe(33.3);
    buf = pushFrameInterval(buf, 8.3);
    expect(buf.filter((v) => v === 8.3)).toHaveLength(16);
    expect(rollingMedianFrameMs(buf)).toBe(8.3);
  });
});
describe('buildHudAttrs', () => {
  it('exposes exactly the eleven contract keys (Mobile-A adds tier-source + probe-count; R5 adds frame-p95)', () => {
    expect(Object.keys(buildHudAttrs(STATE)).sort()).toEqual([
      'data-draws',
      'data-frame-ms',
      'data-frame-p95',
      'data-hold-ms',
      'data-ledger-bytes',
      'data-probe-count',
      'data-room',
      'data-stop',
      'data-tier',
      'data-tier-source',
      'data-tris',
    ]);
  });
  it('integers are plain digits without grouping; tier verbatim', () => {
    const attrs = buildHudAttrs(STATE);
    expect(attrs['data-tier']).toBe('T1 · default');
    expect(attrs['data-draws']).toBe('132');
    expect(attrs['data-tris']).toBe('132264');
    expect(attrs['data-tris']).not.toContain(' ');
    expect(buildHudAttrs({ ...STATE, frameTriangles: 1000000 })['data-tris']).toBe('1000000');
    expect(buildHudAttrs({ ...STATE, frameDrawCalls: 0 })['data-draws']).toBe('0');
  });
  it('median rounding rule: String(Math.round(ms * 100) / 100)', () => {
    expect(buildHudAttrs({ ...STATE, medianFrameMs: 16.666 })['data-frame-ms']).toBe('16.67');
    expect(buildHudAttrs({ ...STATE, medianFrameMs: 0 })['data-frame-ms']).toBe('0');
    expect(buildHudAttrs({ ...STATE, medianFrameMs: 16.5 })['data-frame-ms']).toBe('16.5');
    expect(buildHudAttrs({ ...STATE, medianFrameMs: 8.333 })['data-frame-ms']).toBe('8.33');
  });
  it('every value is a string', () => {
    for (const v of Object.values(buildHudAttrs(STATE))) expect(typeof v).toBe('string');
  });
});
describe('buildHudLines', () => {
  it('four lines: tier row (label · source · probe count), grouped digits, fps, room row', () => {
    // 1000 / 16.5 = 60.6… → rounds to 61 (not 60).
    expect(buildHudLines(STATE)).toEqual([
      'tier T1 · default · source probe · probe 8',
      'draws 132 · tris 132 264',
      'fps 61 · 16.5 ms · p95 16.9 ms',
      'room square · hold 0 ms · ledger 0 B',
    ]);
  });
  it('groups every three digits with plain spaces', () => {
    const big = buildHudLines({ ...STATE, frameDrawCalls: 1000, frameTriangles: 1000000 });
    expect(big[1]).toBe('draws 1 000 · tris 1 000 000');
    const small = buildHudLines({ ...STATE, frameDrawCalls: 999, frameTriangles: 0 });
    expect(small[1]).toBe('draws 999 · tris 0');
  });
  it('shows — instead of a rate when no interval is measured', () => {
    expect(buildHudLines({ ...STATE, medianFrameMs: 0, p95FrameMs: 0 })[2]).toBe(
      'fps — · 0 ms · p95 0 ms',
    );
  });
  it('line 3 format pinned: fps <int> · <ms> ms · p95 <ms> ms, ms rounded like the attribute', () => {
    expect(buildHudLines({ ...STATE, medianFrameMs: 16.666 })[2]).toBe(
      'fps 60 · 16.67 ms · p95 16.9 ms',
    );
    expect(buildHudLines({ ...STATE, medianFrameMs: 33.3 })[2]).toBe(
      'fps 30 · 33.3 ms · p95 16.9 ms',
    );
    expect(buildHudLines({ ...STATE, medianFrameMs: 8.333 })[2]).toBe(
      'fps 120 · 8.33 ms · p95 16.9 ms',
    );
  });
});
describe('determinism and frozen inputs', () => {
  it('same inputs give deep-equal outputs', () => {
    expect(parse('hud=1&hud=0')).toEqual(parse('hud=1&hud=0'));
    expect(pushFrameInterval([1, 2], 3)).toEqual(pushFrameInterval([1, 2], 3));
    expect(rollingMedianFrameMs([3, 1, 2])).toBe(rollingMedianFrameMs([3, 1, 2]));
    expect(buildHudAttrs(STATE)).toEqual(buildHudAttrs(STATE));
    expect(buildHudLines(STATE)).toEqual(buildHudLines(STATE));
  });
  it('never mutates state, buffers or params (structuredClone snapshot)', () => {
    const state: HudState = Object.freeze({ ...STATE, medianFrameMs: 16.666 });
    const buffer: readonly number[] = Object.freeze([33.3, 8.3, 16.7]);
    const p = params('hud=1&det=1');
    const stateSnap = structuredClone(state);
    const bufferSnap = structuredClone(buffer);
    const paramsSnap = p.toString();
    parseHudParam(p);
    pushFrameInterval(buffer, 12);
    pushFrameInterval(buffer, 0);
    rollingMedianFrameMs(buffer);
    buildHudAttrs(state);
    buildHudLines(state);
    expect(state).toEqual(stateSnap);
    expect(buffer).toEqual(bufferSnap);
    expect(p.toString()).toBe(paramsSnap);
  });
});
describe('purity', () => {
  const sources = import.meta.glob('../src/ui/hud.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(1);
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
