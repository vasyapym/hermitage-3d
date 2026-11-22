"""jordan-fixtures B1 — the sconce archetype and its own sub-cell lightmap packer.

The round's law (jordan-lack-ruling.md §B1/§B4, ACCEPTANCE #1/#4/#6, the glow ruling
§a/§b/§e + GLOW-RULING-ACCEPTANCE): ONE sconce archetype (gilt cartouche + 3 arms + 3
pans; sconce_glow candle bodies + flame chips; opaque crystal drops), instanced ×10 by
jordan.py's committed put rows; THREE primitives (the draw gate counts unique
primitives); the archetype's own sub-cell LM packer replaces the committed
one-cell-per-mesh-FACE law for this datablock. This module NEVER imports jordan.py: the
kit helpers (MeshBuilder / kit_solid / kit_circle / kit_octahedron / make_material /
box_uv / newell / surface_projection ...), the anchor tables (SCONCE_ABOVE,
SCONCE_WEST_Z, SCONCE_NORTH_X, SCONCE_EAST, FLIGHTS, flight_datum, X_W/X_E/Z_N ...) and
every other namespace constant it needs arrive inside the `kit` namespace dict that
jordan.py's ONE hook passes (the caller's live globals dict — the module reads and
publishes through it, it never imports the builder).

Determinism law: no randomness, construction-order iteration only, the builder's r6
float rounding on every published derived number. Template coords are glTF world axes
(+X east, +Y up, +Z south; the wall plane at local z=0 projecting toward -Z); jordan.py's
to_b converts to Blender (x, -z, y) at realize time.

Cell scheme (measured; see the B1 report): the allocator counter consumes one cell per
`b.faces` entry and the committed invariant `cells == len(LM_CELL_MAP['cells'])` binds
the map size to it; the meshes downstream of the sconce row (cornice .. window_frame_hi,
cells 3107..3473) take their UV2 offsets from that counter, so it must keep consuming
exactly the datablock's 12 cells — the "12 freed + ≤6 FIXTURE_LM_BLOCK rows" arithmetic
is impossible against the committed code (the block holds 6 cells, the invariant wants
12 rows, and any other counter consumption shifts the downstream UV2 bytes and breaks
the NO-REPACK law K1). Therefore the archetype packs its islands sub-cell into its OWN
12 retired cells — 3095..3106 (keys '23,48'..'34,48') under the fixtures-round layout,
re-seated by the jordan-parallel plafond round's geometry shift to 2993..3004 (keys
'49,46'..'60,46' — the same linear 384×32 px strip, flanked by the chandelier's range
tail and the cornice), and FIXTURE_LM_BLOCK stays free for B2's chandelier. The census
figure becomes 3,372 (3474 − 102: the shell's −180 coffer faces, the field +20 and the
frame +58), the D5 self-check follows the pins, the AS-3 claim (≤20 cells inside the
block + the retired placeholder cells) holds, and every cells.json row stays truthful:
12 cells, each carrying real single-material texels.
"""

import math

import bpy

# --- B1 pins (jordan-lack-ruling.md §B1; the glow ruling §b; ranges quoted) ---------
SCONCE_COUNT = 10                       # asserted against jordan.py's committed tables
SCONCE_ARMS = 3                         # the middle arm on the plate axis
SCONCE_BACKPLATE_W = 0.22               # (0.18–0.26)
SCONCE_BACKPLATE_H = 0.62               # (0.50–0.70)
SCONCE_BACKPLATE_D = 0.03
SCONCE_ARM_REACH = 0.40                 # (0.28–0.40) — the lever's ceiling: the measured
                                        # committed rig lamp sits 0.63 off the wall, not
                                        # 0.34±0.03, so the lever fires toward the lamp and
                                        # 0.40 is the closest the range permits (it also
                                        # minimizes the gaze miss and keeps the derived lamp
                                        # nearest the committed 0.63)
SCONCE_ARM_REACH_RANGE = (0.28, 0.40)
SCONCE_ARM_SPREAD_DEG = 48.0            # the two outer arms' yaw
SCONCE_ARM_RADIUS = 0.014
SCONCE_ARM_STEPS = 6                    # step rings along the arm path
SCONCE_ARM_SIDES = 5
SCONCE_PAN_RADIUS = 0.055
SCONCE_PAN_SIDES = 8
SCONCE_PAN_H = 0.012                    # derived (dish height; not a ruling pin)
SCONCE_PAN_BOTTOM_R = 0.04              # derived (dish taper; not a ruling pin)
SCONCE_CANDLE_RADIUS = 0.016
SCONCE_CANDLE_H = 0.16
SCONCE_CANDLE_SIDES = 6
SCONCE_FLAME_H = 0.07                   # the glow ruling: FLAME_H 0.07 / FLAME_R 0.018 final
SCONCE_FLAME_R = 0.018
SCONCE_DROPS = 3                        # one crystal drop under each pan
SCONCE_TRI_CAP = 520                    # the archetype, all primitives; drawn 5,200
SCONCE_GAZE_TOL = 0.15                  # unreachable within the pinned reach (see _assert_pins)
SCONCE_GAZE_IMPROVE_M = 0.3106          # the B0-measured placeholder's bbox-centre miss —
                                        # the binding law here: the new form must do better
SCONCE_GAZE_POINT = (75.1, 9.5, -85.5)  # rooms/jordan/contract.ts FLIGHT2_SCONCE (J1b subject)
SCONCE_GAZE_INSTANCE = 1                # SCONCE_NORTH_X index 1 = sconce.006, the gaze subject
# The glow pins (the glow ruling §b P1/P2; GLOW_AREA_PARITY is retired).
GLOW_AREA_BAND_SCONCE = (0.055, 0.100)  # m² per instance, glow-class primitives only
GLOW_ANCHOR_TOL = 0.03                  # the chips' centroid vs the rig lamp (the height law)
GLOW_CENTROID_ABOVE_PAN_TOP = 0.115     # the ruling's clarified centroid offset
# The crystal (the ruling B3; opaque plain PBR — no alpha/transmission/extensions).
CRYSTAL_NAME = 'crystal'
CRYSTAL_BASE = (0.90, 0.92, 0.95)
CRYSTAL_METALLIC = 0.6                  # (0.5–0.8)
CRYSTAL_ROUGHNESS = 0.12                # (0.08–0.20)
CRYSTAL_BEAD_R = 0.022
CRYSTAL_DROP_H = 0.07
# The bake rig's sconce lamp constants, quoted from tools/bpy/bake.py (never re-authored:
# the rig law does not move; the lamp POSITION derives from the published namespace box).
JORDAN_RIG_FRONT = 0.15                 # bake.py :279 — the lamp's offset beyond the far face
JORDAN_RIG_FRONT_HEIGHT = 0.25          # the committed lamp height above the mount datum
                                        # (bake.py up = (0.05+0.45)/2 of the placeholder box)
# --- the sub-cell packer pins (the ruling B4; ACCEPTANCE #1 re-means FIXTURE_LM_SCALE) ---
FIXTURE_LM_SCALE = 0.25                 # texel density vs the room's (area factor 0.0625)
FIXTURE_LM_PAD_PX = 2                   # pad per island side
FIXTURE_LM_MIN_PX = 4                   # minimum island INTERIOR per axis (real texels —
                                        # the bake must be able to light the gilt; a 4px box
                                        # with 2px pads would carry no content at all)
ROOM_LM_CELLS = 3372                    # the atlas occupancy (the B0 census measured 3,474 at
                                        # main @ 3da446d; the plafond round's −102 shift re-measures)
ROOM_LM_AREA_M2 = 4888.706423           # the measured lightmapped surface (the B4 estimate's
                                        # own formula, with the measured area; the plafond
                                        # round re-measured: 4910.658490 − 21.952067 — the
                                        # coffers' removed area 256.01, the field 198.53 +
                                        # the frame 35.53 landed back)
ROOM_TEXELS_PER_M = (ROOM_LM_CELLS * 32.0 * 32.0 / ROOM_LM_AREA_M2) ** 0.5
FIXTURE_TEXELS_PER_M = FIXTURE_LM_SCALE * ROOM_TEXELS_PER_M
# The datablock's own retired cells (linear; keys '49,46'..'60,46' at row 46). The B0
# census measured the placeholder sconce's cells at 3095 (row 48, cols 23..34); the
# jordan-parallel plafond round's geometry shift (the shell −180 coffer faces, the
# field +20 and the frame +58 inserted after the pane) moves every later first_cell
# by −102, so the retired range re-seats at 2993 — the census copy, never hand-set.
SCONCE_LM_CELLS = 12
SCONCE_LM_FIRST_CELL = 2993
SCONCE_LM_CELL_KEY_0 = (49, 46)
# The archetype's slots (the runner row's materials order; one glTF primitive per slot).
SLOT_GILT, SLOT_GLOW, SLOT_CRYSTAL = 0, 1, 2
SCONCE_MATERIALS = ['gilt', 'sconce_glow', CRYSTAL_NAME]

# --- B2 pins (jordan-lack-ruling.md §B2/§B3; ACCEPTANCE #2/#5; the glow ruling §a/§b) ---
CHANDELIER_TIERS = 3
CHANDELIER_ARMS = (16, 12, 8)           # low to high = 36
CHANDELIER_TIER_RADIUS = (1.40, 1.00, 0.60)
CHANDELIER_TIER_DY = 0.85
CHANDELIER_ENVELOPE_GROW = 0.10         # the new bbox must sit inside the placeholder's, grown
CHANDELIER_FIT_CAP = 1.0                # the envelope is LOOSER (the census's implied 1.2286), so
                                        # FIT = 1 and the pinned radii/DY stand — asserted below
CHANDELIER_ARM_REACH = 0.40             # mount plane to pan axis (the sconce's class; the mounts
                                        # ride the stem profile at r_i − reach, so the ONE
                                        # unscaled archetype serves all three tiers)
CHANDELIER_ARM_MOUNT_DROP = 0.06        # the mount sits this far below the pan top → the scroll's
                                        # rise is 0.034 (the arm root's ring dip ~0.0139 stays
                                        # above the drops, so the DROPS bind the min-y fence)
CHANDELIER_ARM_RADIUS = 0.014           # the sconce's class
CHANDELIER_ARM_STEPS = 6
CHANDELIER_ARM_SIDES = 5
CHANDELIER_PAN_RADIUS = 0.055           # mirrors the sconce's pan
CHANDELIER_PAN_SIDES = 8
CHANDELIER_PAN_H = 0.012                # derived (the sconce's dish height)
CHANDELIER_PAN_BOTTOM_R = 0.04          # derived (the dish taper)
CHANDELIER_CANDLE_RADIUS = 0.016        # the glow ruling: the chandelier's candle mirrors the
CHANDELIER_CANDLE_H = 0.16              # sconce's unless the table sets its own — it doesn't
CHANDELIER_CANDLE_SIDES = 6
CHANDELIER_FLAME_H = 0.07               # the glow ruling: FLAME_H/FLAME_R final
CHANDELIER_FLAME_R = 0.018
CHANDELIER_DROPS = 2                    # crystal drops under each pan, ±0.028 along the arm axis
CHANDELIER_DROP_X = 0.028
CHANDELIER_STEM_SIDES = 16
CHANDELIER_STEM_RINGS = 14              # one lathe: ceiling rose + vase stem + bowl
CHANDELIER_FESTOON_BEADS = 7            # per span; 36 spans = the tiers' arm counts' sum
CHANDELIER_FESTOON_SAG = 0.04           # the swag's dip; fence-clamped (the dips' bead bottoms
                                        # stay above the drops' fence floor on every tier)
CHANDELIER_PENDANTS = 48                # 24 mid-tier rim + 16 top-tier rim + 8 top-tier festoon dip
CHANDELIER_TRI_CAP = 9800               # drawn (36×150 + 900 + 300×8 + reserve)
CHANDELIER_UNIQUE_CAP = 2400
CHANDELIER_ARM_TRI_CAP = 150            # the arm archetype, all primitives
GLOW_AREA_BAND_CHANDELIER = (0.70, 1.10)  # the glow ruling P1 (36 arms × candle + flame)
# The bead: an octahedron, r 0.022 pinned (the ruling CRYSTAL_BEAD_R); its height is free —
# 0.06 (not the drop's 0.07) so the bead mesh is not a byte-identical twin of the arm
# archetype's drops (the driver's dedup step must not merge the two meshes).
CRYSTAL_BEAD_H = 0.06
# bake.py's core-lamp constants, quoted (the rig law does not move; the derivation below
# replicates bake.py's lower-to-clear descent from the kit's own CHAND_* rows).
JORDAN_RIG_CORE_BASE_Y = 14.3           # bake.py :283
JORDAN_RIG_CORE_STEP = 0.005            # bake.py :284
JORDAN_RIG_CORE_RADIUS = 0.20           # bake.py :287 JORDAN_RIG_CORE.radius_m
JORDAN_RIG_CORE_GAP = 0.05              # bake.py :282
# The chandelier's own retired cells: the placeholder's region, linear 2779..2992 (the B0
# census measured 2881..3094; the plafond round's geometry shift moves every later
# first_cell by −102). The three datablocks split exactly these 214 (the allocator
# counter and every downstream UV2 offset stay untouched; cells stay 3,372 predicted;
# FIXTURE_LM_BLOCK stays free).
CHANDELIER_LM_FIRST_CELL = 2779
CHANDELIER_LM_CELLS = 214

