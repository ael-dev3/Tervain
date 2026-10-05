#!/usr/bin/env python3
"""Independently audit the prepared custom tree foliage without changing art.

Run after the preparation receipts have been frozen. This checks delivered GLB
bytes and embedded PNGs; geometry-only Three.js fixtures deliberately omit
decoded pixels. Native 360-degree composition remains a separate review gate.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import struct
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
              5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4,
          'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Glb:
    def __init__(self, path: Path):
        self.path = path
        self.data = path.read_bytes()
        assert len(self.data) >= 28, f'{path}: incomplete GLB'
        magic, version, length = struct.unpack_from('<III', self.data)
        assert (magic, version, length) == (0x46546c67, 2, len(self.data)), f'{path}: GLB header'
        chunks = []
        at = 12
        while at < len(self.data):
            n, kind = struct.unpack_from('<II', self.data, at)
            assert n % 4 == 0 and at + 8 + n <= len(self.data), f'{path}: GLB chunk bounds'
            chunks.append((kind, self.data[at + 8:at + 8 + n]))
            at += 8 + n
        assert [kind for kind, _ in chunks] == [0x4e4f534a, 0x004e4942], f'{path}: JSON/BIN chunks'
        self.doc = json.loads(chunks[0][1])
        self.binary = chunks[1][1]
        assert self.doc['asset']['version'] == '2.0'
        assert len(self.doc['buffers']) == 1 and 'uri' not in self.doc['buffers'][0]
        assert self.doc['buffers'][0]['byteLength'] <= len(self.binary)
        assert not self.doc.get('animations') and not self.doc.get('skins')
        self.instances = []

        def visit(index: int, parents: set[int]):
            assert index not in parents, f'{path}: cyclic scene'
            node = self.doc['nodes'][index]
            assert node.get('matrix', IDENTITY) == IDENTITY, f'{path}: prepared mesh must be identity-normalized'
            assert node.get('translation', [0, 0, 0]) == [0, 0, 0]
            assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
            assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
            if 'mesh' in node:
                self.instances.append((node.get('name', ''), self.doc['meshes'][node['mesh']]))
            for child in node.get('children', []):
                visit(child, parents | {index})

        for node in self.doc['scenes'][self.doc.get('scene', 0)]['nodes']:
            visit(node, set())

    def view(self, index: int) -> bytes:
        view = self.doc['bufferViews'][index]
        assert view['buffer'] == 0
        start, size = view.get('byteOffset', 0), view['byteLength']
        assert start >= 0 and start + size <= self.doc['buffers'][0]['byteLength']
        return self.binary[start:start + size]

    def accessor_bytes(self, index: int) -> bytes:
        a = self.doc['accessors'][index]
        assert not a.get('sparse'), f'{self.path}: sparse audit unsupported'
        code, component_size = COMPONENTS[a['componentType']]
        del code
        size = component_size * WIDTHS[a['type']]
        view = self.doc['bufferViews'][a['bufferView']]
        data, start = self.view(a['bufferView']), a.get('byteOffset', 0)
        stride = view.get('byteStride', size)
        assert stride >= size
        if a['count']:
            assert start + (a['count'] - 1) * stride + size <= len(data)
        return b''.join(data[start + i * stride:start + i * stride + size] for i in range(a['count']))

    def values(self, index: int) -> list[tuple[Any, ...]]:
        a = self.doc['accessors'][index]
        code, _ = COMPONENTS[a['componentType']]
        width = WIDTHS[a['type']]
        return list(struct.iter_unpack('<' + str(width) + code, self.accessor_bytes(index)))

    def primitive(self, name: str) -> dict[str, Any]:
        meshes = [mesh for part_name, mesh in self.instances if part_name == name]
        assert len(meshes) == 1, f'{self.path}: expected one {name} mesh'
        assert len(meshes[0]['primitives']) == 1, f'{self.path}: expected one {name} primitive'
        return meshes[0]['primitives'][0]

    def geometry_digest(self, primitive: dict[str, Any]) -> str:
        result = hashlib.sha256()
        for semantic, index in sorted(primitive['attributes'].items()):
            a = self.doc['accessors'][index]
            result.update(semantic.encode())
            result.update(json.dumps([a['componentType'], a['type'], a['count'], a.get('normalized', False)]).encode())
            result.update(self.accessor_bytes(index))
        if 'indices' in primitive:
            a = self.doc['accessors'][primitive['indices']]
            result.update(json.dumps(['indices', a['componentType'], a['count']]).encode())
            result.update(self.accessor_bytes(primitive['indices']))
        return result.hexdigest()

    def triangles(self) -> int:
        result = 0
        for _, mesh in self.instances:
            for primitive in mesh['primitives']:
                assert primitive.get('mode', 4) == 4
                count = self.doc['accessors'][primitive.get('indices', primitive['attributes']['POSITION'])]['count']
                assert count % 3 == 0
                result += count // 3
                p = self.values(primitive['attributes']['POSITION'])
                for semantic in ['NORMAL', 'TEXCOORD_0']:
                    assert semantic in primitive['attributes']
                    values = self.values(primitive['attributes'][semantic])
                    assert len(values) == len(p)
                    assert all(math.isfinite(v) for row in values for v in row)
                assert all(math.isfinite(v) for row in p for v in row)
                if 'indices' in primitive:
                    assert all(0 <= row[0] < len(p) for row in self.values(primitive['indices']))
        assert 0 < result < 20_000, f'{self.path}: complete {result} triangles'
        return result

    def rgba(self, image_index: int) -> Image.Image:
        image = self.doc['images'][image_index]
        assert image['mimeType'] == 'image/png' and 'uri' not in image
        decoded = Image.open(io.BytesIO(self.view(image['bufferView'])))
        decoded.load()
        assert decoded.width <= 2048 and decoded.height <= 2048
        return decoded.convert('RGBA')

    def albedo(self, primitive: dict[str, Any]) -> tuple[dict[str, Any], Image.Image]:
        material = self.doc['materials'][primitive['material']]
        binding = material['pbrMetallicRoughness']['baseColorTexture']
        assert binding.get('texCoord', 0) == 0
        assert not binding.get('extensions'), f'{self.path}: unexpected UV transform in audited atlas'
        texture = self.doc['textures'][binding['index']]
        image = self.doc['images'][texture['source']]
        assert image.get('bufferView') is not None and not image.get('uri')
        decoded = Image.open(io.BytesIO(self.view(image['bufferView'])))
        decoded.load()
        return material, decoded.convert('RGBA')


def distance(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def dot(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    return sum(x * y for x, y in zip(a, b))


def minus(a: tuple[float, ...], b: tuple[float, ...]) -> tuple[float, ...]:
    return tuple(x - y for x, y in zip(a, b))


def interpolate(a: tuple[float, ...], b: tuple[float, ...], t: float) -> tuple[float, ...]:
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def triangle_distance(point, a, b, c) -> float:
    """Point-to-triangle distance, including degenerate collapsed wood faces."""
    ab, ac, ap = minus(b, a), minus(c, a), minus(point, a)
    d1, d2 = dot(ab, ap), dot(ac, ap)
    if d1 <= 0 and d2 <= 0:
        return distance(point, a)
    bp = minus(point, b)
    d3, d4 = dot(ab, bp), dot(ac, bp)
    if d3 >= 0 and d4 <= d3:
        return distance(point, b)
    vc = d1 * d4 - d3 * d2
    if vc <= 0 and d1 >= 0 and d3 <= 0 and d1 != d3:
        return distance(point, interpolate(a, b, d1 / (d1 - d3)))
    cp = minus(point, c)
    d5, d6 = dot(ab, cp), dot(ac, cp)
    if d6 >= 0 and d5 <= d6:
        return distance(point, c)
    vb = d5 * d2 - d1 * d6
    if vb <= 0 and d2 >= 0 and d6 <= 0 and d2 != d6:
        return distance(point, interpolate(a, c, d2 / (d2 - d6)))
    va = d3 * d6 - d5 * d4
    if va <= 0 and d4 - d3 >= 0 and d5 - d6 >= 0 and d4 - d3 != d6 - d5:
        return distance(point, interpolate(b, c, (d4 - d3) / ((d4 - d3) + (d5 - d6))))
    denominator = va + vb + vc
    if abs(denominator) < 1e-20:
        return min(distance(point, vertex) for vertex in [a, b, c])
    v, w = vb / denominator, vc / denominator
    closest = tuple(a[i] + ab[i] * v + ac[i] * w for i in range(3))
    return distance(point, closest)


def triangle(positions, indices, face: int):
    assert 0 <= face * 3 + 2 < len(indices)
    return tuple(positions[indices[face * 3 + i]] for i in range(3))


def indices(glb: Glb, primitive: dict[str, Any]) -> list[int]:
    if 'indices' in primitive:
        return [row[0] for row in glb.values(primitive['indices'])]
    return list(range(glb.doc['accessors'][primitive['attributes']['POSITION']]['count']))


def wood_components(positions, index: list[int]) -> tuple[list[int], dict[int, dict]]:
    """Weld spatial duplicates across UV/normal splits, then follow actual faces.

    This proves attachment to rooted wood rather than to a disconnected source
    fragment that merely shares the material name. No art is modified.
    """
    canonical = {}
    welded = []
    for i, p in enumerate(positions):
        key = tuple(round(value * 100_000) for value in p)
        welded.append(canonical.setdefault(key, i))
    parent = list(range(len(positions)))
    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def union(a: int, b: int) -> None:
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a
    for face in range(len(index) // 3):
        a, b, c = [welded[index[face * 3 + i]] for i in range(3)]
        union(a, b); union(a, c)
    components = {}
    face_components = []
    for face in range(len(index) // 3):
        component = find(welded[index[face * 3]])
        face_components.append(component)
        stats = components.setdefault(component, {'faces': 0, 'minimumY': float('inf'), 'maximumY': -float('inf')})
        stats['faces'] += 1
        ys = [positions[index[face * 3 + i]][1] for i in range(3)]
        stats['minimumY'] = min(stats['minimumY'], *ys)
        stats['maximumY'] = max(stats['maximumY'], *ys)
    return face_components, components


def near_surface_distance(point, positions, index: list[int]) -> float:
    best = float('inf')
    for face in range(len(index) // 3):
        a, b, c = triangle(positions, index, face)
        # A cheap axis-aligned lower bound avoids most exact contact queries.
        bound = sum(max(min(a[i], b[i], c[i]) - point[i], 0,
                        point[i] - max(a[i], b[i], c[i])) ** 2 for i in range(3))
        if bound >= best * best:
            continue
        best = min(best, triangle_distance(point, a, b, c))
        if best <= 1e-8:
            break
    return best


def png_alpha_at(image: Image.Image, uv, opacity: float = 1) -> float:
    """Base-level bilinear alpha; glTF v=0 is the decoded PNG's top row."""
    x, y = uv[0] * image.width - 0.5, uv[1] * image.height - 0.5
    ix, iy, fx, fy = math.floor(x), math.floor(y), x % 1, y % 1
    pixel = image.load()
    def alpha(px: int, py: int) -> float:
        return pixel[max(0, min(image.width - 1, px)), max(0, min(image.height - 1, py))][3] / 255
    return opacity * ((alpha(ix, iy) * (1 - fx) + alpha(ix + 1, iy) * fx) * (1 - fy)
                      + (alpha(ix, iy + 1) * (1 - fx) + alpha(ix + 1, iy + 1) * fx) * fy)


