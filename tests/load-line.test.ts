// tests/load-line.test.ts
/**
 * R23-ux — the load line's pure law (docs/design-load-line.md): the visibility latch, the
 * stage map, the byte-progress formatting, and the module's own purity fence (the hud.test
 * precedent: every pure module re-states its fence).
 * Vitest node style; no jsdom, no DOM.
 */
import { describe, expect, it } from 'vitest';
import { formatByteProgress } from '../src/i18n/format';
import { LOAD_LINE_AFTER_MS, LOAD_LINE_BYTE_STEP, loadLine, shouldShow } from '../src/ui/load-line';

describe('the load line — the visibility latch (§1, the law)', () => {
  it('never shows while data is ready or before the threshold', () => {
    expect(shouldShow({ elapsedMs: 999, dataReady: false, shown: false })).toBe(false);
    expect(shouldShow({ elapsedMs: LOAD_LINE_AFTER_MS - 1, dataReady: true, shown: false })).toBe(
      false,
    );
    expect(shouldShow({ elapsedMs: 0, dataReady: true, shown: false })).toBe(false);
  });
  it('shows at the threshold frame with data still pending', () => {
    expect(shouldShow({ elapsedMs: LOAD_LINE_AFTER_MS, dataReady: false, shown: false })).toBe(
      true,
    );
  });
  it('latches — once shown it stays shown even when data lands', () => {
    expect(shouldShow({ elapsedMs: 10_000, dataReady: true, shown: true })).toBe(true);
  });
  it('throws loud on impossible elapsed times', () => {
    for (const elapsed of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      let threw = false;
      try {
        shouldShow({ elapsedMs: elapsed, dataReady: false, shown: false });
      } catch (error) {
        threw = true;
        expect(error).toBeInstanceOf(RangeError);
      }
      expect(threw, `elapsed ${String(elapsed)} must throw`).toBe(true);
    }
  });
});

describe('the load line — the stage map (§1)', () => {
  it('open and failed stay verb-only views', () => {
    expect(loadLine({ stage: 'open', receivedBytes: 0, totalBytes: null })).toEqual({
      kind: 'open',
    });
    expect(loadLine({ stage: 'failed', receivedBytes: 0, totalBytes: null })).toEqual({
      kind: 'failed',
    });
    // A bytes/assemble stage before the manifest resolves honestly reads as open —
    // the total is genuinely unknown until the manifest lands.
    expect(loadLine({ stage: 'bytes', receivedBytes: 5, totalBytes: null })).toEqual({
      kind: 'open',
    });
    expect(loadLine({ stage: 'assemble', receivedBytes: 5, totalBytes: null })).toEqual({
      kind: 'open',
    });
  });
  it('bytes carries the pair, clamped so received never exceeds the total', () => {
    expect(loadLine({ stage: 'bytes', receivedBytes: 100, totalBytes: 1_000 })).toEqual({
      kind: 'bytes',
      receivedBytes: 100,
      totalBytes: 1_000,
    });
    expect(loadLine({ stage: 'bytes', receivedBytes: 2_000, totalBytes: 1_000 })).toEqual({
      kind: 'bytes',
      receivedBytes: 1_000,
      totalBytes: 1_000,
    });
  });
  it('assemble carries only the total', () => {
    expect(loadLine({ stage: 'assemble', receivedBytes: 1_000, totalBytes: 2_924_394 })).toEqual({
      kind: 'assemble',
      totalBytes: 2_924_394,
    });
  });
  it('throws loud on impossible numbers', () => {
    for (const [stage, received, total] of [
      ['bytes', -1, 1_000],
      ['bytes', Number.NaN, 1_000],
      ['assemble', 0, -1],
    ] as const) {
      let threw = false;
      try {
        loadLine({ stage, receivedBytes: received, totalBytes: total });
      } catch (error) {
        threw = true;
        expect(error).toBeInstanceOf(RangeError);
      }
      expect(threw, `${stage} ${String(received)}/${String(total)} must throw`).toBe(true);
    }
  });
});

describe('the byte-progress formatting (design-load-line.md §2, the format law)', () => {
  it('one-decimal MB above the threshold, constant width while the numerals tick', () => {
    // 1812: 1,240,000 of 2,924,394 — the reply's own example, in both columns.
    const ru = formatByteProgress(1_240_000, 2_924_394, 'ru', LOAD_LINE_BYTE_STEP);
    expect(ru.received).toBe('1,2');
    expect(ru.total).toBe('2,9\u00A0МБ'); // the number-unit junction is the no-break space
    const en = formatByteProgress(1_240_000, 2_924_394, 'en', LOAD_LINE_BYTE_STEP);
    expect(en.received).toBe('1.2');
    expect(en.total).toBe('2.9\u00A0MB');
  });
  it('writes only at the 0.1 MB step — a 50 KB stream delta is the same string', () => {
    const before = formatByteProgress(1_240_000, 2_924_394, 'ru', LOAD_LINE_BYTE_STEP);
    expect(formatByteProgress(1_289_999, 2_924_394, 'ru', LOAD_LINE_BYTE_STEP)).toEqual(before);
    const step = formatByteProgress(1_300_000, 2_924_394, 'ru', LOAD_LINE_BYTE_STEP);
    expect(step.received).toBe('1,3');
  });
  it('keeps the trailing zero at whole megabytes — «3,0» stays two digits wide', () => {
    expect(formatByteProgress(3_000_000, 3_000_000, 'ru', LOAD_LINE_BYTE_STEP).received).toBe(
      '3,0',
    );
    expect(formatByteProgress(0, 3_000_000, 'en', LOAD_LINE_BYTE_STEP).received).toBe('0.0');
    expect(formatByteProgress(0, 3_000_000, 'en', LOAD_LINE_BYTE_STEP).total).toBe('3.0\u00A0MB');
  });
  it('integer KB below the threshold; the total rounds, the received floors', () => {
    const ru = formatByteProgress(212_731, 378_876, 'ru', LOAD_LINE_BYTE_STEP);
    expect(ru.received).toBe('212');
    expect(ru.total).toBe('379\u00A0кБ');
    const en = formatByteProgress(212_731, 378_876, 'en', LOAD_LINE_BYTE_STEP);
    expect(en.total).toBe('379\u00A0kB');
  });
  it('clamps received to the total before formatting', () => {
    expect(formatByteProgress(9_999_999, 3_000_000, 'ru', LOAD_LINE_BYTE_STEP).received).toBe(
      '3,0',
    );
  });
  it('throws loud on non-finite bytes', () => {
    let threw = false;
    try {
      formatByteProgress(Number.NaN, 1_000, 'ru');
    } catch (error) {
      threw = true;
      expect(error).toBeInstanceOf(RangeError);
    }
    expect(threw).toBe(true);
  });
});

describe('purity — src/ui/load-line.ts (the hud.test fence, per pure module)', () => {
  const sources = import.meta.glob('../src/ui/load-line.ts', {
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
      expect(code).not.toMatch(/\(['"]node:/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer, network or randomness', () => {
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
      const code = stripped(src);
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