_KIT = None  # the caller's namespace dict, stored by fixture_rows (never jordan.py's module)
_CHAND_STATE = None  # the B2 module state: the pack plans, the rosters, the assembly rows


def _k(name):
    if _KIT is None or name not in _KIT:
        raise RuntimeError(f'jordan_fixtures: the kit lacks {name!r} (the hook must pass the '
                           'builder namespace: the kit helpers, the anchor tables, the LM '
                           'allocator constants)')
    return _KIT[name]


# --- the archetype's derived stack (template coords; the anchor chain) -------------
# The rig lamp's height plane (the mount datum + 0.25, the committed up) minus the
# ruling's centroid offset gives the pan top: 0.25 − 0.115 = 0.135 ("pan top sits
# 0.115 below the rig lamp y"). The candle stack and the drops follow.
PAN_TOP_Y = round(JORDAN_RIG_FRONT_HEIGHT - GLOW_CENTROID_ABOVE_PAN_TOP, 6)
CANDLE_BASE_Y = PAN_TOP_Y
CANDLE_TOP_Y = round(PAN_TOP_Y + SCONCE_CANDLE_H, 6)
FLAME_BASE_Y = CANDLE_TOP_Y
FLAME_EQ_Y = round(FLAME_BASE_Y + SCONCE_FLAME_H / 2.0, 6)
FLAME_APEX_Y = round(FLAME_BASE_Y + SCONCE_FLAME_H, 6)
STACK_TOP_Y = FLAME_APEX_Y
PAN_BOTTOM_Y = round(PAN_TOP_Y - SCONCE_PAN_H, 6)
DROP_CENTRE_Y = round(PAN_BOTTOM_Y - CRYSTAL_DROP_H / 2.0, 6)
ARM_ROOT_Z = -SCONCE_BACKPLATE_D        # the arms leave the plate's front face
ARM_ROOT_Y = 0.02                       # just above the plate's derived centre line
ARM_END_Y = round(PAN_BOTTOM_Y - SCONCE_ARM_RADIUS, 6)  # the tube's top tucks under the pan
ARM_YAWS = (0.0, -SCONCE_ARM_SPREAD_DEG, SCONCE_ARM_SPREAD_DEG)


def _arm_point(step, reach):
    """The middle arm's path in the (z, y) plane: straight out, scroll rise (level
    tangent at the pan, rising at the plate). step runs 0..SCONCE_ARM_STEPS-1."""
    t = step / (SCONCE_ARM_STEPS - 1.0)
    z = ARM_ROOT_Z + (-reach - ARM_ROOT_Z) * t
    y = ARM_ROOT_Y + (ARM_END_Y - ARM_ROOT_Y) * math.sin(t * math.pi / 2.0)
    return z, y


def _axis_point(yaw_deg, reach):
    """The candle-axis point at the arm's end, yawed about the vertical origin axis."""
    a = math.radians(yaw_deg)
    return (-reach * math.sin(a), ARM_END_Y, -reach * math.cos(a))


def _yawed(p, yaw_deg):
    """Rotate a template point about the vertical axis through the origin."""
    a = math.radians(yaw_deg)
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c)


def _outline(plate_bottom):
    """The abstract 8-point cartouche outline (no mask, no figure), W × H exactly."""
    h = SCONCE_BACKPLATE_H
    half_w = SCONCE_BACKPLATE_W / 2.0
    return [(0.0, plate_bottom + h),
            (0.09, plate_bottom + h * 0.808),
            (half_w, plate_bottom + h * 0.516),
            (0.09, plate_bottom + h * 0.177),
            (0.0, plate_bottom),
            (-0.09, plate_bottom + h * 0.177),
            (-half_w, plate_bottom + h * 0.516),
            (-0.09, plate_bottom + h * 0.808)]


def _plate_bottom():
    """The plate's y placement from the SCONCE_GAZE law: the archetype's bbox centre must
    sit at the FLIGHT2_SCONCE gaze point's height above the mount datum, so the plate's
    bottom = 2·gaze_dy − stack_top (the flame apex is the form's y maximum and the
    plate's bottom its y minimum — both asserted in _assert_pins)."""
    flight_datum = _k('flight_datum')
    flights = _k('FLIGHTS')
    above = _k('SCONCE_ABOVE')
    datum = flight_datum(flights[1], SCONCE_GAZE_POINT[0]) + above
    return round(2.0 * (SCONCE_GAZE_POINT[1] - datum) - STACK_TOP_Y, 6)


# --- geometry helpers ---------------------------------------------------------------


def _ring(cx, cz, radius, y, segments):
    return [(cx + radius * math.cos(2.0 * math.pi * k / segments),
             y,
             cz + radius * math.sin(2.0 * math.pi * k / segments)) for k in range(segments)]


def _polygon_area(pts):
    """Planar polygon area (the newell magnitude / 2) — the P1 glow-area pin's unit."""
    nx = ny = nz = 0.0
    for i, (x0, y0, z0) in enumerate(pts):
        x1, y1, z1 = pts[(i + 1) % len(pts)]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    return 0.5 * math.sqrt(nx * nx + ny * ny + nz * nz)


def _face_centroid(pts):
    n = float(len(pts))
    return (sum(p[0] for p in pts) / n,
            sum(p[1] for p in pts) / n,
            sum(p[2] for p in pts) / n)


# --- the archetype builder (the runner row's builder) -------------------------------


def build_sconce_archetype(b):
    """Build the sconce archetype into an internal MeshBuilder, run the builder
    self-checks (P1, P2, the tri cap, SCONCE_COUNT, the bbox-y law behind the plate
    placement, the gaze pin, the GLOW_ANCHOR height pin), compute the sub-cell pack
    plan, then leave exactly SCONCE_LM_CELLS sentinel entries in b.faces (the allocator
    counter consumes one cell per entry — the downstream meshes' UV2 offsets stay put)
    and stash the plan on b for realize_sconce, which swaps b.faces/b.verts to the real
    186 faces so b.triangles() and the meshes row stay truthful."""
    kit_solid = _k('kit_solid')
    kit_circle = _k('kit_circle')
    kit_octahedron = _k('kit_octahedron')
    mesh_builder = _k('MeshBuilder')
    mb = mesh_builder('sconce')
    plate_bottom = _plate_bottom()
    solids = []  # (name, first_face_index) in construction order — the island units

    # 1. The backplate cartouche (gilt): the 8-point outline lofted 0.03 deep; the front
    #    cap kept, the wall-side cap skipped (buried — the kit's own buried-face law).
    outline = _outline(plate_bottom)
    back = [(x, y, 0.0) for x, y in outline]
    front = [(x, y, -SCONCE_BACKPLATE_D) for x, y in outline]
    rim = [[back[i], back[(i + 1) % len(back)], front[(i + 1) % len(front)], front[i]]
           for i in range(len(outline))]
    solids.append(('cartouche', len(mb.faces)))
    kit_solid(mb, rim + [front], SLOT_GILT)

    # 2. The 3 arms (gilt): a 5-sided tube swept along the scroll path; the outer arms
    #    are the whole swept tube yawed ±SCONCE_ARM_SPREAD_DEG (one rigid rotation); the
    #    end cap kept, the root buried in the plate.
    rings = []
    for step in range(SCONCE_ARM_STEPS):
        z, y = _arm_point(step, SCONCE_ARM_REACH)
        z_a, y_a = _arm_point(max(step - 1, 0), SCONCE_ARM_REACH)
        z_b, y_b = _arm_point(min(step + 1, SCONCE_ARM_STEPS - 1), SCONCE_ARM_REACH)
        tz, ty = z_b - z_a, y_b - y_a
        norm = math.hypot(tz, ty)
        tz, ty = tz / norm, ty / norm
        # The ring plane is perpendicular to the local tangent; it is spanned by the
        # lateral axis and the in-plane up normal (up-ish for the level end tangent).
        up = (0.0, -tz, ty)
        ring = []
        for k in range(SCONCE_ARM_SIDES):
            a = 2.0 * math.pi * k / SCONCE_ARM_SIDES
            ring.append((SCONCE_ARM_RADIUS * math.cos(a),
                         y + SCONCE_ARM_RADIUS * math.sin(a) * up[1],
                         z + SCONCE_ARM_RADIUS * math.sin(a) * up[2]))
        rings.append(ring)
    for yaw_deg in ARM_YAWS:
        solids.append((f'arm_{yaw_deg:+g}', len(mb.faces)))
        yawed = [[_yawed(p, yaw_deg) for p in ring] for ring in rings]
        faces = [[yawed[s][k], yawed[s][(k + 1) % SCONCE_ARM_SIDES],
                  yawed[s + 1][(k + 1) % SCONCE_ARM_SIDES], yawed[s + 1][k]]
                 for s in range(SCONCE_ARM_STEPS - 1) for k in range(SCONCE_ARM_SIDES)]
        faces.append(list(yawed[-1]))  # the end cap (the root cap stays buried in the plate)
        kit_solid(mb, faces, SLOT_GILT)

    # 3. The 3 pans (gilt): an 8-sided dish under each candle; top, bottom and rim all
    #    visible (the candle sits inside the rim).
    for yaw_deg in ARM_YAWS:
        solids.append((f'pan_{yaw_deg:+g}', len(mb.faces)))
        ax, _, az = _axis_point(yaw_deg, SCONCE_ARM_REACH)
        bottom = _ring(ax, az, SCONCE_PAN_BOTTOM_R, PAN_BOTTOM_Y, SCONCE_PAN_SIDES)
        top = _ring(ax, az, SCONCE_PAN_RADIUS, PAN_TOP_Y, SCONCE_PAN_SIDES)
        faces = [[bottom[k], bottom[(k + 1) % SCONCE_PAN_SIDES],
                  top[(k + 1) % SCONCE_PAN_SIDES], top[k]] for k in range(SCONCE_PAN_SIDES)]
        faces.append(list(top))
        faces.append(list(bottom))
        kit_solid(mb, faces, SLOT_GILT)

    # 4. The 3 candles (sconce_glow): a hexagonal prism on the pan's top; the top cap
    #    kept (P1's area), the base open (it sits on the pan's top disc).
    for yaw_deg in ARM_YAWS:
        solids.append((f'candle_{yaw_deg:+g}', len(mb.faces)))
        ax, _, az = _axis_point(yaw_deg, SCONCE_ARM_REACH)
        base = _ring(ax, az, SCONCE_CANDLE_RADIUS, CANDLE_BASE_Y, SCONCE_CANDLE_SIDES)
        top = _ring(ax, az, SCONCE_CANDLE_RADIUS, CANDLE_TOP_Y, SCONCE_CANDLE_SIDES)
        faces = [[base[k], base[(k + 1) % SCONCE_CANDLE_SIDES],
                  top[(k + 1) % SCONCE_CANDLE_SIDES], top[k]]
                 for k in range(SCONCE_CANDLE_SIDES)]
        faces.append(list(top))
        kit_solid(mb, faces, SLOT_GLOW)

    # 5. The 3 flame chips (sconce_glow): a 4-sided bipyramid on each candle top; the
    #    equator square is axis-aligned in the arm's own frame so its depth extent is
    #    exactly ±SCONCE_FLAME_R, then the whole chip rides the arm's rigid yaw.
    for yaw_deg in ARM_YAWS:
        solids.append((f'flame_{yaw_deg:+g}', len(mb.faces)))
        square = [(SCONCE_FLAME_R * math.cos(math.pi / 2.0 * k), FLAME_EQ_Y,
                   -SCONCE_ARM_REACH + SCONCE_FLAME_R * math.sin(math.pi / 2.0 * k))
                  for k in range(4)]
        square = [_yawed(p, yaw_deg) for p in square]
        apex_lo = _yawed((0.0, FLAME_BASE_Y, -SCONCE_ARM_REACH), yaw_deg)
        apex_hi = _yawed((0.0, FLAME_APEX_Y, -SCONCE_ARM_REACH), yaw_deg)
        faces = [[apex_lo, square[k], square[(k + 1) % 4]] for k in range(4)]
        faces += [[apex_hi, square[k], square[(k + 1) % 4]] for k in range(4)]
        kit_solid(mb, faces, SLOT_GLOW)

    # 6. The 3 crystal drops: an octahedron under each pan, its top tangent to the pan's
    #    bottom ("cut glass is read from facets", the glow ruling — plain opaque PBR).
    for yaw_deg in ARM_YAWS:
        solids.append((f'drop_{yaw_deg:+g}', len(mb.faces)))
        ax, _, az = _axis_point(yaw_deg, SCONCE_ARM_REACH)
        kit_octahedron(mb, (ax, DROP_CENTRE_Y, az),
                       (CRYSTAL_BEAD_R, CRYSTAL_DROP_H / 2.0, CRYSTAL_BEAD_R), SLOT_CRYSTAL)

    derived = _assert_pins(mb, solids, plate_bottom)
    plan = _plan(mb, solids)
    plan.update(derived)
    # Publish the honest glow extent (the candles+flames bbox) and the plate-as-bracket
    # into the builder namespace: bake.py's lamp derivation + clearance check and the
    # summary's declared rows read them (ACCEPTANCE #6). The asserts have passed, so the
    # published numbers are the built truth; the height centre keeps the committed lamp
    # height (0.25) by the anchor law and the depth centre is the candle axis. The
    # publish is RECORDED (the review HIGH-4): the next build's entry resets these keys
    # to the caller's prior values, so the derived rig inputs never outlive this build.
    global _FIXTURE_PUBLISHED
    _FIXTURE_PUBLISHED = (_KIT, {'SCONCE_GLOW_BOX': _KIT.get('SCONCE_GLOW_BOX', _ABSENT),
                                 'SCONCE_BRACKET': _KIT.get('SCONCE_BRACKET', _ABSENT)})
    _KIT['SCONCE_GLOW_BOX'] = derived['glowBox']
    _KIT['SCONCE_BRACKET'] = (SCONCE_BACKPLATE_D, SCONCE_BACKPLATE_W / 2.0)
    # The allocator counter consumes one cell per b.faces entry: leave exactly the
    # datablock's cell count as sentinels, then stash the plan for realize_sconce.
    b.faces.extend([((0, 1, 2), 0)] * SCONCE_LM_CELLS)
    b._jordan_fixtures = plan
    return plan


