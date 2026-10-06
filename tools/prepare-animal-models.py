#!/usr/bin/env python3
"""Prepare the supplied animal GLBs with Blender 4.3+ (no network access required).

blender -b -t 2 --python tools/prepare-animal-models.py -- \
  --uploads /path/to/uploads.json --output-root public/models/animals \
  --work-root /tmp/tervain-animal-preparation [--ids wolf-a wolf-b]

Add --manifest-out docs/engineering/animal-assets.json for a complete-input run.
Its generated metadata should then be independently checked before publication.

The uploads JSON is a local input list with {id,name,path}; source files are never
modified. Rigs use hand-reviewed anatomical profiles plus local foot estimates,
not a claim of captured or professionally retargeted motion. Source materials,
UVs and recognizable shapes survive decimation. The seated cat stays seated.
"""
import argparse
import hashlib
import json
import math
import sys
import struct
import os
import tempfile
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

# Metres at the withers, fore/hind body stations along source nose-to-tail,
# withers height and neck/head height as fractions of total source height.
PROFILES = {
 'bear-a': ('bear',1.05,.37,.77,.80,.75,.75),
 'bear-b': ('bear',1.0,.36,.76,.78,.76,.76),
 'lion': ('lion',1.05,.31,.65,.64,.74,.83),
 'tiger': ('tiger',1.0,.32,.71,.78,.77,.76),
 'wolf-a': ('wolf',.82,.32,.76,.64,.76,.82),
 'wolf-b': ('wolf',.84,.31,.67,.63,.75,.79),
 'wolf-c': ('wolf',.80,.38,.80,.71,.72,.80),
 'cat-a': ('cat',.34,.32,.72,.58,.73,.76),
 'cat-b': ('cat',.30,.27,.64,.44,.64,.83),
 'cat-c': ('cat',.33,.31,.72,.62,.72,.76),
 'dog-a': ('dog',.62,.31,.70,.63,.76,.81),
 'dog-b': ('dog',.48,.29,.79,.52,.72,.78),
 'boar-a': ('boar',.82,.43,.79,.73,.62,.64),
 'boar-b': ('boar',.85,.38,.76,.68,.64,.65),
 'boar-c': ('boar',.85,.38,.76,.68,.64,.65),
 'stag': ('deer',1.42,.33,.72,.49,.66,.70),
 'deer-mount': ('deer',1.35,.33,.79,.48,.66,.69),
 'deer-a': ('deer',1.34,.34,.76,.49,.65,.70),
 'deer-b': ('deer',1.32,.34,.77,.47,.62,.66),
}
TRIANGLE_TARGET=44500
TEXTURE_LIMIT=2048
FPS=30


def sha256(path):
 return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def triangles(mesh):
 mesh.data.calc_loop_triangles()
 return len(mesh.data.loop_triangles)


def vertices(mesh):
 a=np.empty(len(mesh.data.vertices)*3,dtype=np.float64)
 mesh.data.vertices.foreach_get('co',a)
 return a.reshape((-1,3))


def reset_scene():
 bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode!='OBJECT' else None
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for collection in (bpy.data.meshes,bpy.data.armatures,bpy.data.actions,bpy.data.materials,bpy.data.images):
  for block in list(collection):
   if block.users==0:collection.remove(block)


def import_mesh(path,name):
 bpy.ops.import_scene.gltf(filepath=str(path))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 if not meshes:raise ValueError('GLB contains no meshes')
 bpy.ops.object.select_all(action='DESELECT')
 for ob in meshes:
  world=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=world;ob.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.object.join()
 mesh=bpy.context.object;mesh.name=name
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 # Preserve authored split normals as well as UVs. Some sources use
 # disconnected fur surfaces whose appearance relies on those normals.
 return mesh


def reduce_geometry(mesh):
 original=triangles(mesh)
 if original>TRIANGLE_TARGET:
  modifier=mesh.modifiers.new('RuntimeTriangleBudget','DECIMATE')
  modifier.decimate_type='COLLAPSE';modifier.ratio=TRIANGLE_TARGET/original
  modifier.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=modifier.name)
 triangulate=mesh.modifiers.new('RuntimeTriangles','TRIANGULATE')
 bpy.ops.object.modifier_apply(modifier=triangulate.name)
 count=triangles(mesh)
 if count>50000:raise ValueError(f'Triangle budget exceeded: {count}')
 for poly in mesh.data.polygons:poly.use_smooth=True
 return original,count


