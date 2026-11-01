/*
 * Military Gallery portrait atlas v2 — the offline import pipeline
 * (design-gallery-atlas-v2.md §4; DEC-016 toolchain pins, DEC-024 determinism).
 *
 *   pnpm gallery:transcribe   hang.source.json → roster.json (the §2.3 row-tail-painted rule)
 *   pnpm gallery:fetch        Commons API + downloads → .cache/gallery-sources/ (never committed)
 *   pnpm gallery:lock         cache → atlas.lock.json (per-key sha/license/tone/crop)
 *   pnpm gallery:compose      lock + cache → out/military-gallery/level-N.png + the digest
 *   pnpm gallery:encode       toktx 4.4.2 on level-0.png → the committed ktx2 (§3.7 ladder)
 *   pnpm gallery:verify       re-read by lock, re-compose, re-encode, byte-compare
 *   pnpm gallery:attrib       regenerates the ATTRIBUTIONS.md block between the markers
 *   pnpm gallery:report       atlas bytes vs the fence, texture/payload totals vs the manifest
 *   pnpm gallery:all          transcribe → fetch → lock → compose → encode → attrib → report
 *
 * `gallery:compose --mock` runs the whole composition law on mockTiles (§3.8): the CI-pinned
 * mode — no sources, no lock, no toktx. CI never runs any of this: it recomputes the mock
 * digest in Vitest and checks the committed KTX2 against the digest (and against the lock,
 * when the lock exists — the mock-first gate keeps both states green).
 *
 * This file is a NODE TOOL (imports, process, network are all allowed here); every law it
 * applies lives in the pure modules atlas-law.mjs / resample.mjs / hang-law.mjs.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import jpeg from 'jpeg-js';
import {
  ATLAS_BYTES_MAX,
  ATLAS_LAW_VERSION,
  ATLAS_SIZE_PX,
  encodePng,
  isFamilyLicense,
  LICENSE_STEMS,
  MIP_LEVELS,
  mockTiles,
  paintAtlas,
  QLEVEL_LADDER,
  SLOT_H_PX,
  SLOT_INSET_PX,
  SLOT_W_PX,
} from './atlas-law.mjs';
import {
  applyHang,
  HANG_ROWS_PER_WALL,
  HANG_W_PER_ROW,
  HANG_WALLS,
  smallRankToSlot,
  superBlockRankToSlot,
} from './hang-law.mjs';
import {
  boxDownHalf,
  cropRectCover,
  histogramY16,
  percentileY16,
  resizeBoxTone,
  toneParams,
} from './resample.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GALLERY = join(ROOT, 'tools', 'gallery');
export const HANG_PATH = join(GALLERY, 'hang.source.json');
export const ROSTER_PATH = join(GALLERY, 'roster.json');
export const LOCK_PATH = join(GALLERY, 'atlas.lock.json');
export const DIGEST_PATH = join(GALLERY, 'atlas.digest.json');
export const ATTRIBUTIONS_PATH = join(ROOT, 'ATTRIBUTIONS.md');
export const CACHE_DIR = join(ROOT, '.cache', 'gallery-sources');
export const OUT_DIR = join(ROOT, 'out', 'military-gallery');
export const KTX2_PATH = join(
  ROOT,
  'public',
  'assets',
  'military-gallery',
  'tex',
  'military-gallery-portraits.ktx2',
);
export const MANIFEST_PATH = join(ROOT, 'public', 'assets', 'military-gallery', 'manifest.json');
/** The proven encode path (orchestrator correction A): ONE base PNG + toktx's own --genmipmap. */
export const TOKTX_VERSION = '4.4.2';
export const TOKTX_ARGS = (qlevel) => [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  String(qlevel),
  '--threads',
  '1',
  '--genmipmap',
  '--assign_oetf',
  'srgb',
  '--assign_primaries',
  'bt709',
];
export const ATTRIB_BEGIN = '<!-- gallery-atlas:begin -->';
export const ATTRIB_END = '<!-- gallery-atlas:end -->';
const CONTENT_W = SLOT_W_PX - 2 * SLOT_INSET_PX; // 130 — the small cell's content rect
const CONTENT_H = SLOT_H_PX - 2 * SLOT_INSET_PX; // 166
const MONARCH_CONTENT_W = 2 * SLOT_W_PX - 2 * SLOT_INSET_PX; // 274 — the super-block's rect
const MONARCH_CONTENT_H = 2 * SLOT_H_PX - 2 * SLOT_INSET_PX; // 346
const UA = 'zimny-gallery-import/2 (atlas-v2; contact: the repo owner)';
/** Commons rate-limit etiquette (the home-IP 429 storm of 2026-11-01): small batches, a real
 * pause between batches, back off by Retry-After — but a Retry-After beyond RATE_WAIT_MAX
 * becomes a COLLECTED failure ("re-run later on a cold IP") instead of a ten-minute stall. */
