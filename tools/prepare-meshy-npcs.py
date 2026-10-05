#!/usr/bin/env python3
"""Prepare owner-supplied Meshy NPCs: UV-aware reduction, full-surface material baking and an identity-axis biped.
Run in installed Blender with --background --factory-startup --offline-mode --disable-autoexec --python thisfile --
 --downloads /path/to/sources --workshop /path/to/workshop --cloth /path/to/generated-linen.png [--only id,...].
Originals are only read. The output rig uses Tervain's existing procedural pose controller; no source clips are invented.
"""
import argparse, hashlib, json, math, pathlib, struct, sys, time

def glb_read(path):
    data=path.read_bytes(); assert data[:4]==b'glTF'
    n,t=struct.unpack_from('<II',data,12); assert t==0x4e4f534a
    j=json.loads(data[20:20+n]); bn,bt=struct.unpack_from('<II',data,20+n); assert bt==0x004e4942
    return j,bytearray(data[28+n:28+n+bn])

def glb_write(path,j,b):
    while len(b)%4:b.append(0)
    j['buffers']=[{'byteLength':len(b)}]; raw=json.dumps(j,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(raw)+len(b))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(b),0x004e4942)+b)

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

BONES=['hips','torso','head','armL','elbowL','armR','elbowR','legL','kneeL','legR','kneeR']
PARENTS=[None,0,1,1,3,1,5,0,7,0,9]

