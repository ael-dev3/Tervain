#!/usr/bin/env python3
"""Bake the buildings' surface textures (A67): weathered, gritty, high-resolution albedo and normal maps.

  python tools/textures/bake-buildings.py [--size 1024] [--only stone,plaster] [--preview DIR]

Writes public/textures/buildings/<key>-albedo.jpg and <key>-normal.jpg (rows from v = 0, as the game uploads them
unflipped) and public/textures/buildings/manifest.json (sizes and hashes). Each texture tiles seamlessly and covers the
same metres as before (TILE_M in src/presentation/buildingTextures.ts), with the same layout: long grain along u for
planks and timber, courses down v for roofs and thatch, furrows along v for bark. Colours are authored in sRGB, as the
game's procedural textures always were. --preview also writes a 2 x 2 tiled view of each, to check the seams by eye.
Requires numpy and Pillow; the result is deterministic.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFile

from texkit import blur, cavity, cells_at, fbm_at, grid, mix, noise_at, normal_map, pits_at, rgb, ridged_at, sstep, warp

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/textures/buildings"


def table(seed: int, *shape: int) -> np.ndarray:
    """A fixed random value per item (per board, tile, course...), in [0, 1)."""
    return np.random.default_rng(seed).random(shape)


def shade(col: np.ndarray, k) -> np.ndarray:
    return col * np.asarray(k)[..., None]


def palette(pick: np.ndarray, tones: list[np.ndarray]) -> np.ndarray:
    """One of several tones for each texel, chosen by pick in [0, 1)."""
    col = np.broadcast_to(tones[0], pick.shape + (3,)).copy()
    for i, tone in enumerate(tones[1:], 1):
        col = np.where((pick >= i / len(tones))[..., None], tone, col)
    return col


def stone(n: int):
    """Coursed rubble: split stones of mixed size and earthy grey, mottled, pitted and chipped at the arrises, bedded in
    recessed and dirty lime mortar, with grime in the joints and hollows, rain streaks, lichen and moss."""
    u, v = grid(n)
    px = n / 1024
    wu, wv = warp(u, v, 0.05, 5, 101)
    f1, f2, cid, _, _ = cells_at(wu, wv, 6, 9, 102, 0.9, weights=0.35)
    edge = (f2 - f1) + (fbm_at(u, v, 28, 28, 3, 103) - 0.5) * 0.09
    joint = 0.05 + (fbm_at(u, v, 7, 7, 2, 104) - 0.5) * 0.07
    face = sstep(0.2, 0.8, blur(sstep(joint, joint + 0.01, edge), 3.5 * px))
    # Each stone swells gently towards its middle, with its own lumps, a few spalled flakes and scattered pits.
    dome = sstep(0.0, 1.0, blur(np.clip(edge - joint, 0, 0.3), 10 * px) / 0.3) ** 0.7
    ou, ov = (cid * 13.7) % 1, (cid * 29.3) % 1
    lumps = fbm_at(u + ou, v + ov, 10, 10, 4, 105)
    grain = fbm_at(u, v, 160, 160, 2, 107)
    pits = np.minimum(pits_at(u, v, 64, 0.38, 106, 0.22) * 0.8 + pits_at(u, v, 170, 0.5, 109, 0.2) * 0.5, 1)
    flake = sstep(0.64, 0.7, fbm_at(u + ou, v + ov, 12, 12, 3, 108)) * sstep(0.2, 0.5, dome)
    sand = fbm_at(u, v, 90, 90, 2, 111)
    height = (face * (0.45 + 0.35 * dome + (lumps - 0.5) * 0.35 - flake * 0.06 - pits * 0.05)
              + (grain - 0.5) * 0.035 + (1 - face) * (sand - 0.5) * 0.06)
    # Earthy greys, one tone per stone, mottled within it and stained with iron here and there.
    # Neighbours differ gently: a wall of strongly different stones shows its 2 m repeat as bands across a long front.
    col = palette((cid * 3.7) % 1, [rgb(0.43, 0.42, 0.39), rgb(0.44, 0.41, 0.36), rgb(0.37, 0.37, 0.35), rgb(0.45, 0.43, 0.37), rgb(0.40, 0.40, 0.39)])
    mottle = fbm_at(u + ov, v + ou, 16, 16, 4, 110)
    col = shade(col, (0.86 + 0.18 * ((cid * 5.3) % 1)) * (0.86 + 0.28 * lumps) * (0.86 + 0.28 * mottle) * (0.9 + 0.2 * grain))
    rust = sstep(0.6, 0.82, fbm_at(u + ou, v, 9, 9, 4, 118)) * ((cid * 11.9) % 1 > 0.6)
    col = mix(col, col * rgb(1.12, 0.96, 0.78), rust * 0.6)
    col = shade(col, (1 - pits * 0.22 - flake * 0.08) * (0.82 + 0.18 * dome))
    mortar = mix(rgb(0.27, 0.26, 0.23), rgb(0.44, 0.41, 0.36), sstep(0.4, 0.75, fbm_at(u, v, 20, 20, 4, 113)))
    col = mix(shade(mortar, 0.86 + 0.28 * sand), col, face)
    # Grime: dirt gathers in the joints and hollows; rain streaks; broad weathering; lichen on faces, moss in joints.
    col = shade(col, 1 - np.clip(cavity(height, 5 * px) * 2.4, 0, 0.25))
    col = shade(col, 1 - sstep(0.56, 0.84, fbm_at(u, v, 26, 3, 4, 114)) * 0.14)
    col = shade(col, 1 - sstep(0.58, 0.85, fbm_at(u, v, 3, 3, 4, 117)) * 0.16)
    lichen = sstep(0.68, 0.8, fbm_at(u, v, 9, 9, 5, 115)) * face * sstep(0.45, 0.65, fbm_at(u, v, 60, 60, 2, 119))
    col = mix(col, rgb(0.50, 0.50, 0.40), lichen * 0.45)
    moss = sstep(0.6, 0.76, fbm_at(u, v, 10, 10, 4, 116)) * (1 - face)
    col = mix(col, rgb(0.20, 0.23, 0.12), moss * 0.65)
    return col, height, 2.6


def boards(v: np.ndarray, widths: list[float]):
    """Which board each row lies on, where across it (0 to 1) and how wide that board is."""
    edges = np.concatenate([[0.0], np.cumsum(widths)])
    row = np.clip(np.searchsorted(edges, v, side="right") - 1, 0, len(widths) - 1)
    width = np.asarray(widths)[row]
    return row, (v - edges[row]) / width, width


def planks(n: int):
    """Weathered boards with the long grain along u: six of uneven width, the soft grain eroded between hard ridges,
    silvered where the weather reaches, split and knotted, with dark gaps, butt joints, nail heads weeping rust, and
    dirt and mould where water lingers."""
    u, v = grid(n)
    px = n / 1024
    widths = [0.12, 0.19, 0.15, 0.22, 0.14, 0.18]
    row, loc, width = boards(v, widths)
    rid = table(301, len(widths))[row]
    us = (u + rid * 7.31) % 1
    wv = v + (fbm_at(us, v, 3, 6, 3, 302) - 0.5) * 0.035
    late = 1 - sstep(0.0, 0.16, ridged_at(us, wv, 2, 70, 3, 303))
    fibre = fbm_at(us, wv, 5, 220, 2, 304)
    figure = fbm_at(us, wv, 2, 12, 3, 305)
    edge = np.minimum(loc, 1 - loc) * width
    gap = 1 - sstep(0.0015, 0.0045, edge)
    bevel = sstep(0.0, 0.02, edge)
    du = np.abs(((u - rid * 3.7) % 1 + 0.5) % 1 - 0.5)
    joint = (1 - sstep(0.0008, 0.0028, du)) * np.isin(row, [1, 4])
    split = (1 - sstep(0.0, 0.03, np.abs(fbm_at(us, v, 2, 30, 2, 306) - 0.5))) * sstep(0.6, 0.72, fbm_at(u, v, 3, 5, 2, 307))
    kf1, _, kid, _, _ = cells_at(us, v, 3, 14, 308, 0.7)
    knot = sstep(0.16, 0.06, kf1) * (kid < 0.28)
    ring = sstep(0.2, 0.12, kf1) * (1 - knot) * (kid < 0.28)
    height = (0.55 + bevel * 0.08 + late * 0.05 + (fibre - 0.5) * 0.04 - gap * 0.35 - joint * 0.25 - split * 0.12
              + knot * 0.04 - ring * 0.02)
    # Brown oak, darker in the late grain, silvering in broad weathered patches.
    tone = np.clip(figure * 0.65 + fibre * 0.25 + (rid - 0.5) * 0.3, 0, 1)
    col = mix(rgb(0.15, 0.12, 0.09), rgb(0.35, 0.29, 0.21), sstep(0.0, 0.55, tone))
    col = mix(col, rgb(0.44, 0.38, 0.29), sstep(0.55, 1.0, tone))
    col = shade(col, (1 - late * 0.28) * (0.9 + 0.2 * fibre))
    age = np.clip(rid * 0.55 + fbm_at(u, v, 3, 3, 4, 309) * 0.75 - 0.25, 0, 1)
    col = mix(col, shade(rgb(0.43, 0.41, 0.37), 0.8 + 0.35 * fibre - late * 0.2), sstep(0.3, 0.8, age) * 0.55)
    col = mix(col, rgb(0.11, 0.085, 0.06), knot * 0.75)
    col = shade(col, 1 - ring * 0.25)
    # Dirt and damp: stains, darker towards the joints where water runs, mould spots, grime in every hollow.
    col = shade(col, 1 - sstep(0.52, 0.8, fbm_at(u, v, 5, 4, 4, 310)) * 0.32)
    col = shade(col, 0.72 + 0.28 * bevel)
    mould = sstep(0.66, 0.8, fbm_at(u, v, 14, 10, 4, 311)) * (1 - bevel * 0.6)
    col = mix(col, rgb(0.10, 0.11, 0.08), mould * 0.55)
    col = shade(col, 1 - np.clip(cavity(height, 3 * px) * 3.5, 0, 0.35))
    col = mix(col, rgb(0.05, 0.045, 0.035), np.clip(gap + joint * 0.8 + split * 0.6, 0, 1))
    # Nail heads in pairs across each board, at two battens, each with a rust stain around it.
    nail = np.zeros_like(u)
    rust = np.zeros_like(u)
    edges = np.concatenate([[0.0], np.cumsum(widths)])
    jit = table(312, len(widths), 4)
    for r, w in enumerate(widths):
        for k, (nu, across) in enumerate([(0.16, 0.3), (0.16, 0.7), (0.73, 0.3), (0.73, 0.7)]):
            cu, cv = nu + (jit[r, k] - 0.5) * 0.02, edges[r] + w * (across + (jit[r, k] - 0.5) * 0.12)
            d = np.hypot((u - cu + 0.5) % 1 - 0.5, (v - cv + 0.5) % 1 - 0.5)
            nail = np.maximum(nail, sstep(0.0052, 0.0036, d))
            rust = np.maximum(rust, sstep(0.016 + jit[r, k] * 0.012, 0.004, d))
    col = mix(col, rgb(0.30, 0.17, 0.08), rust * 0.45)
    col = mix(col, rgb(0.09, 0.08, 0.07), nail)
    height = height + nail * 0.06
    return col, height, 2.2


def timber(n: int):
    """Hewn beams, grain along u: adze scallops across the grain, long drying checks, knots, darkened by age and smoke."""
    u, v = grid(n)
    px = n / 1024
    wv = v + (fbm_at(u, v, 3, 5, 3, 321) - 0.5) * 0.05
    late = 1 - sstep(0.0, 0.14, ridged_at(u, wv, 2, 48, 3, 322))
    fibre = fbm_at(u, wv, 4, 200, 2, 323)
    figure = fbm_at(u, wv, 2, 9, 3, 324)
    af1, _, aid, _, _ = cells_at(u, v + fbm_at(u, v, 5, 5, 2, 325) * 0.05, 26, 3, 326, 0.6)
    adze = sstep(0.0, 0.55, af1) * 0.6 + (aid - 0.5) * 0.25
    # Drying checks: a few long, nearly straight splits along the grain, widest in the middle and closing at the ends.
    check = np.zeros_like(u)
    for k, (v0, u0, length, width) in enumerate(table(327, 7, 4)):
        along = ((u - u0) % 1) / (0.25 + length * 0.5)
        live = (along < 1) * np.sin(np.pi * np.clip(along, 0, 1)) ** 0.5
        line = v0 + (noise_at(u, np.zeros_like(u), 6, 1, 3270 + k) - 0.5) * 0.02
        dv = np.abs((v - line + 0.5) % 1 - 0.5)
        check = np.maximum(check, sstep((0.0015 + width * 0.0025) * live + 1e-6, 0.0, dv) * live)
    kf1, _, kid, _, _ = cells_at(u, v, 3, 9, 329, 0.7)
    knot = sstep(0.1, 0.04, kf1) * (kid < 0.3)
    ring = sstep(0.16, 0.1, kf1) * (1 - knot) * (kid < 0.3)
    height = 0.55 - adze * 0.07 + late * 0.04 + (fibre - 0.5) * 0.035 - check * 0.22 + knot * 0.03 - ring * 0.015
    tone = np.clip(figure * 0.7 + fibre * 0.3, 0, 1)
    col = mix(rgb(0.10, 0.085, 0.065), rgb(0.29, 0.24, 0.18), sstep(0.1, 0.7, tone))
    col = mix(col, rgb(0.37, 0.33, 0.27), sstep(0.65, 1.0, tone) * 0.6)
    col = shade(col, (1 - late * 0.25) * (0.88 + 0.24 * fibre) * (0.92 + 0.16 * (1 - adze)))
    # Weathered grey on the exposed faces; soot and dirt in broad patches; knots and checks dark.
    col = mix(col, shade(rgb(0.38, 0.36, 0.33), 0.8 + 0.3 * fibre), sstep(0.55, 0.85, fbm_at(u, v, 3, 3, 4, 330)) * 0.45)
    col = shade(col, 1 - sstep(0.5, 0.82, fbm_at(u, v, 4, 3, 4, 331)) * 0.35)
    col = mix(col, rgb(0.08, 0.06, 0.045), knot * 0.7)
    col = shade(col, 1 - ring * 0.2)
    col = shade(col, 1 - np.clip(cavity(height, 3 * px) * 3.0, 0, 0.3))
    col = mix(col, rgb(0.04, 0.035, 0.03), check * 0.9)
    return col, height, 2.4


def plaster(n: int):
    """Cared-for lime render (A75): a trowelled limewash skin, warm off-white, with soft unevenness, the odd hairline
    crack and a faint brush grain. Lived-in, not neglected: no peeling, mould or rain streaks (the game darkens the foot
    of outer walls with its own damp and splashed mud). Owner direction, 9 October 2026: "gritty like Gothic 3" is the
    art style, not filthy homes."""
    u, v = grid(n)
    px = n / 1024
    low = fbm_at(u, v, 3, 3, 4, 341)
    mid = fbm_at(u, v, 9, 9, 3, 342)
    fine = fbm_at(u, v, 110, 110, 2, 343)
    trowel = fbm_at(u, v, 14, 10, 3, 344)
    brush = fbm_at(u, v, 70, 6, 2, 355)
    wu, wv = warp(u, v, 0.03, 6, 346)
    f1, f2, _, _, _ = cells_at(wu, wv, 5, 6, 347, 0.95)
    # Only a few hairlines, where the render has settled most.
    hair = (1 - sstep(0.0, 0.006, f2 - f1)) * sstep(0.72, 0.86, low) * sstep(0.5, 0.7, mid)
    height = (0.62 + (trowel - 0.5) * 0.07 + (low - 0.5) * 0.04 + (fine - 0.5) * 0.02 + (brush - 0.5) * 0.012
              - hair * 0.025)
    col = mix(rgb(0.60, 0.565, 0.49), rgb(0.70, 0.665, 0.585), np.clip(low * 0.6 + fine * 0.15 + (trowel - 0.5) * 0.9, 0, 1))
    col = shade(col, 0.93 + 0.1 * fine + (brush - 0.5) * 0.06 + (trowel - 0.5) * 0.12)
    # A faint warmth where hands and years have touched it, never a stain.
    col = mix(col, rgb(0.55, 0.50, 0.42), sstep(0.62, 0.85, mid) * 0.18)
    col = shade(col, 1 - hair * 0.22)
    col = shade(col, 1 - np.clip(cavity(height, 4 * px) * 1.5, 0, 0.12))
    return col, height, 1.2


def cobble(n: int):
    """Rounded field cobbles set in packed mud: worn tops, dirt down their flanks, grass and moss in the joints."""
    u, v = grid(n)
    px = n / 1024
    wu, wv = warp(u, v, 0.025, 8, 361)
    f1, f2, cid, _, _ = cells_at(wu, wv, 12, 12, 362, 0.8, weights=0.2)
    edge = (f2 - f1) + (fbm_at(u, v, 40, 40, 2, 363) - 0.5) * 0.06
    joint = 0.09 + (noise_at(u, v, 16, 16, 364) - 0.5) * 0.06
    face = sstep(joint, joint + 0.05, edge)
    dome = sstep(0.0, 0.5, np.clip(edge - joint, 0, None)) ** 0.5
    lumps = fbm_at(u, v, 36, 36, 3, 365)
    sand = fbm_at(u, v, 120, 120, 2, 366)
    height = face * (0.35 + 0.45 * dome + (lumps - 0.5) * 0.08) + (1 - face) * (0.12 + sand * 0.08) + (sand - 0.5) * 0.02
    col = palette((cid * 3.7) % 1, [rgb(0.40, 0.39, 0.36), rgb(0.42, 0.38, 0.32), rgb(0.31, 0.31, 0.30), rgb(0.45, 0.42, 0.36)])
    col = shade(col, (0.78 + 0.3 * ((cid * 5.3) % 1)) * (0.62 + 0.45 * dome) * (0.9 + 0.2 * lumps) * (0.92 + 0.16 * sand))
    mud = mix(rgb(0.15, 0.12, 0.085), rgb(0.27, 0.23, 0.17), sstep(0.3, 0.7, fbm_at(u, v, 20, 20, 3, 367)))
    col = mix(shade(mud, 0.85 + 0.3 * sand), col, face)
    grass = sstep(0.6, 0.75, fbm_at(u, v, 9, 9, 4, 368)) * (1 - face) * sstep(0.4, 0.6, sand)
    col = mix(col, rgb(0.20, 0.24, 0.11), grass * 0.7)
    col = shade(col, 1 - sstep(0.55, 0.85, fbm_at(u, v, 3, 3, 4, 369)) * 0.3)
    col = shade(col, 1 - np.clip(cavity(height, 4 * px) * 2.0, 0, 0.3))
    return col, height, 2.6


def courses(u, v, rows: int, cols: int, seed: int):
    """Shingled courses down v: the course, where down it (0 under the lap of the course above, 1 at the exposed lower
    edge), the piece across, where across it, and the piece's id."""
    cf = v * rows
    row = np.floor(cf).astype(np.int64)
    tv = cf - row
    af = u * cols + (row % 2) * 0.5
    col = np.floor(af).astype(np.int64)
    tu = af - col
    return row % rows, tv, col % cols, tu, table(seed, rows, cols)[row % rows, col % cols]


