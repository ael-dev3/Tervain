#!/usr/bin/env python3
"""Inspect and prepare owner-supplied 0.0.12 tree sources in installed Blender.

Originals are read only. Use --stage inspect to render every native source, then
--stage prepare after the source/habitat configuration has been reviewed.
"""
import argparse, hashlib, json, math, pathlib, struct, sys, time

SOURCES = [
    ('palm-fan', 'Meshy_AI_Palm_Tree_1004201606_generate.glb'),
    ('palm-lean', 'Meshy_AI_Palm_Tree_1004201604_generate.glb'),
    ('palm-date', 'Meshy_AI_Palm_Tree_1004160953_texture.glb'),
    ('fir-spire', 'Meshy_AI_fir_tree_1004113655_texture.glb'),
    ('oak-elder', 'Meshy_AI_Oak_Tree_1004141950_texture.glb'),
    ('tree-0208', 'Meshy_AI_a_tree_1004170208_texture.glb'),
    ('tree-1537', 'Meshy_AI_a_tree_1004201537_texture.glb'),
    ('tree-1527', 'Meshy_AI_tree_1004201527_texture.glb'),
    ('tree-1521', 'Meshy_AI_tree_1004201521_texture.glb'),
    ('tree-4949', 'Meshy_AI_tree_1004164949_texture.glb'),
    ('tree-3106', 'Meshy_AI_tree_1004003106_texture.glb'),
    ('tree-1505', 'Meshy_AI_tree_1004201505_texture.glb'),
    ('tree-1459', 'Meshy_AI_tree_1004201459_texture.glb'),
    ('tree-4815', 'Meshy_AI_tree_1004164815_texture.glb'),
]

def mesh_import(source):
    import bpy, numpy as np
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), merge_vertices=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert len(meshes) == 1, (source.name, len(meshes))
    ob = meshes[0]
    points = np.array([tuple(ob.matrix_world @ v.co) for v in ob.data.vertices])
    lo, hi = points.min(axis=0), points.max(axis=0)
    assert hi[2] > lo[2]
    scale = 12 / (hi[2] - lo[2])
    points = (points - np.array([(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, lo[2]]))*scale
    ob.data.vertices.foreach_set('co', points.astype(np.float32).ravel())
    ob.matrix_world.identity(); ob.data.update()
    return ob, {'originalBlenderBounds': [lo.tolist(), hi.tolist()], 'uniformNormalization': scale}

def render(ob, target, yaw=0.7):
    import bpy
    from mathutils import Vector
    scene = bpy.context.scene
    for old in list(scene.objects):
        if old.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(old,do_unlink=True)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 640; scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = 'RGBA'
    scene.world = bpy.data.worlds.new('Neutral tree study')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.075,.09,.105,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8
    scene.view_settings.view_transform = 'AgX'
    for loc, power, size in [((-10,-12,18),2200,10),((9,4,14),1700,8),((-2,8,5),900,7)]:
        data=bpy.data.lights.new('Study softbox','AREA');data.energy=power;data.shape='DISK';data.size=size
        light=bpy.data.objects.new('Study softbox',data);scene.collection.objects.link(light);light.location=loc
        light.rotation_euler=(Vector((0,0,6))-light.location).to_track_quat('-Z','Y').to_euler()
    camdata=bpy.data.cameras.new('Tree study camera');cam=bpy.data.objects.new('Tree study camera',camdata);scene.collection.objects.link(cam)
    cam.location=(20*math.sin(yaw),-20*math.cos(yaw),10)
    cam.rotation_euler=(Vector((0,0,6))-cam.location).to_track_quat('-Z','Y').to_euler()
    camdata.type='ORTHO';camdata.ortho_scale=15.5;scene.camera=cam
    # The source meshes and materials are rendered without preview decimation.
    scene.render.filepath=str(target);bpy.ops.render.render(write_still=True)

HABITATS = {
    'palm-fan': ('sun-fan palm', 'sheltered warm strand', True),
    'palm-lean': ('saltwind palm', 'warm coastal hollow', True),
    'palm-date': ('strand palm', 'warm coastal hollow', True),
    'fir-spire': ('ridge fir', 'cool stony ridge', True),
    'oak-elder': ('elder oak', 'broadleaf woodland', True),
    'tree-0208': ('many-stem elder', 'old woodland hollow', True),
    'tree-1537': ('gnarled oak', 'wood-only dead woodland variant', True),
    'tree-1527': ('mist alder', 'damp sheltered swale', True),
    'tree-1521': ('meadow oak', 'dry woodland margin', True),
    'tree-4949': ('round-crown oak', 'orchard/coppice', True),
    'tree-3106': ('coppice tree', 'coppice reserve', False),
    'tree-1505': ('rooted oak', 'open stony woodland', True),
    'tree-1459': ('orchard tree', 'orchard reserve', False),
    'tree-4815': ('river broadleaf', 'sheltered river grove', True),
}
CARD_SOURCES={'palm-fan','palm-lean','fir-spire','oak-elder','tree-0208','tree-1537','tree-1521','tree-4949','tree-1505','tree-4815'}

def select(ob):
    import bpy
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True);bpy.context.view_layer.objects.active=ob

def triangle_count(ob):
    return sum(len(p.vertices)-2 for p in ob.data.polygons)

