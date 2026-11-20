// tests/rastrelli-state.test.ts
// RG-F4: the gallery's day-state law pins. Three families:
// 1. The PANE_EMISSION dial — the pane row in tools/bpy/bake.py's STAGE_SPILL_PARTS is the
//    room's declared pane emission {day, dusk, night = 0}; the §1.4 hierarchy (the
//    courtyard-led day, the reduced dusk, the declared-zero night) rides these values, and
//    the ordering day > dusk > night=0 is the law the bench landed (the acceptance bars
//    themselves live in tools/probes/rg-f4-bars.py + the round record — capture-level, not
//    node-testable).
// 2. The containment shas — under a light-dial round the geometry must never move: the glb
//    stays f8407818… (the junction-law UV2 re-weight's own artifact — batch A's S1a build,
//    TEXCOORD_1 only; POSITION/NORMAL/TEXCOORD_0 identical, the node list belt-equal).
//    THE JUNCTION LAW (rg-audit batch B) re-pins ALL THREE PLATES deliberately: the day and
//    dusk plates carry the S2A junction relief (the never-exported proxies baked
//    Selected-to-Active into the atlas; the committed flat path untouched as the base), and
//    the night plate re-pins for the UV2 RE-PARAMETERIZATION ONLY — the night bake ran the
//    committed flat path on the new atlas layout with no S2A and no proxies visible (the
//    recorded O4 ruling); the re-pin's cause is D1's measured starvation (the cove plan
//    spanned 1.0–1.4 texels on the binding seats) that forced the atlas re-weight, so all
//    three plates had to re-bake on the moved islands. The night LOOK law is unchanged:
//    same bake law, same white point, same compose recipe (night = k·night). These rows are
//    FILE-BACKED: the manifest-vs-disk identity (length + sha256 per row, and the glb
//    geometry summary) is every-room law in tests/assets.test.ts's rows-recompute +
//    geometry-summary checks — a stale manifest row fails THAT gate first.
// 3. The envelope sums — the landed manifest's byte totals, pinned so the next asset-chain
//    touch fails loud and updates them deliberately. AUTHORIZED UPDATE SCOPE: a light-dial
//    round updates the dial rows + these two sums in the same commit; a GEOMETRY round
//    (the glb sha moving) is a different class — it must re-open the containment row and
//    the round record, never silently pass. The junction-law round re-pinned the sums with
//    the glb's measured +392 B (the UV2 re-weight; the verdict's ±200 forecast) plus the
//    fresh plates' texture delta (the declared room-local allowance +15,000 B).
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

  it('containment: the glb and the three plate shas pin at the junction-law values', () => {
    const glb = MANIFEST.files.find((f) => f.path === 'rastrelli-gallery.glb');
    const day = MANIFEST.files.find((f) => f.path === 'lm/day.ktx2');
    const dusk = MANIFEST.files.find((f) => f.path === 'lm/dusk.ktx2');
    const night = MANIFEST.files.find((f) => f.path === 'lm/night.ktx2');
    expect(glb?.sha256).toBe('f84078184ba4e1541d874b0a60897cfe80de0b0c710c16f9955e0f8511a4a85d');
    expect(day?.sha256).toBe('a7913fd817f13733f4579b18ef932cea212a767a4f5c6da7baad88bd4f259c26');
    expect(dusk?.sha256).toBe('a08d7e6ce790274c502836cb9eac96a04237306e77621bb95995fabe05f36578');
    expect(night?.sha256).toBe('27bb7c1eedd4e9cbb7e90e617da3e1ae00a817b7fa8f11ba5cf43a311b6f55e9');
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
    expect(sum).toBe(1145494); // the junction-law manifest (the UV2 re-weight's plates + the S2A relief); a dial change updates this pin
    expect(tex).toBe(892790);
    expect(MANIFEST.geometry?.trianglesDrawn).toBe(10868); // the file-level law rides tests/assets.test.ts
  });
});