def _solid_ranges(solids, face_count):
    ranges = []
    for index, (name, first) in enumerate(solids):
        last = solids[index + 1][1] if index + 1 < len(solids) else face_count
        ranges.append((name, first, last))
    return ranges


def _assert_pins(mb, solids, plate_bottom):
    """The builder self-checks: P1 (the glow area band), P2 (the glow-surface law), the
    tri cap, SCONCE_COUNT, the bbox-y law behind the plate placement, the gaze pin and
    the GLOW_ANCHOR height pin. Every miss fails loud (the build stops). Returns the
    published derived numbers (the glow box, the lamp/anchor readings, the gaze)."""
    r6 = _k('r6')
    faces = mb.faces
    verts = mb.verts
    ranges = _solid_ranges(solids, len(faces))
    if len(solids) != 1 + SCONCE_ARMS + 3 + 3 + 3 + SCONCE_DROPS:
        raise RuntimeError(f'jordan_fixtures: expected 16 islands (solids), got {len(solids)}')
    if mb.triangles() > SCONCE_TRI_CAP:
        raise RuntimeError(f'jordan_fixtures: the archetype carries {mb.triangles()} tris '
                           f'> the SCONCE_TRI_CAP {SCONCE_TRI_CAP}')
    west = _k('SCONCE_WEST_Z')
    north = _k('SCONCE_NORTH_X')
    east = _k('SCONCE_EAST')
    if len(west) + len(north) + len(east) != SCONCE_COUNT:
        raise RuntimeError('jordan_fixtures: SCONCE_COUNT does not match the committed '
                           'anchor tables (west + north + east)')
    if north[SCONCE_GAZE_INSTANCE] != SCONCE_GAZE_POINT[0]:
        raise RuntimeError('jordan_fixtures: the gaze instance is not the FLIGHT2_SCONCE '
                           'subject (SCONCE_NORTH_X[1] != the contract point x)')

    # P2 (the glow-surface law): the only glow faces are the candle bodies + the flames.
    candle_flame = {name for name, _, _ in ranges
                    if name.startswith(('candle', 'flame'))}
    glow_solids = set()
    for name, first, last in ranges:
        if any(slot == SLOT_GLOW for _, slot in faces[first:last]):
            glow_solids.add(name)
    if glow_solids != candle_flame:
        raise RuntimeError(f'jordan_fixtures: P2 violated — the glow primitives carry '
                           f'{sorted(glow_solids)} (the law: candle bodies + flame chips only)')

    # P1 (the glow-area band): the glow-class area per instance from the built faces.
    glow_area = 0.0
    weighted_y = weighted_z = weighted_x = 0.0
    for idx, slot in faces:
        if slot != SLOT_GLOW:
            continue
        pts = [verts[i] for i in idx]
        area = _polygon_area(pts)
        glow_area += area
        c = _face_centroid(pts)
        weighted_x += area * c[0]
        weighted_y += area * c[1]
        weighted_z += area * c[2]
    lo, hi = GLOW_AREA_BAND_SCONCE
    if not lo <= glow_area <= hi:
        raise RuntimeError(f'jordan_fixtures: P1 violated — the glow-class area per '
                           f'instance {glow_area:.6f} m² outside {lo}..{hi}')
    centroid = (weighted_x / glow_area, weighted_y / glow_area, weighted_z / glow_area)

    # The bbox law behind the plate placement: the plate's bottom is the form's minimum
    # y and the flame apex its maximum (the gaze centre derivation depends on both).
    all_pts = [verts[i] for idx, _ in faces for i in idx]
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    zs = [p[2] for p in all_pts]
    if abs(min(ys) - plate_bottom) > 1e-9 or abs(max(ys) - STACK_TOP_Y) > 1e-9:
        raise RuntimeError(f'jordan_fixtures: the bbox-y law broke (min {min(ys):.6f} vs '
                           f'the plate bottom {plate_bottom:.6f}, max {max(ys):.6f} vs the '
                           f'stack top {STACK_TOP_Y:.6f})')

    # SCONCE_GAZE: the archetype's bbox centre mounted at the FLIGHT2_SCONCE instance.
    flight_datum = _k('flight_datum')
    flights = _k('FLIGHTS')
    above = _k('SCONCE_ABOVE')
    z_n = _k('Z_N')
    local_centre = ((min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0,
                    (min(zs) + max(zs)) / 2.0)
    mount = (SCONCE_GAZE_POINT[0],
             flight_datum(flights[1], SCONCE_GAZE_POINT[0]) + above, z_n)
    # The north instance's rot is pi: (x, y, z) -> (-x, y, -z) in template space.
    world = (mount[0] - local_centre[0], mount[1] + local_centre[1], mount[2] - local_centre[2])
    gaze_dist = math.dist(world, SCONCE_GAZE_POINT)
    if gaze_dist >= SCONCE_GAZE_IMPROVE_M:
        raise RuntimeError(f'jordan_fixtures: the gaze bbox centre misses '
                           f'{SCONCE_GAZE_POINT} by {gaze_dist:.4f} m — the form must do '
                           f"better than the placeholder's {SCONCE_GAZE_IMPROVE_M} m")

    # GLOW_ANCHOR: the chips' area-weighted centroid vs the derived rig lamp. The lamp's
    # wall offset = the published box's depth centre + half-depth + JORDAN_RIG_FRONT; its
    # height = the box's height centre (the committed 0.25 by the pan-top law). The pin
    # tests the height gap (the ruling's clarified content); the wall-axis residual is
    # the rig's own front-offset law and is recorded, not asserted.
    glow_pts = [verts[i] for idx, slot in faces if slot == SLOT_GLOW for i in idx]
    glow_box = (r6((-max(p[2] for p in glow_pts), -min(p[2] for p in glow_pts))),
                r6((min(p[1] for p in glow_pts), max(p[1] for p in glow_pts))),
                r6((min(p[0] for p in glow_pts), max(p[0] for p in glow_pts))))
    out = (glow_box[0][0] + glow_box[0][1]) / 2.0
    half_depth = (glow_box[0][1] - glow_box[0][0]) / 2.0
    lamp_y = (glow_box[1][0] + glow_box[1][1]) / 2.0
    lamp_offset = out + half_depth + JORDAN_RIG_FRONT
    height_gap = abs(lamp_y - centroid[1])
    if height_gap > GLOW_ANCHOR_TOL:
        raise RuntimeError(f'jordan_fixtures: GLOW_ANCHOR violated — the chips\' centroid '
                           f'y {centroid[1]:.4f} vs the rig lamp plane {lamp_y:.4f} '
                           f'(gap {height_gap:.4f} > {GLOW_ANCHOR_TOL})')
    wall_gap = lamp_offset - abs(centroid[2])
    return {
        'faces': list(faces), 'verts': list(verts), 'mb': mb, 'solids': list(solids),
        'glowBox': glow_box,
        'lampWallOffsetM': round(lamp_offset, 6),
        'lampHeightM': round(lamp_y, 6),
        'centroidAbovePanTopM': round(centroid[1] - PAN_TOP_Y, 6),
        'anchorHeightGapM': round(height_gap, 6),
        'anchorWallGapM': round(wall_gap, 6),
        'gazeDistanceM': round(gaze_dist, 6),
        'gazeCentreM': tuple(round(v, 6) for v in world),
        'glowAreaM2': round(glow_area, 6),
        'tris': mb.triangles(),
        'reachM': SCONCE_ARM_REACH,
        'plateBottomY': plate_bottom,
    }


def _plan(mb, solids):
    """The sub-cell pack plan. Per-solid islands (the ruling B4's instanced-archetype
    granularity): each island's interior = max(ceil(unfolded footprint), MIN_PX) per
    axis at FIXTURE_TEXELS_PER_M, +2px pad per side; the faces' projected rects tile the
    interior as a strip; the islands keep construction (face-index) order. The cells:
    the datablock's own 12 retired cells, split per material run by
    round(cells × islands_i / total) (the last run takes the remainder, min 1), islands
    distributed as evenly as possible, shelf-packed inside each cell. FAILS LOUD on
    any overflow or empty cell (every row must carry real texels)."""
    box_uv = _k('box_uv')
    newell = _k('newell')
    faces = mb.faces
    verts = mb.verts
    islands = []
    for name, first, last in _solid_ranges(solids, len(faces)):
        entries = []
        for pi in range(first, last):
            idx, _slot = faces[pi]
            pts = [verts[i] for i in idx]
            proj = [box_uv(p, newell(pts)) for p in pts]
            us, vs = [p[0] for p in proj], [p[1] for p in proj]
            du = (max(us) - min(us)) or 1.0
            dv = (max(vs) - min(vs)) or 1.0
            entries.append({'face': pi, 'duPx': du * FIXTURE_TEXELS_PER_M,
                            'dvPx': dv * FIXTURE_TEXELS_PER_M})
        place = 0.0
        for entry in entries:  # the strip layout: the faces tile the interior along u
            entry['placeU'] = place
            entry['placeV'] = 0.0
            place += entry['duPx']
        width = place
        height = max(entry['dvPx'] for entry in entries)
        interior_w = max(int(math.ceil(width)), FIXTURE_LM_MIN_PX)
        interior_h = max(int(math.ceil(height)), FIXTURE_LM_MIN_PX)
        islands.append({'name': name, 'first': first, 'entries': entries,
                        'w': interior_w + 2 * FIXTURE_LM_PAD_PX,
                        'h': interior_h + 2 * FIXTURE_LM_PAD_PX,
                        'slot': faces[first][1]})
    runs = []
    for island in islands:
        if runs and runs[-1]['slot'] == island['slot']:
            runs[-1]['islands'].append(island)
        else:
            runs.append({'slot': island['slot'], 'islands': [island]})
    shares = []
    allocated = 0
    for run_index, run in enumerate(runs):
        if run_index + 1 < len(runs):
            share = max(1, int(round(SCONCE_LM_CELLS * len(run['islands']) / float(len(islands)))))
            allocated += share
        else:
            share = max(1, SCONCE_LM_CELLS - allocated)
        if share > len(run['islands']):
            share = len(run['islands'])  # never more cells than islands
        shares.append(share)
    if sum(shares) != SCONCE_LM_CELLS:
        raise RuntimeError(f'jordan_fixtures: the cell shares {shares} do not total the '
                           f"datablock's {SCONCE_LM_CELLS} cells")
    plan_cells = []
    for run, share in zip(runs, shares):
        n = len(run['islands'])
        base, extra = divmod(n, share)
        cursor = 0
        for cell_index in range(share):
            count = base + (1 if cell_index < extra else 0)
            if count == 0:
                raise RuntimeError(f'jordan_fixtures: the run for slot {run["slot"]} leaves '
                                   'an empty cell — every row must carry texels')
            plan_cells.append({'slot': run['slot'],
                               'islands': run['islands'][cursor:cursor + count]})
            cursor += count
    for cell_index, cell in enumerate(plan_cells):
        x = y = row_h = 0
        for island in cell['islands']:
            w, h = island['w'], island['h']
            if x + w > 32:
                x = 0
                y += row_h
                row_h = 0
            if x + w > 32 or y + h > 32:
                raise RuntimeError(f'jordan_fixtures: the island {island["name"]} '
                                   f'({w}x{h}px) does not fit its cell')
            island['cell'] = cell_index
            island['pos'] = (x, y)
            x += w
            row_h = max(row_h, h)
    return {'islands': islands, 'cells': plan_cells}


# --- the fixture realize (jordan.py's realize dispatcher's target) -------------------


def realize_sconce(b, material_names, first_cell):
    """The sconce archetype's realize: the committed one-cell-per-FACE law does NOT
    apply to this datablock — the pack plan assigns whole islands to shared 32×32 cells
    inside the datablock's own retired range. Builds the mesh datablock + object (the
    committed realize's shape), writes the datablock's cells.json rows (truthful,
    consecutive, single-material), the face→cell map and the fixture LM stats, then
    swaps b.faces/b.verts to the real faces so the runner loop's b.triangles() and the
    meshes row stay truthful."""
    plan = getattr(b, '_jordan_fixtures', None)
    if plan is None:
        raise RuntimeError('jordan_fixtures: realize_sconce without a builder plan')
    mb = plan['mb']
    to_b = _k('to_b')
    lm_res = _k('LM_RES')
    lm_grid = _k('LM_GRID')
    lm_capacity = _k('LM_CAPACITY')
    cell_px = lm_res // lm_grid
    lm_cell_map = _k('LM_CELL_MAP')
    material_repeat = _k('MATERIAL_REPEAT_M')
    uv_tile = _k('UV_TILE_M')
    surface_projection = _k('surface_projection')
    box_uv = _k('box_uv')
    newell = _k('newell')

    me = bpy.data.meshes.new(b.name)
    me.from_pydata([to_b(p) for p in mb.verts], [], [list(f) for f, _ in mb.faces])
    me.update()
    for name in material_names:
        me.materials.append(bpy.data.materials[name])
    uv = me.uv_layers.new(name='uv')
    lm = me.uv_layers.new(name='lm')
    # Reacquire the uv handle AFTER the lm allocation (the review LOW): the second
    # uv_layers.new() may reallocate the custom-data layer array and invalidate the
    # first handle — realize_chandelier already reads its uv layer fresh after both
    # allocations (me.uv_layers[0]).
    uv = me.uv_layers[0]
    # The datablock's cells ARE first_cell + 0..SCONCE_LM_CELLS-1: the builder's
    # sentinels made the counter consume exactly this range, so the retired keys the
    # placeholder owned are re-issued here with the packed islands' material rows.
    if first_cell != SCONCE_LM_FIRST_CELL:
        raise RuntimeError(f'jordan_fixtures: the allocator\'s first_cell {first_cell} != '
                           f'the datablock\'s retired range start {SCONCE_LM_FIRST_CELL}')
    if first_cell < 0 or first_cell + SCONCE_LM_CELLS > lm_capacity:
        raise RuntimeError(f'jordan_fixtures: the retired range {first_cell}..'
                           f'{first_cell + SCONCE_LM_CELLS - 1} outside the atlas')
    key_x0, key_y = first_cell % lm_grid, first_cell // lm_grid
    if key_x0 + SCONCE_LM_CELLS > lm_grid:
        raise RuntimeError(f'jordan_fixtures: the retired range wraps the atlas row '
                           f'(x0 {key_x0} + {SCONCE_LM_CELLS} cells)')
    entry_of_face = {}
    for island in plan['islands']:
        for entry in island['entries']:
            entry_of_face[entry['face']] = (island, entry)

    cell_map = lm_cell_map['cells']
    face_cells = []
    for pi, poly in enumerate(me.polygons):
        idx, slot = mb.faces[pi]
        poly.material_index = slot
        pts = [mb.verts[i] for i in idx]
        # UV1: the committed realize's default law (the material's repeat metres).
        repeat = material_repeat.get(material_names[slot], uv_tile)
        mapped = [(u / repeat, v / repeat) for u, v in surface_projection(pts)]
        for li, loop in enumerate(poly.loop_indices):
            uv.data[loop].uv = mapped[li]
        # UV2: the sub-cell pack plan (whole islands share 32×32 cells).
        island, entry = entry_of_face[pi]
        cell_index = first_cell + island['cell']
        cx = key_x0 + island['cell']
        cy = key_y
        key = f'{cx},{cy}'
        material = material_names[slot]
        if key in cell_map:
            if cell_map[key]['material'] != material:
                raise RuntimeError(f'jordan_fixtures: cell {key} would mix materials '
                                   f'({cell_map[key]["material"]} vs {material})')
        else:
            cell_map[key] = {'object': b.name, 'material': material}
        box_x, box_y = island['pos']
        proj = [box_uv(p, newell(pts)) for p in pts]
        us, vs = [p[0] for p in proj], [p[1] for p in proj]
        u0, v0 = min(us), min(vs)
        du = (max(us) - u0) or 1.0
        dv = (max(vs) - v0) or 1.0
        interior_x = box_x + FIXTURE_LM_PAD_PX + entry['placeU']
        interior_y = box_y + FIXTURE_LM_PAD_PX + entry['placeV']
        for li, loop in enumerate(poly.loop_indices):
            fu = (proj[li][0] - u0) / du
            fv = (proj[li][1] - v0) / dv
            lm.data[loop].uv = ((cx * cell_px + interior_x + fu * entry['duPx']) / lm_res,
                                (cy * cell_px + interior_y + fv * entry['dvPx']) / lm_res)
        face_cells.append(cell_index)
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)

    used = sorted({island['cell'] for island in plan['islands']})
    if used != list(range(SCONCE_LM_CELLS)):
        raise RuntimeError(f'jordan_fixtures: the packer used cells {used} — the datablock '
                           f"owns exactly {SCONCE_LM_CELLS} (the allocator counter's law)")
    # B2: the chandelier's realizes run BEFORE this row, so both maps MERGE here (the
    # landed single-datablock assignment would drop their rows — the one necessary edit
    # to the B1 section, flagged in the B2 report).
    lm_cell_map.setdefault('faceCellMap', {})[b.name] = face_cells
    lm_cell_map.setdefault('fixtureLm', {})[b.name] = {
        'islands': len(plan['islands']),
        'islandsLaw': (f'per-solid islands (the ruling B4\'s instanced-archetype '
                       f'granularity); several faces share one 32×32 cell at '
                       f'{round(FIXTURE_TEXELS_PER_M, 4)} texels/m = {FIXTURE_LM_SCALE}× '
                       f"the room's {round(ROOM_TEXELS_PER_M, 4)} texels/m"),
        'cells': SCONCE_LM_CELLS,
        'cellRange': [SCONCE_LM_FIRST_CELL, SCONCE_LM_FIRST_CELL + SCONCE_LM_CELLS - 1],
        'islandBoxPx': sum(i['w'] * i['h'] for i in plan['islands']),
        'glowAreaM2': plan['glowAreaM2'],
        'gazeDistanceM': plan['gazeDistanceM'],
        'anchorHeightGapM': plan['anchorHeightGapM'],
        'anchorWallGapM': plan['anchorWallGapM'],
        'lampWallOffsetM': plan['lampWallOffsetM'],
        'lampHeightM': plan['lampHeightM'],
        'centroidAbovePanTopM': plan['centroidAbovePanTopM'],
        'tris': plan['tris'],
    }
    # The truthful face list for the runner loop's b.triangles() / meshes row.
    b.faces = mb.faces
    b.verts = mb.verts
    return len({slot for _, slot in mb.faces})