def scale_textures():
 resized=[]
 for image in bpy.data.images:
  if image.type!='IMAGE' or not image.size[0] or not image.size[1]:continue
  w,h=image.size
  if max(w,h)>TEXTURE_LIMIT:
   factor=TEXTURE_LIMIT/max(w,h);image.scale(round(w*factor),round(h*factor));image.pack()
   resized.append({'image':image.name,'from':[w,h],'to':list(image.size)})
 return resized


def normalize(mesh,profile):
 species,withers,fore,hind,body,neck,head=profile
 v=vertices(mesh);low=v.min(0);high=v.max(0)
 factor=withers/((high[2]-low[2])*body)
 # Existing Blender basis is X lateral, -Y forward, Z up. glTF exporter
 # converts this to X lateral, +Z forward, Y up automatically.
 centre=(low+high)*.5
 mesh.data.transform(__import__('mathutils').Matrix.Translation((-centre[0],-centre[1],-low[2])))
 mesh.data.transform(__import__('mathutils').Matrix.Scale(factor,4))
 mesh.data.update()
 return factor


def make_rig(mesh,profile,animal_id):
 species,withers,fore,hind,body,neck,head=profile
 pts=vertices(mesh);low=pts.min(0);high=pts.max(0);W,L,H=high-low
 station=lambda t:float(low[1]+L*t)
 chest_y=station(fore);hip_y=station(hind);spine_z=H*body
 bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
 rig=bpy.context.object;rig.name=animal_id+'-Rig';rig.data.name=animal_id+'-Skeleton'
 rig.show_in_front=True;rig.data.display_type='STICK'
 for bone in list(rig.data.edit_bones):rig.data.edit_bones.remove(bone)
 specs={}
 def bone(name,a,b,parent=None,weight=True):
  eb=rig.data.edit_bones.new(name);eb.head=a;eb.tail=b
  if (Vector(a)-Vector(b)).length<.0001:eb.tail.z+=H*.02
  if parent:eb.parent=rig.data.edit_bones[parent]
  eb.use_deform=weight
  specs[name]={'head':list(eb.head),'tail':list(eb.tail),'parent':parent,'deform':weight}
  return eb
 bone('Root',(0,0,0),(0,H*.16,0),weight=False)
 bone('Pelvis',(0,hip_y,spine_z*.87),(0,hip_y,spine_z),'Root')
 bone('Spine',(0,hip_y,spine_z),(0,(hip_y+chest_y)/2,spine_z),'Pelvis')
 bone('Chest',(0,(hip_y+chest_y)/2,spine_z),(0,chest_y,spine_z),'Spine')
 head_y=station(max(.10,fore-.17))
 bone('Neck',(0,chest_y,spine_z),(0,head_y,H*neck),'Chest')
 bone('Head',(0,head_y,H*neck),(0,station(.035),H*head),'Neck')
 bone('Jaw',(0,head_y-H*.06,H*head-H*.095),(0,station(.025),H*head-H*.105),'Head')
 bone('Tail1',(0,hip_y,spine_z*.95),(0,station(min(.93,hind+.12)),spine_z*.80),'Pelvis')
 bone('Tail2',(0,station(min(.93,hind+.12)),spine_z*.80),(0,station(.99),spine_z*.55),'Tail1')
 feet={}
 for end,target in [('Front',chest_y),('Back',hip_y)]:
  for side,sign in [('Left',-1),('Right',1)]:
   mask=(pts[:,0]*sign>W*.035)&(np.abs(pts[:,1]-target)<L*.17)&(pts[:,2]<H*.22)
   candidates=pts[mask]
   if len(candidates)>15:
    candidates=candidates[candidates[:,2]<=np.quantile(candidates[:,2],.38)]
    fx,fy,fz=np.median(candidates,axis=0)
    fz=max(float(fz),H*.018)
   else:fx,fy,fz=sign*W*.26,target,H*.035
   # All four paws retain source stance offsets, including tiger bent legs.
   foot=(float(fx),float(fy),float(fz))
   x=sign*W*(.25 if end=='Front' else .29)
   attach_z=spine_z*(.89 if end=='Front' else .84)
   if animal_id=='cat-b' and end=='Back':attach_z=H*.24
   joint_y=target+(H*.045 if end=='Front' else -H*.08)
   knee=(x,joint_y,max(fz+H*.10,attach_z*.52))
   ankle=(float(fx),float(fy)+H*.025,float(fz)+H*.065)
   toe=(float(fx),float(fy)-H*.075,float(fz))
   parent='Chest' if end=='Front' else 'Pelvis'
   bone(end+side+'Upper',(x,target,attach_z),knee,parent)
   bone(end+side+'Lower',knee,ankle,end+side+'Upper')
   bone(end+side+'Foot',ankle,toe,end+side+'Lower')
   feet[end+side+'Foot']=foot
 bpy.ops.object.mode_set(mode='OBJECT')
 # Bind with normalized, smooth geometric envelopes. Restrict legs to their
 # anatomical side/end so nearby paws do not borrow opposite-leg weights.
 names=[n for n,s in specs.items() if s['deform']]
 scores=np.zeros((len(pts),len(names)),dtype=np.float64)
 belly=spine_z*.56
 for bi,name in enumerate(names):
  a=np.array(specs[name]['head']);b=np.array(specs[name]['tail']);d=b-a
  t=np.clip(((pts-a)@d)/(d@d),0,1)
  dist=np.linalg.norm(pts-(a+t[:,None]*d),axis=1)
  torso_bone=name in ('Pelvis','Spine','Chest')
  body_radius=.45 if animal_id=='cat-a' else .35
  radius=H*(body_radius if torso_bone else .16 if name in ('Neck','Head') else .075 if 'Foot' in name else .095)
  score=(1+np.square(dist/radius))**-3
  if name in ('Pelvis','Spine','Chest','Neck','Head','Jaw','Tail1','Tail2'):
   # Body envelopes fade below the belly, allowing lower limbs to articulate.
   if name not in ('Tail1','Tail2'):
    fade_height=H*.12 if animal_id=='cat-a' and torso_bone else belly*.8
    score*=np.clip(pts[:,2]/fade_height,.001,1)**4
    if animal_id=='cat-a' and torso_bone:
     # This stout source has a low hanging belly beside short hind legs.
     # Keep its lower torso attached to the body without taking the paws
     # away from the articulated limb chain.
     lower=np.clip((H*.45-pts[:,2])/(H*.25),0,1)
     score*=1+3*np.exp(-np.square(pts[:,0]/(W*.45)))*lower
  if name.startswith(('Front','Back')):
   sign=-1 if 'Left' in name else 1
   # Crossed or folded source legs can pass through the centreline. Let
   # continuous segment proximity and surface adjacency resolve the side.
   score*=np.exp(-np.maximum(0,-pts[:,0]*sign)/(H*.16))
   if animal_id=='cat-a':
    # Smoothly discourage a medial belly vertex from following a leg.
    score*=.35+.65*(1-np.exp(-np.square(pts[:,0]/(W*.28))))
   y=chest_y if name.startswith('Front') else hip_y
   score*=np.exp(-((pts[:,1]-y)/(L*.19))**6)
   score*=np.clip((spine_z*1.03-pts[:,2])/(spine_z*.22),.001,1)
  if name=='Jaw':
   score*=((pts[:,1]<head_y)&(pts[:,2]<H*head-H*.065))*0.35
  if name.startswith('Tail'):
   score*=np.clip((pts[:,1]-hip_y)/(L*.12),.001,1)
  if name=='Head':
   # Antlers and ears follow the head as a rigid head attachment; preserve
   # their silhouette rather than bending them with spine envelopes.
   crown=(pts[:,2]>H*max(neck+.10,body+.17))&(pts[:,1]<chest_y+L*.05)
   score[crown]=np.maximum(score[crown],10)
  scores[:,bi]=score
 # Smooth on welded geometry adjacency without welding or altering UVs,
 # normals, or the source shape. Coincident seam vertices share weights.
 scores/=scores.sum(axis=1,keepdims=True)
 _,weld=np.unique(np.round(pts/(H*1e-6)).astype(np.int64),axis=0,return_inverse=True)
 n_weld=int(weld.max()+1)
 weld_weights=np.zeros((n_weld,len(names)),dtype=np.float64)
 np.add.at(weld_weights,weld,scores)
 weld_counts=np.bincount(weld,minlength=n_weld)
 weld_weights/=weld_counts[:,None]
 edge_vertices=np.empty(len(mesh.data.edges)*2,dtype=np.int32)
 mesh.data.edges.foreach_get('vertices',edge_vertices)
 edges=np.sort(weld[edge_vertices.reshape((-1,2))],axis=1)
 edges=np.unique(edges[edges[:,0]!=edges[:,1]],axis=0)
 degree=np.bincount(edges.ravel(),minlength=n_weld)
 for _ in range(24):
  neighbors=np.zeros_like(weld_weights)
  np.add.at(neighbors,edges[:,0],weld_weights[edges[:,1]])
  np.add.at(neighbors,edges[:,1],weld_weights[edges[:,0]])
  average=neighbors/np.maximum(degree[:,None],1)
  weld_weights=np.where(degree[:,None]>0,.4*weld_weights+.6*average,weld_weights)
 scores=weld_weights[weld]
 # Select antler/skull components from high antler seeds, not every tall
 # vertex. Saddle pommels can reach skull height while remaining separate
 # geometry above the neck band; they must retain their body attachment.
 if species=='deer':
  weld_height=np.zeros(n_weld,dtype=np.float64)
  np.add.at(weld_height,weld,pts[:,2]);weld_height/=weld_counts
  skull_floor=H*(head-.07)
  allowed=weld_height>skull_floor
  parents=np.arange(n_weld,dtype=np.int32)
  def find_parent(index):
   while parents[index]!=index:
    parents[index]=parents[parents[index]];index=int(parents[index])
   return index
  for first,second in edges:
   if allowed[first] and allowed[second]:
    a=find_parent(int(first));b=find_parent(int(second))
    if a!=b:parents[b]=a
  antler_roots={find_parent(int(i)) for i in np.flatnonzero(weld_height>H*.8)}
  head_component=np.array([allowed[i] and find_parent(i) in antler_roots for i in range(n_weld)],dtype=bool)[weld]
  # Fade to the unmodified skin at the skull/neck boundary. In particular,
  # an edge crossing skull_floor never jumps from body weights to Head1.
  blend=np.clip((pts[:,2]-skull_floor)/(H*.04),0,1)
  blend=blend*blend*(3-2*blend);blend*=head_component
  scores*=1-blend[:,None];scores[:,names.index('Head')]+=blend
 top=np.argpartition(scores,-4,axis=1)[:,-4:]
 # Continuous top-four pruning: subtract the fifth-ranked envelope before
 # normalizing. A fourth/fifth crossover now has zero weight at the switch,
 # preventing a skinning discontinuity across adjacent triangle vertices.
 cutoff=np.partition(scores,-5,axis=1)[:,-5,None]
 weights=np.maximum(np.take_along_axis(scores,top,axis=1)-cutoff,0)
 totals=weights.sum(axis=1,keepdims=True)
 if np.any(totals<=0):raise ValueError('Degenerate skin envelopes')
 weights/=totals
 for bi,name in enumerate(names):
  vg=mesh.vertex_groups.new(name=name)
  inds,cols=np.where(top==bi)
  # Quantize 1/1024 only for batching Blender group calls; renormalize below.
  bucket=np.round(weights[inds,cols]*1024).astype(int)
  for value in np.unique(bucket):
   chosen=inds[bucket==value]
   if value>0:vg.add(chosen.tolist(),float(value)/1024,'REPLACE')
 # Blender exporter renormalizes weights, but normalize editable source too.
 for vertex in mesh.data.vertices:
  total=sum(g.weight for g in vertex.groups)
  if total<=0:raise ValueError('Unbound vertex')
  for group in vertex.groups:mesh.vertex_groups[group.group].add([vertex.index],group.weight/total,'REPLACE')
 mod=mesh.modifiers.new('AnimalSkin','ARMATURE');mod.object=rig
 mesh.parent=rig;mesh.matrix_parent_inverse=rig.matrix_world.inverted()
 return rig,specs,feet


