@echo off
rem run-rgnext-bake.cmd — the stock-take bake chain (the 2026-11-24 round; artifact o5/bake).
rem One cmd session: the env semantics (set) are guaranteed here regardless of the runner's
rem step shell. The box paths are the agent2 layout (toolchain.json pins; see the diag job).
cd /d C:\Users\v.argunov\Desktop\agent2\hermitage-3d-rgnext2
set ZIMNY_BLENDER=C:\Users\v.argunov\Desktop\agent2\blender-4.2.23-windows-x64\blender.exe
set PATH=%PATH%;C:\Users\v.argunov\Desktop\agent2\ktx-4.4.2\bin
node tools\asset.mjs bpy rastrelli-gallery
node tools\bake.mjs rastrelli-gallery day
node tools\bake.mjs rastrelli-gallery dusk
node tools\bake.mjs rastrelli-gallery night
node tools\reencode.mjs rastrelli-gallery all
node tools\asset.mjs gltf rastrelli-gallery
node tools\asset.mjs manifest rastrelli-gallery
pnpm build