const FETCH_PAUSE_MS = 1500;
const FETCH_BATCH = 2;
const FETCH_TIMEOUT_MS = 30_000;
const RATE_WAIT_MAX_MS = 120_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRetry(url, tries = 6) {
  const host = new URL(url).host;
  for (let attempt = 1; ; attempt += 1) {
    let res;
    try {
      res = await fetch(url, {
        headers: { 'user-agent': UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      if (attempt < tries) {
        await sleep(attempt * 4000);
        continue;
      }
      throw new ImportSkip(
        `network: ${host} unreachable after ${tries} tries (${e?.cause?.code ?? e?.name ?? 'error'})`,
      );
    }
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const headerWait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
      if (headerWait > RATE_WAIT_MAX_MS) {
        throw new ImportSkip(`rate-limited: ${host} asks to wait ${headerWait} ms — re-run later`);
      }
      const wait = headerWait > 0 ? headerWait : attempt * 4000;
      process.stderr.write(`fetch: ${res.status} — retry ${attempt} in ${wait} ms (${host})\n`);
      await sleep(wait);
      continue;
    }
    throw new Error(`import: ${url} answered ${res.status}`);
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const cacheImagePath = (meta) =>
  join(CACHE_DIR, `${meta.sha256}.${meta.mime === 'image/png' ? 'png' : 'jpg'}`);

/** Canonical serialisation (§2.1): sorted keys, 2-space indent, trailing newline. */
export function canonicalJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

/** Recursively sort object keys so JSON.stringify is order-stable. */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key]);
    return sorted;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Decoders — jpeg-js pinned (exact devDependency; verify refuses a mismatch, §4.4), PNG via
// node zlib inflate (lossless, implementation-independent). 8-bit truecolor only; anything
// else fails loud — the composer never guesses.
// ---------------------------------------------------------------------------
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Minimal PNG decode: 8-bit truecolor (colour type 2 or 6), filters 0–4, no interlace. */
export function decodePng(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('import: not a PNG');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let colourType = 0;
  const idat = [];
  for (let o = 8; o + 12 <= bytes.length; ) {
    const len = view.getUint32(o);
    const type = bytes.toString('latin1', o + 4, o + 8);
    if (type === 'IHDR') {
      width = view.getUint32(o + 8);
      height = view.getUint32(o + 12);
      colourType = bytes[o + 8 + 9];
      if (bytes[o + 8 + 8] !== 8 || (colourType !== 2 && colourType !== 6)) {
        throw new Error(
          `import: PNG colour type ${colourType} needs 8-bit RGB/RGBA — convert the source`,
        );
      }
    } else if (type === 'IDAT') {
      idat.push(bytes.subarray(o + 8, o + 8 + len));
    }
    o += 12 + len;
  }
  const channels = colourType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const lines = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const src = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? lines[y * stride + x - channels] : 0;
      const up = y > 0 ? lines[(y - 1) * stride + x] : 0;
      const ul = y > 0 && x >= channels ? lines[(y - 1) * stride + x - channels] : 0;
      let v = src;
      if (filter === 1) v = src + left;
      else if (filter === 2) v = src + up;
      else if (filter === 3) v = src + ((left + up) >> 1);
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        v = src + (pa <= pb && pa <= pc ? left : pb <= pc ? up : ul);
      }
      lines[y * stride + x] = v & 0xff;
    }
  }
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    out[i * 4] = lines[i * channels];
    out[i * 4 + 1] = lines[i * channels + 1];
    out[i * 4 + 2] = lines[i * channels + 2];
    out[i * 4 + 3] = colourType === 6 ? lines[i * channels + 3] : 255;
  }
  return { width, height, data: out };
}

/** JPEG via jpeg-js (0.4.4); PNG (8-bit truecolor) via the minimal decoder above. */
export function decodeImage(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    return { width: img.width, height: img.height, data: img.data };
  }
  return decodePng(bytes);
}

// ---------------------------------------------------------------------------
// transcribe — hang.source.json (the hand-transcribed scheme, owner decision #10) → roster.json
// The committed transcription's schema (2026-11-01 revision): halfLengths rows over walls
// «A»/«B» with kind 'painted'|'silk', ГЭ numbers in Cyrillic form, and the anchors incl. the
// northPair array. buildRoster is the adapter from that human artifact to the roster law.
// ---------------------------------------------------------------------------
/** The design's declared orientation default (§2.3): real wall A → the kit's west wall. */
const WALL_OF_REAL = { A: 'west', B: 'east' };
/** `ГЭ-7894` → `ge-7894` (the roster's key law §2.2). */
const keyOfGe = (ge) => `ge-${String(ge).replace(/\D/g, '')}`;
/**
 * The 13 silk sitters → their §2.5 latin keys. The transcription carries only the RU sitter
 * names; this map is the declared transliteration (an unknown silk sitter fails loud).
 */
