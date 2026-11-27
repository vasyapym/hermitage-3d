// tests/rastrelli-state.test.ts
// RG-F4: the gallery's day-state law pins. Three families:
// 1. The PANE_EMISSION dial — the pane row in tools/bpy/bake.py's STAGE_SPILL_PARTS is the
//    room's declared pane emission {day, dusk, night = 0}; the §1.4 hierarchy (the
//    courtyard-led day, the reduced dusk, the declared-zero night) rides these values, and
//    the ordering day > dusk > night=0 is the law the bench landed (the acceptance bars
//    themselves live in tools/probes/rg-f4-bars.py + the round record — capture-level, not
//    node-testable).
// 2. The containment shas — under a light-dial round the geometry must never move. RG-F5
//    (the dado + panel order, 2026-11-21) is a GEOMETRY round: the glb re-pins DELIBERATELY
//    (d760c431… — the exported-never-baked families: the dado datum + 56 framed panels ride
//    the shell's roster with ADOPTED TEXCOORD_1 (the hosts' cells; no new atlas cells), so
//    all three plates stayed byte-identical and only the glb grew, +40,224 B). The three
//    plate shas below are the junction-law values and HELD through the RG-F5 re-bake proof
//    (the bake chain never builds the families — build_room guards on ZIMNY_BAKE). RG-F6
//    (the threshold round, 2026-11-23) re-pinned the glb DELIBERATELY again: the displaced
//    twin + five borrowed faces (the doorcard face itself displaced export-chain-only; the
//    bake scene byte-unchanged — the plates re-hash to the same shas on the untouched
//    files), glb 292,928 → 294,632 B (+1,704), tris 12,540 → 12,550 drawn, the shell's
//    8th slot (stucco_shade_airlock).
//    THE JUNCTION LAW (rg-audit batch B) re-pinned ALL THREE PLATES deliberately: the day and
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
//    fresh plates' texture delta (the declared room-local allowance +15,000 B). RG-F5
//    re-pinned the sums again: the glb +40,224 B (the borrowed families' faces; the plates
//    and the texture line byte-held), tris 10,868 → 12,540 drawn.
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

  it('containment: the glb pins at the tear-tbdr-lane re-bake (the plates re-baked + re-encoded on the current rig — the stale bake19-era composition replaced; the glb byte-held at the fresh export), the three plate shas hold the re-encoded set', () => {
    const glb = MANIFEST.files.find((f) => f.path === 'rastrelli-gallery.glb');
    const day = MANIFEST.files.find((f) => f.path === 'lm/day.ktx2');
    const dusk = MANIFEST.files.find((f) => f.path === 'lm/dusk.ktx2');
    const night = MANIFEST.files.find((f) => f.path === 'lm/night.ktx2');
    expect(glb?.sha256).toBe('b694b1bdf5915d95c3b2e7314429859bd5dd83cf4f8653c858bbe4f22c1a11ed');
    expect(day?.sha256).toBe('b7f952bca591f4c55ba0371d83b199044ce7d53c0a144367b51bca7858befbc9');
    expect(dusk?.sha256).toBe('cf728dc788ce39cfc2d36620d4054051fe6d596651e80e4206fe87de2d8cf1b2');
    expect(night?.sha256).toBe('983c4d51ce2fc111b978e673d8c9d578bed817a1a6b7211ea7c8585db2d141fa');
  });

  it('the manifest lightmaps row: three states at 1536, the committed wp 0.8 in every state', () => {
    expect(MANIFEST.lightmaps.states).toEqual(['day', 'dusk', 'nightChandeliers']);
    expect(MANIFEST.lightmaps.res).toBe(1536);
    expect(MANIFEST.lightmaps.intensity).toEqual({ day: 0.8, dusk: 0.8, nightChandeliers: 0.8 });
  });

  it('the room envelopes hold: payload ≤ 2M, textures ≤ 1M, tris 17,037 drawn', () => {
    const sum = MANIFEST.files.reduce((acc, f) => acc + f.bytes, 0);
    const tex = MANIFEST.files
      .filter((f) => f.kind === 'ktx2')
      .reduce((acc, f) => acc + f.bytes, 0);
    expect(sum).toBeLessThanOrEqual(MANIFEST.budget.payloadBytesMax);
    expect(tex).toBeLessThanOrEqual(MANIFEST.budget.textureBytesMax);
    expect(sum).toBe(1384417); // the tear-tbdr-lane re-bake: the three plates re-encoded on the current rig (the lit vault carries more encode detail; day 336,627 / dusk 303,413 / night 301,235 / probe 2,348), the glb 393,344 B byte-held, the tex byte-held
    expect(tex).toBe(991073);
    expect(MANIFEST.geometry?.trianglesDrawn).toBe(17037); // the file-level law rides tests/assets.test.ts
  });
});