# --- B2: the chandelier (the stem, the arm archetype, the bead) ----------------------
# The glow ruling's anchor law and its measured limit. bake.py's core lamp derives from
# the COMMITTED CHAND_* rows (the rig never moves) and lands 0.25 BELOW the placeholder
# core octahedron's lower apex — which is itself the CHANDELIER_MIN_Y fence. The chips
# are chandelier geometry, so their area-weighted centroid is >= the fence for EVERY
# design inside the envelope: the ruling's GLOW_ANCHOR_TOL 0.03 against the core lamp is
# proven unreachable (the B1 gaze precedent: an unreachable pin yields to the honest
# achieved binding). The one lever the ruling grants — the tier-stack height — is
# therefore run to its fence floor, and the binding number is what the placeholder's own
# card carried: the core octahedron's area-weighted surface centroid is its centre
# (86, CHAND_CORE_Y, -74) by symmetry, and the fence-tight stack keeps the chips'
# centroid within ~0.06 of it, so the baked emission stays where the committed card's
# was. Every number lands in declared_rows() and the fixtureLm rows for the report.

def _chand_min_y():
    """CHANDELIER_MIN_Y (the ruling B2): the placeholder's lowest y — never lower. The
    placeholder's lowest point is its core octahedron's lower apex (the B0 census's 13.4),
    read from the committed CHAND_* rows and never re-authored."""
    return round(_k('CHAND_CORE_Y') - _k('CHAND_CORE')[1], 6)


def _chand_envelope():
    """The C2 envelope: the placeholder's world bbox grown CHANDELIER_ENVELOPE_GROW per
    side. Its halves are the placeholder's own extremes read from CHAND_* (the drops'
    ring radius + the drop octahedron's half; the core octahedron's lower apex; the rod
    top) — the same numbers the B0 census measured."""
    cx, cz = _k('CHAND_C')
    half = _k('CHAND_DROP_R') + _k('CHAND_DROP')[0] + CHANDELIER_ENVELOPE_GROW
    return {'x': (round(cx - half, 6), round(cx + half, 6)),
            'y': (round(_chand_min_y() - CHANDELIER_ENVELOPE_GROW, 6),
                  round(_k('CHAND_ROD_TOP') + CHANDELIER_ENVELOPE_GROW, 6)),
            'z': (round(cz - half, 6), round(cz + half, 6))}


def _chand_fit():
    """CHANDELIER_FIT: one uniform scalar applied to the tier radii and DY only when the
    envelope is TIGHTER than the pinned numbers — the envelope wins. Measured: the
    envelope is LOOSER (the B0 census's implied cap scale 1.2286 horizontal), so FIT = 1
    and the pinned radii/DY stand. The review MEDIUM-9: the advertised auto-fit is NOT
    implemented — fit == 1 is the ONLY supported path, asserted here; a tighter envelope
    is a geometry revision (re-pin the tier stack), not a build-time scale."""
    env = _chand_envelope()
    horizontal = min(env['x'][1] - env['x'][0], env['z'][1] - env['z'][0])
    vertical = env['y'][1] - env['y'][0]
    fit = round(min(1.0, horizontal / (2.0 * CHANDELIER_TIER_RADIUS[0]),
                    vertical / (2.0 * CHANDELIER_TIER_DY)), 6)
    if fit != 1:
        raise RuntimeError(
            f'jordan_fixtures: CHANDELIER_FIT {fit} != 1 — the advertised auto-fit is '
            'NOT implemented: only fit == 1 (the envelope looser than the pinned tier '
            "radii/DY, the B0 census's implied 1.2286 cap) is supported; a tighter "
            'envelope is a geometry revision, not a build-time scale')
    return fit


def _chand_tier_pans():
    """The three tiers' pan-top heights — the anchor lever, run to its fence floor. The
    arm archetype's crystal drops hang CHANDELIER_PAN_H + CRYSTAL_DROP_H = 0.082 below
    their pan top (the dish + the drop tangent under it), so the fence CHANDELIER_MIN_Y
    binds the DROPS: pan_top = MIN_Y + 0.092 (the 0.010 clears the glb's int16
    quantization with margin). The mid and top tiers ride CHANDELIER_TIER_DY."""
    base = round(_chand_min_y() + CHANDELIER_PAN_H + CRYSTAL_DROP_H + 0.010, 6)
    return tuple(round(base + i * CHANDELIER_TIER_DY, 6) for i in range(CHANDELIER_TIERS))


