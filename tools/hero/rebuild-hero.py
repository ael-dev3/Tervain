#!/usr/bin/env python3
"""Rebuild the wanderer's animated model on its clean mesh (A69).

  python tools/hero/rebuild-hero.py

The animated hero (A45, public/models/hero/weathered-wanderer-animated-hero.glb) carries the 66-joint Mixamo rig and the
clips the game plays, but its 65,000-triangle reduction is broken: 42 loose pieces and about 62 m of open edges, which
open into cracks across the face, collar and hands as soon as it moves. The approved 49,500-triangle mesh of the same
character (A37, public/models/hero/weathered-wanderer-hero-50k.glb) is one closed piece in the same pose, space and
texture layout. This writes public/models/hero/weathered-wanderer-hero-sealed.glb: the A37 mesh, skinned to the A45
skeleton by transferring the A45 weights from the nearest point of its surface (facing the same way), the same weights on
every copy of a seam vertex, one light smoothing pass, and the four strongest influences; with the A45 skeleton, clips,
material and textures unchanged. Requires numpy; the result is deterministic.
"""
from __future__ import annotations

import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / 'public/models/hero/weathered-wanderer-hero-50k.glb'
RIGGED = ROOT / 'public/models/hero/weathered-wanderer-animated-hero.glb'
OUT = ROOT / 'public/models/hero/weathered-wanderer-hero-sealed.glb'

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
SIZE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
# How far the clean surface may sit from the rigged one, metres; weights from a face turned away count from further.
CELL = 0.02
TURNED_AWAY = 0.03
SMOOTHING = 0.3
INFLUENCES = 4


def read_glb(path: Path):
    data = path.read_bytes()
    json_len, _ = struct.unpack_from('<II', data, 12)
    doc = json.loads(data[20:20 + json_len])
    start = 20 + json_len
    bin_len, _ = struct.unpack_from('<II', data, start)
    return doc, data[start + 8:start + 8 + bin_len]


def accessor(doc, binary, index):
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    dtype = np.dtype(COMP[acc['componentType']])
    n = SIZE[acc['type']]
    if view.get('byteStride') not in (None, dtype.itemsize * n):
        raise ValueError('interleaved accessors are not expected here')
    offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    return np.frombuffer(binary, dtype=dtype, count=acc['count'] * n, offset=offset).reshape(acc['count'], n).copy()


def closest_on_triangles(p, a, b, c):
    """Closest points on many triangles to one point p, with barycentric weights (Ericson's method, vectorised)."""
    ab, ac, ap = b - a, c - a, p - a
    d1, d2 = (ab * ap).sum(1), (ac * ap).sum(1)
    bp = p - b
    d3, d4 = (ab * bp).sum(1), (ac * bp).sum(1)
    cp = p - c
    d5, d6 = (ab * cp).sum(1), (ac * cp).sum(1)
    va, vb, vc = d3 * d6 - d5 * d4, d5 * d2 - d1 * d6, d1 * d4 - d3 * d2
    denom = va + vb + vc
    with np.errstate(divide='ignore', invalid='ignore'):
        v = np.where(denom != 0, vb / denom, 0)
        w = np.where(denom != 0, vc / denom, 0)
    u = 1 - v - w
    bary = np.stack([u, v, w], 1)
    # Points outside a triangle: fall back to its nearest corner or edge by clamping and renormalising.
    bary = np.clip(bary, 0, None)
    bary /= np.maximum(bary.sum(1, keepdims=True), 1e-12)
    for _ in range(2):
        q = bary[:, :1] * a + bary[:, 1:2] * b + bary[:, 2:] * c
        # One projection step onto each edge for points clamped off the face.
        for (i, j, ei, ej) in ((0, 1, a, b), (1, 2, b, c), (0, 2, a, c)):
            e = ej - ei
            t = np.clip(((p - ei) * e).sum(1) / np.maximum((e * e).sum(1), 1e-12), 0, 1)
            on_edge = ei + e * t[:, None]
            better = np.linalg.norm(p - on_edge, axis=1) < np.linalg.norm(p - q, axis=1) - 1e-9
            nb = np.zeros_like(bary)
            nb[:, i], nb[:, j] = 1 - t, t
            bary = np.where(better[:, None], nb, bary)
            q = np.where(better[:, None], on_edge, q)
    return q, bary


