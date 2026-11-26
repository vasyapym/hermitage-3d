"""jordan slice 2b — the white-and-gold wall order (the exported-never-baked panel kit).

The round's law: turncascade-design.md (the ranked lacks §1, the pick §2, the laws
L1–L10 §3.1, the file plan §3.2, the route §3.3, the test pins T1–T9 §3.5, the
license row 3.6 appended to docs/artistic-license.md's «Jordan Staircase wall order
and finishes»), with design-staircase.md §2.2 (the per-room route: builder-only, the
existing gltf-transform / meshopt / quantization chain — no bake, no plate, no SVG,
no Chromium raster, no ktx2 row) and §3.1 (the asset chain) as the standing method.
ONE generator builds THREE element kinds into ONE wall_order mesh with TWO
primitives — prim 0 plaster_warm (the dressed panels' raised stucco bands), prim 1
gilt (the fillets, the scroll-lozenge cartouches, the drops, the twelve
Palace-Square porthole rings) — plus L7's cornice fascia reassignment (a
material-index move on the existing cornice mesh; no new material, no new texture
row: the roster stays 9).

THE EXPORTED-NEVER-BAKED LAW (L6, the rg-f6 declared-host adoption brought into this
room; the rastrelli-gallery.py precedent by name — BORROWED_ELEMENTS / adopt_lm_uv /
the build_room `if not BAKE` guard): jordan.py builds this module's row ONLY on the
export chain (`if not BAKE`), so the bake chain's scene — and therefore all three lm
plates and the probe — stay byte-identical BY CONSTRUCTION. The dress allocates NO
lightmap cells: jordan.py's cell counter skips it and its realize dispatcher diverts
to realize_wall_order, which writes UV1 straight from the adoption computed here and
never touches LM_CELL_MAP. Every face adopts ONE host shell face's own per-face
bbox→cell mapping (the committed realize law: cell = first_cell + face index; the lm
uv = (cx·cell + LM_PAD_PX + fu·inner)/LM_RES with inner = cell − 2·LM_PAD_PX;
LM_PAD_PX = 2 — the C6 correction replacing the design draft's «1.5 px»), the host
picked by point-in-polygon in wall-plane coordinates (L6's law; a point exactly on a
shared edge resolves deterministically to the +u/+v side face) with the
nearest-centroid fallback, and EVERY vertex clamped into that one host cell's
interior — so no triangle's UV1s span two cells (the T4 pin) and the dress inherits
the wall's day/dusk/night irradiance texel-for-texel, honouring the night pier halos
per bay (no ghost class; the pilaster_n lesson). Adoption is PER FACE (L6's element
law at its finest legal granularity: each bar piece, cartouche face, drop piece and
ring segment picks its own host; the coarse statement — one host per element — holds
because every rectilinear face is asserted to fit inside its host's bbox). Bars
longer than the host lattice are PRE-SPLIT at the shell's own field-edge lines (L6,
derived from the shell faces — never assumed) so a bar face never spans two host
faces; the cartouche and the ring segments are NOT pre-split — their overhanging
vertices clamp into their host cell (the C6 clamp clause), the cost being sub-texel
on a uniform gilt.

L5 CLEARANCE (builder asserts; the build fails loud): every panel/ring AABB clears
every pilaster, pilaster base, window frame, sconce and portal AABB by ≥ CLEAR_M;
a bay whose clear width − PANEL_W < SHRINK_M shrinks its panel to clear − SHRINK_M;
a bay holding a sconce inside the panel rect omits the panel (logged; the count is
pinned by the tests from the built truth). Two refinements the built geometry forced
(both inside the laws' own escape hatches): the bay's CLEAR WIDTH is measured
between its ARCHITECTURAL flanks (the pilaster, base and window frame classes — the
fittings and the portal are not bay boundaries; they resolve through the omit law
and the assert, the design's failure case (i)); a bay holding a sconce inside the
PLANNED panel rect omits before any shrink (the east bays: the sconces at z −82/−66
sit inside the 2.2-wide spans); and a surviving panel that still clears some
obstruction by < CLEAR_M omits (logged) instead of raising — L5's omission law per
the integration rules — while the RINGS' clearance stays fail-loud (their roster is
the portholes' own; a ring collision would be a kit bug).

Determinism law: no randomness, construction-order iteration only. Authored
coordinates are glTF world axes (+X east, +Y up, +Z south; jordan.py's to_b converts
at realize). This module NEVER imports jordan.py: the constants, the MeshBuilder and
the kit helpers arrive inside the namespace dict jordan.py's ONE hook passes (the
jordan_fixtures pattern), and the shell builder instance is handed over explicitly —
its faces carry the host cells (the shell is runners[0], so cell == face index).
"""

import math

# --- L2: the panel kit's constants (turncascade-design.md §3.1 L2) ------------------
PANEL_W = 2.2               # the dressed panel's outer width (== WIN_W, jamb-aligned)
PANEL_H = 4.4               # the dressed panel's outer height
PANEL_BAND_W = 0.18         # the raised stucco band's width
PANEL_BAND_D = 0.06         # the band's proud offset from the host wall plane
FILLET_W = 0.04             # the gilt fillet's width, along the band's inner edge
FILLET_D = 0.075            # the fillet's top proud offset
CARTOUCHE_W = 0.56          # the scroll-lozenge's ellipse width
CARTOUCHE_H = 1.50          # the scroll-lozenge's ellipse height
CARTOUCHE_D = 0.05          # the cartouche's proud offset
CARTOUCHE_SEG = 16          # the outline's vertex count (r(θ) = 1 + 0.18·cos 4θ)
CARTOUCHE_AMP = 0.18        # the scroll-lozenge's radial amplitude
CARTOUCHE_CENTRE_T = 0.70   # the centre rides y0 + 0.70·H
DROP_END_T = 0.18           # the drop's lower end rides y0 + 0.18·H
DROP_W = 0.05               # the gilt drop bead's width
DROP_D = 0.04               # the gilt drop bead's proud offset
# L2's proud ceiling for the panel elements (the ring's RING_D is L4's own law).
PANEL_MAX_PROUD = 0.08
# L3: the panel bands' y ranges (the north/south spandrel between the tiers; the
# east fields flanking the portal above the landing datum 10).
PANEL_Y_NS = (7.6, 12.0)    # lower head 6.5 + 1.1; upper sill 13.0 − 1.0
PANEL_Y_E = (11.4, 15.8)    # above the landing datum 10; under the portal head 16
# L4: the porthole ring (the south wall's twelve Palace-Square portholes).
RING_R_IN = 1.02
RING_R_OUT = 1.28
RING_D = 0.10               # the ring's max proud offset
RING_SEG = 16               # == PORT_SEG, the shell's angular origin (a = 2π·k/SEG)
RING_LIP_H = 0.04           # the inner lip's proud height
RING_CROWN_R = (1.10, 1.20) # the crown flat's radial span at the max proud
RING_PROFILE = ((RING_R_IN, 0.0), (RING_R_IN, RING_LIP_H),
                (RING_CROWN_R[0], RING_D), (RING_CROWN_R[1], RING_D), (RING_R_OUT, 0.0))
