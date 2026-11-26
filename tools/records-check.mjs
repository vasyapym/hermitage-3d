// tools/records-check.mjs — the blocking records-check (the records-decision design,
// stage 2's contract; the 2026-11-26 conversion replaced the parked red tool).
// Checks the record files' caps, pointers, tokens and labels; exit 0 green, 1 with the
// failure list. Wired into `pnpm validate` after the budget stage.
//
//   node tools/records-check.mjs        — exit 0 green, 1 with the failure list.
//
// Caps (bytes, canonical UTF-8 with line ends): AGENTS.md 5,000 · docs/STATE.md 10,000 ·
// docs/relay.md 9,000 · docs/ops.md 6,000 · docs/budget-ledger.md 12,000 · README.md 5,000 ·
// ROADMAP.md 8,000 · docs/charter.md 4,000 · docs/architecture.md 12,000 whole (the head
// before the first H2 ≤ 1,000; each H2 section ≤ 6,000) · the ten docs/design-*.md files
// (the head ≤ 1,000; each H2 section ≤ 6,000) · a docs/briefs/ROUNDS.md row with the head
// ≤ 1,000 · a docs/decisions.md entry ≤ 1,500 (the head ≤ 1,000) · docs/parking-lot.md lookup
// windows ≤ 4,000 B per item (the heading/bullet anchors; the file total uncapped as adopted) · the start pack = AGENTS.md +
// docs/STATE.md ≤ 15,000 B. Tokens: no MERGED, RELEASED or SPENT in docs/STATE.md's Live
// section or the ledger's open reservations table. Labels: the ledger's snapshot label
// equals docs/STATE.md's Tree label. Pointers: every docs/… reference in the checked files
// resolves to an existing file.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const CAPS = {
  'AGENTS.md': 5_000,
  'docs/STATE.md': 10_000,
  'docs/relay.md': 9_000,
  'docs/ops.md': 6_000,
  'docs/budget-ledger.md': 12_000,
  'README.md': 5_000,
  'ROADMAP.md': 8_000,
  'docs/charter.md': 4_000,
};
const DESIGN_HEAD_CAP = 1_000;
const DESIGN_SECTION_CAP = 6_000;
const ARCHITECTURE_CAP = 12_000;
const ROUNDS_HEAD_CAP = 1_000;
const ROUNDS_ROW_CAP = 1_000;
const DEC_HEAD_CAP = 1_000;
const DEC_ENTRY_CAP = 1_500;
const LOOKUP_WINDOW_CAP = 4_000;

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const checkCap = (rel, cap) => {
  if (!existsSync(join(ROOT, rel))) return null;
  const size = readFileSync(join(ROOT, rel)).length;
  if (size > cap) failures.push(`${rel}: ${size} B over the ${cap} B cap`);
  return size;
};

for (const rel of Object.keys(CAPS)) checkCap(rel, CAPS[rel]);
const startPack = (checkCap('AGENTS.md', 5_000) ?? 0) + (checkCap('docs/STATE.md', 10_000) ?? 0);
if (startPack > 15_000)
  failures.push(`the start pack (AGENTS + STATE) is ${startPack} B over 15,000`);

// the design files: the head cap + the per-H2 subtree cap
const designFiles = [
  'docs/design-environment-handover.md',
  'docs/design-facade-grammar.md',
  'docs/design-gallery-atlas-v2.md',
  'docs/design-gallery.md',
  'docs/design-ground-snow.md',
  'docs/design-i18n-notes.md',
  'docs/design-load-line.md',
  'docs/design-mobile-tier.md',
  'docs/design-project-course.md',
  'docs/design-season-chooser.md',
  'docs/design-sky-time.md',
  'docs/design-staircase.md',
  'docs/design-walkthrough-ux.md',
  'docs/design-winter.md',
];
for (const rel of designFiles) {
  if (!existsSync(join(ROOT, rel))) continue;
  const lines = read(rel).split('\n');
  const head = lines.slice(0, 6).join('\n');
  if (head.length > DESIGN_HEAD_CAP)
    failures.push(`${rel}: the head ${head.length} B over ${DESIGN_HEAD_CAP}`);
  const h2s = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.startsWith('## '));
  for (let k = 0; k < h2s.length; k++) {
    const end = k + 1 < h2s.length ? h2s[k + 1].i : lines.length;
    const size = lines.slice(h2s[k].i, end).join('\n').length;
    if (size > DESIGN_SECTION_CAP) {
      failures.push(
        `${rel}: the H2 «${h2s[k].l.slice(3, 56)}» subtree ${size} B over ${DESIGN_SECTION_CAP}`,
      );
    }
  }
}
// architecture: the whole-file cap + the head + the per-H2 cap
{
  const lines = read('docs/architecture.md').split('\n');
  const size = readFileSync(join(ROOT, 'docs/architecture.md')).length;
  if (size > ARCHITECTURE_CAP)
    failures.push(`docs/architecture.md: ${size} B over ${ARCHITECTURE_CAP}`);
  const head = lines.slice(0, 6).join('\n');
  if (head.length > 1_000)
    failures.push(`docs/architecture.md: the head ${head.length} B over 1,000`);
  const h2s = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.startsWith('## '));
  for (let k = 0; k < h2s.length; k++) {
    const end = k + 1 < h2s.length ? h2s[k + 1].i : lines.length;
    const secSize = lines.slice(h2s[k].i, end).join('\n').length;
    if (secSize > 6_000)
      failures.push(
        `docs/architecture.md: the H2 «${h2s[k].l.slice(3, 56)}» subtree ${secSize} B over 6,000`,
      );
  }
}