_ARM_RISE = round(CHANDELIER_ARM_MOUNT_DROP - CHANDELIER_PAN_H - CHANDELIER_ARM_RADIUS, 6)
ARM_PAN_BOTTOM = round(_ARM_RISE + CHANDELIER_ARM_RADIUS, 6)
ARM_PAN_TOP = round(ARM_PAN_BOTTOM + CHANDELIER_PAN_H, 6)
ARM_CANDLE_TOP = round(ARM_PAN_TOP + CHANDELIER_CANDLE_H, 6)
ARM_FLAME_EQ = round(ARM_CANDLE_TOP + CHANDELIER_FLAME_H / 2.0, 6)
ARM_FLAME_APEX = round(ARM_CANDLE_TOP + CHANDELIER_FLAME_H, 6)
ARM_DROP_CENTRE = round(ARM_PAN_BOTTOM - CRYSTAL_DROP_H / 2.0, 6)
# The tiers' arm azimuths: even grids, each tier offset half its own pitch from the one
# below (the classic stagger): bottom 2πk/16, mid +π/12, top +π/8.
_CHAND_AZIMUTH_OFFSETS = (0.0, math.pi / 12.0, math.pi / 8.0)
# The stem's silhouette radii above and below the three tier mount rings.
_CHAND_STEM_RADII = (0.30, 0.30, 0.12, 0.08, 0.08, 0.10, 0.20, 0.34, 0.60, 0.80, 1.00, 0.97,
                     0.60, 0.15)


def _stem_rings():
    """The stem's lathe profile (CHANDELIER_STEM_RINGS rings, 16 sides): the ceiling rose
    at the committed rod-top level, the vase shaft, the THREE TIER MOUNT rings (the one
    unscaled archetype's reach is constant, so the mounts ride the profile at
    r_i − CHANDELIER_ARM_REACH), the bowl flaring to the bottom tier's mount ring and
    dishing to a tip one fence-margin above CHANDELIER_MIN_Y."""
    mounts = tuple(round(p - CHANDELIER_ARM_MOUNT_DROP, 6) for p in _chand_tier_pans())
    tip = round(_chand_min_y() + 0.010, 6)
    rod = _k('CHAND_ROD_TOP')
    return (
        (_CHAND_STEM_RADII[0], round(rod, 6)),                     # the rose's top (the cap)
        (_CHAND_STEM_RADII[1], round(rod - 0.15, 6)),
        (_CHAND_STEM_RADII[2], round(rod - 0.35, 6)),
        (_CHAND_STEM_RADII[3], 18.60), (_CHAND_STEM_RADII[4], 17.40),
        (_CHAND_STEM_RADII[5], 16.20),
        (_CHAND_STEM_RADII[6], mounts[2]),                        # the top tier's mount
        (_CHAND_STEM_RADII[7], round((mounts[1] + mounts[2]) / 2.0, 6)),
        (_CHAND_STEM_RADII[8], mounts[1]),                        # the mid tier's mount
        (_CHAND_STEM_RADII[9], round((mounts[0] + mounts[1]) / 2.0, 6)),
        (_CHAND_STEM_RADII[10], mounts[0]),                       # the bowl's rim (the mount)
        (_CHAND_STEM_RADII[11], round(mounts[0] - 0.008, 6)),
        (_CHAND_STEM_RADII[12], round(mounts[0] - 0.016, 6)),
        (_CHAND_STEM_RADII[13], tip),                             # the bowl's tip (the cap)
    )


def _chand_face_counts():
    """The pinned UNIQUE face counts (the packer's shares input; the builders assert the
    built counts against these): the stem's lathe bands + 2 caps; the arm's tube bands +
    end cap, the pan's rim + 2 discs, the candle's lateral + top cap, the flame's 8, the
    drops' 2 × 8; the bead's 8."""
    stem = (CHANDELIER_STEM_RINGS - 1) * CHANDELIER_STEM_SIDES + 2
    arm_gilt = ((CHANDELIER_ARM_STEPS - 1) * CHANDELIER_ARM_SIDES + 1
                + CHANDELIER_PAN_SIDES + 2)
    arm_glow = CHANDELIER_CANDLE_SIDES + 1 + 8
    arm_crystal = CHANDELIER_DROPS * 8
    bead = 8
    return stem, arm_gilt, arm_glow, arm_crystal, bead


def _chand_share_table():
    """The 214 retired cells split per (datablock, material) run by the B1 shares law's
    shape (round by face count; the last run takes the remainder; never more cells than
    faces): stem gilt 158 / arm gilt 27 / arm chandelier_glow 11 / arm crystal 12 /
    bead crystal 6 — consecutive linear runs inside the retired region (2881..3094 under
    the fixtures-round layout; 2779..2992 after the plafond round's −102 shift), so the
    glow cells are identifiable and single-material."""
    counts = _chand_face_counts()
    runs = (('stem-gilt', counts[0], SLOT_GILT), ('arm-gilt', counts[1], SLOT_GILT),
            ('arm-glow', counts[2], SLOT_GLOW), ('arm-crystal', counts[3], SLOT_CRYSTAL),
            ('bead-crystal', counts[4], SLOT_CRYSTAL))
    total = sum(count for _, count, _ in runs)
    shares = []
    allocated = 0
    for index, (name, count, slot) in enumerate(runs):
        if index + 1 < len(runs):
            share = max(1, int(round(CHANDELIER_LM_CELLS * count / total)))
            allocated += share
        else:
            share = max(1, CHANDELIER_LM_CELLS - allocated)
        if share > count:
            share = count  # never more cells than faces
        shares.append({'name': name, 'count': count, 'slot': slot, 'cells': share})
    if sum(row['cells'] for row in shares) != CHANDELIER_LM_CELLS:
        raise RuntimeError(f'jordan_fixtures: the chandelier cell shares '
                           f"{[row['cells'] for row in shares]} do not total the "
                           f'datablock\'s own {CHANDELIER_LM_CELLS} retired cells')
    return tuple(shares)


# The datablock → share-table prefix map (the share names carry the kind: stem-/arm-/bead-).
_CHAND_DATABLOCK_PREFIX = {'chandelier': 'stem', 'chandelier_arm': 'arm', 'chandelier_bead': 'bead'}
SLOT_NAMES = ('gilt', 'glow', 'crystal')


def _chand_datablock_cells(name):
    """A datablock's own cell count: the sum of its runs' shares."""
    prefix = _CHAND_DATABLOCK_PREFIX[name]
    total = 0
    for row in _chand_share_table():
        if row['name'].startswith(prefix):
            total += row['cells']
    if total == 0:
        raise RuntimeError(f'jordan_fixtures: no cell share for datablock {name!r}')
    return total


def _chand_expected_first(name):
    """The datablock's expected first_cell: the retired range's start plus the previous
    fixture datablocks' sentinel counts (the counter's law — the downstream offsets stay
    put; the sconce's realize re-asserts its own 3095)."""
    first = CHANDELIER_LM_FIRST_CELL
    for datablock in ('chandelier', 'chandelier_arm', 'chandelier_bead'):
        if datablock == name:
            return first
        first += _chand_datablock_cells(datablock)
    raise RuntimeError(f'jordan_fixtures: no retired range for datablock {name!r}')


def core_lamp_y():
    """bake.py's add_jordan_rig core-lamp derivation, replicated exactly from the kit's
    committed CHAND_* rows: the 200 W point descends JORDAN_RIG_CORE_STEP from
    JORDAN_RIG_CORE_BASE_Y until its sphere clears the core octahedron's SOLID by
    JORDAN_RIG_CORE_GAP. The descent is always on the CHAND_C axis, where the solid
    distance is 0 inside the octahedron, (lower_apex − y) below it and (y − upper_apex)
    above it (the perpendicular feet leave the lower/upper faces; every vertex/edge
    clamps to the apex — the review MEDIUM-10's max() form). Verified against
    bake.py's full octahedron_distance at these constants: 230 steps → y 13.15."""
    centre_y = _k('CHAND_CORE_Y')
    half_y = _k('CHAND_CORE')[1]
    lower = round(centre_y - half_y, 6)
    upper = round(centre_y + half_y, 6)
    y = JORDAN_RIG_CORE_BASE_Y
    steps = 0
    while True:
        # The review MEDIUM-10: the on-axis replica's solid distance covers a rig start
        # ABOVE the core (y - upper), INSIDE it (0) and BELOW it (lower - y) — the raw
        # `apex - y` form descends through a core it starts above and reports a
        # negative gap there. On the committed descent (base 14.3 inside the core)
        # both forms agree; this one also survives a later rig change.
        distance = round(max(lower - y, 0.0, y - upper), 6)
        if distance - JORDAN_RIG_CORE_RADIUS >= JORDAN_RIG_CORE_GAP - 1e-9:
            return round(y, 6)
        steps += 1
        y = JORDAN_RIG_CORE_BASE_Y - JORDAN_RIG_CORE_STEP * steps
        if steps > 100000:
            raise RuntimeError('jordan_fixtures: the core-lamp descent never cleared')


def _arm_path(step):
    """The scroll arm's centreline at a step: the reach along local +x, the ARM_RISE
    sine-ease along local +y, level tangent at the pan end."""
    t = step / (CHANDELIER_ARM_STEPS - 1.0)
    return CHANDELIER_ARM_REACH * t, _ARM_RISE * math.sin(t * math.pi / 2.0)