def reduce(ob, target, key=None):
    import bpy,bmesh
    select(ob)
    if triangle_count(ob)<=target:return
    dec=ob.modifiers.new('Source silhouette collapse','DECIMATE');dec.ratio=target/triangle_count(ob)
    dec.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Collapse can retain protected/degenerate faces; verify and correct the actual result.
    attempts=0
    while triangle_count(ob)>target and attempts<3:
        previous=triangle_count(ob);attempts+=1
        dec=ob.modifiers.new('Verified budget correction','DECIMATE');dec.ratio=(target-120)/triangle_count(ob);dec.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=dec.name)
        if triangle_count(ob)>=previous:break
    if triangle_count(ob)>target:
        # Generated needle sprays can have geometrically coincident but separate
        # vertices. Join only sub-centimetre source-normalized cracks before a
        # second collapse; loop UVs retain their own source islands.
        for distance in (.006,.012,.022):
            bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=distance)
            bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7);bm.to_mesh(ob.data);bm.free();ob.data.update()
            dec=ob.modifiers.new('Welded silhouette collapse','DECIMATE');dec.ratio=min(1,(target-60)/triangle_count(ob));dec.use_collapse_triangulate=True
            bpy.ops.object.modifier_apply(modifier=dec.name)
            if triangle_count(ob)<=target:break
    if triangle_count(ob)>target:
        # Some source leaves are already separate minimal triangles/tetrahedra.
        # Quadric collapse cannot simplify an isolated three-vertex fragment.
        # Remove the smallest disconnected fragments first, preserving the main
        # connected trunk and each global silhouette extremum, until the actual
        # per-LOD budget is met. Record the resulting delivered counts, not ratios.
        bm=bmesh.new();bm.from_mesh(ob.data);seen=set();islands=[]
        extremes={min(bm.verts,key=lambda v:v.co[k]) for k in range(3)}|{max(bm.verts,key=lambda v:v.co[k]) for k in range(3)}
        for v in bm.verts:
            if v in seen:continue
            stack=[v];seen.add(v);vertices=[];faces=set()
            while stack:
                current=stack.pop();vertices.append(current);faces.update(current.link_faces)
                for edge in current.link_edges:
                    other=edge.other_vert(current)
                    if other not in seen:seen.add(other);stack.append(other)
            if not faces or any(v in extremes for v in vertices):continue
            area=sum(f.calc_area() for f in faces);tris=sum(len(f.verts)-2 for f in faces)
            islands.append((area,tris,vertices))
        current=triangle_count(ob);doomed=[]
        for _,tris,vertices in sorted(islands,key=lambda row:row[0]):
            if current<=target:break
            # Never remove an entire dominant trunk/crown connected component.
            if tris>max(target*.12,200):continue
            current-=tris;doomed.extend(vertices)
        if doomed:bmesh.ops.delete(bm,geom=doomed,context='VERTS')
        bm.to_mesh(ob.data);bm.free();ob.data.update()
    if triangle_count(ob)>target and key:
        # A connected generated needle spray can still consist of thousands of
        # irreducible thin leaf triangles. Thin only the smallest green source
        # leaf faces, never bark, roots, the main shaft, or silhouette anchors.
        mask=semantic_mask(ob,key);bm=bmesh.new();bm.from_mesh(ob.data);bm.faces.ensure_lookup_table()
        extremes={min(bm.verts,key=lambda v:v.co[k]) for k in range(3)}|{max(bm.verts,key=lambda v:v.co[k]) for k in range(3)}
        options=[(f.calc_area(),f) for i,f in enumerate(bm.faces) if mask[i] and not any(v in extremes for v in f.verts)]
        current=triangle_count(ob);doomed=[]
        for _,face in sorted(options,key=lambda row:row[0]):
            if current<=target:break
            current-=len(face.verts)-2;doomed.append(face)
        bmesh.ops.delete(bm,geom=doomed,context='FACES');bm.to_mesh(ob.data);bm.free();ob.data.update()
    assert triangle_count(ob)<20000,(ob.name,triangle_count(ob),target)

def trim_plinth(ob, key):
    """Remove the generated ornamental ground disc from two sources, retaining trunk roots."""
    import bmesh
    if key not in ('tree-1459','tree-3106'):return 0
    bm=bmesh.new();bm.from_mesh(ob.data)
    top=.82 if key=='tree-1459' else .38
    doomed=[f for f in bm.faces if max(v.co.z for v in f.verts)<top and math.hypot(f.calc_center_median().x,f.calc_center_median().y)>.38]
    removed=len(doomed);bmesh.ops.delete(bm,geom=doomed,context='FACES');bm.to_mesh(ob.data);bm.free();ob.data.update();return removed

def source_rgb(ob):
    import numpy as np
    mat=ob.data.materials[0] if ob.data.materials else None
    if not mat:return None
    bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    if not bsdf.inputs['Base Color'].is_linked:return None
    node=bsdf.inputs['Base Color'].links[0].from_node
    if node.type!='TEX_IMAGE' or not node.image:return None
    image=node.image;pixels=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(pixels)
    pixels=pixels.reshape(image.size[1],image.size[0],4)
    uv=np.empty(len(ob.data.loops)*2,dtype=np.float32);ob.data.uv_layers.active.data.foreach_get('uv',uv);uv=uv.reshape(-1,2)
    uv=np.remainder(uv,1)
    x=(uv[:,0]*image.size[0]).astype(np.int32).clip(0,image.size[0]-1)
    y=(uv[:,1]*image.size[1]).astype(np.int32).clip(0,image.size[1]-1)
    return pixels[y,x,:3].reshape(-1,3,3).mean(axis=1)

def semantic_mask(ob,key):
    import numpy as np
    points=np.empty(len(ob.data.vertices)*3,dtype=np.float32);ob.data.vertices.foreach_get('co',points);points=points.reshape(-1,3)
    indices=np.empty(len(ob.data.loops),dtype=np.int32);ob.data.loops.foreach_get('vertex_index',indices);indices=indices.reshape(-1,3)
    centres=points[indices].mean(axis=1)
    rgb=source_rgb(ob)
    if key in ('palm-fan','palm-lean'):
        # Palm trunks are the lower continuous woody shaft; the high radial sprays are fronds.
        crown=8.6 if key=='palm-fan' else 8.7
        radial=np.hypot(centres[:,0],centres[:,1])
        mask=(centres[:,2]>crown)|((centres[:,2]>4)&(radial>(1.25 if key=='palm-fan' else .9)))
    else:
        r,g,b=rgb[:,0],rgb[:,1],rgb[:,2]
        mask=(g>r*1.025)&(g>b*1.05)
        # Keep actual low roots and the upright shaft woody, even where baked moss paints them green.
        mask &= ~((centres[:,2]<1.35)&(np.hypot(centres[:,0],centres[:,1])<.6))
        if key not in ('fir-spire','palm-date'):
            # Source root moss belongs to the rooted woody base, not crown sprites.
            mask &= centres[:,2]>2.4
        # The generated texture can place olive/yellow highlights on leaves.
        # Crown-limited threshold does not turn bark/root dark pixels into collision geometry.
        if key=='palm-date':mask |= ((centres[:,2]>8.1)&(np.hypot(centres[:,0],centres[:,1])>.7))|(centres[:,2]>9.75)
    assert mask.sum()>25,(key,int(mask.sum()),len(mask))
    return mask

