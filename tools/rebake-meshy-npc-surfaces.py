#!/usr/bin/env python3
"""Rebuild owner-supplied NPC geometry and surfaces offline from immutable Meshy originals.

Use installed Blender --background --factory-startup --offline-mode --disable-autoexec
--python tools/rebake-meshy-npc-surfaces.py -- --workshop actor.blend --receipt actor-receipt.json
--source readonly-source.glb --runtime frozen-before.glb --output /local/candidate-directory.
The frozen workshop/receipt supplies role fabric, scale, original arm fields and eleven joints.
Reconnect positional source seams, protect the head/hands with inverted collapse, retain source UVs
as TEXCOORD_1, bake actual source geometry/paint onto an efficiently packed TEXCOORD_0 atlas,
then retain the established identity-axis procedural skin. Originals/public files are never written.
Actual source coverage, binary checks, native face/side/rear and motion review remain separate gates.
"""
import argparse
import hashlib
import json
import math
import pathlib
import struct
import sys
import time


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_glb(path):
    data = path.read_bytes()
    if struct.unpack_from('<III', data) != (0x46546C67, 2, len(data)):
        raise ValueError('Expected a complete GLB 2 file')
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    document = json.loads(data[20:20 + length])
    offset = 20 + length
    size, kind = struct.unpack_from('<II', data, offset)
    assert kind == 0x004E4942
    return document, bytearray(data[offset + 8:offset + 8 + size])


def write_glb(path, document, binary):
    binary += bytes((-len(binary)) % 4)
    document['buffers'] = [{'byteLength': len(binary)}]
    text = json.dumps(document, separators=(',', ':')).encode()
    text += b' ' * ((-len(text)) % 4)
    path.write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(text) + len(binary))
                     + struct.pack('<II', len(text), 0x4E4F534A) + text
                     + struct.pack('<II', len(binary), 0x004E4942) + binary)


def accessor_rows(document, binary, index):
    accessor = document['accessors'][index]
    assert 'sparse' not in accessor
    dimensions = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[accessor['type']]
    code, width = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[accessor['componentType']]
    view = document['bufferViews'][accessor['bufferView']]
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', dimensions * width)
    return [struct.unpack_from('<' + code * dimensions, binary, start + row * stride)
            for row in range(accessor['count'])]


def overwrite_float_accessor(document, binary, index, rows):
    accessor = document['accessors'][index]
    assert accessor['componentType'] == 5126 and accessor['count'] == len(rows)
    count = {'VEC3': 3, 'VEC4': 4}[accessor['type']]
    view = document['bufferViews'][accessor['bufferView']]
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', count * 4)
    for vertex, row in enumerate(rows):
        assert len(row) == count and all(math.isfinite(float(value)) for value in row)
        struct.pack_into('<' + 'f' * count, binary, start + vertex * stride, *row)


def smooth(a, b, value):
    factor = max(0, min(1, (value - a) / (b - a)))
    return factor * factor * (3 - 2 * factor)


def clear_normals(obj):
    import bpy
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    if obj.data.has_custom_normals:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for face in obj.data.polygons:
        face.use_smooth = True
    # Imported custom normals, rather than intentional hard edges, carried the source shading.
    for edge in obj.data.edges:
        edge.use_edge_sharp = False
    obj.data.update()
    # A rare nonmanifold vertex can have perfectly cancelling adjacent smooth normals.
    # Keep its actual visible face orientation rather than exporting a zero/nonfinite vector.
    import numpy as np
    values = np.empty((len(obj.data.loops), 3), dtype=np.float32)
    obj.data.corner_normals.foreach_get('vector', values.ravel())
    zero = np.linalg.norm(values, axis=1) < 1e-7
    repaired = int(np.count_nonzero(zero))
    if repaired:
        for face in obj.data.polygons:
            for index in face.loop_indices:
                if zero[index]:
                    values[index] = tuple(face.normal)
        assert np.all(np.linalg.norm(values, axis=1) > 1e-7)
        obj.data.normals_split_custom_set(values)
        obj.data.update()
    return repaired


def uniform_source_geometry(obj):
    """Normalize untouched source metres before reduction, without changing its supplied pose."""
    import numpy as np
    points = np.array([tuple(obj.matrix_world @ vertex.co) for vertex in obj.data.vertices], dtype=np.float64)
    minimum, maximum = points.min(axis=0), points.max(axis=0)
    center = (minimum + maximum) / 2
    scale = 1.8 / (maximum[2] - minimum[2])
    points = (points - np.array([center[0], center[1], minimum[2]])) * scale
    obj.data.vertices.foreach_set('co', points.astype(np.float32).ravel())
    obj.parent = None
    obj.matrix_world.identity()
    for modifier in obj.modifiers:
        if modifier.type == 'ARMATURE':
            modifier.show_viewport = modifier.show_render = False
    obj.data.update()
    return {'uniformSourceHeightMetres': 1.8, 'scale': float(scale)}


