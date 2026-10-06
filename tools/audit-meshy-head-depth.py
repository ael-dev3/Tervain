"""Read-only source-versus-runtime head coverage audit; no assets are exported.

Run with Blender --background --python tools/audit-meshy-head-depth.py --
--source original.glb --prepared candidate.glb --output report.json

The original is normalized by the NPC pipeline's uniform 1.8m rule. Prepared
geometry stays in its actual bind coordinates. The default crop samples Mara's
central head, not every actor's whole head; wider/taller heads, hair and equipment
need separate bounds or native review. This audit is head-only: it does
not approximate the arm normalization field, evaluate animation or prove paint
quality. Depth loss and exact/near-coincident topology are measured independently
of native appearance. The optional loss limit is a review control, not an art rule.
"""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np


def mesh_snapshot(path, normalize_source=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path), merge_vertices=False)
    helpers = {bone.custom_shape for ob in bpy.context.scene.objects
               if ob.type == 'ARMATURE' for bone in ob.pose.bones if bone.custom_shape}
    coordinates, triangles = [], []
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH' or ob in helpers:
            continue
        ob.data.calc_loop_triangles()
        offset = len(coordinates)
        coordinates.extend(tuple(ob.matrix_world @ vertex.co) for vertex in ob.data.vertices)
        triangles.extend(tuple(offset + i for i in tri.vertices) for tri in ob.data.loop_triangles)
    if not coordinates:
        raise ValueError(f'No model mesh in {path}')
    points = np.asarray(coordinates, dtype=np.float64)
    low, high = points.min(axis=0), points.max(axis=0)
    if normalize_source:
        points = (points - [(low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]]) * (1.8 / (high[2] - low[2]))
    # Blender imports glTF into Z-up; return the runtime's Y-up coordinates.
    points = np.stack([points[:, 0], points[:, 2], -points[:, 1]], axis=1)
    vertices = [Vector(point) for point in points]
    return points, triangles, BVHTree.FromPolygons(vertices, triangles, all_triangles=True)


def components(mask):
    remaining = set(zip(*np.nonzero(mask)))
    found = []
    while remaining:
        first = remaining.pop()
        pending, members = [first], [first]
        while pending:
            y, x = pending.pop()
            for neighbor in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    pending.append(neighbor)
                    members.append(neighbor)
        ys, xs = zip(*members)
        found.append({'samples': len(members), 'pixelBoundsXY': [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]})
    return sorted(found, key=lambda row: row['samples'], reverse=True)


def interior_mask(mask, erosion=2):
    result = mask.copy()
    for _ in range(erosion):
        next_mask = np.zeros_like(result)
        next_mask[1:-1, 1:-1] = (result[1:-1, 1:-1] & result[:-2, 1:-1]
                                & result[2:, 1:-1] & result[1:-1, :-2] & result[1:-1, 2:])
        result = next_mask
    return result