def split(ob,key,mask):
    import bpy,bmesh
    parts=[]
    for label,keep in [('Wood',~mask),('Foliage',mask)]:
        part=ob.copy();part.data=ob.data.copy();part.name=label;bpy.context.collection.objects.link(part)
        bm=bmesh.new();bm.from_mesh(part.data);bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[f for i,f in enumerate(bm.faces) if not keep[i]],context='FACES')
        loose=[v for v in bm.verts if not v.link_faces]
        if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
        bm.to_mesh(part.data);bm.free();part.data.update();parts.append(part)
    bpy.data.objects.remove(ob,do_unlink=True)
    return parts

def split_source(ob,key,mask):
    """Use one edit-mesh separation pass for million-triangle source geometry."""
    import bpy,numpy as np
    if ob.data.materials:
        ob.data.materials.append(ob.data.materials[0])
    else:
        mat=bpy.data.materials.new('Untextured semantic separator');ob.data.materials.append(mat);ob.data.materials.append(mat)
    ob.data.polygons.foreach_set('material_index',mask.astype(np.int32))
    select(ob);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    # Blender may compact both separated material slots to index0. The rooted
    # woody part is identified by its real low bound, rather than slot order.
    parts=sorted([o for o in bpy.context.selected_objects if o.type=='MESH'],key=lambda o:min(v.co.z for v in o.data.vertices))
    assert len(parts)==2,(key,len(parts))
    for i,part in enumerate(parts):
        part.name=['Wood','Foliage'][i]
        mat=part.data.materials[part.data.polygons[0].material_index] if part.data.materials else None
        part.data.materials.clear()
        if not key in ('palm-fan','palm-lean') and mat:part.data.materials.append(mat)
        for p in part.data.polygons:p.material_index=0
    return parts

def refine_disconnected_wood(parts):
    """Return tiny upper crown fragments to Foliage, retaining rooted wood.

    The single Meshy albedo paints some shadowed leaf pieces brown/black.
    They are not trunk surfaces merely because hue classification missed them.
    Root-connected volumes and long detached source branches remain woody.
    """
    import bpy,bmesh
    wood,leaf=parts;bm=bmesh.new();bm.from_mesh(wood.data);bm.verts.index_update();seen=set();transfer=[];islands=0;triangles=0
    for v in bm.verts:
        if v in seen:continue
        stack=[v];seen.add(v);vertices=[];faces=set()
        while stack:
            current=stack.pop();vertices.append(current);faces.update(current.link_faces)
            for edge in current.link_edges:
                other=edge.other_vert(current)
                if other not in seen:seen.add(other);stack.append(other)
        if not faces:continue
        lo=[min(v.co[k] for v in vertices) for k in range(3)];hi=[max(v.co[k] for v in vertices) for k in range(3)]
        if lo[2]>2 and max(hi[k]-lo[k] for k in range(3))<1.2:
            islands+=1;triangles+=sum(len(f.verts)-2 for f in faces);transfer.extend(v.index for v in vertices)
    bm.free()
    if not transfer:return {'islands':0,'triangles':0}
    select(wood);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bm=bmesh.from_edit_mesh(wood.data);bm.verts.ensure_lookup_table()
    for index in transfer:bm.verts[index].select=True
    bm.select_flush_mode()
    bmesh.update_edit_mesh(wood.data);bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
    pieces=[o for o in bpy.context.selected_objects if o.type=='MESH' and o is not wood]
    assert len(pieces)==1
    bpy.ops.object.select_all(action='DESELECT');leaf.select_set(True);pieces[0].select_set(True);bpy.context.view_layer.objects.active=leaf;bpy.ops.object.join()
    leaf.name='Foliage';wood.name='Wood'
    return {'islands':islands,'triangles':triangles}

