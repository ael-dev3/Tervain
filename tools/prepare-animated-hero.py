#!/usr/bin/env python3
"""Reproduce or check Tervain's owner-supplied native-animation hero.

Check the committed derivative without Blender or the source:
    python3 tools/prepare-animated-hero.py --check

Prepare with Blender 5.2.0 LTS (the recorded reducer version):
    Blender --background --factory-startup --python tools/prepare-animated-hero.py -- \
      --source /path/to/owner-supplied.glb --workshop /path/to/workshop \
      --output public/models/hero/weathered-wanderer-animated-hero.glb

The owner-supplied source is deliberately not redistributed by this tool.
Reduction operates on undeformed base geometry; original clips are never
resampled, and embedded JPEG image bytes are retained exactly. Uniform units
scale vertices, nodes, animation positions and inverse-bind translations
consistently. A submillimetre constant root offset grounds the bind geometry.
"""
import argparse
import hashlib
import json
import math
import pathlib
import struct
import sys

EXPECTED_RUNTIME_SHA256 = '0b02a9c23763b6382e6ea87bd150bcef59a93149650524fa7a5f434951c8c8db'
EXPECTED_SOURCE_SHA256 = '82370608d175ca623a85a8eae1963726de82ef711a74db1e3e518cba83e1a1f1'
EXPECTED_CLIPS = {'Running': 2/3, 'Walking': 25/24, 'Boxing_Practice': 164/24,
                  'Casual_Walk': 101/24, 'Dead': 3, 'Run_03': 20/24}
EXPECTED_IMAGE_SHA256 = ['7217a7dcc04b48e50538912d3bbb2febed361fda0afb9f84e0171cf72e2fe9de',
                         'c99f5da3891d60b16e67433029e7e2b15b3004cb511b2b9967b527bf84e9534b',
                         '860ed16675ff7db607eb9daa53433ebd9251e56566abb716009214bc44c3b3ed']