def visible_triangle_alpha(image: Image.Image, corner_uv, cutoff: float) -> bool:
    # Needle sprays legitimately contain gaps through a triangle centroid. A
    # bounded barycentric grid checks pixels inside the real mapped triangle,
    # including its shared centreline, instead of demanding a solid billboard.
    centroid = tuple(sum(value[c] for value in corner_uv) / 3 for c in range(2))
    if png_alpha_at(image, centroid) >= cutoff:
        return True
    steps = 12
    for a in range(steps + 1):
        for b in range(steps + 1 - a):
            weights = (a / steps, b / steps, (steps - a - b) / steps)
            value = tuple(sum(corner_uv[i][c] * weights[i] for i in range(3)) for c in range(2))
            if png_alpha_at(image, value) >= cutoff:
                return True
    return False


def same_attributes(before: Glb, after: Glb, first: dict, second: dict) -> None:
    assert set(first['attributes']) == set(second['attributes']), f'{after.path}: Wood attributes changed'
    for semantic in first['attributes']:
        a, b = first['attributes'][semantic], second['attributes'][semantic]
        metadata_a = before.doc['accessors'][a]
        metadata_b = after.doc['accessors'][b]
        assert [metadata_a[k] for k in ['componentType', 'type', 'count']] == [metadata_b[k] for k in ['componentType', 'type', 'count']]
        assert before.accessor_bytes(a) == after.accessor_bytes(b), f'{after.path}: actual Wood {semantic} modified'
    assert indices(before, first) == indices(after, second), f'{after.path}: Wood triangles modified'