# L5: the clearance law's numbers.
CLEAR_M = 0.15      # the AABB clearance every built panel/ring must keep
SHRINK_M = 0.5      # a bay narrower than PANEL_W + SHRINK_M shrinks to clear − SHRINK_M
SHRINK_FLOOR = 0.1  # a shrunk panel never collapses below this width
PLANE_NEAR_M = 1.0  # an obstruction counts for a wall's bays within this plane distance
# finding 09: the cartouche is FIXED-size (L2) — the built panel's true half-extent is
# the lozenge's own, whatever the bay's width; a bay narrower than it omits.
CARTOUCHE_U_EXTENT = CARTOUCHE_W / 2.0 * (1.0 + CARTOUCHE_AMP)

# Module state (the jordan_fixtures pattern): filled by wall_order_rows at hook time,
# read by the builder and by jordan.py's summary writer.
_KIT = None                 # the caller's namespace dict (never a jordan.py import)
_SHELL = None               # the shell MeshBuilder (the hosts' face source + cell law)
WALL_ORDER_REPORT = None    # the built truth for summary.declared.wallArticulation


def _reset():
    """The carried state resets at EVERY hook call (the jordan_fixtures HIGH-4 law:
    an interpreter reused across builds never leaks the previous build's state)."""
    global _KIT, _SHELL, WALL_ORDER_REPORT
    _KIT, _SHELL, WALL_ORDER_REPORT = None, None, None


def reset_report():
    """finding 13: the report resets at every main() entry — a BAKE-chain build after
    an export build in one interpreter must not emit the previous build's
    wallArticulation row (the emission gates on THIS invocation's report)."""
    global WALL_ORDER_REPORT
    WALL_ORDER_REPORT = None


# --- the wall frames -----------------------------------------------------------------


class _Wall:
    """One host wall plane: the glTF axis, the plane constant, the proud sign (into
    the room) and the wall-plane coordinate mapping (z-walls → (x, y); x-walls →
    (z, y) — the same coordinates realize's box_uv law uses for these faces)."""

    def __init__(self, name, axis, plane, sign):
        self.name = name
        self.axis = axis
        self.plane = plane
        self.sign = sign

    def point(self, u, v, t):
        """The world point at wall-plane (u, v), proud t from the plane."""
        if self.axis == 'z':
            return (u, v, self.plane + self.sign * t)
        return (self.plane + self.sign * t, v, u)

    def uv(self, p):
        return (p[0], p[1]) if self.axis == 'z' else (p[2], p[1])

    def inward(self):
        """The proud direction as a 3D unit (the front faces' normal)."""
        n = [0.0, 0.0, 0.0]
        n[2 if self.axis == 'z' else 0] = self.sign
        return tuple(n)

    def tangent_u(self):
        return (1.0, 0.0, 0.0) if self.axis == 'z' else (0.0, 0.0, 1.0)

    def tangent_v(self):
        return (0.0, 1.0, 0.0)

    def u_bounds(self, kit):
        """The wall plane's own u extent (the room's span along the plane)."""
        return (kit['X_W'], kit['X_E']) if self.axis == 'z' else (kit['Z_N'], kit['Z_S'])


def _walls(kit):
    """The three verified wall planes (L3; C3 retires the design's west lack — the
    west end wall is closed and gets nothing)."""
    return (_Wall('north', 'z', kit['Z_N'], +1.0),
            _Wall('south', 'z', kit['Z_S'], -1.0),
            _Wall('east', 'x', kit['X_E'], -1.0))


# --- the host faces (L6's adoption source) -------------------------------------------


class _Host:
    __slots__ = ('poly', 'u0', 'v0', 'du', 'dv', 'cell', 'cu', 'cv')

    def __init__(self, poly, u0, v0, du, dv, cell):
        self.poly = poly
        self.u0, self.v0, self.du, self.dv = u0, v0, du, dv
        self.cell = cell
        self.cu = u0 + du / 2.0
        self.cv = v0 + dv / 2.0


def _plane_hosts(shell, wall):
    """The shell faces lying ON the wall plane: the wall field's mosaic plus, on the
    south wall, the portholes' annular wall-plane faces (the ring segments' hosts).
    The host's cell is the face's index in the shell's face list — the shell is
    runners[0], so realize hands it first_cell 0 and cell = face index (the
    committed realize law)."""
    hosts = []
    for pi, (fidx, _mat) in enumerate(shell.faces):
        pts = [shell.verts[i] for i in fidx]
        if wall.axis == 'z':
            if any(abs(p[2] - wall.plane) > 1e-6 for p in pts):
                continue
        elif any(abs(p[0] - wall.plane) > 1e-6 for p in pts):
            continue
        coords = [wall.uv(p) for p in pts]
        us = [c[0] for c in coords]
        vs = [c[1] for c in coords]
        u0, u1 = min(us), max(us)
        v0, v1 = min(vs), max(vs)
        # realize's bbox law: (max − min) or 1.0 keeps zero-extent faces mappable.
        du = (u1 - u0) or 1.0
        dv = (v1 - v0) or 1.0
        hosts.append(_Host(coords, u0, v0, du, dv, pi))
    if not hosts:
        raise RuntimeError(f'jordan_walls: no shell host faces on the {wall.name} wall')
    return hosts