def tile(n: int):
    """Weathered clay roof tiles, four courses of five: each a shallow barrel, set a little unevenly and chipped at its
    lower edge, burnt to uneven browns and dull reds, sooted and streaked, with lichen crusts, moss in the shaded laps
    and a few blackened replacements."""
    u, v = grid(n)
    px = n / 1024
    _, tv0, _, tu, tid = courses(u, v, 4, 5, 371)
    tv = np.clip(tv0 + (tid - 0.5) * 0.06, 0, 1)
    under = tv > 0.91 + 0.09 * fbm_at(u, v, 18, 4, 2, 372) * (0.4 + tid)
    seam = 1 - sstep(0.0, 0.045, np.minimum(tu, 1 - tu))
    barrel = np.sin(np.pi * np.clip(tu, 0, 1)) ** 0.6
    grain = fbm_at(u, v, 90, 90, 2, 373)
    height = np.where(under, 0.2 + tv * 0.1, 0.38 + tv * 0.45 + barrel * 0.12 - seam * 0.1 + (grain - 0.5) * 0.03)
    col = palette((tid * 7.3) % 1, [rgb(0.36, 0.20, 0.13), rgb(0.42, 0.25, 0.16), rgb(0.33, 0.21, 0.15), rgb(0.40, 0.22, 0.14), rgb(0.30, 0.19, 0.14)])
    col = np.where((tid > 0.88)[..., None], col * rgb(0.62, 0.6, 0.6), col)
    col = shade(col, (0.8 + 0.3 * fbm_at(u, v, 7, 7, 3, 374)) * (0.9 + 0.2 * grain) * (0.82 + 0.18 * barrel))
    streak = sstep(0.45, 0.8, fbm_at(u, v, 30, 3, 3, 375))
    soot = sstep(0.45, 0.8, fbm_at(u, v, 4, 4, 4, 376))
    col = mix(col, rgb(0.12, 0.10, 0.09), np.clip(soot * 0.45 + streak * 0.25, 0, 0.7))
    lichen = np.clip(sstep(0.55, 0.7, fbm_at(u, v, 9, 9, 4, 377)) * pits_at(u, v, 34, 0.85, 378, 0.55), 0, 1)
    col = mix(col, rgb(0.47, 0.46, 0.38), lichen * 0.6)
    lap = 1 - sstep(0.0, 0.32, tv)
    moss = sstep(0.48, 0.68, fbm_at(u, v, 10, 10, 4, 379)) * np.clip(lap + seam, 0, 1)
    col = mix(col, rgb(0.17, 0.20, 0.09), moss * 0.65)
    col = shade(col, (1 - lap * 0.45) * (1 - seam * 0.35))
    col = np.where(under[..., None], rgb(0.06, 0.05, 0.04), col)
    col = shade(col, 1 - np.clip(cavity(height, 3 * px) * 2.0, 0, 0.25))
    return col, height, 2.2