const SILK_KEY_OF_SITTER = {
  'А. А. Юрковский': 'silk-yurkovsky',
  'В. И. Каратаев': 'silk-karataev',
  'Ф. П. Алексополь': 'silk-aleksopol',
  'А. И. Балла': 'silk-balla',
  'Н. В. Давыдов': 'silk-davydov-n',
  'А. М. Всеволожский': 'silk-vsevolozhsky',
  'А. И. Гурьев': 'silk-guryev',
  'Ф. П. Наний': 'silk-naniy',
  'А. Н. Потапов': 'silk-potapov',
  'И. Д. Иванов': 'silk-ivanov',
  'С. Э. Жевахов': 'silk-zhevakhov',
  'Е. В. Давыдов': 'silk-davydov-e',
  'Н. И. Лавров': 'silk-lavrov',
};
/**
 * The transcriber documented (hang.source.json `uncertain`) that Barclay de Tolly's parade
 * portrait has NO published ГЭ number; ГЭ-7809 is their sequence hypothesis. The roster uses
 * it so the key law holds; the owner's review confirms or replaces it (one key edit).
 */
const BARCLAY_KEY_FALLBACK = 'ge-7809';

/** The transcription rows normalised to the law's field names (shared by transcribe + fetch). */
function normalizedHangRows(hang) {
  const source = hang.halfLengths ?? hang.frames;
  if (!Array.isArray(source))
    throw new Error('import: hang.source.json carries no halfLengths table');
  return source.map((f) => {
    const wall = WALL_OF_REAL[f.wall];
    if (wall === undefined)
      throw new Error(`import: hang row ${f.ge ?? f.sitter} hangs on unknown wall "${f.wall}"`);
    const key =
      f.kind === 'silk' ? SILK_KEY_OF_SITTER[f.sitter] : f.ge === null ? null : keyOfGe(f.ge);
    if (key === null || key === undefined) {
      throw new Error(
        `import: hang row "${f.sitter}" (${f.wall}/${f.row}/${f.col}) has no key — the silk map or the ГЭ number is missing`,
      );
    }
    return { ...f, key, silk: f.kind === 'silk', wall };
  });
}

export function buildRoster(hang) {
  const { frames: kept, omitted } = applyHang(
    { frames: normalizedHangRows(hang) },
    { w: HANG_W_PER_ROW, rowsPerWall: HANG_ROWS_PER_WALL, walls: HANG_WALLS },
  );
  const anchors = hang.anchors;
  const anchorKey = (a, what) => {
    const key = a.ge === null || a.ge === undefined ? null : keyOfGe(a.ge);
    if (key === null)
      throw new Error(
        `import: the ${what} anchor has no ГЭ number — see hang.source.json uncertain`,
      );
    return key;
  };
  const monarchs = ['portal', 'westAlly', 'eastAlly'].map((slotName, rank) => {
    const a = anchors[slotName];
    if (a === undefined) throw new Error(`import: hang.source.json misses the ${slotName} anchor`);
    return {
      artist: a.artist,
      key: anchorKey(a, slotName),
      kind: 'monarch',
      rank,
      slot: slotName,
      title: a.sitter,
      year: a.year,
    };
  });
  // The north door pair anchors to small ranks 330/331 (slots 342/343, the §2.4 ruling);
  // the pair rides in the transcription's anchors.northPair order (Kutuzov, Barclay).
  const northPair = anchors.northPair;
  if (!Array.isArray(northPair) || northPair.length !== 2) {
    throw new Error('import: hang.source.json misses the two-entry anchors.northPair');
  }
  const flanking = northPair.map((a, i) => {
    if ((a.ge === null || a.ge === undefined) && i !== 1) {
      throw new Error('import: northPair[0] (Kutuzov) must carry a documented ГЭ number');
    }
    return {
      artist: a.artist,
      col: i,
      key: a.ge === null || a.ge === undefined ? BARCLAY_KEY_FALLBACK : keyOfGe(a.ge),
      kind: 'painted',
      rank: 330 + i,
      row: 0,
      sitter: a.sitter,
      wall: 'north',
      year: a.year,
    };
  });
  return {
    frames: [
      ...monarchs,
      ...kept.map(({ col, key, kind, rank, row, sitter, wall }) => ({
        col,
        key,
        kind,
        rank,
        row,
        sitter,
        wall,
      })),
      ...flanking,
    ],
    law: 'military-gallery-1812/roster/v2',
    omitRule: 'row-tail-painted',
    omitted,
    orientation: { realWallA: 'west', realWallB: 'east', row0: 'lowest', walk: 'north->south' },
  };
}

function transcribe() {
  const roster = buildRoster(readJson(HANG_PATH));
  writeFileSync(ROSTER_PATH, canonicalJson(roster), 'utf8');
  console.log(
    `transcribe: ${ROSTER_PATH} — ${roster.frames.length} frames, ${roster.omitted.length} omitted`,
  );
}

