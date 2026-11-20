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
12 retired cells 3095..3106 (keys '23,48'..'34,48' — the same keys the placeholder
always owned, a contiguous 384×32 px strip flanked by the chandelier's row-48 tail and
the cornice), and FIXTURE_LM_BLOCK (0,55)..(5,55) stays free for B2's chandelier. The
census figure stays 3,474 (the D5 self-check passes unedited), the AS-3 claim (≤20 cells
inside the block + the retired placeholder cells) holds, and every cells.json row stays
truthful: 12 cells, each carrying real single-material texels.
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
ROOM_LM_CELLS = 3474                    # the B0-measured atlas occupancy (main @ 3da446d)
ROOM_LM_AREA_M2 = 4910.658490           # the measured lightmapped surface (the B4 estimate's
                                        # own formula, with the measured area, not its ≈3800
                                        # guess: density = sqrt(cells·32²/area))
ROOM_TEXELS_PER_M = (ROOM_LM_CELLS * 32.0 * 32.0 / ROOM_LM_AREA_M2) ** 0.5
FIXTURE_TEXELS_PER_M = FIXTURE_LM_SCALE * ROOM_TEXELS_PER_M
# The datablock's own retired cells (linear; keys '23,48'..'34,48' at row 48). The B0
# census measured them as the placeholder sconce's cells; this scheme keeps them owned.
SCONCE_LM_CELLS = 12
SCONCE_LM_FIRST_CELL = 3095
SCONCE_LM_CELL_KEY_0 = (23, 48)
# The archetype's slots (the runner row's materials order; one glTF primitive per slot).
SLOT_GILT, SLOT_GLOW, SLOT_CRYSTAL = 0, 1, 2
SCONCE_MATERIALS = ['gilt', 'sconce_glow', CRYSTAL_NAME]

_KIT = None  # the caller's namespace dict, stored by sconce_row (never jordan.py's module)


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
    # height (0.25) by the anchor law and the depth centre is the candle axis.
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
    lm_cell_map['faceCellMap'] = {b.name: face_cells}
    lm_cell_map['fixtureLm'] = {b.name: {
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
    }}
    # The truthful face list for the runner loop's b.triangles() / meshes row.
    b.faces = mb.faces
    b.verts = mb.verts
    return len({slot for _, slot in mb.faces})


# --- the hook's row (jordan.py's ONE call) ------------------------------------------


def sconce_row(kit, form):
    """The runner's sconce row. 'placeholder' returns the committed row unchanged (the
    byte-identical path; nothing is stored, nothing published); 'slice_e' stores the
    kit, creates the one new material and returns the archetype row (its realize rides
    jordan.py's realize dispatcher)."""
    global _KIT
    if form == 'placeholder':
        return [('sconce', kit['build_sconce'], ['plaster_warm', 'sconce_glow'])]
    if form != 'slice_e':
        raise RuntimeError(f'jordan_fixtures: unknown FIXTURE_FORM {form!r} '
                           "('placeholder' | 'slice_e')")
    _KIT = kit
    kit['make_material'](CRYSTAL_NAME, None, CRYSTAL_ROUGHNESS,
                         metallic=CRYSTAL_METALLIC, base_color=CRYSTAL_BASE)
    return [('sconce', build_sconce_archetype, list(SCONCE_MATERIALS))]