def thatch(n: int):
    """Old straw thatch in four courses down v: a mass of strands along v, the courses only just showing as uneven
    steps, grey-brown where the weather has bleached it, dark and rotting in the laps, with clumps of moss."""
    u, v = grid(n)
    px = n / 1024
    vv = v + (fbm_at(u, v, 3, 2, 3, 380) - 0.5) * 0.08
    _, tv, _, _, _ = courses(u, vv % 1, 4, 1, 381)
    wu = u + (fbm_at(u, v, 7, 3, 3, 382) - 0.5) * 0.03
    s1 = ridged_at(wu, v, 150, 5, 2, 383)
    s2 = ridged_at(wu + 0.37, v, 70, 3, 2, 384)
    s3 = ridged_at(wu + 0.71, v, 300, 8, 1, 390)
    strand = 1 - sstep(0.0, 0.45, np.minimum(np.minimum(s1, s2 * 1.3), s3 * 1.6))
    tip = sstep(0.0, 0.06, tv - (0.82 + 0.16 * noise_at(u, v, 160, 4, 385)))
    clump = fbm_at(u, v, 12, 4, 3, 386)
    height = 0.35 + tv * 0.3 + strand * 0.12 + (clump - 0.5) * 0.14 - tip * 0.18
    col = mix(rgb(0.22, 0.18, 0.12), rgb(0.43, 0.36, 0.25), np.clip(strand * 0.5 + clump * 0.5 + tv * 0.15 - 0.08, 0, 1))
    col = mix(col, shade(rgb(0.38, 0.36, 0.31), 0.85 + 0.25 * strand), sstep(0.45, 0.8, fbm_at(u, v, 4, 4, 4, 387)) * 0.55)
    lap = 1 - sstep(0.0, 0.3, tv)
    rot = sstep(0.45, 0.75, fbm_at(u, v, 8, 6, 4, 388))
    col = mix(col, rgb(0.13, 0.11, 0.08), np.clip(lap * 0.45 + rot * 0.35 + tip * 0.35, 0, 1))
    moss = sstep(0.62, 0.76, fbm_at(u, v, 9, 7, 4, 389)) * (0.5 + 0.5 * lap)
    col = mix(col, rgb(0.19, 0.22, 0.10), moss * 0.65)
    col = shade(col, 1 - np.clip(cavity(height, 2.5 * px) * 3.0, 0, 0.35))
    return col, height, 2.0