def build_chandelier_arm(b):
    """The chandelier's arm archetype: ONE mesh, THREE primitives (the draw gate counts
    unique primitives; 36 nodes share it — the balustrade convention). The scroll arm
    (gilt, r 0.014-class, 6 steps × 5 sides, level tangent at the pan; the end cap kept,
    the root buried in the stem wall), the 8-sided pan (gilt, the sconce's radii), the
    candle body (chandelier_glow) and the flame chip (chandelier_glow) — the ONLY glow
    faces (P2) — and CHANDELIER_DROPS crystal drops (opaque octahedra) under the pan.
    ≤ CHANDELIER_ARM_TRI_CAP tris all primitives; the glow area ×36 must sit in the P1
    band. Leaves the datablock's own sentinel cells and stashes the pack plan."""
    kit_solid = _k('kit_solid')
    kit_octahedron = _k('kit_octahedron')
    mesh_builder = _k('MeshBuilder')
    mb = mesh_builder('chandelier_arm')
    solids = []  # (name, first_face_index) in construction order — the P2 proof

    # 1. The scroll arm (gilt): a 5-sided tube swept along the local path; the rings are
    #    perpendicular to the tangent, spanned by the lateral (z) and the in-plane up.
    rings = []
    for step in range(CHANDELIER_ARM_STEPS):
        x, y = _arm_path(step)
        xa, ya = _arm_path(max(step - 1, 0))
        xb, yb = _arm_path(min(step + 1, CHANDELIER_ARM_STEPS - 1))
        tx, ty = xb - xa, yb - ya
        norm = math.hypot(tx, ty) or 1.0
        tx, ty = tx / norm, ty / norm
        up = (-ty, tx)  # the tangent rotated +90° inside the (x, y) sweep plane
        ring = []
        for k in range(CHANDELIER_ARM_SIDES):
            a = 2.0 * math.pi * k / CHANDELIER_ARM_SIDES
            ring.append((x + CHANDELIER_ARM_RADIUS * math.sin(a) * up[0],
                         y + CHANDELIER_ARM_RADIUS * math.sin(a) * up[1],
                         CHANDELIER_ARM_RADIUS * math.cos(a)))
        rings.append(ring)
    solids.append(('scroll_arm', len(mb.faces)))
    faces = [[rings[s][k], rings[s][(k + 1) % CHANDELIER_ARM_SIDES],
              rings[s + 1][(k + 1) % CHANDELIER_ARM_SIDES], rings[s + 1][k]]
             for s in range(CHANDELIER_ARM_STEPS - 1) for k in range(CHANDELIER_ARM_SIDES)]
    faces.append(list(rings[-1]))  # the end cap (the root's cap stays buried in the stem wall)
    kit_solid(mb, faces, SLOT_GILT)

    # 2. The pan (gilt): the 8-sided dish under the candle; top, bottom and rim all
    #    visible (the candle sits inside the rim), centred at the local reach.
    solids.append(('pan', len(mb.faces)))
    bottom = [(CHANDELIER_ARM_REACH + CHANDELIER_PAN_BOTTOM_R * math.cos(2.0 * math.pi * k / CHANDELIER_PAN_SIDES),
               ARM_PAN_BOTTOM,
               CHANDELIER_PAN_BOTTOM_R * math.sin(2.0 * math.pi * k / CHANDELIER_PAN_SIDES))
              for k in range(CHANDELIER_PAN_SIDES)]
    top = [(CHANDELIER_ARM_REACH + CHANDELIER_PAN_RADIUS * math.cos(2.0 * math.pi * k / CHANDELIER_PAN_SIDES),
            ARM_PAN_TOP,
            CHANDELIER_PAN_RADIUS * math.sin(2.0 * math.pi * k / CHANDELIER_PAN_SIDES))
           for k in range(CHANDELIER_PAN_SIDES)]
    faces = [[bottom[k], bottom[(k + 1) % CHANDELIER_PAN_SIDES],
              top[(k + 1) % CHANDELIER_PAN_SIDES], top[k]] for k in range(CHANDELIER_PAN_SIDES)]
    faces.append(list(top))
    faces.append(list(bottom))
    kit_solid(mb, faces, SLOT_GILT)

    # 3. The candle (chandelier_glow): the hexagonal prism on the pan's top; the top cap
    #    kept (P1's area), the base open (it sits on the pan's top disc).
    solids.append(('candle', len(mb.faces)))
    base = [(CHANDELIER_ARM_REACH + CHANDELIER_CANDLE_RADIUS * math.cos(2.0 * math.pi * k / CHANDELIER_CANDLE_SIDES),
             ARM_PAN_TOP,
             CHANDELIER_CANDLE_RADIUS * math.sin(2.0 * math.pi * k / CHANDELIER_CANDLE_SIDES))
            for k in range(CHANDELIER_CANDLE_SIDES)]
    top = [(p[0], ARM_CANDLE_TOP, p[2]) for p in base]
    faces = [[base[k], base[(k + 1) % CHANDELIER_CANDLE_SIDES],
              top[(k + 1) % CHANDELIER_CANDLE_SIDES], top[k]] for k in range(CHANDELIER_CANDLE_SIDES)]
    faces.append(list(top))
    kit_solid(mb, faces, SLOT_GLOW)

    # 4. The flame chip (chandelier_glow): the 4-sided bipyramid on the candle top; the
    #    equator square is axis-aligned in the arm's own frame (the corners on the axes),
    #    the lower apex touching the candle's top.
    solids.append(('flame', len(mb.faces)))
    square = [(CHANDELIER_ARM_REACH + CHANDELIER_FLAME_R * math.cos(math.pi / 2.0 * k),
               ARM_FLAME_EQ,
               CHANDELIER_FLAME_R * math.sin(math.pi / 2.0 * k)) for k in range(4)]
    apex_lo = (CHANDELIER_ARM_REACH, ARM_CANDLE_TOP, 0.0)
    apex_hi = (CHANDELIER_ARM_REACH, ARM_FLAME_APEX, 0.0)
    faces = [[apex_lo, square[k], square[(k + 1) % 4]] for k in range(4)]
    faces += [[apex_hi, square[k], square[(k + 1) % 4]] for k in range(4)]
    kit_solid(mb, faces, SLOT_GLOW)

    # 5. The crystal drops: CHANDELIER_DROPS octahedra under the pan, tops tangent to the
    #    pan's bottom, offset ±CHANDELIER_DROP_X along the arm axis (the fence-tight
    #    tier stack hangs them lowest — the min-y fence binds on these).
    solids.append(('drops', len(mb.faces)))
    for sign in (-1.0, 1.0):
        kit_octahedron(mb, (CHANDELIER_ARM_REACH + sign * CHANDELIER_DROP_X, ARM_DROP_CENTRE, 0.0),
                       (CRYSTAL_BEAD_R, CRYSTAL_DROP_H / 2.0, CRYSTAL_BEAD_R), SLOT_CRYSTAL)

    plan = _assert_chand_arm_pins(mb, solids)
    ranges = _solid_ranges(solids, len(mb.faces))
    gilt_last = next(last for name, _, last in ranges if name == 'pan')
    glow_first = next(first for name, first, _ in ranges if name == 'candle')
    glow_last = next(last for name, _, last in ranges if name == 'flame')
    runs = [('arm-gilt', 0, gilt_last, SLOT_GILT),
            ('arm-glow', glow_first, glow_last, SLOT_GLOW),
            ('arm-crystal', glow_last, len(mb.faces), SLOT_CRYSTAL)]
    plan = _chand_pack(mb, runs, plan)
    # The allocator counter consumes one cell per b.faces entry: leave exactly the
    # datablock's cell count as sentinels, then stash the plan for realize_chandelier.
    b.faces.extend([((0, 1, 2), 0)] * _chand_datablock_cells('chandelier_arm'))
    b._jordan_fixtures = plan
    _record_chand_plan('chandelier_arm', plan)
    return plan


def _assert_chand_arm_pins(mb, solids):
    """The arm archetype's builder self-checks: the face/tri pins, P2 (the glow faces are
    the candle + the flame only), and P1 (the glow area ×36 inside the chandelier band).
    Returns the derived rows for the plan and the declared summary."""
    faces = mb.faces
    verts = mb.verts
    ranges = _solid_ranges(solids, len(faces))
    if len(solids) != 5:
        raise RuntimeError(f'jordan_fixtures: expected 5 arm solids, got {len(solids)}')
    if mb.triangles() > CHANDELIER_ARM_TRI_CAP:
        raise RuntimeError(f'jordan_fixtures: the arm archetype carries {mb.triangles()} tris '
                           f'> the CHANDELIER_ARM_TRI_CAP {CHANDELIER_ARM_TRI_CAP}')

    # P2 (the glow-surface law): the only glow faces are the candle bodies + the flames.
    candle_flame = {name for name, _, _ in ranges if name.startswith(('candle', 'flame'))}
    glow_solids = set()
    for name, first, last in ranges:
        if any(slot == SLOT_GLOW for _, slot in faces[first:last]):
            glow_solids.add(name)
    if glow_solids != candle_flame:
        raise RuntimeError(f'jordan_fixtures: P2 violated — the arm\'s glow faces carry '
                           f'{sorted(glow_solids)} (the law: candle bodies + flame chips only)')

    # P1 (the glow-area band): the glow-class area per instance ×36 arms.
    glow_area = 0.0
    weighted = [0.0, 0.0, 0.0]
    for idx, slot in faces:
        if slot != SLOT_GLOW:
            continue
        pts = [verts[i] for i in idx]
        area = _polygon_area(pts)
        glow_area += area
        c = _face_centroid(pts)
        for axis in range(3):
            weighted[axis] += area * c[axis]
    centroid = tuple(axis / glow_area for axis in weighted)
    lo, hi = GLOW_AREA_BAND_CHANDELIER
    total_area = glow_area * sum(CHANDELIER_ARMS)
    if not lo <= total_area <= hi:
        raise RuntimeError(f'jordan_fixtures: P1 violated — the chandelier glow area '
                           f'{total_area:.6f} m² outside {lo}..{hi}')
    return {'glowAreaM2': round(total_area, 6), 'glowAreaPerArmM2': round(glow_area, 6),
            'chipCentroidLocal': tuple(round(v, 6) for v in centroid),
            'tris': mb.triangles()}


def build_chandelier_bead(b):
    """The chandelier's bead: ONE crystal octahedron mesh (8 tris, r 0.022) referenced by
    300 nodes (the festoons' 252 + the pendants' 48 share the archetype — the balustrade
    convention). The height is CRYSTAL_BEAD_H, not the drops' CRYSTAL_DROP_H, so the
    driver's dedup step cannot merge this mesh with the arm archetype's drops."""
    kit_octahedron = _k('kit_octahedron')
    mb = _k('MeshBuilder')('chandelier_bead')
    # The slot is the index within THIS datablock's own materials list (['crystal']): 0.
    kit_octahedron(mb, (0.0, 0.0, 0.0), (CRYSTAL_BEAD_R, CRYSTAL_BEAD_H / 2.0, CRYSTAL_BEAD_R), 0)
    if len(mb.faces) != 8 or mb.triangles() != 8:
        raise RuntimeError('jordan_fixtures: the bead is not an 8-tri octahedron')
    plan = _chand_pack(mb, [('bead-crystal', 0, len(mb.faces), 0)], {'tris': 8})
    b.faces.extend([((0, 1, 2), 0)] * _chand_datablock_cells('chandelier_bead'))
    b._jordan_fixtures = plan
    _record_chand_plan('chandelier_bead', plan)
    # The assembly's envelope/anchor checks run once, here, after the LAST of the three
    # builders: the plans for the stem and the arm exist by then.
    state = _chand_state()
    if len(state['plans']) == 3:
        state['assembly'] = _assert_chand_assembly()
    return plan


def build_chandelier_stem(b):
    """The chandelier's stem: ONE gilt primitive built IN-PLACE at CHAND_C (the anchor
    law — the assembly replaces the placeholder at the same anchor, ×1). One lathe,
    CHANDELIER_STEM_SIDES × CHANDELIER_STEM_RINGS: the ceiling rose + the vase stem (the
    three tier mount rings ride the profile) + the bowl. ≤ 900 tris; the profile's tip
    sits one fence-margin above CHANDELIER_MIN_Y and keeps the derived core lamp's
    committed 0.05 sphere clearance."""
    kit_lathe = _k('kit_lathe')
    cx, cz = _k('CHAND_C')
    mb = _k('MeshBuilder')('chandelier')
    kit_lathe(mb, _stem_rings(), CHANDELIER_STEM_SIDES, cx=cx, cz=cz, mat=SLOT_GILT)
    counts = _chand_face_counts()
    if len(mb.faces) != counts[0]:
        raise RuntimeError(f'jordan_fixtures: the stem built {len(mb.faces)} faces, the pin '
                           f'wants {counts[0]}')
    if mb.triangles() > 900:
        raise RuntimeError(f'jordan_fixtures: the stem carries {mb.triangles()} tris > 900')
    if min(p[1] for p in mb.verts) < _chand_min_y() - 1e-9:
        raise RuntimeError('jordan_fixtures: the stem dips below CHANDELIER_MIN_Y')
    plan = _chand_pack(mb, [('stem-gilt', 0, len(mb.faces), SLOT_GILT)], {'tris': mb.triangles()})
    b.faces.extend([((0, 1, 2), 0)] * _chand_datablock_cells('chandelier'))
    b._jordan_fixtures = plan
    _record_chand_plan('chandelier', plan)
    return plan


def _chand_pack(mb, runs, derived):
    """The chandelier's sub-cell pack plan (the B2 law): the units are the datablock's
    UNIQUE faces (the instances share the archetype's islands — the balustrade
    convention); each face's rect is its box_uv footprint at FIXTURE_TEXELS_PER_M,
    floored to FIXTURE_LM_MIN_PX per axis, + 2px pads per side; the faces distribute
    across the datablock's own cells (the B1 shares law's base/extra shape, by face
    count), shelf-packed 32×32. `runs` carry the share-table name, the [first, last) face
    range and the slot, in construction order. FAILS LOUD on any overflow or an empty
    cell (every row must carry real texels)."""
    box_uv = _k('box_uv')
    newell = _k('newell')
    prefix = runs[0][0].split('-')[0]
    entries = []
    for name, first, last, slot in runs:
        for pi in range(first, last):
            idx, _slot = mb.faces[pi]
            pts = [mb.verts[i] for i in idx]
            proj = [box_uv(p, newell(pts)) for p in pts]
            us, vs = [p[0] for p in proj], [p[1] for p in proj]
            du = (max(us) - min(us)) or 1.0
            dv = (max(vs) - min(vs)) or 1.0
            entries.append({'face': pi, 'slot': slot, 'solid': name,
                            'duPx': du * FIXTURE_TEXELS_PER_M, 'dvPx': dv * FIXTURE_TEXELS_PER_M})
    total = len(entries)
    pinned = sum(row['count'] for row in _chand_share_table()
                 if row['name'].startswith(prefix))
    if total != pinned:
        raise RuntimeError(f'jordan_fixtures: the {prefix} built {total} faces, the pin '
                           f'wants {pinned}')
    plan_cells = []
    for name, first, last, slot in runs:
        share_row = next(row for row in _chand_share_table() if row['name'] == name)
        run_entries = [entry for entry in entries if first <= entry['face'] < last]
        if len(run_entries) != share_row['count']:
            raise RuntimeError(f'jordan_fixtures: the run {name} built '
                               f'{len(run_entries)} faces, the pin wants {share_row["count"]}')
        share = share_row['cells']
        base, extra = divmod(len(run_entries), share)
        cursor = 0
        for _cell_index in range(share):
            count = base + (1 if _cell_index < extra else 0)
            if count == 0:
                raise RuntimeError(f'jordan_fixtures: the run {name} leaves an empty '
                                   'cell — every row must carry texels')
            cell = {'slot': slot, 'run': name, 'entries': run_entries[cursor:cursor + count]}
            cursor += count
            x = y = row_h = 0
            for entry in cell['entries']:
                entry['w'] = max(int(math.ceil(entry['duPx'])), FIXTURE_LM_MIN_PX) + 2 * FIXTURE_LM_PAD_PX
                entry['h'] = max(int(math.ceil(entry['dvPx'])), FIXTURE_LM_MIN_PX) + 2 * FIXTURE_LM_PAD_PX
                if x + entry['w'] > 32:
                    x = 0
                    y += row_h
                    row_h = 0
                if x + entry['w'] > 32 or y + entry['h'] > 32:
                    raise RuntimeError(f'jordan_fixtures: the face {entry["face"]} of '
                                       f'{name} ({entry["w"]}x{entry["h"]}px) does not '
                                       'fit its cell')
                entry['cell'] = len(plan_cells)
                entry['pos'] = (x, y)
                x += entry['w']
                row_h = max(row_h, entry['h'])
            plan_cells.append(cell)
    if sum(len(cell['entries']) for cell in plan_cells) != total:
        raise RuntimeError('jordan_fixtures: the pack plan dropped faces')
    plan = {'mb': mb, 'cells': plan_cells, 'entries': entries,
            'cellsCount': len(plan_cells)}
    plan.update(derived)
    return plan


