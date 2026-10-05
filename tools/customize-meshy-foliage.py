#!/usr/bin/env python3
"""Add original attached leaf sprigs to the owner's prepared tree derivatives.

This is an offline GLB postprocess, not a camera-relative runtime deformation.
Wood attributes/indices and the original crown geometry remain byte-identical.
Existing 63-view atlases receive paint only in their previously empty 64th tile;
smaller source maps receive a matching 2k composite without downsampling.
Run with a Python environment containing numpy and Pillow. Originals are read
only, and a durable prepared-file baseline makes this operation reproducible.
"""
import argparse
import copy
import hashlib
import importlib.util
import io
import json
import math
import pathlib
import struct
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_WORKSHOP = REPO.parents[1] / 'outputs/tervain-0.0.12-trees'
PROFILES = {
    'palm-fan': ('sun-fan leaflet', 'palm', (103, 126, 55)),
    'palm-lean': ('saltwind leaflet', 'palm', (67, 115, 55)),
    'palm-date': ('strand date leaflet', 'palm', (96, 135, 56)),
    'fir-spire': ('ridge needle spray', 'needle', (49, 105, 86)),
    'oak-elder': ('elder oak lobed leaf', 'oak', (77, 109, 44)),
    'tree-0208': ('old elder pointed leaf', 'elliptic', (89, 123, 59)),
    'tree-1537': ('gnarled oak weathered leaf', 'oak', (117, 113, 50)),
    'tree-1527': ('mist alder round leaf', 'round', (62, 120, 68)),
    'tree-1521': ('meadow oak sunlit leaf', 'oak', (105, 135, 58)),
    'tree-4949': ('coppice sage leaf', 'round', (91, 135, 71)),
    'tree-3106': ('coppice amber-tipped leaf', 'elliptic', (117, 130, 59)),
    'tree-1505': ('rooted oak broad leaf', 'oak', (112, 132, 55)),
    'tree-1459': ('orchard young leaf', 'elliptic', (82, 130, 66)),
    'tree-4815': ('river broadleaf tapered leaf', 'spear', (54, 121, 67)),
    'verdant-sentinel': ('sentinel tapered leaf', 'spear', (62, 120, 67)),
}
COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
DTYPES = {5121: '<u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}


def load_glb(path):
    raw = path.read_bytes()
    assert raw[:4] == b'glTF' and struct.unpack_from('<II', raw, 4) == (2, len(raw))
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + size])
    assert struct.unpack_from('<I', raw, 24 + size)[0] == 0x004e4942
    return doc, bytearray(raw[28 + size:])


def primitive(doc, name):
    nodes = [n for n in doc['nodes'] if n.get('name') == name and 'mesh' in n]
    assert len(nodes) == 1 and not any(k in nodes[0] for k in ('matrix', 'translation', 'rotation', 'scale'))
    mesh = doc['meshes'][nodes[0]['mesh']]
    assert len(mesh['primitives']) == 1
    return mesh['primitives'][0]


def values(doc, binary, index):
    a = doc['accessors'][index]
    assert not a.get('sparse')
    view = doc['bufferViews'][a['bufferView']]
    components = COMPONENTS[a['type']]
    dtype = np.dtype(DTYPES[a['componentType']])
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = view.get('byteStride', dtype.itemsize * components)
    return np.ndarray((a['count'], components), dtype=dtype, buffer=binary,
                      offset=offset, strides=(stride, dtype.itemsize)).copy()


def logical_hash(doc, binary, p):
    h = hashlib.sha256()
    for semantic, accessor in sorted(p['attributes'].items()):
        a = doc['accessors'][accessor]
        h.update(semantic.encode()); h.update(str(a['componentType']).encode())
        h.update(a['type'].encode()); h.update(values(doc, binary, accessor).tobytes())
    h.update(b'indices'); h.update(values(doc, binary, p['indices']).tobytes())
    return h.hexdigest()


def image_for(doc, binary, texture_index):
    source = doc['textures'][texture_index]['source']
    im = doc['images'][source]
    view = doc['bufferViews'][im['bufferView']]
    raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    return Image.open(io.BytesIO(raw)).convert('RGBA'), source


def append_view(doc, binary, data, target=None):
    while len(binary) % 4: binary.append(0)
    index = len(doc['bufferViews'])
    view = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)}
    if target: view['target'] = target
    doc['bufferViews'].append(view); binary.extend(data)
    return index


def append_accessor(doc, binary, data, kind, component=5126, bounds=False):
    data = np.asarray(data, dtype=np.dtype(DTYPES[component]))
    view = append_view(doc, binary, data.tobytes(), 34963 if kind == 'SCALAR' else 34962)
    accessor = {'bufferView': view, 'componentType': component, 'count': len(data), 'type': kind}
    if bounds:
        accessor['min'] = data.min(axis=0).astype(float).tolist()
        accessor['max'] = data.max(axis=0).astype(float).tolist()
    index = len(doc['accessors']); doc['accessors'].append(accessor)
    return index


def add_image(doc, binary, image, old_texture, name):
    out = io.BytesIO(); image.save(out, format='PNG', compress_level=6)
    view = append_view(doc, binary, out.getvalue())
    image_index = len(doc['images'])
    doc['images'].append({'bufferView': view, 'mimeType': 'image/png', 'name': name})
    tex = copy.deepcopy(doc['textures'][old_texture]); tex['source'] = image_index
    tex.pop('extensions', None)
    index = len(doc['textures']); doc['textures'].append(tex)
    return index


def normalize(v):
    length = np.linalg.norm(v)
    assert length > 1e-10
    return v / length


def basis(direction):
    direction = normalize(direction)
    reference = np.eye(3)[np.argmin(np.abs(direction))]
    side = normalize(np.cross(direction, reference))
    return side, normalize(np.cross(side, direction))