def procedural_material(part,key,workshop):
    """Create original bark/frond maps in Blender for the two untextured palm sources."""
    import bpy
    mat=bpy.data.materials.new(part.name+' original '+key);mat.use_nodes=True;part.data.materials.clear();part.data.materials.append(mat)
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF');out=nodes.get('Material Output')
    select(part);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
    coord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(5,5,.7) if part.name=='Wood' else (6,6,2)
    links.new(coord.outputs['Generated'],mapping.inputs[0]);noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=13;noise.inputs['Detail'].default_value=5;links.new(mapping.outputs[0],noise.inputs['Vector'])
    ramp=nodes.new('ShaderNodeValToRGB')
    colors=((.105,.052,.025,1),(.34,.21,.105,1)) if part.name=='Wood' else ((.035,.095,.012,1),(.20,.32,.043,1))
    ramp.color_ramp.elements[0].position=.18;ramp.color_ramp.elements[0].color=colors[0];ramp.color_ramp.elements[1].position=.82;ramp.color_ramp.elements[1].color=colors[1];links.new(noise.outputs['Fac'],ramp.inputs[0])
    emit=nodes.new('ShaderNodeEmission');links.new(ramp.outputs[0],emit.inputs[0]);links.new(emit.outputs[0],out.inputs[0])
    image=bpy.data.images.new(key+'-'+part.name+'-original-albedo',width=1024,height=1024,alpha=False);image.colorspace_settings.name='sRGB'
    target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.use_selected_to_active=False;scene.render.bake.margin=12
    bpy.ops.object.bake(type='EMIT')
    image.filepath_raw=str(workshop/(key+'-'+part.name+'-albedo.jpg'));image.file_format='JPEG';image.save()
    links.new(bsdf.outputs[0],out.inputs[0]);links.new(target.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=.93;bsdf.inputs['Metallic'].default_value=0
    return mat

def materials(parts,key,workshop):
    import bpy
    for part in parts:
        if not part.data.materials:mat=procedural_material(part,key,workshop)
        else:
            mat=part.data.materials[0].copy();part.data.materials.clear();part.data.materials.append(mat)
        mat.name=part.name+' | '+HABITATS[key][0]
        for face in part.data.polygons:face.material_index=0;face.use_smooth=True
        bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        for name in ('Metallic','Roughness','Emission Color','Emission Strength'):
            for link in list(bsdf.inputs[name].links):mat.node_tree.links.remove(link)
        bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.94 if part.name=='Wood' else .91
        bsdf.inputs['Emission Color'].default_value=(0,0,0,1);bsdf.inputs['Emission Strength'].default_value=0
        if 'Specular IOR Level' in bsdf.inputs:bsdf.inputs['Specular IOR Level'].default_value=.18
        if 'Alpha' in bsdf.inputs:
            for link in list(bsdf.inputs['Alpha'].links):mat.node_tree.links.remove(link)
            bsdf.inputs['Alpha'].default_value=1
        mat.use_backface_culling=part.name=='Wood'
    # Images are shared between the source UV-preserving semantic parts.
    images={node.image for part in parts for node in part.data.materials[0].node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
    for image in images:
        if max(image.size)>1024:image.scale(1024,1024)
    return images

def foliage_cards(source,key,workshop):
    """Bake the actual source canopy in spatial clusters, not generic leaf stamps.

    Two crossed side views and a curved source top cap give walking-angle volume.
    The whole source crown is represented; low-budget triangles no longer delete
    the majority of its minimum-size leaf fragments.
    """
    import bpy,numpy as np
    from mathutils import Vector
    mesh=source.data;points=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',points);points=points.reshape(-1,3)
    indices=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',indices);indices=indices.reshape(-1,3)
    uvs=np.zeros(len(mesh.loops)*2,dtype=np.float32)
    if mesh.uv_layers.active:mesh.uv_layers.active.data.foreach_get('uv',uvs)
    uvs=uvs.reshape(-1,3,2)
    centres=points[indices].mean(axis=1);groups=[np.arange(len(indices),dtype=np.int32)]
    while len(groups)<21:
        ranks=[]
        for i,ids in enumerate(groups):
            span=np.ptp(centres[ids],axis=0);ranks.append((float(span.max()*math.sqrt(len(ids))),i,int(span.argmax())))
        _,chosen,axis=max(ranks);ids=groups.pop(chosen);order=np.argsort(centres[ids,axis]);cut=len(ids)//2
        if cut<10:groups.append(ids);break
        groups.extend([ids[order[:cut]],ids[order[cut:]]])
    if source.data.materials:mat=source.data.materials[0].copy()
    else:
        mat=bpy.data.materials.new(key+' original palm frond palette');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links
        coord=nodes.new('ShaderNodeTexCoord');noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=9;noise.inputs['Detail'].default_value=3;links.new(coord.outputs['Generated'],noise.inputs['Vector'])
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.025,.067,.008,1);ramp.color_ramp.elements[1].color=(.14,.27,.032,1);links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
    mat.name=key+' original source canopy bake';nodes=mat.node_tree.nodes;links=mat.node_tree.links
    bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');out=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    emit=nodes.new('ShaderNodeEmission')
    if bsdf.inputs['Base Color'].is_linked:links.new(bsdf.inputs['Base Color'].links[0].from_socket,emit.inputs[0])
    else:emit.inputs[0].default_value=bsdf.inputs['Base Color'].default_value
    links.new(emit.outputs[0],out.inputs[0])
    source.hide_render=True
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.hide_render=True
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    world=bpy.data.worlds.new('Unlit source-albedo capture');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[1].default_value=0;scene.world=world
    camera_data=bpy.data.cameras.new('Source cluster bake');camera=bpy.data.objects.new('Source cluster bake',camera_data);scene.collection.objects.link(camera);camera_data.type='ORTHO';scene.camera=camera
    atlas=np.zeros((2048,2048,4),dtype=np.float32);sites=[];tile=0
    directions=[(Vector((0,-1,0)),Vector((1,0,0)),Vector((0,0,1))),
                (Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))),
                (Vector((0,0,1)),Vector((1,0,0)),Vector((0,1,0)))]
    for cluster,ids in enumerate(groups):
        coords=points[indices[ids]].reshape(-1,3);flat_uv=uvs[ids].reshape(-1,2)
        piece_data=bpy.data.meshes.new(key+' canopy cluster');piece_data.vertices.add(len(coords));piece_data.vertices.foreach_set('co',coords.ravel())
        piece_data.loops.add(len(coords));piece_data.loops.foreach_set('vertex_index',np.arange(len(coords),dtype=np.int32))
        piece_data.polygons.add(len(ids));piece_data.polygons.foreach_set('loop_start',np.arange(0,len(coords),3,dtype=np.int32));piece_data.polygons.foreach_set('loop_total',np.full(len(ids),3,dtype=np.int32))
        uv=piece_data.uv_layers.new(name='SourceUV');uv.data.foreach_set('uv',flat_uv.ravel());piece_data.materials.append(mat);piece_data.update()
        piece=bpy.data.objects.new(key+' canopy cluster',piece_data);scene.collection.objects.link(piece);piece.hide_render=False
        lo,hi=coords.min(axis=0),coords.max(axis=0);centre=Vector((lo+hi)/2);span=hi-lo
        for direction,right,up in directions:
            scale=max(float(np.dot(np.abs(right),span)),float(np.dot(np.abs(up),span)))*1.10
            camera_data.ortho_scale=scale;camera.location=centre+direction*40;camera.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler()
            # Align the sprite axes with the camera's actual orientation.
            matrix=camera.rotation_euler.to_matrix();right=matrix@Vector((1,0,0));up=matrix@Vector((0,1,0))
            path=workshop/(key+'-cluster-'+str(tile)+'.png');scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
            image=bpy.data.images.load(str(path),check_existing=False);rgba=np.empty(256*256*4,dtype=np.float32);image.pixels.foreach_get(rgba)
            x=(tile%8)*256;y=(tile//8)*256;atlas[y:y+256,x:x+256]=rgba.reshape(256,256,4)
            sites.append({'centre':tuple(centre),'right':tuple(right),'up':tuple(up),'normal':tuple(direction),'scale':scale,'verticalSpan':float(span[2]),'tile':tile});tile+=1
            bpy.data.images.remove(image)
        bpy.data.objects.remove(piece,do_unlink=True);bpy.data.meshes.remove(piece_data)
    bpy.data.objects.remove(camera,do_unlink=True);bpy.data.objects.remove(source,do_unlink=True)
    atlas_image=bpy.data.images.new(key+' source canopy atlas',width=2048,height=2048,alpha=True);atlas_image.colorspace_settings.name='sRGB';atlas_image.pixels.foreach_set(atlas.ravel());atlas_image.update()
    atlas_image.filepath_raw=str(workshop/(key+'-canopy-atlas.png'));atlas_image.file_format='PNG';atlas_image.save()
    card_mat=bpy.data.materials.new('Foliage | '+HABITATS[key][0]);card_mat.use_nodes=True;nodes=card_mat.node_tree.nodes;links=card_mat.node_tree.links
    bsdf=nodes.get('Principled BSDF');tex=nodes.new('ShaderNodeTexImage');tex.image=atlas_image;tex.interpolation='Linear';links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha'])
    bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.95;bsdf.inputs['Specular IOR Level'].default_value=.12
    card_mat.surface_render_method='DITHERED';card_mat.use_backface_culling=False
    print('CANOPY_BAKED '+json.dumps({'id':key,'clusters':len(groups),'sprites':len(sites),'atlas':2048}),flush=True)
    return sites,card_mat,atlas_image

def card_mesh(sites,mat,segments):
    import bpy
    from mathutils import Vector
    vertices=[];uvs=[];faces=[]
    for site in sites:
        start=len(vertices);centre=Vector(site['centre']);right=Vector(site['right']);up=Vector(site['up']);normal=Vector(site['normal']);scale=site['scale'];tile=site['tile']
        for row in range(segments+1):
            for col in range(segments+1):
                u=col/segments;v=row/segments
                wave=math.sin(math.pi*u)*math.sin(math.pi*v)
                depth=(wave*.5-.2)*site['verticalSpan'] if abs(normal.z)>.7 else wave*scale*.055
                vertices.append(tuple(centre+right*((u-.5)*scale)+up*((v-.5)*scale)+normal*depth))
                # Two pixels inside each tile bound prevent atlas-neighbour bleed.
                uvs.append(((tile%8+(2+u*252)/256)/8,(tile//8+(2+v*252)/256)/8))
        for row in range(segments):
            for col in range(segments):
                a=start+row*(segments+1)+col;b=a+1;d=a+segments+1;c=d+1;faces.extend([(a,b,c),(a,c,d)])
    mesh=bpy.data.meshes.new('Source-derived clustered cards');mesh.from_pydata(vertices,[],faces);mesh.update();uv=mesh.uv_layers.new(name='SourceAtlas')
    for loop in mesh.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
    for p in mesh.polygons:p.use_smooth=True
    mesh.materials.append(mat);ob=bpy.data.objects.new('Foliage',mesh);bpy.context.collection.objects.link(ob);return ob

def glb_audit(path):
    """Count actual default-scene instances, parts, resources and transformed bounds."""
    data=path.read_bytes();assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
    n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:]
    primitive_count=sum(j['accessors'][p['indices']]['count']//3 for m in j['meshes'] for p in m['primitives'])
    instances=[]
    def visit(i):
        node=j['nodes'][i]
        if 'mesh' in node:
            tri=sum(j['accessors'][p['indices']]['count']//3 for p in j['meshes'][node['mesh']]['primitives'])
            instances.append({'name':node.get('name'),'triangles':tri,'mesh':node['mesh']})
        for c in node.get('children',[]):visit(c)
    for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i)
    assert sorted(n['name'] for n in instances)==['Foliage','Wood'],instances
    triangles=sum(x['triangles'] for x in instances);assert triangles<20000
    bounds=[[],[]]
    for m in j['meshes']:
        assert len(m['primitives'])==1
        p=m['primitives'][0];a=j['accessors'][p['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']]
        start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
        positions=[struct.unpack_from('<3f',binary,start+i*stride) for i in range(a['count'])]
        assert all(math.isfinite(x) for point in positions for x in point)
        bounds[0].append([min(point[k] for point in positions) for k in range(3)])
        bounds[1].append([max(point[k] for point in positions) for k in range(3)])
    bounds=[[min(point[k] for point in bounds[0]) for k in range(3)],[max(point[k] for point in bounds[1]) for k in range(3)]]
    images=[]
    for image in j.get('images',[]):
        assert image.get('bufferView') is not None and not image.get('uri')
        v=j['bufferViews'][image['bufferView']];raw=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        images.append({'mimeType':image['mimeType'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
    assert not j.get('animations') and not j.get('skins')
    return {'path':'public/models/flora/meshy-012/'+path.name,'file':path.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'triangles':triangles,'uniqueTriangles':primitive_count,'parts':instances,'bounds':bounds,'height':bounds[1][1]-bounds[0][1],'images':images,'materials':j['materials'],'requiredExtensions':j.get('extensionsRequired',[])}

def repair_tangents(j,binchunk):
    """Keep valid mapped tangents and repair collapse-degenerate UV vertices.

    Blender can emit a zero tangent where a source triangle has collapsed UVs.
    Use a neighbouring UV-derived tangent projected onto that vertex's normal;
    if every incident UV triangle is singular, use a stable orthogonal basis.
    Materials without a normal map do not need a tangent attribute at all.
    """
    binary=bytearray(binchunk[8:]);removed=0;repaired=0
    def values(index,components):
        a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
        assert a['componentType']==5126
        offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',components*4)
        return [struct.unpack_from('<'+'f'*components,binary,offset+i*stride) for i in range(a['count'])],offset,stride
    def dot(a,b):return sum(x*y for x,y in zip(a,b))
    def projected(vector,normal):
        nlen=math.sqrt(dot(normal,normal));assert nlen>1e-8
        normal=tuple(x/nlen for x in normal);d=dot(vector,normal)
        vector=tuple(x-d*y for x,y in zip(vector,normal));length=math.sqrt(dot(vector,vector))
        return tuple(x/length for x in vector) if length>1e-8 else None
    for mesh in j['meshes']:
        for primitive in mesh['primitives']:
            attrs=primitive['attributes']
            if 'TANGENT' not in attrs:continue
            material=j['materials'][primitive['material']]
            if 'normalTexture' not in material:
                del attrs['TANGENT'];removed+=1;continue
            tangents,offset,stride=values(attrs['TANGENT'],4)
            invalid={i for i,t in enumerate(tangents) if not all(math.isfinite(x) for x in t) or abs(math.sqrt(dot(t[:3],t[:3]))-1)>1e-4}
            if not invalid:continue
            positions,_,_=values(attrs['POSITION'],3);normals,_,_=values(attrs['NORMAL'],3);uvs,_,_=values(attrs['TEXCOORD_0'],2)
            accessor=j['accessors'][primitive['indices']];view=j['bufferViews'][accessor['bufferView']]
            code={5121:'B',5123:'H',5125:'I'}[accessor['componentType']]
            start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
            indices=struct.unpack_from('<'+code*accessor['count'],binary,start);candidates={}
            for cursor in range(0,len(indices),3):
                a,b,c=indices[cursor:cursor+3]
                if not invalid.intersection((a,b,c)):continue
                du1,dv1=uvs[b][0]-uvs[a][0],uvs[b][1]-uvs[a][1];du2,dv2=uvs[c][0]-uvs[a][0],uvs[c][1]-uvs[a][1]
                determinant=du1*dv2-du2*dv1
                if abs(determinant)<1e-12:continue
                vector=tuple(((positions[b][k]-positions[a][k])*dv2-(positions[c][k]-positions[a][k])*dv1)/determinant for k in range(3))
                for index in (a,b,c):
                    if index in invalid:
                        tangent=projected(vector,normals[index])
                        if tangent:candidates.setdefault(index,tangent)
            for index in invalid:
                tangent=candidates.get(index)
                if tangent is None:
                    axis=min(range(3),key=lambda k:abs(normals[index][k]));basis=tuple(1.0 if k==axis else 0.0 for k in range(3))
                    tangent=projected(basis,normals[index]);assert tangent is not None
                handed=-1.0 if tangents[index][3]<0 else 1.0
                struct.pack_into('<4f',binary,offset+index*stride,*tangent,handed);repaired+=1
    # Remove the accessor of any omitted tangent, without disturbing UVs or indices.
    used=set()
    for mesh in j['meshes']:
        for primitive in mesh['primitives']:
            used.update(primitive['attributes'].values());used.add(primitive['indices'])
    mapping={old:new for new,old in enumerate(sorted(used))};j['accessors']=[j['accessors'][old] for old in sorted(used)]
    for mesh in j['meshes']:
        for primitive in mesh['primitives']:
            primitive['indices']=mapping[primitive['indices']]
            primitive['attributes']={key:mapping[index] for key,index in primitive['attributes'].items()}
    return struct.pack('<II',len(binary),0x004e4942)+binary,{'unusedTangentAttributesRemoved':removed,'degenerateMappedTangentsRepaired':repaired}

def compact_glb(j,binchunk):
    """Deduplicate identical source images/texture references and pack only referenced views."""
    oldbinary=binchunk[8:];views=j['bufferViews'];b=bytearray();mapping={};found={};newviews=[]
    used={a['bufferView'] for a in j['accessors'] if 'bufferView' in a}|{im['bufferView'] for im in j.get('images',[])}
    for i,v in enumerate(views):
        if i not in used:continue
        raw=oldbinary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        semantic={k:val for k,val in v.items() if k not in ('byteOffset','byteLength','buffer')}
        key=(hashlib.sha256(raw).hexdigest(),json.dumps(semantic,sort_keys=True))
        if key in found:mapping[i]=found[key];continue
        while len(b)%4:b.append(0)
        mapping[i]=len(newviews);found[key]=len(newviews);newviews.append({'buffer':0,'byteOffset':len(b),'byteLength':len(raw),**semantic});b.extend(raw)
    j['bufferViews']=newviews
    for a in j['accessors']:
        if 'bufferView' in a:a['bufferView']=mapping[a['bufferView']]
    imap={};newimages=[];ikeys={}
    for i,im in enumerate(j.get('images',[])):
        im['bufferView']=mapping[im['bufferView']];key=(im['bufferView'],im['mimeType'])
        if key not in ikeys:ikeys[key]=len(newimages);newimages.append(im)
        imap[i]=ikeys[key]
    j['images']=newimages;tmap={};newtextures=[];tkeys={}
    for i,t in enumerate(j.get('textures',[])):
        t['source']=imap[t['source']];key=json.dumps(t,sort_keys=True)
        if key not in tkeys:tkeys[key]=len(newtextures);newtextures.append(t)
        tmap[i]=tkeys[key]
    j['textures']=newtextures
    def texture_refs(value,key=''):
        if isinstance(value,dict):
            if key.endswith('Texture') and 'index' in value:value['index']=tmap[value['index']]
            for k,v in value.items():texture_refs(v,k)
        elif isinstance(value,list):
            for v in value:texture_refs(v,key)
    for material in j['materials']:texture_refs(material)
    while len(b)%4:b.append(0)
    j['buffers']=[{'byteLength':len(b)}]
    return struct.pack('<II',len(b),0x004e4942)+b

def prepare(args,key,filename,ob,normalization):
    import bpy
    started=time.monotonic();source=args.downloads/filename;source_sha=hashlib.sha256(source.read_bytes()).hexdigest();source_tris=triangle_count(ob)
    plinth=trim_plinth(ob,key)
    # Split semantics BEFORE reduction. A combined collapse can spend its whole
    # budget on thousands of leaf islands and starve the complete trunk.
    mask=semantic_mask(ob,key);assert (~mask).sum()>25,(key,'missing wood');parts=split_source(ob,key,mask)
    reassigned=refine_disconnected_wood(parts)
    print('SPLIT '+json.dumps({'id':key,'wood':triangle_count(parts[0]),'foliage':triangle_count(parts[1])}),flush=True)
    cards=None
    if key in CARD_SOURCES:
        reduce(parts[0],min(14000,triangle_count(parts[0])))
        images=materials([parts[0]],key,args.workshop)
        cards,card_mat,card_image=foliage_cards(parts[1],key,args.workshop);images.add(card_image)
        parts=[parts[0],card_mesh(cards,card_mat,6)]
    else:
        reduce(parts[0],min(6000,triangle_count(parts[0])))
        reduce(parts[1],18800-triangle_count(parts[0]),key)
        images=materials(parts,key,args.workshop)
    root=min(v.co.z for part in parts for v in part.data.vertices)
    for part in parts:
        for v in part.data.vertices:v.co.z-=root
    if cards:
        for site in cards:site['centre']=(site['centre'][0],site['centre'][1],site['centre'][2]-root)
    for part in parts:part.data.update()
    output=args.output;output.mkdir(parents=True,exist_ok=True)
    lods={};editable=[]
    for level,target in [('near',18800),('mid',6900),('far',1900)]:
        if level=='near':lod_parts=parts
        elif cards:
            segments=4 if level=='mid' else 2;leaf=card_mesh(cards,card_mat,segments)
            wood=parts[0].copy();wood.data=parts[0].data.copy();wood.name='Wood';bpy.context.collection.objects.link(wood)
            reduce(wood,target-triangle_count(leaf));lod_parts=[wood,leaf]
        else:
            lod_parts=[];total=sum(triangle_count(part) for part in parts)
            for part in parts:
                other=part.copy();other.data=part.data.copy();other.name=part.name;bpy.context.collection.objects.link(other)
                reduce(other,max(100,int(target*triangle_count(part)/total)),key if part.name=='Foliage' else None);lod_parts.append(other)
        for part in lod_parts:
            part.name=part.name.split('.')[0]
            part.data.validate(verbose=False,clean_customdata=True);part.data.update(calc_edges=True)
            select(part)
        bpy.ops.object.select_all(action='DESELECT')
        for part in lod_parts:part.select_set(True)
        bpy.context.view_layer.objects.active=lod_parts[0]
        path=output/(key+'-'+level+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_materials='EXPORT',export_image_format='AUTO',export_texcoords=True,export_normals=True,export_tangents=True,export_extras=False)
        # Blender enforces unique object names in its scene; the exported contract is semantic.
        data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binchunk=data[20+n:]
        for node in j['nodes']:
            if 'mesh' in node:node['name']=node.get('name','').split('.')[0]
        for material in j['materials']:
            # Mild earthy value grouping; PBR factors tint every UV island equally.
            foliage=material['name'].startswith('Foliage')
            factor=[.84,.90,.80,1] if foliage else [.93,.87,.79,1]
            material['pbrMetallicRoughness']['baseColorFactor']=factor
            if foliage and cards:
                material['alphaMode']='MASK';material['alphaCutoff']=.35;material['doubleSided']=True
        binchunk,tangent_repair=repair_tangents(j,binchunk)
        binchunk=compact_glb(j,binchunk)
        raw=json.dumps(j,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
        path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(raw)+len(binchunk))+struct.pack('<II',len(raw),0x4e4f534a)+raw+binchunk)
        lods[level]=glb_audit(path);lods[level]['tangentRepair']=tangent_repair
        if level!='near':
            for part in lod_parts:bpy.data.objects.remove(part,do_unlink=True)
    for part in parts:
        part.hide_render=False
        mat=part.data.materials[0];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        if bsdf.inputs['Base Color'].is_linked:
            color=bsdf.inputs['Base Color'].links[0].from_socket;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
            mix.inputs[2].default_value=(.84,.90,.80,1) if part.name=='Foliage' else (.93,.87,.79,1)
            links.new(color,mix.inputs[1]);links.new(mix.outputs[0],bsdf.inputs['Base Color'])
    render(parts[0],args.workshop/(key+'-near.png'))
    parts[1].hide_render=True;render(parts[0],args.workshop/(key+'-wood-mask.png'));parts[1].hide_render=False
    # Save reduced near source only, never the high-triangle original.
    for o in list(bpy.context.scene.objects):
        if o not in parts:bpy.data.objects.remove(o,do_unlink=True)
    for image in images:image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(args.workshop/(key+'-near.blend')),compress=True)
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_sha
    receipt={'id':key,'name':HABITATS[key][0],'habitat':HABITATS[key][1],'selected':HABITATS[key][2],'selection':'wood-only' if key=='tree-1537' else 'full-tree' if HABITATS[key][2] else 'reserve','sourceFilename':filename,'sourceSha256':source_sha,'sourceTriangles':source_tris,'sourceUnmodified':True,'sourceHeight':12,'normalization':normalization,'removedPlinthFaces':plinth,'reassignedDisconnectedWood':reassigned,'runtime':lods,'preparation':{'tool':'Blender '+bpy.app.version_string,'UV':'Source wood UV islands retained by collapse; original UV unwrap for two untextured palms; dense crowns use original-source spatial cluster atlas','material':'Source wood PBR maps resized to 1024; dense foliage source albedo/alpha in a 2048 atlas; all-UV mild earthy PBR tint; rough nonmetal, no emission; original noise-baked palm albedo','semanticParts':'UV albedo green-vs-bark classification plus protected low trunk; palm crown/radial mask for untextured sources; tiny disconnected upper Wood fragments returned to source Foliage. Inferred semantic boundary, not artist-authored labels.','motion':'static attached wood and foliage','geometry':'uniform source normalization; separate wood/crown budgets; dense crowns use 21 source-positioned spatial clusters with 3 source-baked views, crossed curved side cards and curved top caps following each cluster vertical span; lower ornamental soil faces trimmed only for 1459/3106; residual source base retained in reserves','crownCards':{'clusters':len(cards)//3,'views':len(cards),'atlas':2048,'segments':[6,4,2]} if cards else None},'seconds':round(time.monotonic()-started,1)}
    (args.workshop/(key+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n');print('PREPARED '+json.dumps({'id':key,'triangles':{k:v['triangles'] for k,v in lods.items()},'bytes':{k:v['bytes'] for k,v in lods.items()},'seconds':receipt['seconds']}),flush=True)
    return receipt

def write_manifest(args):
    """Finalize receipts without importing Blender or opening the high meshes."""
    from io import BytesIO
    from PIL import Image
    repo=pathlib.Path(__file__).resolve().parents[1]
    source_rows={row['sourceFilename']:row for row in json.loads((args.workshop/'source-inspection.json').read_text())}
    assets=[]
    for key,filename in SOURCES:
        row=json.loads((args.workshop/(key+'-receipt.json')).read_text());original=source_rows[filename]
        row['sourceBytes']=original['bytes'];assert row['sourceSha256']==original['sourceSha256']
        assert hashlib.sha256((args.downloads/filename).read_bytes()).hexdigest()==row['sourceSha256']
        for level,lod in row['runtime'].items():
            data=(repo/lod['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==lod['sha256']
            n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
            assert len(lod['images'])==len(doc.get('images',[]))
            for source,image in zip(doc.get('images',[]),lod['images']):
                view=doc['bufferViews'][source['bufferView']];raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
                assert hashlib.sha256(raw).hexdigest()==image['sha256'];size=Image.open(BytesIO(raw)).size
                image['width'],image['height']=size;assert max(size)<=2048
        assets.append(row)
    pine=json.loads((repo/'docs/engineering/solitary-pine-assets.json').read_text())
    protected=[]
    for row in pine['runtime']:
        data=(repo/row['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256'] and len(data)==row['bytes']
        protected.append({key:row[key] for key in ('path','bytes','sha256','triangles')})
    manifest={'schemaVersion':1,'gameVersion':'0.0.12','provenance':{'source':'14 Meshy GLBs supplied directly by the owner on 5 October 2026; originals read-only in Downloads','license':'Owner-supplied project use; no blanket third-party open license is asserted. Do not redistribute unmodified originals by assumption.','derivatives':'Original source silhouettes/materials studied; separately budgeted wood; source-derived clustered crown cards where dense foliage exceeds the budget; original procedural bark/frond palette for the two untextured palms.','copyrightReferences':'No Gothic/Warcraft game data, art or code included.'},'budgets':{'strictTrianglesPerSceneInstance':19999,'lodsCountedSeparately':True,'sourceHeightReferenceMetres':12,'maximumTextureDimension':2048},'protectedPine':protected,'assets':assets,'verification':{'originalSourceHashes':'All 14 verified against initial read-only inspection','protectedPineHashes':'Near/middle/far verified byte exact against approved source-pine receipts','deliveredScenes':'42 GLBs independently counted by named scene mesh instances; each strictly below 20,000 triangles','nativeAcceptance':'Combined game/menus and hardware timing are separate root-agent gates; source material/mask renders are component evidence.'}}
    target=repo/'docs/engineering/meshy-tree-assets.json';target.write_text(json.dumps(manifest,indent=2)+'\n')
    print('MANIFEST '+str(target)+' '+str(len(assets))+' assets',flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--stage',choices=['inspect','prepare','manifest','repair'],default='inspect')
    p.add_argument('--downloads',type=pathlib.Path,default=pathlib.Path('/Users/ael/Downloads'))
    p.add_argument('--workshop',type=pathlib.Path,required=True);p.add_argument('--only')
    p.add_argument('--output',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'public/models/flora/meshy-012')
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.workshop.mkdir(parents=True,exist_ok=True)
    if args.stage=='manifest':write_manifest(args);return
    rows=SOURCES if not args.only else [(k,f) for k,f in SOURCES if k in args.only.split(',')]
    if args.stage=='repair':
        for key,_ in rows:
            receipt_path=args.workshop/(key+'-receipt.json');receipt=json.loads(receipt_path.read_text())
            for level in ('near','mid','far'):
                path=args.output/(key+'-'+level+'.glb');data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0]
                j=json.loads(data[20:20+n]);binchunk,report=repair_tangents(j,data[20+n:]);binchunk=compact_glb(j,binchunk)
                raw=json.dumps(j,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
                path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(raw)+len(binchunk))+struct.pack('<II',len(raw),0x4e4f534a)+raw+binchunk)
                receipt['runtime'][level]=glb_audit(path);receipt['runtime'][level]['tangentRepair']=report
            receipt_path.write_text(json.dumps(receipt,indent=2)+'\n')
        return
    for key,filename in rows:
        started=time.monotonic();source=args.downloads/filename;ob,normalization=mesh_import(source)
        if args.stage=='inspect':
            render(ob,args.workshop/(key+'-source.png'))
            report={'id':key,'source':filename,**normalization,'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),'vertices':len(ob.data.vertices),'materials':[m.name for m in ob.data.materials],'seconds':round(time.monotonic()-started,1)}
            (args.workshop/(key+'-inspection.json')).write_text(json.dumps(report,indent=2)+'\n')
            print('INSPECTED '+json.dumps(report),flush=True)
        else:
            prepare(args,key,filename,ob,normalization)

if __name__=='__main__':main()
