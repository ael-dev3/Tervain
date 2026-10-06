# SPDX-License-Identifier: GPL-3.0-only
"""Build Diego's original skinned actor with the already audited Hero motions.

The body/head XACT files are supplied by the local installation extraction and
must match the exact source-manifest receipts. Motion tracks are reused from the
independently audited Hero native-motion package. This writes only the Gothic 3
animated asset directory; it never modifies the installed game.
"""
import argparse
import json
from pathlib import Path

from export_animated import GLB, digest, json_bytes, normalized_material
from native_animation_math import (cleaned_rig, column_major, inverse, matrix,
                                  multiply, normal, point, rotation, translation)
from read_xact_skin import read_actor

REPO = Path(__file__).resolve().parents[2]
BASE = REPO / 'public/gothic3'
OUT = BASE / 'animated'
DIEGO_ID = '1e51df278c13ed4f9d578491bbd3c4cd00000000'


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf8'))


def source_record(source_manifest, label):
    archive, path = label.split(' :: ', 1)
    found = [item for item in source_manifest['inputs']
             if item['archive'] == archive and item['path'] == path]
    if len(found) != 1:
        raise ValueError(f'No unique source-manifest receipt for {label}')
    return found[0]


def checked_input(path, label, source_manifest):
    path = Path(path).resolve()
    record = source_record(source_manifest, label)
    if path.name != Path(record['path']).name:
        raise ValueError(f'Input filename does not match selected resource: {record["path"]}')
    actual = digest(path)
    if actual != record['sha256'] or path.stat().st_size != record['bytes']:
        raise ValueError(f'Source hash/size differs from the recorded installed resource: {record["path"]}')
    return path, {'archive': record['archive'], 'path': record['path'],
                  'sha256': actual, 'bytes': path.stat().st_size}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--body-xact', type=Path, required=True,
                        help='Extracted G3_Hero_Body_RebBanditMed.xact from the local install')
    parser.add_argument('--head-xact', type=Path, required=True,
                        help='Extracted G3_Head_Hero_Diego_Animated_01.xact from the local install')
    args = parser.parse_args()

    static_manifest_path = BASE / 'source-manifest.json'
    static_manifest = read_json(static_manifest_path)
    scene = read_json(BASE / 'scene.json')
    animation_manifest_path = OUT / 'manifest.json'
    animation_manifest = read_json(animation_manifest_path)
    hero_asset = next((asset for asset in animation_manifest['assets'] if asset['id'] == 'hero'), None)
    if hero_asset is None:
        raise ValueError('The verified Hero actor is required as the motion source.')
    # Manifest asset paths are relative to public/gothic3, not animated/.
    hero_native_path = BASE / hero_asset['native']
    hero_native_receipt = animation_manifest['outputs'].get(hero_asset['native'])
    if not hero_native_receipt or digest(hero_native_path) != hero_native_receipt['sha256'] or \
            hero_native_path.stat().st_size != hero_native_receipt['bytes']:
        raise ValueError('Hero native-motion source artifact differs from its manifest receipt.')
    hero_audit = read_json(OUT / 'audit.json')
    if not hero_audit.get('passed') or hero_audit.get('nativeJSONSHA256') != hero_native_receipt['sha256']:
        raise ValueError('The inherited Hero motions lack a passing original-byte audit.')
    hero_native = read_json(hero_native_path)
    if hero_native.get('version') != 1 or hero_native.get('nativeUnits') != 'centimetres':
        raise ValueError('Unsupported Hero native-motion source artifact.')
    hero_joint_names = {node['name'] for node in hero_native.get('sharedCleanedRig', [])}
    if not hero_joint_names or 'Hero_ROOT' not in hero_joint_names:
        raise ValueError('The audited Hero rig does not contain its expected cleaned skeleton.')

    people = [person for person in scene['people'] if person['id'].lower() == DIEGO_ID]
    if len(people) != 1 or people[0]['name'] != 'Diego':
        raise ValueError('The source scene does not contain one expected Diego actor.')
    person = people[0]
    parts_spec = [('body', person['body']), ('head', person['head'])]
    actors = []
    input_records = {}
    for part_id, model_key in parts_spec:
        model = scene['models'].get(model_key)
        if not model:
            raise ValueError(f'Diego references an unexported model: {model_key}')
        label = model['source']
        path_arg = args.body_xact if part_id == 'body' else args.head_xact
        source_path, receipt = checked_input(path_arg, label, static_manifest)
        decoded = read_actor(source_path)
        if decoded['lods']:
            raise ValueError(f'{model_key} contains LOD payloads without an explicit LOD selection.')
        input_records[label] = receipt
        actors.append({'id': part_id, 'modelKey': model_key, 'source': label,
                       'decoded': decoded, 'model': model})

    hero_clip_by_name = {clip['name']: clip for clip in hero_asset['clips']}
    hero_motion_by_name = {motion['name']: motion for motion in hero_native['motions']}
    if len(hero_clip_by_name) != len(hero_asset['clips']) or \
            set(hero_clip_by_name) != set(hero_motion_by_name):
        raise ValueError('Hero native motion records and exported clip catalog disagree.')
    for clip in hero_asset['clips']:
        label = clip['source']
        if label not in animation_manifest['inputs']:
            raise ValueError(f'Hero clip has no original source-byte receipt: {clip["name"]}')
        native_motion = hero_motion_by_name[clip['name']]
        if native_motion['source'] != label or \
                native_motion['decoded']['audit']['duration'] != clip['duration']:
            raise ValueError(f'Hero clip source or duration changed: {clip["name"]}')

    out_manifest = animation_manifest
    out_receipts = dict(out_manifest['outputs'])
    dependencies = dict(out_manifest['dependencies'])
    diego_dependency_paths = set()
    inputs = dict(out_manifest['inputs'])
    inputs.update(input_records)

    def dependency(relative):
        path = (BASE / relative).resolve()
        if not path.is_relative_to(BASE.resolve()):
            raise ValueError('Nonportable static dependency path.')
        receipt = static_manifest['outputs'].get(relative)
        if not receipt or digest(path) != receipt['sha256'] or path.stat().st_size != receipt['bytes']:
            raise ValueError(f'Static dependency hash/size mismatch: {relative}')
        dependencies[relative] = dict(receipt)
        diego_dependency_paths.add(relative)
        return path

    glb = GLB()
    glb.doc['nodes'][0]['name'] = 'Gothic3_Diego'
    rigs = []
    globals_by_part = []
    removed_by_part = []
    shared_by_name = {}
    shared = []
    shared_audit = {'commonNodes': 0, 'maxPositionDifferenceMetres': 0,
                    'maxQuaternionComponentDifference': 0}
    for entry in actors:
        actor = entry['decoded']['actor']
        rig, global_bind, removed = cleaned_rig(actor)
        rigs.append(rig)
        globals_by_part.append(global_bind)
        removed_by_part.append(removed)
        for node in rig:
            previous = shared_by_name.get(node['name'])
            if previous:
                if previous['parent'] != node['parent']:
                    raise ValueError('Diego body/head skeleton parent disagreement.')
                delta_position = max(abs(a - b) for a, b in zip(previous['translation'], node['translation']))
                delta_rotation = min(
                    max(abs(a - b) for a, b in zip(previous['rotation'], node['rotation'])),
                    max(abs(a + b) for a, b in zip(previous['rotation'], node['rotation'])))
                if delta_position > 2e-6 or delta_rotation > 2e-6:
                    raise ValueError('Diego body/head shared bind transform differs beyond float tolerance.')
                shared_audit['commonNodes'] += 1
                shared_audit['maxPositionDifferenceMetres'] = max(
                    shared_audit['maxPositionDifferenceMetres'], delta_position)
                shared_audit['maxQuaternionComponentDifference'] = max(
                    shared_audit['maxQuaternionComponentDifference'], delta_rotation)
            else:
                shared_by_name[node['name']] = node
                shared.append(node)

    bone_index = {node['name']: index + 1 for index, node in enumerate(shared)}
    joint_index = {node['name']: index for index, node in enumerate(shared)}
    for node in shared:
        glb.doc['nodes'].append({'name': node['name'], 'translation': node['translation'],
            'rotation': node['rotation'], 'scale': [1, 1, 1], 'children': [],
            'extras': {'nativeSourceIndex': node['sourceIndex'], 'removedAncestors': node['removedAncestors']}})
    for node in shared:
        parent = bone_index[node['parent']] if node['parent'] else 0
        glb.doc['nodes'][parent]['children'].append(bone_index[node['name']])

    shared_globals = {}
    def shared_global(name):
        if name not in shared_globals:
            node = shared_by_name[name]
            local = matrix(node['translation'], node['rotation'])
            shared_globals[name] = multiply(shared_global(node['parent']), local) if node['parent'] else local
        return shared_globals[name]
    for node in shared:
        shared_global(node['name'])

    material_cache = {}
    texture_cache = {}
    part_summaries = []
    native_part_data = []
    max_rest_error = 0
    primitive_maps_by_part = [[] for _ in actors]

    def material(part_index, actor, material_index):
        model_key = actors[part_index]['modelKey']
        model = actors[part_index]['model']
        mtl = dependency(model['mtl'])
        native = actor['materials'][material_index]
        name = native['name'].replace(' ', '_').replace('\t', '_')
        normalized = normalized_material(native['name'])
        metadata = model.get('materials', {}).get(normalized)
        if not metadata:
            raise ValueError(f'No verified native material metadata for {model_key}:{name}')
        mtl_maps = {}
        active = None
        for line in mtl.read_text(encoding='utf8').splitlines():
            if line.startswith('newmtl '):
                active = line[7:].strip()
            elif line.startswith('map_Kd ') and active:
                mtl_maps[active] = line[7:].strip()
        image_path = mtl_maps.get(name)
        if not image_path:
            raise ValueError(f'No exact diffuse texture for {model_key}:{name}')
        image = (mtl.parent / image_path).resolve()
        relative = image.relative_to(BASE).as_posix()
        dependency(relative)
        expected_shader = metadata.get('source')
        matching_shaders = [item for item in static_manifest['inputs']
            if item['archive'] + ' :: ' + item['path'] == expected_shader]
        for reference in actor['materialReferences']:
            if reference['material'] == material_index and reference['lod'] == 0:
                if Path(reference['name'].replace('\\', '/')).name != Path(expected_shader.split(' :: ', 1)[1]).name or \
                        len(matching_shaders) != 1:
                    raise ValueError(f'Native shader reference differs from the selected material: {name}')
        key = (name, relative)
        if key not in material_cache:
            if relative not in texture_cache:
                image_index = len(glb.doc['images'])
                texture_index = len(glb.doc['textures'])
                glb.doc['images'].append({'uri': '../' + relative})
                glb.doc['textures'].append({'source': image_index, 'sampler': 0})
                texture_cache[relative] = texture_index
            gltf_material = {'name': name, 'pbrMetallicRoughness': {
                'baseColorTexture': {'index': texture_cache[relative]},
                'metallicFactor': 0, 'roughnessFactor': 0.85},
                'doubleSided': native['doubleSided'],
                'extras': {'gothic3Shader': metadata, 'nativeFXAMaterial': native}}
            mode = metadata['blendMode']
            if mode == 0:
                gltf_material['alphaMode'] = 'OPAQUE'
            elif mode == 1:
                gltf_material['alphaMode'] = 'MASK'
                gltf_material['alphaCutoff'] = max(metadata['maskReference'] / 255, 1e-7)
            elif mode == 2:
                gltf_material['alphaMode'] = 'BLEND'
            else:
                raise ValueError(f'Unsupported native material blend mode {mode}')
            material_cache[key] = len(glb.doc['materials'])
            glb.doc['materials'].append(gltf_material)
        return material_cache[key]

    for part_index, entry in enumerate(actors):
        actor = entry['decoded']['actor']
        nodes = actor['nodes']
        global_bind = globals_by_part[part_index]
        inverse_binds = []
        for node in shared:
            bind = global_bind.get(node['name'], shared_globals[node['name']])
            inverse_binds.append(column_major(inverse(bind)))
        skin_index = len(glb.doc['skins'])
        glb.doc['skins'].append({'name': 'Diego_' + entry['id'],
            'joints': [bone_index[node['name']] for node in shared],
            'skeleton': bone_index['Hero_ROOT'], 'inverseBindMatrices': glb.accessor(inverse_binds, 'MAT4'),
            'extras': {'nativeSource': entry['source'], 'partSpecificInverseBinds': True}})
        skins_by_node = {skin['nodeIndex']: skin for skin in actor['skins']}
        total_sets = 0
        primitive_count = 0
        primitive_maps = primitive_maps_by_part[part_index]
        for mesh_index, mesh in enumerate(actor['meshes']):
            if mesh['collision']:
                continue
            skin = skins_by_node.get(mesh['nodeIndex'])
            if not skin:
                raise ValueError('Selected Diego mesh has no native skin data.')
            max_influences = max(len(row) for row in skin['influences'])
            sets = (max_influences + 3) // 4
            total_sets = max(total_sets, sets)
            primitives = []
            for submesh_index, submesh in enumerate(mesh['submeshes']):
                if not submesh['indices']:
                    continue
                vertices = submesh['vertices']
                positions = [translation(vertex['position']) for vertex in vertices]
                attributes = {
                    'POSITION': glb.accessor(positions, 'VEC3', target=34962, bounds=True),
                    'NORMAL': glb.accessor([normal(vertex['normal']) for vertex in vertices], 'VEC3', target=34962),
                }
                for uv in range(mesh['uvSets']):
                    attributes['TEXCOORD_' + str(uv)] = glb.accessor(
                        [vertex['uv'][uv] for vertex in vertices], 'VEC2', target=34962)
                rows = []
                for vertex, position in zip(vertices, positions):
                    influence_row = skin['influences'][vertex['original']]
                    mapped = [(joint_index[nodes[influence['node']]['name']], influence['weight'])
                              for influence in influence_row]
                    rows.append(mapped + [(0, 0)] * (sets * 4 - len(mapped)))
                    rest = [0.0, 0.0, 0.0]
                    for influence in influence_row:
                        bone_name = nodes[influence['node']]['name']
                        delta = multiply(shared_globals[bone_name], inverse(global_bind[bone_name]))
                        transformed = point(delta, position)
                        for axis in range(3):
                            rest[axis] += transformed[axis] * influence['weight']
                    max_rest_error = max(max_rest_error,
                                         max(abs(a - b) for a, b in zip(rest, position)))
                for set_index in range(sets):
                    joints = [[joint for joint, weight in row[set_index * 4:set_index * 4 + 4]] for row in rows]
                    weights = [[weight for joint, weight in row[set_index * 4:set_index * 4 + 4]] for row in rows]
                    attributes['JOINTS_' + str(set_index)] = glb.accessor(joints, 'VEC4', component=5123, target=34962)
                    attributes['WEIGHTS_' + str(set_index)] = glb.accessor(weights, 'VEC4', target=34962)
                    if set_index == 0:
                        attributes['_G3_WEIGHTS_0'] = glb.accessor(weights, 'VEC4', target=34962)
                indices = []
                for index in range(0, len(submesh['indices']), 3):
                    indices.extend(reversed(submesh['indices'][index:index + 3]))
                primitives.append({'attributes': attributes,
                    'indices': glb.accessor(indices, 'SCALAR', component=5125, target=34963),
                    'material': material(part_index, actor, submesh['material']),
                    'extras': {'nativeOriginalVertexCount': mesh['originalVertices'],
                        'skinAttributeSets': sets, 'nativeMaxInfluences': max_influences,
                        'nativeSourceMeshNode': nodes[mesh['nodeIndex']]['name']}})
                primitive_maps.append({'mesh': mesh_index, 'submesh': submesh_index,
                    'originalVertexIndices': [vertex['original'] for vertex in vertices],
                    'skinAttributeSets': sets})
                primitive_count += 1
            exported_mesh = len(glb.doc['meshes'])
            glb.doc['meshes'].append({'name': 'Diego_' + entry['id'], 'primitives': primitives})
            gltf_node = len(glb.doc['nodes'])
            glb.doc['nodes'].append({'name': 'Diego_' + entry['id'] + '_SkinnedMesh',
                                     'mesh': exported_mesh, 'skin': skin_index})
            glb.doc['nodes'][0]['children'].append(gltf_node)
        part_summaries.append({'id': entry['id'], 'modelKey': entry['modelKey'],
            'source': entry['source'], **actor['audit'], 'joints': len(shared),
            'cleanedNativeNodes': len(rigs[part_index]), 'removedHelpers': len(removed_by_part[part_index]),
            'skinAttributeSets': total_sets, 'primitives': primitive_count})
        native_part_data.append({'id': entry['id'], 'source': entry['source'], 'decoded': entry['decoded'],
            'cleanedRig': rigs[part_index], 'removedHelpers': removed_by_part[part_index],
            'globalBindMatricesColumnMajor': {name: column_major(bind) for name, bind in global_bind.items()},
            'portableVertexMappings': primitive_maps})

    clips = []
    native_motions = []
    mapped_native_keyframes = 0
    for clip in hero_asset['clips']:
        name = clip['name']
        inherited = hero_motion_by_name[name]
        motion = inherited['decoded']
        if motion['audit']['interpolations'] != ['L'] or motion['audit']['unknownChunks']:
            raise ValueError(f'Hero motion has unsupported data: {name}')
        duration = motion['audit']['duration']
        motion_parts = {part['name']: part for part in motion['parts']}
        animation = {'name': name, 'samplers': [], 'channels': [],
            'extras': {'nativeSource': inherited['source'], 'role': clip['role'], 'phase': clip.get('phase'),
                'nativeQuaternionInterpolation': 'component-linear; GLB LINEAR uses slerp',
                'serializedMotionBindPoseUsed': False}}
        matched = []
        constant_channels = 0
        for node in shared:
            # Motion payloads can contain unrelated actor/attachment nodes whose
            # names happen to match a Diego-only source node. Retarget only
            # names that are actual joints in the audited Hero rig.
            part = motion_parts.get(node['name']) if node['name'] in hero_joint_names else None
            tracks = {track['type']: track for track in part['tracks']} if part else {}
            pose = part['pose'] if part else None
            for channel, target in [('P', 'translation'), ('R', 'rotation'), ('S', 'scale')]:
                track = tracks.get(channel)
                if track and track['keys']:
                    times = [key['time'] for key in track['keys']]
                    values = [key['value'] for key in track['keys']]
                else:
                    fallback = pose[{'P': 'position', 'R': 'rotation', 'S': 'scale'}[channel]] if pose else node[target]
                    if not pose:
                        glb.channel(animation, bone_index[node['name']], target, [0, duration], [fallback, fallback])
                        constant_channels += 1
                        continue
                    values = [fallback, fallback]
                    times = [0, duration]
                    constant_channels += 1
                if channel == 'P':
                    values = [translation(value) for value in values]
                elif channel == 'R':
                    values = [rotation(value) for value in values]
                    for index in range(1, len(values)):
                        if sum(a * b for a, b in zip(values[index - 1], values[index])) < 0:
                            values[index] = [-component for component in values[index]]
                elif any(max(abs(component - 1) for component in value) > 1e-4 for value in values):
                    raise ValueError(f'Native non-unit animated scale needs affine support: {name}:{node["name"]}')
                glb.channel(animation, bone_index[node['name']], target, times, values)
            if part:
                matched.append(node['name'])
        unmatched = sorted(set(motion_parts) - (set(bone_index) & hero_joint_names))
        retarget_joint_names = set(bone_index) & hero_joint_names
        runtime_motion = {**motion, 'parts': [part for part in motion['parts']
            if part['name'] in retarget_joint_names]}
        mapped_keyframes = sum(len(track['keys']) for part in runtime_motion['parts']
                               for track in part['tracks'])
        mapped_native_keyframes += mapped_keyframes
        root = motion_parts.get('Hero_ROOT')
        root_tracks = root['tracks'] if root else []
        root_motion = {'node': 'Hero_ROOT', 'keyedTypes': [track['type'] for track in root_tracks],
            'translationKeys': next((track['keys'] for track in root_tracks if track['type'] == 'P'), []),
            'controllerSpeedFromFilenameCmPerSec': int(name.rsplit('_P0_', 1)[1].split('.')[0])
                if clip['role'] in ('walk', 'run') else None,
            'note': 'Original Hero motion reused on Diego’s compatible source skeleton; root-motion gameplay remains separate.'}
        clips.append({'name': name, 'role': clip['role'], 'phase': clip.get('phase'),
            'duration': duration, 'source': inherited['source'],
            **{key: motion['audit'][key] for key in ('parts', 'tracks', 'keyframes', 'interpolations')},
            'matchedParts': len(matched), 'unmatchedParts': unmatched,
            'mappedKeyframes': mapped_keyframes,
            'portableChannels': len(animation['channels']), 'constantPoseChannels': constant_channels,
            'rootMotion': root_motion})
        native_motions.append({'name': name, 'role': clip['role'], 'phase': clip.get('phase'),
            'source': inherited['source'], 'decoded': runtime_motion, 'matchedParts': matched,
            'unmatchedParts': unmatched, 'bindPoseFieldsUsable': False,
            'bindPoseNote': inherited.get('bindPoseNote', 'Original XACT bind matrices supply skin inverse binds.')})
        glb.doc['animations'].append(animation)

    if max_rest_error > 3e-6:
        raise ValueError(f'Diego skin bind error exceeds 3 micrometres: {max_rest_error}')
    native = {'version': 1, 'nativeUnits': 'centimetres',
        'coordinateConvention': hero_native['coordinateConvention'], 'parts': native_part_data,
        'sharedCleanedRig': shared, 'motions': native_motions,
        'formatReferences': hero_native['formatReferences'], 'nativeReferences': hero_native['nativeReferences'],
        'limitations': [
            'Original Diego body/head geometry and skin weights are source-derived; selected idle, locomotion and fist clips are the independently audited Hero motions mapped by matching bone names.',
            'The browser loops a selected idle motion. Original NPC schedule selection, actor transition state, multiple-motion blending, root repositioning, facial animation and AI response are not implemented.',
            'Native quaternion interpolation and multi-set skinning use the existing Hero runtime path; complete Genome materials and lighting remain approximations.',
        ]}
    native_path = OUT / 'diego-native.json'
    glb_path = OUT / 'diego.glb'
    OUT.mkdir(parents=True, exist_ok=True)
    native_path.write_bytes(json_bytes(native))
    glb_path.write_bytes(glb.bytes())
    new_outputs = {
        'animated/diego.glb': {'sha256': digest(glb_path), 'bytes': glb_path.stat().st_size},
        'animated/diego-native.json': {'sha256': digest(native_path), 'bytes': native_path.stat().st_size},
    }
    out_receipts.update(new_outputs)
    asset = {'id': 'diego', 'personId': DIEGO_ID, 'personName': 'Diego',
        'glb': 'animated/diego.glb', 'native': 'animated/diego-native.json',
        'parts': part_summaries, 'clips': clips,
        'skeleton': {'joints': len(shared), 'root': 'Hero_ROOT', 'partSpecificInverseBinds': True},
        'motionSourceAsset': {'id': 'hero', 'native': hero_asset['native'],
            'sha256': hero_native_receipt['sha256'], 'auditSHA256': digest(OUT / 'audit.json')}}
    assets = [candidate for candidate in out_manifest['assets'] if candidate['id'] != 'diego']
    assets.append(asset)
    diego_build = {'sharedSkeleton': shared_audit, 'maximumSkinnedRestErrorMetres': max_rest_error,
        'nativeInputFiles': len(input_records), 'reusedAuditedMotionClips': len(clips),
        'staticDependencies': len(diego_dependency_paths),
        'outputFiles': len(new_outputs), 'triangles': sum(part['triangles'] for part in part_summaries),
        'vertices': sum(part['splitVertices'] for part in part_summaries),
        'clips': len(clips),
        'sourceNativeKeyframes': sum(clip['keyframes'] for clip in clips),
        'mappedNativeKeyframes': mapped_native_keyframes,
        'nativeByteBoundariesVerified': True, 'allNativeWeightsPreserved': True,
        'threeFirstWeightSetBackupDistinctBufferView': True,
        'sourceManifestSHA256': digest(static_manifest_path),
        'motionSourceArtifactSHA256': hero_native_receipt['sha256']}
    out_manifest['assets'] = assets
    out_manifest['inputs'] = inputs
    out_manifest['dependencies'] = dependencies
    out_manifest['outputs'] = out_receipts
    out_manifest.setdefault('actorBuildReceipts', {})['diego'] = diego_build
    out_manifest['audit'] = {**out_manifest.get('audit', {}), 'actorBuildStatus': 'source-checked-conversion',
        'independentlyAuditedAssets': ['hero'],
        'actorBuildReceipts': out_manifest['actorBuildReceipts']}
    animation_manifest_path.write_bytes(json_bytes(out_manifest))
    print(json.dumps({'actor': 'Diego', 'manifest': str(animation_manifest_path),
        'outputs': new_outputs, 'audit': diego_build}, indent=2))


if __name__ == '__main__':
    main()