def animate(mesh,rig,profile,animal_id):
 species=profile[0];H=max(b.tail_local.z for b in rig.data.bones)
 scene=bpy.context.scene;scene.render.fps=FPS
 rig.animation_data_create()
 clips=[('Idle',3.0),('Walk',1.2),('Run',.8),('Call',2.4)]
 if species in ('deer','boar'):clips.append(('Graze',3.0))
 for name,duration in clips:
  action=bpy.data.actions.new(name);rig.animation_data.action=action
  frames=round(duration*FPS)
  for frame in range(0,frames+1,2):
   scene.frame_set(frame)
   t=frame/frames;cycle=math.sin(t*math.tau);wave=math.sin(t*math.tau)
   for pb in rig.pose.bones:
    pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
   rig.pose.bones['Chest'].scale.y=1+.009*wave
   rig.pose.bones['Neck'].rotation_euler.x=.018*wave
   rig.pose.bones['Head'].rotation_euler.z=.025*wave
   rig.pose.bones['Tail1'].rotation_euler.z=.06*wave
   rig.pose.bones['Tail2'].rotation_euler.z=.09*math.sin(t*math.tau+.5)
   if name in ('Walk','Run'):
    amp=.24 if name=='Walk' else .43
    if animal_id=='cat-b':amp*=.45
    if animal_id=='cat-a':amp*=.60  # Short, genuine strides for the stout standing cat.
    for end in ('Front','Back'):
     for side in ('Left','Right'):
      phase=0 if (end=='Front')==(side=='Left') else math.pi
      if name=='Run':phase=(0 if end=='Front' else math.pi*.65)+(0 if side=='Left' else .28)
      step=math.sin(t*math.tau+phase);lift=max(0,math.cos(t*math.tau+phase))
      rig.pose.bones[end+side+'Upper'].rotation_euler.x=amp*step
      rig.pose.bones[end+side+'Lower'].rotation_euler.x=-amp*.6*step-amp*.65*lift
      rig.pose.bones[end+side+'Foot'].rotation_euler.x=-amp*.35*step+amp*.45*lift
    rig.pose.bones['Spine'].rotation_euler.x=.02*wave if name=='Walk' else .045*wave
    rig.pose.bones['Pelvis'].rotation_euler.z=(.015 if name=='Walk' else .025)*wave
   elif name=='Call':
    call=math.sin(math.pi*t)**2
    rig.pose.bones['Neck'].rotation_euler.x=-.12*call
    rig.pose.bones['Head'].rotation_euler.x=-.07*call
    rig.pose.bones['Jaw'].rotation_euler.x=.11*call
    rig.pose.bones['Tail1'].rotation_euler.z=.14*cycle
   elif name=='Graze':
    lower=math.sin(math.pi*t)**2
    rig.pose.bones['Neck'].rotation_euler.x=.38*lower
    rig.pose.bones['Head'].rotation_euler.x=.26*lower
    rig.pose.bones['Jaw'].rotation_euler.x=.045*math.sin(t*math.tau*4)*lower
   # Solve a vertical root correction against actual skinned paw geometry.
   # This supplements articulated limbs with contact, rather than sliding the
   # unrigged object or allowing FK arcs to pass through the floor.
   bpy.context.view_layer.update()
   evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
   evaluated_mesh=evaluated.to_mesh()
   min_z=min(v.co.z for v in evaluated_mesh.vertices)
   evaluated.to_mesh_clear()
   rig.pose.bones['Root'].location.z=-min_z
   rig.pose.bones['Root'].keyframe_insert(data_path='location',frame=frame)
   for pb in rig.pose.bones:
    if pb.name=='Root':continue
    pb.keyframe_insert(data_path='rotation_euler',frame=frame)
    if pb.name=='Chest':pb.keyframe_insert(data_path='scale',frame=frame)
  for fc in action.fcurves:
   for kp in fc.keyframe_points:kp.interpolation='LINEAR'
  track=rig.animation_data.nla_tracks.new();track.name=name
  strip=track.strips.new(name,0,action);strip.action_frame_start=0;strip.action_frame_end=frames
  strip.frame_start=0;strip.frame_end=frames
  track.mute=True
 rig.animation_data.action=None
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
 scene.frame_set(0)
 return clips