def material_signature(glb: Glb, primitive: dict) -> dict:
    """Resolve texture indices so reordered GLB tables cannot conceal new paint."""
    def resolved(value, key=''):
        if isinstance(value, list):
            return [resolved(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {name: resolved(item, name) for name, item in value.items()}
        if key.endswith('Texture') and 'index' in value:
            texture = glb.doc['textures'][value['index']]
            image = glb.doc['images'][texture['source']]
            result['index'] = {'imageSha256': sha(glb.view(image['bufferView'])),
                               'sampler': glb.doc.get('samplers', [])[texture['sampler']]
                               if 'sampler' in texture else {}}
        return result
    return resolved(glb.doc['materials'][primitive['material']])


def audit_repair_crown_preservation(original: Glb, repaired: Glb) -> None:
    before, after = original.primitive('Foliage'), repaired.primitive('Foliage')
    same_attributes(original, repaired, before, after)
    assert material_signature(original, before) == material_signature(repaired, after), 'Bole repair changed original crown paint/material'


def audit_sentinel_bole_repair(asset: dict, level: str, baseline: Glb, baseline_dir: Path) -> dict:
    key = 'sourceDerived' + level.title() + 'BoleRepair'
    receipt = asset['preparation'].get(key)
    assert receipt and receipt['asset'] == 'verdant-sentinel' and receipt['lod'] == level
    original = Glb(baseline_dir / f'verdant-sentinel-{level}-before-bole-repair.glb')
    near = Glb(baseline_dir / 'verdant-sentinel-near.glb')
    assert sha(original.data) == receipt['originalFarBaselineSha256']
    assert sha(baseline.data) == receipt['repairedFarBaselineSha256']
    assert sha(near.data) == receipt['sourceNearBaselineSha256']
    old, current, source = original.primitive('Wood'), baseline.primitive('Wood'), near.primitive('Wood')
    same_attributes(near, baseline, source, current)
    assert material_signature(near, source) == material_signature(baseline, current), 'Sentinel repair changed Near Wood UV paint/material'
    assert len(indices(original, old)) // 3 == receipt['originalWoodTriangles'] == {'mid': 4875, 'far': 4027}[level]
    assert len(indices(near, source)) // 3 == receipt['replacementNearWoodTriangles'] == 13000
    assert near.geometry_digest(source) == baseline.geometry_digest(current)
    audit_repair_crown_preservation(original, baseline)
    return {'originalBaselineSha256': sha(original.data), 'repairedBaselineSha256': sha(baseline.data),
            'sourceNearBaselineSha256': sha(near.data), 'exactNearWoodGeometryAndPaint': True,
            'originalCrownGeometryAndPaintPreserved': True, 'replacementNearWoodTriangles': 13000,
            'tradeoff': 'Middle and far retain all Near Wood; no distant performance improvement claimed'}


def audit_palm_far_repair(asset: dict, baseline: Glb, baseline_dir: Path) -> dict:
    receipt = asset['preparation'].get('sourceDerivedFarBoleRepair')
    assert receipt, 'palm-fan far: missing explicit source-derived bole repair'
    original = Glb(baseline_dir / 'palm-fan-far-before-bole-repair.glb')
    near = Glb(baseline_dir / 'palm-fan-near.glb')
    stem = Glb(baseline_dir.parent / 'palm-fan-far-grounded-bole.glb')
    assert sha(original.data) == receipt['originalFarBaselineSha256']
    assert sha(baseline.data) == receipt['repairedFarBaselineSha256']
    assert sha(near.data) == receipt['sourceNearBaselineSha256']
    old, current, added = original.primitive('Wood'), baseline.primitive('Wood'), stem.primitive('Wood')
    old_positions = original.values(old['attributes']['POSITION'])
    current_positions = baseline.values(current['attributes']['POSITION'])
    added_positions = stem.values(added['attributes']['POSITION'])
    assert set(old['attributes']) == set(current['attributes']) == set(added['attributes'])
    for semantic in old['attributes']:
        before = original.values(old['attributes'][semantic])
        after = baseline.values(current['attributes'][semantic])
        addition = stem.values(added['attributes'][semantic])
        assert after == before + addition, f'palm-fan far: {semantic} is not the preserved original prefix plus source-derived bole'
    original_index, current_index, stem_index = indices(original, old), indices(baseline, current), indices(stem, added)
    assert current_index == original_index + [i + len(old_positions) for i in stem_index]
    assert len(original_index) // 3 == receipt['originalWoodTriangles'] == 1504
    assert len(stem_index) // 3 == receipt['addedSourceBoleTriangles'] == 1004
    assert min(p[1] for p in old_positions) > 6.6, 'Expected missing lower shaft in old palm far'
    assert abs(min(p[1] for p in added_positions)) < 0.025
    _, components = wood_components(added_positions, stem_index)
    grounded = [component for component in components.values() if abs(component['minimumY']) < 0.025 and component['maximumY'] > 7]
    assert grounded, 'Source-derived far bole must include a contiguous root-to-upper-shaft component'
    root_component = max(grounded, key=lambda component: component['faces'])
    assert root_component['faces'] > len(stem_index) // 6, 'Rooted shaft must be a substantial part of the actual far repair'
    assert root_component['maximumY'] > 7 and abs(root_component['minimumY']) < 0.025
    near_wood = near.primitive('Wood')
    near_positions = near.values(near_wood['attributes']['POSITION'])
    near_index = indices(near, near_wood)
    _, near_components = wood_components(near_positions, near_index)
    near_rooted = [component for component in near_components.values() if component['minimumY'] <= 0.025]
    assert max(c['faces'] for c in near_rooted) == receipt['nearComponent']['faceCount'] == 6927
    assert len(current_positions) == len(old_positions) + len(added_positions)
    audit_repair_crown_preservation(original, baseline)
    return {'originalFarBaselineSha256': sha(original.data), 'repairedFarBaselineSha256': sha(baseline.data),
            'sourceNearBaselineSha256': sha(near.data), 'preservedOriginalUpperWood': True,
            'addedSourceDerivedWoodTriangles': len(stem_index) // 3,
            'rootToUpperShaftComponents': len(grounded), 'largestRootedBoleFaces': root_component['faces'],
            'addedWoodConnectedComponents': len(components),
            'restoredContiguousBoleMinimumY': root_component['minimumY'],
            'restoredContiguousBoleMaximumY': root_component['maximumY']}


def audit_level(asset: dict, level: str, baseline_dir: Path) -> dict:
    row = asset['runtime'][level]
    art = Glb(ROOT / row['path'])
    assert sha(art.data) == row['sha256'] and len(art.data) == row['bytes']
    count = art.triangles()
    assert count == row['triangles']
    assert sorted(name for name, _ in art.instances) == ['Foliage', 'Wood']
    receipt = row.get('customFoliage')
    assert receipt, f'{asset["id"]}:{level}: missing custom foliage receipt'
    baseline = Glb(baseline_dir / f'{asset["id"]}-{level}.glb')
    assert sha(baseline.data) == receipt['baselineSha256'], f'{art.path}: immutable baseline receipt'
    wood, source_wood = art.primitive('Wood'), baseline.primitive('Wood')
    same_attributes(baseline, art, source_wood, wood)
    bole_repair = None
    if asset['id'] == 'palm-fan' and level == 'far':
        bole_repair = audit_palm_far_repair(asset, baseline, baseline_dir)
    elif asset['id'] == 'verdant-sentinel' and level in ['mid', 'far']:
        bole_repair = audit_sentinel_bole_repair(asset, level, baseline, baseline_dir)
    assert receipt['woodGeometrySha256Before'] == receipt['woodGeometrySha256After']
    leaf, source_leaf = art.primitive('Foliage'), baseline.primitive('Foliage')
    positions = art.values(leaf['attributes']['POSITION'])
    source_positions = baseline.values(source_leaf['attributes']['POSITION'])
    index, source_index = indices(art, leaf), indices(baseline, source_leaf)
    assert positions[:len(source_positions)] == source_positions, f'{art.path}: source crown positions changed'
    assert index[:len(source_index)] == source_index, f'{art.path}: source crown triangles changed'
    for semantic in ['NORMAL', 'TANGENT']:
        if semantic not in source_leaf['attributes']:
            continue
        source_values = baseline.values(source_leaf['attributes'][semantic])
        assert art.values(leaf['attributes'][semantic])[:len(source_values)] == source_values, f'{art.path}: source crown {semantic} changed'
    assert receipt['sourceVertices'] == len(source_positions)
    assert receipt['sourceTriangles'] == len(source_index) // 3
    custom_triangles = (len(index) - len(source_index)) // 3
    assert custom_triangles == receipt['customTriangles'] and custom_triangles > 0
    uv, source_uv = art.values(leaf['attributes']['TEXCOORD_0']), baseline.values(source_leaf['attributes']['TEXCOORD_0'])
    su, sv, ou, ov = receipt['sourceFoliageUvTransform']
    assert all(abs(uv[i][0] - (value[0] * su + ou)) < 2e-6 and
               abs(uv[i][1] - (value[1] * sv + ov)) < 2e-6
               for i, value in enumerate(source_uv)), f'{art.path}: source UV atlas remap'
    material, image = art.albedo(leaf)
    assert material.get('alphaMode') == 'MASK' and material.get('doubleSided') is True
    assert abs(material.get('alphaCutoff', 0.5) - 0.35) < 1e-6
    assert image.width == image.height == 2048
    tiles = receipt['customAtlasTiles']
    assert tiles, f'{art.path}: missing custom atlas tiles'
    tile_evidence = []
    for tile in tiles:
        x, y, width, height = [tile[k] for k in ['x', 'y', 'w', 'h']]
        assert min(x, y) >= 0 and min(width, height) > 0
        assert x + width <= image.width and y + height <= image.height
        histogram = image.crop((x, y, x + width, y + height)).getchannel('A').histogram()
        clear, opaque = sum(histogram[:90]), sum(histogram[128:])
        total = width * height
        assert clear / total > 0.05 and opaque / total > 0.02, f'{art.path}: custom tile lacks cutout leaf coverage'
        tile_evidence.append({'variant': tile.get('variant'), 'clearFraction': clear / total,
                              'opaqueFraction': opaque / total,
                              'rgbaSha256': sha(image.crop((x, y, x + width, y + height)).tobytes())})
    _, original_image = baseline.albedo(source_leaf)
    if receipt['sourceResampling'] == 'unchanged pixels':
        assert original_image.size == image.size
        before_pixels, after_pixels = bytearray(original_image.tobytes()), bytearray(image.tobytes())
        for tile in tiles:
            for y in range(tile['y'], tile['y'] + tile['h']):
                start = (y * image.width + tile['x']) * 4
                stop = start + tile['w'] * 4
                before_pixels[start:stop] = after_pixels[start:stop]
        assert before_pixels == after_pixels, f'{art.path}: retained source atlas pixels changed outside custom tiles'
    else:
        assert receipt['sourceResampling'] == 'nearest upsample to 1536; no downsample'
        assert max(original_image.size) <= 1536
        expected = original_image.resize((1536, 1536), Image.Resampling.NEAREST)
        assert image.crop((0, 0, 1536, 1536)).tobytes() == expected.tobytes(), f'{art.path}: remapped source paint changed'
    def custom_uv_inside(value):
        return any((tile['x'] - 0.01) / image.width <= value[0] <= (tile['x'] + tile['w'] + 0.01) / image.width and
                   (tile['y'] - 0.01) / image.height <= value[1] <= (tile['y'] + tile['h'] + 0.01) / image.height for tile in tiles)
    assert all(custom_uv_inside(value) for value in uv[len(source_uv):]), f'{art.path}: custom UV leaves authored tiles'
    near = Glb(baseline_dir / f'{asset["id"]}-near.glb')
    near_wood = near.primitive('Wood')
    near_positions, near_index = near.values(near_wood['attributes']['POSITION']), indices(near, near_wood)
    actual_wood_positions, actual_wood_index = art.values(wood['attributes']['POSITION']), indices(art, wood)
    near_face_components, near_components = wood_components(near_positions, near_index)
    actual_face_components, actual_components = wood_components(actual_wood_positions, actual_wood_index)
    near_root_y = min(p[1] for p in near_positions)
    actual_root_y = min(p[1] for p in actual_wood_positions)
    reserve_bole_exception = asset['id'] == 'tree-1459' and not asset['selected']
    if reserve_bole_exception:
        # This unassigned source retains a lone soil triangle below its structural
        # bole. Prove that specific bole attachment and report the gap honestly;
        # do not enlarge the ground tolerance for any runtime tree.
        assert abs(near_root_y) < 1e-6 and abs(actual_root_y) < 1e-6
        near_structural = max(near_components, key=lambda key: near_components[key]['faces'])
        actual_structural = max(actual_components, key=lambda key: actual_components[key]['faces'])
        assert 0.32 < near_components[near_structural]['minimumY'] < 0.34
        assert 0.32 < actual_components[actual_structural]['minimumY'] < 0.34
    source_crown = near.primitive('Foliage')
    crown_positions, crown_index = near.values(source_crown['attributes']['POSITION']), indices(near, source_crown)
    crown_uv = near.values(source_crown['attributes']['TEXCOORD_0'])
    crown_material, crown_image = near.albedo(source_crown)
    sprigs = receipt['sprigs']
    assert sprigs and sum(s['triangleCount'] for s in sprigs) == custom_triangles
    next_triangle = len(source_index) // 3
    max_contact, max_root_shift, max_leaf_contact, min_crown_alpha = 0.0, 0.0, 0.0, 1.0
    visible_custom_faces = 0
    for sprig in sprigs:
        assert sprig['triangleStart'] == next_triangle
        next_triangle += sprig['triangleCount']
        assert next_triangle <= len(index) // 3
        anchor = tuple(sprig['anchor'])
        face = triangle(actual_wood_positions, actual_wood_index, sprig['woodFaceIndex'])
        contact = triangle_distance(anchor, *face)
        assert contact < 1e-5, f'{art.path}: custom stem is not anchored on this LOD Wood'
        actual_component = actual_components[actual_face_components[sprig['woodFaceIndex']]]
        if reserve_bole_exception:
            assert actual_face_components[sprig['woodFaceIndex']] == actual_structural, f'{art.path}: reserve stem not on the structural bole'
        else:
            assert actual_component['minimumY'] <= actual_root_y + 0.025 + 1e-6, f'{art.path}: stem rooted on a disconnected upper Wood island'
            # Existing source LOD collapses can lift a basal plane slightly;
            # tree-1505 far measures 0.185109 m. Report that drift separately
            # rather than claiming all LOD roots coincide with the near plane.
            # A missing whole shaft (the earlier palm-fan far) cannot pass.
            assert actual_root_y - near_root_y < 0.2, f'{art.path}: LOD is missing the source near-root bole'
        near_anchor = tuple(sprig['anchorNear'])
        near_face = triangle(near_positions, near_index, sprig['woodFaceIndexNear'])
        near_contact = triangle_distance(near_anchor, *near_face)
        assert near_contact < 1e-5, f'{art.path}: canonical custom stem root is not on near Wood'
        near_component = near_components[near_face_components[sprig['woodFaceIndexNear']]]
        if reserve_bole_exception:
            assert near_face_components[sprig['woodFaceIndexNear']] == near_structural, f'{art.path}: reserve canonical stem not on the structural bole'
        else:
            assert near_component['minimumY'] <= near_root_y + 0.025 + 1e-6, f'{art.path}: canonical stem rooted on a disconnected upper Wood island'
        root_shift = distance(anchor, near_anchor)
        assert abs(root_shift - sprig['rootDistanceNear']) < 1e-5
        assert root_shift <= 0.5 + 1e-6, f'{art.path}: excessive cross-LOD attachment movement'
        max_root_shift = max(max_root_shift, root_shift)
        max_contact = max(max_contact, contact)
        crown_face = sprig['crownTriangleIndexNear']
        points = triangle(crown_positions, crown_index, crown_face)
        centre = tuple(sum(p[c] for p in points) / 3 for c in range(3))
        assert distance(centre, tuple(sprig.get('sourceCrownPoint', sprig['crownPoint']))) < 1e-5
        samples = [crown_uv[crown_index[crown_face * 3 + corner]] for corner in range(3)]
        alpha = png_alpha_at(crown_image, tuple(sum(value[c] for value in samples) / 3 for c in range(2)),
                             crown_material.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])[3])
        if crown_material.get('alphaMode', 'OPAQUE') == 'MASK':
            assert alpha >= crown_material.get('alphaCutoff', 0.5) - 1e-6, f'{art.path}: invisible source crown anchor'
        min_crown_alpha = min(min_crown_alpha, alpha)
        root_indices = sprig.get('stemRootVertexIndices')
        assert root_indices, f'{art.path}: actual stem-root vertex proof missing'
        root = tuple(sum(positions[i][c] for i in root_indices) / len(root_indices) for c in range(3))
        assert distance(root, anchor) < 1e-5, f'{art.path}: actual added stem is detached from attachment receipt'
        leaf_bases, leaf_indices = sprig['leafBases'], sprig['leafBaseVertexIndices']
        assert len(leaf_bases) == len(leaf_indices) == sprig['leafCount']
        stem_start = sprig['triangleStart'] * 3
        stem_index = index[stem_start:stem_start + sprig['stemTriangleCount'] * 3]
        for base, base_index in zip(leaf_bases, leaf_indices):
            actual_base = positions[base_index]
            assert distance(actual_base, tuple(base)) < 1e-5, f'{art.path}: actual leaf base differs from attachment receipt'
            leaf_contact = near_surface_distance(actual_base, positions, stem_index)
            assert leaf_contact < 0.035, f'{art.path}: leaf is detached from its custom stem'
            max_leaf_contact = max(max_leaf_contact, leaf_contact)
        leaf_faces_start = sprig['triangleStart'] + sprig['stemTriangleCount']
        leaf_face_count = (sprig['triangleCount'] - sprig['stemTriangleCount']) // sprig['leafCount']
        assert leaf_face_count * sprig['leafCount'] == sprig['triangleCount'] - sprig['stemTriangleCount']
        for blade in range(sprig['leafCount']):
            visible = 0
            for face in range(leaf_faces_start + blade * leaf_face_count, leaf_faces_start + (blade + 1) * leaf_face_count):
                corner_uv = [uv[index[face * 3 + c]] for c in range(3)]
                if visible_triangle_alpha(image, corner_uv, 0.35):
                    visible += 1
            assert visible > 0, f'{art.path}: a custom leaf has no visible alpha-tested faces'
            visible_custom_faces += visible
    complete_source_positions = source_positions + actual_wood_positions
    source_bounds = [[min(p[c] for p in complete_source_positions) for c in range(3)],
                     [max(p[c] for p in complete_source_positions) for c in range(3)]]
    assert all(source_bounds[0][c] - 1e-5 <= p[c] <= source_bounds[1][c] + 1e-5
               for p in positions[len(source_positions):] for c in range(3)), f'{art.path}: additions altered source complete bounds/uniform scale'
    return {'id': asset['id'], 'lod': level, 'triangles': count, 'customTriangles': custom_triangles,
            'sprigs': len(sprigs), 'woodUnchanged': bole_repair is None,
            'woodEqualsPostRepairBaseline': True, 'sourceCrownPreserved': True,
            **({'sourceDerivedLodBoleRepair': bole_repair} if bole_repair else {}),
            'sourcePaintPreserved': True, 'maximumActualLodWoodRootDistance': max_contact,
            'groundConnectedWoodAttachments': not reserve_bole_exception,
            'reserveStructuralBoleAttachments': reserve_bole_exception,
            **({'reserveStructuralRootY': actual_components[actual_structural]['minimumY'],
                'retainedIsolatedSoilMinimumY': actual_root_y} if reserve_bole_exception else {}),
            'woodGeometrySha256Independent': art.geometry_digest(wood),
            'maximumCrossLodRootShift': max_root_shift, 'maximumLeafBaseStemDistance': max_leaf_contact,
            'nearRelativeLodBasalDrift': actual_root_y - near_root_y,
            'minimumSourceCrownAlpha': min_crown_alpha, 'visibleCustomLeafFacesSampled': visible_custom_faces,
            'tileCoverage': tile_evidence, 'sha256': sha(art.data)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'docs/engineering/meshy-tree-assets.json')
    parser.add_argument('--baseline', type=Path, required=True, help='Immutable GLB backups made before custom foliage')
    parser.add_argument('--report', type=Path, help='Optional durable JSON evidence outside the assets')
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    assert len(manifest['assets']) == 15, 'Expected all fifteen owner-supplied derivatives'
    assert len({asset['id'] for asset in manifest['assets']}) == 15
    rows = []
    for asset in manifest['assets']:
        assert asset.get('preparation', {}).get('customFoliage'), f'{asset["id"]}: missing custom foliage provenance'
        for level in ['near', 'mid', 'far']:
            rows.append(audit_level(asset, level, args.baseline))
        print(f'{asset["id"]}: all three complete GLBs, alpha tiles, crown UVs, real Wood anchors and custom stems verified')
    for receipt in manifest['protectedPine']:
        data = (ROOT / receipt['path']).read_bytes()
        assert sha(data) == receipt['sha256'] and len(data) == receipt['bytes'], 'Protected custom Pine changed'
    custom_signatures = {tuple(tile['rgbaSha256'] for tile in row['tileCoverage'])
                         for row in rows if row['lod'] == 'near'}
    assert len(custom_signatures) == 15, 'Each supplied source must have its own family-fitting custom leaf art'
    result = {'scope': 'independent actual-file custom foliage audit; not native composition or GPU timing',
              'trees': 15, 'glbs': len(rows), 'maximumTriangles': max(row['triangles'] for row in rows),
              'protectedPineUnchanged': True, 'strictGroundConnectedTrees': 14,
              'originalWoodUnchangedGlbs': sum(row['woodUnchanged'] for row in rows),
              'sourceDerivedBoleRepairs': sum('sourceDerivedLodBoleRepair' in row for row in rows),
              'reserveStructuralException': 'Unassigned tree-1459: structural bole starts 0.3326–0.3342 m above retained isolated soil triangle at y=0; no complete root-seating claim',
              'rows': rows}
    assert result['originalWoodUnchangedGlbs'] == 42 and result['sourceDerivedBoleRepairs'] == 3
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'rows'}, indent=2))


if __name__ == '__main__':
    main()