def _point_in_poly(pt, poly):
    """The even-odd crossing test (winding-agnostic). A point exactly on a shared
    edge resolves deterministically to the +u/+v side face — the ray test's own
    geometry — which is all the adoption needs."""
    x, y = pt
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            if x < xi + (y - yi) / (yj - yi) * (xj - xi):
                inside = not inside
        j = i
    return inside


def _find_host(hosts, uv):
    """L6: the shell face containing the wall-plane point; the design's fallback is
    the nearest face centroid."""
    for host in hosts:
        if _point_in_poly(uv, host.poly):
            return host
    return min(hosts, key=lambda h: (h.cu - uv[0]) ** 2 + (h.cv - uv[1]) ** 2)


def _host_lm(kit, host, uv):
    """THE ADOPTION MAP (C6): the vertex's wall-plane position through the host
    face's OWN bbox→cell law (the committed realize formula), clamped into the host
    cell's interior — the LM_PAD_PX inset on every side. Blender-space v: the
    exporter flips V on export, exactly as it flips the shell's own lm rows."""
    res, grid, pad = kit['LM_RES'], kit['LM_GRID'], kit['LM_PAD_PX']
    cell = res / grid
    inner = cell - 2.0 * pad
    fu = min(max((uv[0] - host.u0) / host.du, 0.0), 1.0)
    fv = min(max((uv[1] - host.v0) / host.dv, 0.0), 1.0)
    cx, cy = host.cell % grid, host.cell // grid
    return ((cx * cell + pad + fu * inner) / res, (cy * cell + pad + fv * inner) / res)


# --- the lattice (L6's pre-split lines, derived — never assumed) ----------------------


def _lattice_lines(hosts):
    """The axis-aligned field faces' edge lines (the shell's own wall_grid lattice).
    The portholes' annular faces are hosts but never lattice: their free-form edges
    would breed sliver splits."""
    ulines, vlines = set(), set()
    for host in hosts:
        us = sorted(set(round(c[0], 6) for c in host.poly))
        vs = sorted(set(round(c[1], 6) for c in host.poly))
        if len(host.poly) == 4 and len(us) == 2 and len(vs) == 2:
            ulines.update(us)
            vlines.update(vs)
    return sorted(ulines), sorted(vlines)


def _rect_pieces(rect, ulines, vlines):
    """L6's pre-split: the wall-plane rect cut at the lattice lines it spans, so no
    piece spans two host faces."""
    u0, u1, v0, v1 = rect
    us = [u0] + [l for l in ulines if u0 + 1e-9 < l < u1 - 1e-9] + [u1]
    vs = [v0] + [l for l in vlines if v0 + 1e-9 < l < v1 - 1e-9] + [v1]
    return [(ua, ub, va, vb) for ua, ub in zip(us, us[1:]) for va, vb in zip(vs, vs[1:])]


# --- the dress builder ---------------------------------------------------------------