def add_skin(path,skinrows,joints):
    j,b=glb_read(path);mesh_nodes=[(i,n) for i,n in enumerate(j['nodes']) if 'mesh' in n]
    assert len(mesh_nodes)==1 and len(j['meshes'])==1
    prim=j['meshes'][0]['primitives'][0];a=j['accessors'][prim['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']]
    off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
    positions=[struct.unpack_from('<3f',b,off+i*stride) for i in range(a['count'])]
    # Exporter UV seams produce split vertices. A spatial dictionary retains the exact bind weights of each location.
    lookup={tuple(round(x,6) for x in p):w for p,w in skinrows}
    weights=[]
    for p in positions:
        key=tuple(round(x,6) for x in p)
        if key not in lookup:
            # Float32 serialization may round at a quantization boundary; use the adjacent bins without nearest-body leakage.
            choices=[lookup[k] for dx in (-1,0,1) for dy in (-1,0,1) for dz in (-1,0,1) if (k:=tuple(round(key[t]+[dx,dy,dz][t]*1e-6,6) for t in range(3))) in lookup]
            assert choices,(p,key);weights.append(choices[0])
        else:weights.append(lookup[key])
    def accessor(raw,component,typ,count,minmax=None):
        while len(b)%4:b.append(0)
        vi=len(j.setdefault('bufferViews',[]));j['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(raw)});b.extend(raw)
        ai=len(j['accessors']);entry={'bufferView':vi,'componentType':component,'count':count,'type':typ}
        if minmax:entry.update(minmax)
        j['accessors'].append(entry);return ai
    ids=bytearray();vals=bytearray()
    for pairs in weights:
        pairs=sorted(pairs,key=lambda x:x[1],reverse=True)[:4];total=sum(v for _,v in pairs);assert total>0
        ix=[i for i,_ in pairs]+[0]*(4-len(pairs));ww=[v/total for _,v in pairs]+[0]*(4-len(pairs))
        ids.extend(struct.pack('<4H',*ix));vals.extend(struct.pack('<4f',*ww))
    prim['attributes']['JOINTS_0']=accessor(ids,5123,'VEC4',len(weights));prim['attributes']['WEIGHTS_0']=accessor(vals,5126,'VEC4',len(weights))
    start=len(j['nodes'])
    for k,name in enumerate(BONES):
        par=PARENTS[k];base=joints[par] if par is not None else (0,0,0)
        j['nodes'].append({'name':name,'translation':[joints[k][q]-base[q] for q in range(3)]})
    for k,par in enumerate(PARENTS):
        if par is not None:j['nodes'][start+par].setdefault('children',[]).append(start+k)
    matrices=bytearray()
    for x,y,z in joints:matrices.extend(struct.pack('<16f',1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1))
    ibm=accessor(matrices,5126,'MAT4',len(BONES));j['skins']=[{'name':'Tervain identity-axis biped','joints':list(range(start,start+len(BONES))),'skeleton':start,'inverseBindMatrices':ibm}]
    mesh_nodes[0][1]['skin']=0;j['scenes'][j.get('scene',0)]['nodes'].append(start)
    j['asset']['generator']='Tervain / Blender UV reduction, material baking, identity-axis biped'
    # Float32 export can collapse an extremely tiny source face even when Blender's
    # authoring mesh has nonzero area. Remove it from the final triangle list too.
    ia=j['accessors'][prim['indices']];iv=j['bufferViews'][ia['bufferView']];code,size={5123:('H',2),5125:('I',4)}[ia['componentType']]
    ix=list(struct.unpack_from('<'+code*ia['count'],b,iv.get('byteOffset',0)+ia.get('byteOffset',0)));kept=[]
    for q in range(0,len(ix),3):
        a0,a1,a2=(positions[ix[q+k]] for k in range(3));u=[a1[k]-a0[k] for k in range(3)];v0=[a2[k]-a0[k] for k in range(3)]
        cross=(u[1]*v0[2]-u[2]*v0[1],u[2]*v0[0]-u[0]*v0[2],u[0]*v0[1]-u[1]*v0[0])
        if math.sqrt(sum(c*c for c in cross))>1e-12:kept.extend(ix[q:q+3])
    if len(kept)!=len(ix):prim['indices']=accessor(struct.pack('<'+code*len(kept),*kept),ia['componentType'],'SCALAR',len(kept),{'min':[min(kept)],'max':[max(kept)]})
    j.pop('animations',None);glb_write(path,j,b)
    tris=sum(j['accessors'][p['indices']]['count']//3 for m in j['meshes'] for p in m['primitives']);assert tris<=48000
    return {'triangles':tris,'vertices':a['count'],'bones':len(BONES),'joints':dict(zip(BONES,joints)),'height':max(p[1] for p in positions)-min(p[1] for p in positions)}

def prepare(args,row,config):
    import bpy,numpy as np
    from mathutils import Vector
    started=time.monotonic();source=args.downloads/row['sourceFilename'];original=source.read_bytes();source_sha=hashlib.sha256(original).hexdigest()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source),merge_vertices=True)
    helpers={b.custom_shape for ob in bpy.context.scene.objects if ob.type=='ARMATURE' for b in ob.pose.bones if b.custom_shape}
    objects=[ob for ob in bpy.context.scene.objects if ob.type=='MESH' and ob not in helpers]
    assert len(objects)==1,(row['id'],len(objects));high=objects[0]
    for mod in high.modifiers:
        if mod.type=='ARMATURE':mod.show_viewport=mod.show_render=False
    coords=np.array([tuple(high.matrix_world@v.co) for v in high.data.vertices],dtype=np.float64)
    lo=coords.min(axis=0);hi=coords.max(axis=0);scale=1.8/(hi[2]-lo[2]);centre=(lo+hi)/2
    coords=(coords-np.array([centre[0],centre[1],lo[2]]))*scale
    high.data.vertices.foreach_set('co',coords.astype(np.float32).ravel());high.parent=None;high.matrix_world.identity();high.data.update()
    source_tris=sum(len(p.vertices)-2 for p in high.data.polygons)
    low=high.copy();low.data=high.data.copy();bpy.context.collection.objects.link(low);low.name=row['id'];low.modifiers.clear()
    for k,mat in enumerate(low.data.materials):low.data.materials[k]=mat.copy()
    protection=low.vertex_groups.new(name='Tervain detail preservation')
    protected={.01:[],.8:[],.65:[],.30:[]}
    for v in low.data.vertices:
        # Protect face, fingers and garment hems; UV loops remain attached to the collapsed source surface.
        x,y,z=v.co;w=.01
        if z>1.49:w=.8
        elif abs(x)>.45:w=.65
        elif z<.14:w=.30
        protected[w].append(v.index)
    for w,indices in protected.items():
        if indices:protection.add(indices,w,'REPLACE')
    if source_tris>config['targetTriangles']:
        ratio=config['targetTriangles']/source_tris
        for attempt in range(4):
            mod=low.modifiers.new('UV-aware face/hand protected collapse','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True;mod.vertex_group=protection.name;mod.vertex_group_factor=.55
            bpy.context.view_layer.objects.active=low;low.select_set(True);high.select_set(False)
            evaluated=low.evaluated_get(bpy.context.evaluated_depsgraph_get());tri=sum(len(p.vertices)-2 for p in evaluated.data.polygons)
            if tri<=48000:bpy.ops.object.modifier_apply(modifier=mod.name);break
            low.modifiers.remove(mod);ratio*=46000/tri*.98
        else:raise RuntimeError('Failed strict triangle cap')
    # Remove zero-area export triangles; keep UV/custom-data layers on every surviving face.
    import bmesh
    bm=bmesh.new();bm.from_mesh(low.data)
    collapsed=[f for f in bm.faces if f.calc_area()<1e-12]
    if collapsed:bmesh.ops.delete(bm,geom=collapsed,context='FACES')
    bm.to_mesh(low.data);bm.free();low.data.update()
    for p in low.data.polygons:p.use_smooth=True
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1;scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.bake.margin=12
    # Preserve high-resolution sculpt detail in a UV-space tangent normal map before normalizing the arms.
    normal=bpy.data.images.new(row['id']+' source sculpt normals',width=1024,height=1024,alpha=False);normal.colorspace_settings.name='Non-Color'
    targets=[]
    for mat in low.data.materials:
        mat.use_nodes=True;tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal;mat.node_tree.nodes.active=tex;targets.append(tex)
    bpy.ops.object.select_all(action='DESELECT');high.select_set(True);low.select_set(True);bpy.context.view_layer.objects.active=low
    scene.render.bake.use_selected_to_active=True;scene.render.bake.cage_extrusion=.025;scene.render.bake.max_ray_distance=.08
    bpy.ops.object.bake(type='NORMAL');scene.render.bake.use_selected_to_active=False
    # Normalization works on source bind geometry, not on an animated frame; close-arm garments keep their original rest form.
    pts=np.array([tuple(v.co) for v in low.data.vertices],dtype=np.float64)
    # Work in glTF coordinates (+Y up, +Z forward) for the bind contract.
    gp=np.stack([pts[:,0],pts[:,2],-pts[:,1]],axis=1)
    sy=1.44;sx=.215;arm_angle={};arm_lengths={};arms=[]
    # Source T-pose sleeves often slope below the clavicle. Fit their actual centreline
    # instead of rotating around a generic shoulder height, which embeds the hands in the torso.
    t_fits={}
    if row['pose']=='t':
        for sign in (1,-1):
            bins=[]
            for a in np.linspace(.34,float(np.max(gp[:,0]*sign))*.84,7):
                q=gp[(gp[:,0]*sign>a-.03)&(gp[:,0]*sign<a+.03)&(gp[:,1]>1.13)&(gp[:,1]<1.57)]
                if len(q)>8:bins.append((float(np.median(q[:,0]*sign)),float(np.median(q[:,1]))))
            assert len(bins)>2,('T-pose arm line not found',row['id'],sign)
            slope,intercept=np.polyfit(np.array(bins)[:,0],np.array(bins)[:,1],1)
            t_fits[sign]=(float(slope),float(intercept))
        sy=float(np.mean([a*sx+b for a,b in t_fits.values()]))
    for sign in (1,-1):
        candidates=gp[(gp[:,0]*sign>.30)&(gp[:,1]>.73)&(gp[:,1]<1.57)]
        if row['pose']=='t':angle=math.atan2(1,-t_fits[sign][0])
        elif row['pose']=='a' and len(candidates):
            outer=candidates[candidates[:,0]*sign>=np.percentile(candidates[:,0]*sign,94)]
            endpoint=np.median(outer,axis=0);angle=max(.12,min(1.40,math.atan2(endpoint[0]*sign-sx,sy-endpoint[1])))
        else:angle=0
        arm_angle[sign]=angle
        proj=(gp[:,0]*sign-sx)*math.sin(angle)+(sy-gp[:,1])*math.cos(angle)
        perp=np.abs((gp[:,0]*sign-sx)*math.cos(angle)+(gp[:,1]-sy)*math.sin(angle))
        arm_mask=(gp[:,0]*sign>.16)&(gp[:,1]>.64)&(gp[:,1]<1.57)&(proj>-.045)&(perp<.165)
        length=float(np.percentile(proj[arm_mask],96)) if np.count_nonzero(arm_mask)>10 else .56
        arm_lengths[sign]=max(.48,min(.68,length));arms.append((sign,arm_mask,proj))
        if angle>0:
            for i in np.where(arm_mask)[0]:
                x,y,z=gp[i];dx=x-sign*sx;dy=y-sy;f=smooth(-.04,.085,proj[i]);a=-sign*max(0,angle-.10)*f
                gp[i,0]=sign*sx+dx*math.cos(a)-dy*math.sin(a);gp[i,1]=sy+dx*math.sin(a)+dy*math.cos(a)
    # Ground after rest-pose normalization, preserving whole-body proportions rather than squeezing its width.
    gp[:,1]-=gp[:,1].min();coords=np.stack([gp[:,0],-gp[:,2],gp[:,1]],axis=1)
    low.data.vertices.foreach_set('co',coords.astype(np.float32).ravel());low.data.update()
    left=.11;right=-.11
    joints=[(0,.94,0),(0,1.075,0),(0,1.54,0),(.215,sy,0),(.215,sy-arm_lengths[1]*.51,0),(-.215,sy,0),(-.215,sy-arm_lengths[-1]*.51,0),(left,.94,0),(left,.49,0),(right,.94,0),(right,.49,0)]
    skinrows=[];cloth=[]
    # Smooth anatomical fields. Long garment panels share leg influences instead of tearing into rigid islands.
    for i,p in enumerate(gp):
        x,y,z=map(float,p);w={};arm=False
        for sign,mask,proj in arms:
            if mask[i]:
                upper=3 if sign==1 else 5;lower=4 if sign==1 else 6
                blend=smooth(joints[upper][1]-arm_lengths[sign]*.64,joints[upper][1]-arm_lengths[sign]*.40,y)
                w[upper]=blend;w[lower]=1-blend;arm=True;break
        if not arm:
            if y>=1.42:
                f=smooth(1.43,1.57,y);w={1:1-f,2:f}
            elif y>=.90:
                f=smooth(.91,1.16,y);w={0:1-f,1:f}
            else:
                sides=[(7,8,smooth(-.055,.055,x)),(9,10,1-smooth(-.055,.055,x))]
                knee=smooth(.40,.59,y);hip=smooth(.78,.96,y)
                for upper,lower,side in sides:
                    w[upper]=side*knee*(1-hip);w[lower]=side*(1-knee)*(1-hip)
                if hip>0:w[0]=hip
        pairs=[(k,v) for k,v in w.items() if v>1e-7];skinrows.append(((x,y,z),pairs))
        c=(1-smooth(1.39,1.56,y))*smooth(.12,.32,y)
        if arm:c*=smooth(.78,.97,y) # keep hands/fingers untouched
        if row['surface']=='armor':c*=.13
        cloth.append(c)
    attr=low.data.color_attributes.new(name='TervainCloth',type='FLOAT_COLOR',domain='POINT')
    attr.data.foreach_set('color',np.array([(x,x,x,1) for x in cloth],dtype=np.float32).ravel())
    linen=bpy.data.images.load(str(args.cloth),check_existing=True);linen.colorspace_settings.name='Non-Color'
    base=bpy.data.images.new(row['id']+' tailored albedo',width=1536,height=1536,alpha=False)
    base.colorspace_settings.name='sRGB'
    # Bake the mild palette/weathering adaptation through EVERY original UV island, including backs/undersides.
    outputs=[];base_nodes=[];normal_nodes=[]
    for mat in low.data.materials:
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');out=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
        source_color=bsdf.inputs['Base Color'].links[0].from_socket if bsdf.inputs['Base Color'].is_linked else None
        source_rgb=tuple(bsdf.inputs['Base Color'].default_value)
        if not source_color:
            rgb=nodes.new('ShaderNodeRGB');rgb.outputs[0].default_value=source_rgb;source_color=rgb.outputs[0]
        mask=nodes.new('ShaderNodeVertexColor');mask.layer_name='TervainCloth'
        factor=nodes.new('ShaderNodeMath');factor.operation='MULTIPLY';links.new(mask.outputs['Color'],factor.inputs[0]);factor.inputs[1].default_value=.085
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';links.new(factor.outputs[0],mix.inputs[0]);links.new(source_color,mix.inputs[1]);mix.inputs[2].default_value=(*row['palette'],1)
        uv=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=8;links.new(uv.outputs['UV'],mapping.inputs[0])
        detail=nodes.new('ShaderNodeTexImage');detail.image=linen;detail.extension='REPEAT';links.new(mapping.outputs[0],detail.inputs['Vector'])
        grain=nodes.new('ShaderNodeMixRGB');grain.blend_type='MULTIPLY';grain.inputs[0].default_value=.055;links.new(mix.outputs[0],grain.inputs[1]);links.new(detail.outputs['Color'],grain.inputs[2])
        masked=nodes.new('ShaderNodeMixRGB');links.new(mask.outputs['Color'],masked.inputs[0]);links.new(mix.outputs[0],masked.inputs[1]);links.new(grain.outputs[0],masked.inputs[2])
        emit=nodes.new('ShaderNodeEmission');links.new(masked.outputs[0],emit.inputs[0]);links.new(emit.outputs[0],out.inputs['Surface'])
        target=nodes.new('ShaderNodeTexImage');target.image=base;nodes.active=target
        outputs.append((mat,out,bsdf));base_nodes.append(target)
    bpy.ops.object.select_all(action='DESELECT');low.select_set(True);bpy.context.view_layer.objects.active=low
    high.hide_render=True;scene.render.bake.use_selected_to_active=False;bpy.ops.object.bake(type='EMIT')
    for (mat,out,bsdf),target in zip(outputs,base_nodes):
        nodes=mat.node_tree.nodes;links=mat.node_tree.links;links.new(bsdf.outputs[0],out.inputs['Surface']);links.new(target.outputs['Color'],bsdf.inputs['Base Color'])
        # Retain sculpted normal detail; neutral rough materials prevent plastic highlights/emissive generated artwork.
        ntex=nodes.new('ShaderNodeTexImage');ntex.image=normal;nmap=nodes.new('ShaderNodeNormalMap');links.new(ntex.outputs['Color'],nmap.inputs['Color']);links.new(nmap.outputs[0],bsdf.inputs['Normal'])
        for inp in ('Metallic','Roughness','Emission Color','Emission Strength'):
            for link in list(bsdf.inputs[inp].links):links.remove(link)
        bsdf.inputs['Metallic'].default_value=.18 if row['surface']=='armor' else 0
        bsdf.inputs['Roughness'].default_value=.78 if row['surface']=='armor' else .89
        bsdf.inputs['Emission Color'].default_value=(0,0,0,1);bsdf.inputs['Emission Strength'].default_value=0
    args.workshop.mkdir(parents=True,exist_ok=True)
    base.filepath_raw=str(args.workshop/(row['id']+'-albedo.png'));base.file_format='PNG';base.save()
    normal.filepath_raw=str(args.workshop/(row['id']+'-normal.png'));normal.file_format='PNG';normal.save()
    high.hide_render=False;high.select_set(False);low.select_set(True)
    target=args.output/(row['id']+'.glb');args.output.mkdir(parents=True,exist_ok=True)
    # Attribute mask is authoring-only; exporting it as COLOR_0 would tint faces and hands black.
    low.data.color_attributes.remove(attr)
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=False,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True)
    rig=add_skin(target,skinrows,joints)
    # Save only the editable reduced actor, not millions of discarded source triangles.
    bpy.data.objects.remove(high,do_unlink=True)
    for image in (base,normal):image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(args.workshop/(row['id']+'.blend')),compress=True)
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_sha
    data=target.read_bytes();receipt={'id':row['id'],'role':row['role'],'sourceFilename':source.name,'sourceSha256':source_sha,'sourceTriangles':source_tris,'runtime':{'file':target.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),**rig},'preparation':{'tool':'Blender '+bpy.app.version_string,'pose':row['pose'],'armAnglesRadians':arm_angle,'armLengths':arm_lengths,'surface':row['surface'],'palette':row['palette'],'UV':'source islands retained/interpolated by collapse; all-side adaptation baked inUVspace','detail':'1024 tangent normal bake from original sculpt and1536albedo, subtle generatedlinen grain, faces/hands protected','animation':'11-joint skin driven by existing Tervain skeletal poser, no embeddedauthored clips','sourceUnmodified':True},'seconds':round(time.monotonic()-started,2)}
    (args.workshop/(row['id']+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    print('PREPARED '+json.dumps({'id':row['id'],'triangles':rig['triangles'],'bytes':len(data),'seconds':receipt['seconds']}),flush=True)
    return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--downloads',type=pathlib.Path,required=True);p.add_argument('--workshop',type=pathlib.Path,required=True);p.add_argument('--cloth',type=pathlib.Path,required=True);p.add_argument('--only');p.add_argument('--output',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'public/models/npcs');args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
    config=json.loads((pathlib.Path(__file__).parent/'meshy-npc-sources.json').read_text());rows=config['assets']
    if args.only:rows=[x for x in rows if x['id'] in args.only.split(',')]
    for row in rows:prepare(args,row,config)