def _record_chand_plan(name, plan):
    """Stash the datablock's plan in the module state (the summary's declared rows and
    the anchor's assembly checks read them after the runner loop)."""
    state = _chand_state()
    state['plans'][name] = plan


def _chand_state():
    global _CHAND_STATE
    if _CHAND_STATE is None:
        _CHAND_STATE = {'plans': {}, 'arms': (), 'beads': ()}
    return _CHAND_STATE


def _assert_chand_assembly():
    """The assembly's envelope/anchor law, run once after the three builders: the union
    bbox (the stem in place + the 36 placed arms + the 300 placed beads) must sit inside
    the placeholder envelope grown 0.10 per side with the lowest y >= CHANDELIER_MIN_Y;
    the chips' area-weighted centroid (the arm archetype's glow faces × the tiers) must
    equal the planned fence-tight value; the core lamp's derived y is recorded with the
    achieved distance and the placeholder card's centroid continuity."""
    cx, cz = _k('CHAND_C')
    lo = [math.inf] * 3
    hi = [-math.inf] * 3

    def grow(pts):
        for x, y, z in pts:
            for axis, value in enumerate((x, y, z)):
                lo[axis] = min(lo[axis], value)
                hi[axis] = max(hi[axis], value)

    stem = _CHAND_STATE['plans']['chandelier']
    arm = _CHAND_STATE['plans']['chandelier_arm']
    bead = _CHAND_STATE['plans']['chandelier_bead']
    grow(stem['mb'].verts)
    for location, rot_y in _CHAND_STATE['arms']:
        c, s = math.cos(rot_y), math.sin(rot_y)
        grow([(location[0] + p[0] * c + p[2] * s, location[1] + p[1],
               location[2] - p[0] * s + p[2] * c) for p in arm['mb'].verts])
    for location in _CHAND_STATE['beads']:
        grow([(location[0] + p[0], location[1] + p[1], location[2] + p[2])
              for p in bead['mb'].verts])
    env = _chand_envelope()
    if not (env['x'][0] <= lo[0] and hi[0] <= env['x'][1]
            and env['y'][0] <= lo[1] and hi[1] <= env['y'][1]
            and env['z'][0] <= lo[2] and hi[2] <= env['z'][1]):
        raise RuntimeError(f'jordan_fixtures: the chandelier assembly bbox '
                           f'{[round(v, 3) for v in lo]}..{[round(v, 3) for v in hi]} leaves '
                           f"the placeholder envelope {env}")
    if lo[1] < _chand_min_y() - 1e-9:
        raise RuntimeError(f'jordan_fixtures: the assembly\'s lowest y {lo[1]:.6f} dips below '
                           f'CHANDELIER_MIN_Y {_chand_min_y()}')

    # The chips' area-weighted centroid over the 36 placed arms (each arm's glow faces
    # ride its rigid yaw −φ about the mount).
    area_total = 0.0
    weighted = [0.0, 0.0, 0.0]
    for location, rot_y in _CHAND_STATE['arms']:
        c, s = math.cos(rot_y), math.sin(rot_y)
        for idx, slot in arm['mb'].faces:
            if slot != SLOT_GLOW:
                continue
            pts = [arm['mb'].verts[i] for i in idx]
            area = _polygon_area(pts)
            px, py, pz = _face_centroid(pts)
            world = (location[0] + px * c + pz * s, location[1] + py,
                     location[2] - px * s + pz * c)
            area_total += area
            for axis in range(3):
                weighted[axis] += area * world[axis]
    centroid = tuple(axis / area_total for axis in weighted)
    planned = _chand_planned_centroid()
    if abs(centroid[1] - planned[1]) > 1e-6 or math.dist(centroid, planned) > 1e-6:
        raise RuntimeError(f'jordan_fixtures: the chips\' centroid {tuple(round(v, 6) for v in centroid)} '
                           f'left the planned fence-tight {planned}')
    core_y = core_lamp_y()
    return {'bbox': {'lo': tuple(round(v, 6) for v in lo), 'hi': tuple(round(v, 6) for v in hi)},
            'minY': round(lo[1], 6), 'maxY': round(hi[1], 6),
            'coreLampY': core_y, 'centroid': tuple(round(v, 6) for v in centroid),
            'achievedMissM': round(centroid[1] - core_y, 6),
            'cardCentroidY': round(_k('CHAND_CORE_Y'), 6),
            'cardContinuityM': round(centroid[1] - _k('CHAND_CORE_Y'), 6),
            'fit': _chand_fit(), 'glowAreaM2': arm['glowAreaM2'],
            'tierPans': _chand_tier_pans()}


def _chand_planned_centroid():
    """The planned fence-tight chips' centroid: per arm the glow faces' area-weighted
    local centroid above the mount, plus the tiers' arm-weighted DY offsets."""
    arm = _CHAND_STATE['plans']['chandelier_arm']
    local = arm['chipCentroidLocal']
    rows = _CHAND_STATE['arms']
    area = arm['glowAreaPerArmM2']
    total = area * len(rows)
    weighted = [0.0, 0.0, 0.0]
    for location, rot_y in rows:
        c, s = math.cos(rot_y), math.sin(rot_y)
        world = (location[0] + local[0] * c + local[2] * s, location[1] + local[1],
                 location[2] - local[0] * s + local[2] * c)
        for axis in range(3):
            weighted[axis] += area * world[axis]
    return tuple(round(axis / total, 6) for axis in weighted)


def _chand_festoon_beads():
    """The 252 festoon beads: 7 per span over 36 spans (the tiers' arm counts), arcing
    between adjacent arms' top rims with the fence-clamped CHANDELIER_FESTOON_SAG dip."""
    cx, cz = _k('CHAND_C')
    rows = []
    for tier, (count, radius, pan_top) in enumerate(
            zip(CHANDELIER_ARMS, CHANDELIER_TIER_RADIUS, _chand_tier_pans())):
        rim = radius + CHANDELIER_PAN_RADIUS
        azimuths = [2.0 * math.pi * k / count + _CHAND_AZIMUTH_OFFSETS[tier] for k in range(count)]
        for k in range(count):
            phi_a, phi_b = azimuths[k], azimuths[(k + 1) % count]
            ax, az = cx + rim * math.cos(phi_a), cz + rim * math.sin(phi_a)
            bx, bz = cx + rim * math.cos(phi_b), cz + rim * math.sin(phi_b)
            for s in range(1, CHANDELIER_FESTOON_BEADS + 1):
                t = s / (CHANDELIER_FESTOON_BEADS + 1.0)
                rows.append((round(ax + (bx - ax) * t, 6),
                             round(pan_top - CHANDELIER_FESTOON_SAG * math.sin(math.pi * t), 6),
                             round(az + (bz - az) * t, 6)))
    if len(rows) != sum(CHANDELIER_ARMS) * CHANDELIER_FESTOON_BEADS:
        raise RuntimeError('jordan_fixtures: the festoon bead count left its pin')
    return rows


def _chand_pendants():
    """The 48 pendants: the mid tier's 24 (2 under each pan's transverse rim edges) and
    the top tier's 24 (2 rim + 1 under each span's dip bead), tops tangent to their
    anchor's underside."""
    cx, cz = _k('CHAND_C')
    pans = _chand_tier_pans()
    rows = []
    half = CRYSTAL_BEAD_H / 2.0
    count_mid = CHANDELIER_ARMS[1]
    radius_mid = CHANDELIER_TIER_RADIUS[1]
    for k in range(count_mid):
        phi = 2.0 * math.pi * k / count_mid + _CHAND_AZIMUTH_OFFSETS[1]
        for sign in (-1.0, 1.0):
            rows.append((round(cx + radius_mid * math.cos(phi)
                               - sign * CHANDELIER_PAN_RADIUS * math.sin(phi), 6),
                         round(pans[1] - CHANDELIER_PAN_H - half, 6),
                         round(cz + radius_mid * math.sin(phi)
                               + sign * CHANDELIER_PAN_RADIUS * math.cos(phi), 6)))
    count_top = CHANDELIER_ARMS[2]
    radius_top = CHANDELIER_TIER_RADIUS[2]
    rim_top = radius_top + CHANDELIER_PAN_RADIUS
    azimuths = [2.0 * math.pi * k / count_top + _CHAND_AZIMUTH_OFFSETS[2] for k in range(count_top)]
    for k in range(count_top):
        phi = azimuths[k]
        for sign in (-1.0, 1.0):
            rows.append((round(cx + radius_top * math.cos(phi)
                               - sign * CHANDELIER_PAN_RADIUS * math.sin(phi), 6),
                         round(pans[2] - CHANDELIER_PAN_H - half, 6),
                         round(cz + radius_top * math.sin(phi)
                               + sign * CHANDELIER_PAN_RADIUS * math.cos(phi), 6)))
        phi_b = azimuths[(k + 1) % count_top]
        phi_mid = math.atan2(math.sin(phi) + math.sin(phi_b), math.cos(phi) + math.cos(phi_b))
        rows.append((round(cx + rim_top * math.cos(math.pi / count_top) * math.cos(phi_mid), 6),
                     round(pans[2] - CHANDELIER_FESTOON_SAG - 2.0 * half, 6),
                     round(cz + rim_top * math.cos(math.pi / count_top) * math.sin(phi_mid), 6)))
    if len(rows) != CHANDELIER_PENDANTS:
        raise RuntimeError(f'jordan_fixtures: the pendant count {len(rows)} left its pin '
                           f'{CHANDELIER_PENDANTS}')
    return rows


def _chand_rosters():
    """The 36 arm placements (the mounts on the stem's tier rings, the rigid yaw −φ) and
    the 300 bead placements (the festoons + the pendants), computed once from the pins."""
    state = _chand_state()
    if state['arms']:
        return
    arms = []
    for tier, (count, radius, pan_top) in enumerate(
            zip(CHANDELIER_ARMS, CHANDELIER_TIER_RADIUS, _chand_tier_pans())):
        mount_r = round(radius - CHANDELIER_ARM_REACH, 6)
        mount_y = round(pan_top - CHANDELIER_ARM_MOUNT_DROP, 6)
        cx, cz = _k('CHAND_C')
        for k in range(count):
            phi = 2.0 * math.pi * k / count + _CHAND_AZIMUTH_OFFSETS[tier]
            arms.append(((round(cx + mount_r * math.cos(phi), 6), mount_y,
                          round(cz + mount_r * math.sin(phi), 6)), -phi))
    beads = _chand_festoon_beads() + _chand_pendants()
    if len(arms) != sum(CHANDELIER_ARMS) or len(beads) != 300:
        raise RuntimeError(f'jordan_fixtures: the rosters left their pins '
                          f'({len(arms)} arms, {len(beads)} beads)')
    state['arms'] = tuple(arms)
    state['beads'] = tuple(beads)


def arm_roster():
    """The 36 (location, rot_y) arm placements for jordan.py's put loop; empty under the
    placeholder form (the committed node order is byte-identical)."""
    return _CHAND_STATE['arms'] if _CHAND_STATE else ()


def bead_roster():
    """The 300 bead placements for jordan.py's put loop; empty under the placeholder."""
    return _CHAND_STATE['beads'] if _CHAND_STATE else ()


