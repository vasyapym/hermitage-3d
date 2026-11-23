// JS gzip budget — design-sky-time.md §11. Fixed gzip configuration; counts
// every emitted .js chunk in dist/assets (bootstrap, dynamic imports included).
// Runs in the build stage: Vitest precedes build, dist must be fresh.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 350000;
const here = dirname(fileURLToPath(import.meta.url));
const distAssets = join(here, '..', 'dist', 'assets');
const roomsDir = join(here, '..', 'rooms');
let total = 0;
let chunks = 0;
// The RU column rides a lazy chunk (design-i18n-notes.md R2; DEC-020): counted by the
// total gate above AND measured separately at its own declared ceiling. The marker string
// is unique to src/i18n/ru.ts (the Jordan staircase title, stored data).
const RU_CHUNK_MARKER = 'Иорданская лестница';
const RU_CHUNK_LIMIT = 12000;
let ruGzip = null;
// Attribution — the course-instrument round (DECISION-34): room chunks are named after
// their rooms/<folder> by vite.config.ts (chunkFileNames on facadeModuleId), so this
// print splits the JS total per room. A diagnostic, stdout only: no per-room cap, no
// ledger column. Groups: room:<folder> (folders read from rooms/, so a new room needs
// no edit here), 'ru' (the marker chunk), 'other' (entry, notes, shared splits).
// The room rows measure the room's LAZY chunk only — the room's static contract rides
// the entry ('other'); a room with no folder row (the resident square) is not zero JS.
function groupOf(name, isRu, folders) {
  if (isRu) return 'ru';
  if (name.startsWith('room_')) {
    let best = null;
    for (const folder of folders) {
      if (name.startsWith(`room_${folder}-`) && (best === null || folder.length > best.length)) {
        best = folder;
      }
    }
    if (best !== null) return `room:${best}`;
  }
  return 'other';
}
const rows = [];
const ruNames = [];
let folders = [];
try {
  folders = readdirSync(roomsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
} catch (error) {
  console.log(
    `budget: rooms/ unreadable (${error?.message ?? error}) — room grouping disabled, everything 'other'`,
  );
}
try {
  for (const name of readdirSync(distAssets)) {
    if (!name.endsWith('.js')) continue;
    const buffer = readFileSync(join(distAssets, name));
    const gzip = gzipSync(buffer, { level: 9 }).length;
    total += gzip;
    chunks += 1;
    const isRu = buffer.includes(RU_CHUNK_MARKER);
    if (isRu) {
      ruGzip = gzip;
      ruNames.push(name);
    }
    rows.push({ name, raw: buffer.length, gzip, group: groupOf(name, isRu, folders) });
  }
  for (const row of [...rows].sort((a, b) => b.gzip - a.gzip)) {
    console.log(`budget: chunk ${row.name} ${row.gzip} gz (${row.raw} raw)`);
  }
  if (ruNames.length > 1) {
    console.log(
      `budget: ru marker matched ${ruNames.length} chunks (${ruNames.join(', ')}) — the ru row/cap reads the last match; diagnose the split`,
    );
  }
  const sums = new Map();
  for (const row of rows) {
    sums.set(row.group, (sums.get(row.group) ?? 0) + row.gzip);
  }
  const parts = [];
  for (const folder of folders) {
    const sum = sums.get(`room:${folder}`);
    if (sum !== undefined) parts.push(`${folder} ${sum}`);
  }
  const ruSum = sums.get('ru');
  if (ruSum !== undefined) parts.push(`ru ${ruSum}`);
  const otherSum = sums.get('other');
  if (otherSum !== undefined) parts.push(`other ${otherSum}`);
  console.log(`budget: rooms (lazy chunk gzip) ${parts.join(' · ')}`);
} catch (error) {
  console.error(
    `budget: dist/assets missing or unreadable (${error?.message ?? error}) — run pnpm build first`,
  );
  process.exit(1);
}
console.log(`budget: ${chunks} js chunk(s), ${total} gzip bytes of ${LIMIT_BYTES}`);
if (total > LIMIT_BYTES) {
  console.error('budget: exceeded — failing build stage');
  process.exit(1);
}
if (ruGzip === null) {
  console.error('budget: the RU lazy chunk not found — the dynamic import must split it out');
  process.exit(1);
}
console.log(`budget: payload ru chunk: ${ruGzip} B of ${RU_CHUNK_LIMIT} B ok`);
if (ruGzip > RU_CHUNK_LIMIT) {
  console.error('budget: the RU chunk exceeded its declared ceiling — failing build stage');
  process.exit(1);
}

// Payload rows — design-staircase.md §3.3/§9, DEC-016. Additive: the JS rows above are untouched
// and still gate first. Raw bytes of the committed tree, no git plumbing: each public/assets/<room>/
// vs its manifest's budget.payloadBytesMax (≤ 8 000 000), the exterior row (4 000 000 B), the
// shared public/basis/ row (600 000 B — common.mjs BASIS_CAP; the 500 000 stub here was
// stale and corrected 2026-10-30 with the trace: collectPayloadRows() enforces 600 000).
// Every row prints; any breach exits 1 naming room and row.
import { collectPayloadRows } from './common.mjs';

let breached = 0;
for (const r of collectPayloadRows()) {
  console.log(
    `budget: payload ${r.row} ${r.id}: ${r.bytes} B of ${r.cap} B ${r.ok ? 'ok' : 'FAIL'}${r.error ? ` — ${r.error}` : ''}`,
  );
  if (!r.ok) {
    console.error(`budget: payload breach — row "${r.row}" room "${r.id}"`);
    breached += 1;
  }
}
if (breached > 0) {
  console.error(`budget: ${breached} payload row(s) breached — failing build stage`);
  process.exit(1);
}