def read_committed(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<II', data, 4) == (2, len(data))
    jlength, jtype = struct.unpack_from('<II', data, 12)
    assert jtype == 0x4E4F534A
    document = json.loads(data[20:20+jlength])
    blength, btype = struct.unpack_from('<II', data, 20+jlength)
    assert btype == 0x004E4942
    return document, data[28+jlength:28+jlength+blength], data


def check(path):
    document, binary, data = read_committed(path)
    assert hashlib.sha256(data).hexdigest() == EXPECTED_RUNTIME_SHA256, 'Runtime GLB hash differs from approved prepared derivative'
    assert len(document['meshes']) == len(document['materials']) == len(document['skins']) == 1
    primitive = document['meshes'][0]['primitives'][0]
    assert len(document['meshes'][0]['primitives']) == 1
    assert document['accessors'][primitive['indices']]['count'] // 3 == 65000
    assert len(document['skins'][0]['joints']) == 66
    assert set(a['name'] for a in document['animations']) == set(EXPECTED_CLIPS)
    for animation in document['animations']:
        assert len(animation['channels']) == 132
        durations = [document['accessors'][s['input']]['max'][0] for s in animation['samplers']]
        assert abs(max(durations)-EXPECTED_CLIPS[animation['name']]) < 1e-6
    def values(aid, fmt):
        a = document['accessors'][aid]
        v = document['bufferViews'][a['bufferView']]
        start = v.get('byteOffset',0) + a.get('byteOffset',0)
        width = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        size = struct.calcsize(fmt)
        return [value[0] for value in struct.iter_unpack(fmt, binary[start:start+a['count']*width*size])]
    positions = values(primitive['attributes']['POSITION'],'<f')
    assert all(math.isfinite(v) for v in positions)
    assert abs(max(positions[1::3])-min(positions[1::3])-1.899) < 1e-6
    normals = values(primitive['attributes']['NORMAL'],'<f')
    assert all(abs(math.sqrt(sum(v*v for v in normals[k:k+3]))-1) < 1e-5 for k in range(0,len(normals),3))
    weights = values(primitive['attributes']['WEIGHTS_0'],'<f')
    assert all(math.isfinite(v) and v>=0 for v in weights)
    assert all(abs(sum(weights[k:k+4])-1)<1e-6 for k in range(0,len(weights),4))
    assert max(values(primitive['attributes']['JOINTS_0'],'<H')) < 66
    for image, expected in zip(document['images'],EXPECTED_IMAGE_SHA256):
        assert image['mimeType']=='image/jpeg'
        view = document['bufferViews'][image['bufferView']]
        image_bytes = binary[view['byteOffset']:view['byteOffset']+view['byteLength']]
        assert hashlib.sha256(image_bytes).hexdigest()==expected
    print(json.dumps({'asset':str(path),'sha256':EXPECTED_RUNTIME_SHA256,'bytes':len(data),'triangles':65000,'joints':66,'clips':list(EXPECTED_CLIPS),'source_JPEG_hashes_verified':True,'height_metres':1.899},indent=2))


def prepare(args):
    HERE = args.workshop.resolve()
    HERE.mkdir(parents=True, exist_ok=True)
    SOURCE = args.source.resolve()
    TARGET = args.output.resolve()
    TARGET_HEIGHT = 1.899
    import bpy
    import hashlib
    import json
    import math
    import pathlib
    import struct
    from mathutils.kdtree import KDTree

    EXPECTED_SHA256 = '82370608d175ca623a85a8eae1963726de82ef711a74db1e3e518cba83e1a1f1'
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED_SHA256
    source_json = json.loads(SOURCE.read_bytes()[20:20 + struct.unpack_from('<I', SOURCE.read_bytes(), 12)[0]])
    source_joint_names = [source_json['nodes'][i]['name'] for i in source_json['skins'][0]['joints']]

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    obj = bpy.data.objects['Mesh_0']
    assert obj.type == 'MESH'
    assert all(abs(obj.matrix_world[r][c] - (1 if r == c else 0)) < 1e-5 for r in range(4) for c in range(4))
    source_bounds = [[min(v.co[k] for v in obj.data.vertices), max(v.co[k] for v in obj.data.vertices)] for k in range(3)]
    source_triangles = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    group_names = {g.index: g.name for g in obj.vertex_groups}
    joint_index = {name: i for i, name in enumerate(source_joint_names)}
    source_weights = []
    source_nearest = KDTree(len(obj.data.vertices))
    for v in obj.data.vertices:
        source_nearest.insert(v.co, v.index)
        source_weights.append(sorted([(joint_index[group_names[g.group]], g.weight) for g in v.groups
                                      if group_names.get(g.group) in joint_index and g.weight > 1e-8],
                                     key=lambda pair: pair[1], reverse=True))
    source_nearest.balance()

    # The source is imported in its bind coordinates. Disable pose deformation
    # before decimation so neither the current action nor a frame is baked.
    for modifier in obj.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.show_viewport = False
            modifier.show_render = False
    protection = obj.vertex_groups.new(name='PREP_detail_retention')
    for v in obj.data.vertices:
        hand_weight = sum(g.weight for g in v.groups if ('Hand' in group_names.get(g.group, '')))
        head_weight = sum(g.weight for g in v.groups if group_names.get(g.group) in ('mixamorig:Head', 'mixamorig:Neck'))
        # Preserve the face, fingers and silhouette, while clothing is reduced more.
        detail = max(0.01, head_weight * 0.9, hand_weight * 0.8)
        protection.add([v.index], detail, 'REPLACE')
    decimator = obj.modifiers.new('65k_skin_and_UV_preserving_collapse', 'DECIMATE')
    decimator.decimate_type = 'COLLAPSE'
    decimator.ratio = 65000 / source_triangles
    decimator.use_collapse_triangulate = True
    decimator.vertex_group = protection.name
    decimator.vertex_group_factor = 0.5
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    mesh.calc_loop_triangles()
    assert mesh.uv_layers.active
    assert len(mesh.loop_triangles) <= 100000, len(mesh.loop_triangles)

    fields = {name: bytearray() for name in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0', 'indices')}
    lookup = {}
    weight_max_error = 0.0
    max_dropped_weight = 0.0
    dropped_vertex_count = 0
    dropped_significant_count = 0
    dropped_examples = []
    recovered_finger_binding_examples = []
    min_normal_length, max_normal_length = math.inf, 0.0
    bounds = [[math.inf, -math.inf] for _ in range(3)]
    for triangle in mesh.loop_triangles:
        for li in triangle.loops:
            loop = mesh.loops[li]
            vertex = mesh.vertices[loop.vertex_index]
            # Blender import maps glTF (x,y,z) to (x,-z,y), including normals,
            # and flips the UV V component. Undo only that coordinate conversion.
            position = (vertex.co.x, vertex.co.z, -vertex.co.y)
            cn = mesh.corner_normals[li].vector
            normal = (cn.x, cn.z, -cn.y)
            normal_length = math.sqrt(sum(n * n for n in normal))
            assert normal_length > 1e-7
            normal = tuple(n / normal_length for n in normal)
            uvb = mesh.uv_layers.active.data[li].uv
            uv = (uvb.x, 1.0 - uvb.y)
            influences = sorted([(joint_index[group_names[g.group]], g.weight) for g in vertex.groups
                                 if g.group in group_names and group_names[g.group] in joint_index and g.weight > 1e-8],
                                key=lambda pair: pair[1], reverse=True)
            assert influences, 'Decimation lost a vertex skin binding'
            dropped = sum(w for _, w in influences[4:])
            max_dropped_weight = max(max_dropped_weight, dropped)
            recovery = None
            if dropped > 0.1:
                nearest_position, nearest_index, nearest_distance = source_nearest.find(vertex.co)
                assert nearest_distance < 0.008, nearest_distance
                recovery = {'position': position, 'interpolated_weight_beyond_four': dropped,
                            'source_vertex': nearest_index, 'distance_from_source_vertex_metres': nearest_distance}
                influences = source_weights[nearest_index]
                assert len(influences) <= 4
            influences = influences[:4]
            total = sum(w for _, w in influences)
            joints = [j for j, w in influences] + [0] * (4 - len(influences))
            weights = [w / total for j, w in influences] + [0.0] * (4 - len(influences))
            weight_max_error = max(weight_max_error, abs(sum(weights) - 1.0))
            # UV seams and split normals remain distinct glTF vertices.
            key = struct.pack('<3f3f2f4H4f', *position, *normal, *uv, *joints, *weights)
            index = lookup.get(key)
            if index is None:
                index = len(lookup)
                lookup[key] = index
                if dropped > 1e-7:
                    dropped_vertex_count += 1
                if dropped > 0.1:
                    dropped_significant_count += 1
                    recovered_finger_binding_examples.append(recovery)
                    dropped_examples.append({'position': position, 'dropped': dropped,
                                             'influences': [(source_joint_names[j], w) for j, w in sorted([(joint_index[group_names[g.group]], g.weight) for g in vertex.groups if g.group in group_names and group_names[g.group] in joint_index and g.weight > 1e-8], key=lambda pair: pair[1], reverse=True)]})
                fields['POSITION'] += struct.pack('<3f', *position)
                fields['NORMAL'] += struct.pack('<3f', *normal)
                fields['TEXCOORD_0'] += struct.pack('<2f', *uv)
                fields['JOINTS_0'] += struct.pack('<4H', *joints)
                fields['WEIGHTS_0'] += struct.pack('<4f', *weights)
                for k, value in enumerate(position):
                    bounds[k][0] = min(bounds[k][0], value)
                    bounds[k][1] = max(bounds[k][1], value)
                normal_length = math.sqrt(sum(n * n for n in normal))
                min_normal_length = min(min_normal_length, normal_length)
                max_normal_length = max(max_normal_length, normal_length)
            fields['indices'] += struct.pack('<I', index)
    for name, data in fields.items():
        (HERE / ('reduced-' + name + '.bin')).write_bytes(data)
    record = {
        'tool': 'Blender ' + bpy.app.version_string,
        'source_sha256': EXPECTED_SHA256,
        'source_triangles': source_triangles,
        'source_blender_bounds_xyz': source_bounds,
        'triangles': len(mesh.loop_triangles),
        'vertices': len(lookup),
        'gltf_bounds_xyz': bounds,
        'ratio': decimator.ratio,
        'detail_retention': {'head': 0.9, 'hands': 0.8, 'minimum': 0.01, 'vertex_group_factor': 0.5},
        'uv_layer': mesh.uv_layers.active.name,
        'source_joint_names': source_joint_names,
        'skin_weight_sum_error': weight_max_error,
        'max_influence_weight_dropped_after_interpolation': max_dropped_weight,
        'vertices_with_any_dropped_influence': dropped_vertex_count,
        'vertices_with_dropped_influence_above_0_1': dropped_significant_count,
        'nearest_source_finger_bindings_restored': recovered_finger_binding_examples,
        'largest_dropped_weight_examples': sorted(dropped_examples, key=lambda item: item['dropped'], reverse=True)[:10],
        'normal_length_min_max': [min_normal_length, max_normal_length],
        'deformed_pose_baked': False,
    }
    (HERE / 'blender-reduction.json').write_text(json.dumps(record, indent=2) + '\n')
    evaluated.to_mesh_clear()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'animated-hero-reduction.blend'))
    print('DERIVATIVE_REDUCTION', json.dumps({k: record[k] for k in ('tool', 'source_triangles', 'triangles', 'vertices', 'gltf_bounds_xyz', 'normal_length_min_max', 'max_influence_weight_dropped_after_interpolation')}))

    import copy
    import hashlib
    import json
    import math
    import pathlib
    import struct

    SOURCE_SHA256 = '82370608d175ca623a85a8eae1963726de82ef711a74db1e3e518cba83e1a1f1'


    def sha(data):
        return hashlib.sha256(data).hexdigest()


    def read_glb(path):
        data = path.read_bytes()
        assert data[:4] == b'glTF'
        assert struct.unpack_from('<II', data, 4) == (2, len(data))
        jlength, jtype = struct.unpack_from('<II', data, 12)
        assert jtype == 0x4E4F534A
        document = json.loads(data[20:20 + jlength])
        blength, btype = struct.unpack_from('<II', data, 20 + jlength)
        assert btype == 0x004E4942
        binary = data[28 + jlength:28 + jlength + blength]
        return document, binary, data


    def payload(document, binary, accessor_id):
        a = document['accessors'][accessor_id]
        v = document['bufferViews'][a['bufferView']]
        assert not v.get('byteStride') and not a.get('sparse')
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        byte_size = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[a['componentType']]
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return binary[start:start + width * byte_size * a['count']]


    original, original_binary, source_bytes = read_glb(SOURCE)
    assert sha(source_bytes) == SOURCE_SHA256
    reduction = json.loads((HERE / 'blender-reduction.json').read_text())
    document = copy.deepcopy(original)
    views = [bytearray(original_binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
             for v in original['bufferViews']]
    primitive = document['meshes'][0]['primitives'][0]
    source_position_id = primitive['attributes']['POSITION']
    source_position = original['accessors'][source_position_id]
    source_height = source_position['max'][1] - source_position['min'][1]
    reduced_height = reduction['gltf_bounds_xyz'][1][1] - reduction['gltf_bounds_xyz'][1][0]
    scale = TARGET_HEIGHT / reduced_height

    # A uniform change of units is a similarity transform: S * M * inv(S).
    # This scales vertex coordinates, node/animation positions and inverse-bind
    # translations together. Rotations, time samples, UVs and all weights retain
    # their interpretation; no action is baked or resampled through Blender.
    for name, aid in {**primitive['attributes'], 'indices': primitive['indices']}.items():
        accessor = document['accessors'][aid]
        data = bytearray((HERE / ('reduced-' + name + '.bin')).read_bytes())
        if name == 'POSITION':
            values = [v[0] * scale for v in struct.iter_unpack('<f', data)]
            data = bytearray(struct.pack('<' + 'f' * len(values), *values))
            accessor['min'] = [min(values[k::3]) for k in range(3)]
            accessor['max'] = [max(values[k::3]) for k in range(3)]
        accessor['count'] = reduction['triangles'] * 3 if name == 'indices' else reduction['vertices']
        accessor['byteOffset'] = 0
        if name == 'JOINTS_0':
            accessor['componentType'] = 5123
        views[accessor['bufferView']] = data

    for node in document['nodes']:
        if 'translation' in node:
            node['translation'] = [v * scale for v in node['translation']]
        if 'matrix' in node:
            for k in (12, 13, 14):
                node['matrix'][k] *= scale

    scaled_position_accessors = set()
    for animation in document['animations']:
        for channel in animation['channels']:
            if channel['target']['path'] != 'translation':
                continue
            aid = animation['samplers'][channel['sampler']]['output']
            if aid in scaled_position_accessors:
                continue
            scaled_position_accessors.add(aid)
            accessor = document['accessors'][aid]
            assert accessor['componentType'] == 5126 and accessor['type'] == 'VEC3'
            data = views[accessor['bufferView']]
            offset = accessor.get('byteOffset', 0)
            for k in range(accessor['count'] * 3):
                position = offset + 4 * k
                struct.pack_into('<f', data, position, struct.unpack_from('<f', data, position)[0] * scale)
            for key in ('min', 'max'):
                if key in accessor:
                    accessor[key] = [v * scale for v in accessor[key]]

    for skin in document['skins']:
        accessor = document['accessors'][skin['inverseBindMatrices']]
        assert accessor['componentType'] == 5126 and accessor['type'] == 'MAT4'
        data = views[accessor['bufferView']]
        offset = accessor.get('byteOffset', 0)
        for matrix in range(accessor['count']):
            for column in (12, 13, 14):
                position = offset + 64 * matrix + 4 * column
                struct.pack_into('<f', data, position, struct.unpack_from('<f', data, position)[0] * scale)

    # A constant root translation grounds the reduced bind geometry. This offset
    # is microscopic (floating point source normalization), not a pose correction.
    minimum_y = document['accessors'][source_position_id]['min'][1]
    root_id = document['scenes'][document.get('scene', 0)]['nodes'][0]
    assert 'translation' not in original['nodes'][root_id]
    document['nodes'][root_id]['translation'] = [0.0, -minimum_y, 0.0]
    document['asset']['generator'] += '; Tervain Blender base-mesh reduction and exact native-animation unit conversion'

    binary = bytearray()
    for view, data in zip(document['bufferViews'], views):
        binary += b'\0' * ((-len(binary)) % 4)
        view['byteOffset'] = len(binary)
        view['byteLength'] = len(data)
        view['buffer'] = 0
        binary += data
    document['buffers'][0]['byteLength'] = len(binary)
    binary += b'\0' * ((-len(binary)) % 4)
    json_bytes = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    json_bytes += b' ' * ((-len(json_bytes)) % 4)
    result = (struct.pack('<4sII', b'glTF', 2, 28 + len(json_bytes) + len(binary)) +
              struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes +
              struct.pack('<II', len(binary), 0x004E4942) + binary)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(result)
    packed, packed_binary, packed_bytes = read_glb(TARGET)

    image_records = []
    for before, after in zip(original['images'], packed['images']):
        bv_before, bv_after = original['bufferViews'][before['bufferView']], packed['bufferViews'][after['bufferView']]
        before_data = original_binary[bv_before['byteOffset']:bv_before['byteOffset'] + bv_before['byteLength']]
        after_data = packed_binary[bv_after['byteOffset']:bv_after['byteOffset'] + bv_after['byteLength']]
        assert before_data == after_data
        image_records.append({'name': before['name'], 'mimeType': after['mimeType'], 'bytes': len(after_data), 'sha256': sha(after_data), 'source_bytes_identical': True})
    assert original['materials'] == packed['materials']
    assert original['textures'] == packed['textures']
    assert original['skins'][0]['joints'] == packed['skins'][0]['joints']
    assert len(packed['skins'][0]['joints']) == 66
    assert len(packed['meshes']) == 1 and len(packed['materials']) == 1
    assert original['animations'] == packed['animations']
    clip_records = []
    translation_max_absolute_error = 0.0
    unchanged_track_count = 0
    for animation in packed['animations']:
        duration = 0.0
        for channel in animation['channels']:
            sampler = animation['samplers'][channel['sampler']]
            time_before = payload(original, original_binary, sampler['input'])
            time_after = payload(packed, packed_binary, sampler['input'])
            assert time_before == time_after
            duration = max(duration, max(v[0] for v in struct.iter_unpack('<f', time_after)))
            value_before = payload(original, original_binary, sampler['output'])
            value_after = payload(packed, packed_binary, sampler['output'])
            if channel['target']['path'] == 'translation':
                before_values = [v[0] for v in struct.iter_unpack('<f', value_before)]
                after_values = [v[0] for v in struct.iter_unpack('<f', value_after)]
                error = max(abs(b * scale - a) for b, a in zip(before_values, after_values))
                assert error < 1e-6
                translation_max_absolute_error = max(translation_max_absolute_error, error)
            else:
                assert value_before == value_after
                unchanged_track_count += 1
        clip_records.append({'name': animation['name'], 'duration_seconds': duration, 'channels': len(animation['channels']), 'original_sampling_and_interpolation_preserved': True})
    weights = [v[0] for v in struct.iter_unpack('<f', payload(packed, packed_binary, primitive['attributes']['WEIGHTS_0']))]
    assert all(math.isfinite(v) and v >= 0 for v in weights)
    max_weight_error = max(abs(sum(weights[k:k + 4]) - 1) for k in range(0, len(weights), 4))
    assert max_weight_error < 1e-6
    joint_values = [v[0] for v in struct.iter_unpack('<H', payload(packed, packed_binary, primitive['attributes']['JOINTS_0']))]
    assert max(joint_values) < 66
    normals = [v[0] for v in struct.iter_unpack('<f', payload(packed, packed_binary, primitive['attributes']['NORMAL']))]
    normal_lengths = [math.sqrt(sum(v * v for v in normals[k:k + 3])) for k in range(0, len(normals), 3)]
    assert min(normal_lengths) > 0.999 and max(normal_lengths) < 1.001
    positions = [v[0] for v in struct.iter_unpack('<f', payload(packed, packed_binary, primitive['attributes']['POSITION']))]
    assert all(math.isfinite(v) for v in positions + normals)
    uvs = [v[0] for v in struct.iter_unpack('<f', payload(packed, packed_binary, primitive['attributes']['TEXCOORD_0']))]
    assert all(math.isfinite(v) for v in uvs)
    indices = [v[0] for v in struct.iter_unpack('<I', payload(packed, packed_binary, primitive['indices']))]
    assert max(indices) < reduction['vertices']
    zero_area_count = 0
    normal_reversed_count = 0
    minimum_area = math.inf
    for k in range(0, len(indices), 3):
        ids = indices[k:k + 3]
        p, q, r = [positions[i * 3:i * 3 + 3] for i in ids]
        e1, e2 = [q[j] - p[j] for j in range(3)], [r[j] - p[j] for j in range(3)]
        cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
        area = math.sqrt(sum(x * x for x in cross)) / 2
        minimum_area = min(minimum_area, area)
        if area < 1e-16:
            zero_area_count += 1
        average_normal = [sum(normals[i * 3 + j] for i in ids) for j in range(3)]
        if sum(average_normal[j] * cross[j] for j in range(3)) < -1e-14:
            normal_reversed_count += 1
    assert zero_area_count == 0, zero_area_count

    manifest = {
        'source': {'path': str(SOURCE), 'sha256': SOURCE_SHA256, 'bytes': len(source_bytes), 'triangles': reduction['source_triangles'],
                   'license': 'Owner-supplied model authorized for Tervain integration; no general redistribution license asserted.'},
        'runtime': {'path': str(TARGET), 'sha256': sha(packed_bytes), 'bytes': len(packed_bytes), 'triangles': reduction['triangles'],
                    'vertices': reduction['vertices'], 'skinned_meshes': 1, 'materials': 1, 'joints': 66,
                    'position_bounds_xyz': {'min': packed['accessors'][source_position_id]['min'], 'max': packed['accessors'][source_position_id]['max']},
                    'root_ground_translation_y': -minimum_y, 'bind_height_metres': packed['accessors'][source_position_id]['max'][1] - minimum_y,
                    'uniform_scale_from_source': scale, 'rotation_wrapper': False, 'scale_wrapper': False},
        'preparation': {'tool': reduction['tool'], 'method': 'Undeformed Blender decimation preserving UV seams and interpolated joint weights; native glTF tracks merged without resampling',
                        'uniform_unit_conversion': 'All mesh positions, node translations, animation translations and inverse-bind translations scaled consistently; rotations unchanged',
                        'source_images_preserved_byte_for_byte': True, 'source_uv_layout_preserved': True,
                        'translation_max_absolute_roundoff': translation_max_absolute_error, 'animation_rotation_tracks_byte_identical': unchanged_track_count,
                        'source_bind_height_metres': source_height, 'reduced_bind_height_before_uniform_conversion': reduced_height,
                        'weight_sum_max_error': max_weight_error, 'normal_length_min_max': [min(normal_lengths), max(normal_lengths)],
                        'minimum_triangle_area_square_metres': minimum_area, 'zero_area_triangles': zero_area_count,
                        'triangles_with_geometric_normal_opposing_custom_normals': normal_reversed_count,
                        'blender_geometry': reduction},
        'animations': clip_records,
        'images': image_records,
    }
    (HERE / 'animated-hero-asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (HERE / 'runtime-gltf.json').write_text(json.dumps(packed, indent=2) + '\n')
    print(json.dumps({k: manifest[k] for k in ('runtime', 'animations', 'images')}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--source', type=pathlib.Path)
    parser.add_argument('--workshop', type=pathlib.Path)
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parent.parent/'public/models/hero/weathered-wanderer-animated-hero.glb')
    argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    if args.check:
        check(args.output)
    else:
        if args.source is None or args.workshop is None:
            parser.error('Preparation needs --source and --workshop; use --check to verify the committed asset')
        prepare(args)