class _Dress:
    """One wall's element emission. Every face's UV1 is adopted per face (L6/C6);
    the rectilinear faces assert their host fit (the pre-split law's belt)."""

    def __init__(self, kit, b, wall, hosts, ulines, vlines):
        self.kit = kit
        self.b = b
        self.w = wall
        self.hosts = hosts
        self.ulines = ulines
        self.vlines = vlines

    def quad(self, pts, mat, normal, rect=None):
        """One face. add() orients the stored winding TOWARD the ref (the kit's own
        law: the ref is the viewer side), so the ref rides ON the desired-normal side
        — centroid + 0.05·normal — and the stored normal is the desired one whatever
        the input winding (the fragile always-reverse law is gone). The UV1 adopts
        through the host found for the face's own centre; a rectilinear face asserts
        its (u, v) extent fits that ONE host's bbox (no triangle spans two cells —
        L6)."""
        centroid = tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))
        ref = tuple(centroid[i] + 0.05 * normal[i] for i in range(3))
        self.b.add(pts, mat, ref)
        fidx, _slot = self.b.faces[-1]
        world = [self.b.verts[i] for i in fidx]
        uvs = [self.w.uv(p) for p in world]
        centre = tuple(sum(c[i] for c in uvs) / len(uvs) for i in range(2))
        host = _find_host(self.hosts, centre)
        if rect is not None:
            for u, v in uvs:
                if not (host.u0 - 1e-6 <= u <= host.u0 + host.du + 1e-6
                        and host.v0 - 1e-6 <= v <= host.v0 + host.dv + 1e-6):
                    raise RuntimeError(
                        f'jordan_walls: a {self.w.name} dress face at ({u:.3f}, {v:.3f}) '
                        f'leaves its host face {host.cell} (bbox {host.u0:.3f}..'
                        f'{host.u0 + host.du:.3f}, {host.v0:.3f}..'
                        f'{host.v0 + host.dv:.3f}) — the pre-split law')
        self.b.adopted_lm.append([_host_lm(self.kit, host, uv) for uv in uvs])

    def slab(self, rect, t0, t1, mat, sides):
        """The lattice-split proud slab: for every sub-rect, the proud face (normal
        = the wall's inward) plus the flank faces on the named rect edges
        ('u0','u1','v0','v1') — a flank spans t0..t1, so a bead's drop from a proud
        face to a lower one is a slab with t0 = the lower plane. Flanks only emit
        where the piece's edge IS the rect's edge, so the lattice cuts carry no
        buried internal faces."""
        (r0, r1, s0, s1) = rect
        for ua, ub, va, vb in _rect_pieces(rect, self.ulines, self.vlines):
            self.quad([self.w.point(ua, va, t1), self.w.point(ub, va, t1),
                       self.w.point(ub, vb, t1), self.w.point(ua, vb, t1)],
                      mat, self.w.inward(), rect=(ua, ub, va, vb))
            for edge in sides:
                if edge == 'u0' and ua == r0:
                    self.quad([self.w.point(ua, va, t0), self.w.point(ua, vb, t0),
                               self.w.point(ua, vb, t1), self.w.point(ua, va, t1)],
                              mat, self._flank('u0'), rect=(ua, ua, va, vb))
                elif edge == 'u1' and ub == r1:
                    self.quad([self.w.point(ub, va, t0), self.w.point(ub, vb, t0),
                               self.w.point(ub, vb, t1), self.w.point(ub, va, t1)],
                              mat, self._flank('u1'), rect=(ub, ub, va, vb))
                elif edge == 'v0' and va == s0:
                    self.quad([self.w.point(ua, va, t0), self.w.point(ub, va, t0),
                               self.w.point(ub, va, t1), self.w.point(ua, va, t1)],
                              mat, self._flank('v0'), rect=(ua, ub, va, va))
                elif edge == 'v1' and vb == s1:
                    self.quad([self.w.point(ua, vb, t0), self.w.point(ub, vb, t0),
                               self.w.point(ub, vb, t1), self.w.point(ua, vb, t1)],
                              mat, self._flank('v1'), rect=(ua, ub, vb, vb))

    def _flank(self, edge):
        """The flank faces' per-edge desired normals (finding 01): a rect's edge
        faces AWAY from the slab's material — −u at u0, +u at u1, −v at v0, +v at
        v1."""
        u_hat, v_hat = self.w.tangent_u(), self.w.tangent_v()
        if edge == 'u0':
            return tuple(-c for c in u_hat)
        if edge == 'u1':
            return u_hat
        if edge == 'v0':
            return tuple(-c for c in v_hat)
        return v_hat

    def panel(self, cu, y0, y1, w):
        """L2: the dressed panel — the plaster band (four bars: the rails run the
        full width, their end slivers tile the panel's outer edges with the stiles'
        outer flanks; the stiles butt between), the gilt fillet bead along the
        band's inner edge, the gilt scroll-lozenge cartouche and the gilt drop."""
        x0, x1 = cu - w / 2.0, cu + w / 2.0
        self.slab((x0, x1, y0, y0 + PANEL_BAND_W), 0.0, PANEL_BAND_D, 0,
                  ('u0', 'u1', 'v0', 'v1'))
        self.slab((x0, x1, y1 - PANEL_BAND_W, y1), 0.0, PANEL_BAND_D, 0,
                  ('u0', 'u1', 'v0', 'v1'))
        self.slab((x0, x0 + PANEL_BAND_W, y0 + PANEL_BAND_W, y1 - PANEL_BAND_W),
                  0.0, PANEL_BAND_D, 0, ('u0', 'u1'))
        self.slab((x1 - PANEL_BAND_W, x1, y0 + PANEL_BAND_W, y1 - PANEL_BAND_W),
                  0.0, PANEL_BAND_D, 0, ('u0', 'u1'))
        # the fillet: a gilt bead standing on the band's front plane, its top at
        # FILLET_D; the horizontals run the inner width plus the corners and carry
        # their exposed u-end caps where the verticals butt (finding 12), the
        # verticals butt between them.
        fy0, fy1 = y0 + PANEL_BAND_W - FILLET_W, y0 + PANEL_BAND_W
        ty0, ty1 = y1 - PANEL_BAND_W, y1 - PANEL_BAND_W + FILLET_W
        self.slab((x0 + PANEL_BAND_W - FILLET_W, x1 - PANEL_BAND_W + FILLET_W, fy0, fy1),
                  PANEL_BAND_D, FILLET_D, 1, ('u0', 'u1', 'v0', 'v1'))
        self.slab((x0 + PANEL_BAND_W - FILLET_W, x1 - PANEL_BAND_W + FILLET_W, ty0, ty1),
                  PANEL_BAND_D, FILLET_D, 1, ('u0', 'u1', 'v0', 'v1'))
        self.slab((x0 + PANEL_BAND_W - FILLET_W, x0 + PANEL_BAND_W, fy1, ty0),
                  PANEL_BAND_D, FILLET_D, 1, ('u0', 'u1'))
        self.slab((x1 - PANEL_BAND_W, x1 - PANEL_BAND_W + FILLET_W, fy1, ty0),
                  PANEL_BAND_D, FILLET_D, 1, ('u0', 'u1'))
        self.cartouche(cu, y0 + CARTOUCHE_CENTRE_T * (y1 - y0), y0 + DROP_END_T * (y1 - y0))

    def cartouche(self, cu, cv, v_drop_bottom):
        """L2's scroll-lozenge: r(θ) = 1 + 0.18·cos 4θ on the (CARTOUCHE_W,
        CARTOUCHE_H) ellipse, 16 vertices, the front cap (one 16-gon → 14 tris) plus
        16 side quads (46 tris), proud CARTOUCHE_D. NOT pre-split (L6's clamp
        clause): the outline's overhanging vertices clamp into their host cell —
        sub-texel on a uniform gilt."""
        rx, ry = CARTOUCHE_W / 2.0, CARTOUCHE_H / 2.0
        outline = []
        for k in range(CARTOUCHE_SEG):
            a = 2.0 * math.pi * k / CARTOUCHE_SEG
            r = 1.0 + CARTOUCHE_AMP * math.cos(4.0 * a)
            outline.append((cu + rx * r * math.cos(a), cv + ry * r * math.sin(a)))
        cap = [self.w.point(u, v, CARTOUCHE_D) for u, v in outline]
        self.quad(cap, 1, self.w.inward())
        u_hat, v_hat = self.w.tangent_u(), self.w.tangent_v()
        for k in range(CARTOUCHE_SEG):
            (ua, va), (ub, vb) = outline[k], outline[(k + 1) % CARTOUCHE_SEG]
            # the extrusion side's normal: the profile's 2D outward normal (the CCW
            # walk's (dy, −dx)).
            dx, dy = ub - ua, vb - va
            length = math.hypot(dx, dy) or 1.0
            normal = tuple(u_hat[i] * (dy / length) - v_hat[i] * (dx / length)
                           for i in range(3))
            self.quad([self.w.point(ua, va, 0.0), self.w.point(ub, vb, 0.0),
                       self.w.point(ub, vb, CARTOUCHE_D), self.w.point(ua, va, CARTOUCHE_D)],
                      1, normal)
        self.drop(cu, min(v for _u, v in outline), v_drop_bottom)

    def drop(self, cu, v_top, v_bottom):
        """L2's gilt drop bead: from the cartouche's bottom (its outline's lowest
        vertex) down to y0 + 0.18·H; lattice-split like every bar."""
        if v_bottom >= v_top - 1e-9:
            raise RuntimeError('jordan_walls: the drop band is empty or inverted '
                               f'({v_bottom:.3f}..{v_top:.3f})')
        hw = DROP_W / 2.0
        self.slab((cu - hw, cu + hw, v_bottom, v_top), 0.0, DROP_D, 1,
                  ('u0', 'u1', 'v0', 'v1'))

    def ring(self, cu, cv):
        """L4: the gilt lathe ring around one south porthole — the shell's angular
        origin, the four-face profile (inner lip, inner rise, crown, outer fall),
        16 segments × 4 faces = 128 tris. The air normal is the profile chain's
        LEFT side (walking P0→P4 in (r, t)): the lip faces inward (−r), the rise
        up-in, the crown proud, the fall up-out. NOT pre-split: each segment sits
        inside one annular host face's bbox (verified by the clamp below)."""
        u_hat, v_hat, inward = self.w.tangent_u(), self.w.tangent_v(), self.w.inward()
        for k in range(RING_SEG):
            a0 = 2.0 * math.pi * k / RING_SEG
            a1 = 2.0 * math.pi * (k + 1) / RING_SEG
            am = (a0 + a1) / 2.0
            for ia in range(len(RING_PROFILE) - 1):
                (ra, ta), (rb, tb) = RING_PROFILE[ia], RING_PROFILE[ia + 1]
                dr, dt = rb - ra, tb - ta
                length = math.hypot(dr, dt) or 1.0
                nr, nt = -dt / length, dr / length
                radial = tuple(u_hat[i] * math.cos(am) + v_hat[i] * math.sin(am)
                               for i in range(3))
                normal = tuple(radial[i] * nr + inward[i] * nt for i in range(3))
                pts = []
                for r, t, a in ((ra, ta, a0), (ra, ta, a1), (rb, tb, a1), (rb, tb, a0)):
                    pts.append(self.w.point(cu + r * math.cos(a), cv + r * math.sin(a), t))
                self.quad(pts, 1, normal)


