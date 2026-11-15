# 4 — Sky dome rig — code relay (src/sky/rig.ts, §7 + DEC-009)
Opened 2026-10-16 (row date) · Landed n/r · Merged n/r (sha n/r) · slot n/r · brief: src/sky/rig.ts, §7 + DEC-009 · vault projects n/r · DEC-ids: none owned (cites DEC-009, owned by round 2)
## Ask
Code relay for the sky dome rig src/sky/rig.ts against §7 + DEC-009.
## Relay shape
- Orchestrator, before the brief: verified the prefix-injection facts in three 0.186.1.
- Code relay: complete-file draft → accepted near-wholesale.
- Orchestrator: wrote 11 gate tests, applied the import-sort fix; validate green.
## Verdicts
Kept from the draft:
- NDC fullscreen triangle with linear-interpolated vNdc (w constant).
- Basis-vector ray reconstruction from fov/aspect/zoom. This holds for symmetric frusta only: setViewOffset/filmOffset would need the mat4-inverse variant. updateCamera runs per frame the camera moves.
- x²·x²·x² for the 6th-power lobe.
- GLSL1 + <common> for the dithering rand.
- precision highp.
- No-op raycast.

Specialist flag: updateCamera must run after the pose is final each frame the camera rotates.
## Measured
- 2026-10-16 · validate green (measured): 66 tests, 129 015 gzip bytes of 350 000.
## Hunt / found / fixed
- Fixed: import sort.
- Found (specialist): updateCamera ordering constraint → recorded as a per-frame rule.
## Gates
- Passed: 11 gate tests (tail-chunk order/uniqueness, pars chunks absent, zero textures, basis/tan math, dispose); validate green.
- Deferred-not-waived: none recorded. Owed: none recorded.
## Mentioned elsewhere
- None in this batch's sources.
## Sources
- docs/briefs/ROUNDS.md · round 4 · physical line 25 (971 B) @ 438c3a3f232f5467a5ccaed8bbb9ea606b51236e. Constants-table unit label: "the facade slot design".
- Integrated: src/sky/rig.ts, tests/sky-rig.test.ts.