def original_arm_fields(points, receipt):
    """Anatomical membership is measured in original pose, never inferred from skirt/relaxed-arm overlap."""
    import numpy as np
    sy = receipt['runtime']['joints']['armL'][1]
    result = []
    for sign in (1, -1):
        angle = receipt['preparation']['armAnglesRadians'][str(sign)]
        projection = (points[:, 0] * sign - .215) * math.sin(angle) + (sy - points[:, 2]) * math.cos(angle)
        perpendicular = np.abs((points[:, 0] * sign - .215) * math.cos(angle) + (points[:, 2] - sy) * math.sin(angle))
        mask = (points[:, 0] * sign > .16) & (points[:, 2] > .64) & (points[:, 2] < 1.57) & (projection > -.045) & (perpendicular < .165)
        result.append((sign, angle, mask, projection))
    return result


def apply_frozen_rest(obj, receipt, preserve_source_normals=False):
    """Apply the existing receipt's rest field, retaining pre-transform anatomical masks for skin/paint."""
    import numpy as np
    points = np.array([tuple(vertex.co) for vertex in obj.data.vertices], dtype=np.float64)
    source_normals = None
    if preserve_source_normals:
        source_normals = np.empty((len(obj.data.loops), 3), dtype=np.float32)
        obj.data.corner_normals.foreach_get('vector', source_normals.ravel())
    fields = original_arm_fields(points, receipt)
    sy = receipt['runtime']['joints']['armL'][1]
    signs = np.zeros(len(points), dtype=np.int8)
    rotations = np.zeros(len(points), dtype=np.float64)
    for sign, angle, mask, projection in fields:
        signs[mask] = sign
        factor = np.clip((projection[mask] + .04) / (.085 + .04), 0, 1)
        factor = factor * factor * (3 - 2 * factor)
        rotation = -sign * max(0, angle - .10) * factor
        rotations[mask] = rotation
        dx, dy = points[mask, 0] - sign * .215, points[mask, 2] - sy
        points[mask, 0] = sign * .215 + dx * np.cos(rotation) - dy * np.sin(rotation)
        points[mask, 2] = sy + dx * np.sin(rotation) + dy * np.cos(rotation)
    ground = float(points[:, 2].min())
    points[:, 2] -= ground
    obj.data.vertices.foreach_set('co', points.astype(np.float32).ravel())
    obj.data.update()
    if source_normals is not None:
        vertices = np.array([loop.vertex_index for loop in obj.data.loops], dtype=np.int64)
        rotation = rotations[vertices]
        x, z = source_normals[:, 0].copy(), source_normals[:, 2].copy()
        source_normals[:, 0] = x * np.cos(rotation) - z * np.sin(rotation)
        source_normals[:, 2] = x * np.sin(rotation) + z * np.cos(rotation)
        lengths = np.linalg.norm(source_normals, axis=1)
        invalid = (~np.isfinite(lengths)) | (lengths < 1e-7)
        source_normal_fallbacks = int(np.count_nonzero(invalid))
        if source_normal_fallbacks:
            for face in obj.data.polygons:
                for corner in face.loop_indices:
                    if invalid[corner]: source_normals[corner] = tuple(face.normal)
            lengths = np.linalg.norm(source_normals, axis=1)
        assert np.isfinite(source_normals).all() and np.all(lengths > 1e-7)
        source_normals /= lengths[:, None]
        obj.data.normals_split_custom_set(source_normals)
        obj.data.update()
    else:
        source_normal_fallbacks = 0
    return signs, {'shoulderY': sy, 'anglesRadians': receipt['preparation']['armAnglesRadians'],
                   'originalPoseAnatomicalMasksCarriedToRest': True, 'groundOffsetMetres': ground,
                   'zeroSourceCornerNormalsRecoveredFromActualFace': source_normal_fallbacks,
                   'armVertexCounts': {str(sign): int(np.count_nonzero(signs == sign)) for sign in (1, -1)}}


