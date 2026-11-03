#!/usr/bin/env python3
"""Font subset worker — design-i18n-notes.md §2.1 (round r24t).

Subsets the pinned IBM Plex sources (node_modules/@ibm/plex-sans, @ibm/plex-serif —
the npm releases ARE the pinned source tags) into the three committed woff2 files
under public/fonts/, renames the derivatives to the project-local names (the OFL
carries the Reserved Font Name "Plex", so a modified version must not use it), and
prints the metric-override fallback block for src/fonts.css.

Charset and layout features are the §2.1 spec. tests/fonts.test.ts re-declares the
charset independently — keep the two lists in sync (a gate that imports the
generator's constant could not catch the generator regressing).

Run via: pnpm fonts  (tools/fonts/subset.mjs ensures the venv, then runs this file).
"""
from __future__ import annotations

import json
import os
import statistics
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

REPO = Path(__file__).resolve().parents[2]

# --- §2.1 charset (keep in sync with tests/fonts.test.ts) -------------------
BASIC_LATIN = list(range(0x0020, 0x007F))  # space .. tilde
LATIN1_PUNCT = list(range(0x00A0, 0x00C0)) + [0x00D7]  # Latin-1 punctuation/symbols + ×
CYRILLIC = list(range(0x0400, 0x0460))  # full basic Cyrillic incl. Ё U+0401 / ё U+0451
EXTRAS = [
    0x2009,  # thin space
    0x2013,  # en dash
    0x2014,  # em dash
    0x2019,  # right single quote (apostrophe)
    0x201C,  # left double quote
    0x201D,  # right double quote
    0x201E,  # double low-9 quote (nested RU quotes)
    0x2026,  # ellipsis
    0x202F,  # narrow no-break space
    0x2116,  # numero
    0x2190,  # leftwards arrow
    0x2191,  # upwards arrow (the touch rail's depth glyph, R21-ux)
    0x2192,  # rightwards arrow
    0x2193,  # downwards arrow (the touch rail's depth glyph, R21-ux)
    0x2212,  # minus
    0x2264,  # ≤
    0x2265,  # ≥
    0x03A3,  # Σ
]
CHARSET = BASIC_LATIN + LATIN1_PUNCT + CYRILLIC + EXTRAS

# §2.1 layout features. tnum/pnum/mkmk do not exist in the Plex sources (the GPOS
# tables carry kern+mark only; the default figures measure uniform 600/1000 em, i.e.
# tabular by default) — listing them is harmless; the subsetter keeps what exists.
LAYOUT_FEATURES = ['kern', 'liga', 'locl', 'tnum', 'pnum', 'ccmp', 'mark', 'mkmk']

JOBS = [
    {
        'src': 'node_modules/@ibm/plex-sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2',
        'out': 'public/fonts/plex-sans-400.woff2',
        'family': 'WP Sans',
        'style': 'Regular',
        'psname': 'WPSans-Regular',
    },
    {
        'src': 'node_modules/@ibm/plex-sans/fonts/complete/woff2/IBMPlexSans-Medium.woff2',
        'out': 'public/fonts/plex-sans-500.woff2',
        'family': 'WP Sans',
        'style': 'Medium',
        'psname': 'WPSans-Medium',
    },
    {
        'src': 'node_modules/@ibm/plex-serif/fonts/complete/woff2/IBMPlexSerif-Regular.woff2',
        'out': 'public/fonts/plex-serif-400.woff2',
        'family': 'WP Serif',
        'style': 'Regular',
        'psname': 'WPSerif-Regular',
    },
]

# name records that are NOTICES (copyright/trademark/license/credits) — the OFL
# attribution law keeps them verbatim; every other record must not name Plex.
KEEP_NAME_IDS = {0, 5, 7, 8, 9, 11, 12, 13, 14, 19}
REWRITE_NAME_IDS = {1, 3, 4, 6, 16, 17}

SYSTEM_FALLBACKS = [
    {
        'family': 'WP Sans Fallback',
        'local': 'Arial',
        'paths': ['/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf'],
    },
    {
        'family': 'WP Serif Fallback',
        'local': 'Georgia',
        'paths': ['/System/Library/Fonts/Supplemental/Georgia.ttf', '/Library/Fonts/Georgia.ttf'],
    },
]


def metrics_of(path: str | Path) -> dict:
    font = TTFont(path)
    upm = font['head'].unitsPerEm
    hhea = font['hhea']
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    advances = [hmtx[cmap[ord(c)]][0] for c in 'abcdefghijklmnopqrstuvwxyz' if ord(c) in cmap]
    digit_advances = [hmtx[cmap[ord(c)]][0] for c in '0123456789' if ord(c) in cmap]
    return {
        'upm': upm,
        'ascent': hhea.ascent,
        'descent': hhea.descent,
        'lineGap': hhea.lineGap,
        'avgLowerAdvancePerEm': statistics.mean(advances) / upm,
        'digitAdvancePerEm': (digit_advances[0] if digit_advances else None),
        'digitsUniform': len(set(digit_advances)) == 1 if digit_advances else None,
    }


