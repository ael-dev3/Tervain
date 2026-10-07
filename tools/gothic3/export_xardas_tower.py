# SPDX-License-Identifier: GPL-3.0-only
"""Export the source-placed Xardas Tower mesh for browser streaming.

The node, mesh, material and image are supplied as extracted files from the
read-only Gothic 3 installation. The node and both low/high-detail meshes are
checked against the committed world indexes before any browser asset is written.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import sys

from read_genome import read_entities
from read_xcmsh import mesh_bounds, read_mesh
from read_xshmat import read_material
from terrain_formats import geometry_glb, json_bytes, ximg_png


REPO = Path(__file__).resolve().parents[2]
WORLD = REPO / 'public' / 'gothic3' / 'world'
OUT = WORLD / 'landmarks'
NODE_ID = ('G3_World_01/World/_Level/G3_World_Lowpoly_01_Levelmesh_01/'
           'G3_World_Lowpoly_01_Levelmesh_01_Spat.node')
LOW_MESH_ID = ('_compiledmesh :: G3_World_Lowpoly_Static_Objects_Nordmar_01/'
               'G3_Nordmar_Xardas_Tower_01_LOWPOLY.xcmsh')
HIGH_MESH_ID = ('_compiledmesh :: G3_Nordmar_Landscape_Locations_01/'
                'G3_Nordmar_Xardas_Tower_01.xcmsh')
ENTITY_INDEX = 2691
ENTITY_GUID = '4b4e4c81142628488b323869c42f0ea800000000'
EXPECTED_STREAMS = {0, 1, 3, 4, 5, 12, 64, 73}
SUPPORTED_STREAMS = EXPECTED_STREAMS - {73}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def indexed_file(index, resource_id):
    matches = [entry for entry in index['files'] if entry['id'].casefold() == resource_id.casefold()]
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one indexed source: {resource_id}')
    return matches[0]


def mesh_resource(index, resource_id):
    matches = [entry for entry in index['resources'] if entry['id'].casefold() == resource_id.casefold()]
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one indexed mesh: {resource_id}')
    return matches[0]


def read_checked(path, source, label):
    data = path.read_bytes()
    expected = source['source']['sha256']
    if len(data) != source['bytes'] or sha(data) != expected:
        raise ValueError(f'{label} differs from its committed source receipt')
    return data


def unique_named(root, filename, label):
    matches = list(root.rglob(filename))
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one {label} named {filename}, found {len(matches)}')
    return matches[0]


def with_embedded_diffuses(glb, diffuse_sources):
    magic, version, total = struct.unpack_from('<III', glb)
    if magic != 0x46546c67 or version != 2 or total != len(glb):
        raise ValueError('Geometry converter returned an invalid GLB')
    json_length, json_type = struct.unpack_from('<II', glb, 12)
    if json_type != 0x4e4f534a:
        raise ValueError('GLB JSON chunk is missing')
    json_start = 20
    json_end = json_start + json_length
    document = json.loads(glb[json_start:json_end].decode('utf-8'))
    binary_header = json_end
    binary_length, binary_type = struct.unpack_from('<II', glb, binary_header)
    if binary_type != 0x004e4942 or binary_header + 8 + binary_length != len(glb):
        raise ValueError('GLB binary chunk is missing or malformed')
    binary = bytearray(glb[binary_header + 8:])
    images = []
    textures = []
    material_texture_indices = []
    texture_by_sha = {}
    for item in diffuse_sources:
        key = item['source']['sha256']
        texture_index = texture_by_sha.get(key)
        if texture_index is None:
            binary.extend(b'\0' * (-len(binary) % 4))
            image_offset = len(binary)
            binary.extend(item['png'])
            image_view = len(document['bufferViews'])
            document['bufferViews'].append({'buffer': 0, 'byteOffset': image_offset,
                                            'byteLength': len(item['png'])})
            image_index = len(images)
            images.append({'bufferView': image_view, 'mimeType': 'image/png',
                           'name': PurePosixPath(item['source']['path']).stem})
            texture_index = len(textures)
            textures.append({'sampler': 0, 'source': image_index})
            texture_by_sha[key] = texture_index
        material_texture_indices.append(texture_index)
    document['images'] = images
    document['samplers'] = [{'magFilter': 9729, 'minFilter': 9987,
                             'wrapS': 10497, 'wrapT': 10497}]
    document['textures'] = textures
    if len(document['materials']) != len(diffuse_sources):
        raise ValueError('GLB material count differs from source XSHMAT assignments')
    for material, item, texture_index in zip(document['materials'], diffuse_sources,
                                             material_texture_indices, strict=True):
        material['pbrMetallicRoughness']['baseColorTexture'] = {'index': texture_index}
        material['alphaMode'] = 'OPAQUE'
        material['doubleSided'] = True
        material['extras'].update({
            'nativeGraphRequired': True,
            'appearance': 'First native diffuse sampler; browser PBR lighting approximation.',
            'sourceMaterial': item['materialSource'],
            'sourceImage': item['source'],
            'nativeMaterialSamplers': item['samplers'],
        })
    document['buffers'][0]['byteLength'] = len(binary)
    document['asset']['generator'] = 'Tervain source-verified Gothic 3 static-object converter'
    document['extras']['materialFidelity'] = (
        'First native diffuse sampler pixels per material; original blend graphs, normal/specular '
        'shading, illumination and lightmaps are not ported.')
    json_chunk = json_bytes(document)
    json_chunk += b' ' * (-len(json_chunk) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    header = struct.pack('<III', 0x46546c67, 2, 28 + len(json_chunk) + len(binary))
    return (header + struct.pack('<II', len(json_chunk), 0x4e4f534a) + json_chunk +
            struct.pack('<II', len(binary), 0x004e4942) + binary)


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, required=True)
    parser.add_argument('--low-mesh', type=Path, required=True,
                        help='The source-placed low-poly .xcmsh referenced by the world node.')
    parser.add_argument('--mesh', type=Path, required=True,
                        help='Full-detail .xcmsh selected from the source low-poly family name.')
    parser.add_argument('--material-root', type=Path, required=True,
                        help='Directory containing extracted effective .xshmat files.')
    parser.add_argument('--image-root', type=Path, required=True,
                        help='Directory containing extracted effective .ximg files.')
    args = parser.parse_args()

    world_files = json.loads((WORLD / 'world-files.json').read_text(encoding='utf-8'))
    mesh_resources = json.loads((WORLD / 'mesh-resources.json').read_text(encoding='utf-8'))
    world_index = json.loads((WORLD / 'index.json').read_text(encoding='utf-8'))
    node_source = indexed_file(world_files, NODE_ID)
    low_mesh_source = mesh_resource(mesh_resources, LOW_MESH_ID)
    high_mesh_source = mesh_resource(mesh_resources, HIGH_MESH_ID)
    read_checked(args.node, node_source, 'World node')
    read_checked(args.low_mesh, low_mesh_source, 'Placed low-poly Xardas Tower mesh')
    read_checked(args.mesh, high_mesh_source, 'Full-detail Xardas Tower mesh')
    low_mesh_name = PurePosixPath(LOW_MESH_ID.split(' :: ', 1)[1]).name
    high_mesh_name = PurePosixPath(HIGH_MESH_ID.split(' :: ', 1)[1]).name
    if high_mesh_name != low_mesh_name.replace('_LOWPOLY', ''):
        raise ValueError('Full-detail mesh is not the indexed low-poly family replacement')

    entity = read_entities(args.node)['entities'][ENTITY_INDEX]
    if entity['guid'] != ENTITY_GUID:
        raise ValueError('The source entity index resolves to a different GUID')
    visual = next((cls for cls in entity['classes'] if cls['name'] == 'eCVisualMeshStatic_PS'), None)
    if visual is None:
        raise ValueError('The source tower placement has no static mesh property set')
    properties = {prop['name']: prop for prop in visual['properties']}
    if properties.get('ResourceFileName', {}).get('value') != low_mesh_name:
        raise ValueError('The source placement does not reference the indexed low-poly tower family')
    matrix = entity['worldMatrix']
    identity = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0]
    if matrix[:12] != identity or matrix[15] != 1.0:
        raise ValueError('This exporter only admits the source-verified identity tower transform')

    sections = read_mesh(args.mesh)
    if not sections or any(set(section['streams']) != EXPECTED_STREAMS for section in sections):
        raise ValueError('The full-detail mesh has unexpected or unsupported source streams')
    ignored_streams = sorted(EXPECTED_STREAMS - SUPPORTED_STREAMS)
    render_sections = [{**section, 'streams': {key: value for key, value in section['streams'].items()
                                               if key in SUPPORTED_STREAMS}}
                       for section in sections]
    material_sources = []
    diffuse_sources = []
    material_ids = []
    for section in sections:
        material_name = section['material']
        material_path = unique_named(args.material_root, material_name, 'source material')
        material = read_material(material_path)
        shader = material.get('shader') or {}
        if shader.get('class') != 'eCShaderDefault' or shader.get('blendMode') != 0:
            raise ValueError(f'Unexpected native shader/blend mode for {material_name}')
        diffuse = next((sampler for sampler in material['samplers']
                       if 'diffuse' in sampler['image'].casefold()), None)
        if diffuse is None:
            raise ValueError(f'No diffuse sampler is present in {material_name}')
        image_name = PurePosixPath(diffuse['image'].replace('\\', '/')).stem + '.ximg'
        image_path = unique_named(args.image_root, image_name, 'source diffuse image')
        material_bytes = material_path.read_bytes()
        image_bytes = image_path.read_bytes()
        png, pixels, image_info = ximg_png(image_bytes)
        material_source = {'archive': '_compiledMaterial.pak', 'path': material_path.name,
                           'sha256': sha(material_bytes), 'bytes': len(material_bytes)}
        image_source = {'archive': '_compiledImage.pak',
                        'path': image_path.relative_to(args.image_root).as_posix(),
                        'sha256': sha(image_bytes), 'bytes': len(image_bytes)}
        material_sources.append({'id': material_name, 'source': material_source,
                                 'selectedDiffuseSampler': diffuse, 'otherNativeSamplers': [
                                     sampler for sampler in material['samplers'] if sampler is not diffuse]})
        diffuse_sources.append({'png': png, 'pixels': len(pixels), 'source': image_source,
                                'materialSource': material_source, 'samplers': material['samplers'],
                                'imageInfo': image_info})
        material_ids.append('compiledMaterial :: ' + material_name)

    glb, statistics = geometry_glb(render_sections, 'Xardas Tower', material_ids)
    glb = with_embedded_diffuses(glb, diffuse_sources)
    origin = world_index['coordinates']['ardeaSceneOriginNative']
    native_position = matrix[12:15]
    position = [(native_position[0] - origin[0]) / 100,
                (native_position[1] - origin[1]) / 100,
                -(native_position[2] - origin[2]) / 100]
    native_min, native_max = mesh_bounds(sections)
    translated_min = [native_min[i] + native_position[i] for i in range(3)]
    translated_max = [native_max[i] + native_position[i] for i in range(3)]
    bounds = {
        'min': [(translated_min[0] - origin[0]) / 100,
                (translated_min[1] - origin[1]) / 100,
                -(translated_max[2] - origin[2]) / 100],
        'max': [(translated_max[0] - origin[0]) / 100,
                (translated_max[1] - origin[1]) / 100,
                -(translated_min[2] - origin[2]) / 100],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    geometry_name = 'xardas-tower.' + sha(glb)[:12] + '.glb'
    geometry_path = OUT / geometry_name
    geometry_path.write_bytes(glb)
    geometry_ref = {'url': 'landmarks/' + geometry_name, 'bytes': len(glb), 'sha256': sha(glb),
                    **statistics, 'materials': len(material_sources),
                    'diffuseImages': [source['imageInfo'] for source in diffuse_sources]}
    source_record = {
        'node': {'archive': node_source['source']['archive'], 'path': node_source['id'],
                 'sha256': node_source['source']['sha256'], 'bytes': node_source['bytes'],
                 'entityIndex': ENTITY_INDEX, 'entityGuid': entity['guid'],
                 'entityMatrixNative': matrix},
        'placedLowPolyMesh': {'archive': low_mesh_source['source']['archive'],
                              'path': low_mesh_source['source']['path'],
                              'sha256': low_mesh_source['source']['sha256'],
                              'bytes': low_mesh_source['bytes']},
        'selectedFullDetailMesh': {'archive': high_mesh_source['source']['archive'],
                                   'path': high_mesh_source['source']['path'],
                                   'sha256': high_mesh_source['source']['sha256'],
                                   'bytes': high_mesh_source['bytes']},
        'materials': material_sources,
        'ignoredVertexStreams': [{'id': stream, 'bytesPerVertex': section['streams'][stream]['stride'],
                                  'meaning': 'Not interpreted by this renderer.'}
                                 for section in sections for stream in ignored_streams],
    }
    manifest = {
        'schema': 'gothic3-world-landmarks-v1',
        'coordinates': {'units': 'metres', 'originNativeCentimetres': origin,
                        'positionConversion': '[(nativeX-originX)/100,(nativeY-originY)/100,-(nativeZ-originZ)/100]',
                        'instanceTransform': 'Source entity world matrix; full-detail mesh selected from its low-poly family resource.'},
        'instances': [{
            'id': 'xardas-tower', 'name': 'Xardas Tower', 'region': 'Nordmar',
            'position': position, 'quaternion': [0, 0, 0, 1], 'scale': [1, 1, 1],
            'boundsMetres': bounds, 'streamRadiusMetres': 500,
            'geometry': geometry_ref, 'source': source_record,
        }],
        'summary': {'instances': 1, 'vertices': statistics['vertices'],
                    'triangles': statistics['triangles'], 'geometryBytes': len(glb),
                    'sourceIndexSHA256': sha((WORLD / 'world-files.json').read_bytes()),
                    'meshIndexSHA256': sha((WORLD / 'mesh-resources.json').read_bytes())},
        'limits': ['This is the source-placed full-detail Xardas Tower family mesh.',
                   'It is used as a visual and static triangle-collision surface, not as a recovered PhysX shape.',
                   'Only the first native diffuse sampler per section is shown; normal/specular graphs, illumination, lightmaps and stream 73 are not interpreted.'],
    }
    manifest_bytes = json_bytes(manifest)
    (OUT / 'manifest.json').write_bytes(manifest_bytes)
    print(json.dumps({'manifest': str(OUT / 'manifest.json'), 'geometry': geometry_ref,
                      'position': position, 'boundsMetres': bounds,
                      'sourceMaterials': len(material_sources), 'sourceImages': len(diffuse_sources)}, indent=2))


if __name__ == '__main__':
    main()
