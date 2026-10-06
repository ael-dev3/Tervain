#!/usr/bin/env python3
"""Native Blender source-volume reduction and whole-surface baking.

Run Blender --background --factory-startup --offline-mode --disable-autoexec
--python tools/prepare-broadleaf.py -- --source /path/to/owner/source.glb
--workshop /path/to/workshop. Originals are read only. An isotropic 0.016 source-
unit volume union retains the branched crown, trunk and roots; a 19k collapse
limits geometry. Whole-surface source albedo/sculpt normals are baked onto a
new UV layout. Package with tools/package-broadleaf.py after native review.
This is source-derived retopology, not unchanged source topology or UVs.
"""
import bpy,numpy as np,math,pathlib,json
import argparse,sys,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=pathlib.Path,required=True);parser.add_argument('--workshop',type=pathlib.Path,default=ROOT/'out/guardian-volume');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []);SOURCE=args.source.resolve();OUT=args.workshop.resolve();OUT.mkdir(exist_ok=True,parents=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='53b103d7cbaa7ddedfe9cdbd2a5fae45d0caf82ad8ee2a8c3087fae9c6b3198d', 'Unexpected owner source'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(SOURCE));high=bpy.context.object;low=high.copy();low.data=high.data.copy();bpy.context.collection.objects.link(low);bpy.ops.object.select_all(action='DESELECT');low.select_set(True);bpy.context.view_layer.objects.active=low
mod=low.modifiers.new('Original crown volume','REMESH');mod.mode='VOXEL';mod.voxel_size=.016;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name);low.data.calc_loop_triangles();count=len(low.data.loop_triangles);print('VOXEL',count,flush=True);mod=low.modifiers.new('Whole tree 19k','DECIMATE');mod.ratio=min(1,19000/count);mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name);low.data.validate(clean_customdata=False);low.data.calc_loop_triangles();print('REDUCED',len(low.data.loop_triangles),flush=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.001);bpy.ops.object.mode_set(mode='OBJECT')
mat=bpy.data.materials.new('Guardian source-painted volume');mat.use_nodes=True;low.data.materials.clear();low.data.materials.append(mat);bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92;bs.inputs['Metallic'].default_value=0
albedo=bpy.data.images.new('Guardian volume paint',width=2048,height=2048);tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=albedo;mat.node_tree.nodes.active=tex
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.render.threads_mode='FIXED';scene.render.threads=4;scene.cycles.samples=1;scene.render.bake.use_selected_to_active=True;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.cage_extrusion=.025;scene.render.bake.max_ray_distance=.065;scene.render.bake.margin=10
high.select_set(True);low.select_set(True);bpy.context.view_layer.objects.active=low;bpy.ops.object.bake(type='DIFFUSE');albedo.filepath_raw=str(OUT/'volume-paint.png');albedo.file_format='PNG';albedo.save();albedo.pack();mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
normal=bpy.data.images.new('Guardian source sculpt normals',width=2048,height=2048);normal.colorspace_settings.name='Non-Color';ntex=mat.node_tree.nodes.new('ShaderNodeTexImage');ntex.image=normal;mat.node_tree.nodes.active=ntex;bpy.ops.object.bake(type='NORMAL');normal.filepath_raw=str(OUT/'volume-normal.png');normal.file_format='PNG';normal.save();normal.pack();nmap=mat.node_tree.nodes.new('ShaderNodeNormalMap');nmap.inputs['Strength'].default_value=.7;mat.node_tree.links.new(ntex.outputs['Color'],nmap.inputs['Color']);mat.node_tree.links.new(nmap.outputs['Normal'],bs.inputs['Normal'])
bpy.ops.object.select_all(action='DESELECT');low.select_set(True);bpy.context.view_layer.objects.active=low;bpy.ops.export_scene.gltf(filepath=str(OUT/'guardian-volume.glb'),export_format='GLB',use_selection=True,export_animations=False);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'guardian-volume.blend'))