def slate(n: int):
    """Split slates, four courses of five set unevenly: dark grey with green and blue casts, ragged at the lower edge,
    layered and gritty, with pale lichen crusts, soot, and moss where the courses lap."""
    u, v = grid(n)
    px = n / 1024
    shift = table(390, 4)[np.floor(v * 4).astype(np.int64) % 4] * 0.6
    _, tv0, _, tu, sid = courses((u + shift / 5) % 1, v, 4, 5, 391)
    tv = np.clip(tv0 + (sid - 0.5) * 0.05, 0, 1)
    under = tv > 0.9 + 0.1 * fbm_at(u, v, 22, 4, 2, 392) * (0.5 + sid)
    seam = 1 - sstep(0.0, 0.03, np.minimum(tu, 1 - tu))
    layer = sstep(0.45, 0.55, fbm_at(u + sid, v, 6, 10, 3, 393))
    grit = fbm_at(u, v, 140, 140, 2, 394)
    height = np.where(under, 0.25 + tv * 0.1, 0.4 + tv * 0.35 - seam * 0.12 + layer * 0.03 + (grit - 0.5) * 0.025)
    col = palette((sid * 5.9) % 1, [rgb(0.20, 0.21, 0.21), rgb(0.245, 0.25, 0.24), rgb(0.22, 0.22, 0.225), rgb(0.28, 0.285, 0.27), rgb(0.18, 0.185, 0.19)])
    col = shade(col, (0.85 + 0.3 * fbm_at(u, v, 7, 7, 3, 395)) * (0.92 + 0.16 * grit) * (1 - layer * 0.08))
    lichen = np.clip(sstep(0.55, 0.7, fbm_at(u, v, 9, 9, 4, 396)) * pits_at(u, v, 30, 0.85, 397, 0.5), 0, 1)
    col = mix(col, rgb(0.46, 0.46, 0.42), lichen * 0.55)
    col = mix(col, rgb(0.09, 0.09, 0.09), sstep(0.5, 0.85, fbm_at(u, v, 4, 4, 4, 398)) * 0.35)
    lap = 1 - sstep(0.0, 0.28, tv)
    moss = sstep(0.52, 0.7, fbm_at(u, v, 10, 10, 4, 399)) * np.clip(lap + seam, 0, 1)
    col = mix(col, rgb(0.17, 0.20, 0.09), moss * 0.55)
    col = shade(col, (1 - lap * 0.4) * (1 - seam * 0.4))
    col = np.where(under[..., None], rgb(0.045, 0.045, 0.045), col)
    col = shade(col, 1 - np.clip(cavity(height, 3 * px) * 2.0, 0, 0.25))
    return col, height, 2.0