def declared_rows():
    """The assembly's honest summary rows (jordan.py's declared.chandelierFixtures under
    slice_e): the measured bbox/anchor/envelope/fit/P1 rows beside the cells and tris."""
    state = _CHAND_STATE
    if not state or len(state.get('plans', {})) != 3:
        raise RuntimeError('jordan_fixtures: declared_rows before the assembly was built')
    assembly = state['assembly']
    shares = _chand_share_table()
    first = CHANDELIER_LM_FIRST_CELL
    cell_rows = []
    for name in ('chandelier', 'chandelier_arm', 'chandelier_bead'):
        cells = _chand_datablock_cells(name)
        cell_rows.append({'datablock': name, 'cells': cells,
                          'cellRange': [first, first + cells - 1]})
        first += cells
    return {
        'anchor': {'coreLampY': assembly['coreLampY'],
                   'coreLampLaw': ("bake.py's committed lower-to-clear descent against the "
                                   'committed CHAND_CORE rows (the rig never moves)'),
                   'chipsCentroidY': assembly['centroid'][1],
                   'achievedMissM': assembly['achievedMissM'],
                   'law': ('the glow ruling\'s GLOW_ANCHOR_TOL 0.03 against the core lamp is '
                           'proven unreachable inside the CHANDELIER_MIN_Y fence (the core '
                           'lamp sits 0.25 BELOW the fence floor; the chips are fence '
                           'geometry) — the B1 gaze precedent: the lever (the tier-stack '
                           'height) runs to its fence floor and the binding number is the '
                           "placeholder card's own emission centroid"),
                   'cardCentroidY': assembly['cardCentroidY'],
                   'cardContinuityM': assembly['cardContinuityM']},
        'assembly': {'minYGltf': assembly['minY'], 'maxYGltf': assembly['maxY'],
                     'bboxGltf': list(assembly['bbox']['lo']) + list(assembly['bbox']['hi']),
                     'envelope': _chand_envelope(), 'envelopeGrowM': CHANDELIER_ENVELOPE_GROW,
                     'fit': assembly['fit'],
                     'tierPansM': list(assembly['tierPans']),
                     'mountDropM': CHANDELIER_ARM_MOUNT_DROP,
                     'armReachM': CHANDELIER_ARM_REACH,
                     'instances': {'arms': len(state['arms']), 'beads': len(state['beads'])}},
        'glow': {'areaM2': assembly['glowAreaM2'], 'band': list(GLOW_AREA_BAND_CHANDELIER),
                 'surfaces': 'candle bodies + flame chips only (P2); no core glow chip'},
        'cells': {'rows': cell_rows, 'shares': [{'run': row['name'], 'cells': row['cells']}
                                                for row in shares],
                  'law': ('the retired placeholder region 2779..2992 (the fixtures-round '
                          '2881..3094 shifted −102 by the plafond round), split per '
                          '(datablock, material) run; every cell carries real texels; the '
                          "allocator counter and the downstream UV2 offsets untouched; "
                          "cells 3,372")},
        'tris': {'stem': state['plans']['chandelier']['tris'],
                 'armArchetype': state['plans']['chandelier_arm']['tris'],
                 'bead': state['plans']['chandelier_bead']['tris'],
                 'drawn': (state['plans']['chandelier']['tris']
                           + state['plans']['chandelier_arm']['tris'] * len(state['arms'])
                           + state['plans']['chandelier_bead']['tris'] * len(state['beads'])),
                 'cap': CHANDELIER_TRI_CAP},
    }


def realize_chandelier(b, material_names, first_cell):
    """The chandelier assembly's realize (the stem / the arm archetype / the bead): the
    committed one-cell-per-FACE law does NOT apply to these datablocks — the pack plan
    assigns the archetype's unique faces to shared 32×32 cells inside the datablock's own
    retired range (single-material runs; the glow cells identifiable). Builds the mesh
    datablock + object (the committed realize's shape), writes the datablock's cells.json
    rows (truthful, consecutive, single-material), the face→cell map and the fixture LM
    rows, then swaps b.faces/b.verts to the real faces so the runner loop's
    b.triangles() and the meshes row stay truthful."""
    plan = getattr(b, '_jordan_fixtures', None)
    if plan is None:
        raise RuntimeError('jordan_fixtures: realize_chandelier without a builder plan')
    mb = plan['mb']
    to_b = _k('to_b')
    lm_res = _k('LM_RES')
    lm_grid = _k('LM_GRID')
    lm_capacity = _k('LM_CAPACITY')
    cell_px = lm_res // lm_grid
    lm_cell_map = _k('LM_CELL_MAP')
    material_repeat = _k('MATERIAL_REPEAT_M')
    uv_tile = _k('UV_TILE_M')
    surface_projection = _k('surface_projection')
    box_uv = _k('box_uv')
    newell = _k('newell')

    me = bpy.data.meshes.new(b.name)
    me.from_pydata([to_b(p) for p in mb.verts], [], [list(f) for f, _ in mb.faces])
    me.update()
    for name in material_names:
        me.materials.append(bpy.data.materials[name])
    me.uv_layers.new(name='uv')
    lm = me.uv_layers.new(name='lm')
    expected_first = _chand_expected_first(b.name)
    cells_count = _chand_datablock_cells(b.name)
    if first_cell != expected_first:
        raise RuntimeError(f'jordan_fixtures: the allocator\'s first_cell {first_cell} != the '
                           f'datablock\'s retired range start {expected_first}')
    if first_cell < 0 or first_cell + cells_count > lm_capacity:
        raise RuntimeError(f'jordan_fixtures: the retired range {first_cell}..'
                           f'{first_cell + cells_count - 1} outside the atlas')
    entry_of_face = {}
    for cell in plan['cells']:
        for entry in cell['entries']:
            entry_of_face[entry['face']] = entry

    cell_map = lm_cell_map['cells']
    uv_layer = me.uv_layers[0]
    face_cells = []
    for pi, poly in enumerate(me.polygons):
        idx, slot = mb.faces[pi]
        poly.material_index = slot
        pts = [mb.verts[i] for i in idx]
        repeat = material_repeat.get(material_names[slot], uv_tile)
        mapped = [(u / repeat, v / repeat) for u, v in surface_projection(pts)]
        for li, loop in enumerate(poly.loop_indices):
            uv_layer.data[loop].uv = mapped[li]
        entry = entry_of_face[pi]
        cell_index = first_cell + entry['cell']
        cx = cell_index % lm_grid
        cy = cell_index // lm_grid
        key = f'{cx},{cy}'
        material = material_names[slot]
        if key in cell_map:
            if cell_map[key]['material'] != material:
                raise RuntimeError(f'jordan_fixtures: cell {key} would mix materials '
                                   f'({cell_map[key]["material"]} vs {material})')
        else:
            cell_map[key] = {'object': b.name, 'material': material}
        box_x, box_y = entry['pos']
        proj = [box_uv(p, newell(pts)) for p in pts]
        us, vs = [p[0] for p in proj], [p[1] for p in proj]
        u0, v0 = min(us), min(vs)
        du = (max(us) - u0) or 1.0
        dv = (max(vs) - v0) or 1.0
        interior_x = box_x + FIXTURE_LM_PAD_PX
        interior_y = box_y + FIXTURE_LM_PAD_PX
        for li, loop in enumerate(poly.loop_indices):
            fu = (proj[li][0] - u0) / du
            fv = (proj[li][1] - v0) / dv
            lm.data[loop].uv = ((cx * cell_px + interior_x + fu * entry['duPx']) / lm_res,
                                (cy * cell_px + interior_y + fv * entry['dvPx']) / lm_res)
        face_cells.append(cell_index)
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)

    used = sorted({entry['cell'] for entry in plan['entries']})
    if used != list(range(cells_count)):
        raise RuntimeError(f'jordan_fixtures: the packer used cells {used} — the datablock '
                           f'owns exactly {cells_count} (the allocator counter\'s law)')
    fixture_lm = lm_cell_map.setdefault('fixtureLm', {})
    runs = []
    for cell in plan['cells']:
        if runs and runs[-1]['run'] == cell['run']:
            runs[-1]['cells'] += 1
        else:
            runs.append({'run': cell['run'], 'cells': 1})
    fixture_lm[b.name] = {
        'islands': len(plan['entries']),
        'islandsLaw': ('per-face rects (the B2 law: the archetype\'s unique faces counted '
                       'once; the instances share them — the balustrade convention); several '
                       f"faces share one 32×32 cell at {round(FIXTURE_TEXELS_PER_M, 4)} "
                       f"texels/m = {FIXTURE_LM_SCALE}× the room's "
                       f'{round(ROOM_TEXELS_PER_M, 4)} texels/m'),
        'cells': cells_count,
        'cellRange': [first_cell, first_cell + cells_count - 1],
        'islandBoxPx': sum(e['w'] * e['h'] for e in plan['entries']),
        'runs': runs,
        'tris': plan['tris'],
        'glowAreaM2': plan.get('glowAreaM2', 0.0),
    }
    lm_cell_map.setdefault('faceCellMap', {})[b.name] = face_cells
    # The truthful face list for the runner loop's b.triangles() / meshes row.
    b.faces = mb.faces
    b.verts = mb.verts
    return len({slot for _, slot in mb.faces})


def realize_fixture(b, material_names, first_cell):
    """jordan.py's realize dispatcher's entry: the sconce rides the landed realize_sconce,
    the chandelier assembly rides realize_chandelier."""
    if b.name == 'sconce':
        return realize_sconce(b, material_names, first_cell)
    if b.name in ('chandelier', 'chandelier_arm', 'chandelier_bead'):
        return realize_chandelier(b, material_names, first_cell)
    raise RuntimeError(f'jordan_fixtures: no fixture realize for datablock {b.name!r}')


# --- the hook's row (jordan.py's ONE call) ------------------------------------------

# The review HIGH-4's reset law: what a slice_e build published into the caller's kit
# (the derived rig inputs in build_sconce_archetype) is undone at the NEXT build's
# entry, so a placeholder build after a slice_e build in ONE interpreter reads the
# caller's own rows again — never the previous build's derived ones. The _ABSENT
# sentinel marks "the kit did not carry the key before the publish" (the undo removes
# it again instead of writing the marker object).
_ABSENT = object()
_FIXTURE_PUBLISHED = None  # (the kit dict, {key: prior value | _ABSENT}) of the last build


def _reset_carried_state(kit):
    """Unconditionally reset the module's carried state at the entry of EVERY build:
    the B2 module state (the pack plans, the assembly rows, the cached rosters), the
    stored kit and the previous build's published rig inputs (the review HIGH-4: an
    interpreter reused across builds must not leak fixture state into a placeholder
    build, and every slice_e build re-stores the kit, re-derives the rosters and
    re-publishes its own rig inputs at builder time)."""
    global _KIT, _CHAND_STATE, _FIXTURE_PUBLISHED
    if _FIXTURE_PUBLISHED is not None:
        published_kit, prior_values = _FIXTURE_PUBLISHED
        if kit is published_kit:
            for key, prior in prior_values.items():
                if prior is _ABSENT:
                    published_kit.pop(key, None)
                else:
                    published_kit[key] = prior
        _FIXTURE_PUBLISHED = None
    _KIT = None
    _CHAND_STATE = None


def fixture_rows(kit, form):
    """The runner's fixture rows (B1's sconce + B2's chandelier assembly). 'placeholder'
    returns the committed rows unchanged (the byte-identical path; nothing is stored,
    nothing published); 'slice_e' stores the kit, creates the one new material and
    returns the assembly + archetype rows (their realize rides jordan.py's realize
    dispatcher, their instances the module's rosters). The review HIGH-4: BOTH forms
    reset the module's carried state first (see _reset_carried_state)."""
    global _KIT
    _reset_carried_state(kit)
    if form == 'placeholder':
        return [('chandelier', kit['build_chandelier'], ['gilt', 'chandelier_glow']),
                ('sconce', kit['build_sconce'], ['plaster_warm', 'sconce_glow'])]
    if form != 'slice_e':
        raise RuntimeError(f'jordan_fixtures: unknown FIXTURE_FORM {form!r} '
                           "('placeholder' | 'slice_e')")
    _KIT = kit
    kit['make_material'](CRYSTAL_NAME, None, CRYSTAL_ROUGHNESS,
                         metallic=CRYSTAL_METALLIC, base_color=CRYSTAL_BASE)
    _chand_rosters()
    return [('chandelier', build_chandelier_stem, ['gilt']),
            ('chandelier_arm', build_chandelier_arm, ['gilt', 'chandelier_glow', CRYSTAL_NAME]),
            ('chandelier_bead', build_chandelier_bead, [CRYSTAL_NAME]),
            ('sconce', build_sconce_archetype, list(SCONCE_MATERIALS))]