def transfer_source_shading_normals(high, low):
    """Spatially transfer the original sculpt's healthy smooth corner normals to repaired geometry."""
    import numpy as np
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    high_mesh, low_mesh = high.data, low.data
    positions = np.array([tuple(vertex.co) for vertex in high_mesh.vertices], dtype=np.float64)
    high_mesh.calc_loop_triangles()
    triangles = list(high_mesh.loop_triangles)
    tree = BVHTree.FromPolygons([Vector(point) for point in positions], [tuple(face.vertices) for face in triangles], all_triangles=True)
    corners = np.empty((len(high_mesh.loops), 3), dtype=np.float32)
    high_mesh.corner_normals.foreach_get('vector', corners.ravel())
    transferred = np.empty((len(low_mesh.vertices), 3), dtype=np.float32)
    distances = []
    for vertex in low_mesh.vertices:
        location, normal, face_index, distance = tree.find_nearest(vertex.co)
        if location is None:
            raise ValueError('Repaired vertex has no original source surface')
        triangle = triangles[face_index]
        a, b, c = positions[list(triangle.vertices)]
        ab, ac, delta = b - a, c - a, np.array(location) - a
        d00, d01, d11 = np.dot(ab, ab), np.dot(ab, ac), np.dot(ac, ac)
        denominator = d00 * d11 - d01 * d01
        if abs(denominator) > 1e-24:
            beta = (d11 * np.dot(delta, ab) - d01 * np.dot(delta, ac)) / denominator
            gamma = (d00 * np.dot(delta, ac) - d01 * np.dot(delta, ab)) / denominator
            barycentric = np.array([1 - beta - gamma, beta, gamma])
        else:
            barycentric = np.array([1, 0, 0])
        source = barycentric @ corners[list(triangle.loops)]
        length = np.linalg.norm(source)
        if not math.isfinite(length) or length < 1e-7:
            source = np.array(normal); length = np.linalg.norm(source)
        transferred[vertex.index] = source / length
        distances.append(distance)
    loops = np.array([loop.vertex_index for loop in low_mesh.loops], dtype=np.int64)
    low_mesh.normals_split_custom_set(transferred[loops])
    for face in low_mesh.polygons: face.use_smooth = True
    low_mesh.update()
    return {'method': 'Barycentric original high sculpt corner normals at closest source surface',
            'vertexCount': len(transferred), 'sourceNormalTextureIgnored': True,
            'maximumSourceDistanceMetres': float(max(distances)),
            'medianSourceDistanceMetres': float(np.median(distances))}


def repair_exported_tangents(path):
    """Make the serialized basis finite/orthonormal while retaining Blender's UV handedness."""
    import numpy as np
    document, binary = read_glb(path)
    primitive = document['meshes'][0]['primitives'][0]
    attributes = primitive['attributes']
    normal = np.array(accessor_rows(document, binary, attributes['NORMAL']), dtype=np.float64)
    tangent = np.array(accessor_rows(document, binary, attributes['TANGENT']), dtype=np.float64)
    position = np.array(accessor_rows(document, binary, attributes['POSITION']), dtype=np.float64)
    indices = np.array(accessor_rows(document, binary, primitive['indices']), dtype=np.int64).reshape(-1, 3)
    assert np.all(np.abs(tangent[:, 3]) == 1), 'Blender exported an invalid tangent sign'
    vectors = tangent[:, :3] - normal * np.sum(normal * tangent[:, :3], axis=1)[:, None] / np.sum(normal * normal, axis=1)[:, None]
    lengths = np.linalg.norm(vectors, axis=1)
    invalid = lengths < 1e-12
    edge = np.zeros_like(position); longest = np.zeros(len(position))
    for triangle in indices:
        for corner in range(3):
            vertex = triangle[corner]
            if not invalid[vertex]: continue
            for other in triangle:
                vector = position[other] - position[vertex]
                vector -= normal[vertex] * np.dot(normal[vertex], vector) / np.dot(normal[vertex], normal[vertex])
                length = np.dot(vector, vector)
                if length > longest[vertex]: edge[vertex] = vector; longest[vertex] = length
    for vertex in np.flatnonzero(invalid):
        if longest[vertex] > 1e-24: vectors[vertex] = edge[vertex]
        else:
            axis = np.array([1, 0, 0]) if abs(normal[vertex, 0]) < .9 else np.array([0, 1, 0])
            vectors[vertex] = np.cross(normal[vertex], axis)
    vectors /= np.linalg.norm(vectors, axis=1)[:, None]
    tangent[:, :3] = vectors
    overwrite_float_accessor(document, binary, attributes['TANGENT'], tangent)
    write_glb(path, document, binary)
    report = {'zeroTangentVerticesRecoveredFromProjectedGeometry': int(np.count_nonzero(invalid)),
              'normalizedOrthogonalXYZ': True, 'BlenderHandednessWPreservedExactly': True,
              'maximumNormalDotTangentFloat64': float(np.max(np.abs(np.sum(normal * vectors, axis=1))))}
    print('STRICT_TANGENT_BASIS ' + json.dumps(report), flush=True)
    return report