def cloth(n: int):
    """Coarse sacking in plain weave, 160 threads each way: uneven slubbed threads, dirt and grease stains, worn patches."""
    u, v = grid(n)
    threads = 160
    tu, tv = u * threads, v * threads
    iu, iv = np.floor(tu).astype(np.int64), np.floor(tv).astype(np.int64)
    fu, fv = tu - iu, tv - iv
    slub_u = table(401, threads)[iu % threads]
    slub_v = table(402, threads)[iv % threads]
    thick_w = 0.7 + 0.3 * noise_at(u, v, threads, 12, 403)
    thick_f = 0.7 + 0.3 * noise_at(u, v, 12, threads, 404)
    warp_up = ((iu + iv) % 2) == 0
    round_w = np.sin(np.pi * fu) ** (0.6 / thick_w)
    round_f = np.sin(np.pi * fv) ** (0.6 / thick_f)
    height = np.where(warp_up, 0.5 + 0.4 * round_w * (0.6 + 0.4 * np.sin(np.pi * fv)), 0.5 + 0.4 * round_f * (0.6 + 0.4 * np.sin(np.pi * fu)))
    tone = np.where(warp_up, slub_u, slub_v)
    col = mix(rgb(0.33, 0.28, 0.21), rgb(0.47, 0.41, 0.31), np.clip(fbm_at(u, v, 5, 5, 3, 405) * 0.8 + tone * 0.3, 0, 1))
    col = shade(col, (0.72 + 0.32 * np.where(warp_up, round_w, round_f)) * (0.92 + 0.12 * tone))
    stain = sstep(0.5, 0.8, fbm_at(u, v, 4, 4, 4, 406))
    col = mix(col, rgb(0.16, 0.13, 0.09), stain * 0.45)
    wear = sstep(0.62, 0.8, fbm_at(u, v, 7, 7, 4, 407))
    col = mix(col, rgb(0.52, 0.48, 0.40), wear * 0.25)
    return col, height * (1 - wear * 0.3), 1.1