# --- L5: the obstruction AABBs, the bay roster, the fail-loud asserts -----------------


def _aabb(b):
    """The builder's glTF-space AABB as (x0, y0, z0, x1, y1, z1)."""
    xs = [p[0] for p in b.verts]
    ys = [p[1] for p in b.verts]
    zs = [p[2] for p in b.verts]
    return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))


def _obstructions(kit):
    """L5's obstruction set: the pilaster, pilaster base, window frame and sconce
    template geometries through their committed placements, plus the portal's
    in-place geometry (the portal mesh carries the niches too). Each entry is
    (kind, label, full box, placed faces); the clearance gathers the faces whose y
    range reaches the element's own y range — so a template's wide part far from
    the element's height (the pilaster capital over a porthole ring's lower half)
    never reads as a collision its geometry cannot make, while a part the element's
    height band genuinely crosses (the capital's lower steps at the upper rings'
    top edge) still does."""
    MeshBuilder = kit['MeshBuilder']

    def template(build):
        probe = MeshBuilder('probe')
        build(probe)
        return [[probe.verts[i] for i in fidx] for fidx, _slot in probe.faces]

    entries = []
    pilaster = template(kit['build_pilaster'])
    base = template(kit['build_pilaster_base'])
    frame = template(kit['build_window_frame'])
    # finding 02: the sconce's obstruction template is the SHIPPED fixture's geometry —
    # the jordan_fixtures archetype (361 tris) under the active 'slice_e' form (its
    # real verts ride the plan the builder stashes on the probe), the kit's committed
    # stub under 'placeholder'.
    if kit['FIXTURE_FORM'] == 'slice_e':
        def sconce_build(probe):
            kit['jordan_fixtures'].build_sconce_archetype(probe)
            plan = getattr(probe, '_jordan_fixtures', None)
            if plan is None or 'mb' not in plan:
                raise RuntimeError('jordan_walls: the sconce archetype left no plan')
            probe.faces = plan['mb'].faces
            probe.verts = plan['mb'].verts

        sconce = template(sconce_build)
    else:
        sconce = template(kit['build_sconce'])
    for x, z, rot in kit['PILASTERS']:
        entries.append(('pilaster', f'{x:.3f},{z:.3f}', rot, (x, kit['PILASTER_Y0'], z), pilaster))
        entries.append(('base', f'{x:.3f},{z:.3f}', rot, (x, kit['Y_FLOOR'], z), base))
    for x, y in kit['WINDOW_FRAMES']:
        entries.append(('window_frame', f'{x:.2f}', math.pi, (x, y, kit['Z_N']), frame))
    for z in kit['SCONCE_WEST_Z']:
        entries.append(('sconce', f'west@{z:.2f}', -math.pi / 2.0,
                        (kit['X_W'], kit['flight_datum'](kit['FLIGHTS'][0], z)
                         + kit['SCONCE_ABOVE'], z), sconce))
    for x in kit['SCONCE_NORTH_X']:
        entries.append(('sconce', f'north@{x:.2f}', math.pi,
                        (x, kit['flight_datum'](kit['FLIGHTS'][1], x)
                         + kit['SCONCE_ABOVE'], kit['Z_N']), sconce))
    for z, y in kit['SCONCE_EAST']:
        entries.append(('sconce', f'east@{z:.2f}', math.pi / 2.0, (kit['X_E'], y, z), sconce))
    portal = MeshBuilder('probe')
    kit['build_portal'](portal)
    entries.append(('portal', 'x92', 0.0, (0.0, 0.0, 0.0),
                    [[portal.verts[i] for i in fidx] for fidx, _slot in portal.faces]))
    out = []
    for kind, label, rot, location, local_faces in entries:
        faces = [_place_face(pts, rot, location) for pts in local_faces]
        verts = [v for pts in faces for v in pts]
        xs = [v[0] for v in verts]
        ys = [v[1] for v in verts]
        zs = [v[2] for v in verts]
        box = (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
        out.append((kind, label, box, faces))
    return out


def _place_face(pts, rot_y, location):
    """A template-local glTF face (the wall plane at local z=0 projecting toward −Z)
    through its placement's axis-aligned Y rotation and translation (jordan.py's
    put() law)."""
    k = int(round(rot_y / (math.pi / 2.0))) % 4
    out = []
    for x, y, z in pts:
        if k == 1:      # +π/2: x' = z, z' = −x
            x, z = z, -x
        elif k == 2:    # π: x' = −x, z' = −z
            x, z = -x, -z
        elif k == 3:    # −π/2: x' = −z, z' = x
            x, z = -z, x
        out.append((x + location[0], y + location[1], z + location[2]))
    return out


def _near_plane(entry, wall):
    """The obstruction comes within PLANE_NEAR_M of the wall plane."""
    box = entry[2]
    if wall.axis == 'z':
        return box[2] <= wall.plane + PLANE_NEAR_M and box[5] >= wall.plane - PLANE_NEAR_M
    return box[0] <= wall.plane + PLANE_NEAR_M and box[3] >= wall.plane - PLANE_NEAR_M


def _gap(a, b):
    """The Euclidean distance between two AABBs (0 when they intersect)."""
    d2 = 0.0
    for i in range(3):
        g = max(a[i] - b[i + 3], b[i] - a[i + 3])
        if g > 0.0:
            d2 += g * g
    return math.sqrt(d2)


def _clearance(box, entry):
    """The element's box vs one obstruction, PER FACE (finding 05): the faces whose
    y range reaches the element's y band ± CLEAR_M each clear individually (their own
    AABB gaps, no union box — a wide part far above never borrows a distant face's
    proximity); the verdict is the MINIMUM of the surviving faces' gaps, or — when no
    face reaches the band — the distance to the full box (some axis separates)."""
    _kind, _label, full, faces = entry
    part = []
    for pts in faces:
        fy0 = min(p[1] for p in pts)
        fy1 = max(p[1] for p in pts)
        if fy0 > box[4] + CLEAR_M or fy1 < box[1] - CLEAR_M:
            continue
        xs = [v[0] for v in pts]
        ys = [v[1] for v in pts]
        zs = [v[2] for v in pts]
        part.append((min(xs), min(ys), min(zs), max(xs), max(ys), max(zs)))
    if not part:
        return _gap(box, full)
    return min(_gap(box, face_box) for face_box in part)


def _element_box(wall, u0, u1, v0, v1, tmax):
    """The element's AABB from its wall-plane rect and its max proud offset."""
    axis0 = wall.plane + (wall.sign * tmax if wall.sign < 0 else 0.0)
    axis1 = wall.plane + (wall.sign * tmax if wall.sign > 0 else 0.0)
    if wall.axis == 'z':
        return (u0, v0, axis0, u1, v1, axis1)
    return (axis0, v0, u0, axis1, v1, u1)


def _bays(kit, wall_name):
    """L3's bay centres. C2: the south portholes share the north WIN_X lattice
    exactly (build_south_wall's `ports = [(cx, cy) for cx in window_bays() ...]`),
    so one window_bays() list serves both walls; the east fields sit between the
    inner and outer pilaster_e shafts."""
    if wall_name in ('north', 'south'):
        return list(kit['window_bays']())
    ez = kit['PILASTER_EAST_Z']
    return [(ez[0] + ez[1]) / 2.0, (ez[2] + ez[3]) / 2.0]


def _clear_width(kit, entries, wall, cu, v0, v1):
    """The bay's clear span on the wall plane (L5's shrink law): the nearest
    ARCHITECTURAL flank faces (the pilaster, base and window frame classes) beside
    the bay centre among the near-plane obstructions whose AABB overlaps the
    panel's v range. The fittings (sconces) and the portal are not bay boundaries —
    they resolve through the omit law and the clearance assert."""
    lo, hi = -math.inf, math.inf
    for kind, _label, box, _verts in entries:
        if kind not in ('pilaster', 'base', 'window_frame'):
            continue
        if not _near_plane((kind, _label, box, _verts), wall):
            continue
        if box[4] <= v0 or box[1] >= v1:
            continue
        u0, u1 = (box[0], box[3]) if wall.axis == 'z' else (box[2], box[5])
        if u1 <= cu:
            lo = max(lo, u1)
        elif u0 >= cu:
            hi = min(hi, u0)
    u_lo, u_hi = wall.u_bounds(kit)
    return (hi if hi != math.inf else u_hi) - (lo if lo != -math.inf else u_lo)


def _roster(kit, entries, report):
    """L3's roster through L5's omit and shrink laws. Returns (panels, rings):
    panels are (wall_name, centre_u, y0, y1, width); rings are the twelve south
    porthole (cu, cv) centres."""
    walls = {w.name: w for w in _walls(kit)}
    tmax = max(PANEL_BAND_D, FILLET_D, CARTOUCHE_D, DROP_D)
    panels = []
    for wall_name, (y0, y1) in (('north', PANEL_Y_NS), ('south', PANEL_Y_NS),
                                ('east', PANEL_Y_E)):
        wall = walls[wall_name]
        for cu in _bays(kit, wall_name):
            # L5's omit law runs on the PLANNED panel rect, before any shrink: a bay
            # holding a sconce inside it omits (the east bays: the sconces at
            # z −82/−66 sit inside the 2.2-wide spans).
            planned = _element_box(wall, cu - PANEL_W / 2.0, cu + PANEL_W / 2.0, y0, y1, tmax)
            blocker = next((f'{kind} {label}' for kind, label, _box, _verts in entries
                            if kind == 'sconce' and _clearance(planned, (kind, label, _box, _verts)) <= 0.0), None)
            if blocker is not None:
                report['panels']['omitted'].append(
                    {'wall': wall_name, 'centre': round(cu, 6), 'reason': blocker})
                continue
            clear = _clear_width(kit, entries, wall, cu, y0, y1)
            width = PANEL_W if clear - PANEL_W >= SHRINK_M \
                else max(clear - SHRINK_M, SHRINK_FLOOR)
            if width < PANEL_W - 1e-9:
                report['panels']['shrunk'].append(
                    {'wall': wall_name, 'centre': round(cu, 6), 'width': round(width, 6)})
            # finding 09's emit-extent law: the cartouche is FIXED-size — a bay too
            # narrow to carry it omits; the clearance runs against the panel's TRUE
            # half-extent (the cartouche's, when it outgrows the band).
            if width < 2.0 * CARTOUCHE_U_EXTENT:
                report['panels']['omitted'].append(
                    {'wall': wall_name, 'centre': round(cu, 6),
                     'reason': f'cartouche {2.0 * CARTOUCHE_U_EXTENT:.3f} > width {width:.3f}'})
                continue
            u_half = max(width / 2.0, CARTOUCHE_U_EXTENT)
            box = _element_box(wall, cu - u_half, cu + u_half, y0, y1, tmax)
            # L5's omission law as the integration rules state it: a surviving panel
            # that still clears some obstruction by < CLEAR_M stops (logged), and the
            # build continues — the rings keep the fail-loud gate below.
            tightest = min(entries, key=lambda entry: _clearance(box, entry))
            if _clearance(box, tightest) < CLEAR_M:
                report['panels']['omitted'].append(
                    {'wall': wall_name, 'centre': round(cu, 6),
                     'reason': f'{tightest[0]} {tightest[1]}'})
                continue
            panels.append((wall_name, cu, y0, y1, width))
    rings = [(cu, cv) for cu in _bays(kit, 'south') for cv in kit['PORT_Y']]
    return panels, rings


def _build(b):
    """The wall_order builder (jordan.py's roster calls it as builder(b)): the
    roster through L5, then the dress emission, then the fail-loud clearance
    asserts over what was actually built."""
    kit, shell, report = _KIT, _SHELL, WALL_ORDER_REPORT
    b.adopted_lm = []
    walls = {w.name: w for w in _walls(kit)}
    entries = _obstructions(kit)
    panels, rings = _roster(kit, entries, report)
    hosts_by_wall = {}
    for wall in walls.values():
        hosts = _plane_hosts(shell, wall)
        hosts_by_wall[wall.name] = (hosts,) + _lattice_lines(hosts)
    for wall_name, cu, y0, y1, width in panels:
        dress = _Dress(kit, b, walls[wall_name], *hosts_by_wall[wall_name])
        dress.panel(cu, y0, y1, width)
    for cu, cv in rings:
        dress = _Dress(kit, b, walls['south'], *hosts_by_wall['south'])
        dress.ring(cu, cv)
    tmax = max(PANEL_BAND_D, FILLET_D, CARTOUCHE_D, DROP_D)
    elements = []
    for wall_name, cu, y0, y1, width in panels:
        wall = walls[wall_name]
        # finding 09: the emit-extent is the cartouche's own half-width when it
        # outgrows the (possibly shrunk) band — the assert sees the true silhouette.
        u_half = max(width / 2.0, CARTOUCHE_U_EXTENT)
        elements.append((f'panel {wall_name}@{cu:.2f}',
                         _element_box(wall, cu - u_half, cu + u_half, y0, y1, tmax)))
    for cu, cv in rings:
        elements.append((f'ring {cu:.2f}@{cv:.2f}',
                         _element_box(walls['south'], cu - RING_R_OUT, cu + RING_R_OUT,
                                      cv - RING_R_OUT, cv + RING_R_OUT, RING_D)))
    for label, box in elements:
        for entry in entries:
            g = _clearance(box, entry)
            if g < CLEAR_M:
                raise RuntimeError(
                    f'jordan_walls: the {label} clears the {entry[0]} ({entry[1]}) by only '
                    f'{g:.3f} m (< {CLEAR_M}) — L5')
    report['panels']['built'] = len(panels)
    report['rings'] = len(rings)
    report['faces'] = len(b.faces)
    report['triangles'] = b.triangles()
    by_wall = {name: sum(1 for p in panels if p[0] == name) for name in walls}
    print(f'jordan-walls: panels {len(panels)} built '
          f'({by_wall["north"]} north, {by_wall["south"]} south, {by_wall["east"]} east), '
          f'{len(report["panels"]["shrunk"])} shrunk, {len(report["panels"]["omitted"])} omitted')
    for row in report['panels']['omitted']:
        print(f'jordan-walls: omit {row["wall"]} panel @ {row["centre"]:.2f} ({row["reason"]})')
    for row in report['panels']['shrunk']:
        print(f'jordan-walls: shrink {row["wall"]} panel @ {row["centre"]:.2f} '
              f'to width {row["width"]:.3f}')
    print(f'jordan-walls: {len(rings)} porthole rings')
    print('jordan-walls: wall_order ' + str(report['faces']) + ' faces, '
          + str(report['triangles']) + ' tris (hosts: '
          + ', '.join(f'{n} {len(hosts_by_wall[n][0])}' for n in sorted(hosts_by_wall)) + ')')


# --- L7: the cornice fascia reassignment (C4's construction-order enumeration) --------


def cornice_fascia(kit, b):
    """The cornice ring's four runs' lower-step fascia faces — the vertical profile
    segment (d1, y0)→(d1, y1) at d1 proud, normal horizontal facing the room —
    reassign to the gilt slot. The faces are enumerated by CONSTRUCTION ORDER
    (kit_mould emits 4 segments × CORNICE_DIV faces per run; the fascia is segment
    1, so run·16 + 4 + division) and cross-checked against the geometric filters
    (|n.y| < 0.5, the room-facing sign, the face centre y inside the lower step's
    band, the face plane at the run's d1 offset); a mismatch fails loud. Topology,
    UV1 and cells untouched — the tri count stays 190."""
    (y0, y1, d1), _ = kit['CORNICE']
    div = kit['CORNICE_DIV']
    per_run = 4 * div
    unit, newell = kit['unit'], kit['newell']
    selected = []
    for run_index, (axis, plane, _u0, _u1, sign, _trim) in enumerate(kit['CORNICE_RUNS']):
        for k in range(div):
            index = run_index * per_run + div + k
            if index >= len(b.faces):
                raise RuntimeError(f'jordan_walls: cornice face {index} does not exist '
                                   f'({len(b.faces)} faces) — the construction order drifted')
            fidx, slot = b.faces[index]
            pts = [b.verts[i] for i in fidx]
            centre = tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))
            n = unit(newell(pts))
            if abs(n[1]) >= 0.5:
                raise RuntimeError(f'jordan_walls: cornice face {index} is not a '
                                   f'horizontal fascia (n.y {n[1]:.3f})')
            if n[2 if axis == 'z' else 0] * sign <= 0.0:
                raise RuntimeError(f'jordan_walls: cornice face {index} does not face '
                                   f'the room (sign {sign:+.0f})')
            if not y0 - 1e-6 < centre[1] < y1 + 1e-6:
                raise RuntimeError(f'jordan_walls: cornice face {index} centre y '
                                   f'{centre[1]:.3f} leaves the lower step band '
                                   f'{y0}..{y1}')
            offset = centre[2] - plane if axis == 'z' else centre[0] - plane
            if abs(offset - sign * d1) > 1e-6:
                raise RuntimeError(f'jordan_walls: cornice face {index} sits at offset '
                                   f'{offset:.3f}, not the d1 {sign * d1:.3f}')
            if slot != 0:
                raise RuntimeError(f'jordan_walls: cornice face {index} already left '
                                   f'the plaster slot')
            selected.append(index)
    if len(selected) != len(kit['CORNICE_RUNS']) * div:
        raise RuntimeError(f'jordan_walls: the fascia enumeration found {len(selected)} '
                           f'faces, expected {len(kit["CORNICE_RUNS"]) * div}')
    for index in selected:
        fidx, _slot = b.faces[index]
        b.faces[index] = (fidx, 1)
    if WALL_ORDER_REPORT is not None:
        WALL_ORDER_REPORT['cornice'] = 'fascia'
        WALL_ORDER_REPORT['corniceFasciaFaces'] = len(selected)
    print(f'jordan-walls: cornice fascia gilded ({len(selected)} faces; tris unchanged)')
    return len(selected)


