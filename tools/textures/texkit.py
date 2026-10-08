"""Seamless texture synthesis on numpy arrays: periodic noise, fractal fields, Worley cells, blurs and normal maps.

Every field is n x n, tiles seamlessly (all noise is periodic over the unit square) and is deterministic for its seed.
Row 0 is v = 0, as the game's textures are laid out (they are uploaded without flipping).
"""
from __future__ import annotations

import numpy as np


def grid(n: int) -> tuple[np.ndarray, np.ndarray]:
    """Texel centres: u along a row, v down the rows, both in [0, 1)."""
    c = (np.arange(n, dtype=np.float64) + 0.5) / n
    return np.meshgrid(c, c)


def _lattice(px: int, py: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).random((py, px))


def _quintic(t: np.ndarray) -> np.ndarray:
    return t * t * t * (t * (t * 6 - 15) + 10)


def noise_at(u: np.ndarray, v: np.ndarray, px: int, py: int, seed: int) -> np.ndarray:
    """Periodic value noise in [0, 1] at arbitrary (u, v), with px x py lattice cells over the unit square."""
    lat = _lattice(px, py, seed)
    x, y = u * px, v * py
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = _quintic(x - ix), _quintic(y - iy)
    x0, y0 = ix % px, iy % py
    x1, y1 = (x0 + 1) % px, (y0 + 1) % py
    a, b, c, d = lat[y0, x0], lat[y0, x1], lat[y1, x0], lat[y1, x1]
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def fbm_at(u, v, px: int, py: int, octaves: int, seed: int, gain: float = 0.5) -> np.ndarray:
    total, norm, amp = np.zeros_like(u), 0.0, 1.0
    for o in range(octaves):
        total += noise_at(u, v, px << o, py << o, seed + 977 * o) * amp
        norm += amp
        amp *= gain
    return total / norm


def ridged_at(u, v, px: int, py: int, octaves: int, seed: int) -> np.ndarray:
    """Sharp creases (0 on the crease, 1 away): for cracks, fibres and veins."""
    return np.abs(fbm_at(u, v, px, py, octaves, seed) * 2 - 1)


def warp(u, v, amount: float, px: int, seed: int, octaves: int = 3):
    """Domain-warped coordinates (still periodic: the offsets are periodic noise)."""
    du = (fbm_at(u, v, px, px, octaves, seed) - 0.5) * amount
    dv = (fbm_at(u, v, px, px, octaves, seed + 1) - 0.5) * amount
    return u + du, v + dv


def cells_at(u, v, cx: int, cy: int, seed: int, jitter: float = 0.85, weights: float = 0.0):
    """Periodic Worley cells, cx x cy over the unit square, measured in cell units (anisotropic cells stay round in
    their own units). Returns f1, f2 (nearest and second distances), the cell's id in [0, 1), and the offset (du, dv)
    from the pixel to its cell's point, in cell units. weights > 0 gives each point a random head start of up to that
    many cell units (an additively weighted diagram): cells then differ in size and meet along gentle curves."""
    rng = np.random.default_rng(seed)
    pts = 0.5 + (rng.random((cy, cx, 2)) - 0.5) * jitter
    ids = rng.random((cy, cx))
    head = rng.random((cy, cx)) * weights if weights > 0 else np.zeros((cy, cx))
    reach = 1 + int(np.ceil(weights * 2))
    x, y = u * cx, v * cy
    gx, gy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    f1 = np.full(u.shape, 99.0)
    f2 = np.full(u.shape, 99.0)
    best = np.zeros(u.shape, dtype=np.float64)
    bdx = np.zeros(u.shape)
    bdy = np.zeros(u.shape)
    for oy in range(-reach, reach + 1):
        for ox in range(-reach, reach + 1):
            nx, ny = gx + ox, gy + oy
            wx, wy = nx % cx, ny % cy
            px_ = nx + pts[wy, wx, 0] - x
            py_ = ny + pts[wy, wx, 1] - y
            d = np.sqrt(px_ * px_ + py_ * py_) - head[wy, wx]
            closer = d < f1
            f2 = np.where(closer, f1, np.minimum(f2, d))
            best = np.where(closer, ids[wy, wx], best)
            bdx = np.where(closer, px_, bdx)
            bdy = np.where(closer, py_, bdy)
            f1 = np.where(closer, d, f1)
    return f1, f2, best, bdx, bdy


def pits_at(u, v, count: int, size: float, seed: int, chance: float = 0.5) -> np.ndarray:
    """Scattered round pits (1 in a pit, 0 elsewhere), about count x count sites of which a share are pitted, each up
    to size (in site units) across: for holes in stone, knots and nail holes, seeds and specks."""
    f1, _, pid, _, _ = cells_at(u, v, count, count, seed, 0.9)
    radius = size * (0.35 + 0.65 * ((pid * 7.31) % 1)) * 0.5
    return sstep(radius, radius * 0.45, f1) * (pid < chance)


def blur(field: np.ndarray, sigma: float) -> np.ndarray:
    """Gaussian blur of a periodic field (sigma in texels), by FFT so it wraps exactly."""
    n = field.shape[0]
    k = np.fft.fftfreq(n)
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (k[:, None] ** 2 + k[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(field) * g))


def sstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = np.asarray(t)[..., None] if np.ndim(t) else t
    return np.asarray(a) + (np.asarray(b) - np.asarray(a)) * t


def rgb(*c: float) -> np.ndarray:
    return np.array(c, dtype=np.float64)


def normal_map(height: np.ndarray, strength: float) -> np.ndarray:
    """Tangent-space normals (+y towards v increasing, as the game's maps) from a periodic height field."""
    n = height.shape[0]
    s = strength * n / 256
    dx = (np.roll(height, 1, axis=1) - np.roll(height, -1, axis=1)) * s
    dy = (np.roll(height, 1, axis=0) - np.roll(height, -1, axis=0)) * s
    length = np.sqrt(dx * dx + dy * dy + 1)
    return np.stack([dx / length, dy / length, 1 / length], axis=-1) * 0.5 + 0.5


def cavity(height: np.ndarray, sigma: float) -> np.ndarray:
    """How far each texel sits below its surroundings: deep where dirt gathers and light does not reach."""
    return np.clip(blur(height, sigma) - height, 0, None)