def rebuilt_skinrows(low, receipt, arm_signs):
    """Retain the same eleven joint identities/axes and anatomical weight fields on repaired geometry."""
    sy = receipt['runtime']['joints']['armL'][1]
    lengths = {int(sign): length for sign, length in receipt['preparation']['armLengths'].items()}
    rows = []
    for vertex in low.data.vertices:
        x, z, y = map(float, vertex.co)
        forward = -z
        weights = None
        sign = int(arm_signs[vertex.index])
        if sign:
            upper, lower = (3, 4) if sign == 1 else (5, 6)
            blend = smooth(sy - lengths[sign] * .64, sy - lengths[sign] * .40, y)
            weights = {upper: blend, lower: 1 - blend}
        if weights is None:
            if y >= 1.42:
                blend = smooth(1.43, 1.57, y); weights = {1: 1 - blend, 2: blend}
            elif y >= .90:
                blend = smooth(.91, 1.16, y); weights = {0: 1 - blend, 1: blend}
            else:
                knee, hip = smooth(.40, .59, y), smooth(.78, .96, y)
                side = smooth(-.055, .055, x)
                weights = {7: side * knee * (1 - hip), 8: side * (1 - knee) * (1 - hip),
                           9: (1 - side) * knee * (1 - hip), 10: (1 - side) * (1 - knee) * (1 - hip)}
                if hip > 0: weights[0] = hip
        rows.append(((x, y, forward), [(joint, weight) for joint, weight in weights.items() if weight > 1e-7]))
    return rows


