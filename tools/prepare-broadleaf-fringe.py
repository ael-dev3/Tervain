#!/usr/bin/env python3
"""Native owner-source leaf alpha atlas for the small static exterior fringe.

Run Blender --background --factory-startup --offline-mode --disable-autoexec
--python tools/prepare-broadleaf-fringe.py -- --source /path/to/source.glb.
This renders isolated source leaf geometry with source albedo emission against
transparency; no environment, lighting, shadow or generated paint is baked.
Packaging downsizes these source patches into tiny quads, not crown billboards.
"""
import argparse, hashlib, json, math, pathlib, sys
import bpy
import numpy as np
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=pathlib.Path, required=True)
parser.add_argument('--workshop', type=pathlib.Path, default=ROOT/'out/ancient-guardian-workshop')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
assert hashlib.sha256(args.source.read_bytes()).hexdigest() == '53b103d7cbaa7ddedfe9cdbd2a5fae45d0caf82ad8ee2a8c3087fae9c6b3198d'
out = args.workshop.resolve(); out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.source.resolve())); source = bpy.context.object; mesh = source.data
mesh.calc_loop_triangles()
p = np.empty(len(mesh.vertices)*3, dtype=np.float32); mesh.vertices.foreach_get('co', p); p = p.reshape(-1,3)
t = np.empty(len(mesh.loop_triangles)*3, dtype=np.int32); mesh.loop_triangles.foreach_get('vertices', t); t = t.reshape(-1,3)
l = np.empty(len(mesh.loop_triangles)*3, dtype=np.int32); mesh.loop_triangles.foreach_get('loops', l); l = l.reshape(-1,3)
uv = np.empty(len(mesh.loops)*2, dtype=np.float32); mesh.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1,2)
paint = next(node.image for node in mesh.materials[0].node_tree.nodes if node.type == 'TEX_IMAGE')
pixels = np.empty(paint.size[0]*paint.size[1]*4, dtype=np.float32); paint.pixels.foreach_get(pixels); pixels = pixels.reshape(paint.size[1], paint.size[0],4)
centers = p[t].mean(1); tu = uv[l].mean(1); xy = np.clip((tu*np.array(paint.size)).astype(np.int32), 0, np.array(paint.size)-1)
colors = pixels[xy[:,1],xy[:,0],:3]
leaf = (centers[:,2] >= -.04) & (colors[:,1] > colors[:,0]*1.12) & (colors[:,1] > colors[:,2]*1.15)
lo, hi = centers[leaf].min(0), centers[leaf].max(0)
grid = np.clip(((centers-lo)/(hi-lo)*4).astype(np.int32), 0,3); keys = grid[:,0]+grid[:,1]*4+grid[:,2]*16
patches = [centers[leaf & (keys == key)].mean(0) for key in sorted(set(keys[leaf].tolist()))]
material = bpy.data.materials.new('Native source albedo only'); material.use_nodes = True; material.node_tree.nodes.clear()
output = material.node_tree.nodes.new('ShaderNodeOutputMaterial'); emission = material.node_tree.nodes.new('ShaderNodeEmission'); texture = material.node_tree.nodes.new('ShaderNodeTexImage'); texture.image = paint
material.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color']); material.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.render.threads_mode = 'FIXED'; scene.render.threads = 4; scene.cycles.samples = 1
scene.render.resolution_x = scene.render.resolution_y = 128; scene.render.resolution_percentage = 100; scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'None'; scene.view_settings.exposure = 0; scene.view_settings.gamma = 1
source.hide_render = True; bpy.ops.object.camera_add(); camera = bpy.context.object; camera.data.type = 'ORTHO'; scene.camera = camera
atlas = np.zeros((2560,2560,4), dtype=np.float32); records = []; slot = 0
directions = [Vector(v).normalized() for v in [(1,.35,.2),(-1,-.35,.2),(.25,1,.25),(-.25,-1,.25),(.35,.25,1),(-.35,.25,-1)]]
for patch_index, center in enumerate(patches):
    radius = float(np.max((hi-lo)/4)*.92); selected = leaf & (np.linalg.norm(centers-center, axis=1) < radius)
    vertices = p[t[selected]].reshape(-1,3); count = len(vertices)
    native = bpy.data.meshes.new('Native leaf patch'); native.vertices.add(count); native.vertices.foreach_set('co', vertices.ravel())
    native.loops.add(count); native.loops.foreach_set('vertex_index', np.arange(count,dtype=np.int32)); native.polygons.add(count//3)
    native.polygons.foreach_set('loop_start', np.arange(0,count,3,dtype=np.int32)); native.polygons.foreach_set('loop_total', np.full(count//3,3,dtype=np.int32))
    native.uv_layers.new(); native.uv_layers.active.data.foreach_set('uv', uv[l[selected]].ravel()); native.update(); native.materials.append(material)
    obj = bpy.data.objects.new('Native source foliage', native); scene.collection.objects.link(obj)
    for direction in directions:
        width = radius*2.12; camera.data.ortho_scale = width; camera.location = Vector(center)+direction*4
        camera.rotation_euler = (Vector(center)-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath = str(out/'tile.png'); bpy.ops.render.render(write_still=True)
        tile = bpy.data.images.load(str(out/'tile.png'), check_existing=False); values = np.empty(128*128*4,dtype=np.float32); tile.pixels.foreach_get(values); values = values.reshape(128,128,4)
        yy,xx = np.mgrid[-1:1:128j,-1:1:128j]; edge = np.clip((1-np.sqrt(xx*xx+yy*yy))/.2,0,1); values[:,:,3] *= edge*edge*(3-2*edge)
        x,y = (slot%20)*128,(slot//20)*128; atlas[y:y+128,x:x+128] = values; bpy.data.images.remove(tile)
        records.append({'tile': slot, 'center': center.tolist(), 'normal': list(direction), 'width': width}); slot += 1
    bpy.data.objects.remove(obj, do_unlink=True); bpy.data.meshes.remove(native)
    print('NATIVE FRINGE PATCH', patch_index, slot, flush=True)
image = bpy.data.images.new('Native source-alpha fringe',width=2560,height=2560,alpha=True); image.pixels.foreach_set(atlas.ravel()); image.filepath_raw = str(out/'crown.png'); image.file_format = 'PNG'; image.save()
(out/'crown-records.json').write_text(json.dumps(records,indent=2)+'\n')
print('SOURCE-ALPHA ATLAS', slot, flush=True)