// ---------------------------------------------------------------------------
// fetch — Commons API + original download, license-gated (§4.1 posture A)
// The gate checks the file's LICENSE TEMPLATES in the wikitext (the design's law: "rejects
// files whose template is outside the PD-Art FAMILY (LICENSE_STEMS)") — extmetadata's
// LicenseShortName reads
// "Public domain" for PD-Art files and does not name the template.
// ---------------------------------------------------------------------------
/** {{PD-Art}} and its family — the §6.3 stem law over the file's license templates. */
function licenseTemplateOf(wikitext) {
  for (const m of wikitext.matchAll(/\{\{\s*([a-z0-9 :_-]+)/gi)) {
    const name = m[1].trim().toLowerCase();
    if (isFamilyLicense(name)) return m[1].trim();
  }
  return null;
}

/** The batched metadata law (the 2026-11-01 politeness pass): imageinfo AND license wikitext
 * are queried 50 files per call — ~14 API requests cover the whole roster instead of two per
 * file. The bytes stay one download per file (that is the part the byte host can throttle). */
const API_BATCH = 50;

async function apiQuery(params) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries(params)) api.searchParams.set(k, String(v));
  const res = await fetchRetry(api);
  return res.json();
}

async function preloadMetadata(titles) {
  const infoByTitle = new Map();
  const licenseByTitle = new Map();
  const norm = new Map(); // the API's from → to title normalisation
  const keyOf = (t) => norm.get(t) ?? t;
  const batches = [];
  for (let i = 0; i < titles.length; i += API_BATCH) batches.push(titles.slice(i, i + API_BATCH));
  for (const [index, batch] of batches.entries()) {
    process.stdout.write(`meta: batch ${index + 1}/${batches.length} (${batch.length} files)\n`);
    const joined = batch.map((t) => (t.startsWith('File:') ? t : `File:${t}`)).join('|');
    const infoJson = await apiQuery({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|sha1|size|mime',
      titles: joined,
    });
    for (const n of infoJson?.query?.normalized ?? []) norm.set(n.from, n.to);
    for (const p of Object.values(infoJson?.query?.pages ?? {})) {
      const info = p.imageinfo?.[0];
      if (info !== undefined) infoByTitle.set(p.title, info);
      else process.stderr.write(`meta: no imageinfo for ${p.title}\n`);
    }
    const wikiJson = await apiQuery({
      action: 'query',
      format: 'json',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: joined,
    });
    for (const p of Object.values(wikiJson?.query?.pages ?? {})) {
      const wikitext = p.revisions?.[0]?.slots?.main?.['*'] ?? '';
      licenseByTitle.set(p.title, wikitext === '' ? null : licenseTemplateOf(wikitext));
    }
    await sleep(FETCH_PAUSE_MS * 2);
  }
  return { infoByTitle, licenseByTitle, keyOf };
}

/** A substitutable source failure (no family license / no file) — collected, not fatal (§4.1:
 * "pick another Commons file" is a one-key re-lock; the run must list ALL of them at once). */
class ImportSkip extends Error {}

async function downloadOne(key, title, preloaded) {
  const normTitle = preloaded.keyOf(title.startsWith('File:') ? title : `File:${title}`);
  const info = preloaded.infoByTitle.get(normTitle) ?? preloaded.infoByTitle.get(title);
  if (info === undefined) throw new ImportSkip(`${key}: no imageinfo for ${title} — bad title?`);
  const license = preloaded.licenseByTitle.get(normTitle) ?? preloaded.licenseByTitle.get(title) ?? null;
  const legal = license !== null && license !== undefined && isFamilyLicense(license.toLowerCase());
  if (!legal) {
    throw new ImportSkip(
      `${key} (${title}): none of the PD-Art-family templates [${LICENSE_STEMS.join(', ')}] — pick another Commons file`,
    );
  }
  const img = await fetchRetry(info.url);
  const bytes = Buffer.from(await img.arrayBuffer());
  if (typeof info.sha1 === 'string' && info.sha1.length === 40) {
    // Integrity: the bytes must hash to the API's sha1 (the imageinfo field is hexadecimal).
    const hex = createHash('sha1').update(bytes).digest('hex');
    if (hex !== info.sha1) {
      throw new Error(
        `import: ${key} sha1 mismatch against the API — the upload changed mid-fetch`,
      );
    }
  }
  const digest = sha256(bytes);
  const ext = info.mime === 'image/png' ? 'png' : 'jpg';
  writeFileSync(join(CACHE_DIR, `${digest}.${ext}`), bytes);
  return {
    bytes: bytes.length,
    commonsSha1: info.sha1 ?? '',
    commonsTitle: title,
    height: info.height,
    license,
    mime: info.mime,
    sha256: digest,
    url: info.url,
    width: info.width,
  };
}