# --- the hook row + the diverted realize ----------------------------------------------


def _check_constants(kit):
    """The laws' own bounds, asserted once per build (L2's proud ceiling, L4's
    profile bounds, the host cell law the adoption maps through)."""
    if max(PANEL_BAND_D, FILLET_D, CARTOUCHE_D, DROP_D) > PANEL_MAX_PROUD + 1e-9:
        raise RuntimeError('jordan_walls: a panel element exceeds the L2 proud ceiling '
                           f'{PANEL_MAX_PROUD}')
    if RING_PROFILE[0][0] != RING_R_IN or RING_PROFILE[-1][0] != RING_R_OUT \
            or max(t for _r, t in RING_PROFILE) != RING_D:
        raise RuntimeError('jordan_walls: the ring profile leaves the L4 bounds')
    if abs(kit['LM_RES'] / kit['LM_GRID'] / 32.0 - 1.0) > 1e-9 or kit['LM_PAD_PX'] < 2:
        raise RuntimeError('jordan_walls: the host cell law drifted (32 px cells, '
                           'LM_PAD_PX ≥ 2)')


def wall_order_rows(ns, form, shell):
    """jordan.py's ONE hook row (the jordan_fixtures pattern). 'none' returns
    nothing (the committed build, byte-identical — the r15 law); 'slice_2b' returns
    the wall_order row. jordan.py guards the call behind `if not BAKE` (the
    gallery's exported-never-baked law), so the bake chain never sees the row."""
    _reset()
    if form == 'none':
        return []
    if form != 'slice_2b':
        raise RuntimeError(f'jordan_walls: unknown WALL_ARTICULATION {form!r} '
                           "('none' | 'slice_2b')")
    global _KIT, _SHELL, WALL_ORDER_REPORT
    _KIT, _SHELL = ns, shell
    WALL_ORDER_REPORT = {'form': 'slice_2b',
                         'panels': {'built': 0, 'omitted': [], 'shrunk': []},
                         'rings': 0, 'cornice': None}
    _check_constants(ns)
    return [('wall_order', _build, ['plaster_warm', 'gilt'])]