def render_validation(mesh,rig,animal_id,work_root):
 scene=bpy.context.scene
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.color_type='TEXTURE'
 scene.display.shading.light='STUDIO';scene.display.shading.show_cavity=True;scene.display.shading.show_shadows=True
 scene.display.shading.background_type='WORLD';scene.world.color=(.13,.13,.13)
 scene.render.resolution_x=512;scene.render.resolution_y=384;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='Standard'
 points=[mesh.matrix_world@Vector(c) for c in mesh.bound_box]
 low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 mid=(low+high)*.5;dim=max(high-low)
 bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera
 camera.data.type='ORTHO';camera.data.ortho_scale=max(high.y-low.y,(high.z-low.z)*512/384)*1.16
 camera.location=mid+Vector((1,0,.10))*dim*3
 camera.rotation_euler=(mid-camera.location).to_track_quat('-Z','Y').to_euler()
 for clip in ('Idle','Walk','Run','Call'):
  action=bpy.data.actions.get(clip);rig.animation_data.action=action
  scene.frame_set(round(action.frame_range[1]*.25))
  scene.render.filepath=str(work_root/'prepared'/f'{animal_id}-{clip}.png');bpy.ops.render.render(write_still=True)
 rig.animation_data.action=None;scene.frame_set(0)
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
 bpy.data.objects.remove(camera,do_unlink=True)