def depth_view(source_bvh, prepared_bvh, bounds, view, resolution, loss_limit):
    # Each view samples the head independently; silhouette erosion excludes two
    # pixels of outer source outline from the stricter interior loss statistic.
    axis, sign = {'front': (2, 1), 'back': (2, -1), 'right': (0, 1), 'left': (0, -1)}[view]
    horizontal_axis = 0 if axis == 2 else 2
    horizontal_low, horizontal_high = bounds[horizontal_axis]
    vertical_low, vertical_high = bounds[1]
    hit_mask = np.zeros((resolution, resolution), dtype=bool)
    low_hit_mask, reversed_mask, source_reversed = hit_mask.copy(), hit_mask.copy(), hit_mask.copy()
    delta = np.zeros((resolution, resolution), dtype=np.float64)
    low_faces = np.full((resolution, resolution), -1, dtype=np.int64)
    direction = Vector((0, 0, 0))
    direction[axis] = -sign
    for y in range(resolution):
        for x in range(resolution):
            origin = Vector((0, 0, 0))
            origin[horizontal_axis] = horizontal_low + (x + .5) * (horizontal_high - horizontal_low) / resolution
            origin[1] = vertical_low + (y + .5) * (vertical_high - vertical_low) / resolution
            origin[axis] = sign * 2
            high_point, high_normal, _, _ = source_bvh.ray_cast(origin, direction, 4)
            if high_point is None:
                continue
            hit_mask[y, x] = True
            source_reversed[y, x] = sign * high_normal[axis] < 0
            low_point, low_normal, face, _ = prepared_bvh.ray_cast(origin, direction, 4)
            if low_point is not None:
                low_hit_mask[y, x] = True
                low_faces[y, x] = face
                delta[y, x] = sign * (high_point[axis] - low_point[axis])
                reversed_mask[y, x] = sign * low_normal[axis] < 0
    interior = interior_mask(hit_mask)
    behind = hit_mask & low_hit_mask & (delta > loss_limit)
    miss = hit_mask & ~low_hit_mask
    bad = interior & (behind | miss)
    count = int(interior.sum())
    face_counts = Counter(int(face) for face in low_faces[behind & interior] if face >= 0)
    colors = np.full((resolution, resolution, 4), [.12, .16, .2, 1.0], dtype=np.float32)
    colors[hit_mask] = [.1, .65, .18, 1]
    colors[behind] = [1, .13, .02, 1]
    colors[miss] = [1, 0, .5, 1]
    colors[hit_mask & low_hit_mask & (delta < -loss_limit)] = [.2, .3, 1, 1]
    colors[~interior & hit_mask] *= [.6, .6, .6, 1]
    present_delta = delta[interior & low_hit_mask]
    report = {
        'sourceHitSamples': int(hit_mask.sum()), 'sourceInteriorSamples': count,
        'lowMissSourceInteriorSamples': int((miss & interior).sum()),
        'lowBehindSourceInteriorSamples': int((behind & interior).sum()),
        'interiorLossFraction': float(bad.sum() / count) if count else None,
        'largestLossComponents': components(bad)[:12],
        'lowReversedFirstHitInteriorSamples': int((reversed_mask & interior).sum()),
        'sourceReversedFirstHitInteriorSamples': int((source_reversed & interior).sum()),
        'lowReversedWhereSourceForwardInteriorSamples': int((reversed_mask & ~source_reversed & interior).sum()),
        'reversedLowWhereSourceForwardLossSamples': int((reversed_mask & ~source_reversed & bad).sum()),
        'behindSourceFirstHitFaces': face_counts.most_common(15),
        'inwardDepthLossMPercentiles50_90_99_Max': [float(v) for v in np.percentile(present_delta, [50, 90, 99, 100])] if len(present_delta) else [],
    }
    return report, colors


def topology(points, triangles, head_y, quantum=None):
    groups, grouped = {}, []
    for point in points:
        key = tuple(float(v) for v in point) if quantum is None else tuple(int(round(v / quantum)) for v in point)
        grouped.append(groups.setdefault(key, len(groups)))
    edge_faces, duplicate_faces = defaultdict(list), Counter()
    degenerate, head_degenerate = 0, 0
    for face, triangle in enumerate(triangles):
        ids = [grouped[v] for v in triangle]
        duplicate_faces[tuple(sorted(ids))] += 1
        xyz = points[list(triangle)]
        head = bool(((xyz[:, 1] >= head_y[0]) & (xyz[:, 1] <= head_y[1])).any())
        if np.linalg.norm(np.cross(xyz[1] - xyz[0], xyz[2] - xyz[0])) * .5 < 1e-12:
            degenerate += 1
            head_degenerate += int(head)
        for k in range(3):
            a, b = ids[k], ids[(k + 1) % 3]
            if a != b:
                edge_faces[tuple(sorted((a, b)))].append((face, triangle[k], triangle[(k + 1) % 3]))
    boundaries, same_direction_head, same_direction_chin = [], 0, 0
    same_direction = 0
    front_chin = []
    for edge, faces in edge_faces.items():
        if len(faces) == 2:
            directions = [grouped[a] < grouped[b] for _, a, b in faces]
            if directions[0] == directions[1]:
                same_direction += 1
                _, a, b = faces[0]
                xyz = points[[a, b]]
                same_direction_head += int(((xyz[:, 1] >= head_y[0]) & (xyz[:, 1] <= head_y[1])).any())
                same_direction_chin += int(all(abs(v[0]) < .07 and 1.53 < v[1] < 1.61 and v[2] > .04 for v in xyz))
        if len(faces) != 1:
            continue
        face, a, b = faces[0]
        xyz = points[[a, b]]
        if ((xyz[:, 1] >= head_y[0]) & (xyz[:, 1] <= head_y[1])).any():
            boundaries.append({'face': face, 'points': xyz.tolist()})
        if all(abs(v[0]) < .07 and 1.53 < v[1] < 1.61 and v[2] > .04 for v in xyz):
            front_chin.append({'face': face, 'points': xyz.tolist()})
    return {
        'positionGrouping': 'exact world coordinates' if quantum is None else f'rounded {quantum}m',
        'spatialGroups': len(groups), 'boundaryEdges': sum(len(v) == 1 for v in edge_faces.values()),
        'nonManifoldEdges': sum(len(v) > 2 for v in edge_faces.values()),
        'inconsistentWindingManifoldEdges': same_direction,
        'headInconsistentWindingManifoldEdges': same_direction_head,
        'maraFrontChinInconsistentWindingManifoldEdges': same_direction_chin,
        'duplicateSpatialTriangles': sum(n - 1 for n in duplicate_faces.values() if n > 1),
        'degenerateTrianglesUnder1e-12M2': degenerate, 'headDegenerateTriangles': head_degenerate,
        'headBoundaryEdges': len(boundaries), 'headBoundaryExamples': boundaries[:15],
        'maraFrontChinBoundaryEdges': len(front_chin), 'maraFrontChinBoundaryExamples': front_chin[:15],
    }