def paint_leaf(style, rgb, variant, size):
    """Original alpha cutout art: vein networks, granular paint and warm wear."""
    scale = 3; n = size * scale
    y, x = np.mgrid[0:n, 0:n].astype(float)
    u = (x + .5) / n; v = 1 - (y + .5) / n
    rng = np.random.default_rng(18273 + variant * 73 + sum(map(ord, style)))
    grain = rng.normal(0, 1.9, (n, n))
    t = np.clip((v - .075) / .85, 0, 1)
    if style == 'oak':
        width = .355 * np.sin(math.pi * t) ** .72 * (.83 + .17 * np.cos(t * 8 * math.pi))
    elif style == 'round':
        width = .38 * np.sin(math.pi * t) ** .65
    elif style == 'palm':
        width = .21 * np.sin(math.pi * t) ** .85
    else:
        width = (.29 if style == 'elliptic' else .24) * np.sin(math.pi * t) ** .95
    bend = .018 * np.sin(t * math.pi * 1.5 + variant)
    signed = u - .5 - bend
    leaf = (np.abs(signed) < width) & (v >= .075) & (v <= .925)
    ratio = np.abs(signed) / np.maximum(width, .005)
    # Light catches one side; veins remain visible without becoming neon stripes.
    shade = .79 + .18 * (1 - ratio) + .06 * np.sin(t * math.pi) + .04 * np.sign(signed)
    shade *= (.83, 1, 1.12, .94)[variant]
    colour = np.array(rgb, float)[None, None, :] * shade[:, :, None]
    colour += grain[:, :, None]
    dry = np.clip((ratio - .72) / .28, 0, 1) * (.18 + .06 * variant)
    colour = colour * (1 - dry[:, :, None]) + np.array([155, 123, 53]) * dry[:, :, None]
    central = np.exp(-(signed / .009) ** 2)
    # Eight alternating oblique secondary vein pairs, terminated at the edge.
    veins = central * 13
    for origin in np.linspace(.16, .79, 8):
        vein_v = origin + np.abs(signed) * .55
        veins += np.exp(-((v - vein_v) / .006) ** 2) * np.clip(1 - ratio, 0, 1) * 6
    colour += veins[:, :, None] * np.array([1, .8, .45])
    pixels = np.zeros((n, n, 4), np.uint8)
    pixels[:, :, :3] = np.clip(colour, 0, 255).astype(np.uint8)
    pixels[:, :, 3] = leaf.astype(np.uint8) * 255
    image = Image.fromarray(pixels)
    if style == 'needle':
        image = Image.new('RGBA', (n, n), (0, 0, 0, 0)); draw = ImageDraw.Draw(image)
        stem = [(n * .5, n * .94), (n * .49, n * .08)]
        draw.line(stem, fill=(72, 90, 46, 255), width=max(2, n // 90))
        for side in (-1, 1):
            for i, origin in enumerate(np.linspace(.82, .18, 11)):
                a = (n * .5, n * origin)
                b = (n * (.5 + side * (.25 + .04 * math.sin(i))), n * (origin - .11))
                factor = .83 + .15 * ((i + variant) % 3)
                c = tuple(int(ch * factor) for ch in rgb) + (255,)
                draw.line([a, b], fill=c, width=max(3, n // 52))
                draw.line([a, b], fill=tuple(min(255, int(ch * 1.14)) for ch in c[:3]) + (255,), width=max(1, n // 150))
    # Supply an opaque bark-coloured texel for attached twig ribbons/tubes.
    draw = ImageDraw.Draw(image); draw.rectangle((n*.03, n*.94, n*.16, n*.985), fill=(89, 76, 46, 255))
    return image.resize((size, size), Image.Resampling.LANCZOS)


def make_composite(image, cards, style, rgb, kind='albedo'):
    if cards:
        assert image.size == (2048, 2048)
        # Blender's bottom-up atlas exports as top-down PNG and flipped glTF V.
        source_rect = [0, 0, 2048, 2048]; transform = [1, 1, 0, 0]
        tiles = [{'x': 1792 + (i % 2) * 128, 'y': (i // 2) * 128, 'w': 128, 'h': 128, 'variant': i} for i in range(4)]
        assert np.array(image)[0:256, 1792:2048, 3].max() == 0, 'Reserved source atlas tile must be empty'
        output = image.copy()
    else:
        assert max(image.size) <= 1536, 'Do not silently reduce source paint'
        source_rect = [0, 0, 1536, 1536]; transform = [.75, .75, 0, 0]
        tiles = [{'x': 1536 + (i % 2) * 256, 'y': (i // 2) * 256, 'w': 256, 'h': 256, 'variant': i} for i in range(4)]
        fill = (128, 128, 255, 255) if kind == 'normal' else (255, 242, 0, 255) if kind == 'roughness' else (0, 0, 0, 0)
        output = Image.new('RGBA', (2048, 2048), fill)
        # Nearest preserves source texels exactly and keeps synthetic audit direct.
        output.paste(image.resize((1536, 1536), Image.Resampling.NEAREST), (0, 0))
    for tile in tiles:
        art = paint_leaf(style, rgb, tile['variant'], tile['w'])
        if kind != 'albedo':
            # Painted albedo relief does not pretend to be an authored leaf normal.
            flat = Image.new('RGBA', art.size, (128, 128, 255, 255) if kind == 'normal' else (255, 242, 0, 255))
            art = flat
        output.paste(art, (tile['x'], tile['y']))
    return output, transform, source_rect, tiles


def closest_point_triangle(point, tri):
    """Closest point using barycentric vertex/edge/face Voronoi regions."""
    a, b, c = tri; ab = b - a; ac = c - a; ap = point - a
    d1 = np.dot(ab, ap); d2 = np.dot(ac, ap)
    if d1 <= 0 and d2 <= 0: return a
    bp = point - b; d3 = np.dot(ab, bp); d4 = np.dot(ac, bp)
    if d3 >= 0 and d4 <= d3: return b
    vc = d1*d4 - d3*d2
    if vc <= 0 and d1 >= 0 and d3 <= 0: return a + d1 / (d1-d3) * ab
    cp = point - c; d5 = np.dot(ab, cp); d6 = np.dot(ac, cp)
    if d6 >= 0 and d5 <= d6: return c
    vb = d5*d2 - d1*d6
    if vb <= 0 and d2 >= 0 and d6 <= 0: return a + d2 / (d2-d6) * ac
    va = d3*d6 - d5*d4
    if va <= 0 and d4-d3 >= 0 and d5-d6 >= 0: return b + (d4-d3) / ((d4-d3)+(d5-d6)) * (c-b)
    total = va+vb+vc
    if abs(total) < 1e-20: return min(tri, key=lambda x: np.linalg.norm(point-x))
    return a + ab * vb/total + ac * vc/total


def closest_wood(point, wood_triangles, valid_faces):
    wood_triangles=wood_triangles[valid_faces]
    # Triangles containing the point may have a distant centre. Include candidates
    # with the nearest bounding box, then solve their exact closest point.
    lo = wood_triangles.min(axis=1); hi = wood_triangles.max(axis=1)
    gap = np.maximum(0, np.maximum(lo-point, point-hi))
    distances = np.sum(gap*gap, axis=1)
    order = np.argsort(distances)[:96]
    best = None; best_distance = math.inf; best_index = None
    for index in order:
        if distances[index] > best_distance**2 + 1e-12: continue
        q = closest_point_triangle(point, wood_triangles[index])
        distance = np.linalg.norm(q-point)
        if distance < best_distance: best, best_distance, best_index = q, distance, int(valid_faces[index])
    return best.copy(), float(best_distance), best_index


def structural_wood_faces(positions,indices,key):
    """Connected real bole authority, welding spatially equal UV seam vertices."""
    quantized=np.round(positions/1e-5).astype(np.int64)
    unique,inverse=np.unique(quantized,axis=0,return_inverse=True)
    parent=list(range(len(unique)))
    def find(index):
        while parent[index]!=index:
            parent[index]=parent[parent[index]];index=parent[index]
        return index
    for triangle in inverse[indices]:
        a,b,c=[find(int(i)) for i in triangle];parent[b]=a;parent[c]=a
    components={}
    for i,triangle in enumerate(inverse[indices]):components.setdefault(find(int(triangle[0])),[]).append(i)
    root_plane=float(positions[:,1].min());eligible=[]
    for faces in components.values():
        points=positions[indices[faces]]
        if points[:,:,1].min()<=root_plane+.025 and points[:,:,1].max()-points[:,:,1].min()>2:eligible.append(faces)
    exception=None
    if not eligible:
        assert key=='tree-1459',(key,'No ground-connected structural Wood component')
        # This unassigned source retains its documented detached low soil face.
        # Attach only to the real connected tree, without treating soil as bole.
        eligible=[faces for faces in components.values() if positions[indices[faces]][:,:,1].max()-positions[indices[faces]][:,:,1].min()>2]
        exception='Reserved tree-1459 retains a disconnected lower soil triangle; structural bole root plane is above the complete source minimum. It remains unassigned.'
    faces=np.array(max(eligible,key=len),dtype=int)
    return faces,{'weldPositionTolerance':1e-5,'faceCount':len(faces),
                  'sourceWoodMinimumY':root_plane,'structuralRootPlaneY':float(positions[indices[faces]][:,:,1].min()),
                  'exception':exception}


def inspect_source(doc, binary, key):
    leaf = primitive(doc, 'Foliage'); wood = primitive(doc, 'Wood')
    lp = values(doc, binary, leaf['attributes']['POSITION']).astype(float)
    wp = values(doc, binary, wood['attributes']['POSITION']).astype(float)
    li = values(doc, binary, leaf['indices']).ravel().reshape(-1, 3)
    wi = values(doc, binary, wood['indices']).ravel().reshape(-1, 3)
    grounded_faces,grounded_info=structural_wood_faces(wp,wi,key)
    wood_uv=values(doc,binary,wood['attributes']['TEXCOORD_0']).astype(float)[wi].mean(axis=1)
    wood_material=doc['materials'][wood['material']]
    wood_image,_=image_for(doc,binary,wood_material['pbrMetallicRoughness']['baseColorTexture']['index'])
    wood_pixels=np.asarray(wood_image);wxy=np.clip(wood_uv,0,1)
    wx=np.minimum((wxy[:,0]*wood_image.width).astype(int),wood_image.width-1)
    wy=np.minimum((wxy[:,1]*wood_image.height).astype(int),wood_image.height-1)
    wood_rgb=wood_pixels[wy,wx,:3].astype(float)
    # Rooted meshes can still contain source leaflike wisps physically joined to
    # a branch. Prefer neutral/brown bark faces over green-painted remnants.
    green=(wood_rgb[:,1]>wood_rgb[:,0]*1.05)&(wood_rgb[:,1]>wood_rgb[:,2]*1.12)
    bark_faces=grounded_faces[~green[grounded_faces]]
    uv = values(doc, binary, leaf['attributes']['TEXCOORD_0']).astype(float)
    material = doc['materials'][leaf['material']]
    image, _ = image_for(doc, binary, material['pbrMetallicRoughness']['baseColorTexture']['index'])
    pixels = np.asarray(image)
    centres = lp[li].mean(axis=1); centroid_uv = uv[li].mean(axis=1)
    xy = np.clip(centroid_uv, 0, 1)
    # glTF linear-filtered, texel-centred alpha, matching native source sampling.
    sx=xy[:,0]*image.width-.5; sy=xy[:,1]*image.height-.5
    ix=np.floor(sx).astype(int); iy=np.floor(sy).astype(int); fx=sx-ix; fy=sy-iy
    x0=np.clip(ix,0,image.width-1);x1=np.clip(ix+1,0,image.width-1)
    y0=np.clip(iy,0,image.height-1);y1=np.clip(iy+1,0,image.height-1)
    alpha=((pixels[y0,x0,3]*(1-fx)*(1-fy)+pixels[y0,x1,3]*fx*(1-fy)+pixels[y1,x0,3]*(1-fx)*fy+pixels[y1,x1,3]*fx*fy)/255
           *material['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1])[3])
    mask = alpha >= max(.5, material.get('alphaCutoff', .35))
    visible_indices = np.where(mask)[0]
    if len(visible_indices) > 2400:
        visible_indices = visible_indices[np.linspace(0, len(visible_indices)-1, 2400).astype(int)]
    assert len(visible_indices), 'No visible source foliage attachment targets'
    all_points = np.concatenate((lp, wp)); bounds = [all_points.min(axis=0), all_points.max(axis=0)]
    return {'leaf': leaf, 'wood': wood, 'lp': lp, 'li': li, 'wp': wp,
            'wi': wi, 'woodTriangles': wp[wi], 'visible': centres[visible_indices],
            'groundedWoodFaces':grounded_faces,'groundedWoodInfo':grounded_info,'barkFaces':bark_faces,
            'visibleIndices': visible_indices, 'alpha': alpha,
            'bounds': bounds, 'image': image}


def attachment_sites(sources, key, count):
    source = sources['near']; triangles = source['woodTriangles']
    centres = triangles.mean(axis=1)
    ymin = max(2.4, float(source['visible'][:, 1].min())-.65)
    ids = source['barkFaces'][centres[source['barkFaces'],1] >= ymin]
    if not len(ids):ids=source['groundedWoodFaces'][centres[source['groundedWoodFaces'],1]>=ymin]
    if len(ids) > 4800: ids = ids[np.linspace(0, len(ids)-1, 4800).astype(int)]
    assert len(ids)
    candidates = []
    for cursor in range(0, len(ids), 180):
        batch = ids[cursor:cursor+180]
        squared = ((centres[batch, None, :] - source['visible'][None, :, :])**2).sum(axis=2)
        nearest = np.argmin(squared, axis=1)
        for face, leaf_index, distance in zip(batch, nearest, np.sqrt(squared.min(axis=1))):
            if distance > 1.7: continue
            anchor = centres[face].copy(); crown = source['visible'][leaf_index].copy(); source_crown=crown.copy()
            if np.linalg.norm(crown-anchor) < .08:
                # A small outward/upward shoot at a crown already touching Wood.
                direction = anchor - np.array([0, anchor[1]-.4, 0]); direction[1] += .25
                crown = anchor + normalize(direction) * .5
            radius = math.hypot(anchor[0], anchor[2])
            # Prefer actual distal branch shoulders; retain enough central upper
            # anchors for slender firs and palms without disconnected placements.
            score = min(radius, 3)*.4 + anchor[1]*.055 - distance*.17
            candidates.append({'anchorNear': anchor, 'crown': crown,
                               'sourceCrownPoint':source_crown,
                               'woodFaceIndexNear': int(face),
                               'crownTriangleIndexNear': int(source['visibleIndices'][leaf_index]),
                               'crownAlpha': float(source['alpha'][source['visibleIndices'][leaf_index]]),
                               'crownDistance': float(distance), 'score': score})
    assert candidates, (key, 'No wood-to-visible-crown attachment candidates')
    rng = np.random.default_rng(int(hashlib.sha256(key.encode()).hexdigest()[:8], 16))
    for c in candidates: c['score'] += rng.uniform(0, .55)
    candidates.sort(key=lambda c: c['score'], reverse=True)
    sites = []
    # Greedy farthest spacing gives deliberate branch coverage instead of random
    # floating points; every chosen root is projected onto each exact LOD Wood.
    for threshold in (.50, .32, .16):
        for candidate in candidates:
            anchor = candidate['anchorNear']
            if any(np.linalg.norm(anchor-other['anchorNear']) < threshold for other in sites): continue
            projected = {}
            for lod, src in sources.items():
                if lod == 'near': projected[lod] = (anchor.copy(), 0., candidate['woodFaceIndexNear'])
                else: projected[lod] = closest_wood(anchor, src['woodTriangles'],src['groundedWoodFaces'])
            if max(item[1] for item in projected.values()) > .5: continue
            candidate = dict(candidate); candidate['roots'] = projected
            sites.append(candidate)
            if len(sites) == count: return sites
    assert sites, (key, 'No cross-LOD rooted anchors')
    return sites


class Geometry:
    def __init__(self): self.positions=[]; self.uvs=[]; self.faces=[]
    def vertex(self, point, uv):
        self.positions.append(np.asarray(point, float)); self.uvs.append(tuple(uv)); return len(self.positions)-1
    def face(self, *vertices): self.faces.append(tuple(vertices))


def tile_uv(tile, u, v):
    # Three-pixel transparent padding prevents neighbour bleed at leaf edges.
    return ((tile['x']+3+u*(tile['w']-6))/2048,
            (tile['y']+3+v*(tile['h']-6))/2048)


def curved_leaf(geometry, origin, direction, length, width, twist, tile, lod, bounds):
    side, normal = basis(direction)
    side = side*math.cos(twist)+normal*math.sin(twist); normal = normalize(np.cross(side, direction))
    def point(t, across):
        q = origin + direction*(length*t) + side*(width*across) + normal*(length*.13*math.sin(math.pi*t) + width*.13*abs(across))
        # An interior AABB margin guarantees the original complete tree's height
        # and per-family uniform runtime scale remain unchanged.
        return np.clip(q, bounds[0]+.0005, bounds[1]-.0005)
    if lod == 'near':
        start = geometry.vertex(point(0, 0), tile_uv(tile,.5,.925))
        rows=[]
        for t, span in ((.34,.84),(.72,.75)):
            rows.append([geometry.vertex(point(t,a*span), tile_uv(tile,.5+a*.38*span,.925-t*.85)) for a in (-1,0,1)])
        tip=geometry.vertex(point(1,0), tile_uv(tile,.5,.075))
        geometry.face(start,rows[0][0],rows[0][1]); geometry.face(start,rows[0][1],rows[0][2])
        for col in (0,1):
            a,b=rows[0][col:col+2];c,d=rows[1][col:col+2]
            geometry.face(a,c,d);geometry.face(a,d,b)
        geometry.face(rows[1][0],tip,rows[1][1]);geometry.face(rows[1][1],tip,rows[1][2])
    elif lod == 'mid':
        verts=[geometry.vertex(point(t,a),tile_uv(tile,.5+a*.34,.925-t*.85)) for t,a in ((0,0),(.52,-1),(.52,0),(.52,1),(1,0))]
        geometry.face(verts[0],verts[1],verts[2]);geometry.face(verts[0],verts[2],verts[3]);geometry.face(verts[1],verts[4],verts[2]);geometry.face(verts[2],verts[4],verts[3])
    else:
        # A small continuous blade rather than a separate billboard envelope.
        verts=[geometry.vertex(point(t,a),tile_uv(tile,.5+a*.34,.925-t*.85)) for t,a in ((0,0),(.50,-1),(.50,1),(1,0))]
        geometry.face(verts[0],verts[1],verts[2]);geometry.face(verts[1],verts[3],verts[2])
    return start if lod == 'near' else verts[0]


def geometry_for_sites(sites, source, lod, key, tiles):
    geometry=Geometry(); records=[]
    rng=np.random.default_rng(int(hashlib.sha256((key+'-sprigs').encode()).hexdigest()[:8],16))
    style=PROFILES[key][1]
    for number, site in enumerate(sites):
        root,distance,face = site['roots'][lod]
        delta=site['crown']-site['anchorNear']
        direction=normalize(delta)
        length=min(1.12,max(.50,float(np.linalg.norm(delta))*.73))
        if style=='palm': length*=1.12
        side,normal=basis(direction)
        bend=normal*(.10*length)
        segments={'near':4,'mid':2,'far':1}[lod];sides=4 if lod=='near' else 3
        def raw_spine(t):return np.clip(root+direction*length*t+bend*math.sin(math.pi*t),source['bounds'][0],source['bounds'][1])
        def spine(t):
            # Leaves must attach to the actual polygonal stem, including far's
            # single straight segment, rather than its ideal analytic curve.
            step=min(segments-1,int(t*segments));fraction=t*segments-step
            return raw_spine(step/segments)*(1-fraction)+raw_spine((step+1)/segments)*fraction
        # Keep the root on real Wood and the shoot inside the original tree.
        if np.any(root<source['bounds'][0]) or np.any(root>source['bounds'][1]): raise AssertionError((key,lod,'root outside source bounds'))
        radius=.016 if style=='palm' else .012
        triangle_start=len(geometry.faces);vertex_start=len(geometry.positions)
        rings=[];stem_tile=tiles[number%4];stem_uv=tile_uv(stem_tile,.085,.965)
        for segment in range(segments+1):
            t=segment/segments;centre=spine(t)
            ring=[geometry.vertex(np.clip(centre+(side*math.cos(a*2*math.pi/sides)+normal*math.sin(a*2*math.pi/sides))*radius*(1-.57*t),source['bounds'][0],source['bounds'][1]),stem_uv) for a in range(sides)]
            rings.append(ring)
        for segment in range(segments):
            for k in range(sides):
                a,b=rings[segment][k],rings[segment][(k+1)%sides];c,d=rings[segment+1][k],rings[segment+1][(k+1)%sides]
                geometry.face(a,c,d);geometry.face(a,d,b)
        stem_triangles=len(geometry.faces)-triangle_start
        leaf_count={'near':6,'mid':4,'far':2}[lod]
        leaf_bases=[];leaf_base_indices=[]
        leaf_length=(.60 if style=='palm' else .46 if style=='needle' else .39)*rng.uniform(.87,1.14)
        width_ratio=.22 if style in ('palm','spear') else .30 if style=='needle' else .34
        for k in range(leaf_count):
            # Every leaf's first point lies on the connected shoot, alternating
            # sides with distinct pitch; it is never a free scatter card.
            t=.24+.70*(k+.2)/leaf_count
            base=spine(t);sign=-1 if k%2 else 1
            angle=.83 if style=='palm' else 1.0
            leaf_direction=normalize(direction*math.cos(angle)+side*sign*math.sin(angle)+normal*.12)
            tile=tiles[(number+k)%4]
            index=curved_leaf(geometry,base,leaf_direction,leaf_length*(.83+.14*math.sin(k+number)),leaf_length*width_ratio,sign*.28+number*.27,tile,lod,source['bounds'])
            leaf_bases.append(base.tolist());leaf_base_indices.append(index)
        records.append({'anchor':root.tolist(),'woodFaceIndex':face,'woodFaceIndexNear':site['woodFaceIndexNear'],
                        'anchorNear':site['anchorNear'].tolist(),'rootDistanceNear':distance,
                        'crownPoint':site['crown'].tolist(),'sourceCrownPoint':site['sourceCrownPoint'].tolist(),'crownTriangleIndexNear':site['crownTriangleIndexNear'],
                        'crownAlpha':site['crownAlpha'],'crownDistance':site['crownDistance'],
                        'triangleStart':triangle_start,'triangleCount':len(geometry.faces)-triangle_start,
                        'vertexStart':vertex_start,'vertexCount':len(geometry.positions)-vertex_start,
                        'stemTriangleCount':stem_triangles,'stemRootVertexIndices':rings[0],
                        'leafBases':leaf_bases,'leafBaseVertexIndices':leaf_base_indices,'leafCount':leaf_count})
    positions=np.asarray(geometry.positions,dtype='<f4');uvs=np.asarray(geometry.uvs,dtype='<f4');indices=np.asarray(geometry.faces,dtype='<u4')
    normals=np.zeros_like(positions);tangents=np.zeros_like(positions)
    for a,b,c in indices:
        e1=positions[b]-positions[a];e2=positions[c]-positions[a];n=np.cross(e1,e2)
        if np.linalg.norm(n)>1e-10:
            n=normalize(n)
            for i in (a,b,c):normals[i]+=n
        uv1=uvs[b]-uvs[a];uv2=uvs[c]-uvs[a];det=uv1[0]*uv2[1]-uv2[0]*uv1[1]
        if abs(det)>1e-12:
            tangent=(e1*uv2[1]-e2*uv1[1])/det
            for i in (a,b,c):tangents[i]+=tangent
    tangent4=[]
    for i,n in enumerate(normals):
        if np.linalg.norm(n)<1e-10:n=np.array([0,1,0.])
        n=normalize(n);normals[i]=n;t=tangents[i]-n*np.dot(tangents[i],n)
        if np.linalg.norm(t)<1e-10:t=basis(n)[0]
        tangent4.append([*normalize(t),1.])
    return positions,normals,uvs,indices,np.asarray(tangent4,dtype='<f4'),records


def compact(doc, binary):
    used_accessors=set()
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            used_accessors.update(p['attributes'].values());used_accessors.add(p['indices'])
    amap={old:new for new,old in enumerate(sorted(used_accessors))}
    doc['accessors']=[doc['accessors'][old] for old in sorted(used_accessors)]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            p['indices']=amap[p['indices']];p['attributes']={k:amap[v] for k,v in p['attributes'].items()}
    used_textures=set()
    def refs(obj,key=''):
        if isinstance(obj,dict):
            if key.endswith('Texture') and 'index' in obj:used_textures.add(obj['index'])
            for k,v in obj.items():refs(v,k)
        elif isinstance(obj,list):
            for v in obj:refs(v,key)
    for mat in doc['materials']:refs(mat)
    tmap={old:new for new,old in enumerate(sorted(used_textures))};doc['textures']=[doc['textures'][old] for old in sorted(used_textures)]
    def remap(obj,key=''):
        if isinstance(obj,dict):
            if key.endswith('Texture') and 'index' in obj:obj['index']=tmap[obj['index']]
            for k,v in obj.items():remap(v,k)
        elif isinstance(obj,list):
            for v in obj:remap(v,key)
    for mat in doc['materials']:remap(mat)
    used_images={t['source'] for t in doc['textures']};imap={old:new for new,old in enumerate(sorted(used_images))}
    doc['images']=[doc['images'][old] for old in sorted(used_images)]
    for t in doc['textures']:t['source']=imap[t['source']]
    views={a['bufferView'] for a in doc['accessors']}|{im['bufferView'] for im in doc['images']}
    output=bytearray();vmap={};new_views=[]
    for old in sorted(views):
        view=doc['bufferViews'][old];raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
        while len(output)%4:output.append(0)
        vmap[old]=len(new_views);new_views.append({**view,'byteOffset':len(output),'buffer':0});output.extend(raw)
    for a in doc['accessors']:a['bufferView']=vmap[a['bufferView']]
    for im in doc['images']:im['bufferView']=vmap[im['bufferView']]
    doc['bufferViews']=new_views
    # All samplers are currently used by the preserved sources/custom maps.
    used_samplers={t['sampler'] for t in doc['textures'] if 'sampler' in t}
    smap={old:new for new,old in enumerate(sorted(used_samplers))};doc['samplers']=[doc.get('samplers',[])[old] for old in sorted(used_samplers)]
    for t in doc['textures']:
        if 'sampler' in t:t['sampler']=smap[t['sampler']]
    while len(output)%4:output.append(0)
    doc['buffers']=[{'byteLength':len(output)}]
    return output


def write_glb(path, doc, binary):
    raw=json.dumps(doc,separators=(',',':')).encode()
    while len(raw)%4:raw+=b' '
    while len(binary)%4:binary.append(0)
    total=28+len(raw)+len(binary)
    path.write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary)


def repair_palm_far(workshop,blender,row):
    """Restore the rooted shaft missing from the previous far palm derivative."""
    base=workshop/'custom-foliage/base';near=base/'palm-fan-near.glb';far=base/'palm-fan-far.glb'
    base.mkdir(parents=True,exist_ok=True)
    for lod,path in (('near',near),('far',far)):
        if not path.exists():
            assert not row.get('preparation',{}).get('customFoliage'), (
                'palm-fan','Missing prepared baseline: rebuild the supplied source using build-meshy-trees.py before adding custom foliage')
            path.write_bytes((REPO/row['runtime'][lod]['path']).read_bytes())
    near_doc,near_binary=load_glb(near);far_doc,far_binary=load_glb(far)
    npart=primitive(near_doc,'Wood');fpart=primitive(far_doc,'Wood')
    np_=values(near_doc,near_binary,npart['attributes']['POSITION']).astype(float)
    fp=values(far_doc,far_binary,fpart['attributes']['POSITION']).astype(float)
    record_path=workshop/'custom-foliage/palm-fan-far-bole-repair.json'
    if fp[:,1].min()<=np_[:,1].min()+.025:
        return json.loads(record_path.read_text()) if record_path.exists() else None
    previous=base/'palm-fan-far-before-bole-repair.glb'
    if not previous.exists():previous.write_bytes(far.read_bytes())
    near_indices=values(near_doc,near_binary,npart['indices']).ravel().reshape(-1,3)
    faces,component=structural_wood_faces(np_,near_indices,'palm-fan')
    script=workshop/'custom-foliage/reduce-palm-grounded-bole.py'
    stem_path=workshop/'custom-foliage/palm-fan-far-grounded-bole.glb'
    script.write_text('''import bpy,bmesh,json,pathlib
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='''+repr(str(near))+''',merge_vertices=False)
wood=next(o for o in bpy.context.scene.objects if o.name=='Wood')
keep=set(json.loads('''+repr(json.dumps(faces.tolist()))+'''))
bm=bmesh.new();bm.from_mesh(wood.data);bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[f for i,f in enumerate(bm.faces) if i not in keep],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bm.to_mesh(wood.data);bm.free();wood.data.update()
bpy.ops.object.select_all(action='DESELECT');wood.select_set(True);bpy.context.view_layer.objects.active=wood
dec=wood.modifiers.new('Rooted far source bole silhouette','DECIMATE');dec.ratio=.145;dec.use_collapse_triangulate=True
bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.export_scene.gltf(filepath='''+repr(str(stem_path))+''',export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_materials='EXPORT',export_image_format='AUTO',export_texcoords=True,export_normals=True,export_tangents=False,export_extras=False)
''')
    subprocess.run([str(blender),'--background','--python',str(script)],check=True)
    stem_doc,stem_binary=load_glb(stem_path);stem=primitive(stem_doc,'Wood')
    stem_positions=values(stem_doc,stem_binary,stem['attributes']['POSITION'])
    assert abs(float(stem_positions[:,1].min())-float(np_[:,1].min()))<.025,'Root plane must survive source bole reduction'
    source_vertices=len(fp);old_indices=values(far_doc,far_binary,fpart['indices']).ravel().reshape(-1,3)
    stem_indices=values(stem_doc,stem_binary,stem['indices']).ravel().reshape(-1,3)
    before_hash=logical_hash(far_doc,far_binary,fpart)
    for name,index in list(fpart['attributes'].items()):
        original=values(far_doc,far_binary,index);addition=values(stem_doc,stem_binary,stem['attributes'][name])
        combined=np.concatenate((original,addition)).astype('<f4')
        fpart['attributes'][name]=append_accessor(far_doc,far_binary,combined,'VEC'+str(combined.shape[1]),bounds=name=='POSITION')
    fpart['indices']=append_accessor(far_doc,far_binary,np.concatenate((old_indices,stem_indices+source_vertices)).reshape(-1,1),'SCALAR',5125)
    far_binary=compact(far_doc,far_binary);write_glb(far,far_doc,far_binary)
    record={'asset':'palm-fan','lod':'far','reason':'Previous prepared far Wood retained only upper crown fragments (minimum Y 6.643 m), losing the visible rooted shaft. Append a reduced actual near ground-connected bole to restore tree continuity.',
            'sourceNearBaselineSha256':hashlib.sha256(near.read_bytes()).hexdigest(),
            'originalFarBaselineSha256':hashlib.sha256(previous.read_bytes()).hexdigest(),
            'repairedFarBaselineSha256':hashlib.sha256(far.read_bytes()).hexdigest(),
            'woodGeometrySha256Before':before_hash,'woodGeometrySha256After':logical_hash(far_doc,far_binary,primitive(far_doc,'Wood')),
            'originalWoodTriangles':len(old_indices),'addedSourceBoleTriangles':len(stem_indices),
            'sourceWoodMinimumY':float(np_[:,1].min()),'beforeWoodMinimumY':float(fp[:,1].min()),
            'afterWoodMinimumY':float(stem_positions[:,1].min()),'nearComponent':component,
            'preparation':'Blender silhouette collapse of only actual root-connected near Wood faces; source UV paint/material preserved. Original far upper Wood prefix remains unchanged; all other tree Wood remains exact.'}
    record_path.write_text(json.dumps(record,indent=2)+'\n')
    print('PALM_FAR_BOLE_REPAIR '+json.dumps({'addedTriangles':len(stem_indices),'restoredRootY':float(stem_positions[:,1].min())}),flush=True)
    return record


def repair_sentinel_bole(workshop,row,lod):
    """Keep the actual near bole when lower-LOD collapse visually severs it."""
    base=workshop/'custom-foliage/base';near=base/'verdant-sentinel-near.glb';far=base/('verdant-sentinel-'+lod+'.glb')
    base.mkdir(parents=True,exist_ok=True)
    for source_lod,path in (('near',near),(lod,far)):
        if not path.exists():
            assert not row.get('preparation',{}).get('customFoliage'), (
                'verdant-sentinel','Missing prepared baseline: rebuild the supplied source using build-meshy-trees.py before adding custom foliage')
            path.write_bytes((REPO/row['runtime'][source_lod]['path']).read_bytes())
    near_doc,near_binary=load_glb(near);far_doc,far_binary=load_glb(far)
    npart=primitive(near_doc,'Wood');fpart=primitive(far_doc,'Wood')
    near_hash=logical_hash(near_doc,near_binary,npart);far_hash=logical_hash(far_doc,far_binary,fpart)
    record_path=workshop/('custom-foliage/verdant-sentinel-'+lod+'-bole-repair.json')
    if near_hash==far_hash:return json.loads(record_path.read_text()) if record_path.exists() else None
    previous=base/('verdant-sentinel-'+lod+'-before-bole-repair.glb')
    if not previous.exists():previous.write_bytes(far.read_bytes())
    old_triangles=len(values(far_doc,far_binary,fpart['indices']))//3
    # Copy logical near attributes exactly; no new wood sculpt or UV projection.
    fpart['attributes']={}
    for name,index in npart['attributes'].items():
        data=values(near_doc,near_binary,index);a=near_doc['accessors'][index]
        fpart['attributes'][name]=append_accessor(far_doc,far_binary,data,a['type'],a['componentType'],bounds=name=='POSITION')
    indices=values(near_doc,near_binary,npart['indices']);a=near_doc['accessors'][npart['indices']]
    fpart['indices']=append_accessor(far_doc,far_binary,indices,'SCALAR',a['componentType'])
    far_binary=compact(far_doc,far_binary);write_glb(far,far_doc,far_binary)
    assert logical_hash(far_doc,far_binary,primitive(far_doc,'Wood'))==near_hash
    record={'asset':'verdant-sentinel','lod':lod,
            'reason':'Native custom-only review exposed a collapsed far hourglass shaft: lower cone met the upper branches at essentially a point. Keep actual near Wood at middle and far distances to preserve the real source bole shape and monotonically decreasing whole-tree detail.',
            'sourceNearBaselineSha256':hashlib.sha256(near.read_bytes()).hexdigest(),
            'originalFarBaselineSha256':hashlib.sha256(previous.read_bytes()).hexdigest(),
            'repairedFarBaselineSha256':hashlib.sha256(far.read_bytes()).hexdigest(),
            'woodGeometrySha256Before':far_hash,'woodGeometrySha256After':near_hash,
            'originalWoodTriangles':old_triangles,'replacementNearWoodTriangles':len(indices)//3,
            'preparation':'Exact near Wood attribute/index copy into the existing lower-LOD Wood primitive, using the same source wood material/UV texture. Original source crown positions/normals/UV/indices remain unchanged.',
            'tradeoff':'Middle and far retain all 13,000 near Wood triangles to preserve an intact shaft. Near/middle/far complete trees remain monotonically decreasing and strictly below 20,000 triangles; this costs additional distant Wood detail.'}
    record_path.write_text(json.dumps(record,indent=2)+'\n')
    print('SENTINEL_BOLE_REPAIR '+json.dumps({'lod':lod,'oldWoodTriangles':old_triangles,'replacementWoodTriangles':len(indices)//3}),flush=True)
    return record


def process(row, workshop, builder):
    key=row['id'];label,style,rgb=PROFILES[key]
    base=workshop/'custom-foliage/base';base.mkdir(parents=True,exist_ok=True)
    data={};sources={}
    for lod,audit in row['runtime'].items():
        path=REPO/audit['path'];backup=base/path.name
        if not backup.exists():
            assert not row.get('preparation',{}).get('customFoliage'), (
                key, 'Missing prepared baseline: rebuild the supplied source using build-meshy-trees.py before adding custom foliage')
            backup.write_bytes(path.read_bytes())
        data[lod]=load_glb(backup);sources[lod]=inspect_source(*data[lod],key)
    near_original=len(sources['near']['li'])+len(sources['near']['wi'])
    # Menu's architecture requires a tighter addition for its elder crown.
    max_add=880 if key=='tree-0208' else 1760
    sprig_count=min(22,max_add//80,(19500-near_original)//80)
    assert sprig_count>=1,(key,near_original)
    sites=attachment_sites(sources,key,sprig_count)
    runtime={}
    cards=bool(row.get('preparation',{}).get('crownCards'))
    for lod,(doc,binary) in data.items():
        source=sources[lod];p=primitive(doc,'Foliage');wood_before=logical_hash(doc,binary,primitive(doc,'Wood'))
        material=doc['materials'][p['material']];pbr=material['pbrMetallicRoughness']
        composite,transform,source_rect,tiles=make_composite(source['image'],cards,style,rgb)
        pbr['baseColorTexture']['index']=add_image(doc,binary,composite,pbr['baseColorTexture']['index'],key+' custom attached leaf atlas')
        for parent,name,kind in ((material,'normalTexture','normal'),(pbr,'metallicRoughnessTexture','roughness'),(material,'occlusionTexture','roughness')):
            if name not in parent:continue
            old_index=parent[name]['index'];image,_=image_for(doc,binary,old_index)
            mapped,_,_,_=make_composite(image,cards,style,rgb,kind)
            parent[name]['index']=add_image(doc,binary,mapped,old_index,key+' matching custom '+kind+' atlas')
        material['alphaMode']='MASK';material['alphaCutoff']=.35;material['doubleSided']=True
        pbr['metallicFactor']=0;pbr['roughnessFactor']=max(.91,pbr.get('roughnessFactor',.95));material.pop('emissiveTexture',None);material['emissiveFactor']=[0,0,0]
        original_attrs={name:values(doc,binary,index) for name,index in p['attributes'].items()}
        positions,normals,uvs,indices,tangents,records=geometry_for_sites(sites,source,lod,key,tiles)
        base_count=len(original_attrs['POSITION']);base_tri=len(source['li'])
        original_attrs['TEXCOORD_0']=original_attrs['TEXCOORD_0']*np.array(transform[:2])+np.array(transform[2:])
        extra={'POSITION':positions,'NORMAL':normals,'TEXCOORD_0':uvs,'TANGENT':tangents}
        for name,original in original_attrs.items():
            assert name in extra,(key,lod,name)
            combined=np.concatenate((original,extra[name])).astype('<f4')
            p['attributes'][name]=append_accessor(doc,binary,combined,'VEC'+str(combined.shape[1]),bounds=name=='POSITION')
        combined_indices=np.concatenate((source['li'],indices+base_count)).astype('<u4').reshape(-1,1)
        p['indices']=append_accessor(doc,binary,combined_indices,'SCALAR',5125)
        for record in records:
            record['triangleStart']+=base_tri
            record['vertexStart']+=base_count
            record['stemRootVertexIndices']=[i+base_count for i in record['stemRootVertexIndices']]
            record['leafBaseVertexIndices']=[i+base_count for i in record['leafBaseVertexIndices']]
        foliage_node=next(n for n in doc['nodes'] if n.get('name')=='Foliage')
        doc['meshes'][foliage_node['mesh']].setdefault('extras',{})['tervainCustomFoliage']={
            'schemaVersion':1,'sourceVertices':base_count,
            'sprigs':[{k:record[k] for k in ('vertexStart','vertexCount','stemRootVertexIndices')} for record in records]}
        binary=compact(doc,binary)
        assert logical_hash(doc,binary,primitive(doc,'Wood'))==wood_before,'Wood changed'
        path=REPO/row['runtime'][lod]['path'];write_glb(path,doc,binary)
        audit=builder.glb_audit(path)
        final_doc,final_binary=load_glb(path)
        for item,im in zip(audit['images'],final_doc['images']):
            view=final_doc['bufferViews'][im['bufferView']]
            image=Image.open(io.BytesIO(final_binary[view['byteOffset']:view['byteOffset']+view['byteLength']]))
            item.update(width=image.width,height=image.height)
        crown_primitive=primitive(final_doc,'Foliage')
        crown_material=final_doc['materials'][crown_primitive['material']]
        texture_index=crown_material['pbrMetallicRoughness']['baseColorTexture']['index']
        audit['customFoliage']={'schemaVersion':1,'style':label,'sprigCount':len(sites),
                               'baselineSha256':hashlib.sha256((base/path.name).read_bytes()).hexdigest(),
                               'sourceTriangles':base_tri,'sourceVertices':base_count,'customTriangles':len(indices),
                               'customIndexStart':base_tri*3,'customIndexCount':len(indices)*3,
                               'woodGeometrySha256Before':wood_before,'woodGeometrySha256After':wood_before,
                               'sourceFoliageUvTransform':transform,'sourceImageRectangle':source_rect,
                               'sourceResampling':'unchanged pixels' if cards else 'nearest upsample to 1536; no downsample',
                               'sourceAtlasEmptyTileFilled':cards,'baseColorImageIndex':final_doc['textures'][texture_index]['source'],
                               'structuralWoodComponent':source['groundedWoodInfo'],
                               'customAtlasTiles':tiles,'sprigs':records,
                               'sourceCompleteBounds':[v.tolist() for v in source['bounds']],
                               'customBounds':[positions.min(axis=0).astype(float).tolist(),positions.max(axis=0).astype(float).tolist()]}
        assert audit['triangles']<=19500,(key,lod,audit['triangles'])
        assert all(np.all(positions>=source['bounds'][0]-1e-6) and np.all(positions<=source['bounds'][1]+1e-6) for _ in (0,))
        runtime[lod]=audit
    row['runtime']=runtime
    row['preparation']['customFoliage']={'schemaVersion':1,'tool':'tools/customize-meshy-foliage.py',
                                        'style':label,'art':'Original procedural alpha-painted cutouts with irregular leaf shape, midrib, secondary veins, granular shade and warm worn edges; individual curved attached blades and fine connected twig tubes.',
                                        'sourcePreservation':'Original Wood attributes and indices remain exact except the documented source-derived palm-fan far bole repair and exact near-Wood copies for the Verdant Sentinel middle/far shafts; original Foliage vertex positions, normals and triangle prefix remain exact. Existing source 63-view atlas pixels/UVs stay untouched, or source 1k maps are nearest-upsampled with matching UV/normal-map remap.',
                                        'attachment':'Upper bark faces of the ground-connected structural Wood component, with spatially equal UV seam vertices welded only for analysis. Each LOD root projects onto that LOD connected bole/branches within 0.5 m of the shared near root; each leaf starts on its actual polygonal connected twig. Crown target is an alpha-visible source triangle centroid, or a short outward aim when that point already touches Wood. Reserved tree-1459 retains its documented detached low soil face, so its structural bole root plane is recorded separately and it remains unassigned.',
                                        'bounds':'Every custom position stays within that LOD original complete bounds, preserving source height and uniform world scaling.',
                                        'motion':'Static attached custom sprigs; existing detached-leaf/menu-only motion rules remain.',
                                        'baselineDirectory':'custom-foliage/base','protectedPine':'Untouched; no custom postprocess on the explicit exempt Pine.'}
    (workshop/(key+'-receipt.json')).write_text(json.dumps(row,indent=2)+'\n')
    print('CUSTOM_FOLIAGE '+json.dumps({'id':key,'sprigs':len(sites),'style':label,'triangles':{k:v['triangles'] for k,v in runtime.items()},'foliage':{k:next(p['triangles'] for p in v['parts'] if p['name']=='Foliage') for k,v in runtime.items()}}),flush=True)
    return row


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--workshop',type=pathlib.Path,default=DEFAULT_WORKSHOP)
    parser.add_argument('--ids',nargs='*');parser.add_argument('--sentinel-receipt',type=pathlib.Path)
    parser.add_argument('--render-review',action='store_true',help='Render all prepared near trees, backs and actual custom-only leaf closeups in installed Blender without writing GLBs')
    parser.add_argument('--blender',type=pathlib.Path,default=pathlib.Path('/Applications/Blender.app/Contents/MacOS/Blender'))
    args=parser.parse_args()
    manifest_path=REPO/'docs/engineering/meshy-tree-assets.json';manifest=json.loads(manifest_path.read_text())
    if args.render_review:
        render_review(args,manifest)
        return
    if args.sentinel_receipt:
        sentinel=json.loads(args.sentinel_receipt.read_text())
        if not any(a['id']==sentinel['id'] for a in manifest['assets']):manifest['assets'].append(sentinel)
    spec=importlib.util.spec_from_file_location('tree_builder',REPO/'tools/build-meshy-trees.py')
    builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
    if not args.ids or 'palm-fan' in args.ids:
        row=next(row for row in manifest['assets'] if row['id']=='palm-fan')
        repair=repair_palm_far(args.workshop,args.blender,row)
        if repair:
            row['preparation']['sourceDerivedFarBoleRepair']=repair
    if (not args.ids or 'verdant-sentinel' in args.ids) and any(row['id']=='verdant-sentinel' for row in manifest['assets']):
        row=next(row for row in manifest['assets'] if row['id']=='verdant-sentinel')
        for lod,label in (('mid','Mid'),('far','Far')):
            repair=repair_sentinel_bole(args.workshop,row,lod)
            if repair:row['preparation']['sourceDerived'+label+'BoleRepair']=repair
    for i,row in enumerate(manifest['assets']):
        if args.ids and row['id'] not in args.ids:continue
        manifest['assets'][i]=process(row,args.workshop,builder)
    count=len(manifest['assets']);lod_count=sum(len(row['runtime']) for row in manifest['assets'])
    manifest['provenance']['source']=f'{count} Meshy GLBs supplied directly by the owner on 5 October 2026; originals read-only in Downloads'
    custom_provenance=' Original species-tailored alpha-painted curved leaf/needle/frond sprigs on real Wood anchors; see each actual-file customFoliage receipt.'
    if custom_provenance not in manifest['provenance']['derivatives']:manifest['provenance']['derivatives']+=custom_provenance
    manifest['verification']['deliveredScenes']=f'{lod_count} GLBs independently counted by named scene mesh instances; each strictly below 20,000 triangles'
    manifest['verification']['customFoliage']='Original custom sprigs on every supplied prepared tree, all LODs; original source/Pine/wood hashes and real alpha-visible attachment audits recorded separately.'
    for pine in manifest['protectedPine']:
        assert hashlib.sha256((REPO/pine['path']).read_bytes()).hexdigest()==pine['sha256']
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')


def render_review(args,manifest):
    output=args.workshop/'custom-foliage/review';output.mkdir(parents=True,exist_ok=True)
    rows=[r for r in manifest['assets'] if not args.ids or r['id'] in args.ids]
    script=output/'render-prepared-review.py'
    script.write_text('''import bpy, bmesh, math, json, pathlib
from mathutils import Vector
REPO=pathlib.Path('''+repr(str(REPO))+''')
OUT=pathlib.Path('''+repr(str(output))+''')
ROWS=json.loads('''+repr(json.dumps(rows))+''')
def scene_for(row,custom_only=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(REPO/row['runtime']['near']['path']),merge_vertices=False)
    if custom_only:
        leaf=next(o for o in bpy.context.scene.objects if o.name=='Foliage')
        bm=bmesh.new();bm.from_mesh(leaf.data);bm.faces.ensure_lookup_table()
        source_count=row['runtime']['near']['customFoliage']['sourceTriangles']
        bmesh.ops.delete(bm,geom=list(bm.faces)[:source_count],context='FACES')
        bm.to_mesh(leaf.data);bm.free();leaf.data.update()
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=600;scene.render.resolution_y=760;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.world=bpy.data.worlds.new('Original foliage review backdrop');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.085,.10,.12,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
    scene.view_settings.view_transform='AgX'
    for loc,power,size in [((-10,-12,18),2100,10),((9,4,14),1800,8),((-2,8,5),950,7)]:
        data=bpy.data.lights.new('Foliage study softbox','AREA');data.energy=power;data.shape='DISK';data.size=size
        light=bpy.data.objects.new('Foliage study softbox',data);scene.collection.objects.link(light);light.location=loc
        light.rotation_euler=(Vector((0,0,6))-light.location).to_track_quat('-Z','Y').to_euler()
    camdata=bpy.data.cameras.new('Tree review');cam=bpy.data.objects.new('Tree review',camdata);scene.collection.objects.link(cam);scene.camera=cam
    camdata.type='ORTHO';camdata.ortho_scale=15.5
    return scene,cam
def view(scene,cam,target,yaw,centre=(0,0,6),scale=15.5):
    centre=Vector(centre);cam.location=centre+Vector((20*math.sin(yaw),-20*math.cos(yaw),4))
    cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    scene.render.filepath=str(target);bpy.ops.render.render(write_still=True)
for row in ROWS:
    key=row['id'];scene,cam=scene_for(row)
    view(scene,cam,OUT/(key+'-front.png'),.7)
    view(scene,cam,OUT/(key+'-back.png'),.7+math.pi)
    scene,cam=scene_for(row,True)
    detail=row['runtime']['near']['customFoliage'];sprig=detail['sprigs'][len(detail['sprigs'])//2]
    # Coordinates are glTF Y-up; Blender's glTF import converts back to Z-up.
    root=sprig['anchor'];leaf=sprig['leafBases'][-2];centre=((root[0]+leaf[0])/2,-(root[2]+leaf[2])/2,(root[1]+leaf[1])/2)
    view(scene,cam,OUT/(key+'-custom-close.png'),.7,centre,2.6)
    print('CUSTOM_REVIEW '+key,flush=True)
''')
    subprocess.run([str(args.blender),'--background','--python',str(script)],check=True)
    # Small contact sheets are review evidence, not replacement in-game art.
    for kind in ('front','back','custom-close'):
        width,height=320,440;sheet=Image.new('RGB',(width*5,height*math.ceil(len(rows)/5)),(20,24,29));draw=ImageDraw.Draw(sheet)
        for index,row in enumerate(rows):
            picture=Image.open(output/(row['id']+'-'+kind+'.png')).convert('RGB');picture.thumbnail((width,height-36))
            x=index%5*width;y=index//5*height;sheet.paste(picture,(x+(width-picture.width)//2,y))
            count=row['runtime']['near']['triangles'];draw.text((x+8,y+height-31),row['id']+' | '+str(count)+' triangles',fill=(228,223,196))
            draw.text((x+8,y+height-17),row['preparation']['customFoliage']['style'],fill=(164,186,161))
        sheet.save(output/('all-trees-'+kind+'.jpg'),quality=91)


if __name__=='__main__':main()