def main() -> None:
    clean_doc, clean_bin = read_glb(CLEAN)
    rig_doc, rig_bin = read_glb(RIGGED)
    cp = clean_doc['meshes'][0]['primitives'][0]
    rp = rig_doc['meshes'][0]['primitives'][0]
    pos = accessor(clean_doc, clean_bin, cp['attributes']['POSITION']).astype(np.float64)
    nor = accessor(clean_doc, clean_bin, cp['attributes']['NORMAL']).astype(np.float64)
    uv = accessor(clean_doc, clean_bin, cp['attributes']['TEXCOORD_0']).astype(np.float32)
    tri = accessor(clean_doc, clean_bin, cp['indices']).reshape(-1, 3).astype(np.int64)
    rpos = accessor(rig_doc, rig_bin, rp['attributes']['POSITION']).astype(np.float64)
    rj = accessor(rig_doc, rig_bin, rp['attributes']['JOINTS_0']).astype(np.int64)
    rw = accessor(rig_doc, rig_bin, rp['attributes']['WEIGHTS_0']).astype(np.float64)
    rtri = accessor(rig_doc, rig_bin, rp['indices']).reshape(-1, 3).astype(np.int64)
    joints = len(rig_doc['skins'][0]['joints'])
    dense = np.zeros((len(rpos), joints))
    for k in range(4):
        np.add.at(dense, (np.arange(len(rpos)), rj[:, k]), rw[:, k])

    # Rigged triangles into a uniform grid by their bounds.
    ta, tb, tc = rpos[rtri[:, 0]], rpos[rtri[:, 1]], rpos[rtri[:, 2]]
    tn = np.cross(tb - ta, tc - ta)
    tn /= np.maximum(np.linalg.norm(tn, axis=1, keepdims=True), 1e-12)
    lo = np.floor(np.minimum(np.minimum(ta, tb), tc) / CELL).astype(np.int64)
    hi = np.floor(np.maximum(np.maximum(ta, tb), tc) / CELL).astype(np.int64)
    grid: dict[tuple[int, int, int], list[int]] = {}
    for t in range(len(rtri)):
        for x in range(lo[t, 0], hi[t, 0] + 1):
            for y in range(lo[t, 1], hi[t, 1] + 1):
                for z in range(lo[t, 2], hi[t, 2] + 1):
                    grid.setdefault((x, y, z), []).append(t)

    transferred = np.zeros((len(pos), joints))
    gaps = []
    for v in range(len(pos)):
        cell = np.floor(pos[v] / CELL).astype(np.int64)
        for reach in (1, 2, 4, 8):
            cand = {t for dx in range(-reach, reach + 1) for dy in range(-reach, reach + 1) for dz in range(-reach, reach + 1)
                    for t in grid.get((cell[0] + dx, cell[1] + dy, cell[2] + dz), ())}
            if cand:
                break
        cand = np.fromiter(cand, dtype=np.int64)
        q, bary = closest_on_triangles(pos[v], ta[cand], tb[cand], tc[cand])
        dist = np.linalg.norm(q - pos[v], axis=1)
        # A face turned away (the far side of a thin part, a neighbouring finger) counts from further off.
        score = dist + TURNED_AWAY * (tn[cand] @ nor[v] < 0.2)
        best = int(np.argmin(score))
        gaps.append(dist[best])
        t = cand[best]
        transferred[v] = bary[best] @ dense[rtri[t]]

    # Copies of one position (UV and normal seams) take one set of weights, so a seam can never open.
    key = np.round(pos / 5e-5).astype(np.int64)
    _, weld = np.unique(key, axis=0, return_inverse=True)
    weld = weld.reshape(-1)
    welded = np.zeros((weld.max() + 1, joints))
    np.add.at(welded, weld, transferred)
    counts = np.bincount(weld).astype(np.float64)
    welded /= counts[:, None]
    # One light smoothing pass over the closed surface softens weight steps left by the reduced mesh.
    edges = np.concatenate([weld[tri[:, [0, 1]]], weld[tri[:, [1, 2]]], weld[tri[:, [2, 0]]]])
    edges = np.unique(np.sort(edges, 1), axis=0)
    neighbours = np.zeros_like(welded)
    degree = np.zeros(len(welded))
    np.add.at(neighbours, edges[:, 0], welded[edges[:, 1]])
    np.add.at(neighbours, edges[:, 1], welded[edges[:, 0]])
    np.add.at(degree, edges[:, 0], 1)
    np.add.at(degree, edges[:, 1], 1)
    welded = (1 - SMOOTHING) * welded + SMOOTHING * neighbours / np.maximum(degree, 1)[:, None]
    # The four strongest influences, normalised.
    order = np.argsort(-welded, axis=1)[:, :INFLUENCES]
    top = np.take_along_axis(welded, order, 1)
    top /= top.sum(1, keepdims=True)
    out_joints = order[weld].astype(np.uint16)
    out_weights = top[weld].astype(np.float32)
    out_weights[out_weights < 1e-6] = 0
    out_weights /= out_weights.sum(1, keepdims=True)

    write(rig_doc, rig_bin, rp, pos.astype(np.float32), nor.astype(np.float32), uv, out_joints, out_weights, tri.astype(np.uint32))
    gaps = np.array(gaps)
    print(f'{OUT.name}: {len(pos)} vertices, {len(tri)} triangles; surface offset median {np.median(gaps) * 1000:.1f} mm, '
          f'95th {np.percentile(gaps, 95) * 1000:.1f} mm, max {gaps.max() * 1000:.1f} mm; {OUT.stat().st_size:,} bytes')