def subset_job(job: dict, charset: list[int]) -> dict:
    src = REPO / job['src']
    out = REPO / job['out']
    if not src.exists():
        sys.exit(f'subset: source font missing: {src} (pnpm install first)')
    font = TTFont(str(src))
    opts = Options()
    opts.layout_features = list(LAYOUT_FEATURES)
    opts.name_IDs = '*'
    opts.name_languages = '*'
    opts.glyph_names = False
    # Keep the source's head timestamps (recalcTimestamp's default True would stamp
    # wall-clock time into every run). Verified guarantee: two runs produce sfnt-identical
    # fonts (every table byte-equal, directory order+lengths equal); the woff2 container
    # itself may vary by a few encoder bytes — the committed files are canonical.
    opts.recalc_timestamp = False
    subsetter = Subsetter(options=opts)
    subsetter.populate(unicodes=charset)
    subsetter.subset(font)

    full_name = f"{job['family']} {job['style']}"
    revision = font['head'].fontRevision
    replacements = {
        1: job['family'],
        3: f'{revision:.3f};WP;{job["psname"]}',
        4: full_name,
        6: job['psname'],
        16: job['family'],
        17: job['style'],
    }
    name = font['name']
    for record in name.names:
        if record.nameID in REWRITE_NAME_IDS:
            # 16/17 (typographic family/style) may be absent — setName adds only existing
            # slots, so records absent from this source are skipped here.
            if record.nameID in (16, 17) and name.getDebugName(record.nameID) is None:
                continue
            name.setName(replacements[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)
        # nameID 2 (subfamily) already carries the style verbatim; kept as is.
        elif record.nameID == 2:
            if record.toUnicode() != job['style']:
                name.setName(job['style'], 2, record.platformID, record.platEncID, record.langID)

    # Fail loud if any rewritten-adjacent record still names the reserved font.
    for record in name.names:
        if record.nameID in KEEP_NAME_IDS:
            continue
        if 'plex' in record.toUnicode().lower():
            sys.exit(f'subset: nameID {record.nameID} still names Plex — rename law violated')

    out.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = 'woff2'
    font.save(str(out))
    return {'job': job['out'], 'bytes': out.stat().st_size, 'metrics': metrics_of(out)}


def fallback_css(target: dict, fallback: dict) -> str:
    # Composition law (CSS Fonts 4): the browser scales everything by size-adjust and
    # the overrides replace the font's own metrics on the scaled em, so the effective
    # metric = override × size-adjust. Solve for the target's per-em metrics.
    size_adjust = target['avgLowerAdvancePerEm'] / fallback['avgLowerAdvancePerEm']
    ascent = (target['ascent'] / target['upm']) / size_adjust * 100
    descent = (-target['descent'] / target['upm']) / size_adjust * 100
    return (
        "@font-face {\n"
        f"  font-family: '{fallback['family']}';\n"
        f"  src: local('{fallback['local']}');\n"
        f"  size-adjust: {size_adjust * 100:.2f}%;\n"
        f"  ascent-override: {ascent:.2f}%;\n"
        f"  descent-override: {descent:.2f}%;\n"
        "  line-gap-override: 0%;\n"
        "}"
    )


def main() -> None:
    results = [subset_job(job, CHARSET) for job in JOBS]
    for result in results:
        metrics = result['metrics']
        print(f"{result['job']}: {result['bytes']} bytes · upm {metrics['upm']} · "
              f"hhea {metrics['ascent']}/{metrics['descent']}/{metrics['lineGap']} · "
              f"avg lc advance/em {metrics['avgLowerAdvancePerEm']:.4f} · "
              f"digits uniform: {metrics['digitsUniform']} "
              f"(advance/em {metrics['digitAdvancePerEm']:.3f})")

    sans = results[0]['metrics']
    serif = results[2]['metrics']
    print('\n=== generated metric-override fallbacks (src/fonts.css) ===')
    for fallback, target in ((SYSTEM_FALLBACKS[0], sans), (SYSTEM_FALLBACKS[1], serif)):
        path = next((p for p in fallback['paths'] if os.path.exists(p)), None)
        if path is None:
            sys.exit(f"subset: system font {fallback['local']} not found — metrics block required")
        fallback = {**fallback, **metrics_of(path)}
        print(fallback_css(target, fallback))


if __name__ == '__main__':
    main()
