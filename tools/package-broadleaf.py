#!/usr/bin/env python3
"""Package the reviewed 18,719-triangle native volume and 300 tiny leaf quads.

Run after prepare-broadleaf.py and prepare-broadleaf-fringe.py. Core positions,
normals and UVs are unchanged by packaging; every reviewed core triangle is
retained exactly once. Source-projected alpha detail adds a restrained fringe,
not large billboards. Native model/lighting acceptance remains a separate step.
"""
import argparse, hashlib, io, json, math, pathlib, random, struct
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]

def read(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
    length = struct.unpack_from('<I', raw, 12)[0]
    return raw, json.loads(raw[20:20+length]), raw[28+length:]

def sub(a, b): return tuple(x-y for x, y in zip(a, b))
def dot(a, b): return sum(x*y for x, y in zip(a, b))
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def unit(a):
    length = math.sqrt(dot(a, a))
    return tuple(x/max(length, 1e-12) for x in a)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=pathlib.Path, required=True)
    parser.add_argument('--workshop', type=pathlib.Path, default=ROOT/'out/guardian-volume')
    parser.add_argument('--fringe-workshop', type=pathlib.Path, default=ROOT/'out/ancient-guardian-workshop')
    parser.add_argument('--output', type=pathlib.Path, default=ROOT/'public/models/scenery/ancient-guardian-broadleaf-under-20k.glb')
    parser.add_argument('--receipt', type=pathlib.Path, default=ROOT/'docs/engineering/broadleaf-assets.json')
    args = parser.parse_args()
    original, source, _ = read(args.source)
    assert hashlib.sha256(original).hexdigest() == '53b103d7cbaa7ddedfe9cdbd2a5fae45d0caf82ad8ee2a8c3087fae9c6b3198d', 'Unexpected owner source'
    core_raw, core, binary = read(args.workshop/'guardian-volume.glb')
    primitive = core['meshes'][0]['primitives'][0]
    def decode(index):
        a = core['accessors'][index]; view = core['bufferViews'][a['bufferView']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        fmt = {5126: 'f', 5125: 'I', 5123: 'H'}[a['componentType']]
        stride = view.get('byteStride', struct.calcsize('<'+fmt*width))
        start = view.get('byteOffset', 0)+a.get('byteOffset', 0)
        return [struct.unpack_from('<'+fmt*width, binary, start+i*stride) for i in range(a['count'])]
    positions = decode(primitive['attributes']['POSITION']); normals = decode(primitive['attributes']['NORMAL'])
    uv = decode(primitive['attributes']['TEXCOORD_0']); indices = [row[0] for row in decode(primitive['indices'])]
    assert len(indices)//3 == 18_719, 'Reviewed volume changed; inspect natively before packaging'
    paint = Image.open(args.workshop/'volume-paint.png').convert('RGB')
    wood, crown, exterior = [], [], []
    for offset in range(0, len(indices), 3):
        tri = indices[offset:offset+3]
        center = tuple(sum(positions[j][axis] for j in tri)/3 for axis in range(3))
        tu, tv = (sum(uv[j][axis] for j in tri)/3 for axis in range(2))
        r, g, b = paint.getpixel((min(paint.width-1, max(0, int(tu*paint.width))), min(paint.height-1, max(0, int((1-tv)*paint.height)))))
        leafy = center[1] > -.15 and g > r*1.12 and g > b*1.15
        (crown if leafy else wood).extend(tri)
        if leafy:
            normal = unit(tuple(sum(normals[j][axis] for j in tri)/3 for axis in range(3)))
            outward = unit((center[0], (center[1]-.38)*.7, center[2]))
            if center[1] > .03 and dot(normal, outward) > .28:
                exterior.append((center, normal))
    assert len(wood)+len(crown) == len(indices) and wood and crown
    rng = random.Random(412_19319); rng.shuffle(exterior)
    cells, selected = set(), []
    for center, normal in exterior:
        cell = tuple(math.floor(value/.065) for value in center)
        if cell in cells: continue
        cells.add(cell); selected.append((center, normal))
        if len(selected) == 300: break
    assert len(selected) == 300, 'Too few distinct exterior fringe sites'
    atlas = Image.open(args.fringe_workshop/'crown.png').convert('RGBA')
    records = json.loads((args.fringe_workshop/'crown-records.json').read_text())
    atlas_side = atlas.width//128
    valid_tiles = []
    for record in records:
        tile = record['tile']; tx, ty = tile % atlas_side, tile//atlas_side
        crop = atlas.crop((tx*128, atlas.height-(ty+1)*128, (tx+1)*128, atlas.height-ty*128))
        # A native source patch with visible painted leaves, not an empty gutter.
        if sum(value > 128 for value in crop.getchannel('A').getdata()) > 1800: valid_tiles.append(tile)
    assert valid_tiles
    fringe_p, fringe_n, fringe_uv, fringe_i = [], [], [], []
    for center, normal in selected:
        tangent = unit(cross(normal, (0, 1, 0) if abs(normal[1]) < .9 else (1, 0, 0)))
        bitangent = unit(cross(normal, tangent)); angle = rng.random()*math.tau
        u = tuple(tangent[k]*math.cos(angle)+bitangent[k]*math.sin(angle) for k in range(3))
        v = unit(cross(normal, u)); width = rng.uniform(.045, .07); height = rng.uniform(.035, .06)
        tile = valid_tiles[rng.randrange(len(valid_tiles))]; tx, ty = tile % atlas_side, tile//atlas_side
        base = len(fringe_p)
        for su, sv in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            fringe_p.append(tuple(center[k]+normal[k]*.009+u[k]*su*width/2+v[k]*sv*height/2 for k in range(3)))
            # Shared source-volume normals prevent a bright planar fringe seam.
            fringe_n.append(normal)
            fringe_uv.append(((tx+.025+(su+1)*.5*.95)/atlas_side, (ty+.025+(sv+1)*.5*.95)/atlas_side))
        fringe_i.extend((base, base+1, base+2, base, base+2, base+3))
    blocks, views, accessors, offset = [], [], [], 0
    def append(data, target=None):
        nonlocal offset
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
        if target: view['target'] = target
        views.append(view); blocks.append(data+bytes((-len(data))%4)); offset += len(blocks[-1]); return len(views)-1
    def attribute(values, dimensions, indexed=False):
        flattened = [value for row in values for value in row]
        view = append(struct.pack('<'+('I' if indexed else 'f')*len(flattened), *flattened), 34963 if indexed else 34962)
        a = {'bufferView': view, 'componentType': 5125 if indexed else 5126, 'count': len(values), 'type': {1:'SCALAR',2:'VEC2',3:'VEC3'}[dimensions]}
        if dimensions == 3 and not indexed:
            a['min'] = [min(row[k] for row in values) for k in range(3)]; a['max'] = [max(row[k] for row in values) for k in range(3)]
        accessors.append(a); return len(accessors)-1
    core_attributes = {'POSITION': attribute(positions, 3), 'NORMAL': attribute(normals, 3), 'TEXCOORD_0': attribute(uv, 2)}
    meshes, nodes = [], []
    sites = [list(center) for center, _ in selected]
    for name, tris, material in [('Guardian woody volume', wood, 0), ('Guardian crown volume', crown, 1)]:
        meshes.append({'name': name, 'primitives': [{'attributes': core_attributes, 'indices': attribute([(i,) for i in tris], 1, True), 'material': material}]})
        nodes.append({'name': name, 'mesh': len(meshes)-1, **({'extras': {'canopySites': sites}} if material == 1 else {})})
    meshes.append({'name': 'Guardian small leaf fringe', 'primitives': [{'attributes': {'POSITION': attribute(fringe_p, 3), 'NORMAL': attribute(fringe_n, 3), 'TEXCOORD_0': attribute(fringe_uv, 2)}, 'indices': attribute([(i,) for i in fringe_i], 1, True), 'material': 2}]})
    nodes.append({'name': 'Guardian small leaf fringe', 'mesh': 2})
    images, maps = [], []
    def image(name, bitmap, kind):
        encoded = io.BytesIO(); bitmap.save(encoded, format=kind, **({'quality': 95, 'subsampling': 0} if kind == 'JPEG' else {'optimize': True}))
        data = encoded.getvalue(); images.append({'name': name, 'bufferView': append(data), 'mimeType': 'image/jpeg' if kind == 'JPEG' else 'image/png'})
        maps.append({'name': name, 'width': bitmap.width, 'height': bitmap.height, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}); return len(images)-1
    paint_index = image('Source projected whole-volume paint', paint, 'JPEG')
    normal_bitmap = Image.open(args.workshop/'volume-normal.png').convert('RGB').resize((1536,1536), Image.Resampling.LANCZOS)
    pixels = bytearray(normal_bitmap.tobytes())
    for i in range(0, len(pixels), 3):
        n = tuple(pixels[i+k]/127.5-1 for k in range(3)); n = unit(n) if dot(n,n) > .01 and n[2] > -.75 else (0,0,1)
        for k in range(3): pixels[i+k] = round((n[k]+1)*127.5)
    normal_index = image('Source projected sculpt normal', Image.frombytes('RGB', normal_bitmap.size, bytes(pixels)), 'PNG')
    fringe_index = image('Native source-alpha small leaf fringe', atlas.resize((2048,2048), Image.Resampling.LANCZOS), 'PNG')
    core_material = {'doubleSided': True, 'normalTexture': {'index': normal_index, 'scale': .7}, 'pbrMetallicRoughness': {'baseColorTexture': {'index': paint_index}, 'metallicFactor': 0, 'roughnessFactor': .92}}
    materials = [{**core_material, 'name': 'Source bark and branch volume'}, {**core_material, 'name': 'Source crown volume', 'alphaMode': 'MASK', 'alphaCutoff': .001}, {'name': 'Source-alpha tiny leaf fringe', 'doubleSided': True, 'alphaMode': 'MASK', 'alphaCutoff': .25, 'pbrMetallicRoughness': {'baseColorTexture': {'index': fringe_index}, 'metallicFactor': 0, 'roughnessFactor': .92}}]
    document = {'asset': {'version': '2.0', 'generator': 'Tervain / native source-volume projection and tiny source-alpha fringe'}, 'scene': 0, 'scenes': [{'nodes': [0,1,2]}], 'nodes': nodes, 'meshes': meshes, 'accessors': accessors, 'materials': materials, 'images': images, 'textures': [{'sampler':0,'source':i} for i in range(3)], 'samplers': [{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}], 'bufferViews': views, 'buffers': [{'byteLength': offset}]}
    text = json.dumps(document, separators=(',', ':')).encode(); text += b' '*((-len(text))%4); bin_data = b''.join(blocks)
    final = struct.pack('<III',0x46546c67,2,28+len(text)+len(bin_data))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(bin_data),0x004e4942)+bin_data
    args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_bytes(final)
    source_count = sum(source['accessors'][p['indices']]['count']//3 for m in source['meshes'] for p in m['primitives'])
    count = len(indices)//3+len(fringe_i)//3; assert count == 19_319 and count < 20_000
    receipt = {'source': {'filename': args.source.name, 'sha256': hashlib.sha256(original).hexdigest(), 'bytes': len(original), 'triangles': source_count, 'bounds': source['accessors'][0]['min']+source['accessors'][0]['max']}, 'runtime': {'path': str(args.output.relative_to(ROOT)), 'sha256': hashlib.sha256(final).hexdigest(), 'bytes': len(final), 'triangles': count, 'meshes': [{'name': mesh['name'], 'triangles': accessors[mesh['primitives'][0]['indices']]['count']//3} for mesh in meshes], 'maps': maps}, 'method': {'tool': 'Blender 5.2.0 LTS / native CPU Cycles source-paint and normal projection; Pillow texture encoding', 'geometry': 'Reviewed isotropic 0.016 source-unit crown/trunk/root volume union, 19k collapse target and new UV projection: 18,719 real core triangles. Packaging retains each core triangle and exact reviewed positions/normals/UVs once; 300 small exterior leaf quads add 600 triangles. This is source-derived retopology, not unchanged original topology or UVs.', 'texture': '2048 source-projected paint, 1536 normalized sculpt normals and 2048 native source-alpha fringe atlas. No generated art, emissive stone/tree paint or fabricated leaf normals.', 'fringe': {'quads': 300, 'triangles': 600, 'widthSourceUnits': [.045,.07], 'heightSourceUnits': [.035,.06], 'placement': 'Deterministic spaced exterior crown surfaces; normals shared with the reviewed volume; static attached foliage.'}, 'transforms': 'Uniform instance scale, yaw and whole-base terrain-facet grounding only.'}, 'authorization': 'Owner-supplied Meshy tree selected for Tervain integration and under-20k optimization. No general open asset licence is asserted.', 'verification': 'Binary, whole-model triangle and source-map checks accompany runtime grounding/ownership tests. Native GPU and final scene acceptance remain separate; no frame-rate or hardware-capacity claim.'}
    args.receipt.write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps({'triangles': count, 'bytes': len(final), 'parts': receipt['runtime']['meshes'], 'output': str(args.output)}))

if __name__ == '__main__': main()
