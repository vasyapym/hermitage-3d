// tools/records-check.mjs
// The records-check tool (the ratified records lane spec). Verifies the four record
// files (docs/STATE.md, docs/briefs/ROUNDS.md, docs/decisions.md, docs/budget-ledger.md):
//   (a) the caps: STATE.md ≤ 40,000 B; its Live-state section ≤ 10,240 B; ROUNDS.md
//       ≤ 100,000 B; every ROUNDS table row ≤ 1,000 B; every DEC register line ≤ 1,500 B;
//   (b) every docs/archive/<file> reference in STATE/ROUNDS/decisions resolves to an
//       existing file (template refs with '<' are the law's placeholder, skipped);
//   (c) no file:line citation into the four records (the anti-citation law);
//   (d) the Standing-protocol immutability: the pin's block (heading → EOF) is a byte
//       prefix of the current block, and the remainder is exactly the one appended
//       «Record shapes.» entry (fingerprint = the remainder's first 60 chars).
//   node tools/records-check.mjs        — exit 0 green, 1 with the failure list.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PIN = 'ff2a85ed19b41c2bda750dc1dd229e6409201daf';
const STATE = 'docs/STATE.md';
const ROUNDS = 'docs/briefs/ROUNDS.md';
const DECISIONS = 'docs/decisions.md';
const LEDGER = 'docs/budget-ledger.md';
const RECORDS = [STATE, ROUNDS, DECISIONS, LEDGER];
const CITATION_RE = /(STATE|ROUNDS|decisions|budget-ledger)\.md:\d/g;
const ARCHIVE_REF_RE = /docs\/archive\/[^\s)#|,`]+/g;

const failures = [];
const notes = [];

// (a) the caps
const state = readFileSync(STATE, 'utf8');
const stateBytes = Buffer.byteLength(state);
if (stateBytes > 40000) failures.push(`STATE.md ${stateBytes} B > 40,000 cap`);

const liveStart = state.indexOf('## Live state');
const protocolStart = state.indexOf('## Standing protocol');
let liveBytes = -1;
if (liveStart < 0 || protocolStart < 0 || protocolStart < liveStart) {
  failures.push('STATE.md: the Live-state / Standing-protocol headings missing or misordered');
} else {
  liveBytes = Buffer.byteLength(state.slice(liveStart, protocolStart));
  if (liveBytes > 10240) failures.push(`STATE Live-state section ${liveBytes} B > 10,240 cap`);
}

const rounds = readFileSync(ROUNDS, 'utf8');
const roundsBytes = Buffer.byteLength(rounds);
if (roundsBytes > 100000) failures.push(`ROUNDS.md ${roundsBytes} B > 100,000 cap`);

for (const line of rounds.split('\n')) {
  if (!line.startsWith('| ')) continue;
  const n = Buffer.byteLength(line);
  if (n > 1000) failures.push(`ROUNDS row ${n} B > 1,000 cap: ${line.slice(0, 70)}…`);
}

const decisions = readFileSync(DECISIONS, 'utf8');
for (const line of decisions.split('\n')) {
  if (!line.startsWith('- **DEC-')) continue;
  const n = Buffer.byteLength(line);
  if (n > 1500) failures.push(`DEC register line ${n} B > 1,500 cap: ${line.slice(0, 70)}…`);
}

// (b) the archive-pointer resolution
const refs = new Set();
for (const text of [state, rounds, decisions]) {
  for (const m of text.matchAll(ARCHIVE_REF_RE)) {
    if (m[0].includes('<')) continue; // the law's template placeholder, not a file
    refs.add(m[0].replace(/[.,;:]+$/, ''));
  }
}
for (const ref of refs) {
  if (!existsSync(ref)) failures.push(`archive pointer unresolved: ${ref}`);
}

// (c) the no-line-citations law
for (const f of RECORDS) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(CITATION_RE)) failures.push(`line-citation ${f}:${i + 1} → ${m[0]}`);
  });
}

// (d) the Standing-protocol immutability
if (protocolStart >= 0) {
  const curBlock = state.slice(protocolStart);
  const pinLines = execSync(`git show ${PIN}:docs/STATE.md`, { encoding: 'utf8' }).split('\n');
  const pinStart = pinLines.indexOf('## Standing protocol');
  if (pinStart < 0) {
    failures.push('the pin STATE.md carries no «## Standing protocol» heading');
  } else {
    const pinBlock = pinLines.slice(pinStart).join('\n') + '\n';
    if (!curBlock.startsWith(pinBlock)) {
      failures.push('Standing protocol: the current block is not the pin block + one appended entry (byte-prefix mismatch)');
    } else {
      const remainder = curBlock.slice(pinBlock.length);
      if (!remainder.startsWith('**Record shapes.**')) {
        failures.push(`Standing protocol remainder is not the «Record shapes.» entry: «${remainder.slice(0, 60)}»`);
      } else if ((remainder.match(/Record shapes\./g) || []).length !== 1) {
        failures.push('Standing protocol carries more than one «Record shapes.» entry');
      } else {
        notes.push(`protocol: pin block + one entry, fingerprint «${remainder.slice(0, 60)}»`);
      }
    }
  }
}

if (failures.length) {
  console.error('records-check FAIL:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('records-check: green');
for (const n of notes) console.log(`note: ${n}`);
console.log(`caps: STATE ${stateBytes} B · Live-state ${liveBytes} B · ROUNDS ${roundsBytes} B · ${refs.size} archive pointers resolved · citations 0`);