def bark(n: int):
    """Furrowed bark, fissures along v: long grey-brown ridges that wander, part and rejoin, broken across into plates
    here and there, deep dark furrows between them, some lichen on the ridges and moss down in the furrows."""
    u, v = grid(n)
    px = n / 1024
    wu, wv = warp(u, v, 0.05, 4, 411)
    f1, f2, pid, _, _ = cells_at(wu, wv, 11, 3, 412, 0.9, weights=0.25)
    furrow = ridged_at(wu, v, 7, 1, 3, 413)
    edge = np.minimum((f2 - f1) * 1.4, furrow * 0.9 + 0.08) + (fbm_at(u, v, 40, 12, 3, 419) - 0.5) * 0.08
    plate = sstep(0.1, 0.3, edge)
    ridge = sstep(0.1, 0.8, edge) ** 0.7
    fibre = fbm_at(wu, wv, 70, 5, 3, 414)
    scale = fbm_at(u, v, 24, 10, 3, 415)
    height = 0.18 + plate * (0.35 + 0.38 * ridge) + (fibre - 0.5) * 0.08 + (scale - 0.5) * 0.06 * plate
    col = mix(rgb(0.075, 0.06, 0.05), rgb(0.27, 0.24, 0.20), plate * (0.55 + 0.45 * ridge))
    col = shade(col, (0.82 + 0.32 * fibre) * (0.86 + 0.28 * ((pid * 5.3) % 1)))
    col = mix(col, rgb(0.37, 0.36, 0.32), sstep(0.55, 0.85, fbm_at(u, v, 5, 4, 4, 416)) * plate * ridge * 0.5)
    lichen = sstep(0.64, 0.78, fbm_at(u, v, 10, 6, 4, 417)) * plate
    col = mix(col, rgb(0.40, 0.42, 0.33), lichen * 0.4)
    moss = sstep(0.6, 0.76, fbm_at(u, v, 7, 5, 4, 418)) * (1 - plate * 0.8)
    col = mix(col, rgb(0.13, 0.16, 0.07), moss * 0.45)
    col = shade(col, 1 - np.clip(cavity(height, 4 * px) * 2.0, 0, 0.3))
    return col, height, 3.0