// ROUNDS: the head cap + the row caps
{
  const lines = read('docs/briefs/ROUNDS.md').split('\n');
  const head = lines.slice(0, 4).join('\n');
  if (head.length > ROUNDS_HEAD_CAP)
    failures.push(`docs/briefs/ROUNDS.md: the head ${head.length} B over ${ROUNDS_HEAD_CAP}`);
  for (const l of lines) {
    if (!l.startsWith('| **')) continue;
    const size = l.length;
    if (size > ROUNDS_ROW_CAP)
      failures.push(
        `docs/briefs/ROUNDS.md: the row «${l.slice(2, 52)}» ${size} B over ${ROUNDS_ROW_CAP}`,
      );
  }
}

// decisions: the head cap + the entry caps
{
  const lines = read('docs/decisions.md').split('\n');
  const head = lines.slice(0, 4).join('\n');
  if (head.length > DEC_HEAD_CAP)
    failures.push(`docs/decisions.md: the head ${head.length} B over ${DEC_HEAD_CAP}`);
  for (const l of lines) {
    const m = l.match(/^- \*\*(DEC-\d\d\d)/);
    if (!m) continue;
    const size = l.length;
    if (size > DEC_ENTRY_CAP)
      failures.push(`docs/decisions.md: the ${m[1]} entry ${size} B over ${DEC_ENTRY_CAP}`);
  }
}

// parking-lot and archive lookup windows: a block between anchors ≤ 4,000 B — in
// parking-lot the anchors are the headings AND the item bullets (per-item windows;
// the file total is uncapped as adopted), elsewhere the heading lines.
for (const rel of ['docs/parking-lot.md']) {
  const lines = read(rel).split('\n');
  const anchors = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.startsWith('#') || l.startsWith('- '));
  for (let k = 0; k < anchors.length; k++) {
    const end = k + 1 < anchors.length ? anchors[k + 1].i : lines.length;
    const size = lines.slice(anchors[k].i, end).join('\n').length;
    if (size > LOOKUP_WINDOW_CAP)
      failures.push(
        `${rel}: the block «${anchors[k].l.slice(0, 40)}» ${size} B over ${LOOKUP_WINDOW_CAP}`,
      );
  }
}

// tokens: no MERGED/RELEASED/SPENT in STATE's Live section or the ledger's open table
{
  const state = read('docs/STATE.md');
  const live = state.slice(state.indexOf('## Live state'), state.indexOf('## Standing'));
  for (const tok of ['MERGED', 'RELEASED', 'SPENT']) {
    if (live.includes(tok))
      failures.push(`docs/STATE.md: the Live section carries the ${tok} token`);
  }
  const ledger = read('docs/budget-ledger.md');
  const open = ledger.slice(ledger.indexOf('## Open reservations'));
  for (const tok of ['MERGED', 'RELEASED', 'SPENT']) {
    if (open.includes(tok))
      failures.push(`docs/budget-ledger.md: the Open reservations table carries the ${tok} token`);
  }
}

// labels: the ledger's snapshot label == STATE's Tree label
{
  const state = read('docs/STATE.md');
  const tree = state.split('\n').find((l) => l.startsWith('Tree:'));
  const ledger = read('docs/budget-ledger.md');
  const snap = ledger.split('\n').find((l) => l.includes('snapshot'));
  if (tree && snap) {
    const treeLabel = tree.replace(/^Tree:\s*/, '').trim();
    const snapLabel = snap.replace(/^\*\*/, '').trim();
    if (!snapLabel.startsWith(treeLabel.split('·')[0].trim())) {
      failures.push(
        `the ledger's snapshot label «${snapLabel.slice(0, 60)}» does not match STATE's Tree «${treeLabel.slice(0, 60)}»`,
      );
    }
  }
}

// pointers: every docs/… reference in the checked records resolves
const POINTER_FILES = [
  'AGENTS.md',
  'docs/STATE.md',
  'docs/relay.md',
  'docs/ops.md',
  'docs/budget-ledger.md',
  'ROADMAP.md',
  'docs/briefs/ROUNDS.md',
  'docs/decisions.md',
  'docs/parking-lot.md',
];
for (const rel of POINTER_FILES) {
  if (!existsSync(join(ROOT, rel))) continue;
  const text = read(rel);
  const refs = text.match(/docs\/[A-Za-z0-9/._-]+\.md/g) ?? [];
  for (const ref of new Set(refs)) {
    if (!existsSync(join(ROOT, ref)))
      failures.push(`${rel}: the pointer docs/${ref.slice(0)} — ${ref} does not resolve`);
  }
}

if (failures.length) {
  console.error('records-check FAIL:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('records-check: green');
