@echo off
rem run-rgnext-bake.cmd — the stock-take bake chain (the 2026-11-24 round; artifact o5/bake).
rem One cmd session: the env semantics (set) are guaranteed here regardless of the runner's
rem step shell. The box paths are the agent2 layout (toolchain.json pins; see the diag job).
rem FAIL-FAST: every chain step guards with || exit /b 1 — one RED step ends the session
rem non-zero so the runner's tally sees the failure (the bake4 lesson: the env lost between
rem step shells and a killed bpy tree let the tail steps run on stale state).
cd /d %1
set ZIMNY_BLENDER=C:\Users\v.argunov\Desktop\agent2\blender-4.2.23-windows-x64\blender.exe
set PATH=%PATH%;C:\Users\v.argunov\Desktop\agent2\ktx-4.4.2\bin
node tools\asset.mjs bpy rastrelli-gallery || exit /b 1
node tools\bake.mjs rastrelli-gallery day || exit /b 1
node tools\bake.mjs rastrelli-gallery dusk || exit /b 1
node tools\bake.mjs rastrelli-gallery night || exit /b 1
node tools\reencode.mjs rastrelli-gallery all || exit /b 1
node tools\asset.mjs gltf rastrelli-gallery || exit /b 1
node tools\asset.mjs manifest rastrelli-gallery || exit /b 1
pnpm build || exit /b 1
set "RG_F4_ROUND=rgnext-new" && node tools\probes\rg-f4-capture.mjs || exit /b 1