async function fetchAll() {
  const hang = readJson(HANG_PATH);
  const roster = readJson(ROSTER_PATH);
  const titleOf = new Map();
  for (const f of normalizedHangRows(hang)) if (f.commonsTitle) titleOf.set(f.key, f.commonsTitle);
  const anchors = hang.anchors ?? {};
  for (const slotName of ['portal', 'westAlly', 'eastAlly']) {
    const a = anchors[slotName];
    if (a?.commonsTitle) titleOf.set(keyOfGe(a.ge), a.commonsTitle);
  }
  // The north pair: Kutuzov carries a documented ГЭ number; Barclay rides the transcriber's
  // documented hypothesis key (BARCLAY_KEY_FALLBACK — see buildRoster).
  const northPair = anchors.northPair ?? [];
  northPair.forEach((a, i) => {
    if (a?.commonsTitle)
      titleOf.set(
        i === 1 && (a.ge === null || a.ge === undefined) ? BARCLAY_KEY_FALLBACK : keyOfGe(a.ge),
        a.commonsTitle,
      );
  });
  const painted = roster.frames.filter((f) => f.kind !== 'silk');
  mkdirSync(CACHE_DIR, { recursive: true });
  // Resume: metas land on disk after EVERY file, so a rate-limited restart fetches only the rest.
  const metaPath = join(CACHE_DIR, 'meta.json');
  const metas = existsSync(metaPath) ? readJson(metaPath) : {};
  const failures = [];
  let done = 0;
  // The batched-metadata pass first: ~14 API calls cover every remaining key (the polite §§4.1;
  // license gates evaluate BEFORE any byte is downloaded), then the byte downloads run solo.
  const preloadable = painted.filter((f) => metas[f.key] === undefined && titleOf.get(f.key));
  const preloaded =
    preloadable.length > 0
      ? await preloadMetadata([...new Set(preloadable.map((f) => titleOf.get(f.key)))])
      : { infoByTitle: new Map(), licenseByTitle: new Map(), keyOf: (t) => t };
  for (const frame of painted) {
    const title = titleOf.get(frame.key);
    if (title === undefined || title === '') {
      throw new Error(
        `import: ${frame.key} has no Commons title in hang.source.json — transcribe first (owner decision #10)`,
      );
    }
    if (metas[frame.key] !== undefined) {
      done += 1;
      continue;
    }
    process.stdout.write(`fetch: ${frame.key} ← ${title}\n`);
    try {
      metas[frame.key] = await downloadOne(frame.key, title, preloaded);
    } catch (e) {
      if (!(e instanceof ImportSkip)) throw e;
      failures.push(e.message);
      process.stderr.write(`fetch: SKIP ${e.message}\n`);
      continue;
    }
    writeFileSync(metaPath, canonicalJson(metas), 'utf8');
    done += 1;
    if (done < painted.length) await sleep(FETCH_PAUSE_MS);
  }
  if (failures.length > 0) {
    process.stderr.write(
      `fetch: ${failures.length} substitutable source(s) failed the family gate — fix hang.source.json (one-key re-lock), then re-run:\n` +
        failures.map((m) => `  - ${m}`).join('\n') +
        '\n',
    );
    process.exitCode = 1;
  }
  console.log(`fetch: ${done}/${painted.length} source(s) cached under ${CACHE_DIR}`);
}

// ---------------------------------------------------------------------------
// lock — cache → atlas.lock.json (per-key provenance + tone/crop so a re-compose never
// recomputes statistics, §3.5)
// ---------------------------------------------------------------------------
export function computeToneCrop(bytes, contentW, contentH) {
  const img = decodeImage(bytes);
  const crop = cropRectCover(img.width, img.height, contentW, contentH);
  const { hist, total } = histogramY16(img.data, img.width, crop);
  const p1 = percentileY16(hist, total, 1);
  const p98 = percentileY16(hist, total, 98);
  return { crop: [crop.x, crop.y, crop.w, crop.h], tone: toneParams(p1, p98) };
}