def topology_rebuild(args):
    """Reconnect source seams before collapse, then bake on a clean atlas with retained source UVs."""
    import bpy
    import bmesh
    import numpy as np
    import runpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    started = time.monotonic()
    output = args.output.resolve()
    if 'public' in output.parts:
        raise ValueError('Only offline candidate outputs are permitted')
    output.mkdir(parents=True, exist_ok=True)
    original = args.source.read_bytes(); baseline = args.runtime.read_bytes()
    receipt = json.loads(args.receipt.read_text())
    assert sha(original) == receipt['sourceSha256'] and sha(baseline) == receipt['runtime']['sha256']
    bpy.ops.wm.open_mainfile(filepath=str(args.workshop.resolve()), load_ui=False)
    old = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH')
    linen = next(node.image for material in old.data.materials for node in material.node_tree.nodes
                 if node.type == 'TEX_IMAGE' and node.image and node.inputs['Vector'].is_linked
                 and node.inputs['Vector'].links[0].from_node.type == 'VECT_MATH'
                 and node.inputs['Vector'].links[0].from_node.operation == 'SCALE')
    linen_provenance = {'name': linen.name, 'colorspace': linen.colorspace_settings.name,
                        'packedSourceSha256': sha(bytes(linen.packed_file.data)) if linen.packed_file else None}
    # Retain the original workshop input in memory only; discard its damaged reduced geometry.
    bpy.data.objects.remove(old, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()), merge_vertices=True)
    high = next(obj for obj in bpy.context.selected_objects if obj.type == 'MESH')
    high.name = 'Readonly original / source-connected rebuild'
    normalization = uniform_source_geometry(high)
    low = high.copy(); low.data = high.data.copy(); low.modifiers.clear()
    bpy.context.collection.objects.link(low); low.name = receipt['id']
    before_vertices = len(low.data.vertices)
    mesh = bmesh.new(); mesh.from_mesh(low.data)
    # glTF normal/UV seam vertices can remain physically disconnected even with merge_vertices=True.
    # Weld only positions within 20 micrometres; UV values remain per face corner, not vertex.
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.00002)
    degenerate = [face for face in mesh.faces if face.calc_area() < 1e-12]
    if degenerate: bmesh.ops.delete(mesh, geom=degenerate, context='FACES')
    mesh.to_mesh(low.data); mesh.free(); low.data.update()
    after_weld_vertices = len(low.data.vertices)
    group = low.vertex_groups.new(name='Source head and hand preservation')
    buckets = {.01: [], .85: [], .70: []}
    source_points = np.array([tuple(vertex.co) for vertex in low.data.vertices], dtype=np.float64)
    distal_hands = np.zeros(len(source_points), dtype=bool)
    for sign, angle, mask, projection in original_arm_fields(source_points, receipt):
        distal_hands |= mask & (projection > receipt['preparation']['armLengths'][str(sign)] * .72)
    for vertex in low.data.vertices:
        x, _, y = vertex.co
        weight = .85 if y > 1.43 else .70 if distal_hands[vertex.index] else .01
        buckets[weight].append(vertex.index)
    for weight, vertices in buckets.items():
        if vertices: group.add(vertices, weight, 'REPLACE')
    triangles = sum(len(face.vertices) - 2 for face in low.data.polygons)
    ratio = min(1, 46000 / triangles)
    bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active = low
    if triangles > 46000:
        for attempt in range(4):
            modifier = low.modifiers.new('Connected source / protected collapse', 'DECIMATE')
            modifier.ratio = ratio; modifier.use_collapse_triangulate = True
            modifier.vertex_group = group.name; modifier.vertex_group_factor = .85
            # The group marks regions to PRESERVE. Blender's group masks affected decimation,
            # so invert it: non-inverted high face weights caused the source chin to collapse inward.
            modifier.invert_vertex_group = True
            evaluated = low.evaluated_get(bpy.context.evaluated_depsgraph_get())
            count = sum(len(face.vertices) - 2 for face in evaluated.data.polygons)
            if count <= 48000:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
                break
            low.modifiers.remove(modifier); ratio *= 46000 / count * .98
        else: raise RuntimeError('Connected collapse exceeded the actor geometry budget')
    mesh = bmesh.new(); mesh.from_mesh(low.data)
    degenerate = [face for face in mesh.faces if face.calc_area() < 1e-12]
    if degenerate: bmesh.ops.delete(mesh, geom=degenerate, context='FACES')
    mesh.to_mesh(low.data); mesh.free(); low.data.update()
    # Remove invalid/duplicate authoring elements before atlas and bake, retaining all valid UV loops.
    validation_changed = low.data.validate(verbose=False, clean_customdata=False)
    low.data.update()
    high_arm_signs, high_rest = apply_frozen_rest(high, receipt, preserve_source_normals=True)
    low_arm_signs, low_rest = apply_frozen_rest(low, receipt)
    normalization.update({'highRest': high_rest, 'lowRest': low_rest})
    low_zero = clear_normals(low)
    transferred_shading = transfer_source_shading_normals(high, low)
    print('SOURCE_SHADING_NORMALS ' + json.dumps(transferred_shading), flush=True)
    authoring_triangles = sum(len(face.vertices) - 2 for face in low.data.polygons)
    assert authoring_triangles <= 48000
    # Confirm actual source-derived front coverage instead of trusting triangle counts or UV paint.
    high_bvh = BVHTree.FromObject(high, bpy.context.evaluated_depsgraph_get(), deform=False)
    low_bvh = BVHTree.FromObject(low, bpy.context.evaluated_depsgraph_get(), deform=False)
    coverage = []
    for x, y in [(-.023131, 1.555099), (0, 1.56), (.055424, 1.624644), (-.04, 1.565), (.04, 1.565)]:
        origin, direction = Vector((x, -1, y)), Vector((0, 1, 0))
        a = high_bvh.ray_cast(origin, direction, 2); b = low_bvh.ray_cast(origin, direction, 2)
        coverage.append({'x': x, 'y': y, 'sourceFrontZ': -a[0].y if a[0] else None,
                         'rebuiltFrontZ': -b[0].y if b[0] else None,
                         'depthErrorMetres': abs(a[0].y - b[0].y) if a[0] and b[0] else None})
    print('FRONT_COVERAGE ' + json.dumps(coverage), flush=True)
    # Original source UV values survive collapse per loop and remain available as the second GLB UV set.
    source_uv = np.empty(len(low.data.loops) * 2, dtype=np.float32)
    low.data.uv_layers.active.data.foreach_get('uv', source_uv)
    original_uv_name = low.data.uv_layers.active.name
    atlas = low.data.uv_layers.new(name='TervainSurface')
    low.data.uv_layers.active = atlas; atlas.active_render = True
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.0001)
    bpy.ops.object.mode_set(mode='OBJECT')
    low.data.uv_layers.remove(low.data.uv_layers[original_uv_name])
    retained = low.data.uv_layers.new(name='SourceUV')
    retained.data.foreach_set('uv', source_uv)
    low.data.uv_layers.active_index = 0; low.data.uv_layers[0].active_render = True
    assert low.data.uv_layers[0].name == 'TervainSurface'
    retained_check = np.empty(len(source_uv), dtype=np.float32); retained.data.foreach_get('uv', retained_check)
    assert np.array_equal(source_uv, retained_check)
    atlas_values = np.array([tuple(loop.uv) for loop in low.data.uv_layers[0].data], dtype=np.float64)
    atlas_faces = atlas_values.reshape(-1, 3, 2)
    ab, ac = atlas_faces[:, 1] - atlas_faces[:, 0], atlas_faces[:, 2] - atlas_faces[:, 0]
    area = np.abs(ab[:, 0] * ac[:, 1] - ab[:, 1] * ac[:, 0]) * .5
    texel_area = area * 1536 ** 2
    atlas_density = {'fractionalTriangleArea': float(area.sum()), 'medianTrianglePixels1536': float(np.median(texel_area)),
                     'subpixelTriangles1536': int(np.count_nonzero(texel_area < 1)), 'islandMargin': .0001}
    print('ATLAS_DENSITY ' + json.dumps(atlas_density), flush=True)
    assert area.sum() > .35, 'Active atlas wastes too much paint resolution'
    normal = bpy.data.images.new(receipt['id'] + ' / connected geometric normals', width=args.normal_size, height=args.normal_size, alpha=False)
    normal.colorspace_settings.name = 'Non-Color'
    normal.pixels.foreach_set(np.tile(np.array([.5, .5, 1, 1], dtype=np.float32), args.normal_size * args.normal_size))
    albedo = bpy.data.images.new(receipt['id'] + ' / connected source paint', width=1536, height=1536, alpha=False)
    albedo.colorspace_settings.name = 'sRGB'
    material = bpy.data.materials.new(receipt['id'] + ' / source-connected appearance'); material.use_nodes = True
    low.data.materials.clear(); low.data.materials.append(material)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Metallic'].default_value = .18 if receipt['preparation']['surface'] == 'armor' else 0
    bsdf.inputs['Roughness'].default_value = .78 if receipt['preparation']['surface'] == 'armor' else .89
    base_node = nodes.new('ShaderNodeTexImage'); base_node.image = albedo
    normal_node = nodes.new('ShaderNodeTexImage'); normal_node.image = normal
    nodes.active = normal_node
    for source_material in high.data.materials:
        source_bsdf = next(node for node in source_material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        for link in list(source_bsdf.inputs['Normal'].links): source_material.node_tree.links.remove(link)
    scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 1
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.bake.margin = 12; scene.render.bake.use_clear = False
    scene.render.bake.use_selected_to_active = True; scene.render.bake.cage_extrusion = .025; scene.render.bake.max_ray_distance = .08
    bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='NORMAL')
    # Existing mild palette/linen recipe on the original high paint, with neck/head adaptation excluded.
    points = np.array([tuple(vertex.co) for vertex in high.data.vertices])
    def field(a, b, values):
        factor = np.clip((values - a) / (b - a), 0, 1); return factor * factor * (3 - 2 * factor)
    cloth = (1 - field(1.31, 1.43, points[:, 2])) * field(.12, .32, points[:, 2])
    cloth[high_arm_signs != 0] *= field(.78, .97, points[high_arm_signs != 0, 2])
    if receipt['preparation']['surface'] == 'armor': cloth *= .13
    attribute = high.data.color_attributes.new(name='Tervain cloth / rebuilt source', type='FLOAT_COLOR', domain='POINT')
    attribute.data.foreach_set('color', np.stack([cloth, cloth, cloth, np.ones_like(cloth)], axis=1).astype(np.float32).ravel())
    for source_material in high.data.materials:
        nn, ll = source_material.node_tree.nodes, source_material.node_tree.links
        source_bsdf = next(node for node in nn if node.type == 'BSDF_PRINCIPLED')
        color = source_bsdf.inputs['Base Color'].links[0].from_socket
        mask = nn.new('ShaderNodeVertexColor'); mask.layer_name = attribute.name
        factor = nn.new('ShaderNodeMath'); factor.operation = 'MULTIPLY'; factor.inputs[1].default_value = .085
        ll.new(mask.outputs['Color'], factor.inputs[0])
        mix = nn.new('ShaderNodeMixRGB'); mix.blend_type = 'MIX'; mix.inputs[2].default_value = (*receipt['preparation']['palette'], 1)
        ll.new(factor.outputs[0], mix.inputs[0]); ll.new(color, mix.inputs[1])
        coord = nn.new('ShaderNodeTexCoord'); mapping = nn.new('ShaderNodeVectorMath'); mapping.operation = 'SCALE'; mapping.inputs[3].default_value = 8
        ll.new(coord.outputs['UV'], mapping.inputs[0])
        detail = nn.new('ShaderNodeTexImage'); detail.image = linen; detail.extension = 'REPEAT'; ll.new(mapping.outputs[0], detail.inputs['Vector'])
        grain = nn.new('ShaderNodeMixRGB'); grain.blend_type = 'MULTIPLY'; grain.inputs[0].default_value = .055
        ll.new(mix.outputs[0], grain.inputs[1]); ll.new(detail.outputs['Color'], grain.inputs[2])
        painted = nn.new('ShaderNodeMixRGB'); ll.new(mask.outputs['Color'], painted.inputs[0]); ll.new(mix.outputs[0], painted.inputs[1]); ll.new(grain.outputs[0], painted.inputs[2])
        emit = nn.new('ShaderNodeEmission'); ll.new(painted.outputs[0], emit.inputs[0])
        out = next(node for node in nn if node.type == 'OUTPUT_MATERIAL'); ll.new(emit.outputs[0], out.inputs['Surface'])
    nodes.active = base_node; bpy.ops.object.bake(type='EMIT')
    # Offline diagnostic: distinguish genuine source paint from projection misses.
    coverage_image = bpy.data.images.new(receipt['id'] + ' / projection coverage', width=1536, height=1536, alpha=False)
    coverage_image.colorspace_settings.name = 'Non-Color'
    base_node.image = coverage_image
    scene.render.bake.use_clear = True
    previous_surfaces = []
    for source_material in high.data.materials:
        nn, ll = source_material.node_tree.nodes, source_material.node_tree.links
        out = next(node for node in nn if node.type == 'OUTPUT_MATERIAL')
        previous_surfaces.append((source_material, out.inputs['Surface'].links[0].from_socket))
        white = nn.new('ShaderNodeEmission'); white.inputs[0].default_value = (1, 1, 1, 1)
        ll.new(white.outputs[0], out.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    for source_material, socket in previous_surfaces:
        out = next(node for node in source_material.node_tree.nodes if node.type == 'OUTPUT_MATERIAL')
        source_material.node_tree.links.new(socket, out.inputs['Surface'])
    coverage_image.filepath_raw = str(output / (receipt['id'] + '-projection-coverage.png'))
    coverage_image.file_format = 'PNG'; coverage_image.save()
    base_node.image = albedo; scene.render.bake.use_clear = False
    active_uv = nodes.new('ShaderNodeUVMap'); active_uv.uv_map = 'TervainSurface'
    links.new(active_uv.outputs[0], base_node.inputs['Vector'])
    links.new(active_uv.outputs[0], normal_node.inputs['Vector'])
    links.new(base_node.outputs['Color'], bsdf.inputs['Base Color'])
    mapping = nodes.new('ShaderNodeNormalMap'); mapping.uv_map = 'TervainSurface'; links.new(normal_node.outputs['Color'], mapping.inputs['Color']); links.new(mapping.outputs[0], bsdf.inputs['Normal'])
    images = {}
    for label, image in [('normal', normal), ('albedo', albedo)]:
        path = output / f'{receipt["id"]}-{label}.png'; image.filepath_raw = str(path); image.file_format = 'PNG'; image.save()
        pixels = np.empty(len(image.pixels), dtype=np.float32); image.pixels.foreach_get(pixels)
        assert np.isfinite(pixels).all()
        images[label] = {'path': str(path), 'bytes': path.stat().st_size, 'sha256': sha(path.read_bytes()), 'dimensions': list(image.size), 'finite': True}
    skinrows = rebuilt_skinrows(low, receipt, low_arm_signs)
    bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active = low
    candidate = output / (receipt['id'] + '-surface-candidate.glb')
    bpy.ops.export_scene.gltf(filepath=str(candidate), export_format='GLB', use_selection=True, export_animations=False,
                             export_materials='EXPORT', export_image_format='AUTO', export_extras=False, export_yup=True,
                             export_texcoords=True, export_normals=True, export_tangents=True)
    exported, buffer = read_glb(candidate)
    attrs = exported['meshes'][0]['primitives'][0]['attributes']
    uv_contract = {}
    for name, semantic in [('TervainSurface', 'TEXCOORD_0'), ('SourceUV', 'TEXCOORD_1')]:
        actual = accessor_rows(exported, buffer, attrs[semantic])
        expected = {}
        for item in low.data.uv_layers[name].data:
            value = (float(item.uv.x), 1 - float(item.uv.y))
            expected.setdefault(tuple(round(component * 100000) for component in value), []).append(value)
        missing = 0; max_error = 0
        for u, v in actual:
            key = (round(u * 100000), round(v * 100000))
            matches = [value for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                       for value in expected.get((key[0] + dx, key[1] + dy), [])]
            error = min((max(abs(u - value[0]), abs(v - value[1])) for value in matches), default=float('inf'))
            max_error = max(max_error, error)
            missing += error > 1e-7
        assert missing == 0, f'Exported {semantic} is not authoring layer {name}: {missing} values'
        uv_contract[semantic] = {'authoringLayer': name, 'allExportedUVsMatchLoopValues': True, 'maximumFloat32ExportError': max_error}
    prepare = runpy.run_path(str(pathlib.Path(__file__).with_name('prepare-meshy-npcs.py')))
    joints = [receipt['runtime']['joints'][name] for name in prepare['BONES']]
    result = prepare['add_skin'](candidate, skinrows, joints)
    tangent_basis = repair_exported_tangents(candidate)
    assert sha(args.source.read_bytes()) == sha(original) and sha(args.runtime.read_bytes()) == sha(baseline)
    report = {'schema': 1, 'status': 'offline topology prototype; native face/side/rear and full pose review required; not published',
              'tool': 'Blender ' + bpy.app.version_string, 'scriptSha256': sha(pathlib.Path(__file__).read_bytes()),
              'source': {'path': str(args.source), 'sha256': sha(original), 'unmodified': True},
              'preparedBefore': {'path': str(args.runtime), 'sha256': sha(baseline), 'unmodified': True},
              'frozenInputs': {'workshopSha256': sha(args.workshop.read_bytes()), 'receiptSha256': sha(args.receipt.read_bytes()),
                               'identitySkinHelperSha256': sha(pathlib.Path(__file__).with_name('prepare-meshy-npcs.py').read_bytes()),
                               'fabric': linen_provenance},
              'candidate': {'path': str(candidate), 'bytes': candidate.stat().st_size, 'sha256': sha(candidate.read_bytes()), **result},
              'topology': {'reason': 'Non-inverted Decimate group collapsed protected face regions, exposing rear surfaces; source seams are reconnected conservatively.',
                           'sourceVerticesBeforePositionalWeld': before_vertices, 'sourceVerticesAfterPositionalWeld': after_weld_vertices,
                           'weldToleranceMetres': .00002, 'sourceUVPreservedPerLoop': True, 'authoringTriangles': authoring_triangles,
                           'decimatePreservationGroupInverted': True, 'validationCleanedInvalidElements': bool(validation_changed),
                           'geometryChangedSourceDerived': True, 'cleanActiveBakeAtlas': 'TEXCOORD_0', 'retainedSourceUV': 'TEXCOORD_1'},
              'normalization': normalization, 'frontCoverageSourceComparison': coverage,
              'exportTangentBasis': tangent_basis,
              'sourceShadingNormalTransfer': transferred_shading,
              'exportUVContract': uv_contract,
              'activeAtlasDensity': atlas_density,
              'zeroGeometricCornersRepairedFromRealFace': {'low': low_zero, 'high': high_rest['zeroSourceCornerNormalsRecoveredFromActualFace']},
              'normalBake': {'originalSourceNormalTextureDisconnected': True, 'healthyOriginalSculptCornerNormalsRetained': True,
                             'neutralUncoveredTexels': [.5, .5, 1], 'tangentSpace': True},
              'paint': {'source': 'Original high source paint with original role palette/linen', 'paletteFraction': .085, 'linenFraction': .055,
                        'neckHeadMaskFadeMetres': [1.31, 1.43], 'previousFadeMetres': [1.39, 1.56]},
              'maps': images, 'seconds': round(time.monotonic() - started, 2)}
    (output / (receipt['id'] + '-surface-receipt.json')).write_text(json.dumps(report, indent=2) + '\n')
    print('TOPOLOGY_CANDIDATE ' + json.dumps(report['candidate']), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ('workshop', 'receipt', 'source', 'runtime', 'output'):
        parser.add_argument('--' + flag, type=pathlib.Path, required=True)
    parser.add_argument('--normal-size', type=int, default=1024)
    parser.add_argument('--redo-topology', action='store_true', help=argparse.SUPPRESS)
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    if not 256 <= arguments.normal_size <= 2048:
        parser.error('normal-size must be between 256 and 2048')
    topology_rebuild(arguments)