def source_chin_topology(points, triangles):
    """Count real source edges in a local chin box without a huge global edge map."""
    inside = ((abs(points[:, 0]) < .07) & (points[:, 1] > 1.53)
              & (points[:, 1] < 1.61) & (points[:, 2] > .04))
    indices = np.asarray(triangles, dtype=np.int64)
    local = indices[np.sum(inside[indices], axis=1) >= 2]
    edges = defaultdict(list)
    for face in local:
        for k in range(3):
            a, b = face[k], face[(k + 1) % 3]
            if not (inside[a] and inside[b]):
                continue
            pa, pb = tuple(float(v) for v in points[a]), tuple(float(v) for v in points[b])
            if pa != pb:
                edges[tuple(sorted((pa, pb)))].append(pa < pb)
    return {'region': '|x|<.07,1.53<y<1.61,z>.04 metres',
            'localTrianglesWithTwoOrMoreVerticesInBox': len(local),
            'exactSpatialBoundaryEdgesInsideBox': sum(len(v) == 1 for v in edges.values()),
            'inconsistentWindingManifoldEdgesInsideBox': sum(len(v) == 2 and v[0] == v[1] for v in edges.values()),
            'nonManifoldEdgesInsideBox': sum(len(v) > 2 for v in edges.values())}


def self_test():
    source_points = [Vector((x, y, .12)) for x, y in [(-.1, 1.5), (.1, 1.5), (.1, 1.7), (-.1, 1.7)]]
    source = BVHTree.FromPolygons(source_points, [(0, 1, 2), (0, 2, 3)], all_triangles=True)
    # A front square ring with a real center opening and a rear sheet. A dark rear
    # first hit must remain a coverage failure despite different background RGB.
    points = source_points + [Vector((x, y, .12)) for x, y in [(-.04, 1.56), (.04, 1.56), (.04, 1.64), (-.04, 1.64)]]
    points += [Vector((p.x, p.y, -.04)) for p in source_points]
    triangles = [(0, 1, 5), (0, 5, 4), (1, 2, 6), (1, 6, 5), (2, 3, 7), (2, 7, 6), (3, 0, 4), (3, 4, 7), (8, 9, 10), (8, 10, 11)]
    low = BVHTree.FromPolygons(points, triangles, all_triangles=True)
    report, _ = depth_view(source, low, [(-.1, .1), (1.5, 1.7), (-.05, .13)], 'front', 64, .025)
    assert report['lowBehindSourceInteriorSamples'] > 500
    assert len(report['largestLossComponents']) == 1
    assert abs(report['inwardDepthLossMPercentiles50_90_99_Max'][-1] - .16) < 1e-6
    topo = topology(np.asarray([tuple(v) for v in points]), triangles, (1.5, 1.7))
    assert topo['boundaryEdges'] == 12 and topo['headDegenerateTriangles'] == 0
    reversed_triangles = [(0, 2, 1), (0, 2, 3)]
    reversed_plane = BVHTree.FromPolygons(source_points, reversed_triangles, all_triangles=True)
    flipped, _ = depth_view(source, reversed_plane, [(-.1, .1), (1.5, 1.7), (-.05, .13)], 'front', 64, .025)
    flipped_topology = topology(np.asarray([tuple(v) for v in source_points]), reversed_triangles, (1.5, 1.7))
    assert flipped['interiorLossFraction'] == 0
    assert flipped['lowReversedWhereSourceForwardInteriorSamples'] > 1000
    assert flipped_topology['inconsistentWindingManifoldEdges'] == 1
    # Tiny disconnected copies can look like UV seams. Exact and micrometre
    # grouping must distinguish them from both a closed fold and a real opening.
    seam_points = [source_points[i].copy() for i in (0, 1, 2, 0, 2, 3)]
    seam_points[3].x += .3e-6
    seam_points[4].x += .3e-6
    seam_array = np.asarray([tuple(v) for v in seam_points])
    seam_triangles = [(0, 1, 2), (3, 4, 5)]
    assert topology(seam_array, seam_triangles, (1.5, 1.7))['boundaryEdges'] == 6
    assert topology(seam_array, seam_triangles, (1.5, 1.7), 1e-6)['boundaryEdges'] == 4
    print('HEAD_DEPTH_SELF_TEST_PASS: rear-visible opening, reversed winding without coverage loss, and disconnected near-coincident seam distinguished', flush=True)