def prepare(item,args):
 animal_id=item['id'];profile=PROFILES[animal_id]
 if not item.get('path'):
  return {'id':animal_id,'species':profile[0],'status':'missing','source':{'name':item['name']},'reason':'Source asset is unavailable; this distinct variant is not included. No replacement has been substituted.'}
 source=Path(item['path'])
 reset_scene();mesh=import_mesh(source,animal_id)
 original,count=reduce_geometry(mesh);factor=normalize(mesh,profile)
 resized=scale_textures();rig,specs,feet=make_rig(mesh,profile,animal_id)
 clips=animate(mesh,rig,profile,animal_id)
 output=args.output_root/(animal_id+'.glb')
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 export_path=args.work_root/'exports'/(animal_id+'.glb')
 export_path.parent.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(export_path),export_format='GLB',use_selection=True,
  export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,
  export_skins=True,export_all_influences=False,export_def_bones=True,
  export_anim_single_armature=True,export_optimize_animation_size=True,
  export_yup=True,export_extras=True)
 exported_bytes=export_path.read_bytes()
 exported_json_length=struct.unpack_from('<I',exported_bytes,12)[0]
 exported_json=json.loads(exported_bytes[20:20+exported_json_length])
 exported_triangles=sum(exported_json['accessors'][p['indices']]['count']//3 for m in exported_json['meshes'] for p in m['primitives'])
 if exported_triangles>50000:raise ValueError('Exported GLB exceeds triangle budget')
 required_clips={'Idle','Walk','Run','Call'}
 if not required_clips.issubset({a['name'] for a in exported_json['animations']}):raise ValueError('Exported GLB is missing required native clips')
 if not exported_json.get('skins'):raise ValueError('Exported GLB is missing a skin')
 # Readers see a complete prior asset or a complete new asset, never a
 # partially written binary during browser checks or parallel preparation.
 # The work root may be on a different filesystem (for example /tmp).
 # Stage bytes beside the destination so the final rename stays atomic.
 staged_path=None
 try:
  with tempfile.NamedTemporaryFile(dir=output.parent,prefix='.'+animal_id+'-',suffix='.tmp',delete=False) as staged:
   staged_path=Path(staged.name);staged.write(exported_bytes)
   staged.flush();os.fsync(staged.fileno())
  os.replace(staged_path,output)
 finally:
  if staged_path is not None:staged_path.unlink(missing_ok=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(args.work_root/'blends'/(animal_id+'.blend')))
 render_validation(mesh,rig,animal_id,args.work_root)
 pts=vertices(mesh);low=pts.min(0);high=pts.max(0)
 glb_bytes=output.read_bytes();json_length=struct.unpack_from('<I',glb_bytes,12)[0]
 glb_json=json.loads(glb_bytes[20:20+json_length])
 joint_count=max(len(skin['joints']) for skin in glb_json['skins'])
 # Convert Blender coordinates to runtime glTF coordinates: x,z,-y.
 to_runtime=lambda p:[round(float(p[0]),6),round(float(p[2]),6),round(float(-p[1]),6)]
 bounds={'min':[float(low[0]),float(low[2]),float(-high[1])],'max':[float(high[0]),float(high[2]),float(-low[1])]}
 result={'id':animal_id,'species':profile[0],'status':'ready',
  'source':{'name':item['name'],'sha256':sha256(source),'bytes':source.stat().st_size,'triangles':original},
  'asset':{'url':'/models/animals/'+output.name,'sha256':sha256(output),'bytes':output.stat().st_size,'triangles':count,'joints':joint_count,'bounds':bounds,'units':'metres','upAxis':'+Y','forwardAxis':'+Z','groundY':0},
  'rig':{'type':'skinned-skeletal','weightMethod':'reviewed-anatomical-envelopes-welded-adjacency-smoothed-continuous-top-four-normalized','bones':list(specs),'restFootPositions':{n:to_runtime(p) for n,p in feet.items()},'seatedRestPose':animal_id=='cat-b'},
  'animations':[{'name':n,'duration':d,'loop':n not in ('Call','Graze')} for n,d in clips],
  'processing':{'sourceScaleToMetres':factor,'maxTextureDimension':TEXTURE_LIMIT,'resizedTextures':resized,'triangleTarget':TRIANGLE_TARGET,'motionProvenance':'Procedural skeletal FK cycles authored for this asset; not source motion capture. Seated cat preserves source pose.'}}
 (args.work_root/(animal_id+'-report.json')).write_text(json.dumps(result,indent=2)+'\n')
 print('PREPARED',animal_id,count,output.stat().st_size,flush=True)
 return result


def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--uploads',type=Path,required=True)
 ap.add_argument('--output-root',type=Path,default=Path('public/models/animals'))
 ap.add_argument('--work-root',type=Path,required=True)
 ap.add_argument('--ids',nargs='*')
 ap.add_argument('--manifest-out',type=Path)
 args=ap.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
 args.output_root=args.output_root.resolve();args.work_root=args.work_root.resolve()
 args.output_root.mkdir(parents=True,exist_ok=True)
 for child in ('prepared','blends'):(args.work_root/child).mkdir(parents=True,exist_ok=True)
 inputs=json.loads(args.uploads.read_text())
 if args.manifest_out and args.ids:ap.error('--manifest-out requires a full input run, without --ids')
 results=[]
 for item in inputs:
  if args.ids and item['id'] not in args.ids:continue
  try:results.append(prepare(item,args))
  except Exception as exc:
   print('FAILED',item['id'],type(exc).__name__,str(exc),flush=True)
   raise
 if args.manifest_out:
  ready=[asset for asset in results if asset['status']=='ready']
  manifest={'schemaVersion':1,'requestedCount':len(results),'readyCount':len(ready),
   'missingCount':len(results)-len(ready),'triangleBudgetPerModel':50000,
   'triangleTarget':TRIANGLE_TARGET,'totalReadyTriangles':sum(m['asset']['triangles'] for m in ready),
   'totalReadyBytes':sum(m['asset']['bytes'] for m in ready),
   'units':'metres','upAxis':'+Y','forwardAxis':'+Z',
   'motionProvenance':'Procedural skeletal FK cycles; sources had no rigs or animations. Independently validate generated output before publication.',
   'assets':results}
  args.manifest_out.parent.mkdir(parents=True,exist_ok=True)
  args.manifest_out.write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
