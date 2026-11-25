# Zimny RG-F3 ("the courtyard's light and the order") - rastrelli-gallery kit
# (Blender 4.2 LTS, headless). Run by tools/asset.mjs `bpy rastrelli-gallery` (stem = room id
# verbatim). Deterministic: no randomness, every dimension is a constant below. World axes
# are glTF axes: +X east, +Z south (Palace Square side), -Z north, +Y up. Geometry is
# authored in world coordinates and converted to Blender space at vertex creation so
# export_yup gives them back.
# Writes:  <stage>/rastrelli-gallery.raw.glb
#          <stage>/tex/{stone_flags,plaster_pale,stucco_grey,stone_band}.png
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` stdout line.
# RG-F2 CONSTRUCTION LAW (the adopted verdict 2.1): the rg-e1 direct-assembly lineage, extended
# by direct polygon assembly only. (a) Every wall / vault / floor plane is ONE 2-D partition:
# the field polygons are cut around each applied element's footprint, no face is ever covered
# by another. (b) Every face is authored with its normal into the room air (the Builder sets
# the winding from the authored normal; FACING verifies it against the analytic air set).
# (c) Gates test only what the bake or the renderer consumes: FACING, COVERED, OVERLAP, CELL,
# BOUNDS, ROSTER, DETERMINISM. (d) The ELEMENT SCHEDULE is authored BEFORE geometry as
# formulas over the constants, published in summary.json, and a face count outside it fails
# the build. No booleans, no watertight law, no census, no pins.
# RG-F2 PALETTE (the value split): the whole order + vaults in white stucco over a warm
# limewash field with a dark stone base; texture NAMES kept, stone_band added (4 textures).
# RG-F2 EAST END: the x = 44 plane is one partition; 'stairlight' = the lunette half-disc
# (LUNETTE_SEGS; the stock-take R5 raises it 8 -> 24) and 'doorcard' = the 1.6 m x 2.40 m
# rectangle, both AT x = 44.0, both painted per
# published state at encode (tools/lm_compose.py + reencode); the bake world no longer enters.
# RG-F3 (the ruling's builder-header record): existing courtyard niche backs become declared
# panes without new faces. 'pane' and 'stairlight' ship non-emissive; bake.py supplies their
# separate bake-only terms.
# RG-AUDIT «THE JUNCTION LAW» (the accepted verdict reply-2 §2, the S1+S3 combined slice —
# batch A: the BUILDER work + the license row; the bake chain, probes and test re-pins are
# batch B): every rib meets its vault, and every cornice meets its vault, with a readable
# edge — a crease (occlusion pocket) + a springer where the rib foot lands on the ressaut —
# delivered as PROJECTED RELIEF: never-exported bake proxies (build_junction_proxies -> the
# BAKE_PROXIES collection, render-hidden by default so the committed bake chain reproduces
# byte-identically until batch B's S2A wiring flips visibility for its own passes), baked
# Selected-to-Active into the day+dusk lightmaps by tools/bpy/bake.py. Zero shipped geometry
# change: the exported node list is belt-asserted equal to the committed glb's at every build
# (fail-loud, belt_export_nodes), the tri count and the element schedule are untouched (the
# proxies live outside the roster), the albedo plates are untouched. THE UV2 RE-WEIGHT (the
# verdict's S3, folded into this slice by the S0 D1 finding, O1b-authorized): the atlas cell
# density doubles on the junction's binding seats — cornice, ressaut, the pilaster capital
# band, the arch (rib) and the vault.gallery bay field (the crease's own seat: D1 measured
# 20.05 texels/m there and 22.40 at the arch foot, so the authored 0.05 m cove spans only
# 1.0-1.4 texels, and 2 texels needs r >= 0.0998 > the RELIEF max_proj 0.08) — borrowed from
# the floor (flags/band) and the remaining vault fields (vault.passage, vault.reveal; the
# donors ride below the 14 px/m global floor by the accepted S3 borrowing — the LM_PX_PER_M_MIN
# gate itself is untouched). The atlas still packs at LM_RES 1536 (D4: 2048 stays rejected,
# +5,930 B over the texture cap). The bake-side constants (the per-target CAGE table, D3,
# max_ray_distance 0.35) live in tools/probes/rg-sightline.py and are consumed by batch B.
# THE STOCK-TAKE (the 2026-11-24 adopted round: the geometry artifact R1-R5 + the bake
# artifact W1-W5): the arc counts raise (G_ARC_SEGS/ARCH_SEGS/NICHE_HEAD_SEGS 8 -> 16,
# LUNETTE_SEGS 8 -> 24 - each an integer multiple, every existing node stays), the web's
# slot sits on M_PALE committed (the adopted V2 word - the o5 bench switch retires), and
# the atlas law ends the borrowed class: the applied families (the F5 dado/panels + the
# five airlock faces) pack their own cells (W2-W4), the short-axis texel floors land
# (W1/W3/W5), and the emitter row rides bake.py STAGE_SPILL_PARTS['rastrelli-gallery']
# ['doorcard'].

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# Round 17a: tools/bpy/bake.py exec's this builder with ZIMNY_BAKE=1 — build the scene,
# skip the export + summary (the bake owns stdout and never writes the glb).
BAKE = os.environ.get('ZIMNY_BAKE') == '1'
ROOM_ID = 'rastrelli-gallery'
TAU = math.tau
GEOM_EPS = 1e-6
TOUCH_EPS = 1e-4  # (RG-F2) the COVERED gate's historical boundary slack; themeasured facts (the Sol gate round): the bmesh float32 half-ulp at the room'slargest coordinate magnitude 87.5 m is 3.8e-6 m per axis and the 1e-5 vert weldstores same-site verts EXACTLY equal, so the practical no-touch separation gridis 1e-5..1.4e-5 m (~7-10x) - NOT 10x of a ~5e-6 noise; and 1e-4 is 25x below thesmallest genuine double-cover (~2.5e-3 m), not 30x/40x. This slack dies with thegate replacement below (the full coplanar law replaces the whole span).
FACE_AREA_MIN = 1e-7
WELD_DP = 5        # vert() welds by rounded key: 1e-5 m
FACING_PROBE_M = 0.002  # centroid + 0.002 * n must lie inside the air set (gate FACING)
HOLE = -1          # painted_regions sentinel: the footprint of an applied element, nothing emitted


def fail(message):
    raise RuntimeError(f'rastrelli-gallery: {message}')


# ---- textures (tileable 512^2 albedos, procedural, sRGB-encoded values) ---------------------
TEX_RES = 512
UV_TILE_M = 2.0     # one tile covers 2 m x 2 m ('uv' layer, box/cyl projection, world metres)
LM_RES = 1536   # (RG-F2) the owner's ratified CELL-stop resolution (2026-11-08):
#   1024 -> 1536 after the Sol-9 STOP row; the px/m law >= 14 UNCHANGED (the
#   metric is atlas-independent); the pack law untouched
LM_PAD_PX = 2.0
LM_STRIP_FRAC = 0.875   # the reserved sconce strip: v in [0.875, 1) (the chart's
#   top rows 0..first_row-1; first_row = round((1 - LM_STRIP_FRAC) * LM_RES)
#   = 192 at this res)
LM_PX_PER_M = 20        # shelf law: start here, step down by 1 until the pack fits ...
LM_PX_PER_M_MIN = 14    # ... but never below this (gate CELL); cut T3/T2 before touching it
LM_CELL_MIN_PX = 6
LM_CELL_MAX_PX = 480
FLAGS_PER_TILE = 2      # 1.0 m flags, 12 px/m on the 2 m tile - unchanged
FLAG_PX = TEX_RES // FLAGS_PER_TILE
MORTAR_PX = 8
STONE_RGB = (0.56, 0.54, 0.50)
MORTAR_RGB = (0.34, 0.32, 0.29)
PLASTER_PALE_RGB = (0.72, 0.67, 0.58)   # the limewash field (verdict 2.3)
STUCCO_GREY_RGB = (0.88, 0.86, 0.82)    # the whole order + vaults: white stucco
STONE_BAND_RGB = (0.42, 0.40, 0.37)     # skirting, plinths, floor border + arch bands, threshold
IRON_RGB = (0.07, 0.065, 0.06)
IRON_ROUGHNESS = 0.55
GLOW_TINT_RGB = (0.38, 0.29, 0.22)
TEXTURE_NAMES = ('stone_flags', 'plaster_pale', 'stucco_grey', 'stone_band')

# shell material slots (6 primitives - RG-F3 adds the flat 'pane' slot) / sconce slots (2)
# RG-F5 adds the 7th shell slot: 'stucco_shade' (the fillet-shade device, flat) - exported
# only (the bake chain's scene keeps the committed 6-slot shell by construction).
M_PALE, M_FLAGS, M_STUCCO, M_BAND, M_STAIR, M_PANE = 0, 1, 2, 3, 4, 5
M_SHADE = 6
M_SHADE_AIRLOCK = 7    # RG-F6: the airlock shade's flat slot (export chain only, like M_SHADE)
# The adopted stock-take word (DECISION-1, the short sitting 2026-11-24: «B looks a bit
# richer so i choose it» = the word «B»): the axis vault's web rows (vault.gallery) sit on
# M_PALE committed. The o5 bench switch (RG_BENCH_WEB_SLOT) that A/B-tested this slot is
# retired - the committed builder sets the web directly.
WEB_SLOT = M_PALE
S_IRON, S_GLOW = 0, 1

# ---- gallery proper (east of the arch passage), metres -------------------------------------
G_X0, G_X1 = 4.0, 44.0      # 40 m long; X 4.0..4.8 is the straight-soffit reveal into the passage
G_Z0, G_Z1 = 70.0, 76.0     # 6 m wide
G_ZC = 73.0
G_SPRING = 3.0
G_PEAK = 3.6
G_HALF = 3.0
G_REVEAL = 0.8
G_LEN_SEGS = 10
# (the stock-take geometry artifact R1) 8 -> 16: an integer multiple, so every existing node
# stays where it is (arch feet, bay seams, the mouth, spring and peak); the new nodes fall on
# the same curve between them. The web is a judged field under the adopted V2 word.
G_ARC_SEGS = 16
XS_G = [G_X0, G_X0 + G_REVEAL] + [
    G_X0 + G_REVEAL + (G_X1 - G_X0 - G_REVEAL) * k / G_LEN_SEGS for k in range(1, G_LEN_SEGS + 1)
]
XS_GI = XS_G[1:]

# ---- arch passage (part of this room's model) ----------------------------------------------
P_X0, P_X1 = -4.0, 4.0
P_Z0, P_Z1 = 63.5, 87.5     # Z 87.5 = facade arch plane (left OPEN)
P_SPRING = 3.0
P_PEAK = 5.0
P_HALF = 4.0
P_ARC_SEGS = 12
P_Z_NODES = (63.5, 66.75, 70.0, 73.0, 76.0, 79.8333, 83.6667, 87.5)
PASSAGE_VAULT = {'spanM': 8.0, 'springY': P_SPRING, 'peakY': P_PEAK, 'profile': 'semi-ellipse'}
GALLERY_VAULT = {'spanM': 6.0, 'springY': G_SPRING, 'peakY': G_PEAK, 'profile': 'semi-ellipse'}

# ---- the order (verdict 2.3) - profiles are (proud, y): proud = metres off the host plane
# into the air. Travel direction along a profile keeps the AIR on the right-hand side
# ((+proud) travel -> face normal -y; (+y) travel -> normal +proud; (-proud) travel -> +y).
CORNICE_PROFILE = (  # 8 points, (0, 2.70) -> y 3.00 and back to the wall (pinned here)
    (0.00, 2.70), (0.08, 2.70), (0.08, 2.78), (0.12, 2.78),
    (0.12, 2.86), (0.18, 2.86), (0.18, 3.00), (0.00, 3.00),
)
CORNICE_PROUD = max(d for d, _y in CORNICE_PROFILE)     # 0.18 — pinned by the builder's own
#   assert below (CORNICE_PROUD == SHAFT_PROUD + the capital's flare); the S0 belt caught the
#   stale 0.17 this comment used to carry (tools/probes/rg-sightline.py NOTE ON CORNICE_PROUD)
RESSAUT_W, RESSAUT_D = 0.56, 0.10      # the cornice breaks forward over every pilaster
END_CORNICE_BREAK = 0.90               # the end wall carries the cornice only this far from each corner
SKIRTING_PROFILE = ((0.09, 0.00), (0.09, 0.11), (0.00, 0.14))   # stone_band, y 0..0.14
SKIRTING_PROUD = 0.09
BASE_PROFILE = (  # 5 points, floor -> the shaft face (proud 0.10) at y 0.30 (pinned here)
    (0.16, 0.00), (0.16, 0.15), (0.13, 0.15), (0.13, 0.26), (0.10, 0.30),
)
PLINTH_Y = 0.15          # BASE_PROFILE below this y is stone_band (the plinth), above it stucco
PLINTH_HALF_W = 0.28     # plinth 0.56 wide; base 0.50; shaft 0.40; abacus 0.56
BASE_HALF_W = 0.25
SHAFT_HALF_W, SHAFT_PROUD = 0.20, 0.10
SHAFT_Y0, SHAFT_Y1 = 0.30, 2.45
CAPITAL_PROFILE = (  # relative to the SHAFT face (verdict 2.3, pinned there)
    (0.00, 2.45), (0.02, 2.49), (0.05, 2.53), (0.05, 2.58), (0.08, 2.62), (0.08, 2.70),
)
ABACUS_HALF_W = 0.28
# (the stock-take geometry artifact R2) ARCH_SEGS 8 -> 16, one count with R1: the arch
# soffit bands close against the vault's web polyline, so they share the raised count.
ARCH_WIDTH, ARCH_HALF, ARCH_SPRING, ARCH_CROWN, ARCH_SEGS = 0.44, 2.72, 3.00, 3.34, 16
FLOOR_BORDER = 0.30
FLOOR_ARCH_BAND = 0.44
NICHE_SURROUND_W, NICHE_SURROUND_D = 0.10, 0.03
SILL_LEDGE_L, SILL_LEDGE_D, SILL_Y0, SILL_Y1 = 2.00, 0.06, 0.84, 0.90
PASSAGE_IMPOST = ((0.00, 2.86), (0.06, 2.86), (0.06, 2.94), (0.12, 3.00))

# ---- pilasters: facade pitch, 11 per side + 2 corner returns on the east end wall ----------
BAY_PITCH = 3.387
PILASTERS_PER_SIDE = 11
PILASTER_X = tuple(G_X1 - BAY_PITCH * k for k in range(1, PILASTERS_PER_SIDE + 1))
CORNER_RETURN_Z = (70.45, 75.55)
PILASTER_COUNT = PILASTERS_PER_SIDE * 2 + len(CORNER_RETURN_Z)  # 24

# ---- sconces: 14 positions unchanged; SCONCE_SEGS 16 + smooth shade (verdict 2.3) ----------
SCONCE_X = tuple(PILASTER_X[k] for k in (0, 2, 4, 6, 8, 10))
SCONCE_MOUNT_D = 0.10
SCONCE_Y = 2.0
SCONCE_SEW_Z = (68.4, 77.6)
SCONCE_COUNT = len(SCONCE_X) * 2 + len(SCONCE_SEW_Z)   # 14
SCONCE_EMISSION = 6.0
SCONCE_GLOW_RGB = (1.0, 0.72, 0.42)
SCONCE_SEGS = 16
SCONCE_FACES = 5 + 5 + SCONCE_SEGS + 1        # back plate + arm (5 faces each) + shade + cap = 27
LM_SCONCE_GRID = math.ceil(math.sqrt(SCONCE_FACES))    # 6: the strip's equal-cell grid

# ---- wall niches, blind arches: 22 (11 per wall, one per bay) -------------------------------
NICHE_WIDTH = 1.80
NICHE_SILL = 0.90
NICHE_SPRING = 1.60
NICHE_HEAD_R = 0.90
NICHE_PEAK = NICHE_SPRING + NICHE_HEAD_R      # 2.50
NICHE_RECESS = 0.22
# (the stock-take geometry artifact R4) 8 -> 16: an arc against an emitter, the hardest
# edge in the room - the kink halves (22.5 deg -> 11.25 deg).
NICHE_HEAD_SEGS = 16
NICHE_CENTRES = tuple(G_X1 - BAY_PITCH * (k - 0.5) for k in range(1, PILASTERS_PER_SIDE + 1))
# (RG-F3) the NICHE_CENTRES order runs EAST -> WEST: k=1 x 42.3065 (the bay nearest the
# door) ... k=11 x 8.4365, one bay pitch 3.387 apart. The pane tags pane01..pane11 keep
# this k order (k=1 = the EAST-most bay).

# ---- RG-F5: the dado datum + the framed panel order (the applied families, both chains) ------
# THE APPLIED FAMILIES (the DEC-050 reciprocal, as amended by the 2026-11-24 stock-take
# bake artifact W2-W4 and the rastrelli-next round-4 layout-identity law): geometry BOTH
# chains build - build_wall_families runs in the export and the bake chain alike - so the
# families pack their own atlas cells (the shelf packer packs every family face onto its
# own rect; the old adopted-TEXCOORD_1 machinery - the host wall face's map + the declared
# airlock host rows - is deleted) AND carry their own baked light (DIFFUSE direct + indirect
# from the flat bake: real shading and contact shadows - the owner's word, 2026-11-25). The
# articulation still reads through the albedo split (M_STUCCO fronts over the M_PALE
# fields, the DEC-042 white-order step 0.88/0.86/0.82 vs 0.72/0.67/0.58 = a 22-41% albedo
# step) + the silhouette/parallax + the deterministic fillet-shade device: M_SHADE = the
# stucco value x FILLET_AO on the down-facing and lateral faces (a corner's AO is
# light-direction-independent; the lamps and the panes both sit above the rail, so the
# underside is the dark face at every stop). Form PROVISIONAL pending the axial-photo
# evidence pass (S4) - the re-tune surface is this constant table.
FILLET_AO = 0.62
M_STUCCO_SHADE_RGB = tuple(round(c * FILLET_AO, 2) for c in STUCCO_GREY_RGB)  # 0.55/0.53/0.51
DADO_RAIL_Y0, DADO_RAIL_Y1, DADO_RAIL_PROUD = SILL_Y0, SILL_Y1, SILL_LEDGE_D
DADO_RAIL_PROFILE = ((0.00, DADO_RAIL_Y0), (DADO_RAIL_PROUD, DADO_RAIL_Y0),
                     (DADO_RAIL_PROUD, DADO_RAIL_Y1), (0.00, DADO_RAIL_Y1))
RAIL_STOP = 0.005          # the connector's gap to a shaft side face (no coplanar contact)
DOOR_RAIL_STOP = 0.10      # the flank rails stop this far short of the door jamb bands
PANEL_BAND_W, PANEL_BAND_PROUD = 0.08, 0.03   # the surround band's language
PANEL_INSET = 0.12         # from skirting top, from the rail, from the surround's outer edge
PASSAGE_PANEL_MARGIN = 0.30
DADO_PANEL_Y0 = SKIRTING_PROFILE[-1][1] + PANEL_INSET          # 0.26
DADO_PANEL_Y1 = SILL_Y0 - PANEL_INSET                          # 0.72 (0.46 high, under each niche)
UPPER_PANEL_BOTTOM = SILL_Y1 + 0.18                            # 1.08
UPPER_PANEL_TOP_PASSAGE = PASSAGE_IMPOST[0][1] - 0.24           # 2.62
UPPER_PANEL_TOP_ENDWALL = CORNICE_PROFILE[0][1] - 0.24          # 2.46
PANEL_HALF_W_GALLERY = (NICHE_HEAD_R + NICHE_SURROUND_W) - PANEL_INSET   # 0.88 (frame 1.76 x 0.46)
F5_PASSAGE_BAY_N = 2.0       # the north wall's panel pitch over its 8 m
# the RG-F5 schedule constants (formulas over the plan constants - the count laws)
F5_PASSAGE_BAYS_W = len(P_Z_NODES) - 1                     # 7
F5_PASSAGE_BAYS_E = sum(1 for a, b in zip(P_Z_NODES, P_Z_NODES[1:])
                        if b <= G_Z0 or a >= G_Z1)         # 5 (the bays clear of the mouth)
F5_PASSAGE_BAYS_N = int((P_X1 - P_X0) / F5_PASSAGE_BAY_N)  # 4
F5_PASSAGE_SCONCE_BAYS = sum(1 for a, b in zip(P_Z_NODES, P_Z_NODES[1:])
                             if (b <= G_Z0 or a >= G_Z1)
                             and any(a < z < b for z in SCONCE_SEW_Z))   # 2 (dado-only bays)
F5_ENDWALL_FLANKS = 2
F5_PANEL_FACES = 12
F5_PANEL_DADO = (2 * len(NICHE_CENTRES) + F5_PASSAGE_BAYS_W + F5_PASSAGE_BAYS_E
                 + F5_PASSAGE_BAYS_N + F5_ENDWALL_FLANKS)   # 40
F5_PANEL_TALL = (F5_PASSAGE_BAYS_W + (F5_PASSAGE_BAYS_E - F5_PASSAGE_SCONCE_BAYS)
                 + F5_PASSAGE_BAYS_N + F5_ENDWALL_FLANKS)   # 16
F5_PANELS = F5_PANEL_DADO + F5_PANEL_TALL                   # 56
F5_RAIL_RUNS = 2 * (1 + 2 * len(NICHE_CENTRES)) + 4 + 4      # 54 (46 gallery + 4 passage + 4 end wall)
F5_RAIL_CAPS = 2                                            # the 2 jamb-band caps (the mouth
                                                            # ends are the mating mitres now)
# RG-F6: the airlock set's five applied elements (export chain only). The stock-take bake
# artifact W4: they leave the declared host onto their own atlas cells at the gallery
# floor's density (the floor they continue); the host declaration is deleted.
AIRLOCK_ELEMENTS = ('airlock.reveal.w', 'airlock.reveal.e', 'airlock.soffit',
                    'airlock.floor', 'airlock.threshold')
FAMILY_ELEMENTS = ('dado.panel', 'dado.rail') + AIRLOCK_ELEMENTS
F5_COLLIDER_ELEMENTS = ('pilaster', 'ressaut', 'cornice', 'skirting', 'impost', 'doorcase',
                        'niche')

# ---- east doorcase + stairlight lunette + door card, around the UNCHANGED opening ----------
PORTAL_X0, PORTAL_X1 = 43.2, 44.0
PORTAL_Z0, PORTAL_Z1 = 72.2, 73.8     # 1.6 m clear opening, centred on Z = 73
DOOR_JAMB_W = 0.25
DOOR_BAND_Y = (2.40, 2.70)
LUNETTE_R = 0.75                      # half-disc ON the x = 44 plane, centre (44, 2.70, 73): top 3.45
# (the stock-take geometry artifact R5) 8 -> 24: the lunette's arc is its OWN half-disc
# (end_halfdisc below) - it shares no node with the vault's end ring, so the R5 condition
# "the builder shows it owns its nodes" holds and the count goes to 24 (the walk's last stop
# g2 stands 3 m off it). The count serves every lunette site: the end-wall hole footprint,
# the stairlight disc, and the ARCHIVOLT_W band's ring + step ring (they close against the
# disc rim's polyline). NOTE: the constant used to sit unused while the sites hardcoded 8 -
# the sites now read it, so one count rules the whole lunette.
LUNETTE_SEGS = 24
ARCHIVOLT_W, ARCHIVOLT_D = 0.07, 0.04
STAIRLIGHT_PAINT = {  # declared record (the machine source is bake.py PANE_PAINT / lm_compose)
    'day': (0.55, 0.58, 0.62), 'dusk': (0.45, 0.32, 0.17), 'night': (0.60, 0.42, 0.22),
}
# RG-F5: the door jamb bands' outer edges (the flank rails' DOOR_RAIL_STOP reference;
# the skirting runs already stop at these literals in build_end_wall).
JAMB_BAND_Z = (PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z1 + DOOR_JAMB_W)   # 71.95 / 74.05
# ---- RG-F6 «the threshold» (DECISION-41, DEC-A as amended): the east airlock set -----------
# THE DISPLACED-TWIN LAW (as amended by the rastrelli-next round-4 layout-identity law): BOTH
# chains displace the 'doorcard' face to the box's far plane (x = G_X1 + AIRLOCK_DEPTH) and
# dress the 2.6 m-deep threshold box - the bake scene and the export scene are one scene.
# THE STOCK-TAKE AMENDMENT (the bake artifact W4): the box's five faces are no longer
# BORROWED light - they pack their own atlas cells at the gallery floor's density (the
# declared host rows and the adoption map are deleted) and bake their own, and the displaced
# card keeps its own cell exactly (same (t, y) rectangle, same projected extents, same packed
# index). The box's interior joins the analytic air set (air_contains) in both chains.
AIRLOCK_DEPTH = 2.6                    # the box's depth: x G_X1 .. G_X1 + AIRLOCK_DEPTH
AIRLOCK_THRESHOLD_W = 0.30             # the box-side threshold strip's width (x G_X1 ..+W)
AIRLOCK_AO = 0.85                      # the airlock shade's albedo step (the creative's
#   constant, explicitly not FILLET_AO 0.62)
M_STUCCO_SHADE_AIRLOCK_RGB = tuple(round(c * AIRLOCK_AO, 2) for c in STUCCO_GREY_RGB)
#   = (0.75, 0.73, 0.70): STUCCO_GREY x 0.85, the flat airlock shade slot's value
# (RG-F3) the declared panes' RAW paint record beside STAIRLIGHT_PAINT (the machine
# sources: tools/reencode.mjs PATCH_PAINTS - the encode paint; tools/bpy/bake.py
# STAGE_SPILL_PARTS - the spill rows). RAW triples are pane-specific: the door's x1.14
# calibration is NOT transferred (the stated largest value 0.740 stays under the
# bake-linear no-clip roof 0.8); night black = zero encoded pane light. Named *_RAW
# after bake.py's PANE_PAINT-style table so the exec namespace never shadows bake.py's
# own room-keyed PANE_PAINT record.
PANE_PAINT_RAW = {
    'day': (0.550, 0.650, 0.740), 'dusk': (0.360, 0.400, 0.460), 'night': (0.0, 0.0, 0.0),
}
CONTRACT_BOUNDS = ((-4.0, 0.0, 63.5), (47.0, 5.0, 87.5))   # DEC-41 DEC-B: max.x follows the
#   airlock box's far plane (46.6) with clearance; the never-read declared mirror of
#   rooms/rastrelli-gallery/contract.ts's bounds


# ---- INT: stage-dir handoff. asset.mjs invokes `... -P <py> -- --room <id> --out <stage>`;
# also accepted: `--stage <dir>`, a bare positional path, or ZIMNY_STAGE_DIR (canary parity).
def stage_dir():
    argv = sys.argv
    if '--' in argv:
        rest = argv[argv.index('--') + 1 :]
        for flag in ('--out', '--stage'):
            if flag in rest:
                return rest[rest.index(flag) + 1]
        if rest and not rest[0].startswith('-'):
            return rest[0]
    env = os.environ.get('ZIMNY_STAGE_DIR')
    if env:
        return env
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def to_w(co):
    return (co.x, co.z, -co.y)


# ---- 2-D kit (HEAD's helpers, verbatim in behaviour) ---------------------------------------
def rectangle(a, b, c, d):
    return [(a, c), (b, c), (b, d), (a, d)]


def signed_area(poly):
    total = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        total += x0 * y1 - x1 * y0
    return 0.5 * total


def ccw(poly):
    return list(poly) if signed_area(poly) >= 0.0 else list(reversed(poly))


def clean_polygon(poly):
    out = []
    for p in poly:
        if not out or abs(p[0] - out[-1][0]) > GEOM_EPS or abs(p[1] - out[-1][1]) > GEOM_EPS:
            out.append(p)
    while len(out) > 1 and abs(out[0][0] - out[-1][0]) <= GEOM_EPS and abs(out[0][1] - out[-1][1]) <= GEOM_EPS:
        out.pop()
    if len(out) < 3 or abs(signed_area(out)) <= FACE_AREA_MIN:
        return []
    return out


def halfplane(poly, a, b, inside=True):
    if not poly:
        return []

    def distance(p):
        value = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
        return value if inside else -value

    out = []
    previous = poly[-1]
    dp = distance(previous)
    for current in poly:
        dc = distance(current)
        if (dp >= 0.0) != (dc >= 0.0):
            t = dp / (dp - dc)
            out.append((previous[0] + t * (current[0] - previous[0]),
                        previous[1] + t * (current[1] - previous[1])))
        if dc >= 0.0:
            out.append(current)
        previous, dp = current, dc
    return clean_polygon(out)


def partition(poly, mask):
    """Convex mask: returns (pieces outside the mask, the piece inside)."""
    remaining = poly
    outside = []
    mask = ccw(mask)
    for a, b in zip(mask, mask[1:] + mask[:1]):
        piece = halfplane(remaining, a, b, False)
        if piece:
            outside.append(piece)
        remaining = halfplane(remaining, a, b)
        if not remaining:
            break
    return outside, remaining


def painted_regions(boundary, default, layers):
    """[(polygon, material)] - every applied (convex mask, material) cuts the field; HOLE
    regions are the applied elements' footprints and are dropped by the caller."""
    regions = [(ccw(boundary), default)]
    for mask, material_index in layers:
        next_regions = []
        for poly, old_material in regions:
            if old_material == material_index:
                next_regions.append((poly, old_material))
                continue
            outside, intersection = partition(poly, mask)
            next_regions.extend((p, old_material) for p in outside)
            if intersection:
                next_regions.append((intersection, material_index))
        regions = next_regions
    return regions


def arc(c, half, spring, peak, segs):
    """Semi-elliptical profile as (across, up) pairs, spring -> peak -> spring."""
    return [
        (c - half * math.cos(math.pi * i / segs), spring + (peak - spring) * math.sin(math.pi * i / segs))
        for i in range(segs + 1)
    ]


def arc_lengths(profile):
    result = [0.0]
    for a, b in zip(profile, profile[1:]):
        result.append(result[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return result


def interpolate(profile, coordinate):
    for a, b in zip(profile, profile[1:]):
        if a[0] - GEOM_EPS <= coordinate <= b[0] + GEOM_EPS:
            t = (coordinate - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    fail(f'coordinate {coordinate} outside profile')


def head_arc(x_c, spring, r, segs):
    """A blind arch / lunette head: left spring -> peak -> right spring, (across, up)."""
    return arc(x_c, r, spring, spring + r, segs)


G_ARC = arc(G_ZC, G_HALF, G_SPRING, G_PEAK, G_ARC_SEGS)         # (z, y)
P_ARC = arc(0.0, P_HALF, P_SPRING, P_PEAK, P_ARC_SEGS)          # (x, y)
G_ARC_M = arc_lengths(G_ARC)
P_ARC_M = arc_lengths(P_ARC)
ARCH_PROFILE = arc(G_ZC, ARCH_HALF, ARCH_SPRING, ARCH_CROWN, ARCH_SEGS)  # (z, y) soffit


def vault_y_at(z):
    """The gallery vault's FACETED height at z (the host the arches must clear)."""
    return interpolate(G_ARC, z)


ARCH_CLEARANCE_M = min(vault_y_at(z) - y for z, y in ARCH_PROFILE)   # 0.17693 — the S0 belt's
#   measured value (the stale 0.188 this comment used to carry rode an older profile read;
#   the min rides the faceted G_ARC interpolation and the builder only asserts it > 0)
if ARCH_CLEARANCE_M <= 0.0:
    fail(f'arch/vault clearance violated: {ARCH_CLEARANCE_M:.4f} m')


# ---- the analytic air set (gate FACING) ------------------------------------------------------
def gallery_air_y(z):
    u = (z - G_ZC) / G_HALF
    return G_SPRING + (G_PEAK - G_SPRING) * math.sqrt(max(0.0, 1.0 - u * u))


def passage_air_y(x):
    u = x / P_HALF
    return P_SPRING + (P_PEAK - P_SPRING) * math.sqrt(max(0.0, 1.0 - u * u))


NICHE_POCKETS = tuple(
    (x_c - NICHE_WIDTH / 2.0, x_c + NICHE_WIDTH / 2.0, NICHE_SILL, NICHE_PEAK,
     min(z_wall, z_wall + in_dir * NICHE_RECESS), max(z_wall, z_wall + in_dir * NICHE_RECESS))
    for z_wall, in_dir in ((G_Z0, -1.0), (G_Z1, 1.0))
    for x_c in NICHE_CENTRES
)


def air_contains(p):
    x, y, z = p
    if G_X0 < x < G_X1 and G_Z0 < z < G_Z1 and 0.0 < y < gallery_air_y(z):
        return True
    if P_X0 < x < P_X1 and P_Z0 < z < P_Z1 and 0.0 < y < passage_air_y(x):
        return True
    # RG-F6: the export chain's air set gains the airlock box's interior - the box is open
    # room air through the doorway (the displaced card, the reveals, the soffit, the floor
    # and the threshold face it) - in BOTH chains: the box is built in both (the
    # layout-identity law), so its interior is air in both.
    if G_X1 < x < G_X1 + AIRLOCK_DEPTH and PORTAL_Z0 < z < PORTAL_Z1 \
            and 0.0 < y < DOOR_BAND_Y[0]:
        return True
    for x0, x1, y0, y1, z0, z1 in NICHE_POCKETS:
        if x0 < x < x1 and y0 < y < y1 and z0 < z < z1:
            return True
    return False


# ---- host planes: an axis-aligned plane with a 2-D (t, y) frame; d = metres INTO the air ----
class Plane:
    """axis 'z': wall at z = offset, t = x.  axis 'x': wall at x = offset, t = z.
    axis 'y': the floor at y = offset, frame (t = x, 'y' slot = z), d = up."""

    def __init__(self, name, axis, offset, sign):
        self.name, self.axis, self.offset, self.sign = name, axis, offset, sign

    def world(self, t, y, d=0.0):
        o = self.offset + self.sign * d
        if self.axis == 'z':
            return (t, y, o)
        if self.axis == 'x':
            return (o, y, t)
        return (t, o, y)

    def normal(self, d_comp=1.0, y_comp=0.0):
        """World direction with d_comp along the plane's into-air axis and y_comp up (or,
        on the floor plane, y_comp along +z)."""
        if self.axis == 'z':
            return (0.0, y_comp, self.sign * d_comp)
        if self.axis == 'x':
            return (self.sign * d_comp, y_comp, 0.0)
        return (0.0, self.sign * d_comp, y_comp)


# ---- the Builder: shared verts, authored normals, the element registry --------------------
class Builder:
    """Every face is recorded as (face, kind, uvmap, element) in creation order (the roster =
    the lightmap shelf's deterministic face index). The winding is set from the AUTHORED
    normal (rule b); kind 'cyl' carries per-vertex (u, v) metres for the cylindrical law."""

    def __init__(self):
        self.bm = bmesh.new()
        self.cache = {}
        self.roster = []
        self.tags = {}
        self.counts = {}

    @staticmethod
    def _weld(p):
        """The weld key (WELD_DP decimals): vert()'s rounding, shared with face() so the
        ring's normal is computed on exactly the coordinates the verts carry."""
        return (round(p[0], WELD_DP), round(p[1], WELD_DP), round(p[2], WELD_DP))

    def vert(self, p):
        key = self._weld(p)
        v = self.cache.get(key)
        if v is None:
            v = self.bm.verts.new(to_b(key))
            self.cache[key] = v
        return v

    def face(self, pts, mat, element, normal, uid=None, tag=None, smooth=False):
        verts, maps, keys = [], [], []
        for j, p in enumerate(pts):
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
                keys.append(self._weld(p))
                maps.append(None if uid is None else uid[j])
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
            maps.pop()
            keys.pop()
        if len(set(verts)) < 3:
            return None
        # THE RING'S NORMAL from the welded keys, in double precision - not from the a.co
        # floats: bmesh stores them float32, and at the room's coordinate magnitudes the
        # cross terms quantise at the float32 ulp (~2.4e-4 at 3250 = z*x of the east wall),
        # far above the FACE_AREA_MIN floor - rings of true area up to ~4 mm^2 evaluated to
        # exactly 0.0 there and were dropped although the authored law keeps them (the
        # stock-take's arc raise: the new niche/lunette chord lines graze the neighbouring
        # mask corners and the partition grows six such pieces - wall.field scheduled 2892
        # emitted 2888, wall.e 181/179). The schedule's plan formulas enumerate exactly
        # these keys, so the drop gate (2*area <= FACE_AREA_MIN) and the winding read the
        # same arithmetic the schedule derives: the check agrees by construction.
        n = (0.0, 0.0, 0.0)
        for a, b in zip(keys, keys[1:] + keys[:1]):
            n = (n[0] + a[1] * b[2] - a[2] * b[1],
                 n[1] + a[2] * b[0] - a[0] * b[2],
                 n[2] + a[0] * b[1] - a[1] * b[0])
        if n[0] * n[0] + n[1] * n[1] + n[2] * n[2] <= FACE_AREA_MIN * FACE_AREA_MIN * 4.0:
            return None  # a degenerate ring is dropped, never emitted
        if n[0] * normal[0] + n[1] * normal[1] + n[2] * normal[2] < 0.0:
            verts.reverse()
            maps.reverse()
        try:
            f = self.bm.faces.new(verts)
        except ValueError as error:
            fail(f'duplicate construction face in {element}: {error}')
        f.material_index = mat
        f.smooth = smooth
        self.roster.append((f, 'cyl' if uid is not None else 'box',
                            maps if uid is not None else None, element))
        self.counts[element] = self.counts.get(element, 0) + 1
        if tag:
            self.tags[tag] = f
        return f

    def polygon(self, plane, poly, mat, element, d=0.0, tag=None):
        """One planar face on a host plane, normal = the plane's into-air axis."""
        return self.face([plane.world(t, y, d) for t, y in poly], mat, element, plane.normal(), tag=tag)

    def regions(self, plane, boundary, default_mat, layers, elements, d=0.0):
        """The plane's partition: field polygons cut around every mask; HOLE regions are the
        applied elements' footprints (nothing emitted there). elements: mat -> element name."""
        for poly, mat in painted_regions(boundary, default_mat, layers):
            if mat == HOLE:
                continue
            self.polygon(plane, poly, mat, elements[mat], d=d)

    def profile(self, plane, profile, t0, t1, mat_of, element_of):
        """A (proud, y) profile extruded along t0..t1 on a host plane; the air stays on the
        right-hand side of travel so each segment's normal is (dy, -dd) in (proud, y)."""
        for (d0, y0), (d1, y1) in zip(profile, profile[1:]):
            dd, dy = d1 - d0, y1 - y0
            if abs(dd) <= GEOM_EPS and abs(dy) <= GEOM_EPS:
                continue
            ym = (y0 + y1) / 2.0
            self.face(
                [plane.world(t0, y0, d0), plane.world(t1, y0, d0),
                 plane.world(t1, y1, d1), plane.world(t0, y1, d1)],
                mat_of(ym), element_of(ym), plane.normal(dy, -dd),
            )

    def profile_cap(self, plane, profile, t, outward_sign, mat, element):
        """The end face of an extruded profile at t: the polygon profile + the wall segment,
        normal along +-t (the plane's t axis)."""
        pts = [plane.world(t, y, d) for d, y in profile]
        if plane.axis == 'x':
            normal = (0.0, 0.0, outward_sign)
        else:
            normal = (outward_sign, 0.0, 0.0)
        return self.face(pts, mat, element, normal)

    def block(self, x0, x1, y0, y1, z0, z1, mat, element, skip=()):
        """An axis box with named sides; skip the sides that sit against a host (rule a:
        the host's field is cut around the footprint instead). Normals point OUT of the box."""
        sides = {
            '-x': (((x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)), (-1.0, 0.0, 0.0)),
            '+x': (((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)), (1.0, 0.0, 0.0)),
            '-y': (((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)), (0.0, -1.0, 0.0)),
            '+y': (((x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)), (0.0, 1.0, 0.0)),
            '-z': (((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)), (0.0, 0.0, -1.0)),
            '+z': (((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)), (0.0, 0.0, 1.0)),
        }
        for name, (pts, normal) in sides.items():
            if name not in skip:
                self.face(list(pts), mat, element, normal)

    def rows(self, rows, mat, element, normal_fn, uid_rows=None, smooth=False):
        """Quads between consecutive point rows; normal_fn(pts) -> the authored normal."""
        for si, (ra, rb) in enumerate(zip(rows, rows[1:])):
            for i in range(len(ra) - 1):
                pts = [ra[i], ra[i + 1], rb[i + 1], rb[i]]
                uid = None
                if uid_rows is not None:
                    ur, ub = uid_rows[si], uid_rows[si + 1]
                    uid = [ur[i], ur[i + 1], ub[i + 1], ub[i]]
                self.face(pts, mat, element, normal_fn(pts), uid=uid, smooth=smooth)


# ---- gates on authored data (rule c): FACING + COVERED -------------------------------------
def face_centroid_w(f):
    c = sum((v.co for v in f.verts), Vector()) / len(f.verts)
    return to_w(c)


def gate_facing(builder):
    offenders = {}
    for f, _kind, _uid, element in builder.roster:
        n = to_w(f.normal)
        cx, cy, cz = face_centroid_w(f)
        probe = (cx + FACING_PROBE_M * n[0], cy + FACING_PROBE_M * n[1], cz + FACING_PROBE_M * n[2])
        if not air_contains(probe):
            offenders.setdefault(element, []).append([round(v, 3) for v in probe])
    return offenders


# ---- the covered gate: the full coplanar-overlap law (the Sol amendment) -------------------
# Every face's plane is quantified from its own stored bmesh data - the non-unit normal is
# normalised, given a CANONICAL SIGN (the first nonzero component is forced positive), and
# rounded together with the plane offset d = n.v0 - and the faces group by that plane key.
# An explicit merge pass cures the one residual split mode: two true-equal planes whose
# float32 noise straddles a key quantum. Within a group the faces project into a stable
# orthonormal basis (u = the base axis least aligned with the normal, orthogonalised;
# v = n x u) and the footprints are compared DIMENSIONLESSLY (all distances divided by
# the group's projected diagonal). The band = COVERED_BAND_M / diag metres and is set
# from the measured storage reality, not from guesswork: bmesh stores float32 - the
# largest coordinate magnitude in this room is 87.5 (P_Z1), whose float32 half-ulp is
# 2^-17 / 2 = 3.8e-6 m per axis; the 1e-5 vert weld stores SAME-site vertices EXACTLY equal (one
# shared Builder cache), so legal-touch separations are exactly 0 or the 1e-5 grid
# (f32-compressed to 6e-6..1.4e-5 m) - the band is ~2-3x that largest legal separation
# and ~4700x below the smallest double-cover the law must fire on in this build (the
# demos' 0.14 m doorway overwrite). Facts frozen in rg-f2-amendments.md. The gate
# replaces the S1 axis-plane shortcut (_plane_key) wholesale: no coplanar family is
# exempt - the sloped vault/arch strips group by their own planes and pair-test like
# the axis-aligned ones.
COVERED_NORM_DP = 4     # the unit-normal key quantum (float32 normal noise ~1e-7: 3 orders clear)
COVERED_OFFSET_DP = 3   # the offset key quantum (offset noise ~2e-5 m at 87.5 m: 2 orders clear)
COVERED_NM = 1.6e-4     # the merge pass's per-component normal identity bound
COVERED_DM = 1.6e-3     # ... and the offset identity bound
COVERED_BAND_M = 3e-5   # the touch band in metres (the derivation above; frozen in the ledger)


def _canonical_plane(f):
    """The face's canonical plane: the unit normal with the first nonzero component
    forced positive, plus the rounded envelope (n, d). Returns (nx, ny, nz, d) or None."""
    n = f.normal
    length = n.length
    if length <= GEOM_EPS:
        return None
    nx, ny, nz = n.x / length, n.y / length, n.z / length
    for comp in (nx, ny, nz):
        if abs(comp) > 1e-6:
            if comp < 0.0:
                nx, ny, nz = -nx, -ny, -nz
            break
    v = f.verts[0].co
    d = nx * v.x + ny * v.y + nz * v.z
    return nx, ny, nz, d


def covered_groups(builder):
    """The canonical coplanar groups (the gate's whole test basis): exact (normal, offset)
    quantisation + the explicit merge pass, then per group the stable orthonormal basis
    and the DIMENSIONLESS projected footprints (divided by the group's diagonal).
    Returns [((nx, ny, nz), d, [(element, face), ...], [poly2d, ...], band), ...]."""
    raw = {}
    for f, _kind, _uid, element in builder.roster:
        plane = _canonical_plane(f)
        if plane is None:
            continue
        nx, ny, nz, d = plane
        key = (round(nx, COVERED_NORM_DP), round(ny, COVERED_NORM_DP),
               round(nz, COVERED_NORM_DP), round(d, COVERED_OFFSET_DP))
        raw.setdefault(key, []).append((element, f))
    keys = sorted(raw)
    true_plane = {k: _canonical_plane(raw[k][0][1]) for k in keys}
    parent = list(range(len(keys)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            nx_a, ny_a, nz_a, d_a = true_plane[keys[i]]
            nx_b, ny_b, nz_b, d_b = true_plane[keys[j]]
            if max(abs(nx_a - nx_b), abs(ny_a - ny_b), abs(nz_a - nz_b)) <= COVERED_NM \
                    and abs(d_a - d_b) <= COVERED_DM:
                ra, rb = find(i), find(j)
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
    merged = {}
    for index in range(len(keys)):
        merged.setdefault(find(index), []).extend(raw[keys[index]])
    groups = []
    for root in sorted(merged):
        members = merged[root]
        nx, ny, nz, d = true_plane[keys[root]]
        axis_values = (nx, ny, nz)
        e = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))[
            min(range(3), key=lambda c: abs(axis_values[c]))]
        dot = nx * e[0] + ny * e[1] + nz * e[2]
        u = (e[0] - nx * dot, e[1] - ny * dot, e[2] - nz * dot)
        u_len = math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2])
        u = (u[0] / u_len, u[1] / u_len, u[2] / u_len)
        v = (ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0])
        polys = []
        for _element, f in members:
            dps = []
            for vert in f.verts:
                co = vert.co
                dps.append((co.x * u[0] + co.y * u[1] + co.z * u[2],
                            co.x * v[0] + co.y * v[1] + co.z * v[2]))
            polys.append(dps)
        xs = [p[0] for poly in polys for p in poly]
        ys = [p[1] for poly in polys for p in poly]
        diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
        # all footprint distances become dimensionless: the metric band spans the tried
        # scale, the polys project into the same units.
        polys = [[(p[0] / diag, p[1] / diag) for p in poly] for poly in polys]
        groups.append(((nx, ny, nz), d, members, polys, COVERED_BAND_M / diag))
    return groups


def _inside_band(p, poly, band):
    """Strictly inside the projected polygon at the dimensionless touch band: any edge
    within band of p makes p boundary (outside). Legal adjacency shares EXACT verts
    (the one Builder weld cache), so the band only sweeps the residual storage noise."""
    x, y = p
    inside = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        ex, ey = x1 - x0, y1 - y0
        ee = ex * ex + ey * ey
        if ee <= 0.0:
            continue
        seg = ((x - x0) * ex + (y - y0) * ey) / ee
        seg = 0.0 if seg < 0.0 else (1.0 if seg > 1.0 else seg)
        if math.hypot(x - (x0 + seg * ex), y - (y0 + seg * ey)) <= band:
            return False
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * ex / ey:
            inside = not inside
    return inside


def _cross_band(p, q, r, s, band):
    """Proper crossing at the dimensionless touch band: both orientations are normalised
    to SIGNED DISTANCES (per edge's own length), so the band is length-true everywhere."""
    lpq = math.hypot(q[0] - p[0], q[1] - p[1]) or 1.0
    lrs = math.hypot(s[0] - r[0], s[1] - r[1]) or 1.0
    d1 = ((s[0] - r[0]) * (p[1] - r[1]) - (s[1] - r[1]) * (p[0] - r[0])) / lrs
    d2 = ((s[0] - r[0]) * (q[1] - r[1]) - (s[1] - r[1]) * (q[0] - r[0])) / lrs
    d3 = ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / lpq
    d4 = ((q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0])) / lpq
    return (d1 > band) != (d2 > band) and (d1 < -band) != (d2 < -band) \
        and (d3 > band) != (d4 > band) and (d3 < -band) != (d4 < -band)


def polys_overlap(a, b, band):
    """Dimensionless overlap over projected footprints: bbox cull, vertex AND edge-midpoint
    containment (both directions), proper crossings, then the exact shared-shape test -
    all inside the touch band. The midpoint probes close the pure-vertex blind ring: a
    piece wholly covered by a larger face whose own vertices all sit ON the cover's
    boundary (the doorway-field class the old axis gate passed)."""
    ax0, ax1 = min(p[0] for p in a), max(p[0] for p in a)
    ay0, ay1 = min(p[1] for p in a), max(p[1] for p in a)
    bx0, bx1 = min(p[0] for p in b), max(p[0] for p in b)
    by0, by1 = min(p[1] for p in b), max(p[1] for p in b)
    if ax1 <= bx0 + band or bx1 <= ax0 + band or ay1 <= by0 + band or by1 <= ay0 + band:
        return False
    def midpoints(poly):
        return [((p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0)
                for p, q in zip(poly, poly[1:] + poly[:1])]
    if any(_inside_band(p, b, band) for p in a + midpoints(a)):
        return True
    if any(_inside_band(p, a, band) for p in b + midpoints(b)):
        return True
    for i in range(len(a)):
        for j in range(len(b)):
            if _cross_band(a[i], a[(i + 1) % len(a)], b[j], b[(j + 1) % len(b)], band):
                return True
    same = {tuple(p) for p in a} == {tuple(p) for p in b}
    return same


def _plane_rep(n, d):
    for comp, axis in zip(n, ('x', 'y', 'z')):
        if abs(abs(comp) - 1.0) < 1e-3:
            return f'{axis}={d:.3f}'
    return f'{n[0]:.3f},{n[1]:.3f},{n[2]:.3f}|{d:.3f}'


def covered_face_pairs(builder):
    """Every overlapping coplanar pair with the concrete faces in hand - the gate's rows
    and the debug dump share this one enumeration (the full coplanar-overlap law)."""
    pairs = []
    for n, d, members, polys, band in covered_groups(builder):
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                if polys_overlap(polys[i], polys[j], band):
                    pairs.append((members[i][0], members[i][1], members[j][0],
                                  members[j][1], _plane_rep(n, d)))
    return pairs


def gate_covered(builder):
    """Zero pairs of coplanar faces (ANY plane orientation, canonical grouping; either
    normal sign folded by the canonical flip) with overlapping footprints - the §A12
    mechanism at the full law, tested on authored data."""
    return [[ea, eb, rep] for ea, _fa, eb, _fb, rep in covered_face_pairs(builder)]


# ---- procedural textures (HEAD's painter vocabulary; RG-F2 values) ---------------------------
def hash_unit(x, y, seed):
    value = (x * 374761393 + y * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    value ^= value >> 13
    value = (value * 1274126177) & 0xFFFFFFFF
    value ^= value >> 15
    value = (value * 0x846CA68B) & 0xFFFFFFFF
    value ^= value >> 16
    return value / 0xFFFFFFFF


def fine_grain(x, y):
    # Integer Fourier modes make a seamless 2 m tile. Wavelengths are
    # 2/sqrt(kx²+ky²) m: 1.5–3 cm, with no 0.1–0.3 m components.
    modes = ((73, 0), (0, 83), (64, 51), (43, -87), (97, 23), (31, 113))
    return sum(math.cos(TAU * (kx * x + ky * y) / TEX_RES + i * 0.73)
               for i, (kx, ky) in enumerate(modes)) / len(modes)


def plaster_pale_px(x, y):
    broad = (math.cos(TAU * 4 * x / TEX_RES) + math.cos(TAU * 4 * y / TEX_RES)
             + math.cos(TAU * (3 * x + 3 * y) / TEX_RES)) / 3
    delta = 0.025 * fine_grain(x, y) + 0.012 * broad
    return tuple(c + delta for c in PLASTER_PALE_RGB)


def stucco_grey_px(x, y):
    return tuple(c + 0.010 * fine_grain(x, y) for c in STUCCO_GREY_RGB)


def stone_band_px(x, y):
    delta = 0.02 * (2 * hash_unit(x, y, 0xB41D) - 1)
    return tuple(c + delta for c in STONE_BAND_RGB)


def stone_flags_px(x, y):
    fy = y / FLAG_PX
    row = int(fy)
    fx = x / FLAG_PX + (0.5 if row % 2 else 0.0)
    col = int(fx)
    u, v = fx - col, fy - row
    mortar = MORTAR_PX / FLAG_PX

    def phase(k, p):
        return TAU * k * p / TEX_RES

    grain = 0.03 * math.sin(phase(5, x)) * math.cos(phase(7, y))
    grain += 0.02 * math.sin(phase(3, x + y))
    if u < mortar or v < mortar:
        return tuple(c * (1.0 + grain) for c in MORTAR_RGB)
    ci, ri = col % 2, row % 2
    shade = 0.82 + 0.07 * math.sin(2.3 * ci + 1.7 * ri)
    shade += 0.05 * math.cos(0.9 * ci - 2.6 * ri)
    edge = min(u - mortar, v - mortar, 1 - u, 1 - v) / (1 - mortar)
    wear = 0.86 + 0.14 * min(1.0, edge * 8.0)
    delta = 0.05 * (2 * hash_unit(col % FLAGS_PER_TILE, row % FLAGS_PER_TILE, 0xF1A6) - 1)
    return tuple(c * shade * wear * (1 + grain) + delta for c in STONE_RGB)


PAINTERS = {
    'stone_flags': stone_flags_px, 'plaster_pale': plaster_pale_px,
    'stucco_grey': stucco_grey_px, 'stone_band': stone_band_px,
}


def write_texture(name, painter, tex_dir):
    image = bpy.data.images.new(name, TEX_RES, TEX_RES, alpha=False)
    pixels = [1.0] * (TEX_RES * TEX_RES * 4)
    for y in range(TEX_RES):
        for x in range(TEX_RES):
            rgb = painter(x, y)
            index = 4 * (y * TEX_RES + x)
            pixels[index:index + 3] = [max(0.0, min(1.0, c)) for c in rgb]
    image.pixels.foreach_set(pixels)
    path = os.path.join(tex_dir, f'{name}.png')
    image.filepath_raw = path
    image.file_format = 'PNG'
    image.save()
    return image, path


def material(name, image):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    return mat


def flat_material(name, rgb, roughness, emission=None):
    """A Principled with no texture: base colour + roughness (+ optional glow emission).
    The declared bake-painted slots ship NON-emissive (strength 0.0) and their separate
    bake-only terms are supplied by bake.py by material name: 'stairlight' via the
    STAGE_SPILL row (RG-F2, verdict 2.2), 'pane' via the parallel STAGE_SPILL_PARTS rows
    applied post-scan (RG-F3 - the builder-header record's flat-material sentence)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    return mat
# ---- THE ELEMENT SCHEDULE (authored before geometry) ----------------------------------------
# A schedule entry is a FORMULA over the constants, or the size of a pure 2-D plan (the same
# polygons the emitters consume). finish() fails on any element whose emitted count differs.
SKIRTING_TOP = SKIRTING_PROFILE[-1][1]     # 0.14
CORNICE_Y0 = CORNICE_PROFILE[0][1]         # 2.70
IMPOST_PROFILE = tuple(PASSAGE_IMPOST) + ((0.00, P_SPRING),)
RESSAUT_PROFILE = tuple((d + RESSAUT_D if d > GEOM_EPS else 0.0, y) for d, y in CORNICE_PROFILE)
RESSAUT_HALF_W = RESSAUT_W / 2.0
RESSAUT_PROUD = CORNICE_PROUD + RESSAUT_D  # 0.28 = the arch foot (G_ZC - ARCH_HALF - G_Z0)
ARCH_HALF_W = ARCH_WIDTH / 2.0
SILL_HALF_L = SILL_LEDGE_L / 2.0
NICHE_OUTER_R = NICHE_HEAD_R + NICHE_SURROUND_W    # 1.00
NICHE_HALF_W = NICHE_WIDTH / 2.0                    # 0.90
PILASTER_FACES = (1 + 4 + 2) + (3 + 2 + 2) + 3 + (5 + 10)    # 32
NICHE_FACES = 1 + (1 + 2 + NICHE_HEAD_SEGS) + (2 + NICHE_HEAD_SEGS) + (2 + NICHE_HEAD_SEGS) + 7
CORNICE_SEGS = len(CORNICE_PROFILE) - 1     # 7
LONG_WALL_SPANS = PILASTERS_PER_SIDE + 1    # 12
if abs(RESSAUT_PROUD - (G_ZC - ARCH_HALF - G_Z0)) > 1e-9:
    fail('the arch foot must land on the ressaut top edge (RESSAUT_PROUD == G_ZC - ARCH_HALF - G_Z0)')
if abs(CORNICE_PROUD - (SHAFT_PROUD + CAPITAL_PROFILE[-1][0])) > 1e-9:
    fail('the ressaut soffit must equal the abacus top (CORNICE_PROUD == abacus proud)')

# ---- «the junction law» constants (the accepted verdict reply-2 §2, batch A) ------------------
# The projected-relief form: quarter-round coves + chamfered springer blocks, never exported,
# baked Selected-to-Active into the day+dusk lightmaps (batch B). The seats derive from the
# kit's own constants (PILASTER_X, G_ARC, ARCH_HALF_W, RESSAUT_*); every number below is the
# verdict's own, and the flush facts are asserted fail-loud so the kit cannot drift away
# from the springer's seat.
JUNCTION = {
    'rib_cove_r': 0.05,      # the verdict's range 0.04-0.08 (D1: 2 texels needs r >= 0.0998,
                             # out of range -- so the UV2 re-weight above carries the fix)
    'springer_w': 0.44,      # == ARCH_WIDTH: the springer's core spans the rib's width
    'springer_h': 0.30,
    'springer_proj': 0.06,   # == the ressaut seat wing (RESSAUT_HALF_W - ARCH_HALF_W): the
                             # block fills its seat exactly, flush with the ressaut edge
                             # (the S0 D3 flush fact); it doubles as the chamfer leg
    'cornice_cove_r': 0.04,
    'impost_cove_r': 0.03,
    'max_proj': 0.08,        # the RELIEF roof: every cove's proud excursion asserts under it
}
if abs(JUNCTION['springer_w'] - ARCH_WIDTH) > 1e-9:
    fail('the springer core must equal the rib width (JUNCTION springer_w == ARCH_WIDTH)')
if abs(JUNCTION['springer_proj'] - (RESSAUT_HALF_W - ARCH_HALF_W)) > 1e-9:
    fail('the springer projection must fill the ressaut seat wing exactly '
         '(JUNCTION springer_proj == RESSAUT_HALF_W - ARCH_HALF_W)')
for _cove in ('rib_cove_r', 'cornice_cove_r', 'impost_cove_r'):
    if JUNCTION[_cove] > JUNCTION['max_proj'] + 1e-9:
        fail(f'JUNCTION[{_cove}] breaches the RELIEF roof max_proj {JUNCTION["max_proj"]}')


def author_schedule():
    plans = {
        'wall.field': sum(len(plan_long_wall(z)) for z in (G_Z0, G_Z1)),
        'wall.e': len(plan_end_wall()),
    }
    floor = plan_floor()
    plans['floor.flags'] = sum(1 for _p, mat in floor if mat == M_FLAGS)
    plans['floor.band'] = sum(1 for _p, mat in floor if mat == M_BAND)
    schedule = {
        **plans,
        'passage.field': 4,
        'tympanum': 2,
        'pilaster': PILASTER_COUNT * PILASTER_FACES,
        'ressaut': PILASTERS_PER_SIDE * 2 * (5 + 2 + 2) + len(CORNER_RETURN_Z) * (5 + 2 + 1),
        # (RG-F2) the corner L-cut splits the end-repair treads into front+flank (+4;
        # the corner runs' 2.86 and 3.00 treads), while the internally mitred end
        # runs' 0.18-risers die whole at the 45-seam (-2): net +2 against the draft.
        'cornice': 2 * (LONG_WALL_SPANS * CORNICE_SEGS + 1) + 2 * (2 * CORNICE_SEGS + 1) + 2,
        'skirting': 2 * (LONG_WALL_SPANS * 2) + 4 * 2 + 4 * 2,
        'niche': len(NICHE_CENTRES) * 2 * NICHE_FACES,
        # (RG-F2) the vault's bays are LONG_WALL_SPANS (12: the cuts are XS_GI[0], the
        # 22 arch edges and G_X1), not 11: the draft formula missed the west reveal bay.
        'vault.gallery': (PILASTERS_PER_SIDE + 1) * G_ARC_SEGS,
        'vault.reveal': 1,
        'vault.passage': (len(P_Z_NODES) - 1) * P_ARC_SEGS,
        'arch': PILASTERS_PER_SIDE * (ARCH_SEGS + 2),
        'impost': (len(IMPOST_PROFILE) - 1) * 4 + 2,
        'doorcase': DOORCASE_FACES,   # S3
        'stairlight': 1,
        'doorcard': 1,
    }
    # RG-F5: the applied families' rows - in BOTH chains (the layout-identity law: the bake
    # chain builds the families now, and check_schedule runs in both). The face counts are
    # untouched.
    schedule['dado.panel'] = F5_PANELS * F5_PANEL_FACES
    schedule['dado.rail'] = F5_RAIL_RUNS * 3 + F5_RAIL_CAPS
    # RG-F6: the airlock set's rows - the same law as the F5 rows (the counts match
    # build_airlock_set's faces exactly).
    for name in AIRLOCK_ELEMENTS:
        schedule[name] = 1
    return schedule


# ---- host planes ------------------------------------------------------------------------------
WALL_S = Plane('wall.s', 'z', G_Z0, 1.0)
WALL_N = Plane('wall.n', 'z', G_Z1, -1.0)
WALL_E = Plane('wall.e', 'x', G_X1, -1.0)
FLOOR = Plane('floor', 'y', 0.0, 1.0)
PWALL_W = Plane('passage.w', 'x', P_X0, 1.0)
PWALL_E = Plane('passage.e', 'x', P_X1, -1.0)
PWALL_N = Plane('passage.n', 'z', P_Z0, 1.0)
# RG-F6 THE DISPLACED TWIN: the export chain's 'doorcard' plane - the threshold box's far
# wall (proud 0 on it = x 46.6); the bake chain never uses it (the card stays on WALL_E).
AIRLOCK_BACK = Plane('airlock.back', 'x', G_X1 + AIRLOCK_DEPTH, -1.0)
UP = (0.0, 1.0, 0.0)


def t_dir(plane, sign):
    """World direction of the plane's t axis (x for z-walls, z for x-walls, x for the floor)."""
    return (0.0, 0.0, sign) if plane.axis == 'x' else (sign, 0.0, 0.0)


def _sh_keep(pts, keep):
    """(RG-F2 amendment helper) Sutherland-Hodgman against one half-plane; keep(p)
    returns the SIGNED line value (>= 0 kept), so axis-aligned and diagonal planes
    share the one clipper."""
    out = []
    n = len(pts)
    for i in range(n):
        p, q = pts[i], pts[(i + 1) % n]
        pv, qv = keep(p), keep(q)
        if pv >= 0.0:
            out.append(p)
        if (pv >= 0.0) != (qv >= 0.0):
            f = pv / (pv - qv)
            out.append((p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1])))
    return out


def _l_cut(poly, tc, dc):
    """(RG-F2 amendment helper) the kept ring minus {t >= tc} x {d >= dc}: the
    forward corner block's front and flank keep pieces."""
    front = clean_polygon(_sh_keep(poly, lambda p: tc - p[0]))
    band = _sh_keep(poly, lambda p: dc - p[1])
    flank = clean_polygon(_sh_keep(band, lambda p: p[0] - tc))
    return front, flank


def profile_run(b, plane, prof, t0, t1, mat_of, element_of, mitre0=0, mitre1=0, skip=(),
                corner_clip=None):
    """A (proud, y) profile extruded t0..t1. mitre = +1: internal corner (the face ends at
    t -/+ proud), -1: external corner (extends past the corner by proud); each mitred quad
    stays planar because its (proud, y) edge is a line. skip: segment indices not emitted
    (solid-on-solid contacts owned by another element)."""
    for i, ((d0, y0), (d1, y1)) in enumerate(zip(prof, prof[1:])):
        if i in skip:
            continue
        dd, dy = d1 - d0, y1 - y0
        if abs(dd) <= GEOM_EPS and abs(dy) <= GEOM_EPS:
            continue
        a0, a1 = t0 + mitre0 * d0, t0 + mitre0 * d1
        e0, e1 = t1 - mitre1 * d0, t1 - mitre1 * d1
        ym = (y0 + y1) / 2.0
        keeps = []
        riser = abs(dd) <= GEOM_EPS
        if riser:  # the face's (t, y) plane at constant proud
            d = d0
            pts = [(a0, y0), (e0, y0), (e1, y1), (a1, y1)]
            world = lambda t, y, _d=d: plane.world(t, y, _d)
            if mitre0 > 0.0:  # internal: keep t >= t0 + d (may out-live a short run)
                keeps.append(lambda p, _l=t0 + d: p[0] - _l)
            if mitre1 > 0.0:  # internal: keep t <= t1 - d
                keeps.append(lambda p, _l=t1 - d: _l - p[0])
            if corner_clip is not None and d >= corner_clip[1]:
                keeps.append(lambda p, _tc=corner_clip[0]: _tc - p[0])
        else:  # the segment's (t, d) plan at interpolated y
            pts = [(a0, d0), (e0, d0), (e1, d1), (a1, d1)]
            world = lambda t, d_, _y0=y0, _dd=(y1 - y0) / dd: \
                plane.world(t, _y0 + _dd * (d_ - d0), d_)
            if mitre0 > 0.0:  # keep t - d >= t0: the 45-degree internal seam
                keeps.append(lambda p, _t0=t0: p[0] - p[1] - _t0)
                keeps.append(lambda p, _t1=t1: _t1 - p[0])  # the span's far clamp
            if mitre1 > 0.0:  # keep t + d <= t1
                keeps.append(lambda p, _t1=t1: _t1 - p[0] - p[1])
                keeps.append(lambda p, _t0=t0: p[0] - _t0)  # the span's near clamp
        for keep in keeps:
            pts = _sh_keep(pts, keep)
        pieces = [pts]
        if not riser and corner_clip is not None and corner_clip[1] < max(d0, d1):
            front, flank = _l_cut(pts, corner_clip[0], corner_clip[1])
            pieces = [front, flank]
        for p in pieces:
            p = clean_polygon(p)
            if not p:
                continue
            b.face([world(t, second) for t, second in p],
                   mat_of(ym), element_of(ym), plane.normal(dy, -dd))


def profile_cap(b, plane, prof, t, sign, mat, element):
    b.face([plane.world(t, y, d) for d, y in prof], mat, element, t_dir(plane, sign))


def skirting_run(b, plane, t0, t1, mitre0=0, mitre1=0):
    profile_run(b, plane, SKIRTING_PROFILE, t0, t1, lambda _y: M_BAND, lambda _y: 'skirting', mitre0, mitre1)


def cornice_run(b, plane, t0, t1, mitre0=0, mitre1=0, cap0=False, cap1=False, corner_clip=None):
    profile_run(b, plane, CORNICE_PROFILE, t0, t1, lambda _y: M_STUCCO, lambda _y: 'cornice', mitre0, mitre1,
                corner_clip=corner_clip)
    if cap0:
        profile_cap(b, plane, CORNICE_PROFILE, t0, -1.0, M_STUCCO, 'cornice')
    if cap1:
        profile_cap(b, plane, CORNICE_PROFILE, t1, 1.0, M_STUCCO, 'cornice')


# ---- the long walls: one partition each -------------------------------------------------------
def pilaster_footprint_masks(t_c):
    """The 4 convex masks a pilaster leaves on its host plane (plinth, base, shaft, capital)."""
    cap = [(t_c + SHAFT_HALF_W + d, y) for d, y in CAPITAL_PROFILE]
    cap += [(t_c - SHAFT_HALF_W - d, y) for d, y in reversed(CAPITAL_PROFILE)]
    return [
        rectangle(t_c - PLINTH_HALF_W, t_c + PLINTH_HALF_W, 0.0, PLINTH_Y),
        rectangle(t_c - BASE_HALF_W, t_c + BASE_HALF_W, PLINTH_Y, SHAFT_Y0),
        rectangle(t_c - SHAFT_HALF_W, t_c + SHAFT_HALF_W, SHAFT_Y0, SHAFT_Y1),
        clean_polygon(cap),
    ]


def niche_polygon(x_c, half_w):
    """Rect + half-disc head: (x, y), convex; half_w 0.90 = the opening, 1.00 = the surround."""
    head = head_arc(x_c, NICHE_SPRING, half_w, NICHE_HEAD_SEGS)  # left spring -> peak -> right
    return [(x_c - half_w, NICHE_SILL), (x_c + half_w, NICHE_SILL)] + list(reversed(head))


def plan_long_wall(z_wall):
    field = rectangle(G_X0, G_X1, SKIRTING_TOP, CORNICE_Y0)
    layers = []
    for x_c in PILASTER_X:
        layers += [(mask, HOLE) for mask in pilaster_footprint_masks(x_c)]
    for x_c in NICHE_CENTRES:
        layers.append((niche_polygon(x_c, NICHE_OUTER_R), HOLE))
        layers.append((rectangle(x_c - SILL_HALF_L, x_c + SILL_HALF_L, SILL_Y0, SILL_Y1), HOLE))
    return [poly for poly, mat in painted_regions(field, M_PALE, layers) if mat != HOLE]


def build_long_wall(b, plane):
    for poly in plan_long_wall(plane.offset):
        b.polygon(plane, poly, M_PALE, 'wall.field')
    # skirting + cornice runs between the pilasters; west end = external corner with the
    # passage wall (skirting mitre -1, cornice flat cap), east end = internal corner (mitre +1)
    edges = [G_X0] + [t for x_c in sorted(PILASTER_X) for t in (x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W)] + [G_X1]
    for k in range(0, len(edges), 2):
        t0, t1 = edges[k], edges[k + 1]
        skirting_run(b, plane, t0, t1, -1 if k == 0 else 0, 1 if k + 2 == len(edges) else 0)
    edges = [G_X0] + [t for x_c in sorted(PILASTER_X) for t in (x_c - RESSAUT_HALF_W, x_c + RESSAUT_HALF_W)] + [G_X1]
    corner_clip = (G_X1 - RESSAUT_PROUD, CORNER_RETURN_Z[0] - RESSAUT_HALF_W - G_Z0) if plane.offset == G_Z0 \
        else (G_X1 - RESSAUT_PROUD, G_Z1 - CORNER_RETURN_Z[1] - RESSAUT_HALF_W)
    for k in range(0, len(edges), 2):
        t0, t1 = edges[k], edges[k + 1]
        cornice_run(b, plane, t0, t1, 0, 1 if k + 2 == len(edges) else 0, cap0=(k == 0),
                    corner_clip=corner_clip if k + 2 == len(edges) else None)
    for x_c in PILASTER_X:
        build_pilaster(b, plane, x_c)
        build_ressaut(b, plane, x_c, arch=True)
    # (RG-F3) the pane tags' ONLY call site: the z=70 courtyard wall (WALL_S, owner-confirmed;
    # the wall at z=70 whose backs the census enumerated) passes pane01..pane11 in k order
    # (k=1 the EAST-most bay x 42.3065 -> k=11 the WEST-most x 8.4365); the z=76 wall's
    # backs stay blind (no tag -> M_PALE, untagged).
    for k, x_c in enumerate(NICHE_CENTRES, 1):
        build_niche(b, plane, x_c, pane_tag=f'pane{k:02d}' if plane is WALL_S else None)


# ---- the order ---------------------------------------------------------------------------------
def build_pilaster(b, plane, t_c):
    el = 'pilaster'
    P = plane.world
    plinth_d = BASE_PROFILE[0][0]   # 0.16
    base_d = BASE_PROFILE[2][0]     # 0.13
    # plinth: front, sides cut around the skirting profile (2 pieces each), top side strips
    b.polygon(plane, rectangle(t_c - PLINTH_HALF_W, t_c + PLINTH_HALF_W, 0.0, PLINTH_Y), M_BAND, el, d=plinth_d)
    for s in (-1.0, 1.0):
        t = t_c + s * PLINTH_HALF_W
        n = t_dir(plane, s)
        b.face([P(t, 0.0, SKIRTING_PROUD), P(t, 0.0, plinth_d), P(t, PLINTH_Y, plinth_d), P(t, PLINTH_Y, SKIRTING_PROUD)],
               M_BAND, el, n)
        b.face([P(t, SKIRTING_TOP, 0.0), P(t, SKIRTING_PROFILE[1][1], SKIRTING_PROUD), P(t, PLINTH_Y, SKIRTING_PROUD), P(t, PLINTH_Y, 0.0)],
               M_BAND, el, n)
        ta, tb = sorted((t_c + s * BASE_HALF_W, t_c + s * PLINTH_HALF_W))
        b.face([P(ta, PLINTH_Y, 0.0), P(tb, PLINTH_Y, 0.0), P(tb, PLINTH_Y, plinth_d), P(ta, PLINTH_Y, plinth_d)],
               M_BAND, el, UP)
    # base: ledge (stone) + riser + slope (stucco), sides, top strips beside the shaft
    profile_run(b, plane, BASE_PROFILE[1:], t_c - BASE_HALF_W, t_c + BASE_HALF_W,
                lambda y: M_BAND if y <= PLINTH_Y + 1e-9 else M_STUCCO, lambda _y: el)
    for s in (-1.0, 1.0):
        t = t_c + s * BASE_HALF_W
        b.face([P(t, PLINTH_Y, 0.0), P(t, PLINTH_Y, base_d), P(t, BASE_PROFILE[3][1], base_d),
                P(t, SHAFT_Y0, SHAFT_PROUD), P(t, SHAFT_Y0, 0.0)], M_STUCCO, el, t_dir(plane, s))
        ta, tb = sorted((t_c + s * SHAFT_HALF_W, t_c + s * BASE_HALF_W))
        b.face([P(ta, SHAFT_Y0, 0.0), P(tb, SHAFT_Y0, 0.0), P(tb, SHAFT_Y0, SHAFT_PROUD), P(ta, SHAFT_Y0, SHAFT_PROUD)],
               M_STUCCO, el, UP)
    # shaft
    b.polygon(plane, rectangle(t_c - SHAFT_HALF_W, t_c + SHAFT_HALF_W, SHAFT_Y0, SHAFT_Y1), M_STUCCO, el, d=SHAFT_PROUD)
    for s in (-1.0, 1.0):
        t = t_c + s * SHAFT_HALF_W
        b.face([P(t, SHAFT_Y0, 0.0), P(t, SHAFT_Y0, SHAFT_PROUD), P(t, SHAFT_Y1, SHAFT_PROUD), P(t, SHAFT_Y1, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    # capital: the (proud, y) profile flares the half-width by its proud (0.20 -> 0.28)
    for (d0, y0), (d1, y1) in zip(CAPITAL_PROFILE, CAPITAL_PROFILE[1:]):
        D0, D1 = SHAFT_PROUD + d0, SHAFT_PROUD + d1
        w0, w1 = SHAFT_HALF_W + d0, SHAFT_HALF_W + d1
        dd, dy, dw = d1 - d0, y1 - y0, w1 - w0
        b.face([P(t_c - w0, y0, D0), P(t_c + w0, y0, D0), P(t_c + w1, y1, D1), P(t_c - w1, y1, D1)],
               M_STUCCO, el, plane.normal(dy, -dd))
        for s in (-1.0, 1.0):
            tn = t_dir(plane, s)
            n = (tn[0] * dy, -dw, tn[2] * dy)
            b.face([P(t_c + s * w0, y0, 0.0), P(t_c + s * w0, y0, D0), P(t_c + s * w1, y1, D1), P(t_c + s * w1, y1, 0.0)],
                   M_STUCCO, el, n)


def build_ressaut(b, plane, t_c, arch):
    """The cornice's forward break over a pilaster. Segment 0 (soffit) is the abacus top:
    solid-on-solid, not emitted. The top carries the arch foot (arch=True: two strips beside
    it) or stays whole (end wall)."""
    el = 'ressaut'
    P = plane.world
    t0, t1 = t_c - RESSAUT_HALF_W, t_c + RESSAUT_HALF_W
    profile_run(b, plane, RESSAUT_PROFILE, t0, t1, lambda _y: M_STUCCO, lambda _y: el,
                skip=(0, len(RESSAUT_PROFILE) - 2))
    cap = [(RESSAUT_PROFILE[1][0] - RESSAUT_D, RESSAUT_PROFILE[1][1])]   # (0.08, 2.70)
    cap += list(RESSAUT_PROFILE[1:-1])   # the ressaut's outer steps up to (0.28, 3.00)
    cap += [(d, y) for d, y in reversed(CORNICE_PROFILE[2:-1])]  # back down the plain steps
    for s in (-1.0, 1.0):
        t = t_c + s * RESSAUT_HALF_W
        b.face([P(t, y, d) for d, y in cap], M_STUCCO, el, t_dir(plane, s))
    top_y = CORNICE_PROFILE[-1][1]
    if arch:
        for s in (-1.0, 1.0):
            ta, tb = sorted((t_c + s * ARCH_HALF_W, t_c + s * RESSAUT_HALF_W))
            b.face([P(ta, top_y, 0.0), P(tb, top_y, 0.0), P(tb, top_y, RESSAUT_PROUD), P(ta, top_y, RESSAUT_PROUD)],
                   M_STUCCO, el, UP)
    else:
        b.face([P(t0, top_y, 0.0), P(t1, top_y, 0.0), P(t1, top_y, RESSAUT_PROUD), P(t0, top_y, RESSAUT_PROUD)],
               M_STUCCO, el, UP)


# ---- niches: pocket + surround band + sill ledge ---------------------------------------------
def build_niche(b, plane, x_c, pane_tag=None):
    """One bay niche. RG-F3: pane_tag (assigned ONLY by the z=70 courtyard wall caller)
    turns the back face into a declared pane - M_PANE + the zero-padded single-face tag;
    the z=76 wall's backs keep M_PALE blind. Geometry, order and the 'niche' element
    label are unchanged either way (the schedule equality holds)."""
    el = 'niche'
    P = plane.world
    back_d = -NICHE_RECESS
    band_d = NICHE_SURROUND_D
    inner = head_arc(x_c, NICHE_SPRING, NICHE_HALF_W, NICHE_HEAD_SEGS)
    outer = head_arc(x_c, NICHE_SPRING, NICHE_OUTER_R, NICHE_HEAD_SEGS)
    # (RG-F3) the declared pane's back face: M_PANE with the caller's zero-padded tag on
    # the z=70 wall; blind M_PALE without a tag (the z=76 backs stay untagged).
    b.polygon(plane, niche_polygon(x_c, NICHE_HALF_W), M_PANE if pane_tag else M_PALE,
              el, d=back_d, tag=pane_tag)
    # reveals: sill (+y), jambs (toward the axis), head (toward the arc centre)
    b.face([P(x_c - NICHE_HALF_W, NICHE_SILL, back_d), P(x_c + NICHE_HALF_W, NICHE_SILL, back_d),
            P(x_c + NICHE_HALF_W, NICHE_SILL, 0.0), P(x_c - NICHE_HALF_W, NICHE_SILL, 0.0)],
           M_PALE, el, UP)
    for s in (-1.0, 1.0):
        t = x_c + s * NICHE_HALF_W
        b.face([P(t, NICHE_SILL, back_d), P(t, NICHE_SPRING, back_d), P(t, NICHE_SPRING, band_d), P(t, NICHE_SILL, band_d)],
               M_PALE, el, t_dir(plane, -s))
    for (xa, ya), (xb, yb) in zip(inner, inner[1:]):
        tn = t_dir(plane, 1.0)
        mx, my = (xa + xb) / 2.0, (ya + yb) / 2.0
        n = (tn[0] * (x_c - mx), NICHE_SPRING - my, tn[2] * (x_c - mx))
        b.face([P(xa, ya, back_d), P(xb, yb, back_d), P(xb, yb, band_d), P(xa, ya, band_d)],
               M_PALE, el, n)
    # surround band: front faces at +0.03 and outer side faces
    for s in (-1.0, 1.0):
        ta, tb = sorted((x_c + s * NICHE_HALF_W, x_c + s * NICHE_OUTER_R))
        b.polygon(plane, rectangle(ta, tb, SILL_Y1, NICHE_SPRING), M_STUCCO, el, d=band_d)
        t = x_c + s * NICHE_OUTER_R
        b.face([P(t, SILL_Y1, 0.0), P(t, SILL_Y1, band_d), P(t, NICHE_SPRING, band_d), P(t, NICHE_SPRING, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    for i in range(NICHE_HEAD_SEGS):
        (ia, ib), (oa, ob) = (inner[i], inner[i + 1]), (outer[i], outer[i + 1])
        b.face([P(*ia, band_d), P(*ib, band_d), P(*ob, band_d), P(*oa, band_d)],
               M_STUCCO, el, plane.normal())
        tn = t_dir(plane, 1.0)
        mx, my = (oa[0] + ob[0]) / 2.0, (oa[1] + ob[1]) / 2.0
        n = (tn[0] * (mx - x_c), my - NICHE_SPRING, tn[2] * (mx - x_c))
        b.face([P(*oa, 0.0), P(*ob, 0.0), P(*ob, band_d), P(*oa, band_d)], M_STUCCO, el, n)
    # sill ledge: front, bottom, ends, top in 3 pieces around the jamb bands' feet
    L0, L1 = x_c - SILL_HALF_L, x_c + SILL_HALF_L
    b.polygon(plane, rectangle(L0, L1, SILL_Y0, SILL_Y1), M_STUCCO, el, d=SILL_LEDGE_D)
    b.face([P(L0, SILL_Y0, 0.0), P(L1, SILL_Y0, 0.0), P(L1, SILL_Y0, SILL_LEDGE_D), P(L0, SILL_Y0, SILL_LEDGE_D)],
           M_STUCCO, el, (0.0, -1.0, 0.0))
    for s, t in ((-1.0, L0), (1.0, L1)):
        b.face([P(t, SILL_Y0, 0.0), P(t, SILL_Y0, SILL_LEDGE_D), P(t, SILL_Y1, SILL_LEDGE_D), P(t, SILL_Y1, 0.0)],
               M_STUCCO, el, t_dir(plane, s))
    b.face([P(x_c - NICHE_HALF_W, SILL_Y1, 0.0), P(x_c + NICHE_HALF_W, SILL_Y1, 0.0),
            P(x_c + NICHE_HALF_W, SILL_Y1, SILL_LEDGE_D), P(x_c - NICHE_HALF_W, SILL_Y1, SILL_LEDGE_D)],
           M_STUCCO, el, UP)
    for s in (-1.0, 1.0):
        ta, tb = sorted((x_c + s * NICHE_HALF_W, x_c + s * NICHE_OUTER_R))
        b.face([P(ta, SILL_Y1, band_d), P(tb, SILL_Y1, band_d), P(tb, SILL_Y1, SILL_LEDGE_D), P(ta, SILL_Y1, SILL_LEDGE_D)],
               M_STUCCO, el, UP)


# ---- the floor: one y = 0 partition over the T-shaped boundary --------------------------------
def plan_floor():
    boundary = [(P_X0, P_Z0), (P_X1, P_Z0), (P_X1, G_Z0), (G_X1, G_Z0), (G_X1, G_Z1),
                (P_X1, G_Z1), (P_X1, P_Z1), (P_X0, P_Z1)]
    s, k = SKIRTING_PROUD, FLOOR_BORDER
    bands = [
        rectangle(G_X0, G_X1, G_Z0, G_Z0 + k), rectangle(G_X0, G_X1, G_Z1 - k, G_Z1),
        rectangle(G_X1 - k, G_X1, G_Z0, G_Z1),
        rectangle(P_X0, P_X0 + k, P_Z0, P_Z1), rectangle(P_X0, P_X1, P_Z0, P_Z0 + k),
        rectangle(P_X1 - k, P_X1, P_Z0, G_Z0 + k), rectangle(P_X1 - k, P_X1, G_Z1 - k, P_Z1),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z0, PORTAL_Z1),   # the threshold
    ] + [rectangle(x_c - ARCH_HALF_W, x_c + ARCH_HALF_W, G_Z0, G_Z1) for x_c in PILASTER_X]
    holes = [
        rectangle(G_X0, G_X1, G_Z0, G_Z0 + s), rectangle(G_X0, G_X1, G_Z1 - s, G_Z1),
        rectangle(G_X1 - s, G_X1, G_Z0, G_Z1),
        rectangle(P_X0, P_X0 + s, P_Z0, P_Z1), rectangle(P_X0, P_X1, P_Z0, P_Z0 + s),
        rectangle(P_X1 - s, P_X1, P_Z0, G_Z0 + s), rectangle(P_X1 - s, P_X1, G_Z1 - s, P_Z1),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z0 - DOOR_JAMB_W, PORTAL_Z0),
        rectangle(PORTAL_X0, PORTAL_X1, PORTAL_Z1, PORTAL_Z1 + DOOR_JAMB_W),
    ]
    plinth_d = BASE_PROFILE[0][0]
    for x_c in PILASTER_X:
        holes.append(rectangle(x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W, G_Z0, G_Z0 + plinth_d))
        holes.append(rectangle(x_c - PLINTH_HALF_W, x_c + PLINTH_HALF_W, G_Z1 - plinth_d, G_Z1))
    for z_c in CORNER_RETURN_Z:
        holes.append(rectangle(G_X1 - plinth_d, G_X1, z_c - PLINTH_HALF_W, z_c + PLINTH_HALF_W))
    layers = [(m, M_BAND) for m in bands] + [(m, HOLE) for m in holes]
    return [(poly, mat) for poly, mat in painted_regions(boundary, M_FLAGS, layers) if mat != HOLE]


def build_floor(b):
    for poly, mat in plan_floor():
        b.polygon(FLOOR, poly, mat, 'floor.flags' if mat == M_FLAGS else 'floor.band')


# ---- the gallery vault, the straight reveal soffit, the transverse arches ---------------------
def vault_normal(pts):
    zm = sum(p[2] for p in pts) / len(pts)
    ym = sum(p[1] for p in pts) / len(pts)
    return (0.0, G_SPRING - 0.3 - ym, G_ZC - zm)


def build_vault_and_arches(b):
    cuts = [XS_GI[0]] + sorted(t for x_c in PILASTER_X for t in (x_c - ARCH_HALF_W, x_c + ARCH_HALF_W)) + [G_X1]
    for k in range(0, len(cuts), 2):  # bays only; the arch footprints are solid-on-solid
        xa, xb = cuts[k], cuts[k + 1]
        b.rows([[(xa, y, z) for z, y in G_ARC], [(xb, y, z) for z, y in G_ARC]], WEB_SLOT, 'vault.gallery',
               vault_normal, uid_rows=[[(xa, m) for m in G_ARC_M], [(xb, m) for m in G_ARC_M]])
    b.face([(G_X0, G_SPRING, G_Z0 + CORNICE_PROUD), (XS_GI[0], G_SPRING, G_Z0 + CORNICE_PROUD),
            (XS_GI[0], G_SPRING, G_Z1 - CORNICE_PROUD), (G_X0, G_SPRING, G_Z1 - CORNICE_PROUD)],
           M_STUCCO, 'vault.reveal', (0.0, -1.0, 0.0))
    b.face([(XS_GI[0], y, z) for z, y in G_ARC], M_STUCCO, 'tympanum', (1.0, 0.0, 0.0))
    for x_c in PILASTER_X:
        xa, xb = x_c - ARCH_HALF_W, x_c + ARCH_HALF_W
        rows = [[(xa, y, z) for z, y in ARCH_PROFILE], [(xb, y, z) for z, y in ARCH_PROFILE]]
        b.rows(rows, M_STUCCO, 'arch',
               lambda pts: (0.0, ARCH_SPRING - 0.3 - sum(p[1] for p in pts) / 4, G_ZC - sum(p[2] for p in pts) / 4))
        ring = [(z, y) for z, y in ARCH_PROFILE] + [(z, y) for z, y in reversed(G_ARC)]
        for x, s in ((xa, -1.0), (xb, 1.0)):
            b.face([(x, y, z) for z, y in ring], M_STUCCO, 'arch', (s, 0.0, 0.0))


# ---- the arch passage: walls, north tympanum, vault, impost, skirting -------------------------
def build_passage(b):
    y0, y1 = SKIRTING_TOP, IMPOST_PROFILE[0][1]
    b.polygon(PWALL_W, rectangle(P_Z0, P_Z1, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_E, rectangle(P_Z0, G_Z0, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_E, rectangle(G_Z1, P_Z1, y0, y1), M_PALE, 'passage.field')
    b.polygon(PWALL_N, rectangle(P_X0, P_X1, y0, y1), M_PALE, 'passage.field')
    b.face([(x, y, P_Z0) for x, y in P_ARC], M_PALE, 'tympanum', (0.0, 0.0, 1.0))
    rows = [[(x, y, z) for x, y in P_ARC] for z in P_Z_NODES]
    uids = [[(z, m) for m in P_ARC_M] for z in P_Z_NODES]
    b.rows(rows, M_STUCCO, 'vault.passage',
           lambda pts: (-sum(p[0] for p in pts) / 4, P_SPRING - 0.5 - sum(p[1] for p in pts) / 4, 0.0),
           uid_rows=uids)
    stucco, el = (lambda _y: M_STUCCO), (lambda _y: 'impost')
    profile_run(b, PWALL_W, IMPOST_PROFILE, P_Z0, P_Z1, stucco, el, mitre0=1)
    profile_run(b, PWALL_E, IMPOST_PROFILE, P_Z0, G_Z0, stucco, el, mitre0=1)
    profile_cap(b, PWALL_E, IMPOST_PROFILE, G_Z0, 1.0, M_STUCCO, 'impost')
    profile_run(b, PWALL_E, IMPOST_PROFILE, G_Z1, P_Z1, stucco, el)
    profile_cap(b, PWALL_E, IMPOST_PROFILE, G_Z1, -1.0, M_STUCCO, 'impost')
    profile_run(b, PWALL_N, IMPOST_PROFILE, P_X0, P_X1, stucco, el, mitre0=1, mitre1=1)
    skirting_run(b, PWALL_W, P_Z0, P_Z1, mitre0=1)
    skirting_run(b, PWALL_E, P_Z0, G_Z0, mitre0=1, mitre1=-1)
    skirting_run(b, PWALL_E, G_Z1, P_Z1, mitre0=-1)
    skirting_run(b, PWALL_N, P_X0, P_X1, mitre0=1, mitre1=1)
# ---- the east end wall: one x = 44 partition (RG-F2 part 3) ---------------------------------
# The verdict 2.2's law: ONE partition of the end-wall plane; the doorcase bands + archivolt
# own their footprints; the lunette 'stairlight' half-disc and the 'doorcard' sit AT x = 44.0
# (proud 0). DOORCASE_FACES = 2 + 4 + 1 + 1 + LUNETTE_SEGS (the Sol-reviewed rebuild: the
# jamb fronts, the corrected jamb sides, the head band front with NO end caps, the archivolt
# ring front, the step ring — the caps were buried head/jamb interfaces; the schedule pins it
# via DOORCASE_FACES). The stock-take R5 raises LUNETTE_SEGS 8 -> 24, so the step ring's
# quads grow with it: 16 -> 32 faces.
DOORCASE_FACES = 2 + 4 + 1 + 1 + LUNETTE_SEGS
# F8 stays with the S1-amended constants (owner-ratified): CORNICE_PROUD 0.18, RESSAUT_PROUD
# 0.28 = the arch foot.
# (RG-F3) the two door patches join the eleven declared pane tags: THIRTEEN single-rect
# parts, one rect per part on the shelf, the SAME schema as before (one face per tag).
PATCH_PARTS = ('stairlight', 'doorcard',
               'pane01', 'pane02', 'pane03', 'pane04', 'pane05', 'pane06',
               'pane07', 'pane08', 'pane09', 'pane10', 'pane11')
DOOR_JAMB_PROUD = ARCHIVOLT_D          # the applied-band depth (0.04) — pinned here


def end_halfdisc(cx, y_base, r, segs):
    """The upper half-disc polygon (t, y): CCW from (cx - r, y_base) over the crown back."""
    pts = arc(cx, r, y_base, y_base + r, segs)
    pts.append((cx - r, y_base))
    return ccw(clean_polygon(pts))


def plan_end_wall():
    """The end-wall partition: [(polygon(t=z, y), material)] — the field below CORNICE_Y0 is
    plaster; the tympanum band above (y >= 2.70 everywhere the arch profile allows) is stucco.
    The applied elements' footprints are HOLE layers."""
    boundary = [(z, y) for z, y in G_ARC] + [(G_Z1, SKIRTING_TOP), (G_Z0, SKIRTING_TOP)]
    layers = [
        (rectangle(G_Z0, G_Z1, CORNICE_Y0, G_PEAK), M_STUCCO),
        (end_halfdisc(G_ZC, DOOR_BAND_Y[1], LUNETTE_R + ARCHIVOLT_W, LUNETTE_SEGS), HOLE),
        (rectangle(71.95, 72.20, 0.0, CORNICE_Y0), HOLE),
        (rectangle(73.80, 74.05, 0.0, CORNICE_Y0), HOLE),
        (rectangle(71.95, 74.05, DOOR_BAND_Y[0], CORNICE_Y0), HOLE),
        # (RG-F2 Sol fix 1) the doorway's own field cut: without it the field fills the
        # doorway interior between the jamb masks and the doorcard emits coplanar over it
        # (the COVERED demo pair wall.e x doorcard).
        (rectangle(PORTAL_Z0, PORTAL_Z1, 0.0, DOOR_BAND_Y[0]), HOLE),
        # (RG-F2 Sol fix 3) the end-wall cornice + ressaut footprints derived from the SAME
        # spans the emitters use (the one-partition law: a field face never sits behind a
        # proud front). The 4 cornice spans + the 2 end ressauts, y CORNICE_Y0..G_SPRING.
        (rectangle(G_Z0, CORNER_RETURN_Z[0] - RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[0] + RESSAUT_HALF_W, G_Z0 + END_CORNICE_BREAK, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(G_Z1 - END_CORNICE_BREAK, CORNER_RETURN_Z[1] - RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[1] + RESSAUT_HALF_W, G_Z1, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[0] - RESSAUT_HALF_W, CORNER_RETURN_Z[0] + RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
        (rectangle(CORNER_RETURN_Z[1] - RESSAUT_HALF_W, CORNER_RETURN_Z[1] + RESSAUT_HALF_W, CORNICE_Y0, G_SPRING), HOLE),
    ]
    for z_c in CORNER_RETURN_Z:
        layers += [(mask, HOLE) for mask in pilaster_footprint_masks(z_c)]
    return [(poly, mat) for poly, mat in painted_regions(boundary, M_PALE, layers) if mat != HOLE]


def build_doorcase(b):
    """16 faces at LUNETTE_SEGS 8, 32 at the stock-take's 24 (the Sol-reviewed topology):
    jamb fronts 2 + the corrected jamb sides 4 + the head band front 1 + the archivolt ring
    front 1 + the LUNETTE_SEGS-quad step ring. NO head-band end caps: the head/jamb
    interfaces are internal to the applied band's solid, never faced. Then the tagged
    'stairlight' half-disc and the 'doorcard' rectangle, both AT x = 44.0."""
    el = 'doorcase'
    P = WALL_E.world
    D = DOOR_JAMB_PROUD
    # the two jamb band fronts at proud D, full applied height (y 0..CORNICE_Y0)
    b.polygon(WALL_E, rectangle(71.95, 72.20, 0.0, CORNICE_Y0), M_STUCCO, el, d=D)
    b.polygon(WALL_E, rectangle(73.80, 74.05, 0.0, CORNICE_Y0), M_STUCCO, el, d=D)
    # jamb sides per the corrected table (height x normal): the outer sides run the full
    # height with the air outward; the inner sides stop at the doorcard's top and face INTO
    # the doorway air (z = 72.20: +z, z = 73.80: -z).
    b.face([P(71.95, SKIRTING_TOP, 0.0), P(71.95, SKIRTING_TOP, D),
            P(71.95, CORNICE_Y0, D), P(71.95, CORNICE_Y0, 0.0)], M_STUCCO, el, (0.0, 0.0, -1.0))
    b.face([P(72.20, SKIRTING_TOP, 0.0), P(72.20, SKIRTING_TOP, D),
            P(72.20, DOOR_BAND_Y[0], D), P(72.20, DOOR_BAND_Y[0], 0.0)], M_STUCCO, el, (0.0, 0.0, 1.0))
    b.face([P(73.80, SKIRTING_TOP, 0.0), P(73.80, SKIRTING_TOP, D),
            P(73.80, DOOR_BAND_Y[0], D), P(73.80, DOOR_BAND_Y[0], 0.0)], M_STUCCO, el, (0.0, 0.0, -1.0))
    b.face([P(74.05, SKIRTING_TOP, 0.0), P(74.05, SKIRTING_TOP, D),
            P(74.05, CORNICE_Y0, D), P(74.05, CORNICE_Y0, 0.0)], M_STUCCO, el, (0.0, 0.0, 1.0))
    # the head band front (z 72.20..73.80, y DOOR_BAND_Y[0]..CORNICE_Y0) — no end caps
    b.polygon(WALL_E, rectangle(72.20, 73.80, DOOR_BAND_Y[0], CORNICE_Y0), M_STUCCO, el, d=D)
    # the archivolt ring front: the annular n-gon at proud D. The walk = the outer arc
    # left->right (no closure), then the inner arc right->left; the two radial baseline
    # edges close it (the outer 0.07 ring footprints the surround; the disc sits inside).
    # Both arcs ride LUNETTE_SEGS (R5: one count rules the whole lunette - the ring and
    # the step ring close against the disc rim's polyline).
    outer_pts = arc(G_ZC, LUNETTE_R + ARCHIVOLT_W, DOOR_BAND_Y[1],
                    DOOR_BAND_Y[1] + LUNETTE_R + ARCHIVOLT_W, LUNETTE_SEGS)
    inner_pts = arc(G_ZC, LUNETTE_R, DOOR_BAND_Y[1], DOOR_BAND_Y[1] + LUNETTE_R, LUNETTE_SEGS)
    b.face([P(t, y, D) for t, y in outer_pts + list(reversed(inner_pts))],
           M_STUCCO, el, (-1.0, 0.0, 0.0))
    # the step ring: LUNETTE_SEGS quads from the ring's inner edge (proud D) down to the disc rim (proud 0)
    for (t0a, y0a), (t1a, y1a) in zip(inner_pts, inner_pts[1:]):
        b.face([P(t0a, y0a, D), P(t1a, y1a, D), P(t1a, y1a, 0.0), P(t0a, y0a, 0.0)],
               M_STUCCO, el, (-1.0, 0.0, 0.0))
    # the lunette back: the exact half-disc at proud 0 — tag 'stairlight'
    b.face([P(t, y, 0.0) for t, y in end_halfdisc(G_ZC, DOOR_BAND_Y[1], LUNETTE_R, LUNETTE_SEGS)],
           M_STAIR, 'stairlight', (-1.0, 0.0, 0.0), tag='stairlight')
    # the doorcard: the doorway's exact rectangle at proud 0 — tag 'doorcard'.
    # RG-F6 THE DISPLACED TWIN: the card builds on AIRLOCK_BACK (the box's far plane,
    # x 46.6) at proud 0 in BOTH chains - same normal, same tag, same M_STAIR slot, same
    # (z, y) rectangle. The shelf pack reproduces the card's cell exactly: for an x-normal
    # face the projection reads (world y, -world z) only, so the packed (t, y) box, the
    # cell size and the packed index equal the committed card's, and the lm.patches rect
    # for the encode paint survives byte-for-byte. The bake side (the layout-identity law):
    # the box is built in the bake scene too, so the card stands on the plane the box
    # closes against - at WALL_E it would seal the box into a lightless pocket and its five
    # faces would bake black; at AIRLOCK_BACK the card's stage spill (the 'doorcard' row,
    # resolved by element through LM_FACE_ELEMENTS, not by plane) is the box's light.
    card_plane = AIRLOCK_BACK
    b.face([card_plane.world(t, y, 0.0) for t, y in rectangle(PORTAL_Z0, PORTAL_Z1, 0.0, DOOR_BAND_Y[0])],
           M_STAIR, 'doorcard', (-1.0, 0.0, 0.0), tag='doorcard')


def build_end_wall(b):
    for poly, mat in plan_end_wall():
        b.polygon(WALL_E, poly, mat, 'wall.e')
    build_pilaster(b, WALL_E, CORNER_RETURN_Z[0])   # the corner returns (32 faces each, S2's port)
    build_pilaster(b, WALL_E, CORNER_RETURN_Z[1])
    build_ressaut(b, WALL_E, CORNER_RETURN_Z[0], arch=False)
    build_ressaut(b, WALL_E, CORNER_RETURN_Z[1], arch=False)
    # end-wall cornice: 2 runs [70..70.9] and [75.1..76] (END_CORNICE_BREAK 0.90), each
    # 2 spans × 7 segments + 1 cap at the inner end; the corner end carries the mitre.
    cornice_run(b, WALL_E, G_Z0, CORNER_RETURN_Z[0] - RESSAUT_HALF_W, mitre0=1)
    cornice_run(b, WALL_E, CORNER_RETURN_Z[0] + RESSAUT_HALF_W, G_Z0 + END_CORNICE_BREAK, cap1=True)
    cornice_run(b, WALL_E, G_Z1 - END_CORNICE_BREAK, CORNER_RETURN_Z[1] - RESSAUT_HALF_W, cap0=True)
    cornice_run(b, WALL_E, CORNER_RETURN_Z[1] + RESSAUT_HALF_W, G_Z1, mitre1=1)
    # end-wall skirting: 4 runs × 2 faces; the runs at the corners carry the mitre.
    skirting_run(b, WALL_E, G_Z0, CORNER_RETURN_Z[0] - PLINTH_HALF_W, mitre0=1)
    skirting_run(b, WALL_E, CORNER_RETURN_Z[0] + PLINTH_HALF_W, 71.95)
    skirting_run(b, WALL_E, 74.05, CORNER_RETURN_Z[1] - PLINTH_HALF_W)
    skirting_run(b, WALL_E, CORNER_RETURN_Z[1] + PLINTH_HALF_W, G_Z1, mitre1=1)
    build_doorcase(b)


def build_airlock_set(b):
    """THE RG-F6 AIRLOCK SET (built by BOTH chains - the layout-identity law): five family faces
closing the 2.6 m threshold box against the displaced doorcard (the stock-take W4: they pack their own atlas cells at the gallery
    floor's density - no host adoption). The opening is RECTANGULAR (DEC-41 amendment 1):
    the soffit is a
    FLAT face at y = DOOR_BAND_Y[0] spanning the box - no arch sweep; the lunette
    half-disc stays on the end-wall plane above it. Every face abuts exactly, never
    overlaps coplanar (the COVERED gate): the threshold and the floor continuation abut at
    x = G_X1 + AIRLOCK_THRESHOLD_W, every face abuts the displaced card's edges (the card
    is the opening's exact rectangle), and the box's mouth (x = G_X1) stays open into the
    doorway."""
    # the two jamb reveals: the box's south/north walls on the opening's z planes
    b.face([(G_X1, 0.0, PORTAL_Z0), (G_X1 + AIRLOCK_DEPTH, 0.0, PORTAL_Z0),
            (G_X1 + AIRLOCK_DEPTH, DOOR_BAND_Y[0], PORTAL_Z0),
            (G_X1, DOOR_BAND_Y[0], PORTAL_Z0)],
           M_SHADE_AIRLOCK, 'airlock.reveal.w', (0.0, 0.0, 1.0))
    b.face([(G_X1, 0.0, PORTAL_Z1), (G_X1 + AIRLOCK_DEPTH, 0.0, PORTAL_Z1),
            (G_X1 + AIRLOCK_DEPTH, DOOR_BAND_Y[0], PORTAL_Z1),
            (G_X1, DOOR_BAND_Y[0], PORTAL_Z1)],
           M_SHADE_AIRLOCK, 'airlock.reveal.e', (0.0, 0.0, -1.0))
    # the flat soffit at the opening's clear height, normal down into the box
    b.face([(G_X1, DOOR_BAND_Y[0], PORTAL_Z0), (G_X1 + AIRLOCK_DEPTH, DOOR_BAND_Y[0], PORTAL_Z0),
            (G_X1 + AIRLOCK_DEPTH, DOOR_BAND_Y[0], PORTAL_Z1),
            (G_X1, DOOR_BAND_Y[0], PORTAL_Z1)],
           M_SHADE_AIRLOCK, 'airlock.soffit', (0.0, -1.0, 0.0))
    # the floor continuation (flags) and the threshold strip (band) at y = 0. The strip
    # reaches WEST to the floor's actual edge (the end-wall skirting hole spans x
    # G_X1 - SKIRTING_PROUD .. G_X1 across ALL z - the doorway clear included, and no
    # skirting runs across the opening): the review-pass floor-join fix - without it the
    # mouth shows a SKIRTING_PROUD-wide floor void once the card is displaced.
    b.face([(G_X1 + AIRLOCK_THRESHOLD_W, 0.0, PORTAL_Z0), (G_X1 + AIRLOCK_DEPTH, 0.0, PORTAL_Z0),
            (G_X1 + AIRLOCK_DEPTH, 0.0, PORTAL_Z1), (G_X1 + AIRLOCK_THRESHOLD_W, 0.0, PORTAL_Z1)],
           M_FLAGS, 'airlock.floor', (0.0, 1.0, 0.0))
    b.face([(G_X1 - SKIRTING_PROUD, 0.0, PORTAL_Z0), (G_X1 + AIRLOCK_THRESHOLD_W, 0.0, PORTAL_Z0),
            (G_X1 + AIRLOCK_THRESHOLD_W, 0.0, PORTAL_Z1), (G_X1 - SKIRTING_PROUD, 0.0, PORTAL_Z1)],
           M_BAND, 'airlock.threshold', (0.0, 1.0, 0.0))


def build_sconce():
    """The 27-face lamp in its LOCAL frame (mount axis = local z, up = local y): iron plate
    + arm skip their mount bottoms (solid-on-solid), the 16-seg smooth trunc-cone shade +
    the bottom cap; the strip layout carries it. Count guarded against SCONCE_FACES."""
    b = Builder()
    b.block(-0.06, 0.06, -0.32, 0.18, 0.0, 0.03, S_IRON, 'sconce', skip=('-z',))
    b.block(-0.03, 0.03, 0.02, 0.10, 0.03, 0.24, S_IRON, 'sconce', skip=('-z',))
    bottom = []
    top = []
    for k in range(SCONCE_SEGS):
        ang = TAU * k / SCONCE_SEGS
        bottom.append((0.06 * math.sin(ang), 0.10, 0.22 + 0.06 * math.cos(ang)))
        top.append((0.11 * math.sin(ang), 0.38, 0.22 + 0.11 * math.cos(ang)))
    for k in range(SCONCE_SEGS):
        kNext = (k + 1) % SCONCE_SEGS
        pts = [bottom[k], bottom[kNext], top[kNext], top[k]]
        mid = ((pts[0][0] + pts[2][0]) / 2.0,
               (pts[0][1] + pts[2][1]) / 2.0,
               (pts[0][2] + pts[2][2]) / 2.0)
        norm = (0.0 - mid[0], 0.0, 0.22 - mid[2])
        b.face(pts, S_GLOW, 'sconce', norm, smooth=True)
    b.face(list(reversed(bottom)), S_GLOW, 'sconce', (0.0, -1.0, 0.0))
    if len(b.roster) != SCONCE_FACES:
        fail(f'the sconce template emitted {len(b.roster)} faces, SCONCE_FACES = {SCONCE_FACES}')
    return b


def instance(name, me, location, rot_y=0.0):
    """location/rot_y in world terms (rotation about world +Y == Blender +Z)."""
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---- direct-assembly finish: projection / shelf / the authored-data gates --------------------
def project(normal, co):
    ax, ay, az = abs(normal.x), abs(normal.y), abs(normal.z)
    if ax >= ay and ax >= az:
        return (co.z, co.y)
    if ay >= az:
        return (co.x, co.z)
    return (co.x, co.y)


def count_overlaps(rects):
    """Pairwise overlap count over chart-space rects (x, y0, x1, y1), y from the top. EPS
    tolerances the touching boundaries: float drift between independently computed edges
    must not read as an overlap of whole cells."""
    eps = 1e-9
    items = sorted(rects)
    count = 0
    for i in range(len(items)):
        ax0, ay0, ax1, ay1 = items[i]
        for j in range(i + 1, len(items)):
            bx0, by0, bx1, by1 = items[j]
            if bx0 >= ax1 - eps:
                break
            if by0 < ay1 - eps and ay0 < by1 - eps:
                count += 1
    return count


def shelf_pack(cells, res, first_row):
    """Deterministic placement of (w, h, index) cells (w/h = the cell's inner px into the
    atlas; the 2 px pad rides the footprint). The RG-F2 packer upgrade (documented):
    a bottom-left skyline, not the flat row shelf — the flat shape wasted a row's whole
    depth budget per height class and could not close the atlas at the CELL floor.

    Shape laws (the owner's ratified packer class): fully deterministic; the primary
    order stays height desc (the rg-e1 area-weighted spirit), the width desc + the roster
    index break the ties; each cell is placed at the lowest profile position its width
    fits, the leftmost on ties; each cell's allocation carries the pad on ALL FOUR sides
    (the Sol-reviewed pad law: wt/ht = (w, h) + 2*pad each), so chart inners stay
    exactly two pads apart from every neighbour on every side; the allocations stay
    disjoint — count_overlaps' adjacent-touch-is-not-overlap semantics unchanged.
    first_row = the chart-y the shelf starts at (the reserved strip owns the rows above
    it). Returns {index: (x, y, w_total, h_total)}, or None fail-loud if even the best
    profile position cannot hold a cell."""
    pad = int(LM_PAD_PX)
    ordered = sorted(cells, key=lambda item: (-item[1], -item[0], item[2]))
    points = [(0, first_row)]        # the ascending-x steps: y is the height from x onward
    placed = {}
    for w, h, idx in ordered:
        wt, ht = w + 2 * pad, h + 2 * pad
        best = None                  # (top, x): the lowest top wins; the scan keeps the leftmost
        for i in range(len(points)):
            x = points[i][0]
            if x + wt > res:
                break
            top = points[i][1]
            j = i + 1
            while j < len(points) and points[j][0] < x + wt:
                if points[j][1] > top:
                    top = points[j][1]
                j += 1
            if top + ht <= res and (best is None or top < best[0]):
                best = (top, x)
        if best is None:
            return None
        top, x = best
        placed[idx] = (x, top, wt, ht)
        y_right = first_row          # the profile's height at the cell's right edge
        for px, py in points:
            if px <= x + wt:
                y_right = py
            else:
                break
        before = [(px, py) for px, py in points if px < x]
        after = [(px, py) for px, py in points if px > x + wt]
        points = before + [(x, top + ht), (x + wt, y_right)] + after
    return placed


# ---- the UV2 re-weight (the junction law's S3, folded into this slice by S0 D1) ---------------
# The atlas cell density is weighted per face: 2x on the junction's binding seats (cornice,
# ressaut, the pilaster capital band, the arch ribs and the vault.gallery bay field — the
# crease's own seat), 0.5 on the donor fields (the floor flags/band and the remaining vault
# fields), 1.0 elsewhere. The atlas still packs at LM_RES 1536 and the schedule (face counts)
# is untouched — only the per-face cell SIZES move, so the downstream lm.cells/patches rows
# recompute with moved coordinates every run. The capital band rides the probe's own
# discriminator (rg-sightline's capital_faces: the pilaster faces whose min world y >=
# SHAFT_Y1; blender co.z is the world y per to_w).
#
# THE STOCK-TAKE AMENDMENTS (the 2026-11-24 bake artifact, UV2 LAW + W1-W5):
#   W4 - the five airlock faces join the HALF table: they pack at the gallery floor's
#        density (the floor they continue; g2 stands 3 m off).
#   W5 - the raised arcs (vault.gallery, arch, niche heads, lunette) KEEP their rects and
#        their density - only the strip lines inside them move (no table change here); the
#        vault.reveal's >= 4-texel-across floor rides LM_TEXEL_FLOOR_SHORT below.
#   The UV2 LAW: the weights are FLOORS in texels across a face's short axis at 1536, read
#   off the exported UV2 - LM_TEXEL_FLOOR_SHORT carries them (the MAPPED interior span, the
#   pads excluded, so the shelf allocation carries floor + 2 x LM_PAD_PX):
#   W1 impost - the cove's across-profile measure 1.12 x 4.0 = 4.48, snapped to 5 whole
#        texels; the floor sits on the impost element, whose every IMPOST_PROFILE face then
#        reads >= 2 across a fortiori (the mechanism carries one floor per element - the
#        cove's 4 of 18 faces are not element-separable, and the over-delivery costs
#        ~0.4 % of the atlas). The along-run axis is untouched (the floor rides the short
#        projected axis only).
#   W2 panels - every moulding return >= 2 texels across (the panel field keeps the wall
#        field's density 1.0 - the default weight).
#   W3 dado - the cap's profile faces >= 2 texels each (the dado field at the wall field's
#        density 1.0).
#   W5 vault.reveal - >= 4 texels across (the mouth's edge under g0b's pre-turn).
LM_DENSITY_DOUBLE = 2.0
LM_DENSITY_HALF = 0.5
LM_DENSITY_DOUBLE_ELEMENTS = ('cornice', 'ressaut', 'arch', 'vault.gallery')
LM_DENSITY_HALF_ELEMENTS = ('floor.flags', 'floor.band', 'vault.passage', 'vault.reveal') \
    + AIRLOCK_ELEMENTS
LM_CAPITAL_BAND_EPS = 1e-9
LM_TEXEL_FLOOR_SHORT = {
    'impost': 5.0,        # W1: the cove 1.12 -> 4.48, snapped to 5 whole texels
    'dado.panel': 2.0,    # W2: every moulding return >= 2 texels across
    'dado.rail': 2.0,     # W3: the cap's profile faces >= 2 texels each
    'vault.reveal': 4.0,  # W5: the mouth's edge under g0b's pre-turn
}


def lm_density_weight(entry):
    """The per-face atlas density weight (see the block comment above)."""
    face, _kind, _uid, element = entry
    if element in LM_DENSITY_DOUBLE_ELEMENTS:
        return LM_DENSITY_DOUBLE
    if element in LM_DENSITY_HALF_ELEMENTS:
        return LM_DENSITY_HALF
    if element == 'pilaster' \
            and min(v.co.z for v in face.verts) >= SHAFT_Y1 - LM_CAPITAL_BAND_EPS:
        return LM_DENSITY_DOUBLE
    return 1.0


def lm_cell_axis(extent_m, px, weight, floor):
    """One shelf-cell axis in px: the density law's rounded extent, raised to the artifact's
    texel floor where one is declared (the floor counts the MAPPED interior - the pads
    excluded - so the allocation carries floor + 2 x LM_PAD_PX), then the CELL bracket."""
    floor_px = int(math.ceil(floor)) + 2 * int(LM_PAD_PX) if floor else 0
    return min(max(int(round(extent_m * px * weight)), floor_px, LM_CELL_MIN_PX), LM_CELL_MAX_PX)


def lm_face_cell(extents, px, weight, floor):
    """The face's shelf cell (u, v) in px. The floor rides the SHORT projected axis - the
    UV2 LAW's 'across a face's short axis' (for the impost's run faces that is the
    across-profile measure; the along-run axis keeps the bare density law)."""
    du, dv = extents
    if dv < du:
        return (lm_cell_axis(du, px, weight, 0.0), lm_cell_axis(dv, px, weight, floor))
    return (lm_cell_axis(du, px, weight, floor), lm_cell_axis(dv, px, weight, 0.0))


def lm_layout_hash(block):
    """The layout-identity law's one number: sha256 over the lm block's pack-defining fields
    (pxPerM, stripRowPx, faces, cells in roster order), serialised canonically. The same
    block in both chains hashes the same; any roster, size or placement change moves it.
    Computed from the in-process ints in BOTH chains - the readers compare the stored string
    and the fields, they never recompute it from a JSON round-trip."""
    import hashlib as _hashlib
    canon = json.dumps(
        {'pxPerM': block['pxPerM'], 'stripRowPx': block['stripRowPx'],
         'faces': block['faces'], 'cells': block['cells']},
        sort_keys=True, separators=(',', ':'))
    return _hashlib.sha256(canon.encode('utf-8')).hexdigest()


def finish(name, builder, materials, mode='shelf'):
    """Two UV layers: 'uv' (albedo: box projection, or the tagged cylindrical arc mapping,
    always world metres / UV_TILE_M) and 'lm' (the atlas cells).

    mode='shelf': per-face cells on the deterministic row shelf — cell size
    clamp(round(extent_m * px), 6, 480) px with the 2 px pad inside the footprint, raised
    where LM_TEXEL_FLOOR_SHORT declares the face's short-axis texel floor; px steps
    down from LM_PX_PER_M until the pack fits the atlas under the reserved strip, and FAILS
    if it would go below LM_PX_PER_M_MIN (the verdict's CELL law: cut T3/T2 before touching
    resolution). mode='strip' (the sconce template): the reserved v range
    [LM_STRIP_FRAC, 1) as a grid of equal cells (the derived grid), pads inside each cell.
    Returns (mesh, triangles, lm_block)."""
    bm = builder.bm
    bm.normal_update()
    uv_lay = bm.loops.layers.uv.new('uv')
    lm_lay = bm.loops.layers.uv.new('lm')
    # The stock-take W2-W4: every roster face packs its own cell - the borrowed class is
    # gone (no atlas adoption, no host rows), so the roster needs no split.
    roster = [entry for entry in builder.roster if entry[0] is not None]
    pad_px = int(LM_PAD_PX)
    pad_uv = LM_PAD_PX / LM_RES
    first_row = int(round((1.0 - LM_STRIP_FRAC) * LM_RES))

    def planar(entry):
        f, _kind, uid, _el = entry
        if uid is not None:
            return list(uid)
        return [project(entry[0].normal, loop.vert.co) for loop in entry[0].loops]

    faces_uv = [(entry, planar(entry)) for entry in roster]

    if mode == 'shelf':
        extents = []
        for _entry, uv in faces_uv:
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            extents.append(((max(us) - min(us)) or 1.0, (max(vs) - min(vs)) or 1.0))
        weights = [lm_density_weight(entry) for entry, _uv in faces_uv]
        floors = [LM_TEXEL_FLOOR_SHORT.get(entry[3], 0.0) for entry, _uv in faces_uv]
        px = float(LM_PX_PER_M)
        placed = None
        cell_px = None
        while px >= 1.0:
            if int(px) < LM_PX_PER_M_MIN:
                fail(f'the lm shelf needs pxPerM {px:g} < the CELL floor {LM_PX_PER_M_MIN} — '
                     'cut T3/T2 (the verdict failure case (i))')
            cell_px = [
                lm_face_cell((du, dv), px, weight, floor)
                for (du, dv), weight, floor in zip(extents, weights, floors)
            ]
            if os.environ.get('RGF2_DUMP_SHELF'):
                import collections as _co
                fam = _co.defaultdict(list)
                cell = _co.defaultdict(int)
                area = _co.defaultdict(int)
                for idx, (entry, _uv) in enumerate(faces_uv):
                    el = entry[3] if len(entry) > 3 else '?'
                    w, h = cell_px[idx]
                    fam[el].append((w, h))
                    cell[el] += 1
                    area[el] += w * h
                rows = []
                for el in sorted(area, key=lambda e: -area[e]):
                    big = max(fam[el], key=lambda wh: wh[0] * wh[1])
                    rows.append({'element': el, 'faces': cell[el], 'px2': area[el], 'biggest': big})
                import json as _j
                # the dump dir is env-overridable (the layout-identity job sets it to a
                # worktree-relative dir on the box; COVERED_DUMP_PATH is the Mac's debug path)
                _dump_dir = os.environ.get('RGF2_DUMP_DIR') or COVERED_DUMP_PATH.rsplit('/', 1)[0]
                with open(_dump_dir + '/rgf2-shelf-debug.json', 'w') as _fh:
                    _j.dump({'px': px, 'finder_row': first_row, 'rows': rows,
                             'cells': [[int(placed[idx][0]) if placed and idx in placed else None,
                                        tuple(cell_px[idx])] for idx in range(len(cell_px))]}, _fh, indent=1)
            placed = shelf_pack(cells=[(w, h, idx) for idx, (w, h) in enumerate(cell_px)],
                                res=LM_RES, first_row=first_row)
            if placed is not None:
                break
            px -= 1.0
        for idx, (entry, uv) in enumerate(faces_uv):
            f, _kind, uid, _el = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            x, y, wt, ht = placed[idx]
            w_in, h_in = wt - 2 * pad_px, ht - 2 * pad_px
            # the pad law (the Sol amendment): the mapped cell's bounds sit >= 2 px inside
            # its allocation on ALL FOUR sides — verified before any atlas emission.
            insets = {
                'left': (x + pad_px) - x,
                'right': (x + wt) - (x + pad_px + w_in),
                'bottom': (y + pad_px) - y,
                'top': (y + ht) - (y + pad_px + h_in),
            }
            deficient = [side for side, inset in insets.items() if inset < pad_px]
            if deficient:
                fail(f'the lm pad law violated for cell {idx}: insets {insets} px < {pad_px} on {deficient}')
            for loop, (pu, pv) in zip(f.loops, uv):
                fu = (pu - u0) / du
                fv = (pv - v0) / dv
                loop[uv_lay].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
                loop[lm_lay].uv = (
                    (x + pad_px + fu * w_in) / LM_RES,
                    1.0 - (y + pad_px + fv * h_in) / LM_RES,
                )
        used = float(sum(wt * ht for _x, _y, wt, ht in placed.values()))
        min_cell = min(min(w, h) for w, h in cell_px)
        chart = [
            (x / LM_RES, y / LM_RES, (x + wt) / LM_RES, (y + ht) / LM_RES)
            for (x, y, wt, ht) in placed.values()
        ]
        block = {
            'mode': 'shelf',
            'pxPerM': int(px),
            'occupancy': round(used / float(LM_RES * LM_RES), 4),
            'minCellPx': min_cell,
            'faces': len(roster),
            'stripRowPx': first_row,
        }
        # the cells law (part-3 addition): the lm block serialises every shelf cell —
        # rect [x, y, w_total, h_total] in chart px, y from the top, one entry per face in
        # roster order, the element name riding each row. The same placements the UV law
        # consumed. The strip mode keeps no cells.
        block['cells'] = [
            {'rect': [placed[idx][0], placed[idx][1], placed[idx][2], placed[idx][3]],
             'element': _entry[3]}
            for idx, (_entry, _uv) in enumerate(faces_uv)
        ]
        block['layoutHash'] = lm_layout_hash(block)
        # the layout-identity law's witness: BOTH chains print it (the job greps four lines,
        # one hash); the strip mode keeps no cells and prints nothing
        print(f"RG_LM_LAYOUT faces={block['faces']} pxPerM={block['pxPerM']} "
              f"stripRowPx={block['stripRowPx']} occupancy={block['occupancy']} "
              f"minCellPx={block['minCellPx']} hash={block['layoutHash'][:16]}", flush=True)
    else:
        grid = LM_SCONCE_GRID
        cell_w = 1.0 / grid
        cell_h = (1.0 - LM_STRIP_FRAC) / grid
        inner_u = max(cell_w - 2.0 * pad_uv, cell_w * 0.5)
        inner_v = max(cell_h - 2.0 * pad_uv, cell_h * 0.5)
        for idx, (entry, uv) in enumerate(faces_uv):
            f, _kind, uid, _el = entry
            us = [p[0] for p in uv]
            vs = [p[1] for p in uv]
            u0, v0 = min(us), min(vs)
            du = (max(us) - u0) or 1.0
            dv = (max(vs) - v0) or 1.0
            u_base = (idx % grid) * cell_w
            v_base = LM_STRIP_FRAC + (idx // grid) * cell_h
            # the pad law (the Sol amendment) holds for the strip grid too: every equal
            # cell's mapped interior sits >= 2 px inside its allocation on all four sides.
            strip_insets = {
                'left': pad_uv * LM_RES,
                'right': (cell_w - pad_uv - inner_u) * LM_RES,
                'bottom': pad_uv * LM_RES,
                'top': (cell_h - pad_uv - inner_v) * LM_RES,
            }
            if any(inset + 1e-9 < 2.0 for inset in strip_insets.values()):
                fail(f'the lm pad law violated for strip cell {idx}: insets {strip_insets}')
            for loop, (pu, pv) in zip(f.loops, uv):
                fu = (pu - u0) / du
                fv = (pv - v0) / dv
                loop[uv_lay].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
                loop[lm_lay].uv = (
                    u_base + pad_uv + fu * inner_u,
                    v_base + pad_uv + fv * inner_v,
                )
        used = float(len(roster)) * cell_w * cell_h
        chart = []
        for idx in range(len(roster)):
            x0 = (idx % grid) * cell_w
            y0 = 1.0 - (LM_STRIP_FRAC + (idx // grid + 1) * cell_h)
            chart.append((x0, y0, x0 + cell_w, y0 + cell_h))
        block = {
            'mode': 'strip',
            'grid': grid,
            'cellPx': [cell_w * LM_RES, cell_h * LM_RES],
            'occupancy': round(used, 4),
            'minCellPx': int(round(cell_h * LM_RES)),
            'faces': len(roster),
            'v0': LM_STRIP_FRAC,
        }

    overlap_faces = count_overlaps(chart)
    block['overlapFaces'] = overlap_faces
    if overlap_faces:
        raise RuntimeError(f'rastrelli-gallery: lm atlas overlaps: {overlap_faces} mode={mode}')

    patches = {}
    for part in PATCH_PARTS:
        face = builder.tags.get(part)
        if face is not None:
            if mode != 'shelf':
                fail(f'the {part} patch is expected on the shelf pack')
            found = None
            for idx, (entry, _uv) in enumerate(faces_uv):
                if entry[0] is face:
                    found = idx
                    break
            if found is None:
                fail(f'the {part} face vanished from the roster')
            x, y, wt, ht = placed[found]
            patches[part] = [x, y, wt, ht]
    block['patches'] = patches

    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return me, tris, block


def check_schedule(builder, schedule):
    """The element schedule (S2's author_schedule) against the emitted counts — the round's
    enumeration (the verdict 2.1(d)): any element outside its scheduled count fails loud.
    The schedule is authored in main() BEFORE any geometry and passed in (the law's
    "authored before geometry" holds literally)."""
    emitted = dict(builder.counts)
    problems = []
    for element, expected in schedule.items():
        got = emitted.pop(element, 0)
        if got != expected:
            problems.append(f'{element}: scheduled {expected}, emitted {got}')
    for element, extra in sorted(emitted.items()):
        problems.append(f'{element}: not in the schedule, emitted {extra}')
    if problems:
        fail('schedule mismatch — ' + '; '.join(problems))
    return schedule


# ---- RG-F5: the dado datum + the framed panel order (the accepted verdict reply-1 §2) --------
# The wall articulation, built AND baked. The families live in the SAME shell builder (one
# mesh, the glTF exporter splits primitives per material slot - M_STUCCO faces join the
# existing stucco primitive, M_SHADE opens the 7th) and in BOTH chains: the shelf pack is a
# function of the whole roster, so the export and the bake chain feed it one roster.
# THE LAYOUT-IDENTITY BAR (rastrelli-next round 4; it replaces the plates-identity bar, whose
# premise - export-only families leave the bake's scene, roster and plates byte-identical -
# ended with W2-W4): the export summary's lm (pxPerM, stripRowPx, faces, cells in roster
# order; one sha256 = lm.layoutHash) equals every bake state's layout (ZIMNY_LM_LAYOUT_OUT),
# asserted by bake.py before any bake op, by the dead-cell check before any sample, and
# recorded in the manifest as provenance. Roster identity holds by construction: no BAKE
# branch touches geometry, slots or the schedule - the chains differ only in what they WRITE.
def _panel_t_dir(plane):
    """The plane's along-wall axis in world (t runs +x on the z-planes, +z on the x-planes)."""
    return (1.0, 0.0, 0.0) if plane.axis == 'z' else (0.0, 0.0, 1.0)


def _rail_mat(ym):
    """The datum's reads: the bottom strip M_SHADE (the fillet-shade device), the front and
    the top M_STUCCO."""
    return M_SHADE if ym <= DADO_RAIL_Y0 + 1e-9 else M_STUCCO


def rail_run(b, plane, t0, t1, mitre0=0, mitre1=0, cap0=False, cap1=False):
    """The dado datum: the sill-ledge section (y 0.84-0.90, proud 0.06) run t0..t1. The
    mitre/cap laws are the kit's own (profile_run/profile_cap); the exposed caps read
    M_SHADE (end grain), the plinth/shaft ends emit no cap (solid-on-solid). A mitred end
    is a WRAP (its mating run supplies the diagonal half)."""
    profile_run(b, plane, DADO_RAIL_PROFILE, t0, t1, _rail_mat, lambda _y: 'dado.rail',
                mitre0, mitre1)
    if cap0:
        profile_cap(b, plane, DADO_RAIL_PROFILE, t0, -1.0, M_SHADE, 'dado.rail')
    if cap1:
        profile_cap(b, plane, DADO_RAIL_PROFILE, t1, 1.0, M_SHADE, 'dado.rail')


def build_panel(b, plane, t0, t1, y0, y1):
    """One mitred frame: 4 bands x (front + outer side + inner side) = 12 quads. The mitre
    seam faces are interior (dropped - the bands press against each other, the fronts tile
    the corner squares along the shared diagonals). Fronts and up-facing sides M_STUCCO;
    down-facing and lateral sides M_SHADE. The host field face behind the frame is NOT cut
    (the frame's interior IS the wall; the COVERED gate flags coplanar pairs only)."""
    P = plane.world
    w, d = PANEL_BAND_W, PANEL_BAND_PROUD
    n_front = plane.normal()
    t_dir = _panel_t_dir(plane)
    up, down = (0.0, 1.0, 0.0), (0.0, -1.0, 0.0)
    # bottom band
    b.face([P(t0, y0, d), P(t1, y0, d), P(t1 - w, y0 + w, d), P(t0 + w, y0 + w, d)],
           M_STUCCO, 'dado.panel', n_front)
    b.face([P(t0, y0, 0.0), P(t1, y0, 0.0), P(t1, y0, d), P(t0, y0, d)],
           M_SHADE, 'dado.panel', down)
    b.face([P(t0 + w, y0 + w, 0.0), P(t1 - w, y0 + w, 0.0), P(t1 - w, y0 + w, d),
            P(t0 + w, y0 + w, d)], M_STUCCO, 'dado.panel', up)
    # top band
    b.face([P(t0 + w, y1 - w, d), P(t1 - w, y1 - w, d), P(t1, y1, d), P(t0, y1, d)],
           M_STUCCO, 'dado.panel', n_front)
    b.face([P(t0, y1, 0.0), P(t1, y1, 0.0), P(t1, y1, d), P(t0, y1, d)],
           M_STUCCO, 'dado.panel', up)
    b.face([P(t0 + w, y1 - w, 0.0), P(t1 - w, y1 - w, 0.0), P(t1 - w, y1 - w, d),
            P(t0 + w, y1 - w, d)], M_SHADE, 'dado.panel', down)
    # left band
    b.face([P(t0, y0, d), P(t0, y1, d), P(t0 + w, y1 - w, d), P(t0 + w, y0 + w, d)],
           M_STUCCO, 'dado.panel', n_front)
    b.face([P(t0, y0, 0.0), P(t0, y1, 0.0), P(t0, y1, d), P(t0, y0, d)],
           M_SHADE, 'dado.panel', tuple(-c for c in t_dir))
    b.face([P(t0 + w, y0 + w, 0.0), P(t0 + w, y1 - w, 0.0), P(t0 + w, y1 - w, d),
            P(t0 + w, y0 + w, d)], M_SHADE, 'dado.panel', t_dir)
    # right band
    b.face([P(t1, y0, d), P(t1, y1, d), P(t1 - w, y1 - w, d), P(t1 - w, y0 + w, d)],
           M_STUCCO, 'dado.panel', n_front)
    b.face([P(t1, y0, 0.0), P(t1, y1, 0.0), P(t1, y1, d), P(t1, y0, d)],
           M_SHADE, 'dado.panel', t_dir)
    b.face([P(t1 - w, y0 + w, 0.0), P(t1 - w, y1 - w, 0.0), P(t1 - w, y1 - w, d),
            P(t1 - w, y0 + w, d)], M_SHADE, 'dado.panel', tuple(-c for c in t_dir))


def build_gallery_rails(b, plane):
    """The datum along one long wall: the reveal run (the mouth corner wraps EXTERNAL,
    mitre -1, meeting the passage's east rail at the 45-deg seam - the skirting's own
    west-corner law), then per niche the two pier connectors (RAIL_STOP short of each
    shaft side face), the east-most connector wrapping the end-wall corner (internal
    mitre +1 against the end-wall stub)."""
    rail_run(b, plane, G_X0, PILASTER_X[-1] - SHAFT_HALF_W - RAIL_STOP, mitre0=-1)
    for k, x_c in enumerate(NICHE_CENTRES):
        rail_run(b, plane, PILASTER_X[k] + SHAFT_HALF_W + RAIL_STOP, x_c - SILL_HALF_L)
        if k == 0:
            rail_run(b, plane, x_c + SILL_HALF_L, G_X1, mitre1=1)
        else:
            rail_run(b, plane, x_c + SILL_HALF_L,
                     PILASTER_X[k - 1] - SHAFT_HALF_W - RAIL_STOP)


def build_gallery_dado(b, plane):
    """One long wall's datum + the under-niche panels."""
    build_gallery_rails(b, plane)
    for x_c in NICHE_CENTRES:
        build_panel(b, plane, x_c - PANEL_HALF_W_GALLERY, x_c + PANEL_HALF_W_GALLERY,
                    DADO_PANEL_Y0, DADO_PANEL_Y1)


def build_passage_families(b):
    """The passage: the continuous datum on all three walls (mitred at the north corners,
    exposed caps at the facade end and at the mouth reveal) + the panels at the vault bay
    rhythm: 1 dado + 1 tall panel per bay on the west wall (7 bays) and the north wall
    (4 bays at the 2.0 m pitch); the east wall's 5 bays clear of the mouth carry the dado
    panels, and the tall panels SKIP the two bays hosting the mouth sconces (SCONCE_SEW_Z:
    the sconce back plates occupy y 1.68-2.18 proud 0.10 - a tall panel there would
    positively intersect, the collision gate's own case)."""
    rail_run(b, PWALL_W, P_Z0, P_Z1, mitre0=1)
    # the mouth corners (4, 70)/(4, 76) are EXTERNAL: BOTH runs wrap (mitre -1) and meet
    # at the 45-deg seam - the gallery's reveal runs carry the matching mitre0=-1. A
    # square cap here would leave the diagonal half of the corner cube open (the
    # review-pass finding: a notch at the joint; the FACING/COVERED gates cannot see it).
    rail_run(b, PWALL_E, P_Z0, G_Z0, mitre0=1, mitre1=-1)
    # the facade ends (z 87.5, the open arch plane) carry NO cap: the room's air ends
    # there (air_contains stops at P_Z1) and a +z cap would fail the FACING gate - the
    # rail dies at the plane exactly like the fields' own open edges.
    rail_run(b, PWALL_E, G_Z1, P_Z1, mitre0=-1)
    rail_run(b, PWALL_N, P_X0, P_X1, mitre0=1, mitre1=1)
    for za, zb in zip(P_Z_NODES, P_Z_NODES[1:]):
        if zb <= G_Z0 or za >= G_Z1:      # the east wall's bays clear of the mouth
            build_panel(b, PWALL_E, za + PASSAGE_PANEL_MARGIN, zb - PASSAGE_PANEL_MARGIN,
                        DADO_PANEL_Y0, DADO_PANEL_Y1)
            if not any(za < z < zb for z in SCONCE_SEW_Z):
                build_panel(b, PWALL_E, za + PASSAGE_PANEL_MARGIN, zb - PASSAGE_PANEL_MARGIN,
                            UPPER_PANEL_BOTTOM, UPPER_PANEL_TOP_PASSAGE)
        build_panel(b, PWALL_W, za + PASSAGE_PANEL_MARGIN, zb - PASSAGE_PANEL_MARGIN,
                    DADO_PANEL_Y0, DADO_PANEL_Y1)
        build_panel(b, PWALL_W, za + PASSAGE_PANEL_MARGIN, zb - PASSAGE_PANEL_MARGIN,
                    UPPER_PANEL_BOTTOM, UPPER_PANEL_TOP_PASSAGE)
    for k in range(int((P_X1 - P_X0) / F5_PASSAGE_BAY_N)):
        c = P_X0 + (k + 0.5) * F5_PASSAGE_BAY_N
        build_panel(b, PWALL_N, c - F5_PASSAGE_BAY_N / 2.0 + PASSAGE_PANEL_MARGIN,
                    c + F5_PASSAGE_BAY_N / 2.0 - PASSAGE_PANEL_MARGIN,
                    DADO_PANEL_Y0, DADO_PANEL_Y1)
        build_panel(b, PWALL_N, c - F5_PASSAGE_BAY_N / 2.0 + PASSAGE_PANEL_MARGIN,
                    c + F5_PASSAGE_BAY_N / 2.0 - PASSAGE_PANEL_MARGIN,
                    UPPER_PANEL_BOTTOM, UPPER_PANEL_TOP_PASSAGE)


def build_endwall_families(b):
    """The datum wraps the gallery's east corners (internal mitres against the long walls'
    rails) and dies into the corner returns' plinths (no caps, solid-on-solid); the two
    flank runs stop DOOR_RAIL_STOP short of the jamb bands (exposed caps); one dado + one
    tall panel per flank."""
    rail_run(b, WALL_E, G_Z0, CORNER_RETURN_Z[0] - PLINTH_HALF_W, mitre0=1)
    rail_run(b, WALL_E, CORNER_RETURN_Z[0] + PLINTH_HALF_W, JAMB_BAND_Z[0] - DOOR_RAIL_STOP,
             cap1=True)
    rail_run(b, WALL_E, JAMB_BAND_Z[1] + DOOR_RAIL_STOP, CORNER_RETURN_Z[1] - PLINTH_HALF_W,
             cap0=True)
    rail_run(b, WALL_E, CORNER_RETURN_Z[1] + PLINTH_HALF_W, G_Z1, mitre1=1)
    build_panel(b, WALL_E, CORNER_RETURN_Z[0] + PLINTH_HALF_W + PANEL_INSET,
                JAMB_BAND_Z[0] - DOOR_RAIL_STOP - PANEL_INSET, DADO_PANEL_Y0, DADO_PANEL_Y1)
    build_panel(b, WALL_E, CORNER_RETURN_Z[0] + PLINTH_HALF_W + PANEL_INSET,
                JAMB_BAND_Z[0] - DOOR_RAIL_STOP - PANEL_INSET,
                UPPER_PANEL_BOTTOM, UPPER_PANEL_TOP_ENDWALL)
    build_panel(b, WALL_E, JAMB_BAND_Z[1] + DOOR_RAIL_STOP + PANEL_INSET,
                CORNER_RETURN_Z[1] - PLINTH_HALF_W - PANEL_INSET, DADO_PANEL_Y0, DADO_PANEL_Y1)
    build_panel(b, WALL_E, JAMB_BAND_Z[1] + DOOR_RAIL_STOP + PANEL_INSET,
                CORNER_RETURN_Z[1] - PLINTH_HALF_W - PANEL_INSET,
                UPPER_PANEL_BOTTOM, UPPER_PANEL_TOP_ENDWALL)


def build_wall_families(b):
    """The RG-F5 families, built by BOTH chains (the layout-identity law)."""
    n0 = len(b.roster)
    for plane in (WALL_S, WALL_N):
        build_gallery_dado(b, plane)
    build_passage_families(b)
    build_endwall_families(b)
    counts = {}
    for entry in b.roster[n0:]:
        if entry[3] not in FAMILY_ELEMENTS:
            fail(f'build_wall_families emitted a non-family element {entry[3]!r}')
        counts[entry[3]] = counts.get(entry[3], 0) + 1
    return counts


def _face_aabb(face):
    world = [to_w(v.co) for v in face.verts]
    return (min(w[0] for w in world), max(w[0] for w in world),
            min(w[1] for w in world), max(w[1] for w in world),
            min(w[2] for w in world), max(w[2] for w in world))


def _aabb_strict_overlap(a, b):
    """The positive-volume intersection: overlap > 1e-9 on every axis. A face with a
    zero-extent AABB axis can never satisfy it (the buried-face class below)."""
    return all(min(a[2 * i + 1], b[2 * i + 1]) - max(a[2 * i], b[2 * i]) > 1e-9
               for i in range(3))


def _aabb_centre(box):
    return tuple((box[2 * i] + box[2 * i + 1]) / 2.0 for i in range(3))


def _face_penetrates(box, collider_box):
    """(a) the strict overlap (the partial-penetration class) OR (b) the face's centroid
    inside the collider shrunk by 1e-6 (the buried-face class: a planar face inside a
    proud solid carries a zero AABB extent there and the strict test cannot see it -
    the review-pass BREAK: 'moving a connector 1 cm into a shaft can still yield zero
    offenders'). The shrink keeps the exact-boundary abutments (the ledge ends, the
    plinth contacts) unflagged."""
    if _aabb_strict_overlap(box, collider_box):
        return True
    c = _aabb_centre(box)
    return all(collider_box[2 * i] + 1e-6 <= c[i] <= collider_box[2 * i + 1] - 1e-6
               for i in range(3))


def gate_f5_collision(b):
    """RG-F5's own belt: no applied family face penetrates any committed proud element's
    AABB -
    the strict overlap (the partial class) or the centroid-in-shrunk-box (the buried
    class). The exact-boundary abutments (the ledge ends, the plinth contacts) touch on
    a zero-measure boundary and pass. The fields are NOT colliders (the families sit ON
    them); the sconce instances get their own belt (gate_f5_sconces, after the instances
    exist)."""
    colliders = [(_face_aabb(entry[0]), entry[3]) for entry in b.roster
                 if entry[3] in F5_COLLIDER_ELEMENTS]
    offenders = []
    for entry in b.roster:
        if entry[3] not in FAMILY_ELEMENTS:
            continue
        box = _face_aabb(entry[0])
        for cbox, el in colliders:
            if _face_penetrates(box, cbox):
                offenders.append({'family': entry[3], 'collider': el})
    return offenders


def gate_f5_sconces(scene, family_boxes):
    """The applied families' clearance from the SCONCE INSTANCES (the bay-skip law's own
    belt: the passage tall panels skip the 2 mouth-sconce bays by construction; this
    proves it - the shell-roster scan cannot see the separate sconce meshes). The faces'
    boxes are snapshotted BEFORE finish() frees the builder's bmesh."""
    sconce_boxes = []
    for obj in scene.objects:
        if obj.type == 'MESH' and obj.name.split('.')[0] == 'sconce':
            corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
            sconce_boxes.append((min(c.x for c in corners), max(c.x for c in corners),
                                 min(c.y for c in corners), max(c.y for c in corners),
                                 min(c.z for c in corners), max(c.z for c in corners)))
    offenders = []
    for box, el in family_boxes:
        for sbox in sconce_boxes:
            if _face_penetrates(box, sbox):
                offenders.append({'family': el, 'sconce': True})
    return offenders


def build_room(b):
    """The deterministic build order (the roster = the schedule's index)."""
    build_long_wall(b, WALL_S)
    build_long_wall(b, WALL_N)
    build_passage(b)
    build_vault_and_arches(b)
    build_floor(b)
    build_end_wall(b)
    # The layout-identity law (rastrelli-next round 4): the airlock set and the applied
    # families pack their own cells (W2-W4), and the pack is a function of the whole
    # roster, so both chains build them. RG-F5/F6's export-only guard is retired - its
    # premise ended with the borrowed class.
    build_airlock_set(b)
    build_wall_families(b)


COVERED_DUMP_PATH = '/private/var/folders/8x/yls1cw1d6s3fmbrxhqg0y17w0000gp/T/opencode/rg-verify/rgf2-covered-debug.json'


def covered_debug_dump(b, _covered):
    """Debug helper (env RGF2_DUMP_COVERED=1): dump the concrete face pairs (world verts)
    behind the COVERED offenders. Read-only - the real gate still fails."""
    debug = []
    for ea, fa, eb, fb, rep in covered_face_pairs(b)[:30]:
        debug.append({'pair': [ea, eb, rep],
                      'a_w': [[round(v, 3) for v in to_w(vert.co)] for vert in fa.verts],
                      'b_w': [[round(v, 3) for v in to_w(vert.co)] for vert in fb.verts]})
    with open(COVERED_DUMP_PATH, 'w', encoding='utf-8') as fh:
        json.dump(debug, fh, indent=1)


# ---- the junction proxies (the projected relief; batch B bakes them S2A) ----------------------
# THE JUNCTION LAW's delivery (the accepted verdict reply-2 §2, batch A): the relief exists
# only as BAKE PROXIES - never-exported meshes seated on the shipped surfaces, baked
# Selected-to-Active into the day+dusk lightmaps by batch B's bake.py S2A pass. Containment
# laws implemented here: the proxies join their own BAKE_PROXIES collection (no export
# collection), AND the exporter's own first-class exclusion: every object in the
# 'glTF_not_exported' collection is skipped by Blender 4.2's glTF exporter
# (io_scene_gltf2's gather-tree filter) - the proxies are excluded structurally at birth;
# every build belt-asserts the exported node names equal the committed glb's list
# (belt_export_nodes, fail-loud) - the O1/O1b containment rows (no new meshes, the exported
# node list identical). The proxy objects are render-hidden by default
# so the committed bake chain (the night plate's flat re-bake, the O4 spirit) reproduces
# byte-identically until batch B's S2A wiring flips visibility for its own passes; the
# proxies live outside the room's Builder roster, so the element schedule and the tri count
# are untouched by construction.
BAKE_PROXIES_COLLECTION = 'BAKE_PROXIES'
GLTF_NOT_EXPORTED_COLLECTION = 'glTF_not_exported'  # the exporter's own exclusion collection
PROXY_ARC_SUBDIVS = 4      # each fillet quarter's subdivisions (the shells' smooth shading)
PROXY_RUN_STEP_M = 1.0     # the straight cove runs' (cornice/impost) stationing step


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def wedge_fillet(origin, n_a, n_b, radius, subdivs):
    """One fillet cross-section in the corner of two surfaces with unit air normals n_a, n_b
    (both pointing into the air): the tangent points sit `radius` from each surface, the arc
    sweeps the short way between them and bulges toward the corner, and the per-point
    normals face the air (tangent to each host at its own tangent point). Returns
    (points, per-point air normals)."""
    dot = max(-1.0, min(1.0, sum(n_a[i] * n_b[i] for i in range(3))))
    bis = tuple(n_a[i] + n_b[i] for i in range(3))
    bis_len = math.sqrt(sum(c * c for c in bis)) or 1.0
    bis = tuple(c / bis_len for c in bis)
    # the interior wedge angle alpha = pi - beta (beta = the normals' angle); the centre sits
    # at radius/sin(alpha/2) along the bisector == radius*sqrt(2/(1+cos beta))
    centre = tuple(origin[i] + radius * math.sqrt(2.0 / (1.0 + dot)) * bis[i] for i in range(3))
    axis = _cross(n_a, n_b)
    axis_len = math.sqrt(sum(c * c for c in axis))
    if axis_len <= 1e-9:
        fail('wedge_fillet: the host normals are parallel (no corner to fillet)')
    axis = tuple(c / axis_len for c in axis)
    beta = math.acos(dot)
    pts, dirs = [], []
    for j in range(subdivs + 1):
        t = beta * j / subdivs
        v = tuple(-n_a[i] for i in range(3))
        uvx = _cross(axis, v)
        vv = sum(axis[i] * v[i] for i in range(3))
        ct, st = math.cos(t), math.sin(t)
        d = tuple(v[i] * ct + uvx[i] * st + axis[i] * vv * (1.0 - ct) for i in range(3))
        pts.append(tuple(centre[i] + radius * d[i] for i in range(3)))
        dirs.append(tuple(-d[i] for i in range(3)))
    return pts, dirs


def _avg_dir(dirs):
    total = tuple(sum(d[i] for d in dirs) for i in range(3))
    length = math.sqrt(sum(c * c for c in total)) or 1.0
    return tuple(c / length for c in total)


def cove_strip(pb, rings, ring_dirs, mat, element):
    """One swept fillet strip: quads between consecutive cross-section rings; each quad's
    authored normal is its four ring normals' average (the air-facing concave side) and the
    faces are smooth-shaded."""
    for ra, rb, da, db in zip(rings, rings[1:], ring_dirs, ring_dirs[1:]):
        for i in range(len(ra) - 1):
            pb.face([ra[i], ra[i + 1], rb[i + 1], rb[i]], mat, element,
                    _avg_dir((da[i], da[i + 1], db[i], db[i + 1])), smooth=True)


def build_rib_coves(pb, kit, mat):
    """22 rib-edge coves (11 ribs x 2 edges, the verdict's part list): fillet shells swept
    along the vault's arc rows (the G_ARC stations - the same 8-segment stationing the arch
    rows ride), seated in the vault--ring-face corner. The rib's ring plane x = x_c +- 
    ARCH_HALF_W cuts every vault facet at exactly 90 degrees (the facet planes carry the x
    direction), so each strip's cross-section is the 90-degree fillet: tangent to its vault
    facet at the corner offset by rib_cove_r along the ring normal, tangent to the ring face
    at the corner offset by rib_cove_r along the facet's air normal. The shell's vault-side
    boundary runs the FULL rib arc, spring to crown to spring, both edges (rib_cove_len);
    the ring-side boundary rides ~rib_cove_r into the ring face (inside the ring band: the
    arch/vault clearance is 0.17693 and the cove's 0.05 fits it; the two spring-end
    cross-sections dip ~3.5 cm below the spring line, buried in the ressaut/cornice-top
    material - invisible to the bake). One ring
    per station (that station's own facet's normals) chains the strips: the vault-side
    boundary is exact and continuous, the cross-sections twist ~1-3 mm at the vault's own 8
    station edges (the faceted host's vertex breaks; the form is provisional per the
    license row)."""
    radius = kit['rib_cove_r']
    parts = 0
    for x_c in PILASTER_X:
        for s in (-1.0, 1.0):
            x_e = x_c + s * ARCH_HALF_W
            n_b = (s, 0.0, 0.0)                      # the rib's ring face: its air normal
            rings, dirs = [], []
            for k in range(G_ARC_SEGS):
                (za, ya), (zb, yb) = G_ARC[k], G_ARC[k + 1]
                slope = (yb - ya) / (zb - za)
                norm = math.sqrt(1.0 + slope * slope)
                n_a = (0.0, -1.0 / norm, slope / norm)   # the vault facet's air normal
                for origin, is_end in (((x_e, ya, za), False), ((x_e, yb, zb), True)):
                    if is_end and k < G_ARC_SEGS - 1:
                        continue     # the next facet's strip re-rings this station
                    ring, dir_ = wedge_fillet(origin, n_a, n_b, radius, PROXY_ARC_SUBDIVS)
                    rings.append(ring)
                    dirs.append(dir_)
            cove_strip(pb, rings, dirs, mat, 'junction.rib_cove')
            parts += 1
    if parts != len(PILASTER_X) * 2:
        fail(f'the rib coves emitted {parts} parts, expected {len(PILASTER_X) * 2}')


def build_springers(pb, kit, mat):
    """22 springers (11 rib feet x 2 walls): chamfered blocks seated on the ressaut top
    strips where arch=True. The core spans the rib's width (springer_w == ARCH_WIDTH, the
    builder's own assert pins it); the per-side projections fill the seat wings exactly
    (springer_proj == RESSAUT_HALF_W - ARCH_HALF_W, flush with the ressaut edges - the S0 D3
    flush fact), so the block's footprint is the ressaut top's own rectangle; the block
    rises springer_h off the ressaut top (y G_SPRING) across the seat's full depth (proud
    0..RESSAUT_PROUD, from the wall plane to the arch foot line); the room-facing top edge
    is chamfered at 45 degrees with the springer_proj leg - the chamfered front top lands
    just under the faceted vault surface at the foot line (G_SPRING + springer_h -
    springer_proj = 3.24 vs the vault's 3.2451 there)."""
    leg = kit['springer_proj']
    height = kit['springer_h']
    half_core = kit['springer_w'] / 2.0
    half_outer = half_core + leg
    parts = 0
    for x_c in PILASTER_X:
        for z_wall, in_dir in ((G_Z0, 1.0), (G_Z1, -1.0)):
            z_room = z_wall + in_dir * RESSAUT_PROUD        # the arch foot line
            z_chamfer = z_room - in_dir * leg               # the top face's room edge
            y_top = G_SPRING + height
            y_chamfer = y_top - leg
            x0, x1 = x_c - half_outer, x_c + half_outer
            el = 'junction.springer'
            pb.face([(x0, G_SPRING, z_wall), (x1, G_SPRING, z_wall),
                     (x1, G_SPRING, z_room), (x0, G_SPRING, z_room)], mat, el, (0.0, -1.0, 0.0))
            pb.face([(x0, y_top, z_wall), (x1, y_top, z_wall),
                     (x1, y_top, z_chamfer), (x0, y_top, z_chamfer)], mat, el, (0.0, 1.0, 0.0))
            pb.face([(x0, G_SPRING, z_room), (x1, G_SPRING, z_room),
                     (x1, y_chamfer, z_room), (x0, y_chamfer, z_room)],
                    mat, el, (0.0, 0.0, in_dir))
            pb.face([(x0, G_SPRING, z_wall), (x1, G_SPRING, z_wall),
                     (x1, y_top, z_wall), (x0, y_top, z_wall)], mat, el, (0.0, 0.0, -in_dir))
            for x, x_normal in ((x0, -1.0), (x1, 1.0)):
                pb.face([(x, G_SPRING, z_wall), (x, G_SPRING, z_room),
                         (x, y_chamfer, z_room), (x, y_top, z_chamfer), (x, y_top, z_wall)],
                        mat, el, (x_normal, 0.0, 0.0))
            pb.face([(x0, y_chamfer, z_room), (x1, y_chamfer, z_room),
                     (x1, y_top, z_chamfer), (x0, y_top, z_chamfer)],
                    mat, el, (0.0, leg, in_dir * leg))
            parts += 1
    if parts != len(PILASTER_X) * 2:
        fail(f'the springers emitted {parts} parts, expected {len(PILASTER_X) * 2}')


def gallery_facet_normal(z_wall, in_dir):
    """The gallery vault's spring-facet air normal at the south (+1) or north (-1) wall:
    the facet plane's slope is signed, the air rides below the facet."""
    (z0, y0), (z1, y1) = (G_ARC[0], G_ARC[1]) if in_dir > 0 else (G_ARC[-1], G_ARC[-2])
    slope = (y1 - y0) / (z1 - z0)
    norm = math.sqrt(1.0 + slope * slope)
    return (0.0, -1.0 / norm, slope / norm)


def passage_facet_normal(side):
    """The passage vault's spring-facet air normal at the west (-1) or east (+1) wall."""
    (x0, y0), (x1, y1) = (P_ARC[0], P_ARC[1]) if side < 0 else (P_ARC[-1], P_ARC[-2])
    slope = (y1 - y0) / (x1 - x0)
    norm = math.sqrt(1.0 + slope * slope)
    return (slope / norm, -1.0 / norm, 0.0)


def build_cornice_coves(pb, kit, mat):
    """The cornice-top coves (cornice_cove_r, the verdict's part list): both long-wall
    cornice tops at y 3.00 - the corner each top's back edge makes with the gallery vault's
    spring facet (a ~45-degree wedge: the faceted vault's first facet rises at its own
    slope) - plus the 4 end-wall runs, where the corner is the end-wall cornice top against
    the tympanum band (90 degrees). The spans are the cornice runs' own spans
    (build_end_wall's cornice_run calls: the corner returns + END_CORNICE_BREAK); the cross-
    section is constant along each run."""
    radius = kit['cornice_cove_r']
    end_spans = (
        (G_Z0, CORNER_RETURN_Z[0] - RESSAUT_HALF_W),
        (CORNER_RETURN_Z[0] + RESSAUT_HALF_W, G_Z0 + END_CORNICE_BREAK),
        (G_Z1 - END_CORNICE_BREAK, CORNER_RETURN_Z[1] - RESSAUT_HALF_W),
        (CORNER_RETURN_Z[1] + RESSAUT_HALF_W, G_Z1),
    )
    runs = [
        (G_X0, G_X1, lambda x, _z=G_Z0: (x, G_SPRING, _z), gallery_facet_normal(G_Z0, 1.0)),
        (G_X0, G_X1, lambda x, _z=G_Z1: (x, G_SPRING, _z), gallery_facet_normal(G_Z1, -1.0)),
    ] + [
        (t0, t1, lambda z, _x=G_X1: (_x, G_SPRING, z), (-1.0, 0.0, 0.0))
        for t0, t1 in end_spans
    ]
    emit_cove_runs(pb, runs, radius, mat, 'junction.cornice_cove', len(runs))


def build_impost_coves(pb, kit, mat):
    """The impost cove (impost_cove_r, the verdict's part list) along the passage impost
    caps: the corner each impost top's back edge (y P_SPRING at the wall plane) makes with
    the passage vault's spring facet on the W and E walls (the E wall's band is split by the
    gallery opening: two runs) and with the passage tympanum on the N wall (90 degrees)."""
    radius = kit['impost_cove_r']
    runs = [
        (P_Z0, P_Z1, lambda z, _x=P_X0: (_x, P_SPRING, z), passage_facet_normal(-1.0)),
        (P_Z0, G_Z0, lambda z, _x=P_X1: (_x, P_SPRING, z), passage_facet_normal(1.0)),
        (G_Z1, P_Z1, lambda z, _x=P_X1: (_x, P_SPRING, z), passage_facet_normal(1.0)),
        (P_X0, P_X1, lambda x, _z=P_Z0: (x, P_SPRING, _z), (0.0, 0.0, 1.0)),
    ]
    emit_cove_runs(pb, runs, radius, mat, 'junction.impost_cove', len(runs))


def emit_cove_runs(pb, runs, radius, mat, element, expected):
    """The straight fillet runs: each run is (t0, t1, origin_fn, n_b) - the corner line from
    t0 to t1 with the horizontal impost/cornice top (air normal UP) on one side and the
    vertical host face (air normal n_b) on the other. The cross-section is constant along
    the run, extruded in PROXY_RUN_STEP_M steps (endpoints exact)."""
    parts = 0
    for t0, t1, origin_fn, n_b in runs:
        steps = max(1, int(math.ceil((t1 - t0) / PROXY_RUN_STEP_M)))
        rings, dirs = [], []
        for k in range(steps + 1):
            t = t0 + (t1 - t0) * k / steps
            ring, dir_ = wedge_fillet(origin_fn(t), UP, n_b, radius, PROXY_ARC_SUBDIVS)
            rings.append(ring)
            dirs.append(dir_)
        cove_strip(pb, rings, dirs, mat, element)
        parts += 1
    if parts != expected:
        fail(f'{element} emitted {parts} runs, expected {expected}')


def proxy_mesh_object(name, pbuild, collection, material):
    """One proxy mesh + object: identity transform (the geometry is world-authored through
    to_b, the shell's convention), the flat junction material, render-hidden so the
    committed bake chain reproduces byte-identically until batch B flips visibility."""
    pbuild.bm.normal_update()
    me = bpy.data.meshes.new(name)
    pbuild.bm.to_mesh(me)
    pbuild.bm.free()
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    ob.hide_render = True
    return ob


def build_junction_proxies(kit):
    """THE JUNCTION PROXIES (see the block comment above): the BAKE_PROXIES collection's
    four part objects, built deterministically from the kit's own constants and seated on
    the shipped surfaces - 22 rib-edge coves, 22 springers, the cornice-top coves (both
    long-wall tops + the 4 end-wall runs) and the impost cove along the passage impost
    caps. Returns the collection."""
    # the proxy mesh carries ONE material slot (the flat junction stucco); the part builders
    # take the slot INDEX (the Builder's face() law), the object takes the material itself.
    proxy_mat = flat_material('junction_proxy', STUCCO_GREY_RGB, 0.92)
    collection = bpy.data.collections.new(BAKE_PROXIES_COLLECTION)
    bpy.context.scene.collection.children.link(collection)
    # the explicit export-exclusion: the exporter's own first-class law - every object in
    # the 'glTF_not_exported' collection is skipped by Blender 4.2's glTF exporter
    # (io_scene_gltf2's gather-tree filter), so the proxies are excluded structurally, at
    # birth; the collection itself stays unlinked from the scene (a membership law only).
    excluded = bpy.data.collections.new(GLTF_NOT_EXPORTED_COLLECTION)
    for name, part_build in (
        ('junction.rib_coves', lambda pb: build_rib_coves(pb, kit, 0)),
        ('junction.springers', lambda pb: build_springers(pb, kit, 0)),
        ('junction.cornice_coves', lambda pb: build_cornice_coves(pb, kit, 0)),
        ('junction.impost_coves', lambda pb: build_impost_coves(pb, kit, 0)),
    ):
        pb = Builder()
        part_build(pb)
        ob = proxy_mesh_object(name, pb, collection, proxy_mat)
        excluded.objects.link(ob)
    return collection


def committed_glb_path():
    """The node-list belt's reference: the room's committed glb (repo-relative to this file)."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                        'public', 'assets', ROOM_ID, f'{ROOM_ID}.glb')


def glb_node_names(path):
    """A GLB's node names in file order (pure python: the JSON chunk only)."""
    with open(path, 'rb') as fh:
        buf = fh.read()
    if len(buf) < 20 or buf[:4] != b'glTF' or int.from_bytes(buf[4:8], 'little') != 2:
        fail(f'not a glTF v2 GLB: {path}')
    if int.from_bytes(buf[16:20], 'little') != 0x4E4F534A:
        fail(f'the first GLB chunk is not JSON: {path}')
    json_len = int.from_bytes(buf[12:16], 'little')
    document = json.loads(buf[20:20 + json_len].decode('utf-8'))
    return [str(node.get('name', '')) for node in document.get('nodes', [])]


def belt_export_nodes(glb_path):
    """THE JUNCTION BELT (the O1/O1b containment law, fail-loud): the exported node names
    must equal the committed glb's list exactly, in order - the proxies must leave zero
    trace in the glb (no new meshes, the exported node list identical)."""
    exported = glb_node_names(glb_path)
    reference = committed_glb_path()
    if not os.path.exists(reference):
        fail(f'the node-list belt cannot run: no committed glb at {reference}')
    committed = glb_node_names(reference)
    if exported != committed:
        fail('the exported node list drifted from the committed glb - '
             f'exported {exported} vs committed {committed}')


def main():
    stage = stage_dir()
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # the element schedule is authored BEFORE geometry: a pure 2-D enumeration over the
    # plan formulas (the Sol amendment; the law's order now literal).
    schedule = author_schedule()
    b = Builder()
    build_room(b)

    # bmesh lazily computes face normals — update BEFORE the authored-data gates read them.
    b.bm.normal_update()

    # the authored-data gates (the verdict 2.1(c)): FACING, COVERED — element names, not
    # probe shards; the schedule closes it (2.1(d)).
    facing = gate_facing(b)
    if facing:
        fail('FACING offenders: ' + json.dumps({k: v[:3] for k, v in facing.items()}))
    covered = gate_covered(b)
    if covered:
        if os.environ.get('RGF2_DUMP_COVERED'):
            covered_debug_dump(b, covered)
        fail('COVERED offenders: ' + json.dumps(covered))
    schedule = check_schedule(b, schedule)
    if not BAKE:
        collisions = gate_f5_collision(b)
        if collisions:
            fail('F5 COLLISION offenders: ' + json.dumps(collisions[:8]))
        # the family boxes ride the sconce belt AFTER the instances exist (the bmesh
        # frees at finish - the faces are dead by then, the boxes are the snapshot)
        family_boxes = [(_face_aabb(entry[0]), entry[3]) for entry in b.roster
                        if entry[3] in FAMILY_ELEMENTS]

    img_stone, png_stone = write_texture('stone_flags', stone_flags_px, tex_dir)
    img_pale, png_pale = write_texture('plaster_pale', plaster_pale_px, tex_dir)
    img_stucco, png_stucco = write_texture('stucco_grey', stucco_grey_px, tex_dir)
    img_band, png_band = write_texture('stone_band', stone_band_px, tex_dir)
    mat_stone = material('stone_flags', img_stone)
    mat_pale = material('plaster_pale', img_pale)
    mat_stucco = material('stucco_grey', img_stucco)
    mat_band = material('stone_band', img_band)
    mat_stair = flat_material('stairlight', (1.0, 1.0, 1.0), 1.0)
    mat_pane = flat_material('pane', (1.0, 1.0, 1.0), 1.0)   # (RG-F3) flat white, roughness 1.0
    mat_iron = flat_material('iron_dark', IRON_RGB, IRON_ROUGHNESS)
    mat_glow = flat_material('sconce_glow', GLOW_TINT_RGB, 0.92, emission=SCONCE_GLOW_RGB)
    # RG-F5: the fillet-shade device (flat, no texture row). The layout-identity law: the
    # 7th and 8th slots exist in BOTH chains - the family faces carry these slot indices,
    # and a bake face whose slot holds no material carries no target node and inks nothing.
    mat_shade = flat_material('stucco_shade', M_STUCCO_SHADE_RGB, 0.92)
    shell_slots = [mat_pale, mat_stone, mat_stucco, mat_band, mat_stair, mat_pane]
    shell_slots.append(mat_shade)
    # RG-F6: the airlock shade (the 8th shell slot; the box's reveal/soffit faces ride it).
    shell_slots.append(flat_material('stucco_shade_airlock', M_STUCCO_SHADE_AIRLOCK_RGB, 0.92))
    me_shell, t_shell, lm_shell = finish(
        'shell', b, shell_slots, mode='shelf')

    if BAKE:
        # the layout-identity law: the bake chain writes the lm block it packed to the path
        # bake.py names (I/O only). The object is the one the export summary carries as
        # `lm`, so one reader serves both; the sconce's strip is not the layout.
        layout_out = os.environ.get('ZIMNY_LM_LAYOUT_OUT')
        if not layout_out:
            fail('ZIMNY_BAKE=1 needs ZIMNY_LM_LAYOUT_OUT (the layout-identity law)')
        with open(layout_out, 'w', encoding='utf-8') as fh:
            json.dump({'lm': lm_shell}, fh, indent=1, sort_keys=True)
            fh.write('\n')
    if BAKE:
        # BATCH B's S2A wiring (the junction law): bake.py reads the shell's face→element
        # map straight from this exec namespace — the roster order IS the mesh polygon
        # order (the dump_layout belt's correspondence), and the bake stage prints no
        # summary, so the map rides here instead of a stage file. The strip cells are the
        # sconce datablock's; the S2A targets are all shell elements.
        globals()['LM_FACE_ELEMENTS'] = tuple(row['element'] for row in lm_shell['cells'])
    sconce_b = build_sconce()
    me_sconce, t_sconce, lm_strip = finish(
        'sconce', sconce_b, [mat_iron, mat_glow], mode='strip')
    instance('shell', me_shell, (0.0, 0.0, 0.0))
    for x in SCONCE_X:  # 12 sconces on the odd pilasters' shaft planes
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z0 + SCONCE_MOUNT_D))
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z1 - SCONCE_MOUNT_D), math.pi)
    for z in SCONCE_SEW_Z:  # 2 passage-mouth sconces on the passage's east wall, facing west
        instance('sconce', me_sconce, (P_X1, SCONCE_Y, z), -math.pi / 2)
    if not BAKE:
        sconce_offenders = gate_f5_sconces(bpy.context.scene, family_boxes)
        if sconce_offenders:
            fail('F5 SCONCE offenders: ' + json.dumps(sconce_offenders[:8]))
    build_junction_proxies(JUNCTION)
    if BAKE:
        return
    glb_path = os.path.join(stage, f'{ROOM_ID}.raw.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    belt_export_nodes(glb_path)
    meshes = {
        # RG-F5: the shell's 7th primitive is the 'stucco_shade' slot (export chain only -
        # the bake chain returns before this point). RG-F6 adds the 8th: the airlock's
        # 'stucco_shade_airlock' slot (the same exported-only law).
        'shell': {'triangles': t_shell, 'instances': 1, 'primitives': 8},
        'sconce': {'triangles': t_sconce, 'instances': SCONCE_COUNT, 'primitives': 2},
    }
    lm_block = dict(lm_shell)
    lm_block['strip'] = lm_strip
    summary = {
        'room': ROOM_ID,
        'glb': glb_path,
        'textures': {'stone_flags': png_stone, 'plaster_pale': png_pale,
                     'stucco_grey': png_stucco, 'stone_band': png_band},
        'meshes': meshes,
        'triangles': sum(m['triangles'] * m['instances'] for m in meshes.values()),
        'trianglesUnique': sum(m['triangles'] for m in meshes.values()),
        'drawsNaive': sum(m['primitives'] * m['instances'] for m in meshes.values()),
        'drawsUniquePrimitives': sum(m['primitives'] for m in meshes.values()),
        'schedule': schedule,
        'patches': dict(lm_block['patches']),
        'gates': {'facing': 0, 'covered': 0, 'scheduleCheck': 'equal'},
        'declared': {
            'bayPitchM': BAY_PITCH,
            'pilasters': PILASTER_COUNT,
            'sconces': SCONCE_COUNT,
            'sconceEmission': SCONCE_EMISSION,
            'sconceSegments': SCONCE_SEGS,
            'nicheCount': len(NICHE_CENTRES) * 2,
            'ribCount': len(PILASTER_X),
            'ribClearanceM': round(ARCH_CLEARANCE_M, 4),
            'doorJambWidthM': DOOR_JAMB_W,
            'doorJambProudM': DOOR_JAMB_PROUD,
            'lunetteRadiusM': LUNETTE_R,
            'corniceProudM': CORNICE_PROUD,
            'ressautProudM': RESSAUT_PROUD,
            'passageVault': PASSAGE_VAULT,
            'galleryVault': GALLERY_VAULT,
            'uvTileM': UV_TILE_M,
            'lmRes': LM_RES,
            'filletAo': FILLET_AO,
            'panelBandW': PANEL_BAND_W,
            'panelBandProud': PANEL_BAND_PROUD,
            'panelInset': PANEL_INSET,
            'railStop': RAIL_STOP,
            'doorRailStop': DOOR_RAIL_STOP,
        },
        'lm': lm_block,
    }
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as fh:
        json.dump(summary, fh, sort_keys=True, indent=2)
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')), flush=True)


main()