function lockAll() {
  const roster = readJson(ROSTER_PATH);
  const metas = readJson(join(CACHE_DIR, 'meta.json'));
  const entries = {};
  for (const frame of roster.frames) {
    if (frame.kind === 'silk') continue;
    const meta = metas[frame.key];
    if (meta === undefined) {
      throw new Error(`import: ${frame.key} is not in the cache — run gallery:fetch`);
    }
    const monarch = frame.kind === 'monarch';
    const { crop, tone } = computeToneCrop(
      readFileSync(cacheImagePath(meta)),
      monarch ? MONARCH_CONTENT_W : CONTENT_W,
      monarch ? MONARCH_CONTENT_H : CONTENT_H,
    );
    entries[frame.key] = { ...meta, crop, tone };
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const jpegVersion = pkg.devDependencies['jpeg-js'];
  if (!/^\d+\.\d+\.\d+$/.test(jpegVersion)) {
    throw new Error(`import: jpeg-js must be pinned exact (no caret/range), got "${jpegVersion}"`);
  }
  const lock = {
    artifact: null,
    entries,
    law: ATLAS_LAW_VERSION,
    toolchain: {
      'jpeg-js': jpegVersion,
      flags: TOKTX_ARGS(QLEVEL_LADDER[0]).join(' '),
      node: process.versions.node,
      toktx: TOKTX_VERSION,
    },
  };
  writeFileSync(LOCK_PATH, canonicalJson(lock), 'utf8');
  console.log(`lock: ${LOCK_PATH} — ${Object.keys(entries).length} entries`);
}

// ---------------------------------------------------------------------------
// compose — lock + cache (or mock) → level PNGs + the digest section
// ---------------------------------------------------------------------------
/** The roster's silk keys by atlas slot (smallRankToSlot of the frame's rank). */
export function silkSlotsOfRoster(roster) {
  const slots = new Map();
  for (const frame of roster.frames) {
    if (frame.kind !== 'silk') continue;
    slots.set(smallRankToSlot(frame.rank), frame.key);
  }
  return slots;
}

/** The painted roster keys by atlas slot: small ranks walk the slot law, monarchs 0/2/4. */
export function rosterSlotsMap(roster) {
  const map = new Map();
  for (const frame of roster.frames) {
    if (frame.kind === 'monarch') map.set(superBlockRankToSlot(frame.rank), frame.key);
    else if (frame.kind === 'painted') map.set(smallRankToSlot(frame.rank), frame.key);
  }
  return map;
}

function writeLevelPngs(rgba) {
  mkdirSync(OUT_DIR, { recursive: true });
  const pngs = [];
  let level = rgba;
  let size = ATLAS_SIZE_PX;
  for (let l = 0; l < MIP_LEVELS; l += 1) {
    const png = encodePng(level, size, size);
    writeFileSync(join(OUT_DIR, `level-${l}.png`), png);
    pngs.push(png);
    if (l + 1 < MIP_LEVELS) {
      level = boxDownHalf(level, size, size);
      size = Math.max(1, Math.floor(size / 2));
    }
  }
  return pngs;
}

function updateDigest(section, value) {
  // The digest is always the §4.3 v2 shape — a pre-v2 file's fields are dropped here.
  const old = existsSync(DIGEST_PATH) ? readJson(DIGEST_PATH) : {};
  const digest = {
    artifact: old.artifact ?? null,
    composed: old.composed ?? null,
    law: ATLAS_LAW_VERSION,
    mock: old.mock ?? null,
  };
  digest[section] = value;
  writeFileSync(DIGEST_PATH, canonicalJson(digest), 'utf8');
  return digest;
}

async function compose(mock) {
  const roster = readJson(ROSTER_PATH);
  const silkBySlot = silkSlotsOfRoster(roster);
  let tiles;
  if (mock) {
    // §3.8: the CI mode — silk by the roster's keys, everything else the v1-style stand-ins.
    tiles = (slot) => {
      const silkKey = silkBySlot.get(slot);
      return silkKey === undefined ? mockTiles() : { kind: 'silk', key: silkKey };
    };
  } else {
    const lock = readJson(LOCK_PATH);
    const slots = rosterSlotsMap(roster);
    const cache = new Map();
    tiles = (slot, rect) => {
      const silkKey = silkBySlot.get(slot);
      if (silkKey !== undefined) return { kind: 'silk', key: silkKey };
      const key = slots.get(slot);
      if (key === undefined) return null; // spare / missing → the neutral law
      const entry = lock.entries[key];
      if (entry === undefined) {
        throw new Error(`import: slot ${slot} needs ${key} — no lock entry; run gallery:lock`);
      }
      let bytes = cache.get(key);
      if (bytes === undefined) {
        bytes = readFileSync(cacheImagePath(entry));
        cache.set(key, bytes);
      }
      const img = decodeImage(bytes);
      if (img.width !== entry.width || img.height !== entry.height) {
        throw new Error(
          `import: ${key} decoded ${img.width}×${img.height}, the lock pins ${entry.width}×${entry.height}`,
        );
      }
      const [cx, cy, cw, ch] = entry.crop;
      return {
        kind: 'image',
        rgba: resizeBoxTone({
          black: entry.tone.black,
          crop: { x: cx, y: cy, w: cw, h: ch },
          dh: rect.h - 2 * SLOT_INSET_PX,
          dw: rect.w - 2 * SLOT_INSET_PX,
          gain: entry.tone.gain,
          rgba: img.data,
          sw: img.width,
        }),
      };
    };
  }
  const atlas = paintAtlas({ tiles });
  const pngs = writeLevelPngs(atlas);
  if (mock) {
    updateDigest('mock', {
      pngBytes: pngs[0].length,
      pngSha256: sha256(pngs[0]),
      rgbaSha256: sha256(atlas),
    });
    console.log(`compose(mock): atlas ${ATLAS_SIZE_PX}² painted — mock digest pinned`);
  } else {
    updateDigest('composed', { rgbaSha256: sha256(atlas) });
    console.log(`compose: atlas ${ATLAS_SIZE_PX}² painted from the lock's sources`);
  }
  console.log(`compose: ${MIP_LEVELS} level PNG(s) → ${OUT_DIR}; next: pnpm gallery:encode`);
}

// ---------------------------------------------------------------------------
// encode — toktx 4.4.2, the §3.7 ladder, the lock/digest artifact rows
// ---------------------------------------------------------------------------
function probeToktx() {
  const probe = spawnSync('toktx', ['--version'], { encoding: 'utf8' });
  const out = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
  if (probe.error !== undefined) {
    throw new Error(
      `import: toktx not found — install KTX-Software ${TOKTX_VERSION} (toktx on PATH); CI never encodes, only the maintainer does`,
    );
  }
  if (!out.includes(TOKTX_VERSION)) {
    throw new Error(
      `import: the law pins toktx ${TOKTX_VERSION}, found "${(out.trim().split('\n')[0] ?? '').trim()}"`,
    );
  }
}

function runToktx(out, input, qlevel) {
  execFileSync('toktx', [...TOKTX_ARGS(qlevel), out, input], { stdio: 'inherit' });
}

function encode() {
  probeToktx();
  const base = join(OUT_DIR, 'level-0.png');
  if (!existsSync(base)) throw new Error(`import: ${base} missing — run gallery:compose first`);
  const tmp = join(OUT_DIR, 'atlas-encode.tmp.ktx2');
  let accepted = null;
  for (const qlevel of QLEVEL_LADDER) {
    runToktx(tmp, base, qlevel);
    const bytes = statSync(tmp).size;
    console.log(`encode: qlevel ${qlevel} → ${bytes} B (fence ${ATLAS_BYTES_MAX})`);
    if (bytes <= ATLAS_BYTES_MAX) {
      accepted = { bytes, qlevel };
      break;
    }
  }
  if (accepted === null) {
    throw new Error(
      `import: the atlas exceeds ${ATLAS_BYTES_MAX} B even at qlevel ${QLEVEL_LADDER[QLEVEL_LADDER.length - 1]} — stop and report (owner decision, no silent loosening)`,
    );
  }
  mkdirSync(dirname(KTX2_PATH), { recursive: true });
  rmSync(KTX2_PATH, { force: true });
  renameSync(tmp, KTX2_PATH);
  const artifact = {
    bytes: statSync(KTX2_PATH).size,
    height: ATLAS_SIZE_PX,
    levels: MIP_LEVELS,
    qlevel: accepted.qlevel,
    sha256: sha256(readFileSync(KTX2_PATH)),
    width: ATLAS_SIZE_PX,
  };
  updateDigest('artifact', { bytes: artifact.bytes, sha256: artifact.sha256 });
  if (existsSync(LOCK_PATH)) {
    const lock = readJson(LOCK_PATH);
    lock.artifact = artifact;
    lock.toolchain.flags = TOKTX_ARGS(accepted.qlevel).join(' ');
    writeFileSync(LOCK_PATH, canonicalJson(lock), 'utf8');
  }
  console.log(
    `encode: ${KTX2_PATH} ${artifact.bytes} B sha256 ${artifact.sha256} (qlevel ${artifact.qlevel}); next: pnpm asset:manifest military-gallery`,
  );
}

// ---------------------------------------------------------------------------
// verify — re-read by lock, re-compose, re-encode, byte-compare (§4.1)
// ---------------------------------------------------------------------------
async function verify() {
  if (!existsSync(LOCK_PATH))
    throw new Error('import: nothing to verify — atlas.lock.json does not exist yet');
  const lock = readJson(LOCK_PATH);
  if (lock.artifact === null)
    throw new Error('import: the lock has no artifact row — run gallery:encode');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (pkg.devDependencies['jpeg-js'] !== lock.toolchain['jpeg-js']) {
    throw new Error(
      `import: jpeg-js ${pkg.devDependencies['jpeg-js']} != the lock's ${lock.toolchain['jpeg-js']} — a decoder swap is a re-lock (§4.4)`,
    );
  }
  if (!existsSync(KTX2_PATH) || sha256(readFileSync(KTX2_PATH)) !== lock.artifact.sha256) {
    throw new Error('import: the committed KTX2 does not match the lock — re-run gallery:encode');
  }
  for (const [key, entry] of Object.entries(lock.entries)) {
    const path = cacheImagePath(entry);
    if (!existsSync(path)) throw new Error(`import: ${key} cache miss — re-run gallery:fetch`);
    if (sha256(readFileSync(path)) !== entry.sha256) {
      throw new Error(`import: ${key} source changed upstream — re-lock`);
    }
  }
  // Re-compose from the verified cache and re-encode at the locked qlevel; byte-compare.
  await compose(false);
  const tmp = join(OUT_DIR, 'verify.tmp.ktx2');
  runToktx(tmp, join(OUT_DIR, 'level-0.png'), lock.artifact.qlevel);
  if (!readFileSync(tmp).equals(readFileSync(KTX2_PATH))) {
    throw new Error(
      'import: re-encode differs byte-wise from the committed KTX2 — determinism broken',
    );
  }
  rmSync(tmp, { force: true });
  console.log('verify: cache, compose and encode all reproduce the committed artifact');
}

// ---------------------------------------------------------------------------
// attrib — the ATTRIBUTIONS.md block (§6.5): one line per lock entry
// ---------------------------------------------------------------------------
const WRAP = 100;

function attribLine(key, frame, entry) {
  const ge = `ГЭ-${key.slice(3)}`;
  const title = frame.title ?? frame.sitter ?? key;
  const year = frame.year === undefined ? '' : ` (${frame.year})`;
  return wrapSegments([
    '- 1812 canvases',
    key,
    `${frame.artist ?? 'unknown artist'}, «${title}»${year}, Hermitage ${ge}`,
    `Commons ${entry.commonsTitle}`,
    entry.license,
    `sha256 ${entry.sha256.slice(0, 8)}`,
  ]);
}

/** Greedy wrap over the ·-separated segments at WRAP columns; continuations indent 2 spaces. */
export function wrapSegments(segments) {
  const lines = [];
  let line = '';
  for (const segment of segments) {
    const next = line === '' ? segment : `${line} · ${segment}`;
    if (next.length <= WRAP) {
      line = next;
    } else {
      if (line !== '') lines.push(line);
      line = `  ${segment}`; // a markdown list continuation
    }
  }
  if (line !== '') lines.push(line);
  return lines.join('\n');
}

/** The §6.5 block: the header line, then one line per lock entry, keys sorted. */
export function attribBlock(lock, roster) {
  const entries = lock?.entries ?? {};
  const byKey = new Map((roster?.frames ?? []).map((f) => [f.key, f]));
  const lines = [
    'Military Gallery atlas v2 — source scans are not committed; see tools/gallery/atlas.lock.json',
  ];
  for (const key of Object.keys(entries).sort()) {
    lines.push(attribLine(key, byKey.get(key) ?? {}, entries[key]));
  }
  return lines.join('\n');
}

function attrib() {
  const lock = existsSync(LOCK_PATH) ? readJson(LOCK_PATH) : null;
  const roster = existsSync(ROSTER_PATH) ? readJson(ROSTER_PATH) : null;
  const block = attribBlock(lock, roster);
  let text = readFileSync(ATTRIBUTIONS_PATH, 'utf8');
  if (!text.includes(ATTRIB_BEGIN)) {
    text = `${text.trimEnd()}\n\n## 1812 canvases (atlas v2)\n\n${ATTRIB_BEGIN}\n${ATTRIB_END}\n`;
  }
  const begin = text.indexOf(ATTRIB_BEGIN);
  const end = text.indexOf(ATTRIB_END);
  text = `${text.slice(0, begin + ATTRIB_BEGIN.length)}\n${block}\n${text.slice(end)}`;
  writeFileSync(ATTRIBUTIONS_PATH, text, 'utf8');
  console.log(
    `attrib: ${ATTRIBUTIONS_PATH} block regenerated (${block.split('\n').length - 1} source line(s))`,
  );
}

// ---------------------------------------------------------------------------
// report — the §3.7 cap arithmetic, printed
// ---------------------------------------------------------------------------
function report() {
  const manifest = readJson(MANIFEST_PATH);
  const atlasRow = manifest.files.find((f) => f.path === 'tex/military-gallery-portraits.ktx2');
  const textureBytes = manifest.files
    .filter((f) => f.kind === 'ktx2')
    .reduce((t, f) => t + f.bytes, 0);
  const payloadBytes = manifest.files.reduce((t, f) => t + f.bytes, 0);
  console.log(`report: atlas ${atlasRow?.bytes ?? 0} B of ${ATLAS_BYTES_MAX} B fence`);
  console.log(
    `report: textures ${textureBytes} of ${manifest.budget.textureBytesMax} B; payload ${payloadBytes} of ${manifest.budget.payloadBytesMax} B`,
  );
  if (atlasRow === undefined || atlasRow.bytes > ATLAS_BYTES_MAX) {
    throw new Error('report: the atlas breaches its fence');
  }
  if (
    textureBytes > manifest.budget.textureBytesMax ||
    payloadBytes > manifest.budget.payloadBytesMax
  ) {
    throw new Error('report: budget breach — see the rows above');
  }
}

// ---------------------------------------------------------------------------
// dispatch — the pipeline runs only when invoked as main (the tests import the helpers)
// ---------------------------------------------------------------------------
function all() {
  transcribe();
  // fetch → lock need the network + the owner's reviewed transcription; `all` is the
  // maintainer's full pass (§4.1), never CI.
  return fetchAll()
    .then(lockAll)
    .then(() => compose(process.argv.includes('--mock')))
    .then(encode)
    .then(attrib)
    .then(report);
}

const STAGES = {
  all,
  attrib,
  compose: () => compose(process.argv.includes('--mock')),
  encode,
  fetch: fetchAll,
  lock: lockAll,
  report,
  transcribe,
  verify,
};

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const stage = process.argv[2];
  const run = STAGES[stage];
  if (run === undefined) {
    console.error(
      `import: unknown stage "${stage}" — one of ${Object.keys(STAGES).sort().join(', ')}`,
    );
    process.exit(1);
  }
  await run();
}