def rock(n: int):
    """Weathered outcrop: big blocks parted by a few open joints, bedded strata and lumpy faces, broad dark weathering
    and rain streaks, pits, lichen crusts on the faces and moss down in the joints."""
    u, v = grid(n)
    px = n / 1024
    wu, wv = warp(u, v, 0.1, 3, 421)
    f1, f2, bid, _, _ = cells_at(wu, wv, 4, 5, 422, 0.9, weights=0.3)
    gape = sstep(0.4, 0.62, fbm_at(u, v, 4, 4, 3, 424))
    edge = (f2 - f1) + (fbm_at(u, v, 36, 36, 3, 425) - 0.5) * 0.05 + (1 - gape) * 0.06
    joint = 1 - sstep(0.0, 0.05, edge)
    lip = np.clip(blur(joint, 7 * px) * 1.5, 0, 1)
    strata = fbm_at(wu, wv, 2, 12, 4, 426)
    bed = 1 - sstep(0.0, 0.05, np.abs(fbm_at(wu, wv, 1, 9, 2, 437) - 0.5))
    lumps = fbm_at(u + bid, v, 7, 7, 5, 427)
    grain = fbm_at(u, v, 130, 130, 2, 428)
    pits = np.minimum(pits_at(u, v, 50, 0.4, 429, 0.2) + pits_at(u, v, 120, 0.5, 430, 0.15) * 0.6, 1)
    height = (0.42 + (lumps - 0.5) * 0.5 + (strata - 0.5) * 0.14 + (grain - 0.5) * 0.04 - joint * 0.22 - lip * 0.08
              - bed * 0.03 - pits * 0.04)
    col = mix(rgb(0.27, 0.26, 0.24), rgb(0.47, 0.45, 0.41), np.clip(strata * 0.5 + lumps * 0.45 + (bid - 0.5) * 0.25, 0, 1))
    col = mix(col, rgb(0.40, 0.35, 0.28), sstep(0.55, 0.9, fbm_at(u, v, 3, 3, 3, 434)) * 0.35)
    col = shade(col, (0.9 + 0.18 * grain) * (0.86 + 0.28 * fbm_at(u, v, 20, 20, 3, 438)) * (1 - pits * 0.22) * (1 - bed * 0.12))
    col = shade(col, 1 - sstep(0.5, 0.85, fbm_at(u, v, 24, 3, 4, 431)) * 0.22)
    col = shade(col, 1 - sstep(0.5, 0.8, fbm_at(u, v, 4, 4, 4, 435)) * 0.25)
    lichen = sstep(0.62, 0.76, fbm_at(u, v, 7, 7, 5, 432)) * sstep(0.35, 0.6, grain) * (1 - lip)
    col = mix(col, rgb(0.47, 0.48, 0.38), lichen * 0.5)
    ochre = sstep(0.7, 0.8, fbm_at(u, v, 11, 11, 4, 436)) * sstep(0.4, 0.6, grain) * (1 - lip)
    col = mix(col, rgb(0.50, 0.42, 0.24), ochre * 0.3)
    moss = sstep(0.45, 0.7, fbm_at(u, v, 9, 9, 4, 433)) * np.clip(lip * 2.0, 0, 1)
    col = mix(col, rgb(0.17, 0.20, 0.09), moss * 0.6)
    col = shade(col, 1 - lip * 0.35)
    col = mix(col, rgb(0.06, 0.055, 0.05), joint * 0.75)
    col = shade(col, 1 - np.clip(cavity(height, 6 * px) * 2.0, 0, 0.3))
    return col, height, 2.6


