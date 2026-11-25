@echo off
rem run-rgnext-bake.cmd — the stock-take bake chain (the 2026-11-24 round; artifact o5/bake)
rem + the layout-identity law's evidence capture (rastrelli-next round 4, design 6.2/6.3/7).
rem %1 = the worktree; %2 = the job's artifacts dir (defaults to %1\probes\rgnext-bake-artifacts);
rem %3 = the expected HEAD SHA (asserted before any step; empty = not asserted).
rem One cmd session: the env semantics (set) are guaranteed here regardless of the runner's
rem step shell. The box paths are the agent2 layout (toolchain.json pins; see the diag job).
rem FAIL-FAST: every chain step guards with || goto :red — one RED step ends the chain, the
rem capture still runs, and the session exits non-zero so the runner's tally sees the failure.
cd /d %~1
set "ART=%~2"
if "%ART%"=="" set "ART=%~1\probes\rgnext-bake-artifacts"
if not exist "%ART%" mkdir "%ART%"
set "STAGE=%~1\node_modules\.cache\zimny-asset-stage\rastrelli-gallery"
rem the shelf-debug dump dir: the builder writes it where RGF2_DUMP_DIR points (the box has
rem no Mac temp tree, so COVERED_DUMP_PATH's literal dir is not pasteable here; the dump
rem dir lives under the worktree and the per-stage copies below disambiguate the one file)
set "RGF2_DUMP_DIR=%~1\probes\rgf2-dumps"
if not exist "%RGF2_DUMP_DIR%" mkdir "%RGF2_DUMP_DIR%"
set ZIMNY_BLENDER=C:\Users\v.argunov\Desktop\agent2\blender-4.2.23-windows-x64\blender.exe
set PATH=%PATH%;C:\Users\v.argunov\Desktop\agent2\ktx-4.4.2\bin
set RGF2_DUMP_SHELF=1
git rev-parse HEAD > "%ART%\head.txt"
type "%ART%\head.txt"
if not "%~3"=="" (
  findstr /b /i /c:"%~3" "%ART%\head.txt" >nul || (
    echo HEAD is not %~3 & goto :red
  )
)
node tools\asset.mjs bpy rastrelli-gallery || goto :red
copy /Y "%RGF2_DUMP_DIR%\rgf2-shelf-debug.json" "%ART%\rgf2-shelf-debug.export.json" >nul
node tools\bake.mjs rastrelli-gallery day || goto :red
copy /Y "%RGF2_DUMP_DIR%\rgf2-shelf-debug.json" "%ART%\rgf2-shelf-debug.day.json" >nul
node tools\bake.mjs rastrelli-gallery dusk || goto :red
copy /Y "%RGF2_DUMP_DIR%\rgf2-shelf-debug.json" "%ART%\rgf2-shelf-debug.dusk.json" >nul
node tools\bake.mjs rastrelli-gallery night || goto :red
copy /Y "%RGF2_DUMP_DIR%\rgf2-shelf-debug.json" "%ART%\rgf2-shelf-debug.night.json" >nul
node tools\reencode.mjs rastrelli-gallery all || goto :red
node tools\asset.mjs gltf rastrelli-gallery || goto :red
node tools\asset.mjs manifest rastrelli-gallery || goto :red
pnpm build || goto :red
set "RG_F4_ROUND=rgnext-new" && node tools\probes\rg-f4-capture.mjs || goto :red
set RC=0
goto :capture
:red
set RC=1
:capture
rem the evidence capture, on success AND failure (bake8's gap): the stage listing into the
rem log, every stage json (summary, bake-layout.*, bake-summary.*) and png (the composed and
rem encoded plates) into the artifacts; EXR/float plates stay on the box and are listed.
dir "%STAGE%"
dir /s "%STAGE%" > "%ART%\stage-dir.txt"
copy /Y "%STAGE%\*.json" "%ART%\" >nul
copy /Y "%STAGE%\*.png" "%ART%\" >nul
exit /b %RC%
