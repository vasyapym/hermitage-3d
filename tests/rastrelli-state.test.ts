// tests/rastrelli-state.test.ts
// RG-F4: the gallery's day-state law pins. Three families:
// 1. The PANE_EMISSION dial — the pane row in tools/bpy/bake.py's STAGE_SPILL_PARTS is the
//    room's declared pane emission {day, dusk, night = 0}; the §1.4 hierarchy (the
//    courtyard-led day, the reduced dusk, the declared-zero night) rides these values, and
//    the ordering day > dusk > night=0 is the law the bench landed (the acceptance bars
//    themselves live in tools/probes/rg-f4-bars.py + the round record — capture-level, not
//    node-testable).
// 2. The containment shas — under a light-dial round the geometry and the night plate must
//    never move: the glb stays 5bf119e8… (the RG-F3 dedup artifact) and the night ktx2 stays
//    5b5d2111… (the committed night read; reproduced byte-identical ×4 through the fresh
//    bake→compose→paint→encode chain at the bench). These rows are FILE-BACKED: the
//    manifest-vs-disk identity (length + sha256 per row, and the glb geometry summary) is
//    every-room law in tests/assets.test.ts's rows-recompute + geometry-summary checks —
//    a stale manifest row fails THAT gate first.
// 3. The envelope sums — the landed manifest's byte totals, pinned so the next asset-chain
//    touch fails loud and updates them deliberately. AUTHORIZED UPDATE SCOPE: a light-dial
//    round updates the dial rows + these two sums in the same commit; a GEOMETRY round
//    (the glb sha moving) is a different class — it must re-open the containment row and
//    the round record, never silently pass.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

interface RoomFileRow {
  path: string;
  bytes: number;
  sha256: string;
  kind: 'glb' | 'ktx2';
}
interface RoomManifest {
  files: RoomFileRow[];
  lightmaps: { states: string[]; res: number | null; intensity: Record<string, number> | null };
  budget: {
    trianglesMax: number;
    drawsMax: number;
    textureBytesMax: number;
    payloadBytesMax: number;
  };
  geometry?: { trianglesDrawn: number; trianglesUnique: number };
}

const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, 'public/assets/rastrelli-gallery/manifest.json'), 'utf8'),
) as RoomManifest;
const BAKE_PY = readFileSync(join(ROOT, 'tools/bpy/bake.py'), 'utf8');

describe('rastrelli-gallery state (RG-F4)', () => {
  const spillAt = BAKE_PY.indexOf('STAGE_SPILL_PARTS = {');
  const paneBlock = spillAt === -1 ? '' : BAKE_PY.slice(spillAt, spillAt + 900);

  it('the pane dial block exists with the three state rows', () => {
    expect(spillAt).toBeGreaterThanOrEqual(0);
    expect(paneBlock).toContain("'rastrelli-gallery'");
    expect(paneBlock).toContain("'pane'");
  });

  it('the dial rows: day 2.7 / dusk 0.9 / night declared zero, day > dusk > night', () => {
    expect(paneBlock).toContain("'day': ((0.82, 0.86, 0.92), 2.7)");
    expect(paneBlock).toContain("'dusk': ((0.70, 0.55, 0.38), 0.9)");
    expect(paneBlock).toContain("'nightChandeliers': ((0.0, 0.0, 0.0), 0.0)");
  });

  it('the RG-F3 first-bake nothing-strengths are gone', () => {
    expect(paneBlock).not.toContain('0.020');
    expect(paneBlock).not.toContain('0.006');
  });

  it('containment: the glb and the night plate shas never move under a light-dial round', () => {
    const glb = MANIFEST.files.find((f) => f.path === 'rastrelli-gallery.glb');
    const night = MANIFEST.files.find((f) => f.path === 'lm/night.ktx2');
    expect(glb?.sha256).toBe('5bf119e8075d46bf39699d10a6f9da2f89dd722dfa0cb05efe5a8fa3736f6631');
    expect(night?.sha256).toBe('5b5d211169220570c3b20d5597a60fa8728c4a9e624556d5276b1deea5e633cd');
  });

  it('the manifest lightmaps row: three states at 1536, the committed wp 0.8 in every state', () => {
    expect(MANIFEST.lightmaps.states).toEqual(['day', 'dusk', 'nightChandeliers']);
    expect(MANIFEST.lightmaps.res).toBe(1536);
    expect(MANIFEST.lightmaps.intensity).toEqual({ day: 0.8, dusk: 0.8, nightChandeliers: 0.8 });
  });

  it('the room envelopes hold: payload ≤ 2M, textures ≤ 1M, tris 10,868 drawn', () => {
    const sum = MANIFEST.files.reduce((acc, f) => acc + f.bytes, 0);
    const tex = MANIFEST.files
      .filter((f) => f.kind === 'ktx2')
      .reduce((acc, f) => acc + f.bytes, 0);
    expect(sum).toBeLessThanOrEqual(MANIFEST.budget.payloadBytesMax);
    expect(tex).toBeLessThanOrEqual(MANIFEST.budget.textureBytesMax);
    expect(sum).toBe(852888); // the landed iteration-4 manifest; a dial change updates this pin
    expect(tex).toBe(600576);
    expect(MANIFEST.geometry?.trianglesDrawn).toBe(10868); // the file-level law rides tests/assets.test.ts
  });
});