def bronze(n: int):
    """Old cast bronze: dark tarnish over brown metal, a few worn brighter places, casting pores, verdigris gathered in
    the hollows and running in streaks, and soot."""
    u, v = grid(n)
    px = n / 1024
    cast = fbm_at(u, v, 20, 20, 3, 441)
    hammer = fbm_at(u, v, 9, 9, 3, 442)
    pores = np.minimum(pits_at(u, v, 90, 0.4, 443, 0.3), 1)
    height = 0.5 + (cast - 0.5) * 0.06 + (hammer - 0.5) * 0.08 - pores * 0.06
    col = mix(rgb(0.16, 0.12, 0.08), rgb(0.36, 0.27, 0.16), np.clip(hammer * 0.7 + cast * 0.3, 0, 1))
    col = mix(col, rgb(0.50, 0.39, 0.24), sstep(0.7, 0.86, fbm_at(u, v, 4, 4, 3, 444)) * 0.35)
    deep = np.clip(cavity(height, 6 * px) * 8, 0, 1)
    verdigris = np.clip(sstep(0.55, 0.78, fbm_at(u, v, 10, 10, 4, 445)) * 0.6 + deep * 0.6 + sstep(0.62, 0.85, fbm_at(u, v, 24, 3, 3, 446)) * 0.35, 0, 1)
    col = mix(col, shade(rgb(0.24, 0.32, 0.27), 0.8 + 0.3 * cast), verdigris * 0.7)
    col = mix(col, rgb(0.07, 0.06, 0.05), sstep(0.5, 0.82, fbm_at(u, v, 5, 5, 4, 447)) * 0.5)
    col = shade(col, 1 - pores * 0.4)
    return col, height, 1.4


# Mean brightness (luma of the sRGB albedo) each texture is levelled to: a little under the generated textures they replace,
# so the change is in detail and grime rather than a darker world. Roof tile and bronze sit lower than their old, brighter
# selves on purpose: weathered clay and tarnished metal.
LEVEL = {"plaster": 0.56, "timber": 0.22, "planks": 0.27, "stone": 0.385, "cobble": 0.31, "tile": 0.24, "thatch": 0.26,
         "slate": 0.26, "cloth": 0.30, "bark": 0.16, "rock": 0.37, "bronze": 0.27}


def level(albedo: np.ndarray, target: float) -> np.ndarray:
    luma = float(np.mean(albedo @ np.array([0.2126, 0.7152, 0.0722])))
    return np.clip(albedo * (target / luma), 0, 1)


# Fine-weave cloth and small bronze fittings gain nothing beyond 512 px for the metres they cover.
NATIVE = {"cloth": 512, "bronze": 512}

GENERATORS = {"plaster": plaster, "timber": timber, "planks": planks, "stone": stone, "cobble": cobble, "tile": tile, "thatch": thatch,
              "slate": slate, "cloth": cloth, "bark": bark, "rock": rock, "bronze": bronze}


def jpeg(arr: np.ndarray, quality: int) -> bytes:
    ImageFile.MAXBLOCK = max(ImageFile.MAXBLOCK, arr.shape[0] * arr.shape[1] * 4)  # optimised busy images outgrow the default buffer
    out = io.BytesIO()
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)).save(out, "JPEG", quality=quality, optimize=True, subsampling=0)
    return out.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--only")
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"schema": 1, "textures": {}}
    for key in (args.only.split(",") if args.only else GENERATORS):
        size = min(args.size, NATIVE.get(key, args.size))
        albedo, height, strength = GENERATORS[key](size)
        albedo = level(albedo, LEVEL[key])
        normals = normal_map(height, strength)
        steep = float(np.mean(normals[..., 2] < 238 / 255))
        files = {"albedo": jpeg(albedo, 90), "normal": jpeg(normals, 94)}
        entry = {}
        for kind, data in files.items():
            name = f"{key}-{kind}.jpg"
            (OUT / name).write_bytes(data)
            entry[kind] = {"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        manifest["textures"][key] = {"size": size, **entry}
        print(f"{key}: {size} px, {sum(e['bytes'] for e in entry.values()) // 1024} KiB, {steep:.1%} steep normals")
        if args.preview:
            args.preview.mkdir(parents=True, exist_ok=True)
            tile_img = np.clip(albedo * 255, 0, 255).astype(np.uint8)
            Image.fromarray(np.tile(tile_img, (2, 2, 1))).save(args.preview / f"{key}-tiled.png")
            Image.fromarray(np.clip(normals * 255, 0, 255).astype(np.uint8)).save(args.preview / f"{key}-normal.png")
    manifest["textures"] = dict(sorted(manifest["textures"].items()))
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