def write(doc, binary, prim, pos, nor, uv, joints, weights, tri) -> None:
    """The rigged document with its mesh data replaced; every other view (clips, skin, images) is copied unchanged."""
    attrs = prim['attributes']
    replace = {
        doc['accessors'][attrs['POSITION']]['bufferView']: pos,
        doc['accessors'][attrs['NORMAL']]['bufferView']: nor,
        doc['accessors'][attrs['TEXCOORD_0']]['bufferView']: uv,
        doc['accessors'][attrs['JOINTS_0']]['bufferView']: joints,
        doc['accessors'][attrs['WEIGHTS_0']]['bufferView']: weights,
        doc['accessors'][prim['indices']]['bufferView']: tri.reshape(-1),
    }
    out = bytearray()
    for i, view in enumerate(doc['bufferViews']):
        chunk = replace[i].tobytes() if i in replace else binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        while len(out) % 4:
            out.append(0)
        view['byteOffset'] = len(out)
        view['byteLength'] = len(chunk)
        out += chunk
    while len(out) % 4:
        out.append(0)
    doc['buffers'][0]['byteLength'] = len(out)
    for name, count in (('POSITION', len(pos)), ('NORMAL', len(nor)), ('TEXCOORD_0', len(uv)), ('JOINTS_0', len(joints)), ('WEIGHTS_0', len(weights))):
        doc['accessors'][attrs[name]]['count'] = count
    doc['accessors'][attrs['POSITION']]['min'] = pos.min(0).tolist()
    doc['accessors'][attrs['POSITION']]['max'] = pos.max(0).tolist()
    doc['accessors'][prim['indices']]['count'] = int(tri.size)
    doc['meshes'][0]['name'] = 'Wanderer / sealed 49,500-triangle mesh on the 66-joint rig'
    doc.setdefault('asset', {})['generator'] = 'Tervain tools/hero/rebuild-hero.py'
    text = json.dumps(doc, separators=(',', ':')).encode()
    while len(text) % 4:
        text += b' '
    total = 12 + 8 + len(text) + 8 + len(out)
    OUT.write_bytes(struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(text), 0x4E4F534A) + text
                    + struct.pack('<II', len(out), 0x004E4942) + bytes(out))


if __name__ == '__main__':
    main()