def main(args):
    if args.self_test:
        self_test()
        return
    if not args.source or not args.prepared or not args.output:
        raise ValueError('--source, --prepared and --output are required')
    if args.output.exists() and not args.overwrite:
        raise ValueError('Audit output already exists; use a fresh path or --overwrite')
    if not 32 <= args.resolution <= 512 or args.loss_mm <= 0:
        raise ValueError('Require resolution32..512 and positive loss-mm')
    views = args.views.split(',')
    if any(view not in ('front', 'back', 'right', 'left') for view in views):
        raise ValueError('Unknown view')
    high_points, high_triangles, high_bvh = mesh_snapshot(args.source, normalize_source=True)
    low_points, low_triangles, low_bvh = mesh_snapshot(args.prepared)
    bounds = [(-.115, .115), (args.head_low, args.head_high), (-.14, .17)]
    report = {
        'schema': 1, 'purpose': 'independent read-only head coverage/topology evidence; native gate remains required',
        'tool': {'blenderVersion': bpy.app.version_string, 'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},
        'source': {'path': str(args.source), 'sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(), 'triangles': len(high_triangles), 'normalization': 'uniform1.8m original model; source head unchanged by arm field'},
        'prepared': {'path': str(args.prepared), 'sha256': hashlib.sha256(args.prepared.read_bytes()).hexdigest(), 'triangles': len(low_triangles), 'vertices': len(low_points), 'actualHeightM': float(low_points[:, 1].max() - low_points[:, 1].min()), 'withinModel50kCap': len(low_triangles) <= 50000, 'capLimitation': 'file meshes only; complete actor attachments/equipment require the separate runtime cap check'},
        'sampling': {'resolutionPerView': args.resolution, 'headBoundsYupM': bounds, 'scope': 'Mara-like central head crop; per-family head heights and native silhouette review remain separate', 'sourceSilhouetteErosionPixels': 2, 'lossThresholdM': args.loss_mm / 1000, 'limitation': 'cropped bind-head surface coverage; not full cast/head/attachments, animation, arm normalization, albedo identity, normals or performance acceptance'},
        'topology': [topology(low_points, low_triangles, bounds[1], quantum) for quantum in (None, 1e-6)],
        'originalSourceChinTopology': source_chin_topology(high_points, high_triangles),
        'views': {},
    }
    image_rows = []
    for view in views:
        result, colors = depth_view(high_bvh, low_bvh, bounds, view, args.resolution, args.loss_mm / 1000)
        report['views'][view] = result
        image_rows.append(colors)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image_path = args.output.with_suffix('.png')
    image = bpy.data.images.new('independent-depth-coverage', width=args.resolution * len(views), height=args.resolution, alpha=True)
    image.pixels.foreach_set(np.concatenate(image_rows, axis=1).ravel())
    image.filepath_raw = str(image_path)
    image.file_format = 'PNG'
    image.save()
    report['overview'] = {'path': str(image_path), 'viewOrder': views, 'legend': 'green within depth bound; orange deeper low surface; pink no low hit; blue low ahead; dark source silhouette margin'}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print('HEAD_DEPTH_REPORT', str(args.output), flush=True)
    print(json.dumps({'triangles': len(low_triangles), 'views': {view: {key: row[key] for key in ('sourceInteriorSamples', 'lowMissSourceInteriorSamples', 'lowBehindSourceInteriorSamples', 'interiorLossFraction', 'largestLossComponents')} for view, row in report['views'].items()}}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ('source', 'prepared', 'output'):
        parser.add_argument('--' + flag, type=Path)
    parser.add_argument('--resolution', type=int, default=256)
    parser.add_argument('--views', default='front,right,back,left')
    parser.add_argument('--head-low', type=float, default=1.50)
    parser.add_argument('--head-high', type=float, default=1.73)
    parser.add_argument('--loss-mm', type=float, default=25)
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    main(parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []))