def realize_wall_order(b, material_names):
    """jordan.py's realize dispatcher's slice-2b entry (L6): the dress carries NO
    cells — the mesh is built exactly like the committed realize (UV0's
    metre-repeat law) except the lm layer is the adoption computed at build time
    and LM_CELL_MAP is never touched."""
    kit = _KIT
    bpy = kit['bpy']
    me = bpy.data.meshes.new(b.name)
    me.from_pydata([kit['to_b'](p) for p in b.verts], [], [list(f) for f, _ in b.faces])
    me.update()
    for name in material_names:
        me.materials.append(bpy.data.materials[name])
    uv = me.uv_layers.new(name='uv')
    lm = me.uv_layers.new(name='lm')
    for pi, poly in enumerate(me.polygons):
        f, slot = b.faces[pi]
        poly.material_index = slot
        pts = [b.verts[i] for i in f]
        mapped = b.uvs[pi]
        if mapped is None:
            repeat = kit['MATERIAL_REPEAT_M'].get(material_names[slot], kit['UV_TILE_M'])
            mapped = [(u / repeat, v / repeat) for u, v in kit['surface_projection'](pts)]
        adopted = b.adopted_lm[pi]
        for li, loop in enumerate(poly.loop_indices):
            uv.data[loop].uv = mapped[li]
            lm.data[loop].uv = adopted[li]
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)
    return len({slot for _, slot in b.faces})
